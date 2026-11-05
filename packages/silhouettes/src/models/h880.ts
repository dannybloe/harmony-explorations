/**
 * The Harmony 880, skin 15, architecture 8.
 *
 * **The Harmony 885's drawing with the bottom of the band and the nameplate changed.** Read off the 880's
 * own product photograph in the lab, `reference/forum-images/880-full.jpg`, 266 by 898 pixels, with the
 * picture in Logitech's reviewer's guide for the 880, page 11 of `Docs/880 manual.pdf`, as a second view of
 * the same face. Neither leaves the lab. Every key, word and symbol of the 885's drawing was checked against
 * that photograph, laid over it, and three things differ:
 *
 * * **Two keys at the bottom of the band where the 885 has four colour keys.** The left one is printed with
 *   an up chevron and the right one with a down chevron, on the photograph and in the reviewer's guide
 *   alike, and the parting line between them is on the centre line. Each covers what are two colour keys
 *   on an 885: the parting line between Vol - and the left key is the 885's between Vol - and Red, and there
 *   is none where the 885 parts Red from Green. They take Logitech's names for a pair of chevron keys,
 *   `UpArrow` and `DownArrow`, as on the Harmony 350, the Harmony One and the Harmony 600, and their names
 *   are `printed`, chosen by the marking, since no map of Logitech's names a key of this skin.
 * * **The nameplate reads `HARMONY TECHNOLOGY`** where the 885 prints its model name.
 * * Nothing else: the case, every other key, its tilt and every other marking are the 885's, which is why
 *   this file takes the 885's model rather than copying a shape. The case's width, measured on both
 *   photographs at every fortieth of the height and normalised to it, agrees within 0.004 of the height at
 *   each of the 39 between the two tips.
 *
 * **How the photograph's readings reach this frame.** `h885.ts` reads every number in the 885 photograph's
 * pixels, so the 880's photograph was moved into that frame by its own case: its first and last rows, 5
 * and 896, onto the 885's 3 and 805, and its case centre line, 131.56 + 0.00024 y, onto the 885's face line.
 * Laid over the 885's drawing that way, the two photographs agree within a pixel across, and down they
 * drift by up to three pixels in the middle of the face, which is two lenses and not two remotes: the band's
 * inner and outer edges at its bottom sit 2.7 and 2 pixels higher on the 880's than on the 885's. So the
 * chevrons were read relative to the band, 2.5 pixels lower than where the moved photograph puts them.
 *
 * **No key carries a scan code.** No Harmony 880 has been pressed. Its configurations' key tables hold the
 * 885's codes less 19 and 60, which are Green and Yellow on an 885, and that a shared key raises on an 880
 * the code it raises on an 885 is likely, from the shared moulding and one firmware build, and is an
 * inference, so every code `h885.ts` carries is dropped here.
 *
 * **The two chevron keys carry candidates, 20 and 52, and which is which is not settled.** Four readings
 * narrow the pair. The 880's key table lacks exactly 19 and 60, so of the 885's four colour key codes 20
 * and 52 are what it keeps. Logitech's own compiles for skin 15, configurations two people read off their
 * 880s, bind 20 and 52 as a pair: one device's map puts a previous and a next command on them, the same
 * pair it puts on Replay and Skip and on the channel keys. Those compiles, named through the infrared
 * archive, give Info 51, Skip 53, Fwd 54, Pause 55 and Play 56, the 885's codes for those keys, so the
 * transport row leaves 52 free. And a photograph of an 880's circuit board shows two pads under the two
 * keys, the same two that are Red and Blue on an 885, which raise 20 and 52 there. The direction does not
 * agree with itself: by the board's pads and the 885's codes for them the left key is 20, and the
 * photograph prints the up chevron on the left; but the compiles put the previous command on 20, where on a
 * Harmony 600 one device's map in Logitech's compile puts its next command on the up arrow, and a third
 * party's legend of that board names the left pad's key the down arrow. A unit pressed settles it.
 */
import { FRAME_885, H885 } from './h885.ts';
import type { Key, Model, Rocker } from '../types.ts';

const { face, mid, s1, region, regionRight, mark, word, seams } = FRAME_885;

/** The 885's four colour keys, which the 880 does not have. */
const COLOUR_KEYS: ReadonlySet<string> = new Set(['Red', 'Green', 'Yellow', 'Blue']);

/**
 * The left chevron key's region, in the 885 photograph's pixels: what are Red and Green on an 885, from the
 * parting line that ends the volume rocker to the centre line. The right key's is its mirror.
 */
const CHEVRON: readonly (readonly [number, number])[] = [[0, s1(0)], mid(s1(face(435))), mid(560), [0, 560]];

/**
 * The chevrons, each a mark 14.5 pixels across its centre line, read relative to the band at 485.7 and
 * 17.8 pixels either side of the face's centre line: read at 16.6 left and 19.0 right, a photograph a
 * little turned, and drawn at the mean on both sides as every pair on this face is.
 */
const CHEVRON_Y = 485.7;
const CHEVRON_OFF = 17.8;
const CHEVRON_WIDTH = 14.5;
/** The two codes the chevrons share between them, the module comment. */
const CHEVRON_CODES = [20, 52] as const;

const CHEVRONS: readonly Key[] = [
  { name: 'UpArrow', src: 'printed', kind: 'keypad', shape: region(CHEVRON), angle: 0, icon: 'chevronUp',
    ...mark(face(CHEVRON_Y) - CHEVRON_OFF, CHEVRON_Y, CHEVRON_WIDTH), scanCandidates: CHEVRON_CODES },
  { name: 'DownArrow', src: 'printed', kind: 'keypad', shape: regionRight(CHEVRON), angle: 0, icon: 'chevronDown',
    ...mark(face(CHEVRON_Y) + CHEVRON_OFF, CHEVRON_Y, CHEVRON_WIDTH), scanCandidates: CHEVRON_CODES },
];

/** Every other key of the 885's, without the code its units raised: no 880 was pressed. */
const KEYS: readonly Key[] = H885.keys.flatMap((key): Key[] => {
  if (key.name === 'Red') return [...CHEVRONS];
  if (COLOUR_KEYS.has(key.name)) return [];
  const { scan: _scan, scanFrom: _scanFrom, ...rest } = key;
  return [rest];
});

const BAND = H885.rockers?.find((r) => r.id === 'rocker-band');
if (BAND === undefined) throw new Error('h880: the 885 has no band to take');

const ROCKERS: readonly Rocker[] = (H885.rockers ?? []).map((rocker) => (rocker.id !== BAND.id ? rocker : {
  ...rocker,
  keys: ['VolumeUp', 'VolumeDown', 'UpArrow', 'DownArrow', 'ChannelDown', 'ChannelUp'],
  // The three parting lines the 880's photograph shows: the two that end the rockers and the one between
  // the chevron keys. Where the 885 parts Red from Green and Yellow from Blue the 880's band is smooth.
  seams: [seams.volumeEnd, seams.centre, seams.channelEnd],
}));

export const H880: Model = {
  ...H885,
  id: 'h880',
  label: 'Harmony 880',
  skins: [15],
  keys: KEYS,
  rockers: ROCKERS,
  // `HARMONY TECHNOLOGY` above the glass, 92.5 pixels across, centred at (122.95, 101.35): 3.6 pixels right
  // of the face's centre line and 2.4 above where the 885 prints its name, both as printed.
  nameplate: word('Harmony Technology', 122.95, 101.35, 'small'),
};
