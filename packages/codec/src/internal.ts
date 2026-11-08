/**
 * `@harmony/codec/internal`: the format's parts below the application's view, each module whole, `todo.md`
 * 7.3.6. For this repository's scripts, tests and the libraries built on the codec, `@harmony/corpus` and
 * `@harmony/probe` among them: the container's pointers, slots and markers, every section's reader, the screen
 * language, the infrared records, the byte accounting and the emitter that reads a container back. The main
 * entry, `index.ts`, is the designed surface and this is not; a name added to one of these modules is here
 * without a second list. The composers are `./build`.
 *
 * It loads anywhere, as the main entry does, `test/mainentry.test.ts`.
 */

// Byte helpers, one namespace.
export * as bytes from './bytes.ts';
// The container: its header, pointers, base slots and clock, Logitech's EzHex file, and the trailer checksum.
export * from './gspm.ts';
export * from './ezhex.ts';
export * from './growth.ts';
export * from './relocate.ts';
// The sections: value maps, state tables, modes, the tagged lists, the tables, and the action lists.
export * from './valuemap.ts';
export * from './sections.ts';
export * from './tables.ts';
export * from './actions.ts';
export * from './queue.ts';
export * from './modezero.ts';
// What a configuration holds, read whole: devices, activities, keys, delays and the state variables.
export * from './inventory.ts';
export * from './summary.ts';
export * from './language.ts';
export * from './metadata.ts';
export * from './deflate.ts';
// The screen language, the fonts and the text, and the Harmony One's touch panel.
export * from './screen.ts';
export * from './font.ts';
export * from './alphabets.ts';
export * from './text.ts';
export * from './render.ts';
export * from './png.ts';
export * from './touch.ts';
// Infrared: the records, the frame decoder and encoder, IrDA, our rhythm table and the stated codes.
export * from './ir.ts';
export * from './irframe.ts';
export * from './irda.ts';
export * from './protocols.ts';
export * from './stated.ts';
export * from './pronto.ts';
// Logitech's protocol archive and device catalogue, parsed from what a caller hands over, and the raw capture
// behind the catalogue.
export * from './archive.ts';
export * from './catalogue.ts';
export * from './driving.ts';
export * from './catalogueraw.ts';
// The byte accounting behind M2, what the screen bytes are, the emitter, and in place edits.
export * from './coverage.ts';
export * from './screencategories.ts';
export * from './emit.ts';
export * from './edit.ts';
// What the codec asks its loader for.
export * from './resources.ts';
