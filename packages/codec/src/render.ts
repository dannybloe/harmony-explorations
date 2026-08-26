/**
 * Draw a screen the way the remote draws it: run a screen program into a raster.
 *
 * **This is a check on ten readers at once, which is why it is here rather than in an application.**
 * A picture's extent, a glyph's encoding, a font set's first code, a string's referenced address, a
 * mode page's program, the touch hit map: every one of those is asserted by a test that says a number
 * came back, and none of those tests can see that the number puts a label half a row too high or draws
 * an icon over its own caption. A rendered page can. Section 129.
 *
 * The pixel format is **big endian** RGB565, which is the one thing here that had to be measured
 * rather than assumed, and the first reading was wrong. Little endian, the order every framing field
 * in this format uses, turns a Harmony One's glossy blue buttons into horizontal rainbow stripes;
 * taking the high byte first makes the same bytes a smooth blue with a dark border and a white
 * highlight. That is the order a display controller wants over a serial bus, so the pixels are stored
 * the way they are sent and not the way the rest of the container is written. Arch 9 (Harmony 525) is
 * the exception the font reader already carries, two bit grey.
 *
 * What this does **not** do is decide what a screen shows. A program branches on state variables, and
 * a page is therefore a set of screens rather than one; `renderProgram` follows the first target of
 * every switch and reports how many it passed, so a caller can say "one of 6" rather than pretend.
 */
import type { Container } from './gspm.ts';
import { u8 } from './bytes.ts';
import {
  BITMAP_ENCODED,
  BITMAP_END,
  BITMAP_HEADER,
  BITMAP_MONOCHROME_ARCHITECTURES,
  BITMAP_NOTHING,
  BITMAP_RAW,
  BITMAP_ROW_BREAK,
  PIXEL_BITS,
  PIXEL_BYTES,
  SCREEN_DRAW_IMAGE,
  SCREEN_DRAW_IMAGE_AT,
  SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  bitmapAt,
  pictureReference,
  screenProgram,
  screenSwitch,
  transfers,
  type Bitmap,
  type ScreenCase,
  type ScreenInstruction,
} from './screen.ts';
import { IMAGE_PACKED_INK, fontSets, glyphOf, type FontSet, type Glyph } from './font.ts';
import { glyphsReferencedBy } from './text.ts';
import { modePages, type ModePage } from './sections.ts';

/**
 * The display of each architecture, in pixels.
 *
 * **Measured from the configs, not from a data sheet.** Every one of these is the size of the full
 * screen background pictures the configs draw, 257 of them on one Harmony One, and the drawn text of
 * each architecture stops just inside it. Section 129.
 */
/*
 * **Arch 10 has an entry since section 183 and this comment used to explain why it did not.** The
 * reason was that an arch 10 container states no architecture, so nothing would look the row up. That
 * turned out to be wrong about the container rather than about the table: section 182 found the
 * architecture record at raw slot 0, where every other architecture keeps its name tree, so an arch 10
 * config does state its architecture and the row is live.
 */
export const SCREEN_SIZES: Readonly<Record<number, { width: number; height: number }>> = {
  8: { width: 128, height: 160 },
  // Arch 10, measured from its own picture bank rather than from where programs draw, section 179,
  // and corroborated by the whole size profile matching a Harmony 885's ten distinct sizes.
  10: { width: 128, height: 160 },
  9: { width: 96, height: 64 },
  12: { width: 176, height: 220 },
  14: { width: 128, height: 128 },
};

/**
 * One pixel of a picture or a glyph, RGB565, high byte first.
 *
 * **Not `u16`**, which is this format's little endian reader and is right for every length, count and
 * pointer in the container. A pixel is the exception, and reading it the other way is not a subtle
 * error: it shifts the green field across the red and blue ones and draws a rainbow.
 */
function pixelAt(blob: Uint8Array, off: number): number {
  return (u8(blob, off) << 8) | u8(blob, off + 1);
}

