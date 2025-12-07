import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
