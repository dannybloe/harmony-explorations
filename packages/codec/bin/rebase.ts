/**
 * Link a container for another flash address, `rebase` in `relocate.ts`, `todo-compile-650.md` 7.1.1.
 *
 *   node packages/codec/bin/rebase.ts --in <lab name or file> --base 0x30000 --out <file>
 *
 * Prints the base it was linked for, how many fields moved and any that name flash outside it.
 * `rebase` refuses a result that does not parse at the new base with every census field where it was. Writes bytes to a file
 * and nothing else: putting them on a remote is `packages/corpus/bin/write-config.ts`'s business.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { load } from '@harmony/lab';
import { parse, rebase } from '../src/index.ts';

const argument = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const name = argument('in');
const out = argument('out');
const base = Number(argument('base'));
if (name === undefined || out === undefined || !Number.isInteger(base)) {
  throw new Error('--in <lab name or file> --base <address> --out <file>');
}
const blob = existsSync(name) ? new Uint8Array(readFileSync(name)) : load(name);
if (blob === undefined) throw new Error(`no file and no lab fixture called ${name}`);
const c = parse(blob);
// `rebase` checks its own result and throws rather than return one it cannot vouch for.
const moved = rebase(c, base);
writeFileSync(out, moved.bytes);
console.log(`0x${c.flashBase.toString(16)} to 0x${base.toString(16)}: ${new Set(moved.rewritten.map((one) => one.at)).size} fields moved, ` +
  `${moved.outward.length} naming flash outside the container left as they were` +
  moved.outward.map((one) => ` (${one.holder} at ${one.at}: 0x${one.target.toString(16)})`).join(''));
console.log(`parses at the new base, every check passes, every field lands where it did; wrote ${out}`);
