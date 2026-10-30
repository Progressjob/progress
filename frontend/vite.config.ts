import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const portFile = path.resolve(rootDir, '../backend/.dev-server-port');

/** Read on each request so a backend restart on a new port does not 502 the app. */
function backendDevPort(): number {
  const fromEnv = process.env.VITE_BACKEND_PORT ?? process.env.BACKEND_PORT;
  if (fromEnv && /^\d+$/.test(fromEnv)) return Number(fromEnv);

  try {
    const port = fs.readFileSync(portFile, 'utf8').trim();
    if (/^\d+$/.test(port)) return Number(port);
  } catch {
    // backend not started yet; default preference from backend/.env is 3000
  }

  return 3000;
}

function apiProxyPlugin(): Plugin {
  return {
    name: 'progress-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api')) {
          next();
          return;
        }

        const port = backendDevPort();
        const headers = { ...req.headers, host: `127.0.0.1:${port}` };
        delete headers.connection;

        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: url,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
            proxyRes.pipe(res);
          },
        );

        proxyReq.on('error', () => {
          if (res.headersSent) {
            res.end();
            return;
          }
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'API server is not reachable' }));
        });

        req.pipe(proxyReq);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [apiProxyPlugin(), react()],
  server: {
    port: 5173,
  },
});
