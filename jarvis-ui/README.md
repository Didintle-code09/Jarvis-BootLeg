# JARVIS web UI

The browser interface for JARVIS, by [MoratamothoDevs](https://moratamothodevs.co.za). It uses plain HTML, CSS and JavaScript, with no build step.

```text
jarvis-ui/
  index.html      layout, status panel, About dialog
  styles.css      HUD theme, animation, responsive layout
  app.js          chat, voice activation, demo mode
  favicon.svg
  robots.txt
  CNAME           custom domain for GitHub Pages
  backend/
    server.py     local API + static file server (standard library only)
```

## Two modes

On load, the UI calls `GET /health`:

- **Live backend.** The Python server answered, so messages go to `POST /chat` and run through the full assistant: LLM, commands and memory.
- **Demo mode.** No backend answered, as on the hosted site. Replies come from `getDemoResponse()` in `app.js`, and commands are only described.

The badge in the top bar shows which mode is active.

## Run locally

```bash
python jarvis-ui/backend/server.py
```

Open <http://127.0.0.1:8000>. To use voice, click the orb next to the input, allow the microphone, and say "Hey Jarvis" followed by your command. Voice needs the Web Speech API, so use Chrome or Edge.

Deep link to the case study: `/#about`.
