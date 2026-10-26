export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const {
            courseName,
            question,
            selectedAnswer,
            correctAnswer,
            importantTopics,
            mastery,
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

A student answered a study question incorrectly.

Course: ${courseName}
Question: ${question}
Student answer: ${selectedAnswer}
Correct answer: ${correctAnswer}
Important topics: ${importantTopics?.join(', ') || 'Unknown'}
Current mastery: ${mastery}%

Explain the concept in a simpler way based on the student's mistake.

Then generate ONE easier follow-up multiple-choice question that tests the same concept.

Return ONLY valid JSON in this exact shape:

{
  "feedback": "",
  "adaptedExplanation": "",
  "followUpQuestion": "",
  "followUpAnswers": [
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
  ]
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

        const evaluation = JSON.parse(text)

        return res.status(200).json(evaluation)
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            error: 'Failed to evaluate study answer',
        })
    }
}