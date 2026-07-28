import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), //mendaftarkan kompiler tailwind v4 resmi
  ],
  server: {
    proxy: {
      // Proxy ini membuat React bisa memanggil /api tanpa hardcode port backend.
      '/api': 'http://localhost:3001',
    },
  },
})
