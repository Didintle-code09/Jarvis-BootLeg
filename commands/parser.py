from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Command:
    name: str
    argument: str


class CommandParser:
    COMMAND_ALIASES = {
        "open browser": "open_browser",
        "browser": "open_browser",
        "create file": "create_file",
        "run code": "run_code",
        "search web": "search_web",
    }

    def parse(self, text: str) -> Optional[Command]:
        normalized = text.strip().lower()
        for phrase, command_name in self.COMMAND_ALIASES.items():
            if normalized.startswith(phrase):
                argument = text.strip()[len(phrase):].strip(" :,-")
                return Command(name=command_name, argument=argument)
        return None
