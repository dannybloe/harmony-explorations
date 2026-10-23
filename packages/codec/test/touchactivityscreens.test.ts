/**
 * The Harmony One's activity screens built whole from a description, `todo-compile-one.md` 4.3, findings section 422:
 * every activity's start up screen and working screen, their own key maps, chromes, pages, the lists they run but a
 * pad's command, the copies and the hit pages, every byte from the activities' names, their pads' label lines and
 * what each pad runs, and the configuration's numbering.
 *
 * **The blind control makes "generated" a test**, as sections 409 and 411 to 420 did: every byte of the activity
 * screens the description does not read is overwritten, in the file the description reads and the fonts are spelled
 * from and in the layout's own pieces, and the screens still come back byte for byte.
 *
 * Then the composed path: an activity composed onto a Logitech compile by `buildTouchActivityScreens`, whose screens
 * the same template lays out, `withTouchActivityScreensRebuilt`; the result is a configuration whose activity screens
 * this rebuilds byte for byte, Logitech's and ours.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, ScreenRecordError, activityScreens, layOutContainer, parse, takeApart,
} from '../src/index.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';
import { activityBindings } from '../src/inventory.ts';
import { buildTouchActivityScreens } from '../src/families/touch/activityscreen.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import {
  type ActivityWorking, buildTouchActivityScreenSet, checkTouchActivityScreens, describeTouchActivityScreens,
  touchActivityScreenModes, withTouchActivityScreenSet,
} from '../src/families/touch/activityscreens.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The eighteen English Harmony One compiles in the lab by what their activity screens hold, with what the check
 * returns on each: activities, working screen pages, pads, the lists built, the hit pages built, the bytes the
 * description reads and the bytes of the activity screens. 63 activities; the four compiles of devices alone hold
 * none.
 */
const ACTIVITIES: Record<string, [number, number, number, number, number, number, number]> = {
  harvest_one_two_devices: [0, 0, 0, 0, 0, 0, 0],
  harvest_one_families_1: [0, 0, 0, 0, 0, 0, 0],
  harvest_one_families_2: [0, 0, 0, 0, 0, 0, 0],
  harvest_one_families_3: [0, 0, 0, 0, 0, 0, 0],
  one_spare_after_sync: [1, 1, 3, 68, 2, 298, 1291],
  one_config_unprogrammed: [1, 2, 9, 82, 3, 457, 1735],
  calibration_one: [2, 4, 23, 172, 3, 874, 3342],
  calibration_favchannels: [2, 4, 23, 177, 4, 897, 3573],
  phase7_before: [2, 4, 23, 177, 4, 897, 3573],
  phase7_after: [2, 4, 23, 177, 4, 897, 3573],
  one_friend_legacy_sync_config: [3, 4, 17, 218, 5, 968, 4216],
  one_spare_myharmony: [7, 9, 40, 506, 5, 2148, 9090],
  one_spare_20260830: [7, 11, 49, 535, 6, 2565, 10071],
  calibration_favzero: [7, 9, 40, 509, 5, 2162, 9155],
  compiled_protocols: [7, 11, 49, 535, 6, 2634, 10076],
  compiled_protocols_2: [7, 11, 49, 535, 6, 2634, 10076],
  compiled_protocols_3: [7, 11, 49, 535, 6, 2625, 10085],
  one_config: [8, 15, 55, 606, 7, 2846, 11181],
};
const ENGLISH = Object.keys(ACTIVITIES);
/** The sixteen of skin 54, the population the other touch builders state; `one_config` and its unprogrammed twin are skin 59. */
const SKIN_54 = ENGLISH.filter((name) => name !== 'one_config' && name !== 'one_config_unprogrammed');
const DUTCH = 'one_friend_asfound_config';

