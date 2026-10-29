import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'
import { STREAM_DISPLAY_INTERVAL } from '../src/services/streamDisplay.js'
import { getThinkingCopy } from '../src/components/orbitThinking.js'
import { readFile } from 'node:fs/promises'

let dom, server, createRoot, StudySession, OrbitStage, OrbitResponse, root, container
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
  OrbitResponse = (await server.ssrLoadModule('/src/components/OrbitSignal.jsx')).OrbitResponse
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
const signal = () => container.querySelector('.orbit-signal')
const responseSlot = (context) => [...container.querySelectorAll(`[data-orbit-result="${context}"]`)].at(-1)
async function advance(t, ticks = 1) {
  for (let i = 0; i < ticks; i += 1) await act(async () => { t.mock.timers.tick(STREAM_DISPLAY_INTERVAL); await setImmediate() })
}

function checkSignal(context) {
  const local = signal()
  assert.ok(local, `Expected Signal for ${context}`)
  assert.equal(local.dataset.thinkingContext, context)
  const copy = Array.from({ length: 6 }, (_, i) => getThinkingCopy(context, i).fragments[0])
  assert.ok(copy.includes(local.querySelector('span').textContent))
  assert.equal(local.getAttribute('aria-hidden'), 'true')
  assert.equal(local.querySelector('img').getAttribute('width'), '22')
  assert.equal(container.querySelectorAll('[role="status"]').length, 1)
  const slot = responseSlot(context)
  assert.equal(slot.getAttribute('aria-busy'), 'true')
  assert.equal(slot.firstElementChild.children.length, 1, 'Loading contains only the compact Signal')
  assert.equal(local.parentElement, slot.firstElementChild)
  return slot
}

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

test('native visuals follow the active lesson across tool switches and continuation without extra requests', async (t) => {
  const visual = { type: 'comparison', purpose: 'Compare component inputs.', focus: '', data: [
    { label: 'Props', detail: 'Supplied by a parent.' }, { label: 'State', detail: 'Remembered by the component.' },
  ] }
  const nextLesson = { topic: 'Props', concept: 'Passing inputs', content: 'A parent passes inputs to a child.',
    visual: { type: 'process', purpose: 'Follow an input.', focus: '', data: [
      { label: 'Parent', detail: 'Supplies an input.' }, { label: 'Child', detail: 'Receives that input.' },
    ] } }
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) })
    assert.equal(url, '/api/generate-study-lesson', 'Rendering must not request an image or another service')
    return new Response(JSON.stringify(nextLesson), { headers: { 'Content-Type': 'application/json' } })
  })
  await act(async () => root.render(createElement(StudySession, { ...props, initialThread: { resume: { lesson: { ...lesson, visual } } } })))
  assert.ok(container.querySelector('.lesson-visual-comparison'))
  assert.equal(requests.length, 0)
  await click('Talk it through')
  assert.equal(container.querySelector('.lesson-visual'), null)
  await click('Lesson')
  assert.ok(container.querySelector('.lesson-visual-comparison'))
  assert.equal(requests.length, 0)
  await click('Continue to next lesson')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.action, 'next')
  assert.ok(container.querySelector('.lesson-visual-process'))
  assert.equal(container.querySelector('.lesson-visual-comparison'), null)
  assert.match(container.querySelector('.study-subject').textContent, /Lesson 2/)
  assert.match(container.querySelector('.study-path-previous').textContent, /Inputs/)
  assert.equal(container.querySelector('.study-recommendation button').textContent, 'Give me an example')
})

