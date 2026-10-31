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
 * exists, and taking a device out is a composer of its own.
 *
 * **What it settled, in counts.** Of the 51 records Logitech stores for the plasma, the composer writes 39 and every
 * one of them is one of Logitech's word for word; the 12 it leaves out are ten one block copies of the digits that
 * no list or key reaches, and Internet and Teletext, which only the favourite key and the soft buttons hold, below.
 * Each of the 39 sends through a list of Logitech's shape, the timers cancelled, the send and its quantity. The power
 * variable's two transitions are Logitech's, the 50 tenths wait included. The plasma's map binds 38 keys where
 * Logitech's binds 40, every one of the 38 to what Logitech's binds it to, and the two it leaves out are the
 * favourite key, Internet in Logitech's, and the Input key, which Logitech binds to the LG TV's InputNext on every
 * map. The key's press and release are Logitech's lists for a key of that place, and the metadata archive names
 * the plasma with Logitech's 63 commands in Logitech's order.
 *
 * **The key table, fitted.** `NO_SCREEN_HARD_KEYS` was fitted to the eight devices of the test setup compile; the
 * test below states, device by device, where Logitech binds a key to the device's own command and the table does
 * not or the other way round. On seven devices the only differences are the favourite key and the volume and mute
 * Logitech sends to the Denon instead of the device's own; the KPN's map is the activity's, `todo-compile-350.md`
 * 4.2 and 4.3, and binds three of the table's keys.
 *
 * **The power on delay's waits are a closure**: the catalogue's power on delay, read by `catalogueDevicePower`,
 * split by `powerOnWaits`, is the waits Logitech's compile writes on each of the eight devices, the Knoll's 250
 * tenths as 100, 100 and 50.
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
  bytes, catalogueDevicePlan, composeIrGroup, ComposeError, composeNoScreenDevice, type Container, deviceModeLayout, devices,
  irBlockWords, irGroups, irHeaderPointers, irRecordStart, metadataArchive, NO_SCREEN_FAMILY, NO_SCREEN_HARD_KEYS,
  parse, powerOnWaits, stateRecords, stateVariables, taggedList,
} from '../src/index.ts';
import { familyOf, familyOfArchitecture } from '../src/families/registry.ts';

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

/** A record as its header, its own address zeroed, and each block's words: what it sends, wherever it sits. */
function recordKey(c: Container, address: number): string {
  const off = c.blobOffsetOf(irRecordStart(c, address)!)!;
  const header = c.blob.slice(off, off + 12);
  header.fill(0, 8, 11);
  const blocks = irHeaderPointers(c, address).map((pointer) => (pointer === 0 ? '-' : irBlockWords(c, pointer)!.join(',')));
  return `${Buffer.from(header).toString('hex')}/${blocks.join('|')}`;
}

/** A record's once block without the silence it opens with, and whether it has a held block. */
function onceWithoutLeadIn(c: Container, address: number): { code: string; held: boolean; opening: number } {
  const [once, held] = irHeaderPointers(c, address);
  const words = irBlockWords(c, once!)!;
  const first = words.findIndex((word) => (word & 0x8000) !== 0);
  return { code: words.slice(first).join(','), held: held !== 0, opening: first };
}

/** One instruction with every list it calls written out, and every send named by the record it sends. */
function spelled(c: Container, one: { operand: number; opcode: number }, depth = 0): string {
  if (one.opcode === 0x7d) {
    const group = irGroups(c)![one.operand >> 8]!;
    return `send(${recordKey(c, group.addresses[one.operand & 0xff]!).slice(0, 40)}..)`;
  }
  if (one.opcode === 0x7c) return `7c:${(one.operand & 0xff).toString(16)}`;
  if (one.opcode !== 0x7f || depth > 6) return `${one.opcode.toString(16)}:${one.operand.toString(16)}`;
  const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
  const body = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => ({
    operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
  }));
  return `(${body.map((x) => spelled(c, x, depth + 1)).join(' ')})`;
}

