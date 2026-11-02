import assert from 'node:assert/strict'
import { CONSUME_ACTION_SCRIPT, INCLUDE_IMAGE_SCRIPT } from '../../api/_lib/demoRateLimit.js'

// Fake the Redis REST boundary, not the limiter. A single shared map models
// atomic EVAL and store-side expiry across independently created route helpers.
export function fakeDemoStore() {
  const entries = new Map(), commands = []
  let now = 0
  const get = (key) => {
    const item = entries.get(key)
    if (item && item.expires <= now) { entries.delete(key); return null }
    return item
  }
  return {
    entries, commands,
    advance(seconds) { now += seconds },
    async fetch(url, options) {
      assert.equal(url, 'https://redis.example.test/')
      assert.equal(options.redirect, 'error')
      assert.ok(options.signal)
      const command = JSON.parse(options.body)
      commands.push(command)
      const [op, script, keyCount, ...values] = command
      assert.equal(op, 'EVAL', 'Each mutation must be one atomic command')
      const keys = values.slice(0, keyCount), args = values.slice(keyCount)
      let result
      if (script === INCLUDE_IMAGE_SCRIPT) {
        const count = (get(keys[0])?.count || 0) + 1
        entries.set(keys[0], { count, expires: now + Number(args[0]) })
        result = count
      } else {
        assert.equal(script, CONSUME_ACTION_SCRIPT)
        const included = args[2] === '1' && get(keys[1])
        if (included?.count > 0) {
          if (--included.count === 0) entries.delete(keys[1])
          result = [1, 0]
        } else {
          let bucket = get(keys[0])
          if (!bucket) { bucket = { count: 0, expires: now + Number(args[1]) }; entries.set(keys[0], bucket) }
          const allowed = bucket.count < Number(args[0])
          if (allowed) bucket.count++
          result = [Number(allowed), Math.ceil(bucket.expires - now)]
        }
      }
      return new Response(JSON.stringify({ result }))
    },
  }
}

export const demoEnv = () => ({
  NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production',
  MODEL_API_KEY: 'fake-model-key', UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'fake-redis-token', DEMO_RATE_LIMIT_SECRET: 'fake-test-secret-at-least-32-characters',
})
export const demoRequest = (body = {}, ip = '192.0.2.8') => ({ method: 'POST', body, headers: { 'x-vercel-forwarded-for': ip } })
export function demoResponse() {
  return { code: 200, headers: {}, chunks: [],
    status(code) { this.code = code; return this },
    json(body) { this.body = body; return this },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value },
    write(text) { this.chunks.push(JSON.parse(text)) },
    flushHeaders() { this.flushed = true },
    end() { this.ended = true },
  }
}
