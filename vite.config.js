import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  // Display hint only; the API guards remain authoritative. The local launcher
  // passes its resolved mode to both Vite and Vercel without changing builds.
  define: {
    'import.meta.env.ORBIT_PORTFOLIO_MODE': JSON.stringify(process.env.ORBIT_PORTFOLIO_MODE?.trim().toLowerCase() === 'true'),
  },
}))
