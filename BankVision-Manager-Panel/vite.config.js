import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3001,
    headers: {
      // Required for SharedArrayBuffer used by some background processors
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // Exclude from pre-bundling — it ships WASM which Vite can't pre-bundle
    exclude: ['@livekit/track-processors'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    // Re-enable minification now that TDZ errors are fixed
    minify: 'esbuild',
    // Strip all console.* calls from production builds (banking-grade: no data leaks)
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Prevent aggressive hoisting that causes TDZ errors
        hoistTransitiveImports: false,
      },
    },
  },
})
