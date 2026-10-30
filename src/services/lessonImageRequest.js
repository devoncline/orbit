import { generatedLessonVisual } from './learningPath.js'

const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

// Shared allowlist: no transcript, files, mastery, credentials, URLs, or image bytes.
export function lessonImageRequest(value) {
  const visual = generatedLessonVisual(value?.visual)
  const courseName = text(value?.courseName, 200)
  const lesson = {
    topic: text(value?.lesson?.topic, 120),
    concept: text(value?.lesson?.concept, 120),
    content: text(value?.lesson?.content, 900),
  }
  if (!visual || !courseName || !lesson.topic || !lesson.concept || !lesson.content) return null
  return { courseName, lesson, visual }
}

export function lessonImageUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
