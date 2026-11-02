// React Bits Carousel, adapted for Orbit. Source and license: ./NOTICE.md.
// Retains the pointer/velocity/spring engine; removes demo cards, autoplay and 3D effects.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { carouselGeometry, carouselPose, clamp, nearest, rubberBand, wrap } from './carouselMotion'
import './Carousel.css'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const STIFFNESS = 150
const DAMPING = 24

export default function Carousel({ items = [], renderItem, label = 'Recommended topics', initialIndex = 0, loop = false, onChange }) {
  const count = items.length
  const hasItems = count > 0
  const [width, setWidth] = useState(300)
  const [active, setActive] = useState(() => clamp(initialIndex, 0, Math.max(0, count - 1)))
  const rootRef = useRef(null)
  const viewportRef = useRef(null)
  const slideRefs = useRef([])
  const settingsRef = useRef(null)
  const engineRef = useRef(null)
  const startRef = useRef(active)
  const instructionsId = useId()
  const looping = loop && count > 1
  const geometry = { ...carouselGeometry(width, count), count, loop: looping }

  useIsomorphicLayoutEffect(() => { startRef.current = clamp(active, 0, Math.max(0, count - 1)) }, [active, count])

  useIsomorphicLayoutEffect(() => {
    settingsRef.current = { ...carouselGeometry(width, count), count, loop: looping, onChange }
    engineRef.current?.sync()
  }, [width, count, looping, onChange])

  // React updates slide semantics as selection changes; keep its styles at the live drag position.
  useIsomorphicLayoutEffect(() => { engineRef.current?.paint() })

  useEffect(() => {
    const root = rootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = { p: startRef.current, v: 0, target: startRef.current, shown: startRef.current,
      reduced: media.matches, drag: null, wheeling: false, wheelTimer: 0, suppress: false, suppressTimer: 0, last: 0 }
    let raf = 0
    let alive = true
    const limit = value => settingsRef.current.loop ? value : clamp(value, 0, Math.max(0, settingsRef.current.count - 1))

    const apply = () => {
      const settings = { ...settingsRef.current, reduced: state.reduced }
      root.dataset.reducedMotion = String(state.reduced)
      for (let i = 0; i < settings.count; i++) {
        const slide = slideRefs.current[i]
        if (!slide) continue
        const next = carouselPose(i, state.p, settings)
        slide.style.transform = next.transform
        slide.style.opacity = String(next.opacity)
        slide.style.visibility = next.visible ? 'visible' : 'hidden'
        slide.style.zIndex = String(next.layer)
      }
    }
    const announce = () => {
      const { count, loop } = settingsRef.current
      const index = loop ? wrap(Math.round(state.target), count) : limit(Math.round(state.target))
      if (index === state.shown) return
      state.shown = index
      const focused = root.ownerDocument.activeElement
      if (root.contains(focused) && focused?.closest('.carousel-slide')) root.focus({ preventScroll: true })
      setActive(index)
      settingsRef.current.onChange?.(index)
    }
    const tick = now => {
      raf = 0
      if (!alive) return
      const dt = state.last ? Math.min(.05, (now - state.last) / 1000) : 1 / 60
      state.last = now
      let busy = false
      if (!state.drag?.moved && !state.wheeling) {
        if (state.reduced) { state.p = state.target; state.v = 0 }
        else {
          const steps = Math.ceil(dt * 240)
          const h = dt / steps
          for (let k = 0; k < steps; k++) {
            state.v += (STIFFNESS * (state.target - state.p) - DAMPING * state.v) * h
            state.p += state.v * h
          }
          if (Math.abs(state.target - state.p) < .0004 && Math.abs(state.v) < .004) { state.p = state.target; state.v = 0 }
          else busy = true
        }
        // Rebase only after settling; wrapped poses are identical on either side of the seam.
        if (!busy && settingsRef.current.loop) {
          state.target = wrap(Math.round(state.target), settingsRef.current.count)
          state.p = state.target
        }
      }
      apply()
      if (busy) raf = window.requestAnimationFrame(tick)
      else state.last = 0
    }
    const wake = () => { if (!raf && alive) raf = window.requestAnimationFrame(tick) }
    const moveTo = value => {
      state.target = limit(Math.round(value))
      if (state.reduced) {
        if (settingsRef.current.loop) state.target = wrap(state.target, settingsRef.current.count)
        state.p = state.target; state.v = 0
      }
      announce()
      apply()
      if (!state.reduced) wake()
    }
    const onPointerDown = event => {
      if (settingsRef.current.count < 2 || event.isPrimary === false || event.button !== 0) return
      window.clearTimeout(state.suppressTimer)
      state.suppress = false
      state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, p: state.p,
        from: Math.round(state.target), moved: false, samples: [[event.timeStamp, event.clientX]] }
    }
    const onPointerMove = event => {
      const drag = state.drag
      if (!drag || event.pointerId !== drag.id) return
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y
      if (!drag.moved) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        if (Math.abs(dy) > Math.abs(dx)) { state.drag = null; return }
        drag.moved = true
        viewport.setPointerCapture?.(event.pointerId)
        viewport.dataset.dragging = 'true'
      }
      const raw = drag.p - dx / settingsRef.current.span
      state.p = settingsRef.current.loop ? raw : rubberBand(raw, settingsRef.current.count - 1)
      state.v = 0
      state.target = limit(Math.round(state.p))
      drag.samples.push([event.timeStamp, event.clientX])
      if (drag.samples.length > 8) drag.samples.shift()
      announce()
      apply()
    }
    const finishDrag = event => {
      const drag = state.drag
      if (!drag || event.pointerId !== drag.id) return
      state.drag = null
      delete viewport.dataset.dragging
      if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
      if (!drag.moved) return
      state.suppress = true
      window.clearTimeout(state.suppressTimer)
      state.suppressTimer = window.setTimeout(() => { state.suppress = false }, 350)
      const sample = drag.samples.find(([time]) => event.timeStamp - time < 90) ?? [event.timeStamp, event.clientX]
      const elapsed = Math.max(16, event.timeStamp - sample[0])
      const cancelled = event.type !== 'pointerup'
      const velocity = state.reduced || cancelled ? 0 : clamp(((sample[1] - event.clientX) / elapsed) * (1000 / settingsRef.current.span), -12, 12)
      const travelled = state.p - drag.from
      let target = Math.round(state.p + velocity * .2)
      if (!cancelled && target === drag.from) {
        if (Math.abs(velocity) > .8) target += Math.sign(velocity)
        else if (Math.abs(travelled) > .18) target += Math.sign(travelled)
      }
      state.v = settingsRef.current.loop || (state.p >= 0 && state.p <= settingsRef.current.count - 1) ? velocity : 0
      moveTo(target)
    }
    const onClickCapture = event => {
      // Keyboard activation has detail=0 and must remain available after a swipe.
      if (!state.suppress || event.detail === 0) return
      event.preventDefault()
      event.stopPropagation()
      state.suppress = false
    }
    const onWheel = event => {
      if (settingsRef.current.count < 2 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      const raw = state.p + event.deltaX / settingsRef.current.span
      state.p = settingsRef.current.loop ? raw : clamp(raw, -.15, settingsRef.current.count - .85)
      state.v = 0
      state.wheeling = true
      state.target = limit(Math.round(state.p))
      announce()
      apply()
      window.clearTimeout(state.wheelTimer)
      state.wheelTimer = window.setTimeout(() => { state.wheeling = false; moveTo(state.p) }, 120)
    }
    const onKeyDown = event => {
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      const { count, loop } = settingsRef.current
      const goTo = goal => loop ? state.target + nearest(goal - wrap(state.target, count), count) : goal
      const keys = { ArrowRight: state.target + 1, ArrowLeft: state.target - 1, Home: goTo(0), End: goTo(count - 1) }
      if (!(event.key in keys)) return
      event.preventDefault()
      moveTo(keys[event.key])
      root.focus({ preventScroll: true })
    }
    const onMotionChange = event => { state.reduced = event.matches; moveTo(state.target) }
    const measure = () => {
      const measured = viewport.getBoundingClientRect().width
      if (measured > 0) setWidth(measured)
    }
    const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(measure) : null
    observer?.observe(viewport)
    window.addEventListener('resize', measure)
    media.addEventListener('change', onMotionChange)
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointermove', onPointerMove)
    viewport.addEventListener('pointerup', finishDrag)
    viewport.addEventListener('pointercancel', finishDrag)
    viewport.addEventListener('lostpointercapture', finishDrag)
    viewport.addEventListener('click', onClickCapture, true)
    viewport.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('keydown', onKeyDown)
    engineRef.current = { paint: apply, sync: () => { state.p = limit(state.p); moveTo(state.target) } }
    measure()
    engineRef.current.sync()
    return () => {
      alive = false
      window.cancelAnimationFrame(raf)
      window.clearTimeout(state.wheelTimer)
      window.clearTimeout(state.suppressTimer)
      observer?.disconnect()
      engineRef.current = null
      window.removeEventListener('resize', measure)
      media.removeEventListener('change', onMotionChange)
      viewport.removeEventListener('pointerdown', onPointerDown)
      viewport.removeEventListener('pointermove', onPointerMove)
      viewport.removeEventListener('pointerup', finishDrag)
      viewport.removeEventListener('pointercancel', finishDrag)
      viewport.removeEventListener('lostpointercapture', finishDrag)
      viewport.removeEventListener('click', onClickCapture, true)
      viewport.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKeyDown)
    }
  }, [hasItems])

  if (!count) return null
  const selected = Math.min(active, count - 1)
  return <div className="orbit-carousel" ref={rootRef} role="region" aria-roledescription="carousel"
    aria-label={label} aria-describedby={count > 1 ? instructionsId : undefined} tabIndex={count > 1 ? 0 : -1}>
    <div className="carousel-viewport" ref={viewportRef} data-draggable={count > 1 ? 'true' : undefined} data-single={count === 1 ? 'true' : undefined}>
      {items.map((item, index) => {
        const initial = carouselPose(index, selected, geometry)
        return <div key={item.id} ref={element => { slideRefs.current[index] = element }} className="carousel-slide"
          role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} aria-hidden={index !== selected}
          data-current={index === selected ? 'true' : undefined}
          style={{ transform: initial.transform, opacity: initial.opacity, visibility: initial.visible ? 'visible' : 'hidden', zIndex: initial.layer }}>
          {renderItem(item, index === selected)}
        </div>
      })}
    </div>
    {count > 1 && <>
      <p className="carousel-hint" id={instructionsId}>Drag or swipe to explore<span className="carousel-sr-only">. Use Left and Right arrow keys, Home or End to browse. Tab to choose a topic.</span></p>
      <span className="carousel-sr-only" role="status" aria-live="polite" aria-atomic="true">Recommendation {selected + 1} of {count}</span>
    </>}
  </div>
}
