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
  composeActivityDeviceList,
  activityScreens,
  caseQueued,
  nextActivityValue,
  allOffList,
  joinPowerOff,
  activityPowerTargets,
  deviceVariables,
  stateRecords,
  valueMaps,
  deviceIdOfGroup,
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
  irRecordBlocks,
  mergedIntervals,
  parse,
  roundTrip,
  statedCode,
  stateTable,
  stateVariables,
  sendPreludes,
  interDeviceDelayCases,
  INTER_DEVICE_DELAY_VALUES,
  INTER_DEVICE_DELAY_DEFAULT,
  POWER_ON_DELAY_DEFAULT,
  POWER_ON_DELAY_CASES,
  powerOnDelays,
  powerOnDelayCases,
  powerOnDelayAmounts,
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
  FOUR_SLOT_ITEMS,
  touchPages,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  renderPage,
  renderVariants,
  screenStrings,
  taggedList,
  glyphsReferencedBy,
  decode,
  Container,
  compiledBlockWords,
  payloadOf,
  bitmapReference,
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
    //
    // On arch 14 the device also gains its two delays, two byte variables appended at the end, as all
    // the compiled ones sit above `narrow`, sections 287 and 288, so there `count` rises by three and
    // `wide` by two, and those two are the delay variables rather than existing variables widening.
    const grownTable = stateTable(after);
    assert.ok(grownTable !== undefined);
    const delayed = after.architecture === 14;
    assert.equal(composed.delay !== undefined, delayed, 'a delay exactly on arch 14');
    assert.equal(grownTable.count, wasTable.count + (delayed ? 3 : 1));
    assert.equal(grownTable.narrow, wasTable.narrow + 1, 'the new variable is a narrow one');
    assert.equal(grownTable.wide, wasTable.wide + (delayed ? 2 : 0),
                 'and no existing variable changes width');
    if (composed.delay !== undefined) {
      assert.equal(composed.powerOnDelay?.variable, grownTable.count - 2, 'the power on delay variable');
      assert.equal(composed.delay.variable, grownTable.count - 1, 'then the inter device delay variable');
    }
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
    // And the two delay variables', which are the last two, where they exist.
    if (composed.delay !== undefined) withoutTheNewOne.splice(-2, 2);
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
    assert.equal(nowNamed.size, wasNamed.size + (delayed ? 3 : 1), 'plus the ones this composer named');
    assert.equal(variable?.record?.first, 0, 'nothing is running when a config is generated');
    assert.equal(variable?.record?.second, 1, 'a power switch has two states');
    assert.deepEqual(
      variable?.record?.values.map((one) => [one.from, one.to, one.opcode, one.operand]),
      [[0, 1, 0x7f, composed.powerOnDelay?.on ?? composed.lists[0]], [1, 0, 0x7f, composed.lists[0]]],
      'switching off runs the power command\'s list, and switching on too except on arch 14');
    // On arch 14 switching on runs the power command and then the power on delay, section 288.
    if (composed.powerOnDelay !== undefined) {
      assert.deepEqual(after.actionLists()![composed.powerOnDelay.on]!.map((one) => [one.opcode, one.operand]),
                       [[0x7f, composed.lists[0]], [0x7f, composed.powerOnDelay.list]]);
    }
    // And each command's list is the send **paired** with its per device quantity, readable off the
    // container itself. This asserted the send alone until 8 September 2026, and the title said "one
    // send", which was true of what the composer emitted and false of every send list in the corpus:
    // section 278 measures every one as this pair with the device agreeing in both high bytes, and
    // the bare form sent nothing when an activity's transition ran it on the spare Harmony One while
    // answering a button press correctly. So the claim being asserted here changed rather than the
    // assertion being relaxed. **On the arch 14 host the pair opens with the `0x7F` prelude**, as
    // every Harmony 600, 650 and 700 send list does, section 287, and `sendPreludes`, the reader,
    // is what says it has the compiler's shape; this asserted the bare pair there until then, as a
    // known deviation, todo 1.2.6.
    const lists = after.actionLists();
    const preludes = new Map(sendPreludes(after).map((one) => [one.list, one]));
    composed.lists.forEach((index, k) => {
      const list = lists?.[index];
      const pair = [[0x7d, (composed.group << 8) | k],
                    [0x7c, (composed.group << 8) | DEVICE_QUANTITY_DEFAULT]];
      assert.deepEqual(list?.slice(delayed ? 1 : 0).map((one) => [one.opcode, one.operand]), pair,
                       `command ${k}'s list sends to the new group and names it again`);
      assert.equal(preludes.has(index), delayed, `command ${k} opens with the prelude exactly on arch 14`);
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

/** Whether base slot 14's records, and their first programs, sit in the order of their indices. */
function addressesFollowIndices(c: ReturnType<typeof parse>): boolean {
  const maps = valueMaps(c)!;
  const first = maps.map((one) => Math.min(...one.entries.map(([, target]) => target)));
  return maps.every((one, k) => k === 0 || (one.address > maps[k - 1]!.address && first[k]! > first[k - 1]!));
}

/**
 * The arch 14 configurations, each with its send list count and its start sequence variable, the
 * one every command's condition tests. The second Harmony 700 configuration repeats the first.
 */
const PRELUDE_HOSTS = [
  ['h650_config_region', 422, 52],
  ['h600_config', 188, 46],
  ['calibration_h600', 244, 47],
  ['h700_config', 372, 59],
  ['h700_config_2', 372, 59],
] as const;

test('every arch 14 command opens with a private load and condition and its device\'s delay list',
     skipUnless(...PRELUDE_HOSTS.map(([name]) => name)), () => {
  // Section 287. The shape is read whole by `sendPreludes`, which leaves out any list that opens
  // another way, so its count against the send list count is the claim.
  let tables = 0;
  const held: number[] = [];
  for (const [name, sends, start] of PRELUDE_HOSTS) {
    const c = parse(require_(name));
    // The compiler's own order, which the composer keeps: a base slot 14 record's address rises with
    // its index, and so does its first program's.
    assert.ok(addressesFollowIndices(c), `${name}: base slot 14 is stored in index order`);
    const identifiers = deviceIdOfGroup(c);
    const lists = c.actionLists()!;
    const sending = lists.filter((list) => list.some((one) => one.opcode === 0x7d)).length;
    const preludes = sendPreludes(c);
    assert.equal(sending, sends, `${name} has ${sends} send lists`);
    assert.equal(preludes.length, sends, `${name}: every one opens with the prelude`);
    // The load and the condition are the command's own: no list names one that another names.
    const namedBy = new Map<number, number>();
    lists.forEach((list) => list.forEach((one) => {
      if (one.opcode === 0x7f) namedBy.set(one.operand, (namedBy.get(one.operand) ?? 0) + 1);
    }));
    for (const one of preludes) {
      assert.equal(namedBy.get(one.load), 1, `${name}: list ${one.list}'s load is its own`);
      assert.equal(namedBy.get(one.condition), 1, `${name}: list ${one.list}'s condition is its own`);
    }
    assert.deepEqual([...new Set(preludes.map((one) => one.loadOperand))], [0xfb01], 'byte register := 1');
    assert.deepEqual([...new Set(preludes.map((one) => one.conditionOperand))], [start],
                     `${name}: one start sequence variable, compared for equality`);
    // One delay list per device, naming that device's own `InterDeviceDelay_<identifier>` through a
    // table whose cases queue their own value for that device's group.
    const byGroup = new Map<number, Set<number>>();
    for (const one of preludes) byGroup.set(one.group, (byGroup.get(one.group) ?? new Set()).add(one.delay));
    for (const [group, delays] of byGroup) {
      assert.equal(delays.size, 1, `${name}: group ${group} has one delay list`);
    }
    const names = new Map(stateVariables(c).map((one) => [one.index, one]));
    const perDelay = new Map(preludes.map((one) => [one.delay, one]));
    const narrow = stateTable(c)!.narrow;
    for (const one of perDelay.values()) {
      const variable = names.get(one.variable);
      assert.match(variable?.label ?? '', /^InterDeviceDelay_\d+$/);
      assert.ok(one.variable >= narrow, 'a two byte variable');
      assert.equal(variable?.record?.second, 65277);
      if (name !== 'h700_config_2') held.push(variable?.record?.first ?? -1);
      // And it is that device's: the identifier in its name is the one the remote's own delay page
      // joins to the device's group, section 234.
      assert.equal(variable?.deviceId, identifiers.get(one.group), `${name}: group ${one.group}'s own delay`);
      const cases = interDeviceDelayCases(c, one.table);
      assert.ok(cases !== undefined, `${name}: table ${one.table} reads as a delay table`);
      assert.deepEqual(cases.map((k) => k.value), [...INTER_DEVICE_DELAY_VALUES]);
      assert.ok(cases.every((k) => k.tenths === k.value && k.group === one.group));
      tables += 1;
    }
  }
  assert.equal(tables, 23, 'five, three, three, six and six');
  assert.equal(PRELUDE_HOSTS.reduce((sum, [, sends]) => sum + sends, 0), 1598, 'the total the documents quote');
  // What the compiled devices hold, the second Harmony 700 configuration left out as a repeat: the
  // composer's default is the value nearly all of them carry.
  assert.equal(held.length, 17, 'the devices with commands');
  assert.equal(held.filter((one) => one === INTER_DEVICE_DELAY_DEFAULT).length, 15);
  assert.deepEqual(held.filter((one) => one !== INTER_DEVICE_DELAY_DEFAULT).sort((a, b) => a - b), [3, 10]);
});

test('no command opens with the prelude on the Harmony One, the 525 or the arch 8 configuration',
     skipUnless('one_config', 'h525_config', 'arch8_config_a'), () => {
  for (const [name, sends] of [['one_config', 340], ['h525_config', 200], ['arch8_config_a', 239]] as const) {
    const c = parse(require_(name));
    assert.equal(c.actionLists()!.filter((list) => list.some((one) => one.opcode === 0x7d)).length, sends);
    assert.deepEqual(sendPreludes(c), [], `${name} has sends and no prelude`);
  }
});

test('every arch 14 device with a Power variable switches on through its power command and then its power on delay',
     skipUnless(...PRELUDE_HOSTS.map(([name]) => name)), () => {
  // Section 288. The off transition runs the power command's send list; the on transition runs a
  // list calling that same send list and then a list of one 0x72 on the device's PowerOnDelay, whose
  // table queues each value from 0 to 450 as 0x7C quantities a hundred at a time.
  let devicesSeen = 0;
  let offSame = 0;
  let second = 0;
  let notLast = 0;
  const perConfiguration: number[] = [];
  const held: number[] = [];
  const orders = new Set<string>();
  for (const [name] of PRELUDE_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists()!;
    const records = stateRecords(c)!;
    const names = new Map(stateVariables(c).map((one) => [one.index, one]));
    const sends = new Map(sendPreludes(c).map((one) => [one.list, one]));
    const identifiers = deviceIdOfGroup(c);
    const delays = powerOnDelays(c);
    const powered = deviceVariables(c).filter((one) => one.property === 'Power');
    assert.equal(delays.length, powered.length, `${name}: every Power variable has one`);
    assert.equal(new Set(delays.map((one) => one.group)).size, delays.length, 'one per device');
    assert.equal(new Set(delays.map((one) => one.delay)).size, delays.length, 'no two devices share one');
    perConfiguration.push(delays.length);
    // The second table on every PowerOnDelay variable, a device with no Power variable included: 451
    // cases each calling a list of two instructions, 0x7A and then 0x6C with the case's own value.
    // What reads it is unread.
    const mappers = new Map<number, Set<number>>();
    lists.forEach((list) => list.forEach((step) => {
      if (step.opcode !== 0x72) return;
      const set = mappers.get(step.operand & 0xff) ?? new Set<number>();
      mappers.set(step.operand & 0xff, set.add(step.operand >>> 8));
    }));
    const queueTables = new Set(delays.map((one) => one.table));
    for (const variable of names.values()) {
      if (!/^PowerOnDelay_\d+$/.test(variable.label)) continue;
      const others = [...(mappers.get(variable.index) ?? [])].filter((table) => !queueTables.has(table));
      assert.equal(others.length, 1, `${name}: ${variable.label} has one second table`);
      const map = valueMaps(c)![others[0]!]!;
      assert.equal(map.entries.length, POWER_ON_DELAY_CASES);
      for (const [value, target] of map.entries) {
        const step = screenProgram(c, target)![0]!;
        assert.equal(step.opcode, 0x11);
        assert.equal(step.operands[2], 0x7f);
        const called = lists[step.operands[0]! | (step.operands[1]! << 8)]!;
        assert.deepEqual(called.map((one) => one.opcode), [0x7a, 0x6c]);
        assert.equal(called[1]!.operand, value, `${name}: the second table's case ${value} writes ${value}`);
      }
      if (name !== 'h700_config_2') second += 1;
    }
    for (const one of delays) {
      const variable = names.get(one.variable)!;
      assert.equal(variable.deviceId, identifiers.get(one.group), `${name}: group ${one.group}'s own`);
      assert.ok(one.variable >= stateTable(c)!.narrow, 'a two byte variable');
      assert.equal(variable.record?.second, 65277);
      const on = lists[one.on]!;
      const power = sends.get(on[0]!.operand);
      assert.equal(on[0]!.opcode, 0x7f);
      assert.equal(power?.group, one.group, 'switching on starts with the power command');
      const delayAt = on.findIndex((step) => step.opcode === 0x7f && step.operand === one.delay);
      assert.ok(delayAt > 0, 'and calls the delay after it');
      if (delayAt !== on.length - 1) notLast += 1;
      // The off transition sends a code of the same device with no delay: a send list of its own,
      // or a list whose first call is one. Not necessarily the same code, since a device with
      // separate on and off codes sends the off one.
      const record = records.find((r) => r.values.some((v) => v.from === 0 && v.to === 1 && v.operand === one.on))!;
      const off = record.values.find((v) => v.from === 1 && v.to === 0)!;
      const offSend = sends.get(off.operand) ?? sends.get(lists[off.operand]![0]!.operand);
      assert.equal(offSend?.group, one.group, `${name}: switching off sends a code of the device`);
      assert.ok(!(lists[off.operand] ?? []).some((step) => step.opcode === 0x7f && step.operand === one.delay),
                'and no power on delay');
      if (offSend!.list === power!.list) offSame += 1;
      const cases = powerOnDelayCases(c, one.table)!;
      assert.equal(cases.length, POWER_ON_DELAY_CASES);
      assert.deepEqual([...cases.map((k) => k.value)].sort((a, b) => a - b),
                       Array.from({ length: POWER_ON_DELAY_CASES }, (_, k) => k));
      for (const k of cases) {
        assert.equal(k.group, one.group);
        assert.deepEqual(k.amounts, powerOnDelayAmounts(k.value), `${name}: case ${k.value}`);
        assert.equal(k.list !== undefined, k.value > 100, 'a list exactly above a hundred');
      }
      // The lists above a hundred are the device's own, contiguous and in the table's case order,
      // which is not value order.
      const called = cases.filter((k) => k.list !== undefined).map((k) => k.list as number);
      assert.deepEqual(called, called.map((_, k) => called[0]! + k));
      const byValue = cases.filter((k) => k.list !== undefined).sort((a, b) => a.value - b.value)
        .map((k) => k.list as number);
      assert.notDeepEqual(byValue, called, 'and that is not value order');
      orders.add(cases.map((k) => k.value).join(','));
      if (name !== 'h700_config_2') {
        devicesSeen += 1;
        held.push(variable.record?.first ?? -1);
      }
    }
  }
  assert.equal(devicesSeen, 15, 'four, three, three and five');
  assert.deepEqual(perConfiguration, [4, 3, 3, 5, 5]);
  assert.equal(notLast, 2, "the delay is last in the on list except on the Harmony 700's video recorder, both 700s");
  assert.equal(second, 18, 'the fifteen and the three devices with no Power variable');
  assert.equal(offSame, 7, 'devices whose off sends the same code as their on, of 20 with both 700s counted');
  assert.equal(orders.size, 1, 'one case order on every table');
  assert.equal(held.filter((one) => one === POWER_ON_DELAY_DEFAULT).length, 9);
  assert.deepEqual(held.filter((one) => one !== POWER_ON_DELAY_DEFAULT).sort((a, b) => a - b),
                   [35, 50, 50, 60, 75, 80]);
});

test('a device composed on the Harmony 650 switches on with a power on delay in the compiler\'s shape',
     skipUnless('h650_config_region'), () => {
  const pristine = parse(require_('h650_config_region'));
  const was = powerOnDelays(pristine);
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0, powerOnDelay: 50 });
  const after = parse(device.bytes);
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');
  assert.ok(addressesFollowIndices(after), 'both new tables stored last, as their indices are');

  // The reader finds it by the compiler's route, and every existing device's is unchanged.
  const found = powerOnDelays(after);
  assert.equal(found.length, was.length + 1);
  const mine = found.find((one) => one.group === device.group)!;
  assert.deepEqual(mine, { group: device.group, on: device.powerOnDelay!.on, delay: device.powerOnDelay!.list,
                           table: device.powerOnDelay!.table, variable: device.powerOnDelay!.variable });
  for (const one of was) {
    assert.deepEqual(powerOnDelayCases(after, one.table), powerOnDelayCases(pristine, one.table));
  }
  const cases = powerOnDelayCases(after, mine.table)!;
  const called = cases.filter((k) => k.list !== undefined).map((k) => k.list as number);
  assert.deepEqual(called, called.map((_, k) => called[0]! + k), 'its lists in case order, as compiled');
  assert.deepEqual(cases.map((k) => k.value), powerOnDelayCases(pristine, was[0]!.table)!.map((k) => k.value),
                   "the configuration's own case order");
  assert.ok(cases.every((k) => k.group === device.group
    && k.amounts.join() === powerOnDelayAmounts(k.value).join()));

  // The variable carries the same identifier as the inter device one, and the value asked for.
  const variable = stateVariables(after).find((one) => one.index === mine.variable)!;
  assert.equal(variable.name, `PowerOnDelay_${device.delay!.identifier}_65278`);
  assert.equal(variable.record?.first, 50);
  assert.equal(variable.record?.count, 0, 'no transitions');
  const plain = composeDevice(pristine, { label: 'LG', commands: TELEVISION });
  assert.equal(stateVariables(parse(plain.bytes)).find((one) => one.index === plain.powerOnDelay!.variable)
    ?.record?.first, POWER_ON_DELAY_DEFAULT);
  assert.throws(() => composeDevice(pristine, { label: 'LG', commands: TELEVISION, powerOnDelay: 451 }),
                ComposeError);
});

