// A press is a burst. Split the block on long silences and read each burst on its own: a sequence of
// presses is then two or more bursts that are not the same code.
import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irGroups, irHeaderPointers } from '../src/ir.ts';
import { mergedIntervals, pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';
import type { Pulse } from '../src/irframe.ts';

const CONTAINERS = ['one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config',
  'h700_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
  'arch8_config_880', 'arch8_config_885', 'one_spare_before_sync', 'one_spare_after_sync',
  'calibration_one', 'calibration_h600'];
const QUIET = 10_000;

function bursts(train: readonly Pulse[]): Pulse[][] {
  const out: Pulse[][] = [];
  let one: Pulse[] = [];
  for (const p of train) {
    if (!p.mark && p.us > QUIET) { if (one.length > 0) out.push(one); one = []; continue; }
    one.push(p);
  }
  if (one.length > 0) out.push(one);
  return out;
}

const shape = new Map<string, number>();
const where = new Map<string, number>();
for (const name of CONTAINERS) {
  const p = imagePath(name);
  if (p === undefined) continue;
  const c = parse(new Uint8Array(readFileSync(p)));
  for (const group of irGroups(c) ?? []) {
    for (const record of group.addresses) {
      if (irClass(c, record) !== IR_CLASS_STREAM) continue;
      const first = irHeaderPointers(c, record)[0];
      if (first === undefined) continue;
      const words = irBlockWords(c, first);
      if (words === undefined) continue;
      const train = mergedIntervals(fromFirstMark(pulsesOfWords(words)));
      if (train.length === 0) continue;
      // Each burst gets its closing silence back, since a pulse width frame needs it.
      const reads = bursts(train).map((b) => {
        const r = framesOfPulses([...b, { mark: false, us: 20_000 }]);
        return r.length === 1 ? frameKey(r[0]!) : r.length === 2 ? 'ambiguous' : 'unread';
      });
      const distinct = new Set(reads.filter((r) => r !== 'unread' && r !== 'ambiguous'));
      const key = reads.length === 1 ? `1 burst, ${reads[0] === 'unread' || reads[0] === 'ambiguous' ? reads[0] : 'read'}`
        : distinct.size > 1 ? `${reads.length} bursts, ${distinct.size} DIFFERENT codes`
        : distinct.size === 1 ? `${reads.length} bursts, one code repeated`
        : `${reads.length} bursts, none read`;
      shape.set(key, (shape.get(key) ?? 0) + 1);
      if (distinct.size > 1) where.set(name, (where.get(name) ?? 0) + 1);
    }
  }
}
for (const [k, n] of [...shape].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${k}`);
console.log('\nrecords holding more than one distinct code, per container:');
console.log([...where].map(([w, n]) => `  ${w} ${n}`).join('\n') || '  none');
