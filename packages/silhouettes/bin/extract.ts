/**
 * Read a traced drawing and print the geometry a model file needs.
 *
 * The input is an SVG extracted from Logitech's own documentation and traced by hand, which lives in
 * the lab. This is the measuring instrument for it, the way `outline.py` was for a photograph, and it
 * exists so that the numbers in a model file can be produced again rather than being a hand copy
 * nobody can check.
 *
 * What it does **not** do is write a model file. The shapes come out of here; which key each shape is,
 * what it is called and what is printed on it is a person's reading of the drawing, and that is the
 * half that carries the meaning.
 *
 * Two drawing conventions turn up and both are handled, because a converter that assumes one silently
 * finds nothing in the other:
 *
 * * **a filled ring plus a face**, which is what a PDF extractor makes of a stroked outline: a dark
 *   path holding two loops, and a white path just inside it. The face is the shape, and the gap between
 *   the two is the line width the drawing used.
 * * **a real stroke**, a path with `stroke` and no fill, where the centreline is already the shape.
 *
 * The Harmony 600 trace is the first kind throughout. The Harmony One and the Harmony 525 traces are
 * mostly the second, and they also carry transforms, which is why `transformPath` exists.
 */
import { readFileSync } from 'node:fs';

import { pathBounds, parseTransform, compose, transformPath, IDENTITY } from '../src/path.ts';
import type { Bounds, Matrix } from '../src/path.ts';

interface Traced {
  readonly d: string;
  readonly box: Bounds;
  /** Percent grey of the paint, so a dark outline can be told from a white face. */
  readonly grey: number | undefined;
  readonly stroked: boolean;
  /** The width the drawing stroked with, where it says. */
  readonly width: number | undefined;
  /** How many loops the path holds. A ring is two, a face is one. */
  readonly loops: number;
}

/**
 * Read a paint value: `rgb(a%, b%, c%)`, `#rgb`, `#rrggbb`, a couple of names, or nothing.
 *
 * Returned as percent grey, which is all any of this needs: it tells a dark outline from a white face.
 * `undefined` means the shape is not painted that way at all, which is what `none` says and what an
 * absent attribute says.
 */
function grey(value: string | undefined): number | undefined {
  if (value === undefined || value === 'none' || value === 'transparent') return undefined;
  const pct = /rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/.exec(value);
  if (pct !== null) return (Number(pct[1]) + Number(pct[2]) + Number(pct[3])) / 3;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex !== null) {
    const h = hex[1]!;
    const wide = h.length === 6;
    const part = (i: number) => parseInt(wide ? h.slice(i * 2, i * 2 + 2) : h[i]!.repeat(2), 16);
    return ((part(0) + part(1) + part(2)) / 3 / 255) * 100;
  }
  if (value.trim().toLowerCase() === 'white') return 100;
  if (value.trim().toLowerCase() === 'black') return 0;
  // A colour we cannot read is a colour, so it counts as painted rather than as absent. The teletext
  // keys of a Harmony 600 would otherwise vanish from a drawing that names them by word.
  return 50;
}

