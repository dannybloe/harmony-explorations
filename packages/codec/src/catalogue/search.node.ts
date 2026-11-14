/**
 * The infrared archive on disk as a source a search asks, the Node entry's half of `search.ts`.
 *
 * Apart from the core because it will read a checkout's indexes and device files off the disk, which the codec's
 * core never does; a renderer's own source answers the same two questions from wherever it holds the archive.
 * Not built yet: it refuses by name with the requirement it waits on.
 */
import { notBuilt } from '../support/contract.ts';
import type { DeviceSource } from './search.ts';

/** The archive checked out at `root` as a source: its manufacturers' indexes searched, a device read with its codeset, R9. */
export function archiveSourceAt(root: string): DeviceSource {
  void root;
  return notBuilt('archiveSourceAt', 9);
}
