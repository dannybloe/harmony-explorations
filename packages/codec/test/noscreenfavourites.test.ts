/**
 * The no screen family's favourite channels, `todo-compile-350.md` 4.3, held against what Logitech's compiler writes
 * for the same channels on the same device.
 *
 * **The calibration is free.** Logitech's service compiled the Harmony 350 test setup twice for the bench unit's
 * record, first without the favourite channels and then with the five on the KPN, 1, 2, 3, 666 and 07, typed into
 * MyHarmony in that order, the lab's `work/setups/h350-test/first-compile/compile-Result.EzHex` and
 * `compile-Result.EzHex`. A read of the two, the lab's `work/setups/h350-test/chapter4-reading.md`, accounts for every
 * byte between them as the five channels and renumbering. So the five are composed onto the first and the result
 * held against the second:
 *
 * * **its length is the second's, 186 bytes more than the first**: five lists of two instructions or two calls, five
 *   list table entries, five map entries, the number sender's three tables and record, and its table entry, with
 *   nothing else added or lost;
 * * **the KPN's map is the second's, tag for tag and in the same stored order**, which the family's hash map
 *   simulation predicts from the first compile's map with the five tags put in at the heads of their buckets: one of
 *   them, `0x82`, shares a bucket with `0xB1` and with `0xA0`, and is stored ahead of both, where putting it in at
 *   the tail would not. In which order the five go in makes no difference here, since no two of them share a bucket,
 *   so the order the channels were entered is not what this tests; every binding sends what the second's does;
 * * **the number sender is the second's**: flags, base, minimum and three instructions zero, and three identical
 *   tables, each calling the list that sends the KPN's one block copy of that digit;
 * * **every list of the result is one of the second's**, all 331 spelled out with the lists they call, a state
 *   variable's number, a map's number and a timer's number masked since those are renumbered between compiles; and
 *   every other map, every state record and every infrared record is the first's.
 *
 * **A second calibration, on a device of ours**: the KPN composed from the catalogue onto the factory configuration's
 * free key has whole digit records, which its digit keys send, and none of the one block copies Logitech's compile
 * holds for the KPN; so the composer appends ten copies and their send lists, and each copy is Logitech's KPN copy
 * of the same digit word for word. That is the copy rule `sequence.ts` measured on the Harmony 650 holding on the
 * Harmony 350 too.
 *
 * **What it rests on besides.** Which key holds which channel, `FAVOURITE_SCANS`, is the order of the second compile
 * and of the three other Harmony 350 compiles with five favourites, which come from two remotes, so it is scored
 * against one compile whose order of entry is known. The `1F F300` hand over is in all five compiles of this
 * family with favourites as read while writing this, and asserted here on two, and the favourites were heard
 * sending their channels on the bench Harmony 350, `packages/bench/test/setup350.test.ts`.
 * **Sources checked first**: Logitech's client compiles nothing for this family; `reference/config-format/state.md`
 * "Base slot 16: the number sender", the 350's `features.md` and `keys.md`, the archive's sections 154, 156 and
 * 262, and the lab reading above, which agrees on every fact used here. **Which architectures**: the Harmony 350
 * alone; the Harmony 300 holds its favourites on other keys and is refused.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  bytes, ComposeError, compilerHash, composeNoScreenDevice, composeNoScreenFavourites, type Container, inCompilerOrder, irGroups,
  numberSenders, parse, stateRecords, taggedList,
} from '../src/index.ts';
import { onceWithoutLeadIn, recordKey, spelled, spelledMap } from './noscreenparts.ts';

const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
const SECOND = 'work/setups/h350-test/compile-Result.EzHex';
const KPN = { name: 'KPN', manufacturer: 'KPN', model: 'TV6000COK' };
const CHANNELS = ['1', '2', '3', '666', '07'];
/** The KPN's map in both compiles, the bottom right key's short press, and its group. */
const KPN_MAP = 3;
const KPN_GROUP = 3;
/** Every digit's send spelled whole, since one device's digits share a long opening. */
const WHOLE = Infinity;

