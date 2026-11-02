const text = value => typeof value === 'string' ? value.trim().slice(0, 120) : ''
const score = value => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
export const MAX_MASTERY_EVIDENCE = 64

// Numeric topic scores remain compatible with existing recommendations and saves.
export function normalizeMastery(value) {
  const topics = {}
  for (const [name, valueScore] of Object.entries(value?.topics || {}).slice(0, 100)) {
    const topic = text(name)
    if (!topic || !Number.isFinite(valueScore) || Object.keys(topics).some(key => key.toLowerCase() === topic.toLowerCase())) continue
    Object.defineProperty(topics, topic, { value: score(valueScore), enumerable: true, configurable: true, writable: true })
  }
  const evidence = (Array.isArray(value?.evidence) ? value.evidence : [])
    .filter(item => typeof item === 'string' && /^[a-z]+:[a-f0-9]{8}:(success|miss)$/.test(item)).slice(-MAX_MASTERY_EVIDENCE)
  const observations = Object.fromEntries(Object.keys(topics).map(topic => [topic,
    Number.isFinite(value?.observations?.[topic]) ? Math.max(1, Math.min(20, Math.round(value.observations[topic]))) : 12]))
  const names = Object.keys(topics)
  const weight = names.reduce((sum, topic) => sum + observations[topic], 0)
  return { overall: weight ? Math.round(names.reduce((sum, topic) => sum + topics[topic] * observations[topic], 0) / weight) : score(value?.overall),
    topics, ...(value?.observations ? { observations } : {}), ...(evidence.length ? { evidence: [...new Set(evidence)] } : {}) }
}

// Save a compact fingerprint, never the question, activity response or transcript.
export function masteryEvidenceId(topic, prompt) {
  const input = `${text(topic).toLowerCase()}|${String(prompt || '').trim().toLowerCase()}`
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function applyMasteryEvidence(value, { topic: topicName, kind, outcome, id } = {}) {
  const current = normalizeMastery(value)
  const topic = text(topicName)
  if (!topic || !['quiz', 'recovery', 'activity'].includes(kind) || !['success', 'miss'].includes(outcome) || !/^[a-f0-9]{8}$/.test(id)) return current
  const key = Object.keys(current.topics).find(name => name.toLowerCase() === topic.toLowerCase()) || topic
  if (!Object.hasOwn(current.topics, key) && Object.keys(current.topics).length >= 100) return current
  const evidence = current.evidence || []
  const event = `${kind}:${id}:${outcome}`
  if (evidence.includes(event) || evidence.includes(`${kind}:${id}:success`)) return current
  // A legacy course-only estimate seeds its first topic; new spaces start at zero.
  const previous = Object.hasOwn(current.topics, key) ? current.topics[key] : Object.keys(current.topics).length ? 0 : current.overall
  const recovered = kind === 'recovery' || evidence.includes(`${kind}:${id}:miss`)
  const weight = recovered ? 0.04 : kind === 'activity' ? 0.06 : 0.08
  const delta = outcome === 'success' ? Math.max(1, Math.ceil((100 - previous) * weight)) : kind === 'quiz' ? -3 : -2
  // Weight new topics lightly until there is repeated evidence. Legacy estimates
  // retain a modest prior weight, so one new answer cannot halve a course score.
  const observations = Object.fromEntries(Object.keys(current.topics).map(name => [name, current.observations?.[name] || 12]))
  const previousCount = Object.hasOwn(observations, key) ? observations[key] : current.overall && !Object.keys(current.topics).length ? 12 : 0
  Object.defineProperty(observations, key, { value: Math.min(20, previousCount + 1), enumerable: true, configurable: true, writable: true })
  return normalizeMastery({ topics: { ...current.topics, [key]: score(previous + delta) },
    observations,
    evidence: [...evidence, event].slice(-MAX_MASTERY_EVIDENCE) })
}
