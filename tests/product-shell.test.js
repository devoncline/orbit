import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { collectUpcomingWork, formatWorkDate, parseWorkDate } from '../src/services/upcomingWork.js'
import { learningAction } from '../src/components/learningAction.js'

let server
let HomeScreen
let AppShell
let UpcomingWork
let StudyThreads

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  HomeScreen = (await server.ssrLoadModule('/src/components/HomeScreen.jsx')).default
  AppShell = (await server.ssrLoadModule('/src/components/AppShell.jsx')).default
  UpcomingWork = (await server.ssrLoadModule('/src/components/UpcomingWork.jsx')).default
  StudyThreads = (await server.ssrLoadModule('/src/components/StudyThreads.jsx')).default
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
  assert.match(html, /I’m taking a class/)
  assert.match(html, /I want to learn something/)
  assert.match(html, /I already have material/)
  assert.doesNotMatch(html, /Start learning <|home-recommendation|Coming up/)
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
  assert.match(html, /Refresh clears these threads/)
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
