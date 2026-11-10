/**
 * The Harmony 300 and 350 configuration with no device and no activity, built from nothing,
 * 5.1.5, step 5 of [plan 011](../../../docs/plans/011-the-350-from-nothing.md). The builder is
 * `buildEmptyNoScreenConfiguration` in `families/harmony-300-350/empty.ts`; this is the argument for it.
 *
 * **The question was what "empty" means, and the answer is measured as far as it can be.** The first act was to look
 * for a Logitech compile of this family with no device: every container of architecture 16 the lab holds was parsed
 * and its key map table counted, and **none has fewer than two maps**, the key table and one device's. The smallest
 * are the harvest's two compiles for a Harmony 350 with one device each (11689 and 24935 bytes, one on the top left
 * key and one on the bottom left), then its compile for a Harmony 300 with two devices and an activity (35182 bytes).
 * So what Logitech writes for a configuration of none is not read, plan 011's open, and "empty" is the least each
 * generator writes with nothing to put in. **What can be measured is how the empty one sits beside those three**:
 * built at each one's own stamp, every part of ours is a part of theirs, and every part of theirs that ours lacks
 * names a device or the activity. The per section result, on all three:
 *
 * | section | ours against the smallest compiles |
 * |---|---|
 * | the key table | the four send event entries, spelled out, equal to theirs, and now the entry binding event `0xFF`, which no compile of theirs holds and which calls the list their `0x30` entry calls; their other entries are the devices' press and release (and on the 300 the activity's key) |
 * | the start up events | the eleven calls spelled out equal to theirs, but for the map select their first event ends with, which is the device's |
 * | the action lists | ours, nineteen, are theirs spelled out, but for that select; their other 57, 35 and 90 send codes, select a device, start a key's timers or write a device's or the activity's variable |
 * | the state records | the clock's seven and the firmware's eleven byte for byte, and the compiler's two byte variable; theirs add one power variable per device and the activity's flag |
 * | the name tree | Root and State; theirs names their variables |
 * | the infrared table | the same allocation, eight groups or four; every group of ours empty, as every group of theirs that holds no device |
 * | the metadata archive | its text equal to theirs with the device elements taken out |
 * | the log area, the parameter groups, the digit entry table | byte for byte, as on all 13 compiles of `noscreenconstants.test.ts` |
 * | the timers, the number sender | none; the one device compiles' timers are their key's, two per device |
 *
 * **What the file holds is held to the generators, and every byte of it is accounted for**, without a lab: the
 * header, the section table, the two markers and the trailer are the frame's; every other byte lies in a section, a
 * list, a state record, an infrared group or a parameter group found by following the file's own tables, and is
 * equal to what that part's generator writes, built afresh here at the same moment. Nothing is counted twice and
 * nothing is left over. That was written before plan 011's attribution, 5.2.1, which rebuilds each part from a
 * description read off any container, `noScreenAttributedBytes`; this is the same accounting on the one configuration
 * whose description is known without reading it, and the attribution agrees with it on both models,
 * `noscreenattribution.test.ts`.
 *
 * **The control**: a byte planted in the hold list, the hold time 10 made 11, and the trailer restamped. The
 * writer's own check, `assertFileFamilyContainer`, passes it, since it checks the frame and not the content, and the
 * accounting here names the list it disagrees with. Without the restamp the writer's check refuses it too.
 *
 * **The choices** are the builder's, its header: the start up selects no map, the lists are numbered start up first,
 * and the archive's ZIP time is the stamp's own zone. **The bytes that move with the moment** are exactly 25: the
 * seven fields of the stamp, the seven clock records' first values and the year's maximum, the archive's two time
 * and date words in each of its two headers, and the checksum.
 *
 * **What the bench write is for**, plan 011's check: the remote starts on it, no key sends and nothing hangs. What a
 * start that selects no map does is not read, and that is what the write settles.
 *
 * **Sources checked first.** Plan 011 step 5; `reference/architectures/harmony-300-350/memory.md` ("The sections
 * every configuration holds alike", "The six slots the firmware was read for"); `noscreenconstants.test.ts`,
 * `noscreenstatetables.test.ts`, `metadatabuild.test.ts`, `frame.test.ts`; the One family's `oneempty.test.ts`
 * for the shape. Logitech's client compiles nothing for this family, `reference/logitech/clients.md`, so it has no
 * empty configuration to read either.
 *
 * **Width.** Architecture 16, skins 104 and 79, the Harmony 350 and the European Harmony 300; skin 78 is refused,
 * no configuration stating it having been read. Compared against three compiles of Logitech's current service.
 *
 * **The infrared allocation, and a correction it made.** The empty configuration takes eight groups on a Harmony 350
 * and four on a Harmony 300, `INFRARED_GROUPS_BY_SKIN`, which is what 12 of the 13 compiles hold whatever their
 * devices. The thirteenth, the contributed Harmony 350 configuration compiled in 2017, holds seven, groups 4 and 6
 * empty and no group 7: so the allocation follows the compiler, as raw slot 8's timers were found to, and the
 * Harmony 350's reference page saying "eight in every configuration"<!--superseded--> was wider than its evidence, which predated
 * that file being read. Eight is what the current service writes, so it is what this builds.
 *
 * **What would falsify it.** A compile of this family with no device that holds something this does not, or a part
 * of the three smallest compiles that is neither ours nor a device's.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, skipWithoutLab } from '@harmony/lab';
import { assertFileFamilyContainer } from '@harmony/usb/rails';

import { type Container, irGroups, metadataArchive, parse } from '../../../src/index.ts';
import {
  architectureRecord,
  buildEmptyNoScreenConfiguration,
  buildNoScreenStateTables,
  buildTimestampSection,
  type ContainerPiece,
  EMPTY_LIST_NUMBERS,
  EMPTY_ZONE_HOURS,
  inCompilerOrder,
  INFRARED_GROUPS_BY_SKIN,
  layOutContainer,
  noScreenDigitEntryTable,
  noScreenLogArea,
  noScreenMetadataSection,
  noScreenAcknowledgingEntry,
  noScreenParameterBlock,
  noScreenSendEventEntries,
  noScreenSendEventLists,
  noScreenStartUpLists,
  noScreenStartUpTable,
  noScreenZipTime,
  restamped,
  takeApart,
} from '../../../src/build.ts';
import { nameNodes, stateRecords, taggedListBytes, trailerChecksum } from '../../../src/internal.ts';
import { allLists, maps, namer, spelled } from './noscreenparts.ts';
import { proves } from '@harmony/testkit/proof';

const MOMENT = '2026-11-01T12:00:00';
const FLASH_BASE = 0x020000;
/** Raw slots by what they hold on this family, `ARCH16_SLOT_MAP` and `FRAME_ARCHITECTURES[16]`. */
const RAW = { tree: 0, arch: 1, log: 2, stamp: 3, infrared: 4, startUp: 5, keyMaps: 6, lists: 7, timers: 8, state: 9, parameters: 10, senders: 11, digits: 12, archive: 13 } as const;

