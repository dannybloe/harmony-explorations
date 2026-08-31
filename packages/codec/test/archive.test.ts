/**
 * Reading Logitech's own protocol definitions out of the Harmony infrared archive.
 *
 * **The calibration is the point of this file.** The archive is somebody else's transcription of
 * Logitech's database, and the reason to believe it is that our own measurements agree with it: 30 of
 * the 31 frame rhythms in `PROTOCOLS` are reproduced from Logitech's definition field for field, none
 * disagrees, and the two measurements have nothing in common. Ours came off configurations their
 * compiler produced and off records real remotes were carrying; theirs was fetched from their service.
 *
 * The tests skip without a checkout, exactly as the corpus tests skip without a lab. There are
 * deliberately **no fixtures**: a few of the archive's files checked in here would be its JSON in this
 * repository, which decision 15 forbids, and the drift guard is the schema version instead.
 */
import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import {
  ARCHIVE_SCHEMA_VERSION, ArchiveError, archiveManifest, archiveProtocols, catalogueByRhythm,
  familiesOfRhythm, periodOfCarrier, rhythmKey, rhythmOfDefinition, type ConversionRefusal,
} from '../src/archive.ts';
import type { BiphaseTimings, FrameTimings } from '../src/irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../src/protocols.ts';
import { blockOfStatedCode, pulsesOfStatedCode, statedProtocol } from '../src/stated.ts';

/**
 * The entries somebody here measured, which is the only population this file may compare.
 *
 * **A stated row agrees with the catalogue by construction**, having been generated out of it, so
 * counting one as agreement is circular and would turn the calibration below into a tautology that
 * grows more convincing the more rows are added. 424 of the table's 461 entries are of that kind.
 */
const MEASURED = PROTOCOLS.filter((one) => one.source !== 'stated');

/** A table row as the shape a lookup takes, or undefined where the row is neither shape. */
function shapeOf(row: StatedProtocol): { timings?: FrameTimings; biphase?: BiphaseTimings } | undefined {
  if (row.header !== undefined) return { timings: timingsOf(row)! };
  return row.biphase === undefined ? undefined : { biphase: row.biphase };
}

/** A table row as a `FrameTimings`, or undefined where the row is not a frame row at all. */
function timingsOf(row: StatedProtocol): FrameTimings | undefined {
  if (row.header === undefined) return undefined;
  return {
    header: row.header, flat: row.flat!, zero: row.zero!, one: row.one!, carries: row.carries!,
    ...(row.oneMark === undefined ? {} : { oneMark: row.oneMark }),
    ...(row.firstMark === undefined ? {} : { firstMark: row.firstMark }),
  };
}

test('the archive states a schema version, and an unknown one is refused', () => {
  // The refusal is the whole guard, so it is asserted before anything is read through it. A reader that
  // carries on against a layout it does not know produces durations nobody can tell from correct ones.
  const fake = mkdtempSync(join(tmpdir(), 'harmony-archive-'));
  writeFileSync(join(fake, 'manifest.json'), JSON.stringify({ schemaVersion: 2, counts: {} }));
  assert.throws(() => archiveManifest(fake), ArchiveError, 'a later schema version must refuse');
  const empty = mkdtempSync(join(tmpdir(), 'harmony-archive-'));
  assert.throws(() => archiveManifest(empty), ArchiveError, 'no manifest at all must refuse');
});

test('the carrier is the truncated reciprocal, not the rounded one', () => {
  // Section 41's convention, and getting it the other way round reported 30 of 37 families as
  // disagreeing with this archive by one nanosecond. 38 kHz is 26315 and not 26316.
  assert.equal(periodOfCarrier(38000), 26315);
  assert.equal(periodOfCarrier(36400), 27472);
  assert.equal(periodOfCarrier(40000), 25000);
  // The control: rounding would give a different answer for the first two and the same for the third,
  // so a test using only 40 kHz could not tell the two rules apart.
  assert.notEqual(periodOfCarrier(38000), Math.round(1e9 / 38000));
});