/** A pixel nothing drew. Not black, which is a colour a config chooses often and deliberately. */
export const UNDRAWN = -1;

export interface Raster {
  width: number;
  height: number;
  /** One entry per pixel, row major: an RGB565 value, or `UNDRAWN`. */
  pixels: Int32Array;
}

export interface RenderedPage {
  raster: Raster;
  /** How many pictures were drawn, and how many the program named and this could not decode. */
  pictures: number;
  picturesMissing: number;
  /** How many strings were drawn, and how many glyph codes had no glyph in the selected font. */
  strings: number;
  glyphsMissing: number;
  /**
   * Switches passed, each of which had more than one target.
   *
   * A screen is one path through the program, so this is how many other screens the same program can
   * draw. Zero means the page has exactly one appearance.
   */
  branches: number;
}

/** A raster of the architecture's own display size, with nothing drawn on it. */
export function blankScreen(c: Container): Raster | undefined {
  const size = SCREEN_SIZES[c.architecture ?? -1];
  if (size === undefined) return undefined;
  const pixels = new Int32Array(size.width * size.height);
  pixels.fill(UNDRAWN);
  return { width: size.width, height: size.height, pixels };
}

/**
 * The pixels of a picture, one row per row, `undefined` where the encoding skipped a pixel.
 *
 * The three kinds are section 50's, and the walk is the firmware's own: a raw picture is
 * `stride * rows` pixels straight through, an encoded one is control bytes where bit 7 set skips and
 * a smaller byte introduces that many literal pixels, and on arch 9 (Harmony 525) kind 2 is one bit
 * a pixel padded to a whole byte per row, section 85.
 *
 * **A skipped pixel is transparent and not black**, which is what makes an icon over a background
 * look right, and it is also why `Raster` carries `UNDRAWN` rather than starting black.
 *
 * **This walk exists twice**, here and as `bitmapAt` plus `encodedExtent` in `screen.ts`, which walk
 * the same three forms to compute a length rather than pixels. They are not merged, because
 * `bitmapAt` runs inside `pictureBank`'s offset search and would then decode every candidate's
 * pixels; two copies of a derivation is the state `CLAUDE.md`'s oldest rule warns about, so the two
 * are tied by a test that can see both, `the length walk and the pixel walk agree about every
 * picture` in `render.test.ts`. Section 85's row padding correction had to be applied in both places
 * by hand, with nothing to say so. Section 139.
 */
export function bitmapPixels(c: Container, b: Bitmap): (number | undefined)[][] | undefined {
  const off = c.blobOffsetOf(b.address);
  if (off === undefined) return undefined;
  const from = off + BITMAP_HEADER;
  if (b.kind === BITMAP_RAW) {
    if (from + PIXEL_BYTES * b.stride * b.rows > c.blob.length) return undefined;
    const out: (number | undefined)[][] = [];
    for (let row = 0; row < b.rows; row += 1) {
      const line: (number | undefined)[] = [];
      for (let x = 0; x < b.stride; x += 1) {
        line.push(pixelAt(c.blob, from + PIXEL_BYTES * (row * b.stride + x)));
      }
      out.push(line);
    }
    return out;
  }
  if (b.kind === BITMAP_NOTHING) {
    // Arch 9's monochrome form. Everywhere else kind 2 is a firmware `RETURN`, so it draws nothing.
    if (!BITMAP_MONOCHROME_ARCHITECTURES.has(c.architecture ?? -1)) return [];
    const bytesPerRow = Math.ceil(b.stride / PIXEL_BITS);
    if (from + bytesPerRow * b.rows > c.blob.length) return undefined;
    const out: (number | undefined)[][] = [];
    for (let row = 0; row < b.rows; row += 1) {
      const line: (number | undefined)[] = [];
      for (let x = 0; x < b.stride; x += 1) {
        const byte = u8(c.blob, from + bytesPerRow * row + (x >> 3));
        line.push(((byte >> (7 - (x & 7))) & 1) === 0 ? 0x0000 : 0xffff);
      }
      out.push(line);
    }
    return out;
  }
  if (b.kind !== BITMAP_ENCODED) return undefined;
  const out: (number | undefined)[][] = [[]];
  let at = from;
  while (at < c.blob.length) {
    const control = u8(c.blob, at);
    at += 1;
    if (control === BITMAP_END) return out;
    if (control === BITMAP_ROW_BREAK) {
      out.push([]);
      continue;
    }
    const line = out[out.length - 1] as (number | undefined)[];
    if ((control & 0x80) !== 0) {
      for (let i = 0; i < (control & 0x7f); i += 1) line.push(undefined);
      continue;
    }
    for (let i = 0; i < control; i += 1) {
      line.push(pixelAt(c.blob, at));
      at += PIXEL_BYTES;
    }
  }
  return undefined;
}

