/**
 * Several catalogue devices composed into one configuration, todo-compile-650 2.7, section 331.
 *
 * **What is claimed**: composing several devices in one run is composing them one at a time, byte for
 * byte, in the order given; and the result is what Logitech's compiler wrote when the same devices were
 * added to the same account, in everything this composer composes: where each device sits on every
 * device list and how each list pages and counts, the order of their identifiers, each device's
 * variables and their ranges, its two delays, what its power variable sends both ways, and the name
 * tree's order. What Logitech writes and the composer does not is counted per device and named.
 *
 * **The known answers** are the power hold compiles of sections 306 and 307: devices put on a test
 * account's Harmony 650 and 700 records by us and compiled by Logitech's service, beside a compile of
 * the same account before they were added. Six pairs: the Harmony 650's `h650_panasonic_config` and each
 * of `h650_power_hold_compile` and `_2`, two devices added each, and the Harmony 700's
 * `h700_28_config_region` and each of `h700_power_hold_compile` to `_4`, three each. The 650's second
 * compile joined at section 348: one of its two devices, the Panasonic TX-28A1U, composed nothing until
 * its family's codes were built at the device's own repeat count. What these compare is placement,
 * variables and the power actions; the Dell 2300MP's ordinary command records, which the rhythm table
 * builds at one repetition where Logitech wrote three, are not among them, section 348.
 *
 * **The base cannot draw the devices' own names**: a configuration carries only the glyphs its texts
 * use, so neither base spells `Panasonic TX-29AK40F`, and the composer draws a device list label on one
 * line of 59 pixels at most, where Logitech fits these names on two lines in a smaller size. So the
 * devices are composed under short labels the base can spell, and compared by position and by what they
 * send rather than by name; the device modes, which do depend on the names, are compared in
 * `devicemode.test.ts`, composed into the compiles themselves as section 325 does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  type CatalogueDeviceRequest,
  ComposeError,
  type Container,
  catalogueCommands,
  catalogueDevice,
  catalogueDevicePower,
  catalogueDriving,
  characterMap,
  composeCatalogueDevice,
  composeCatalogueDevices,
  composedNameTreeOrder,
  deviceIdOfGroup,
  deviceIds,
  deviceListRowMode,
  deviceModeMaps,
  deviceModeMarker,
  deviceVariables,
  devices,
  irBlockWords,
  irGroups,
  irHeaderPointers,
  modeRecords,
  nameNodes,
  parse,
  payloadOf,
  SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  screenProgram,
  screenStrings,
  stateRecords,
  stateTable,
  stateVariables,
  taggedList,
  valueMaps,
} from '../src/index.ts';

const CALL = 0x7f;
const SEND = 0x7d;
const QUANTITY = 0x7c;
const MAP_VALUE = 0x72;
/** The order a corner page fills its four buttons, section 285. */
const FILL = [8, 2, 9, 34] as const;

const open = (name: string): Container => {
  const bytes = require_(name);
  try { return parse(bytes); } catch { return parse(payloadOf(bytes)); }
};

/** One added device: its catalogue entry, the short label it is composed under, the compile's label. */
type Added = { slug: string; file: string; label: string; theirs: string; inputs: boolean };
const added = (slug: string, file: string, label: string, theirs: string, inputs = false): Added =>
  ({ slug, file, label, theirs, inputs });

/**
 * The six pairs, each added device in the order of its device list row in Logitech's compile, which is
 * the order of their identifiers there. `inputs` is set where Logitech's compile holds an input
 * variable for the device: it gave seven of these sixteen none, where the catalogue states inputs, and
 * what decided that is not read, so the composition is asked for what the compile holds rather than
 * the comparison counting a difference the composer was told to make.
 */
