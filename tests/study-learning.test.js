import assert from 'node:assert/strict'
import { test } from 'node:test'
import lessonHandler from '../api/generate-study-lesson.js'
import questionHandler from '../api/generate-study-question.js'
import {
  generateStudyLesson,
  explainStudyLessonDifferently,
  generateStudyExample,
  generateStudyQuestion,
  evaluateStudyAnswer,
  recommendCourse,
} from '../src/services/meta.js'

const course = {
  name: 'Biology',
  nextTask: 'Review inheritance',
  importantTopics: ['Genotypes', 'Punnett squares'],
  upcomingWork: [{ title: 'Genetics quiz', date: '2026-10-28' }],
  mastery: { overall: 50, topics: { Genotypes: 20, 'Punnett squares': 80 } },
}
const lesson = {
  topic: 'Genotypes',
  concept: 'Two copies of a gene',
  content: 'You inherit one copy of a gene from each parent. Together they form your genotype.',
}
const courseContext = {
  courseName: course.name,
  nextTask: course.nextTask,
  importantTopics: course.importantTopics,
  upcomingWork: course.upcomingWork,
  mastery: 50,
  topicMastery: course.mastery.topics,
}
const question = {
  topic: lesson.topic,
  question: 'Where do your two gene copies come from?',
  answers: [{ text: 'One from each parent', correct: true }, { text: 'Both from one parent', correct: false }],
  explanation: 'Each parent contributes one copy.',
}

function mockModel(t, output, ok = true) {
  return t.mock.method(globalThis, 'fetch', async () => ({
    ok,
    status: ok ? 200 : 429,
    json: async () => ({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    }),
  }))
}

async function callHandler(handler, body, method = 'POST') {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
  }
  await handler({ method, body }, res)
  return res
}

test('initial lesson uses existing course/mastery context and one Meta request', async (t) => {
  const fetchMock = mockModel(t, lesson)
  const res = await callHandler(lessonHandler, { ...courseContext, action: 'lesson' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, lesson)
  assert.equal(fetchMock.mock.callCount(), 1)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, 'https://api.meta.ai/v1/responses')
  const request = JSON.parse(options.body)
  assert.equal(request.model, 'muse-spark-1.3')
  assert.ok(request.input.includes(JSON.stringify(course.mastery.topics)))
  assert.ok(request.input.includes(JSON.stringify(course.upcomingWork)))
  assert.match(request.input, /Prefer lower-mastery topics/)
  assert.match(request.input, /Reuse the exact existing topic name/)
})

test('courses without topic scores can get a lesson using course context', async (t) => {
  mockModel(t, { topic: 'Quadratic equations', concept: 'Roots', content: 'A root makes the equation equal zero.' })
  const res = await callHandler(lessonHandler, { courseName: 'Algebra', nextTask: 'Practice quadratic equations' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.topic, 'Quadratic equations')
})

test('I lost you requests a changed teaching approach with the current lesson and example', async (t) => {
  const fetchMock = mockModel(t, { ...lesson, content: 'Imagine getting one instruction card from each parent.' })
  const example = 'One parent gives A and the other gives a, producing Aa.'
  const res = await callHandler(lessonHandler, { ...courseContext, action: 'simplify', lesson, example })
  assert.equal(res.statusCode, 200)
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  assert.ok(input.includes(JSON.stringify(lesson)))
  assert.ok(input.includes(example))
  assert.match(input, /Change your teaching approach/)
  assert.match(input, /Do NOT simply repeat, paraphrase, or shorten/)
  assert.equal(res.body.topic, lesson.topic)
  assert.equal(res.body.concept, lesson.concept)
})

test('example requests stay on the concept and include the previous example', async (t) => {
  const fetchMock = mockModel(t, { ...lesson, content: 'A parent contributes B and the other b, giving Bb.' })
  const res = await callHandler(lessonHandler, { ...courseContext, action: 'example', lesson, example: 'Previous example' })
  assert.equal(res.statusCode, 200)
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  assert.match(input, /ONE concrete, worked example/)
  assert.match(input, /Previous example/)
  assert.match(input, /Do not add a quiz or another concept/)
})

test('invalid lesson requests fail before contacting Meta', async (t) => {
  const fetchMock = mockModel(t, lesson)
  assert.equal((await callHandler(lessonHandler, {}, 'GET')).statusCode, 405)
  for (const body of [undefined, {}, { courseName: 'Biology', action: 'unknown' },
    { ...courseContext, action: 'simplify' },
    { ...courseContext, action: 'example', lesson: { topic: 'Genotypes' } }]) {
    assert.equal((await callHandler(lessonHandler, body)).statusCode, 400)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('rejects empty, oversized, malformed or off-topic model output', async (t) => {
  for (const output of [null, {}, { ...lesson, content: '' },
    { ...lesson, content: 'x'.repeat(901) },
    { ...lesson, content: 'a '.repeat(101) },
    { ...lesson, topic: 'Different topic' },
    { ...lesson, concept: 'Different concept' }]) {
    const fetchMock = mockModel(t, output)
    const res = await callHandler(lessonHandler, { ...courseContext, action: 'simplify', lesson })
    assert.equal(res.statusCode, 502)
    assert.equal(res.body.error, 'Invalid study lesson response')
    fetchMock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [] }) }))
  assert.equal((await callHandler(lessonHandler, courseContext)).statusCode, 502)
})

