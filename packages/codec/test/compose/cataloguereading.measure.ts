/**
 * Measurements over the whole infrared archive that belong with `cataloguereading.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * how many commands a family's name cannot read, and where the two readings of a code differ.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, needing, skipUnlessIrArchiveRelease, slow } from '@harmony/lab';
import { type Pulse, statedCode, waveformOfArchiveCommand, archiveAt } from '../../src/node.ts';
import { archiveProtocolsByName, catalogueCode, catalogueCommandBlocks, composableKeycode, sameTrain } from '../../src/build.ts';
import { blockOfStatedCode, mergedIntervals, statedCodeOfDefinition } from '../../src/internal.ts';

/** Every command of the archive, as its keycode, once per codeset that holds it. Read once per file. */
let keycodes: string[] | undefined;
function archiveKeycodes(): string[] {
  if (keycodes !== undefined) return keycodes;
  const out: string[] = [];
  for (const bucket of readdirSync(join(IR_ARCHIVE!, 'codesets'))) {
    for (const file of readdirSync(join(IR_ARCHIVE!, 'codesets', bucket))) {
      const raw = JSON.parse(readFileSync(join(IR_ARCHIVE!, 'codesets', bucket, file), 'utf8')) as unknown;
      const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as { keycode?: string }[];
      for (const { keycode } of list) if (keycode !== undefined && /^G:[^:]+:/.test(keycode)) out.push(keycode);
    }
  }
  keycodes = out;
  return out;
}
const familyOf = (keycode: string): string => /^G:([^:]+):/.exec(keycode)![1]!;

/** Every keycode the archive holds a rendering for, a Pronto string, anywhere. */
function renderedKeycodes(): Set<string> {
  const out = new Set<string>();
  for (const bucket of readdirSync(join(IR_ARCHIVE!, 'codesets'))) {
    for (const file of readdirSync(join(IR_ARCHIVE!, 'codesets', bucket))) {
      const raw = JSON.parse(readFileSync(join(IR_ARCHIVE!, 'codesets', bucket, file), 'utf8')) as unknown;
      const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as
        { keycode?: string; pronto?: string }[];
      for (const { keycode, pronto } of list) if (keycode !== undefined && pronto !== undefined) out.add(keycode);
    }
  }
  return out;
}

test('the codes a family\'s name cannot read are 53304 commands of 156 families, and the definition reads all but 172, none of them an infrared code the catalogue renders',
  slow(needing(skipUnlessIrArchiveRelease())), () => {
    const rendered = renderedKeycodes();
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    const families = new Set<string>();
    let unnamed = 0;
    let read = 0;
    const declined = new Map<string, number>();
    for (const keycode of archiveKeycodes()) {
      if (statedCode(keycode) !== undefined) continue;
      unnamed += 1;
      const family = familyOf(keycode);
      families.add(family);
      if (statedCodeOfDefinition(protocols.get(family)!, keycode) !== undefined) read += 1;
      else {
        declined.set(family, (declined.get(family) ?? 0) + 1);
        assert.ok(!rendered.has(keycode), `${keycode.slice(0, 60)} has a rendering in the archive`);
      }
    }
    assert.equal(unnamed, 53304);
    assert.equal(families.size, 156);
    assert.equal(read, 53132);
    // HID and the two IP families are not infrared, their values carrying no `0x` at all and their
    // definitions no rhythm; the other 31 are misspelt in the catalogue, `0x0x...` on 27 `Galaxis 16 Bit
    // Quad Toggle` codes, a stray letter on three `Toshiba 32 Bit` ones and `(c)` on one `Pioneer 32 Bit`.
    assert.deepEqual([...declined].sort(), [
      ['Galaxis 16 Bit Quad Toggle', 27], ['HID 16 Bit', 109], ['Pioneer 32 Bit', 1], ['Roku IP', 19],
      ['Sonos IP', 13], ['Toshiba 32 Bit', 3],
    ]);
  });

