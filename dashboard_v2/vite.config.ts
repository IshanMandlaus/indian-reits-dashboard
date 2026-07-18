import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { refreshPlugin } from './server/refreshPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), refreshPlugin()],
  server: {
    port: 5273,
    // Don't let writing public/data/*.json (the refresh output) trigger a full reload;
    // the client does one explicit location.reload() after /api/refresh returns.
    watch: {
      ignored: ['**/public/data/**'],
    },
  },
})