test('Study shows chunks before completion, keeps thinking, then saves one formatted exchange and anchor for resume', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
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
  assert.equal(container.querySelector('textarea').value, '')
  assert.match(container.querySelector('.study-message-learner').textContent, /Are props like function arguments\?/)
  const slot = checkSignal('conversation')
  assert.equal(container.querySelector('.study-message-learner').nextElementSibling, slot.parentElement)
  const bubble = slot.parentElement
  assert.ok(bubble.classList.contains('study-message-orbit'))
  assert.doesNotMatch(container.querySelector('.study-transcript').textContent, /Your thought|Orbit response/)
  const initialPhrases = phrases()
  await act(async () => { requests[0].send({ type: 'delta', text: '## Inputs\n**Pro' }); await setImmediate() })
  assert.ok(signal(), 'Network arrival does not bypass the display buffer')
  await advance(t)
  const partial = container.querySelector('.study-streaming-response')
  assert.equal(partial.textContent, '## Inputs\n')
  assert.equal(signal(), null)
  assert.equal(responseSlot('conversation'), slot)
  assert.equal(partial.getAttribute('aria-hidden'), 'true')
  assert.equal(partial.querySelector('h3'), null)
  assert.equal(updates.length, 0)
  assert.equal(thinking(), true)
  assert.deepEqual(phrases(), initialPhrases)
  await act(async () => { requests[0].send({ type: 'delta', text: reply.response.slice('## Inputs\n**Pro'.length) }); await setImmediate() })
  await advance(t, 4)
  assert.equal(container.querySelector('.study-streaming-response').textContent, reply.response.slice(0, reply.response.lastIndexOf(' ') + 1))
  assert.equal(thinking(), true, 'Even fully visible text is pending until final metadata arrives')
  assert.equal(updates.length, 0)
  await act(async () => { requests[0].send({ type: 'complete', ...reply }); await setImmediate() })
  assert.equal(thinking(), true, 'Final formatting waits for the display drain')
  assert.equal(updates.length, 0)
  await advance(t)
  assert.equal(thinking(), false)
  assert.equal(container.querySelector('.study-streaming-response'), null)
  assert.equal(container.querySelector('.study-conversation h3').textContent, 'Inputs')
  assert.equal(slot.querySelector('strong').textContent, 'Props')
  assert.equal(responseSlot('conversation'), slot)
  assert.equal(slot.parentElement, bubble, 'Signal, streaming and final text share one response bubble')
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
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  const firstPair = phrases()
  await act(async () => { requests[0].send({ type: 'delta', text: 'INCOMPLETE_REPLY ' }); await setImmediate() })
  await advance(t)
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
  assert.equal(updates.length, 0)
  await advance(t, 5)
  assert.equal(updates.length, 1)
  assert.equal(updates[0].resume.conversation.length, 1)
  assert.equal(container.querySelectorAll('.study-transcript .study-message-learner').length, 1)
})

test('switching to Quiz aborts the stream and preserves the unsent draft when returning to conversation', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  await act(async () => { requests[0].send({ type: 'delta', text: 'INCOMPLETE_REPLY' }); await setImmediate() })
  await click('Quiz me')
  await advance(t, 10)
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[0].cancelled, true)
  assert.doesNotMatch(container.textContent, /INCOMPLETE_REPLY|reply was interrupted/)
  await click('Talk it through')
  assert.equal(thinking(), false)
  assert.equal(container.querySelector('textarea').value, 'Are props like function arguments?')
  assert.ok(updates.every((update) => update.resume.conversation.length === 0))
})

test('unmount cancels a pending conversation without committing partial state', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  await enterMessage()
  await click('Send')
  await act(async () => { requests[0].send({ type: 'delta', text: 'Partial' }); await setImmediate() })
  await act(async () => root.render(null))
  await advance(t, 10)
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

test('a new thought follows resumed replies, scrolls once if needed, and formats only after a burst drains', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await act(async () => root.render(createElement(StudySession, { ...props,
    initialThread: { resume: { lesson, conversation: [{ message: 'Earlier thought', response: 'Earlier reply' }] } },
    onThreadUpdate: (_id, update) => updates.push(update),
  })))
  await click('Talk it through')
  updates.length = 0
  const scroll = t.mock.method(dom.HTMLElement.prototype, 'scrollIntoView', () => {})
  t.mock.method(dom.HTMLElement.prototype, 'getBoundingClientRect', () => ({ top: 1000, bottom: 1100 }))
  await enterMessage()
  await click('Send')
  const turn = container.querySelector('.study-current-turn')
  const slot = checkSignal('conversation')
  assert.doesNotMatch(turn.textContent, /Earlier thought|Earlier reply/)
  assert.match(container.querySelector('.study-transcript').textContent, /Earlier thought.*Earlier reply/s)
  assert.equal(container.querySelector('.study-history'), null, 'Recent turns are not duplicated in history')
  assert.equal(scroll.mock.callCount(), 1)
  await act(async () => { requests[0].send({ type: 'delta', text: reply.response }, { type: 'complete', ...reply }); await setImmediate() })
  assert.equal(updates.length, 0)
  await advance(t)
  assert.notEqual(slot.textContent, reply.response)
  assert.equal(slot.querySelector('h3'), null)
  assert.equal(updates.length, 0)
  assert.equal(thinking(), true)
  await advance(t, 4)
  assert.equal(slot.querySelector('h3').textContent, 'Inputs')
  assert.equal(container.querySelectorAll('.study-conversation h3').length, 1)
  assert.equal(responseSlot('conversation'), slot)
  assert.equal(scroll.mock.callCount(), 1, 'Streaming must not fight subsequent user scrolling')
  assert.equal(updates.length, 1)
  assert.equal(updates[0].resume.conversation.length, 2)
  assert.equal(container.querySelectorAll('.study-transcript .study-exchange').length, 2)
})

