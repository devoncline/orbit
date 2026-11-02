import { normalizeMastery } from './mastery.js'

// Presentation only: evidence, recommendations and saved scores stay numeric.
export const MASTERY_RANKS = Object.freeze([
  { id: 'launch-pad', label: 'Launch Pad', description: 'Getting ready to build understanding through practice.', order: 0, minimum: 0 },
  { id: 'in-orbit', label: 'In Orbit', description: 'Early practice is showing what you understand.', order: 1, minimum: 15 },
  { id: 'cruising', label: 'Cruising', description: 'Your understanding is growing with practice.', order: 2, minimum: 35 },
  { id: 'deep-space', label: 'Deep Space', description: 'Repeated practice shows a strong understanding.', order: 3, minimum: 55 },
  { id: 'mission-ready', label: 'Mission Ready', description: 'You have demonstrated understanding across repeated practice.', order: 4, minimum: 75 },
].map(rank => Object.freeze(rank)))

const topicKey = value => typeof value === 'string' ? value.trim().slice(0, 120).toLowerCase() : ''

export function masteryRank(score) {
  const value = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
  return MASTERY_RANKS.findLast(rank => value >= rank.minimum)
}

function topicMasteryEntry(mastery, topic) {
  return Object.entries(normalizeMastery(mastery).topics).find(([name]) => topicKey(name) === topicKey(topic))
}

export function hasTopicMastery(mastery, topic) {
  return Boolean(topicMasteryEntry(mastery, topic))
}

export function topicMasteryRank(mastery, topic) {
  const entry = topicMasteryEntry(mastery, topic)
  // A course-only legacy estimate cannot tell us the rank of an individual topic.
  return masteryRank(entry?.[1])
}

export function masteryRankDistribution(mastery, startedTopicNames = []) {
  const topics = normalizeMastery(mastery).topics
  const scores = new Map(Object.entries(topics).map(([name, score]) => [topicKey(name), score]))
  for (const name of startedTopicNames) {
    const key = topicKey(name)
    if (key && !scores.has(key)) scores.set(key, 0)
  }
  const counts = new Map()
  for (const score of scores.values()) {
    const rank = masteryRank(score)
    counts.set(rank.id, (counts.get(rank.id) || 0) + 1)
  }
  return MASTERY_RANKS.toReversed().filter(rank => counts.has(rank.id)).map(rank => ({ rank, count: counts.get(rank.id) }))
}

// Compare explicit before/after evidence states, never a mount/hydration baseline.
// No rank history is persisted: downward crossings remain score-derived this pass.
export function topicMasteryRankChange(before, after, topic) {
  if (!before || !after || !topicKey(topic)) return null
  const from = topicMasteryRank(before, topic)
  const to = topicMasteryRank(after, topic)
  return from.id === to.id ? null : { from, to, direction: to.order > from.order ? 'up' : 'down' }
}
