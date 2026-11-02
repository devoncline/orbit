import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { act, createElement } from 'react'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { carouselGeometry } from '../src/components/Carousel/carouselMotion.js'

let dom, server, createRoot, Carousel, root, container, viewportWidth, resize, motion, frames, clock
const globals = new Map()
const items = Array.from({ length: 5 }, (_, index) => ({ id: String(index), topic: `A long topic ${index} ${'with more detail '.repeat(8)}` }))
const chosen = []
const props = (entries = items) => ({ items: entries, renderItem: (item, active) => createElement('button', {
  type: 'button', tabIndex: active ? 0 : -1, onClick: () => chosen.push(item.id),
}, item.topic) })
const render = async (entries = items, options = {}) => act(async () => root.render(createElement(Carousel, { ...props(entries), ...options })))
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

const fourItems = items.slice(0, 4)
const slideX = slide => Number(slide.style.transform.match(/translate3d\(([^p]+)px/)[1])

test('looping four cards starts with neighbors on both sides without cloning slides or changing data', async () => {
  await render(fourItems, { loop: true })
  const slides = [...container.querySelectorAll('.carousel-slide')]
  assert.equal(slides.length, 4)
  assert.deepEqual(slides.map(slide => slide.textContent), fourItems.map(item => item.topic))
  assert.equal(current(), '1 of 4')
  assert.equal(slides[3].style.visibility, 'visible')
  assert.equal(slides[1].style.visibility, 'visible')
  assert.ok(slideX(slides[3]) < 0)
  assert.ok(slideX(slides[1]) > 0)
  assert.equal(container.querySelectorAll('button[tabindex="0"]').length, 1)
  await settle()
})

test('looping keyboard navigation wraps repeatedly, announces real indices, and keeps Home/End and focus working', async () => {
  const changes = []
  await render(fourItems, { loop: true, onChange: index => changes.push(index) })
  const carousel = container.querySelector('.orbit-carousel')
  container.querySelector('button').focus()
  let selected = 0
  for (const direction of [-1, 1]) {
    for (let step = 0; step < 10; step++) {
      await key(direction === 1 ? 'ArrowRight' : 'ArrowLeft')
      selected = (selected + direction + 4) % 4
      assert.equal(current(), `${selected + 1} of 4`)
      assert.equal(container.querySelector('[role="status"]').textContent, `Recommendation ${selected + 1} of 4`)
      assert.equal(changes.at(-1), selected)
      assert.ok(dom.document.activeElement === carousel)
      assert.equal(container.querySelectorAll('button[tabindex="0"]').length, 1)
      await settle()
    }
  }
  await key('End'); await settle()
  assert.equal(current(), '4 of 4')
  await key('Home'); await settle()
  assert.equal(current(), '1 of 4')
  await act(async () => container.querySelector('[data-current] button').click())
  assert.deepEqual(chosen, ['0'])
})

for (const direction of [-1, 1]) test(`loop seam ${direction} keeps the active card continuous through spring snapping and rebasing`, async () => {
  await render(fourItems, { loop: true, initialIndex: direction === 1 ? 3 : 0 })
  await settle()
  const incoming = container.querySelectorAll('.carousel-slide')[direction === 1 ? 0 : 3]
  let previous = slideX(incoming)
  const span = carouselGeometry(viewportWidth, 4).span
  await key(direction === 1 ? 'ArrowRight' : 'ArrowLeft')
  assert.equal(slideX(incoming), previous, 'Selecting the incoming card does not reset its live position')
  for (let i = 0; i < 300 && frames.size; i++) {
    await act(async () => {
      const pending = [...frames.values()]; frames.clear(); clock += 16
      pending.forEach(callback => callback(clock))
    })
    const next = slideX(incoming)
    assert.ok(Math.abs(next - previous) < span * .2, 'Each frame moves smoothly across the seam')
    previous = next
  }
  assert.equal(frames.size, 0)
  assert.equal(slideX(incoming), 0)
  assert.equal(current(), direction === 1 ? '1 of 4' : '4 of 4')
})

for (const width of [272, 640]) for (const kind of ['mouse', 'touch']) test(`looped ${kind} drag crosses multiple cycles in both directions at ${width}px`, async () => {
  viewportWidth = width
  await render(fourItems, { loop: true })
  await settle()
  const { span } = carouselGeometry(width, 4)
  let selected = 0
  let time = 0
  for (const direction of [1, -1]) {
    await pointer('pointerdown', 160, 30, time, kind)
    for (let step = 1; step <= 9; step++) {
      time += 150
      await pointer('pointermove', 160 - direction * span * step, 31, time, kind)
      selected = (selected + direction + 4) % 4
      assert.equal(current(), `${selected + 1} of 4`)
      assert.ok(Math.abs(slideX(container.querySelector('[data-current]'))) < .001)
    }
    await pointer('pointerup', 160 - direction * span * 9, 31, time + 20, kind)
    await settle()
    assert.equal(current(), `${selected + 1} of 4`)
    await act(async () => container.querySelector('[data-current] button').dispatchEvent(new dom.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })))
    assert.equal(chosen.length, 0, 'Dragging across a seam does not open a recommendation')
    time += 500
  }
})

