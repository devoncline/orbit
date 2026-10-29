// Both teaching routes describe the same schema consumed by normalizeLessonVisual.
export const lessonVisualPrompt = `
Orbit can render native visuals using structured metadata. Keep the text explanation useful on its own.
Choose the type to fit the teaching purpose:
- process: ordered steps, transformations, sequences, or progression; data must be in teaching order.
- diagram: relationships between parts, systems, inputs/outputs, data flow, or cause/effect structure.
- comparison: contrasting two or more concepts.
- concept_illustration: physical/scientific concepts, spatial teaching metaphors, or abstract ideas that benefit from a visual scene.
- none: only when a visual would not materially improve understanding.
generated_image is deferred and cannot render. Prefer a suitable native type; do not request image generation.
A native visual has type, purpose (under 240 characters), data (1-6 objects with a short label under 120 and concise detail under 240 characters), and focus (under 120 characters).
Diagram, process, and comparison need at least 2 items.
For diagram or concept_illustration, optionally include links: [{"from": 0, "to": 1, "label": "supplies energy to"}]. Indices refer to data; include only explicit, accurate directed relationships, at most 8. Without links, objects are shown without connections. One-to-many links show branching/reuse; many-to-one links show convergence. A focused object with incoming/outgoing links becomes a mechanism scene. Do not turn simultaneous inputs or reused instances into sequential steps.
Only when one item truly contains another, a link may add "kind":"contains". A valid containment tree renders nested objects; ordinary direction must not imply containment. Do not supply coordinates or layout instructions.
For process, data order supplies the sequence; optional links between adjacent items may label the transition (for example "whole step" or "half step"). Only include note/interval relationships actually supported by the lesson; do not invent missing steps. Prefer a diagram for relationships that are not a sequence.
For any native type, each data item may include one symbol: plant, leaf, sun, water, molecule, container, slots, planet, component, or note. Choose a fitting simplified metaphor; omit the symbol when none fits. Use symbols to distinguish inputs, objects, and results instead of numbered boxes. These are schematic objects, not exact structures or quantities. Set focus to the main object's exact label when there is one, and supply its actual incoming/outgoing links. Keep primary labels and connection labels especially short; details explain the idea alongside the object.
Never supply HTML, SVG, URLs, image bytes, or scripts. Put visual metadata outside the text response, never inside prose or a code block.
`
