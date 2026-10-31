/**
 * The Harmony 300 in its European printing, skin 79, which Logitech names the Harmony 300 EMEA. The same
 * moulding as the US Harmony 300 and the Harmony 350, every shape taken from `H350` through `h300.ts`'s
 * `reprintKeys`, and its own printing in two places.
 *
 * **The printing is stated by a person holding a skin 79 unit**, with a photograph of the unit's upper half
 * shown at the bench; no manual or photograph of the European model is in the lab, whose `Docs/300 manual.pdf`
 * is the US guide. What differs from the US printing, `h300.ts`:
 *
 * - **the colour keys run red, green, yellow, blue with no letters**, as on the Harmony 350, where the US
 *   printing runs yellow, blue, red, green lettered A to D. So the four keys are the 350's, unchanged;
 * - **the favourite block holds four favourites and Teletext**: `1` left of TV Input and `3` right of it, and
 *   below them `2` on the left, Teletext in the middle and `4` on the right, where the US printing has
 *   favourites 1 to 5. Teletext carries a teletext glyph, drawn on the key with the `teletext` symbol, and
 *   the word, drawn under it; where on or beside the key the word is printed was not stated.
 *
 * Everything else is the US printing, `COMMON` in `h300.ts`, by the same statement: the device keys, Power,
 * TV Input, List, the words under the transport keys, the nameplate and the captions.
 *
 * **The names follow the printing**, so `Favorite3` is the key printed `3`, which sits where the 350 has its
 * favourite 5, and the key in the 350's favourite 3 place is `Teletext`.
 *
 * **49 keys carry the code they were heard raising**, `packages/bench/test/keys300.test.ts`: every key of the
 * bench unit pressed in the television's mode and the KPN box's, on two configurations, and each of these
 * tied to the one code of the 56 that, raised in its place, gives what the receiver heard. Every one is the
 * code of the Harmony 350 key in the same place. The six without a code are the keys neither configuration
 * binds in the modes pressed, which sent nothing: Clear, Enter, TV Input, Live and the two arrows between
 * Menu, Info, Exit and Guide. No candidate set is carried: the 350's are a reading of 350 and 300
 * configurations, and this drawing carries only what its own unit decided.
 */
import { COMMON, H300, below, reprintKeys, type Reprint } from './h300.ts';
import type { Model } from '../types.ts';

/** The European printing, keyed by the 350's key name. */
const REPRINT: Readonly<Record<string, Reprint>> = {
  ...COMMON,
  // The 350's favourite 3 place, below TV Input in the middle.
  Favorite3: { name: 'Teletext', icon: 'teletext', markSize: 13, labels: [below('Teletext')] },
  // The 350's favourite 5 place, right of TV Input, prints 3 here.
  Favorite5: { name: 'Favorite3', labels: [{ text: '3', place: 'on' }] },
};

/**
 * The code each key was heard raising, by this drawing's names, `DECIDED` in
 * `packages/bench/test/keys300.test.ts`, which also asserts that the generated SVG carries exactly these.
 */
const HEARD: Readonly<Record<string, number>> = {
  CableSat: 1, Favorite3: 2, Power: 3, VcrAux: 4, Tv: 5, WatchTV: 6, Dvd: 7, Favorite1: 8, Favorite2: 9,
  Menu: 10, Teletext: 11, Exit: 12, Red: 13, DirectionLeft: 14, VolumeMute: 15, List: 16, Number4: 17,
  Number7: 18, Number0: 20, SkipBack: 21, Rewind: 22, Record: 23, Number1: 24, Green: 27, Yellow: 28,
  Blue: 29, FastForward: 30, DirectionRight: 31, PrevChannel: 32, Guide: 33, Favorite4: 34, Info: 36,
  Number6: 37, SkipForward: 38, Number3: 39, Stop: 40, ChannelDown: 41, DirectionDown: 42, Play: 44,
  Number9: 45, Pause: 46, Number2: 47, Number5: 48, VolumeUp: 49, Select: 50, DirectionUp: 51,
  VolumeDown: 52, Number8: 53, ChannelUp: 55,
};

export const H300EU: Model = {
  ...H300,
  id: 'h300eu',
  label: 'Harmony 300 EMEA',
  skins: [79],
  keys: reprintKeys(REPRINT, HEARD, 't-harmony-300-keys-u'),
};
