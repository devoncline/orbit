import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { createLessonImageCache } from '../src/services/lessonImages.js'

let dom, server, createRoot, LessonVisual, StudySession, root, container
const globals = new Map()
const course = { name: 'React', mastery: { overall: 40, topics: {} } }
const lesson = { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs to components.' }
const visual = { type: 'generated_image', composition: 'diagram', purpose: 'Follow inputs from parent to child.', focus: 'Child',
  data: [{ label: 'Parent', detail: 'Supplies a value.' }, { label: 'Child', detail: 'Receives the value.' }],
  links: [{ from: 0, to: 1, label: 'Passes a prop' }] }
const props = { course, threadId: 'one', mastery: 40,
  setMastery: () => assert.fail('Images must not change mastery'), updateTopicMastery: () => assert.fail('Images must not change mastery') }
const url = 'https://images.example.test/lesson.webp'
const imageResponse = (value = url) => new Response(JSON.stringify({ url: value }), { headers: { 'Content-Type': 'application/json' } })

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  LessonVisual = (await server.ssrLoadModule('/src/components/LessonVisual.jsx')).default
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
})
beforeEach(() => { container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container) })
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
after(async () => {
  await server?.close()
  await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

const image = () => container.querySelector('.lesson-generated-image')
const button = (label) => [...container.querySelectorAll('button')].find((element) => element.textContent === label)
const click = async (label) => { assert.ok(button(label), `Missing ${label}`); await act(async () => button(label).click()) }
async function mountStudy(value = visual, extra = {}) {
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(StudySession, { ...props, initialThread: { resume: { lesson: { ...lesson, visual: value } } }, ...extra }))))
}
async function imageEvent(event = 'load') { await act(async () => image().dispatchEvent(new dom.Event(event))) }

test('lessons without visual requests use no image path and retain the lesson controls', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('No image generation expected'))
  for (const value of [null, { type: 'none' }, { type: 'generated_image' }]) {
    await mountStudy(value)
    assert.equal(image(), null)
    assert.equal(container.querySelector('.lesson-visual'), null)
    assert.ok(container.textContent.includes(lesson.content))
    assert.equal(button('I lost you').disabled, false)
    await act(async () => root.render(null))
  }
})

test('a generated lesson requests the server once across StrictMode, rerenders, pending navigation and loaded navigation', async (t) => {
  let complete
  const mock = t.mock.method(globalThis, 'fetch', (path, options) => {
    assert.equal(path, '/api/generate-lesson-image')
    assert.equal(options.headers.Authorization, undefined)
    return new Promise((resolve) => { complete = resolve })
  })
  await mountStudy()
  assert.equal(mock.mock.callCount(), 1)
  assert.match(container.textContent, /Preparing a lesson image/)
  assert.ok(container.textContent.includes(lesson.content))
  for (const label of ['I lost you', 'Talk it through', 'Quiz me', 'Continue to next lesson']) assert.equal(button(label).disabled, false)
  assert.equal(container.querySelector('.lesson-visual svg'), null)
  await mountStudy()
  await click('Talk it through')
  await click('Lesson')
  assert.equal(mock.mock.callCount(), 1)
  await act(async () => { complete(imageResponse()); await setImmediate() })
  assert.equal(image().getAttribute('src'), url)
  assert.equal(image().hidden, true, 'Do not show an unverified image while it decodes')
  await imageEvent()
  assert.equal(image().hidden, false)
  assert.match(image().alt, /Follow inputs.*Parent.*Child/)
  assert.equal(image().referrerPolicy, 'no-referrer')
  await click('Talk it through')
  await click('Lesson')
  assert.equal(image().src, url)
  assert.equal(mock.mock.callCount(), 1)
})

test('generation failure omits the image and legacy fallback, survives remounts, and retries only on click', async (t) => {
  let fail = true
  const mock = t.mock.method(globalThis, 'fetch', async () => fail ? new Response('{}', { status: 503 }) : imageResponse())
  await mountStudy({ ...visual, type: 'diagram' })
  assert.equal(image(), null)
  assert.equal(container.querySelector('.lesson-visual svg, .lesson-visual-object, .lesson-symbol-anchor'), null)
  assert.ok(container.textContent.includes(lesson.content))
  assert.ok(button('Retry visual'))
  assert.equal(button('Quiz me').disabled, false)
  await mountStudy({ ...visual, type: 'diagram' })
  await click('Talk it through')
  await click('Lesson')
  assert.equal(mock.mock.callCount(), 1)
  fail = false
  await click('Retry visual')
  assert.equal(mock.mock.callCount(), 2)
  await imageEvent()
  assert.equal(image().hidden, false)
})

test('expired or broken URLs remove the img and never trigger automatic paid regeneration', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => imageResponse())
  await mountStudy()
  await imageEvent('error')
  assert.equal(image(), null)
  assert.equal(container.querySelector('.lesson-visual'), null)
  assert.ok(button('Retry visual'))
  await click('Talk it through')
  await click('Lesson')
  assert.equal(mock.mock.callCount(), 1)
  assert.equal(image(), null)
})

test('meaningful lesson changes clear old images immediately and late old responses cannot replace current visuals', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', (_path, options) => new Promise((resolve) => requests.push({ resolve, body: JSON.parse(options.body) })))
  const cache = createLessonImageCache()
  const render = async (currentLesson, value = visual) => act(async () => root.render(createElement(LessonVisual, { lesson: currentLesson, visual: value, courseName: 'React', cache })))
  await render(lesson)
  const next = { ...lesson, content: 'A different explanation using function arguments.' }
  await render(next)
  assert.equal(image(), null)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].body.lesson.content, next.content)
  await act(async () => { requests[1].resolve(imageResponse('https://images.example.test/new.webp')); await setImmediate() })
  await imageEvent()
  await act(async () => { requests[0].resolve(imageResponse('https://images.example.test/old.webp')); await setImmediate() })
  assert.equal(image().src, 'https://images.example.test/new.webp')
  await render({ ...next, concept: 'Another concept' }, { type: 'none' })
  assert.equal(image(), null)
  assert.equal(container.textContent, '')
  assert.equal(requests.length, 2)
})

test('hidden resumed threads defer generation until activated and saved resume contains no generated URL', async (t) => {
  const updates = []
  const mock = t.mock.method(globalThis, 'fetch', async () => imageResponse())
  const onThreadUpdate = (_id, update) => updates.push(update)
  await mountStudy(visual, { active: false, onThreadUpdate })
  assert.equal(mock.mock.callCount(), 0)
  await mountStudy(visual, { active: true, onThreadUpdate })
  assert.equal(mock.mock.callCount(), 1)
  await imageEvent()
  await click('Talk it through')
  assert.ok(updates.length)
  for (const update of updates) assert.doesNotMatch(JSON.stringify(update.resume), /images\.example|b64_json|data:image/)
})
