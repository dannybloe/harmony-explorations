/**
 * The base every other package stands on: facts about a Harmony that are neither a transport nor a
 * codec, and that a browser, an Electron window and the command line all need alike.
 *
 * Plan 013, decision 4. These three modules lived in `packages/usb` until `todo.md` 7.3.4, and the
 * codec depended on that package for two of them, so a program that only wanted to parse a
 * configuration pulled in `node-hid`, a native module with an install step. Here they depend on
 * nothing outside Node's own, and nothing in this package reads the disk or loads a native module;
 * `test/base.test.ts` holds that.
 *
 * * `models.ts`, the model table: a skin to a model and what its hardware can do.
 * * `trailer.ts`, the configuration container's trailer checksum, the one copy.
 * * `keys.ts`, where a running remote keeps the key being pressed, per model.
 *
 * Each is also its own subpath, `@harmony/base/models` and the rest, because the key reader page
 * loads them in a browser one module at a time and must not reach for anything else.
 */
export * from './models.ts';
export * from './trailer.ts';
export * from './keys.ts';
