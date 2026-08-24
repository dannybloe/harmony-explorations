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
import { payloadOf } from '../src/ezhex.ts';
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
import type { FrameTimings, Pulse } from '../src/irframe.ts';
import { biphaseFrames, frameKey, framesOfPulses, fromFirstMark, irFrame, irFrames, pulsesOfFrame,
         pulsesOfBiphaseFrame, timingsOfBiphase, timingsOfFrame }
  from '../src/irframe.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { keyCodes } from '../src/inventory.ts';
import { statedProtocol, timingsOf } from '../src/stated.ts';

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
 * Every user config in the lab: what a remote was actually programmed with.
 *
 * **It was the nine configs section 32 quoted** until 14 August 2026, on the reasoning that keeping
 * that population made the counts comparable to the document's. That is the wrong trade, and section
 * 140 is why: the same reasoning had eight Python test classes each carrying their own literal of ten,
 * and widening them turned up five claims that were properties of the samples rather than of the
 * format. A count in a document is cheap to update; a population nobody widens is not cheap at all.
 *
 * Arch 9 (Harmony 525) is in the list even though its records use class 5 and carry no frame here,
 * because a decoder declining to read them is part of the assertion rather than a gap in it.
 *
 * Derived from `CONTAINERS` rather than written out, because two lists of fifteen names in one file
 * are two lists to keep in step and the file already holds the other one. What it removes is the two
 * calibration configs, which are synthetic and are deliberately outside any corpus wide total. The
 * Python mirror is `lab.USER_CONFIGS`.
 */
const CALIBRATION = ['calibration_one', 'calibration_h600'];
const SECTION_32_CONFIGS = CONTAINERS.filter((name) => !CALIBRATION.includes(name));

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
    assert.deepEqual({ records, framed }, { records: 4147, framed: 3020 });
    // Both populations, so the closure cannot be satisfied by finding nothing.
    assert.deepEqual(
      [...seen].sort(),
      [
        ['Kaseikyo 3456/1728', 670],
        ['NEC 9000/4500', 1567],
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
  // **`both` is zero now and that is the change section 163 made**, deliberately. Requiring the non
  // carrying half of a frame to be one length is what lets the gap threshold rise far enough to read a
  // protocol whose set bit is a 4505 space, and the records that used to read under both conventions are
  // biphase, so they now read under neither and `biphaseFrames` reads them instead. The count that used
  // to sit in `both` is asserted in the biphase test below, so nothing about that population went
  // unmeasured.
  // **And `none` gained 45 on 24 August 2026**, section 164: merging adjacent durations of one kind,
  // which is what an emitter physically does, takes the reading away from 45 records of three arch 8
  // (Harmony 880) configs that all read the same eight bit value. Nothing else in the corpus moves,
  // because requiring a constant non carrying half already refuses everything the merge would have
  // made ambiguous.
  assert.deepEqual({ one, both, none }, { one: 3502, both: 0, none: 1128 });
});

test('framing a pulse train and framing a record are one decoder', skipWithoutLab(), () => {
  // **The check that keeps there being one decoder.** `framesOfPulses` was added on 22 August 2026 for a
  // caller with the durations and not the file: FreeHarmony holds a command's marks and spaces in its own
  // model and wanted the frame, so that a code can be matched against a catalogue of named commands. The
  // alternative was a second decoder in that repository, which is the state this workspace's oldest rule
  // is about, and the failure mode is two right copies until one of them moves.
  //
  // So `irFrames` is a wrapper over it now, and this asserts they agree on every record in the corpus by
  // taking the same pulse train the long way round: out of the block, through the model's own shape, and
  // back in. A count of agreements would pass on a decoder that returned nothing, so the population is
  // asserted too.
  let compared = 0;
  let framed = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const first = irHeaderPointers(c, record)[0];
        if (!first) continue;
        const words = irBlockWords(c, first);
        if (!words) continue;
        // The shape a caller outside this package has: marks and spaces, the terminating zero dropped,
        // and the leading gap left in, since trimming it is knowing the format.
        const train = words
          .filter((word) => (word & IR_PULSE_MAX) !== 0)
          .map((word) => ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX }));
        const throughPulses = framesOfPulses(train).map(frameKey);
        const throughRecord = irFrames(c, record).map(frameKey);
        assert.deepEqual(throughPulses, throughRecord, `${name} record ${record}`);
        compared += 1;
        framed += throughRecord.length;
      }
    }
  }
  // The same population as the partition above, and the same total number of readings, so this cannot
  // pass by comparing two empty lists.
  assert.equal(compared, 4630);
  // 3502 readings and nothing ambiguous, per the partition above.
  assert.equal(framed, 3502);
});

