/**
 * A device taken out of Logitech's compile of the whole test setup and composed back, `todo-compile-350.md` 4.1.3:
 * `withoutNoScreenDevice`, then `composeNoScreenDevice`, held against Logitech's own file.
 *
 * **Why a removal.** Logitech's compile of the test setup fills all eight infrared groups of the Harmony 350, so
 * nothing can be composed onto it, and every earlier calibration composed onto the bench's three device compile
 * instead, `noscreen.test.ts`, where the Denon and the LG TV are missing: the maps came out equal to Logitech's but
 * for the keys those two devices lend, Input and volume. Taking a device out of Logitech's file and composing it
 * back puts it among the same seven devices Logitech compiled it among, so the whole map is compared, and the rest
 * of the file with it.
 *
 * **The cases**: the four long press devices, the Knoll, the Kodi, the Switch and the Sony HT, which no activity
 * names, taken out of each of Logitech's two compiles of the account, the lab's `work/setups/h350-test/
 * compile-Result.EzHex` and the earlier `first-compile/compile-Result.EzHex`; eight cases. The other four devices
 * are refused, each for its own reason, below: the LG TV is the TV mode device, the plasma has a long press device
 * on its key, the Denon has an input variable and the KPN's codes are sent by the activity.
 *
 * **What it settled, in counts.** Taken out, each leaves the other seven devices as they were, read by content: their
 * records, their maps with every list written out, their power variables and their names in the metadata archive.
 * The removal drops 15, 51, 11 and 30 lists for the four, found by reachability, and composing each back adds
 * exactly as many, found by construction, on both compiles: an independent closure, since nothing in the
 * composer reads what the removal found. Composed back, the whole file is Logitech's read by content: every list
 * of it, 331 and 326, as a multiset with every call written out, every map, the key table, every timer record,
 * every group's records and every state variable's transitions. The two files differ by the metadata archive's
 * length alone, 1 to 9 bytes, which is the deflate, ours rather than Logitech's.
 *
 * **What it found on the way**: the composer did not make the two lists Logitech stores for every device's power
 * variable, a silent write of 0 and one of 1 that nothing calls, which the removal had to take out too; with those
 * two composed, `POWER_RESETS`, the lists agree as a multiset. They hold on all 27 devices of the seven files the
 * routing test reads, `noscreenrouting.test.ts`.
 *
 * **What differs, and why it is left**: where things are and what they are numbered, which Logitech's compiler
 * chooses by no rule a compile shows (`noscreen.test.ts` "Part by part and not offset by offset"): the composer
 * appends a device's lists, map, timers and power variable after everything else, and puts its records after
 * every group's. The key table's order follows the compiler's hash map, `inCompilerOrder`, and agrees on three of
 * the four keys; on the Kodi's, Logitech's file stores its held tag after the two tags it shares a slot with, where
 * a tag put in last goes in front of them. The metadata archive is Logitech's character for character where the
 * device was last in the account's list, the Knoll; the others go to the end, which is the composer's
 * `withMetadataDevice`, since where the account lists a device is the account's and not the file's to say.
 *
 * **Controls**, each run and reverted by string replacement: dropping the power variable rule from the removal's
 * reachability makes it refuse, since the silent writes name the variable and nothing else reaches them; composing
 * one of the two silent writes instead of both fails the closure; leaving the removal's renumbering of map selects
 * out fails the maps, of the removal and of the file composed back.
 *
 * **Sources checked first**: the composer and its tests, `noscreen.test.ts`; the reference's
 * `harmony-300-350/memory.md`; the lab's `work/setups/h350-test/chapter4-reading.md`. Logitech's client removes a
 * device from the account and asks the service for a new compile, so it holds no removal of its own to read.
 * **Which architectures**: the Harmony 350 alone; the Harmony 300 has no long press and has not been run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  type AccountDevice, catalogueDevicePlan, ComposeError, composeNoScreenDevice, type Container, devices, irGroups,
  metadataArchive, parse, stateRecords, stateVariables, taggedList, volumeSource, withoutNoScreenDevice,
} from '../src/index.ts';
import { mapOfGroup } from '../src/families/no-screen/devices.ts';
import { recordKey, spelled } from './noscreenparts.ts';

const needs = needing(skipWithoutLab(), skipWithoutIrArchive());

/** Logitech's two compiles of the test setup, by their paths in the lab. */
const COMPILES = {
  second: 'work/setups/h350-test/compile-Result.EzHex',
  first: 'work/setups/h350-test/first-compile/compile-Result.EzHex',
} as const;

