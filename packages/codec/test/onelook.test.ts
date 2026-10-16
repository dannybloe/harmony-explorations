/**
 * The Harmony One's look in our own pictures, findings section 399, `todo-compile-one.md` 1.2.11.2: what
 * Logitech's nineteen Harmony One compiles draw on their pads, and the family's steps that draw ours instead,
 * the device look, the colour buttons and the labels centred by their letters.
 *
 * The measurements come first, each over the whole population and asserted as a census rather than a bound,
 * then the steps, each run on one of Logitech's compiles and checked against what it was asked to do.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { type Container, activityScreens, deviceModeMaps, modeRecords, parse } from '../src/index.ts';
import { bitmapPixels, renderVariants } from '../src/render.ts';
import { rgb565, rgbTo565 } from '../src/png.ts';
import { bitmapAt, reachablePrograms, SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../src/screen.ts';
import { characterMap, decode } from '../src/text.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { activityTitleFont } from '../src/families/touch/activityscreen.ts';
import { padLabelShifts, withCentredPadLabels } from '../src/families/touch/centring.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { withColourButtons } from '../src/families/touch/colourbuttons.ts';
import { withTouchDeviceLook } from '../src/families/touch/devicelook.ts';
import { TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH } from '../src/families/touch/labels.ts';
import { DEVICE_PAGE_SLOTS, MODE_TITLE_X, MODE_TITLE_Y, withPageKeyLights } from '../src/families/touch/menus.ts';
import { ACTION_LIST_TABLE_SLOT, archSlot } from '../src/gspm.ts';
import { restamped } from '../src/shared/core.ts';

/** The nineteen Harmony One compiles, as `fonttable.test.ts`'s. */
const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

const u24 = (bytes: Uint8Array, at: number): number => (bytes[at] as number) | ((bytes[at + 1] as number) << 8) | ((bytes[at + 2] as number) << 16);

/** A page's instructions, its own and its chrome's, following every transfer. */
function pageInstructions(c: Container, program: number) {
  const roots = [program];
  for (const one of screenProgram(c, program) ?? []) if (one.opcode === SCREEN_CALL && one.targets[0] !== undefined) roots.push(one.targets[0]);
  return [...reachablePrograms(c, roots).values()].flat();
}

/** Every pad a page draws, at one of the six places, with the text instructions inside it. */
function pads(c: Container, program: number) {
  const all = pageInstructions(c, program);
  return all.filter((one) => one.opcode === SCREEN_DRAW_IMAGE
    && DEVICE_PAGE_SLOTS.some(([x, y]) => x === one.operands[0] && y === one.operands[1]))
    .map((draw) => {
      const [x, y] = [draw.operands[0] as number, draw.operands[1] as number];
      const texts = all.filter((one) => (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT)
        && (one.operands[0] as number) >= x && (one.operands[0] as number) < x + TOUCH_PAD_WIDTH
        && (one.operands[1] as number) >= y && (one.operands[1] as number) < y + TOUCH_PAD_HEIGHT);
      return { draw, x, y, picture: u24(draw.operands, 2), texts };
    });
}

/** `#rrggbb` of a mean of RGB565 pixels. */
const hex = (rgb: readonly number[]): string => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** A pad picture's mean colour, its rim and corners left out. */
function meanOf(c: Container, picture: number): string | undefined {
  const bitmap = bitmapAt(c, picture);
  const pixels = bitmap === undefined ? undefined : bitmapPixels(c, bitmap);
  if (pixels === undefined) return undefined;
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = 2; y < pixels.length - 2; y += 1) {
    for (let x = 3; x < (pixels[0]?.length ?? 0) - 3; x += 1) {
      const p = pixels[y]?.[x];
      if (p === undefined) continue;
      rgb565(p).forEach((v, k) => { sum[k] = (sum[k] as number) + v; });
      n += 1;
    }
  }
  return hex(sum.map((v) => v / n));
}

