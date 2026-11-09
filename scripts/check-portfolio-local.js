import assert from 'node:assert/strict'
import process from 'node:process'
import { readdir } from 'node:fs/promises'
import { PORTFOLIO_RESPONSE } from '../src/services/portfolioMode.js'

const origin = new URL(process.argv[2] || 'http://localhost:5173')
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) ||
    origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Use a local HTTP origin, for example http://localhost:5173')
}

async function check(route, body, label = route) {
  const response = await fetch(new URL(`/api/${route}`, origin), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: body.stream ? 'application/x-ndjson' : 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  })
  // Inspect the mode before accepting any response as teaching. The first
  // probe is invalid in live mode, so a stale server cannot spend AI credits.
  assert.equal(response.status, 200, `${label}: Portfolio Mode is not active; restart with npm run dev:portfolio`)
  assert.equal(response.headers.get('x-orbit-mode'), 'portfolio', `${label}: missing Portfolio Mode header`)
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), PORTFOLIO_RESPONSE)
  process.stdout.write(`PASS ${label}: immediate portfolio JSON\n`)
}

await check('generate-study-lesson', {}, 'mode probe (no valid AI input)')
const lesson = { topic: 'State', concept: 'Remembering', content: 'State remembers a value.' }
const activity = { title: 'Predict', instruction: 'Predict the next count.', topic: 'State', activityType: 'predict', successCriteria: 'Recognizes the update.' }
const common = { courseName: 'React', lesson, message: 'Why?', ORBIT_PORTFOLIO_MODE: 'false', mode: 'live',
  lessonReferences: [{ name: 'test.pdf', data: 'data:application/pdf;base64,JVBERi1maXh0dXJl' }] }
const cases = [
  ...['lesson', 'next', 'simplify', 'example'].map(action => ['generate-study-lesson', { ...common, action }, `lesson ${action}`]),
  ['generate-study-question', common],
  ['evaluate-study-answer', { ...common, question: 'What remembers?', selectedAnswer: 'Screen', correctAnswer: 'State' }],
  ['respond-to-study-message', common, 'conversation non-streaming'],
  ['respond-to-study-message', { ...common, stream: true }, 'conversation streaming'],
  ['study-activity', { ...common, action: 'generate' }, 'activity generation'],
  ['study-activity', { ...common, action: 'evaluate', activity, learnerResponse: 'It increases.' }, 'activity evaluation'],
  ...['resource', 'syllabus'].map(materialKind => ['analyze-course', {
    fileName: 'test.pdf', fileType: 'application/pdf', fileData: 'data:application/pdf;base64,JVBERi1maXh0dXJl', materialKind,
  }, `PDF ${materialKind}`]),
  ['recommend-course', { courses: [{ name: 'React' }] }],
  ['generate-lesson-image', { ...common, visual: { type: 'generated_image', purpose: 'Follow updates.', data: [{ label: 'State', detail: 'Keeps a value.' }] } }],
]
const routes = (await readdir(new URL('../api/', import.meta.url))).filter(name => name.endsWith('.js')).sort()
assert.deepEqual(routes, [...new Set(cases.map(([route]) => `${route}.js`))].sort(), 'Keep this smoke check aligned with every public AI route')
for (const [route, body, label] of cases) await check(route, body, label)
await check('respond-to-study-message', { ...common, stream: true }, 'streaming retry')
process.stdout.write('All eight local AI endpoints returned the guarded Portfolio Mode response.\n')
