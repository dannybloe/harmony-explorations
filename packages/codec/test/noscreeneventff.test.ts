/**
 * The one configuration entry that lets a Harmony 300 send from an infrared group above 3: firmware event
 * `0xFF` bound in key map 0 to the list that event `0x30` runs. This file holds the entry and what it left
 * alone; `packages/bench/test/eventff300.test.ts` holds what the bench heard with it.
 *
 * **The question.** Logitech's compile of the Harmony 350's test setup holds eight devices on infrared groups
 * 0 to 7. Written to the bench Harmony 300 it sent from groups 0 to 3 and hung at the first send from group
 * 4, `tests/test_harmony_300_group_4_send.py`: the 300's application raises firmware event `0xFF` for a send
 * from a group above 3, no configuration of the family binds that event, so the list that ends in the
 * acknowledgement `07 FFFA` never runs and the sender waits for ever. The trace predicted that binding `0xFF` to
 * a list ending in `07 FFFA` would make the send work. This is the configuration that was built to test it.
 *
 * **What it is.** The compile with one entry added to key map 0: tag `0xFF`, opcode and operand those of the
 * entry tagged `0x30`, a call of the action list the 350's event for group 3 runs. `withMapEntries` puts the
 * entry where the compiler's own hash order puts it, which is between tags `0x2D` and `0x30` here, moves
 * everything after it by the entry's four bytes with the pointers that name it, and `restamped` redoes the
 * trailer checksum. The bytes below were made by exactly that, `work/300-event-ff/bind-ff.ts` in the lab, and
 * the first test makes them again from the compile and demands the same 118517 bytes.
 *
 * **What the claims are.**
 *
 * 1. The file is the compile's bytes with the codec's entry insert and a restamp, byte for byte, 4 longer.
 * 2. Map 0 holds the compile's 17 entries and the one new tag, and the new one is the `0x30` entry's
 *    opcode and operand, whose list ends in `07 FFFA`. Which means the entry runs the list a 350 runs for a
 *    send from group 3 and that list acknowledges the event.
 * 3. The eight other maps, every action list and the number of infrared groups are what the compile holds.
 *    The test reads them through the codec, entry by entry, so what it shows is that the lists the entries
 *    name are the same lists; that every byte after the insert moved by four and no more is claim 1.
 *
 * **What it does not show.** That the entry is all a 300 needs for every configuration: the bench ran this one
 * file. That a 300 sends from groups 4 to 7 through the same list in every build: one build, read on one unit.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/firmware.md`, the trace test above, the
 * compile's own map 0. Logitech's client was not consulted: the answer is in the image and the entry is the
 * compile's own.
 *
 * **What would falsify it.** A byte of the file that the codec's insert does not account for, a second `0xFF`
 * entry, or a map other than 0 that differs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, skipWithoutLab } from '@harmony/lab';

import { irGroups, parse, type Container } from '../src/index.ts';
import { bytes } from '../src/internal.ts';
import { keyMaps, withMapEntries } from '../src/families/harmony-300-350/devices.ts';
import { restamped } from '../src/shared/core.ts';

const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const PATCHED = 'work/300-event-ff/h350-compile-event-ff.bin';

/** The two files, or a skip: this claim is about these two and a partial lab does not hold them. */
function needsBoth(): { skip: string | false } {
  const gate = skipWithoutLab();
  if (gate.skip !== false) return gate;
  const missing = [COMPILE, PATCHED].filter((path) => !existsSync(join(LAB!, path)));
  return missing.length === 0 ? { skip: false } : { skip: `not in the lab: ${missing.join(', ')}` };
}
const NEEDS = needsBoth();

const read = (path: string): Uint8Array => new Uint8Array(readFileSync(join(LAB!, path)));

/** An action list's instructions, `[operand, opcode]` each, by its index in raw slot 7. */
function actionList(c: Container, index: number): [number, number][] {
  const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
  return Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => [bytes.u16(c.blob, at + 1 + 3 * k), bytes.u8(c.blob, at + 3 + 3 * k)]);
}

test('the patched file is the compile with the codec\'s entry insert and a restamp, byte for byte, four bytes longer', NEEDS, () => {
  const compile = parse(read(COMPILE));
  const thirty = keyMaps(compile)[0]!.entries.find((one) => one.tag === 0x30)!;
  const made = restamped(new Uint8Array(withMapEntries(compile, 0, [{ tag: 0xff, opcode: thirty.opcode, operand: thirty.operand }]).blob));
  const file = read(PATCHED);
  assert.equal(compile.blob.length, 118513);
  assert.equal(file.length, 118517);
  assert.deepEqual(Array.from(file), Array.from(made));
});

test('map 0 holds the compile\'s 17 entries and tag 0xFF once, which calls event 0x30\'s list, and that list ends in 07 FFFA', NEEDS, () => {
  const compile = parse(read(COMPILE));
  const patched = parse(read(PATCHED));
  const before = keyMaps(compile)[0]!.entries;
  const after = keyMaps(patched)[0]!.entries;
  assert.equal(before.length, 17);
  assert.equal(after.length, 18);
  assert.deepEqual(after.filter((one) => one.tag === 0xff).length, 1);
  assert.deepEqual(after.filter((one) => one.tag !== 0xff), before);
  const thirty = before.find((one) => one.tag === 0x30)!;
  const added = after.find((one) => one.tag === 0xff)!;
  assert.deepEqual([added.opcode, added.operand], [thirty.opcode, thirty.operand]);
  // A call of a list, `0x7F`, and the list's last instruction is 07 FFFA, the acknowledgement.
  assert.equal(added.opcode, 0x7f);
  assert.deepEqual(actionList(patched, added.operand).at(-1), [0xfffa, 0x07]);
  // The compile binds no 0xFF, so the entry is the only change to the tags: 18 tags, 17 of them the compile's.
  assert.equal(before.some((one) => one.tag === 0xff), false);
});

test('the eight other maps, every action list and the infrared groups are the compile\'s', NEEDS, () => {
  const compile = parse(read(COMPILE));
  const patched = parse(read(PATCHED));
  const a = keyMaps(compile);
  const b = keyMaps(patched);
  assert.equal(a.length, 9);
  assert.equal(b.length, 9);
  for (let map = 1; map < 9; map += 1) assert.deepEqual(b[map]!.entries, a[map]!.entries, `map ${map}`);
  const lists = compile.pointerArray(7)!.length;
  assert.equal(patched.pointerArray(7)!.length, lists);
  for (let index = 0; index < lists; index += 1) assert.deepEqual(actionList(patched, index), actionList(compile, index), `list ${index}`);
  const groups = irGroups(compile)!;
  assert.equal(irGroups(patched)!.length, groups.length);
  assert.deepEqual(irGroups(patched)!.map((one) => [...one.addresses.keys()]), groups.map((one) => [...one.addresses.keys()]));
});
