/**
 * The measured geometry, checked against what is known about the hardware.
 *
 * **No lab needed.** These files are our own work and live in the repository, so every assertion here
 * runs in a fresh clone. That is deliberate: the check that costs nothing should be the one that
 * always runs.
 *
 * What these cannot see is whether the drawing looks right. A key at the wrong angle, a caption half a
 * row out or a symbol on the wrong key passes everything below. That is what
 * `make silhouettes SILHOUETTE_ARGS=--preview` is for, and it is a person's job.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MODELS, SCAN_SOURCES, keyOf, keyOfScan, pathBounds, pathPolygon } from '../src/index.ts';
import { transformPath } from '../src/internal.ts';
import type { Model, ScanSource } from '../src/types.ts';

/**
 * What each model's button count is, where the number comes from, and how many scan codes each source
 * gave it.
 *
 * An exact count, never a floor. `CLAUDE.md` records a sweep that found ninety three lower bounds
 * standing in for figures, whose median sat forty per cent under the value they guarded, and the two
 * things a floor cannot do at all are notice a total moving up and say how strong a control is.
 *
 * `scans` counts the keys whose code came from each source, `SCAN_SOURCES` in `src/types.ts`, and
 * `decided` names every key whose code came from anywhere **but** section 133's button maps, scan by
 * scan. Those are the codes a frame cannot check, so each is a claim of its own archive section and is
 * stated here as one. The 133 codes are checked against the frames they send in the calibration
 * configurations, `packages/codec/test/infrared/irframe.test.ts`, which needs the lab.
 *
 * Until plan 009's step 3.3 these codes were checked against `reference/button-maps.md`, a Markdown table
 * this test parsed. The drawings hold the codes now, so there is no second copy to compare with, and
 * what is left to assert without the lab is that each code says where it came from and that the counts
 * are exact.
 */
