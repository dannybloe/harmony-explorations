/**
 * One rasteriser for everything we draw from outlines, `todo-compile-650.md` 10.8: a letter from a font's
 * outlines today, an icon's path or a drawn shape such as the Harmony One's touch button backgrounds when
 * that family is built. It takes a path, straight lines and quadratic and cubic curves in pixel units with
 * y running down, and answers two things per pixel of a canvas:
 *
 * * **coverage**, the share of the pixel the shape covers, 0 to 1, computed exactly for the flattened path
 *   by accumulating each edge's signed area (the method of font-rs and stb_truetype). This is what a
 *   blended letter's grey levels are, decision 22.
 * * **ink**, whether the pixel's centre lies inside the shape by the non-zero rule, which is how a one bit
 *   rendering decides, and what Logitech's letters and ours look like unblended.
 *
 * **No hinting**, where Pillow's FreeType, which drew the letters approved in 8.2, hints. So letters from
 * here differ from those in a few pixels; `typeface.ts` measures by how much.
 *
 * **Byte identical on every machine**: only addition, subtraction, multiplication, division and
 * comparison of doubles, which IEEE 754 fixes exactly, and curves flattened into a fixed number of
 * segments, so nothing depends on a platform's maths library or on a tolerance's rounding.
 */

/** One step of a path, in pixel units with y down: opentype.js's commands, and an SVG path's absolute ones. */
export type PathCommand =
  | { readonly type: 'M'; readonly x: number; readonly y: number }
  | { readonly type: 'L'; readonly x: number; readonly y: number }
  | { readonly type: 'Q'; readonly x1: number; readonly y1: number; readonly x: number; readonly y: number }
  | { readonly type: 'C'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly x: number; readonly y: number }
  | { readonly type: 'Z' };

/** A canvas's pixels, row after row: per pixel the coverage, 0 to 1, and whether its centre is inked. */
export interface Drawing {
  readonly width: number;
  readonly height: number;
  readonly coverage: Float64Array;
  readonly ink: Uint8Array;
}

/**
 * How many straight segments a curve becomes. Sixteen keeps a curve at these sizes, a few pixels across,
 * within a hundredth of a pixel of its true course, and a fixed count is what keeps the result the same
 * on every machine.
 */
export const CURVE_SEGMENTS = 16;

type Edge = readonly [x0: number, y0: number, x1: number, y1: number];

/** The path as closed polygons' edges: curves flattened, every contour closed back to its start. */
function edgesOf(commands: readonly PathCommand[]): Edge[] {
  const edges: Edge[] = [];
  let startX = 0;
  let startY = 0;
  let x = 0;
  let y = 0;
  const line = (toX: number, toY: number): void => {
    if (toX !== x || toY !== y) edges.push([x, y, toX, toY]);
    x = toX;
    y = toY;
  };
  const close = (): void => line(startX, startY);
  for (const c of commands) {
    switch (c.type) {
      case 'M':
        close();
        startX = x = c.x;
        startY = y = c.y;
        break;
      case 'L':
        line(c.x, c.y);
        break;
      case 'Q': {
        const [x0, y0] = [x, y];
        for (let k = 1; k <= CURVE_SEGMENTS; k += 1) {
          const t = k / CURVE_SEGMENTS;
          const u = 1 - t;
          line(u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, u * u * y0 + 2 * u * t * c.y1 + t * t * c.y);
        }
        break;
      }
      case 'C': {
        const [x0, y0] = [x, y];
        for (let k = 1; k <= CURVE_SEGMENTS; k += 1) {
          const t = k / CURVE_SEGMENTS;
          const u = 1 - t;
          line(u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
            u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y);
        }
        break;
      }
      case 'Z':
        close();
        break;
    }
  }
  close();
  return edges;
}

/**
 * Each pixel's coverage: every edge adds its signed area to the cells it crosses, and a running sum along
 * each row turns that into the area inside. Overlapping contours of one direction add up and are capped at
 * a whole pixel, which is the non-zero rule for the shapes fonts hold.
 */