test('a two group record is biphase, and the reverse no longer holds', skipWithoutLab(), () => {
  // **This was a biconditional and section 163 spent one direction of it.** It used to say that reading
  // under **both** carrier conventions lands on exactly the population carrying a second pointer group,
  // 148 records, in every container and nowhere else. Requiring the non carrying half of a frame to be
  // one length, which is what lets the gap threshold rise far enough to read `JerroldO1 16 Bit`, takes
  // those records to reading under neither convention, so the ambiguity that was the detector is gone.
  //
  // What is left is the direction that carries the meaning, and it is checked here against the reader
  // that names the cause rather than against an artefact: every two group record is a biphase code. The
  // reverse fails and the count says by how much, because 109 records of a set top box are biphase with
  // one group, and stating that is what stops this reading as a biconditional it is not.
  //
  // The counter below exists because a biconditional over an empty population is vacuously true, and
  // `if (!c) continue` used to stand here, so a partial lab reported the property held everywhere.
  let containers = 0;
  let records = 0;
  let twoGroups = 0;
  let allBiphase = 0;
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
        records += 1;
        const first = irHeaderPointers(c, record)[0];
        const words = first === undefined ? undefined : irBlockWords(c, first);
        if (words === undefined) continue;
        const train = fromFirstMark(pulsesOfWords(words));
        const biphase = biphaseFrames(train).length > 0;
        const twoGroup = irGroupCount(c, record) === 2;
        // The direction that holds, asserted per record.
        if (twoGroup) assert.ok(biphase, `${name} 0x${record.toString(16)} declares two groups and is not biphase`);
        if (twoGroup) twoGroups += 1;
        if (biphase) allBiphase += 1;
        // And no two group record reads under any carrier convention any more, which is the other half
        // of what the flat length rule did.
        if (twoGroup) assert.equal(irFrames(c, record).length, 0, `${name} 0x${record.toString(16)}`);
      }
    }
  }
  assert.equal(containers, CONTAINERS.length, 'a container went unread');
  // Exact, and the comment it replaces was wrong about what it counted: these are class 1 records,
  // the ones with a duration stream at the record, which is the population this is over.
  assert.equal(records, 4323, `${records} class 1 records were compared`);
  // The population section 134 measured, unchanged by any of this.
  assert.equal(twoGroups, 148);
  // And the reverse, stated as the number rather than left implicit: 109 more records are biphase and
  // declare one group, all of them one contributor's set top box, section 163.
  assert.equal(allBiphase, 257);
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

test('a bit space of 4505 reads now, and the 4480 that is not a bit still does not', () => {
  // **The counterexample the threshold's own docstring predicted, and it is fixed**, sections 161 and
  // 163. `JerroldO1 16 Bit`, the Motorola cable box, carries a set bit as a space of 4505 microseconds,
  // which the old 4000 threshold read as the end of the frame, so every record of it read as nothing.
  // The threshold is 8000 now and the control is the other test in this file: 45 records of three arch 8
  // (Harmony 880) configs carry a **mid frame gap** of 4480, twenty five microseconds below this, and
  // they are refused by `oneFlatLength` rather than by any constant, because their marks take two
  // lengths where a Jerrold record's are 495 throughout.
  const train = (long: number): Pulse[] => {
    const out: Pulse[] = [{ mark: true, us: 9000 }, { mark: false, us: 4520 }];
    // The first eight cells of a real record, 0x5006 style: a set bit is the long space.
    for (const bit of [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0]) {
      out.push({ mark: true, us: 495 });
      out.push({ mark: false, us: bit ? long : 2250 });
    }
    // **The mark that closes the frame, and it is load bearing since 24 August 2026.** The reader
    // merges adjacent durations of one kind, section 164, so a last bit space that runs straight into
    // the inter frame silence is one interval and the last bit is gone. Every framed record in the
    // corpus carries this mark, which is what makes the merge cost 45 records rather than thousands:
    // its absence here was an artefact of the train being written by hand.
    out.push({ mark: true, us: 495 });
    out.push({ mark: false, us: 19636 });
    return out;
  };
  const jerrold = framesOfPulses(train(4505), 1);
  assert.equal(jerrold.length, 1, 'a 4505 us space is a bit, not the end of the frame');
  assert.equal(jerrold[0]?.bits, 16);
  assert.equal(jerrold[0]?.value, 0b1000111000000110n);
  assert.equal(jerrold[0]?.carries, 'space');
  // Still bounded, and this is the assertion that says the threshold is a threshold: past 8000 a
  // duration is a gap again, so the same train with a 9000 space reads as nothing.
  assert.deepEqual(framesOfPulses(train(9000), 1), []);
  // And the shape rule bites regardless of length: give the marks two lengths, which is what a biphase
  // record has, and the frame is refused however short its spaces are.
  const biphaseLike = train(4505).map((one, i) => one.mark && i > 3 && i % 6 === 0
    ? { mark: true, us: 990 } : one);
  assert.deepEqual(framesOfPulses(biphaseLike, 1), []);
});

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
  // The same 3502 the closure test above counts, which says every class 5 record already reads as
  // none: the class gate changes the population by zero, and that is worth knowing rather than
  // assuming, since `irRepeatPeriod` needed exactly this gate and did not have it.
  assert.equal(framed, 3502, `${framed} records read as a frame under exactly one convention`);
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


