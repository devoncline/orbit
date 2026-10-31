import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { DEFAULT_LEARNING_PROFILE, normalizeLearningProfile } from '../src/services/learningProfile.js'
import { emptyLearnerMemory, loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'

let dom, server, createRoot, StudySession, App, root, container
const globals = new Map()
const course = { name: 'React', mastery: { overall: 40, topics: { State: 40 } } }
const lesson = { topic: 'State', concept: 'Remembering a value', content: 'State remembers a value between renders.' }
const profile = { chunkSize: 'short', exampleTiming: 'early', visualPreference: 'on_request', guidance: 'focused', reentrySupport: 'where_left_off' }
const props = { course, threadId: 'one', mastery: 40, initialThread: { summary: 'You tried a counter.', context: 'quiz', resume: { lesson } },
  setMastery: () => assert.fail('Preferences must not change mastery'), updateTopicMastery: () => assert.fail('Preferences must not change topic mastery') }
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const button = (label) => [...container.querySelectorAll('button')].find((element) => element.textContent === label)
const click = async (label) => { assert.ok(button(label), `Missing ${label}`); await act(async () => button(label).click()) }
const choose = async (key, value) => act(async () => container.querySelector(`input[name$="-${key}"][value="${value}"]`).click())
const renderStudy = async (extra = {}) => act(async () => root.render(createElement(StrictMode, null, createElement(StudySession, { ...props, learningProfile: profile, ...extra }))))
const renderApp = async () => act(async () => root.render(createElement(App)))
const reloadApp = async () => { await act(async () => root.unmount()); root = createRoot(container); await renderApp() }

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, localStorage: dom.localStorage, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
  App = (await server.ssrLoadModule('/src/App.jsx')).default
})
beforeEach(() => {
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

test('optional Home setup has five labelled radio groups, saves an editable summary and survives refresh before any space exists', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Setup must not call an API'))
  await renderApp()
  assert.equal(container.querySelector('.home-learning-preferences').open, false)
  await act(async () => container.querySelector('.home-learning-preferences summary').click())
  assert.equal(container.querySelector('.home-learning-preferences').open, true)
  assert.ok(button('Set up my preferences'))
  assert.ok(button('I want to learn something'), 'Setup does not gate learning entry')
  await click('Set up my preferences')
  assert.equal(container.querySelectorAll('.learning-preferences fieldset').length, 5)
  assert.equal(container.querySelectorAll('.learning-preferences input:checked').length, 5)
  assert.equal(dom.document.activeElement, container.querySelector('.learning-preferences h2'))
  for (const [key, value] of Object.entries(profile)) await choose(key, value)
  for (const fieldset of container.querySelectorAll('.learning-preferences fieldset')) {
    assert.ok(fieldset.querySelector('legend').textContent)
    assert.equal(fieldset.querySelectorAll('input:checked').length, 1)
    assert.ok(fieldset.querySelector('input:checked').closest('label').classList.contains('preference-selected'))
  }
  await click('Save preferences')
  assert.equal(container.querySelector('.learning-preferences h2').textContent, 'Learning preferences')
  assert.match(container.textContent, /Shorter explanations/)
  assert.match(container.textContent, /Visuals when I ask/)
  assert.deepEqual(loadLearnerMemory().learningPreferences.profile, profile)
  assert.equal(loadLearnerMemory().courses.length, 0)
  await reloadApp()
  assert.equal(container.querySelector('.home-learning-preferences').open, false)
  await act(async () => container.querySelector('.home-learning-preferences summary').click())
  assert.ok(button('Edit preferences'))
  assert.equal(button('Set up my preferences'), undefined)
})

test('setup can be dismissed or skipped and remains optional across reloads', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('No API for preferences'))
  await renderApp()
  await act(async () => container.querySelector('.home-learning-preferences summary').click())
  await click('Not now')
  await reloadApp()
  await act(async () => container.querySelector('.home-learning-preferences summary').click())
  assert.equal(button('Not now'), undefined)
  assert.ok(button('Choose learning preferences'))
  await click('Choose learning preferences')
  await choose('chunkSize', 'short')
  await click('Skip setup')
  assert.equal(loadLearnerMemory().learningPreferences.status, 'dismissed')
  assert.deepEqual(loadLearnerMemory().learningPreferences.profile, DEFAULT_LEARNING_PROFILE)
  await click('I want to learn something')
  assert.match(container.textContent, /What do you want to learn/)
})

test('Library editing, cancel and reset preserve saved progress; full local-data reset clears preferences too', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => json({ courseName: 'React', recommendedAction: 'Explore State', reason: 'Keep exploring.' }))
  saveLearnerMemory({ ...emptyLearnerMemory(), courses: [course], learningPreferences: { status: 'saved', profile } })
  const before = loadLearnerMemory().courses
  await renderApp()
  await click('Library')
  await click('Edit preferences')
  await choose('chunkSize', 'detailed')
  await click('Cancel')
  assert.equal(loadLearnerMemory().learningPreferences.profile.chunkSize, 'short')
  await click('Edit preferences')
  await choose('chunkSize', 'detailed')
  await click('Save preferences')
  assert.equal(loadLearnerMemory().learningPreferences.profile.chunkSize, 'detailed')
  await click('Reset preferences')
  assert.deepEqual(loadLearnerMemory().learningPreferences.profile, DEFAULT_LEARNING_PROFILE)
  assert.deepEqual(loadLearnerMemory().courses, before)
  await click('Clear local learning data')
  await click('Confirm clear learning data')
  assert.deepEqual(loadLearnerMemory(), emptyLearnerMemory())
})

