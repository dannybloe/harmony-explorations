/**
 * The no screen family's device composer, `todo-compile-350.md` 4.1, held against what Logitech's compiler writes
 * for the same catalogue device on the same model.
 *
 * **The calibration.** The test setup's Panasonic plasma, `Panasonic/TX-P42GT30E`, is composed from the catalogue
 * onto a Logitech compile that does not hold it: `h350_three_devices_config`, the bench Harmony 350 as Logitech's
 * current service compiled it with three devices, section 263, whose bottom left key is free. What comes out is
 * compared, part by part, with the same catalogue device in Logitech's compile of the whole test setup, the lab's
 * `work/setups/h350-test/compile-Result.EzHex`, where it sits on the top right key. **Part by part and not offset by
 * offset**, because that compiler numbers lists, maps, timers and records in an order no compile shows a rule for,
 * and two compiles of one account already differ in it; so a record is compared by its header and its blocks, a
 * list by what it does with every list it calls written out, and the group and the key's place are allowed to
 * differ, since they follow the key. The donor is not the test setup with the plasma taken out: no compile of that
 * exists; taking a device out of Logitech's compile and composing it back is `noscreenremove.test.ts`, 4.1.3.
 *
 * **What it settled, in counts.** The composer writes the 51 records Logitech stores for the plasma, every one of
 * them Logitech's word for word: its keys' commands, Internet on the fifth favourite key, Teletext on no key and
 * the ten digits' one block copies, the last eleven with send lists nothing calls, as in Logitech's,
 * `todo-compile-350.md` 4.1.1 and `noscreenrouting.test.ts`. Each of the 51 sends through a list of Logitech's
 * shape, the timers cancelled, the send and its quantity. The power variable's two transitions are Logitech's, the
 * 50 tenths wait included. The plasma's map binds 39 keys where Logitech's binds 40, every one of the 39 to what
 * Logitech's binds it to; the one it leaves out is Input, which Logitech binds to its TV mode device's InputNext,
 * the LG's, and which the donor's TV mode device has no command for. The key's press and release are Logitech's
 * lists for a key of that place, and the metadata archive names the plasma with Logitech's 63 commands in
 * Logitech's order.
 *
 * **The key table, fitted.** `NO_SCREEN_HARD_KEYS` was fitted to the eight devices of the test setup compile; the
 * test below states, device by device, where Logitech binds a key to the device's own command and the table does
 * not or the other way round. On seven devices the only differences are the favourite key and the volume and mute
 * Logitech sends to the Denon instead of the device's own; the KPN's map binds three of the table's keys, for a
 * reason not read. This gave the reason as the map being the one the activity ends in, until
 * `noscreenactivity.test.ts` found the activity ending in another KPN box's map, of 33 bindings sending one of its
 * own codes, on two other compiles.
 *
 * **The power on delay's waits are a closure**: the catalogue's power on delay, read by `catalogueDevicePower`,
 * split by `powerOnWaits`, is the waits Logitech's compile writes on each of the eight devices, the Knoll's 250
 * tenths as 100, 100 and 50.
 *
 * **A long press device, `todo-compile-350.md` 4.4.** Logitech's compile of the test setup puts a second device on
 * every key's long press: the Knoll top left, the Kodi top right, the Switch bottom left and the Sony HT bottom
 * right, on groups 4 to 7. So the same four are composed from the catalogue onto the donor, on the same keys'
 * long presses, after the plasma on the bottom left key's short press, since the donor's bottom left key is free
 * and a long press goes on a key with a short press device. Each is held against the same device in Logitech's
 * compile as the plasma is, part by part: its group, its records and their send lists, its power variable, its
 * map, the held binding that selects it and the key's press list with its second block of timers, and its names.
 * What it settled, in counts, is in the tests below: all 86 records the composer writes are Logitech's word for
 * word, the Kodi's ten digit copies included, and no device stores its own volume and mute, which each takes from
 * the donor's TV as `volumeSource` says with no receiver in the donor; the four maps differ from Logitech's by the
 * Input key, which Logitech binds to the LG TV's and the donor's TV mode device has none of, and by volume and
 * mute, the Denon's in Logitech's where the donor has no Denon, and bind every other key both hold to the same
 * thing. The whole equality, with the Denon there, is `todo-compile-350.md` 4.1.3's, `noscreenremove.test.ts`.
 *
 * **The order of a key map's tags**, `inCompilerOrder`, is now a simulation of the compiler's hash map rather than
 * a refusal wherever two tags share a slot, since the long press's held tags share slots with the donor's own:
 * Logitech's stored order is the map's state and our tags are put in after it. The composed Knoll map holds the
 * one shared slot of the test setup's device maps, Left and Right, in Logitech's order.
 *
 * **Sources checked first.** Logitech's client compiles nothing for this family, the service does
 * (`reference/logitech/clients.md`). The reference: `reference/architectures/harmony-300-350/memory.md`, the 350's
 * `keys.md`, `reference/config-format/actions.md`; the archive, sections 260 to 265 and 278; the lab's
 * `work/setups/h350-test/chapter4-reading.md`, a reading of the same compile, which agrees on every fact used here.
 * **Which architectures**: the Harmony 350 alone, two compiles of one generation of Logitech's service. The Harmony
 * 300 shares the family and has not been composed for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  type AccountDevice, bytes, catalogueDevicePlan, composeIrGroup, ComposeError, composeNoScreenDevice, type Container, deviceModeLayout, devices,
  compilerHash, irGroups, metadataArchive, NO_SCREEN_FAMILY, NO_SCREEN_HARD_KEYS, parse, powerOnWaits, stateRecords, stateVariables,
  taggedList, TELEVISION_TYPE, volumeSource,
} from '../src/index.ts';
import { familyOf, familyOfArchitecture } from '../src/families/registry.ts';
import { onceWithoutLeadIn, recordKey, spelled, spelledMap } from './noscreenparts.ts';

/** Logitech's compile of the test setup, by its path in the lab, as `packages/bench/test/setup350.test.ts` names it. */
const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const PLASMA = { manufacturer: 'Panasonic', model: 'TX-P42GT30E' };
/** Where the compile holds the plasma: the top right key's short press, so group 1, and map 8. */
const THEIR_GROUP = 1;
const THEIR_MAP = 8;
/** The donor's free key, bottom left, place 2. */
const PLACE = 2;

const needsAll = needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless('h350_three_devices_config'));

