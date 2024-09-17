import io
import os
import types
import time  # 导入 time 模块

import speech_recognition as sr
from pydub import AudioSegment
from deepgram import DeepgramClient, PrerecordedOptions, FileSource

from characters.audio.speech_to_text.base import SpeechToText
from characters.logger import get_logger
from characters.utils import Singleton, timed

logger = get_logger(__name__)

config = types.SimpleNamespace(
    **{
        "model": os.getenv("DEEPGRAM_MODEL", "nova-2"),
        "language": "en",
        "api_key": os.getenv("DEEPGRAM_API_KEY"),
    }
)

# Deepgram uses a shorter version for language code. Provide a mapping to convert
# from the standard language code to the Deepgram language code.
DEEPGRAM_LANGUAGE_CODE_MAPPING = {
    "en-US": "en",
    "es-ES": "es",
    "fr-FR": "fr",
    "de-DE": "de",
    "it-IT": "it",
    "pt-PT": "pt",
    "hi-IN": "hi",
    "pl-PL": "pl",
    "zh-CN": "zh",
    "ja-JP": "ja",
    "ko-KR": "ko",
}


class DeepgramTranscriber(Singleton, SpeechToText):
    def __init__(self, use="api"):
        super().__init__()
        self.use = use
        if self.use == "api":
            logger.info("Initializing Deepgram API client...")
            self.deepgram = DeepgramClient(config.api_key)
        self.recognizer = sr.Recognizer()

    @timed
    def transcribe(self, audio_bytes, platform, prompt="", language="en-US", suppress_tokens=[-1]):
        logger.info("Transcribing audio...")
        start_time = time.time()  # 开始计时
        if platform == "web":
            audio = self._convert_webm_to_wav(audio_bytes)
        else:
            audio = self._convert_bytes_to_wav(audio_bytes)

        if self.use == "api":
            result = self._transcribe_api(audio, prompt, language)
        else:
            result = ""

        end_time = time.time()  # 结束计时
        elapsed_time = end_time - start_time  # 计算识别所用时间
        logger.info(f"Transcription took {elapsed_time:.2f} seconds")
        return result

    def _transcribe_api(self, audio, prompt="", language="en-US"):
        language = DEEPGRAM_LANGUAGE_CODE_MAPPING.get(
            language, config.language)
        payload: FileSource = {
            "buffer": audio.getvalue(),
        }
        options = PrerecordedOptions(
            model=config.model,
            smart_format=True,
            detect_language=True,
        )

        try:
            response = self.deepgram.listen.prerecorded.v(
                "1").transcribe_file(payload, options)
            text = self._parse_deepgram_response(response)
            return text
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return ""

    def _parse_deepgram_response(self, response):
        try:
            transcript = response['results']['channels'][0]['alternatives'][0]['transcript']
            return transcript
        except KeyError as e:
            logger.error(f"KeyError while parsing response: {e}")
            return ""
        except Exception as e:
            logger.error(f"Exception while parsing response: {e}")
            return ""

    def _convert_webm_to_wav(self, webm_data):
        webm_audio = AudioSegment.from_file(io.BytesIO(webm_data))
        wav_data = io.BytesIO()
        webm_audio.export(wav_data, format="wav")
        return wav_data

    def _convert_bytes_to_wav(self, audio_bytes):
        audio = io.BytesIO(sr.AudioData(audio_bytes, 44100, 2).get_wav_data())
        return audio

    def _ulaw_to_wav(self, audio_bytes):
        sound = AudioSegment(data=audio_bytes, sample_width=1,
                             frame_rate=8000, channels=1)
        audio = io.BytesIO()
        sound.export(audio, format="wav")
        return audio
