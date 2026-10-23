/**
 * The test setup composed onto the empty Harmony One, `todo-compile-one.md` 8.1.1, 8.1.2 and 8.1.4, findings section
 * 435: the seven devices and five activities of `composesetup.test.ts`, onto `buildEmptyTouchConfiguration` (section
 * 434) rather than a Logitech compile, so the donor holds no byte of Logitech's and nothing is lettered or redrawn.
 *
 * **What is held on the composition**: its steps, with no lettering step and no step turning Logitech's pictures into
 * ours; its length and every check; that it carries nothing of its donor, the census of `carried.ts` pinned at no
 * byte, with the control that the same census without the builders' attribution finds the donor's units all over
 * it; that against Logitech's compile the composed devices' send lists are all it shares, written by the device
 * composer; the lists nothing reaches, each the composers' and none the donor's, where the composition onto
 * Logitech's compile keeps 34 of the donor's; and the power off help asking about all seven devices.
 *
 * **What is held on Logitech's compiles**, the facts the composers state on a configuration holding no device, no
 * device page and no menu row: the menu marker is the variable the idle Devices key's list writes, on all nineteen;
 * the numbers a device page shares with the other screens are the wiring's, the clock header's and the value maps'
 * under one name each, and its fonts the other screens' fonts, on the fifteen English compiles of skin 54 holding a
 * device page; the off lists a device page and a power off question run are each the only list of their content;
 * the questions' other lists are the wiring's under one name each; and a device list's row font is the fixed
 * screens' wide one. Each with a failing control.
 *
 * Every figure is exact. The composition is the slow part and is made once for the whole file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  type ComposedSetup, type Container, archSlot, composeSetup, modeRecords, parse, readRecipe, takeApart, taggedList, touchPages,
} from '../src/index.ts';
import { devices, handlerSetRoles } from '../src/inventory.ts';
import { menuMarkerOf } from '../src/shared/menus.ts';
import { assertStateTableConsistent, handlerSets } from '../src/sections.ts';
import { assertQueueFits } from '../src/queue.ts';
import { listCallSites } from '../src/assemble.ts';
import { catalogueInfraredBytes } from '../src/composecatalogue.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { TOUCH_BUILT, touchBuiltBytes } from '../src/families/touch/builders.ts';
import { buildEmptyTouchConfiguration, touchAttributedBytes } from '../src/families/touch/empty.ts';
import { touchDonorFaces } from '../src/families/touch/look.ts';
import { touchMenuMarkerWriter } from '../src/families/touch/menus.ts';
import { namedHitPages } from '../src/families/touch/hitpages.ts';
import { describeTouchWiring } from '../src/families/touch/wiring.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { valueMaps } from '../src/valuemap.ts';
import { describeTouchFixedScreens } from '../src/families/touch/fixedscreens.ts';
import { describeTouchDeviceLists, touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { SCREEN_CALL, SCREEN_SWITCH_NARROW, screenProgram } from '../src/screen.ts';
import { FIRST_DEVICE_HELP_LISTS, describeTouchHelpScreens, helpNumbering } from '../src/families/touch/helpscreens.ts';
import {
  FIRST_DEVICE_KEYS, describeTouchDevicePages, devicePageSlotRoles, firstDevicePageFonts, firstDeviceRoles,
} from '../src/families/touch/devicepages.ts';
import { carried, catalogueDevices } from './carried.ts';
import { listsReached } from './screenlists.ts';

const recipe = () => readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/one-test.json', import.meta.url), 'utf8')));

/** The stamp the empty One and the setup are built at, the composed setup test's. */
const BUILT_AT = '2026-10-15T12:00:00';

/** The empty One as a donor: unblended, since the look blends once, last, over every text the composers add. */
let emptyOnce: ReturnType<typeof buildEmptyTouchConfiguration> | undefined;
const empty = (): ReturnType<typeof buildEmptyTouchConfiguration> => {
  emptyOnce ??= buildEmptyTouchConfiguration({ skin: 54, builtAt: BUILT_AT, blend: false });
  return emptyOnce;
};

/** The composition, once for every test here. */
let composedOnce: ComposedSetup | undefined;
const composed = (): ComposedSetup => {
  composedOnce ??= composeSetup(recipe(), { donor: empty().bytes, archive: IR_ARCHIVE!, builtAt: BUILT_AT });
  return composedOnce;
};

