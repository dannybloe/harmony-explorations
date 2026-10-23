/**
 * The Harmony One's hit pages the fixed screens name, built from a description, `todo-compile-one.md` 4.8, findings
 * section 417: the touch map's pages (base slot 17) that the firmware screens, the status screens, the fixed screens,
 * the welcome tour and the Remote Assistant are touched through, and the map's table.
 *
 * **The blind control makes "generated" a test**, as sections 409 to 414 did: every byte of the 23 pages and of the
 * table is overwritten in the layout's own pieces, and the sixteen still come back byte for byte. The description
 * reads one lead byte per page, outside the touch map, and finds the configuration's pages through the container.
 *
 * **The rules the builder generates rectangles by are measured here on every page of the nineteen compiles**, not
 * only on the 23, since a rule that holds only where it was written would be a table in disguise.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, ScreenRecordError, bitmapAt, layOutContainer,
  modeRecords, parse, pictureReference, reachablePrograms, takeApart, touchPages,
} from '../src/index.ts';
import {
  HIT_CODES, HIT_EDGES, LEFT_KEY_AREA, RIGHT_KEY_AREA, TOUCH_HIT_PAGES, buildTouchHitPages, buttonArea, checkTouchHitPages,
  describeTouchHitPages, touchHitPageAreas, withTouchHitPages,
} from '../src/families/touch/hitpages.ts';
import { TOUCH_FIRMWARE_SCREENS } from '../src/families/touch/firmwarescreens.ts';
import { touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/** The sixteen English compiles of skin 54, section 405, and the structure each one's 23 pages and table come to. */
const SKIN_54: readonly (readonly [string, number])[] = [
  ['harvest_one_two_devices', 1986], ['one_spare_after_sync', 1992], ['one_spare_myharmony', 2010],
  ['one_spare_20260830', 2016], ['calibration_one', 1995], ['calibration_favchannels', 2001], ['calibration_favzero', 2016],
  ['compiled_protocols', 2019], ['compiled_protocols_2', 2022], ['compiled_protocols_3', 2022],
  ['harvest_one_families_1', 1986], ['harvest_one_families_2', 1986], ['harvest_one_families_3', 1989],
  ['one_friend_legacy_sync_config', 2007], ['phase7_before', 2001], ['phase7_after', 2004],
];
const SIXTEEN = SKIN_54.map(([name]) => name);
/** The two European compiles of skin 59 and the Dutch one. */
const EUROPEAN = ['one_config', 'one_config_unprogrammed'];
const DUTCH = 'one_friend_asfound_config';
const NINETEEN = [...SIXTEEN, ...EUROPEAN, DUTCH];

const cache = new Map<string, Container>();
const load = (name: string): Container => {
  let c = cache.get(name);
  if (c === undefined) { c = parse(require_(name)); cache.set(name, c); }
  return c;
};

/** A rectangle's four numbers, for comparing by geometry. */
const form = (a: { x: number; width: number; y: number; height: number }): string => `${a.x},${a.width},${a.y},${a.height}`;
/** A page's whole form, every area's rectangle and code in order. */
const pageForm = (areas: readonly { x: number; width: number; y: number; height: number; code: number }[]): string =>
  areas.map((a) => `${form(a)}:${a.code}`).join(' ');
/** A built hit page's form, as `touchHitPageAreas` generates it. */
const builtForm = (name: string): string => pageForm(touchHitPageAreas(name).map(({ area, code }) => ({ ...area, code })));

test('todo-compile-one 4.8: the 23 hit pages the fixed screens name are rebuilt byte for byte from a description on the sixteen English compiles of skin 54, the map\'s table with them, 34 of their 79 rectangles stated and the rest generated',
     skipUnless(...SIXTEEN), () => {
  assert.equal(TOUCH_HIT_PAGES.length, 23);
  for (const [name, structure] of SKIN_54) {
    assert.deepEqual(checkTouchHitPages(load(name)), { pages: 23, areas: 125, stated: 34, described: 23, structure }, name);
  }
  // 125 areas: 46 edge strips and 79 rectangles, 45 of them by the button and key rules and 34 stated, 30 the tour's.
  // The structure is the pages' 1500 area bytes and 398 header bytes, and the table's 1 + 3 per page.
  assert.equal(1500 + 398 + 1 + 3 * 29, 1986);
});

