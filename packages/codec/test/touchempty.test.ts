/**
 * The empty Harmony One assembled, `todo-compile-one.md` 7.1.7 to 7.1.9, findings section 434: every part by its
 * generator on section 432's numbering, laid out through section 431's skeleton, for the build year it is built in.
 *
 * **What is held, with no lab**: the file parses and passes every container check, takes apart into itself and fits the
 * Harmony One's writable region; its numbering is what section 432 states; every byte is attributed to a generator and
 * none carried, `touchAttributedBytes`, the builders each describing the finished file and rebuilding it byte for byte;
 * the four screens to show before a write render with nothing missing; and a build year whose Year picker offers a leap
 * year builds too, with the two screens that brings. **The failing controls**: a picture of Logitech's planted in place
 * of ours is found carried, by its owner and its length; one byte of one of our glyphs changed is found carried with
 * its set; a description of Day 28 read with the Day 29 template is refused.
 *
 * **What is held against the lab**: the pictures each screen draws are the ones Logitech's sixteen English compiles of
 * skin 54 draw there; mode 0's own key map is every compile's key table; and on Logitech's two European compiles, the
 * only English ones whose Year picker offers a leap year, the two screens it brings rebuild byte for byte through our
 * templates, their Back keys leading where ours do; on those two and the Dutch one the Day 29 picker's last page is
 * touched through the page the rules give, and the two screens start the other Month and Day pickers' redraw timer.
 *
 * Every figure is exact. The empty One is built once per build year for the whole file, since a build is seconds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { CONFIG_REGION_BASE, WRITABLE_CEILING } from '@harmony/usb';
import {
  type Container, archSlot, layOutContainer, modeRecords, parse, renderPage, takeApart,
} from '../src/index.ts';
import { describeStateTables } from '../src/statetables.ts';
import { contentKey } from '../src/screencategories.ts';
import { withReplacedPictures } from '../src/pictures.ts';
import { unblendedSelects } from '../src/blending.ts';
import { claims } from '../src/coverage.ts';
import { fontSets, glyphOf } from '../src/font.ts';
import { touchPages } from '../src/tables.ts';
import { ScreenRecordError, assertRebuilt, withModeRecords } from '../src/screenrecords.ts';
import { TOUCH_STATE_TABLES } from '../src/families/touch/statetables.ts';
import { TOUCH_PICTURES, readTouchPictures, touchFixedPictures } from '../src/families/touch/pictures.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import {
  EMPTY_TOUCH_CLOCK_SLOTS, EmptyTouchError, type EmptyTouchConfiguration, buildEmptyTouchConfiguration, emptyTouchPictureAt, touchAttributedBytes,
} from '../src/families/touch/empty.ts';
import { type EmptyTouchScreen, emptyTouchNumbering, emptyTouchScreens } from '../src/families/touch/emptynumbering.ts';
import {
  LEAP_MONTH, TOUCH_FIXED_SCREENS, describeTouchFixedScreens, touchFixedScreenModes, touchFixedScreenNames, touchFixedScreenTemplates,
} from '../src/families/touch/fixedscreens.ts';
import { describeTouchFirmwareScreens, TOUCH_FIRMWARE_SCREENS } from '../src/families/touch/firmwarescreens.ts';
import { describeTouchStatusScreens } from '../src/families/touch/statusscreens.ts';
import { describeTouchHelpScreens } from '../src/families/touch/helpscreens.ts';
import { describeTouchActivityMenu } from '../src/families/touch/activitymenu.ts';
import { describeTouchDeviceLists, touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { describeTouchClockHeader } from '../src/families/touch/clockheader.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import { touchHitPageAreas } from '../src/families/touch/hitpages.ts';
import { EMPTY_TOUCH_REDRAW_CLASSES, touchRedrawStarters } from '../src/families/touch/emptywiring.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { buildTemplateScreens, describeTemplateScreens } from '../src/families/touch/screentemplate.ts';
import { readKeys, templateWalk } from '../src/families/touch/numbering.ts';
import { activities, caseQueued, devices, ENTER_MODE } from '../src/inventory.ts';
import { valueMaps } from '../src/valuemap.ts';

/** The stamp the file is built at: a year whose Year picker offers 2025 to 2027 and no leap year. */
const BUILT_AT = '2026-10-23T12:00:00';
/** A build year whose Year picker offers 2028, a leap year. */
const LEAP_BUILT_AT = '2027-03-01T09:00:00';

