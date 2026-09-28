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

import { IMAGES, PARSEABLE_EXCLUDED, load, require_, skipUnless, skipWithoutLab } from '@harmony/lab';
import {
  ComposeError,
  DEVICE_QUANTITY_DEFAULT,
  firmwareStateVariableMax,
  IR_PULSE_MARK,
  IR_PULSE_MAX,
  blockOfStatedCode,
  blockWordsOf,
  assertStateTableConsistent,
  composeDevice,
  renumberStateVariables,
  stateVariableSite,
  composeActivity,
  composeActivityMenuRow,
  composeActivityScreen,
  activityScreens,
  nextActivityValue,
  allOffList,
  joinPowerOff,
  activityPowerTargets,
  deviceVariables,
  valueMaps,
  activityBindings,
  activityNames,
  touchPageOf,
  composeIrGroup,
  coverage,
  EVENT_MASK,
  SCAN_MASK,
  ACTIVITY_STATE_NAME,
  nameNodes,
  handlerSetRoles,
  handlerSets,
  activityWriterCount,
  activityCount,
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
  stateTable,
  stateVariables,
  trailerAgrees,
  archSlot,
  characterMap,
  composeDeviceScreen,
  deviceListRows,
  fontSets,
  glyphOf,
  screenProgram,
  bitmapAt,
  deviceModeMarker,
  devices,
  touchPages,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  renderVariants,
  screenStrings,
  taggedList,
  Container,
  compiledBlockWords,
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
    const wasTable = stateTable(before);
    assert.ok(wasTable !== undefined, `${host} carries a state table`);
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
    assert.ok(composed.variable > firmwareStateVariableMax(after.architecture),
              'the new variable sits above the firmware\'s own block');

    // **The new variable is a one byte one, which means it goes in at `narrow`**, section 277: no
    // two byte variable anywhere in the corpus carries a transition, 0 of 64, and a device's power
    // variable is nothing but its transitions. So `count` and `narrow` both rise and `wide` does
    // not, and the variable lands inside the storage the firmware allocates rather than above it,
    // which is section 276's separate defect and is asserted here too because both were live at
    // once.
    const grownTable = stateTable(after);
    assert.ok(grownTable !== undefined);
    assert.equal(grownTable.count, wasTable.count + 1);
    assert.equal(grownTable.narrow, wasTable.narrow + 1, 'the new variable is a narrow one');
    assert.equal(grownTable.wide, wasTable.wide, 'and no existing variable changes width');
    assert.equal(grownTable.narrowAgain, grownTable.narrow);
    assert.equal(composed.variable, wasTable.narrow, 'it takes the position `narrow` named');
    assert.ok(composed.variable < grownTable.narrow, 'so it is stored as one byte');
    assert.ok(composed.variable < grownTable.narrow + grownTable.wide,
              'and inside the storage the firmware allocates');
    assert.doesNotThrow(() => assertStateTableConsistent(after));

    // **Every variable the insertion displaced kept its identity**, which is the renumbering's
    // whole job. The entry pointers are what this walks rather than `stateVariables`, because that
    // reader returns only the variables the name tree names and the displaced one is unnamed in
    // every container here: a walk over names reported zero moved variables where the table says
    // one, which is the population trap this project keeps meeting.
    //
    // Removing the inserted pointer from the new array has to give the old array back exactly.
    // Each entry is a record's address and the records themselves do not move, so this is the
    // strongest available statement that nothing was dropped, duplicated or reordered.
    const withoutTheNewOne = [...grownTable.entries];
    withoutTheNewOne.splice(composed.variable, 1);
    assert.deepEqual(withoutTheNewOne, wasTable.entries,
      'the old entry pointers survive in order, with the new one spliced in at its index');
    assert.equal(grownTable.entries[composed.variable] !== undefined, true);

    // And the named half: a name node's index is the variable it names, section 77, so a displaced
    // variable's name has to have moved with it.
    const wasNamed = new Map(stateVariables(before).map((v) => [v.index, v.label]));
    const nowNamed = new Map(stateVariables(after).map((v) => [v.index, v.label]));
    for (const [index, label] of wasNamed) {
      const to = index >= composed.variable ? index + 1 : index;
      assert.equal(nowNamed.get(to), label, `the name of variable ${index} moved to ${to}`);
    }
    assert.equal(nowNamed.size, wasNamed.size + 1, 'plus the one this composer named');
    assert.equal(variable?.record?.first, 0, 'nothing is running when a config is generated');
    assert.equal(variable?.record?.second, 1, 'a power switch has two states');
    assert.deepEqual(
      variable?.record?.values.map((one) => [one.from, one.to, one.opcode, one.operand]),
      [[0, 1, 0x7f, composed.lists[0]], [1, 0, 0x7f, composed.lists[0]]],
      'both transitions run the power command\'s list');
    // And each command's list is the send **paired** with its per device quantity, readable off the
    // container itself. This asserted the send alone until 8 September 2026, and the title said "one
    // send", which was true of what the composer emitted and false of every send list in the corpus:
    // section 278 measures every one as this pair with the device agreeing in both high bytes, and
    // the bare form sent nothing when an activity's transition ran it on the spare Harmony One while
    // answering a button press correctly. So the claim being asserted here changed rather than the
    // assertion being relaxed. **On the arch 14 host it asserts a known deviation**: every Harmony
    // 600 and 700 send list opens with a `0x7F` as well, which the composer does not emit, todo
    // 1.2.6, so there this pins what the composer writes rather than what the corpus holds.
    const lists = after.actionLists();
    composed.lists.forEach((index, k) => {
      const list = lists?.[index];
      assert.deepEqual(list?.map((one) => [one.opcode, one.operand]),
                       [[0x7d, (composed.group << 8) | k],
                        [0x7c, (composed.group << 8) | DEVICE_QUANTITY_DEFAULT]],
                       `command ${k}'s list sends to the new group and names it again`);
    });
  });
}

