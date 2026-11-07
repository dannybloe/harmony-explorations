/**
 * Every family of the rhythm table written into the Harmony Touch's code description, and read back the way the
 * Touch's engine reads it, with no remote. `todo-touch.md` 10.1.
 *
 * **What is being claimed.** A Touch is given a code as a family's definition and the code's numbers, and works the
 * durations out itself each time it sends, `reference/architectures/harmony-touch/devices-and-infrared.md`, "How a
 * code becomes durations". `definitionOfRow` writes that definition from a row of our rhythm table, which 9.1 used for
 * every device of a set built from nothing, and a unit has played six families from definitions of ours: Sony 12 Bit,
 * Toshiba 32 Bit, Sharp 48 Bit 2, Sharp 15 Bit 2, Sony 20 Bit and Microsoft 30 Bit. The question is how far that
 * reaches over the table's 681 rows: which rows can be written at all, and whether what is written makes the Touch
 * send what the row says.
 *
 * **The two ends, and why they are independent.** The Touch's end is `enginePacketOf` in `src/harmony-touch/packet.ts`,
 * a reading of the engine's own code: segment by segment, header, cells, trailer and pad, each duration spelled as the
 * engine's words. The row's end is the rhythm table's renderer, `pulsesOfBlock` in `irframe.ts`, over the row's own
 * first transmission and its held repetition. They share no code: the Touch's reading knows no row shape, and the
 * renderer knows no definition. Until 10.1 every comparison of a definition of ours went through the archive's
 * renderer, `waveformOfArchiveCommand`, which reads a definition back into a row shape first, so a row written into a
 * definition and read back by it was a round trip through the same two shapes (`test/touch-definition.test.ts`, which
 * keeps that closure).
 *
 * **A calibration of the Touch's end, which needs the archive.** Logitech's own definitions of the 29 measured rows
 * written, read through `enginePacketOf` and played at the compiler's repeat count, against those rows' blocks, which
 * were measured off configurations Logitech's compiler built: 89367 of the 93422 catalogue codes of those families are
 * alike, and every code that is not is named. That is the packet reader agreeing with an end it owes nothing to, before
 * it is trusted on definitions of ours.
 *
 * **What a press is, and what of it is a reading.** The engine puts three sequences in its packet, start, repeat and
 * finish, and a repeat count; its native program plays them, and how is not checked, "Not checked". The comparison
 * reads a press as the start sequence followed by the repeat sequence as many times as the row's first transmission
 * holds repetitions, the definition's own `PressMinimumRepeats` where the row states the compiler's count and one where
 * it does not, which is how the row's blocks are built; and a held key as the repeat sequence. So "alike" says the
 * packet holds the row's durations in that arrangement, not that the lamp was seen to send them.
 *
 * **How the codes were chosen**, so every field of a row is exercised: per definition, one code per symbol with every
 * digit that symbol (two codes for a two cell family, four or sixteen for a cell table, so every cell goes out at every
 * place), the two bit alternations, and four values from a fixed linear congruential sequence, every value at its own
 * segment's width and each place of a several value code its own value. Each code is compared as a press and as a
 * held repetition, so the start group, the repeat group and the pads of both are exercised. **No toggle is exercised,
 * because no row states one** and no definition of ours carries a toggle bit, asserted below, with the packet the same
 * under either toggle state; and no release, because no row states one either.
 *
 * **The engine's spelling of a duration is the one difference that is the Touch's and not ours.** The engine writes a
 * duration under 30 microseconds as 30, and one over 32767 as words of 32767 and the rest, the rest raised to 30 when
 * shorter. The rhythm table's renderer does neither. So a code that differs is held a second time against the row's
 * durations spelled the engine's way, and counted as "alike under the engine's spelling" where that makes it the same:
 * a difference the Touch makes from Logitech's definition of the family too, wherever theirs states the same short
 * duration. Anything else is a difference, reported with its first differing duration.
 *
 * **Rows the writer refuses, and whether the Touch's description could hold them.** A refusal is either a gap of our
 * own, the writer's or the row's, or a shape the description cannot hold. The engine's reading, `packet.ts` and the
 * Lua it was read from, holds any sequence of segments each with a fixed header and trailer, a cell per symbol out of
 * two, four or sixteen, a toggle bit and a padded length, and literal runs. Logitech's own definition of every refused
 * family is written in that description, and with the archive present the test reads each of their catalogue codes
 * through `enginePacketOf`: all of 103 families' codes make a packet, and 27 of the 1507 codes of the 104th, `Galaxis 16
 * Bit Quad Toggle`, carry a second `0x` in a value, which the engine cannot read as digits. So no refusal is the
 * description's: every one is a gap of ours, and which kind is said per reason.
 *
 * **Sources checked before the work**: the engine's definition reader and packet builder in the lab's decompiled image
 * 4.15.330 (`model/protocol.lua`, `core/irmanager.lua`, `core/utility.lua`); the reference's Touch pages and
 * `reference/infrared/families.md` and `frames.md`; the closure of `test/touch-definition.test.ts` and 9.1's
 * `waveformClosure`. Logitech's client was not read for this: a Touch is given the catalogue's definitions unchanged and
 * builds every duration on the remote, "Built at the moment of sending", so the client holds nothing of the rendering.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. No other remote reads a definition.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import {
  archiveProtocols, frameSlots, keyCodeOfStatedCode, roundedPeriodOfCarrier, segmentRefs, statedCodeOfDefinition,
  withStatedWidths, withToggleCleared, type ArchiveKeyCode, type ArchiveProtocol,
} from '../src/archive.ts';
import { mergedIntervals, pulsesOfBlock, type BlockTail, type FrameShape, type Pulse } from '../src/irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../src/protocols.ts';
import { biphaseOf, cellsOf, timingsOf, type StatedCode, type StatedItem } from '../src/stated.ts';
import {
  carrierOfPeriod, definitionOfRow, isDefinitionRefusal, keyCodeText, storedMicrosecondOf,
} from '../src/harmony-touch/definition.ts';
import type { IrProtocol } from '../src/harmony-touch/documents.ts';
import { engineKeyCodeGroups, enginePacketOf, engineSegmentId, engineWordsOf, type TouchPacket } from '../src/harmony-touch/packet.ts';

// ---------------------------------------------------------------------------------------------------
// The two ends
// ---------------------------------------------------------------------------------------------------

/** The families a unit has played from definitions of ours, `devices-and-infrared.md`, "Built from nothing". */
const PLAYED = ['Sony 12 Bit', 'Toshiba 32 Bit', 'Sharp 48 Bit 2', 'Sharp 15 Bit 2', 'Sony 20 Bit', 'Microsoft 30 Bit'];

