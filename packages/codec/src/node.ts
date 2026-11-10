/**
 * The codec's Node entry, `@harmony/codec/node`: the main entry whole, and what reads the disk, plan 013 decision 5. A
 * Node caller, a script, a test, the bench or FreeHarmony's main process, imports from here; a
 * renderer imports `@harmony/codec`, which reaches no Node module, `test/package/mainentry.test.ts`. A Node caller that also
 * needs `./build` or `./internal`, which load anywhere, imports this entry as well, since loading it is what
 * supplies the resources a builder asks for.
 *
 * **What it adds**, each beside the parser it feeds:
 *
 * * the infrared archive's readers by path, `archive.node.ts`, `catalogue.node.ts`, `driving.node.ts` and
 *   `catalogueraw.node.ts`, and `archiveAt`, the `CatalogueSource` a builder is handed for a checkout on disk;
 * * the resources the core asks its loader for, supplied as this module loads, `resources.node.ts`: Oxanium, the icon
 *   font and its list, Node's deflate for a PNG and SHA-256.
 */
import './support/resources.node.ts';

// The main entry whole: its names are its own explicit list, `index.ts`, so this adds none by default.
export * from './index.ts';
// The infrared archive and the catalogue read off the disk by path, and the source a builder is handed for a
// checkout.
export { archiveManifest, archiveProtocols, catalogueByRhythm, segmentLengthsModule } from './catalogue/archive.node.ts';
export {
  archiveAt,
  catalogueCommands,
  catalogueDevice,
  catalogueManufacturers,
  catalogueModels,
  codeIndex,
} from './catalogue/catalogue.node.ts';
export { catalogueDriving } from './catalogue/driving.node.ts';
// A recipe given its codes out of a checkout, so a build of it needs no archive, plan 014.
export { carryCodes } from './catalogue/carried.node.ts';
export { catalogueRules, rawCaptureDevice, rawCaptureLine, rawDerivedState, statedSha256 } from './catalogue/catalogueraw.node.ts';
// The resources as Node supplies them, supplied as this module loads.
export { NODE_RESOURCES } from './support/resources.node.ts';