/** A key map, tag to spelled binding, with the state variable a write or a condition names left out. */
function spelledMap(c: Container, entry: number): Map<number, string> {
  const list = taggedList(c, c.pointerArray(6)![entry]!)!;
  // A condition's variable is its operand's low byte, `71:80vv`, and a write's its opcode's low seven bits, `9v:`.
  return new Map(list.entries.map((one) => [one.tag, spelled(c, one)
    .replace(/71:80[0-9a-f]{2}/g, '71:80vv').replace(/\b9[0-9a-f]:/g, '9v:')]));
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
    // own; and the KPN's map is the activity's.
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

test('the composed plasma\'s records are 39 of the 51 Logitech stores for it, word for word, and the 12 left out are sent by no key',
  needsAll, () => {
    const { ours, theirs, out } = composed();
    assert.ok(ours.allChecksPass);
    assert.equal(out.group, PLACE);
    const mine = irGroups(ours)![PLACE]!.addresses.map((address) => recordKey(ours, address));
    const logitech = irGroups(theirs)![THEIR_GROUP]!.addresses.map((address) => recordKey(theirs, address));
    // 37 commands on keys and the two power steps.
    assert.equal(out.commands.length, 37);
    assert.equal(mine.length, 39);
    assert.equal(logitech.length, 51);
    assert.equal(mine.filter((key) => logitech.includes(key)).length, 39);
    // What Logitech stores and the composer does not: ten one block copies, each a digit's code with no silence in
    // front of it and no held block, and two commands.
    const left = irGroups(theirs)![THEIR_GROUP]!.addresses.filter((address) => !mine.includes(recordKey(theirs, address)));
    assert.equal(left.length, 12);
    const ourCodes = irGroups(ours)![PLACE]!.addresses.map((address) => onceWithoutLeadIn(ours, address).code);
    const digits = out.commands.flatMap((name, k) => (/^[0-9]$/.test(name) ? [ourCodes[k]] : []));
    const copies = left.filter((address) => {
      const one = onceWithoutLeadIn(theirs, address);
      return !one.held && one.opening === 0 && digits.includes(one.code);
    });
    assert.equal(copies.length, 10);
    // The two commands, named by composing every catalogue command: the favourite key's Internet and the soft
    // buttons' Teletext.
    const plan = catalogueDevicePlan(theirs, IR_ARCHIVE!, { ...PLASMA, label: 'Plasma', full: true });
    const scratch = parse(composeIrGroup(theirs, plan.device.commands).bytes);
    const every = irGroups(scratch)!.at(-1)!.addresses.map((address) => recordKey(scratch, address));
    const named = left.filter((address) => !copies.includes(address))
      .map((address) => plan.wanted.filter((_, k) => every[k] === recordKey(theirs, address)).join('/'));
    assert.deepEqual(named.sort(), ['Internet', 'Teletext']);
    // And neither one block copy nor Teletext is sent by anything in Logitech's compile: no `lo hi 7F` names their
    // send lists anywhere in the file.
    const lists = theirs.pointerArray(7)!;
    const sendListOf = (record: number) => lists.findIndex((address) => {
      const at = theirs.blobOffsetOf(address)!;
      return bytes.u8(theirs.blob, at) === 3 && bytes.u16(theirs.blob, at + 4) === ((THEIR_GROUP << 8) | record);
    });
    const unreached = left.filter((address) => !named.includes('Internet') || plan.wanted[every.indexOf(recordKey(theirs, address))] !== 'Internet')
      .map((address) => sendListOf(irGroups(theirs)![THEIR_GROUP]!.addresses.indexOf(address)));
    const called = (list: number) => {
      let n = 0;
      for (let k = 0; k + 2 < theirs.blob.length; k += 1) {
        if (theirs.blob[k + 2] === 0x7f && bytes.u16(theirs.blob, k) === list) n += 1;
      }
      return n;
    };
    assert.equal(unreached.length, 11);
    assert.deepEqual(unreached.map(called), new Array(11).fill(0));
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
    assert.equal(mine.size, 39);
    assert.equal([...mine].filter(([key, body]) => logitech.get(key) === body).length, 39);
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

test('the composed plasma\'s key map binds 38 keys, each to what Logitech\'s binds it to; Logitech\'s binds the favourite key and the Input key besides',
  needsAll, () => {
    const { ours, theirs, out } = composed();
    const mine = spelledMap(ours, out.map);
    const logitech = spelledMap(theirs, THEIR_MAP);
    assert.equal(mine.size, 38);
    assert.equal(logitech.size, 40);
    assert.deepEqual([...mine].filter(([tag, body]) => logitech.get(tag) !== body), []);
    // Favourite 5 and Input, both presses: Internet, and the LG TV's InputNext.
    assert.deepEqual([...logitech.keys()].filter((tag) => !mine.has(tag)).sort((a, b) => a - b), [0x82, 0xa3]);
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
    // Logitech's states the account's own number for the device, which a composed device has none of.
    assert.equal(plasma.deviceId, undefined);
    assert.ok(logitech.deviceId !== undefined);
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
  assert.throws(compose(donor, { press: 'long' }), /long press .* 4\.4/);
  assert.throws(compose(donor, { place: 0 }), /top left key/);
  assert.throws(compose(donor, { place: 4 }), /place is 0 to 3/);
  // The top right key holds a device already.
  assert.throws(compose(donor, { place: 1 }), /already holds a device/);
  // A second plasma by name, and a second device on the key just used.
  assert.throws(compose(ours, { place: 3 }), /already here/);
  assert.throws(compose(ours, { name: 'Other' }), /already holds a device/);
  assert.equal(familyOf(ours), NO_SCREEN_FAMILY);
});
