import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement, StrictMode } from 'react'
import { setImmediate } from 'node:timers/promises'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { emptyLearnerMemory, LEARNER_MEMORY_KEY, loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'
import { lessonImageRequest } from '../src/services/lessonImageRequest.js'

let dom, server, createRoot, App, root, container
const globals = new Map()
const course = { name: 'React', type: 'topic', nextTask: 'Explore Props', mastery: { overall: 60, topics: { Props: 60 } } }
const lesson = { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs to components.' }
const visual = { type: 'generated_image', purpose: 'Follow inputs from parent to child.', focus: 'Props',
  data: [{ label: 'Parent', detail: 'Supplies the input.' }, { label: 'Child', detail: 'Receives the input.' }] }
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const thread = (id, resume = { lesson }) => ({ id, courseName: course.name, positionKey: 'null',
  title: `Thread ${id}`, topic: lesson.topic, context: 'lesson', summary: `Saved lesson ${id}`,
  createdAt: '2026-10-30T10:00:00Z', updatedAt: '2026-10-30T10:00:00Z', resume })
const seed = (threads = [thread('one'), thread('two', { lesson: { ...lesson, concept: 'Inputs in another thread' } })]) => {
  assert.equal(saveLearnerMemory({ ...emptyLearnerMemory(), courses: [course], threads, activeId: threads[0]?.id,
    learningPreferences: { status: 'saved', profile: { visualPreference: 'on_request', chunkSize: 'short' } } }, dom.localStorage), true)
}
const render = async () => act(async () => root.render(createElement(StrictMode, null, createElement(App))))
const reload = async () => { await act(async () => root.unmount()); root = createRoot(container); await render() }
const activeRoom = () => container.querySelector('.study-room:not([hidden])')
const image = () => activeRoom()?.querySelector('.lesson-generated-image')
const clickElement = async (element) => { assert.ok(element, 'Expected control'); await act(async () => element.click()) }
const click = async (label) => clickElement([...activeRoom().querySelectorAll('button')].find((el) => el.textContent === label))
const navigate = async (label) => clickElement([...container.querySelectorAll('.shell-destinations button')].find((el) => el.textContent === label))
const switchThread = async (id) => clickElement([...container.querySelectorAll('.thread-list button')].find((el) => el.querySelector('strong').textContent === read().threads.find((entry) => entry.id === id).title))
const read = () => loadLearnerMemory(dom.localStorage)
const quiet = () => {
  assert.equal(container.querySelector('[data-expression="thinking"]'), null)
  assert.equal(container.querySelector('.orbit-thoughts, .lesson-image-loading:not(:has(+ img))'), null)
}

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, localStorage: dom.localStorage,
    navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  App = (await server.ssrLoadModule('/src/App.jsx')).default
})
beforeEach((t) => {
  dom.localStorage.clear()
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

test('fresh Home mount and refresh make zero requests and never imply thinking', async (t) => {
  const calls = t.mock.method(globalThis, 'fetch', async () => json({}))
  await render(); quiet()
  await reload(); quiet()
  assert.equal(calls.mock.callCount(), 0)
})

for (const route of ['Home', 'Learn', 'Library', 'Calendar', 'existing space', 'existing thread', 'thread switch']) {
  test(`${route} restores learner memory and saved visual instructions with zero requests`, async (t) => {
    seed([thread('one', { lesson: { ...lesson, visual } }), thread('two')])
    const before = read()
    const calls = t.mock.method(globalThis, 'fetch', async () => json({}))
    await render(); quiet()
    await reload(); quiet()
    if (route === 'existing space') await clickElement(container.querySelector('.shell-spaces button'))
    else if (route === 'existing thread' || route === 'thread switch') {
      await navigate('Learn')
      await switchThread(route === 'thread switch' ? 'two' : 'one')
      await switchThread('one')
      assert.ok(activeRoom().textContent.includes(lesson.content))
    } else await navigate(route)
    await act(async () => dom.dispatchEvent(new dom.Event('focus')))
    quiet()
    assert.equal(calls.mock.callCount(), 0)
    assert.deepEqual(read().courses[0].mastery, before.courses[0].mastery)
    assert.deepEqual(read().learningPreferences, before.learningPreferences)
  })
}

test('Learn without an active thread restores locally with zero requests', async (t) => {
  seed([])
  const calls = t.mock.method(globalThis, 'fetch', async () => json({}))
  await render(); await navigate('Learn')
  assert.match(container.textContent, /What do you want to learn/)
  quiet(); assert.equal(calls.mock.callCount(), 0)
})

test('an empty interrupted thread ignores persisted pending flags and waits for explicit Start lesson', async (t) => {
  seed([thread('one', {})])
  const raw = JSON.parse(dom.localStorage.getItem(LEARNER_MEMORY_KEY))
  raw.threads[0].startRequested = true
  Object.assign(raw.threads[0].resume, { loadingLesson: 'lesson', loadingConversation: true, pendingTurn: { message: 'old' } })
  dom.localStorage.setItem(LEARNER_MEMORY_KEY, JSON.stringify(raw))
  let complete
  const calls = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  await render(); await navigate('Learn'); quiet()
  assert.equal(calls.mock.callCount(), 0)
  await click('Start lesson')
  assert.equal(calls.mock.callCount(), 1)
  assert.ok(activeRoom().querySelector('[data-expression="thinking"]'))
  await act(async () => { complete(json(lesson)); await setImmediate() })
  quiet()
  await navigate('Home'); await navigate('Learn'); await reload()
  assert.equal(calls.mock.callCount(), 1)
})

test('a deliberate new learning action and Continue each request once, including automatic visuals', async (t) => {
  seed([])
  const calls = t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path === '/api/generate-lesson-image') return json({ url: 'https://images.example.test/auto.webp' })
    assert.equal(path, '/api/generate-study-lesson')
    return json({ ...lesson, concept: JSON.parse(options.body).action === 'next' ? 'Passing a name' : lesson.concept, visual })
  })
  await render()
  assert.equal(calls.mock.callCount(), 0)
  await clickElement(container.querySelector('.home-recommendation .orbit-button-primary'))
  assert.equal(calls.mock.callCount(), 2)
  await click('Show me')
  assert.equal(calls.mock.callCount(), 2, 'Automatic and Show me share the same instructional image')
  await click('Continue to next lesson')
  assert.equal(calls.mock.callCount(), 4)
  assert.equal(JSON.parse(calls.mock.calls[2].arguments[1].body).action, 'next')
  assert.equal(read().threads[0].resume.learningPath.step, 2)
  await click('Show me'); await reload(); await navigate('Learn'); await click('Show me')
  assert.equal(calls.mock.callCount(), 4)
})

