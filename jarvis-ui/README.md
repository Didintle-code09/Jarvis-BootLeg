# JARVIS UI

A futuristic web interface for JARVIS with animated floating module blocks, a dark HUD-style layout, and a local Python backend that serves chat responses.

## Project Structure

```text
jarvis-ui/
  index.html
  styles.css
  app.js
  README.md
  backend/
    server.py
```

## How It Works

- The browser UI renders user input and AI responses as animated module blocks.
- Each AI response is split into chunks so the grid looks like a live thinking system.
- The backend exposes a single `/chat` endpoint and reuses the existing JARVIS assistant logic from the parent project.
- If the backend is unavailable, the UI falls back to a local mock response generator.
- The browser UI can be voice activated with the wake phrase "Hey Jarvis" after you enable microphone access.
- JARVIS speaks responses back through the browser when speech synthesis is available.

## Run It Fully

1. Open a terminal in `c:\Projects\jarvis`.
2. Start the backend server:

```bash
python jarvis-ui/backend/server.py
```

3. Open the UI in your browser at:

```text
http://127.0.0.1:8000
```

4. Click `Enable Voice`, allow microphone access, and say `Hey Jarvis` followed by your command.

## Optional API Key

If you want the backend to use a live model, make sure the root `.env` file contains:

```text
OPENAI_API_KEY=your_key_here
```

The backend reads the existing JARVIS assistant code, so the same environment variables used by the CLI assistant also apply here.

## Notes

- The UI is built with plain HTML, CSS, and JavaScript.
- No frontend build step is required.
- The server uses only Python standard library modules.
- Voice activation depends on the browser's Web Speech API, so Chrome or Edge on `http://127.0.0.1:8000` is the most reliable setup.