const builds = new Map<string, EmptyTouchConfiguration>();
const build = (builtAt: string): EmptyTouchConfiguration => {
  const held = builds.get(builtAt) ?? buildEmptyTouchConfiguration({ skin: 54, builtAt });
  builds.set(builtAt, held);
  return held;
};

/** The sixteen English compiles of skin 54, section 405. */
const SIXTEEN = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
/** The places compared per compile: every place of every set's screens but "Nothing to do"'s, and each device list's first. */
const PLACES = 257;

// ---------------------------------------------------------------------------------------------------------
// 7.1.7, the file.

test('7.1.7: the empty One parses, passes every container check, takes apart into itself and fits the Harmony One\'s writable region', () => {
  const { bytes, container: c } = build(BUILT_AT);
  assert.equal(bytes.length, 486460);
  assert.ok(c.allChecksPass);
  assert.equal(c.architecture, 12);
  assert.equal((c.versionWord as number) & 0xff, 54);
  assert.equal(c.builtAt, BUILT_AT);
  assert.deepEqual(layOutContainer(takeApart(c)).bytes, c.blob);
  // From the configuration's base to the stored application firmware, `rails.ts`.
  assert.equal(CONFIG_REGION_BASE[12], 0x040000);
  assert.equal(WRITABLE_CEILING[12], 0x3d0000);
  assert.ok(bytes.length <= 0x3d0000 - 0x040000);
});

test('7.1.7: the empty One holds section 432\'s numbering: 67 modes, 1314 lists, 14 hit pages, 20 one byte variables after the firmware\'s, the assistant started at 0 as Logitech starts it', () => {
  const built = build(BUILT_AT);
  const c = built.container;
  assert.equal(modeRecords(c)?.length, 67);
  assert.equal(c.actionLists()?.length, 1314);
  assert.equal(touchPages(c)?.records.length, 14);
  const states = describeStateTables(takeApart(c), TOUCH_STATE_TABLES);
  // The firmware's 18 are the state tables' own; the configuration's 20 one byte ones follow, then the clock pickers'.
  assert.equal(states.variables.length, 20);
  const assistant = built.numbering.variables.findIndex(([name]) => name === 'assistantStep');
  assert.deepEqual(states.variables[assistant], { first: 0, max: 3, transitions: [] });
  // Every screen set reads back at the modes the numbering gave it.
  // Described as the attribution describes them, with each blended copy's selects pointed back at its source set:
  // a role drawn over two backgrounds selects two sets, which no reader of a single screen set takes.
  const view = unblendedSelects(c, built.blended);
  const layout = takeApart(view);
  const modeOf = (key: string): number => built.numbering.modes.get(key) as number;
  assert.deepEqual(describeTouchFirmwareScreens(view, layout).spec.screens.length, TOUCH_FIRMWARE_SCREENS.length);
  assert.deepEqual(touchFixedScreenModes(c), TOUCH_FIXED_SCREENS.map((name) => modeOf(`fixed:${name}`)));
  assert.equal(describeTouchFixedScreens(view, layout).spec.tour, false);
  assert.equal(describeTouchStatusScreens(view, layout).spec.screens.length, 29);
  assert.deepEqual(describeTouchHelpScreens(view, layout).spec.screens.map((one) => one.mode), [modeOf('help:attempt'), modeOf('help:after')]);
  assert.equal(describeTouchActivityMenu(view, layout).spec.rows.length, 0);
  assert.equal(touchActivityMenu(c), modeOf('activity menu'));
  assert.deepEqual(touchDeviceLists(c), [{ mode: modeOf('idle device list'), kind: 'reached', idle: true }, { mode: modeOf('device list'), kind: 'unreached' }]);
  assert.deepEqual(describeTouchDeviceLists(view, layout).spec.lists.map((one) => one.rows.length), [0, 0]);
  assert.equal(describeTouchClockHeader(view, layout).spec.hours, 12);
});

