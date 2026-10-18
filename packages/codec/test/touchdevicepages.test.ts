/**
 * The Harmony One's device pages built whole from a description, `todo-compile-one.md` 4.2, findings section 420:
 * every device mode's own key map (the device's map of the hard keys, section 271), its chrome, its pages of pads
 * and the keys below the screen, their lists and copies, the lists those run but a pad's command, and the hit pages,
 * every byte from the devices' names, their label lines, the keys they bind and the configuration's numbering.
 *
 * **The blind control makes "generated" a test**, as sections 409 and 411 to 419 did: every byte of the device pages
 * the description does not read is overwritten, in the file the description reads and the fonts are spelled from and
 * in the layout's own pieces, and the pages still come back byte for byte.
 *
 * Then the composed path: devices composed onto a Logitech compile by `composeDeviceScreen`, whose pages the same
 * template builds, `withTouchDevicePage`; after each the result is a configuration whose device pages this rebuilds
 * byte for byte, Logitech's and ours.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, ScreenRecordError, composeDevice, composeDeviceScreen, layOutContainer, modeRecords, parse,
  takeApart, taggedList, touchPages,
} from '../src/index.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';
import {
  DEVICE_PAGE_PADS, buildTouchDevicePages, checkTouchDevicePages, describeTouchDevicePages, devicePageSlotRoles,
  touchDeviceModes, withTouchDevicePages,
} from '../src/families/touch/devicepages.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The eighteen English Harmony One compiles in the lab by what their device modes hold, with what the check returns
 * on each: devices, pages, pads, the lists built, the hit pages built, the bytes the description reads and the bytes
 * of the device pages. 89 device modes of one to 22 pages; `harvest_one_families_1`'s two devices carry no mode in
 * the device reader, so the builder finds none there, though its mode 73 is a device page, held apart below.
 */
const DEVICES: Record<string, [number, number, number, number, number, number, number]> = {
  harvest_one_two_devices: [2, 22, 123, 301, 3, 3555, 8684],
  harvest_one_families_1: [0, 0, 0, 0, 0, 0, 0],
  harvest_one_families_2: [2, 17, 96, 237, 3, 2740, 6955],
  harvest_one_families_3: [4, 35, 207, 503, 3, 5018, 14088],
  one_spare_after_sync: [1, 14, 81, 197, 2, 2353, 5724],
  one_config_unprogrammed: [1, 9, 50, 125, 2, 1187, 3573],
  calibration_one: [3, 19, 110, 273, 3, 3193, 7809],
  calibration_favchannels: [3, 19, 110, 273, 3, 3193, 7809],
  phase7_before: [3, 19, 110, 273, 3, 3193, 7809],
  phase7_after: [4, 25, 146, 361, 3, 4095, 10127],
  one_friend_legacy_sync_config: [4, 28, 161, 397, 3, 4115, 11318],
  one_spare_myharmony: [5, 33, 191, 471, 3, 5007, 13221],
  one_spare_20260830: [6, 35, 198, 493, 4, 5281, 14060],
  calibration_favzero: [6, 35, 198, 493, 4, 5281, 14060],
  compiled_protocols: [15, 107, 603, 1483, 5, 16169, 41154],
  compiled_protocols_2: [15, 73, 402, 1013, 6, 11146, 28955],
  compiled_protocols_3: [10, 59, 332, 825, 5, 9201, 23242],
  one_config: [5, 16, 81, 217, 6, 2272, 6923],
};
const ENGLISH = Object.keys(DEVICES);
const DUTCH = 'one_friend_asfound_config';

