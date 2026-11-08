/**
 * The codec's Node entry, `@harmony/codec/node`: the main entry whole, and what reads the disk, plan 013 decision 5 and
 * `todo.md` 7.3.5. A Node caller, a script, a test, the bench or FreeHarmony's main process, imports from here and
 * from nowhere else; a renderer imports `@harmony/codec`, which reaches no Node module, `test/mainentry.test.ts`.
 *
 * **What it adds**, each beside the parser it feeds:
 *
 * * the infrared archive's readers by path, `archive.node.ts`, `catalogue.node.ts`, `driving.node.ts` and
 *   `catalogueraw.node.ts`, and `archiveAt`, the `CatalogueSource` a builder is handed for a checkout on disk;
 * * the resources the core asks its loader for, supplied as this module loads, `resources.node.ts`: Oxanium, the icon
 *   font and its list, Node's deflate for a PNG and SHA-256.
 */
import './resources.node.ts';

export * from './index.ts';
export * from './archive.node.ts';
export * from './catalogue.node.ts';
export * from './driving.node.ts';
export * from './catalogueraw.node.ts';
export { NODE_RESOURCES } from './resources.node.ts';
