/**
 * Start the bench instrument.
 *
 *   node packages/bench/bin/bench.ts [--port 8731]
 *
 * Then open the printed address. The server binds to the loopback address only, so nothing on the
 * network can reach it.
 */
import { fileURLToPath } from 'node:url';

import { IR_ARCHIVE, LAB, load } from '@harmony/lab';

import {
  Bench, CodeBook, createServer, DEFAULT_PORT, HOST, IrMonitor, IrSessions, irtoolsSource, liveDeps,
  monitorLogPath, runFilePath,
} from '../src/index.ts';

const at = process.argv.indexOf('--port');
const port = at < 0 ? DEFAULT_PORT : Number(process.argv[at + 1]);

// The infrared monitor's code book is built on first use, since it parses every bench remote's
// configuration, and its catalogue names follow straight after, which is a full pass over the archive
// and holds the process for several seconds once.
let book: CodeBook | undefined;
const codeBook = (): CodeBook => {
  if (book === undefined) {
    book = new CodeBook(load, undefined, IR_ARCHIVE);
    const named = book;
    setTimeout(() => {
      named.nameFromCatalogue();
      process.stdout.write(`infrared monitor: ${named.size} stored frames from ${named.configs.length} configurations`
        + `${named.named ? ', named from the catalogue' : ', no catalogue'}\n`);
    }, 0);
  }
  return book;
};
const monitor = new IrMonitor(irtoolsSource(), codeBook, () => new Date(), monitorLogPath(LAB, new Date()));

const webRoot = fileURLToPath(new URL('../web/', import.meta.url));
const runs = new IrSessions(monitor, () => new Date(), (run) => runFilePath(LAB, run),
  (run) => monitor.publish({ type: 'run', run }));
const tests = fileURLToPath(new URL('../irtests/', import.meta.url));
const server = createServer(new Bench(await liveDeps()), webRoot, monitor, { runs, tests });
process.on('SIGINT', () => { monitor.stop(); process.exit(0); });

server.listen(port, HOST, () => {
  process.stdout.write(`bench on http://${HOST}:${port}\n  read only, and bound to loopback\n`);
  // Built now rather than on the first press, so that press is not the one that waits for it.
  codeBook();
});
