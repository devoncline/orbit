import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

let dom, server, createRoot, OrbitStage, HomeScreen, LearnScreen, StudySession, root, container
let animations, frames, reduced, precise
const globals = new Map()
const course = { name: 'React', mastery: { overall: 40, topics: { Props: 20 } } }
const lesson = { topic: 'Props', concept: 'Inputs', content: 'Props supply inputs to components.' }
const query = name => container.querySelector(`.orbit-stage-${name}`)
const stage = () => container.querySelector('.orbit-stage')
const motions = name => animations.filter(animation => animation.element === query(name))
const mount = (Component = OrbitStage, props = {}) => act(async () => root.render(createElement(StrictMode, null, createElement(Component, props))))
const render = props => mount(OrbitStage, { interaction: 'fidget', ...props })

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  OrbitStage = (await server.ssrLoadModule('/src/components/OrbitStage.jsx')).default
  HomeScreen = (await server.ssrLoadModule('/src/components/HomeScreen.jsx')).default
  LearnScreen = (await server.ssrLoadModule('/src/components/LearnScreen.jsx')).default
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
})

beforeEach(t => {
  animations = []; frames = new Map()
  const media = matches => ({ matches, listeners: new Set(),
    addEventListener(_event, fn) { this.listeners.add(fn) },
    removeEventListener(_event, fn) { this.listeners.delete(fn) },
    change(value) { this.matches = value; this.listeners.forEach(fn => fn()) },
  })
  reduced = media(false); precise = media(true)
  t.mock.method(dom, 'matchMedia', query => query.includes('prefers-reduced-motion') ? reduced : precise)
  let nextFrame = 0
  t.mock.method(dom, 'requestAnimationFrame', fn => { frames.set(++nextFrame, fn); return nextFrame })
  t.mock.method(dom, 'cancelAnimationFrame', id => frames.delete(id))
  t.mock.method(dom.HTMLElement.prototype, 'getBoundingClientRect', () => ({ left: 100, top: 100, width: 200, height: 200 }))
  const descriptor = Object.getOwnPropertyDescriptor(dom.HTMLElement.prototype, 'animate')
  Object.defineProperty(dom.HTMLElement.prototype, 'animate', { configurable: true, value: function (keyframes, options) {
    let finish
    const animation = { element: this, keyframes, options, pose: keyframes[0].transform, cancelled: false, done: false,
      cancel() { this.cancelled = true },
      finish() { this.done = true; finish() },
      finished: new Promise(resolve => { finish = resolve }),
    }
    animations.push(animation)
    return animation
  } })
  t.after(() => {
    if (descriptor) Object.defineProperty(dom.HTMLElement.prototype, 'animate', descriptor)
    else delete dom.HTMLElement.prototype.animate
  })
  t.mock.method(dom, 'getComputedStyle', element => ({ transform: animations.findLast(a => a.element === element && !a.cancelled && !a.done)?.pose || element.style.transform || 'none' }))
  t.mock.method(globalThis, 'fetch', () => assert.fail('Mascot interaction must not make requests'))
  container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container)
})

afterEach(async () => { if (root) await act(async () => root.unmount()); container.remove() })
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

async function pointer(type, options = {}, target = query('hit-area')) {
  const event = new dom.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 280, clientY: 180, bubbles: true, cancelable: true, ...options })
  await act(async () => target.dispatchEvent(event))
  assert.equal(event.defaultPrevented, false, 'Native scrolling and gestures remain available')
}
async function frame() {
  await act(async () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(16)) })
}
async function tap(options = {}) { await pointer('pointerdown', options); await pointer('pointerup', options, dom) }
async function click(label) {
  const button = [...container.querySelectorAll('button')].find(node => node.textContent === label)
  assert.ok(button, `Missing ${label}`)
  await act(async () => button.click())
}

