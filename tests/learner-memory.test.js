import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LEARNER_MEMORY_KEY, MAX_SAVED_THREADS, MAX_SAVED_EXCHANGES,
  createLearnerSnapshot, emptyLearnerMemory, loadLearnerMemory, saveLearnerMemory, clearLearnerMemory,
} from '../src/services/learnerMemory.js'
import { applyPositionOverride, continuationReason, coursePositionRequest, inferCoursePosition, localDate } from '../src/services/coursePosition.js'
import { initialThreads, studyThreadsReducer } from '../src/services/studyThreads.js'
import { generateStudyLesson, recommendCourse } from '../src/services/meta.js'
import lessonHandler from '../api/generate-study-lesson.js'

function browserStorage() {
  const entries = new Map()
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: (key) => entries.delete(key) }
}
const anchor = { type: 'analogy', topic: 'Props', summary: 'Learner connected props to function inputs.', confidence: 'high' }
const preference = { type: 'preference', topic: 'Props', summary: 'Learner reported that a concrete example helped with props.', confidence: 'medium' }
const lesson = { topic: 'Props', concept: 'Component inputs', content: 'A parent passes inputs to a child.' }
const course = {
  name: 'React', type: 'class', nextTask: 'Explore Props',
  syllabus: { courseName: 'Web development', instructor: 'Demo instructor', semester: 'Fall 2026' },
  importantTopics: ['Props', 'Effects'],
  syllabusItems: [{ topic: 'Orientation', startDate: '2026-08' }, { topic: 'Effects', startDate: '2026-10' }],
  upcomingWork: [{ title: 'Props quiz', topic: 'Props', date: '2026-10-28', type: 'quiz' }],
  mastery: { overall: 60, topics: { Props: 40, Effects: 80 } },
  learningAnchors: [anchor, preference],
  recentLearning: { topic: 'Props', summary: 'Practice passing a name.', updatedAt: '2026-10-27T12:00:00Z', positionKey: 'null' },
}
function memory() {
  return { courses: [structuredClone(course)], activeId: 'one', recommendation: { courseName: 'React', recommendedAction: 'Explore Props', reason: 'Practice inputs.' }, threads: [{
    id: 'one', courseName: 'React', positionKey: 'null', requestedTopic: 'Props', title: 'Component inputs', topic: 'Props',
    summary: 'Practice passing a name.', context: 'quiz', status: 'practiced', createdAt: '2026-10-27T12:00:00Z',
    resume: { lesson, conversation: [{ message: 'Like function inputs?', response: 'Yes, passed from the parent.' }], learningAnchors: [anchor, preference] },
  }] }
}

for (const count of [0, 1, 7]) test(`${count} spaces survive a fresh storage read without seeded demo data`, () => {
  const storage = browserStorage()
  const state = { ...emptyLearnerMemory(), courses: Array.from({ length: count }, (_, index) => ({ ...course, name: `Space ${index + 1}` })) }
  assert.equal(saveLearnerMemory(state, storage), true)
  const restored = loadLearnerMemory(storage)
  assert.deepEqual(restored.courses.map((space) => space.name), state.courses.map((space) => space.name))
  if (count) {
    assert.deepEqual(restored.courses[0].syllabusItems, createLearnerSnapshot(state).spaces[0].syllabusItems)
    assert.deepEqual(restored.courses[0].upcomingWork, course.upcomingWork)
    assert.equal(restored.courses[0].type, 'class')
    assert.ok(restored.courses[0].coursePosition.asOf)
  }
})

test('mastery, lesson, summaries, anchors and cautious preferences survive multiple reloads', () => {
  const storage = browserStorage()
  saveLearnerMemory(memory(), storage)
  const restored = loadLearnerMemory(storage)
  assert.deepEqual(restored.courses[0].mastery, course.mastery)
  assert.deepEqual(restored.courses[0].learningAnchors, [anchor, preference])
  assert.deepEqual(restored.threads[0].resume.lesson, lesson)
  assert.deepEqual(restored.threads[0].resume.learningAnchors, [anchor, preference])
  assert.equal(restored.threads[0].status, 'practiced')
  assert.equal(restored.activeId, 'one')
  assert.equal(restored.recommendation.recommendedAction, 'Explore Props')
  saveLearnerMemory(restored, storage)
  assert.deepEqual(loadLearnerMemory(storage), restored)
})

