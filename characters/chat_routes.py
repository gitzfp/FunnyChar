from elevenlabs import VoiceSettings
from fastapi import APIRouter, FastAPI
import openai
from dotenv import load_dotenv
import os
import json
import subprocess
from pydantic import BaseModel
import base64
import tracemalloc

from elevenlabs.client import ElevenLabs
from characters.logger import get_logger
from characters.utils import Character

client = ElevenLabs(
    api_key=os.getenv('ELEVEN_LABS_API_KEY')
)

# 加载环境变量
load_dotenv()


def get_config():
    # 实现 get_config 方法
    return {
        "base_url": os.getenv('OPENAI_BASE_URL'),
        "api_key": os.getenv('OPENAI_API_KEY', 'api_key')
    }


# 初始化 OpenAI 和 ElevenLabs API 客户端
chat_open_ai = openai.OpenAI(
    base_url=get_config()["base_url"],
    api_key=get_config()["api_key"]
)
voice_id = "jsCqWAovK2LkecY7zXl4"

app = FastAPI()
router = APIRouter()


class ChatRequest(BaseModel):
    message: str


logger = get_logger(__name__)


@router.get("/")
async def root():
    return {"message": "Hello World!"}


@router.get("/voices")
async def get_voices():
    voices = elevenlabs.get_voices(api_key=elevenlabs_api_key)
    return voices


def exec_command(command):
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        raise Exception(f"Command failed with error: {stderr.decode()}")
    return stdout.decode()


async def lip_sync_message(message_id):
    print(f"Starting conversion for message {message_id}")
    exec_command(
        f"ffmpeg -y -i audios/message_{message_id}.mp3 audios/message_{message_id}.wav")
    print(f"Conversion done.")
    exec_command(
        f"./characters/bin/rhubarb -f json -o audios/message_{message_id}.json audios/message_{message_id}.wav -r phonetic")
    print(f"Lip sync done.")


@router.post("/chat")
async def chat(request: ChatRequest):
    user_message = request.message
    logger.info("开始处理1", request.message)
    completion = chat_open_ai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """
                  你是我的英语教练。请以英语老师的身份与学生互动，帮助他们提高英语口语能力。
                  你的目标是用简单易懂的英语与学生交流，并尽可能使用日常词汇和短语动词。
                  每个句子最长不应该超过 20 个单词。
                  在对话中，请始终温和、鼓励和耐心。
                  如果学生的英语语法有错误，请指出并提供正确的表达方式。
                  你将和学生进行一节英语口语课。请根据以下问题开始对话：
                  1. How are you today?
                  2. What's your name?
                  3. What's your favorite animal?
                  你需要一个个问题提问，直到学生都掌握了
                You will always reply with a JSON array of messages. With a maximum of 1 message.
                Each message has a text, facialExpression, and animation property.
                The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
                The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
                """
            },
            {
                "role": "user",
                "content": user_message or "Hello",
            },
        ],
    )
    logger.info("请求完成2", completion)
    # 移除 Markdown 的 ```json 包裹部分
    # 获取 API 返回的 JSON 代码块内容
    content = completion.choices[0].message.content
    if content.startswith("```json"):
        content = content[7:-3].strip()
    print(completion.choices[0].message.content)
    messages = json.loads(content)
    if isinstance(messages, dict) and "messages" in messages:
        messages = messages["messages"]

    for i, message in enumerate(messages):
        file_name = f"audios/message_{i}.mp3"

       # 调用 convert 函数并将生成的音频流保存到文件
        os.makedirs(os.path.dirname(file_name), exist_ok=True)
        with open(file_name, "wb") as audio_file:
            for audio_chunk in client.text_to_speech.convert(
                voice_id=voice_id,
                optimize_streaming_latency="0",
                output_format="mp3_22050_32",
                text=message["text"],
                voice_settings=VoiceSettings(
                    stability=0.1,
                    similarity_boost=0.3,
                    style=0.2,
                ),
            ):
                audio_file.write(audio_chunk)

        await lip_sync_message(i)
        message["audio"] = await audio_file_to_base64(file_name)
        message["lipsync"] = await read_json_transcript(f"audios/message_{i}.json")

    return {"messages": messages}


async def read_json_transcript(file):
    with open(file, "r") as f:
        return json.load(f)


async def audio_file_to_base64(file):
    with open(file, "rb") as f:
        return base64.b64encode(f.read()).decode()
