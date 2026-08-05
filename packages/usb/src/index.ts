/**
 * HID transport and the Harmony command protocol.
 *
 * Read paths are usable, and the write paths are refused by `rails.ts` rather than absent, so the
 * rule lives in the library where every caller meets it instead of in a user interface where only
 * the impatient do.
 *
 * The read paths have run against both bench remotes, on both architectures. See `remote.ts` for
 * what is measured and what is still inferred. Nothing here has ever written to a remote.
 */
export * from './protocol.ts';
export * from './rails.ts';
export * from './transport.ts';
export * from './remote.ts';
