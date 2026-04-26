# TwinMind Live Suggestions

A web app that listens to your microphone and surfaces three useful suggestions every ~30 seconds based on what's being said. Clicking a suggestion opens a detailed answer in the chat panel, grounded in the full transcript.

Built for the TwinMind Live Suggestions assignment (April 2026).

- **Live demo:**
- **Stack:** React + Vite (frontend), FastAPI + Python (backend), Groq API for transcription and chat.

---

## Quick start

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, paste your Groq API key when prompted, and start recording. The key stays in browser memory for the session and is never written to disk or sent anywhere except Groq.

You can get a free Groq API key at [console.groq.com](https://console.groq.com).

---

## Stack and model choices

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **React 19 + Vite** | Fast dev server, minimal config, straightforward component model. |
| Backend framework | **FastAPI** | Async Python, automatic OpenAPI docs, clean dependency injection for auth. |
| Styling | **Custom CSS** | Full control over the three-column layout and dark-card aesthetic. |
| Transcription | **Groq Whisper Large V3** | Required by the assignment. Fast enough for 30-second chunks. |
| Suggestions + Chat | **Groq `openai/gpt-oss-120b`** | Required by the assignment. Handles the 30-second cadence well and produces varied suggestion mixes. |
| Audio capture | **Browser `MediaRecorder` API** | No extra dependency. Works in every modern browser and outputs webm/opus chunks that Whisper accepts directly. |
| Markdown rendering | **react-markdown + remark-gfm** | Chat responses render with proper formatting rather than raw markdown text. |

**Separation of concerns.** The frontend handles recording, state, and rendering. The backend handles all Groq API calls: transcription, suggestions, and chat. The user's API key is passed as a Bearer token per request and never stored server-side.

---

## Prompt strategy

### Suggestion prompt

The model is told to generate exactly 3 suggestions grounded entirely in what was just said. No external advice, no invented facts. It picks the most useful mix of types from the transcript rather than always using the same combination. Output is strict JSON with no markdown wrapping.

### Chat prompt

Concise, context-aware answers based on the transcript and chat history. If key information is missing from the transcript the model says so rather than guessing.

### Detail prompt (on suggestion click)

When the user clicks a suggestion, a separate system prompt is used that instructs the model to give a deeper, well-structured response. The suggestion's `kind` and `preview` are substituted in so the model knows exactly what it is expanding. This is distinct from the chat prompt, which is tuned for conversational back-and-forth.

### Defaults are configurable

All three prompts and all three context windows (suggestion, chat, detail) are editable in the Settings panel. What ships in the code are the values I landed on after testing. Anyone can tweak them live without redeploying.

---

## Tradeoffs

- **API key in browser memory.** The key is passed as a Bearer token from the frontend to the backend per request and never stored. It has to be re-entered on reload. In production you would encrypt it server-side behind an auth layer.
- **No persistence.** Sessions reset on reload, which the assignment explicitly allows. Export is the escape hatch.
- **No streaming on suggestions.** Chat renders as a complete response, and suggestions arrive all at once because the backend needs a complete JSON object to validate and return. Streaming would feel faster but would require partial-JSON parsing.
- **No proper noun correction.** Whisper sometimes mis-transcribes names. The suggestion prompt handles this by not inventing facts not present in the transcript.

---

## File Structure

```
backend/
  app/
    main.py                FastAPI app setup, CORS, router registration
  api/
    routes.py              All API endpoints: /health, /validate-key, /transcribe, /suggestions, /chat
  services/
    groq.py                All Groq API calls: transcribe, suggestions, chat
  schemas/
    common.py              HealthResponse, ValidateKeyResponse
    transcribe.py          TranscribeResponse
    suggestions.py         SuggestionItem, SuggestionBatch, SuggestionRequest, SuggestionResponse
    chat.py                ChatMessage, ChatRequest, ChatResponse

frontend/src/
  App.jsx                  All state, recorder logic, suggestion/chat handlers, settings
  App.css                  All styles: layout, columns, panels, mic button, composer
  components/
    TranscriptPanel.jsx    Left column: mic button, transcript scroll
    SuggestionsPanel.jsx   Middle column: suggestion batches, refresh button
    ChatPanel.jsx          Right column: chat messages, composer, fullscreen mode
    SettingsPanel.jsx      API key input, prompt editors, context window settings
  lib/
    api.js                 Axios wrappers for all backend endpoints
```