const PAIRS: readonly { base: string; compile: string; devices: readonly Added[] }[] = [
  { base: 'h650_panasonic_config', compile: 'h650_power_hold_compile', devices: [
    added('Panasonic', 'TX-29AK40F', 'Pana', 'Panasonic_TX-29AK40F', true),
    added('Knoll', 'HDP-1100', 'Knoll', 'Knoll_HDP-1100')] },
  { base: 'h650_panasonic_config', compile: 'h650_power_hold_compile_2', devices: [
    added('Dell', '2300MP', 'Dell', 'Dell_2300MP'),
    added('Panasonic', 'TX-28A1U', 'Pana', 'Panasonic_TX-28A1U', true)] },
  { base: 'h700_28_config_region', compile: 'h700_power_hold_compile', devices: [
    added('Panasonic', 'TX-P42GT30E', 'Pana', 'Panasonic_TX-P42GT30E'),
    added('JVC', 'DLA-HD10KU', 'DLA', 'JVC_DLA-HD10KU'),
    added('Barco', '6300', 'Proj', 'Barco_6300')] },
  { base: 'h700_28_config_region', compile: 'h700_power_hold_compile_2', devices: [
    added('Pioneer', 'DEH-P47DH', 'Pioneer', 'Pioneer_DEH-P47DH'),
    added('Mivar', '14_M3_TVD', 'Telly', 'Mivar_14_M3_TVD'),
    added('Thomson', 'DSI-4400', 'Thom', 'Thomson_DSI-4400')] },
  { base: 'h700_28_config_region', compile: 'h700_power_hold_compile_3', devices: [
    added('Panasonic', 'TH-42PA30', 'Pana', 'Panasonic_TH-42PA30', true),
    added('Panasonic', 'CS-29FJ20S', 'Plasma', 'Panasonic_CS-29FJ20S'),
    added('Quasar', 'SP2717T', 'Wide', 'Quasar_SP2717T', true)] },
  { base: 'h700_28_config_region', compile: 'h700_power_hold_compile_4', devices: [
    added('Panasonic', 'TX-D37LT84F', 'Pana', 'Panasonic_TX-D37LT84F'),
    added('Sony', 'KE-50MR1E', 'Sony', 'Sony_KE-50MR1E', true),
    added('Thomson', '25DT60H', 'Thom', 'Thomson_25DT60H', true)] },
];
const FIXTURES = [...new Set(PAIRS.flatMap((one) => [one.base, one.compile]))];

/**
 * A device as the calibration composes it: its power commands on its page, under labels the base
 * spells, and its power and delays as the catalogue states them, which is the composer's default.
 */
