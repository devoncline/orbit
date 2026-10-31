import assert from 'node:assert/strict'
import { test } from 'node:test'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import handler from '../api/generate-lesson-image.js'
import lessonHandler from '../api/generate-study-lesson.js'
import { generateLessonImage, createLessonImageCache } from '../src/services/lessonImages.js'
import { lessonImageRequest, lessonImageUrl, MAX_SAVED_VISUALS, savedLessonImages } from '../src/services/lessonImageRequest.js'
import { generatedLessonVisual } from '../src/services/learningPath.js'
import { compactThreadResume, LEARNER_MEMORY_KEY, saveLearnerMemory, loadLearnerMemory } from '../src/services/learnerMemory.js'

const lesson = { topic: 'State', concept: 'Updating a component', content: 'Updating state asks React to render the component again.' }
const visual = { type: 'generated_image', composition: 'process', purpose: 'Connect a state update to rendering.', focus: 'State',
  data: [{ label: 'State', detail: 'A component remembers a value.' }, { label: 'Render', detail: 'React calculates the view.' }],
  links: [{ from: 0, to: 1, label: 'An update requests a render' }] }
const context = { courseName: 'React', lesson, visual }
const imageUrl = 'https://images.example.test/lesson.webp?expires=example'
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value },
    status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
}
async function call(body = context, method = 'POST') {
  const res = response()
  await handler({ method, body }, res)
  return res
}
function withKey(t) {
  const original = process.env.MODEL_API_KEY
  process.env.MODEL_API_KEY = 'server-only-test-sentinel'
  t.after(() => { if (original === undefined) delete process.env.MODEL_API_KEY; else process.env.MODEL_API_KEY = original })
}

test('no visual, none, or malformed teaching briefs never call the image provider', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', () => assert.fail('No image request expected'))
  for (const value of [undefined, { type: 'none' }, { type: 'generated_image' }, { ...visual, links: [null] }]) {
    assert.equal(await generateLessonImage({ ...context, visual: value }), null)
    assert.equal((await call({ ...context, visual: value })).code, 400)
  }
  assert.equal((await call(context, 'GET')).code, 405)
  assert.equal((await call({ ...context, history: 'x'.repeat(16001) })).code, 413)
  assert.equal(mock.mock.callCount(), 0)
})

test('client-to-server image path uses one Muse Image generation with only a bounded instructional brief', async (t) => {
  withKey(t)
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options })
    if (url === '/api/generate-lesson-image') {
      const res = await call(JSON.parse(options.body))
      return { ok: res.code === 200, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/images/generations')
    return { ok: true, json: async () => ({ data: [{ url: imageUrl }], output_format: 'webp', usage: { private: 'PRIVATE_PROVIDER_SENTINEL' } }) }
  })
  const result = await generateLessonImage({ ...context, MODEL_API_KEY: 'PRIVATE_CLIENT_SENTINEL', history: ['PRIVATE_TRANSCRIPT_SENTINEL'],
    visual: { ...visual, recoveryContext: 'Confuses stored state with the rendered output.', url: 'PRIVATE_ASSET_SENTINEL' } })
  assert.deepEqual(result, { url: imageUrl })
  assert.equal(requests.length, 2)
  const client = requests[0].options
  assert.equal(client.headers.Authorization, undefined)
  assert.doesNotMatch(client.body, /MODEL_API_KEY|PRIVATE_|server-only-test-sentinel/)
  const upstream = requests[1].options
  assert.equal(upstream.headers.Authorization, 'Bearer server-only-test-sentinel')
  const payload = JSON.parse(upstream.body)
  assert.equal(payload.model, 'muse-image-1.0')
  assert.equal(payload.n, 1)
  assert.equal(payload.output_format, 'webp')
  assert.equal(payload.response_format, 'url')
  assert.deepEqual(payload.tool_enablement, { enable_image_search: false, enable_web_search: false, enable_shell: false })
  assert.match(payload.prompt, /Confuses stored state/)
  assert.match(payload.prompt, /strong visual hierarchy/)
  assert.match(payload.prompt, /No paragraphs, random planets/)
  assert.doesNotMatch(upstream.body, /PRIVATE_|server-only-test-sentinel/)
  assert.ok(upstream.signal)
})

