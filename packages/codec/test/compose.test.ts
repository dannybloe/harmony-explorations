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
  archSlot,
  characterMap,
  composeDeviceScreen,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  renderVariants,
  screenStrings,
  taggedList,
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

/**
 * Phase 6's screen half, Harmony One (arch 12) alone by design: the device's own mode with a page
 * drawing its label and commands, one new row on every device list menu, and the checks the
 * checklist demands, rendering and reachability included.
 */
const ROWS = [
  { label: 'Power', k: 0 },
  { label: 'Up', k: 1 },
  { label: 'Down', k: 2 },
] as const;

/** The device list menus of `one_config`: ten of them, one per context the list is shown in. */
const MENUS = [57, 58, 59, 93, 100, 103, 120, 123, 149, 233] as const;

test('one_config takes the television onto its screen and every check holds', skipUnless('one_config'),
     () => {
  const pristine = parse(load('one_config') as Uint8Array);
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const before = parse(device.bytes);
  const wasModes = modeTable(before)!.addresses.length;
  const wasPages = modePages(before).length;
  const composed = composeDeviceScreen(before, 'LG',
    ROWS.map((row) => ({ label: row.label, list: device.lists[row.k]! })));
  const after = parse(composed.bytes);

  // The mode exists, at the end so nothing renumbered, and the menus are the ten the corpus holds.
  assert.equal(modeTable(after)!.addresses.length, wasModes + 1);
  assert.equal(composed.mode, wasModes);
  assert.deepEqual([...composed.menus], [...MENUS]);

  // The whole file still holds together, the same battery the infrared half passes.
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');

  // The new page: one page on hit page 10, the standard device layout, binding the three commands
  // on the layout's first three slots, and its screen program drawing the label and the rows with
  // nothing unresolved in any variant.
  const record = modeRecords(after)![composed.mode]!;
  assert.equal(record.pageCount, 1);
  const page = record.pages[0]!;
  assert.equal(page.lead, 10, 'the six slot device layout, reused rather than inserted');
  const bindings = taggedList(after, page.list)!;
  assert.deepEqual(bindings.entries.map((one) => [one.tag & 0x3f, one.opcode, one.operand]),
                   ROWS.map((row) => [48 + row.k, 0x7f, device.lists[row.k]]),
                   'the rows run the commands, top left to middle left');
  const rendered = renderVariants(after, page.program);
  assert.equal(rendered.variants.length, 1, 'no switch, so one screen');
  assert.equal(rendered.variants[0]!.page.glyphsMissing, 0);
  assert.equal(rendered.variants[0]!.page.picturesMissing, 0);

  // Every menu's grown page: the row on scan 50 runs the shared entering list, the flip moved to
  // scan 51 whatever spelling it had, the lead byte declares the three row layout, and the page
  // still renders whole in every variant. Menu 233 is why the flip is asserted by scan and not by
  // opcode: nine menus bind the bare page flip and it wraps its own in a beeping action list.
  for (const menu of composed.menus) {
    const grown = modeRecords(after)![menu]!.pages.at(-1)!;
    assert.equal(grown.lead, 12, `menu ${menu} declares the three row layout`);
    const list = taggedList(after, grown.list)!;
    const row = list.entries.filter((one) => one.tag === (0x80 | 50));
    assert.equal(row.length, 1, `menu ${menu} binds scan 50 once`);
    assert.deepEqual([row[0]!.opcode, row[0]!.operand], [0x7f, composed.rowList]);
    assert.equal(list.entries.filter((one) => one.tag === (0x80 | 51)).length, 1,
                 `menu ${menu} kept its flip, on the bottom key`);
    for (const variant of renderVariants(after, grown.program).variants) {
      assert.equal(variant.page.glyphsMissing, 0, `menu ${menu} draws every glyph`);
      assert.equal(variant.page.picturesMissing, 0, `menu ${menu} draws every picture`);
    }
  }

  // The reachability half, the checklist's own wording: the device list page's bindings reach the
  // new page, and the new page's bindings reach the new commands, walked off the container.
  const lists = after.actionLists()!;
  assert.deepEqual(lists[composed.rowList]!.map((one) => [one.opcode, one.operand]),
                   [[0x75, 0x0fca], [0x7e, composed.mode], [0x98, 1]],
                   'the row beeps, enters the mode and marks device mode, as every corpus row does');
  ROWS.forEach((row) => {
    const bound = bindings.entries[row.k]!;
    assert.deepEqual(lists[bound.operand]!.map((one) => [one.opcode, one.operand]),
                     [[0x7d, (device.group << 8) | row.k]],
                     `row ${row.label} reaches the new command`);
  });

  // Section 69's rail: one pool copy per page, the new page's included, agreeing entry by entry,
  // and the grown menu pages' copies grown with them.
  const pages = modePages(after);
  const copies = pageListCopies(after);
  assert.equal(pages.length, wasPages + 1);
  assert.equal(copies.length, pages.length, 'one copy per page, the new page included');
  const body = (index: number): string =>
    (lists[index] ?? []).map((one) => `${one.opcode}:${one.operand}`).join(' ');
  for (const index of [pages.length - 1,
                       ...composed.menus.map((menu) =>
                         pages.findIndex((one) =>
                           one.address === modeRecords(after)![menu]!.pages.at(-1)!.address))]) {
    const mine = taggedList(after, pages[index]!.list)!;
    const copy = taggedList(after, copies[index]! + after.flashBase)!;
    assert.equal(copy.entries.length, mine.entries.length, `page ${index}'s copy has every entry`);
    mine.entries.forEach((entry, k) => {
      const twin = copy.entries[k]!;
      assert.deepEqual([twin.tag, twin.flags, twin.opcode], [entry.tag, entry.flags, entry.opcode]);
      // Section 69's one allowed difference: a copy's 0x7f may name a different base slot 10
      // entry holding an identical action list, which is how the corpus generator emits them.
      if (entry.opcode === 0x7f) assert.equal(body(twin.operand), body(entry.operand));
      else assert.equal(twin.operand, entry.operand);
    });
  }

  // The label is drawn everywhere the checklist wants it: once per menu and once as the title.
  const map = characterMap(after)!;
  const drawn = screenStrings(after, map).filter((one) => one.text === 'LG');
  assert.equal(drawn.length, MENUS.length + 1, 'ten menu rows and the title');
});

