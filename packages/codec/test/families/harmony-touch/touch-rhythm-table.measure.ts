/**
 * Measurements over the whole infrared archive that belong with `touch-rhythm-table.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * how many of the catalogue's codes the Touch's description and the measured rows reproduce.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipUnlessIrArchiveRelease } from '@harmony/lab';
import {
  frameSlots,
  keyCodeOfStatedCode,
  statedCodeOfDefinition,
  withStatedWidths,
  withToggleCleared,
  type ArchiveKeyCode,
} from '../../../src/catalogue/archive.ts';
import { archiveProtocols } from '../../../src/catalogue/archive.node.ts';
import { mergedIntervals, pulsesOfBlock, type BlockTail, type FrameShape, type Pulse } from '../../../src/infrared/irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../../../src/infrared/protocols.ts';
import { biphaseOf, cellsOf, timingsOf, type StatedCode, type StatedItem } from '../../../src/infrared/stated.ts';
import { definitionOfRow, isDefinitionRefusal, keyCodeText, storedMicrosecondOf } from '../../../src/families/harmony-touch/definition.ts';
import type { IrProtocol } from '../../../src/families/harmony-touch/documents.ts';
import { enginePacketOf, engineWordsOf, type TouchPacket } from '../../../src/families/harmony-touch/packet.ts';

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

test('every refused family is held by the Touch\'s description: Logitech\'s definition of it makes a packet for every code of 103 families, and all but 27 malformed codes of the 104th', { ...skipUnlessIrArchiveRelease() }, () => {
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
test('Logitech\'s definitions read as the engine reads them send the 29 measured rows\' blocks on 89367 of the 93422 catalogue codes, and every other code is named', { ...skipUnlessIrArchiveRelease() }, () => {
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
  // **The one family that differs is the row's and not the reader's**, as in `test/families/harmony-touch/touch-definition.test.ts`:
  // `MemorexO1 32 Bit` was measured off three codes of the corpus with a constant 35100 microsecond silence after the
  // frame, and Logitech's definition pads the frame to 107600 instead.
  assert.deepStrictEqual([...differing], ['MemorexO1 32 Bit']);
});
