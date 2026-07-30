import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    allowedHosts: ['chat.autofiscal.uk'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react') || id.includes('zustand')) return 'vendor';
          }
        },
      },
    },
  }
})

