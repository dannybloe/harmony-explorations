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
import { payloadOf } from '../src/ezhex.ts';
import { statedCode } from '../src/stated.ts';
import { devices } from '../src/inventory.ts';
import { IR_CLASS_STREAM, irBlockWords, irCarrier, irClass, irGroups,
         irHeaderPointers } from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import {
  biphaseFrames, framesOfPulses, fromFirstMark, pulsesOfBiphaseFrame, pulsesOfFrame, timingsOfBiphase,
  timingsOfFrame, type BiphaseTimings, type FrameTimings, type Pulse,
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
   * Which evidence this row came from, because the two are not equally strong.
   *
   * `corpus` is a record in a configuration somebody's remote was actually carrying, whose family came
   * from Logitech's **analyser** naming our decoding of it. `compiled` is a record in a configuration
   * their **compiler** produced on request, whose family came from their **catalogue** stating it for
   * the same command. The second involves no third party decoder at either end, and section 159
   * measured their analyser accepting two rhythms their compiler does not emit, so where the two
   * disagree the compiled row is the one to believe.
   */
  source: 'corpus' | 'compiled';
  /**
   * How the record was tied to a catalogue family: by its **value**, which is nearly unique and
   * therefore exact, or by its bit **width** where the value did not match and the owning appliance
   * states exactly one family at that width. The second is an inference and is counted separately.
   */
  joinedBy?: 'value' | 'width';
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
  /** A pulse distance or pulse width family's five durations, absent on a biphase one. */
  timings?: FrameTimings;
  /** A biphase family's half cell, lead in and polarity, absent on the others. Section 162. */
  biphase?: BiphaseTimings;
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
function key(m: Measured): string {
  const t = m.timings;
  if (t !== undefined) {
    return `${t.header[0]}/${t.header[1]} flat ${t.flat} zero ${t.zero} one ${t.one} ${t.carries}`;
  }
  const b = m.biphase!;
  // The lead in is part of the key: it is a fixed prelude, so two records of one family that disagree
  // about it are two rhythms and have to show up as two sets rather than being averaged.
  return `biphase ${b.firstMark === undefined ? '' : `${b.firstMark}/`}${b.mark}/${b.space} `
    + `lead ${b.lead.map((one) => `${one.mark ? '+' : '-'}${one.us}`).join(' ')} `
    + `set is ${b.setIsMark ? 'mark' : 'space'} first`;
}

/**
 * How long a code's frame plus its closing space lasts, which is what lets `closing` be computed.
 *
 * Where a family's codes all give the same answer, that constant minus everything before the last space
 * **is** the closing space, so a code nobody has recorded can be emitted with no sibling to copy from.
 */
function framePeriod(m: Measured): number | undefined {
  const t = m.timings;
  // A biphase family has no closing space and no frame period: every cell is the same length, so there
  // is nothing to pad out to.
  if (t === undefined || t.closing === undefined) return undefined;
  let total = t.header[0] + t.header[1];
  for (let i = m.bits - 1; i >= 0; i -= 1) {
    total += (m.value >> BigInt(i)) & 1n ? t.one : t.zero;
    total += i === 0 ? t.closing : t.flat;
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

/**
 * The name the compiled sample is filed under, which is deliberately not in `IMAGES`.
 *
 * It is a **known answer** sample rather than a corpus member: the appliances on it were chosen to make
 * Logitech's compiler emit particular protocol families, so counting it in a corpus wide total would be
 * counting an experiment we designed. Same reason the two calibration containers sit outside
 * `CONTAINERS`.
 */
const COMPILED_NAME = 'compiled-20260824';
const COMPILED = join(LAB, 'reads', '20260824-protocols', 'Result.EzHex');
const COMPILED_COMMANDS = join(LAB, 'work', 'myharmony', 'responses-account2', 'OneResCommands.json');

const containers = new Map<string, Container>();
function container(name: string): Container | undefined {
  if (!containers.has(name)) {
    // The compiled sample is loaded by path rather than through `imagePath`, since it is a read filed
    // under its own date and not one of the lab's named images.
    if (name === COMPILED_NAME) {
      try {
        containers.set(name, parse(payloadOf(new Uint8Array(readFileSync(COMPILED)), COMPILED)));
      } catch { return undefined; }
      return containers.get(name);
    }
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
    if (frame !== undefined) {
      const timings = timingsOfFrame(train, frame);
      if (timings === undefined) { drop('the durations do not split'); continue; }
      const m: Measured = { family, source: 'corpus', joinedBy: 'value', periodNs,
        config: report.config, record, bits: frame.bits, value: frame.value, timings };
      byEntry.set(entryOf(m), [...(byEntry.get(entryOf(m)) ?? []), m]);
      continue;
    }
    // **The biphase route on real configurations**, section 162, which is where the confirmation is: the
    // reading was worked out on a configuration their compiler made for appliances we chose, and these
    // are four contributed configs from somebody else's household with their analyser's answer beside
    // each record. A family measured on both routes carries `both`.
    let bi: Measured | undefined;
    for (const f of biphaseFrames(train)) {
      for (let bits = f.bits; bits >= 8 && bi === undefined; bits -= 1) {
        const mask = (1n << BigInt(bits)) - 1n;
        const low = f.value & mask;
        for (const setIsMark of [true, false]) {
          if ((setIsMark ? low : low ^ mask) !== wanted) continue;
          const biphase = timingsOfBiphase(train, f.skipped + 2 * (f.bits - bits), bits, setIsMark);
          if (biphase === undefined) continue;
          bi = { family, source: 'corpus', joinedBy: 'value', periodNs,
            config: report.config, record, bits, value: wanted, biphase };
          break;
        }
      }
      if (bi !== undefined) break;
    }
    if (bi === undefined) { drop('no reading of ours carries their number'); continue; }
    byEntry.set(entryOf(bi), [...(byEntry.get(entryOf(bi)) ?? []), bi]);
  }
}

/**
 * The second evidence source: a configuration **Logitech's own compiler** produced on request.
 *
 * **Why this exists, and why it is stronger than the loop above.** Their catalogue states a command as
 * a protocol family and a number and never the rhythm, so a family no configuration here holds a record
 * of cannot be measured off the corpus at all, and section 159 established that their analyser cannot
 * rule on one either: it recognises a rhythm at a bit width from its own list and refuses the rest. So
 * fifteen appliances were put on a test account on 24 August 2026, chosen to cover families the corpus
 * has never seen, and the service was asked to compile a configuration for a Harmony One. That file
 * holds the durations **their generator emits**, and their catalogue states the family for the same
 * commands, so joining the two involves no decoder of anybody's at either end.
 *
 * The join is per group and then per record, and both halves were got wrong first:
 *
 * * **The owning appliance is named by the config itself**, section 161, and the overlap is the fallback
 *   rather than the rule. A group's device name comes out of base slot 0 through base slot 13, section
 *   126, and the account states the same name for the appliance, so the two join on a string with no
 *   number involved. That agrees with the overlap on 11 of the 11 groups the overlap could decide, and
 *   it decides the 4 it could not, which had been dropped whole: 242 records, including every record of
 *   three protocol families. Pooling every appliance's numbers, which came first, left 88 of them
 *   claimed by two appliances at once and therefore unusable.
 * * **A family may carry its bits the other way up**, section 161. `Logitech 24 Bit` states the number
 *   whose complement our decoder reads, on 71 of 71 records, because its set bit is the **shorter**
 *   space where every other family here uses the longer one. Nothing in the durations says which, so the
 *   join tries the complement and, where it hits, records the stated value with `zero` and `one`
 *   exchanged. That needs no new field: the entry says `zero: 1000, one: 500` and an encoder reading it
 *   emits the right pulses, which `reproduces` then checks against the record byte for byte.
 * * **The header convention is per record**, not per group. One Denon receiver carries a 48 bit family
 *   that opens with a lead in and a 15 bit one that opens on its first bit; deciding it per group read
 *   the headerless half with a header, which eats its first bit cell and yields a number no catalogue
 *   code carries.
 */

interface Appliance {
  make: string;
  model: string;
  /** The name the account gives this appliance, which is what the config's own device name matches. */
  name: string;
  commands: { name: string; keyCode: string }[];
}

/** The complement of a value at its own width, which is one family's bit polarity. */
function complement(value: bigint, bits: number): bigint { return value ^ ((1n << BigInt(bits)) - 1n); }

function compiledRows(): Measured[] {
  let blob: Uint8Array;
  let catalogue: { appliances: Appliance[] };
  try {
    blob = new Uint8Array(readFileSync(COMPILED));
    catalogue = JSON.parse(readFileSync(COMPILED_COMMANDS, 'utf8')) as { appliances: Appliance[] };
  } catch {
    console.log('no compiled sample in this lab, so only the analyser reports are measured\n');
    return [];
  }
  const c = parse(payloadOf(blob, COMPILED));
  // Per appliance: value to family, and which widths it states. The widths are what lets a record whose
  // value does not join still be attributed, where the appliance states one family at that width.
  const appliances = catalogue.appliances.map((a) => {
    const byValue = new Map<string, string>();
    const byWidth = new Map<number, Set<string>>();
    for (const cmd of a.commands) {
      const read = statedCode(cmd.keyCode);
      if (read === undefined) continue;
      for (const f of read.frames) {
        byValue.set(`${f.bits}:${f.value.toString(16)}`, read.family);
        byWidth.set(f.bits, (byWidth.get(f.bits) ?? new Set()).add(read.family));
      }
    }
    return { label: `${a.make} ${a.model}`, name: a.name, byValue, byWidth };
  });

  // **The config names its own groups**, so the attribution is a string join rather than a vote. A
  // device's name is a prefix of a state variable's, reached through the list that sends its codes,
  // section 126, and the account gives the same name to the appliance. Underscores are the config's
  // spelling of the spaces in it.
  const named = new Map<number, number>();
  for (const device of devices(c)) {
    const at = device.name === undefined ? -1
      : appliances.findIndex((a) => a.name.replace(/ /g, '_') === device.name);
    if (at >= 0) named.set(device.group, at);
  }

  const out: Measured[] = [];
  /** How the attribution routes compared, which is the closure rather than a diagnostic. */
  const attribution = { agree: 0, differ: 0, namedOnly: 0, votedOnly: 0, byElimination: 0 };
  const readings = (train: readonly Pulse[], pairs: number) =>
    framesOfPulses(train, pairs).map((f) => ({ f, key: `${f.bits}:${f.value.toString(16)}` }));

  /** Every group's records, decoded once, because the attribution needs all of them before any join. */
  const groups = (irGroups(c) ?? []).map((group) => {
    const decoded: { record: number; periodNs: number; train: readonly Pulse[] }[] = [];
    for (const record of group.addresses) {
      if (irClass(c, record) !== IR_CLASS_STREAM) { drop('compiled: not a stream record'); continue; }
      const first = irHeaderPointers(c, record)[0];
      if (first === undefined) { drop('compiled: no block pointer'); continue; }
      const words = irBlockWords(c, first);
      const periodNs = irCarrier(c, record)?.periodNs;
      if (words === undefined || periodNs === undefined || periodNs === 0) {
        drop('compiled: no block or carrier'); continue;
      }
      decoded.push({ record, periodNs, train: fromFirstMark(pulsesOfWords(words)) });
    }
    return decoded;
  });

  // **Three routes in order, which is what section 126 does for a device's name and for the same
  // reason.** The name the config states, then the number overlap, then elimination once one group and
  // one appliance are left. Elimination is what reaches a group whose codes nothing here can read at
  // all, which is exactly the case the overlap cannot speak for.
  const ownerOf = new Map<number, number>();
  // An appliance the config has already named for another group is out of the vote's reach. Without
  // that, a group nothing reads is claimed by whichever appliance shares one number with it, which is a
  // vote of one, and it happened: the group holding every `Kreatel IP 22 Bit` record went to a Denon
  // receiver that the config names for a different group.
  const claimedByName = new Set(named.values());
  for (const [groupAt, decoded] of groups.entries()) {
    let vote = { hits: 0, at: -1 };
    for (const [at, a] of appliances.entries()) {
      if (claimedByName.has(at) && named.get(groupAt) !== at) continue;
      let hits = 0;
      for (const d of decoded) {
        if ([1, 0].some((pairs) => readings(d.train, pairs).some((k) => a.byValue.has(k.key)))) {
          hits += 1;
        }
      }
      if (hits > vote.hits) vote = { hits, at };
    }
    const stated = named.get(groupAt) ?? -1;
    if (stated >= 0 && vote.at >= 0) {
      if (stated === vote.at) attribution.agree += 1; else attribution.differ += 1;
    } else if (stated >= 0) attribution.namedOnly += 1;
    else if (vote.at >= 0) attribution.votedOnly += 1;
    const at = stated >= 0 ? stated : vote.at;
    if (at >= 0) ownerOf.set(groupAt, at);
  }
  const spareGroups = groups.map((_, i) => i).filter((i) => !ownerOf.has(i));
  const taken = new Set(ownerOf.values());
  const spareAppliances = appliances.map((_, i) => i).filter((i) => !taken.has(i));
  if (spareGroups.length === 1 && spareAppliances.length === 1) {
    ownerOf.set(spareGroups[0]!, spareAppliances[0]!);
    attribution.byElimination += 1;
  }

  for (const [groupAt, decoded] of groups.entries()) {
    const at = ownerOf.get(groupAt) ?? -1;
    if (at < 0) { drop('compiled: no appliance matches any number in the group'); continue; }
    const owner = appliances[at]!;
    for (const d of decoded) {
      let landed = false;
      let read = false;
      for (const pairs of [1, 0]) {
        for (const r of readings(d.train, pairs)) {
          read = true;
          // **A family may carry its bits the other way up.** `Logitech 24 Bit` states the complement
          // of what our decoder reads, because its set bit is the shorter space. Where the complement
          // is what the appliance states, the frame recorded is theirs and the two carried lengths are
          // exchanged, so an encoder built from the entry emits this record again exactly.
          const flipped = complement(r.f.value, r.f.bits);
          const asRead = owner.byValue.get(r.key);
          const asFlipped = asRead === undefined
            ? owner.byValue.get(`${r.f.bits}:${flipped.toString(16)}`) : undefined;
          const widths = owner.byWidth.get(r.f.bits);
          const byWidth = asRead === undefined && asFlipped === undefined && widths?.size === 1
            ? [...widths][0] : undefined;
          const family = asRead ?? asFlipped ?? byWidth;
          if (family === undefined) continue;
          const measured = timingsOfFrame(d.train, r.f, pairs);
          if (measured === undefined) { drop('compiled: the durations do not split'); continue; }
          const timings = asFlipped === undefined ? measured
            : { ...measured, zero: measured.one, one: measured.zero };
          out.push({ family, source: 'compiled',
            joinedBy: asRead === undefined && asFlipped === undefined ? 'width' : 'value',
            periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
            bits: r.f.bits, value: asFlipped === undefined ? r.f.value : flipped, timings });
          landed = true;
          break;
        }
        if (landed) break;
      }
      // **The biphase route, tried where no pulse distance reading matched.** Three families in this
      // sample carry the bit in which half of one cell the carrier is on, and section 162 measured that
      // the alignment, the polarity and the width are decided by which of them lands on a number the
      // appliance states. Every one that lands then rebuilds its record byte for byte.
      if (!landed) {
        for (const f of biphaseFrames(d.train)) {
          for (const bits of owner.byWidth.keys()) {
            if (bits > f.bits) continue;
            const mask = (1n << BigInt(bits)) - 1n;
            const low = f.value & mask;
            for (const setIsMark of [true, false]) {
              const value = setIsMark ? low : low ^ mask;
              const family = owner.byValue.get(`${bits}:${value.toString(16)}`);
              if (family === undefined) continue;
              // The leading bits this reading has over the stated width are lead in, so they move into
              // the prelude: two half cells per bit.
              const skipped = f.skipped + 2 * (f.bits - bits);
              const biphase = timingsOfBiphase(d.train, skipped, bits, setIsMark);
              if (biphase === undefined) { drop('compiled: the half cells are not one length'); continue; }
              out.push({ family, source: 'compiled', joinedBy: 'value',
                periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
                bits, value, biphase });
              landed = true;
              break;
            }
            if (landed) break;
          }
          if (landed) break;
        }
      }
      // **Two reasons, not one.** The old label said no reading matched a code, which was also what a
      // record nothing could read at all reported, and those need different work: one is a number
      // question and the other is the decoder's.
      if (!landed) {
        drop(read ? 'compiled: no reading matches a code of the record\'s own appliance'
                  : 'compiled: no reading of ours at all, which is a biphase code or a long bit space');
      }
    }
  }
  console.log(`attribution: the config's own device name and the number overlap agree on `
    + `${attribution.agree} group(s) and differ on ${attribution.differ}; `
    + `${attribution.namedOnly} named where no number matched, `
    + `${attribution.votedOnly} matched where the config states no name, `
    + `${attribution.byElimination} by elimination\n`);
  return out;
}

for (const m of compiledRows()) byEntry.set(entryOf(m), [...(byEntry.get(entryOf(m)) ?? []), m]);

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
function reproduces(m: Measured, shape: Measured, tolerance = 0): boolean {
  const t = shape.timings;
  const b = shape.biphase;
  // A pulse distance shape cannot answer for a biphase record or the other way round, and the two
  // never mix inside one entry, so this is a guard rather than a case.
  if ((t === undefined) !== (m.timings === undefined)) return false;
  if (t !== undefined && t.carries !== m.timings!.carries) return false;
  const c = container(m.config);
  const first = c === undefined ? undefined : irHeaderPointers(c, m.record)[0];
  const words = first === undefined ? undefined : irBlockWords(c!, first);
  if (words === undefined) return false;
  let built: Pulse[];
  let original: readonly Pulse[];
  const train = fromFirstMark(pulsesOfWords(words));
  if (b !== undefined) {
    // The lead in plus one word per half cell, which is exactly what a record stores.
    built = pulsesOfBiphaseFrame(b, m.bits, m.value);
    original = train.slice(0, built.length);
  } else {
    // **The lead in pair is only there when the protocol has one.** A headerless family's frame is bit
    // cells and nothing else, so slicing two extra pulses off the front compares the rebuilt frame
    // against one bit cell too many and every record of it fails. That reported Sharp as 0 of 162.
    const headerPulses = t!.header[0] === 0 && t!.header[1] === 0 ? 0 : 2;
    original = train.slice(0, headerPulses + 2 * m.bits);
    const period = periods.get(entryOf(m));
    const used = t!.carries === 'mark' && period !== undefined
      ? { ...t!, closing: closingFor(t!, m.bits, m.value, period) }
      : t!;
    try { built = pulsesOfFrame(used, m.bits, m.value); } catch { return false; }
  }
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
  timings?: FrameTimings;
  /** Set instead of `timings` where the family is biphase, section 162. */
  biphase?: BiphaseTimings;
  period?: number;
  codes: number;
  exact: number;
  band: number;
  configs: readonly string[];
  sets: number;
  /** `both` is the one worth looking for: two routes with no shared code landing on one rhythm. */
  source: 'corpus' | 'compiled' | 'both';
  /** How many of its rows were tied to a family by bit width rather than by value. */
  byWidth: number;
}

const entries: Entry[] = [];
for (const [entry, list] of [...byEntry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const sets = new Map<string, Measured[]>();
  for (const m of list) sets.set(key(m), [...(sets.get(key(m)) ?? []), m]);
  // Commonest rather than first, so one odd appliance cannot decide an entry.
  const best = [...sets.values()].sort((a, b) => b.length - a.length)[0]!;
  const shape = best[0]!;
  const band = BANDS.find((b) => list.every((m) => reproduces(m, shape, b)));
  entries.push({
    family: list[0]!.family,
    periodNs: list[0]!.periodNs,
    ...(shape.timings === undefined ? {} : { timings: shape.timings }),
    ...(shape.biphase === undefined ? {} : { biphase: shape.biphase }),
    ...(periods.get(entry) === undefined ? {} : { period: periods.get(entry)! }),
    codes: list.length,
    exact: list.filter((m) => reproduces(m, shape)).length,
    band: band ?? 1,
    configs: [...new Set(list.map((m) => m.config))],
    sets: sets.size,
    source: list.every((m) => m.source === 'corpus') ? 'corpus'
      : list.every((m) => m.source === 'compiled') ? 'compiled' : 'both',
    byWidth: list.filter((m) => m.joinedBy === 'width').length,
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
 * **One rhythm can carry two names, and the table keeps both rather than choosing.** \`Sharp 48 Bit 2\`
 * and \`SharpO1 48 Bit\` at 38 kHz hold identical durations: the first is what Logitech's **catalogue**
 * calls it and the second what their **analyser** does, and section 159 measured that the two
 * vocabularies are not one. Collapsing them would need a rule about which name a caller will ask with,
 * and there is no such rule, so both are here and a lookup answers whichever it is given.
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
  /**
   * \`[0, 0]\` where the protocol has no lead in and opens on its first bit cell.
   *
   * **Absent, with \`flat\`, \`zero\`, \`one\` and \`carries\`, on a biphase family**, which has none of
   * them: see \`biphase\` below. A row has one shape or the other and never both, and
   * \`test/stated.test.ts\` asserts that.
   */
  readonly header?: readonly [number, number];
  readonly flat?: number;
  /**
   * The opening burst, where the protocol makes it longer than the rest.
   *
   * Only the Sharp family here does, 270 against 260 on every record of it, and it matters because
   * without it a rebuilt code differs from what their compiler emits on its very first pulse.
   */
  readonly firstMark?: number;
  readonly zero?: number;
  readonly one?: number;
  readonly carries?: FrameCarrier;
  /** The constant total a pulse width frame is padded out to, absent on a pulse distance one. */
  readonly framePeriod?: number;
  /**
   * A biphase family, where the bit is in **which half** of one cell the carrier is on.
   *
   * Section 162. There is no lead in pair, no constant half and no two carried lengths, so none of the
   * fields above apply: what there is instead is one half cell, a fixed prelude the family always sends,
   * and which half of the cell means a set bit. Three families here are of this kind and each reproduces
   * every one of its records byte for byte.
   */
  readonly biphase?: {
    /** One half cell of carrier. */
    readonly mark: number;
    /** One half cell of silence. */
    readonly space: number;
    /** A different opening mark where the family sends one. */
    readonly firstMark?: number;
    /** Everything before the first bit cell, exactly as a record stores it. */
    readonly lead: readonly { readonly mark: boolean; readonly us: number }[];
    /** Whether a mark in the **first** half of a cell means a set bit. RC-6 is the other way up. */
    readonly setIsMark: boolean;
  };
  /** How many corpus codes the entry was measured over, and how many it reproduces exactly. */
  readonly codes: number;
  readonly exact: number;
  /** The tightest band, as a fraction, that covers every code of the entry. */
  readonly spread: number;
  /**
   * Where the durations came from, which decides what the entry is worth.
   *
   * \`corpus\` is measured off records a configuration already holds, so it reproduces what Logitech's
   * own compiler emitted and \`exact\` says how often. \`documented\` is the published nominal timing of
   * that protocol, taken from third party protocol documentation, for a family **no configuration here
   * holds a single record of**: the corpus cannot supply it and no amount of reading it will.
   *
   * A documented entry has \`codes: 0\` because it was measured over none, which is the honest number
   * and not a placeholder. What it has instead is \`namedBack\`.
   */
  readonly source: 'corpus' | 'compiled' | 'both' | 'documented';
  /**
   * Catalogue codes emitted with this rhythm that Logitech's own analyser decoded back to the exact
   * number they were built from.
   *
   * **This is the only evidence a documented entry has, and it is weaker than \`exact\` in a way worth
   * stating.** \`exact\` says the durations are the ones their compiler emitted. This says their own
   * decoder, hearing our train, recovers the bits: the marks and spaces land in the bands it sorts into
   * zeros and ones. That is what an appliance's receiver does too, so it is the right kind of evidence,
   * and it is still not an appliance and still not byte equality.
   */
  readonly readBack?: number;
  /**
   * What their analyser calls this rhythm, where that is not what their catalogue calls it.
   *
   * **Their analyser's family list is coarser than their catalogue's**, which is measured: emitting a
   * \`Pioneer 32 Bit 2\` code with Pioneer's durations comes back named \`Pioneer 32 Bit\`, and their two
   * Sharp families both come back \`Proceed 14 Bit\`. So a name that does not match is not a wrong
   * rhythm, and name agreement is sufficient evidence rather than necessary.
   */
  readonly heardAs?: string;
}
`;

/**
 * Published nominal rhythms for families the corpus holds no record of, so it can never measure them.
 *
 * **Why these are here and not in the measurement.** `make analyze` asked Logitech's analyser to name
 * every code in this corpus, and the families it came back with are eight, of which the table above
 * covers the five that our own frame decoder can read. The catalogue uses 32. So the missing families
 * are missing by construction: no configuration here drives an appliance that uses them, and reading
 * more of the corpus cannot change that.
 *
 * **Each one is third party documentation, marked as such per entry**, on the same footing as anything
 * believed on Logitech's client's word alone. What promotes a seed from a guess to an entry worth
 * shipping is `bin/emitcheck.ts`: it builds a real catalogue code with these durations and asks their
 * own analyser what it just received. `namedBack` is that count and it is filled in by hand from a run,
 * so the number sits in the diff where somebody can see it.
 *
 * `header: [0, 0]` means the protocol opens on its first bit, which the Sharp scheme does.
 */
const DOCUMENTED: {
  family: string; periodNs: number; header: [number, number]; flat: number; zero: number;
  one: number; carries: 'mark' | 'space'; framePeriod?: number; readBack: number; heardAs?: string;
}[] = [
  // **Empty on purpose, and it held one entry for a few hours.** `Sharp 15 Bit` was seeded from
  // published protocol documentation at 320/680/1680, on the strength of Logitech's analyser reading 17
  // catalogue codes built with it back to the exact number. The compiled sample refutes the numbers the
  // same day: the two Denon receivers on it emit their 15 bit family with a mark of **260** and spaces
  // of **790** and **1850**, at 37 kHz, so the published figures are out by a fifth to a quarter on
  // every duration. The shape was right, headerless and space carrying, and the numbers were not.
  //
  // What that says about `readBack` is the reason this list is empty rather than corrected: their
  // analyser accepted a rhythm their compiler does not emit, twice in one day, the other case being
  // `JVC 16 Bit` under NEC's durations. So a rhythm judged only by their analyser is not evidence worth
  // shipping, and a documented entry that cannot do better than that does not belong in the table.
];

/**
 * Rhythms tried and **not** adopted, kept so the next run does not re-derive them.
 *
 * **Their analyser turned out not to be a general decoder**, which is what these three establish and it
 * is the reason the seed approach stops here rather than covering nine families. It recognises a rhythm
 * **at a bit count**, from its own list, and refuses anything else: the Samsung lead in, a mark and a
 * space of equal length, is accepted at 32 bits, where it answers `GoVideoO1 32 Bit`, and refused at 16,
 * 20 and 38, which is what their own catalogue states those codes as. So for a family whose bit count
 * their analyser has no entry for, a refusal says nothing about the rhythm and the judge cannot rule.
 *
 * Measured on 24 August 2026, every combination refused unless noted:
 *
 * | family | rhythm tried | carrier | answer |
 * |---|---|---|---|
 * | Samsung 16 and 20 Bit, 16 bits | 4500/4500, 560/560/1690 | 38 and 37 kHz | refused |
 * | Samsung 16 and 20 Bit, 16 bits | 4500/4500, 590/590/1690 and 550/550/1650 | 38 kHz | refused |
 * | Samsung 16 and 20 Bit, 20 bits | 4500/4500, 560/560/1690 and 550/550/1650 | 38 kHz | refused |
 * | Samsung 38 Bit, 38 bits | 4500/4500 and the NEC lead in | 38 kHz | refused |
 * | Panasonic 16 Bit, 16 bits | 3456/1728, 432/432/1296 | 36.7, 37 and 38 kHz | refused |
 * | Panasonic 16 Bit, 16 bits | 3400/1700, 400/400/1200 | 36.7 kHz | refused |
 *
 * The control that makes those refusals informative rather than a broken request: the **same** 4500/4500
 * lead in, sent at 32 bits, is decoded and named. So the request shape is right and the bit count is
 * what it turns on.
 *
 * What would settle these is not another guess. It is Logitech's own compiler: add an appliance of the
 * family to an account, have the service compile a configuration, and read the durations out of it,
 * which is `exact` evidence rather than `readBack`. That writes to the account, so it is a decision
 * rather than a run.
 */

if (write) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'protocols.ts');
  const rowsOut = entries.map((e) => {
    const tail = ` codes: ${e.codes}, exact: ${e.exact}, spread: ${e.band}, source: '${e.source}' },`;
    const head = `  { family: '${e.family}', periodNs: ${e.periodNs}, `;
    const b = e.biphase;
    if (b !== undefined) {
      const lead = b.lead.map((one) => `{ mark: ${one.mark}, us: ${one.us} }`).join(', ');
      return `${head}biphase: { mark: ${b.mark}, space: ${b.space}, `
        + `${b.firstMark === undefined ? '' : `firstMark: ${b.firstMark}, `}`
        + `lead: [${lead}], setIsMark: ${b.setIsMark} },${tail}`;
    }
    const t = e.timings!;
    return `${head}header: [${t.header[0]}, ${t.header[1]}], flat: ${t.flat}, `
      + `${t.firstMark === undefined ? '' : `firstMark: ${t.firstMark}, `}`
      + `zero: ${t.zero}, one: ${t.one}, `
      + `carries: '${t.carries}',${e.period === undefined ? '' : ` framePeriod: ${e.period},`}`
      + tail;
  }).join('\n');
  const seedsOut = DOCUMENTED.map((e) =>
    `  { family: '${e.family}', periodNs: ${e.periodNs}, `
    + `header: [${e.header[0]}, ${e.header[1]}], flat: ${e.flat}, zero: ${e.zero}, one: ${e.one}, `
    + `carries: '${e.carries}',${e.framePeriod === undefined ? '' : ` framePeriod: ${e.framePeriod},`}`
    + ` codes: 0, exact: 0, spread: 0, source: 'documented', readBack: ${e.readBack}`
    + `${e.heardAs === undefined ? '' : `, heardAs: '${e.heardAs}'`} },`).join('\n');
  // The documented block is omitted entirely when there is nothing in it, because a heading over an
  // empty list reads as a category the table has rather than one it deliberately does not.
  const documentedOut = DOCUMENTED.length === 0 ? '' :
    `\n  // Documented rather than measured, see DOCUMENTED in bin/protocols.ts. \`codes: 0\` is the`
    + `\n  // honest count: the corpus holds no record of these families at all.\n${seedsOut}`;
  writeFileSync(out,
    `${GENERATED}\nexport const PROTOCOLS: readonly StatedProtocol[] = [\n${rowsOut}${documentedOut}\n];\n`);
  console.log(`\n${entries.length} measured and ${DOCUMENTED.length} documented entries `
    + 'written to src/protocols.ts');
}
