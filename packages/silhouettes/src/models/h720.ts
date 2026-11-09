/**
 * The Harmony 720, skin 44, architecture 8.
 *
 * **Measured off a photograph, the second model after the Harmony 885.** No traced drawing of this face exists
 * and its user manual's picture of it, page 7 of `Docs/720 manual.pdf`, is an embedded JPEG 215 pixels wide,
 * so there is no vector to take. Every shape, word and symbol here is read off the product photograph in the
 * lab, `reference/forum-images/720-full.jpg`, 244 by 1000 pixels, with the manual's picture and its legend as a
 * second view of the same face. Neither leaves the lab.
 *
 * **Its own face, not the 885's.** A slab with straight sides and a shallow crown, where the 880 and 885 are a
 * bone: a glossy black panel from the power key down to the direction pad, the screen in it with three keys on
 * each side, two keys on one bar under Activities, four rows of keys under the screen, a silver U round the pad
 * that carries volume, channel, Mute and Prev, and a brushed lower half with eight transport keys and twelve
 * digits. 49 keys, which is the 49 press codes its configuration's key table holds.
 *
 * **Every number below is a reading in that photograph's own pixels**, and the helpers move it into this
 * package's coordinates. A pixel's left and top edges are its index. Edges were read where the grey crosses
 * the background's, along rows and columns averaged over three, `../lab/work/silhouettes/h720/`; a key's edge
 * on the black panel is where its face rises out of the black, and on the brushed half where its dark rim
 * ends. A photograph this size is good to about a pixel, and a pixel is a unit here.
 *
 * **The face is drawn symmetric about its own centre line**, 121.45 + 0.0005 y, which the pairs of keys centre
 * on within half a pixel from the Activities key to the digits, and the case is mirrored about it, as every
 * case here is. Where a pair was read on both sides it is drawn at the mean, mirrored. **The photograph shows
 * the right hand silver rail wider than the left**, 16 pixels against 9, from the light on its inner bevel, and
 * the left hand reading is the one drawn, since the outer edges of the two agree.
 *
 * **Every key is level.** The edges of the keys run along rows and columns of the photograph within a pixel
 * over their length, so every `angle` is 0, as on a traced model.
 *
 * **Names.** Logitech's vocabulary where the key is one of theirs, the marking otherwise, and the 885's name
 * where the key does the 885's job: the power key is `AllOff`, the key printed `Devices` is `Device`, the
 * three keys each side of the screen are `ScreenLeft1` to `3` and `ScreenRight1` to `3`, top to bottom, the
 * bar under the screen `ScreenPrev` and `ScreenNext`, the bar printed with a down and an up chevron
 * `DownArrow` and `UpArrow`, and the keys printed `* clear` and `# enter` are `Clear` and `Enter`.
 *
 * **No key carries a code.** One configuration of a Harmony 720 is known, compiled by Logitech for one
 * contributor, which under `tests/harmony_880_885/test_harmony_880_keys.py`'s rule names no key, and no 720 has been pressed.
 * The key page's learning mode is how these get codes.
 *
 * **Left out**: the Logitech logo at the foot, which is the artwork the skill keeps out, the brushed texture
 * and the screen's contents.
 */
import { contour, ellipse, poly, rounded, roundRect } from '../shapes.ts';
import { FONT_SIZE } from '../svg.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Label, Model, Region, Rocker, Shape } from '../types.ts';

/**
 * The case's half width per row of the photograph. The crown and the foot are nearly level, so a row
 * crosses them at a slant and says little there: those samples are read the other way, the top and the bottom
 * edge found per column, both sides averaged, which gives each row its half width. The crown has a raised
 * window across its middle, rows 2.5 to 4.5 between 34.5 pixels either side of the centre, and the silver
 * rails meet it a little lower than the black panel does, which is the step at rows 12 to 15. The sides are
 * read every 25 rows, row by row in between at the ends.
 */