test('a block word never exceeds the fifteen bit ceiling and merges back to the train',
     () => {
  // Toshiba's tail holds a 96078 microsecond silence, which no single word can store: the plain
  // splitter goes maximal words first, remainder last, and merging back gives the identical train.
  // The generator's own spelling is compiledBlockWords, tested below against measured examples.
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
  // Every label sits inside its pad, section 242: the first device page written to a remote had
  // each label starting at the pad's middle, because the label was measured through a font table
  // read before the relocations moved the glyphs, so it measured zero wide. The check is the
  // geometry the remote shows: a pad's picture is drawn at (x, y), its label is the text drawn
  // twenty pixels lower, and the text's width in the row font must fit between the pad's edges.
  const program = screenProgram(after, page.program)!;
  const rowSet = fontSets(after)![9]!;
  const pads = program.filter((one) => one.opcode === 0x02).map((one) => ({
    x: one.operands[0]!, y: one.operands[1]!,
    width: bitmapAt(after, one.operands[2]! | (one.operands[3]! << 8) | (one.operands[4]! << 16))!.stride,
  }));
  const labels = program.filter((one) => one.opcode === 0x05 && one.operands[1]! > 20);
  assert.equal(labels.length, ROWS.length);
  labels.forEach((text, k) => {
    const pad = pads.find((one) => one.y + 20 === text.operands[1]! && one.x <= text.operands[0]!
      && text.operands[0]! < one.x + one.width)!;
    assert.ok(pad !== undefined, `label ${k} is drawn on a pad`);
    const width = [...(text.glyphs ?? [])].reduce((sum, code) => sum + (glyphOf(after, rowSet, code)?.width ?? 0), 0);
    assert.ok(width > 0, `label ${k} measures wider than nothing`);
    assert.ok(text.operands[0]! + width <= pad.x + pad.width, `label ${k} ends inside its pad`);
    assert.ok(text.operands[0]! >= pad.x, `label ${k} starts inside its pad`);
    assert.ok(Math.abs((text.operands[0]! - pad.x) - (pad.x + pad.width - text.operands[0]! - width)) <= 1,
              `label ${k} is centred on its pad`);
  });

  // Every menu's grown page: the row on scan 50 runs the shared entering list, the bottom key moved
  // scan 51 whatever spelling it had, the lead byte declares the three row layout, and the page
  // still renders whole in every variant. Menu 233 is why the bottom key is asserted by scan and not
  // by opcode: nine menus bind bare `0x72` and it wraps its own in a beeping action list.
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
                     [[0x7d, (device.group << 8) | row.k],
                      [0x7c, (device.group << 8) | DEVICE_QUANTITY_DEFAULT]],
                     `row ${row.label} reaches the new command, paired as every corpus send is`);
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

/** The device list menus of the Harmony 650's own configuration: four in corners, 179 in two rows. */
const H650_MENUS = [57, 61, 74, 135, 179] as const;

test('the Harmony 650 takes the television onto its screen and every check holds',
     skipUnless('h650_config_region'), () => {
  // Section 285: arch 14's screen half, on the one arch 14 unit this project may write to. Six items
  // so the mode needs two pages, which is what exercises the page counter and both backgrounds.
  const pristine = parse(require_('h650_config_region'));
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const before = parse(device.bytes);
  const wasModes = modeTable(before)!.addresses.length;
  const wasPages = modePages(before).length;
  const items = ['Power', 'Up', 'Down', 'Power', 'Up', 'Down'].map((label, k) =>
    ({ label, list: device.lists[k % 3]! }));
  const composed = composeDeviceScreen(before, 'LG', items, { keysLike: 'TV' });
  const after = parse(composed.bytes);

  assert.equal(composed.mode, wasModes);
  assert.equal(modeTable(after)!.addresses.length, wasModes + 1);
  assert.deepEqual([...composed.menus], [...H650_MENUS]);
  assert.deepEqual(composed.pagesAdded, []);
  assert.equal(composed.pages, 2);
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');

  // The rows: enter the mode and write the 650's own marker, variable 31, with no beep in front, one
  // list per button bound and per copy, as the compiler writes them. Four corner menus take one
  // button each and the two row menu two, so twelve, and each is bound exactly once.
  const lists = after.actionLists()!;
  assert.equal(composed.rowLists, 12);
  const rowIndices = Array.from({ length: 12 }, (_, k) => composed.rowList + k);
  for (const index of rowIndices) {
    assert.deepEqual(lists[index]!.map((one) => [one.opcode, one.operand]),
                     [[0x7e, composed.mode], [0x80 + 31, 1]]);
  }
  const boundRows = [...modePages(after).map((page) => page.list),
                     ...pageListCopies(after).map((copy) => copy + after.flashBase)]
    .flatMap((list) => taggedList(after, list)!.entries)
    .filter((one) => one.opcode === 0x7f && rowIndices.includes(one.operand))
    .map((one) => one.operand);
  assert.deepEqual(boundRows.sort((a, b) => a - b), rowIndices, 'every row list bound once');

  // The pages: four corners filled in order and then two, stored bottom left, top left, bottom right,
  // top right as every arch 14 page is, each item running its command, the labels left from x 3 or
  // ending at 125, at y 40 and 90, and nothing unresolved when drawn.
  const record = modeRecords(after)![composed.mode]!;
  assert.equal(record.pageCount, 2);
  const labelSet = fontSets(after)![7]!;
  record.pages.forEach((page, p) => {
    const onPage = items.slice(4 * p, 4 * p + 4);
    const bound = taggedList(after, page.list)!.entries;
    const filled = onPage.map((item, k) => [0x80 | [8, 2, 9, 34][k]!, 0x7f, item.list] as const);
    assert.deepEqual(bound.map((one) => [one.tag, one.opcode, one.operand]),
                     [9, 8, 34, 2].flatMap((scan) => filled.filter((one) => one[0] === (0x80 | scan))));
    const labels = screenProgram(after, page.program)!
      .filter((one) => one.opcode === 0x05 && one.operands[1]! >= 40 && one.operands[1]! <= 90);
    assert.equal(labels.length, onPage.length);
    labels.forEach((one, k) => {
      const width = [...one.glyphs!].reduce((sum, code) => sum + (glyphOf(after, labelSet, code)?.width ?? 0), 0);
      assert.ok(width > 0);
      assert.equal(one.operands[1], [40, 40, 90, 90][k]);
      if (k % 2 === 0) assert.equal(one.operands[0], 3, `item ${k} starts at the left edge`);
      else assert.equal(one.operands[0]! + width, 125, `item ${k} ends at the right edge`);
    });
    for (const variant of renderVariants(after, page.program).variants) {
      assert.equal(variant.page.glyphsMissing, 0);
      assert.equal(variant.page.picturesMissing, 0);
    }
  });
  // The page counter, drawn on each page as `n/2` in the title bar.
  const counters = record.pages.map((page) => screenStrings(after, characterMap(after))
    .filter((one) => one.program === page.program && one.y === 2 && one.x >= 0x6a)
    .map((one) => one.text).join(''));
  assert.deepEqual(counters, ['1/2', '2/2']);

  // The key map: the television's own mode's 47 keys, in its order, with the two keys that send
  // what the new commands send bound to them and every other key bound to nothing. All three codes
  // are ones the 650's own LG television sends; power goes unbound because the television's own
  // mode binds its power code to no key.
  const template = modeRecords(after)![deviceListRows(before).find((row) => row.label === 'TV')!.mode]!;
  assert.equal(record.entries.length, template.entries.length);
  assert.equal(record.entries.length, 47);
  assert.deepEqual(record.entries.map((one) => one.tag), template.entries.map((one) => one.tag));
  const keys = record.entries.filter((one) => one.opcode === 0x7f);
  assert.equal(keys.length, 2);
  assert.equal(composed.keys, 2);
  assert.deepEqual(keys.map((one) => one.operand).sort(), [device.lists[1]!, device.lists[2]!].sort());
  for (const one of record.entries) {
    if (one.opcode === 0x7f || one.opcode === 0) continue;
    const twin = template.entries.find((other) => other.tag === one.tag)!;
    assert.deepEqual([one.opcode, one.operand], [twin.opcode, twin.operand], 'navigation is copied');
  }

  // The reader sees it: six devices, the LG on every menu's last page with its label.
  const rows = deviceListRows(after);
  assert.deepEqual(rows.filter((row) => row.mode === composed.mode).map((row) => [row.page, row.scan, row.label]),
                   [[1, 2, 'LG']]);
  const storedRank = (tag: number): number => [9, 8, 34, 2].indexOf(tag & 0x3f);
  for (const menu of composed.menus) {
    const last = modeRecords(after)![menu]!.pages.at(-1)!;
    const entries = taggedList(after, last.list)!.entries;
    assert.ok(entries.some((one) =>
      one.opcode === 0x7f && lists[one.operand]?.[0]?.operand === composed.mode), `menu ${menu} reaches it`);
    assert.deepEqual(entries.map((one) => storedRank(one.tag)),
                     entries.map((one) => storedRank(one.tag)).sort((a, b) => a - b), `menu ${menu} in stored order`);
    for (const variant of renderVariants(after, last.program).variants) {
      assert.equal(variant.page.glyphsMissing, 0, `menu ${menu} draws every glyph`);
    }
    // No font select repeating the font already in effect, which the compiler never writes.
    let font = -1;
    for (const one of screenProgram(after, last.program)!) {
      if (one.opcode !== 0x10) continue;
      assert.notEqual(one.operands[0], font, `menu ${menu} selects font ${font} twice running`);
      font = one.operands[0]!;
    }
  }
  // A corner menu page that went from one item to two draws the crossed background its full pages do.
  const corner = modeRecords(after)![H650_MENUS[0]!]!;
  const firstPicture = (program: number): number => {
    const one = screenProgram(after, program)![0]!;
    return (one.operands[2]! << 16) | (one.operands[3]! << 8) | one.operands[4]!;
  };
  assert.equal(taggedList(after, corner.pages.at(-1)!.list)!.entries.length, 2);
  assert.equal(firstPicture(corner.pages.at(-1)!.program), firstPicture(corner.pages[0]!.program));
  // The two row menu binds the new device to both bottom buttons and centres its label.
  const twoRow = modeRecords(after)![179]!.pages.at(-1)!;
  assert.deepEqual(taggedList(after, twoRow.list)!.entries.filter((one) =>
    lists[one.operand]?.[0]?.operand === composed.mode).map((one) => one.tag & 0x3f), [9, 34]);
  const centred = screenStrings(after, characterMap(after)).find((one) =>
    one.program === twoRow.program && one.text === 'LG')!;
  assert.equal(centred.y, 79);
  const centredWidth = [...centred.text].length === 0 ? 0
    : screenProgram(after, twoRow.program)!.filter((one) => one.opcode === 0x05 && one.operands[1] === 79)
      .map((one) => [...one.glyphs!].reduce((sum, code) => sum + (glyphOf(after, labelSet, code)?.width ?? 0), 0))[0]!;
  assert.equal(centred.x, Math.floor((128 - centredWidth) / 2));

  // Section 69's rail, over every page: one copy per page, agreeing entry by entry.
  const pages = modePages(after);
  const copies = pageListCopies(after);
  assert.equal(pages.length, wasPages + 2);
  assert.equal(copies.length, pages.length);
  const body = (index: number): string =>
    (lists[index] ?? []).map((one) => `${one.opcode}:${one.operand}`).join(' ');
  pages.forEach((page, index) => {
    const mine = taggedList(after, page.list)!;
    const copy = taggedList(after, copies[index]! + after.flashBase)!;
    assert.equal(copy.entries.length, mine.entries.length, `page ${index}'s copy has every entry`);
    mine.entries.forEach((entry, k) => {
      const twin = copy.entries[k]!;
      assert.deepEqual([twin.tag, twin.opcode], [entry.tag, entry.opcode]);
      if (entry.opcode === 0x7f) assert.equal(body(twin.operand), body(entry.operand));
      else assert.equal(twin.operand, entry.operand);
    });
  });
});

test('the arch 14 screen half refuses a full last page and a letter its fonts do not carry',
     skipUnless('h600_config', 'h700_config'), () => {
  // A full last page would need a new menu page and a renumbered counter on every page of that
  // menu, which is not composed: the Harmony 700's two row list holds two devices on each of three
  // pages, and so do all five of the Harmony 600's, which is what refuses it: its label font carrying
  // only the letters its own screens draw is refused first, and is not the reason it cannot compose.
  const refusal = (host: string, label: string): string => {
    const c = parse(require_(host));
    const device = composeDevice(c, { label, commands: TELEVISION, power: 0 });
    try {
      composeDeviceScreen(parse(device.bytes), label, [{ label: 'Up', list: device.lists[1]! }]);
    } catch (error) {
      assert.ok(error instanceof ComposeError, String(error));
      return error.message;
    }
    return 'composed';
  };
  assert.match(refusal('h700_config', 'TV'), /menu 283's last page is full/);
  assert.match(refusal('h600_config', 'TV'), /font 6 has no glyph for 'U'/);
  const c600 = parse(require_('h600_config'));
  const tv = composeDevice(c600, { label: 'TV', commands: TELEVISION, power: 0 });
  assert.throws(() => composeDeviceScreen(parse(tv.bytes), 'TV', [{ label: 'TV', list: tv.lists[1]! }]),
                /menu 64's last page is full/);
});

test('the screen half refuses what it cannot draw or place', skipUnless('one_config', 'h525_config'),
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

  // An architecture with neither layout is refused outright. Arch 14 was refused here too until
  // section 285 composed its screen, and its own refusals are asserted beside its composition.
  const h525 = parse(load('h525_config') as Uint8Array);
  assert.throws(() => composeDeviceScreen(h525, 'LG', rows),
                (error: unknown) => error instanceof ComposeError
                  && /Harmony One and arch 14 alone/.test(String(error)));

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

/**
 * Phase 7: Logitech compiled the same addition, `docs/adding-a-device.md`. The pair differs by
 * exactly the television phase 6 composes, and the comparison is inventories and blocks, never
 * bytes of the whole file, section 154.
 */
test('the composed television is the one Logitech compiles, block for block',
     skipUnless('phase7_before', 'phase7_after'), () => {
  const before = parse(load('phase7_before') as Uint8Array);
  const after = parse(load('phase7_after') as Uint8Array);

  // Their addition: one device, prepended at group 0 with every existing device renumbered, which
  // is why our composer's append-only rule is a difference and not a defect: a group index is not
  // stable across their compiles either way.
  const wasDevices = inventory(before).devices;
  const nowDevices = inventory(after).devices;
  assert.equal(nowDevices.length, wasDevices.length + 1);
  const lg = nowDevices.find((d) => d.name === 'LG_42LM3400');
  assert.notEqual(lg, undefined, 'named from the account, spaces as underscores');
  assert.equal(lg?.group, 0, 'prepended, not appended');
  assert.deepEqual(nowDevices.filter((d) => d !== lg).map((d) => d.name), wasDevices.map((d) => d.name),
                   'the three existing devices keep their names and their order');
  assert.deepEqual(inventory(after).activities.length, inventory(before).activities.length,
                   'no activity changes with the device');

  // Ours, composed onto their own before container: the same three commands.
  const device = composeDevice(before, { label: 'LG', commands: TELEVISION, power: 0 });
  const ours = parse(device.bytes);
  assert.equal(inventory(ours).devices.length, wasDevices.length + 1);
  const report = coverage(ours);
  assert.equal(report.accounted, report.total);
  assert.deepEqual(report.overlaps, []);
  assert.equal(roundTrip(ours).equal, true);

  // The check that carries the phase: for each of the three commands, our once and held blocks are
  // **byte identical** to the records their generator emitted for the same catalogue codes. Their
  // record indices are read off the after container by decoding, not assumed.
  const ourGroup = irGroups(ours)![device.group]!;
  const theirGroup = irGroups(after)![0]!;
  const frameOf = (c: Container, address: number): string[] => {
    const words = irBlockWords(c, irHeaderPointers(c, address)[0]!)!;
    const pulses = words.map((w) => ({ mark: (w & IR_PULSE_MARK) !== 0, us: w & IR_PULSE_MAX }));
    return framesOfSegments(fromFirstMark(mergedIntervals(pulses))).map(frameKey);
  };
  const rawBlock = (c: Container, pointer: number): Buffer => {
    const off = c.blobOffsetOf(pointer) as number;
    let end = off;
    for (;;) {
      const word = (c.blob[end] as number) | ((c.blob[end + 1] as number) << 8);
      end += 2;
      if (word === 0) break;
    }
    return Buffer.from(c.blob.subarray(off, end));
  };
  let compared = 0;
  TELEVISION.forEach((command, k) => {
    const stated = statedCode(command.stated)!;
    const wanted = `${stated.frames[0]!.bits}:${stated.frames[0]!.value.toString(16)}`;
    const theirs = theirGroup.addresses.find((address) => frameOf(after, address).includes(wanted));
    assert.notEqual(theirs, undefined, `their group carries command ${k}`);
    const ourPointers = irHeaderPointers(ours, ourGroup.addresses[k]!);
    const theirPointers = irHeaderPointers(after, theirs as number);
    assert.equal(Buffer.compare(rawBlock(ours, ourPointers[0]!), rawBlock(after, theirPointers[0]!)), 0,
                 `command ${k}'s once block is the block their generator wrote`);
    compared += 1;
    // Ours withholds power's held block by the caller's choice; theirs emits one for every
    // command, which is the measured answer to phase 4's audit gap 2.
    assert.notEqual(theirPointers[1], 0, `their command ${k} repeats when held`);
    if (ourPointers[1] !== 0) {
      assert.equal(Buffer.compare(rawBlock(ours, ourPointers[1]!), rawBlock(after, theirPointers[1]!)), 0,
                   `command ${k}'s held block is the block their generator wrote`);
      compared += 1;
    }
  });
  assert.equal(compared, 5, 'three once blocks and the two held ones the caller allowed');
});

/**
 * The generator's block spelling, phase 7's measurement: a lead-in on every once block, the half
 * word rule for a long silence, and the one microsecond word a trailing gap ends in. Each example
 * is a value read off their compiles, section 174.
 */
test('a composed block is spelled the way the generator spells one', () => {
  const words = (pulses: { mark: boolean; us: number }[], lead = 0): [boolean, number][] =>
    compiledBlockWords(pulses, lead).map((w) => [w.mark, w.microseconds]);

  // The 50 ms lead: greedy, because the remainder stays above half a word.
  assert.deepEqual(words([{ mark: true, us: 500 }], 50000),
                   [[false, 32767], [false, 17233], [true, 500]]);
  // 40222 falls under half a word after one maximal, so the pair balances instead.
  assert.deepEqual(words([{ mark: true, us: 500 }, { mark: false, us: 40222 }, { mark: true, us: 500 }]),
                   [[true, 500], [false, 20111], [false, 20111], [true, 500]]);
  // An odd balance puts the smaller half first.
  assert.deepEqual(words([{ mark: true, us: 500 }, { mark: false, us: 42033 }, { mark: true, us: 500 }]),
                   [[true, 500], [false, 21016], [false, 21017], [true, 500]]);
  // The 500 ms lead: fourteen maximals, then the balanced pair.
  const long = words([{ mark: true, us: 500 }], 500000);
  assert.equal(long.length, 17);
  assert.deepEqual(long.slice(14), [[false, 20631], [false, 20631], [true, 500]]);
  // A trailing gap donates its last microsecond, whatever its length.
  assert.deepEqual(words([{ mark: true, us: 500 }, { mark: false, us: 96078 }]),
                   [[true, 500], [false, 32767], [false, 32767], [false, 30543], [false, 1]]);
  assert.deepEqual(words([{ mark: true, us: 500 }, { mark: false, us: 552 }]),
                   [[true, 500], [false, 551], [false, 1]]);
});

/**
 * The state variable a device list row marks device mode with, per configuration.
 *
 * **A constant until 1 September 2026**, when the composer met its second Harmony One config: it
 * wrote 1 into variable 24 because that is what `one_config` does, and the spare's own
 * configuration uses 25. Nothing names the variable, so the composer reads it off the rows the
 * config already carries. Section 239.
 */
const DEVICE_MODE_MARKERS: Readonly<Record<string, number>> = {
  one_config: 24,
  one_config_unprogrammed: 30,
  one_spare_before_sync: 30,
  one_spare_after_sync: 31,
  one_spare_myharmony: 26,
  one_spare_20260830: 25,
  calibration_one: 27,
  calibration_favchannels: 27,
  calibration_favzero: 25,
  phase7_before: 27,
  phase7_after: 27,
  compiled_protocols: 31,
  compiled_protocols_2: 32,
  compiled_protocols_3: 33,
  // Arch 14 (Harmony 600 and 700), read since section 285, whose rows carry no beep and so were not
  // rows to the Harmony One's shape. The 650's own configuration is a region fixture and sits
  // outside this population; it writes 31, which the 650's composition test asserts.
  h600_config: 27,
  calibration_h600: 28,
  h700_config: 37,
  h700_config_2: 37,
};

test('every config with a device list states its own device mode marker, and they differ',
     skipWithoutLab(), () => {
  const found: Record<string, number> = {};
  for (const name of Object.keys(IMAGES)) {
    if (PARSEABLE_EXCLUDED.includes(name)) continue;
    const data = require_(name);
    let container: Container;
    try {
      container = parse(data);
    } catch {
      // Not a container. The population is what parses, not what is named.
      continue;
    }
    const marker = deviceModeMarker(container);
    if (marker === undefined) continue;
    assert.equal(marker.operand, 1, `${name} writes 1, which is what marks the mode`);
    found[name] = marker.opcode - 0x80;
  }
  assert.deepEqual(found, DEVICE_MODE_MARKERS);
  // The claim that matters to the composer: it is not one number, and it is not even stable for
  // one remote. Ten distinct values over the eighteen configurations that carry a device list, eight
  // over the fourteen Harmony One ones, and the spare Harmony One's own two reads either side of a
  // sync differ by one, so a constant is wrong on most of them.
  const distinct = [...new Set(Object.values(DEVICE_MODE_MARKERS))].sort((a, b) => a - b);
  assert.deepEqual(distinct, [24, 25, 26, 27, 28, 30, 31, 32, 33, 37]);
  assert.notEqual(DEVICE_MODE_MARKERS['one_spare_before_sync'],
                  DEVICE_MODE_MARKERS['one_spare_after_sync'],
                  'one remote, two syncs, two different variables');
});

test('the spare Harmony One config gets a third device list page on every menu, and one hit page serves all nine',
     skipUnless('one_spare_20260830'), () => {
  // **This test used to assert a refusal**, that six devices fill both pages and a seventh needs a
  // third page nothing composed, section 239. Section 241 composes it, the way Logitech lays a
  // seventh device out: pages of three and the last page short. What is asserted is the shape
  // rather than the bytes, because the bytes are read back through the same readers the corpus is
  // read with, and the render is what says the page draws.
  const pristine = parse(require_('one_spare_20260830'));
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const before = parse(device.bytes);
  const hitsBefore = touchPages(before)!.records.length;
  const pagesBefore = modePages(before).length;
  const composed = composeDeviceScreen(before, 'LG',
    ROWS.map((row) => ({ label: row.label, list: device.lists[row.k] as number })), { iconLike: 'TV' });
  const after = parse(composed.bytes);
  assert.equal(composed.menus.length, 9, 'the nine contexts the spare shows its device list in');
  assert.deepEqual(composed.pagesAdded, composed.menus, 'every menu was full, so every menu got a page');

  // The whole file still holds together.
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');

  // One hit page for all nine menus: the first composes it, because the spare carries no one row
  // page with the device list's rectangles, and the other eight find it by geometry. Its rectangles
  // are the full page's own, the top row's for the row and the bottom key's for the bottom key,
  // which is the rule two configurations state, section 241.
  const hits = touchPages(after)!;
  assert.equal(hits.records.length, hitsBefore + 1, 'one new hit page, not nine');
  const added = hits.records[hitsBefore]!;
  const firstMenu = modeRecords(after)![composed.menus[0] as number]!;
  const full = hits.records[firstMenu.pages[0]!.lead as number]!;
  const rect = (area: { x: number; width: number; y: number; height: number }) =>
    [area.x, area.width, area.y, area.height];
  assert.deepEqual(added.areas.map((area) => area.code), [48, 49, 46, 47]);
  assert.deepEqual(added.areas.map(rect),
                   [48, 51, 46, 47].map((code) => rect(full.areas.find((area) => area.code === code)!)));
  assert.ok(added.areas.every((area) => area.self === area.address), 'each area ends in its own address');

  // Every menu: three pages of three, three and one row, the new page on the new hit page, its row
  // on the top scan running the shared entering list, its bottom key bound the way the page before
  // it binds its own, and the page drawing whole in every variant of its bottom key.
  const lists = after.actionLists()!;
  for (const menu of composed.menus) {
    const record = modeRecords(after)![menu]!;
    assert.equal(record.pageCount, 3, `menu ${menu} has three pages`);
    assert.deepEqual(record.pages.map((page) => hits.records[page.lead as number]!.areas.length - 3),
                     [3, 3, 1], `menu ${menu} is three, three and one`);
    const added3 = record.pages[2]!;
    assert.equal(added3.lead, hitsBefore, `menu ${menu}'s new page uses the new hit page`);
    const list = taggedList(after, added3.list)!;
    const previous = taggedList(after, record.pages[1]!.list)!.entries.find((one) => one.tag === (0x80 | 51))!;
    assert.deepEqual(list.entries.map((one) => [one.tag & 0x3f, one.opcode, one.operand]),
                     [[48, 0x7f, composed.rowList], [49, previous.opcode, previous.operand]]);
    assert.deepEqual(lists[composed.rowList]!.map((one) => [one.opcode, one.operand]),
                     [[0x75, 0x0fca], [0x7e, composed.mode], [0x99, 1]],
                     'the row beeps, enters the mode and marks device mode with this config\'s own variable');
    // Eight menus close on the bottom key switch and render twice, `Activities` and `Current
    // Activity`; menu 253, the list shown while an activity runs, draws its key plain and renders once.
    const rendered = renderVariants(after, added3.program);
    assert.equal(rendered.variants.length, menu === 253 ? 1 : 2, `menu ${menu}'s bottom key states`);
    for (const variant of rendered.variants) {
      assert.equal(variant.page.glyphsMissing, 0, `menu ${menu} draws every glyph`);
      assert.equal(variant.page.picturesMissing, 0, `menu ${menu} draws every picture`);
    }
  }

  // Section 69's rail, for the nine new pages and the device's own: a pool copy each, agreeing.
  const pages = modePages(after);
  const copies = pageListCopies(after);
  assert.equal(pages.length, pagesBefore + 1 + composed.menus.length);
  assert.equal(copies.length, pages.length, 'one copy per page');
  for (const menu of composed.menus) {
    const page = modeRecords(after)![menu]!.pages[2]!;
    const index = pages.findIndex((one) => one.address === page.address);
    const mine = taggedList(after, page.list)!;
    const copy = taggedList(after, copies[index]! + after.flashBase)!;
    assert.deepEqual(copy.entries.map((one) => [one.tag, one.opcode, one.operand]),
                     mine.entries.map((one) => [one.tag, one.opcode, one.operand]));
  }

  // And the inventory reads the seventh device off the list, as section 240 reads the Wii.
  const rows = deviceListRows(after);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.filter((row) => row.page === 2).map((row) => [row.scan, row.label]), [[48, 'LG']]);
  assert.equal(devices(after).length, 7);
  const map = characterMap(after)!;
  assert.equal(screenStrings(after, map).filter((one) => one.text === 'LG').length, composed.menus.length + 1,
               'nine menu rows and the title');
});

test('a menu whose last page holds one row is refused rather than grown', skipUnless('one_spare_20260830'), () => {
  // The one shape left without a route: what a one row page becomes when a row is added has not
  // been measured beside its original, since Logitech recompiles the whole list. So it is refused
  // with the count in the message. The fixture is the spare composed once, whose menus then end on
  // the one row page the test above checks; `compiled_protocols_3` ends on one too but its fonts
  // are numbered differently from the constants the device page still carries, section 241, so it
  // is refused earlier and for the wrong reason.
  const pristine = parse(require_('one_spare_20260830'));
  const first = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const once = composeDeviceScreen(parse(first.bytes), 'LG',
    ROWS.map((row) => ({ label: row.label, list: first.lists[row.k] as number })), { iconLike: 'TV' });
  const second = composeDevice(parse(once.bytes), { label: 'TV', commands: TELEVISION, power: 0 });
  const before = parse(second.bytes);
  assert.throws(
    () => composeDeviceScreen(before, 'TV',
      ROWS.map((row) => ({ label: row.label, list: second.lists[row.k] as number }))),
    (error: unknown) => {
      assert.ok(error instanceof ComposeError);
      assert.match(error.message, /holds 1 row\(s\)/);
      return true;
    });
});

/**
 * A device list page binds as many rows as its hit page has room for, and the last page is the
 * short one.
 *
 * **This replaces a wrong reading of the same bytes**, and the wrong one is instructive. The first
 * pass compared the lead byte across configurations, saw 12 and 13 in one and 4 and 5 in another,
 * and concluded that Logitech switched layout family at seven devices. The lead byte is an index
 * into that configuration's **own** hit map table, section 125, so the numbers were never
 * comparable. What every one of these pages actually offers is the same six areas, and there is one
 * layout: three rows to a page, the left bottom key on the next scan up, the two rectangles beside
 * the display last. Since
 * the row count is the area count minus three, a partly filled page is a smaller hit page and never
 * a different design. Section 239.
 */
const MENU_PAGE_SHAPES: Readonly<Record<string, readonly number[]>> = {
  one_config: [3, 2],
  one_config_unprogrammed: [1],
  one_spare_before_sync: [1],
  one_spare_after_sync: [1],
  one_spare_myharmony: [3, 2],
  one_spare_20260830: [3, 3],
  calibration_one: [3],
  calibration_favchannels: [3],
  calibration_favzero: [3, 3],
  phase7_before: [3],
  phase7_after: [3, 1],
  compiled_protocols: [3, 3, 3, 3, 3],
  compiled_protocols_2: [3, 3, 3, 3, 3],
  compiled_protocols_3: [3, 3, 3, 1],
};

test('a device list page binds exactly its hit page room, and only the last page is short',
     skipWithoutLab(), () => {
  const shapes: Record<string, readonly number[]> = {};
  for (const name of Object.keys(IMAGES)) {
    if (PARSEABLE_EXCLUDED.includes(name)) continue;
    const data = require_(name);
    let container: Container;
    try {
      container = parse(data);
    } catch {
      // Not a container. The population is what parses, not what is named.
      continue;
    }
    if (container.architecture !== 12) continue;
    const marker = deviceModeMarker(container);
    if (marker === undefined) continue;
    const lists = container.actionLists() ?? [];
    const isRow = (index: number): boolean => {
      const list = lists[index];
      return list !== undefined && list.length === 3 && list[0]?.opcode === 0x75
        && list[1]?.opcode === 0x7e
        && list[2]?.opcode === marker.opcode && list[2]?.operand === marker.operand;
    };
    const hits = touchPages(container)?.records ?? [];
    let widest: number[] | undefined;
    for (const record of modeRecords(container) ?? []) {
      const perPage: number[] = [];
      for (const page of record.pages) {
        let rows = 0;
        for (const entry of taggedList(container, page.list)?.entries ?? []) {
          if (entry.opcode === 0x7f && isRow(entry.operand)) rows += 1;
        }
        perPage.push(rows);
        if (rows === 0) continue;
        // The reading: the row count is the hit page's area count minus three, which is the page
        // flip plus the two screen edges.
        const areas = hits[page.lead as number]?.areas.length;
        assert.equal(rows, (areas as number) - 3,
          `${name} menu page on hit page ${page.lead} binds ${rows} rows of ${areas} areas`);
      }
      const total = perPage.reduce((a, b) => a + b, 0);
      if (total > 0 && (widest === undefined || total > widest.reduce((a, b) => a + b, 0))) {
        widest = perPage.filter((rows) => rows > 0);
      }
    }
    if (widest === undefined) continue;
    // Only the last page is allowed to be short.
    widest.slice(0, -1).forEach((rows, k) => {
      assert.equal(rows, 3, `${name} page ${k} of the device list is not full`);
    });
    shapes[name] = widest;
  }
  assert.deepEqual(shapes, MENU_PAGE_SHAPES);
});

/**
 * The four containers the activity composer is exercised on, one per architecture.
 *
 * A per architecture list rather than the whole corpus, because what is being checked is that the
 * five insertions land in a container of each shape: base slot 9 is at a different raw slot on each,
 * and arch 12 is the one with the extra section that shifts every index above 18.
 */
const ACTIVITY_HOSTS = ['one_config_unprogrammed', 'h600_config', 'h525_config', 'arch8_config_b'];

/** A variable a test may point an activity at: not the firmware's, and not the counter itself. */
function aDeviceVariable(c: ReturnType<typeof parse>): number {
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const found = stateVariables(c)
    .find((one) => one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index);
  assert.ok(found !== undefined, 'the container has no variable an activity could write');
  return found.index;
}

test('composing an activity adds one to the counter and one entry to the key map table',
     skipUnless(...ACTIVITY_HOSTS), () => {
  // Section 273 turned into an insertion. Each assertion is one of the rules that section states,
  // so a change to any of them fails here rather than producing a container that merely parses.
  let hosts = 0;
  let growth = new Set<number>();
  for (const name of ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const before = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    const sets = handlerSets(c);
    assert.ok(before?.record !== undefined && sets !== undefined, name);

    const out = composeActivity(c, {
      label: 'Test',
      targets: [{ variable: aDeviceVariable(c), value: 1 }],
      keys: [{ scan: 20, list: 0 }],
    });
    const after = parse(out.bytes);
    hosts += 1;
    growth.add(out.bytes.length - c.blob.length);

    // The number: one more value, and it is the new maximum, leaving the idle value where it was.
    const raised = stateVariables(after).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    assert.ok(raised?.record !== undefined, `${name}: the counter stopped reading`);
    assert.equal(out.activity, before.record.second + 1);
    assert.equal(raised.record.second, out.activity);
    assert.equal(raised.record.first, before.record.first, 'the idle value does not move');

    // The name tree states the count as text and has to keep up. Section 86's rule, section 273's
    // consequence.
    const node = (nameNodes(after) ?? []).find((one) => one.name.startsWith(ACTIVITY_STATE_NAME));
    assert.ok(node !== undefined, `${name}: the counter lost its name`);
    assert.equal(Number(node.name.split('_').pop()), raised.record.second + 1);

    // The entry: appended, so the prefix and every existing activity keep their index.
    const grown = handlerSets(after);
    assert.ok(grown !== undefined, `${name}: base slot 9 stopped reading`);
    assert.equal(grown.addresses.length, sets.addresses.length + 1);
    assert.equal(out.set, sets.addresses.length);
    // **Every existing entry keeps its index, and this line used to assert nothing**: it compared
    // the length of a slice taken to a length against that length, which is true of any container.
    // The relocations move the addresses, so the real assertion is that they all move by one delta
    // and none is left behind or reordered.
    const deltas = new Set(sets.addresses
      .map((was, k) => (grown.addresses[k] as number) - was));
    assert.equal(deltas.size, 1, `${name}: the prefix did not move as one block`);

    // The three handlers, and the one key, in the shape section 273 measured: event type 0 on the
    // handlers and a press on the key.
    const entries = taggedList(after, grown.addresses[out.set] as number)?.entries ?? [];
    const handlers = entries.filter((one) => (one.tag & EVENT_MASK) === 0);
    assert.deepEqual(handlers.map((one) => one.tag).sort((a, b) => a - b), [1, 2, 5]);
    const keys = entries.filter((one) => (one.tag & EVENT_MASK) !== 0);
    assert.equal(keys.length, 1);
    assert.equal((keys[0] as { tag: number }).tag & SCAN_MASK, 20);

    // And one more list writes the counter, which is the closure `activityWriterCount` exists for.
    assert.equal(activityWriterCount(after), (activityWriterCount(c) as number) + 1);
    assert.equal(activityCount(after), (activityCount(c) as number) + 1);
  }
  assert.equal(hosts, 4, 'one container per architecture');
  // **37 bytes on all four**, and the same number on each is the point rather than the number: the
  // insertions are the enter list, the select list, their two pointers, the tagged list and its
  // pointer, none of which depends on the architecture. A container whose name count crossed a
  // power of ten would be 38, which none of these four is.
  assert.deepEqual([...growth], [37]);
});

test('a composed activity is entered by running its select list, and nothing else selects it',
     skipUnless(...ACTIVITY_HOSTS), () => {
  // The four hop chain, section 120, built from the far end. This function produces hops two and
  // three; hop four is a menu row and belongs to the screen half, so the reader still reports the
  // new entry as the one nothing binds. Asserting that is what keeps the boundary honest: a later
  // change that quietly bound a key here would fail this test rather than pass the one above.
  for (const name of ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const out = composeActivity(c, {
      label: 'Test', targets: [{ variable: aDeviceVariable(c), value: 1 }],
    });
    const after = parse(out.bytes);
    const lists = after.actionLists() ?? [];

    const select = lists[out.selectList] ?? [];
    assert.equal(select.length, 1, `${name}: the select list is one instruction`);
    assert.equal((select[0] as { opcode: number }).opcode, 0x1f);
    assert.equal((select[0] as { operand: number }).operand, 0xff00 | out.set);

    // The enter list writes the device and then the counter, in that order, because a reader that
    // stopped at the first write would otherwise report a device's value as the activity's.
    const enter = lists[out.enterList] ?? [];
    assert.equal(enter.length, 2);
    assert.equal((enter[1] as { operand: number }).operand, out.activity);

    // Hop four is absent by design, so the entry is selected and is not an activity's yet.
    assert.equal(handlerSetRoles(after)[out.set], 'idle');
  }
});

test('the activity composer refuses what would produce a container that merely parses',
     skipUnless('h600_config'), () => {
  const c = parse(require_('h600_config'));
  const ok = { label: 'Test', targets: [{ variable: aDeviceVariable(c), value: 1 }] };
  // A label has to be drawable, which is printable ASCII, and cannot be nothing.
  assert.throws(() => composeActivity(c, { ...ok, label: '' }), ComposeError);
  assert.throws(() => composeActivity(c, { ...ok, label: 'Caf\u00e9' }), ComposeError);
  // The firmware owns a block of variables and an activity may not write one, sections 138 and 284.
  assert.throws(() => composeActivity(c, { ...ok, targets: [{ variable: 3, value: 1 }] }),
    ComposeError);
  // **A variable past the end, refused by the count and not by the seven bit rail.** The comment
  // here claimed the opposite until the audit of 6 September 2026, and the message is what settles
  // it: this container has 74 variables, so 128 never reaches the encoding check. That rail is
  // unreachable on every container in this corpus and is kept for the encoding rather than for the
  // sample, which its own comment now says.
  assert.throws(() => composeActivity(c, { ...ok, targets: [{ variable: 128, value: 1 }] }),
    /past the .* that exist/);
  // A value the variable does not take matches no transition, so the device is never driven and the
  // activity is silently dead. The one failure this composer's whole design is about.
  assert.throws(() => composeActivity(c, { ...ok, targets: [{ variable: aDeviceVariable(c), value: 9999 }] }),
    /does not take the value/);
  // The counter is not a device, and writing it as one defeats the enter list's ordering.
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  assert.ok(counter !== undefined);
  assert.throws(() => composeActivity(c, { ...ok, targets: [{ variable: counter.index, value: 0 }] }),
    /not a device/);
  // A scan code is six bits, and an integer: a bitwise mask alone truncates 63.5 to a real button.
  assert.throws(() => composeActivity(c, { ...ok, keys: [{ scan: 64, list: 0 }] }), ComposeError);
  assert.throws(() => composeActivity(c, { ...ok, keys: [{ scan: 63.5, list: 0 }] }), ComposeError);
  // One key, bound twice: the reader takes the first and the second is unreachable.
  assert.throws(() => composeActivity(c, {
    ...ok, keys: [{ scan: 20, list: 0 }, { scan: 20, list: 1 }] }), /bound twice/);
  // Every list index a caller hands over has to name a list. An index past the end parses and does
  // nothing, which is the same silence.
  const lists = c.actionLists()?.length as number;
  assert.throws(() => composeActivity(c, { ...ok, keys: [{ scan: 20, list: lists }] }),
    /of \d+ that exist/);
  assert.throws(() => composeActivity(c, { ...ok, leaveList: lists }), /of \d+ that exist/);
  assert.throws(() => composeActivity(c, { ...ok, resumeList: -1 }), /of \d+ that exist/);
  // **And an underscore is fine**, which it was not for a day: the ban is a device's, because a
  // state variable's name is `<label>_<property>_<values>`, and an activity has no node at all.
  assert.equal(composeActivity(c, { ...ok, label: 'Watch_TV' }).label, 'Watch_TV');
});

/**
 * The Harmony One configurations, which are the only ones with a touch panel to draw a menu on.
 * Named once here so the layout claim and the composer claim below cannot walk different corpora,
 * which is the drift `TheCorpusWidePopulationsAgree` exists to catch.
 */
const ACTIVITY_MENU_HOSTS = [
  'one_config', 'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync',
];

/** Which mode of a container is its activity menu, by the same reading the composer uses. */
function activityMenuOf(c: ReturnType<typeof parse>): number {
  const lists = c.actionLists() ?? [];
  let best = -1;
  let most = 0;
  (modeRecords(c) ?? []).forEach((record, index) => {
    const sets = new Set<number>();
    for (const page of record.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== 0x7f) continue;
        const list = lists[entry.operand];
        if (list?.length === 3 && list[0]?.opcode === 0x75 && list[1]?.opcode === 0x1f) {
          sets.add((list[1] as { operand: number }).operand & 0xff);
        }
      }
    }
    if (sets.size > most) { most = sets.size; best = index; }
  });
  return best;
}

test('an activity menu page enables both bottom buttons where a device list page enables the left one',
     skipUnless(...ACTIVITY_MENU_HOSTS), () => {
  // Section 275, and the measurement that refuted reusing `composeMenuPage`. Every number here is
  // exact: a floor would absorb a whole configuration dropping out of the loop.
  let pages = 0;
  let rows = 0;
  let keys = 0;
  let sideBindings = 0;
  const rowShapes = new Set<string>();
  const keyCounts = new Set<number>();
  for (const name of ACTIVITY_MENU_HOSTS) {
    const c = parse(require_(name));
    const menu = activityMenuOf(c);
    assert.notEqual(menu, -1, `${name}: no activity menu`);
    for (const page of (modeRecords(c) ?? [])[menu]?.pages ?? []) {
      const hit = touchPageOf(c, page);
      assert.ok(hit !== undefined, `${name}: a menu page has no hit page`);
      pages += 1;
      const edges = hit.areas.filter((area) => area.code === 46 || area.code === 47);
      assert.equal(edges.length, 2, `${name}: a menu page does not offer both edges`);
      const content = hit.areas.filter((area) => area.code !== 46 && area.code !== 47);
      // A row spans the list; a bottom key is half of it. The widest is a row by construction, and
      // what is being asserted is that the two kinds are cleanly separable at all.
      const widest = content.reduce((a, b) => (b.width > a.width ? b : a));
      const pageRows = content.filter((area) => area.x === widest.x && area.width === widest.width
        && area.height === widest.height).sort((a, b) => b.y - a.y);
      const pageKeys = content.filter((area) => !pageRows.includes(area));
      rows += pageRows.length;
      keys += pageKeys.length;
      keyCounts.add(pageKeys.length);
      const top = pageRows[0];
      assert.ok(top !== undefined, `${name}: a menu page draws no row`);
      rowShapes.add(`${top.x}x${top.width}x${top.height}`);
      // The grid: the same rectangle stepped down by one pitch per row.
      pageRows.forEach((area, k) => {
        assert.equal(area.y, top.y - 872 * k, `${name}: row ${k} is off the grid`);
      });
      // The two rectangles beside the display are what turns a page, and **no page binds either**,
      // so nothing about paging is on the page. Counted over every arch 12 mode page below, not
      // just the menu's, because that is what makes it a fact about the model.
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        const scan = entry.tag & 0x3f;
        if (scan === 46 || scan === 47) sideBindings += 1;
      }
      // And both bottom rectangles, which is what a device list page does not have.
      const bottoms = content.filter((area) => area.y === 271);
      assert.equal(bottoms.length, 2, `${name}: an activity page does not offer both bottom keys`);
      assert.deepEqual(bottoms.map((area) => `${area.x}/${area.width}`).sort(),
                       ['1257/1395', '2406/1150'], `${name}: the bottom keys are not the two below`);
    }
  }
  assert.equal(pages, 6, 'the four Harmony One configs hold six activity menu pages between them');
  assert.equal(rows, 11, 'carrying eleven row rectangles between them, three on the fullest page');
  assert.equal(keys, 12, 'and two bottom keys on every one of the six pages');
  assert.deepEqual([...keyCounts], [2], 'every page carries exactly two, never one and never three');
  assert.equal(sideBindings, 0, 'and no page binds either of the two rectangles beside the display');
  assert.deepEqual([...rowShapes], ['1257x2600x807'], 'one row rectangle across four configurations');
});