/**
 * Section 309, todo 4.3.4: a device composed with the catalogue's power steps switches with the records
 * Logitech's compiler writes for them. The known answer is the Harmony 650's own television, the
 * Panasonic TX-P42GT30E, compiled onto the 650's record with its catalogue holds in section 307: power
 * on and off are each held for a second, and the compiler wrote a record of seven frames for each. The
 * composed device's two step records are those two records word for word, and its power variable sends
 * them where it used to send the ordinary press, which is three frames and leaves that television off.
 */
test('a device composed on the Harmony 650 with held power steps switches with the records Logitech compiles for them',
     skipUnless('h650_config_region', 'h650_power_hold_compile_2'), () => {
  const ON = 'G:PanasonicV2 48 Bit:()(0x400401007C7D)():3';
  const OFF = 'G:PanasonicV2 48 Bit:()(0x40040100FCFD)():3';
  const pristine = parse(require_('h650_config_region'));
  const commands = [{ stated: ON, held: false }, { stated: OFF, held: false }];
  const device = composeDevice(pristine, {
    label: 'Plasma', commands, power: 0, powerOn: { stated: ON, holdMs: 1000 }, powerOff: { stated: OFF, holdMs: 1000 },
  });
  const after = parse(device.bytes);
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');
  assertStateTableConsistent(after);

  // Four records: the two commands, then the two steps, each step one block with no held block.
  const compiled = parse(payloadOf(require_('h650_power_hold_compile_2')));
  const wordsAt = (c: Container, group: number, record: number) => {
    const [once, held, tail] = irHeaderPointers(c, irGroups(c)![group]!.addresses[record]!);
    return { words: irBlockWords(c, once!)!, held, tail };
  };
  assert.equal(irGroups(after)![device.group]!.addresses.length, 4);
  for (const [record, theirs] of [[2, 54], [3, 4]] as const) {
    const mine = wordsAt(after, device.group, record);
    assert.equal(mine.held, 0);
    assert.equal(mine.tail, 0);
    assert.deepEqual(mine.words, wordsAt(compiled, 5, theirs).words, `step record ${record} is Logitech's record ${theirs}`);
  }
  // The ordinary presses keep their lead in and are not the step records.
  assert.equal(wordsAt(after, device.group, 0).words[0]! & IR_PULSE_MARK, 0);

  // The power variable: off sends the off step's list, on runs the list that sends the on step's and
  // then the power on delay. Both step lists send their own record and nothing else.
  const sendOf = (list: number) => after.actionLists()![list]!.filter((one) => one.opcode === 0x7d).map((one) => one.operand);
  const transitions = stateRecords(after)![device.variable]!.values;
  const on = transitions.find((one) => one.from === 0 && one.to === 1)!;
  const off = transitions.find((one) => one.from === 1 && one.to === 0)!;
  assert.equal(off.operand, device.powerSteps!.off);
  assert.equal(on.operand, device.powerOnDelay!.on);
  assert.deepEqual(after.actionLists()![on.operand]!.map((one) => one.operand),
                   [device.powerSteps!.on, device.powerOnDelay!.list]);
  assert.deepEqual(sendOf(device.powerSteps!.on!), [(device.group << 8) | 2]);
  assert.deepEqual(sendOf(device.powerSteps!.off!), [(device.group << 8) | 3]);
  assert.deepEqual(device.lists, [device.lists[0], device.lists[0]! + 1], 'the commands keep the first lists');

  // A toggle held for one time is one step: one record, and both transitions send it.
  const toggle = composeDevice(pristine, {
    label: 'Plasma', commands, power: 0, powerOn: { stated: ON, holdMs: 1000 }, powerOff: { stated: ON, holdMs: 1000 },
  });
  assert.equal(irGroups(parse(toggle.bytes))![toggle.group]!.addresses.length, 3);
  assert.equal(toggle.powerSteps!.on, toggle.powerSteps!.off);
  // A step without a hold is the ordinary press with no lead in: in that compile the KPN box's power step,
  // record 17 of its group, is its ordinary press, record 25, with the lead in gone. And a hold shorter
  // than a press is refused, since whether it sends fewer frames than a press is unmeasured.
  const plain = composeDevice(pristine, { label: 'Plasma', commands, power: 0, powerOn: { stated: ON }, powerOff: { stated: OFF } });
  const press = wordsAt(parse(plain.bytes), plain.group, 0).words;
  assert.deepEqual(wordsAt(parse(plain.bytes), plain.group, 2).words, press.slice(press.findIndex((w) => (w & IR_PULSE_MARK) !== 0)));
  assert.throws(() => composeDevice(pristine, { label: 'Plasma', commands, power: 0, powerOn: { stated: ON, holdMs: 100 } }),
                ComposeError);
});

test('a device composed on the Harmony 650 opens every command in the compiler\'s shape and order',
     skipUnless('h650_config_region'), () => {
  const pristine = parse(require_('h650_config_region'));
  const wasPreludes = sendPreludes(pristine);
  const wasIds = stateVariables(pristine).flatMap((one) => one.deviceId === undefined ? [] : [one.deviceId]);
  const device = composeDevice(pristine, { label: 'LG', commands: TELEVISION, power: 0 });
  const after = parse(device.bytes);
  const report = coverage(after);
  assert.equal(report.accounted, report.total, 'every byte is claimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');
  assert.ok(addressesFollowIndices(after), 'the new table is stored last, as its index is');

  // Every command is in the reader's shape, with the configuration's own load and condition, and
  // the three share one delay list that no other device's command names.
  const delay = device.delay!;
  const preludes = sendPreludes(after);
  assert.equal(preludes.length, wasPreludes.length + TELEVISION.length);
  const mine = preludes.filter((one) => one.group === device.group);
  assert.deepEqual(mine.map((one) => one.list), [...device.lists]);
  for (const one of mine) {
    assert.equal(one.loadOperand, 0xfb01);
    assert.equal(one.conditionOperand, 52, 'the 650\'s start sequence variable');
    assert.equal(one.delay, delay.list);
    assert.equal(one.table, delay.table);
    assert.equal(one.variable, delay.variable);
  }
  assert.ok(preludes.filter((one) => one.group !== device.group).every((one) => one.delay !== delay.list));
  assert.equal(new Set(mine.flatMap((one) => [one.load, one.condition])).size, 2 * TELEVISION.length);

  // The table queues each value for the new group, and every existing table still reads as before.
  const cases = interDeviceDelayCases(after, delay.table)!;
  assert.deepEqual(cases.map((one) => one.value), [...INTER_DEVICE_DELAY_VALUES]);
  assert.ok(cases.every((one) => one.tenths === one.value && one.group === device.group));
  for (const one of wasPreludes) {
    assert.deepEqual(interDeviceDelayCases(after, one.table), interDeviceDelayCases(pristine, one.table));
  }

  // The variable: two bytes, the last, named with an identifier no device here has, holding the
  // default, and its maximum the one every compiled one states.
  const variable = stateVariables(after).find((one) => one.index === delay.variable)!;
  assert.equal(delay.variable, stateTable(after)!.count - 1);
  assert.ok(delay.variable >= stateTable(after)!.narrow, 'a two byte variable');
  assert.equal(variable.name, `InterDeviceDelay_${delay.identifier}_65278`);
  assert.equal(delay.identifier, Math.max(...wasIds) + 1);
  assert.equal(variable.record?.first, INTER_DEVICE_DELAY_DEFAULT);
  assert.equal(variable.record?.second, 65277);
  assert.equal(variable.record?.count, 0, 'no transitions');

  // A value the table has no case for is refused rather than written as a delay that never applies.
  assert.throws(() => composeDevice(pristine, { label: 'LG', commands: TELEVISION, interDeviceDelay: 21 }),
                ComposeError);
  const slow = parse(composeDevice(pristine, { label: 'LG', commands: TELEVISION, interDeviceDelay: 20 }).bytes);
  assert.equal(stateVariables(slow).find((one) => one.label.startsWith('InterDeviceDelay_' + delay.identifier))
    ?.record?.first, 20);
});

test('the arch 14 screen half opens a page on a full last page and refuses a letter its fonts do not carry',
     skipUnless('h600_config', 'h700_config'), () => {
  // Until todo-compile-650 2.3 a full last page was refused here, the Harmony 700's two row list
  // holding two devices on each of three pages and every list of the Harmony 600 being full. Now a
  // full list gets a page, so the 700 composes, and what still refuses the 600 is its label font,
  // which carries only the letters its own screens draw: no 'U' for an 'Up'.
  const outcome = (host: string, label: string, row: string): string => {
    const c = parse(require_(host));
    const device = composeDevice(c, { label, commands: TELEVISION, power: 0 });
    try {
      const screen = composeDeviceScreen(parse(device.bytes), label, [{ label: row, list: device.lists[1]! }]);
      return `pages added on ${screen.pagesAdded.join(',')}`;
    } catch (error) {
      assert.ok(error instanceof ComposeError, String(error));
      return error.message;
    }
  };
  assert.equal(outcome('h700_config', 'TV', 'Up'), 'pages added on 283');
  assert.match(outcome('h600_config', 'TV', 'Up'), /font 6 has no glyph for 'U'/);
  assert.equal(outcome('h600_config', 'TV', 'TV'), 'pages added on 64,77,101,145,166');
});

/** The arch 14 configurations Logitech compiled whose device lists the paging rule is read off. */
/**
 * Every Harmony 600, 650 and 700 configuration Logitech compiled that the lab holds once each: a
 * region read equal to one of these is left out rather than counted twice. Five until a sentence
 * audit of section 312 found the other eight, which obey the same rule.
 */
const ARCH14_LISTS = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
                      'h700_config', 'h700_config_2', 'h700_28_config_region',
                      'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
                      'h700_power_hold_compile_2', 'h700_power_hold_compile_3',
                      'h700_power_hold_compile_4'] as const;

/**
 * The device list menus of an arch 14 configuration, each with its layout: a two row list binds both
 * buttons of a row to twin lists, so its first page runs fewer distinct list bodies than it binds.
 */
