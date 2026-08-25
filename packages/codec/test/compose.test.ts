/**
 * Phase 6's first insertion: a device group composed into base slot 5, checked by every reader
 * this repository has.
 *
 * The device is real: three commands of the LG television the checklist's goal names, spelled
 * exactly as Logitech's catalogue states them, Toshiba family, whose rhythm is measured off their
 * own compiler and whose held block is the ditto. The check is the one phase 6 demands: one more
 * device, the commands decode back to the exact numbers the catalogue states, the byte accounting
 * is still complete with no overlaps, and the whole file round trips through the emitter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  ComposeError,
  FIRMWARE_STATE_VARIABLE_MAX,
  IR_PULSE_MARK,
  IR_PULSE_MAX,
  blockOfStatedCode,
  blockWordsOf,
  composeDevice,
  composeIrGroup,
  coverage,
  frameKey,
  framesOfSegments,
  fromFirstMark,
  inventory,
  irBlockWords,
  irGroups,
  irHeaderPointers,
  mergedIntervals,
  parse,
  roundTrip,
  statedCode,
  stateVariables,
  trailerAgrees,
} from '../src/index.ts';

/**
 * The goal device's commands, as the catalogue states them for the LG 42LM3400: power is a toggle
 * that must not repeat, the volume key must, and Toshiba's held block is its ditto alone.
 */
const TELEVISION = [
  { stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false },
  { stated: 'G:Toshiba 32 Bit:(0x20DF40BF)(Repeat)():3', held: true },
  { stated: 'G:Toshiba 32 Bit:(0x20DF807F)(Repeat)():3', held: true },
] as const;

/** One config per architecture, so the insertion is exercised against all four table layouts. */
const HOSTS = ['one_config', 'h600_config', 'h525_config', 'arch8_config_a'] as const;

for (const host of HOSTS) {
  test(`${host} takes the television and every reader agrees it is there`, skipUnless(host), () => {
    const before = parse(load(host) as Uint8Array);
    const wasGroups = irGroups(before) ?? [];
    const wasInventory = inventory(before);
    const composed = composeDevice(before, { label: 'LG', commands: TELEVISION, power: 0 });
    const after = parse(composed.bytes);

    // The device exists: one more group, at the end, with one record per command.
    const groups = irGroups(after) ?? [];
    assert.equal(groups.length, wasGroups.length + 1);
    assert.equal(composed.group, wasGroups.length);
    const group = groups[composed.group]!;
    assert.equal(group.addresses.length, TELEVISION.length);

    // Every command decodes back to the exact number the catalogue states, through the reading
    // route rather than the writing one: block words off the file, merged, cut into frames, read
    // under the family's convention, and compared as (bits, value).
    TELEVISION.forEach((command, k) => {
      const words = irBlockWords(after, irHeaderPointers(after, group.addresses[k]!)[0]!);
      assert.notEqual(words, undefined, `command ${k} has a once block`);
      const pulses = words!.map((w) => ({ mark: (w & IR_PULSE_MARK) !== 0, us: w & IR_PULSE_MAX }));
      const readings = framesOfSegments(fromFirstMark(mergedIntervals(pulses)));
      const stated = statedCode(command.stated)!;
      const wanted = `${stated.frames[0]!.bits}:${stated.frames[0]!.value.toString(16)}`;
      assert.ok(readings.some((frame) => frameKey(frame) === wanted),
                `command ${k} sends the number the catalogue states`);
      // The held block is the choice the composer was given: absent on power, present on volume.
      const held = irHeaderPointers(after, group.addresses[k]!)[1]!;
      assert.equal(held !== 0, command.held, `command ${k}'s held pointer follows the choice`);
    });

    // The whole file still holds together: complete accounting with no overlaps, a verifying
    // trailer, a clean round trip through the emitter, and the inventory grown by exactly the one
    // unnamed device, since its name is the next insertion and not this one.
    const report = coverage(after);
    assert.equal(report.accounted, report.total, 'every byte is claimed');
    assert.deepEqual(report.overlaps, [], 'and no byte twice');
    assert.ok(trailerAgrees(after));
    const trip = roundTrip(after);
    assert.equal(trip.equal, true, 'the emitter reproduces the composed file');
    const grownInventory = inventory(after);
    assert.equal(grownInventory.devices.length, wasInventory.devices.length + 1);
    assert.equal(grownInventory.activities.length, wasInventory.activities.length);

    // The device is **named**, through the route that names every corpus device, section 126: the
    // label is the variable name's prefix, the variable's transitions run the power list, and that
    // list sends to the new group. Nothing here reads the composer's own bookkeeping back to it.
    const device = grownInventory.devices.find((one) => one.group === composed.group);
    assert.equal(device?.name, 'LG');
    assert.equal(device?.source, 'names', 'stated by the tree, not forced by elimination');
    assert.equal(device?.codes, TELEVISION.length);
    const variable = stateVariables(after).find((one) => one.index === composed.variable);
    assert.equal(variable?.name, 'LG_Power_2');
    assert.ok(composed.variable > FIRMWARE_STATE_VARIABLE_MAX,
              'the new variable sits above the firmware\'s own thirteen');
    assert.equal(variable?.record?.first, 0, 'nothing is running when a config is generated');
    assert.equal(variable?.record?.second, 1, 'a power switch has two states');
    assert.deepEqual(
      variable?.record?.values.map((one) => [one.from, one.to, one.opcode, one.operand]),
      [[0, 1, 0x7f, composed.lists[0]], [1, 0, 0x7f, composed.lists[0]]],
      'both transitions run the power command\'s list');
    // And each command's list is one send to the new group, readable off the container itself.
    const lists = after.actionLists();
    composed.lists.forEach((index, k) => {
      const list = lists?.[index];
      assert.deepEqual(list?.map((one) => [one.opcode, one.operand]),
                       [[0x7d, (composed.group << 8) | k]],
                       `command ${k}'s list is one send to the new group`);
    });
  });
}