test('an already visible submitted turn does not scroll, and cancellation during drain does not save', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  updates.length = 0
  const scroll = t.mock.method(dom.HTMLElement.prototype, 'scrollIntoView', () => {})
  t.mock.method(dom.HTMLElement.prototype, 'getBoundingClientRect', () => ({ top: 100, bottom: 200 }))
  await enterMessage()
  await click('Send')
  assert.equal(scroll.mock.callCount(), 0)
  await act(async () => { requests[0].send({ type: 'delta', text: reply.response }, { type: 'complete', ...reply }); await setImmediate() })
  await advance(t)
  await click('Quiz me')
  await advance(t, 10)
  assert.ok(updates.every((update) => update.resume.conversation.length === 0))
  await click('Talk it through')
  assert.equal(container.querySelector('.study-current-turn'), null)
  assert.equal(container.querySelector('textarea').value, 'Are props like function arguments?')
})

function structuredRequests(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = []
  t.mock.method(globalThis, 'fetch', (url, options) => new Promise((resolve) => {
    const body = JSON.parse(options.body)
    assert.equal(body.stream, undefined, 'Structured actions remain non-streaming')
    requests.push({ t, url, body, resolve })
  }))
  return requests
}

async function complete(request, result, status = 200) {
  await act(async () => request.resolve(new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } })))
  await advance(request.t, 10)
  assert.equal(signal(), null)
  assert.equal(thinking(), false)
}

test('initial lesson, simplification, examples and next lesson replace the local Signal and retain earlier work', async (t) => {
  const requests = structuredRequests(t)
  await act(async () => root.render(createElement(StudySession, { ...props, initialThread: undefined })))
  const first = checkSignal('lesson')
  assert.equal(requests[0].body.action, 'lesson')
  await complete(requests[0], lesson)
  assert.match(first.textContent, /Props supply inputs/)

  await click('I lost you')
  const simplified = checkSignal('simplify')
  assert.equal(simplified, first)
  assert.doesNotMatch(simplified.textContent, /Props supply inputs/)
  assert.equal(requests[1].body.action, 'simplify')
  await complete(requests[1], { ...lesson, content: 'A component receives props as inputs.' })
  assert.match(first.textContent, /A component receives/)
  assert.ok(container.querySelector('.study-history'))

  await click('Give me an example')
  const exampleSlot = checkSignal('example')
  await complete(requests[2], { content: 'A greeting receives a name.' })
  assert.match(exampleSlot.textContent, /A greeting receives/)
  await click('Another example')
  assert.equal(checkSignal('example'), exampleSlot)
  assert.doesNotMatch(exampleSlot.textContent, /A greeting receives/)
  await complete(requests[3], { content: 'A card receives a title.' })
  assert.match(exampleSlot.textContent, /A card receives/)
  assert.doesNotMatch(exampleSlot.textContent, /A greeting receives/)

  await click('Continue to next lesson')
  const nextSlot = checkSignal('next')
  assert.doesNotMatch(nextSlot.textContent, /A card receives/)
  await complete(requests[4], { ...lesson, concept: 'Composition', content: 'Combine components into a page.' })
  assert.equal(responseSlot('next'), nextSlot)
  assert.match(nextSlot.textContent, /Combine components/)
  assert.equal(container.querySelector('[data-study-interaction]').dataset.studyInteraction, 'lesson')
})

