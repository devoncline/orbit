import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { selectStudyPresentation, studyPresentationImageKey } from '../src/services/studyPresentation.js'

const lesson = { topic: 'State', concept: 'Remembering a value', content: 'State remembers a value between renders.' }
const visual = { type: 'generated_image', purpose: 'Follow a state update into a render.', focus: 'State',
  data: [{ label: 'State', detail: 'Remembers a value.' }, { label: 'Render', detail: 'Shows the current value.' }] }
const base = { courseName: 'React', lesson, activeInteraction: 'lesson' }
const illustrated = { ...base, lesson: { ...lesson, visual } }
const recovery = { answerResult: 'incorrect', showAdaptedLesson: true, evaluation: { adaptedExplanation: 'Think of state as memory.' } }

test('Study tools retain content-sized wrapping and focusable lightweight actions without a fixed tablet grid', () => {
  // CSS contract only: actual browser geometry is measured by the navigation-review fixture.
  const css = readFileSync(new URL('../src/components/StudySession.css', import.meta.url), 'utf8')
  assert.match(css, /\.study-lesson-actions\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;/)
  assert.match(css, /\.study-body \.study-lesson-actions button\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;/)
  assert.doesNotMatch(css, /\.study-lesson-actions\s*\{[^}]*(?:grid-template-columns|min-width: \d)/)
  assert.match(css, /\.orbit-shell \.study-tools > summary\s*\{[^}]*border-radius:/)
  assert.match(css, /\.study-body button\.study-secondary-action:focus-visible\s*\{[^}]*outline:/)
})

test('a normal lesson defaults to focus and authored metadata ignores model layout instructions', () => {
  const result = selectStudyPresentation({ ...base, mode: 'practice', className: 'unsafe', layout: '<script />' })
  assert.equal(result.mode, 'focus')
  assert.equal(result.reason, 'lesson')
  assert.equal(result.primary, 'recommendation')
  assert.doesNotMatch(JSON.stringify(result), /unsafe|script|practice/)
  assert.equal(selectStudyPresentation().mode, 'focus')
})

test('saved instructions without an image stay in focus; only pending and ready images select visual', () => {
  assert.deepEqual(['idle', 'pending', 'ready'].map((status) => selectStudyPresentation(illustrated, status).mode), ['focus', 'visual', 'visual'])
  assert.equal(selectStudyPresentation(illustrated, 'ready').splitVisual, true)
  assert.equal(selectStudyPresentation({ ...base, lesson: { ...lesson, visual: { type: 'none' } } }, 'ready').mode, 'focus')
  assert.equal(selectStudyPresentation({ ...base, lesson: { ...lesson, visual: { type: 'generated_image' } } }, 'ready').mode, 'focus')
})

test('image failure returns to focus and an explicit retry may re-enter visual', () => {
  const failed = selectStudyPresentation(illustrated, 'error')
  assert.equal(failed.mode, 'focus')
  assert.equal(failed.reason, 'visual_unavailable')
  assert.equal(failed.hasVisual, false)
  assert.equal(failed.splitVisual, false)
  assert.equal(selectStudyPresentation(illustrated, 'pending').mode, 'visual')
})

test('active activity takes practice priority over lesson imagery and an old quiz mistake', () => {
  const state = { ...illustrated, ...recovery, activeInteraction: 'activity', activityResponse: '' }
  const result = selectStudyPresentation(state, 'ready')
  assert.equal(result.mode, 'practice')
  assert.equal(result.primary, 'activity')
  assert.equal(result.visualKey, '')
  assert.equal(selectStudyPresentation({ ...state, loadingActivity: 'generate' }).mode, 'practice')
})

test('quiz and pending questions select check without borrowing lesson imagery or stale recovery', () => {
  assert.equal(selectStudyPresentation({ ...illustrated, activeInteraction: 'quiz' }, 'ready').mode, 'check')
  assert.equal(selectStudyPresentation({ ...base, ...recovery, activeInteraction: 'quiz', loadingQuestion: true }).mode, 'check')
  assert.equal(selectStudyPresentation({ ...base, activeInteraction: 'quiz', answerResult: 'incorrect' }).mode, 'check')
})