/** A piece's bytes with every field that names an absolute address written in; a piece naming another piece is refused. */
function resolved(piece: ContainerPiece): Uint8Array {
  const out = new Uint8Array(piece.bytes);
  for (const ref of piece.refs) {
    assert.ok('address' in ref, 'only absolute addresses are resolved here');
    out.set([ref.address & 0xff, (ref.address >> 8) & 0xff, (ref.address >> 16) & 0xff], ref.at);
  }
  return out;
}

/**
 * Every byte of an empty configuration accounted for: found through the file's own tables and held to what that
 * part's generator writes at `builtAt` for `skin`. Returns the disagreements, each named, and the bytes no part
 * claims; both empty for a file that is the generators' and nothing else.
 */
function account(bytes: Uint8Array, skin: number, builtAt: string): { disagreements: string[]; unclaimed: number; claimed: number } {
  const c = parse(bytes);
  const owner: (string | undefined)[] = new Array(bytes.length).fill(undefined);
  const disagreements: string[] = [];
  const offsetOf = (address: number): number => c.blobOffsetOf(address)!;
  const section = (raw: number): number => offsetOf(c.sections[raw]!.address);
  /** Claim `length` bytes at `at` for `name`; where `expected` is given, they have to equal it, and `skip` lists offsets inside that the frame writes. */
  const claim = (name: string, at: number, length: number, expected?: Uint8Array, skip: readonly number[] = []): void => {
    for (let k = at; k < at + length; k += 1) {
      if (owner[k] !== undefined) disagreements.push(`${name} overlaps ${owner[k]}`);
      owner[k] = name;
    }
    if (expected === undefined) return;
    if (expected.length !== length) {
      disagreements.push(`${name} is ${length} bytes, its generator writes ${expected.length}`);
      return;
    }
    for (let k = 0; k < length; k += 1) {
      if (skip.some((field) => k >= field && k < field + 3)) continue;
      if (bytes[at + k] !== expected[k]) {
        disagreements.push(`${name} differs at byte ${k}`);
        return;
      }
    }
  };
  /** A table of a count and three byte addresses: its count checked, its addresses the frame's. */
  const table = (name: string, at: number, width: number, count: number): number[] => {
    const stated = width === 1 ? bytes[at]! : bytes[at]! | (bytes[at + 1]! << 8);
    if (stated !== count) disagreements.push(`${name} counts ${stated}, not ${count}`);
    claim(name, at, width + 3 * stated);
    return Array.from({ length: stated }, (_, k) => {
      const p = at + width + 3 * k;
      return bytes[p]! | (bytes[p + 1]! << 8) | (bytes[p + 2]! << 16);
    });
  };

  // The frame's own: the header, the section table and its marker, the trailer.
  const length = bytes.length;
  const header = new Uint8Array(11);
  header.set([...'GSPM'].map((ch) => ch.charCodeAt(0)), 0);
  new DataView(header.buffer).setUint32(4, FLASH_BASE + length - 4, true);
  header.set([0x00, 0x0f, 0x00], 8);
  claim('header', 0, 11, header);
  claim('section table', 0x0b, 4 * 15);
  claim('LWJL', 0x47, 4, new Uint8Array([...'LWJL'].map((ch) => ch.charCodeAt(0))));
  const trailer = new Uint8Array(6);
  new DataView(trailer.buffer).setUint16(0, trailerChecksum(bytes), true);
  trailer.set([...'PTYY'].map((ch) => ch.charCodeAt(0)), 2);
  claim('trailer', length - 6, 6, trailer);

  // The generators, afresh.
  const lists = new Map([...noScreenStartUpLists(EMPTY_LIST_NUMBERS.startUp), ...noScreenSendEventLists(EMPTY_LIST_NUMBERS.sendEvents)]);
  const state = buildNoScreenStateTables({ devices: [], activity: false }, builtAt).built;
  const parameters = noScreenParameterBlock();
  const groups = INFRARED_GROUPS_BY_SKIN[skin]!;

  // The key table and the key map table that names it.
  const { sendEvents } = EMPTY_LIST_NUMBERS;
  const keyTable = taggedListBytes(inCompilerOrder([], [...noScreenSendEventEntries(sendEvents), noScreenAcknowledgingEntry(sendEvents)]));
  const keyMaps = table('key map table', section(RAW.keyMaps), 1, 1);
  if (offsetOf(keyMaps[0]!) !== 0x4b) disagreements.push('the key map table names something other than the key table');
  claim('key table', 0x4b, keyTable.length, keyTable);
  // The lists, by index.
  table('action list table', section(RAW.lists), 2, lists.size).forEach((address, index) => {
    const expected = lists.get(index)!.bytes;
    claim(`list ${index}`, offsetOf(address), expected.length, expected);
  });
  // The state table, its records by index, and the name tree.
  const stateAt = section(RAW.state);
  claim('state table', stateAt, state.stateTable.bytes.length, state.stateTable.bytes, state.stateTable.refs.map((ref) => ref.at));
  (stateRecords(c) ?? []).forEach((record, index) => {
    const expected = state.records[index]?.bytes ?? new Uint8Array();
    claim(`state record ${index}`, offsetOf(record.address), expected.length, expected);
  });
  claim('name tree', section(RAW.tree), state.nameTree.bytes.length, state.nameTree.bytes);
  // The infrared table, each group empty.
  table('infrared table', section(RAW.infrared), 1, groups).forEach((address, group) => {
    claim(`infrared group ${group}`, offsetOf(address), 3, new Uint8Array(3));
  });
  // The parameter block.
  table('parameter table', section(RAW.parameters), 1, parameters.groups.length).forEach((address, group) => {
    const expected = parameters.groups[group]!.bytes;
    claim(`parameter group ${group}`, offsetOf(address), expected.length, expected);
  });
  // The sections of one piece each.
  claim('architecture record', section(RAW.arch), 7, architectureRecord(16, skin));
  claim('log area', section(RAW.log), 8, resolved(noScreenLogArea()));
  claim('stamp', section(RAW.stamp), 14, buildTimestampSection(builtAt));
  claim('start up table', section(RAW.startUp), 34, noScreenStartUpTable(EMPTY_LIST_NUMBERS.startUp));
  table('timer table', section(RAW.timers), 1, 0);
  table('number sender table', section(RAW.senders), 1, 0);
  claim('digit entry table', section(RAW.digits), 2, noScreenDigitEntryTable().bytes);
  const archive = noScreenMetadataSection([], { deviceIds: [], time: noScreenZipTime(builtAt, EMPTY_ZONE_HOURS) });
  claim('metadata archive', section(RAW.archive), archive.length, archive);
  if (!c.sections[14]!.isNull) disagreements.push('raw slot 14 is not NULL');

  const unclaimed = owner.filter((one) => one === undefined).length;
  return { disagreements, unclaimed, claimed: length - unclaimed };
}

