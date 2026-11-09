import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import process from 'node:process'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { demoRequest, demoResponse } from './fixtures/demoStore.js'
import { emptyLearnerMemory, loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'
import { PORTFOLIO_MESSAGE, isPortfolioResponse } from '../src/services/portfolioMode.js'
import { lessonImageRequest } from '../src/services/lessonImageRequest.js'

const routeNames = ['generate-study-lesson', 'generate-study-question', 'evaluate-study-answer', 'respond-to-study-message',
  'study-activity', 'analyze-course', 'recommend-course', 'generate-lesson-image']
const handlers = new Map(await Promise.all(routeNames.map(async name => [`/api/${name}`, (await import(`../api/${name}.js`)).default])))
let dom, server, createRoot, App, StudySession, client, images, root, container, priorMode
const globals = new Map()
// Optional integration run against an already-running local Vercel server.
// Probe before any valid AI input so this cannot spend credits on a stale server.
const localOrigin = process.env.ORBIT_TEST_LOCAL_URL ? new URL(process.env.ORBIT_TEST_LOCAL_URL) : null
if (localOrigin && (localOrigin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(localOrigin.hostname) ||
  localOrigin.username || localOrigin.password || localOrigin.pathname !== '/' || localOrigin.search || localOrigin.hash)) {
  throw new Error('ORBIT_TEST_LOCAL_URL must be a local HTTP origin')
}
const localFetch = globalThis.fetch
const pendingLocalRequests = new Set()
async function settleLocalRequests() {
  if (localOrigin) await act(async () => {
    while (pendingLocalRequests.size) await Promise.all([...pendingLocalRequests])
  })
}
const course = { name: 'React', nextTask: 'Explore State', mastery: { overall: 40, topics: { State: 40 } } }
const lesson = { topic: 'State', concept: 'Remembering', content: 'State remembers a value between renders.' }
const question = { topic: 'State', question: 'What remembers?', answers: [{ text: 'State', correct: true }, { text: 'Screen', correct: false }] }
const activity = { title: 'Predict', instruction: 'Predict the next count.', topic: 'State', activityType: 'predict', successCriteria: 'Recognizes the update.' }
const visual = { type: 'generated_image', purpose: 'Follow updates.', data: [{ label: 'State', detail: 'Keeps a value.' }] }
const button = (label, scope = container) => [...scope.querySelectorAll('button')].find(element => element.textContent === label)
const click = async element => {
  assert.ok(element, 'Expected control')
  await act(async () => element.click())
  await settleLocalRequests()
}
const navigate = async label => click([...container.querySelectorAll('.shell-destinations button')].find(element => element.textContent === label))
const type = async (field, value) => act(async () => {
  assert.ok(field, 'Expected input')
  const prototype = field.tagName === 'TEXTAREA' ? dom.HTMLTextAreaElement.prototype : dom.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value)
  field.dispatchEvent(new dom.Event('input', { bubbles: true }))
})
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })

before(async () => {
  if (localOrigin) {
    const response = await localFetch(new URL('/api/generate-study-lesson', localOrigin), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000),
    })
    assert.equal(response.headers.get('x-orbit-mode'), 'portfolio', 'Enable Portfolio Mode in the local API before running integration checks')
  }
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, localStorage: dom.localStorage,
    navigator: dom.navigator, HTMLElement: dom.HTMLElement, FileReader: dom.FileReader, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  const startupMode = process.env.ORBIT_PORTFOLIO_MODE
  try {
    process.env.ORBIT_PORTFOLIO_MODE = 'true'
    server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  } finally {
    if (startupMode === undefined) delete process.env.ORBIT_PORTFOLIO_MODE
    else process.env.ORBIT_PORTFOLIO_MODE = startupMode
  }
  App = (await server.ssrLoadModule('/src/App.jsx')).default
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
  client = await server.ssrLoadModule('/src/services/meta.js')
  images = await server.ssrLoadModule('/src/services/lessonImages.js')
})
beforeEach(t => {
  priorMode = process.env.ORBIT_PORTFOLIO_MODE
  process.env.ORBIT_PORTFOLIO_MODE = 'true'
  dom.localStorage.clear()
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await settleLocalRequests()
  await act(async () => root.unmount()); container.remove()
  if (priorMode === undefined) delete process.env.ORBIT_PORTFOLIO_MODE
  else process.env.ORBIT_PORTFOLIO_MODE = priorMode
})
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

