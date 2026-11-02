import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { emptyLearnerMemory, loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'
import analysisHandler from '../api/analyze-course.js'
import lessonHandler from '../api/generate-study-lesson.js'
import { biologyAnalysis, biologyCourse } from './fixtures/courseLaunch.js'

let dom, server, createRoot, App, root, container
const globals = new Map()
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const seed = (course = biologyCourse) => saveLearnerMemory({ ...emptyLearnerMemory(), courses: [course],
  learningPreferences: { status: 'saved', profile: { visualPreference: 'on_request', reentrySupport: 'continue' } } }, dom.localStorage)
const read = () => loadLearnerMemory(dom.localStorage)
const render = async () => act(async () => root.render(createElement(StrictMode, null, createElement(App))))
const reload = async () => { await act(async () => root.unmount()); root = createRoot(container); await render() }
const click = async element => { assert.ok(element); await act(async () => element.click()) }
const button = (label, scope = container) => [...scope.querySelectorAll('button')].find(item => item.textContent === label)
const openSpace = async () => click(container.querySelector('.shell-spaces button'))
const type = async (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
  input.dispatchEvent(new dom.Event('input', { bubbles: true }))
})
const pdf = name => new dom.File(['%PDF-fixture'], name, { type: 'application/pdf', lastModified: 123 })
const upload = async files => act(async () => {
  const transfer = new dom.DataTransfer()
  files.forEach(file => transfer.items.add(file))
  const input = container.querySelector('input[type="file"]')
  input.files = transfer.files
  input.dispatchEvent(new dom.Event('change', { bubbles: true }))
  await dom.happyDOM.waitUntilComplete()
})
const setKind = async kind => act(async () => {
  const select = container.querySelector('.course-material-controls select')
  select.value = kind
  select.dispatchEvent(new dom.Event('change', { bubbles: true }))
})
const analyze = name => act(async () => {
  const action = container.querySelector('.course-material-list button[aria-label$=": ' + name + '"]')
  assert.ok(action)
  assert.equal(action.disabled, false)
  action.click()
  await dom.happyDOM.waitUntilComplete()
})

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, localStorage: dom.localStorage,
    navigator: dom.navigator, HTMLElement: dom.HTMLElement, FileReader: dom.FileReader, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  App = (await server.ssrLoadModule('/src/App.jsx')).default
})
beforeEach(t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 1, 12) })
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  dom.localStorage.clear()
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

function lessonMock(t) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/generate-study-lesson')
    const body = JSON.parse(options.body)
    requests.push(body)
    return json({ topic: body.learnerPosition.currentTopic, concept: 'One useful idea', content: 'Here is one useful idea to explore.' })
  })
  return requests
}

test('no material opens the optional manual flow; blank and whitespace input are disabled without native validation', async t => {
  seed({ name: 'Biology 101', type: 'class', files: [] })
  const requests = lessonMock(t)
  await render(); await openSpace()
  assert.equal(container.querySelector('.space-recommendation'), null)
  const form = container.querySelector('.space-topic-entry form')
  const field = form.querySelector('input')
  assert.match(container.querySelector('.space-topic-entry h2').textContent, /What are you working on right now/)
  assert.equal(form.noValidate, true)
  assert.equal(field.required, false)
  assert.equal(form.querySelector('button').disabled, true)
  await type(field, '   ')
  assert.equal(form.querySelector('button').disabled, true)
  await act(async () => form.dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(requests.length, 0)
  await type(field, '  Osmosis  ')
  await click(form.querySelector('button'))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].learnerPosition.currentTopic, 'Osmosis')
  assert.equal(read().threads[0].requestedTopic, 'Osmosis')
})

test('parsed course is recommendation-first with visible material, bounded button options and no background requests', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', () => assert.fail('Opening a space is local'))
  await render(); await openSpace()
  const page = container.querySelector('.space-page')
  assert.equal(page.querySelector('.space-recommendation h3').textContent, 'Photosynthesis')
  assert.match(page.querySelector('.space-recommendation p').textContent, /Photosynthesis Quiz.*Nov 5/)
  assert.ok(page.textContent.indexOf('Recommended next') < page.textContent.indexOf('Study something else'))
  assert.equal(page.querySelectorAll('.space-starting-options button').length, 2)
  assert.match(page.querySelector('.course-material-list').textContent, /BIO101_Syllabus.pdf.*Added/)
  assert.equal(page.querySelector('input[type="file"]').hidden, true)
  assert.equal(page.querySelector('input[type="file"]').multiple, true)
  assert.equal(page.querySelector('.space-details').open, false)
  assert.doesNotMatch(page.textContent, /Try this|New study thread|Use this starting point|The syllabus does not clearly show/)
})