test('a composed activity menu row keeps every binding the page had and adds exactly one',
     skipUnless(...ACTIVITY_MENU_HOSTS), () => {
  let hosts = 0;
  for (const name of ACTIVITY_MENU_HOSTS) {
    const c = parse(require_(name));
    const before = activityBindings(c);
    const out = composeActivityMenuRow(c, 'Play Game', 7);
    const after = parse(out.bytes);
    hosts += 1;

    // The scan is the next unused one, which is what appending an area before the two edges buys.
    const page = (modeRecords(after) ?? [])[out.menu]?.pages[out.page];
    const hit = page === undefined ? undefined : touchPageOf(after, page);
    assert.ok(page !== undefined && hit !== undefined, `${name}: the composed page does not read back`);
    const content = hit.areas.filter((area) => area.code !== 46 && area.code !== 47);
    assert.equal(out.scan, 48 + content.length - 1, `${name}: the row did not take the next scan`);
    assert.deepEqual(content.map((area) => area.code), content.map((_, k) => 48 + k),
                     `${name}: the composed hit page does not number its areas by position`);

    // Every binding the page had is still on its own scan, running its own list. This is the
    // assertion the positional numbering exists for: an area inserted anywhere but the end would
    // renumber the areas after it and silently move a binding to another row.
    const wasBound = new Map((taggedList(c, ((modeRecords(c) ?? [])[activityMenuOf(c)]
      ?.pages[out.page] as { list: number }).list)?.entries ?? [])
      .map((entry) => [entry.tag, `${entry.opcode}/${entry.operand}`]));
    const nowBound = new Map((taggedList(after, page.list)?.entries ?? [])
      .map((entry) => [entry.tag, `${entry.opcode}/${entry.operand}`]));
    for (const [tag, ran] of wasBound) {
      assert.equal(nowBound.get(tag), ran, `${name}: the binding on tag ${tag} changed`);
    }
    assert.equal(nowBound.size, wasBound.size + 1, `${name}: not exactly one binding was added`);

    // And the four hop reader sees one more activity than it did, which is the whole point: the
    // behaviour half alone leaves an entry nothing can reach.
    assert.equal(activityBindings(after).length, before.length + 1,
                 `${name}: the composed row does not read back as an activity binding`);
  }
  assert.equal(hosts, ACTIVITY_MENU_HOSTS.length);
});