function arch14DeviceLists(c: Container): { menu: number; rows: boolean }[] {
  const lists = c.actionLists()!;
  const marker = deviceModeMarker(c)!;
  const out: { menu: number; rows: boolean }[] = [];
  modeRecords(c)!.forEach((record, menu) => {
    const reached = new Set<number>();
    for (const page of record.pages) {
      for (const one of taggedList(c, page.list)!.entries) {
        const list = lists[one.operand];
        if (one.opcode === 0x7f && list?.length === 2 && list[0]!.opcode === 0x7e
            && list[1]!.opcode === marker.opcode) reached.add(list[0]!.operand);
      }
    }
    if (reached.size < 2) return;
    const first = taggedList(c, record.pages[0]!.list)!.entries;
    const bodies = new Set(first.map((one) => JSON.stringify(lists[one.operand])));
    out.push({ menu, rows: bodies.size < first.length });
  });
  return out;
}

/** The picture a page's program draws first, its background. */
function backgroundOf(c: Container, program: number): number {
  return bitmapReference(screenProgram(c, program)![0]!)!;
}

/** The background the configuration's device mode pages holding one item draw, by majority. */
function oneItemBackground(c: Container): number {
  const counts = new Map<number, number>();
  for (const mode of new Set(deviceListRows(c).map((row) => row.mode))) {
    for (const page of modeRecords(c)![mode]!.pages) {
      if (taggedList(c, page.list)!.entries.length !== 1) continue;
      const picture = backgroundOf(c, page.program);
      counts.set(picture, (counts.get(picture) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]![0];
}

test('an arch 14 device list counts its pages on every page of several and on none of one, and keeps one record list',
     skipUnless(...ARCH14_LISTS), () => {
  // The rule `openFourSlotMenuPage` and `paginateFourSlot` write, read off Logitech's own compiles.
  // A page's counter is `n/m` at x 0x6A, 0x71, 0x76 on a corner list and 0x63, 0x6A, 0x6F on a two
  // row one; a list of one page draws none; a corner list's record list is the same on one page and
  // on several, so there is nothing like the Harmony One's deadened page turn keys to undo; a corner
  // page holding one item draws the device mode pages' one item background; and every page of a two
  // row list draws its first page's picture. No two row list here has one page, so that layout's
  // record list is measured on several pages only, and every corner list of one page is a Harmony
  // 600's, so the rule that one page draws no counter is measured on that model alone.
  const tally = new Map<string, number>();
  const note = (key: string): void => { tally.set(key, (tally.get(key) ?? 0) + 1); };
  for (const host of ARCH14_LISTS) {
    const c = parse(require_(host));
    const strings = screenStrings(c, characterMap(c));
    const single = oneItemBackground(c);
    for (const { menu, rows } of arch14DeviceLists(c)) {
      const record = modeRecords(c)![menu]!;
      const kind = rows ? 'rows' : 'corners';
      const several = record.pages.length > 1;
      note(`${kind} ${several ? 'several' : 'one'} own ${record.entries.map((one) =>
        `${one.tag.toString(16)}:${one.opcode.toString(16)}`).join(',')}`);
      record.pages.forEach((page, k) => {
        const counter = strings.filter((one) => one.program === page.program && one.y === 2 && one.x >= 0x60)
          .map((one) => `${one.x.toString(16)}:${one.text}`).join(' ');
        const right = rows ? `63:${k + 1} 6a:/ 6f:${record.pages.length}` : `6a:${k + 1} 71:/ 76:${record.pages.length}`;
        note(`${kind} ${several ? 'several' : 'one'} counter ${counter === (several ? right : '') ? 'right' : counter}`);
        const items = taggedList(c, page.list)!.entries.length;
        if (!rows && items === 1) {
          note(`corners one item ${backgroundOf(c, page.program) === single ? 'one item picture' : 'other'}`);
        }
        // From the second page on, since a first page compared with itself is no evidence.
        if (rows && k > 0) {
          note(`rows ${backgroundOf(c, page.program) === backgroundOf(c, record.pages[0]!.program)
            ? 'first page picture' : 'other'}`);
        }
      });
    }
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'corners one counter right': 7,
    'corners one item one item picture': 7,
    'corners one own 99:72,2d:73': 7,
    'corners several counter right': 92,
    'corners several own 99:72,2d:73': 46,
    'rows first page picture': 30,
    'rows several counter right': 43,
    'rows several own 99:72': 13,
  });
});

/**
 * A device list page as a shape two configurations can be compared on: every instruction in order,
 * with what is per configuration taken out. Fonts become a letter by first appearance on the page, so
 * a title, counter, label and bottom word font of 5, 6, 7, 1 on a 650 and 5, 8, 6, 1 on a 600 read
 * alike; the background is named by what it is, the one item picture, its list's first page's or
 * another; a counter text says whether it is the page's own number, the total or the slash; a label
 * says where it sits against the edges, since the device names differ. Everything else is kept: the
 * title, the bottom word, both bars' operands short of their address, and the queued instruction.
 */
function pageShape(c: Container, menu: number, page: number, rows: boolean): string[] {
  const record = modeRecords(c)![menu]!;
  const program = screenProgram(c, record.pages[page]!.program)!;
  const map = characterMap(c)!;
  const single = oneItemBackground(c);
  const counterX = rows ? [0x63, 0x6a, 0x6f] : [0x6a, 0x71, 0x76];
  const letters = new Map<number, string>();
  let font = -1;
  return program.map((one) => {
    if (one.opcode === 0x02) {
      const picture = bitmapReference(one);
      return `picture ${picture === single ? 'one item'
        : picture === backgroundOf(c, record.pages[0]!.program) ? 'first page' : 'other'}`;
    }
    if (one.opcode === 0x10) {
      font = one.operands[0]!;
      if (!letters.has(font)) letters.set(font, 'abcdefgh'[letters.size]!);
      return `font ${letters.get(font)}`;
    }
    if (one.opcode === 0x04 || one.opcode === 0x05) {
      const glyphs = one.glyphs ?? glyphsReferencedBy(c, one)!;
      const text = decode(glyphs, map);
      const [x, y] = [one.operands[0]!, one.operands[1]!];
      if (y === 2 && counterX.includes(x)) {
        const role = x === counterX[1] ? (text === '/' ? 'slash' : `slash reading ${text}`)
          : x === counterX[0] ? (text === String(page + 1) ? 'own number' : `number reading ${text}`)
            : (text === String(record.pages.length) ? 'total' : `total reading ${text}`);
        return `counter ${role}`;
      }
      if (y === 2 || y > 100) return `text ${x} ${y} ${text}`;
      const width = [...glyphs].reduce((sum, code) => sum + (glyphOf(c, fontSets(c)![font]!, code)?.width ?? 0), 0);
      const where = x === 3 ? 'left' : x + width === 125 ? 'right'
        : x === Math.floor((128 - width) / 2) ? 'centred' : `at ${x}`;
      return `label ${where} ${y}`;
    }
    if (one.opcode === 0x03) return `bar ${[...one.operands.slice(0, 6)].join(' ')}`;
    return `${one.opcode.toString(16)} ${[...one.operands].join(' ')}`;
  });
}

/** One device composed onto `c` with a screen of one command, as the calibration composes it. */
function composeOneMore(c: Container, label: string): { after: Container; screen: ReturnType<typeof composeDeviceScreen> } {
  const device = composeDevice(c, { label, commands: TELEVISION, power: 0 });
  const screen = composeDeviceScreen(parse(device.bytes), label, [{ label, list: device.lists[1]! }]);
  return { after: parse(screen.bytes), screen };
}

test('a page opened on a full arch 14 device list is the page Logitech compiles for one device more',
     skipUnless('h600_config', 'h650_config_region', 'calibration_h600', 'h700_config'), () => {
  // The calibration. `h600_config` drives four devices and every one of its five lists is full, the
  // four corner lists on their one page and the two row list on two; `h650_config_region` is what
  // Logitech's compiler writes for five, and its lists are exactly one device past full. So a fifth
  // device composed onto the 600 has to open pages shaped like the 650's: a second corner page with
  // the item top left, a third two row page with the device on the top row, and a counter on every
  // page, the corner lists' first pages gaining one.
  const logitech = parse(require_('h650_config_region'));
  const shapesOf = (c: Container, pick: (rows: boolean, pages: number) => number[]): string[] =>
    arch14DeviceLists(c).flatMap(({ menu, rows }) =>
      pick(rows, modeRecords(c)![menu]!.pages.length).map((page) => JSON.stringify(pageShape(c, menu, page, rows))));
  // A page up to its first label: the 600's own pages carry its own devices, so a comparison of a page
  // that was there before stops where they start.
  const head = (shape: string): string => {
    const all = JSON.parse(shape) as string[];
    return JSON.stringify(all.slice(0, all.findIndex((one) => one.startsWith('label'))));
  };
  const theirNew = new Set(shapesOf(logitech, (_, pages) => [pages - 1]));
  const theirFirstHeads = new Set(shapesOf(logitech, () => [0]).map(head));
  const theirMiddleHeads = new Set(shapesOf(logitech, (rows, pages) => (rows ? [pages - 2] : [])).map(head));
  assert.equal(arch14DeviceLists(logitech).length, 5);

  const { after, screen } = composeOneMore(parse(require_('h600_config')), 'TV');
  const ours = arch14DeviceLists(after);
  assert.deepEqual(screen.pagesAdded, ours.map((one) => one.menu));
  for (const { menu, rows } of ours) {
    const pages = modeRecords(after)![menu]!.pages.length;
    assert.equal(pages, rows ? 3 : 2);
    const last = JSON.stringify(pageShape(after, menu, pages - 1, rows));
    assert.ok(theirNew.has(last), `menu ${menu}'s new page is one Logitech wrote: ${last}`);
    assert.ok(theirFirstHeads.has(head(JSON.stringify(pageShape(after, menu, 0, rows)))),
              `menu ${menu}'s first page counts the way Logitech's does`);
    if (rows) {
      assert.ok(theirMiddleHeads.has(head(JSON.stringify(pageShape(after, menu, pages - 2, rows)))),
                `menu ${menu}'s second page counts the way Logitech's does`);
    }
  }
  // The control: the comparison tells a new page from a full first page, and the layouts and the two
  // bottom words apart, so agreeing with it is not agreeing with anything.
  const ourNew = new Set(shapesOf(after, (_, pages) => [pages - 1]));
  const theirFirst = new Set(shapesOf(logitech, () => [0]));
  assert.ok([...ourNew].every((one) => !theirFirst.has(one)), 'no new page reads as a full first page');
  assert.equal(ourNew.size, 3, 'the idle corner list, the activities\' corner lists and the two row list differ');

  // The second calibration, the two row layout alone: the Harmony 700's list is three full pages of
  // two, and its fourth, holding the seventh device, is shaped like the last page of the two lists
  // Logitech compiled one device past full, on the 650 and on the calibration Harmony 600.
  const seven = composeOneMore(parse(require_('h700_config')), 'TV');
  const twoRow = arch14DeviceLists(seven.after).filter((one) => one.rows);
  assert.deepEqual(twoRow.map((one) => one.menu), [283]);
  assert.equal(modeRecords(seven.after)![283]!.pages.length, 4);
  const lastTwoRow = (c: Container): string => {
    const { menu } = arch14DeviceLists(c).find((one) => one.rows)!;
    return JSON.stringify(pageShape(c, menu, modeRecords(c)![menu]!.pages.length - 1, true));
  };
  assert.equal(lastTwoRow(seven.after), lastTwoRow(logitech));
  assert.equal(lastTwoRow(seven.after), lastTwoRow(parse(require_('calibration_h600'))));
});

test('the Harmony 650\'s six device configuration takes a seventh device, on a fourth page of its full two row list',
     skipUnless('h650_plasma_base'), () => {
  // What todo-compile-650 2.3 is for: the 650 as it was before section 309's write, Logitech's own
  // compile of six devices, whose two row list is three full pages of two and whose five corner lists
  // hold two on their second page.
  const base = parse(require_('h650_plasma_base'));
  const baseGaps = coverage(base).gapBytes;
  const device = composeDevice(base, { label: 'LG', commands: TELEVISION, power: 0 });
  const before = parse(device.bytes);
  const wasPages = modePages(before).length;
  const items = ['Power', 'Up', 'Down'].map((label, k) => ({ label, list: device.lists[k]! }));
  const screen = composeDeviceScreen(before, 'LG', items, { keysLike: 'TV' });
  const after = parse(screen.bytes);

  assert.deepEqual([...screen.menus], [57, 71, 87, 109, 159, 226]);
  assert.deepEqual(screen.pagesAdded, [226]);
  // The five corner lists take the LG as a third item and the two row list on a new page: one corner
  // each and the top row's two buttons, a list per binding and as many again for the copies.
  assert.equal(screen.rowLists, 2 * (5 + 2));
  const report = coverage(after);
  assert.equal(report.gapBytes, baseGaps, 'no byte unclaimed that the base did not leave unclaimed');
  assert.deepEqual(report.overlaps, [], 'and no byte twice');
  assert.ok(trailerAgrees(after));
  assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');
  assert.equal(new Set(deviceListRows(after).map((row) => row.mode)).size, 7);

  const record = modeRecords(after)![226]!;
  assert.equal(record.pages.length, 4);
  assert.deepEqual(record.entries.map((one) => [one.tag, one.opcode]), [[0x99, 0x72]], 'the record list is unchanged');
  const strings = screenStrings(after, characterMap(after));
  const counters = record.pages.map((page) => strings.filter((one) => one.program === page.program && one.y === 2
    && one.x >= 0x60).map((one) => `${one.x.toString(16)}:${one.text}`).join(' '));
  assert.deepEqual(counters, ['63:1 6a:/ 6f:4', '63:2 6a:/ 6f:4', '63:3 6a:/ 6f:4', '63:4 6a:/ 6f:4']);
  // The new page: the LG on both buttons of the top row, each running a row list of its own that
  // enters the new mode and writes the 650's marker, its label centred at y 35, and its list's picture.
  const lists = after.actionLists()!;
  const newPage = record.pages[3]!;
  const bound = taggedList(after, newPage.list)!.entries;
  assert.deepEqual(bound.map((one) => one.tag & 0x3f), [8, 2]);
  assert.equal(new Set(bound.map((one) => one.operand)).size, 2);
  for (const one of bound) {
    assert.deepEqual(lists[one.operand]!.map((step) => [step.opcode, step.operand]),
                     [[0x7e, screen.mode], [0x80 + 31, 1]]);
  }
  const label = strings.find((one) => one.program === newPage.program && one.y === 35)!;
  assert.equal(label.text, 'LG');
  const labelWidth = [...screenProgram(after, newPage.program)!
    .find((one) => one.opcode === 0x05 && one.operands[1] === 35)!.glyphs!]
    .reduce((sum, code) => sum + (glyphOf(after, fontSets(after)![7]!, code)?.width ?? 0), 0);
  assert.equal(label.x, Math.floor((128 - labelWidth) / 2));
  assert.equal(backgroundOf(after, newPage.program), backgroundOf(after, record.pages[0]!.program));
  // The corner lists: a third item on their second page, the bottom left one.
  for (const menu of [57, 71, 87, 109, 159]) {
    const last = modeRecords(after)![menu]!.pages.at(-1)!;
    assert.deepEqual(taggedList(after, last.list)!.entries.map((one) => one.tag & 0x3f), [9, 8, 2]);
  }
  // Drawn, every page of every list, with nothing unresolved.
  for (const menu of screen.menus) {
    for (const page of modeRecords(after)![menu]!.pages) {
      for (const variant of renderVariants(after, page.program).variants) {
        assert.equal(variant.page.glyphsMissing, 0, `menu ${menu} draws every glyph`);
        assert.equal(variant.page.picturesMissing, 0, `menu ${menu} draws every picture`);
      }
    }
  }
  // Section 69's rail, over every page: one copy per page, agreeing entry by entry, so the new page's
  // copy sits where the pairing by position expects it.
  const pages = modePages(after);
  const copies = pageListCopies(after);
  assert.equal(pages.length, wasPages + 2, 'the new mode\'s page and the new list page');
  assert.equal(copies.length, pages.length);
  const body = (index: number): string => (lists[index] ?? []).map((one) => `${one.opcode}:${one.operand}`).join(' ');
  pages.forEach((page, index) => {
    const mine = taggedList(after, page.list)!;
    const copy = taggedList(after, copies[index]! + after.flashBase)!;
    assert.deepEqual(copy.entries.map((one) => [one.tag, one.opcode]), mine.entries.map((one) => [one.tag, one.opcode]),
                     `page ${index}'s copy`);
    mine.entries.forEach((entry, k) => assert.equal(body(copy.entries[k]!.operand), body(entry.operand)));
  });
  // Every row list the composition wrote is bound exactly once, across pages and copies.
  const rowIndices = Array.from({ length: screen.rowLists! }, (_, k) => screen.rowList + k);
  const boundRows = [...pages.map((page) => page.list), ...copies.map((copy) => copy + after.flashBase)]
    .flatMap((list) => taggedList(after, list)!.entries)
    .filter((one) => one.opcode === 0x7f && rowIndices.includes(one.operand)).map((one) => one.operand);
  assert.deepEqual(boundRows.sort((a, b) => a - b), rowIndices);
});

test('a corner list opening its third page keeps every other screen\'s text, the digit it lent out included',
     skipUnless('h650_config_region'), () => {
  // Four devices onto the 650's five: the two row list opens its fourth page with the seventh device,
  // and with the ninth the corner lists open their third and the two row list its fifth. A corner
  // list's first page draws its total inline and other draws of "2" borrow that digit by reference,
  // so restating it to "3" has to hand the borrowers another run ending in "2" first; any it missed
  // would change on a screen nobody composed. So every text drawn anywhere but the device lists and
  // the new modes reads as before, in the same font at the same place.
  let c = parse(require_('h650_config_region'));
  const listPrograms = (k: Container): Set<number> =>
    new Set(arch14DeviceLists(k).flatMap(({ menu }) => modeRecords(k)![menu]!.pages.map((page) => page.program)));
  const textsOutside = (k: Container, skip: Set<number>): string[] => screenStrings(k, characterMap(k))
    .filter((one) => !skip.has(one.program)).map((one) => `${one.x},${one.y},${one.font}:${one.text}`).sort();
  const before = textsOutside(c, listPrograms(c));
  const added: number[][] = [];
  const newModes: number[] = [];
  // One label four times: the 650's title font spells only the letters its own titles use.
  for (const label of ['LG', 'LG', 'LG', 'LG']) {
    const grown = composeOneMore(c, label);
    c = grown.after;
    added.push([...grown.screen.pagesAdded]);
    newModes.push(grown.screen.mode);
  }
  assert.deepEqual(added, [[], [179], [], [57, 61, 74, 135, 179]]);
  const report = coverage(c);
  assert.equal(report.accounted, report.total);
  assert.deepEqual(report.overlaps, []);
  assert.ok(trailerAgrees(c));
  assert.equal(roundTrip(c).equal, true);
  const skip = listPrograms(c);
  for (const mode of newModes) for (const page of modeRecords(c)![mode]!.pages) skip.add(page.program);
  assert.deepEqual(textsOutside(c, skip), before);
  // And the lists themselves count right on every page.
  const strings = screenStrings(c, characterMap(c));
  for (const { menu, rows } of arch14DeviceLists(c)) {
    const record = modeRecords(c)![menu]!;
    assert.equal(record.pages.length, rows ? 5 : 3);
    record.pages.forEach((page, k) => {
      const counter = strings.filter((one) => one.program === page.program && one.y === 2 && one.x >= 0x60)
        .map((one) => one.text).join('');
      assert.equal(counter, `${k + 1}/${record.pages.length}`, `menu ${menu} page ${k + 1}`);
    });
  }
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
/** The containers the block spelling is measured over: the corpus's with infrared, and the six compiles. */
const SPELLING_POPULATION = [
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
  'one_spare_before_sync', 'one_spare_after_sync',
  'h700_power_hold_compile', 'h650_power_hold_compile', 'h700_power_hold_compile_2',
  'h650_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
];

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
  // **The microsecond comes off before the split**, section 309: the Panasonic family's 74801 is spelled
  // with its balanced pair smaller half first, which carving the last word afterwards would reverse.
  assert.deepEqual(words([{ mark: true, us: 500 }, { mark: false, us: 74801 }]),
                   [[true, 500], [false, 32767], [false, 21016], [false, 21017], [false, 1]]);
});

/**
 * Section 309: every compiled block whose trailing silence is one quantity ends it the way
 * `compiledBlockWords` does, the microsecond carved off before the rest is split. Over the corpus
 * containers with infrared and the six power hold compiles, carving first is the only spelling that fits
 * 1757 blocks and carving after the split the only one that fits none; on 7037 the two agree, and 607
 * end in a run that is several quantities, a frame's last space or a biphase half cell beside the gap,
 * which no single respelling can reproduce. The Harmony 525's blocks end in no microsecond at all.
 */
test('every compiled block gives its trailing gap\'s last microsecond up before the gap is split',
     skipUnless(...SPELLING_POPULATION), () => {
  // The words a gap of `us`, the closing microsecond included, gets each way. `compiledBlockWords` carves
  // first; spelling `us` plus one that way and dropping its closing word leaves `us` split whole.
  const gap = (us: number) => compiledBlockWords([{ mark: true, us: 1 }, { mark: false, us }]).slice(1)
    .map((w) => w.microseconds);
  const carvedFirst = gap;
  const carvedLast = (us: number) => {
    const whole = gap(us + 1).slice(0, -1);
    return [...whole.slice(0, -1), whole.at(-1)! - 1, 1];
  };
  const tally = { both: 0, first: 0, last: 0, neither: 0, none: 0 };
  const perArch = new Map<number, number>();
  for (const name of SPELLING_POPULATION) {
    const bytes = require_(name);
    let c: Container;
    try { c = parse(bytes); } catch { c = parse(payloadOf(bytes)); }
    const seen = new Set<number>();
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        for (const block of irRecordBlocks(c, record)) {
          if (block === 0 || seen.has(block)) continue;
          seen.add(block);
          const words = irBlockWords(c, block)!;
          const body = words.at(-1) === 0 ? words.slice(0, -1) : words;
          if (body.at(-1) !== 1) { tally.none += 1; continue; }
          let from = body.length - 1;
          while (from > 0 && (body[from - 1]! & IR_PULSE_MARK) === 0) from -= 1;
          const tail = body.slice(from).join();
          const total = body.slice(from).reduce((sum, w) => sum + w, 0);
          const first = carvedFirst(total).join() === tail;
          const last = carvedLast(total).join() === tail;
          if (first && !last) perArch.set(c.architecture!, (perArch.get(c.architecture!) ?? 0) + 1);
          tally[first && last ? 'both' : first ? 'first' : last ? 'last' : 'neither'] += 1;
        }
      }
    }
  }
  assert.deepEqual(tally, { both: 7037, first: 1757, last: 0, neither: 607, none: 656 });
  // Carving first is told apart on all three architectures that end a block in a microsecond: arch 8
  // (Harmony 880 and 885), arch 12 (Harmony One) and arch 14 (Harmony 600, 650 and 700).
  assert.deepEqual([...perArch].sort((a, b) => a[0] - b[0]), [[8, 515], [12, 11], [14, 1231]]);
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
    // And it pages. Section 293: the header said "2 pages" on all nine until `paginate` restated it,
    // which is what the configuration written to the spare Harmony One with its seventh device holds.
    const paging = pagingOf(after, menu);
    assert.deepEqual([paging.total, paging.numbers, paging.ends, paging.turnKeys],
                     ['3', ['1', '2', '3'], [18, 18, 18], 0], `menu ${menu}'s paging`);
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
/**
 * How a Harmony One screen states its paging, read the way section 293 measured it: the header every
 * page calls draws the total at (0x17, 0x12) and the word after it at x 0x23, and each page draws
 * its own number on row 18 ending where the slash at x 18 begins. `ends` is where each number's last
 * glyph column stops, which is the right alignment the rule is about.
 */
function pagingOf(c: Container, menu: number): {
  total: string | undefined; word: string | undefined; numbers: string[]; ends: number[]; starts: number[];
  slashes: number; turnKeys: number; header: number | undefined; switched: number; chained: number;
} {
  const map = characterMap(c)!;
  const sets = fontSets(c) ?? [];
  const record = modeRecords(c)![menu]!;
  const text = (one: { opcode: number; glyphs?: Uint8Array }) =>
    decode((one.opcode === 5 ? one.glyphs : glyphsReferencedBy(c, one as never)) ?? new Uint8Array(), map);
  const first = screenProgram(c, record.pages[0]!.program)![0]!;
  const header = first.opcode === 0x16
    ? first.operands[0]! | (first.operands[1]! << 8) | (first.operands[2]! << 16) : undefined;
  const headerProgram = header === undefined ? [] : screenProgram(c, header) ?? [];
  const on = (program: typeof headerProgram, x: number, y: number) =>
    program.find((one) => (one.opcode === 4 || one.opcode === 5) && one.operands[0] === x && one.operands[1] === y);
  const total = on(headerProgram, 0x17, 0x12);
  const word = on(headerProgram, 0x23, 0x12);
  const numbers: string[] = [];
  const ends: number[] = [];
  const starts: number[] = [];
  let slashes = 0;
  let switched = 0;
  let chained = 0;
  for (const page of record.pages) {
    // A device list page closes on a switch and draws its counter where the arms jump back to,
    // after a second switch on 7 pages of the four user configurations.
    let program = screenProgram(c, page.program) ?? [];
    if (program.at(-1)?.opcode === 0x12) switched += 1;
    for (let hop = 0; program.at(-1)?.opcode === 0x12; hop += 1) {
      if (hop === 1) chained += 1;
      const jump = screenProgram(c, program.at(-1)!.targets[0]!)!.at(-1)!;
      assert.equal(jump.opcode, 0x14, 'a switch arm that does not jump back');
      program = screenProgram(c, jump.targets[0]!) ?? [];
    }
    let font = -1;
    for (const one of program) {
      if (one.opcode === 0x10) font = one.operands[0]!;
      if ((one.opcode !== 4 && one.opcode !== 5) || one.operands[1] !== 18) continue;
      if (one.operands[0] === 18 && text(one) === '/') slashes += 1;
      if (one.operands[0]! >= 18) continue;
      numbers.push(text(one));
      starts.push(one.operands[0]!);
      const codes = one.opcode === 5 ? one.glyphs! : glyphsReferencedBy(c, one)!;
      ends.push(one.operands[0]! + [...codes].reduce((sum, code) => sum + glyphOf(c, sets[font]!, code)!.width, 0));
    }
  }
  const turnKeys = record.entries.filter((entry) => [46, 47].includes(entry.tag & SCAN_MASK)).length;
  return {
    total: total === undefined ? undefined : text(total), word: word === undefined ? undefined : text(word),
    numbers, ends, starts, slashes, turnKeys, header, switched, chained,
  };
}

/** The Harmony One containers of the corpus, both safe mode images included. */
const HARMONY_ONE_CONTAINERS = [
  'one_safemode', 'one34_region2', 'one_config', 'one_config_unprogrammed', 'one_spare_before_sync',
  'one_spare_after_sync',
] as const;

test('a Harmony One screen of several pages states its total in its header and its number against the slash, and one of one page states neither',
     skipUnless(...HARMONY_ONE_CONTAINERS), () => {
  // Section 293, what `paginate` writes. Three places carry a screen's paging and all three have to
  // agree with its page count, since each is a text a screen program draws or a binding it states.
  let single = 0;
  let several = 0;
  let deadened = 0;
  let switched = 0;
  let chained = 0;
  let switchedSingle = 0;
  let bindings = 0;
  let nullBindings = 0;
  let onlyNullLists = 0;
  let pages = 0;
  let notAt13 = 0;
  for (const name of HARMONY_ONE_CONTAINERS) {
    const c = parse(require_(name));
    // No two modes share a header, which is what lets a total be restated in place.
    const headers = new Set<number>();
    const records = modeRecords(c) ?? [];
    const lists = c.actionLists() ?? [];
    records.forEach((record, menu) => {
      const paging = pagingOf(c, menu);
      assert.ok(paging.header !== undefined, `${name}: mode ${menu} calls no header`);
      headers.add(paging.header);
      if (record.pages.length === 1) {
        single += 1;
        assert.equal(paging.total, undefined, `${name}: one page mode ${menu} draws a total`);
        assert.deepEqual(paging.numbers, [], `${name}: one page mode ${menu} draws a number`);
        // Its header ends in a return and the end marker, which is where `paginate` puts a total.
        const tail = (screenProgram(c, paging.header) ?? []).slice(-2).map((one) => one.opcode);
        assert.deepEqual(tail, [0x17, 0x00], `${name}: one page mode ${menu}'s header does not end plainly`);
        assert.equal(paging.turnKeys, 2, `${name}: one page mode ${menu} leaves the page turn keys unbound`);
        const bound = record.entries.filter((entry) => [46, 47].includes(entry.tag & SCAN_MASK));
        const isNull = (entry: { opcode: number; operand: number }) => entry.opcode === 0 && entry.operand === 0;
        bindings += bound.length;
        nullBindings += bound.filter(isNull).length;
        switchedSingle += paging.switched;
        if (bound.every(isNull)) deadened += 1;
        // The rest name a list; on some every list named is three null instructions.
        else if (bound.every((entry) => isNull(entry) || (entry.opcode === 0x7f
          && lists[entry.operand]?.length === 3 && lists[entry.operand]!.every(isNull)))) onlyNullLists += 1;
        return;
      }
      several += 1;
      switched += paging.switched;
      chained += paging.chained;
      pages += record.pages.length;
      notAt13 += paging.starts.filter((x) => x !== 13).length;
      assert.equal(paging.total, String(record.pages.length), `${name}: mode ${menu}'s total`);
      assert.equal(paging.word, 'pages', `${name}: mode ${menu}'s word`);
      assert.deepEqual(paging.numbers, record.pages.map((_, k) => String(k + 1)), `${name}: mode ${menu}'s numbers`);
      assert.deepEqual(paging.ends, record.pages.map(() => 18), `${name}: mode ${menu}'s numbers end at the slash`);
      assert.equal(paging.slashes, record.pages.length, `${name}: mode ${menu}'s slashes`);
      assert.equal(paging.turnKeys, 0, `${name}: mode ${menu} deadens a page turn key`);
    });
    assert.equal(headers.size, records.length, `${name}: two modes share a header`);
  }
  assert.equal(single, 598, 'one page modes, 30 on each safe mode image and 538 in the four user configs');
  assert.equal(several, 58, 'modes of more than one page, none of them on a safe mode image');
  // Most bind both to the null instruction; the rest run a list on one key or both, which is why
  // `paginate` refuses to cut a binding that does something.
  assert.equal(deadened, 531, 'one page modes binding both page turn keys to nothing');
  assert.deepEqual([bindings, nullBindings], [1196, 1086], 'one page modes\' page turn bindings, and the null ones');
  assert.equal(onlyNullLists, 15, 'of the other 67, those naming only lists of three null instructions');
  // Where the number is drawn: after a switch on 73 pages of screens of several pages and 7 of one,
  // and after a second switch on 7 of the 73.
  assert.deepEqual([switched, chained, switchedSingle], [73, 7, 7]);
  // A fixed x of 13 is wrong wherever the number is not one glyph of width 5.
  assert.equal(pages, 240);
  assert.equal(notAt13, 38, 'pages whose number does not start at 13');
});

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
     skipUnless('one_config_unprogrammed', 'h525_config'), () => {
  const c = parse(require_('one_config_unprogrammed'));
  // An entry past the end: the row draws and selects a keypad map that does not exist.
  const sets = handlerSets(c);
  assert.ok(sets !== undefined);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', sets.addresses.length),
                /past the \d+ that exist/);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', 0xff), /base slot 9 index/);
  assert.throws(() => composeActivityMenuRow(c, 'Play Game', -1), /base slot 9 index/);
  // A model whose activities sit on keys rather than on a menu, where nothing here applies.
  assert.throws(() => composeActivityMenuRow(parse(require_('h525_config')), 'Play Game', 0),
                /Harmony One, 600, 650 and 700 alone/);
  // And a page that is already full is not one of these. **This asserted a refusal** until section
  // 293, on the ground that a second page needs a counter, a pool copy and a page count nobody had
  // measured on this menu. All three are measured now, so the fourth row opens a second page and
  // lands on its top row; the test below asserts the page whole.
  let full = parse(require_('one_config_unprogrammed').slice());
  full = parse(composeActivityMenuRow(full, 'Two', 7).bytes);
  full = parse(composeActivityMenuRow(full, 'Three', 7).bytes);
  const fourth = composeActivityMenuRow(full, 'Four', 7);
  assert.equal(fourth.page, 1);
  assert.ok(onTopRow(parse(fourth.bytes), fourth.menu, fourth.page, fourth.scan), 'the fourth is on the top row');
});

