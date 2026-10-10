/**
 * A toggling code's record carries two pointer groups, and a code naming a release group carries the
 * release behind the record's third pointer: findings section 365, `todo-process-logitech.md` 2.5.
 *
 * **What is claimed, and over what.** Eighteen catalogue devices are composed whole onto the Harmony 650's
 * configuration and compared record for record with the seventeen device groups Logitech compiled for them,
 * the two PlayStation 3 entries sharing one: all pointers of all groups, word for word, each record of theirs
 * matched at most once. Fifteen hold a toggle family, Philips RC5, Thomson, Galaxis, Microsoft 30 Bit,
 * Philips Hurd long toggle or Magnavox, and three do not, the Samsung BDC8000, whose `Samsung 38 Bit` row
 * built no held block, and the two Sony PlayStation 3 entries, whose one `Logitech 24 Bit` code naming a
 * release group is the only such code on any device here. The compiles are the Harmony One's, the Harmony 700's power hold compiles
 * and the Harmony 650's own configuration. The firmware half, which group a send plays, is
 * `tests/test_toggle_groups.py`.
 *
 * **The controls**: the same composed records with the second group dropped, and with the two groups
 * swapped, which is what a composer writing the toggle bit cleared first would write for a code stating it
 * set; and the release spelt with the carved microsecond or with the stored one, which is how every other
 * block of a configuration ends.
 *
 * **What is not claimed.** Nothing was sent to a remote. The Harmony 525 (arch 9) holds 168 two group
 * records of another class, which section 134 reads as RC6 and which are not matched here, and the arch 8
 * configurations (Harmony 880 or 885) are other people's, read but not composed against.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  archiveProtocolsByName,
  catalogueCommandBlocks,
  compiledBlockWords,
  composeCatalogueDevices,
  type Container,
  devices,
  irGroups,
  irHeaderPointers,
  namesReleaseGroup,
  parse,
  payloadOf,
  statedCodeOfDefinition,
  withToggleCleared,
  withToggleFlipped,
} from '../src/index.ts';

/** A device group of a Logitech compile and the catalogue device it is, known from outside its bytes. */
const CASES = [
  ['compiled_protocols_2', 0, 'Samsung', 'CT8685'],
  ['compiled_protocols_2', 5, 'Thomson', '14MG115'],
  ['compiled_protocols_2', 8, 'Yamaha', 'DVD-S501'],
  ['compiled_protocols_2', 11, 'Microsoft', 'VIP2250'],
  ['compiled_protocols_2', 13, 'Thomson', '21MS56F'],
  ['compiled_protocols', 3, 'Microsoft', 'MS-1039'],
  ['compiled_protocols', 13, 'Samsung', 'CB-5322A'],
  ['compiled_protocols_3', 3, 'Thomson', '25DT66H'],
  ['compiled_protocols_3', 8, 'Thomson', '28DG57H'],
  ['h700_power_hold_compile', 0, 'Barco', '6300'],
  ['h700_power_hold_compile_2', 3, 'Mivar', '14_M3_TVD'],
  ['h700_power_hold_compile_2', 7, 'Thomson', 'DSI-4400'],
  ['h700_power_hold_compile_4', 7, 'Thomson', '25DT60H'],
  ['work/harvest/families-one/compile-002-Result.EzHex', 0, 'Philips', '70FA930_00S'],
  ['work/harvest/families-one/compile-003-Result.EzHex', 1, 'Gemini', 'TestQuhd'],
  ['compiled_protocols_2', 9, 'Samsung', 'BDC8000'],
  ['h650_config_region', 2, 'Sony', 'Playstation_3'],
  ['h650_config_region', 2, 'Sony', 'PlayStation_3_Slim'],
] as const;
const FIXTURES = [...new Set(CASES.flatMap(([fixture]) => (fixture.startsWith('work/') ? [] : [fixture])))];

function open(fixture: string): Container {
  // A harvest compile is read by its path, guarded by the fixtures beside it: `skipUnless` cannot pass
  // without a lab, and a missing compile is a failure rather than a skip.
  const bytes = fixture.startsWith('work/')
    ? (() => {
      const path = join(LAB!, fixture);
      assert.ok(existsSync(path), `${fixture} is in the lab`);
      return new Uint8Array(readFileSync(path));
    })()
    : require_(fixture);
  let payload = bytes;
  try { payload = payloadOf(bytes); } catch { /* a bare container */ }
  return parse(payload);
}

/** Every record of a group as its pointers' blocks, each the words up to its zero, `-` for a NULL. */
function records(c: Container, group: number): string[][] {
  return irGroups(c)![group]!.addresses.map((address) => irHeaderPointers(c, address).map((pointer) => {
    if (pointer === 0) return '-';
    const words: number[] = [];
    for (let at = c.blobOffsetOf(pointer)!; ; at += 2) {
      const word = c.blob[at]! | (c.blob[at + 1]! << 8);
      if (word === 0) break;
      words.push(word);
    }
    return words.join(',');
  }));
}

