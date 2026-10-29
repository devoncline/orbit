const types = ['none', 'diagram', 'process', 'comparison', 'concept_illustration', 'generated_image']
const visualType = (value) => value == null ? 'missing' : types.includes(value.type) ? value.type : 'invalid'

// Temporary routing diagnostics. Callers must explicitly enable this in development.
// Report concept presence, never the learner's concept text, labels, or prompt data.
export function logVisualRouting(enabled, { source, phase, concept, requested, normalized, rendered }) {
  if (!enabled) return
  console.debug('[Orbit visual]', {
    source: source === 'conversation' ? 'conversation' : 'lesson',
    phase: phase === 'display' ? 'display' : 'response',
    hasConcept: Boolean(concept),
    requestedType: visualType(requested),
    normalizedType: visualType(normalized),
    rendered: rendered === true,
  })
}
