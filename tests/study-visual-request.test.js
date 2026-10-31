import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStudyVisualRequest, studyVisualContext } from '../src/services/studyVisualRequest.js'
import { lessonImageRequest } from '../src/services/lessonImageRequest.js'
import { selectStudyPresentation } from '../src/services/studyPresentation.js'

const lesson = { topic: 'Orbital motion', concept: 'Why Earth stays in orbit', content: 'Gravity pulls toward the Sun while forward velocity carries Earth along a curved path.' }
const state = { courseName: 'Physics', lesson, activeInteraction: 'lesson' }
const clarification = 'Gravity pulls inward. Forward velocity carries Earth sideways. Together these make a curved orbit, rather than a fall straight into the Sun.'

test('Show me builds an instructional request without an automatic visual or inferred topology', () => {
  const { request } = createStudyVisualRequest(state)
  assert.deepEqual(request, lessonImageRequest(request))
  assert.equal(request.visual.type, 'generated_image')
  assert.equal(request.lesson.content, lesson.content)
  assert.match(request.visual.purpose, /Why Earth stays in orbit/)
  assert.equal(request.visual.links, undefined)
  assert.equal(createStudyVisualRequest({ courseName: 'Physics' }), null)
})

test('unchanged automatic briefs use the exact existing cache key', () => {
  const visual = { type: 'generated_image', purpose: 'Explain orbital motion.', data: [{ label: 'Earth', detail: lesson.content }] }
  const current = { ...state, lesson: { ...lesson, visual } }
  assert.deepEqual(createStudyVisualRequest(current).request, lessonImageRequest({ ...current, visual }))
})

test('I lost you context survives leaving or acknowledging recovery without changing its request', () => {
  const recovering = { ...state, lesson: { ...lesson, content: clarification }, recoveringLesson: true }
  const recentVisualRecovery = studyVisualContext(recovering)
  const direct = createStudyVisualRequest({ ...recovering, recentVisualRecovery })
  const after = createStudyVisualRequest({ ...recovering, recoveringLesson: false, recentVisualRecovery })
  assert.deepEqual(direct, after)
  assert.match(direct.request.visual.recoveryContext, /Forward velocity.*curved orbit/)
  assert.match(direct.explanation, /rather than a fall straight/)
})

test('quiz recovery targets the incorrect answer and corrective explanation rather than generic topic art', () => {
  const result = createStudyVisualRequest({ ...state, activeInteraction: 'quiz', answerResult: 'incorrect',
    studyQuestion: { question: 'Why does Earth not fall straight into the Sun?' }, selectedAnswer: { text: 'There is no gravity in space.' },
    evaluation: { feedback: 'Gravity still acts in space.', adaptedExplanation: clarification } })
  assert.match(result.request.visual.recoveryContext, /no gravity in space/)
  assert.match(result.request.visual.recoveryContext, /Forward velocity/)
  assert.match(result.request.lesson.content, /curved orbit/)
  assert.match(JSON.stringify(result.request.visual.data), /Gravity still acts/)
  assert.equal(result.recovery, true)
})

test('a simpler explanation retains the explicitly known confusion from the same lesson', () => {
  const recentVisualRecovery = studyVisualContext({ ...state, activeInteraction: 'conversation',
    conversation: [{ message: 'Why does Earth not fall straight into the Sun?', response: clarification, signal: 'confusion' }] })
  const simpler = { ...state, lesson: { ...lesson, content: 'Imagine a ball moving sideways as it falls.' }, recoveringLesson: true, recentVisualRecovery }
  const savedRecovery = studyVisualContext(simpler)
  const result = createStudyVisualRequest({ ...simpler, recentVisualRecovery: savedRecovery })
  assert.match(result.request.visual.recoveryContext, /Why does Earth not fall straight into the Sun/)
  assert.match(result.request.visual.recoveryContext, /ball moving sideways/)
  assert.deepEqual(createStudyVisualRequest({ ...simpler, recoveringLesson: false, recentVisualRecovery: savedRecovery }), result)
})