function requestOf(one: Added): CatalogueDeviceRequest {
  const entry = catalogueDevice(IR_ARCHIVE!, one.slug, one.file);
  const codes = new Map<string, string>();
  for (const command of catalogueCommands(IR_ARCHIVE!, entry.codeset!)) {
    if (!codes.has(command.name)) codes.set(command.name, command.keycode);
  }
  const power = catalogueDevicePower(catalogueDriving(IR_ARCHIVE!, one.slug, one.file), (name) => codes.get(name));
  const commands = [...new Set([...power.onCommands, ...power.offCommands])];
  return {
    manufacturer: one.slug, model: one.file, label: one.label, commands,
    labels: commands.map((_, k) => ['On', 'Down', 'Wake', 'Set'][k] as string),
    ...(one.inputs ? { inputs: true } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------
// 1. One run is the same as one at a time

test('several catalogue devices composed in one run are the bytes of composing them one at a time, in the order given',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config')), () => {
    const base = open('h650_panasonic_config');
    const requests = PAIRS[0]!.devices.map(requestOf);
    const together = composeCatalogueDevices(base, IR_ARCHIVE!, requests);
    let chained = base;
    for (const request of requests) chained = parse(composeCatalogueDevice(chained, IR_ARCHIVE!, request).bytes);
    assert.deepEqual(together.bytes, chained.blob, 'one run is the chain');

    // Every device arrived, under its label, on every device list, with its own mode.
    const after = parse(together.bytes);
    const names = devices(after).map((one) => one.name);
    for (const request of requests) assert.ok(names.includes(request.label), `${request.label} is a device`);
    assert.equal(devices(after).length, devices(base).length + requests.length);

    // The identifiers climb by one in the order composed, from one past the highest the base holds.
    const highest = Math.max(...deviceIds(base));
    assert.deepEqual(together.variables.map((one) => one.identifier), [highest + 1, highest + 2]);

    // **The variable numbers a device was composed with go stale**, which is why the result restates
    // them: the first device's delay variables sit above `narrow`, and every one byte variable that went
    // in after `composeDevice` returned, its own inputs' and the second device's power variable, went in
    // below them, so each moved up by one per such variable. Its power variable sits below `narrow` and
    // did not move.
    const first = together.devices[0]!.device;
    const final = together.variables[0]!;
    assert.equal(final.power, first.variable);
    const laterNarrow = (stateTable(after)!.narrow) - (stateTable(parse(first.bytes))!.narrow);
    // Measured: seven one byte variables the TX-29AK40F's own inputs added (narrow 71 to 78) and the
    // Knoll's power variable (78 to 79).
    assert.equal(laterNarrow, 8);
    assert.equal(final.powerOnDelay, first.powerOnDelay!.variable + laterNarrow);
    assert.equal(final.interDeviceDelay, first.delay!.variable + laterNarrow);
    const byIndex = new Map(stateVariables(after).map((one) => [one.index, one.name]));
    assert.equal(byIndex.get(final.powerOnDelay!), `PowerOnDelay_${final.identifier}_65278`);
    assert.equal(byIndex.get(final.interDeviceDelay!), `InterDeviceDelay_${final.identifier}_65278`);

    // The control: the other order is another configuration, with the identifiers swapped over.
    const swapped = composeCatalogueDevices(base, IR_ARCHIVE!, [...requests].reverse());
    assert.notDeepEqual(swapped.bytes, together.bytes);
    assert.deepEqual(swapped.variables.map((one) => [one.label, one.identifier]),
      [[requests[1]!.label, highest + 1], [requests[0]!.label, highest + 2]]);
  });

test('several devices are refused past the model\'s device count, under a label already taken, and as an empty list',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config')), () => {
    const base = open('h650_panasonic_config');
    const [pana, knoll] = PAIRS[0]!.devices.map(requestOf) as [CatalogueDeviceRequest, CatalogueDeviceRequest];
    // Six devices; a Harmony 650 holds eight, Logitech's own figure for its account.
    assert.equal(devices(base).length, 6);
    assert.throws(() => composeCatalogueDevices(base, IR_ARCHIVE!, [pana, knoll, { ...knoll, label: 'Knol' }],
      { maxDevices: 8 }), (error: unknown) => error instanceof ComposeError && /holds 8/.test(error.message));
    // The control: eight is allowed.
    assert.equal(devices(parse(composeCatalogueDevices(base, IR_ARCHIVE!, [pana, knoll], { maxDevices: 8 }).bytes)).length, 8);
    // A label the base already has, and one twice in the list.
    // Each by its own message, so that another refusal further in cannot pass for this one.
    const refusedAs = (message: string) => (error: unknown): boolean =>
      error instanceof ComposeError && error.message === message;
    assert.throws(() => composeCatalogueDevices(base, IR_ARCHIVE!, [{ ...pana, label: 'KPN' }]),
      refusedAs('a device called KPN is already here or earlier in the list'));
    assert.throws(() => composeCatalogueDevices(base, IR_ARCHIVE!, [pana, { ...knoll, label: 'Pana' }]),
      refusedAs('a device called Pana is already here or earlier in the list'));
    assert.throws(() => composeCatalogueDevices(base, IR_ARCHIVE!, []), refusedAs('no device to compose'));
  });

// ---------------------------------------------------------------------------------------------------
// 2. Against Logitech's compiles of the same devices

/**
 * Every device list menu, as its pages in order, each page the counter it draws on the title's line and
 * the devices its rows enter in fill order. A two row page binds a device on both buttons of a row, so a
 * device is listed once per page.
 */
function deviceLists(c: Container, nameOfMode: ReadonlyMap<number, string>): string[] {
  const lists = c.actionLists()!;
  const marker = deviceModeMarker(c);
  const drawn = screenStrings(c, characterMap(c));
  const out: string[] = [];
  for (const record of modeRecords(c)!) {
    const pages = record.pages.map((page) => {
      const slots: [number, string][] = [];
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== CALL) continue;
        const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
        if (mode !== undefined) slots.push([entry.tag & 0x3f, nameOfMode.get(mode) ?? `mode ${mode}`]);
      }
      slots.sort((a, b) => FILL.indexOf(a[0] as (typeof FILL)[number]) - FILL.indexOf(b[0] as (typeof FILL)[number]));
      const counter = drawn.filter((one) => one.program === page.program && one.y === 2 && one.x >= 90)
        .sort((a, b) => a.x - b.x).map((one) => one.text).join('');
      return `${counter || '-'}[${[...new Set(slots.map((one) => one[1]))].join(',')}]`;
    });
    if (pages.some((page) => !page.endsWith('[]'))) out.push(pages.join(' '));
  }
  return out.sort();
}

