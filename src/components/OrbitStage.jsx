import { useEffect, useRef } from 'react'
import orbitHero from '../assets/mascot/orbit-hero-asset-transparent.png'
import orbitTeaching from '../assets/mascot/orbit-teaching-tilt-transparent.png'
import { getThinkingCopy, startThinkingMotion } from './orbitThinking'
import './OrbitStage.css'

// Visuals and annotations can enter independently without changing the learning controls.
// The current stage uses existing artwork only; empty slots render no placeholder UI.
export default function OrbitStage({ variant = 'study', thinking = false, thinkingContext = 'thinking', children, annotations }) {
  const hasVisual = Boolean(children || annotations)
  const motion = useRef(null)
  const copy = getThinkingCopy(thinkingContext)

  useEffect(() => startThinkingMotion(motion.current, thinking), [thinking])

  return (
    <div
      className={`orbit-stage orbit-stage-${variant}${hasVisual ? ' orbit-stage-with-visual' : ''}`}
      role={hasVisual ? 'group' : undefined}
      aria-label={hasVisual ? 'Visual explanation' : undefined}
    >
      <div className="orbit-stage-companion" aria-hidden="true">
        <div className="orbit-stage-thinking-motion" ref={motion}>
          <img className="orbit-stage-artwork" src={thinking ? orbitTeaching : orbitHero} alt="" width="1600" height="1600" decoding="async" />
        </div>
      </div>
      {thinking && <div className="orbit-thoughts" aria-hidden="true">
        {copy.fragments.map((fragment) => <span className="orbit-thought-fragment" key={fragment}>{fragment}</span>)}
        <span className="orbit-thought-trail"><i /><i /><i /></span>
      </div>}
      <span className="orbit-thinking-status" role="status" aria-live="polite" aria-atomic="true">{thinking ? copy.status : ''}</span>
      {children && <div className="orbit-stage-object">{children}</div>}
      {annotations && <div className="orbit-stage-annotations">{annotations}</div>}
    </div>
  )
}
