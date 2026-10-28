export const initialThreads = { threads: [], activeId: null }

export function studyThreadsReducer(state, action) {
  if (action.type === 'reset') return initialThreads
  if (action.type === 'create') {
    return { threads: [...state.threads, action.thread], activeId: action.thread.id }
  }
  if (action.type === 'switch') {
    return state.threads.some((thread) => thread.id === action.id) ? { ...state, activeId: action.id } : state
  }
  if (action.type === 'update') {
    const thread = state.threads.find((entry) => entry.id === action.id)
    if (!thread || Object.entries(action.metadata).every(([key, value]) => thread[key] === value)) return state
    return { ...state, threads: state.threads.map((entry) => entry.id === action.id ? { ...entry, ...action.metadata } : entry) }
  }
  return state
}

export function createStudyThread(course, topic = '', id = crypto.randomUUID(), now = new Date()) {
  return { id, courseName: course.name, positionKey: JSON.stringify(course.learnerPosition || null), requestedTopic: topic.trim().slice(0, 120), title: (topic || course.nextTask || course.name).slice(0, 80), topic, context: 'lesson', summary: 'Ready for a short lesson.', createdAt: now.toISOString(), status: 'active' }
}

export function resolveLearningSpace(courses, topic) {
  const name = typeof topic === 'string' ? topic.trim() : ''
  if (!name || name.length > 120) return null
  // Reuse an existing space and its learning memory instead of resetting its progress.
  return courses.find((course) => course.name.toLowerCase() === name.toLowerCase()) || {
    name, type: 'topic', nextTask: `Explore ${name}`, reason: '', files: [],
  }
}

export function studyThreadMetadata({ lesson, activeInteraction, conversation, activity, activityFeedback, questionNumber, answerResult, followUpResult }) {
  const summary = activeInteraction === 'conversation' ? conversation.at(-1)?.message
    : activeInteraction === 'activity' ? activityFeedback?.feedback || activity?.instruction
      : activeInteraction === 'quiz' ? `Question ${questionNumber || 1}${followUpResult || answerResult ? ' · ' + (followUpResult || answerResult) : ''}`
        : lesson?.content
  return { title: (lesson?.concept || lesson?.topic || 'Preparing your lesson').slice(0, 80), topic: lesson?.topic || '', context: activeInteraction, summary: (summary || 'Ready when you are.').slice(0, 160), status: followUpResult === 'correct' || answerResult === 'correct' ? 'practiced' : 'active' }
}

export function selectStudyInteraction(current, next) {
  return ['lesson', 'example', 'activity', 'conversation', 'quiz'].includes(next) ? next : current
}
