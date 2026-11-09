import assert from 'node:assert/strict'
import { test } from 'node:test'
import process from 'node:process'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { execFile, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import viteConfig from '../vite.config.js'

test('Vite exposes only the resolved Portfolio Mode boolean, defaulting to live without loading local settings', () => {
  const prior = process.env.ORBIT_PORTFOLIO_MODE
  try {
    for (const [setting, expected] of [[undefined, false], ['false', false], ['true', true], [' TRUE ', true], ['typo', false]]) {
      if (setting === undefined) delete process.env.ORBIT_PORTFOLIO_MODE
      else process.env.ORBIT_PORTFOLIO_MODE = setting
      assert.deepEqual(viteConfig().define, { 'import.meta.env.ORBIT_PORTFOLIO_MODE': JSON.stringify(expected) })
    }
  } finally {
    if (prior === undefined) delete process.env.ORBIT_PORTFOLIO_MODE
    else process.env.ORBIT_PORTFOLIO_MODE = prior
  }
})

function stubCLI(t, { local, inherited } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-dev-api-'))
  const windows = process.platform === 'win32'
  const stub = join(directory, 'cli.cjs')
  const executable = join(directory, windows ? 'vercel.cmd' : 'vercel')
  const source = 'process.stdout.write(JSON.stringify({ mode: process.env.NODE_ENV, portfolio: process.env.ORBIT_PORTFOLIO_MODE, target: process.env.VERCEL_ENV, credentialUnchanged: process.env.MODEL_API_KEY === "fake-existing-key", args: process.argv.slice(2) }))'
  writeFileSync(stub, source)
  writeFileSync(executable, windows ? `@"${process.execPath}" "${stub}" %*\r\n` : `#!/usr/bin/env node\n${source}\n`, { mode: 0o755 })
  if (local !== undefined) writeFileSync(join(directory, '.env.local'), local)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'))
  env.PATH = directory + delimiter + (process.env.PATH || process.env.Path || '')
  env.NODE_ENV = 'production'
  env.VERCEL_ENV = 'preview'
  env.MODEL_API_KEY = 'fake-existing-key'
  if (inherited === undefined) delete env.ORBIT_PORTFOLIO_MODE
  else env.ORBIT_PORTFOLIO_MODE = inherited
  t.after(() => {
    unlinkSync(stub)
    unlinkSync(executable)
    if (existsSync(join(directory, '.env.local'))) unlinkSync(join(directory, '.env.local'))
    rmdirSync(directory)
  })
  return (...args) => spawnSync(process.execPath, [resolve('scripts/dev-api.js'), ...args], {
    cwd: directory, env, encoding: 'utf8', timeout: 5000, windowsHide: true,
  })
}

test('dev:api scopes configuration to its child and forwards ordinary CLI options intact', t => {
  const before = { ...process.env }
  const run = stubCLI(t)
  const result = run('--listen', '127.0.0.1:5179')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Portfolio Mode OFF \(live AI enabled\)/)
  assert.deepEqual(JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))), {
    mode: 'development', portfolio: 'false', target: 'preview', credentialUnchanged: true,
    args: ['dev', '--listen', '127.0.0.1:5179'],
  })
  assert.deepEqual({ ...process.env }, before)
  if (process.platform === 'win32') {
    const rejected = run('--listen', '5179 & echo unexpected')
    assert.notEqual(rejected.status, 0)
    assert.equal(rejected.stdout, '')
    assert.match(rejected.stderr, /Unsupported shell characters/)
  }
})

for (const [name, local, inherited, option, expected] of [
  ['local true overrides an inherited false', 'ORBIT_PORTFOLIO_MODE=true', 'false', null, 'true'],
  ['local false overrides an inherited true', 'ORBIT_PORTFOLIO_MODE=false', 'true', null, 'false'],
  ['inherited mode works without a local setting', undefined, 'true', null, 'true'],
  ['quoted local setting accepts whitespace and comments', 'ORBIT_PORTFOLIO_MODE=" TRUE " # local only', undefined, null, 'true'],
  ['explicit portfolio beats local false', 'ORBIT_PORTFOLIO_MODE=false', 'false', '--portfolio', 'true'],
  ['explicit live beats local true', 'ORBIT_PORTFOLIO_MODE=true', 'true', '--live', 'false'],
]) test(`dev:api ${name}`, t => {
  const result = stubCLI(t, { local, inherited })(...(option ? [option] : []), '--listen', '5179')
  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')))
  assert.equal(output.portfolio, expected)
  assert.deepEqual(output.args, ['dev', '--listen', '5179'], 'Local mode switches never become Vercel CLI flags')
  assert.equal(output.credentialUnchanged, true)
  assert.match(result.stdout, expected === 'true' ? /ON \(no AI inference\)/ : /OFF \(live AI enabled\)/)
})

test('dev:api reads no credential values into the child or startup output from .env.local', t => {
  const result = stubCLI(t, { local: 'ORBIT_PORTFOLIO_MODE=true\nMODEL_API_KEY=private-test-sentinel\n' })()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))).credentialUnchanged, true)
  assert.doesNotMatch(result.stdout + result.stderr, /private-test-sentinel|fake-existing-key/)
})

test('dev:api rejects ambiguous or invalid modes before starting the CLI', t => {
  const run = stubCLI(t, { local: 'ORBIT_PORTFOLIO_MODE=typo' })
  for (const args of [[], ['--portfolio', '--live']]) {
    const result = run(...args)
    assert.notEqual(result.status, 0)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /must be true or false|Choose either/)
  }
})

test('local Portfolio Mode smoke check refuses non-local targets', () => {
  for (const origin of ['https://example.test', 'http://example.test', 'http://user:password@localhost:5173']) {
    const result = spawnSync(process.execPath, [resolve('scripts/check-portfolio-local.js'), origin], { encoding: 'utf8', timeout: 5000, windowsHide: true })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Use a local HTTP origin/)
    assert.equal(result.stdout, '')
  }
})

test('local Portfolio Mode smoke check stops after a safe invalid probe if the server is still live', async t => {
  const requests = []
  const server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    requests.push({ path: req.url, body: JSON.parse(body) })
    res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid lesson request' }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  await assert.rejects(promisify(execFile)(process.execPath, [resolve('scripts/check-portfolio-local.js'), `http://127.0.0.1:${server.address().port}`], {
    timeout: 10000, windowsHide: true,
  }), error => /Portfolio Mode is not active/.test(error.stderr))
  assert.deepEqual(requests, [{ path: '/api/generate-study-lesson', body: {} }], 'Never send valid AI inputs to an unverified live server')
})