const EXPECTED: Readonly<Record<string, {
  buttons: number;
  scans: Readonly<Partial<Record<ScanSource, number>>>;
  decided?: Readonly<Record<number, string>>;
  why: string;
}>> = {
  /**
   * The Harmony 350's moulding with the US 300's printing, skin 78, so its count is the 350's drawing's,
   * which a statement made holding both remotes confirms; `h300.ts` takes every shape from `H350`. No code:
   * no US unit has been pressed.
   */
  h300: {
    buttons: 55,
    scans: {},
    why: "the Harmony 350's drawing, the same moulding per a statement made holding both, and the 300 "
      + "setup guide's cover photograph shows the same 55 keys",
  },
  /**
   * The European printing, skin 79: the same 55 shapes, and 49 codes heard by pressing every key of a skin 79
   * unit in two device modes, `todo-compile-300.md` 2.1 and 2.2, `packages/bench/test/harmony-300-350/keys300.test.ts`. Every
   * one is a decision of its own, so all 49 are named below; each is the code of the 350 key in the same
   * place, and the six left are keys neither configuration on the unit tells apart: one binds nothing to
   * them, the other gives them Info's command, as it gives several codes.
   */
  h300eu: {
    buttons: 55,
    scans: { 't-harmony-300-keys-u': 49 },
    decided: {
      1: 'CableSat', 2: 'Favorite3', 3: 'Power', 4: 'VcrAux', 5: 'Tv', 6: 'WatchTV', 7: 'Dvd', 8: 'Favorite1',
      9: 'Favorite2', 10: 'Menu', 11: 'Teletext', 12: 'Exit', 13: 'Red', 14: 'DirectionLeft', 15: 'VolumeMute',
      16: 'List', 17: 'Number4', 18: 'Number7', 20: 'Number0', 21: 'SkipBack', 22: 'Rewind', 23: 'Record',
      24: 'Number1', 27: 'Green', 28: 'Yellow', 29: 'Blue', 30: 'FastForward', 31: 'DirectionRight',
      32: 'PrevChannel', 33: 'Guide', 34: 'Favorite4', 36: 'Info', 37: 'Number6', 38: 'SkipForward',
      39: 'Number3', 40: 'Stop', 41: 'ChannelDown', 42: 'DirectionDown', 44: 'Play', 45: 'Number9', 46: 'Pause',
      47: 'Number2', 48: 'Number5', 49: 'VolumeUp', 50: 'Select', 51: 'DirectionUp', 52: 'VolumeDown',
      53: 'Number8', 55: 'ChannelUp',
    },
    why: "the Harmony 350's drawing, the same moulding per a statement made holding a 300 and a 350, with the "
      + 'European printing stated by a person holding a skin 79 unit',
  },
  /**
   * The count is the drawing's. Two of Logitech's own drawings in the setup guide agree on it, the button
   * page and the box contents page, and the cover photograph agrees for the 35 keys above the transport
   * block that it shows; the firmware's keypad scan numbers 56 codes, one of which no key raises.
   *
   * 44 codes heard at the bench, `todo-compile-350.md` 2.2.2, and 9 more heard on Logitech's compile of the
   * test setup, 3.3, and no other source: every one is a decision of its own, so all 53 are named below.
   */
  h350: {
    buttons: 55,
    scans: { 't-harmony-350-keys-u': 44, 't-harmony-350-setup-u': 9 },
    decided: {
      5: 'TvMedia', 7: 'AvrGame', 3: 'Power', 35: 'Input', 2: 'Favorite5', 36: 'Info', 12: 'Exit', 33: 'Guide',
      25: 'UpArrow', 26: 'DownArrow', 13: 'Red', 27: 'Green', 28: 'Yellow', 29: 'Blue', 49: 'VolumeUp',
      52: 'VolumeDown', 51: 'DirectionUp', 31: 'DirectionRight', 42: 'DirectionDown', 14: 'DirectionLeft',
      50: 'Select', 55: 'ChannelUp', 41: 'ChannelDown', 15: 'VolumeMute', 32: 'PrevChannel', 22: 'Rewind',
      30: 'FastForward', 21: 'SkipBack', 38: 'SkipForward', 23: 'Record', 40: 'Stop', 44: 'Play', 46: 'Pause',
      24: 'Number1', 47: 'Number2', 39: 'Number3', 17: 'Number4', 48: 'Number5', 37: 'Number6', 18: 'Number7',
      53: 'Number8', 45: 'Number9', 19: 'Clear', 20: 'Number0',
      1: 'CablePc', 4: 'DvdMusic', 6: 'WatchTV', 8: 'Favorite1', 9: 'Favorite2', 10: 'Menu', 11: 'Favorite3',
      34: 'Favorite4', 54: 'Enter',
    },
    why: "Logitech's own button drawing in the Harmony 350 setup guide, counted shape by shape, "
      + 'which its box contents drawing and the cover photograph agree with where they reach',
  },
  // No code at all: section 133's calibration configurations were compiled for a Harmony One and a
  // Harmony 600, so nothing names a key of this architecture against its code. Its four soft keys carry
  // candidates from the firmware's matrix instead, the test further down.
  // The 525's face with its nameplate and two keys' markings changed, `h515.ts`, so its counts and their
  // grounds are the 525's.
  h515: {
    buttons: 50,
    scans: {},
    why: "the Harmony 525's face, taken shape by shape in `h515.ts` on a statement made holding both",
  },
  h525: {
    buttons: 50,
    scans: {},
    why: "the 8 by 8 matrix in the firmware, both of its configs binding the same 50 codes, a bench "
      + 'census on the remote, and a count off a product photograph, which is four routes agreeing',
  },
  /**
   * 36 codes from the button maps, the four arrow keys from the devices' own maps, section 323, and Help
   * from every activity Logitech compiles for this architecture, section 333. Not yet carried, though
   * measured: the screen corners and the centre key, sections 285 and 311, and the activity keys, 314.
   */
  h600: {
    buttons: 54,
    scans: { 133: 36, 323: 4, 333: 1 },
    decided: { 26: 'UpArrow', 27: 'DownArrow', 50: 'DirectionUp', 42: 'DirectionDown', 3: 'Help' },
    why: 'six bits of a key event byte, a bench census of 14 14 13 13 per column, counting the '
      + "photograph, and Logitech's own manual listing 54 buttons in its own table",
  },
  // The 600's face with another model number, per a statement made holding all three; `h650.ts` and
  // `h700.ts` take every shape and scan code from `H600`, so the counts and their grounds are the 600's.
  h650: {
    buttons: 54,
    scans: { 133: 36, 323: 4, 333: 1 },
    decided: { 26: 'UpArrow', 27: 'DownArrow', 50: 'DirectionUp', 42: 'DirectionDown', 3: 'Help' },
    why: "the Harmony 600's drawing and measurements, the same face per a statement made holding both",
  },
  h700: {
    buttons: 54,
    scans: { 133: 36, 323: 4, 333: 1 },
    decided: { 26: 'UpArrow', 27: 'DownArrow', 50: 'DirectionUp', 42: 'DirectionDown', 3: 'Help' },
    why: "the Harmony 600's drawing and measurements, the same face per a statement made holding both",
  },
  /**
   * Its own face, `h720.ts`, measured off its product photograph and checked against the picture in Logitech's
   * manual for the 720, and 49 is what its one configuration's key table holds as press codes. No Harmony 720
   * has been pressed and one configuration of it is known, so no key carries a code.
   */
  h720: {
    buttons: 49,
    scans: {},
    why: "the 720's own product photograph and the picture in its manual, which agree, and the 49 press codes "
      + "its one configuration's key table holds",
  },
  /**
   * The 885's face with two chevron keys where the 885 has four colour keys, `h880.ts`, read off the 880's
   * own product photograph and the picture in Logitech's reviewer's guide for it, and 53 is what its
   * configurations' key tables hold, the 885's 55 less 19 and 60. No Harmony 880 has been pressed: 29 keys
   * carry the code Logitech's compiles for skin 15 name them on, each the code the same key raised on an
   * 885, `tests/harmony_880_885/test_harmony_880_keys.py`, and the other 22 carry no code. The two chevrons share two
   * candidates, below.
   */
  h880: {
    buttons: 53,
    scans: { 't-880-keys-c': 29 },
    decided: {
      11: 'VolumeMute', 13: 'VolumeUp', 14: 'DirectionLeft', 15: 'VolumeDown', 16: 'DirectionUp', 17: 'Menu',
      18: 'Exit', 21: 'Stop', 22: 'Record', 23: 'Rewind', 25: 'Number1', 26: 'Number4',
      27: 'Number8', 29: 'Number7', 32: 'Number0', 33: 'Select', 34: 'DirectionDown', 35: 'DirectionRight',
      36: 'ChannelDown', 37: 'ChannelUp', 51: 'Info', 54: 'FastForward', 55: 'Pause',
      56: 'Play', 57: 'Number2', 58: 'Number3', 59: 'Number6', 61: 'Number5', 62: 'Number9',
    },
    why: "the Harmony 885's drawing less its four colour keys and plus two chevron keys, as the 880's own "
      + 'product photograph shows, and the 53 codes its configurations\' key tables hold',
  },
  /**
   * The 885's 55 shapes with six keys printed otherwise, `h880pro.ts`, read off the 880 Pro's product
   * photograph and checked against its manual, and its one configuration's key table holds exactly the 885's
   * 55 press codes. One configuration is not the two contributors the 880's rule asks for, so no code.
   */
  h880pro: {
    buttons: 55,
    scans: {},
    why: "the Harmony 885's drawing with the 880 Pro's printing, as its own product photograph shows, and the "
      + "885's 55 press codes in its one configuration's key table",
  },
  /**
   * The 880 Pro's face with its own nameplate, `h890pro.ts`, read off the 890 Pro's
   * product photograph. No configuration of an 890 Pro is known, so no code, and the count is the drawing's.
   */
  h890pro: {
    buttons: 55,
    scans: {},
    why: "the Harmony 880 Pro's drawing, which the 890 Pro's own product photograph shows key for key, and "
      + 'no configuration of it known',
  },
  /**
   * The count is the units': 55 keys pressed on a Harmony 885 raised 55 codes, exactly the press codes its
   * configuration's key table holds, and the nine codes no key raised are the nine the table leaves empty,
   * `tests/harmony_880_885/test_harmony_885_keys.py`; the photograph the drawing was measured off shows the same 55. Every
   * code was read off the remote's memory while its key was pressed, so all 55 are named below.
   */
  h885: {
    buttons: 55,
    scans: { 't-885-keys-u': 55 },
    decided: {
      1: 'Activities', 2: 'AllOff', 3: 'Help', 5: 'ScreenLeft1', 6: 'ScreenLeft2', 7: 'ScreenLeft3', 8: 'ScreenLeft4',
      10: 'Device', 11: 'VolumeMute', 12: 'ScreenPrev', 13: 'VolumeUp', 14: 'DirectionLeft', 15: 'VolumeDown',
      16: 'DirectionUp', 17: 'Menu', 18: 'Exit', 19: 'Green', 20: 'Red', 21: 'Stop', 22: 'Record', 23: 'Rewind',
      24: 'SkipBack', 25: 'Number1', 26: 'Number4', 27: 'Number8', 29: 'Number7', 31: 'Clear', 32: 'Number0',
      33: 'Select', 34: 'DirectionDown', 35: 'DirectionRight', 36: 'ChannelDown', 37: 'ChannelUp', 38: 'Media',
      40: 'PrevChannel', 41: 'Glow', 43: 'ScreenNext', 44: 'ScreenRight4', 45: 'ScreenRight1', 46: 'ScreenRight2',
      48: 'ScreenRight3', 50: 'Guide', 51: 'Info', 52: 'Blue', 53: 'SkipForward', 54: 'FastForward', 55: 'Pause',
      56: 'Play', 57: 'Number2', 58: 'Number3', 59: 'Number6', 60: 'Yellow', 61: 'Number5', 62: 'Number9',
      63: 'Enter',
    },
    why: 'every key pressed on a unit raising its own code, the 55 its key table holds and none of the nine it '
      + 'leaves empty, and the product photograph the drawing was measured off showing the same 55',
  },
  one: {
    buttons: 44,
    /**
     * Two codes come from the touch panel rather than the keypad, and naming them is what stops the
     * exception being an exemption.
     *
     * The button maps reach 32 of the 44, and nothing for the touch panel, because a touch region is not
     * a keypad scan. Base slot 17's hit map does: codes 46 and 47 hold the same rectangle in all 74 hit
     * pages of the two Harmony One configs, `docs/findings.md` section 125. The four arrow keys are the
     * devices' own maps' decision, section 398.
     */
    scans: { 133: 32, 398: 4, 125: 2 },
    decided: {
      27: 'DirectionUp', 29: 'DirectionDown', 36: 'UpArrow', 26: 'DownArrow', 46: 'ScreenPrev', 47: 'ScreenNext',
    },
    why: 'ten keys on the keypad plus the twelve the maps do not reach, counted off the '
      + 'photograph, with the four touch regions the hit map states',
  },
  /**
   * As weak as the Harmony 350's and for the same reason: nothing has read this architecture's keypad,
   * so the count is the drawing's. 27 keys plus the two printed marks above the screen, which the
   * legend lists among the buttons.
   */
  touch: {
    buttons: 29,
    scans: {},
    why: "Logitech's own drawing in the Harmony Touch setup guide counted shape by shape, its legend's "
      + 'seventeen callouts, and the product photograph, which shows the same 29',
  },
};

