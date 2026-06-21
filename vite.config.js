import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate source maps for production debugging
    sourcemap: false,
    // Split Firebase SDK into a separate chunk (lazy-loaded)
    rollupOptions: {
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
