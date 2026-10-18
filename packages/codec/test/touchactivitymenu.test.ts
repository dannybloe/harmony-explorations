/**
 * The Harmony One's activity menu built whole from a description, `todo-compile-one.md` 4.1, findings section 419:
 * the screen "My Activities" with a row per activity, three to a page, its page lists and their copies, the lists
 * they run, and its hit pages, every byte from the activities' names in menu order and the configuration's numbering.
 *
 * **The blind control makes "generated" a test**, as sections 409 and 411 to 415 did: every byte of the menu the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled from and
 * in the layout's own pieces, and the menu still comes back byte for byte.
 *
 * Then the composed path: a row added by building the whole menu again, `withTouchActivityMenuRow`, onto a Logitech
 * compile with no activity, four times, so the menu goes from no row to two pages; after each the result is itself
 * a menu this rebuilds byte for byte, and no hit page is left named by nothing.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  ACTIVITY_STATE_NAME, type Container, type ContainerPiece, ScreenRecordError, composeActivity, composeActivityMenuRow,
  firmwareStateVariableMax, layOutContainer, modeRecords, parse, stateVariables, takeApart, touchPages,
} from '../src/index.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';
import {
  ACTIVITY_MENU_ROWS, activityMenuPages, activityMenuSlotRoles, buildTouchActivityMenu, checkTouchActivityMenu,
  describeTouchActivityMenu, withTouchActivityMenu,
} from '../src/families/touch/activitymenu.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The eighteen English Harmony One compiles in the lab by what their menus hold, with what the check returns on each:
 * rows, pages, the lists built, the hit pages built, the bytes the description reads and the bytes of the menu.
 * Menus of none, one, two, three, seven and eight activities, so of one page and of three. Within a group the bytes
 * and the described count vary by the activities' names (the pair of one activity) and where a text is drawn inline
 * on one compile and by reference on another, whose home is read (the groups of seven).
 */
const MENUS: Record<string, [number, number, number, number, number, number]> = {
  harvest_one_two_devices: [0, 1, 11, 1, 60, 284],
  harvest_one_families_1: [0, 1, 11, 1, 60, 284],
  harvest_one_families_2: [0, 1, 11, 1, 60, 284],
  harvest_one_families_3: [0, 1, 11, 1, 60, 284],
  one_spare_after_sync: [1, 1, 13, 1, 90, 360],
  one_config_unprogrammed: [1, 1, 13, 1, 96, 342],
  calibration_one: [2, 1, 15, 1, 116, 408],
  calibration_favchannels: [2, 1, 15, 1, 116, 408],
  phase7_before: [2, 1, 15, 1, 116, 408],
  phase7_after: [2, 1, 15, 1, 116, 408],
  one_friend_legacy_sync_config: [3, 1, 17, 1, 134, 482],
  one_spare_myharmony: [7, 3, 33, 3, 284, 1086],
  one_spare_20260830: [7, 3, 33, 3, 284, 1086],
  calibration_favzero: [7, 3, 33, 3, 284, 1086],
  compiled_protocols: [7, 3, 33, 3, 348, 1041],
  compiled_protocols_2: [7, 3, 33, 3, 348, 1041],
  compiled_protocols_3: [7, 3, 33, 3, 348, 1041],
  one_config: [8, 3, 35, 3, 314, 1141],
};
const ENGLISH = Object.keys(MENUS);
const DUTCH = 'one_friend_asfound_config';