/**
 * A row's shape, the six of `reference/infrared/frames.md`, with the pulse timing shape split by which half of a cell
 * carries the bit, the space (pulse distance) or the mark (pulse width), since the writer spells the two differently.
 */
function shapeOf(row: StatedProtocol): string {
  if (row.sections !== undefined) return 'sections';
  if (row.longToggle !== undefined) return 'long toggle';
  if (row.quad !== undefined) return 'quaternary';
  if (row.cells !== undefined) return 'cell table';
  if (row.biphase !== undefined) return 'biphase';
  return row.carries === 'mark' ? 'pulse width' : 'pulse distance';
}

const evidenceOf = (row: StatedProtocol): 'measured' | 'stated' => (row.source === 'stated' ? 'stated' : 'measured');

/** The encoded segments a definition's groups send, in order: each one's width in bits and bits per digit. */
function places(definition: IrProtocol): { bits: number; perDigit: number }[] {
  const segments = new Map((definition.IRSegments ?? []).map((one) => [one.Name, one]));
  return [...(definition.KeyCode?.Start ?? []), ...(definition.KeyCode?.Repeat ?? [])]
    .filter((ref) => ref.SegmentType === 1)
    .map((ref) => {
      const p = segments.get(ref.SegmentName)!.Payload!;
      const perDigit = p.EncodingType === 2 ? 2 : p.EncodingType === 3 ? 4 : 1;
      return { bits: p.NumberOfBits! * perDigit, perDigit };
    });
}

/** A code of the family stating these values at these widths, in the shape `statedCode` gives. */
function codeOf(family: string, widths: readonly number[], values: readonly bigint[]): StatedCode {
  const frames = values.map((value, index) => ({ value, bits: widths[index]!, index }));
  const items: StatedItem[] = frames.map((frame) => ({ kind: 'frame', frame }));
  return { family, items, frames, words: [], bits: widths[0]!, groups: [[], items, []] };
}

/** The codes a definition is held to, as the header says: one per symbol, the two alternations, four fixed values. */
function codesFor(definition: IrProtocol): bigint[][] {
  const at = places(definition);
  const constant = (bits: number, perDigit: number, symbol: number) => {
    let v = 0n;
    for (let i = 0; i < bits / perDigit; i += 1) v = (v << BigInt(perDigit)) | BigInt(symbol % (2 ** perDigit));
    return v;
  };
  const alternating = (bits: number, first: 0 | 1) => {
    let v = 0n;
    for (let i = 0; i < bits; i += 1) v = (v << 1n) | BigInt((i + first) % 2);
    return v;
  };
  let seed = 0x2545F491n;
  const random = (bits: number) => {
    let v = 0n;
    for (let i = 0; i < bits; i += 16) {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
      v = (v << 16n) | (seed >> 48n);
    }
    return v & ((1n << BigInt(bits)) - 1n);
  };
  const symbols = Math.max(2, ...at.map((p) => 2 ** p.perDigit));
  const out: bigint[][] = [];
  for (let s = 0; s < symbols; s += 1) out.push(at.map((p) => constant(p.bits, p.perDigit, s)));
  out.push(at.map((p) => alternating(p.bits, 0)), at.map((p) => alternating(p.bits, 1)));
  for (let k = 0; k < 4; k += 1) out.push(at.map((p) => random(p.bits)));
  return out;
}

/** A row's rhythms as the renderer takes them. */
function shapeOfRow(row: StatedProtocol): FrameShape {
  const t = timingsOf(row);
  const b = biphaseOf(row);
  const c = cellsOf(row);
  return {
    ...(t === undefined ? {} : { timings: t }), ...(b === undefined ? {} : { biphase: b }),
    ...(c === undefined ? {} : { cells: c }), ...(row.also === undefined ? {} : { also: row.also }),
  };
}

/**
 * A row's block for some frames as the signal, unmerged: the rhythm table's renderer, with the stored form's microsecond
 * taken off the last duration where the block carries it, `storedMicrosecondOf`, and dropped if that leaves nothing.
 * Closing words of zero are dropped first; other durations of zero are kept, since a definition can state one inside
 * a frame, the three `QE Space` rows' lead in among them, and the engine sends it as 30.
 * Undefined where the renderer declines the value.
 */