const needsCompiles = needing(skipWithoutLab(), skipWithoutIrArchive());

function lab(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

let memo: { first: Container; second: Container; ours: Container; out: ReturnType<typeof composeNoScreenFavourites> } | undefined;
function composed() {
  if (memo !== undefined) return memo;
  const first = lab(FIRST);
  const out = composeNoScreenFavourites(first, IR_ARCHIVE!, { ...KPN, channels: CHANNELS });
  memo = { first, second: lab(SECOND), ours: parse(out.bytes), out };
  return memo;
}

/** Every action list, spelled with what it calls, as a multiset. */
function listBodies(c: Container): Map<string, number> {
  const out = new Map<string, number>();
  c.pointerArray(7)!.forEach((_, list) => {
    const body = spelled(c, { opcode: 0x7f, operand: list }, 0, WHOLE)
      .replace(/71:80[0-9a-f]{2}/g, '71:80vv').replace(/\b9[0-9a-f]:/g, '9v:').replace(/1f:ff[0-9a-f]{2}/g, '1f:ffnn')
      .replace(/1f:eb[0-9a-f]{2}/g, '1f:ebnn');
    out.set(body, (out.get(body) ?? 0) + 1);
  });
  return out;
}

test('the five favourite channels composed onto Logitech\'s compile without them make it exactly as long as Logitech\'s compile with them',
  needsCompiles, () => {
    const { first, second, ours, out } = composed();
    assert.ok(ours.allChecksPass);
    assert.equal(ours.blob.length, second.blob.length);
    assert.equal(second.blob.length - first.blob.length, 186);
    // Integers through the number sender, the leading zero digit by digit, on the five keys in entered order.
    assert.deepEqual(out.channels.map((one) => `${one.channel} ${one.scan} ${one.sent}`),
      ['1 8 number', '2 9 number', '3 11 number', '666 34 number', '07 2 digits']);
    // Logitech's compile already holds the ten digit copies and their lists, nothing calling them.
    assert.equal(out.copiesAdded, 0);
    assert.equal(out.listsAdded, 0);
    assert.equal(out.map, KPN_MAP);
  });

test('the KPN\'s map gains the five favourite keys in the order Logitech\'s compile stores them, each sending what Logitech\'s sends',
  needsCompiles, () => {
    const { first, second, ours } = composed();
    const tags = (c: Container) => taggedList(c, c.pointerArray(6)![KPN_MAP]!)!.entries.map((one) => one.tag.toString(16));
    assert.deepEqual(tags(first), ['a3', '90', 'b2', '83', 'b1', 'a0', 'b4']);
    assert.deepEqual(tags(ours), tags(second));
    assert.deepEqual(tags(ours), ['89', '88', '8b', 'a3', '90', 'b2', 'a2', '83', '82', 'b1', 'a0', 'b4']);
    assert.deepEqual([...spelledMap(ours, KPN_MAP, WHOLE)].sort(), [...spelledMap(second, KPN_MAP, WHOLE)].sort());
    // What the five send: a load and the hand over, or two digit lists.
    const mine = spelledMap(ours, KPN_MAP, WHOLE);
    assert.equal(mine.get(0x88), '(7a:1 1f:f300)');
    assert.equal(mine.get(0xa2), '(7a:29a 1f:f300)');
    assert.match(mine.get(0x82)!, /^\(\(7:fffb send\(.*\) 7c:1\) \(7:fffb send\(.*\) 7c:1\)\)$/);
    // And in Logitech's, 07 calls the very lists the number sender's table calls for 0 and for 7.
    const table = numberSenders(second)!.records[0]!.tables[0]!.instructions.map((one) => one.operand);
    const seven = taggedList(second, second.pointerArray(6)![KPN_MAP]!)!.entries.find((one) => one.tag === 0x82)!;
    const at = second.blobOffsetOf(second.pointerArray(7)![seven.operand]!)!;
    assert.deepEqual([bytes.u8(second.blob, at), bytes.u16(second.blob, at + 1), bytes.u16(second.blob, at + 4)],
      [2, table[0], table[7]]);
  });

test('the five go in at the heads of their buckets: put in at the tails, the map would be stored otherwise than Logitech stores it',
  needsCompiles, () => {
    // The control the order above needs is the other insertion rule, not a plain concatenation, which is out of
    // bucket order and would fail whatever the rule.
    const { first, second } = composed();
    const stored = taggedList(first, first.pointerArray(6)![KPN_MAP]!)!.entries;
    const logitech = taggedList(second, second.pointerArray(6)![KPN_MAP]!)!.entries.map((one) => one.tag);
    const five = [0x88, 0x89, 0x8b, 0xa2, 0x82].map((tag) => ({ tag, operand: 0, opcode: 0x7f }));
    assert.deepEqual(inCompilerOrder(stored, five).map((one) => one.tag), logitech);
    // At the tails: the same bucket order, each new tag behind the stored ones of its bucket. Twelve tags, so no
    // doubling either way.
    const slot = (tag: number) => compilerHash(tag) & 15;
    const tails = [...stored, ...five].map((one, k) => ({ tag: one.tag, k }))
      .sort((a, b) => slot(a.tag) - slot(b.tag) || a.k - b.k).map((one) => one.tag);
    assert.notDeepEqual(tails, logitech);
    // Where they differ: the one new tag sharing a bucket, `0x82`, ahead of `0xB1` and `0xA0` in Logitech's.
    assert.ok(logitech.indexOf(0x82) < logitech.indexOf(0xb1) && logitech.indexOf(0x82) < logitech.indexOf(0xa0));
    assert.ok(tails.indexOf(0x82) > tails.indexOf(0xb1) && tails.indexOf(0x82) > tails.indexOf(0xa0));
  });

test('the number sender is Logitech\'s: one record of zeros and three identical tables calling the KPN\'s digit copies 0 to 9',
  needsCompiles, () => {
    const { ours, second, first, out } = composed();
    assert.equal(numberSenders(first)!.records.length, 0);
    const read = (c: Container) => {
      const [record, ...rest] = numberSenders(c)!.records;
      assert.equal(rest.length, 0);
      return {
        fields: [record!.flags, record!.base, record!.digits, record!.prologue.opcode, record!.epilogue.opcode, record!.prefix.opcode],
        tables: record!.tables.map((table) => table.instructions.map((one) => spelled(c, one, 0, WHOLE))),
        // The three tables thirty bytes apart and the record right after them, the block after the last state record.
        layout: [...record!.tables.map((table) => table.address - record!.tables[0]!.address), record!.address - record!.tables[0]!.address],
        after: c.blobOffsetOf(record!.tables[0]!.address)! === Math.max(...stateRecords(c)!.map((one) => c.blobOffsetOf(one.address)! + one.length)),
      };
    };
    const mine = read(ours);
    assert.deepEqual(mine, read(second));
    assert.deepEqual(mine.fields, [0, 0, 0, 0, 0, 0]);
    assert.deepEqual(mine.layout, [0, 30, 60, 90]);
    assert.equal(mine.after, true);
    assert.deepEqual(mine.tables[1], mine.tables[0]);
    assert.deepEqual(mine.tables[2], mine.tables[0]);
    // Each digit's list sends a record of the KPN's group with no held block and no silence first: its copy.
    for (const list of out.digitLists) {
      const at = ours.blobOffsetOf(ours.pointerArray(7)![list]!)!;
      const operand = bytes.u16(ours.blob, at + 4);
      assert.equal(operand >> 8, KPN_GROUP);
      const address = irGroups(ours)![KPN_GROUP]!.addresses[operand & 0xff]!;
      assert.match(recordKey(ours, address), /\/[0-9,]+\|-\|-$/);
      assert.equal(onceWithoutLeadIn(ours, address).opening, 0);
    }
    assert.equal(new Set(out.digitLists).size, 10);
  });

test('every list of the result is one of Logitech\'s compile with favourites, and nothing else of the compile without them changed',
  needsCompiles, () => {
    const { first, second, ours } = composed();
    const [mine, logitech] = [listBodies(ours), listBodies(second)];
    assert.equal([...mine.values()].reduce((a, b) => a + b, 0), 331);
    assert.deepEqual([...mine].sort(), [...logitech].sort());
    // Every map but the KPN's, every state record and every group as the first compile holds them.
    for (let map = 0; map < first.pointerArray(6)!.length; map += 1) {
      if (map === KPN_MAP) continue;
      assert.deepEqual([...spelledMap(ours, map)], [...spelledMap(first, map)], `map ${map}`);
    }
    const records = (c: Container) => stateRecords(c)!.map((one) => `${one.first}/${one.second}/${one.values.length}`);
    assert.deepEqual(records(ours), records(first));
    const groups = (c: Container) => irGroups(c)!.map((group) => group.addresses.map((address) => recordKey(c, address)).join(';'));
    assert.deepEqual(groups(ours), groups(first));
  });

test('on a KPN of ours the composer makes the ten digit copies, each Logitech\'s KPN copy of the same digit word for word',
  needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless('h350_config')), () => {
    // The factory configuration's bottom left key is free, and it holds no favourites.
    const factory = parse(require_('h350_config'));
    const device = composeNoScreenDevice(factory, IR_ARCHIVE!, { ...KPN, place: 2 });
    const out = composeNoScreenFavourites(parse(device.bytes), IR_ARCHIVE!, { ...KPN, channels: CHANNELS });
    const ours = parse(out.bytes);
    assert.ok(ours.allChecksPass);
    assert.equal(out.copiesAdded, 10);
    assert.equal(out.listsAdded, 10);
    // The digit each table entry sends, ours against Logitech's, record for record.
    const second = lab(SECOND);
    const sent = (c: Container) => numberSenders(c)!.records[0]!.tables[0]!.instructions.map((one) => spelled(c, one, 0, WHOLE));
    assert.deepEqual(sent(ours), sent(second));
    // The favourite keys send what Logitech's send, the copies included.
    const mine = spelledMap(ours, out.map, WHOLE);
    const logitech = spelledMap(second, KPN_MAP, WHOLE);
    for (const tag of [0x88, 0x89, 0x8b, 0xa2, 0x82]) assert.equal(mine.get(tag), logitech.get(tag), tag.toString(16));
    // The copies are new records of the group: its whole records, which its keys send, are still there.
    assert.equal(irGroups(ours)![2]!.addresses.length, irGroups(parse(device.bytes))![2]!.addresses.length + 10);
    // And Logitech's KPN holds no whole record of a digit: the copies are the only records of its digits there.
    const whole = device.commands.flatMap((name, k) => (/^[0-9]$/.test(name) ? [recordKey(ours, irGroups(ours)![2]!.addresses[k]!)] : []));
    assert.equal(whole.length, 10);
    const theirs = irGroups(second)![KPN_GROUP]!.addresses.map((address) => recordKey(second, address));
    assert.equal(whole.filter((key) => theirs.includes(key)).length, 0);
  });

