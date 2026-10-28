import orbitHero from '../assets/mascot/orbit-hero-asset-transparent.png'
import orbitTeaching from '../assets/mascot/orbit-teaching-tilt-transparent.png'
import './OrbitStage.css'

// Visuals and annotations can enter independently without changing the learning controls.
// The current stage uses existing artwork only; empty slots render no placeholder UI.
export default function OrbitStage({ variant = 'study', thinking = false, children, annotations }) {
  const hasVisual = Boolean(children || annotations)

  return (
    <div
      className={`orbit-stage orbit-stage-${variant}${hasVisual ? ' orbit-stage-with-visual' : ''}`}
      aria-hidden={hasVisual ? undefined : true}
      role={hasVisual ? 'group' : undefined}
      aria-label={hasVisual ? 'Visual explanation' : undefined}
    >
      <img className="orbit-stage-companion" src={thinking ? orbitTeaching : orbitHero} alt="" width="1600" height="1600" decoding="async" />
      {children && <div className="orbit-stage-object">{children}</div>}
      {annotations && <div className="orbit-stage-annotations">{annotations}</div>}
    </div>
  )
}
