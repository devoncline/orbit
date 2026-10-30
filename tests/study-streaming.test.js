import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'
import handler from '../api/respond-to-study-message.js'
import { respondToStudyMessageStream } from '../src/services/meta.js'
import { generatedLessonVisual } from '../src/services/learningPath.js'

const course = { name: 'React', nextTask: 'Explore props', importantTopics: ['Props'], mastery: { overall: 40, topics: { Props: 20 } } }
const lesson = { topic: 'Props', concept: 'Inputs', content: 'A parent supplies inputs to a component.' }
const anchor = { type: 'analogy', topic: 'Props', summary: 'Connects props to function arguments.', confidence: 'high' }
const reply = { response: 'Yes, props supply **inputs** to a component.', signal: 'connection', anchor }
const visual = { type: 'diagram', purpose: 'Follow component inputs.', focus: '', data: [
  { label: 'Parent', detail: 'Supplies a value.' }, { label: 'Child', detail: 'Receives the value as a prop.' },
], links: [{ from: 0, to: 1, label: 'Passes a prop' }] }
const requestBody = { courseName: course.name, lesson, message: 'Like function arguments?', stream: true }
const encode = (text) => new TextEncoder().encode(text)
const sse = (event) => `event: ${event.type}\r\ndata: ${JSON.stringify(event)}\r\n\r\n`
const delta = (text) => ({ type: 'response.output_text.delta', item_id: 'message', output_index: 1, content_index: 0, delta: text })
const complete = (json) => ({ type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: json }] }] } })
const ndjson = (...events) => events.map((event) => JSON.stringify(event) + '\n').join('')

function controlledStream() {
  let writer
  let cancelled = false
  const body = new ReadableStream({ start(controller) { writer = controller }, cancel() { cancelled = true } })
  return { body, push(text) { writer.enqueue(typeof text === 'string' ? encode(text) : text) }, end() { writer.close() }, get cancelled() { return cancelled } }
}

function httpExchange(body = requestBody) {
  const req = Object.assign(new EventEmitter(), { method: 'POST', body })
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200, headers: {}, chunks: [], ended: false,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; this.ended = true; return this },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value },
    flushHeaders() { this.headersSent = true },
    write(text) { this.chunks.push(text); return true },
    end() { this.ended = true },
  })
  return { req, res, events: () => res.chunks.map((chunk) => JSON.parse(chunk)) }
}

test('route emits real deltas before completion, preserves context and only releases validated metadata at the end', async (t) => {
  const upstream = controlledStream()
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } }))
  const { req, res, events } = httpExchange({ ...requestBody, example: 'A greeting gets a name.', history: Array.from({ length: 7 }, (_, i) => ({ message: `Turn ${i}`, response: 'A reply.' })), learningAnchors: [anchor] })
  const pending = handler(req, res)
  upstream.push(': heartbeat\r\n\r\n' + sse({ type: 'response.reasoning_summary_text.delta', delta: 'PRIVATE_REASONING' }) + sse(delta('{"response":"Yes, props')))
  await setImmediate()
  assert.deepEqual(events(), [{ type: 'delta', text: 'Yes, props' }])
  assert.equal(res.ended, false)
  assert.equal(res.headers['content-type'], 'application/x-ndjson; charset=utf-8')
  assert.match(res.headers['cache-control'], /no-store/)
  const json = JSON.stringify(reply)
  upstream.push(sse(delta(json.slice('{"response":"Yes, props'.length))))
  await setImmediate()
  assert.equal(events().map((event) => event.text || '').join(''), reply.response)
  assert.ok(events().every((event) => event.type === 'delta'))
  upstream.push(sse(complete(json)))
  await pending
  assert.deepEqual(events().at(-1), { type: 'complete', ...reply })
  assert.equal(res.ended, true)
  assert.equal(upstream.cancelled, true)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, 'https://api.meta.ai/v1/responses')
  const sent = JSON.parse(options.body)
  assert.equal(sent.model, 'muse-spark-1.3')
  assert.equal(sent.stream, true)
  assert.equal(sent.store, false)
  assert.match(sent.input, /A greeting gets a name/)
  assert.match(sent.input, /Connects props to function arguments/)
  assert.match(sent.input, /Turn 3/)
  assert.doesNotMatch(sent.input, /Turn 2/)
  assert.doesNotMatch(res.chunks.join(''), /PRIVATE_REASONING|output_index|MODEL_API_KEY/)
  assert.equal(req.listenerCount('aborted'), 0)
  assert.equal(res.listenerCount('close'), 0)
})