/** The four long press devices, their catalogue entries and their keys. */
const LONG = [
  { manufacturer: 'Knoll', model: 'HDP-1100', name: 'Knoll', place: 0 },
  { manufacturer: 'Plex', model: 'Plex_Player', name: 'Kodi', place: 1 },
  { manufacturer: 'Ligawo', model: '3090063', name: 'Switch', place: 2 },
  { manufacturer: 'Sony', model: 'DAV-C540', name: 'Sony HT', place: 3 },
] as const;

/** The test setup's account as `volumeSource` asks about it, in the metadata archive's order, each type the catalogue's. */
const SETUP_ACCOUNT: readonly AccountDevice[] = [
  { name: 'LG TV', deviceType: 1 }, { name: 'Plasma', deviceType: 1 }, { name: 'Denon', deviceType: 5 },
  { name: 'KPN', deviceType: 18 }, { name: 'Kodi', deviceType: 35 }, { name: 'Switch', deviceType: 30 },
  { name: 'Sony HT', deviceType: 22 }, { name: 'Knoll', deviceType: 7 },
];

function compile(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these two files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

interface Case {
  readonly theirs: Container;
  readonly removed: ReturnType<typeof withoutNoScreenDevice>;
  readonly without: Container;
  readonly out: ReturnType<typeof composeNoScreenDevice>;
  readonly ours: Container;
}
const memo = new Map<string, Case>();
/** One device taken out of one compile and composed back on its key's long press, its volume where `volumeSource` says. */
function round(file: keyof typeof COMPILES, one: (typeof LONG)[number]): Case {
  const key = `${file} ${one.name}`;
  const known = memo.get(key);
  if (known !== undefined) return known;
  const theirs = compile(COMPILES[file]);
  const removed = withoutNoScreenDevice(theirs, one.name);
  const without = parse(removed.bytes);
  const deviceType = catalogueDevicePlan(without, IR_ARCHIVE!, { manufacturer: one.manufacturer, model: one.model, label: 'X', full: true }).entry.deviceType;
  const out = composeNoScreenDevice(without, IR_ARCHIVE!, {
    ...one, press: 'long', volumeFrom: volumeSource({ name: one.name, deviceType }, SETUP_ACCOUNT),
  });
  const made = { theirs, removed, without, out, ours: parse(out.bytes) };
  memo.set(key, made);
  return made;
}
const CASES = (Object.keys(COMPILES) as (keyof typeof COMPILES)[]).flatMap((file) => LONG.map((one) => ({ file, one })));

/**
 * A spelling with every number that follows placement named instead: a select by the device whose map it is, a
 * timer start as `ebnn` (every timer of one key is the same record), and a state variable by its name, in a write,
 * a condition and a load. What is left is what the instruction does.
 */
function namer(c: Container): (text: string) => string {
  const owner = new Map<number, string>();
  for (const one of devices(c)) if (one.name !== undefined && one.group !== undefined) owner.set(mapOfGroup(c, one.group), one.name);
  const names = new Map(stateVariables(c).map((one) => [one.index, one.name]));
  const variable = (hex: string) => names.get(parseInt(hex, 16)) ?? `?${hex}`;
  return (text) => text
    .replace(/1f:ff([0-9a-f]{1,2})\b/g, (_, map: string) => `select(${owner.get(parseInt(map, 16)) ?? `?${map}`})`)
    .replace(/1f:eb[0-9a-f]{1,2}\b/g, 'ebnn')
    .replace(/\b([89][0-9a-f]):/g, (_, opcode: string) => `w(${names.get(parseInt(opcode, 16) - 0x80) ?? `?${opcode}`}):`)
    .replace(/71:80([0-9a-f]{2})\b/g, (_, hex: string) => `if(${variable(hex)})`)
    .replace(/71:([0-9a-f]{1,2})\b/g, (_, hex: string) => `on(${variable(hex)})`);
}

/** Every action list, written out and named, as a multiset. */
function allLists(c: Container): Map<string, number> {
  const name = namer(c);
  const out = new Map<string, number>();
  c.pointerArray(7)!.forEach((_, index) => {
    const text = name(spelled(c, { operand: index, opcode: 0x7f }));
    out.set(text, (out.get(text) ?? 0) + 1);
  });
  return out;
}

/** A key map, tag to binding written out and named; the map of a device by its name, the key table as `keys`. */
function maps(c: Container): Record<string, Record<string, string>> {
  const name = namer(c);
  const read = (entry: number) => Object.fromEntries(taggedList(c, c.pointerArray(6)![entry]!)!.entries
    .map((one) => [one.tag.toString(16), name(spelled(c, one))]));
  const out: Record<string, Record<string, string>> = { keys: read(0) };
  for (const one of devices(c)) if (one.name !== undefined && one.group !== undefined) out[one.name] = read(mapOfGroup(c, one.group));
  return out;
}

/** Each group's records, by device name, as `recordKey`s in the group's order. */
function records(c: Container): Record<string, string[]> {
  const groups = irGroups(c)!;
  return Object.fromEntries(devices(c).filter((one) => one.name !== undefined && one.group !== undefined)
    .map((one) => [one.name!, groups[one.group!]!.addresses.map((address) => recordKey(c, address))]));
}

/** Each state variable's record by name: its first value, its maximum and its transitions written out. */
function transitions(c: Container): Record<string, string> {
  const name = namer(c);
  const all = stateRecords(c)!;
  return Object.fromEntries(stateVariables(c).map((one) => {
    const record = all[one.index]!;
    return [one.name, `${record.first}/${record.second} ${record.values.map((value) => `${value.from}>${value.to} ${name(spelled(c, value))}`).sort().join(' ')}`];
  }));
}

/** Every timer record's seven bytes, sorted. */
function timerRecords(c: Container): string[] {
  return c.pointerArray(8)!.map((address) => {
    const at = c.blobOffsetOf(address)!;
    return Array.from(c.blob.subarray(at, at + 7)).join(',');
  }).sort();
}

const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

test('taking a long press device out of Logitech\'s compile leaves the other seven as they were, read by content, on both compiles',
  needs, () => {
    const dropped: Record<string, number[]> = {};
    for (const { file, one } of CASES) {
      const { theirs, removed, without: left } = round(file, one);
      const label = one.name.replaceAll(' ', '_');
      assert.ok(left.allChecksPass, `${file} ${one.name}`);
      // The device is gone, its group empty, and nothing else moved but the key table's held tag and press list.
      assert.equal(devices(left).find((device) => device.name === label), undefined);
      assert.equal(irGroups(left)![removed.group]!.addresses.length, 0);
      const before = maps(theirs);
      const after = maps(left);
      assert.deepEqual(without(after, 'keys'), without(without(before, 'keys'), label), `${file} ${one.name}`);
      // The key table: the held tag gone, the press list one block shorter, every other binding as it was.
      const scan = [5, 1, 7, 4][one.place]!;
      const press = (0x80 | scan).toString(16);
      assert.deepEqual(without(without(after.keys!, press), (0xc0 | scan).toString(16)),
        without(without(before.keys!, press), (0xc0 | scan).toString(16)), `${file} ${one.name}`);
      assert.equal(after.keys![press], before.keys![press]!.replace(/ 7:fffb 1f:e9[0-9a-f]2 ebnn ebnn\)$/, ')'), `${file} ${one.name}`);
      assert.deepEqual(records(left), without(records(theirs), label));
      assert.deepEqual(transitions(left), without(transitions(theirs), `${label}_Power_2`));
      assert.deepEqual(metadataArchive(left)!.devices.map((device) => device.name),
        metadataArchive(theirs)!.devices.map((device) => device.name).filter((name) => name !== one.name));
      // What went, by count: one map, the key's two timers, one variable, and the lists.
      assert.equal(left.pointerArray(6)!.length, theirs.pointerArray(6)!.length - 1);
      assert.equal(left.pointerArray(8)!.length, theirs.pointerArray(8)!.length - 2);
      assert.equal(stateVariables(left).length, stateVariables(theirs).length - 1);
      assert.equal(left.pointerArray(7)!.length, theirs.pointerArray(7)!.length - removed.lists.length);
      (dropped[one.name] ??= []).push(removed.lists.length, removed.records);
    }
    // Lists dropped and records, per device, on the second compile and then the first.
    assert.deepEqual(dropped, {
      Knoll: [15, 8, 15, 8], Kodi: [51, 47, 51, 47], Switch: [11, 5, 11, 5], 'Sony HT': [30, 26, 30, 26],
    });
  });