test('provider failures preserve their HTTP status without exposing upstream details', async (t) => {
  for (const status of [401, 403, 429, 503]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
      ok: false,
      status,
      json: async () => ({ error: 'Private upstream details' }),
    }))
    const res = await callHandler(lessonHandler, courseContext)
    assert.equal(res.statusCode, status)
    assert.deepEqual(res.body, { error: 'Failed to generate study lesson' })
    fetchMock.mock.restore()
  }
})

test('network failures still return a generic 502 error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Private upstream details') })
  const res = await callHandler(lessonHandler, courseContext)
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'Failed to generate study lesson' })
})

test('lesson services send the right action and context without changing course state', async (t) => {
  const before = structuredClone(course)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => lesson }))
  assert.deepEqual(await generateStudyLesson(course, 50), lesson)
  await explainStudyLessonDifferently(course, lesson, 'An example')
  await generateStudyExample(course, lesson, 'An example')
  const bodies = fetchMock.mock.calls.map(({ arguments: [url, options] }) => {
    assert.equal(url, '/api/generate-study-lesson')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, undefined)
    return JSON.parse(options.body)
  })
  assert.deepEqual(bodies[0], { ...courseContext, action: 'lesson' })
  assert.deepEqual(bodies[1], { ...courseContext, action: 'simplify', lesson, example: 'An example' })
  assert.deepEqual(bodies[2], { ...courseContext, action: 'example', lesson, example: 'An example' })
  assert.deepEqual(course, before)
})

test('lesson service rejects HTTP failures so the UI can retry', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  await assert.rejects(generateStudyLesson(course, 50), /Failed to generate study lesson/)
  await assert.rejects(explainStudyLessonDifferently(course, lesson), /Failed to generate study lesson/)
  await assert.rejects(generateStudyExample(course, lesson), /Failed to generate study lesson/)
})

test('Quiz me adds lesson context; later question requests keep their original payload', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => question }))
  await generateStudyQuestion(course, 50, lesson)
  await generateStudyQuestion(course, 50)
  const bodies = fetchMock.mock.calls.map(({ arguments: [, options] }) => JSON.parse(options.body))
  assert.deepEqual(bodies[0], { ...courseContext, lesson })
  assert.deepEqual(bodies[1], courseContext)
})

test('question endpoint focuses the first quiz and preserves adaptive selection without a lesson', async (t) => {
  const fetchMock = mockModel(t, question)
  const focused = await callHandler(questionHandler, { ...courseContext, lesson })
  const adaptive = await callHandler(questionHandler, courseContext)
  assert.deepEqual(focused.body, question)
  assert.deepEqual(adaptive.body, question)
  const prompts = fetchMock.mock.calls.map(({ arguments: [, options] }) => JSON.parse(options.body).input)
  assert.ok(prompts[0].includes(JSON.stringify(lesson)))
  assert.match(prompts[0], /Test ONLY this lesson's concept/)
  assert.doesNotMatch(prompts[0], /Choose ONE relevant topic/)
  assert.match(prompts[1], /Choose ONE relevant topic/)
  assert.match(prompts[1], /Prefer topics with lower mastery/)
})

test('existing evaluation and recommendation services retain their request contracts', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({}) }))
  await evaluateStudyAnswer(course, question, question.answers[1], 50)
  await recommendCourse([course])
  const [evaluation, recommendation] = fetchMock.mock.calls.map(({ arguments: [url, options] }) => ({ url, body: JSON.parse(options.body) }))
  assert.equal(evaluation.url, '/api/evaluate-study-answer')
  assert.deepEqual(evaluation.body, {
    courseName: course.name,
    question: question.question,
    selectedAnswer: question.answers[1].text,
    correctAnswer: question.answers[0].text,
    importantTopics: course.importantTopics,
    mastery: 50,
  })
  assert.equal(recommendation.url, '/api/recommend-course')
  assert.deepEqual(recommendation.body, { courses: [course] })
})

test('a focused quiz cannot silently change topics; legacy questions can still omit a topic', async (t) => {
  const fetchMock = mockModel(t, { ...question, topic: 'Photosynthesis' })
  assert.equal((await callHandler(questionHandler, { ...courseContext, lesson })).statusCode, 502)
  fetchMock.mock.restore()
  const { topic: omittedTopic, ...legacyQuestion } = question
  assert.equal(omittedTopic, lesson.topic)
  mockModel(t, legacyQuestion)
  assert.equal((await callHandler(questionHandler, { ...courseContext, lesson })).statusCode, 502)
  assert.deepEqual((await callHandler(questionHandler, courseContext)).body, legacyQuestion)
})
