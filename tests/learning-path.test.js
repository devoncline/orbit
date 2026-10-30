import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../api/generate-study-lesson.js'
import { acceptPathLesson, learningPathContextKey, learningPathPosition, normalizeLearningPath, normalizeLessonVisual, generatedLessonVisual, recommendStudyAction, studyPathView } from '../src/services/learningPath.js'
import { generateNextStudyLesson } from '../src/services/meta.js'
import { compactThreadResume, createLearnerSnapshot, loadLearnerMemory, saveLearnerMemory } from '../src/services/learnerMemory.js'
import { applyPositionOverride, coursePositionRequest, localDate } from '../src/services/coursePosition.js'

const course = { name: 'Introduction to Psychology', mastery: { overall: 40, topics: {} } }
const lesson = { topic: 'Perspectives', concept: 'Different explanations of behavior', content: '## Looking at behavior\n**Perspectives** explain the same behavior in different ways.\n\n## An example\nOne psychologist studies memory while another studies social influence.' }
const next = { topic: 'Research', concept: 'Testing explanations', content: '## Testing an idea\nPsychologists collect evidence to test explanations.\n\n## An example\nCompare recall after different amounts of sleep.' }
const visual = { type: 'comparison', purpose: 'Compare explanations of one behavior.', data: [{ label: 'Cognitive', detail: 'Attention and memory' }, { label: 'Social', detail: 'Influence of other people' }], focus: 'Same behavior, different explanations' }
const request = { courseName: course.name, mastery: 40, topicMastery: {}, ...coursePositionRequest(course), learningPath: normalizeLearningPath() }

test('path display uses the actual lesson and safely normalizes missing, malformed and stale path data', () => {
  assert.deepEqual(studyPathView(undefined, lesson, '12345678'), {
    step: 1, visited: [], current: { topic: lesson.topic, concept: lesson.concept }, upcoming: [], isCurrent: false,
  })
  const malformed = studyPathView({ step: -1, visited: [null, {}], upcoming: 'bad' }, null, '12345678')
  assert.equal(malformed.step, 1)
  assert.equal(malformed.current, null)
  assert.deepEqual(malformed.visited, [])
  assert.deepEqual(malformed.upcoming, [])
  const path = { step: 4, visited: [lesson], upcoming: [next, lesson], contextKey: '12345678' }
  const before = structuredClone(path)
  const view = studyPathView(path, next, '12345678')
  assert.equal(view.step, 4)
  assert.equal(view.current.concept, next.concept)
  assert.equal(view.visited.at(-1).concept, lesson.concept)
  assert.deepEqual(view.upcoming, []) // Neither the current nor an already visited lesson is next.
  assert.deepEqual(studyPathView({ ...path, upcoming: [next] }, lesson, '87654321').upcoming, [])
  assert.deepEqual(path, before)
})

test('recommendations guide reading, examples and applying without inferring that a lesson was read or mastered', () => {
  assert.equal(recommendStudyAction(), null)
  const fresh = recommendStudyAction({ lesson })
  assert.equal(fresh.action, 'example')
  assert.match(fresh.hint, /Start with the lesson above/)
  assert.equal(recommendStudyAction({ lesson, example: 'A concrete example' }).action, 'activity')
  assert.equal(recommendStudyAction({ lesson, conversation: [{ message: 'Why?', response: 'Because…' }] }).action, 'activity')
  assert.equal(recommendStudyAction({ lesson, learningPath: { understood: true } }).action, 'continue')
  assert.equal(recommendStudyAction({ lesson, activeInteraction: 'history' }).action, 'lesson')
})

test('activity recommendations use matching submitted feedback and keep drafts focused on the activity', () => {
  const activityFeedback = { learnerResponse: 'My attempt', feedback: 'A useful connection.', signal: 'applied_understanding' }
  const state = { lesson, activeInteraction: 'activity', activityFeedback, activityResponse: 'My attempt ' }
  assert.equal(recommendStudyAction(state).action, 'quiz')
  assert.equal(recommendStudyAction({ ...state, activityResponse: 'A revised attempt' }).action, null)
  assert.equal(recommendStudyAction({ ...state, activityFeedback: null }).action, null)
  assert.equal(recommendStudyAction({ ...state, activityError: { action: 'generate' } }).action, 'retryActivity')
  assert.equal(recommendStudyAction({ ...state, activeInteraction: 'lesson', learningPath: { understood: true } }).action, 'continue')
  for (const signal of ['misconception', 'partial_understanding']) {
    const needsSupport = { ...state, activityFeedback: { ...activityFeedback, signal } }
    assert.equal(recommendStudyAction(needsSupport).action, 'example')
    assert.equal(recommendStudyAction({ ...needsSupport, activeInteraction: 'example', example: 'Another way to see it' }).action, 'activity')
  }
})