test('the empty Harmony 350 and Harmony 300 configurations pass the writer\'s check, from a skin and a moment alone', () => {
  proves(61, ['harmony-350'], ['docs/test-notes/harmony-350.md', 'packages/codec/test/families/harmony-300-350/noscreenemptyunit.test.ts']);
  // 1105 and 1081 bytes since the entry was added, four more than before: the entry binding event 0xFF.
  for (const [skin, length, groups] of [[104, 1105, 8], [79, 1081, 4]] as const) {
    const built = buildEmptyNoScreenConfiguration({ skin, builtAt: MOMENT });
    assert.equal(built.bytes.length, length, `skin ${skin}: length`);
    assert.equal(built.container.allChecksPass, true, `skin ${skin}: every container check`);
    const checked = assertFileFamilyContainer(built.bytes);
    assert.equal(checked.endAddr, FLASH_BASE + length - 4, `skin ${skin}: end_addr names the end marker`);
    assert.equal(checked.readLength, length - 4, `skin ${skin}: what a read of the file returns`);
    assert.equal(checked.storedChecksum, trailerChecksum(built.bytes), `skin ${skin}: the trailer`);
    assert.equal(built.container.architecture, 16);
    assert.equal(irGroups(built.container)!.length, groups, `skin ${skin}: the infrared allocation`);
  }
  // Two builds at one moment are one file: nothing in the build reads a clock or a file of its own accord.
  const [a, b] = [buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT }), buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT })];
  assert.deepEqual(a.bytes, b.bytes);
  // A skin no configuration of has been read, and a stamp base slot 3 cannot hold, are refused.
  assert.throws(() => buildEmptyNoScreenConfiguration({ skin: 78, builtAt: MOMENT }), /no configuration of skin 78 has been read/);
  assert.throws(() => buildEmptyNoScreenConfiguration({ skin: 104, builtAt: 'yesterday' }));
});

