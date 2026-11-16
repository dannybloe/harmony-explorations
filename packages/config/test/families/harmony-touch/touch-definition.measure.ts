/**
 * Measurements over the whole infrared archive that belong with `touch-definition.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@freeharmony-sdk/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * on how many of the archive's codes the measured rows send what Logitech's definitions state.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipUnlessIrArchiveRelease, slow } from '@freeharmony-sdk/lab';
import {
  frameSlots,
  frameWidths,
  keyCodeOfStatedCode,
  statedCodeOfDefinition,
  withStatedWidths,
  withToggleCleared,
  waveformOfArchiveCommand,
  type ArchiveKeyCode,
  type ArchiveProtocol,
} from '../../../src/catalogue/archive.ts';
import { archiveProtocols } from '../../../src/catalogue/archive.node.ts';
import { mergedIntervals, type Pulse } from '../../../src/infrared/irframe.ts';
import { PROTOCOLS } from '../../../src/infrared/protocols.ts';
import { type StatedCode } from '../../../src/infrared/stated.ts';
import { isDefinitionRefusal, definitionOfRow, keyCodeText } from '../../../src/families/harmony-touch/definition.ts';
import type { IrProtocol } from '../../../src/families/harmony-touch/documents.ts';
import { readConfiguration } from '../../../src/families/harmony-touch/read.ts';

/** The definition as `archive.ts` reads it, through the Touch reader's own adapter rather than a copy. */
function viewOf(definition: IrProtocol): ArchiveProtocol {
  return readConfiguration({ ProtocolList: { Protocols: [definition] } }).protocols[0]!.archive;
}

/** Values as text, since `JSON.stringify` takes no bigint. */
const valuesText = (xs: readonly bigint[]): string => xs.map(String).join(',');

const same = (a: readonly Pulse[], b: readonly Pulse[]): boolean =>
  JSON.stringify(mergedIntervals(a)) === JSON.stringify(mergedIntervals(b));

/** The families whose definitions state a duration under 30 microseconds, see the floor test. */
const UNDER_THE_FLOOR = [
  'AMC 5 Bit', 'Burmester 11 Bit Toggle', 'Corona 48 Bit', 'Nokia 11 Bit', 'Quad 5 Bit', 'Revox 11 Bit',
  'Revox 11 Bit 2', 'Verosol 5 Bit',
];

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

