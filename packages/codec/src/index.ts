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
export * from './edit.ts';
export * from './growth.ts';
