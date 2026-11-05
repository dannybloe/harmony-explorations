/**
 * The Harmony 885, skin 17, architecture 8.
 *
 * **The first model measured off a photograph.** No traced drawing of this face exists and the user
 * manual's picture of it is an embedded JPEG 256 pixels wide, so there is no vector to take. Every shape,
 * word and symbol here is read off the product photograph in the lab, `reference/forum-images/885-full.jpg`,
 * 235 by 812 pixels, with the manual's picture, page 6 of `Docs/885 manual.pdf`, as a second view of the
 * same face for the markings. Neither leaves the lab.
 *
 * **Every number below is a reading in that photograph's own pixels**, and the helpers at the top move it
 * into this package's coordinates. A pixel's left and top edges are its index, so the photograph runs 0 to
 * 235 across and 0 to 812 down, which is how a reading off a grid laid over an enlargement comes out; a
 * crossing interpolated between pixel centres was moved half a pixel to match. A photograph this size is
 * good to about a pixel, which is a unit and a quarter here, and that is the precision every shape has.
 *
 * **The face is drawn symmetric about its own centre line.** The case's two edges centre on a line that
 * drifts from 118.4 at the crown to 117.0 in the keypad, the camera's, while the pairs of keys centre on
 * 119.5 - 0.0018 y within about half a pixel all the way down, the Off key at the crown and the d-pad, the
 * Menu row, the transport block and the digits included; the side wall shows a little more on one side. So
 * keys are placed against the face's line, `face` below, and the case is mirrored about it, as every case
 * here is. Where a pair was read on both sides, `pair` averages the left reading with the right one
 * mirrored and draws both from the mean; where only the left was read, the right is its mirror, which the
 * lab overlay checks against the photograph.
 *
 * **The tilt is read per key, off the key's own edge.** The keys beside the screen and the two edge keys
 * below them are rectangles standing on end and leaning with the case: each carries its `angle`, read off
 * whichever long edge of that key the photograph shows cleanly, its outer edge on the left side and its
 * inner edge on the right, where the lit rim swallows the outer one. The other keys are not rectangles at
 * all, so their tilt is in their corners: `rounded` joins the corners read off the photograph, and a word
 * printed at an angle on one of them turns by itself, `Label.rotate`.
 *
 * **The band round the direction pad is one outline with eight segments**, the volume rocker, the four
 * colour keys and the channel rocker, the way the Harmony 525's band is drawn: the photograph shows one
 * continuous silver part with a parting line between each colour key and its neighbours and none between
 * the two ends of a rocker. The seams are drawn where the photograph shows them.
 *
 * **The scan codes are the bench's**, `MEASURED` in `tests/test_harmony_885_keys.py`: every key pressed on a
 * Harmony 885 with the remote's data memory watched over USB, `todo-prepare-885.md` 2.4, the colour keys
 * and Play and Pause settled by their position. `CODES` below is that table under this drawing's names, and
 * `tests/test_silhouettes.py` holds the two against each other. Every key is `printed`: no code was named
 * through Logitech's button maps.
 *
 * **Names.** Logitech's vocabulary where the key is one of theirs, the marking otherwise, as on the other
 * models. Three choices. The key printed `OFF` is `AllOff`, as on the Harmony 525 and 600, since the manual
 * says it turns every device off; the keys page's table calls it Power. The key printed `+` over `CLEAR` is
 * `Clear`, as on the Harmony 350, since `NumberPlus` is the name the One's code earned and this remote's code
 * was heard, not named. The eight keys beside the screen are `ScreenLeft1` to `ScreenLeft4` and
 * `ScreenRight1` to `ScreenRight4`, top to bottom, and the two arrows under the screen `ScreenPrev` and
 * `ScreenNext` as on the Harmony 525.
 *
 * **Left out**: the Logitech logo and its word on the panel under the Device and Media keys, which is the
 * artwork the skill keeps out, and the two small grey dots at the inner top corners of Replay and Skip.
 */
import { contour, ellipse, poly, rounded, roundRect } from '../shapes.ts';
import { transformPath } from '../path.ts';
import { FONT_SIZE } from '../svg.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Label, Model, Region, Rocker, Shape } from '../types.ts';

/**
 * The case's half width per row of the photograph, both edges measured to a fraction of a pixel where the
 * grey falls through 200 from the white background, `(right - left) / 2`. Every row at the crown and the
 * foot, every ten rows between, which is what the skill's step 2a asks: a crown gains most of its width in
 * a few rows. Rows 40 to 49 are left out, where a highlight on the silver trim reaches the edge and both
 * crossings jump by up to four pixels. The widest rows are 190, 113.66, and 620, 113.56; the waist is row
 * 400, 96.30.
 */
