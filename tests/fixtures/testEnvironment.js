import process from 'node:process'

// Explicit local test runtime; API tests replace fetch and never use a real key.
process.env.NODE_ENV = 'test'
process.env.MODEL_API_KEY = 'fake-test-model-key'
for (const name of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV']) delete process.env[name]

const realFetch = globalThis.fetch
globalThis.fetch = (url, ...args) => {
  if (String(url).startsWith('https://api.meta.ai/')) throw new Error('Tests must mock the paid provider')
  return realFetch(url, ...args)
}
