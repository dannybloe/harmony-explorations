/**
 * The Harmony One's activity pictures, drawn by us under decision 24, `todo-compile-one.md` 1.2.11.2.1: the
 * pads of an activity's working screen, its row on the activity menu, and the icon its start up screen
 * shows. The look was shown and agreed on 15 October 2026: rounded boxes in a light to dark blue gradient,
 * white icons of the icon font over them, and one box for every pad. The colours and the icons are choices,
 * `TouchChoices.activityBox` and `activityIcons`; the sizes and places are Logitech's, measured on the 64
 * activities of the Harmony One's fifteen compiles in the lab, findings section 399.
 *
 * Logitech draws a pad box per row of the working screen, the first row's apart from the other two, and an
 * icon per type at the row's size and at the start up screen's. Ours is one pad box for all six places, a
 * row box with no icon, and the icon as a picture of its own drawn over the row box's pixels where it sits,
 * so the menu row is the row box with the icon drawn over it, as Logitech's is.
 */
import { rgb565, rgbTo565 } from '../../png.ts';
import { iconOverRows } from '../../pictures.ts';
import { encodeBitmap } from '../../screen.ts';
import type { WeightFor } from '../../blending.ts';
import { TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH } from './labels.ts';
import { MENU_ICON_OFFSET } from './menus.ts';
import type { TouchChoices } from './choices.ts';

/** A row of the activity menu, its background, measured on every activity menu row of the compiles. */
export const ACTIVITY_ROW_SIZE: readonly [number, number] = [164, 50];
/** The icon a row draws over its background, at `MENU_ICON_OFFSET` from the row's corner. */
export const ACTIVITY_ROW_ICON_SIZE: readonly [number, number] = [51, 48];
/** The start up screen's icon and where it is drawn, the same on all 63 start up screens of the compiles. */
export const STARTUP_ICON_SIZE: readonly [number, number] = [62, 42];
export const STARTUP_ICON_AT: readonly [number, number] = [57, 67];
/** The radius of a box's rounded corners, in pixels, our choice: what the agreed draft's corner steps drew. */
const CORNER_RADIUS = 4;
/** Samples per pixel side when a pixel's coverage by a box's outline is measured. */
const SAMPLES = 4;
const WHITE = rgbTo565(255, 255, 255);

function colourOf(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m === null) throw new Error(`${hex} is not a colour of the form #rrggbb`);
  return [parseInt(m[1] as string, 16), parseInt(m[2] as string, 16), parseInt(m[3] as string, 16)];
}

/** The colour of the form #rrggbb as RGB565, the panel's. */
export function colour565(hex: string): number {
  return rgbTo565(...colourOf(hex));
}

/**
 * How much of pixel `(x, y)` a rectangle `width` by `height` with corners rounded by `radius` covers, drawn
 * `inset` pixels in from every side, by sampling: 0 for none, 1 for all.
 */
function roundedCoverage(x: number, y: number, width: number, height: number, inset: number, radius: number): number {
  let inside = 0;
  for (let sy = 0; sy < SAMPLES; sy += 1) {
    for (let sx = 0; sx < SAMPLES; sx += 1) {
      const px = x + (sx + 0.5) / SAMPLES;
      const py = y + (sy + 0.5) / SAMPLES;
      if (px < inset || py < inset || px > width - inset || py > height - inset) continue;
      const cx = Math.min(Math.max(px, inset + radius), width - inset - radius);
      const cy = Math.min(Math.max(py, inset + radius), height - inset - radius);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2) inside += 1;
    }
  }
  return inside / (SAMPLES * SAMPLES);
}

/**
 * A box `width` by `height` in the activity look: filled with one colour, a one pixel rim around it, and its
 * corners rounded and smoothed against `behind`, RGB565, the colour of the screen where the box is drawn.
 * A pixel the box does not touch is left undrawn.
 */
export function activityBoxRows(
  width: number, height: number, look: TouchChoices['activityBox'], behind: number,
): (number | undefined)[][] {
  const fill = colourOf(look.fill);
  const rim = colourOf(look.rim);
  const paper = rgb565(behind);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (__, x): number | undefined => {
    const outer = roundedCoverage(x, y, width, height, 0, CORNER_RADIUS);
    if (outer === 0) return undefined;
    const inner = roundedCoverage(x, y, width, height, 1, CORNER_RADIUS - 1);
    const mixed = [0, 1, 2].map((k) => Math.round(
      (paper[k] as number) * (1 - outer) + (rim[k] as number) * (outer - inner) + (fill[k] as number) * inner));
    return rgbTo565(mixed[0] as number, mixed[1] as number, mixed[2] as number);
  }));
}