const SAMPLES: readonly [number, number][] = [
  [3, 5.14], [4, 12.07], [5, 16.53], [6, 20.13], [7, 22.85], [8, 25.59], [9, 28.09], [10, 30.43], [11, 32.50],
  [12, 34.47], [13, 36.24], [14, 37.96], [15, 39.59], [16, 41.29], [17, 42.89], [18, 44.28], [19, 45.67],
  [20, 47.03], [21, 48.39], [22, 49.57], [23, 50.77], [24, 52.06], [25, 53.16], [26, 54.30], [27, 55.41],
  [28, 56.49], [29, 57.49], [30, 58.50], [31, 59.41], [32, 60.53], [33, 61.36], [34, 62.37], [35, 63.25],
  [36, 64.11], [37, 64.89], [38, 65.37], [39, 65.91], [50, 74.57], [51, 75.36], [52, 75.96], [53, 76.55],
  [54, 77.19], [55, 77.72], [56, 78.50], [57, 78.99], [58, 79.66], [59, 80.24], [60, 80.80], [70, 86.22],
  [80, 91.03], [90, 95.23], [100, 98.99], [110, 102.18], [120, 104.86], [130, 107.23], [140, 109.14],
  [150, 110.72], [160, 111.86], [170, 112.74], [180, 113.50], [190, 113.66], [200, 113.60], [210, 113.19],
  [220, 112.49], [230, 111.49], [240, 110.24], [250, 108.98], [260, 107.69], [270, 106.36], [280, 105.18],
  [290, 104.07], [300, 102.92], [310, 101.84], [320, 100.88], [330, 100.01], [340, 99.13], [350, 98.38],
  [360, 97.72], [370, 97.22], [380, 96.86], [390, 96.47], [400, 96.30], [410, 96.37], [420, 96.64], [430, 96.97],
  [440, 97.23], [450, 97.73], [460, 98.21], [470, 98.73], [480, 99.44], [490, 100.25], [500, 101.11],
  [510, 102.12], [520, 103.32], [530, 104.56], [540, 105.83], [550, 107.32], [560, 108.71], [570, 110.09],
  [580, 111.37], [590, 112.38], [600, 112.97], [610, 113.45], [620, 113.56], [630, 113.41], [640, 112.82],
  [650, 112.00], [660, 110.71], [670, 109.09], [680, 107.01], [690, 104.70], [700, 101.92], [710, 98.72],
  [720, 95.09], [730, 90.95], [740, 86.33], [750, 80.76], [760, 74.19], [761, 73.54], [762, 72.81], [763, 72.05],
  [764, 71.27], [765, 70.48], [766, 69.70], [767, 68.84], [768, 68.05], [769, 67.19], [770, 66.36], [771, 65.52],
  [772, 64.60], [773, 63.70], [774, 62.80], [775, 61.88], [776, 60.80], [777, 59.94], [778, 58.84], [779, 57.83],
  [780, 56.76], [781, 55.71], [782, 54.61], [783, 53.55], [784, 52.22], [785, 51.01], [786, 49.87], [787, 48.57],
  [788, 47.23], [789, 45.91], [790, 44.43], [791, 42.98], [792, 41.37], [793, 39.88], [794, 38.11], [795, 36.43],
  [796, 34.68], [797, 32.69], [798, 30.69], [799, 28.46], [800, 26.04], [801, 23.08], [802, 20.28], [803, 17.70],
  [804, 13.36], [805, 7.00],
];

// ---------------------------------------------------------------------------------------------------------
// From the photograph's pixels to this package's units.
// ---------------------------------------------------------------------------------------------------------

/** Rows 3 and 805 are the case's first and last, so their centres, 3.5 and 805.5, are 0 and 1000. */
const TOP = 3.5;
const K = CASE_HEIGHT / (805 - 3);
/** The face's centre line, fitted through the midpoints of the pairs of keys, the module comment. */
const face = (y: number): number => 119.5 - 0.0018 * y;
/** The width follows from the widest row, so the case fills its box across as well as down. */
const WIDTH = 2 * Math.max(...SAMPLES.map(([, h]) => h)) * K;
const X = (x: number, y: number): number => WIDTH / 2 + (x - face(y)) * K;
const Y = (y: number): number => (y - TOP) * K;
/** The same point on the other side of the face, in the photograph's pixels. */
const across = (x: number, y: number): number => 2 * face(y) - x;

/** A point read off the photograph, with the radius its corner is rounded by where it is not the default. */
type Pt = readonly [number, number] | readonly [number, number, number];

/** An outline through points read off the photograph, `rounded` in this package's units. */
function outline(points: readonly Pt[], r: number): Shape {
  return rounded(points.map((p) => (p.length === 3
    ? [X(p[0], p[1]), Y(p[1]), p[2] * K] as const
    : [X(p[0], p[1]), Y(p[1])] as const)), r * K);
}

/** The mirror of a left hand outline, the right hand key of a pair. */
const mirrored = (points: readonly Pt[]): Pt[] =>
  points.map((p) => (p.length === 3 ? [across(p[0], p[1]), p[1], p[2]] : [across(p[0], p[1]), p[1]]));

/**
 * A pair of keys read on both sides: the left reading and the right one mirrored are averaged point by
 * point, and both keys are drawn from the mean. `right` lists its points in the mirror order of `left`'s,
 * its outer corner where the left key has its outer corner.
 */
function pair(left: readonly Pt[], right: readonly Pt[], r: number): [Shape, Shape] {
  if (left.length !== right.length) throw new Error('h885: a pair is read with the same points on both sides');
  const mean: Pt[] = left.map((p, i) => {
    const q = right[i]!;
    const x = (p[0] + across(q[0], q[1])) / 2;
    const y = (p[1] + q[1]) / 2;
    return p.length === 3 ? [x, y, p[2]] : [x, y];
  });
  return [outline(mean, r), outline(mirrored(mean), r)];
}

/** A key centred on the face, from its half width at each row read: `[y, half, r?]`, top to bottom. */
function centred(rows: readonly (readonly [number, number] | readonly [number, number, number])[], r: number): Shape {
  const side = (sign: number): Pt[] => rows.filter(([, h]) => h > 0 || sign > 0).map((row) => {
    const x = face(row[0]) + sign * row[1];
    return row.length === 3 ? [x, row[0], row[2]] : [x, row[0]];
  });
  return outline([...side(1), ...side(-1).reverse()], r);
}

/**
 * A rectangle standing on end, from its centre, width, height and tilt, as read for one key of a pair on
 * each side, `[cx, cy, w, h, angle]`; the mean is drawn on both sides, the right one turned the other way.
 */
