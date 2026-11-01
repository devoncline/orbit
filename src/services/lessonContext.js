import { learningPathPosition } from './learningPath.js'
import { localDate } from './coursePosition.js'
import { parseWorkDate } from './upcomingWork.js'

// Presentation metadata is optional and bounded. Reject verbose fields rather
// than clipping a planning sentence into a title or parsing prose for deadlines.
const shortText = (value, limit, words = Infinity) => {
  if (typeof value !== 'string') return ''
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length <= limit && text.split(' ').length <= words ? text : ''
}
const topicKey = (value) => typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
export const conciseLessonTitle = (value) => shortText(value, 60, 8)

export function normalizeLessonContext(value) {
  if (!value || typeof value !== 'object') return null
  const lessonTitle = conciseLessonTitle(value.lessonTitle)
  const reasonForLesson = shortText(value.reasonForLesson, 160, 28)
  const focusAreas = [...new Set((Array.isArray(value.focusAreas) ? value.focusAreas : [])
    .slice(0, 4).map((area) => shortText(area, 48, 8)).filter(Boolean))]
  return lessonTitle || reasonForLesson || focusAreas.length
    ? { lessonTitle, reasonForLesson, focusAreas } : null
}

export function studyLessonContext(course, lesson, today = localDate()) {
  const position = learningPathPosition(course, today)
  const metadata = normalizeLessonContext(lesson?.lessonContext)
  // A saved lesson owns its topic even if the course has moved on since then.
  const topic = lesson?.topic || position.currentTopic
  const lessonTitle = metadata?.lessonTitle || conciseLessonTitle(topic) || conciseLessonTitle(lesson?.concept)
    || (!lesson && position.needsConfirmation ? 'Choose a starting point' : conciseLessonTitle(course.name)) || 'Your lesson'
  const now = parseWorkDate(today) || parseWorkDate(localDate())
  const seen = new Set()
  const upcomingAssignments = (Array.isArray(course.upcomingWork) ? course.upcomingWork : [])
    .slice(0, 100).filter((item) => {
      const date = parseWorkDate(item?.date)
      // Prefer explicit topic links. Older extracted items may only name the
      // topic in their title; never match a different explicit topic.
      const related = topicKey(topic) && (item?.topic ? topicKey(item.topic) === topicKey(topic)
        : ` ${topicKey(item?.title).replace(/[^\p{L}\p{N}]+/gu, ' ')} `.includes(` ${topicKey(topic).replace(/[^\p{L}\p{N}]+/gu, ' ')} `))
      return related && date && date >= now && shortText(item.title, 200)
    }).sort((a, b) => a.date.localeCompare(b.date))
    .filter((item) => {
      const key = JSON.stringify([topicKey(item.title), item.date])
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 3).map((item) => ({ title: item.title.trim(), date: item.date.trim() }))
  const concept = shortText(lesson?.concept, 120, 16)
  return {
    lessonTitle,
    reasonForLesson: metadata?.reasonForLesson || (!upcomingAssignments.length && (!lesson || topicKey(topic) === topicKey(position.currentTopic)) ? position.reason : ''),
    upcomingAssignments,
    focusAreas: metadata?.focusAreas.length ? metadata.focusAreas : concept && topicKey(concept) !== topicKey(lessonTitle) ? [concept] : [],
  }
}
