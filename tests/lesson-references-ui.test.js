import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { act, createElement } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { materialReferenceKey } from '../src/services/lessonReferences.js'

let dom, server, createRoot, StudySession, root, container
const globals = new Map()
const lesson = { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs to components.' }
const course = { name: 'React', mastery: { overall: 0, topics: {} }, files: [
  { name: 'notes.pdf', type: 'application/pdf', size: 12, summary: 'Props pass data to a child.', kind: 'resource', analyzed: true },
  { name: 'board.png', type: 'image/png', size: 10 },
] }
const props = { course, threadId: 'one', mastery: 0, initialThread: { resume: { lesson } }, updateTopicMastery() {} }
const reply = { response: 'Look at the value passed to the child. What would you try?', signal: 'neutral',
  anchor: { type: 'analogy', topic: 'Props', summary: 'PRIVATE reference text', confidence: 'high' } }

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, FileReader: dom.FileReader, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const match = dom.matchMedia.bind(dom)
  dom.matchMedia = query => { const result = match(query); if (query.includes('prefers-reduced-motion')) Object.defineProperty(result, 'matches', { value: true }); return result }
  ;({ createRoot } = await import('react-dom/client'))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
})
beforeEach(() => { container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container) })
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
})

const buttons = label => [...container.querySelectorAll('button')].filter(button => button.textContent === label)
const click = async label => { const button = buttons(label)[0]; assert.ok(button, label); await act(async () => button.click()) }
const refs = () => container.querySelectorAll('.lesson-reference-list li')
const png = (name = 'homework.png') => new dom.File([Buffer.from('\x89PNG\r\n\x1a\nfixture', 'binary')], name, { type: 'image/png' })
const pdf = () => new dom.File(['%PDF-1.4 fixture'], 'questions.pdf', { type: 'application/pdf' })
async function render(extra = {}) { await act(async () => root.render(createElement(StudySession, { ...props, ...extra }))) }
async function attach(files) {
  if (!container.querySelector('input[aria-label="Choose lesson references"]')) await click('Add reference')
  await act(async () => {
    const input = container.querySelector('input[aria-label="Choose lesson references"]')
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.dispatchEvent(new dom.Event('change', { bubbles: true }))
    await dom.happyDOM.waitUntilComplete()
  })
}
async function choose(material) {
  if (!container.querySelector('.lesson-reference-course select')) await click('Add reference')
  await act(async () => {
    const select = container.querySelector('.lesson-reference-course select')
    select.value = materialReferenceKey(material)
    select.dispatchEvent(new dom.Event('change', { bubbles: true }))
    await dom.happyDOM.waitUntilComplete()
  })
}
async function send(text) {
  await act(async () => {
    const field = container.querySelector('.study-composer textarea')
    Object.getOwnPropertyDescriptor(dom.HTMLTextAreaElement.prototype, 'value').set.call(field, text)
    field.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  await click('Send')
}
function requests(t, { failNext = false, failConversation = false } = {}) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, body })
    if (url === '/api/respond-to-study-message') {
      if (failConversation) return new Response('{}', { status: 502 })
      return new Response([{ type: 'delta', text: reply.response }, { type: 'complete', ...reply }].map(event => JSON.stringify(event) + '\n').join(''), { headers: { 'Content-Type': 'application/x-ndjson' } })
    }
    if (url === '/api/generate-study-question') return new Response(JSON.stringify({ topic: 'Props', question: 'What passes inputs?', answers: [{ text: 'Props', correct: true }], explanation: 'Props pass inputs.' }))
    if (url === '/api/study-activity') return new Response(JSON.stringify({ title: 'Predict', topic: 'Props', instruction: 'Predict the displayed name.', activityType: 'predict', successCriteria: 'Name is an input.' }))
    assert.equal(url, '/api/generate-study-lesson')
    if (failNext && body.action === 'next') return new Response('{}', { status: 502 })
    return new Response(JSON.stringify({ ...lesson, concept: body.action === 'next' ? 'New concept' : lesson.concept,
      content: body.action === 'simplify' ? 'PRIVATE reference explanation' : lesson.content, visual: { type: 'none' } }))
  })
  return calls
}

test('image and PDF attach locally, survive repeated streamed messages and removal, and never publish reference work', async t => {
  const calls = requests(t), updates = []
  await render({ onThreadUpdate: (_id, value) => updates.push(value) })
  await attach([png(), pdf()])
  assert.equal(refs().length, 2)
  assert.equal(calls.length, 0, 'File selection alone must not call AI')
  const updateCount = updates.length
  await click('Work through it')
  assert.match(container.querySelector('.study-composer textarea').value, /without giving me the answer/)
  assert.equal(calls.length, 0, 'Next-step intent prepares an editable draft')
  await send('I do not understand question 3.')
  await send('What should I try first?')
  assert.equal(calls.length, 2)
  for (const { body } of calls) {
    assert.deepEqual(body.lesson, lesson)
    assert.deepEqual(body.lessonReferences.map(item => item.type), ['image/png', 'application/pdf'])
  }
  assert.equal(calls[1].body.history.length, 1)
  assert.equal(updates.length, updateCount, 'Reference-derived discussion and anchors remain temporary')
  await act(async () => container.querySelector('[aria-label="Remove reference homework.png"]').click())
  assert.equal(refs().length, 1)
  await send('Explain the worksheet.')
  assert.deepEqual(calls.at(-1).body.lessonReferences.map(item => item.name), ['questions.pdf'])
  assert.doesNotMatch(JSON.stringify(calls.at(-1).body.learningAnchors || []), /PRIVATE/)
})