type Upright = readonly [number, number, number, number, number];
function uprights(left: Upright, right: Upright): [{ shape: Shape; angle: number }, { shape: Shape; angle: number }] {
  const cx = (left[0] + across(right[0], right[1])) / 2;
  const cy = (left[1] + right[1]) / 2;
  const w = ((left[2] + right[2]) / 2) * K;
  const h = ((left[3] + right[3]) / 2) * K;
  const angle = Math.round(((left[4] - right[4]) / 2) * 10) / 10;
  const at = (x: number) => roundRect(X(x, cy) - w / 2, Y(cy) - h / 2, w, h, 1.5 * K);
  return [{ shape: at(cx), angle }, { shape: at(across(cx, cy)), angle: -angle }];
}

/**
 * A printed word, centred where it was read, in the given size, and turned where it runs at an angle of its
 * own. The anchor is the baseline, a third of the size under the optical centre, and for a turned word that
 * offset turns with it.
 */
function word(text: string, x: number, y: number, size: keyof typeof FONT_SIZE, rotate = 0): Label & { x: number; y: number } {
  const d = FONT_SIZE[size] * 0.35;
  const a = (rotate * Math.PI) / 180;
  const label = { text, place: 'on' as const, size, x: X(x, y) - d * Math.sin(a), y: Y(y) + d * Math.cos(a) };
  return rotate === 0 ? label : { ...label, rotate };
}

/** Where a symbol sits and how wide it is, both read off the photograph. */
const mark = (x: number, y: number, width: number) => ({ markAt: { x: X(x, y), y: Y(y) }, markSize: width * K });

const fmt = (v: number): string => String(Math.round(v * 1000) / 1000);
/** A straight seam between two points read off the photograph. */
const seam = (x0: number, y0: number, x1: number, y1: number): string =>
  `M ${fmt(X(x0, y0))} ${fmt(Y(y0))} L ${fmt(X(x1, y1))} ${fmt(Y(y1))}`;
/** A region of a moulding, the points in the photograph's pixels. */
const region = (points: readonly (readonly [number, number])[]): Shape =>
  poly(points.map(([x, y]) => [X(x, y), Y(y)] as [number, number]));
/** The same region on the right hand side, which is the mirror in this package's units. */
const regionRight = (points: readonly (readonly [number, number])[]): Shape =>
  poly(points.map(([x, y]) => [WIDTH - X(x, y), Y(y)] as [number, number]));
/** A rectangle turned about its own centre, as a path, for a region: a region has no `angle` of its own. */
const turned = (s: Shape, angle: number): string => {
  const a = (angle * Math.PI) / 180;
  const [c, sn] = [Math.cos(a), Math.sin(a)];
  return transformPath(s.path, [c, sn, -sn, c, s.cx - c * s.cx + sn * s.cy, s.cy - sn * s.cx - c * s.cy]);
};

// ---------------------------------------------------------------------------------------------------------
// The readings.
// ---------------------------------------------------------------------------------------------------------

/**
 * The silver trim either side of the crown, from where it leaves the case edge at row 37 down to the first
 * screen key at row 133, and the plain silver piece between the fourth screen key and Mute or Prev: both
 * are the same chrome as the keys and neither is one, since 55 keys raise 55 codes without them.
 */
const TRIM_UPPER: readonly Pt[] = [
  [54.4, 38.5, 0.5], [52.4, 48], [49.5, 60], [47.5, 72], [45.5, 84], [43, 95], [41.2, 106], [40, 120], [39.5, 133, 1],
  [29.5, 133, 1], [30, 120], [31.3, 106], [33.5, 92], [36.5, 78], [40.5, 65], [45, 53], [51, 43.5],
];
const TRIM_LOWER = uprights([31.6, 280.5, 10.8, 25, -1.4], [205.7, 281, 10.8, 24, 3.0]);

/**
 * The black panel round the screen, from the bottom of Activities and Help at row 85 to the top of the
 * arrow keys at 295.5, its sides along the inner edges of the trim and the screen keys.
 */
const BEZEL: readonly Pt[] = [
  [46.6, 85, 1], [43, 95], [41.2, 106], [40, 120], [39.5, 133], [38.2, 151], [36.5, 183], [35.4, 218], [35.4, 251],
  [37, 280], [38.2, 295.5, 1],
];
/**
 * The black bay the direction pad sits in, from the arrow keys down to the band's inner edge, whose points
 * are the band's own below.
 */
const BAND_INNER: readonly Pt[] = [
  [46.2, 355, 1], [49, 369.5], [51.9, 381.5], [54.9, 393.5], [56.8, 399.5], [62.9, 417.5], [67.9, 429.5],
  [74, 441.5], [81.6, 453.5], [90.5, 463.2], [100.5, 471.2], [110.5, 474.5],
];
/**
 * The band's outer edge, scanned row by row to row 465 where the grey case meets the silver, and column by
 * column below it to the bottom of the U at row 511.
 */
const BAND_OUTER: readonly Pt[] = [
  [33, 355, 1], [35, 369.5], [36.9, 381.5], [38.9, 393.5], [41.3, 405.5], [44, 417.5], [47.2, 429.5], [51.1, 441.5],
  [55.5, 453.5], [61.3, 465.5], [70.5, 482.5], [80.5, 494.5], [90.5, 502], [100.5, 507], [110.5, 510],
];

const BAND_BOTTOM_OUTER = 511;
const BAND_BOTTOM_INNER = 476;

