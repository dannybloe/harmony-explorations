/**
 * A device mode page's chrome and a device mode's key map on a Harmony 600, 650 or 700, built rather than
 * copied off another device in the configuration, section 330, `todo-compile-650.md` 6.2.6 and 6.2.7, and
 * the one wrap rule a label breaks by.
 *
 * The population is the thirteen Logitech compiles section 312 lists, the Harmony 700 pair counted
 * twice. Each check is the shape of sections 319 and 329: the composer builds the thing, the
 * configuration's own is checked against what is built, and a one byte edit shows the check refuses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless, skipWithoutLab } from '@harmony/lab';
import {
  type CensusMember,
  type Container,
  ComposeError,
  FOUR_SLOT_ITEMS,
  FOUR_SLOT_STORED_ORDER,
  HARD_KEYS,
  KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT,
  LABEL_SIZES,
  LABEL_WIDTH,
  LABEL_WRAP_WIDTH,
  activityKeyedRecords,
  archSlot,
  attributeScreens,
  composeDevice,
  composeDeviceScreen,
  compilerCaseOrder,
  compilerTagOrder,
  contentKey,
  deviceListRows,
  deviceModeChrome,
  deviceModeKeyMap,
  modeRecords,
  parse,
  payloadOf,
  pictureBank,
  bitmaps,
  pictureReference,
  reachablePrograms,
  screenProgram,
  screenUnits,
  taggedList,
  textWidthIn,
  valueMaps,
  wrapAtSpaces,
} from '../src/index.ts';
import { namedContentEnd } from '../src/coverage.ts';

/** The thirteen arch 14 compiles, as `compose.test.ts`'s `ARCH14_LISTS`. */
const ARCH14 = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
const H650 = ['h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile',
  'h650_power_hold_compile_2'] as const;

const load = (name: string): Container => parse(payloadOf(require_(name)));

/** The device modes a configuration's device lists enter. */
const deviceModes = (c: Container): number[] => [...new Set(deviceListRows(c).map((row) => row.mode))];

/** A copy of a container's bytes with one byte changed, after checking what was there. */
function withByte(c: Container, at: number, was: number, now: number): Container {
  const out = c.blob.slice();
  assert.equal(out[at], was, `byte ${at} is what the edit expects`);
  out[at] = now;
  return parse(out);
}

/** The base slot 11 programs no value map case names that open with a switch on variable 17. */
function batteryPrograms(c: Container): number[] {
  const table = c.pointerArray(archSlot(14, 11)) ?? [];
  const named = new Set<number>();
  for (const map of valueMaps(c) ?? []) {
    for (const [, target] of map.entries) named.add(target);
    for (const [, , target] of map.ranges) named.add(target);
  }
  return table.flatMap((address, index) => {
    const first = screenProgram(c, address)?.[0];
    return !named.has(address) && first?.opcode === 0x12 && first.operands[0] === 17 ? [index] : [];
  });
}

/** Every picture's content key by address. */
function pictureKeys(c: Container): Map<number, string> {
  const bank = pictureBank(c, namedContentEnd(c)) ?? [];
  const out = new Map<number, string>();
  for (const one of [...bank, ...bitmaps(c)]) {
    const off = c.blobOffsetOf(one.address) as number;
    out.set(one.address, contentKey(c.blob.subarray(off, off + (one.length ?? 0))));
  }
  return out;
}

