/**
 * Recovering the bit frame a stored infrared record encodes, sections 133 and 134.
 *
 * Two claims live here and they lean on each other. The frame decoder is what let a scan code be
 * given a button name, because a frame can be compared to a number written down outside this
 * repository where a duration stream can only be compared to another duration stream. And the same
 * decoder is what identified the one structure section 75 had left unexplained, the second pointer
 * group on arch 8, by noticing which records it declined to read.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { imagePath, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import {
  IR_CLASS_STREAM,
  IR_PULSE_MARK,
  IR_PULSE_MAX,
  irBlockWords,
  irCarrier,
  irClass,
  irGroupCount,
  irGroups,
  irHeaderPointers,
  irRecordBlocks,
} from '../src/ir.ts';
import { frameKey, irFrame, irFrames } from '../src/irframe.ts';
import { keyCodes } from '../src/inventory.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function load(name: string) {
  const p = imagePath(name);
  return p ? parse(new Uint8Array(readFileSync(p))) : undefined;
}

/** The same, but a missing sample throws with its name instead of shrinking a corpus wide claim. */
function mustLoad(name: string) {
  return parse(require_(name));
}

/**
 * Every container in the corpus wide population, which is `CONTAINERS` in `test/golden.test.ts`. Kept
 * as its own list rather than imported, because this test wants the ones with an infrared table and
 * says so by skipping the rest at runtime.
 */
const CONTAINERS = [
  'one_config',
  'one_config_unprogrammed',
  'h600_config',
  'h700_config',
  'h700_config_2',
  'h525_config',
  'h525_config_2',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'arch8_config_880',
  'arch8_config_885',
  'one_spare_before_sync',
  'one_spare_after_sync',
  'calibration_one',
  'calibration_h600',
];

/**
 * The samples `tests/test_gspm.py` asserted the protocol closure over, carried across with it.
 *
 * A narrower list than `CONTAINERS` on purpose: it is the population section 32 quoted, so the counts
 * below are comparable to the ones that document states.
 */
const SECTION_32_CONFIGS = [
  'h700_config',
  'h700_config_2',
  'h600_config',
  'one_config',
  'one_config_unprogrammed',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
];

/**
 * Header timings as a tolerance band, against the bit count the protocol specifies.
 *
 * The bands are wide because the corpus holds several calibrations of each: NEC turns up as 8990/4490
 * and as 9000/4500, Kaseikyo as 3364/1682, 3460/1730 and 3480/1730.
 */
const PROTOCOLS: readonly [string, number, number, number, number, number][] = [
  ['NEC 9000/4500', 8900, 9100, 4400, 4600, 32],
  ['Kaseikyo 3456/1728', 3350, 3520, 1650, 1760, 48],
];

test(
  'the header timings and the bit count name the same protocol',
  skipUnless(...SECTION_32_CONFIGS),
  () => {
    // Section 32's closure. Two numbers from opposite ends of the record, computed independently: the
    // header timings are the first mark and space of the block, and the bit count comes from splitting
    // the pairs after it. Neither is derived from the other.
    //
    // **It lived in `tests/test_gspm.py` until section 139 and it is a real closure again.** Two
    // things were wrong with it there. The run it measured belonged to a **neighbouring** record,
    // because the locator searched from a fixed offset instead of following the header's pointers, and
    // it passed because records in one device group usually share a protocol. And Python had grown a
    // second frame decoder to do the splitting, which disagreed with this one about 37 records of
    // `arch8_config_a`: it assumed pulse distance where this one tries both conventions and refuses a
    // record reading as neither. The Python decoder is gone.
    const seen = new Map<string, number>();
    let framed = 0;
    let records = 0;
    for (const name of SECTION_32_CONFIGS) {
      const c = mustLoad(name);
      for (const group of irGroups(c) ?? []) {
        for (const record of group.addresses) {
          records += 1;
          const frame = irFrame(c, record);
          if (frame === undefined) continue;
          framed += 1;
          const first = irHeaderPointers(c, record)[0];
          const words = first === undefined ? undefined : irBlockWords(c, first);
          if (words === undefined) continue;
          const lead = words.findIndex((w) => w & IR_PULSE_MARK);
          const space = words[lead + 1];
          if (lead < 0 || space === undefined) continue;
          const mark = (words[lead] as number) & IR_PULSE_MAX;
          for (const [label, m0, m1, s0, s1, want] of PROTOCOLS) {
            if (mark < m0 || mark > m1) continue;
            if ((space & IR_PULSE_MAX) < s0 || (space & IR_PULSE_MAX) > s1) continue;
            seen.set(label, (seen.get(label) ?? 0) + 1);
            assert.equal(
              frame.bits,
              want,
              `${name}: ${label} at 0x${record.toString(16)} carries ${frame.bits} bits`,
            );
          }
        }
      }
    }
    assert.deepEqual({ records, framed }, { records: 2858, framed: 2085 });
    // Both populations, so the closure cannot be satisfied by finding nothing.
    assert.deepEqual(
      [...seen].sort(),
      [
        ['Kaseikyo 3456/1728', 257],
        ['NEC 9000/4500', 1106],
      ],
    );
  },
);