/** The whole band as one closed outline: the left outer edge down, the right one up, then both inner edges. */
function band(): string {
  const outerLeft: Pt[] = [...BAND_OUTER, [face(BAND_BOTTOM_OUTER), BAND_BOTTOM_OUTER]];
  const innerLeft: Pt[] = [...BAND_INNER, [face(BAND_BOTTOM_INNER), BAND_BOTTOM_INNER]];
  const loop: Pt[] = [
    ...outerLeft,
    ...mirrored(BAND_OUTER).reverse(),
    ...mirrored(BAND_INNER),
    ...[...innerLeft].reverse(),
  ];
  return outline(loop, 30).path;
}

/**
 * Where the band is cut between its segments, as lines in the photograph's pixels. The two parting lines
 * on each side were read where they cross the band and run straight across it: between Vol - and Red
 * through (70.5, 466.8) and (80.5, 460.2), slope -0.66; between Red and Green through (90.5, 489.8),
 * slope -1.83; and between Green and Yellow the centre line itself. The rocker's two halves have no seam
 * and are cut through the middle of the word `VOL`, at (51.5, 408.5), square to the band.
 */
const s1 = (x: number) => 466.8 - 0.66 * (x - 70.5);
const s2x = (y: number) => 90.5 - (y - 489.8) / 1.83;
const pivot = (x: number) => 408.5 - 0.25 * (x - 51.5);
const mid = (y: number): readonly [number, number] => [face(y), y];
const SEGMENTS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  VolumeUp: [[0, 330], mid(330), mid(pivot(face(392))), [0, pivot(0)]],
  VolumeDown: [[0, pivot(0)], mid(pivot(face(392))), mid(s1(face(435))), [0, s1(0)]],
  Red: [[0, s1(0)], mid(s1(face(435))), mid(489.8 - 1.83 * (face(438) - 90.5)), [s2x(560), 560], [0, 560]],
  Green: [mid(489.8 - 1.83 * (face(438) - 90.5)), mid(560), [s2x(560), 560]],
};

/**
 * The five parting lines the photograph shows across the band, outer edge to inner edge, left to right,
 * and none in either rocker. Named rather than listed, because the Harmony 880's band, `h880.ts`, keeps
 * three of them: the two that end the rockers and the one on the centre line.
 */
const BAND_SEAMS = {
  volumeEnd: seam(64, s1(64), 85.5, s1(85.5)),
  redGreen: seam(s2x(500.5), 500.5, s2x(471.5), 471.5),
  centre: seam(face(476), 476, face(511), 511),
  yellowBlue: seam(across(s2x(500.5), 500.5), 500.5, across(s2x(471.5), 471.5), 471.5),
  channelEnd: seam(across(64, s1(64)), s1(64), across(85.5, s1(85.5)), s1(85.5)),
} as const;

/** The direction pad: an oval, 73.2 by 95 pixels, and the OK key in it, 30 by 39.5, both on the centre line. */
const PAD = { y: 416, rx: 36.6, ry: 47.5 };
const OK = { y: 416.25, rx: 15, ry: 19.75 };

/**
 * The transport block and the digits, each key's corners as read: outer top, inner top, inner bottom, outer
 * bottom, for the key on the left and for its mirror on the right, and averaged by `pair`.
 */
const [STOP, PLAY] = pair(
  [[30.3, 568], [69.2, 568], [67.6, 593.9], [27, 593.9]],
  [[206.2, 568], [167.3, 568], [169, 593.9], [209, 593.9]], 2);
const [REPLAY, SKIP] = pair(
  [[70.9, 568], [117.6, 568], [117.6, 594.4], [70, 594.4]],
  [[166.2, 568.3], [119.6, 568.3], [119, 595], [166.2, 595]], 2);
const [REC, PAUSE] = pair(
  [[27, 595.8], [65.9, 595.8], [65.3, 622.2], [26.4, 622.8]],
  [[209, 596.1], [170.1, 596.1], [170.1, 623.3], [209.3, 623.3]], 2);
const [REW, FWD] = pair(
  [[67.6, 595.8], [117, 595.8], [117, 622.2], [67, 622.2]],
  [[168.4, 596.1], [119.8, 596.1], [119.6, 622.8], [168.4, 622.8]], 2);
const [D1, D3] = pair(
  [[26.4, 635.6], [84.8, 635.6], [84.8, 661.9], [30.3, 661.9]],
  [[209, 635.6], [150.7, 635.6], [150.7, 661.3], [206.8, 661.3]], 2);
const [D4, D6] = pair(
  [[30.3, 663.6], [85.3, 663.6], [86.4, 689.7], [35.9, 690.2]],
  [[205.1, 663.6], [150.7, 663.6], [150.1, 689.7], [200.1, 689.7]], 2);
const [D7, D9] = pair(
  [[36.4, 692], [88.7, 692], [89.8, 718.1], [44.8, 717.8]],
  [[199.6, 692], [146.2, 692], [145.1, 718.1], [190.7, 718.1]], 2);
// The bottom corners of the last row: the bottom edge bows down towards the outer corner.
const [CLEAR, ENTER] = pair(
  [[45.9, 719.8], [92, 719.8], [95.9, 747.6], [79.8, 751.4, 20], [65.3, 753.7]],
  [[190.1, 720.3], [145.7, 720.3], [140.7, 747.6], [158.2, 751.4, 20], [170.7, 753.1]], 2);
// The middle column, read as both edges of each key and drawn from the half width between them.
const D2 = centred([[635.6, 31.3], [661.9, 31]], 2);
const D5 = centred([[663.6, 31], [689.7, 29.65]], 2);
const D8 = centred([[692, 27.95], [718.4, 25.15]], 2);
const D0 = centred([[720.3, 24.6], [747.6, 20.15]], 2);