test('7.1.7: the remote starts on the activity menu, the case its start\'s ready map takes at the location it starts at', () => {
  const built = build(BUILT_AT);
  const c = built.container;
  const ready = valueMaps(c)?.[touchValueMapRoles(c).records.get('menu') as number];
  const start = caseQueued(c, ready?.entries.find(([key]) => key === 0)?.[1] as number);
  assert.deepEqual(start, { opcode: ENTER_MODE, operand: built.numbering.modes.get('activity menu') });
});

test('7.1.7: the screens to show before a write, the activity menu the remote starts on, the idle device list and Options, render with no picture or glyph missing', () => {
  const built = build(BUILT_AT);
  const c = built.container;
  const records = modeRecords(c) ?? [];
  const drawn = ['activity menu', 'idle device list', 'fixed:Options'].map((key) => {
    const rendered = renderPage(c, records[built.numbering.modes.get(key) as number]?.pages[0] as never);
    assert.ok(rendered !== undefined, key);
    return [key, rendered.strings, rendered.pictures, rendered.picturesMissing + rendered.glyphsMissing];
  });
  // The menus draw over the background's fill, section 425, and Options its three rows' buttons.
  assert.deepEqual(drawn, [['activity menu', 4, 0, 0], ['idle device list', 3, 0, 0], ['fixed:Options', 6, 3, 0]]);
});

// ---------------------------------------------------------------------------------------------------------
// 7.1.8, every byte attributed.

test('7.1.8: every byte of the empty One is made by a generator, frame, letters, table headers and builders, and none carried', () => {
  const built = build(BUILT_AT);
  const a = touchAttributedBytes(built.container, built.blended);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.deepEqual(a.generated, {
    'firmware screens': 3247, 'fixed screens': 14127, 'tour and Remote Assistant': 0, 'status screens': 3901, 'clock header': 3558,
    'help screens': 516, 'activity menu': 256, 'device pages': 0, 'device lists': 369, 'activity screens': 0, 'case programs': 450,
    'hit pages': 833, wiring: 4530, 'state tables': 787, 'raw slot 18': 2, 'number senders': 1, pictures: 141849,
    frame: 130, letters: 307641, 'table headers': 4263,
  });
  assert.equal(Object.values(a.generated).reduce((n, v) => n + v, 0), a.total);
});

test('7.1.8, the control: a file whose frame is not the one laying it out again generates is refused, not attributed', () => {
  const built = build(BUILT_AT);
  // A byte of the trailer, the frame claim the parse does not need to find the file's parts: it still takes the file
  // apart, and the checksum no longer agrees.
  const trailer = claims(built.container).find((one) => one.owner === 'trailer');
  assert.ok(trailer !== undefined);
  const bytes = Uint8Array.from(built.container.blob);
  bytes[trailer.start] = (bytes[trailer.start] as number) ^ 0x01;
  const c = parse(bytes);
  assert.equal(c.allChecksPass, false);
  assert.throws(() => touchAttributedBytes(c, built.blended), (error: Error) => error instanceof EmptyTouchError && /does not lay out again into itself/.test(error.message));
});