test('all explicit course corrections persist and override stale memories and dated inference', () => {
  const storage = browserStorage()
  const state = memory()
  let learnerPosition = applyPositionOverride(null, { type: 'skip', topic: 'Orientation' })
  learnerPosition = applyPositionOverride(learnerPosition, { type: 'notYet', topic: 'Effects' })
  learnerPosition = applyPositionOverride(learnerPosition, { type: 'current', topic: 'Components' })
  state.courses[0].learnerPosition = learnerPosition
  saveLearnerMemory(state, storage)
  const restored = loadLearnerMemory(storage).courses[0]
  assert.deepEqual(restored.learnerPosition, learnerPosition)
  assert.equal(inferCoursePosition(restored, '2026-10-27').currentTopic, 'Components')
  assert.equal(inferCoursePosition(restored, '2027-10-27').source, 'learner')
})

test('priority is correction, recent state, mastery/anchors, dates; recent state expires', () => {
  const current = { ...course, mastery: {}, learningAnchors: [] }
  assert.equal(inferCoursePosition(current, '2026-10-27').source, 'memory')
  assert.equal(inferCoursePosition({ ...current, recentLearning: null, mastery: course.mastery }, '2026-10-27').source, 'mastery')
  assert.equal(inferCoursePosition({ ...current, recentLearning: null, learningAnchors: [anchor] }, '2026-10-27').source, 'anchor')
  assert.equal(inferCoursePosition({ ...current, recentLearning: null }, '2026-10-27').source, 'syllabus')
  assert.equal(inferCoursePosition({ ...current, recentLearning: { ...course.recentLearning, updatedAt: '2026-09-01' } }, '2026-10-27').source, 'syllabus')
  const corrected = { ...current, learnerPosition: applyPositionOverride(null, { type: 'notYet', topic: 'Props' }) }
  assert.notEqual(inferCoursePosition(corrected, '2026-10-27').currentTopic, 'Props')
  assert.match(continuationReason(course, '2026-10-27'), /Props quiz is tomorrow.*Props could use another pass/)
  const evening = new Date(2026, 9, 27, 23, 59)
  const eveningCourse = { ...current, recentLearning: { ...course.recentLearning, updatedAt: evening.toISOString() } }
  assert.equal(inferCoursePosition(eveningCourse, localDate(evening)).source, 'memory')
  assert.equal(coursePositionRequest(eveningCourse).recentLearning.updatedAt, '2026-10-27')
})

test('invalid, incompatible, oversized and structurally broken snapshots fall back safely', () => {
  const storage = browserStorage()
  const valid = createLearnerSnapshot(memory())
  for (const raw of ['{', 'null', '[]', 'x'.repeat(1_000_001), ...[
    { ...valid, version: 999 }, { ...valid, spaces: {} }, { ...valid, threads: null },
    { ...valid, spaces: [null] }, { ...valid, spaces: [course, course] }, { ...valid, threads: [null] },
    { ...valid, threads: [valid.threads[0], valid.threads[0]] },
  ].map(JSON.stringify)]) {
    storage.setItem(LEARNER_MEMORY_KEY, raw)
    assert.deepEqual(loadLearnerMemory(storage), emptyLearnerMemory())
  }
  storage.setItem(LEARNER_MEMORY_KEY, JSON.stringify({ ...valid, spaces: [] }))
  assert.deepEqual(loadLearnerMemory(storage), emptyLearnerMemory())
})

test('stored threads, exchanges, text and anchors have strict bounds while the active thread survives', () => {
  const state = memory()
  state.threads = Array.from({ length: 50 }, (_, index) => ({ ...state.threads[0], id: String(index),
    summary: 's'.repeat(900), createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    resume: { lesson, conversation: Array.from({ length: 40 }, (_, i) => ({ message: `${i}:` + 'm'.repeat(800), response: 'r'.repeat(1800) })),
      learningAnchors: Array.from({ length: 40 }, (_, i) => ({ ...anchor, topic: `Topic ${i}` })) },
  }))
  state.activeId = '0'
  const snapshot = createLearnerSnapshot(state)
  assert.equal(snapshot.threads.length, MAX_SAVED_THREADS)
  assert.equal(snapshot.activeId, '0')
  assert.ok(snapshot.threads.some((thread) => thread.id === '49'))
  for (const thread of snapshot.threads) {
    assert.equal(thread.summary.length, 160)
    assert.equal(thread.resume.conversation.length, MAX_SAVED_EXCHANGES)
    assert.match(thread.resume.conversation[0].message, /^38:/)
    assert.equal(thread.resume.conversation[0].message.length, 600)
    assert.equal(thread.resume.conversation[0].response.length, 900)
    assert.equal(thread.resume.learningAnchors.length, 8)
  }
})