/**
 * The Menu row, read on the left: each key's top is part of one arc across the row, Menu's outer edge
 * follows the case, and the seam between Menu and Exit leans out. The right two are their mirror; the
 * readings of Guide and Info agree with it within a pixel and a half.
 */
const MENU: readonly Pt[] = [
  [48.2, 501.4, 1.5], [59.3, 504.2], [72.7, 508.7], [79.3, 512, 1.5], [72.7, 554.2, 1.5], [33.8, 554.8, 1.5],
  [36.6, 538.7], [40.4, 525.3],
];
const EXIT: readonly Pt[] = [
  [81, 513.1, 1.5], [90.4, 519.2], [103.8, 525.3], [117.1, 527.3, 1.5], [117.7, 554, 1.5], [73.2, 553.9, 1.5],
];

/**
 * The row under the screen. The arrow key is the black wedge from the panel's edge to Glow's sloping side;
 * Device is the crescent under it, tall at the edge and coming to a point at the centre, where it meets
 * Media; Glow hangs between the two arrows, flat on top and rounded below.
 */
const ARROW: readonly Pt[] = [
  [39.6, 296, 1], [87.5, 296, 1], [93, 301.5, 8], [99.5, 308, 8], [105.5, 314, 1], [90, 314.5], [70, 316], [55, 318],
  [42.2, 320.3, 1],
];
const DEVICE: readonly Pt[] = [
  [42.2, 320.3, 1], [55, 318], [70, 316], [90, 314.5], [105.5, 314, 8], [117.8, 318.2, 1], [117.8, 322.6, 1],
  [106, 325], [86, 330], [66, 337], [52, 345], [46, 353.5, 1],
];
const GLOW = centred([[296, 31.5, 1], [301.5, 25.8, 8], [308, 19.4, 8], [313.5, 12.5, 8], [317.5, 0, 6]], 30);

/**
 * Mute and Prev, the two edge keys under the screen keys: narrower at the top than at the bottom, so their
 * two long edges were each read, by fitting a line to the rows where the grey crosses 150. Mute's outer
 * edge leans 5.2 degrees and its inner one 7.9; Prev's inner edge 7.5, its outer one taken at Mute's.
 */
const [MUTE, PREV] = pair(
  [[27.6, 296, 1.5], [38.5, 296, 1.5], [46, 354, 1.5], [33, 354, 1.5]],
  [[210.7, 296, 1.5], [200.3, 296, 1.5], [192.7, 354, 1.5], [205.5, 354, 1.5]], 2);

/**
 * The eight keys beside the screen, `[cx, cy, w, h, angle]` per key on each side. Each one's tilt is read off
 * one long edge by a straight line fitted to every row of it, residual under a quarter of a pixel: the outer
 * edge on the left, 5.0, 3.0, 0.4 and -1.9 degrees top to bottom, and the inner edge on the right, -5.3,
 * -2.7, -0.3 and -0.3. The two sides agree within 0.3 degrees on the first three rows; the fourth differs by
 * 2.2, and the drawing takes the mean of the two, -0.8.
 */
const SCREEN_KEYS = [
  uprights([33.9, 151, 8.6, 30, 5.0], [204.7, 151, 9.0, 30, -5.3]),
  uprights([31.97, 183, 9.0, 32, 3.0], [206.7, 184, 9.2, 32, -2.7]),
  uprights([30.26, 218.5, 9.35, 33, 0.4], [207.45, 219.5, 9.4, 33, -0.3]),
  uprights([30.08, 251.5, 9.6, 29, -1.9], [206.5, 252, 9.6, 30, -0.3]),
];

/** Activities, read on the left, and Help its mirror: the crease above, the Off key's rim inside. */
const ACTIVITIES: readonly Pt[] = [
  [50.5, 60.5, 1], [60, 61.2], [80, 62.5], [100, 64.3], [110, 66], [112.8, 66.8, 1], [115.6, 72, 4], [117.6, 76.5, 4],
  [117.6, 84.6, 1], [46.6, 85, 1],
];

/** The Off key: a pointed oval, by its half width at each row, read to the outside of its dark rim. */
const OFF = centred([[24.3, 0, 0.6], [30, 4], [40, 6.3], [50, 6.7], [60, 5.9], [68.5, 3.9], [75.5, 0, 0.6]], 30);

// ---------------------------------------------------------------------------------------------------------
// The keys.
// ---------------------------------------------------------------------------------------------------------

/**
 * Every key's scan code, `MEASURED` in `tests/test_harmony_885_keys.py` under this drawing's names. Nothing
 * here is inferred: a key missing from this table would carry no code, and the check below refuses one.
 */
const CODES: Readonly<Record<string, number>> = {
  Activities: 1, AllOff: 2, Help: 3,
  ScreenLeft1: 5, ScreenLeft2: 6, ScreenLeft3: 7, ScreenLeft4: 8,
  Device: 10, VolumeMute: 11, ScreenPrev: 12, VolumeUp: 13, DirectionLeft: 14, VolumeDown: 15, DirectionUp: 16,
  Menu: 17, Exit: 18, Green: 19, Red: 20, Stop: 21, Record: 22, Rewind: 23, SkipBack: 24,
  Number1: 25, Number4: 26, Number8: 27, Number7: 29, Clear: 31, Number0: 32,
  Select: 33, DirectionDown: 34, DirectionRight: 35, ChannelDown: 36, ChannelUp: 37, Media: 38,
  PrevChannel: 40, Glow: 41, ScreenNext: 43,
  ScreenRight4: 44, ScreenRight1: 45, ScreenRight2: 46, ScreenRight3: 48,
  Guide: 50, Info: 51, Blue: 52, SkipForward: 53, FastForward: 54, Pause: 55, Play: 56,
  Number2: 57, Number3: 58, Number6: 59, Yellow: 60, Number5: 61, Number9: 62, Enter: 63,
};

