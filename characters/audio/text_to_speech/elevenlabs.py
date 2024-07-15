import asyncio
import base64
import os
import types

import httpx

from characters.audio.text_to_speech.base import TextToSpeech
from characters.logger import get_logger
from characters.utils import Singleton, timed

logger = get_logger(__name__)

ELEVEN_LABS_MULTILINGUAL_MODEL = (
    "eleven_multilingual_v2"
    if os.getenv("ELEVEN_LABS_USE_V2") == "true"
    else "eleven_multilingual_v1"
)
logger.info(f"Initializing keys: {os.environ.get('ELEVEN_LABS_API_KEY')}")
logger.info(f"getenv初始化Initializing keys: {os.getenv('ELEVEN_LABS_USE_V2')}")
config = types.SimpleNamespace(
    **{
        "chunk_size": 1024,
        "url": "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
        "headers": {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": 'e91a2b0bb145ddc181dbb179056c601e',
        },
        "data": {
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
    }
)


class ElevenLabs(Singleton, TextToSpeech):
    def __init__(self):
        super().__init__()
        logger.info("Initializing [ElevenLabs Text To Speech] voices...")

    @timed
    async def stream(
        self,
        text,
        websocket,
        tts_event: asyncio.Event,
        voice_id="21m00Tcm4TlvDq8ikWAM",
        first_sentence=False,
        language="en-US",
        sid="",
        platform="",
        *args,
        **kwargs,
    ) -> None:
        if voice_id == "":
            logger.info(
                "voice_id is not found in .env file, using ElevenLabs default voice")
            voice_id = "21m00Tcm4TlvDq8ikWAM"

        logger.info(
            f"Streaming with voice_id: {voice_id}, language: {language}")
        headers = config.headers
        if language != "en-US":
            config.data["model_id"] = ELEVEN_LABS_MULTILINGUAL_MODEL
        data = {
            "text": text,
            **config.data,
        }
        url = config.url.format(voice_id=voice_id)
        url += "?output_format=" + \
            ("ulaw_8000" if platform == "twilio" else "mp3_44100_128")
        if first_sentence:
            url += "&optimize_streaming_latency=4"

        logger.info(f"Request URL: {url}")
        curl_command = f"curl -X POST {url} -H 'Accept: audio/mpeg' -H 'Content-Type: application/json' -H 'xi-api-key: {headers['xi-api-key']}' -d '{data}'"
        logger.info(f"Curl command: {curl_command}")

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers)
            logger.info(f"Response status code: {response.status_code}")
            if response.status_code != 200:
                logger.error(
                    f"ElevenLabs returns response {response.status_code}")
            async for chunk in response.aiter_bytes():
                await asyncio.sleep(0.1)
                if tts_event.is_set():
                    logger.info("TTS event is set, stopping audio stream")
                    break
                if platform != "twilio":
                    await websocket.send_bytes(chunk)
                    logger.info("Sent audio chunk to WebSocket")
                else:
                    audio_b64 = base64.b64encode(chunk).decode()
                    media_response = {
                        "event": "media",
                        "streamSid": sid,
                        "media": {
                            "payload": audio_b64,
                        },
                    }
                    await websocket.send_json(media_response)
                    mark = {
                        "event": "mark",
                        "streamSid": sid,
                        "mark": {
                            "name": "done",
                        },
                    }
                    await websocket.send_json(mark)
                    logger.info("Sent audio chunk to Twilio")

    async def generate_audio(self, text, voice_id="", language="en-US") -> bytes:
        logger.info("生成声音开始")
        if voice_id == "":
            logger.info(
                "voice_id is not found in .env file, using ElevenLabs default voice")
            voice_id = "21m00Tcm4TlvDq8ikWAM"

        logger.info(
            f"Generating audio with voice_id: {voice_id}, language: {language}")
        headers = config.headers
        if language != "en-US":
            config.data["model_id"] = ELEVEN_LABS_MULTILINGUAL_MODEL
        data = {
            "text": text,
            **config.data,
        }
        url = config.url.format(voice_id=voice_id).replace("/stream", "")
        logger.info(f"Request URL for generating audio: {url}")
        curl_command = f"curl -X POST {url} -H 'Accept: audio/mpeg' -H 'Content-Type: application/json' -H 'xi-api-key: {headers['xi-api-key']}' -d '{data}'"
        logger.info(f"Curl command: {curl_command}")

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers)
            logger.info(f"Response status code: {response.status_code}")
            if response.status_code != 200:
                logger.error(
                    f"ElevenLabs returns response {response.status_code}")
            return response.content
