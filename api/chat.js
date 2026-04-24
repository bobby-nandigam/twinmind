export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, max_tokens, temperature, messages, stream, apiKey } = req.body;

  // Use either env var (production) or passed apiKey (client-provided)
  const key = process.env.GROQ_API_KEY || apiKey;

  if (!key) {
    console.error('[api/chat] No API key provided');
    return res.status(401).json({ error: 'No API key provided' });
  }

  if (!model || !messages) {
    return res.status(400).json({ error: 'Missing required fields: model, messages' });
  }

  console.log('[api/chat] Calling Groq with model:', model, 'stream:', stream);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        max_tokens: max_tokens || 1024,
        temperature: temperature || 0.5,
        messages: messages || [],
        stream: stream === true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[api/chat] Groq error:', error);
      return res.status(response.status).json({ error: error.error?.message || error.message || 'API error' });
    }

    // Handle streaming responses
    if (stream === true) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let isStreaming = true;
      while (isStreaming) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        } catch (err) {
          console.error('[api/chat] Stream read error:', err);
          break;
        }
      }
      res.end();
    } else {
      // Standard JSON response
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('[api/chat] Server error:', error);
    res.status(500).json({ error: error.message });
  }
}


