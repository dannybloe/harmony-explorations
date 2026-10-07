/**
 * Stamping a configuration at the moment it is written, which every write to a remote does.
 *
 * **Why every write and not only a save of an edit**, todo-compile-650 1.3 and section 310: a
 * Harmony 650 puts its clock back to the configuration's stamp at every restart, and a write ends
 * in a restart, so a file carried to the remote with an old stamp sets the remote's clock back by
 * exactly that file's age. The same holds on the Harmony One, section 111. A small edit restarts the
 * remote as surely as a large one, which is the case this exists for: the stamp used to be a
 * separate step in a lab script, run by hand before a write, and a step run by hand is one that
 * gets skipped.
 *
 * The stamp itself is `saveEdits` with no edits of its own: base slot 3's build timestamp and base
 * slot 13's clock records, through the codec's own rails, so this module adds no knowledge about the
 * format. What it adds is when to stamp and when not to.
 */
import { localTimestamp, parse, saveEdits, trailerChecksum } from '@harmony/codec';

/** A configuration that cannot be stamped as it stands, with the reason. */
export class StampError extends Error {}

/**
 * The configuration's bytes stamped with `when`, in the saver's wall clock time.
 *
 * **Refuses a file whose trailer checksum does not match its bytes**, before stamping rather than
 * after, because the stamp recomputes the checksum: stamping a damaged file would hand the writer a
 * container whose checksum is right and whose bytes are still damaged, and the writer's own check
 * would then pass it.
 */
export function stampForWrite(bytes: Uint8Array, when: Date): { bytes: Uint8Array; at: string } {
  const container = parse(bytes);
  const computed = trailerChecksum(bytes);
  if (container.trailerChecksum !== computed) {
    throw new StampError(`the file states checksum 0x${container.trailerChecksum.toString(16)} and `
      + `its bytes give 0x${computed.toString(16)}, so it is damaged and is not stamped`);
  }
  const at = localTimestamp(when);
  return { bytes: saveEdits(container, [], at).bytes, at };
}

/**
 * Whether a write journal records a run that erased flash and never read its configuration back.
 *
 * **This is what keeps "rerun it with the same arguments" true now that a write stamps.** A run that
 * stops part way leaves its blocks holding either its own bytes or erased flash, and the rerun
 * recognises that state only against the same bytes. A fresh stamp would differ from them in the
 * blocks holding the timestamp, the clock records and the checksum, so the rerun would refuse
 * exactly the remote it exists to finish. So the writer saves the stamped file before it erases
 * anything, and a rerun after such a journal writes that file as it is.
 */
export function stoppedAfterErase(journal: string): boolean {
  return /^erasing 0x/m.test(journal) && !/reads back byte for byte identical/.test(journal);
}
