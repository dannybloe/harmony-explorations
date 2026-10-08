/**
 * A pass through device in an activity, `todo-compile-650.md` 3.14: a device the signal passes through
 * unaltered, an HDMI switch, which MyHarmony saves under `PassThroughActivityRole` with an input and
 * no job.
 *
 * The evidence is one compile, `h650_start_config`, Logitech's compile of the Harmony 650's starting
 * setup, whose "Kodi kijken" holds the Ligawo HDMI switch on Input 2 that way; the saved activity is in
 * the lab beside the setup's replies. No other arch 14 compile in the lab has its roles stated, so the
 * contributed Harmony 700's "Watch VCR", whose A/V switch has the same shape, is a candidate and not a
 * second sample.
 *
 * The shape: read what Logitech's compile does with the switch; compose the same three devices from the
 * catalogue and the same activity from its roles with `activityFromRoles`, by the names the setup saved,
 * and read ours back with the same reader; then compose it again without the switch, which must fail
 * every comparison the switch takes part in and no other.
 *
 * **Composed onto `h650_panasonic_config` and not onto Logitech's compile itself**, which is where
 * `todo-compile-650.md` 5.1 will compose: `h650_start_config` holds no device page with a single item,
 * so the one item background picture is not in it and `deviceModeChrome` refuses to build an activity
 * screen there, "skin 72 holds 0 device page looks whole". That is 5.1's to settle and not this item's.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  type ActivityDevice,
  activities,
  activityFromRoles,
  activityKeyedRecords,
  activityKeysFromRoles,
  activityScreenRows,
  caseQueued,
  composeActivity,
  composeActivityDeviceList,
  composeActivityMenuRow,
  composeActivityScreen,
  composeCatalogueDevices,
  ComposeError,
  type Container,
  deviceStateMachines,
  deviceVariables,
  devices,
  FOUR_SLOT_ITEMS,
  handlerSets,
  infraredCodesPerList,
  inputTarget,
  irGroups,
  irHeaderPointers,
  modeRecords,
  modeScreenItems,
  nextActivityValue,
  parse,
  STATE_WRITE_BASE,
  taggedList,
  valueMaps,
} from '../src/index.ts';

const START = 'h650_start_config';
const BASE = 'h650_panasonic_config';

/** What an activity does that a person could see or hear, read off the configuration by device name. */
interface Seen {
  /** Devices whose power its start writes 1, in order. */
  on: string[];
  /** Its start's input writes, `<device>=<value>`, in order. */
  inputs: string[];
  /** Devices whose power its start writes 0, in order. */
  off: string[];
  /** The input writes of tag 5, picking the activity again while it runs. */
  again: string[];
  /** Devices any key of its keypad map sends a code of, ascending by name. */
  keyed: string[];
  /** Devices any item of its working screen sends a code of, ascending by name. */
  onScreen: string[];
  /** Its own device list, the rows in drawn order, by device name. */
  listed: string[];
}

/**
 * Read one activity. The start's own instructions and the lists it calls, one level, which is where
 * every power and input write of an arch 14 start sits, inline or grouped, section 294; tag 5 the same.
 */
