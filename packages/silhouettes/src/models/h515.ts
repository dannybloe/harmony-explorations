/**
 * The Harmony 515, skin 67, architecture 9.
 *
 * **The Harmony 525's drawing with three changes**, which is Danny's reading of the unit on the bench:
 * the case, the mouldings, every key shape and every other marking are the 525's, and only the
 * nameplate and the markings on two keys differ. So this file takes the 525's model and changes those
 * three rather than copying a single path, since two copies of a traced shape are two copies until one
 * of them moves.
 *
 * * The nameplate above the display reads `Harmony 515`.
 * * Mute and Prev carry the crossed out speaker and the return arrow, the `mute` and `back` symbols the
 *   Harmony 350, the Harmony One and the Harmony Touch use, where the 525 prints the words.
 *
 * The 525's scan code candidates for its soft keys come along with the shapes; they are read in the
 * 525's firmware, and whether the 515's matrix is the same is not checked.
 */
import { H525 } from './h525.ts';
import type { Key, Model } from '../types.ts';

/** The two keys whose words become symbols, and the symbol each carries. */
const SYMBOLS: Readonly<Record<string, { icon: string; markSize: number }>> = {
  VolumeMute: { icon: 'mute', markSize: 11 },
  PrevChannel: { icon: 'back', markSize: 13 },
};

const KEYS: readonly Key[] = H525.keys.map((key) => {
  const symbol = SYMBOLS[key.name];
  if (symbol === undefined) return key;
  const { labels: _words, ...rest } = key;
  return { ...rest, icon: symbol.icon, markSize: symbol.markSize } as Key;
});

export const H515: Model = {
  ...H525,
  id: 'h515',
  label: 'Harmony 515',
  skins: [67],
  keys: KEYS,
  nameplate: { ...H525.nameplate!, text: 'Harmony 515' },
};
