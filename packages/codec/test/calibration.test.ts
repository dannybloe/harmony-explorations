/**
 * The corpus's only known answer samples, and the only test here whose expected values were chosen
 * before the bytes existed.
 *
 * Every other reader test in this repository checks a config against itself: that the counts close,
 * that the pointers land, that two readers agree. Those catch a reader that is inconsistent and they
 * cannot catch a reader that is consistently wrong, which is why `CLAUDE.md`'s verification standard
 * asks for a calibration case and why this project went a year without one.
 *
 * On 13 August 2026 a throwaway MyHarmony account was given three devices and two activities, chosen
 * from Logitech's own catalogue, and the live service compiled a configuration for a Harmony One and
 * for a Harmony 600. So the answer below is not derived from the files: it is what was asked for.
 * Section 132.
 *
 * **The names are deterministic and that is what makes them usable.** Harmony Desktop will not let a
 * user name an activity: the name comes from the activity type, and a device's name is composed from
 * its manufacturer and its device type. So `Watch TV` and `Sony TV` follow from the choice rather than
 * being typed, which is why they can be asserted rather than recorded.
 *
 * What this exercises end to end, on two architectures at once: the container, the state variable name
 * tree, the infrared group to device pairing, the activity chain through four hops, and the reading of
 * a label out of the pixels a screen program draws. Sections 86, 120, 121, 125 and 126. Two of those
 * reach the name by completely different routes, a stated rectangle in base slot 17 on the One and
 * string matching against the modes an activity enters on the 600, which is the second reason the pair
 * is worth more than either half.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { imagePath, require_, skipUnless } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { devices, activities, inventory } from '../src/inventory.ts';
import { coverage } from '../src/coverage.ts';
import { emit } from '../src/emit.ts';

/** What was chosen, before any of these bytes existed. */
const CHOSEN = {
  devices: ['Denon_AV_Receiver', 'Panasonic_Blu-ray_Player', 'Sony_TV'],
  activities: ['Watch TV', 'Watch a Movie'],
  /** Which of the three each activity drives, by the name the device reader gives it. */
  drives: {
    'Watch TV': ['Denon_AV_Receiver', 'Sony_TV'],
    'Watch a Movie': ['Denon_AV_Receiver', 'Panasonic_Blu-ray_Player'],
  } as Record<string, string[]>,
} as const;

const SAMPLES: readonly [string, number, number][] = [
  // name, architecture, the skin its version word states
  ['calibration_one', 12, 54],
  ['calibration_h600', 14, 71],
];

function load(name: string) {
  return parse(new Uint8Array(readFileSync(imagePath(name)!)));
}

test(
  'a config compiled to our specification reads back as what we asked for',
  skipUnless('calibration_one', 'calibration_h600'),
  () => {
    for (const [name, architecture, skin] of SAMPLES) {
      const c = load(name);
      assert.equal(c.architecture, architecture, `${name} is arch ${architecture}`);
      assert.equal(c.versionWord! & 0xff, skin, `${name} states skin ${skin}`);

      // The devices, by the name the ASCII route in section 126 gives them. Sorted, because the
      // infrared group order is not stable between compiles: the One puts Denon first and the 600
      // puts Sony first, from identical input, which is itself a writer rail.
      const found = devices(c);
      assert.deepEqual(
        found.map((d) => d.name).sort(),
        [...CHOSEN.devices],
        `${name} names the three devices that were chosen`,
      );
      // And every one of them by that route rather than by a fallback, which is what says the pairing
      // through base slot 13 worked rather than elimination having covered for it.
      for (const d of found) {
        assert.equal(d.source, 'names', `${d.name} in ${name} came from the name tree`);
      }

      const acts = activities(c);
      assert.deepEqual(
        acts.map((a) => a.name).sort(),
        [...CHOSEN.activities].sort(),
        `${name} names both activities`,
      );

      // Which devices each activity drives, which is the base slot 9 set's own infrared groups. The
      // expected value is the pair of devices that activity was built from.
      for (const a of acts) {
        const drives = a.devices.map((g) => found.find((d) => d.group === g)?.name).sort();
        assert.deepEqual(drives, CHOSEN.drives[a.name!], `${a.name} in ${name} drives its devices`);
      }
    }
  },
);

