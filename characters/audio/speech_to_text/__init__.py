import os

from characters.audio.speech_to_text.base import SpeechToText


def get_speech_to_text() -> SpeechToText:
    use = os.getenv("SPEECH_TO_TEXT_USE", "LOCAL_WHISPER")
    if use == "DEEPGRAM":
        from characters.audio.speech_to_text.deepgram import DeepgramTranscriber

        DeepgramTranscriber.initialize()
        return DeepgramTranscriber.get_instance()
    if use == "GOOGLE":
        from characters.audio.speech_to_text.google import Google

        Google.initialize()
        return Google.get_instance()
    elif use == "LOCAL_WHISPER":
        from characters.audio.speech_to_text.whisper import Whisper

        Whisper.initialize(use="local")
        return Whisper.get_instance()
    elif use == "OPENAI_WHISPER":
        from characters.audio.speech_to_text.whisper import Whisper

        Whisper.initialize(use="api")
        return Whisper.get_instance()
    elif use == "LOCAL_WHISPER_X":
        from characters.audio.speech_to_text.whisperX import WhisperX

        WhisperX.initialize(use="local")
        return WhisperX.get_instance()
    elif use == "WHISPER_X_API":
        from characters.audio.speech_to_text.whisperX import WhisperX

        WhisperX.initialize(use="api")
        return WhisperX.get_instance()
    else:
        raise NotImplementedError(f"Unknown speech to text engine: {use}")
