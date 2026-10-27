import assert from 'node:assert/strict'
import { coursePositionRequest } from '../src/services/coursePosition.js'
import { test } from 'node:test'
import handler from '../api/respond-to-study-message.js'
import { respondToStudyMessage } from '../src/services/meta.js'
import { retainStudyExchanges } from '../src/services/studyConversation.js'

const course = {
  name: 'React',
  nextTask: 'Understand props',
  importantTopics: ['Props'],
  upcomingWork: [],
  mastery: { overall: 40, topics: { Props: 20 } },
}
const lesson = {
  topic: 'Props',
  concept: 'Passing information to a component',
  content: 'Props let a React component receive information from another component.',
}
const exchange = {
  message: 'Are props like function arguments?',
  response: 'Both provide inputs. Props are the inputs passed to a component when it renders.',
  signal: 'connection',
}
const body = {
  courseName: course.name,
  nextTask: course.nextTask,
  importantTopics: course.importantTopics,
  upcomingWork: course.upcomingWork,
  mastery: course.mastery.overall,
  topicMastery: course.mastery.topics,
  lesson,
  example: 'A greeting component receives a name prop.',
  history: [exchange],
  message: 'What if that input changes?',
}
const reply = {
  response: 'When the parent passes a different name, React renders the greeting with that new name.',
  signal: 'curiosity',
}

async function callHandler(requestBody = body, method = 'POST') {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  }
  await handler({ method, body: requestBody }, res)
  return res
}

function modelResponse(value) {
  return {
    ok: true,
    json: async () => ({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    }),
  }
}

test('responds using the learner message, current lesson, example and recent exchanges', async (t) => {
  const before = structuredClone(body)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(reply))
  const res = await callHandler()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, reply)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, 'https://api.meta.ai/v1/responses')
  const request = JSON.parse(options.body)
  assert.equal(request.model, 'muse-spark-1.3')
  for (const context of [body.courseName, body.message, lesson.topic, lesson.concept,
    lesson.content, body.example, exchange.message, exchange.response]) {
    assert.ok(request.input.includes(context))
  }
  assert.match(request.input, /Answer the learner's actual message first/)
  assert.match(request.input, /change your teaching approach/)
  assert.match(request.input, /Do not force a quiz/)
  assert.match(request.input, /closely related concept only when the question needs it/)
  assert.deepEqual(body, before)
})

test('conversation state keeps only the last four complete exchanges without mutating prior state', () => {
  let history = []
  for (let turn = 1; turn <= 12; turn += 1) {
    const previous = history
    const snapshot = structuredClone(previous)
    history = retainStudyExchanges([...history, { ...exchange, message: `Question ${turn}` }])
    assert.deepEqual(previous, snapshot)
    assert.ok(history.length <= 4)
  }
  assert.deepEqual(history.map((item) => item.message), ['Question 9', 'Question 10', 'Question 11', 'Question 12'])
  assert.ok(history.every((item) => item.response && item.signal === 'connection'))
})

test('server limits history even if a client submits extra exchanges', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(reply))
  const history = Array.from({ length: 8 }, (_, index) => ({ ...exchange, message: `Turn ${index}` }))
  const res = await callHandler({ ...body, history })
  assert.equal(res.statusCode, 200)
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  for (let index = 0; index < 8; index += 1) {
    assert.equal(input.includes(`Turn ${index}`), index >= 4)
  }
  assert.equal(history.length, 8)
})

test('rejects invalid messages, lesson context and retained exchanges before contacting Meta', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(reply))
  assert.equal((await callHandler(body, 'GET')).statusCode, 405)
  for (const invalid of [null, {}, { ...body, message: '   ' }, { ...body, message: 2 },
    { ...body, message: 'x'.repeat(601) }, { ...body, lesson: null },
    { ...body, lesson: { ...lesson, topic: '' } }, { ...body, lesson: { ...lesson, content: 'x'.repeat(901) } },
    { ...body, example: 'x'.repeat(901) }, { ...body, history: {} },
    { ...body, history: [null] }, { ...body, history: [{ message: 'Question' }] },
    { ...body, history: [{ ...exchange, response: 'x'.repeat(901) }] }]) {
    assert.equal((await callHandler(invalid)).statusCode, 400)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('accepts an initial message without history or an example', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => modelResponse(reply))
  const res = await callHandler({ courseName: 'React', lesson, message: 'Why use props?' })
  assert.deepEqual(res.body, reply)
})

