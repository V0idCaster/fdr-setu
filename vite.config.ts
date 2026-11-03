import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // `vite build --mode development` produces an unminified build with inline sourcemaps for debugging.
  const debugBuild = mode === 'development'
  const port = parseInt(process.env.PORT || '8443')

  return {
    // Set BASE_PATH (for example "/fdr-setu/") when the site is served from a sub-path.
    base: process.env.BASE_PATH || '/',
    build: {
      sourcemap: debugBuild ? 'inline' : false,
      minify: !debugBuild,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port,
    },
  }
})