test('a pulse width frame keeps its last bit, which is what the removed decoder dropped',
  skipUnless('calibration_one', 'calibration_h600'), () => {
  // **The measurement that settles section 139 entry 8**, and it needed the two configs Logitech
  // compiled to our own specification, because they are the only samples whose answer is known from
  // outside the bytes.
  //
  // `src/harmony/gspm.py` had a second frame decoder for a day. It assumed pulse distance and measured
  // the space, so on a pulse **width** code, where the bit is the mark and the final space is the gap,
  // it tested the gap before pushing and dropped the last bit. Measured over the same block words, with
  // the header reading held constant so only the decoder varies: the two agree on every pulse distance
  // record and differ on 100 of the 241 both accept, by exactly one bit, all of them `carries: 'mark'`.
  //
  // Which one is right is not a matter of taste. This decoder reads 12 and 15 bits with a 600 and 1200
  // microsecond split, which is Sony SIRC: a 600 unit, a long mark for a one, and 12 and 15 bit
  // variants. The other read 11 and 14, which are not a width any protocol has. So the removal is
  // demonstrated rather than argued, and section 133's button names were produced by the decoder that
  // was right.
  //
  // The mechanism was already written down in `irframe.ts`, in the docstring on `decode`: the trailing
  // gap arrives **with** the last bit, not instead of it. The decoder that kept the lesson is the one
  // that had been checked against a catalogue of named commands.
  for (const name of ['calibration_one', 'calibration_h600']) {
    const c = mustLoad(name);
    const widths = new Map<string, number>();
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const frame = irFrame(c, record);
        if (frame === undefined || frame.carries !== 'mark') continue;
        widths.set(`${frame.bits}:${frame.short}:${frame.long}`, (widths.get(`${frame.bits}:${frame.short}:${frame.long}`) ?? 0) + 1);
      }
    }
    // Both counts, so the claim cannot be satisfied by finding none of one kind. The two models carry
    // the same three devices, which is why the split is identical.
    assert.deepEqual(
      [...widths].sort(),
      [
        ['12:600:1200', 56],
        ['15:600:1200', 44],
      ],
      name,
    );
  }
});

test('a record reads under exactly one convention, or under none', skipWithoutLab(), () => {
  // The closure the whole decoder rests on: under the wrong convention every measured duration is the
  // constant half of the pair, so there is nothing to split and the reading is refused. If that failed
  // the decoder would need to be told the protocol family, and section 133's lookup against a
  // catalogue would have had to guess between two candidate frames per record.
  let one = 0;
  let none = 0;
  let both = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const readings = irFrames(c, record).length;
        if (readings === 2) both += 1;
        else if (readings === 1) one += 1;
        else none += 1;
      }
    }
  }
  // All three outcomes stated, not floored. `one > 3000` and `both > 0 && none > 0` stood here, and
  // the second is satisfied by a single record of each kind: the claim is a partition of the whole
  // infrared corpus, so the partition is what gets asserted.
  assert.deepEqual({ one, both, none }, { one: 3547, both: 148, none: 935 });
  // Every ambiguous record is a two group record, which is what the next test is about. There is no
  // record anywhere that is ambiguous for any other reason.
});

