/**
 * The Harmony 880 Pro, skin 39, architecture 8.
 *
 * **The Harmony 885's drawing with six keys printed differently and the nameplate changed.** Read off the 880
 * Pro's own product photograph in the lab, `reference/forum-images/880pro-full.jpg`, 269 by 893 pixels, with
 * the picture on page 5 of `Docs/880Pro manual.pdf`, Logitech's user manual for it, as a second view of the
 * same face. Neither leaves the lab. The photograph was moved into the 885 photograph's frame by its own case,
 * as `h880.ts` moves the 880's, and the 885's drawing laid over it: the case, the band, its five parting lines,
 * the pad, the screen keys, the arrows under the screen, Glow, Device, Media, the Menu row, the transport block
 * and the digits all fall on the photograph's. What differs:
 *
 * * **The bottom of the band carries four keys, in the 885's four colour key positions**, printed `MUTE`, a
 *   down triangle, an up triangle and `PREV`, left to right, on the photograph and in the manual's picture
 *   alike. The parting lines between them are the 885's: the photograph shows one where the 885 parts each
 *   colour key from the next, so the band is the 885's band of eight segments under other names. The two
 *   middle marks are filled triangles, like the pad's, and not the 880's open chevrons, and the down one is on
 *   the left, where the 880 prints its up chevron.
 * * **The two edge keys under the screen keys are printed `SOUND` and `PICTURE`** where the 885 prints `MUTE`
 *   and `PREV`, as the manual's legend names them. The right key's word is placed as the Harmony 890 Pro's
 *   `PICTURE` is, read off that photograph, from 334 up to about 309 in the 885 frame and centred on the key.
 *   This said the 880 Pro prints `PIC`, read off the photograph and the manual's picture, both low resolution,
 *   where the word looked centred on the key; somebody who knows the remote corrected it to `PICTURE`, with
 *   the rest of the word lost in the photograph's highlight. The two Pro faces differ only in the nameplate.
 * * **The nameplate reads `HARMONY 880 PRO`**, on the face's centre line.
 *
 * **Names.** The band's four keys take the names the 885 gives the same marking elsewhere on its face:
 * `VolumeMute` for `MUTE` and `PrevChannel` for `PREV`, as the 885's edge keys are called, and `DownArrow` and
 * `UpArrow` for the two triangles, as on the 880. The two edge keys are `Sound` and `Picture`, the manual's
 * words, since no other model has a key for either. All `printed`, chosen by the marking.
 *
 * **No key carries a code.** One configuration of an 880 Pro is known, compiled by Logitech for one
 * contributor, and `tests/test_harmony_880_keys.py` asks for devices of two contributors before it names a
 * key's code; that file reports what the one compile says, Mute on 20 where the 880 and 885 have it on 11,
 * which is the code of the 885's Red key, the position this face prints `MUTE` in. Nothing else narrows a key
 * to a set either, so no key carries candidates. The key page's learning mode is how these get codes.
 *
 * **How the photograph's readings reach this frame.** Its first and last case rows, 3 and 887, go onto the
 * 885's 3 and 805, and its case centre line, fitted through every row, 129.84 + 0.00633 y, onto the 885's face
 * line. The photograph is taken a little from one side: moved that way, the pairs of keys centre about 3
 * pixels right of the face line at the band and the screen keys, so each word and mark was read against the
 * photograph's own centre line there, the parting line between the two triangles at 122.5, and is drawn at the
 * mean of its pair on both sides, as every pair on this face is.
 */
import { FRAME_885, H885 } from './h885.ts';
import type { Key, Model, Rocker } from '../types.ts';

const { face, mark, word } = FRAME_885;

/**
 * The four keys at the bottom of the band, each by the 885 colour key whose position it takes. The two words
 * run along the band at 47.5 degrees, read at 47.1 and 47.9, their centres 34.75 pixels either side of the
 * photograph's centre line at row 475.3 (35.4 and 34.1 read); the two triangles are 5.25 pixels across (5.1 and
 * 5.4), 13.65 either side at row 492.2 (12.9 and 14.4).
 */
const MUTE_AT = { off: 34.75, y: 475.3, rotate: 47.5 };
const TRIANGLE_AT = { off: 13.65, y: 492.2, width: 5.25 };

/** What the six keys that differ are called and printed with, by the 885 key they replace. */
function printing(key: Key): Key {
  // Every key keeps the 885's shape, and no key keeps the code an 885 raised. The six that differ also drop
  // the 885's marking: a colour key's dot and colour, an edge key's word.
  const { scan: _scan, scanFrom: _scanFrom, ...kept } = key;
  const { icon: _icon, accent: _accent, markAt: _markAt, markSize: _markSize, labels: _labels, ...shape } = kept;
  switch (key.name) {
    // The two edge keys keep the 885's words' places: each word is centred on its key, as `MUTE` and `PREV`
    // are on an 885, and runs along it the same way.
    case 'VolumeMute':
      return { ...shape, name: 'Sound', labels: [word('SOUND', 37, 323.5, 'small', 84)] };
    case 'PrevChannel':
      return { ...shape, name: 'Picture', labels: [word('PICTURE', 201.75, 323.3, 'small', -84)] };
    case 'Red':
      return { ...shape, name: 'VolumeMute',
        labels: [word('MUTE', face(MUTE_AT.y) - MUTE_AT.off, MUTE_AT.y, 'tiny', MUTE_AT.rotate)] };
    case 'Green':
      return { ...shape, name: 'DownArrow', icon: 'triangleDown',
        ...mark(face(TRIANGLE_AT.y) - TRIANGLE_AT.off, TRIANGLE_AT.y, TRIANGLE_AT.width) };
    case 'Yellow':
      return { ...shape, name: 'UpArrow', icon: 'triangleUp',
        ...mark(face(TRIANGLE_AT.y) + TRIANGLE_AT.off, TRIANGLE_AT.y, TRIANGLE_AT.width) };
    case 'Blue':
      return { ...shape, name: 'PrevChannel',
        labels: [word('PREV', face(MUTE_AT.y) + MUTE_AT.off, MUTE_AT.y, 'tiny', -MUTE_AT.rotate)] };
    default:
      return kept;
  }
}

const KEYS: readonly Key[] = H885.keys.map(printing);

/** The 885's band under the four new names; the moulding, its eight segments and its five seams are the 885's. */
const BAND_KEYS: Readonly<Record<string, string>> = {
  Red: 'VolumeMute', Green: 'DownArrow', Yellow: 'UpArrow', Blue: 'PrevChannel',
};
const ROCKERS: readonly Rocker[] = (H885.rockers ?? []).map((rocker) => ({
  ...rocker,
  keys: rocker.keys.map((name) => BAND_KEYS[name] ?? name),
}));

export const H880PRO: Model = {
  ...H885,
  id: 'h880pro',
  label: 'Harmony 880 Pro',
  skins: [39],
  keys: KEYS,
  rockers: ROCKERS,
  // `HARMONY 880 PRO` above the glass, 72.5 pixels across at row 103.3, centred on the photograph's own
  // centre line there, so drawn on the face's.
  nameplate: word('Harmony 880 Pro', face(103.3), 103.3, 'small'),
};