test('todo-compile-one 4.3: the activity screens of all eighteen English Harmony One compiles are rebuilt byte for byte from a description, 63 activities\' start up and working screens, and the Dutch compile is refused by its words',
     skipUnless(...ENGLISH, DUTCH), () => {
  assert.equal(SKIN_54.length, 16);
  const tally = {
    activities: 0, favourites: 0, wholeScreen: 0, sequencePads: 0, pauses: 0, picturePads: 0, joined: 0, selectEach: 0,
    longest: 0, padless: [] as string[], shortBeforeLast: [] as string[],
  };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const got = checkTouchActivityScreens(c);
    assert.deepEqual([got.activities, got.pages, got.pads, got.lists, got.hitPages, got.described, got.structure], ACTIVITIES[name], name);
    const d = describeTouchActivityScreens(c, takeApart(c));
    const workings = d.spec.screens.filter((one): one is ActivityWorking => one.kind === 'working');
    for (const screen of d.spec.screens) if (screen.kind === 'start up' && screen.joined) tally.joined += 1;
    for (const one of workings) {
      tally.activities += 1;
      if (one.favourites) tally.favourites += 1;
      if (one.wholeScreen) tally.wholeScreen += 1;
      if (one.selectEach) tally.selectEach += 1;
      tally.longest = Math.max(tally.longest, one.pages.length);
      one.pages.forEach((page, p) => {
        if (page.length === 0) tally.padless.push(`${name} ${one.name}`);
        if (p < one.pages.length - 1 && page.length < 6) tally.shortBeforeLast.push(`${name} ${one.name} ${p + 1}`);
        for (const pad of page) {
          if (pad.icon) tally.picturePads += 1;
          if (pad.runs.length !== 1 || pad.runs[0] !== 'call') tally.sequencePads += 1;
          tally.pauses += pad.runs.filter((run) => run === 'pause').length;
        }
      });
    }
    // The lists, a closure held against each file rather than restated: a start up screen's 52 key lists, its header
    // list and its chrome's queued list; a working screen's entering, leaving, header and chrome lists; on every page
    // a list and its copy's for each key below the screen and each pad; and the off lists every working screen's
    // leaving calls, light 7's and the page keys', and light 5's where an activity has favourites, each built once.
    const keys = workings.reduce((sum, one) => sum + one.pages.length * (one.favourites ? 2 : 1), 0);
    const off = workings.length === 0 ? 0 : 2 + (workings.some((one) => one.favourites) ? 1 : 0);
    assert.equal(got.lists, 54 * got.activities + 4 * got.activities + 2 * (keys + got.pads) + off, name);
  }
  // Logitech draws "Starting" and the name with the title's own blank on every start up screen, section 406; selects
  // the pad font once a page on every working screen; and the rest are the corpus's own: the favourite channels of
  // section 402, screen instruction 1 on 22 of the 23 activities that carry it (the 23rd is the Dutch compile's), the
  // sequences on a pad (`one_spare_20260830` and the three `compiled_protocols`, "TV kijken"), `one_config`'s pads
  // drawing pictures and its two pages short of six before the last, and its one page of no pad.
  assert.deepEqual(tally, {
    activities: 63, favourites: 8, wholeScreen: 22, sequencePads: 8, pauses: 60, picturePads: 14, joined: 63, selectEach: 0,
    longest: 4, padless: ['one_config Chromecast'], shortBeforeLast: ['one_config Bluetooth 1', 'one_config TV kijken 2'],
  });
  // Refused by its words before any byte is compared: the template spells Logitech's English. No language branch.
  assert.throws(() => checkTouchActivityScreens(parse(require_(DUTCH))), /is titled 'Bezig met starten.*', not 'Starting' and a name/);
});

test('todo-compile-one 4.3: the working screens the touch family\'s working record enters are the inventory\'s activity screens on every compile with an activity, and one start up screen stands beside each',
     skipUnless(...ENGLISH), () => {
  let compiles = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const modes = touchActivityScreenModes(c);
    const theirs = [...new Set(activityScreens(c)?.screens.values() ?? [])].sort((a, b) => a - b);
    assert.deepEqual(modes.workings, theirs, name);
    assert.equal(modes.startups.length, modes.workings.length, name);
    if (theirs.length > 0) compiles += 1;
  }
  assert.equal(compiles, 14);
});