test('image failures preserve safe provider status, never leak errors, and do not return image bytes', async (t) => {
  withKey(t)
  for (const upstream of [
    { ok: false, status: 429, json: async () => ({ error: 'PRIVATE_UPSTREAM_SENTINEL' }) },
    { ok: true, json: async () => ({ data: [{ b64_json: 'PRIVATE_IMAGE_SENTINEL' }] }) },
    { ok: true, json: async () => ({ data: [{ url: 'javascript:alert(1)' }] }) },
    { ok: true, json: async () => { throw new Error('PRIVATE_PARSE_SENTINEL') } },
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => upstream)
    const res = await call()
    assert.equal(res.code, upstream.ok ? 502 : 429)
    assert.equal(res.headers['Cache-Control'], 'no-store')
    assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE_|data:|server-only-test-sentinel/)
    mock.mock.restore()
  }
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('PRIVATE_TIMEOUT', 'TimeoutError') })
  assert.equal((await call()).code, 502)
  mock.mock.restore()
  delete process.env.MODEL_API_KEY
  t.mock.method(globalThis, 'fetch', () => assert.fail('Missing server key must fail before fetch'))
  assert.equal((await call()).code, 503)
})

test('Spark retains optional routing, returns generated briefs, and never generates images inside text generation', async (t) => {
  let output = { ...lesson, visual: { type: 'none' } }
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options })
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) }
  })
  for (const value of [{ type: 'none' }, visual]) {
    output = { ...lesson, visual: value }
    const res = response()
    await lessonHandler({ method: 'POST', body: { courseName: 'React' } }, res)
    assert.equal(res.code, 200)
    assert.deepEqual(res.body.visual, value)
  }
  assert.equal(requests.length, 2)
  assert.ok(requests.every(({ url }) => url === 'https://api.meta.ai/v1/responses'))
  const prompt = JSON.parse(requests[0].options.body).input
  assert.match(prompt, /materially improve understanding/)
  assert.match(prompt, /Do not automatically request an image for every lesson/)
  assert.match(prompt, /generated_image/)
  assert.doesNotMatch(prompt, /generated_image is deferred|native visual/)
})

test('normalization preserves relationships and recovery, adapts legacy data, and excludes assets from local resume', () => {
  const dirty = { ...visual, url: imageUrl, b64_json: 'x'.repeat(100000), recoveryContext: 'x'.repeat(900) }
  const normalized = lessonImageRequest({ ...context, courseName: 'x'.repeat(500), lesson: { ...lesson, content: 'x'.repeat(2000) }, visual: dirty })
  assert.equal(normalized.courseName.length, 200)
  assert.equal(normalized.lesson.content.length, 900)
  assert.equal(normalized.visual.recoveryContext.length, 400)
  assert.deepEqual(normalized.visual.links, visual.links)
  const saved = compactThreadResume({ lesson: { ...lesson, visual: dirty, image: imageUrl }, conversationVisual: dirty })
  assert.equal(saved.lesson.visual.type, 'generated_image')
  assert.doesNotMatch(JSON.stringify(saved), /https:|b64_json/)
  const old = { ...visual, type: 'process', composition: undefined }
  assert.deepEqual(generatedLessonVisual(old), visual)
  for (const url of ['http://example.test/image', 'data:image/png;base64,abc', 'javascript:alert(1)', 'https://user:secret@example.test/x', 'bad', 'x'.repeat(8193)]) assert.equal(lessonImageUrl(url), null)
})

test('the session cache shares pending requests, retains failures, and permits only explicit retry', async (t) => {
  let complete
  let calls = 0
  t.mock.method(globalThis, 'fetch', () => { calls++; return new Promise((resolve) => { complete = resolve }) })
  const cache = createLessonImageCache()
  const key = JSON.stringify(lessonImageRequest(context))
  const first = cache.load(key)
  assert.equal(cache.load(key), first)
  assert.equal(cache.load(key, true), first)
  assert.equal(calls, 1)
  complete({ ok: false })
  await first
  assert.equal(cache.get(key).status, 'error')
  await cache.load(key)
  assert.equal(calls, 1)
  const second = cache.load(key, true)
  complete({ ok: true, json: async () => ({ url: imageUrl }) })
  await second
  assert.equal(cache.get(key).url, imageUrl)
  await cache.load(key)
  assert.equal(calls, 2)
})