/** Put a picture's pixels on the raster at `x, y`, clipped to the display. */
function drawPixels(raster: Raster, rows: (number | undefined)[][], x: number, y: number): void {
  rows.forEach((line, row) => {
    const at = y + row;
    if (at < 0 || at >= raster.height) return;
    line.forEach((pixel, column) => {
      const into = x + column;
      if (pixel === undefined || into < 0 || into >= raster.width) return;
      raster.pixels[at * raster.width + into] = pixel;
    });
  });
}

/**
 * Copy a `w` by `h` region of a picture from `sx, sy` to `dx, dy` on the screen.
 *
 * **Opcode 3's shape, and it is a blit rather than a draw**, which is the difference that made it
 * worth reading rather than treating as a second spelling of opcode 2. A page strip is copied to
 * where it already sits 2624 times in the corpus, and 708 arch 8 (Harmony 880) instructions copy a
 * region from somewhere else to somewhere else.
 *
 * The rectangle is clipped at both ends rather than trusted, though nothing in the corpus needs it:
 * every destination fits its display and every source fits its picture, 3540 of 3540, which is the
 * measurement that says the six bytes were read in the right order. A future container may not, and
 * a renderer that walked off the end of a row would silently paint a neighbouring one.
 */
function drawRegion(raster: Raster, rows: (number | undefined)[][],
                    dx: number, dy: number, sx: number, sy: number, w: number, h: number): void {
  for (let row = 0; row < h; row += 1) {
    const from = rows[sy + row];
    const at = dy + row;
    if (from === undefined || at < 0 || at >= raster.height) continue;
    for (let column = 0; column < w; column += 1) {
      const pixel = from[sx + column];
      const into = dx + column;
      if (pixel === undefined || into < 0 || into >= raster.width) continue;
      raster.pixels[at * raster.width + into] = pixel;
    }
  }
}

/**
 * A glyph's pixels, with arch 9's two bit grey levels turned into the same RGB565 the others use.
 *
 * Arch 9 stores ink and paper as the values 1 and 2, section 63, so a caller that treated them as
 * colours would draw a black on black screen. This is the only place the two differ.
 */
function glyphPixels(c: Container, glyph: Glyph): (number | undefined)[][] {
  if (!BITMAP_MONOCHROME_ARCHITECTURES.has(c.architecture ?? -1)) return glyph.rows;
  return glyph.rows.map((row) => row.map((pixel) => (pixel === IMAGE_PACKED_INK ? 0xffff : 0x0000)));
}

/**
 * How far the pen moves past a glyph's own width, in pixels.
 *
 * **Nothing, because the spacing is inside the glyph**, and that was measured rather than eyeballed,
 * since a rendered page looks plausible at nought and at one. Two things say it, section 129. A
 * glyph's last column is entirely background in 142 of 160 arch 9 glyphs, 258 of 283 arch 8 ones and
 * 258 of 463 arch 14 ones, drawn as paper rather than skipped, so the gap between letters is a column
 * the font carries. And a remote never draws text off its own display: with no extra advance not one
 * of the 1904 strings a Harmony One draws passes its 176 pixel edge, where one extra column pushes 38
 * of them off it and three pushes 235.
 */
