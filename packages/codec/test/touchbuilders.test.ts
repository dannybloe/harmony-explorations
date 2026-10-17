/**
 * The Harmony One's builders on the composed path, `todo-compile-one.md` 3.2.2, `families/touch/builders.ts`: the
 * firmware screens, the fixed screens, the tour and Remote Assistant, the status screens, the clock header, the
 * wiring and the state tables, each built from a description of the configuration being composed in place of the
 * donor's part; the first five and the last two since 3.2.2.1, the status screens and the clock header since 3.2.2.2.
 *
 * What is held here is what the composition in `composesetup.test.ts` cannot show cheaply: that on Logitech's own
 * compile the seven come back byte for byte, so putting them on the path changes nothing a builder does not mean to;
 * what does change on the donor lettered in ours and why; that a builder's refusal is the path's; and that the
 * attribution refuses a screen the donor's placing carried, which is what lets it tell a built part from a carried
 * one where their bytes differ.
 *
 * Every figure is exact.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { type Container, EVENT_MAP_SLOT, archSlot, claims, eventMap, parse, screenProgram, screenUnits } from '../src/index.ts';
import { saveEdits } from '../src/edit.ts';
import { SCREEN_TEXT_AT, SCREEN_TEXT_INLINE } from '../src/screen.ts';
import { TOUCH } from '../src/families/touch/index.ts';
import { TouchBuildError, touchBuiltBytes, withTouchBuilders } from '../src/families/touch/builders.ts';
import { touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';
import { touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';

const DONOR = 'harvest_one_two_devices';

/** The test setup's donor lettered in ours, as `composeSetup` letters it before anything is composed. */
let letteredOnce: Container | undefined;
const lettered = (): Container => {
  letteredOnce ??= parse(TOUCH.composedLook!.letterDonor(parse(require_(DONOR)), TOUCH.choices).bytes);
  return letteredOnce;
};

test('todo-compile-one 3.2.2: on Logitech\'s compile of two devices the seven builders on the composed path give back every byte as it was',
     skipUnless(DONOR), () => {
  const donor = parse(require_(DONOR));
  const out = withTouchBuilders(donor);
  assert.deepEqual(out.built, [
    'firmware screens', 'fixed screens', 'tour and Remote Assistant', 'status screens', 'clock header', 'wiring', 'state tables',
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
  // its minutes start at 158 whatever their width and do not move.
  assert.deepEqual(count, { firmware: 10, fixed: 93, tour: 32, status: 37, clock: 25, other: 0 });
});

test('todo-compile-one 3.2.2: a builder\'s refusal is the composed path\'s, never the donor\'s part kept: a build year offering a leap year, the Dutch compile, the everyday One\'s, an event map naming one status screen for two codes and a clock header with two gauges',
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
  // And the family's member on the composed path is this function, which `composeSetup` calls on every composition.
  assert.equal(TOUCH.composedBuilders, withTouchBuilders);
});

test('todo-compile-one 3.2.2: the attribution refuses the donor lettered in ours, whose screens still sit where Logitech placed them for its letters, at the first firmware screen text the builder places otherwise',
     skipUnless(DONOR), () => {
  assert.throws(() => touchBuiltBytes(lettered(), []),
    (error: unknown) => error instanceof TouchBuildError
      && /^building the Harmony One's firmware screens: the built records differ from the configuration's at byte 353, in the Low Battery's page 1's program$/.test(error.message));
});
