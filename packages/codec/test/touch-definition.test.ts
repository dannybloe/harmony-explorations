/**
 * A family's definition in the Harmony Touch's shape, written from a row of our own rhythm table, and a key
 * code written into it, `src/harmony-touch/definition.ts`, `todo-touch.md` 5.3 part A.
 *
 * **What is being claimed.** A Touch works a command's durations out from the family's definition each time
 * it sends, `reference/architectures/harmony-touch/devices-and-infrared.md`, and the definitions a sync
 * measured are Logitech's catalogue definitions word for word. Decision 15's note of 3 November 2026 has us
 * write the definition ourselves, from our table, rather than pass theirs through. So the claim is that a
 * definition we write sends what Logitech's sends, and the closure is the one the brief asked for, reading
 * both ends:
 *
 * * **against Logitech's own definition**, for every written row the archive names: both definitions
 *   rendered by the same renderer, `waveformOfArchiveCommand`, over every code the archive's codesets state
 *   for the family that our key code can place. The archive is read and nothing of it is written here; the
 *   test skips without it. **Only half of this is an independent closure.** 29 of the 60 rows written were
 *   measured off configurations (source `compiled`, `both` or `corpus`), and those are an end of their own;
 *   the other 31 are source `stated`, converted by `bin/protocols.ts` out of the very definition they are
 *   held against, so for them agreement says the writer inverts that converter and nothing about the
 *   rhythm. The counts are asserted per half.
 * * **against our own row**, which needs no archive: the definition rendered against the row's own blocks,
 *   `blockOfStatedCode`, and its frame against `pulsesOfStatedCode`, over a sweep of values.
 * * **`rhythmOfDefinition` reads the definition back as the row**.
 * * **a negative**: one atom moved, and both comparisons fail.
 *
 * **Why the archive's renderer stands in for the Touch, and where the two may part.** No Touch is driven
 * here, and nothing writes to one. The renderer is the codec's one reading of a catalogue definition, held
 * against 13 million of the archive's own renderings by `make prontocheck`; the Touch's engine is read in its
 * firmware, `tests/test_harmony_touch_devices.py`. Where the reference's reading of the engine says something
 * the renderer does not, the test says so below rather than assuming the two agree:
 *
 * * **padding**: the engine pads a segment to its `TotalLength` from the segment's own start, its header
 *   included, when that is longer; the renderer pads a copy from the copy's start the same way. Agree.
 * * **a value too wide**: the engine cuts it from the left for encoding types 0 and 1, the renderer masks it
 *   to the stated width. Agree; `keyCodeText` writes the cut value, so the two never see one.
 * * **the toggle**: the engine replaces the toggle bit with its own per family state, 0 on the first send;
 *   the renderer clears it, which is the first send. Agree on Logitech's definitions. **Ours states no
 *   toggle bit, because no row does**, so a Touch given ours sends the bit as the code writes it on every
 *   press; the codes that differ for that reason alone are counted, not hidden.
 * * **the 30 microsecond floor and the 32767 chunks**: the engine raises a duration under 30 to 30 and
 *   writes one over 32767 as several words; the renderer does neither. The chunks are the same signal. The
 *   floor is not, and it matters only where a definition states a duration under 30: ours states none,
 *   asserted below, so it cannot part them on a definition of ours.
 * * **the release**: the renderer appends a code's finish group to its first transmission; the engine sends
 *   it as a sequence of its own. Our rows state no release, so our definitions have none.
 *
 * * **a code segment**: the engine reads its `Atoms`, the renderer its `Header` and `Trailer`. Ours state the
 *   same durations in both, so the two read one literal.
 *
 * **What a row cannot give, measured rather than guessed**: 619 of the table's 681 rows carry no block, so
 * no trailer and no gap; 616 are refused for that and three first as whole record shapes. `bin/protocols.ts`
 * writes a stated row's blocks only where the definition states its repeat count. Their frames are still checked, with a trailer of the test's own,
 * so the spelling of every frame the table states is held against its row, which is the part of the writer
 * that does not depend on the missing blocks.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import {
  archiveProtocols, frameSlots, frameWidths, keyCodeOfStatedCode, rhythmKey, rhythmOfDefinition, statedCodeOfDefinition, withStatedWidths,
  withToggleCleared, waveformOfArchiveCommand, type ArchiveKeyCode, type ArchiveProtocol,
} from '../src/archive.ts';
import { mergedIntervals, pulsesOfFrame, type Pulse } from '../src/irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../src/protocols.ts';
import {
  biphaseOf, blockOfStatedCode, cellsOf, pulsesOfStatedCode, statedCode, timingsOf, type StatedCode, type StatedItem,
} from '../src/stated.ts';
import { carrierOfPeriod, isDefinitionRefusal, definitionOfRow, keyCodeText } from '../src/harmony-touch/definition.ts';
import type { IrProtocol } from '../src/harmony-touch/documents.ts';
import { readConfiguration } from '../src/harmony-touch/read.ts';

/** The definition as `archive.ts` reads it, through the Touch reader's own adapter rather than a copy. */
function viewOf(definition: IrProtocol): ArchiveProtocol {
  return readConfiguration({ ProtocolList: { Protocols: [definition] } }).protocols[0]!.archive;
}

