from __future__ import annotations

import json
import mimetypes
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
UI_DIR = ROOT / "jarvis-ui"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.assistant import JarvisAssistant  # noqa: E402
from core.env import load_env_file  # noqa: E402
from memory.store import MemoryStore  # noqa: E402

load_env_file(ROOT / ".env")
ASSISTANT = JarvisAssistant(memory_store=MemoryStore())


class JarvisRequestHandler(BaseHTTPRequestHandler):
    server_version = "JarvisHTTP/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/", "/index.html"}:
            self.serve_file(UI_DIR / "index.html")
            return
        if parsed.path == "/styles.css":
            self.serve_file(UI_DIR / "styles.css")
            return
        if parsed.path == "/app.js":
            self.serve_file(UI_DIR / "app.js")
            return

        self.send_error(HTTPStatus.NOT_FOUND, "File not found")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/chat":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON body")
            return

        message = str(body.get("message", "")).strip()
        if not message:
            self.send_error(HTTPStatus.BAD_REQUEST, "Message is required")
            return

        response = ASSISTANT.respond(message)
        chunks = split_response(response.reply)
        payload = {
            "reply": response.reply,
            "command_result": response.command_result,
            "chunks": chunks,
            "memory": len(ASSISTANT.memory_store.recent_messages()),
            "note": "Backend response delivered as animated modules.",
        }

        self.send_response(HTTPStatus.OK)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def serve_file(self, path: Path) -> None:
        if not path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.end_headers()
        with path.open("rb") as file_handle:
            self.wfile.write(file_handle.read())

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format: str, *args: Any) -> None:
        return


def split_response(text: str) -> list[dict[str, str]]:
    chunks = []
    segments = [segment.strip() for segment in text.replace("\n", " ").split(".") if segment.strip()]
    for index, segment in enumerate(segments, start=1):
        suffix = "." if index < len(segments) else ""
        chunks.append({"text": f"{segment}{suffix}", "tag": f"segment {index}"})
    if not chunks and text.strip():
        chunks.append({"text": text.strip(), "tag": "segment 1"})
    return chunks


def main() -> None:
    port = 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), JarvisRequestHandler)
    print(f"JARVIS UI server running at http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nJARVIS UI server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
