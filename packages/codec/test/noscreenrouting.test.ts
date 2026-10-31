/**
 * Logitech's routing in a Harmony 300 or 350 device's map, `todo-compile-350.md` 4.1.1, and the two facts about
 * the container the device composer copies besides, 4.1.2 and 4.1.4: each rule `families/no-screen/keys.ts`
 * states, held on every Logitech file of the family the lab holds, with the count both ways.
 *
 * **Why these are rules to copy and not choices to ask about.** The track composes what Logitech's service compiles
 * and compares the two, so wherever the service chooses, its choice is copied. The service states two of them
 * itself: its mode maps of the test setup's eight devices, read from the live service into the lab's
 * `work/myharmony/responses/20261031-h350-setup_GetDeviceModeButtonMaps-all.json`, carry an override on each key a
 * device's map borrows, `TvInput` to the TV mode (the device on the TV key's short press) and `VolumeUp`,
 * `VolumeDown` and `VolumeMute` to the receiver. A person cannot make these overrides in MyHarmony's editor, which
 * offers a device's own commands once one is removed, so they are the service's defaults. The rest is what the
 * compiles hold.
 *
 * **What was found, rule by rule**, the counts in the tests below:
 *
 * * **Input** sends the TV mode device's input command on every device map, its own included, where that device
 *   has `InputNext`, `Input` or `Source`; where it has none, as the plasma on the TV key of three compiles, no map
 *   binds Input. Every compile of the family agrees, `INPUT_KEY`. "The first television" fits the same files, since
 *   on every one the TV key holds the first television; the service's override names the mode, so the mode is
 *   the rule.
 * * **Volume and mute** are a device's own on a television or a receiver and otherwise the account's first
 *   receiver's, else its first television's, `volumeSource`: the eight devices of the test setup, which the
 *   service's overrides state, and 9 of the 12 that are neither on the other compiles. Two that disagree keep
 *   their own, on compiles made for earlier owners; the third is the Harmony 300's KPN, whose map is its activity's.
 *   The KPN's map has no mute in the test setup's compile, and the service gives it no mute override, so it is not
 *   borrowed there; the KPN's map is the activity's, 4.2's.
 * * **The fifth favourite key** holds a television's Home, else Internet: 4 of 5 televisions with either, on the
 *   Harmony 350; the Philips of the bench 350's first configuration binds nothing there. No other type binds it.
 * * **Teletext** is stored with a send list nothing calls, for 11 of 11 devices with the command on the Harmony 350
 *   compiles; the service's maps put it on a `Teletext` key the Harmony 350 does not have.
 * * **The ten digit copies** are stored for some device types and not others, 25 of 25 devices of the six
 *   current compiles agreeing, `DIGIT_COPIES_BY_TYPE`; the Harmony 300's first configuration, from a 2011 generation
 *   of the compiler, is left out of the per type counts, as its one block records are of another shape.
 * * **Two silent writes per device**, `07 FFFF` and a write of its power variable, one of 0 and one of 1, which
 *   nothing calls: 27 of 27 devices over the seven files, and no other list opens with the flag, `POWER_RESETS`.
 *   Found by taking a device out of Logitech's compile and composing it back, 4.1.3, `noscreenremove.test.ts`:
 *   the two were the only lists of Logitech's the composer did not make.
 * * **The start up select**, entry 1's list ending in a select of the TV mode device's map: 7 of 7, 4.1.2.
 * * **The metadata archive**, 4.1.4: `Index` the position and `DeviceId` strictly ascending, 7 of 7, and the list
 *   alphabetical on the two Harmony 300 files only, which corrects `reference/architectures/harmony-300-350/memory.md`.
 *   Nothing is known to read either number: the 1.4 firmware's section seeker never asks for raw slot 13 and the
 *   image holds no ZIP signature or field name, and MyHarmony and Harmony Desktop never read a configuration back
 *   from this family, the lab's `work/setups/h350-test/metadata-reading.md`.
 *
 * **Which device is which** on the other owners' and the bench's earlier compiles is not stated by the files: each
 * was identified by finding the catalogue codeset whose command names are the metadata archive's for it, which the
 * test checks again, `IDENTIFIED`; the type then comes from the catalogue. Two identifications are near rather than
 * exact, by the count of names that differ, and both are of a type every candidate shares.
 *
 * **Sources checked first**: MyHarmony's decompiled volume screen, `VolumeSetupUserControlModel`, which reads the
 * service's maps and offers a volume device per mode but holds no default; the service's mode maps above; the
 * reference's `harmony-300-350/memory.md` and the 350's `keys.md`; the lab's `chapter4-reading.md`.
 * **Which architectures**: arch 16 alone, the Harmony 350 and, where stated, the Harmony 300.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { IR_ARCHIVE, LAB, load, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  type AccountDevice, bytes, catalogueDevice, catalogueCommands, catalogueDevicePlan, composeIrGroup, type Container, devices, DIGIT_COPIES_BY_TYPE, irGroups,
  metadataArchive, parse, stateVariables, taggedList, volumeSource,
} from '../src/index.ts';
import { DEVICE_KEYS, FAVOURITE_FIVE, INPUT_KEY, POWER_RESETS, START_UP_SELECT_ENTRY, VOLUME_SCANS } from '../src/families/no-screen/keys.ts';
import { SILENT_WRITE } from '../src/actions.ts';
import { withoutStartUpSelect, withStartUpSelect } from '../src/families/no-screen/devices.ts';
import { onceWithoutLeadIn, recordKey } from './noscreenparts.ts';

const needs = needing(skipWithoutLab(), skipWithoutIrArchive());

/**
 * One deflated or stored entry of a ZIP by name, through its central directory: the other owner's Harmony 350
 * configuration arrived as the archive Logitech's client keeps, and the codec reads no ZIP of that kind, so this
 * test reads its one entry itself rather than reach into another package.
 */
