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

const savedThread = (id, topic, updatedAt, courseName = biologyCourse.name) => ({
  id, courseName, topic, title: `${topic} lesson ${id}`, requestedTopic: topic, positionKey: 'null',
  context: 'conversation', summary: `Discussion ${id}`, createdAt: updatedAt, updatedAt,
  resume: { lesson: { topic, concept: `${topic} concept ${id}`, content: `Saved explanation ${id}` },
    conversation: [{ message: `Question ${id}`, response: `Answer ${id}` }],
    learningPath: { step: 2, visited: [{ topic, concept: `Earlier concept ${id}` }] } },
})

test('Learn recommends unstudied topics and launches them in the existing space only after a click', async t => {
  const course = { name: 'Music theory', importantTopics: ['Major scales', 'Major chords'], mastery: { overall: 40, topics: { 'Major scales': 40 } } }
  seed(course)
  saveLearnerMemory({ ...read(), threads: [savedThread('scales', 'Major scales', '2026-11-01T12:00:00Z', course.name)], activeId: 'scales' }, dom.localStorage)
  const requests = lessonMock(t)
  await render(); await click(button('Learn'))
  const section = container.querySelector('.learn-recommendations')
  assert.deepEqual([...container.querySelectorAll('.learn-page .orbit-page-content > section > h2')].map(heading => heading.textContent), ['Recommended next', 'Study something new', 'Your spaces'])
  const recommendation = section.querySelector('[aria-label="Study Major chords in Music theory"]')
  assert.ok(recommendation)
  assert.ok(!section.querySelector('[aria-label="Study Major scales in Music theory"]'))
  assert.match(container.querySelector('.learn-spaces').textContent, /Music theory/)
  assert.equal(requests.length, 0)
  await act(async () => recommendation.dispatchEvent(new dom.MouseEvent('mouseenter', { bubbles: true })))
  assert.equal(requests.length, 0)
  await click(recommendation)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].learnerPosition.currentTopic, 'Major chords')
  assert.equal(read().courses.length, 1)
  assert.equal(read().threads.at(-1).courseName, course.name)
  assert.equal(read().threads.at(-1).requestedTopic, 'Major chords')
  assert.deepEqual(read().courses[0].mastery.topics, course.mastery.topics)
})

test('Learn loops its four available recommendations without adding data or changing their launch destination', async t => {
  const topics = ['Cell membranes', 'Energy transfer', 'Cell division', 'Inheritance']
  const course = { name: 'Biology class', importantTopics: topics }
  seed(course)
  const requests = lessonMock(t)
  await render(); await click(button('Learn'))
  const carousel = container.querySelector('.learn-recommendations .orbit-carousel')
  const slides = [...carousel.querySelectorAll('.carousel-slide')]
  assert.equal(slides.length, 4)
  assert.deepEqual(slides.map(slide => slide.querySelector('strong').textContent), topics)
  assert.equal(slides[3].style.visibility, 'visible')
  assert.match(slides[3].style.transform, /translate3d\(-/)
  const before = JSON.stringify(read())
  const key = async value => act(async () => carousel.dispatchEvent(new dom.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
  await key('ArrowLeft')
  assert.equal(carousel.querySelector('[data-current] strong').textContent, topics[3])
  await key('ArrowRight')
  assert.equal(carousel.querySelector('[data-current] strong').textContent, topics[0])
  await key('End'); await key('ArrowRight')
  assert.equal(carousel.querySelector('[data-current] strong').textContent, topics[0])
  assert.equal(carousel.querySelectorAll('.carousel-slide').length, 4)
  assert.equal(JSON.stringify(read()), before)
  assert.equal(requests.length, 0)
  await click(carousel.querySelector('[data-current] button'))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].learnerPosition.currentTopic, topics[0])
  assert.equal(read().threads.at(-1).courseName, course.name)
})

test('New space recommendations prefill the existing editable create flow without silently creating or generating', async t => {
  seed({ name: 'Orbital motion', type: 'topic' })
  t.mock.method(globalThis, 'fetch', () => assert.fail('New space suggestions require explicit creation, without AI'))
  await render(); await click(button('Learn'))
  await click(container.querySelector('[aria-label="Create a space for Black holes"]'))
  assert.equal(read().courses.length, 1)
  assert.equal(read().threads.length, 0)
  assert.equal(container.querySelector('.new-space-page input').value, 'Black holes')
  await type(container.querySelector('.new-space-page input'), 'Black holes and gravity')
  await click(button('Create space'))
  assert.equal(read().courses.length, 2)
  assert.equal(read().courses[1].name, 'Black holes and gravity')
  assert.equal(read().threads.length, 0)
  await click(container.querySelector('.shell-new-space'))
  assert.equal(container.querySelector('.new-space-page input').value, '', 'Ordinary creation does not retain a recommendation prefill')
})

for (const method of ['send button', 'native form submission']) test(`Learn freeform starts empty and launches once via ${method}`, async t => {
  seed({ name: 'Orbital motion', type: 'topic' })
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/generate-study-lesson')
    requests.push(JSON.parse(options.body))
    return json({ topic: 'Gravity waves', concept: 'A first idea', content: 'Here is an idea to explore.' })
  })
  await render(); await click(button('Learn'))
  let field = container.querySelector('.learn-topic-form input')
  assert.equal(field.value, '')
  assert.equal(field.placeholder, 'What do you want to learn?')
  assert.equal(field.autocomplete, 'off')
  assert.equal(field.type, 'text')
  assert.equal(field.hasAttribute('list'), false)
  assert.ok(!container.querySelector('datalist'))
  const submit = container.querySelector('[aria-label="Start learning"]')
  assert.equal(submit.type, 'submit')
  assert.ok(submit.form === field.form)
  assert.equal(submit.disabled, true)
  await type(field, '   ')
  assert.equal(submit.disabled, true)
  await act(async () => field.form.requestSubmit())
  assert.equal(requests.length, 0)
  await type(field, '  Gravity waves  ')
  if (method === 'send button') await click(submit)
  // Happy DOM does not emulate implicit Enter key activation. Exercise the native form-submit path it uses.
  else await act(async () => field.form.requestSubmit(submit))
  assert.equal(requests.length, 1)
  assert.ok(read().courses.some(course => course.name === 'Gravity waves'))
  assert.equal(container.querySelector('.study-room:not([hidden]) h1').textContent, 'Gravity waves')
  await click(button('Learn'))
  field = container.querySelector('.learn-topic-form input')
  assert.equal(field.value, '')
  assert.equal(requests.length, 1)
})

