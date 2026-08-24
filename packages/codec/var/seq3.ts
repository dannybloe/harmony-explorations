import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irGroups, irHeaderPointers } from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark, mergedIntervals } from '../src/irframe.ts';
import type { Pulse } from '../src/irframe.ts';
const QUIET = 10_000;
function bursts(t: readonly Pulse[]): Pulse[][] {
  const out: Pulse[][] = []; let one: Pulse[] = [];
  for (const p of t) { if (!p.mark && p.us > QUIET) { if (one.length) out.push(one); one = []; continue; } one.push(p); }
  if (one.length) out.push(one); return out;
}
for (const name of process.argv.slice(2)) {
  const c = parse(new Uint8Array(readFileSync(imagePath(name)!)));
  let shown = 0;
  outer: for (const g of irGroups(c) ?? []) for (const r of g.addresses) {
    if (irClass(c, r) !== IR_CLASS_STREAM) continue;
    const f = irHeaderPointers(c, r)[0]; if (f === undefined) continue;
    const w = irBlockWords(c, f); if (!w) continue;
    const t = mergedIntervals(fromFirstMark(pulsesOfWords(w)));
    const reads = bursts(t).map((b) => {
      const x = framesOfPulses([...b, { mark: false, us: 20_000 }]);
      return x.length === 1 ? frameKey(x[0]!) : x.length === 2 ? 'ambiguous' : 'unread';
    });
    const d = new Set(reads.filter((x) => x !== 'unread' && x !== 'ambiguous'));
    if (d.size < 2) continue;
    console.log(`${name} 0x${r.toString(16)}  ${reads.join(' | ')}`);
    if (d.size === 2) {
      const [a, b] = [...d].map((s) => ({ bits: Number(s.split(':')[0]), v: BigInt('0x' + s.split(':')[1]) }));
      if (a && b && a.bits === b.bits) {
        console.log(`    xor 0x${(a.v ^ b.v).toString(16)}   diff bits `
          + `${(a.v ^ b.v).toString(2).split('').filter((x) => x === '1').length}`);
      }
    }
    shown += 1; if (shown >= 4) break outer;
  }
  console.log();
}
