import { useEffect, useRef, useState } from 'react'
import orbitHero from '../assets/mascot/orbit-hero-asset-transparent.png'
import orbitTeaching from '../assets/mascot/orbit-teaching-tilt-transparent.png'
import orbitShy from '../assets/mascot/orbit-shy-asset-transparent.png'
import orbitCelebrating from '../assets/mascot/orbit-celebrating-asset-transparent.png'
import { getThinkingCopy, nextThinkingRequest, startCelebrationMotion, startThinkingMotion } from './orbitThinking'
import { startFidgetMotion } from './orbitFidget'
import './OrbitStage.css'

// Visuals and annotations can enter independently without changing the learning controls.
// The current stage uses existing artwork only; empty slots render no placeholder UI.
export default function OrbitStage({ variant = 'study', interaction = 'none', thinking = false, thinkingContext = 'thinking', expression = 'rest', children, annotations }) {
  const hasVisual = Boolean(children || annotations)
  const motion = useRef(null)
  const celebration = useRef(null)
  const hitArea = useRef(null)
  const follow = useRef(null)
  const press = useRef(null)
  const fidget = useRef(null)
  const interactive = interaction === 'fidget' || interaction === 'gentle'
  const [request, setRequest] = useState(() => nextThinkingRequest(null, thinking, thinkingContext))
  const nextRequest = nextThinkingRequest(request, thinking, thinkingContext)
  // Adjust only when a request starts/ends or is superseded. Streaming rerenders
  // keep the same pair, and no global counter is shared across study threads.
  if (nextRequest !== request) setRequest(nextRequest)
  const copy = getThinkingCopy(thinkingContext, nextRequest.sequence)
  const pose = thinking ? 'thinking' : ['shy', 'celebrating'].includes(expression) ? expression : 'rest'
  const artwork = { rest: orbitHero, thinking: orbitTeaching, shy: orbitShy, celebrating: orbitCelebrating }[pose]

  useEffect(() => startThinkingMotion(motion.current, thinking), [thinking])
  const celebrating = pose === 'celebrating'
  useEffect(() => startCelebrationMotion(celebration.current, celebrating), [celebrating])
  useEffect(() => {
    if (!interactive) return
    const controller = startFidgetMotion(hitArea.current, follow.current, press.current)
    fidget.current = controller
    return () => { controller?.dispose(); fidget.current = null }
  }, [interactive])
  useEffect(() => { fidget.current?.update(interaction, pose) }, [interaction, pose, interactive])

  return (
    <div
      className={`orbit-stage orbit-stage-${variant}${hasVisual ? ' orbit-stage-with-visual' : ''}`}
      data-expression={pose}
      role={hasVisual ? 'group' : undefined}
      aria-label={hasVisual ? 'Visual explanation' : undefined}
    >
      <div className="orbit-stage-companion" aria-hidden="true">
        <div className="orbit-stage-fidget-motion" ref={follow}>
          <div className="orbit-stage-press-motion" ref={press}>
            <div className="orbit-stage-thinking-motion" ref={motion}>
              <div className="orbit-stage-celebration-motion" ref={celebration}>
                <div className="orbit-stage-idle-motion">
                  <img className="orbit-stage-artwork" src={artwork} alt="" width="1600" height="1600" decoding="async" draggable="false" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {interactive && <div className="orbit-stage-hit-area" ref={hitArea} />}
      </div>
      {thinking && <div className="orbit-thoughts" aria-hidden="true">
        {copy.fragments.map((fragment) => <span className="orbit-thought-fragment" key={fragment}>{fragment}</span>)}
      </div>}
      <span className="orbit-thinking-status" role="status" aria-live="polite" aria-atomic="true">{thinking ? copy.status : ''}</span>
      {children && <div className="orbit-stage-object">{children}</div>}
      {annotations && <div className="orbit-stage-annotations">{annotations}</div>}
    </div>
  )
}
