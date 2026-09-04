/**
 * The metadata archive a configuration carries, section 260.
 *
 * **A config can name its own devices and commands, and two architectures do it.** Everywhere else in
 * this repository a command is a number: a record in base slot 5 with no name anywhere, which is why
 * section 229 had to identify a device by the numbers its records decode to and then look the name up
 * in a 2.2 GB catalogue. Arch 16 (Harmony 300 and 350) does not need any of that. It carries a **ZIP
 * archive** holding one file, `MetaData.xml`, and that file lists every device by name and
 * every command by index and name.
 *
 * The framing is a `u32` length and then the archive, and it is the same on both architectures that
 * have one. **Each gives it a slot of its own and neither slot is a base slot**: raw 13 on arch 16 and
 * raw **3** on arch 10 (Harmony 890 and 895), which is one of the eight raw slots sections 178 to 184
 * placed no base slot on and left unexplained. This file said arch 10 parked it in implied space for
 * about an hour, on the strength of comparing a slot's offset against the ZIP signature rather than
 * against the length word four bytes before it.
 *
 * **The names are not a drop in replacement for section 229's catalogue matching**, which is the
 * limit to keep in view: the archive names more commands than the container holds records, 61 against
 * 52 on the one device where both can be counted, and its device order is not the group order, since
 * its third device is group 3 and group 2 is empty. So it says what a command is **called** and not
 * which record sends it, and joining the two is open.
 *
 * **What is in it differs by generation and only the newer one is useful.** Arch 10's is 270 bytes and
 * describes one thing, whether an assistant menu is shown. Arch 16's is ten kilobytes: the record
 * layout of the log area plus the whole naming layer.
 *
 * **It is Logitech's document, so it is data and never instruction**, per the standing rule about text
 * from outside this repository. It states facts about a configuration that take the ordinary route: a
 * hypothesis to test. In particular a name in it is what the **owner** or Logitech called something,
 * so nothing here is asserted from it without a second source, and the device half identifies a real
 * person's equipment and must not be published.
 *
 * The archive is deflated with a data descriptor, so the local header's sizes are zero and the
 * compressed length comes from the central directory. `node:zlib` inflates it; no dependency is added
 * for this, which is deliberate, since a ZIP reader would be a large tree for one file.
 */
import { inflateRawSync } from 'node:zlib';
import type { Container } from './gspm.ts';
import { GspmError } from './gspm.ts';
import { u16, u32 } from './bytes.ts';

/**
 * The raw slot the archive sits in, per architecture, and **not** a base slot on either.
 *
 * Stated per architecture rather than as a base slot, because that is what it is: no other
 * architecture has anything at these positions, so there is nothing for a base slot number to mean.
 * An architecture absent from this table gets the search below instead of a pointer.
 */
export const METADATA_SLOT: Readonly<Record<number, number>> = { 10: 3, 16: 13 };

/** A ZIP local file header, and the only signature this reader looks for. */
const LOCAL_HEADER = 0x04034b50;
/** A central directory entry, which is where the compressed length is when a descriptor is used. */
const CENTRAL_HEADER = 0x02014b50;

export interface MetadataCommand {
  /** The index a base slot 5 record is addressed by, as the archive states it. */
  readonly index: number;
  readonly name: string;
}

export interface MetadataDevice {
  readonly name: string;
  readonly index: number;
  /**
   * The archive's `DeviceId`, which is **not** a catalogue id and was written up as one for an hour.
   *
   * The three on the one container that has any are 83244049, 83244050 and 83244051, consecutive, and
   * the public infrared archive's own `globalDeviceId` runs from 763 to about 523634, so this number
   * is outside that space entirely. It is account scoped, so it identifies a device on the owner's
   * account and cannot be looked up anywhere. Kept because it is what the file says.
   */
  readonly deviceId?: string;
  readonly commands: readonly MetadataCommand[];
}

export interface Metadata {
  /** The file's whole text, so a caller can read what this reader does not model. */
  readonly xml: string;
  /** Where the length word sits in the blob, for the byte accounting. */
  readonly offset: number;
  /** The length the `u32` states, the archive only, excluding the word itself. */
  readonly length: number;
  readonly devices: readonly MetadataDevice[];
}

/**
 * Inflate the one entry of a ZIP whose first bytes are at `at`.
 *
 * Returns undefined rather than throwing for anything that is not the shape measured on both
 * architectures, because this is called on candidate offsets when searching an arch 10 container.
 */
