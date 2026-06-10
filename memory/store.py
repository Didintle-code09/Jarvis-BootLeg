from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class MemoryEntry:
    role: str
    content: str


class MemoryStore:
    def __init__(self, storage_path: Path | None = None, max_messages: int = 12) -> None:
        self.storage_path = storage_path or Path(__file__).with_name("history.json")
        self.max_messages = max_messages
        self._messages: list[MemoryEntry] = self._load()

    def append(self, role: str, content: str) -> None:
        self._messages.append(MemoryEntry(role=role, content=content))
        self._messages = self._messages[-self.max_messages :]
        self._save()

    def recent_messages(self) -> list[dict[str, str]]:
        return [{"role": message.role, "content": message.content} for message in self._messages]

    def _load(self) -> list[MemoryEntry]:
        if not self.storage_path.exists():
            return []

        try:
            raw = json.loads(self.storage_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []

        messages: list[MemoryEntry] = []
        for item in raw if isinstance(raw, list) else []:
            role = item.get("role")
            content = item.get("content")
            if isinstance(role, str) and isinstance(content, str):
                messages.append(MemoryEntry(role=role, content=content))
        return messages[-self.max_messages :]

    def _save(self) -> None:
        payload = [{"role": message.role, "content": message.content} for message in self._messages]
        self.storage_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