/** Values as text, since `JSON.stringify` takes no bigint. */
const valuesText = (xs: readonly bigint[]): string => xs.map(String).join(',');

const same = (a: readonly Pulse[], b: readonly Pulse[]): boolean =>
  JSON.stringify(mergedIntervals(a)) === JSON.stringify(mergedIntervals(b));

const composed = (row: StatedProtocol): IrProtocol | undefined => {
  const d = definitionOfRow(row, 1);
  return isDefinitionRefusal(d) ? undefined : d;
};

/** The encoded segments a definition's start and repeat groups send, in order, with their widths in bits. */
function valueWidths(definition: IrProtocol): number[] {
  const segments = new Map((definition.IRSegments ?? []).map((one) => [one.Name, one]));
  return [...(definition.KeyCode?.Start ?? []), ...(definition.KeyCode?.Repeat ?? [])]
    .filter((ref) => ref.SegmentType === 1)
    .map((ref) => {
      const p = segments.get(ref.SegmentName)!.Payload!;
      const perDigit = p.EncodingType === 2 ? 2 : p.EncodingType === 3 ? 4 : 1;
      return p.NumberOfBits! * perDigit;
    });
}

/** A code of the family stating these values at these widths, in the shape `statedCode` gives. */
function codeOf(family: string, widths: readonly number[], values: readonly bigint[]): StatedCode {
  const frames = values.map((value, index) => ({ value, bits: widths[index]!, index }));
  const items: StatedItem[] = frames.map((frame) => ({ kind: 'frame', frame }));
  return { family, items, frames, words: [], bits: widths[0]!, groups: [[], items, []] };
}

/**
 * Eight codes per definition: all zeros, all ones, the two alternations and four from a fixed linear
 * congruential sequence, every value at its own width. Deterministic, so a count below is a count.
 */
function sweep(widths: readonly number[]): bigint[][] {
  const mask = (w: number) => (1n << BigInt(w)) - 1n;
  const pattern = (w: number, nibble: bigint) => {
    let v = 0n;
    for (let i = 0; i < w; i += 4) v = (v << 4n) | nibble;
    return v & mask(w);
  };
  let seed = 0x2545F491n;
  const random = (w: number) => {
    let v = 0n;
    for (let i = 0; i < w; i += 16) {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
      v = (v << 16n) | (seed >> 48n);
    }
    return v & mask(w);
  };
  const out: bigint[][] = [
    widths.map(() => 0n), widths.map(mask), widths.map((w) => pattern(w, 0x5n)), widths.map((w) => pattern(w, 0xAn)),
  ];
  for (let k = 0; k < 4; k += 1) out.push(widths.map(random));
  return out;
}