function seen(c: Container, activity: number): Seen {
  const lists = c.actionLists()!;
  const byIndex = new Map(deviceVariables(c).map((one) => [one.index, one]));
  const named = new Map(devices(c).map((one) => [one.group, one.name!]));
  const byMode = new Map(devices(c).map((one) => [one.mode, one.name!]));
  const codes = infraredCodesPerList(c);
  const set = activities(c).find((one) => one.activity === activity)!.set;
  const entries = taggedList(c, handlerSets(c)!.addresses[set]!)!.entries;
  const writes = (tag: number): { device: string; property: string; value: number }[] => {
    const out: { device: string; property: string; value: number }[] = [];
    const walk = (list: number, depth: number): void => {
      for (const one of lists[list] ?? []) {
        if (one.opcode === ACTION_LIST_INDEX_OPCODE && depth === 0) walk(one.operand, 1);
        const variable = one.opcode >= STATE_WRITE_BASE ? byIndex.get(one.opcode - STATE_WRITE_BASE) : undefined;
        if (variable !== undefined) out.push({ device: variable.device, property: variable.property, value: one.operand });
      }
    };
    walk(entries.find((one) => one.tag === tag)!.operand, 0);
    return out;
  };
  const start = writes(1);
  const power = (on: boolean) => start.filter((one) => one.property === 'Power' && on === (one.value !== 0))
    .map((one) => one.device);
  const inputsOf = (all: typeof start) => all.filter((one) => one.property === 'Input').map((one) => `${one.device}=${one.value}`);
  const sentTo = (list: number) => (codes.get(list) ?? []).map((one) => named.get(one.group)!);
  const keyed = new Set(entries.filter((one) => one.tag >= 0x10 && one.opcode === ACTION_LIST_INDEX_OPCODE)
    .flatMap((one) => sentTo(one.operand)));
  // The working screen and the device list, through the records keyed by the activity, section 336.
  const keyedRecords = activityKeyedRecords(c);
  const maps = valueMaps(c)!;
  const entered = (map: number) => caseQueued(c, maps[map]!.entries.find(([key]) => key === activity)![1])!.operand;
  const onScreen = new Set(modeScreenItems(c, entered(keyedRecords.working)).flatMap((one) => sentTo(one.list)));
  const listed = modeRecords(c)![entered(keyedRecords.devices[0]!)]!.pages.flatMap((page) =>
    FOUR_SLOT_ITEMS.flatMap((item) => taggedList(c, page.list)!.entries.filter((one) => (one.tag & 0x3f) === item.scan)
      .map((one) => byMode.get(lists[one.operand]![0]!.operand)!)));
  return {
    on: power(true), inputs: inputsOf(start), off: power(false), again: inputsOf(writes(5)),
    keyed: [...keyed].sort(), onScreen: [...onScreen].sort(), listed,
  };
}

/** The `Input` variable of the device called `device`. */
function inputOf(c: Container, device: string): number {
  return deviceVariables(c).find((one) => one.device === device && one.property === 'Input')!.index;
}

/**
 * The codes the transitions into `value` of `device`'s `variable` send, each as the once block's raw
 * words without the silence a composed record opens with: Logitech's input transitions send a one
 * block copy of the command without it, section 337's copies, where ours send the command's own record,
 * so the code is compared and the record is not. Read through `deviceStateMachines`, the reader the
 * input calibration of section 321 compares the two with.
 */
function codeFor(c: Container, device: string, variable: number, value: number): string[] {
  const held = deviceStateMachines(c, device).find((one) => one.variable === variable)!;
  return held.transitions.filter((one) => one.to === value).flatMap((one) => one.steps).flatMap((step) => {
    if (step.kind !== 'send') return [];
    const pointer = irHeaderPointers(c, irGroups(c)![step.group]!.addresses[step.record]!)[0]!;
    const words: number[] = [];
    for (let at = c.blobOffsetOf(pointer)!; ; at += 2) {
      const word = c.blob[at]! | (c.blob[at + 1]! << 8);
      if (word === 0) break;
      words.push(word);
    }
    return [words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(',')];
  });
}