function compile(): Container {
  const path = join(LAB!, COMPILE);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(path), `${COMPILE} is in the lab`);
  return parse(new Uint8Array(readFileSync(path)));
}

let memo: { donor: Container; theirs: Container; ours: Container; out: ReturnType<typeof composeNoScreenDevice> } | undefined;
function composed() {
  if (memo !== undefined) return memo;
  const donor = parse(require_('h350_three_devices_config'));
  const out = composeNoScreenDevice(donor, IR_ARCHIVE!, { ...PLASMA, name: 'Plasma', place: PLACE });
  memo = { donor, theirs: compile(), ours: parse(out.bytes), out };
  return memo;
}


test('the registry hands the Harmony 300 and 350 their own family, which refuses every question it has no answer to', () => {
  assert.equal(familyOfArchitecture(16), NO_SCREEN_FAMILY);
  assert.equal(NO_SCREEN_FAMILY.deviceModeKeys, NO_SCREEN_HARD_KEYS);
  // The members that refuse, by name; each says why.
  const refusals: string[] = [];
  const attempt = (name: string, ask: () => unknown) => {
    assert.throws(ask, ComposeError, name);
    refusals.push(name);
  };
  const f = NO_SCREEN_FAMILY;
  const c = undefined as unknown as Container;
  attempt('traits', () => f.traits.screenItemsBeep);
  attempt('activityKeyRules', () => f.activityKeyRules.volume);
  attempt('stateTables', () => f.stateTables.measuredOn);
  attempt('wiring', () => f.wiring.check(c));
  attempt('activityStart', () => f.activityStart.lists);
  for (const name of ['screenItems', 'drawsName', 'composeDeviceScreen', 'activityMenu', 'menuMarkerWriter',
    'composeActivityRow', 'activityDeviceList', 'composeActivityScreen'] as const) {
    attempt(name, () => (f[name] as () => unknown)());
  }
  attempt('sends.switchOnList', () => f.sends.switchOnList(c, undefined as never));
  attempt('sends.sendWriter', () => f.sends.sendWriter(c, undefined as never));
  attempt('sends.sendLists', () => f.sends.sendLists(c));
  attempt('sends.newSendLists', () => f.sends.newSendLists([], 0, 0, 1, 0));
  assert.equal(refusals.length, 17);
  // The fonts answer with a reason, which is how that member refuses; and nothing is lettered.
  assert.match(f.fonts.refusal(104)!, /no screen/);
  assert.deepEqual(f.fonts.faces, []);
  // Holding the family is harmless: a runtime asking whether a member is a promise is not a question to it.
  assert.equal((f.traits as unknown as Record<symbol, unknown>)[Symbol.toStringTag], undefined);
});

test('a power on delay is written as waits of at most ten seconds, the rest last', () => {
  assert.deepEqual(powerOnWaits(250), [100, 100, 50]);
  assert.deepEqual(powerOnWaits(170), [100, 70]);
  assert.deepEqual(powerOnWaits(100), [100]);
  assert.deepEqual(powerOnWaits(15), [15]);
  assert.throws(() => powerOnWaits(0), ComposeError);
});

test('the catalogue\'s power on delay, split into waits, is the waits Logitech\'s compile writes on all eight devices',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const c = compile();
    const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as
      { devices: { name: string; device: string }[] };
    const names = new Map(stateVariables(c).map((one) => [one.index, one.name]));
    const records = stateRecords(c)!;
    const lists = c.pointerArray(7)!;
    let agree = 0;
    for (const one of setup.devices) {
      const [manufacturer, model] = one.device.split('/') as [string, string];
      const plan = catalogueDevicePlan(c, IR_ARCHIVE!, { manufacturer, model, label: one.name, full: true });
      const index = [...names].find(([, name]) => name === `${one.name.replaceAll(' ', '_')}_Power_2`)![0];
      const on = records[index]!.values.find((value) => value.from === 0 && value.to === 1)!;
      const at = c.blobOffsetOf(lists[on.operand]!)!;
      const waits = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => k)
        .filter((k) => bytes.u8(c.blob, at + 3 + 3 * k) === 0x7c).map((k) => bytes.u8(c.blob, at + 1 + 3 * k));
      assert.deepEqual(powerOnWaits(plan.device.powerOnDelay!), waits, one.name);
      agree += 1;
    }
    assert.equal(agree, 8);
  });

