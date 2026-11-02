export const DEMO_LIMIT_MESSAGE = "You've reached the AI limit for Orbit's public demo. You can still explore the app or watch the full demo."
export const DEMO_VIDEO_URL = 'https://youtu.be/-xQGO-GYUVg'
const UNAVAILABLE_MESSAGE = 'AI is temporarily unavailable. You can still explore Orbit. Please try again shortly.'

// A temporary UI convenience only. Refreshing/clearing this never resets the
// server allowance. No learning data or identifiers are stored here.
let limitedUntil = 0
let timer
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

function scheduleExpiry() {
  clearTimeout(timer)
  if (limitedUntil && listeners.size) {
    timer = setTimeout(() => { limitedUntil = 0; notify() }, Math.max(0, limitedUntil - Date.now()))
  }
}

export const getDemoLimitSnapshot = () => limitedUntil
export function subscribeDemoLimit(listener) {
  listeners.add(listener)
  scheduleExpiry()
  return () => { listeners.delete(listener); scheduleExpiry() }
}

function limitError() {
  const error = new Error(DEMO_LIMIT_MESSAGE)
  error.code = 'demo_limit_reached'
  return error
}

export function aiErrorMessage(error, fallback) {
  return error?.code === 'demo_limit_reached' ? DEMO_LIMIT_MESSAGE
    : error?.code === 'demo_temporarily_unavailable' ? UNAVAILABLE_MESSAGE : fallback
}

// All named paid services use this boundary, including before reading a stream.
export async function demoAiFetch(url, options, { includedImage = false } = {}) {
  if (limitedUntil > Date.now() && !includedImage) throw limitError()
  if (limitedUntil && limitedUntil <= Date.now()) { limitedUntil = 0; notify(); scheduleExpiry() }
  const response = await fetch(url, options)
  if (response.status !== 429 && response.status !== 503) return response
  let data
  try { data = await response.clone().json() } catch { return response }
  if (response.status === 429 && data?.error === 'demo_limit_reached') {
    const seconds = Number(data.retryAfterSeconds || response.headers?.get('Retry-After'))
    // Fallback is a short retry, not a second copy of the server's policy.
    const delay = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 60
    limitedUntil = Date.now() + delay * 1000
    notify()
    scheduleExpiry()
    throw limitError()
  }
  if (response.status === 503 && data?.error === 'demo_temporarily_unavailable') {
    const error = new Error(UNAVAILABLE_MESSAGE)
    error.code = data.error
    throw error
  }
  return response
}