/**
 * Whether `scan` on a menu page is the top row's rectangle, the one the first page's highest area
 * has. By geometry and not by number, because a code is an area's position in its hit page and a new
 * page keeps the order its menu's last page stores its areas in: a fresh Harmony One's stores the two
 * bottom keys first, so the new row is 50, and the spare's stores its top row first, so it is 48.
 */
function onTopRow(c: Container, menu: number, page: number, scan: number): boolean {
  const record = modeRecords(c)![menu]!;
  const areas = (k: number) => touchPageOf(c, record.pages[k]!)!.areas;
  const top = areas(0).reduce((best, area) => (area.y > best.y ? area : best));
  const area = areas(page).find((one) => one.code === scan);
  return area !== undefined && [area.x, area.y, area.width, area.height].join()
    === [top.x, top.y, top.width, top.height].join();
}

/** Compose `labels` as activities one after another, each put on the activity menu, as a user would. */
function composeActivities(start: Container, labels: readonly string[], iconLike?: string): {
  container: Container; menu: number; placed: { page: number; scan: number }[];
} {
  let c = start;
  let menu = -1;
  const placed: { page: number; scan: number }[] = [];
  for (const label of labels) {
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    const target = stateVariables(c)
      .find((one) => one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index)!;
    const built = composeActivity(c, { label, targets: [{ variable: target.index, value: 1 }], keys: [{ scan: 20, list: 0 }] });
    const shown = composeActivityMenuRow(parse(built.bytes), built.label, built.set,
                                         iconLike === undefined ? {} : { iconLike });
    c = parse(shown.bytes);
    menu = shown.menu;
    placed.push({ page: shown.page, scan: shown.scan });
  }
  return { container: c, menu, placed };
}

