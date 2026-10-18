/**
 * The Harmony One's builders on the composed path, `todo-compile-one.md` 3.2.2, `families/touch/builders.ts`: the
 * firmware screens, the fixed screens, the tour and Remote Assistant, the status screens, the clock header, the case
 * programs, the hit pages, the wiring and the state tables, each built from a description of the configuration being
 * composed in place of the donor's part; the first five and the last two since 3.2.2.1, the status screens and the
 * clock header since 3.2.2.2, the case programs and the hit pages since 3.2.2.3.
 *
 * What is held here is what the composition in `composesetup.test.ts` cannot show cheaply: that on Logitech's own
 * compile the nine come back byte for byte, so putting them on the path changes nothing a builder does not mean to;
 * what does change on the donor lettered in ours and why; that a builder's refusal is the path's; and that the
 * attribution refuses a screen the donor's placing carried, which is what lets it tell a built part from a carried
 * one where their bytes differ.
 *
 * Every figure is exact.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, EVENT_MAP_SLOT, archSlot, claims, eventMap, modeRecords, parse, screenProgram, screenUnits, touchPages, valueMaps,
} from '../src/index.ts';
import { saveEdits } from '../src/edit.ts';
import { SCREEN_TEXT_AT, SCREEN_TEXT_INLINE } from '../src/screen.ts';
import { TOUCH } from '../src/families/touch/index.ts';
import { TouchBuildError, touchBuiltBytes, withTouchBuilders } from '../src/families/touch/builders.ts';
import { touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';
import { touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { withCentredPadLabels } from '../src/families/touch/centring.ts';
import { ENTER_MODE, caseQueued } from '../src/inventory.ts';
import { appendValueMapCase, caseProgram } from '../src/shared/menus.ts';

const DONOR = 'harvest_one_two_devices';

/** The test setup's donor lettered in ours, as `composeSetup` letters it before anything is composed. */
let letteredOnce: Container | undefined;
const lettered = (): Container => {
  letteredOnce ??= parse(TOUCH.composedLook!.letterDonor(parse(require_(DONOR)), TOUCH.choices).bytes);
  return letteredOnce;
};

test('todo-compile-one 3.2.2: on Logitech\'s compile of two devices the nine builders on the composed path give back every byte as it was',
     skipUnless(DONOR), () => {
  const donor = parse(require_(DONOR));
  const out = withTouchBuilders(donor);
  assert.deepEqual(out.built, [
    'firmware screens', 'fixed screens', 'tour and Remote Assistant', 'status screens', 'clock header', 'case programs', 'hit pages',
    'wiring', 'state tables',
  ]);
  assert.equal(out.container.blob.length, donor.blob.length);
  assert.ok(out.container.blob.every((one, k) => one === donor.blob[k]));
});

test('todo-compile-one 3.2.2: on that compile lettered in ours the builders move the x of 197 texts, 10 of the firmware screens, 93 of the fixed screens, 32 of the tour\'s, 37 of the status screens\' and 25 of the clock\'s, placing them in our letters\' widths, and change no other byte but the trailer',
     skipUnless(DONOR), () => {
  const before = lettered();
  const after = withTouchBuilders(before).container;
  assert.equal(after.blob.length, before.blob.length);
  const differing = [...before.blob.keys()].filter((k) => before.blob[k] !== after.blob[k]);
  const trailer = claims(before).find((one) => one.owner === 'trailer')!;
  const texts = differing.filter((k) => k < trailer.start);
  assert.equal(differing.length - texts.length, 2);
  // Each one the x of a text, the byte after its opcode, inside a screen program.
  for (const k of texts) assert.ok([SCREEN_TEXT_INLINE, SCREEN_TEXT_AT].includes(before.blob[k - 1]!), `byte ${k}`);
  // Which screens they are in, by the mode whose screen unit holds the byte: the ten firmware screens are modes 0
  // to 9, the fixed and tour screens are found by their look and the status screens by the event map. The clock
  // header is no mode's: its texts sit in the base slot 11 entries `touchClockHeaderEntries` finds.
  const modeOf = new Map<number, number>();
  const entryOf = new Map<number, number>();
  for (const unit of screenUnits(before)!) {
    const mode = /^mode (\d+)$/.exec(unit.label)?.[1];
    const entry = /^base slot 11 entry (\d+)$/.exec(unit.label)?.[1];
    for (const range of unit.ranges) {
      for (let k = range.start; k < range.start + range.length; k += 1) {
        if (mode !== undefined) modeOf.set(k, Number(mode));
        if (entry !== undefined) entryOf.set(k, Number(entry));
      }
    }
  }
  const fixed = new Set(touchFixedScreenModes(before));
  const tour = new Set(touchTourScreenModes(before).modes);
  const status = new Set(touchStatusScreenModes(before));
  const clock = new Set(touchClockHeaderEntries(before).entries);
  const count = { firmware: 0, fixed: 0, tour: 0, status: 0, clock: 0, other: 0 };
  for (const k of texts) {
    const mode = modeOf.get(k);
    const entry = entryOf.get(k);
    if (mode !== undefined && mode < 10) count.firmware += 1;
    else if (mode !== undefined && fixed.has(mode)) count.fixed += 1;
    else if (mode !== undefined && tour.has(mode)) count.tour += 1;
    else if (mode !== undefined && status.has(mode)) count.status += 1;
    else if (entry !== undefined && clock.has(entry)) count.clock += 1;
    else count.other += 1;
  }
  // The status screens' 37 are lines centred on the screen, in 27 of the 29 screens: one or two lines each, the
  // ones whose width in our letters rounds to the same place as in Logitech's staying put. The clock's 25 are all
  // in the clock itself, the days ending at x 138 and the hours at 156, which our letters' widths end elsewhere;
  // its minutes start at 158 whatever their width and do not move. The case programs and the hit pages draw no
  // text, so they move nothing here, 3.2.2.3.
  assert.deepEqual(count, { firmware: 10, fixed: 93, tour: 32, status: 37, clock: 25, other: 0 });
});

