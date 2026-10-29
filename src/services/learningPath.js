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

// Display the current lesson even when new course evidence invalidates future suggestions.
export function studyPathView(value, lesson, contextKey) {
  const path = normalizeLearningPath(value)
  const current = lessonOutline(lesson)
  const seen = new Set([...path.visited, current].filter(Boolean).map(lessonKey))
  const isCurrent = path.contextKey === contextKey
  return {
    step: path.step, visited: path.visited, current, isCurrent,
    upcoming: isCurrent ? path.upcoming.filter((item) => !seen.has(lessonKey(item))) : [],
  }
}

// Guidance only: no timers, requests, mastery writes, or claims that a lesson was read.
export function recommendStudyAction({
  lesson, activeInteraction = 'lesson', learningPath, example, lessonError, conversation = [],
  activity, activityError, activityFeedback, activityResponse = '', answerResult, followUpResult,
  evaluation, evaluationError, questionError,
} = {}) {
  if (!lesson) return null
  if (answerResult === 'incorrect' && followUpResult !== 'correct') {
    if (activeInteraction === 'conversation') return { action: null, hint: 'Talk through what feels unclear, then return to Quiz me in Study tools to keep practicing.' }
    if (activeInteraction !== 'quiz') return {
      action: 'recover', label: 'Return to practice', hint: 'Return to your practice question for another approach when you are ready.',
    }
    if (evaluationError) return {
      action: 'retryExplanation', label: 'Try the explanation again', hint: 'Your answer is saved. Let’s get another explanation before trying again.',
    }
    if (followUpResult === 'incorrect') return {
      action: 'conversation', label: 'Talk it through', hint: 'Let’s talk about the part that still feels unclear. You can also retry the follow-up above.',
    }
    return { action: null, hint: evaluation ? 'Take a moment with the new explanation, then try the follow-up above.' : 'Orbit is preparing a different explanation.' }
  }
  if (activeInteraction === 'quiz' && !answerResult) return questionError
    ? { action: 'retryQuiz', label: 'Try the question again', hint: 'Your lesson is still here. Try loading a practice question again.' }
    : { action: null, hint: 'Try the question above. It is a chance to see what needs another look.' }
  if (activeInteraction === 'activity' && activityError?.action === 'generate') return {
    action: 'retryActivity', label: 'Try the activity again', hint: 'Orbit could not prepare an activity. Your lesson is still here.',
  }
  if (activeInteraction === 'activity' && (!activityFeedback || activityFeedback.learnerResponse !== activityResponse.trim())) {
    if (!activity) return { action: null, hint: 'Orbit is preparing something to try with this idea.' }
    return { action: null, hint: 'Try the activity above and share what you notice. You can switch tools at any time.' }
  }
  if (activeInteraction === 'conversation') return { action: null, hint: 'Ask about this idea or share a connection. Your lesson is always in Study tools.' }
  if (activeInteraction === 'history') return { action: 'lesson', label: 'Return to lesson', hint: 'Pick up the current lesson whenever you are ready.' }
  if (activeInteraction === 'example') return example
    ? { action: 'activity', label: 'Let me try it', hint: 'Try applying this example in a short activity.' }
    : { action: 'example', label: lessonError ? 'Try the example again' : 'Give me an example', hint: 'An example can help connect this idea to something concrete.' }
  if (answerResult === 'correct' || followUpResult === 'correct') return {
    action: 'continue', label: 'Continue to next lesson', hint: 'You got that practice answer. Continue when you are ready, or keep exploring here.',
  }
  if (learningPath?.understood) return {
    action: 'continue', label: 'Continue to next lesson', hint: 'You said you feel ready. Continue, or choose a tool to explore more.',
  }
  if (activityFeedback && activityFeedback.learnerResponse === activityResponse.trim()) {
    if (['misconception', 'partial_understanding'].includes(activityFeedback.signal)) return {
      action: 'example', label: 'Give me an example', hint: 'An example may help you build on the activity feedback before a quiz.',
    }
    return { action: 'quiz', label: 'Quiz me', hint: 'You tried applying the idea. A short question can help you check it.' }
  }
  if (example || conversation.length) return {
    action: 'activity', label: 'Let me try it', hint: 'Try applying this idea in a short activity.',
  }
  return { action: 'example', label: 'Give me an example', hint: 'Start with the lesson above. When you are ready, see the idea in action.' }
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

// Bounded teaching data shared by the API, local resume, and native renderer.
// Symbols and directed links are explicit; never infer them from subject keywords.
export function normalizeLessonVisual(value) {
  if (!value || !['none', 'diagram', 'process', 'comparison', 'concept_illustration', 'generated_image'].includes(value.type)) return null
  if (value.type === 'none') return { type: 'none' }
  const minimum = ['diagram', 'process', 'comparison'].includes(value.type) ? 2 : 1
  if (!text(value.purpose, 240) || !Array.isArray(value.data) || value.data.length < minimum || value.data.length > 6) return null
  if (!Array.from(value.data).every((item) => text(item?.label) && text(item?.detail, 240))) return null
  const symbols = ['plant', 'leaf', 'sun', 'water', 'molecule', 'container', 'slots', 'planet', 'component', 'note']
  if (value.links !== undefined && (!Array.isArray(value.links) || value.links.length > 8 ||
    !Array.from(value.links).every((link) => Number.isInteger(link?.from) && Number.isInteger(link?.to) &&
      link.from >= 0 && link.to >= 0 && link.from < value.data.length && link.to < value.data.length &&
      link.from !== link.to && text(link.label, 120)))) return null
  return {
    type: value.type, purpose: text(value.purpose, 240),
    data: value.data.map((item) => ({ label: text(item.label), detail: text(item.detail, 240),
      ...(symbols.includes(item.symbol) ? { symbol: item.symbol } : {}) })),
    focus: text(value.focus),
    ...(value.links?.length && ['diagram', 'concept_illustration', 'process'].includes(value.type)
      ? { links: value.links.map((link) => ({ from: link.from, to: link.to, label: text(link.label, 120),
        ...(link.kind === 'contains' && value.type !== 'process' ? { kind: 'contains' } : {}) })) } : {}),
  }
}

// Keep unavailable renderers out of both the visual slot and its surrounding layout.
export function nativeLessonVisual(value) {
  const visual = normalizeLessonVisual(value)
  return visual && ['diagram', 'process', 'comparison', 'concept_illustration'].includes(visual.type) ? visual : null
}
