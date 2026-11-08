/**
 * The bench instrument.
 *
 * Rough on purpose. It is not the product: FreeHarmony is, and it gets an Electron shell with no
 * network at all. This exists because an API nobody has driven interactively is an API nobody knows
 * is usable, and because the reverse engineering ahead needs a screen with live values on it rather
 * than a script that runs once. See "What this project is" in `docs/decisions.md`.
 *
 * Read only, in the same two ways the rest of the workspace is: the operations take a reader with
 * no write method on it, and the server exposes named routes rather than a command channel.
 *
 * **The main entry is what starts the instrument**, explicit names held by `test/surface.test.ts`, `todo.md`
 * 7.3.6: the server, the bench behind it with the dependencies it is given, the infrared monitor and the test
 * sessions it serves. Every module whole is `./internal`.
 */

// The server and where it listens.
export { createServer, DEFAULT_PORT, HOST } from './server.ts';
// The bench the server drives, and the dependencies it reads a remote and the lab through.
export { Bench, liveDeps } from './bench.ts';
export type { BenchDeps } from './bench.ts';
// The infrared monitor and the bench tests run against it.
export { IrMonitor } from './irmonitor.ts';
export { IrSessions } from './irsession.ts';