test('7.1.8, the control: one byte of one of our glyphs changed is found carried, with the set that names it', () => {
  const built = build(BUILT_AT);
  const c = built.container;
  // The set's last code, a character no screen of the empty One spells: a glyph a builder spells would make that
  // builder refuse rather than the letters find it, since a builder reads its words back through the glyphs.
  const set = (fontSets(c) ?? [])[0];
  const glyph = set === undefined ? undefined : glyphOf(c, set, set.first + set.count - 1);
  assert.ok(glyph !== undefined);
  const at = c.blobOffsetOf(glyph.address) as number;
  const bytes = Uint8Array.from(c.blob);
  // The glyph's last byte's low bit flipped: the file still parses and lays out into itself, and the glyph is no
  // longer the one our table draws.
  bytes[at + glyph.length - 1] = (bytes[at + glyph.length - 1] as number) ^ 0x01;
  const planted = layOutContainer(takeApart(parse(bytes))).container;
  assert.ok(planted.allChecksPass);
  const a = touchAttributedBytes(planted, built.blended);
  // Every byte of the glyph is carried, and with it its set's header and 95 addresses, which the letters claim only
  // for a set whose every glyph is ours. The glyph's bytes are reported unclaimed rather than as a glyph: the glyph
  // reader no longer settles on them as one, so no coverage claim reaches them, measured.
  assert.deepEqual(Object.fromEntries(a.carried), { unclaimed: glyph.length, 'slot-7-set': 3 + 3 * 95 });
  assert.equal(glyph.length, 73);
});

test('7.1.8, the control: a picture of Logitech\'s planted in place of ours is found carried, by its owner and every byte of it',
  skipUnless('harvest_one_two_devices'), () => {
    const built = build(BUILT_AT);
    const name = 'battery gauge 3';
    const theirs = readTouchPictures(parse(require_('harvest_one_two_devices'))).pictures.find((one) => one.entry?.name === name);
    const mine = touchFixedPictures(TOUCH_CHOICES).find((one) => one.entry.name === name)?.bytes;
    assert.ok(theirs !== undefined && mine !== undefined);
    const { layout, pictures } = readTouchPictures(built.container);
    const ours = pictures.find((one) => one.piece.bytes.length === mine.length && one.piece.bytes.every((b, k) => b === mine[k]));
    assert.ok(ours !== undefined);
    // Logitech's is another image of the same size: the rule's gauge is not theirs.
    assert.notEqual(contentKey(theirs.piece.bytes), contentKey(mine));
    const planted = layOutContainer(withReplacedPictures(layout, new Map([[ours.piece, theirs.piece.bytes]]), new Map())).container;
    const a = touchAttributedBytes(planted, built.blended);
    assert.deepEqual(Object.fromEntries(a.carried), { 'picture-bank': theirs.piece.bytes.length });
  });

// ---------------------------------------------------------------------------------------------------------
// The build year, a leap year in the Year picker's range.

test('7.1.7: a build year whose Year picker offers a leap year builds, with the leap year\'s Month picker and the Day 29 picker, and every byte attributed', () => {
  assert.deepEqual(touchFixedScreenNames(2027).slice(23), [LEAP_MONTH, 'Day 29']);
  assert.deepEqual(touchFixedScreenNames(2026), TOUCH_FIXED_SCREENS);
  const built = build(LEAP_BUILT_AT);
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.equal(built.bytes.length, 489507);
  // The two after the other fixed screens, so every mode before them keeps its number.
  assert.deepEqual(emptyTouchScreens(2027).slice(65), [`fixed:${LEAP_MONTH}`, 'fixed:Day 29', 'help:attempt', 'help:after']);
  assert.deepEqual(emptyTouchScreens(2027).slice(0, 65), emptyTouchScreens(2026).slice(0, 65));
  assert.equal(modeRecords(c)?.length, 69);
  // The Day 29 picker's last page of five is touched through a fifteenth hit page.
  assert.equal(touchPages(c)?.records.length, 15);
  assert.deepEqual(touchFixedScreenModes(c).slice(23), [65, 66]);
  // Read back: the leap year's button and the long months' Back keys lead to the leap year's Month picker, Day 28's to
  // the other, one number per name across the twenty five.
  const keys = new Map<string, number>();
  const d = describeTouchFixedScreens(unblendedSelects(c, built.blended), takeApart(unblendedSelects(c, built.blended)));
  touchFixedScreenTemplates(2027, false).forEach((screen, k) => readKeys(templateWalk('fixed', screen, `fixed:${screen.name}`), d.spec.screens[k]?.numbers as number[], keys));
  assert.equal(keys.get(`mode ${LEAP_MONTH}`), 65);
  assert.equal(keys.get('mode Month'), built.numbering.modes.get('fixed:Month'));
  assert.equal(keys.get('mode Day 29'), 66);
  const a = touchAttributedBytes(c, built.blended);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.equal(a.generated['fixed screens'], 16708);
  assert.equal(a.generated['hit pages'], 957);
});

