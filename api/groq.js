export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, method = 'POST', body, isStream } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  try {
    const response = await fetch(`https://api.groq.com/openai/v1/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    // For streaming responses
    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          res.write(decoder.decode(value));
        }
        done = readerDone;
      }
      res.end();
    } else {
      // For regular JSON responses
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: error.message });
  }
}
