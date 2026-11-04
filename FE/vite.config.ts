import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // FastAPI dev server (BE/)
    proxy: { '/api': 'http://localhost:8000' },
  },
})
