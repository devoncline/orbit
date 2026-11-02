import assert from 'node:assert/strict'
import process from 'node:process'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { createDemoRateLimiter, DEMO_AI_ACTION_LIMIT, DEMO_AI_ACTION_WINDOW_HOURS, DEMO_GLOBAL_AI_ACTION_LIMIT, DEMO_GLOBAL_AI_ACTION_WINDOW_HOURS } from '../api/_lib/demoRateLimit.js'
import { MODEL_OUTPUT_TOKENS } from '../api/_lib/modelLimits.js'
import lessonHandler from '../api/generate-study-lesson.js'
import questionHandler from '../api/generate-study-question.js'
import answerHandler from '../api/evaluate-study-answer.js'
import conversationHandler from '../api/respond-to-study-message.js'
import activityHandler from '../api/study-activity.js'
import analyzeHandler from '../api/analyze-course.js'
import recommendHandler from '../api/recommend-course.js'
import imageHandler from '../api/generate-lesson-image.js'
import { fakeDemoStore, demoEnv, demoRequest, demoResponse } from './fixtures/demoStore.js'

const lesson = { topic: 'State', concept: 'Remembering', content: 'State remembers values between renders.' }
const visual = { type: 'generated_image', composition: 'process', purpose: 'Follow a state update.', focus: 'State',
  data: [{ label: 'State', detail: 'Remembers a value.' }, { label: 'Render', detail: 'Shows the value.' }], links: [{ from: 0, to: 1, label: 'Updates' }] }
const context = { courseName: 'React', lesson, visual }
const activity = { title: 'Predict', instruction: 'Predict the next count.', topic: 'State', activityType: 'predict', successCriteria: 'Recognizes the update.' }
const reply = { response: 'State remembers the value.', signal: 'neutral' }
const routes = [
  ['generate-study-lesson', lessonHandler, { courseName: 'React' }, lesson, 'lesson'],
  ['generate-study-question', questionHandler, context, { topic: 'State', question: 'What remembers?', answers: [] }, 'question'],
  ['evaluate-study-answer', answerHandler, { courseName: 'React', question: 'What remembers?', selectedAnswer: 'Screen', correctAnswer: 'State' }, { feedback: 'State remembers.' }, 'evaluateAnswer'],
  ['respond-to-study-message', conversationHandler, { ...context, message: 'Why?' }, reply, 'conversation'],
  ['study-activity', activityHandler, { ...context, action: 'generate' }, activity, 'activity'],
  ['analyze-course', analyzeHandler, { fileName: 'course.pdf', fileData: 'data:application/pdf;base64,JVBERi1maXh0dXJl' }, { courseName: 'React' }, 'analyzeCourse'],
  ['recommend-course', recommendHandler, { courses: [{ name: 'React' }] }, { courseName: 'React' }, 'recommendCourse'],
  ['generate-lesson-image', imageHandler, context, { data: [{ url: 'https://images.example.test/image.webp' }] }],
]
const output = (result) => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }))

function setEnv(t, values) {
  const saved = new Map(Object.keys(values).map(key => [key, process.env[key]]))
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  t.after(() => { for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value } })
}
async function exhaust(enforce, req = demoRequest(), count = 25) {
  for (let i = 0; i < count; i++) assert.equal((await enforce(req, demoResponse())).allowed, true)
}
async function fillGlobal(enforce, count = 750, offset = 0) {
  for (let i = offset; i < offset + count; i++) {
    assert.equal((await enforce(demoRequest({}, `198.51.100.${Math.floor(i / 25) + 1}`), demoResponse())).allowed, true)
  }
}
function setup(t) {
  const env = demoEnv(), store = fakeDemoStore()
  setEnv(t, env)
  return { env, store, enforce: createDemoRateLimiter({ env, fetch: store.fetch }) }
}