test('todo-compile-one 4.1: the activity menu of all eighteen English Harmony One compiles is rebuilt byte for byte from a description, menus of 0, 1, 2, 3, 7 and 8 activities, and the Dutch compile is refused by its words',
     skipUnless(...ENGLISH, DUTCH), () => {
  for (const name of ENGLISH) {
    const got = checkTouchActivityMenu(parse(require_(name)));
    assert.deepEqual([got.rows, got.pages, got.lists, got.hitPages, got.described, got.structure], MENUS[name], name);
    // The rules' arithmetic, held against the files rather than restated: three rows to a page and at least one
    // page; a list per item a page binds (two keys and its rows), its copy's as many again, and seven of the menu's
    // own whatever its size: entering, leaving, the header handler's and the chrome's, and the three off lists leaving calls.
    assert.equal(got.pages, Math.max(1, Math.ceil(got.rows / ACTIVITY_MENU_ROWS)), name);
    assert.equal(got.lists, 2 * (2 * got.pages + got.rows) + 7, name);
  }
  // Refused by its words before any byte is compared: the template spells Logitech's English words, and the Dutch
  // compile's fonts hold the letters of its own. No language branch; other languages are out of scope.
  assert.throws(() => checkTouchActivityMenu(parse(require_(DUTCH))), /font 3 has no glyph for 'A'/);
});

