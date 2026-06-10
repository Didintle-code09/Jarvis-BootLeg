from __future__ import annotations

import argparse

from core.assistant import JarvisAssistant
from core.env import load_env_file
from ui.hud import JarvisHUD
from memory.store import MemoryStore
from voice.engine import VoiceEngine


def main() -> None:
    load_env_file()
    memory_store = MemoryStore()
    assistant = JarvisAssistant(memory_store=memory_store)
    parser = argparse.ArgumentParser(prog="jarvis")
    parser.add_argument("--gui", action="store_true", help="Launch the desktop HUD UI")
    parser.add_argument("--voice", action="store_true", help="Run the voice loop")
    parser.add_argument("--wake-word", default="jarvis", help="Wake word for voice mode")
    args = parser.parse_args()

    if args.gui:
        JarvisHUD(assistant=assistant, voice=VoiceEngine()).run()
        return

    if args.voice:
        voice = VoiceEngine()
        print("JARVIS voice mode online. Say the wake word or press Ctrl+C to stop.")
        while True:
            try:
                voice.wait_for_wake_word(args.wake_word)
                spoken_text = voice.listen_once("Speak your command")
                if not spoken_text:
                    continue
                response = assistant.respond(spoken_text)
                print(f"You> {spoken_text}")
                print(f"JARVIS> {response.reply}")
                voice.speak(response.reply)
            except (EOFError, KeyboardInterrupt):
                print("\nJARVIS voice mode offline.")
                break
        return

    assistant.run()


if __name__ == "__main__":
    main()
