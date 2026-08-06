/**
 * Start the bench instrument.
 *
 *   node packages/bench/bin/bench.ts [--port 8731]
 *
 * Then open the printed address. The server binds to the loopback address only, so nothing on the
 * network can reach it.
 */
import { fileURLToPath } from 'node:url';

import { Bench, createServer, DEFAULT_PORT, HOST, liveDeps } from '../src/index.ts';

const at = process.argv.indexOf('--port');
const port = at < 0 ? DEFAULT_PORT : Number(process.argv[at + 1]);

const webRoot = fileURLToPath(new URL('../web/', import.meta.url));
const server = createServer(new Bench(await liveDeps()), webRoot);

server.listen(port, HOST, () => {
  process.stdout.write(`bench on http://${HOST}:${port}\n  read only, and bound to loopback\n`);
});