/**
 * The sources whose codes Logitech's own maps name: the button maps, and the device maps that decided the
 * arrow pairs. A key named in Logitech's vocabulary, `src: 'catalogue'`, has a code from one of these, and
 * a key whose name is ours has a code from none of them.
 */
const NAMED_BY_LOGITECH: ReadonlySet<ScanSource> = new Set([133, 323, 398]);

const drawn = Object.entries(MODELS);

test('every drawn model states its button count and where that number comes from', () => {
  assert.deepEqual(Object.keys(MODELS).sort(), Object.keys(EXPECTED).sort());
  for (const [id, model] of drawn) {
    const want = EXPECTED[id]!;
    assert.equal(model.keys.length, want.buttons, `${id}: ${want.why}`);
    assert.ok(want.why.length > 40, `${id}: the reason is the point, not the number`);
  }
});

test('a name identifies one key, and every key has one', () => {
  for (const [id, model] of drawn) {
    const names = model.keys.map((k) => k.name);
    assert.equal(new Set(names).size, names.length, `${id}: a name is claimed twice`);
    for (const name of names) {
      assert.match(name, /^[A-Z][A-Za-z0-9]*$/, `${id}: ${name} is not a name`);
      assert.equal(keyOf(model, name)?.name, name);
    }
  }
});