test('accepts lightweight signals and returns no model-provided topic or mastery changes', async (t) => {
  for (const signal of ['connection', 'confusion', 'curiosity', 'understanding', 'neutral']) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...reply, signal, mastery: 100, topic: 'New topic' }))
    assert.deepEqual((await callHandler()).body, { ...reply, signal })
    fetchMock.mock.restore()
  }
})

test('missing or unrecognized signals fall back to neutral', async (t) => {
  for (const signal of [undefined, 'ready', { unexpected: true }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...reply, signal }))
    assert.deepEqual((await callHandler()).body, { ...reply, signal: 'neutral' })
    fetchMock.mock.restore()
  }
})

test('rejects empty, oversized or malformed replies instead of showing text walls', async (t) => {
  for (const result of [null, {}, { response: '' }, { response: 3 },
    { response: 'x'.repeat(901) }, { response: 'a '.repeat(101) }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(result))
    assert.equal((await callHandler()).statusCode, 502)
    fetchMock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }] }),
  }))
  assert.equal((await callHandler()).statusCode, 502)
})

test('preserves provider error statuses without exposing private error details', async (t) => {
  for (const status of [401, 403, 429, 503]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
      ok: false, status, json: async () => ({ error: 'Private provider details' }),
    }))
    const res = await callHandler()
    assert.equal(res.statusCode, status)
    assert.deepEqual(res.body, { error: 'Failed to respond to study message' })
    fetchMock.mock.restore()
  }
})

test('handles network or missing model output as recoverable errors', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Private network details') })
  assert.deepEqual((await callHandler()).body, { error: 'Failed to respond to study message' })
  fetchMock.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [] }) }))
  assert.equal((await callHandler()).statusCode, 502)
})

test('service sends bounded context and supports cancellation without transmitting internal signals', async (t) => {
  const controller = new AbortController()
  const history = Array.from({ length: 7 }, (_, index) => ({ ...exchange, message: `Turn ${index}` }))
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => reply }))
  const result = await respondToStudyMessage(course, lesson, {
    message: body.message, history, example: body.example, signal: controller.signal,
  })
  assert.deepEqual(result, reply)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/respond-to-study-message')
  assert.equal(options.method, 'POST')
  assert.equal(options.signal, controller.signal)
  assert.equal(options.headers.Authorization, undefined)
  const payload = JSON.parse(options.body)
  assert.deepEqual(payload, {
    ...body,
    ...coursePositionRequest(course),
    history: history.slice(-4).map(({ message, response }) => ({ message, response })),
  })
  assert.equal(history.length, 7)
})

test('service rejects failed or aborted requests so they are not added to history', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  await assert.rejects(respondToStudyMessage(course, lesson, { message: body.message }), /Failed to respond/)
  fetchMock.mock.restore()
  const controller = new AbortController()
  controller.abort()
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted()
  })
  await assert.rejects(respondToStudyMessage(course, lesson, { message: body.message, signal: controller.signal }), { name: 'AbortError' })
})

test('successive service-to-handler exchanges preserve the topic and keep context bounded', async (t) => {
  const originalCourse = structuredClone(course)
  const originalLesson = structuredClone(lesson)
  const requestHistories = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/respond-to-study-message') {
      const request = JSON.parse(options.body)
      requestHistories.push(request.history)
      const res = await callHandler(request)
      return { ok: res.statusCode === 200, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    return modelResponse(reply)
  })
  let history = []
  for (let turn = 1; turn <= 9; turn += 1) {
    const message = `Follow-up ${turn}`
    const result = await respondToStudyMessage(course, lesson, { message, history })
    history = retainStudyExchanges([...history, { message, ...result }])
  }
  assert.deepEqual(requestHistories.map((items) => items.length), [0, 1, 2, 3, 4, 4, 4, 4, 4])
  assert.equal(requestHistories.at(-1)[0].message, 'Follow-up 5')
  assert.equal(history[0].message, 'Follow-up 6')
  assert.deepEqual(course, originalCourse)
  assert.deepEqual(lesson, originalLesson)
})