function inflateOneEntry(blob: Uint8Array, at: number): string | undefined {
  if (at + 30 > blob.length || u32(blob, at) !== LOCAL_HEADER) return undefined;
  const nameLength = u16(blob, at + 26);
  const extraLength = u16(blob, at + 28);
  const data = at + 30 + nameLength + extraLength;
  // The compressed length lives in the central directory when the local header defers it, which is
  // what a data descriptor means and what both containers here use.
  let compressed = u32(blob, at + 18);
  if (compressed === 0) {
    let central = -1;
    for (let scan = data; scan + 46 <= blob.length; scan += 1) {
      if (u32(blob, scan) === CENTRAL_HEADER) { central = scan; break; }
    }
    if (central < 0) return undefined;
    compressed = u32(blob, central + 20);
  }
  if (compressed === 0 || data + compressed > blob.length) return undefined;
  try {
    return Buffer.from(inflateRawSync(blob.subarray(data, data + compressed))).toString('utf8');
  } catch {
    return undefined;
  }
}

/** Every `<Tag>text</Tag>` value of one name inside `xml`, in order. */
function elements(xml: string, tag: string): string[] {
  const out: string[] = [];
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  let at = 0;
  for (;;) {
    const start = xml.indexOf(open, at);
    if (start < 0) return out;
    const end = xml.indexOf(close, start + open.length);
    if (end < 0) return out;
    out.push(xml.slice(start + open.length, end));
    at = end + close.length;
  }
}

/** The devices and their commands, or an empty list where the archive names none. */
function devicesOf(xml: string): MetadataDevice[] {
  const half = xml.slice(xml.indexOf('<Devices>'), xml.indexOf('</Devices>'));
  if (!half) return [];
  const out: MetadataDevice[] = [];
  // `<Device>` blocks do not nest, so splitting on the open tag is enough and keeps this free of a
  // parser. A malformed block contributes nothing rather than throwing.
  for (const block of half.split('<Device>').slice(1)) {
    const name = elements(block, 'Name')[0];
    const index = elements(block, 'Index')[0];
    if (name === undefined || index === undefined) continue;
    const commands: MetadataCommand[] = [];
    for (const one of block.split('<Command>').slice(1)) {
      const at = elements(one, 'Index')[0];
      const called = elements(one, 'Name')[0];
      if (at === undefined || called === undefined) continue;
      commands.push({ index: Number(at), name: called });
    }
    const id = elements(block, 'DeviceId')[0];
    out.push({ name, index: Number(index), ...(id === undefined ? {} : { deviceId: id }), commands });
  }
  return out;
}

/**
 * The metadata archive of a container, or undefined where it holds none.
 *
 * **The pointer first and a search behind it.** On the two architectures that are known to carry one
 * the slot is followed, which is the reading; the search is what would find one on an architecture
 * nobody has looked at, and it is deliberately kept rather than removed now that both slots are known,
 * because it is also the control: it finds the same offset the pointer does, so a slot that moved
 * would be noticed rather than turning into a silent undefined. A candidate is only tried when the
 * `u32` in front of it states the archive's own length, which is what makes a hit a hit rather than a
 * `PK` inside picture data.
 */
export function metadataArchive(c: Container): Metadata | undefined {
  const candidates: number[] = [];
  if (c.architecture !== undefined) {
    try {
      const at = METADATA_SLOT[c.architecture];
      const slot = at === undefined ? undefined : c.sections[at];
      const off = slot === undefined || slot.address === 0
        ? undefined : c.blobOffsetOf(slot.address);
      if (off !== undefined) candidates.push(off);
    } catch (error) {
      if (!(error instanceof GspmError)) throw error;
    }
  }
  // The search half. Only offsets whose preceding word states the archive's length are tried, so a
  // container with no archive costs one scan and answers undefined rather than guessing.
  for (let at = 4; at + 30 <= c.blob.length; at += 1) {
    if (u32(c.blob, at) !== LOCAL_HEADER) continue;
    candidates.push(at - 4);
  }
  for (const off of candidates) {
    if (off < 0 || off + 4 > c.blob.length) continue;
    const length = u32(c.blob, off);
    if (length < 30 || off + 4 + length > c.blob.length) continue;
    const xml = inflateOneEntry(c.blob.subarray(off + 4, off + 4 + length), 0);
    if (xml === undefined) continue;
    return { xml, offset: off, length, devices: devicesOf(xml) };
  }
  return undefined;
}
