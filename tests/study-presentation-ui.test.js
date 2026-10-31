import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { act, createElement } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

let dom, server, createRoot, StudySession, StudyThreads, root, container
const globals = new Map()
const course = { name: 'React', mastery: { overall: 40, topics: {} } }
const lesson = { topic: 'State', concept: 'Remembering a value', content: 'State remembers a value between renders.' }
const visual = { type: 'generated_image', purpose: 'Follow a state update into a render.', focus: 'State',
  data: [{ label: 'State', detail: 'Remembers a value.' }, { label: 'Render', detail: 'Shows the current value.' }] }
const question = { topic: 'State', question: 'What remembers the value?', answers: [{ text: 'State', correct: true }, { text: 'A prop', correct: false }], explanation: 'State is component memory.' }
const evaluation = { feedback: 'A prop is supplied from outside.', adaptedExplanation: 'State is the component’s own memory.',
  followUpQuestion: 'Where does the component remember its count?', followUpAnswers: [{ text: 'In state', correct: true }, { text: 'In its parent’s prop', correct: false }] }
const activity = { title: 'Change a count', instruction: 'Describe what changes after a counter is clicked.', topic: 'State', type: 'prediction' }
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const image = () => container.querySelector('.lesson-generated-image')
const mode = () => container.querySelector('.study-session').dataset.presentationMode
const button = (label) => [...container.querySelectorAll('button')].find((element) => element.textContent === label)
const click = async (label) => { assert.ok(button(label), `Missing ${label}`); await act(async () => button(label).click()) }

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
  StudyThreads = (await server.ssrLoadModule('/src/components/StudyThreads.jsx')).default
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

async function mount(t, extra = {}) {
  t.mock.method(dom, 'matchMedia', (query) => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }))
  await act(async () => root.render(createElement(StudySession, { course, threadId: 'one', mastery: 40,
    initialThread: { resume: { lesson } }, setMastery: () => assert.fail('No course mastery change'),
    updateTopicMastery: () => assert.fail('No topic mastery change'), ...extra })))
}

async function type(value) {
  await act(async () => {
    const field = container.querySelector('textarea')
    Object.getOwnPropertyDescriptor(dom.HTMLTextAreaElement.prototype, 'value').set.call(field, value)
    field.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
}

test('thread disclosure dismisses on Escape, outside pointer and focus exit, and returns focus after switching', async () => {
  const switches = []
  const threads = ['one', 'two'].map(id => ({ id, title: `Thread ${id}`, courseName: course.name, context: 'lesson', summary: 'A saved lesson.', createdAt: '2026-10-30T10:00:00Z' }))
  await act(async () => root.render(createElement(StudyThreads, { courses: [course], threads, activeId: 'one', onSwitch: id => switches.push(id) })))
  const selector = container.querySelector('details')
  const summary = selector.querySelector('summary')
  assert.equal(selector.open, false)
  assert.match(summary.textContent, /Thread one/)
  assert.equal(selector.querySelector('[aria-current] .thread-current').textContent, 'Current')

  selector.open = true
  selector.querySelector('button').focus()
  await act(async () => selector.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(selector.open, false)
  assert.equal(dom.document.activeElement, summary)
  assert.deepEqual(switches, [])

  selector.open = true
  await act(async () => dom.document.body.dispatchEvent(new dom.PointerEvent('pointerdown', { bubbles: true })))
  assert.equal(selector.open, false)

  selector.open = true
  await act(async () => container.querySelector('.study-thread-new').focus())
  assert.equal(selector.open, false)

  selector.open = true
  await act(async () => selector.querySelector('button').click())
  assert.deepEqual(switches, ['two'])
  assert.equal(selector.open, false)
  assert.equal(dom.document.activeElement, summary)
})

test('New thread keeps its labelled disclosure and existing course/topic submission', async () => {
  const creations = []
  await act(async () => root.render(createElement(StudyThreads, { courses: [course], threads: [], onCreate: (...args) => creations.push(args) })))
  const trigger = container.querySelector('.study-thread-new')
  assert.equal(trigger.textContent, 'New thread')
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  await act(async () => trigger.click())
  const form = container.querySelector('form')
  assert.equal(trigger.getAttribute('aria-controls'), form.id)
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  const field = form.querySelector('input')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(field, '  Events  ')
    field.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  await act(async () => form.dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })))
  assert.deepEqual(creations, [[course, 'Events']])
  assert.equal(container.querySelector('form'), null)
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
})