test('class sections render recommendations, recent learning and searchable topics with separate sessions', async t => {
  const threads = Array.from({ length: 12 }, (_, i) => savedThread(`topic-${i}`, i === 0 ? 'Photosynthesis' : `Topic ${i} ${'long name '.repeat(7)}`, `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`))
  threads.push(savedThread('latest', 'Photosynthesis', '2026-11-01T12:00:00Z'))
  seed()
  saveLearnerMemory({ ...read(), threads, activeId: 'latest' }, dom.localStorage)
  t.mock.method(globalThis, 'fetch', () => assert.fail('Browsing and resuming must not fetch'))
  await render(); await openSpace()
  const page = container.querySelector('.space-page')
  for (const heading of ['Recommended next', 'Continue learning', 'Your topics']) assert.ok([...page.querySelectorAll('h2')].some(el => el.textContent === heading))
  assert.equal(page.querySelectorAll('.space-recent .topic-item').length, 3)
  assert.equal(page.querySelector('.space-recent .topic-item-action'), null)
  assert.equal(page.querySelector('.topic-browser .topic-item-action'), null)
  assert.match(page.querySelector('.space-recent .topic-item').textContent, /Photosynthesis.*Discussion.*Nov 1/)
  assert.equal(page.querySelectorAll('.topic-browser > .topic-grid > li').length, 8)
  await click([...page.querySelectorAll('button')].find(el => el.textContent.startsWith('Show more topics')))
  assert.equal(page.querySelectorAll('.topic-browser > .topic-grid > li').length, 12)
  await type(page.querySelector('input[type="search"]'), 'photosynthesis')
  assert.equal(page.querySelectorAll('.topic-browser > .topic-grid > li').length, 1)
  await click(page.querySelector('.topic-sessions > button'))
  const sessions = page.querySelectorAll('.topic-sessions li button')
  assert.equal(sessions.length, 2)
  await click(sessions[1])
  assert.equal(read().activeId, 'topic-0')
  assert.equal(read().threads.length, threads.length)
  assert.match(container.querySelector('.study-room:not([hidden]) .study-active-panel').textContent, /Saved explanation topic-0/)
})

