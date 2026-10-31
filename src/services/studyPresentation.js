import { lessonImageRequest } from './lessonImageRequest.js'
import { normalizeLearningProfile } from './learningProfile.js'

const interactions = ['lesson', 'visual', 'example', 'activity', 'quiz', 'conversation', 'history']
const labels = { focus: 'Explore the idea', visual: 'See how it works', practice: 'Your turn', check: 'Check your understanding', recover: 'One part at a time' }

// Read the same bounded request as LessonVisual without starting or changing a request.
export function studyPresentationImageKey({ activeInteraction = 'lesson', courseName, lesson, conversationVisual, requestedVisual } = {}) {
  const visual = activeInteraction === 'lesson' ? lesson?.visual : activeInteraction === 'conversation' ? conversationVisual : null
  const request = lessonImageRequest(activeInteraction === 'visual' ? requestedVisual?.request : { courseName, lesson, visual })
  return request ? JSON.stringify(request) : ''
}

// Presentation only. These are authored layouts, never model-provided UI instructions.
// Recovery is scoped to the active interaction; stale quiz/activity results cannot
// override a learner who has deliberately moved to another tool.
export function selectStudyPresentation(state = {}, imageStatus = 'idle') {
  const profile = normalizeLearningProfile(state.learningProfile)
  const choiceDensity = profile.guidance === 'focused' ? 'low' : profile.guidance === 'explore' ? 'expanded' : 'normal'
  const interaction = interactions.includes(state.activeInteraction) ? state.activeInteraction : 'lesson'
  const visualKey = studyPresentationImageKey({ ...state, activeInteraction: interaction })
  const hasVisual = Boolean(visualKey) && ['idle', 'pending', 'ready'].includes(imageStatus)
  const feedbackCurrent = Boolean(state.activityFeedback?.feedback) && state.activityFeedback.learnerResponse === (state.activityResponse || '').trim()
  let mode = 'focus', reason = interaction === 'conversation' ? 'conversation' : 'lesson', primary = 'recommendation', guidance = ''

  if (interaction === 'visual' && visualKey) {
    mode = hasVisual ? 'visual' : 'focus'; reason = hasVisual ? 'requested_visual' : 'visual_unavailable'
    if (state.requestedVisual.recovery) guidance = 'Stay with this explanation and visual. Your earlier work is still in Study tools.'
  } else if (interaction === 'lesson' && (state.recoveringLesson || state.loadingLesson === 'simplify')) {
    mode = 'recover'; reason = 'lesson_recovery'; primary = 'recovery_done'
    guidance = 'Stay with this explanation. When it makes sense, choose “That helps” to keep exploring.'
  } else if (interaction === 'quiz' && !state.loadingQuestion && state.answerResult === 'incorrect' &&
    state.showAdaptedLesson && state.followUpResult !== 'correct' && (state.loadingEvaluation || state.evaluation || state.evaluationError)) {
    mode = 'recover'; reason = 'quiz_recovery'
    primary = state.evaluationError || state.followUpResult === 'incorrect' ? 'recommendation' : 'answers'
    guidance = primary === 'answers' ? 'Look at this approach, then try the follow-up below.' : ''
  } else if (interaction === 'activity' && state.loadingActivity !== 'generate' && feedbackCurrent &&
    ['misconception', 'partial_understanding'].includes(state.activityFeedback.signal)) {
    mode = 'recover'; reason = 'activity_recovery'; primary = 'activity'
    guidance = 'Use this feedback to revise your response, then share it again.'
  } else if (interaction === 'conversation' && state.conversation?.at(-1)?.signal === 'confusion') {
    mode = 'recover'; reason = 'conversation_recovery'; primary = 'conversation'
    guidance = 'Stay with the part that feels unclear. Ask one question or try explaining it in your own words.'
  } else if (interaction === 'quiz') {
    mode = 'check'; reason = 'active_quiz'
    primary = !state.answerResult && !state.questionError ? 'answers' : 'recommendation'
  } else if (interaction === 'activity') {
    mode = 'practice'; reason = 'active_activity'
    primary = state.activityError?.action === 'generate' || feedbackCurrent ? 'recommendation' : 'activity'
    guidance = primary === 'activity' ? 'Try the task, then share what you notice. Your lesson is available below.' : ''
  } else if (hasVisual) {
    mode = 'visual'; reason = interaction === 'conversation' ? 'conversation_visual' : 'lesson_visual'
  } else if (visualKey && imageStatus === 'error') {
    reason = 'visual_unavailable'
  }
  if (interaction === 'conversation') primary = 'conversation'
  return { mode, reason, label: labels[mode], primary, guidance, visualKey, hasVisual, choiceDensity,
    splitVisual: mode === 'visual', compactConversation: reason === 'conversation_recovery' }
}