test('the screen half refuses what it cannot draw or place', skipUnless('one_config', 'h600_config'),
     () => {
  const pristine = parse(load('one_config') as Uint8Array);
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const before = parse(device.bytes);
  const rows = ROWS.map((row) => ({ label: row.label, list: device.lists[row.k]! }));

  // A character no font carries stops the phase and says which, the checklist's own demand.
  assert.throws(() => composeDeviceScreen(before, 'LG',
                                          [{ label: 'zap', list: device.lists[0]! }]),
                (error: unknown) => error instanceof ComposeError && /'z'/.test(String(error)),
                'the refusal names the missing character');

  // The other architectures are refused outright: every position here is the One's.
  const h600 = parse(load('h600_config') as Uint8Array);
  assert.throws(() => composeDeviceScreen(h600, 'LG', rows),
                (error: unknown) => error instanceof ComposeError
                  && /Harmony One/.test(String(error)));

  // No rows and too many rows are refused before anything moves.
  assert.throws(() => composeDeviceScreen(before, 'LG', []), ComposeError);
});

test('composing a device leaves the timer table in the relocation census', skipUnless('one_config'),
     () => {
  // The regression behind the state record's placement: a record wedged at base slot 13's section
  // start widens the timer table's gap, `pointerArrayAt` demands its counted array fill the gap
  // exactly, and the table drops out of the census silently, so the next insertion below the
  // timer records leaves every timer pointer stale. The screen half's pool insertion is what
  // found it, as two owners claiming one region 255 bytes below the records.
  const pristine = parse(load('one_config') as Uint8Array);
  const slot = archSlot(12, 12);
  assert.notEqual(pristine.pointerArrayAt(slot), undefined, 'the timer table reads before');
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const after = parse(device.bytes);
  assert.notEqual(after.pointerArrayAt(slot), undefined, 'and still reads after');
});