test('a scan code says where it came from, and each source gives exactly its count', () => {
  for (const [id, model] of drawn) {
    const want = EXPECTED[id]!;
    const counts: Partial<Record<ScanSource, number>> = {};
    const seen = new Set<number>();
    for (const key of model.keys) {
      // `scanFrom` is present exactly when `scan` is: a code with no source is a code nobody can check,
      // and a source with no code is a claim about nothing.
      assert.equal(key.scan === undefined, key.scanFrom === undefined,
        `${id}: ${key.name} has ${key.scan === undefined ? 'a source and no code' : 'a code and no source'}`);
      if (key.scan === undefined) continue;
      assert.ok(key.scanFrom! in SCAN_SOURCES, `${id}: ${key.name} names an unknown source ${key.scanFrom}`);
      // A code names one key. A wrong scan code is invisible, because the interface would show the wrong
      // assignment beside a key with complete confidence, and a duplicated one is the cheapest way to get one.
      assert.ok(!seen.has(key.scan), `${id}: scan ${key.scan} is claimed twice`);
      seen.add(key.scan);
      assert.equal(keyOfScan(model, key.scan)?.name, key.name);
      counts[key.scanFrom!] = (counts[key.scanFrom!] ?? 0) + 1;
    }
    assert.deepEqual(counts, want.scans, `${id}: codes per source`);
    // Every code from a source other than the button maps, named here one by one, in both directions.
    const decided = Object.fromEntries(model.keys
      .filter((k) => k.scanFrom !== undefined && k.scanFrom !== 133)
      .map((k) => [String(k.scan), k.name]));
    assert.deepEqual(decided, { ...want.decided },
      `${id}: the codes the button maps did not give`);
  }
});

test('a catalogue name carries a code Logitech\'s maps name, and a printed one does not', () => {
  for (const [id, model] of drawn) {
    for (const key of model.keys) {
      if (key.src === 'catalogue') {
        // Every key named in Logitech's vocabulary was named against its code, since the arrow pairs were
        // decided; a model with no calibration configuration, the Harmony 525 say, therefore has none.
        assert.ok(key.scanFrom !== undefined && NAMED_BY_LOGITECH.has(key.scanFrom),
          `${id}: ${key.name} claims Logitech's name and carries no code their maps name`);
      } else {
        assert.ok(key.scanFrom === undefined || !NAMED_BY_LOGITECH.has(key.scanFrom),
          `${id}: ${key.name} has a code Logitech's maps name, so its name is not ours to choose`);
      }
    }
  }
});

