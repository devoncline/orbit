export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      courseName,
      nextTask,
      importantTopics,
      upcomingWork,
      mastery,
      topicMastery,
    } = req.body

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

Generate ONE multiple-choice study question for this student.

Course: ${courseName}
Recommended task: ${nextTask}
Important topics: ${importantTopics?.join(', ') || 'Unknown'}
Upcoming work: ${JSON.stringify(upcomingWork || [])}
Current mastery: ${mastery}%
Topic mastery: ${JSON.stringify(topicMastery || {})}

Choose ONE relevant topic for this question.

Prefer topics with lower mastery when they are relevant to the student’s upcoming work.

If topic mastery is unavailable, choose the most relevant topic from the course context.

Return ONLY valid JSON in this exact shape:

{
  "topic": "",
  "question": "",
  "answers": [
    {
      "text": "",
      "correct": false
    },
    {
      "text": "",
      "correct": true
    },
    {
      "text": "",
      "correct": false
    }
  ],
  "explanation": ""
}
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

    const question = JSON.parse(text)

    return res.status(200).json(question)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Failed to generate study question',
    })
  }
}
