import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../api/analyze-course.js'
import lessonHandler from '../api/generate-study-lesson.js'
import { canAnalyzeMaterial, courseMaterialContext, formatMaterialContext, MATERIAL_ACCEPT, MAX_PDF_BYTES, materialValidationError, normalizeCourseMaterials, removeCourseMaterial } from '../src/services/courseMaterials.js'
import { generateStudyLesson } from '../src/services/meta.js'
import { learningPathContextKey } from '../src/services/learningPath.js'
import { createLearnerSnapshot, emptyLearnerMemory, loadLearnerMemory } from '../src/services/learnerMemory.js'

const pdf = { name: 'notes.pdf', type: 'application/pdf', size: 12 }
const body = { fileName: pdf.name, fileType: pdf.type, fileData: 'data:application/pdf;base64,JVBERi1maXh0dXJl', materialKind: 'resource' }
const model = value => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }))
async function call(request, target = handler) {
  const response = { code: 200, status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
  await target({ method: 'POST', body: request }, response)
  return response
}

test('PDF and image extension/MIME validation covers mobile empty MIME, unsupported types, HEIC and size limits', () => {
  assert.equal(materialValidationError(pdf), '')
  for (const [extension, type] of [['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    const file = { name: `board.${extension}`, type, size: 100 }
    assert.equal(materialValidationError(file), '')
    assert.equal(materialValidationError({ ...file, type: '' }), '')
    assert.equal(canAnalyzeMaterial(file), false)
    assert.ok(MATERIAL_ACCEPT.includes(type))
  }
  for (const file of [{ ...pdf, type: 'image/png' }, { ...pdf, name: 'code.js' }, { ...pdf, size: 0 }, { ...pdf, size: MAX_PDF_BYTES + 1 }]) assert.ok(materialValidationError(file))
  for (const extension of ['heic', 'heif']) assert.match(materialValidationError({ name: `IMG.${extension}`, type: `image/${extension}`, size: 100 }), /Export the photo as JPG/)
})

test('server rejects images, invalid PDF bytes, oversized data and unsupported intent before AI', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Invalid uploads cannot consume AI calls'))
  for (const request of [
    { ...body, fileName: 'board.png', fileType: 'image/png' }, { ...body, fileData: 'data:application/pdf;base64,YmFk' },
    { ...body, fileData: 'data:application/pdf;base64,' + 'A'.repeat(MAX_PDF_BYTES * 2) }, { ...body, materialKind: 'other' },
    { ...body, fileData: {} },
  ]) assert.equal((await call(request)).code, 400)
})

test('resource analysis returns bounded learning context and drops syllabus/deadline fields even if the model supplies them', async t => {
  let prompt
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    prompt = JSON.parse(options.body).input[0].content[1].text
    return model({ summary: 'Diffusion: particles spread from higher to lower concentration.', importantTopics: ['Diffusion'],
      upcomingWork: [{ title: 'Invented due date', date: '2026-11-03' }], syllabusItems: [{ topic: 'Wrong' }], courseName: 'Wrong course' })
  })
  const response = await call(body)
  assert.equal(response.code, 200)
  assert.deepEqual(Object.keys(response.body), ['summary', 'importantTopics'])
  assert.match(prompt, /not as a syllabus/)
  assert.match(prompt, /Do not extract calendar dates/)
})

test('unreadable resource content remains retryable and never claims successful analysis', async t => {
  t.mock.method(globalThis, 'fetch', async () => model({ summary: '', importantTopics: [] }))
  assert.equal((await call(body)).code, 422)
})

test('legacy single PDF and multiple bounded resources survive local memory; removal stops future context use', () => {
  const files = [{ ...pdf }, { ...pdf, name: 'notes2.pdf', kind: 'resource', analyzed: true, summary: 'X'.repeat(3000),
    topics: ['Diffusion'], fileData: 'RAW_BYTES', file: { secret: 'RAW_BYTES' } }, { name: 'board.png', type: 'image/png', size: 30, kind: 'resource', image: 'RAW_BYTES' }]
  const course = { name: 'Biology', files }
  const snapshot = createLearnerSnapshot({ ...emptyLearnerMemory(), courses: [course] })
  const restored = loadLearnerMemory({ getItem: () => JSON.stringify(snapshot) }).courses[0]
  assert.equal(restored.files.length, 3)
  assert.equal(restored.files[1].summary.length, 1600)
  assert.doesNotMatch(JSON.stringify(snapshot), /RAW_BYTES|fileData/)
  assert.deepEqual(restored.files[0], pdf)
  const removed = removeCourseMaterial(restored, restored.files[1])
  assert.deepEqual(courseMaterialContext(removed.files), [])
  assert.notEqual(learningPathContextKey(restored), learningPathContextKey(removed))
  assert.equal(normalizeCourseMaterials(Array.from({ length: 150 }, (_, index) => ({ name: `${index}.pdf` }))).length, 100)
  assert.equal(course.files.length, 3)
})

test('explicit lessons carry analyzed resource content through client and server; unprocessed files and bytes stay out', async t => {
  const course = { name: 'Biology', learnerPosition: { currentTopic: 'Diffusion' }, files: [
    { ...pdf, kind: 'resource', analyzed: true, summary: 'Particles move from high to low concentration.', topics: ['Diffusion'], fileData: 'PRIVATE_BYTES' },
    { name: 'board.png', type: 'image/png', kind: 'resource', summary: 'UNPROCESSED_PHOTO' },
  ] }
  let prompt, request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const payload = JSON.parse(options.body)
    if (url === '/api/generate-study-lesson') {
      request = payload
      const result = await call(payload, lessonHandler)
      return new Response(JSON.stringify(result.body), { status: result.code })
    }
    prompt = payload.input
    return model({ topic: 'Diffusion', concept: 'Concentration', content: 'Particles spread out.', visual: { type: 'none' } })
  })
  await generateStudyLesson(course, 0)
  assert.equal(request.materialContext.length, 1)
  assert.match(prompt, /Particles move from high to low concentration/)
  assert.doesNotMatch(JSON.stringify(request), /PRIVATE_BYTES|UNPROCESSED_PHOTO/)
  assert.equal(formatMaterialContext([{ summary: {}, name: 'x' }]), '')
})
