/**
 * The bench instrument's server: a page, and six things the page may ask for.
 *
 * **Bound to the loopback address, deliberately and not by default.** A listening port is a
 * concession this project makes for a bench tool and refuses for the product; FreeHarmony gets a
 * content security policy that makes network access structurally impossible. Writing the difference
 * down beat stretching the product rule quietly. See `docs/roadmap.md` step 5.
 *
 * The route table below is the whole surface. There is no generic "send this command" endpoint,
 * which is the same rail as the reader interface in `@harmony/corpus`: a page that is broken, or
 * a script somebody points at this port, cannot express a write because no route accepts one.
 */
import { createReadStream, existsSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';

import { encodePng } from '@harmony/codec';

import type { Bench } from './bench.ts';

/** Loopback only. Not `0.0.0.0`, not the machine's address, not configurable. */
export const HOST = '127.0.0.1';
export const DEFAULT_PORT = 8731;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function json(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(text);
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function serveFile(res: ServerResponse, webRoot: string, urlPath: string): void {
  // normalize plus a prefix check, because `..` in a URL is the oldest way to read a file that was
  // never meant to be served, and this process can see the whole lab directory.
  const wanted = normalize(join(webRoot, urlPath === '/' ? 'index.html' : urlPath));
  if (!wanted.startsWith(webRoot) || !existsSync(wanted)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(wanted)] ?? 'application/octet-stream' });
  createReadStream(wanted).pipe(res);
}

/**
 * A read streams newline delimited JSON rather than answering once.
 *
 * A Harmony One's config takes about 40 seconds, so the page needs to hear something during it.
 * One object per line: `{"type":"progress",...}` repeatedly, then exactly one `done` or `error`.
 */
async function streamRead(res: ServerResponse, bench: Bench, productId: number, label: string): Promise<void> {
  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' });
  const send = (event: Record<string, unknown>) => res.write(`${JSON.stringify(event)}\n`);
  let lastPercent = -1;
  try {
    const result = await bench.read(productId, label, ({ done, total }) => {
      // One line per whole percent. A line per 16 KiB chunk is 75 lines for a One, which is fine,
      // but this keeps it steady whatever the chunk size becomes.
      const percent = Math.floor((done / total) * 100);
      if (percent === lastPercent) return;
      lastPercent = percent;
      send({ type: 'progress', done, total, percent });
    });
    send({ type: 'done', ...result });
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
  res.end();
}

/** Sixteen pixels square: the accent colour, with a darker border so it reads at that size. */
function favicon(): Uint8Array {
  const side = 16;
  const bytes = new Uint8Array(side * side * 3);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const edge = x === 0 || y === 0 || x === side - 1 || y === side - 1;
      const at = (y * side + x) * 3;
      bytes[at] = edge ? 0x1a : 0x3d;
      bytes[at + 1] = edge ? 0x1a : 0x9b;
      bytes[at + 2] = edge ? 0x1a : 0xd6;
    }
  }
  return encodePng(side, side, bytes);
}

export function createServer(bench: Bench, webRoot: string): Server {
  const root = normalize(webRoot);
  return createHttpServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://${HOST}`);
      try {
        if (req.method === 'GET' && url.pathname === '/api/remotes') {
          return json(res, 200, await bench.remotes());
        }
        if (req.method === 'GET' && url.pathname === '/api/log') {
          return json(res, 200, bench.log);
        }
        // The tab icon, drawn rather than stored: sixteen pixels of the page's own accent colour with a
        // dark edge. It exists so that the browser does not ask for `/favicon.ico` and log a 404 that
        // looks like a real failure, and it is a route rather than a `data:` URI so that the page's
        // content security policy can stay at `img-src 'self'`.
        if (req.method === 'GET' && url.pathname === '/favicon.png') {
          const icon = favicon();
          res.writeHead(200, {
            'content-type': 'image/png',
            'content-length': String(icon.length),
            'cache-control': 'no-store',
          });
          return res.end(icon);
        }
        if (req.method === 'GET' && url.pathname === '/api/configs') {
          return json(res, 200, bench.configs());
        }
        if (req.method === 'POST' && url.pathname === '/api/inventory') {
          const body = await readBody(req);
          const name = String(body['name'] ?? '').trim();
          if (name === '') return json(res, 400, { message: 'a config name is required' });
          return json(res, 200, bench.inventory(name));
        }
        // A screen, as an image, so the page can put it next to the buttons that belong to it. A GET
        // with the name and the page in the query, because a browser has to be able to name it in an
        // `img` tag.
        if (req.method === 'GET' && url.pathname === '/api/screen') {
          const name = (url.searchParams.get('config') ?? '').trim();
          if (name === '') return json(res, 400, { message: 'a config name is required' });
          const page = Number(url.searchParams.get('page') ?? 0);
          const drawn = bench.screen(name, page, Number(url.searchParams.get('variant') ?? 0));
          res.writeHead(200, {
            'content-type': 'image/png',
            'content-length': String(drawn.png.length),
            // The bench reads a config off disk on every request, so a cache would show a stale screen
            // after a fresh read of the remote. It is a local instrument; correctness beats a redraw.
            'cache-control': 'no-store',
            'x-harmony-branches': String(drawn.branches),
          });
          return res.end(drawn.png);
        }
        // What the state of the remote does to a screen: one entry per appearance, with the condition
        // in words. A page with no switch in its program has exactly one.
        if (req.method === 'GET' && url.pathname === '/api/variants') {
          const name = (url.searchParams.get('config') ?? '').trim();
          if (name === '') return json(res, 400, { message: 'a config name is required' });
          return json(res, 200, bench.variants(name, Number(url.searchParams.get('page') ?? 0)));
        }
        if (req.method === 'POST' && url.pathname === '/api/identify') {
          const body = await readBody(req);
          return json(res, 200, await bench.identify(Number(body['productId'])));
        }
        if (req.method === 'POST' && url.pathname === '/api/read') {
          const body = await readBody(req);
          const label = String(body['label'] ?? '').trim();
          if (label === '') return json(res, 400, { message: 'a label is required' });
          return await streamRead(res, bench, Number(body['productId']), label);
        }
        if (req.method === 'GET') return serveFile(res, root, url.pathname);
        // Anything else is an unknown route, not a known one with the wrong verb. Saying 405 here
        // would imply the path exists and only the method is wrong, which for `/api/write` is
        // precisely the wrong impression to leave.
        json(res, 404, {
          message: 'not found',
          served: [
            'GET /api/remotes',
            'GET /api/configs',
            'GET /api/screen',
            'GET /api/variants',
            'GET /api/log',
            'POST /api/identify',
            'POST /api/inventory',
            'POST /api/read',
          ],
        });
      } catch (err) {
        json(res, 500, { message: err instanceof Error ? err.message : String(err) });
      }
    })();
  });
}
