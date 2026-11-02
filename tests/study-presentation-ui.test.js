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

test('pending syllabus lesson uses a concise topic and compact, semantic assignment context without fetching', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Rendering context must not request a lesson'))
  const goal = 'Focus on Photosynthesis to prepare for the Nov 4 reading check and Nov 5 quiz: review inputs, outputs, stored energy, common misconceptions, and limiting factors.'
  await mount(t, { initialThread: undefined, today: '2026-11-01', course: { name: 'Biology 101', nextTask: goal,
    learnerPosition: { currentTopic: 'Photosynthesis' }, upcomingWork: [
      { title: 'Reading Check', topic: 'Photosynthesis', date: '2026-11-04' },
      { title: 'Quiz', topic: 'Photosynthesis', date: '2026-11-05' },
    ] } })
  assert.equal(container.querySelector('h1').textContent, 'Photosynthesis')
  assert.equal(container.querySelectorAll('h1').length, 1)
  assert.deepEqual([...container.querySelectorAll('.study-deadlines time')].map(item => item.dateTime), ['2026-11-04', '2026-11-05'])
  assert.equal(container.querySelector('[aria-label="Upcoming assignments"]').children.length, 2)
  assert.ok(!container.textContent.includes(goal))
  assert.ok(button('Start lesson'))
})

test('saved structured context renders below the topic while the teaching and path remain available', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Saved lessons must not refetch'))
  const lessonContext = { lessonTitle: 'Understanding state', reasonForLesson: 'Connect a click to what changes on screen.', focusAreas: ['Stored values', 'Renders'] }
  await mount(t, { initialThread: { resume: { lesson: { ...lesson, lessonContext } } } })
  assert.equal(container.querySelector('h1').textContent, lessonContext.lessonTitle)
  assert.equal(container.querySelector('.study-lesson-reason').textContent, lessonContext.reasonForLesson)
  assert.match(container.querySelector('.study-lesson-focus').textContent, /Stored values · Renders/)
  assert.equal(container.querySelector('.study-deadlines'), null)
  assert.match(container.querySelector('.study-content').textContent, /State remembers a value/)
  assert.equal(container.querySelector('.study-path'), null)
})

test('legacy saved lessons use topic as heading and concept as focus without adding a deadline', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Legacy presentation is local'))
  await mount(t)
  assert.equal(container.querySelector('h1').textContent, lesson.topic)
  assert.match(container.querySelector('.study-lesson-focus').textContent, /Remembering a value/)
  assert.equal(container.querySelector('.study-deadlines'), null)
})

test('an explicit start keeps the heading compact during generation and accepts the new lesson context', async (t) => {
  let finish
  const requests = []
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    requests.push(JSON.parse(options.body))
    return new Promise(resolve => { finish = resolve })
  })
  const nextTask = 'Focus on State to prepare for multiple assignments, dates, and a long list of learning objectives.'
  await mount(t, { initialThread: undefined, course: { ...course, nextTask, learnerPosition: { currentTopic: 'State' } } })
  await click('Start lesson')
  assert.equal(container.querySelector('h1').textContent, 'State')
  assert.ok(container.querySelector('.orbit-signal'))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].nextTask, nextTask)
  await act(async () => finish(json({ ...lesson, lessonContext: { lessonTitle: 'Understanding state', focusAreas: ['Memory', 'Updates'] } })))
  assert.equal(container.querySelector('h1').textContent, 'Understanding state')
  assert.match(container.querySelector('.study-lesson-focus').textContent, /Memory · Updates/)
  assert.equal(container.querySelector('.orbit-signal'), null)
})

