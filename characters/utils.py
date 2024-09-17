import asyncio
from dataclasses import field
import datetime
import os
from time import perf_counter
from typing import Callable, Optional, TypedDict
import uuid
import io
import wave
from PIL import Image
from fastapi import HTTPException

from langchain.schema import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic.dataclasses import dataclass
from starlette.websockets import WebSocket, WebSocketState
from sqlalchemy.orm import Session

from characters.models.interaction import Interaction
from characters.logger import get_logger
from google.cloud import storage
from fastapi import HTTPException, status as http_status
import oss2

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

logger = get_logger(__name__)


@dataclass
class Character:
    character_id: str
    name: str
    system_prompt: str
    llm_user_prompt: str
    source: str = ""
    location: str = ""
    voice_id: str = ""
    author_name: str = ""
    author_id: str = ""
    visibility: str = ""
    tts: Optional[str] = ""
    order: int = 10**9  # display order on the website
    data: Optional[dict] = None


@dataclass
class ConversationHistory:
    system_prompt: str = ""
    user: list[str] = field(default_factory=list)
    ai: list[str] = field(default_factory=list)

    def __iter__(self):
        yield self.system_prompt
        for user_message, ai_message in zip(self.user, self.ai):
            yield user_message
            yield ai_message

    def load_from_db(self, session_id: str, db: Session):
        conversations = db.query(Interaction).filter(
            Interaction.session_id == session_id).all()
        for conversation in conversations:
            # type: ignore
            self.user.append(conversation.client_message)
            self.ai.append(conversation.server_message)  # type: ignore


def build_history(conversation_history: ConversationHistory) -> list[BaseMessage]:
    history = []
    for i, message in enumerate(conversation_history):
        if i == 0:
            history.append(SystemMessage(content=message))
        elif i % 2 == 0:
            history.append(AIMessage(content=message))
        else:
            history.append(HumanMessage(content=message))
    return history


@dataclass
class TranscriptSlice:
    id: str
    audio_id: str
    start: float
    end: float
    speaker_id: str
    text: str


@dataclass
class Transcript:
    id: str
    audio_bytes: bytes
    slices: list[TranscriptSlice]
    timestamp: float
    duration: float


class DiarizedSingleSegment(TypedDict):
    start: float
    end: float
    text: str
    speaker: str


class SingleWordSegment(TypedDict):
    word: str
    start: float
    end: float
    score: float


class WhisperXResponse(TypedDict):
    segments: list[DiarizedSingleSegment]
    language: str
    word_segments: list[SingleWordSegment]


class Singleton:
    _instances = {}

    @classmethod
    def get_instance(cls, *args, **kwargs):
        """Static access method."""
        if cls not in cls._instances:
            cls._instances[cls] = cls(*args, **kwargs)

        return cls._instances[cls]

    @classmethod
    def initialize(cls, *args, **kwargs):
        """Static access method."""
        if cls not in cls._instances:
            cls._instances[cls] = cls(*args, **kwargs)


class ConnectionManager(Singleton):
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Client #{id(websocket)} left the chat")
        # await self.broadcast_message(f"Client #{id(websocket)} left the chat")

    async def send_message(self, message: str, websocket: WebSocket):
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)

    async def broadcast_message(self, message: str):
        for connection in self.active_connections:
            if connection.application_state == WebSocketState.CONNECTED:
                await connection.send_text(message)


def get_connection_manager():
    return ConnectionManager.get_instance()


class Timer(Singleton):
    def __init__(self):
        self.start_time: dict[str, float] = {}
        self.elapsed_time = {}

    def start(self, id: str):
        self.start_time[id] = perf_counter()

    def log(self, id: str, callback: Optional[Callable] = None):
        if id in self.start_time:
            elapsed_time = perf_counter() - self.start_time[id]
            del self.start_time[id]
            if id in self.elapsed_time:
                self.elapsed_time[id].append(elapsed_time)
            else:
                self.elapsed_time[id] = [elapsed_time]
            if callback:
                callback()

    def report(self):
        for id, t in self.elapsed_time.items():
            logger.info(
                f"{id:<30s}: {sum(t)/len(t):.3f}s [{min(t):.3f}s - {max(t):.3f}s] "
                f"({len(t)} samples)"
            )

    def reset(self):
        self.start_time = {}
        self.elapsed_time = {}


def get_timer() -> Timer:
    return Timer.get_instance()


def timed(func):
    if asyncio.iscoroutinefunction(func):

        async def async_wrapper(*args, **kwargs):
            timer = get_timer()
            timer.start(func.__qualname__)
            result = await func(*args, **kwargs)
            timer.log(func.__qualname__)
            return result

        return async_wrapper
    else:

        def sync_wrapper(*args, **kwargs):
            timer = get_timer()
            timer.start(func.__qualname__)
            result = func(*args, **kwargs)
            timer.log(func.__qualname__)
            return result

        return sync_wrapper


def task_done_callback(task: asyncio.Task):
    exception = task.exception()
    if exception:
        logger.error(f"Error in task {task.get_name()}: {exception}")


