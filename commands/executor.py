from __future__ import annotations

from pathlib import Path
from typing import Callable

from commands.parser import Command


class CommandExecutor:
    def __init__(self) -> None:
        self._handlers: dict[str, Callable[[str], str]] = {
            "open_browser": self._open_browser,
            "create_file": self._create_file,
            "run_code": self._run_code,
            "search_web": self._search_web,
        }

    def execute(self, command: Command) -> str:
        handler = self._handlers.get(command.name)
        if handler is None:
            return f"Command '{command.name}' is not supported."
        return handler(command.argument)

    def _open_browser(self, argument: str) -> str:
        target = argument or "default browser"
        return f"Browser launch simulated for {target}."

    def _create_file(self, argument: str) -> str:
        if not argument:
            return "File creation simulated. No path was provided."

        path_text, _, content = argument.partition("|")
        path = Path(path_text.strip()).expanduser()
        if not path.is_absolute():
            path = Path.cwd() / path

        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content.lstrip(), encoding="utf-8")
        except OSError as exc:
            return f"File creation failed: {exc}"

        return f"File created at {path}."

    def _run_code(self, argument: str) -> str:
        if not argument:
            return "Code execution simulated. No code snippet was provided."
        return f"Code execution simulated for: {argument[:120]}"

    def _search_web(self, argument: str) -> str:
        if not argument:
            return "Web search simulated. No query was provided."
        return f"Web search simulated for: {argument}"
