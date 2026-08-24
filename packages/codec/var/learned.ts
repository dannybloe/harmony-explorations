// Danny's point: many stored codes were learned off the original remote, and a command can be a
// sequence of presses. Does either show up in the records our decoders disagree about?
import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irGroupCount, irGroups, irHeaderPointers }
  from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark, mergedIntervals } from '../src/irframe.ts';
import type { Pulse } from '../src/irframe.ts';

const CONTAINERS = ['one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config',
  'h700_config_2', 'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b',
  'arch8_config_c', 'arch8_config_d', 'arch8_config_880', 'arch8_config_885',
  'one_spare_before_sync', 'one_spare_after_sync', 'calibration_one', 'calibration_h600'];

/** Every frame in a block, not only the first: a sequence would show up as several different ones. */
function framesIn(train: readonly Pulse[]): string[] {
  const out: string[] = [];
  let at = 0;
  let guard = 0;
  while (at < train.length && guard < 40) {
    guard += 1;
    while (at < train.length && !train[at]!.mark) at += 1;
    if (at >= train.length) break;
    const here = framesOfPulses(train.slice(at));
    if (here.length !== 1) { at += 1; continue; }
    const f = here[0]!;
    out.push(frameKey(f));
    // Step past this frame: the header pair plus a pair per bit.
    at += 2 + 2 * f.bits;
  }
  return out;
}

const classes = new Map<string, number>();
const perKind = new Map<string, { n: number; where: Map<string, number> }>();
let multi = 0;
const multiWhere = new Map<string, number>();
for (const name of CONTAINERS) {
  const p = imagePath(name);
  if (p === undefined) continue;
  const c = parse(new Uint8Array(readFileSync(p)));
  for (const group of irGroups(c) ?? []) {
    for (const record of group.addresses) {
      const cls = irClass(c, record);
      classes.set(`${name.replace(/_config.*|_before.*|_after.*/, '')} class ${cls} groups ${irGroupCount(c, record)}`,
        (classes.get(`${name.replace(/_config.*|_before.*|_after.*/, '')} class ${cls} groups ${irGroupCount(c, record)}`) ?? 0) + 1);
      if (cls !== IR_CLASS_STREAM) continue;
      const first = irHeaderPointers(c, record)[0];
      if (first === undefined) continue;
      const words = irBlockWords(c, first);
      if (words === undefined) continue;
      const raw = fromFirstMark(pulsesOfWords(words));
      if (raw.length === 0) continue;
      const ours = framesOfPulses(raw);
      const merged = framesOfPulses(mergedIntervals(raw));
      const kind = ours.length === 1
        ? (merged.length === 0 ? 'one reading, none once merged' : 'one reading')
        : ours.length === 2 ? 'both conventions' : 'no reading';
      const one = perKind.get(kind) ?? { n: 0, where: new Map<string, number>() };
      one.n += 1;
      one.where.set(name, (one.where.get(name) ?? 0) + 1);
      perKind.set(kind, one);
      // A sequence in one block: two or more different frames.
      const seen = new Set(framesIn(mergedIntervals(raw)));
      if (seen.size > 1) { multi += 1; multiWhere.set(name, (multiWhere.get(name) ?? 0) + 1); }
    }
  }
}
console.log('record classes and pointer groups:');
for (const [k, n] of [...classes].sort()) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log('\nwhere each verdict lives:');
for (const [k, v] of perKind) {
  console.log(`  ${k} (${v.n}):`);
  console.log(`     ${[...v.where].map(([w, n]) => `${w} ${n}`).join(', ')}`);
}
console.log(`\nblocks holding more than one distinct frame: ${multi}`);
console.log(`  ${[...multiWhere].map(([w, n]) => `${w} ${n}`).join(', ')}`);
