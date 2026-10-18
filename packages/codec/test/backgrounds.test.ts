/**
 * The Harmony 650's backgrounds as one colour per state, `todo-compile-650.md` 9.1.2, section 366.
 *
 * Three claims. The colours are the ones decided, in the panel's own form. Which state a screen is in is
 * read by structure, and on Logitech's 13 compiles the device and activity states agree with the grey and
 * red looks Logitech draws on every page, which is the closure: the state comes from the mode table, the
 * working screen record and the corner programs, the look from the page's own program; the idle pages
 * draw both looks, so no picture of Logitech's shows that state. And `withStateBackgrounds` gives every
 * state its colour on all 13 with the setup unchanged, which `checkStateBackgrounds` reads back from pixels.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container } from '../src/index.ts';
import {
  bitmapAt,
  bitmaps,
  contentKey,
  layOutContainer,
  modeRecords,
  parse,
  pictureReference,
  reachablePrograms,
  rgb565,
  rgbTo565,
  takeApart} from '../src/index.ts';
import { FOUR_SLOT_CHOICES } from '../src/families/four-slot/choices.ts';
import { screenRecordModes } from '../src/families/four-slot/screenrecords.ts';
import { BackgroundError, checkStateBackgrounds, screenStates, withStateBackgrounds } from '../src/families/four-slot/backgrounds.ts';
import { HARMONY_650_PICTURES } from '../src/families/four-slot/pictures.ts';
import { compareViews, setupView } from '../src/families/four-slot/compare.ts';

const H650 = [
  'h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

test('the colours decided are rgb(184 32 55), rgb(18 37 200) and rgb(1 136 53) in the panel\'s RGB565', () => {
  assert.deepEqual(
    [FOUR_SLOT_CHOICES.stateColours.device, FOUR_SLOT_CHOICES.stateColours.activity, FOUR_SLOT_CHOICES.stateColours.idle],
    [0xb107, 0x1138, 0x0446],
  );
  assert.equal(rgbTo565(255, 255, 255), 0xffff);
  assert.throws(() => rgbTo565(256, 0, 0), RangeError);
  // What the panel shows of the device colour, through the renderer's own decoder: fewer levels than eight bits.
  assert.deepEqual(rgb565(FOUR_SLOT_CHOICES.stateColours.device), [181, 32, 57]);
});

test('on the 13 Harmony 650 compiles the device and activity screens draw Logitech\'s grey and red looks, and the idle ones both',
     skipUnless(...H650), () => {
  // Logitech's five designed backgrounds come in two looks, a grey curve and a red one. The states are read
  // by structure; the look from each page's own program. Device and activity agree with the looks on every
  // page, and the idle state has no look of its own, which is why a swap of pictures could not do it.
  const look: Record<string, string> = {
    'device page crossed': 'grey', 'device page of one item': 'grey',
    'working screen crossed': 'red', 'activity menu of one': 'red', 'activity menu of two': 'red',
  };
  const nameByKey = new Map(HARMONY_650_PICTURES.map((entry) => [entry.key, entry.name]));
  const tally = new Map<string, number>();
  for (const name of H650) {
    const c = containerOf(name);
    const states = screenStates(c, takeApart(containerOf(name)));
    (modeRecords(c) ?? []).forEach((record, mode) => {
      for (const page of record.pages) {
        for (const program of reachablePrograms(c, [page.program]).values()) {
          for (const instruction of program) {
            const address = pictureReference(instruction);
            const b = address === undefined ? undefined : bitmapAt(c, address);
            if (address === undefined || b?.length === undefined) continue;
            const off = address - c.flashBase;
            const picture = nameByKey.get(contentKey(c.blob.slice(off, off + b.length)));
            if (picture === undefined || !(picture in look)) continue;
            const key = `${states.get(mode) ?? 'none'} on ${look[picture]}`;
            tally.set(key, (tally.get(key) ?? 0) + 1);
          }
        }
      }
    });
  }
  assert.deepEqual(Object.fromEntries(tally), { 'device on grey': 813, 'activity on red': 67, 'idle on grey': 25, 'idle on red': 29 });
});

test('withStateBackgrounds gives every state its colour on all 13 compiles and changes nothing else a setup shows',
     skipUnless(...H650), () => {
  const totals = { device: 0, activity: 0, idle: 0, pictures: 0, dropped: 0 };
  const entries: number[] = [];
  for (const name of H650) {
    const original = containerOf(name);
    const made = withStateBackgrounds(takeApart(containerOf(name)), FOUR_SLOT_CHOICES.stateColours, FOUR_SLOT_CHOICES.barColour);
    const out = parse(layOutContainer(made.layout).bytes);
    assert.ok(out.allChecksPass, `${name}: the result fails its own checks`);
    assert.deepEqual(compareViews(setupView(out), setupView(original)), [], `${name}: the setup changed`);
    const checked = checkStateBackgrounds(out, takeApart(parse(out.blob)), FOUR_SLOT_CHOICES.stateColours);
    totals.device += checked.modes.device;
    totals.activity += checked.modes.activity;
    totals.idle += checked.modes.idle;
    totals.pictures += checked.pictures;
    totals.dropped += made.dropped.length;
    // A free entry below 256 taken over, section 369, the table keeping its length.
    assert.ok(made.idleCorner < 256, `${name}: the idle corner program is entry ${made.idleCorner}`);
    assert.equal((out.pointerArray(11) ?? []).length, (original.pointerArray(11) ?? []).length, `${name}: base slot 11 changed length`);
    entries.push(made.idleCorner);
  }
  assert.deepEqual(totals, { device: 153, activity: 58, idle: 26, pictures: 1158, dropped: 82 });
  // The lowest entry no `lo 00 0x73` names, per compile in `H650`'s order: 5 on ten, 6 on two, 7 on one.
  assert.deepEqual(entries, [6, 5, 6, 5, 5, 5, 5, 5, 5, 5, 7, 5, 5]);
});

test('the check refuses Logitech\'s own backgrounds, a state in another colour, a corner patched in another, a page left on the old corner, a page on the plain background and an idle corner program past entry 255',
     skipUnless('h650_test_config_clean'), () => {
  const logitech = containerOf('h650_test_config_clean');
  assert.throws(() => checkStateBackgrounds(logitech, takeApart(containerOf('h650_test_config_clean')), FOUR_SLOT_CHOICES.stateColours), /draws device page crossed on page 0/);
  const made = parse(layOutContainer(withStateBackgrounds(takeApart(containerOf('h650_test_config_clean')), FOUR_SLOT_CHOICES.stateColours, FOUR_SLOT_CHOICES.barColour).layout).bytes);
  const swapped = { ...FOUR_SLOT_CHOICES.stateColours, device: FOUR_SLOT_CHOICES.stateColours.idle, idle: FOUR_SLOT_CHOICES.stateColours.device };
  assert.throws(() => checkStateBackgrounds(made, takeApart(parse(made.blob)), swapped), /not its colour/);
  // Built with the activity patch only in another colour: every background is right and the corner is not.
  const odd = withStateBackgrounds(takeApart(containerOf('h650_test_config_clean')), FOUR_SLOT_CHOICES.stateColours, FOUR_SLOT_CHOICES.barColour);
  const patch = odd.layout.pictures.find((piece) => piece.bytes.length === 5 + 2 * 12 * 10
    && piece.bytes[5] === FOUR_SLOT_CHOICES.stateColours.activity >> 8 && piece.bytes[6] === (FOUR_SLOT_CHOICES.stateColours.activity & 0xff));
  assert.ok(patch !== undefined, 'the activity patch is in the bank');
  patch.bytes = Uint8Array.from(patch.bytes);
  patch.bytes[5] = 0;
  patch.bytes[6] = 0;
  const oddOut = parse(layOutContainer(odd.layout).bytes);
  assert.throws(() => checkStateBackgrounds(oddOut, takeApart(parse(oddOut.blob)), FOUR_SLOT_CHOICES.stateColours), /patches its corner/);
  // One idle page's own program put back on the activity corner program, its mode's key map unchanged.
  const blob = Uint8Array.from(made.blob);
  const c = parse(blob);
  const idle = screenRecordModes(c, takeApart(parse(made.blob)))['activity menu'];
  const queue = [...reachablePrograms(c, [(modeRecords(c)?.[idle]?.pages[0] as { program: number }).program]).values()]
    .flat().find((one) => one.opcode === 17 && one.operands[2] === 0x73);
  assert.ok(queue !== undefined, 'the activity menu\'s first page queues its corner program');
  blob[queue.start + 1] = 2;
  blob[queue.start + 2] = 0;
  assert.throws(() => checkStateBackgrounds(parse(blob), takeApart(parse(made.blob)), FOUR_SLOT_CHOICES.stateColours), /a page queuing program 2/);
  // One device page pointed at the plain background, which is a named picture and not a designed one.
  const plainKey = HARMONY_650_PICTURES.find((entry) => entry.name === 'plain background')?.key;
  const plain = bitmaps(made).find((b) => b.length !== undefined
    && contentKey(made.blob.slice(b.address - made.flashBase, b.address - made.flashBase + b.length)) === plainKey);
  assert.ok(plain !== undefined, 'the result holds the plain background');
  const repointed = Uint8Array.from(made.blob);
  const r = parse(repointed);
  const device = [...screenStates(r, takeApart(parse(made.blob)))].find(([, state]) => state === 'device')?.[0] as number;
  const draw = [...reachablePrograms(r, [(modeRecords(r)?.[device]?.pages[0] as { program: number }).program]).values()].flat()
    .find((one) => { const a = pictureReference(one); return a !== undefined && bitmapAt(r, a)?.rows === 128 && bitmapAt(r, a)?.stride === 128; });
  assert.ok(draw !== undefined, 'a device page draws a whole screen picture');
  const field = draw.start + draw.length - 3;
  repointed[field] = plain.address & 0xff;
  repointed[field + 1] = (plain.address >> 8) & 0xff;
  repointed[field + 2] = plain.address >> 16;
  assert.throws(() => checkStateBackgrounds(parse(repointed), takeApart(parse(made.blob)), FOUR_SLOT_CHOICES.stateColours), /draws (plain background|2 backgrounds)/);
  // The idle corner program named as entry 5 + 0x1900, which the firmware runs as entry 5 and section 369's
  // stalled file named as 6653: every key map entry and page program naming 5 given the high byte 0x19.
  const high = Uint8Array.from(made.blob);
  let named = 0;
  for (let k = 1; k + 2 < high.length; k++) {
    if ((high[k - 1] === 0x2d || high[k - 1] === 0x11) && high[k] === 5 && high[k + 1] === 0 && high[k + 2] === 0x73) { high[k + 1] = 0x19; named++; }
  }
  assert.equal(named, 7, 'two idle key maps and five idle pages name the idle corner program');
  assert.throws(() => checkStateBackgrounds(parse(high), takeApart(parse(made.blob)), FOUR_SLOT_CHOICES.stateColours), /runs as entry 5/);
});

test('a Harmony 700 compile, which shares the look, is refused, since nobody has checked it on a 700',
     skipUnless('h700_28_config_region'), () => {
  assert.throws(() => withStateBackgrounds(takeApart(containerOf('h700_28_config_region')), FOUR_SLOT_CHOICES.stateColours, FOUR_SLOT_CHOICES.barColour), /Harmony 650 alone/);
});
