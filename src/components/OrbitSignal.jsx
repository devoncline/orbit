import { useState } from 'react'
import orbitThinking from '../assets/mascot/orbit-teaching-tilt-transparent.png'
import { getThinkingCopy, nextThinkingRequest } from './orbitThinking'
import StudyContent from './StudyContent'
import './OrbitSignal.css'

// OrbitStage owns the single request announcement. This local cue is visual.
export default function OrbitSignal({ context, sequence = 0 }) {
  return <div className="orbit-signal" aria-hidden="true" data-thinking-context={context}>
    <img className="orbit-signal-mascot" src={orbitThinking} alt="" width="1600" height="1600" />
    <span>{getThinkingCopy(context, sequence).fragments[0]}</span>
  </div>
}

// Loading replaces the old result without reserving its height. Structured
// result reveals are display-only; network streaming is owned by the caller.
export function OrbitResponse({ pending, context, children, busy = pending, reveal }) {
  const [request, setRequest] = useState(() => nextThinkingRequest(null, pending, context))
  const nextRequest = nextThinkingRequest(request, pending, context)
  if (nextRequest !== request) setRequest(nextRequest)

  return <div className="orbit-response" data-orbit-result={context} aria-busy={busy}>
    <div className="orbit-response-content" aria-live={!busy && context === 'conversation' ? 'polite' : 'off'}>
      {pending ? reveal?.context === context
        ? <div className="study-result-reveal" aria-hidden="true"><StudyContent content={reveal.text} /></div>
        : <OrbitSignal context={context} sequence={nextRequest.sequence} />
        : children}
    </div>
  </div>
}
