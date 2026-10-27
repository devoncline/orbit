import assert from 'node:assert/strict'
import { coursePositionRequest } from '../src/services/coursePosition.js'
import { test } from 'node:test'
import handler from '../api/study-activity.js'
import conversationHandler from '../api/respond-to-study-message.js'
import questionHandler from '../api/generate-study-question.js'
import {
  generateStudyActivity,
  evaluateStudyActivity,
  respondToStudyMessage,
  generateStudyQuestion,
} from '../src/services/meta.js'

const course = {
  name: 'React',
  nextTask: 'Understand props',
  importantTopics: ['Props'],
  upcomingWork: [{ title: 'Build a greeting', date: '2026-10-28' }],
  mastery: { overall: 40, topics: { Props: 20 } },
}
const lesson = {
  topic: 'Props',
  concept: 'Passing information to a component',
  content: 'Props let a React component receive information from another component.',
}
const activity = {
  title: 'Make a greeting reusable',
  instruction: 'Change function Greeting() { return <h1>Hello, Ada</h1> } to receive a name prop. Share your edited component and how you would greet Sam.',
  activityType: 'modify',
  successCriteria: 'Receives a name prop, uses it in the greeting, and passes Sam from the parent.',
  topic: 'Props',
}
const exchange = {
  message: 'Are props like function arguments?',
  response: 'Both provide inputs. Props are inputs passed to a component when it renders.',
  signal: 'connection',
}
const body = {
  action: 'generate',
  courseName: course.name,
  nextTask: course.nextTask,
  importantTopics: course.importantTopics,
  upcomingWork: course.upcomingWork,
  mastery: course.mastery.overall,
  topicMastery: course.mastery.topics,
  lesson,
  example: 'A greeting component receives a name prop.',
  history: [exchange],
}
const learnerResponse = 'function Greeting({ name }) { return <h1>Hello, {name}</h1> } and <Greeting name="Sam" />'
const feedback = {
  feedback: 'Your component receives name and uses it in the greeting. Passing Sam from the parent shows how one component can display different inputs through props.',
  signal: 'applied_understanding',
}
const evaluationBody = { ...body, action: 'evaluate', activity, learnerResponse }
const activityContext = { activity, learnerResponse, feedback: feedback.feedback }

function modelResponse(value) {
  return {
    ok: true,
    json: async () => ({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    }),
  }
}

async function callHandler(requestBody = body, method = 'POST', target = handler) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  }
  await target({ method, body: requestBody }, res)
  return res
}

test('generates one applied activity grounded in the lesson, mastery and recent conversation', async (t) => {
  const before = structuredClone(body)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...activity, mastery: 100, completed: true }))
  const res = await callHandler()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, activity)
  assert.equal(fetchMock.mock.callCount(), 1)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, 'https://api.meta.ai/v1/responses')
  const request = JSON.parse(options.body)
  assert.equal(request.model, 'muse-spark-1.3')
  for (const context of [course.name, JSON.stringify(course.mastery.topics),
    JSON.stringify(course.upcomingWork), lesson.content, lesson.concept,
    body.example, exchange.message, exchange.response]) {
    assert.ok(request.input.includes(context))
  }
  assert.match(request.input, /ONE small applied activity/)
  assert.match(request.input, /2-3 minutes/)
  assert.match(request.input, /No passive reading, worksheets, essays, long projects, flashcards, or disguised multiple-choice quizzes/)
  assert.match(request.input, /No downloads, external software, code execution/)
  assert.match(request.input, /Do not switch topics or give away the solution/)
  assert.deepEqual(body, before)
})

test('uses only four recent exchanges and the single current attempt to adapt the next activity', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(activity))
  const history = Array.from({ length: 8 }, (_, index) => ({ ...exchange, message: `Turn ${index}` }))
  const res = await callHandler({ ...body, history, activityContext: { ...activityContext, unrelated: 'Ignored field' } })
  assert.equal(res.statusCode, 200)
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  for (let index = 0; index < 8; index += 1) {
    assert.equal(input.includes(`Turn ${index}`), index >= 4)
  }
  assert.ok(input.includes(JSON.stringify(activity)))
  assert.ok(input.includes(JSON.stringify(learnerResponse)))
  assert.ok(input.includes(feedback.feedback))
  assert.doesNotMatch(input, /Ignored field/)
  assert.equal(history.length, 8)
})

test('supports an activity without conversation history or topic mastery', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => modelResponse(activity))
  const res = await callHandler({ action: 'generate', courseName: 'React', lesson })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, activity)
})

