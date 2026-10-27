/**
 * The configuration container's trailer checksum, the one copy.
 *
 * **It lived in `packages/codec/src/gspm.ts` until the file family's write rail needed it**,
 * `todo-compile-350.md` 1.6. That rail, `assertFileFamilyContainer` in `rails.ts`, refuses a
 * container whose stored checksum does not recompute, and it has to compute the checksum itself rather
 * than be told: a rail that asks its caller is a rail the caller answers, section 225. The codec
 * depends on this package and not the other way round, so the derivation moved here and the codec
 * re-exports it under the same names. One copy, reachable from both, which is the rule; a second copy
 * in this package would have been two copies until one of them moved.
 *
 * Nothing here knows a family or an architecture. It is arithmetic over bytes, the same on every
 * container this project has read, which is why it can sit below the codec.
 */

/**
 * The trailer checksum's seed, written as two literals by the boot validator on all three images.
 * The checksum is a sixteen bit XOR of the container's little endian words from its first byte up
 * to the stored value, which sits six bytes from the end. `docs/findings.md` section 41.
 *
 * The Harmony 300 and 350 firmware writes the same two literals in its own validator, read in
 * `tests/test_harmony_350_file_write.py`, so the seed covers that family too.
 */
export const TRAILER_CHECKSUM_SEED = 0x4321;
/** From the end of the container, ahead of the four byte marker. */
export const TRAILER_CHECKSUM_OFFSET = 6;

/**
 * Recompute a container's trailer checksum from its bytes.
 *
 * An odd trailing byte is not folded in, because the firmware divides the byte count by two and
 * counts words.
 *
 * This said "no container in the corpus has an odd body"<!--superseded--> and called that the
 * firmware's behaviour rather than a tested one, and both halves were wrong. **19 of the 33 parseable
 * containers here have an odd extent**, spanning arch 8, 9, 10, 12 and 14, and 14 of them verify
 * their stored checksum under exactly this loop. So the behaviour is tested, by more than half the
 * corpus, and it is the comment that was untested. The direction of the error is what makes it worth
 * correcting rather than deleting: it invited a reader to fold the last byte in on the grounds that
 * nothing would catch it, and folding it in breaks fourteen containers at once.
 */
export function trailerChecksum(blob: Uint8Array): number {
  let accumulator = TRAILER_CHECKSUM_SEED;
  const end = blob.length - TRAILER_CHECKSUM_OFFSET;
  for (let offset = 0; offset + 1 < end; offset += 2) {
    accumulator ^= blob[offset]! | (blob[offset + 1]! << 8);
  }
  return accumulator;
}