test('every byte of the empty configuration is a generator\'s, and a planted byte is named', () => {
  for (const skin of [104, 79]) {
    const built = buildEmptyNoScreenConfiguration({ skin, builtAt: MOMENT });
    const out = account(built.bytes, skin, MOMENT);
    assert.deepEqual(out.disagreements, [], `skin ${skin}`);
    assert.equal(out.unclaimed, 0, `skin ${skin}: bytes no part claims`);
    assert.equal(out.claimed, built.bytes.length);
  }
  // The control: the hold time, `3F F00A`, made 11 in the hold list, list 4, and the trailer restamped. The writer's
  // check is about the frame and passes it; the accounting names the list. Unrestamped, the writer's check refuses.
  const built = buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT });
  const c = built.container;
  const hold = c.blobOffsetOf(c.pointerArray(RAW.lists)![EMPTY_LIST_NUMBERS.startUp.hold]!)!;
  assert.deepEqual([...built.bytes.subarray(hold + 1, hold + 4)], [0x0a, 0xf0, 0x3f], 'the hold list opens with 3F F00A');
  const planted = new Uint8Array(built.bytes);
  planted[hold + 1] = 0x0b;
  assert.throws(() => assertFileFamilyContainer(planted), /checksum/);
  restamped(planted);
  assert.doesNotThrow(() => assertFileFamilyContainer(planted));
  assert.deepEqual(account(planted, 104, MOMENT).disagreements, [`list ${EMPTY_LIST_NUMBERS.startUp.hold} differs at byte 1`]);
  // And the file as a read of `/cfg/usercfg` returns it, four bytes short, is refused for its missing end marker.
  assert.throws(() => assertFileFamilyContainer(built.bytes.subarray(0, built.bytes.length - 4)), /PTYY/);
});

