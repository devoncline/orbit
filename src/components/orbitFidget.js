// Decorative input only: no expression, request, or learning state belongs here.
// Tracking, drag and press/release each own a transform outside the state animations.
export function startFidgetMotion(hitArea, follow, press, drag) {
  const view = hitArea?.ownerDocument.defaultView
  if (!view?.matchMedia || !follow || !press || !drag) return
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)')
  const precise = view.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  const removers = []
  let strength = 1
  let hovered = false
  let point = null
  let held = null
  let frame = null
  let animation = null
  let dragFrame = null
  let offset = { x: 0, y: 0 }
  let dragTarget = null
  let returning = null
  let currentPose = 'rest'

  function listen(target, event, handler) {
    target.addEventListener(event, handler, { passive: true })
    removers.push(() => target.removeEventListener(event, handler))
  }

  function track() {
    if (frame !== null || reduced.matches) return
    frame = view.requestAnimationFrame(() => {
      frame = null
      if (returning || held?.dragging || held?.carried) return
      if (!hovered || !point) { follow.style.transform = ''; return }
      // This box is stationary, so tracking cannot feed back into hit testing.
      const box = hitArea.getBoundingClientRect()
      if (!box.width || !box.height) { follow.style.transform = ''; return }
      const clamp = value => Math.max(-1, Math.min(1, value))
      const x = clamp((point.x - box.left - box.width / 2) / (box.width / 2))
      const y = clamp((point.y - box.top - box.height / 2) / (box.height / 2))
      follow.style.transform = `translate(${x * 7 * strength}px, ${y * 7 * strength}px) rotate(${x * 2 * strength}deg) scale(${1 + 0.02 * strength})`
    })
  }

  function play(poses, options) {
    if (!press.animate || reduced.matches) return
    const from = view.getComputedStyle(press).transform
    animation?.cancel()
    const next = press.animate([{ transform: from, offset: 0, easing: 'ease-out' }, ...poses], options)
    animation = next
    // Ignore superseded completions; a held press deliberately retains its pose.
    next.finished?.then(() => {
      if (animation === next && options.fill !== 'forwards') animation = null
    }, () => {})
  }

  function settlePress() {
    if (animation) play([{ transform: 'scale(1)', offset: 1 }], { duration: 180, easing: 'ease-out' })
  }

  function drawDrag(position) {
    offset = position
    drag.style.transform = position.x || position.y ? `translate(${position.x}px, ${position.y}px)` : ''
  }

  function stopDragFrame() {
    if (dragFrame !== null) view.cancelAnimationFrame(dragFrame)
    dragFrame = null
    dragTarget = null
    returning = null
  }

  function scheduleDrag() {
    if (dragFrame !== null || reduced.matches) return
    dragFrame = view.requestAnimationFrame(time => {
      dragFrame = null
      if (returning) {
        returning.start ??= time
        const t = Math.min(1, (time - returning.start) / returning.duration)
        // Damped spring: about 6% opposite overshoot, no velocity accumulation.
        const factor = returning.spring ? Math.exp(-9 * t) * (Math.cos(10 * t) + 0.9 * Math.sin(10 * t)) : (1 - t) ** 3
        drawDrag(t === 1 ? { x: 0, y: 0 } : { x: returning.x * factor, y: returning.y * factor })
        if (t === 1) { returning = null; track() }
        else scheduleDrag()
      } else if (dragTarget) {
        drawDrag(dragTarget)
        dragTarget = null
      }
    })
  }

  function returnHome(spring = true) {
    // Only the last rendered offset owns the return, never a stale queued target.
    stopDragFrame()
    if (!offset.x && !offset.y) { track(); return }
    returning = { ...offset, start: null, duration: spring ? 560 : 360, spring }
    scheduleDrag()
  }

  function releasePointer() {
    const id = held?.id
    held = null // A synchronous lostpointercapture must not end the gesture twice.
    if (id !== undefined && hitArea.hasPointerCapture?.(id)) hitArea.releasePointerCapture(id)
  }

  function cancelHeld() {
    releasePointer()
    settlePress()
    returnHome(false)
  }

  function rememberPointer(event, captured = false) {
    point = { x: event.clientX, y: event.clientY }
    hovered = precise.matches && ['mouse', 'pen'].includes(event.pointerType)
    if (hovered && captured) {
      const box = hitArea.getBoundingClientRect()
      // Captured events target the hit area even when the pointer is outside it.
      hovered = box.width > 0 && box.height > 0 && Math.hypot(
        (point.x - box.left - box.width / 2) / (box.width / 2),
        (point.y - box.top - box.height / 2) / (box.height / 2),
      ) <= 1
    } else if (hovered) hovered = event.target === hitArea
  }

  function pointerMove(event) {
    if (reduced.matches || event.isPrimary === false || (held && held.id !== event.pointerId)) return
    if (!held && !returning && !hovered && event.target !== hitArea) return
    rememberPointer(event, Boolean(held))
    if (held) {
      const dx = event.clientX - held.x, dy = event.clientY - held.y
      if (!held.dragging && Math.hypot(dx, dy) >= 8) {
        // Vertical touch starts belong to page scrolling; horizontal starts can drag.
        if (held.type === 'touch' && Math.abs(dy) >= Math.abs(dx)) { cancelHeld(); return }
        held.dragging = true
        follow.style.transform = view.getComputedStyle(follow).transform
        settlePress()
        // Capture only after intent is clear. Window listeners also cover unsupported capture.
        try { hitArea.setPointerCapture?.(held.id) } catch { /* The pointer may already have been cancelled. */ }
      }
      if (held.dragging) {
        const x = held.origin.x + dx * 0.45 * strength, y = held.origin.y + dy * 0.45 * strength
        const distance = Math.hypot(x, y)
        const scale = distance > held.limit ? held.limit / distance : 1
        dragTarget = { x: x * scale, y: y * scale }
        scheduleDrag()
        return
      }
    }
    track()
  }

  function pointerDown(event) {
    if (reduced.matches || held || event.isPrimary === false || event.button !== 0) return
    // Catch an in-flight return at its visible position, then use this press as a new origin.
    stopDragFrame()
    const carried = Boolean(offset.x || offset.y)
    const sizeLimit = Math.min(event.pointerType === 'touch' || !precise.matches ? 44 : 60, hitArea.getBoundingClientRect().width * 0.3)
    held = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
      dragging: false, carried, origin: { ...offset }, limit: Math.max(Math.hypot(offset.x, offset.y), sizeLimit * strength) }
    rememberPointer(event)
    play([{ transform: `scale(${1 - 0.035 * strength})`, offset: 1 }], { duration: 90, easing: 'ease-out', fill: 'forwards' })
  }

  function pointerUp(event) {
    if (held?.id !== event.pointerId) return
    rememberPointer(event, true)
    const wasDrag = held.dragging || held.carried
    const moved = Math.hypot(event.clientX - held.x, event.clientY - held.y) >= 8
    releasePointer()
    if (wasDrag || moved) { settlePress(); returnHome(wasDrag); return }
    play([
      // Rebound immediately from the visible press pose, even on a very quick tap.
      { transform: `scale(${1 + 0.045 * strength})`, offset: 0.3, easing: 'ease-in-out' },
      { transform: `scale(${1 - 0.012 * strength})`, offset: 0.7, easing: 'ease-in-out' },
      { transform: 'scale(1)', offset: 1 },
    ], { duration: 440 })
  }

  function leave() {
    hovered = false
    point = null
    track()
  }

  function cancel(event) {
    if (held?.id === event.pointerId) { leave(); cancelHeld() }
  }

  function clear() {
    if (frame !== null) view.cancelAnimationFrame(frame)
    frame = null
    animation?.cancel()
    animation = null
    releasePointer()
    stopDragFrame()
    drawDrag({ x: 0, y: 0 })
    hovered = false
    point = null
    follow.style.transform = ''
    press.style.transform = ''
  }

  listen(hitArea, 'pointerenter', pointerMove)
  listen(view, 'pointermove', pointerMove)
  listen(hitArea, 'pointerleave', leave)
  listen(hitArea, 'pointerdown', pointerDown)
  listen(hitArea, 'lostpointercapture', cancel)
  // Observe outside the region too, including before the drag threshold/capture.
  listen(view, 'pointerup', pointerUp)
  listen(view, 'pointercancel', cancel)
  listen(view, 'blur', () => { leave(); cancelHeld() })
  listen(hitArea.ownerDocument, 'visibilitychange', () => { if (hitArea.ownerDocument.hidden) clear() })
  listen(reduced, 'change', clear)
  listen(precise, 'change', () => { leave(); cancelHeld() })

  return {
    update(mode, pose) {
      const stateMotion = ['thinking', 'celebrating'].includes(pose)
      const nextStrength = (mode === 'gentle' ? 0.75 : 1) * (stateMotion ? 0.35 : 1)
      const changingMotion = nextStrength !== strength || (pose !== currentPose && stateMotion)
      strength = nextStrength
      if (changingMotion && (held?.dragging || held?.carried || returning)) cancelHeld()
      currentPose = pose
      // State changes soften the follow target without restarting a bounce or state motion.
      // An already running, bounded bounce finishes on its own independent layer.
      if (hovered) track()
    },
    dispose() { removers.forEach(remove => remove()); clear() },
  }
}