test('the family\'s key table gives every device of Logitech\'s compile the keys Logitech bound to its own commands, but the favourite key, the volume sent elsewhere and the KPN',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const c = compile();
    // Where each device is, read off the compile: its group by its power variable's sends, its map by entry 0.
    const groupOf: Record<string, number> = { LG_TV: 0, Plasma: 1, Denon: 2, KPN: 3, Knoll: 4, Kodi: 5, Switch: 6, Sony_HT: 7 };
    const mapOf: Record<string, number> = { LG_TV: 1, Plasma: 8, Denon: 4, KPN: 3, Knoll: 2, Kodi: 7, Switch: 5, Sony_HT: 6 };
    assert.deepEqual(devices(c).map((one) => `${one.group} ${one.name}`), Object.entries(groupOf).map(([name, group]) => `${group} ${name}`));
    const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as
      { devices: { name: string; device: string }[] };
    const differences: Record<string, string[]> = {};
    const matched: Record<string, number> = {};
    for (const one of setup.devices) {
      const label = one.name.replaceAll(' ', '_');
      const [manufacturer, model] = one.device.split('/') as [string, string];
      const plan = catalogueDevicePlan(c, IR_ARCHIVE!, { manufacturer, model, label, full: true });
      // Every command's record as the composer builds it, laid out in a scratch copy and read back by content.
      const scratch = parse(composeIrGroup(c, plan.device.commands).bytes);
      const ours = irGroups(scratch)!.at(-1)!.addresses.map((address) => recordKey(scratch, address));
      const theirs = irGroups(c)![groupOf[label]!]!.addresses.map((address) => recordKey(c, address));
      const lists = c.pointerArray(7)!;
      // Logitech's bindings of the device's own codes, by scan: a call of a list sending one of its records.
      const bound = new Map<number, string>();
      for (const entry of taggedList(c, c.pointerArray(6)![mapOf[label]!]!)!.entries) {
        const at = c.blobOffsetOf(lists[entry.operand]!)!;
        const sends = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => k)
          .filter((k) => bytes.u8(c.blob, at + 3 + 3 * k) === 0x7d).map((k) => bytes.u16(c.blob, at + 1 + 3 * k));
        if (entry.opcode !== 0x7f || sends.length !== 1 || sends[0]! >> 8 !== groupOf[label]) continue;
        bound.set(entry.tag & 0x3f, theirs[sends[0]! & 0xff]!);
      }
      const layout = deviceModeLayout(plan.wanted, NO_SCREEN_HARD_KEYS);
      const names = (key: string | undefined) => (key === undefined ? '-' : plan.wanted.filter((_, k) => ours[k] === key).join('/'));
      const out: string[] = [];
      let same = 0;
      for (const scan of [...new Set([...bound.keys(), ...layout.keys.keys()])].sort((a, b) => a - b)) {
        // The power key is the composer's, not the table's.
        if (scan === 3) continue;
        const want = layout.keys.get(scan);
        const wantKey = want === undefined ? undefined : ours[plan.wanted.indexOf(want)];
        if (wantKey === bound.get(scan)) same += 1;
        else out.push(`${scan} ${names(bound.get(scan))} ${want ?? '-'}`);
      }
      differences[label] = out;
      matched[label] = same;
    }
    // Scan, then what Logitech binds of the device's own and what the table gives it. The favourite key, scan 2,
    // takes a soft button's command; volume and mute go to the Denon on the Kodi and the Sony HT, which have their
    // own; and the KPN's map binds few of its own, for a reason not read, `noscreenactivity.test.ts`.
    assert.deepEqual(differences, {
      // The LG TV's own Input binding is the one every map of the compile carries, the LG TV's InputNext.
      LG_TV: ['2 Home/SmartMenu -', '35 InputNext -'],
      Plasma: ['2 Internet -'],
      Denon: [],
      KPN: [10, 12, 13, 14, 15, 17, 18, 20, 22, 23, 24, 27, 28, 29, 30, 31, 33, 36, 37, 39, 40, 41, 42, 44, 45, 46, 47, 48, 51, 53, 55]
        .map((scan) => `${scan} - ${layout350(scan)}`),
      Kodi: ['15 - Mute', '49 - VolumeUp', '52 - VolumeDown'],
      Switch: [],
      Sony_HT: ['15 - Mute', '49 - VolumeUp', '52 - VolumeDown'],
      Knoll: [],
    });
    // The keys where the two agree, the power key left out: 172 over the eight, 108 on the five whose maps hold
    // nothing but their own commands and the Input key.
    assert.deepEqual(matched, { LG_TV: 35, Plasma: 37, Denon: 27, KPN: 3, Kodi: 36, Switch: 3, Sony_HT: 25, Knoll: 6 });
  });

/** The command the table gives the KPN on a scan, which the assertion above spells out. */
function layout350(scan: number): string {
  const names: Record<number, string> = {
    10: 'Menu', 12: 'Exit', 13: 'Red', 14: 'DirectionLeft', 15: 'Mute', 17: '4', 18: '7', 20: '0', 22: 'Rewind', 23: 'Record',
    24: '1', 27: 'Green', 28: 'Yellow', 29: 'Blue', 30: 'FastForward', 31: 'DirectionRight', 33: 'Guide', 36: 'Info', 37: '6',
    39: '3', 40: 'Stop', 41: 'ChannelDown', 42: 'DirectionDown', 44: 'Play', 45: '9', 46: 'Pause', 47: '2', 48: '5',
    51: 'DirectionUp', 53: '8', 55: 'ChannelUp',
  };
  return names[scan]!;
}

test('the composed plasma\'s records are the 51 Logitech stores for it, word for word, and the 11 no key reaches are the same 11 in both',
  needsAll, () => {
    const { ours, theirs, out } = composed();
    assert.ok(ours.allChecksPass);
    assert.equal(out.group, PLACE);
    const mine = irGroups(ours)![PLACE]!.addresses.map((address) => recordKey(ours, address));
    const logitech = irGroups(theirs)![THEIR_GROUP]!.addresses.map((address) => recordKey(theirs, address));
    // 37 commands on the family's keys, Internet on the fifth favourite key and Teletext on none, `keys.ts`; the two
    // power steps; and the ten digits' one block copies.
    assert.equal(out.commands.length, 39);
    assert.deepEqual(out.unbound, ['Teletext']);
    assert.equal(out.keys.get(2), 'Internet');
    assert.equal(out.digitCopies, 10);
    assert.equal(mine.length, 51);
    assert.equal(logitech.length, 51);
    assert.equal(mine.filter((key) => logitech.includes(key)).length, 51);
    // The copies are what a one block copy is: a digit's code with no silence in front of it and no held block.
    const ourCodes = irGroups(ours)![PLACE]!.addresses.map((address) => onceWithoutLeadIn(ours, address).code);
    const digits = out.commands.flatMap((name, k) => (/^[0-9]$/.test(name) ? [ourCodes[k]] : []));
    const copies = (c: Container, group: number) => irGroups(c)![group]!.addresses.filter((address) => {
      const one = onceWithoutLeadIn(c, address);
      return !one.held && one.opening === 0 && digits.includes(one.code);
    }).map((address) => recordKey(c, address)).sort();
    assert.equal(copies(theirs, THEIR_GROUP).length, 10);
    assert.deepEqual(copies(ours, PLACE), copies(theirs, THEIR_GROUP));
    // The records whose send lists nothing in the file calls, no `lo hi 7F` naming the list anywhere: the ten copies
    // and Teletext, in Logitech's compile and in ours.
    const unreached = (c: Container, group: number) => {
      const lists = c.pointerArray(7)!;
      const called = new Set<number>();
      for (let k = 0; k + 2 < c.blob.length; k += 1) if (c.blob[k + 2] === 0x7f) called.add(bytes.u16(c.blob, k));
      return irGroups(c)![group]!.addresses.filter((_, record) => lists.every((address, index) => {
        const at = c.blobOffsetOf(address)!;
        return bytes.u8(c.blob, at) !== 3 || bytes.u16(c.blob, at + 4) !== ((group << 8) | record) || !called.has(index);
      })).map((address) => recordKey(c, address)).sort();
    };
    assert.equal(unreached(theirs, THEIR_GROUP).length, 11);
    assert.deepEqual(unreached(ours, PLACE), unreached(theirs, THEIR_GROUP));
  });