/** The empty configuration with event `0xFF` bound, written by `bin/empty-no-screen.ts`. */
const EMPTY_54 = 'work/setups/h350-empty/empty-350-5.4.bin';

test('the 5.4 file in the lab is this build from its own stamp, byte for byte, binds event 0xFF and passes the writer\'s check', skipWithoutLab(), () => {
  const at = join(LAB!, EMPTY_54);
  assert.ok(existsSync(at), `${EMPTY_54} is in the lab, written by bin/empty-no-screen.ts`);
  const file = new Uint8Array(readFileSync(at));
  const c = parse(file);
  assert.equal(file.length, 1105);
  assert.deepEqual(buildEmptyNoScreenConfiguration({ skin: 104, builtAt: c.builtAt! }).bytes, file);
  assert.equal(assertFileFamilyContainer(file).readLength, file.length - 4);
  // The key table: the four send event entries and 0xFF, which calls what 0x30 calls.
  assert.deepEqual(Object.keys(maps(c).keys!).sort(), [...PIN_TAGS, 'ff']);
  assert.equal(maps(c).keys!['ff'], maps(c).keys!['30']);
});

test('the empty configuration is taken apart and laid out again byte for byte, and only the moment moves 25 bytes', () => {
  const built = buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT });
  assert.deepEqual(layOutContainer(takeApart(built.container)).bytes, built.bytes);
  const later = buildEmptyNoScreenConfiguration({ skin: 104, builtAt: '2027-03-15T08:42:31' });
  assert.equal(later.bytes.length, built.bytes.length);
  const moved: number[] = [];
  built.bytes.forEach((one, k) => { if (one !== later.bytes[k]) moved.push(k); });
  // Where each moved byte is: the stamp's seven fields, the clock records (each one's first value, a u16 at its
  // start, and the year's maximum), the archive's time and date words in its local header and its central directory,
  // the checksum.
  const c = built.container;
  const stamp = c.blobOffsetOf(c.sections[RAW.stamp]!.address)! + 2;
  const clock = stateRecords(c)!.slice(0, 7).map((record) => c.blobOffsetOf(record.address)!);
  const archive = metadataArchive(c)!.offset;
  const expected = [
    ...clock, clock[6]! + 2,
    ...Array.from({ length: 7 }, (_, k) => stamp + k),
    ...[14, 15, 16, 17].map((k) => archive + k), ...[343, 344, 345, 346].map((k) => archive + k),
    built.bytes.length - 6, built.bytes.length - 5,
  ].sort((x, y) => x - y);
  assert.deepEqual(moved, expected);
  assert.equal(moved.length, 25);
});

