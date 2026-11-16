/**
 * The configuration container's trailer checksum, the one copy.
 *
 * **It lived in `packages/config/src/container/gspm.ts` until the file family's write rail needed it**,
 * the rail that guards a write to a Harmony 300 or 350. That rail, `assertFileFamilyContainer` in `packages/usb/src/rails.ts`,
 * refuses a container whose stored checksum does not recompute, and it has to compute the checksum
 * itself rather than be told: a rail that asks its caller is a rail the caller answers, section 225. So
 * the derivation moved to `packages/usb`, which the codec then depended on, and the codec re-exports it
 * under the same names. Now it is here, in the base both packages depend on, so the
 * codec no longer needs the transport to compute a checksum. One copy, reachable from both, which is
 * the rule; `packages/usb/src/trailer.ts` is a re-export of this file, not a second copy.
 *
 * Nothing here knows a family or an architecture. It is arithmetic over bytes, the same on every
 * container this project has read, which is why it can sit below the codec.
 */

/**
 * The trailer checksum's seed, written as two literals by the boot validator on all three images.
 * The checksum is a sixteen bit XOR of the container's little endian words from its first byte up
 * to the stored value, which sits six bytes from the end. The Harmony 300 and 350 firmware uses the same seed.
 *
 * @privateRemarks
 * `docs/findings.md` section 41. The 300 and 350's literals are read in `tests/harmony_300_350/test_harmony_350_file_write.py`.
 */
export const TRAILER_CHECKSUM_SEED = 0x4321;
/** From the end of the container, ahead of the four byte marker. */
export const TRAILER_CHECKSUM_OFFSET = 6;

/** Whether this machine stores a word's low byte first, which reading the bytes as 32 bit words relies on. */
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/**
 * Recompute a container's trailer checksum from its bytes.
 *
 * An odd trailing byte is not folded in, because the firmware divides the byte count by two and
 * counts words.
 *
 * @privateRemarks
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
  // **Two words at a time where the bytes allow it.** An XOR does not care how its terms are grouped, so the XOR of
  // the little endian 32 bit words holds the XOR of the even words in its low half and of the odd words in its high
  // half, and folding the halves together is the XOR of every word. That reads a megabyte in a quarter of the steps,
  // and the codec computes this on every parse and every restamp of a configuration it composes. It needs a view on a
  // four byte boundary and a little endian machine, which every machine running this is; otherwise, and for the one
  // word a pair leaves over, the word by word loop below does it, from where the pairs stopped.
  let offset = 0;
  if (LITTLE_ENDIAN && blob.byteOffset % 4 === 0 && end >= 4) {
    const pairs = end >>> 2;
    const words = new Uint32Array(blob.buffer, blob.byteOffset, pairs);
    let both = 0;
    for (let k = 0; k < pairs; k += 1) both ^= words[k]!;
    accumulator ^= (both & 0xffff) ^ (both >>> 16);
    offset = pairs << 2;
  }
  for (; offset + 1 < end; offset += 2) {
    accumulator ^= blob[offset]! | (blob[offset + 1]! << 8);
  }
  return accumulator;
}
