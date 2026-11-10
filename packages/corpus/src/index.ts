/**
 * `@harmony/corpus`, the main entry: reading a whole configuration off a remote, bounded by the configuration
 * rather than by the region, and checked against its own end marker and trailer before anything is kept.
 *
 * The first thing in this workspace that composes the libraries: `@harmony/usb` to talk to the remote and
 * `@harmony/codec` to make sense of what came back. Read only: the reader interface this module works against
 * has no write method on it at all.
 *
 * **Explicit names**, decision 31 and plan 013 decision 6, held by `test/package/surface.test.ts`. The rest is under
 * named subpaths: `./read`, the reader module whole, which loads without the transport and which a window loads
 * on its own; and `./file`, filing a read in the lab corpus, which is this repository's bench and not an
 * application's.
 */

// Reading a configuration off a remote, and what each model's read needs.
export { PROFILES, profileFor, readConfig, ReadError } from './read.ts';
export type { ConfigRead, ConfigReader, ReadOptions, ReadProgress, RemoteProfile } from './read.ts';
