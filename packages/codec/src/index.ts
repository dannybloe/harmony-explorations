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
export * from './coverage.ts';
