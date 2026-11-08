/**
 * The Harmony 300 and 350's constant sections and lists, built from nothing and held against every compile of the
 * family the lab holds, `todo-compile-350.md` 5.1.3, step 3 of
 * [plan 011](../../../docs/plans/011-the-350-from-nothing.md). The builders are `families/harmony-300-350/constants.ts`.
 *
 * **The question.** Plan 011 counted 232 bytes per configuration that no generator wrote and that looked the same
 * in every compile: the log area (8), the parameter block (16 and 21), the digit entry table (2), the start up event
 * table (34) and the six lists it reaches (42), and the thirteen lists the key table's four send event tags reach
 * (109), with those four entries of the key table besides. The census test,
 * `noscreencensus.test.ts`, had compared the first four byte for byte over seven compiles; the start up lists had
 * been read by hand in one; the send event lists had been flattened and compared over thirteen in
 * `tests/test_harmony_300_350_send_events.py`, but never list by list. So the first act was the comparison.
 *
 * **What was measured, over 13 compiles**: the seven the census counts (the test setup's compile and its first
 * compile, and the five bench fixtures, `h350_config`, `h350_three_devices_config`, `h350_programmed_config`,
 * `h300_config` and `h300_programmed_config`), and six more, five compiles from the gathering harvest (four for a
 * 350, one for a 300) and the contributed 350 of issue 37. Ten are a Harmony 350's and three a Harmony 300's. One
 * is from 2011, one from 2017 and eleven from Logitech's current service.
 *
 * 1. **The log area, the digit entry table, raw slot 14 and the five parameter groups are the same bytes in 13 of
 *    13**, and the parameter table differs only in where the groups are. The log area reads `00 20`, `00 00 07`,
 *    `00 00 08`: a capacity of 8192 and the region `0x070000` to `0x080000`, which is a closure across fields,
 *    8192 records of eight bytes being exactly the region's 64 KiB, as arch 14's 16384 records fill its 128 KiB.
 *    The shared `buildLogArea` builds it from `LOG_AREAS`, where the region now stands beside arch 12's and 14's.
 *    It is the Harmony 525's slot 2 byte for byte, `ARCH16_SLOT_MAP`, which is not claimed as shared.
 * 2. **The start up is one shape in 13 of 13.** Eleven calls: entry 0 and entries 5 to 10 the same empty list,
 *    entries 1 to 4 a list each, which Logitech numbers 0 to 3 in all 13. Each of those four calls one hold list
 *    and then the empty list, and the first then selects a key map. The hold list is `3F F00A`, `1F FE00` and `1F
 *    FEFE` in all 13. Six lists, 42 bytes.
 * 3. **The map the first event selects is the setup's**: the map of the device on the lowest infrared group that
 *    holds one, `startUpGroup`, in 13 of 13, read through the key table's binding for that group's key,
 *    `mapOfGroup`, so by a route that does not pass through the start up at all. In 12 that group is 0, the top
 *    left key's short press, the TV key's device the reference names. **The thirteenth is the one compile whose top
 *    left key holds no device**, the harvest's first 350 compile, with one device on the bottom left key, group 2:
 *    its start up selects that device's map, where the reference said the device on group 0 and where
 *    `withoutStartUpSelect` drops the select. One compile with one device cannot tell the lowest group from the only
 *    device, so which device of several Logitech would pick with the TV key empty is not checked. The calibration:
 *    the top right key's device, group 1, is the selected map in none of the 13, and the first map, map 1, in 10,
 *    so the rule is not a coincidence of map 1 being first.
 * 4. **The send event lists are three lists each and one shared empty list, in 13 of 13**: the tag binds a list
 *    that calls a load list and the empty list and ends `07 FFFA`; the load list loads the byte register with 0 and
 *    calls a test; the test is `71 8111`, variable 17 compared, and the pin switched `E9p2` and `E9p0`. The pin is
 *    the tag's, `SEND_EVENT_PINS`, as the Python test found flattened. Thirteen lists, 109 bytes, and the empty
 *    list is never the start up's (13 of 13), so a configuration holds two empty lists.
 *
 * **What the description is.** A list index, since lists are called by index and numbered in an order nothing
 * reproduces yet (plan 011), and the selected map's index. The test reads them off each compile by structure, the
 * start up table's entries and the key table's tags, then calls the builders and compares the bytes they return with
 * the bytes the compile holds at those lists: a builder that read a byte it writes from the file would have no
 * file to read here.
 *
 * **No constant differs by model**, decision 28: the three Harmony 300 compiles hold the same bytes as the ten
 * Harmony 350 compiles in every section built here, so nothing is a table by skin.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/memory.md` and `firmware.md` ("The six
 * slots", "A held key", the send events); `tests/test_harmony_350_slots.py`,
 * `tests/test_harmony_300_350_send_events.py`, `tests/test_harmony_350_long_press.py`; the census test; plan 011.
 * Logitech's client compiles nothing for this family (`reference/logitech/clients.md`), so it states none of this.
 * `docs/findings.md` sections 259 to 265 name the slots and hold no bytes of these lists.
 *
 * **Width.** Arch 16 alone, both models, two generations of the compiler. **Not checked**: what reads the parameter
 * block (no firmware read of raw slot 10 is known), what the `0xFE` push and the `07 FFFA` do, which comparison
 * form 1 of `0x71` is, and whether the order in which Logitech numbers these lists matters to the remote.
 *
 * **What would falsify it.** A compile of the family whose bytes at any of these places differ from the builders'
 * for the numbers it states, or whose first start up event selects another map than its top left key's device's.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import { type Container, parse } from '../src/index.ts';
import {
  buildLogArea,
  type ContainerPiece,
  HOLD_TIME,
  mapOfGroup,
  NO_SCREEN_PARAMETERS,
  noScreenDigitEntryTable,
  noScreenLogArea,
  noScreenParameterBlock,
  noScreenSendEventEntries,
  noScreenSendEventLists,
  type NoScreenSendEventNumbers,
  noScreenStartUpLists,
  type NoScreenStartUpNumbers,
  noScreenStartUpTable,
  SEND_EVENT_PINS,
  startUpGroup,
} from '../src/build.ts';
import { taggedList } from '../src/internal.ts';
import { sameBytes } from '../src/support/bytes.ts';

/** The five bench fixtures, by the lab's names. */
const NAMED = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'];
/** The census's two compiles of the test setup, by their path in the lab, which has no name for them. */
const SETUP = ['work/setups/h350-test/compile-Result.EzHex', 'work/setups/h350-test/first-compile/compile-Result.EzHex'];
/** The six further compiles of the family, as `tests/test_harmony_300_350_send_events.py` reads them. */
const FURTHER = [
  'work/harvest/check-350/compile-001-Result.EzHex',
  'work/harvest/check-350/compile-002-Result.EzHex',
  'work/harvest/check-350-retry/compile-001-Result.EzHex',
  'work/harvest/check-350-eight/compile-001-Result.EzHex',
  'work/harvest/check-300/compile-001-Result.EzHex',
  'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex',
];