test('focused guidance keeps one primary action and quieter collapsed tools; explore exposes all tools without altering progress', async (t) => {
  const updates = []
  t.mock.method(globalThis, 'fetch', () => assert.fail('Changing preferences must not fetch'))
  const extra = { onThreadUpdate: (_id, value) => updates.push(value) }
  await renderStudy(extra)
  assert.equal(container.querySelector('.study-session').dataset.choiceDensity, 'low')
  assert.equal(container.querySelector('.study-tools').open, false)
  assert.equal(container.querySelectorAll('.study-primary-action').length, 1)
  assert.equal(container.querySelector('.study-primary-action').textContent.trim(), 'Quiz me')
  assert.equal(container.querySelectorAll('.study-tools button').length, 6)
  await renderStudy({ ...extra, learningProfile: { ...profile, guidance: 'explore' } })
  assert.equal(container.querySelector('.study-tools').open, true)
  assert.equal(container.querySelector('.study-session').dataset.choiceDensity, 'expanded')
  assert.equal(updates.length, 0, 'Profile edits are not learning evidence')
  assert.match(container.querySelector('.study-context').textContent, /Lesson 1/)
})

test('editing preferences updates the next teaching request without reloading the current lesson', async (t) => {
  const requests = []
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  t.mock.method(globalThis, 'fetch', async (_path, options) => { requests.push(JSON.parse(options.body)); return json({ ...lesson, content: 'State is a notebook that remembers a count.' }) })
  await renderStudy()
  assert.equal(requests.length, 0)
  await click('I lost you')
  assert.deepEqual(requests[0].learningProfile, profile)
  await renderStudy({ learningProfile: { ...profile, chunkSize: 'detailed', exampleTiming: 'after' } })
  assert.equal(requests.length, 1)
  assert.match(container.textContent, /notebook that remembers/)
  await click('I lost you')
  assert.equal(requests.length, 2)
  assert.equal(requests[1].learningProfile.chunkSize, 'detailed')
  assert.equal(requests[1].learningProfile.exampleTiming, 'after')
})

test('an unopened session uses the latest profile when first activated and does not regenerate after later edits', async (t) => {
  const requests = []
  t.mock.method(dom, 'matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  t.mock.method(globalThis, 'fetch', async (_path, options) => { requests.push(JSON.parse(options.body)); return json(lesson) })
  await renderStudy({ initialThread: undefined, active: false })
  await renderStudy({ initialThread: undefined, active: false, learningProfile: { chunkSize: 'detailed' } })
  assert.equal(requests.length, 0)
  await renderStudy({ initialThread: undefined, active: true, learningProfile: { chunkSize: 'detailed' } })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].learningProfile.chunkSize, 'detailed')
  await renderStudy({ initialThread: undefined, active: true })
  assert.equal(requests.length, 1)
})

test('high re-entry support uses saved or mounted context; just-continue hides the notice without new tracking', async (t) => {
  const updates = []
  t.mock.method(globalThis, 'fetch', () => assert.fail('Resume preferences do not call a model'))
  const extra = { onThreadUpdate: (_id, value) => updates.push(value) }
  await renderStudy(extra)
  assert.match(container.querySelector('.study-resume-note').textContent, /You left off with Quiz me/)
  assert.match(container.querySelector('.study-resume-note').textContent, /quiz questions start fresh/)
  await click('Talk it through')
  assert.equal(container.querySelector('.study-resume-note'), null)
  const before = JSON.stringify(updates)
  await renderStudy({ ...extra, active: false })
  await renderStudy({ ...extra, active: true })
  assert.match(container.querySelector('.study-resume-note').textContent, /Talk it through.*current work is still here/)
  await renderStudy({ ...extra, learningProfile: { ...profile, reentrySupport: 'continue' } })
  assert.equal(container.querySelector('.study-resume-note'), null)
  assert.equal(JSON.stringify(updates), before)
})

test('the first activation of a restored hidden thread keeps its saved recap rather than claiming unsaved tasks survived', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Restored lesson must not refetch'))
  await renderStudy({ active: false })
  await renderStudy({ active: true })
  assert.match(container.querySelector('.study-resume-note').textContent, /You left off with Quiz me/)
  assert.match(container.querySelector('.study-resume-note').textContent, /quiz questions start fresh/)
  assert.doesNotMatch(container.querySelector('.study-resume-note').textContent, /current work is still here/)
})

test('explicit Show me works with on-request visuals, and profile changes never regenerate or alter its cache', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (path, options) => { assert.equal(path, '/api/generate-lesson-image'); requests.push(JSON.parse(options.body)); return json({ url: 'https://images.example.test/profile.webp' }) })
  await renderStudy()
  assert.equal(requests.length, 0)
  await click('Show me')
  assert.equal(requests.length, 1)
  assert.equal(container.querySelector('.study-session').dataset.presentationMode, 'visual')
  assert.ok(container.querySelector('.lesson-generated-image'))
  await renderStudy({ learningProfile: normalizeLearningProfile({ visualPreference: 'often' }) })
  assert.equal(requests.length, 1)
  await click('Lesson')
  await click('Show me')
  assert.equal(requests.length, 1)
})