// ---------------------------------------------------------------------------------------------------------
// Against Logitech's compiles.

/** Logitech's picture's entry by its content key, the photographs read as the background they are drawn as, section 422. */
function entryNames(): (bytes: Uint8Array) => string | undefined {
  const names = new Map(TOUCH_PICTURES.flatMap((entry) => entry.keys.map((key) => [key, entry.name] as const)));
  return (bytes) => {
    const name = names.get(contentKey(bytes));
    return name === 'blank screen photographs' ? 'whole screen background' : name;
  };
}

test('7.1.7: every screen of the empty One draws at each place the picture Logitech\'s sixteen draw there, the clock header\'s slots too',
  skipUnless(...SIXTEEN), () => {
    const nameOf = entryNames();
    const n = emptyTouchNumbering({ year: 2026 });
    let places = 0;
    const compare = (compile: string, ours: readonly EmptyTouchScreen[], theirs: readonly { pictures: readonly { to: { bytes: Uint8Array } }[] }[], count = ours.length): void => {
      for (let k = 0; k < count; k += 1) {
        const one = ours[k] as EmptyTouchScreen;
        one.places.forEach((place, p) => {
          places += 1;
          assert.equal(emptyTouchPictureAt(one.key, place), nameOf(theirs[k]?.pictures[p]?.to.bytes as Uint8Array), `${compile} ${one.key} ${p}`);
        });
      }
    };
    for (const compile of SIXTEEN) {
      const c = parse(require_(compile));
      const layout = takeApart(c);
      compare(compile, n.screens.firmware, describeTouchFirmwareScreens(c, layout).spec.screens);
      compare(compile, n.screens.fixed, describeTouchFixedScreens(c, layout).spec.screens);
      compare(compile, n.screens.status, describeTouchStatusScreens(c, layout).spec.screens);
      // The attempt screen; "Nothing to do" is the next test's, since one compile holds it.
      compare(compile, n.screens.help, describeTouchHelpScreens(c, layout).spec.screens, 1);
      compare(compile, n.screens['activity menu'], describeTouchActivityMenu(c, layout).spec.screen.screens.slice(0, 1));
      // The device lists' background only, their first place: an empty list draws no row.
      const lists = describeTouchDeviceLists(c, layout).spec.screen.screens;
      for (const one of n.screens['device lists']) {
        places += 1;
        assert.equal(emptyTouchPictureAt(one.key, one.places[0] as { x: number; y: number }), nameOf(lists[0]?.pictures[0]?.to.bytes as Uint8Array), `${compile} ${one.key}`);
      }
      assert.deepEqual(describeTouchClockHeader(c, layout).spec.slots.map((one) => nameOf(one.to.bytes)), EMPTY_TOUCH_CLOCK_SLOTS, compile);
    }
    assert.equal(places, PLACES * SIXTEEN.length);
  });