test('todo-compile-one 4.8: on all nineteen compiles every area\'s code is its place on the page, the two edge strips close every page, every page\'s areas sit in front of its header and are its own, no two pages are one shape, and the table is in first use order',
     skipUnless(...NINETEEN), () => {
  const totals = { pages: 0, areas: 0, codes: 0, edges: 0, placed: 0, firstUse: 0, unique: 0 };
  for (const name of NINETEEN) {
    const c = load(name);
    const map = touchPages(c);
    assert.ok(map !== undefined, name);
    const owners = new Set<number>();
    for (const page of map.records) {
      totals.pages += 1;
      const items = page.areas.slice(0, -2);
      const edges = page.areas.slice(-2);
      totals.areas += items.length;
      items.forEach((area, k) => { if (area.code === HIT_CODES[k]) totals.codes += 1; });
      if (edges.length === 2 && edges.every((area, k) => form(area) === form(HIT_EDGES[k]!) && area.code === 46 + k)) totals.edges += 1;
      const first = page.start - 12 * page.areas.length;
      if (page.areas.every((area, k) => c.blobOffsetOf(area.address) === first + 12 * k)) totals.placed += 1;
      for (const area of page.areas) owners.add(area.address);
    }
    assert.equal(owners.size, map.records.reduce((sum, page) => sum + page.areas.length, 0), `${name}: an area two pages share`);
    // First use: walking the modes and their pages in order, each new hit page named takes the next index.
    const order: number[] = [];
    for (const record of modeRecords(c) ?? []) for (const page of record.pages) if (!order.includes(page.lead as number)) order.push(page.lead as number);
    if (order.length === map.records.length && order.every((lead, k) => lead === k)) totals.firstUse += 1;
    if (new Set(map.records.map((page) => pageForm(page.areas))).size === map.records.length) totals.unique += 1;
  }
  assert.deepEqual(totals, { pages: 662, areas: 2524, codes: 2524, edges: 662, placed: 662, firstUse: 19, unique: 19 });
});

/**
 * Per mode page of a compile: its hit page's rectangles before the edges, the grid buttons its programs draw, and
 * whether it draws a word on each half below the screen, y 190 or lower.
 */
function pagesDrawn(c: Container): { mode: number; page: number; have: Set<string>; buttons: Set<string>; left: boolean; right: boolean }[] {
  const map = touchPages(c);
  const out: ReturnType<typeof pagesDrawn> = [];
  (modeRecords(c) ?? []).forEach((record, mode) => record.pages.forEach((page, p) => {
    const have = new Set((map?.records[page.lead as number]?.areas ?? []).slice(0, -2).map(form));
    // A set: a page drawing one button in several arms of a switch, Options' rows, counts it once.
    const buttons = new Set<string>();
    let left = false;
    let right = false;
    for (const [, program] of reachablePrograms(c, [page.program])) {
      for (const one of program) {
        const picture = pictureReference(one);
        const bitmap = picture === undefined ? undefined : bitmapAt(c, picture);
        if (bitmap !== undefined && bitmap.rows === 50) {
          const area = buttonArea(one.operands[0] as number, one.operands[1] as number, bitmap.stride);
          if (area !== undefined) buttons.add(form(area));
        }
        if ((one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE) && (one.operands[1] as number) >= 190) {
          if ((one.operands[0] as number) < 88) left = true; else right = true;
        }
      }
    }
    out.push({ mode, page: p, have, buttons, left, right });
  }));
  return out;
}

