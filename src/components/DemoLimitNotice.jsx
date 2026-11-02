import { useSyncExternalStore } from 'react'
import { aiErrorMessage, DEMO_VIDEO_URL, getDemoLimitSnapshot, subscribeDemoLimit } from '../services/demoUsage'

export default function DemoLimitNotice() {
  const limit = useSyncExternalStore(subscribeDemoLimit, getDemoLimitSnapshot, () => null)
  return limit ? <aside className="demo-limit-notice" role="status">
    <p>{aiErrorMessage(limit)} <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">Watch the full demo</a></p>
  </aside> : null
}
