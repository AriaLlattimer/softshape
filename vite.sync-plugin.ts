import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const SYNC_FILE = path.resolve(process.cwd(), '.softshape-sync.json');
const PID_FILE = path.join(
  process.env.XDG_CACHE_HOME || path.join(process.env.HOME || '/tmp', '.cache'),
  'softshape',
  'server.pid',
);

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function cors(res: import('http').ServerResponse, methods: string) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function scheduleShutdown(server: ViteDevServer) {
  // Let the HTTP response flush, then stop Vite (and the npm parent via exit).
  setTimeout(() => {
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
    void server.close().finally(() => {
      process.exit(0);
    });
  }, 150);
}

/**
 * Local Wi‑Fi sync store + soft shutdown endpoint for SoftShape.
 */
export function softshapeLanSync(): Plugin {
  return {
    name: 'softshape-lan-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/server/stop') {
          cors(res, 'POST, OPTIONS');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, message: 'Stopping SoftShape…' }));
          scheduleShutdown(server);
          return;
        }

        if (url === '/api/server/status') {
          cors(res, 'GET, OPTIONS');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, running: true }));
          return;
        }

        if (url !== '/api/sync') return next();

        cors(res, 'GET, PUT, HEAD, OPTIONS');
        res.setHeader(
          'Access-Control-Expose-Headers',
          'x-softshape-exported-at, x-softshape-has-data',
        );

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          if (req.method === 'HEAD' || req.method === 'GET') {
            if (!fs.existsSync(SYNC_FILE)) {
              if (req.method === 'HEAD') {
                res.setHeader('x-softshape-has-data', '0');
                res.statusCode = 204;
                res.end();
                return;
              }
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No shared data yet' }));
              return;
            }
            const raw = fs.readFileSync(SYNC_FILE, 'utf8');
            let exportedAt = '';
            try {
              exportedAt = (JSON.parse(raw) as { exportedAt?: string }).exportedAt ?? '';
            } catch {
              /* ignore */
            }
            res.setHeader('x-softshape-has-data', '1');
            if (exportedAt) res.setHeader('x-softshape-exported-at', exportedAt);
            if (req.method === 'HEAD') {
              res.statusCode = 200;
              res.end();
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
            return;
          }

          if (req.method === 'PUT') {
            const body = await readBody(req);
            JSON.parse(body); // validate
            fs.writeFileSync(SYNC_FILE, body, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          res.statusCode = 405;
          res.end('Method not allowed');
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Sync error',
            }),
          );
        }
      });
    },
  };
}
