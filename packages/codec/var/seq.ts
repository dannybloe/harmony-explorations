import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irGroups, irHeaderPointers } from '../src/ir.ts';
import { mergedIntervals, pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';
import type { Pulse } from '../src/irframe.ts';
const name = process.argv[2]!;
const c = parse(new Uint8Array(readFileSync(imagePath(name)!)));
let shown = 0;
outer: for (const g of irGroups(c) ?? []) for (const r of g.addresses) {
  if (irClass(c, r) !== IR_CLASS_STREAM) continue;
  const f = irHeaderPointers(c, r)[0]; if (f === undefined) continue;
  const w = irBlockWords(c, f); if (!w) continue;
  const m = mergedIntervals(fromFirstMark(pulsesOfWords(w)));
  const out: string[] = []; let at = 0, guard = 0;
  while (at < m.length && guard < 40) {
    guard += 1;
    while (at < m.length && !m[at]!.mark) at += 1;
    if (at >= m.length) break;
    const here = framesOfPulses(m.slice(at));
    if (here.length !== 1) { at += 1; continue; }
    out.push(`@${at} ${frameKey(here[0]!)}`);
    at += 2 + 2 * here[0]!.bits;
  }
  if (new Set(out.map((s) => s.split(' ')[1])).size > 1) {
    console.log(`\n0x${r.toString(16)}  ${out.join('  ')}`);
    console.log(`  ${m.map((p) => `${p.mark ? '+' : '-'}${p.us}`).join(' ').slice(0, 260)}`);
    shown += 1;
    if (shown >= 2) break outer;
  }
}