test('todo-compile-one 4.1: a blinded input rebuilds the activity menu of all eighteen: no byte of the menu outside the description reaches the build',
     skipUnless(...ENGLISH), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const first = describeTouchActivityMenu(c, takeApart(c));
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
    const d = describeTouchActivityMenu(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchActivityMenu(layout, buildTouchActivityMenu(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 11474 bytes of menus over the eighteen, 8716 of them written by the builder and every one blinded; the
  // description reads 2758 bytes inside them and 476 outside, the glyph codes of the homes where a text is drawn by
  // reference to a copy another program holds.
  assert.deepEqual(totals, { structure: 11474, inside: 2758, outside: 476, blinded: 8716 });
});

test('todo-compile-one 4.1: a description with two rows swapped, a row dropped, a keypad map moved, two rows given one list, the key fonts swapped or two pages named to one hit page is refused, by the builder or the byte comparison',
     skipUnless('one_spare_myharmony'), () => {
  const c = parse(require_('one_spare_myharmony'));
  type Spec = ReturnType<typeof describeTouchActivityMenu>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchActivityMenu(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchActivityMenu(layout, buildTouchActivityMenu(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  const screen = (spec: Spec) => spec.screen.screens[0] as { numbers: number[]; leads: number[] };
  // The first two activities the other way round: each name lands on the other's row, its list unmoved.
  assert.throws(() => tamper((spec) => { [spec.rows[0], spec.rows[1]] = [spec.rows[1] as string, spec.rows[0] as string]; }), moved);
  // A row dropped: seven rows are three pages and six are two, so the template takes the third page's 14 numbers
  // fewer than the description holds.
  assert.throws(() => tamper((spec) => { spec.rows.pop(); }), /the description holds 14 numbers more than Activity Menu takes/);
  // The first row's keypad map one on, by role: the row's list is built with another selection.
  const slot = (spec: Spec, role: string): number => activityMenuSlotRoles(spec.rows).indexOf(role);
  assert.throws(() => tamper((spec) => { screen(spec).numbers[slot(spec, 'set 0')]! += 1; }), moved);
  // The first row's list given the second's index: the two rows' lists are one index built two ways.
  assert.throws(() => tamper((spec) => { screen(spec).numbers[slot(spec, 'row 0')] = screen(spec).numbers[slot(spec, 'row 1')] as number; }),
    /list \d+ is built two ways/);
  // Each key word in a font of its own that holds only its letters, so the two the other way round are refused by
  // the speller before anything is laid out.
  assert.throws(() => tamper((spec) => { [spec.screen.fonts.left, spec.screen.fonts.right] = [spec.screen.fonts.right, spec.screen.fonts.left]; }),
    /font 6 has no glyph for 'O'/);
  // The second page named to the first's hit page, whose areas are another shape.
  assert.throws(() => tamper((spec) => { screen(spec).leads[1] = screen(spec).leads[0] as number; }),
    /two pages of the activity menu of other shapes are both hit page/);
});

test('todo-compile-one 4.1: on all eighteen English compiles each page\'s hit page is named by no other screen, and its areas are the two keys first on the first page and last on every other, the rows top to bottom, then the two edges',
     skipUnless(...ENGLISH), () => {
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const menu = touchActivityMenu(c) as number;
    const records = modeRecords(c)!;
    const table = touchPages(c)!;
    records[menu]!.pages.forEach((page, p) => {
      const areas = table.records[page.lead as number]!.areas;
      // Every hit page ends in the two edge strips, the page arrows, codes 46 and 47, section 45.
      assert.deepEqual(areas.slice(-2).map((area) => area.code), [46, 47], `${name} page ${p}`);
      const content = areas.slice(0, -2);
      // A code is a place on the page, so the keys are told from the rows by their rectangles: a row is the whole
      // width button, x 1257 and 2600 wide in panel units, and a key is anything else.
      const row = (area: { x: number; width: number }): boolean => area.x === 1257 && area.width === 2600;
      const keys = content.flatMap((area, k) => (row(area) ? [] : [k]));
      assert.deepEqual(keys, p === 0 ? [0, 1] : [content.length - 2, content.length - 1], `${name} page ${p}`);
      // And the rows top to bottom, the order they are drawn in: the panel's y runs upwards.
      const ys = content.filter(row).map((area) => area.y);
      assert.deepEqual(ys, [...ys].sort((a, b) => b - a), `${name} page ${p}`);
      const others = records.flatMap((record, mode) => (mode === menu ? [] : (record?.pages ?? []).filter((one) => one.lead === page.lead)));
      assert.equal(others.length, 0, `${name} page ${p}`);
    });
  }
});

/** Compose `labels` as activities one after another, each put on the activity menu, in our pictures where `type` is given. */
function composeActivities(start: Container, labels: readonly string[], type: string | undefined): Container[] {
  let c = start;
  const out: Container[] = [];
  for (const label of labels) {
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    const target = stateVariables(c).find((one) => one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index)!;
    const built = composeActivity(c, { label, targets: [{ variable: target.index, value: 1 }], keys: [{ scan: 20, list: 0 }] });
    c = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set, type === undefined ? {} : { type }).bytes);
    out.push(c);
  }
  return out;
}

/** The hit pages no mode page names. */
function unnamed(c: Container): number[] {
  const leads = new Set((modeRecords(c) ?? []).flatMap((record) => (record?.pages ?? []).map((page) => page.lead as number)));
  return touchPages(c)!.records.flatMap((_, index) => (leads.has(index) ? [] : [index]));
}

test('todo-compile-one 4.1 and 3.2.2.7: four rows added to a Logitech compile with none by building the whole menu again come out a menu this rebuilds byte for byte each time, from one page to two, every hit page named by something',
     skipUnless('harvest_one_two_devices'), () => {
  // Lettered in ours first, as the composed path does, so every name finds its letters.
  const start = parse(letterTouchDonor(parse(require_('harvest_one_two_devices')), TOUCH_CHOICES).bytes);
  // The donor names every hit page of its 29.
  assert.deepEqual([touchPages(start)!.records.length, unnamed(start).length], [29, 0]);
  // Per row: rows, pages, lists and hit pages built, the table's pages and those no page names. The first three
  // rows fit the donor's one page, whose hit page of no row is rebuilt where it is each time, so the table keeps
  // its 29; the fourth opens a second page, whose shape, the rows first and the keys last, is a page of its own.
  const steps = composeActivities(start, ['One', 'Two', 'Three', 'Four'], 'WatchTV');
  const got = steps.map((c) => {
    const check = checkTouchActivityMenu(c);
    return [check.rows, check.pages, check.lists, check.hitPages, touchPages(c)!.records.length, unnamed(c).length];
  });
  assert.deepEqual(got, [
    [1, 1, 13, 1, 29, 0], [2, 1, 15, 1, 29, 0], [3, 1, 17, 1, 29, 0], [4, 2, 23, 2, 30, 0],
  ]);
  // The control, the copying composer, which takes a menu with a row to copy: onto the first row's result it gives
  // the page of two rows a hit page of its own and leaves the page of one, here page 3, named by nothing,
  // the mechanism by which the composed setup came to carry hit pages 3 and 32. The building composer rebuilt the
  // page in place.
  const first = steps[0]!;
  const copied = composeActivities(first, ['Two'], undefined)[0]!;
  assert.deepEqual([touchPages(copied)!.records.length, unnamed(copied)], [30, [3]]);
});