function zipEntry(bytes: Uint8Array, wanted: string): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, 'a ZIP end record');
  let at = view.getUint32(end + 16, true);
  for (let k = 0; k < view.getUint16(end + 10, true); k += 1) {
    const nameLength = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (name === wanted) {
      const local = view.getUint32(at + 42, true);
      const dataAt = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = bytes.subarray(dataAt, dataAt + view.getUint32(at + 20, true));
      return view.getUint16(at + 10, true) === 0 ? data.slice() : new Uint8Array(inflateRawSync(data));
    }
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  throw new Error(`no ${wanted} in the ZIP`);
}

/** Every Logitech file of the family the lab holds, by a short name. */
function compiles(): Record<string, Container> {
  const lab = (path: string) => {
    const full = join(LAB!, path);
    assert.ok(existsSync(full), path);
    return new Uint8Array(readFileSync(full));
  };
  const named = (name: string) => {
    const one = load(name);
    assert.ok(one !== undefined, name);
    return one;
  };
  const issue37 = zipEntry(named('h350_issue37_config'), 'Result.EzHex');
  return {
    setup: parse(lab('work/setups/h350-test/compile-Result.EzHex')),
    issue37: parse(issue37),
    programmed: parse(named('h350_programmed_config')),
    three: parse(named('h350_three_devices_config')),
    factory: parse(named('h350_config')),
    h300programmed: parse(named('h300_programmed_config')),
    h300: parse(named('h300_config')),
  };
}

/**
 * Each device of each file by the catalogue entry its command names identify, and how many names differ: the
 * test setup's from its setup file, the rest found by command names, `IDENTIFIED` checked below.
 */