test('25 actions share one six-hour window: final request allowed, next blocked, denials do not extend expiry', async () => {
  assert.equal(DEMO_AI_ACTION_LIMIT, 25)
  assert.equal(DEMO_AI_ACTION_WINDOW_HOURS, 6)
  const store = fakeDemoStore(), enforce = createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch })
  await exhaust(enforce, demoRequest(), 24)
  assert.equal((await enforce(demoRequest(), demoResponse())).allowed, true)
  const res = demoResponse()
  assert.equal((await enforce(demoRequest(), res)).allowed, false)
  assert.equal(res.code, 429)
  assert.equal(res.body.error, 'demo_limit_reached')
  assert.equal(res.headers['retry-after'], '21600')
  store.advance(21599)
  const nearExpiry = demoResponse()
  await enforce(demoRequest(), nearExpiry)
  assert.equal(nearExpiry.body.retryAfterSeconds, 1)
  store.advance(1)
  assert.equal((await enforce(demoRequest(), demoResponse())).allowed, true)
})

test('concurrent requests on independent instances cannot exceed the shared allowance', async () => {
  const store = fakeDemoStore()
  const instances = Array.from({ length: 5 }, () => createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch }))
  const results = await Promise.all(Array.from({ length: 60 }, (_, i) => instances[i % 5](demoRequest(), demoResponse())))
  assert.equal(results.filter(result => result.allowed).length, 25)
})

test('visitor keys are private, independent of route/host and generic spoofed headers; IPv6 is canonical', async () => {
  const store = fakeDemoStore(), enforce = createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch })
  await exhaust(enforce)
  const req = demoRequest({ visitorId: 'new-user', automatic: true })
  req.headers['x-forwarded-for'] = '198.51.100.100'
  req.headers.host = 'different-alias.example.test'
  assert.equal((await enforce(req, demoResponse())).allowed, false)
  assert.equal((await enforce(demoRequest({}, '192.0.2.9'), demoResponse())).allowed, true)
  await exhaust(enforce, demoRequest({}, '2001:db8::1'))
  assert.equal((await enforce(demoRequest({}, '2001:0db8:0000:0000:0000:0000:0000:0001'), demoResponse())).allowed, false)
  assert.doesNotMatch(JSON.stringify([...store.entries.keys()]), /192\.0\.2|2001:|new-user|fake-test-secret/)
})

test('only explicit local dev/test bypasses; deployed production and previews stay protected', async () => {
  for (const NODE_ENV of ['development', 'test']) {
    const env = { MODEL_API_KEY: 'fake', NODE_ENV }
    const enforce = createDemoRateLimiter({ env, fetch: () => assert.fail('Local development must not touch production counters') })
    await exhaust(enforce, { body: {} }, 30)
    for (const VERCEL_ENV of ['production', 'preview', 'custom']) {
      const res = demoResponse()
      await createDemoRateLimiter({ env: { ...env, VERCEL: '1', VERCEL_ENV } })(demoRequest(), res)
      assert.equal(res.code, 503)
    }
  }
  const env = { MODEL_API_KEY: 'fake' }, res = demoResponse()
  await createDemoRateLimiter({ env })(demoRequest(), res)
  assert.equal(res.code, 503, 'Unknown environment must fail closed')
})

test('store errors, malformed results, missing secrets/IP and missing model key fail closed without leaks', async () => {
  const cases = [
    { env: { UPSTASH_REDIS_REST_TOKEN: '' } }, { env: { UPSTASH_REDIS_REST_URL: 'http://redis.example.test' } },
    { env: { DEMO_RATE_LIMIT_SECRET: '' } }, { env: { MODEL_API_KEY: '' } }, { req: { headers: { 'x-forwarded-for': '192.0.2.1' } } },
    { fetch: async () => { throw new Error('PRIVATE_STACK') } },
    { fetch: async () => new Response(JSON.stringify({ error: 'PRIVATE_KEY' })) },
    { fetch: async () => new Response(JSON.stringify({ result: [1, 'invalid'] })) },
    { fetch: async () => new Response('unavailable', { status: 503 }) },
  ]
  for (const scenario of cases) {
    const res = demoResponse()
    await createDemoRateLimiter({ env: { ...demoEnv(), ...scenario.env }, fetch: scenario.fetch || (() => assert.fail('Must reject before store')) })(scenario.req || demoRequest(), res)
    assert.equal(res.code, 503)
    assert.equal(res.body.error, 'demo_temporarily_unavailable')
    assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE|192\.|fake|redis|stack/i)
  }
})

