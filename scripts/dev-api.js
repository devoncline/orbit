import process from 'node:process'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Vite sets its own development mode, but Vercel's API workers inherit the
// launching process. Scope this setting to dev:api, never a shared env file.
const options = process.argv.slice(2)
const portfolio = options.includes('--portfolio')
const live = options.includes('--live')
if (portfolio && live) throw new Error('Choose either --portfolio or --live')
let localMode
try {
  // Read only this non-secret setting. Vite's .env.local reload does not load
  // variables into the separate Vercel API workers. Leave credential handling
  // to the existing runtime; never copy env files or print their contents.
  localMode = parseEnv(readFileSync('.env.local', 'utf8')).ORBIT_PORTFOLIO_MODE
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Could not read the local Portfolio Mode setting', { cause: error })
}
const mode = (portfolio ? 'true' : live ? 'false' : localMode ?? process.env.ORBIT_PORTFOLIO_MODE ?? 'false').trim().toLowerCase()
if (!['true', 'false'].includes(mode)) throw new Error('ORBIT_PORTFOLIO_MODE must be true or false for local development')
const args = ['dev', ...options.filter(arg => !['--portfolio', '--live'].includes(arg))]
const windows = process.platform === 'win32'
// Windows launches the global CLI through its .cmd shim. Reject shell syntax
// rather than allowing a forwarded option to become a second command.
if (windows && args.some(arg => /["%!^&|<>\r\n]/.test(arg))) {
  throw new Error('Unsupported shell characters in Vercel development arguments')
}
const child = spawn(windows ? process.env.ComSpec || 'cmd.exe' : 'vercel',
  windows ? ['/d', '/s', '/c', `vercel.cmd ${args.map(arg => `"${arg}"`).join(' ')}`] : args,
  { stdio: 'inherit', windowsHide: true, windowsVerbatimArguments: windows,
    env: { ...process.env, NODE_ENV: 'development', ORBIT_PORTFOLIO_MODE: mode } })
process.stdout.write(`Orbit local API: Portfolio Mode ${mode === 'true' ? 'ON (no AI inference)' : 'OFF (live AI enabled)'}. Restart this command after changing the mode.\n`)
child.on('error', () => { process.stderr.write('Could not start Vercel. Check that the Vercel CLI is installed.\n'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
