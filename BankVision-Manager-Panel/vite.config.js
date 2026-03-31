import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3001,
  },
  build: {
    // Re-enable minification now that TDZ errors are fixed
    minify: 'esbuild',
    // Strip all console.* calls from production builds (banking-grade: no data leaks)
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Prevent aggressive hoisting that causes TDZ errors
        hoistTransitiveImports: false,
      },
    },
  },
})