async def upload_audio_to_gcs(audio_bytes: bytes, filename_prefix: str = "audio/") -> str:
    """
    上传音频文件到 Google Cloud Storage.

    参数:
    - audio_bytes: 需要上传的音频文件数据.
    - filename_prefix: 存储在 GCS 中的文件名前缀.

    返回值:
    - 存储在 GCS 中的文件的完整路径.
    """
    try:
        logger.debug("Initializing Google Cloud Storage client")
        storage_client = storage.Client()

        logger.debug("Fetching GCP_STORAGE_BUCKET_NAME environment variable")
        bucket_name = os.environ.get("GCP_STORAGE_BUCKET_NAME")
        if not bucket_name:
            logger.error("GCP_STORAGE_BUCKET_NAME is not set")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GCP_STORAGE_BUCKET_NAME is not set",
            )

        logger.debug(f"Accessing bucket: {bucket_name}")
        bucket = storage_client.bucket(bucket_name)

        # 创建唯一的文件名
        new_filename = (
            f"{filename_prefix}"
            f"{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}-"
            f"{uuid.uuid4()}.wav"
        )
        logger.debug(f"Generated new filename: {new_filename}")

        # 创建一个 GCS blob 对象
        logger.debug("Creating blob object")
        blob = bucket.blob(new_filename)

        # 上传音频文件到 GCS
        logger.debug("Uploading audio file to GCS")
        await asyncio.to_thread(blob.upload_from_string, audio_bytes)

        # 返回文件的完整路径
        gcs_path = f"https://storage.googleapis.com/{bucket_name}/{new_filename}"
        logger.debug(f"File uploaded successfully to: {gcs_path}")
        return gcs_path

    except Exception as e:
        logger.error(f"Failed to upload audio to GCS: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload audio to GCS: {str(e)}",)


def check_file_type(file_bytes: bytes) -> tuple[str, str]:
    """
    检查文件类型，返回文件类型和对应的文件扩展名.
    """
    # 检查是否为WAV音频
    if is_valid_wav(file_bytes):
        return "audio", ".wav"

    # 检查是否为图片
    image_type = get_image_type(file_bytes)
    if image_type:
        return "image", image_type

    raise HTTPException(
        status_code=400,
        detail="The provided file is neither a valid WAV audio nor a supported image file."
    )


def is_valid_wav(file_bytes: bytes) -> bool:
    try:
        with io.BytesIO(file_bytes) as file:
            with wave.open(file, 'rb') as wave_file:
                # Check basic properties of the WAV file
                if wave_file.getnchannels() > 0 and wave_file.getsampwidth() > 0 and wave_file.getframerate() > 0:
                    return True
        return False
    except Exception as e:
        logger.error(f"Failed to check WAV file: {e}")
        return False


def get_image_type(file_bytes: bytes) -> str:
    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            img_format = img.format.lower()
            if img_format in ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp']:
                return f".{img_format}"
    except Exception as e:
        logger.error(f"Failed to check image file: {e}")
        return ""


async def upload_file_to_oss(file_bytes: bytes, filename_prefix: str = "media/", file_extension=None) -> str:
    """
    验证并上传音频或图片文件到阿里云OSS.

    参数:
    - file_bytes: 需要上传的文件数据.
    - filename_prefix: 存储在OSS中的文件名前缀.
    - file_extension: 文件扩展名（可选）.

    返回值:
    - 存储在OSS中的文件的完整路径.
    """
    try:
        # 检查文件类型
        if not file_extension:
            file_type, file_extension = check_file_type(file_bytes)
            logger.debug(
                f"File type detected: {file_type}, extension: {file_extension}")
        else:
            # 假设文件类型已知
            file_type = 'audio/pcm'  # 根据实际情况设置
            if file_type == 'audio/pcm':
                # 将 PCM 数据转换为 WAV
                wav_buffer = io.BytesIO()
                with wave.open(wav_buffer, 'wb') as wav_file:
                    wav_file.setnchannels(1)       # 单声道
                    wav_file.setsampwidth(2)       # 16位
                    wav_file.setframerate(16000)   # 16kHz
                    wav_file.writeframes(file_bytes)
                wav_data = wav_buffer.getvalue()
                logger.debug(
                    f"Converted PCM to WAV, size: {len(wav_data)} bytes")
            logger.debug(f"Using provided file extension: {file_extension}")

        logger.debug(f"extension: {file_extension}")

        logger.debug("Initializing OSS client")

        access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID')
        access_key_secret = os.getenv(
            'ALIYUN_ACCESS_KEY_SECRET', 'xxcNZWIAQmUqeoW1TaIekQz9WGyOsW')
        bucket_name = os.getenv('ALIYUN_BUCKET_NAME')
        endpoint = os.getenv('ALIYUN_OSS_ENDPOINT')

        # 检查环境变量是否都已设置
        missing_vars = []
        if not access_key_id:
            missing_vars.append('ALIYUN_ACCESS_KEY_ID')
        if not access_key_secret:
            missing_vars.append('ALIYUN_ACCESS_KEY_SECRET')
        if not bucket_name:
            missing_vars.append('ALIYUN_BUCKET_NAME')
        if not endpoint:
            missing_vars.append('ALIYUN_OSS_ENDPOINT')

        if missing_vars:
            error_msg = f"Missing environment variables: {', '.join(missing_vars)}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        auth = oss2.Auth(access_key_id, access_key_secret)
        bucket = oss2.Bucket(auth, endpoint, bucket_name)

        new_filename = (
            f"{filename_prefix}"
            f"{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}-"
            f"{uuid.uuid4()}{file_extension}"
        )
        logger.debug(f"Generated new filename: {new_filename}")

        # 上传文件到OSS
        if file_type == 'audio/pcm':
            # 上传转换后的 WAV 数据
            logger.debug(f"Uploading WAV file to OSS")
            bucket.put_object(new_filename, wav_data, headers={
                              'Content-Type': 'audio/wav'})
        else:
            # 上传原始文件
            logger.debug(f"Uploading {file_extension} file to OSS")
            bucket.put_object(new_filename, file_bytes, headers={
                              'Content-Type': file_type})

        oss_path = f"https://{bucket_name}.{endpoint}/{new_filename}"
        logger.debug(f"File uploaded successfully to: {oss_path}")
        return oss_path

    except HTTPException as he:
        logger.error(f"Invalid file format: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Failed to upload file to OSS: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error during file upload: {str(e)}"
        )