const [ACT, HELP] = [outline(ACTIVITIES, 30), outline(mirrored(ACTIVITIES), 30)];
const [ARROW_L, ARROW_R] = [outline(ARROW, 30), outline(mirrored(ARROW), 30)];
const [DEV, MEDIA] = [outline(DEVICE, 30), outline(mirrored(DEVICE), 30)];
const [MENU_K, INFO_K] = [outline(MENU, 30), outline(mirrored(MENU), 30)];
const [EXIT_K, GUIDE_K] = [outline(EXIT, 30), outline(mirrored(EXIT), 30)];
const PAD_C = { x: X(face(PAD.y), PAD.y), y: Y(PAD.y) };
const PAD_RX = PAD.rx * K;
const PAD_RY = PAD.ry * K;
const padWedge = (a: readonly [number, number], b: readonly [number, number]): Shape => poly([
  [PAD_C.x, PAD_C.y], [PAD_C.x + a[0] * 1.6 * PAD_RX, PAD_C.y + a[1] * 1.6 * PAD_RY],
  [PAD_C.x + b[0] * 1.6 * PAD_RX, PAD_C.y + b[1] * 1.6 * PAD_RY],
]);
const keypad = 'keypad' as const;
const screen = 'screen' as const;

const DRAWN: readonly Key[] = [
  // The crown. Off's power mark is 5 pixels across at row 49; `OFF` is printed above it on the case.
  { name: 'AllOff', src: 'printed', kind: keypad, shape: OFF, angle: 0, icon: 'power', ...mark(face(49), 49, 5),
    labels: [word('OFF', face(17), 17, 'tiny')] },
  { name: 'Activities', src: 'printed', kind: keypad, shape: ACT, angle: 0, labels: [word('ACTIVITIES', 79.5, 73, 'tiny')] },
  { name: 'Help', src: 'printed', kind: keypad, shape: HELP, angle: 0, labels: [word('HELP', 160, 73, 'tiny')] },
  // The screen keys, each with a dot 1.6 pixels across at its middle. Zones in reading order, left then
  // right on each row, as on the Harmony 525.
  ...SCREEN_KEYS.flatMap(([l, r], i): Key[] => [
    { name: `ScreenLeft${i + 1}`, src: 'printed', kind: screen, shape: l.shape, angle: l.angle, icon: 'pip',
      markSize: 1.6 * K, zone: 2 * i + 1 },
    { name: `ScreenRight${i + 1}`, src: 'printed', kind: screen, shape: r.shape, angle: r.angle, icon: 'pip',
      markSize: 1.6 * K, zone: 2 * i + 2 },
  ]),
  // The row under the screen. Each arrow mark is 16.5 pixels long, its middle at (66.3, 308) on the left.
  { name: 'ScreenPrev', src: 'printed', kind: keypad, shape: ARROW_L, angle: 0, icon: 'pageArrowLeft', ...mark(66.3, 308, 16.5) },
  { name: 'ScreenNext', src: 'printed', kind: keypad, shape: ARROW_R, angle: 0, icon: 'pageArrowRight',
    ...mark(across(66.3, 308), 308, 16.5) },
  { name: 'Glow', src: 'printed', kind: keypad, shape: GLOW, angle: 0, labels: [word('GLOW', face(302.5), 302.5, 'tiny')] },
  // `DEVICE` and `MEDIA` climb towards the centre at 17 degrees, along the crescent.
  { name: 'Device', src: 'printed', kind: keypad, shape: DEV, angle: 0, labels: [word('DEVICE', 70, 325.3, 'tiny', -17)] },
  { name: 'Media', src: 'printed', kind: keypad, shape: MEDIA, angle: 0,
    labels: [word('MEDIA', across(70, 325.3), 325.3, 'tiny', 17)] },
  // `MUTE` runs down its key and `PREV` up its key, each leaning with the key.
  { name: 'VolumeMute', src: 'printed', kind: keypad, shape: MUTE, angle: 0, labels: [word('MUTE', 37, 323.5, 'small', 84)] },
  { name: 'PrevChannel', src: 'printed', kind: keypad, shape: PREV, angle: 0,
    labels: [word('PREV', 201.75, 323.3, 'small', -84)] },
  // The band. The plus is 6.4 pixels wide, the minus 7.9; the colour dots 4.5.
  { name: 'VolumeUp', src: 'printed', kind: keypad, shape: region(SEGMENTS.VolumeUp!), angle: 0, icon: 'plus', ...mark(43.1, 374.3, 6.4) },
  { name: 'VolumeDown', src: 'printed', kind: keypad, shape: region(SEGMENTS.VolumeDown!), angle: 0, icon: 'minus', ...mark(66.7, 445.4, 7.9) },
  { name: 'Red', src: 'printed', kind: keypad, shape: region(SEGMENTS.Red!), angle: 0, icon: 'dot', accent: '#d23c3c', ...mark(85.3, 472.9, 4.5) },
  { name: 'Green', src: 'printed', kind: keypad, shape: region(SEGMENTS.Green!), angle: 0, icon: 'dot', accent: '#2f9e44', ...mark(106.7, 487.9, 4.5) },
  { name: 'Yellow', src: 'printed', kind: keypad, shape: regionRight(SEGMENTS.Green!), angle: 0, icon: 'dot', accent: '#d9c22b', ...mark(130, 488.75, 4.5) },
  { name: 'Blue', src: 'printed', kind: keypad, shape: regionRight(SEGMENTS.Red!), angle: 0, icon: 'dot', accent: '#3b6fd4', ...mark(153, 473.25, 4.5) },
  { name: 'ChannelDown', src: 'printed', kind: keypad, shape: regionRight(SEGMENTS.VolumeDown!), angle: 0, icon: 'minus', ...mark(170, 445.5, 7.9) },
  { name: 'ChannelUp', src: 'printed', kind: keypad, shape: regionRight(SEGMENTS.VolumeUp!), angle: 0, icon: 'plus', ...mark(192.5, 373.75, 6.4) },
  // The pad: four wedges from its centre through its box's corners, each triangle 7 pixels across and 25
  // from the centre sideways, 32.5 up and down.
  { name: 'DirectionUp', src: 'printed', kind: keypad, shape: padWedge([-1, -1], [1, -1]), angle: 0, icon: 'triangleUp', ...mark(face(383.5), 383.5, 7) },
  { name: 'DirectionRight', src: 'printed', kind: keypad, shape: padWedge([1, -1], [1, 1]), angle: 0, icon: 'triangleRight', ...mark(face(416.5) + 25, 416.5, 7) },
  { name: 'DirectionDown', src: 'printed', kind: keypad, shape: padWedge([1, 1], [-1, 1]), angle: 0, icon: 'triangleDown', ...mark(face(448.75), 448.75, 7) },
  { name: 'DirectionLeft', src: 'printed', kind: keypad, shape: padWedge([-1, 1], [-1, -1]), angle: 0, icon: 'triangleLeft', ...mark(face(416.5) - 25, 416.5, 7) },
  { name: 'Select', src: 'printed', kind: keypad, shape: ellipse(X(face(OK.y), OK.y), Y(OK.y), OK.rx * K, OK.ry * K), angle: 0,
    labels: [word('OK', face(416), 416, 'normal')] },
  // The Menu row.
  { name: 'Menu', src: 'printed', kind: keypad, shape: MENU_K, angle: 0, labels: [word('MENU', 52.9, 540, 'small')] },
  { name: 'Exit', src: 'printed', kind: keypad, shape: EXIT_K, angle: 0, labels: [word('EXIT', 95.2, 541, 'small')] },
  { name: 'Guide', src: 'printed', kind: keypad, shape: GUIDE_K, angle: 0, labels: [word('GUIDE', 139.8, 541.3, 'small')] },
  { name: 'Info', src: 'printed', kind: keypad, shape: INFO_K, angle: 0, labels: [word('INFO', 183.2, 541, 'small')] },
  // The transport block: a mark over a word on each key, both read where they are printed. The skip and
  // spool marks are printed long and low, 20 and 17.5 pixels by 8 and 5, where the shared symbols are about
  // as tall as they are wide; sized by their read width they overran the keys, so they are drawn 11 and 9
  // wide, which keeps their height near the printing's and leaves them narrower than it.
  { name: 'Stop', src: 'printed', kind: keypad, shape: STOP, angle: 0, icon: 'stop', ...mark(48.7, 576.4, 6.4), labels: [word('STOP', 48.7, 586.1, 'tiny')] },
  { name: 'SkipBack', src: 'printed', kind: keypad, shape: REPLAY, angle: 0, icon: 'skipBack', ...mark(94.8, 575.6, 11), labels: [word('REPLAY', 94.2, 585.6, 'tiny')] },
  { name: 'SkipForward', src: 'printed', kind: keypad, shape: SKIP, angle: 0, icon: 'skipForward', ...mark(145.7, 575.6, 11), labels: [word('SKIP', 147.3, 585, 'tiny')] },
  { name: 'Play', src: 'printed', kind: keypad, shape: PLAY, angle: 0, icon: 'play', ...mark(185.1, 574.4, 8.3), labels: [word('PLAY', 186.2, 583.9, 'tiny')] },
  { name: 'Record', src: 'printed', kind: keypad, shape: REC, angle: 0, icon: 'record', ...mark(46.4, 602.8, 6.1), labels: [word('REC', 45.9, 611.1, 'tiny')] },
  { name: 'Rewind', src: 'printed', kind: keypad, shape: REW, angle: 0, icon: 'rewind', ...mark(91.4, 603.9, 9), labels: [word('REW', 92.6, 613.3, 'tiny')] },
  { name: 'FastForward', src: 'printed', kind: keypad, shape: FWD, angle: 0, icon: 'forward', ...mark(145.1, 603.3, 9), labels: [word('FWD', 144.6, 612.2, 'tiny')] },
  { name: 'Pause', src: 'printed', kind: keypad, shape: PAUSE, angle: 0, icon: 'pause', ...mark(188.7, 603.3, 6.7), labels: [word('PAUSE', 189.6, 612.2, 'tiny')] },
  // The digits: the numeral and its letters where each is printed.
  { name: 'Number1', src: 'printed', kind: keypad, shape: D1, angle: 0, labels: [word('1', 55.3, 649.1, 'normal')] },
  { name: 'Number2', src: 'printed', kind: keypad, shape: D2, angle: 0, labels: [word('2', 110.9, 649.1, 'normal'), word('abc', 124, 652, 'small')] },
  { name: 'Number3', src: 'printed', kind: keypad, shape: D3, angle: 0, labels: [word('3', 172.9, 648.6, 'normal'), word('def', 184, 650.8, 'small')] },
  { name: 'Number4', src: 'printed', kind: keypad, shape: D4, angle: 0, labels: [word('4', 54.8, 676.3, 'normal'), word('ghi', 65.9, 678.6, 'small')] },
  { name: 'Number5', src: 'printed', kind: keypad, shape: D5, angle: 0, labels: [word('5', 110.9, 675.2, 'normal'), word('jkl', 119.7, 676.9, 'small')] },
  { name: 'Number6', src: 'printed', kind: keypad, shape: D6, angle: 0, labels: [word('6', 170.7, 676.3, 'normal'), word('mno', 184, 679.7, 'small')] },
  { name: 'Number7', src: 'printed', kind: keypad, shape: D7, angle: 0, labels: [word('7', 58.7, 705.3, 'normal'), word('pqrs', 72.6, 707, 'small')] },
  { name: 'Number8', src: 'printed', kind: keypad, shape: D8, angle: 0, labels: [word('8', 113.1, 706.4, 'normal'), word('tuv', 124, 708.7, 'small')] },
  { name: 'Number9', src: 'printed', kind: keypad, shape: D9, angle: 0, labels: [word('9', 164, 705.9, 'normal'), word('wxyz', 179.6, 708.7, 'small')] },
  { name: 'Clear', src: 'printed', kind: keypad, shape: CLEAR, angle: 0, icon: 'plus', ...mark(74.8, 729.2, 5.5), labels: [word('CLEAR', 76.4, 738.1, 'tiny')] },
  { name: 'Number0', src: 'printed', kind: keypad, shape: D0, angle: 0, icon: 'space', ...mark(122.9, 733.7, 5), labels: [word('0', 114.2, 730.9, 'normal')] },
  { name: 'Enter', src: 'printed', kind: keypad, shape: ENTER, angle: 0, labels: [word('E', 162.9, 728.7, 'small'), word('ENTER', 161.8, 737.6, 'tiny')] },
];