/** Every duration a definition states, as its atoms hold them, which is what the 30 microsecond floor reads. */
function statedDurations(definition: IrProtocol): number[] {
  const out: number[] = [];
  for (const s of definition.IRSegments ?? []) {
    for (const a of [...(s.Header ?? []), ...(s.Trailer ?? [])]) out.push(a.Value);
    for (const e of s.Payload?.Encodings ?? []) for (const a of e.Atoms ?? []) out.push(a.Value);
  }
  for (const s of definition.CodeSegments ?? []) for (const a of s.Atoms ?? []) out.push(a.Value);
  return out;
}

// ---------------------------------------------------------------------------------------------------
// No archive needed
// ---------------------------------------------------------------------------------------------------

test('every row of the rhythm table is written as a definition or refused with a reason, 60 written', () => {
  const written: string[] = [];
  const refused = new Map<string, number>();
  for (const row of PROTOCOLS) {
    const d = definitionOfRow(row, 1);
    if (isDefinitionRefusal(d)) refused.set(d.refusal, (refused.get(d.refusal) ?? 0) + 1);
    else written.push(row.family);
  }
  assert.strictEqual(PROTOCOLS.length, 681);
  assert.strictEqual(written.length, 60);
  assert.deepStrictEqual(Object.fromEntries(refused), {
    'the row states its frame and not its repetition, so no trailer and no gap': 616,
    'a whole record shape, which no segment of a definition states': 3,
    'the family\'s name states no width for its values and none was given': 1,
    'a width that is not a whole number of cells': 1,
  });
});

test('a written definition reads back through rhythmOfDefinition as the row it was written from', () => {
  let read = 0;
  const differ: string[] = [];
  for (const row of PROTOCOLS) {
    const d = composed(row);
    if (d === undefined) continue;
    read += 1;
    const back = rhythmOfDefinition(viewOf(d));
    const t = timingsOf(row);
    const b = biphaseOf(row);
    const c = cellsOf(row);
    const shape = { ...(t === undefined ? {} : { timings: t }), ...(b === undefined ? {} : { biphase: b }), ...(c === undefined ? {} : { cells: c }) };
    const ok = !('refusal' in back)
      && rhythmKey(back.periodNs, back) === rhythmKey(row.periodNs, shape)
      && (back.timings?.carriedFirst === true) === (row.carriedFirst === true)
      && (row.carries !== 'mark' || back.framePeriod === row.framePeriod);
    if (!ok) differ.push(row.family);
  }
  assert.strictEqual(read, 60);
  assert.deepStrictEqual(differ, []);
});

test('a written definition sends the row\'s own blocks, and its key code reads back as the code', () => {
  let rows = 0;
  let codes = 0;
  let once = 0;
  let held = 0;
  let readBack = 0;
  const differ: string[] = [];
  for (const row of PROTOCOLS) {
    const d = composed(row);
    if (d === undefined) continue;
    rows += 1;
    const view = viewOf(d);
    const widths = valueWidths(d);
    for (const values of sweep(widths)) {
      const code = codeOf(row.family, widths, values);
      const keyCode = keyCodeText(code, d);
      assert.strictEqual(typeof keyCode, 'string', `${row.family}: ${JSON.stringify(keyCode)}`);
      codes += 1;
      // The inverse: the codec's own reader takes the values back out of what we wrote.
      const again = statedCodeOfDefinition(view, keyCode as string);
      if (again !== undefined && valuesText(again.frames.map((f) => f.value)) === valuesText(values)) readBack += 1;
      const ours = waveformOfArchiveCommand(view, keyCode as string, { repeats: d.PressMinimumRepeats ?? 1, asStored: true });
      const rowOnce = blockOfStatedCode(code, row.periodNs, 'once');
      const rowHeld = blockOfStatedCode(code, row.periodNs, 'held');
      if ('refusal' in ours || rowOnce === undefined || rowHeld === undefined) { differ.push(`${row.family}: unrendered`); continue; }
      if (same(ours.once, rowOnce)) once += 1; else differ.push(`${row.family} once`);
      if (same(ours.held, rowHeld)) held += 1; else differ.push(`${row.family} held`);
    }
  }
  assert.strictEqual(rows, 60);
  assert.strictEqual(codes, 480);
  assert.deepStrictEqual([...new Set(differ)], []);
  assert.strictEqual(once, 480);
  assert.strictEqual(held, 480);
  assert.strictEqual(readBack, 480);
});