const IDENTIFIED: Record<string, Record<string, readonly [string, string, number]>> = {
  setup: {
    'LG TV': ['LG', 'OLED65G26LA', 0], Plasma: ['Panasonic', 'TX-P42GT30E', 0], Denon: ['Denon', 'AVR-X4800H', 0],
    KPN: ['KPN', 'TV6000COK', 0], Kodi: ['Plex', 'Plex_Player', 0], Switch: ['Ligawo', '3090063', 0],
    'Sony HT': ['Sony', 'DAV-C540', 0], Knoll: ['Knoll', 'HDP-1100', 0],
  },
  issue37: {
    'LG TV': ['LG', '60PV250N-ZA', 2], 'Humax DVR': ['Humax', 'HDR_FOX_T2', 1], 'LG DVD': ['LG', 'bp520', 0],
    'Qnap Media Player': ['QNAP', 'HS-251', 0], 'Thomson SAT': ['Thomson', 'DSL4206', 0],
  },
  programmed: { PS: ['Sony', 'Playstation_3', 0], KPN: ['KPN', 'VIP1853', 0], TV: ['Panasonic', 'TX-P42GT30E', 0] },
  three: { KPN: ['KPN', 'VIP1853', 0], TV: ['Panasonic', 'TX-P42GT30E', 0] },
  factory: { TV: ['Philips', '65OLED865_12', 0], Radio: ['Marantz', 'M-CR612', 0], Delta: ['Amino', 'Kamai_7X', 0] },
  h300programmed: {
    KPN: ['KPN', 'VIP1853', 0], 'Panasonic DVD': ['Panasonic', 'DVD-S35', 0], 'Panasonic TV': ['Panasonic', 'TX-P42GT30E', 0],
    'Sony VCR': ['Sony', 'SLV-N700', 0],
  },
  h300: {},
};

interface Device {
  readonly name: string;
  readonly label: string;
  readonly group: number | undefined;
  readonly type: number | undefined;
  readonly commands: readonly string[];
}

/** A file's devices in the archive's order, the account's: name, group, catalogue type, command names. */
function accountOf(file: string, c: Container): Device[] {
  const groups = new Map(devices(c).filter((one) => one.name !== undefined).map((one) => [one.name!, one.group]));
  return metadataArchive(c)!.devices.map((one) => {
    const label = one.name.replaceAll(' ', '_');
    const found = IDENTIFIED[file]![one.name];
    const type = found === undefined ? undefined : catalogueDevice(IR_ARCHIVE!, found[0], found[1]).deviceType;
    return { name: one.name, label, group: groups.get(label), type, commands: one.commands.map((command) => command.name) };
  });
}