for (const key of DRAWN) {
  if (CODES[key.name] === undefined) throw new Error(`h885: ${key.name} has no measured code`);
}
for (const name of Object.keys(CODES)) {
  if (!DRAWN.some((k) => k.name === name)) throw new Error(`h885: no key ${name} to give a code`);
}

const KEYS: readonly Key[] = DRAWN.map((key) => ({ ...key, scan: CODES[key.name]!, scanFrom: 't-885-keys-u' }));

const REGIONS: readonly Region[] = [
  { id: 'trim-upper-left', form: 'seam', path: outline(TRIM_UPPER, 30).path },
  { id: 'trim-upper-right', form: 'seam', path: outline(mirrored(TRIM_UPPER), 30).path },
  { id: 'trim-lower-left', form: 'seam', path: turned(TRIM_LOWER[0].shape, TRIM_LOWER[0].angle) },
  { id: 'trim-lower-right', form: 'seam', path: turned(TRIM_LOWER[1].shape, TRIM_LOWER[1].angle) },
  { id: 'screen-bezel', form: 'recess', path: outline([...BEZEL, ...mirrored(BEZEL).reverse()], 30).path },
  {
    id: 'pad-bay', form: 'recess',
    path: outline([[38.2, 295.5, 1], [46, 354, 1], ...BAND_INNER.slice(1), [face(BAND_BOTTOM_INNER), BAND_BOTTOM_INNER],
      ...mirrored([[38.2, 295.5, 1], [46, 354, 1], ...BAND_INNER.slice(1)]).reverse()], 30).path,
  },
];