/** The bytes something on the composed path writes: a builder's, `touchBuiltBytes`, or the catalogue's infrared. */
let writtenOnce: Uint8Array | undefined;
const written = (): Uint8Array => {
  if (writtenOnce !== undefined) return writtenOnce;
  const out = composed();
  const built = touchBuiltBytes(out.container, out.blended).owners;
  const infrared = catalogueInfraredBytes(out.container, IR_ARCHIVE!, catalogueDevices(out.container, recipe())).owners;
  writtenOnce = built.map((one, k) => (one !== 0 || infrared[k] !== 0 ? 1 : 0));
  return writtenOnce;
};

/** The sixteen English compiles of skin 54, section 405. */
const SIXTEEN = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
/** Every Harmony One compile of Logitech's in the lab: the sixteen and the three of other skins. */
const NINETEEN = [...SIXTEEN, 'one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'] as const;

const parsedOnce = new Map<string, Container>();
const compile = (name: string): Container => {
  const held = parsedOnce.get(name) ?? parse(require_(name));
  parsedOnce.set(name, held);
  return held;
};

/** The sixteen less the one holding no device page, harvest_one_families_1, measured rather than named. */
const withDevicePages = (): string[] => SIXTEEN.filter((name) => describeTouchDevicePages(compile(name), takeApart(compile(name))).spec.devices.length > 0);

/** A list switching `channels` off and writing `variable` 0, section 400's form of an off list. */
const offList = (channels: readonly number[], variable: number) => [
  ...channels.map((channel) => ({ opcode: 0x3f, operand: 0xc000 | (channel << 4) })), { opcode: 0x80 + variable, operand: 0 },
];
/** Every list of `c` holding exactly `want`. */
const listsHolding = (c: Container, want: readonly { opcode: number; operand: number }[]): number[] => (c.actionLists() ?? [])
  .flatMap((list, index) => (list.length === want.length && list.every((one, k) => one.opcode === want[k]?.opcode && one.operand === want[k]?.operand) ? [index] : []));

/** The census control's total, measured: every unit of the composed file the empty One holds, with nothing credited. */
const UNCREDITED = 172767;
/** Each role of `FIRST_DEVICE_KEYS` on each device page of the fifteen, measured. */
const COMPARED = 3691;
/** The sets of those numbers over the fifteen compiles, measured: two compiles share one. */
const DISTINCT_ROLES = 14;
/** The compiles of the fifteen whose device pages draw a page counter: all fifteen, measured. */
const COUNTED = 15;
/** The device lists of the nineteen compiles, measured. */
const DEVICE_LISTS = 102;

const NEEDS = { skip: skipWithoutIrArchive().skip };
const NEEDS_DONOR = { skip: skipUnless('harvest_one_two_devices').skip || skipWithoutIrArchive().skip };

// ---------------------------------------------------------------------------------------------------------
// 8.1.2, the composition.

test('8.1.2: the One test setup composed onto the empty One is not lettered and draws no Logitech picture over, its letters the stated table\'s, and passes every check at 905173 bytes',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  const names = out.steps.map((one) => one.step);
  // The donor taken as ours in place of being lettered, its eighteen sets the stated table's; the builders without the
  // step that leaves out the tour and the Remote Assistant, which the empty One does not hold, and without the step
  // drawing our pictures over Logitech's, since the empty One draws ours.
  assert.deepEqual(names, ['donor', 'a donor of ours', 'devices composed', 'activity composed', 'activity composed', 'activity composed',
    'activity composed', 'activity composed', 'built', 'look', 'placed', 'stamped']);
  assert.equal(out.steps[1]?.detail, '18 sets of our letters');
  assert.equal(out.steps.find((one) => one.step === 'built')?.detail, TOUCH_BUILT.filter((one) => one !== 'pictures').join(', '));
  assert.equal(out.steps.find((one) => one.step === 'devices composed')?.detail, 'LG TV, Plasma, Denon, KPN, Kodi, Switch, Sony HT');
  assert.equal(out.steps.find((one) => one.step === 'placed')?.detail, '1053 composed pieces moved into the body first');
  assert.ok(c.allChecksPass);
  assertStateTableConsistent(c);
  assertQueueFits(c);
  // Every list call, mode entered and hit page named resolves, and every hit page is named: Logitech's nineteen
  // compiles hold no hit page named by nothing, and neither does this, since the device lists drop the one their
  // growth from no row left, section 435.
  const lists = c.actionLists()!.length;
  const records = modeRecords(c)!;
  const pages = touchPages(c)!.records.length;
  assert.deepEqual([lists, records.length, pages], [2787, 117, 24]);
  assert.equal(listCallSites(c).filter((one) => one.list >= lists).length, 0);
  assert.equal(records.flatMap((one) => one.pages).filter((page) => page.lead! >= pages).length, 0);
  assert.equal(namedHitPages(c).size, pages);
  // The unread copy of the Devices record, which the empty One holds by role, section 432, took each activity's case as
  // the record that is looked up did: the idle case and five more in both.
  const roles = touchValueMapRoles(c);
  const cases = (role: 'devices' | 'devices unread'): number[] => valueMaps(c)![roles.records.get(role)!]!.entries.map(([key]) => key);
  assert.equal(cases('devices unread').length, 6);
  assert.deepEqual(cases('devices unread'), cases('devices'));
  // 75300 bytes fewer than the same setup composed onto Logitech's compile of two devices, 980473, section 435.
  assert.equal(c.blob.length, 905173);
});