test('todo-compile-one 4.8: on every mode page of the nineteen compiles a button drawn on the grid has its rectangle on the page\'s hit page, 8430 of 8430, and the keys below the screen go with a word there, the right one both ways',
     skipUnless(...NINETEEN), () => {
  const t = { pages: 0, buttons: 0, found: 0, lowered: 0, cells: 0, cellsFromButtons: 0, leftWord: 0, leftWordArea: 0, leftArea: 0, leftAreaWord: 0, rightWord: 0, rightWordArea: 0, rightArea: 0, rightAreaWord: 0 };
  const strays = new Set<string>();
  for (const name of NINETEEN) {
    for (const one of pagesDrawn(load(name))) {
      t.pages += 1;
      for (const button of one.buttons) {
        t.buttons += 1;
        if (one.have.has(button)) t.found += 1;
        // The control: the same rectangle without the five pixel rise, 81 panel units lower, is on no page.
        const [x, width, y, height] = button.split(',').map(Number) as [number, number, number, number];
        if (one.have.has(form({ x, width, y: y - 81, height }))) t.lowered += 1;
      }
      // Rectangles of a button's size and column that no button drawn on the page explains.
      for (const have of one.have) {
        const [x, , , height] = have.split(',').map(Number);
        if (height !== 807 || ![1257, 1772, 2422].includes(x as number)) continue;
        t.cells += 1;
        if (one.buttons.has(have)) t.cellsFromButtons += 1; else strays.add(have);
      }
      const hasLeft = one.have.has(form(LEFT_KEY_AREA));
      const hasRight = one.have.has(form(RIGHT_KEY_AREA));
      if (one.left) { t.leftWord += 1; if (hasLeft) t.leftWordArea += 1; }
      if (hasLeft) { t.leftArea += 1; if (one.left) t.leftAreaWord += 1; }
      if (one.right) { t.rightWord += 1; if (hasRight) t.rightWordArea += 1; }
      if (hasRight) { t.rightArea += 1; if (one.right) t.rightAreaWord += 1; }
    }
  }
  assert.deepEqual(t, {
    pages: 4810, buttons: 8430, found: 8430, lowered: 0, cells: 8487, cellsFromButtons: 8430,
    leftWord: 3128, leftWordArea: 3064, leftArea: 3064, leftAreaWord: 3064, rightWord: 2871, rightWordArea: 2871, rightArea: 2871, rightAreaWord: 2871,
  });
  // The 57 other cells are three per compile, all on two pages of the tour, whose buttons are one picture; the
  // module states them.
  assert.deepEqual([...strays].sort(), ['1257,1284,1547,807', '1257,2600,1498,807', '2422,1134,1547,807']);
});

/** Every mode of the four screen builders' screens, the firmware screens being the head's first ten. */
function fixedScreenModes(c: Container): number[] {
  return [...TOUCH_FIRMWARE_SCREENS.map((_, mode) => mode), ...touchStatusScreenModes(c), ...touchFixedScreenModes(c), ...touchTourScreenModes(c).modes];
}

test('todo-compile-one 4.8: the 103 pages of the fixed screens name the 23 hit pages built and no other, each page the same one on all sixteen; the census\'s two other hit pages in every compile are named by setup screens alone',
     skipUnless(...SIXTEEN), () => {
  const built = new Map(TOUCH_HIT_PAGES.map((name) => [builtForm(name), name]));
  const byPage = new Map<string, Set<string>>();
  const everywhere = new Map<string, number>();
  const namedBySetup: Set<string>[] = [];
  for (const name of SIXTEEN) {
    const c = load(name);
    const map = touchPages(c)!;
    const records = modeRecords(c) ?? [];
    const modes = fixedScreenModes(c);
    // Ten firmware screens, 29 status screens, 23 fixed screens, eleven tour screens and five of the Remote Assistant.
    assert.equal(modes.length, 78, name);
    let pages = 0;
    const named = new Set<string>();
    for (const [k, mode] of modes.entries()) {
      (records[mode]?.pages ?? []).forEach((page, p) => {
        pages += 1;
        const shape = built.get(pageForm(map.records[page.lead as number]!.areas));
        assert.ok(shape !== undefined, `${name}: mode ${mode} page ${p + 1} names a hit page not built`);
        named.add(shape);
        const key = `${k} ${p}`;
        byPage.set(key, new Set([...(byPage.get(key) ?? []), shape]));
      });
    }
    assert.equal(pages, 103, name);
    assert.equal(named.size, 23, name);
    for (const one of new Set(map.records.map((page) => pageForm(page.areas)))) everywhere.set(one, (everywhere.get(one) ?? 0) + 1);
    // The pages no fixed screen names but that a setup screen does.
    const fixed = new Set(modes);
    const setupNamed = new Set<string>();
    namedBySetup.push(setupNamed);
    records.forEach((record, mode) => record.pages.forEach((page) => {
      if (fixed.has(mode)) return;
      const one = pageForm(map.records[page.lead as number]!.areas);
      if (!built.has(one)) setupNamed.add(one);
    }));
  }
  assert.ok([...byPage.values()].every((shapes) => shapes.size === 1));
  const inAll = [...everywhere].filter(([, n]) => n === 16).map(([one]) => one);
  assert.equal(inAll.length, 25);
  const others = inAll.filter((one) => !built.has(one));
  // A device page's six commands with both page keys, and the generic help screen's, drawn "Attemping to fix the
  // problem...", the help feature's and section 405's modes 69 and 91.
  assert.deepEqual(others.map((one) => one.split(' ').length).sort((a, b) => a - b), [5, 10]);
  // And each is named by a setup screen on every one of the sixteen, not only somewhere among them.
  assert.equal(namedBySetup.length, 16);
  assert.ok(others.every((one) => namedBySetup.every((set) => set.has(one))));
});

