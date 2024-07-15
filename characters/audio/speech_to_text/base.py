from abc import ABC, abstractmethod

from characters.utils import timed


class SpeechToText(ABC):
    @abstractmethod
    @timed
    def transcribe(
        self, audio_bytes, platform="web", prompt="", language="en-US", suppress_tokens=[-1]
    ) -> str:
        # platform: 'web' | 'mobile' | 'terminal'
        pass