test('desktop history rail collapses and resumes the selected session', async (t) => {
  t.mock.method(dom, 'matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  const switches = []
  const threads = ['one', 'two'].map(id => ({ id, topic: id, title: id, courseName: course.name, createdAt: '2026-10-30T10:00:00Z' }))
  await act(async () => root.render(createElement(StudyThreads, { courses: [course], threads, activeId: 'one', onSwitch: id => switches.push(id) })))
  const rail = container.querySelector('.study-nav-rail')
  const close = container.querySelector('[aria-label="Collapse topics and history"]')
  const trigger = container.querySelector('.study-nav-toggle')
  assert.equal(rail.hidden, false)
  assert.ok(close.querySelector('svg[aria-hidden="true"]'))
  assert.ok(trigger.querySelector('svg[aria-hidden="true"]'))
  assert.ok(close.querySelector('svg rect'), 'Collapse uses a panel icon instead of an X')
  assert.equal(close.querySelector('rect').outerHTML, trigger.querySelector('rect').outerHTML)
  assert.notEqual(close.querySelector('path').getAttribute('d'), trigger.querySelector('path').getAttribute('d'))
  assert.equal(trigger.getAttribute('aria-label'), 'Expand topics and history')
  for (const control of [close, trigger]) {
    assert.equal(control.type, 'button')
    assert.equal(control.tabIndex, 0)
    assert.equal(control.getAttribute('aria-controls'), rail.id)
  }
  assert.equal(close.getAttribute('aria-expanded'), 'true')
  assert.equal(close.textContent, '')
  await act(async () => close.click())
  assert.equal(rail.hidden, true)
  assert.equal(dom.document.activeElement, trigger)
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  await act(async () => trigger.click())
  assert.equal(rail.hidden, false)
  assert.equal(dom.document.activeElement, close)
  await act(async () => close.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(rail.hidden, true)
  assert.equal(dom.document.activeElement, trigger)
  await act(async () => trigger.click())
  await act(async () => [...rail.querySelectorAll('.topic-item-open')].find(el => el.textContent.startsWith('two')).click())
  assert.deepEqual(switches, ['two'])
})

test('back to space stays outside the history rail above the lesson when expanded and collapsed', async t => {
  const destinations = []
  t.mock.method(globalThis, 'fetch', () => assert.fail('Navigation must not request learning content'))
  await mount(t, { navigation: { courses: [{ name: 'Another space' }, course], onSelectSpace: name => destinations.push(name) } })
  const back = container.querySelector('.study-context .study-back-space')
  assert.equal(back.type, 'button')
  assert.equal(back.tabIndex, 0)
  assert.equal(back.closest('.study-threads'), null)
  assert.equal(back.nextElementSibling.className, 'study-subject')
  assert.ok(back.querySelector('svg[aria-hidden="true"]'))
  assert.equal(back.textContent, `Back to ${course.name}`)
  const rail = container.querySelector('.study-nav-rail')
  assert.equal(rail.hidden, false)
  assert.equal(back.closest('[hidden]'), null)
  await act(async () => back.click())
  await act(async () => container.querySelector('[aria-label="Collapse topics and history"]').click())
  assert.equal(rail.hidden, true)
  assert.equal(back.closest('[hidden]'), null)
  back.focus()
  assert.equal(dom.document.activeElement, back)
  await act(async () => back.click())
  await act(async () => container.querySelector('.study-nav-toggle').click())
  assert.equal(rail.hidden, false)
  assert.equal(back.closest('[hidden]'), null)
  assert.deepEqual(destinations, [course.name, course.name])
})

test('mobile keeps back to space in the lesson header independently of the history drawer', async t => {
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  t.mock.method(globalThis, 'fetch', () => assert.fail('Navigation must not request learning content'))
  const destinations = []
  await act(async () => root.render(createElement(StudySession, { course, initialThread: { resume: { lesson } },
    navigation: { courses: [course], onSelectSpace: name => destinations.push(name) } })))
  const back = container.querySelector('.study-context .study-back-space')
  const drawer = container.querySelector('dialog')
  assert.equal(drawer.open, false)
  assert.equal(back.closest('[hidden], dialog'), null)
  await act(async () => container.querySelector('.study-nav-toggle').click())
  assert.equal(drawer.open, true)
  assert.equal(drawer.querySelector('.study-back-space'), null)
  await act(async () => container.querySelector('[aria-label="Hide topics and history"]').click())
  assert.equal(drawer.open, false)
  back.focus()
  assert.equal(dom.document.activeElement, back)
  await act(async () => back.click())
  assert.deepEqual(destinations, [course.name])
})

test('previous work expands and collapses without losing saved lessons or closing the mobile drawer', async t => {
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  t.mock.method(globalThis, 'fetch', () => assert.fail('History navigation is read-only'))
  const visited = Array.from({ length: 8 }, (_, i) => ({ topic: lesson.topic, concept: `Previous lesson ${i} ${'long title '.repeat(6)}`, understood: i === 0 }))
  const initialThread = { resume: { lesson, learningPath: { visited, step: 9 } } }
  const before = JSON.stringify(initialThread)
  await act(async () => root.render(createElement(StudySession, { course, mastery: 40, initialThread, onThreadUpdate: () => assert.fail('Review does not write progress') })))
  await act(async () => container.querySelector('.study-nav-toggle').click())
  const drawer = container.querySelector('.study-nav-drawer')
  const list = () => container.querySelectorAll('.study-history-list [data-study-navigation-select]')
  const previous = () => container.querySelectorAll('.study-history .study-history-list button')
  const more = container.querySelector('.study-history-toggle')
  assert.equal(previous().length, 5)
  assert.equal(list().length, 6, 'Current lesson stays separate from the five-item history preview')
  assert.equal(more.textContent, 'Show more (3)')
  await act(async () => more.click())
  assert.equal(drawer.open, true)
  assert.equal(previous().length, 8)
  assert.equal(more.getAttribute('aria-expanded'), 'true')
  assert.equal(more.textContent, 'Show less')
  await act(async () => more.click())
  assert.equal(previous().length, 5)
  assert.equal(drawer.open, true)
  await act(async () => more.click())
  await act(async () => previous()[7].click())
  assert.equal(drawer.open, false)
  const review = container.querySelector('.study-history-review')
  assert.ok(review.textContent.includes(visited[0].concept))
  assert.match(review.textContent, /felt ready/)
  assert.equal(dom.document.activeElement, review)
  assert.equal(JSON.stringify(initialThread), before)
})

test('Update class focus keeps the existing correction payload separate from New topic and lesson actions', async t => {
  const corrections = [], creations = []
  t.mock.method(globalThis, 'fetch', () => assert.fail('Course navigation must not call a model'))
  await mount(t, { onPositionChange: value => corrections.push(value), navigation: { courses: [course], onCreate: (...args) => creations.push(args) } })
  const panel = container.querySelector('.study-active-panel')
  assert.equal(panel.querySelector('.course-position'), null)
  assert.doesNotMatch(panel.textContent, /Change starting point|I lost you/)
  const recovery = button('You lost me')
  assert.ok(recovery.classList.contains('study-secondary-action'))
  assert.equal(recovery.disabled, false)
  recovery.focus()
  assert.equal(dom.document.activeElement, recovery)
  for (const label of ['I understand', 'Continue to next lesson']) {
    const action = button(label)
    assert.ok(action.classList.contains('study-secondary-action'))
    action.focus()
    assert.equal(dom.document.activeElement, action)
  }
  assert.equal(container.querySelectorAll('.study-lesson-actions button').length, 6)
  const guidance = container.querySelector('.study-course-guidance')
  assert.equal(guidance.open, false)
  assert.equal(guidance.querySelector('summary').textContent, 'Update class focus')
  assert.equal(guidance.querySelector('p').textContent, 'Tell Orbit what your class is covering so future recommendations stay relevant.')
  assert.doesNotMatch(guidance.textContent, /Course guidance|course focus|starting point|correction/)
  assert.equal(guidance.contains(container.querySelector('.study-thread-new')), false)
  await act(async () => { guidance.open = true })
  await click('Edit class focus')
  const input = guidance.querySelector('input')
  assert.equal(input.labels[0].textContent, 'What is your class covering?')
  assert.equal(input.placeholder, 'Enter a class topic')
  assert.equal(button('Save class focus').disabled, true)
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, 'Events')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  await click('Save class focus')
  assert.deepEqual(corrections, [{ type: 'current', topic: 'Events', statement: "I'm currently on Events" }])
  assert.equal(creations.length, 0)
  assert.equal(container.querySelector('h1').textContent, lesson.topic)
  assert.equal(container.querySelector('.study-content').textContent, lesson.content)
  assert.match(container.querySelector('.study-position-notice').textContent, /Class focus updated for future recommendations/)
  await act(async () => container.querySelector('.study-thread-new').click())
  const form = container.querySelector('.thread-create')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(form.querySelector('input'), 'State')
    form.querySelector('input').dispatchEvent(new dom.Event('input', { bubbles: true }))
    form.dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true }))
  })
  assert.deepEqual(creations, [[course, 'State']])
  assert.equal(corrections.length, 1)
})