test('8.1.2: a donor is ours where its font table is the stated one, the empty One unblended, and not a Logitech compile or the empty One blended',
     NEEDS_DONOR, () => {
  assert.equal(touchDonorFaces(empty().container, TOUCH_CHOICES)?.length, 18);
  assert.equal(touchDonorFaces(compile('harvest_one_two_devices'), TOUCH_CHOICES), undefined);
  // The control: the empty One as section 434 builds it by default, blended, holds the stated sets and more.
  assert.throws(() => touchDonorFaces(buildEmptyTouchConfiguration({ skin: 54, builtAt: BUILT_AT }).container, TOUCH_CHOICES),
    /a donor of ours holds 29 font sets where the stated table holds 18, so it is blended/);
});

test('8.1.2: the unblended empty One, the donor, is every byte made by a generator and none carried',
     () => {
  const a = touchAttributedBytes(empty().container, []);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.equal(empty().bytes.length, 362248);
});

// ---------------------------------------------------------------------------------------------------------
// 8.1.4, carried.

test('8.1.4: the setup composed onto the empty One carries no byte of its donor, where the census without the builders\' attribution finds the donor\'s units all over it',
     NEEDS, () => {
  const c = composed().container;
  assert.deepEqual(carried(c, empty().container, written()), {});
  // The control: the census matches, so the zero is the builders' attribution and not a census that finds nothing.
  // What the empty One's own parts look like on the composed file, each unchanged where no builder is credited. It
  // does not show the attribution is not too generous; that is `touchBuiltBytes`' own, which credits a part only
  // where its rebuild is the file byte for byte.
  const uncredited = carried(c, empty().container);
  assert.equal(Object.values(uncredited).reduce((n, one) => n + one, 0), UNCREDITED);
});

test('8.1.4: of the bytes nothing on the path wrote, the composed file shares with Logitech\'s compile of two devices only 130 send lists, 910 bytes, the device composer\'s sends to devices 0 and 1, 65 each, neither device the same',
     NEEDS_DONOR, () => {
  const c = composed().container;
  // The census against the compile the donor path composes onto. The donor here holds no byte of Logitech's and the
  // path reads nothing else but the catalogue, so a match is a coincidence of form: the device composer writes a send
  // of record r to device d as Logitech's compiler does, a send and the device it goes to, so a list for a device's
  // first records matches theirs wherever the device's index and the record's number agree. Device 0 is an LG
  // television in both, another model, and device 1 the Plasma here and the Denon there. The census leaves out what
  // a builder or the catalogue wrote, which shares far more with the compile, the wiring whole, section 418.
  assert.deepEqual(carried(c, compile('harvest_one_two_devices'), written()), { 'slot-10-list': 910 });
  // Held a second way, on the lists themselves: the composed file's sends to device 0 or 1 that a list of Logitech's
  // compile holds byte for byte, each of Logitech's taken once, are 130, seven bytes each.
  const theirs = new Map<string, number>();
  const key = (list: readonly { opcode: number; operand: number }[]): string => list.map((one) => `${one.opcode}:${one.operand}`).join(' ');
  for (const list of compile('harvest_one_two_devices').actionLists()!) theirs.set(key(list), (theirs.get(key(list)) ?? 0) + 1);
  let shared = 0;
  const perDevice = [0, 0];
  for (const list of c.actionLists()!) {
    const send = list.length === 2 && list[0]!.opcode === 0x7d && list[1]!.opcode === 0x7c && list[1]!.operand >> 8 <= 1;
    const left = theirs.get(key(list)) ?? 0;
    if (!send || left === 0) continue;
    theirs.set(key(list), left - 1);
    shared += 1;
    const device = list[1]!.operand >> 8;
    perDevice[device] = (perDevice[device] ?? 0) + 1;
  }
  assert.deepEqual([shared, 7 * shared, ...perDevice], [130, 910, 65, 65]);
  assert.deepEqual(devices(c).slice(0, 2).map((one) => one.name), ['LG_TV', 'Plasma']);
  assert.deepEqual(devices(compile('harvest_one_two_devices')).map((one) => one.name), ['LG_OLED65G26LA', 'Denon_AVR-X4800H']);
});