test('interaction is opt-in, decorative, and composed outside every state transform', async () => {
  await mount()
  assert.equal(query('hit-area'), null)
  await render()
  assert.ok(query('companion > .orbit-stage-fidget-motion > .orbit-stage-press-motion > .orbit-stage-thinking-motion > .orbit-stage-celebration-motion > .orbit-stage-idle-motion > .orbit-stage-artwork'))
  assert.equal(query('hit-area').parentElement, query('companion'))
  assert.equal(query('companion').getAttribute('aria-hidden'), 'true')
  assert.equal(query('hit-area').hasAttribute('tabindex'), false)
  assert.equal(query('hit-area').hasAttribute('role'), false)
  assert.equal(container.querySelectorAll('[role="status"]').length, 1)
})

test('pointer tracking coalesces, stays bounded, leaves smoothly and never changes expression', async () => {
  await render({ expression: 'shy' })
  const image = query('artwork')
  for (let i = 0; i < 12; i++) await pointer('pointermove', { clientX: 999, clientY: -999 })
  assert.equal(frames.size, 1)
  await frame()
  assert.match(query('fidget-motion').style.transform, /translate\(7px, -7px\).*rotate\(2deg\).*scale\(1\.02\)/)
  assert.equal(stage().dataset.expression, 'shy')
  assert.equal(query('artwork'), image)
  await pointer('pointerleave')
  await frame()
  assert.equal(query('fidget-motion').style.transform, '')
  assert.equal(frames.size, 0)
})

test('hovered artwork and state changes retain layers, soften tracking, and preserve status', async () => {
  await render({ expression: 'shy' })
  await pointer('pointerenter'); await frame()
  const follow = query('fidget-motion'), press = query('press-motion')
  const full = follow.style.transform
  await render({ expression: 'rest' })
  assert.equal(follow.style.transform, full)
  assert.match(query('artwork').src, /orbit-hero/)
  await render({ thinking: true, thinkingContext: 'recommendation' }); await frame()
  assert.equal(query('fidget-motion'), follow)
  assert.equal(query('press-motion'), press)
  assert.notEqual(follow.style.transform, full)
  assert.match(query('artwork').src, /orbit-teaching/)
  assert.match(container.querySelector('[role="status"]').textContent, /recommendation/)
  assert.equal(motions('thinking-motion').at(-1).options.iterations, Infinity)
  await render({ expression: 'celebrating' }); await frame()
  assert.match(query('artwork').src, /orbit-celebrating/)
  assert.equal(motions('celebration-motion').at(-1).options.duration, 1200)
  await render(); await frame()
  assert.equal(follow.style.transform, full)
  assert.equal(container.querySelector('[role="status"]').textContent, '')
  await render({ expression: 'unknown' })
  assert.equal(stage().dataset.expression, 'rest')
})

test('quick release rebounds immediately from the visible pose; repeated taps supersede without stacking', async () => {
  await render()
  await pointer('pointerdown')
  const squash = motions('press-motion').at(-1)
  assert.equal(squash.options.fill, 'forwards')
  assert.equal(squash.keyframes.at(-1).transform, 'scale(0.965)')
  squash.pose = 'scale(0.99)' // A quick release before the press finishes.
  await pointer('pointerup', {}, dom)
  const bounce = motions('press-motion').at(-1)
  assert.equal(squash.cancelled, true)
  assert.equal(bounce.keyframes[0].transform, squash.pose)
  assert.equal(bounce.keyframes[1].transform, 'scale(1.045)', 'No extra compressed hold on release')
  assert.ok(bounce.keyframes[1].offset * bounce.options.duration < 150)
  assert.ok(bounce.options.duration >= 400 && bounce.options.duration <= 600)
  assert.equal(bounce.keyframes.at(-1).transform, 'scale(1)')
  assert.equal(bounce.options.fill, undefined)
  bounce.pose = 'scale(1.02)'
  await pointer('pointerdown')
  assert.equal(bounce.cancelled, true)
  assert.equal(motions('press-motion').at(-1).keyframes[0].transform, bounce.pose)
  for (let i = 0; i < 6; i++) await tap()
  assert.equal(motions('press-motion').filter(a => !a.cancelled).length, 1)
  assert.equal(stage().dataset.expression, 'rest')
  assert.equal(motions('celebration-motion').length, 0)
})