test('section 330: every device mode page of the thirteen compiles draws the chrome built for it',
     skipWithoutLab(), () => {
  const looks = new Map<string, number>();
  const battery = new Map<number, number>();
  let modes = 0;
  let pages = 0;
  let firstOfSeveral = 0;
  for (const name of ARCH14) {
    const c = load(name);
    // `deviceModeChrome` checks every device page against what it builds and throws on any that differs,
    // so getting here is the per page half; the counts are what that half covered.
    const chrome = deviceModeChrome(c);
    looks.set(chrome.look, (looks.get(chrome.look) ?? 0) + 1);
    battery.set(chrome.battery, (battery.get(chrome.battery) ?? 0) + 1);
    for (const mode of deviceModes(c)) {
      modes += 1;
      pages += modeRecords(c)?.[mode]?.pages.length ?? 0;
    }
    assert.deepEqual([chrome.backFont, chrome.backX], [1, 49], `${name}: 'Back' in font 1, centred at 49`);
    assert.ok(chrome.backHome !== undefined, `${name}: an inline 'Back' to point at`);
    // The battery rule is an order and the look's icon is the check: of the battery programs, the first
    // is the one drawing that icon, and no later one draws it.
    const programs = batteryPrograms(c);
    assert.equal(programs[0], chrome.battery, `${name}: the first battery program`);
    const keys = pictureKeys(c);
    // Every picture each battery program reaches, through every arm and jump.
    const table = c.pointerArray(archSlot(14, 11)) ?? [];
    const draws = programs.map((index) => new Set([...reachablePrograms(c, [table[index] as number]).values()]
      .flatMap((program) => program.map((one) => pictureReference(one)))
      .flatMap((address) => (address === undefined ? [] : [keys.get(address)]))));
    const icon = chrome.look === 'the colour look of 2026' ? 'c7d320f981025b68' : '6a7beeb149ddb000';
    if (programs.length > 1 && draws[0]?.has(icon) && draws.slice(1).every((one) => !one.has(icon))) firstOfSeveral += 1;
  }
  assert.deepEqual(Object.fromEntries([...looks].sort()), {
    'the colour look of 2021 and 2023': 2,
    'the colour look of 2026': 9,
    'the monochrome look': 2,
  });
  // The index is the configuration's own: 1 where the large dynamic program is base slot 11's entry 0.
  assert.deepEqual(Object.fromEntries([...battery].sort()), { 0: 6, 1: 7 });
  assert.equal(firstOfSeveral, 13, 'the first battery program alone draws the look\'s icon');
  // 83 device modes and 639 pages, every one checked against the chrome built for its configuration.
  assert.deepEqual([modes, pages], [83, 639]);
});

test('section 330: the four page pictures of the chrome are among the fixed pictures of section 317 on the Harmony 650',
     skipUnless(...H650), () => {
  const four: (CensusMember & { c: Container })[] = H650.map((name) => {
    const c = parse(require_(name));
    return { name, c, units: screenUnits(c) as NonNullable<ReturnType<typeof screenUnits>> };
  });
  for (const one of four) {
    const chrome = deviceModeChrome(one.c);
    // These four each have a device page of one command, so each holds the one item background.
    assert.notEqual(chrome.single, undefined, `${one.name}: the one item background`);
    const keys = pictureKeys(one.c);
    const wanted = new Set([chrome.single!, chrome.crossed, chrome.topBar, chrome.bottomBar]
      .map((address) => `picture:${keys.get(address)}`));
    const found = attributeScreens(one.units, four).filter((answer) => wanted.has(answer.unit.look));
    assert.equal(found.length, 4, `${one.name}: the four page pictures each once`);
    assert.ok(found.every((answer) => answer.category === 'fixed'), `${one.name}: and every one fixed`);
  }
});

