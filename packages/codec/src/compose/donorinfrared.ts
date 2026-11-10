/**
 * A donor device's infrared composed from the catalogue: a device a configuration
 * already holds given the records the catalogue composes for it in place of its own, every send told the new index
 * of the code it sent, and the bytes of a configuration's infrared the catalogue reproduces, device by device.
 * Part of composing catalogue devices, `composecatalogue.ts`, which re-exports it whole.
 */
import { instructionSites } from '../assembly/assemble.ts';
import { layOutContainer } from '../assembly/frame.ts';
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import { Writer } from '../container/emit.ts';
import { archSlot, type Container, parse } from '../container/gspm.ts';
import {
  IR_HEADER_BASE, IR_POINTERS_PER_GROUP, IR_TABLE_SLOT, irBlockLength, irBlockWords, irGroups, irHeaderLength,
  irHeaderPointers, irRecordStart,
} from '../infrared/ir.ts';
import { devices, SEND_INFRARED } from '../inventory/inventory.ts';
import { deviceRecords } from '../shared/devices.ts';
import { type Cut, withoutRanges } from '../shared/dropmodes.ts';
import { composeIrGroup } from '../shared/infrared.ts';
import { hexOf } from '../support/bytes.ts';
import { ComposeError } from './compose.ts';
import { catalogueDevicePlan, type DonorDeviceRequest } from './composecatalogue.ts';

/** One record of a donor device's group, and the composed record its sends name now. */
export interface DonorRecordMapped {
  /** The record's index in the donor's group. */
  readonly from: number;
  /** The composed record's index, which is its index in the group now. */
  readonly to: number;
  /** What the composed record sends: a catalogue command's name, or a power step's. */
  readonly name: string;
  /** How the donor's record differs from the composed one, empty where every block is word for word the same. */
  readonly differs: readonly string[];
}

export interface ComposedDonorInfrared {
  readonly bytes: Uint8Array;
  readonly group: number;
  /** The composed records in group order, each by what it sends. */
  readonly names: readonly string[];
  /** How many records the donor's group held. */
  readonly donorRecords: number;
  /** Every record of the donor's group, in its order, with the composed record that took its place. */
  readonly mapped: readonly DonorRecordMapped[];
}

/** The leading silence of a block, in microseconds: the words before its first mark. */
function openingSilence(words: readonly number[]): number {
  let total = 0;
  for (const word of words) {
    if (word === 0 || (word & 0x8000) !== 0) break;
    total += word;
  }
  return total;
}

/** A block's words from its first mark on, the code without the silence it opens with. */
function withoutOpening(words: readonly number[]): string {
  const first = words.findIndex((word) => (word & 0x8000) !== 0);
  return first < 0 ? '' : words.slice(first).join(',');
}

/** A record as its header's own bytes, the address of its data zeroed, and each pointer's block as words. */
function describeRecord(c: Container, address: number): { header: string; blocks: (number[] | undefined)[] } {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined) throw new ComposeError(`the infrared record at ${address.toString(16)} has no readable start`);
  const header = c.blob.slice(off, off + IR_HEADER_BASE);
  // The header names its own data seven bytes in plus one, `irRecordStart`: an address, so not compared.
  header.fill(0, 8, 11);
  return {
    header: hexOf(header),
    blocks: irHeaderPointers(c, address).map((pointer) => (pointer === 0 ? undefined : irBlockWords(c, pointer))),
  };
}

