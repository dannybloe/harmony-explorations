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
import { imagePath, skipUnless, skipWithoutLab } from '@harmony/lab';
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
  irRecordBlocks,
} from '../src/ir.ts';
import { frameKey, irFrame, irFrames } from '../src/irframe.ts';
import { keyCodes } from '../src/inventory.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function load(name: string) {
  const p = imagePath(name);
  return p ? parse(new Uint8Array(readFileSync(p))) : undefined;
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

test('a record reads under exactly one convention, or under none', skipWithoutLab(), () => {
  // The closure the whole decoder rests on: under the wrong convention every measured duration is the
  // constant half of the pair, so there is nothing to split and the reading is refused. If that failed
  // the decoder would need to be told the protocol family, and section 133's lookup against a
  // catalogue would have had to guess between two candidate frames per record.
  let one = 0;
  let none = 0;
  let both = 0;
  for (const name of CONTAINERS) {
    const c = load(name);
    if (!c) continue;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const readings = irFrames(c, record).length;
        if (readings === 2) both += 1;
        else if (readings === 1) one += 1;
        else none += 1;
      }
    }
  }
  assert.ok(one > 3000, `only ${one} records read as a frame`);
  // Every ambiguous record is a two group record, which is what the next test is about. There is no
  // record anywhere that is ambiguous for any other reason.
  assert.ok(both > 0 && none > 0, 'the corpus should exercise all three outcomes');
});

test('reading under both conventions means a two group record, and the reverse', skipWithoutLab(), () => {
  // A biconditional over the whole corpus, which is stronger than either half. It says the decoder's
  // refusal to choose is not noise: it lands on exactly the population that carries a second pointer
  // group, in every container, and never anywhere else.
  for (const name of CONTAINERS) {
    const c = load(name);
    if (!c) continue;
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
      }
    }
  }
});

test('arch 9 stores no duration stream to decode', skipUnless('h525_config'), () => {
  // Class 5 keeps its durations one level down, in a shared symbol table, section 82. So the decoder
  // reads nothing at all, and that is right rather than a gap: there is no pulse train at the record.
  for (const name of ['h525_config', 'h525_config_2']) {
    const c = load(name);
    if (!c) continue;
    let records = 0;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        records += 1;
        assert.equal(irFrames(c, record).length, 0, `${name} 0x${record.toString(16)}`);
      }
    }
    assert.ok(records > 100, name);
  }
});

/**
 * Section 134: a second pointer group holds the same code with one biphase bit cell inverted.
 */
test('a second pointer group is the same code with one cell swapped', skipUnless('arch8_config_a'), () => {
  for (const name of ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d']) {
    const c = load(name);
    if (!c) continue;
    let records = 0;
    let pairs = 0;
    const offsets = new Set<number>();
    const carriers = new Set<number>();
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (irGroupCount(c, record) !== 2) continue;
        records += 1;
        carriers.add(Math.round(irCarrier(c, record)!.hertz));
        const blocks: number[] = irRecordBlocks(c, record).filter((b) => b);
        // The first group's blocks then the second's, so block `i` and block `i + half` are the same
        // slot of the two groups: once against once, held against held. Section 127 names the slots.
        const trains: number[][] = blocks.map((b) => irBlockWords(c, b) ?? []);
        const half = trains.length / 2;
        for (let i = 0; i < half; i += 1) {
          const a: number[] = trains[i]!;
          const b: number[] = trains[i + half]!;
          if (a.length !== b.length) continue;
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
    assert.ok(pairs >= 37, `${name} had only ${pairs} comparable block pairs`);
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
  assert.equal(tables[MODELS[0]![0]]!.size, 28);
  assert.equal(tables[MODELS[1]![0]]!.size, 32);
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
  assert.equal(shared.length, 28, 'both tables name the same 28 buttons');
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
