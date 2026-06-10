# JARVIS

A minimal Python assistant with:
- OpenAI-compatible chat support
- Conversation memory in JSON
- Simulated command handling for browser, file, code, and web actions
- A simple CLI entrypoint

## Project Structure

```text
jarvis/
  main.py
  README.md
  .env.example
  core/
    __init__.py
    assistant.py
    llm.py
    prompts.py
  commands/
    __init__.py
    executor.py
    parser.py
  memory/
    __init__.py
    store.py
```

## Setup

1. Install Python 3.10 or newer.
2. Set your API key if you want real model responses:
   - `OPENAI_API_KEY`
   - optional: `OPENAI_BASE_URL`
   - optional: `OPENAI_MODEL`
3. No third-party packages are required for the default build.

## Run

```bash
python main.py
```

## Notes

- Without an API key, JARVIS uses a local fallback responder.
- Conversation history is stored in `memory/history.json`.
- Commands are parsed from plain text input such as:
  - `open browser`
  - `create file notes.txt | hello`
  - `run code print('hello')`
  - `search web latest AI news`