test('a compact topic option starts that exact topic with syllabus context while preserving mastery and corrections', async t => {
  seed()
  const before = read().courses[0]
  const requests = lessonMock(t)
  await render(); await openSpace()
  const option = [...container.querySelectorAll('.space-starting-options button')].find(item => item.textContent.startsWith('Cellular Respiration'))
  await click(option)
  assert.equal(requests[0].learnerPosition.currentTopic, 'Cellular Respiration')
  assert.deepEqual(requests[0].upcomingWork, before.upcomingWork)
  assert.deepEqual(read().courses[0].mastery, before.mastery)
  assert.equal(read().courses[0].learnerPosition, undefined)
})

test('create class, upload syllabus, and click its recommendation crosses the real client and API handlers with mocked model output', async t => {
  const requests = [], modelPrompts = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    if (url === 'https://api.meta.ai/v1/responses') {
      modelPrompts.push(body.input)
      const result = Array.isArray(body.input) ? biologyAnalysis : { topic: 'Photosynthesis', concept: 'Stored energy', content: 'Plants store light energy in sugar.', visual: { type: 'none' } }
      return json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] })
    }
    requests.push({ url, body })
    assert.ok(['/api/analyze-course', '/api/generate-study-lesson'].includes(url))
    const res = { code: 200, status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
    await (url === '/api/analyze-course' ? analysisHandler : lessonHandler)({ method: 'POST', body }, res)
    return json(res.body, res.code)
  })
  await render()
  await click(button('I’m taking a class'))
  await type(container.querySelector('.new-space-page input'), 'Biology 101')
  await click(button('Create space'))
  await setKind('syllabus')
  await upload([pdf('BIO101_Syllabus.pdf')])
  assert.equal(requests.length, 0, 'Attaching is local; reading a syllabus requires an explicit action')
  await analyze('BIO101_Syllabus.pdf')
  assert.match(container.querySelector('.course-material-list').textContent, /BIO101_Syllabus.pdf/)
  assert.equal(container.querySelectorAll('.space-coming-up .upcoming-list li').length, 3)
  assert.equal(container.querySelector('.space-recommendation h3').textContent, 'Photosynthesis')
  assert.equal(requests.length, 1)
  assert.match(requests[0].body.fileData, /^data:application\/pdf;base64,/)
  await click(container.querySelector('.space-recommendation button'))
  assert.equal(requests.length, 2)
  assert.equal(requests[1].body.learnerPosition.currentTopic, 'Photosynthesis')
  assert.deepEqual(requests[1].body.upcomingWork, biologyAnalysis.upcomingWork)
  assert.equal(requests[1].body.nextTask, biologyAnalysis.nextRecommendedAction)
  assert.match(modelPrompts[1], /Use this exact topic label: "Photosynthesis"/)
  assert.equal(container.querySelector('.study-room:not([hidden]) h1').textContent, 'Photosynthesis')
  assert.equal(read().threads.length, 1)
})

test('multiple PDFs append, analyze only on request, survive refresh and leave syllabus dates alone', async t => {
  seed()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async url => { assert.equal(url, '/api/analyze-course'); calls++; return json({ summary: 'Diffusion moves particles down a concentration gradient.', importantTopics: ['Diffusion'], upcomingWork: [{ title: 'Must not import', date: '2026-11-03' }] }) })
  await render(); await openSpace()
  await upload([pdf('Notes.pdf'), pdf('Guide.pdf')])
  assert.equal(calls, 0)
  assert.equal(container.querySelectorAll('.course-material-list li').length, 3)
  await analyze('Notes.pdf'); await analyze('Guide.pdf')
  assert.equal(calls, 2)
  assert.equal(read().courses[0].files[1].summary, 'Diffusion moves particles down a concentration gradient.')
  assert.equal(read().courses[0].upcomingWork.length, 3)
  assert.equal(read().courses[0].mastery.overall, 40)
  await reload(); await openSpace()
  await upload([pdf('Notes.pdf'), pdf('Guide.pdf')])
  assert.equal(calls, 2)
  assert.match(container.querySelector('.course-material-status').textContent, /already added/)
  await click(button('Calendar', container.querySelector('.shell-destinations')))
  assert.equal(container.querySelectorAll('.calendar-page .upcoming-list li').length, 3)
  assert.doesNotMatch(container.textContent, /Must not import/)
})