test('JSON escapes, Unicode, CRLF and SSE frames survive single-byte network splits without leaking metadata', async (t) => {
  const result = { ...reply, response: '## Inputs\nA "name" is café 😀. A path: C:\\notes.' }
  const json = JSON.stringify(result).replace('😀', '\\ud83d\\ude00')
  const upstream = controlledStream()
  t.mock.method(globalThis, 'fetch', async () => new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } }))
  const { req, res, events } = httpExchange()
  const pending = handler(req, res)
  const payload = [...json].map((char) => sse(delta(char))).join('') + sse(complete(json))
  for (const byte of encode(payload)) upstream.push(new Uint8Array([byte]))
  await pending
  assert.equal(events().filter((event) => event.type === 'delta').map((event) => event.text).join(''), result.response)
  assert.deepEqual(events().at(-1), { type: 'complete', ...result })
  assert.doesNotMatch(events().filter((event) => event.type === 'delta').map((event) => event.text).join(''), /signal|anchor|confidence|\\ud83d/)
})

test('streaming API releases normalized native visuals only with validated completion, including reuse', async (t) => {
  for (const extra of [{ visual: { ...visual, url: 'PRIVATE_ASSET' } }, { reuseVisual: true }, { visual: { ...visual, data: [] } }]) {
    const upstream = controlledStream()
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } }))
    const { req, res, events } = httpExchange({ ...requestBody, lesson: { ...lesson, visual }, message: 'Show me a visual' })
    const pending = handler(req, res)
    const json = JSON.stringify({ ...reply, ...extra })
    upstream.push(sse(delta(json)))
    await setImmediate()
    assert.ok(events().every((event) => event.type === 'delta'))
    assert.equal(events().map((event) => event.text).join(''), reply.response)
    assert.doesNotMatch(res.chunks.join(''), /PRIVATE_ASSET|"visual"|"links"/)
    upstream.push(sse(complete(json)))
    await pending
    const expected = extra.reuseVisual ? generatedLessonVisual(visual) : generatedLessonVisual(extra.visual)
    assert.deepEqual(events().at(-1), { type: 'complete', ...reply, ...(expected ? { visual: expected } : {}) })
    assert.equal(mock.mock.callCount(), 1)
    mock.mock.restore()
  }
})

test('streaming client retains valid visuals, drops invalid visuals, and leaves text-only replies unchanged', async (t) => {
  for (const value of [visual, undefined, { type: 'none' }, { ...visual, type: 'generated_image' }, { ...visual, data: [] }, { ...visual, links: [null] }]) {
    const payload = ndjson({ type: 'delta', text: reply.response }, { type: 'complete', ...reply, visual: value })
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(payload, { headers: { 'Content-Type': 'application/x-ndjson' } }))
    const deltas = []
    const result = await respondToStudyMessageStream(course, lesson, { message: 'Show me a visual', currentVisual: visual, onDelta: (text) => deltas.push(text) })
    const expected = generatedLessonVisual(value)
    assert.deepEqual(result, { ...reply, ...(expected ? { visual: expected } : {}) })
    assert.deepEqual(deltas, [reply.response])
    assert.deepEqual(JSON.parse(mock.mock.calls[0].arguments[1].body).currentVisual, generatedLessonVisual(visual))
    mock.mock.restore()
  }
})

