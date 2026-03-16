import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration with custom development server port
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000
  }
})