test('section 330: the chrome check refuses a page, a look or a bottom word other than the built one',
     skipUnless('h650_config_region'), () => {
  const pristine = load('h650_config_region');
  const chrome = deviceModeChrome(pristine);
  const mode = deviceModes(pristine)[0] as number;
  const page = modeRecords(pristine)?.[mode]?.pages[0];
  const program = screenProgram(pristine, page?.program as number) ?? [];
  const queued = program[1]!;
  const topBar = program[2]!;
  const word = program.at(-2)!;

  // The top bar placed one row lower.
  assert.throws(() => deviceModeChrome(withByte(pristine, topBar.start + 1 + 5, 16, 17)),
                /queued program and top bar are not the ones built/);
  // The queued battery program the next one.
  assert.throws(() => deviceModeChrome(withByte(pristine, queued.start + 1, chrome.battery, chrome.battery + 1)),
                /queued program and top bar are not the ones built/);
  // The bottom word a pixel right.
  assert.throws(() => deviceModeChrome(withByte(pristine, word.start + 1, 49, 50)), /bottom word is not 'Back'/);
  // The skin of the European 650, whose look is not measured.
  // The architecture record, `arch arch skin 0x0d`, is where `versionWord`'s low byte is read from.
  const record = pristine.blobOffsetOf(pristine.sections[pristine.architectureSlot as number]?.address as number) as number;
  assert.deepEqual([...pristine.blob.subarray(record, record + 4)], [14, 14, 72, 0x0d], 'the architecture record');
  assert.throws(() => deviceModeChrome(withByte(pristine, record + 2, 72, 74)), /skin 74 holds 0 device page looks/);
});

test('section 330: a device mode\'s key map is 47 entries in the compiler\'s hash order, every device mode\'s',
     skipWithoutLab(), () => {
  const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const tags = [...HARD_KEYS.map((key) => press(key.scan)), ...FOUR_SLOT_ITEMS.map((item) => press(item.scan)),
    press(25), 0x2d];
  assert.equal(tags.length, 47);
  const order = compilerTagOrder(tags);
  // The controls: the stored order is not the ascending one, nor the order of the hash unmasked.
  assert.notDeepEqual(order, [...tags].sort((a, b) => a - b));
  const unmasked = (key: number): number => {
    const h = key ^ (key >>> 20) ^ (key >>> 12);
    return h ^ (h >>> 7) ^ (h >>> 4);
  };
  assert.notDeepEqual(order, [...tags].sort((a, b) => unmasked(a) - unmasked(b)));
  // A shared slot other than the measured one is refused: 0x87 and 0xC3 share one in a table of 16 and
  // are stored both ways round in the thirteen compiles.
  assert.throws(() => compilerTagOrder([0x87, 0xc3]), /share a slot whose stored order is not measured/);
  // The same rule at 16 slots is the corner pages' measured order, full and with three items.
  assert.deepEqual(compilerTagOrder(FOUR_SLOT_ITEMS.map((item) => press(item.scan))).map((tag) => tag & 0x3f),
                   FOUR_SLOT_STORED_ORDER);
  assert.deepEqual(compilerTagOrder(FOUR_SLOT_ITEMS.slice(0, 3).map((item) => press(item.scan))).map((tag) => tag & 0x3f),
                   [9, 8, 2]);
  // And on the key sets the case order also accepts, the two are one order.
  for (const length of [16, 21]) {
    const keys = Array.from({ length }, (_, k) => k);
    assert.deepEqual(compilerTagOrder(keys), compilerCaseOrder(keys), `a run of ${length}`);
  }

  let modes = 0;
  let pages = 0;
  let lower = 0;
  let unnamed = 0;
  for (const name of ARCH14) {
    const c = load(name);
    // `deviceModeKeyMap` checks every device mode's own list against what it builds and throws on any
    // that differs; here the built one is compared again, entry by entry, by hand.
    const built = deviceModeKeyMap(c, deviceModeChrome(c));
    assert.deepEqual(built.map((one) => one.tag), order, `${name}: the built order`);
    for (const mode of deviceModes(c)) {
      const entries = modeRecords(c)?.[mode]?.entries ?? [];
      assert.deepEqual(entries.map((one) => one.tag), order, `${name}: device mode ${mode}'s tags`);
      modes += 1;
      // And each page's own list, of one to four corner tags, is stored in the same rule's order at the
      // table size its count gives, 16 slots.
      for (const page of modeRecords(c)?.[mode]?.pages ?? []) {
        const stored = (taggedList(c, page.list)?.entries ?? []).map((one) => one.tag);
        assert.deepEqual(stored, compilerTagOrder(stored), `${name}: a page of device mode ${mode}`);
        pages += 1;
      }
    }
    // The key under Devices: of the two identical records, the modes name one and nothing names the other.
    const devices = activityKeyedRecords(c).devices;
    const used = (built.find((one) => one.tag === press(25))?.operand as number) >> 8;
    const other = devices.find((one) => one !== used) as number;
    if (used < other) lower += 1;
    const names = (record: number): number => (modeRecords(c) ?? []).flatMap((one) => [
      ...one.entries, ...one.pages.flatMap((p) => taggedList(c, p.list)?.entries ?? []),
    ]).filter((entry) => entry.opcode === 0x72 && entry.operand >> 8 === record).length;
    if (names(other) === 0) unnamed += 1;
  }
  assert.deepEqual([modes, pages], [83, 639], 'every device mode the device lists enter, and its pages');
  assert.equal(unnamed, 13, 'the other record under the key under Devices is named by no mode or page');
  assert.equal(lower, 7, 'and the one named is the lower index on seven compiles, so no index rule picks it');
});