test('8.1.4: the lists nothing in the composed setup reaches are 16, all the composers\', the commands no key binds and five base slot 9 selections, and none the donor\'s, where the donor path keeps 34 of Logitech\'s',
     NEEDS, () => {
  const c = composed().container;
  const lists = c.actionLists()!;
  const reached = listsReached(c);
  const unreached = [...lists.keys()].filter((index) => !reached.has(index));
  // The empty One's own lists are 1314 and every one is reached on it, so every list nothing reaches here was made
  // on the composed path.
  const donorLists = empty().container.actionLists()!.length;
  assert.equal(donorLists, 1314);
  assert.equal(listsReached(empty().container).size, donorLists);
  assert.ok(unreached.every((index) => index >= donorLists));
  // Eleven sends of a command of the seven devices that no key, page or activity binds, `7D r` and `7C d`, as on the
  // donor path, where they are the composed five's seven; and five lists of one `1F FF0n`, base slot 9 entries 8 to
  // 12, which the activity composer writes and nothing names, as on the donor path.
  const shape = (index: number): string => (lists[index]!.length === 2 && lists[index]![0]!.opcode === 0x7d && lists[index]![1]!.opcode === 0x7c
    ? `send ${lists[index]![1]!.operand >> 8}` : lists[index]!.map((one) => `${one.opcode.toString(16)} ${one.operand.toString(16)}`).join(' | '));
  assert.deepEqual(unreached.map(shape), ['send 0', 'send 0', 'send 1', 'send 1', 'send 2', 'send 2', 'send 3', 'send 4', 'send 5', 'send 5', 'send 6',
    '1f ff08', '1f ff09', '1f ff0a', '1f ff0b', '1f ff0c']);
});

test('8.1.1: the composed setup\'s power off help asks about its seven devices in the order composed, its lists numbered as Logitech\'s compiles number a question\'s',
     NEEDS, () => {
  const c = composed().container;
  const layout = takeApart(c);
  const d = describeTouchHelpScreens(c, layout);
  assert.deepEqual(d.spec.devices.map((one) => one.name), ['LG TV', 'Plasma', 'Denon', 'KPN', 'Kodi', 'Switch', 'Sony HT']);
  // 4n + 2 screens.
  assert.equal(d.spec.screens.length, 30);
  helpListsHold(c, d);
});

/**
 * A power off question's lists on `c` as every English compile holding a device numbers them, section 435: the first
 * two its enter handler runs the wiring's `keyLights.4.1.1` and `keyLights.5.1.1`, the list after `07 FFFB` the
 * wiring's `lights`, and the two its leave handler runs each the only list switching channel 5, or 7, off.
 */
function helpListsHold(c: Container, d: ReturnType<typeof describeTouchHelpScreens>): void {
  const roles = helpNumbering(d).roles;
  const wiring = describeTouchWiring(takeApart(c));
  for (const [role, name] of Object.entries(FIRST_DEVICE_HELP_LISTS)) assert.equal(roles.get(role), wiring.lists[name], role);
  assert.equal(roles.get('enter list 2'), wiring.lists['keyLights.5.1.1']);
  assert.deepEqual(listsHolding(c, offList([5], wiring.variables.keyLight4!)), [roles.get('leave list 1')]);
  assert.deepEqual(listsHolding(c, offList([7], wiring.variables.keyLight5!)), [roles.get('leave list 2')]);
}

// ---------------------------------------------------------------------------------------------------------
// 8.1.1, what the composers state, held on Logitech's compiles.