test('composed back, the device adds as many lists as the removal took, and the whole file is Logitech\'s read by content',
  needs, () => {
    for (const { file, one } of CASES) {
      const { theirs, removed, without: left, ours } = round(file, one);
      const where = `${file} ${one.name}`;
      assert.ok(ours.allChecksPass, where);
      // The closure: the removal found its lists by reachability, the composer makes its own by construction.
      assert.equal(ours.pointerArray(7)!.length - left.pointerArray(7)!.length, removed.lists.length, where);
      assert.deepEqual(allLists(ours), allLists(theirs), where);
      const mine = maps(ours);
      const logitech = maps(theirs);
      assert.deepEqual(Object.keys(mine).sort(), Object.keys(logitech).sort(), where);
      for (const name of Object.keys(logitech)) assert.deepEqual(mine[name], logitech[name], `${where} ${name}`);
      // Every group's records: the other seven's in Logitech's order, the composed device's as a set, since the
      // composer stores them in its own order, commands then power steps, and Logitech's in one no compile states.
      const label = one.name.replaceAll(' ', '_');
      assert.deepEqual(without(records(ours), label), without(records(theirs), label), where);
      assert.deepEqual([...records(ours)[label]!].sort(), [...records(theirs)[label]!].sort(), where);
      assert.notDeepEqual(records(ours)[label], records(theirs)[label], where);
      assert.deepEqual(transitions(ours), transitions(theirs), where);
      assert.deepEqual(timerRecords(ours), timerRecords(theirs), where);
    }
    // The list counts the two compiles hold, which composing back restores.
    assert.deepEqual(CASES.map(({ file, one }) => round(file, one).ours.pointerArray(7)!.length),
      [331, 331, 331, 331, 326, 326, 326, 326]);
  });