/**
 * A device the configuration already holds given the infrared records the catalogue composes for it, in the
 * order and with the codes `composeCatalogueDevice` gives a device composed whole, in place of the records its
 * own group held: what the Harmony One's composed setup needs, whose donor is
 * Logitech's compile of two of the test setup's seven devices, so that no infrared byte of the result is the
 * donor's.
 *
 * **What it rests on.** Every action list, tagged list, timer and transition that sends one of the device's
 * records names it as its group and its index in the group, `(group << 8) | record`; so the records can be
 * replaced as long as every send is told the new index of the code it sent. Which composed record that is is
 * found by the code, as `composeDonorDeviceInputs` finds an input's: the donor's record whose blocks are word for
 * word one of ours is that record, section 338's measurement; one that is not is matched on its once block with
 * the silence it opens with dropped, the code itself, and preferably on its other blocks too, and **every such
 * difference is reported** in `mapped`, since it is what a remote sends differently afterwards. A donor record
 * whose code no composed record has is refused rather than kept, since keeping it would leave a Logitech record
 * in the result.
 *
 * **What it changes.** The composed group goes in as `composeIrGroup` lays one out, then takes the donor's
 * group's index and the donor's group, its records and every block nothing else names, are taken out,
 * `withoutRanges`; the group count comes back to what it was, so no other device's index moves. Nothing but
 * base slot 5 and the send operands changes: the device's lists, its power variable and its pages are the donor's
 * as before, and they name records by index, so they are the composed device's now.
 *
 * **Scope, decision 16**: generic, base slot 5 and the send opcode being the same on every architecture this
 * codec composes for; run on the Harmony One alone, on `harvest_one_two_devices`' LG and Denon.
 */