const ROCKERS: readonly Rocker[] = [
  {
    id: 'rocker-band',
    keys: ['VolumeUp', 'VolumeDown', 'Red', 'Green', 'Yellow', 'Blue', 'ChannelDown', 'ChannelUp'],
    seams: [BAND_SEAMS.volumeEnd, BAND_SEAMS.redGreen, BAND_SEAMS.centre, BAND_SEAMS.yellowBlue, BAND_SEAMS.channelEnd],
    // `VOL` and `CH` run along the band, 76 degrees from level, read at (51.5, 408.5) and (183.75, 410.5).
    labels: [word('VOL', 51.5, 408.5, 'tiny', 76), word('CH', 183.75, 410.5, 'tiny', -76)],
    path: band(),
  },
  {
    id: 'rocker-pad',
    keys: ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft'],
    path: ellipse(PAD_C.x, PAD_C.y, PAD_RX, PAD_RY).path,
  },
];

/**
 * The glass, 121 by 150 pixels where the photograph's blue begins, which is 0.807 across its height: arch
 * 8's raster is 128 by 160, 0.8, so the rectangle is drawn 150 tall and 120 wide on the face's centre line.
 */
const GLASS = { y: 194, h: 150 };

export const H885: Model = {
  id: 'h885',
  label: 'Harmony 885',
  skins: [17],
  architecture: 8,
  source: 'photograph',
  width: WIDTH,
  height: CASE_HEIGHT,
  case: contour(WIDTH / 2, SAMPLES, CASE_HEIGHT),
  regions: REGIONS,
  rockers: ROCKERS,
  screen: {
    x: WIDTH / 2 - (GLASS.h * 0.8 * K) / 2, y: Y(GLASS.y - GLASS.h / 2), w: GLASS.h * 0.8 * K, h: GLASS.h * K,
    pixels: { width: 128, height: 160 }, touch: false,
  },
  keys: KEYS,
  // `HARMONY 885` above the glass, centred at (113.1, 103.75): six pixels left of the face's centre line on
  // the photograph and on the manual's picture alike, so it is drawn where it is printed.
  nameplate: word('Harmony 885', 113.1, 103.75, 'small'),
};

/**
 * This photograph's frame and the band's parts, for the Harmony 880's drawing, `h880.ts`: the 880 is this
 * face with the bottom of the band and the nameplate changed, and what it reads of its own photograph is
 * moved into this frame, so its numbers go through the same helpers rather than a copy of them.
 */
export const FRAME_885 = { face, across, mid, s1, region, regionRight, mark, word, seams: BAND_SEAMS } as const;
