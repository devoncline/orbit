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
For diagram or concept_illustration, optionally include links: [{"from": 0, "to": 1, "label": "supplies energy to"}]. Indices refer to data; include only explicit, accurate directed relationships, at most 8. Without links, objects are shown without connections.
For concept_illustration, each data item may include one symbol: plant, sun, water, molecule, container, slots, planet, or component. Choose only a fitting simplified metaphor; omit the symbol when none fits. These are schematic objects, not exact structures or quantities. Set focus to the main object's exact label when there is one.
Never supply HTML, SVG, URLs, image bytes, or scripts. Put visual metadata outside the text response, never inside prose or a code block.
`