test('every record of the composed plasma sends through a list of Logitech\'s shape, as Logitech\'s list for the same record does',
  needsAll, () => {
    const { ours, theirs } = composed();
    const listsOf = (c: Container, group: number) => {
      const keys = irGroups(c)![group]!.addresses.map((address) => recordKey(c, address));
      const out = new Map<string, string>();
      for (const address of c.pointerArray(7)!) {
        const at = c.blobOffsetOf(address)!;
        const count = bytes.u8(c.blob, at);
        const body = Array.from({ length: count }, (_, k) => [bytes.u16(c.blob, at + 1 + 3 * k), bytes.u8(c.blob, at + 3 + 3 * k)] as const);
        const send = body.find(([, opcode]) => opcode === 0x7d);
        if (send === undefined || send[0] >> 8 !== group || count !== 3) continue;
        // The group byte of the send and the quantity follows the key, so it is written as `g`.
        out.set(keys[send[0] & 0xff]!, body.map(([operand, opcode]) => (opcode === 0x7d ? '7d:g/r'
          : opcode === 0x7c ? `7c:g/${operand & 0xff}` : `${opcode.toString(16)}:${operand.toString(16)}`)).join(' '));
      }
      return out;
    };
    const mine = listsOf(ours, PLACE);
    const logitech = listsOf(theirs, THEIR_GROUP);
    assert.equal(mine.size, 51);
    assert.equal([...mine].filter(([key, body]) => logitech.get(key) === body).length, 51);
    // Every one opens by cancelling the timers and carries a quantity of 1, the power steps' included, which is
    // the plasma's inter key delay in the catalogue.
    assert.deepEqual([...new Set(mine.values())], ['7:fffb 7d:g/r 7c:g/1']);
  });

test('the composed plasma\'s power variable is Logitech\'s: off sends the power off step, on sends the power on step and waits 50 tenths',
  needsAll, () => {
    const { ours, theirs, out } = composed();
    const transitions = (c: Container, name: string) => {
      const index = stateVariables(c).find((one) => one.name === name)!.index;
      const record = stateRecords(c)![index]!;
      return {
        first: record.first, max: record.second,
        values: record.values.map((one) => `${one.from}>${one.to} ${spelled(c, one)}`).sort(),
      };
    };
    assert.equal(stateVariables(ours).find((one) => one.name === 'Plasma_Power_2')?.index, out.device.variable);
    const mine = transitions(ours, 'Plasma_Power_2');
    assert.deepEqual(mine, transitions(theirs, 'Plasma_Power_2'));
    assert.equal(mine.values.length, 2);
    assert.match(mine.values[0]!, /^0>1 \(\(.*\) 7c:32\)$/);
  });

test('the composed plasma\'s key map binds 39 keys, each to what Logitech\'s binds it to; Logitech\'s binds Input besides, to a TV mode device the donor does not have',
  needsAll, () => {
    const { donor, ours, theirs, out } = composed();
    const mine = spelledMap(ours, out.map);
    const logitech = spelledMap(theirs, THEIR_MAP);
    assert.equal(mine.size, 39);
    assert.equal(logitech.size, 40);
    assert.deepEqual([...mine].filter(([tag, body]) => logitech.get(tag) !== body), []);
    // Input, a press: the LG TV's InputNext in Logitech's compile, whose TV key holds the LG. The donor's TV key holds
    // a television with no input command, so no map of the donor binds Input and neither does ours, `INPUT_KEY`.
    assert.deepEqual([...logitech.keys()].filter((tag) => !mine.has(tag)).sort((a, b) => a - b), [0xa3]);
    assert.equal(donor.pointerArray(6)!.filter((_, entry) => entry > 0 && spelledMap(donor, entry).has(0xa3)).length, 0);
    // The power key switches the power variable, as Logitech's does for a device switched on and off by two steps.
    assert.equal(out.power, 'variable');
    assert.equal(mine.get(0x83), '(1f:fb00 (71:80vv 9v:1 9v:0))');
    // The map's tags in the compiler's order, as every map of Logitech's with no two tags in one slot is stored.
    const tags = taggedList(ours, ours.pointerArray(6)![out.map]!)!.entries.map((one) => one.tag);
    const theirOrder = taggedList(theirs, theirs.pointerArray(6)![THEIR_MAP]!)!.entries.map((one) => one.tag).filter((tag) => tags.includes(tag));
    assert.deepEqual(tags, theirOrder);
  });

test('the bottom left key selects the composed plasma\'s map when let go and lights its pin when pressed, as Logitech\'s lists for that key do',
  needsAll, () => {
    const { donor, ours, theirs, out } = composed();
    const before = spelledMap(donor, 0);
    const after = spelledMap(ours, 0);
    // Two tags added to the key table, the bottom left key's press and release, and nothing else changed.
    assert.deepEqual([...after.keys()].filter((tag) => !before.has(tag)).sort((x, y) => x - y), [0x47, 0x87]);
    for (const [tag, body] of before) assert.equal(after.get(tag), body, tag.toString(16));
    assert.equal(after.get(0x47), `(7:fffb 1f:ff${out.map.toString(16).padStart(2, '0')})`);
    // The press: the timers cancelled, pin 1 switched, and two timers started, which switch it at 400 and 600
    // ticks. Logitech's press list for the same key carries the same block for its short press device first.
    const timers = (c: Container, list: string) => [...list.matchAll(/1f:eb([0-9a-f]{2})/g)].map((m) => {
      const at = c.blobOffsetOf(c.pointerArray(8)![parseInt(m[1]!, 16)]!)!;
      return `${c.blob[at]}/${c.blob[at + 1]! | (c.blob[at + 2]! << 8)}/${bytes.u16(c.blob, at + 4).toString(16)}:${c.blob[at + 6]!.toString(16)}`;
    });
    const mine = after.get(0x87)!;
    const logitech = spelledMap(theirs, 0).get(0x87)!;
    assert.equal(mine.replace(/eb[0-9a-f]{2}/g, 'ebnn'), '(7:fffb 1f:e912 1f:ebnn 1f:ebnn)');
    assert.ok(logitech.replace(/eb[0-9a-f]{2}/g, 'ebnn').startsWith('(7:fffb 1f:e912 1f:ebnn 1f:ebnn '));
    assert.deepEqual(timers(ours, mine), ['0/400/e910:1f', '0/600/e912:1f']);
    assert.deepEqual(timers(theirs, logitech).slice(0, 2), timers(ours, mine));
    // Six timers became eight.
    assert.equal(ours.pointerArray(8)!.length - donor.pointerArray(8)!.length, 2);
  });

