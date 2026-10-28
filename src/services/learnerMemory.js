import { inferCoursePosition, normalizeLearnerPosition, normalizeSyllabusItems } from './coursePosition.js'
import { retainLearningAnchors } from './studyLearningContext.js'
import { normalizeLearningPath, normalizeLessonVisual } from './learningPath.js'

export const LEARNER_MEMORY_KEY = 'orbit.learner-memory'
export const LEARNER_MEMORY_VERSION = 1
export const MAX_SAVED_THREADS = 20
export const MAX_SAVED_EXCHANGES = 2
const MAX_STORAGE_LENGTH = 1_000_000
const text = (value, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const list = (value, limit = 100) => Array.isArray(value) ? value.slice(-limit) : []
const score = (value) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 40
const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : ''
export const learnerPositionKey = (course) => JSON.stringify(course.learnerPosition || null)

export function emptyLearnerMemory() {
  return { courses: [], threads: [], activeId: null, recommendation: null }
}

// Explicit projections are used on both read and write. Never serialize React state wholesale.
export function compactThreadResume(value) {
  const lesson = value?.lesson
  return {
    lesson: text(lesson?.topic) && text(lesson?.concept) && text(lesson?.content, 900)
      ? { topic: text(lesson.topic), concept: text(lesson.concept), content: text(lesson.content, 900),
        ...(normalizeLessonVisual(lesson.visual) ? { visual: normalizeLessonVisual(lesson.visual) } : {}) } : null,
    learningPath: normalizeLearningPath(value?.learningPath),
    conversation: list(value?.conversation, MAX_SAVED_EXCHANGES)
      .filter((exchange) => text(exchange?.message, 600) && text(exchange?.response, 900))
      .map((exchange) => ({ message: text(exchange.message, 600), response: text(exchange.response, 900) })),
    learningAnchors: retainLearningAnchors(value?.learningAnchors),
  }
}

function cleanCourse(course) {
  const learnerPosition = course.learnerPosition ? normalizeLearnerPosition(course.learnerPosition) : undefined
  const position = inferCoursePosition(course)
  return {
    name: text(course.name), type: text(course.type, 40),
    nextTask: text(course.nextTask, 240), reason: text(course.reason, 300),
    syllabus: {
      courseName: text(course.syllabus?.courseName), instructor: text(course.syllabus?.instructor), semester: text(course.syllabus?.semester),
    },
    syllabusItems: normalizeSyllabusItems(course.syllabusItems),
    importantTopics: list(course.importantTopics).map((topic) => text(topic)).filter(Boolean),
    upcomingWork: list(course.upcomingWork).filter((item) => text(item?.title, 200)).map((item) => ({
      title: text(item.title, 200), topic: text(item.topic), type: text(item.type, 40), date: text(item.date, 40),
    })),
    files: list(course.files).filter((file) => text(file?.name, 200)).map((file) => ({
      name: text(file.name, 200), type: text(file.type, 100), size: Number.isFinite(file.size) ? Math.max(0, file.size) : 0,
    })),
    mastery: {
      overall: score(course.mastery?.overall),
      topics: Object.fromEntries(Object.entries(course.mastery?.topics || {}).slice(0, 100)
        .filter(([topic, value]) => text(topic) && Number.isFinite(value)).map(([topic, value]) => [text(topic), score(value)])),
    },
    ...(learnerPosition ? { learnerPosition } : {}),
    recentLearning: course.recentLearning && text(course.recentLearning.topic) && timestamp(course.recentLearning.updatedAt) ? {
      topic: text(course.recentLearning.topic), summary: text(course.recentLearning.summary, 160),
      updatedAt: timestamp(course.recentLearning.updatedAt), positionKey: text(course.recentLearning.positionKey, 5000),
    } : null,
    learningAnchors: retainLearningAnchors(course.learningAnchors),
    // A snapshot for future migrations; dates and inferred position are always recomputed on return.
    coursePosition: { topic: position.currentTopic, source: position.source, asOf: position.today },
  }
}

export function createLearnerSnapshot({ courses, threads, activeId, recommendation }) {
  const spaces = courses.map(cleanCourse)
  const names = new Set(spaces.map((course) => course.name))
  const eligible = threads.filter((thread) => names.has(thread.courseName))
  const ordered = [...eligible].sort((a, b) => (a.updatedAt || a.createdAt || '').localeCompare(b.updatedAt || b.createdAt || ''))
  const active = ordered.find((thread) => thread.id === activeId)
  const saved = ordered.filter((thread) => thread !== active).slice(-(MAX_SAVED_THREADS - (active ? 1 : 0)))
  if (active) saved.push(active)
  return {
    version: LEARNER_MEMORY_VERSION,
    spaces,
    threads: saved.map((thread) => ({
      id: text(thread.id), courseName: text(thread.courseName), positionKey: text(thread.positionKey, 5000),
      requestedTopic: text(thread.requestedTopic), title: text(thread.title, 80), topic: text(thread.topic),
      summary: text(thread.summary, 160),
      context: ['lesson', 'example', 'activity', 'conversation', 'quiz'].includes(thread.context) ? thread.context : 'lesson',
      status: ['active', 'practiced', 'completed'].includes(thread.status) ? thread.status : 'active',
      createdAt: timestamp(thread.createdAt), updatedAt: timestamp(thread.updatedAt || thread.createdAt),
      resume: compactThreadResume(thread.resume),
    })),
    activeId: active?.id || null,
    recommendation: names.has(recommendation?.courseName) ? {
      courseName: text(recommendation.courseName), reason: text(recommendation.reason, 300), recommendedAction: text(recommendation.recommendedAction, 240),
    } : null,
  }
}

export function loadLearnerMemory(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(LEARNER_MEMORY_KEY)
    if (!raw || raw.length > MAX_STORAGE_LENGTH) return emptyLearnerMemory()
    const value = JSON.parse(raw)
    // This is the single version boundary for a future forward migration.
    if (value?.version !== LEARNER_MEMORY_VERSION || !Array.isArray(value.spaces) || value.spaces.length > 100 ||
      !Array.isArray(value.threads) || value.threads.length > MAX_SAVED_THREADS ||
      value.spaces.some((course) => !text(course?.name) || course.name !== text(course.name)) ||
      new Set(value.spaces.map((course) => course.name.toLowerCase())).size !== value.spaces.length ||
      value.threads.some((thread) => !text(thread?.id) || thread.id !== text(thread.id) || !text(thread?.courseName) || !timestamp(thread.createdAt)) ||
      new Set(value.threads.map((thread) => thread.id)).size !== value.threads.length) return emptyLearnerMemory()
    const snapshot = createLearnerSnapshot({ courses: value.spaces, threads: value.threads, activeId: value.activeId, recommendation: value.recommendation })
    return { courses: snapshot.spaces, threads: snapshot.threads, activeId: snapshot.activeId, recommendation: snapshot.recommendation }
  } catch {
    return emptyLearnerMemory()
  }
}

export function clearLearnerMemory(storage) {
  try {
    const target = storage ?? globalThis.localStorage
    if (!target) return false
    target.removeItem(LEARNER_MEMORY_KEY)
    return true
  } catch {
    return false
  }
}

export function saveLearnerMemory(state, storage) {
  try {
    if (!state.courses.length) return clearLearnerMemory(storage)
    const target = storage ?? globalThis.localStorage
    if (!target || state.courses.length > 100) return false
    const serialized = JSON.stringify(createLearnerSnapshot(state))
    if (serialized.length > MAX_STORAGE_LENGTH) return false
    target.setItem(LEARNER_MEMORY_KEY, serialized)
    return true
  } catch {
    // Storage may be disabled or full. The live session must keep working.
    return false
  }
}
