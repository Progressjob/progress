import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Match backend dev port (see backend/.dev-server-port after `npm run dev`). */
function backendProxyTarget(): string {
  const fromEnv = process.env.VITE_BACKEND_PORT ?? process.env.BACKEND_PORT;
  if (fromEnv) {
    return `http://localhost:${fromEnv}`;
  }

  const portFile = path.resolve(rootDir, '../backend/.dev-server-port');
  try {
    const port = fs.readFileSync(portFile, 'utf8').trim();
    if (/^\d+$/.test(port)) {
      return `http://localhost:${port}`;
    }
  } catch {
    // backend not started yet; default preference from backend/.env is 3000
  }

  return 'http://localhost:3000';
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendProxyTarget(),
        changeOrigin: true,
      },
    },
  },
});