test('recommendations and recent work resume existing threads, classes stay isolated, and refresh preserves history', async t => {
  const otherCourse = { ...biologyCourse, name: 'Another class' }
  seed()
  saveLearnerMemory({ ...read(), courses: [biologyCourse, otherCourse], threads: [savedThread('bio', 'Photosynthesis', '2026-11-01T12:00:00Z'), savedThread('other', 'Photosynthesis', '2026-11-01T13:00:00Z', otherCourse.name)], activeId: 'bio' }, dom.localStorage)
  t.mock.method(globalThis, 'fetch', () => assert.fail('Existing topics must resume without generation'))
  await render(); await openSpace()
  assert.equal(container.querySelectorAll('.space-page .space-recent .topic-item').length, 1)
  await click(container.querySelector('.space-recommendation button'))
  assert.equal(read().activeId, 'bio')
  assert.equal(read().threads.length, 2)
  await click([...container.querySelectorAll('.shell-spaces button')].find(el => el.textContent === otherCourse.name))
  await click(container.querySelector('.space-recent button'))
  assert.equal(read().activeId, 'other')
  await reload(); await openSpace()
  await click(container.querySelector('.space-recent button'))
  const room = container.querySelector('.study-room:not([hidden])')
  assert.equal(read().activeId, 'bio')
  await click([...room.querySelectorAll('.study-history button')].find(el => el.textContent.includes('Earlier concept bio')))
  assert.match(room.querySelector('.study-history-review').textContent, /Only this lesson summary was saved.*Earlier concept bio/)
  await click([...room.querySelectorAll('button')].find(el => el.textContent === 'Return to current work'))
  await click([...room.querySelectorAll('.study-thread-history button')].find(el => el.textContent.startsWith('Discussion')))
  assert.match(room.querySelector('.study-transcript').textContent, /Question bio.*Answer bio/)
  assert.equal(read().threads.length, 2)
  await click(button('Learn'))
  assert.match(container.querySelector('#learn-heading').textContent, /What do you want to learn/)
})

test('Study back navigation returns to its own space with the rail open or collapsed', async t => {
  t.mock.method(dom, 'matchMedia', query => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }))
  t.mock.method(globalThis, 'fetch', () => assert.fail('Back navigation must not call a model'))
  const otherCourse = { ...biologyCourse, name: 'Music theory' }
  seed()
  saveLearnerMemory({ ...read(), courses: [biologyCourse, otherCourse], threads: [
    savedThread('bio', 'Photosynthesis', '2026-11-01T12:00:00Z'),
    savedThread('music', 'Major scales', '2026-11-01T13:00:00Z', otherCourse.name),
  ], activeId: 'bio' }, dom.localStorage)
  await render()
  for (const [space, collapse] of [[otherCourse, false], [biologyCourse, true]]) {
    await click([...container.querySelectorAll('.shell-spaces button')].find(el => el.textContent === space.name))
    await click(container.querySelector('.space-recent button'))
    const room = container.querySelector('.study-room:not([hidden])')
    if (collapse) await click(room.querySelector('[aria-label="Collapse topics and history"]'))
    assert.equal(room.querySelector('.study-nav-rail').hidden, collapse)
    const before = read()
    await click(button(`Back to ${space.name}`, room))
    assert.equal(container.querySelector('.space-page h1').textContent, space.name)
    assert.ok(room.closest('[hidden]'), 'Returning to a space hides the mounted Study workspace')
    assert.deepEqual(read().threads, before.threads)
    assert.deepEqual(read().courses, before.courses)
  }
})

test('Update class focus saves and clears the existing course correction without replacing current work', async t => {
  seed()
  saveLearnerMemory({ ...read(), threads: [savedThread('bio', 'Photosynthesis', '2026-11-01T12:00:00Z')], activeId: 'bio' }, dom.localStorage)
  t.mock.method(globalThis, 'fetch', () => assert.fail('Updating class focus must not generate a lesson'))
  await render(); await openSpace(); await click(container.querySelector('.space-recent button'))
  const room = container.querySelector('.study-room:not([hidden])')
  const before = read()
  await click(room.querySelector('.study-nav-toggle'))
  const guidance = room.querySelector('.study-course-guidance')
  await act(async () => { guidance.open = true })
  await click(button('Edit class focus', guidance))
  await type(guidance.querySelector('input'), 'Cellular Respiration')
  await click(button('Save class focus', guidance))
  assert.equal(read().courses[0].learnerPosition.currentTopic, 'Cellular Respiration')
  assert.equal(read().courses[0].learnerPosition.statement, "I'm currently on Cellular Respiration")
  assert.equal(room.querySelector('h1').textContent, 'Photosynthesis')
  assert.match(room.querySelector('.study-content').textContent, /Saved explanation bio/)
  assert.deepEqual(read().threads, before.threads)
  assert.deepEqual(read().courses[0].mastery, before.courses[0].mastery)
  assert.equal(read().activeId, 'bio')
  await click(button('Edit class focus', guidance))
  await click(button('Clear class focus', guidance))
  assert.equal(read().courses[0].learnerPosition, undefined)
  assert.deepEqual(read().threads, before.threads)
  assert.deepEqual(read().courses[0].mastery, before.courses[0].mastery)
  assert.equal(read().activeId, 'bio')
})