test('activities and activity feedback yield in place, preserve drafts on failure, and retry locally', async (t) => {
  const requests = structuredRequests(t)
  await act(async () => root.render(createElement(StudySession, props)))
  await click('Let me try it')
  const activitySlot = checkSignal('activity')
  const activity = { title: 'Name an input', instruction: 'Choose an input for a greeting.' }
  await complete(requests[0], activity)
  assert.match(activitySlot.textContent, /Choose an input/)
  await enterMessage('A name is the input.')
  await click('Share response')
  const feedbackSlot = checkSignal('response')
  assert.equal(container.querySelector('textarea').value, 'A name is the input.')
  assert.equal(feedbackSlot.previousElementSibling.tagName, 'FORM')
  await complete(requests[1], { feedback: 'Yes, the name is a prop.', signal: 'applied_understanding' })
  assert.match(feedbackSlot.textContent, /Yes, the name/)
  await click('Share response')
  assert.equal(checkSignal('response'), feedbackSlot)
  assert.doesNotMatch(feedbackSlot.textContent, /Yes, the name/)
  await complete(requests[2], {}, 500)
  assert.match(container.querySelector('[role="alert"]').textContent, /Your response is still here/)
  await click('Try again')
  checkSignal('response')
  await complete(requests[3], { feedback: 'That is a concrete input.', signal: 'applied_understanding' })
  assert.equal(container.querySelector('textarea').value, 'A name is the input.')
  await click('Another activity')
  assert.equal(checkSignal('activity'), activitySlot)
  assert.doesNotMatch(activitySlot.textContent, /Name an input/)
  await complete(requests[4], { title: 'Find another input', instruction: 'Choose a card title.' })
  assert.doesNotMatch(activitySlot.textContent, /Name an input|That is a concrete input/)
  assert.match(activitySlot.textContent, /Choose a card title/)
  assert.ok(container.querySelector('.study-history'))
})

test('quiz generation, next question and recovery use the result slot without changing mastery or retry rules', async (t) => {
  const requests = structuredRequests(t)
  const mastery = []
  await act(async () => root.render(createElement(StudySession, { ...props, updateTopicMastery: (...args) => mastery.push(args) })))
  const question = { topic: 'Props', question: 'What supplies inputs?', answers: [{ text: 'Props', correct: true }, { text: 'State', correct: false }], explanation: 'Props supply inputs.' }
  await click('Quiz me')
  const slot = checkSignal('quiz')
  await complete(requests[0], question)
  assert.match(slot.textContent, /What supplies inputs/)
  await click('Props')
  assert.deepEqual(mastery, [['Props', 80]])
  await click('Next question')
  assert.equal(checkSignal('quiz'), slot)
  assert.doesNotMatch(slot.textContent, /What supplies inputs/)
  await complete(requests[1], { ...question, question: 'Which one comes from the parent?' })
  assert.doesNotMatch(slot.textContent, /What supplies inputs/)
  await click('State')
  assert.equal(checkSignal('evaluation'), slot)
  assert.equal(slot.querySelector('button'), null)
  assert.deepEqual(mastery, [['Props', 80], ['Props', 40]])
  await complete(requests[2], {}, 500)
  assert.match(container.querySelector('[role="alert"]').textContent, /Your answer is saved/)
  await click('Try again')
  assert.equal(checkSignal('evaluation'), slot)
  await complete(requests[3], { feedback: 'Look at where the input starts.', adaptedExplanation: 'A parent passes props to its child.', followUpQuestion: 'What is passed?', followUpAnswers: [{ text: 'The prop', correct: true }] })
  assert.match(slot.textContent, /A parent passes props/)
  assert.equal(slot.querySelector('.study-adapted details').open, false)
  assert.deepEqual(mastery, [['Props', 80], ['Props', 40]], 'Retrying does not apply mastery twice')
})

test('failed next lesson restores the prior interaction and its draft after the Signal clears', async (t) => {
  const requests = structuredRequests(t)
  await renderStudy()
  await enterMessage('Keep this unfinished thought')
  await click('Continue to next lesson')
  checkSignal('next')
  await complete(requests[0], {}, 500)
  assert.equal(container.querySelector('[data-study-interaction]').dataset.studyInteraction, 'conversation')
  assert.equal(container.querySelector('textarea').value, 'Keep this unfinished thought')
  assert.match(container.querySelector('[role="alert"]').textContent, /Your place is saved/)
})

