import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyPositionOverride, coursePositionRequest, inferCoursePosition, localDate, mergeCourseAnalysis, positionAction, readPositionStatement } from '../src/services/coursePosition.js'
import lessonHandler from '../api/generate-study-lesson.js'
import recommendationHandler from '../api/recommend-course.js'
import analysisHandler from '../api/analyze-course.js'
import { generateStudyLesson, recommendCourse } from '../src/services/meta.js'

const course = {
  name: 'Web development', nextTask: 'Start orientation',
  importantTopics: ['Orientation', 'JavaScript', 'React', 'Backend'],
  syllabusItems: [
    { topic: 'Orientation', startDate: '2026-08', unit: 'Module 1' },
    { topic: 'JavaScript', startDate: '2026-09', unit: 'Module 2' },
    { topic: 'React', startDate: '2026-10', unit: 'Module 3' },
    { topic: 'Backend', startDate: '2026-11', unit: 'Module 4' },
  ],
  upcomingWork: [{ title: 'React props assignment', topic: 'React', date: '2026-10-30' }, { title: 'JavaScript quiz', date: '2026-09-20' }],
  mastery: { overall: 40, topics: { Orientation: 10, React: 40 } },
}

async function call(handler, body) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } }
  await handler({ method: 'POST', body }, res)
  return res
}
function model(t, value) {
  return t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) }))
}

test('without learner evidence late October chooses the current unit ahead of generic orientation ordering', () => {
  const before = structuredClone(course)
  const position = inferCoursePosition({ ...course, mastery: {} }, '2026-10-27')
  assert.equal(position.currentTopic, 'React')
  assert.equal(position.currentUnit, 'Module 3')
  assert.deepEqual(position.timeline.map((item) => item.period), ['past', 'past', 'current', 'future'])
  assert.equal(position.nextTopic, 'Backend')
  assert.equal(position.recent[0].title, 'JavaScript quiz')
  assert.equal(position.upcoming.length, 1)
  assert.equal(positionAction(course, position), 'Explore React')
  assert.deepEqual(course, before)
})

test('course position changes at local month boundaries, including leap-year February', () => {
  assert.equal(inferCoursePosition({ ...course, mastery: {} }, '2026-09-30').currentTopic, 'JavaScript')
  assert.equal(inferCoursePosition({ ...course, mastery: {} }, '2026-10-01').currentTopic, 'React')
  assert.equal(inferCoursePosition({ ...course, mastery: {} }, '2026-11-01').currentTopic, 'Backend')
  const leap = { syllabusItems: [{ topic: 'Cells', startDate: '2028-02' }] }
  assert.equal(inferCoursePosition(leap, '2028-02-29').timeline[0].period, 'current')
  assert.equal(inferCoursePosition(leap, '2028-03-01').timeline[0].period, 'past')
})

test('dated starts use the next dated unit without inventing dates for undated weeks', () => {
  const position = inferCoursePosition({ syllabusItems: [
    { topic: 'React', startDate: '2026-10-10' },
    { topic: 'Hooks', dateText: 'Week 7' },
    { topic: 'Backend', startDate: '2026-11-01', endDate: '2026-11-15' },
  ] }, '2026-10-27')
  assert.deepEqual(position.timeline.map((item) => item.period), ['current', 'uncertain', 'future'])
})

test('ambiguous, yearless, impossible, and reversed dates ask for a starting point', () => {
  const uncertain = { name: 'React', nextTask: 'Orientation', syllabusItems: [
    { topic: 'Orientation', startDate: 'October', dateText: 'October' },
    { topic: 'Props', startDate: '2026-02-29' },
    { topic: 'State', startDate: '2026-10-30', endDate: '2026-10-01' },
    { topic: 'Hooks', dateText: 'Week 5' },
    { topic: 'Effects', startDate: '2026-10-27invalid' },
  ] }
  const result = inferCoursePosition(uncertain, '2026-10-27')
  assert.ok(result.timeline.every((item) => item.period === 'uncertain'))
  assert.equal(result.needsConfirmation, true)
  assert.equal(result.currentTopic, '')
  assert.equal(positionAction(uncertain, result), 'Choose a starting point')
})