test('an explicitly started lesson finishes while hidden; returning does not start deferred generation', async (t) => {
  seed([thread('one', {})])
  let complete
  const calls = t.mock.method(globalThis, 'fetch', (path) => path === '/api/generate-lesson-image'
    ? Promise.resolve(json({ url: 'https://images.example.test/completed.webp' }))
    : new Promise((resolve) => { complete = resolve }))
  await render(); await navigate('Learn'); await click('Start lesson')
  await navigate('Home')
  await act(async () => { complete(json({ ...lesson, visual })); await setImmediate() })
  assert.equal(calls.mock.callCount(), 2)
  assert.equal(container.querySelector('[data-expression="thinking"]'), null)
  await navigate('Learn'); await click('Show me')
  assert.equal(calls.mock.callCount(), 2)
  assert.match(image().src, /completed/)
})

test('Show me persists thread-specific images across rerenders, tools, routes, thread switches and refresh', async (t) => {
  seed()
  let count = 0
  const calls = t.mock.method(globalThis, 'fetch', async (path) => {
    assert.equal(path, '/api/generate-lesson-image')
    return json({ url: `https://images.example.test/${++count}.webp` })
  })
  await render(); await navigate('Learn'); await click('Show me')
  assert.equal(calls.mock.callCount(), 1)
  assert.equal(read().threads.find((entry) => entry.id === 'one').updatedAt, '2026-10-30T10:00:00.000Z')
  const one = image().src
  await render(); await click('Talk it through'); await click('Show me')
  await navigate('Library'); await navigate('Learn'); await click('Show me')
  assert.equal(image().src, one)
  assert.equal(calls.mock.callCount(), 1)
  await switchThread('two')
  assert.equal(image(), null)
  await click('Show me')
  const two = image().src
  assert.notEqual(one, two)
  await switchThread('one')
  assert.equal(image().src, one)
  await reload(); assert.equal(calls.mock.callCount(), 2)
  await navigate('Learn'); await click('Show me')
  assert.equal(image().src, one)
  await switchThread('two'); await click('Show me')
  assert.equal(image().src, two)
  assert.equal(calls.mock.callCount(), 2)
  assert.doesNotMatch(dom.localStorage.getItem(LEARNER_MEMORY_KEY), /b64_json|data:image|base64/)
})

