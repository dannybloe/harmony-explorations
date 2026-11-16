/**
 * The infrared families the catalogue composer still refused after section 359 for want of a rhythm or
 * because the family's table block does not take the code, section 361.
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
 * refused for a conflicting count, a device stating one count and its family another, which no compile here
 * settles.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE_SAMPLE, LAB, needing, require_, skipUnless, skipWithoutIrArchiveSample, slow } from '@freeharmony-sdk/lab';
import {
  type ArchiveProtocol,
  catalogueDevice,
  catalogueCommands,
  type Container,
  devices,
  irGroups,
  parse,
  payloadOf,
  archiveAt,
} from '../../src/node.ts';
import {
  archiveProtocolsByName,
  catalogueCommandBlocks,
  catalogueProtocol,
  composeCatalogueDevices,
  sameTrain,
} from '../../src/build.ts';
import { irBlockWords, irHeaderPointers } from '../../src/internal.ts';

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
  slow(needing(skipWithoutIrArchiveSample(), skipUnless('h650_panasonic_config'))), () => {
    const base = open('h650_panasonic_config');
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE_SAMPLE!));
    const results: string[] = [];
    for (const one of CLOSURE) {
      const theirs = records(open(one.compile), one.group);
      const logitech = new Set(theirs);
      const codes = catalogueCommands(IR_ARCHIVE_SAMPLE!, catalogueDevice(IR_ARCHIVE_SAMPLE!, one.manufacturer, one.model).codeset!);
      for (const powerSteps of [true, false]) {
        const composed = composeCatalogueDevices(base, archiveAt(IR_ARCHIVE_SAMPLE!), [{ manufacturer: one.manufacturer, model: one.model,
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