test('mobile history uses matching expand and hide controls with modal semantics and focus return', async (t) => {
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  await act(async () => root.render(createElement(StudyThreads, { courses: [course] })))
  const trigger = container.querySelector('.study-nav-toggle')
  const drawer = container.querySelector('dialog')
  assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog')
  assert.equal(trigger.getAttribute('aria-label'), 'Expand topics and history')
  assert.equal(trigger.tabIndex, 0)
  await act(async () => trigger.click())
  assert.equal(drawer.open, true)
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  const hide = drawer.querySelector('[aria-label="Hide topics and history"]')
  assert.equal(hide.type, 'button')
  assert.equal(hide.tabIndex, 0)
  assert.equal(hide.getAttribute('aria-controls'), drawer.id)
  assert.ok(hide.querySelector('svg rect'))
  await act(async () => hide.click())
  assert.equal(drawer.open, false)
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(dom.document.activeElement, trigger)
})

test('New thread keeps its labelled disclosure and existing course/topic submission', async () => {
  const creations = []
  await act(async () => root.render(createElement(StudyThreads, { courses: [course], threads: [], onCreate: (...args) => creations.push(args) })))
  const trigger = container.querySelector('.study-thread-new')
  assert.match(trigger.textContent, /New topic/)
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

test('Show me retains You lost me explanation and its request after That helps and tool switches', async (t) => {
  const images = []
  const explanation = 'Think of state as a notebook. A click changes the notebook before React updates the screen.'
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path === '/api/generate-lesson-image') { images.push(JSON.parse(options.body)); return json({ url: 'https://images.example.test/recovery.webp' }) }
    return json({ ...lesson, content: explanation })
  })
  await mount(t)
  await click('You lost me')
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
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss']])
  await click('Show me')
  assert.equal(mode(), 'visual')
  assert.ok(container.querySelector('.study-active-panel').textContent.includes(evaluation.adaptedExplanation))
  assert.match(images[0].visual.recoveryContext, /A prop/)
  assert.match(images[0].lesson.content, /component.*own memory/)
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss']])
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
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss'], ['recovery', 'miss']])
  await click('Quiz me')
  await click('In state')
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss'], ['recovery', 'miss'], ['recovery', 'success']])
})