test('against Logitech\'s own definitions, the 29 measured rows send the same on 89220 of the 93188 archive codes they place, the stated rows are a round trip, and every other code is named by why', slow({ ...skipUnlessIrArchiveRelease() }), () => {
  const theirs = new Map(archiveProtocols(IR_ARCHIVE!).map((p) => [p.name, p]));
  const ours = new Map<string, IrProtocol>();
  // **A row the name gives no usable width is written at the widths Logitech's definition states**, one per
  // field in the order a code states its values, `frameWidths`, as a caller that knows its widths would; the
  // set is kept so its codes can be counted apart.
  const atTheirWidths = new Set<string>();
  const widthRefused = new Map<string, number>();
  for (const row of PROTOCOLS) {
    const logitech = theirs.get(row.family);
    if (logitech === undefined) continue;
    const d = definitionOfRow(row, 1);
    if (!isDefinitionRefusal(d)) { ours.set(row.family, d); continue; }
    if (!/width/.test(d.refusal)) continue;
    const widths = frameWidths(logitech);
    const again = widths === undefined ? undefined : definitionOfRow(row, 1, { bits: widths });
    const key = again === undefined ? 'the definition states no widths' : isDefinitionRefusal(again) ? again.refusal : 'written';
    widthRefused.set(key, (widthRefused.get(key) ?? 0) + 1);
    if (again !== undefined && !isDefinitionRefusal(again)) { ours.set(row.family, again); atTheirWidths.add(row.family); }
  }
  const codes = archiveCodes(IR_ARCHIVE!, new Set(ours.keys()));
  const tally = new Map<string, number>();
  const count = (key: string) => tally.set(key, (tally.get(key) ?? 0) + 1);
  // The two halves of the closure, kept apart: a row measured off configurations is an end of its own, and a
  // row converted out of Logitech's definition is not, see the header.
  const sourceOf = new Map(PROTOCOLS.map((row) => [row.family, row.source]));
  const bySource = {
    measured: new Map<string, number>(), stated: new Map<string, number>(), atTheirWidths: new Map<string, number>(),
  };
  const perFamily = new Map<string, Map<string, number>>();
  for (const [family, d] of ours) {
    const logitech = theirs.get(family)!;
    for (const keycode of codes.get(family) ?? []) {
      const note = (key: string) => {
        count(key);
        const group = atTheirWidths.has(family) ? bySource.atTheirWidths
          : sourceOf.get(family) === 'stated' ? bySource.stated : bySource.measured;
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
  const families = (key: string) => [...perFamily].filter(([, m]) => m.has(key)).map(([f]) => f).sort();
  // 577 written at the name's widths and the 96 the name gives no usable width, at Logitech's; two families
  // have no code in any codeset.
  assert.strictEqual(ours.size, 673);
  assert.deepStrictEqual(Object.fromEntries(widthRefused), { written: 96 });
  assert.strictEqual(atTheirWidths.size, 96);
  assert.deepStrictEqual([...ours.keys()].filter((f) => (codes.get(f)?.size ?? 0) === 0), ['ADA 40 Bit', 'Dam 12 Bit']);
  // **The independent half**: 29 rows measured off configurations (20 compiled, 8 both, 1 corpus), whose
  // blocks owe nothing to the definition they are held against. Of their 93504 codes 315 are not placed
  // (a release, another number of values, or our renderer of their definition declining), and of the 93188 compared
  // 89220 are the same; every other one is named by why.
  assert.strictEqual([...ours.keys()].filter((f) => sourceOf.get(f) !== 'stated').length, 29);
  assert.deepStrictEqual(Object.fromEntries(bySource.measured), {
    'the same': 89220,
    'differs by the toggle bit alone': 228,
    'the code names other segments than the family\'s default': 106,
    differs: 3634,
    'our key code refuses: the code states a release, which the definition does not send': 189,
    'our key code refuses: the code states another number of values than the definition sends': 108,
    'their renderer refuses: our keycode reader declines the code': 19,
  });
  // **The round trip half**: the 548 rows of source `stated` written at their name's widths and the 96 at
  // Logitech's, every one converted by `bin/protocols.ts` out of the very definition it is held against, so
  // agreement here says the writer inverts that converter, not that the rhythm is right. Of 49509 codes 5058
  // are not placed and of the 44451 compared 43937 are the same, 8600 of them once the code is written at the
  // definition's widths; of 3895 codes of the 96, 273 are not placed and 3495 of the 3622 compared are the
  // same. No code of either differs for any reason but the toggle and the code's own structure.
  assert.deepStrictEqual(Object.fromEntries(bySource.stated), {
    'the same': 35482,
    'the same at the widths Logitech\'s definition states': 8600,
    'differs by the toggle bit alone': 119,
    'the code names other segments than the family\'s default': 395,
    'our key code refuses: the code states a release, which the definition does not send': 4799,
    'our key code refuses: the code states another number of values than the definition sends': 262,
  });
  assert.deepStrictEqual(Object.fromEntries(bySource.atTheirWidths), {
    'the same': 3509,
    'the same at the widths Logitech\'s definition states': 4,
    'differs by the toggle bit alone': 21,
    'the code names other segments than the family\'s default': 106,
    'our key code refuses: the code states a release, which the definition does not send': 260,
    'our key code refuses: the code states another number of values than the definition sends': 13,
  });
  assert.strictEqual([...tally.values()].reduce((n, k) => n + k, 0), 147074);
  // **The one disagreement is our row's and not the writer's**: `MemorexO1 32 Bit` was measured off three
  // codes of the corpus with a constant 35100 microsecond silence after the frame, and Logitech's definition
  // pads the frame to 107600 instead, so the two agree only where a code's frame runs exactly 72500.
  assert.deepStrictEqual(families('differs'), ['MemorexO1 32 Bit']);
  assert.strictEqual(perFamily.get('MemorexO1 32 Bit')!.get('the same'), 22);
  assert.deepStrictEqual(families('differs by the toggle bit alone'), [
    'Elko 11 Bit', 'Foxtel 10 Bit', 'Magnavox 13 Bit', 'Nokia 13 Bit Quad ToggleC', 'Philips RC5 13 Bit Toggle', 'Philips RC6',
    'Polycom 16 Bit ToggleB', 'Streamzap 14 Bit', 'Thomson 12 Bit Toggle', 'Videocrypt 11 Bit Toggle',
  ]);
  // The short durations of ours are Logitech's own, so the Touch raises the same ones from either definition.
  for (const family of UNDER_THE_FLOOR) {
    const short = (d: IrProtocol) => new Set(statedDurations(d).filter((us) => us < 30));
    const theirShort = short(theirs.get(family)!.definition as unknown as IrProtocol);
    assert.ok([...short(ours.get(family)!)].every((us) => theirShort.has(us)), family);
  }

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