test('8.1.1: on all nineteen Harmony One compiles the menu marker the rows write is the variable the idle Devices key\'s list writes last, nine variables over them',
     skipUnless(...NINETEEN), () => {
  const markers = NINETEEN.map((name) => {
    const c = compile(name);
    assert.equal(touchMenuMarkerWriter(c), menuMarkerOf(c), name);
    return menuMarkerOf(c);
  });
  assert.equal(new Set(markers).size, 9);
  // The control: the Devices key's list ending on another value is no marker.
  const c = compile('harvest_one_two_devices');
  const idle = handlerSets(c)!.addresses[handlerSetRoles(c).indexOf('idle')]!;
  const bound = taggedList(c, idle)!.entries.find((one) => one.tag === 0xb7)!;
  const table = c.pointerArray(archSlot(c.architecture!, 10))!;
  const at = c.blobOffsetOf(table[bound.operand]!)!;
  const bytes = Uint8Array.from(c.blob);
  const length = bytes[at]!;
  // The last instruction's operand's low byte, after the count and three bytes an instruction: its value 1 made 2.
  bytes[at + 3 * length - 2] = 2;
  assert.equal(touchMenuMarkerWriter(parse(bytes)), undefined);
});

test('8.1.1: on the fifteen English compiles holding a device page, every device page\'s shared numbers are the ones its key names, and they are not one set of numbers',
     skipUnless(...SIXTEEN), () => {
  const names = withDevicePages();
  assert.equal(names.length, 15);
  const all: string[] = [];
  let compared = 0;
  for (const name of names) {
    const c = compile(name);
    const roles = firstDeviceRoles(c);
    const d = describeTouchDevicePages(c, takeApart(c));
    d.spec.devices.forEach((device, s) => {
      const numbers = d.spec.screen.screens[s]!.numbers;
      devicePageSlotRoles(device).forEach((role, k) => {
        if (!(role in FIRST_DEVICE_KEYS)) return;
        assert.equal(numbers[k], roles.get(role), `${name} ${device.name} ${role}`);
        compared += 1;
      });
    });
    all.push(JSON.stringify([...roles]));
  }
  assert.equal(compared, COMPARED);
  // The control: the numbers differ between compiles, fourteen sets of them over the fifteen, so a table of
  // constants would not hold them.
  assert.equal(new Set(all).size, DISTINCT_ROLES);
});


test('8.1.1: on the fifteen, each off list a device page or a power off question leaves by is the only list of its content',
     skipUnless(...SIXTEEN), () => {
  for (const name of withDevicePages()) {
    const c = compile(name);
    const layout = takeApart(c);
    const wiring = describeTouchWiring(layout);
    const d = describeTouchDevicePages(c, layout);
    const roles = new Map<string, number>();
    d.spec.devices.forEach((device, s) => devicePageSlotRoles(device).forEach((role, k) => roles.set(role, d.spec.screen.screens[s]!.numbers[k]!)));
    assert.deepEqual(listsHolding(c, offList([4], wiring.variables.keyLight6!)), [roles.get('light 4 off')], name);
    assert.deepEqual(listsHolding(c, offList([6], wiring.variables.keyLight7!)), [roles.get('light 6 off')], name);
    assert.deepEqual(listsHolding(c, offList([2, 0], wiring.variables.keyLightsB!)), [roles.get('page keys off')], name);
    const help = describeTouchHelpScreens(c, layout);
    if (help.spec.devices.length > 0) helpListsHold(c, help);
  }
  // The control: each role's content names it alone, light 4's off list is not light 6's role, so a rule that took
  // the wrong channel or variable would fail above.
  const c = compile('harvest_one_two_devices');
  const layout = takeApart(c);
  const wiring = describeTouchWiring(layout);
  const d = describeTouchDevicePages(c, layout);
  const roles = new Map<string, number>();
  d.spec.devices.forEach((device, s) => devicePageSlotRoles(device).forEach((role, k) => roles.set(role, d.spec.screen.screens[s]!.numbers[k]!)));
  assert.notDeepEqual(listsHolding(c, offList([4], wiring.variables.keyLight6!)), [roles.get('light 6 off')]);
  assert.notDeepEqual(listsHolding(c, offList([6], wiring.variables.keyLight7!)), [roles.get('page keys off')]);
});

