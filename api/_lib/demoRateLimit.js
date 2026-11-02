import process from 'node:process'
import { createHmac, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { lessonImageRequest } from '../../src/services/lessonImageRequest.js'

export const DEMO_AI_ACTION_LIMIT = 25
export const DEMO_AI_ACTION_WINDOW_HOURS = 6
export const DEMO_GLOBAL_AI_ACTION_LIMIT = 750
export const DEMO_GLOBAL_AI_ACTION_WINDOW_HOURS = 24
const WINDOW_SECONDS = DEMO_AI_ACTION_WINDOW_HOURS * 60 * 60
const GLOBAL_WINDOW_SECONDS = DEMO_GLOBAL_AI_ACTION_WINDOW_HOURS * 60 * 60
const IMAGE_ALLOWANCE_SECONDS = 10 * 60

// One atomic Upstash EVAL checks BOTH quotas before reserving either. Keep the
// visitor's existing anchored window; the global sorted set is a true rolling
// log using Redis time and unique server-generated members (at most 750 live).
// Included images already belong to a reserved parent action in both quotas.
export const CONSUME_ACTION_SCRIPT = `
if ARGV[3] == '1' then
  local images = tonumber(redis.call('GET', KEYS[2]) or '0')
  if images > 0 and redis.call('TTL', KEYS[2]) > 0 then
    if images == 1 then redis.call('DEL', KEYS[2])
    else redis.call('DECR', KEYS[2]) end
    return {1, 0}
  end
end
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = tonumber(ARGV[2])
if count > 0 then
  ttl = redis.call('TTL', KEYS[1])
  if ttl <= 0 then return redis.error_reply('Invalid expiry') end
  if count >= tonumber(ARGV[1]) then return {0, ttl} end
end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local window = tonumber(ARGV[5]) * 1000
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now - window)
if redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[4]) then
  local oldest = redis.call('ZRANGE', KEYS[3], 0, 0, 'WITHSCORES')
  return {2, math.max(1, math.ceil((tonumber(oldest[2]) + window - now) / 1000))}
end
redis.call('ZADD', KEYS[3], now, ARGV[6])
redis.call('EXPIRE', KEYS[3], ARGV[5])
if count == 0 then redis.call('SET', KEYS[1], 1, 'EX', ARGV[2])
else redis.call('INCR', KEYS[1]) end
return {1, ttl}
`

export const INCLUDE_IMAGE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return count
`

function localDevelopment(env) {
  // Explicit local/test runtime only. A deployed preview, custom environment or
  // production cannot opt out by setting NODE_ENV=development/test.
  const deployed = (env.VERCEL && env.VERCEL_ENV !== 'development') ||
    (env.VERCEL_ENV && env.VERCEL_ENV !== 'development') ||
    (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'development')
  return !deployed && ['development', 'test'].includes(env.NODE_ENV)
}

function visitorAddress(req, env) {
  // Vercel overwrites this header at its edge. Never trust generic forwarded
  // headers or a body/cookie identifier. Off Vercel, use the direct socket peer.
  const value = env.VERCEL === '1' || env.VERCEL_ENV
    ? req.headers?.['x-vercel-forwarded-for'] : req.socket?.remoteAddress
  if (typeof value !== 'string' || !isIP(value.trim())) throw new Error('Missing visitor')
  const ip = value.trim()
  return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip
}

function unavailable(res) {
  res.status(503).json({ error: 'demo_temporarily_unavailable', message: 'AI is temporarily unavailable. You can still explore Orbit. Please try again shortly.' })
  return { allowed: false, reason: 'unavailable' }
}

// Dependencies are injectable for tests; production uses only server environment
// configuration and Redis REST. No request data can select a store or bypass.
export function createDemoRateLimiter({ env = process.env, fetch: request = (...args) => fetch(...args) } = {}) {
  return async function enforce(req, res, { imageContext } = {}) {
    res.setHeader?.('Cache-Control', 'no-store')
    if (!env.MODEL_API_KEY) return unavailable(res)
    if (localDevelopment(env)) return { allowed: true, includeImage: async () => true }

    try {
      const secret = env.DEMO_RATE_LIMIT_SECRET
      const token = env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN
      const url = new URL(env.UPSTASH_REDIS_REST_KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL)
      if (!secret || secret.length < 32 || !token || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Missing configuration')
      const digest = (value) => createHmac('sha256', secret).update(value).digest('hex')
      const visitor = digest(visitorAddress(req, env))
      // Do not include host/deployment IDs: aliases and redeploys share a budget.
      const namespace = `orbit:demo:v1:${env.VERCEL_ENV || 'production'}`
      const prefix = `${namespace}:{${visitor}}`
      const imageKey = (context) => {
        const bounded = lessonImageRequest(context)
        if (!bounded) throw new Error('Invalid image context')
        return `${prefix}:image:${digest(JSON.stringify(bounded))}`
      }
      const command = async (body) => {
        const response = await request(url.href, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body), signal: AbortSignal.timeout(3000), redirect: 'error',
        })
        if (!response.ok) throw new Error('Store unavailable')
        const data = await response.json()
        if (data.error) throw new Error('Store unavailable')
        return data.result
      }
      // Existing visitor/image keys remain valid. Upstash's default script lock
      // covers all declared keys, including this shared, non-visitor global key.
      const result = await command(['EVAL', CONSUME_ACTION_SCRIPT, 3, `${prefix}:actions`,
        imageContext ? imageKey(imageContext) : `${prefix}:unused`,
        `${namespace}:global:actions`, DEMO_AI_ACTION_LIMIT, WINDOW_SECONDS, imageContext ? '1' : '0',
        DEMO_GLOBAL_AI_ACTION_LIMIT, GLOBAL_WINDOW_SECONDS, randomUUID()])
      if (!Array.isArray(result) || result.length !== 2 || ![0, 1, 2].includes(result[0]) ||
        !Number.isInteger(result[1]) || result[1] < 0 ||
        result[1] > (result[0] === 2 ? GLOBAL_WINDOW_SECONDS : WINDOW_SECONDS) ||
        (result[0] !== 1 && !result[1])) throw new Error('Invalid store response')
      if (result[0] !== 1) {
        const global = result[0] === 2
        res.setHeader?.('Retry-After', String(result[1]))
        res.status(429).json({
          error: global ? 'demo_capacity_reached' : 'demo_limit_reached',
          message: global ? "Orbit's public demo has reached its current AI capacity." : "You've reached the AI limit for Orbit's public demo.",
          retryAfterSeconds: result[1],
        })
        return { allowed: false, reason: global ? 'global_capacity' : 'visitor_limit' }
      }
      return {
        allowed: true,
        // Only called with validated SERVER output after a counted text action.
        // Nothing is sent to the browser: exact context + visitor must match,
        // and Redis consumes the allowance once, even under parallel requests.
        async includeImage(context) {
          try {
            const count = await command(['EVAL', INCLUDE_IMAGE_SCRIPT, 1, imageKey(context), IMAGE_ALLOWANCE_SECONDS])
            return Number.isInteger(count) && count > 0
          } catch {
            // Keep successful text; omit automatic imagery if we cannot include
            // it safely. Never silently charge a second action for this failure.
            return false
          }
        },
      }
    } catch {
      // No IPs, keys, provider payloads or exceptions enter responses/logs.
      return unavailable(res)
    }
  }
}

export const enforceDemoRateLimit = createDemoRateLimiter()