for (const [name, handler, body, result, ceiling] of routes) {
  test(`${name}: paid request below allowance reaches provider with bounded output; exhausted request never does`, async (t) => {
    const { store, enforce } = setup(t)
    const providerRequests = []
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (url.startsWith('https://redis.example.test')) return store.fetch(url, options)
      providerRequests.push(JSON.parse(options.body))
      return ceiling ? output(result) : new Response(JSON.stringify(result))
    })
    const allowed = demoResponse()
    await handler(demoRequest(body), allowed)
    assert.equal(allowed.code, 200)
    assert.equal(providerRequests.length, 1)
    assert.equal(store.globalCount(), 1, 'A standalone paid action spends both allowances once')
    if (ceiling) assert.equal(providerRequests[0].max_output_tokens, MODEL_OUTPUT_TOKENS[ceiling])
    else { assert.equal(providerRequests[0].n, 1); assert.equal(providerRequests[0].size, '1536x1024') }
    await exhaust(enforce, demoRequest(), 24)
    const blocked = demoResponse()
    await handler(demoRequest(body), blocked)
    assert.equal(blocked.code, 429)
    assert.equal(blocked.body.error, 'demo_limit_reached')
    assert.equal(providerRequests.length, 1)
    assert.equal(store.globalCount(), 25, 'Visitor rejection must not spend a global action')
    assert.doesNotMatch(JSON.stringify(blocked.body), /192\.|fake-|Bearer|stack|redis/)
  })
}

test('simplification, examples, next lessons, activity feedback and streaming all block before provider or stream headers', async (t) => {
  const { store, enforce } = setup(t)
  await exhaust(enforce)
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.ok(url.startsWith('https://redis.example.test'), 'Blocked request must never reach a provider')
    return store.fetch(url, options)
  })
  for (const [handler, body] of [
    ...['simplify', 'example', 'next'].map(action => [lessonHandler, { ...context, action }]),
    [activityHandler, { ...context, activity, action: 'evaluate', learnerResponse: 'The count increases.' }],
    [conversationHandler, { ...context, message: 'Why?', stream: true }],
  ]) {
    const res = demoResponse()
    await handler(demoRequest(body), res)
    assert.equal(res.code, 429)
    assert.equal(res.flushed, undefined)
    assert.equal(res.headers['content-type'], undefined)
    assert.deepEqual(res.chunks, [])
  }
})

test('method and input validation and missing provider configuration do not consume any allowance', async (t) => {
  setup(t)
  t.mock.method(globalThis, 'fetch', () => assert.fail('No provider or store call'))
  for (const [, handler, body] of routes) {
    const res = demoResponse()
    await handler({ ...demoRequest(body), method: 'GET' }, res)
    assert.equal(res.code, 405)
  }
  for (const handler of [lessonHandler, conversationHandler, activityHandler, imageHandler, analyzeHandler, recommendHandler]) {
    const res = demoResponse()
    await handler(demoRequest(), res)
    assert.equal(res.code, 400)
  }
  for (const handler of [questionHandler, answerHandler]) {
    const res = demoResponse()
    await handler(demoRequest({ courseName: 'React', importantTopics: {} }), res)
    assert.equal(res.code, 500, 'Unusable legacy input must not reserve an action before serialization fails')
  }
  delete process.env.MODEL_API_KEY
  for (const [, handler, body] of routes) {
    const res = demoResponse()
    await handler(demoRequest(body), res)
    assert.equal(res.code, 503)
  }
})