test('8.1.1: on the fifteen, a device page draws in the device lists\' title and left fonts, the activity menu\'s right font, the fixed screens\' item font and the One11 set in the title\'s colours',
     skipUnless(...SIXTEEN), () => {
  let counted = 0;
  for (const name of withDevicePages()) {
    const c = compile(name);
    const fonts = firstDevicePageFonts(c);
    const described = describeTouchDevicePages(c, takeApart(c)).spec.screen.fonts as Record<string, number | undefined>;
    for (const [role, font] of Object.entries(described)) {
      if (font === undefined) continue;
      const want = role.startsWith('title ') ? fonts.title : role === 'count' ? fonts.count : fonts[role as 'row' | 'left' | 'right'];
      assert.equal(font, want, `${name} ${role}`);
      if (role === 'count') counted += 1;
    }
  }
  assert.equal(counted, COUNTED);
  // The control: the fixed screens' item font is not the device lists' left font, nor the title the right font,
  // so the rule names one of several.
  const c = compile('harvest_one_two_devices');
  const fonts = firstDevicePageFonts(c);
  assert.equal(new Set([fonts.title, fonts.row, fonts.left, fonts.right]).size, 4);
});


test('8.1.1: on the sixteen, a device list\'s rows are drawn in the fixed screens\' wide font and not their item font',
     skipUnless(...SIXTEEN), () => {
  for (const name of SIXTEEN) {
    const c = compile(name);
    const layout = takeApart(c);
    const row = describeTouchDeviceLists(c, layout).spec.screen.fonts.row;
    const fixed = describeTouchFixedScreens(c, layout).spec.fonts;
    assert.equal(row, fixed.wide, name);
    // The control: the other font a row could be in.
    assert.notEqual(row, fixed.item, name);
  }
});

// ---------------------------------------------------------------------------------------------------------
// What the corrections and the differences rest on, held on Logitech's compiles.

test('section 435: on all nineteen compiles a device list lays its chrome first, then per page its program, its switch\'s arms and its page record, then its mode entry, and so does the empty One',
     skipUnless(...NINETEEN), () => {
  const order = (c: Container): number => {
    const records = modeRecords(c)!;
    let lists = 0;
    for (const list of touchDeviceLists(c)) {
      const record = records[list.mode]!;
      const first = screenProgram(c, record.pages[0]!.program)!;
      const chrome = first.find((one) => one.opcode === SCREEN_CALL)!.targets[0]!;
      const sequence = [c.blobOffsetOf(chrome)!];
      for (const page of record.pages) {
        sequence.push(c.blobOffsetOf(page.program)!);
        const last = screenProgram(c, page.program)!.at(-1)!;
        if (last.opcode === SCREEN_SWITCH_NARROW) sequence.push(...last.targets.map((one) => c.blobOffsetOf(one)!));
        sequence.push(c.blobOffsetOf(page.address)!);
      }
      sequence.push(c.blobOffsetOf(record.address)!);
      assert.ok(sequence.every((one, k) => k === 0 || one > sequence[k - 1]!), `device list ${list.mode}`);
      lists += 1;
    }
    return lists;
  };
  assert.equal(NINETEEN.reduce((n, name) => n + order(compile(name)), 0), DEVICE_LISTS);
  assert.equal(order(empty().container), 2);
});

test('section 435: no compile of the nineteen holds a hit page no screen page names',
     skipUnless(...NINETEEN), () => {
  for (const name of NINETEEN) assert.equal(namedHitPages(compile(name)).size, touchPages(compile(name))!.records.length, name);
});

test('section 435: of the sixteen, only the compile whose power off help asks about no device holds its show timer',
     skipUnless(...SIXTEEN), () => {
  const holding = SIXTEEN.filter((name) => describeTouchWiring(takeApart(compile(name))).timers.includes('show3'));
  assert.deepEqual(holding, ['harvest_one_families_1']);
  assert.deepEqual(SIXTEEN.filter((name) => describeTouchHelpScreens(compile(name), takeApart(compile(name))).spec.devices.length === 0), holding);
  // And the composed setup keeps it, started by nothing once its help asks about devices.
  const c = composed().container;
  const timer = describeTouchWiring(takeApart(c)).timers.indexOf('show3');
  assert.ok(timer >= 0);
  const starts = (c.actionLists() ?? []).filter((list) => list.some((one) => one.opcode === 0x1f && one.operand === (0xeb00 | timer)));
  assert.equal(starts.length, 0);
});
