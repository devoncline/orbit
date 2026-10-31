import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeLearningProfile } from '../src/services/learningProfile.js'
import * as client from '../src/services/meta.js'
import lessonHandler from '../api/generate-study-lesson.js'
import conversationHandler from '../api/respond-to-study-message.js'
import activityHandler from '../api/study-activity.js'
import questionHandler from '../api/generate-study-question.js'
import evaluationHandler from '../api/evaluate-study-answer.js'

const course = { name: 'React', mastery: { overall: 40, topics: { State: 40 } } }
const lesson = { topic: 'State', concept: 'Remembering a value', content: 'State stores a value between renders.' }
const question = { topic: 'State', question: 'Where is the count stored?', answers: [{ text: 'State', correct: true }, { text: 'Visible text', correct: false }], explanation: 'State stores the count.' }
const activity = { title: 'Predict a count', instruction: 'What follows a count update?', topic: 'State', activityType: 'predict', successCriteria: 'State changes before the screen.' }
const profile = { chunkSize: 'short', exampleTiming: 'early', visualPreference: 'often', guidance: 'focused', reentrySupport: 'where_left_off', raw: 'PRIVATE_PROFILE_PAYLOAD' }
const routes = { '/api/generate-study-lesson': lessonHandler, '/api/respond-to-study-message': conversationHandler, '/api/study-activity': activityHandler, '/api/generate-study-question': questionHandler, '/api/evaluate-study-answer': evaluationHandler }
const outputFor = (route, body) => route === '/api/generate-study-lesson' ? { ...lesson, ...(body.action === 'next' ? { concept: 'Updating a count' } : {}) }
  : route === '/api/respond-to-study-message' ? { response: 'State keeps the value. How would you describe its role?', signal: 'neutral' }
    : route === '/api/study-activity' ? body.action === 'generate' ? activity : { feedback: 'State stores the value before the screen changes.', signal: 'applied_understanding' }
      : route === '/api/generate-study-question' ? question
        : { feedback: 'Visible text is an output.', adaptedExplanation: 'State is the component memory.', followUpQuestion: 'What remembers a count?', followUpAnswers: question.answers }

async function call(handler, body) {
  const res = { code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  await handler({ method: 'POST', body }, res)
  assert.equal(res.code, 200)
  return new Response(JSON.stringify(res.body), { headers: { 'Content-Type': 'application/json' } })
}

test('every Study teaching path carries only normalized preferences through the real client and server prompt boundary', async (t) => {
  const requests = [], prompts = []
  let route, request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    if (routes[url]) {
      route = url; request = body; requests.push(body)
      return call(routes[url], body)
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    prompts.push({ route, input: body.input })
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(outputFor(route, request)) }] }] }))
  })
  const options = { learningProfile: profile }
  await client.generateStudyLesson(course, 40, options)
  await client.generateNextStudyLesson(course, 40, lesson, options)
  await client.explainStudyLessonDifferently(course, lesson, '', options)
  await client.generateStudyExample(course, lesson, '', options)
  await client.respondToStudyMessage(course, lesson, { ...options, message: 'What does state do?' })
  await client.generateStudyActivity(course, lesson, options)
  await client.evaluateStudyActivity(course, lesson, activity, 'State stores the count.', options)
  await client.generateStudyQuestion(course, 40, lesson, options)
  await client.evaluateStudyAnswer(course, question, question.answers[1], 40, options)
  assert.equal(requests.length, 9)
  assert.equal(prompts.length, 9, 'Preferences do not add model requests')
  for (const body of requests) assert.deepEqual(body.learningProfile, normalizeLearningProfile(profile))
  for (const { input } of prompts) {
    assert.match(input, /short explanations in small conceptual steps/)
    assert.match(input, /Lead teaching explanations with a concrete example/)
    assert.match(input, /grading rules and output limits take priority/)
    assert.doesNotMatch(input, /PRIVATE_PROFILE_PAYLOAD/)
  }
  for (const { route, input } of prompts.filter(({ route }) => ['/api/generate-study-lesson', '/api/respond-to-study-message'].includes(route))) {
    assert.match(input, /Lower the threshold.*genuinely explains/)
    if (route === '/api/generate-study-lesson') assert.match(input, /Never exceed 100 words or 900 characters/)
  }
})

test('server re-normalizes hostile profile input and low visual preference still allows explicit visual requests', async (t) => {
  const prompts = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    prompts.push(JSON.parse(options.body).input)
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(lesson) }] }] }))
  })
  await call(lessonHandler, { courseName: 'React', learningProfile: { chunkSize: 'PRIVATE_OVERRIDES', raw: 'PRIVATE_RAW', visualPreference: 'on_request' } })
  assert.doesNotMatch(prompts[0], /PRIVATE/)
  assert.match(prompts[0], /Prefer no automatic visual.*Show me/)
  await call(lessonHandler, { courseName: 'React' })
  assert.match(prompts[1], /concise, balanced amount/)
})

test('on-request lessons suppress automatic imagery even when the model returns a valid image brief', async (t) => {
  const visual = { type: 'generated_image', composition: 'diagram', purpose: 'Explain state flowing to the view', focus: 'State', data: [{ label: 'State', detail: 'A remembered count' }] }
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...lesson, visual }) }] }] })))
  for (const action of ['lesson', 'next', 'simplify', 'example']) {
    // A next lesson must not repeat its predecessor.
    const response = await call(lessonHandler, { courseName: 'React', action, lesson: action === 'next' ? { ...lesson, concept: 'An earlier concept' } : lesson, learningProfile: { visualPreference: 'on_request' } })
    assert.deepEqual((await response.json()).visual, { type: 'none' })
  }
  const automatic = await call(lessonHandler, { courseName: 'React', learningProfile: { visualPreference: 'often' } })
  assert.equal((await automatic.json()).visual.type, 'generated_image')
})