test('the metadata archive names the composed plasma with Logitech\'s commands in Logitech\'s order, after the donor\'s devices',
  needsAll, () => {
    const { donor, ours, theirs } = composed();
    const mine = metadataArchive(ours)!.devices;
    const before = metadataArchive(donor)!.devices;
    assert.equal(mine.length, before.length + 1);
    assert.deepEqual(mine.slice(0, -1), before);
    const plasma = mine.at(-1)!;
    const logitech = metadataArchive(theirs)!.devices.find((one) => one.name === 'Plasma')!;
    assert.equal(plasma.name, 'Plasma');
    assert.equal(plasma.index, before.length);
    // Logitech's states the account's own number for the device, which a composed device has none of; it is given
    // the next number above the donor's highest, so the numbers ascend along the archive as in every Logitech file,
    // todo-compile-350.md 4.1.4.
    assert.ok(logitech.deviceId !== undefined);
    assert.equal(Number(plasma.deviceId), Math.max(...before.map((one) => Number(one.deviceId))) + 1);
    const ascending = (c: Container) => metadataArchive(c)!.devices.map((one) => Number(one.deviceId))
      .every((id, k, all) => k === 0 || id > all[k - 1]!);
    assert.ok(ascending(ours));
    assert.ok(ascending(theirs));
    assert.deepEqual(plasma.commands, logitech.commands);
    assert.equal(plasma.commands.length, 63);
    // Everything after the devices, the log area's record layout, is the donor's.
    const tail = (c: Container) => metadataArchive(c)!.xml.slice(metadataArchive(c)!.xml.indexOf('</Devices>'));
    assert.equal(tail(ours), tail(donor));
  });

// The rule `withMetadataDevice` writes by, held on every device of Logitech's compile rather than the plasma alone:
// the setup's order, each device's index its position, and its catalogue's command names sorted by character code
// and numbered from 0. Counts per device so a reader that drops a command shows which device it was.
test('Logitech\'s compile names each of the eight devices in the setup\'s order with every command of its catalogue, sorted by character code and numbered from 0',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const c = compile();
    const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as
      { devices: { name: string; device: string }[] };
    const named = metadataArchive(c)!.devices;
    assert.deepEqual(named.map((one) => `${one.index} ${one.name}`), setup.devices.map((one, k) => `${k} ${one.name}`));
    const counts: Record<string, number> = {};
    for (const one of setup.devices) {
      const [manufacturer, model] = one.device.split('/') as [string, string];
      const plan = catalogueDevicePlan(c, IR_ARCHIVE!, { manufacturer, model, label: one.name.replaceAll(' ', '_'), full: true });
      const sorted = [...new Set(plan.available.map((command) => command.name))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const theirs = named.find((device) => device.name === one.name)!.commands;
      assert.deepEqual(theirs.map((command) => `${command.index} ${command.name}`), sorted.map((name, k) => `${k} ${name}`), one.name);
      counts[one.name] = theirs.length;
    }
    assert.deepEqual(counts, { 'LG TV': 63, Plasma: 63, Denon: 118, KPN: 38, Kodi: 59, Switch: 10, 'Sony HT': 56, Knoll: 12 });
  });

test('composing the plasma leaves every one of the donor\'s parts as it was, read by content',
  needsAll, () => {
    const { donor, ours } = composed();
    // The donor's groups, record for record, and the new one where the key's place says.
    const groups = (c: Container) => irGroups(c)!.map((group) => group.addresses.map((address) => recordKey(c, address)).join(';'));
    const [b, a] = [groups(donor), groups(ours)];
    assert.deepEqual(a.map((one, k) => (k === PLACE ? '' : one)), b);
    assert.equal(b[PLACE], '');
    // The donor's maps, binding for binding, all but the key table, which gains the two tags above.
    for (let entry = 1; entry < donor.pointerArray(6)!.length; entry += 1) {
      assert.deepEqual([...spelledMap(ours, entry)], [...spelledMap(donor, entry)], `map ${entry}`);
    }
    // The donor's variables and their transitions by name; the plasma's is the one added.
    const named = (c: Container) => new Map(stateVariables(c).map((one) => [one.name, stateRecords(c)![one.index]!.values
      .map((v) => `${v.from}>${v.to} ${spelled(c, v)}`).join(' ')]));
    const [vb, va] = [named(donor), named(ours)];
    assert.deepEqual([...va.keys()].filter((name) => !vb.has(name)), ['Plasma_Power_2']);
    for (const [name, body] of vb) assert.equal(va.get(name), body, name);
    assert.deepEqual(devices(ours).filter((one) => one.name !== undefined).map((one) => one.group), [0, 1, PLACE]);
  });

test('the composer refuses what no compile shows or a later step builds', needsAll, () => {
  const { donor, ours } = composed();
  const compose = (c: Container, request: Partial<Parameters<typeof composeNoScreenDevice>[2]>) => () =>
    composeNoScreenDevice(c, IR_ARCHIVE!, { ...PLASMA, name: 'Plasma', place: PLACE, ...request });
  // A long press on the bottom left key, which holds no short press device in the donor.
  assert.throws(compose(donor, { press: 'long' }), /holds no short press device/);
  assert.throws(compose(donor, { place: 0 }), /top left key/);
  assert.throws(compose(donor, { place: 4 }), /place is 0 to 3/);
  // The top right key holds a device already.
  assert.throws(compose(donor, { place: 1 }), /already holds a device/);
  // A second plasma by name, and a second device on the key just used.
  assert.throws(compose(ours, { place: 3 }), /already here/);
  assert.throws(compose(ours, { name: 'Other' }), /already holds a device/);
  assert.equal(familyOf(ours), NO_SCREEN_FAMILY);
});

// ---------------------------------------------------------------------------------------------------------------
// The order inside a shared bucket, which `inCompilerOrder` simulates, read off the family's key tables.