test('on a code both readings read, the table\'s block is the same under both on all but 224 codes, where the name\'s is the definition at no count and the definition\'s is the definition at the family\'s own',
  needing(skipUnlessIrArchiveRelease()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    let both = 0;
    let same = 0;
    const differ = new Map<string, number>();
    const rebuild = new Map<string, number>();
    for (const keycode of new Set(archiveKeycodes())) {
      const byName = statedCode(keycode);
      if (byName === undefined) continue;
      const protocol = protocols.get(familyOf(keycode));
      const byDefinition = protocol === undefined ? undefined : statedCodeOfDefinition(protocol, keycode);
      if (byDefinition === undefined) continue;
      const a = blockOfStatedCode(byName, undefined, 'once');
      const b = blockOfStatedCode(byDefinition, undefined, 'once');
      if (a === undefined || b === undefined) {
        // The definition's reading never loses a block the name's had, nor gains one.
        assert.equal(a, b, keycode);
        continue;
      }
      both += 1;
      if (JSON.stringify(a) === JSON.stringify(b)) { same += 1; continue; }
      const family = familyOf(keycode);
      differ.set(family, (differ.get(family) ?? 0) + 1);
      // Each reading's block, against the definition built at 0 to 6 repetitions.
      const at = (block: readonly Pulse[]) => [0, 1, 2, 3, 4, 5, 6].filter((n) => {
        const built = waveformOfArchiveCommand(protocol!, keycode, { repeats: n, asStored: true });
        return !('refusal' in built) && built.once.length > 0 && sameTrain(built.once, block);
      }).join('/') || 'none';
      const key = `name ${at(a)}, definition ${at(b)}, stated ${protocol!.pressMinimumRepeats}`;
      rebuild.set(key, (rebuild.get(key) ?? 0) + 1);
    }
    assert.equal(both, 101678);
    assert.equal(same, 101454);
    assert.deepEqual([...differ].sort(), [
      ['Kathrein 16 Bit Quad Toggle', 80], ['Motorola 16 Bit Quad Toggle', 99], ['Pace 18 Bit Quad Toggle', 45],
    ]);
    // **The control is the name's own block**: it is the definition at no count at all, where the
    // definition's reading gives the definition's block at the 1 the three families state.
    assert.deepEqual([...rebuild], [['name none, definition 1, stated 1', 224]]);
  });

test('a code only the definition reads is built from the definition, never the table\'s block, which sends fewer frames than such a code states on 78',
  needing(skipUnlessIrArchiveRelease()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    const taken = new Map<string, number>();
    const short = new Map<string, number>();
    const outcomes = new Map<string, number>();
    for (const keycode of new Set(archiveKeycodes())) {
      if (statedCode(keycode) !== undefined) continue;
      const read = catalogueCode(keycode, protocols);
      if (read === undefined || !composableKeycode(keycode, read)) continue;
      const family = read.family;
      taken.set(family, (taken.get(family) ?? 0) + 1);
      const protocol = protocols.get(family)!;
      const table = blockOfStatedCode(read, undefined, 'once')!;
      const built = waveformOfArchiveCommand(protocol, keycode, { repeats: protocol.pressMinimumRepeats ?? 3, asStored: true });
      if ('refusal' in built) continue;
      if (mergedIntervals(table).length < mergedIntervals(built.once).length) short.set(family, (short.get(family) ?? 0) + 1);
      // What the composer does with it instead, at the count the family states or, stating none, at 3.
      const blocks = catalogueCommandBlocks(keycode, { repeats: protocol.pressMinimumRepeats ?? 3 }, protocols);
      const outcome = blocks === undefined ? 'the table\'s block'
        : 'refusal' in blocks ? blocks.refusal : sameTrain(blocks.once, built.once) ? 'the definition\'s' : 'another';
      outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
    }
    // Fourteen families have a whole block in the table that takes such a code, 2976 distinct codes.
    assert.deepEqual([...taken].sort(), [
      ['Belgacom 16 Bit Quad', 120], ['DreamMultimedia 16 Bit Hex', 1140], ['Galaxis 16 Bit Quad', 197],
      ['LG 32 Bit', 1], ['Microsoft 30 Bit', 70], ['MotorolaO1 16 Bit Hex', 637], ['Multichoice 8 Bit Hex', 55],
      ['Pace 16 Bit Quad', 477], ['PaceO1 16 Bit Quad', 156], ['Samsung 16 and 20 Bit', 41], ['Sony 20 Bit', 1],
      ['Toshiba 32 Bit', 1], ['Zenith 11 Bit Quad', 74], ['iMonFixed2', 6],
    ]);
    // **The table's block is wrong on 78 of them**: it sends fewer intervals than the definition does at the
    // family's own count. A `Samsung 16 and 20 Bit` code stating three to five pairs gets the row's one pair, a
    // `Pace 16 Bit Quad` code stating two values gets one, and an `iMonFixed2` code stating only its start
    // and release groups gets nothing at all. The row was measured or derived over codes the name reads.
    assert.deepEqual([...short].sort(), [['Pace 16 Bit Quad', 35], ['Samsung 16 and 20 Bit', 41], ['iMonFixed2', 2]]);
    // So the composer never sends the table's block for such a code: the definition's at the count, or a
    // refusal for a press that sends nothing, `iMonFixed2` at the 0 it states, whose device's count of 0 is
    // refused before this is asked anyway. 1833 of the definition's were refused for naming a release group
    // until section 365, which puts the release behind the record's third pointer.
    assert.deepEqual([...outcomes].sort(), [
      ['the code sends nothing on a press', 4],
      ['the definition\'s', 2972],
    ]);
  });
