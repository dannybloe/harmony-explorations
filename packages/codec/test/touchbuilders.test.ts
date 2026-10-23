/**
 * The Harmony One's builders on the composed path, `todo-compile-one.md` 3.2.2, `families/touch/builders.ts`: the
 * firmware screens, the fixed screens, the tour and Remote Assistant, the status screens, the clock header, the help
 * screens, the activity menu, the case programs, the hit pages, the wiring, the state tables, raw slot 18 and base
 * slot 16's table, each built from a description of the configuration being composed in place of the donor's part;
 * the first five and the wiring and state tables since 3.2.2.1, the status screens and the clock header since
 * 3.2.2.2, the case programs and the hit pages since 3.2.2.3, the help screens since 3.2.2.4, the two small tables
 * since 3.2.2.6, the activity menu since 3.2.2.7.
 *
 * What is held here is what the composition in `composesetup.test.ts` cannot show cheaply: that on Logitech's own
 * compile the fourteen come back byte for byte, so putting them on the path changes nothing a builder does not mean to;
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
  type Container, EVENT_MAP_SLOT, archSlot, claims, eventMap, modeRecords, parse, screenProgram, screenUnits, taggedList, touchPages,
  valueMaps,
} from '../src/index.ts';
import { saveEdits } from '../src/edit.ts';
import { SCREEN_TEXT_AT, SCREEN_TEXT_INLINE } from '../src/screen.ts';
import { TOUCH } from '../src/families/touch/index.ts';
import { TOUCH_BUILT, TouchBuildError, touchBuiltBytes, withTouchBuilders, withTouchComposedBuilders } from '../src/families/touch/builders.ts';
import { ATTEMPT_LINE, NO, YES, checkTouchHelpScreens, touchHelpScreenModes, withTouchHelpChain } from '../src/families/touch/helpscreens.ts';
import { characterMap, decode } from '../src/text.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';
import { touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import { touchDeviceModes } from '../src/families/touch/devicepages.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { withCentredPadLabels } from '../src/families/touch/centring.ts';
import { ENTER_MODE, caseQueued } from '../src/inventory.ts';
import { appendValueMapCase, caseProgram } from '../src/shared/menus.ts';
import { restamped } from '../src/shared/core.ts';
import { layOutContainer, takeApart } from '../src/frame.ts';
import { numberSenders } from '../src/tables.ts';
import { TOUCH_INSERTED_SECTION, withNumberSenderTable, withTouchInsertedSection } from '../src/families/touch/smalltables.ts';
import { listsReached } from './screenlists.ts';

const DONOR = 'harvest_one_two_devices';

/** The test setup's donor lettered in ours, as `composeSetup` letters it before anything is composed. */
let letteredOnce: Container | undefined;
const lettered = (): Container => {
  letteredOnce ??= parse(TOUCH.composedLook!.letterDonor(parse(require_(DONOR)), TOUCH.choices).bytes);
  return letteredOnce;
};

test('todo-compile-one 3.2.2: on Logitech\'s compile of two devices the fifteen builders on the composed path give back every byte as it was',
     skipUnless(DONOR), () => {
  const donor = parse(require_(DONOR));
  const out = withTouchBuilders(donor);
  assert.deepEqual(out.built, [
    'firmware screens', 'fixed screens', 'tour and Remote Assistant', 'status screens', 'clock header', 'help screens', 'activity menu',
    'device pages', 'activity screens', 'case programs', 'hit pages', 'wiring', 'state tables', 'raw slot 18', 'number senders',
  ]);
  assert.equal(out.container.blob.length, donor.blob.length);
  assert.ok(out.container.blob.every((one, k) => one === donor.blob[k]));
});

/** Every builder but the help screens, whose wrapped lines change the file's length, held apart below. */
const BUT_HELP = TOUCH_BUILT.filter((what) => what !== 'help screens');

