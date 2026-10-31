import assert from 'node:assert/strict'
import { test } from 'node:test'
import question from '../api/generate-study-question.js'
import evaluate from '../api/evaluate-study-answer.js'
import recommend from '../api/recommend-course.js'
import analyze from '../api/analyze-course.js'

for (const [name, handler, body] of [
  ['question', question, { courseName: 'Physics' }],
  ['evaluation', evaluate, { courseName: 'Physics' }],
  ['recommendation', recommend, { courses: [{ name: 'Physics' }] }],
  ['document analysis', analyze, { fileName: 'test.pdf', fileData: 'synthetic-test-data' }],
]) {
  test(`${name} keeps provider failures and exceptions out of responses and logs`, async (t) => {
    const logs = t.mock.method(console, 'error', () => {})
    for (const failsWithException of [false, true]) {
      const mock = t.mock.method(globalThis, 'fetch', async () => {
        if (failsWithException) throw new Error('PRIVATE_PAYLOAD_SENTINEL')
        return { ok: false, status: 429, json: async () => ({ error: 'PRIVATE_PAYLOAD_SENTINEL', request: body }) }
      })
      const res = { status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
      await handler({ method: 'POST', body }, res)
      assert.equal(res.code, failsWithException ? 500 : 429)
      assert.deepEqual(Object.keys(res.body), ['error'])
      assert.match(res.body.error, /^Failed to /)
      assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE_|synthetic-test-data/)
      assert.equal(logs.mock.callCount(), 0)
      mock.mock.restore()
    }
  })
}
