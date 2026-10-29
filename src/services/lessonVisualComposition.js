// Infer only geometry from validated relationships, never facts from subject labels.
export function lessonVisualComposition(visual) {
  const order = visual.data.map((_, index) => index)
  const links = visual.links || []
  const collection = { kind: 'collection', order, columns: Math.min(2, order.length) }
  if (!links.length) return collection
  const incoming = order.map((index) => links.filter((link) => link.to === index))
  const outgoing = order.map((index) => links.filter((link) => link.from === index))

  if (links.every((link) => link.kind === 'contains')) {
    const roots = order.filter((index) => !incoming[index].length)
    const visited = new Set()
    const visit = (index) => {
      if (visited.has(index)) return
      visited.add(index)
      outgoing[index].forEach((link) => visit(link.to))
    }
    if (roots.length === 1) visit(roots[0])
    if (roots.length === 1 && incoming.every((edges) => edges.length <= 1) && visited.size === order.length) {
      return { kind: 'nested', root: roots[0], children: outgoing.map((edges) => edges.map((link) => link.to)), order }
    }
  }
  // Mixed containment, cycles, and complex graphs retain a readable relationship key.
  if (links.some((link) => link.kind === 'contains')) return { ...collection, kind: 'relationships' }
  const focus = visual.data.findIndex((item) => item.label === visual.focus)
  const star = (center) => links.length === order.length - 1 && links.every((link) => link.from === center || link.to === center) &&
    new Set(links.map((link) => link.from === center ? link.to : link.from)).size === order.length - 1
  if (focus >= 0 && star(focus) && (visual.type === 'concept_illustration' || (incoming[focus].length && outgoing[focus].length))) {
    // Symbol placement is schematic: light above and water below other inputs.
    const weight = (index) => visual.data[index].symbol === 'sun' ? -1 : visual.data[index].symbol === 'water' ? 1 : 0
    const inputs = incoming[focus].map((link) => link.from).sort((a, b) => weight(a) - weight(b))
    const outputs = outgoing[focus].map((link) => link.to)
    const rows = Math.max(inputs.length, outputs.length, 1)
    const centerColumn = inputs.length ? 2 : 1
    return { kind: visual.type === 'concept_illustration' ? 'mechanism' : 'hub', order: [...inputs, focus, ...outputs], center: focus,
      columns: centerColumn + (outputs.length ? 1 : 0), placements: {
        [focus]: { gridColumn: centerColumn, gridRow: `1 / span ${rows}` },
        ...Object.fromEntries(inputs.map((index, row) => [index, { gridColumn: 1, gridRow: row + 1 }])),
        ...Object.fromEntries(outputs.map((index, row) => [index, { gridColumn: centerColumn + 1, gridRow: row + 1 }])),
      } }
  }
  for (const center of order) {
    if (!star(center) || order.length < 3) continue
    const branching = outgoing[center].length === links.length
    const merging = incoming[center].length === links.length
    if (!branching && !merging) continue
    const peers = order.filter((index) => index !== center)
    return { kind: branching ? 'branch' : 'merge', center, columns: 2,
      order: branching ? [center, ...peers] : [...peers, center], placements: {
        [center]: { gridColumn: branching ? 1 : 2, gridRow: `1 / span ${peers.length}` },
        ...Object.fromEntries(peers.map((index, row) => [index, { gridColumn: branching ? 2 : 1, gridRow: row + 1 }])),
      } }
  }
  const roots = order.filter((index) => !incoming[index].length)
  if (links.length === order.length - 1 && roots.length === 1 && incoming.every((edges) => edges.length <= 1) && outgoing.every((edges) => edges.length <= 1)) {
    const chain = []
    let index = roots[0]
    while (index !== undefined && !chain.includes(index)) { chain.push(index); index = outgoing[index][0]?.to }
    if (chain.length === order.length) return { kind: 'flow', order: chain, columns: Math.min(3, order.length) }
  }
  return { ...collection, kind: 'relationships' }
}

// Endpoints attach outside measured symbols; turns stay in gutters, away from labels.
export function visualConnector(from, to, { vertical, flow }) {
  const fromY = from.top + from.height / 2, toY = to.top + to.height / 2
  if (vertical && !flow) return `M${from.left - 4},${fromY} H12 V${toY} H${to.left - 8}`
  if (vertical) {
    const x1 = from.left + from.width / 2, x2 = to.left + to.width / 2
    const start = from.bodyBottom + 8, end = to.top - 8
    return `M${x1},${start} V${(start + end) / 2} H${x2} V${end}`
  }
  const forward = from.left < to.left
  const start = forward ? from.left + from.width + 4 : from.left - 4
  const end = forward ? to.left - 8 : to.left + to.width + 8
  return `M${start},${fromY} H${(start + end) / 2} V${toY} H${end}`
}
