/**
 * The Harmony 785, skin 45, architecture 8.
 *
 * **The Harmony 720's face with a row of four colour keys between the transport block and the digits.** That
 * is how a person holding both remotes describes it, and it is what the 785's own two sources show: its
 * product photograph in the lab, `reference/forum-images/785-full.jpg`, 211 by 831 pixels, and the picture on
 * page 13 of `Docs/785 manual.pdf`, its page 9, whose legend calls the four colour keys the teletext buttons.
 * That picture is raster, eighteen strips 788 pixels wide that assemble into one photograph 788 by 2268, the same
 * product shot as the forum's at about two and a half times its size, with the legend's leader lines drawn
 * across it, so there is no vector to take and it serves as a second view. Neither leaves the lab; the
 * readings are in `../lab/work/silhouettes/h785/`.
 *
 * **So this file takes the 720's model and changes four things**, every one of them read in the 720
 * photograph's own pixels so that it lands in the 720's frame through the 720's helpers:
 *
 * * **The colour keys**, Red, Green, Yellow and Blue from the left, on both sources. Each has the outline and
 *   the column of the transport key above it: along the colour row the forum photograph's key rims sit at
 *   23.5, 51, 68, 96, 112, 140.5, 157 and 185.5, the transport rows' at 24, 51, 68, 96, 113, 140.5, 157.5 and
 *   184.5, and the manual's picture gives 154 to 217, 267 to 335, 383 to 452 and 501 to 567 against the
 *   transport row's 154 to 219, 266 to 335, 383 to 450 and 499 to 567; their height, rim to rim, is the
 *   transport keys' within a pixel on both. They sit one transport pitch below the Rec row: down the outer
 *   left column the rims are at 552, 580 and 608 on the forum photograph and 1500, 1572 and 1645 on the
 *   manual's, a pitch of 28 and 72.5 there, which is the 720's 33.
 * * **The two blocks move**, because a row cannot fit where the 720 has none. On the 720 the digits begin
 *   24 pixels below the Rec row's words, and on the 785 the colour keys take about 45 there. Both 785 sources were
 *   moved into the 720's pixels by the transport pitch and registered on the bottom edge of the silver U
 *   above the block, 650.5 on the 720: the forum photograph puts the Stop row's top at 671.7 and the first
 *   row of digits at 775.4, the manual's at 669.8 and 774.5, where the 720 has 678 and 759. So the transport
 *   block is drawn 7 pixels higher than the 720's and the digits 16 lower, the means rounded; the colour row
 *   then lands at 737, the sources' 737.7 and 735.8, and the gap from it to the digits is the sources' 20.
 * * **The nameplate reads `Harmony 785`**, in the place the 720 prints its own, as both sources show.
 * * **`Vol` and `Ch` carry no full stop**, where the 720 prints `Vol.` and `Ch.`: the manual's picture prints
 *   both plainly without one, at 2.5 times the forum photograph's size, and the forum photograph agrees as
 *   far as it can be read. The words stay where the 720's are.
 *
 * **Everything else is the 720's**: the case, the screen, every key above the transport block and its
 * printing but for those two words, and the transport keys' and the digits' shapes, marks and words. Laid
 * over the 785's photograph by its case, the drawing falls on it within a pixel from the crown down to
 * Devices and Help and across the face, and from the screen down every key sits 5 to 8 of that photograph's
 * pixels lower than the photograph shows it, the keys within 2 of each other; and the photograph's case
 * widens by about 3 percent from the crown to the foot where the 720's widens by 1. Both are taken for the
 * two cameras rather than the two remotes, since the person holding both says the faces differ in the
 * colour keys alone.
 *
 * **No key carries a code.** Both bench remotes' configurations hold the same 53 press codes, the 720's 49
 * and 12, 26, 28 and 63, so the four colour keys raise four of those, but which raises which nobody has
 * pressed, and the 885's code for a colour key says nothing of a 785: the 720's wiring is its own,
 * `tests/firmware/test_silhouettes.py`.
 */
import { FRAME_720, H720 } from './h720.ts';
import type { Key, Model, Rocker } from '../types.ts';

const { face, mark, word, tKey, TRANSPORT, transportKeys, digitKeys } = FRAME_720;

/** How far the transport block sits below the 720's, in the 720 photograph's pixels: 7 higher, above. */
const TRANSPORT_DY = -7;
/** How far the digits sit below the 720's, the same way. */
const DIGITS_DY = 16;

/** The 720's transport pitch, Stop's row to Rec's, and the colour row one pitch below Rec's. */
const PITCH = TRANSPORT.rows[1][0] - TRANSPORT.rows[0][0];
const COLOUR_ROW = [TRANSPORT.rows[1][0] + PITCH + TRANSPORT_DY, TRANSPORT.rows[1][1] + PITCH + TRANSPORT_DY] as const;
const COLOUR_Y = (COLOUR_ROW[0] + COLOUR_ROW[1]) / 2;

/**
 * A colour key: the transport key's outline in the column above it, and a coloured face 30 pixels across,
 * the coloured part inside the key's rim on both sources, centred on the key. `off` is the key's centre from
 * the face's centre line, 80 for the outer columns and 27 for the inner ones, the middles of the 720's
 * transport columns.
 */
function colourKey(name: string, accent: string, cols: readonly [number, number], side: -1 | 1): Key {
  const off = (cols[0] + cols[1]) / 2;
  return {
    name, src: 'printed', kind: 'keypad', shape: tKey(cols, side, COLOUR_ROW), angle: 0, icon: 'face', accent,
    ...mark(face(COLOUR_Y) + side * off, COLOUR_Y, 30),
  };
}

/** The colours are the palette every drawing uses for a colour key, so the four read alike on every face. */
const COLOUR_KEYS: readonly Key[] = [
  colourKey('Red', '#d23c3c', TRANSPORT.outer, -1),
  colourKey('Green', '#2f9e44', TRANSPORT.inner, -1),
  colourKey('Yellow', '#d9c22b', TRANSPORT.inner, 1),
  colourKey('Blue', '#3b6fd4', TRANSPORT.outer, 1),
];

/** The keys the 720's model builds at its own rows, which this one builds at the 785's. */
const MOVED: ReadonlySet<string> = new Set([...transportKeys(0), ...digitKeys(0)].map((k) => k.name));

/** The 720's mouldings, with the U's two words printed as the 785 prints them, the module comment. */
const UNSTOPPED: Readonly<Record<string, string>> = { 'Vol.': 'Vol', 'Ch.': 'Ch' };
const ROCKERS: readonly Rocker[] = (H720.rockers ?? []).map((r) => (r.labels === undefined ? r
  : { ...r, labels: r.labels.map((l) => ({ ...l, text: UNSTOPPED[l.text] ?? l.text })) }));

export const H785: Model = {
  ...H720,
  id: 'h785',
  label: 'Harmony 785',
  skins: [45],
  rockers: ROCKERS,
  // The 720's keys above the transport block, in the 720's order, then the block, the colour row and the
  // digits, so the face reads top to bottom as the 720's does.
  keys: [
    ...H720.keys.filter((k) => !MOVED.has(k.name)),
    ...transportKeys(TRANSPORT_DY),
    ...COLOUR_KEYS,
    ...digitKeys(DIGITS_DY),
  ],
  // `Harmony 785`, where the 720 prints its model name.
  nameplate: word('Harmony 785', 121, 157, 'small'),
};
