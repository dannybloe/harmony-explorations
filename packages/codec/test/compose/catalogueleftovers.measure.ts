/**
 * Measurements over the whole infrared archive that belong with `catalogueleftovers.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * the family spellings that name no definition, and how many codes of four families the table's rows take.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, needing, skipUnlessIrArchiveRelease, skipWithoutIrArchive } from '@harmony/lab';
import { statedCode, statedProtocol, waveformOfArchiveCommand, archiveAt } from '../../src/node.ts';
import {
  archiveProtocolsByName,
  catalogueCode,
  catalogueCommandBlocks,
  catalogueProtocol,
  composableKeycode,
  sameTrain,
  TABLE_PRESS_REPEATS,
} from '../../src/build.ts';
import { blockOfStatedCode } from '../../src/internal.ts';

/** Every command of the archive with its keycode and the `protocol` field beside it, once per codeset. */
let commands: { keycode: string; protocol: string }[] | undefined;
function archiveCommands(): { keycode: string; protocol: string }[] {
  if (commands !== undefined) return commands;
  const out: { keycode: string; protocol: string }[] = [];
  for (const bucket of readdirSync(join(IR_ARCHIVE!, 'codesets'))) {
    for (const file of readdirSync(join(IR_ARCHIVE!, 'codesets', bucket))) {
      const raw = JSON.parse(readFileSync(join(IR_ARCHIVE!, 'codesets', bucket, file), 'utf8')) as unknown;
      const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as
        { keycode?: string; protocol?: string }[];
      for (const { keycode, protocol } of list) {
        if (keycode !== undefined && /^G:[^:]+:/.test(keycode)) out.push({ keycode, protocol: protocol ?? '' });
      }
    }
  }
  commands = out;
  return out;
}
const familyOf = (keycode: string): string => /^G:([^:]+):/.exec(keycode)![1]!;

test('five family spellings in the catalogue\'s codes name no definition, 222 commands, and the folded spelling finds the one the command\'s own protocol field names on every command',
  needing(skipUnlessIrArchiveRelease()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    const unnamed = new Map<string, number>();
    let agree = 0;
    const disagree: string[] = [];
    for (const { keycode, protocol } of archiveCommands()) {
      const family = familyOf(keycode);
      if (!protocols.has(family)) unnamed.set(family, (unnamed.get(family) ?? 0) + 1);
      if (catalogueProtocol(keycode, protocols)?.name === protocol) agree += 1;
      else disagree.push(keycode.slice(0, 50));
    }
    assert.deepEqual([...unnamed].sort(), [
      ['Ada 40 Bit', 82], ['AudioAnalogue 14 bit', 108], ['DAM 12 Bit', 29], ['Intellibus 17 Bit ', 1], ['toshiba 32 Bit', 2],
    ]);
    // The archive's `protocol` field is the name of the protocol id Logitech's service gives every command
    // beside its keycode, so on all 2067863 the definition found is the one Logitech's id names. A reproduction
    // rather than an independent closure: the rule was read off that id. What could fail is the fold below.
    assert.equal(agree, 2067863);
    assert.deepEqual(disagree, []);
    // And folding merges nothing: the 684 definitions fold to 684 spellings.
    const folded = new Set([...protocols.keys()].map((name) => name.trim().replace(/\s+/g, ' ').toLowerCase()));
    assert.equal(protocols.size, 684);
    assert.equal(folded.size, 684);
  });