const SAMPLES: readonly [number, number][] = [
  [2.5, 10], [2.6, 16], [2.75, 22], [3, 27], [3.25, 31], [4.5, 34.5], [6.07, 37.5], [6.32, 43.5], [6.78, 49.5],
  [7.33, 55.5], [7.7, 61.5], [8.36, 67.5], [9, 73.5], [9.6, 79.5], [10.4, 85.5], [11.3, 91.5], [11.96, 94.5],
  [13, 97.9], [14, 101], [15, 109.2], [16, 113.7], [17, 116.2], [18, 116.8], [19, 117.2], [20, 117.4],
  [25, 117.64], [30, 117.7], [40, 117.79], [50, 117.8], [75, 117.91], [100, 118.01], [150, 117.96],
  [200, 118.04], [250, 118.07], [300, 118.13], [350, 118.21], [400, 118.38], [450, 118.42], [500, 118.53],
  [550, 118.59], [600, 118.63], [650, 118.65], [700, 118.67], [750, 118.72], [800, 118.73], [850, 118.78],
  [900, 118.77], [925, 118.79], [930, 118.77], [935, 118.47], [940, 118.26], [945, 118.12], [950, 117.65],
  [955, 117.18], [960, 116.57], [965, 115.51], [970, 113.76], [973, 112.47], [976, 110.6], [978, 108.96],
  [980, 106.87], [982, 104.15], [984, 100.51], [985.4, 97.5], [986.3, 94.5], [987.2, 91.5], [988.3, 85.5],
  [989.3, 79.5], [990.1, 73.5], [990.75, 67.5], [991.3, 61.5], [991.8, 55.5], [992, 49.5], [992.9, 43.5],
  [993.3, 37.5], [993.6, 31.5], [993.8, 25.5], [994.07, 19.5], [994.3, 13.5], [994.45, 7.5],
];

// ---------------------------------------------------------------------------------------------------------
// From the photograph's pixels to this package's units.
// ---------------------------------------------------------------------------------------------------------

/** The case's first and last sample rows are 0 and 1000. */
const TOP = SAMPLES[0]![0];
const K = CASE_HEIGHT / (SAMPLES[SAMPLES.length - 1]![0] - TOP);
/** The face's centre line, fitted through the midpoints of the pairs of keys, the module comment. */
const face = (y: number): number => 121.45 + 0.0005 * y;
const WIDTH = 2 * Math.max(...SAMPLES.map(([, h]) => h)) * K;
const X = (x: number, y: number): number => WIDTH / 2 + (x - face(y)) * K;
const Y = (y: number): number => (y - TOP) * K;
/** The same point on the other side of the face, in the photograph's pixels. */
const across = (x: number, y: number): number => 2 * face(y) - x;

type Pt = readonly [number, number] | readonly [number, number, number];

/** An outline through points read off the photograph, `rounded` in this package's units. */
function outline(points: readonly Pt[], r: number): Shape {
  return rounded(points.map((p) => (p.length === 3
    ? [X(p[0], p[1]), Y(p[1]), p[2] * K] as const
    : [X(p[0], p[1]), Y(p[1])] as const)), r * K);
}
const mirrored = (points: readonly Pt[]): Pt[] =>
  points.map((p) => (p.length === 3 ? [across(p[0], p[1]), p[1], p[2]] : [across(p[0], p[1]), p[1]]));

/**
 * A key standing level, from how far its two sides are from the face's centre line and its top and bottom
 * rows: `side` -1 for the key on the left of a pair, 1 for its mirror, 0 for a key centred on the face, where
 * `inner` is then its half width and `outer` is ignored.
 */
function level(inner: number, outer: number, top: number, bottom: number, r: number, side: -1 | 0 | 1): Shape {
  const mid = face((top + bottom) / 2);
  const [x0, x1] = side === 0 ? [mid - inner, mid + inner]
    : side < 0 ? [mid - outer, mid - inner] : [mid + inner, mid + outer];
  return roundRect(X(x0, (top + bottom) / 2), Y(top), (x1 - x0) * K, (bottom - top) * K, r * K);
}

/** A printed word centred where it was read, its anchor the baseline a third of the size below. */
function word(text: string, x: number, y: number, size: keyof typeof FONT_SIZE): Label & { x: number; y: number } {
  return { text, place: 'on', size, x: X(x, y), y: Y(y) + FONT_SIZE[size] * 0.35 };
}