/** A device's variables by property: its range and first value, compared across the two files. */
function propertiesOf(c: Container, device: string): string[] {
  const records = stateRecords(c)!;
  return deviceVariables(c).filter((one) => one.device === device)
    .map((one) => `${one.property} 0..${records[one.index]!.second} from ${records[one.index]!.first}`).sort();
}

/** A device's delay variables by name, identifier left out, and their first values. */
function delaysOf(c: Container, identifier: number): Map<string, number> {
  const records = stateRecords(c)!;
  return new Map(stateVariables(c).filter((one) => one.deviceId === identifier)
    .map((one) => [one.label.replace(`_${identifier}`, ''), records[one.index]!.first]));
}

/**
 * What one power transition sends, read the way section 320's test reads it: per send its once block's
 * words, the `0x7C` amount after it and the inter device delay its prelude maps; the calls in order, `S`
 * a send, `D` the power on delay, `T` anything else; and the power on delay's value.
 */
function powerAction(c: Container, list: number): string {
  const lists = c.actionLists()!;
  const records = stateRecords(c)!;
  const mapped = (index: number): number | undefined => {
    const only = lists[index]!;
    return only.length === 1 && only[0]!.opcode === MAP_VALUE ? records[only[0]!.operand & 0xff]!.first : undefined;
  };
  const sent = (index: number): string | undefined => {
    const body = lists[index]!;
    const send = body.find((one) => one.opcode === SEND);
    if (send === undefined) return undefined;
    const amount = body.find((one) => one.opcode === QUANTITY)!.operand & 0xff;
    const load = lists[body[0]!.operand]!;
    const condition = lists[load.find((one) => one.opcode === CALL)!.operand]!;
    const interDevice = mapped(condition.find((one) => one.opcode === CALL)!.operand);
    const once = irHeaderPointers(c, irGroups(c)![send.operand >> 8]!.addresses[send.operand & 0xff]!)[0]!;
    return `S(${irBlockWords(c, once)!.join(',')} x${amount} i${interDevice})`;
  };
  const direct = sent(list);
  if (direct !== undefined) return direct;
  return lists[list]!.map((one) => {
    const s = sent(one.operand);
    if (s !== undefined) return s;
    const d = mapped(one.operand);
    return d === undefined ? 'T' : `D${d}`;
  }).join(' ');
}

function powerOf(c: Container, device: string): { on: string; off: string } {
  const variable = deviceVariables(c).find((one) => one.device === device && one.property === 'Power')!;
  const values = stateRecords(c)![variable.index]!.values;
  return {
    on: powerAction(c, values.find((one) => one.from === 0 && one.to === 1)!.operand),
    off: powerAction(c, values.find((one) => one.from === 1 && one.to === 0)!.operand),
  };
}

/** True when the name tree's level 1 nodes are in the compiler's order, ties larger first. */
function treeInOrder(c: Container): boolean {
  const stored = nameNodes(c)!.filter((one) => one.level === 1).map((one) => one.index);
  return composedNameTreeOrder(stored).every((index, k) => index === stored[k]);
}

/**
 * The reset calls the devices composed with inputs here carry after their power on delay, each one found
 * in the same place in Logitech's compile of the same devices. Measured, section 332.
 */
const RESETS_COMPARED = 11;

