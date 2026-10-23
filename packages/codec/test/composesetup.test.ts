/**
 * The test setup composed onto a Logitech compile for the Harmony One, `composeSetup`, `todo-compile-one.md` 1.2:
 * since 1.2.11.2.7 the family's look runs inside it, the donor lettered first and the rest over the composed
 * file, where a lab script used to run those steps after it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  type ComposedSetup, type Container, SCREEN_OWNERS, archSlot, claims, composeSetup, deviceModeMaps, modeRecords, parse, pointers,
  readRecipe, screenUnits, taggedList, touchPages,
} from '../src/index.ts';
import { characterMap } from '../src/text.ts';
import { timers } from '../src/tables.ts';
import { touchScreenLightTimer } from '../src/families/touch/screenlight.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { TOUCH_BUILT, type TouchBuiltBytes, touchBuiltBytes } from '../src/families/touch/builders.ts';
import { describeTouchHelpScreens, touchHelpScreenModes } from '../src/families/touch/helpscreens.ts';
import { layOutContainer, takeApart } from '../src/frame.ts';
import { loosen, placePieces } from '../src/placer.ts';
import { dropLists, instructionSites, listCallSites } from '../src/assemble.ts';
import { assertStateTableConsistent, handlerSets } from '../src/sections.ts';
import { assertQueueFits } from '../src/queue.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { checkTouchWiring } from '../src/families/touch/wiring.ts';
import { checkTouchScreenTexts } from '../src/families/touch/screentexts.ts';
import { withoutTourAndAssistant } from '../src/families/touch/withouttour.ts';
import { listsReached } from './screenlists.ts';
import { IMAGE_TABLE_SLOT, fontSets } from '../src/font.ts';
import { buildTouchFontTable, donorGlyphOrder } from '../src/families/touch/fontsets.ts';
import { colour565 } from '../src/families/touch/activitypictures.ts';
import { touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { deviceListMenus } from '../src/shared/menus.ts';
import { startSwitchedOn } from '../src/shared/activities.ts';
import { ENTER_MODE, activities, activityScreens, caseQueued, deviceListRowMode, devices } from '../src/inventory.ts';
import { valueMaps } from '../src/valuemap.ts';

const recipe = () => readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/one-test.json', import.meta.url), 'utf8')));

// Either missing skips a test; spreading the two would let the second's `false` hide the first's reason.
const NEEDS = { skip: skipUnless('harvest_one_two_devices').skip || skipWithoutIrArchive().skip };

/** The composition, once for every test here: it takes about a minute. */
let composedOnce: ComposedSetup | undefined;
const composed = (): ComposedSetup => {
  composedOnce ??= composeSetup(recipe(), { donor: require_('harvest_one_two_devices'), archive: IR_ARCHIVE!, builtAt: '2026-10-15T12:00:00' });
  return composedOnce;
};

