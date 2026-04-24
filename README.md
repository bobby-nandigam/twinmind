# TwinMind Copilot

An always-on AI meeting copilot that listens to live audio, transcribes speech in real time, and continuously surfaces 3 contextual suggestions — questions to ask, facts to check, talking points, and more. Built for the TwinMind engineering assignment.

**Live demo:** `<your-deployed-url>`  
**GitHub:** `<this-repo>`

---

## Quick Start

```bash
git clone <repo>
cd twinmind
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000), click **Settings**, paste your Groq API key, and hit **Record**.

### Deploying to Vercel

```bash
npm install -g vercel
vercel --prod
```

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 18 (CRA) | Fast setup, well-understood, no extra build complexity |
| **State** | Zustand | Minimal boilerplate, no context hell, easy devtools |
| **Transcription** | Groq Whisper Large V3 | Required by spec; fastest Whisper endpoint available |
| **LLM** | Groq `llama-3.3-70b-versatile` | Fast, capable model for chat & suggestions; supports streaming |
| **Styling** | Pure CSS with custom properties | No CSS-in-JS overhead; full control over dark theme |
| **Fonts** | Syne + DM Sans + JetBrains Mono | Distinct, not generic; Syne for headings, DM Sans for body, Mono for timestamps/code |

---

## Architecture

```
src/
├── App.js                   # Root: orchestrates all hooks & panels
├── styles.css               # Single CSS file — design system with CSS vars
├── store/
│   └── useStore.js          # Zustand store — all app state
├── services/
│   └── groq.js              # API layer — transcription, chat, suggestions, streaming
├── hooks/
│   ├── useAudioRecorder.js  # MediaRecorder + 30s chunk flushing
│   ├── useSuggestions.js    # Suggestion generation + auto-refresh
│   └── useChat.js           # Chat send + suggestion expansion (streaming)
├── components/
│   ├── TranscriptPanel.js   # Left column — mic control + transcript feed
│   ├── SuggestionsPanel.js  # Middle column — batched suggestion cards
│   ├── ChatPanel.js         # Right column — streaming chat interface
│   ├── SettingsModal.js     # Settings overlay — API key + all editable params
│   └── Toast.js             # Toast notification system
└── utils/
    ├── defaults.js          # Default prompts + model settings
    └── helpers.js           # Export, formatTime, type colors
```

### Data flow

```
Mic → MediaRecorder (1s slices)
    → every 30s: Blob → Groq Whisper → text chunk → store.transcriptChunks
                                                   → auto-refresh trigger
                                                       → recent 3000 chars
                                                       → Groq LLaMA (suggestions prompt)
                                                       → 3 parsed suggestion objects
                                                       → store.suggestionBatches (prepend)

User clicks card → store.chatMessages (user msg)
               → clickDetailPrompt + transcript → Groq stream
               → token-by-token update → streaming assistant message

