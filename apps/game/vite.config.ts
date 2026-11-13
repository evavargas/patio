import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // El proxy evita CORS en desarrollo. En produccion el juego usa VITE_API_URL.
  server: { host: true, proxy: { '/v1': 'http://127.0.0.1:8080' } },
});