/**
 * A record's first block as pulses, from its first mark, which is what both directions work on.
 *
 * The tests below all need the same three things at once, the train, the frame and the timings, and
 * writing that out five times is five places for the leading gap to be trimmed differently.
 */
function framedRecord(c: ReturnType<typeof parse>, record: number):
  { train: readonly Pulse[]; frame: ReturnType<typeof framesOfPulses>[number]; timings: FrameTimings }
  | undefined {
  const first = irHeaderPointers(c, record)[0];
  if (!first) return undefined;
  const words = irBlockWords(c, first);
  if (!words) return undefined;
  const train = fromFirstMark(words.map((word) =>
    ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX })));
  const readings = framesOfPulses(train);
  if (readings.length !== 1) return undefined;
  const frame = readings[0]!;
  const timings = timingsOfFrame(train, frame);
  return timings === undefined ? undefined : { train, frame, timings };
}

const alike = (a: readonly Pulse[], b: readonly Pulse[]): boolean =>
  a.length === b.length && a.every((p, i) => b[i]!.mark === p.mark && b[i]!.us === p.us);

test('every frame in the corpus rebuilds from five durations read off its own record',
  skipWithoutLab(), () => {
  // **Section 152, and the claim is that the frame half of a duration block is redundant.** A record
  // states its header pair, the flat half of every mark and space pair, and the two lengths the carried
  // half takes; with the bits, that is the whole frame back, byte for byte. Nothing here knows what a
  // Panasonic or an NEC frame looks like.
  //
  // Why it matters beyond tidiness: Logitech's own catalogue states a protocol family and a frame value
  // and no durations at all, so turning one of its commands into something a remote can send needs the
  // timings from somewhere. This says where: any record of the same family that a configuration already
  // holds.
  //
  // Three counts and not one, because each can fail differently. `framed` is the decoder's population,
  // `split` is how many of those state timings that separate into a flat half and two carried lengths,
  // and `rebuilt` is how many come back identical. Equality between the second and the third is the
  // finding; equality between the first and the second is what stops a refusal being counted as a pass.
  const per: Record<string, { framed: number; split: number; rebuilt: number }> = {};
  let records = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    const counts = { framed: 0, split: 0, rebuilt: 0 };
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        records += 1;
        if (framesOfPulses(fromFirstMark((irBlockWords(c, irHeaderPointers(c, record)[0] ?? 0) ?? [])
          .map((w) => ({ mark: (w & IR_PULSE_MARK) !== 0, us: w & IR_PULSE_MAX })))).length === 1) {
          counts.framed += 1;
        }
        const one = framedRecord(c, record);
        if (one === undefined) continue;
        counts.split += 1;
        const built = pulsesOfFrame(one.timings, one.frame.bits, one.frame.value);
        if (alike(built, one.train.slice(0, built.length))) counts.rebuilt += 1;
      }
    }
    per[name] = counts;
  }
  // Per container rather than a total, because a total hides one architecture sitting at zero, which is
  // the shape section 148 found in the renderer's own completeness claim.
  assert.deepEqual(per, {
    one_config: { framed: 270, split: 270, rebuilt: 270 },
    one_config_unprogrammed: { framed: 97, split: 97, rebuilt: 97 },
    h600_config: { framed: 134, split: 134, rebuilt: 134 },
    h700_config: { framed: 346, split: 346, rebuilt: 346 },
    h700_config_2: { framed: 346, split: 346, rebuilt: 346 },
    // Arch 9 (Harmony 525) stores class 5 records, which carry no duration stream at the record at all,
    // section 82. Zero is the right answer and it is asserted rather than skipped.
    h525_config: { framed: 0, split: 0, rebuilt: 0 },
    h525_config_2: { framed: 0, split: 0, rebuilt: 0 },
    arch8_config_a: { framed: 71, split: 71, rebuilt: 71 },
    // 15 fewer in each of these three than before 24 August 2026, which is the whole cost of merging
    // adjacent durations of one kind, section 164.
    arch8_config_b: { framed: 218, split: 218, rebuilt: 218 },
    arch8_config_c: { framed: 275, split: 275, rebuilt: 275 },
    arch8_config_d: { framed: 283, split: 283, rebuilt: 283 },
    arch8_config_880: { framed: 298, split: 298, rebuilt: 298 },
    arch8_config_885: { framed: 460, split: 460, rebuilt: 460 },
    one_spare_before_sync: { framed: 97, split: 97, rebuilt: 97 },
    one_spare_after_sync: { framed: 125, split: 125, rebuilt: 125 },
    calibration_one: { framed: 241, split: 241, rebuilt: 241 },
    calibration_h600: { framed: 241, split: 241, rebuilt: 241 },
  });
  assert.equal(records, 4630, 'the same population the partition above is over');
});