test('Show me retains I lost you explanation and its request after That helps and tool switches', async (t) => {
  const images = []
  const explanation = 'Think of state as a notebook. A click changes the notebook before React updates the screen.'
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path === '/api/generate-lesson-image') { images.push(JSON.parse(options.body)); return json({ url: 'https://images.example.test/recovery.webp' }) }
    return json({ ...lesson, content: explanation })
  })
  await mount(t)
  await click('I lost you')
  assert.equal(mode(), 'recover')
  await click('Show me')
  assert.equal(mode(), 'visual')
  assert.ok(container.querySelector('.study-active-panel').textContent.includes(explanation))
  assert.match(images[0].visual.recoveryContext, /notebook before React updates/)
  await click('Lesson')
  await click('That helps')
  await click('Talk it through')
  await click('Show me')
  assert.equal(images.length, 1)
})

test('Show me from incorrect quiz answers preserves adapted explanation, selected answers and original scoring', async (t) => {
  const images = [], scores = []
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path === '/api/generate-lesson-image') { images.push(JSON.parse(options.body)); return json({ url: 'https://images.example.test/quiz.webp' }) }
    return json(path === '/api/generate-study-question' ? question : evaluation)
  })
  await mount(t, { updateTopicMastery: (...args) => scores.push(args) })
  await click('Quiz me')
  await click('A prop')
  assert.deepEqual(scores, [['State', 40]])
  await click('Show me')
  assert.equal(mode(), 'visual')
  assert.ok(container.querySelector('.study-active-panel').textContent.includes(evaluation.adaptedExplanation))
  assert.match(images[0].visual.recoveryContext, /A prop/)
  assert.match(images[0].lesson.content, /component.*own memory/)
  assert.deepEqual(scores, [['State', 40]])
  await click('Quiz me')
  assert.equal(mode(), 'recover')
  assert.match(container.textContent, /Your answer: A prop/)
  await click('Show me')
  assert.equal(images.length, 1)
  await click('Quiz me')
  await click(evaluation.followUpAnswers[1].text)
  await click('Show me')
  assert.equal(images.length, 2)
  assert.ok(images[1].visual.recoveryContext.includes(evaluation.followUpAnswers[1].text))
  assert.deepEqual(scores, [['State', 40], ['State', 40]])
  await click('Quiz me')
  await click('In state')
  assert.deepEqual(scores, [['State', 40], ['State', 40], ['State', 70]])
})

test('activity misconception is preserved in Show me and the unchanged draft returns without being completed', async (t) => {
  const images = []
  const feedback = { feedback: 'State stores the new value; rendering displays it.', signal: 'misconception' }
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    const body = JSON.parse(options.body)
    if (path === '/api/generate-lesson-image') { images.push(body); return json({ url: 'https://images.example.test/activity.webp' }) }
    return json(body.action === 'generate' ? activity : feedback)
  })
  await mount(t)
  await click('Let me try it')
  await type('The text stores the count.')
  await act(async () => container.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })))
  await click('Show me')
  assert.equal(mode(), 'visual')
  assert.match(images[0].visual.recoveryContext, /text stores the count/)
  assert.match(images[0].visual.recoveryContext, /State stores the new value/)
  await click('Let me try it')
  assert.equal(mode(), 'recover')
  assert.equal(container.querySelector('textarea').value, 'The text stores the count.')
  await click('Show me')
  assert.equal(images.length, 1)
})

