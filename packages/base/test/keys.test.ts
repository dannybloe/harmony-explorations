/**
 * The tables of where a running remote keeps the key being pressed, `src/keys.ts`.
 *
 * Moved here from `watch-keys.test.ts` with the tables, when the key reader page became their second
 * reader. What is pinned is the tables' shape and the one property both readers rely on, not the
 * addresses' truth: the arch 8 ones are read in the images and the 885's measured on two units in
 * `tests/harmony_880_885/test_harmony_885_keys.py`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCH_8_PRODUCT, WATCH, WATCH_BY_SKIN } from '../src/keys.ts';
import { MODELS_BY_SKIN } from '../src/models.ts';

test('arch 8 has exactly four skins with an entry', () => {
  assert.deepEqual(Object.keys(WATCH_BY_SKIN).map(Number), [15, 17, 39, 44]);
});

test('every arch 8 entry is a pair, the key held first and the last key pressed second', () => {
  // The key reader page reads the first as "held, zero when none" and the second as "last pressed", so a
  // third address or a swapped pair would show the wrong thing without failing anywhere else.
  for (const [skin, watch] of Object.entries(WATCH_BY_SKIN)) {
    assert.equal(watch.addresses.length, 2, `skin ${skin}`);
    assert.equal(watch.addresses[1], 0x03a1, `skin ${skin}: the copy nothing clears`);
  }
});

test('every skin with an entry is an arch 8 model in the skin table', () => {
  // The page refuses a remote whose architecture is not the product's, and then looks the skin up here;
  // an entry for a skin of another architecture would be a table answering for a remote it was not read on.
  for (const skin of Object.keys(WATCH_BY_SKIN).map(Number)) {
    assert.equal(MODELS_BY_SKIN[skin]?.architecture, 8, `skin ${skin}`);
  }
});

test('the arch 8 product id is not a key of the table by product', () => {
  assert.equal(ARCH_8_PRODUCT, 0xc110);
  assert.equal(WATCH[ARCH_8_PRODUCT], undefined);
});

test('the module imports nothing, so a browser can load it', () => {
  // The reason it is a module of its own. An import here would reach the page as a file nobody chose to
  // publish, and an import of the barrel would reach for node-hid.
  const source = readFileSync(new URL('../src/keys.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
});
