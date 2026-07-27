import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'feature1',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    outDir: '../dist-feature1',
    emptyOutDir: true,
  },
})
