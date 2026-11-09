import { applyPositionOverride, courseLaunchRecommendations, inferCoursePosition, isPositionTopicAllowed, localDate } from './coursePosition.js'
import { learningPathContextKey, studyPathView } from './learningPath.js'
import { courseThreads, threadTopic } from './studyNavigation.js'

const text = value => typeof value === 'string' ? value.trim().slice(0, 120) : ''
const key = value => text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const list = value => Array.isArray(value) ? value : []

// Small, optional interest connections, never a fixed course path or a claim of progress.
const relatedInterests = [
  { interests: ['Orbital motion', 'Orbits'], topic: 'Black holes' },
  { interests: ['Music theory', 'Major scales'], topic: 'Acoustics' },
  { interests: ['React'], topic: 'Web accessibility' },
  { interests: ['Photosynthesis'], topic: 'Ecosystems' },
  { interests: ['Quantum physics'], topic: 'Particle physics' },
]

const portfolioTopics = [
  { topic: 'Orbital Motion', reason: 'Explore how gravity shapes an orbit.' },
  { topic: 'Music Theory', reason: 'Connect rhythm, melody, and harmony.' },
  { topic: 'Photosynthesis', reason: 'Follow how plants turn light into energy.' },
  { topic: 'The Psychology of Habits', reason: 'Explore how habits form and change.' },
]

function coveredTopics(course, threads) {
  return new Set([
    course.recentLearning?.topic,
    ...Object.keys(course.mastery?.topics || {}),
    ...list(course.learningAnchors).map(anchor => anchor.topic),
    ...threads.flatMap(thread => [threadTopic(thread), thread.topic, thread.resume?.lesson?.topic, thread.resume?.lesson?.concept,
      ...list(thread.resume?.learningPath?.visited).flatMap(item => [item.topic, item.concept])]),
  ].map(key).filter(Boolean))
}

// Read-only Learn projection. It neither generates recommendations nor writes learner memory.
export function learnRecommendations(courses = [], threads = [], today = localDate(), { portfolioMode = false } = {}) {
  const allCovered = new Set()
  const interests = new Map()
  const positions = []
  const groups = courses.map(course => {
    const saved = courseThreads(threads, course.name)
    const covered = coveredTopics(course, saved)
    covered.forEach(topic => allCovered.add(topic))
    for (const value of [course.name, course.recentLearning?.topic, ...saved.map(thread => thread.requestedTopic || thread.topic)]) {
      if (text(value)) interests.set(key(value), text(value))
    }
    const position = inferCoursePosition(course, today)
    positions.push(position)
    const candidates = [...courseLaunchRecommendations(course, today).recommendations]
    for (const thread of saved) {
      const useGoal = thread.requestedTopic && thread.positionKey === JSON.stringify(course.learnerPosition || null)
      const contextCourse = useGoal ? { ...course, learnerPosition: applyPositionOverride(course.learnerPosition, { type: 'current', topic: thread.requestedTopic }) } : course
      const lesson = thread.resume?.lesson
      const path = studyPathView(thread.resume?.learningPath, lesson, learningPathContextKey(contextCourse, today))
      for (const next of path.upcoming) {
        if (!isPositionTopicAllowed(next.topic, position)) continue
        candidates.push({ topic: covered.has(key(next.topic)) || key(next.topic) === key(course.name) ? next.concept : next.topic,
          reason: `Builds on ${text(lesson?.concept || lesson?.topic) || course.name}.` })
      }
    }
    // The shared launch helper returns four choices. Keep later unstudied material available too.
    for (const item of position.timeline) candidates.push({ topic: item.topic, reason: 'From your course material.' })
    for (const topic of [...list(course.importantTopics), ...list(course.files).flatMap(file => list(file.topics))]) {
      candidates.push({ topic, reason: 'From your course material.' })
    }
    const seen = new Set(covered)
    return candidates.flatMap(candidate => {
      const topic = text(candidate.topic)
      const topicKey = key(topic)
      if (!topicKey || seen.has(topicKey) || !isPositionTopicAllowed(topic, position)) return []
      seen.add(topicKey)
      return [{ id: JSON.stringify([course.name, topicKey]), topic, courseName: course.name, kind: 'existing',
        reason: candidate.upcomingWork ? `Coming up: ${candidate.upcomingWork.title}.` : candidate.reason || 'From your course context.' }]
    }).slice(0, 6)
  })
  // Give each space a turn before adding its other suggestions.
  const result = []
  for (let index = 0; index < 6 && result.length < 12; index++) {
    for (const group of groups) if (group[index] && result.length < 12) result.push(group[index])
  }
  const existing = new Set([...allCovered, ...courses.map(course => key(course.name)), ...result.map(item => key(item.topic))])
  for (const connection of relatedInterests) {
    const interest = connection.interests.map(key).find(topic => interests.has(topic))
    if (!interest || existing.has(key(connection.topic)) || result.length >= 12 || positions.some(position => !isPositionTopicAllowed(connection.topic, position))) continue
    existing.add(key(connection.topic))
    result.push({ id: `new:${key(connection.topic)}`, kind: 'new', topic: connection.topic, courseName: null,
      reason: `Related to your interest in ${interests.get(interest)}.` })
  }
  if (result.length || !portfolioMode) return result
  // Examples belong only to this read-only projection, never to learner memory.
  return portfolioTopics.map(({ topic, reason }) => {
    const course = courses.find(course => key(course.name) === key(topic))
    return { id: course ? JSON.stringify([course.name, key(topic)]) : `new:${key(topic)}`,
      kind: course ? 'existing' : 'new', topic, courseName: course?.name || null, reason }
  })
}
