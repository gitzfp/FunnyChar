from io import BytesIO
import asyncio
import base64
import json
from werkzeug.datastructures import FileStorage
import requests
from io import BytesIO
from characters.audio.speech_to_text import get_speech_to_text
from characters.logger import get_logger
from characters.utils import upload_audio_to_gcs
from pydub import AudioSegment


logging = get_logger(__name__)


class AudioProcessService:
    def __init__(self):
        self.subscription_key = '3557885211c54875bf4e927cce9be9a3'
        self.region = "eastus"
        self.authorization_token = None
        self.language = "en-US"
        self.speech_to_text_instance = get_speech_to_text()
        # 调试信息
        print(f"Initialized SpeechToText: {self.speech_to_text_instance}")
        print(
            f"Type of speech_to_text_instance: {type(self.speech_to_text_instance)}")
        assert hasattr(self.speech_to_text_instance,
                       'transcribe'), "transcribe method not found in speech_to_text instance"

    async def get_token(self):
        if self.authorization_token is None:
            self.authorization_token = await self.get_new_token()
        return self.authorization_token

    async def get_new_token(self):
        url = f"https://{self.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        headers = {
            "Ocp-Apim-Subscription-Key": self.subscription_key
        }
        response = requests.post(url, headers=headers)
        if response.status_code == 200:
            return response.text
        else:
            return None

    async def process_audio(self, binary_data, platform, character, message_id, websocket, manager):
        try:
            # 并发执行上传和转录任务
            transcript, audio_url = await asyncio.gather(
                asyncio.to_thread(
                    self.speech_to_text_instance.transcribe,
                    binary_data,
                    platform=platform,
                    prompt=character.name,
                    language=None,
                ),  # 去除转录文本首尾的空白字符,
                upload_audio_to_gcs(
                    binary_data,
                )
            )

            # 去除转录文本的两端空白字符
            transcript = transcript.strip()

            await manager.send_message(
                message=f"[+transcript_audio]"
                f"?text={transcript}"
                f"&audioUrl={audio_url}"
                f"&messageId={message_id}",
                websocket=websocket,
            )
            logging.info(
                f"Message sent to client: text = {transcript}, "
                f"audioUrl = {audio_url}, messageId = {message_id}"
            )

            return transcript, audio_url

        except Exception as e:
            print(f"An error occurred: {e}")
            return None, None  # 处理异常时返回 None 或者其他默认值

    async def send_score(self, binary_data: bytes, transcript: str, message_id, websocket, manager):
        try:

            score_response = await self.ackaud(binary_data=binary_data, referenceText=transcript,)

            logging.info(f"得到评分结果>>>>: score_response = {score_response}")

            # 将评分结果发送给客户端
            await manager.send_message(
                message=f"[+transcript_audio]"
                f"?text={transcript}"
                f"&speechResult={json.dumps(score_response)}"
                f"&messageId={message_id}",
                websocket=websocket,
            )

        except Exception as e:
            logging.error(f"An error occurred while getting the score: {e}")
            await manager.send_message(
                message=f"[!]Failed to get pronunciation score.",
                websocket=websocket,
            )

    def create_upload_file_from_bytes(self, binary_data):
        return BytesIO(binary_data)

    def get_chunk(self, audio_source, chunk_size=1024):
        """
        A generator that reads audio data chunk by chunk. The audio source
        can be any audio input stream that provides a `read()` method.
        """
        while True:
            chunk = audio_source.read(chunk_size)
            if not chunk:
                break
            yield chunk

    def convert_to_wav(self, binary_data):
        # 从二进制数据中读取 webm 格式的音频
        audio = AudioSegment.from_file(BytesIO(binary_data), format="webm")

        # 创建一个 BytesIO 对象来保存 WAV 格式的音频
        wav_io = BytesIO()

        # 将音频转换为 WAV 格式，采样率为 16000 Hz
        audio.set_frame_rate(16000).export(
            wav_io, format="wav", codec="pcm_s16le")
        wav_io.seek(0)

        return wav_io

    async def ackaud(self, binary_data, referenceText):

        # 将二进制数据转换为BytesIO
        audio_stream = self.convert_to_wav(binary_data)

        # 创建一个FileStorage对象
        audioFile = FileStorage(
            stream=audio_stream, filename='2024-08-17T13:51:17.660Z', content_type='audio/wav')

        # Build pronunciation assessment parameters
        pronAssessmentParamsJson = "{\"ReferenceText\":\"%s\",\"GradingSystem\":\"HundredMark\",\"Dimension\":\"Comprehensive\",\"EnableMiscue\":\"True\"}" % referenceText
        pronAssessmentParamsBase64 = base64.b64encode(
            bytes(pronAssessmentParamsJson, 'utf-8'))
        pronAssessmentParams = str(pronAssessmentParamsBase64, "utf-8")

        # Build request URL and headers
        url = f"https://{self.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={self.language}&usePipelineVersion=0"
        headers = {
            'Accept': 'application/json;text/xml',
            'Connection': 'Keep-Alive',
            'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'Pronunciation-Assessment': pronAssessmentParams,
            'Transfer-Encoding': 'chunked',
            'Expect': '100-continue'
        }
        print(
            f"file:{audioFile}==========chunk:{self.get_chunk(audioFile)}===headers:=={headers}")
        try:
            response = requests.post(
                url=url, data=self.get_chunk(audioFile), headers=headers)

            # Ensure the request was successful
            response.raise_for_status()

            # Extract and log the JSON response
            response_data = response.json()

            # 调试日志，查看传递的语音数据和参数
            if 'NBest' in response_data and len(response_data['NBest']) > 0:
                lexical = response_data['NBest'][0].get('Lexical', 'N/A')
                logging.info(f"Transcription received: {lexical}")
                logging.info(
                    f"Pronunciation Score: {response_data['NBest'][0].get('PronScore', 'N/A')}")
                logging.info(f"Details: {response_data['NBest'][0]}")
            else:
                logging.warning("No valid NBest data in response")
            logging.info(f"222评分结果：Response JSON: {response_data}")
            return response_data

        except requests.exceptions.RequestException as e:
            logging.error(f"Request failed: {e}")
            return None
        except ValueError:
            logging.error("Failed to parse JSON response")
            return None
