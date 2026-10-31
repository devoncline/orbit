import { lessonImageRequest } from './lessonImageRequest.js'

const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const item = (label, detail) => ({ label, detail: text(detail, 240) })
const learnerDetails = (context) => (context?.details || []).filter((entry) => /Learner|Selected/.test(entry.label))

// Only the active, completed teaching context. Learner attempts are explicitly
// labelled as attempts, never promoted into facts or inferred relationships.
export function studyVisualContext(state) {
  const { activeInteraction, lesson, activity, studyQuestion, evaluation } = state
  let explanation, details
  let recovery = false
  if (activeInteraction === 'lesson' && state.recoveringLesson) {
    explanation = lesson?.content
    details = [...learnerDetails(state.recentVisualRecovery), item('Simpler explanation after I lost you', explanation)]
    recovery = true
  } else if (activeInteraction === 'example' && state.example) {
    explanation = state.example
    details = [item('Current example', explanation)]
  } else if (activeInteraction === 'activity' && activity) {
    const feedback = state.activityFeedback?.learnerResponse === text(state.activityResponse, Infinity) ? state.activityFeedback : null
    explanation = feedback?.feedback || activity.instruction
    details = [item('Current task', activity.instruction), item('Learner attempt (may be incorrect)', state.activityResponse), item('Teaching feedback', feedback?.feedback)]
    recovery = ['misconception', 'partial_understanding'].includes(feedback?.signal)
  } else if (activeInteraction === 'quiz' && studyQuestion) {
    recovery = state.answerResult === 'incorrect' && state.followUpResult !== 'correct'
    explanation = evaluation?.adaptedExplanation || (state.answerResult ? studyQuestion.explanation : '') || lesson?.content
    details = [item('Current question', state.followUpResult && state.followUpAnswer ? evaluation?.followUpQuestion : studyQuestion.question),
      item('Selected answer (not necessarily correct)', state.followUpResult && state.followUpAnswer ? state.followUpAnswer.text : state.selectedAnswer?.text),
      item('Teaching feedback', evaluation?.feedback || (state.answerResult ? studyQuestion.explanation : ''))]
  } else if (activeInteraction === 'conversation' && state.conversation?.length) {
    const exchange = state.conversation.at(-1)
    explanation = exchange.response
    details = [item('Learner question or claim (not a fact)', exchange.message), item('Current explanation', exchange.response)]
    recovery = exchange.signal === 'confusion'
  } else return null
  return { source: activeInteraction, explanation: text(explanation, 900), details: details.filter((entry) => entry.detail), recovery }
}

// Ephemeral, bounded snapshot made on a deliberate click. It uses the existing
// image request schema/cache; no transcript, progress, asset, or new persistence.
export function createStudyVisualRequest(state) {
  if (state.activeInteraction === 'visual' && state.requestedVisual) return state.requestedVisual
  const { courseName, lesson } = state
  const current = studyVisualContext(state)
  const context = current || state.recentVisualRecovery
  const recovery = current?.recovery ? current : current?.source === state.recentVisualRecovery?.source ? null : state.recentVisualRecovery
  const automatic = lessonImageRequest({ courseName, lesson, visual: lesson?.visual })
  if (!context && automatic) return { request: automatic, explanation: lesson.content, recovery: false }
  const explanation = context?.explanation || text(lesson?.content, 900)
  const recoveryContext = recovery ? [
    ...learnerDetails(recovery).map((entry) => `${entry.label}: ${text(entry.detail, 120)}`),
    `Clarify: ${text(recovery.explanation, 260)}`,
  ].join('\n').slice(0, 400) : ''
  const request = lessonImageRequest({ courseName,
    lesson: { ...lesson, content: context ? `${text(explanation, 580)}\n\nLesson context: ${text(lesson?.content, 280)}` : lesson?.content },
    visual: {
      type: 'generated_image', composition: 'concept_illustration',
      purpose: `Explain ${text(lesson?.concept, 120)} visually${recovery ? ', focusing on the learner’s specific confusion and corrective explanation' : ' using the current explanation'}.`,
      focus: text(lesson?.concept, 120),
      data: [item('Lesson explanation', lesson?.content), ...(context?.details || []),
        ...(recovery && recovery !== context ? [item('Recovery explanation', recovery.explanation)] : [])],
      ...(recoveryContext ? { recoveryContext } : {}),
    },
  })
  return request ? { request, explanation, recovery: Boolean(recovery) } : null
}