test('a pulse width frame\'s last space is a trailing gap and not a bit cell', skipWithoutLab(), () => {
  // **The correction that took the count from 3347 to 3547.** Reading the last space as another cell of
  // the flat half made 200 records look as though their timings did not split: the half that is supposed
  // to be one length had two values, and the second was always the last one. All 200 are pulse width,
  // where the bit is in the mark and the frame ends on a space that no bit occupies.
  //
  // So it is one number more for that convention rather than a defect, and it is asserted here as a
  // property of the population rather than as a note: every mark carrier in the corpus has a closing
  // space, every space carrier has none, and the closing space differs from the flat half in all of them.
  let mark = 0;
  let space = 0;
  const widths = new Map<number, number>();
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const one = framedRecord(c, record);
        if (one === undefined) continue;
        if (one.timings.carries === 'space') {
          assert.equal(one.timings.closing, undefined, `${name} 0x${record.toString(16)}`);
          space += 1;
          continue;
        }
        mark += 1;
        assert.notEqual(one.timings.closing, undefined);
        assert.notEqual(one.timings.closing, one.timings.flat,
          'a closing space equal to the flat half would mean the correction was unnecessary');
        widths.set(one.frame.bits, (widths.get(one.frame.bits) ?? 0) + 1);
      }
    }
  }
  // The space carriers are 45 fewer since the reader merges adjacent durations, section 164, and the
  // mark carriers do not move: all 45 are arch 8 (Harmony 880) records whose bit is in the space.
  assert.deepEqual({ mark, space }, { mark: 200, space: 3302 });
  // The two protocol widths, and where they are. Both configurations Logitech compiled to our own
  // specification drive the same equipment, which is why the population is theirs alone: no contributed
  // configuration here holds a pulse width record that reads under one convention.
  assert.deepEqual([...widths].sort((a, b) => a[0] - b[0]), [[12, 112], [15, 88]]);
  // And the negative: refusing to build one without that number, rather than falling back on the flat
  // half, which would emit a frame no remote in this corpus has ever stored.
  assert.throws(() => pulsesOfFrame(
    { header: [2400, 600], flat: 600, zero: 600, one: 1200, carries: 'mark' }, 12, 0x910n));
});

