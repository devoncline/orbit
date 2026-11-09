import process from 'node:process'
import { PORTFOLIO_RESPONSE } from '../../src/services/portfolioMode.js'

// Only server configuration can select this mode. Request bodies, headers,
// cookies, and query parameters cannot turn inference back on.
export function respondInPortfolioMode(res) {
  if (process.env.ORBIT_PORTFOLIO_MODE?.trim().toLowerCase() !== 'true') return false
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Orbit-Mode', 'portfolio')
  res.status(200).json(PORTFOLIO_RESPONSE)
  return true
}
