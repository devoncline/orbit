import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { collectUpcomingWork, formatWorkDate, parseWorkDate } from '../src/services/upcomingWork.js'

let server
let HomeScreen
let AppShell
let UpcomingWork

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  HomeScreen = (await server.ssrLoadModule('/src/components/HomeScreen.jsx')).default
  AppShell = (await server.ssrLoadModule('/src/components/AppShell.jsx')).default
  UpcomingWork = (await server.ssrLoadModule('/src/components/UpcomingWork.jsx')).default
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
  assert.match(html, /Start learning/)
  assert.doesNotMatch(html, /disabled/)
  assert.match(html, /No dated work ahead/)
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

test('Study removes the desktop sidebar and keeps the navigation drawer available', () => {
  const html = renderToStaticMarkup(createElement(AppShell, { courses, destination: 'study' }))
  assert.doesNotMatch(html, /<aside/)
  assert.match(html, /<dialog/)
  assert.match(html, /orbit-shell-focused/)
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
