import { inferCoursePosition, isPositionTopicAllowed, normalizeLearnerPosition, normalizeSyllabusItems, localDate } from './coursePosition.js'
import { retainLearningAnchors } from './studyLearningContext.js'

const text = (value, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
export const lessonKey = (lesson) => JSON.stringify([text(lesson?.topic).toLowerCase(), text(lesson?.concept).toLowerCase()])
export const lessonOutline = (value) => text(value?.topic) && text(value?.concept)
  ? { topic: text(value.topic), concept: text(value.concept) } : null
const outlines = (values, limit) => [...new Map((Array.isArray(values) ? values : [])
  .slice(-limit).map(lessonOutline).filter(Boolean).map((item) => [lessonKey(item), item])).values()]

// A small, revisable window of lessons, independent of topic mastery and course completion.
export function normalizeLearningPath(value) {
  return {
    step: Number.isInteger(value?.step) ? Math.max(1, Math.min(10000, value.step)) : 1,
    visited: (Array.isArray(value?.visited) ? value.visited : []).slice(-8)
      .filter(lessonOutline).map((item) => ({ ...lessonOutline(item), understood: item.understood === true })),
    upcoming: outlines(value?.upcoming, 2),
    understood: value?.understood === true,
    contextKey: /^[a-f0-9]{8}$/.test(value?.contextKey) ? value.contextKey : '',
  }
}

// This fingerprint only invalidates UI suggestions; it is never an authorization check.
// Exclude generated recentLearning summaries so saving a thread does not invalidate itself.
export function learningPathContextKey(course, today = localDate()) {
  const context = JSON.stringify({
    name: text(course.name || course.courseName, 200), today, nextTask: text(course.nextTask, 240),
    syllabus: normalizeSyllabusItems(course.syllabusItems), learner: normalizeLearnerPosition(course.learnerPosition),
    topics: (Array.isArray(course.importantTopics) ? course.importantTopics : []).slice(0, 100).map((topic) => text(topic)),
    work: (Array.isArray(course.upcomingWork) ? course.upcomingWork : []).slice(0, 100)
      .map((item) => ({ title: text(item?.title, 200), topic: text(item?.topic), date: text(item?.date, 40) })),
    mastery: Object.entries(course.mastery?.topics || {}).slice(0, 100),
    anchors: retainLearningAnchors(course.learningAnchors),
  })
  let hash = 2166136261
  for (let i = 0; i < context.length; i++) hash = Math.imul(hash ^ context.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function acceptPathLesson(result, previous, previousLesson, contextKey) {
  const path = normalizeLearningPath(previous)
  const visited = previousLesson ? [...path.visited, { ...lessonOutline(previousLesson), understood: path.understood }].slice(-8) : path.visited
  const seen = new Set([...visited, result].map(lessonKey))
  return normalizeLearningPath({
    step: previousLesson ? path.step + 1 : path.step,
    visited,
    upcoming: outlines(result.nextLessons, 2).filter((item) => !seen.has(lessonKey(item))),
    understood: false,
    contextKey,
  })
}

// Material and explicit corrections outrank inferred activity for guided lessons.
// Keep the existing Home/recommendation inference policy unchanged.
export function learningPathPosition(course, today) {
  const evidence = inferCoursePosition({ ...course, recentLearning: null, mastery: {}, learningAnchors: [] }, today)
  return evidence.currentTopic ? evidence : inferCoursePosition(course, today)
}

export function isPathTopicAllowed(topic, position) {
  if (!isPositionTopicAllowed(topic, position)) return false
  if (position.learner.currentTopic.toLowerCase() === text(topic).toLowerCase()) return true
  return !position.timeline.some((item) => item.period === 'future' && item.topic.toLowerCase() === text(topic).toLowerCase())
}

// Reserved teaching metadata only: no URLs, executable markup, image requests, or rendering.
export function normalizeLessonVisual(value) {
  if (!value || !['none', 'diagram', 'process', 'comparison', 'concept_illustration', 'generated_image'].includes(value.type)) return null
  if (value.type === 'none') return { type: 'none' }
  if (!text(value.purpose, 240) || !Array.isArray(value.data) || value.data.length > 6) return null
  if (value.data.some((item) => !text(item?.label) || !text(item?.detail, 240))) return null
  return {
    type: value.type, purpose: text(value.purpose, 240),
    data: value.data.map((item) => ({ label: text(item.label), detail: text(item.detail, 240) })),
    focus: text(value.focus),
  }
}
