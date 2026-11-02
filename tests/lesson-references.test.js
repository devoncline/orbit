import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Buffer } from 'node:buffer'
import { MAX_REFERENCE_BYTES, materialReferenceKey, normalizeLessonReferences, referenceValidationError, resolveLessonReferences } from '../src/services/lessonReferences.js'
import { lessonReferenceInput } from '../api/_lib/lessonReferenceInput.js'
import { compactThreadResume } from '../src/services/learnerMemory.js'
import * as client from '../src/services/meta.js'
import lessonHandler from '../api/generate-study-lesson.js'
import conversationHandler from '../api/respond-to-study-message.js'
import activityHandler from '../api/study-activity.js'
import questionHandler from '../api/generate-study-question.js'
import evaluationHandler from '../api/evaluate-study-answer.js'

const data = (type, bytes) => `data:${type};base64,${Buffer.from(bytes, 'binary').toString('base64')}`
const pdf = { name: 'worksheet.pdf', type: 'application/pdf', source: 'upload', data: data('application/pdf', '%PDF-1.4 fixture') }
const png = { name: 'work.png', type: 'image/png', source: 'upload', data: data('image/png', '\x89PNG\r\n\x1a\nfixture') }

test('reference validation bounds types, actual bytes, total size and count, ignoring malformed entries safely', () => {
  assert.equal(referenceValidationError({ ...png, size: MAX_REFERENCE_BYTES + 1 }).includes('3 MB'), true)
  assert.match(referenceValidationError({ ...pdf, size: 100 }, MAX_REFERENCE_BYTES), /combined|total/)
  assert.match(referenceValidationError({ name: 'work.heic', type: 'image/heic', size: 20 }), /Export/)
  const invalid = [null, {}, { ...pdf, type: [] }, { ...pdf, data: {} }, { ...pdf, data: 'https://private.test/file' },
    { ...pdf, data: data('application/pdf', 'not pdf') }, { ...png, data: pdf.data }, { ...pdf, data: pdf.data + '=' },
    { ...pdf, data: 'data:application/pdf;base64,====' }, { ...pdf, data: 'x'.repeat(MAX_REFERENCE_BYTES * 2) }]
  for (const item of invalid) assert.deepEqual(normalizeLessonReferences([item, png]), normalizeLessonReferences([png]))
  for (const value of [null, {}, 'bad']) assert.deepEqual(normalizeLessonReferences(value), [])
  assert.equal(normalizeLessonReferences(Array(10).fill(pdf)).length, 4)
  const big = { ...pdf, data: data(pdf.type, '%PDF-' + 'x'.repeat(MAX_REFERENCE_BYTES - 5)) }
  assert.equal(normalizeLessonReferences([big, png]).length, 1)
  for (const [name, type, bytes] of [['photo.jpg', 'image/jpeg', '\xff\xd8\xfffixture'], ['page.webp', 'image/webp', 'RIFF1234WEBPfixture']]) {
    assert.equal(normalizeLessonReferences([{ name, type, source: 'upload', data: data(type, bytes) }]).length, 1)
  }
})

test('course pointers resolve current summary and removing one leaves the original untouched', () => {
  const files = [{ name: 'notes.pdf', type: 'application/pdf', size: 10, summary: 'Props pass inputs.' }]
  const before = structuredClone(files)
  const pointer = { id: 'course-one', source: 'course', materialKey: materialReferenceKey(files[0]) }
  assert.equal(resolveLessonReferences([pointer], files)[0].summary, files[0].summary)
  assert.equal(resolveLessonReferences([pointer], [{ ...files[0], summary: 'Updated context.' }])[0].summary, 'Updated context.')
  assert.deepEqual(resolveLessonReferences([], files), [])
  assert.deepEqual(resolveLessonReferences([pointer], []), [])
  assert.deepEqual(files, before)
  assert.doesNotMatch(JSON.stringify(pointer), /summary|Props/)
  assert.doesNotMatch(JSON.stringify(compactThreadResume({ lessonReferences: [pdf, pointer] })), /worksheet|file_data|JVBER/)
})