test('an activity composed and then put on the menu is reachable through all four hops',
     skipUnless('one_config_unprogrammed'), () => {
  // The chapter's goal in one test: nothing on the remote can start an activity that has an entry
  // and no row, so the two halves are only worth anything together.
  const c = parse(require_('one_config_unprogrammed'));
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const target = stateVariables(c)
    .find((one) => one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index);
  assert.ok(target !== undefined, 'the container has no variable an activity could write');

  const built = composeActivity(c, {
    label: 'Play Game',
    targets: [{ variable: target.index, value: 1 }],
    keys: [{ scan: 20, list: 0 }],
  });
  const shown = composeActivityMenuRow(parse(built.bytes), built.label, built.set);
  const after = parse(shown.bytes);

  const bindings = activityBindings(after);
  assert.equal(bindings.length, activityBindings(c).length + 1);
  const added = bindings.find((one) => one.set === built.set);
  assert.ok(added !== undefined, 'the new entry is not bound to anything');
  assert.equal(added.scan, shown.scan);
  assert.equal(added.list, shown.rowList);
  assert.equal(handlerSetRoles(after)[built.set], 'activity');
});

test('the activity menu composer refuses what would render and start nothing',
     skipUnless('one_config_unprogrammed', 'h600_config'), () => {
  const c = parse(require_('one_config_unprogrammed'));
  // An entry past the end: the row draws and selects a keypad map that does not exist.
  const sets = handlerSets(c);
  assert.ok(sets !== undefined);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', sets.addresses.length),
                /past the \d+ that exist/);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', 0xff), /base slot 9 index/);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', -1), /base slot 9 index/);
  // A model with no touch panel, where every pixel position here means nothing.
  assert.throws(() => composeActivityMenuRow(parse(require_('h600_config')), 'Play Game', 0),
                /Harmony One alone/);
  // And a page that is already full, which is a refusal and not a second page: three rows fit and
  // adding a page needs a counter, a pool copy and a page count nobody has measured on this menu.
  let full = parse(require_('one_config_unprogrammed').slice());
  full = parse(composeActivityMenuRow(full, 'Two', 7).bytes);
  full = parse(composeActivityMenuRow(full, 'Three', 7).bytes);
  assert.throws(() => composeActivityMenuRow(full, 'Four', 7), /already draws 3 rows/);
});