// The last column is what no screen draws any more: the menu's own old total, where it had one.
for (const [host, labels, pages, replaced] of [
  // A fresh Harmony One: one activity, so two fill the page and the third opens a second one, whose
  // header had no total to restate and whose first page drew no number.
  ['one_config_unprogrammed', ['Two', 'Three', 'Four'], 2, []],
  // The spare Harmony One as it stood with eight activities over three pages. The ninth fills the
  // third and the tenth opens a fourth, whose "4" the page total font does not carry and whose "3"
  // in the header other pages' numbers borrow by reference.
  ['one_spare_poweroff_base', ['Nine', 'Ten'], 4, ['23,18,3']],
] as const) {
  test(`${host}: an activity past a full activity menu opens a new page, and the menu pages`, skipUnless(host), () => {
    const before = parse(require_(host));
    const namesBefore = activityNames(before).map((one) => one.name);
    const { container: after, menu, placed } = composeActivities(before, labels);
    const record = modeRecords(after)![menu]!;
    assert.equal(record.pages.length, pages);
    assert.equal(placed.at(-1)!.page, pages - 1, 'the last one opens the new page');
    assert.ok(onTopRow(after, menu, pages - 1, placed.at(-1)!.scan), 'on its top row');

    // The paging the corpus states on all 58 of its multi page Harmony One screens.
    const paging = pagingOf(after, menu);
    assert.equal(paging.total, String(pages));
    assert.equal(paging.word, 'pages');
    assert.deepEqual(paging.numbers, record.pages.map((_, k) => String(k + 1)));
    assert.deepEqual(paging.ends, record.pages.map(() => 18), 'every number ends at the slash');
    assert.equal(paging.slashes, pages);
    assert.equal(paging.turnKeys, 0, 'the page turn keys are live, or the new page cannot be reached');

    // Every activity still reads, the new ones included, and the file holds together.
    assert.deepEqual(activityNames(after).map((one) => one.name).sort(), [...namesBefore, ...labels].sort());
    const report = coverage(after);
    assert.equal(report.accounted, report.total, 'every byte is claimed');
    assert.deepEqual(report.overlaps, [], 'and no byte twice');
    assert.ok(trailerAgrees(after));
    assert.equal(roundTrip(after).equal, true, 'the emitter reproduces the composed file');

    // And the new page draws: every glyph and picture. An activity menu page's bottom keys have one
    // state, so one variant.
    const variants = renderVariants(after, record.pages.at(-1)!.program).variants;
    assert.equal(variants.length, 1);
    for (const variant of variants) {
      assert.equal(variant.page.glyphsMissing, 0);
      assert.equal(variant.page.picturesMissing, 0);
    }

    // Nothing any screen drew before reads differently now, except this menu's own total. That is
    // the check on the draws borrowing the old total's glyphs, fourteen of them on the spare, which
    // `paginate` points elsewhere before cutting it.
    const drawn = (c: Container) => {
      const counts = new Map<string, number>();
      for (const one of screenStrings(c)) {
        const key = `${one.x},${one.y},${one.text}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    };
    const now = drawn(after);
    const lost = [...drawn(before)].filter(([key, n]) => (now.get(key) ?? 0) < n).map(([key]) => key);
    assert.deepEqual(lost, [...replaced], 'a text some screen drew is gone');
  });
}

test('an activity that opens a new page can wear an existing row\'s icon', skipUnless('one_spare_poweroff_base'), () => {
  // Found writing the four page menu to the spare Harmony One: the icon was looked up after the new
  // page's record was counted and before its pointer was real, when `activityNames` no longer reads
  // the menu, so asking for "LG kijken"'s icon refused a row that exists. Section 293.
  const { container: after, menu } = composeActivities(parse(require_('one_spare_poweroff_base')),
                                                       ['Nine', 'Ten'], 'LG kijken');
  const record = modeRecords(after)![menu]!;
  const images = (program: number) => (screenProgram(after, program) ?? [])
    .filter((one) => one.opcode === 2)
    .map((one) => ({ x: one.operands[0]!, y: one.operands[1]!, picture: one.operands[2]! | (one.operands[3]! << 8) | (one.operands[4]! << 16) }));
  // The new page's icon is its second picture, after the row background.
  const icon = images(record.pages.at(-1)!.program)[1]!;
  const lg = activityNames(after).find((one) => one.name === 'LG kijken')!;
  const rank = (lg.at!.y - 57) / 54;
  const lgPage = modePages(after)[lg.page]!;
  const lgIcon = images(lgPage.program).find((one) => one.x === icon.x && one.y === icon.y + 54 * rank);
  assert.ok(lgIcon !== undefined, 'LG kijken\'s row draws no icon where the new one does');
  assert.equal(icon.picture, lgIcon.picture, 'the new row does not wear LG kijken\'s icon');
});

/** The four arch 14 user configurations, one each; the second Harmony 700 one repeats the first. */
const FOUR_SLOT_ACTIVITY_HOSTS = ['h650_config_region', 'h600_config', 'calibration_h600', 'h700_config'] as const;

/** The glyph codes a text instruction draws, inline or through the string it names. */
function drawnCodes(c: ReturnType<typeof parse>, one: { opcode: number; operands: Uint8Array; glyphs?: Uint8Array }): number[] {
  if (one.glyphs !== undefined) return [...one.glyphs];
  const at = c.blobOffsetOf((one.operands[4]! << 16) | (one.operands[3]! << 8) | one.operands[2]!)!;
  const codes: number[] = [];
  for (let k = at; c.blob[k] !== 0; k += 1) codes.push(c.blob[k]!);
  return codes;
}

test('an arch 14 activity menu puts an activity on both buttons of a row and draws a full page picture of its own',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  // Section 289, what `composeFourSlotActivityRow` rests on, over every activity menu page of the four
  // Harmony 600, 650 and 700 configurations.
  let activities = 0;
  let onOneRow = 0;
  let rowLists = 0;
  let beepless = 0;
  let labels = 0;
  let centred = 0;
  const labelYs = new Set<number>();
  let singlePages = 0;
  let singleOnActivityScreens = 0;
  let deviceSinglePages = 0;
  let deviceSingleSharing = 0;
  const allRowLists = new Set<string>();
  let menusWithFull = 0;
  let onePicture = 0;
  let fullPictureOwn = 0;
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists()!;
    const pages = modePages(c);
    const copies = pageListCopies(c);
    const bindings = activityBindings(c);
    const record = modeRecords(c)!.find((one) =>
      one.pages.some((page) => page.address === pages[bindings[0]!.page]!.address))!;
    // An activity's own screens are told by their title, which is the activity's menu label: the
    // working screens are reached through base slot 14 and a deferred call, so the chain walk
    // `activityNames` makes does not find them all.
    const drawn = screenStrings(c, characterMap(c));
    const menuLabels = new Set(drawn.filter((one) => record.pages.some((page) => page.program === one.program)
      && (one.y === 35 || one.y === 79)).map((one) => one.text));
    const deviceModes = new Set(deviceListRows(c).map((row) => row.mode));
    const listModes = new Set(deviceListRows(c).map((row) =>
      modeRecords(c)!.findIndex((one) => one.pages.some((page) => page.address === pages[row.page]?.address))));

    // Every activity on both buttons of one row, top or bottom.
    const scans = new Map<number, number[]>();
    for (const one of bindings) scans.set(one.activity, [...(scans.get(one.activity) ?? []), one.scan]);
    activities += scans.size;
    for (const each of scans.values()) {
      const row = [...each].sort((a, b) => a - b).join(',');
      if (row === '2,8' || row === '9,34') onOneRow += 1;
    }

    const fullPictures = new Set<number>();
    for (const page of record.pages) {
      // Every row list, the page's and its copy's: select the entry, write 0 into the variable the
      // device rows write 1 into, no beep.
      const marker = deviceModeMarker(c)!.opcode;
      const index = pages.findIndex((one) => one.address === page.address);
      for (const list of [page.list, copies[index]! + c.flashBase]) {
        for (const entry of taggedList(c, list)!.entries) {
          rowLists += 1;
          allRowLists.add(`${name}:${entry.operand}`);
          const run = lists[entry.operand]!;
          if (run.length === 2 && run[0]!.opcode === 0x1f && run[0]!.operand >> 8 === 0xff
              && run[1]!.opcode === marker && run[1]!.operand === 0) beepless += 1;
        }
      }
      // The labels: centred, at y 35 or 79, drawn before the closing bar.
      const program = screenProgram(c, page.program)!;
      const bar = program.findLastIndex((one) => one.opcode === 0x03);
      let font = -1;
      let labelsOnPage = 0;
      program.forEach((one, k) => {
        if (one.opcode === 0x10) font = one.operands[0]!;
        if ((one.opcode !== 0x04 && one.opcode !== 0x05) || k >= bar || one.operands[1]! < 20) return;
        labels += 1;
        labelYs.add(one.operands[1]!);
        // The top row's activity is labelled at 35 and the bottom row's at 79.
        const tops = taggedList(c, page.list)!.entries.filter((entry) => (entry.tag & 0x3f) === 8);
        const bottoms = taggedList(c, page.list)!.entries.filter((entry) => (entry.tag & 0x3f) === 9);
        assert.equal(one.operands[1], labelsOnPage === 0 ? 35 : 79, `${name}: row ${labelsOnPage}'s label`);
        assert.equal(tops.length, 1);
        assert.ok(labelsOnPage === 0 || bottoms.length === 1);
        labelsOnPage += 1;
        const width = drawnCodes(c, one).reduce((sum, code) =>
          sum + (glyphOf(c, fontSets(c)![font]!, code)?.width ?? 0), 0);
        if (one.operands[0] === Math.floor((128 - width) / 2)) centred += 1;
      });
      // The picture: a page of one activity draws what a one item corner page draws; a full page
      // draws one of the menu's own.
      const picture = bitmapReference(program[0]!)!;
      const held = taggedList(c, page.list)!.entries.length;
      if (held === 2) {
        singlePages += 1;
        // Every other page drawing this picture is one of an activity's own screens.
        const sharing = modeRecords(c)!.flatMap((other) => (other === record ? [] : other.pages
          .filter((one) => {
            const first = screenProgram(c, one.program)?.[0];
            return first?.opcode === 0x02 && bitmapReference(first) === picture;
          })));
        if (sharing.length > 0 && sharing.every((one) => drawn.some((text) =>
          text.program === one.program && menuLabels.has(text.text)))) singleOnActivityScreens += 1;
        // And no one item device list or device mode page draws it.
        modeRecords(c)!.forEach((other, mode) => {
          if (!deviceModes.has(mode) && !listModes.has(mode)) return;
          for (const one of other.pages) {
            const corners = (taggedList(c, one.list)?.entries ?? [])
              .filter((entry) => [8, 2, 9, 34].includes(entry.tag & 0x3f));
            if (corners.length !== 1 || (corners[0]!.tag & 0x3f) !== 8) continue;
            deviceSinglePages += 1;
            const first = screenProgram(c, one.program)![0]!;
            if (first.opcode === 0x02 && bitmapReference(first) === picture) deviceSingleSharing += 1;
          }
        });
      }
      if (held === 4) fullPictures.add(picture);
    }
    if (fullPictures.size > 0) menusWithFull += 1;
    if (fullPictures.size === 1) onePicture += 1;
    const outside = pages.filter((other) => !record.pages.some((page) => page.address === other.address))
      .map((other) => screenProgram(c, other.program)?.[0])
      .flatMap((first) => (first?.opcode === 0x02 ? [bitmapReference(first)] : []));
    if ([...fullPictures].every((picture) => !outside.includes(picture))) fullPictureOwn += 1;
  }
  assert.equal(activities, 13);
  assert.equal(onOneRow, 13, 'every activity on both buttons of one row');
  assert.equal(rowLists, 52);
  assert.equal(beepless, 52, 'every row list selects its entry and clears the device mode marker, with no beep');
  assert.equal(allRowLists.size, 52, 'and each binding runs a list of its own');
  assert.equal(labels, 13);
  assert.equal(centred, 13, 'every label centred');
  assert.deepEqual([...labelYs].sort((a, b) => a - b), [35, 79]);
  assert.equal(singlePages, 3);
  assert.equal(singleOnActivityScreens, 3, "a page of one activity draws a picture the activities' own screens draw");
  assert.equal(deviceSinglePages, 6, "on the three configurations with a page of one activity");
  assert.equal(deviceSingleSharing, 0, 'and no one item device page does');
  assert.equal(menusWithFull, 4);
  assert.equal(onePicture, 4, 'a menu\'s full pages draw one picture');
  assert.equal(fullPictureOwn, 4, 'which no page outside the menu draws');
});

