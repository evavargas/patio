import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El proxy evita CORS en desarrollo. En produccion el panel usa VITE_API_URL.
  server: { proxy: { '/v1': 'http://127.0.0.1:8080' } },
});