const needsLab = needing(skipWithoutLab(), skipUnless(...NAMED));

/** A compile by its path in the lab, from its `GSPM` on; the lab is there, so a missing file fails. */
function atPath(path: string): Container {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  const bytes = readFileSync(at);
  return parse(new Uint8Array(bytes.subarray(bytes.indexOf('GSPM'))));
}

/** The seven compiles the census counts. */
const seven = (): [string, Container][] =>
  [...SETUP.map((path): [string, Container] => [path, atPath(path)]), ...NAMED.map((name): [string, Container] => [name, parse(require_(name))])];
const further = (): [string, Container][] => FURTHER.map((path): [string, Container] => [path, atPath(path)]);

const START_UP_SLOT = 5;
const KEY_MAP_SLOT = 6;
const LIST_SLOT = 7;
const PARAMETER_SLOT = 10;
const DIGIT_ENTRY_SLOT = 12;
const CALL = 0x7f;

interface Op { operand: number; opcode: number }
const opsAt = (c: Container, at: number): Op[] =>
  Array.from({ length: c.blob[at]! }, (_, k) => ({ operand: c.blob[at + 1 + 3 * k]! | (c.blob[at + 2 + 3 * k]! << 8), opcode: c.blob[at + 3 + 3 * k]! }));
const listAt = (c: Container, index: number): number => c.blobOffsetOf(c.pointerArray(LIST_SLOT)![index]!)!;
const listBytes = (c: Container, index: number): Uint8Array => {
  const at = listAt(c, index);
  return c.blob.slice(at, at + 1 + 3 * c.blob[at]!);
};
const calls = (c: Container, index: number): number[] => opsAt(c, listAt(c, index)).filter((one) => one.opcode === CALL).map((one) => one.operand);
const sectionAt = (c: Container, slot: number): number => c.blobOffsetOf(c.sections[slot]!.address)!;
// The codec's one byte comparison, `todo.md` 7.3.7, under the name this file has always used.
const same = sameBytes;

