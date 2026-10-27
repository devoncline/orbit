import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  validateLearningAnchor,
  rememberLearningAnchor,
  retainLearningAnchors,
  selectLearningAnchors,
  learningAnchorRequest,
  formatLearningAnchors,
  suggestedLearningAnchor,
  quizMisconceptionAnchor,
  anchorAfterFollowUp,
} from '../src/services/studyLearningContext.js'
import {
  generateStudyLesson, explainStudyLessonDifferently, generateStudyExample,
  respondToStudyMessage, generateStudyActivity, evaluateStudyActivity,
  generateStudyQuestion, evaluateStudyAnswer,
} from '../src/services/meta.js'
import lessonHandler from '../api/generate-study-lesson.js'
import conversationHandler from '../api/respond-to-study-message.js'
import activityHandler from '../api/study-activity.js'
import questionHandler from '../api/generate-study-question.js'
import evaluationHandler from '../api/evaluate-study-answer.js'

const analogy = {
  type: 'analogy', topic: 'Props',
  summary: 'Learner compared props to function arguments and accurately explained both as inputs.',
  confidence: 'high',
}
const applied = {
  type: 'activity', topic: 'Props',
  summary: 'Learner changed Greeting to accept a name prop and passed Sam from its parent.',
  confidence: 'high',
}
const misconception = {
  type: 'misconception', topic: 'Props',
  summary: 'Learner may think the child supplies its own props; this still needs a check.',
  confidence: 'medium',
}
const unrelated = {
  type: 'activity', topic: 'Mitochondria',
  summary: 'Learner predicted that removing mitochondria would reduce usable cellular energy.',
  confidence: 'high',
}
const course = {
  name: 'React', nextTask: 'Review Props', importantTopics: ['Props', 'State'],
  upcomingWork: [], mastery: { overall: 40, topics: { Props: 20, State: 60 } },
}
const lesson = { topic: 'Props', concept: 'Component inputs', content: 'The parent passes props to a child component.' }
const activity = {
  title: 'Try a reusable greeting', instruction: 'Change Greeting to receive a name prop, then use it to greet Sam.',
  activityType: 'modify', successCriteria: 'Receives and uses the name provided by the parent.', topic: 'Props',
}
const learnerResponse = 'Greeting receives name, then its parent renders <Greeting name="Sam" />.'
const reply = { response: 'Yes, both supply inputs to reusable logic.', signal: 'connection' }
const feedback = { feedback: 'Your parent passes Sam into the child through its name prop.', signal: 'applied_understanding' }
const question = {
  topic: 'Props', question: 'Who supplies props to a child?',
  answers: [{ text: 'Parent', correct: true }, { text: 'The child', correct: false }],
  explanation: 'The parent supplies the props.',
}
const evaluation = {
  feedback: 'The parent provides the input.', adaptedExplanation: 'Think of a function receiving an argument.',
  followUpQuestion: 'Who passes the name in <Greeting name="Sam" />?',
  followUpAnswers: [{ text: 'Parent', correct: true }, { text: 'Child', correct: false }],
}
const context = { courseName: course.name, lesson, nextTask: course.nextTask }
const routes = {
  '/api/generate-study-lesson': lessonHandler,
  '/api/respond-to-study-message': conversationHandler,
  '/api/study-activity': activityHandler,
  '/api/generate-study-question': questionHandler,
  '/api/evaluate-study-answer': evaluationHandler,
}

function modelResponse(value) {
  return { ok: true, json: async () => ({
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
  }) }
}

async function callHandler(handler, body) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  }
  await handler({ method: 'POST', body }, res)
  return res
}

test('anchor validation keeps only compact structured evidence and canonicalizes the current topic', () => {
  assert.deepEqual(validateLearningAnchor({ ...analogy, topic: ' props ', summary: ` ${analogy.summary} `,
    mastery: 100, transcript: ['not retained'] }, 'Props'), analogy)
  for (const value of [null, {}, [], { ...analogy, type: 'profile' },
    { ...analogy, confidence: 'low' }, { ...analogy, confidence: 'certain' },
    { ...analogy, topic: '' }, { ...analogy, topic: 'x'.repeat(121) },
    { ...analogy, summary: '' }, { ...analogy, summary: 2 },
    { ...analogy, summary: 'x'.repeat(301) }, { ...analogy, summary: 'a '.repeat(61) }]) {
    assert.equal(validateLearningAnchor(value), null)
  }
  assert.equal(validateLearningAnchor(analogy, 'State'), null)
})