test('every arch 14 activity opens with its own start up screen and brackets its start with the delay step\'s variable',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  // Section 289, and the reason todo 1.4.4's composed activity has to write the variable: every command's
  // inter device delay step runs under a condition on it, section 287.
  const variables: number[] = [];
  let activities = 0;
  let bracketed = 0;
  let startingScreen = 0;
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists()!;
    const sets = handlerSets(c)!;
    const starts = new Set(sendPreludes(c).map((one) => one.conditionOperand & 0xff));
    assert.equal(starts.size, 1, `${name}: one start variable`);
    const start = [...starts][0]!;
    variables.push(start);
    const strings = screenStrings(c, characterMap(c));
    for (const set of new Set(activityBindings(c).map((one) => one.set))) {
      activities += 1;
      const enter = taggedList(c, sets.addresses[set]!)!.entries.find((one) => one.tag === 1)!;
      const list = lists[enter.operand]!;
      if (list[1]?.opcode === 0x80 + start && list[1]?.operand === 1
          && list.at(-1)?.opcode === 0x80 + start && list.at(-1)?.operand === 0) bracketed += 1;
      const first = list[0]!;
      if (first.opcode === 0x7e && modeRecords(c)![first.operand]!.pages.some((page) =>
        strings.some((one) => one.program === page.program && one.text.startsWith('Starting')))) startingScreen += 1;
    }
  }
  assert.deepEqual(variables, [52, 46, 47, 59]);
  assert.equal(activities, 13);
  assert.equal(startingScreen, 13, 'every enter list opens by entering a "Starting" screen');
  assert.equal(bracketed, 13, 'then writes 1 into the variable, and ends writing 0 into it');
});

test('an activity row composed on a Harmony 650, 600 and 700 takes the bottom row and the full page picture',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  let composed = 0;
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const pristine = parse(require_(name));
    const counter = stateVariables(pristine).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    const target = stateVariables(pristine).find((one) =>
      one.index > firmwareStateVariableMax(pristine.architecture) && one.index !== counter?.index
      && (one.record?.second ?? 0) >= 1)!;
    const built = composeActivity(pristine, { label: 'LG kijken', targets: [{ variable: target.index, value: 1 }] });
    const before = parse(built.bytes);
    if (name === 'calibration_h600') {
      // Its one page holds two activities, and a new page is not composed.
      assert.throws(() => composeActivityMenuRow(before, built.label, built.set), /last page is full/);
      continue;
    }
    composed += 1;
    assert.throws(() => composeActivityMenuRow(before, built.label, built.set, { iconLike: 'TV' }),
                  /draws no icon/);
    const shown = composeActivityMenuRow(before, built.label, built.set);
    const after = parse(shown.bytes);
    const report = coverage(after);
    assert.equal(report.accounted, report.total, `${name}: every byte is claimed`);
    assert.deepEqual(report.overlaps, [], `${name}: and no byte twice`);
    assert.ok(trailerAgrees(after), name);
    assert.equal(roundTrip(after).equal, true, `${name}: the emitter reproduces the composed file`);

    // Four row lists, the page's two and the copy's two, each select the entry and clear the marker
    // the configuration's own rows clear.
    const lists = after.actionLists()!;
    assert.deepEqual(shown.scans, [9, 34]);
    assert.equal(shown.rowLists, 4);
    const record = modeRecords(after)![shown.menu]!;
    const page = record.pages.at(-1)!;
    assert.equal(shown.page, record.pages.length - 1);
    const theirs = lists[taggedList(after, page.list)!.entries.find((one) => (one.tag & 0x3f) === 8)!.operand]!;
    for (let k = 0; k < 4; k += 1) {
      assert.deepEqual(lists[shown.rowList + k]!.map((one) => [one.opcode, one.operand]),
                       [[0x1f, 0xff00 | built.set], [theirs[1]!.opcode, 0]]);
    }
    // The page and its copy, in the stored order, the new row on the bottom buttons.
    const index = modePages(after).findIndex((one) => one.address === page.address);
    for (const list of [page.list, pageListCopies(after)[index]! + after.flashBase]) {
      const entries = taggedList(after, list)!.entries;
      assert.deepEqual(entries.map((one) => one.tag & 0x3f), [9, 8, 34, 2], `${name}: stored order`);
      assert.deepEqual(entries.filter((one) => (one.tag & 0x3f) === 9 || (one.tag & 0x3f) === 34)
        .map((one) => lists[one.operand]![0]!.operand), [0xff00 | built.set, 0xff00 | built.set]);
    }
    // The reader: two more bindings, both the new activity's, on the new row, and it is an activity.
    const added = activityBindings(after).filter((one) => one.set === built.set);
    assert.deepEqual(added.map((one) => one.scan).sort((a, b) => a - b), [9, 34]);
    assert.equal(activityBindings(after).length, activityBindings(before).length + 2);
    assert.equal(handlerSetRoles(after)[built.set], 'activity');
    // The label, centred at y 79, and the picture the menu's full pages draw.
    const drawn = screenStrings(after, characterMap(after)).find((one) =>
      one.program === page.program && one.text === 'LG kijken')!;
    assert.equal(drawn.y, 79);
    const label = screenProgram(after, page.program)!.find((one) => one.opcode === 0x05 && one.operands[1] === 79)!;
    const width = drawnCodes(after, label).reduce((sum, code) =>
      sum + (glyphOf(after, fontSets(after)![drawn.font]!, code)?.width ?? 0), 0);
    assert.equal(drawn.x, Math.floor((128 - width) / 2));
    const full = record.pages.find((one) => taggedList(after, one.list)!.entries.length === 4 && one !== page)!;
    assert.equal(bitmapReference(screenProgram(after, page.program)![0]!),
                 bitmapReference(screenProgram(after, full.program)![0]!));
    for (const variant of renderVariants(after, page.program).variants) {
      assert.equal(variant.page.glyphsMissing, 0);
      assert.equal(variant.page.picturesMissing, 0);
    }
    // One font select before the labels and none between them, as on every compiled full page, where
    // the page's own font spells the name. The Harmony 700's last page draws its label in a smaller
    // font that has no L, G, k or j, so there the new label needs a font of its own; a name that font
    // spells takes it and adds no select.
    const selectsBetween = (bytes: Uint8Array): number => {
      const grown = parse(bytes);
      const last = modeRecords(grown)![shown.menu]!.pages.at(-1)!;
      const program = screenProgram(grown, last.program)!;
      const from = program.findIndex((one) => (one.opcode === 0x04 || one.opcode === 0x05) && one.operands[1] === 35);
      return program.slice(from, program.findLastIndex((one) => one.opcode === 0x03))
        .filter((one) => one.opcode === 0x10).length;
    };
    assert.equal(selectsBetween(shown.bytes), name === 'h700_config' ? 1 : 0, `${name}: the label font`);
    if (name === 'h700_config') {
      assert.equal(selectsBetween(composeActivityMenuRow(before, 'Play Audio', built.set).bytes), 0,
                   'a name the page font spells shares it');
    }
  }
  assert.equal(composed, 3);
});

/** The screen an activity's deferred list ends on: directly, or through the Remote Assistant's branch. */
function deferredScreens(c: ReturnType<typeof parse>, deferred: readonly { opcode: number; operand: number }[]):
    { working: number | undefined; assistant: number | undefined } {
  const lists = c.actionLists()!;
  if (deferred[1]?.opcode === 0x7e) return { working: deferred[1].operand, assistant: undefined };
  const branch = lists[deferred[1]?.operand ?? -1] ?? [];
  const inner = lists[branch.find((one) => one.opcode === 0x7f)?.operand ?? -1] ?? [];
  const entered = inner.filter((one) => one.opcode === 0x7e).map((one) => one.operand);
  return { working: entered.at(-1), assistant: entered.length === 2 ? entered[0] : undefined };
}

