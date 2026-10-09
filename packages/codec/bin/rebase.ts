/**
 * Link a container for another flash address, `rebase` in `relocate.ts`, `todo-compile-650.md` 7.1.1.
 *
 *   node packages/codec/bin/rebase.ts --in <lab name or file> --base 0x30000 --out <file>
 *
 * Prints the base it was linked for, how many fields moved and any that name flash outside it, and
 * checks the result parses at the new base with every structure where it was. Writes bytes to a file
 * and nothing else: putting them on a remote is `packages/corpus/bin/write-config.ts`'s business.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { load } from '@harmony/lab';
import { parse, pointers, rebase } from '../src/index.ts';

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
const moved = rebase(c, base);
const after = parse(moved.bytes);
// The check: the parse finds the new base by itself, and every field lands on the same byte.
const same = (x: typeof c, y: typeof c): boolean => {
  const a = pointers(x).map((p) => `${p.at}:${p.lands}`);
  const b = pointers(y).map((p) => `${p.at}:${p.lands}`);
  return a.length === b.length && a.every((one, k) => one === b[k]);
};
if (after.flashBase !== base) throw new Error(`parsed back at 0x${after.flashBase.toString(16)}, not the base asked for`);
if (!after.allChecksPass) throw new Error('the result fails its own checks');
if (!same(c, after)) throw new Error('a field lands somewhere else after the move');
writeFileSync(out, moved.bytes);
console.log(`0x${c.flashBase.toString(16)} to 0x${base.toString(16)}: ${moved.rewritten.length} fields moved, ` +
  `${moved.outward.length} naming flash outside the container left as they were` +
  moved.outward.map((one) => ` (${one.holder} at ${one.at}: 0x${one.target.toString(16)})`).join(''));
console.log(`parses at the new base, every check passes, every field lands where it did; wrote ${out}`);
