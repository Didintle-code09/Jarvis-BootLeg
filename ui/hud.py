from __future__ import annotations

import threading
import tkinter as tk
from tkinter import scrolledtext

from core.assistant import JarvisAssistant
from voice.engine import VoiceEngine


class JarvisHUD:
    def __init__(self, assistant: JarvisAssistant, voice: VoiceEngine | None = None) -> None:
        self.assistant = assistant
        self.voice = voice or VoiceEngine()
        self.root = tk.Tk()
        self.root.title("JARVIS")
        self.root.geometry("780x520")
        self.root.configure(bg="#071018")
        self.root.attributes("-topmost", True)

        self.output = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            bg="#09131f",
            fg="#d6f3ff",
            insertbackground="#66d9ff",
            relief=tk.FLAT,
            font=("Consolas", 11),
            height=20,
        )
        self.output.pack(fill=tk.BOTH, expand=True, padx=16, pady=(16, 8))
        self.output.configure(state=tk.DISABLED)

        bottom = tk.Frame(self.root, bg="#071018")
        bottom.pack(fill=tk.X, padx=16, pady=(0, 16))

        self.entry = tk.Entry(
            bottom,
            bg="#0f1f2e",
            fg="#eaf7ff",
            insertbackground="#66d9ff",
            relief=tk.FLAT,
            font=("Consolas", 12),
        )
        self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        self.entry.bind("<Return>", self._handle_submit)

        self.submit_button = tk.Button(
            bottom,
            text="Send",
            command=self._handle_submit,
            bg="#12405d",
            fg="#f3fbff",
            activebackground="#18638f",
            relief=tk.FLAT,
        )
        self.submit_button.pack(side=tk.LEFT, padx=(0, 8))

        self.voice_button = tk.Button(
            bottom,
            text="Voice",
            command=self._handle_voice,
            bg="#12405d",
            fg="#f3fbff",
            activebackground="#18638f",
            relief=tk.FLAT,
        )
        self.voice_button.pack(side=tk.LEFT)

        self._append_line("JARVIS online. Type a command or use Voice.")
        if self.voice.capabilities.text_to_speech or self.voice.capabilities.speech_recognition:
            self._append_line("Voice stack detected. Wake-word mode available when microphone support is installed.")
        else:
            self._append_line("Voice stack unavailable. Text input remains active.")

    def run(self) -> None:
        self.root.mainloop()

    def _handle_submit(self, event=None) -> None:
        user_text = self.entry.get().strip()
        if not user_text:
            return
        self.entry.delete(0, tk.END)
        self._process_user_text(user_text)

    def _handle_voice(self) -> None:
        def worker() -> None:
            spoken = self.voice.listen_once("Speak now")
            if spoken:
                self.root.after(0, lambda: self._process_user_text(spoken))
                return
            self.root.after(0, lambda: self._append_line("JARVIS: Voice input did not return usable text."))

        threading.Thread(target=worker, daemon=True).start()

    def _process_user_text(self, user_text: str) -> None:
        self._append_line(f"You: {user_text}")
        response = self.assistant.respond(user_text)
        self._append_line(f"JARVIS: {response.reply}")
        if response.command_result:
            self._append_line(f"Command: {response.command_result}")
        self.voice.speak(response.reply)

    def _append_line(self, line: str) -> None:
        self.output.configure(state=tk.NORMAL)
        self.output.insert(tk.END, f"{line}\n")
        self.output.see(tk.END)
        self.output.configure(state=tk.DISABLED)
