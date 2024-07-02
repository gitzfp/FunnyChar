import asyncio
import base64
import os

import httpx
from fastapi import WebSocket

from realtime_ai_character.audio.text_to_speech.base import TextToSpeech
from realtime_ai_character.audio.text_to_speech.utils import MP3ToUlaw
from realtime_ai_character.logger import get_logger
from realtime_ai_character.utils import Singleton, timed


logger = get_logger(__name__)

DEBUG = False
API_KEY = os.getenv("XTTS_API_KEY", "")
API_URL = os.getenv(
    "XTTS_API_URL", "https://almost-leader-nebraska-roller.trycloudflare.com/tts_stream")


class XTTS(Singleton, TextToSpeech):
    def __init__(self):
        super().__init__()
        logger.info("Initializing [XTTS Text To Speech] voices...")
        logger.info(f"API_URL: {API_URL}, API_KEY: {API_KEY}")

    @timed
    async def stream(
        self,
        text: str,
        websocket: WebSocket,
        tts_event: asyncio.Event,
        voice_id: str = "default",
        first_sentence: bool = False,
        language: str = "zh-cn",
        sid: str = "",
        platform: str = "",
        priority: int = 100,  # 0 is highest priority
        *args,
        **kwargs,
    ) -> None:
        if DEBUG:
            return
        if voice_id == "":
            logger.info("XTTS voice_id is not set, using default voice")
            voice_id = "default"

        url = f"{API_URL}?text={text}&speaker_wav={voice_id}&language={language}"
        headers = {"api-key": API_KEY}

        logger.info(f"Streaming URL: {url}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                logger.info(f"Response Status Code: {response.status_code}")
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if not chunk:
                        continue
                    if tts_event.is_set():
                        logger.info("TTS event is set, stopping audio stream")
                        break
                    if platform != "twilio":
                        await websocket.send_bytes(chunk)
                        logger.info("Sent audio chunk to WebSocket")
                        await asyncio.sleep(0.001)
                    else:
                        audio_bytes = MP3ToUlaw(chunk)
                        audio_b64 = base64.b64encode(audio_bytes).decode()
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
            except httpx.RequestError as e:
                logger.error(f"Request failed: {e}")

    async def generate_audio(self, text, voice_id="", language="zh-cn") -> bytes:
        logger.info("Generating audio")
        if voice_id == "":
            logger.info(
                "voice_id is not found in .env file, using default voice")
            voice_id = "default"

        url = f"{API_URL}?text={text}&speaker_wav={voice_id}&language={language}"
        headers = {"api-key": API_KEY}

        logger.info(f"Generating audio URL: {url}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                logger.info(f"Response Status Code: {response.status_code}")
                response.raise_for_status()
                return response.content
            except httpx.RequestError as e:
                logger.error(f"Request failed: {e}")
                return b""