/** The infrared groups a map's binding of `tag` sends from, every list it calls written out; empty if unbound. */
function groupsSent(c: Container, map: number, tag: number): number[] {
  const entry = taggedList(c, c.pointerArray(6)![map]!)!.entries.find((one) => one.tag === tag);
  if (entry === undefined) return [];
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

const PRESS = 0x80;

/**
 * The map a device's key selects: a short press device by its key's release on the Harmony 350 and its press on
 * the Harmony 300, which selects on the press, a long press device by the held event; the select is the list's
 * `1F FFnn`. `mapOfGroup` in `devices.ts` reads the Harmony 350's alone, which is all its composer is held on.
 */
function mapOf(c: Container, group: number): number {
  const key = DEVICE_KEYS[group % DEVICE_KEYS.length]!;
  const events = group < DEVICE_KEYS.length ? [0x40, 0x80] : [0xc0];
  for (const event of events) {
    const entry = taggedList(c, c.pointerArray(6)![0]!)!.entries.find((one) => one.tag === (event | key.scan));
    if (entry === undefined) continue;
    const at = c.blobOffsetOf(c.pointerArray(7)![entry.operand]!)!;
    for (let k = 0; k < bytes.u8(c.blob, at); k += 1) {
      const operand = bytes.u16(c.blob, at + 1 + 3 * k);
      if (bytes.u8(c.blob, at + 3 + 3 * k) === 0x1f && operand >> 8 === 0xff) return operand & 0xff;
    }
  }
  throw new Error(`group ${group} selects no map`);
}

test('every device of the family\'s compiles is the catalogue entry its command names identify, to the count of names that differ',
  needs, () => {
    const differing: Record<string, number> = {};
    for (const [file, c] of Object.entries(compiles())) {
      for (const one of metadataArchive(c)!.devices) {
        const found = IDENTIFIED[file]![one.name];
        if (found === undefined) continue;
        const entry = catalogueDevice(IR_ARCHIVE!, found[0], found[1]);
        const theirs = new Set(catalogueCommands(IR_ARCHIVE!, entry.codeset!).map((command) => command.name));
        const ours = new Set(one.commands.map((command) => command.name));
        differing[`${file} ${one.name}`] = [...theirs].filter((name) => !ours.has(name)).length + [...ours].filter((name) => !theirs.has(name)).length;
        assert.equal(differing[`${file} ${one.name}`], found[2], `${file} ${one.name}`);
      }
    }
    assert.equal(Object.keys(differing).length, 25);
  });

test('the service\'s mode maps of the test setup route Input to the TV mode and volume to the receiver on exactly the devices volumeSource names',
  needing(skipWithoutLab()), () => {
    const path = join(LAB!, 'work/myharmony/responses/20261031-h350-setup_GetDeviceModeButtonMaps-all.json');
    assert.ok(existsSync(path));
    type Button = { ButtonKey: string; ButtonAssignment: null | { OverriddenButtonMapType: number; OverriddenDeviceId: null | { Value: number } } };
    const reply = JSON.parse(readFileSync(path, 'utf8')) as {
      GetDeviceModeButtonMapsResult: { Key: { Value: number }; Value: { ButtonMapType: number; Buttons: Button[] } }[];
    };
    // The account's ids, in the setup's order, which the archive's `DeviceId` is, 8 of 8.
    const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as { devices: { name: string }[] };
    const ids = [83962903, 83962904, 83962905, 83962906, 83962907, 83962908, 83962909, 83962910];
    const nameOf = new Map(ids.map((id, k) => [id, setup.devices[k]!.name]));
    const types: AccountDevice[] = setup.devices.map((one) => ({ name: one.name, deviceType: catalogueDevice(IR_ARCHIVE!, ...IDENTIFIED['setup']![one.name]!.slice(0, 2) as [string, string]).deviceType }));
    const overrides: Record<string, string> = {};
    for (const one of reply.GetDeviceModeButtonMapsResult) {
      const name = nameOf.get(one.Key.Value)!;
      const of = (key: string) => {
        const assignment = one.Value.Buttons.find((button) => button.ButtonKey === key)?.ButtonAssignment;
        if (assignment === undefined || assignment === null) return '-';
        if (assignment.OverriddenButtonMapType === 0) return 'own';
        return `mode ${assignment.OverriddenButtonMapType}${assignment.OverriddenDeviceId === null ? '' : ` ${nameOf.get(assignment.OverriddenDeviceId.Value)}`}`;
      };
      overrides[name] = `${one.Value.ButtonMapType}: input ${of('TvInput')}, up ${of('VolumeUp')}, down ${of('VolumeDown')}, mute ${of('VolumeMute')}`;
      // What volumeSource says: the device's own, or the receiver, which the service names by device.
      const source = volumeSource(types.find((device) => device.name === name)!, types);
      const up = of('VolumeUp');
      assert.ok(source === name ? up === 'own' || up === `mode 1 ${name}` : up === `mode 1 ${source}`, name);
    }
    // The map type is the device key, 1 the TV key; the LG is the TV mode's device, so its Input is its own.
    assert.deepEqual(overrides, {
      'LG TV': '1: input own, up own, down own, mute own',
      Plasma: '2: input mode 1, up own, down own, mute own',
      Denon: '4: input mode 1, up mode 1 Denon, down mode 1 Denon, mute mode 1 Denon',
      KPN: '3: input mode 1, up mode 1 Denon, down mode 1 Denon, mute -',
      Kodi: '2: input mode 1, up mode 1 Denon, down mode 1 Denon, mute mode 1 Denon',
      Switch: '4: input mode 1, up mode 1 Denon, down mode 1 Denon, mute mode 1 Denon',
      'Sony HT': '3: input mode 1, up mode 1 Denon, down mode 1 Denon, mute mode 1 Denon',
      Knoll: '1: input mode 1, up mode 1 Denon, down mode 1 Denon, mute mode 1 Denon',
    });
  });

test('on every compile of the family Input sends the TV mode device\'s input command on every device map, or on none where it has none',
  needs, () => {
    const seen: Record<string, string> = {};
    for (const [file, c] of Object.entries(compiles())) {
      const account = accountOf(file, c);
      const tv = account.find((one) => one.group === 0)!;
      const command = INPUT_KEY.prefer.find((name) => tv.commands.includes(name));
      const maps = account.filter((one) => one.group !== undefined).map((one) => mapOf(c, one.group!));
      const binding = maps.map((map) => groupsSent(c, map, PRESS | INPUT_KEY.scan).join(','));
      // Every map's Input sends the group 0 device, or no map binds Input.
      const bound = binding.filter((one) => one === '0').length;
      assert.equal(bound + binding.filter((one) => one === '').length, maps.length, file);
      seen[file] = `${command ?? 'none'} ${bound}/${maps.length}`;
      assert.equal(bound, command === undefined ? 0 : maps.length, file);
    }
    assert.deepEqual(seen, {
      setup: 'InputNext 8/8', issue37: 'Input 5/5', programmed: 'none 0/3', three: 'none 0/2', factory: 'Source 3/3',
      h300programmed: 'none 0/4', h300: 'InputNext 2/2',
    });
  });

test('volume and mute go where volumeSource says on all eight maps of the test setup\'s compile but the KPN\'s mute, and on 9 of the 12 other devices that are neither a television nor a receiver',
  needs, () => {
    const verdicts: Record<string, string> = {};
    let agree = 0;
    let disagree = 0;
    for (const [file, c] of Object.entries(compiles())) {
      if (file === 'h300') continue;
      const account = accountOf(file, c);
      const typed: AccountDevice[] = account.filter((one) => one.type !== undefined).map((one) => ({ name: one.name, deviceType: one.type! }));
      for (const one of account) {
        if (one.group === undefined || one.type === undefined) continue;
        const map = mapOf(c, one.group);
        const source = volumeSource({ name: one.name, deviceType: one.type }, typed);
        const sourceGroup = account.find((device) => device.name === source)!.group;
        const sent = VOLUME_SCANS.map((scan) => groupsSent(c, map, PRESS | scan).join(','));
        const verdict = sent.every((groups) => groups === String(sourceGroup)) ? 'yes' : `no ${sent.join(' ')}`;
        verdicts[`${file} ${one.name}`] = verdict;
        if (one.type !== 1 && one.type !== 5 && file !== 'setup') {
          if (verdict === 'yes') agree += 1; else disagree += 1;
        }
      }
    }
    // The test setup's eight, the KPN's mute unbound; then the other compiles, where the activity's map is named.
    assert.deepEqual(Object.fromEntries(Object.entries(verdicts).filter(([, verdict]) => verdict !== 'yes')), {
      'setup KPN': 'no 2 2 ',
      'issue37 Qnap Media Player': 'no 5 5 5',
      'factory Radio': 'no 3 3 3',
      'h300programmed KPN': 'no   ',
    });
    // 12 that are neither on the other compiles: 9 agree, the QNAP and the Marantz keep their own, and the Harmony
    // 300's KPN, whose map is its activity's and binds no volume at all, is the activity's question.
    assert.deepEqual([agree, disagree], [9, 3]);
  });

test('a television\'s fifth favourite key holds its Home, else its Internet, on 4 of the 5 Harmony 350 televisions with either, and no other device binds it',
  needs, () => {
    const seen: Record<string, string> = {};
    for (const [file, c] of Object.entries(compiles())) {
      const five = FAVOURITE_FIVE[(c.versionWord ?? 0) & 0xff];
      if (five === undefined) continue;
      const numberSent = new Set<number>();
      for (const one of accountOf(file, c)) {
        if (one.group === undefined) continue;
        const map = mapOf(c, one.group);
        const entries = taggedList(c, c.pointerArray(6)![map]!)!.entries;
        const entry = entries.find((e) => e.tag === (PRESS | five.scan));
        // The favourites' device's map binds the first favourite key, scan 8, as well; on any other map the key holds
        // the device's own command.
        const channels = entries.some((e) => e.tag === (PRESS | 8));
        const expected = one.type === 1 ? five.prefer.find((name) => one.commands.includes(name)) : undefined;
        const state = entry === undefined ? 'none' : channels ? 'channel' : groupsSent(c, map, PRESS | five.scan).join(',') === String(one.group) ? 'own' : 'other';
        if (state === 'channel') numberSent.add(one.group);
        seen[`${file} ${one.name}`] = `${expected ?? '-'} ${state}`;
      }
      assert.ok(numberSent.size <= 1);
    }
    assert.deepEqual(seen, {
      'setup LG TV': 'Home own', 'setup Plasma': 'Internet own', 'setup Denon': '- none', 'setup KPN': '- channel',
      'setup Kodi': '- none', 'setup Switch': '- none', 'setup Sony HT': '- none', 'setup Knoll': '- none',
      'issue37 LG TV': 'Home channel', 'issue37 Humax DVR': '- none', 'issue37 LG DVD': '- none',
      'issue37 Qnap Media Player': '- none', 'issue37 Thomson SAT': '- none',
      'programmed PS': '- none', 'programmed KPN': '- channel', 'programmed TV': 'Internet own',
      'three KPN': '- channel', 'three TV': 'Internet own',
      'factory TV': 'Home none', 'factory Radio': '- none', 'factory Delta': '- none',
    });
  });

test('on every compile of the family, ten one block digit copies are stored for a device exactly where its catalogue type says, DIGIT_COPIES_BY_TYPE',
  needs, () => {
    const byType: Record<number, string[]> = {};
    const counts: Record<string, number> = {};
    for (const [file, c] of Object.entries(compiles())) {
      if (file === 'h300') continue;
      for (const one of accountOf(file, c)) {
        if (one.group === undefined || one.type === undefined) continue;
        // A digit's one block copy is a record of one block opening on a mark with no held block that sends the
        // catalogue digit's code, the digits composed from the catalogue entry the device is identified as. A record
        // a digit key sends opens on a silence or has a held block, so it is not counted.
        const found = IDENTIFIED[file]![one.name]!;
        const plan = catalogueDevicePlan(c, IR_ARCHIVE!, { manufacturer: found[0], model: found[1], label: 'X', full: true });
        const digits = Array.from({ length: 10 }, (_, d) => String(d)).filter((d) => plan.wanted.includes(d));
        const scratch = digits.length === 0 ? undefined : parse(composeIrGroup(c, digits.map((d) => plan.device.commands[plan.wanted.indexOf(d)]!)).bytes);
        const codes = new Set(scratch === undefined ? [] : irGroups(scratch)!.at(-1)!.addresses.map((address) => onceWithoutLeadIn(scratch, address).code));
        const count = irGroups(c)![one.group]!.addresses.map((address) => onceWithoutLeadIn(c, address))
          .filter((shape) => !shape.held && shape.opening === 0 && codes.has(shape.code)).length;
        counts[`${file} ${one.name}`] = count;
        assert.equal(count === 10, DIGIT_COPIES_BY_TYPE.get(one.type), `${file} ${one.name} ${one.type} ${count}`);
        (byType[one.type] ??= []).push(`${file} ${one.name}`);
      }
    }
    // Every device is 10 or 0, nothing between, and the types are covered by this many devices each.
    assert.deepEqual(Object.entries(counts).filter(([, count]) => count !== 0 && count !== 10), []);
    assert.deepEqual(Object.fromEntries(Object.entries(byType).map(([type, names]) => [type, names.length])),
      { 1: 7, 2: 1, 4: 2, 5: 1, 7: 1, 16: 1, 18: 6, 21: 1, 22: 1, 23: 1, 30: 1, 35: 2 });
  });

test('Teletext is stored with a send list nothing calls for every device with the command on a Harmony 350 compile, and bound to a key on the Harmony 300',
  needs, () => {
    const seen: Record<string, string> = {};
    for (const [file, c] of Object.entries(compiles())) {
      if (file === 'h300') continue;
      const lists = c.pointerArray(7)!;
      const called = new Set<number>();
      for (let k = 0; k + 2 < c.blob.length; k += 1) if (c.blob[k + 2] === 0x7f) called.add(bytes.u16(c.blob, k));
      for (const one of accountOf(file, c)) {
        if (one.group === undefined || !one.commands.includes('Teletext')) continue;
        // Records of the group whose every send list is uncalled and that are not a one block copy: what is stored
        // and bound to no key.
        const idle = irGroups(c)![one.group]!.addresses.filter((address, record) => {
          const shape = onceWithoutLeadIn(c, address);
          if (!shape.held && shape.opening === 0) return false;
          const senders = lists.flatMap((list, index) => {
            const at = c.blobOffsetOf(list)!;
            return bytes.u8(c.blob, at) === 3 && bytes.u16(c.blob, at + 4) === ((one.group! << 8) | record) ? [index] : [];
          });
          return senders.length > 0 && senders.every((index) => !called.has(index));
        });
        // The catalogue's Teletext as the composer builds it, looked for among them by what it sends.
        const found = IDENTIFIED[file]![one.name];
        let teletext = '?';
        if (found !== undefined) {
          const plan = catalogueDevicePlan(c, IR_ARCHIVE!, { manufacturer: found[0], model: found[1], label: 'X', full: true });
          const scratch = parse(composeIrGroup(c, [plan.device.commands[plan.wanted.indexOf('Teletext')]!]).bytes);
          const key = recordKey(scratch, irGroups(scratch)!.at(-1)!.addresses[0]!);
          teletext = idle.some((address) => recordKey(c, address) === key) ? 'idle' : 'not idle';
        }
        seen[`${file} ${one.name}`] = `${idle.length} ${teletext}`;
      }
    }
    // On the Harmony 350 the Teletext is idle on all eleven devices with one, the only idle record but on two
    // televisions; on the Harmony 300, which has the key, the plasma binds it, and the KPN's map is its activity's.
    assert.deepEqual(seen, {
      'setup Plasma': '1 idle', 'setup KPN': '1 idle',
      'issue37 LG TV': '3 idle', 'issue37 Humax DVR': '1 idle', 'issue37 Qnap Media Player': '1 idle',
      'programmed KPN': '1 idle', 'programmed TV': '1 idle', 'three KPN': '1 idle', 'three TV': '1 idle',
      'factory TV': '2 idle', 'factory Delta': '1 idle',
      'h300programmed KPN': '0 not idle', 'h300programmed Panasonic TV': '1 not idle',
    });
  });

test('on every compile of the family each device\'s power variable has two silent writes, of 0 and of 1, which nothing calls, and no other list opens with the silent flag',
  needs, () => {
    const seen: Record<string, [number, number, number]> = {};
    let devicesSeen = 0;
    for (const [file, c] of Object.entries(compiles())) {
      const lists = c.pointerArray(7)!;
      const called = new Set<number>();
      for (let k = 0; k + 2 < c.blob.length; k += 1) if (c.blob[k + 2] === 0x7f) called.add(bytes.u16(c.blob, k));
      const body = (index: number) => {
        const at = c.blobOffsetOf(lists[index]!)!;
        return Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => [bytes.u16(c.blob, at + 1 + 3 * k), bytes.u8(c.blob, at + 3 + 3 * k)] as const);
      };
      const silent = lists.map((_, index) => index).filter((index) => {
        const first = body(index)[0];
        return first?.[0] === SILENT_WRITE.operand && first[1] === SILENT_WRITE.opcode;
      });
      const powers = stateVariables(c).filter((one) => one.name.endsWith('_Power_2'));
      devicesSeen += powers.length;
      // Per device, the values its silent writes set, each list the flag and one write of the variable.
      const values = powers.map((one) => silent.filter((index) => {
        const list = body(index);
        return list.length === 2 && list[1]![1] === 0x80 + one.index;
      }).map((index) => body(index)[1]![0]).sort().join(','));
      assert.deepEqual([...new Set(values)], [POWER_RESETS.join(',')], file);
      seen[file] = [powers.length, silent.length, silent.filter((index) => called.has(index)).length];
    }
    // Devices, lists opening with the flag, and how many of those anything calls: twice the devices, and none.
    assert.deepEqual(seen, {
      setup: [8, 16, 0], issue37: [5, 10, 0], programmed: [3, 6, 0], three: [2, 4, 0], factory: [3, 6, 0],
      h300programmed: [4, 8, 0], h300: [2, 4, 0],
    });
    assert.equal(devicesSeen, 27);
  });

