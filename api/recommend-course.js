import process from 'node:process'
import { inferCoursePosition } from '../src/services/coursePosition.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { courses, currentDate } = req.body || {}
    if (!Array.isArray(courses) || !courses.length || courses.length > 100 || courses.some((course) => typeof course?.name !== 'string')) {
      return res.status(400).json({ error: 'Invalid courses' })
    }

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
- today's runtime date, current syllabus area, explicit learner position, and weak mastery

Within a course, use this priority: explicit learner correction > recent learner state > mastery / learning anchors > dated syllabus context > inferred position > generic ordering.
Learner exclusions (skip or notYet) override inferred dates. Never start old orientation material merely because it is listed first.
Past material remains useful for weak mastery, requested review, prerequisites or test coverage. Do not claim dated coverage proves completion.
If the timeline is uncertain, ask a concise starting-point question. Never expose confidence labels.

Courses:
${JSON.stringify(courses.map((course) => ({ name: course.name, nextTask: course.nextTask, importantTopics: course.importantTopics, mastery: course.mastery, position: inferCoursePosition(course, currentDate) })))}

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
