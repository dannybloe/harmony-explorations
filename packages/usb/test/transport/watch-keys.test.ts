/**
 * The default addresses `watch-keys.ts` watches, chosen without a remote. The tables themselves are
 * `packages/base/src/keys.ts` and pinned in `keys.test.ts`; this file pins the choice made from `bcdDevice`.
 *
 * What is pinned is the choice, not the addresses' truth: the arch 8 ones are read in the images and the
 * 885's measured on two units in `tests/harmony_880_885/test_harmony_885_keys.py`, and the others have their own readings
 * in the comments of `keys.ts`. The point of these tests is that the arch 8 product id, which five models
 * share, never picks an address by itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCH_8_PRODUCT, WATCH } from '../../src/keys.ts';
import { defaultWatch } from '../../bin/watch-keys.ts';
import { proves } from '@harmony/testkit/proof';

test('an 880, an 885 and an 880 Pro watch the held key at 0x295 and the last pressed at 0x3a1', () => {
  proves(67, ['harmony-885'], ['docs/test-notes/harmony-885.md#5-november-2026-every-key-pressed-watched-over-usb']);
  // `bcdDevice` on arch 8 is protocol 8 in the high byte and the skin in plain binary below it.
  for (const [release, name] of [
    [0x080f, 'Harmony 880'],
    [0x0811, 'Harmony 885'],
    [0x0827, 'Harmony 880 Pro'],
  ] as const) {
    const watch = defaultWatch(ARCH_8_PRODUCT, release);
    assert.equal(watch?.name, name);
    assert.deepEqual(watch?.addresses, [0x0295, 0x03a1]);
  }
});

test('a 720 shares the product id and watches 0x296 instead', () => {
  assert.deepEqual(defaultWatch(ARCH_8_PRODUCT, 0x082c)?.addresses, [0x0296, 0x03a1]);
});

test('the arch 8 product id alone gives no default', () => {
  // No bcdDevice, a 785 (skin 45, no image read), and a word that names no skin at all.
  assert.equal(defaultWatch(ARCH_8_PRODUCT, undefined), undefined);
  assert.equal(defaultWatch(ARCH_8_PRODUCT, 0x082d), undefined);
  assert.equal(defaultWatch(ARCH_8_PRODUCT, 0x0a11), undefined);
  assert.equal(WATCH[ARCH_8_PRODUCT], undefined);
});

test('the entries keyed by product id are unchanged and ignore bcdDevice', () => {
  // Including the 600's entry on a 700's word, 0x1066: the gap the script's comment names, pinned here
  // as it stands so that closing it is a visible change.
  assert.deepEqual(defaultWatch(0xc122, 0x1066)?.addresses, [0x073d]);
  assert.deepEqual(defaultWatch(0xc122, 0x1071)?.addresses, [0x073d]);
  assert.deepEqual(defaultWatch(0xc121, undefined)?.addresses, [0x02fb, 0x0202]);
  assert.deepEqual(defaultWatch(0xc111, 0x0916)?.addresses, [0x02de, 0x03c8]);
  // A product id nothing is read for, whatever its word.
  assert.equal(defaultWatch(0x1234, 0x1072), undefined);
});
