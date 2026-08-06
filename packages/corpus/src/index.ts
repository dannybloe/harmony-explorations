/**
 * Read a config off a remote and file it in the lab corpus.
 *
 * The first thing in this workspace that composes all three libraries: `@harmony/usb` to talk to
 * the remote, `@harmony/codec` to make sense of what came back, and `@harmony/lab` to find where it
 * should be filed. None of those three should grow a dependency on the other two, which is why this
 * is its own package rather than a script bolted onto one of them.
 *
 * Read only. The reader interface this module works against has no write method on it at all.
 */
export * from './read.ts';
export * from './file.ts';