test('devices composed several at a time are where Logitech\'s compile of the same devices put them, and send what it sends',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const named: string[] = [];
    let lists = 0;
    let devicesCompared = 0;
    let linked = 0;
    let resetsCompared = 0;
    for (const pair of PAIRS) {
      const base = open(pair.base);
      const theirs = open(pair.compile);
      const result = composeCatalogueDevices(base, IR_ARCHIVE!, pair.devices.map(requestOf));
      const ours = parse(result.bytes);

      // **Every device list, page by page**: which device is in which corner or row, in fill order,
      // and the counter every page draws. Our devices are named by the compile's labels for this, ours
      // by the mode each composition returned, theirs by the group each mode sends.
      const ourNames = new Map(devices(ours).flatMap((one) => (one.name === undefined ? [] : [[one.group, one.name] as const])));
      const rename = new Map(pair.devices.map((one) => [one.label, one.theirs]));
      const ourModes = new Map(deviceModeMaps(ours).map((one) => [one.mode, ourNames.get(one.group) ?? '?']));
      result.devices.forEach((one, k) => ourModes.set(one.screen.mode, pair.devices[k]!.theirs));
      for (const [mode, name] of ourModes) ourModes.set(mode, rename.get(name) ?? name);
      const theirNames = new Map(devices(theirs).map((one) => [one.group, one.name ?? '?']));
      const theirModes = new Map(deviceModeMaps(theirs).map((one) => [one.mode, theirNames.get(one.group)!]));
      const mine = deviceLists(ours, ourModes);
      assert.deepEqual(mine, deviceLists(theirs, theirModes), `${pair.compile}: the device lists`);
      lists += mine.length;

      // **The identifiers**: the added devices' identifiers in Logitech's compile, ascending, are in
      // the order of their rows, which is the order composed; ours climb by one in that order.
      const baseIds = new Set(deviceIds(base));
      const theirAdded = deviceIds(theirs).filter((one) => !baseIds.has(one)).sort((a, b) => a - b);
      assert.equal(theirAdded.length, pair.devices.length, `${pair.compile}: one identifier per added device`);
      // Logitech's are consecutive within the compile, where across compiles its counter leaves gaps,
      // section 319: so one past the one before is their rule for the second device on, and only the
      // first carries a gap nothing here could know.
      assert.deepEqual(theirAdded, theirAdded.map((_, k) => theirAdded[0]! + k), `${pair.compile}: consecutive`);
      // And directly: each added device's own identifier, read through the delays' defaults page, in
      // the order the devices are composed, which is their rows' order. Pairing `theirAdded` by index
      // below rests on this. The reader links a page to a device on 14 of the 16 and not on the JVC and
      // the CS-29FJ20S, so those two are checked only by elimination, the one identifier left.
      const theirIdOfGroup = deviceIdOfGroup(theirs);
      const theirIdOf = new Map(devices(theirs).map((one) =>
        [one.name, one.group === undefined ? undefined : theirIdOfGroup.get(one.group)]));
      pair.devices.forEach((one, k) => {
        const id = theirIdOf.get(one.theirs);
        if (id === undefined) return;
        linked += 1;
        assert.equal(id, theirAdded[k], `${pair.compile} ${one.theirs}: identifier in row order`);
      });
      assert.deepEqual(result.variables.map((one) => one.identifier),
        pair.devices.map((_, k) => Math.max(...baseIds) + 1 + k));

      pair.devices.forEach((one, k) => {
        devicesCompared += 1;
        const where = `${pair.compile} ${one.theirs}`;
        // Its variables and their ranges, inputs included where asked.
        const a = propertiesOf(ours, one.label);
        const b = propertiesOf(theirs, one.theirs);
        if (JSON.stringify(a) !== JSON.stringify(b)) named.push(`${where}: ours ${a.join('; ')}, theirs ${b.join('; ')}`);
        // Its two delays, and the six delay variables Logitech gives every device and the composer does not.
        const ourDelays = delaysOf(ours, result.variables[k]!.identifier!);
        const theirDelays = delaysOf(theirs, theirAdded[k]!);
        assert.deepEqual([...ourDelays.keys()].sort(), ['InterDeviceDelay', 'PowerOnDelay'], where);
        for (const [name, value] of ourDelays) assert.equal(theirDelays.get(name), value, `${where}: ${name}`);
        assert.deepEqual([...theirDelays.keys()].filter((name) => !ourDelays.has(name)).sort(), [
          'DefaultInterDeviceDelay', 'DefaultPowerOnDelay', 'InterDeviceDelayFixingTriggered',
          'InterDeviceDelayFlagCounter', 'PowerOnDelayFixingTriggered', 'PowerOnDelayFlagCounter'], where);
        // What switching it on and off sends, and waits; Logitech's on transition then resets the input
        // states its catalogue names, a `T` each. The composer composes those resets only where it
        // composes the inputs, section 332, and only for a state it composed a variable for, so ours
        // carries exactly that many `T`s after the delay and theirs is cut back to the same count. A
        // device composed with inputs whose resets all compose, which is every one here, therefore
        // compares whole; one composed without inputs compares on what it sends and waits.
        const mineP = powerOf(ours, one.label);
        const theirP = powerOf(theirs, one.theirs);
        assert.equal(mineP.off, theirP.off, `${where}: off`);
        const resets = result.devices[k]!.inputs?.resets.length ?? 0;
        assert.equal(mineP.on, theirP.on.replace(/( T)+$/, '') + ' T'.repeat(resets), `${where}: on`);
        if (resets > 0) {
          assert.equal(mineP.on, theirP.on, `${where}: on, its resets included`);
          resetsCompared += resets;
        }
      });

      // The state table and the value maps grow by what the composer composes and Logitech's by six
      // variables and two value maps more per device, the ones named above and section 287's second
      // table on each delay variable, plus what the comparison above named.
      const n = pair.devices.length;
      const extra = named.filter((one) => one.startsWith(`${pair.compile} `)).length;
      assert.equal(stateTable(theirs)!.count - stateTable(ours)!.count, 6 * n + extra, `${pair.compile}: variables`);
      assert.equal(valueMaps(theirs)!.length - valueMaps(ours)!.length, 2 * n, `${pair.compile}: value maps`);

      // The name tree is in the compiler's order in both.
      assert.ok(treeInOrder(theirs), `${pair.compile}: Logitech's tree`);
      assert.ok(treeInOrder(ours), `${pair.compile}: ours`);
    }
    assert.equal(devicesCompared, 16);
    assert.equal(linked, 14);
    // Counted rather than bounded: the reset calls composed here and found in Logitech's on transition.
    assert.equal(resetsCompared, RESETS_COMPARED);
    assert.equal(lists, 28, 'six device lists on each 650 compile and four on each 700 compile');

    // **The control on the order**: the Harmony 700's first three composed the other way round sit on
    // the device lists in the other order and carry the other identifiers, so the lists no longer match
    // Logitech's, which is what shows the comparison above sees the order and not only the membership.
    const pair = PAIRS[2]!;
    const reversed = [...pair.devices].reverse();
    const wrong = composeCatalogueDevices(open(pair.base), IR_ARCHIVE!, reversed.map(requestOf));
    const wrongC = parse(wrong.bytes);
    const wrongNames = new Map(devices(wrongC).flatMap((one) => (one.name === undefined ? [] : [[one.group, one.name] as const])));
    const wrongModes = new Map(deviceModeMaps(wrongC).map((one) => [one.mode, wrongNames.get(one.group) ?? '?']));
    wrong.devices.forEach((one, k) => wrongModes.set(one.screen.mode, reversed[k]!.theirs));
    const theirs = open(pair.compile);
    const theirNames = new Map(devices(theirs).map((one) => [one.group, one.name ?? '?']));
    const theirModes = new Map(deviceModeMaps(theirs).map((one) => [one.mode, theirNames.get(one.group)!]));
    assert.notDeepEqual(deviceLists(wrongC, wrongModes), deviceLists(theirs, theirModes));
    // **One difference**: the TX-P42GT30E's power on resets its `InputType`, so Logitech compiles that
    // state although no input variable writes it; the composer composes neither the reset, section 332,
    // nor the state, since it was not asked for inputs and the variable alone would be a state nothing sets.
    assert.deepEqual(named, ['h700_power_hold_compile Panasonic_TX-P42GT30E: ours Power 0..1 from 0, '
      + 'theirs InputType 0..8 from 0; Power 0..1 from 0']);
  });

