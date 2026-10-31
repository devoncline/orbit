import { lessonImageRequest, lessonImageUrl, savedLessonImages } from './lessonImageRequest.js'

export async function generateLessonImage(context) {
  const request = lessonImageRequest(context)
  if (!request) return null
  const response = await fetch('/api/generate-lesson-image', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(195000), body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error('Could not generate lesson image')
  const url = lessonImageUrl((await response.json()).url)
  if (!url) throw new Error('Invalid lesson image response')
  return { url }
}

export const EMPTY_IMAGE = Object.freeze({ status: 'idle' })

// Owned by the mounted StudySession, outside conditional lesson/conversation views.
// Pending promises AND failures survive tool switches/StrictMode; retry is explicit.
// Resume stores only bounded metadata. Hydration is read-only, including failures.
export function createLessonImageCache(saved) {
  let snapshot = savedLessonImages(saved)
  const entries = new Map(snapshot.map(({ request, ...image }) => [JSON.stringify(request), { snapshot: image }]))
  const listeners = new Set()
  const notify = () => {
    snapshot = savedLessonImages([...entries].map(([key, entry]) => ({ request: JSON.parse(key), ...entry.snapshot })))
    listeners.forEach((listener) => listener())
  }
  return {
    get: (key) => entries.get(key)?.snapshot || EMPTY_IMAGE,
    getSaved: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    fail(key) {
      const entry = entries.get(key)
      if (entry) { entry.snapshot = { status: 'error' }; notify() }
    },
    load(key, retry = false) {
      const previous = entries.get(key)
      if (previous && (!retry || previous.snapshot.status !== 'error')) return previous.promise
      const entry = { snapshot: { status: 'pending' } }
      entries.set(key, entry)
      entry.promise = generateLessonImage(JSON.parse(key)).then((image) => {
        entry.snapshot = image ? { status: 'ready', ...image } : { status: 'error' }
      }).catch(() => { entry.snapshot = { status: 'error' } }).finally(notify)
      notify()
      return entry.promise
    },
  }
}
