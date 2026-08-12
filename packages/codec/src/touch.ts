/**
 * The Harmony One's touch panel: which region of the screen a key code stands for.
 *
 * Base slot 17 holds the hit map, a page of rectangles per screen, and `tables.ts` reads it. What this
 * module adds is the two things a caller needs to use it: **which** page belongs to which screen, and
 * how a rectangle in the panel's own coordinates relates to a pixel on the display.
 *
 * `docs/findings.md` sections 45 and 125.
 */
import { Container } from './gspm.ts';
import { touchPages } from './tables.ts';
import type { TouchArea, TouchPage } from './tables.ts';
import type { ModePage } from './sections.ts';

/**
 * The panel reports thirteen bit coordinates and the display is 176 by 220 pixels, so the two spaces
 * are related by an affine map per axis. The y half is measured; the x half is not, and the difference
 * is stated rather than smoothed over.
 *
 * **The y axis is inverted and its scale is arithmetic rather than fitted.** A list page's rows are
 * `LIST_ROW_PITCH` panel units apart and the text rows the screen program draws are
 * `SCREEN_ROW_PITCH` pixels apart, and those two pitches are the same distance measured twice, so the
 * scale is their ratio exactly. Only the offset is free, and 233 of 235 paired rows put it within 81
 * panel units of `PANEL_TOP`, which is five pixels. The two that do not are one page.
 *
 * **The x axis rests on one reading**: codes 46 and 47 are a tall strip on every page of both configs,
 * one at each side, and the display is taken to span the gap between their inner edges. Containment
 * barely constrains it, since almost every rectangle is full width, so a wrong x scale would not show
 * up as a label falling outside its region. What saves this from mattering is that no activity label
 * depends on it: every one of them sits on a full width row, and `packages/codec/test/touch.test.ts`
 * asserts that ignoring x entirely names the same activities.
 */
export const SCREEN_WIDTH = 176;
export const SCREEN_HEIGHT = 220;
/** The panel y of pixel row 0, so `panel = PANEL_TOP - pitch * pixel`. */
export const PANEL_TOP = 4356;
/** One list row, in panel units and in pixels. Their ratio is the y scale. */
export const LIST_ROW_PITCH = 872;
export const SCREEN_ROW_PITCH = 54;
/** The inner edges of the two edge strips, which is where the display is taken to start and end. */
export const PANEL_LEFT = 1257;
export const PANEL_RIGHT = 3556;
/** The codes of those two strips. They are on every page and they select nothing on the screen. */
export const EDGE_CODES: readonly number[] = [46, 47];

/** A pixel on the display, in the coordinates the panel reports. */
export function panelPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: PANEL_LEFT + ((PANEL_RIGHT - PANEL_LEFT) / SCREEN_WIDTH) * x,
    y: PANEL_TOP - (LIST_ROW_PITCH / SCREEN_ROW_PITCH) * y,
  };
}

/** The reverse, for drawing a hit region on a picture of the screen. */
export function pixelPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: ((x - PANEL_LEFT) * SCREEN_WIDTH) / (PANEL_RIGHT - PANEL_LEFT),
    y: ((PANEL_TOP - y) * SCREEN_ROW_PITCH) / LIST_ROW_PITCH,
  };
}

/**
 * Which key code a touch at a pixel reports, or undefined where no region covers it.
 *
 * **The firmware's own rule**: walk the page in the order the container stores it and return the first
 * rectangle containing the point, with the test half open on both axes. That is not a detail. 104
 * pairs of rectangles on one page overlap across the corpus, so a caller that took the smallest or the
 * last would disagree with the remote on exactly those pairs. Section 45 read the loop at `0x25E5A`.
 */
export function touchOwner(
  areas: readonly TouchArea[],
  x: number,
  y: number,
  ignoreX = false,
): TouchArea | undefined {
  const p = panelPoint(x, y);
  return areas.find(
    (a) =>
      (ignoreX || (p.x >= a.x && p.x < a.x + a.width)) && p.y >= a.y && p.y < a.y + a.height,
  );
}

/**
 * The hit map page a mode page uses, which is what the arch 12 byte in front of the page's pointers
 * says. Section 125.
 *
 * That byte had been sitting in `ModePage.lead` unread since section 66. It is a plain zero based
 * index into base slot 17's page array: its values are exactly `0` to `pages - 1` with no gaps in
 * either config, 42 of 42 and 32 of 32, and the closure is that a page never binds a key code its
 * indexed hit page does not offer, on 268 and 104 pages, where shifting the index by anything at all
 * breaks between 54 and 227 of them.
 */
export function touchPageOf(c: Container, page: ModePage): TouchPage | undefined {
  if (page.lead === undefined) return undefined;
  const pages = touchPages(c)?.records;
  if (pages === undefined || page.lead >= pages.length) return undefined;
  return pages[page.lead];
}