test('rejects malformed activity requests before calling Meta', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(activity))
  assert.equal((await callHandler(body, 'GET')).statusCode, 405)
  for (const invalid of [null, {}, { ...body, action: 'unknown' },
    { ...body, courseName: ' ' }, { ...body, lesson: null },
    { ...body, lesson: { ...lesson, content: 'x'.repeat(901) } },
    { ...body, example: 'x'.repeat(901) }, { ...body, history: {} },
    { ...body, history: [null] }, { ...body, history: [{ ...exchange, message: 'x'.repeat(601) }] },
    { ...body, history: [{ ...exchange, response: 'x'.repeat(901) }] },
    { ...body, activityContext: null },
    { ...body, activityContext: { ...activityContext, learnerResponse: 'x'.repeat(601) } },
    { ...body, activityContext: { ...activityContext, feedback: 'x'.repeat(901) } },
    { ...body, activityContext: { ...activityContext, activity: { ...activity, topic: 'Other' } } },
    { ...evaluationBody, activity: null }, { ...evaluationBody, learnerResponse: ' ' },
    { ...evaluationBody, learnerResponse: 1 }, { ...evaluationBody, learnerResponse: 'x'.repeat(601) },
    { ...evaluationBody, activity: { ...activity, topic: 'Other' } },
    { ...evaluationBody, activity: { ...activity, successCriteria: 'x'.repeat(401) } }]) {
    assert.equal((await callHandler(invalid)).statusCode, 400)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('rejects malformed, oversized, off-topic or unknown-type generated activities', async (t) => {
  for (const result of [null, {}, { ...activity, title: '' }, { ...activity, title: 'x'.repeat(81) },
    { ...activity, instruction: '' }, { ...activity, instruction: 'x'.repeat(901) },
    { ...activity, instruction: 'a '.repeat(101) }, { ...activity, successCriteria: '' },
    { ...activity, successCriteria: 'x'.repeat(401) }, { ...activity, activityType: 'essay' },
    { ...activity, topic: 'Other' }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(result))
    const res = await callHandler()
    assert.equal(res.statusCode, 502)
    assert.deepEqual(res.body, { error: 'Invalid study activity response' })
    fetchMock.mock.restore()
  }
})

test('evaluates the actual response with criteria and context without grading or forcing progression', async (t) => {
  const before = structuredClone(evaluationBody)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(feedback))
  const res = await callHandler(evaluationBody)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, feedback)
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  for (const context of [JSON.stringify(activity), JSON.stringify(learnerResponse),
    lesson.content, exchange.message, exchange.response, JSON.stringify(course.mastery.topics)]) {
    assert.ok(input.includes(context))
  }
  assert.match(input, /Identify specifically what they understood correctly, correct ONE important misconception/)
  assert.match(input, /connect the result back to the current concept/)
  assert.match(input, /Do not grade them/)
  assert.match(input, /Do not force a quiz, change mastery, mark completion, or automatically move forward/)
  assert.deepEqual(evaluationBody, before)
})

test('returns only feedback and a recognized internal signal, with no mastery or completion fields', async (t) => {
  for (const signal of ['applied_understanding', 'partial_understanding', 'misconception', 'curiosity', 'neutral', undefined, 'completed']) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({
      ...feedback, signal, mastery: 100, completed: true, topic: 'Different topic',
    }))
    const res = await callHandler(evaluationBody)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { ...feedback, signal: !signal || signal === 'completed' ? 'neutral' : signal })
    fetchMock.mock.restore()
  }
})

test('rejects empty or excessive feedback instead of returning a text wall', async (t) => {
  for (const result of [null, {}, { feedback: '' }, { feedback: 3 },
    { feedback: 'x'.repeat(901) }, { feedback: 'a '.repeat(101) }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(result))
    assert.equal((await callHandler(evaluationBody)).statusCode, 502)
    fetchMock.mock.restore()
  }
})

test('both actions preserve provider error statuses without disclosing private error details', async (t) => {
  for (const status of [401, 403, 429, 503]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
      ok: false, status, json: async () => ({ error: 'Private provider details' }),
    }))
    for (const request of [body, evaluationBody]) {
      const res = await callHandler(request)
      assert.equal(res.statusCode, status)
      assert.deepEqual(res.body, { error: 'Failed to process study activity' })
    }
    fetchMock.mock.restore()
  }
})

test('network errors and missing or invalid JSON output are recoverable for both actions', async (t) => {
  for (const fetch of [
    async () => { throw new Error('Private network details') },
    async () => ({ ok: true, json: async () => ({ output: [] }) }),
    async () => ({ ok: true, json: async () => ({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }],
    }) }),
  ]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', fetch)
    for (const request of [body, evaluationBody]) {
      const res = await callHandler(request)
      assert.equal(res.statusCode, 502)
      assert.deepEqual(res.body, { error: 'Failed to process study activity' })
    }
    fetchMock.mock.restore()
  }
})