test('activity misconception is preserved in Show me and the unchanged draft returns without being completed', async (t) => {
  const images = []
  const feedback = { feedback: 'State stores the new value; rendering displays it.', signal: 'misconception' }
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    const body = JSON.parse(options.body)
    if (path === '/api/generate-lesson-image') { images.push(body); return json({ url: 'https://images.example.test/activity.webp' }) }
    return json(body.action === 'generate' ? activity : feedback)
  })
  const activityEvidence = []
  await mount(t, { updateTopicMastery: (...args) => activityEvidence.push(args) })
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
  await click('You lost me')
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

test('You lost me enters recover while pending, retains it after completion, and That helps changes only presentation', async (t) => {
  let complete
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  const saved = []
  await mount(t, { onThreadUpdate: (_id, update) => saved.push(update) })
  assert.equal(mode(), 'focus')
  await click('You lost me')
  assert.equal(mode(), 'recover')
  await act(async () => { complete(json({ ...lesson, content: 'Think of state as the component’s notebook.' })); await setImmediate() })
  assert.equal(mode(), 'recover')
  assert.equal(container.querySelectorAll('.study-primary-action').length, 1)
  assert.equal(button('That helps').className, 'study-primary-action')
  const savedBefore = saved.at(-1)
  await click('That helps')
  assert.equal(mode(), 'focus')
  assert.equal(dom.document.activeElement, container.querySelector('.study-active-panel'))
  assert.deepEqual(saved.at(-1), { resume: { ...savedBefore.resume, recoveringLesson: false } },
    'A presentation acknowledgment saves only resume, without learning metadata or recency')
})

test('visual loading, decode, failure and retry keep requests deduplicated and never move keyboard focus', async (t) => {
  let complete
  const calls = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  await mount(t, { initialThread: { resume: { lesson: { ...lesson, visual } } } })
  assert.equal(calls.mock.callCount(), 0)
  await click('Show me')
  assert.equal(mode(), 'visual')
  assert.ok(container.querySelector('.lesson-image-surface'))
  button('You lost me').focus()
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
  const activityEvidence = []
  await mount(t, { updateTopicMastery: (...args) => activityEvidence.push(args) })
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
  assert.equal(container.querySelector('.study-stages'), null)
  await act(async () => { firstQuestion = false; completeQuestion(json(question)); await setImmediate() })
  await click('A prop')
  assert.equal(mode(), 'recover')
  assert.ok(container.querySelector('.study-adapted'))
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss']])
  await click('Lesson')
  assert.equal(mode(), 'focus')
  await click('Quiz me')
  assert.equal(mode(), 'recover')
  await click('In state')
  assert.equal(mode(), 'check')
  assert.deepEqual(scores.map(([, value]) => [value.kind, value.outcome]), [['quiz', 'miss'], ['recovery', 'success']])
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
  await click('You lost me')
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

test('previous lessons and activities reopen without requests, progress changes, or losing current work', async t => {
  const calls = t.mock.method(globalThis, 'fetch', async url => url === '/api/study-activity' ? json(activity)
    : json({ ...lesson, concept: 'Responding to events', content: 'This is the next lesson.' }))
  const updates = []
  await mount(t, { onThreadUpdate: (_id, value) => updates.push(value) })
  await click('Let me try it')
  await type('My retained activity response.')
  await click('Continue to next lesson')
  const before = JSON.stringify(updates)
  const count = calls.mock.callCount()
  const entries = [...container.querySelectorAll('.study-history button')]
  assert.equal(entries.length, 2)
  await act(async () => entries.find(el => el.textContent.endsWith('Activity')).click())
  assert.match(container.querySelector('.study-history-review').textContent, /My retained activity response/)
  assert.match(container.querySelector('.study-active-panel').textContent, /This is the next lesson/)
  await act(async () => entries.find(el => el.textContent.endsWith('Lesson')).click())
  assert.ok(container.querySelector('.study-history-review').textContent.includes(lesson.content))
  await click('Return to current work')
  assert.equal(container.querySelector('.study-history-review'), null)
  assert.equal(calls.mock.callCount(), count)
  assert.equal(JSON.stringify(updates), before)
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