test('Signal has no old placeholder content or reserved height, fits narrow widths and has a static reduced-motion default', async (t) => {
  const css = await readFile(new URL('../src/components/OrbitSignal.css', import.meta.url), 'utf8')
  const [staticStyles, animatedStyles] = css.split('@media (prefers-reduced-motion: no-preference)')
  assert.doesNotMatch(staticStyles, /animation:/)
  assert.match(staticStyles, /\.orbit-signal-line::after[\s\S]*linear-gradient/)
  assert.match(animatedStyles, /animation: orbit-signal-pass/)
  assert.match(css, /width: min\(100%, 260px\)/)
  assert.match(css.split('@media (max-width: 760px)')[1], /width: min\(100%, 220px\)/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.doesNotMatch(css, /visibility: hidden|grid-area|min-height/)
  assert.doesNotMatch(css, /height: \d{3}px|position: fixed/)
  const stylesheet = dom.document.createElement('style')
  stylesheet.textContent = css
  dom.document.head.append(stylesheet)
  const originalWidth = dom.innerWidth
  const originalMotion = dom.happyDOM.settings.device.prefersReducedMotion
  t.after(() => {
    stylesheet.remove()
    dom.happyDOM.setViewport({ width: originalWidth })
    dom.happyDOM.settings.device.prefersReducedMotion = originalMotion
  })
  await act(async () => root.render(createElement(OrbitResponse, { context: 'lesson', pending: true }, 'Previous lesson')))
  dom.happyDOM.setViewport({ width: 1280 })
  // happy-dom has no layout engine for min()/percentage widths. Check the CSS
  // contract above and exercise viewport matching and non-layout styles here.
  assert.equal(dom.matchMedia('(max-width: 760px)').matches, false)
  assert.doesNotMatch(container.textContent, /Previous lesson/)
  dom.happyDOM.setViewport({ width: 320 })
  assert.equal(dom.matchMedia('(max-width: 760px)').matches, true)
  assert.equal(dom.getComputedStyle(signal().querySelector('span')).overflowWrap, 'anywhere')
  dom.happyDOM.settings.device.prefersReducedMotion = 'reduce'
  assert.equal(dom.matchMedia('(prefers-reduced-motion: no-preference)').matches, false)
  assert.equal(dom.getComputedStyle(signal().querySelector('.orbit-signal-line')).height, '1px')
  await act(async () => root.render(createElement(OrbitResponse, { context: 'lesson', pending: false }, 'New lesson')))
  assert.equal(signal(), null)
  assert.equal(responseSlot('lesson').firstElementChild.inert, false)
  assert.notEqual(dom.getComputedStyle(responseSlot('lesson').firstElementChild).visibility, 'hidden')
})

test('four recent exchanges remain chronological while older discussion collapses without duplication', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const requests = mockRequests(t)
  const updates = []
  await renderStudy((_id, update) => updates.push(update))
  for (let i = 1; i <= 6; i += 1) {
    await enterMessage(`Thought ${i}`)
    await click('Send')
    assert.equal(container.querySelector('textarea').value, '')
    assert.match(container.querySelector('.study-current-turn .study-message-learner').textContent, new RegExp(`Thought ${i}`))
    assert.ok(updates.every((update) => !update.resume.conversation.some((exchange) => exchange.message === `Thought ${i}`)))
    await act(async () => {
      requests[i - 1].send({ type: 'delta', text: `Reply ${i}` }, { type: 'complete', response: `Reply ${i}`, signal: 'neutral' })
      await setImmediate()
    })
    await advance(t, 2)
  }
  const recent = [...container.querySelectorAll('.study-transcript .study-message-learner')].map((node) => node.textContent)
  assert.deepEqual(recent, ['Thought 3', 'Thought 4', 'Thought 5', 'Thought 6'])
  const history = container.querySelector('.study-history')
  assert.equal(history.open, false)
  assert.match(history.querySelector('summary').textContent, /· 2/)
  assert.deepEqual([...history.querySelectorAll('.study-message-learner')].map((node) => node.textContent), ['Thought 1', 'Thought 2'])
  assert.doesNotMatch(history.textContent, /Thought [3-6]|Reply [3-6]/)
  assert.ok(container.querySelector('.study-continuation').compareDocumentPosition(history) & 4)
  assert.equal(container.querySelectorAll('.study-message-orbit .study-content').length, 6)
  assert.deepEqual(updates.at(-1).resume.conversation.map((exchange) => exchange.message), ['Thought 5', 'Thought 6'])
  assert.equal(requests.at(-1).body.history.length, 4)
})

