/**
 * The Harmony 300 in its US printing, skin 78, the Harmony 350's sibling: the same case, the same 55 keys in
 * the same places, and different printing on some of them. The European printing, skin 79, is `h300eu.ts`,
 * which takes the machinery below and states its own printing.
 *
 * **The geometry is the Harmony 350's and is not copied.** A statement made holding both remotes:
 * the two are exactly the same moulding with the labels different here and there. The Harmony 300 setup
 * guide's own button drawing is a raster image, so it could not be read the way the 350's vector page
 * was, and tracing it by hand would only have produced a second, worse copy of shapes that are the same
 * part. So every key, rocker, bay and the case come from `H350` by reference, and this file states only
 * what is printed differently. A change to a 350 shape moves the 300 with it, which is the point.
 *
 * **The printing is read off the cover photograph of the Harmony 300 setup guide**, PDF page 2 of
 * `Docs/300 manual.pdf` in the lab, which shows the whole face of the US model. What differs from the 350:
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
 * Harmony 600. The statement made holding both is that the shape is the same as the 350's, and a remote
 * in the hand outranks a product photograph, so the 350's single part with two halves stands.
 *
 * **No scan code on this printing.** A European Harmony 300 was pressed key by key with the receiver
 * listening, and 49 of its keys came out on the code of the 350 key in the same place,
 * `packages/bench/test/keys300.test.ts`; `h300eu.ts` carries them. No US unit has been pressed, and the US
 * printing puts other colours on the colour keys than the European one, so no code is drawn here: that the
 * US keys raise the same codes by place is the moulding's inference and not a measurement. `reprintKeys`
 * drops the codes and the candidates the 350 carries. This said that no Harmony 300 had been pressed until
 * `todo-compile-300.md` 2.2.
 */
import { H350 } from './h350.ts';
import type { Key, Label, Model, ScanSource } from '../types.ts';

/** What one key becomes on a 300: a new name, new labels, a new accent, a symbol, or any of them. */
export interface Reprint {
  readonly name?: string;
  readonly labels?: readonly Label[];
  readonly accent?: string;
  readonly icon?: string;
  readonly markSize?: number;
}

export const below = (text: string): Label => ({ text, place: 'below', size: 'small' });

/**
 * What both printings of the 300 print alike, keyed by the 350's key name. Every key not listed is printed
 * as on the 350. The person holding the European unit named the colour keys and the favourite block as
 * where it differs from the US printing, and nothing else.
 */
export const COMMON: Readonly<Record<string, Reprint>> = {
  TvMedia: { name: 'Tv', labels: [{ text: 'TV', place: 'on', size: 'tiny' }] },
  CablePc: { name: 'CableSat', labels: [{ text: 'Cable/Sat', place: 'on', size: 'tiny' }] },
  AvrGame: { name: 'Dvd', labels: [{ text: 'DVD', place: 'on', size: 'tiny' }] },
  DvdMusic: { name: 'VcrAux', labels: [{ text: 'VCR/Aux', place: 'on', size: 'tiny' }] },
  Power: { labels: [below('Power')] },
  // Two words stacked on one key; a label is one line, so two labels either side of the middle.
  Input: { labels: [{ text: 'TV', place: 'on', size: 'tiny', dy: -4 }, { text: 'Input', place: 'on', size: 'tiny', dy: 4 }] },
  Dvr: { name: 'List', labels: [{ text: 'List', place: 'on', size: 'small' }] },
  SkipBack: { labels: [below('Replay')] },
  SkipForward: { labels: [below('Skip')] },
  Record: { labels: [below('Record')] },
  Stop: { labels: [below('Stop')] },
};

/** The US printing: the common one, and the colour keys in their own order, lettered. */
const REPRINT: Readonly<Record<string, Reprint>> = {
  ...COMMON,
  // The 350's colour order is red, green, yellow, blue; the US 300's is yellow, blue, red, green.
  Red: { name: 'Yellow', accent: '#d9c22b', labels: [below('A')] },
  Green: { name: 'Blue', accent: '#3b6fd4', labels: [below('B')] },
  Yellow: { name: 'Red', accent: '#d23c3c', labels: [below('C')] },
  Blue: { name: 'Green', accent: '#2f9e44', labels: [below('D')] },
};

/**
 * The 350's keys reprinted by `table`, with the codes `heard` gives by the new names, each from `source`.
 *
 * The 350's own codes and candidates are dropped first: they are a measurement on a 350, so none crosses to
 * a 300's drawing except through a measurement on a 300, which is what `heard` is.
 */
export function reprintKeys(
  table: Readonly<Record<string, Reprint>>,
  heard: Readonly<Record<string, number>> = {},
  source?: ScanSource,
): Key[] {
  // A key renamed is looked up by its 350 name, so a rocker naming it would silently point at another key;
  // none of the renamed keys is in a rocker, which this checks.
  for (const rocker of H350.rockers ?? []) {
    for (const name of rocker.keys) {
      if (table[name]?.name !== undefined) throw new Error(`h300: ${name} is renamed but belongs to a rocker`);
    }
  }
  const keys = H350.keys.map((drawn): Key => {
    const { scan: _scan, scanFrom: _scanFrom, scanCandidates: _candidates, ...key } = drawn;
    const change = table[key.name];
    const named: Key = change === undefined ? key : {
      ...key,
      ...(change.name === undefined ? {} : { name: change.name }),
      ...(change.labels === undefined ? {} : { labels: change.labels }),
      ...(change.accent === undefined ? {} : { accent: change.accent }),
      ...(change.icon === undefined ? {} : { icon: change.icon }),
      ...(change.markSize === undefined ? {} : { markSize: change.markSize }),
    };
    const scan = heard[named.name];
    if (scan === undefined) return named;
    if (source === undefined) throw new Error(`h300: ${named.name} carries a code with no source`);
    return { ...named, scan, scanFrom: source };
  });
  // Every heard code lands on a key, so a name misspelled in `heard` fails here rather than vanishing.
  for (const name of Object.keys(heard)) {
    if (!keys.some((k) => k.name === name)) throw new Error(`h300: a code for ${name}, which is no key`);
  }
  return keys;
}

export const H300: Model = {
  ...H350,
  id: 'h300',
  label: 'Harmony 300',
  // Skin 78, the Harmony 300, Logitech's name for the US model. Skin 79, the Harmony 300 EMEA, prints
  // differently and has its own drawing, `h300eu.ts`. This drawing served both from 9 October 2026, after it
  // had listed 78 alone and a drawing looked up by the skin a European remote states, 79, found nothing,
  // until a person holding a skin 79 unit said its colour keys and favourite block differ from this
  // printing, `todo-compile-300.md` 2.2.
  skins: [78],
  keys: reprintKeys(REPRINT),
  nameplate: { ...H350.nameplate!, text: 'Logitech' },
  captions: [
    { text: 'My Devices', place: 'on', x: 133.1, y: 96.5, size: 'small' },
    { text: 'Harmony 300', place: 'on', x: 132.8, y: 948, size: 'small' },
  ],
};
