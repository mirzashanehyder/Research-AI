import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_PATHS = [
  '/auth',
  '/workspaces',
  '/search',
  '/papers',
  '/upload',
  '/import',
  '/chat',
  '/history',
  '/summary',
  '/review',
  '/research-gaps',
  '/citations',
  '/compare',
  '/recommend',
  '/documents',
  '/health',
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      API_PATHS.map((path) => [
        path,
        { target: 'http://127.0.0.1:8000', changeOrigin: true },
      ])
    ),
  },
})