test('saved signed URL failures stay unavailable across Show me and refresh; Retry saves one replacement', async (t) => {
  const request = lessonImageRequest({ courseName: course.name, lesson, visual })
  seed([thread('one', { lesson: { ...lesson, visual }, images: [{ request, status: 'ready', url: 'https://images.example.test/expired.webp' }] })])
  const calls = t.mock.method(globalThis, 'fetch', async () => json({ url: 'https://images.example.test/replacement.webp' }))
  await render(); await navigate('Learn')
  assert.match(image().src, /expired/)
  await act(async () => image().dispatchEvent(new dom.Event('error')))
  await click('Show me')
  assert.equal(calls.mock.callCount(), 0)
  await reload(); await navigate('Learn'); await click('Show me')
  assert.equal(image(), null)
  assert.match(activeRoom().textContent, /Visual unavailable/)
  assert.equal(calls.mock.callCount(), 0)
  await click('Retry visual')
  assert.equal(calls.mock.callCount(), 1)
  assert.match(read().threads[0].resume.images[0].url, /replacement/)
  await reload(); await navigate('Learn'); await click('Show me')
  assert.match(image().src, /replacement/)
  assert.equal(calls.mock.callCount(), 1)
})

test('materially different recovery and next lessons get separate images, and restored recovery reuses its image', async (t) => {
  seed([thread('one')])
  let images = 0, explanations = 0
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path === '/api/generate-lesson-image') return json({ url: `https://images.example.test/context-${++images}.webp` })
    const action = JSON.parse(options.body).action
    return json({ ...lesson, concept: action === 'next' ? 'Passing a name' : lesson.concept,
      content: action === 'next' ? 'A parent sends the name into a child.' : `Corrective explanation ${++explanations}: props are supplied from outside.` })
  })
  await render(); await navigate('Learn'); await click('Show me')
  assert.equal(images, 1)
  await click('I lost you'); await click('Show me')
  assert.equal(images, 2)
  const recovery = image().src
  await reload(); await navigate('Learn'); await click('Show me')
  assert.equal(image().src, recovery)
  await click('Lesson'); await click('That helps'); await click('Show me')
  assert.equal(images, 2)
  await click('I lost you'); await click('Show me')
  assert.equal(images, 3)
  await click('Continue to next lesson')
  assert.equal(image(), null)
  await click('Show me')
  assert.equal(images, 4)
  assert.notEqual(image().src, recovery)
})

test('the current lesson image remains saved when many example images exceed the recent-image window', async (t) => {
  seed([thread('one', { lesson: { ...lesson, visual } })])
  let images = 0, examples = 0
  t.mock.method(globalThis, 'fetch', async (path) => path === '/api/generate-lesson-image'
    ? json({ url: `https://images.example.test/window-${++images}.webp` })
    : json({ content: `Example ${++examples}: pass this value to a component.` }))
  await render(); await navigate('Learn'); await click('Show me')
  const original = image().src
  for (let index = 0; index < 7; index++) {
    await click('Give me an example')
    if (index) await click('Another example')
    await click('Show me')
  }
  assert.equal(images, 8)
  assert.equal(read().threads[0].resume.images.length, 6)
  await reload(); await navigate('Learn'); await click('Lesson'); await click('Show me')
  assert.equal(image().src, original)
  assert.equal(images, 8)
})