export function composeDonorDeviceInfrared(
  c: Container, archive: CatalogueSource, request: DonorDeviceRequest,
): ComposedDonorInfrared {
  const own = devices(c).find((one) => one.name === request.label);
  if (own?.group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const group = own.group;

  // The records a whole device composed with its inputs holds, in its order: `composeCatalogueDevice`'s plan
  // and `composeDeviceFor`'s record order, each derived once.
  const planned = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label: request.label, full: true, inputs: true,
  });
  const records = deviceRecords(planned.device);
  const commandCount = planned.device.commands.length;
  const names = records.sends.map((one, k) => {
    if (k < commandCount) return planned.commandNames[k]!;
    const step = records.steps[k - commandCount]!;
    const named = planned.available.find((command) => command.keycode === step.stated)?.name;
    return `${named ?? 'a code'} as a power step${step.holdMs === undefined ? '' : ` held ${step.holdMs} ms`}`;
  });

  // The composed group, appended as a device composed whole would have it.
  const appended = parse(composeIrGroup(c, records.sends).bytes);
  const groups = irGroups(appended);
  const slot = archSlot(c.architecture, IR_TABLE_SLOT);
  const table = appended.pointerArrayAt(slot);
  if (groups === undefined || table === undefined) throw new ComposeError('base slot 5 does not read as a group table');
  const fresh = groups.length - 1;
  const theirs = groups[group]!.addresses.map((address) => describeRecord(appended, address));
  const ours = groups[fresh]!.addresses.map((address) => describeRecord(appended, address));
  const words = (blocks: readonly (number[] | undefined)[]): string => blocks.map((one) => one?.join(',') ?? '-').join('|');

  // Each donor record to the composed record sending its code. Where several composed records send one code, two
  // catalogue commands sharing it (the LG's Home and SmartMenu), each donor record of that code takes the next
  // one not yet taken, so a donor group's two records of one code stay two records and each keeps a list of its
  // own, which `composeDonorDeviceInputs` relies on to find an input's list.
  const taken = new Set<number>();
  const mapped: DonorRecordMapped[] = theirs.map((record, from) => {
    const exactly = ours.flatMap((one, k) => (one.header === record.header && words(one.blocks) === words(record.blocks) ? [k] : []));
    const exact = exactly.find((k) => !taken.has(k)) ?? exactly[0];
    if (exact !== undefined) {
      taken.add(exact);
      return { from, to: exact, name: names[exact]!, differs: [] };
    }
    const code = withoutOpening(record.blocks[0] ?? []);
    const same = ours.flatMap((one, k) => (one.header === record.header && withoutOpening(one.blocks[0] ?? []) === code ? [k] : []));
    const closest = same.find((k) => words(ours[k]!.blocks.slice(1)) === words(record.blocks.slice(1))) ?? same[0];
    if (closest === undefined) {
      // The header is compared too, its carrier and class, so a code at another carrier is refused as well.
      throw new ComposeError(`${request.label}'s record ${from} sends a code, at its carrier, that no command of ${request.manufacturer} ${request.model} in the catalogue composes`);
    }
    const mine = ours[closest]!;
    const differs: string[] = [];
    const theirOpening = openingSilence(record.blocks[0] ?? []);
    const ourOpening = openingSilence(mine.blocks[0] ?? []);
    if (theirOpening !== ourOpening) differs.push(`opens with ${theirOpening} us of silence where the composed record opens with ${ourOpening} us`);
    const roles = ['held block', 'release block'];
    for (const [k, role] of roles.entries()) {
      const theirBlock = record.blocks[k + 1];
      const ourBlock = mine.blocks[k + 1];
      if (theirBlock === undefined && ourBlock !== undefined) differs.push(`has no ${role} where the composed record has one`);
      else if (theirBlock !== undefined && ourBlock === undefined) differs.push(`has a ${role} where the composed record has none`);
      else if (theirBlock !== undefined && ourBlock !== undefined && theirBlock.join() !== ourBlock.join()) differs.push(`has another ${role}`);
    }
    if (words(record.blocks.slice(IR_POINTERS_PER_GROUP)) !== words(mine.blocks.slice(IR_POINTERS_PER_GROUP))) {
      differs.push('has other toggled blocks');
    }
    return { from, to: closest, name: names[closest]!, differs };
  });

  // Every send of the donor's group told the composed record's index, and the composed group put at the donor's
  // group's index by swapping the two table entries, so the donor's group is the last one, which is taken out.
  const bytes = appended.blob.slice();
  for (const site of instructionSites(appended, SEND_INFRARED)) {
    const sentGroup = site.operand >> 8;
    if (sentGroup === fresh) throw new ComposeError('something already sends the group just composed');
    if (sentGroup !== group) continue;
    const to = mapped[site.operand & 0xff]?.to;
    if (to === undefined) throw new ComposeError(`a send names ${request.label}'s record ${site.operand & 0xff}, which its group does not hold`);
    bytes.set(new Writer(2).u16((group << 8) | to).bytes, site.at);
  }
  const entry = (k: number): number => table.start + table.width + 3 * k;
  bytes.set(new Writer(3).u24(table.values[fresh]!).bytes, entry(group));
  bytes.set(new Writer(3).u24(table.values[group]!).bytes, entry(fresh));
  const swapped = parse(bytes);

  // The donor's group, its records and every block of theirs no other record names, and the table's last entry.
  const after = irGroups(swapped)!;
  const kept = new Set(after.flatMap((one, k) => (k === fresh ? [] : one.addresses.flatMap((address) => irHeaderPointers(swapped, address)))));
  const cuts: Cut[] = [{ from: after[fresh]!.start, to: after[fresh]!.start + after[fresh]!.length }];
  const blocks = new Set<number>();
  for (const address of after[fresh]!.addresses) {
    const start = irRecordStart(swapped, address);
    const off = start === undefined ? undefined : swapped.blobOffsetOf(start);
    if (off === undefined) throw new ComposeError(`${request.label}'s record at ${address.toString(16)} has no readable start`);
    cuts.push({ from: off, to: off + irHeaderLength(swapped, address) });
    for (const pointer of irHeaderPointers(swapped, address)) if (pointer !== 0 && !kept.has(pointer)) blocks.add(pointer);
  }
  for (const pointer of blocks) {
    const off = swapped.blobOffsetOf(pointer);
    const length = irBlockLength(swapped, pointer);
    if (off === undefined || length === undefined) throw new ComposeError(`a block of ${request.label}'s at ${pointer.toString(16)} does not close`);
    cuts.push({ from: off, to: off + length });
  }
  const tableAt = swapped.pointerArrayAt(slot)!;
  cuts.push({ from: tableAt.start + tableAt.length - 3, to: tableAt.start + tableAt.length });
  const cut = withoutRanges(swapped, cuts);
  // The count goes down by the entry taken out, in the table's own width.
  const head = cut.at(tableAt.start);
  if (head === undefined || head.offset !== 0) throw new ComposeError('base slot 5\'s table is not where its section starts');
  head.piece.bytes.set(tableAt.width === 1
    ? new Writer(1).u8(after.length - 1).bytes : new Writer(2).u16(after.length - 1).bytes, 0);
  const result = parse(layOutContainer(cut.layout).bytes);

  // Read back: the group at its index is the composed one, record for record, and nothing sends past its end.
  const back = irGroups(result);
  if (back?.length !== groups.length - 1) throw new ComposeError('the group count did not come back');
  const placed = back[group]!.addresses.map((address) => describeRecord(result, address));
  if (placed.length !== ours.length || placed.some((one, k) => one.header !== ours[k]!.header || words(one.blocks) !== words(ours[k]!.blocks))) {
    throw new ComposeError(`${request.label}'s group does not read back as the composed records`);
  }
  for (const site of instructionSites(result, SEND_INFRARED)) {
    if (site.operand >> 8 === group && (site.operand & 0xff) >= ours.length) {
      throw new ComposeError(`a send names ${request.label}'s record ${site.operand & 0xff} of ${ours.length}`);
    }
  }
  return { bytes: result.blob, group, names, donorRecords: theirs.length, mapped };
}