function rowSignal(row: StatedProtocol, frames: readonly { readonly bits: number; readonly value: bigint }[], block: BlockTail): Pulse[] | undefined {
  let pulses: Pulse[];
  try { pulses = pulsesOfBlock(shapeOfRow(row), frames, block); } catch { return undefined; }
  // A block's closing zero is the stored form's, a word that closes the record, and no definition states it.
  let end = pulses.length;
  while (end > 0 && pulses[end - 1]!.us === 0) end -= 1;
  pulses = pulses.slice(0, end);
  if (storedMicrosecondOf(block) === 1 && end > 0) {
    const last = pulses[end - 1]!;
    pulses = [...pulses.slice(0, end - 1), ...(last.us > 1 ? [{ mark: last.mark, us: last.us - 1 }] : [])];
  }
  return pulses;
}

/** Durations as the engine spells them, then joined: what the Touch would send for the row's own durations. */
const spelledAsTheEngine = (pulses: readonly Pulse[]): Pulse[] =>
  mergedIntervals(pulses.flatMap((p) => engineWordsOf(p.us, p.mark)));

/** A press as the comparison reads one: the start sequence, then the repeat sequence `repeats` times. */
const pressOf = (packet: TouchPacket, repeats: number): Pulse[] =>
  mergedIntervals([...packet.start, ...Array.from({ length: repeats }, () => packet.repeat).flat()]);

