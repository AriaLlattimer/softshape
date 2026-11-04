import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { softshapeLanSync } from './vite.sync-plugin.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), softshapeLanSync()],
  server: {
    host: true, // listen on LAN so phones on the same Wi‑Fi can connect
    port: 5173,
    proxy: {
      '/api/wger': {
        target: 'https://wger.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wger/, '/api/v2'),
      },
    },
  },
});