test('todo-compile-one 4.2: the device pages of all eighteen English Harmony One compiles are rebuilt byte for byte from a description, 89 device modes of one to 22 pages, and the Dutch compile is refused by its words',
     skipUnless(...ENGLISH, DUTCH), () => {
  let modes = 0;
  let longest = 0;
  const padless: string[] = [];
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const got = checkTouchDevicePages(c);
    assert.deepEqual([got.devices, got.pages, got.pads, got.lists, got.hitPages, got.described, got.structure], DEVICES[name], name);
    // The rules' arithmetic, held against the files rather than restated: six pads to a page in reading order and
    // the last page short, at least one page; and the lists, a pad's and its copy's, the right key's and its copy's
    // on every page, each device's entering, leaving, header and chrome lists, and the three off lists every
    // device's leaving calls, built once.
    const d = describeTouchDevicePages(c, takeApart(c));
    for (const device of d.spec.devices) {
      const pads = device.pages.reduce((sum, page) => sum + page.length, 0);
      assert.equal(device.pages.length, Math.max(1, Math.ceil(pads / DEVICE_PAGE_PADS)), `${name} ${device.name}`);
      device.pages.slice(0, -1).forEach((page) => assert.equal(page.length, DEVICE_PAGE_PADS, `${name} ${device.name}`));
      // Logitech's pages select the pad font once a page; our look's selects it before every pad. A mode whose
      // pages draw no pad, `compiled_protocols_3`'s Wii, selects nothing and is read as Logitech's by construction,
      // so it is counted apart rather than claimed.
      assert.equal(device.selectEach, false, `${name} ${device.name}`);
      if (pads === 0) padless.push(`${name} ${device.name}`);
      longest = Math.max(longest, device.pages.length);
    }
    modes += got.devices;
    if (got.devices > 0) assert.equal(got.lists, 4 * got.devices + 2 * got.pages + 2 * got.pads + 3, name);
  }
  assert.deepEqual([modes, longest], [89, 22]);
  // The one device mode of no pad: its single page draws the keys below the screen alone.
  assert.equal(padless.length, 1);
  assert.match(padless[0]!, /^compiled_protocols_3 /);
  // Refused by its words before any byte is compared: the template spells Logitech's English, and the Dutch
  // compile's counter font holds the letters of "pagina's" and not of "pages". No language branch.
  assert.throws(() => checkTouchDevicePages(parse(require_(DUTCH))), /font 14 has no glyph for 'e'/);
});

test('todo-compile-one 4.2: harvest_one_families_1\'s mode 73 is a device page by shape that the device reader names no device for, and the template rebuilds it byte for byte when it is named, one mode of 44 pages and 263 pads',
     skipUnless('harvest_one_families_1'), () => {
  // Found by the blind re-measure of section 420: the compile's two devices carry no mode in `devices`, so the
  // builder, which takes its modes from that reader, builds none there and the mode stays as it was. Named by hand
  // it is the template's shape whole, so what is missing is the reader's, and that stays open.
  const c = parse(require_('harvest_one_families_1'));
  assert.deepEqual(touchDeviceModes(c), []);
  const layout = takeApart(c);
  const d = describeTouchDevicePages(c, layout, undefined, [73]);
  const built = buildTouchDevicePages(c, d.spec);
  const out = layOutContainer(withTouchDevicePages(layout, built, d.place)).bytes;
  assert.equal(firstDifference(out, c.blob), undefined);
  const device = d.spec.devices[0]!;
  const pads = device.pages.reduce((sum, page) => sum + page.length, 0);
  assert.deepEqual([d.spec.devices.length, device.pages.length, pads, built.screens.lists.size, d.structure.size],
                   [1, 44, 263, 4 * 1 + 2 * 44 + 2 * 263 + 3, 15848]);
});