test('You lost me retains recover through loading and the new explanation, including helpful imagery', () => {
  for (const extra of [{ loadingLesson: 'simplify' }, { recoveringLesson: true }, { recoveringLesson: true, loadingLesson: 'next' }]) {
    const result = selectStudyPresentation({ ...illustrated, ...extra }, 'pending')
    assert.equal(result.mode, 'recover')
    assert.equal(result.reason, 'lesson_recovery')
    assert.equal(result.hasVisual, true)
    assert.equal(result.splitVisual, false)
    assert.equal(result.primary, 'recovery_done')
  }
  assert.equal(selectStudyPresentation({ ...illustrated, recoveringLesson: true }, 'error').mode, 'recover')
  assert.equal(selectStudyPresentation({ ...illustrated, recoveringLesson: false }, 'ready').mode, 'visual')
})

test('quiz recovery is active only while the adapted explanation or its retry is relevant', () => {
  const state = { ...base, ...recovery, activeInteraction: 'quiz' }
  assert.equal(selectStudyPresentation(state).mode, 'recover')
  assert.equal(selectStudyPresentation({ ...state, evaluation: null, loadingEvaluation: true }).mode, 'recover')
  assert.equal(selectStudyPresentation({ ...state, evaluation: null, evaluationError: 'Retry' }).mode, 'recover')
  assert.equal(selectStudyPresentation({ ...state, followUpResult: 'incorrect' }).mode, 'recover')
  assert.equal(selectStudyPresentation({ ...state, followUpResult: 'correct' }).mode, 'check')
  assert.equal(selectStudyPresentation({ ...state, activeInteraction: 'lesson' }).mode, 'focus')
  assert.equal(selectStudyPresentation({ ...state, activeInteraction: 'conversation' }).mode, 'focus')
})

test('misconception feedback selects recover only for the matching submitted activity response', () => {
  const state = { ...base, activeInteraction: 'activity', activityResponse: 'My attempt',
    activityFeedback: { feedback: 'Try changing the stored value.', signal: 'misconception', learnerResponse: 'My attempt' } }
  assert.equal(selectStudyPresentation(state).mode, 'recover')
  assert.equal(selectStudyPresentation(state).primary, 'activity')
  assert.equal(selectStudyPresentation({ ...state, activityResponse: 'Revised attempt' }).mode, 'practice')
  assert.equal(selectStudyPresentation({ ...state, loadingActivity: 'evaluate' }).mode, 'recover')
  assert.equal(selectStudyPresentation({ ...state, loadingActivity: 'generate' }).mode, 'practice')
  assert.equal(selectStudyPresentation({ ...state, activeInteraction: 'lesson' }).mode, 'focus')
  assert.equal(selectStudyPresentation({ ...state, activityFeedback: { ...state.activityFeedback, signal: 'understanding' } }).mode, 'practice')
})

test('conversation stays in focus, uses its own visual, and scopes recovery to the latest completed exchange', () => {
  const state = { ...illustrated, activeInteraction: 'conversation' }
  assert.equal(selectStudyPresentation(state, 'ready').mode, 'focus')
  assert.equal(selectStudyPresentation({ ...state, conversationVisual: visual }, 'ready').mode, 'visual')
  const confused = { ...state, conversationVisual: visual, conversation: [{ signal: 'confusion' }] }
  assert.equal(selectStudyPresentation(confused, 'ready').mode, 'recover')
  assert.equal(selectStudyPresentation(confused, 'ready').compactConversation, true)
  assert.equal(selectStudyPresentation({ ...confused, conversation: [...confused.conversation, { signal: 'understanding' }] }, 'ready').mode, 'visual')
})

test('a new lesson selects its own presentation and image key without mutating learning state', () => {
  const state = { ...illustrated, ...recovery, activeInteraction: 'lesson', recoveringLesson: false, mastery: 40 }
  const before = JSON.stringify(state)
  const key = studyPresentationImageKey(state)
  assert.notEqual(studyPresentationImageKey({ ...state, lesson: { ...state.lesson, content: 'Now render the next state.' } }), key)
  assert.equal(selectStudyPresentation({ ...base, lesson: { ...lesson, concept: 'Events' } }).mode, 'focus')
  assert.equal(selectStudyPresentation(state, 'ready').mode, 'visual', 'Inactive quiz recovery cannot leak into a new lesson')
  assert.equal(JSON.stringify(state), before)
})