test('the final lesson and its automatic image count once; replays, tampering and separate images cannot claim free work', async (t) => {
  const { store, enforce } = setup(t)
  await exhaust(enforce, demoRequest(), 24)
  await fillGlobal(enforce, 725)
  let textCalls = 0, imageCalls = 0
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.startsWith('https://redis.example.test')) return store.fetch(url, options)
    if (url.endsWith('/responses')) { textCalls++; return output({ ...lesson, visual }) }
    imageCalls++
    return new Response(JSON.stringify({ data: [{ url: 'https://images.example.test/image.webp' }] }))
  })
  const generated = demoResponse()
  await lessonHandler(demoRequest({ courseName: 'React' }), generated)
  assert.equal(generated.code, 200)
  assert.equal(store.globalCount(), 750)
  const imageContext = { courseName: 'React', lesson: generated.body, visual: generated.body.visual }
  const tampered = demoResponse()
  await imageHandler(demoRequest({ ...imageContext, lesson: { ...lesson, content: 'Different image instructions.' }, automatic: true }), tampered)
  assert.equal(tampered.code, 429)
  const images = await Promise.all([0, 1].map(async () => {
    const res = demoResponse(); await imageHandler(demoRequest(imageContext), res); return res
  }))
  assert.deepEqual(images.map(res => res.code).sort(), [200, 429])
  assert.equal(textCalls, 1)
  assert.equal(imageCalls, 1)
  assert.equal(store.globalCount(), 750, 'Included image and rejected replays do not spend global actions')
  const next = demoResponse()
  await lessonHandler(demoRequest({ courseName: 'React' }), next)
  assert.equal(next.code, 429)
})

test('included image allowances expire, bind to the visitor and never survive a failed grant write', async (t) => {
  const { store, enforce } = setup(t)
  const accepted = await enforce(demoRequest(), demoResponse())
  assert.equal(await accepted.includeImage(context), true)
  await exhaust(enforce, demoRequest({}, '192.0.2.9'))
  assert.equal((await enforce(demoRequest({}, '192.0.2.9'), demoResponse(), { imageContext: context })).allowed, false)
  await exhaust(enforce, demoRequest(), 24)
  store.advance(601)
  assert.equal((await enforce(demoRequest(), demoResponse(), { imageContext: context })).allowed, false)
  store.advance(21600)
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.startsWith('https://redis.example.test')) {
      if (JSON.parse(options.body)[1].includes('local count = redis.call')) throw new Error('PRIVATE_STORE_FAILURE')
      return store.fetch(url, options)
    }
    return output({ ...lesson, visual })
  })
  const res = demoResponse()
  await lessonHandler(demoRequest({ courseName: 'React' }), res)
  assert.equal(res.code, 200)
  assert.equal(res.body.content, lesson.content)
  assert.equal(res.body.visual, undefined, 'Keep paid text without a second automatic charge')
})

test('stream completion includes one server-authorized supporting image in the conversation action', async (t) => {
  const { store, enforce } = setup(t)
  await exhaust(enforce, demoRequest(), 24)
  await fillGlobal(enforce, 725)
  const payload = JSON.stringify({ ...reply, visual })
  const events = [
    { type: 'response.output_text.delta', item_id: 'message', output_index: 0, content_index: 0, delta: payload },
    { type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: payload }] }] } },
  ]
  let imageCalls = 0
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.startsWith('https://redis.example.test')) return store.fetch(url, options)
    if (url.endsWith('/responses')) return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } })
    imageCalls++
    return new Response(JSON.stringify({ data: [{ url: 'https://images.example.test/image.webp' }] }))
  })
  const res = demoResponse()
  await conversationHandler(demoRequest({ ...context, message: 'Show me', stream: true }), res)
  const completed = res.chunks.at(-1)
  assert.equal(completed.type, 'complete')
  const imageRes = demoResponse()
  await imageHandler(demoRequest({ ...context, visual: completed.visual }), imageRes)
  assert.equal(imageRes.code, 200)
  assert.equal(imageCalls, 1)
  assert.equal(store.globalCount(), 750, 'A streamed reply and its image share the final global action')
  assert.equal((await enforce(demoRequest(), demoResponse())).allowed, false)
})

