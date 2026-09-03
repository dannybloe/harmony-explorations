/**
 * Erase one flash block and write it, with every check that has to happen around those two commands.
 *
 * **Extracted from `bin/rehearse-block.ts` on 1 September 2026 so that a second write caller cannot
 * be a second copy of this sequence.** That script performed this project's first writes and the
 * order of its steps is the argument, not an implementation detail: the neighbours are read before
 * the erase because `ERASE_FLASH` carries no count, the erase is verified as all ones before
 * anything is written because flash only clears bits, and the block above is checked again after
 * the write because a write announces its address and the remote advances from there. A caller that
 * re-derived any of that would get a plausible sequence with a hole in it.
 *
 * **Deliberately not exported from the package barrel**, like `rehearsal.ts` and `writes.ts`: it
 * takes a `WritePermission` and drives an open remote, so it is the write path rather than an API a
 * consumer of `@harmony/usb` should reach. `rails.ts` still guards every command it sends.
 *
 * It does not decide **what** the block should hold, or which blocks there are, or whether the
 * device matched a dump first. Those belong to the caller, because they differ: the rehearsal
 * restores one block from a dump of the unit, and the config writer puts a container we produced
 * across however many blocks it lands in.
 */
import type { HarmonyRemote } from './remote.ts';
import type { WritePermission } from './rails.ts';
import { writeChunkLengths } from './writes.ts';

/**
 * A single transfer's size, which is **both working implementations' number and not ours**.
 *
 * 3150 bytes is 50 packets of 63, and it is what Logitech's own client sends per announce, section
 * 213, and what concordance caps a chunk at, `max_chunk_len` in its `CRemote::WriteFlash` for every
 * protocol but the seven byte one, where it is 749 and is 107 packets of 7. Two implementations that
 * share no code and were written years apart agree on the byte, which is as strong as agreement gets
 * here.
 *
 * **This was 0x8000 until 3 September 2026 and that was reasoned from the wrong end.** The announce
 * carries a 16 bit count, so 65535 is the hard limit, and half of it splits a 64 KiB erase block into
 * two equal transfers. Both true, and neither is evidence about what a remote will accept: it made
 * our transfers **10.4 times longer** than anything the vendor or concordance has ever sent one. Two
 * writes that afternoon broke off part way through a block, once with the host unable to hand the
 * remote a packet at all and once with the remote rebooting under the next read, and a burst ten
 * times longer than the only two known good implementations use is the first thing to suspect.
 * Section 245.
 *
 * The cost is 21 transfers per block instead of 2, so 21 acknowledgement round trips instead of 2 and
 * about the same number of reports. What it buys is that a failure loses at most 3150 bytes of
 * progress rather than 32768, and that our write path stops being the only one of three doing
 * something nobody has seen a remote accept.
 */
export const MAX_TRANSFER = 3150;

/** A refusal from this sequence, so a caller can tell it from a transport error. */
export class BlockWriteError extends Error {}

/**
 * The first index at which two equal length buffers differ.
 *
 * It demands equal lengths rather than returning `Math.min` of the two, which is what it did in the
 * script this came from: every caller immediately indexes the result to print the differing bytes,
 * so an index one past the end of the shorter buffer was a report that could not be produced.
 */
export function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) {
    throw new BlockWriteError(`comparing ${a.length} bytes with ${b.length}, which is a bug`);
  }
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

/** How a transfer is split, printable before a commit so a dry run can state the plan. */
export function transfersFor(block: number, blockSize: number): { address: number; length: number }[] {
  const out: { address: number; length: number }[] = [];
  for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
    out.push({ address: block + done, length: Math.min(MAX_TRANSFER, blockSize - done) });
  }
  return out;
}

/** How many reports a plan costs, which is what a dry run quotes at the operator. */
export function reportCount(transfers: readonly { length: number }[]): number {
  return transfers.reduce((n, t) => n + writeChunkLengths(t.length).length + 2, 0);
}

export interface BlockWrite {
  remote: HarmonyRemote;
  permission: WritePermission;
  /** The block's flash address, which the rails require to be block aligned and inside the region. */
  block: number;
  blockSize: number;
  /** Exactly `blockSize` bytes: what the block must hold when this returns. */
  content: Uint8Array;
  /** The blocks either side that are wholly on the chip, from `neighbourBlocks`. */
  neighbours: readonly number[];
  readBlock(address: number): Promise<Uint8Array>;
  log(line: string): void;
  /**
   * Called `true` the instant before the erase goes out and `false` once the block is verified.
   *
   * The caller owns it because it decides what an operator is told on a failure or a Ctrl-C, and
   * only the caller has a signal handler. Set before the command is sent rather than after it comes
   * back: an erase that fails halfway is still an erase that happened.
   */
  onPastTheErase(value: boolean): void;
  /**
   * Whether the caller holds known good content for a block, used only in a refusal's wording.
   *
   * It exists because the one failure this sequence cannot undo, an erase that reached a
   * neighbouring block, has two very different consequences depending on the answer, and the
   * operator needs to be told which one they are in at the moment it happens.
   */
  coversBlock(address: number): boolean;
  /** What the caller's known good content is called, for the same refusal. */
  sourceName: string;
}