test('course selection sends a saved summary or available original, without duplicating or deleting the course material', async t => {
  const calls = requests(t), original = structuredClone(course.files)
  await render({ getMaterialFile: material => material.name === 'board.png' ? png('board.png') : undefined })
  await choose(course.files[0]); await choose(course.files[1])
  assert.equal(refs().length, 2)
  assert.match(refs()[0].textContent, /Saved summary only/)
  assert.equal(calls.length, 0)
  await click('Talk it through'); await send('What does this mean?')
  assert.equal(calls[0].body.lessonReferences[0].summary, course.files[0].summary)
  assert.match(calls[0].body.lessonReferences[1].data, /^data:image\/png/)
  await act(async () => container.querySelector('[aria-label="Remove reference notes.pdf"]').click())
  assert.deepEqual(course.files, original)
  assert.equal(refs().length, 1)
})

test('unsupported, oversized, mismatched and unreadable files preserve successful references and lesson state', async t => {
  const calls = requests(t)
  await render()
  await attach([png(), new dom.File(['bad'], 'bad.exe'), new dom.File(['bad'], 'broken.pdf', { type: 'application/pdf' }), pdf()])
  assert.equal(refs().length, 2)
  assert.match(container.querySelector('[role="alert"]').textContent, /bad.exe.*broken.pdf/)
  const large = new dom.File(['large'], 'large.png', { type: 'image/png' })
  Object.defineProperty(large, 'size', { value: 4 * 1024 * 1024 })
  await attach([large])
  assert.match(container.querySelector('[role="alert"]').textContent, /3 MB/)
  t.mock.method(dom.FileReader.prototype, 'readAsDataURL', function () { this.onerror() })
  await attach([png('unreadable.png')])
  assert.match(container.querySelector('[role="alert"]').textContent, /Could not read/)
  assert.equal(refs().length, 2)
  assert.ok(container.textContent.includes(lesson.content))
  assert.equal(calls.length, 0)
})

test('references survive thread hiding, stay out of new threads, and clear after successful next lesson', async t => {
  const calls = requests(t)
  await render(); await attach([pdf()])
  await render({ active: false }); await render({ active: true })
  assert.equal(refs().length, 1)
  await click('You lost me')
  assert.equal(calls.at(-1).body.lessonReferences.length, 1)
  await click('Continue to next lesson')
  assert.equal(refs().length, 0)
  assert.equal(calls.at(-1).body.lessonReferences, undefined)
  assert.deepEqual(calls.at(-1).body.lesson, lesson, 'Next lesson cannot inherit reference-derived teaching')
  await attach([png()])
  await render({ key: 'new', threadId: 'two' })
  assert.equal(refs().length, 0)
  await render({ key: 'refreshed' })
  assert.equal(refs().length, 0)
})

test('failed conversation and failed continuation keep attachments retryable', async t => {
  requests(t, { failNext: true, failConversation: true })
  await render(); await attach([pdf()]); await click('Talk it through')
  await send('Help with question 3')
  assert.equal(refs().length, 1)
  assert.equal(container.querySelector('.study-composer textarea').value, 'Help with question 3')
  await click('Continue to next lesson')
  assert.equal(refs().length, 1)
  assert.ok(container.textContent.includes('could not prepare the next lesson'))
})

test('example, activity, quiz and recovery tools still carry current references', async t => {
  const calls = requests(t)
  await render(); await attach([pdf()])
  await click('Give me an example'); await click('Let me try it'); await click('Quiz me')
  assert.equal(calls.length, 3)
  for (const { body } of calls) assert.equal(body.lessonReferences[0].name, 'questions.pdf')
  assert.ok(container.querySelector('[data-study-interaction="quiz"]'))
})

test('reference controls retain compact wrapping and accessible controls at responsive viewport sizes', async () => {
  const css = await readFile(new URL('../src/components/StudySession.css', import.meta.url), 'utf8')
  for (const width of [1440, 768, 390, 320]) {
    await act(async () => dom.happyDOM.setWindowSize({ width, height: 900 }))
    await render({ key: width }); await attach([png('long_homework_name_'.repeat(8) + '.png')])
    assert.equal(refs().length, 1)
    assert.equal(buttons('Add reference')[0].getAttribute('aria-expanded'), 'true')
    assert.ok(container.querySelector('[aria-label^="Remove reference"]'))
    assert.equal(buttons('Continue to next lesson')[0].disabled, false)
  }
  // Happy DOM does not lay out pixels: these are CSS contracts, not browser measurements.
  assert.match(css, /\.lesson-reference-list li \{[^}]*minmax\(0, 1fr\)/)
  assert.match(css, /\.lesson-reference-actions \{[^}]*flex-wrap: wrap/)
  assert.match(css, /\.lesson-references \{[^}]*overflow-wrap: anywhere/)
  assert.match(css, /\.lesson-reference-course select \{[^}]*min-width: 0/)
})