test('completion framing fits a maximum reused visual with JSON escapes without relaxing field bounds', async (t) => {
  const large = { ...visual, purpose: '\u0001'.repeat(240), focus: '\u0001'.repeat(120),
    data: Array.from({ length: 6 }, (_, index) => ({ label: `${index}${'\u0001'.repeat(119)}`, detail: '\u0001'.repeat(240) })),
    links: Array.from({ length: 8 }, (_, index) => ({ from: index % 6, to: (index + 1) % 6, label: '\u0001'.repeat(120) })) }
  const finalReply = { response: '\u0001'.repeat(900), signal: 'neutral', visual: large }
  const normalized = generatedLessonVisual(large)
  const payload = ndjson({ type: 'delta', text: finalReply.response }, { type: 'complete', ...finalReply })
  assert.ok(JSON.stringify({ type: 'complete', ...finalReply }).length > 16384)
  t.mock.method(globalThis, 'fetch', async () => new Response(payload, { headers: { 'Content-Type': 'application/x-ndjson' } }))
  const result = await respondToStudyMessageStream(course, lesson, { message: 'Show me a visual' })
  assert.deepEqual(result, { ...finalReply, visual: normalized })
})

test('provider failures, truncation and invalid final replies never emit a completion or provider error details', async (t) => {
  const valid = JSON.stringify(reply)
  const cases = [
    sse(delta('{"response":"Partial')) + sse({ type: 'response.failed', response: { error: { message: 'PRIVATE_DETAIL' } } }),
    sse(delta('{"response":"Partial')) + sse({ type: 'response.incomplete' }),
    sse(delta('{"response":"Partial')) + 'data: [DONE]\n\n',
    sse(delta('{"response":"Partial')),
    'data: not-json\n\n',
    sse(delta(valid)) + sse(complete(JSON.stringify({ ...reply, response: 'Different' }))),
    sse(delta(JSON.stringify({ response: 'a '.repeat(101) }))) + sse(complete(JSON.stringify({ response: 'a '.repeat(101) }))),
    sse(delta('{"response":"' + 'a'.repeat(901))),
    sse(delta(valid)) + sse(complete(valid.slice(0, -1))),
  ]
  for (const payload of cases) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(payload, { headers: { 'Content-Type': 'text/event-stream' } }))
    const { req, res, events } = httpExchange()
    await handler(req, res)
    assert.equal(events().at(-1).type, 'error')
    assert.ok(events().every((event) => event.type !== 'complete'))
    assert.doesNotMatch(res.chunks.join(''), /PRIVATE_DETAIL/)
    mock.mock.restore()
  }
})

test('streaming still validates requests, preserves HTTP failures and drops untrusted anchor metadata', async (t) => {
  let mock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 429 }))
  let exchange = httpExchange({ ...requestBody, message: '' })
  await handler(exchange.req, exchange.res)
  assert.equal(exchange.res.statusCode, 400)
  assert.equal(mock.mock.callCount(), 0)
  exchange = httpExchange()
  await handler(exchange.req, exchange.res)
  assert.equal(exchange.res.statusCode, 429)
  assert.deepEqual(exchange.res.body, { error: 'Failed to respond to study message' })
  mock.mock.restore()
  const invalidAnchor = JSON.stringify({ ...reply, signal: 'unknown', anchor: { ...anchor, topic: 'Unrelated' }, mastery: 100 })
  t.mock.method(globalThis, 'fetch', async () => new Response(sse(delta(invalidAnchor)) + sse(complete(invalidAnchor)), { headers: { 'Content-Type': 'text/event-stream' } }))
  exchange = httpExchange()
  await handler(exchange.req, exchange.res)
  assert.deepEqual(exchange.events().at(-1), { type: 'complete', response: reply.response, signal: 'neutral' })
})