test('looped wheel, live reduced motion, resizing and smaller lists preserve valid selection', async () => {
  motion.matches = true
  await render(fourItems, { loop: true })
  await key('ArrowLeft')
  assert.equal(current(), '4 of 4')
  assert.equal(frames.size, 0)
  const wheel = async deltaX => act(async () => container.querySelector('.carousel-viewport').dispatchEvent(new dom.WheelEvent('wheel', { deltaX, deltaY: 0, cancelable: true })))
  const { span } = carouselGeometry(viewportWidth, 4)
  await wheel(span * 5)
  assert.equal(current(), '1 of 4')
  await wheel(-span * 5)
  assert.equal(current(), '4 of 4')
  await act(async () => new Promise(resolve => dom.setTimeout(resolve, 140)))
  viewportWidth = 640
  await act(async () => resize.notify())
  assert.equal(current(), '4 of 4')
  assert.match(container.querySelector('[data-current]').style.transform, /translate3d\(0px, 0, 0\) scale\(1\)/)
  await act(async () => motion.change({ matches: false }))
  await key('ArrowRight')
  assert.equal(current(), '1 of 4')
  await act(async () => motion.change({ matches: true }))
  await settle()
  assert.match(container.querySelector('[data-current]').style.transform, /translate3d\(0px, 0, 0\) scale\(1\)/)
  await render(fourItems.slice(0, 2), { loop: true })
  await key('ArrowLeft')
  assert.equal(current(), '2 of 2')
  await render(fourItems.slice(0, 1), { loop: true })
  await key('ArrowLeft'); await key('ArrowRight')
  assert.equal(current(), '1 of 1')
  assert.ok(!container.querySelector('.carousel-hint'))
  await render([], { loop: true })
  assert.ok(!container.querySelector('.orbit-carousel'))
  await render(fourItems, { loop: true })
  assert.equal(current(), '1 of 4')
})

for (const loop of [false, true]) for (const kind of ['mouse', 'touch']) test(`${loop ? 'Looped ' : ''}${kind} drag snaps with momentum and suppresses its click, while a deliberate tap opens a card`, async () => {
  await render(loop ? fourItems : items, { loop, initialIndex: loop ? 3 : 0 })
  await pointer('pointerdown', 270, 30, 0, kind)
  await pointer('pointermove', 200, 31, 30, kind)
  await pointer('pointermove', 80, 32, 60, kind)
  assert.doesNotMatch(container.querySelector('[data-current]').style.transform, /translate3d\(0px, 0, 0\)/, 'Changing the active card must not jump ahead of the drag')
  await pointer('pointerup', 70, 32, 75, kind)
  assert.notEqual(current(), loop ? '4 of 4' : '1 of 5')
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
