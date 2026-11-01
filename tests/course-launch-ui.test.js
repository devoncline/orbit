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
  await upload([pdf('BIO101_Syllabus.pdf')])
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

test('multiple PDFs append, preserve syllabus dates and mastery, survive refresh, and do not create duplicate calendar events', async t => {
  seed()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url) => { assert.equal(url, '/api/analyze-course'); calls++; return json(biologyAnalysis) })
  await render(); await openSpace()
  await upload([pdf('Notes.pdf'), pdf('Guide.pdf')])
  assert.equal(calls, 2)
  assert.equal(container.querySelectorAll('.course-material-list li').length, 3)
  assert.equal(read().courses[0].upcomingWork.length, 3)
  assert.equal(read().courses[0].mastery.overall, 40)
  await reload(); await openSpace()
  assert.equal(container.querySelectorAll('.course-material-list li').length, 3)
  await upload([pdf('Notes.pdf'), pdf('Guide.pdf')])
  assert.equal(calls, 2, 'Known materials do not reanalyze on reselection')
  assert.match(container.querySelector('.course-material-status').textContent, /already added/)
  await click(button('Calendar', container.querySelector('.shell-destinations')))
  assert.equal(container.querySelectorAll('.calendar-page .upcoming-list li').length, 3)
  await click(container.querySelector('.calendar-page .upcoming-list button'))
  assert.ok(container.querySelector('.space-page'))
  assert.equal(calls, 2)
})

test('adding a PDF after returning to the course retains earlier materials and metadata', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', async () => json({ importantTopics: ['Diffusion'], syllabusItems: [], upcomingWork: [] }))
  await render(); await openSpace(); await upload([pdf('Notes.pdf')])
  await reload(); await openSpace(); await upload([pdf('Worksheet.pdf')])
  assert.deepEqual(read().courses[0].files.map(file => file.name), ['BIO101_Syllabus.pdf', 'Notes.pdf', 'Worksheet.pdf'])
  assert.equal(read().courses[0].syllabusItems.length, 3)
  assert.equal(read().courses[0].upcomingWork.length, 3)
})

test('a mixed upload batch keeps successful materials, reports failures, and can retry only the missing file', async t => {
  seed()
  let fail = true
  const requests = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body.fileName)
    return body.fileName === 'Retry.pdf' && fail ? json({}, 503) : json({ importantTopics: ['Diffusion'] })
  })
  await render(); await openSpace()
  await upload([pdf('Notes.pdf'), pdf('Retry.pdf'), new dom.File(['photo'], 'board.png', { type: 'image/png' })])
  assert.deepEqual(requests, ['Notes.pdf', 'Retry.pdf'])
  assert.equal(container.querySelectorAll('.course-material-list li').length, 2)
  assert.match(container.querySelector('.course-material-errors').textContent, /Retry.pdf.*retry.*board.png.*PDF/)
  assert.equal(button('+ Add material').disabled, false)
  fail = false
  await upload([pdf('Retry.pdf')])
  assert.equal(container.querySelectorAll('.course-material-list li').length, 3)
  assert.equal(container.querySelector('.course-material-errors'), null)
})

test('processing another PDF retains the existing recommendation and materials until the new result arrives', async t => {
  seed()
  let complete
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { complete = resolve }))
  await render(); await openSpace()
  await upload([pdf('Lecture.pdf')])
  assert.equal(container.querySelector('.course-materials').getAttribute('aria-busy'), 'true')
  assert.equal(container.querySelectorAll('.course-material-list li').length, 1)
  assert.equal(container.querySelector('.space-recommendation h3').textContent, 'Photosynthesis')
  assert.equal(button('Reading material…').disabled, true)
  assert.match(container.querySelector('.course-material-status').textContent, /Reading Lecture.pdf/)
  await act(async () => complete(json({ importantTopics: ['Diffusion'] })))
  assert.equal(container.querySelectorAll('.course-material-list li').length, 2)
  assert.equal(button('+ Add material').disabled, false)
})