/**
 * Erase the block and write `content` into it, verifying at every step that can fail silently.
 *
 * Throws `BlockWriteError` on anything that means the block is not what was asked for. After a throw
 * past the erase the block is in an unknown state and the caller's failure handler is what says so.
 */
export async function writeBlock(w: BlockWrite): Promise<void> {
  if (w.content.length !== w.blockSize) {
    throw new BlockWriteError(
      `content is ${w.content.length} bytes and the block is ${w.blockSize}`,
    );
  }
  if (w.neighbours.length === 0) {
    throw new BlockWriteError('no neighbouring block can be read, so nothing would measure how far '
      + 'the erase reached, and how far it reaches is the one thing about it this project has never '
      + 'confirmed. Refusing to erase.');
  }

  const before = new Map<number, Uint8Array>();
  for (const neighbour of w.neighbours) {
    w.log(`reading neighbour 0x${neighbour.toString(16)} as a baseline`);
    before.set(neighbour, await w.readBlock(neighbour));
  }

  w.log(`erasing 0x${w.block.toString(16)}`);
  w.onPastTheErase(true);
  await w.remote.eraseFlash(w.permission, w.block);
  const erased = await w.readBlock(w.block);
  const notErased = erased.findIndex((b) => b !== 0xff);
  if (notErased >= 0) {
    throw new BlockWriteError(`the erase left 0x${erased[notErased]!.toString(16)} at `
      + `0x${(w.block + notErased).toString(16)}, so it did not take. The block is in an unknown `
      + 'state.');
  }
  w.log('erased, and the block reads back as all ones');

  for (const neighbour of w.neighbours) {
    const was = before.get(neighbour);
    if (was === undefined) {
      throw new BlockWriteError(`no baseline for 0x${neighbour.toString(16)}, which is a bug here`);
    }
    const moved = firstDifference(await w.readBlock(neighbour), was);
    if (moved !== undefined) {
      const at = neighbour + moved;
      throw new BlockWriteError(`the erase changed 0x${at.toString(16)}, which is in the `
        + `neighbouring block 0x${neighbour.toString(16)} and outside the block it was told to `
        + `erase. So the erase sector on this chip is larger than the 0x${w.blockSize.toString(16)} `
        + "bytes this project has assumed, which was Logitech's client's word and has never been "
        + 'measured. '
        + (w.coversBlock(neighbour)
          ? `${w.sourceName} covers that block, so its content is recoverable, but not by this `
            + 'run: it writes one block and this needs a plan for two.'
          : 'The known good content does not cover that block, so what was there is not recoverable '
            + 'from it. Stop and read docs/adding-a-device.md phase 8 before touching this unit '
            + 'again.'));
    }
  }
  if (w.neighbours.length === 2) {
    w.log('the erase stayed inside its own block, measured on both sides');
  }

  for (const transfer of transfersFor(w.block, w.blockSize)) {
    const from = transfer.address - w.block;
    w.log(`writing ${transfer.length} bytes at 0x${transfer.address.toString(16)}`);
    await w.remote.writeFlash(w.permission, transfer.address,
      w.content.subarray(from, from + transfer.length));
  }

  const back = await w.readBlock(w.block);
  const wrong = firstDifference(back, w.content);
  if (wrong !== undefined) {
    throw new BlockWriteError(`the read back differs at 0x${(w.block + wrong).toString(16)}: `
      + `0x${back[wrong]!.toString(16)} on the device, 0x${w.content[wrong]!.toString(16)} `
      + 'intended. The write did not land.');
  }

  // Only the block above, and only after the write: a write's address is announced and the remote
  // advances its own pointer from there, so the sole direction it could run past its range is
  // upwards. The erase is the operation with no count at all and it is checked on both sides above.
  const above = w.neighbours.find((n) => n > w.block);
  const wasAbove = above === undefined ? undefined : before.get(above);
  if (above !== undefined && wasAbove !== undefined) {
    const spilled = firstDifference(await w.readBlock(above), wasAbove);
    if (spilled !== undefined) {
      throw new BlockWriteError(`the write changed 0x${(above + spilled).toString(16)}, past the `
        + 'end of the range it announced. The block it was asked to write is correct, and something '
        + 'above it is not.');
    }
  }

  w.onPastTheErase(false);
}
