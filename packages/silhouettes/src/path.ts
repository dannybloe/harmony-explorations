/**
 * Paths: reading one, measuring it, and moving it.
 *
 * One module because one parser. Three things need it and a second copy of a derivation is this
 * repository's oldest rule: the symbol set scales each mark to its own extent, the case outline is
 * checked against the height it is supposed to fill, and a shape taken from a traced drawing has to be
 * moved out of that drawing's coordinates into ours.
 *
 * The command set is deliberately the one that turns up: `M`, `L`, `H`, `V`, `C`, `A` and `Z`, in
 * absolute form. The relative spellings and `Q`, `S`, `T` are refused rather than half handled, because
 * a transformer that passes a command through untouched moves the rest of the path and leaves that one
 * where it was, which is a drawing that looks nearly right.
 */

function arcExtremes(
  x0: number, y0: number, rx: number, ry: number, large: number, sweep: number, x1: number, y1: number,
): [number, number][] {
  if (Math.abs(rx - ry) > 1e-9) throw new Error('an elliptical arc: this measurement assumes circular');
  const r = rx;
  // SVG's own endpoint to centre conversion, and the halved difference runs **start minus end**. The
  // first version had it the other way round, which put the centre on the wrong side of the chord and
  // reported the power ring as 0.8 tall when it is 1.6.
  const hx = (x0 - x1) / 2;
  const hy = (y0 - y1) / 2;
  const q = hx * hx + hy * hy;
  if (q === 0) return [];
  // Clamped, since a radius a hair short of half the chord is a rounding artefact and not an
  // impossible arc.
  const f = Math.sqrt(Math.max((r * r - q) / q, 0)) * (large === sweep ? -1 : 1);
  const cx = f * hy + (x0 + x1) / 2;
  const cy = -f * hx + (y0 + y1) / 2;
  const a0 = Math.atan2(y0 - cy, x0 - cx);
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  const norm = (v: number): number => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Sweep 1 runs in the direction of increasing angle, y growing downward.
  const span = sweep === 1 ? norm(a1 - a0) : norm(a0 - a1);
  const out: [number, number][] = [];
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const t = sweep === 1 ? norm(a - a0) : norm(a0 - a);
    if (t <= span) out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}


export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/**
 * The bounds of a path made of `M`, `L`, `H`, `V`, `C`, `A` and `Z`, with absolute coordinates.
 *
 * **An arc's bulge counts and a cubic's does not**, and the difference is deliberate. An arc here is
 * always an end cap or a corner whose curve reaches well past its own endpoints: the power ring is one
 * arc whose endpoints span 0.8 vertically where the ring is 1.66, and measuring it by endpoints scaled
 * the mark up until it overflowed its key. A cubic here is always a segment of a case side fitted
 * through measured samples, where the curve stays within a fraction of a unit of the samples it passes
 * through, and including its control points would report a shape wider than the one drawn.
 */
export function pathBounds(d: string): Bounds {
  let x = 0;
  let y = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const see = (px: number, py: number) => {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  };
  for (const token of d.match(/[MmLlHhVvCcAaZz][^MmLlHhVvCcAaZz]*/g) ?? []) {
    const op = token[0]!.toUpperCase();
    const n = (token.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (op === 'H') {
      for (const v of n) { x = v; see(x, y); }
    } else if (op === 'V') {
      for (const v of n) { y = v; see(x, y); }
    } else if (op === 'A') {
      for (let i = 0; i + 6 < n.length; i += 7) {
        const [rx, ry, , large, sweep, ex, ey] = n.slice(i, i + 7) as [
          number, number, number, number, number, number, number];
        for (const [px, py] of arcExtremes(x, y, rx, ry, large, sweep, ex, ey)) see(px, py);
        x = ex; y = ey; see(x, y);
      }
    } else if (op === 'C') {
      // Endpoint only, per the note above.
      for (let i = 0; i + 5 < n.length; i += 6) { x = n[i + 4]!; y = n[i + 5]!; see(x, y); }
    } else if (op === 'M' || op === 'L') {
      for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]!; y = n[i + 1]!; see(x, y); }
    }
  }
  return { minX, maxX, minY, maxY };
}

/**
 * A 2x3 affine transform, in the order SVG writes it: `[a, b, c, d, e, f]`.
 */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Apply `m` then `n`, which is what nesting one transform inside another means. */