test('the favourites composer refuses what no compile shows', needsCompiles, () => {
  const { first, ours } = composed();
  const compose = (c: Container, channels: readonly string[], device = KPN) => () =>
    composeNoScreenFavourites(c, IR_ARCHIVE!, { ...device, channels });
  assert.throws(compose(first, ['1', '2', '3', '4', '5', '6']), /6 favourite channels/);
  assert.throws(compose(first, []), /0 favourite channels/);
  assert.throws(compose(first, ['0']), /of 0 is in no compile/);
  assert.throws(compose(first, ['12a']), /decimal digits/);
  assert.throws(compose(first, ['70000']), /does not fit/);
  // A second set, on any device: the number sender holds one record.
  assert.throws(compose(ours, ['5']), /holds a record already/);
  // The LG TV's own map binds the fifth favourite key, scan 2, to its Home.
  assert.throws(compose(first, CHANNELS, { name: 'LG TV', manufacturer: 'LG', model: 'OLED65G26LA' }), /binds 1 favourite key/);
  assert.throws(compose(first, ['1'], { ...KPN, name: 'Nobody' }), /no device called Nobody/);
  assert.throws(compose(first, ['1'], { ...KPN, name: 'Nobody' }), ComposeError);
});

test('the favourites composer refuses the Harmony 300, whose favourite keys are in another order',
  needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless('h300_programmed_config')), () => {
    const c = parse(require_('h300_programmed_config'));
    assert.throws(() => composeNoScreenFavourites(c, IR_ARCHIVE!, { ...KPN, channels: ['1'] }), /skin 79/);
    // The order it differs by: the one map with favourites sends 1, 2, 3 and 666 from scans 8, 2, 9 and 34.
    const maps = c.pointerArray(6)!.map((address) => taggedList(c, address)!.entries);
    const withFavourites = maps.filter((entries) => entries.some((one) => one.tag === 0x88 && spelled(c, one).startsWith('(7a:')));
    assert.equal(withFavourites.length, 1);
    const channel = (scan: number) => spelled(c, withFavourites[0]!.find((one) => one.tag === (0x80 | scan))!);
    assert.deepEqual([8, 2, 9, 34].map(channel), ['(7a:1 1f:f300)', '(7a:2 1f:f300)', '(7a:3 1f:f300)', '(7a:29a 1f:f300)']);
  });