test('todo-compile-one 3.2.2: on that compile lettered in ours the builders but the help screens move the x of 459 texts, 10 of the firmware screens, 93 of the fixed screens, 32 of the tour\'s, 37 of the status screens\', 25 of the clock\'s, the activity menu\'s two key words and the device pages\' 260, placing them in our letters\' widths, and change no other byte but the trailer',
     skipUnless(DONOR), () => {
  const before = lettered();
  const after = withTouchBuilders(before, [], BUT_HELP).container;
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
  const menu = touchActivityMenu(before);
  const deviceModes = new Set(touchDeviceModes(before));
  const count = { firmware: 0, fixed: 0, tour: 0, status: 0, clock: 0, menu: 0, deviceLabels: 0, deviceKeys: 0, other: 0 };
  for (const k of texts) {
    const mode = modeOf.get(k);
    const entry = entryOf.get(k);
    if (mode !== undefined && mode < 10) count.firmware += 1;
    else if (mode !== undefined && fixed.has(mode)) count.fixed += 1;
    else if (mode !== undefined && tour.has(mode)) count.tour += 1;
    else if (mode !== undefined && status.has(mode)) count.status += 1;
    else if (entry !== undefined && clock.has(entry)) count.clock += 1;
    else if (mode !== undefined && mode === menu) count.menu += 1;
    // A device page's text below y 190 is a line of a pad's label, and at or below it a word on the keys below
    // the screen, "Activities", "Current", "Activity" or "Devices", the y being the byte after the x.
    else if (mode !== undefined && deviceModes.has(mode) && before.blob[k + 1]! < 190) count.deviceLabels += 1;
    else if (mode !== undefined && deviceModes.has(mode)) count.deviceKeys += 1;
    else count.other += 1;
  }
  // The status screens' 37 are lines centred on the screen, in 27 of the 29 screens: one or two lines each, the
  // ones whose width in our letters rounds to the same place as in Logitech's staying put. The clock's 25 are all
  // in the clock itself, the days ending at x 138 and the hours at 156, which our letters' widths end elsewhere;
  // its minutes start at 158 whatever their width and do not move. The case programs and the hit pages draw no
  // text, so they move nothing here, 3.2.2.3. The activity menu's two are "Options" and "Devices", centred on the
  // halves below the screen, section 419; the donor's menu holds no row, so no name of one moves. The device pages'
  // 260, section 420, are 172 lines of their 123 pads' labels, each centred on its pad, and the 88 words below the
  // screen, the four of each of the 22 pages, centred on their halves; the device pages built before section 420
  // were carried, so none of these moved and they counted nowhere.
  assert.deepEqual(count, { firmware: 10, fixed: 93, tour: 32, status: 37, clock: 25, menu: 2, deviceLabels: 172, deviceKeys: 88, other: 0 });
});

/** The texts the first page of mode `mode` draws, in program order, as `word x,y`. */
function textsOf(c: Container, mode: number): string[] {
  const map = characterMap(c)!;
  return screenProgram(c, modeRecords(c)![mode]!.pages[0]!.program)!.flatMap((one) => {
    const glyphs = textGlyphs(c, one);
    return glyphs === undefined ? [] : [`${decode(glyphs, map)} ${one.operands[0]},${one.operands[1]}`];
  });
}

test('todo-compile-one 3.2.2.4: on that compile lettered in ours the help screens break the attempt line, 177 pixels in our letters, by the questions\' wrap at 171 and flow the "If not" paragraph onto three lines of their own, each block centred again; three bytes longer, and the rest is the other builders\' alone',
     skipUnless(DONOR), () => {
  const without = withTouchBuilders(lettered(), [], BUT_HELP).container;
  const all = withTouchBuilders(lettered()).container;
  // The help builder run after the others gives what it gives among them, so the difference is the help screens'.
  assert.equal(Buffer.compare(withTouchHelpChain(without).blob, all.blob), 0);
  // The attempt line's second line one more text drawn inline: three bytes of opcode and place and a zero, less the
  // space the break swallows. The "If not" paragraph stays three lines, broken elsewhere, so it adds nothing.
  // Logitech's letters make the attempt line fit, 170 pixels, and flow the paragraph onto Logitech's own lines.
  assert.equal(all.blob.length - without.blob.length, 3);
  const [attempt, ifNot] = touchHelpScreenModes(all).modes as [number, number];
  // The attempt line a block of two centred on y 43, 37 and 49, each line centred across, floor((176 - w) / 2);
  // the paragraph under it as before, two lines in a block on y 168.
  assert.deepEqual(textsOf(all, attempt), [
    'Attemping to fix the 29,37', 'problem... 59,49', 'Keep the remote pointed to 9,162', 'your system. 50,174',
  ]);
  // "If not" still a block of five rows on y 143, its second blank, the paragraph's three lines at other breaks.
  assert.deepEqual(textsOf(all, ifNot).slice(0, 4), [
    'Did that fix the problem? 16,119', 'If not, the remote will ask 13,143', 'you questions to help correct 4,155', 'the problem. 51,167',
  ]);
  assert.equal(ATTEMPT_LINE, 'Attemping to fix the problem...');
});

