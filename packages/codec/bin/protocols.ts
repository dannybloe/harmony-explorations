/**
 * The durations each protocol family uses, measured off the corpus, and the table they become.
 *
 * **The question, in the terms the application asks it in.** Logitech's device database hands out a
 * protocol name and a number, `G:Sony 12 Bit:()(0x910)():3`, and never the rhythm: the raw field was null
 * on all 419 commands ever fetched from it. A config holds the rhythm. `pulsesOfFrame` already turns a
 * number into one **given five durations**, and section 152 measured that those durations can be read off
 * any other code of the same appliance, exactly, on 3547 of 3547 records. So a config that already drives
 * the appliance can gain a code, and a document starting from nothing cannot, because there is no sibling
 * to read the durations from. This asks whether the durations belong to the **family** instead.
 *
 * **The family names are Logitech's and the durations are ours**, which is what lets the answer mean
 * something: the names come from their own analyser through `analyze.ts`, whose reports sit in the lab at
 * `work/myharmony/analyzed/`, and the durations are derived from real recorded rhythms by
 * `timingsOfFrame`. Two ends from two places. Nothing here calls the network.
 *
 * **Their answer also disambiguates ours.** A rhythm that fits both conventions is refused by `irFrame`,
 * correctly, since mark and space lengths alone cannot choose. Where their number matches one of the two
 * readings, that reading is the one.
 *
 * ```
 * node packages/codec/bin/protocols.ts [--detail] [--family "Sony 12 Bit"] [--write]
 * ```
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imagePath, LAB } from '@harmony/lab';
import { parse, type Container } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irCarrier, irClass, irHeaderPointers } from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import {
  framesOfPulses, fromFirstMark, pulsesOfFrame, timingsOfFrame,
  type FrameTimings, type Pulse,
} from '../src/irframe.ts';

if (LAB === undefined) {
  console.error('no lab: this reads the analyser reports in work/myharmony/analyzed/');
  process.exit(1);
}

const detail = process.argv.includes('--detail');
const write = process.argv.includes('--write');
const only = (() => {
  const at = process.argv.indexOf('--family');
  return at < 0 ? undefined : process.argv[at + 1];
})();

interface Row { config: string; record: string; ours: string; theirs?: string }

/** One code, with the durations read off its own recorded rhythm. */
interface Measured {
  family: string;
  /**
   * The carrier as the record states it, a period in nanoseconds.
   *
   * **The stored field and not the frequency**, because the frequency is derived from it by a division
   * and a writer has to emit the byte back. Section 92 measured that the period is `floor(1e9 / f)`, so
   * 36.4 kHz is stored as 27472 and going through the frequency and back would not always land on it.
   */
  periodNs: number;
  config: string;
  record: number;
  bits: number;
  value: bigint;
  timings: FrameTimings;
}

/**
 * The durations that could belong to a protocol, as the key two codes are compared on.
 *
 * **`closing` is deliberately not in it, and leaving it in hid the answer for a run.** On a pulse width
 * protocol the space closing the last pair is the gap that pads the frame out to the protocol's frame
 * period, so it is shorter by one bit's worth for every one bit the code carries. Keyed with it, Sony 12
 * Bit came out as three sets over three codes, which reads as a protocol whose timings are per code.
 * Keyed without it each Sony family is one set, and the closing space is a consequence to be computed.
 */
function key(t: FrameTimings): string {
  return `${t.header[0]}/${t.header[1]} flat ${t.flat} zero ${t.zero} one ${t.one} ${t.carries}`;
}

/**
 * How long a code's frame plus its closing space lasts, which is what lets `closing` be computed.
 *
 * Where a family's codes all give the same answer, that constant minus everything before the last space
 * **is** the closing space, so a code nobody has recorded can be emitted with no sibling to copy from.
 */
