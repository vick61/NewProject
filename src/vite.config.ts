import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fallback environment variables for Cloudflare deployment
    'import.meta.env.VITE_CLOUDFLARE_WORKER_URL': JSON.stringify(
      process.env.VITE_CLOUDFLARE_WORKER_URL || 
      process.env.CLOUDFLARE_WORKER_URL || 
      'https://baabzbunxucblvtojbfj.supabase.co/functions/v1/make-server-ce8ebc43'
    ),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 
      'https://baabzbunxucblvtojbfj.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4'
    )
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'components': path.resolve(__dirname, './components'),
      'utils': path.resolve(__dirname, './utils'),
      'styles': path.resolve(__dirname, './styles')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
})