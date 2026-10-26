export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { courses } = req.body

    const response = await fetch('https://api.meta.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'muse-spark-1.3',

        input: `
You are Orbit, an adaptive learning agent.

A student has multiple courses.

Decide which ONE course they should work on next.

Consider:
- deadlines and urgency
- upcoming quizzes, tests, and homework
- the recommended task for each course
- available course context

Courses:
${JSON.stringify(courses)}

Return ONLY valid JSON in this exact shape:

{
  "courseName": "",
  "reason": "",
  "recommendedAction": ""
}

The courseName MUST exactly match one of the course names provided.
        `,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    const messageOutput = data.output.find(
      (item) => item.type === 'message'
    )

    const text = messageOutput.content.find(
      (item) => item.type === 'output_text'
    ).text

    const recommendation = JSON.parse(text)

    return res.status(200).json(recommendation)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Failed to recommend course',
    })
  }
}