test('every arch 14 activity defers its own working screen, and four records keyed by the activity say where its keys go',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  // Section 290. What the composer copies, measured on every activity of the four configurations
  // rather than on the one it takes a template from.
  const flags: number[] = [];
  let activities = 0;
  let direct = 0;
  let throughAssistant = 0;
  let workingAgrees = 0;
  let selectsOwn = 0;
  let workingEntries = 0;
  let emptyLists = 0;
  let emptyTwoBytes = 0;
  let deviceLists = 0;
  let listWords = 0;
  let centreReachesWorking = 0;
  let everyDevice = 0;
  let keyedByLocation = 0;
  let allLists = 0;
  let allListsReach = 0;
  const devicesRecords: number[] = [];
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists()!;
    const sets = handlerSets(c)!;
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))!;
    const idle = counter.record!.first;
    const strings = screenStrings(c, characterMap(c));
    const records = modeRecords(c)!;
    const drawsText = (mode: number, text: string): boolean => records[mode]!.pages.some((page) =>
      strings.some((one) => one.program === page.program && one.text === text));
    const flagsHere = new Set<number>();
    const deferredTo = new Map<number, number>();
    const setOf = new Map<number, number>();
    for (const binding of activityBindings(c)) {
      if (setOf.has(binding.activity)) continue;
      setOf.set(binding.activity, binding.set);
      activities += 1;
      const enter = lists[taggedList(c, sets.addresses[binding.set]!)!.entries.find((one) => one.tag === 1)!.operand]!;
      assert.deepEqual([enter.at(-4)!.opcode, enter.at(-4)!.operand], [0x80 + counter.index, binding.activity]);
      assert.equal(enter.at(-3)!.operand, 1, `${name}: the flag is written 1`);
      flagsHere.add(enter.at(-3)!.opcode - 0x80);
      const deferred = lists[enter.at(-2)!.operand]!;
      assert.deepEqual(deferred[0], { opcode: 0x3f, operand: 0xd000 });
      const reached = deferredScreens(c, deferred);
      if (reached.assistant === undefined) direct += 1;
      else if (drawsText(reached.assistant, 'Remote Assistant')) throughAssistant += 1;
      deferredTo.set(binding.activity, reached.working!);
    }
    assert.equal(flagsHere.size, 1, `${name}: one flag variable`);
    flags.push([...flagsHere][0]!);

    // The records keyed by the activity, by their keys and what their cases queue.
    const activityValues = [...setOf.keys()].sort((a, b) => a - b);
    const everything = [...activityValues, idle].sort((a, b) => a - b);
    const keysAre = (keys: number[], want: number[]): boolean =>
      JSON.stringify([...keys].sort((a, b) => a - b)) === JSON.stringify(want);
    const working: number[] = [];
    const devicesHere: number[] = [];
    const select: number[] = [];
    valueMaps(c)!.forEach((map, index) => {
      const queued = new Map(map.entries.map(([key, target]) => [key, caseQueued(c, target)]));
      const keys = map.entries.map(([key]) => key);
      const enters = (key: number): boolean => queued.get(key)?.opcode === 0x7e;
      if (keysAre(keys, everything) && activityValues.every(enters)) {
        (enters(idle) ? devicesHere : working).push(index);
      } else if (keysAre(keys, activityValues) && activityValues.every((key) => queued.get(key)?.opcode === 0x1f)) {
        select.push(index);
        for (const key of activityValues) {
          if (queued.get(key)!.operand === (0xff00 | setOf.get(key)!)) selectsOwn += 1;
        }
      }
    });
    assert.equal(working.length, 1, `${name}: one working screen record`);
    assert.equal(select.length, 1, `${name}: one keypad map record`);
    devicesRecords.push(devicesHere.length);
    const [first, second] = devicesHere.map((index) => valueMaps(c)![index]!.entries
      .map(([key, target]) => [key, caseQueued(c, target)]));
    assert.deepEqual(first, second, `${name}: the two Devices key records have the same cases`);
    for (const [key, target] of valueMaps(c)![working[0]!]!.entries) {
      if (key !== idle && caseQueued(c, target)!.operand === deferredTo.get(key)) workingAgrees += 1;
    }
    // The device lists those records enter: a list of its own per activity, saying "Activity" above
    // the centre key, and the idle one saying "Activities", and that key reaches the working screen
    // record through one case of a record keyed by another variable.
    for (const [key, target] of valueMaps(c)![devicesHere[0]!]!.entries) {
      const list = records[caseQueued(c, target)!.operand]!;
      const word = strings.find((one) => list.pages[0]!.program === one.program && one.y >= 110)?.text;
      if (word === (key === idle ? 'Activities' : 'Activity')) listWords += 1;
      const rows = list.pages.reduce((sum, page) => sum + new Set(taggedList(c, page.list)!.entries
        .map((one) => JSON.stringify(lists[one.operand]))).size, 0);
      if (rows === new Set(deviceListRows(c).map((one) => one.mode)).size) everyDevice += 1;
      const centre = list.entries.find((one) => one.tag === 0x99)!;
      const via = valueMaps(c)![centre.operand >> 8]!.entries.map(([, one]) => caseQueued(c, one));
      const location = stateVariables(c).find((one) => one.index === (centre.operand & 0xff))?.label ?? '';
      if (location.startsWith('CurrentLocation') && via.length === 1
          && valueMaps(c)![centre.operand >> 8]!.entries[0]![0] === 0) keyedByLocation += 1;
      if (centre.opcode === 0x72 && (centre.operand & 0xff) !== counter.index
          && via.some((one) => one?.opcode === 0x72 && one.operand === ((working[0]! << 8) | counter.index))) {
        centreReachesWorking += 1;
      }
      deviceLists += 1;
    }
    // Every working screen's own record: the Devices key through one of those records, then one more.
    for (const mode of new Set(deferredTo.values())) {
      const entries = records[mode]!.entries.map((one) => [one.tag, one.opcode, one.operand]);
      assert.equal(entries.length, 2);
      assert.deepEqual(entries[0], [0x99, 0x72, (devicesHere[0]! << 8) | counter.index]);
      assert.equal(entries[1]![1], 0x73);
      workingEntries += 1;
    }
    // Every device list, including one per configuration those records never enter.
    for (const record of records) {
      if (!record.pages.some((page) => strings.some((one) => one.program === page.program && one.y >= 110
          && (one.text === 'Activity' || one.text === 'Activities')))) continue;
      allLists += 1;
      const centre = record.entries.find((one) => one.tag === 0x99);
      if (centre?.opcode === 0x72 && valueMaps(c)![centre.operand >> 8]!.entries.some(([, one]) =>
        caseQueued(c, one)?.operand === ((working[0]! << 8) | counter.index))) allListsReach += 1;
    }
    // An empty page list is the wide form's zero and a count of zero.
    for (const record of records) {
      for (const page of record.pages) {
        if (taggedList(c, page.list)!.entries.length !== 0) continue;
        emptyLists += 1;
        const at = c.blobOffsetOf(page.list)!;
        if (c.blob[at] === 0 && c.blob[at + 1] === 0) emptyTwoBytes += 1;
      }
    }
  }
  assert.equal(activities, 13);
  assert.deepEqual(flags, [39, 34, 39, 44]);
  assert.equal(direct, 3, "h600_config's three reach the working screen directly");
  assert.equal(throughAssistant, 10, 'the other ten through a Remote Assistant screen first');
  assert.equal(workingAgrees, 13, 'the working screen record names the screen the start sequence ends on');
  assert.equal(selectsOwn, 13, "the keypad map record selects each activity's own entry");
  assert.deepEqual(devicesRecords, [2, 2, 2, 2]);
  assert.equal(deviceLists, 17, 'thirteen activities and four idle values');
  assert.equal(listWords, 17, '"Activity" on an activity\'s own device list, "Activities" on the idle one');
  assert.equal(centreReachesWorking, 17, 'the centre key under every one reaches the working screen record');
  assert.equal(everyDevice, 17, 'and every one lists every device');
  assert.equal(keyedByLocation, 17, 'through one case, for 0, of a record keyed by CurrentLocation');
  assert.equal(allLists, 21, 'one more device list per configuration, which those records do not enter');
  assert.equal(allListsReach, 21, 'and its centre key reaches the working screen record too');
  assert.equal(workingEntries, 13);
  assert.equal(emptyLists, 258);
  assert.equal(emptyTwoBytes, 258);
});

test('every arch 14 start up screen is one page binding nothing, and every working screen page is a device page with "Devices" at the bottom',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  // Section 290, the two screens a composed activity copies, over all 13 activities.
  const count = { startups: 0, bindNothing: 0, shape: 0, oneLine: 0, centred: 0, fixedSame: 0, pages: 0,
    prefix: 0, devices: 0, titleFont: 0, labelled: 0, labelFont: 0, splitBackgrounds: 0 };
  let widest = 0;
  const queuedOperands: number[][] = [];
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const lists = c.actionLists()!;
    const sets = handlerSets(c)!;
    const records = modeRecords(c)!;
    const strings = screenStrings(c, characterMap(c));
    const fonts = fontSets(c)!;
    const fixedLines = new Set<string>();
    const workingModes = new Set<number>();
    for (const set of new Set(activityBindings(c).map((one) => one.set))) {
      const enter = lists[taggedList(c, sets.addresses[set]!)!.entries.find((one) => one.tag === 1)!.operand]!;
      workingModes.add(deferredScreens(c, lists[enter.at(-2)!.operand]!).working!);
      const startup = records[enter[0]!.operand]!;
      count.startups += 1;
      if (startup.pages.length === 1 && taggedList(c, startup.pages[0]!.list)!.entries.length === 0
          && startup.entries.length === 54 && startup.entries.every((one) => one.opcode === 0 && one.operand === 0)) {
        count.bindNothing += 1;
      }
      const program = screenProgram(c, startup.pages[0]!.program)!;
      const texts = program.filter((one) => one.opcode === 0x04 || one.opcode === 0x05);
      const above = texts.filter((one) => one.operands[1]! < 82);
      if (program[0]!.opcode === 0x02 && program[1]!.opcode === 0x10 && program[1]!.operands[0] === 2
          && program.at(-1)!.opcode === 0 && program.length === 3 + texts.length && texts.length - above.length === 3) {
        count.shape += 1;
      }
      if (above.length === 1) {
        count.oneLine += 1;
        const width = drawnCodes(c, above[0]!).reduce((sum, code) => sum + (glyphOf(c, fonts[2]!, code)?.width ?? 0), 0);
        widest = Math.max(widest, width);
        if (above[0]!.operands[0] === Math.floor((128 - width) / 2) && above[0]!.operands[1] === 5) count.centred += 1;
      }
      fixedLines.add(strings.filter((one) => one.program === startup.pages[0]!.program && one.y >= 82)
        .map((one) => `${one.text}@${one.x},${one.y}`).join('|'));
    }
    if (fixedLines.size === 1) count.fixedSame += 1;

    // The working screens' pages, against the device mode pages' fonts.
    const device = screenProgram(c, records[deviceListRows(c)[0]!.mode]!.pages[0]!.program)!;
    const prefixes = new Set<string>();
    const byItems = [new Set<number>(), new Set<number>()];
    for (const mode of workingModes) {
      for (const page of records[mode]!.pages) {
        count.pages += 1;
        const program = screenProgram(c, page.program)!;
        prefixes.add(program.slice(1, 3).map((one) => [...c.blob.slice(one.start, one.start + one.length)].join()).join(';'));
        const last = strings.filter((one) => one.program === page.program).at(-1)!;
        if (last.text === 'Devices' && last.x === 40 && last.y === 114) count.devices += 1;
        if (program[3]!.opcode === 0x10 && program[3]!.operands[0] === device[3]!.operands[0]) count.titleFont += 1;
        const items = taggedList(c, page.list)!.entries.length;
        if (items > 0) {
          count.labelled += 1;
          const selects = program.slice(5, -4).filter((one) => one.opcode === 0x10);
          if (selects.at(-1)!.operands[0] === device[9]!.operands[0]) count.labelFont += 1;
        }
        byItems[items > 1 ? 1 : 0]!.add(bitmapReference(program[0]!)!);
      }
    }
    count.prefix += prefixes.size;
    queuedOperands.push([...prefixes].map((one) => Number(one.split(';')[0]!.split(',')[1])));
    if (byItems.every((one) => one.size <= 1) && ![...byItems[0]!].some((one) => byItems[1]!.has(one))) {
      count.splitBackgrounds += 1;
    }
  }
  assert.deepEqual(count, {
    startups: 13, bindNothing: 13, shape: 13, oneLine: 11, centred: 11, fixedSame: 4, pages: 27,
    prefix: 4, devices: 27, titleFont: 27, labelled: 25, labelFont: 25, splitBackgrounds: 4,
  });
  assert.equal(widest, 123, 'the widest start up title on one line');
  // The queued 0x73 a working page opens with: 1 as on a device page on the 600s, 2 on the 650 and 700.
  assert.deepEqual(queuedOperands, [[2], [1], [1], [2]]);
});