test('client disconnect aborts the pending Meta request, cancels its reader and removes listeners', async (t) => {
  for (const target of ['aborted', 'close']) {
    const upstream = controlledStream()
    let upstreamSignal
    const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
      upstreamSignal = options.signal
      return new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } })
    })
    const { req, res, events } = httpExchange()
    const pending = handler(req, res)
    upstream.push(sse(delta('{"response":"Partial')))
    await setImmediate()
    if (target === 'aborted') req.emit('aborted')
    else res.emit('close')
    await pending
    assert.equal(upstreamSignal.aborted, true)
    assert.equal(upstream.cancelled, true)
    assert.ok(events().every((event) => event.type === 'delta'))
    assert.equal(req.listenerCount('aborted'), 0)
    assert.equal(res.listenerCount('close'), 0)
    mock.mock.restore()
  }
})

test('frontend streams multiple deltas immediately, combines split UTF-8/NDJSON, and returns only final metadata', async (t) => {
  const stream = controlledStream()
  const deltas = []
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response(stream.body, { headers: { 'Content-Type': 'application/x-ndjson' } }))
  const result = { ...reply, response: 'Café 😀 supplies inputs.' }
  const controller = new AbortController()
  const pending = respondToStudyMessageStream(course, lesson, { message: requestBody.message, anchors: [anchor], history: Array.from({ length: 6 }, (_, i) => ({ message: `Turn ${i}`, response: 'Reply', signal: 'neutral' })), signal: controller.signal, onDelta: (text) => deltas.push(text) })
  const first = encode(ndjson({ type: 'delta', text: 'Café 😀' }))
  for (const byte of first) stream.push(new Uint8Array([byte]))
  await setImmediate()
  assert.deepEqual(deltas, ['Café 😀'])
  stream.push(ndjson({ type: 'delta', text: ' supplies inputs.' }, { type: 'complete', ...result, unexpected: 'PRIVATE_DETAIL' }))
  assert.deepEqual(await pending, result)
  assert.equal(deltas.join(''), result.response)
  assert.equal(stream.cancelled, true)
  const [url, options] = mock.mock.calls[0].arguments
  assert.equal(url, '/api/respond-to-study-message')
  assert.equal(options.signal, controller.signal)
  assert.equal(options.headers.Authorization, undefined)
  const body = JSON.parse(options.body)
  assert.equal(body.stream, true)
  assert.equal(body.history.length, 4)
  assert.ok(body.history.every((exchange) => !exchange.signal))
  assert.deepEqual(body.learningAnchors, [anchor])
})

test('frontend rejects malformed, oversized, failed and unfinished streams with safe errors', async (t) => {
  for (const payload of [
    'not-json\n', ndjson({ type: 'delta', text: {} }), ndjson({ type: 'delta', text: 'a'.repeat(901) }),
    ndjson({ type: 'delta', text: 'Partial' }), ndjson({ type: 'error', error: 'PRIVATE_DETAIL' }),
    ndjson({ type: 'unknown' }), ndjson({ type: 'complete', ...reply }),
    ndjson({ type: 'delta', text: reply.response }, { type: 'complete', ...reply, signal: {} }),
    'x'.repeat(8193),
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(payload, { headers: { 'Content-Type': 'application/x-ndjson' } }))
    await assert.rejects(respondToStudyMessageStream(course, lesson, { message: requestBody.message }), { message: 'The reply was interrupted. Please try again.' })
    mock.mock.restore()
  }
})

test('frontend AbortSignal stops a stalled reader without requiring another chunk', async (t) => {
  const stream = controlledStream()
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted()
    return new Response(stream.body, { headers: { 'Content-Type': 'application/x-ndjson' } })
  })
  const controller = new AbortController()
  const deltas = []
  const pending = respondToStudyMessageStream(course, lesson, { message: requestBody.message, signal: controller.signal, onDelta: (text) => deltas.push(text) })
  stream.push(ndjson({ type: 'delta', text: 'Partial' }))
  await setImmediate()
  assert.deepEqual(deltas, ['Partial'])
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(stream.cancelled, true)
  await assert.rejects(respondToStudyMessageStream(course, lesson, { message: requestBody.message, signal: controller.signal }), { name: 'AbortError' })
})
