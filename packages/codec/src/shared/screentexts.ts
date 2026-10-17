/**
 * The parts of generating a configuration's screen texts that every family does the same way: the form a
 * text is drawn in, inline or by reference, and writing built texts back into a taken apart layout.
 *
 * **The form rule is the configuration's and it is measured on both families**: the first text in address
 * order to draw a run of glyph codes draws it inline (opcode 5), and every later one points at that copy's
 * codes, three bytes past its start (opcode 4). Section 358 measured it over every text draw of 24 Harmony
 * 600, 650 and 700 compiles, and section 406 over every text draw of the 19 Harmony One compiles. The match is
 * on the codes alone, whatever font draws them, and on whole runs. `shareRuns` is that rule, once.
 *
 * `withScreenTexts` and its types moved here from the four slot family's `screentexts.ts`, unchanged, when the
 * touch family's pass needed them too, `todo-compile-one.md` 5.1: writing a text into a program piece, moving
 * every address into a piece whose texts changed length and pointing every reference at its home's inline copy
 * is the frame's business and names no screen.
 */
import type { ContainerLayout, ContainerPiece, PieceRef } from '../frame.ts';
import { layOutContainer } from '../frame.ts';
import { SCREEN_TEXT_AT, SCREEN_TEXT_INLINE } from '../screen.ts';

/** A refusal, named so a caller can tell a configuration a text pass does not describe from a bug. */
export class ScreenTextError extends Error {}

/** A text drawn inline is the opcode, two place bytes, the codes and a zero; by reference, six bytes. */
export const INLINE_HEAD = 3;

/**
 * Where each text of a description sat in the layout, parallel to its texts: the piece, the offset in it and
 * how many bytes, which for a text drawn in several lines is the run of their instructions.
 */
export interface ScreenTextsPlace {
  texts: { piece: ContainerPiece; at: number; length: number }[];
}

/** One instruction built: its codes, its place and, for every copy after the first, the draw it points at. */
export interface BuiltDraw {
  codes: number[];
  x: number;
  y: number;
  /** The index in `draws` of the first draw of the same codes, where this one is drawn by reference. */
  home?: number;
}

export interface BuiltScreenTexts {
  /** Every instruction, in layout order. */
  draws: BuiltDraw[];
  /** Per text of the description, the range of `draws` it is drawn by, `[from, to)`. */
  spans: [number, number][];
}

/**
 * The form rule over draws in layout order: the first draw of a run of codes keeps no `home` and is drawn
 * inline, and every later draw of the same run is given the first one's index as its home.
 */
export function shareRuns(draws: BuiltDraw[]): void {
  const first = new Map<string, number>();
  draws.forEach((one, k) => {
    const key = one.codes.join(',');
    const home = first.get(key);
    if (home === undefined) first.set(key, k);
    else one.home = home;
  });
}

/**
 * Which piece of a layout a blob offset of the configuration it was taken from falls in, and where in it.
 * Refuses a layout that does not lay out to the configuration's length, which is not that configuration taken
 * apart.
 */
export function pieceLocator(
  layout: ContainerLayout, length: number,
): (offset: number) => { piece: ContainerPiece; at: number } {
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== length) throw new ScreenTextError('the layout is not the configuration taken apart');
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  const starts = all.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] as (typeof starts)[number]).at <= offset) low = mid;
      else high = mid - 1;
    }
    const found = starts[low] as (typeof starts)[number];
    return { piece: found.piece, at: offset - found.at };
  };
}

/** A built draw's bytes; a reference's address is left zero for the frame to write. */
function drawBytes(one: BuiltDraw): number[] {
  if (one.home !== undefined) return [SCREEN_TEXT_AT, one.x, one.y, 0, 0, 0];
  if (one.codes.some((code) => code < 1 || code >= 0x80)) throw new ScreenTextError('a glyph code outside 1 to 127 is not written');
  return [SCREEN_TEXT_INLINE, one.x, one.y, ...one.codes, 0];
}

