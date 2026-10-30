// Both teaching routes describe the same schema consumed by normalizeLessonVisual.
export const lessonVisualPrompt = `
Orbit can request an instructional image from Muse Image using structured metadata. Keep the text explanation useful on its own, including if image generation fails.
Choose visual.type as "none" when imagery adds no meaningful teaching value, or "generated_image" when it materially improves understanding. Do not automatically request an image for every lesson.
A generated_image has purpose (under 240 characters: exactly what the image should teach), data (1-6 objects with a short label under 120 and concise detail under 240 characters), and focus (under 120 characters: what should receive visual emphasis).
Choose composition to fit the teaching purpose: process for ordered steps/transformations (data in teaching order); diagram for relationships, systems, inputs/outputs or data flow; comparison for contrasts; concept_illustration for physical structure, spatial metaphors or scientific mechanisms. Processes and comparisons should usually have at least two items.
Optionally include links: [{"from": 0, "to": 1, "label": "supplies energy to"}]. Indices refer to data. Include only explicit, accurate directed relationships, at most 8. Do not invent quantities, causal links, or scientific structures. Do not turn simultaneous inputs or reused instances into sequential steps. Only actual containment may add "kind":"contains".
When adapting to confusion, optionally include recoveryContext (under 400 characters) describing only the conceptual difficulty and the changed teaching approach, without personal details or conversation transcripts.
Describe a polished educational illustration with a clear relationship/process/structure, minimal necessary text, and no decorative or unrelated imagery. Use exact teaching details; do not specify generic planets or stock-art filler.
Never supply HTML, SVG, URLs, image bytes, or scripts. Put visual metadata outside the text response, never inside prose or a code block.
`
