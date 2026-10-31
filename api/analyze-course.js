import process from 'node:process'
import { localDate, normalizeSyllabusItems } from '../src/services/coursePosition.js'
import { parseWorkDate } from '../src/services/upcomingWork.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { fileName, fileData, currentDate } = req.body

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
Today in the learner's app: ${parseWorkDate(currentDate) ? currentDate : localDate()}.

Return ONLY valid JSON in this exact shape:

{
  "courseName": "",
  "instructor": "",
  "semester": "",
  "importantTopics": [],
  "syllabusItems": [
    { "topic": "", "unit": "", "startDate": "", "endDate": "", "dateText": "" }
  ],
  "upcomingWork": [
    {
      "title": "",
      "type": "",
      "topic": "",
      "date": ""
    }
  ],
  "nextRecommendedAction": ""
}

Use only information found in the document.
Extract the teaching schedule in document order, including past, current and future units.
Use YYYY-MM-DD for full dates, or YYYY-MM for a month with an explicitly supported year.
Infer a year ONLY from an explicit course/semester year in the document, never from today's date.
For weeks without a dated term start or ambiguous dates, leave startDate/endDate empty and preserve the original wording in dateText.
Keep past assignments too; upcomingWork is the complete extracted assignment list, not just future work.
Use complete YYYY-MM-DD assignment dates only when supported; otherwise preserve the original date text.
Choose a useful current action using today's date, not automatically the earliest topic. Treat coverage as tentative, not completed work.
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
            return res.status(response.status).json({ error: 'Failed to analyze course file' })
        }

        const messageOutput = data.output.find(
            (item) => item.type === 'message'
        )

        const text = messageOutput.content.find(
            (item) => item.type === 'output_text'
        ).text

        const analysis = JSON.parse(text)

        return res.status(200).json({ ...analysis, syllabusItems: normalizeSyllabusItems(analysis.syllabusItems) })
    } catch {
        return res.status(500).json({
            error: 'Failed to analyze course document',
        })
    }
}
