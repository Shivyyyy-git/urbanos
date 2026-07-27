import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  root: 'feature1',
  // GitHub Pages serves a project site under /<repo>/, so built asset URLs need
  // that prefix. Only `--mode pages` gets it: local dev and local builds stay at
  // '/', or they would 404 on their own assets.
  base: mode === 'pages' ? '/urbanos/' : '/',
  plugins: [react()],
  server: {
    // Port is not pinned: a busy 4173 used to make Vite walk to 4174 silently
    // while tooling still reported the requested port.
    host: '127.0.0.1',
  },
  build: {
    outDir: '../dist-feature1',
    emptyOutDir: true,
  },
}))
