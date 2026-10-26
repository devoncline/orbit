export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'muse-spark-1.3',
        messages: [
          {
            role: 'user',
            content: 'Say hello from Orbit.',
          },
        ],
      }),
    })

    const data = await response.json()

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to contact Meta Model API',
    })
  }
}