export const GLYPH_ADVANCE = 0;

/** Draw a run of glyph codes from `x, y` with the font `select` chose, returning what was missing. */
function drawString(
  c: Container,
  raster: Raster,
  set: FontSet | undefined,
  codes: Uint8Array,
  x: number,
  y: number,
): number {
  let pen = x;
  let missing = 0;
  for (const code of codes) {
    const glyph = set === undefined ? undefined : glyphOf(c, set, code);
    if (glyph === undefined) {
      missing += 1;
      continue;
    }
    drawPixels(raster, glyphPixels(c, glyph), pen, y);
    pen += glyph.width + GLYPH_ADVANCE;
  }
  return missing;
}

/**
 * Run the screen program at `address` into a raster.
 *
 * The walk follows the program's own successors, so a jump is followed and a switch is entered by its
 * first target, with `branches` counting the choices that were made for the caller. A target already
 * visited is not entered twice, which is what stops a menu that loops back on itself.
 */
export function renderProgram(c: Container, address: number): RenderedPage | undefined {
  return run(c, address).page;
}

/** A branch a screen took, which is what says under what conditions the screen looks like this. */
export interface ScreenChoice extends ScreenCase {
  /** The base slot 13 state variable the switch reads. `inventory.ts` turns it into a name. */
  variable: number;
  /** How many arms the switch had, so a caller can say one of how many. */
  arms: number;
}

export interface ScreenVariant {
  page: RenderedPage;
  /** The arms taken, in the order the program met them. Empty for a page that cannot vary. */
  choices: ScreenChoice[];
}

/**
 * Every appearance a page can have, or as many as `limit` allows.
 *
 * A screen program switches on the state of the remote, so "the screen of page 45" is not one image:
 * section 129 counted the branches and drew the first arm of each. This walks the arms instead, and
 * each variant carries the choices that produced it, so an interface can say **when** a screen looks
 * like that rather than numbering the pictures.
 *
 * Breadth first over the decision prefixes, so variant 0 is always the all first arms one that
 * `renderProgram` draws, and the ones that differ in a single late decision come next. `truncated`
 * says the limit cut the list, because a program with several switches has a product of arms and a
 * caller must not present a capped list as the whole set.
 */
export function renderVariants(
  c: Container,
  address: number,
  limit = 12,
): { variants: ScreenVariant[]; truncated: boolean } {
  const variants: ScreenVariant[] = [];
  const queue: number[][] = [[]];
  let truncated = false;
  const seen = new Set<string>();
  while (queue.length > 0) {
    if (variants.length >= limit) {
      truncated = true;
      break;
    }
    const prefix = queue.shift() as number[];
    const { page, choices, forks } = run(c, address, prefix);
    if (page === undefined) continue;
    // Two prefixes can reach the same set of choices when a switch is never met, so the taken arms
    // rather than the prefix are what makes a variant distinct.
    const key = choices.map((choice) => `${choice.variable}:${choice.target}`).join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({ page, choices });
    for (const fork of forks) queue.push(fork);
  }
  return { variants, truncated };
}

/**
 * Draw one path through a program.
 *
 * `decisions` is the arm to take at the switches met so far, one entry each in encounter order; a
 * switch past the end of it takes arm 0. `forks` comes back as the prefixes that would take a
 * different arm at each switch this path met, which is what `renderVariants` explores.
 */
function run(
  c: Container,
  address: number,
  decisions: readonly number[] = [],
): { page: RenderedPage | undefined; choices: ScreenChoice[]; forks: number[][] } {
  const choices: ScreenChoice[] = [];
  const forks: number[][] = [];
  const page = draw(c, address, decisions, choices, forks);
  return { page, choices, forks };
}