test('reading under both conventions means a two group record, and the reverse', skipWithoutLab(), () => {
  // A biconditional over the whole corpus, which is stronger than either half. It says the decoder's
  // refusal to choose is not noise: it lands on exactly the population that carries a second pointer
  // group, in every container, and never anywhere else.
  //
  // The counter below exists because a biconditional over an empty population is vacuously true, and
  // `if (!c) continue` used to stand here, so a partial lab reported the property held everywhere.
  let containers = 0;
  let records = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    containers += 1;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        // Class 1 only, and the reason is on the decoder's side rather than the header's. Byte `+11`
        // is a real group count on class 5 too, 61 records on arch 9, but a class 5 record stores no
        // duration stream at the record at all, section 82, so no convention can read it and the left
        // half of the biconditional is empty by construction. This restriction was added because the
        // test failed on an arch 9 record, and the first explanation written for it, that the count
        // byte means something else there, is wrong and `docs/config-format.md` says so.
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        const ambiguous: boolean = irFrames(c, record).length === 2;
        const twoGroup: boolean = irGroupCount(c, record) === 2;
        assert.equal(ambiguous, twoGroup, `${name} 0x${record.toString(16)}`);
        records += 1;
      }
    }
  }
  assert.equal(containers, CONTAINERS.length, 'a container went unread');
  // Exact, and the comment it replaces was wrong about what it counted: these are class 1 records,
  // the ones with a duration stream at the record, which is the population the biconditional is over.
  assert.equal(records, 4323, `${records} class 1 records were compared`);
});

test('arch 9 stores no duration stream to decode', skipUnless('h525_config'), () => {
  // Class 5 keeps its durations one level down, in a shared symbol table, section 82. So the decoder
  // reads nothing at all, and that is right rather than a gap: there is no pulse train at the record.
  const ARCH9_RECORDS: Record<string, number> = { h525_config: 200, h525_config_2: 107 };
  for (const name of ['h525_config', 'h525_config_2']) {
    const c = mustLoad(name);
    let records = 0;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        records += 1;
        assert.equal(irFrames(c, record).length, 0, `${name} 0x${record.toString(16)}`);
      }
    }
    // Each sample's own count, because `> 100` is a floor the smaller of the two clears by seven.
    assert.equal(records, ARCH9_RECORDS[name], name);
  }
});

/**
 * Section 134: a second pointer group holds the same code with one biphase bit cell inverted.
 */
test('a second pointer group is the same code with one cell swapped', skipUnless('arch8_config_a'), () => {
  for (const name of ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d']) {
    const c = mustLoad(name);
    let records = 0;
    let pairs = 0;
    const offsets = new Set<number>();
    const carriers = new Set<number>();
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (irGroupCount(c, record) !== 2) continue;
        records += 1;
        // The `!` on the frequency is the claim that no corpus record is unmodulated: a zero
        // period reports undefined now, since 0 Hz is a real case rather than a missing reading.
        carriers.add(Math.round(irCarrier(c, record)!.hertz!));
        const blocks: number[] = irRecordBlocks(c, record).filter((b) => b);
        // The first group's blocks then the second's, so block `i` and block `i + half` are the same
        // slot of the two groups: once against once, held against held. Section 127 names the slots.
        const trains: number[][] = blocks.map((b) => irBlockWords(c, b) ?? []);
        const half = trains.length / 2;
        for (let i = 0; i < half; i += 1) {
          const a: number[] = trains[i]!;
          const b: number[] = trains[i + half]!;
          // **Asserted rather than skipped.** A `continue` used to stand here, which passed over
          // precisely the disconfirming case: two blocks of different lengths are not one code with a
          // cell inverted, and the claim is that every pair is. Section 134.
          assert.equal(a.length, b.length,
            `${name} 0x${record.toString(16)} block ${i}: the pair differs in length`);
          pairs += 1;
          const differing: number[] = a.map((w, j) => (w === b[j] ? -1 : j)).filter((j) => j >= 0);
          assert.equal(differing.length, 2, `${name} 0x${record.toString(16)} block ${i}`);
          const [p, q] = differing as [number, number];
          assert.equal(q, p + 1, 'the two differing words are adjacent');
          // A swap and not an edit: the same two durations, with the mark and the space exchanged,
          // which is what inverting a biphase cell does and what a changed duration would not be.
          assert.equal(a[p]! & IR_PULSE_MAX, b[q]! & IR_PULSE_MAX);
          assert.equal(a[q]! & IR_PULSE_MAX, b[p]! & IR_PULSE_MAX);
          assert.notEqual(a[p]! & IR_PULSE_MARK, b[p]! & IR_PULSE_MARK);
          offsets.add(p - a.findIndex((w) => w & IR_PULSE_MARK));
        }
      }
    }
    assert.equal(records, 37, `${name} two group records`);
    // 61, not "at least 37". The floor was the record count reused as a bound on a different
    // quantity, so 24 pairs could have gone uncompared without it noticing.
    assert.equal(pairs, 61, `${name} comparable block pairs`);
    // One offset, in every record of every config: a fixed position in the frame, which is what a
    // toggle bit is and what an arbitrary difference between two codes would not be.
    assert.deepEqual([...offsets], [41], `${name} swap offsets`);
    assert.deepEqual([...carriers], [36200], `${name} carrier`);
  }
});