/** Where a symbol sits and how wide it is, both read off the photograph. */
const mark = (x: number, y: number, width: number) => ({ markAt: { x: X(x, y), y: Y(y) }, markSize: width * K });

const fmt = (v: number): string => String(Math.round(v * 1000) / 1000);
/** A straight seam between two points read off the photograph. */
const seam = (x0: number, y0: number, x1: number, y1: number): string =>
  `M ${fmt(X(x0, y0))} ${fmt(Y(y0))} L ${fmt(X(x1, y1))} ${fmt(Y(y1))}`;
/** A region of a moulding, the points in the photograph's pixels, and its mirror. */
const region = (points: readonly (readonly [number, number])[]): Shape =>
  poly(points.map(([x, y]) => [X(x, y), Y(y)] as [number, number]));
const regionRight = (points: readonly (readonly [number, number])[]): Shape =>
  poly(points.map(([x, y]) => [WIDTH - X(x, y), Y(y)] as [number, number]));
const mid = (y: number): readonly [number, number] => [face(y), y];

// ---------------------------------------------------------------------------------------------------------
// The readings.
// ---------------------------------------------------------------------------------------------------------

/**
 * The silver rail down each side, 17.5 to 26.5 on the left from the crown to row 483, where it widens into
 * the U round the pad. Not a key; drawn because it is most of what the side of this remote looks like. It
 * starts at row 15, where the rails meet the crown, the step in `SAMPLES`: started at row 10 its top corners
 * stood 4 units outside the case, which the containment test in `test/models.test.ts` caught.
 */
const RAIL: readonly Pt[] = [[17.5, 15, 1], [26.5, 15, 1], [26.5, 483, 1], [17.5, 483, 1]];

/**
 * The bulge on each rail that carries the three keys beside the screen: the rail's inner edge steps out from
 * 26.5 to 32.5 between rows 207 and 219 and back between 332 and 345, read every five rows. One silver part
 * with no parting line on the photograph, so one moulding with three segments, cut halfway between the slots
 * printed on it, which sit at rows 233.5, 277.25 and 316 (231.5, 276.5 and 317.5 on the left, 235.5, 278 and
 * 314.5 on the right), 98.75 pixels from the centre line, each 9 pixels tall.
 */
const BULGE: readonly Pt[] = [[17.5, 205, 1], [26.5, 205, 2], [32.5, 219, 6], [32.5, 332, 6], [26.5, 345, 2],
  [17.5, 345, 1]];
const SLOTS = [233.5, 277.25, 316] as const;
const SLOT_OFF = 98.75;
const CUTS = [255.4, 296.6] as const;

/**
 * The black panel: from the parting line at row 47.5 that the power key sits on, down the rails' inner edges
 * and the bulges, and on down the inner edge of the U to the top of the bar under the pad at 623.5.
 */
const PANEL: readonly Pt[] = [
  [26.5, 47.5, 2], [26.5, 205], [32.5, 219, 6], [32.5, 332, 6], [26.5, 345], [26.5, 483, 2], [45.5, 509, 3],
  [45.5, 623.5, 10],
];

/**
 * The silver U round the pad: down the left side at 17.5 from row 483, where the rail widens into it, across
 * the bottom at 650.5 and up the right, its inner edge widening from 26.5 at row 483 to 45.5 at row 509 and
 * coming down to the bar's top at 623.5. Its outer bottom corners are cut off, from 17.5 at row 626 to 36 at
 * the bottom edge, where a chrome corner piece sits.
 */
const U_OUTER: readonly Pt[] = [[17.5, 483, 1], [17.5, 626, 4], [36, 650.5, 4]];
const U_INNER: readonly Pt[] = [[26.5, 483, 1], [45.5, 509, 3], [45.5, 623.5, 10]];
function uMoulding(): string {
  return outline([...U_OUTER, ...mirrored(U_OUTER).reverse(), ...mirrored(U_INNER), ...[...U_INNER].reverse()], 30).path;
}

/**
 * Where the U is cut between its six keys. Volume up and down part at row 559, where the photograph shows a
 * line across the strip, the same on the channel side at 558; volume down and Mute along the chrome corner
 * piece, a line at 45 degrees from the inner corner at (45.5, 613) out to the edge; and Mute and Prev on the
 * centre line, where the photograph shows a parting line at 122. The corner's seam runs from the inner corner
 * to where that line meets the cut off outer corner, (24, 634.5).
 */
