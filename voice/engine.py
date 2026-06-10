from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class VoiceCapabilities:
    speech_recognition: bool
    text_to_speech: bool


class VoiceEngine:
    def __init__(self) -> None:
        self._recognizer = None
        self._microphone = None
        self._tts = None
        self.capabilities = self._detect_capabilities()

    def _detect_capabilities(self) -> VoiceCapabilities:
        speech_recognition = False
        text_to_speech = False

        try:
            import speech_recognition as sr  # type: ignore

            self._recognizer = sr.Recognizer()
            self._microphone = sr.Microphone
            speech_recognition = True
        except Exception:
            self._recognizer = None
            self._microphone = None

        try:
            import pyttsx3  # type: ignore

            self._tts = pyttsx3.init()
            text_to_speech = True
        except Exception:
            self._tts = None

        return VoiceCapabilities(speech_recognition=speech_recognition, text_to_speech=text_to_speech)

    def speak(self, text: str) -> None:
        if self._tts is not None:
            try:
                self._tts.say(text)
                self._tts.runAndWait()
                return
            except Exception:
                pass
        print(f"JARVIS voice fallback: {text}")

    def listen_once(self, prompt: str = "Say something") -> str:
        if self._recognizer is None or self._microphone is None:
            return input(f"{prompt}: ").strip()

        import speech_recognition as sr  # type: ignore

        with self._microphone() as source:
            self._recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = self._recognizer.listen(source, phrase_time_limit=6)

        try:
            return self._recognizer.recognize_google(audio).strip()
        except sr.UnknownValueError:
            return ""
        except sr.RequestError:
            return input(f"{prompt}: ").strip()

    def wait_for_wake_word(self, wake_word: str = "jarvis") -> str:
        while True:
            spoken = self.listen_once("Awaiting wake word")
            if not spoken:
                continue
            if wake_word.lower() in spoken.lower():
                return spoken
