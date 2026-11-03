import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { act, createElement, StrictMode } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

let dom, server, createRoot, OrbitStage, HomeScreen, LearnScreen, StudySession, root, container
let animations, frames, reduced, precise, clock, captures, captureCalls, releaseCalls
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
  clock = 0; captures = new Map(); captureCalls = []; releaseCalls = []
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
  for (const [name, value] of Object.entries({
    setPointerCapture(id) { captures.set(id, this); captureCalls.push(id) },
    hasPointerCapture(id) { return captures.get(id) === this },
    releasePointerCapture(id) {
      captures.delete(id); releaseCalls.push(id)
      this.dispatchEvent(new dom.PointerEvent('lostpointercapture', { pointerId: id, bubbles: true }))
    },
  })) {
    const original = Object.getOwnPropertyDescriptor(dom.HTMLElement.prototype, name)
    Object.defineProperty(dom.HTMLElement.prototype, name, { configurable: true, value })
    t.after(() => {
      if (original) Object.defineProperty(dom.HTMLElement.prototype, name, original)
      else delete dom.HTMLElement.prototype[name]
    })
  }
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
async function frame(delta = 16) {
  await act(async () => { const pending = [...frames.values()]; frames.clear(); clock += delta; pending.forEach(fn => fn(clock)) })
}
async function settle() {
  for (let i = 0; i < 60 && frames.size; i++) await frame()
  assert.equal(frames.size, 0, 'No perpetual drag or return frame loop')
}
function dragOffset() {
  const transform = query('drag-motion').style.transform
  if (!transform) return { x: 0, y: 0 }
  const parts = transform.match(/^translate\(([-+\d.e]+)px, ([-+\d.e]+)px\)$/)
  assert.ok(parts, 'The drag layer owns translation only')
  return { x: Number(parts[1]), y: Number(parts[2]) }
}
async function startDrag(options = {}) {
  await pointer('pointerdown', { clientX: 200, clientY: 200, ...options })
  await pointer('pointermove', { clientX: 300, clientY: 200, ...options })
  await frame()
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
  assert.ok(query('companion > .orbit-stage-fidget-motion > .orbit-stage-drag-motion > .orbit-stage-press-motion > .orbit-stage-thinking-motion > .orbit-stage-celebration-motion > .orbit-stage-idle-motion > .orbit-stage-artwork'))
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

test('rest, shy and celebration share native inline looping video at the configured 1x rate', async () => {
  for (const [expression, filename] of [['rest', 'idle'], ['shy', 'sleep'], ['celebrating', 'breakthrough']]) {
    await render({ expression })
    const video = query('artwork')
    assert.equal(video.tagName, 'VIDEO')
    assert.ok(video.src.endsWith(`orbit-${filename}-loop.webm`))
    assert.equal(video.autoplay, true)
    assert.equal(video.loop, true)
    assert.equal(video.muted, true)
    assert.equal(video.hasAttribute('playsinline'), true)
    assert.equal(video.controls, false)
    assert.equal(video.getAttribute('draggable'), 'false')
    assert.equal(video.hasAttribute('poster'), false)
    assert.equal(video.hasAttribute('tabindex'), false)
    assert.equal(video.getAttribute('width'), '1600')
    assert.equal(video.getAttribute('height'), '1600')
    video.playbackRate = 0.5
    video.defaultPlaybackRate = 0.5
    await act(async () => video.dispatchEvent(new dom.Event('loadedmetadata')))
    assert.equal(video.playbackRate, 1, 'The per-state configuration is applied when media is ready')
    assert.equal(video.defaultPlaybackRate, 1)
    assert.ok(query('hit-area'))
    assert.equal(container.querySelectorAll('video').length, 1)
  }
})

test('expression changes replace playback without remounting the motion layers or retaining stale time', async () => {
  await render()
  const follow = query('fidget-motion'), press = query('press-motion'), drag = query('drag-motion')
  let previous = query('artwork')
  previous.currentTime = 4
  for (const expression of ['shy', 'celebrating', 'rest']) {
    await render({ expression })
    const current = query('artwork')
    assert.notEqual(current, previous)
    assert.equal(container.contains(previous), false)
    assert.equal(current.currentTime, 0)
    assert.equal(current.playbackRate, 1)
    assert.equal(query('fidget-motion'), follow)
    assert.equal(query('press-motion'), press)
    assert.equal(query('drag-motion'), drag)
    previous = current
    current.currentTime = 3
  }
  await render({ thinking: true, expression: 'celebrating', thinkingContext: 'lesson' })
  assert.equal(query('artwork').tagName, 'IMG')
  assert.ok(query('artwork').src.endsWith('orbit-teaching-tilt-transparent.png'))
  assert.equal(container.querySelector('video'), null)
  assert.match(container.querySelector('[role="status"]').textContent, /preparing a short lesson/)
  await render()
  assert.equal(query('artwork').tagName, 'VIDEO')
  assert.ok(query('artwork').src.endsWith('orbit-idle-loop.webm'))
  assert.equal(query('artwork').currentTime, 0)
  assert.equal(query('drag-motion'), drag)
})

test('reduced motion still disables wrapper interaction without adding a video pause policy', async t => {
  const pause = t.mock.method(dom.HTMLMediaElement.prototype, 'pause', () => {})
  reduced.change(true)
  await render()
  const video = query('artwork')
  await startDrag(); await tap(); await settle()
  assert.equal(animations.length, 0)
  assert.equal(query('drag-motion').style.transform, '')
  assert.equal(video.autoplay, true)
  assert.equal(video.loop, true)
  assert.equal(video.playbackRate, 1)
  reduced.change(false)
  reduced.change(true)
  assert.equal(query('artwork'), video)
  assert.equal(pause.mock.callCount(), 0)
})

test('active source code has no references to the replaced PNG states', async () => {
  const sourceRoot = new URL('../src/', import.meta.url)
  const files = (await readdir(sourceRoot, { recursive: true })).filter(file => /\.(jsx?|tsx?)$/.test(file))
  await Promise.all(files.map(async file => {
    const source = await readFile(new URL(file.replaceAll('\\', '/'), sourceRoot), 'utf8')
    assert.doesNotMatch(source, /orbit-(?:hero|shy|celebrating)-asset-transparent\.png/, file)
  }))
})

test('hovered artwork and state changes retain layers, soften tracking, and preserve status', async () => {
  await render({ expression: 'shy' })
  await pointer('pointerenter'); await frame()
  const follow = query('fidget-motion'), press = query('press-motion')
  const full = follow.style.transform
  await render({ expression: 'rest' })
  assert.equal(follow.style.transform, full)
  assert.match(query('artwork').src, /orbit-idle-loop\.webm/)
  await render({ thinking: true, thinkingContext: 'recommendation' }); await frame()
  assert.equal(query('fidget-motion'), follow)
  assert.equal(query('press-motion'), press)
  assert.notEqual(follow.style.transform, full)
  assert.match(query('artwork').src, /orbit-teaching/)
  assert.match(container.querySelector('[role="status"]').textContent, /recommendation/)
  assert.equal(motions('thinking-motion').at(-1).options.iterations, Infinity)
  await render({ expression: 'celebrating' }); await frame()
  assert.match(query('artwork').src, /orbit-breakthrough-loop\.webm/)
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
  assert.equal(motions('press-motion').at(-1).options.duration, 180, 'Vertical touch settles without a tap bounce or drag')
  assert.equal(captureCalls.length, 0)
  assert.equal(query('drag-motion').style.transform, '')
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
  for (const call of add.mock.calls.filter(call => ['pointermove', 'pointerup', 'pointercancel', 'blur'].includes(call.arguments[0]))) {
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
  assert.ok(query('artwork').src.endsWith('orbit-idle-loop.webm'))
  await mount(LearnScreen, { courses: [] })
  assert.equal(stage().dataset.expression, 'shy')
  assert.ok(query('artwork').src.endsWith('orbit-sleep-loop.webm'))
  await pointer('pointerenter'); await frame()
  const follow = query('fidget-motion'), before = follow.style.transform
  await act(async () => {
    const input = container.querySelector('input')
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, 'React')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  assert.equal(stage().dataset.expression, 'rest')
  assert.ok(query('artwork').src.endsWith('orbit-idle-loop.webm'))
  assert.equal(query('fidget-motion'), follow)
  assert.equal(follow.style.transform, before)
  await act(async () => {
    const input = container.querySelector('input')
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, '')
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
  assert.equal(stage().dataset.expression, 'shy')
  assert.ok(query('artwork').src.endsWith('orbit-sleep-loop.webm'))
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
  await pointer('pointerenter'); await startDrag()
  const dragged = dragOffset()
  await click('Props')
  assert.equal(stage().dataset.expression, 'celebrating')
  assert.ok(query('artwork').src.endsWith('orbit-breakthrough-loop.webm'))
  const breakthrough = query('artwork')
  assert.equal(scores.length, 1)
  const celebration = motions('celebration-motion').at(-1)
  assert.deepEqual(dragOffset(), dragged, 'The quiz celebration starts without snapping the current drag offset')
  assert.equal(captures.size, 0)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
  await tap(); await tap(); await pointer('pointermove'); await frame()
  assert.equal(query('artwork'), breakthrough, 'Fidget input must not restart video playback')
  assert.equal(celebration.cancelled, false)
  assert.equal(scores.length, 1)
  assert.equal(requests.length, 1)
  await act(async () => t.mock.timers.tick(2400))
  assert.equal(stage().dataset.expression, 'rest')
  assert.ok(query('artwork').src.endsWith('orbit-idle-loop.webm'))
})

test('sub-threshold movement remains a held press and the unchanged quick-click rebound', async () => {
  await render()
  await pointer('pointerdown')
  const press = motions('press-motion').at(-1)
  await pointer('pointermove', { clientX: 284, clientY: 183 })
  await frame(1000)
  assert.equal(press.cancelled, false, 'A long hold does not become a drag without movement')
  assert.equal(query('drag-motion').style.transform, '')
  assert.equal(captureCalls.length, 0)
  await pointer('pointerup', { clientX: 284, clientY: 183 }, dom)
  assert.equal(motions('press-motion').at(-1).options.duration, 440)
  assert.equal(frames.size, 0)
})

test('intentional drag uses the original down position, resistance, capture and a radial travel limit', async () => {
  await render()
  await pointer('pointerdown', { clientX: 200, clientY: 200 })
  assert.equal(captureCalls.length, 0, 'Simple presses do not explicitly capture')
  await pointer('pointermove', { clientX: 210, clientY: 200 })
  assert.deepEqual(captureCalls, [1])
  await pointer('pointermove', { clientX: 300, clientY: 200 })
  assert.equal(frames.size, 1, 'Drag movement is coalesced, not rendered through React')
  await frame()
  assert.ok(dragOffset().x >= 35 && dragOffset().x <= 50, '100px of pointer movement produces a resisted pull')
  assert.equal(dragOffset().y, 0)
  await pointer('pointerleave')
  await pointer('pointermove', { clientX: 1200, clientY: 1200 }, dom)
  await frame()
  const diagonal = dragOffset()
  assert.ok(Math.hypot(diagonal.x, diagonal.y) <= 60.001, 'Diagonal pull shares a radial limit')
  assert.ok(Math.hypot(diagonal.x, diagonal.y) >= 50)
  await pointer('pointermove', { clientX: 220, clientY: 200 }, dom)
  await frame()
  assert.ok(dragOffset().x < 10, 'Offsets are based on the original pointer down, not accumulated movement')
  assert.equal(dragOffset().y, 0)
  assert.equal(stage().dataset.expression, 'rest')
  assert.equal(motions('celebration-motion').length, 0)
})

test('drag release springs past home subtly, settles exactly neutral, and resumes current hover without click rebound', async () => {
  await render()
  await pointer('pointerenter')
  await frame()
  const follow = query('fidget-motion').style.transform
  await startDrag()
  assert.equal(query('fidget-motion').style.transform, follow)
  const start = dragOffset().x
  await pointer('pointerup', { clientX: 300, clientY: 200 }, dom)
  assert.deepEqual(releaseCalls, [1])
  assert.equal(captures.size, 0)
  await pointer('pointermove', { clientX: 150, clientY: 200 })
  const positions = []
  const began = clock
  while (frames.size && clock - began < 700) { await frame(); positions.push(dragOffset().x) }
  assert.ok(clock - began >= 450 && clock - began <= 650)
  assert.ok(Math.min(...positions) < 0, 'The spring crosses home once visibly')
  assert.ok(Math.min(...positions) > -start * 0.08, 'The opposite overshoot remains small')
  assert.equal(query('drag-motion').style.transform, '')
  assert.equal(frames.size, 0)
  assert.match(query('fidget-motion').style.transform, /translate\(-/, 'Follow resumes using the pointer position after release')
  assert.ok(motions('press-motion').every(a => a.options.duration !== 440), 'Drag release does not play the click rebound')
})

test('catching a return freezes the visible offset and repeated drags never stack or accumulate', async () => {
  await render()
  for (let i = 0; i < 5; i++) {
    await startDrag()
    await pointer('pointerup', { clientX: 300, clientY: 200 }, dom)
    await frame(); await frame(80)
    const caught = dragOffset()
    assert.ok(caught.x > 0)
    await pointer('pointerdown', { clientX: 200, clientY: 200 })
    assert.deepEqual(dragOffset(), caught)
    await frame(100)
    assert.deepEqual(dragOffset(), caught, 'The superseded return has no queued writes')
    await pointer('pointermove', { clientX: 220, clientY: 200 })
    await frame()
    assert.ok(Math.abs(dragOffset().x - (caught.x + 9)) < 0.001, 'A new origin starts at the caught position')
    assert.ok(frames.size <= 1)
    await pointer('pointerup', { clientX: 220, clientY: 200 }, dom)
    await settle()
    assert.equal(query('drag-motion').style.transform, '')
  }
  assert.ok(motions('press-motion').every(a => a.options.duration !== 440))
})

test('catch and release without further movement still returns home rather than leaving a frozen offset', async () => {
  await render()
  await startDrag()
  await pointer('pointerup', {}, dom)
  await frame(); await frame(64)
  await pointer('pointerdown')
  const caught = dragOffset()
  assert.ok(caught.x > 0)
  await pointer('pointerup', {}, dom)
  assert.deepEqual(dragOffset(), caught)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
})

for (const type of ['pointercancel', 'lostpointercapture']) test(`${type} returns a drag safely and ignores the later pointerup`, async () => {
  await render()
  await startDrag()
  const before = dragOffset()
  await pointer(type)
  assert.deepEqual(dragOffset(), before, 'Cancellation begins at the visible position')
  assert.equal(captures.size, 0)
  await pointer('pointerup', {}, dom)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
  assert.ok(motions('press-motion').every(a => a.options.duration !== 440))
})

test('only the active primary pointer controls a drag, including moves outside the hit region', async () => {
  await render()
  await startDrag()
  const before = dragOffset()
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
    await pointer(type, { pointerId: 2, clientX: 999, clientY: 999 })
  }
  await pointer('pointermove', { isPrimary: false, clientX: 999, clientY: 999 })
  await frame()
  assert.deepEqual(dragOffset(), before)
  assert.equal(captures.get(1), query('hit-area'))
  await pointer('pointermove', { clientX: 100, clientY: 200 }, dom)
  await frame()
  assert.ok(dragOffset().x < 0)
  await pointer('pointerup', { clientX: 100, clientY: 200 }, dom)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
})

test('touch starts horizontally to drag, with a smaller travel limit; pen also supports drag', async () => {
  await render()
  precise.change(false)
  for (const pointerType of ['touch', 'pen']) {
    await startDrag({ pointerType })
    assert.equal(captures.get(1), query('hit-area'))
    await pointer('pointermove', { pointerType, clientX: 1000, clientY: 1000 })
    await frame()
    const { x, y } = dragOffset()
    assert.ok(Math.hypot(x, y) >= 35 && Math.hypot(x, y) <= 44.001)
    await pointer('pointerup', { pointerType, clientX: 1000, clientY: 1000 }, dom)
    await settle()
    assert.equal(query('drag-motion').style.transform, '')
    assert.equal(query('fidget-motion').style.transform, '', 'Touch/coarse input does not invent hover')
  }
})

for (const pose of ['thinking', 'celebrating']) test(`${pose} beginning mid-drag settles without snapping or interrupting the state motion`, async () => {
  await render()
  await startDrag()
  const before = dragOffset(), drag = query('drag-motion')
  const props = pose === 'thinking' ? { thinking: true } : { expression: pose }
  await render(props)
  const stateAnimation = motions(`${pose === 'thinking' ? 'thinking' : 'celebration'}-motion`).at(-1)
  assert.equal(query('drag-motion'), drag)
  assert.deepEqual(dragOffset(), before)
  assert.equal(captures.size, 0)
  await pointer('pointerup', {}, dom)
  await settle()
  assert.equal(drag.style.transform, '')
  assert.equal(stateAnimation.cancelled, false)
  await startDrag()
  assert.ok(dragOffset().x > 0 && dragOffset().x < before.x / 2, 'State motion keeps the existing strength reduction')
  assert.equal(stateAnimation.cancelled, false)
  const restrained = dragOffset()
  await render()
  assert.deepEqual(dragOffset(), restrained, 'Leaving state motion during drag also settles without a strength jump')
  assert.equal(captures.size, 0)
  await settle()
  assert.equal(stage().dataset.expression, 'rest')
  assert.equal(drag.style.transform, '')
})

test('shy/rest changes preserve an active drag and its eventual exact home position', async () => {
  await render({ expression: 'shy' })
  await startDrag()
  const before = dragOffset()
  await render({ expression: 'rest' })
  assert.deepEqual(dragOffset(), before)
  assert.equal(captures.get(1), query('hit-area'))
  assert.match(query('artwork').src, /orbit-idle-loop\.webm/)
  await pointer('pointerup', {}, dom)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
})

test('reduced motion prevents dragging and clears an active drag or return immediately', async () => {
  await render()
  reduced.change(true)
  await startDrag()
  assert.equal(query('drag-motion').style.transform, '')
  assert.equal(captures.size, 0)
  assert.equal(frames.size, 0)
  for (const releaseFirst of [false, true]) {
    reduced.change(false)
    await startDrag()
    if (releaseFirst) { await pointer('pointerup', {}, dom); await frame() }
    reduced.change(true)
    assert.equal(query('drag-motion').style.transform, '')
    assert.equal(captures.size, 0)
    assert.equal(frames.size, 0)
    await pointer('pointerup', {}, dom)
    await settle()
    assert.equal(query('drag-motion').style.transform, '')
  }
})

test('disposal while dragging clears capture, pending frames, animations, listeners and transforms', async t => {
  const add = t.mock.method(dom, 'addEventListener'), remove = t.mock.method(dom, 'removeEventListener')
  await render()
  await startDrag()
  await pointer('pointermove', { clientX: 1000 })
  const drag = query('drag-motion'), hit = query('hit-area')
  assert.ok(frames.size)
  await act(async () => root.unmount()); root = null
  assert.equal(drag.style.transform, '')
  assert.equal(frames.size, 0)
  assert.equal(captures.size, 0)
  assert.ok(animations.every(a => a.cancelled))
  assert.equal(reduced.listeners.size, 0)
  assert.equal(precise.listeners.size, 0)
  await pointer('pointermove', {}, hit); await pointer('pointerup', {}, dom)
  assert.equal(frames.size, 0)
  for (const call of add.mock.calls.filter(call => ['pointermove', 'pointerup', 'pointercancel', 'blur'].includes(call.arguments[0]))) {
    assert.ok(remove.mock.calls.some(other => other.arguments[0] === call.arguments[0] && other.arguments[1] === call.arguments[1]))
  }
})

test('cancellation before a queued drag frame never applies an unseen target', async () => {
  await render()
  await startDrag()
  const before = dragOffset()
  await pointer('pointermove', { clientX: -1000, clientY: -1000 })
  await pointer('pointercancel')
  await frame()
  assert.deepEqual(dragOffset(), before)
  await settle()
  assert.equal(query('drag-motion').style.transform, '')
})

test('CSS keeps geometry and state/idle ownership separate, with motion gated by preference', async () => {
  const css = await readFile(new URL('../src/components/OrbitStage.css', import.meta.url), 'utf8')
  assert.match(css, /orbit-stage-companion\s*\{[^}]*pointer-events: none/s)
  assert.match(css, /orbit-stage-hit-area\s*\{[^}]*pointer-events: auto; touch-action: pan-y pinch-zoom/s)
  assert.match(css, /prefers-reduced-motion: no-preference[^]*orbit-stage-fidget-motion \{ transition: transform/)
  assert.match(css, /prefers-reduced-motion: reduce[^]*orbit-stage-drag-motion \{ transform: none !important/)
  assert.match(css, /prefers-reduced-motion: reduce[^]*orbit-stage-hit-area \{ touch-action: auto/)
  assert.match(css, /orbit-stage-idle-motion \{ animation-play-state: paused/)
  assert.doesNotMatch(css, /orbit-stage-artwork \{ animation:|orbit-celebrate/)
})