test('7.1.9: what no compile of Logitech\'s shows: every One compile read holds a device and an infrared group, the empty One none, and fewer modes, lists and base slot 11 entries than any',
  skipUnless(...SIXTEEN, 'one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'), () => {
    const nineteen = [...SIXTEEN, 'one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'].map((name) => parse(require_(name)));
    const census = (c: Container): number[] => [devices(c).length, c.pointerArray(archSlot(12, 5))?.length ?? 0,
      modeRecords(c)?.length ?? 0, c.actionLists()?.length ?? 0, c.pointerArray(archSlot(12, 11))?.length ?? 0];
    const rows = nineteen.map(census);
    assert.deepEqual(rows.map((one) => one[0]), [2, 1, 5, 6, 3, 3, 6, 15, 15, 10, 2, 2, 4, 4, 3, 4, 5, 1, 2]);
    assert.deepEqual(rows.map((one) => one[1]), [2, 1, 5, 6, 3, 3, 6, 15, 15, 9, 2, 2, 4, 4, 3, 4, 5, 1, 2]);
    assert.deepEqual([2, 3, 4].map((k) => Math.min(...rows.map((one) => one[k] as number))), [84, 1955, 29]);
    // The empty One: base slot 5 holds the count 0, which `pointerArray` reads as no array.
    const c = build(BUILT_AT).container;
    assert.deepEqual(census(c), [0, 0, 67, 1314, 27]);
    assert.equal(activities(c).length, 0);
    assert.equal(c.blob[c.blobOffsetOf(c.sections[archSlot(12, 5)]?.address as number) as number], 0);
  });

test('7.1.7: "Nothing to do" draws the pictures harvest_one_families_1, the one compile holding it, draws', skipUnless('harvest_one_families_1'), () => {
  const c = parse(require_('harvest_one_families_1'));
  const help = describeTouchHelpScreens(c, takeApart(c)).spec.screens;
  const nameOf = entryNames();
  const after = emptyTouchNumbering({ year: 2026 }).screens.help[1];
  assert.ok(after !== undefined);
  assert.equal(help.length, 2);
  assert.deepEqual(after.places.map((place) => emptyTouchPictureAt(after.key, place)), help[1]?.pictures.map((one) => nameOf(one.to.bytes)));
});

test('7.1.7: mode 0\'s own key map, the key table, is the one all sixteen compiles hold', skipUnless(...SIXTEEN), () => {
  const ours = takeApart(build(BUILT_AT).container).keyTable.bytes;
  for (const compile of SIXTEEN) assert.deepEqual(takeApart(parse(require_(compile))).keyTable.bytes, ours, compile);
});

/** The two European compiles, built in 2023, whose Year pickers offer 2024 and whose clock pickers are English: the modes. */
const EUROPEAN: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  one_config: { Year: 97, Month: 202, [LEAP_MONTH]: 184, 'Day 28': 62, 'Day 29': 61, 'Day 30': 95, 'Day 31': 98 },
  one_config_unprogrammed: { Year: 78, Month: 70, [LEAP_MONTH]: 51, 'Day 28': 55, 'Day 29': 54, 'Day 30': 76, 'Day 31': 79 },
};