test('failed example and activity generation recommend a retry instead of assuming content exists', () => {
  const example = recommendStudyAction({ lesson, activeInteraction: 'example', lessonError: 'Unavailable' })
  assert.equal(example.action, 'example')
  assert.equal(example.label, 'Try the example again')
  assert.equal(recommendStudyAction({ lesson, activeInteraction: 'activity', activityError: { action: 'generate' } }).action, 'retryActivity')
  const draft = { lesson, activeInteraction: 'activity', activity: { title: 'Try it' }, activityResponse: 'An attempt', activityError: { action: 'evaluate' } }
  assert.equal(recommendStudyAction(draft).action, null)
  assert.match(recommendStudyAction(draft).hint, /share what you notice/)
})

test('quiz recovery outranks readiness and activity feedback, including failures and returning from another tool', () => {
  const state = { lesson, activeInteraction: 'quiz', answerResult: 'incorrect', learningPath: { understood: true }, evaluation: {} }
  assert.equal(recommendStudyAction(state).action, null)
  assert.match(recommendStudyAction(state).hint, /follow-up/)
  assert.equal(recommendStudyAction({ ...state, evaluationError: 'Unavailable' }).action, 'retryExplanation')
  assert.equal(recommendStudyAction({ ...state, activeInteraction: 'lesson' }).action, 'recover')
  assert.equal(recommendStudyAction({ ...state, followUpResult: 'incorrect' }).action, 'conversation')
  assert.equal(recommendStudyAction({ ...state, followUpResult: 'incorrect', activeInteraction: 'conversation' }).action, null)
  assert.equal(recommendStudyAction({ ...state, followUpResult: 'correct' }).action, 'continue')
  assert.equal(recommendStudyAction({ lesson, activeInteraction: 'quiz', answerResult: 'correct' }).action, 'continue')
  assert.equal(recommendStudyAction({ lesson, activeInteraction: 'quiz' }).action, null)
  assert.equal(recommendStudyAction({ lesson, activeInteraction: 'quiz', questionError: 'Unavailable' }).action, 'retryQuiz')
})

test('progression and resume derive guidance from retained evidence without changing mastery or saving recommendations', () => {
  const before = structuredClone(course)
  const path = acceptPathLesson({ ...lesson, nextLessons: [next] }, undefined, undefined, learningPathContextKey(course))
  const saved = compactThreadResume({ lesson, learningPath: { ...path, understood: true }, recommendation: { action: 'quiz' } })
  assert.equal(recommendStudyAction(saved).action, 'continue')
  assert.equal(saved.recommendation, undefined)
  const advanced = { lesson: next, learningPath: acceptPathLesson(next, saved.learningPath, lesson, learningPathContextKey(course)) }
  assert.equal(recommendStudyAction(advanced).action, 'example')
  assert.equal(studyPathView(advanced.learningPath, next, learningPathContextKey(course)).step, 2)
  assert.equal(recommendStudyAction(compactThreadResume({ lesson })).action, 'example')
  assert.deepEqual(course, before)
})

async function call(body) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
  await handler({ method: 'POST', body }, res)
  return res
}
function mockModel(t, result) {
  return t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }) }))
}

test('guided course start returns readable lesson, bounded suggestions and a visual specification in one request', async (t) => {
  const mock = mockModel(t, { ...lesson, nextLessons: [next], visual, mastery: 100, curriculum: ['extra'] })
  const res = await call(request)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.content, lesson.content)
  assert.deepEqual(res.body.nextLessons, [{ topic: next.topic, concept: next.concept }])
  assert.deepEqual(res.body.visual, generatedLessonVisual(visual))
  assert.equal(res.body.mastery, undefined)
  assert.equal(res.body.curriculum, undefined)
  assert.equal(mock.mock.callCount(), 1)
  const prompt = JSON.parse(mock.mock.calls[0].arguments[1].body).input
  assert.match(prompt, /not merely a dictionary definition/)
  assert.match(prompt, /Do not repeat the course\/topic\/concept title/)
  assert.match(prompt, /Real course evidence overrides AI assumptions/)
})