User types in chat → history + transcript context → Groq stream → streaming reply
```

---

## Prompt Engineering Strategy

### Suggestion Generation

The suggestions prompt is the core of the product. My design decisions:

**1. JSON-only output with strict schema enforcement**  
The model is told to return *only* a JSON array with no markdown, no preamble. This keeps latency low (no parsing of explanatory text) and makes errors catchable. The schema is simple: `type`, `title`, `preview`, `detail_hint`.

**2. Type taxonomy with definitions**  
Five types cover every useful meeting intervention:
- `question` — a sharp follow-up the user can ask
- `point` — an angle or fact not yet raised
- `answer` — direct answer to a question in the transcript
- `factcheck` — verification of a specific claim or number
- `clarify` — definition of a term just used

The prompt explicitly defines each type and instructs the model to pick types based on what's happening *right now*. This avoids getting 3 generic "here's a follow-up question" cards every time.

**3. Preview = standalone value**  
The preview (≤12 words) is designed to be useful *without* clicking. TwinMind's real value comes from ambient intelligence — the user should glance at cards and gain insight. The prompt reinforces this with: "someone should immediately understand the insight without clicking."

**4. Context window trimming**  
We pass only the most recent N characters of transcript (default: 3,000 chars ≈ 3–5 minutes of speech). Passing full transcripts would dilute focus on the current moment and increase latency. The window is configurable in Settings.

**5. Temperature 0.6 for suggestions**  
High enough for varied, creative suggestions across batches. Low enough to stay factual and grounded in the transcript.

### Chat / Expansion Prompt

**Expansion on click** uses a filled template with `{type}`, `{title}`, `{preview}`, `{transcript}` — giving the model the exact context of what was clicked plus recent meeting context. This produces tight, on-topic answers rather than generic responses.

**Free-form chat** sends the full conversation history plus recent transcript as context in the system. Temperature 0.5 — balanced between coherence and creativity.

**Streaming** for all chat responses: first token appears in ~500ms on Groq's infrastructure, making responses feel instant.

---

## Settings (all editable in UI)

| Setting | Default | Notes |
|---|---|---|
| `completionModel` | `llama-3.3-70b-versatile` | Groq's fast LLaMA 3.3 model |
| `transcriptionModel` | `whisper-large-v3` | Fixed per spec |
| `suggestionContextChars` | `3000` | Recent transcript chars for suggestions |
| `chatContextChars` | `6000` | Recent transcript chars for chat answers |
| `autoRefreshInterval` | `30000` ms | Auto-refresh cadence |
| `suggestionSystemPrompt` | See `defaults.js` | Full prompt editable in Settings |
| `chatSystemPrompt` | See `defaults.js` | Full prompt editable in Settings |
| `clickDetailPrompt` | See `defaults.js` | Template for suggestion expansion |

---

## Key Technical Decisions & Tradeoffs

### Audio chunking
`MediaRecorder` collects 1-second data slices into an in-memory buffer. Every 30 seconds, the buffer is assembled into a Blob and sent to Whisper. This means:
- ✅ Continuous speech capture without restarts
- ✅ Each chunk gets proper codec headers (webm/opus)
- ⚠️ A sentence cut at the 30s boundary may split awkwardly — acceptable for a copilot use case

### No backend
Everything runs client-side. The Groq API supports CORS for browser requests. Tradeoff: API key is in browser memory (not persisted to localStorage — user re-enters on reload for security). For production, a lightweight proxy would handle key management.

### Suggestion batching (prepend)
New batches appear at the top, older ones stay below. This matches how users scan: most recent suggestions are most relevant, but historical ones are there for reference. Each batch shows a timestamp and "Latest" badge.

### Minimal markdown renderer
Rather than pulling in `react-markdown` (~180KB), a tiny inline renderer handles bold, italic, lists, and headers. This covers 95% of what the LLM outputs and keeps the bundle lean.

---

## Export Format

```json
{
  "exportedAt": "2025-01-01T12:00:00.000Z",
  "transcript": [
    { "id": 1234567890, "text": "...", "timestamp": "2025-01-01T12:00:00.000Z" }
  ],
  "suggestionBatches": [
    {
      "id": 1234567890,
      "timestamp": "2025-01-01T12:00:30.000Z",
      "items": [
        { "id": "...", "type": "question", "title": "...", "preview": "...", "detail_hint": "..." }
      ]
    }
  ],
  "chatHistory": [
    { "id": 1234567890, "role": "user", "content": "...", "timestamp": "..." },
    { "id": 1234567891, "role": "assistant", "content": "...", "timestamp": "..." }
  ]
}
```

---

## What I'd improve with more time

1. **VAD (Voice Activity Detection)** — skip transcription calls during silence using a lightweight WebAudio analyser
2. **Speaker diarization** — Groq Whisper supports it; would make transcript far more useful in multi-person meetings
3. **Suggestion deduplication** — avoid surfacing the same suggestion across batches
4. **Persistent settings** — save API key + settings to localStorage (with user consent)
5. **PWA** — add service worker for offline-capable transcript storage
6. **Backend proxy** — Next.js API route to keep the Groq key server-side