// ---------------------------------------------------------------------------------------------------------------
// Against the smallest of Logitech's compiles

/** The three smallest compiles of the family the lab holds, by their path in the lab, and the skin each states. */
const SMALLEST: readonly { path: string; skin: number; extraLists: number; otherTags: string[] }[] = [
  { path: 'work/harvest/check-350/compile-002-Result.EzHex', skin: 104, extraLists: 57, otherTags: ['45', '85'] },
  { path: 'work/harvest/check-350/compile-001-Result.EzHex', skin: 104, extraLists: 35, otherTags: ['47', '87'] },
  { path: 'work/harvest/check-300/compile-001-Result.EzHex', skin: 79, extraLists: 90, otherTags: ['84', '85', '86'] },
];

function atPath(path: string): Container {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  const bytes = readFileSync(at);
  return parse(new Uint8Array(bytes.subarray(bytes.indexOf('GSPM'))));
}

/** The four tags of the key table the firmware's send path raises, whose entries every compile holds alike. */
const PIN_TAGS = ['2d', '2e', '2f', '30'];
/** What names a device or the activity in a list written out by `namer`. */
const A_DEVICES = /send\(|select\(|ebnn|_Power_|ActivityPowerState/;

test('the empty configuration is every part of the three smallest Logitech compiles that is not a device\'s', skipWithoutLab(), () => {
  let compared = 0;
  for (const { path, skin, extraLists, otherTags } of SMALLEST) {
    const theirs = atPath(path);
    const ours = buildEmptyNoScreenConfiguration({ skin, builtAt: theirs.builtAt! }).container;
    assert.equal(theirs.blob[theirs.blobOffsetOf(theirs.sections[RAW.arch]!.address)! + 2], skin, `${path}: skin`);
    // The key table: the four send event entries alike, and the entry binding event 0xFF, which is ours alone, 5.4:
    // theirs binds no 0xFF, and ours, spelled out, is what their 0x30 entry calls.
    const [keysOurs, keysTheirs] = [maps(ours).keys!, maps(theirs).keys!];
    assert.deepEqual(Object.keys(keysOurs).sort(), [...PIN_TAGS, 'ff']);
    for (const tag of PIN_TAGS) assert.equal(keysOurs[tag], keysTheirs[tag], `${path}: tag ${tag}`);
    assert.equal(keysTheirs['ff'], undefined, `${path}: theirs binds no 0xFF`);
    assert.equal(keysOurs['ff'], keysTheirs['30'], `${path}: our 0xFF is their 0x30's list`);
    const others = Object.keys(keysTheirs).filter((tag) => !PIN_TAGS.includes(tag));
    assert.deepEqual(others.sort(), otherTags, `${path}: the devices' entries`);
    // Each selects a device, or is a device key's press starting that key's timers.
    for (const tag of others) assert.match(keysTheirs[tag]!, /select\(|ebnn/, `${path}: tag ${tag} is a device's`);
    // The start up: the same eleven calls, theirs' first event ending in one select of a device's map.
    const startUp = (c: Container) => c.pointerArray(RAW.startUp)!.map((v) => namer(c)(spelled(c, { opcode: v >> 16, operand: v & 0xffff })));
    const [upOurs, upTheirs] = [startUp(ours), startUp(theirs)];
    assert.equal(upTheirs[1]!.match(/ select\([^)]*\)/g)?.length, 1, `${path}: one select`);
    assert.deepEqual(upTheirs.map((one) => one.replace(/ select\([^)]*\)/, '')), upOurs, `${path}: the start up`);
    // The lists: ours are theirs, written out, but for that select; theirs' others all name a device or the activity.
    const [listsOurs, listsTheirs] = [allLists(ours), allLists(theirs)];
    const selecting = [...listsTheirs.keys()].find((one) => one.startsWith('((3f:f00a') && one.includes('select('))!;
    listsTheirs.set(selecting, listsTheirs.get(selecting)! - 1);
    const plain = selecting.replace(/ select\([^)]*\)/, '');
    listsTheirs.set(plain, (listsTheirs.get(plain) ?? 0) + 1);
    let extra = 0;
    for (const [text, n] of listsOurs) assert.ok((listsTheirs.get(text) ?? 0) >= n, `${path}: our ${text} is theirs`);
    for (const [text, n] of listsTheirs) {
      const more = n - (listsOurs.get(text) ?? 0);
      if (more <= 0) continue;
      extra += more;
      assert.match(text, A_DEVICES, `${path}: a list of theirs that is not ours names a device`);
    }
    assert.equal(extra, extraLists, `${path}: lists that are the devices'`);
    // The state records: the clock and the firmware's byte for byte at their stamp, and the compiler's two byte
    // variable last in both; theirs' others are named variables.
    const record = (c: Container, index: number) => {
      const at = c.blobOffsetOf(stateRecords(c)![index]!.address)!;
      return Buffer.from(c.blob.subarray(at, at + stateRecords(c)![index]!.length)).toString('hex');
    };
    for (let k = 0; k < 18; k += 1) assert.equal(record(ours, k), record(theirs, k), `${path}: state record ${k}`);
    const [nOurs, nTheirs] = [stateRecords(ours)!.length, stateRecords(theirs)!.length];
    assert.equal(record(ours, nOurs - 1), record(theirs, nTheirs - 1), `${path}: the two byte variable`);
    const named = nameNodes(theirs)!.filter((node) => node.level === 1).map((node) => node.name);
    assert.equal(named.length, nTheirs - nOurs, `${path}: every further variable of theirs is named`);
    assert.ok(named.every((name) => A_DEVICES.test(name)), `${path}: and is a device's or the activity's`);
    assert.deepEqual(nameNodes(ours)!.map((node) => node.name), ['Root', 'State']);
    // The infrared table: the same allocation, and each of their groups that holds no device as empty as ours.
    const [gOurs, gTheirs] = [irGroups(ours)!, irGroups(theirs)!];
    assert.equal(gOurs.length, gTheirs.length, `${path}: groups`);
    assert.ok(gOurs.every((group) => group.addresses.length === 0));
    for (const group of gTheirs.filter((one) => one.addresses.length === 0)) {
      assert.deepEqual([...theirs.blob.subarray(group.start, group.start + 3)], [0, 0, 0], `${path}: an empty group`);
    }
    // The archive: their text with the device elements taken out.
    assert.equal(metadataArchive(theirs)!.xml.replace(/<Device>.*<\/Device>/s, ''), metadataArchive(ours)!.xml, `${path}: the archive`);
    // The constants, byte for byte where each sits.
    for (const [raw, length] of [[RAW.log, 8], [RAW.digits, 2]] as const) {
      const bytesOf = (c: Container) => Buffer.from(c.blob.subarray(c.blobOffsetOf(c.sections[raw]!.address)!, c.blobOffsetOf(c.sections[raw]!.address)! + length)).toString('hex');
      assert.equal(bytesOf(ours), bytesOf(theirs), `${path}: raw slot ${raw}`);
    }
    compared += 1;
  }
  assert.equal(compared, 3);
});