/** The pixel at (x, y) of a picture, as RGB565. */
function pixelOf(c: Container, picture: number, x: number, y: number): number | undefined {
  const bitmap = bitmapAt(c, picture);
  return bitmap === undefined ? undefined : bitmapPixels(c, bitmap)?.[y]?.[x];
}

const to565 = (colour: string): number => rgbTo565(...([1, 3, 5].map((k) => parseInt(colour.slice(k, k + 2), 16)) as [number, number, number]));

test('section 399: an activity\'s working screen draws its title in the activity menu header\'s font on every page of the fifteen One compiles with activities, and never in a device page\'s',
     skipUnless(...ONE_COMPILES), () => {
  const pages: Record<string, number> = {};
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const shown = activityScreens(c);
    if (shown === undefined || shown.screens.size === 0) continue;
    const records = modeRecords(c)!;
    const menu = activityTitleFont(c);
    const deviceFonts = new Set<number>();
    for (const { mode } of deviceModeMaps(c)) {
      renderVariants(c, records[mode]!.pages[0]!.program, 1, (text) => {
        if (text.x === MODE_TITLE_X && text.y === MODE_TITLE_Y) deviceFonts.add(text.font);
      });
    }
    assert.ok(!deviceFonts.has(menu), `${name}: the menu's title font is a device page's too`);
    let n = 0;
    for (const mode of new Set(shown.screens.values())) {
      for (const page of records[mode]?.pages ?? []) {
        let font: number | undefined;
        renderVariants(c, page.program, 1, (text) => {
          if (text.x === MODE_TITLE_X && text.y === MODE_TITLE_Y && !text.covered) font = text.font;
        });
        if (font === undefined) continue;
        assert.equal(font, menu, `${name}: a working page's title is in font ${font}`);
        n += 1;
      }
    }
    pages[name] = n;
  }
  assert.deepEqual(pages, {
    one_config: 15, one_config_unprogrammed: 2, one_spare_after_sync: 1, one_spare_myharmony: 9, one_spare_20260830: 11,
    calibration_one: 4, calibration_favchannels: 4, calibration_favzero: 9, compiled_protocols: 11, compiled_protocols_2: 11,
    compiled_protocols_3: 11, one_friend_asfound_config: 1, one_friend_legacy_sync_config: 4, phase7_before: 4, phase7_after: 4,
  });
});

test('section 399: Logitech\'s device pad averages #ae6a37 on all eighteen One compiles with a device page, and the plain activity pad #2b98ba on fifteen',
     skipUnless(...ONE_COMPILES), () => {
  const device = new Map<string, number>();
  let plainActivity = 0;
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const records = modeRecords(c)!;
    const deviceModes = new Set(deviceModeMaps(c).map((one) => one.mode));
    const working = new Set(activityScreens(c)?.screens.values() ?? []);
    const means = { device: new Set<string>(), activity: new Set<string>() };
    records.forEach((record, mode) => {
      const kind = deviceModes.has(mode) ? 'device' : working.has(mode) ? 'activity' : undefined;
      if (kind === undefined) return;
      for (const page of record.pages) for (const pad of pads(c, page.program)) means[kind].add(meanOf(c, pad.picture)!);
    });
    for (const mean of means.device) device.set(mean, (device.get(mean) ?? 0) + 1);
    if (means.activity.has('#2b98ba')) plainActivity += 1;
  }
  assert.deepEqual(Object.fromEntries(device), { '#ae6a37': 18 });
  assert.equal(plainActivity, 15);
});

