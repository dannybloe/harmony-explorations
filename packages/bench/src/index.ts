/**
 * The bench instrument.
 *
 * Rough on purpose. It is not the product: FreeHarmony is, and it gets an Electron shell with no
 * network at all. This exists because an API nobody has driven interactively is an API nobody knows
 * is usable, and because the reverse engineering ahead needs a screen with live values on it rather
 * than a script that runs once. See "What this project is" in `docs/roadmap.md`.
 *
 * Read only, in the same two ways the rest of the workspace is: the operations take a reader with
 * no write method on it, and the server exposes named routes rather than a command channel.
 */
export * from './bench.ts';
export * from './server.ts';
