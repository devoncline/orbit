import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStudyThread, initialThreads, resolveLearningSpace, selectStudyInteraction, studyThreadMetadata, studyThreadsReducer } from '../src/services/studyThreads.js'
import { inferCoursePosition } from '../src/services/coursePosition.js'

test('a subject starts a self-directed space and thread without course enrollment or syllabus setup', () => {
  const course = resolveLearningSpace([], '  Quantum physics  ')
  assert.equal(course.name, 'Quantum physics')
  assert.equal(course.type, 'topic')
  assert.equal(course.nextTask, 'Explore Quantum physics')
  assert.equal(course.syllabus, undefined)
  assert.equal(inferCoursePosition(course).needsConfirmation, false)
  const state = studyThreadsReducer(initialThreads, { type: 'create', thread: createStudyThread(course, '', 'first') })
  assert.equal(state.activeId, 'first')
  assert.equal(state.threads[0].courseName, 'Quantum physics')
})

test('choosing an existing subject preserves its identity, mastery and explicit course position', () => {
  const existing = { name: 'React', type: 'class', mastery: { overall: 80, topics: { Props: 80 } }, learnerPosition: { currentTopic: 'Props', exclusions: [], statement: 'We are on Props' } }
  const before = structuredClone(existing)
  const result = resolveLearningSpace([existing], '  REACT  ')
  assert.equal(result, existing)
  assert.deepEqual(existing, before)
  assert.equal(inferCoursePosition(result).currentTopic, 'Props')
})

test('empty and oversized subject entries cannot create a space or thread', () => {
  for (const topic of ['', '   ', null, 'a'.repeat(121)]) assert.equal(resolveLearningSpace([], topic), null)
})

test('new threads have independent identities, topic goals, summaries, and session order', () => {
  const first = createStudyThread({ name: 'React' }, 'Props basics', 'one', new Date('2026-10-27T12:00:00Z'))
  const second = createStudyThread({ name: 'React' }, 'One-way data', 'two', new Date('2026-10-27T12:01:00Z'))
  let state = studyThreadsReducer(initialThreads, { type: 'create', thread: first })
  state = studyThreadsReducer(state, { type: 'create', thread: second })
  assert.equal(state.activeId, 'two')
  assert.deepEqual(state.threads.map((thread) => thread.requestedTopic), ['Props basics', 'One-way data'])
  assert.ok(first.createdAt < second.createdAt)
  assert.equal(first.context, 'lesson')
  assert.ok(first.summary)
  assert.deepEqual(initialThreads, { threads: [], activeId: null })
})

test('switching between courses preserves thread identities and metadata, including inactive updates', () => {
  const first = createStudyThread({ name: 'React' }, 'Props', 'one')
  const second = createStudyThread({ name: 'Biology' }, 'Cells', 'two')
  let state = studyThreadsReducer(initialThreads, { type: 'create', thread: first })
  state = studyThreadsReducer(state, { type: 'create', thread: second })
  state = studyThreadsReducer(state, { type: 'update', id: 'one', metadata: { summary: 'A parent passes a name.', context: 'conversation' } })
  const before = state.threads
  state = studyThreadsReducer(state, { type: 'switch', id: 'one' })
  assert.equal(state.activeId, 'one')
  assert.equal(state.threads, before)
  assert.equal(state.threads[0].summary, 'A parent passes a name.')
  assert.equal(state.threads[1], second)
  assert.equal(studyThreadsReducer(state, { type: 'switch', id: 'missing' }), state)
  assert.equal(studyThreadsReducer(state, { type: 'update', id: 'one', metadata: { summary: 'A parent passes a name.' } }), state)
})

test('switching interactions always selects one active view without changing retained study data', () => {
  const retained = { lesson: { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs.' }, activity: { title: 'Try a name' }, conversation: [{ message: 'Why one way?', response: 'The parent owns the value.' }], anchors: [{ topic: 'Props', summary: 'Understands inputs.' }] }
  const before = structuredClone(retained)
  let active = 'lesson'
  for (const next of ['example', 'activity', 'conversation', 'quiz', 'lesson', 'conversation']) {
    active = selectStudyInteraction(active, next)
    assert.equal(['lesson', 'example', 'activity', 'conversation', 'quiz'].filter((view) => view === active).length, 1)
    assert.equal(active, next)
  }
  assert.equal(selectStudyInteraction(active, 'unknown'), active)
  assert.deepEqual(retained, before)
})

test('thread summaries describe the latest objective and interaction without full transcripts', () => {
  const metadata = studyThreadMetadata({ lesson: { topic: 'Props', concept: 'One-way inputs' }, activeInteraction: 'conversation', conversation: Array.from({ length: 30 }, (_, index) => ({ message: `Question ${index} ` + 'x'.repeat(400) })) })
  assert.equal(metadata.title, 'One-way inputs')
  assert.equal(metadata.topic, 'Props')
  assert.equal(metadata.context, 'conversation')
  assert.match(metadata.summary, /^Question 29/)
  assert.equal(metadata.summary.length, 160)
})