// Exercise real UI -> service -> handler behavior, optionally over local HTTP.
// Only the selected loopback server can be contacted; provider traffic is forbidden.
function boundary(t, liveResponses = {}) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(handlers.has(url), `Unexpected outbound request: ${url}`)
    calls.push({ url, body: JSON.parse(options.body) })
    if (liveResponses[url]) return json(liveResponses[url])
    if (localOrigin) {
      const request = localFetch(new URL(url, localOrigin), options).then(async response => {
        await response.clone().arrayBuffer()
        return response
      }).finally(() => pendingLocalRequests.delete(request))
      pendingLocalRequests.add(request)
      return request
    }
    const res = demoResponse()
    await handlers.get(url)(demoRequest(JSON.parse(options.body)), res)
    return new Response(JSON.stringify(res.body), { status: res.code, headers: { ...res.headers, 'Content-Type': 'application/json' } })
  })
  return calls
}
function assertReply(scope = container) {
  const reply = scope.querySelector('[data-portfolio-reply]')
  assert.ok(reply)
  assert.equal(reply.querySelector('.study-content').textContent, PORTFOLIO_MESSAGE.split('\n\n').join(''))
  const link = reply.querySelector('a')
  assert.equal(link.textContent, 'Watch the Demo')
  assert.equal(link.href, 'https://youtu.be/-xQGO-GYUVg')
  assert.equal(link.target, '_blank')
  assert.equal(link.rel, 'noopener noreferrer')
  const response = reply.querySelector('.orbit-response') || reply.closest('.orbit-response')
  assert.equal(response.getAttribute('aria-busy'), 'false')
  assert.equal((reply.hasAttribute('aria-live') ? reply : reply.querySelector('.orbit-response-content')).getAttribute('aria-live'), 'polite')
  assert.equal(scope.querySelector('[role="alert"], .study-result-reveal, .study-streaming-response, .orbit-signal'), null)
  assert.equal(scope.querySelector('[aria-busy="true"]'), null)
  return reply
}
function assertLessonReply() {
  const reply = assertReply(container.querySelector('.study-active-panel'))
  assert.ok(reply.closest('.study-lesson [data-orbit-result="lesson"]'))
  assert.ok(reply.querySelector('.study-lesson-composition > .study-lesson-narrative > .study-content'))
  assert.equal(reply.querySelector('.study-exchange, .study-message-orbit, .study-visual-presentation'), null)
  assert.equal(container.querySelector('.study-session').dataset.presentationMode, 'focus')
  assert.ok(container.querySelector('.study-session > .orbit-stage'))
  assert.ok(container.querySelector('.study-context h1'))
  assert.equal(container.querySelector('.study-presentation-label').textContent, 'Explore the idea')
  assert.equal(container.querySelector('.study-continuation, .study-lesson-support'), null)
  for (const label of ['Start lesson', 'Continue to next lesson', 'I understand', 'That helps']) assert.equal(button(label), undefined)
  return reply
}
async function renderStudy(extra = {}) {
  const updates = [], mastery = [], positions = []
  await act(async () => root.render(createElement(StrictMode, null, createElement(StudySession, {
    course, mastery: 40, threadId: 'one', initialThread: { resume: { lesson } },
    onThreadUpdate: (...args) => updates.push(args), updateTopicMastery: (...args) => mastery.push(args),
    onPositionChange: (...args) => positions.push(args), ...extra,
  }))))
  return { updates, mastery, positions }
}
async function savedApp() {
  const thread = { id: 'one', courseName: course.name, positionKey: 'null', title: lesson.concept, topic: lesson.topic,
    context: 'lesson', summary: 'Explore State.', createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z',
    resume: { lesson, learningPath: { step: 3, understood: false, visited: [], upcoming: [] } } }
  saveLearnerMemory({ ...emptyLearnerMemory(), courses: [course], threads: [thread], activeId: 'one' }, dom.localStorage)
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await navigate('Learn')
  return loadLearnerMemory(dom.localStorage)
}

