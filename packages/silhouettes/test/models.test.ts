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
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { MODELS, keyOf, keyOfScan, pathBounds, pathPolygon, transformPath } from '../src/index.ts';
import type { Model } from '../src/types.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * What each model's button count is, and where the number comes from.
 *
 * An exact count, never a floor. `CLAUDE.md` records a sweep that found ninety three lower bounds
 * standing in for figures, whose median sat forty per cent under the value they guarded, and the two
 * things a floor cannot do at all are notice a total moving up and say how strong a control is.
 */
const EXPECTED: Readonly<Record<string, { buttons: number; scans: number;
  fromTheHitMap?: Readonly<Record<number, string>>; why: string }>> = {
  h525: {
    buttons: 50,
    scans: 0,
    why: "the 8 by 8 matrix in the firmware, both of its configs binding the same 50 codes, a bench "
      + 'census on the remote, and a count off a product photograph, which is four routes agreeing',
  },
  h600: {
    buttons: 54,
    scans: 36,
    why: 'six bits of a key event byte, a bench census of 14 14 13 13 per column, counting the '
      + "photograph, and Logitech's own manual listing 54 buttons in its own table",
  },
  one: {
    buttons: 44,
    scans: 32,
    /**
     * Two codes come from somewhere else, and naming them here is what stops the exception being an
     * exemption.
     *
     * `reference/button-maps.md` reaches 32 of the 44, and it has nothing for the touch panel because
     * a touch region is not a keypad scan. Base slot 17's hit map does: codes 46 and 47 hold the same
     * rectangle in all 74 hit pages of the two Harmony One configs, `docs/findings.md` section 125. So
     * the drawing may carry those two and nothing else, and the check below also demands they are
     * **absent** from the reference table, so this cannot quietly cover a code the table does name.
     */
    fromTheHitMap: { 46: 'ScreenPrev', 47: 'ScreenNext' },
    why: 'ten keys on the keypad plus the twelve the tables do not reach, counted off the '
      + 'photograph, with the four touch regions the hit map states',
  },
};

/** The scan to button tables, read out of the reference document rather than copied here. */
function referenceTables(): Record<string, Map<number, string>> {
  const text = readFileSync(join(REPO, 'reference', 'button-maps.md'), 'utf8');
  const out: Record<string, Map<number, string>> = {};
  for (const section of text.split(/^## /m).slice(1)) {
    const heading = section.split('\n')[0]!.trim();
    const rows = new Map<number, string>();
    for (const m of section.matchAll(/^\| (\d+) \| `(\w+)` \| `([^`]*)` \|$/gm)) {
      rows.set(Number(m[1]), m[2]!);
    }
    if (rows.size) out[heading] = rows;
  }
  return out;
}

/** Which reference heading belongs to which drawing. */
/**
 * Which reference heading belongs to which drawing.
 *
 * A model with no entry has **no measured codes at all**, which is the Harmony 525's case: the two
 * calibration configs were compiled for the bench remotes, so `reference/button-maps.md` has no arch 9
 * table. That is asserted rather than skipped, below.
 */
const HEADING: Readonly<Record<string, string>> = {
  h600: 'Harmony 600, skin 71, architecture 14',
  one: 'Harmony One, skin 54, architecture 12',
};

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

test('a scan code is present exactly where the reference tables name it', () => {
  const tables = referenceTables();
  for (const [id, model] of drawn) {
    const heading = HEADING[id];
    if (heading === undefined) {
      // No table means no code may appear, which is a claim and not an exemption.
      assert.equal(EXPECTED[id]!.scans, 0, `${id}: no reference table, so it can have no scans`);
      assert.deepEqual(model.keys.filter((k) => k.scan !== undefined).map((k) => k.name), [],
        `${id}: a scan code with nothing behind it`);
      // Candidates may still be present, because they can come from somewhere else: the Harmony 525's
      // four soft keys are narrowed to a block of four by the firmware's own matrix arithmetic,
      // `docs/findings.md` section 89, with no measured code anywhere on the model. The first version
      // of this test forbade that, which would have made the honest answer untellable.
      continue;
    }
    const table = tables[heading]!;
    assert.ok(table, `${id}: no table under ${heading}`);
    const elsewhere = EXPECTED[id]!.fromTheHitMap ?? {};
    const fromElsewhere = model.keys.filter((k) => k.scan !== undefined && k.scan in elsewhere);
    for (const key of fromElsewhere) {
      assert.equal(elsewhere[key.scan!], key.name,
        `${id}: scan ${key.scan} is declared as ${elsewhere[key.scan!]}, not ${key.name}`);
      // A second source may only cover what the first does not reach.
      assert.equal(table.get(key.scan!), undefined,
        `${id}: scan ${key.scan} is in the reference table, so it is not the hit map's to claim`);
    }
    assert.equal(fromElsewhere.length, Object.keys(elsewhere).length,
      `${id}: a declared hit map code has no key`);
    const withScan = model.keys.filter((k) => k.scan !== undefined && !(k.scan in elsewhere));
    assert.equal(withScan.length, EXPECTED[id]!.scans);
    for (const key of withScan) {
      // The drawing may not invent one. A wrong scan code is invisible: the interface would show the
      // wrong assignment beside a key with complete confidence.
      assert.equal(table.get(key.scan!), key.name,
        `${id}: scan ${key.scan} is ${table.get(key.scan!)} in the reference, not ${key.name}`);
      assert.equal(keyOfScan(model, key.scan!)?.name, key.name);
    }
    // And every scan the reference names has a key here, so the drawing cannot silently lose one.
    for (const [scan, name] of table) {
      assert.equal(keyOfScan(model, scan)?.name, name, `${id}: scan ${scan} (${name}) has no key`);
    }
  }
});

