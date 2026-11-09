/**
 * Our config reader against Logitech's, on the same remote, byte for byte.
 *
 * Every other test of `read.ts` checks it against itself or against a file this project produced, so
 * a reader that read one byte too few everywhere would agree with its own fixtures perfectly. This
 * file is the one place that is not true. The bytes on one side came off the spare Harmony One
 * through **Logitech's own client**, whose flash read, packet encoder and chunking have nothing to do
 * with ours, and the bytes on the other side came off the same unit through `readConfig`.
 *
 * Nothing here touches hardware. Both sides are files, and it skips without a lab.
 *
 * Section 215. The instrument that produced the vendor side is section 214.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';

const VENDOR = 'vendor_region_user_config';
const VENDOR_EMBEDDED = 'vendor_region_embedded_config';
const OURS = 'one_spare_before_sync';

/** Where our own reader stopped, which is the length the container declares. */
const OUR_LENGTH = 1232237;

/** The whole region, as the client's own table sizes it: `0x3C0000`. */
const REGION_BYTES = 3932160;

test('our reader and Logitech\'s agree on every byte of a config',
  lab.skipUnless(VENDOR, OURS), () => {
    const vendor = lab.require_(VENDOR);
    const ours = lab.require_(OURS);

    // Assert the lengths first, so a truncated fixture fails as a length rather than as a mismatch
    // three hundred kilobytes in.
    assert.equal(vendor.length, REGION_BYTES);
    assert.equal(ours.length, OUR_LENGTH);

    // The comparison. `deepEqual` on two megabyte arrays reports uselessly, so find the first
    // difference and say where it is: an offset is what makes a failure diagnosable.
    let firstDiff = -1;
    for (let i = 0; i < ours.length; i++) {
      if (vendor[i] !== ours[i]) { firstDiff = i; break; }
    }
    assert.equal(firstDiff, -1,
      firstDiff < 0 ? '' : `first difference at offset ${firstDiff}: ours 0x${ours[firstDiff]!
        .toString(16)}, theirs 0x${vendor[firstDiff]!.toString(16)}`);
  });

test('our reader stops on the end marker and the region carries on past it',
  lab.skipUnless(VENDOR), () => {
    const vendor = lab.require_(VENDOR);
    // Why our length is right rather than merely agreed: the four bytes before it are the end
    // marker, so the trim lands on a structure and not on a byte count somebody chose.
    assert.equal(new TextDecoder('latin1').decode(vendor.subarray(OUR_LENGTH - 4, OUR_LENGTH)),
      'PTYY');
    assert.equal(vendor[OUR_LENGTH], 0xff);
  });

test('the space past a config is not erased, which a writer may not assume',
  lab.skipUnless(VENDOR), () => {
    const vendor = lab.require_(VENDOR);
    const tail = vendor.subarray(OUR_LENGTH);
    assert.equal(tail.length, 2699923);

    let erased = 0;
    for (const b of tail) if (b === 0xff) erased++;

    // Assert the count rather than a bound under it: the interesting number is how much is **not**
    // erased, and a bound like "some of it is data" would pass on a single stray byte.
    assert.equal(erased, 2291889);
    assert.equal(tail.length - erased, 408034);

    // And where the remnant starts says what it is. The erased run after the config ends **exactly**
    // on a 64 KiB boundary, and old data runs from there to the last byte of the region. That is the
    // erase geometry showing through: the blocks the current config needed were erased and rewritten,
    // and every block past it was never touched. So this is a previous configuration, not noise.
    const firstRemnant = tail.findIndex((b) => b !== 0xff);
    assert.equal(OUR_LENGTH + firstRemnant, 0x130000);
    assert.equal((OUR_LENGTH + firstRemnant) % 0x10000, 0);
    assert.equal(tail[tail.length - 1] !== 0xff, true,
      'the remnant reaches the last byte of the region');
  });

test('the embedded config matches the one we cut out of a firmware image, on a different unit',
  lab.skipUnless(VENDOR_EMBEDDED, 'one_safemode'), () => {
    // **This test was titled "the lab has no other copy" and that was wrong**, section 215: the copy
    // is `one_safemode`. So the title is a claim, and the claim it makes now is the stronger one.
    // Two physical Harmony Ones, two implementations, no shared code: one container cut by us out of
    // the programmed unit's firmware image, one read by Logitech's client off the spare.
    const embedded = lab.require_(VENDOR_EMBEDDED);
    assert.equal(embedded.length, 122880);
    assert.equal(new TextDecoder('latin1').decode(embedded.subarray(0, 4)), 'GSPM');

    // The container is at offset 0 here and at 0x2000 of the firmware chunk there, because the region
    // read starts at flash 0x002000 and that is exactly where the container lives.
    const cut = lab.require_('one_safemode');
    const BODY = 8902;
    const AT = 0x2000;
    assert.deepEqual(
      Array.from(embedded.subarray(0, BODY)),
      Array.from(cut.subarray(AT, AT + BODY)),
    );

    // And it is not the user config, which is why both were kept.
    assert.notEqual(new TextDecoder('latin1').decode(embedded.subarray(0, 64)),
      new TextDecoder('latin1').decode(lab.require_(VENDOR).subarray(0, 64)));
  });
