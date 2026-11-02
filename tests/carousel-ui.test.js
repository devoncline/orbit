import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

let dom, server, createRoot, Carousel, root, container, viewportWidth, resize, motion, frames, clock
const globals = new Map()
const items = Array.from({ length: 5 }, (_, index) => ({ id: String(index), topic: `A long topic ${index} ${'with more detail '.repeat(8)}` }))
const chosen = []
const props = (entries = items) => ({ items: entries, renderItem: (item, active) => createElement('button', {
  type: 'button', tabIndex: active ? 0 : -1, onClick: () => chosen.push(item.id),
}, item.topic) })
const render = async (entries = items) => act(async () => root.render(createElement(Carousel, props(entries))))
const current = () => container.querySelector('[data-current="true"]')?.getAttribute('aria-label')
const key = async value => act(async () => container.querySelector('.orbit-carousel').dispatchEvent(new dom.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))

before(async () => {
  dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } })
  for (const [name, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  Carousel = (await server.ssrLoadModule('/src/components/Carousel/Carousel.jsx')).default
})
beforeEach(t => {
  frames = new Map(); clock = 0; viewportWidth = 320; chosen.length = 0
  let nextFrame = 0
  t.mock.method(dom, 'requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame })
  t.mock.method(dom, 'cancelAnimationFrame', id => frames.delete(id))
  t.mock.method(dom.HTMLElement.prototype, 'getBoundingClientRect', () => ({ width: viewportWidth, height: 240, top: 0, left: 0, right: viewportWidth, bottom: 240 }))
  motion = { matches: false, addEventListener(_type, callback) { this.change = callback }, removeEventListener() { this.change = null } }
  t.mock.method(dom, 'matchMedia', () => motion)
  t.mock.method(dom, 'ResizeObserver', function (callback) {
    resize = { notify: callback, disconnected: false }
    return { observe() {}, disconnect() { resize.disconnected = true } }
  })
  t.mock.method(globalThis, 'fetch', () => assert.fail('Carousel interactions are local'))
  container = dom.document.createElement('div'); dom.document.body.append(container); root = createRoot(container)
})
afterEach(async () => { if (root) await act(async () => root.unmount()); container.remove() })
after(async () => {
  await server?.close(); await dom?.happyDOM.close()
  for (const [name, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

async function settle() {
  await act(async () => {
    for (let i = 0; i < 300 && frames.size; i++) {
      const pending = [...frames.values()]; frames.clear(); clock += 16
      pending.forEach(callback => callback(clock))
    }
  })
  assert.equal(frames.size, 0, 'Animation settles without an autoplay loop')
}

async function pointer(type, x, y, timestamp, pointerType = 'mouse') {
  await act(async () => {
    const viewport = container.querySelector('.carousel-viewport')
    viewport.setPointerCapture = () => {}
    viewport.hasPointerCapture = () => false
    const event = new dom.PointerEvent(type, { pointerId: 1, pointerType, isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true })
    Object.defineProperty(event, 'timeStamp', { value: timestamp })
    viewport.dispatchEvent(event)
  })
}

test('empty, single and many cards render without demo content, arrows, dots or an autoplay timer', async () => {
  await render([])
  assert.ok(!container.querySelector('.orbit-carousel'))
  await render(items.slice(0, 1))
  assert.equal(container.querySelectorAll('.carousel-slide').length, 1)
  assert.equal(container.querySelector('.carousel-viewport').dataset.draggable, undefined)
  assert.equal(container.querySelector('button').tabIndex, 0)
  assert.ok(!container.querySelector('.carousel-hint'))
  await render()
  assert.equal(container.querySelectorAll('.carousel-slide').length, 5)
  assert.equal(container.querySelectorAll('button[tabindex="0"]').length, 1)
  assert.equal(container.querySelectorAll('button').length, 5)
  assert.equal(current(), '1 of 5')
  assert.equal(container.querySelector('[role="region"]').getAttribute('aria-label'), 'Recommended topics')
  assert.ok(!container.querySelector('img, .carousel-dots, .carousel-arrow'))
  assert.ok(container.textContent.includes(items[0].topic))
  await settle()
})

test('keyboard arrows, Home and End select bounded cards with a focusable action and live position', async () => {
  await render()
  const carousel = container.querySelector('.orbit-carousel')
  container.querySelector('button').focus()
  await key('ArrowRight')
  assert.equal(current(), '2 of 5')
  assert.ok(dom.document.activeElement === carousel)
  assert.equal(container.querySelector('[data-current] button').tabIndex, 0)
  await key('End'); await key('ArrowRight')
  assert.equal(current(), '5 of 5')
  assert.equal(container.querySelector('[role="status"]').textContent, 'Recommendation 5 of 5')
  await key('Home'); await key('ArrowLeft')
  assert.equal(current(), '1 of 5')
  await settle()
  await act(async () => container.querySelector('[data-current] button').click())
  assert.deepEqual(chosen, ['0'])
})

for (const kind of ['mouse', 'touch']) test(`${kind} drag snaps with momentum and suppresses its click, while a deliberate tap opens a card`, async () => {
  await render()
  await pointer('pointerdown', 270, 30, 0, kind)
  await pointer('pointermove', 200, 31, 30, kind)
  await pointer('pointermove', 80, 32, 60, kind)
  assert.doesNotMatch(container.querySelector('[data-current]').style.transform, /translate3d\(0px, 0, 0\)/, 'Changing the active card must not jump ahead of the drag')
  await pointer('pointerup', 70, 32, 75, kind)
  assert.notEqual(current(), '1 of 5')
  await act(async () => container.querySelector('[data-current] button').dispatchEvent(new dom.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })))
  assert.equal(chosen.length, 0)
  await settle()
  await pointer('pointerdown', 140, 30, 200, kind)
  await pointer('pointerup', 140, 30, 220, kind)
  await act(async () => container.querySelector('[data-current] button').dispatchEvent(new dom.MouseEvent('click', { bubbles: true, detail: 1 })))
  assert.equal(chosen.length, 1)
})

test('vertical gestures leave scrolling alone, horizontal wheel snaps, and cancelled drags recover', async () => {
  await render()
  await pointer('pointerdown', 250, 30, 0, 'touch')
  await pointer('pointermove', 240, 100, 30, 'touch')
  await pointer('pointerup', 240, 100, 60, 'touch')
  assert.equal(current(), '1 of 5')
  const vertical = new dom.WheelEvent('wheel', { deltaX: 1, deltaY: 80, cancelable: true })
  container.querySelector('.carousel-viewport').dispatchEvent(vertical)
  assert.equal(vertical.defaultPrevented, false)
  const horizontal = new dom.WheelEvent('wheel', { deltaX: 280, deltaY: 1, cancelable: true })
  await act(async () => container.querySelector('.carousel-viewport').dispatchEvent(horizontal))
  assert.equal(horizontal.defaultPrevented, true)
  assert.equal(current(), '2 of 5')
  await act(async () => new Promise(resolve => dom.setTimeout(resolve, 140)))
  await settle()
  await pointer('pointerdown', 220, 30, 200)
  await pointer('pointermove', 160, 30, 260)
  await pointer('pointercancel', 160, 30, 300)
  assert.equal(container.querySelector('.carousel-viewport').dataset.dragging, undefined)
  await settle()
})

test('reduced motion works at mount and when changed live, resize preserves selection, and unmount cleans up', async () => {
  motion.matches = true
  await render()
  await key('End')
  assert.equal(current(), '5 of 5')
  assert.equal(frames.size, 0)
  assert.match(container.querySelector('[data-current]').style.transform, /translate3d\(0px, 0, 0\) scale\(1\)/)
  viewportWidth = 272
  await act(async () => resize.notify())
  assert.equal(current(), '5 of 5')
  await act(async () => motion.change({ matches: false }))
  await key('Home')
  assert.ok(frames.size > 0)
  await act(async () => motion.change({ matches: true }))
  assert.equal(container.querySelector('.orbit-carousel').dataset.reducedMotion, 'true')
  await settle()
  await render(items.slice(0, 1))
  assert.equal(current(), '1 of 1')
  await act(async () => root.unmount()); root = null
  assert.equal(resize.disconnected, true)
  assert.equal(motion.change, null)
  assert.equal(frames.size, 0)
})