test('todo-compile-one 3.2.2.4: a composed device with a power variable gets its four questions after the chain\'s own, numbered from the chain, and the result reads and rebuilds as a chain of three; one with none is not asked about; one the chain asks about already, or whose catalogue states no power type, is refused',
     skipUnless(DONOR), () => {
  const donor = parse(require_(DONOR));
  // The donor's LG told of as a composed device under another name: it has a power variable, so the chain asks
  // about it, after the Denon and the LG, with the LG's power off list.
  const out = withTouchBuilders(donor, [{ name: 'Television', label: 'LG_OLED65G26LA', power: 'toggle' }]).container;
  const chain = touchHelpScreenModes(out);
  const modes = modeRecords(donor)!.length;
  assert.deepEqual(chain.modes.slice(10), [modes, modes + 1, modes + 2, modes + 3]);
  assert.deepEqual(chain.firsts.map((one) => one.resend), [true, true, false]);
  // Its 32 lists appended to base slot 10, eight a question, and every screen read back and rebuilt byte for byte.
  assert.equal(out.actionLists()!.length - donor.actionLists()!.length, 32);
  // The donor's 2198 bytes and 660 read grow by the four screens and their lists, 816 bytes, 270 of them read.
  assert.deepEqual(checkTouchHelpScreens(out), { devices: 3, screens: 14, lists: 108, described: 930, structure: 3014 });
  // The new first question asks by the name it was given, one line; and the LG, the last of the chain's own, goes
  // on to it where it left help before, from its first question's Yes and its "Did that fix the problem?"'s No.
  assert.deepEqual(textsOf(out, modes).slice(0, 1).map((one) => one.replace(/ \d+,\d+$/, '')), ['Is the Television off?']);
  const lg = { first: chain.modes[6]!, fixed: chain.modes[9]! };
  const enters = (mode: number, tag: number): number | undefined => {
    const entry = taggedList(out, modeRecords(out)![mode]!.pages[0]!.list)!.entries.find((one) => one.tag === tag)!;
    return out.actionLists()![entry.operand]!.find((one) => one.opcode === 0x7e)?.operand;
  };
  assert.deepEqual([enters(lg.first, YES), enters(lg.fixed, NO)], [modes, modes]);
  // A device with no power variable is not in the chain, as on every compile: the help is the donor's, byte for byte.
  assert.equal(Buffer.compare(withTouchBuilders(donor, [{ name: 'Kodi', label: 'Kodi', power: 'toggle' }]).container.blob, donor.blob), 0);
  assert.throws(() => withTouchBuilders(donor, [{ name: 'Denon AVR-X4800H', label: 'LG_OLED65G26LA', power: 'discrete' }]),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's help screens: the power off help already asks about Denon AVR-X4800H$/.test(error.message));
  assert.throws(() => withTouchBuilders(donor, [{ name: 'Television', label: 'LG_OLED65G26LA' }]),
    (error: unknown) => error instanceof TouchBuildError && /^building the Harmony One's help screens: the catalogue states no power type for Television/.test(error.message));
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
  // And the family's member on the composed path is this function behind the tour's choice, which `composeSetup`
  // calls on every composition: the tour and the Remote Assistant left out first unless the choice keeps them,
  // `todo-compile-one.md` 4.10, `test/touchwithouttour.test.ts`.
  assert.equal(TOUCH.composedBuilders, withTouchComposedBuilders);
});

/**
 * Logitech's compile of two devices through the builders and then the step of the look the attribution undoes,
 * the centring of the words in a pad, so that it reads as a configuration the composed path made: built, it is the
 * donor byte for byte, and centred, its clock pickers' words sit where the look puts them.
 */
let donorBuiltOnce: Container | undefined;
const donorBuilt = (): Container => {
  donorBuiltOnce ??= withCentredPadLabels(withTouchBuilders(parse(require_(DONOR))).container);
  return donorBuiltOnce;
};

test('todo-compile-one 3.2.2.3: the attribution counts each builder\'s bytes on Logitech\'s compile of two devices, the help screens\' 2198, the case programs\' 497 and the hit pages\' 1986 being what their own checks span on that compile, sections 415, 416 and 417',
     skipUnless(DONOR), () => {
  const a = touchBuiltBytes(donorBuilt(), []);
  // Each part's bytes, its description's included. The help screens' 2198 are their ten screens and 76 lists, the
  // structure `checkTouchHelpScreens` reports on this compile, section 415. The case programs' 497 are their 25 programs, seven lists and
  // the table of 29 entries, the structure `checkTouchCasePrograms` reports on this compile; the hit pages' 1986 the
  // 23 pages and the touch map's table of 29, `checkTouchHitPages`'. Two independent counts of one span: the module
  // checks claim it from their descriptions, the attribution from what the rebuild put where.
  // The firmware screens', the fixed screens', the tour's and the wiring's 3099, 13139, 3900 and 4527 until
  // `todo-compile-one.md` 6.5 built the lists below the screens and the wiring's variables' transitions, section 418.
  // The activity menu's 260 are its 284, `checkTouchActivityMenu`'s on this compile, section 419, less the three off
  // lists its leaving calls, the page keys' and lights 5 and 7's, 24 bytes, which the firmware screens build first.
  // The device pages' 8684 are `checkTouchDevicePages`' structure on this compile, section 420: two devices, 22 pages,
  // their lists and their three hit pages' areas, the hit pages' table staying the hit pages builder's.
  // The activity screens' 0 since `todo-compile-one.md` 4.3, section 423: the compile holds no activity.
  // The pictures' 234897, since `todo-compile-one.md` 5.3, section 422, are, on this compile, Logitech's five all black
  // pictures, which our rule draws byte for byte: the whole screen background's three copies, 77445 each, the sending mark off, 797,
  // and the clock face, 1765. The pictures are ours by choice on the composed path and not rebuilt on Logitech's
  // compile, so these five are the only ones of its pictures any of ours reproduces. This compile stores the background
  // three times, as three others of the sixteen do; on the other twelve, which store it four times, the rule
  // reproduces six, section 422.
  assert.deepEqual(a.generated, {
    'firmware screens': 3237, 'fixed screens': 14332, 'tour and Remote Assistant': 4015, 'status screens': 3872,
    'clock header': 3558, 'help screens': 2198, 'activity menu': 260, 'device pages': 8684, 'activity screens': 0, 'case programs': 497, 'hit pages': 1986, wiring: 4625, 'state tables': 962,
    'raw slot 18': 2, 'number senders': 1, pictures: 234897,
  });
  // Of those, the bytes read as values: the help screens' 660 and the case programs' 28 are sections 415's and 416's
  // figures for this compile; the hit
  // pages read only the leads of the pages naming them, which lie outside what they build; raw slot 18 is a
  // constant and base slot 16's table a count and addresses, 6.7. The activity menu's 57 are its 60 on this compile,
  // section 419, less the three off lists' variables, read by the firmware screens, which build those lists first.
  // 401, 3967, 680 and 1243 for the four before section 418. The device pages' 3482 are the 3555 their check reads
  // on this compile, section 420, less the 73 it reads outside what it builds, the glyph codes of texts other screens
  // hold that a device page draws by reference.
  assert.deepEqual(a.described, {
    'firmware screens': 439, 'fixed screens': 4038, 'tour and Remote Assistant': 719, 'status screens': 699,
    'clock header': 337, 'help screens': 660, 'activity menu': 57, 'device pages': 3482, 'activity screens': 0, 'case programs': 28, 'hit pages': 0, wiring: 1274, 'state tables': 0,
    'raw slot 18': 0, 'number senders': 0, pictures: 0,
  });
});

test('todo-compile-one 3.2.2.3: the attribution refuses a case entered in no table, as the activity composer entered them before, at the case programs, and a hit page\'s rectangle moved, at the hit pages',
     skipUnless(DONOR), () => {
  // A case appended to the unread copy of the Devices record the way the activity composer appended every case
  // until 3.2.2.3, its program put in base slot 11 and named by address only: the case programs' table, generated
  // whole, names one program more, and the rebuild is one entry, three bytes, longer. On the donor as the composed
  // path leaves it, centred, `donorBuilt`: since 3.2.2.4 the sets before a set of another length are compared first,
  // and the donor's clock pickers, whose words the look centres, would be named before the case programs.
  const donor = donorBuilt();
  const roles = touchValueMapRoles(donor);
  const unread = roles.records.get('devices unread')!;
  const idleList = caseQueued(donor, valueMaps(donor)![unread]!.entries[0]![1])!.operand;
  // Its trailer restamped, as a composer's save does, so the comparison of the sets before finds nothing.
  const appended = parse(restamped(Uint8Array.from(appendValueMapCase(donor, unread, roles.idle + 1, caseProgram(ENTER_MODE, idleList)).blob)));
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

// ---------------------------------------------------------------------------------------------------------
// The two small tables and the lists nothing reaches, `todo-compile-one.md` 6.7, over every One compile.

const NINETEEN = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('todo-compile-one 6.7: raw slot 18 and base slot 16\'s table rebuild byte for byte on all nineteen One compiles, two zero bytes on each and a count with an address per number sender, one on eight of them; a raw slot 18 holding anything else is refused',
     skipUnless(...NINETEEN), () => {
  const senders: Record<number, number> = {};
  for (const name of NINETEEN) {
    const c = parse(require_(name));
    for (const build of [withTouchInsertedSection, withNumberSenderTable]) {
      const { layout, piece } = build(takeApart(c));
      const laid = layOutContainer(layout);
      assert.equal(Buffer.compare(laid.bytes, c.blob), 0, `${name}: ${build.name}`);
      if (build === withTouchInsertedSection) assert.deepEqual([...piece.bytes], [...TOUCH_INSERTED_SECTION], name);
    }
    // The table names its records by the address the frame wrote from where each record landed, `takeApart`
    // having zeroed the field: so the rebuilt table and the reader's record agree from two sides.
    const records = numberSenders(c)!.records;
    senders[records.length] = (senders[records.length] ?? 0) + 1;
    const { layout, piece } = withNumberSenderTable(takeApart(c));
    const laid = layOutContainer(layout);
    const at = laid.offsetOf(piece)!;
    assert.equal(piece.bytes.length, 1 + 3 * records.length, name);
    records.forEach((record, k) => assert.equal(laid.bytes[at + 1 + 3 * k]! | (laid.bytes[at + 2 + 3 * k]! << 8)
      | (laid.bytes[at + 3 + 3 * k]! << 16), record.address, name));
  }
  // Eight of the nineteen hold one favourite channel sender, which the builder keeps; none holds two.
  assert.deepEqual(senders, { 0: 11, 1: 8 });
  // The control: raw slot 18 holding 00 01 is a configuration nothing here has seen, and is refused, not rebuilt.
  const layout = takeApart(parse(require_(DONOR)));
  const raw = Number(Object.keys(layout.inserted!)[0]);
  layout.inserted![raw]!.head[0]!.bytes[1] = 1;
  assert.throws(() => withTouchInsertedSection(layout), /^Error: raw slot 18 holds 2 bytes, 0001, where every Harmony One container holds two zero bytes/);
});

test('todo-compile-one 6.7: every one of the nineteen One compiles holds base slot 10 lists nothing reaches, 44 to 193 of them, so a configuration carrying some is Logitech\'s own form',
     skipUnless(...NINETEEN), () => {
  const counts = NINETEEN.map((name) => {
    const c = parse(require_(name));
    const reached = listsReached(c);
    return c.actionLists()!.filter((_, index) => !reached.has(index)).length;
  });
  assert.deepEqual([Math.min(...counts), Math.max(...counts)], [44, 193]);
  // The test setup's donor, by the same walk: 59, the 34 the composed setup carries among them, 6.7.
  assert.equal(counts[NINETEEN.indexOf(DONOR)], 59);
});