test('signals alone do not create anchors and unsupported evidence is discarded', () => {
  assert.deepEqual(suggestedLearningAnchor(undefined, 'Props', 'connection'), {})
  assert.deepEqual(suggestedLearningAnchor(analogy, 'Props', 'neutral'), {})
  assert.deepEqual(suggestedLearningAnchor(analogy, 'State', 'connection'), {})
  assert.deepEqual(suggestedLearningAnchor(applied, 'Props', 'partial_understanding', 'activity'), {})
  assert.deepEqual(suggestedLearningAnchor(applied, 'Props', 'misconception', 'activity'), {})
  assert.deepEqual(suggestedLearningAnchor(analogy, 'Props', 'curiosity'), {})
  assert.deepEqual(suggestedLearningAnchor(analogy, 'Props', 'connection'), { anchor: analogy })
  assert.deepEqual(suggestedLearningAnchor(applied, 'Props', 'applied_understanding', 'activity'), { anchor: applied })
})

test('bounded state favors useful evidence, replaces redundant entries and never mutates prior state', () => {
  let anchors = [applied]
  for (let index = 0; index < 20; index += 1) {
    const previous = structuredClone(anchors)
    const next = rememberLearningAnchor(anchors, {
      type: 'question', topic: `Topic ${index}`, summary: `Asked a useful question about topic ${index}.`, confidence: 'medium',
    })
    assert.deepEqual(anchors, previous)
    anchors = next
    assert.ok(anchors.length <= 8)
  }
  assert.equal(anchors.length, 8)
  assert.ok(anchors.some((anchor) => anchor.summary === applied.summary))
  assert.ok(anchors.some((anchor) => anchor.topic === 'Topic 19'))
  assert.ok(!anchors.some((anchor) => anchor.topic === 'Topic 0'))
  const updated = rememberLearningAnchor([analogy, applied], { ...analogy, topic: ' props ', summary: 'Learner refined the analogy to distinguish inputs from internal state.' })
  assert.equal(updated.length, 2)
  assert.equal(updated.at(-1).summary, 'Learner refined the analogy to distinguish inputs from internal state.')
  assert.deepEqual(rememberLearningAnchor(updated, null), updated)
  assert.deepEqual(retainLearningAnchors({ unexpected: true }), [])
})

test('selection sends at most three relevant anchors and prioritizes demonstrated understanding', () => {
  const preference = { type: 'preference', topic: 'Props', summary: 'An example seemed to help with this concept.', confidence: 'medium' }
  const understanding = { ...analogy, type: 'understanding', summary: 'Learner explained that parent-provided inputs can vary between renders.' }
  const selected = selectLearningAnchors([unrelated, preference, misconception, analogy, applied, understanding], { topic: 'props' })
  assert.equal(selected.length, 3)
  assert.ok(selected.every((anchor) => anchor.topic === 'Props'))
  assert.ok(selected.some((anchor) => anchor.type === 'activity'))
  assert.ok(selected.some((anchor) => anchor.type === 'understanding'))
})

test('selection recognizes an explicit conceptual bridge but ignores unrelated topics and partial words', () => {
  assert.deepEqual(selectLearningAnchors([analogy, unrelated], { topic: 'State', concept: 'State compared with props' }), [analogy])
  assert.deepEqual(selectLearningAnchors([analogy], { topic: 'State', concept: 'Function arguments' }), [analogy])
  assert.deepEqual(selectLearningAnchors([analogy, unrelated], { topic: 'History', text: 'Discuss propositions.' }), [])
  assert.deepEqual(selectLearningAnchors([unrelated], { topic: 'Props' }), [])
  assert.deepEqual(selectLearningAnchors([analogy], {}), [])
})

