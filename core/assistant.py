from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from commands.executor import CommandExecutor
from commands.parser import CommandParser
from core.llm import LLMClient
from core.prompts import JARVIS_SYSTEM_PROMPT
from memory.store import MemoryStore


@dataclass
class AssistantResponse:
    reply: str
    command_result: Optional[str] = None


class JarvisAssistant:
    def __init__(self, memory_store: MemoryStore) -> None:
        self.memory_store = memory_store
        self.llm = LLMClient()
        self.command_parser = CommandParser()
        self.command_executor = CommandExecutor()

    def respond(self, user_text: str) -> AssistantResponse:
        self.memory_store.append("user", user_text)

        command = self.command_parser.parse(user_text)
        command_result = None
        if command is not None:
            command_result = self.command_executor.execute(command)

        history = self.memory_store.recent_messages()
        messages = [
            {"role": "system", "content": JARVIS_SYSTEM_PROMPT},
            *history,
        ]
        if command_result:
            messages.append({"role": "system", "content": f"Command result: {command_result}"})

        reply = self.llm.chat(messages)
        self.memory_store.append("assistant", reply)
        return AssistantResponse(reply=reply, command_result=command_result)

    def run(self) -> None:
        print("JARVIS online. Type 'exit' to quit.")
        while True:
            try:
                user_text = input("You> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nJARVIS offline.")
                break

            if not user_text:
                continue
            if user_text.lower() in {"exit", "quit", "bye"}:
                print("JARVIS> Session terminated.")
                break

            response = self.respond(user_text)
            print(f"JARVIS> {response.reply}")
            if response.command_result:
                print(f"[command] {response.command_result}")
