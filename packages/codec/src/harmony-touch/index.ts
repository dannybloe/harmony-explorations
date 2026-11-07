/**
 * The Harmony Touch's configuration: the documents it stores, a typed view of them, and what the remote
 * would refuse or ignore in them. `todo-touch.md` 3.3. And a model of what its engine sends for a press, read
 * from those documents, `engine.ts`, here since `todo.md` 7.3.1.
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
export * from './settings.ts';
export * from './remove.ts';
export * from './setup.ts';
export * from './archivedevice.ts';
export * from './fromnothing.ts';
export * from './empty.ts';
export * from './engine.ts';
