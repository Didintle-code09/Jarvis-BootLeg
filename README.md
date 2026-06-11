# JARVIS

JARVIS is a lightweight Python assistant that combines an OpenAI-compatible chat layer, simple conversation memory, real command execution for common desktop tasks, and optional voice plus HUD modes.

## What It Does

- Accepts text input from the terminal or a desktop window.
- Can use an OpenAI-style chat completion API when `OPENAI_API_KEY` is present.
- Keeps recent conversation context in `memory/history.json`.
- Supports commands for opening a browser, creating files, running Python snippets, and searching the web.
- Can speak responses and listen for voice input when optional audio packages are installed.

## Project Layout

```text
jarvis/
  main.py
  README.md
  .env
  .env.example
  .gitignore
  commands/
    __init__.py
    executor.py
    parser.py
  core/
    __init__.py
    assistant.py
    llm.py
    prompts.py
  memory/
    __init__.py
    store.py
  ui/
    __init__.py
    hud.py
  voice/
    __init__.py
    engine.py
```

## Requirements

- Python 3.10 or newer.
- No mandatory third-party packages for the default CLI mode.
- Optional voice support works best with `SpeechRecognition`, `PyAudio`, and `pyttsx3`.

## Configuration

Copy the provided `.env.example` values into `.env` and edit them as needed.

Environment variables:

- `OPENAI_API_KEY`: required for live model responses.
- `OPENAI_BASE_URL`: optional OpenAI-compatible endpoint, defaults to `https://api.openai.com/v1`.
- `OPENAI_MODEL`: optional model name, defaults to `gpt-4o-mini`.
- `OPENAI_TIMEOUT_SECONDS`: optional request timeout, defaults to `30`.

## Run JARVIS

Terminal mode:

```bash
python main.py
```

Desktop HUD mode:

```bash
python main.py --gui
```

Voice mode:

```bash
python main.py --voice --wake-word jarvis
```

## Commands

Type commands directly in text mode or the HUD:

- `open browser`
- `open browser example.com`
- `create file notes.txt | hello`
- `run code print('hello')`
- `search web latest AI news`

The command executor performs real actions where it is safe to do so. Browser and web search use the default browser, file creation writes to disk, and `run code` executes a temporary Python file through the current interpreter.

## Memory

JARVIS stores recent conversation entries in `memory/history.json`. The store keeps the latest messages so replies can stay context-aware without requiring a database.

## Voice and HUD

The voice engine is optional. If audio libraries are not installed, JARVIS falls back to text input and printed output.

The HUD is a Tkinter window with a simple input bar, message log, and voice trigger button. It is meant to be a lightweight assistant shell rather than a full desktop suite.


