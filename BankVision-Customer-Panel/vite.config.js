import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3002,
  },
  build: {
    // Optimize for low memory environments
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks to reduce memory usage during build
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
    // Use esbuild for minification (faster and less memory than terser)
    minify: 'esbuild',
    // Strip all console.* calls from production builds (banking-grade: no data leaks)
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    target: 'es2015',
  },
  // Optimize dev server
  server: {
    hmr: {
      overlay: false,
    },
  },
  // Reduce dependency pre-bundling during dev
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material'],
  },
})