test('those records read as RC6 mode 6', skipUnless('arch8_config_a'), () => {
  // What identifies the protocol family, and therefore why two variants have to be stored: a biphase
  // code cannot be pulse decoded, and the one that carries a toggle needs the sender to alternate it.
  // Everything asserted here comes off the pulse train with a 441 us unit, which is the shortest
  // duration in it.
  const UNIT = 441;
  const c = load('arch8_config_a')!;
  let records = 0;
  for (const group of irGroups(c) ?? []) {
    for (const record of group.addresses) {
      if (irGroupCount(c, record) !== 2) continue;
      records += 1;
      const train = irBlockWords(c, irRecordBlocks(c, record).filter((b) => b)[0]!) ?? [];
      const from = train.findIndex((w) => w & IR_PULSE_MARK);
      // One entry per unit, so a run of two units becomes two entries and the cells line up.
      const units: boolean[] = [];
      for (const w of train.slice(from)) {
        const n = Math.round((w & IR_PULSE_MAX) / UNIT);
        for (let i = 0; i < n; i += 1) units.push(!!(w & IR_PULSE_MARK));
      }
      // The leader is six units of mark and two of space.
      assert.deepEqual(units.slice(0, 8), [true, true, true, true, true, true, false, false]);
      // Then four single width cells, mark before space being a one.
      const cell = (i: number) => (units[8 + 2 * i] === true && units[9 + 2 * i] === false ? 1 : 0);
      assert.equal(cell(0), 1, 'the start bit is always one');
      assert.deepEqual([cell(1), cell(2), cell(3)], [1, 1, 0], 'mode 110, which is mode 6');
      // Then a double width cell, which is the trailer a single width data bit is not.
      assert.deepEqual(units.slice(16, 20), [false, false, true, true]);
    }
  }
  assert.equal(records, 37);
});

/**
 * Section 133: the scan code to button name tables, checked against the containers they came from.
 *
 * The tables live in `reference/button-maps.md` and are parsed out of it rather than copied here. One
 * copy of a derivation, which is `CLAUDE.md`'s oldest rule, and the reason it matters for a table of
 * sixty numbers rather than for a function: a second copy is right until one of them moves.
 */
