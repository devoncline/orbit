import process from 'node:process'
import { spawn } from 'node:child_process'

// Vite sets its own development mode, but Vercel's API workers inherit the
// launching process. Scope this setting to dev:api, never a shared env file.
const args = ['dev', ...process.argv.slice(2)]
const windows = process.platform === 'win32'
// Windows launches the global CLI through its .cmd shim. Reject shell syntax
// rather than allowing a forwarded option to become a second command.
if (windows && args.some(arg => /["%!^&|<>\r\n]/.test(arg))) {
  throw new Error('Unsupported shell characters in Vercel development arguments')
}
const child = spawn(windows ? process.env.ComSpec || 'cmd.exe' : 'vercel',
  windows ? ['/d', '/s', '/c', `vercel.cmd ${args.map(arg => `"${arg}"`).join(' ')}`] : args,
  { stdio: 'inherit', windowsHide: true, windowsVerbatimArguments: windows, env: { ...process.env, NODE_ENV: 'development' } })
child.on('error', () => { process.stderr.write('Could not start Vercel. Check that the Vercel CLI is installed.\n'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