test('upcoming work and weak past material are useful fallbacks without discarding history', () => {
  const noCurrent = { ...course, syllabusItems: course.syllabusItems.filter((item) => item.topic !== 'React') }
  assert.equal(inferCoursePosition({ ...noCurrent, mastery: {} }, '2026-10-27').source, 'upcoming')
  const weak = inferCoursePosition({ ...noCurrent, upcomingWork: [] }, '2026-10-27')
  assert.equal(weak.source, 'mastery')
  assert.equal(weak.currentTopic, 'Orientation')
  assert.equal(weak.timeline.filter((item) => item.period === 'past').length, 2)
  const noEvidence = inferCoursePosition({ ...noCurrent, upcomingWork: [], mastery: {} }, '2026-10-27')
  assert.equal(noEvidence.currentTopic, '')
  assert.equal(noEvidence.needsConfirmation, true)
})

test('explicit learner statements override dates and preserve skip/not-yet constraints', () => {
  let learnerPosition = applyPositionOverride(null, readPositionStatement('Skip orientation'))
  learnerPosition = applyPositionOverride(learnerPosition, readPositionStatement("We haven't started React yet"))
  const beforeCurrent = inferCoursePosition({ ...course, learnerPosition }, '2026-10-27')
  assert.notEqual(beforeCurrent.currentTopic, 'React')
  assert.notEqual(beforeCurrent.currentTopic, 'Orientation')
  assert.equal(beforeCurrent.needsConfirmation, true)
  const weakSubtopic = inferCoursePosition({ ...course, learnerPosition, mastery: { topics: { Props: 20 } } }, '2026-10-27')
  assert.equal(weakSubtopic.currentTopic, '')
  assert.equal(weakSubtopic.needsConfirmation, true)
  learnerPosition = applyPositionOverride(learnerPosition, readPositionStatement("We're on props now"))
  const position = inferCoursePosition({ ...course, learnerPosition }, '2026-10-27')
  assert.equal(position.currentTopic, 'props')
  assert.equal(position.source, 'learner')
  assert.ok(position.learner.exclusions.some((item) => item.topic === 'orientation'))
  assert.deepEqual(readPositionStatement('I already know this', 'Props'), { type: 'skip', topic: 'Props', statement: 'I already know this' })
  for (const message of ['Why do props move one way?', 'I am confused about props', 'Can we skip orientation?', 'What if we are on React?']) assert.equal(readPositionStatement(message, 'Props'), null)
})

test('learner may request earlier material and later correct a not-yet restriction', () => {
  const excluded = applyPositionOverride(null, { type: 'notYet', topic: 'React' })
  const learnerPosition = applyPositionOverride(excluded, { type: 'current', topic: 'React props' })
  assert.equal(learnerPosition.exclusions.length, 0)
  const review = inferCoursePosition({ ...course, learnerPosition: applyPositionOverride(null, { type: 'current', topic: 'Orientation' }) }, '2026-10-27')
  assert.equal(review.currentTopic, 'Orientation')
})

test('runtime date is local, optional request fields are bounded, and missing dates use today', async (t) => {
  const now = new Date()
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  assert.equal(localDate(now), expected)
  assert.equal(inferCoursePosition(course).today, expected)
  assert.equal(inferCoursePosition(course, 'invalid').today, expected)
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({}) }))
  await generateStudyLesson(course, 40)
  await recommendCourse([course])
  for (const call of mock.mock.calls) assert.equal(JSON.parse(call.arguments[1].body).currentDate, expected)
  const request = coursePositionRequest({ syllabusItems: Array.from({ length: 130 }, () => ({ topic: 'x'.repeat(500) })) })
  assert.equal(request.syllabusItems.length, 100)
  assert.equal(request.syllabusItems[0].topic.length, 120)
})