const VOL_CUT = 559;
const corner = (x: number): number => 613 + (45.5 - x);
const U_SEGMENTS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  VolumeUp: [[0, 470], [80, 470], [80, VOL_CUT], [0, VOL_CUT]],
  VolumeDown: [[0, VOL_CUT], [80, VOL_CUT], [80, corner(80)], [0, corner(0)]],
  VolumeMute: [[0, corner(0)], [80, corner(80)], mid(corner(80)), mid(670), [0, 670]],
};
const U_SEAMS = [
  seam(17.5, VOL_CUT, 45.5, VOL_CUT), seam(across(17.5, VOL_CUT), VOL_CUT, across(45.5, VOL_CUT), VOL_CUT),
  seam(45.5, corner(45.5), 24, corner(24)),
  seam(across(45.5, corner(45.5)), corner(45.5), across(24, corner(24)), corner(24)),
  seam(face(623.5), 623.5, face(650.5), 650.5),
];

/**
 * The direction pad, a silver square with rounded corners from 63.5 to 179.5 and rows 515 to 601.5, and OK
 * in it, 36 by 30 from row 543.5. Four segments as triangles from the pad's centre through its corners, as on
 * the 885.
 */
const PAD = { half: 58, top: 515, bottom: 601.5, r: 10 };
const OK = { half: 18, top: 543.5, bottom: 573.5, r: 4 };
const PAD_Y = (PAD.top + PAD.bottom) / 2;

/**
 * The three bars and the four keys under the screen, each 75 pixels either side of the centre line at its
 * ends, the single keys' inner ends 7.5 from it: rows 368 to 386, 401.5 to 419.5, 434.5 to 452.5 and 468.5 to
 * 486.5. The bar under Activities is 104.5 to 121.5. Each bar shows a parting line on the centre line and is one
 * moulding with two segments.
 */
const BAR = { outer: 75, inner: 7.5, r: 3 };
const ROWS = { devices: [104.5, 121.5], page: [368, 386], guide: [401.5, 419.5], exit: [434.5, 452.5],
  chevrons: [468.5, 486.5] } as const;
function bar(top: number, bottom: number): string {
  return level(BAR.outer, 0, top, bottom, BAR.r, 0).path;
}
const halfLeft = (top: number, bottom: number): Shape =>
  region([[0, top - 5], mid(top - 5), mid(bottom + 5), [0, bottom + 5]]);
const halfRight = (top: number, bottom: number): Shape =>
  regionRight([[0, top - 5], mid(top - 5), mid(bottom + 5), [0, bottom + 5]]);

/**
 * The transport keys and the digits, by their sides' distance from the centre line, the mean of the pair:
 * Stop and Play 63.5 to 96.5 (63.3 to 96.8 and 63.7 to 96.2), Replay and Skip 10 to 44 (10.3 to 44.8 and 9.7
 * to 43.2), rows 678 to 695.5 and 711 to 728.5; the digits' outer columns 40.75 to 84.25 (40.4 to 84.4 and 41.1
 * to 84.1), the middle one 21.75 either side, rows 759 to 776.25, 792.5 to 809.5, 825.75 to 843.25 and 859 to
 * 876.75.
 */
const TRANSPORT = { outer: [63.5, 96.5], inner: [10, 44], rows: [[678, 695.5], [711, 728.5]], r: 6 } as const;
const DIGITS = { outer: [40.75, 84.25], middle: 21.75,
  rows: [[759, 776.25], [792.5, 809.5], [825.75, 843.25], [859, 876.75]], r: 5 } as const;

/** The screen's glass, rows 183 to 351.5, 144 pixels across. */
const GLASS = { top: 183, bottom: 351.5 };

// ---------------------------------------------------------------------------------------------------------
// The keys.
// ---------------------------------------------------------------------------------------------------------

const keypad = 'keypad' as const;
const screen = 'screen' as const;