/**
 * Every frame the table states, written with a trailer of the test's own, against `pulsesOfStatedCode`.
 *
 * **Why a trailer of our own.** 619 rows state no block, so no trailer, and a frame has to be followed by
 * something before a definition can send it. The trailer chosen is one no family states, a 1234
 * microsecond mark and a 100 millisecond silence, so it cannot merge with the frame into a number that
 * happens to agree. A pulse width frame ends on its last carried mark in a definition and on its closing
 * silence in `pulsesOfStatedCode`, so for those the silence opens the trailer instead; a frame with an
 * opening mark of its own needs the constant mark after it, which is what its spelling moves into the cells.
 */
function withOwnTrailer(row: StatedProtocol): { row: StatedProtocol; after: number[] } {
  const { tail: _tail, held: _held, ...rest } = row;
  const after = row.carries === 'mark' ? [-5000, 1234, -100000]
    : row.firstMark !== undefined ? [row.flat!, -100000] : [1234, -100000];
  return { row: { ...rest, held: { items: [{ copy: 'full' }, { words: [...after.slice(0, -1), after[after.length - 1]! - 1] }] } }, after };
}

test('every frame the table states is spelled as the row\'s own frame, with a trailer of the test\'s own', () => {
  let rows = 0;
  let codes = 0;
  let agree = 0;
  let readBack = 0;
  let ownWidth = 0;
  let bothDecline = 0;
  const refused = new Map<string, number>();
  const differ: string[] = [];
  for (const original of PROTOCOLS) {
    const { row, after } = withOwnTrailer(original);
    // The name's widths where it states any the frame can carry, and otherwise a width of the test's own:
    // six cells of a cell table, twelve bits of anything else. The width is not what is under test here.
    let d = definitionOfRow(row, 1);
    if (isDefinitionRefusal(d) && /width/.test(d.refusal)) {
      ownWidth += 1;
      d = definitionOfRow(row, 1, { bits: row.cells === undefined ? 12 : row.cells.bits * 6 });
    }
    if (isDefinitionRefusal(d)) { refused.set(d.refusal, (refused.get(d.refusal) ?? 0) + 1); continue; }
    rows += 1;
    const back = rhythmOfDefinition(viewOf(d));
    const t = timingsOf(row);
    const b = biphaseOf(row);
    const c = cellsOf(row);
    const shape = { ...(t === undefined ? {} : { timings: t }), ...(b === undefined ? {} : { biphase: b }), ...(c === undefined ? {} : { cells: c }) };
    if (!('refusal' in back) && rhythmKey(back.periodNs, back) === rhythmKey(row.periodNs, shape)) readBack += 1;
    const view = viewOf(d);
    const widths = valueWidths(d);
    for (const values of sweep(widths)) {
      const keyCode = keyCodeText(codeOf(row.family, widths, values), d);
      if (typeof keyCode !== 'string') { differ.push(`${row.family}: ${keyCode.refusal}`); continue; }
      codes += 1;
      const ours = waveformOfArchiveCommand(view, keyCode, { storedForm: false });
      // A pulse width frame's closing silence is the gap our trailer replaces. Eleven pulse width rows state
      // no frame period, so `pulsesOfStatedCode` has no closing to give them and declines; their frame is
      // the emitter's own with its closing dropped, which is how `pulsesOfBlock` sends a copy of one.
      const t = timingsOf(row);
      const frame = row.carries === 'mark'
        ? (row.framePeriod === undefined ? pulsesOfFrame({ ...t!, closing: 1 }, widths[0]!, values[0]!)
          : pulsesOfStatedCode(row.family, widths[0]!, values[0]!, row.periodNs))?.slice(0, -1)
        : pulsesOfStatedCode(row.family, widths[0]!, values[0]!, row.periodNs);
      if ('refusal' in ours && frame === undefined) { bothDecline += 1; continue; }
      if ('refusal' in ours || frame === undefined) { differ.push(`${row.family}: one side declines`); continue; }
      const expected = [...frame, ...after.map((w) => ({ mark: w > 0, us: Math.abs(w) }))];
      if (same(ours.held, expected)) agree += 1; else differ.push(row.family);
    }
  }
  assert.deepStrictEqual(Object.fromEntries(refused), { 'a whole record shape, which no segment of a definition states': 3 });
  assert.strictEqual(rows, 678);
  assert.strictEqual(ownWidth, 107);
  assert.strictEqual(readBack, 678);
  assert.deepStrictEqual([...new Set(differ)], []);
  assert.strictEqual(codes, 5424);
  assert.strictEqual(agree, 5413);
  // `Ferguson 9 Bit Toggle` and `iMonFixed2` state a cell with no intervals, section 233, and a value naming
  // it cannot be sent; both renderers decline those eleven codes alike.
  assert.strictEqual(bothDecline, 11);
});