test('an activity composed on a Harmony 650, 600 and 700 opens on a start up screen of its own and ends on a working screen of its own',
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  let composed = 0;
  let listedCount = 0;
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const deviceMode = modeRecords(c)![deviceListRows(c)[0]!.mode]!;
    const commands = deviceMode.pages.flatMap((page) => taggedList(c, page.list)!.entries.map((one) => one.operand));
    const rows = ['Power', 'Menu', 'Home', 'Info', 'Guide'].map((label, k) => ({ label, list: commands[k]! }));
    const activity = nextActivityValue(c);
    if (name === 'calibration_h600') {
      // No working screen there holds one command or none, so the second page has no background.
      assert.throws(() => composeActivityScreen(c, activity, 'Play Audio', rows), /no background to copy/);
    }
    const onPages = name === 'calibration_h600' ? rows.slice(0, 4) : rows;
    const screen = composeActivityScreen(c, activity, 'Play Audio', onPages);
    const middle = parse(screen.bytes);
    const counter = stateVariables(middle).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))!;
    // A device's power variable, the last one named, so the device it switches on is not the idle
    // list's first and the activity's own list has something to reorder.
    const target = deviceVariables(middle).filter((one) => one.property === 'Power').at(-1)!;
    const built = composeActivity(middle, {
      label: 'Play Audio', targets: [{ variable: target.index, value: 1 }],
      screen: {
        startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
        startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
      },
    });
    // The screen alone points the key under Devices at the idle list, and the device list step then
    // gives the activity its own, section 294.
    const unlisted = parse(built.bytes);
    const unlistedMaps = valueMaps(unlisted)!;
    for (const map of screen.maps!.slice(1, -1)) {
      const queued = (key: number) => caseQueued(unlisted, unlistedMaps[map]!.entries.find(([one]) => one === key)![1]);
      assert.deepEqual(queued(built.activity), queued(counter.record!.first), `${name}: record ${map} opens the idle list`);
    }
    if (name === 'calibration_h600') {
      // No menu row is composed there, and an activity is found through the row that starts it.
      assert.throws(() => composeActivityDeviceList(unlisted, built.activity), /not an activity with a start up screen and a menu row/);
    }
    const rowed = name === 'calibration_h600' ? unlisted
      : parse(composeActivityMenuRow(unlisted, built.label, built.set).bytes);
    const listed = name === 'calibration_h600' ? undefined : composeActivityDeviceList(rowed, built.activity);
    const after = listed === undefined ? rowed : parse(listed.bytes);
    const report = coverage(after);
    assert.equal(report.accounted, report.total, `${name}: every byte is claimed`);
    assert.deepEqual(report.overlaps, [], `${name}: and no byte twice`);
    assert.ok(trailerAgrees(after), name);
    assert.equal(roundTrip(after).equal, true, `${name}: the emitter reproduces the composed file`);
    assertStateTableConsistent(after);

    // The start sequence, every activity's shape, and the deferred list the one h600_config's take.
    const lists = after.actionLists()!;
    const enter = lists[built.enterList]!.map((one) => [one.opcode, one.operand]);
    assert.deepEqual(enter[0], [0x7e, screen.startupMode]);
    assert.deepEqual(enter[1], [0x80 + screen.startVariable!, 1]);
    assert.deepEqual(enter.slice(-4), [[0x80 + counter.index, built.activity], [0x80 + screen.flagVariable!, 1],
      [0x7f, built.enterList + 2], [0x80 + screen.startVariable!, 0]]);
    assert.deepEqual(lists[built.enterList + 2], [{ opcode: 0x3f, operand: 0xd000 }, { opcode: 0x7e, operand: screen.mode }]);

    // The start up screen: the template's record, one page binding nothing, and its own title.
    const strings = screenStrings(after, characterMap(after));
    const records = modeRecords(after)!;
    const startup = records[screen.startupMode]!;
    assert.equal(startup.entries.length, 54);
    assert.ok(startup.entries.every((one) => one.opcode === 0 && one.operand === 0));
    assert.equal(startup.pages.length, 1);
    const listAt = after.blobOffsetOf(startup.pages[0]!.list)!;
    assert.deepEqual([...after.blob.slice(listAt, listAt + 2)], [0, 0]);
    const drawn = strings.filter((one) => one.program === startup.pages[0]!.program);
    assert.deepEqual(drawn.map((one) => one.text),
                     ['Starting Play Audio', 'Please keep the', 'remote pointed at', 'your system']);
    const title = screenProgram(after, startup.pages[0]!.program)!.find((one) => one.opcode === 0x05)!;
    const width = drawnCodes(after, title).reduce((sum, code) =>
      sum + (glyphOf(after, fontSets(after)![drawn[0]!.font]!, code)?.width ?? 0), 0);
    assert.deepEqual([drawn[0]!.x, drawn[0]!.y], [Math.floor((128 - width) / 2), 5]);

    // The working screen: four commands to a page, the title, the page counter, "Devices".
    const working = records[screen.mode]!;
    assert.equal(working.pages.length, onPages.length > 4 ? 2 : 1);
    assert.equal(working.entries.length, 2);
    assert.equal(working.entries[0]!.opcode, 0x72);
    working.pages.forEach((page, p) => {
      const onPage = onPages.slice(4 * p, 4 * p + 4);
      assert.deepEqual(taggedList(after, page.list)!.entries.map((one) => one.operand).sort((a, b) => a - b),
                       onPage.map((row) => row.list).sort((a, b) => a - b));
      const texts = strings.filter((one) => one.program === page.program).map((one) => one.text);
      assert.equal(texts[0], 'Play Audio');
      assert.equal(texts.at(-1), 'Devices');
      for (const row of onPage) assert.ok(texts.includes(row.label), `${name}: ${row.label} is drawn`);
      for (const variant of renderVariants(after, page.program).variants) {
        assert.equal(variant.page.glyphsMissing, 0);
        assert.equal(variant.page.picturesMissing, 0);
      }
    });

    // The four records keyed by the activity each gained one case for it, and say what the others do.
    const maps = valueMaps(after)!;
    const caseFor = (map: number) => caseQueued(after, maps[map]!.entries.find(([key]) => key === built.activity)![1]);
    const idleFor = (map: number) => caseQueued(after, maps[map]!.entries.find(([key]) => key === counter.record!.first)![1]);
    const [workingMap, firstDevices, secondDevices, selectMap] = screen.maps!;
    assert.deepEqual(caseFor(workingMap!), { opcode: 0x7e, operand: screen.mode });
    assert.deepEqual(caseFor(selectMap!), { opcode: 0x1f, operand: 0xff00 | built.set });
    assert.equal(working.entries[0]!.operand, (firstDevices! << 8) | counter.index);
    composed += 1;
    if (listed === undefined) continue;
    assert.deepEqual(listed.maps, [firstDevices, secondDevices]);
    assert.deepEqual(caseFor(firstDevices!), { opcode: 0x7e, operand: listed.mode });
    assert.deepEqual(caseFor(secondDevices!), { opcode: 0x7e, operand: listed.mode });
    assert.deepEqual(idleFor(firstDevices!), { opcode: 0x7e, operand: listed.idleMode });

    // The activity's own device list: the device it switches on first, the rest in the idle list's
    // order, as many rows to a page as the idle list, and "Activity" at the bottom.
    const own = devices(after).find((one) => one.variables.includes(target.index))!.mode!;
    const idleRows = records[listed.idleMode]!.pages.map((page) => taggedList(after, page.list)!.entries.length);
    assert.deepEqual(listed.order, [own, ...listed.order.filter((one) => one !== own)]);
    const idleOrder = records[listed.idleMode]!.pages.flatMap((page) => FOUR_SLOT_ITEMS.flatMap((item) =>
      taggedList(after, page.list)!.entries.filter((one) => (one.tag & 0x3f) === item.scan)
        .map((one) => lists[one.operand]![0]!.operand)));
    assert.notEqual(idleOrder[0], own, `${name}: the switched on device is not already first`);
    assert.deepEqual(listed.order.slice(1), idleOrder.filter((one) => one !== own));
    const ownList = records[listed.mode]!;
    assert.deepEqual(ownList.pages.map((page) => taggedList(after, page.list)!.entries.length), idleRows);
    assert.deepEqual(ownList.pages.flatMap((page) => FOUR_SLOT_ITEMS.flatMap((item) =>
      taggedList(after, page.list)!.entries.filter((one) => (one.tag & 0x3f) === item.scan)
        .map((one) => lists[one.operand]![0]!.operand))), listed.order);
    for (const page of ownList.pages) {
      assert.equal(strings.filter((one) => one.program === page.program).at(-1)!.text, 'Activity');
      for (const variant of renderVariants(after, page.program).variants) {
        assert.equal(variant.page.glyphsMissing, 0);
        assert.equal(variant.page.picturesMissing, 0);
      }
    }
    assert.equal(strings.filter((one) => one.program === records[listed.idleMode]!.pages[0]!.program).at(-1)!.text,
                 'Activities');
    listedCount += 1;
  }
  assert.equal(listedCount, 3);
  assert.equal(composed, 4);
  // And on the 650 with none, one and six commands: one page of each size a working screen has.
  const c = parse(require_('h650_config_region'));
  const commands = modeRecords(c)![deviceListRows(c)[0]!.mode]!.pages
    .flatMap((page) => taggedList(c, page.list)!.entries.map((one) => one.operand));
  for (const [n, pages] of [[0, 1], [1, 1], [6, 2]] as const) {
    const rows = Array.from({ length: n }, (_, k) => ({ label: ['Power', 'Menu', 'Home'][k % 3]!, list: commands[k]! }));
    const screen = composeActivityScreen(c, nextActivityValue(c), 'Play Audio', rows);
    const after = parse(screen.bytes);
    assert.equal(screen.pages, pages);
    const report = coverage(after);
    assert.equal(report.accounted, report.total, `${n} commands: every byte is claimed`);
    assert.equal(roundTrip(after).equal, true, `${n} commands: the emitter reproduces it`);
    for (const page of modeRecords(after)![screen.mode]!.pages) {
      assert.equal(taggedList(after, page.list)!.entries.length <= 4, true);
    }
  }
});

test("an activity's own device list on a Harmony 600, 650 and 700 is the idle list with its devices first, 13 of 13",
     skipUnless(...FOUR_SLOT_ACTIVITY_HOSTS), () => {
  // Section 294. Every real activity's key under Devices is pointed back at the idle list and its
  // list composed again from the idle one: the result draws the compiler's list pixel for pixel and
  // enters the same device from every corner. The control is the next activity's real list, which a
  // list composed for this one must not draw, or the comparison could not tell two lists apart.
  const count = { activities: 0, pages: 0, identical: 0, rowsAgree: 0, controlsDiffer: 0, placeholders: 0,
    rowCopies: 0, placeholderFirst: 0 };
  for (const name of FOUR_SLOT_ACTIVITY_HOSTS) {
    const c = parse(require_(name));
    const maps = valueMaps(c)!;
    const lists = c.actionLists()!;
    const records = modeRecords(c)!;
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))!;
    const idle = counter.record!.first;
    // The records under Devices: keyed by every activity and the idle value, every case entering a
    // mode, and the idle value's list saying "Activities".
    const strings = screenStrings(c, characterMap(c));
    const says = (mode: number, word: string) => records[mode]!.pages.every((page) =>
      strings.filter((one) => one.program === page.program).at(-1)?.text === word);
    const underDevices = maps.flatMap((map, index) => {
      const idleCase = map.entries.find(([key]) => key === idle);
      const queued = idleCase === undefined ? undefined : caseQueued(c, idleCase[1]);
      return map.ranges.length === 0 && queued?.opcode === 0x7e && says(queued.operand, 'Activities')
        && map.entries.every(([, target]) => caseQueued(c, target)?.opcode === 0x7e) ? [index] : [];
    });
    assert.equal(underDevices.length, 2, `${name}: two records under Devices`);
    const idleMode = caseQueued(c, maps[underDevices[0]!]!.entries.find(([key]) => key === idle)![1])!.operand;
    const activities = maps[underDevices[0]!]!.entries.map(([key]) => key).filter((key) => key !== idle);
    const rowsOf = (cc: Container, mode: number) => modeRecords(cc)![mode]!.pages.map((page) =>
      FOUR_SLOT_ITEMS.flatMap((item) => taggedList(cc, page.list)!.entries
        .filter((one) => (one.tag & 0x3f) === item.scan).map((one) => cc.actionLists()![one.operand]![0]!.operand)));
    const drawn = (cc: Container, mode: number) => modeRecords(cc)![mode]!.pages.map((page) =>
      JSON.stringify(renderPage(cc, page)!.raster));
    activities.forEach((activity, k) => {
      const real = caseQueued(c, maps[underDevices[0]!]!.entries.find(([key]) => key === activity)![1])!.operand;
      assert.ok(says(real, 'Activity'), `${name}: activity ${activity}'s list says Activity`);
      const back = new Uint8Array(c.blob);
      for (const map of underDevices) {
        const target = maps[map]!.entries.find(([key]) => key === activity)![1];
        back.set([idleMode & 0xff, idleMode >> 8], c.blobOffsetOf(target)! + 1);
      }
      const listed = composeActivityDeviceList(parse(back), activity);
      const after = parse(listed.bytes);
      assert.equal(listed.idleMode, idleMode);
      count.activities += 1;
      const composedPages = drawn(after, listed.mode);
      const realPages = drawn(c, real);
      assert.equal(composedPages.length, realPages.length);
      count.pages += realPages.length;
      count.identical += composedPages.filter((one, p) => one === realPages[p]).length;
      if (JSON.stringify(rowsOf(after, listed.mode)) === JSON.stringify(rowsOf(c, real))) count.rowsAgree += 1;
      const other = caseQueued(c, maps[underDevices[0]!]!.entries
        .find(([key]) => key === activities[(k + 1) % activities.length])![1])!.operand;
      if (JSON.stringify(drawn(c, other)) !== JSON.stringify(composedPages)) count.controlsDiffer += 1;
      // A device with no power variable stands in the enter list's power group as a zero instruction.
      const enter = lists[taggedList(c, handlerSets(c)!.addresses[
        activityBindings(c).find((one) => one.activity === activity)!.set]!)!.entries.find((one) => one.tag === 1)!.operand]!;
      const group = enter[2]!.opcode === 0x7f ? lists[enter[2]!.operand]! : [enter[2]!];
      count.placeholders += group.filter((one) => one.opcode === 0 && one.operand === 0).length;
      // The device a zero stands for is the one device on the list with no power variable, and it heads
      // the list, 3 of 3.
      if (group[0]!.opcode === 0 && group[0]!.operand === 0) {
        const powered = new Set(deviceVariables(c).filter((one) => one.property === 'Power').map((one) => one.device));
        const unpowered = devices(c).filter((one) => one.mode !== undefined && rowsOf(c, idleMode).flat().includes(one.mode)
          && !one.variables.some((variable) => powered.has(deviceVariables(c).find((v) => v.index === variable)?.device ?? '')));
        assert.equal(unpowered.length, 1, `${name}: one device without a power variable`);
        if (rowsOf(c, real)[0]![0] === unpowered[0]!.mode) count.placeholderFirst += 1;
      }
      // Each of the compiler's rows runs a list of its own, byte identical to the idle list's for that device.
      const idleRowList = new Map(records[idleMode]!.pages.flatMap((page) => taggedList(c, page.list)!.entries
        .map((one) => [lists[one.operand]![0]!.operand, one.operand] as const)));
      for (const page of records[real]!.pages) {
        for (const entry of taggedList(c, page.list)!.entries) {
          const own = idleRowList.get(lists[entry.operand]![0]!.operand)!;
          if (own !== entry.operand && JSON.stringify(lists[own]) === JSON.stringify(lists[entry.operand])) count.rowCopies += 1;
        }
      }
    });
  }
  assert.deepEqual(count, { activities: 13, pages: 21, identical: 21, rowsAgree: 13, controlsDiffer: 13, placeholders: 3,
    rowCopies: 63, placeholderFirst: 3 });
});

test('an activity device list is refused where the key under Devices already opens a list of its own',
     skipUnless('h650_config_region', 'one_config'), () => {
  const c = parse(require_('h650_config_region'));
  assert.throws(() => composeActivityDeviceList(c, 0), /does not open the idle device list/);
  assert.throws(() => composeActivityDeviceList(c, 7), /not an activity with a start up screen/);
  assert.throws(() => composeActivityDeviceList(parse(require_('one_config')), 0), /Harmony 600, 650 and 700 alone/);
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
  let recordBindings = 0;
  let nothing = 0;
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
      recordBindings += bound.length;
      nothing += bound.filter((entry) => entry.opcode === 0 && entry.operand === 0).length;
      assert.equal(bound.length, record.pages.length === 1 ? 2 : 0,
                   `${name}: mode ${modes - 1} has ${record.pages.length} pages and binds `
                   + `${bound.length} page turn keys`);
    }
    assert.ok(modes > 0, `${name}: the mode walk found nothing to walk`);
  }
  // Section 275's totals, which were prose alone until section 293 found the second one stated as 962.
  assert.equal(recordBindings, 1076);
  assert.equal(nothing, 966, 'bindings to the null instruction');
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
  assert.deepEqual((lists[screen.activeList as number] ?? [])[0], { opcode: 0x07, operand: 0xffff });

  // The page's Devices key runs a beep and enters a device list.
  const devices = lists[screen.devicesList as number] ?? [];
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

test('the activity screen composer refuses what it cannot place', skipUnless('one_spare_20260830', 'h525_config'),
     () => {
  const c = parse(require_('one_spare_20260830'));
  const rows = [{ label: 'Power', list: 0 }];
  // An activity that already has a working screen.
  assert.throws(() => composeActivityScreen(c, 0, 'Test', rows), /already has a working screen/);
  // Any architecture but the Harmony One's and the Harmony 600, 650 and 700's, section 290.
  const h525 = parse(require_('h525_config'));
  assert.throws(() => composeActivityScreen(h525, nextActivityValue(h525), 'Test', rows),
                /Harmony One, 600, 650 and 700 alone/);
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

// findings.md section 291: the composed activity, read back off the Harmony 650 after the write that
// all eight predictions held for. The two reads bracket it, so this states what the remote held on
// each side rather than what the composer meant to produce, and it fails if a reader stops finding
// the row a person pressed. Activity 4 is above the idle value 3, which no compiled arch 14
// configuration does, and its row sits under Kodi kijken on that row's page, 106, which the person
// at the remote saw as the menu's second page; the page order itself is not asserted here.
test('the composed activity read back off the Harmony 650 is a fourth row, on Kodi kijken\'s page below it',
     skipUnless('h650_pre144_region', 'h650_post144_region'), () => {
  const row = (name: string) => activityNames(parse(require_(name)))
    .map((one) => [one.activity, one.page, one.name, one.at?.y]);
  const before = row('h650_pre144_region');
  assert.deepEqual(before.map((one) => one[2]), ['Kodi kijken', 'LG WebOS', 'TV kijken']);
  const after = row('h650_post144_region');
  assert.deepEqual(after.slice(0, 3), before);
  assert.deepEqual(after.slice(3), [[4, 106, 'LG kijken', 79]]);
  // Kodi kijken is the second page's other row, at the top.
  assert.deepEqual(after[0], [0, 106, 'Kodi kijken', 35]);
});
