from __future__ import annotations

from core.assistant import JarvisAssistant
from memory.store import MemoryStore


def main() -> None:
    memory_store = MemoryStore()
    assistant = JarvisAssistant(memory_store=memory_store)
    assistant.run()


if __name__ == "__main__":
    main()