test('section 399: only two One compiles draw a picture of its own under a colour button\'s word, one each for Red, Green, Yellow and Blue',
     skipUnless(...ONE_COMPILES), () => {
  const found: Record<string, string[]> = {};
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const map = characterMap(c)!;
    // Every picture drawn at a pad place, with every word drawn on it.
    const words = new Map<number, Set<string>>();
    for (const record of modeRecords(c)!) {
      for (const page of record.pages) {
        for (const pad of pads(c, page.program)) {
          const label = pad.texts.map((one) => { const glyphs = textGlyphs(c, one); return glyphs === undefined ? '' : decode(glyphs, map); }).join(' ').trim();
          words.set(pad.picture, (words.get(pad.picture) ?? new Set()).add(label));
        }
      }
    }
    // A picture of its own: drawn under one colour word only, and with a centre unlike its edge, which a plain
    // pad that happens to be drawn only under colour words is not.
    const own = [...words].filter(([picture, labels]) => labels.size === 1 && /^(Red|Green|Yellow|Blue)$/.test([...labels][0]!)
      && pixelOf(c, picture, 40, 25) !== pixelOf(c, picture, 10, 25));
    if (own.length > 0) found[name] = own.map(([, labels]) => [...labels][0]!).sort();
  }
  assert.deepEqual(found, {
    one_config: ['Blue', 'Green', 'Red', 'Yellow'],
    one_config_unprogrammed: ['Blue', 'Green', 'Red', 'Yellow'],
  });
});

test('section 399: on a One device page a pad\'s label lines sit at 20, at 15 and 26, or at 9, 20 and 31 pixels into the pad',
     skipUnless(...ONE_COMPILES), () => {
  const heights = new Map<string, number>();
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const records = modeRecords(c)!;
    for (const { mode } of new Map(deviceModeMaps(c).map((one) => [one.mode, one])).values()) {
      for (const page of records[mode]!.pages) {
        for (const pad of pads(c, page.program)) {
          if (pad.texts.length === 0) continue;
          const key = pad.texts.map((one) => (one.operands[1] as number) - pad.y).join(',');
          heights.set(key, (heights.get(key) ?? 0) + 1);
        }
      }
    }
  }
  assert.deepEqual(Object.fromEntries(heights), { 20: 2504, '15,26': 683, '9,20,31': 45 });
});

test('section 399: centring moves each pad label of Logitech\'s compile of two devices up by one or two pixels, moves nothing on a second pass, and puts back a label moved down',
     skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const shifts = padLabelShifts(c);
  const tally = new Map<number, number>();
  for (const shift of shifts.values()) tally.set(shift, (tally.get(shift) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(tally), { '-2': 348, '-1': 20 });
  const centred = withCentredPadLabels(c);
  assert.ok(centred.allChecksPass);
  assert.ok([...padLabelShifts(centred).values()].every((shift) => shift === 0), 'a second pass moves a label');
  // Every byte the step changed is a moved text's y, and nothing else, the restamped checksum aside.
  const changed = [...c.blob.keys()].filter((at) => c.blob[at] !== centred.blob[at] && at < c.blob.length - 6);
  assert.deepEqual(changed, [...shifts].filter(([, shift]) => shift !== 0).map(([at]) => at + 2).sort((a, b) => a - b));
  // The control: one label pushed three pixels down is put back where the step put it.
  const [at] = [...shifts.keys()];
  const pushed = Uint8Array.from(centred.blob);
  pushed[at! + 2] = (pushed[at! + 2] as number) + 3;
  assert.equal(padLabelShifts(parse(pushed)).get(at!), -3);
});

test('section 399: the device look points every device page pad at a box in the family\'s device colour, and leaves the rest of the screen',
     skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const looked = withTouchDeviceLook(c, TOUCH_CHOICES, () => undefined);
  assert.ok(looked.allChecksPass);
  const records = modeRecords(looked)!;
  const fill = to565(TOUCH_CHOICES.deviceBox.fill);
  let n = 0;
  for (const { mode } of new Map(deviceModeMaps(looked).map((one) => [one.mode, one])).values()) {
    for (const page of records[mode]!.pages) {
      for (const pad of pads(looked, page.program)) {
        assert.equal(pixelOf(looked, pad.picture, 40, 25), fill);
        n += 1;
      }
    }
  }
  assert.ok(n > 0);
  // Logitech's pads were not in that colour, so the check above can fail.
  const before = modeRecords(c)!;
  const [first] = deviceModeMaps(c);
  const [pad] = pads(c, before[first!.mode]!.pages[0]!.program);
  assert.notEqual(pixelOf(c, pad!.picture, 40, 25), fill);
});

