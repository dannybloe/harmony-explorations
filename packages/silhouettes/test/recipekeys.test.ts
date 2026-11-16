/**
 * **The words a family offers a document for its keys are the drawing's words for the same keys.**
 *
 * A recipe names a key a person chose otherwise by Logitech's word for it, `RecipeKey` in the codec, and the family
 * that builds for the model turns the word into its own scan, `Family.recipeKeys`. An application finds and colours
 * the key on the drawing by the same word, `data-name`. So the two have to agree: a family word that is the drawing's
 * word for another key would have a person click Mute and the build bind another key.
 *
 * **Why the test is here and not in the codec.** The codec may not depend on this package, which depends on the
 * codec for development only, the `architecture` skill's package table; so the comparison sits on the drawing's side
 * and asks the codec's main entry for the family, through the registry, as an application would.
 *
 * **What is claimed, for the Harmony One, the one family that builds a key's choice.** Of its 37 words, 36 name the
 * key the drawing carries at the same scan, `data-scan`; the 37th, `Enter`, is a key the drawing names and carries no
 * scan for, and its scan, 13, is argued in the family's table, `families/harmony-one/recipekeys.ts`. No word names a
 * key the drawing does not have, and none names another key than the drawing's at its scan. The other way round, every
 * keypad key the drawing gives a scan is a key the family offers. Counts exact.
 *
 * **Control**: the same comparison over the family's words with two scans swapped, and with one word misspelt, finds
 * each.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chooseByModel } from '@freeharmony-sdk/config';

import { ONE, keyOf, keyOfScan } from '../src/index.ts';
import type { Model } from '../src/types.ts';

/** How a family's words for its keys stand against a model's drawing. */
interface Comparison {
  /** Words the drawing gives the key at the word's scan. */
  readonly sameScan: string[];
  /** Words the drawing names on a key it carries no scan for, so only the family states the scan. */
  readonly drawnWithoutScan: string[];
  /** Words no key of the drawing carries. */
  readonly notDrawn: string[];
  /** Words whose scan the drawing gives another key, or that the drawing puts at another scan, each with both. */
  readonly differs: string[];
  /** Keypad keys the drawing gives a scan the family offers no word for. */
  readonly notOffered: string[];
}

function compare(model: Model, words: readonly string[], scanOf: (word: string) => number | undefined): Comparison {
  const out: Comparison = { sameScan: [], drawnWithoutScan: [], notDrawn: [], differs: [], notOffered: [] };
  for (const word of words) {
    const scan = scanOf(word);
    const atScan = scan === undefined ? undefined : keyOfScan(model, scan);
    const byName = keyOf(model, word);
    if (atScan !== undefined) {
      if (atScan.name === word) out.sameScan.push(word);
      else out.differs.push(`${word} at scan ${String(scan)}, where the drawing has ${atScan.name}`);
    } else if (byName === undefined) {
      out.notDrawn.push(word);
    } else if (byName.scan === undefined) {
      out.drawnWithoutScan.push(word);
    } else {
      out.differs.push(`${word} at scan ${String(scan)}, where the drawing has it at ${byName.scan}`);
    }
  }
  const offered = new Set(words.map(scanOf));
  for (const key of model.keys) {
    if (key.kind === 'keypad' && key.scan !== undefined && !offered.has(key.scan)) out.notOffered.push(key.name);
  }
  return out;
}

/** The Harmony One family's words and the scan of each, from the codec's main entry, as an application asks. */
function oneFamilyKeys(): { readonly words: readonly string[]; readonly scanOf: (word: string) => number | undefined } {
  const { family } = chooseByModel({ name: 'Harmony One', skin: 54 });
  assert.ok(family.kind === 'compiled' && family.recipeKeys !== undefined, 'the Harmony One family builds key choices');
  const builder = family.recipeKeys;
  return { words: builder.keys, scanOf: (word) => builder.scanOf(word) };
}

test('the Harmony One family\'s 37 words for its keys are the drawing\'s: 36 at the drawing\'s own scan, Enter on a key the drawing carries no scan for, and none other', () => {
  const { words, scanOf } = oneFamilyKeys();
  assert.equal(words.length, 37);
  const found = compare(ONE, words, scanOf);
  assert.equal(found.sameScan.length, 36);
  assert.deepEqual(found.drawnWithoutScan, ['Enter']);
  assert.deepEqual(found.notDrawn, []);
  assert.deepEqual(found.differs, []);
  // Every keypad key the drawing gives a scan is one the family offers: the drawing has 36 such keys, all of them.
  assert.deepEqual(found.notOffered, []);
  assert.equal(ONE.keys.filter((key) => key.kind === 'keypad' && key.scan !== undefined).length, 36);
  // The scan the family gives Enter is the one keypad scan of 1 to 40 the drawing gives no key and the family binds.
  assert.equal(scanOf('Enter'), 13);
  assert.equal(keyOfScan(ONE, 13), undefined);
});

test('control: the comparison finds two words swapped between scans, and a word the drawing does not carry', () => {
  const { words, scanOf } = oneFamilyKeys();
  const swapped = (word: string): number | undefined =>
    (word === 'VolumeUp' ? scanOf('VolumeDown') : word === 'VolumeDown' ? scanOf('VolumeUp') : scanOf(word));
  const found = compare(ONE, words, swapped);
  assert.deepEqual(found.differs, ['VolumeUp at scan 4, where the drawing has VolumeDown', 'VolumeDown at scan 3, where the drawing has VolumeUp']);
  assert.equal(found.sameScan.length, 34);
  // The mute key written as the catalogue's command name, Mute, rather than the key's word, VolumeMute.
  const misspelt = words.map((word) => (word === 'VolumeMute' ? 'Mute' : word));
  const again = compare(ONE, misspelt, (word) => scanOf(word === 'Mute' ? 'VolumeMute' : word));
  assert.deepEqual(again.differs, ['Mute at scan 9, where the drawing has VolumeMute']);
});