function framePeriod(m: Measured): number | undefined {
  if (m.timings.closing === undefined) return undefined;
  let total = m.timings.header[0] + m.timings.header[1];
  for (let i = m.bits - 1; i >= 0; i -= 1) {
    total += (m.value >> BigInt(i)) & 1n ? m.timings.one : m.timings.zero;
    total += i === 0 ? m.timings.closing : m.timings.flat;
  }
  return total;
}

/** The closing space a stated frame period implies: the period minus everything before it. */
function closingFor(t: FrameTimings, bits: number, value: bigint, period: number): number {
  let before = t.header[0] + t.header[1];
  for (let i = bits - 1; i >= 0; i -= 1) {
    before += (value >> BigInt(i)) & 1n ? t.one : t.zero;
    if (i > 0) before += t.flat;
  }
  return period - before;
}

const containers = new Map<string, Container>();
function container(name: string): Container | undefined {
  if (!containers.has(name)) {
    const path = imagePath(name);
    if (path === undefined) return undefined;
    containers.set(name, parse(readFileSync(path)));
  }
  return containers.get(name);
}

/**
 * The entry a family plus a carrier makes, since the carrier is part of the key.
 *
 * **Measured rather than assumed, and it took SharpO1 48 Bit to show it.** That family's codes arrive at
 * 36.4 and 38 kHz and its durations came in two sets; split by carrier, each half is exactly one set and
 * every code of it is reproduced to the microsecond. So an entry is a family at a frequency.
 */
function entryOf(m: Measured): string { return `${m.family}|${m.periodNs}`; }

const reports = join(LAB, 'work', 'myharmony', 'analyzed');
const files = readdirSync(reports).filter((one) => one.endsWith('.json'));

const byEntry = new Map<string, Measured[]>();
let rows = 0;
let named = 0;
const dropped = new Map<string, number>();
function drop(why: string): void { dropped.set(why, (dropped.get(why) ?? 0) + 1); }

for (const file of files) {
  const report = JSON.parse(readFileSync(join(reports, file), 'utf8')) as
    { config: string; rows: Row[] };
  for (const row of report.rows) {
    rows += 1;
    const stated = /^G:([^:]+):\(\)\(0x([0-9A-Fa-f]+)\)/.exec(row.theirs ?? '');
    if (stated === null) { drop('their analyser named no protocol'); continue; }
    named += 1;
    const family = stated[1]!.trim();
    if (only !== undefined && family !== only) continue;
    const c = container(report.config);
    if (c === undefined) { drop('the config is not in this lab'); continue; }
    const record = Number(row.record);
    if (irClass(c, record) !== IR_CLASS_STREAM) { drop('not a stream record'); continue; }
    const first = irHeaderPointers(c, record)[0];
    if (first === undefined) { drop('no block pointer'); continue; }
    const words = irBlockWords(c, first);
    const periodNs = irCarrier(c, record)?.periodNs;
    if (words === undefined || periodNs === undefined || periodNs === 0) {
      drop('no block or no carrier'); continue;
    }
    const train = fromFirstMark(pulsesOfWords(words));
    const wanted = BigInt(`0x${stated[2]!}`);
    const frame = framesOfPulses(train).find((f) => f.value === wanted);
    if (frame === undefined) { drop('no reading of ours carries their number'); continue; }
    const timings = timingsOfFrame(train, frame);
    if (timings === undefined) { drop('the durations do not split'); continue; }
    const m: Measured = { family, periodNs, config: report.config, record, bits: frame.bits,
      value: frame.value, timings };
    byEntry.set(entryOf(m), [...(byEntry.get(entryOf(m)) ?? []), m]);
  }
}

/** One frame period per entry, where every code of it agrees on one. */
const periods = new Map<string, number>();
for (const [entry, list] of byEntry) {
  const seen = new Set(list.map(framePeriod).filter((one) => one !== undefined));
  if (seen.size === 1) periods.set(entry, [...seen][0]!);
}