/** `<polygon>` and `<polyline>` as a path, so one reader handles all three element kinds. */
function pointsToPath(points: string, close: boolean): string {
  const n = (points.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
  const parts: string[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) {
    parts.push(`${i === 0 ? 'M' : 'L'} ${n[i]} ${n[i + 1]}`);
  }
  return close ? `${parts.join(' ')} Z` : parts.join(' ');
}

/**
 * Every shape in the drawing, with its own transform already applied.
 *
 * A tag scan rather than an XML parse, because the inputs are exporters' output and completely regular,
 * and because a dependency for this would be the whole of a DOM implementation. Two things it does have
 * to get right, and both were found by a drawing rather than reasoned about: the **nesting** of
 * `<g transform>`, so the scan keeps a stack; and **inherited paint**, because one exporter sets
 * `fill="none" stroke="none"` on its outermost group and states the real colours per shape while another
 * states them on the group.
 *
 * Three conventions turn up across the three drawings and all three are handled here:
 *
 * * **a filled ring plus a face**, which is what a PDF extractor makes of a stroked outline: a dark path
 *   holding two loops and a white path just inside it. The face is the shape, and the gap between the
 *   two is the line width the drawing used.
 * * **a real stroke**, a path with a stroke colour, where the centreline is already the shape.
 * * **a polygon**, which a vector editor emits for a straight sided shape.
 */
function tracedPaths(file: string): Traced[] {
  const text = readFileSync(file, 'utf8');
  const body = text.includes('</defs>') ? text.slice(text.lastIndexOf('</defs>') + 7) : text;
  interface Frame { at: Matrix; fill: string | undefined; stroke: string | undefined; width: string | undefined }
  const stack: Frame[] = [{ at: IDENTITY, fill: undefined, stroke: undefined, width: undefined }];
  const out: Traced[] = [];
  const attr = (attrs: string, name: string): string | undefined => {
    const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
    return m === null ? undefined : m[1];
  };
  for (const m of body.matchAll(/<(\/?)(g|path|polygon|polyline)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, selfClose] =
      m as unknown as [string, string, string, string, string];
    const here = stack[stack.length - 1]!;
    if (tag === 'g') {
      if (close === '/') {
        if (stack.length > 1) stack.pop();
      } else if (selfClose !== '/') {
        const t = attr(attrs, 'transform');
        stack.push({
          at: t === undefined ? here.at : compose(here.at, parseTransform(t)),
          fill: attr(attrs, 'fill') ?? here.fill,
          stroke: attr(attrs, 'stroke') ?? here.stroke,
          width: attr(attrs, 'stroke-width') ?? here.width,
        });
      }
      continue;
    }
    const raw = tag === 'path' ? attr(attrs, 'd')
      : (() => {
        const pts = attr(attrs, 'points');
        return pts === undefined ? undefined : pointsToPath(pts, tag === 'polygon');
      })();
    if (raw === undefined) continue;
    const own = attr(attrs, 'transform');
    const at = own === undefined ? here.at : compose(here.at, parseTransform(own));
    const moved = transformPath(raw, at);
    const fill = grey(attr(attrs, 'fill') ?? here.fill);
    const stroke = grey(attr(attrs, 'stroke') ?? here.stroke);
    const widthText = attr(attrs, 'stroke-width') ?? here.width;
    // The stroke width is in the transform's units, so it scales with everything else.
    const scale = Math.sqrt(Math.abs(at[0] * at[3] - at[1] * at[2]));
    /**
     * A **stroked** path is split into its subpaths, one shape each; a filled one is kept whole.
     *
     * One exporter puts eight separate outlines in a single `<path>`, which is legal and which made the
     * whole volume, channel and Glow ring of a Harmony 525 read as one shape 200 units across. Splitting
     * a stroked path is safe because each subpath is drawn as its own outline. Splitting a **filled** one
     * is not: two loops there are a ring, where the second loop is the hole, and separating them turns
     * one outline into two solid blobs.
     */
    const pieces = stroke === undefined
      ? [moved]
      : moved.split(/(?=M)/).map((piece) => piece.trim()).filter((piece) => piece.length > 0);
    for (const piece of pieces) {
      out.push({
        d: piece,
        box: pathBounds(piece),
        // What paints the outline: the stroke where there is one, the fill otherwise.
        grey: stroke ?? fill,
        stroked: stroke !== undefined,
        width: widthText === undefined ? undefined : Number(widthText) * scale,
        loops: (piece.match(/M/g) ?? []).length,
      });
    }
  }
  return out;
}

export interface Shape {
  readonly d: string;
  readonly box: Bounds;
  readonly kind: 'ring' | 'stroke';
  /**
   * The marks printed inside this shape, as paths, in the drawing's own form.
   *
   * These are the document's own symbols rather than ours. Words are not among them: the extractor
   * writes its letters as references to glyph outlines and its symbols as paths, so the two separate
   * cleanly, and the text is re typeset in one readable face because that is what the interface asked
   * for in the first place.
   */
  readonly marks: readonly string[];
}

export interface Extracted {
  /** The case outline, and the height it was normalised against. */
  readonly caseOutline: string;
  readonly width: number;
  /** Everything else, largest first, in the drawing's own document order within a size. */
  readonly shapes: readonly Shape[];
  /** Marks that sit inside no shape at all, reported rather than dropped silently. */
  readonly loose: readonly { d: string; box: Bounds }[];
}

/**
 * Turn the drawing into our coordinates: the case outline exactly `height` tall, centred in a width
 * that follows the drawing's own proportion.
 *
 * The case is found as the largest shape rather than by position, and the **second** largest concentric
 * one is the chrome rim Logitech draws just inside the edge, which is a region and not the case.
 */
export function extract(file: string, height = 1000): Extracted {
  const paths = tracedPaths(file);
  const area = (b: Bounds) => (b.maxX - b.minX) * (b.maxY - b.minY);
  const kept: { d: string; box: Bounds; kind: 'ring' | 'stroke'; marks: string[] }[] = [];
  const faces = paths.filter((p) => !p.stroked && p.grey !== undefined && p.grey > 90);
  const claimed = new Set<Traced>();
  for (const p of paths) {
    if (p.stroked) {
      kept.push({ d: p.d, box: p.box, kind: 'stroke', marks: [] });
      claimed.add(p);
      continue;
    }
    // A ring: a dark path with a white face just inside it. The face is what we keep.
    if (p.grey === undefined || p.grey > 50 || p.loops < 2) continue;
    const face = faces.find((f) => Math.abs(f.box.minX - p.box.minX) < 1.2
      && Math.abs(f.box.minY - p.box.minY) < 1.2
      && Math.abs(f.box.maxX - p.box.maxX) < 1.2
      && Math.abs(f.box.maxY - p.box.maxY) < 1.2);
    if (face === undefined) continue;
    kept.push({ d: face.d, box: face.box, kind: 'ring', marks: [] });
    claimed.add(p);
    claimed.add(face);
  }
  /**
   * Attach every remaining dark path to the **smallest** shape that contains it.
   *
   * Smallest and not first, because the mouldings nest: a play triangle sits inside the pause key's
   * moulding, inside the transport block, inside the case, and only the innermost is the key it is
   * printed on.
   */
  const shellArea = Math.max(...kept.map((k) => area(k.box)));
  const loose: { d: string; box: Bounds }[] = [];
  const inside = (a: Bounds, b: Bounds) => a.minX >= b.minX - 0.6 && a.maxX <= b.maxX + 0.6
    && a.minY >= b.minY - 0.6 && a.maxY <= b.maxY + 0.6;
  for (const p of paths) {
    if (claimed.has(p) || p.grey === undefined || p.grey > 50) continue;
    let host: typeof kept[number] | undefined;
    for (const k of kept) {
      // The case and the rim inside it contain everything, so they are not offered as hosts: a mark
      // they would take is one that belongs to no key, and those are the ones worth seeing.
      if (area(k.box) > shellArea * 0.4) continue;
      if (!inside(p.box, k.box)) continue;
      if (host === undefined || area(k.box) < area(host.box)) host = k;
    }
    if (host === undefined) loose.push({ d: p.d, box: p.box });
    else host.marks.push(p.d);
  }
  kept.sort((a, b) => area(b.box) - area(a.box));
  const shell = kept[0];
  if (shell === undefined) throw new Error(`${file}: nothing that looks like a case`);
  const k = height / (shell.box.maxY - shell.box.minY);
  const width = (shell.box.maxX - shell.box.minX) * k;
  const cx = (shell.box.minX + shell.box.maxX) / 2;
  const at: Matrix = [k, 0, 0, k, width / 2 - cx * k, -shell.box.minY * k];
  const move = (s: { d: string; kind: 'ring' | 'stroke'; marks: readonly string[] }): Shape => {
    const d = transformPath(s.d, at);
    return { d, box: pathBounds(d), kind: s.kind, marks: s.marks.map((m) => transformPath(m, at)) };
  };
  return {
    caseOutline: transformPath(shell.d, at),
    width: Math.round(width * 1000) / 1000,
    shapes: kept.slice(1).map(move),
    loose: loose.map((l) => {
      const d = transformPath(l.d, at);
      return { d, box: pathBounds(d) };
    }),
  };
}

if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {
  const file = process.argv[2];
  if (file === undefined) throw new Error('usage: extract.ts <traced.svg> [--paths]');
  const e = extract(file);
  const showPaths = process.argv.includes('--paths');
  console.log(`# ${file}`);
  console.log(`# width ${e.width} at height 1000, ${e.shapes.length} shapes besides the case`);
  if (showPaths) console.log(`case: '${e.caseOutline}'`);
  console.log('     cx      cy       w       h  kind');
  e.shapes.forEach((s, i) => {
    const { minX, maxX, minY, maxY } = s.box;
    const line = [(minX + maxX) / 2, (minY + maxY) / 2, maxX - minX, maxY - minY]
      .map((v) => v.toFixed(2).padStart(7)).join(' ');
    console.log(`${String(i).padStart(3)} ${line}  ${s.kind}  ${s.marks.length} mark(s)`);
    if (showPaths) {
      console.log(`  ${s.d}`);
      for (const m of s.marks) console.log(`  mark ${m}`);
    }
  });
  console.log(`# ${e.loose.length} mark(s) inside no shape:`);
  for (const l of e.loose) {
    console.log(`#   ${((l.box.minX + l.box.maxX) / 2).toFixed(1)},`
      + `${((l.box.minY + l.box.maxY) / 2).toFixed(1)}  `
      + `${(l.box.maxX - l.box.minX).toFixed(1)}x${(l.box.maxY - l.box.minY).toFixed(1)}`);
  }
}