test('every protocol definition in the archive reads or says why not', { ...skipWithoutIrArchive() },
  () => {
    const manifest = archiveManifest(IR_ARCHIVE!);
    assert.equal(manifest.schemaVersion, ARCHIVE_SCHEMA_VERSION);
    const all = archiveProtocols(IR_ARCHIVE!);
    // Exact, per the house rule, and it is the archive's own count: 685 files, of which `index.json` is
    // the archive's index of the other 684 and not a definition. Counting it is what made an early
    // reading here report 685 families.
    assert.equal(all.length, 684);
    assert.equal(manifest.counts['protocols'], 684);

    const refusals = new Map<ConversionRefusal, number>();
    let read = 0;
    let frames = 0;
    let biphases = 0;
    for (const one of all) {
      const rhythm = rhythmOfDefinition(one);
      if ('refusal' in rhythm) {
        refusals.set(rhythm.refusal, (refusals.get(rhythm.refusal) ?? 0) + 1);
        continue;
      }
      read += 1;
      if (rhythm.biphase === undefined) frames += 1; else biphases += 1;
      // Whatever is read is read whole: a rhythm with a zero duration in it would emit a train an
      // appliance cannot hear, and would still key and compare like any other.
      assert.ok(rhythm.periodNs > 0, one.name);
      const t = rhythm.timings;
      const b = rhythm.biphase;
      assert.ok((t === undefined) !== (b === undefined), `${one.name} states one shape, never both`);
      if (t !== undefined) {
        assert.ok(t.flat > 0 && t.zero > 0 && t.one > 0, one.name);
        assert.notEqual(t.zero, t.one, one.name);
      } else {
        assert.ok(b!.mark > 0 && b!.space > 0, one.name);
      }
    }
    // **The refusals are named with their counts, because each names a shape still to be read**, and a
    // total alone would let one bucket grow while another shrank. The biggest two are families our own
    // table already has a shape for: 105 biphase, where the bit is which half of the cell carries the
    // carrier, and part of the 142 are the base four families whose cell is one of four lengths.
    assert.deepEqual([...refusals.entries()].sort((a, b) => b[1] - a[1]), [
      ['base four, a cell is one of four lengths', 75],
      ['base sixteen, a cell is one of sixteen lengths', 67],
      ['one interval per bit, so equal bits merge on the wire', 35],
      ['the header is not one mark and one space', 29],
      ['a cell is not one mark and one space', 12],
      ['biphase, and its two cells disagree about their half cell lengths', 3],
      ['no segments', 3],
      ['neither half of the cell is constant', 1],
    ]);
    // 459 read, in the two shapes our table has: 357 frames and 102 biphase. The biphase half was
    // added in section 227's second pass and is what took the reading from 357.
    assert.equal(read, 459);
    assert.equal(frames, 357);
    assert.equal(biphases, 102);
    assert.equal(read + [...refusals.values()].reduce((n, one) => n + one, 0), 684);
  });

test('our own measurements agree with Logitech\'s definitions, thirty four of thirty five',
  { ...skipWithoutIrArchive() }, () => {
    const catalogue = catalogueByRhythm(IR_ARCHIVE!);
    const agreed: string[] = [];
    const absent: string[] = [];
    const disagreed: string[] = [];
    let noReading = 0;
    for (const row of MEASURED) {
      const shape = shapeOf(row);
      if (shape === undefined) { noReading += 1; continue; }
      const hits = familiesOfRhythm(catalogue, row.periodNs, shape).map((one) => one.family);
      if (hits.length === 0) absent.push(row.family);
      else if (hits.includes(row.family)) agreed.push(row.family);
      else disagreed.push(`${row.family} is ${hits.join(' or ')} in the catalogue`);
    }
    // **Nothing disagrees, and that is the assertion that matters.** A disagreement would mean one of
    // the two is wrong about a rhythm, and the rule then is to reproduce it, find an external answer and
    // say which copy was wrong before changing either.
    assert.deepEqual(disagreed, []);
    // 30 of 31 when only frames were read, section 227's first pass; 34 of 35 once biphase was read
    // too, and all four of our biphase rows agree, half cells, polarity and lead in pulse for pulse.
    assert.equal(agreed.length, 34);
    // The one absence is named rather than counted, since a growing absence list is a converter losing
    // ground. `MitsubishiO1 Dual 8 16 Bit` sends two codes inside one frame, `Code0:8` then `Code1:8`
    // with a structural space between them, which is not the one cell per bit shape this reads.
    assert.deepEqual(absent, ['MitsubishiO1 Dual 8 16 Bit']);
    // The two with no reading at all are the base four and long toggle shapes, whose definitions state
    // a digit width and a repeat count that this converter does not read.
    assert.deepEqual(MEASURED.filter((one) => shapeOf(one) === undefined).map((one) => one.family),
                     ['Galaxis 16 Bit Quad Toggle', 'Philips Hurd 16 Bit LongToggle']);
    assert.equal(noReading, 2);
    assert.equal(agreed.length + absent.length + noReading, MEASURED.length);
  });

