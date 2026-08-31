/**
 * Compare the waveform our encoder builds against the one Logitech's own renderer produced, for every
 * command in the infrared archive that carries one.
 *
 * **Why this is the strongest check our infrared encoder will ever get.** Everything else that judges
 * it is small: 3017 codes in the corpus, 35 families whose rhythm was measured off Logitech's compiler,
 * a few hundred codes a calibration account generated. The archive holds **13.29 million** rendered
 * waveforms, built from Logitech's own protocol definitions by somebody else's code, and every one of
 * them is an answer we can score ourselves against without asking anybody anything.
 *
 * **What it does and does not test.** It does not test whether Logitech's definition is true; both
 * sides read the same definition, so a wrong duration in the definition is a wrong duration in both
 * waveforms. What it tests is the thing far more likely to be wrong, which is us: which slot a frame
 * comes from, mark and space order, where a lead in belongs, how wide a value is, which segment a
 * repeat sends. Every one of those has been wrong here at least once.
 *
 * **The two sections are compared separately and that is deliberate.** A Pronto string states a first
 * transmission and a looping one, which is the same division our block pair makes, and the two are
 * scored apart because they fail for different reasons. Reported per family, since a family is the unit
 * a fix lands in.
 *
 * Needs the public infrared archive checkout and no network and no lab.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE } from '@harmony/lab';
import {
  archiveProtocols, bitsPerDigit, blockOfDefinition, frameWidths, keyCodeOfStatedCode, prontoUnits,
  readPronto,
  prontoPairs, rhythmOfDefinition, statedCode, pulsesOfBlock, withStatedWidths, withToggleCleared,
} from '../src/index.ts';
import type { ArchiveProtocol, BlockTail, FrameShape, StatedCode } from '../src/index.ts';

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
};
const limit = Number(option('codesets') ?? '0');
const only = option('only');
const detail = args.includes('--detail');

const root = IR_ARCHIVE;
if (root === undefined) {
  console.error('no infrared archive checkout found; set HARMONY_IR_ARCHIVE');
  process.exit(1);
}

const byName = new Map<string, ArchiveProtocol>(archiveProtocols(root).map((p) => [p.name, p]));

/** What a family needs, worked out once: its shape, its widths, and the segment join. */
interface Ready {
  shape: FrameShape;
  widths: number[] | undefined;
  perDigit: number;
  protocol: ArchiveProtocol;
}
const ready = new Map<string, Ready | null>();
const setup = (family: string): Ready | null => {
  const had = ready.get(family);
  if (had !== undefined) return had;
  const protocol = byName.get(family);
  let one: Ready | null = null;
  if (protocol !== undefined) {
    const rhythm = rhythmOfDefinition(protocol);
    if (!('refusal' in rhythm)) {
      one = {
        shape: { timings: rhythm.timings, biphase: rhythm.biphase, cells: rhythm.cells },
        widths: frameWidths(protocol),
        perDigit: bitsPerDigit(protocol),
        protocol,
      };
    }
  }
  ready.set(family, one);
  return one;
};

/**
 * The block pair for one command: its own groups, not the family's default.
 *
 * `storedForm: false` because a Pronto string is a signal and not a stored configuration, and the one
 * microsecond Logitech's compiler adds to a block's last duration belongs to the second.
 */
const blocksFor = (
  one: Ready, code: StatedCode,
): { tail: BlockTail; held: BlockTail } | undefined => {
  const keyCode = keyCodeOfStatedCode(one.protocol, code);
  if (keyCode === undefined) return undefined;
  const built = blockOfDefinition(one.protocol, 1, { storedForm: false, keyCode });
  if ('refusal' in built) return undefined;
  return { tail: built.tail, held: built.held };
};

let commands = 0;
let onceCompared = 0; let onceAgreed = 0;
let repeatCompared = 0; let repeatAgreed = 0;
const skipped = new Map<string, number>();
const perFamily = new Map<string, { once: [number, number]; repeat: [number, number] }>();
const samples: string[] = [];
const bump = (m: Map<string, number>, k: string): void => { m.set(k, (m.get(k) ?? 0) + 1); };