test('adding later and reselecting pending PDFs after refresh preserves metadata without automatic analysis', async t => {
  seed()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json({ summary: 'Water crosses a membrane.', importantTopics: ['Osmosis'] }) })
  await render(); await openSpace(); await upload([pdf('Notes.pdf')])
  await reload(); await openSpace()
  assert.equal(container.querySelector('[aria-label="Use PDF for learning: Notes.pdf"]').disabled, true)
  assert.match(container.querySelector('.course-material-list').textContent, /Choose this file again/)
  await upload([pdf('Notes.pdf'), pdf('Worksheet.pdf')])
  assert.equal(container.querySelector('[aria-label="Use PDF for learning: Notes.pdf"]').disabled, false)
  await analyze('Notes.pdf')
  assert.equal(calls, 1)
  assert.deepEqual(read().courses[0].files.map(file => file.name), ['BIO101_Syllabus.pdf', 'Notes.pdf', 'Worksheet.pdf'])
  assert.equal(read().courses[0].syllabusItems.length, 3)
})

test('mixed attachments keep supported files, identify photos honestly, reject HEIC and expose mobile MIME types', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', () => assert.fail('Attachments never call AI'))
  await render(); await openSpace()
  await upload([pdf('Notes.pdf'), new dom.File(['photo'], 'board.png', { type: 'image/png' }),
    new dom.File(['photo'], 'phone.heic', { type: 'image/heic' }), new dom.File(['text'], 'script.html', { type: 'text/html' })])
  assert.equal(container.querySelectorAll('.course-material-list li').length, 3)
  assert.match(container.querySelector('.course-material-errors').textContent, /phone.heic.*Export.*script.html/)
  assert.match(container.querySelector('.course-material-list').textContent, /PNG.*Class material.*cannot read images yet/)
  const picker = container.querySelector('[aria-label="Choose course materials"]')
  assert.equal(picker.multiple, true)
  for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) assert.ok(picker.accept.includes(type))
  const camera = container.querySelector('input[capture]')
  assert.equal(camera.getAttribute('capture'), 'environment')
  assert.ok(camera.accept.includes('image/jpeg'))
  assert.equal(picker.hasAttribute('capture'), false, 'The regular picker still offers files/photos')
  await reload(); await openSpace()
  assert.match(container.querySelector('.course-material-list').textContent, /board.png/)
})

test('failed PDF reading retains attachments and can retry explicitly', async t => {
  seed()
  let fail = true, calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return fail ? json({}, 503) : json({ summary: 'Diffusion moves particles.', importantTopics: ['Diffusion'] }) })
  await render(); await openSpace(); await upload([pdf('Retry.pdf')])
  await analyze('Retry.pdf')
  assert.equal(container.querySelectorAll('.course-material-list li').length, 2)
  assert.match(container.querySelector('.course-material-errors').textContent, /Retry.pdf.*try again/)
  fail = false
  await analyze('Retry.pdf')
  assert.equal(calls, 2)
  assert.equal(container.querySelector('.course-material-errors'), null)
  assert.equal(read().courses[0].files[1].analyzed, true)
})

test('reading another PDF keeps the recommendation and materials visible until completion', async t => {
  seed()
  let complete
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { complete = resolve }))
  await render(); await openSpace(); await upload([pdf('Lecture.pdf')])
  await analyze('Lecture.pdf')
  assert.equal(container.querySelector('.course-materials').getAttribute('aria-busy'), 'true')
  assert.equal(container.querySelectorAll('.course-material-list li').length, 2)
  assert.equal(container.querySelector('.space-recommendation h3').textContent, 'Photosynthesis')
  assert.match(container.querySelector('.course-material-status').textContent, /Reading Lecture.pdf/)
  await act(async () => complete(json({ summary: 'Diffusion moves particles.', importantTopics: ['Diffusion'] })))
  assert.equal(container.querySelector('.course-materials').getAttribute('aria-busy'), 'false')
})

