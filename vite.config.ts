import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Port comes from the environment when a preview harness assigns one.
  server: { port: Number(process.env.PORT) || 5173 },
})