test('empty and single-topic classes provide complete sections without invented progress', async t => {
  seed({ name: 'Biology 101', type: 'class', files: [] })
  t.mock.method(globalThis, 'fetch', () => assert.fail('Empty classes must not fetch'))
  await render(); await openSpace()
  assert.match(container.querySelector('.space-page').textContent, /Nothing to pick up yet.*Your topics.*after you start learning/)
  assert.equal(container.querySelectorAll('.space-page .topic-item').length, 0)
})

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
  assert.match(container.querySelector('.course-material-list').textContent, /PNG.*Class material.*saved by name only.*Add reference in Study/)
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

test('Study reuses a course PDF original after analysis, keeps the source, and forgets references on reload', async t => {
  seed()
  saveLearnerMemory({ ...read(), threads: [savedThread('bio', 'Photosynthesis', '2026-11-01T12:00:00Z')], activeId: 'bio' }, dom.localStorage)
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    requests.push({ url, body })
    if (url === '/api/analyze-course') return json({ summary: 'Light powers sugar production.', importantTopics: ['Photosynthesis'] })
    assert.equal(url, '/api/respond-to-study-message')
    const response = 'Which input do you recognize on the worksheet?'
    return new Response([{ type: 'delta', text: response }, { type: 'complete', response, signal: 'neutral' }].map(event => JSON.stringify(event) + '\n').join(''), { headers: { 'Content-Type': 'application/x-ndjson' } })
  })
  await render(); await openSpace(); await upload([pdf('Worksheet.pdf')]); await analyze('Worksheet.pdf')
  const originalFiles = read().courses[0].files
  await click(container.querySelector('.space-recent button'))
  const room = container.querySelector('.study-room:not([hidden])')
  await click(button('Add reference', room))
  await act(async () => {
    const select = room.querySelector('.lesson-reference-course select')
    select.value = [...select.options].find(option => option.textContent === 'Worksheet.pdf').value
    select.dispatchEvent(new dom.Event('change', { bubbles: true }))
    await dom.happyDOM.waitUntilComplete()
  })
  assert.equal(requests.length, 1)
  assert.equal(room.querySelectorAll('.lesson-reference-list li').length, 1)
  assert.doesNotMatch(room.querySelector('.lesson-reference-list').textContent, /Saved summary only/)
  await click(button('Understand it', room)); await click(button('Send', room))
  assert.match(requests[1].body.lessonReferences[0].data, /^data:application\/pdf;base64,/)
  assert.deepEqual(read().courses[0].files, originalFiles)
  assert.doesNotMatch(JSON.stringify(read()), /file_data|lessonReferences|Which input|JVBER/)
  await click(room.querySelector('[aria-label="Remove reference Worksheet.pdf"]'))
  assert.deepEqual(read().courses[0].files, originalFiles)
  await reload()
  assert.equal(container.querySelectorAll('.lesson-reference-list li').length, 0)
  assert.equal(requests.length, 2, 'Reload must not replay reference or lesson work')
})