test('section 330: every mode and page list of the thirteen compiles is in slot order, and its ties are answered or refused',
     skipWithoutLab(), () => {
  let lists = 0;
  let answered = 0;
  let refused = 0;
  const bothWays = new Map<string, Set<string>>();
  for (const name of ARCH14) {
    const c = load(name);
    for (const record of modeRecords(c) ?? []) {
      const all = [record.entries.map((one) => one.tag),
        ...record.pages.map((page) => (taggedList(c, page.list)?.entries ?? []).map((one) => one.tag))];
      for (const stored of all) {
        if (stored.length < 2) continue;
        lists += 1;
        try {
          assert.deepEqual(compilerTagOrder(stored), stored, `${name}: a list of ${stored.length}`);
          answered += 1;
        } catch (error) {
          if (!(error instanceof RangeError)) throw error;
          refused += 1;
          // A refused list is still in slot order: what is unknown is only which of a shared pair comes first.
          let size = 16;
          while (stored.length > size * 0.75) size *= 2;
          const slots = stored.map((tag) => {
            const h = tag ^ (tag >>> 20) ^ (tag >>> 12);
            return (h ^ (h >>> 7) ^ (h >>> 4)) & (size - 1);
          });
          assert.ok(slots.every((one, k) => k === 0 || (slots[k - 1] as number) <= one), `${name}: slot order`);
          const pair = /0x([0-9a-f]+) and 0x([0-9a-f]+)/.exec(error.message)!;
          const [a, b] = [parseInt(pair[1]!, 16), parseInt(pair[2]!, 16)].sort((x, y) => x - y);
          const first = stored.indexOf(a!) < stored.indexOf(b!) ? 'ascending' : 'descending';
          bothWays.set(`${a},${b}`, (bothWays.get(`${a},${b}`) ?? new Set()).add(first));
        }
      }
    }
  }
  assert.deepEqual([lists, answered, refused], [6921, 4983, 1938]);
  // The pair the reviewer named is stored both ways round, which is why no rule by tag is applied.
  assert.deepEqual([...(bothWays.get(`${0x87},${0xc3}`) ?? [])].sort(), ['ascending', 'descending']);
});