/** The working screen's pad box, one for all six places, over `behind`. */
export function activityPadBox(look: TouchChoices['activityBox'], behind: number): Uint8Array {
  return encodeBitmap(activityBoxRows(TOUCH_PAD_WIDTH, TOUCH_PAD_HEIGHT, look, behind));
}

/** The activity menu row's background, over `behind`. */
export function activityRowBox(look: TouchChoices['activityBox'], behind: number): Uint8Array {
  return encodeBitmap(activityBoxRows(ACTIVITY_ROW_SIZE[0], ACTIVITY_ROW_SIZE[1], look, behind));
}

/**
 * The icon a row of the activity menu wears: the slice of the row box under it, with the icon drawn over it
 * in white in a grid square of `grid` pixels, so drawn over the row box it changes nothing but the icon.
 */
export function activityRowIcon(look: TouchChoices['activityBox'], behind: number, icon: string, grid: number): Uint8Array {
  const [x, y] = MENU_ICON_OFFSET;
  const [width, height] = ACTIVITY_ROW_ICON_SIZE;
  const slice = activityBoxRows(ACTIVITY_ROW_SIZE[0], ACTIVITY_ROW_SIZE[1], look, behind)
    .slice(y, y + height).map((row) => row.slice(x, x + width));
  return encodeBitmap(iconOverRows(slice, 0, 0, width, height, icon, grid, WHITE));
}

/**
 * The start up screen's icon, drawn in white in a grid square of `grid` pixels over `under`, the pixels the
 * screen's background has where the icon goes, `STARTUP_ICON_SIZE` of them.
 */
export function startupIcon(icon: string, under: readonly (readonly (number | undefined)[])[], grid: number): Uint8Array {
  const [width, height] = STARTUP_ICON_SIZE;
  const rows = under.map((row) => [...row]);
  if (rows.length !== height || rows.some((row) => row.length !== width)) {
    throw new Error(`the start up icon is drawn over ${width} by ${height} pixels`);
  }
  return encodeBitmap(iconOverRows(rows, 0, 0, width, height, icon, grid, WHITE));
}

/**
 * The one colour of `pixels` under every rectangle `[x, y, width, height]` and one pixel around it, which is
 * what a box drawn there is smoothed against; refused where the screen is not one colour there.
 */
export function colourBehind(
  pixels: readonly (readonly (number | undefined)[])[], boxes: readonly (readonly [number, number, number, number])[],
): number {
  const seen = new Set<number | undefined>();
  for (const [x, y, width, height] of boxes) {
    for (let row = y - 1; row <= y + height; row += 1) {
      for (let column = x - 1; column <= x + width; column += 1) {
        if (row >= y && row < y + height && column >= x + CORNER_RADIUS && column < x + width - CORNER_RADIUS) continue;
        seen.add(pixels[row]?.[column]);
      }
    }
  }
  const only = [...seen][0];
  if (seen.size !== 1 || only === undefined) {
    throw new Error(`the screen behind the boxes is ${seen.size} colours, not one, so their corners have nothing to be smoothed against`);
  }
  return only;
}

/** The one colour of `pixels` everywhere inside the rectangles `[x, y, width, height]`, or a refusal. */
export function colourUnder(
  pixels: readonly (readonly (number | undefined)[])[], areas: readonly (readonly [number, number, number, number])[],
): number {
  const seen = new Set<number | undefined>();
  for (const [x, y, width, height] of areas) {
    for (let row = y; row < y + height; row += 1) for (let column = x; column < x + width; column += 1) seen.add(pixels[row]?.[column]);
  }
  const only = [...seen][0];
  if (seen.size !== 1 || only === undefined) {
    throw new Error(`the screen under the text is ${seen.size} colours, not one, so its letters have nothing to be smoothed against`);
  }
  return only;
}

/** The face every activity row of the compiles draws its label in, 64 of 64, findings section 399. */
export const ACTIVITY_ROW_FACE = 'One15';

/**
 * The weight a text on one of our boxes is lettered in when the blending step smooths it, `WeightFor`: the
 * labels on the activity and the device boxes in `labelWeight`, lighter than their face's own, and every other
 * text in its set's weight. Read off the colour under the text, which on a box of ours is its fill.
 */
export function touchLabelWeight(choices: TouchChoices): WeightFor {
  const fills = new Set([colour565(choices.activityBox.fill), colour565(choices.deviceBox.fill)]);
  return (_face, background) => (fills.has(background) ? choices.labelWeight : undefined);
}

/** The icon an activity of `type` wears, by the family's choices. */
export function activityIconOf(choices: TouchChoices, type: string | undefined): string {
  return (type === undefined ? undefined : choices.activityIcons[type]) ?? choices.otherActivityIcon;
}