test('Logitech\'s catalogue names the four rhythms their analyser named wrongly',
  { ...skipWithoutIrArchive() }, () => {
    // **The measurement behind the rename of 31 August 2026.** Every corpus measured entry in the table
    // took its family from Logitech's analyser, section 160 retired that as evidence for a rhythm, and
    // all three of the entries so named were wrong. Their catalogue states the rhythm, so the rhythm
    // identifies the family, and each of these four is unambiguous: exactly one catalogue family holds
    // it.
    const catalogue = catalogueByRhythm(IR_ARCHIVE!);
    for (const [family, heardAs] of [['Toshiba 32 Bit', 'MemorexO1 32 Bit'],
                                     ['Roku 32 Bit 1', 'MemorexO1 32 Bit'],
                                     ['Sharp 48 Bit 2', 'SharpO1 48 Bit'],
                                     ['PanasonicV2 48 Bit', 'SharpO1 48 Bit']]) {
      const row = PROTOCOLS.find((one) => one.family === family);
      assert.ok(row !== undefined, family);
      assert.equal(row.heardAs, heardAs, `${family} records what the analyser called it`);
      const hits = familiesOfRhythm(catalogue, row.periodNs, shapeOf(row)!);
      assert.deepEqual(hits.map((one) => one.family), [family],
                       `${family} is the only catalogue family with this rhythm`);
    }

    // **The two names their analyser used are real catalogue families with other rhythms**, which is
    // what makes this a mis-attribution rather than a vocabulary difference. Their `SharpO1 48 Bit` is a
    // 38.2 kHz protocol and neither row named that was at 38.2 kHz; their `MemorexO1 32 Bit` is the
    // textbook NEC rhythm and the entry under that name held Toshiba's.
    const all = archiveProtocols(IR_ARCHIVE!);
    const sharpO1 = all.find((one) => one.name === 'SharpO1 48 Bit');
    assert.equal(sharpO1?.carrierHz, 38200);
    assert.equal(periodOfCarrier(38200), 26178);
    // Not "no entry is at 38.2 kHz", which is false: `RCAV1 LF 24 Bit` is, and asserting the wider
    // claim is how this test failed on its first run. The claim is about the two renamed rows.
    assert.deepEqual(PROTOCOLS.filter((one) => one.heardAs === 'SharpO1 48 Bit')
                       .map((one) => one.periodNs), [26315, 27472]);
    // No **measured** entry wears that name, and the real family is in the table as a stated entry at
    // its own carrier with Logitech's own durations, which is a better statement of the correction than
    // the name's absence was.
    assert.deepEqual(MEASURED.filter((one) => one.family === 'SharpO1 48 Bit'), []);
    const real = PROTOCOLS.filter((one) => one.family === 'SharpO1 48 Bit');
    assert.equal(real.length, 1);
    assert.deepEqual([real[0]!.source, real[0]!.periodNs, real[0]!.flat, real[0]!.zero, real[0]!.one],
                     ['stated', 26178, 410, 420, 1265]);
    const memorexO1 = rhythmOfDefinition(all.find((one) => one.name === 'MemorexO1 32 Bit')!);
    assert.ok(!('refusal' in memorexO1));
    assert.deepEqual([memorexO1.timings!.header, memorexO1.timings!.flat, memorexO1.timings!.zero,
                      memorexO1.timings!.one],
                     [[9000, 4500], 560, 560, 1690]);
    // And our own `MemorexO1 32 Bit` entry, three records of an arch 8 configuration, is that exactly.
    const ours = PROTOCOLS.find((one) => one.family === 'MemorexO1 32 Bit')!;
    assert.deepEqual(timingsOf(ours), memorexO1.timings!);
    assert.deepEqual([ours.codes, ours.exact, ours.spread], [3, 3, 0]);
  });

test('a rhythm can be ambiguous in the catalogue, and the width is what narrows it',
  { ...skipWithoutIrArchive() }, () => {
    const catalogue = catalogueByRhythm(IR_ARCHIVE!);
    assert.equal(catalogue.size, 423);
    // **17 rhythms are held by more than one family and they must not be collapsed.** Naming one of
    // those by its rhythm is exactly the guess the catalogue lookup replaces, so `familiesOfRhythm`
    // hands back a list and the caller keeps the name it had.
    const shared = [...catalogue.values()].filter((one) => one.length > 1);
    assert.equal(shared.length, 23);

    // The width narrows a rhythm the three Sony families share, which is the case that put a width in
    // the lookup at all: `Sony 12 Bit`, `15` and `20` are one rhythm at 40 kHz.
    const sony = PROTOCOLS.find((one) => one.family === 'Sony 12 Bit')!;
    const timings = timingsOf(sony)!;
    // Six families, not the three the name suggests: the key holds the carrier, the header and the four
    // durations, and Sony's 16, 24 and 40 bit families differ from its 12, 15 and 20 only in how the
    // frame is closed, which is not part of a rhythm.
    const both = familiesOfRhythm(catalogue, sony.periodNs, { timings }).map((one) => one.family);
    assert.deepEqual([...both].sort(), ['Sony 12 Bit', 'Sony 15 Bit', 'Sony 16 Bit', 'Sony 20 Bit',
                                        'Sony 24 Bit', 'Sony 40 Bit']);
    assert.deepEqual(familiesOfRhythm(catalogue, sony.periodNs, { timings }, 12).map((one) => one.family),
                     ['Sony 12 Bit']);
    // A width no family at that rhythm states falls back to the whole list rather than to nothing, so a
    // frame whose wire width differs from its stated keycode width is still found instead of lost.
    assert.equal(familiesOfRhythm(catalogue, sony.periodNs, { timings }, 99).length, 6);
    // And the key itself: a rhythm differing in one duration is a different key, which is what stops a
    // near neighbour being read as a match.
    assert.notEqual(rhythmKey(sony.periodNs, { timings }),
                    rhythmKey(sony.periodNs, { timings: { ...timings, one: timings.one + 1 } }));
  });

