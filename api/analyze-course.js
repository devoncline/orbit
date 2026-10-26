export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileName, fileType, fileData } = req.body

    if (!fileData) {
      return res.status(400).json({
        error: 'No course file was provided',
      })
    }

    const response = await fetch('https://api.meta.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'muse-spark-1.3',

        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_file',
                filename: fileName,
                file_data: fileData,
              },
              {
                type: 'input_text',
                text: `
You are Orbit, an adaptive learning agent.

Analyze this course document.

Return ONLY valid JSON in this exact shape:

{
  "courseName": "",
  "instructor": "",
  "semester": "",
  "importantTopics": [],
  "upcomingWork": [
    {
      "title": "",
      "type": "",
      "date": ""
    }
  ],
  "nextRecommendedAction": ""
}

Use only information found in the document.
If something is unknown, use an empty string or empty array.
                `,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Failed to analyze course document',
    })
  }
}