/** How many of `mine` are records of `theirs`, each of theirs taken at most once. */
function matched(mine: readonly string[], theirs: readonly string[]): number {
  const left = new Map<string, number>();
  for (const one of theirs) left.set(one, (left.get(one) ?? 0) + 1);
  let n = 0;
  for (const one of mine) {
    const k = left.get(one) ?? 0;
    if (k > 0) { n += 1; left.set(one, k - 1); }
  }
  return n;
}

const join3 = (blocks: readonly string[]) => blocks.join('|');
/** The record with its groups in the other order, which is a composer writing the cleared code first. */
const swapped = (blocks: readonly string[]) => (blocks.length === 6 ? [...blocks.slice(3), ...blocks.slice(0, 3)] : blocks);

test('a toggling code\'s record is two groups, the code as stated and then flipped, and the composer\'s records are Logitech\'s on 774 of 797, 623 of its 639 two group records among them',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config', ...FIXTURES)), () => {
    const base = open('h650_panasonic_config');
    const results: string[] = [];
    let all = 0; let whole = 0; let firstOnly = 0; let swap = 0; let two = 0;
    /** Per device with a miss, what the misses are; and the toggling records whose swapped form is another of ours. */
    const missed: string[] = [];
    let pairedCodes = 0;
    for (const [fixture, group, manufacturer, model] of CASES) {
      const composed = composeCatalogueDevices(base, IR_ARCHIVE!, [{ manufacturer, model, label: 'Test', full: true }],
        { maxDevices: 99 });
      assert.deepEqual(composed.devices[0]!.leftOut, [], `${model}: every catalogue command composes`);
      const c = parse(composed.bytes);
      const mine = records(c, devices(c).find((d) => d.name === 'Test')!.group!);
      const theirs = records(open(fixture), group).map(join3);
      const hits = matched(mine.map(join3), theirs);
      const pairs = mine.filter((blocks) => blocks.length === 6).length;
      results.push(`${model}: ${hits} of ${mine.length}, ${pairs} with two groups`);
      all += mine.length; whole += hits; two += pairs;
      // The controls, on the same records: the second group dropped, and the two groups swapped.
      firstOnly += matched(mine.map((blocks) => join3(blocks.slice(0, 3))), theirs);
      swap += matched(mine.map((blocks) => join3(swapped(blocks))), theirs);
      // Where the misses come from: a record theirs holds fewer times than ours, and one that is theirs but
      // for the silence Logitech opens it with, a Harmony One power step's device delay, section 337.
      const theirsUnled = new Set(theirs.map((one) => one.split('|').map((block, k) => {
        if (k % 3 !== 0 || block === '-') return block;
        const words = block.split(',').map(Number);
        return words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(',');
      }).join('|')));
      const left = new Map<string, number>();
      for (const one of theirs) left.set(one, (left.get(one) ?? 0) + 1);
      const ours = mine.map(join3);
      const misses = ours.filter((one) => {
        const k = left.get(one) ?? 0;
        if (k > 0) { left.set(one, k - 1); return false; }
        return true;
      });
      const fewer = misses.filter((one) => theirs.includes(one)).length;
      const led = misses.filter((one) => !theirs.includes(one) && theirsUnled.has(one)).length;
      if (misses.length > 0) missed.push(`${model}: ${fewer} held fewer times, ${led} but for a lead, ${misses.length - fewer - led} other`);
      pairedCodes += mine.filter((blocks) => blocks.length === 6 && ours.includes(join3(swapped(blocks)))).length;
    }
    assert.deepEqual(results, [
      'CT8685: 40 of 41, 41 with two groups',
      '14MG115: 48 of 49, 49 with two groups',
      'DVD-S501: 44 of 46, 46 with two groups',
      'VIP2250: 36 of 37, 37 with two groups',
      '21MS56F: 31 of 33, 33 with two groups',
      'MS-1039: 54 of 55, 55 with two groups',
      'CB-5322A: 93 of 94, 93 with two groups',
      '25DT66H: 23 of 25, 25 with two groups',
      '28DG57H: 20 of 22, 22 with two groups',
      '6300: 34 of 34, 34 with two groups',
      '14_M3_TVD: 22 of 22, 22 with two groups',
      'DSI-4400: 38 of 38, 38 with two groups',
      '25DT60H: 25 of 25, 25 with two groups',
      '70FA930_00S: 46 of 47, 47 with two groups',
      'TestQuhd: 70 of 72, 72 with two groups',
      'BDC8000: 34 of 35, 0 with two groups',
      'Playstation_3: 58 of 61, 0 with two groups',
      'PlayStation_3_Slim: 58 of 61, 0 with two groups',
    ]);
    assert.deepEqual([whole, all, two], [774, 797, 639]);
    // The 23 left: on the Harmony One's devices 16 power step records that are theirs but for the delay
    // Logitech opens them with, section 337; three on each PlayStation 3, records ours holds more times
    // than the compile does, where the codeset states four codes under five more names each written as a record of its own, not asserted here; and the Philips
    // 70FA930's held power step, which did not match before this either. None is a toggling record's second group
    // or a release.
    assert.deepEqual(missed, [
      'CT8685: 0 held fewer times, 1 but for a lead, 0 other',
      '14MG115: 0 held fewer times, 1 but for a lead, 0 other',
      'DVD-S501: 0 held fewer times, 2 but for a lead, 0 other',
      'VIP2250: 0 held fewer times, 1 but for a lead, 0 other',
      '21MS56F: 0 held fewer times, 2 but for a lead, 0 other',
      'MS-1039: 0 held fewer times, 1 but for a lead, 0 other',
      'CB-5322A: 0 held fewer times, 1 but for a lead, 0 other',
      '25DT66H: 0 held fewer times, 2 but for a lead, 0 other',
      '28DG57H: 0 held fewer times, 2 but for a lead, 0 other',
      '70FA930_00S: 0 held fewer times, 0 but for a lead, 1 other',
      'TestQuhd: 0 held fewer times, 2 but for a lead, 0 other',
      'BDC8000: 0 held fewer times, 1 but for a lead, 0 other',
      'Playstation_3: 3 held fewer times, 0 but for a lead, 0 other',
      'PlayStation_3_Slim: 3 held fewer times, 0 but for a lead, 0 other',
    ]);
    // **The controls.** With the second group dropped only the 151 records that never had one match: the
    // BDC8000's 34, the PlayStation 3s' 116 and the CB-5322A's one `Pioneer 32 Bit` record. With the groups
    // swapped, the cleared code first for a code stating the bit set, 163: those 151 and 12 toggling records.
    // Those 12 are among the 13 whose swapped form is another of the device's own records, a code the
    // catalogue states in both of its toggle states under two names, so swapped it is the other name's
    // record. No other toggling record matches swapped, where 623 match in the stated order.
    assert.deepEqual([firstOnly, swap, pairedCodes], [151, 163, 13]);
  });