// `reference/config-format/layout.md` "Two keys in one bucket": the key table's pair `0x2E` and `0x85` share a
// bucket at 16 and at 32 buckets and are stored one way at 16 and the other at 32, which is Java 6 doubling the table
// and moving each bucket's entries to the head of their new bucket. Six key tables of six compiles: three at 16
// buckets, and three at 32, two of which are one setup compiled twice. A review over every arch 16 container the
// lab holds found the same direction in all fourteen distinct ones, nine at 16 and five at 32; the six here are the
// ones the lab registers by name or the test names by path. The pair `0x2F` and `0x84` flips alike.
test('the family\'s key tables store 0x85 before 0x2E at 16 buckets and 0x2E before 0x85 at 32, while 0x2D and 0x86 keep their order across the doubling on two of three',
  needing(skipWithoutLab(), skipUnless('h350_three_devices_config', 'h350_config', 'h300_programmed_config', 'h350_programmed_config')), () => {
    const tables: Record<string, Container> = {
      three: parse(require_('h350_three_devices_config')),
      factory: parse(require_('h350_config')),
      h300: parse(require_('h300_programmed_config')),
      programmed: parse(require_('h350_programmed_config')),
      setup: compile(),
      setupFirst: (() => {
        const path = join(LAB!, 'work/setups/h350-test/first-compile/compile-Result.EzHex');
        assert.ok(existsSync(path));
        return parse(new Uint8Array(readFileSync(path)));
      })(),
    };
    const seen: Record<string, string> = {};
    const other: Record<string, string> = {};
    const slotOf = (tag: number, buckets: number) => compilerHash(tag) & (buckets - 1);
    for (const [name, c] of Object.entries(tables)) {
      const tags = taggedList(c, c.pointerArray(6)![0]!)!.entries.map((one) => one.tag);
      const buckets = tags.length > 12 ? 32 : 16;
      // The two share a bucket at the table's size, which is what makes their order a tie at all.
      assert.equal(slotOf(0x2e, buckets), slotOf(0x85, buckets), name);
      seen[name] = `${buckets} ${tags.indexOf(0x85) < tags.indexOf(0x2e) ? '85 first' : '2e first'}`;
      // The other pair at that bucket, Watch TV's press and a pin event, which does not flip alike.
      assert.equal(slotOf(0x2d, buckets), slotOf(0x86, buckets), name);
      other[name] = `${buckets} ${tags.indexOf(0x86) < tags.indexOf(0x2d) ? '86 first' : '2d first'}`;
    }
    assert.deepEqual(other, {
      three: '16 86 first', factory: '16 86 first', h300: '16 86 first',
      programmed: '32 2d first', setup: '32 86 first', setupFirst: '32 86 first',
    });
    assert.deepEqual(seen, {
      three: '16 85 first', factory: '16 85 first', h300: '16 85 first',
      programmed: '32 2e first', setup: '32 2e first', setupFirst: '32 2e first',
    });
  });

// ---------------------------------------------------------------------------------------------------------------
// A long press device, todo-compile-350.md 4.4.

/** The four long press devices of Logitech's compile: the key's place, and its group and map there. */
const LONG = [
  { manufacturer: 'Knoll', model: 'HDP-1100', name: 'Knoll', place: 0, theirGroup: 4, theirMap: 2 },
  { manufacturer: 'Plex', model: 'Plex_Player', name: 'Kodi', place: 1, theirGroup: 5, theirMap: 7 },
  { manufacturer: 'Ligawo', model: '3090063', name: 'Switch', place: 2, theirGroup: 6, theirMap: 5 },
  { manufacturer: 'Sony', model: 'DAV-C540', name: 'Sony HT', place: 3, theirGroup: 7, theirMap: 6 },
] as const;
/** The donor's TV's map, the TV key's short press device: `h350_three_devices_config`'s map 1. */
const TV_MAP = 1;
/** Each key's scan code by place, the reference's: top left 5, top right 1, bottom left 7, bottom right 4. */
const SCAN_OF_PLACE = [5, 1, 7, 4] as const;

let longMemo: {
  donor: Container; before: Container; ours: Container; theirs: Container;
  outs: Map<string, ReturnType<typeof composeNoScreenDevice>>;
} | undefined;
/**
 * The donor's account as `volumeSource` asks about it, in the metadata archive's order: its KPN, a set top box,
 * and its TV, a television whose command list is the plasma's, then the plasma composed onto it. The Chromecast
 * the archive names holds no group and no map. No receiver, so a device that is neither takes the TV's volume.
 */
const DONOR_ACCOUNT: readonly AccountDevice[] = [
  { name: 'KPN', deviceType: 18 }, { name: 'TV', deviceType: TELEVISION_TYPE }, { name: 'Plasma', deviceType: TELEVISION_TYPE },
];

/** The donor with the plasma on the bottom left key's short press, then the four long press devices in turn. */
function longComposed() {
  if (longMemo !== undefined) return longMemo;
  const donor = parse(require_('h350_three_devices_config'));
  const before = parse(composeNoScreenDevice(donor, IR_ARCHIVE!, { ...PLASMA, name: 'Plasma', place: PLACE }).bytes);
  let ours = before;
  const outs = new Map<string, ReturnType<typeof composeNoScreenDevice>>();
  for (const one of LONG) {
    const deviceType = catalogueDevicePlan(ours, IR_ARCHIVE!, { manufacturer: one.manufacturer, model: one.model, label: 'X', full: true }).entry.deviceType;
    const out = composeNoScreenDevice(ours, IR_ARCHIVE!, {
      manufacturer: one.manufacturer, model: one.model, name: one.name, place: one.place, press: 'long',
      volumeFrom: volumeSource({ name: one.name, deviceType }, DONOR_ACCOUNT),
    });
    outs.set(one.name, out);
    ours = parse(out.bytes);
  }
  longMemo = { donor, before, ours, theirs: compile(), outs };
  return longMemo;
}

test('a long press device takes group 4 plus its key\'s place on all four keys, the group Logitech\'s compile gives the same device',
  needsAll, () => {
    const { ours, theirs, outs } = longComposed();
    assert.ok(ours.allChecksPass);
    // Logitech's group for each, read off its compile by the device's name.
    const theirGroups = LONG.map((one) => devices(theirs).find((device) => device.name === one.name.replaceAll(' ', '_'))!.group);
    assert.deepEqual(theirGroups, LONG.map((one) => one.theirGroup));
    assert.deepEqual(LONG.map((one) => outs.get(one.name)!.group), theirGroups);
    assert.deepEqual(LONG.map((one) => outs.get(one.name)!.group), [4, 5, 6, 7]);
    assert.deepEqual(devices(ours).map((one) => `${one.group} ${one.name ?? '-'}`),
      ['0 TV', '1 KPN', '2 Plasma', '3 -', '4 Knoll', '5 Kodi', '6 Switch', '7 Sony_HT']);
  });