test('what composing back changes is placement and numbering: the files differ by the metadata archive\'s deflate alone, the key table\'s order on the Kodi\'s key, and where the account lists the device',
  needs, () => {
    const seen: Record<string, [number, boolean, boolean]> = {};
    for (const { file, one } of CASES) {
      const { theirs, ours } = round(file, one);
      const where = `${file} ${one.name}`;
      // The metadata archive is the last section, so its length is the file's from its start.
      const archive = (c: Container) => c.blob.length - c.blobOffsetOf(c.sections[13]!.address)!;
      assert.equal(ours.blob.length - theirs.blob.length, archive(ours) - archive(theirs), where);
      const tags = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((entry) => entry.tag);
      // The archive: Logitech's devices, the composed one moved to the end with a DeviceId above the last.
      const logitech = metadataArchive(theirs)!.devices;
      const mine = metadataArchive(ours)!.devices;
      const moved = [...logitech.filter((device) => device.name !== one.name), logitech.find((device) => device.name === one.name)!];
      assert.deepEqual(mine.map((device) => [device.index, device.name, device.commands.map((command) => command.name)]),
        moved.map((device, index) => [index, device.name, device.commands.map((command) => command.name)]), where);
      const highest = Math.max(...logitech.filter((device) => device.name !== one.name).map((device) => Number(device.deviceId)));
      assert.deepEqual(mine.map((device) => device.deviceId),
        moved.map((device) => (device.name === one.name ? String(highest + 1) : device.deviceId)), where);
      seen[where] = [ours.blob.length - theirs.blob.length,
        tags(ours).join() === tags(theirs).join(), metadataArchive(ours)!.xml === metadataArchive(theirs)!.xml];
    }
    // Bytes the file shrank by, whether the key table's order is Logitech's, and whether the archive's text is.
    assert.deepEqual(seen, {
      'second Knoll': [-1, true, true], 'second Kodi': [-9, false, false], 'second Switch': [-6, true, false], 'second Sony HT': [-2, true, false],
      'first Knoll': [-1, true, true], 'first Kodi': [-9, false, false], 'first Switch': [-6, true, false], 'first Sony HT': [-2, true, false],
    });
    // The Kodi's held tag, 0xC1, shares a slot of the key table's hash map with 0x2E and 0x85: Logitech's file
    // stores it after them, and a tag put in last goes in front, `inCompilerOrder`.
    const { theirs, ours } = round('second', LONG[1]);
    const order = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((entry) => entry.tag)
      .filter((tag) => [0x2e, 0x85, 0xc1].includes(tag));
    assert.deepEqual(order(theirs), [0x2e, 0x85, 0xc1]);
    assert.deepEqual(order(ours), [0xc1, 0x2e, 0x85]);
  });

test('the removal refuses the four devices it cannot take out whole, each for its own reason', needs, () => {
  const theirs = compile(COMPILES.second);
  assert.throws(() => withoutNoScreenDevice(theirs, 'LG TV'), (error: unknown) => error instanceof ComposeError && /TV mode device/.test(error.message));
  assert.throws(() => withoutNoScreenDevice(theirs, 'Plasma'), /holds a long press device too/);
  // Every short press device of the compile has a long press device on its key, so the Denon's and the KPN's own
  // refusals are reached with the Switch and the Sony HT taken out first.
  assert.throws(() => withoutNoScreenDevice(theirs, 'Denon'), /holds a long press device too/);
  assert.throws(() => withoutNoScreenDevice(parse(withoutNoScreenDevice(theirs, 'Switch').bytes), 'Denon'), /variables besides its power, Denon_Input_19/);
  assert.throws(() => withoutNoScreenDevice(parse(withoutNoScreenDevice(theirs, 'Sony HT').bytes), 'KPN'), /something kept still reaches/);
  assert.throws(() => withoutNoScreenDevice(theirs, 'Nothing'), /no device called Nothing/);
});
