import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  // Caminho relativo: o mesmo build funciona em GitHub Pages (subpasta) e na raiz.
  base: './',
  plugins: [react(), tailwindcss()],
  // Em desenvolvimento, `/api` vai para o servidor local. Sem `changeOrigin`, Host e Origin
  // continuam iguais (localhost:5173) e a checagem de origem das escritas na API passa.
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
