import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La web llama a rutas relativas (/api/...) y Vite las reenvía a la API.
// Así el navegador ve un solo origen y no hace falta tocar el CORS de la API.
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_URL,
      '/health': API_URL,
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': API_URL,
      '/health': API_URL,
    },
  },
})
