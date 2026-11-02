import launchPadCompact from '../assets/mastery/mastery-launch-pad-compact.svg'
import launchPadStandard from '../assets/mastery/mastery-launch-pad-standard.svg'
import inOrbitCompact from '../assets/mastery/mastery-in-orbit-compact.svg'
import inOrbitStandard from '../assets/mastery/mastery-in-orbit-standard.svg'
import cruisingCompact from '../assets/mastery/mastery-cruising-compact.svg'
import cruisingStandard from '../assets/mastery/mastery-cruising-standard.svg'
import deepSpaceCompact from '../assets/mastery/mastery-deep-space-compact.svg'
import deepSpaceStandard from '../assets/mastery/mastery-deep-space-standard.svg'
import missionReadyCompact from '../assets/mastery/mastery-mission-ready-compact.svg'
import missionReadyStandard from '../assets/mastery/mastery-mission-ready-standard.svg'
import './MasteryBadge.css'

const assets = {
  'launch-pad': { compact: { src: launchPadCompact, height: 32 }, standard: { src: launchPadStandard, height: 52 } },
  'in-orbit': { compact: { src: inOrbitCompact, height: 32 }, standard: { src: inOrbitStandard, height: 52 } },
  cruising: { compact: { src: cruisingCompact, height: 32 }, standard: { src: cruisingStandard, height: 53 } },
  'deep-space': { compact: { src: deepSpaceCompact, height: 33 }, standard: { src: deepSpaceStandard, height: 55 } },
  'mission-ready': { compact: { src: missionReadyCompact, height: 33 }, standard: { src: missionReadyStandard, height: 56 } },
}

export default function MasteryBadge({ rank, size = 'compact', decorative = false }) {
  const artwork = assets[rank?.id]
  if (!artwork) return null
  const variant = size === 'standard' ? 'standard' : 'compact'
  const width = variant === 'standard' ? 52 : 32
  // The exports include different amounts of glow; retain their actual aspect ratios.
  return <img className={`mastery-badge mastery-badge-${variant}`} src={artwork[variant].src} width={width} height={artwork[variant].height}
    alt={decorative ? '' : `${rank.label} mastery`} aria-hidden={decorative ? 'true' : undefined} />
}
