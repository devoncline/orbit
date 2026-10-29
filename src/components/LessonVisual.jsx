import { useId } from 'react'
import { nativeLessonVisual } from '../services/learningPath'
import './LessonVisual.css'

// A small vocabulary of schematic objects, selected only by validated metadata.
// No chemistry, quantities, hierarchy, or direction are inferred from the labels.
function VisualObject({ symbol, fill }) {
  switch (symbol) {
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

function ConceptMark({ index }) {
  return <svg className="lesson-concept-mark" viewBox="0 0 100 80" aria-hidden="true" focusable="false">
    <ellipse cx="50" cy="40" rx="38" ry="16" transform={`rotate(${index % 2 ? 25 : -25} 50 40)`} />
    <rect x="32" y="22" width="36" height="36" rx={index % 2 ? 11 : 18} />
    <circle cx={index % 2 ? 20 : 80} cy="25" r="5" />
  </svg>
}

function VisualScene({ visual, id }) {
  const illustration = visual.type === 'concept_illustration'
  const focusIndex = illustration ? visual.data.findIndex((item) => item.label === visual.focus) : -1
  const outer = [[80, 70], [440, 70], [80, 250], [440, 250], [260, 285]]
  let satellite = 0
  const positions = visual.data.map((_, index) => focusIndex >= 0
    ? index === focusIndex ? [260, 165] : outer[satellite++]
    : [visual.data.length <= 3 ? (index + 1) * 520 / (visual.data.length + 1) : [85, 260, 435][index % 3],
      illustration ? visual.data.length <= 3 ? 100 : index < 3 ? 75 : 235
        : visual.data.length <= 3 || index < 3 ? 55 : 165])
  const height = focusIndex >= 0 ? 360 : illustration ? visual.data.length <= 3 ? 200 : 320 : visual.data.length <= 3 ? 110 : 230
  return <svg className="lesson-visual-scene" viewBox={`0 0 520 ${height}`} aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-surface`} cx="30%" cy="20%" r="85%">
        <stop stopColor="#d5e8ff" stopOpacity=".55" /><stop offset=".45" stopColor="#698bf4" stopOpacity=".32" /><stop offset="1" stopColor="#6356ac" stopOpacity=".1" />
      </radialGradient>
      <radialGradient id={`${id}-halo`}><stop stopColor="#839bff" stopOpacity=".18" /><stop offset="1" stopColor="#839bff" stopOpacity="0" /></radialGradient>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="m2 1 6 4-6 4" fill="none" stroke="#9daeff" strokeWidth="1.5" /></marker>
    </defs>
    {visual.links?.map((link, index) => {
      const [x1, y1] = positions[link.from], [x2, y2] = positions[link.to]
      const distance = Math.hypot(x2 - x1, y2 - y1)
      const dx = (x2 - x1) / distance, dy = (y2 - y1) / distance
      const start = [x1 + dx * 52, y1 + dy * 52], end = [x2 - dx * 58, y2 - dy * 58]
      // Long connections bow around intervening objects rather than passing through them.
      const bend = distance > 250 ? illustration ? 140 : 80 : Math.min(24, (distance - 110) / 4)
      return <path className="lesson-visual-link" key={index} d={`M${start} Q${(x1 + x2) / 2 - dy * bend},${(y1 + y2) / 2 + dx * bend} ${end}`} markerEnd={`url(#${id}-arrow)`} />
    })}
    {visual.data.map((item, index) => <g key={index} transform={`translate(${positions[index]})`} className="lesson-visual-object">
      <ellipse rx="75" ry="65" fill={`url(#${id}-halo)`} />
      {illustration ? <g className="lesson-object-shape" transform={index === focusIndex ? 'scale(1.2)' : undefined}><VisualObject symbol={item.symbol} fill={`url(#${id}-surface)`} /></g>
        : <rect className="lesson-diagram-node" x="-47" y="-33" width="94" height="66" rx="22" fill={`url(#${id}-surface)`} />}
      <g transform={illustration ? 'translate(37 -35)' : undefined}>
        {illustration && <circle className="lesson-object-number" r="17" />}
        <text className="lesson-scene-number" textAnchor="middle" dominantBaseline="central">{index + 1}</text>
      </g>
    </g>)}
  </svg>
}

function ObjectLegend({ visual }) {
  return <ul className="lesson-visual-legend">
    {visual.data.map((item, index) => <li key={index}>
      <span className="lesson-visual-number" aria-hidden="true">{index + 1}</span>
      <div><strong>{item.label}</strong><p>{item.detail}</p></div>
    </li>)}
  </ul>
}

export default function LessonVisual({ visual: value }) {
  const id = useId()
  const visual = nativeLessonVisual(value)
  if (!visual) return null
  const connected = visual.type === 'diagram' || visual.type === 'concept_illustration'
  return <figure className={`lesson-visual lesson-visual-${visual.type}`} aria-labelledby={`${id}-caption`}>
    <figcaption id={`${id}-caption`}>
      <span className="lesson-visual-eyebrow">{visual.type === 'process' ? 'Step by step' : visual.type === 'comparison' ? 'Side by side' : 'Picture the idea'}</span>
      <span>{visual.purpose}</span>
    </figcaption>
    {connected ? <>
      <VisualScene visual={visual} id={id} />
      <ObjectLegend visual={visual} />
      {!!visual.links?.length && <ul className="lesson-visual-relationships" aria-label="Connections">
        {visual.links.map((link, index) => <li key={index}>
          <strong>{visual.data[link.from].label}</strong><span aria-hidden="true"> → </span><span className="lesson-visual-sr"> to </span><strong>{visual.data[link.to].label}</strong><span> · {link.label}</span>
        </li>)}
      </ul>}
    </> : visual.type === 'process' ? <ol className={`lesson-process-steps${visual.data.length > 3 ? ' lesson-process-steps-long' : ''}`}>
      {visual.data.map((item, index) => <li key={index}>
        <span className="lesson-process-node" aria-hidden="true">{index + 1}</span>
        <div><strong>{item.label}</strong><p>{item.detail}</p></div>
      </li>)}
    </ol> : <ul className="lesson-comparison-areas">
      {visual.data.map((item, index) => <li key={index}>
        <ConceptMark index={index} /><strong>{item.label}</strong><p>{item.detail}</p>
      </li>)}
    </ul>}
    {visual.focus && !visual.data.some((item) => item.label === visual.focus) && <p className="lesson-visual-focus">{visual.focus}</p>}
  </figure>
}