function coverageOf(edges: readonly Edge[], width: number, height: number): Float64Array {
  // Two spare cells a row: an edge at the right margin writes one cell past its last pixel.
  const stride = width + 2;
  const acc = new Float64Array(stride * height);
  for (const edge of edges) {
    let [x0, y0, x1, y1] = edge;
    if (y0 === y1) continue;
    let dir = 1;
    if (y0 > y1) {
      dir = -1;
      [x0, y0, x1, y1] = [x1, y1, x0, y0];
    }
    const dxdy = (x1 - x0) / (y1 - y0);
    let x = x0;
    if (y0 < 0) {
      x -= y0 * dxdy;
      y0 = 0;
    }
    const yEnd = Math.min(height, Math.ceil(y1));
    for (let row = Math.max(0, Math.floor(y0)); row < yEnd; row += 1) {
      const base = row * stride;
      const dy = Math.min(row + 1, y1) - Math.max(row, y0);
      const xNext = x + dxdy * dy;
      const d = dy * dir;
      const left = Math.max(0, Math.min(x, xNext));
      const right = Math.max(0, Math.max(x, xNext));
      const leftFloor = Math.floor(left);
      const rightCeil = Math.ceil(right);
      if (rightCeil <= leftFloor + 1) {
        // The edge stays in one cell on this row: the area right of it, split between this cell and the next.
        const mid = 0.5 * (x + xNext) - leftFloor;
        acc[base + leftFloor] = acc[base + leftFloor]! + d - d * mid;
        acc[base + leftFloor + 1] = acc[base + leftFloor + 1]! + d * mid;
      } else {
        // It crosses several cells: a triangle in the first and last, a constant share in between.
        const s = 1 / (right - left);
        const leftFrac = left - leftFloor;
        const a0 = 0.5 * s * (1 - leftFrac) * (1 - leftFrac);
        const rightFrac = right - rightCeil + 1;
        const am = 0.5 * s * rightFrac * rightFrac;
        acc[base + leftFloor] = acc[base + leftFloor]! + d * a0;
        if (rightCeil === leftFloor + 2) {
          acc[base + leftFloor + 1] = acc[base + leftFloor + 1]! + d * (1 - a0 - am);
        } else {
          const a1 = s * (1.5 - leftFrac);
          acc[base + leftFloor + 1] = acc[base + leftFloor + 1]! + d * (a1 - a0);
          for (let cell = leftFloor + 2; cell < rightCeil - 1; cell += 1) acc[base + cell] = acc[base + cell]! + d * s;
          const a2 = a1 + (rightCeil - leftFloor - 3) * s;
          acc[base + rightCeil - 1] = acc[base + rightCeil - 1]! + d * (1 - a2 - am);
        }
        acc[base + rightCeil] = acc[base + rightCeil]! + d * am;
      }
      x = xNext;
    }
  }
  const coverage = new Float64Array(width * height);
  for (let row = 0; row < height; row += 1) {
    let sum = 0;
    for (let col = 0; col < width; col += 1) {
      sum += acc[row * stride + col]!;
      coverage[row * width + col] = Math.min(1, Math.abs(sum));
    }
  }
  return coverage;
}

/**
 * The spans a line through the shape lies inside it, by the non-zero rule: where the winding of the edges
 * crossed so far turns non-zero, and where it returns to zero. `across` picks the line: a row's centre
 * line `y = at`, crossing edges in x, or a column's `x = at`, crossing them in y.
 */
function spans(edges: readonly Edge[], at: number, across: 'row' | 'column'): [number, number][] {
  const crossings: [number, number][] = [];
  for (const edge of edges) {
    const [a0, b0, a1, b1] = across === 'row' ? edge : [edge[1], edge[0], edge[3], edge[2]];
    // Half open, so a vertex on the line is counted once.
    if ((b0 <= at && b1 > at) || (b1 <= at && b0 > at)) {
      crossings.push([a0 + ((at - b0) * (a1 - a0)) / (b1 - b0), b1 > b0 ? 1 : -1]);
    }
  }
  crossings.sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let winding = 0;
  let from = 0;
  for (const [where, turn] of crossings) {
    const was = winding;
    winding += turn;
    if (was === 0 && winding !== 0) from = where;
    else if (was !== 0 && winding === 0) out.push([from, where]);
  }
  return out;
}

/**
 * Each pixel inked or not, as a one bit rendering decides: its centre inside the shape by the non-zero rule,
 * and **dropout control**, which is FreeType's and TrueType's rule for strokes thinner than a pixel. A span
 * of a row or a column that lies inside the shape but covers no pixel centre would otherwise vanish, which
 * takes the tips of diagonals and the thin bars of small letters with it; such a span inks the pixel its
 * middle falls in.
 */
function inkOf(edges: readonly Edge[], width: number, height: number): Uint8Array {
  const ink = new Uint8Array(width * height);
  const set = (col: number, row: number): void => {
    if (col >= 0 && col < width && row >= 0 && row < height) ink[row * width + col] = 1;
  };
  for (let row = 0; row < height; row += 1) {
    for (const [from, to] of spans(edges, row + 0.5, 'row')) {
      // The centres col + 0.5 with from <= col + 0.5 < to.
      const first = Math.ceil(from - 0.5);
      const last = Math.ceil(to - 0.5) - 1;
      if (last < first) set(Math.floor((from + to) / 2), row);
      for (let col = first; col <= last; col += 1) set(col, row);
    }
  }
  for (let col = 0; col < width; col += 1) {
    for (const [from, to] of spans(edges, col + 0.5, 'column')) {
      if (Math.ceil(to - 0.5) - 1 < Math.ceil(from - 0.5)) set(col, Math.floor((from + to) / 2));
    }
  }
  return ink;
}

/** A path drawn on a canvas `width` by `height` pixels, its coverage and its ink per pixel. */
export function rasterise(commands: readonly PathCommand[], width: number, height: number): Drawing {
  const edges = edgesOf(commands);
  return { width, height, coverage: coverageOf(edges, width, height), ink: inkOf(edges, width, height) };
}
