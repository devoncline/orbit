import process from 'node:process'
import {
    formatLearningAnchors,
    anchorSuggestionPrompt,
    quizMisconceptionAnchor,
} from '../src/services/studyLearningContext.js'

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
            topic,
            learningAnchors,
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
${formatLearningAnchors(learningAnchors, { topic, text: question })}

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
${topic ? `${anchorSuggestionPrompt}
Current topic: ${JSON.stringify(topic)}
Only suggest a misconception anchor if this particular mistake reveals a specific useful misunderstanding. Use medium confidence and describe it as suspected or still needing a check.
A multiple-choice selection does not demonstrate the learner's reasoning. Do not claim the correction worked or create an understanding/preference anchor from your own adapted explanation.` : ''}
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

        const { anchor, ...evaluation } = JSON.parse(text)

        return res.status(200).json({ ...evaluation, ...quizMisconceptionAnchor(anchor, topic) })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            error: 'Failed to evaluate study answer',
        })
    }
}