test('lesson prompt evaluates visual teaching value, selects generated images, and still accepts none', async (t) => {
  const biology = { topic: 'Photosynthesis', concept: 'Light becomes stored energy', content: 'Plants use light energy to make sugars.' }
  for (const specification of [{ ...visual, type: 'concept_illustration' }, { type: 'none' }]) {
    const mock = mockModel(t, { ...biology, visual: specification })
    const res = await call({ courseName: 'Biology', importantTopics: ['Photosynthesis'], mastery: 40 })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.visual, generatedLessonVisual(specification) || specification)
    assert.equal(mock.mock.callCount(), 1)
    const { input } = JSON.parse(mock.mock.calls[0].arguments[1].body)
    assert.match(input, /Actively evaluate whether an instructional image would materially improve understanding/)
    assert.match(input, /Do not force visuals for every lesson/)
    assert.match(input, /Photosynthesis, cellular respiration, gravity\/orbits, React state flow/)
    assert.match(input, /Short factual recall, pure vocabulary, simple definitions/)
    assert.match(input, /process for ordered steps/)
    assert.match(input, /diagram for relationships/)
    assert.match(input, /comparison for contrasts/)
    assert.match(input, /concept_illustration for physical structure/)
    assert.match(input, /"generated_image" when it materially improves understanding/)
    assert.doesNotMatch(input, /generated_image is deferred/)
    assert.doesNotMatch(input, /"visual"\s*:\s*\{\s*"type"\s*:\s*"none"/)
    mock.mock.restore()
  }
})

test('continuation advances a concept without changing mastery or mutating prior path and keeps only a small window', () => {
  const before = structuredClone(course)
  let current = lesson
  let path = acceptPathLesson({ ...lesson, nextLessons: [next] }, undefined, undefined, learningPathContextKey(course))
  for (let i = 0; i < 20; i++) {
    path = { ...path, understood: i % 2 === 0 }
    const previous = structuredClone(path)
    const result = { ...next, concept: `Concept ${i}`, nextLessons: [{ ...next, concept: `Concept ${i + 1}` }] }
    const updated = acceptPathLesson(result, path, current, learningPathContextKey(course))
    assert.deepEqual(path, previous)
    assert.equal(updated.understood, false)
    assert.equal(updated.visited.at(-1).understood, i % 2 === 0)
    assert.ok(updated.visited.length <= 8)
    assert.ok(updated.upcoming.length <= 2)
    path = updated
    current = result
  }
  assert.equal(path.step, 21)
  assert.deepEqual(course, before)
})

test('next-lesson service sends only bounded plan and relevant context, supports abort, and drops stale suggestions', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => next }))
  const path = acceptPathLesson({ ...lesson, nextLessons: [next] }, undefined, undefined, learningPathContextKey(course))
  const controller = new AbortController()
  const privateCourse = { ...course, token: 'SECRET_SENTINEL', files: ['RAW_UPLOAD_SENTINEL'] }
  await generateNextStudyLesson(privateCourse, 40, lesson, { path: { ...path, arbitrary: 'SECRET_SENTINEL' }, signal: controller.signal })
  const [url, options] = mock.mock.calls[0].arguments
  assert.equal(url, '/api/generate-study-lesson')
  assert.equal(options.signal, controller.signal)
  assert.equal(options.headers.Authorization, undefined)
  const sent = JSON.parse(options.body)
  assert.equal(sent.action, 'next')
  assert.deepEqual(sent.lesson, lesson)
  assert.deepEqual(sent.learningPath.upcoming, path.upcoming)
  assert.doesNotMatch(options.body, /SECRET_SENTINEL|RAW_UPLOAD_SENTINEL/)
  const revised = { ...privateCourse, learnerPosition: applyPositionOverride(null, { type: 'current', topic: 'Biological psychology' }) }
  await generateNextStudyLesson(revised, 40, lesson, { path })
  assert.deepEqual(JSON.parse(mock.mock.calls[1].arguments[1].body).learningPath.upcoming, [])
  assert.equal(path.upcoming.length, 1)
})

