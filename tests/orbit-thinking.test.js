import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { getThinkingCopy, startThinkingMotion, studyThinkingContext } from '../src/components/orbitThinking.js'

test('each study request selects contextual copy independently of lesson or response content', () => {
  const cases = [
    [{}, ''],
    [{ loadingLesson: 'lesson' }, 'lesson'],
    [{ loadingLesson: 'next' }, 'next'],
    [{ loadingLesson: 'simplify' }, 'simplify'],
    [{ loadingLesson: 'example' }, 'example'],
    [{ loadingActivity: 'generate' }, 'activity'],
    [{ loadingActivity: 'evaluate' }, 'response'],
    [{ loadingConversation: true }, 'conversation'],
    [{ loadingQuestion: true }, 'quiz'],
    [{ loadingEvaluation: true }, 'evaluation'],
  ]
  for (const [state, expected] of cases) {
    assert.equal(studyThinkingContext(state), expected)
    assert.equal(studyThinkingContext({ ...state, lesson: { content: 'Already visible' }, response: 'Partial reply' }), expected)
    const copy = getThinkingCopy(expected)
    assert.equal(copy.fragments.length, 2)
    assert.ok(copy.fragments.every((fragment) => fragment.length <= 26))
    assert.match(copy.status, /^Orbit is /)
  }
  assert.equal(studyThinkingContext({ loadingQuestion: true, loadingActivity: 'generate', loadingConversation: true }), 'quiz')
  assert.match(getThinkingCopy('recommendation').status, /recommendation/)
  assert.deepEqual(getThinkingCopy('unknown'), getThinkingCopy())
  assert.deepEqual(getThinkingCopy('toString'), getThinkingCopy())
})

function motionHarness(t, reduced = false) {
  const animations = []
  const listeners = new Set()
  const preference = {
    matches: reduced,
    addEventListener: (event, callback) => { assert.equal(event, 'change'); listeners.add(callback) },
    removeEventListener: (event, callback) => { assert.equal(event, 'change'); listeners.delete(callback) },
  }
  const element = {
    style: { transform: '' },
    animate(frames, options) {
      const animation = { frames, options, cancelled: false, pose: frames[0].transform, cancel() { this.cancelled = true } }
      animations.push(animation)
      return animation
    },
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    matchMedia: (query) => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return preference },
    getComputedStyle: () => ({ transform: animations.findLast((animation) => !animation.cancelled)?.pose || element.style.transform || 'none' }),
  } })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else delete globalThis.window
  })
  return { element, animations, listeners, setReduced(value) { preference.matches = value; for (const listener of listeners) listener() } }
}

test('finishing at an arbitrary sway angle settles from that pose; a quick retry cancels the old motion', (t) => {
  const { element, animations, listeners } = motionHarness(t)
  const stopThinking = startThinkingMotion(element, true)
  assert.equal(animations.length, 1)
  assert.equal(animations[0].options.iterations, Infinity)
  assert.ok(animations[0].options.duration >= 8000)
  assert.match(animations[0].frames[1].transform, /rotate\(-4deg\)/)
  assert.match(animations[0].frames[2].transform, /rotate\(3deg\)/)
  const midway = 'matrix(0.999, -0.04, 0.04, 0.999, 0, -2)'
  animations[0].pose = midway
  stopThinking()
  assert.equal(animations[0].cancelled, true)
  assert.equal(listeners.size, 0)
  const stopSettling = startThinkingMotion(element, false)
  assert.equal(animations[1].frames[0].transform, midway)
  assert.match(animations[1].frames.at(-1).transform, /rotate\(0deg\)/)
  assert.equal(animations[1].options.iterations, undefined)
  animations[1].pose = 'matrix(1, -0.01, 0.01, 1, 0, -1)'
  stopSettling()
  const stopRetry = startThinkingMotion(element, true)
  assert.equal(animations[1].cancelled, true)
  assert.equal(animations[2].frames[0].transform, animations[1].pose)
  stopRetry()
  assert.equal(listeners.size, 0)
  assert.ok(animations.every((animation) => animation.cancelled))
})

test('reduced motion stays still and cancels active motion when the preference changes', (t) => {
  const { element, animations, listeners, setReduced } = motionHarness(t, true)
  const stop = startThinkingMotion(element, true)
  assert.equal(animations.length, 0)
  setReduced(false)
  assert.equal(animations.length, 1)
  setReduced(true)
  assert.equal(animations[0].cancelled, true)
  assert.equal(element.style.transform, '')
  stop()
  assert.equal(listeners.size, 0)
})

test('resting stages do not start extra motion; missing animation support is safe', (t) => {
  const { element, animations } = motionHarness(t)
  const stop = startThinkingMotion(element, false)
  assert.equal(animations.length, 0)
  stop()
  assert.equal(startThinkingMotion(null, true), undefined)
  assert.equal(startThinkingMotion({ style: {} }, true), undefined)
})

test('decorative motion is opt-in and mobile reduces fragments without growing the stage', async () => {
  const css = await readFile(new URL('../src/components/OrbitStage.css', import.meta.url), 'utf8')
  const [staticStyles, motionStyles] = css.split('@media (prefers-reduced-motion: no-preference)')
  assert.doesNotMatch(staticStyles, /animation:/)
  assert.match(motionStyles, /orbit-stage-artwork \{ animation:/)
  assert.match(motionStyles, /orbit-thought-fragment \{ animation:/)
  assert.match(motionStyles, /orbit-thought-trail i \{ animation:/)
  assert.match(css, /orbit-thoughts \{ position: absolute; inset: 0; overflow: hidden;/)
  const mobile = css.split('@media (max-width: 760px)')[1]
  assert.match(mobile, /orbit-thought-fragment:nth-child\(2\) \{ display: none;/)
  assert.match(mobile, /max-width: 40%/)
})