test('todo-compile-one 4.3: a blinded input rebuilds the activity screens of all eighteen: no byte of them outside the description reaches the build',
     skipUnless(...ENGLISH), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const first = describeTouchActivityScreens(c, takeApart(c));
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
    const d = describeTouchActivityScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchActivityScreenSet(layout, buildTouchActivityScreenSet(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  assert.deepEqual(totals, BLIND);
});

/**
 * The blind control's totals over the eighteen: 91037 bytes of activity screens, 69417 of them written by the builder
 * and every one blinded; the description reads 21620 bytes inside them, the names, the label lines and the numbering,
 * every command and sequence step a pad runs among it, and 1282 outside, the glyph codes of the homes where a text is
 * drawn by reference to a copy another program holds.
 */
const BLIND = { structure: 91037, inside: 21620, outside: 1282, blinded: 69417 };

test('todo-compile-one 4.3: a description with two labels swapped, a pad dropped, the favourites taken away, instruction 1 taken away, the title\'s blank made a space, our select before every pad, or a page of other shape named to the start up screen\'s hit page is refused, by the builder or the byte comparison',
     skipUnless('calibration_favchannels'), () => {
  const c = parse(require_('calibration_favchannels'));
  type Spec = ReturnType<typeof describeTouchActivityScreens>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchActivityScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchActivityScreenSet(layout, buildTouchActivityScreenSet(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // "Watch TV", the activity with favourites and instruction 1, by its working screen.
  const watchTv = (spec: Spec): ActivityWorking => spec.screens.find((one): one is ActivityWorking => one.kind === 'working' && one.name === 'Watch TV')!;
  // The first page's first two labels the other way round: each lands on the other's pad, its list unmoved.
  assert.throws(() => tamper((spec) => {
    const page = watchTv(spec).pages[0]!;
    [page[0], page[1]] = [page[1]!, page[0]!];
  }), moved);
  // The last pad of the first page dropped: every number after it is taken one place early.
  assert.throws(() => tamper((spec) => { watchTv(spec).pages[0]!.pop(); }), /built two ways|too few|more than|differs/);
  // No favourites: the Favorites key's list and its light 5 lists unread, so the numbers slide.
  assert.throws(() => tamper((spec) => { watchTv(spec).favourites = false; }), /built two ways|too few|more than|differs|is not a variable/);
  // Instruction 1 taken away: seven bytes fewer in its chrome.
  assert.throws(() => tamper((spec) => { watchTv(spec).wholeScreen = false; }), moved);
  // The title's own blank made a space, on every start up screen: another glyph code, another width.
  assert.throws(() => tamper((spec) => { for (const one of spec.screens) if (one.kind === 'start up') one.joined = false; }), moved);
  // Our look's select before every pad, on Logitech's page: a select more per pad.
  assert.throws(() => tamper((spec) => { watchTv(spec).selectEach = true; }), moved);
  // A working page, of other shape, named to the start up screen's hit page.
  assert.throws(() => tamper((spec) => {
    const s = spec.screens.findIndex((one) => one.kind === 'start up');
    const w = spec.screens.indexOf(watchTv(spec));
    spec.screen.screens[w]!.leads[0] = spec.screen.screens[s]!.leads[0]!;
  }), /two activity screen pages of other shapes are both hit page/);
});

/** Pads to compose, with labels our letters spell, each calling one of the compile's lists. */
const ROWS = ['Power', 'Mute', 'Input', 'Menu', 'Guide', 'Info', 'Exit', 'Back'].map((label, k) => ({ label, list: 1 + k }));

test('todo-compile-one 4.3: an activity composed onto a Logitech compile lettered in ours, with no activity or with eight, takes screens this rebuilds byte for byte with Logitech\'s, in our look',
     skipUnless('harvest_one_two_devices', 'one_config'), () => {
  for (const [name, held] of [['harvest_one_two_devices', 0], ['one_config', 8]] as const) {
    const start = parse(letterTouchDonor(parse(require_(name)), TOUCH_CHOICES).bytes);
    // A fresh activity number, the first no activity and not the idle value holds, as section 402's test picks one: the
    // case table's order is pinned only for the numbers Logitech's compiles use.
    const values = new Set(activityBindings(start).map((one) => one.activity));
    const { idle } = touchValueMapRoles(start);
    let fresh = 0;
    while (values.has(fresh) || fresh === idle) fresh += 1;
    const built: Container = parse(buildTouchActivityScreens(start, fresh, 'Lamp', ROWS, {}).bytes);
    const got = checkTouchActivityScreens(built);
    assert.equal(got.activities, held + 1, name);
    // Ours: the highest modes, its pads six to a page in our look, its title's blank a space, since a donor lettered in
    // ours holds both blanks in every set and they draw alike.
    const d = describeTouchActivityScreens(built, takeApart(built));
    const [startup, working] = d.spec.screens.slice(-2);
    assert.deepEqual(startup, { kind: 'start up', name: 'Lamp', joined: false }, name);
    assert.ok(working?.kind === 'working', name);
    assert.deepEqual([working.pages.map((page) => page.length), working.favourites, working.wholeScreen, working.selectEach],
      [[6, 2], false, false, true], name);
  }
});