test('temporary references stay in their own mounted thread across messages, switches, new threads and continuation', async t => {
  seed()
  saveLearnerMemory({ ...read(), threads: [
    savedThread('bio', 'Photosynthesis', '2026-11-01T12:00:00Z'),
    savedThread('respiration', 'Cellular Respiration', '2026-11-01T13:00:00Z'),
  ], activeId: 'bio' }, dom.localStorage)
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    requests.push({ url, body })
    if (url === '/api/generate-study-lesson') return json({
      topic: body.lesson?.topic || body.learnerPosition.currentTopic,
      concept: 'A new concept', content: 'Explore another part of this topic.', visual: { type: 'none' },
    })
    assert.equal(url, '/api/respond-to-study-message')
    const response = 'What would you try first?'
    return new Response([{ type: 'delta', text: response }, { type: 'complete', response, signal: 'neutral' }]
      .map(event => JSON.stringify(event) + '\n').join(''), { headers: { 'Content-Type': 'application/x-ndjson' } })
  })
  const room = () => container.querySelector('.study-room:not([hidden])')
  const referenceNames = () => [...room().querySelectorAll('.lesson-reference-list li > div > span')].map(item => item.textContent)
  const resumeTopic = async topic => {
    const before = requests.length
    await openSpace()
    await click([...container.querySelectorAll('.space-recent button')].find(item => item.textContent.startsWith(topic)))
    assert.equal(requests.length, before, 'Navigation must not resend references or generate teaching')
  }
  const attachReference = async name => {
    await click(button('Add reference', room()))
    const before = requests.length
    await act(async () => {
      const transfer = new dom.DataTransfer()
      transfer.items.add(pdf(name))
      const input = room().querySelector('[aria-label="Choose lesson references"]')
      input.files = transfer.files
      input.dispatchEvent(new dom.Event('change', { bubbles: true }))
      await dom.happyDOM.waitUntilComplete()
    })
    assert.equal(requests.length, before, 'Attaching a reference alone must not call AI')
  }
  const send = async message => {
    await click(button('Talk it through', room()))
    await act(async () => {
      const field = room().querySelector('.study-composer textarea')
      Object.getOwnPropertyDescriptor(dom.HTMLTextAreaElement.prototype, 'value').set.call(field, message)
      field.dispatchEvent(new dom.Event('input', { bubbles: true }))
    })
    const before = requests.length
    await click(button('Send', room()))
    assert.equal(requests.length, before + 1)
    return requests.at(-1).body
  }

  await render(); await resumeTopic('Photosynthesis')
  const originalRoom = room()
  await attachReference('photosynthesis-work.pdf')
  for (const message of ['Help with question 3.', 'Explain that step again.']) {
    const body = await send(message)
    assert.equal(body.lesson.topic, 'Photosynthesis')
    assert.deepEqual(body.lessonReferences.map(item => item.name), ['photosynthesis-work.pdf'])
  }
  await click(button('Home')); await resumeTopic('Photosynthesis')
  assert.equal(room(), originalRoom)
  assert.deepEqual(referenceNames(), ['photosynthesis-work.pdf'])

  await resumeTopic('Cellular Respiration')
  assert.deepEqual(referenceNames(), [])
  assert.equal((await send('Explain this lesson.')).lessonReferences, undefined)
  await attachReference('respiration-work.pdf')
  assert.deepEqual((await send('Help with this page.')).lessonReferences.map(item => item.name), ['respiration-work.pdf'])

  await resumeTopic('Photosynthesis')
  assert.equal(room(), originalRoom, 'Returning must reuse the original mounted session')
  assert.deepEqual(referenceNames(), ['photosynthesis-work.pdf'])
  assert.deepEqual((await send('Return to my page.')).lessonReferences.map(item => item.name), ['photosynthesis-work.pdf'])

  await openSpace()
  const form = container.querySelector('.space-topic-entry form')
  await type(form.querySelector('input'), 'Genetics')
  await click(form.querySelector('button'))
  assert.equal(read().threads.length, 3)
  assert.notEqual(read().activeId, 'bio')
  assert.notEqual(read().activeId, 'respiration')
  assert.deepEqual(referenceNames(), [])
  assert.equal(requests.at(-1).body.lessonReferences, undefined, 'Starting a new thread must omit old references')
  assert.equal((await send('Explain this new lesson.')).lessonReferences, undefined)

  await resumeTopic('Photosynthesis')
  assert.deepEqual(referenceNames(), ['photosynthesis-work.pdf'])
  await click(button('Continue to next lesson', room()))
  assert.deepEqual(referenceNames(), [])
  assert.equal(requests.at(-1).body.lessonReferences, undefined)
  assert.equal((await send('Explain the next idea.')).lessonReferences, undefined)
  await resumeTopic('Cellular Respiration')
  assert.deepEqual(referenceNames(), ['respiration-work.pdf'], 'Continuing one thread must not clear another thread')

  const beforeReload = requests.length
  await reload()
  assert.equal(container.querySelectorAll('.lesson-reference-list li').length, 0)
  assert.equal(requests.length, beforeReload)
  assert.doesNotMatch(JSON.stringify(read()), /photosynthesis-work\.pdf|respiration-work\.pdf|lessonReferences|JVBER/)
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
