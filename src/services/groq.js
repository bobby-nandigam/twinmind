/**
 * Groq API service — handles transcription (Whisper) and chat completions (LLaMA).
 * All calls are stateless; context is passed in on each request.
 * 
 * In production (Vercel), routes through /api/groq server proxy to keep API key secure.
 * In development, calls Groq API directly with the API key from browser storage.
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const isProduction = process.env.NODE_ENV === 'production';

// ─── Transcription ─────────────────────────────────────────────────────────

/**
 * Transcribe an audio blob using Whisper Large V3 via Groq.
 * @param {Blob} audioBlob - Raw audio data (webm/ogg/mp4)
 * @param {string} apiKey - Only used in development; ignored in production
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBlob, apiKey) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('language', 'en');

  // Transcription always goes directly to Groq (no proxy needed for audio)
  // API key is still exposed here, but transcription doesn't contain sensitive data
  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Transcription failed (${res.status})`);
  }

  const data = await res.json();
  return data.text?.trim() || '';
}

// ─── Chat Completions ───────────────────────────────────────────────────────

/**
 * Call Groq chat completions (non-streaming).
 * In production, routes through /api/groq proxy.
 * In development, calls Groq directly.
 * @param {object} opts
 * @param {string} opts.apiKey - Only used in development
 * @param {string} opts.model
 * @param {string} opts.systemPrompt
 * @param {string} opts.userMessage
 * @param {number} [opts.maxTokens=1024]
 * @param {number} [opts.temperature=0.4]
 * @returns {Promise<string>}
 */
export async function chatCompletion({ apiKey, model, systemPrompt, userMessage, maxTokens = 1024, temperature = 0.4 }) {
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };

  if (isProduction) {
    // In production, use server proxy to hide API key
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  // Development: direct Groq API call
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Call Groq chat completions with streaming.
 * In production, routes through /api/chat proxy.
 * In development, calls Groq directly.
 * @param {object} opts
 * @param {string} opts.apiKey - Only used in development
 * @param {string} opts.model
 * @param {string} opts.systemPrompt
 * @param {Array}  opts.messages - Full conversation history [{role, content}]
 * @param {function} opts.onToken - Called with each token string
 * @param {number} [opts.maxTokens=1024]
 * @returns {Promise<void>}
 */
export async function chatCompletionStream({ apiKey, model, systemPrompt, messages, onToken, maxTokens = 1024 }) {
  const body = {
    model,
    max_tokens: maxTokens,
    temperature: 0.5,
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  };

  if (isProduction) {
    // Use server proxy with streaming
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Stream error (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const chunk = JSON.parse(raw);
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          // malformed SSE chunk — skip
        }
      }
    }
    return;
  }

  // Development: direct Groq API call
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Stream error (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const chunk = JSON.parse(raw);
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // malformed SSE chunk — skip
      }
    }
  }
}

// ─── Suggestions ────────────────────────────────────────────────────────────

/**
 * Generate 3 live suggestions from recent transcript text.
 * Returns parsed array of suggestion objects.
 * @param {string} transcriptContext - Recent transcript (already trimmed to context window)
 * @param {string} systemPrompt - The suggestions system prompt from settings
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<Array<{type, title, preview, detail_hint}>>}
 */
export async function generateSuggestions(transcriptContext, systemPrompt, apiKey, model) {
  const userMessage = `Here is the recent meeting transcript. Generate 3 suggestions now.\n\nTRANSCRIPT:\n${transcriptContext}`;

  const raw = await chatCompletion({
    apiKey,
    model,
    systemPrompt,
    userMessage,
    maxTokens: 600,
    temperature: 0.6,
  });

  // Strip possible markdown code fences
  const cleaned = raw.replace(/```json|```/gi, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Suggestions response was not valid JSON. Raw: ' + raw.slice(0, 200));
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Suggestions response did not return an array.');
  }

  return parsed.slice(0, 3).map((item) => ({
    type: item.type || 'question',
    title: item.title || 'Suggestion',
    preview: item.preview || '',
    detail_hint: item.detail_hint || '',
  }));
}

/**
 * Generate detailed answer when a suggestion card is clicked.
 * @param {object} suggestion - The clicked suggestion object
 * @param {string} transcriptContext
 * @param {string} clickDetailPromptTemplate - Template with {type}, {title}, {preview}, {transcript}
 * @param {string} chatSystemPrompt
 * @param {string} apiKey
 * @param {string} model
 * @param {function} onToken - Streaming callback
 */
export async function expandSuggestion(suggestion, transcriptContext, clickDetailPromptTemplate, chatSystemPrompt, apiKey, model, onToken) {
  const filledPrompt = clickDetailPromptTemplate
    .replace('{type}', suggestion.type)
    .replace('{title}', suggestion.title)
    .replace('{preview}', suggestion.preview)
    .replace('{transcript}', transcriptContext);

  await chatCompletionStream({
    apiKey,
    model,
    systemPrompt: chatSystemPrompt,
    messages: [{ role: 'user', content: filledPrompt }],
    onToken,
    maxTokens: 800,
  });
}