test('client visual modules cannot import server credentials or the legacy renderer', async () => {
  for (const path of ['src/components/LessonVisual.jsx', 'src/services/lessonImages.js', 'src/services/lessonImageRequest.js']) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /MODEL_API_KEY|Authorization|api\.meta\.ai|LegacyLessonVisual|localStorage|sessionStorage/)
  }
})

test('bounded visual metadata survives localStorage without bytes, secrets or persisted pending state', () => {
  const storage = new Map()
  const browser = { setItem: (key, value) => storage.set(key, value), getItem: (key) => storage.get(key) }
  const images = Array.from({ length: MAX_SAVED_VISUALS + 3 }, (_, index) => ({
    request: { ...context, lesson: { ...lesson, concept: `Concept ${index}` }, token: 'SECRET_SENTINEL' },
    status: 'ready', url: `${imageUrl}&index=${index}`, b64_json: 'BINARY_SENTINEL', bytes: new Uint8Array([1, 2]),
  }))
  images.at(-2).status = 'pending'
  images.at(-1).url = 'data:image/webp;base64,BINARY_SENTINEL'
  saveLearnerMemory({ courses: [{ name: 'React' }], threads: [{ id: 'one', courseName: 'React',
    createdAt: '2026-10-30T10:00:00Z', startRequested: true,
    resume: { lesson, images, loadingLesson: 'lesson', loadingConversation: true, pendingTurn: 'UNFINISHED_SENTINEL' },
  }], activeId: 'one' }, browser)
  const serialized = storage.get(LEARNER_MEMORY_KEY)
  assert.doesNotMatch(serialized, /BINARY_SENTINEL|SECRET_SENTINEL|UNFINISHED_SENTINEL|b64_json|bytes|base64|data:image|pending|startRequested|loading/)
  const restored = loadLearnerMemory(browser).threads[0].resume.images
  assert.equal(restored.length, MAX_SAVED_VISUALS)
  assert.equal(restored[0].request.lesson.concept, 'Concept 3')
  assert.equal(restored.at(-2).status, 'error')
  assert.equal(restored.at(-1).status, 'error')
  assert.equal(restored.at(-1).url, undefined)
  assert.deepEqual(savedLessonImages([null, {}, { request: {} }]), [])
})

test('cache hydration is free, stable across serialization and scoped to its owning thread', async (t) => {
  const calls = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ url: imageUrl }) }))
  const key = JSON.stringify(lessonImageRequest(context))
  const first = createLessonImageCache()
  await first.load(key)
  const restored = createLessonImageCache(JSON.parse(JSON.stringify(first.getSaved())))
  await restored.load(key)
  assert.equal(restored.get(key).url, imageUrl)
  assert.equal(calls.mock.callCount(), 1)
  const otherThread = createLessonImageCache()
  assert.equal(otherThread.get(key).status, 'idle')
  await otherThread.load(key)
  assert.equal(calls.mock.callCount(), 2)
})

test('legacy visual request identities stay canonical after repeated normalization and persistence', () => {
  const legacy = { ...context, visual: { ...visual, type: 'diagram', composition: undefined } }
  const request = lessonImageRequest(legacy)
  const key = JSON.stringify(request)
  const restored = compactThreadResume({ lesson: { ...lesson, visual: legacy.visual },
    images: [{ request, status: 'ready', url: imageUrl }] })
  assert.equal(JSON.stringify(lessonImageRequest(request)), key)
  assert.equal(JSON.stringify(lessonImageRequest({ ...context, lesson: restored.lesson, visual: restored.lesson.visual })), key)
  assert.equal(createLessonImageCache(restored.images).get(key).url, imageUrl)
})