test('todo-compile-one 4.2: a blinded input rebuilds the device pages of all eighteen: no byte of them outside the description reaches the build',
     skipUnless(...ENGLISH), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const first = describeTouchDevicePages(c, takeApart(c));
    totals.structure += first.structure.size;
    for (const at of first.described) totals[first.structure.has(at) ? 'inside' : 'outside'] += 1;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchDevicePages(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchDevicePages(layout, buildTouchDevicePages(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  assert.deepEqual(totals, BLIND);
});

/**
 * The blind control's totals over the eighteen: 225511 bytes of device pages, 140624 of them written by the builder
 * and every one blinded; the description reads 84887 bytes inside them, the names, the label lines and the
 * numbering, every command a key or a pad sends among it, and 2112 outside, the glyph codes of the homes where a text
 * is drawn by reference to a copy another program holds.
 */
const BLIND = { structure: 225511, inside: 84887, outside: 2112, blinded: 140624 };

test('todo-compile-one 4.2: a description with two labels swapped, a pad dropped, a key\'s command moved, two pads given one list, the key fonts swapped, our select before every pad, or two pages of other shapes named to one hit page is refused, by the builder or the byte comparison',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchDevicePages>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchDevicePages(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchDevicePages(layout, buildTouchDevicePages(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // The Denon, mode 82, is the description's first device: its numbers by role.
  const denon = (spec: Spec) => spec.devices[0]!;
  const numbers = (spec: Spec) => spec.screen.screens[0]!.numbers;
  const slot = (spec: Spec, role: string): number => devicePageSlotRoles(denon(spec)).indexOf(role);
  // The first page's first two labels the other way round: each lands on the other's pad, its list unmoved.
  assert.throws(() => tamper((spec) => {
    const page = denon(spec).pages[0]!;
    [page[0], page[1]] = [page[1]!, page[0]!];
  }), moved);
  // The last pad of the first page dropped: every number after it is taken one role early, so a pad's list lands on
  // the index of a list the template builds otherwise.
  assert.throws(() => tamper((spec) => { denon(spec).pages[0]!.pop(); }), /list \d+ is built two ways/);
  // Volume up's command one on, by role: the own key map is built with another list.
  assert.throws(() => tamper((spec) => { numbers(spec)[slot(spec, 'key 3')]! += 1; }), moved);
  // The first pad's list given the second's index: one index built two ways.
  assert.throws(() => tamper((spec) => { numbers(spec)[slot(spec, 'pad 0 0')] = numbers(spec)[slot(spec, 'pad 0 1')]!; }),
    /list \d+ is built two ways/);
  // The two key fonts the other way round: each holds only its own words' letters, so the speller refuses.
  assert.throws(() => tamper((spec) => { [spec.screen.fonts.left, spec.screen.fonts.right] = [spec.screen.fonts.right, spec.screen.fonts.left]; }),
    /has no glyph for/);
  // Our look's select before every pad, on Logitech's page: a select more per pad, so the file differs.
  assert.throws(() => tamper((spec) => { denon(spec).selectEach = true; }), moved);
  // The last page, of other shape, named to the first page's hit page.
  assert.throws(() => tamper((spec) => {
    const leads = spec.screen.screens[0]!.leads;
    leads[leads.length - 1] = leads[0]!;
  }), /two device pages of other shapes are both hit page/);
});

/** Pads to compose, with labels the compile's pad font spells. */
const LABELS = ['Power', 'Mute', 'Input', 'Menu', 'Guide', 'Info', 'Exit', 'Back'];

/** One device composed onto `c` with a page of `count` pads, each sending one of its three commands. */
function composeOne(c: Container, label: string, count: number, keys?: ReadonlyMap<number, number>): Container {
  const device = composeDevice(c, {
    label, power: 0,
    commands: [
      { stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false },
      { stated: 'G:Toshiba 32 Bit:(0x20DF40BF)(Repeat)():3', held: true },
      { stated: 'G:Toshiba 32 Bit:(0x20DF807F)(Repeat)():3', held: true },
    ],
  });
  const rows = LABELS.slice(0, count).map((one, k) => ({ label: one, list: device.lists[k % 3]! }));
  return parse(composeDeviceScreen(parse(device.bytes), label, rows, { compiled: { title: label, keys: keys ?? new Map([[3, device.lists[1]!]]) } }).bytes);
}

test('todo-compile-one 4.2 and 3.2.2.8: devices composed onto a Logitech compile take pages this rebuilds byte for byte, Logitech\'s and ours, one page and two, each page on the hit page of its shape',
     skipUnless('one_config'), () => {
  // Lettered in ours first, as the composed path letters its donor, `letterTouchDonor`: a Logitech compile's fonts
  // hold the letters its own texts use and no others.
  const start = parse(letterTouchDonor(parse(require_('one_config')), TOUCH_CHOICES).bytes);
  const before = touchDeviceModes(start).length;
  const one = composeOne(start, 'Lamp', 3);
  const two = composeOne(one, 'Radio', 8);
  for (const [c, devices] of [[one, before + 1], [two, before + 2]] as const) {
    const got = checkTouchDevicePages(c);
    assert.equal(got.devices, devices);
  }
  const d = describeTouchDevicePages(two, takeApart(two));
  const ours = d.spec.devices.slice(-2);
  assert.deepEqual(ours.map((one) => [one.name, one.pages.map((page) => page.length), one.selectEach, one.keys]),
    [['Lamp', [3], true, [3]], ['Radio', [6, 2], true, [3]]]);
  // Each page's hit page is its shape's: its pads, then the two keys, then the edges, codes by place.
  const records = modeRecords(two)!;
  const table = touchPages(two)!;
  for (const mode of touchDeviceModes(two).slice(-2)) {
    for (const page of records[mode]!.pages) {
      const pads = (taggedList(two, page.list)?.entries ?? []).length - 2;
      const codes = table.records[page.lead!]!.areas.map((area) => area.code);
      assert.deepEqual(codes, [...[48, 49, 50, 51, 52, 53, 43, 44].slice(0, pads + 2), 46, 47], `mode ${mode}`);
    }
  }
  // Refused: a key no device mode binds, scan 34, the Activities key by section 412's reading.
  assert.throws(() => composeOne(start, 'Fan', 1, new Map([[34, 0]])), /a device mode binds no key of scan 34/);
});