test('no definition of ours states a duration under the Touch\'s 30 microsecond floor', () => {
  let definitions = 0;
  const under: string[] = [];
  for (const row of PROTOCOLS) {
    const d = composed(row);
    if (d === undefined) continue;
    definitions += 1;
    if (statedDurations(d).some((us) => us < 30)) under.push(row.family);
  }
  assert.strictEqual(definitions, 60);
  assert.deepStrictEqual(under, []);
});

test('one atom moved in a written definition, and the comparison against the row fails', () => {
  const row = PROTOCOLS.find((one) => one.family === 'Sony 12 Bit')!;
  const d = composed(row)!;
  const widths = valueWidths(d);
  const code = codeOf(row.family, widths, [0x910n]);
  const keyCode = keyCodeText(code, d) as string;
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
  const rowHeld = blockOfStatedCode(code, row.periodNs, 'held')!;
  const good = waveformOfArchiveCommand(viewOf(d), keyCode, { asStored: true });
  const bad = waveformOfArchiveCommand(viewOf(moved), keyCode, { asStored: true });
  assert.ok(!('refusal' in good) && !('refusal' in bad));
  assert.ok(same(good.held, rowHeld));
  assert.ok(!same(bad.held, rowHeld));
});

test('a code written into a definition takes the definition\'s structure and refuses a count it cannot place', () => {
  const toshiba = composed(PROTOCOLS.find((one) => one.family === 'Toshiba 32 Bit')!)!;
  // The start group carries the frame and the repetition the ditto, as Logitech's catalogue writes it.
  assert.strictEqual(keyCodeText(statedCode('G:Toshiba 32 Bit:(0x20DF9E61)(Repeat)():3')!, toshiba),
    'G:Toshiba 32 Bit:(0x20DF9E61)(Repeat)():3');
  const jvc = composed(PROTOCOLS.find((one) => one.family === 'JVC 16 Bit')!)!;
  assert.strictEqual(keyCodeText(statedCode('G:JVC 16 Bit:(Start)(0xC0E8)():3')!, jvc), 'G:JVC 16 Bit:(Start)(0xC0E8)():3');
  // Two values where the family sends one.
  assert.deepStrictEqual(keyCodeText(statedCode('G:JVC 16 Bit:()(0xC0E8_0x0001)():3')!, jvc),
    { refusal: 'the code states another number of values than the definition sends' });
});

// ---------------------------------------------------------------------------------------------------
// Against Logitech's own definitions, which needs the archive
// ---------------------------------------------------------------------------------------------------