test('a key whose code is undecided carries candidates and no scan', () => {
  for (const [id, model] of drawn) {
    const undecided = model.keys.filter((k) => k.scanCandidates !== undefined);
    /**
     * The Harmony 525 has one block of four from the firmware's own matrix rather than from any measured
     * code, because nothing says which of two columns is the left one; the Harmony 350's are below.
     *
     * The Harmony One and the Harmony 600 had two symmetric pairs each until plan 009's step 3.3: the two
     * up keys send one command and so do the two down keys, so neither elimination nor decoding could
     * split them, and the devices' own maps did, sections 398 and 323. The count stays stated per model,
     * since the shape of an ambiguity differs between models and a test asserting pairs everywhere would
     * have forced a wrong answer on the 525.
     */
    /**
     * The Harmony 350 has one set left, Live alone on one of two codes no configuration binds,
     * `packages/bench/test/harmony-300-350/keys350.test.ts`, which is why a set is stated by its size rather than by one
     * size per model: a set of candidates may be larger than the keys sharing it. It had a second, four
     * favourite keys sharing the four codes favourite 5 did not take, until `todo-compile-350.md` 3.3 heard
     * them. The Harmony 300 has none on either printing: its drawings take no code from the 350's, `h300.ts`,
     * and the European one carries only what its own unit decided, `h300eu.ts`.
     *
     * The Harmony 880's two chevron keys share 20 and 52, the two of the 885's four colour key codes its key
     * table keeps, which Logitech's compiles for skin 15 bind as a pair; which chevron is which is not
     * settled, `h880.ts`. Neither is a code another key of its drawing carries, which the check below holds.
     */
    const SETS: Readonly<Record<string, readonly { keys: number; codes: number }[]>> = {
      h300: [], h300eu: [], h350: [{ keys: 1, codes: 2 }],
      h515: [{ keys: 4, codes: 4 }], h525: [{ keys: 4, codes: 4 }], h600: [], h650: [], h700: [], h720: [], h880: [{ keys: 2, codes: 2 }], h880pro: [], h885: [], h890pro: [], one: [],
      touch: [],
    };
    const want = SETS[id]!;
    for (const key of undecided) {
      assert.equal(key.scan, undefined, `${id}: ${key.name} claims a code and candidates`);
    }
    const sets = new Map<string, string[]>();
    for (const key of undecided) {
      const k = [...key.scanCandidates!].sort((a, b) => a - b).join(',');
      sets.set(k, [...(sets.get(k) ?? []), key.name]);
    }
    const shapes = [...sets].map(([codes, names]) => ({ keys: names.length, codes: codes.split(',').length }))
      .sort((a, b) => b.keys - a.keys || b.codes - a.codes);
    assert.deepEqual(shapes, want, `${id}: the candidate sets`);
    // A candidate is never a code another key on the drawing carries.
    const carried = new Set(model.keys.flatMap((k) => (k.scan === undefined ? [] : [k.scan])));
    for (const key of undecided) {
      for (const code of key.scanCandidates!) {
        assert.ok(!carried.has(code), `${id}: ${key.name}'s candidate ${code} is another key's code`);
      }
    }
  }
});

test('a rocker names keys that exist, and no key belongs to two mouldings', () => {
  for (const [id, model] of drawn) {
    const seen = new Set<string>();
    for (const rocker of model.rockers ?? []) {
      assert.ok(rocker.keys.length >= 2, `${id}: ${rocker.id} is a rocker with one segment`);
      for (const name of rocker.keys) {
        assert.ok(keyOf(model, name), `${id}: ${rocker.id} names ${name}, which is not a key`);
        assert.ok(!seen.has(name), `${id}: ${name} is a segment of two mouldings`);
        seen.add(name);
      }
    }
  }
});

test('the case fills the nominal height and every model shares it', () => {
  const heights = new Set(drawn.map(([, m]) => m.height));
  // One height for all of them, which is what lets the interface show two remotes at the same size.
  assert.equal(heights.size, 1);
  for (const [id, model] of drawn) {
    // The title claims the case **fills** the height, and the body used to count the numbers in the
    // path instead, which is a different and much weaker claim. Measuring it properly is what found
    // that the end caps bulged past the viewBox and were being clipped, so the drawn top of a remote
    // was flat. It asks `pathBounds` rather than parsing the path here, because an arc's bulge is the
    // whole point and a second path reader is the copy this repository's oldest rule forbids.
    const b = pathBounds(model.case);
    // Exact to a hundredth: `contour` normalises the whole shape, cap arcs included, onto [0, height],
    // so a tolerance here would only hide the next thing that stops doing that.
    assert.ok(Math.abs(b.minY) < 0.01, `${id}: the case starts at ${b.minY}, not the top`);
    assert.ok(Math.abs(b.maxY - model.height) < 0.01,
      `${id}: the case ends at ${b.maxY} of ${model.height}`);
    assert.ok(b.minX >= 0 && b.maxX <= model.width,
      `${id}: the case runs from ${b.minX} to ${b.maxX} in a width of ${model.width}`);
    /**
     * And the drawn curve, not just its endpoints, stays inside the box the SVG gives it, which is the
     * width plus a margin of one case stroke, half of which the stroke itself uses.
     *
     * The endpoint check above cannot see a cubic's bulge, and the Harmony Touch's setup guide draws
     * each side of its case as one cubic that bulges 8.733 units past its ends. Sized by endpoints, its
     * case passed the check above and was clipped by its own viewBox on both sides, which is how it was
     * found: by looking at a render. The cases fitted through samples bulge at most 0.794 units, the
     * Harmony 350's, so one unit separates them from the defect by a factor of eight.
     */
    const curve = pathBounds(model.case, true);
    assert.ok(curve.minX >= -1 && curve.maxX <= model.width + 1
      && curve.minY >= -1 && curve.maxY <= model.height + 1,
      `${id}: the drawn case reaches ${curve.minX.toFixed(3)} to ${curve.maxX.toFixed(3)} across a width of `
      + `${model.width}, and ${curve.minY.toFixed(3)} to ${curve.maxY.toFixed(3)} down`);
    // And it uses most of the width, so a drawing cannot sit in a corner of its own viewBox.
    assert.ok(b.maxX - b.minX > model.width * 0.9, `${id}: the case is narrow inside its own box`);
    assert.ok(model.width > 0 && model.width < model.height, `${id}: a remote is taller than wide`);
  }
});

