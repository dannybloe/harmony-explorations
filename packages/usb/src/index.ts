/**
 * HID transport and the Harmony command protocol.
 *
 * Read paths are usable, and the write paths are refused by `rails.ts` rather than absent, so the
 * rule lives in the library where every caller meets it instead of in a user interface where only
 * the impatient do.
 *
 * Nothing here has been run against a remote yet. See `remote.ts` for what that leaves open.
 */
export * from './protocol.ts';
export * from './rails.ts';
export * from './transport.ts';
export * from './remote.ts';
