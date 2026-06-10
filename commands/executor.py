from __future__ import annotations

import subprocess
import sys
import tempfile
import webbrowser
from pathlib import Path
from typing import Callable
from urllib.parse import quote_plus

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
        target = argument.strip() if argument else "https://www.google.com"
        if not target.startswith(("http://", "https://")):
            if "." in target and " " not in target:
                target = f"https://{target}"
            else:
                target = f"https://www.google.com/search?q={quote_plus(target)}"

        try:
            webbrowser.open(target, new=2)
            return f"Browser opened for {target}."
        except Exception as exc:
            return f"Browser launch failed: {exc}"

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
        code = argument.strip()
        if not code:
            return "Code execution failed: no Python snippet was provided."

        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as handle:
                handle.write(code)
                temp_path = Path(handle.name)

            completed = subprocess.run(
                [sys.executable, str(temp_path)],
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return "Code execution timed out after 20 seconds."
        except Exception as exc:
            return f"Code execution failed: {exc}"
        finally:
            if temp_path is not None:
                try:
                    temp_path.unlink(missing_ok=True)
                except OSError:
                    pass

        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()
        if completed.returncode != 0:
            return f"Code execution failed with exit code {completed.returncode}: {stderr or stdout or 'no output'}"
        if stdout:
            return f"Code executed successfully: {stdout}"
        return "Code executed successfully with no output."

    def _search_web(self, argument: str) -> str:
        query = argument.strip()
        if not query:
            return "Web search failed: no query was provided."
        url = f"https://www.google.com/search?q={quote_plus(query)}"
        try:
            webbrowser.open(url, new=2)
            return f"Web search opened for {query}."
        except Exception as exc:
            return f"Web search failed: {exc}"