test('the screen carries the raster its own firmware draws into', () => {
  const RASTERS: Readonly<Record<number, { width: number; height: number }>> = {
    // Arch 8 (Harmony 880 and 885), measured from configurations' full screen pictures like the next three.
    8: { width: 128, height: 160 },
    // Arch 10 (Harmony 890, 895 and 890 Pro), measured the same way, `SCREEN_SIZES` in `packages/codec`.
    10: { width: 128, height: 160 },
    9: { width: 96, height: 64 },
    12: { width: 176, height: 220 },
    14: { width: 128, height: 128 },
    // Arch 17 (Harmony Touch): read in its firmware, `tests/harmony_touch/test_harmony_touch_keys.py`, and the size of
    // every one of the fifty screen captures in its own user guide, which was the only source until
    // `todo-touch.md` 3.2. It is the one row of `SCREEN_SIZES` no configuration measured.
    17: { width: 240, height: 320 },
  };
  /**
   * The aperture the drawing gives, as an aspect, exact rather than bounded against the raster's.
   *
   * This test used to demand the two agree within a tenth, on the reasoning that a glass edge measured
   * off a photograph is good to a few pixels. The geometry now comes from a traced drawing and the
   * numbers disagree by more than that: the aperture is 0.865 where the raster is square. That is a
   * fact about the drawing rather than a measurement error, and the consequence belongs to whoever
   * places pixels in it, who has to fit the raster inside the aperture keeping the raster's own shape
   * rather than stretching it. So the aspect is stated and asserted, which can fail if the geometry
   * moves, where a band around the raster could only ever say "close enough".
   */
  // The Harmony 885's is the raster's own 0.8 by construction: its glass was measured off a photograph at
  // 121 by 150 pixels, 0.807, and drawn at the raster's proportion on the measured height, `h885.ts`.
  // The 880 Pro and 890 Pro take it, and the Harmony 720's is drawn the same way: its glass measures 0.855
  // across its height on its photograph, and is drawn at the raster's 0.8 on that height, `h720.ts`.
  const APERTURE: Readonly<Record<string, number>> = {
    h515: 1.513, h525: 1.513, h600: 0.865, h650: 0.865, h700: 0.865, h720: 0.8, h880: 0.8, h880pro: 0.8, h885: 0.8, h890pro: 0.8, one: 0.794, touch: 0.754,
  };
  /**
   * Where there is no bezel, the pair of shapes that has to sit symmetric about the glass, and which
   * side of it they are on. A Harmony One has its paging arrows beside the glass; a Harmony Touch has
   * its star and house above it, and their centres sit 0.04 units off the glass's centre line, two shapes
   * and a rectangle measured separately agreeing.
   */
  const FLANKING: Readonly<Record<string, { names: readonly [string, string]; side: 'beside' | 'above' }>> = {
    one: { names: ['ScreenPrev', 'ScreenNext'], side: 'beside' },
    touch: { names: ['Favorites', 'Home'], side: 'above' },
  };
  /**
   * Which drawings have a touch panel. The Harmony One, where base slot 17 is a hit map and names the
   * picture bank on every other architecture this project reads, and the Harmony Touch, whose manual
   * calls its display an LCD touch screen. Named per model, because the second is not a fact about
   * any configuration.
   */
  const TOUCH_PANELS = new Set(['one', 'touch']);
  for (const [id, model] of drawn) {
    if (model.screen === undefined) continue;
    const raster = RASTERS[model.architecture]!;
    assert.deepEqual(model.screen.pixels, raster, `${id}: the stated raster is not the architecture's`);
    const aspect = model.screen.w / model.screen.h;
    assert.ok(Math.abs(aspect - APERTURE[id]!) < 0.001,
      `${id}: the aperture is ${aspect.toFixed(3)}, not the stated ${APERTURE[id]}`);
    /**
     * And the glass agrees with something drawn independently of it, which is the structural claim: two
     * halves of one drawing that came from different measurements would show up here.
     *
     * Which something is per model, because the drawings do not all state a bezel. A Harmony 525 and a
     * Harmony 600 do, so the glass has to sit inside it. A **Harmony One does not**: its trace gives the
     * glass and nothing around it, and the thing drawn beside it instead is the pair of paging arrows.
     * Those have to fall outside the glass and be symmetric about its centre line, which is a real
     * agreement between two shapes measured separately, and it is also the line the firmware's own hit
     * map for codes 46 and 47 is symmetric about.
     */
    const bezel = model.regions.find((r) => r.id === 'screen-bezel');
    if (bezel !== undefined) {
      const b = pathBounds(bezel.path);
      assert.ok(model.screen.x >= b.minX && model.screen.x + model.screen.w <= b.maxX
        && model.screen.y >= b.minY && model.screen.y + model.screen.h <= b.maxY,
        `${id}: the glass is not inside its bezel`);
    } else {
      const pair = FLANKING[id];
      assert.ok(pair, `${id}: no bezel and no flanking pair stated either`);
      const flanking = model.keys.filter((k) => pair.names.includes(k.name));
      assert.equal(flanking.length, 2, `${id}: no bezel and nothing flanking the screen either`);
      const mid = model.screen.x + model.screen.w / 2;
      const [a, c] = flanking.map((k) => k.shape.cx).sort((p, r) => p - r) as [number, number];
      if (pair.side === 'beside') {
        assert.ok(a < model.screen.x && c > model.screen.x + model.screen.w,
          `${id}: a key that flanks the screen is on the glass`);
      } else {
        for (const key of flanking) {
          assert.ok(key.shape.cy + key.shape.h / 2 < model.screen.y, `${id}: ${key.name} is not above the glass`);
        }
      }
      assert.ok(Math.abs((a + c) / 2 - mid) < 0.25,
        `${id}: the flanking keys sit ${((a + c) / 2 - mid).toFixed(2)} off the glass centre`);
    }
    assert.equal(model.screen.touch, TOUCH_PANELS.has(id), `${id}: touch is the One's and the Touch's only`);
  }
});