test('state changes during a held press or bounce never cancel or replay celebration', async () => {
  await render()
  await pointer('pointerenter'); await pointer('pointerdown'); await frame()
  const held = motions('press-motion').at(-1)
  await render({ expression: 'celebrating' })
  const celebration = motions('celebration-motion').at(-1)
  assert.equal(held.cancelled, false)
  await pointer('pointerup', {}, dom)
  const bounce = motions('press-motion').at(-1)
  assert.ok(celebration.options.duration > bounce.options.duration)
  assert.notEqual(celebration.element, bounce.element)
  await tap(); await pointer('pointermove'); await frame()
  assert.equal(celebration.cancelled, false)
  assert.equal(motions('celebration-motion').length, 1)
  const currentBounce = motions('press-motion').at(-1)
  celebration.pose = 'translateY(-8px) rotate(3deg)'
  await render({ thinking: true })
  assert.equal(currentBounce.cancelled, false)
  assert.equal(motions('celebration-motion').at(-1).keyframes[0].transform, celebration.pose)
  await render(); await frame()
  assert.equal(currentBounce.cancelled, false)
  assert.equal(stage().dataset.expression, 'rest')
  await act(async () => currentBounce.finish())
  assert.equal(query('press-motion').style.transform, '')
})

test('touch and pen tap, cancelled gestures and multi-pointer input preserve native page gestures', async () => {
  await render()
  precise.change(false)
  await pointer('pointerenter', { pointerType: 'touch' }); await frame()
  assert.equal(query('fidget-motion').style.transform, '')
  await tap({ pointerType: 'touch' })
  assert.equal(motions('press-motion').at(-1).options.duration, 440)
  await tap({ pointerType: 'pen' })
  assert.equal(motions('press-motion').at(-1).options.duration, 440)
  await pointer('pointerdown', { pointerType: 'touch' })
  const count = animations.length
  await pointer('pointerdown', { pointerId: 2, isPrimary: false })
  await pointer('pointerup', { pointerId: 2, isPrimary: false }, dom)
  assert.equal(animations.length, count)
  await pointer('pointermove', { pointerType: 'touch', clientY: 240 })
  await pointer('pointerup', { pointerType: 'touch', clientY: 240 }, dom)
  assert.equal(motions('press-motion').at(-1).options.duration, 180, 'Scroll/drag settles without a tap bounce')
  await pointer('pointerdown')
  await pointer('pointercancel', {}, dom)
  assert.equal(motions('press-motion').at(-1).keyframes.at(-1).transform, 'scale(1)')
  const cancelledCount = animations.length
  await pointer('pointerup', {}, dom)
  assert.equal(animations.length, cancelledCount)
  await tap({ button: 2 })
  assert.equal(animations.length, cancelledCount)
})

test('reduced motion disables every interaction and responds immediately to preference changes', async () => {
  reduced.change(true)
  await render({ thinking: true })
  await pointer('pointerenter'); await tap(); await frame()
  assert.equal(animations.length, 0)
  assert.equal(frames.size, 0)
  assert.match(container.querySelector('[role="status"]').textContent, /thinking/)
  reduced.change(false)
  await pointer('pointerenter'); await tap()
  assert.ok(frames.size)
  reduced.change(true)
  assert.equal(frames.size, 0)
  assert.ok(animations.every(a => a.cancelled))
  assert.equal(query('fidget-motion').style.transform, '')
  assert.equal(query('press-motion').style.transform, '')
  const count = animations.length
  await tap(); await pointer('pointermove'); await frame()
  assert.equal(animations.length, count)
})