function draw(
  c: Container,
  address: number,
  decisions: readonly number[],
  choices: ScreenChoice[],
  forks: number[][],
): RenderedPage | undefined {
  const raster = blankScreen(c);
  if (raster === undefined) return undefined;
  const out: RenderedPage = {
    raster,
    pictures: 0,
    picturesMissing: 0,
    strings: 0,
    glyphsMissing: 0,
    branches: 0,
  };
  const sets = fontSets(c) ?? [];
  const seen = new Set<number>();
  let at: number | undefined = address;
  let font = -1;
  while (at !== undefined && !seen.has(at)) {
    seen.add(at);
    const program: ScreenInstruction[] | undefined = screenProgram(c, at);
    if (program === undefined) return out;
    let next: number | undefined;
    for (const instruction of program) {
      if (instruction.opcode === SCREEN_SELECT_FONT) font = instruction.operands[0] ?? -1;
      else if (instruction.opcode === SCREEN_DRAW_IMAGE
               || instruction.opcode === SCREEN_DRAW_IMAGE_AT) {
        const named = pictureReference(instruction);
        const picture = named === undefined ? undefined : bitmapAt(c, named);
        const rows = picture === undefined ? undefined : bitmapPixels(c, picture);
        if (rows === undefined) out.picturesMissing += 1;
        else {
          const o = instruction.operands;
          if (instruction.opcode === SCREEN_DRAW_IMAGE) {
            drawPixels(raster, rows, o[0] ?? 0, o[1] ?? 0);
          } else {
            // Opcode 3 is a **region copy**, not a whole picture draw: six bytes are
            // `dx, dy, sx, sy, w, h` with the destination first, section 118 and section 148.
            drawRegion(raster, rows, o[0] ?? 0, o[1] ?? 0, o[2] ?? 0, o[3] ?? 0, o[4] ?? 0, o[5] ?? 0);
          }
          out.pictures += 1;
        }
      } else if (instruction.opcode === SCREEN_TEXT_INLINE || instruction.opcode === SCREEN_TEXT_AT) {
        const codes = instruction.opcode === SCREEN_TEXT_INLINE
          ? instruction.glyphs
          : glyphsReferencedBy(c, instruction);
        if (codes !== undefined) {
          out.glyphsMissing += drawString(c, raster, sets[font], codes,
            instruction.operands[0] ?? 0, instruction.operands[1] ?? 0);
          out.strings += 1;
        }
      }
      if (!transfers(instruction)) continue;
      if (instruction.targets.length > 1) {
        out.branches += 1;
        const decided = decisions[choices.length] ?? 0;
        const switched = screenSwitch(instruction);
        // Every other arm is a variant somebody may want to see, so it is offered as a prefix.
        const taken = [...decisions.slice(0, choices.length), decided];
        for (let arm = 0; arm < instruction.targets.length; arm += 1) {
          if (arm !== decided) forks.push([...taken.slice(0, -1), arm]);
        }
        const one = switched?.cases[decided];
        choices.push({
          variable: switched?.variable ?? -1,
          arms: instruction.targets.length,
          target: instruction.targets[decided] as number,
          ...(one?.value === undefined ? {} : { value: one.value }),
          ...(one?.from === undefined ? {} : { from: one.from, to: one.to as number }),
        });
        next = instruction.targets[decided];
        break;
      }
      next = instruction.targets[0];
      break;
    }
    at = next;
  }
  return out;
}

/** Render a mode page, which is the unit a person sees: one screen of one mode. Section 66. */
export function renderPage(c: Container, page: ModePage): RenderedPage | undefined {
  return renderProgram(c, page.program);
}

/** Every mode page rendered, in mode table order, which is the order `keyLabels` indexes them by. */
export function renderPages(c: Container): (RenderedPage | undefined)[] {
  return modePages(c).map((page) => renderPage(c, page));
}