test('Logitech\'s compile switches a pass through device on and to its input, lists it, and gives it no key and no screen item',
     skipUnless(START), () => {
  const c = parse(require_(START));
  const kodi = activities(c).find((one) => one.name === 'Kodi kijken')!;
  // The saved roles' PowerOnOrder is 1, 2 and 3 for the television, Kodi and the switch, and the compile
  // switches them on in that order. The switch's value 1 is Input 2, by the code, in the next test.
  assert.deepEqual(seen(c, kodi.activity), {
    on: ['LG_TV', 'Kodi', 'Switch'],
    inputs: ['LG_TV=5', 'Switch=1'],
    off: ['Plasma', 'Denon', 'KPN', 'Sony_HT'],
    again: ['LG_TV=5', 'Switch=1'],
    keyed: ['Kodi', 'LG_TV'],
    onScreen: ['Kodi'],
    listed: ['LG_TV', 'Kodi', 'Switch', 'Plasma', 'Denon', 'KPN', 'Sony_HT'],
  });
  // Every other activity switches the switch off, and none of them sends it anything either.
  for (const one of activities(c).filter((each) => each.activity !== kodi.activity)) {
    const other = seen(c, one.activity);
    assert.ok(other.off.includes('Switch'), one.name);
    assert.ok(!other.keyed.includes('Switch') && !other.onScreen.includes('Switch'), one.name);
  }
  // The shape is not the role's own: "TV kijken"'s television, saved as its display and nothing else,
  // is switched on and to its input with no key and no screen item either.
  const tv = seen(c, activities(c).find((one) => one.name === 'TV kijken')!.activity);
  assert.ok(tv.on.includes('LG_TV') && tv.inputs.some((one) => one.startsWith('LG_TV='))
    && !tv.keyed.includes('LG_TV') && !tv.onScreen.includes('LG_TV'));
});

test('a pass through device composed from its roles and its input\'s name is started, put on that input and listed as Logitech\'s compile does, and the control without it is not',
     needing(skipWithoutIrArchive(), skipUnless(BASE, START)), () => {
  const theirs = parse(require_(START));
  const kodi = seen(theirs, activities(theirs).find((one) => one.name === 'Kodi kijken')!.activity);
  // The three devices of the activity from the catalogue, under labels of ours, and Logitech's names for them.
  const result = composeCatalogueDevices(parse(require_(BASE)), IR_ARCHIVE!, [
    { manufacturer: 'LG', model: 'OLED65G26LA', label: 'LG', full: true, inputs: true },
    { manufacturer: 'Plex', model: 'Plex_Player', label: 'Plex', full: true, inputs: true },
    { manufacturer: 'Ligawo', model: '3090063', label: 'Switch', full: true, inputs: true },
  ]);
  const c = parse(result.bytes);
  const theirName = new Map([['LG', 'LG_TV'], ['Plex', 'Kodi'], ['Switch', 'Switch']]);
  const group = new Map(devices(c).map((one) => [one.name!, one.group!]));
  // The activity as the setup saved it, in its roles' PowerOnOrder, the inputs by the names it saved.
  const hdmi3 = inputTarget(result.devices[0]!.inputs!, 'HDMI 3');
  const input2 = inputTarget(result.devices[2]!.inputs!, 'Input 2');
  const tv: ActivityDevice = { group: group.get('LG')!, roles: ['Display', 'Volume'], input: hdmi3 };
  const player: ActivityDevice = { group: group.get('Plex')!, roles: ['PlayMovie'] };
  const passThrough: ActivityDevice = { group: group.get('Switch')!, roles: [], input: input2 };

  // The working screen's commands are the ones Logitech drew, by their labels, from the player's own
  // screen, section 323: the selection is an input and not what is compared here.
  const kodiWorking = caseQueued(theirs, valueMaps(theirs)![activityKeyedRecords(theirs).working]!.entries
    .find(([key]) => key === activities(theirs).find((one) => one.name === 'Kodi kijken')!.activity)![1])!.operand;
  const rows = activityScreenRows(c, modeScreenItems(theirs, kodiWorking)
    .map((item) => ({ group: group.get('Plex')!, label: item.label })));

  // The whole of `compose-activity.ts`'s route: start and keypad from the roles, the working screen,
  // the menu row, the activity's own device list.
  const compose = (listed: readonly ActivityDevice[]): { seen: Seen; passThrough: number[] } => {
    const from = activityFromRoles(c, listed);
    const screen = composeActivityScreen(c, nextActivityValue(c), 'Kodi kijken', rows);
    const built = composeActivity(parse(screen.bytes), {
      label: 'Kodi kijken', targets: from.targets, keys: activityKeysFromRoles(c, from.roles),
      screen: {
        startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
        startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
      },
    });
    const rowed = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
    const after = parse(composeActivityDeviceList(rowed, built.activity).bytes);
    return { seen: seen(after, built.activity), passThrough: from.passThrough };
  };

  // Ours, in Logitech's names, restricted to the three devices: the base's other devices are not the
  // compile's, so what both are compared on is what the activity does with these three.
  const three = new Set(theirName.values());
  const project = (one: Seen, rename: (name: string) => string): Record<string, string[]> => {
    const keep = (names: string[]) => names.map(rename).filter((name) => three.has(name));
    const inputs = (writes: string[]) => keep(writes.map((w) => w.split('=')[0]!));
    return {
      on: keep(one.on), inputs: inputs(one.inputs), off: keep(one.off), again: inputs(one.again),
      keyed: keep(one.keyed).sort(), onScreen: keep(one.onScreen),
      // The activity's own devices head its list and the rest keep the idle order, so the head is compared.
      head: keep(one.listed.slice(0, one.on.length)),
    };
  };
  const rename = (name: string) => theirName.get(name) ?? name;
  const expected = project(kodi, (name) => name);
  const ours = compose([tv, player, passThrough]);
  assert.deepEqual(ours.passThrough, [group.get('Switch')]);
  assert.deepEqual(project(ours.seen, rename), expected);

  // The inputs are Logitech's to the value and to the code: the names resolve to the numbers Logitech's
  // compile writes, and each transition sends the code Logitech's sends, word for word.
  assert.deepEqual(ours.seen.inputs, ['LG=5', 'Switch=1']);
  const theirSwitch = (value: number) => codeFor(theirs, 'Switch', inputOf(theirs, 'Switch'), value);
  assert.deepEqual(codeFor(c, 'LG', hdmi3.variable, hdmi3.value), codeFor(theirs, 'LG_TV', inputOf(theirs, 'LG_TV'), 5));
  assert.deepEqual(codeFor(c, 'Switch', input2.variable, input2.value), theirSwitch(1));
  assert.equal(theirSwitch(1).length, 1);
  // That code comparison can tell the switch's inputs apart: Input 1 and Input 3 send other codes.
  for (const other of [0, 2]) assert.notDeepEqual(theirSwitch(other), theirSwitch(1));

  // The control: the same activity with the switch left out. It is switched off rather than on, its
  // input is set neither at the start nor on picking the activity again, and it drops out of the head of
  // the list; the keypad and the screen, which it takes no part in, are unchanged.
  const without = compose([tv, player]);
  assert.deepEqual(without.passThrough, []);
  const missing = project(without.seen, rename);
  const differing = Object.keys(expected).filter((key) => JSON.stringify(missing[key]) !== JSON.stringify(expected[key]));
  assert.deepEqual(differing, ['on', 'inputs', 'off', 'again', 'head']);
});