test('a rebuilt frame is sensitive to every number it was built from', skipWithoutLab(), () => {
  // A rebuild that cannot fail is not a check. Each of the five durations is moved by one microsecond
  // and each bit of the value is flipped, on one real record per container, and every one of those has
  // to stop matching. One microsecond because the frame is stored in whole microseconds, so it is the
  // smallest change the format can express and therefore the sharpest control.
  let containers = 0;
  let nudges = 0;
  let flips = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    let done = false;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (done) break;
        const one = framedRecord(c, record);
        if (one === undefined) continue;
        done = true;
        containers += 1;
        const { train, frame, timings } = one;
        const right = pulsesOfFrame(timings, frame.bits, frame.value);
        const head = train.slice(0, right.length);
        assert.ok(alike(right, head));
        const nudged: FrameTimings[] = [
          { ...timings, header: [timings.header[0] + 1, timings.header[1]] },
          { ...timings, header: [timings.header[0], timings.header[1] + 1] },
          { ...timings, flat: timings.flat + 1 },
          { ...timings, zero: timings.zero + 1 },
          { ...timings, one: timings.one + 1 },
        ];
        for (const [i, t] of nudged.entries()) {
          assert.equal(alike(pulsesOfFrame(t, frame.bits, frame.value), head), false,
            `${name} timing ${i} moved by one microsecond and the frame still matched`);
          nudges += 1;
        }
        for (let bit = 0; bit < frame.bits; bit += 1) {
          const flipped = frame.value ^ (1n << BigInt(bit));
          assert.equal(alike(pulsesOfFrame(timings, frame.bits, flipped), head), false,
            `${name} bit ${bit} flipped and the frame still matched`);
          flips += 1;
        }
      }
    }
  }
  // Fifteen of the seventeen containers hold a framed record, the two arch 9 ones (Harmony 525) do not,
  // and each of the fifteen contributes five timing nudges. The flips are the bit widths of those
  // fifteen records added up, so all three are stated: a container dropping quietly out of the loop
  // shows up here rather than in a share.
  assert.deepEqual({ containers, nudges, flips }, { containers: 15, nudges: 75, flips: 524 });
});

test('what a frame does not determine is everything after it', skipWithoutLab(), () => {
  // **The boundary, asserted so that nobody reads the rebuild above as a whole block.** A record's block
  // holds its frame over and over, and what separates and follows the copies does not follow from the
  // bits: it is a closing mark, a gap, sometimes the protocol's own short repeat frame, and a silence
  // built out of 32767 microsecond spaces.
  //
  // Two halves. The repeat count is a small discrete set and the gap between consecutive copies is byte
  // identical every time, which is structure worth having. The tail is 140 distinct shapes over 3502
  // records, which is why `pulsesOfFrame` stops at the frame: a writer copies the rest from a record
  // that already has one, and an editor that changes a repeat rate edits that gap, section 127.
  const repeats = new Map<number, number>();
  const tails = new Set<string>();
  let oneGap = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        const one = framedRecord(c, record);
        if (one === undefined) continue;
        const { train, frame, timings } = one;
        const built = pulsesOfFrame(timings, frame.bits, frame.value);
        let cursor = built.length;
        let seen = 1;
        const gaps = new Set<string>();
        for (;;) {
          let next = cursor;
          while (next < train.length && !alike(built, train.slice(next, next + built.length))) next += 1;
          if (next >= train.length) break;
          gaps.add(train.slice(cursor, next).map((p) => `${p.mark ? '+' : '-'}${p.us}`).join(' '));
          seen += 1;
          cursor = next + built.length;
        }
        if (gaps.size <= 1) oneGap += 1;
        repeats.set(seen, (repeats.get(seen) ?? 0) + 1);
        tails.add(train.slice(cursor).map((p) => `${p.mark ? '+' : '-'}${p.us}`).join(' '));
      }
    }
  }
  assert.equal(oneGap, 3502, 'one gap separates every copy of a frame, in every record');
  assert.deepEqual([...repeats].sort((a, b) => a[0] - b[0]),
    [[1, 2188], [3, 1305], [7, 4], [11, 1], [30, 4]]);
  // Stated exactly, and it is the number that would move if somebody found the rule. A bound under it
  // would read as "the tail is complicated" and say nothing about how complicated.
  //
  // It was 151 until 24 August 2026 and lost eleven shapes with the 45 records the merge costs, section
  // 164. Counted over the **stored** words rather than over merged intervals, deliberately: a tail is
  // what a writer has to copy out of a record, and what it copies is words.
  assert.equal(tails.size, 140);
});

test('the timings belong to the device rather than to the command', skipWithoutLab(), () => {
  // The half of section 152 the application needs. If every code of one appliance shares one set of
  // timings, then a code Logitech states as a bare number can be written using the timings of any other
  // code of that appliance. 52 of 58 device groups in the corpus do; six carry two sets, which is why
  // the number is stated rather than the claim being made universal.
  let groups = 0;
  let single = 0;
  for (const name of CONTAINERS) {
    const c = mustLoad(name);
    for (const group of irGroups(c) ?? []) {
      const sets = new Set<string>();
      for (const record of group.addresses) {
        const one = framedRecord(c, record);
        if (one === undefined) continue;
        const t = one.timings;
        sets.add(`${t.header[0]}/${t.header[1]}/${t.flat}/${t.zero}/${t.one}/${t.carries}`);
      }
      if (sets.size === 0) continue;
      groups += 1;
      if (sets.size === 1) single += 1;
    }
  }
  // Three device groups fewer than before 24 August 2026, one in each of three arch 8 (Harmony 880)
  // configs, because merging took every framed record of those groups away at once, section 164.
  assert.deepEqual({ groups, single }, { groups: 55, single: 49 });
});

