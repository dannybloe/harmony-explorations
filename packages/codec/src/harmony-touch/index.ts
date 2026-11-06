/**
 * The Harmony Touch's configuration: the documents it stores, a typed view of them, and what the remote
 * would refuse or ignore in them. `todo-touch.md` 3.3.
 *
 * Exported from the codec's barrel as one namespace, `harmonyTouch`, because "touch" already names the
 * Harmony One's family throughout this codec, `families/touch/`, and the two must not meet by name.
 */
export * from './documents.ts';
export * from './read.ts';
export * from './check.ts';
export * from './definition.ts';
export * from './learned.ts';
export * from './compose.ts';
export * from './favourites.ts';