test('a pass through device\'s input must be its own, a device is listed once, and two devices cannot both take the volume',
     skipUnless(START), () => {
  const c = parse(require_(START));
  const group = new Map(devices(c).map((one) => [one.name!, one.group!]));
  assert.throws(() => activityFromRoles(c, [{ group: group.get('Switch')!, roles: [],
                                              input: { variable: inputOf(c, 'LG_TV'), value: 1 } }]),
                (error: unknown) => error instanceof ComposeError && /is not device 6's input/.test(error.message));
  assert.throws(() => activityFromRoles(c, [{ group: group.get('LG_TV')!, roles: ['Volume'] },
                                            { group: group.get('Denon')!, roles: ['Volume'] }]),
                /both hold Volume/);
  assert.throws(() => activityFromRoles(c, [{ group: group.get('Switch')!, roles: [] },
                                            { group: group.get('Switch')!, roles: [] }]), /listed twice/);
  // And a device with ChannelChanging is the control device ahead of one that plays.
  const roles = activityFromRoles(c, [{ group: group.get('Kodi')!, roles: ['PlayMovie'] },
                                      { group: group.get('KPN')!, roles: ['ChannelChanging'] }]).roles;
  assert.deepEqual(roles, { volume: undefined, control: group.get('KPN') });
});