test('lesson generation rejects stale orientation, accepts the dated topic, and honors explicit correction', async (t) => {
  const request = { ...course, courseName: course.name, ...coursePositionRequest(course, '2026-10-27'), topicMastery: {} }
  let mock = model(t, { topic: 'Orientation', concept: 'Welcome', content: 'Here is the course.' })
  assert.equal((await call(lessonHandler, request)).statusCode, 502)
  const prompt = JSON.parse(mock.mock.calls[0].arguments[1].body).input
  assert.match(prompt, /2026-10-27/)
  assert.match(prompt, /Use this exact topic label: "React"/)
  mock.mock.restore()
  mock = model(t, { topic: 'React', concept: 'Props', content: 'Props carry data from parent to child.' })
  assert.equal((await call(lessonHandler, request)).statusCode, 200)
  mock.mock.restore()
  model(t, { topic: 'JavaScript', concept: 'Functions', content: 'A function packages reusable steps.' })
  const learnerPosition = applyPositionOverride(null, { type: 'current', topic: 'JavaScript' })
  assert.equal((await call(lessonHandler, { ...request, learnerPosition })).statusCode, 200)
})

test('uncertain timelines do not launch an arbitrary lesson until the learner chooses', async (t) => {
  const mock = model(t, {})
  const res = await call(lessonHandler, { courseName: 'Web development', syllabusItems: [{ topic: 'Orientation', dateText: 'Week 1' }] })
  assert.equal(res.statusCode, 422)
  assert.equal(mock.mock.callCount(), 0)
})

test('recommendation receives current date, classified timeline, mastery, and explicit override', async (t) => {
  const mock = model(t, { courseName: course.name, reason: 'Practice props.', recommendedAction: 'Explore props' })
  const learnerPosition = applyPositionOverride(null, { type: 'current', topic: 'Props' })
  const res = await call(recommendationHandler, { courses: [{ ...course, learnerPosition }], currentDate: '2026-10-27' })
  assert.equal(res.statusCode, 200)
  const prompt = JSON.parse(mock.mock.calls[0].arguments[1].body).input
  for (const value of ['2026-10-27', '"currentTopic":"Props"', '"period":"past"', '"period":"future"', '"Orientation":10']) assert.ok(prompt.includes(value))
})

test('syllabus analysis preserves the complete teaching timeline and avoids invented years', async (t) => {
  const mock = model(t, { courseName: course.name, syllabusItems: course.syllabusItems, upcomingWork: course.upcomingWork })
  const res = await call(analysisHandler, { fileName: 'syllabus.pdf', fileData: 'test fixture', currentDate: '2026-10-27' })
  assert.equal(res.body.syllabusItems.length, 4)
  assert.equal(res.body.upcomingWork.length, 2)
  const prompt = JSON.parse(mock.mock.calls[0].arguments[1].body).input[0].content[1].text
  assert.match(prompt, /never from today's date/)
  assert.match(prompt, /including past, current and future/)
})

test('adding notes preserves the syllabus and past work while updated analysis replaces matching items', () => {
  const before = structuredClone(course)
  const retained = mergeCourseAnalysis(course, { importantTopics: ['Props'], syllabusItems: [], upcomingWork: [] })
  assert.equal(retained.syllabusItems.length, 4)
  assert.equal(retained.upcomingWork.length, 2)
  assert.ok(retained.importantTopics.includes('Props'))
  const updated = mergeCourseAnalysis(retained, { syllabusItems: [{ ...course.syllabusItems[2], endDate: '2026-10-31' }], upcomingWork: [{ ...course.upcomingWork[0], date: '2026-10-31' }] })
  assert.equal(updated.syllabusItems.length, 4)
  assert.equal(updated.syllabusItems[2].endDate, '2026-10-31')
  assert.equal(updated.upcomingWork.length, 2)
  assert.equal(updated.upcomingWork[0].date, '2026-10-31')
  assert.deepEqual(course, before)
})

test('initial lessons cannot return a topic the learner explicitly skipped', async (t) => {
  model(t, { topic: 'Orientation', concept: 'Welcome', content: 'Here is the course.' })
  const learnerPosition = applyPositionOverride(null, { type: 'skip', topic: 'Orientation' })
  const res = await call(lessonHandler, { courseName: 'Web development', learnerPosition })
  assert.equal(res.statusCode, 502)
})
