import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyMasteryEvidence, masteryEvidenceId, normalizeMastery, MAX_MASTERY_EVIDENCE } from '../src/services/mastery.js'
import { createLearnerSnapshot, emptyLearnerMemory, loadLearnerMemory } from '../src/services/learnerMemory.js'

const event = (kind = 'quiz', outcome = 'success', prompt = 'Question 1', topic = 'Cells') => ({ kind, outcome, topic, id: masteryEvidenceId(topic, prompt) })

test('quizzes build gradually with repeated understanding, taper near 100 and apply modest setbacks', () => {
  let mastery = applyMasteryEvidence(undefined, event())
  assert.equal(mastery.topics.Cells, 8)
  for (let index = 2; index < 100; index++) {
    const previous = mastery
    mastery = applyMasteryEvidence(mastery, event('quiz', 'success', `Question ${index}`))
    assert.ok(mastery.topics.Cells - previous.topics.Cells <= 8)
    assert.ok(mastery.overall <= 100)
  }
  assert.equal(mastery.overall, 100)
  assert.equal(applyMasteryEvidence(mastery, event('quiz', 'miss', 'Another question')).overall, 97)
  assert.equal(mastery.evidence.length, MAX_MASTERY_EVIDENCE)
})

test('activities count demonstrated understanding; recovery earns smaller credit and cannot be farmed', () => {
  const start = { overall: 50, topics: { Cells: 50 } }
  const miss = applyMasteryEvidence(start, event('activity', 'miss'))
  assert.equal(miss.topics.Cells, 48)
  const recovered = applyMasteryEvidence(miss, event('activity'))
  assert.equal(recovered.topics.Cells, 51)
  assert.deepEqual(applyMasteryEvidence(recovered, event('activity')), recovered)
  assert.deepEqual(applyMasteryEvidence(recovered, event('activity', 'miss')), recovered)
  assert.equal(applyMasteryEvidence(start, event('activity')).topics.Cells, 53)
  for (const kind of ['read', 'understand', 'example', 'simplify', 'complete']) {
    assert.deepEqual(applyMasteryEvidence(start, event(kind)), normalizeMastery(start))
  }
})

test('quiz explanation retries do not reapply the miss and recovery is smaller than fresh success', () => {
  const miss = applyMasteryEvidence({ topics: { Cells: 40 } }, event('quiz', 'miss'))
  assert.equal(miss.topics.Cells, 37)
  assert.deepEqual(applyMasteryEvidence(miss, event('quiz', 'miss')), miss)
  const recovery = applyMasteryEvidence(miss, event('recovery'))
  assert.equal(recovery.topics.Cells, 40)
  assert.deepEqual(applyMasteryEvidence(recovery, event('recovery')), recovery)
})

test('course mastery is a weighted topic average; adding an unpracticed topic does not cause a huge swing', () => {
  const before = { topics: { Cells: 90, Genetics: 70 } }
  assert.equal(normalizeMastery(before).overall, 80)
  const next = applyMasteryEvidence(before, event('quiz', 'success', 'New topic question', 'Energy'))
  assert.equal(next.topics.Energy, 8)
  assert.equal(next.overall, Math.round((90 * 12 + 70 * 12 + 8) / 25))
  assert.ok(Math.abs(next.overall - 80) <= 8)
  assert.deepEqual(before, { topics: { Cells: 90, Genetics: 70 } })
  const anotherCourse = applyMasteryEvidence(undefined, event())
  assert.equal(anotherCourse.topics.Cells, 8)
})

test('legacy topic scores and course-only estimates survive; evidence is bounded and persists without raw answers', () => {
  for (const version of [1, 2]) {
    const legacy = { version, spaces: [{ name: 'Biology', mastery: { overall: 60, topics: { Cells: 40, Genes: 80 } } }], threads: [] }
    const state = loadLearnerMemory({ getItem: () => JSON.stringify(legacy) })
    assert.deepEqual(state.courses[0].mastery, legacy.spaces[0].mastery)
    state.courses[0].mastery = applyMasteryEvidence(state.courses[0].mastery, event('quiz', 'success', 'PRIVATE_ANSWER', ' cells '))
    assert.deepEqual(Object.keys(state.courses[0].mastery.topics), ['Cells', 'Genes'])
    const snapshot = createLearnerSnapshot(state)
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_ANSWER/)
    const restored = loadLearnerMemory({ getItem: () => JSON.stringify(snapshot) })
    assert.deepEqual(restored.courses[0].mastery, state.courses[0].mastery)
    assert.deepEqual(applyMasteryEvidence(restored.courses[0].mastery, event('quiz', 'success', 'PRIVATE_ANSWER', 'Cells')), restored.courses[0].mastery)
  }
  const legacy = applyMasteryEvidence({ overall: 60 }, event())
  assert.equal(legacy.topics.Cells, 64)
  assert.ok(Math.abs(applyMasteryEvidence(legacy, event('quiz', 'success', 'Another', 'Other')).overall - 64) <= 8)
  assert.equal(createLearnerSnapshot({ ...emptyLearnerMemory(), courses: [{ name: 'New' }] }).spaces[0].mastery.overall, 0)
})