/**
 * The 13 compiles of the family `noscreenconstants.test.ts` counts its constants over: the test setup's two, the five
 * bench fixtures and the six further ones, the three smallest above among them. The same population, stated again
 * here since a test file is not imported. A walk of the whole lab for containers stating architecture 16 found
 * nothing else of Logitech's for the Harmony 300 or 350, only files of ours made from these, reads of the bench
 * units, and one contributed configuration of skin 81, a Harmony 200i's, which no builder here serves.
 */
const THIRTEEN: readonly string[] = [
  'work/setups/h350-test/compile-Result.EzHex', 'work/setups/h350-test/first-compile/compile-Result.EzHex',
  'dumps/danny/harmony-350-factory/harmony-350-config.bin', 'dumps/danny/harmony-350-three-devices/harmony-350-three-devices-config.bin',
  'dumps/danny/harmony-350-programmed/harmony-350-programmed-config.bin', 'dumps/danny/harmony-300-asfound/harmony-300-config.bin',
  'dumps/danny/harmony-300-programmed/harmony-300-programmed-config.bin',
  'work/harvest/check-350/compile-001-Result.EzHex', 'work/harvest/check-350/compile-002-Result.EzHex',
  'work/harvest/check-350-retry/compile-001-Result.EzHex', 'work/harvest/check-350-eight/compile-001-Result.EzHex',
  'work/harvest/check-300/compile-001-Result.EzHex',
  'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex',
];

