import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'

let dom, server, createRoot, StudySession, OrbitStage, root, container
const globals = new Map()
const course = { name: 'React', mastery: { overall: 40, topics: { Props: 20 } } }
const lesson = { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs to components.' }
const anchor = { type: 'analogy', topic: 'Props', summary: 'Connects props to function arguments.', confidence: 'high' }
const reply = { response: '## Inputs\n**Props** supply inputs to a component.', signal: 'connection', anchor }
const props = { course, threadId: 'one', mastery: 40, initialThread: { resume: { lesson } },
  setMastery: () => assert.fail('Conversation must not change mastery'), updateTopicMastery: () => assert.fail('Conversation must not change mastery') }

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ createRoot } = await import('react-dom/client'))
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
  OrbitStage = (await server.ssrLoadModule('/src/components/OrbitStage.jsx')).default
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

const button = (label) => [...container.querySelectorAll('button')].find((element) => element.textContent === label)
const click = async (label) => { assert.ok(button(label), `Missing button: ${label}`); await act(async () => button(label).click()) }
const phrases = () => [...container.querySelectorAll('.orbit-thought-fragment')].map((node) => node.textContent)
const thinking = () => container.querySelector('.orbit-stage-artwork').src.includes('orbit-teaching')

async function enterMessage(message = 'Are props like function arguments?') {
  await act(async () => {
    const field = container.querySelector('textarea')
    Object.getOwnPropertyDescriptor(dom.HTMLTextAreaElement.prototype, 'value').set.call(field, message)
    field.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
}

function mockRequests(t) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/generate-study-question') return new Response(JSON.stringify({ topic: 'Props', question: 'What supplies inputs?', answers: [{ text: 'Props', correct: true }], explanation: 'Props supply inputs.' }), { headers: { 'Content-Type': 'application/json' } })
    assert.equal(url, '/api/respond-to-study-message')
    let writer
    const request = { body: JSON.parse(options.body), signal: options.signal, cancelled: false,
      send(...events) { for (const event of events) writer.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\n')) },
      end() { writer.close() },
    }
    const body = new ReadableStream({ start(controller) { writer = controller }, cancel() { request.cancelled = true } })
    requests.push(request)
    return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } })
  })
  return requests
}

async function renderStudy(onThreadUpdate) {
  await act(async () => root.render(createElement(StudySession, { ...props, onThreadUpdate })))
  await click('Talk it through')
}

test('Study shows chunks before completion, keeps thinking, then saves one formatted exchange and anchor for resume', async (t) => {
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0 // Selecting Talk it through may publish existing thread metadata.
  await enterMessage()
  await click('Send')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.stream, true)
  assert.equal(thinking(), true)
  assert.equal(container.querySelector('textarea').readOnly, true)
  const initialPhrases = phrases()
  await act(async () => { requests[0].send({ type: 'delta', text: '## Inputs\n**Pro' }); await setImmediate() })
  const partial = container.querySelector('.study-streaming-response')
  assert.equal(partial.textContent, '## Inputs\n**Pro')
  assert.equal(partial.getAttribute('aria-live'), 'off')
  assert.equal(partial.querySelector('h3'), null)
  assert.equal(updates.length, 0)
  assert.equal(thinking(), true)
  assert.deepEqual(phrases(), initialPhrases)
  await act(async () => { requests[0].send({ type: 'delta', text: reply.response.slice('## Inputs\n**Pro'.length) }); await setImmediate() })
  assert.equal(container.querySelector('.study-streaming-response').textContent, reply.response)
  assert.equal(thinking(), true, 'Even fully visible text is pending until final metadata arrives')
  assert.equal(updates.length, 0)
  await act(async () => { requests[0].send({ type: 'complete', ...reply }); await setImmediate() })
  assert.equal(thinking(), false)
  assert.equal(container.querySelector('.study-streaming-response'), null)
  assert.equal(container.querySelector('.study-conversation h3').textContent, 'Inputs')
  assert.equal(container.querySelector('.study-conversation strong').textContent, 'Props')
  assert.equal(container.querySelector('textarea').value, '')
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].resume.conversation, [{ message: 'Are props like function arguments?', response: reply.response }])
  assert.deepEqual(updates[0].resume.learningAnchors, [anchor])
  let saved
  const storage = { setItem(_key, value) { saved = value }, getItem() { return saved } }
  saveLearnerMemory({ courses: [course], threads: [{ id: 'one', courseName: course.name, createdAt: '2026-10-28T12:00:00Z', ...updates[0] }], activeId: 'one' }, storage)
  const restored = loadLearnerMemory(storage)
  assert.deepEqual(restored.threads[0].resume.conversation, updates[0].resume.conversation)
  assert.deepEqual(restored.threads[0].resume.learningAnchors, [anchor])
  assert.doesNotMatch(saved, /streamedResponse|onDelta/)
})

test('an interrupted reply clears partial text, preserves the draft and saves exactly once after retry', async (t) => {
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  const firstPair = phrases()
  await act(async () => { requests[0].send({ type: 'delta', text: 'INCOMPLETE_REPLY' }); await setImmediate() })
  assert.match(container.textContent, /INCOMPLETE_REPLY/)
  await act(async () => { requests[0].end(); await setImmediate() })
  assert.equal(thinking(), false)
  assert.doesNotMatch(container.textContent, /INCOMPLETE_REPLY/)
  assert.match(container.querySelector('[role="alert"]').textContent, /interrupted/)
  assert.equal(container.querySelector('textarea').value, 'Are props like function arguments?')
  assert.equal(updates.length, 0)
  await click('Try again')
  assert.notDeepEqual(phrases(), firstPair)
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[1].body.history, [])
  await act(async () => { requests[1].send({ type: 'delta', text: reply.response }, { type: 'complete', ...reply }); await setImmediate() })
  assert.equal(updates.length, 1)
  assert.equal(updates[0].resume.conversation.length, 1)
  assert.equal(container.querySelectorAll('.study-conversation .study-thought').length, 1)
})

test('switching to Quiz aborts the stream and preserves the unsent draft when returning to conversation', async (t) => {
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  await act(async () => { requests[0].send({ type: 'delta', text: 'INCOMPLETE_REPLY' }); await setImmediate() })
  await click('Quiz me')
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[0].cancelled, true)
  assert.doesNotMatch(container.textContent, /INCOMPLETE_REPLY|reply was interrupted/)
  await click('Talk it through')
  assert.equal(thinking(), false)
  assert.equal(container.querySelector('textarea').value, 'Are props like function arguments?')
  assert.ok(updates.every((update) => update.resume.conversation.length === 0))
})

test('unmount cancels a pending conversation without committing partial state', async (t) => {
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  await act(async () => { requests[0].send({ type: 'delta', text: 'Partial' }); await setImmediate() })
  await act(async () => root.render(null))
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[0].cancelled, true)
  assert.equal(updates.length, 0)
})

test('StrictMode and content rerenders keep the phrase pair stable; a new request rotates it', async () => {
  const render = (thinking, children) => act(async () => root.render(createElement(StrictMode, null, createElement(OrbitStage, { thinking, thinkingContext: 'conversation' }, children))))
  await render(true)
  const first = phrases()
  await render(true, 'Partial response')
  assert.deepEqual(phrases(), first)
  assert.equal(thinking(), true)
  assert.equal(container.querySelector('.orbit-thought-trail'), null)
  await render(false)
  assert.deepEqual(phrases(), [])
  await render(true)
  assert.notDeepEqual(phrases(), first)
})