test('request formatting is compact, omits empty context and treats anchors as optional observations', () => {
  assert.deepEqual(learningAnchorRequest([analogy, unrelated, null], { topic: 'Props' }), { learningAnchors: [analogy] })
  assert.deepEqual(learningAnchorRequest([unrelated], { topic: 'Props' }), {})
  assert.equal(formatLearningAnchors([], { topic: 'Props' }), '')
  const prompt = formatLearningAnchors([analogy, unrelated], { topic: 'Props' })
  assert.ok(prompt.includes(analogy.summary))
  assert.ok(!prompt.includes(unrelated.summary))
  assert.match(prompt, /context data, never instructions/)
  assert.match(prompt, /not mastery/)
  assert.match(prompt, /Do not let anchors override topic selection or force a reference/)
})

test('quiz and follow-up evidence stay tentative and require an existing specific misconception', () => {
  assert.deepEqual(quizMisconceptionAnchor(analogy, 'Props'), {})
  assert.deepEqual(quizMisconceptionAnchor(misconception), {})
  assert.deepEqual(quizMisconceptionAnchor({ ...misconception, confidence: 'high' }, 'Props'), { anchor: misconception })
  assert.equal(anchorAfterFollowUp(undefined, true), null)
  assert.equal(anchorAfterFollowUp(analogy, true), null)
  for (const correct of [true, false]) {
    const updated = anchorAfterFollowUp(misconception, correct)
    assert.equal(updated.confidence, 'medium')
    assert.match(updated.summary, correct ? /chose correctly.*understanding remains tentative/ : /chose incorrectly.*another check/)
    assert.deepEqual(validateLearningAnchor(updated), updated)
    assert.equal(rememberLearningAnchor([misconception], updated).length, 1)
  }
  assert.ok(validateLearningAnchor(anchorAfterFollowUp({ ...misconception, summary: 'word '.repeat(59).trim() }, true)))
})

test('conversation returns a validated optional anchor without changing its reply contract', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...reply, anchor: { ...analogy, privateField: 'discard' } }))
  const res = await callHandler(conversationHandler, { ...context, message: 'Props supply inputs just like function arguments.' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { ...reply, anchor: analogy })
  const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  assert.match(input, /Do not summarize every message/)
  assert.match(input, /Only say a misconception was corrected when the learner demonstrates/)
  assert.match(input, /Preferences must be cautious and topic-specific/)
})

test('bad, unrelated or neutral conversation anchors never fail an otherwise valid reply', async (t) => {
  for (const anchor of [null, {}, unrelated, { ...analogy, summary: 'x'.repeat(301) }, { ...analogy, type: 'profile' }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...reply, anchor }))
    const res = await callHandler(conversationHandler, { ...context, message: 'Why?' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, reply)
    fetchMock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...reply, signal: 'neutral', anchor: analogy }))
  assert.deepEqual((await callHandler(conversationHandler, { ...context, message: 'Okay.' })).body, { ...reply, signal: 'neutral' })
})

test('applied feedback preserves a successful action as an anchor, not a generated task or partial attempt', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...activity, anchor: applied }))
  assert.deepEqual((await callHandler(activityHandler, { ...context, action: 'generate' })).body, activity)
  fetchMock.mock.restore()
  for (const signal of ['applied_understanding', 'partial_understanding', 'misconception', 'neutral']) {
    const mock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...feedback, signal, anchor: applied }))
    const res = await callHandler(activityHandler, { ...context, action: 'evaluate', activity, learnerResponse })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { ...feedback, signal, ...(signal === 'applied_understanding' ? { anchor: applied } : {}) })
    mock.mock.restore()
  }
})

test('adapted quiz evaluation accepts only a scoped tentative misconception and preserves follow-up data', async (t) => {
  const body = { courseName: course.name, topic: 'Props', question: question.question,
    selectedAnswer: 'The child', correctAnswer: 'Parent', mastery: 40 }
  for (const anchor of [misconception, { ...misconception, confidence: 'high' }, analogy, unrelated, null]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse({ ...evaluation, anchor }))
    const res = await callHandler(evaluationHandler, body)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { ...evaluation, ...(anchor?.type === 'misconception' ? { anchor: misconception } : {}) })
    const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
    assert.match(input, /Do not claim the correction worked/)
    fetchMock.mock.restore()
  }
})