/**
 * A layout with every text rewritten as built, in place in its program piece. Each piece keeps its
 * identity, so whatever points at it still does; an address into a piece whose texts changed length is
 * moved with the bytes it names, and every reference a text makes is written anew, to the inline copy
 * of its home.
 */
export function withScreenTexts(layout: ContainerLayout, built: BuiltScreenTexts, place: ScreenTextsPlace): ContainerLayout {
  if (built.spans.length !== place.texts.length) throw new ScreenTextError('the built texts are not the described ones');
  // Per piece, its texts in order.
  const byPiece = new Map<ContainerPiece, number[]>();
  place.texts.forEach((one, k) => {
    const list = byPiece.get(one.piece) ?? [];
    list.push(k);
    byPiece.set(one.piece, list);
  });
  // The new bytes of each piece and, per piece, how an old offset maps to a new one.
  const remap = new Map<ContainerPiece, (offset: number) => number>();
  const drawAt = new Map<number, { piece: ContainerPiece; at: number }>();
  const rewritten = new Map<ContainerPiece, { bytes: Uint8Array; refs: PieceRef[] }>();
  for (const [piece, indices] of byPiece) {
    indices.sort((a, b) => (place.texts[a] as { at: number }).at - (place.texts[b] as { at: number }).at);
    const out: number[] = [];
    const shifts: { from: number; to: number; delta: number }[] = [];
    let cursor = 0;
    for (const k of indices) {
      const { at, length } = place.texts[k] as { at: number; length: number };
      if (at < cursor) throw new ScreenTextError('two texts overlap');
      for (let b = cursor; b < at; b += 1) out.push(piece.bytes[b] as number);
      shifts.push({ from: at, to: at + length, delta: out.length - at });
      const [from, to] = built.spans[k] as [number, number];
      for (let d = from; d < to; d += 1) {
        drawAt.set(d, { piece, at: out.length });
        out.push(...drawBytes(built.draws[d] as BuiltDraw));
      }
      cursor = at + length;
    }
    const after = out.length - cursor;
    for (let b = cursor; b < piece.bytes.length; b += 1) out.push(piece.bytes[b] as number);
    // An offset moves by the change of every text before it. One inside a text may only be the text's
    // own start, where a program continuing at the text lands; a text's own references are not moved but
    // written anew, below.
    remap.set(piece, (offset) => {
      for (const one of shifts) {
        if (offset >= one.to) continue;
        if (offset > one.from) throw new ScreenTextError('an address lands inside a text');
        return offset + one.delta;
      }
      return offset + after;
    });
    rewritten.set(piece, { bytes: Uint8Array.from(out), refs: [] });
  }

  const inText = (piece: ContainerPiece, at: number): boolean => (byPiece.get(piece) ?? []).some((k) => {
    const one = place.texts[k] as { at: number; length: number };
    return at >= one.at && at < one.at + one.length;
  });
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  for (const piece of all) {
    const refs: PieceRef[] = [];
    for (const ref of piece.refs) {
      if (byPiece.has(piece) && inText(piece, ref.at)) continue;
      const at = remap.get(piece)?.(ref.at) ?? ref.at;
      if ('address' in ref) refs.push({ at, address: ref.address });
      else refs.push({ at, to: ref.to, offset: remap.get(ref.to)?.(ref.offset) ?? ref.offset });
    }
    const was = rewritten.get(piece);
    if (was !== undefined) was.refs = refs;
    else piece.refs = refs;
  }
  // The texts' own references, to the inline copy of their home.
  built.draws.forEach((one, d) => {
    if (one.home === undefined) return;
    const here = drawAt.get(d) as { piece: ContainerPiece; at: number };
    const home = drawAt.get(one.home) as { piece: ContainerPiece; at: number };
    (rewritten.get(here.piece) as { refs: PieceRef[] }).refs.push({ at: here.at + INLINE_HEAD, to: home.piece, offset: home.at + INLINE_HEAD });
  });
  for (const [piece, { bytes, refs }] of rewritten) {
    piece.bytes = bytes;
    piece.refs = refs.sort((a, b) => a.at - b.at);
  }
  return layout;
}