const PAD_C = { x: X(face(PAD_Y), PAD_Y), y: Y(PAD_Y) };
const padWedge = (a: readonly [number, number], b: readonly [number, number]): Shape => {
  const [rx, ry] = [PAD.half * K * 1.6, ((PAD.bottom - PAD.top) / 2) * K * 1.6];
  return poly([[PAD_C.x, PAD_C.y], [PAD_C.x + a[0] * rx, PAD_C.y + a[1] * ry], [PAD_C.x + b[0] * rx, PAD_C.y + b[1] * ry]]);
};

/** A key of the transport block or the digits, `side` as for `level`, its row `[top, bottom]`. */
const tKey = (cols: readonly [number, number], side: -1 | 1, row: readonly [number, number]): Shape =>
  level(cols[0], cols[1], row[0], row[1], TRANSPORT.r, side);
const dKey = (cols: readonly [number, number], side: -1 | 1, row: readonly [number, number]): Shape =>
  level(cols[0], cols[1], row[0], row[1], DIGITS.r, side);
const dMid = (row: readonly [number, number]): Shape => level(DIGITS.middle, 0, row[0], row[1], DIGITS.r, 0);
const [R1, R2] = TRANSPORT.rows;
const [N1, N2, N3, N4] = DIGITS.rows;

/** The bulge's three segments on the left, and their mirrors. */
const bulgeCut = (i: number): readonly (readonly [number, number])[] => {
  const from = i === 0 ? 190 : CUTS[i - 1]!;
  const to = i === 2 ? 360 : CUTS[i]!;
  return [[0, from], [60, from], [60, to], [0, to]];
};

