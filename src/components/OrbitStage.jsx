import { useEffect, useRef, useState } from 'react'
import orbitIdle from '../assets/mascot/orbit-idle-loop.webm'
import orbitTeaching from '../assets/mascot/orbit-teaching-tilt-transparent.png'
import orbitSleep from '../assets/mascot/orbit-sleep-loop.webm'
import orbitBreakthrough from '../assets/mascot/orbit-breakthrough-loop.webm'
import { getThinkingCopy, nextThinkingRequest, startCelebrationMotion, startThinkingMotion } from './orbitThinking'
import { startFidgetMotion } from './orbitFidget'
import './OrbitStage.css'

// Edit per-state sources and video speeds here. All supplied loops play at 1x.
const ORBIT_MEDIA = {
  rest: { src: orbitIdle, type: 'video', playbackRate: 1 },
  shy: { src: orbitSleep, type: 'video', playbackRate: 1 },
  celebrating: { src: orbitBreakthrough, type: 'video', playbackRate: 1 },
  thinking: { src: orbitTeaching, type: 'image' },
}

// Visuals and annotations can enter independently without changing the learning controls.
// The current stage uses existing artwork only; empty slots render no placeholder UI.
export default function OrbitStage({ variant = 'study', interaction = 'none', thinking = false, thinkingContext = 'thinking', expression = 'rest', children, annotations }) {
  const hasVisual = Boolean(children || annotations)
  const motion = useRef(null)
  const celebration = useRef(null)
  const hitArea = useRef(null)
  const follow = useRef(null)
  const press = useRef(null)
  const drag = useRef(null)
  const fidget = useRef(null)
  const interactive = interaction === 'fidget' || interaction === 'gentle'
  const [request, setRequest] = useState(() => nextThinkingRequest(null, thinking, thinkingContext))
  const nextRequest = nextThinkingRequest(request, thinking, thinkingContext)
  // Adjust only when a request starts/ends or is superseded. Streaming rerenders
  // keep the same pair, and no global counter is shared across study threads.
  if (nextRequest !== request) setRequest(nextRequest)
  const copy = getThinkingCopy(thinkingContext, nextRequest.sequence)
  const pose = thinking ? 'thinking' : ['shy', 'celebrating'].includes(expression) ? expression : 'rest'
  const artwork = ORBIT_MEDIA[pose]

  useEffect(() => startThinkingMotion(motion.current, thinking), [thinking])
  const celebrating = pose === 'celebrating'
  useEffect(() => startCelebrationMotion(celebration.current, celebrating), [celebrating])
  useEffect(() => {
    if (!interactive) return
    const controller = startFidgetMotion(hitArea.current, follow.current, press.current, drag.current)
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
          <div className="orbit-stage-drag-motion" ref={drag}>
            <div className="orbit-stage-press-motion" ref={press}>
              <div className="orbit-stage-thinking-motion" ref={motion}>
                <div className="orbit-stage-celebration-motion" ref={celebration}>
                  <div className="orbit-stage-idle-motion">
                    {artwork.type === 'video'
                      ? <video key={artwork.src} className="orbit-stage-artwork" src={artwork.src} width="1600" height="1600"
                        autoPlay loop muted playsInline preload="auto" draggable="false" onLoadedMetadata={(event) => {
                          event.currentTarget.defaultPlaybackRate = artwork.playbackRate
                          event.currentTarget.playbackRate = artwork.playbackRate
                        }} />
                      : <img className="orbit-stage-artwork" src={artwork.src} alt="" width="1600" height="1600" decoding="async" draggable="false" />}
                  </div>
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
