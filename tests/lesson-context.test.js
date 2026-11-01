import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeLessonContext, studyLessonContext } from '../src/services/lessonContext.js'
import { compactThreadResume, createLearnerSnapshot, loadLearnerMemory } from '../src/services/learnerMemory.js'
import { createStudyThread } from '../src/services/studyThreads.js'
import { generateStudyLesson } from '../src/services/meta.js'
import handler from '../api/generate-study-lesson.js'

const today = '2026-11-01'
const goal = 'Focus on Photosynthesis to prepare for the Nov 4 Photosynthesis Reading Check and Nov 5 Photosynthesis Quiz: review inputs, outputs, stored energy, common misconceptions, and limiting factors.'
const course = {
  name: 'Biology 101', nextTask: goal, importantTopics: ['Photosynthesis'],
  syllabusItems: [{ topic: 'Photosynthesis', startDate: '2026-11-01', endDate: '2026-11-07' }],
  upcomingWork: [
    { title: 'Photosynthesis Quiz', topic: 'Photosynthesis', date: '2026-11-05' },
    { title: 'Photosynthesis Reading Check', topic: 'Photosynthesis', date: '2026-11-04' },
  ],
}
const lesson = { topic: 'Photosynthesis', concept: 'Inputs, outputs, and stored energy', content: 'Plants use light to turn water and carbon dioxide into sugar, storing energy. Oxygen is released.' }
const lessonContext = { lessonTitle: 'Photosynthesis', reasonForLesson: 'Connect the ingredients to the energy stored in sugar.', focusAreas: ['Inputs and outputs', 'Stored energy'] }

test('long syllabus goals never become the pending or legacy lesson title, and both upcoming assignments stay ordered', () => {
  const before = structuredClone(course)
  for (const current of [null, lesson, { ...lesson, lessonContext: { lessonTitle: goal } }]) {
    const view = studyLessonContext(course, current, today)
    assert.equal(view.lessonTitle, 'Photosynthesis')
    assert.deepEqual(view.upcomingAssignments, [...course.upcomingWork].reverse().map(({ title, date }) => ({ title, date })))
    assert.ok(!Object.values(view).includes(goal))
  }
  assert.deepEqual(course, before)
  assert.equal(studyLessonContext({ name: 'Biology 101', nextTask: goal }, null, today).lessonTitle, 'Biology 101')
  assert.equal(createStudyThread(course, '', 'pending', new Date('2026-11-01T12:00:00Z')).title, 'Photosynthesis')
})

test('lesson metadata bounds individual fields and only projects display fields', () => {
  assert.deepEqual(normalizeLessonContext({ ...lessonContext, secret: 'excluded', upcomingAssignments: course.upcomingWork }), lessonContext)
  assert.deepEqual(normalizeLessonContext({ lessonTitle: goal, reasonForLesson: 'x'.repeat(161), focusAreas: ['Inputs', null, 'x'.repeat(49), 'Inputs', 'Fifth'] }),
    { lessonTitle: '', reasonForLesson: '', focusAreas: ['Inputs'] })
  for (const invalid of [null, 'title', {}, { lessonTitle: goal, focusAreas: {} }]) assert.equal(normalizeLessonContext(invalid), null)
  const view = studyLessonContext(course, { ...lesson, lessonContext }, today)
  assert.equal(view.reasonForLesson, lessonContext.reasonForLesson)
  assert.deepEqual(view.focusAreas, lessonContext.focusAreas)
})

test('no deadline is invented, and saved lessons retain their topic when course position changes', () => {
  const noDates = studyLessonContext({ name: 'Botany' }, lesson, today)
  assert.equal(noDates.lessonTitle, lesson.topic)
  assert.equal(noDates.reasonForLesson, '')
  assert.deepEqual(noDates.upcomingAssignments, [])
  assert.deepEqual(noDates.focusAreas, [lesson.concept])
  const moved = { ...course, learnerPosition: { currentTopic: 'Respiration' } }
  assert.equal(studyLessonContext(moved, lesson, today).lessonTitle, 'Photosynthesis')
  assert.equal(studyLessonContext(moved, null, today).lessonTitle, 'Respiration')
  assert.deepEqual(studyLessonContext(moved, null, today).upcomingAssignments, [])
})

test('assignment context excludes past, ambiguous, unrelated and duplicate work, without model-invented dates', () => {
  const work = { ...course, upcomingWork: [...course.upcomingWork, ...course.upcomingWork,
    { title: 'Photosynthesis extra', topic: 'Respiration', date: '2026-11-02' },
    { title: 'Photosynthesis past', date: '2026-10-31' },
    { title: 'Photosynthesis ambiguous', date: 'Friday' },
    { title: 'Unrelated quiz', date: '2026-11-03' },
    { title: 'Photosynthesis review', date: '2026-11-03' },
  ] }
  const view = studyLessonContext(work, { ...lesson, lessonContext: { ...lessonContext, upcomingAssignments: [{ title: 'Invented', date: '2026-11-02' }] } }, today)
  assert.deepEqual(view.upcomingAssignments.map(item => item.date), ['2026-11-03', '2026-11-04', '2026-11-05'])
  assert.deepEqual(studyLessonContext(work, lesson, '2026-11-06').upcomingAssignments, [])
})

test('bounded context survives the existing local snapshot; older lessons need no migration', () => {
  const thread = createStudyThread(course, '', 'test', new Date('2026-11-01T12:00:00Z'))
  thread.resume = { lesson: { ...lesson, lessonContext: { ...lessonContext, arbitrary: 'excluded' } } }
  const snapshot = createLearnerSnapshot({ courses: [course], threads: [thread], activeId: 'test' })
  const restored = loadLearnerMemory({ getItem: () => JSON.stringify(snapshot) })
  assert.deepEqual(restored.threads[0].resume.lesson.lessonContext, lessonContext)
  assert.deepEqual(compactThreadResume({ lesson }).lesson, lesson)
  assert.equal(JSON.stringify(snapshot).includes('arbitrary'), false)
})

async function call(body) {
  const res = { status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } }
  await handler({ method: 'POST', body }, res)
  return res
}

test('lesson API requests structured display context while retaining the full goal, deadlines and exact topic key', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    request = JSON.parse(options.body)
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...lesson, lessonContext }) }] }] }) }
  })
  const res = await call({ courseName: course.name, nextTask: goal, upcomingWork: course.upcomingWork, syllabusItems: course.syllabusItems, currentDate: today })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { ...lesson, lessonContext })
  assert.ok(request.input.includes(goal))
  assert.ok(request.input.includes(JSON.stringify(course.upcomingWork)))
  assert.match(request.input, /lessonTitle.*60 characters and 8 words/)
  assert.match(request.input, /focusAreas.*one to four/)
  assert.match(request.input, /Use this exact topic label: "Photosynthesis"/)
})

test('invalid optional display metadata cannot discard valid teaching; simplification retains the original context', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...lesson, lessonContext: { lessonTitle: goal } }) }] }] }) }))
  const base = { courseName: course.name, currentDate: today }
  assert.deepEqual((await call(base)).body, lesson)
  assert.deepEqual((await call({ ...base, action: 'simplify', lesson: { ...lesson, lessonContext } })).body.lessonContext, lessonContext)
})

test('client lesson request keeps all planning context and returns structured display metadata', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const request = JSON.parse(options.body)
    assert.equal(request.nextTask, goal)
    assert.deepEqual(request.upcomingWork, course.upcomingWork)
    return { ok: true, json: async () => ({ ...lesson, lessonContext }) }
  })
  assert.deepEqual(await generateStudyLesson(course, 40), { ...lesson, lessonContext })
})
