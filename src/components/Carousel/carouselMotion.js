// Adapted from React Bits Carousel (David Haz). See NOTICE.md for source and license.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function carouselGeometry(width, count) {
  const available = Math.max(0, Number.isFinite(width) ? width : 0)
  const peek = count > 1 ? Math.min(available / 4, clamp(available * .07, 16, 48)) : 0
  const cardWidth = Math.min(440, Math.max(0, available - peek * 2))
  return { width: available, cardWidth, span: Math.max(1, cardWidth + 12) }
}

export function carouselPose(index, position, { width, cardWidth, span, reduced }) {
  const offset = index - position
  const distance = Math.abs(offset)
  const near = Math.min(distance, 1)
  const x = offset * span - (reduced ? 0 : Math.sign(offset) * near * cardWidth * .02)
  return {
    transform: `translate3d(${x}px, 0, 0) scale(${reduced ? 1 : 1 - .04 * near})`,
    opacity: 1 - .24 * near,
    visible: Math.abs(x) < (width + cardWidth) / 2,
    layer: 10 - Math.min(9, Math.round(distance * 2)),
  }
}

export function rubberBand(value, max) {
  if (value < 0) return -.3 * (1 - Math.exp(value / .55))
  if (value > max) return max + .3 * (1 - Math.exp((max - value) / .55))
  return value
}
