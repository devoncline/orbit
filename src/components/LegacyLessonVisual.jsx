import { useEffect, useId, useMemo, useRef } from 'react'
import { nativeLessonVisual } from '../services/learningPath'
import { lessonVisualComposition, visualConnector } from '../services/lessonVisualComposition'
import './LessonVisual.css'

// A small vocabulary of schematic objects, selected only by validated metadata.
// No chemistry, quantities, hierarchy, or direction are inferred from the labels.
function VisualObject({ symbol, fill }) {
  switch (symbol) {
    case 'leaf': return <g className="lesson-object-plant" fill={fill}><path d="M-34 28Q-43-31 35-40Q46 28-34 28Z" /><path d="M-40 40 24-27 M-21 19-24-8 M-5 2 20 7 M8-13 6-29" fill="none" /></g>
    case 'note': return <g fill={fill}><ellipse cx="-14" cy="25" rx="17" ry="12" transform="rotate(-20 -14 25)" /><path d="M2 25V-37Q12-23 28-21V-7Q11-10 2-18" /></g>
    case 'plant': return <g className="lesson-object-plant">
      <path d="M0 38 Q-4 7 2-26 M0 13 Q-20 5-27-10 M1 0 Q24-2 29-21" fill="none" />
      <path d="M0 4 Q-39 3-36-29 Q-2-28 0 4 M3-10 Q3-44 33-43 Q38-13 3-10 M2 23 Q16-8 41 3 Q35 28 2 23" fill={fill} />
      <path d="M0 4-27-20 M3-10 26-34 M2 23 31 9 M0 38-15 47 M0 38 18 46" fill="none" />
    </g>
    case 'sun': return <g className="lesson-object-sun">
      <circle r="24" fill={fill} />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0-33V-43" transform={`rotate(${i * 45})`} />)}
    </g>
    case 'water': return <path className="lesson-object-water" d="M0-41C-8-24-28-6-28 12a28 28 0 0 0 56 0C28-6 8-24 0-41Z" fill={fill} />
    case 'molecule': return <g>
      <circle r="30" fill={fill} />
      <path d="M-18-8Q-15-21 0-22 M10 23Q21 19 24 9" fill="none" />
    </g>
    case 'container': return <g fill={fill}>
      <rect x="-41" y="-35" width="82" height="70" rx="17" />
      <rect x="-25" y="-19" width="50" height="38" rx="10" />
      <path d="M-15 0H15" />
    </g>
    case 'slots': return <g fill={fill}>
      {[-30, 0, 30].map((x) => <rect key={x} x={x - 12} y="-18" width="24" height="36" rx="7" />)}
      <path d="M-43 29H43" fill="none" />
    </g>
    case 'planet': return <g fill={fill}>
      <circle r="26" /><ellipse rx="45" ry="13" transform="rotate(-25)" fill="none" />
      <circle cx="38" cy="-25" r="5" />
    </g>
    case 'component': return <g fill={fill}>
      <rect x="-39" y="-30" width="78" height="60" rx="13" />
      <path d="M-39-13H39 M-18-23H-17 M-6-23H-5 M-20 1-28 9-20 17 M20 1 28 9 20 17 M5-1-5 20" fill="none" />
    </g>
    default: return <g fill={fill}><circle r="29" /><ellipse rx="42" ry="15" transform="rotate(-30)" fill="none" /><circle cx="34" cy="-23" r="5" /></g>
  }
}

function Symbol({ symbol, id }) {
  return <svg className="lesson-symbol-anchor" viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
    <defs><radialGradient id={id} cx="25%" cy="15%" r="90%"><stop stopColor="#c2ddff" stopOpacity=".6" /><stop offset=".5" stopColor="#7696ec" stopOpacity=".25" /><stop offset="1" stopColor="#846ac4" stopOpacity=".08" /></radialGradient></defs>
    <g className="lesson-object-shape"><VisualObject symbol={symbol} fill={`url(#${id})`} /></g>
  </svg>
}

function ObjectContent({ item, id }) {
  return <><Symbol symbol={item.symbol} id={id} /><div className="lesson-object-copy"><strong>{item.label}</strong><p>{item.detail}</p></div></>
}

function Connections({ visual, links = visual.links }) {
  if (!links?.length) return null
  return <ul className="lesson-visual-relationships" aria-label="Connections">
    {links.map((link, index) => <li key={index}><strong>{visual.data[link.from].label}</strong><span aria-hidden="true"> → </span><span className="lesson-visual-sr"> to </span><strong>{visual.data[link.to].label}</strong><span> · {link.label}</span></li>)}
  </ul>
}