/**
 * Whether one set of durations reproduces this code's own rhythm, exactly or within a band.
 *
 * **Exact and near are two different questions and both matter.** An appliance's receiver tolerates a
 * few percent, so near enough is a rhythm that works; identical is what Logitech's own compiler would
 * have emitted. A table drawn from a family's commonest durations aims at the first, and only a compile
 * of that very appliance reaches the second.
 */
function reproduces(m: Measured, t: FrameTimings, tolerance = 0): boolean {
  if (t.carries !== m.timings.carries) return false;
  const c = container(m.config);
  const first = c === undefined ? undefined : irHeaderPointers(c, m.record)[0];
  const words = first === undefined ? undefined : irBlockWords(c!, first);
  if (words === undefined) return false;
  const original = fromFirstMark(pulsesOfWords(words)).slice(0, 2 + 2 * m.bits);
  const period = periods.get(entryOf(m));
  const used = t.carries === 'mark' && period !== undefined
    ? { ...t, closing: closingFor(t, m.bits, m.value, period) }
    : t;
  let built: Pulse[];
  try { built = pulsesOfFrame(used, m.bits, m.value); } catch { return false; }
  if (built.length !== original.length) return false;
  return built.every((p, i) => {
    const want = original[i]!;
    if (p.mark !== want.mark) return false;
    return tolerance === 0 ? p.us === want.us
      : Math.abs(p.us - want.us) <= Math.max(1, want.us * tolerance);
  });
}

/** The tightest band that still covers a whole entry, so the spread is a number and not a bound. */
const BANDS = [0, 0.001, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05, 0.1];

interface Entry {
  family: string;
  periodNs: number;
  timings: FrameTimings;
  period?: number;
  codes: number;
  exact: number;
  band: number;
  configs: readonly string[];
  sets: number;
}