test('a validated non-streamed explanation reveals briefly before final formatting and persistence', async (t) => {
  const requests = structuredRequests(t)
  const updates = []
  await act(async () => root.render(createElement(StudySession, { ...props, onThreadUpdate: (_id, update) => updates.push(update) })))
  await click('I lost you')
  const text = '## Another angle\n' + 'A parent gives inputs to its child through props. '.repeat(6)
  const slot = responseSlot('simplify')
  assert.ok(signal())
  await act(async () => requests[0].resolve(new Response(JSON.stringify({ ...lesson, content: text }))))
  assert.equal(signal(), null)
  const partial = slot.querySelector('.study-result-reveal')
  assert.ok(partial)
  assert.equal(partial.getAttribute('aria-hidden'), 'true')
  assert.ok(partial.textContent.length < text.length)
  assert.equal(slot.querySelector('button'), null)
  assert.equal(updates.length, 0)
  assert.equal(thinking(), true)
  await advance(t, 10)
  assert.equal(container.querySelector('.study-result-reveal'), null)
  assert.equal(slot.querySelector('h3').textContent, 'Another angle')
  assert.equal(updates.at(-1).resume.lesson.content, text.trim())
  assert.equal(requests.length, 1)
  assert.ok(button('I lost you'))
})

test('quiz controls wait for the instruction reveal and reduced motion skips structured and conversational pacing', async (t) => {
  const requests = structuredRequests(t)
  await act(async () => root.render(createElement(StudySession, props)))
  await click('Quiz me')
  const question = { topic: 'Props', question: 'Consider a parent that gives a name to a child. Which value supplies an input to the child component?', answers: [{ text: 'The name', correct: true }] }
  await act(async () => requests[0].resolve(new Response(JSON.stringify(question))))
  assert.ok(container.querySelector('.study-result-reveal'))
  assert.equal(button('The name'), undefined)
  await advance(t, 10)
  assert.ok(button('The name'))
  const original = dom.happyDOM.settings.device.prefersReducedMotion
  dom.happyDOM.settings.device.prefersReducedMotion = 'reduce'
  t.after(() => { dom.happyDOM.settings.device.prefersReducedMotion = original })
  await click('Lesson')
  await click('I lost you')
  await act(async () => requests[1].resolve(new Response(JSON.stringify({ ...lesson, content: 'A complete explanation of props. '.repeat(10) }))))
  assert.equal(container.querySelector('.study-result-reveal'), null)
  assert.equal(thinking(), false)
  t.mock.restoreAll()
  const streams = mockRequests(t)
  await click('Talk it through')
  await enterMessage()
  await click('Send')
  await act(async () => { streams[0].send({ type: 'delta', text: reply.response }); await setImmediate() })
  assert.ok(signal())
  assert.equal(container.querySelector('.study-streaming-response'), null)
  await act(async () => { streams[0].send({ type: 'complete', ...reply }); await setImmediate() })
  assert.equal(signal(), null)
  assert.equal(thinking(), false)
  assert.ok(container.querySelector('.study-message-orbit h3'))
})

test('message styling distinguishes ownership without visible labels and remains fluid on mobile', async () => {
  const css = await readFile(new URL('../src/components/StudySession.css', import.meta.url), 'utf8')
  const mobile = css.split('@media (max-width: 760px)')[1]
  assert.match(css, /study-message-learner \{[^}]*align-self: flex-end;[^}]*max-width: 86%/)
  assert.match(css, /study-message-orbit \{[^}]*align-self: flex-start;[^}]*radial-gradient[^}]*box-shadow/)
  assert.match(css, /study-message \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere/)
  assert.match(mobile, /study-message-learner \{ max-width: 92%/)
  assert.match(mobile, /study-message-orbit \{ padding: 14px/)
  assert.doesNotMatch(css, /position: (?:fixed|sticky)/)
  await act(async () => root.render(createElement(StudySession, { ...props,
    initialThread: { resume: { lesson, conversation: [{ message: 'My input', response: 'A helpful explanation.' }] } },
  })))
  await click('Talk it through')
  const transcript = container.querySelector('.study-transcript')
  assert.equal(transcript.querySelectorAll('.study-message-learner').length, 1)
  assert.equal(transcript.querySelectorAll('.study-message-orbit').length, 1)
  assert.equal(transcript.querySelectorAll('img').length, 0)
  assert.doesNotMatch(transcript.textContent, /Your thought|Orbit response|You|Orbit/)
  assert.equal(container.querySelector('textarea').getAttribute('rows'), '2')
  assert.ok(container.querySelector('label[for="' + container.querySelector('textarea').id + '"]'))
})
