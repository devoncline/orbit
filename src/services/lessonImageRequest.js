import { generatedLessonVisual, normalizeLessonVisual } from './learningPath.js'

const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

// Shared allowlist: no transcript, files, mastery, credentials, URLs, or image bytes.
export function lessonImageRequest(value) {
  // Normalize after legacy conversion too, so serialized keys retain field order
  // through repeated save/load cycles, regardless of the original visual type.
  const visual = normalizeLessonVisual(generatedLessonVisual(value?.visual))
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

export const MAX_SAVED_VISUALS = 6

// Keep only bounded requests and HTTPS references, never bytes or pending state.
// The canonical request is the stable instructional identity within its thread.
export function savedLessonImages(value) {
  const entries = new Map()
  for (const entry of Array.isArray(value) ? value.slice(-MAX_SAVED_VISUALS) : []) {
    const request = lessonImageRequest(entry?.request)
    if (!request) continue
    const url = lessonImageUrl(entry.url)
    entries.set(JSON.stringify(request), { request,
      ...(entry.status === 'ready' && url ? { status: 'ready', url } : { status: 'error' }),
    })
  }
  return [...entries.values()]
}
