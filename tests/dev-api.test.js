import assert from 'node:assert/strict'
import { test } from 'node:test'
import process from 'node:process'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

test('dev:api launches the CLI with development mode and intact options without changing its parent environment', () => {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-dev-api-'))
  const windows = process.platform === 'win32'
  const stub = join(directory, 'cli.cjs')
  const executable = join(directory, windows ? 'vercel.cmd' : 'vercel')
  const parentMode = process.env.NODE_ENV
  try {
    const source = 'process.stdout.write(JSON.stringify({ mode: process.env.NODE_ENV, target: process.env.VERCEL_ENV, args: process.argv.slice(2) }))'
    writeFileSync(stub, source)
    writeFileSync(executable, windows ? `@"${process.execPath}" "${stub}" %*\r\n` : `#!/usr/bin/env node\n${source}\n`, { mode: 0o755 })
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'))
    env.PATH = directory + delimiter + (process.env.PATH || process.env.Path || '')
    env.NODE_ENV = 'production'
    env.VERCEL_ENV = 'preview'
    const result = spawnSync(process.execPath, [resolve('scripts/dev-api.js'), '--listen', '127.0.0.1:5179'], { env, encoding: 'utf8', timeout: 5000, windowsHide: true })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), { mode: 'development', target: 'preview', args: ['dev', '--listen', '127.0.0.1:5179'] })
    assert.equal(process.env.NODE_ENV, parentMode)
    if (windows) {
      const rejected = spawnSync(process.execPath, [resolve('scripts/dev-api.js'), '--listen', '5179 & echo unexpected'], { env, encoding: 'utf8', timeout: 5000, windowsHide: true })
      assert.notEqual(rejected.status, 0)
      assert.equal(rejected.stdout, '')
      assert.match(rejected.stderr, /Unsupported shell characters/)
    }
  } finally {
    unlinkSync(stub)
    unlinkSync(executable)
    rmdirSync(directory)
  }
})