test('structured model input separates teaching rules, originals and summary-only context', () => {
  const input = lessonReferenceInput('Existing lesson prompt', [png, pdf, { name: 'notes.pdf', type: pdf.type, source: 'course', summary: 'Saved concepts' }])
  assert.equal(input[0].role, 'developer')
  assert.match(input[0].content[0].text, /untrusted reference data/)
  assert.match(input[0].content[0].text, /never produce an answer key/)
  assert.equal(input[1].content[1].image_url, png.data)
  assert.equal(input[1].content[3].file_data, pdf.data)
  assert.match(input[1].content[4].text, /saved summary only/)
  assert.equal(lessonReferenceInput('unchanged', []), 'unchanged')
  assert.equal(lessonReferenceInput('unchanged', [null, { data: 'bad' }]), 'unchanged')
})

const course = { name: 'React', mastery: { overall: 40, topics: { State: 40 } }, learnerPosition: { currentTopic: 'State' } }
const lesson = { topic: 'State', concept: 'Remembering a value', content: 'State stores a value between renders.' }
const question = { topic: 'State', question: 'Where is the count stored?', answers: [{ text: 'State', correct: true }, { text: 'Text', correct: false }], explanation: 'State stores it.' }
const activity = { title: 'Predict a count', instruction: 'What follows a count update?', topic: 'State', activityType: 'predict', successCriteria: 'State changes before the screen.' }
const routes = { '/api/generate-study-lesson': lessonHandler, '/api/respond-to-study-message': conversationHandler, '/api/study-activity': activityHandler, '/api/generate-study-question': questionHandler, '/api/evaluate-study-answer': evaluationHandler }
const outputFor = (route, body) => route === '/api/generate-study-lesson' ? lesson
  : route === '/api/respond-to-study-message' ? { response: 'Consider where the value is kept. What would you try?', signal: 'neutral' }
    : route === '/api/study-activity' ? body.action === 'generate' ? activity : { feedback: 'State stores the value.', signal: 'applied_understanding' }
      : route === '/api/generate-study-question' ? question
        : { feedback: 'Text is the output.', adaptedExplanation: 'State is memory.', followUpQuestion: 'What remembers a count?', followUpAnswers: question.answers }

for (const withReferences of [false, true]) test(`all existing teaching clients and handlers work ${withReferences ? 'with' : 'without'} references`, async t => {
  const requests = [], provider = []
  let route, request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    if (routes[url]) {
      route = url; request = body; requests.push(body)
      const chunks = [], headers = {}
      const res = { code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body; return this },
        setHeader(name, value) { headers[name] = value }, flushHeaders() {}, write(chunk) { chunks.push(chunk) }, end() {} }
      await routes[url]({ method: 'POST', body }, res)
      assert.equal(res.code, 200)
      return new Response(body.stream ? chunks.join('') : JSON.stringify(res.body), { headers: body.stream ? headers : { 'Content-Type': 'application/json' } })
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    provider.push(body)
    const text = JSON.stringify(outputFor(route, request))
    const output = [{ type: 'message', content: [{ type: 'output_text', text }] }]
    return body.stream ? new Response([
      { type: 'response.output_text.delta', delta: text },
      { type: 'response.completed', response: { status: 'completed', output } },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } })
      : new Response(JSON.stringify({ output }))
  })
  const options = withReferences ? { lessonReferences: [pdf, png] } : {}
  await client.explainStudyLessonDifferently(course, lesson, '', options)
  await client.generateStudyExample(course, lesson, '', options)
  await client.respondToStudyMessage(course, lesson, { ...options, message: 'I do not understand question 3.' })
  await client.respondToStudyMessageStream(course, lesson, { ...options, message: 'What did I do wrong?' })
  await client.generateStudyActivity(course, lesson, options)
  await client.evaluateStudyActivity(course, lesson, activity, 'State remembers it.', options)
  await client.generateStudyQuestion(course, 40, lesson, options)
  await client.evaluateStudyAnswer(course, question, question.answers[1], 40, options)
  assert.equal(requests.length, 8)
  for (const body of requests) assert.equal(Boolean(body.lessonReferences), withReferences)
  for (const body of provider) {
    assert.equal(Array.isArray(body.input), withReferences)
    if (withReferences) {
      assert.equal(body.store, false)
      assert.equal(body.input[1].content[1].file_data, pdf.data)
      assert.equal(body.input[1].content[3].image_url, png.data)
      assert.match(body.input[0].content[0].text, /React/)
      assert.match(body.input[0].content[0].text, /State/)
    }
  }
})