test('the atoms of Logitech\'s catalogue state no bounds, 12827 of 12830, which is why ours state null', { ...skipWithoutIrArchive() }, () => {
  // Every atom object a definition holds: a segment's header, trailer and literal atoms, and every cell's.
  type Bounded = { readonly MinValue?: unknown; readonly MaxValue?: unknown };
  let atoms = 0;
  let unbounded = 0;
  for (const p of archiveProtocols(IR_ARCHIVE!)) {
    const segments = [...(p.definition.IRSegments ?? []), ...(p.definition.CodeSegments ?? [])];
    for (const s of segments) {
      const lists = [s.Header, s.Trailer, s.Atoms, ...(s.Payload?.Encodings ?? []).map((e) => e.Atoms)];
      for (const list of lists) {
        for (const a of (list ?? []) as readonly Bounded[]) {
          atoms += 1;
          if (a.MinValue === null && a.MaxValue === null) unbounded += 1;
        }
      }
    }
  }
  assert.strictEqual(atoms, 12830);
  assert.strictEqual(unbounded, 12827);
});

/** Every distinct key code the archive's codesets state for these families, by family. */
function archiveCodes(root: string, families: ReadonlySet<string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const directory = join(root, 'codesets');
  for (const bucket of readdirSync(directory)) {
    for (const file of readdirSync(join(directory, bucket))) {
      const text = readFileSync(join(directory, bucket, file), 'utf8');
      for (const match of text.matchAll(/"keycode":\s*"(G:([^:"]+):[^"]*)"/g)) {
        const family = match[2]!;
        if (!families.has(family)) continue;
        let set = out.get(family);
        if (set === undefined) out.set(family, set = new Set());
        set.add(match[1]!);
      }
    }
  }
  return out;
}

test('the carrier a row\'s period gives is Logitech\'s own for 641 of the table\'s 681 rows', { ...skipWithoutIrArchive() }, () => {
  const theirs = new Map(archiveProtocols(IR_ARCHIVE!).map((p) => [p.name, p]));
  let named = 0;
  let same_ = 0;
  for (const row of PROTOCOLS) {
    const p = theirs.get(row.family);
    // Every row's period is its own definition's carrier truncated, so each row is a fair question.
    assert.ok(p !== undefined && Math.floor(1e9 / p.carrierHz) === row.periodNs, row.family);
    named += 1;
    if (carrierOfPeriod(row.periodNs) === p.carrierHz) same_ += 1;
  }
  assert.strictEqual(named, 681);
  assert.strictEqual(same_, 641);
});