const same = (a: readonly Pulse[], b: readonly Pulse[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The first place two trains part, as text, for a difference's report. */
function firstDifference(touch: readonly Pulse[], row: readonly Pulse[]): string {
  const show = (p: Pulse | undefined) => (p === undefined ? 'nothing' : `${p.mark ? 'mark' : 'space'} ${p.us}`);
  for (let i = 0; i < Math.max(touch.length, row.length); i += 1) {
    const a = touch[i];
    const b = row[i];
    if (a?.mark !== b?.mark || a?.us !== b?.us) return `duration ${i}: the Touch ${show(a)}, the row ${show(b)}`;
  }
  return '';
}

type Verdict = 'alike' | 'alike under the engine\'s spelling' | 'different' | 'the row\'s renderer declines' | 'not written into the definition' | 'no packet';

/** One code through both ends. */
function compare(row: StatedProtocol, definition: IrProtocol, values: readonly bigint[]): { verdict: Verdict; first?: string } {
  const at = places(definition);
  const code = codeOf(row.family, at.map((p) => p.bits), values);
  const keyCode = keyCodeText(code, definition);
  if (typeof keyCode !== 'string') return { verdict: 'not written into the definition' };
  const packet = enginePacketOf(definition, keyCode);
  if ('refusal' in packet) return { verdict: 'no packet' };
  const press = rowSignal(row, code.frames, (row.tail ?? row.opening)!);
  const held = rowSignal(row, code.frames, row.held!);
  // **Both renderers solve a pad and decline a value whose frame overruns it**; the Touch pads only when the length is
  // longer and sends the frame whole, so there is nothing on the row's side to compare.
  if (press === undefined || held === undefined) return { verdict: 'the row\'s renderer declines' };
  const touchPress = pressOf(packet, definition.PressMinimumRepeats ?? 1);
  const touchHeld = mergedIntervals([...packet.repeat]);
  if (packet.finish.length > 0) return { verdict: 'different', first: 'a finish sequence the row does not state' };
  if (same(touchPress, mergedIntervals(press)) && same(touchHeld, mergedIntervals(held))) return { verdict: 'alike' };
  if (same(touchPress, spelledAsTheEngine(press)) && same(touchHeld, spelledAsTheEngine(held))) {
    return { verdict: 'alike under the engine\'s spelling' };
  }
  const first = firstDifference(touchPress, mergedIntervals(press)) || `held, ${firstDifference(touchHeld, mergedIntervals(held))}`;
  return { verdict: 'different', first };
}

/** The width a test states for a row the family's name gives none: twelve bits, or six cells of a cell table. */
const statedWidth = (row: StatedProtocol): number => (row.cells === undefined ? 12 : row.cells.bits * 6);

interface RowResult {
  readonly row: StatedProtocol;
  /** The writer's refusal at the name's widths, as 9.1 calls it; undefined where it wrote the row. */
  readonly refusal: string | undefined;
  /** Written at the name's widths, or, for a row refused for a width alone, at a width the test states. */
  readonly writtenAt: 'name' | 'stated' | undefined;
  readonly codes: readonly { verdict: Verdict; first?: string }[];
}

/** Every row, written the way 9.1 writes it and each written one compared. Computed once for the tests below. */
const RESULTS: readonly RowResult[] = PROTOCOLS.map((row): RowResult => {
  const atName = definitionOfRow(row, 1);
  let definition: IrProtocol | undefined;
  let writtenAt: RowResult['writtenAt'];
  const refusal = isDefinitionRefusal(atName) ? atName.refusal : undefined;
  if (!isDefinitionRefusal(atName)) { definition = atName; writtenAt = 'name'; } else if (/width/.test(atName.refusal)) {
    const again = definitionOfRow(row, 1, { bits: statedWidth(row) });
    if (!isDefinitionRefusal(again)) { definition = again; writtenAt = 'stated'; }
  }
  const codes = definition === undefined ? [] : codesFor(definition).map((values) => compare(row, definition, values));
  return { row, refusal, writtenAt, codes };
});

const countBy = <T>(xs: readonly T[], key: (x: T) => string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const x of xs) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return out;
};

// ---------------------------------------------------------------------------------------------------
// The engine's reading, on definitions small enough to check by hand
// ---------------------------------------------------------------------------------------------------

const atom = (us: number) => ({ Type: us > 0 ? 1 : 0, Value: Math.abs(us), MinValue: null, MaxValue: null });

/** A definition of the test's own: a header, two cells, a trailer and a pad, plus whatever is passed. */
function handmade(over: Partial<IrProtocol> = {}, payload: Record<string, unknown> = {}): IrProtocol {
  return {
    __type: 'IrProtocol', 'Id-': 1, Name: 'Test 4 Bit', CarrierFrequency: 38000, Attributes: [], Flags: [],
    HoldDelay: null, HoldMinimumRepeats: null, KeyCode: { Start: [], Repeat: [], Finish: [] },
    IRSegments: [{
      Name: 'Test 4 Bit', Header: [atom(1000), atom(-500)], Trailer: [atom(100)], TotalLength: 20000,
      Payload: {
        EncodingType: 0, NumberOfBits: 4, ToggleBit: null,
        Encodings: [{ BitType: 0, Atoms: [atom(100), atom(-200)] }, { BitType: 1, Atoms: [atom(100), atom(-400)] }],
        ...payload,
      },
    }],
    CodeSegments: [{ Name: 'Test 4 Bit KeyCodeRepeat', Atoms: [atom(1000), atom(-40000)], Header: [], Trailer: [], TotalLength: 0, Payload: null }],
    ...over,
  };
}

const train = (...ws: number[]): Pulse[] => ws.map((w) => ({ mark: w > 0, us: Math.abs(w) }));

test('the engine spells a duration as words of 32767 and the rest, the rest raised to 30', () => {
  assert.deepStrictEqual(engineWordsOf(500, true), train(500));
  assert.deepStrictEqual(engineWordsOf(12, true), train(30));
  assert.deepStrictEqual(engineWordsOf(0, false), train(-30));
  assert.deepStrictEqual(engineWordsOf(70000, false), train(-32767, -32767, -4466));
  // The floor is on the rest and not on the duration: 32780 goes out three microseconds long.
  assert.deepStrictEqual(engineWordsOf(32780, false), train(-32767, -30));
});

test('a key code\'s groups are its bracket pairs, split at underscores with empty parts dropped', () => {
  assert.deepStrictEqual(engineKeyCodeGroups('G:Toshiba 32 Bit:(0x20DF9E61)(Repeat)():3'), [['0x20DF9E61'], ['Repeat'], []]);
  assert.deepStrictEqual(engineKeyCodeGroups('G:X:()(0x1__1x2_)():3'), [[], ['0x1', '1x2'], []]);
  assert.deepStrictEqual(engineKeyCodeGroups('no brackets'), [[], [], []]);
});

test('a segment\'s id is read out of its name as the engine reads it, with no trim and no check of the family\'s prefix', () => {
  assert.strictEqual(engineSegmentId('NEC 32 Bit', 'NEC 32 Bit'), '0');
  assert.strictEqual(engineSegmentId('NEC 32 Bit', 'NEC 32 Bit KeyCodeRepeat'), 'Repeat');
  assert.strictEqual(engineSegmentId('RCAV1 24 Bit 2', 'RCAV1 24 Bit 2 1'), '1');
  // No prefix check and no trim, where `segmentRefs` checks the one and does the other.
  assert.strictEqual(engineSegmentId('NEC', 'Other 1'), 'r 1');
  assert.strictEqual(engineSegmentId('NEC', 'NEC KeyCode Repeat'), ' Repeat');
});

test('an encoded segment is its header, a cell per bit, its trailer and a pad to its length; a code segment its atoms', () => {
  const p = enginePacketOf(handmade(), 'G:Test 4 Bit:(0xA)(Repeat)():3') as TouchPacket;
  // 1000 + 500, four cells for 1010 (500, 300, 500, 300) and the trailer's 100 make 3200, padded to 20000 with 16800.
  assert.deepStrictEqual(p.start, train(1000, -500, 100, -400, 100, -200, 100, -400, 100, -200, 100, -16800));
  // A code segment over 32767 is chunked when the definition is loaded, and padded nowhere since its length is 0.
  assert.deepStrictEqual(p.repeat, train(1000, -32767, -7233));
  assert.deepStrictEqual(p.finish, []);
  assert.strictEqual(p.periodNs, roundedPeriodOfCarrier(38000));
});

test('a value is padded with zeros on the left, cut from the left for a two cell family, and its toggle bit replaced', () => {
  const short = enginePacketOf(handmade(), 'G:Test 4 Bit:()(0x1)():3') as TouchPacket;
  const wide = enginePacketOf(handmade(), 'G:Test 4 Bit:()(0xF1)():3') as TouchPacket;
  // 0x1 at four bits is 0001, and 0xF1 cut to four bits is the same 0001.
  assert.deepStrictEqual(short.repeat, wide.repeat);
  const cells = (p: TouchPacket) => p.repeat.slice(2, 10).filter((w) => !w.mark).map((w) => w.us);
  assert.deepStrictEqual(cells(short), [200, 200, 200, 400]);
  const toggled = handmade({}, { ToggleBit: 0 });
  assert.deepStrictEqual(cells(enginePacketOf(toggled, 'G:Test 4 Bit:()(0x1)():3', { toggle: 1 }) as TouchPacket), [400, 200, 200, 400]);
  assert.deepStrictEqual(cells(enginePacketOf(toggled, 'G:Test 4 Bit:()(0x9)():3', { toggle: 0 }) as TouchPacket), [200, 200, 200, 400]);
});

test('a cell table value is one symbol per digit and is not cut, and a symbol with no cell is refused', () => {
  const quad = handmade({}, {
    EncodingType: 2, NumberOfBits: 2,
    Encodings: [0, 1, 2, 3].map((s) => ({ BitType: s, Atoms: [atom(100), atom(-(200 + 100 * s))] })),
  });
  const spaces = (p: TouchPacket) => p.repeat.filter((w) => !w.mark).map((w) => w.us).slice(1, -1);
  assert.deepStrictEqual(spaces(enginePacketOf(quad, 'G:Test 4 Bit:()(0x3)():3') as TouchPacket), [200, 500]);
  // Three digits where the segment states two: all three go out.
  assert.deepStrictEqual(spaces(enginePacketOf(quad, 'G:Test 4 Bit:()(0x123)():3') as TouchPacket), [300, 400, 500]);
  assert.deepStrictEqual(enginePacketOf(quad, 'G:Test 4 Bit:()(0x4)():3'), { refusal: 'a symbol the segment has no cell for' });
  assert.deepStrictEqual(enginePacketOf(handmade(), 'G:Test 4 Bit:()(2x1)():3'), { refusal: 'the code names a segment the definition does not hold' });
});

// ---------------------------------------------------------------------------------------------------
// Every row of the table
// ---------------------------------------------------------------------------------------------------

test('every row of the table is written as 9.1 writes it or refused, 577 written and 104 refused, every refusal a gap of ours', () => {
  assert.strictEqual(RESULTS.length, 681);
  const written = RESULTS.filter((r) => r.refusal === undefined);
  assert.strictEqual(written.length, 577);
  assert.deepStrictEqual(countBy(written, (r) => evidenceOf(r.row)), { measured: 29, stated: 548 });
  // **Which kind of gap each refusal is.** The width refusals are the writer's: the family's name states no width the
  // writer can read, and the row carries none, while a caller who knows the width writes the row, below. The other
  // two are the row's: it was measured as a frame with nothing after it, or as a whole record of a shape the writer has
  // no segment spelling for. All eight of those are measured rows, and none is the description's, see the archive test.
  const refused = RESULTS.filter((r) => r.refusal !== undefined);
  assert.deepStrictEqual(countBy(refused, (r) => `${r.refusal} / ${evidenceOf(r.row)}`), {
    'the family\'s name states no width for its values and none was given / stated': 62,
    'a width that is not a whole number of cells / stated': 34,
    'the row states its frame and not its repetition, so no trailer and no gap / measured': 5,
    'a whole record shape, which no segment of a definition states / measured': 3,
  });
  assert.deepStrictEqual(refused.filter((r) => !/width/.test(r.refusal!)).map((r) => r.row.family).sort(), [
    'Galaxis 16 Bit Quad Toggle', 'Kreatel IP 22 Bit', 'MitsubishiO1 Dual 8 16 Bit', 'Panasonic 16 Bit',
    'Philips Hurd 16 Bit LongToggle', 'Roku 32 Bit 1', 'Samsung 38 Bit', 'Sharp 48 Bit',
  ]);
  // Every one of the 96 refused for a width alone is written at a width the test states.
  assert.strictEqual(RESULTS.filter((r) => r.writtenAt === 'stated').length, 96);
});

test('every definition of ours names its segments as the engine reads them, states no toggle bit, and sends the same under either toggle state', () => {
  let definitions = 0;
  const misnamed: string[] = [];
  const toggles: string[] = [];
  for (const r of RESULTS) {
    if (r.writtenAt === undefined) continue;
    const d = definitionOfRow(r.row, 1, r.writtenAt === 'stated' ? { bits: statedWidth(r.row) } : {}) as IrProtocol;
    definitions += 1;
    const view: ArchiveProtocol = {
      name: d.Name, carrierHz: 0, definition: d, keycodeFields: null, logitechProtocolId: null, standardProtocol: null,
      pressMinimumRepeats: null, irp: null,
    };
    for (const [id, ref] of segmentRefs(view)) if (engineSegmentId(d.Name, ref.SegmentName!) !== id) misnamed.push(r.row.family);
    const ids = [...(d.IRSegments ?? []), ...(d.CodeSegments ?? [])].map((s) => engineSegmentId(d.Name, s.Name!));
    if (new Set(ids).size !== ids.length) misnamed.push(`${r.row.family}: two segments under one id`);
    if ((d.IRSegments ?? []).some((s) => s.Payload?.ToggleBit !== null)) toggles.push(r.row.family);
    const values = codesFor(d)[codesFor(d).length - 1]!;
    const keyCode = keyCodeText(codeOf(r.row.family, places(d).map((p) => p.bits), values), d) as string;
    if (JSON.stringify(enginePacketOf(d, keyCode, { toggle: 0 })) !== JSON.stringify(enginePacketOf(d, keyCode, { toggle: 1 }))) toggles.push(r.row.family);
  }
  assert.strictEqual(definitions, 673);
  assert.deepStrictEqual(misnamed, []);
  assert.deepStrictEqual(toggles, []);
});

test('the carrier a definition of ours states gives the Touch the row\'s period on 285 rows of 681 and one nanosecond more on 396', () => {
  // **Not a difference of ours.** The row's period is a carrier truncated, as a compiled configuration stores it, and
  // the Touch rounds the carrier it is given, so the two part by a nanosecond wherever the fraction is a half or more:
  // the Touch does the same with Logitech's definition at that carrier. The durations compared below do not depend on it.
  const off = PROTOCOLS.map((row) => roundedPeriodOfCarrier(carrierOfPeriod(row.periodNs)!) - row.periodNs);
  assert.deepStrictEqual(countBy(off, String), { 0: 285, 1: 396 });
});

test('every row written renders alike through the Touch\'s reading and the rhythm table\'s renderer, but for the engine\'s spelling of a duration', () => {
  const at = (writtenAt: 'name' | 'stated') => RESULTS.filter((r) => r.writtenAt === writtenAt).flatMap((r) => r.codes);
  // At the name's widths, 9.1's way.
  assert.deepStrictEqual(countBy(at('name'), (c) => c.verdict), {
    alike: 4773, 'alike under the engine\'s spelling': 64, 'the row\'s renderer declines': 3,
  });
  // At a width the test states, for the 96 the name gives none.
  assert.deepStrictEqual(countBy(at('stated'), (c) => c.verdict), {
    alike: 1243, 'alike under the engine\'s spelling': 375, 'the row\'s renderer declines': 28,
  });
  const families = (verdict: Verdict, writtenAt: 'name' | 'stated') => RESULTS
    .filter((r) => r.writtenAt === writtenAt && r.codes.some((c) => c.verdict === verdict)).map((r) => r.row.family);
  // The eight families whose definitions state a mark under 30 microseconds, `test/touch-definition.test.ts`: the Touch
  // sends 30 from ours and from Logitech's alike.
  assert.deepStrictEqual(families('alike under the engine\'s spelling', 'name'), [
    'AMC 5 Bit', 'Burmester 11 Bit Toggle', 'Corona 48 Bit', 'Nokia 11 Bit', 'Quad 5 Bit', 'Revox 11 Bit', 'Revox 11 Bit 2', 'Verosol 5 Bit',
  ]);
  // At a stated width: the Quantum Electronics test families, whose definitions state durations under 30 microseconds,
  // a zero inside a lead in among them, as Logitech's state them, and three more, `ILUV 27 Bit Hex` by a pad's rest
  // after 32767 raised to 30.
  const spelled = families('alike under the engine\'s spelling', 'stated');
  assert.strictEqual(spelled.filter((f) => f.startsWith('QE ')).length, 49);
  assert.deepStrictEqual(spelled.filter((f) => !f.startsWith('QE ')), ['AMC 17 Bit Quad', 'Ferguson 9 Bit Toggle', 'ILUV 27 Bit Hex']);
  // **Declined, one code each at the name's widths**: the all ones value, whose frame overruns the family's padded
  // length, which both of the codec's renderers decline and the Touch sends whole with no pad. At a stated width, the
  // same for two families at a width that is not theirs, and two that state a cell with no intervals, section 233,
  // which the renderer declines and the Touch sends as nothing.
  assert.deepStrictEqual(families('the row\'s renderer declines', 'name'), ['Hunter Douglas 3 Bit', 'JVCV1 48 Bit', 'NEC 32 Bit']);
  assert.deepStrictEqual(families('the row\'s renderer declines', 'stated'), ['DVI Link 5 Bit Quad', 'Ferguson 9 Bit Toggle', 'iMonFixed2', 'Play 25 Bit']);
  // **No difference that is not the engine's spelling**, and if one appears its first duration is in the message.
  const different = RESULTS.flatMap((r) => r.codes.filter((c) => c.verdict === 'different').map((c) => `${r.row.family}: ${c.first}`));
  assert.deepStrictEqual(different, []);
});

test('a wrong field shows as different and is not absorbed as the engine\'s spelling', () => {
  const row = PROTOCOLS.find((one) => one.family === 'Sony 12 Bit')!;
  const d = definitionOfRow(row, 1) as IrProtocol;
  const segment = d.IRSegments![0]!;
  const encodings = segment.Payload!.Encodings!;
  // The set cell's mark, 1200, one microsecond longer.
  const moved: IrProtocol = {
    ...d,
    IRSegments: [{
      ...segment,
      Payload: { ...segment.Payload!, Encodings: [encodings[0]!, { ...encodings[1]!, Atoms: [encodings[1]!.Atoms![0]!, { ...encodings[1]!.Atoms![1]!, Value: 1201 }] }] },
    }],
  };
  // The frame's padded length one microsecond short.
  const short: IrProtocol = { ...d, IRSegments: [{ ...segment, TotalLength: segment.TotalLength! - 1 }] };
  const verdicts = (definition: IrProtocol) => codesFor(d).map((values) => compare(row, definition, values).verdict);
  assert.deepStrictEqual(countBy(verdicts(d), String), { alike: 8 });
  // Every code but the one with no set bit sends the moved cell.
  assert.deepStrictEqual(countBy(verdicts(moved), String), { alike: 1, different: 7 });
  assert.deepStrictEqual(countBy(verdicts(short), String), { different: 8 });
  assert.strictEqual(compare(row, moved, [0xFFFn]).first, 'duration 2: the Touch mark 1201, the row mark 1200');
});

test('by shape and evidence: which rows are written and alike, and which shapes the six families played on a unit cover', () => {
  const key = (r: RowResult) => `${shapeOf(r.row)}${r.row.also === undefined ? '' : ', several rhythms'} / ${evidenceOf(r.row)}`;
  /** Per group: rows, written at the name's widths, written at a stated width, refused; then of the written rows,
   * those whose every code compared is alike, and those with a code alike only under the engine's spelling. */
  const table: Record<string, number[]> = {};
  for (const r of RESULTS) {
    const t = (table[key(r)] ??= [0, 0, 0, 0, 0, 0]);
    t[0]! += 1;
    t[r.writtenAt === 'name' ? 1 : r.writtenAt === 'stated' ? 2 : 3]! += 1;
    if (r.writtenAt === undefined) continue;
    const verdicts = new Set(r.codes.map((c) => c.verdict));
    assert.ok(!verdicts.has('different'), r.row.family);
    t[verdicts.has('alike under the engine\'s spelling') ? 5 : 4]! += 1;
  }
  assert.deepStrictEqual(table, {
    //                                           rows  name  stated refused alike spelled
    'pulse distance / measured':                 [27,   23,    0,     4,    23,    0],
    'pulse distance / stated':                   [302, 300,    2,     0,   295,    7],
    'pulse distance, several rhythms / stated':  [10,    9,    1,     0,    10,    0],
    'pulse width / measured':                    [3,     3,    0,     0,     3,    0],
    'pulse width / stated':                      [14,   14,    0,     0,    14,    0],
    'pulse width, several rhythms / stated':     [1,     1,    0,     0,     1,    0],
    'biphase / measured':                        [4,     3,    0,     1,     3,    0],
    'biphase / stated':                          [89,   88,    1,     0,    89,    0],
    'biphase, several rhythms / stated':         [8,     7,    1,     0,     8,    0],
    'cell table / stated':                       [187, 109,   78,     0,   136,   51],
    'cell table, several rhythms / stated':      [33,   20,   13,     0,    31,    2],
    'quaternary / measured':                     [1,     0,    0,     1,     0,    0],
    'long toggle / measured':                    [1,     0,    0,     1,     0,    0],
    'sections / measured':                       [1,     0,    0,     1,     0,    0],
  });
  // **What the unit has played covers three groups**: pulse distance, pulse width and biphase, each of one rhythm.
  const played = new Set(PLAYED.map((family) => {
    const row = PROTOCOLS.find((one) => one.family === family)!;
    return `${shapeOf(row)}${row.also === undefined ? '' : ', several rhythms'}`;
  }));
  assert.deepStrictEqual([...played].sort(), ['biphase', 'pulse distance', 'pulse width']);
  // **What no played family covers**, which is what a bench run would still need, one family per shape: every cell
  // table row, every row of several rhythms whatever its shape, and the three measured shapes the writer refuses.
  const uncovered = [...new Set(RESULTS.map((r) => `${shapeOf(r.row)}${r.row.also === undefined ? '' : ', several rhythms'}`))]
    .filter((shape) => !played.has(shape)).sort();
  assert.deepStrictEqual(uncovered, [
    'biphase, several rhythms', 'cell table', 'cell table, several rhythms', 'long toggle', 'pulse distance, several rhythms',
    'pulse width, several rhythms', 'quaternary', 'sections',
  ]);
  const writtenUncovered = RESULTS.filter((r) => r.writtenAt !== undefined && !played.has(`${shapeOf(r.row)}${r.row.also === undefined ? '' : ', several rhythms'}`));
  assert.deepStrictEqual(countBy(writtenUncovered, (r) => r.writtenAt!), { name: 146, stated: 93 });
});

// ---------------------------------------------------------------------------------------------------
// Against Logitech's own definitions, which needs the archive
// ---------------------------------------------------------------------------------------------------

/** Every distinct key code the archive's codesets state, by family, read once for the tests below. */
let archiveCodesRead: Map<string, Set<string>> | undefined;
function archiveCodes(): Map<string, Set<string>> {
  if (archiveCodesRead !== undefined) return archiveCodesRead;
  const out = new Map<string, Set<string>>();
  const directory = join(IR_ARCHIVE!, 'codesets');
  for (const bucket of readdirSync(directory)) {
    for (const file of readdirSync(join(directory, bucket))) {
      const text = readFileSync(join(directory, bucket, file), 'utf8');
      for (const match of text.matchAll(/"keycode":\s*"(G:([^:"]+):[^"]*)"/g)) {
        let set = out.get(match[2]!);
        if (set === undefined) out.set(match[2]!, set = new Set());
        set.add(match[1]!);
      }
    }
  }
  return archiveCodesRead = out;
}

