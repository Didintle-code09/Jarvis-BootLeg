from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Iterable
from urllib import error, request


@dataclass
class LLMConfig:
    api_key: str | None = None
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    timeout_seconds: int = 30


class LLMClient:
    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            timeout_seconds=int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30")),
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        if not self.config.api_key:
            return self._fallback_reply(messages)

        payload = json.dumps(
            {
                "model": self.config.model,
                "messages": messages,
                "temperature": 0.4,
            }
        ).encode("utf-8")

        url = f"{self.config.base_url.rstrip('/')}/chat/completions"
        req = request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.config.timeout_seconds) as response:
                data = json.loads(response.read().decode("utf-8"))
        except error.URLError as exc:
            return f"I could not reach the language model service: {exc.reason if hasattr(exc, 'reason') else exc}"
        except Exception as exc:  # pragma: no cover - defensive fallback
            return f"I could not complete the model request: {exc}"

        choices = data.get("choices", [])
        if not choices:
            return "No response was returned by the language model service."

        message = choices[0].get("message", {})
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

        return "The language model returned an empty reply."

    def _fallback_reply(self, messages: list[dict[str, str]]) -> str:
        latest_user = next((msg["content"] for msg in reversed(messages) if msg.get("role") == "user"), "")
        if not latest_user:
            return "Standing by."
        lowered = latest_user.lower()
        if any(word in lowered for word in ("hello", "hi", "hey")):
            return "Acknowledged. I am online and awaiting instructions."
        if "time" in lowered:
            return "I cannot query live time without a system clock integration, but I can be wired for that."
        if "open browser" in lowered:
            return "Browser action simulated. Connect a real automation layer when needed."
        return f"Understood. I have recorded: {latest_user}"