test('global ceiling allows action 750, rejects 751 with a safe capacity error, and expires at 24 hours', async () => {
  assert.equal(DEMO_GLOBAL_AI_ACTION_LIMIT, 750)
  assert.equal(DEMO_GLOBAL_AI_ACTION_WINDOW_HOURS, 24)
  const store = fakeDemoStore(), enforce = createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch })
  await fillGlobal(enforce, 749)
  assert.equal(store.globalCount(), 749)
  assert.equal((await enforce(demoRequest({}, '198.51.100.30'), demoResponse())).allowed, true)
  const blocked = demoResponse()
  assert.deepEqual(await enforce(demoRequest(), blocked), { allowed: false, reason: 'global_capacity' })
  assert.equal(store.globalCount(), 750)
  assert.equal(blocked.code, 429)
  assert.deepEqual(blocked.body, { error: 'demo_capacity_reached', message: "Orbit's public demo has reached its current AI capacity.", retryAfterSeconds: 86400 })
  assert.equal(blocked.headers['retry-after'], '86400')
  assert.equal(blocked.headers['cache-control'], 'no-store')
  assert.doesNotMatch(JSON.stringify(blocked.body), /750|Redis|192\.|198\.|fake-|token|budget|stack/i)
  store.advance(86399)
  const almostExpired = demoResponse()
  await enforce(demoRequest(), almostExpired)
  assert.equal(almostExpired.body.retryAfterSeconds, 1)
  store.advance(1)
  assert.equal((await enforce(demoRequest(), demoResponse())).allowed, true)
  assert.equal(store.globalCount(), 1)
})

test('global usage is a rolling log: later actions remain after the first actions age out', async () => {
  const store = fakeDemoStore(), enforce = createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch })
  await fillGlobal(enforce, 375)
  store.advance(3600)
  await fillGlobal(enforce, 375, 375)
  store.advance(23 * 3600)
  assert.equal(store.globalCount(), 375)
  await fillGlobal(enforce, 375)
  assert.equal(store.globalCount(), 750)
  const blocked = demoResponse()
  await enforce(demoRequest(), blocked)
  assert.equal(blocked.body.error, 'demo_capacity_reached')
  assert.equal(blocked.body.retryAfterSeconds, 3600, 'Retry waits for the next action expiry, not a whole-day reset')
  store.advance(3600)
  assert.equal(store.globalCount(), 375)
  assert.equal((await enforce(demoRequest(), demoResponse())).allowed, true)
})

test('neither rejection debits the other allowance or extends existing expiries', async () => {
  const store = fakeDemoStore(), enforce = createDemoRateLimiter({ env: demoEnv(), fetch: store.fetch })
  await exhaust(enforce)
  const prior = structuredClone([...store.entries])
  assert.deepEqual(await enforce(demoRequest(), demoResponse()), { allowed: false, reason: 'visitor_limit' })
  assert.deepEqual([...store.entries], prior)
  const partlyUsed = demoRequest({}, '192.0.2.9')
  await enforce(partlyUsed, demoResponse())
  await fillGlobal(enforce, 724)
  const full = structuredClone([...store.entries])
  for (const req of [partlyUsed, demoRequest({}, '192.0.2.10')]) {
    assert.deepEqual(await enforce(req, demoResponse()), { allowed: false, reason: 'global_capacity' })
    assert.deepEqual([...store.entries], full, 'Global denial cannot create/increment a visitor counter or extend TTLs')
  }
  const both = demoResponse()
  await enforce(demoRequest(), both)
  assert.equal(both.body.error, 'demo_limit_reached', 'Personal exhaustion retains priority when both apply')
  assert.equal(store.globalCount(), 750)
})