test('continuing clears explicit image and recovery state; a late previous image cannot replace the new lesson', async (t) => {
  const images = []
  let failNext = true
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    const body = JSON.parse(options.body)
    if (path === '/api/generate-lesson-image') return new Promise((resolve) => images.push({ body, resolve }))
    if (body.action === 'simplify') return json({ ...lesson, content: 'A simpler notebook explanation.' })
    return failNext ? new Response('{}', { status: 503 }) : json({ ...lesson, concept: 'Event handlers', content: 'A handler responds to a click.' })
  })
  await mount(t)
  await click('I lost you')
  await click('Show me')
  await click('Continue to next lesson')
  assert.equal(mode(), 'visual', 'Failed continuation keeps the current explicit visual')
  assert.match(container.querySelector('.study-active-panel').textContent, /simpler notebook/)
  failNext = false
  await click('Try next lesson again')
  assert.equal(mode(), 'focus')
  assert.equal(image(), null)
  assert.match(container.querySelector('.study-active-panel').textContent, /handler responds/)
  await click('Show me')
  assert.equal(images.length, 2)
  assert.equal(images[1].body.lesson.concept, 'Event handlers')
  assert.equal(images[1].body.visual.recoveryContext, undefined)
  await act(async () => { images[1].resolve(json({ url: 'https://images.example.test/new.webp' })); await setImmediate() })
  await act(async () => { images[0].resolve(json({ url: 'https://images.example.test/old.webp' })); await setImmediate() })
  assert.equal(image().src, 'https://images.example.test/new.webp')
})

test('I lost you enters recover while pending, retains it after completion, and That helps changes only presentation', async (t) => {
  let complete
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  const saved = []
  await mount(t, { onThreadUpdate: (_id, update) => saved.push(update) })
  assert.equal(mode(), 'focus')
  await click('I lost you')
  assert.equal(mode(), 'recover')
  await act(async () => { complete(json({ ...lesson, content: 'Think of state as the component’s notebook.' })); await setImmediate() })
  assert.equal(mode(), 'recover')
  assert.equal(container.querySelectorAll('.study-primary-action').length, 1)
  assert.equal(button('That helps').className, 'study-primary-action')
  const savedBefore = JSON.stringify(saved)
  await click('That helps')
  assert.equal(mode(), 'focus')
  assert.equal(dom.document.activeElement, container.querySelector('.study-active-panel'))
  assert.equal(JSON.stringify(saved), savedBefore, 'A presentation acknowledgment must not change saved learning')
})

test('visual loading, decode, failure and retry keep requests deduplicated and never move keyboard focus', async (t) => {
  let complete
  const calls = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  await mount(t, { initialThread: { resume: { lesson: { ...lesson, visual } } } })
  assert.equal(mode(), 'visual')
  assert.ok(container.querySelector('.lesson-image-surface'))
  button('I lost you').focus()
  const focused = dom.document.activeElement
  await act(async () => { complete(json({ url: 'https://images.example.test/lesson.webp' })); await setImmediate() })
  assert.equal(mode(), 'visual')
  await act(async () => image().dispatchEvent(new dom.Event('load')))
  assert.equal(mode(), 'visual')
  assert.equal(dom.document.activeElement, focused)
  await act(async () => image().dispatchEvent(new dom.Event('error')))
  assert.equal(mode(), 'focus')
  assert.equal(dom.document.activeElement, focused)
  assert.equal(image(), null)
  assert.ok(button('Retry visual'))
  await click('Talk it through')
  await click('Lesson')
  assert.equal(mode(), 'focus')
  assert.equal(calls.mock.callCount(), 1)
  await click('Retry visual')
  assert.equal(mode(), 'visual')
  assert.equal(calls.mock.callCount(), 2)
  await act(async () => { complete(json({ url: 'https://images.example.test/retried.webp' })); await setImmediate() })
})

test('activity becomes primary, misconception feedback enters recover, and editing keeps the same textarea and draft', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => JSON.parse(options.body).action === 'generate'
    ? json(activity) : json({ feedback: 'Separate the stored value from the rendered text.', signal: 'misconception' }))
  await mount(t)
  await click('Let me try it')
  assert.equal(mode(), 'practice')
  assert.equal(button('Share response').className, 'study-primary-action')
  assert.equal(container.querySelector('.study-lesson-reference').open, false)
  await type('Only the prop changes.')
  const field = container.querySelector('textarea')
  await click('Share response')
  assert.equal(mode(), 'recover')
  assert.ok(container.querySelector('.study-activity-feedback'))
  field.focus()
  await type('The state changes, then the text renders.')
  assert.equal(mode(), 'practice')
  assert.equal(container.querySelector('textarea'), field)
  assert.equal(dom.document.activeElement, field)
  await click('Lesson')
  assert.equal(mode(), 'focus')
  await click('Let me try it')
  assert.equal(container.querySelector('textarea').value, 'The state changes, then the text renders.')
})

