/**
 * `@harmony/codec/internal`: the format's parts below the application's view, each module whole, `todo.md`
 * 7.3.6. For this repository's scripts, tests and the libraries built on the codec, `@harmony/corpus` and
 * `@harmony/probe` among them: the container's pointers, slots and markers, every section's reader, the screen
 * language, the infrared records, the byte accounting and the emitter that reads a container back. The main
 * entry, `index.ts`, is the designed surface and this is not; a name added to one of these modules is here
 * without a second list. The composers are `./build`.
 *
 * It loads anywhere, as the main entry does, `test/package/mainentry.test.ts`.
 */

// Byte helpers, one namespace.
export * as bytes from './support/bytes.ts';
// The container: its header, pointers, base slots and clock, Logitech's EzHex file, and the trailer checksum.
export * from './container/gspm.ts';
export * from './container/ezhex.ts';
export * from './edit/growth.ts';
export * from './edit/relocate.ts';
// The sections: value maps, state tables, modes, the tagged lists, the tables, and the action lists.
export * from './container/valuemap.ts';
export * from './container/sections.ts';
export * from './container/tables.ts';
export * from './container/actions.ts';
export * from './container/queue.ts';
export * from './container/modezero.ts';
// What a configuration holds, read whole: devices, activities, keys, delays and the state variables.
export * from './inventory/inventory.ts';
export * from './container/summary.ts';
export * from './inventory/language.ts';
export * from './container/metadata.ts';
export * from './support/deflate.ts';
// The screen language, the fonts and the text, and the Harmony One's touch panel.
export * from './screens/screen.ts';
export * from './screens/font.ts';
export * from './screens/alphabets.ts';
export * from './screens/text.ts';
export * from './screens/render.ts';
export * from './screens/png.ts';
export * from './inventory/touch.ts';
// Infrared: the records, the frame decoder and encoder, IrDA, our rhythm table and the stated codes.
export * from './infrared/ir.ts';
export * from './infrared/irframe.ts';
export * from './infrared/irda.ts';
export * from './infrared/protocols.ts';
export * from './infrared/stated.ts';
export * from './infrared/pronto.ts';
// Logitech's protocol archive and device catalogue, parsed from what a caller hands over, and the raw capture
// behind the catalogue.
export * from './catalogue/archive.ts';
export * from './catalogue/catalogue.ts';
export * from './catalogue/driving.ts';
export * from './catalogue/catalogueraw.ts';
// The byte accounting behind M2, what the screen bytes are, the emitter, and in place edits.
export * from './container/coverage.ts';
export * from './screens/screencategories.ts';
export * from './container/emit.ts';
export * from './edit/edit.ts';
// What the codec asks its loader for.
export * from './support/resources.ts';