test('a Harmony One turns a list page with the buttons beside the display, which no page binds',
     skipUnless(...ACTIVITY_MENU_HOSTS), () => {
  // Danny's correction of 7 September 2026, measured. The composer's own docstrings called the
  // fourth rectangle of a device list page a page flip; it is the left of the two physical buttons
  // **below** the display, the paging is on the two beside it, and nothing on any page answers
  // those. Section 275.
  const LEFT = '1257/1395';
  const RIGHT = '2406/1150';
  let allPages = 0;
  let sideRectangles = 0;
  let sideBindings = 0;
  let devicePages = 0;
  let activityPages = 0;
  const deviceBottoms = new Set<string>();
  const activityBottoms = new Set<string>();
  let deviceValueMaps = 0;
  let activityEnters = 0;
  for (const name of ACTIVITY_MENU_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists() ?? [];
    const records = modeRecords(c) ?? [];

    // Every mode page of the model, not only the two menus: that is what makes it a fact about the
    // Harmony One rather than about these menus.
    for (const record of records) {
      for (const page of record.pages) {
        allPages += 1;
        const hit = touchPageOf(c, page);
        sideRectangles += (hit?.areas ?? [])
          .filter((area) => area.code === 46 || area.code === 47).length;
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          const scan = entry.tag & 0x3f;
          if (scan === 46 || scan === 47) sideBindings += 1;
        }
      }
    }

    // A device list row enters a mode and writes 1 into the device mode marker; an activity row
    // selects a keypad map and writes 0. That is what tells the two menus apart, section 239.
    for (const record of records) {
      let activities = 0;
      let devices = 0;
      for (const page of record.pages) {
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          if (entry.opcode !== 0x7f) continue;
          const list = lists[entry.operand];
          if (list?.length !== 3 || list[0]?.opcode !== 0x75) continue;
          if (list[1]?.opcode === 0x1f) activities += 1;
          else if (list[1]?.opcode === 0x7e && list[2]?.operand === 1) devices += 1;
        }
      }
      if (activities === 0 && devices === 0) continue;
      const isActivity = activities > 0;
      for (const page of record.pages) {
        const hit = touchPageOf(c, page);
        const bottoms = (hit?.areas ?? []).filter((area) => area.y === 271);
        const shape = bottoms.map((area) => `${area.x}/${area.width}`).sort().join(' ');
        const bound = new Map((taggedList(c, page.list)?.entries ?? [])
          .map((entry) => [entry.tag & 0x3f, entry]));
        for (const area of bottoms) {
          const entry = bound.get(area.code);
          assert.ok(entry !== undefined, `${name}: a bottom key rectangle is offered and unbound`);
          const last = entry.opcode === 0x7f ? lists[entry.operand]?.at(-1)?.opcode : entry.opcode;
          if (isActivity) { if (last === 0x7e) activityEnters += 1; }
          else if (last === 0x72) deviceValueMaps += 1;
        }
        if (isActivity) { activityPages += 1; activityBottoms.add(shape); }
        else { devicePages += 1; deviceBottoms.add(shape); }
      }
    }
  }
  assert.equal(allPages, 778, 'the four Harmony One configs hold 778 mode pages between them');
  assert.equal(sideRectangles, 2 * allPages, 'every one of them offers both rectangles beside the display');
  assert.equal(sideBindings, 0, 'and not one of them binds either, so no page can change the paging');

  assert.equal(devicePages, 29);
  assert.deepEqual([...deviceBottoms], [LEFT],
                   'a device list page offers the left bottom button and no rectangle for the right one');
  assert.equal(deviceValueMaps, 29,
               'and all 29 run opcode 0x72, which actions.ts names as mapping a state value');

  assert.equal(activityPages, 6);
  assert.deepEqual([...activityBottoms], [`${LEFT} ${RIGHT}`],
                   'an activity menu page offers both');
  assert.equal(activityEnters, 12, 'and both of its keys on all six pages enter a mode');
});