test('section 434: on the two European compiles the Year, Month and Day pickers, the leap year\'s two among them, rebuild byte for byte through our templates, and every Back and year leads where ours does',
  skipUnless(...Object.keys(EUROPEAN)), () => {
    for (const [compile, modes] of Object.entries(EUROPEAN)) {
      const c = parse(require_(compile));
      const year = Number(c.builtAt?.slice(0, 4));
      assert.equal(year, 2023);
      const all = touchFixedScreenTemplates(year, true);
      const templates = Object.keys(modes).map((name) => all.find((one) => one.name === name) as (typeof all)[number]);
      const layout = takeApart(c);
      const d = describeTemplateScreens(c, layout, templates, Object.values(modes), ['title', 'count', 'item', 'wide', 'key']);
      assertRebuilt(layOutContainer(withModeRecords(layout, buildTemplateScreens(c, d.spec, templates), d.place)).bytes, c, d.regions);
      // Every number a name gives read off all seven, so a name read as two numbers is refused: the leap year's Month
      // picker is where the Year's 2024 and Day 29's, Day 30's and Day 31's Back lead, and Day 28's Back the other.
      const keys = new Map<string, number>();
      templates.forEach((one, k) => readKeys(templateWalk('fixed', one, `fixed:${one.name}`), d.spec.screens[k]?.numbers as number[], keys));
      assert.equal(keys.get(`mode ${LEAP_MONTH}`), modes[LEAP_MONTH], compile);
      assert.equal(keys.get('mode Month'), modes.Month, compile);
      assert.equal(keys.get('mode Day 29'), modes['Day 29'], compile);
      // The control: had Day 28's Back led to the leap year's Month picker too, the reading refuses.
      const seeded = new Map([['mode Month', modes[LEAP_MONTH] as number]]);
      const day28 = Object.keys(modes).indexOf('Day 28');
      assert.throws(() => readKeys(templateWalk('fixed', templates[day28] as (typeof all)[number], 'fixed:Day 28'), d.spec.screens[day28]?.numbers as number[], seeded), ScreenRecordError);
      // And the Day 29 template does not read Day 28's screen.
      assert.throws(() => describeTemplateScreens(c, layout, [templates[Object.keys(modes).indexOf('Day 29')] as (typeof all)[number]], [modes['Day 28'] as number], ['title', 'count', 'item', 'key']), ScreenRecordError);
    }
  });

test('section 434: the Day 29 picker\'s last page, on all three compiles of Logitech\'s holding it, is touched through the page the rules give five buttons and the left key',
  skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'), () => {
    for (const [compile, mode] of [['one_config', 61], ['one_config_unprogrammed', 54], ['one_friend_asfound_config', 57]] as const) {
      const c = parse(require_(compile));
      const record = (modeRecords(c) ?? [])[mode];
      const lead = record?.pages[4]?.lead as number;
      const page = touchPages(c)?.records[lead];
      assert.deepEqual(page?.areas.map((one) => ({ area: { x: one.x, width: one.width, y: one.y, height: one.height }, code: one.code })),
        touchHitPageAreas('five buttons'), compile);
    }
  });

test('section 434: on the three compiles of Logitech\'s holding them, the leap year\'s Month picker and the Day 29 picker start the redraw timer the other Month and Day pickers start, and the Year picker another, so both join the clock pickers\' class',
  skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'), () => {
    // Per compile the modes of its Month, leap year's Month and four Day pickers, and its Year picker's: the European
    // two's as the test above reads them, the Dutch one's read off its pickers' Back keys by a scratch census.
    const pickers: readonly (readonly [string, readonly number[], number])[] = [
      ['one_config', [61, 62, 95, 98, 184, 202], 97],
      ['one_config_unprogrammed', [51, 54, 55, 70, 76, 79], 78],
      ['one_friend_asfound_config', [50, 57, 58, 74, 82, 86], 85],
    ];
    for (const [compile, modes, year] of pickers) {
      const starters = touchRedrawStarters(parse(require_(compile)));
      const timersOf = (mode: number): number[] => [...starters].filter(([, by]) => by.includes(mode)).map(([timer]) => timer);
      for (const mode of modes) assert.equal(timersOf(mode).length, 1, `${compile} ${mode}`);
      assert.equal(new Set(modes.flatMap(timersOf)).size, 1, compile);
      // The control: the Year picker starts one timer, and not theirs.
      assert.equal(timersOf(year).length, 1, compile);
      assert.notEqual(timersOf(year)[0], timersOf(modes[0] as number)[0], compile);
    }
    // And the empty One's classes say the same: both in the clock pickers' class, the Year picker in another.
    const classOf = (screen: string): string | undefined => EMPTY_TOUCH_REDRAW_CLASSES.find((one) => one.screens.includes(screen))?.name;
    assert.deepEqual([`fixed:${LEAP_MONTH}`, 'fixed:Day 29', 'fixed:Month', 'fixed:Day 28', 'fixed:Year'].map(classOf),
      ['clock pickers', 'clock pickers', 'clock pickers', 'clock pickers', 'Year and Options']);
  });