const KEYS: readonly Key[] = [
  // The crown. The power key is a round button in a chrome ring, 24.5 pixels across, centred on the parting
  // line at (48.75, 47.75); its mark 10 across.
  { name: 'AllOff', src: 'printed', kind: keypad, shape: ellipse(X(48.75, 47.75), Y(47.75), 12.25 * K, 12.25 * K),
    angle: 0, icon: 'power', ...mark(48.75, 47.5, 10) },
  // Activities, silver, 46 either side of the centre line, rows 68.5 to 85.5, in its lit ring; the word is
  // printed 2.5 pixels right of the key's centre, and drawn there.
  { name: 'Activities', src: 'printed', kind: keypad, shape: level(46, 0, 68.5, 85.5, 3, 0), angle: 0,
    labels: [word('Activities', 124, 76.5, 'small')] },
  { name: 'Device', src: 'printed', kind: keypad, shape: halfLeft(...ROWS.devices), angle: 0,
    labels: [word('Devices', 84.5, 112, 'small')] },
  { name: 'Help', src: 'printed', kind: keypad, shape: halfRight(...ROWS.devices), angle: 0,
    labels: [word('Help', 165, 113, 'small')] },
  // The screen keys, each with its slot. Zones in reading order, left then right on each row, as on the 885.
  ...SLOTS.flatMap((y, i): Key[] => [
    { name: `ScreenLeft${i + 1}`, src: 'printed', kind: screen, shape: region(bulgeCut(i)), angle: 0,
      icon: 'dashVertical', ...mark(face(y) - SLOT_OFF, y, 9), zone: 2 * i + 1 },
    { name: `ScreenRight${i + 1}`, src: 'printed', kind: screen, shape: regionRight(bulgeCut(i)), angle: 0,
      icon: 'dashVertical', ...mark(face(y) + SLOT_OFF, y, 9), zone: 2 * i + 2 },
  ]),
  // The page bar under the screen. Each arrow mark is 19 pixels long, 44.5 from the centre line (44.1 and
  // 44.9 read), at row 377.5.
  { name: 'ScreenPrev', src: 'printed', kind: keypad, shape: halfLeft(...ROWS.page), angle: 0,
    icon: 'pageArrowLeft', ...mark(face(377.5) - 44.5, 377.5, 19) },
  { name: 'ScreenNext', src: 'printed', kind: keypad, shape: halfRight(...ROWS.page), angle: 0,
    icon: 'pageArrowRight', ...mark(face(377.5) + 44.5, 377.5, 19) },
  { name: 'Guide', src: 'printed', kind: keypad, shape: level(BAR.inner, BAR.outer, ...ROWS.guide, BAR.r, -1), angle: 0,
    labels: [word('Guide', 82, 410.5, 'small')] },
  { name: 'Info', src: 'printed', kind: keypad, shape: level(BAR.inner, BAR.outer, ...ROWS.guide, BAR.r, 1), angle: 0,
    labels: [word('Info', 168, 410.5, 'small')] },
  { name: 'Exit', src: 'printed', kind: keypad, shape: level(BAR.inner, BAR.outer, ...ROWS.exit, BAR.r, -1), angle: 0,
    labels: [word('Exit', 76, 444, 'small')] },
  { name: 'Menu', src: 'printed', kind: keypad, shape: level(BAR.inner, BAR.outer, ...ROWS.exit, BAR.r, 1), angle: 0,
    labels: [word('Menu', 164, 444, 'small')] },
  // The chevron bar: a down chevron on the left and an up chevron on the right, each 15 pixels across, 42
  // from the centre line (41.2 and 42.8 read), at row 478.
  { name: 'DownArrow', src: 'printed', kind: keypad, shape: halfLeft(...ROWS.chevrons), angle: 0,
    icon: 'chevronDown', ...mark(face(478) - 42, 478, 15) },
  { name: 'UpArrow', src: 'printed', kind: keypad, shape: halfRight(...ROWS.chevrons), angle: 0,
    icon: 'chevronUp', ...mark(face(478) + 42, 478, 15) },
  // The U. The plus and the minus are 9 pixels across, 93 from the centre line (92 and 94 read), at rows 528
  // and 594.5; `Mute` and `Prev` are printed on the bar where they were read.
  { name: 'VolumeUp', src: 'printed', kind: keypad, shape: region(U_SEGMENTS.VolumeUp!), angle: 0, icon: 'plus',
    ...mark(face(528) - 93, 528, 9) },
  { name: 'VolumeDown', src: 'printed', kind: keypad, shape: region(U_SEGMENTS.VolumeDown!), angle: 0, icon: 'minus',
    ...mark(face(594.5) - 93, 594.5, 9) },
  { name: 'VolumeMute', src: 'printed', kind: keypad, shape: region(U_SEGMENTS.VolumeMute!), angle: 0,
    labels: [word('Mute', 87, 639.5, 'small')] },
  { name: 'PrevChannel', src: 'printed', kind: keypad, shape: regionRight(U_SEGMENTS.VolumeMute!), angle: 0,
    labels: [word('Prev', 159, 639.5, 'small')] },
  { name: 'ChannelDown', src: 'printed', kind: keypad, shape: regionRight(U_SEGMENTS.VolumeDown!), angle: 0,
    icon: 'minus', ...mark(face(594.5) + 93, 594.5, 9) },
  { name: 'ChannelUp', src: 'printed', kind: keypad, shape: regionRight(U_SEGMENTS.VolumeUp!), angle: 0,
    icon: 'plus', ...mark(face(528) + 93, 528, 9) },
  // The pad's four triangles, 7.5 pixels across their longer side: up at row 533 and down at 585.5 on the
  // centre line, left and right 32.75 from it (32.7 and 34.3 read) at row 559.8.
  { name: 'DirectionUp', src: 'printed', kind: keypad, shape: padWedge([-1, -1], [1, -1]), angle: 0,
    icon: 'triangleUp', ...mark(face(533), 533, 7.5) },
  { name: 'DirectionRight', src: 'printed', kind: keypad, shape: padWedge([1, -1], [1, 1]), angle: 0,
    icon: 'triangleRight', ...mark(face(559.8) + 33.5, 559.8, 7.5) },
  { name: 'DirectionDown', src: 'printed', kind: keypad, shape: padWedge([1, 1], [-1, 1]), angle: 0,
    icon: 'triangleDown', ...mark(face(585.5), 585.5, 7.5) },
  { name: 'DirectionLeft', src: 'printed', kind: keypad, shape: padWedge([-1, 1], [-1, -1]), angle: 0,
    icon: 'triangleLeft', ...mark(face(559.8) - 33.5, 559.8, 7.5) },
  { name: 'Select', src: 'printed', kind: keypad, shape: level(OK.half, 0, OK.top, OK.bottom, OK.r, 0), angle: 0,
    labels: [word('OK', face(559), 559, 'normal')] },
  // The transport block: a mark on each key and its word printed under it, both drawn at the mean of their
  // pair, 81 and 27 pixels from the centre line for the marks and 80.75 and 27 for the words (80.3 and 81.7,
  // 25.8 and 28.2 read for the marks). The marks are 7, 12, 12 and 8 pixels across their longer side on the
  // top row, and 7, 10, 10 and 7 on the second; the words' rows are 702.25 and 735.
  { name: 'Stop', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.outer, -1, R1), angle: 0, icon: 'stop',
    ...mark(face(686.5) - 81, 686.5, 7), labels: [word('Stop', face(702.25) - 80.75, 702.25, 'tiny')] },
  { name: 'SkipBack', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.inner, -1, R1), angle: 0, icon: 'skipBack',
    ...mark(face(687) - 27, 687, 12), labels: [word('Replay', face(702.25) - 27, 702.25, 'tiny')] },
  { name: 'SkipForward', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.inner, 1, R1), angle: 0,
    icon: 'skipForward', ...mark(face(687) + 27, 687, 12),
    labels: [word('Skip', face(702.25) + 27, 702.25, 'tiny')] },
  { name: 'Play', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.outer, 1, R1), angle: 0, icon: 'play',
    ...mark(face(687) + 81, 687, 8), labels: [word('Play', face(702.25) + 80.75, 702.25, 'tiny')] },
  { name: 'Record', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.outer, -1, R2), angle: 0, icon: 'record',
    ...mark(face(720.5) - 81, 720.5, 7), labels: [word('Rec', face(735) - 80.75, 735, 'tiny')] },
  { name: 'Rewind', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.inner, -1, R2), angle: 0, icon: 'rewind',
    ...mark(face(720.5) - 27, 720.5, 10), labels: [word('Rew', face(735) - 27, 735, 'tiny')] },
  { name: 'FastForward', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.inner, 1, R2), angle: 0, icon: 'forward',
    ...mark(face(720.5) + 27, 720.5, 10), labels: [word('Fwd', face(735) + 27, 735, 'tiny')] },
  { name: 'Pause', src: 'printed', kind: keypad, shape: tKey(TRANSPORT.outer, 1, R2), angle: 0, icon: 'pause',
    ...mark(face(720.5) + 81, 720.5, 7), labels: [word('Pause', face(735) + 80.75, 735, 'tiny')] },
  // The digits: the numeral and its letters where each is printed, the numeral about 10 pixels left of its
  // key's centre and the letters after it.
  { name: 'Number1', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, -1, N1), angle: 0,
    labels: [word('1', 49, 768.25, 'normal')] },
  { name: 'Number2', src: 'printed', kind: keypad, shape: dMid(N1), angle: 0,
    labels: [word('2', 112.5, 768.25, 'normal'), word('abc', 130, 768, 'small')] },
  { name: 'Number3', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, 1, N1), angle: 0,
    labels: [word('3', 174.5, 768.25, 'normal'), word('def', 188, 768, 'small')] },
  { name: 'Number4', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, -1, N2), angle: 0,
    labels: [word('4', 49.5, 801.75, 'normal'), word('ghi', 62.5, 802, 'small')] },
  { name: 'Number5', src: 'printed', kind: keypad, shape: dMid(N2), angle: 0,
    labels: [word('5', 112.5, 801.75, 'normal'), word('jkl', 133.5, 802, 'small')] },
  { name: 'Number6', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, 1, N2), angle: 0,
    labels: [word('6', 174.5, 801.75, 'normal'), word('mno', 190, 802, 'small')] },
  { name: 'Number7', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, -1, N3), angle: 0,
    labels: [word('7', 49.5, 835, 'normal'), word('pqrs', 65.5, 836, 'small')] },
  { name: 'Number8', src: 'printed', kind: keypad, shape: dMid(N3), angle: 0,
    labels: [word('8', 112.5, 835, 'normal'), word('tuv', 131.5, 835, 'small')] },
  { name: 'Number9', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, 1, N3), angle: 0,
    labels: [word('9', 174.5, 835, 'normal'), word('wxyz', 191.5, 836, 'small')] },
  // `*` and `clear`, `#` and `enter`, all at the letters' size, which is what they are printed at.
  { name: 'Clear', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, -1, N4), angle: 0,
    labels: [word('*', 51, 868.5, 'small'), word('clear', 66.5, 868, 'small')] },
  // The space mark after the 0 is 11 pixels across.
  { name: 'Number0', src: 'printed', kind: keypad, shape: dMid(N4), angle: 0, icon: 'space', ...mark(132.5, 869, 11),
    labels: [word('0', 113, 868.5, 'normal')] },
  { name: 'Enter', src: 'printed', kind: keypad, shape: dKey(DIGITS.outer, 1, N4), angle: 0,
    labels: [word('#', 175.5, 869, 'small'), word('enter', 192, 868.5, 'small')] },
];