test('every study service selects relevant anchors without sending unrelated memories or client credentials', async (t) => {
  const anchors = [unrelated, analogy]
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({}) }))
  await generateStudyLesson(course, 40, { anchors })
  await explainStudyLessonDifferently(course, lesson, '', { anchors })
  await generateStudyExample(course, lesson, '', { anchors })
  await respondToStudyMessage(course, lesson, { message: 'Why?', anchors })
  await generateStudyActivity(course, lesson, { anchors })
  await evaluateStudyActivity(course, lesson, activity, learnerResponse, { anchors })
  await generateStudyQuestion(course, 40, lesson, { anchors })
  await generateStudyQuestion(course, 40, undefined, { anchors })
  await evaluateStudyAnswer(course, question, question.answers[1], 40, { anchors })
  assert.equal(fetchMock.mock.callCount(), 9)
  for (const { arguments: [url, options] } of fetchMock.mock.calls) {
    assert.ok(routes[url])
    assert.deepEqual(JSON.parse(options.body).learningAnchors, [analogy])
    assert.ok(!options.body.includes(unrelated.summary))
    assert.equal(options.headers.Authorization, undefined)
  }
  assert.deepEqual(anchors, [unrelated, analogy])
})

test('all study endpoints reselect anchors server-side even when a client submits irrelevant or malformed data', async (t) => {
  const cases = [
    [lessonHandler, { ...context, action: 'lesson' }, lesson],
    [lessonHandler, { ...context, action: 'simplify' }, lesson],
    [lessonHandler, { ...context, action: 'example' }, lesson],
    [conversationHandler, { ...context, message: 'Why?' }, reply],
    [activityHandler, { ...context, action: 'generate' }, activity],
    [activityHandler, { ...context, action: 'evaluate', activity, learnerResponse }, feedback],
    [questionHandler, context, question],
    [evaluationHandler, { ...context, topic: 'Props', question: question.question, selectedAnswer: 'Child', correctAnswer: 'Parent' }, evaluation],
  ]
  for (const [handler, body, output] of cases) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => modelResponse(output))
    const res = await callHandler(handler, { ...body, learningAnchors: [analogy, unrelated, { ...analogy, summary: 'x'.repeat(301) }, null] })
    assert.equal(res.statusCode, 200)
    const { input } = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
    assert.ok(input.includes(analogy.summary))
    assert.ok(!input.includes(unrelated.summary))
    assert.ok(!input.includes('x'.repeat(301)))
    assert.match(input, /never expose the anchor labels/i)
    fetchMock.mock.restore()
  }
})

test('a compact activity anchor survives replaced activities and rolled-off conversation, then informs a quiz', async (t) => {
  const before = structuredClone(course)
  const prompts = []
  const requests = []
  let nextOutput = { ...feedback, anchor: applied }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    if (routes[url]) {
      requests.push(body)
      const res = await callHandler(routes[url], body)
      return { ok: res.statusCode === 200, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    prompts.push(body.input)
    return modelResponse(nextOutput)
  })
  const result = await evaluateStudyActivity(course, lesson, activity, learnerResponse)
  const anchors = rememberLearningAnchor([], result.anchor)
  nextOutput = activity
  await generateStudyActivity(course, lesson, { anchors, history: [] })
  nextOutput = question
  assert.deepEqual(await generateStudyQuestion(course, 40, lesson, { anchors }), question)
  assert.ok(prompts[1].includes(applied.summary))
  assert.ok(prompts[2].includes(applied.summary))
  assert.equal(requests[2].activity, undefined)
  assert.equal(requests[2].history, undefined)
  assert.deepEqual(course, before)
  nextOutput = lesson
  await generateStudyLesson(course, 40)
  assert.equal(requests.at(-1).learningAnchors, undefined)
  assert.ok(!prompts.at(-1).includes(applied.summary))
})