test('a biphase code reads as half cells, and a pulse distance one does not', () => {
  // **A biphase frame has one duration and the bit is in which half of the cell carries it**, section
  // 162, so there is no constant half and no two carried lengths to split. This is `Magnavox 13 Bit` as
  // Logitech's own compiler emits it: an 880 mark of lead in, then thirteen cells of 880 and 900.
  const lead = [{ mark: true, us: 880 }];
  const timings = { mark: 880, space: 900, lead, setIsMark: true };
  const value = 0x07FFn;
  const built = pulsesOfBiphaseFrame(timings, 13, value);
  assert.equal(built.length, 1 + 2 * 13, 'the lead in plus one word per half cell');
  // Unmerged, which is what a record stores: two adjacent halves of one kind are two words.
  assert.deepEqual(built.slice(1, 5).map((one) => one.us), [900, 880, 900, 880]);

  // And it comes back. The alignment is not derivable, so the reader offers one per parity and the
  // caller picks by what a catalogue states; the reading that carries this number is the 13 bit one.
  const readings = biphaseFrames(built);
  const found = readings.find((one) => one.bits === 13);
  assert.ok(found !== undefined, 'no thirteen bit reading among ' + readings.length);
  assert.equal(found.value, value);
  assert.equal(found.base, 880);
  assert.equal(found.skipped, 1, 'the lead in is one half cell');
  // The durations come back too, which is the encoder and the decoder agreeing on one field.
  assert.deepEqual(timingsOfBiphase(built, found.skipped, 13, true), timings);

  // **The negative, and it is the one that matters**: a pulse distance frame is not biphase, because its
  // carried half is three or four times its flat half and its lead in is ten or twenty, so the intervals
  // are not whole multiples of one cell. Without this the reader would answer for every record it saw.
  const nec = pulsesOfFrame(
    { header: [8990, 4490], flat: 568, zero: 552, one: 1662, carries: 'space' }, 32, 0x20DF08F7n);
  assert.deepEqual(biphaseFrames(nec), []);
});

test('the biphase reading lands on the number Logitech named, in a contributed config',
  skipUnless('arch8_config_a'), () => {
  // **The known answer check, section 162.** The alignment, the polarity and the width were worked out
  // on a configuration Logitech's compiler produced for appliances chosen here. This record is in a
  // contributed arch 8 (Harmony 880) config from somebody else's household, and the number below is
  // what Logitech's own analyser answered when asked what it is: `G:Microsoft 30 Bit:()(0x3FF07BE5)():3`.
  // Nothing about it was used to derive the reading.
  const c = parse(require_('arch8_config_a'));
  const record = 0x241a8;
  const first = irHeaderPointers(c, record)[0];
  assert.ok(first !== undefined);
  const words = irBlockWords(c, first);
  assert.ok(words !== undefined);
  const train = fromFirstMark(words
    .filter((word) => (word & IR_PULSE_MAX) !== 0)
    .map((word) => ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX })));
  // The pulse distance decoder reads this record under **no** convention, which is section 163's change:
  // it used to fit both, and requiring a constant non carrying half refuses it for the reason that is
  // actually true of it, that a biphase code has two lengths in **both** halves.
  assert.deepEqual(framesOfPulses(train), [], 'a biphase record is not a pulse distance frame');
  // RC-6 is the other way up: a set bit is the space first. The reading is 32 bits of run and the
  // catalogue states 30, so the two leading bits are lead in.
  const reading = biphaseFrames(train).find((one) => one.bits >= 30);
  assert.ok(reading !== undefined);
  const mask = (1n << 30n) - 1n;
  assert.equal((reading.value & mask) ^ mask, 0x3FF07BE5n, 'their analyser named this number');
  // And the durations rebuild the record's own pulses, which is what makes the family writable.
  const t = timingsOfBiphase(train, reading.skipped + 2 * (reading.bits - 30), 30, false);
  assert.ok(t !== undefined);
  const back = pulsesOfBiphaseFrame(t, 30, 0x3FF07BE5n);
  assert.deepEqual(back.map((one) => [one.mark, one.us]),
                   train.slice(0, back.length).map((one) => [one.mark, one.us]));
});

