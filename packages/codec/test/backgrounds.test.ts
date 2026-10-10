/**
 * The Harmony 650's backgrounds as one colour per state, `todo-compile-650.md` 9.1.2, section 366.
 *
 * Three claims. The colours are the ones decided, in the panel's own form. Which state a screen is in is
 * read by structure, and on Logitech's 13 compiles the device and activity states agree with the grey and
 * red looks Logitech draws on every page, which is the closure: the state comes from the mode table, the
 * working screen record and the battery programs, the look from the page's own program; the idle pages
 * draw both looks, so no picture of Logitech's shows that state. And `withStateBackgrounds` gives every
 * state its colour on all 13 with the setup unchanged, which `checkStateBackgrounds` reads back from pixels.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container } from '../src/index.ts';
import {
  BackgroundError,
  DEFAULT_BACKGROUND_COLOURS,
  HARMONY_650_PICTURES,
  bitmapAt,
  bitmaps,
  checkStateBackgrounds,
  compareViews,
  contentKey,
  layOutContainer,
  modeRecords,
  parse,
  pictureReference,
  reachablePrograms,
  rgb565,
  rgbTo565,
  screenRecordModes,
  screenStates,
  setupView,
  takeApart,
  withStateBackgrounds,
} from '../src/index.ts';

const H650 = [
  'h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

test('the colours decided are rgb(184 32 55), rgb(18 37 200) and rgb(1 136 53) in the panel\'s RGB565', () => {
  assert.deepEqual(
    [DEFAULT_BACKGROUND_COLOURS.device, DEFAULT_BACKGROUND_COLOURS.activity, DEFAULT_BACKGROUND_COLOURS.idle],
    [0xb107, 0x1138, 0x0446],
  );
  assert.equal(rgbTo565(255, 255, 255), 0xffff);
  assert.throws(() => rgbTo565(256, 0, 0), RangeError);
  // What the panel shows of the device colour, through the renderer's own decoder: fewer levels than eight bits.
  assert.deepEqual(rgb565(DEFAULT_BACKGROUND_COLOURS.device), [181, 32, 57]);
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
  for (const name of H650) {
    const original = containerOf(name);
    const made = withStateBackgrounds(takeApart(containerOf(name)));
    const out = parse(layOutContainer(made.layout).bytes);
    assert.ok(out.allChecksPass, `${name}: the result fails its own checks`);
    assert.deepEqual(compareViews(setupView(out), setupView(original)), [], `${name}: the setup changed`);
    const checked = checkStateBackgrounds(out, takeApart(parse(out.blob)));
    totals.device += checked.modes.device;
    totals.activity += checked.modes.activity;
    totals.idle += checked.modes.idle;
    totals.pictures += checked.pictures;
    totals.dropped += made.dropped.length;
    assert.equal(made.idleBattery, (original.pointerArray(11) ?? []).length, `${name}: the idle battery program is not appended`);
  }
  assert.deepEqual(totals, { device: 153, activity: 58, idle: 26, pictures: 1158, dropped: 82 });
});

test('the check refuses Logitech\'s own backgrounds, a state in another colour, a corner patched in another, a page left on the old corner and a page on the plain background',
     skipUnless('h650_test_config_clean'), () => {
  const logitech = containerOf('h650_test_config_clean');
  assert.throws(() => checkStateBackgrounds(logitech, takeApart(containerOf('h650_test_config_clean'))), /draws device page crossed on page 0/);
  const made = parse(layOutContainer(withStateBackgrounds(takeApart(containerOf('h650_test_config_clean'))).layout).bytes);
  const swapped = { ...DEFAULT_BACKGROUND_COLOURS, device: DEFAULT_BACKGROUND_COLOURS.idle, idle: DEFAULT_BACKGROUND_COLOURS.device };
  assert.throws(() => checkStateBackgrounds(made, takeApart(parse(made.blob)), swapped), /not its colour/);
  // Built with the activity patch only in another colour: every background is right and the corner is not.
  const odd = withStateBackgrounds(takeApart(containerOf('h650_test_config_clean')));
  const patch = odd.layout.pictures.find((piece) => piece.bytes.length === 5 + 2 * 12 * 10
    && piece.bytes[5] === DEFAULT_BACKGROUND_COLOURS.activity >> 8 && piece.bytes[6] === (DEFAULT_BACKGROUND_COLOURS.activity & 0xff));
  assert.ok(patch !== undefined, 'the activity patch is in the bank');
  patch.bytes = Uint8Array.from(patch.bytes);
  patch.bytes[5] = 0;
  patch.bytes[6] = 0;
  const oddOut = parse(layOutContainer(odd.layout).bytes);
  assert.throws(() => checkStateBackgrounds(oddOut, takeApart(parse(oddOut.blob))), /patches its battery corner/);
  // One idle page's own program put back on the activity battery program, its mode's key map unchanged.
  const blob = Uint8Array.from(made.blob);
  const c = parse(blob);
  const idle = screenRecordModes(c, takeApart(parse(made.blob)))['activity menu'];
  const queue = [...reachablePrograms(c, [(modeRecords(c)?.[idle]?.pages[0] as { program: number }).program]).values()]
    .flat().find((one) => one.opcode === 17 && one.operands[2] === 0x73);
  assert.ok(queue !== undefined, 'the activity menu\'s first page queues its battery program');
  blob[queue.start + 1] = 2;
  blob[queue.start + 2] = 0;
  assert.throws(() => checkStateBackgrounds(parse(blob), takeApart(parse(made.blob))), /a page queuing program 2/);
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
  assert.throws(() => checkStateBackgrounds(parse(repointed), takeApart(parse(made.blob))), /draws (plain background|2 backgrounds)/);
});

test('a Harmony 700 compile, which shares the look, is refused, since nobody has checked it on a 700',
     skipUnless('h700_28_config_region'), () => {
  assert.throws(() => withStateBackgrounds(takeApart(containerOf('h700_28_config_region'))), /Harmony 650 alone/);
});