// ---------------------------------------------------------------------------------------------------
// A corner label is never drawn in the page's title, counter or bottom bar font

test('a whole composed device draws no corner label in a font its pages use for the title, the counter or the bottom bar',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config')), () => {
    // On the Harmony 650 a font set carries its colour in its glyphs, and the title's font has a label's
    // size: the TX-P42GT30E's 'Direct TVRecord' fitted no white font of that size and was drawn in the
    // green title font, which the remote showed as the label's shadow alone, at the bench
    // (reads/20261006T153704Z-ir-test-harmony-650-the-whole-plasma-on-seven-pages.json, step 3).
    const base = open('h650_panasonic_config');
    const before = (modeRecords(base) ?? []).length;
    const composed = parse(composeCatalogueDevices(base, IR_ARCHIVE!, [
      { manufacturer: 'Panasonic', model: 'TX-P42GT30E', label: 'Plasma', full: true }]).bytes);
    const records = modeRecords(composed) ?? [];
    const pages = records.slice(before).flatMap((record) => record.pages);
    const chrome = new Set<number>();
    const labels: { font: number; glyphs: number }[] = [];
    for (const page of pages) {
      let font = -1;
      for (const one of screenProgram(composed, page.program) ?? []) {
        if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] as number;
        // The bottom word is drawn from a stored copy rather than inline, so it is chrome by its opcode.
        if (one.opcode === SCREEN_TEXT_AT) chrome.add(font);
        if (one.opcode !== SCREEN_TEXT_INLINE) continue;
        const y = one.operands[1] as number;
        // The title and counter sit at the top and the bottom word in the bar, rows 2 and 114 on every
        // page; everything between them is a corner label's line.
        if (y <= 4 || y >= 110) chrome.add(font);
        else labels.push({ font, glyphs: Object.keys(one.glyphs ?? {}).length });
      }
    }
    assert.equal(pages.length, 7, 'the whole device, seven pages');
    assert.equal(chrome.size, 3, 'a title font, a counter font and a bottom bar font');
    assert.equal(labels.length, 42, 'every corner label line of the seven pages');
    assert.deepEqual(labels.filter((one) => chrome.has(one.font)), [], 'no label line in a chrome font');
  });

