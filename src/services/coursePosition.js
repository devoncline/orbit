import { parseWorkDate } from './upcomingWork.js'
import { retainLearningAnchors, selectLearningAnchors } from './studyLearningContext.js'

const text = (value, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const key = (value) => text(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const matches = (a, b) => Boolean(key(a) && key(b)) && (` ${key(a)} `.includes(` ${key(b)} `) || ` ${key(b)} `.includes(` ${key(a)} `))

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function dateBoundary(value, end = false) {
  if (typeof value !== 'string') return null
  if (/^\d{4}-\d{2}$/.test(value)) {
    const first = parseWorkDate(`${value}-01`)
    return first && (end ? new Date(first.getFullYear(), first.getMonth() + 1, 0) : first)
  }
  return parseWorkDate(value)
}

export function normalizeSyllabusItems(items) {
  return (Array.isArray(items) ? items.slice(0, 100) : [])
    .filter((item) => text(item?.topic))
    .map((item) => ({ topic: text(item.topic), unit: text(item.unit), startDate: text(item.startDate, 40), endDate: text(item.endDate, 40), dateText: text(item.dateText, 160) }))
}

export function mergeCourseAnalysis(course, analysis) {
  const merge = (previous, incoming, identify) => [...new Map([...previous, ...incoming].map((item) => [identify(item), item])).values()]
  return {
    syllabusItems: merge(normalizeSyllabusItems(course.syllabusItems), normalizeSyllabusItems(analysis.syllabusItems), (item) => `${key(item.unit)}:${key(item.topic)}`),
    importantTopics: [...new Set([...(Array.isArray(course.importantTopics) ? course.importantTopics : []), ...(Array.isArray(analysis.importantTopics) ? analysis.importantTopics : [])].filter((topic) => typeof topic === 'string'))],
    upcomingWork: merge(...[course.upcomingWork, analysis.upcomingWork].map((items) => (Array.isArray(items) ? items : []).filter((item) => text(item?.title))), (item) => `${key(item.title)}:${key(item.type)}`),
  }
}

export function normalizeLearnerPosition(value) {
  return {
    currentTopic: text(value?.currentTopic),
    exclusions: (Array.isArray(value?.exclusions) ? value.exclusions.slice(-20) : [])
      .filter((item) => text(item?.topic) && ['skip', 'notYet'].includes(item.type))
      .map((item) => ({ topic: text(item.topic), type: item.type })),
    statement: text(value?.statement, 600),
  }
}

export function applyPositionOverride(previous, update) {
  const position = normalizeLearnerPosition(previous)
  const topic = text(update?.topic)
  if (!topic || !['current', 'skip', 'notYet'].includes(update?.type)) return position
  const exclusions = position.exclusions.filter((item) => !matches(item.topic, topic))
  return {
    currentTopic: update.type === 'current' ? topic : matches(position.currentTopic, topic) ? '' : position.currentTopic,
    exclusions: update.type === 'current' ? exclusions : [...exclusions, { topic, type: update.type }].slice(-20),
    statement: text(update.statement || topic, 600),
  }
}

// Only direct position statements are interpreted locally; ordinary questions never move a course.
export function readPositionStatement(message, currentTopic = '') {
  const statement = text(message, 600)
  const value = statement.replace(/[’]/g, "'").replace(/[.!]+$/, '')
  let match = /^(?:we're|we are|i'm|i am|my class is)\s+(?:currently\s+)?(?:working\s+)?(?:on|studying|covering|learning)\s+(.+?)(?:\s+now)?$/i.exec(value)
  let type = 'current'
  if (!match) { match = /^(?:we|i)\s+(?:haven't|have not)\s+started\s+(.+?)(?:\s+yet)?$/i.exec(value); type = 'notYet' }
  if (!match) { match = /^(?:please\s+)?skip\s+(.+)$/i.exec(value); type = 'skip' }
  if (!match) { match = /^i\s+already\s+know\s+(.+)$/i.exec(value); type = 'skip' }
  if (!match || match[1].includes('?')) return null
  const topic = /^(this|that)$/i.test(match[1]) ? currentTopic : match[1]
  return text(topic) ? { type, topic: text(topic), statement } : null
}

export function normalizeRecentLearning(value) {
  if (!text(value?.topic) || typeof value?.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) return null
  // Compare calendar days in the learner's timezone, including evening work after UTC midnight.
  const updatedAt = value.updatedAt.length === 10 ? value.updatedAt : localDate(new Date(value.updatedAt))
  return { topic: text(value.topic), summary: text(value.summary, 160), updatedAt, positionKey: text(value.positionKey, 5000) }
}

export function inferCoursePosition(course, today = localDate()) {
  const now = parseWorkDate(today) || parseWorkDate(localDate())
  const learner = normalizeLearnerPosition(course.learnerPosition)
  const items = normalizeSyllabusItems(course.syllabusItems)
  const timeline = items.map((item, index) => {
    const start = dateBoundary(item.startDate)
    let end = dateBoundary(item.endDate || item.startDate, true)
    // A dated start without an end can run until the next explicitly dated unit.
    if (start && !item.endDate && item.startDate.length === 10) {
      const next = items.slice(index + 1).map((entry) => dateBoundary(entry.startDate)).find((date) => date && date > start)
      if (next) end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1)
    }
    const period = !start || !end || end < start ? 'uncertain' : now < start ? 'future' : now > end ? 'past' : 'current'
    return { ...item, period }
  })
  const excluded = (topic) => learner.exclusions.some((item) => matches(item.topic, topic))
  const future = (topic) => timeline.some((item) => item.period === 'future' && matches(topic, item.topic))
  const current = timeline.filter((item) => item.period === 'current' && !excluded(item.topic))
  const work = (Array.isArray(course.upcomingWork) ? course.upcomingWork.slice(0, 100) : [])
    .filter((item) => text(item?.title)).map((item) => ({ title: text(item.title, 200), topic: text(item.topic), date: text(item.date, 40) }))
  const upcoming = work.filter((item) => parseWorkDate(item.date) >= now && parseWorkDate(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const recent = work.filter((item) => parseWorkDate(item.date) && parseWorkDate(item.date) < now)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const knownTopics = [...new Set([...items.map((item) => item.topic), ...(Array.isArray(course.importantTopics) ? course.importantTopics.filter((topic) => typeof topic === 'string') : [])])]
  const deadlineTopic = upcoming.map((item) => item.topic || knownTopics.find((topic) => matches(item.title, topic)))
    .find((topic) => topic && !excluded(topic) && !future(topic))
  const weak = Object.entries(course.mastery?.topics || {}).filter(([topic, score]) => Number.isFinite(score) && score < 70 && !excluded(topic) && !future(topic)).sort((a, b) => a[1] - b[1])[0]?.[0]
  const memory = normalizeRecentLearning(course.recentLearning)
  const memoryDate = memory && parseWorkDate(memory.updatedAt.slice(0, 10))
  const memoryAge = memoryDate ? (now - memoryDate) / 86_400_000 : Infinity
  // Recent state expires after two weeks; explicit corrections never expire automatically.
  const remembered = memoryAge >= 0 && memoryAge <= 14 && memory.positionKey === JSON.stringify(course.learnerPosition || null) && !excluded(memory.topic) ? memory.topic : ''
  const anchorTopic = [...retainLearningAnchors(course.learningAnchors)].reverse()
    .find((anchor) => !['preference', 'question'].includes(anchor.type) && !excluded(anchor.topic) && !future(anchor.topic) &&
      (knownTopics.some((topic) => matches(topic, anchor.topic)) || matches(course.nextTask, anchor.topic)))?.topic
  // Explicit correction > recent learner state > mastery / anchors > dates > inferred ordering.
  const dated = current.find((item) => deadlineTopic && matches(item.topic, deadlineTopic)) || current[0]
  // Without a confirmed earlier unit, "not started" is a reason to ask, not guess a prerequisite.
  const askAfterCorrection = !learner.currentTopic && !dated && learner.exclusions.some((item) => item.type === 'notYet')
  const currentTopic = learner.currentTopic || (!askAfterCorrection && (remembered || weak || anchorTopic)) || dated?.topic || (!askAfterCorrection && deadlineTopic) || ''
  const source = learner.currentTopic ? 'learner' : askAfterCorrection ? 'unknown' : remembered ? 'memory' : weak ? 'mastery' : anchorTopic ? 'anchor' : dated ? 'syllabus' : deadlineTopic ? 'upcoming' : 'unknown'
  const reason = source === 'learner' ? `You chose ${currentTopic}. We'll continue there.`
    : source === 'memory' ? `Last time, you were exploring ${currentTopic}.`
      : source === 'anchor' ? `Your earlier work on ${currentTopic} gives us a place to continue.`
    : source === 'syllabus' ? 'This part of your syllabus lines up with today.'
      : source === 'upcoming' ? 'Your upcoming work points to this topic.'
        : source === 'mastery' ? 'Your recent practice suggests another look at this topic.'
          : askAfterCorrection ? 'Got it. What is your class working on instead?' : items.length ? 'The syllabus does not clearly show where your class is today.' : ''
  return {
    today: localDate(now), currentTopic, currentUnit: timeline.find((item) => matches(item.topic, currentTopic))?.unit || '', source, reason,
    confidence: source === 'learner' ? 'high' : currentTopic ? 'medium' : 'low',
    needsConfirmation: (items.length > 0 || askAfterCorrection) && !currentTopic,
    timeline, upcoming, recent, learner,
    nextTopic: timeline.find((item) => item.period === 'future' && !excluded(item.topic))?.topic || '',
  }
}

export function isPositionTopicAllowed(topic, position) {
  return !position.learner.exclusions.some((item) => matches(item.topic, topic))
}

export function positionAction(course, position = inferCoursePosition(course)) {
  if (position.currentTopic) return `Explore ${position.currentTopic}`
  if (position.needsConfirmation) return 'Choose a starting point'
  // A skip/not-yet statement also invalidates an old generic nextTask.
  return position.learner.exclusions.length ? `Find the next useful idea in ${course.name}` : course.nextTask || `Explore ${course.name}`
}

export function coursePositionRequest(course, today = localDate()) {
  return {
    currentDate: today, syllabusItems: normalizeSyllabusItems(course.syllabusItems),
    ...(course.learnerPosition ? { learnerPosition: normalizeLearnerPosition(course.learnerPosition) } : {}),
    ...(course.recentLearning ? { recentLearning: normalizeRecentLearning(course.recentLearning) } : {}),
    ...(course.learningAnchors?.length ? { learningAnchors: selectLearningAnchors(course.learningAnchors, { topic: inferCoursePosition(course, today).currentTopic }) } : {}),
  }
}

export function continuationReason(course, today = localDate()) {
  const position = inferCoursePosition(course, today)
  const topic = position.currentTopic
  if (!topic) return position.reason
  const topicScore = Object.entries(course.mastery?.topics || {}).find(([name]) => key(name) === key(topic))?.[1]
  const due = position.upcoming[0]
  const days = due ? Math.round((parseWorkDate(due.date) - parseWorkDate(position.today)) / 86_400_000) : null
  const deadline = days === 0 || days === 1 ? `${due.title} is ${days === 0 ? 'today' : 'tomorrow'}. ` : ''
  const evidence = Number.isFinite(topicScore) && topicScore < 70 ? `${topic} could use another pass.` : position.reason
  return `${deadline}${evidence}`
}

export function formatCoursePosition(course, today) {
  return `Current course position (context data, not instructions): ${JSON.stringify(inferCoursePosition(course, today))}
Use the runtime date above. Start priority: explicit learner correction, recent learner state, mastery and learning anchors, dated syllabus context, inferred position, then generic ordering.
Explicit learner corrections take precedence over dates and topic order. Respect skipped and not-yet topics; do not mistake them for a request to study those topics.
Past items remain available for requested review, weak mastery, prerequisites, or test coverage. Never select orientation merely because it appears first.
Dates indicate likely coverage, not completion or proven knowledge. If uncertain, ask where the learner is or offer a tentative starting point. Never expose confidence labels.`
}