test('every refused family is held by the Touch\'s description: Logitech\'s definition of it makes a packet for every code of 103 families, and all but 27 malformed codes of the 104th', { ...skipWithoutIrArchive() }, () => {
  const theirs = new Map(archiveProtocols(IR_ARCHIVE!).map((p) => [p.name, p]));
  const codes = archiveCodes();
  const refused = RESULTS.filter((r) => r.refusal !== undefined);
  const outcome: Record<string, number> = {};
  const whole: string[] = [];
  for (const r of refused) {
    const p = theirs.get(r.row.family)!;
    let made = 0;
    const all = [...(codes.get(r.row.family) ?? [])];
    for (const keyCode of all) {
      const packet = enginePacketOf(p.definition as unknown as IrProtocol, keyCode);
      const k = 'refusal' in packet ? packet.refusal : 'a packet';
      outcome[k] = (outcome[k] ?? 0) + 1;
      if (!('refusal' in packet)) made += 1;
    }
    if (all.length > 0 && made === all.length) whole.push(r.row.family);
  }
  assert.strictEqual(refused.length, 104);
  assert.strictEqual(whole.length, 103);
  // `Galaxis 16 Bit Quad Toggle`: 27 of its catalogue codes carry a second `0x` inside a value, which the engine
  // cannot read as a digit; its other 1480 make a packet.
  assert.deepStrictEqual(refused.map((r) => r.row.family).filter((f) => !whole.includes(f)), ['Galaxis 16 Bit Quad Toggle']);
  assert.deepStrictEqual(outcome, { 'a packet': 8919, 'a digit that is not hexadecimal': 27 });
  // How many of the catalogue's codes the refusals keep from a Touch, by reason, against those of the rows written.
  const held = (rs: readonly RowResult[]) => rs.reduce((n, r) => n + (codes.get(r.row.family)?.size ?? 0), 0);
  assert.strictEqual(held(RESULTS.filter((r) => r.refusal === undefined)), 142931);
  const byReason: Record<string, number> = {};
  for (const r of refused) byReason[r.refusal!] = (byReason[r.refusal!] ?? 0) + (codes.get(r.row.family)?.size ?? 0);
  assert.deepStrictEqual(byReason, {
    'the family\'s name states no width for its values and none was given': 1720,
    'a width that is not a whole number of cells': 2175,
    'the row states its frame and not its repetition, so no trailer and no gap': 1441,
    'a whole record shape, which no segment of a definition states': 3610,
  });
});

