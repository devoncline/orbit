import assert from 'node:assert/strict'
import { test } from 'node:test'
import { courseLaunchRecommendations, inferCoursePosition, mergeCourseAnalysis } from '../src/services/coursePosition.js'
import { collectUpcomingWork, parseWorkDate } from '../src/services/upcomingWork.js'
import { isSupportedMaterial, materialMetadata, normalizeCourseMaterials, sameMaterial } from '../src/services/courseMaterials.js'
import { createLearnerSnapshot, emptyLearnerMemory, loadLearnerMemory } from '../src/services/learnerMemory.js'
import analysisHandler from '../api/analyze-course.js'
import { biologyCourse, biologyAnalysis, launchDate } from './fixtures/courseLaunch.js'

test('a future syllabus unit can be recommended for assessment preparation without claiming current class coverage', () => {
  const before = structuredClone(biologyCourse)
  assert.equal(inferCoursePosition(biologyCourse, launchDate).needsConfirmation, true)
  const result = courseLaunchRecommendations(biologyCourse, launchDate)
  assert.equal(result.primary.topic, 'Photosynthesis')
  assert.equal(result.primary.upcomingWork.title, 'Photosynthesis Quiz')
  assert.equal(result.primary.upcomingWork.date, '2026-11-05')
  assert.deepEqual(result.alternatives, ['Cellular Respiration', 'Genetics'])
  const withOldUnit = { ...biologyCourse, syllabusItems: [{ topic: 'Orientation', startDate: '2026-08' }, ...biologyCourse.syllabusItems] }
  assert.deepEqual(courseLaunchRecommendations(withOldUnit, launchDate).alternatives.slice(0, 2), ['Cellular Respiration', 'Genetics'])
  assert.deepEqual(biologyCourse, before)
})

test('recommendations use other subjects, title-only legacy assignments and the runtime date', () => {
  const course = { name: 'Math', importantTopics: ['Linear equations', 'Quadratics'], upcomingWork: [
    { title: 'Linear equations quiz', date: '2026-11-04' }, { title: 'Quadratics test', date: '2026-11-08' },
  ] }
  assert.equal(courseLaunchRecommendations(course, launchDate).primary.topic, 'Linear equations')
  assert.equal(courseLaunchRecommendations(course, '2026-11-05').primary.topic, 'Quadratics')
  assert.equal(courseLaunchRecommendations({ name: 'Biology 101', files: [] }, launchDate).primary, null)
  assert.equal(courseLaunchRecommendations({ name: 'Biology 101', files: [{ name: 'unhelpful.pdf' }] }, launchDate).primary, null)
})

test('explicit corrections and exclusions win; mastery informs choices without fabricated deadlines', () => {
  const corrected = { ...biologyCourse, learnerPosition: { currentTopic: 'Genetics', exclusions: [{ topic: 'Photosynthesis', type: 'notYet' }] } }
  const result = courseLaunchRecommendations(corrected, launchDate)
  assert.equal(result.primary.topic, 'Genetics')
  assert.equal(result.primary.upcomingWork, null)
  assert.ok(!result.alternatives.includes('Photosynthesis'))
  const weak = courseLaunchRecommendations({ name: 'Physics', importantTopics: ['Gravity', 'Orbits'], mastery: { topics: { Orbits: 20, Gravity: 90 } } }, launchDate)
  assert.equal(weak.primary.topic, 'Orbits')
  assert.equal(weak.primary.upcomingWork, null)
  assert.ok(courseLaunchRecommendations({ importantTopics: ['One', 'Two', 'Three', 'Four', 'Five', 'One'] }, launchDate).alternatives.length <= 3)
})

test('repeated and partial material analyses preserve known syllabus fields and do not duplicate deadlines', () => {
  const notes = { syllabusItems: [{ topic: 'Photosynthesis', unit: 'Unit 3', startDate: '', endDate: '' }], upcomingWork: [
    { title: 'Photosynthesis Quiz', type: 'assessment', topic: '', date: '2026-11-05' },
  ] }
  let course = { ...biologyCourse, ...mergeCourseAnalysis(biologyCourse, notes) }
  course = { ...course, ...mergeCourseAnalysis(course, biologyAnalysis) }
  course = { ...course, ...mergeCourseAnalysis(course, biologyAnalysis) }
  assert.equal(course.syllabusItems[0].startDate, '2026-11-02')
  assert.equal(course.syllabusItems[0].endDate, '2026-11-06')
  assert.equal(course.upcomingWork.length, 3)
  assert.equal(course.upcomingWork[1].topic, 'Photosynthesis')
  assert.equal(collectUpcomingWork([course], parseWorkDate(launchDate)).upcoming.length, 3)
})

test('materials retain metadata only, deduplicate identical files, and allow a revised document', () => {
  const file = { name: 'notes.pdf', type: 'application/pdf', size: 12, lastModified: 100, fileData: 'BINARY', token: 'SECRET' }
  const first = materialMetadata(file, '2026-11-01T12:00:00Z')
  const revised = { ...file, lastModified: 200 }
  const files = normalizeCourseMaterials([first, file, revised])
  assert.equal(files.length, 2)
  assert.equal(sameMaterial(first, { ...file, lastModified: undefined }), true, 'Older records have no modification date')
  const snapshot = createLearnerSnapshot({ ...emptyLearnerMemory(), courses: [{ ...biologyCourse, files }] })
  const restored = loadLearnerMemory({ getItem: () => JSON.stringify(snapshot) })
  assert.deepEqual(restored.courses[0].files, files)
  assert.doesNotMatch(JSON.stringify(snapshot), /BINARY|SECRET|fileData/)
})

test('attachments accept images while the server rejects unsupported analysis before model calls', async (t) => {
  assert.equal(isSupportedMaterial({ name: 'notes.PDF', type: '' }), true)
  for (const file of [{ name: 'board.png', type: 'image/png' }, { name: 'file.pdf', type: 'image/png' }]) {
    assert.equal(isSupportedMaterial(file), file.name === 'board.png')
    t.mock.method(globalThis, 'fetch', () => assert.fail('Unsupported files must not reach the model'))
    const res = { status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
    await analysisHandler({ method: 'POST', body: { fileName: file.name, fileType: file.type, fileData: 'fake' } }, res)
    assert.equal(res.code, 400)
  }
})