test('evidence changes invalidate suggestions; generated summaries and raw uploads do not', () => {
  const original = learningPathContextKey(course, '2026-10-27')
  for (const change of [
    { syllabusItems: [{ topic: 'Biological psychology', startDate: '2026-10' }] },
    { learnerPosition: applyPositionOverride(null, { type: 'skip', topic: 'Research' }) },
    { upcomingWork: [{ title: 'Memory test', topic: 'Memory', date: '2026-10-28' }] },
    { importantTopics: ['Conditioning'] },
    { mastery: { topics: { Perspectives: 80 } } },
    { learningAnchors: [{ type: 'misconception', topic: 'Perspectives', summary: 'Confuses cognitive and biological explanations.', confidence: 'medium' }] },
  ]) assert.notEqual(learningPathContextKey({ ...course, ...change }, '2026-10-27'), original)
  assert.notEqual(learningPathContextKey(course, '2026-10-28'), original)
  assert.equal(learningPathContextKey({ ...course, recentLearning: { topic: 'Perspectives' }, files: ['raw'] }, '2026-10-27'), original)
})

test('guided lessons prioritize new syllabus evidence over old activity, while an explicit class correction can override the schedule', async (t) => {
  const dated = { ...course, syllabusItems: [{ topic: 'Biological psychology', startDate: '2026-10' }],
    recentLearning: { topic: 'Perspectives', positionKey: 'null', updatedAt: '2026-10-27' }, mastery: { topics: { Perspectives: 20 } } }
  assert.equal(learningPathPosition(dated, '2026-10-27').currentTopic, 'Biological psychology')
  const model = { ...next, topic: 'Biological psychology', nextLessons: [{ topic: 'Biological psychology', concept: 'Neural communication' }] }
  const mock = mockModel(t, model)
  const body = { ...request, ...coursePositionRequest(dated, '2026-10-27'), topicMastery: dated.mastery.topics, action: 'next', lesson }
  const res = await call(body)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.topic, 'Biological psychology')
  mock.mock.restore()
  mockModel(t, { ...next, topic: 'Memory' })
  const revised = { ...body, learnerPosition: applyPositionOverride(null, { type: 'current', topic: 'Memory' }) }
  assert.equal((await call(revised)).statusCode, 200)
  assert.equal((await call(body)).statusCode, 502)
})

test('a next lesson cannot repeat current/recent concepts, violate exclusions, or jump into a future unit', async (t) => {
  const path = { ...normalizeLearningPath(), visited: [next] }
  for (const result of [lesson, next, { ...next, topic: 'Skipped' }, { ...next, topic: 'Future unit' }]) {
    const mock = mockModel(t, result)
    const res = await call({ ...request, action: 'next', lesson, learningPath: path, currentDate: '2026-10-27',
      syllabusItems: [{ topic: 'Perspectives', startDate: '2026-10' }, { topic: 'Future unit', startDate: '2026-12' }],
      learnerPosition: applyPositionOverride(null, { type: 'skip', topic: 'Skipped' }) })
    assert.equal(res.statusCode, 502)
    mock.mock.restore()
  }
})

test('successive service-to-handler continuations follow the small plan without needing quiz answers', async (t) => {
  const base = { ...course, mastery: { overall: 40, topics: { Perspectives: 40 } } }
  const before = structuredClone(base)
  const third = { topic: 'Research', concept: 'Comparing groups', content: '## A fair comparison\nGroups should differ only in the factor being tested.' }
  let modelResult = { ...next, nextLessons: [third] }
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/generate-study-lesson') {
      requests.push(JSON.parse(options.body))
      const res = await call(JSON.parse(options.body))
      return { ok: res.statusCode === 200, status: res.statusCode, json: async () => res.body }
    }
    assert.equal(url, 'https://api.meta.ai/v1/responses')
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(modelResult) }] }] }) }
  })
  let path = acceptPathLesson({ ...lesson, nextLessons: [next] }, undefined, undefined, learningPathContextKey(base))
  path.understood = true
  const second = await generateNextStudyLesson(base, 40, lesson, { path })
  path = acceptPathLesson(second, path, lesson, learningPathContextKey(base))
  modelResult = third
  const last = await generateNextStudyLesson(base, 40, second, { path })
  path = acceptPathLesson(last, path, second, learningPathContextKey(base))
  assert.equal(path.step, 3)
  assert.equal(last.concept, third.concept)
  assert.deepEqual(path.visited.map((item) => item.concept), [lesson.concept, next.concept])
  assert.deepEqual(requests.map((item) => item.learningPath.upcoming[0].concept), [next.concept, third.concept])
  assert.deepEqual(base, before)
})