/**
 * **The calibration of the Touch's end.** Logitech's definition of each measured row written, read through
 * `enginePacketOf` at toggle state 0 and played at the compiler's repeat count, the one our definition states, against
 * that row's blocks, which were measured off configurations Logitech's compiler built from the same definitions. The
 * row's side clears the toggle bit, `withToggleCleared`, which is what the engine's first send does. A code whose
 * groups name other segments than the definition's own default is a structure the row's blocks do not state, and is
 * counted apart.
 */
test('Logitech\'s definitions read as the engine reads them send the 29 measured rows\' blocks on 89367 of the 93422 catalogue codes, and every other code is named', { ...skipWithoutIrArchive() }, () => {
  const theirs = new Map(archiveProtocols(IR_ARCHIVE!).map((p) => [p.name, p]));
  const codes = archiveCodes();
  const measured = RESULTS.filter((r) => r.writtenAt === 'name' && evidenceOf(r.row) === 'measured');
  assert.strictEqual(measured.length, 29);
  const outcome: Record<string, number> = {};
  const differing = new Set<string>();
  const names = (k: ArchiveKeyCode | null | undefined) => JSON.stringify(
    [k?.Start, k?.Repeat, k?.Finish].map((list) => (list ?? []).map((ref) => ref.SegmentName)));
  for (const r of measured) {
    const p = theirs.get(r.row.family)!;
    const repeats = (definitionOfRow(r.row, 1) as IrProtocol).PressMinimumRepeats ?? 1;
    for (const keyCode of codes.get(r.row.family) ?? []) {
      const note = (k: string) => { outcome[k] = (outcome[k] ?? 0) + 1; };
      const code = statedCodeOfDefinition(p, keyCode);
      if (code === undefined) { note('our reader declines the code'); continue; }
      if (names(keyCodeOfStatedCode(p, code)) !== names(p.definition.KeyCode)) { note('other segments than the default'); continue; }
      const packet = enginePacketOf(p.definition as unknown as IrProtocol, keyCode);
      if ('refusal' in packet) { note(`no packet: ${packet.refusal}`); continue; }
      const frames = withToggleCleared(p, withStatedWidths(p, code.frames, frameSlots(keyCode)));
      const press = rowSignal(r.row, frames, (r.row.tail ?? r.row.opening)!);
      const held = rowSignal(r.row, frames, r.row.held!);
      if (press === undefined || held === undefined) { note('the row\'s renderer declines'); continue; }
      const touchPress = pressOf(packet, repeats);
      const touchHeld = mergedIntervals([...packet.repeat]);
      if (packet.finish.length === 0 && same(touchPress, mergedIntervals(press)) && same(touchHeld, mergedIntervals(held))) note('alike');
      else if (packet.finish.length === 0 && same(touchPress, spelledAsTheEngine(press)) && same(touchHeld, spelledAsTheEngine(held))) note('alike under the engine\'s spelling');
      else { note('different'); differing.add(r.row.family); }
    }
  }
  assert.deepStrictEqual(outcome, {
    alike: 89367, different: 3634, 'other segments than the default': 417, 'our reader declines the code': 4,
  });
  // **The one family that differs is the row's and not the reader's**, as in `test/touch-definition.test.ts`:
  // `MemorexO1 32 Bit` was measured off three codes of the corpus with a constant 35100 microsecond silence after the
  // frame, and Logitech's definition pads the frame to 107600 instead.
  assert.deepStrictEqual([...differing], ['MemorexO1 32 Bit']);
});