// ---------------------------------------------------------------------------------------------------
// The Harmony 650's test setup: every infrared record we compose is the one Logitech compiled
// ---------------------------------------------------------------------------------------------------

/**
 * The seven devices of plan 006, as the archive names them and as the starting setup's compile names
 * them, todo-compile-650 2.6. `h650_start_config` is Logitech's compile of all seven on the bench 650,
 * synced by MyHarmony and read off the remote; `h650_panasonic_config` is a base whose fonts spell
 * every label a whole device needs.
 */
const TEST_SETUP: readonly { manufacturer: string; model: string; theirs: string }[] = [
  { manufacturer: 'LG', model: 'OLED65G26LA', theirs: 'LG_TV' },
  { manufacturer: 'Panasonic', model: 'TX-P42GT30E', theirs: 'Plasma' },
  { manufacturer: 'Denon', model: 'AVR-X4800H', theirs: 'Denon' },
  { manufacturer: 'KPN', model: 'TV6000COK', theirs: 'KPN' },
  { manufacturer: 'Plex', model: 'Plex_Player', theirs: 'Kodi' },
  { manufacturer: 'Ligawo', model: '3090063', theirs: 'Switch' },
  { manufacturer: 'Sony', model: 'DAV-C540', theirs: 'Sony_HT' },
];

