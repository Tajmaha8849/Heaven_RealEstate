import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Proxy to your server during development
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Keep the '/api' prefix
      },
    },
  },
  plugins: [react()],
});