/** A piece's bytes with its address fields filled: an absolute address as stated, a piece by where `placed` puts it. */
function resolved(piece: ContainerPiece, placed: (to: ContainerPiece) => number = () => { throw new Error('no piece is placed'); }): Uint8Array {
  const out = piece.bytes.slice();
  for (const ref of piece.refs) {
    const address = 'address' in ref ? ref.address : placed(ref.to) + ref.offset;
    out.set([address & 0xff, (address >> 8) & 0xff, address >> 16], ref.at);
  }
  return out;
}

/** The start up's numbers as the compile states them, read off the table and the lists it calls; the map is the rule's. */
function startUpNumbers(c: Container): NoScreenStartUpNumbers {
  const table = opsAt(c, sectionAt(c, START_UP_SLOT));
  const events = [1, 2, 3, 4].map((entry) => table[entry]!.operand) as [number, number, number, number];
  return { empty: table[0]!.operand, hold: calls(c, events[0])[0]!, events, map: startUpMap(c) };
}

/** The groups whose key selects a map, the devices a configuration holds by their group, `mapOfGroup`. */
const occupied = (c: Container): number[] => Array.from({ length: 8 }, (_, group) => group).filter((group) => {
  try {
    mapOfGroup(c, group);
    return true;
  } catch {
    return false;
  }
});
/** The rule: the map of the device on the lowest group that holds one. */
const startUpMap = (c: Container): number | undefined => {
  const group = startUpGroup(occupied(c));
  return group === undefined ? undefined : mapOfGroup(c, group);
};

/** The send events' numbers as the compile states them, read off the key table's four tags and the calls under them. */
function sendEventNumbers(c: Container): NoScreenSendEventNumbers {
  const entries = taggedList(c, c.pointerArray(KEY_MAP_SLOT)![0]!)!.entries.filter((one) => SEND_EVENT_PINS.has(one.tag));
  let empty = -1;
  const events = new Map(entries.map((one) => {
    const [load, emptyHere] = calls(c, one.operand);
    empty = emptyHere!;
    return [one.tag, { bound: one.operand, load: load!, test: calls(c, load!)[0]! }];
  }));
  return { empty, events };
}

/** What one compile agrees with, per builder, and the bytes the builders wrote for it. */
function score(c: Container): { agrees: Record<string, boolean>; bytes: number; entryBytes: number } {
  const agrees: Record<string, boolean> = {};
  let bytes = 0;
  const log = resolved(noScreenLogArea());
  agrees.log = same(log, c.blob.slice(sectionAt(c, 2), sectionAt(c, 2) + 8)) && c.sectionLength(2) === log.length;
  bytes += log.length;

  const block = noScreenParameterBlock();
  const theirs = c.pointerArray(PARAMETER_SLOT)!;
  const placedAt = new Map(block.groups.map((group, k) => [group, theirs[k]!]));
  const table = resolved(block.table, (to) => placedAt.get(to)!);
  const tableAt = sectionAt(c, PARAMETER_SLOT);
  agrees.parameterTable = same(table, c.blob.slice(tableAt, tableAt + table.length)) && c.sectionLength(PARAMETER_SLOT) === table.length;
  agrees.parameterGroups = block.groups.length === theirs.length
    && block.groups.every((group, k) => same(group.bytes, c.blob.slice(c.blobOffsetOf(theirs[k]!)!, c.blobOffsetOf(theirs[k]!)! + group.bytes.length)));
  bytes += table.length + block.groups.reduce((sum, group) => sum + group.bytes.length, 0);

  const digits = noScreenDigitEntryTable().bytes;
  agrees.digitEntry = same(digits, c.blob.slice(sectionAt(c, DIGIT_ENTRY_SLOT), sectionAt(c, DIGIT_ENTRY_SLOT) + 2)) && c.sectionLength(DIGIT_ENTRY_SLOT) === 2;
  agrees.raw14 = c.sections[14]!.address === 0;
  bytes += digits.length;

  const start = startUpNumbers(c);
  const startTable = noScreenStartUpTable(start);
  agrees.startUpTable = same(startTable, c.blob.slice(sectionAt(c, START_UP_SLOT), sectionAt(c, START_UP_SLOT) + startTable.length))
    && c.sectionLength(START_UP_SLOT) === startTable.length;
  const startLists = noScreenStartUpLists(start);
  agrees.startUpLists = [...startLists].every(([index, piece]) => same(piece.bytes, listBytes(c, index)));
  bytes += startTable.length + [...startLists.values()].reduce((sum, piece) => sum + piece.bytes.length, 0);

  const send = sendEventNumbers(c);
  const sendLists = noScreenSendEventLists(send);
  agrees.sendEventLists = sendLists.size === 13 && [...sendLists].every(([index, piece]) => same(piece.bytes, listBytes(c, index)));
  const key = taggedList(c, c.pointerArray(KEY_MAP_SLOT)![0]!)!;
  agrees.sendEventEntries = !key.wide && noScreenSendEventEntries(send).every((built) =>
    key.entries.filter((one) => one.tag === built.tag).length === 1
    && key.entries.some((one) => one.tag === built.tag && one.operand === built.operand && one.opcode === built.opcode));
  // The two empty lists are separate lists, so a configuration holds both.
  agrees.twoEmptyLists = start.empty !== send.empty;
  bytes += [...sendLists.values()].reduce((sum, piece) => sum + piece.bytes.length, 0);
  return { agrees, bytes, entryBytes: 4 * noScreenSendEventEntries(send).length };
}

