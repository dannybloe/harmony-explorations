/**
 * The firmware image header and its checksum, which is how a remote decides whether an image runs.
 *
 * **This is a port of `src/harmony/firmware.py`, and it is here for one caller**: the reinstall
 * trigger in `remote.ts`, whose rail refuses unless the image staged in the remote's external flash
 * verifies. That check has to happen in the library rather than in a caller's assertion, because a
 * reinstall of an image that does not verify leaves the remote in safe mode with its application
 * erased, which is the one outcome worse than where it started. `test/firmware.test.ts` holds the two
 * copies to the same answers on lab images, so they cannot drift.
 *
 * The layout, `docs/findings.md` section 3 and Logitech's own `magicsection` in the per skin
 * firmware upgrade template:
 *
 * | offset | width | field |
 * |---|---|---|
 * | 0 | 2 | checksum, little endian |
 * | 2 | 2 | `0xFFFF` filler |
 * | 4 | 3 | `size - 8`, little endian, twenty four bits |
 * | 7 | 1 | version, one BCD digit each side of the point |
 * | 8 | 2 | the magic `0x48 0x47`, `HG` |
 *
 * The checksum XORs the even offset bytes into one seed and the odd offset bytes into another, over
 * offset 4 to the image's end, and stores them low then high.
 *
 * **The length is three bytes, and that is the remote's reading rather than ours.** The Python reader
 * took offset 4 as a sixteen bit field and offset 6 as a family byte, `0x00` on arch 12 and `0x01`
 * on arch 14, and recovers the length by trying every candidate sixteen bits allow. The Harmony
 * 700's safe mode image reads the three bytes at offset 4 as one number and adds 8, install routine
 * at `0x02B90`, section 295: so the "family byte" is the length's top byte, `0x01` on every image
 * here over 64 KiB, the Harmony 350's included, which is not arch 14. Trying candidates is ambiguous in a way
 * the remote is not: a synthetic image whose bytes repeat every 256 verified at two lengths, and a rail
 * built on the wrong one would approve an image the remote then copies at the other.
 */

/** The two seeds, even offsets and odd offsets. Their pair is the `0x4321` the template names. */
const SEED_EVEN = 0x21;
const SEED_ODD = 0x43;
const CHECKSUM_START = 4;
const HEADER_BYTES = 10;

/** The checksum an image would carry, over `[4, image.length)`, in the header's own byte order. */
export function firmwareImageChecksum(image: Uint8Array): number {
  let even = SEED_EVEN;
  let odd = SEED_ODD;
  for (let i = CHECKSUM_START; i + 1 < image.length; i += 2) {
    even ^= image[i] as number;
    odd ^= image[i + 1] as number;
  }
  return even | (odd << 8);
}

export interface FirmwareImageCheck {
  /** Whether bytes 8 and 9 are the `HG` magic. Without it nothing else here means anything. */
  readonly hasMagic: boolean;
  /** The version the header states, `2.5` for `0x25`. */
  readonly version: string;
  /** The length the header states, the three bytes at offset 4 plus 8. */
  readonly size: number;
  readonly storedChecksum: number;
  /** Over the stated length, or over the whole buffer when the stated length does not fit in it. */
  readonly computedChecksum: number;
  readonly verifies: boolean;
}

/**
 * Read an image's header out of `buffer` and say whether the image verifies.
 *
 * `buffer` may hold more than the image, which is what a region read produces. The length is the one
 * the header states, read the way the remote reads it, and the image verifies only if that length fits
 * in the buffer and the checksum over it matches.
 */
export function checkFirmwareImage(buffer: Uint8Array): FirmwareImageCheck {
  if (buffer.length < HEADER_BYTES) {
    throw new RangeError(`${buffer.length} bytes cannot hold a firmware header`);
  }
  const at = (i: number): number => buffer[i] as number;
  const storedChecksum = at(0) | (at(1) << 8);
  const stated = (at(4) | (at(5) << 8) | (at(6) << 16)) + 8;
  const versionByte = at(7);
  const version = `${versionByte >> 4}.${versionByte & 0x0f}`;
  const hasMagic = at(8) === 0x48 && at(9) === 0x47;
  const fits = stated <= buffer.length;
  const computedChecksum = firmwareImageChecksum(buffer.subarray(0, fits ? stated : buffer.length));
  return {
    hasMagic,
    version,
    size: stated,
    storedChecksum,
    computedChecksum,
    verifies: hasMagic && fits && computedChecksum === storedChecksum,
  };
}