export function compose(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/**
 * Read the transform an extracted drawing carries: `matrix`, `translate`, `scale`, `rotate`.
 *
 * **An unknown function is an error, not a component to skip**, and that rule is the whole point of this
 * function's second version. `rotate` was missing and the omission was silent, so
 * `translate(...) scale(-1, 1) rotate(-180) translate(...)`, which is a mirror top to bottom, came
 * through as `scale(-1, 1)`, a mirror left to right. That is the Harmony One's case outline, and it drew
 * a whole remote upside down with nothing reporting anything: the only visible symptom was its power key
 * sitting outside the outline, which reads like a badly traced corner rather than a dropped rotation.
 *
 * Skewing is refused rather than approximated, for the same reason the transformer refuses an arc under
 * an uneven scale: a drawing that is nearly right is worse than one that stops.
 */
export function parseTransform(text: string): Matrix {
  let m = IDENTITY;
  for (const part of text.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    const n = (part[2]!.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (part[1] === 'matrix' && n.length === 6) {
      m = compose(m, n as unknown as Matrix);
    } else if (part[1] === 'translate') {
      m = compose(m, [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0]);
    } else if (part[1] === 'scale') {
      m = compose(m, [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0]);
    } else if (part[1] === 'rotate') {
      const a = ((n[0] ?? 0) * Math.PI) / 180;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const r: Matrix = [c, s, -s, c, 0, 0];
      // The three argument form rotates about a point, which is a translate either side of it.
      if (n.length >= 3) {
        m = compose(compose(compose(m, [1, 0, 0, 1, n[1]!, n[2]!]), r), [1, 0, 0, 1, -n[1]!, -n[2]!]);
      } else {
        m = compose(m, r);
      }
    } else {
      throw new Error(`transform ${part[1]} is not supported`);
    }
  }
  return m;
}

/**
 * Move a path through a matrix, command by command.
 *
 * `H` and `V` become `L` and an `A`'s radii are scaled, which is only right for a transform that scales
 * both axes alike; a matrix that does not is refused, because an ellipse under an uneven scale needs a
 * rotation this does not compute and silently drawing the wrong arc is worse than stopping.
 */
export function transformPath(d: string, m: Matrix): string {
  const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const skewed = Math.abs(Math.hypot(m[0], m[1]) - Math.hypot(m[2], m[3])) > 1e-6;
  const at = (x: number, y: number): [number, number] =>
    [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const f = (v: number): string => {
    const r = Math.round(v * 1000) / 1000;
    return Object.is(r, -0) ? '0' : String(r);
  };
  let x = 0;
  let y = 0;
  const out: string[] = [];
  /**
   * Split on command letters only, not on any letter.
   *
   * `[A-Za-z]` was the first version and it breaks on scientific notation: a coordinate written
   * `1.5e-05`, which an SVG exporter is entitled to emit, has its `e` read as a command and the path is
   * refused. That is how it was found, on the second traced drawing to arrive.
   */
  for (const token of d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? []) {
    const op = token[0]!;
    if (op !== op.toUpperCase()) throw new Error(`relative command ${op} is not supported`);
    if (!'MLHVCAZ'.includes(op)) throw new Error(`command ${op} is not supported`);
    const n = (token.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (op === 'Z') { out.push('Z'); continue; }
    if (op === 'H') {
      for (const v of n) { x = v; out.push(`L ${at(x, y).map(f).join(' ')}`); }
    } else if (op === 'V') {
      for (const v of n) { y = v; out.push(`L ${at(x, y).map(f).join(' ')}`); }
    } else if (op === 'A') {
      if (skewed) throw new Error('an arc cannot be moved through an uneven scale');
      for (let i = 0; i + 6 < n.length; i += 7) {
        const [rx, ry, rot, large, sweep, ex, ey] = n.slice(i, i + 7) as
          [number, number, number, number, number, number, number];
        x = ex; y = ey;
        out.push(`A ${f(rx * scale)} ${f(ry * scale)} ${rot} ${large} ${sweep} ${at(x, y).map(f).join(' ')}`);
      }
    } else if (op === 'C') {
      for (let i = 0; i + 5 < n.length; i += 6) {
        const p = n.slice(i, i + 6) as [number, number, number, number, number, number];
        x = p[4]; y = p[5];
        out.push(`C ${at(p[0], p[1]).map(f).join(' ')} ${at(p[2], p[3]).map(f).join(' ')} `
          + `${at(x, y).map(f).join(' ')}`);
      }
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) {
        x = n[i]!; y = n[i + 1]!;
        out.push(`${op === 'M' ? 'M' : 'L'} ${at(x, y).map(f).join(' ')}`);
      }
    }
  }
  return out.join(' ');
}

/**
 * Flatten a path into one polygon per subpath, so a point can be tested against it.
 *
 * Written because a bounding box cannot tell two shapes apart that share one: the Harmony One's traced
 * drawing carries its case outline **twice**, the second copy mirrored top to bottom, and both have the
 * same box and the same area. The extractor picked the mirrored one and the whole body came out upside
 * down, which showed up as the power key sitting outside the outline. Containment is what separates
 * them, and it needs the real edge rather than the box.
 *
 * `steps` is per curve. Sixteen is far finer than anything here needs: the question is always whether a
 * point is well inside or well outside, never whether it is within a tenth of a unit of an edge.
 */
export function pathPolygon(d: string, steps = 16): [number, number][][] {
  const out: [number, number][][] = [];
  let loop: [number, number][] = [];
  let x = 0;
  let y = 0;
  const push = (px: number, py: number) => { loop.push([px, py]); x = px; y = py; };
  for (const token of d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? []) {
    const op = token[0]!;
    if (op !== op.toUpperCase() && op !== 'z') throw new Error(`relative command ${op} is not supported`);
    const n = (token.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (op.toUpperCase() === 'Z') {
      if (loop.length > 2) out.push(loop);
      loop = loop.length > 0 ? [loop[0]!] : [];
      if (loop.length > 0) { x = loop[0]![0]; y = loop[0]![1]; }
      continue;
    }
    if (op === 'M') {
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (i === 0) { if (loop.length > 2) out.push(loop); loop = []; }
        push(n[i]!, n[i + 1]!);
      }
    } else if (op === 'L') {
      for (let i = 0; i + 1 < n.length; i += 2) push(n[i]!, n[i + 1]!);
    } else if (op === 'H') {
      for (const v of n) push(v, y);
    } else if (op === 'V') {
      for (const v of n) push(x, v);
    } else if (op === 'C') {
      for (let i = 0; i + 5 < n.length; i += 6) {
        const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6) as
          [number, number, number, number, number, number];
        const [x0, y0] = [x, y];
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          push(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
        }
      }
    } else if (op === 'A') {
      // Sampled off the same centre `arcExtremes` derives, so the two readings of an arc cannot drift.
      for (let i = 0; i + 6 < n.length; i += 7) {
        const [rx, ry, , large, sweep, ex, ey] = n.slice(i, i + 7) as
          [number, number, number, number, number, number, number];
        if (Math.abs(rx - ry) > 1e-9) throw new Error('an elliptical arc: this flattening assumes circular');
        const hx = (x - ex) / 2;
        const hy = (y - ey) / 2;
        const q = hx * hx + hy * hy;
        if (q === 0) { push(ex, ey); continue; }
        const f = Math.sqrt(Math.max((rx * rx - q) / q, 0)) * (large === sweep ? -1 : 1);
        const cx = f * hy + (x + ex) / 2;
        const cy = -f * hx + (y + ey) / 2;
        const a0 = Math.atan2(y - cy, x - cx);
        const a1 = Math.atan2(ey - cy, ex - cx);
        const norm = (v: number): number => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const span = sweep === 1 ? norm(a1 - a0) : -norm(a0 - a1);
        for (let s = 1; s <= steps; s++) {
          const a = a0 + (span * s) / steps;
          push(cx + rx * Math.cos(a), cy + rx * Math.sin(a));
        }
      }
    }
  }
  if (loop.length > 2) out.push(loop);
  return out;
}

/**
 * Is the point inside the path, by an even odd crossing count over every subpath at once?
 *
 * Even odd rather than nonzero, because a band traced inner edge then outer edge is one subpath with a
 * hole and the two rules disagree about the hole. Nothing here asks about a point in a hole, and even
 * odd is the rule that needs no winding direction, which a traced drawing does not promise.
 */
export function pointInPath(d: string, px: number, py: number): boolean {
  let inside = false;
  for (const loop of pathPolygon(d)) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const [xi, yi] = loop[i]!;
      const [xj, yj] = loop[j]!;
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
