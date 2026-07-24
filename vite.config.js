/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src')
    }
  },
  build: {
    // Generate source maps for production debugging
    sourcemap: false,
    // Split Firebase SDK into a separate chunk (lazy-loaded)
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        admin: path.resolve(process.cwd(), 'admin.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('firebase/app')) {
            return 'firebase-core';
          }
          if (id.includes('firebase/firestore') || id.includes('firebase/auth') || id.includes('firebase/storage')) {
            return 'firebase-services';
          }
          if (id.includes('lucide-react')) {
            return 'ui-icons';
          }
        }
      }
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Increase warning threshold
    chunkSizeWarningLimit: 600
  }
})