test('a catalogue name is in the reference tables and a printed one is not', () => {
  const tables = referenceTables();
  for (const [id, model] of drawn) {
    const heading = HEADING[id];
    if (heading === undefined) {
      // No table, so no name can be sourced from one. That is the claim, and it can fail.
      assert.deepEqual(model.keys.filter((k) => k.src === 'catalogue').map((k) => k.name), [],
        `${id}: a catalogue name with no table behind it`);
      continue;
    }
    const named = new Set(tables[heading]!.values());
    // The two undecided pairs are catalogue names with no scan of their own, so they are expected in
    // neither direction and are checked by the test below instead.
    const undecided = new Set(model.keys.filter((k) => k.scanCandidates !== undefined).map((k) => k.name));
    for (const key of model.keys) {
      if (undecided.has(key.name)) continue;
      if (key.src === 'catalogue') {
        assert.ok(named.has(key.name), `${id}: ${key.name} claims to be measured and is not listed`);
      } else {
        assert.ok(!named.has(key.name), `${id}: ${key.name} is listed, so it is not ours to name`);
      }
    }
  }
});

test('a key whose code is undecided carries candidates and no scan', () => {
  for (const [id, model] of drawn) {
    const undecided = model.keys.filter((k) => k.scanCandidates !== undefined);
    /**
     * Four keys per model, and the **shape of the ambiguity differs**, which is the thing to keep.
     *
     * On a Harmony 600 it is two symmetric pairs: the two up keys send one command and so do the two
     * down keys, so elimination cannot split them and no amount of decoding will. On a Harmony 525 it is
     * one block of four, from the firmware's own matrix rather than from any measured code, because
     * nothing says which of two columns is the left one. So the count is the same and the grouping is
     * not, and a test that asserted pairs everywhere would have forced a wrong answer on the 525.
     */
    const SETS: Readonly<Record<string, { sets: number; each: number }>> =
      { h525: { sets: 1, each: 4 }, h600: { sets: 2, each: 2 }, one: { sets: 2, each: 2 } };
    const want = SETS[id]!;
    assert.equal(undecided.length, 4, `${id}: four keys either way`);
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
    for (const [, names] of sets) assert.equal(names.length, 4 / want.sets);
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
  const APERTURE: Readonly<Record<string, number>> = { h525: 1.513, h600: 0.865, one: 0.794 };
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
      const flanking = model.keys.filter((k) => k.name === 'ScreenPrev' || k.name === 'ScreenNext');
      assert.equal(flanking.length, 2, `${id}: no bezel and nothing beside the screen either`);
      const mid = model.screen.x + model.screen.w / 2;
      const [a, c] = flanking.map((k) => k.shape.cx).sort((p, r) => p - r) as [number, number];
      assert.ok(a < model.screen.x && c > model.screen.x + model.screen.w,
        `${id}: a key that flanks the screen is on the glass`);
      assert.ok(Math.abs((a + c) / 2 - mid) < 0.25,
        `${id}: the flanking keys sit ${((a + c) / 2 - mid).toFixed(2)} off the glass centre`);
    }
    // Only arch 12 (Harmony One) has a touch panel: base slot 17 is a hit map there and names the
    // picture bank everywhere else.
    assert.equal(model.screen.touch, model.architecture === 12, `${id}: touch is arch 12 only`);
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
   * hard the check bites. The worst overshoot across the three drawings is 0.327 units, the Harmony
   * One's cap seam, against a mirrored case at 16 to 31. So one unit sits a factor of fifty from either
   * side, and the control below is run rather than asserted in a comment.
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
    assert.ok(mirrored.d > ALLOWED * 10,
      `${id}: a mirrored case is only ${mirrored.d.toFixed(3)} out, so this check proves little`);
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
  const LEVEL: Readonly<Record<string, boolean>> = { h525: true, h600: true, one: true };
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