/** Per builder, how many of `files` agree, and the bytes the builders wrote for each. */
function tally(files: [string, Container][]): { agree: Record<string, number>; bytes: number[]; entryBytes: number[] } {
  const agree: Record<string, number> = {};
  const bytes: number[] = [];
  const entryBytes: number[] = [];
  for (const [label, c] of files) {
    const one = score(c);
    for (const [name, ok] of Object.entries(one.agrees)) {
      agree[name] = (agree[name] ?? 0) + (ok ? 1 : 0);
      if (!ok) agree[`${name} not ${label}`] = 1;
    }
    bytes.push(one.bytes);
    entryBytes.push(one.entryBytes);
  }
  return { agree, bytes, entryBytes };
}

const EVERY_BUILDER = ['log', 'parameterTable', 'parameterGroups', 'digitEntry', 'raw14', 'startUpTable', 'startUpLists', 'sendEventLists',
  'sendEventEntries', 'twoEmptyLists'];
const all = (n: number): Record<string, number> => Object.fromEntries(EVERY_BUILDER.map((name) => [name, n]));

test('the family\'s constant sections and lists are built byte for byte for the seven compiles the census counts, 232 bytes each', needsLab, () => {
  const files = seven();
  assert.equal(files.length, 7);
  const { agree, bytes, entryBytes } = tally(files);
  assert.deepEqual(agree, all(7));
  // 8 log area, 16 and 21 parameter block, 2 digit entry, 34 and 42 start up, 109 send events: the census's 232,
  // and the key table's four entries, 16 bytes of the key table's 69 and 37.
  assert.deepEqual(bytes, Array(7).fill(232));
  assert.deepEqual(entryBytes, Array(7).fill(16));
  // Both models are among them, by the architecture record's skin.
  const skins = files.map(([, c]) => c.blob[sectionAt(c, 1) + 2]);
  assert.deepEqual(skins, [104, 104, 104, 104, 104, 79, 79]);
});

test('and for the six further compiles of the family, among them a third Harmony 300 compile and another owner\'s', needing(skipWithoutLab()), () => {
  const files = further();
  assert.equal(files.length, 6);
  const { agree, bytes } = tally(files);
  assert.deepEqual(agree, all(6));
  assert.deepEqual(bytes, Array(6).fill(232));
  assert.deepEqual(files.map(([, c]) => c.blob[sectionAt(c, 1) + 2]), [104, 104, 104, 104, 79, 104]);
});

test('the start up selects the map of the device on the lowest group that holds one in 13 of 13, the top left key\'s in the 12 where it has one', needsLab, () => {
  const files = [...seven(), ...further()];
  const selected = (c: Container): number | undefined => {
    const first = opsAt(c, listAt(c, startUpNumbers(c).events[0])).at(-1)!;
    return first.opcode === 0x1f && first.operand >> 8 === 0xff ? first.operand & 0xff : undefined;
  };
  const mapOf = (c: Container, group: number): number | undefined => (occupied(c).includes(group) ? mapOfGroup(c, group) : undefined);
  const byRule = files.filter(([, c]) => selected(c) === startUpMap(c)).length;
  // The reference's rule, the device on group 0, which holds wherever that key has a device.
  const byGroupZero = files.filter(([, c]) => selected(c) === mapOf(c, 0)).length;
  const withoutGroupZero = files.filter(([, c]) => !occupied(c).includes(0)).map(([label]) => label);
  // The calibration: the same question asked of the next key's device, and of the first map, which a rule that only
  // fitted map 1 being first would answer as often.
  const byGroupOne = files.filter(([, c]) => selected(c) === mapOf(c, 1)).length;
  const byFirstMap = files.filter(([, c]) => selected(c) === 1).length;
  assert.deepEqual({ byRule, byGroupZero, byGroupOne, byFirstMap, of: files.length },
    { byRule: 13, byGroupZero: 12, byGroupOne: 0, byFirstMap: 10, of: 13 });
  assert.deepEqual(withoutGroupZero, ['work/harvest/check-350/compile-001-Result.EzHex']);
  // Its one device is on the bottom left key, group 2, and the start up selects it.
  assert.deepEqual(occupied(files.find(([label]) => label === withoutGroupZero[0])![1]), [2]);
  // Logitech numbers the four start up event lists 0 to 3 in every one.
  assert.deepEqual([...new Set(files.map(([, c]) => startUpNumbers(c).events.join()))], ['0,1,2,3']);
});

