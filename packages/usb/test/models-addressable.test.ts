/**
 * The model table against what `packages/usb` can address, the one test of the table that needs the
 * transport, `packages/base/test/models.test.ts` holding the rest.
 *
 * It sat in that file until `todo.md` 7.3.4 moved the table to `packages/base`, whose tests may not import
 * this package. The claim is about the join between the two, so it stays with the side that owns the
 * address rules.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegionByte, ADDRESSABLE_ARCHITECTURES } from '../src/internal.ts';
import { MODELS_BY_SKIN } from '@harmony/base/models';

test('a model states an architecture this library may not be able to address', () => {
  // The docstring said "only architectures `packages/usb` can address are here", and the table
  // carries 2, 3, 7, 8 and 10, none of which has an entry in `FLASH_TOP_BYTE_BOUND` or a window
  // table. The direction is safe, since `regionOf` then refuses every address, and the sentence is
  // what a caller trusts when deciding whether the field is usable. Corrected to say enumerate
  // rather than address, and pinned here. Section 139.
  const stated = new Set(Object.values(MODELS_BY_SKIN).map((m) => m.architecture));
  const addressable = new Set(ADDRESSABLE_ARCHITECTURES);
  const unaddressable = [...stated].filter((a) => !addressable.has(a)).sort((a, b) => a - b);
  // The exact set, not "some": it moves when a model is added or an address rule is read, and then
  // it moves in the diff.
  assert.deepEqual(unaddressable, [2, 3, 7, 10]);
  assert.deepEqual([...addressable].sort((a, b) => a - b), [8, 9, 12, 14]);
  // And the consequence, so the claim is about behaviour rather than about two lists: an
  // unaddressable architecture refuses every top byte rather than borrowing a neighbour's rule.
  for (const architecture of unaddressable) {
    assert.throws(() => validateRegionByte(0x04, architecture));
  }
});