// The reference's claim about every compile of the family with favourites, `reference/config-format/state.md`
// "Base slot 16: the number sender": the lists the digit tables call send a one block record. Four compiles, three
// of the Harmony 350 and one of the Harmony 300; another owner's Harmony 350 compile, `h350_issue37_config`, holds
// the same and is not read here because its file is an archive this package does not open.
test('in four compiles of the family with favourites every digit list the number sender calls sends a record of one block opening on a mark',
  needing(skipWithoutLab(), skipUnless('h350_three_devices_config', 'h350_programmed_config', 'h300_programmed_config')), () => {
    const compiles: Record<string, Container> = {
      setup: lab(SECOND),
      three: parse(require_('h350_three_devices_config')),
      programmed: parse(require_('h350_programmed_config')),
      h300: parse(require_('h300_programmed_config')),
    };
    const shapes: Record<string, string[]> = {};
    for (const [name, c] of Object.entries(compiles)) {
      const [record, ...rest] = numberSenders(c)!.records;
      assert.equal(rest.length, 0, name);
      shapes[name] = record!.tables.flatMap((table) => table.instructions.map((one) => {
        const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
        const operand = bytes.u16(c.blob, at + 4);
        const address = irGroups(c)![operand >> 8]!.addresses[operand & 0xff]!;
        const copy = onceWithoutLeadIn(c, address);
        // The list's shape, its middle instruction a send, then the record's: no silence first, no block but the first.
        const middle = bytes.u8(c.blob, at + 6).toString(16);
        return `${bytes.u8(c.blob, at)} ${middle} ${copy.opening} ${recordKey(c, address).endsWith('|-|-') ? 'one' : 'more'}`;
      }));
    }
    for (const [name, shape] of Object.entries(shapes)) assert.deepEqual(shape, new Array(30).fill('3 7d 0 one'), name);
    assert.equal(Object.keys(shapes).length, 4);
  });
