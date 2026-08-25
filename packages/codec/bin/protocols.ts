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
  biphaseFrames, frameSegments, framesOfPulses, framesOfSegments, fromFirstMark, mergedIntervals,
  pulsesOfBiphaseFrame, pulsesOfFrame, pulsesOfLongToggle, pulsesOfQuad, timingsOfBiphase,
  timingsOfFrame, type BiphaseTimings, type FrameTimings, type LongToggleTimings, type Pulse,
  type QuadTimings,
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
  joinedBy?: 'value' | 'width' | 'stated';
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
  /** The long toggle shape and the record's three wire values, section 168. Set instead of `timings`. */
  longToggle?: LongToggleTimings;
  ltValues?: readonly [bigint, bigint, bigint];
  /** The quaternary shape and the record's stated values, section 169. Set instead of `timings`. */
  quad?: QuadTimings;
  qValues?: readonly bigint[];
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
  const q = m.quad;
  if (q !== undefined) {
    return `quad ${q.firstMark}/${q.mark} spaces ${q.spaces.join('/')} `
      + `digits ${q.digits.join('+')} gap ${q.gap.join('+')}`;
  }
  const lt = m.longToggle;
  if (lt !== undefined) {
    return `longtoggle ${lt.leader.join('/')} head ${lt.head.mark}/${lt.head.space}x${lt.head.bits} `
      + `toggle ${lt.toggle} data ${lt.data.first}/${lt.data.second}x${lt.data.bits} `
      + `gap ${lt.gap.join('+')} x${lt.copies}`;
  }
  const t = m.timings;
  if (t !== undefined) {
    // The sectioned fields are part of the key where they exist: two records disagreeing about the
    // structural space or the closing are two rhythms, exactly as a biphase lead in is.
    const sectioned = t.sections === undefined ? ''
      : ` sections ${t.sections.join('+')} boundary ${t.sectionSpace} closing ${t.closing}`;
    return `${t.header[0]}/${t.header[1]} flat ${t.flat}`
      + `${t.oneMark === undefined ? '' : `/${t.oneMark}`}`
      + ` zero ${t.zero} one ${t.one} ${t.carries}` + sectioned;
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
  // is nothing to pad out to. A sectioned family, section 166, has a closing but it is a **measured
  // constant** rather than padding to a total, and the arithmetic below does not know the structural
  // boundary space, so a period computed for one would be wrong by exactly that space.
  if (t === undefined || t.closing === undefined || t.sections !== undefined) return undefined;
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
/**
 * The compiled samples, each paired with the catalogue capture filed **beside it**.
 *
 * **The pairing is the point and it was learned the hard way on 24 August 2026.** The catalogue half used
 * to be read from one mutable path in the lab's working directory, `responses-account2/OneResCommands.json`,
 * which is where the capture script writes. Capturing for the second sample overwrote the first sample's
 * half, and nothing would have complained: the generator would have joined the first config's records
 * against the second record's appliances, found the five appliances the two have in common, and reported
 * a smaller table with every remaining row still exact. A measurement's two inputs belong together, so
 * each sample now carries its own `catalogue-commands.json` in its own read directory.
 *
 * The first one's was rebuilt afterwards and is short: two of its fifteen appliances are not in the wide
 * census either, so 13 of 15 are recoverable and `X4S2000` and `AVR-28` are not. Anything that turns out
 * to depend on those two is a row that has to be measured again rather than trusted.
 */
const COMPILED_SAMPLES = ['compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3']
  .map((image) => ({ image, path: imagePath(image) ?? '' }))
  .filter((one) => one.path !== '')
  .map((one) => ({
    // The name a row records, which is what `--detail` prints and what a reader has to be able to find.
    name: one.image === 'compiled_protocols' ? 'compiled-20260824'
      : one.image === 'compiled_protocols_2' ? 'compiled-20260824b' : 'compiled-20260824c',
    path: one.path,
    commands: join(dirname(one.path), 'catalogue-commands.json'),
  }));
const COMPILED_NAMES = new Set(COMPILED_SAMPLES.map((one) => one.name));

const containers = new Map<string, Container>();
function container(name: string): Container | undefined {
  if (!containers.has(name)) {
    // The compiled sample is loaded by path rather than through `imagePath`, since it is a read filed
    // under its own date and not one of the lab's named images.
    if (COMPILED_NAMES.has(name)) {
      const sample = COMPILED_SAMPLES.find((one) => one.name === name)!;
      try {
        containers.set(name, parse(payloadOf(new Uint8Array(readFileSync(sample.path)), sample.path)));
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
/** Which corpus records already have a row, so a later pass does not measure one twice. */
const measured = new Set<string>();
/** The configs the analyser reports name, which is the population the catalogue pass walks. */
const analysed: string[] = [];
/**
 * Corpus records their analyser named and no blind reading of ours matches, kept for a last pass.
 *
 * **Why a pass and not a branch.** A code whose bits are all the same has **one** carried length, so
 * there is nothing to split and the decoder refuses it, which is the guard that stops a pulse width
 * protocol being read as a pulse distance one. Section 162 measured four such records, all stating
 * `Logitech 24 Bit` as 24 zero bits. Reading one needs the family's rhythm from somewhere else, so it
 * runs after the compiled rows are in, and it can only ever confirm an entry rather than create one.
 */
const unresolved: { family: string; config: string; record: number; periodNs: number;
                    wanted: bigint; train: readonly Pulse[] }[] = [];
let rows = 0;
let named = 0;
const dropped = new Map<string, number>();
function drop(why: string): void { dropped.set(why, (dropped.get(why) ?? 0) + 1); }

for (const file of files) {
  const report = JSON.parse(readFileSync(join(reports, file), 'utf8')) as
    { config: string; rows: Row[] };
  analysed.push(report.config);
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
      measured.add(`${report.config}:${record}`);
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
    if (bi === undefined) {
      // Kept rather than dropped here: a family's rhythm measured on the other route can still read
      // this record, and that pass has to wait until every row is in. Section 162.
      unresolved.push({ family, config: report.config, record, periodNs, wanted, train });
      continue;
    }
    byEntry.set(entryOf(bi), [...(byEntry.get(entryOf(bi)) ?? []), bi]);
    measured.add(`${report.config}:${record}`);
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
  /**
   * The name the account gives this appliance, which is what the config's own device name matches.
   *
   * Optional because a catalogue capture rebuilt from the wide census does not have it: the census
   * states a make, a model and the commands. Such an appliance is attributed by its numbers alone.
   */
  name?: string;
  commands: { name: string; keyCode: string }[];
}

/** The complement of a value at its own width, which is one family's bit polarity. */
function complement(value: bigint, bits: number): bigint { return value ^ ((1n << BigInt(bits)) - 1n); }

/** Every compiled sample, measured in turn. A sample missing either half is skipped and says so. */
function compiledRows(): Measured[] {
  if (COMPILED_SAMPLES.length === 0) {
    console.log('no compiled sample in this lab, so only the analyser reports are measured\n');
    return [];
  }
  return COMPILED_SAMPLES.flatMap((sample) => rowsOfCompiled(sample));
}

function rowsOfCompiled(sample: { name: string; path: string; commands: string }): Measured[] {
  const COMPILED = sample.path;
  const COMPILED_NAME = sample.name;
  let blob: Uint8Array;
  let catalogue: { appliances: Appliance[] };
  try {
    blob = new Uint8Array(readFileSync(COMPILED));
    catalogue = JSON.parse(readFileSync(sample.commands, 'utf8')) as { appliances: Appliance[] };
  } catch {
    console.log(`${sample.name}: no container or no catalogue beside it, skipped\n`);
    return [];
  }
  const c = parse(payloadOf(blob, COMPILED));
  // Per appliance: value to family, and which widths it states. The widths are what lets a record whose
  // value does not join still be attributed, where the appliance states one family at that width.
  const appliances = catalogue.appliances.map((a) => {
    // **A value maps to every family that states it, not to the last one written.** This was a
    // `Map<string, string>` until 24 August 2026, so where two families on one appliance state the same
    // value the code went to whichever happened to be written last. Measured across the three compiled
    // samples it is one value on one appliance, `32:c53a9966` on a Pioneer CLD50, and it cost a whole
    // family: `Pioneer 32 Bit 2` shares its **first** frame with `Pioneer 32 Bit Dual` and is told apart
    // only by its second, so all three of its records were attributed to the sibling and the table had
    // no entry to emit its codes from. A single collision is easy to dismiss and it silently loses a
    // family, which is why this is a list.
    const byValue = new Map<string, string[]>();
    const byWidth = new Map<number, Set<string>>();
    /** Each code as its whole frame list, which is what decides a shared value, plus its words:
     * a code stating `Start` is a code whose record opens with a lead in, section 170, and the
     * join demands that consistency where two stated codes fit one record. */
    const codes: { family: string; keys: string[]; words: readonly string[] }[] = [];
    /**
     * Codes whose family names **one** width and states **several** values, section 166: the width is
     * across the pair, so no single frame read can match them and the sectioned reading below is what
     * does. Kept with their values in order, because the order is the order the sections go out in.
     */
    const sectioned: { family: string; width: number; values: readonly bigint[] }[] = [];
    for (const cmd of a.commands) {
      const read = statedCode(cmd.keyCode);
      if (read === undefined) continue;
      const keys = read.frames.map((f) => `${f.bits}:${f.value.toString(16)}`);
      codes.push({ family: read.family, keys, words: read.words });
      if (read.frames.length > 1 && read.frames.every((f) => f.bits === read.bits)) {
        sectioned.push({ family: read.family, width: read.bits,
          values: read.frames.map((f) => f.value) });
      }
      for (const f of read.frames) {
        const key = `${f.bits}:${f.value.toString(16)}`;
        const already = byValue.get(key) ?? [];
        if (!already.includes(read.family)) byValue.set(key, [...already, read.family]);
        byWidth.set(f.bits, (byWidth.get(f.bits) ?? new Set()).add(read.family));
      }
    }
    return { label: `${a.make} ${a.model}`, name: a.name, byValue, byWidth, codes, sectioned };
  });
  type Owner = (typeof appliances)[number];

  /**
   * Which family a value belongs to, deciding a shared value by the whole code rather than by one frame.
   *
   * **A record states every frame of its command**, so where a value is stated by more than one family
   * the record's own other frames say which: the family with a code all of whose frames the record
   * carries. Exactly one such family wins; none or several is a refusal rather than a guess, because
   * picking one there is what the overwritten map was doing.
   */
  const familyOf = (owner: Owner, key: string, readKeys: ReadonlySet<string>): string | undefined => {
    const families = owner.byValue.get(key);
    if (families === undefined || families.length === 0) return undefined;
    if (families.length === 1) return families[0];
    const whole = new Set(owner.codes
      .filter((code) => code.keys.includes(key) && code.keys.every((k) => readKeys.has(k)))
      .map((code) => code.family));
    return whole.size === 1 ? [...whole][0] : undefined;
  };

  // **The config names its own groups**, so the attribution is a string join rather than a vote. A
  // device's name is a prefix of a state variable's, reached through the list that sends its codes,
  // section 126, and the account gives the same name to the appliance. Underscores are the config's
  // spelling of the spaces in it.
  // **An appliance with no `name` cannot take this route, and one sample has eight of them.** The first
  // compiled sample's catalogue capture was overwritten and had to be rebuilt out of the wide census,
  // which states a make, a model and the commands and not the name the account gave the appliance. So
  // those eight fall through to the number vote, which is the weaker route and is why the rebuild is
  // recorded as a loss rather than as a repair.
  const named = new Map<number, number>();
  for (const device of devices(c)) {
    const at = device.name === undefined ? -1
      : appliances.findIndex((a) => (a.name ?? '').replace(/ /g, '_') === device.name
        && (a.name ?? '') !== '');
    if (at >= 0) named.set(device.group, at);
  }

  const out: Measured[] = [];
  /** How the attribution routes compared, which is the closure rather than a diagnostic. */
  const attribution = { agree: 0, differ: 0, namedOnly: 0, votedOnly: 0, byElimination: 0 };
  // **`framesOfSegments` and not `framesOfPulses`**, since 24 August 2026: a record commonly holds
  // several frames and this asks which numbers it carries, which is exactly the question the segmented
  // reader answers. Ten families in their catalogue were unanswered while their records sat here.
  const readings = (train: readonly Pulse[], pairs: number) =>
    framesOfSegments(train, pairs).map((f) => ({ f, key: `${f.bits}:${f.value.toString(16)}` }));

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
      // Every number this record carries, under both header conventions, which is what a shared value
      // is decided against. Computed before the loops because it is a property of the record.
      const readKeys = new Set([1, 0].flatMap((pairs) => readings(d.train, pairs).map((r) => r.key)));
      // **A pulse distance reading that only matches by width waits for the biphase route**, section 164.
      // Merging adjacent durations, which the reader does now, gives a biphase code a plausible pulse
      // distance shape whenever two carrier halves fall next to each other: two RC5 records of this
      // sample come out as a mark carrier with a flat of 900 and bits of 880 and 1760, which is 880 twice.
      // Both land on a stated number only because the appliance has one command of that width, while
      // their biphase reading lands on the **value**. So the order is by strength of evidence and not by
      // shape: a number that matches beats a width that matches, whichever reader produced it.
      let byWidthOnly: Measured | undefined;
      /** Whether a reading landed on a stated number but its durations would not split. */
      let matched = false;
      for (const pairs of [1, 0]) {
        for (const r of readings(d.train, pairs)) {
          read = true;
          // **A family may carry its bits the other way up.** `Logitech 24 Bit` states the complement
          // of what our decoder reads, because its set bit is the shorter space. Where the complement
          // is what the appliance states, the frame recorded is theirs and the two carried lengths are
          // exchanged, so an encoder built from the entry emits this record again exactly.
          const flipped = complement(r.f.value, r.f.bits);
          const flippedKey = `${r.f.bits}:${flipped.toString(16)}`;
          const measured = timingsOfFrame(d.train, r.f, pairs);
          // **A code that states a `Start` frame is not matched by a reading that measured no lead
          // in**, section 170, and one record needs the rule: the JVC A-X5 states `JVC 16 Bit`
          // 0xC508 with a Start word and `Panasonic 16 Bit` 0x3AF7 with none, 0x3AF7 is 0xC508's
          // complement, and the appliance's one Panasonic record reads 0xC508 headerless. Without
          // the check the value join hands that record to JVC, whose 107 real records all open on
          // an 8400/4200 lead in. The word is the catalogue's own statement of the lead in, per
          // section 159's grammar, so the consistency is theirs and not an inference of ours.
          const headerless = measured !== undefined
            && measured.header[0] === 0 && measured.header[1] === 0;
          const statesStart = (family: string, key: string) => owner.codes.some((code) =>
            code.family === family && code.keys.includes(key) && code.words.includes('Start'));
          let asRead = familyOf(owner, r.key, readKeys);
          if (asRead !== undefined && headerless && statesStart(asRead, r.key)) asRead = undefined;
          let asFlipped = asRead === undefined
            ? familyOf(owner, flippedKey, readKeys) : undefined;
          if (asFlipped !== undefined && headerless && statesStart(asFlipped, flippedKey)) {
            asFlipped = undefined;
          }
          const widths = owner.byWidth.get(r.f.bits);
          const byWidth = asRead === undefined && asFlipped === undefined && widths?.size === 1
            ? [...widths][0] : undefined;
          const family = asRead ?? asFlipped ?? byWidth;
          if (family === undefined) continue;
          // **Remembered rather than dropped here**, section 165: a record whose durations do not split
          // also reaches the fall through below, so dropping in both places counted ten records twenty
          // times and read as though twenty had failed. One record, one reason, the specific one.
          if (measured === undefined) { matched = true; continue; }
          // Exchanging zero and one also exchanges the two marks where the mark rides with the
          // bit, section 170: the pair is the cell, so the halves travel together.
          const timings = asFlipped === undefined ? measured
            : { ...measured, zero: measured.one, one: measured.zero,
                ...(measured.oneMark === undefined ? {}
                  : { flat: measured.oneMark, oneMark: measured.flat }) };
          const candidate: Measured = { family, source: 'compiled',
            joinedBy: asRead === undefined && asFlipped === undefined ? 'width' : 'value',
            periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
            bits: r.f.bits, value: asFlipped === undefined ? r.f.value : flipped, timings };
          if (candidate.joinedBy === 'width') { byWidthOnly ??= candidate; continue; }
          out.push(candidate);
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
              const family = familyOf(owner, `${bits}:${value.toString(16)}`, readKeys);
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
      // **The sectioned reading, section 166: one width across several values.** `Samsung 38 Bit`
      // states two values per code and one width, and the record is one frame in two sections: a
      // header, sixteen cells, a structural 4470 space, twenty one more cells whose last is inside the
      // closing silence. Reading the structural space as section one's final set bit and the closing as
      // section two's makes 17 + 21 the stated 38 exactly, and lands all 35 records on their stated
      // pairs. The segments are cut by the same rule as everywhere else; what is particular here is
      // only how the boundary spaces are read back as bits.
      if (!landed && owner.sectioned.length > 0) {
        // Segmented over the merged train, section 164: the closing silence is longer than one stored
        // word can say, so on the raw words it becomes several boundary spaces in a row and the last
        // of them a trailing segment holding no frame at all.
        const segments = frameSegments(fromFirstMark(mergedIntervals(d.train)), false);
        const reads = segments.map((seg, at) => {
          const one = framesOfPulses(seg, at === 0 ? 1 : 0)
            .find((f) => f.carries === 'space');
          return one === undefined ? undefined : { bits: one.bits, value: one.value };
        });
        if (reads.length > 1 && reads.every((one) => one !== undefined)) {
          // **Every segment reads short by exactly its final set bit, and the arithmetic is uniform.**
          // With the boundary dropped, a non final section loses its last bit to the dropped boundary
          // space that was carrying it, and the final section loses its own to the closing silence the
          // decoder rightly reads as a gap. So each section is its read with a set bit appended, and it
          // is a set bit for the same reason the emitter demands one: no record shows the other case.
          const values = reads.map((one) => one!.value * 2n + 1n);
          const widths = reads.map((one) => one!.bits + 1);
          const total = widths.reduce((a, b) => a + b, 0);
          const code = owner.sectioned.find((one) => one.width === total
            && one.values.length === values.length
            && one.values.every((v, i) => v === values[i]));
          const timings = code === undefined ? undefined
            : sectionedTimings(d.train, widths);
          if (code !== undefined && timings !== undefined) {
            const value = values.reduce((v, one, i) => (v << BigInt(widths[i]!)) | one, 0n);
            out.push({ family: code.family, source: 'compiled', joinedBy: 'value',
              periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
              bits: total, value, timings });
            landed = true;
          }
        }
      }
      // **The long toggle reading, section 168**, tried where the appliance states three values at one
      // width and nothing else landed. The reading is structural, so the join is the closure: the three
      // wire values have to equal a stated triple exactly, under the one convention that fits all 46.
      if (!landed && owner.sectioned.some((one) => one.values.length === 3)) {
        const lt = longToggleReading(d.train);
        const code = lt === undefined ? undefined
          : owner.sectioned.find((one) => one.values.length === 3
            && one.values[0] === lt.values[0] && one.values[1] === lt.values[1]
            && one.values[2] === lt.values[2]);
        if (lt !== undefined && code !== undefined) {
          const bits = lt.shape.head.bits + 1 + lt.shape.data.bits;
          const value = (((lt.values[0] << 1n) | lt.values[1]) << BigInt(lt.shape.data.bits))
            | lt.values[2];
          out.push({ family: code.family, source: 'compiled', joinedBy: 'value',
            periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
            bits, value, longToggle: lt.shape, ltValues: lt.values });
          landed = true;
        }
      }
      // **The quaternary reading, section 169**, the same trigger and the same closure discipline: the
      // wire digits partitioned by the stated values' own digit counts have to equal a stated triple.
      if (!landed && owner.sectioned.some((one) => one.values.length > 1)) {
        const q = quadReading(d.train);
        if (q !== undefined) {
          const wire = q.values.map(Number);
          const code = owner.sectioned.find((one) => {
            // Partition the wire digits by each stated value's own quaternary digit count. The counts
            // come from the catalogue's raw digit strings, which `statedCode` preserves as values, so
            // they are recomputed here as the smallest count that holds the value, plus the family's
            // fixed field widths where the value is small. The honest test is the partition summing.
            const widths = one.values.map((v) => Math.max(1, Math.ceil(v.toString(4).length)));
            // A fixed field can be wider than its value needs, so try to grow the head fields to
            // absorb the slack, left to right, which is how leading zeros sit in a fixed field.
            const slack = wire.length - widths.reduce((a, b) => a + b, 0);
            if (slack < 0) return false;
            widths[0]! += slack;
            let cursor = 0;
            for (const [i, width] of widths.entries()) {
              const field = wire.slice(cursor, cursor + width)
                .reduce((v, digit) => v * 4n + BigInt(digit), 0n);
              if (field !== one.values[i]) return false;
              cursor += width;
            }
            return cursor === wire.length;
          });
          if (code !== undefined) {
            // The stated digit counts are the shape's, so the emitter needs no slack rule.
            const widths: number[] = [];
            let rest = wire.length;
            for (const v of code.values.slice().reverse()) {
              const need = Math.max(1, v.toString(4).length);
              widths.unshift(need); rest -= need;
            }
            widths[0]! += rest;
            out.push({ family: code.family, source: 'compiled', joinedBy: 'value',
              periodNs: d.periodNs, config: COMPILED_NAME, record: d.record,
              bits: 2 * wire.length,
              value: wire.reduce((v, digit) => (v << 2n) | BigInt(digit), 0n),
              quad: { ...q.shape, digits: widths }, qValues: code.values });
            landed = true;
          }
        }
      }
      // The deferred width match, taken where no biphase reading landed on a number.
      if (!landed && byWidthOnly !== undefined) { out.push(byWidthOnly); landed = true; }
      // **Two reasons, not one.** The old label said no reading matched a code, which was also what a
      // record nothing could read at all reported, and those need different work: one is a number
      // question and the other is the decoder's.
      if (!landed) {
        drop(matched ? 'compiled: the code is named and its durations do not split'
          : read ? 'compiled: no reading matches a code of the record\'s own appliance'
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

/**
 * The last pass: a record no reading of ours matches, read under a rhythm the other route measured.
 *
 * **This can confirm an entry and never create one**, which is what keeps it out of a circle. The family
 * and the number both come from Logitech, the durations come from a row measured elsewhere, and the test
 * is that emitting their number under those durations reproduces this record byte for byte. A wrong
 * rhythm fails it, and so does the wrong **polarity**, which is the part worth having: all four records
 * this rescues state 24 zero bits, and under the opposite polarity the same number would put a 500 where
 * the record has a 1000. So they are independent evidence for the polarity section 161 derived from the
 * complement, on four configs including two of the bench remotes' own.
 */
for (const row of unresolved) {
  let rescued: Measured | undefined;
  for (const [, list] of byEntry) {
    for (const m of list) {
      if (m.family !== row.family || m.timings === undefined) continue;
      // The width comes from the family's own name, as `statedCode` reads it, since there is no reading
      // of ours here to take it from.
      const read = statedCode(`G:${row.family}:()(0x${row.wanted.toString(16)})():3`);
      const bits = read?.frames[0]?.bits;
      if (bits === undefined) continue;
      let built: Pulse[];
      try { built = pulsesOfFrame(m.timings, bits, row.wanted); } catch { continue; }
      const same = built.length <= row.train.length
        && built.every((one, i) => row.train[i]!.mark === one.mark && row.train[i]!.us === one.us);
      if (!same) continue;
      rescued = { family: row.family, source: 'corpus', joinedBy: 'stated', periodNs: row.periodNs,
        config: row.config, record: row.record, bits, value: row.wanted, timings: m.timings };
      break;
    }
    if (rescued !== undefined) break;
  }
  if (rescued === undefined) {
    drop('no reading of ours carries their number, and no measured rhythm reproduces it');
    continue;
  }
  byEntry.set(entryOf(rescued), [...(byEntry.get(entryOf(rescued)) ?? []), rescued]);
  measured.add(`${rescued.config}:${rescued.record}`);
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
/**
 * The timings of a sectioned record, or `undefined` where they do not hold to the shape.
 *
 * `timingsOfFrame` rightly refuses these trains: their carried half holds three lengths, because the
 * structural spaces sit among the bit cells. So the boundary spaces are set aside first, by position,
 * which the section widths state; what is left must then satisfy exactly what every frame satisfies,
 * one flat length and at most two carried ones. Section 166.
 */
function sectionedTimings(train: readonly Pulse[], widths: readonly number[])
  : FrameTimings | undefined {
  const merged = fromFirstMark(mergedIntervals(train));
  const total = widths.reduce((a, b) => a + b, 0);
  if (merged.length !== 2 * (total + 1)) return undefined;
  const spaces = merged.filter((one) => !one.mark).map((one) => one.us);
  const marks = merged.filter((one) => one.mark).map((one) => one.us);
  const flat = new Set(marks.slice(1));
  if (flat.size !== 1) return undefined;
  // The section-final space positions, 1 based after the header's space at index 0.
  const finals: number[] = [];
  let at = 0;
  for (const width of widths) { at += width; finals.push(at); }
  const boundaries = new Set(finals.slice(0, -1).map((one) => spaces[one]!));
  if (boundaries.size !== 1) return undefined;
  const closing = spaces[finals[finals.length - 1]!]!;
  const cells = spaces.filter((_, i) => i > 0 && !finals.includes(i));
  const carried = [...new Set(cells)].sort((a, b) => a - b);
  if (carried.length > 2 || carried.length === 0) return undefined;
  return { header: [merged[0]!.us, merged[1]!.us], flat: [...flat][0]!,
    zero: carried[0]!, one: carried[carried.length - 1]!, carries: 'space',
    sections: widths, sectionSpace: [...boundaries][0]!, closing };
}

/**
 * The long toggle reading, section 168, tried where an appliance states three values at one width.
 *
 * Returns the shape and the three wire values, or `undefined` where the train is not of this kind.
 * The bit convention is fixed rather than tried, because 46 of 46 records matched under exactly one:
 * a set bit is the cell whose first half is silence, in all three regions.
 */
function longToggleReading(train: readonly Pulse[])
  : { shape: LongToggleTimings; values: [bigint, bigint, bigint] } | undefined {
  // The copies, split at the long silences; words under 100 us are the record's terminator pair and
  // are not part of any copy.
  const copies: Pulse[][] = [[]];
  const gaps: number[][] = [];
  for (const p of train) {
    if (p.us < 100) continue;
    if (!p.mark && p.us >= 10000) {
      if (copies[copies.length - 1]!.length === 0) { gaps[gaps.length - 1]?.push(p.us); continue; }
      gaps.push([p.us]); copies.push([]); continue;
    }
    copies[copies.length - 1]!.push(p);
  }
  const full = copies.filter((one) => one.length > 10);
  if (full.length < 2) return undefined;
  const sig = (one: Pulse[]) => one.map((p) => `${p.mark ? '+' : '-'}${p.us}`).join(' ');
  if (!full.every((one) => sig(one) === sig(full[0]!))) return undefined;
  if (!gaps.every((one) => one.join() === gaps[0]!.join())) return undefined;
  const copy = full[0]!;
  const leader: [number, number] = [copy[0]!.us, copy[1]!.us];
  if (!copy[0]!.mark || copy[1]!.mark) return undefined;
  // The half cell grid: the shortest word in the body is one half, and every word is one or two.
  const body = copy.slice(2);
  const unit = Math.min(...body.map((one) => one.us));
  const halves: { mark: boolean; us: number; wide: boolean }[] = [];
  for (const word of body) {
    const n = Math.round(word.us / unit);
    if (n !== 1 && n !== 2) return undefined;
    halves.push({ mark: word.mark, us: word.us, wide: n === 2 });
  }
  // The toggle is the unique adjacent pair of double words, one cell of two double halves.
  const wideAt = halves.flatMap((one, i) => one.wide ? [i] : []);
  if (wideAt.length !== 2 || wideAt[1]! !== wideAt[0]! + 1) return undefined;
  const [toggleAt] = wideAt;
  if ((toggleAt! % 2) !== 0) return undefined;
  const headHalves = halves.slice(0, toggleAt);
  const dataHalves = halves.slice(toggleAt! + 2);
  if (headHalves.length % 2 !== 0 || dataHalves.length % 2 !== 0) return undefined;
  // One bit per cell: set when the first half is silence.
  const bitsOf = (cells: { mark: boolean }[]): bigint => {
    let value = 0n;
    for (let i = 0; i < cells.length; i += 2) value = (value << 1n) | (cells[i]!.mark ? 0n : 1n);
    return value;
  };
  const head = bitsOf(headHalves);
  const toggle = halves[toggleAt!]!.mark ? 0n : 1n;
  const data = bitsOf(dataHalves);
  // The lengths, per region: head per kind, data per position, each one value or the reading refuses.
  const one = (list: number[]): number | undefined =>
    new Set(list).size === 1 ? list[0] : undefined;
  const headMark = one(headHalves.filter((h) => h.mark).map((h) => h.us));
  const headSpace = one(headHalves.filter((h) => !h.mark).map((h) => h.us));
  const toggleUs = one([halves[toggleAt!]!.us, halves[toggleAt! + 1]!.us]);
  const dataFirst = one(dataHalves.filter((_, i) => i % 2 === 0).map((h) => h.us));
  const dataSecond = one(dataHalves.filter((_, i) => i % 2 === 1).map((h) => h.us));
  if (headMark === undefined || headSpace === undefined || toggleUs === undefined
      || dataFirst === undefined || dataSecond === undefined) return undefined;
  return {
    shape: { leader, head: { mark: headMark, space: headSpace, bits: headHalves.length / 2 },
      toggle: toggleUs, data: { first: dataFirst, second: dataSecond, bits: dataHalves.length / 2 },
      gap: gaps[0] ?? [], copies: full.length },
    values: [head, toggle, data],
  };
}

/**
 * The quaternary reading, section 169, tried where an appliance states three values at one width.
 *
 * Structural like the long toggle one: the record must be one opening mark, cells of a space and a
 * constant mark whose spaces take exactly four lengths, a constant start digit of 0, and digit counts
 * that partition into the stated values. The digit order is the four space lengths ascending, which is
 * the assignment the closure confirms on every record.
 */
function quadReading(train: readonly Pulse[])
  : { shape: QuadTimings; values: bigint[] } | undefined {
  const body = [...fromFirstMark(train.filter((one) => one.us >= 100))];
  const opening = body[0];
  if (opening === undefined || !opening.mark) return undefined;
  // The cells, up to the first space that is not one of the four digit lengths.
  const spaces: number[] = [];
  const marks = new Set<number>();
  let at = 1;
  const lengths = new Set<number>();
  while (at + 1 < body.length) {
    const space = body[at]!, mark = body[at + 1]!;
    if (space.mark || !mark.mark) break;
    if (space.us >= 10000) break;
    spaces.push(space.us); marks.add(mark.us); lengths.add(space.us);
    at += 2;
  }
  if (lengths.size !== 4 || marks.size !== 1) return undefined;
  const gap = body.slice(at);
  if (gap.some((one) => one.mark)) return undefined;
  const sorted = [...lengths].sort((a, b) => a - b) as [number, number, number, number];
  const digits = spaces.map((us) => sorted.indexOf(us));
  if (digits[0] !== 0) return undefined;
  return {
    shape: { firstMark: opening.us, mark: [...marks][0]!, spaces: sorted,
      digits: [], gap: gap.map((one) => one.us) },
    values: digits.slice(1).map((d) => BigInt(d)),
  };
}

function reproduces(m: Measured, shape: Measured, tolerance = 0): boolean {
  const t = shape.timings;
  const b = shape.biphase;
  // A pulse distance shape cannot answer for a biphase record or the other way round, and the two
  // never mix inside one entry, so this is a guard rather than a case.
  if ((shape.longToggle === undefined) !== (m.longToggle === undefined)) return false;
  if ((shape.quad === undefined) !== (m.quad === undefined)) return false;
  if (shape.longToggle === undefined && shape.quad === undefined) {
    if ((t === undefined) !== (m.timings === undefined)) return false;
    if (t !== undefined && t.carries !== m.timings!.carries) return false;
  }
  const c = container(m.config);
  const first = c === undefined ? undefined : irHeaderPointers(c, m.record)[0];
  const words = first === undefined ? undefined : irBlockWords(c!, first);
  if (words === undefined) return false;
  let built: Pulse[];
  let original: readonly Pulse[];
  const train = fromFirstMark(pulsesOfWords(words));
  if (shape.quad !== undefined) {
    // The whole record word for word, gap included, like the long toggle shape, section 169.
    if (m.qValues === undefined) return false;
    try { built = pulsesOfQuad(shape.quad, m.qValues); } catch { return false; }
    original = train.slice(0, built.length);
  } else if (shape.longToggle !== undefined) {
    // Every copy and every gap, word for word and unmerged, which is the strongest reproduction in
    // this file: word boundaries are part of the claim, section 168. What stays outside it is the
    // leading silence, like every entry here, and the record's closing terminator pair of 1 and 0.
    if (m.ltValues === undefined) return false;
    try { built = pulsesOfLongToggle(shape.longToggle, m.ltValues); } catch { return false; }
    original = train.slice(0, built.length);
  } else if (t?.sections !== undefined) {
    // The whole train including the closing silence, because the final bit lives inside it. Merged,
    // section 164: the closing is longer than one stored word can say, so the record spells it as
    // several and an unmerged comparison would fail on the spelling rather than on the sound.
    if (m.timings?.sections === undefined) return false;
    try { built = pulsesOfFrame(t, m.bits, m.value); } catch { return false; }
    original = fromFirstMark(mergedIntervals(train));
  } else if (b !== undefined) {
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
  /** Set instead of both where the family is the long toggle shape, section 168. */
  longToggle?: LongToggleTimings;
  /** Set instead of all where the family is quaternary on the wire, section 169. */
  quad?: QuadTimings;
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

/**
 * The last route: a biphase corpus record whose number their catalogue states somewhere.
 *
 * **Why this one needs no analyser answer.** The three biphase families were measured off the compiled
 * sample, and 109 records of two of the bench remotes' own configs are biphase and were never asked
 * about, because the analyser runs were sampled. Their numbers are in the catalogue anyway: the
 * appliance is a model, and `GetGlobalLanguageCommands` answers for a model rather than for an account.
 *
 * So the family comes from whichever catalogue appliance states the number, the durations come from a row
 * measured on the other route, and the test is that emitting their number under those durations rebuilds
 * this record byte for byte. A value collision would have to coincide with that family's exact durations,
 * which is why the pass is safe without a name to match on. Section 163.
 */
function biphaseFromCatalogue(configs: readonly string[]): Measured[] {
  // **Every sample's catalogue, pooled deliberately here and nowhere else.** This pass asks only "does
  // any catalogue appliance state this number", because the record it is naming belongs to somebody's
  // own remote and not to any of these appliances, so there is no owning appliance to scope it to. The
  // measurement pass above scopes strictly by appliance, which is what keeps a shared value from being
  // attributed to the wrong family.
  const appliances: Appliance[] = [];
  for (const sample of COMPILED_SAMPLES) {
    try {
      appliances.push(...(JSON.parse(readFileSync(sample.commands, 'utf8')) as
        { appliances: Appliance[] }).appliances);
    } catch { /* a sample with no catalogue beside it contributes nothing */ }
  }
  if (appliances.length === 0) return [];
  const stated = new Map<string, string>();
  for (const a of appliances) {
    for (const cmd of a.commands) {
      const read = statedCode(cmd.keyCode);
      if (read === undefined) continue;
      for (const f of read.frames) stated.set(`${f.bits}:${f.value.toString(16)}`, read.family);
    }
  }
  /** The biphase rows already measured, by family, which is where the durations come from. */
  const rhythms = new Map<string, BiphaseTimings>();
  for (const [, list] of byEntry) {
    for (const m of list) if (m.biphase !== undefined) rhythms.set(m.family, m.biphase);
  }
  const out: Measured[] = [];
  for (const name of configs) {
    const c = container(name);
    if (c === undefined) continue;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        // Already measured by one of the routes above, so nothing to add.
        if (measured.has(`${name}:${record}`)) continue;
        const first = irHeaderPointers(c, record)[0];
        if (first === undefined) continue;
        const words = irBlockWords(c, first);
        const periodNs = irCarrier(c, record)?.periodNs;
        if (words === undefined || periodNs === undefined || periodNs === 0) continue;
        const train = fromFirstMark(pulsesOfWords(words));
        let found: Measured | undefined;
        for (const f of biphaseFrames(train)) {
          for (let bits = f.bits; bits >= 8 && found === undefined; bits -= 1) {
            const mask = (1n << BigInt(bits)) - 1n;
            const low = f.value & mask;
            for (const setIsMark of [true, false]) {
              const value = setIsMark ? low : low ^ mask;
              const family = stated.get(`${bits}:${value.toString(16)}`);
              const rhythm = family === undefined ? undefined : rhythms.get(family);
              if (family === undefined || rhythm === undefined) continue;
              const built = pulsesOfBiphaseFrame(rhythm, bits, value);
              const same = built.length <= train.length
                && built.every((one, i) => train[i]!.mark === one.mark && train[i]!.us === one.us);
              if (!same) continue;
              found = { family, source: 'corpus', joinedBy: 'stated', periodNs,
                config: name, record, bits, value, biphase: rhythm };
              break;
            }
          }
          if (found !== undefined) break;
        }
        if (found !== undefined) out.push(found);
      }
    }
  }
  return out;
}

const fromCatalogue = biphaseFromCatalogue([...new Set(analysed)]);
console.log(`the catalogue route reads ${fromCatalogue.length} biphase record(s) `
  + `their analyser was never asked about\n`);
for (const m of fromCatalogue) {
  byEntry.set(entryOf(m), [...(byEntry.get(entryOf(m)) ?? []), m]);
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
    ...(shape.longToggle === undefined ? {} : { longToggle: shape.longToggle }),
    ...(shape.quad === undefined ? {} : { quad: shape.quad }),
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
  /**
   * The mark of a **set** cell, on the three families whose mark rides with its own cell's bit,
   * section 170. \`flat\` is then the clear cell's mark. Absent everywhere the flat half really is
   * one length.
   */
  readonly oneMark?: number;
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
  /**
   * The frame is one value sent in sections of these widths, section 166.
   *
   * \`Samsung 38 Bit\` is the family that needed it: the catalogue states two values per code and one
   * width, and the wire is one header, the first section's cells, a structural space carrying that
   * section's final set bit, the second section's cells, and a closing silence carrying the last bit of
   * all. The widths sum to the width the family's name states, which is the closure that settled what
   * "38 Bit" means: across the pair.
   */
  readonly sections?: readonly number[];
  /** The space carrying a non final section's last set bit. Present exactly when \`sections\` is. */
  readonly sectionSpace?: number;
  /** The closing silence, which on a sectioned family carries the final bit and is a measured constant. */
  readonly closing?: number;
  /**
   * The long toggle shape, set instead of the frame and biphase fields, section 168, one family.
   *
   * A code states three values, and the wire is a leader, head cells per kind, one double width toggle
   * cell stored merged, data cells per position, and the whole frame \`copies\` times with the stored
   * \`gap\` words after each. A set bit is the cell whose first half is silence, in all three regions.
   * \`pulsesOfLongToggle\` in \`irframe.ts\` is the emitter and reproduces every record of the
   * family word for word, copies and gaps included.
   */
  readonly longToggle?: {
    readonly leader: readonly [number, number];
    readonly head: { readonly mark: number; readonly space: number; readonly bits: number };
    readonly toggle: number;
    readonly data: { readonly first: number; readonly second: number; readonly bits: number };
    readonly gap: readonly number[];
    readonly copies: number;
  };
  /**
   * The quaternary shape, set instead of the frame and biphase fields, section 169, one family.
   *
   * \`Quad\` in the family's name is the base of its digits twice over: the catalogue writes the
   * values in base 4 and the wire sends one digit per cell as one of four space lengths, two bits at a
   * time, each cell closed by the constant \`mark\`. A constant start digit of 0 precedes the values,
   * \`digits\` says how many quaternary digits each stated value takes, and the stored \`gap\` words
   * close the record. \`pulsesOfQuad\` in \`irframe.ts\` is the emitter and reproduces every record
   * word for word, gap included.
   */
  readonly quad?: {
    readonly firstMark: number;
    readonly mark: number;
    readonly spaces: readonly [number, number, number, number];
    readonly digits: readonly number[];
    readonly gap: readonly number[];
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
    const q = e.quad;
    if (q !== undefined) {
      return `${head}quad: { firstMark: ${q.firstMark}, mark: ${q.mark}, `
        + `spaces: [${q.spaces.join(', ')}], digits: [${q.digits.join(', ')}], `
        + `gap: [${q.gap.join(', ')}] },${tail}`;
    }
    const lt = e.longToggle;
    if (lt !== undefined) {
      return `${head}longToggle: { leader: [${lt.leader.join(', ')}], `
        + `head: { mark: ${lt.head.mark}, space: ${lt.head.space}, bits: ${lt.head.bits} }, `
        + `toggle: ${lt.toggle}, `
        + `data: { first: ${lt.data.first}, second: ${lt.data.second}, bits: ${lt.data.bits} }, `
        + `gap: [${lt.gap.join(', ')}], copies: ${lt.copies} },${tail}`;
    }
    const t = e.timings!;
    return `${head}header: [${t.header[0]}, ${t.header[1]}], flat: ${t.flat}, `
      + `${t.firstMark === undefined ? '' : `firstMark: ${t.firstMark}, `}`
      + `${t.oneMark === undefined ? '' : `oneMark: ${t.oneMark}, `}`
      + `zero: ${t.zero}, one: ${t.one}, `
      + `carries: '${t.carries}',${e.period === undefined ? '' : ` framePeriod: ${e.period},`}`
      + `${t.sections === undefined ? ''
        : ` sections: [${t.sections.join(', ')}], sectionSpace: ${t.sectionSpace}, closing: ${t.closing},`}`
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