test('quiz recovery is local, follow-up success returns to check, and existing score writes remain unchanged', async (t) => {
  const scores = []
  let completeQuestion
  let firstQuestion = true
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url !== '/api/generate-study-question') return json(evaluation)
    return firstQuestion ? new Promise((resolve) => { completeQuestion = resolve }) : json(question)
  })
  await mount(t, { updateTopicMastery: (...args) => scores.push(args) })
  await click('Quiz me')
  assert.equal(mode(), 'check')
  assert.equal(container.querySelector('.study-question-number').textContent, 'Question 1')
  assert.equal(container.querySelector('.study-stages [aria-current]').textContent, 'Practice · Question 1')
  await act(async () => { firstQuestion = false; completeQuestion(json(question)); await setImmediate() })
  await click('A prop')
  assert.equal(mode(), 'recover')
  assert.ok(container.querySelector('.study-adapted'))
  assert.deepEqual(scores, [['State', 40]])
  await click('Lesson')
  assert.equal(mode(), 'focus')
  await click('Quiz me')
  assert.equal(mode(), 'recover')
  await click('In state')
  assert.equal(mode(), 'check')
  assert.deepEqual(scores, [['State', 40], ['State', 70]])
  assert.ok(container.querySelector('.study-lesson-reference .study-content').textContent.includes(lesson.content))
  await click('Next question')
  assert.equal(mode(), 'check')
  assert.equal(container.querySelector('.study-adapted'), null)
})

test('a successful continuation clears recovery while failure retains the current lesson and its presentation', async (t) => {
  let failNext = true
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (JSON.parse(options.body).action === 'simplify') return json({ ...lesson, content: 'State is a little notebook.' })
    return failNext ? new Response('{}', { status: 502 }) : json({ ...lesson, concept: 'Responding to an event', content: 'A click can request a state update.' })
  })
  await mount(t)
  await click('I lost you')
  assert.equal(mode(), 'recover')
  await click('Continue to next lesson')
  assert.equal(mode(), 'recover')
  assert.ok(container.textContent.includes('State is a little notebook.'))
  failNext = false
  await click('Try next lesson again')
  assert.equal(mode(), 'focus')
  assert.ok(container.textContent.includes('Responding to an event'))
  assert.equal(button('That helps'), undefined)
  assert.equal(container.querySelector('.study-subject').textContent, 'ReactLesson 2')
  assert.ok(container.querySelector('.study-history'))
})

test('conversation recovery keeps earlier discussion accessible and releases recovery after a new understanding signal', async (t) => {
  let signal = 'confusion'
  t.mock.method(globalThis, 'fetch', async () => {
    const reply = { response: 'State remembers the count; rendering displays it.', signal }
    return new Response([JSON.stringify({ type: 'delta', text: reply.response }), JSON.stringify({ type: 'complete', ...reply })].join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } })
  })
  await mount(t, { initialThread: { resume: { lesson, conversation: [{ message: 'What is state?', response: 'It is component memory.', signal: 'neutral' }] } } })
  await click('Talk it through')
  assert.equal(mode(), 'focus')
  await type('I still confuse memory and the text.')
  await click('Send')
  assert.equal(mode(), 'recover')
  assert.ok(container.querySelector('.study-recovery-history').textContent.includes('What is state?'))
  assert.equal(container.querySelector('.study-recovery-history').open, false)
  assert.equal(container.querySelectorAll('.study-transcript .study-exchange:not([hidden])').length, 1)
  signal = 'understanding'
  await type('The state changes before the text updates.')
  await click('Send')
  assert.equal(mode(), 'focus')
  assert.equal(container.querySelector('.study-recovery-history'), null)
  assert.equal(container.querySelectorAll('.study-transcript .study-exchange:not([hidden])').length, 3)
})
