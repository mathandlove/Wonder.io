import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const isProduction = process.env.NODE_ENV === 'production'

// Check if local SSL certs exist for mobile testing (iOS requires HTTPS for microphone)
const keyPath = path.resolve(__dirname, '.cert/key.pem')
const certPath = path.resolve(__dirname, '.cert/cert.pem')
const hasLocalCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose on network for mobile testing
    https: hasLocalCerts ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src/app'),
      '@core': path.resolve(__dirname, './src/core'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@stories': path.resolve(__dirname, './public/stories'),
    },
  },
  build: {
    rollupOptions: {
      input: isProduction
        ? {
            // Production: only main app
            main: path.resolve(__dirname, 'index.html'),
          }
        : {
            // Development: include editor and simulator
            main: path.resolve(__dirname, 'index.html'),
            editor: path.resolve(__dirname, 'editor.html'),
            simulator: path.resolve(__dirname, 'simulator.html'),
          },
    },
  },
})