test('a screen with one page deadens the two page turn keys, and one with several leaves them alone',
     skipUnless(...ACTIVITY_MENU_HOSTS), () => {
  // The other half of the claim above, and the reason it needed its own measurement: `keyCodes`
  // answers 0 for these scans, because it reports only bindings that end in an infrared code. That
  // is the trap `CLAUDE.md` names about `keyCodes` versus `pageScans`, met a third time, so this
  // walks every tagged list in the container instead. Section 275.
  const PRESS = 2;
  for (const name of ACTIVITY_MENU_HOSTS) {
    const c = parse(require_(name));
    const sets = handlerSets(c);
    assert.ok(sets !== undefined, `${name}: base slot 9 does not read as a table`);
    const roles = handlerSetRoles(c);

    // Every base slot 9 entry.
    const inSets: { set: number; scan: number; event: number }[] = [];
    sets.addresses.forEach((address, index) => {
      for (const entry of taggedList(c, address)?.entries ?? []) {
        const scan = entry.tag & SCAN_MASK;
        if (scan !== 46 && scan !== 47) continue;
        inSets.push({ set: index, scan, event: (entry.tag & EVENT_MASK) >> 6 });
      }
    });
    assert.equal(inSets.length, 8, `${name}: not 8 page turn bindings`);
    assert.deepEqual([...new Set(inSets.map((one) => one.set))].sort((a, b) => a - b), [1, 2, 3, 4],
                     `${name}: the page turn keys are not bound in entries 1 to 4`);
    assert.deepEqual([...new Set(inSets.map((one) => one.event))], [PRESS],
                     `${name}: a page turn binding is not a press`);
    for (const one of inSets) {
      assert.equal(roles[one.set], 'unselected',
                   `${name}: entry ${one.set} is selected, so it is not the fixed prefix`);
    }

    // A mode record binds them too, in its **own** tagged list, and the first version of this
    // asserted it did not: it walked a `record.list` field that does not exist, so it checked
    // nothing and passed. The rule is asserted per record below instead of as a total.
    let modes = 0;
    for (const record of modeRecords(c) ?? []) {
      modes += 1;
      const bound = record.entries.filter((entry) => {
        const scan = entry.tag & SCAN_MASK;
        return scan === 46 || scan === 47;
      });
      // A page never does, on any of them.
      for (const page of record.pages) {
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          const scan = entry.tag & SCAN_MASK;
          assert.ok(scan !== 46 && scan !== 47, `${name}: a page binds scan ${scan}`);
        }
      }
      assert.equal(bound.length, record.pages.length === 1 ? 2 : 0,
                   `${name}: mode ${modes - 1} has ${record.pages.length} pages and binds `
                   + `${bound.length} page turn keys`);
    }
    assert.ok(modes > 0, `${name}: the mode walk found nothing to walk`);
  }
});

test('adding a page to a one page list menu has to undeaden its two page turn keys',
     skipUnless(...ACTIVITY_MENU_HOSTS), () => {
  // The rail that falls out of the rule above, and it is the reason `composeActivityMenuRow`
  // refusing to add a page is worth more than it looked. Every one page list menu in the corpus
  // binds both page turn keys to the **null instruction**, opcode 0 with operand 0, which is how a
  // screen with nowhere to page says so. Grow such a menu to two pages and the second is
  // unreachable, with everything else about the file correct. Section 275.
  let menus = 0;
  for (const name of ACTIVITY_MENU_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists() ?? [];
    for (const record of modeRecords(c) ?? []) {
      // A list menu is one whose pages carry rows: an activity row selects a keypad map, a device
      // row enters a mode and writes 1 into the device mode marker.
      let isList = false;
      for (const page of record.pages) {
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          if (entry.opcode !== 0x7f) continue;
          const list = lists[entry.operand];
          if (list?.length !== 3 || list[0]?.opcode !== 0x75) continue;
          if (list[1]?.opcode === 0x1f) isList = true;
          else if (list[1]?.opcode === 0x7e && list[2]?.operand === 1) isList = true;
        }
      }
      if (!isList || record.pages.length !== 1) continue;
      menus += 1;
      const deadened = record.entries.filter((entry) => {
        const scan = entry.tag & SCAN_MASK;
        return (scan === 46 || scan === 47) && entry.opcode === 0 && entry.operand === 0;
      });
      assert.equal(deadened.length, 2,
                   `${name}: a one page list menu deadens ${deadened.length} page turn keys, not 2`);
    }
  }
  // Twelve: the activity menu and three device lists on each of the three configs whose menus hold
  // one page. `one_config` has none, since every one of its list menus already has two or three.
  assert.equal(menus, 12);
});