test('unmount and disabling interaction cancel pending work and remove all input/media listeners', async t => {
  const add = t.mock.method(dom, 'addEventListener'), remove = t.mock.method(dom, 'removeEventListener')
  await render()
  const oldHit = query('hit-area')
  await tap(); await pointer('pointermove')
  await render({ interaction: 'none' })
  assert.equal(query('hit-area'), null)
  assert.equal(frames.size, 0)
  assert.ok(animations.every(a => a.cancelled))
  const count = animations.length
  await pointer('pointerdown', {}, oldHit); await pointer('pointerup', {}, dom)
  assert.equal(animations.length, count)
  await render({ thinking: true }); await tap(); await pointer('pointermove')
  await act(async () => root.unmount()); root = null
  assert.equal(frames.size, 0)
  assert.ok(animations.every(a => a.cancelled))
  assert.equal(reduced.listeners.size, 0)
  assert.equal(precise.listeners.size, 0)
  for (const call of add.mock.calls.filter(call => ['pointerup', 'pointercancel', 'blur'].includes(call.arguments[0]))) {
    assert.ok(remove.mock.calls.some(other => other.arguments[0] === call.arguments[0] && other.arguments[1] === call.arguments[1]))
  }
})

test('Home enables fidget through recommendation loading; Learn retains input-driven shy/rest selection', async () => {
  await mount(HomeScreen, { courses: [], loadingRecommendation: true })
  assert.ok(query('hit-area'))
  assert.equal(stage().dataset.expression, 'thinking')
  await tap()
  assert.equal(stage().dataset.expression, 'thinking')
  await mount(HomeScreen, { courses: [], loadingRecommendation: false })
  assert.equal(stage().dataset.expression, 'rest')
  await mount(LearnScreen, { courses: [] })
  assert.equal(stage().dataset.expression, 'shy')
  await pointer('pointerenter'); await frame()
  const follow = query('fidget-motion'), before = follow.style.transform
  await act(async () => {
    const input = container.querySelector('input')
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, 'React')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  assert.equal(stage().dataset.expression, 'rest')
  assert.equal(query('fidget-motion'), follow)
  assert.equal(follow.style.transform, before)
  await act(async () => {
    const input = container.querySelector('input')
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, '')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  assert.equal(stage().dataset.expression, 'shy')
})

test('Study quiz still scores once and celebrates through pointer activity, then returns to rest', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const scores = [], requests = []
  let respond
  t.mock.method(globalThis, 'fetch', path => {
    requests.push(path)
    assert.equal(path, '/api/generate-study-question')
    return new Promise(resolve => { respond = () => resolve(new Response(JSON.stringify({ topic: 'Props', question: 'What supplies inputs?', answers: [{ text: 'Props', correct: true }], explanation: 'Props supply inputs.' }), { headers: { 'Content-Type': 'application/json' } })) })
  })
  await mount(StudySession, { course, threadId: 'one', mastery: 40, initialThread: { resume: { lesson } }, updateTopicMastery: (...args) => scores.push(args) })
  await tap()
  assert.equal(requests.length, 0)
  await click('Quiz me')
  assert.equal(stage().dataset.expression, 'thinking')
  await tap()
  await act(async () => respond())
  await act(async () => t.mock.timers.tick(10000))
  assert.equal(stage().dataset.expression, 'rest')
  await pointer('pointerenter'); await tap()
  await click('Props')
  assert.equal(stage().dataset.expression, 'celebrating')
  assert.equal(scores.length, 1)
  const celebration = motions('celebration-motion').at(-1)
  await tap(); await tap(); await pointer('pointermove'); await frame()
  assert.equal(celebration.cancelled, false)
  assert.equal(scores.length, 1)
  assert.equal(requests.length, 1)
  await act(async () => t.mock.timers.tick(2400))
  assert.equal(stage().dataset.expression, 'rest')
})

test('CSS keeps geometry and state/idle ownership separate, with motion gated by preference', async () => {
  const css = await readFile(new URL('../src/components/OrbitStage.css', import.meta.url), 'utf8')
  assert.match(css, /orbit-stage-companion\s*\{[^}]*pointer-events: none/s)
  assert.match(css, /orbit-stage-hit-area\s*\{[^}]*pointer-events: auto; touch-action: auto/s)
  assert.match(css, /prefers-reduced-motion: no-preference[^]*orbit-stage-fidget-motion \{ transition: transform/)
  assert.match(css, /prefers-reduced-motion: reduce[^]*transform: none !important/)
  assert.match(css, /orbit-stage-idle-motion \{ animation-play-state: paused/)
  assert.doesNotMatch(css, /orbit-stage-artwork \{ animation:|orbit-celebrate/)
})