test(
  'the two architectures reach the same names by different routes',
  skipUnless('calibration_one', 'calibration_h600'),
  () => {
    // The point of the pair. On arch 12 a mode page's `lead` byte indexes base slot 17's hit map, so
    // the label is the text inside a stated rectangle, section 125. On arch 14 there is no hit map and
    // the label is found by matching the page's strings against the modes the activity's chain enters,
    // section 121, under four rules every one of which was discovered by having it fail. Identical
    // input through both, and the same two names out.
    const one = activities(load('calibration_one'));
    const h600 = activities(load('calibration_h600'));
    assert.deepEqual(one.map((a) => a.name).sort(), h600.map((a) => a.name).sort());

    // And the geometry genuinely differs, so the two are not accidentally the same code path: the One
    // binds one scan code per activity on its touch panel and the 600 binds two, being physical keys
    // beside the screen.
    assert.deepEqual(one.map((a) => a.scans.length), [1, 1]);
    for (const a of h600) assert.equal(a.scans.length, 2, `${a.name} binds two keys on a 600`);
  },
);

test(
  'the inventory is the whole answer in one object',
  skipUnless('calibration_one', 'calibration_h600'),
  () => {
    // What FreeHarmony consumes, so this asserts the shape the application sees rather than the
    // readers underneath it. Three devices and two activities on both, which is the count the account
    // was given.
    for (const [name] of SAMPLES) {
      const inv = inventory(load(name));
      assert.equal(inv.devices.length, 3, `${name} holds three devices`);
      assert.equal(inv.activities.length, 2, `${name} holds two activities`);
      // The build timestamp is present and is **not** asserted against the wall clock. Section 131:
      // Logitech's compiler stamps it from its own clock, which was almost a day behind UTC on the day
      // these were made, so an assertion against the real time would fail for a reason that has
      // nothing to do with this codec.
      assert.match(inv.builtAt!, /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d$/);
    }
  },
);

/**
 * Every known answer sample, whether the readers can account for it and put it back.
 *
 * **These four sit outside the corpus wide populations on purpose, and that had a cost nobody had
 * noticed**: `ACCOUNTED`, `REBUILT` and the coverage loops all walk `CONTAINERS`, so until this test
 * existed the samples that differ most from the corpus were the ones whose byte accounting and round
 * trip nothing asserted. They were measured by hand on the day each arrived, which is not a test.
 *
 * They differ in ways that matter for a reader: three were compiled by Logitech's current service
 * rather than by the software of ten years ago, one is a real five device setup, one carries the only
 * base slot 16 record anywhere, and their device definitions come from today's database and are richer
 * than the corpus's. A reader that broke on any of that would have gone unnoticed.
 */
const KNOWN_ANSWER = [
  'calibration_one',
  'calibration_h600',
  'calibration_favchannels',
  'one_spare_myharmony',
  'calibration_favzero',
] as const;

for (const name of KNOWN_ANSWER) {
  test(`${name} accounts to the byte, with no gap and no overlap`, skipUnless(name), () => {
    const c = parse(require_(name));
    const report = coverage(c);
    // Stated as the three separate facts rather than as the percentage: a percentage rounds, and a
    // gap of one byte in 1.6 MB still reports 100.0%.
    assert.deepEqual(report.gaps, []);
    assert.deepEqual(report.overlaps, []);
    assert.equal(report.accounted, report.total);
  });

  test(`${name} is rebuilt byte for byte with nothing copied`, skipUnless(name), () => {
    // `copied` is the number that carries this: an emitter that starts from a copy of its input
    // round trips while writing nothing, so byte equality alone is not the claim.
    const data = require_(name);
    const report = emit(parse(data));
    assert.deepEqual(report.bytes, data);
    assert.equal(report.copied, 0);
  });
}