test('the One test setup composed onto Logitech\'s compile of two devices comes out lettered in ours, in the family\'s look, placed by the placer, with every check passing',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  // The look's two halves, in place: lettered before anything is composed, the look after, then the placement of
  // `todo-compile-one.md` 6.2, section 426, and the stamp last.
  const names = out.steps.map((one) => one.step);
  assert.deepEqual([names[0], names[1], names.at(-3), names.at(-2), names.at(-1)], ['donor', 'lettered', 'look', 'placed', 'stamped']);
  // The composers' parked infrared blocks and headers and key maps went into the body first, 578 and 5, which the placer has no
  // rule for. Then everything parked and the bank are in the placer's order: placing the file again changes no byte,
  // and the control, the file with its glyphs and font sets reversed in front of base slot 7, lays out differently
  // and comes back to the composed bytes when placed.
  assert.equal(out.steps.find((one) => one.step === 'placed')?.detail, '583 composed pieces moved into the body first');
  const placedAgain = layOutContainer(placePieces(loosen(takeApart(c))).layout).bytes;
  assert.ok(Buffer.from(placedAgain).equals(Buffer.from(c.blob)), 'placing the composed setup again moves something');
  const apart = takeApart(c);
  const reversed = { ...apart, sections: apart.sections.map((one, slot) => (slot === 7 && one !== undefined ? { ...one, before: [...one.before].reverse() } : one)) };
  assert.ok(!Buffer.from(layOutContainer(reversed).bytes).equals(Buffer.from(c.blob)), 'the control does not move anything');
  assert.ok(Buffer.from(layOutContainer(placePieces(loosen(reversed)).layout).bytes).equals(Buffer.from(c.blob)), 'the control is not placed back');
  assert.ok(c.allChecksPass);
  assert.equal(characterMap(c)?.alphabet, 'oxanium');
  // The screen light at the family's default.
  assert.equal(timers(c)!.records[touchScreenLightTimer(c)!]!.duration, TOUCH_CHOICES.screenLightSeconds);
  // Every device page binds both keys below the screen, the composed ones included, section 401: seven devices, the
  // two the donor held and the five composed. The keys are the two codes its hit page offers after the pads, 43 and
  // 44 on a page of six and the next two codes on a short page, section 420, so all 41 pages are held, the short
  // ones too, and both keys at the codes the hit page names.
  const records = modeRecords(c)!;
  const hits = touchPages(c)!;
  const modes = [...new Set(deviceModeMaps(c).map((one) => one.mode))];
  assert.equal(modes.length, 7);
  let keyed = 0;
  for (const mode of modes) {
    for (const page of records[mode]!.pages) {
      // The hit page's codes but the edges: the pads, then the left and the right key.
      const codes = (hits.records[page.lead!]?.areas ?? []).map((area) => area.code).filter((code) => code !== 46 && code !== 47);
      const keyCodes = codes.slice(-2);
      const bound = (taggedList(c, page.list)?.entries ?? []).filter((one) => keyCodes.some((code) => one.tag === (0x80 | code)) && one.opcode !== 0);
      assert.equal(bound.length, 2, `mode ${mode}`);
      keyed += 1;
    }
  }
  assert.equal(keyed, 41);
  // Every list a device page binds opens with the click, as Logitech's do, section 404: a pad's, the click and a call
  // of its command, and the right key's, the click and the value map entering the device list. Since the device
  // pages are built, `todo-compile-one.md` 4.2, a page binds its keys at the codes after its pads, so the right key
  // of a short page is no longer at 44; told apart by what follows the click. 223 pads, the donor's 123 and the
  // composed 100, and a right key on each of the 41 pages, the donor's 22 and the composed devices' 19.
  const lists = c.actionLists()!;
  let pads = 0;
  let keys = 0;
  let pages = 0;
  for (const mode of modes) {
    for (const page of records[mode]!.pages) {
      pages += 1;
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        const scan = entry.tag & 0x3f;
        if (entry.opcode !== 0x7f) continue;
        const body = lists[entry.operand] ?? [];
        assert.deepEqual([body[0]?.opcode, body[0]?.operand], [0x75, 0x0fca], `mode ${mode} scan ${scan}`);
        if (body[1]?.opcode === 0x7f) pads += 1;
        else if (body[1]?.opcode === 0x72) keys += 1;
      }
    }
  }
  assert.deepEqual([pads, keys, pages], [223, 41, 41]);
  // And no binding of any page clicks twice: an activity screen's pad clicks itself and calls the command under
  // the device page's click, and a sequence's key copy, which has none, section 404. Logitech's compiles hold none.
  const clicks = (at: number, seen: Set<number>): number => {
    if (seen.has(at)) return 0;
    seen.add(at);
    return (lists[at] ?? []).reduce((sum, one) => sum + (one.opcode === 0x75 && one.operand === 0x0fca ? 1
      : one.opcode === 0x7f ? clicks(one.operand, seen) : 0), 0);
  };
  const twice = records.flatMap((record, mode) => (record?.pages ?? []).flatMap((page) => (taggedList(c, page.list)?.entries ?? [])
    .filter((one) => one.opcode === 0x7f && clicks(one.operand, new Set()) > 1).map((one) => `${mode}:${one.tag & 0x3f}`)));
  assert.deepEqual(twice, []);
  // Its length is pinned so a change shows here first: 1750855 until each composed row got its click, section 404,
  // and 1751852 once the Radio sequence's pad took the key copy, without a click of its own. 1751962 since
  // `todo-compile-one.md` 3.2.2.3, 110 bytes more: the activity composer gives each of the five activities a case in
  // the unread copy of the Devices record as Logitech's compiles do, five bytes of case and five of program each, 50,
  // and enters every case it makes in base slot 11's table, the five unread ones and the fifteen it made before,
  // three bytes an entry, 60, section 416. 1756549 since 3.2.2.4, 4587 bytes more: the power off help asks about
  // the five composed devices too, all five having a power variable, section 415: four screens each, 20, with
  // their 160 lists, 4038, and their entries in the mode table and base slot 10, three bytes each, 540; the attempt
  // screen resending the two of them sent unasked, two instructions, 6; and the attempt line broken in two in our
  // letters, 3, the "If not" paragraph flowing onto three lines as Logitech's does. 1756491 since 3.2.2.7, 58 bytes
  // fewer: the activity menu built whole, section 419. Its hit pages 143 fewer, the page of five rows' two pages
  // where the copying composer left four, two of them named by nothing; its lists 105 more, nine lists, the second
  // page's two key lists where the copying composer reused the first page's, their copies' and five of the copies'
  // row lists, as Logitech's copies run lists of their own; and its programs 20 fewer: each font, the rows' and the
  // counter's, selected once a page rather than once a text, 10, the second page's key words drawn by reference to
  // the first page's, 10, the header's total and "pages" under one select, 2, less 2 for the second page's counter
  // drawn by reference, a byte a text more. 1758133 since 3.2.2.8, 1642 bytes more: every composed device's pages
  // built by the device page template, section 420, in Logitech's shape. Its lists 1655 more, 158 lists and their
  // pointers: each of the five devices' own entering, leaving, header and chrome lists where the copying composer
  // shared another device's or drew no header, 20, the right key's list on each of the 19 pages and on its copy, 38,
  // and the copies' own pad lists, 100, where the copying composer's copies ran the page lists' own; a hit page of
  // three pads, 109, where every composed page named the page of six pads; and the programs 122 fewer, the chrome
  // and the pages in Logitech's shape where the copying composer drew its own. 1512234 since `todo-compile-one.md`
  // 4.10, 245899 bytes fewer: the welcome tour's eleven screens and the start's Remote Assistant's five left out by
  // default, section 421, with the 121 lists only they reached, their twelve hit pages and the eleven pictures only
  // they drew, Options on one page without the two rows that led there, and every text drawn inline once and by
  // reference after, in address order, over what is left. 1099602 since `todo-compile-one.md` 5.3.1 and 5.3.3, 412632
  // bytes fewer, section 422: the whole screen background one picture where Logitech's compile stores three, and the
  // three photographs the six blank screens draw drawn as it, five pictures of 77445 bytes out, 387225; the device pages' six pads of
  // Logitech's out of the bank, 48630, which the look had pointed every draw away from and left drawn by nothing; and
  // two font sets more, 23223: measured, the two sets blended against the orange are 10930 and 12287 bytes, 23217, and
  // their two entries in the font table are 6 more. Our letters blended for the settings screens' buttons, now one
  // orange where Logitech's were a gradient. Every other picture of ours is the size of Logitech's it replaces, with its mask, so encodes to
  // as many bytes.
  // 1099596 since 4.10.2: Options of one page enters without the page keys' on list, its entering list two steps,
  // six bytes, shorter, which lit the page keys over a screen with nothing to turn to at the bench.
  // 1022262 since `todo-compile-one.md` 5.3.4, section 425, 77334 fewer: the black background one fill a draw where
  // it was a picture, the picture's 77445 out of the bank and each of its 111 draws a byte longer, seven bytes for six.
  // 1060973 since 4.3.3, 38623 bytes fewer, section 424: every device list built whole and each of the five activities
  // given a list of its own, five modes of three pages more, their records, page lists and copies 710 bytes, 109 lists
  // more and their pointers 1390, and 381 screen programs more, 1889, the rows' own lists where the composer shared
  // one; and the four pictures only the list nothing enters drew, Logitech's two row pictures and two icons, 42612
  // bytes, out of the bank, since our look now draws every list.
  // 983644 with both, 5.3.4's fill and 4.3.3's lists: 77329 below 1060973, the picture's 77445 less a byte for each
  // of the 116 draws, the seven lists' chromes five of them. 983694 since 4.3.3's fix at the bench: each activity's
  // own copy of the scan 55 list its key map runs, entering its own device list, five lists of two instructions and
  // their pointers, 50 bytes; the working screens' Devices keys repointed in place.
  assert.equal(c.blob.length, 983694);
});

// ---------------------------------------------------------------------------------------------------------
// What the composed setup still carries out of its donor, `todo-compile-one.md` 3.2's listing.

/**
 * The bytes nothing on the composed path takes from the donor: the frame computes the header, the section table,
 * the marker, the architecture record, the clock section and the trailer (6.1), and the letterer writes every
 * glyph set (1.2.7), 22 of whose glyphs on this donor, a space in nine sets and shapes such as `.` and `I`, come
 * out byte for byte as Logitech's.
 */
