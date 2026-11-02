import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyMasteryEvidence, masteryEvidenceId } from '../src/services/mastery.js'
import { MASTERY_RANKS, masteryRank, topicMasteryRank, masteryRankDistribution, topicMasteryRankChange } from '../src/services/masteryRanks.js'
import { createLearnerSnapshot, loadLearnerMemory } from '../src/services/learnerMemory.js'
import { courseLaunchRecommendations } from '../src/services/coursePosition.js'

for (const [score, id] of [[0, 'launch-pad'], [14, 'launch-pad'], [15, 'in-orbit'], [34, 'in-orbit'], [35, 'cruising'], [54, 'cruising'], [55, 'deep-space'], [74, 'deep-space'], [75, 'mission-ready'], [100, 'mission-ready']]) {
  test(`mastery ${score} maps to ${id}`, () => assert.equal(masteryRank(score).id, id))
}

test('unknown scores start at Launch Pad; finite scores follow existing rounding and bounds', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, '75', {}, -1]) assert.equal(masteryRank(value).id, 'launch-pad')
  assert.equal(masteryRank(14.4).id, 'launch-pad')
  assert.equal(masteryRank(14.6).id, 'in-orbit')
  assert.equal(masteryRank(120).id, 'mission-ready')
  assert.deepEqual(MASTERY_RANKS.map(rank => rank.label), ['Launch Pad', 'In Orbit', 'Cruising', 'Deep Space', 'Mission Ready'])
  assert.ok(MASTERY_RANKS.every(rank => rank.description && Number.isInteger(rank.order)))
})

test('topic lookup follows mastery normalization, matches casing, and never borrows a course estimate', () => {
  const mastery = { overall: 90, topics: { ' Gravity ': 48, GRAVITY: 90, Orbits: 63, Unknown: null } }
  assert.equal(topicMasteryRank(mastery, ' gRavity ').label, 'Cruising')
  assert.equal(topicMasteryRank(mastery, 'ORBITS').label, 'Deep Space')
  for (const topic of ['New topic', 'Unknown', undefined]) assert.equal(topicMasteryRank(mastery, topic).label, 'Launch Pad')
  assert.equal(topicMasteryRank({ overall: 90 }, 'Gravity').label, 'Launch Pad')
})

test('distribution counts unique practiced and started topics without assigning a course rank', () => {
  const mastery = { topics: { Cells: 75, Energy: 100, Genetics: 63, Orbits: 20, Gravity: 30 } }
  const before = structuredClone(mastery)
  const distribution = masteryRankDistribution(mastery, [' CELLS ', 'Light', 'light', '', 'Forces'])
  assert.deepEqual(distribution.map(({ rank, count }) => [rank.label, count]), [['Mission Ready', 2], ['Deep Space', 1], ['In Orbit', 2], ['Launch Pad', 2]])
  assert.deepEqual(mastery, before)
  assert.deepEqual(masteryRankDistribution({ overall: 90 }), [])
  assert.deepEqual(masteryRankDistribution(undefined), [])
})

for (const [kind, expected] of [['quiz', [2, 5, 9, 15]], ['activity', [3, 7, 12, 20]], ['recovery', [4, 10, 17, 27]]]) {
  test(`${kind} ranks require repeated unique evidence and never skip ranks`, () => {
    let mastery = { topics: {} }
    const reached = []
    for (let index = 1; reached.length < 4 && index <= 40; index++) {
      const evidence = { topic: 'Cells', kind, outcome: 'success', id: masteryEvidenceId('Cells', `Task ${index}`) }
      const next = applyMasteryEvidence(mastery, evidence)
      const change = topicMasteryRankChange(mastery, next, 'cells')
      if (index === 1) assert.equal(change, null)
      if (change) {
        assert.equal(change.direction, 'up')
        assert.equal(change.to.order - change.from.order, 1)
        reached.push(index)
      }
      assert.deepEqual(applyMasteryEvidence(next, evidence), next)
      mastery = next
    }
    assert.deepEqual(reached, expected)
  })
}

test('rank changes ignore ordinary score changes, other topics and missing hydration baselines', () => {
  const before = { topics: { Cells: 54, Energy: 20 } }
  const after = { topics: { Cells: 55, Energy: 21 } }
  assert.equal(topicMasteryRankChange(before, after, 'Energy'), null)
  assert.equal(topicMasteryRankChange(before, before, 'Cells'), null)
  assert.equal(topicMasteryRankChange(undefined, after, 'Cells'), null)
  assert.equal(topicMasteryRankChange(before, undefined, 'Cells'), null)
  const crossing = topicMasteryRankChange(before, after, 'CELLS')
  assert.equal(crossing.to.label, 'Deep Space')
  assert.equal(crossing.direction, 'up')
  // No persisted hysteresis yet: a miss can still cross a boundary downward.
  const miss = applyMasteryEvidence(after, { topic: 'Cells', kind: 'quiz', outcome: 'miss', id: masteryEvidenceId('Cells', 'Miss') })
  assert.equal(topicMasteryRankChange(after, miss, 'Cells').direction, 'down')
})

test('legacy saves project into ranks without changing their numeric data or snapshot version', () => {
  for (const version of [1, 2]) {
    const mastery = { overall: 60, topics: { Cells: 40, Genes: 80 } }
    const state = loadLearnerMemory({ getItem: () => JSON.stringify({ version, spaces: [{ name: 'Biology', mastery }], threads: [] }) })
    assert.equal(topicMasteryRank(state.courses[0].mastery, 'Cells').label, 'Cruising')
    assert.equal(topicMasteryRank(state.courses[0].mastery, 'Genes').label, 'Mission Ready')
    const snapshot = createLearnerSnapshot(state)
    assert.equal(snapshot.version, 2)
    assert.deepEqual(snapshot.spaces[0].mastery, mastery)
    assert.doesNotMatch(JSON.stringify(snapshot.spaces[0].mastery), /rank|Cruising|Mission Ready/)
  }
})

test('recommendations still distinguish numeric scores within the same rank', () => {
  const course = { name: 'Physics', importantTopics: ['Gravity', 'Orbits'], mastery: { topics: { Gravity: 34, Orbits: 15 } } }
  assert.equal(topicMasteryRank(course.mastery, 'Gravity'), topicMasteryRank(course.mastery, 'Orbits'))
  assert.equal(courseLaunchRecommendations(course, '2026-11-02').primary.topic, 'Orbits')
})
