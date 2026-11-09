import assert from 'node:assert/strict'
import { test } from 'node:test'
import process from 'node:process'
import { readdir, readFile } from 'node:fs/promises'
import { PORTFOLIO_RESPONSE } from '../src/services/portfolioMode.js'
import { demoRequest, demoResponse } from './fixtures/demoStore.js'

const lesson = { topic: 'State', concept: 'Remembering', content: 'State remembers values between renders.' }
const visual = { type: 'generated_image', purpose: 'Follow updates.', data: [{ label: 'State', detail: 'Remembers a value.' }] }
const context = { courseName: 'React', lesson, visual }
const activity = { title: 'Predict', instruction: 'Predict the next count.', topic: 'State', activityType: 'predict', successCriteria: 'Recognizes the update.' }
const reply = { response: 'State remembers the value.', signal: 'neutral' }
const routes = [
  ['generate-study-lesson', { courseName: 'React' }, lesson],
  ['generate-study-question', context, { topic: 'State', question: 'What remembers?', answers: [] }],
  ['evaluate-study-answer', { courseName: 'React', question: 'What remembers?', selectedAnswer: 'Screen', correctAnswer: 'State' }, { feedback: 'State remembers.' }],
  ['respond-to-study-message', { ...context, message: 'Why?' }, reply],
  ['study-activity', { ...context, action: 'generate' }, activity],
  ['analyze-course', { fileName: 'course.pdf', fileData: 'data:application/pdf;base64,JVBERi1maXh0dXJl' }, { courseName: 'React' }],
  ['recommend-course', { courses: [{ name: 'React' }] }, { courseName: 'React' }],
  ['generate-lesson-image', context, { data: [{ url: 'https://images.example.test/image.webp' }] }],
]
const handlers = new Map(await Promise.all(routes.map(async ([name]) => [name, (await import(`../api/${name}.js`)).default])))
function mode(t, value) {
  const prior = process.env.ORBIT_PORTFOLIO_MODE
  if (value === undefined) delete process.env.ORBIT_PORTFOLIO_MODE
  else process.env.ORBIT_PORTFOLIO_MODE = value
  t.after(() => { if (prior === undefined) delete process.env.ORBIT_PORTFOLIO_MODE; else process.env.ORBIT_PORTFOLIO_MODE = prior })
}
function assertPortfolio(res) {
  assert.equal(res.code, 200)
  assert.deepEqual(res.body, PORTFOLIO_RESPONSE)
  assert.equal(res.headers['cache-control'], 'no-store')
  assert.equal(res.headers['x-orbit-mode'], 'portfolio')
  assert.equal(res.flushed, undefined)
  assert.deepEqual(res.chunks, [], 'Portfolio responses never simulate streaming')
}

test('every public route is covered and checks Portfolio Mode before the provider or rate limiter', async () => {
  const files = (await readdir(new URL('../api/', import.meta.url))).filter(name => name.endsWith('.js')).sort()
  assert.deepEqual(files, routes.map(([name]) => `${name}.js`).sort())
  for (const name of files) {
    const source = await readFile(new URL(`../api/${name}`, import.meta.url), 'utf8')
    assert.ok(source.indexOf('if (respondInPortfolioMode(res)) return') < source.indexOf('await fetch('), name)
    assert.ok(source.indexOf('if (respondInPortfolioMode(res)) return') < source.indexOf('await enforceDemoRateLimit('), name)
  }
})

for (const [name, body, result] of routes) {
  test(`${name}: direct requests, retries and client overrides cannot bypass Portfolio Mode`, async t => {
    mode(t, 'true')
    const request = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected outbound request') })
    for (const input of [body, body, {}, undefined, { ...body, mode: 'live', portfolioMode: false, ORBIT_PORTFOLIO_MODE: 'false', stream: true }]) {
      const res = demoResponse(), req = demoRequest(input)
      req.query = { ORBIT_PORTFOLIO_MODE: 'false' }
      req.headers['x-orbit-mode'] = 'live'
      await handlers.get(name)(req, res)
      assertPortfolio(res)
    }
    assert.equal(request.mock.callCount(), 0, 'Neither Meta nor the rate-limit store is contacted')
    const res = demoResponse()
    await handlers.get(name)({ method: 'GET' }, res)
    assert.equal(res.code, 405)
  })

  for (const setting of [undefined, 'false']) test(`${name}: mode ${setting ?? 'unset'} preserves the live provider path and response`, async t => {
    mode(t, setting)
    const request = t.mock.method(globalThis, 'fetch', async url => {
      assert.ok(url.startsWith('https://api.meta.ai/'))
      return new Response(JSON.stringify(name === 'generate-lesson-image' ? result : {
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }],
      }))
    })
    const res = demoResponse()
    await handlers.get(name)(demoRequest({ ...body, ORBIT_PORTFOLIO_MODE: 'true', mode: 'portfolio' }), res)
    assert.equal(request.mock.callCount(), 1)
    assert.equal(res.code, 200)
    assert.equal(res.headers['x-orbit-mode'], undefined)
    assert.equal(res.body.mode, undefined)
    assert.ok(Object.keys(res.body).length)
  })
}

test('all lesson actions, activity evaluation, file references and streaming stop before reading input or credentials', async t => {
  mode(t, ' TRUE ')
  const request = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected outbound request') })
  const oldKey = process.env.MODEL_API_KEY
  delete process.env.MODEL_API_KEY
  t.after(() => { process.env.MODEL_API_KEY = oldKey })
  for (const [name, actions] of [['generate-study-lesson', ['lesson', 'next', 'simplify', 'example']], ['study-activity', ['generate', 'evaluate']], ['respond-to-study-message', ['stream']]]) {
    for (const action of actions) {
      const req = demoRequest({ ...context, action, stream: true, lessonReferences: [{ data: 'not-a-real-file' }] })
      const res = demoResponse()
      await handlers.get(name)(req, res)
      assertPortfolio(res)
    }
  }
  for (const handler of handlers.values()) {
    const req = { method: 'POST', get body() { throw new Error('Portfolio Mode must not inspect or process files/payloads') } }
    const res = demoResponse()
    await handler(req, res)
    assertPortfolio(res)
  }
  assert.equal(request.mock.callCount(), 0)
})

test('disabled mode preserves genuine streaming, with the same delta and completion contract', async t => {
  mode(t, 'false')
  const payload = JSON.stringify(reply)
  const events = [
    { type: 'response.output_text.delta', item_id: 'message', output_index: 0, content_index: 0, delta: payload },
    { type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: payload }] }] } },
  ]
  const request = t.mock.method(globalThis, 'fetch', async () => new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } }))
  const res = demoResponse()
  await handlers.get('respond-to-study-message')(demoRequest({ ...context, message: 'Why?', stream: true }), res)
  assert.equal(request.mock.callCount(), 1)
  assert.equal(res.headers['content-type'], 'application/x-ndjson; charset=utf-8')
  assert.ok(res.chunks.some(chunk => chunk.type === 'delta'))
  assert.equal(res.chunks.at(-1).type, 'complete')
  assert.equal(res.chunks.at(-1).response, reply.response)
})