const entries: Entry[] = [];
for (const [entry, list] of [...byEntry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const sets = new Map<string, Measured[]>();
  for (const m of list) sets.set(key(m.timings), [...(sets.get(key(m.timings)) ?? []), m]);
  // Commonest rather than first, so one odd appliance cannot decide an entry.
  const best = [...sets.values()].sort((a, b) => b.length - a.length)[0]!;
  const timings = best[0]!.timings;
  const band = BANDS.find((b) => list.every((m) => reproduces(m, timings, b)));
  entries.push({
    family: list[0]!.family,
    periodNs: list[0]!.periodNs,
    timings,
    ...(periods.get(entry) === undefined ? {} : { period: periods.get(entry)! }),
    codes: list.length,
    exact: list.filter((m) => reproduces(m, timings)).length,
    band: band ?? 1,
    configs: [...new Set(list.map((m) => m.config))],
    sets: sets.size,
  });
  if (detail) {
    for (const [k, of] of [...sets.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(of.length).padStart(4)}  ${k}  [${[...new Set(of.map((m) => m.config))]}]`);
    }
  }
}

console.log(`${rows} codes in ${files.length} analyser reports, ${named} of them named a protocol\n`);
const head = `${'protocol family'.padEnd(20)} ${'kHz'.padStart(5)} ${'codes'.padStart(6)} `
  + `${'sets'.padStart(5)} ${'period'.padStart(7)} ${'exact'.padStart(11)} ${'spread'.padStart(7)}`;
console.log(head);
console.log('-'.repeat(head.length));
for (const e of entries) {
  console.log(`${e.family.padEnd(20)} ${(Math.round(1e7 / e.periodNs) / 10).toFixed(1).padStart(5)} `
    + `${String(e.codes).padStart(6)} ${String(e.sets).padStart(5)} `
    + `${(e.period === undefined ? 'n/a' : String(e.period)).padStart(7)} `
    + `${`${e.exact}/${e.codes}`.padStart(11)} ${`${(e.band * 100).toFixed(1)}%`.padStart(7)}`);
}
console.log('-'.repeat(head.length));
const codes = entries.reduce((n, e) => n + e.codes, 0);
const exact = entries.reduce((n, e) => n + e.exact, 0);
console.log(`${'total'.padEnd(20)} ${''.padStart(5)} ${String(codes).padStart(6)} `
  + `${''.padStart(5)} ${''.padStart(7)} ${`${exact}/${codes}`.padStart(11)}`);

console.log('\nnot measured, and why:');
for (const [why, n] of [...dropped.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${why}`);
}

/** The head of the generated file, kept here so the generator and its output cannot drift. */
const GENERATED = `/**
 * What rhythm each protocol family uses, so a code stated as a name and a number can be emitted.
 *
 * **Generated by \`packages/codec/bin/protocols.ts --write\`, do not edit by hand.** \`make protocols\`
 * prints the measurement and \`--write\` puts it here, the same arrangement as the glyph table.
 *
 * **Why this file has to exist.** Logitech's device database gives a protocol name and a number and never
 * the rhythm: the raw field was null on all 419 commands ever fetched. So a device taken from their
 * catalogue cannot be written to a remote without knowing what "Sony 12 Bit" sounds like. Section 152
 * measured that the durations can be copied off any other code of the same **appliance**, which serves a
 * config that already drives it and cannot serve a document starting from nothing.
 *
 * **An entry is a family at a carrier frequency**, which is measured and not tidiness: SharpO1 48 Bit
 * arrives at 36.4 and 38 kHz and its durations came in two sets until they were split that way, after
 * which each half reproduces every one of its codes to the microsecond.
 *
 * **\`framePeriod\` replaces the closing space rather than tabling it.** On a pulse width protocol the
 * space that closes the last pair pads the frame out to a constant total, so it is shorter by one bit's
 * worth for every one bit the code carries. Tabling it made Sony 12 Bit look like three protocols over
 * three codes; computing it from the period makes it one. Both Sony families come out at exactly 45000
 * microseconds, which is the published frame period of that protocol and was not fitted to.
 *
 * **\`exact\` and \`spread\` are what the entry is worth, and they are two different claims.** \`exact\` is
 * how many of its codes this rhythm reproduces to the microsecond, which is what Logitech's own compiler
 * emitted. \`spread\` is the tightest band that covers all of them, which is what an appliance's receiver
 * cares about. An entry with a spread of 0.02 will be accepted by the equipment and will not be byte
 * identical to a config Logitech built.
 */
import type { FrameCarrier } from './irframe.ts';

export interface StatedProtocol {
  /** Logitech's own name for it, as their analyser and their catalogue spell it. */
  readonly family: string;
  /** The carrier as a record states it, a period in nanoseconds. 38 kHz is 26315. */
  readonly periodNs: number;
  readonly header: readonly [number, number];
  readonly flat: number;
  readonly zero: number;
  readonly one: number;
  readonly carries: FrameCarrier;
  /** The constant total a pulse width frame is padded out to, absent on a pulse distance one. */
  readonly framePeriod?: number;
  /** How many corpus codes the entry was measured over, and how many it reproduces exactly. */
  readonly codes: number;
  readonly exact: number;
  /** The tightest band, as a fraction, that covers every code of the entry. */
  readonly spread: number;
}
`;

if (write) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'protocols.ts');
  const rowsOut = entries.map((e) => {
    const t = e.timings;
    return `  { family: '${e.family}', periodNs: ${e.periodNs}, `
      + `header: [${t.header[0]}, ${t.header[1]}], flat: ${t.flat}, zero: ${t.zero}, one: ${t.one}, `
      + `carries: '${t.carries}',${e.period === undefined ? '' : ` framePeriod: ${e.period},`}`
      + ` codes: ${e.codes}, exact: ${e.exact}, spread: ${e.band} },`;
  }).join('\n');
  writeFileSync(out, `${GENERATED}\nexport const PROTOCOLS: readonly StatedProtocol[] = [\n${rowsOut}\n];\n`);
  console.log(`\n${entries.length} entries written to src/protocols.ts`);
}
