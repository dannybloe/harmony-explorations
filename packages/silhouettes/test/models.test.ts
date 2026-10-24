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

import { MODELS, SCAN_SOURCES, keyOf, keyOfScan, pathBounds, pathPolygon, transformPath } from '../src/index.ts';
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
 * configurations, `packages/codec/test/irframe.test.ts`, which needs the lab.
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
   * The Harmony 350's moulding with the 300's printing, so its count is the 350's drawing's, which a
   * statement made holding both remotes confirms; `h300.ts` takes every shape from `H350`.
   */
  h300: {
    buttons: 55,
    scans: {},
    why: "the Harmony 350's drawing, the same moulding per a statement made holding both, and the 300 "
      + "setup guide's cover photograph shows the same 55 keys",
  },
  /**
   * The weakest count here and stated as such: there is no firmware derived figure for this
   * architecture's keypad and no bench census, so the number is the drawing's. Two of Logitech's own
   * drawings in the setup guide agree on it, the button page and the box contents page, and the cover
   * photograph agrees for the 35 keys above the transport block that it shows.
   */
  h350: {
    buttons: 55,
    scans: {},
    why: "Logitech's own button drawing in the Harmony 350 setup guide, counted shape by shape, "
      + 'which its box contents drawing and the cover photograph agree with where they reach',
  },
  // No code at all: section 133's calibration configurations were compiled for a Harmony One and a
  // Harmony 600, so nothing names a key of this architecture against its code. Its four soft keys carry
  // candidates from the firmware's matrix instead, the test further down.
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
     * Only the Harmony 525 has any now, one block of four from the firmware's own matrix rather than
     * from any measured code, because nothing says which of two columns is the left one.
     *
     * The Harmony One and the Harmony 600 had two symmetric pairs each until plan 009's step 3.3: the two
     * up keys send one command and so do the two down keys, so neither elimination nor decoding could
     * split them, and the devices' own maps did, sections 398 and 323. The count stays stated per model,
     * since the shape of an ambiguity differs between models and a test asserting pairs everywhere would
     * have forced a wrong answer on the 525.
     */
    /**
     * The Harmony 350 has **none**, and that is the claim rather than a gap in the table: nothing
     * narrows any of its codes to a set, because nobody has read its keypad scanner, so a candidate
     * list there could only be a guess.
     */
    const SETS: Readonly<Record<string, { sets: number; each: number }>> = {
      h300: { sets: 0, each: 0 }, h350: { sets: 0, each: 0 },
      h525: { sets: 1, each: 4 }, h600: { sets: 0, each: 0 }, h650: { sets: 0, each: 0 }, h700: { sets: 0, each: 0 },
      one: { sets: 0, each: 0 }, touch: { sets: 0, each: 0 },
    };
    const want = SETS[id]!;
    assert.equal(undecided.length, want.sets * want.each,
      `${id}: ${undecided.length} undecided keys, not ${want.sets * want.each}`);
    for (const key of undecided) {
      assert.equal(key.scan, undefined, `${id}: ${key.name} claims a code and candidates`);
      assert.equal(key.scanCandidates!.length, want.each,
        `${id}: ${key.name} has ${key.scanCandidates!.length} candidates, not ${want.each}`);
    }
    const sets = new Map<string, string[]>();
    for (const key of undecided) {
      const k = [...key.scanCandidates!].sort((a, b) => a - b).join(',');
      sets.set(k, [...(sets.get(k) ?? []), key.name]);
    }
    assert.equal(sets.size, want.sets, `${id}: ${sets.size} candidate sets, not ${want.sets}`);
    for (const [, names] of sets) assert.equal(names.length, want.each);
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
    9: { width: 96, height: 64 },
    12: { width: 176, height: 220 },
    14: { width: 128, height: 128 },
    // Arch 17 (Harmony Touch) is not in `SCREEN_SIZES`, since nothing here reads its configuration. The
    // figure is the size of every one of the fifty screen captures in its own user guide.
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
  const APERTURE: Readonly<Record<string, number>> = { h525: 1.513, h600: 0.865, h650: 0.865, h700: 0.865, one: 0.794, touch: 0.754 };
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
   */
  const END_FOR_END = new Set(['touch']);
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
   * a degree on the keys that looked tilted in its photograph.
   */
  const LEVEL: Readonly<Record<string, boolean>> = {
    h300: true, h350: true, h525: true, h600: true, h650: true, h700: true, one: true, touch: true,
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