test('the builders are not echoing a file: a wrong number, map or architecture changes the bytes, and what cannot be one list is refused', () => {
  const numbers: NoScreenStartUpNumbers = { empty: 9, hold: 8, events: [0, 1, 2, 3], map: 1 };
  const lists = noScreenStartUpLists(numbers);
  assert.equal([...lists.values()].reduce((sum, piece) => sum + piece.bytes.length, 0), 42);
  // Event 1's list with a select, and without one it is events 2 to 4's.
  assert.deepEqual([...lists.get(0)!.bytes], [3, 8, 0, 0x7f, 9, 0, 0x7f, 1, 0xff, 0x1f]);
  const without = noScreenStartUpLists({ empty: 9, hold: 8, events: [0, 1, 2, 3] });
  assert.deepEqual([...without.get(0)!.bytes], [...without.get(1)!.bytes]);
  assert.deepEqual([...lists.get(8)!.bytes], [3, HOLD_TIME, 0xf0, 0x3f, 0, 0xfe, 0x1f, 0xfe, 0xfe, 0x1f]);
  assert.notDeepEqual([...noScreenStartUpLists({ ...numbers, map: 2 }).get(0)!.bytes], [...lists.get(0)!.bytes]);
  assert.deepEqual([...noScreenStartUpTable(numbers)], [11, ...[9, 0, 1, 2, 3, 9, 9, 9, 9, 9, 9].flatMap((list) => [list, 0, 0x7f])]);
  assert.throws(() => noScreenStartUpLists({ ...numbers, hold: 9 }), /six indices/);

  const send: NoScreenSendEventNumbers = {
    empty: 40,
    events: new Map([[0x2d, { bound: 1, load: 2, test: 3 }], [0x2e, { bound: 4, load: 5, test: 6 }],
      [0x2f, { bound: 7, load: 8, test: 9 }], [0x30, { bound: 10, load: 11, test: 12 }]]),
  };
  const built = noScreenSendEventLists(send);
  assert.equal([...built.values()].reduce((sum, piece) => sum + piece.bytes.length, 0), 109);
  // 0x2F switches pin 1 and 0x2E pin 2, which is not tag order: the pin is the table's, not the tag's position.
  assert.deepEqual([...built.get(9)!.bytes], [3, 0x11, 0x81, 0x71, 0x12, 0xe9, 0x1f, 0x10, 0xe9, 0x1f]);
  assert.deepEqual([...built.get(6)!.bytes], [3, 0x11, 0x81, 0x71, 0x22, 0xe9, 0x1f, 0x20, 0xe9, 0x1f]);
  assert.deepEqual([...built.get(1)!.bytes], [3, 2, 0, 0x7f, 40, 0, 0x7f, 0xfa, 0xff, 0x07]);
  assert.deepEqual(noScreenSendEventEntries(send).map((one) => [one.tag, one.operand, one.opcode]),
    [[0x2d, 1, 0x7f], [0x2e, 4, 0x7f], [0x2f, 7, 0x7f], [0x30, 10, 0x7f]]);
  assert.throws(() => noScreenSendEventLists({ ...send, events: new Map([...send.events].slice(1)) }), /send events are the tags/);
  assert.throws(() => noScreenSendEventLists({ ...send, empty: 3 }), /thirteen indices/);

  // Another architecture's log area is another region.
  assert.notDeepEqual([...resolved(buildLogArea(14))], [...resolved(noScreenLogArea())]);
  assert.deepEqual([...resolved(noScreenLogArea())], [0x00, 0x20, 0x00, 0x00, 0x07, 0x00, 0x00, 0x08]);
  assert.deepEqual(NO_SCREEN_PARAMETERS.map((group) => group.length), [1, 1, 4, 1, 1]);
});