test('against Logitech\'s own definitions, the 29 measured rows send the same on 89139 of the 93107 archive codes they place, and every other code is named by why', { ...skipWithoutIrArchive() }, () => {
  const theirs = new Map(archiveProtocols(IR_ARCHIVE!).map((p) => [p.name, p]));
  const ours = new Map<string, IrProtocol>();
  for (const row of PROTOCOLS) {
    const d = composed(row);
    if (d !== undefined && theirs.has(row.family)) ours.set(row.family, d);
  }
  const codes = archiveCodes(IR_ARCHIVE!, new Set(ours.keys()));
  const tally = new Map<string, number>();
  const count = (key: string) => tally.set(key, (tally.get(key) ?? 0) + 1);
  // The two halves of the closure, kept apart: a row measured off configurations is an end of its own, and a
  // row converted out of Logitech's definition is not, see the header.
  const sourceOf = new Map(PROTOCOLS.map((row) => [row.family, row.source]));
  const bySource = { measured: new Map<string, number>(), stated: new Map<string, number>() };
  const perFamily = new Map<string, Map<string, number>>();
  for (const [family, d] of ours) {
    const logitech = theirs.get(family)!;
    for (const keycode of codes.get(family) ?? []) {
      const note = (key: string) => {
        count(key);
        const group = sourceOf.get(family) === 'stated' ? bySource.stated : bySource.measured;
        group.set(key, (group.get(key) ?? 0) + 1);
        let m = perFamily.get(family);
        if (m === undefined) perFamily.set(family, m = new Map());
        m.set(key, (m.get(key) ?? 0) + 1);
      };
      const theirsOut = waveformOfArchiveCommand(logitech, keycode, { storedForm: false });
      if ('refusal' in theirsOut) { note(`their renderer refuses: ${theirsOut.refusal}`); continue; }
      const code = statedCodeOfDefinition(logitech, keycode)!;
      const row = PROTOCOLS.find((one) => one.family === family)!;
      const render = (definition: IrProtocol, c: StatedCode) => {
        const written = keyCodeText(c, definition);
        if (typeof written !== 'string') return written;
        const out = waveformOfArchiveCommand(viewOf(definition), written, { storedForm: false });
        return 'refusal' in out ? { refusal: `not rendered: ${out.refusal}` } : out;
      };
      const agrees = (out: ReturnType<typeof render>) => !('refusal' in out) && same(out.once, theirsOut.once) && same(out.held, theirsOut.held);
      const first = render(d, code);
      if ('refusal' in first && first.refusal !== 'a value wider than its cell segment') { note(`our key code refuses: ${first.refusal}`); continue; }
      if (agrees(first)) { note('the same'); continue; }
      // **The width a family's name states is not every family's width**, section 231, and a caller that
      // knows the width passes it, as a learned code does. So a code that differs at the name's widths is
      // tried again at the widths Logitech's definition states for it, which separates a wrong width from a
      // wrong anything else; the count says how many codes needed it.
      const widths = frameWidths(logitech, frameSlots(keycode));
      const atTheirs = widths === undefined ? undefined : definitionOfRow(row, 1, { bits: widths });
      const definition = atTheirs === undefined || isDefinitionRefusal(atTheirs) ? d : atTheirs;
      const second = definition === d ? first : render(definition, code);
      if (definition !== d && agrees(second)) { note('the same at the widths Logitech\'s definition states'); continue; }
      if ('refusal' in second) { note(`our key code refuses: ${second.refusal}`); continue; }
      // The toggle: their renderer clears it, as the Touch's first send does, and ours states none.
      const widened = withStatedWidths(logitech, code.frames);
      const cleared = withToggleCleared(logitech, widened);
      if (valuesText(cleared.map((f) => f.value)) !== valuesText(widened.map((f) => f.value))) {
        const asCleared = keyCodeText({ ...code, frames: code.frames.map((f, i) => ({ ...f, value: cleared[i]!.value })) }, definition);
        const again = typeof asCleared === 'string' ? waveformOfArchiveCommand(viewOf(definition), asCleared, { storedForm: false }) : undefined;
        if (again !== undefined && !('refusal' in again) && same(again.once, theirsOut.once) && same(again.held, theirsOut.held)) {
          note('differs by the toggle bit alone');
          continue;
        }
      }
      // The code's own groups against the family's default: the structure a definition of ours sends is the
      // row's, which is the default where Logitech's compiler built the row's blocks.
      const names = (k: ArchiveKeyCode | null | undefined) => JSON.stringify(
        [k?.Start, k?.Repeat, k?.Finish].map((list) => (list ?? []).map((ref) => ref.SegmentName)));
      if (names(keyCodeOfStatedCode(logitech, code)) !== names(logitech.definition.KeyCode)) {
        note('the code names other segments than the family\'s default');
        continue;
      }
      note('differs');
    }
  }
  assert.strictEqual(ours.size, 60);
  assert.strictEqual([...ours.keys()].filter((f) => (codes.get(f)?.size ?? 0) > 0).length, 60);
  // **The independent half**: 29 rows measured off configurations (20 compiled, 8 both, 1 corpus), whose
  // blocks owe nothing to the definition they are held against. Of their 93422 codes 315 are not placed
  // (a release, another number of values, or our renderer of their definition declining), and of the 93107 compared
  // 89139 are the same; every other one is named by why.
  assert.strictEqual([...ours.keys()].filter((f) => sourceOf.get(f) !== 'stated').length, 29);
  assert.deepStrictEqual(Object.fromEntries(bySource.measured), {
    'the same': 89139,
    'differs by the toggle bit alone': 228,
    'the code names other segments than the family\'s default': 106,
    differs: 3634,
    'our key code refuses: the code states a release, which the definition does not send': 188,
    'our key code refuses: the code states another number of values than the definition sends': 108,
    'their renderer refuses: our keycode reader declines the code': 19,
  });
  // **The round trip half**: 31 rows of source `stated`, converted out of the very definition they are held
  // against by `bin/protocols.ts`, so agreement here says the writer inverts that converter, not that the
  // rhythm is right. 2326 of their 7554 codes are not placed.
  assert.deepStrictEqual(Object.fromEntries(bySource.stated), {
    'the same': 4000,
    'the same at the widths Logitech\'s definition states': 1142,
    'the code names other segments than the family\'s default': 86,
    'our key code refuses: the code states a release, which the definition does not send': 2238,
    'our key code refuses: the code states another number of values than the definition sends': 88,
  });
  assert.strictEqual([...tally.values()].reduce((n, k) => n + k, 0), 100976);
  const families = (key: string) => [...perFamily].filter(([, m]) => m.has(key)).map(([f]) => f).sort();
  // **The one disagreement is our row's and not the writer's**: `MemorexO1 32 Bit` was measured off three
  // codes of the corpus with a constant 35100 microsecond silence after the frame, and Logitech's definition
  // pads the frame to 107600 instead, so the two agree only where a code's frame runs exactly 72500.
  assert.deepStrictEqual(families('differs'), ['MemorexO1 32 Bit']);
  assert.strictEqual(perFamily.get('MemorexO1 32 Bit')!.get('the same'), 22);
  // The cell table families whose name states no width their values have, section 231.
  assert.deepStrictEqual(families('the same at the widths Logitech\'s definition states'), [
    'DreamMultimedia 16 Bit Hex', 'Galaxis 16 Bit Quad', 'Kathrein 16 Bit Quad Toggle', 'Motorola 16 Bit Quad Toggle',
    'MotorolaO1 16 Bit Hex', 'Multichoice 8 Bit Hex', 'Pace 18 Bit Quad Toggle',
  ]);
  assert.deepStrictEqual(families('differs by the toggle bit alone'), [
    'Magnavox 13 Bit', 'Philips RC5 13 Bit Toggle', 'Thomson 12 Bit Toggle', 'Videocrypt 11 Bit Toggle',
  ]);

  // The negative, over the same codes: the set cell's mark of `Sony 12 Bit` one microsecond longer.
  const sony = ours.get('Sony 12 Bit')!;
  const segment = sony.IRSegments![0]!;
  const encodings = segment.Payload!.Encodings!;
  const moved: IrProtocol = {
    ...sony,
    IRSegments: [{
      ...segment,
      Payload: { ...segment.Payload!, Encodings: [encodings[0]!, { ...encodings[1]!, Atoms: [encodings[1]!.Atoms![0]!, { ...encodings[1]!.Atoms![1]!, Value: 1201 }] }] },
    }],
  };
  let sonyCodes = 0;
  const stillSame: bigint[] = [];
  for (const keycode of codes.get('Sony 12 Bit')!) {
    const logitech = theirs.get('Sony 12 Bit')!;
    const theirsOut = waveformOfArchiveCommand(logitech, keycode, { storedForm: false });
    const written = keyCodeText(statedCodeOfDefinition(logitech, keycode)!, moved);
    if ('refusal' in theirsOut || typeof written !== 'string') continue;
    const oursOut = waveformOfArchiveCommand(viewOf(moved), written, { storedForm: false });
    sonyCodes += 1;
    if (!('refusal' in oursOut) && same(oursOut.once, theirsOut.once) && same(oursOut.held, theirsOut.held)) {
      stillSame.push(statedCodeOfDefinition(logitech, keycode)!.frames[0]!.value);
    }
  }
  assert.strictEqual(perFamily.get('Sony 12 Bit')!.get('the same'), 912);
  assert.strictEqual(sonyCodes, 912);
  // Only a code with no set bit never sends the moved cell.
  assert.deepStrictEqual(stillSame, [0n]);
});