test('a code whose bits are all the same cannot be read blind, and its family reads it',
  skipUnless('h600_config', 'h700_config'), () => {
  // **The guard that refuses this record is the right guard**, section 162. Under the wrong carrier
  // convention every duration a reader measures is the constant half of the pair, so `SPLIT_RATIO`
  // refuses a train with one carried length. A code of 24 zero bits genuinely has one carried length,
  // so it is refused for a correct reason and no blind decoder can do better.
  //
  // What reads it is the family. Logitech's analyser names these records `Logitech 24 Bit` and states
  // `0x000000`, and the entry for that family was measured off a PS3 in a configuration their compiler
  // produced for appliances chosen here. Emitting their number under those durations reproduces four
  // records in four other configs, on televisions, byte for byte.
  const entry = statedProtocol('Logitech 24 Bit');
  assert.ok(entry !== undefined);
  const t = timingsOf(entry);
  assert.ok(t !== undefined);
  for (const [name, record] of [['h600_config', 0x3c60b], ['h700_config', 0x384ca]] as const) {
    const c = parse(require_(name));
    const first = irHeaderPointers(c, record)[0];
    assert.ok(first !== undefined);
    const words = irBlockWords(c, first);
    assert.ok(words !== undefined);
    const train = fromFirstMark(words
      .filter((word) => (word & IR_PULSE_MAX) !== 0)
      .map((word) => ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX })));
    assert.deepEqual(framesOfPulses(train), [], `${name} should read as nothing blind`);
    const built = pulsesOfFrame(t, 24, 0n);
    assert.deepEqual(built.map((one) => [one.mark, one.us]),
                     train.slice(0, built.length).map((one) => [one.mark, one.us]), name);
    // **The control, and it is what makes these records evidence rather than arithmetic.** The polarity
    // of this family was derived in section 161 from the catalogue stating the complement of what our
    // decoder reads. Here the same number under the opposite polarity puts a 500 where the record has a
    // 1000, so these four records test the polarity independently of how it was found.
    const flipped = pulsesOfFrame({ ...t, zero: t.one, one: t.zero }, 24, 0n);
    assert.notEqual(flipped[3]?.us, train[3]?.us);
  }
});

test('the three records their analyser calls Makita are Sharp codes on a Denon receiver',
  skipUnless('one_config', 'one_spare_after_sync'), () => {
  // **Their analyser named the wrong family and the wrong width**, section 162, and this is the case
  // where an independent answer exists. Each record reads as fifteen bits with no lead in, its own
  // durations are byte identical to the `Sharp 15 Bit 2` entry their own **compiler** emitted for two
  // Denon receivers, and the group holding it is the config's Denon. Their analyser answers
  // `Makita 10 Bit` and states bits 1 to 10 of the fifteen.
  const entry = statedProtocol('Sharp 15 Bit 2');
  assert.ok(entry !== undefined);
  const want = timingsOf(entry);
  assert.ok(want !== undefined);
  for (const [name, record, stated] of [['one_config', 0x44179, 0x227n],
                                        ['one_spare_after_sync', 0x43961, 0x217n]] as const) {
    const c = parse(require_(name));
    const first = irHeaderPointers(c, record)[0];
    assert.ok(first !== undefined);
    const words = irBlockWords(c, first);
    assert.ok(words !== undefined);
    const train = fromFirstMark(words
      .filter((word) => (word & IR_PULSE_MAX) !== 0)
      .map((word) => ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX })));
    const frame = framesOfPulses(train, 0).find((one) => one.bits === 15);
    assert.ok(frame !== undefined, `${name} does not read as fifteen bits`);
    assert.deepEqual(timingsOfFrame(train, frame, 0), want, `${name} has other durations`);
    // Their ten bits are ours with the first dropped and the last four cut, which is the claim.
    assert.equal((frame.value >> 4n) & 0x3FFn, stated, `${name} against their number`);
    // And the frame rebuilds from the entry, so the family is not an inference from a name.
    const back = pulsesOfFrame(want, 15, frame.value);
    assert.deepEqual(back.map((one) => [one.mark, one.us]),
                     train.slice(0, back.length).map((one) => [one.mark, one.us]), name);
  }
});