test('a composed menu row can wear an existing row\'s icon, chosen by its drawn label',
     skipUnless('one_config'), () => {
  // The rank an icon is read from comes from **where the label is drawn** and not from the scan
  // code, section 275, and this is the case that separates the two: on `one_config`'s first
  // activity page the three rows are scans 50, 51 and 52, so `scan - 48` gives 2, 3 and 4 where the
  // ranks are 0, 1 and 2. `menuIconLike` beside it does use `scan - 48`, correctly, because a
  // device list page's rows **are** the lowest scans.
  const c = parse(require_('one_config'));
  const named = activityNames(c).filter((one) => one.name !== undefined && one.at !== undefined);
  // Exact, not a floor: all eight of the everyday Harmony One's activities resolve to a name and a
  // drawn position, so a reader that stopped resolving one would fail here rather than be absorbed.
  assert.equal(named.length, 8);
  assert.equal(activityNames(c).length, 8);

  // Every named row's label sits on the row grid, which is what the rank divides out of, and the
  // eight cover all three ranks, which is what makes `scan - 48` visibly wrong: those same rows are
  // scans 48 to 52 across three pages.
  const ranks = named.map((one) => ((one.at as { y: number }).y - 0x39) / 54);
  for (const [k, rank] of ranks.entries()) {
    assert.ok(Number.isInteger(rank) && rank >= 0 && rank < 3,
              `${named[k]?.name} is drawn at y ${(named[k]?.at as { y: number }).y}, off the grid`);
  }
  assert.deepEqual([...new Set(ranks)].sort(), [0, 1, 2]);

  // A row asked for by name comes out wearing that row's icon and not the first row's.
  const wanted = named.find((one) => ((one.at as { y: number }).y) !== 0x39);
  assert.ok(wanted?.name !== undefined, 'no named activity is drawn below the top row');
  const plain = composeActivityMenuRow(c, 'Play Game', 7);
  const asked = composeActivityMenuRow(c, 'Play Game', 7, { iconLike: wanted.name });
  const iconOf = (bytes: Uint8Array, at: { menu: number; page: number }): number | undefined => {
    const g = parse(bytes);
    const page = (modeRecords(g) ?? [])[at.menu]?.pages[at.page];
    if (page === undefined) return undefined;
    // The new row's own icon, at its own rank, which is one below the rows the page already had.
    for (const one of screenProgram(g, page.program) ?? []) {
      if (one.opcode !== 0x02) continue;
      if (one.operands[0] !== 0x0b) continue;
      if (one.operands[1] !== 0x27 + 54 * 2) continue;
      return one.operands[2]! | (one.operands[3]! << 8) | (one.operands[4]! << 16);
    }
    return undefined;
  };
  const plainIcon = iconOf(plain.bytes, plain);
  const askedIcon = iconOf(asked.bytes, asked);
  assert.ok(plainIcon !== undefined && askedIcon !== undefined, 'the composed row draws no icon');
  assert.notEqual(askedIcon, plainIcon,
                  'asking for a named row\'s icon gave the same picture as the default');

  // And a name nothing is labelled with is a refusal rather than a fallback.
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', 7, { iconLike: 'Nothing At All' }),
                /0 activity menu rows are labelled/);
});

/**
 * References to a variable at or above `narrow`, and below it, per host.
 *
 * Exact rather than a floor: these move only when a reader changes or a sample is replaced, and
 * then they move in the diff. `h525_config`'s zero is the interesting row, since it is what makes
 * the guard in the test below have to be a per host statement rather than `moved > 0`.
 */
const DISPLACED_REFERENCES: Record<string, { moved: number; below: number }> = {
  one_config: { moved: 88, below: 627 },
  h600_config: { moved: 127, below: 644 },
  h525_config: { moved: 0, below: 123 },
  arch8_config_a: { moved: 31, below: 351 },
};

/**
 * Section 277. The renumbering's own claim, stated as a census rather than a spot check: every
 * reference to a displaced variable moved, and every reference below the insertion point did not.
 *
 * **This is the assertion that could pass while the code was wrong**, which is why it counts sites
 * rather than checking one. A renumbering that missed a kind of site leaves a container that parses,
 * checksums, round trips and drives the wrong device, and the site kinds are exactly what was got
 * wrong first: a survey using two of the six `0x1F` band sub opcodes found 100 references where
 * there are 1511.
 */
for (const host of HOSTS) {
  test(`${host}: renumbering moves every reference to a displaced variable and no other`,
    skipUnless(host), () => {
      const before = parse(load(host) as Uint8Array);
      const table = stateTable(before);
      assert.ok(table !== undefined);
      const from = table.narrow;

      // The census before, per variable index, over every site kind `stateVariableSite` knows.
      const census = (c: Container): Map<number, number> => {
        const out = new Map<number, number>();
        for (const list of c.actionLists() ?? []) {
          for (const instruction of list ?? []) {
            const site = stateVariableSite(instruction);
            if (site === undefined) continue;
            out.set(site.index, (out.get(site.index) ?? 0) + 1);
          }
        }
        return out;
      };
      const was = census(before);
      const after = parse(renumberStateVariables(before, from));
      const now = census(after);

      // Same length: a renumbering pokes bytes and inserts nothing.
      assert.equal(after.blob.length, before.blob.length);

      let below = 0;
      let moved = 0;
      for (const [index, count] of was) {
        if (index < from) {
          assert.equal(now.get(index), count, `variable ${index} keeps its ${count} reference(s)`);
          below += count;
        } else {
          assert.equal(now.get(index + 1), count,
            `variable ${index}'s ${count} reference(s) moved to ${index + 1}`);
          moved += count;
        }
      }
      // The total is conserved, which catches a rewrite that turned a reference into a different
      // opcode rather than moving it.
      const total = (m: Map<number, number>): number => [...m.values()].reduce((a, b) => a + b, 0);
      assert.equal(total(now), total(was));
      assert.equal(below + moved, total(was));
      // And the insertion point is now free, since nothing referenced the new variable yet.
      assert.equal(now.get(from), undefined, 'no reference is left pointing at the new position');
      // **Exact per host, because three of the four exercise the moving half and one does not.**
      // The Harmony 525's own top variable is referenced by nothing, so that host asserts only that
      // the untouched half stays untouched, and saying so here is the honest form: a `moved > 0`
      // guard fails on it and a `moved >= 0` guard would hide that the other three carry the claim.
      assert.deepEqual({ moved, below }, DISPLACED_REFERENCES[host],
        `${host}'s displaced and untouched reference counts`);
    });
}

/**
 * The refusals, because a renumbering that truncates silently is worse than one that stops. The
 * write band carries seven bits of index, so a table already at 128 cannot be grown, and a position
 * outside the table is a caller's mistake rather than a no-op.
 */
test('renumbering refuses a position it cannot express', skipUnless('one_config'), () => {
  const c = parse(load('one_config') as Uint8Array);
  const table = stateTable(c);
  assert.ok(table !== undefined);
  assert.throws(() => renumberStateVariables(c, -1), ComposeError);
  assert.throws(() => renumberStateVariables(c, table.count + 1), ComposeError);
  assert.throws(() => renumberStateVariables(c, 1.5), ComposeError);
  // The end of the table is a legal position and a no-op, which is worth asserting because it is
  // the old behaviour: appending changes no reference at all.
  const appended = renumberStateVariables(c, table.count);
  assert.deepEqual(appended, c.blob);
});

/**
 * Every Harmony One configuration here that has an activity, and the base slot 14 record its
 * Activities key reaches, section 279. One per distinct configuration: the spare's many region reads
 * hold the same record and would only repeat `one_spare_20260830`.
 *
 * The record number differs four ways, which is the point of reading it off the walk rather than
 * carrying one: 3 on a factory configuration, 5 on the three Logitech compiled for us, 11 on the
 * everyday Harmony One and 13 on the spare and the calibration account.
 */
const ACTIVITY_SCREEN_RECORDS: Readonly<Record<string, number>> = {
  one_config_unprogrammed: 3,
  one_spare_after_sync: 3,
  one_config: 11,
  one_spare_myharmony: 13,
  one_spare_20260830: 13,
  calibration_one: 13,
  calibration_favchannels: 13,
  calibration_favzero: 13,
  compiled_protocols: 5,
  compiled_protocols_2: 5,
  compiled_protocols_3: 5,
  phase7_before: 13,
  phase7_after: 13,
};

test('the Activities key of device mode reaches one record, and it names a screen for every activity',
     skipUnless(...Object.keys(ACTIVITY_SCREEN_RECORDS)), () => {
  let activities = 0;
  let reachedByCalls = 0;
  for (const [name, record] of Object.entries(ACTIVITY_SCREEN_RECORDS)) {
    const c = parse(require_(name));
    const found = activityScreens(c);
    assert.ok(found !== undefined, `${name}: the walk found no record, or more than one`);
    assert.equal(found.map, record, name);
    // Every activity a key starts has a working screen, and nothing else does: the reader keeps only
    // values some key starts, so the record's one further case, the idle value's, is checked below
    // from the raw record. A configuration
    // Logitech compiled never leaves one out, which is what makes a composed activity without one
    // the defect this section was opened for.
    const bound = [...new Set(activityBindings(c).map((one) => one.activity))].sort((a, b) => a - b);
    assert.deepEqual([...found.screens.keys()].sort((a, b) => a - b), bound, name);
    activities += bound.length;
    // The raw record holds exactly one case beyond the activities, for the idle value, and it enters
    // no screen: its program queues a `0x72` into another record.
    const raw = (valueMaps(c)?.[record]?.entries ?? []).map(([value]) => value);
    const extra = raw.filter((value) => !bound.includes(value));
    assert.equal(extra.length, 1, `${name}: the record's cases beyond the activities`);
    const idle = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record?.first;
    assert.equal(extra[0], idle, `${name}: the extra case is not the idle value`);

    // The closure, from the other end: the enter list. Its first instruction enters the start up
    // screen and **never** the working one, and the working one is reached by following calls alone,
    // behind a deferred `0x3F`, on the everyday Harmony One's eight and on nothing else. The other 52
    // get there through the Remote Assistant's timers and comparisons, which is why the table and
    // not the chain is what the reader reads.
    const lists = c.actionLists() ?? [];
    const sets = handlerSets(c);
    assert.ok(sets !== undefined, name);
    const done = new Set<number>();
    for (const binding of activityBindings(c)) {
      if (done.has(binding.activity)) continue;
      done.add(binding.activity);
      const enter: { tag: number; operand: number } | undefined = (taggedList(c, sets.addresses[binding.set] as number)?.entries ?? [])
        .find((one) => one.tag === 1);
      assert.ok(enter !== undefined, `${name}: activity ${binding.activity} has no enter list`);
      const working = found.screens.get(binding.activity);
      const first: { opcode: number; operand: number } | undefined = (lists[enter.operand] ?? [])[0];
      assert.equal(first?.opcode, 0x7e, `${name}: activity ${binding.activity}`);
      assert.notEqual(first?.operand, working, `${name}: activity ${binding.activity}`);
      let deferred = false;
      const walk = (list: number, depth: number, behind: boolean): void => {
        if (depth > 8) return;
        const body = lists[list] ?? [];
        body.forEach((one, k) => {
          if (one.opcode === 0x7e && one.operand === working && behind) deferred = true;
          if (one.opcode === 0x7f) walk(one.operand, depth + 1, behind || body[k - 1]?.opcode === 0x3f);
        });
      };
      walk(enter.operand, 0, false);
      if (deferred) reachedByCalls += 1;
      if (deferred) assert.equal(name, 'one_config');
    }
  }
  // 1 + 1 + 8 + 7 + 7 + 2 + 2 + 7 + 7 + 7 + 7 + 2 + 2.
  assert.equal(activities, 60);
  assert.equal(reachedByCalls, 8);
});