test('a code spelling its family otherwise composes exactly as the same code spelt as its definition, at either count',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    const tally = new Map<string, number>();
    for (const keycode of new Set(archiveCommands().map(({ keycode }) => keycode))) {
      const family = familyOf(keycode);
      if (protocols.has(family)) continue;
      const definition = catalogueProtocol(keycode, protocols)!;
      const twin = keycode.replace(`G:${family}:`, `G:${definition.name}:`);
      assert.equal(catalogueCode(keycode, protocols)?.family, definition.name, keycode);
      for (const repeats of [1, 3]) {
        const mine = catalogueCommandBlocks(keycode, { repeats }, protocols);
        assert.deepEqual(mine, catalogueCommandBlocks(twin, { repeats }, protocols), keycode);
        const verdict = mine === undefined ? 'table' : 'refusal' in mine ? mine.refusal : 'definition';
        tally.set(`${family} at ${repeats}: ${verdict}`, (tally.get(`${family} at ${repeats}: ${verdict}`) ?? 0) + 1);
      }
    }
    // Every distinct code, by spelling and count. `toshiba 32 Bit`'s family states 1, so at 3 the table's
    // block is still the one sent, as it is for any `Toshiba 32 Bit` code; whether a device stating 3 gets it
    // is cataloguePressRepeats's question.
    assert.deepEqual([...tally].sort(), [
      ['Ada 40 Bit at 1: definition', 79], ['Ada 40 Bit at 3: definition', 79],
      ['AudioAnalogue 14 bit at 1: definition', 35], ['AudioAnalogue 14 bit at 3: definition', 35],
      ['DAM 12 Bit at 1: definition', 29], ['DAM 12 Bit at 3: definition', 29],
      ['Intellibus 17 Bit  at 1: definition', 1], ['Intellibus 17 Bit  at 3: definition', 1],
      ['toshiba 32 Bit at 1: table', 1], ['toshiba 32 Bit at 3: table', 1],
    ]);
  });

/** The four families whose whole table block refuses some codes their names read, and the count each row carries. */
const BLOCK_FAMILIES = ['Entone 56 Bit', 'Galaxis 16 Bit Quad Toggle', 'Philips Hurd 16 Bit LongToggle', 'Pioneer 32 Bit Dual'];

test('on the codes the four rows take, the definition at the row\'s count sends the row\'s train on 4797 of 4834, and the 67 they do not take go to the definition',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE!));
    const calibration = new Map<string, [number, number]>();
    const admitted = new Map<string, number>();
    for (const keycode of new Set(archiveCommands().map(({ keycode }) => keycode))) {
      const family = familyOf(keycode);
      if (!BLOCK_FAMILIES.includes(family) || statedCode(keycode) === undefined) continue;
      const protocol = protocols.get(family)!;
      const count = protocol.pressMinimumRepeats ?? TABLE_PRESS_REPEATS.get(family)!;
      const read = catalogueCode(keycode, protocols)!;
      const built = waveformOfArchiveCommand(protocol, keycode, { repeats: count, asStored: true });
      assert.ok(!('refusal' in built), keycode);
      if (composableKeycode(keycode, read)) {
        const row = calibration.get(family) ?? [0, 0];
        row[1] += 1;
        if (sameTrain(built.once, blockOfStatedCode(read, undefined, 'once')!)) row[0] += 1;
        calibration.set(family, row);
        continue;
      }
      // **The control**: the row's shape is a whole block and it takes none of these codes.
      const entry = statedProtocol(family)!;
      assert.ok(entry.tail !== undefined || entry.quad !== undefined || entry.longToggle !== undefined, family);
      assert.equal(blockOfStatedCode(read, undefined, 'once'), undefined, keycode);
      const blocks = catalogueCommandBlocks(keycode, { repeats: count }, protocols);
      assert.ok(blocks !== undefined && !('refusal' in blocks), keycode);
      assert.ok(sameTrain(blocks.once, built.once), keycode);
      admitted.set(family, (admitted.get(family) ?? 0) + 1);
    }
    assert.deepEqual([...calibration].sort(), [
      ['Entone 56 Bit', [53, 53]], ['Galaxis 16 Bit Quad Toggle', [1459, 1470]],
      ['Philips Hurd 16 Bit LongToggle', [1675, 1700]], ['Pioneer 32 Bit Dual', [1610, 1611]],
    ]);
    // A start group only, three frames in the repeat group, three frames, and one value where the row names two.
    assert.deepEqual([...admitted].sort(), [
      ['Entone 56 Bit', 53], ['Galaxis 16 Bit Quad Toggle', 10], ['Philips Hurd 16 Bit LongToggle', 3],
      ['Pioneer 32 Bit Dual', 1],
    ]);
  });
