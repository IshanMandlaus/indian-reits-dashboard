import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    // Proxy the live-refresh endpoints to the Python helper (serve.py) in dev.
    proxy: {
      '/refresh': 'http://localhost:8742',
      '/refresh-market': 'http://localhost:8742',
      '/refresh-global': 'http://localhost:8742',
    },
  },
})