test('todo-compile-one 4.8: a blinded input rebuilds all sixteen: no byte of the 23 pages or the table reaches the build',
     skipUnless(...SIXTEEN), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of SIXTEEN) {
    const c = load(name);
    const first = describeTouchHitPages(c, takeApart(c));
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
    const d = describeTouchHitPages(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchHitPages(layout, buildTouchHitPages(d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 32052 bytes of pages and tables over the sixteen, every one blinded; the description reads 23 lead bytes a
  // compile, 368 in all, every one outside the touch map.
  assert.deepEqual(totals, { structure: 32052, inside: 0, outside: 368, blinded: 32052 });
});

test('todo-compile-one 4.8: the head\'s three pages are indices 0, 1 and 2 on all sixteen and the other twenty move with the setup; two pages\' indices swapped, a page moved onto a setup page\'s index or the table one page short give a different file, and two at one index is refused',
     skipUnless(...SIXTEEN), () => {
  const spread = new Map<string, Set<number>>();
  for (const name of SIXTEEN) {
    const c = load(name);
    describeTouchHitPages(c, takeApart(c)).spec.indices.forEach((index, k) => {
      const shape = TOUCH_HIT_PAGES[k] as string;
      spread.set(shape, new Set([...(spread.get(shape) ?? []), index]));
    });
  }
  assert.deepEqual(TOUCH_HIT_PAGES.slice(0, 3).map((shape) => [...(spread.get(shape) ?? [])]), [[0], [1], [2]]);
  assert.equal(TOUCH_HIT_PAGES.slice(3).filter((shape) => (spread.get(shape)?.size ?? 0) > 1).length, 20);

  const c = load('harvest_one_two_devices');
  type Described = ReturnType<typeof describeTouchHitPages>;
  const tamper = (change: (d: Described) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchHitPages(c, layout);
    change(d);
    const out = layOutContainer(withTouchHitPages(layout, buildTouchHitPages(d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const differs = /the rebuilt file differs/;
  const at = (shape: string): number => TOUCH_HIT_PAGES.indexOf(shape);
  // Six buttons and four buttons the other way round: each page's areas land where the other's sat.
  assert.throws(() => tamper((d) => {
    const [six, four] = [d.spec.indices[at('six buttons')]!, d.spec.indices[at('four buttons')]!];
    d.spec.indices[at('six buttons')] = four;
    d.spec.indices[at('four buttons')] = six;
  }), differs);
  // Four buttons onto hit page 3, the activity menu's, a setup page: built over it, and its own page carried.
  assert.throws(() => tamper((d) => { d.spec.indices[at('four buttons')] = 3; }), differs);
  // Two pages at one index.
  assert.throws(() => tamper((d) => { d.spec.indices[at('four buttons')] = d.spec.indices[at('six buttons')]!; }), /is built twice/);
  // The table without its last page, a setup page: one count and three pointer bytes short.
  assert.throws(() => tamper((d) => { d.place.runs.pop(); }), differs);
});

test('todo-compile-one 4.8: beyond the sixteen, the Dutch compile holds all 23 pages as built and the two European ones all but the Time of Day picker\'s, the everyday One\'s the Remote Assistant\'s question too; all three are refused by the fixed screens\' finder, the European two since section 434 for the Time of Day picker skin 59 does not hold rather than for a second Month picker',
     skipUnless(...EUROPEAN, DUTCH), () => {
  const missing = [...EUROPEAN, DUTCH].map((name) => {
    const forms = new Set(touchPages(load(name))!.records.map((page) => pageForm(page.areas)));
    return TOUCH_HIT_PAGES.filter((shape) => !forms.has(builtForm(shape)));
  });
  // Skin 59 has no Time of Day picker, section 405, and the everyday One's compile no Remote Assistant, section 403.
  assert.deepEqual(missing, [['question', 'two buttons'], ['two buttons'], []]);
  // Section 434 reads the second Month picker as the leap year's, so the European two stop at the picker they lack.
  assert.throws(() => checkTouchHitPages(load('one_config')), /0 screens of the look of Time of Day/);
  assert.throws(() => checkTouchHitPages(load('one_config_unprogrammed')), /0 screens of the look of Time of Day/);
  assert.throws(() => checkTouchHitPages(load(DUTCH)), /0 screens of the look of Options/);
});