function tablesFromReference(): Record<string, Map<number, { button: string; frames: string[] }>> {
  const text = readFileSync(join(REPO, 'reference', 'button-maps.md'), 'utf8');
  const out: Record<string, Map<number, { button: string; frames: string[] }>> = {};
  // Each model is a `## ` heading; a row is scan, button and the frames, and the unresolved tables
  // below have a different shape so they do not match.
  for (const section of text.split(/^## /m).slice(1)) {
    const model = section.split('\n')[0]!.trim();
    const rows = new Map<number, { button: string; frames: string[] }>();
    for (const m of section.matchAll(/^\| (\d+) \| `(\w+)` \| `([^`]*)` \|$/gm)) {
      rows.set(Number(m[1]), { button: m[2]!, frames: m[3]!.split(' ').filter(Boolean) });
    }
    if (rows.size) out[model] = rows;
  }
  return out;
}

const MODELS: readonly [string, string, number][] = [
  // the heading in the reference document, the container, how many buttons the model has
  ['Harmony One, skin 54, architecture 12', 'calibration_one', 44],
  ['Harmony 600, skin 71, architecture 14', 'calibration_h600', 54],
];

test('the reference tables describe both models and nothing else', () => {
  // Runs without a lab, because a fresh clone should still be told if the document loses a table.
  const tables = tablesFromReference();
  assert.deepEqual(Object.keys(tables).sort(), MODELS.map(([m]) => m).sort());
  assert.equal(tables[MODELS[0]![0]]!.size, 32);
  assert.equal(tables[MODELS[1]![0]]!.size, 36);
});

test(
  'every scan in the reference tables sends the frames it is listed with',
  skipUnless('calibration_one', 'calibration_h600'),
  () => {
    const tables = tablesFromReference();
    for (const [model, name, buttons] of MODELS) {
      const c = load(name)!;
      const rows = tables[model]!;
      assert.ok(rows.size < buttons, 'the tables are partial and must not claim otherwise');
      // What the container itself says each scan sends, by decoding the records it reaches.
      const sends = new Map<number, Set<string>>();
      for (const binding of keyCodes(c)) {
        if (binding.where !== 'set' || binding.event !== 2) continue;
        for (const code of binding.codes) {
          const record = irGroups(c)![code.group]!.addresses[code.code];
          if (record === undefined) continue;
          const f = irFrame(c, record);
          if (!f) continue;
          if (!sends.has(binding.scan)) sends.set(binding.scan, new Set());
          sends.get(binding.scan)!.add(frameKey(f));
        }
      }
      for (const [scan, row] of rows) {
        const actual = sends.get(scan);
        assert.ok(actual, `${model} scan ${scan} sends nothing in ${name}`);
        assert.deepEqual(
          [...actual].sort(),
          [...row.frames].sort(),
          `${model} scan ${scan} (${row.button})`,
        );
      }
    }
  },
);

test('the two models agree about every button they share', skipUnless('calibration_one', 'calibration_h600'), () => {
  // Two containers, two architectures, one specification: the same command is stored by two different
  // generators runs and decodes to the same frame. Nothing else here checks that, since every other
  // reader test compares a container with itself.
  const tables = tablesFromReference();
  const one = tables[MODELS[0]![0]]!;
  const h600 = tables[MODELS[1]![0]]!;
  const byButton = (rows: typeof one) =>
    new Map([...rows.values()].map((r) => [r.button, r.frames.join(' ')]));
  const a = byButton(one);
  const b = byButton(h600);
  const shared = [...a.keys()].filter((k) => b.has(k));
  assert.equal(shared.length, 32, 'the One\'s buttons are all named on the 600 too');
  for (const button of shared) assert.equal(a.get(button), b.get(button), button);
  // And the difference is hardware: the 600 has the four teletext colour keys and the One does not.
  assert.deepEqual([...b.keys()].filter((k) => !a.has(k)).sort(), ['Blue', 'Green', 'Red', 'Yellow']);
  assert.deepEqual([...a.keys()].filter((k) => !b.has(k)), []);
});

test('no arithmetic on a scan code gives the keypad geometry', skipUnless('calibration_h600'), () => {
  // The negative that keeps `reference/silhouettes/` honest. Section 48 derived the electrical column
  // on arch 14 as `(scan - 1) mod 4`; if a matrix row were a row of keys, the three digits of a row
  // would share one. They do not, under any divisor, in either direction, so a scan code carries no
  // position and the tables above are the only route to a name.
  const tables = tablesFromReference();
  const rows = tables[MODELS[1]![0]]!;
  const digit = new Map<number, number>();
  for (const [scan, row] of rows) {
    const m = /^Number(\d)$/.exec(row.button);
    if (m) digit.set(Number(m[1]), scan);
  }
  assert.equal(digit.size, 10, 'all ten digits are named');
  const keypadRows = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  for (let m = 2; m < 20; m += 1) {
    for (const offset of [0, 1]) {
      for (const [rowOf, colOf] of [
        [(s: number) => Math.floor((s - offset) / m), (s: number) => (s - offset) % m],
        [(s: number) => (s - offset) % m, (s: number) => Math.floor((s - offset) / m)],
      ] as const) {
        const works = keypadRows.every((r) => {
          const scans = r.map((d) => digit.get(d)!);
          return new Set(scans.map(rowOf)).size === 1 && new Set(scans.map(colOf)).size === 3;
        });
        assert.ok(!works, `divisor ${m} offset ${offset} unexpectedly gives the geometry`);
      }
    }
  }
});

test(
  'the four undecided scans per remote are bound, not merely unnamed',
  skipUnless('calibration_one', 'calibration_h600'),
  () => {
    // `reference/button-maps.md` distinguishes two kinds of unnamed key and the distinction is the whole
    // honesty of that document: a key the configs never bind is unreachable, and these four are bound and
    // still not assignable, because two scans face two buttons carrying one command. An earlier revision
    // said everything unnamed was unbound, which was false for exactly these.
    const text = readFileSync(join(REPO, 'reference', 'button-maps.md'), 'utf8');
    const listed = new Map<string, number[]>();
    for (const section of text.split(/^### /m).slice(1)) {
      const model = section.split('\n')[0]!.trim();
      const scans: number[] = [];
      for (const m of section.matchAll(/^\| ([\d, ]+) \| `\w+` and `\w+` \|/gm)) {
        scans.push(...m[1]!.split(',').map((s) => Number(s.trim())));
      }
      if (scans.length) listed.set(model, scans);
    }
    assert.deepEqual([...listed.keys()].sort(), ['Harmony 600', 'Harmony One']);
    const tables = tablesFromReference();
    for (const [model, container] of [['Harmony One', 'calibration_one'], ['Harmony 600', 'calibration_h600']] as const) {
      const scans = listed.get(model)!;
      assert.equal(scans.length, 4, `${model} lists four undecided scans`);
      const c = load(container)!;
      const named = tables[MODELS.find(([m]) => m.startsWith(model))![0]]!;
      const bound = new Set(
        keyCodes(c)
          .filter((b) => b.where === 'set' && b.event === 2 && b.codes.length)
          .map((b) => b.scan),
      );
      for (const scan of scans) {
        assert.ok(bound.has(scan), `${model} scan ${scan} is listed as undecided but sends nothing`);
        assert.ok(!named.has(scan), `${model} scan ${scan} is both named and undecided`);
      }
    }
  },
);

test('the two gap thresholds are tuned, and these are the margins they are tuned to',
  skipWithoutLab(), () => {
  // The docstring on `GAP_US` and `TRAILING_GAP_US` said the corpus leaves "three orders of magnitude
  // of room" and that the thresholds "are not tuned". It compared a bit against the 32767 terminator,
  // which is not what either constant separates a bit from. These are the numbers that matter, and
  // pinning them is what turns a habit into a decision: widening either constant now has to explain
  // itself against a measurement.
  let largestBit = 0;
  let largestBitRecords = 0;
  let smallestGap = Infinity;
  let framed = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        if (irClass(c, address) !== IR_CLASS_STREAM) continue;
        const readings = irFrames(c, address, 1);
        if (readings.length !== 1) continue;
        framed += 1;
        const frame = readings[0] as { long: number };
        if (frame.long > largestBit) { largestBit = frame.long; largestBitRecords = 0; }
        if (frame.long === largestBit) largestBitRecords += 1;
        const first = irHeaderPointers(c, address)[0];
        const words = first === undefined ? undefined : irBlockWords(c, first);
        if (words === undefined) continue;
        for (const word of words) {
          const us = word & IR_PULSE_MAX;
          if (us >= 2000 && us < smallestGap) smallestGap = us;
        }
      }
    }
  }
  // The same 3547 the closure test above counts, which says every class 5 record already reads as
  // none: the class gate changes the population by zero, and that is worth knowing rather than
  // assuming, since `irRepeatPeriod` needed exactly this gate and did not have it.
  assert.equal(framed, 3547, `${framed} records read as a frame under exactly one convention`);
  // 1850 against a threshold of 2000 is 7.5% of room, not three orders of magnitude, and the gap
  // above it starts at 2230, so the constant sits inside a 380 us window with traffic on both sides.
  assert.equal(largestBit, 1850, 'the largest duration a frame consumes as a bit');
  assert.equal(largestBitRecords, 22, 'how many records reach it');
  assert.equal(smallestGap, 2230, 'the smallest duration at or above the trailing threshold');
  assert.ok(largestBit < 2000 && smallestGap > 2000, 'the threshold separates the two populations');
});

test('how many pointer groups a record declares, per architecture', skipWithoutLab(), () => {
  // Four comments in `ir.ts` said this is 1 on arch 9 (Harmony 525) as well as on arch 12 (Harmony
  // One) and arch 14 (Harmony 600 and 700), and one of them was on the constant a caller reaches for
  // when sizing a header. `docs/config-format.md` had said the opposite for weeks and the code was
  // right the whole time, which is the worst combination: nothing failed, and the comment is what a
  // reader trusts.
  //
  // Asserted as the whole distribution rather than as a count of the exceptions, because "2 in 37
  // records" is a claim about one contributor's four configs and the two arch 8 (Harmony 880) configs
  // contributed later have none, section 134.
  const byArch = new Map<number, Map<number, number>>();
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    const counts = byArch.get(c.architecture as number) ?? new Map<number, number>();
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        const declared = irGroupCount(c, address) ?? -1;
        counts.set(declared, (counts.get(declared) ?? 0) + 1);
      }
    }
    byArch.set(c.architecture as number, counts);
  }
  const shape = [...byArch]
    .sort((a, b) => a[0] - b[0])
    .map(([arch, counts]) => [arch, [...counts].sort((a, b) => a[0] - b[0])] as const);
  assert.deepEqual(shape, [
    [8, [[1, 2159], [2, 148]]],
    [9, [[1, 139], [2, 168]]],
    [12, [[1, 888]]],
    [14, [[1, 1128]]],
  ]);
});