/** The bytes of a configuration's infrared groups the catalogue reproduces, `catalogueInfraredBytes`. */
export interface CatalogueInfraredBytes {
  /** Per byte of the blob, 1 where the catalogue's records reproduce it. */
  readonly owners: Uint8Array;
  /** Per device asked about: its records, how many the catalogue reproduces, and whether its group array is the composer's. */
  readonly devices: readonly { label: string; records: number; reproduced: number; array: boolean }[];
}

/**
 * Which bytes of a configuration's infrared the catalogue reproduces, device by device: a record whose header and
 * blocks are word for word one the catalogue composes for that device whole, `composeCatalogueDevice`'s records,
 * counts with its blocks, and the group's own record array counts where every record is the composed one at the
 * same place, which is what a group the composer laid out holds. An attribution for a measurement of what a
 * configuration still carries from a donor, as the One family's `oneBuiltBytes` is for its builders:
 * measured on the result and blind to how it was made, so it says what the catalogue
 * can write and not what wrote it, and a caller holds it to the path separately.
 */
export function catalogueInfraredBytes(
  c: Container, archive: CatalogueSource, wanted: readonly DonorDeviceRequest[],
): CatalogueInfraredBytes {
  const owners = new Uint8Array(c.blob.length);
  const groups = irGroups(c);
  if (groups === undefined) throw new ComposeError('base slot 5 does not read as a group table');
  const words = (blocks: readonly (number[] | undefined)[]): string => blocks.map((one) => one?.join(',') ?? '-').join('|');
  const out: { label: string; records: number; reproduced: number; array: boolean }[] = [];
  for (const request of wanted) {
    const group = devices(c).find((one) => one.name === request.label)?.group;
    if (group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
    // The records the catalogue composes for the device whole, laid out in a scratch copy and read back.
    const planned = catalogueDevicePlan(c, archive, {
      manufacturer: request.manufacturer, model: request.model, label: request.label, full: true, inputs: true,
    });
    const scratch = parse(composeIrGroup(c, deviceRecords(planned.device).sends).bytes);
    const ours = irGroups(scratch)!.at(-1)!.addresses.map((address) => describeRecord(scratch, address));
    const keys = ours.map((one) => `${one.header}/${words(one.blocks)}`);
    const theirs = groups[group]!;
    let reproduced = 0;
    let inOrder = theirs.addresses.length === ours.length;
    theirs.addresses.forEach((address, k) => {
      const one = describeRecord(c, address);
      const key = `${one.header}/${words(one.blocks)}`;
      if (key !== keys[k]) inOrder = false;
      if (!keys.includes(key)) return;
      reproduced += 1;
      const off = c.blobOffsetOf(irRecordStart(c, address)!)!;
      owners.fill(1, off, off + irHeaderLength(c, address));
      for (const pointer of irHeaderPointers(c, address)) {
        if (pointer === 0) continue;
        const at = c.blobOffsetOf(pointer)!;
        owners.fill(1, at, at + irBlockLength(c, pointer)!);
      }
    });
    if (inOrder) owners.fill(1, theirs.start, theirs.start + theirs.length);
    out.push({ label: request.label, records: theirs.addresses.length, reproduced, array: inOrder });
  }
  return { owners, devices: out };
}
