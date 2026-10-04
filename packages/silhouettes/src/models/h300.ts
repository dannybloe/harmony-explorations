/**
 * The Harmony 300, the Harmony 350's sibling: the same case, the same 55 keys in the same places, and
 * different printing on some of them.
 *
 * **The geometry is the Harmony 350's and is not copied.** Danny's statement, holding both remotes:
 * the two are exactly the same moulding with the labels different here and there. The Harmony 300 setup
 * guide's own button drawing is a raster image, so it could not be read the way the 350's vector page
 * was, and tracing it by hand would only have produced a second, worse copy of shapes that are the same
 * part. So every key, rocker, bay and the case come from `H350` by reference, and this file states only
 * what is printed differently. A change to a 350 shape moves the 300 with it, which is the point.
 *
 * **The printing is read off the cover photograph of the Harmony 300 setup guide**, PDF page 2 of
 * `Docs/300 manual.pdf` in the lab, which shows the whole face. What differs from the 350:
 *
 * - the four device keys print `TV`, `Cable/Sat`, `DVD` and `VCR/Aux`, and the power key has `Power`
 *   printed under it;
 * - the key between the favourites prints `TV` over `Input`, and there is no `Favorites` word;
 * - the four colour keys run yellow, blue, red, green, with `A` to `D` printed under them, where the 350
 *   runs red, green, yellow, blue with nothing under them. The names follow the colour, as on the 350,
 *   so the first key is `Yellow` here;
 * - the key the 350 prints `DVR` prints `List`;
 * - `Replay`, `Skip`, `Record` and `Stop` are printed under the four keys beside the play key;
 * - the face carries Logitech's logo at the top where the 350 prints `Harmony`, and `Harmony 300` near
 *   the bottom. The logo's mark is not drawn; the word `Logitech` stands for it.
 *
 * The photograph also suggests the pause half of the play key is a separately moulded inset, as on a
 * Harmony 600. Danny's statement is that the shape is the same as the 350's, and his remote outranks a
 * product photograph, so the 350's single part with two halves stands.
 *
 * **No scan code**, for the reason `h350.ts` gives: nothing measured ties a key on this architecture to
 * a code.
 */
import { H350 } from './h350.ts';
import type { Key, Label, Model } from '../types.ts';

/** What one key becomes on the 300: a new name, new labels, a new accent, or any of them. */
interface Reprint {
  readonly name?: string;
  readonly labels?: readonly Label[];
  readonly accent?: string;
}

const below = (text: string): Label => ({ text, place: 'below', size: 'small' });

/** Keyed by the 350's key name. Every key not listed is printed the same on both. */
const REPRINT: Readonly<Record<string, Reprint>> = {
  TvAvr: { name: 'Tv', labels: [{ text: 'TV', place: 'on', size: 'tiny' }] },
  CableDvd: { name: 'CableSat', labels: [{ text: 'Cable/Sat', place: 'on', size: 'tiny' }] },
  BdMedia: { name: 'Dvd', labels: [{ text: 'DVD', place: 'on', size: 'tiny' }] },
  GameMp3: { name: 'VcrAux', labels: [{ text: 'VCR/Aux', place: 'on', size: 'tiny' }] },
  Power: { labels: [below('Power')] },
  // Two words stacked on one key; a label is one line, so two labels either side of the middle.
  Input: { labels: [{ text: 'TV', place: 'on', size: 'tiny', dy: -4 }, { text: 'Input', place: 'on', size: 'tiny', dy: 4 }] },
  // The 350's colour order is red, green, yellow, blue; the 300's is yellow, blue, red, green.
  Red: { name: 'Yellow', accent: '#d9c22b', labels: [below('A')] },
  Green: { name: 'Blue', accent: '#3b6fd4', labels: [below('B')] },
  Yellow: { name: 'Red', accent: '#d23c3c', labels: [below('C')] },
  Blue: { name: 'Green', accent: '#2f9e44', labels: [below('D')] },
  Dvr: { name: 'List', labels: [{ text: 'List', place: 'on', size: 'small' }] },
  SkipBack: { labels: [below('Replay')] },
  SkipForward: { labels: [below('Skip')] },
  Record: { labels: [below('Record')] },
  Stop: { labels: [below('Stop')] },
};

function reprint(key: Key): Key {
  const change = REPRINT[key.name];
  if (change === undefined) return key;
  return {
    ...key,
    ...(change.name === undefined ? {} : { name: change.name }),
    ...(change.labels === undefined ? {} : { labels: change.labels }),
    ...(change.accent === undefined ? {} : { accent: change.accent }),
  };
}

// The colour keys are renamed among themselves, so a rocker or a test naming a key by its 350 name
// would silently point at another key; none of the four is in a rocker, which this checks.
for (const rocker of H350.rockers ?? []) {
  for (const name of rocker.keys) {
    if (REPRINT[name]?.name !== undefined) throw new Error(`h300: ${name} is renamed but belongs to a rocker`);
  }
}

export const H300: Model = {
  ...H350,
  id: 'h300',
  label: 'Harmony 300',
  // Measured: a bench Harmony 300 enumerates with bcdDevice 0x1078, which is skin 78, section 195.
  skins: [78],
  keys: H350.keys.map(reprint),
  nameplate: { ...H350.nameplate!, text: 'Logitech' },
  captions: [
    { text: 'My Devices', place: 'on', x: 133.1, y: 96.5, size: 'small' },
    { text: 'Harmony 300', place: 'on', x: 132.8, y: 948, size: 'small' },
  ],
};