const REGIONS: readonly Region[] = [
  { id: 'rail-left', form: 'seam', path: outline(RAIL, 30).path },
  { id: 'rail-right', form: 'seam', path: outline(mirrored(RAIL), 30).path },
  { id: 'screen-bezel', form: 'recess', path: outline([...PANEL, ...mirrored(PANEL).reverse()], 30).path },
  // The lit ring round Activities, 52 pixels either side of the centre line, rows 62.5 to 91.5.
  { id: 'activities-ring', form: 'seam', path: level(52, 0, 62.5, 91.5, 7, 0).path },
];

const ROCKERS: readonly Rocker[] = [
  { id: 'rocker-devices', keys: ['Device', 'Help'], seams: [seam(face(104.5), 104.5, face(121.5), 121.5)],
    path: bar(...ROWS.devices) },
  { id: 'rocker-screen-left', keys: ['ScreenLeft1', 'ScreenLeft2', 'ScreenLeft3'], path: outline(BULGE, 30).path },
  { id: 'rocker-screen-right', keys: ['ScreenRight1', 'ScreenRight2', 'ScreenRight3'],
    path: outline(mirrored(BULGE), 30).path },
  { id: 'rocker-page', keys: ['ScreenPrev', 'ScreenNext'], seams: [seam(face(368), 368, face(386), 386)],
    path: bar(...ROWS.page) },
  { id: 'rocker-chevrons', keys: ['DownArrow', 'UpArrow'], seams: [seam(face(468.5), 468.5, face(486.5), 486.5)],
    path: bar(...ROWS.chevrons) },
  {
    id: 'rocker-u',
    keys: ['VolumeUp', 'VolumeDown', 'VolumeMute', 'PrevChannel', 'ChannelDown', 'ChannelUp'],
    seams: U_SEAMS,
    // `Vol.` and `Ch.` between the plus and the minus, at row 567.5, where they were read.
    labels: [word('Vol.', 30, 567.5, 'small'), word('Ch.', 217, 567.5, 'small')],
    path: uMoulding(),
  },
  {
    id: 'rocker-pad',
    keys: ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft'],
    path: level(PAD.half, 0, PAD.top, PAD.bottom, PAD.r, 0).path,
  },
];

/**
 * The glass, 144 by 168.5 pixels where the photograph's screen begins, which is 0.855 across its height:
 * arch 8's raster is 128 by 160, 0.8, and every picture in the 720's configuration fits 128 by 160, so the
 * rectangle is drawn on the measured height at the raster's proportion, on the face's centre line.
 */
const GLASS_H = GLASS.bottom - GLASS.top;

export const H720: Model = {
  id: 'h720',
  label: 'Harmony 720',
  skins: [44],
  architecture: 8,
  source: 'photograph',
  width: WIDTH,
  height: CASE_HEIGHT,
  case: contour(WIDTH / 2, SAMPLES, CASE_HEIGHT),
  regions: REGIONS,
  rockers: ROCKERS,
  screen: {
    x: WIDTH / 2 - (GLASS_H * 0.8 * K) / 2, y: Y(GLASS.top), w: GLASS_H * 0.8 * K, h: GLASS_H * K,
    pixels: { width: 128, height: 160 }, touch: false,
  },
  keys: KEYS,
  // `Harmony 720`, in italics on the product, centred at (121, 157), 64 pixels across.
  nameplate: word('Harmony 720', 121, 157, 'small'),
};
