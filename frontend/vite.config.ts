import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // `npm run preview` serves the production build, where VITE_API_URL=/api.
  // On Vercel that path is rewritten to the backend; locally we need the same
  // proxy or the SPA fallback would answer /api requests with index.html.
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
