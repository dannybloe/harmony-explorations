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
// The compatibility gate: read only, and the rail above performs it rather than asking.
export * from './compatible.ts';
// Which unit is on the cable. Read only, and it carries no table of units by design.
export * from './identity.ts';
export * from './transport.ts';
export * from './remote.ts';
export * from './models.ts';
// The second protocol, for the family openHarmony refuses. Read paths only, section 198.
export * from './filepipe.ts';