test('a composed long press device\'s records are Logitech\'s word for word, the Kodi\'s ten digit copies included, with volume and mute stored by none of the four',
  needsAll, () => {
    const { ours, theirs, outs } = longComposed();
    const counts: Record<string, { ours: number; theirs: number; shared: number; digitCopies: number; borrowed: number[] }> = {};
    for (const one of LONG) {
      const out = outs.get(one.name)!;
      const mine = irGroups(ours)![one.theirGroup]!.addresses.map((address) => recordKey(ours, address));
      const logitech = irGroups(theirs)![one.theirGroup]!.addresses.map((address) => recordKey(theirs, address));
      counts[one.name] = {
        ours: mine.length, theirs: logitech.length, shared: mine.filter((key) => logitech.includes(key)).length,
        digitCopies: out.digitCopies, borrowed: [...out.borrowed.keys()].sort((x, y) => x - y),
      };
    }
    // The four take their volume and mute from the donor's TV, `volumeSource`, so none stores its own, as Logitech's
    // compile stores none for the four, whose volume it sends to the Denon; the Kodi, a media player, gets the ten
    // one block copies of its digits Logitech stores for it, `DIGIT_COPIES_BY_TYPE`, which nothing calls.
    assert.deepEqual(counts, {
      Knoll: { ours: 8, theirs: 8, shared: 8, digitCopies: 0, borrowed: [15, 49, 52] },
      Kodi: { ours: 47, theirs: 47, shared: 47, digitCopies: 10, borrowed: [15, 49, 52] },
      Switch: { ours: 5, theirs: 5, shared: 5, digitCopies: 0, borrowed: [15, 49, 52] },
      'Sony HT': { ours: 26, theirs: 26, shared: 26, digitCopies: 0, borrowed: [15, 49, 52] },
    });
  });

test('every record of a composed long press device sends through a list of Logitech\'s shape, and each Logitech also stores through the list Logitech has for it',
  needsAll, () => {
    const { ours, theirs } = longComposed();
    const listsOf = (c: Container, group: number) => {
      const keys = irGroups(c)![group]!.addresses.map((address) => recordKey(c, address));
      const out = new Map<string, string>();
      for (const address of c.pointerArray(7)!) {
        const at = c.blobOffsetOf(address)!;
        const count = bytes.u8(c.blob, at);
        const body = Array.from({ length: count }, (_, k) => [bytes.u16(c.blob, at + 1 + 3 * k), bytes.u8(c.blob, at + 3 + 3 * k)] as const);
        const send = body.find(([, opcode]) => opcode === 0x7d);
        if (send === undefined || send[0] >> 8 !== group || count !== 3) continue;
        out.set(keys[send[0] & 0xff]!, body.map(([operand, opcode]) => (opcode === 0x7d ? '7d:g/r'
          : opcode === 0x7c ? `7c:g/${operand & 0xff}` : `${opcode.toString(16)}:${operand.toString(16)}`)).join(' '));
      }
      return out;
    };
    // Per device, our send lists and how many of them are Logitech's list for the same record.
    const agree: Record<string, [number, number]> = {};
    const shapes: Record<string, string[]> = {};
    for (const one of LONG) {
      const mine = listsOf(ours, one.theirGroup);
      const logitech = listsOf(theirs, one.theirGroup);
      agree[one.name] = [mine.size, [...mine].filter(([key, body]) => logitech.get(key) === body).length];
      // Every one of ours is the shape: the timers cancelled, the send, and
      // the device named with a quantity, which is 1 but on a power step, where it is the device's own inter key
      // delay, 5 on the Switch and on the Sony HT.
      shapes[one.name] = [...new Set(mine.values())].sort();
    }
    assert.deepEqual(agree, { Knoll: [8, 8], Kodi: [47, 47], Switch: [5, 5], 'Sony HT': [26, 26] });
    assert.deepEqual(shapes, {
      Knoll: ['7:fffb 7d:g/r 7c:g/1'], Kodi: ['7:fffb 7d:g/r 7c:g/1'],
      Switch: ['7:fffb 7d:g/r 7c:g/1', '7:fffb 7d:g/r 7c:g/5'], 'Sony HT': ['7:fffb 7d:g/r 7c:g/1', '7:fffb 7d:g/r 7c:g/5'],
    });
  });

test('a composed long press device\'s power variable is Logitech\'s for the same device, transition for transition',
  needsAll, () => {
    const { ours, theirs, outs } = longComposed();
    const transitions = (c: Container, name: string) => {
      const index = stateVariables(c).find((one) => one.name === name)!.index;
      const record = stateRecords(c)![index]!;
      return { first: record.first, max: record.second, values: record.values.map((one) => `${one.from}>${one.to} ${spelled(c, one)}`).sort() };
    };
    const power: Record<string, string> = {};
    for (const one of LONG) {
      const name = `${one.name.replaceAll(' ', '_')}_Power_2`;
      assert.deepEqual(transitions(ours, name), transitions(theirs, name), one.name);
      power[one.name] = outs.get(one.name)!.power;
    }
    // How each one's power key works: a toggle sends its step, two steps switch the variable.
    assert.deepEqual(power, { Knoll: 'variable', Kodi: 'toggle', Switch: 'variable', 'Sony HT': 'toggle' });
  });

/** The infrared groups a map's binding of `tag` sends from, every list it calls written out. */
function groupsSent(c: Container, map: number, tag: number): number[] {
  const entry = taggedList(c, c.pointerArray(6)![map]!)!.entries.find((one) => one.tag === tag)!;
  const out = new Set<number>();
  const walk = (list: number, depth: number) => {
    const at = c.blobOffsetOf(c.pointerArray(7)![list]!)!;
    for (let k = 0; k < bytes.u8(c.blob, at); k += 1) {
      const operand = bytes.u16(c.blob, at + 1 + 3 * k);
      const opcode = bytes.u8(c.blob, at + 3 + 3 * k);
      if (opcode === 0x7d) out.add(operand >> 8);
      if (opcode === 0x7f && depth < 6) walk(operand, depth + 1);
    }
  };
  walk(entry.operand, 0);
  return [...out];
}