test('matching activity feedback is used, while an edited attempt does not inherit stale feedback', () => {
  const activity = { instruction: 'Predict Earth’s path if forward velocity stopped.' }
  const current = { ...state, activeInteraction: 'activity', activity, activityResponse: 'It stays in orbit.',
    activityFeedback: { learnerResponse: 'It stays in orbit.', signal: 'misconception', feedback: clarification } }
  assert.match(createStudyVisualRequest(current).request.visual.recoveryContext, /It stays in orbit/)
  const revised = createStudyVisualRequest({ ...current, activityResponse: 'It falls inward.', recentVisualRecovery: studyVisualContext(current) })
  assert.equal(revised.recovery, false)
  assert.doesNotMatch(JSON.stringify(revised), /It stays in orbit/)
  assert.match(JSON.stringify(revised), /Learner attempt \(may be incorrect\)/)
})

test('follow-up misconceptions use the current follow-up question and attempted answer', () => {
  const result = createStudyVisualRequest({ ...state, activeInteraction: 'quiz', answerResult: 'incorrect', followUpResult: 'incorrect',
    studyQuestion: { question: 'Original question' }, selectedAnswer: { text: 'Original wrong answer' },
    followUpAnswer: { text: 'Velocity points inward.' },
    evaluation: { followUpQuestion: 'Which way is forward velocity?', adaptedExplanation: clarification } })
  assert.match(result.request.visual.recoveryContext, /Velocity points inward/)
  assert.match(JSON.stringify(result.request.visual.data), /Which way is forward velocity/)
  assert.doesNotMatch(JSON.stringify(result), /Original wrong answer/)
})

test('examples and only the latest completed conversation inform the request', () => {
  assert.match(createStudyVisualRequest({ ...state, activeInteraction: 'example', example: 'Imagine a ball moving sideways while it falls.' }).request.lesson.content, /ball moving sideways/)
  const result = createStudyVisualRequest({ ...state, activeInteraction: 'conversation',
    conversation: [{ message: 'OLD_PRIVATE_TRANSCRIPT', response: 'old' }, { message: 'Why not fall straight into the Sun?', response: clarification, signal: 'confusion' }],
    learnerMessage: 'UNSENT_PRIVATE_DRAFT' })
  assert.match(result.request.visual.recoveryContext, /Why not fall straight/)
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/)
})

test('request allowlist and bounds exclude arbitrary learner state and keep recent recovery before long generic text', () => {
  const recentVisualRecovery = studyVisualContext({ ...state, activeInteraction: 'conversation', conversation: [{ message: 'Why not fall inward?', response: clarification, signal: 'confusion' }] })
  const result = createStudyVisualRequest({ ...state, lesson: { ...lesson, content: 'generic '.repeat(2000) }, recentVisualRecovery,
    files: ['PRIVATE_FILE'], mastery: 'PRIVATE_MASTERY', MODEL_API_KEY: 'PRIVATE_KEY' })
  assert.match(result.request.lesson.content, /^Gravity pulls inward/)
  assert.ok(result.request.lesson.content.length <= 900)
  assert.ok(result.request.visual.recoveryContext.length <= 400)
  assert.ok(result.request.visual.data.every((entry) => entry.detail.length <= 240))
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/)
})

test('explicit visuals use the existing visual presentation throughout pending and ready, even after quiz recovery', () => {
  const requestedVisual = createStudyVisualRequest(state)
  const current = { ...state, activeInteraction: 'visual', requestedVisual, answerResult: 'incorrect', showAdaptedLesson: true, evaluation: {} }
  for (const status of ['idle', 'pending', 'ready']) assert.equal(selectStudyPresentation(current, status).mode, 'visual')
  assert.equal(selectStudyPresentation(current, 'error').mode, 'focus')
  assert.equal(createStudyVisualRequest(current), requestedVisual)
  assert.notDeepEqual(createStudyVisualRequest({ ...state, lesson: { ...lesson, content: 'A materially changed lesson.' } }).request, requestedVisual.request)
})
