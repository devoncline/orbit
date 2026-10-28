import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { Children, createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { collectUpcomingWork, formatWorkDate, parseWorkDate } from '../src/services/upcomingWork.js'
import { learningAction } from '../src/components/learningAction.js'
import { LEARNER_MEMORY_KEY, saveLearnerMemory } from '../src/services/learnerMemory.js'

let server
let HomeScreen
let LearnScreen
let AppShell
let UpcomingWork
let StudyThreads
let App
let StudySession

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  HomeScreen = (await server.ssrLoadModule('/src/components/HomeScreen.jsx')).default
  LearnScreen = (await server.ssrLoadModule('/src/components/LearnScreen.jsx')).default
  AppShell = (await server.ssrLoadModule('/src/components/AppShell.jsx')).default
  UpcomingWork = (await server.ssrLoadModule('/src/components/UpcomingWork.jsx')).default
  StudyThreads = (await server.ssrLoadModule('/src/components/StudyThreads.jsx')).default
  App = (await server.ssrLoadModule('/src/App.jsx')).default
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
})
after(async () => { await server?.close() })

const courses = Array.from({ length: 7 }, (_, index) => ({
  name: index === 6 ? 'A very long learning space about quantum mechanics and the mathematical foundations of modern physics' : `Learning space ${index + 1}`,
  nextTask: `Explore idea ${index + 1}`,
  mastery: { overall: 40, topics: {} },
}))
const renderHome = (spaces) => renderToStaticMarkup(createElement(HomeScreen, { courses: spaces, recommendedCourse: spaces[0] }))

test('zero spaces offers all three ways to begin without a recommendation or invented work', () => {
  const html = renderHome([])
  assert.match(html, /What do you want<br\/>to do\?/)
  assert.match(html, /I’m taking a class/)
  assert.match(html, /I want to learn something/)
  assert.match(html, /I already have material/)
  assert.doesNotMatch(html, /Start learning <|home-recommendation|Coming up/)
})

test('empty Home sends curiosity to Learn while keeping class and material setup paths', () => {
  const actions = []
  const home = HomeScreen({ courses: [], onNewSpace: (intent) => actions.push(intent), onNavigate: (route) => actions.push(route) })
  function visit(element) {
    if (!isValidElement(element)) return
    if (element.type === 'button') element.props.onClick()
    else Children.forEach(element.props.children, visit)
  }
  visit(home)
  assert.deepEqual(actions, ['class', 'learn', 'material'])
})

test('empty Learn provides one topic field and a direct study action without Home paths or enrollment fields', () => {
  const html = renderToStaticMarkup(createElement(LearnScreen, { courses: [] }))
  assert.match(html, /What do you want to learn\?/)
  assert.match(html, /Subject or topic/)
  assert.equal((html.match(/<input /g) || []).length, 1)
  assert.match(html, /name="topic"/)
  assert.match(html, />Start learning<\/button>/)
  for (const subject of ['React', 'Quantum physics', 'Biology', 'Music theory', 'History of ancient Rome']) assert.ok(html.includes(subject))
  assert.doesNotMatch(html, /I’m taking a class|I already have material|Instructor|Class name|Create space|Coming up|home-entry-points/)
})

for (const count of [1, 7]) test(`Learn with ${count} spaces keeps a direct study form and offers existing spaces`, () => {
  const spaces = courses.slice(0, count)
  const html = renderToStaticMarkup(createElement(LearnScreen, { courses: spaces, recommendedCourse: spaces.at(-1) }))
  assert.match(html, /What do you want to learn\?/)
  assert.ok(html.includes(`value="${spaces.at(-1).name}"`))
  for (const space of spaces) assert.ok(html.includes(`<option value="${space.name}">`))
  assert.match(html, /type="submit">Start learning/)
  assert.doesNotMatch(html, /home-recommendation|home-support|Coming up|I’m taking a class/)
  assert.match(renderHome(spaces), /home-recommendation/)
})

test('one space has a usable action during recommendation loading', () => {
  const html = renderToStaticMarkup(createElement(HomeScreen, { courses: courses.slice(0, 1), recommendedCourse: courses[0], loadingRecommendation: true }))
  assert.match(html, /Explore idea 1/)
  assert.match(html, /Show me idea 1/)
  assert.doesNotMatch(html, /disabled/)
  assert.match(html, /No upcoming dates/)
})

test('many spaces stay in navigation while Home shows only two alternatives', () => {
  const home = renderHome(courses)
  assert.match(home, /Learning space 2/)
  assert.match(home, /Learning space 3/)
  assert.doesNotMatch(home, /Learning space 4/)
  const shell = renderToStaticMarkup(createElement(AppShell, { courses, destination: 'home' }))
  for (const course of courses) assert.ok(shell.includes(course.name))
  assert.match(shell, /aria-label="Orbit navigation"/)
  assert.match(shell, /aria-label="Your learning spaces"/)
})

