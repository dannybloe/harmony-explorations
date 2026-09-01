/**
 * The parts of the write rehearsal that can be decided without a remote on the cable.
 *
 * `bin/rehearse-block.ts` is the script; this is the arithmetic and the wording it uses, kept here
 * so both are testable with no device present. That split is the same one `writes.ts` makes for the
 * packets: building a plan is not permission to carry it out, and a thing with a rule in it is worth
 * a test even when its only caller is a bench script.
 *
 * **Deliberately not exported from the package barrel.** Nothing outside the rehearsal needs it, and
 * `index.ts` is what a consumer of `@harmony/usb` sees. The precedent and the reasoning are
 * `writes.ts`, one level stricter: there the barrel had to stay clean because the encoders build
 * writes, here it is only that a public API should not grow a bench concern.
 */

/**
 * The nominal size of the flash part, per architecture, for deciding which reads are on the chip.
 *
 * **This is not a rail and must not become one.** It bounds a diagnostic read, so being wrong costs
 * a skipped check rather than a write in the wrong place, which is why it can sit here on weaker
 * provenance than anything in `rails.ts`. Arch 12 (Harmony One) is 4 MiB, the nominal part size the
 * memory map states and the figure `WRITABLE_CEILING` is explicitly **not**, that one being
 * `0x3D0000` because the stored application firmware sits below the top.
 */
export const NOMINAL_FLASH_SIZE: Readonly<Record<number, number>> = {
  12: 0x400000,
};

/**
 * The blocks either side of `block`, which is what says whether an erase stayed inside its own.
 *
 * **The hazard this serves is named in `rails.ts` and nothing checked it.** `ERASE_FLASH` carries an
 * address and no count, so the hardware decides how much goes, and `ERASE_BLOCK_SIZE` is Logitech's
 * client's word rather than a measurement: the client picks a block table from the chip's JEDEC ids
 * and every row it lists against arch 12 (Harmony One) is uniform 64 KiB above `0x010000`. That
 * docstring ends by saying what it does not protect, by name: a rehearsal that reads back and
 * restores exactly one block, because if the true sector were larger the erase would reach past what
 * gets rewritten and the run would not notice, having only ever looked at the block it wrote.
 *
 * Reading both neighbours before the erase and again after it turns that assumption into a
 * measurement, on the first run, with no write and no reliance on the client's table. It catches a
 * sector larger than believed whichever half of it the named block turns out to be.
 *
 * Neighbours that are not wholly on the chip are dropped rather than clamped, since half a block
 * compared against half a block says nothing about the other half. The caller reports what it
 * skipped: a check that quietly examines less than it claims is the shape this repository refuses
 * everywhere else.
 */
export function neighbourBlocks(block: number, blockSize: number, flashSize: number): number[] {
  const out: number[] = [];
  if (block - blockSize >= 0) out.push(block - blockSize);
  if (block + 2 * blockSize <= flashSize) out.push(block + blockSize);
  return out;
}

/**
 * The one line to print for a failure, and the sentence the operator needs after it.
 *
 * **The message matters most exactly where the script had no handler for it.** Its catch translated
 * a rail refusal and its own `Refusal` and rethrew everything else, so the class that arrives when a
 * write is not acknowledged, whose own text is "what reached the device is unknown", surfaced as an
 * unhandled rejection with a stack. That is the moment an operator is deciding whether to unplug.
 *
 * `pastTheErase` is the whole reason this takes an argument: before the erase every failure is
 * harmless and telling somebody not to unplug would be noise that teaches them to ignore the line
 * when it is true.
 */
export function failureLine(message: string, pastTheErase: boolean): string {
  if (!pastTheErase) return message;
  return `${message}\n`
    + 'The block was erased and may not have been written. Do not unplug the remote and do not '
    + 'take its batteries out: rerun this script with the same arguments, which erases and writes '
    + 'the block again. If it cannot be rerun, the unit needs its configuration restored from the '
    + 'lab dump, which is the route docs/adding-a-device.md phase 8 has never exercised.';
}

/**
 * Which erase blocks two same length images differ in, as flash addresses.
 *
 * **The arithmetic a config writer gets wrong quietly.** A same length edit changes a handful of
 * bytes and a container is over a megabyte, so writing all of it would be twenty six erase cycles to
 * change two; writing the blocks that differ is the whole design. What that turns on is a boundary:
 * a difference at the last byte of one block and the first of the next is two blocks, and a reader
 * that rounded the wrong way would erase one of them and leave the other holding the old byte, which
 * every per block read back would pass.
 *
 * `base` is the flash address `dump[0]` sits at. Both images must be the same length, because a
 * shorter target is not a same length edit and the caller has already refused it; asking here rather
 * than clamping is deliberate, since clamping would silently ignore the tail.
 *
 * Here rather than in the script for the reason the rest of this file is: it decides what gets
 * erased and it needs no remote to check.
 */
export function blocksDiffering(
  dump: Uint8Array,
  target: Uint8Array,
  base: number,
  blockSize: number,
): number[] {
  if (dump.length !== target.length) {
    throw new Error(`comparing ${dump.length} bytes with ${target.length}`);
  }
  if (blockSize <= 0) throw new Error(`a block is ${blockSize} bytes`);
  const out: number[] = [];
  for (let at = 0; at < dump.length; at += 1) {
    if (dump[at] === target[at]) continue;
    const block = base + Math.floor(at / blockSize) * blockSize;
    out.push(block);
    // Skip to the last byte of this block; the loop's own increment moves past it. One difference
    // inside a block is enough to name it, and the next iteration starts in the next block, so a
    // block cannot be named twice and the dedupe this used to do is unnecessary.
    at = block - base + blockSize - 1;
  }
  return out;
}