test('a stated family can build a code, and cannot build a whole record', () => {
  // **The functional claim behind the 424 rows**: before them the table answered for 37 of Logitech's
  // families, so a device taken from their catalogue could not be written unless it happened to use one
  // of those. This is the check that the rows are usable rather than merely present, and it needs no
  // archive checkout, since the table is committed.
  //
  // One frame family, one whose lead in came from a separate code segment, and one biphase, so all three
  // readings of section 227 are exercised. The durations asserted are Logitech's own, out of their
  // definitions.
  const sharp = pulsesOfStatedCode('SharpO1 48 Bit', 48, 0x123456789ABCn);
  assert.equal(statedProtocol('SharpO1 48 Bit')?.source, 'stated');
  assert.equal(sharp?.length, 98);
  assert.deepEqual(sharp?.slice(0, 4), [{ mark: true, us: 3360 }, { mark: false, us: 1700 },
                                        { mark: true, us: 410 }, { mark: false, us: 420 }]);
  const akai = pulsesOfStatedCode('Akai 32 Bit', 32, 0x20DF10EFn);
  assert.equal(akai?.length, 66);
  assert.deepEqual(akai?.slice(0, 2), [{ mark: true, us: 8850 }, { mark: false, us: 4480 }]);
  const biphase = pulsesOfStatedCode('3B Technology 27 Bit', 27, 0x1234567n);
  assert.equal(biphase?.length, 56);

  // **And none of them can be written**, which is the limit the rows carry with them: a record is a
  // frame plus what follows it, and what follows it is not derivable from the bits, section 152.
  for (const family of ['SharpO1 48 Bit', 'Akai 32 Bit', '3B Technology 27 Bit']) {
    assert.equal(statedProtocol(family)?.tail, undefined, family);
    assert.equal(blockOfStatedCode(`G:${family}:()(0x1234)():3`), undefined, family);
  }
});

test('a biphase frame can carry two same sign intervals in a row, and that is the stored form', () => {
  // **Noticed on a stated family and settled on the measured ones**, which is the order that made it a
  // fact rather than a worry. Their `3B Technology 27 Bit` states a lead in of a 260 mark and a 265
  // space, and its clear bit cell opens on a 250 space, so a code whose first bit is clear emits two
  // spaces in a row. On the wire that is one 515 space, so an appliance cannot tell the difference, and
  // the question was whether a stored record keeps them apart or merges them.
  //
  // It keeps them apart. All four biphase families measured here do the same thing on one bit value or
  // the other, whichever leaves the lead in adjacent to a like half, and every one of them reproduces
  // **every** record it was measured over to the microsecond: 533 records between them. So the emitter's
  // output is the stored form and no merge is wanted.
  const train = pulsesOfStatedCode('3B Technology 27 Bit', 27, 0n)!;
  const adjacent = (pulses: readonly { mark: boolean; us: number }[]) =>
    pulses.filter((one, i) => i > 0 && pulses[i - 1]!.mark === one.mark).length;
  assert.equal(adjacent(train), 1);
  assert.deepEqual([train[1], train[2]], [{ mark: false, us: 265 }, { mark: false, us: 250 }]);

  let records = 0;
  for (const row of MEASURED.filter((one) => one.biphase !== undefined)) {
    // One bit value produces the adjacency and the other does not, decided by the polarity, so both are
    // asserted: a family showing it on neither would mean the lead in reading had changed.
    const clear = adjacent(pulsesOfStatedCode(row.family, 8, 0n)!);
    const set = adjacent(pulsesOfStatedCode(row.family, 8, 0xFFn)!);
    assert.deepEqual([clear, set].sort(), [0, 1], row.family);
    assert.equal(row.exact, row.codes, `${row.family} reproduces every record it was measured over`);
    records += row.codes;
  }
  assert.equal(records, 533);
});