test('removal persists, removes resource context, and keeps existing syllabus calendar entries', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', async () => json({ summary: 'PRIVATE_RESOURCE_SUMMARY', importantTopics: ['Diffusion'] }))
  await render(); await openSpace(); await upload([pdf('Notes.pdf')]); await analyze('Notes.pdf')
  assert.match(dom.localStorage.getItem('orbit.learner-memory'), /PRIVATE_RESOURCE_SUMMARY/)
  await click(container.querySelector('[aria-label="Remove Notes.pdf"]'))
  await reload(); await openSpace()
  assert.doesNotMatch(dom.localStorage.getItem('orbit.learner-memory'), /PRIVATE_RESOURCE_SUMMARY/)
  await click(container.querySelector('[aria-label="Remove BIO101_Syllabus.pdf"]'))
  assert.equal(read().courses[0].files.length, 0)
  assert.equal(read().courses[0].upcomingWork.length, 3)
  assert.match(container.querySelector('.course-material-status').textContent, /syllabus topics and dates are kept/)
})

test('App records quiz, recovery and activity evidence per course, persists it, and gives no credit for readiness', async t => {
  seed({ ...biologyCourse, mastery: { overall: 40, topics: { Photosynthesis: 40 } } })
  const state = read()
  state.courses.push({ name: 'Other course', mastery: { overall: 70, topics: { Photosynthesis: 70 } } })
  saveLearnerMemory(state, dom.localStorage)
  let questionNumber = 0, activityAttempts = 0
  const question = { topic: 'Photosynthesis', question: 'Where is light energy stored?', answers: [{ text: 'Sugar', correct: true }, { text: 'Soil', correct: false }], explanation: 'Sugar stores energy.' }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const request = JSON.parse(options.body)
    if (url === '/api/generate-study-lesson') return json({ topic: 'Photosynthesis', concept: 'Stored energy', content: 'Plants store light energy in sugar.' })
    if (url === '/api/generate-study-question') return json({ ...question, question: questionNumber++ ? 'What stores energy made with light?' : question.question })
    if (url === '/api/evaluate-study-answer') return json({ feedback: 'Think about sugar.', adaptedExplanation: 'Energy is stored in sugar.', followUpQuestion: 'Which stores the energy?', followUpAnswers: [{ text: 'In sugar', correct: true }] })
    assert.equal(url, '/api/study-activity')
    if (request.action === 'generate') return json({ topic: 'Photosynthesis', title: 'Trace energy', instruction: 'Explain where energy goes.', activityType: 'explain', successCriteria: 'Connects light with sugar.' })
    return json({ feedback: 'Connect light with energy in sugar.', signal: activityAttempts++ ? 'applied_understanding' : 'misconception' })
  })
  await render(); await openSpace(); await click(container.querySelector('.space-recommendation button'))
  await click(button('I understand'))
  assert.equal(read().courses[0].mastery.overall, 40)
  await click(button('Quiz me')); await click(button('Sugar'))
  assert.equal(read().courses[0].mastery.overall, 45)
  await click(button('Next question')); await click(button('Soil'))
  assert.equal(read().courses[0].mastery.overall, 42)
  await click(button('In sugar'))
  assert.equal(read().courses[0].mastery.overall, 45)
  await click(button('In sugar'))
  assert.equal(read().courses[0].mastery.overall, 45)
  await click(button('Let me try it'))
  const respond = async value => {
    await act(async () => {
      const field = container.querySelector('textarea')
      Object.getOwnPropertyDescriptor(dom.HTMLTextAreaElement.prototype, 'value').set.call(field, value)
      field.dispatchEvent(new dom.Event('input', { bubbles: true }))
    })
    await click(button('Share response'))
  }
  await respond('Energy comes from soil.')
  assert.equal(read().courses[0].mastery.overall, 43)
  await respond('Light energy becomes stored energy in sugar.')
  assert.equal(read().courses[0].mastery.overall, 46)
  await click(button('Share response'))
  assert.equal(read().courses[0].mastery.overall, 46, 'Resubmission cannot earn repeated credit')
  assert.equal(read().courses[1].mastery.overall, 70)
  const saved = read().courses[0].mastery
  await reload()
  assert.deepEqual(read().courses[0].mastery, saved)
})