test('a composed long press device\'s map binds what Logitech\'s binds, volume and mute borrowed from the donor\'s TV where Logitech\'s borrow the Denon\'s, and Input nowhere since the donor\'s TV mode device has none',
  needsAll, () => {
    const { ours, theirs, outs } = longComposed();
    const differences: Record<string, { ours: number; theirs: number; onlyTheirs: string[]; onlyOurs: string[]; differ: string[] }> = {};
    for (const one of LONG) {
      const mine = spelledMap(ours, outs.get(one.name)!.map);
      const logitech = spelledMap(theirs, one.theirMap);
      differences[one.name] = {
        ours: mine.size,
        theirs: logitech.size,
        onlyTheirs: [...logitech.keys()].filter((tag) => !mine.has(tag)).sort((a, b) => a - b).map((tag) => tag.toString(16)),
        onlyOurs: [...mine.keys()].filter((tag) => !logitech.has(tag)).sort((a, b) => a - b).map((tag) => tag.toString(16)),
        differ: [...mine].filter(([tag, body]) => logitech.has(tag) && logitech.get(tag) !== body).map(([tag]) => tag.toString(16)),
      };
      // The tags both hold, in Logitech's order: the one shared slot, the Knoll's Left and Right, included.
      const tags = taggedList(ours, ours.pointerArray(6)![outs.get(one.name)!.map]!)!.entries.map((entry) => entry.tag);
      const theirOrder = taggedList(theirs, theirs.pointerArray(6)![one.theirMap]!)!.entries.map((entry) => entry.tag);
      assert.deepEqual(tags.filter((tag) => theirOrder.includes(tag)), theirOrder.filter((tag) => tags.includes(tag)), one.name);
      // Every binding of Logitech's that ours lacks or holds otherwise sends another device's code: Input, scan 35,
      // the LG TV's on group 0, and mute and volume, scans 15, 49 and 52, the Denon's on group 2. Ours sends the
      // donor's TV's on group 0, the same list its own map binds, `volumeSource` with no receiver in the donor.
      for (const tag of [...differences[one.name]!.onlyTheirs, ...differences[one.name]!.differ].map((hex) => parseInt(hex, 16))) {
        assert.deepEqual(groupsSent(theirs, one.theirMap, tag), [tag === 0xa3 ? 0 : 2], `${one.name} ${tag.toString(16)}`);
      }
      for (const tag of differences[one.name]!.differ.map((hex) => parseInt(hex, 16))) {
        assert.equal(spelledMap(ours, outs.get(one.name)!.map).get(tag), spelledMap(ours, TV_MAP).get(tag), `${one.name} ${tag.toString(16)}`);
      }
    }
    // Our map's size, Logitech's, the tags only Logitech's binds and those both bind to different things: Input
    // and the three volume keys, on all four, and no key otherwise.
    assert.deepEqual(differences, {
      Knoll: { ours: 10, theirs: 11, onlyTheirs: ['a3'], onlyOurs: [], differ: ['8f', 'b1', 'b4'] },
      Kodi: { ours: 40, theirs: 41, onlyTheirs: ['a3'], onlyOurs: [], differ: ['8f', 'b1', 'b4'] },
      Switch: { ours: 7, theirs: 8, onlyTheirs: ['a3'], onlyOurs: [], differ: ['8f', 'b1', 'b4'] },
      'Sony HT': { ours: 29, theirs: 30, onlyTheirs: ['a3'], onlyOurs: [], differ: ['8f', 'b1', 'b4'] },
    });
  });

test('each key\'s held event selects its composed long press device and its press list gains a second block, as Logitech\'s lists for that key do',
  needsAll, () => {
    const { donor, before, ours, theirs, outs } = longComposed();
    const mine = spelledMap(ours, 0);
    const logitech = spelledMap(theirs, 0);
    const start = spelledMap(before, 0);
    // Four tags added to the key table, the four held events, and nothing else changed but the four press lists.
    assert.deepEqual([...mine.keys()].filter((tag) => !start.has(tag)).sort((a, b) => a - b), [0xc1, 0xc4, 0xc5, 0xc7]);
    for (const [tag, body] of start) {
      if ((tag & 0xc0) === 0x80 && SCAN_OF_PLACE.includes((tag & 0x3f) as 5)) continue;
      assert.equal(mine.get(tag), body, tag.toString(16));
    }
    const normal = (body: string) => body.replace(/eb[0-9a-f]{2}/g, 'ebnn');
    for (const one of LONG) {
      const scan = SCAN_OF_PLACE[one.place];
      assert.equal(mine.get(0xc0 | scan), `(7:fffb 1f:ff${outs.get(one.name)!.map.toString(16).padStart(2, '0')})`, one.name);
      assert.equal(logitech.get(0xc0 | scan), `(7:fffb 1f:ff${one.theirMap.toString(16).padStart(2, '0')})`, one.name);
      // The press: the short press device's block as it was, then the same block again with two new timers, which is
      // the shape of Logitech's press list for the same key with its two devices.
      const press = mine.get(0x80 | scan)!;
      assert.ok(press.startsWith(start.get(0x80 | scan)!.slice(0, -1)), one.name);
      assert.equal(normal(press), normal(logitech.get(0x80 | scan)!), one.name);
    }
    // Two timers per device a key selects, sixteen for eight, which is Logitech's count.
    assert.equal(ours.pointerArray(8)!.length, donor.pointerArray(8)!.length + 2 + 8);
    assert.equal(ours.pointerArray(8)!.length, theirs.pointerArray(8)!.length);
  });

test('the metadata archive names each composed long press device with Logitech\'s commands in Logitech\'s order',
  needsAll, () => {
    const { ours, theirs } = longComposed();
    for (const one of LONG) {
      const mine = metadataArchive(ours)!.devices.find((device) => device.name === one.name)!;
      const logitech = metadataArchive(theirs)!.devices.find((device) => device.name === one.name)!;
      assert.deepEqual(mine.commands, logitech.commands, one.name);
    }
  });

test('the long press composer refuses a key with no short press device and a second long press, and the short press composer a key with a long press device',
  needsAll, () => {
    const { donor, ours } = longComposed();
    const long = (c: Container, place: number, name = 'Other') => () =>
      composeNoScreenDevice(c, IR_ARCHIVE!, { ...PLASMA, name, place, press: 'long' });
    // The donor's bottom left key is free.
    assert.throws(long(donor, 2), /holds no short press device/);
    // Every key of the composed configuration holds a long press device already.
    for (const place of [0, 1, 2, 3]) assert.throws(long(ours, place), /already holds a long press device/);
    // A short press on a key with a long press device is a key that holds a device.
    assert.throws(() => composeNoScreenDevice(ours, IR_ARCHIVE!, { ...PLASMA, name: 'Other', place: 1 }), /already holds a device/);
  });
