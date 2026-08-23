import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { keyCodes } from '../src/inventory.ts';
import { irBlockWords, irGroups, irHeaderPointers } from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';
const name = process.argv[2] ?? 'h600_config';
const c = parse(new Uint8Array(readFileSync(imagePath(name)!)));
const read = (record: number): string => {
  const f = irHeaderPointers(c, record)[0];
  const w = f === undefined ? undefined : irBlockWords(c, f);
  if (!w) return '?';
  const r = framesOfPulses(fromFirstMark(pulsesOfWords(w)));
  return r.length === 1 ? frameKey(r[0]!) : r.length === 2 ? 'ambiguous' : 'unread';
};
for (const k of keyCodes(c) ?? []) {
  if (k.codes.length < 2) continue;
  console.log(`${k.where} ${String(k.index).padStart(3)}  scan ${String(k.scan).padStart(2)}  `
    + `event ${k.event}  ${k.codes.length} codes:`);
  for (const one of k.codes) {
    const record = (irGroups(c) ?? [])[one.group]?.addresses[one.code];
    console.log(`      group ${String(one.group).padStart(2)} code ${String(one.code).padStart(3)} `
      + `record ${record === undefined ? '?' : `0x${record.toString(16)}`}  `
      + `${record === undefined ? '' : read(record)}`);
  }
}
