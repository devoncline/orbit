import { useSyncExternalStore } from 'react'
import { DEMO_LIMIT_MESSAGE, DEMO_VIDEO_URL, getDemoLimitSnapshot, subscribeDemoLimit } from '../services/demoUsage'

export default function DemoLimitNotice() {
  const limitedUntil = useSyncExternalStore(subscribeDemoLimit, getDemoLimitSnapshot, () => 0)
  return limitedUntil ? <aside className="demo-limit-notice" role="status">
    <p>{DEMO_LIMIT_MESSAGE} <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">Watch the full demo</a></p>
  </aside> : null
}