test('concurrent traffic across visitors, aliases and instances cannot reserve more than 750 actions', async () => {
  const store = fakeDemoStore()
  const instances = Array.from({ length: 6 }, (_, i) => createDemoRateLimiter({ env: { ...demoEnv(), VERCEL_URL: `deployment-${i}.example.test` }, fetch: store.fetch }))
  const results = await Promise.all(Array.from({ length: 900 }, async (_, i) => {
    const req = demoRequest({}, `198.51.100.${Math.floor(i / 20) + 1}`)
    req.headers.host = `alias-${i % 6}.example.test`
    const res = demoResponse()
    return { result: await instances[i % 6](req, res), res }
  }))
  assert.equal(results.filter(({ result }) => result.allowed).length, 750)
  assert.equal(results.filter(({ res }) => res.body?.error === 'demo_capacity_reached').length, 150)
  assert.equal(store.globalCount(), 750)
  const visitorTotal = [...store.entries].filter(([key]) => key.endsWith(':actions') && !key.endsWith(':global:actions'))
    .reduce((sum, [, value]) => sum + value.count, 0)
  assert.equal(visitorTotal, 750)
})

test('global exhaustion blocks every paid route and streaming before any provider request', async (t) => {
  const { store, enforce } = setup(t)
  await fillGlobal(enforce)
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.ok(url.startsWith('https://redis.example.test'), 'No paid provider call after global exhaustion')
    return store.fetch(url, options)
  })
  for (const [, handler, body] of [...routes, ['stream', conversationHandler, { ...context, message: 'Why?', stream: true }]]) {
    const res = demoResponse()
    await handler(demoRequest(body), res)
    assert.equal(res.code, 429)
    assert.equal(res.body.error, 'demo_capacity_reached')
    assert.equal(res.flushed, undefined)
    assert.deepEqual(res.chunks, [])
  }
  assert.equal(store.globalCount(), 750)
})

test('separate paid images spend both allowances; the final image succeeds and the next stops', async (t) => {
  const { store, enforce } = setup(t)
  await fillGlobal(enforce, 749)
  let providerCalls = 0
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.startsWith('https://redis.example.test')) return store.fetch(url, options)
    providerCalls++
    return new Response(JSON.stringify({ data: [{ url: 'https://images.example.test/separate.webp' }] }))
  })
  const allowed = demoResponse(), blocked = demoResponse()
  await imageHandler(demoRequest(context), allowed)
  assert.equal(allowed.code, 200)
  assert.equal(store.globalCount(), 750)
  const beforeDenial = structuredClone([...store.entries])
  await imageHandler(demoRequest({ ...context, automatic: true }), blocked)
  assert.equal(blocked.body.error, 'demo_capacity_reached')
  assert.equal(providerCalls, 1)
  assert.deepEqual([...store.entries], beforeDenial)
})

test('global key survives identity-secret rotation and production redeploys while preview stays isolated and protected', async () => {
  const store = fakeDemoStore(), env = demoEnv()
  await fillGlobal(createDemoRateLimiter({ env, fetch: store.fetch }))
  const rotated = createDemoRateLimiter({ env: { ...env, DEMO_RATE_LIMIT_SECRET: 'another-fake-test-secret-at-least-32-characters', VERCEL_URL: 'new-deployment.example.test' }, fetch: store.fetch })
  assert.equal((await rotated(demoRequest(), demoResponse())).reason, 'global_capacity')
  const preview = createDemoRateLimiter({ env: { ...env, VERCEL_ENV: 'preview', NODE_ENV: 'test' }, fetch: store.fetch })
  await fillGlobal(preview)
  assert.equal((await preview(demoRequest(), demoResponse())).reason, 'global_capacity')
})

test('every current public API route is audited and every provider call follows the shared guard', async () => {
  const files = (await readdir(new URL('../api/', import.meta.url))).filter(name => name.endsWith('.js')).sort()
  assert.deepEqual(files, routes.map(([name]) => `${name}.js`).sort())
  for (const name of files) {
    const source = await readFile(new URL(`../api/${name}`, import.meta.url), 'utf8')
    assert.ok(source.indexOf('await enforceDemoRateLimit(') < source.indexOf('await fetch('), name)
    assert.match(source, /if \(!allowance.allowed\) return/)
  }
})