let sets = 0;
const buckets = readdirSync(join(root, 'codesets')).sort();
outer: for (const bucket of buckets) {
  for (const file of readdirSync(join(root, 'codesets', bucket)).sort()) {
    sets += 1;
    if (limit > 0 && sets > limit) break outer;
    const parsed = JSON.parse(readFileSync(join(root, 'codesets', bucket, file), 'utf8')) as {
      commands?: { keycode: string; name: string; protocol: string; pronto?: string }[];
    };
    for (const cmd of parsed.commands ?? []) {
      if (only !== undefined && cmd.protocol !== only) continue;
      commands += 1;
      if (cmd.pronto === undefined) { bump(skipped, 'the archive renders no waveform'); continue; }
      const pronto = readPronto(cmd.pronto);
      if (pronto === undefined) { bump(skipped, 'our Pronto reader declines the string'); continue; }
      const one = setup(cmd.protocol);
      if (one === null) { bump(skipped, 'no rhythm derivable for the family'); continue; }
      // The definition's widths go **into** the reader and not over its answer: a base four or base
      // sixteen code is refused outright against the width its family's name states, so correcting it
      // afterwards would never see the code. Section 231.
      const code = statedCode(cmd.keycode, one.widths === undefined
        ? { bitsPerDigit: one.perDigit }
        : { widths: one.widths, bitsPerDigit: one.perDigit });
      if (code === undefined) { bump(skipped, 'our keycode reader declines the code'); continue; }
      const blocks = blocksFor(one, code);
      if (blocks === undefined) { bump(skipped, 'no block derivable for this code'); continue; }
      // **The width comes from the definition and not from the family's name**, which is section 230's
      // second correction: on 23 families the name states the total across the frames rather than each.
      // Their renderings all carry the toggle bit at zero, which their README states, and that is a
      // condition on the comparison rather than a fact about the command: see `withToggleCleared`.
      const frames = withToggleCleared(one.protocol, withStatedWidths(one.protocol, code.frames));
      let ours: number[]; let oursHeld: number[];
      try {
        ours = prontoPairs(prontoUnits(pulsesOfBlock(one.shape, frames, blocks.tail), pronto.unitUs));
        oursHeld = prontoPairs(prontoUnits(pulsesOfBlock(one.shape, frames, blocks.held), pronto.unitUs));
      } catch (e) {
        bump(skipped, `our encoder threw: ${String(e).slice(0, 60)}`);
        continue;
      }
      const row = perFamily.get(cmd.protocol) ?? { once: [0, 0] as [number, number], repeat: [0, 0] as [number, number] };
      const same = (a: readonly number[], b: readonly number[]): boolean =>
        a.length === b.length && a.every((v, at) => v === b[at]);
      onceCompared += 1;
      if (same(ours, pronto.once)) { onceAgreed += 1; row.once[0] += 1; } else {
        row.once[1] += 1;
        if (detail && samples.length < 12) {
          let at = 0;
          while (at < Math.min(ours.length, pronto.once.length) && ours[at] === pronto.once[at]) at += 1;
          samples.push(`${cmd.protocol} ${cmd.keycode}\n`
            + `      ours   ${String(ours.length).padStart(4)} intervals, from ${at}: ${ours.slice(at, at + 5).join(', ')}\n`
            + `      theirs ${String(pronto.once.length).padStart(4)} intervals, from ${at}: ${pronto.once.slice(at, at + 5).join(', ')}`);
        }
      }
      if (pronto.repeat.length > 0) {
        repeatCompared += 1;
        if (same(oursHeld, pronto.repeat)) { repeatAgreed += 1; row.repeat[0] += 1; }
        else row.repeat[1] += 1;
      }
      perFamily.set(cmd.protocol, row);
    }
  }
}

const pct = (n: number, of: number): string => `${(100 * n / Math.max(1, of)).toFixed(3)}%`;
console.log(`${sets - (limit > 0 ? 1 : 0)} code sets, ${commands} commands`);
console.log(`  first transmission: ${onceAgreed} of ${onceCompared} agree, ${pct(onceAgreed, onceCompared)}`);
console.log(`  held repetition:    ${repeatAgreed} of ${repeatCompared} agree, ${pct(repeatAgreed, repeatCompared)}`);
console.log('not compared:');
for (const [why, n] of [...skipped].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(8)} ${why}`);
const bad = [...perFamily].filter(([, r]) => r.once[1] > 0 || r.repeat[1] > 0)
  .sort((a, b) => (b[1].once[1] + b[1].repeat[1]) - (a[1].once[1] + a[1].repeat[1]));
console.log(`families: ${perFamily.size} compared, ${bad.length} with any disagreement`);
for (const [family, r] of bad) {
  console.log(`  ${family.padEnd(34)} first ${r.once[0]} ok ${r.once[1]} bad   held ${r.repeat[0]} ok ${r.repeat[1]} bad`);
}
for (const s of samples) console.log(`  ${s}`);
