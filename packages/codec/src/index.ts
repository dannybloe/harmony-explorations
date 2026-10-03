/**
 * The one Harmony config codec.
 *
 * "One" is the point: `CLAUDE.md` bans a second PIC18 opcode table because two diverging copies
 * once produced readable but wrong listings, and the same reasoning applies here. The Python
 * container parser stays in `src/harmony/` for the reverse engineering tools, and the two are
 * held equal by golden vectors until it is retired.
 */
export * as bytes from './bytes.ts';
export * from './gspm.ts';
export * from './ezhex.ts';
export * from './valuemap.ts';
export * from './screen.ts';
export * from './sections.ts';
export * from './ir.ts';
// **Exported since 13 August 2026, and its absence was a defect rather than an omission.** `ir.ts`
// held a second function called `irFrame`, and a barrel that exports one of two same named readers
// exports whichever file it lists: `import { irFrame } from '@harmony/codec'` got the heuristic one,
// which read a neighbouring record's durations, while the tested decoder here was reachable only by
// file path. The wrong one is gone and this is the only `irFrame` now.
export * from './irframe.ts';
export * from './irda.ts';
// **The rhythm table and the reader over it, exported because the application is what consumes them.**
// They were reachable only by file path until 24 August 2026, which is the shape of defect the comment
// above records: FreeHarmony carried its own reader for Logitech's catalogue notation for weeks, taking
// 1221 of 5219 commands against this one's 2921 of 2921 distinct codes, and a barrel that does not offer
// a reader is part of why a second one gets written.
export * from './protocols.ts';
export * from './stated.ts';
// After both, since it composes them. Section 139.
export * from './summary.ts';
export * from './actions.ts';
export * from './emit.ts';
export * from './tables.ts';
export * from './touch.ts';
export * from './inventory.ts';
export * from './font.ts';
export * from './alphabets.ts';
export * from './text.ts';
export * from './language.ts';
export * from './render.ts';
export * from './png.ts';
export * from './coverage.ts';
// Which screen bytes are the same on every configuration of a model, which draw run time state, and
// which follow from the setup. After the coverage, since it cuts up what the byte accounting claims.
// Section 317.
export * from './screencategories.ts';
export * from './edit.ts';
// Which activity the three activity keys start on a Harmony 600, 650 or 700, and the same length edits
// that move one, section 314. Beside `edit.ts` because that is what these are.
export * from './activitykeys.ts';
// Mode 0's key list, the table after the end marker, generated from its rule, section 311.
export * from './modezero.ts';
export * from './queue.ts';
export * from './growth.ts';
export * from './relocate.ts';
// The container's frame laid out from content, todo-compile-650 10.1.
export * from './frame.ts';
export * from './compose.ts';
// **The metadata archive**, section 260: the ZIP two architectures carry inside the container,
// which on arch 16 (Harmony 300 and 350) names every device and every command. Exported for the
// same reason the archive readers below are: FreeHarmony is what wants a command's name, and
// what it must not do is grow a second reader for a format we already read.
export * from './metadata.ts';
// **The infrared archive's two readers**, added 31 August 2026 for the reason the `protocols.ts`
// comment above records: FreeHarmony is what consumes a device catalogue, and a barrel that does not
// offer a reader is part of why a second one gets written. `archive.ts` reads Logitech's protocol
// definitions and `catalogue.ts` their device catalogue, out of the same public checkout.
export * from './archive.ts';
export * from './catalogue.ts';
// And how to drive a catalogue device, from the archive's schema version 2: power, inputs, channel
// entry, states and timing, section 305.
export * from './driving.ts';
// And what of that a composed device takes: its power actions and its three delays as the catalogue
// states them, section 320.
export * from './devicepower.ts';
// And what those rules become in a configuration: a device's input and state variables, composed and
// read back, section 321. After `compose.ts` and `driving.ts`, which it builds on.
export * from './inputs.ts';
// A sequence, several commands and pauses on one key or screen item, composed within the action queue,
// todo-compile-650 4.2. After `compose.ts`, whose list append it uses.
export * from './sequence.ts';
// Pronto Hex, which is not the archive's format but is how the comparison against it is made, and is
// the interchange spelling anybody importing or exporting one command will reach for.
export * from './pronto.ts';