function GraphScene({ visual, composition, id }) {
  const map = useRef(null)
  const connected = !['collection', 'relationships'].includes(composition.kind)
  useEffect(() => {
    const element = map.current
    if (!connected || !element) return
    const update = () => {
      const bounds = element.getBoundingClientRect()
      if (!bounds.width) return
      const vertical = getComputedStyle(element).getPropertyValue('--visual-direction').trim() === 'vertical'
      const boxes = Object.fromEntries([...element.querySelectorAll('[data-visual-item]')].map((node) => {
        const symbol = node.querySelector('.lesson-symbol-anchor').getBoundingClientRect()
        return [node.dataset.visualItem, { left: symbol.left - bounds.left, top: symbol.top - bounds.top,
          width: symbol.width, height: symbol.height, bodyBottom: node.getBoundingClientRect().bottom - bounds.top }]
      }))
      element.querySelectorAll('[data-visual-link]').forEach((path, index) => {
        const link = visual.links[index]
        path.setAttribute('d', visualConnector(boxes[link.from], boxes[link.to], { vertical, flow: composition.kind === 'flow' }))
      })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    element.querySelectorAll('[data-visual-item]').forEach((node) => observer?.observe(node))
    window.addEventListener('resize', update)
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [visual, composition, connected])
  return <div ref={map} className={`lesson-visual-map lesson-map-${composition.kind}${composition.kind === 'flow' && visual.data.length > 3 ? ' lesson-map-long' : ''}`} style={{ '--visual-columns': composition.columns }}>
    {connected && <svg className="lesson-connectors" aria-hidden="true" focusable="false">
      <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="m2 1 6 4-6 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
      {visual.links.map((_, index) => <path key={index} data-visual-link={index} className="lesson-visual-link" markerEnd={`url(#${id}-arrow)`} />)}
    </svg>}
    {composition.order.map((index) => <div key={index} data-visual-item={index} className={`lesson-visual-object${index === composition.center ? ' lesson-object-focus' : ''}`} style={composition.placements?.[index]}>
      <ObjectContent item={visual.data[index]} id={`${id}-object-${index}`} />
    </div>)}
  </div>
}

function NestedScene({ visual, composition, id, index = composition.root }) {
  return <div className="lesson-nested-container" data-visual-item={index}>
    <div className="lesson-nested-heading"><ObjectContent item={visual.data[index]} id={`${id}-object-${index}`} /></div>
    {!!composition.children[index].length && <div className="lesson-nested-children">{composition.children[index].map((child) => <NestedScene key={child} visual={visual} composition={composition} id={id} index={child} />)}</div>}
  </div>
}

function Process({ visual, id }) {
  return <ol className={`lesson-process-steps${visual.data.length > 3 ? ' lesson-process-steps-long' : ''}`} role="list" style={{ '--process-columns': visual.data.length }}>
    {visual.data.map((item, index) => <li key={index}>
      <div className="lesson-process-object"><ObjectContent item={item} id={`${id}-object-${index}`} /></div>
      {index < visual.data.length - 1 && <div className="lesson-process-transition"><span className="lesson-flow-line" aria-hidden="true" /><span>{visual.links?.find((link) => link.from === index && link.to === index + 1)?.label}</span></div>}
    </li>)}
  </ol>
}

// Rollback/reference only. StudySession never imports this renderer.
export default function LegacyLessonVisual({ visual: value }) {
  const id = useId()
  const visual = useMemo(() => nativeLessonVisual(value), [value])
  const composition = useMemo(() => visual ? lessonVisualComposition(visual) : null, [visual])
  if (!visual) return null
  const connected = visual.type === 'diagram' || visual.type === 'concept_illustration'
  return <figure className={`lesson-visual lesson-visual-${visual.type}`} aria-labelledby={`${id}-caption`}>
    <figcaption id={`${id}-caption`}>
      <span className="lesson-visual-eyebrow">{visual.type === 'process' ? 'Follow the change' : visual.type === 'comparison' ? 'Side by side' : visual.type === 'concept_illustration' ? 'Explore the idea' : 'See the connections'}</span>
      <span className="lesson-visual-purpose">{visual.purpose}</span>
    </figcaption>
    {connected ? <>
      {composition.kind === 'nested' ? <NestedScene visual={visual} composition={composition} id={id} /> : <GraphScene visual={visual} composition={composition} id={id} />}
      <Connections visual={visual} />
    </> : visual.type === 'process' ? <><Process visual={visual} id={id} /><Connections visual={visual} links={visual.links?.filter((link) => link.to !== link.from + 1)} /></> : <ul className="lesson-comparison-areas">
      {visual.data.map((item, index) => <li key={index}>
        <ObjectContent item={item} id={`${id}-object-${index}`} />
      </li>)}
    </ul>}
    {visual.focus && !visual.data.some((item) => item.label === visual.focus) && <p className="lesson-visual-focus">{visual.focus}</p>}
  </figure>
}