/** A record's three blocks as their raw words up to the terminating zero, `-` for a null pointer. */
function recordBlocks(c: Container, group: number): string[][] {
  return irGroups(c)![group]!.addresses.map((address) => irHeaderPointers(c, address).slice(0, 3).map((pointer) => {
    if (pointer === 0) return '-';
    const words: number[] = [];
    for (let at = c.blobOffsetOf(pointer)!; ; at += 2) {
      const word = c.blob[at]! | (c.blob[at + 1]! << 8);
      if (word === 0) break;
      words.push(word);
    }
    return words.join(',');
  }));
}

test('the test setup\'s seven devices composed whole are infrared records Logitech compiled for them, three blocks word for word',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config', 'h650_start_config')), () => {
    const base = open('h650_panasonic_config');
    const theirs = open('h650_start_config');
    const theirGroup = new Map(devices(theirs).map((one) => [one.name, one.group!]));
    let ours = 0;
    let identical = 0;
    let powerHeld = 0;
    let powerCommands = 0;
    let copies = 0;
    let copiesOfOurs = 0;
    const notCopies: string[] = [];
    let control = -1;
    for (const one of TEST_SETUP) {
      const result = composeCatalogueDevices(base, IR_ARCHIVE!, [{ manufacturer: one.manufacturer, model: one.model,
        label: 'Test', full: true, inputs: true }], { maxDevices: 99 });
      const device = result.devices[0]!;
      assert.deepEqual(device.leftOut, [], `${one.theirs}: every catalogue command composes`);
      const composed = parse(result.bytes);
      const mine = recordBlocks(composed, devices(composed).find((d) => d.name === 'Test')!.group!);
      const theirRecords = recordBlocks(theirs, theirGroup.get(one.theirs)!);
      const theirSet = new Set(theirRecords.map((blocks) => blocks.join('|')));
      ours += mine.length;
      identical += mine.filter((blocks) => theirSet.has(blocks.join('|'))).length;
      // A command named Power repeats while held, as every other command does: Logitech gives it its
      // family's held block. Our power steps are records of their own after the commands, and the two
      // are told apart by name.
      device.commandNames.forEach((name, k) => {
        if (!name.startsWith('Power')) return;
        powerCommands += 1;
        if (mine[k]![1] !== '-') powerHeld += 1;
      });
      // Logitech's records that are not ours are one block records, section 337: a copy of one of our
      // once blocks without the silence it opens with, or a code no catalogue command is.
      const onceWithoutLead = new Set(mine.map((blocks) => {
        const words = blocks[0]!.split(',').map(Number);
        return words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(',');
      }));
      const mineSet = new Set(mine.map((blocks) => blocks.join('|')));
      for (const blocks of theirRecords) {
        if (mineSet.has(blocks.join('|'))) continue;
        assert.deepEqual([blocks[1], blocks[2]], ['-', '-'], `${one.theirs}: a record not ours has one block`);
        copies += 1;
        if (onceWithoutLead.has(blocks[0]!)) copiesOfOurs += 1;
        else notCopies.push(`${one.theirs}: ${blocks[0]!.split(',').slice(0, 4).join(',')}`);
      }
      // **The control**: the same comparison against another device's records finds nothing, so the
      // count above is the devices' own and not codes every device shares.
      if (one.theirs === 'LG_TV') {
        const plasma = new Set(recordBlocks(theirs, theirGroup.get('Plasma')!).map((blocks) => blocks.join('|')));
        control = mine.filter((blocks) => plasma.has(blocks.join('|'))).length;
      }
    }
    assert.equal(ours, 418, 'records composed for the seven devices');
    assert.equal(identical, 418, 'records byte identical to one of Logitech\'s for the same device');
    assert.equal(powerCommands, 20, 'commands named Power on the seven');
    assert.equal(powerHeld, 20, 'power commands that repeat while held');
    assert.equal(control, 0);
    assert.equal(copies, 83, 'records in Logitech\'s groups for the seven that are not ours');
    assert.equal(copiesOfOurs, 82, 'copies of one of our once blocks, its silence dropped');
    // The one left is section 162's `Logitech 24 Bit` code 0: a 4000 and 4500 lead in, then marks of
    // 400 alone, which our emitter reproduces byte for byte there. What sends it is not read here.
    assert.deepEqual(notCopies, ['LG_TV: 36768,4500,33168,1000']);
  });