test('only allowlisted fields persist; files, credentials, drafts, quizzes and identity labels do not', () => {
  const state = memory()
  state.courses[0].apiKey = 'SECRET_SENTINEL'
  state.courses[0].auth = { token: 'SECRET_SENTINEL' }
  state.courses[0].files = [{ name: 'syllabus.pdf', type: 'application/pdf', size: 123, file: { data: 'BINARY_SENTINEL' }, token: 'SECRET_SENTINEL' }]
  state.courses[0].learningAnchors.push({ ...preference, summary: 'A visual learner.' })
  Object.assign(state.threads[0].resume, { learnerMessage: 'UNSENT_SENTINEL', activityResponse: 'UNSENT_SENTINEL', studyQuestion: { question: 'QUIZ_SENTINEL' }, token: 'SECRET_SENTINEL' })
  const serialized = JSON.stringify(createLearnerSnapshot(state))
  assert.doesNotMatch(serialized, /SECRET_SENTINEL|BINARY_SENTINEL|UNSENT_SENTINEL|QUIZ_SENTINEL|visual learner/)
  assert.match(serialized, /syllabus.pdf/)
})

test('unavailable or full storage preserves the running state and the last saved snapshot', () => {
  const state = memory()
  const before = structuredClone(state)
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') }, removeItem() { throw new Error('blocked') } }
  assert.deepEqual(loadLearnerMemory(blocked), emptyLearnerMemory())
  assert.equal(saveLearnerMemory(state, blocked), false)
  assert.equal(clearLearnerMemory(blocked), false)
  assert.deepEqual(state, before)
  const storage = browserStorage()
  saveLearnerMemory(state, storage)
  const saved = storage.getItem(LEARNER_MEMORY_KEY)
  assert.equal(saveLearnerMemory({ ...state, courses: Array(101).fill(course) }, storage), false)
  assert.equal(storage.getItem(LEARNER_MEMORY_KEY), saved)
})

test('reset removes only Orbit memory and clears thread selection; subsequent reload is empty', () => {
  const storage = browserStorage()
  storage.setItem('another-app', 'keep')
  saveLearnerMemory(memory(), storage)
  assert.equal(clearLearnerMemory(storage), true)
  assert.equal(storage.getItem(LEARNER_MEMORY_KEY), null)
  assert.equal(storage.getItem('another-app'), 'keep')
  assert.deepEqual(loadLearnerMemory(storage), emptyLearnerMemory())
  assert.deepEqual(studyThreadsReducer(memory(), { type: 'reset' }), initialThreads)
  saveLearnerMemory(emptyLearnerMemory(), storage)
  assert.equal(storage.getItem(LEARNER_MEMORY_KEY), null)
})

test('existing services receive only relevant memory and never the full stored snapshot', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({}) }))
  const withPrivateFields = { ...course, apiKey: 'SECRET_SENTINEL', files: [{ file: 'BINARY_SENTINEL' }], transcript: 'HISTORY_SENTINEL' }
  await recommendCourse([withPrivateFields])
  await generateStudyLesson(withPrivateFields, 60, { anchors: course.learningAnchors })
  for (const { arguments: [url, options] } of mock.mock.calls) {
    assert.ok(['/api/recommend-course', '/api/generate-study-lesson'].includes(url))
    assert.doesNotMatch(options.body, /SECRET_SENTINEL|BINARY_SENTINEL|HISTORY_SENTINEL/)
    assert.match(options.body, /Props/)
    assert.doesNotMatch(options.body, /"threads"|"version"/)
  }
})

test('server lesson generation enforces restored recent topic ahead of a dated unit', async (t) => {
  let next = { ...lesson, topic: 'Effects' }
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(next) }] }] }) }))
  const request = { ...coursePositionRequest(course, '2026-10-27'), courseName: course.name, importantTopics: course.importantTopics, nextTask: course.nextTask }
  const call = async () => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await lessonHandler({ method: 'POST', body: request }, res)
    return res
  }
  assert.equal((await call()).statusCode, 502)
  next = lesson
  assert.equal((await call()).statusCode, 200)
  const prompt = JSON.parse(mock.mock.calls[1].arguments[1].body).input
  assert.match(prompt, /Use this exact topic label: "Props"/)
  assert.match(prompt, /recent learner state/)
})