test('section 330: the key map check refuses a device mode or an activity menu other than the built one',
     skipUnless('h650_config_region'), () => {
  const pristine = load('h650_config_region');
  const chrome = deviceModeChrome(pristine);
  const records = modeRecords(pristine) ?? [];
  const mode = deviceModes(pristine)[0] as number;
  const entryAt = (m: number, tag: number): number => {
    const record = records[m]!;
    const k = record.entries.findIndex((one) => one.tag === tag);
    return (pristine.blobOffsetOf(record.start) as number) + 1 + 4 * k;
  };
  const [used, other] = (() => {
    const devices = activityKeyedRecords(pristine).devices;
    const one = (deviceModeKeyMap(pristine, chrome).find((e) => e.tag === 0x99)?.operand as number) >> 8;
    return [one, devices.find((d) => d !== one) as number];
  })();

  // One device mode runs the next base slot 11 program under the program tag.
  assert.throws(() => deviceModeKeyMap(withByte(pristine, entryAt(mode, 0x2d) + 1, chrome.battery, chrome.battery + 1), chrome),
                /key map entry \d+, tag 0x2d, is not the built one/);
  // One device mode maps the key under Devices through the other, identical, record.
  assert.throws(() => deviceModeKeyMap(withByte(pristine, entryAt(mode, 0x99) + 2, used, other), chrome),
                /key map entry \d+, tag 0x99, is not the built one/);
  // The activity menu does instead, so every device mode disagrees with it. Which record is the menu is
  // the composer's own reading, so the test does not restate it: it edits each mode outside the device
  // list that maps the key the same way, one at a time, and exactly one of those edits is refused.
  const outside = records.flatMap((one, m) => !deviceModes(pristine).includes(m) && one.entries.some((e) =>
    e.tag === 0x99 && e.opcode === 0x72 && e.operand >> 8 === used) ? [m] : []);
  const refused = outside.filter((m) => {
    try {
      deviceModeKeyMap(withByte(pristine, entryAt(m, 0x99) + 2, used, other), chrome);
      return false;
    } catch (error) {
      if (!(error instanceof ComposeError) || !/is not the built one/.test(error.message)) throw error;
      return true;
    }
  });
  assert.equal(refused.length, 1, `one of the ${outside.length} modes outside the device list decides the record`);
  // One device mode binds a corner key.
  const corner = entryAt(mode, 0x88);
  assert.equal(pristine.blob[corner + 3], 0);
  assert.throws(() => deviceModeKeyMap(withByte(pristine, corner + 3, 0, 0x73), chrome), /tag 0x88, is not the built one/);
});

test('section 330: a composed device mode carries the built chrome and the built key map',
     skipUnless('h650_config_region', 'h600_config'), () => {
  const TELEVISION = [
    { stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false },
    { stated: 'G:Toshiba 32 Bit:(0x20DF40BF)(Repeat)():3', held: true },
    { stated: 'G:Toshiba 32 Bit:(0x20DF807F)(Repeat)():3', held: true },
  ] as const;
  for (const name of ['h650_config_region', 'h600_config']) {
    const c = load(name);
    const device = composeDevice(c, { label: 'TV', commands: TELEVISION, power: 0 });
    const rows = ['Power', 'Mute', 'Input', 'Guide', 'Menu'].map((label) => ({ label, list: device.lists[0] as number }));
    const screen = composeDeviceScreen(parse(device.bytes), 'TV', rows);
    const after = parse(screen.bytes);
    // Both checks now run over the composed mode as well, which is one of the device list's modes.
    assert.ok(deviceModes(after).includes(screen.mode), `${name}: the new mode is on the device list`);
    const chrome = deviceModeChrome(after);
    const built = deviceModeKeyMap(after, chrome);
    const own = modeRecords(after)?.[screen.mode]?.entries ?? [];
    assert.deepEqual(own.map((one) => one.tag), built.map((one) => one.tag));
    assert.equal(own.filter((one) => one.opcode === 0x7f).length, screen.keys, `${name}: bound keys`);
    assert.equal(modeRecords(after)?.[screen.mode]?.pages.length, 2, `${name}: five rows on two pages`);
  }
});

test('section 330: one wrap threshold, 58, one line limit, 59, and the greedy wrap both label layouts call', () => {
  assert.equal(LABEL_WRAP_WIDTH, LABEL_WIDTH - 1);
  assert.equal(LABEL_WRAP_WIDTH, 58);
  const largest = LABEL_SIZES[0]!;
  const width = (line: string): number | undefined => textWidthIn(largest, line);
  // Section 323's one label of three words, broken greedily where the first space alone would not.
  assert.deepEqual(wrapAtSpaces('Rcvr V- Aux', width), ['Rcvr V-', 'Aux']);
  // A line it cannot measure is not guessed at.
  assert.equal(wrapAtSpaces('Café au lait', width), undefined);
});