test('first-visit Portfolio recommendations reuse the looping carousel and new-space review without writes or AI requests', async t => {
  const calls = boundary(t)
  const topics = ['Orbital Motion', 'Music Theory', 'Photosynthesis', 'The Psychology of Habits']
  const storage = () => Array.from({ length: dom.localStorage.length }, (_, index) => {
    const key = dom.localStorage.key(index)
    return [key, dom.localStorage.getItem(key)]
  })
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  const before = storage()
  await navigate('Learn')
  assert.deepEqual([...container.querySelectorAll('.learn-recommendation strong')].map(element => element.textContent), topics)
  assert.equal(container.querySelector('.learn-empty'), null)
  assert.equal(container.querySelector('.learn-spaces'), null)
  assert.equal(container.querySelector('#learn-topic-input').value, '')
  assert.equal(container.querySelectorAll('.learn-recommendation[tabindex="0"]').length, 1)
  const key = async value => act(async () => container.querySelector('.orbit-carousel').dispatchEvent(
    new dom.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
  await key('ArrowLeft')
  assert.equal(container.querySelector('[data-current] strong').textContent, topics[3])
  await key('ArrowRight')
  assert.equal(container.querySelector('[data-current] strong').textContent, topics[0])
  for (let index = 0; index < topics.length; index++) {
    if (index) await navigate('Learn')
    for (let move = 0; move < index; move++) await key('ArrowRight')
    await click(container.querySelector('[data-current] .learn-recommendation'))
    const field = container.querySelector('.orbit-form input')
    assert.equal(field.value, topics[index])
    assert.equal(field.readOnly, false)
    assert.ok(button('Create space'))
    assert.deepEqual(storage(), before, 'Browsing and reviewing a suggestion cannot save examples or create spaces')
  }
  assert.equal(calls.length, 0)
  assert.deepEqual(loadLearnerMemory(dom.localStorage).courses, [])
  assert.deepEqual(loadLearnerMemory(dom.localStorage).threads, [])
})

test('Portfolio Learn renders genuine returning-visitor recommendations without example cards or memory changes', async t => {
  const calls = boundary(t)
  const before = await savedApp()
  assert.deepEqual([...container.querySelectorAll('.learn-recommendation strong')].map(element => element.textContent), ['Web accessibility'])
  assert.deepEqual(loadLearnerMemory(dom.localStorage), before)
  assert.equal(calls.length, 0)
})

test('all AI services recognize the portfolio result before parsing teaching or streaming text', async t => {
  const calls = boundary(t)
  const actions = [
    () => client.generateStudyLesson(course, 40),
    () => client.generateNextStudyLesson(course, 40, lesson),
    () => client.explainStudyLessonDifferently(course, lesson),
    () => client.generateStudyExample(course, lesson),
    () => client.generateStudyQuestion(course, 40, lesson),
    () => client.evaluateStudyAnswer(course, question, question.answers[1], 40),
    () => client.generateStudyActivity(course, lesson),
    () => client.evaluateStudyActivity(course, lesson, activity, 'The count changes.'),
    () => client.respondToStudyMessage(course, lesson, { message: 'Why?' }),
    () => client.respondToStudyMessageStream(course, lesson, { message: 'Why?', onDelta: () => assert.fail('No simulated streaming') }),
    () => client.recommendCourse([course]),
    () => client.analyzeCourseFile(new dom.File(['%PDF-fixture'], 'course.pdf', { type: 'application/pdf' })),
    () => images.generateLessonImage({ courseName: course.name, lesson, visual }, { includedImage: true }),
  ]
  for (const action of actions) await assert.rejects(action(), isPortfolioResponse)
  assert.equal(calls.length, actions.length)
})

for (const label of ['You lost me', 'Give me an example', 'Let me try it', 'Quiz me', 'Continue to next lesson', 'Show me']) {
  test(`${label}: assistant reply preserves the saved lesson, progress and all learner memory`, async t => {
    const calls = boundary(t)
    const before = await savedApp()
    assert.equal(calls.length, 0, 'Restore and navigation never start AI')
    await click(button(label))
    assertReply(container.querySelector('.study-active-panel'))
    assert.deepEqual(loadLearnerMemory(dom.localStorage), before)
    const lessonAction = ['You lost me', 'Continue to next lesson'].includes(label)
    if (lessonAction) {
      assertLessonReply()
      assert.equal(button(label), undefined, 'The placeholder cannot be simplified or progressed as if it were teaching')
      assert.equal(container.querySelector('.study-lesson-reference .study-content').textContent, lesson.content)
      await click(container.querySelector('.study-lesson-reference summary'))
      assert.equal(container.querySelector('.study-lesson-reference').open, true)
    } else {
      await click(button(label))
      assertReply(container.querySelector('.study-active-panel'))
      assert.deepEqual(loadLearnerMemory(dom.localStorage), before)
    }
    for (const destination of ['Home', 'Library', 'Calendar', 'Learn']) await navigate(destination)
    assert.equal(calls.length, lessonAction ? 1 : 2)
    assert.deepEqual(loadLearnerMemory(dom.localStorage), before)
    await click(button('Lesson'))
    assert.match(container.textContent, /State remembers a value/)
  })
}

test('Talk it through keeps repeated prompts and full replies visible without streaming, anchors or class-focus changes', async t => {
  const calls = boundary(t)
  const state = await renderStudy()
  await click(button('Talk it through'))
  const prior = state.updates.length
  for (const message of ['Why does it remember?', 'We are covering Effects now']) {
    await type(container.querySelector('.study-composer textarea'), message)
    await click(button('Send'))
    assertReply()
    assert.match(container.querySelector('.study-transcript').textContent, new RegExp(message.replace('?', '\\?')))
  }
  assert.equal(container.querySelectorAll('[data-portfolio-reply]').length, 2)
  assert.equal(calls.length, 2)
  assert.ok(calls.every(call => call.body.stream === true))
  assert.deepEqual(calls[1].body.history, [], 'Placeholder replies are not sent as learning context')
  assert.equal(state.updates.length, prior)
  assert.deepEqual(state.mastery, [])
  assert.deepEqual(state.positions, [])
  assert.equal(container.querySelector('.study-composer textarea').value, '')
})

test('new visitors can submit a topic and further prompts without fabricating a lesson or saving placeholder text', async t => {
  const calls = boundary(t)
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await navigate('Learn')
  await type(container.querySelector('#learn-topic-input'), 'How do black holes work?')
  await act(async () => container.querySelector('.learn-topic-form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })))
  await settleLocalRequests()
  const reply = assertLessonReply()
  assert.match(reply.querySelector('[aria-label="Your message"]').textContent, /How do black holes work/)
  await type(container.querySelector('.study-composer textarea'), 'What about time?')
  await click(button('Send'))
  assert.equal(container.querySelectorAll('[data-portfolio-reply]').length, 2)
  assert.equal(calls.length, 2)
  const saved = loadLearnerMemory(dom.localStorage)
  assert.equal(saved.threads[0].resume.lesson, null)
  assert.deepEqual(saved.threads[0].resume.conversation, [])
  assert.equal(saved.courses[0].mastery.overall, 0)
  assert.doesNotMatch(JSON.stringify(saved), /Well, this is awkward|What about time|sustainable business model/)
})

for (const startRequested of [false, true]) test(`${startRequested ? 'an intentional automatic entry' : 'Start lesson'} uses the lesson narrative without accepting placeholder learning`, async t => {
  const calls = boundary(t)
  const state = await renderStudy({ initialThread: { startRequested, requestedTopic: 'State' } })
  if (!startRequested) {
    assert.equal(calls.length, 0)
    await click(button('Start lesson'))
  } else await settleLocalRequests()
  const reply = assertLessonReply()
  assert.equal(reply.querySelector('[aria-label="Your message"]').textContent, 'State')
  assert.equal(container.querySelector('.study-subject').textContent, course.name, 'No fabricated lesson number')
  assert.equal(container.querySelector('.study-lesson-reference, .study-visual-presentation, .study-quiz'), null)
  assert.deepEqual(state, { updates: [], mastery: [], positions: [] })
  assert.deepEqual(calls.map(call => call.url), ['/api/generate-study-lesson'])
})

for (const entry of ['Home', 'Learn recommendation', 'Space recommendation']) test(`${entry} opens the Portfolio lesson layout and preserves existing course progress`, async t => {
  const calls = boundary(t)
  const biology = { name: 'Biology', nextTask: 'Explore Cells', importantTopics: ['Cells'], mastery: { overall: 40, topics: { Osmosis: 40 } } }
  saveLearnerMemory({ ...emptyLearnerMemory(), courses: [biology] }, dom.localStorage)
  const before = loadLearnerMemory(dom.localStorage).courses
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  if (entry === 'Learn recommendation') {
    await navigate('Learn')
    await click(container.querySelector('.learn-recommendation'))
  } else if (entry === 'Space recommendation') {
    await click(container.querySelector('.shell-spaces button'))
    await click(container.querySelector('.space-recommendation .orbit-button-primary'))
  } else await click(container.querySelector('.home-recommendation .orbit-button-primary'))
  assertLessonReply()
  const saved = loadLearnerMemory(dom.localStorage)
  assert.deepEqual(saved.courses, before)
  assert.equal(saved.threads.length, 1, 'Only the explicitly opened empty thread is created')
  assert.equal(saved.threads[0].resume.lesson, null)
  assert.deepEqual(saved.threads[0].resume.learningAnchors, [])
  assert.deepEqual(saved.threads[0].resume.learningPath.visited, [])
  assert.doesNotMatch(JSON.stringify(saved), /Well, this is awkward|sustainable business model/)
  assert.deepEqual(calls.map(call => call.url), ['/api/generate-study-lesson'])
})

test('an example recommendation keeps the existing create-space and start-lesson flow before showing the lesson placeholder', async t => {
  const calls = boundary(t)
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await navigate('Learn')
  await click(container.querySelector('[data-current] .learn-recommendation'))
  await click(button('Create space'))
  const before = loadLearnerMemory(dom.localStorage).courses
  assert.equal(before[0].name, 'Orbital Motion')
  assert.equal(calls.length, 0)
  await type(container.querySelector('.space-topic-entry input'), 'Orbital Motion')
  await click(button('Start lesson', container.querySelector('.space-topic-entry')))
  assertLessonReply()
  const saved = loadLearnerMemory(dom.localStorage)
  assert.deepEqual(saved.courses, before)
  assert.equal(saved.threads[0].resume.lesson, null)
  assert.equal(calls.length, 1)
})

for (const interaction of ['Talk it through', 'Quiz me']) test(`continuing from ${interaction} routes the placeholder to Lesson without changing learning state`, async t => {
  const calls = boundary(t, { '/api/generate-study-question': question })
  const state = await renderStudy()
  await click(button(interaction))
  const before = JSON.stringify(state)
  const priorCalls = calls.length
  await click(button('Continue to next lesson'))
  assertLessonReply()
  assert.equal(container.querySelector('.study-active-panel').dataset.studyInteraction, 'lesson')
  assert.equal(container.querySelector('.study-lesson-reference .study-content').textContent, lesson.content)
  assert.equal(JSON.stringify(state), before)
  assert.equal(calls.length, priorCalls + 1)
  assert.equal(calls.at(-1).body.action, 'next')
})

test('continuing an illustrated recovery lesson uses the ordinary text layout without borrowing its visual or changing saved work', async t => {
  const calls = boundary(t)
  const illustrated = { ...lesson, visual }
  const request = lessonImageRequest({ courseName: course.name, lesson: illustrated, visual })
  const state = await renderStudy({ initialThread: { resume: { lesson: illustrated, recoveringLesson: true,
    learningPath: { step: 3, understood: true }, images: [{ request, status: 'ready', url: 'https://images.example.test/saved.webp' }] } } })
  assert.ok(container.querySelector('.study-visual-presentation'))
  const before = JSON.stringify(state)
  await click(button('Continue to next lesson'))
  assertLessonReply()
  assert.equal(container.querySelector('.study-visual-presentation'), null)
  assert.match(container.querySelector('.study-subject').textContent, /Lesson 3/)
  assert.equal(JSON.stringify(state), before)
  assert.equal(calls.length, 1, 'No image regeneration accompanies a Portfolio lesson')
})

test('disabled Portfolio Mode still presents and saves genuine lesson content with normal study controls', async t => {
  process.env.ORBIT_PORTFOLIO_MODE = 'false'
  const calls = boundary(t, { '/api/generate-study-lesson': lesson })
  const state = await renderStudy({ initialThread: {} })
  await click(button('Start lesson'))
  assert.equal(container.querySelector('.study-lesson-composition > .study-lesson-narrative > .study-content').textContent, lesson.content)
  assert.equal(container.querySelector('[data-portfolio-reply]'), null)
  assert.ok(container.querySelector('.study-session > .orbit-stage'))
  for (const label of ['You lost me', 'I understand', 'Continue to next lesson']) assert.ok(button(label))
  assert.ok(state.updates.some(([, update]) => update.resume?.lesson?.content === lesson.content))
  assert.deepEqual(state.mastery, [])
  assert.equal(calls.length, 1)
})

test('a blocked evaluation of an existing real quiz does not record an answer, score, recovery or memory', async t => {
  const live = { '/api/generate-study-question': question }
  boundary(t, live)
  const state = await renderStudy()
  await click(button('Quiz me'))
  const prior = state.updates.length
  delete live['/api/generate-study-question']
  await click(button('Screen'))
  assertReply()
  assert.deepEqual(state.mastery, [])
  assert.equal(state.updates.length, prior)
  assert.equal(button('Next question'), undefined)
  assert.ok(button('Screen'), 'Existing quiz remains unscored')
  await click(button('Screen'))
  assert.deepEqual(state.mastery, [])
})

test('a blocked activity evaluation keeps the submitted response and does not create learning evidence', async t => {
  const live = { '/api/study-activity': activity }
  boundary(t, live)
  const state = await renderStudy()
  await click(button('Let me try it'))
  const prior = state.updates.length
  delete live['/api/study-activity']
  await type(container.querySelector('.study-activity textarea'), 'The count increases.')
  await click(button('Share response'))
  assertReply()
  assert.match(container.querySelector('[data-portfolio-reply]').textContent, /The count increases/)
  assert.deepEqual(state.mastery, [])
  assert.equal(state.updates.length, prior)
})

test('Retry visual displays the portfolio reply and never stores an image failure or placeholder', async t => {
  const calls = boundary(t)
  const state = await renderStudy({ initialThread: { resume: { lesson: { ...lesson, visual } } } })
  await click(button('Retry visual'))
  assertReply()
  assert.equal(calls.length, 1)
  assert.deepEqual(state.updates, [])
  assert.equal(button('Retry visual'), undefined)
})

test('a live lesson still saves immediately while its supporting image is pending', async t => {
  process.env.ORBIT_PORTFOLIO_MODE = 'false'
  let finishImage
  t.mock.method(globalThis, 'fetch', async url => {
    if (url === '/api/generate-study-lesson') return json({ ...lesson, visual })
    assert.equal(url, '/api/generate-lesson-image')
    return new Promise(resolve => { finishImage = resolve })
  })
  const state = await renderStudy({ initialThread: { startRequested: true } })
  assert.ok(finishImage)
  assert.ok(state.updates.some(([, update]) => update.resume?.lesson?.content === lesson.content))
  assert.equal(container.querySelector('[data-portfolio-reply]'), null)
  await act(async () => finishImage(json({ url: 'https://images.example.test/lesson.webp' })))
})

for (const kind of ['resource', 'syllabus']) test(`${kind}: PDF processing shows a reply without marking the file analyzed or changing course data`, async t => {
  const calls = boundary(t)
  await savedApp()
  await click(container.querySelector('.shell-spaces button'))
  await act(async () => {
    const select = container.querySelector('.course-material-controls select')
    select.value = kind; select.dispatchEvent(new dom.Event('change', { bubbles: true }))
    const transfer = new dom.DataTransfer()
    transfer.items.add(new dom.File(['%PDF-fixture'], 'course.pdf', { type: 'application/pdf' }))
    const input = container.querySelector('input[type="file"]')
    input.files = transfer.files; input.dispatchEvent(new dom.Event('change', { bubbles: true }))
    await dom.happyDOM.waitUntilComplete()
  })
  const before = loadLearnerMemory(dom.localStorage)
  for (let retry = 0; retry < 2; retry++) {
    await act(async () => {
      button(kind === 'resource' ? 'Use PDF for learning' : 'Read syllabus & find dates').click()
      await dom.happyDOM.waitUntilComplete()
    })
    await settleLocalRequests()
    assertReply(container.querySelector('.course-materials'))
    assert.deepEqual(loadLearnerMemory(dom.localStorage), before)
  }
  assert.equal(calls.length, 2)
  assert.doesNotMatch(container.querySelector('.course-material-status').textContent, /ready to review|ready to use/)
})