test('Study keeps the desktop sidebar, active Learn destination, and navigation drawer', () => {
  const html = renderToStaticMarkup(createElement(AppShell, { courses, destination: 'study' }))
  assert.match(html, /<aside class="shell-sidebar"/)
  assert.match(html, /<button aria-current="page"><svg[^]*?<\/svg>Learn<\/button>/)
  assert.match(html, /<dialog/)
  assert.match(html, /orbit-shell-focused/)
})

test('mobile navigation renders an accessible menu icon immediately before the Orbit brand', () => {
  const html = renderToStaticMarkup(createElement(AppShell, { courses, destination: 'home' }))
  const header = html.match(/<header class="shell-mobile-header">([^]*?)<\/header>/)[1]
  assert.ok(header.indexOf('aria-label="Open navigation"') < header.indexOf('aria-label="Orbit home"'))
  assert.match(header, /aria-controls="orbit-navigation" aria-expanded="false"/)
  assert.match(header, /<svg[^]*?aria-hidden="true"[^]*?M4 6h16M4 12h16M4 18h16/)
  assert.doesNotMatch(header, />Menu</)
  assert.match(html, /<dialog id="orbit-navigation"/)
})

test('a fresh App render hydrates saved spaces, mastery, recommendation and thread context before Home', () => {
  let saved = null
  const storage = { getItem: (key) => key === LEARNER_MEMORY_KEY ? saved : null, setItem: (key, value) => { if (key === LEARNER_MEMORY_KEY) saved = value }, removeItem: () => { saved = null } }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  try {
    const first = renderToStaticMarkup(createElement(App))
    assert.match(first, /What do you want/)
    saveLearnerMemory({
      courses: [{ name: 'React', mastery: { overall: 70, topics: { Props: 70 } }, learnerPosition: { currentTopic: 'Props', exclusions: [], statement: 'We are on Props' } }],
      threads: [{ id: 'saved', courseName: 'React', title: 'Inputs', topic: 'Props', summary: 'Practiced passing inputs.', status: 'practiced',
        positionKey: JSON.stringify({ currentTopic: 'Props', exclusions: [], statement: 'We are on Props' }), createdAt: '2026-10-27T12:00:00Z',
        resume: { lesson: { topic: 'Props', concept: 'Inputs', content: 'A parent passes a name to a child.' } },
      }], activeId: 'saved', recommendation: { courseName: 'React', recommendedAction: 'Explore Props', reason: 'Continue inputs.' },
    }, storage)
    const reloaded = renderToStaticMarkup(createElement(App))
    assert.match(reloaded, /Explore Props/)
    assert.match(reloaded, /Return to React/)
    assert.match(reloaded, /Last time: Practiced passing inputs/)
    assert.match(reloaded, /Mastery · 70%/)
    assert.match(reloaded, /A parent passes a name to a child/)
    assert.doesNotMatch(reloaded, /Orbit is preparing a short lesson|What do you want<br/)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})

test('restored Study starts from its saved lesson and summary without replaying quiz or mastery actions', () => {
  const html = renderToStaticMarkup(createElement(StudySession, {
    course: { name: 'React', learningAnchors: [] }, threadId: 'saved', mastery: 80,
    initialThread: { summary: 'Practiced component inputs.', status: 'practiced', resume: {
      lesson: { topic: 'Props', concept: 'Inputs', content: 'Parents supply props to children.' },
      conversation: [{ message: 'Like arguments?', response: 'Yes, they supply inputs.' }],
    } },
    setMastery: () => assert.fail('Restoring must not award mastery'),
    updateTopicMastery: () => assert.fail('Restoring must not award mastery'),
  }))
  assert.match(html, /Parents supply props to children/)
  assert.match(html, /Last time: Practiced component inputs/)
  assert.doesNotMatch(html, /Orbit is preparing a short lesson|Question 1|study-answer/)
})

test('Home keeps a real question as its hook and does not invent learner history', () => {
  const html = renderToStaticMarkup(createElement(HomeScreen, {
    courses, recommendedCourse: courses[0],
    recommendation: { recommendedAction: 'Why can props go down but not back up?' },
  }))
  assert.match(html, /Why can props go down but not back up\?/)
  assert.match(html, />Show me<\/button>/)
  assert.doesNotMatch(html, /You were close|home-reason|YOUR NEXT STEP|WELCOME BACK/)
})

test('Home uses current syllabus timing ahead of an outdated recommendation and offers a correction', () => {
  const course = { ...courses[0], syllabusItems: [{ topic: 'Orientation', startDate: '2026-08' }, { topic: 'React', startDate: '2026-10' }] }
  const html = renderToStaticMarkup(createElement(HomeScreen, {
    courses: [course], recommendedCourse: course, today: '2026-10-27',
    recommendation: { recommendedAction: 'Start orientation' }, onPositionChange: () => {},
  }))
  assert.match(html, /Explore React/)
  assert.match(html, /Change starting point/)
  assert.doesNotMatch(html, /Start orientation|confidence/)
  assert.equal(html.match(/This part of your syllabus lines up with today\./g).length, 1)
})

test('thread navigation starts collapsed and identifies the current objective without transcript content', () => {
  const html = renderToStaticMarkup(createElement(StudyThreads, {
    courses, activeId: 'second', threads: [
      { id: 'first', title: 'Props basics', courseName: courses[0].name, context: 'conversation', summary: 'A parent passes data.', createdAt: '2026-10-27T10:00:00Z' },
      { id: 'second', title: 'Events', courseName: courses[0].name, context: 'activity', summary: 'Trying a button.', createdAt: '2026-10-27T10:05:00Z' },
    ],
  }))
  assert.match(html, /<details><summary>Study threads/)
  assert.doesNotMatch(html, /<details open|<textarea/)
  assert.match(html, /aria-current="true"/)
  assert.ok(html.indexOf('Events') < html.indexOf('Props basics'))
  assert.match(html, /This browser keeps up to 20 recent threads/)
})

test('learning actions use the task context and keep an active session distinct', () => {
  assert.equal(learningAction('Explore props', 'React'), 'Show me props')
  assert.equal(learningAction('Review photosynthesis.', 'Biology'), 'Review photosynthesis')
  assert.equal(learningAction('Practice quadratic equations', 'Algebra'), 'Practice quadratic equations')
  assert.equal(learningAction('Prepare for the quiz', 'Biology'), 'Prepare for the quiz')
  assert.equal(learningAction('Why does this happen?', 'Physics'), 'Show me')
  assert.equal(learningAction(undefined, 'Physics'), 'Try this')
  assert.equal(learningAction('Explore props', 'React', true), 'Return to React')
})

test('dates stay local and reject rollover or ambiguous values', () => {
  assert.equal(parseWorkDate('2026-10-27').getDate(), 27)
  assert.equal(parseWorkDate('2028-02-29').getMonth(), 1)
  for (const invalid of ['Friday', '10/27', '2026-02-29', '2026-13-01', '', null]) assert.equal(parseWorkDate(invalid), null)
  const now = new Date(2026, 9, 27, 23, 59)
  assert.equal(formatWorkDate(parseWorkDate('2026-10-27'), now), 'Today')
  assert.equal(formatWorkDate(parseWorkDate('2026-10-28'), now), 'Tomorrow')
})

test('calendar sorts known dates and separates past work from uncertain dates without mutating courses', () => {
  const spaces = [{ name: 'Biology', upcomingWork: [
    { title: 'Lab', date: '2026-10-31' }, { title: 'Old quiz', date: '2026-10-20' },
    { title: 'Quiz', date: '2026-10-28' }, { title: 'Reading', date: 'Friday' },
    { title: 'Assignment', date: '' }, null,
  ] }, { name: 'React' }]
  const before = JSON.stringify(spaces)
  const work = collectUpcomingWork(spaces, new Date(2026, 9, 27))
  assert.deepEqual(work.upcoming.map((entry) => entry.title), ['Quiz', 'Lab'])
  assert.deepEqual(work.unconfirmed.map((entry) => entry.title), ['Reading', 'Assignment'])
  assert.deepEqual(work.past.map((entry) => entry.title), ['Old quiz'])
  assert.equal(JSON.stringify(spaces), before)
})

test('Home date preview is bounded and Calendar retains unconfirmed entries', () => {
  const spaces = [{ name: 'Biology', upcomingWork: [1, 2, 3, 4].map((day) => ({ title: `Work ${day}`, date: `2099-10-0${day}` })).concat({ title: 'Uncertain quiz', date: 'Friday' }) }]
  const preview = renderToStaticMarkup(createElement(UpcomingWork, { courses: spaces, preview: true }))
  assert.match(preview, /Work 3/)
  assert.doesNotMatch(preview, /Work 4/)
  const calendar = renderToStaticMarkup(createElement(UpcomingWork, { courses: spaces }))
  assert.match(calendar, /Work 4/)
  assert.match(calendar, /Dates to confirm/)
  assert.match(calendar, /Uncertain quiz/)
})
