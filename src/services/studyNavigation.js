// Read-only views of the existing threads; grouping never merges saved sessions.
export const studyContextLabels = { lesson: 'Lesson', visual: 'Visual explanation', example: 'Example', activity: 'Activity', conversation: 'Discussion', quiz: 'Quiz' }
const key = value => (value || '').trim().toLowerCase()
export const threadTopic = thread => thread.requestedTopic || thread.topic || thread.resume?.lesson?.topic || thread.title || 'Untitled topic'
export const threadTime = thread => thread.updatedAt || thread.createdAt
const time = thread => Date.parse(threadTime(thread)) || 0

export function courseThreads(threads, courseName) {
  return threads.filter(thread => thread.courseName === courseName).sort((a, b) => time(b) - time(a))
}

export function startedTopics(threads, courseName) {
  const groups = new Map()
  for (const thread of courseThreads(threads, courseName)) {
    const topic = threadTopic(thread)
    const id = key(topic)
    if (!groups.has(id)) groups.set(id, { id, topic, threads: [] })
    groups.get(id).threads.push(thread)
  }
  return [...groups.values()]
}

export function findTopicThread(threads, courseName, topic) {
  const target = key(topic)
  return target ? courseThreads(threads, courseName).find(thread =>
    [threadTopic(thread), thread.topic, thread.resume?.lesson?.topic].some(value => key(value) === target)) : undefined
}

export function threadDescription(thread) {
  return `${studyContextLabels[thread.context] || 'Lesson'} · ${thread.status === 'completed' ? 'Reviewed' : thread.status === 'practiced' ? 'Practiced' : 'In progress'}`
}

export function threadDate(thread) {
  const value = threadTime(thread)
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}