const NEVER_CARRIED = new Set(['header', 'section-table', 'marker', 'trailer', 'slot-1-arch', 'slot-3-clock', 'glyph', 'font-set']);

interface Unit { kind: string; key: string; skeleton: string; bytes: number }

/**
 * A configuration cut into units: its screen bytes as `screenUnits` cuts them, keyed by the verbatim form (where a
 * thing sits abstracted), and every other byte by the first claim of `coverage.ts` that holds it, keyed by its
 * bytes with every address field the census knows zeroed. A unit's skeleton is its key with the texts, fonts,
 * text positions and pictures abstracted, which is what is left of a screen once ours are put in.
 *
 * `built`, per byte, is nonzero where a builder on the composed path reproduces the byte, `touchBuiltBytes`, since
 * `todo-compile-one.md` 3.2.2: a unit counts only its bytes no builder reproduces, and a unit every byte of which
 * a builder reproduces is left out, so it neither counts nor takes a donor unit a carried one could match. A
 * builder's part comes out byte for byte as Logitech's in places, the wiring whole, and only this tells it from
 * the donor's.
 */
function unitsOf(c: Container, built?: Uint8Array): Unit[] {
  const out: Unit[] = [];
  const owned = new Uint8Array(c.blob.length);
  const left = (from: number, to: number): number => {
    let n = 0;
    for (let i = from; i < to; i += 1) if (built === undefined || built[i] === 0) n += 1;
    return n;
  };
  for (const unit of screenUnits(c)!) {
    const skeleton = unit.verbatim
      .replace(/(^|[ :|#[])(4|5)\(([0-9a-f]{4})\)[0-9a-f]*/g, '$1T').replace(/F\d+/g, 'F').replace(/@pic:[0-9a-f?]+/g, '@pic');
    for (const range of unit.ranges) owned.fill(1, range.start, range.start + range.length);
    const bytes = unit.ranges.reduce((n, range) => n + left(range.start, range.start + range.length), 0);
    if (bytes === 0) continue;
    out.push({ kind: unit.kind === 'mode' ? `mode ${unit.role}` : unit.kind, key: `${unit.kind}|${unit.verbatim}`,
               skeleton: `${unit.kind}|${skeleton}`, bytes });
  }
  const zeroed = c.blob.slice();
  for (const field of pointers(c)) zeroed.fill(0, field.at, field.at + 3);
  for (const claim of claims(c)) {
    if (SCREEN_OWNERS.has(claim.owner)) continue;
    let fresh = 0;
    for (let i = claim.start; i < claim.start + claim.length; i += 1) {
      if (owned[i] === 0) {
        owned[i] = 1;
        if (built === undefined || built[i] === 0) fresh += 1;
      }
    }
    if (fresh === 0) continue;
    const key = `${claim.owner}|${Buffer.from(zeroed.subarray(claim.start, claim.start + claim.length)).toString('hex')}`;
    out.push({ kind: claim.owner, key, skeleton: key, bytes: fresh });
  }
  // Every byte is claimed, so nothing is left out of the count below by being in no unit.
  assert.equal(owned.indexOf(0), -1);
  return out;
}

/**
 * The output's bytes per kind whose unit the donor holds: verbatim first, then by skeleton among the donor's units
 * not taken, each donor unit taken once. `built` is the output's bytes a builder reproduces, which are not carried.
 */
function carried(out: Container, donor: Container, built?: Uint8Array): Record<string, number> {
  const tally = (units: Unit[], field: 'key' | 'skeleton'): Map<string, number> => {
    const m = new Map<string, number>();
    for (const one of units) m.set(one[field], (m.get(one[field]) ?? 0) + 1);
    return m;
  };
  const theirs = unitsOf(donor);
  const keys = tally(theirs, 'key');
  const skeletons = tally(theirs, 'skeleton');
  const result: Record<string, number> = {};
  const take = (one: Unit): void => { result[one.kind] = (result[one.kind] ?? 0) + one.bytes; };
  const rest: Unit[] = [];
  for (const one of unitsOf(out, built).filter((unit) => !NEVER_CARRIED.has(unit.kind))) {
    const left = keys.get(one.key) ?? 0;
    if (left === 0) { rest.push(one); continue; }
    keys.set(one.key, left - 1);
    skeletons.set(one.skeleton, (skeletons.get(one.skeleton) ?? 0) - 1);
    take(one);
  }
  for (const one of rest) {
    const left = skeletons.get(one.skeleton) ?? 0;
    if (left <= 0) continue;
    skeletons.set(one.skeleton, left - 1);
    take(one);
  }
  return result;
}

/** What the builders on the composed path reproduce of the composed setup, measured on it once: about half a minute. */
let builtOnce: TouchBuiltBytes | undefined;
const builtBytes = (): TouchBuiltBytes => {
  builtOnce ??= touchBuiltBytes(composed().container, composed().blended);
  return builtOnce;
};

test('todo-compile-one 3.2.2, 4.3, 4.3.3 and 4.10: the firmware screens, the fixed screens, the status screens, the clock header, the help screens, the activity menu, the device pages, the device lists, the activity screens, the case programs, the hit pages, the wiring, the state tables, raw slot 18, base slot 16\'s table and the pictures of the composed setup come out of the touch family\'s builders, run on the composed path and measured on the result, and the tour and Remote Assistant are left out',
     NEEDS, () => {
  const out = composed();
  // On the path: one step after the composers and before the look, naming the sixteen parts in the order built.
  const names = out.steps.map((one) => one.step);
  assert.equal(out.steps.find((one) => one.step === 'built')?.detail, TOUCH_BUILT.join(', '));
  assert.ok(names.indexOf('activity composed') < names.indexOf('built') && names.indexOf('built') < names.indexOf('look'));
  // The look blended our letters for fifteen backgrounds, and a screen's description reads the result only with
  // those selects pointed back: as the look left it, the firmware screens' body text is in two fonts. Thirteen until
  // `todo-compile-one.md` 5.3.1, section 422: the settings screens' buttons are one orange of ours, which the labels
  // of the clock pickers' pads and the rows of Options are blended against, two sets more.
  assert.equal(out.blended.length, 15);
  assert.throws(() => touchBuiltBytes(out.container, []), /firmware screens: the firmware screens select two fonts for one role/);
  // Measured on the finished file, no memory of the path: each part described, rebuilt and held to the file byte
  // for byte, through the look's blending and centring; then its bytes, and of those the description's.
  const a = builtBytes();
  // The status screens' 3872 and the clock header's 3558 are the figures 3.2.1 listed for them, the clock header's
  // being its four programs' 3516 and its six lists' 42; its sixteen pictures and base slot 11's table are not in it.
  // The case programs' 572, since 3.2.2.3, are their 25 programs, 341, their seven lists, 82, the six toggles' and
  // the all off's, and base slot 11's table, 149, its 49 entries the clock header's four, the 25 and four cases for
  // each of the five composed activities. The hit pages' 2013 are the 23 pages the fixed screens name, 1898, and
  // the touch map's table over all 38 pages, 115. The state tables' rose by 25 with them, the five cases the unread
  // copy of the Devices record took.
  //
  // The help screens' 6245, since 3.2.2.4, are the chain of seven devices, 30 screens and their 236 lists: the
  // donor's ten screens and 76 lists, 2198 on the donor, and the composed five's 20 and 160, section 415.
  //
  // The activity menu's 786, since 3.2.2.7, are the menu of five rows on two pages built whole, 810 bytes, its
  // screen, its 25 lists and its two hit pages, section 419, less its three off lists, 24, which the firmware screens
  // build first; its 204 described below are 207 less those lists' three variables. The hit pages' 2013 came down to 2007 with it: the table holds two
  // pages fewer, three bytes an entry.
  //
  // The device pages' 16155, since 3.2.2.8, are the seven device modes, 41 pages, built whole, section 420: their
  // own key maps, chromes, pages, switches and tails, page lists and copies, the 559 lists those reach but a pad's
  // command (each device's entering, leaving, header and chrome lists, 28, the three off lists, a right key's list
  // and its copy's on each page, 82, and a pad's list and its copy's, 446), and their four hit pages; its 6269 described are the devices' names and label lines and the numbering,
  // every command a key or a pad sends among it. The hit pages' 2010, three more, are the table's entry for the
  // page of three pads the composed devices' short pages added.
  //
  // Raw slot 18's 2 and base slot 16's 1, since `todo-compile-one.md` 6.7, are the two zero bytes every One
  // container holds and the number sender table's count of zero, the composers making no favourite channel sent
  // as a number; neither reads a byte as a value.
  //
  // The firmware screens', the fixed screens', the tour's and the wiring's rose by 138, 1193, 115 and 98 with
  // `todo-compile-one.md` 6.5, section 418: the lists below the screens that the wiring does not build, 183 lists,
  // and the 14 the wiring's own variables' transitions call. 1544 bytes, where the carried lists below came down by
  // 1347: the other 197 are 17 lists below the clock pickers' tag `0x29` handlers, which name a state variable the
  // composed path renumbered (`0x29` on the donor, `0x37` here), so they matched no donor list and were never carried.
  //
  // Since `todo-compile-one.md` 4.10, section 421, the tour's eleven screens and the Remote Assistant's five are left
  // out on the composed path by default, so their part builds nothing, where it built 4015 and described 719. The
  // fixed screens' 14332 came down to 14087 with Options on one page without the Remote Assistant's row and the
  // Tutorial's, and their 4038 described rose to 4156, the texts' form rule applied once more over what is left
  // moving inline copies; since 4.10.2 14081 and 4152, Options' entering list without the page keys' on list, two
  // steps and its two numbers fewer. The device pages' 16155 to 16139 and their 6269 described to 6273 the same way. With the
  // tour kept the composed setup breaks that rule ("pages" drawn inline where the rule draws it by reference), and
  // without it the setup keeps it, `checkTouchScreenTexts`, the test below. The hit pages' 2010 to
  // 863, the twelve pages only the sixteen were touched through and their entries in the table; and the wiring's
  // 4625 to 4560 and its 1274 described to 1250, the start's ladder in the form of Logitech's compile without the
  // Remote Assistant.
  //
  // The activity screens' 2888, since `todo-compile-one.md` 4.3, section 423, are the five activities' start up and
  // working screens built whole, each of one page: their own key maps, entries, chromes and pages, the page lists and
  // copies, the lists those run but a pad's command, and their five hit pages, the start up screens' one and four of
  // the working screens' shapes. What the screens share with a set built before them is that set's: the header list
  // the device pages', the key lights' lists the wiring's and the firmware screens', and the empty list the 52 keys of
  // a start up screen run, the configuration's first, the firmware screens'. The composed file is the same byte for
  // byte as before the builder joined the path, so nothing of the others moved. Its 1068 described are the names, the
  // label lines and the numbering, every command a pad sends and every picture among it.
  //
  // Since `todo-compile-one.md` 5.3.4, section 425, the background is a fill in each program that drew it, a byte
  // longer a draw, and each builder that describes such a program builds the fill: the firmware screens' 3237 to 3247,
  // the fixed screens' 14081 to 14103, the status screens' 3872 to 3901, the help screens' 6245 to 6275, the activity
  // menu's 786 to 787, the device pages' 16139 to 16146 and the activity screens' 2888 to 2898, 109 bytes, the draws
  // of the programs they build. The other two draws are in chromes no builder makes, mode 70's and mode 50's.
  // The device lists' 4971, since `todo-compile-one.md` 4.3.3, section 424, are the seven lists built whole, the idle
  // list, the list nothing enters and the five activities' own, three pages each: their own key maps, chromes,
  // pages and switches, the page lists and copies, every list those run, and their hit page's areas; what they share
  // with a set built before them is that set's, the off lists below the screens the device pages'. The hit pages'
  // 863 came down to 772 with it, the 91 bytes of the device lists' pages' areas. 4978 with 5.3.4's fill, a byte
  // longer in each of the seven lists' chromes.
  assert.deepEqual(a.generated, {
    'firmware screens': 3247, 'fixed screens': 14103, 'tour and Remote Assistant': 0, 'status screens': 3901,
    'clock header': 3558, 'help screens': 6275, 'activity menu': 787, 'device pages': 16146, 'device lists': 4978, 'activity screens': 2898,
    'case programs': 572, 'hit pages': 772, wiring: 4560, 'state tables': 2347,
    'raw slot 18': 2, 'number senders': 1, pictures: 217218,
  });
  // The pictures' 294663, since `todo-compile-one.md` 5.3.1 and 5.3.3, section 422, are the 32 of ours the path put in
  // place of Logitech's, each its picture of Logitech's size and mask: the status strip's sixteen, 8687, the gauge's
  // and the charging gauge's thirteen, the sending mark on and off and the clock face; the six of the firmware screens
  // and the power off help, 110686; the settings screens' nine buttons, six pads and three rows, 97845; and the one
  // whole screen background, 77445. None of their bytes is read as a value: a mask says only which pixels are drawn.
  // 217218 since 5.3.4, section 425: 31 pictures, the background a fill and no longer a picture of the bank.
  // 401, 3967, 680 and 1243 for the four before 6.5: what a list below reads is the numbers of the lists it calls
  // and of the variables it writes, and the tour's setting, one byte.
  // Since 5.3.4, section 425, each of the 109 fills is a byte more read as a value than the draw it replaced: its
  // size and colour, four bytes, where the draw named its picture in three. 439, 4152, 699, 1994, 204, 6273 and 1068
  // before it.
  assert.deepEqual(a.described, {
    'firmware screens': 449, 'fixed screens': 4174, 'tour and Remote Assistant': 0, 'status screens': 728,
    'clock header': 337, 'help screens': 2024, 'activity menu': 205, 'device pages': 6280, 'device lists': 1538, 'activity screens': 1078,
    'case programs': 33, 'hit pages': 0, wiring: 1250, 'state tables': 0,
    'raw slot 18': 0, 'number senders': 0, pictures: 0,
  });
  // The help screens' 1994 against 660 on the donor are the numbers and names of a chain of seven rather than two:
  // nearly every operand of a question's eight lists is a number the configuration chose, section 415, and so is
  // read, however the numbers were come by. The activity menu's 204 are the names of its five rows and its numbering,
  // every list index, mode, keypad map and picture of a menu of two pages, section 419.
  // The case programs' 33 are section 416's 24 numbers, one per power variable the all off writes, seven here, the
  // donor's two and the five composed, and two for its list. The hit pages' description reads 23 bytes, the leads of
  // the screen pages that name them, none of them inside the pages it builds, so none of its bytes is described.
  // The device lists' 1531 are the seven lists' rows' names and their numbering, every device mode a row enters and
  // every list index, value map, variable and picture among it, section 424.
});

test('todo-compile-one 4.10: the composed setup holds no tour and no Remote Assistant, every list call, mode it enters and hit page it names resolves, and the state table, the queue, the wiring and the texts\' form hold',
     NEEDS, () => {
  const c = composed().container;
  assert.deepEqual(touchTourScreenModes(c).modes, []);
  const lists = c.actionLists()!.length;
  const records = modeRecords(c)!;
  const pages = touchPages(c)!.records.length;
  // 2847 since 4.3.3's fix: five lists, each activity's own scan 55 list.
  assert.deepEqual([lists, records.length, pages], [2847, 117, 24]);
  assert.equal(listCallSites(c).filter((one) => one.list >= lists).length, 0);
  assert.equal(instructionSites(c, 0x7e).filter((one) => one.operand >= records.length).length, 0);
  assert.equal(records.flatMap((one) => one.pages).filter((page) => page.lead! >= pages).length, 0);
  assertStateTableConsistent(c);
  assertQueueFits(c);
  checkTouchWiring(c);
  // 471 texts drawn inline and 1020 by reference, each inline copy the first draw of its codes in address order; 878
  // by reference until 4.3.3 built the device lists and gave the five activities one each: 142 texts more, every one
  // drawn by reference to a copy before it.
  const texts = checkTouchScreenTexts(c);
  assert.deepEqual([texts.inline, texts.references], [471, 1020]);
});

test('todo-compile-one 4.10: with the tour kept the composed setup does not keep the texts\' form rule, "pages" at 35, 18 drawn inline where the rule draws it by reference',
     NEEDS, () => {
  // The other half of the sentence in section 421: the path as it stood before the step. It composes a second time,
  // with the family's choice flipped for the length of the composition and put back whatever happens.
  const choices = TOUCH_CHOICES as { welcomeTour: boolean };
  choices.welcomeTour = true;
  let kept: Container;
  try {
    kept = composeSetup(recipe(), { donor: require_('harvest_one_two_devices'), archive: IR_ARCHIVE!, builtAt: '2026-10-15T12:00:00' }).container;
  } finally {
    choices.welcomeTour = false;
  }
  assert.equal(touchTourScreenModes(kept).modes.length, 16);
  // The program's address is where the placement of `todo-compile-one.md` 6.2 leaves it, 0x5b421 before, since a composer's
  // parked infrared records and key maps go into the body in front of it, section 426 (0x722cc then); and the fills of 5.3.4 before
  // it are a byte longer a draw each, section 425.
  assert.throws(() => checkTouchScreenTexts(kept), /the program at 0x722f8's text 'pages' at 35, 18 is drawn inline where it is built by reference/);
});

test('todo-compile-one 3.2.2.4: the composed setup\'s power off help asks about its seven devices, the donor\'s two and then the five composed in the order composed, each discrete one sent unasked and each toggle not',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  // Every composed device has a power variable, so every one is asked about, section 415; after the donor's own,
  // in the order composed, a choice of ours. The catalogue states the Plasma and the Switch discrete and the KPN,
  // Kodi and the Sony HT toggles, so only the first two are sent unasked, by the measured rule and its exception.
  assert.deepEqual(out.composed.devices, ['Plasma', 'KPN', 'Kodi', 'Switch', 'Sony HT']);
  const d = describeTouchHelpScreens(c, takeApart(c));
  assert.deepEqual(d.spec.devices.map((one) => `${one.name}: ${one.resend ? 'sent unasked' : 'asked'}`), [
    'Denon AVR-X4800H: sent unasked', 'LG OLED65G26LA: sent unasked', 'Plasma: sent unasked', 'KPN: asked', 'Kodi: asked',
    'Switch: sent unasked', 'Sony HT: asked',
  ]);
  // 4n + 2 screens, the donor's ten where they were and the twenty new ones the next free modes in chain order.
  const modes = touchHelpScreenModes(c).modes;
  assert.equal(modes.length, 30);
  // 108 to 127 until `todo-compile-one.md` 4.10 left out the tour's and the Remote Assistant's sixteen modes below,
  // and 92 to 111 until 4.3.3 gave the five activities a device list each below them.
  assert.deepEqual(modes.slice(10), Array.from({ length: 20 }, (_, k) => 97 + k));
  assert.equal(modeRecords(c)!.length, 117);
});

test('todo-compile-one 4.3.3: each of the composed setup\'s five activities opens a device list of its own, every device with those its start switches on first in that order, and the idle list and the list nothing enters stay',
     NEEDS, () => {
  const c = composed().container;
  const lists = touchDeviceLists(c);
  const { records, idle } = touchValueMapRoles(c);
  const maps = valueMaps(c)!;
  const names = new Map(devices(c).map((one) => [one.mode, one.name]));
  const all = c.actionLists() ?? [];
  const hits = touchPages(c)!.records;
  const { marker } = deviceListMenus(c);
  // The device modes a list's rows enter, in the order they stand on the screen: page by page, a page by its touch area.
  const modesOf = (mode: number): number[] => modeRecords(c)![mode]!.pages.flatMap((page) => {
    const areas = hits[page.lead as number]?.areas ?? [];
    return (taggedList(c, page.list)?.entries ?? []).flatMap((one) => {
      if (one.opcode !== 0x7f) return [];
      const entered = deviceListRowMode(all[one.operand] ?? [], c.architecture, marker);
      const area = areas.find((a) => a.code === (one.tag & 0x3f));
      return entered === undefined || area === undefined ? [] : [{ entered, y: area.y, x: area.x }];
    }).sort((a, b) => (b.y - a.y) || (a.x - b.x)).map((one) => one.entered);
  });
  const named = (modes: number[]): string[] => modes.map((mode) => names.get(mode) ?? `mode ${mode}`);
  assert.deepEqual(lists.map((one) => (one.kind === 'unreached' ? 'nothing' : one.idle === true ? 'idle' : `activity ${one.activity}`)),
    ['idle', 'nothing', 'activity 1', 'activity 2', 'activity 3', 'activity 4', 'activity 5']);
  const idleList = lists.find((one) => one.idle === true)!;
  const idleModes = modesOf(idleList.mode);
  assert.deepEqual(modesOf(lists.find((one) => one.kind === 'unreached')!.mode), idleModes);
  // The device modes the cases under Devices at `value` enter, the record's and its unread copy's.
  const opened = (value: number): number[] => (['devices', 'devices unread'] as const).map((role) => {
    const target = maps[records.get(role)!]!.entries.find(([key]) => key === value)![1];
    const queued = caseQueued(c, target)!;
    assert.equal(queued.opcode, ENTER_MODE);
    return queued.operand;
  });
  assert.deepEqual(opened(idle), [idleList.mode, idleList.mode]);
  const heads: Record<string, string[]> = {};
  for (const activity of activities(c)) {
    const own = lists.find((one) => one.activity === activity.activity)!;
    assert.deepEqual(opened(activity.activity), [own.mode, own.mode], activity.name);
    // **The ways in a person takes**, which the cases above are not, and which the spare Harmony One showed entering
    // the idle list until they were repointed: the Devices key of the activity's working screen, and the scan 55
    // entry of the key map the activity installs. Each enters the activity's own list and no other, and the
    // activity's chain enters exactly its start up screen, its working screen and that list, as Logitech's do.
    const working = activityScreens(c)!.screens.get(activity.activity)!;
    const entersFrom = (index: number): number[] => (all[index] ?? []).filter((one) => one.opcode === ENTER_MODE).map((one) => one.operand);
    const devicesKey = modeRecords(c)![working]!.pages.flatMap((page) => (taggedList(c, page.list)?.entries ?? [])
      .filter((one) => one.opcode === 0x7f).flatMap((one) => entersFrom(one.operand)).filter((one) => lists.some((list) => list.mode === one)));
    assert.deepEqual(devicesKey, [own.mode], `${activity.name}'s working screen`);
    const keyMap = (taggedList(c, handlerSets(c)!.addresses[activity.set]!)?.entries ?? [])
      .filter((one) => one.opcode === 0x7f).flatMap((one) => entersFrom(one.operand)).filter((one) => lists.some((list) => list.mode === one));
    assert.deepEqual(keyMap, [own.mode], `${activity.name}'s key map`);
    assert.equal(activity.modes[2], own.mode, activity.name);
    const head = startSwitchedOn(c, activity.set, idleModes, activity.name!);
    assert.deepEqual(modesOf(own.mode), [...head, ...idleModes.filter((one) => !head.includes(one))], activity.name);
    heads[activity.name!] = named(head);
  }
  // The heads, as the setup's activities name their devices and in the order the composer's starts switch them on.
  assert.deepEqual(heads, {
    'TV kijken': ['LG_OLED65G26LA', 'KPN', 'Denon_AVR-X4800H'], 'Film kijken': ['Plasma', 'Kodi', 'Denon_AVR-X4800H'],
    'Muziek': ['Kodi', 'Sony_HT'], 'Kodi kijken': ['LG_OLED65G26LA', 'Kodi', 'Switch'], 'Plasma kijken': ['Plasma', 'KPN'],
  });
});

test('todo-compile-one 3.2: the One\'s composed test setup carries 103331 of its 983694 bytes out of Logitech\'s donor, per kind as pinned here, a list that may only shrink',
     NEEDS, () => {
  const out = composed().container;
  const got = carried(out, parse(require_('harvest_one_two_devices')), builtBytes().owners);
  // Each kind with the item that builds it, `todo-compile-one.md` 3.2. A builder joining the composed path
  // lowers its row; a row that rises is a composer that started copying. 1162052 when 3.2.1 listed it; 3.2.2's
  // first step put the firmware screens, the fixed screens, the tour and Remote Assistant, the wiring and the state
  // tables on the path, 25072 bytes, the sum 3.2.1 listed for the five: `mode system` and every row of base slots 2,
  // 4, 8, 9, 12, 13, 14 and 15 went, and `mode other`, `mode status` and the lists came down. Its second step,
  // 3.2.2.2, put the status screens and the clock header there, 7430 bytes: `mode status` went, 3379, the status
  // screens' 3872 less their 493 list bytes, and so did `dynamic-program`, the clock header's four programs, 3516,
  // and the lists came down by the status screens' 493 and the clock's 42. Its third, 3.2.2.3, put the case
  // programs and the hit pages the fixed screens name there, 2378 bytes: `table`, base slot 11's, went, 89, the case
  // programs came down by their 25 programs' 341, the lists by the six toggles' 60 (the all off's list is the device
  // composer's, written and never carried) and the hit pages by the 23 pages' 1898. Its fourth, 3.2.2.4, put the
  // power off help there, 2198 bytes: `mode other` went, 1495, which was the help screens' ten alone, and the lists
  // came down by their 76, 703, section 415. Its fifth, 3.2.2.5, put the lists below the screens there, section
  // 418: the lists came down by 1347, 180 lists: the 166 below the firmware screens, the fixed screens and the
  // tour that matched a donor list, and the 14 the wiring's variables' transitions call. 197 bytes more are built than that,
  // 17 lists below the clock pickers' tag `0x29` handlers naming a state variable the composed path renumbered,
  // which matched nothing. Its seventh, 3.2.2.7, put the activity menu there, section 419: the hit pages came down
  // by 61, the donor's page of no row, which the menu's first page is rebuilt over, and the lists by 44: the 58 bytes
  // of menu lists that matched the donor's went (its page's key lists and their copies, the leaving, header and
  // chrome lists), and two of the activity composer's lists, the Devices key's `[75 0FCA, 7E 3D]` on two of its
  // working screens (4.3), 14 bytes, took the two donor lists of that shape the menu's had taken before. Its eighth,
  // 3.2.2.8, put the device pages there, section 420: `mode device` went, 4569, the donor's two devices' modes, the
  // hit pages came down by the 318 of the three device page shapes, and the lists by 2140, the device pages' own
  // lists that matched the donor's, its pads' lists and their copies', the keys' and the handlers'. `todo-compile-one.md`
  // 4.3 put the activity screens there, section 423, and no row came down: the composer has written them since 1.2.11,
  // so nothing of them was carried, and the two Devices key lists 3.2.2.7 found matching the donor's matched no more
  // once 4.10 renumbered the idle device list they enter.
  //
  // **What is left of those two rows.** `hit-page` 167 is the two pages of the donor's no builder makes, both the help
  // screens' (4.6): index 4, which their questions are touched through, and the generic help screen's, 24. 485 before
  // 3.2.2.8, with the donor's three device page shapes, the six pad one among them. `case-program` 10 is not a part carried: it is two
  // of the ten cases the activity composer writes under Devices, `11 mode 7E 00` entering the idle device list, byte
  // for byte the donor's idle cases of the Devices record and its unread copy, which this match takes once the
  // builder's own, built and so left out, no longer take them. The composer writes them, `caseProgram`.
  //
  // **4.10 left out the tour and the Remote Assistant**, section 421: `picture` came down by 239709, the eleven
  // pictures only the sixteen screens drew, and `slot-10-list` by 264, the donor's lists only they reached that the
  // tour's builder had not built. `case-program` 10 went with them: the two cases enter the idle device list, which
  // is mode 50 here where it is 61 on the donor, eleven of the sixteen modes left out sitting below it, so they no
  // longer match the donor's bytes. Written by the composer either way, so a row that went for a reason of its own.
  //
  // **5.3.1 and 5.3.3 drew ours in place of Logitech's pictures**, section 422: `picture` came down by 730518, to
  // 42612. Ours of the status strip, the firmware screens, the power off help and the settings buttons are built, and
  // so is the one black background, the photographs and the background's other copies gone; the device pages' pads,
  // which the look draws in ours, went out of the bank with it. What was left then was the four pictures only mode 70
  // drew, the donor's mode 86, the list nothing enters, three pages here, which the look's device step did not
  // recolour, `deviceListRows` naming the idle list alone: its two row pictures, 16405 each, and the two device icons
  // drawn on them, 4901 each.
  //
  // **4.3.3 built the device lists**, section 424: `picture` went, the 42612 above, since the look draws every list in
  // ours, and `slot-10-list` came down by 48, the lists of the donor's two device lists that the built lists' own
  // match: two header lists of three programs, 20, two lists the chrome queues, 14, and the left key's list of the
  // list nothing enters and its copy's, 14.
  //
  // `raw-18-table` 2 and `slot-16-table` 1 went with 6.7, generated on the path by `families/touch/smalltables.ts`.
  // Of `slot-10-list`, 262 are the 34 lists nothing can run, kept with 6.7's reason, the test below.
  assert.deepEqual(got, {
    // `picture` 42612 before 4.3.3, mode 70's rows and icons; 773130 before 5.3.1 and 5.3.3, 1012839 before 4.10
    'slot-5-block': 96946, 'slot-5-header': 4116, 'slot-5-group': 594, // the donor's two devices' infrared, 8.1
    'slot-10-list': 1508, // per builder in the listing: 17609 before 3.2.2, 6649 before 3.2.2.2, 6114 before 3.2.2.3, 6054 before 3.2.2.4, 5351 before 3.2.2.5, 4004 before 3.2.2.7, 3960 before 3.2.2.8, 1820 before 4.10, 1556 before 4.3.3
    // `mode device` 4569 before 3.2.2.8, and `mode other` 11983 before 3.2.2 and 1495 before 3.2.2.4
    'hit-page': 167, // 2444 before 3.2.2.3, 546 before 3.2.2.7, 485 before 3.2.2.8; `case-program` 341 before 3.2.2.3 and 10 before 4.10, and base slot 11's `table` 89
  });
  assert.equal(Object.values(got).reduce((sum, one) => sum + one, 0), 103331);
  assert.equal(out.blob.length, 983694);
  // 1099596 until 5.3.4 made the background a fill, section 425, which moved no row above: what drew it is built, or
  // is mode 70's and mode 50's chromes, which matched no donor unit before the fill either.
});

/** The 34 lists of the donor the composed setup carries and nothing can run, `todo-compile-one.md` 6.7. */
const UNRUN = [
  422, 424, 437, 442, 479, 549, 678, 680, 735, 736, 737, 738, 741, 747, 748, 750, 752, 753, 754, 756, 757, 797, 799,
  813, 829, 854, 1410, 1423, 1435, 1452, 1463, 1468, 1471, 1474,
];

test('todo-compile-one 6.7: the composed setup carries 34 lists of its donor, 262 bytes, that nothing in it can run, and keeps them, though since 4.10 the renumbering there is leaves them out of a Harmony One\'s configuration with every check passing',
     NEEDS, () => {
  const c = composed().container;
  // Held against the donor as the composed path leaves it, without the tour and the Remote Assistant, 4.10: the
  // lists those left out renumber every list above them, so the same index names the same list only there.
  const donor = withoutTourAndAssistant(parse(require_('harvest_one_two_devices'))).container;
  const lists = c.actionLists()!;
  const theirs = donor.actionLists()!;
  const owners = builtBytes().owners;
  const table = c.pointerArray(archSlot(c.architecture!, 10))!;
  const reached = listsReached(c);
  const unreached = [...lists.keys()].filter((index) => !reached.has(index));
  const bytesOf = (index: number): number => 1 + 3 * lists[index]!.length;
  const same = (index: number): boolean => theirs[index] !== undefined && theirs[index]!.length === lists[index]!.length
    && theirs[index]!.every((one, k) => one.opcode === lists[index]![k]!.opcode && one.operand === lists[index]![k]!.operand);
  // No builder on the path reproduces a byte of any list nothing reaches: a builder builds what its part runs.
  for (const index of unreached) {
    const at = c.blobOffsetOf(table[index]!)!;
    assert.ok(owners.subarray(at, at + bytesOf(index)).every((one) => one === 0), `list ${index}`);
  }
  // Every list nothing reaches, 71 of 2733, by what it is. The donor's at the same index byte for byte and no
  // send: the 34 this item is about. The donor's at the same index and a send: its two devices' 11 commands no key
  // binds, 4.2 and 8.1. The rest the composers wrote: 14 of the donor's own lists nothing reaches in it either,
  // at the same indices but naming a state variable the composed devices renumbered, and 12 of their own past the
  // donor's 1939 (2060 with the tour), the composed devices' 7 commands no key binds and five lists selecting base slot 9 entries 8 to
  // 12, each one instruction, which nothing names.
  const group = (index: number): string => (!same(index) ? 'written'
    : lists[index]!.some((one) => one.opcode === 0x7d) ? 'donor sends' : 'carried');
  const tally: Record<string, [number, number]> = {};
  for (const index of unreached) {
    const one = (tally[group(index)] ??= [0, 0]);
    one[0] += 1;
    one[1] += bytesOf(index);
  }
  assert.equal(lists.length, 2847);
  assert.deepEqual(tally, { carried: [34, 262], 'donor sends': [11, 77], written: [26, 215] });
  assert.deepEqual(unreached.filter((index) => group(index) === 'carried'), UNRUN);
  assert.equal(unreached.filter((index) => group(index) === 'written' && index < theirs.length).length, 14);

  // **That nothing can run them**, section 408 on the 3.4 image: base slot 10 is spooled only by an `0x7F`'s
  // operand, and an instruction is rebuilt at run time only by `0x7B` or an opcode `0x1F` to `0x3E` over `0xF7`.
  // Here every one of those is `1F F776`, building an `0x76`, seven of them, as on the nineteen compiles.
  const builders = lists.flat().filter((one) => one.opcode === 0x7b || (one.opcode >= 0x1f && one.opcode <= 0x3e && one.operand >> 8 === 0xf7));
  assert.deepEqual([...new Set(builders.map((one) => `${one.opcode.toString(16)} ${one.operand.toString(16)}`))], ['1f f776']);
  assert.equal(builders.length, 7);
  // And the control on the walk, which reads holders one by one and so could miss one: three bytes `lo hi 7F`
  // naming one of the 34, anywhere in the file, whatever holds them, instruction or not. None outside the 34
  // themselves. Inside them, 12: the dead chains, a list of the 34 calling another, which is the census seeing a
  // name where there is one.
  const own = new Set(UNRUN.flatMap((index) => {
    const at = c.blobOffsetOf(table[index]!)!;
    return Array.from({ length: bytesOf(index) }, (_, k) => at + k);
  }));
  const named = new Set(UNRUN);
  let outside = 0;
  let inside = 0;
  for (let at = 0; at + 2 < c.blob.length; at += 1) {
    if (c.blob[at + 2] !== 0x7f || !named.has(c.blob[at]! | (c.blob[at + 1]! << 8))) continue;
    if (own.has(at)) inside += 1;
    else outside += 1;
  }
  assert.deepEqual([outside, inside], [0, 12]);

  // **Why they stay.** They sit at 34 indices from 422 to 1474 among 2733, so leaving them out moves the index of
  // every kept list above 422, 2277 of them, at every place that names one. The renumbering there is, `dropLists`,
  // rested on a `listCallSites` that read raw slots 10 and 8, on the Harmony One base slot 9 and the inserted NULL,
  // so it missed every call inside an action list and refused this drop; since 4.10, section 421, it reads them
  // through `archSlot` and the drop goes through: 34 lists and 262 bytes out of base slot 10, 364 out of the file
  // with their pointers, and every check passing. They stay because every one of Logitech's nineteen One compiles
  // carries lists nothing reaches, 44 to 193 of them, so a One configuration without any is a form no remote here
  // has run; leaving them out on the path waits for a write to the spare Harmony One, as 4.10's own does.
  const without = dropLists(c, UNRUN);
  assert.deepEqual([without.dropped.length, without.length, c.blob.length - without.bytes.length], [34, 262, 364]);
  assert.ok(parse(without.bytes).allChecksPass);
});

test('todo-compile-one 7.1.1: the composed setup\'s font table is 33 sets of 95 codes and 354176 bytes, the stated table\'s 18 glyph for glyph and the look\'s 15 blended copies',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  const sets = fontSets(c)!;
  assert.deepEqual([sets.length, ...new Set(sets.map((set) => set.count))], [33, 95]);
  const section = takeApart(c).sections[IMAGE_TABLE_SLOT]!;
  assert.equal([...section.before, ...section.head].reduce((sum, one) => sum + one.bytes.length, 0), 354176);
  // The first 18 are the statement, built in the donor's code order: every glyph the bytes `buildTouchFontTable`
  // draws. The donor's order is read off Logitech's compile, since its codes past the first 60 follow its names.
  const donor = parse(require_('harvest_one_two_devices'));
  const highest = Math.max(...fontSets(donor)!.map((set) => set.first + set.count - 1));
  const stated = buildTouchFontTable(TOUCH_CHOICES, { characters: donorGlyphOrder(characterMap(donor)!, highest) });
  let glyphs = 0;
  stated.sets.forEach((set, k) => set.refs.forEach((ref, n) => {
    const at = c.blobOffsetOf(sets[k]!.glyphs[n]!)!;
    assert.ok('to' in ref && Buffer.from(c.blob.subarray(at, at + ref.to.bytes.length)).equals(Buffer.from(ref.to.bytes)), `set ${k} code ${n + 1}`);
    glyphs += 1;
  }));
  assert.equal(glyphs, 18 * 95);
  // The other 15 are the copies the look blended against a colour they are drawn on, in table order: nine on black,
  // and the rows' and the wide buttons' sets on each of the three box colours, in the labels' lighter weight.
  assert.deepEqual(out.blended.map((one) => one.set), Array.from({ length: 15 }, (_, k) => 18 + k));
  const on = (background: number): number[] => out.blended.filter((one) => one.background === background).map((one) => one.source).sort((a, b) => a - b);
  assert.deepEqual(on(0x0000), [0, 1, 2, 3, 4, 5, 6, 8, 13]);
  for (const box of [TOUCH_CHOICES.activityBox, TOUCH_CHOICES.deviceBox, TOUCH_CHOICES.settingsBox]) {
    const colour = colour565(box.fill);
    assert.deepEqual(on(colour), [7, 11], box.fill);
    assert.ok(out.blended.filter((one) => one.background === colour).every((one) => one.weight === TOUCH_CHOICES.labelWeight));
  }
});
