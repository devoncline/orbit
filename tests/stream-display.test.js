import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStreamDisplay, STREAM_DISPLAY_INTERVAL } from '../src/services/streamDisplay.js'

function displayHarness(signal, reducedMotion = false) {
  const updates = []
  const scheduled = new Map()
  let nextId = 0
  const delays = []
  const display = createStreamDisplay({
    signal, reducedMotion, onUpdate: (text) => updates.push(text),
    schedule(callback, delay) {
      assert.ok(delay >= STREAM_DISPLAY_INTERVAL && delay <= STREAM_DISPLAY_INTERVAL + 60)
      delays.push(delay)
      scheduled.set(++nextId, callback)
      return nextId
    },
    unschedule: (id) => scheduled.delete(id),
  })
  return { display, updates, scheduled, delays, tick() {
    const callbacks = [...scheduled.values()]
    scheduled.clear()
    callbacks.forEach((callback) => callback())
  } }
}

test('network bursts reveal small word groups before completion and wait when the buffer is empty', async () => {
  const { display, updates, scheduled, tick } = displayHarness()
  display.append('One two three four five six ')
  assert.deepEqual(updates, [])
  assert.equal(scheduled.size, 1)
  tick()
  assert.deepEqual(updates, ['One two '])
  display.append('seven eight ')
  assert.equal(scheduled.size, 1, 'A second delta must not create a second timer')
  tick()
  assert.equal(updates.at(-1), 'One two three four ')
  tick(); tick()
  assert.equal(updates.at(-1), 'One two three four five six seven eight ')
  assert.equal(scheduled.size, 0, 'Wait naturally for slower network data')
  display.append('nine ten ')
  tick()
  assert.match(updates.at(-1), /nine ten $/)
  await display.finish()
  assert.equal(updates.length, 5)
})

test('completion waits for buffered text to drain; short replies finish in one cadence', async () => {
  const { display, updates, tick } = displayHarness()
  display.append('One two three four five six.')
  let finished = false
  const drained = display.finish().then(() => { finished = true })
  tick()
  await Promise.resolve()
  assert.equal(finished, false)
  assert.equal(updates.at(-1), 'One two ')
  tick(); tick()
  await drained
  assert.equal(finished, true)
  assert.equal(updates.at(-1), 'One two three four five six.')

  const short = displayHarness()
  short.display.append('Yes!')
  const done = short.display.finish()
  short.tick()
  await done
  assert.deepEqual(short.updates, ['Yes!'])
  assert.equal(short.scheduled.size, 0)
})

test('fragmented words are held instead of updating React for each character', async () => {
  const { display, updates, scheduled, tick } = displayHarness()
  for (const letter of 'Hello') { display.append(letter); tick() }
  assert.deepEqual(updates, [])
  assert.equal(scheduled.size, 0)
  display.append(' world ')
  tick()
  assert.deepEqual(updates, ['Hello world '])
  await display.finish()
})

test('large bursts and long Unicode words remain bounded without breaking surrogate pairs', async () => {
  const { display, updates, tick } = displayHarness()
  const text = `${'word '.repeat(80)}${'🪐'.repeat(60)}`
  display.append(text)
  const done = display.finish()
  let previous = ''
  while (updates.at(-1) !== text) {
    tick()
    const current = updates.at(-1)
    assert.ok(Array.from(current.slice(previous.length)).length <= 64)
    assert.equal(current.isWellFormed(), true)
    previous = current
  }
  await done
  assert.ok(updates.length > 10)
})

test('sentence endings get a light pause while a large backlog catches up in larger groups', async () => {
  const { display, updates, delays, tick } = displayHarness()
  display.append('Yes. That is right, and here is why. ')
  tick()
  assert.equal(updates[0], 'Yes. ')
  assert.equal(delays.at(-1), STREAM_DISPLAY_INTERVAL + 60)
  display.append('another '.repeat(80))
  tick()
  assert.ok(updates.at(-1).length - updates[0].length > 10)
  display.cancel()
})

test('reduced motion waits for completion without animated chunks and can finish an active drain promptly', async () => {
  const reduced = displayHarness(undefined, true)
  reduced.display.append('A complete response.')
  assert.equal(reduced.scheduled.size, 0)
  assert.deepEqual(reduced.updates, [])
  await reduced.display.finish()
  assert.deepEqual(reduced.updates, ['A complete response.'])

  const active = displayHarness()
  active.display.append('One two three four five six.')
  const done = active.display.finish()
  active.tick()
  active.display.setReducedMotion(true)
  await done
  assert.equal(active.updates.at(-1), 'One two three four five six.')
  assert.equal(active.scheduled.size, 0)
})

test('abort while draining cancels scheduled work and rejects completion', async () => {
  const controller = new AbortController()
  const { display, updates, scheduled, tick } = displayHarness(controller.signal)
  display.append('One two three four five six.')
  tick()
  const rejected = assert.rejects(display.finish(), { name: 'AbortError' })
  controller.abort()
  await rejected
  display.append('Late text ')
  tick()
  assert.deepEqual(updates, ['One two '])
  assert.equal(scheduled.size, 0)
})

test('cancellation before completion drops queued work and an empty reply needs no timer', async () => {
  const { display, updates, scheduled, tick } = displayHarness()
  display.append('Uncommitted text ')
  display.cancel()
  tick()
  assert.deepEqual(updates, [])
  assert.equal(scheduled.size, 0)
  await assert.rejects(display.finish(), { name: 'AbortError' })
  const empty = displayHarness()
  await empty.display.finish()
  assert.equal(empty.scheduled.size, 0)
})
