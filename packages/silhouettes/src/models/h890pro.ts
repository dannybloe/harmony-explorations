/**
 * The Harmony 890 Pro, skin 40, architecture 10.
 *
 * **The Harmony 880 Pro's face, `h880pro.ts`, with one word and the nameplate changed.** Read off the 890 Pro's
 * own product photograph in the lab, `reference/forum-images/890pro-full.jpg`, 264 by 893 pixels, moved into the
 * 885 photograph's frame by its case as the 880 Pro's is, its first and last rows 4 and 888 and its case centre
 * line 126.85 + 0.00633 y. The 885's drawing laid over it falls on the photograph the way it falls on the 880
 * Pro's, and so do the 880 Pro's six keys: `MUTE`, a down triangle, an up triangle and `PREV` at the bottom of
 * the band, `SOUND` on the left edge key. What differs:
 *
 * * **The right edge key is printed `PICTURE`**, read upwards, where the 880 Pro prints `PIC`. The word runs
 *   from 334 up to about 309 in the 885 frame, the last three letters faint in the photograph's highlight, and
 *   it is centred on the key, as the 880 Pro's three letters are.
 * * **The nameplate reads `HARMONY 890 PRO`**, at the 880 Pro's place and width.
 * * The direction pad is dark on this photograph where the 880 Pro's is silver. A colour, which a drawing does
 *   not state, so the pad is the same shape on both.
 *
 * It is architecture 10, the radio frequency family, and the raster is that architecture's, the same 128 by 160
 * as arch 8's, `SCREEN_SIZES` in `packages/codec`. No key carries a code: no configuration of an 890 Pro is
 * known, and the key reader page does not read this architecture.
 */
import { FRAME_885 } from './h885.ts';
import { H880PRO, proPrinting } from './h880pro.ts';
import type { Model } from '../types.ts';

const { face, word } = FRAME_885;

export const H890PRO: Model = {
  ...H880PRO,
  id: 'h890pro',
  label: 'Harmony 890 Pro',
  skins: [40],
  architecture: 10,
  keys: proPrinting('PICTURE'),
  nameplate: word('Harmony 890 Pro', face(103.3), 103.3, 'small'),
};