test('a block word never exceeds the fifteen bit ceiling and merges back to the train',
     () => {
  // Toshiba's tail holds a 96078 microsecond silence, which no single word can store: the split is
  // maximal words first, remainder last, and merging the words back gives the identical train.
  const once = blockOfStatedCode('G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3')!;
  const words = blockWordsOf(once);
  assert.ok(words.every((one) => one.microseconds > 0 && one.microseconds <= 0x7fff));
  const back = mergedIntervals(words.map((one) => ({ mark: one.mark, us: one.microseconds })));
  assert.deepEqual(back, mergedIntervals(once));
  assert.ok(words.length > once.length, 'something was split, or this test checks nothing');
});

test('composing refuses what cannot be sent', skipUnless('one_config'), () => {
  const c = parse(load('one_config') as Uint8Array);
  // No commands is not a device; an unreadable code, an unmeasured family and a demanded held
  // block the family cannot supply are each a refusal rather than a device that sends nothing.
  assert.throws(() => composeIrGroup(c, []), ComposeError);
  assert.throws(() => composeIrGroup(c, [{ stated: 'not a code' }]), ComposeError);
  assert.throws(() => composeIrGroup(c, [{ stated: 'G:Saitek 11 Bit:()(0x000)():3' }]),
                ComposeError);
  // Samsung 38 Bit is a whole record shape, so its once block emits and its held pointer has no
  // measurement to stand on: demanding one is the refusal, not a silent record that never repeats.
  assert.throws(
    () => composeIrGroup(c, [{ stated: 'G:Samsung 38 Bit:(0x00001)(0x00001)():3', held: true }]),
    (failure: unknown) => failure instanceof ComposeError
      && failure.message.includes('held'),
  );
  // The label is half of a name whose separator is the underscore, so an underscore inside one
  // would split the grammar, and a power index with no command behind it is not a choice.
  assert.throws(() => composeDevice(c, { label: 'LG_TV', commands: [...TELEVISION] }),
                ComposeError);
  assert.throws(() => composeDevice(c, { label: 'LG', commands: [...TELEVISION], power: 9 }),
                ComposeError);
});