test('nothing the drawing states sits outside the case', () => {
  /**
   * The check that would have caught a whole remote drawn upside down, and did not exist.
   *
   * The Harmony One's trace mirrors 57 of its elements with `scale(-1, 1) rotate(-180)`, and the
   * transform parser was dropping the rotation, so the case came out flipped top to bottom. A mirror
   * about a shape's own centre leaves its bounding box alone, so every key stayed in place and every
   * test passed; the only symptom was the power key hanging outside the outline at the top left, which
   * takes a person looking at a render to notice. This is the machine readable form of that person.
   *
   * Points **on the path** and the case's own polygon, not either shape's bounding box, because both
   * weaker versions are wrong in opposite directions. Centres pass on the flipped Harmony One, since
   * every key's centre is inside the mirrored outline. And a bounding box **corner** is not on a curved
   * shape at all: a Harmony 525's top band is a curve whose box corners sit twelve units above the case,
   * which an earlier version of this reported as three failures on a drawing that is right.
   *
   * **A depth rather than a yes or no**, because a traced band that runs flush with the case edge has
   * vertices on the outline where a crossing count is a coin toss, and because a depth is what says how
   * hard the check bites. The worst overshoot across the drawings is 0.327 units, the Harmony One's cap
   * seam, against a mirrored case at 16 to 31 on the first three. So one unit sits a factor of fifty
   * from either side, and the control below is run rather than asserted in a comment.
   *
   * **The Harmony 350 brought the mirrored figure down to 9.3**, with its own overshoot at zero: its
   * case is wide at the top, narrow at the waist and wide again lower down, so turned end over end it
   * nearly fits itself and only the Watch TV key ends up outside. The control's bar was ten times the
   * allowance, a number chosen when every case was lopsided, and it is five times now. That still puts
   * the bar 28 times the worst real overshoot, and it is one bar for every model rather than an
   * exemption for the one that missed it.
   *
   * A **moulding segment is skipped**, because its shape is a region that deliberately runs well past
   * the part it cuts: a direction pad quadrant reaches 200 units out. The moulding it is clipped to is
   * checked instead, which is the shape that actually gets drawn.
   */
  const inside = (loops: readonly (readonly [number, number])[][], px: number, py: number): boolean => {
    let hit = false;
    for (const loop of loops) {
      for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
        const [xi, yi] = loop[i]!;
        const [xj, yj] = loop[j]!;
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  };
  const away = (loops: readonly (readonly [number, number])[][], px: number, py: number): number => {
    let best = Infinity;
    for (const loop of loops) {
      for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
        const [x1, y1] = loop[j]!;
        const [x2, y2] = loop[i]!;
        const [dx, dy] = [x2 - x1, y2 - y1];
        const t = Math.max(0, Math.min(1,
          ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
      }
    }
    return best;
  };
  const ALLOWED = 1;
  /**
   * The cases that turned end over end still hold every key, so the mirrored control cannot bite on
   * them. **The Harmony Touch** is one: its case is rounded at both ends with straight sides between, and
   * mirrored it leaves nothing outside at all, 0.000 units. That also means the defect the mirror stands
   * for would be invisible on it, which is why it gets a different control rather than a lower bar. The
   * shifted control finds a shape 26.812 units out, against the drawing's own worst at 0.016, the end of
   * its base seam meeting the case edge.
   *
   * **The Harmony 885** is the other. Its case is a bone, narrow at both ends and widest level with the
   * screen and again level with the digits, and measured across at the same distance from either end the
   * two widths agree within 3.4 units on a case 283 wide, so turned over it also leaves nothing outside,
   * 0.000. Shifted, the upper trim lands 77.426 units out, against the drawing's own worst at 0.000. The
   * Harmony 880 has the 885's case, `h880.ts`, so the same holds of it, and so do the 880 Pro and the 890 Pro,
   * which take it too. **The Harmony 720** is the third shape: straight sides with a near level crown and foot,
   * so turned over it also leaves nothing outside, 0.000, and the shifted control is what bites.
   */
  const END_FOR_END = new Set(['touch', 'h720', 'h880', 'h880pro', 'h885', 'h890pro']);
  for (const [id, model] of drawn) {
    const segments = new Set((model.rockers ?? []).flatMap((r) => r.keys));
    const parts: [string, string][] = [
      ...model.keys.filter((k) => !segments.has(k.name))
        .map((k) => [k.name, k.shape.path] as [string, string]),
      ...(model.rockers ?? []).map((r) => [r.id, r.path] as [string, string]),
      ...model.regions.map((r) => [r.id, r.path] as [string, string]),
    ];
    const deepest = (shell: readonly (readonly [number, number])[][]): { d: number; what: string } => {
      let d = 0;
      let what = 'nothing outside';
      for (const [name, path] of parts) {
        for (const loop of pathPolygon(path)) {
          for (const [x, y] of loop) {
            if (inside(shell, x, y)) continue;
            const out = away(shell, x, y);
            if (out > d) { d = out; what = `${name} at ${x.toFixed(1)},${y.toFixed(1)}`; }
          }
        }
      }
      return { d, what };
    };
    const real = deepest(pathPolygon(model.case));
    assert.ok(real.d < ALLOWED, `${id}: ${real.what} is ${real.d.toFixed(3)} outside the case`);
    // The control: mirror the case top to bottom, which is exactly the defect, and the same check has
    // to fail by a wide margin. Without this the test could be passing because it cannot see anything.
    const mirrored = deepest(pathPolygon(transformPath(model.case, [1, 0, 0, -1, 0, model.height])));
    if (!END_FOR_END.has(id)) {
      assert.ok(mirrored.d > ALLOWED * 5,
        `${id}: a mirrored case is only ${mirrored.d.toFixed(3)} out, so this check proves little`);
      continue;
    }
    // A case that is the same either way up cannot be checked by turning it over, and that is asserted
    // rather than assumed: if this model's mirror starts biting, it leaves the set.
    assert.ok(mirrored.d <= ALLOWED * 5, `${id}: the mirror bites at ${mirrored.d.toFixed(3)}, so it is not end for end`);
    // So its control is the other way to put the case in the wrong place, a tenth of the height lower,
    // which is the case and the keys normalised against different origins.
    const shifted = deepest(pathPolygon(transformPath(model.case, [1, 0, 0, 1, 0, model.height / 10])));
    assert.ok(shifted.d > ALLOWED * 5,
      `${id}: a shifted case is only ${shifted.d.toFixed(3)} out, so this check proves little`);
  }
});

test('a model that has no tilted key says so by measurement', () => {
  // The Harmony 600 is rectilinear and every angle in it is zero, which is a measurement: its four
  // activity keys came out between -0.28 and -0.87 degrees by image moments, and an edge fit on one of
  // them gave -0.56 with a residual under a pixel across all 47 of its columns. So this asserts the
  // angles are within a band rather than that some key is tilted, because on this model none is.
/**
   * Which models state no angle at all, and why that is a measurement rather than a gap.
   *
   * Both of these are drawn from a traced source, so **the tilt is in the path** and `angle` has nothing
   * to add: a slanted key comes across slanted. The Harmony 600 is rectilinear anyway, measured at under
   * a degree on the keys that looked tilted in its photograph. The Harmony 720 is measured off a photograph
   * and every key on it is level, read off each key's own edges, `h720.ts`.
   */
  const LEVEL: Readonly<Record<string, boolean>> = {
    h300: true, h300eu: true, h350: true, h515: true, h525: true, h600: true, h650: true, h700: true, h720: true, one: true, touch: true,
  };
  for (const [id, model] of drawn) {
    for (const key of model.keys) {
      assert.ok(Math.abs(key.angle) <= 45, `${id}: ${key.name} is at ${key.angle} degrees`);
    }
    const tilted = model.keys.filter((k) => k.angle !== 0);
    if (LEVEL[id]) {
      assert.equal(tilted.length, 0, `${id}: measured level throughout`);
    } else {
      assert.ok(tilted.length > 0, `${id}: not measured level, so something should be tilted`);
    }
  }
});

test('every model is a Model and nothing is missing', () => {
  for (const [id, model] of drawn) {
    const m: Model = model;
    assert.equal(m.id, id);
    assert.ok(m.label.startsWith('Harmony'));
    assert.ok(m.skins.length > 0, `${id}: a drawing serves at least one skin`);
    assert.ok(m.architecture > 0);
  }
});