test('next lesson rejects invalid requests before Meta and handles provider failures without exposing details', async (t) => {
  const mock = mockModel(t, next)
  assert.equal((await call({ ...request, action: 'next' })).statusCode, 400)
  assert.equal((await call({ ...request, action: 'next', lesson: {} })).statusCode, 400)
  assert.equal(mock.mock.callCount(), 0)
  mock.mock.restore()
  const failed = t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 429, json: async () => ({ private: 'SECRET_SENTINEL' }) }))
  const res = await call({ ...request, action: 'next', lesson })
  assert.equal(res.statusCode, 429)
  assert.doesNotMatch(JSON.stringify(res.body), /SECRET_SENTINEL/)
  await assert.rejects(generateNextStudyLesson(course, 40, lesson), /Failed to generate study lesson/)
  failed.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Cancelled', 'AbortError') })
  await assert.rejects(generateNextStudyLesson(course, 40, lesson), { name: 'AbortError' })
})

test('bad future suggestions fail validation; repeated and excluded suggestions are omitted', async (t) => {
  for (const nextLessons of [null, {}, [null], Array(3).fill(next), [{ ...next, concept: 'x'.repeat(121) }]]) {
    const mock = mockModel(t, { ...lesson, nextLessons })
    assert.equal((await call(request)).statusCode, 502)
    mock.mock.restore()
  }
  mockModel(t, { ...lesson, nextLessons: [lesson, { ...next, topic: 'Skipped' }] })
  const res = await call({ ...request, learnerPosition: applyPositionOverride(null, { type: 'skip', topic: 'Skipped' }) })
  assert.deepEqual(res.body.nextLessons, [])
})

test('an ambiguous corrected position asks for a topic without a model request and carries an actionable service error', async (t) => {
  const mock = mockModel(t, next)
  const res = await call({ ...request, action: 'next', lesson, learnerPosition: applyPositionOverride(null, { type: 'notYet', topic: lesson.topic }) })
  assert.equal(res.statusCode, 422)
  assert.equal(mock.mock.callCount(), 0)
  mock.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 422 }))
  await assert.rejects(generateNextStudyLesson(course, 40, lesson), { code: 'COURSE_POSITION_REQUIRED' })
})

test('visual metadata is allowlisted and bounded, and unsupported visuals leave the lesson usable', async (t) => {
  assert.deepEqual(normalizeLessonVisual({ type: 'none', url: 'SECRET_SENTINEL' }), { type: 'none' })
  assert.deepEqual(normalizeLessonVisual({ ...visual, script: 'SECRET_SENTINEL', url: 'SECRET_SENTINEL' }), visual)
  for (const bad of [{ type: 'svg', data: '<svg/>' }, { ...visual, data: Array(7).fill(visual.data[0]) }, { ...visual, data: [null] }, { ...visual, purpose: '' }]) assert.equal(normalizeLessonVisual(bad), null)
  mockModel(t, { ...lesson, visual: { type: 'svg', data: '<svg/>' } })
  const res = await call(request)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.visual, undefined)
})

test('local resume round trips the path and visual without new persistence or a fixed curriculum; old saves remain readable', () => {
  const path = acceptPathLesson({ ...lesson, nextLessons: [next] }, undefined, undefined, learningPathContextKey(course))
  path.understood = true
  const state = { courses: [course], activeId: 'one', recommendation: null, threads: [{ id: 'one', courseName: course.name,
    createdAt: `${localDate()}T12:00:00Z`, resume: { lesson: { ...lesson, visual }, learningPath: { ...path, token: 'SECRET_SENTINEL' } } }] }
  let raw
  const storage = { setItem(key, value) { raw = value }, getItem() { return raw } }
  assert.equal(saveLearnerMemory(state, storage), true)
  const restored = loadLearnerMemory(storage)
  assert.deepEqual(restored.threads[0].resume.learningPath, path)
  assert.deepEqual(restored.threads[0].resume.lesson.visual, visual)
  assert.deepEqual(restored.courses[0].mastery, course.mastery)
  assert.doesNotMatch(raw, /SECRET_SENTINEL/)
  const legacy = createLearnerSnapshot(state)
  delete legacy.threads[0].resume.learningPath
  raw = JSON.stringify(legacy)
  assert.deepEqual(loadLearnerMemory(storage).threads[0].resume.learningPath, normalizeLearningPath())
  assert.deepEqual(compactThreadResume({ lesson }).lesson, lesson)
})
