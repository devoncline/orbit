// Decorative input only: no expression, request, or learning state belongs here.
// Tracking and press/release each own a transform outside the state animations.
export function startFidgetMotion(hitArea, follow, press) {
  const view = hitArea?.ownerDocument.defaultView
  if (!view?.matchMedia || !follow || !press) return
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)')
  const precise = view.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  const removers = []
  let strength = 1
  let hovered = false
  let point = null
  let held = null
  let frame = null
  let animation = null

  function listen(target, event, handler) {
    target.addEventListener(event, handler, { passive: true })
    removers.push(() => target.removeEventListener(event, handler))
  }

  function track() {
    if (frame !== null || reduced.matches) return
    frame = view.requestAnimationFrame(() => {
      frame = null
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
    held = null
    if (animation) play([{ transform: 'scale(1)', offset: 1 }], { duration: 180, easing: 'ease-out' })
  }

  function pointerMove(event) {
    if (reduced.matches || event.isPrimary === false) return
    if (held?.id === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10) settlePress()
    if (!precise.matches || !['mouse', 'pen'].includes(event.pointerType)) return
    hovered = true
    point = { x: event.clientX, y: event.clientY }
    track()
  }

  function pointerDown(event) {
    if (reduced.matches || held || event.isPrimary === false || event.button !== 0) return
    held = { id: event.pointerId, x: event.clientX, y: event.clientY }
    play([{ transform: `scale(${1 - 0.035 * strength})`, offset: 1 }], { duration: 90, easing: 'ease-out', fill: 'forwards' })
  }

  function pointerUp(event) {
    if (held?.id !== event.pointerId) return
    if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10) { settlePress(); return }
    held = null
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
    if (held) settlePress()
  }

  function cancel(event) {
    if (held?.id === event.pointerId) leave()
  }

  function clear() {
    if (frame !== null) view.cancelAnimationFrame(frame)
    frame = null
    animation?.cancel()
    animation = null
    held = null
    hovered = false
    point = null
    follow.style.transform = ''
    press.style.transform = ''
  }

  listen(hitArea, 'pointerenter', pointerMove)
  listen(hitArea, 'pointermove', pointerMove)
  listen(hitArea, 'pointerleave', leave)
  listen(hitArea, 'pointerdown', pointerDown)
  listen(hitArea, 'lostpointercapture', cancel)
  // Observe release outside the region without capturing a drag or preventing scroll.
  listen(view, 'pointerup', pointerUp)
  listen(view, 'pointercancel', cancel)
  listen(view, 'blur', () => { const wasHeld = Boolean(held); leave(); if (!wasHeld) settlePress() })
  listen(hitArea.ownerDocument, 'visibilitychange', () => { if (hitArea.ownerDocument.hidden) clear() })
  listen(reduced, 'change', clear)
  listen(precise, 'change', leave)

  return {
    update(mode, pose) {
      strength = (mode === 'gentle' ? 0.75 : 1) * (['thinking', 'celebrating'].includes(pose) ? 0.35 : 1)
      // State changes soften the follow target without restarting a bounce or state motion.
      // An already running, bounded bounce finishes on its own independent layer.
      if (hovered) track()
    },
    dispose() { removers.forEach(remove => remove()); clear() },
  }
}