test('a composed activity gets its own working screen and enters it after the start up screen',
     skipUnless('one_spare_20260830'), () => {
  const c = parse(require_('one_spare_20260830'));
  const before = activityScreens(c);
  assert.ok(before !== undefined);
  const activity = nextActivityValue(c);

  const screen = composeActivityScreen(c, activity, 'Test', [
    { label: 'Power', list: 0 },
    { label: 'Mute', list: 1 },
  ], { startupLike: 'LG WebOS' });
  const middle = parse(screen.bytes);
  assert.equal(screen.activity, activity);
  assert.equal(screen.map, before.map);
  assert.equal(screen.scans.length, 2);

  const built = composeActivity(middle, {
    label: 'Test',
    targets: [{ variable: aDeviceVariable(middle), value: 1 }],
    keys: [{ scan: 20, list: 0 }],
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode,
      activeList: screen.activeList, activity: screen.activity,
    },
  });
  assert.equal(built.activity, activity);
  // A case is only read for an activity some row starts, so the row goes on too.
  const after = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);

  // The record gains the one case and every existing case keeps its screen.
  const found = activityScreens(after);
  assert.ok(found !== undefined, 'the composed container no longer reads one record');
  assert.equal(found.map, before.map);
  assert.equal(found.screens.get(activity), screen.mode);
  for (const [value, mode] of before.screens) assert.equal(found.screens.get(value), mode);

  // The enter list opens the way all 60 real ones do, section 279, and ends by deferring the
  // working screen behind whatever was queued before it.
  const lists = after.actionLists() ?? [];
  const enter = lists[built.enterList] ?? [];
  assert.deepEqual(enter.slice(0, 2), [
    { opcode: 0x7e, operand: screen.startupMode },
    { opcode: 0x07, operand: 0xfffb },
  ]);
  assert.deepEqual(enter.at(-2), { opcode: 0x7f, operand: screen.activeList });
  const deferred = enter.at(-1);
  assert.equal(deferred?.opcode, 0x7f);
  const defer = lists[deferred.operand] ?? [];
  assert.equal(defer.length, 2);
  assert.deepEqual(defer[0], { opcode: 0x3f, operand: 0xd000 });
  assert.equal(defer[1]?.opcode, 0x7f);
  assert.deepEqual(lists[(defer[1] as { operand: number }).operand], [{ opcode: 0x7e, operand: screen.mode }]);
  assert.notEqual(screen.startupMode, screen.mode);

  // The active list is the one every other enter list calls: silent write of 1 into a variable.
  assert.deepEqual((lists[screen.activeList] ?? [])[0], { opcode: 0x07, operand: 0xffff });

  // The page's Devices key runs a beep and enters a device list.
  const devices = lists[screen.devicesList] ?? [];
  assert.equal(devices.length, 2);
  assert.equal(devices[0]?.opcode, 0x75);
  assert.equal(devices[1]?.opcode, 0x7e);

  // The one page screen deadens both page turn keys, the rule of section 272.
  const record = (modeRecords(after) ?? [])[screen.mode];
  assert.ok(record !== undefined);
  assert.equal(record.pages.length, 1);
  const deadened = record.entries.filter((one) => one.tag === 0xaf || one.tag === 0xae);
  assert.deepEqual(deadened.map((one) => [one.tag, one.opcode, one.operand]), [[0xaf, 0, 0], [0xae, 0, 0]]);

  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');
});

test('the activity screen composer refuses what it cannot place', skipUnless('one_spare_20260830', 'h600_config'),
     () => {
  const c = parse(require_('one_spare_20260830'));
  const rows = [{ label: 'Power', list: 0 }];
  // An activity that already has a working screen.
  assert.throws(() => composeActivityScreen(c, 0, 'Test', rows), /already has a working screen/);
  // Any architecture but the Harmony One's.
  const h600 = parse(require_('h600_config'));
  assert.throws(() => composeActivityScreen(h600, nextActivityValue(h600), 'Test', rows),
                /Harmony One alone/);
  // And the enter list refuses a screen composed for another activity number.
  const screen = composeActivityScreen(c, nextActivityValue(c), 'Test', rows);
  const middle = parse(screen.bytes);
  assert.throws(() => composeActivity(middle, {
    label: 'Test',
    targets: [{ variable: aDeviceVariable(middle), value: 1 }],
    keys: [{ scan: 20, list: 0 }],
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode,
      activeList: screen.activeList, activity: screen.activity + 1,
    },
  }), /the screen was composed for activity/);
});

/**
 * The fifteen user configurations, and how many devices each switches off when no activity is left,
 * section 280. Zero means the configuration has one device and no all off list, which is the case
 * the reader returns undefined for.
 */
const ALL_OFF: Readonly<Record<string, number>> = {
  h700_config: 5, h700_config_2: 5, h600_config: 3, h525_config: 3, h525_config_2: 0,
  one_config: 4, one_config_unprogrammed: 0, one_spare_before_sync: 0, one_spare_after_sync: 0,
  arch8_config_a: 3, arch8_config_b: 5, arch8_config_c: 6, arch8_config_d: 6,
  arch8_config_880: 4, arch8_config_885: 7,
};

/**
 * Every state variable an enter list writes, directly or through the lists it calls, no deeper
 * than `depth` calls. The depth is a parameter because it is the finding's trap: the three
 * configurations compiled for our test account put most of their power writes three calls down,
 * behind a list holding a `0x3F`, and a walk that stopped at two called them an exception.
 */
function powerWrites(c: ReturnType<typeof parse>, list: number, depth = 8): Set<number> {
  const lists = c.actionLists() ?? [];
  const out = new Set<number>();
  const seen = new Set<number>();
  const walk = (at: number, level: number): void => {
    if (seen.has(at)) return;
    seen.add(at);
    for (const one of lists[at] ?? []) {
      if (one.opcode >= 0x80) out.add(one.opcode - 0x80);
      if (one.opcode === 0x7f && level < depth) walk(one.operand, level + 1);
    }
  };
  walk(list, 0);
  return out;
}

function enterListsOf(c: ReturnType<typeof parse>): number[] {
  const sets = handlerSets(c);
  const roles = handlerSetRoles(c);
  const out: number[] = [];
  (sets?.addresses ?? []).forEach((address, index) => {
    if (roles[index] !== 'activity') return;
    const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === 1);
    if (enter !== undefined && !out.includes(enter.operand)) out.push(enter.operand);
  });
  return out;
}

test('the idle key map reaches one list that switches every device off, and every activity sets every device',
     skipUnless(...Object.keys(ALL_OFF)), () => {
  let activities = 0;
  for (const [name, count] of Object.entries(ALL_OFF)) {
    const c = parse(require_(name));
    const power = deviceVariables(c).filter((one) => one.property === 'Power').map((one) => one.index);
    const found = allOffList(c);
    if (count === 0) {
      assert.equal(found, undefined, name);
      assert.equal(power.length, 1, `${name}: a configuration without the list has one device`);
      continue;
    }
    assert.ok(found !== undefined, `${name}: no single all off list`);
    assert.equal(found.variables.length, count, name);
    // It names every device's power variable and nothing else.
    assert.deepEqual([...found.variables].sort((a, b) => a - b), [...power].sort((a, b) => a - b), name);
    // And every activity's enter list writes every one of them, on or off, which is what switching
    // from one activity to another relies on.
    for (const list of enterListsOf(c)) {
      const written = powerWrites(c, list);
      for (const variable of found.variables) {
        assert.ok(written.has(variable), `${name}: enter list ${list} leaves variable ${variable} alone`);
      }
      activities += 1;
    }
  }
  // 5 + 5 + 3 + 3 + 8 + 1 + 2 + 3 + 3 + 4 + 9, over the eleven with a list.
  assert.equal(activities, 46);
});

test('the configurations our test account had compiled follow the rule three calls down, and a walk of two misses it',
     skipUnless('compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3', 'one_spare_20260830'), () => {
  // The blind reviewer's correction, section 280: these were first written up as the exception to
  // every activity setting every device, from a walk that stopped two calls down. Both halves are
  // asserted, so the depth that matters is on record.
  for (const [name, devices] of [['compiled_protocols', 14], ['compiled_protocols_2', 14],
                                   ['compiled_protocols_3', 8], ['one_spare_20260830', 5]] as const) {
    const c = parse(require_(name));
    const found = allOffList(c);
    assert.ok(found !== undefined, name);
    assert.equal(found.variables.length, devices, name);
    const complete = (depth: number): number => enterListsOf(c)
      .filter((list) => found.variables.every((v) => powerWrites(c, list, depth).has(v))).length;
    assert.equal(complete(8), 7, `${name}: every activity writes every power variable`);
    assert.equal(complete(2), name === 'one_spare_20260830' ? 7 : 0, `${name}: within two calls`);
  }
});

for (const host of HOSTS) {
  test(`${host}: a composed device joins the all off list and every activity switches it off`, skipUnless(host), () => {
    const before = parse(require_(host));
    const composed = composeDevice(before, { label: 'LG', commands: TELEVISION, power: 0 });
    const withDevice = parse(composed.bytes);
    // Before joining, the new device is exactly what section 280 found on the remote: in no list.
    assert.equal(allOffList(withDevice)?.variables.includes(composed.variable), false);
    const was = allOffList(withDevice);
    assert.ok(was !== undefined);

    const joined = joinPowerOff(withDevice, composed.variable);
    const after = parse(joined.bytes);
    const now = allOffList(after);
    assert.ok(now !== undefined, `${host}: the all off list stopped reading`);
    assert.deepEqual(now.variables, [...was.variables, composed.variable]);
    assert.equal(now.list, was.list, 'the list grew in place and kept its index');

    // Every activity's enter list writes it 0, immediately before the activity counter.
    const counter = stateVariables(after).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    assert.ok(counter !== undefined);
    const lists = after.actionLists() ?? [];
    const enters = enterListsOf(after);
    assert.deepEqual(joined.enterLists, enters);
    for (const list of enters) {
      const body = lists[list] ?? [];
      const at = body.findIndex((one) => one.opcode === 0x80 + counter.index);
      assert.deepEqual(body[at - 1], { opcode: 0x80 + composed.variable, operand: 0 }, `${host}: list ${list}`);
      assert.equal(body.length, ((withDevice.actionLists() ?? [])[list] ?? []).length + 1);
    }
    // One instruction per list and nothing else: three bytes per enter list plus the all off list.
    assert.equal(joined.bytes.length - composed.bytes.length, 3 * (enters.length + 1));

    const report = coverage(after);
    assert.equal(report.accounted, report.total, 'every byte is claimed');
    assert.deepEqual(report.overlaps, []);
    assert.ok(trailerAgrees(after));
    assert.equal(roundTrip(after).equal, true);

    // A new activity then sets the device on and every other one off.
    const targets = activityPowerTargets(after, [composed.variable]);
    assert.deepEqual(targets[0], { variable: composed.variable, value: 1 });
    assert.deepEqual(targets.slice(1).map((one) => one.variable), was.variables);
    assert.ok(targets.slice(1).every((one) => one.value === 0));
  });
}

test('joining the power off lists refuses what is not a new device\'s power variable', skipUnless('one_config'), () => {
  const c = parse(require_('one_config'));
  const found = allOffList(c);
  assert.ok(found !== undefined);
  assert.throws(() => joinPowerOff(c, found.variables[0] as number), /already writes/);
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  assert.throws(() => joinPowerOff(c, counter?.index as number), /not a device's Power variable/);
});
