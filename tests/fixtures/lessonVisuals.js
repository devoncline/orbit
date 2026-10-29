// Representative teaching metadata shared by composition checks and local visual review.
export const lessonVisuals = {
  process: { type: 'process', purpose: 'A request becomes a useful response.', focus: '', data: [
    { label: 'Request', detail: 'A client asks for information.', symbol: 'component' },
    { label: 'Handle', detail: 'The server prepares the result.', symbol: 'container' },
    { label: 'Response', detail: 'The result returns to the client.', symbol: 'component' },
  ], links: [{ from: 0, to: 1, label: 'Send' }, { from: 1, to: 2, label: 'Return' }] },
  reuse: { type: 'diagram', purpose: 'One component, several places to use it.', focus: 'Button component', data: [
    { label: 'Button component', detail: 'Defines the shared structure.', symbol: 'component' },
    { label: 'Save', detail: 'An instance with a save label.', symbol: 'component' },
    { label: 'Continue', detail: 'An instance with a continue label.', symbol: 'component' },
    { label: 'Try again', detail: 'An instance with a retry label.', symbol: 'component' },
  ], links: [1, 2, 3].map((to) => ({ from: 0, to, label: 'Reused with different props' })) },
  mechanism: { type: 'concept_illustration', purpose: 'Light powers the making of sugars.', focus: 'Leaf', data: [
    { label: 'Sunlight', detail: 'Provides light energy.', symbol: 'sun' },
    { label: 'Leaf', detail: 'Chlorophyll captures light for photosynthesis.', symbol: 'leaf' },
    { label: 'Water', detail: 'Arrives from the roots.', symbol: 'water' },
    { label: 'Carbon dioxide', detail: 'Enters from the air.', symbol: 'molecule' },
    { label: 'Glucose', detail: 'Stores chemical energy.', symbol: 'molecule' },
    { label: 'Oxygen', detail: 'Is released into the air.', symbol: 'molecule' },
  ], links: [{ from: 0, to: 1, label: 'Supplies energy' }, { from: 2, to: 1, label: 'Supplies water' }, { from: 3, to: 1, label: 'Supplies carbon dioxide' }, { from: 1, to: 4, label: 'Produces sugar' }, { from: 1, to: 5, label: 'Releases oxygen' }] },
  comparison: { type: 'comparison', purpose: 'Two ways a component receives information.', focus: '', data: [
    { label: 'Props', detail: 'Inputs supplied by a parent.', symbol: 'component' },
    { label: 'State', detail: 'Values remembered by the component.', symbol: 'container' },
  ] },
  sequence: { type: 'process', purpose: 'The opening steps of C major, from C to A.', focus: 'Whole steps and half steps describe the distance between notes.',
    data: ['C', 'D', 'E', 'F', 'G', 'A'].map((label) => ({ label, detail: `${label} in the ascending pattern.`, symbol: 'note' })),
    links: ['Whole step', 'Whole step', 'Half step', 'Whole step', 'Whole step'].map((label, from) => ({ from, to: from + 1, label })),
  },
}