test('a flat half of 433 and 434 is one length, and Logitech names the ten codes it unlocks',
  skipUnless('compiled_protocols'), () => {
  // **The rule was exact equality and Logitech's own generator does not emit that**, section 165. A
  // pulse distance frame has one constant half by definition, and the reader took "constant" to mean
  // byte identical, so ten records of the configuration their compiler produced read as nothing at all:
  // six Denon codes whose marks alternate between 433 and 434, a JVC pair at 409 and 410, and two
  // Pioneer codes whose mark is 560 before a short space and 594 before a long one.
  //
  // The rule is now that the flat half must not **split**, by the same ratio the carried half has to
  // split by, and the margin is measured: over the corpus and this sample the widest flat spread this
  // admits is 6.1% and the narrowest it still refuses is 100%, which is a biphase code's two halves in
  // a two to one ratio. Nothing lies between 1.061 and 2.0 and the threshold is 1.4.
  //
  // **The numbers are Logitech's, from their own analyser**, asked on 24 August 2026 and recorded in
  // `../lab/reads/20260824-merge/compiled-unread.json`. Nine of the ten land exactly; the tenth is a
  // `Panasonic 16 Bit` code where their number is the complement of ours, which is the same per family
  // polarity convention `Logitech 24 Bit` has and which the rhythm table already carries. The two
  // records this still refuses are 16 zero bits of `JerroldO1 16 Bit`, and their analyser refuses both.
  const c = parse(payloadOf(require_('compiled_protocols'), 'compiled_protocols'));
  const WANT: readonly (readonly [number, number, bigint, boolean])[] = [
    [0x43679, 32, 0x15EA9867n, false],
    [0x46814, 32, 0x15EA9867n, false],
    [0x857eb, 48, 0xC080442AFC92n, false],
    [0x9aca9, 48, 0x2A4C02878005n, false],
    [0x9bbf3, 48, 0x2A4C028D800Fn, false],
    [0xa403a, 48, 0x2A4C028B8009n, false],
    [0xa4df2, 48, 0x2A4C028F800Dn, false],
    [0xa58d1, 48, 0x2A4C02838001n, false],
    [0xc8fc6, 48, 0x2A4C028E34B8n, false],
    // The complement case, marked rather than quietly compared the other way up.
    [0x8510b, 16, 0x3AF7n, true],
  ];
  let landed = 0;
  for (const [record, bits, stated, inverted] of WANT) {
    const first = irHeaderPointers(c, record)[0];
    assert.ok(first !== undefined, `0x${record.toString(16)} has no block`);
    const words = irBlockWords(c, first);
    assert.ok(words !== undefined);
    const train = fromFirstMark(pulsesOfWords(words));
    // The headerless convention is tried too, because the Panasonic code has no lead in and its
    // sixteenth bit is the one a skipped header pair eats.
    const readings = [...framesOfPulses(train), ...framesOfPulses(train, 0)];
    const mask = (1n << BigInt(bits)) - 1n;
    const want = inverted ? stated ^ mask : stated;
    const found = readings.find((one) => one.bits === bits && one.value === want);
    assert.ok(found !== undefined,
      `0x${record.toString(16)} read [${readings.map(frameKey)}], wanted ${bits}:${want.toString(16)}`);
    landed += 1;
  }
  assert.equal(landed, 10);
  // **The two it still refuses, which is the control.** Every carried duration of these is 2250, so
  // there is nothing to split and no blind reader can do better; the family's own rhythm reads them.
  for (const record of [0xb93c7, 0xb998b]) {
    const words = irBlockWords(c, irHeaderPointers(c, record)[0] ?? 0);
    assert.ok(words !== undefined);
    const train = fromFirstMark(pulsesOfWords(words));
    assert.deepEqual([...framesOfPulses(train), ...framesOfPulses(train, 0)], [],
      `0x${record.toString(16)} has one carried length`);
  }
  // And the negative that pins the threshold: a flat half that splits by two is biphase and stays
  // refused, whatever its lengths are.
  const cell = (mark: number, space: number) => [{ mark: true, us: mark }, { mark: false, us: space }];
  const biphaseLike = [...cell(433, 426), ...Array.from({ length: 12 }, (_, i) =>
    i % 2 === 0 ? cell(433, 1267) : cell(866, 426)).flat(), { mark: false, us: 20_000 }];
  assert.deepEqual(framesOfPulses(biphaseLike, 0), [], 'a flat half of 433 and 866 is two lengths');
});