test('none of the 13 compiles of the family has no device, and all but the 2017 one allocate the infrared groups of their skin', skipWithoutLab(), () => {
  // A key map table of one entry, the key table alone, is what a compile of no device would state. The fewest is two.
  const devicesOf = (c: Container) => c.pointerArray(RAW.keyMaps)!.length - 1;
  const all = THIRTEEN.map((path) => atPath(path));
  const counts = all.map(devicesOf);
  assert.deepEqual(counts, [8, 8, 3, 3, 4, 2, 4, 1, 1, 2, 8, 2, 5]);
  assert.equal(Math.min(...counts), 1);
  // The infrared allocation the empty configuration takes, `INFRARED_GROUPS_BY_SKIN`, against all 13: eight on every
  // Harmony 350 compile of Logitech's current service and four on every Harmony 300 compile, the 2011 one included,
  // whatever the devices. **The 2017 compile, issue 37's, holds seven**: its groups 4 and 6 empty and no group 7, so
  // the allocation is the compiler's and not the model's, as raw slot 8's timers are, and eight is what the current
  // service writes. This is what killed "eight in every configuration"<!--superseded--> in the Harmony 350's reference page.
  const groups = all.map((c) => irGroups(c)!.length);
  assert.deepEqual(groups, [8, 8, 8, 8, 8, 4, 4, 8, 8, 8, 8, 4, 7]);
  const issue37 = all[THIRTEEN.length - 1]!;
  assert.equal(issue37.builtAt!.slice(0, 4), '2017');
  assert.deepEqual(irGroups(issue37)!.map((group) => group.addresses.length === 0), [false, false, false, false, true, false, true]);
  all.slice(0, -1).forEach((c, k) => {
    const skin = c.blob[c.blobOffsetOf(c.sections[RAW.arch]!.address)! + 2]!;
    assert.equal(groups[k], INFRARED_GROUPS_BY_SKIN[skin], `${THIRTEEN[k]}: skin ${skin}`);
  });
  // The control that the count reads what it says: ours, built from nothing, states none.
  assert.equal(devicesOf(buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT }).container), 0);
});