test('named services send bounded context and cancellation signals without client authentication', async (t) => {
  const history = Array.from({ length: 9 }, (_, index) => ({ ...exchange, message: `Turn ${index}` }))
  const controller = new AbortController()
  const before = structuredClone(course)
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, options) => ({
    ok: true, json: async () => JSON.parse(options.body).action === 'generate' ? activity : feedback,
  }))
  const options = { history, example: body.example, signal: controller.signal }
  assert.deepEqual(await generateStudyActivity(course, lesson, { ...options, activityContext }), activity)
  assert.deepEqual(await evaluateStudyActivity(course, lesson, activity, learnerResponse, options), feedback)
  const bodies = fetchMock.mock.calls.map(({ arguments: [url, request] }) => {
    assert.equal(url, '/api/study-activity')
    assert.equal(request.method, 'POST')
    assert.equal(request.signal, controller.signal)
    assert.equal(request.headers.Authorization, undefined)
    return JSON.parse(request.body)
  })
  const boundedHistory = history.slice(-4).map(({ message, response }) => ({ message, response }))
  assert.deepEqual(bodies[0], { ...body, ...coursePositionRequest(course), history: boundedHistory, activityContext })
  assert.deepEqual(bodies[1], { ...evaluationBody, ...coursePositionRequest(course), history: boundedHistory })
  assert.equal(history.length, 9)
  assert.deepEqual(course, before)
})

test('activity services preserve failure and abort handling for retry and Quiz me', async (t) => {
  const calls = [
    (signal) => generateStudyActivity(course, lesson, { signal }),
    (signal) => evaluateStudyActivity(course, lesson, activity, learnerResponse, { signal }),
  ]
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  for (const call of calls) await assert.rejects(call(), /Failed to process study activity/)
  fetchMock.mock.restore()
  t.mock.method(globalThis, 'fetch', async (_url, options) => options.signal.throwIfAborted())
  const controller = new AbortController()
  controller.abort()
  for (const call of calls) await assert.rejects(call(controller.signal), { name: 'AbortError' })
})

test('conversation can refer to the current activity and last submitted attempt with bounded context', async (t) => {
  const reply = { response: 'Yes, the parent provides the name prop to your component.', signal: 'understanding' }
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/respond-to-study-message') {
      const res = await callHandler(JSON.parse(options.body), 'POST', conversationHandler)
      return { ok: res.statusCode === 200, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    return modelResponse(reply)
  })
  assert.deepEqual(await respondToStudyMessage(course, lesson, {
    message: 'So the parent controls the name in my activity?', history: [exchange], activityContext,
  }), reply)
  const modelRequest = fetchMock.mock.calls.find(({ arguments: [url] }) => url === 'https://api.meta.ai/v1/responses')
  const { input } = JSON.parse(modelRequest.arguments[1].body)
  assert.ok(input.includes(JSON.stringify(learnerResponse)))
  assert.ok(input.includes(activity.instruction))
  assert.ok(input.includes(feedback.feedback))
  assert.ok(input.includes(exchange.message))
  assert.ok(!input.includes(activity.successCriteria))
  assert.ok(!input.includes(feedback.signal))
})

test('conversation rejects invalid optional activity context before contacting Meta', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({}))
  for (const context of [null, {}, { ...activityContext, learnerResponse: 'x'.repeat(601) },
    { ...activityContext, feedback: 'x'.repeat(901) },
    { ...activityContext, activity: { ...activity, topic: 'Other' } }]) {
    const res = await callHandler({
      courseName: course.name, lesson, message: 'Why?', activityContext: context,
    }, 'POST', conversationHandler)
    assert.equal(res.statusCode, 400)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('lesson-aware quiz requests work before and after an activity without changing mastery', async (t) => {
  const originalCourse = structuredClone(course)
  const originalLesson = structuredClone(lesson)
  const question = {
    topic: lesson.topic,
    question: 'Which component provides props to Greeting?',
    answers: [{ text: 'Its parent', correct: true }, { text: 'Greeting itself', correct: false }],
    explanation: 'The parent passes the name prop.',
  }
  const questionRequests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const request = JSON.parse(options.body)
    if (url === '/api/study-activity' || url === '/api/generate-study-question') {
      if (url === '/api/generate-study-question') questionRequests.push(request)
      const res = await callHandler(request, 'POST', url === '/api/study-activity' ? handler : questionHandler)
      return { ok: res.statusCode === 200, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    if (request.input.includes('Generate ONE small applied activity')) return modelResponse(activity)
    if (request.input.includes('Respond conversationally to what the learner actually did')) return modelResponse(feedback)
    return modelResponse(question)
  })
  assert.deepEqual(await generateStudyQuestion(course, 40, lesson), question)
  const generated = await generateStudyActivity(course, lesson, { history: [exchange] })
  assert.deepEqual(generated, activity)
  assert.deepEqual(course, originalCourse)
  assert.deepEqual(await evaluateStudyActivity(course, lesson, generated, learnerResponse, { history: [exchange] }), feedback)
  assert.deepEqual(course, originalCourse)
  assert.deepEqual(await generateStudyQuestion(course, 40, lesson), question)
  assert.deepEqual(questionRequests[0], questionRequests[1])
  assert.deepEqual(questionRequests[1].lesson, lesson)
  assert.deepEqual(course, originalCourse)
  assert.deepEqual(lesson, originalLesson)
})