test('a code naming a release group carries its release behind the third pointer, spelt with no carved or stored microsecond, as the PlayStation 3\'s is',
  needing(skipWithoutIrArchive(), skipUnless('h650_config_region')), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const keycode = 'G:Logitech 24 Bit:()(0x2D11EE)(StopSpacer):3';
    assert.equal(namesReleaseGroup(keycode), true);
    const built = catalogueCommandBlocks(keycode, { repeats: 1 }, protocols);
    assert.ok(built !== undefined && !('refusal' in built) && built.release !== undefined);
    const spell = (carve: boolean, extra: number) => {
      const release = built.release!.map((pulse, at) => (at === built.release!.length - 1 ? { ...pulse, us: pulse.us + extra } : pulse));
      return compiledBlockWords(release, 0, { carve }).map((one) => (one.mark ? 0x8000 : 0) | one.microseconds).join(',');
    };
    // Logitech's tails of the group: the PlayStation 3's one record with a third pointer.
    const tails = records(open('h650_config_region'), 2).flatMap((blocks) => (blocks[2] === '-' ? [] : [blocks[2]!]));
    assert.equal(tails.length, 1);
    assert.equal(spell(false, 0), tails[0]);
    // The controls: carved as an ordinary block's last silence is, or carrying the stored form's microsecond.
    assert.notEqual(spell(true, 0), tails[0]);
    assert.notEqual(spell(false, 1), tails[0]);
  });

test('the toggled code differs from the stated one in its toggle bit alone, and a code whose family states none has no second group',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const rc5 = protocols.get('Philips RC5 13 Bit Toggle')!;
    const frames = statedCodeOfDefinition(rc5, 'G:Philips RC5 13 Bit Toggle:()(0x10C6)():3')!.frames;
    const flipped = withToggleFlipped(rc5, frames)!;
    assert.equal(flipped.length, frames.length);
    // One bit apart, and flipped back it is the code again; cleared, it is one of the two.
    const differing = frames.map((frame, at) => frame.value ^ flipped[at]!.value);
    assert.deepEqual(differing.map((x) => x.toString(2).replaceAll('0', '').length), [1]);
    assert.deepEqual(withToggleFlipped(rc5, flipped), frames);
    const cleared = withToggleCleared(rc5, frames);
    assert.ok([frames, flipped].some((one) => one.every((frame, at) => frame.value === cleared[at]!.value)));
    // A family stating no toggle bit: nothing to flip.
    const nec = protocols.get('Logitech 24 Bit')!;
    assert.equal(withToggleFlipped(nec, statedCodeOfDefinition(nec, 'G:Logitech 24 Bit:()(0x2D11EE)():3')!.frames), undefined);
    assert.equal(namesReleaseGroup('G:Philips RC5 13 Bit Toggle:()(0x10C6)():3'), false);
  });