test('todo-compile-one 3.2.2: a builder\'s refusal is the composed path\'s, never the donor\'s part kept: a build year offering a leap year, the Dutch compile, the everyday One\'s, an event map naming one status screen for two codes, a clock header with two gauges, an idle write of another value and two hit pages at one index',
     skipUnless(DONOR, 'one_friend_asfound_config', 'one_config'), () => {
  // Logitech's compile stamped a year later: its Year picker would offer 2028, whose Day 29 and second Month
  // pickers are not built, section 411.
  const leap = parse(saveEdits(parse(require_(DONOR)), [], '2027-03-01T12:00:00').bytes);
  assert.throws(() => withTouchBuilders(leap),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's fixed screens: the Year picker of 2027 offers 2028, a leap year/.test(error.message));
  // The Dutch compile, whose words the English screens would replace, and the everyday One's, whose USB Connected
  // screen leaves through a list of its own, section 409: both refused at the firmware screens.
  assert.throws(() => withTouchBuilders(parse(require_('one_friend_asfound_config'))),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's firmware screens: a reference names the inside of a replaced structure/.test(error.message));
  assert.throws(() => withTouchBuilders(parse(require_('one_config'))),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's firmware screens: USB Connected's binding of tag 0x7 is list 532, not 64/.test(error.message));
  // Past those three, which the firmware screens refuse before anything else runs, each builder 3.2.2.2 put on the
  // path refuses for itself, every builder before it having passed. The status screens: code 5's entry in the
  // event map pointed at code 6's screen, so the screens are no longer one per code.
  const donor = parse(require_(DONOR));
  const map = eventMap(donor)!;
  const at = donor.blobOffsetOf(donor.sections[archSlot(12, EVENT_MAP_SLOT)]!.address)! + 5 + 4 * [...map.entries.keys()].indexOf(5);
  const six = map.entries.get(6)!;
  const twice = Uint8Array.from(donor.blob);
  twice.set([six & 0xff, (six >> 8) & 0xff, six >> 16], at + 1);
  assert.throws(() => withTouchBuilders(parse(twice)),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's status screens: the event map names one mode for two codes$/.test(error.message));
  // The clock header: the sending mark's switch made a switch on the gauge's variable, so two programs look like
  // the gauge and none like the sending mark, and which entry is which can no longer be told.
  const sending = screenProgram(donor, touchClockHeaderEntries(donor).addresses[2]!)![0]!;
  const gauges = Uint8Array.from(donor.blob);
  gauges[sending.start + 1] = 9;
  assert.throws(() => withTouchBuilders(parse(gauges)),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's clock header: the configuration holds 2 programs of the look of gauge, not one$/.test(error.message));
  // 3.2.2.3's two. The case programs: the idle case's write made to write the value after the idle value, so the
  // description reads two idle values, the write's and the working record's idle case's.
  const roles = touchValueMapRoles(donor);
  const idleCase = valueMaps(donor)![roles.records.get('idle')!]!.entries[0]![1];
  const idleWrite = Uint8Array.from(donor.blob);
  idleWrite[donor.blobOffsetOf(idleCase)! + 1] = roles.idle + 1;
  assert.throws(() => withTouchBuilders(parse(idleWrite)),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's case programs: the idle write writes 1 where the working record's idle case is at 0$/.test(error.message));
  // The hit pages: USB Connected's page made to name Low Battery's hit page, so two of the 23 read as one index.
  // The screens' builders take a lead as a number the configuration chose and pass it; this is the builder that reads
  // one numbering off them.
  const records = modeRecords(donor)!;
  const lead = Uint8Array.from(donor.blob);
  lead[donor.blobOffsetOf(records[1]!.pages[0]!.address)!] = records[0]!.pages[0]!.lead!;
  assert.throws(() => withTouchBuilders(parse(lead)),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's hit pages: message and OK and message are both hit page 0$/.test(error.message));
  // And the family's member on the composed path is this function, which `composeSetup` calls on every composition.
  assert.equal(TOUCH.composedBuilders, withTouchBuilders);
});

/**
 * Logitech's compile of two devices through the nine builders and then the step of the look the attribution undoes,
 * the centring of the words in a pad, so that it reads as a configuration the composed path made: built, it is the
 * donor byte for byte, and centred, its clock pickers' words sit where the look puts them.
 */
let donorBuiltOnce: Container | undefined;
const donorBuilt = (): Container => {
  donorBuiltOnce ??= withCentredPadLabels(withTouchBuilders(parse(require_(DONOR))).container);
  return donorBuiltOnce;
};

test('todo-compile-one 3.2.2.3: the attribution counts each builder\'s bytes on Logitech\'s compile of two devices, the case programs\' 497 and the hit pages\' 1986 being what their own checks span on that compile, sections 416 and 417',
     skipUnless(DONOR), () => {
  const a = touchBuiltBytes(donorBuilt(), []);
  // Each part's bytes, its description's included. The case programs' 497 are their 25 programs, seven lists and
  // the table of 29 entries, the structure `checkTouchCasePrograms` reports on this compile; the hit pages' 1986 the
  // 23 pages and the touch map's table of 29, `checkTouchHitPages`'. Two independent counts of one span: the module
  // checks claim it from their descriptions, the attribution from what the rebuild put where.
  assert.deepEqual(a.generated, {
    'firmware screens': 3099, 'fixed screens': 13139, 'tour and Remote Assistant': 3900, 'status screens': 3872,
    'clock header': 3558, 'case programs': 497, 'hit pages': 1986, wiring: 4527, 'state tables': 962,
  });
  // Of those, the bytes read as values: the case programs' 28 are section 416's figure for this compile; the hit
  // pages read only the leads of the pages naming them, which lie outside what they build.
  assert.deepEqual(a.described, {
    'firmware screens': 401, 'fixed screens': 3967, 'tour and Remote Assistant': 680, 'status screens': 699,
    'clock header': 337, 'case programs': 28, 'hit pages': 0, wiring: 1243, 'state tables': 0,
  });
});

test('todo-compile-one 3.2.2.3: the attribution refuses a case entered in no table, as the activity composer entered them before, at the case programs, and a hit page\'s rectangle moved, at the hit pages',
     skipUnless(DONOR), () => {
  // A case appended to the unread copy of the Devices record the way the activity composer appended every case
  // until 3.2.2.3, its program put in base slot 11 and named by address only: the case programs' table, generated
  // whole, names one program more, and the rebuild is one entry, three bytes, longer.
  const donor = parse(require_(DONOR));
  const roles = touchValueMapRoles(donor);
  const unread = roles.records.get('devices unread')!;
  const idleList = caseQueued(donor, valueMaps(donor)![unread]!.entries[0]![1])!.operand;
  const appended = appendValueMapCase(donor, unread, roles.idle + 1, caseProgram(ENTER_MODE, idleList));
  assert.throws(() => touchBuiltBytes(appended, []),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's case programs: the rebuild is 3 bytes longer than the configuration$/.test(error.message));
  // Low Battery's hit page, page 0, with its first rectangle one unit further across.
  const built = donorBuilt();
  const moved = Uint8Array.from(built.blob);
  const at = built.blobOffsetOf(touchPages(built)!.records[0]!.areas[0]!.address)!;
  moved[at] = (moved[at]! + 1) & 0xff;
  assert.throws(() => touchBuiltBytes(parse(moved), []),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's hit pages: the built records differ from the configuration's at byte 9759, in the hit page message and OK, hit page 0$/.test(error.message));
});

test('todo-compile-one 3.2.2: the attribution refuses the donor lettered in ours, whose screens still sit where Logitech placed them for its letters, at the first firmware screen text the builder places otherwise',
     skipUnless(DONOR), () => {
  assert.throws(() => touchBuiltBytes(lettered(), []),
    (error: unknown) => error instanceof TouchBuildError
      && /^building the Harmony One's firmware screens: the built records differ from the configuration's at byte 353, in the Low Battery's page 1's program$/.test(error.message));
});
