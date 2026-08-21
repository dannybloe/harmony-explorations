/**
 * The shape vocabulary, as path builders.
 *
 * Everything becomes a path even where a rectangle would do, because the three models between them
 * need more than boxes and one drawing routine is better than five. What each model actually needs
 * was established by looking at the photographs rather than assumed:
 *
 * * the Harmony 600 is strictly rectilinear, every key a pill or a rounded box, measured at under a
 *   degree of tilt on the keys that looked tilted in the small image
 * * the Harmony One has genuinely slanted keys, its transport wedges sitting at an angle around the
 *   central play column
 * * the Harmony 525's volume and channel keys are **segments of a ring** around its direction pad,
 *   split into a plus half and a minus half, with the Glow key as the bottom segment of the same
 *   ring. No rotated rectangle is that shape.
 *
 * Rotation is deliberately **not** applied here. It becomes a transform on the key's own group, so
 * the lettering and the symbol turn with the key, which is what they do on the remote because they
 * are printed on it.
 */
import { pathBounds } from './path.ts';
import type { Shape } from './types.ts';

/**
 * Format a coordinate. Three decimals is past what any of these measurements justify and it keeps
 * the generated file stable: a full float would make the byte for byte test fail on a rounding
 * difference between platforms.
 */
function n(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/** A rounded rectangle whose ends are semicircles, which is most keys on all three models. */
export function pill(x: number, y: number, w: number, h: number): Shape {
  return roundRect(x, y, w, h, Math.min(w, h) / 2);
}

export function roundRect(x: number, y: number, w: number, h: number, r: number): Shape {
  const rr = Math.min(r, w / 2, h / 2);
  const path = [
    `M ${n(x + rr)} ${n(y)}`,
    `H ${n(x + w - rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + w)} ${n(y + rr)}`,
    `V ${n(y + h - rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + w - rr)} ${n(y + h)}`,
    `H ${n(x + rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x)} ${n(y + h - rr)}`,
    `V ${n(y + rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + rr)} ${n(y)}`,
    'Z',
  ].join(' ');
  return { form: rr === Math.min(w, h) / 2 ? 'pill' : 'roundRect', path, cx: x + w / 2, cy: y + h / 2, w, h };
}

/** A circle, as a path, because everything downstream expects one shape kind. */
export function circle(cx: number, cy: number, r: number): Shape {
  const path = `M ${n(cx - r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)} `
    + `A ${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)} Z`;
  return { form: 'circle', path, cx, cy, w: 2 * r, h: 2 * r };
}

/** A closed polygon, for the arrow keys and the wedges. */
export function poly(points: readonly [number, number][]): Shape {
  if (points.length < 3) throw new Error('a polygon needs three points');
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${n(p[0])} ${n(p[1])}`).join(' ') + ' Z';
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0;
  const h = Math.max(...ys) - y0;
  return { form: 'poly', path, cx: x0 + w / 2, cy: y0 + h / 2, w, h };
}

/**
 * A segment of a ring: the Harmony 525's volume, channel and Glow keys.
 *
 * Angles are degrees clockwise from twelve o'clock, which is how the keys read off the photograph
 * ("the volume blade runs from about ten o'clock round to seven"). The centre reported is the middle
 * of the segment's own arc, so a label placed on it lands in the middle of the blade rather than at
 * the centre of the ring.
 */
export function arcRing(
  cx: number, cy: number, rInner: number, rOuter: number, from: number, to: number,
): Shape {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const at = (r: number, deg: number): [number, number] => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  const [ox0, oy0] = at(rOuter, from);
  const [ox1, oy1] = at(rOuter, to);
  const [ix1, iy1] = at(rInner, to);
  const [ix0, iy0] = at(rInner, from);
  const path = [
    `M ${n(ox0)} ${n(oy0)}`,
    `A ${n(rOuter)} ${n(rOuter)} 0 ${large} ${sweep} ${n(ox1)} ${n(oy1)}`,
    `L ${n(ix1)} ${n(iy1)}`,
    `A ${n(rInner)} ${n(rInner)} 0 ${large} ${sweep ? 0 : 1} ${n(ix0)} ${n(iy0)}`,
    'Z',
  ].join(' ');
  const mid = (from + to) / 2;
  const [mcx, mcy] = at((rInner + rOuter) / 2, mid);
  return { form: 'arc', path, cx: mcx, cy: mcy, w: rOuter - rInner, h: rOuter - rInner };
}

/**
 * A rounded cross, which is the shape a direction pad's moulding actually is.
 *
 * A circle was the first attempt and it is not what the photographs show: the pad is a clover with
 * four arms, and drawing a circle round four rectangles reads as a bezel rather than as the key it
 * is. `arm` is the distance from the centre to the end of an arm and `thick` is half the arm's width.
 */
export function cross(cx: number, cy: number, arm: number, thick: number, r: number): Shape {
  const a = arm;
  const t = thick;
  const k = Math.min(r, t / 2);
  // Walked clockwise from the top left of the upper arm. Each outer corner is rounded by `k` and each
  // inner corner, where two arms meet, is rounded the other way by the same amount.
  const p = [
    `M ${n(cx - t)} ${n(cy - a + k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx - t + k)} ${n(cy - a)}`,
    `H ${n(cx + t - k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx + t)} ${n(cy - a + k)}`,
    `V ${n(cy - t - k)}`,
    `A ${n(k)} ${n(k)} 0 0 0 ${n(cx + t + k)} ${n(cy - t)}`,
    `H ${n(cx + a - k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx + a)} ${n(cy - t + k)}`,
    `V ${n(cy + t - k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx + a - k)} ${n(cy + t)}`,
    `H ${n(cx + t + k)}`,
    `A ${n(k)} ${n(k)} 0 0 0 ${n(cx + t)} ${n(cy + t + k)}`,
    `V ${n(cy + a - k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx + t - k)} ${n(cy + a)}`,
    `H ${n(cx - t + k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx - t)} ${n(cy + a - k)}`,
    `V ${n(cy + t + k)}`,
    `A ${n(k)} ${n(k)} 0 0 0 ${n(cx - t - k)} ${n(cy + t)}`,
    `H ${n(cx - a + k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx - a)} ${n(cy + t - k)}`,
    `V ${n(cy - t + k)}`,
    `A ${n(k)} ${n(k)} 0 0 1 ${n(cx - a + k)} ${n(cy - t)}`,
    `H ${n(cx - t - k)}`,
    `A ${n(k)} ${n(k)} 0 0 0 ${n(cx - t)} ${n(cy - t - k)}`,
    'Z',
  ].join(' ');
  return { form: 'poly', path: p, cx, cy, w: 2 * a, h: 2 * a };
}

/**
 * A closed contour through sampled half widths, mirrored about the centre line.
 *
 * This is what a case outline is: `CLAUDE.md` records that all three existing drawings began as a
 * rounded rectangle and all three had to be replaced, because a rounded rectangle is not
 * recognisable as any particular remote. The samples are read off the photograph, left edge against
 * row, and each one is written down beside the call.
 *
 * Smooth cubic segments through the samples rather than straight lines, so the result is a contour
 * and not a polygon. There is a test that refuses a body path with no curve command in it.
 */
export function contour(
  centre: number, samples: readonly [number, number][], height: number,
): string {
  if (samples.length < 3) throw new Error('a contour needs at least three samples');

  /**
   * A reading off a photograph is good to about a pixel, and a case is smooth, so the difference
   * between neighbouring samples is partly noise. Left raw it showed: the sides came out visibly wobbly
   * where three samples differed by one unit each. An average with the neighbours removes a jitter the
   * product does not have while leaving the shape, which is carried by the samples' overall run.
   *
   * **Weighted by how far each neighbour is**, which is the correction that mattered. The first version
   * weighted them equally, and at the row where a dense reading of the foot meets a coarse reading of
   * the middle that mixes a sample four rows away with one twenty one rows away: the far one dragged
   * the value a whole unit outwards and the drawing carried a visible kink on each side of the foot at
   * exactly that sample. It looked like a spline artefact and it was in the data. Where the samples are
   * evenly spaced this is the plain three point average it replaces, so nothing about the smooth parts
   * moved.
   *
   * The noise this is for is a property of a one row reading, which is another way of saying a distant
   * neighbour should barely count: at twenty five rows the difference between two samples is shape.
   */
  const half = samples.map(([, h]) => h);
  const smooth = half.map((h, i) => {
    if (i === 0 || i === half.length - 1) return h;
    const back = Math.max(samples[i]![0] - samples[i - 1]![0], 1e-6);
    const fwd = Math.max(samples[i + 1]![0] - samples[i]![0], 1e-6);
    const near = (half[i - 1]! / back + half[i + 1]! / fwd) / (1 / back + 1 / fwd);
    return (h + near) / 2;
  });

  /**
   * The outline is **one closed curve**, and the ends are points on it rather than a construction.
   *
   * Three attempts argue for this. A semicircular cap of the tip's own half width put the dome 14
   * units above the topmost sample, 13 of them outside the viewBox, so the drawn top of a Harmony 600
   * was cut off flat. A shallower arc fitted inside the box and met the sides at a visible crease,
   * because the sides arrive at the tip climbing steeply and an arc leaves it running level: two
   * curves that touch are not two curves that join. And a single apex point above the first sample
   * drew a nose the product does not have.
   *
   * There is no cap at all now. The topmost sample is a row, not a point: the photograph's first
   * honest reading of a Harmony 600 is 40 pixels of case, so the crown is the **segment between that
   * row's two edges**, and a closed spline draws it as the almost flat curve the photograph shows,
   * bulging a fraction of a unit above the row it joins. The foot is the same at the other end.
   *
   * What this needs from the caller is a dense reading at the ends, and going without one is what made
   * the last two attempts look wrong: at three rows a sample the shoulders came out as straight lines
   * meeting in a spike, and no interpolation can invent a curve nobody measured.
   */
  const y0 = samples[0]![0];
  const y1 = samples[samples.length - 1]![0];

  // Map the loop onto exactly [0, height]. That is what "normalised" has to mean if two models are to
  // be shown at the same size: the shape fills its box.
  const k = height / (y1 - y0);
  const ty = (y: number): number => (y - y0) * k;

  /**
   * The loop: down the right side and back up the left, closing across the crown and the foot.
   *
   * Left and right are the same measurements mirrored, which is a decision and not a shortcut. The
   * photograph's two edges differ by a pixel or two from the lens and from the light, and a remote is
   * symmetric, so measuring both would draw the camera rather than the product.
   */
  const loop: [number, number][] = [];
  for (const [i, [y]] of samples.entries()) loop.push([centre + smooth[i]! * k, ty(y)]);
  for (const [i, [y]] of [...samples.entries()].reverse()) loop.push([centre - smooth[i]! * k, ty(y)]);

  /**
   * Catmull-Rom through every point, converted to cubic Beziers, wrapping at the ends.
   *
   * Two versions before this one. Holding each control point at its own end's x is smooth only when
   * the samples are evenly spaced and gives a staircase when they are not. Uniform Catmull-Rom passes
   * through every sample and takes its tangent from the neighbours, which is what a measured outline
   * wants, but it assumes the samples are a constant distance apart, and here they are deliberately
   * not: the ends are read row by row and the middle every twenty five rows. At the row where the step
   * changes the assumed tangent is wrong by the ratio of the two spacings, and the drawing showed it
   * as a **visible kink on each side of the foot**, at exactly the sample where the dense reading
   * begins.
   *
   * So the parameterisation is the chord length, at the square root that is the usual centripetal
   * choice: a tangent is scaled by how far its neighbours actually are, and a change of sampling
   * density stops being a feature of the shape. With evenly spaced samples this is the uniform form,
   * so nothing about the smooth parts changes.
   */
  const at = (i: number): [number, number] => loop[((i % loop.length) + loop.length) % loop.length]!;
  const gap = (i: number): number => {
    const [a, b] = [at(i), at(i + 1)];
    return Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5, 1e-6);
  };
  const out: string[] = [`M ${n(at(0)[0])} ${n(at(0)[1])}`];
  for (let i = 0; i < loop.length; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const [d0, d1, d2] = [gap(i - 1), gap(i), gap(i + 1)];
    // The tangent at each end of this segment, per the centripetal form, times a third of the
    // segment's own parameter length, which is what a cubic Bezier's control point offset is.
    const c1 = [0, 1].map((a) => p1[a]! + ((p2[a]! - p0[a]!) / (d0 + d1)) * (d1 / 3));
    const c2 = [0, 1].map((a) => p2[a]! - ((p3[a]! - p1[a]!) / (d1 + d2)) * (d1 / 3));
    out.push(`C ${n(c1[0]!)} ${n(c1[1]!)} ${n(c2[0]!)} ${n(c2[1]!)} ${n(p2[0])} ${n(p2[1])}`);
  }
  out.push('Z');
  return out.join(' ');
}

/**
 * A shape taken straight out of a traced drawing.
 *
 * There is no fitting and there must not be: a key on any of these three remotes is four cubic segments
 * with no straight side, and the best rounded rectangle through one sits about a unit out on a key nine
 * units tall. So the path is the evidence, and the box is derived from it rather than stated beside it,
 * which is the same rule that removed the hand written `aspect` numbers from the symbol set.
 */
export function traced(path: string): Shape {
  const b = pathBounds(path);
  return {
    form: 'traced',
    path,
    cx: (b.minX + b.maxX) / 2,
    cy: (b.minY + b.maxY) / 2,
    w: b.maxX - b.minX,
    h: b.maxY - b.minY,
  };
}

/**
 * The region one segment of a moulding covers, as a polygon.
 *
 * A rocker's half is not a shape of its own on any of these remotes: the drawing states one outline per
 * moulding and the halves are implied by where the pivot is. So a segment carries the region it covers,
 * the drawing clips the moulding's own outline to it, and the two halves together tile the moulding
 * exactly. That is also the region the interface hit tests and colours, which is what it should be.
 */
export function segment(path: string): Shape {
  const b = pathBounds(path);
  return {
    form: 'poly',
    path,
    cx: (b.minX + b.maxX) / 2,
    cy: (b.minY + b.maxY) / 2,
    w: b.maxX - b.minX,
    h: b.maxY - b.minY,
  };
}
