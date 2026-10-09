/**
 * The infrared families the catalogue composer still refused after section 359 for want of a rhythm or
 * because the family's table block does not take the code, section 361, `todo-process-logitech.md` 2.3.
 *
 * **What is claimed, and over what.** Two classes, four family spellings each, over the whole archive.
 *
 * * **No rhythm**: every command so refused spells its family otherwise than any definition, in letter case
 *   or with a trailing space. Five spellings name no definition, 222 commands, and each folds to exactly
 *   one definition, the one the command's own `protocol` field names, which is Logitech's protocol id's
 *   name; folding merges no two definitions. So the composer finds a definition by the folded spelling
 *   where the exact one finds none, and a code so spelt composes exactly as the same code spelt as its
 *   definition.
 * * **Block refused**: 67 distinct codes of four families whose names read them and whose whole table
 *   block does not take them. They go to the definition at the device's count, as a code only the
 *   definition reads has since section 359. The calibration is the codes the four rows do take, where the
 *   definition at the row's count sends the row's own train on 4797 of 4834.
 *
 * **Against Logitech.** Two catalogue devices of the harvest's Harmony One compiles hold such a code, a
 * Pioneer receiver one and a Philips television two, and composed whole every record of either is one of
 * Logitech's for the device, the three codes included, except the Philips power step's long press version,
 * which differs the same way without this section. Built at the other count, none of the three is.
 *
 * **What is not claimed.** Anything on a remote; anything about the families no compile here holds,
 * `Entone 56 Bit`, `Galaxis 16 Bit Quad Toggle` and the `Ada 40 Bit`, `AudioAnalogue 14 bit`, `DAM 12 Bit` and
 * `Intellibus 17 Bit ` spellings, which are composed from the definition alone, stated and unverified per decision 15; and the 14 commands of these classes still
 * refused for a conflicting count, todo 2.2.2's.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  type ArchiveProtocol,
  archiveProtocolsByName,
  blockOfStatedCode,
  catalogueCode,
  catalogueCommandBlocks,
  catalogueDevice,
  catalogueCommands,
  catalogueProtocol,
  composableKeycode,
  composeCatalogueDevices,
  type Container,
  devices,
  irBlockWords,
  irGroups,
  irHeaderPointers,
  parse,
  payloadOf,
  sameTrain,
  statedCode,
  statedProtocol,
  TABLE_PRESS_REPEATS,
  waveformOfArchiveCommand,
} from '../src/index.ts';

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
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
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

test('the control: a folded spelling fitting two definitions finds neither, and an exact one still finds its own',
  () => {
    const fake = (name: string) => ({ name }) as unknown as ArchiveProtocol;
    const two = new Map([['Foo 8 Bit', fake('Foo 8 Bit')], ['FOO 8 Bit', fake('FOO 8 Bit')]]);
    assert.equal(catalogueProtocol('G:foo 8 bit:()(0x1)():3', two), undefined);
    assert.equal(catalogueProtocol('G:FOO 8 Bit:()(0x1)():3', two)?.name, 'FOO 8 Bit');
    const one = new Map([['Foo 8 Bit', fake('Foo 8 Bit')]]);
    assert.equal(catalogueProtocol('G:foo  8 bit :()(0x1)():3', one)?.name, 'Foo 8 Bit');
    assert.equal(catalogueProtocol('G:Foo 9 Bit:()(0x1)():3', one), undefined);
  });

test('a code spelling its family otherwise composes exactly as the same code spelt as its definition, at either count',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
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
    // is cataloguePressRepeats's question, todo 2.2.2.
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
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
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

function open(fixture: string): Container {
  const bytes = fixture.startsWith('work/') ? new Uint8Array(readFileSync(join(LAB!, fixture))) : require_(fixture);
  let payload = bytes;
  try { payload = payloadOf(bytes); } catch { /* a bare container */ }
  return parse(payload);
}

/** A group's records as their three blocks' words, `-` for an empty pointer, without the once block's lead in. */
function records(c: Container, group: number): string[] {
  return irGroups(c)![group]!.addresses.map((address) => {
    const blocks = irHeaderPointers(c, address).slice(0, 3).map((pointer) => (pointer === 0 ? '-'
      : irBlockWords(c, pointer)!.filter((word, at, all) => !(word === 0 && at === all.length - 1)).join(',')));
    const words = blocks[0]!.split(',').map(Number);
    return [words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(','), ...blocks.slice(1)].join('|');
  });
}

/** A once block's words as its merged train, for the control at the other count. */
const trainOfWords = (record: string) => record.split('|')[0]!.split(',').map(Number)
  .map((word) => ({ mark: (word & 0x8000) !== 0, us: word & 0x7fff }));

/** The two devices of the harvest's Harmony One compiles holding a code their family's row does not take. */
const CLOSURE = [
  { manufacturer: 'Pioneer', model: 'VSX-90TXV', compile: 'work/harvest/families-one/compile-003-Result.EzHex',
    group: 2, targets: ['InputVideo/Game'], count: 3, other: 1 },
  { manufacturer: 'Philips', model: '70FA930_00S', compile: 'work/harvest/families-one/compile-002-Result.EzHex',
    group: 0, targets: ['InputDvd', 'InputSat'], count: 1, other: 3 },
] as const;

test('a Pioneer receiver and a Philips television holding such codes, composed whole, are Logitech\'s records on a Harmony One but for the Philips power step\'s long press version, the three codes included, and at the other count none of the three is',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config')), () => {
    const base = open('h650_panasonic_config');
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const results: string[] = [];
    for (const one of CLOSURE) {
      const theirs = records(open(one.compile), one.group);
      const logitech = new Set(theirs);
      const codes = catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, one.manufacturer, one.model).codeset!);
      for (const powerSteps of [true, false]) {
        const composed = composeCatalogueDevices(base, IR_ARCHIVE!, [{ manufacturer: one.manufacturer, model: one.model,
          label: 'Test', full: true, powerSteps }], { maxDevices: 99 });
        const device = composed.devices[0]!;
        assert.deepEqual(device.leftOut, [], `${one.model}: every catalogue command composes`);
        const c = parse(composed.bytes);
        const ours = records(c, devices(c).find((d) => d.name === 'Test')!.group!);
        results.push(`${one.model}${powerSteps ? '' : ' without power steps'}: ${ours.filter((r) => logitech.has(r)).length} of ${ours.length}`);
        if (!powerSteps) continue;
        for (const name of one.targets) {
          const record = ours[device.commandNames.indexOf(name)]!;
          assert.ok(logitech.has(record), `${one.model} ${name} is Logitech's record`);
          // The control: the same code built at the count the device does not state is no record of theirs.
          const keycode = codes.find((command) => command.name === name)!.keycode;
          const other = catalogueCommandBlocks(keycode, { repeats: one.other }, protocols);
          assert.ok(other !== undefined && !('refusal' in other));
          assert.equal(theirs.filter((r) => sameTrain(trainOfWords(r), other.once)).length, 0, `${name} at ${one.other}`);
        }
      }
    }
    // The one record of the 47 that is not Logitech's is the Philips power step's long press version, a
    // `Philips 13 Bit` code held 3500 ms, 31 frames against Logitech's 33; composed without the power steps,
    // every record is Logitech's. The composer before this section built it the same way.
    assert.deepEqual(results, [
      'VSX-90TXV: 143 of 143', 'VSX-90TXV without power steps: 141 of 141',
      '70FA930_00S: 46 of 47', '70FA930_00S without power steps: 46 of 46',
    ]);
  });
