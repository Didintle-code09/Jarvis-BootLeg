# JARVIS

**A voice-first AI assistant with a live HUD interface.** Built by [MoratamothoDevs](https://moratamothodevs.co.za).

**Live demo:** [jarvis.moratamothodevs.co.za](https://jarvis.moratamothodevs.co.za)

JARVIS is an assistant you can talk to in a terminal, a desktop HUD, or the browser. It talks to any OpenAI-compatible language model, remembers recent conversation, and runs real desktop commands: opening the browser, searching the web, creating files and running Python. Say "Hey Jarvis" and it listens, answers, and speaks back.

---

## Highlights

- **Voice activation.** A "Hey Jarvis" wake phrase through the Web Speech API (browser) or SpeechRecognition (desktop), with spoken replies.
- **Real actions.** A command parser and executor handle `open browser`, `search web`, `create file` and `run code`.
- **Conversation memory.** A rolling JSON store keeps replies aware of context, with no database to run.
- **Works with any model.** Use any OpenAI-compatible endpoint. Without an API key, JARVIS falls back to a local responder.
- **Three interfaces, one core.** CLI, Tkinter HUD and web UI all share the same `JarvisAssistant`.
- **No dependencies.** The core and web server use only the Python standard library, and the frontend has no build step.

## Architecture

```text
 Browser UI (jarvis-ui/)          voice, transcript, HUD
        │  POST /chat
        ▼
 Python HTTP server               standard library, localhost only
        │
        ▼
 JarvisAssistant (core/)
   ├── CommandParser  → CommandExecutor   (commands/)
   ├── MemoryStore                        (memory/)
   └── LLMClient      → OpenAI-compatible API
```

## Project layout

```text
jarvis/
  main.py               CLI / HUD / voice entry point
  core/                 assistant, LLM client, prompts, env loading
  commands/             command parser and executor
  memory/               JSON conversation store
  voice/                desktop speech engine
  ui/                   Tkinter HUD
  jarvis-ui/            web interface (portfolio demo)
    backend/server.py   local API + static server
  .github/workflows/    GitHub Pages deployment for the demo
```

## Run it locally

Requires Python 3.10 or newer. No packages are needed for the default modes. For desktop voice, install `SpeechRecognition`, `PyAudio` and `pyttsx3`.

```bash
cp .env.example .env          # add OPENAI_API_KEY for live model replies

python jarvis-ui/backend/server.py   # web UI at http://127.0.0.1:8000
python main.py                       # terminal
python main.py --gui                 # desktop HUD
python main.py --voice               # hands-free voice loop
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | Enables live model replies |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name |
| `OPENAI_TIMEOUT_SECONDS` | `30` | Request timeout |

## Commands

| Say or type | What happens |
| --- | --- |
| `open browser example.com` | Opens the URL in your default browser |
| `search web latest AI news` | Opens a web search |
| `create file notes.txt \| hello` | Writes a file to disk |
| `run code print('hello')` | Runs a Python snippet in a separate process (20 s timeout) |

## The public demo

The hosted site at **jarvis.moratamothodevs.co.za** serves only the static frontend. With no backend to reach, the UI switches to **demo mode**: replies come from a built-in script and commands are simulated, so nothing runs on a visitor's machine. Run the project locally to connect the full assistant.

## Security notes

The local server can execute commands, so it:

- binds to `127.0.0.1` only,
- sends no CORS headers, so other websites can't call `/chat` from your browser,
- rejects requests whose `Host` header isn't localhost, which blocks DNS rebinding,
- serves a fixed allowlist of static files.

## Deployment

Pushing changes under `jarvis-ui/` to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml), which publishes the static UI to GitHub Pages with the custom domain from `jarvis-ui/CNAME`.

One-time setup:

1. In the repository settings, open **Pages** and set the source to **GitHub Actions**.
2. At your DNS provider for `moratamothodevs.co.za`, add a `CNAME` record from `jarvis` to `<your-github-username>.github.io`.
3. Once DNS resolves, turn on **Enforce HTTPS** in the Pages settings.

---

© MoratamothoDevs · [moratamothodevs.co.za](https://moratamothodevs.co.za)