test('section 399: the colour buttons turn every pad draw named Red, Green, Yellow or Blue into a circle in the family\'s colour, cut its word, and leave every other draw',
     skipUnless('one_config'), () => {
  const c = containerOf('one_config');
  const colours = Object.values(TOUCH_CHOICES.colourButtons).map((one) => to565(one.colour));
  // Per configuration: the pad draws under a colour word, those drawing one of our circles, and every other
  // picture draw of every page, neither a colour word's pad nor a circle.
  const census = (x: Container) => {
    const map = characterMap(x)!;
    let named = 0;
    let circles = 0;
    let others = 0;
    for (const record of modeRecords(x)!) {
      for (const page of record.pages) {
        const all = pads(x, page.program);
        const padAt = new Set(all.map((pad) => pad.draw.start));
        others += pageInstructions(x, page.program).filter((one) => one.opcode === SCREEN_DRAW_IMAGE && !padAt.has(one.start)).length;
        for (const pad of all) {
          const label = pad.texts.map((one) => { const glyphs = textGlyphs(x, one); return glyphs === undefined ? '' : decode(glyphs, map); }).join(' ').trim();
          const circle = colours.includes(pixelOf(x, pad.picture, 40, 25)!);
          if (/^(Red|Green|Yellow|Blue)$/.test(label)) named += 1;
          if (circle) circles += 1;
          if (!circle && !/^(Red|Green|Yellow|Blue)$/.test(label)) others += 1;
        }
      }
    }
    return { named, circles, others };
  };
  const before = census(c);
  const circled = withColourButtons(c, TOUCH_CHOICES);
  assert.ok(circled.allChecksPass);
  const after = census(circled);
  assert.equal(TOUCH_CHOICES.colourButtonLabels, false);
  assert.deepEqual(before, { named: 20, circles: 0, others: before.others });
  // Every colour pad draw now a circle, every word gone, and no other draw lost or gained.
  assert.deepEqual(after, { named: 0, circles: 20, others: before.others });
});

test('section 400: a screen\'s entry switches its page keys\' lights on where its leaving switches them off, and Logitech\'s screens need nothing added',
     skipUnless('one_config'), () => {
  const c = containerOf('one_config');
  const lists = c.actionLists()!;
  const records = modeRecords(c)!;
  // Every screen of the everyday One's configuration whose entry already makes the call is left byte for byte.
  let screens = 0;
  let untouched = 0;
  records.forEach((record, mode) => {
    if (record.pages.length < 2) return;
    screens += 1;
    if (withPageKeyLights(c, mode).blob.length === c.blob.length) untouched += 1;
  });
  assert.deepEqual({ screens, untouched }, { screens: 28, untouched: 28 });
  // The control: the device list's call switching the amber pair on, mode 57's, pointed at the list beside it
  // instead, a same length edit; the step puts the call back, and only that.
  const enter = records[57]!.entries.find((one) => one.tag === 6)!.operand;
  const listAt = c.blobOffsetOf(c.pointerArray(archSlot(12, ACTION_LIST_TABLE_SLOT))![enter]!)!;
  const call = lists[enter]!.findIndex((one) => one.opcode === 0x7f && lists[one.operand]!.some((i) => i.operand === 0xc022));
  assert.equal(call, 1);
  const bytes = Uint8Array.from(c.blob);
  bytes.set([0, 0], listAt + 1 + 3 * call);
  const without = parse(restamped(bytes));
  const back = withPageKeyLights(without, 57);
  assert.equal(back.blob.length, without.blob.length + 3);
  const entering = back.actionLists()![enter]!;
  assert.ok(entering.some((one) => one.opcode === 0x7f && lists[one.operand]?.[0]?.operand === 0xc022));
});
