import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { emptyLearnerMemory, saveLearnerMemory, loadLearnerMemory } from '../src/services/learnerMemory.js'

let dom, server, createRoot, App, root, container, client, images, usage
const globals = new Map()
const course = { name: 'React', nextTask: 'Explore State', mastery: { overall: 40, topics: { State: 40 } } }
const lesson = { topic: 'State', concept: 'Remembering', content: 'State remembers a value between renders.' }
const question = { topic: 'State', question: 'What remembers?', answers: [{ text: 'State', correct: true }, { text: 'Screen', correct: false }] }
const activity = { title: 'Predict', instruction: 'Predict the next count.', topic: 'State', activityType: 'predict', successCriteria: 'Recognizes the update.' }
const visual = { type: 'generated_image', purpose: 'Follow updates.', focus: 'State', data: [{ label: 'State', detail: 'Keeps a value.' }] }
const limitResponse = (error = 'demo_limit_reached') => new Response(JSON.stringify({ error, retryAfterSeconds: 60 }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } })
const button = (label, scope = container) => [...scope.querySelectorAll('button')].find(element => element.textContent === label)
const click = async (element) => { assert.ok(element, 'Expected control'); await act(async () => element.click()) }
const navigate = async label => click([...container.querySelectorAll('.shell-destinations button')].find(element => element.textContent === label))
const activeRoom = () => container.querySelector('.study-room:not([hidden])')

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, localStorage: dom.localStorage, navigator: dom.navigator, HTMLElement: dom.HTMLElement, FileReader: dom.FileReader, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  App = (await server.ssrLoadModule('/src/App.jsx')).default
  client = await server.ssrLoadModule('/src/services/meta.js')
  images = await server.ssrLoadModule('/src/services/lessonImages.js')
  usage = await server.ssrLoadModule('/src/services/demoUsage.js')
})
beforeEach(t => {
  dom.localStorage.clear()
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount()); container.remove()
  // Expire through the public request boundary, without a production reset API.
  const now = Date.now, fetch = globalThis.fetch, expired = (usage.getDemoLimitSnapshot()?.until || 0) + 1
  Date.now = () => expired
  globalThis.fetch = async () => new Response('{}')
  try { await usage.demoAiFetch('/test-only-reset', {}) } finally { Date.now = now; globalThis.fetch = fetch }
})
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

for (const code of ['demo_limit_reached', 'demo_capacity_reached']) {
test(`${code}: friendly notice and video link replace generic failures; saved content, local preferences and navigation remain available`, async (t) => {
  const thread = { id: 'one', courseName: course.name, positionKey: 'null', title: 'Remembering', topic: 'State', context: 'lesson', summary: 'Explore state.',
    createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', resume: { lesson } }
  saveLearnerMemory({ ...emptyLearnerMemory(), courses: [course], threads: [thread], activeId: 'one' }, dom.localStorage)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => limitResponse(code))
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await navigate('Learn')
  assert.equal(fetchMock.mock.callCount(), 0)
  assert.match(activeRoom().textContent, /State remembers a value/)
  await click(button('I lost you', activeRoom()))
  assert.equal(fetchMock.mock.callCount(), 1)
  const notice = container.querySelector('.demo-limit-notice[role="status"]')
  assert.ok(notice)
  assert.match(notice.textContent, code === 'demo_capacity_reached'
    ? /Orbit's public demo has reached its current AI capacity/
    : /You've reached the AI limit for Orbit's public demo/)
  assert.match(notice.textContent, /You can still explore the app or watch the full demo/)
  const link = notice.querySelector('a')
  assert.equal(link.href, 'https://youtu.be/-xQGO-GYUVg')
  assert.match(link.textContent, /Watch the full demo/)
  assert.doesNotMatch(activeRoom().textContent, /Orbit could not update this lesson|HTTP 429|rate limit|API quota|provider error|Redis|750|token usage|IP address/)
  assert.match(activeRoom().textContent, /State remembers a value/)
  await click(button('I lost you', activeRoom()))
  assert.equal(fetchMock.mock.callCount(), 1, 'Known exhaustion prevents another paid request')
  for (const label of ['Home', 'Calendar', 'Library', 'Learn']) await navigate(label)
  assert.equal(fetchMock.mock.callCount(), 1, 'Navigation never spends an action')
  assert.match(activeRoom().textContent, /State remembers a value/)
  assert.equal(loadLearnerMemory(dom.localStorage).threads[0].resume.lesson.content, lesson.content)
  const retained = loadLearnerMemory(dom.localStorage)
  assert.equal(saveLearnerMemory({ ...retained, learningPreferences: { status: 'saved', profile: { chunkSize: 'short' } } }, dom.localStorage), true)
  assert.equal(loadLearnerMemory(dom.localStorage).learningPreferences.profile.chunkSize, 'short')
})

test(`${code}: all named paid services recognize the code, including streamed replies and images; provider 429 is not demo exhaustion`, async (t) => {
  const calls = [
    () => client.generateStudyLesson(course, 40),
    () => client.generateNextStudyLesson(course, 40, lesson),
    () => client.explainStudyLessonDifferently(course, lesson),
    () => client.generateStudyExample(course, lesson),
    () => client.generateStudyQuestion(course, 40, lesson),
    () => client.evaluateStudyAnswer(course, question, question.answers[1], 40),
    () => client.generateStudyActivity(course, lesson),
    () => client.evaluateStudyActivity(course, lesson, activity, 'The count changes.'),
    () => client.respondToStudyMessage(course, lesson, { message: 'Why?' }),
    () => client.respondToStudyMessageStream(course, lesson, { message: 'Why?', onDelta: () => assert.fail('Blocked stream cannot emit text') }),
    () => client.recommendCourse([course]),
    () => client.analyzeCourseFile(new dom.File(['fake'], 'course.pdf', { type: 'application/pdf' })),
    () => images.generateLessonImage({ courseName: course.name, lesson, visual }),
  ]
  let now = 0
  t.mock.method(Date, 'now', () => now)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => limitResponse(code))
  for (const call of calls) {
    now += 61000
    await assert.rejects(call(), error => error.code === code && error.message === usage.aiErrorMessage({ code }))
  }
  assert.equal(fetchMock.mock.callCount(), calls.length)
  now += 61000
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: 'Failed to generate study lesson' }), { status: 429 }))
  await assert.rejects(client.generateStudyLesson(course, 40), error => error.code !== code)
  assert.equal(usage.getDemoLimitSnapshot(), null)
})

test(`${code}: client expiry permits a retry and included images can finish while separate image actions stay blocked`, async (t) => {
  let now = 1000
  t.mock.method(Date, 'now', () => now)
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => limitResponse(code))
  await assert.rejects(client.generateStudyLesson(course, 40), { code })
  const imageContext = { courseName: course.name, lesson, visual }
  await assert.rejects(images.generateLessonImage(imageContext), { code })
  assert.equal(fetchMock.mock.callCount(), 1)
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ url: 'https://images.example.test/included.webp' })))
  const included = await images.generateLessonImage(imageContext, { includedImage: true })
  assert.equal(included.url, 'https://images.example.test/included.webp')
  now += 61000
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify(lesson)))
  assert.deepEqual(await client.generateStudyLesson(course, 40), lesson)
  assert.equal(usage.getDemoLimitSnapshot(), null)
})
}