test('on every compile of the family the start up\'s entry 1 ends selecting the map of the device on the TV key\'s short press',
  needs, () => {
    let agree = 0;
    for (const c of Object.values(compiles())) {
      const startUp = c.blobOffsetOf(c.sections[5]!.address)!;
      const entry = { operand: bytes.u16(c.blob, startUp + 1 + 3 * START_UP_SELECT_ENTRY), opcode: bytes.u8(c.blob, startUp + 3 + 3 * START_UP_SELECT_ENTRY) };
      assert.equal(entry.opcode, 0x7f);
      const at = c.blobOffsetOf(c.pointerArray(7)![entry.operand]!)!;
      const count = bytes.u8(c.blob, at);
      const last = { operand: bytes.u16(c.blob, at + 1 + 3 * (count - 1)), opcode: bytes.u8(c.blob, at + 3 + 3 * (count - 1)) };
      assert.equal(last.opcode, 0x1f);
      assert.equal(last.operand, 0xff00 | mapOf(c, 0));
      // The control: entries 2 to 4 hold the same list without it.
      for (const other of [2, 3, 4]) {
        const call = bytes.u16(c.blob, startUp + 1 + 3 * other);
        const otherAt = c.blobOffsetOf(c.pointerArray(7)![call]!)!;
        assert.equal(bytes.u8(c.blob, otherAt), count - 1);
      }
      agree += 1;
    }
    assert.equal(agree, 7);
  });

