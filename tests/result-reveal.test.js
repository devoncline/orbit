import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createResultReveal, RESULT_REVEAL_INTERVAL } from '../src/services/resultReveal.js'

function harness(text, options = {}) {
  const updates = [], callbacks = new Map()
  let id = 0, elapsed = 0
  const reveal = createResultReveal({ text, onUpdate: (value) => updates.push(value),
    schedule(fn, delay) { assert.equal(delay, RESULT_REVEAL_INTERVAL); callbacks.set(++id, fn); return id },
    unschedule: (key) => callbacks.delete(key), ...options,
  })
  return { reveal, updates, callbacks, get elapsed() { return elapsed }, tick() {
    elapsed += RESULT_REVEAL_INTERVAL
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach((callback) => callback())
  } }
}

test('complete medium and long results reveal whole word groups within a short bounded transition', async () => {
  for (const wordCount of [24, 100, 300]) {
    const text = Array.from({ length: wordCount }, (_, index) => `word${index}`).join(' ')
    const display = harness(text)
    assert.ok(text.startsWith(display.updates[0]))
    assert.ok(display.updates[0].length < text.length)
    let finished = false
    const done = display.reveal.finished.then(() => { finished = true })
    await Promise.resolve()
    assert.equal(finished, false)
    while (display.callbacks.size) display.tick()
    await done
    assert.ok(display.elapsed <= 630)
    assert.ok(display.updates.length <= 9)
    assert.ok(display.updates.every((prefix) => text.startsWith(prefix) && prefix.endsWith(' ')))
  }
})

test('short results and reduced motion skip staged text and finish promptly', async () => {
  for (const [text, reducedMotion] of [['A short answer.', false], ['a long explanation '.repeat(100), true]]) {
    const display = harness(text, { reducedMotion })
    await display.reveal.finished
    assert.equal(display.callbacks.size, 0)
    assert.deepEqual(display.updates, [])
  }
})

test('abort discards queued reveals and a motion preference change can finish immediately', async () => {
  const controller = new AbortController()
  const display = harness('part of the explanation '.repeat(30), { signal: controller.signal })
  const rejected = assert.rejects(display.reveal.finished, { name: 'AbortError' })
  controller.abort()
  await rejected
  display.tick()
  assert.equal(display.updates.length, 1)
  assert.equal(display.callbacks.size, 0)
  const changed = harness('part of the explanation '.repeat(30))
  changed.reveal.finish()
  await changed.reveal.finished
  assert.equal(changed.callbacks.size, 0)
})