// todo-compile-350.md 4.1.2: what the composer writes for a device on the TV key's short press, held as a closure on
// Logitech's own files, since every one has a device there and none can be composed onto without taking out a device
// the activity names: the select taken out and put back for the same map is Logitech's file byte for byte. The
// control is a select of another map, which must differ from Logitech's file in exactly the select's low byte.
test('taking the start up\'s select out and putting it back for the TV mode device\'s map gives Logitech\'s file byte for byte, on all seven',
  needs, () => {
    let same = 0;
    for (const [file, c] of Object.entries(compiles())) {
      const without = withoutStartUpSelect(c);
      assert.equal(without.blob.length, c.blob.length - 3, file);
      const back = withStartUpSelect(without, mapOf(c, 0));
      assert.deepEqual(back.blob, c.blob, file);
      const other = withStartUpSelect(without, mapOf(c, 0) + 1);
      const differing = [...other.blob].flatMap((value, k) => (value === c.blob[k] ? [] : [k]));
      // The select's map byte, and the trailer's two checksum bytes.
      assert.equal(differing.length <= 3 && differing.length >= 2, true, `${file} ${differing.length}`);
      same += 1;
    }
    assert.equal(same, 7);
  });

test('in all seven Logitech files of the family the metadata archive\'s Index is the position and DeviceId ascends strictly, and its names are alphabetical on the two Harmony 300 files alone',
  needs, () => {
    const alphabetical: Record<string, boolean> = {};
    let named = 0;
    for (const [file, c] of Object.entries(compiles())) {
      const listed = metadataArchive(c)!.devices;
      listed.forEach((one, k) => assert.equal(one.index, k, `${file} ${one.name}`));
      const ids = listed.map((one) => Number(one.deviceId));
      assert.ok(ids.every((id, k) => Number.isSafeInteger(id) && (k === 0 || id > ids[k - 1]!)), file);
      const names = listed.map((one) => one.name);
      alphabetical[file] = names.every((name, k) => k === 0 || names[k - 1]!.localeCompare(name) < 0);
      named += listed.length;
    }
    assert.equal(named, 29);
    assert.deepEqual(alphabetical, {
      setup: false, issue37: false, programmed: false, three: false, factory: false, h300programmed: true, h300: true,
    });
  });
