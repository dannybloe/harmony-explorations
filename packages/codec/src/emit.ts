/**
 * The emitter, milestone M2's third part: rebuild what is accounted and copy the rest.
 *
 * **The shape is deliberate and it is what makes progress measurable.** An emitter that rebuilds
 * everything is untestable until the day it works. This one copies the payload it cannot yet
 * rebuild and rebuilds the rest, so byte equality holds from the first commit, and each structure
 * moves from copied to rebuilt one at a time with the same test still passing. The measure is
 * `framed / total`, which is the byte accounting read the other way round.
 *
 * **The copy is explicit, and it has to be.** The obvious version fills the buffer with the source
 * and overwrites what it rebuilds, and that version passes whether or not the emitter writes
 * anything, because the right bytes are already there. So the buffer starts as poison and only two
 * things clear it: a rebuilder, or the residue copy, which covers exactly the bytes no rebuilder
 * claimed. What is neither survives as poison and fails the compare.
 *
 * **Three numbers, not one, for the reason `actions.ts` gives.** `framed` bytes are computed from
 * typed fields, so a wrong field shows up as a wrong byte. `carried` bytes came out of a reader as
 * an opaque run, which is honest for pixels and duration streams and dishonest to count as
 * understanding. `copied` is the residue. Reporting them as one number is how an emitter that
 * memcpys a config claims to rebuild it, and the first draft of the reading table made exactly
 * that mistake with its own numbers.
 *
 * **What it is not.** Nothing here goes near a remote. It produces bytes; writing them to hardware
 * is a later milestone behind `packages/usb/src/rails.ts`, and version 1 of the application is
 * read only. `docs/roadmap.md`, milestone M2.
 *
 * **And it is not a save path**, which is worth saying in code rather than leaving to be inferred.
 * This rebuilds a container to be **byte identical to its input**, which is the whole measurement:
 * anything that differs is a reader that does not understand its own structure. A save is the
 * opposite operation on one field, because base slot 3's timestamp is what an arch 12 remote sets
 * its clock from, section 111, so reproducing it faithfully reproduces a stale clock. Editing goes
 * through `edit.ts`, whose `FIELD_RULES` says which fields are carried and which are recomputed, and
 * whose `saveEdits` stamps. If a caller ever wants these bytes written to a remote, that is the
 * route, not this one.
 */

import {
  BINDING_SLOT,
  EMPTY_FRAME_LENGTH,
  CLOCK_COOKIE,
  CLOCK_SECTION_LENGTH,
  FRAME_COOKIE,
  FRAME_END,
  FRAME_END_LENGTH,
  CLOCK_END,
  Container,
  GspmError,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  archRecordExtent,
  clockRecordFields,
  trailerChecksum,
} from './gspm.ts';
import { countedPointers } from './valuemap.ts';
import {
  EVENT_MAP_SLOT,
  FRAME_HEADER,
  LOG_AREA_SLOT,
  NAME_NODE_FIELDS,
  NAME_NODE_TAG,
  LOG_AREA_WIDE_ARCHITECTURES,
  STATE_TABLE_SLOT,
  eventMap,
  handlerSets,
  modeRecords,
  modeTable,
  stateRecords,
  logArea,
  nameNodes,
  stateTable,
  taggedList,
  taggedListPools,
} from './sections.ts';
import type { TaggedList } from './sections.ts';
import { fontSets, glyphs } from './font.ts';
import { PICTURE_BANK_BIAS, SCREEN_END, bitmaps, deadTerminator, pictureBank, pictureBankStart,
  reachablePrograms }
  from './screen.ts';
import { EMPTY_ARRAY_LIMIT, RAW_SLOT_PREFIX, claims, namedContentEnd } from './coverage.ts';
import {
  IR_CARRIER_AT,
  IR_CLASS_STREAM,
  IR_HEADER_BASE,
  IR_HEADER_CLASSES,
  irCarrier,
  irClass,
  irGroupCount,
  irGroups,
  irHeaderLength,
  irBlockWords,
  irClass5Body,
  irHeaderPointers,
  irRecordBlocks,
  irRecordStart,
  irSymbolBlock,
  irSymbolTable,
} from './ir.ts';
import { VALUE_MAP_COUNT_WIDTH, valueMaps } from './valuemap.ts';
import {
  TIMER_RECORD_LENGTH,
  TOUCH_AREA_LENGTH,
  lightBandExtras,
  parameterGroups,
  timers,
  touchMapStart,
  touchPages,
} from './tables.ts';
import { archSlot } from './gspm.ts';

/** Bytes of the container frame: the cookie, the two `u32`s, the trailer and the end marker. */
export const COOKIE_LENGTH = 4;
/**
 * What an unwritten byte reads as. Any value works; this one is chosen because a run of it in a
 * failure is unmistakable in a hex dump, unlike zero, which half the container legitimately is.
 */
export const POISON = 0xa5;

/**
 * One structure rebuilt from what a reader returned, as bytes and where they go.
 *
 * `framed` is how many of `bytes` were computed from typed fields rather than carried through as
 * an opaque run. A rebuilder that carries bytes it could have framed is not something any test
 * here can catch, so the split is a claim its author makes and a reviewer checks; what the tests
 * do catch is a rebuilder whose bytes are wrong, which the round trip fails on.
 */
export interface Rebuild {
  start: number;
  bytes: Uint8Array;
  owner: string;
  framed: number;
}

export interface EmitReport {
  bytes: Uint8Array;
  /** Bytes written from typed fields. The number M2's third part moves. */
  framed: number;
  /** Bytes a reader handed back as an opaque run and the emitter wrote through. */
  carried: number;
  /** Bytes no rebuilder claimed, taken from the source. */
  copied: number;
  /** Framed bytes per owner, largest first. */
  byOwner: [string, number][];
}

/**
 * A fixed length run being filled field by field, which refuses to be the wrong length.
 *
 * Exported for its own test. The length check is the guard that survives the residue copy: a
 * rebuilder that writes half of its structure would otherwise leave the other half to the copy and
 * still round trip, which is precisely the "rebuilt it" claim this file exists not to make.
 */
export class Writer {
  readonly bytes: Uint8Array;
  private at = 0;

  constructor(length: number) {
    this.bytes = new Uint8Array(length);
  }

  u8(value: number): this {
    this.bytes[this.at] = value & 0xff;
    this.at += 1;
    return this;
  }

  u16(value: number): this {
    return this.u8(value).u8(value >>> 8);
  }

  u24(value: number): this {
    return this.u16(value).u8(value >>> 16);
  }

  u32(value: number): this {
    return this.u24(value).u8(value >>> 24);
  }

  ascii(text: string): this {
    for (let i = 0; i < text.length; i += 1) this.u8(text.charCodeAt(i));
    return this;
  }

  /**
   * A run of bytes rather than a field: a format constant, or a payload a reader handed back.
   * Whether it counts as framed is the caller's declaration, `framed` against `partly`.
   */
  raw(view: Uint8Array): this {
    this.bytes.set(view, this.at);
    this.at += view.length;
    return this;
  }

  /** How many bytes are still unwritten, which a rebuilder asserts is zero. */
  get remaining(): number {
    return this.bytes.length - this.at;
  }
}

/**
 * Every structure this codec can rebuild from its own reading of `c`.
 *
 * Deliberately parallel to `claims` in `coverage.ts`, owner name for owner name, because the two
 * are the same question asked in opposite directions: what does a reader account for, and can it
 * be put back. An owner that appears there and not here is a reader that returns values it cannot
 * reconstruct, and the difference between the two lists is the remaining work.
 */
export function rebuilds(c: Container): Rebuild[] {
  const out: Rebuild[] = [];

  // One rebuild per start offset. Two rebuilders reaching the same structure is not hypothetical:
  // on the safe mode containers base slots 9 and 12 have no records after their pointer arrays, so
  // the array accounts for the whole section and the general loop picks them up as well as their
  // own reader does. Both write the same bytes, so the round trip never noticed and the byte count
  // came out four too high. First come rather than last, since the general loop runs first.
  //
  // **And the second one is now compared rather than dropped.** This kept a set of offsets and
  // returned on a repeat, so two rebuilders at one offset writing **different** bytes would have had
  // the first silently win, and the round trip would then fail somewhere with no indication which
  // rebuilder was wrong. That is the same blind spot the byte accounting's overlap detector had until
  // it compared claims instead of owner names, in the mirror of this file. Agreeing is legitimate;
  // disagreeing is a defect in one of the two and now says so.
  const seen = new Map<number, Rebuild>();

  /** A rebuild where some of the bytes came through as an opaque run rather than as fields. */
  const partly = (start: number | undefined, owner: string, w: Writer, fields: number): void => {
    if (start === undefined) return;
    if (w.remaining !== 0) {
      throw new GspmError(`${owner} wrote ${w.bytes.length - w.remaining} of ${w.bytes.length}`);
    }
    const already = seen.get(start);
    if (already !== undefined) {
      const same = already.bytes.length === w.bytes.length
        && already.bytes.every((byte, i) => byte === w.bytes[i]);
      if (!same) {
        throw new GspmError(
          `${owner} and ${already.owner} both rebuild 0x${start.toString(16)} and disagree: `
            + `${w.bytes.length} bytes against ${already.bytes.length}`,
        );
      }
      return;
    }
    const rebuild = { start, bytes: w.bytes, owner, framed: fields };
    seen.set(start, rebuild);
    out.push(rebuild);
  };
  /** A rebuild whose bytes are all computed from fields. */
  const framed = (start: number | undefined, owner: string, w: Writer): void =>
    partly(start, owner, w, w.bytes.length);
  const at = (address: number, owner: string, w: Writer): void =>
    framed(c.blobOffsetOf(address), owner, w);

  const slot = (base: number): number | undefined => {
    if (c.architecture === undefined) return undefined;
    try {
      const s = archSlot(c.architecture, base);
      return s < c.sections.length ? s : undefined;
    } catch {
      return undefined;
    }
  };
  const sectionStart = (base: number): number | undefined => {
    const s = slot(base);
    if (s === undefined) return undefined;
    const section = c.sections[s];
    if (section === undefined || section.isNull) return undefined;
    return c.blobOffsetOf(section.address);
  };

  // The header, eleven bytes: cookie, end address, and the format word's own three. The fourth
  // byte of `formatRaw` is section slot 0's spare, and the table below owns it. Writing a `u32`
  // here instead is what made the first cut's byte count one too high on every container.
  framed(0, 'header', new Writer(SECTION_TABLE_OFFSET)
    .ascii(c.family.magic)
    .u32(c.endAddr)
    .u24(c.formatRaw));

  // The section table. An item is `{ u8 spare; u24 address }`, and the spare byte is written back
  // from the parse rather than assumed zero for the reason section 20 gives: reading the item as
  // a `u32` pointer is what cost a whole section, and an emitter that assumed the byte away would
  // reintroduce the same error from the other side.
  const table = new Writer(SECTION_ITEM_SIZE * c.pointerCount);
  for (const section of c.sections) table.u8(section.spare).u24(section.address);
  framed(SECTION_TABLE_OFFSET, 'section-table', table);

  framed(c.markerOffset, 'marker', new Writer(COOKIE_LENGTH).ascii(c.marker));

  // The key table, where the family carries one. Also base slot 6's first mode record, byte for
  // byte, which is why the mode loop skips whichever record starts here; it is rebuilt once,
  // under the name it had first. Section 52.
  if (c.family.keyTableAtMarker && c.keys.length > 0) {
    const keys = new Writer(1 + 4 * c.keys.length).u8(c.keys.length);
    for (const key of c.keys) keys.u8(key.eventCode).u16(key.index).u8(key.flags);
    framed(c.markerOffset + COOKIE_LENGTH, 'key-table', keys);
  }

  // Section slot 1: the architecture twice over, then a `u16` whose meaning is not established,
  // then three bytes nothing reads. Those three are carried, and they are the smallest example in
  // the file of why the split exists: four framed bytes out of seven is what this record actually
  // is understood to.
  const archSlotIndex = slot(1);
  const archAt = sectionStart(1);
  if (archAt !== undefined && archSlotIndex !== undefined && c.architecture !== undefined) {
    // Bounded by the next section, which matters on exactly one container: the 525's safe mode
    // config puts base slot 2 three bytes in. Below four bytes even the version word does not fit,
    // so the record is carried whole and only the architecture byte is framed.
    const room = c.sectionLength(archSlotIndex);
    const length = archRecordExtent(room);
    const w = new Writer(length);
    if (length >= 4 && c.versionWord !== undefined) {
      w.u8(c.architecture).u8(c.architecture).u16(c.versionWord)
        .raw(c.blob.subarray(archAt + 4, archAt + length));
      partly(archAt, 'slot-1-arch', w, 4);
    } else {
      w.u8(c.architecture).raw(c.blob.subarray(archAt + 1, archAt + length));
      partly(archAt, 'slot-1-arch', w, 1);
    }
  }

  // Section slot 3's timestamp, and the day of week byte is the interesting one: it is derived
  // rather than stored back, so emitting it recomputes days since 1 January 2000 modulo 7 and the
  // round trip is a second confirmation of section 21's field assignment, on every container that
  // has one.
  //
  // **`c.builtAt` on purpose, which is the round trip and not a save.** The remote sets its clock
  // from this record, section 111, so writing a config back with the timestamp it came in with is
  // reproducing a stale clock. That is correct here and wrong for a save, and the distinction lives
  // in `edit.ts` as `FIELD_RULES`: this emitter is the instrument that proves the readers are
  // complete, and it is not the write path. See the note at the top of this file.
  //
  // The fields come from `clockRecordFields`, which is also what `edit.ts` stamps with. Each of them
  // derived the weekday itself until 10 August 2026, with a different spelling of the same epoch.
  const clockAt = sectionStart(3);
  if (clockAt !== undefined && c.builtAt !== undefined) {
    const fields = clockRecordFields(c.builtAt);
    if (fields === undefined) throw new GspmError(`slot 3 holds an unencodable ${c.builtAt}`);
    // Fourteen bytes: the record, then the three zeros the section carries past it. Written as
    // zeros rather than copied, so a tail that is not zero fails the round trip. Section 84.
    framed(clockAt, 'slot-3-clock', new Writer(CLOCK_SECTION_LENGTH)
      .raw(CLOCK_COOKIE)
      .raw(fields)
      .raw(CLOCK_END)
      .u8(0).u8(0).u8(0));
  }

  // Base slot 0, the `0xFEED` frame and its named nodes. **This was the one owner the emitter
  // could not touch**, and it is what the exercise found: the accounting counted the section
  // because the frame states its own length, and no field inside it had ever been read. Section 77
  // read it, so it is framed here down to the last byte of every name.
  const tree = c.sections[0];
  const treeAt = tree === undefined || tree.isNull ? undefined : c.blobOffsetOf(tree.address);
  const nodes = nameNodes(c);
  if (treeAt !== undefined && c.frameLength === 0) {
    // An empty frame, which the arch 12 safe mode containers carry: cookie, a zero length and the
    // terminator, with no node to read. `nameNodes` returns nothing for it, so without this the
    // accounting would claim seven bytes the emitter never wrote. Section 83.
    framed(treeAt, 'slot-0-tree', new Writer(EMPTY_FRAME_LENGTH + FRAME_END_LENGTH)
      .raw(FRAME_COOKIE)
      .u24(0)
      .raw(FRAME_END));
  } else if (treeAt !== undefined && nodes !== undefined && c.frameLength !== undefined) {
    // The length is three bytes, so what used to be copied through from `+0x04` is written from
    // the field now. See `frameLength` in gspm.ts for why the width changed.
    const w = new Writer(c.frameLength + FRAME_END_LENGTH)
      .raw(FRAME_COOKIE)
      .u24(c.frameLength);
    for (const node of nodes) {
      w.u8(NAME_NODE_TAG)
        .u16(NAME_NODE_FIELDS + node.name.length)
        .u16(node.level)
        .u16(node.index)
        .ascii(node.name);
    }
    // The terminator sits outside the stated length, which is why the writer is two bytes longer.
    partly(treeAt, 'slot-0-tree', w.raw(FRAME_END), c.frameLength + FRAME_END_LENGTH - 1);
  }

  // Base slot 2, the log area: a capacity and the bounds of a region above the config. The
  // capacity is a `u24` on arch 12 and a `u16` elsewhere, which is why the section is nine bytes
  // there and eight everywhere else. Section 47.
  const log = logArea(c);
  if (log !== undefined && c.architecture !== undefined) {
    const wide = LOG_AREA_WIDE_ARCHITECTURES.has(c.architecture);
    const w = new Writer(log.length);
    if (wide) w.u24(log.capacity);
    else w.u16(log.capacity);
    framed(sectionStart(LOG_AREA_SLOT), 'slot-2-log', w.u24(log.start).u24(log.limit));
  }

  // The six counted pointer arrays, each written at the width its own reader settled on.
  for (let i = 0; i < c.sections.length; i += 1) {
    const array = c.pointerArrayAt(i);
    if (array === undefined) continue;
    const base = baseOf(c, i);
    const w = new Writer(array.length);
    if (array.width === 1) w.u8(array.values.length);
    else w.u16(array.values.length);
    for (const value of array.values) w.u24(value);
    // The same naming rule as `coverage.ts`, so `rebuilds` can be compared to `claims` owner for
    // owner: a slot with no established base number is `raw-<i>-`, never `slot-<i>-`.
    framed(array.start, base === undefined ? `${RAW_SLOT_PREFIX}-${i}-table` : `slot-${base}-table`, w);
  }

  // Base slot 4: a fallback and a key to value map, all of it typed.
  const events = eventMap(c);
  const eventAt = sectionStart(EVENT_MAP_SLOT);
  if (events !== undefined && eventAt !== undefined) {
    const w = new Writer(events.length).u24(events.fallback).u16(events.entries.size);
    for (const [key, value] of events.entries) w.u8(key).u24(value);
    framed(eventAt, 'slot-4-event', w);
  }

  // Base slot 6's table, whose count is a `u24` rather than the `u8` or `u16` the six recognised
  // arrays use, which is why it is written here and not by the loop above.
  const modes = modeTable(c);
  if (modes !== undefined) {
    const w = new Writer(modes.length).u24(modes.addresses.length);
    for (const address of modes.addresses) w.u24(address);
    framed(modes.start, 'slot-6-table', w);
  }

  const bindings = handlerSets(c);
  if (bindings !== undefined) {
    const w = new Writer(bindings.length).u8(bindings.addresses.length);
    for (const address of bindings.addresses) w.u24(address);
    framed(bindings.start, 'slot-9-table', w);
  }

  // Base slot 13's header, including the `u16` that repeats `narrow` for a reason nobody has
  // found. It is written from the field rather than recomputed from `narrow`, because a rebuild
  // that assumed the two agree would hide the day they do not.
  const state = stateTable(c);
  const stateAt = sectionStart(STATE_TABLE_SLOT);
  if (state !== undefined && stateAt !== undefined) {
    const w = new Writer(state.length)
      .u16(state.count)
      .u16(state.narrow)
      .u16(state.wide)
      .u16(state.narrowAgain);
    for (const entry of state.entries) w.u24(entry);
    framed(state.start, 'slot-13-table', w);
  }

  // Base slot 14's header. The count width is one byte everywhere but arch 14, and `coverage`
  // claims it at width 1 on all of them, so this follows the same reading rather than a second.
  const slot14 = slot(14);
  if (slot14 !== undefined) {
    const header = countedPointers(c, slot14, 1);
    if (header !== undefined) {
      const w = new Writer(header.length).u8(header.values.length);
      for (const value of header.values) w.u24(value);
      framed(header.start, 'slot-14-table', w);
    }
  }

  // Base slot 12: the timer table and its fixed length records.
  const timerTable = timers(c);
  if (timerTable !== undefined) {
    const w = new Writer(timerTable.length).u8(timerTable.records.length);
    for (const timer of timerTable.records) w.u24(timer.address);
    framed(timerTable.start, 'slot-12-table', w);
    for (const timer of timerTable.records) {
      at(timer.address, 'slot-12-record', new Writer(TIMER_RECORD_LENGTH)
        .u8(timer.kind)
        .u24(timer.duration)
        .u16(timer.instruction.operand)
        .u8(timer.instruction.opcode));
    }
  }

  // Base slot 15's groups. The firmware demands each group's length and silently substitutes a
  // compiled in default for one that differs, section 44, so the count byte here is load bearing
  // in a way most of this file's counts are not.
  for (const group of parameterGroups(c) ?? []) {
    const w = new Writer(group.length).u8(group.values.length);
    for (const value of group.values) w.u16(value);
    at(group.address, 'slot-15-group', w);
  }

  // Base slot 17: the touch map, three levels of it, all typed. Each area carries its own address
  // at +0x09, which is what made the twelve byte reading self checking, and writing it back from
  // the field keeps that property in the emitter.
  // Which section base slot 17 is comes from the architecture, mirroring `coverage.ts`: on arch 12
  // (Harmony One) a touch map, elsewhere the two bytes in front of the picture bank. Both are zero
  // in all thirteen containers that do this and both are written as zeros, so a nonzero second byte
  // fails the round trip rather than being carried past unnoticed. Section 84.
  const touch = touchPages(c);
  const slot17 = touchMapStart(c);
  if (touch === undefined && slot17 !== undefined && pictureBankStart(c) !== undefined) {
    framed(slot17, 'slot-17-table', new Writer(PICTURE_BANK_BIAS).u8(0).u8(0));
  }
  if (touch !== undefined) {
    const w = new Writer(touch.length).u8(touch.records.length);
    for (const page of touch.records) w.u24(page.address);
    while (w.remaining > 0) w.u8(0);
    framed(touch.start, 'slot-17-table', w);
    for (const page of touch.records) {
      const p = new Writer(page.length).u8(page.areas.length);
      for (const area of page.areas) p.u24(area.address);
      framed(page.start, 'slot-17-page', p);
      for (const area of page.areas) {
        at(area.address, 'slot-17-area', new Writer(TOUCH_AREA_LENGTH)
          .u16(area.x)
          .u16(area.width)
          .u16(area.y)
          .u16(area.height)
          .u8(area.code)
          .u24(area.self));
      }
    }
  }

  // The action lists base slot 10 addresses: a count, then three byte instructions. The extent is
  // the list's own, so this needs no size rule the reader does not already have.
  const lists = c.actionLists();
  const listSlot = slot(10);
  if (lists !== undefined && listSlot !== undefined) {
    const pointers = c.pointerArray(listSlot) ?? [];
    for (let k = 0; k < pointers.length && k < lists.length; k += 1) {
      const list = lists[k] as { operand: number; opcode: number }[];
      const w = new Writer(1 + 3 * list.length).u8(list.length);
      for (const instruction of list) w.u16(instruction.operand).u8(instruction.opcode);
      at(pointers[k] as number, 'slot-10-list', w);
    }
  }

  // Base slot 8's leading action list, the same shape one slot 10 entry down. Section 83.
  const bindingSlot = slot(BINDING_SLOT);
  if (bindingSlot !== undefined) {
    const address = (c.sections[bindingSlot] as { address: number }).address;
    const list = c.actionList(address);
    if (list !== undefined) {
      const w = new Writer(1 + 3 * list.length).u8(list.length);
      for (const instruction of list) w.u16(instruction.operand).u8(instruction.opcode);
      at(address, 'slot-8-list', w);
    }
  }

  // A counted array whose count is zero, which `coverage` claims and nothing else here would: the
  // section is the count field and, on arch 12's base slot 16, two zero bytes after it. Written as
  // zeros rather than copied, so a section that is not actually empty fails the round trip.
  for (const claim of claims(c)) {
    if (!claim.owner.endsWith('-table')) continue;
    if (claim.length > EMPTY_ARRAY_LIMIT) continue;
    if (c.blob.subarray(claim.start, claim.start + claim.length).some((b) => b !== 0)) continue;
    const w = new Writer(claim.length);
    for (let i = 0; i < claim.length; i += 1) w.u8(0);
    framed(claim.start, claim.owner, w);
  }

  // The twelve bytes past base slot 15 group 9, which only arch 12 (Harmony One) carries. **Framed
  // now, where the spare run they used to be was carried**: that run was written back raw with a
  // framed count of zero, on the reasoning that whose the bytes were was settled by position and
  // what they said was not. Section 103 read both halves out of the firmware, so the pair goes back
  // through `u16` fields and the field table through its own bytes, and a byte either reader has
  // wrong now fails the round trip instead of being copied past.
  const extras = lightBandExtras(c);
  if (extras !== undefined) {
    const pair = new Writer(extras.pair.length);
    for (const value of extras.pair.values) pair.u16(value);
    at(extras.pair.address, 'slot-15-band-pair', pair);
    const fields = new Writer(extras.fields.length);
    for (const byte of extras.fields.bytes) fields.u8(byte);
    at(extras.fields.address, 'slot-15-band-fields', fields);
  }

  // A tagged list, in either of its two forms.
  //
  // **The form comes from the length, never from the entries.** An empty wide list has no entry to
  // carry a flags byte, so reading the form off the entries makes it look narrow and the emitted
  // list comes out a byte short. Same family as the key code split and the field parity mistakes:
  // when the data could tell you and something else does tell you, believe the something else.
  const taggedBytes = (list: TaggedList): Writer => {
    const count = list.entries.length;
    // **The reader's answer, not a second derivation of it.** This computed the form from the length,
    // `count === 0 ? list.length === 2 : list.length - 2 === 5 * count`, where `sections.ts` reads it
    // from the first byte the way the firmware does and `edit.ts` took it from whether an entry
    // carries flags. Three spellings of one property, all agreeing, which is the state before two
    // diverge. `taggedList` carries it now.
    const wide = list.wide;
    const w = new Writer(list.length);
    if (wide) w.u8(0).u8(count);
    else w.u8(count);
    for (const entry of list.entries) {
      if (wide) w.u8(entry.flags ?? 0);
      w.u8(entry.tag).u16(entry.operand).u8(entry.opcode);
    }
    return w;
  };
  const taggedAt = (address: number, owner: string): void => {
    const list = taggedList(c, address);
    if (list !== undefined) framed(list.start, owner, taggedBytes(list));
  };

  // Base slot 6. The record's own bytes are its tagged list and nothing else, because the rest of
  // a record is not decoded; the entry is the six byte header and its page array; a page is a
  // lead byte on arch 12 and two pointers everywhere.
  for (const record of modeRecords(c) ?? []) {
    // The record that is the key table is rebuilt above under the name it had first, so this skips
    // it, on the same test `coverage.ts` uses. Only where there is a key table: arch 9 (Harmony 525)
    // has none, and there it is an ordinary mode record. Sections 52 and 84.
    //
    // **This used to lean on the dedup instead**, saying so in as many words, and that made the dedup
    // load bearing: two rebuilders wrote the same offset and whichever ran first won. It is not
    // hypothetical that they can differ, because they read through different readers, and a test in
    // this file demonstrates it by changing `c.keys[0]` in the parse and watching the output. Under
    // first come that test passed because the key table happened to run first; under a dedup that
    // compares it threw. Skipping here is what makes both true at once, and it is what `claims`
    // already did, which is the mirror this file is supposed to hold.
    if (!c.hasKeyTable || c.blobOffsetOf(record.start) !== c.markerOffset + 4) {
      taggedAt(record.start, 'slot-6-mode');
    }
    const entry = new Writer(record.entryLength)
      .u8(record.kind)
      .u24(record.start)
      .u16(record.pageCount);
    for (const page of record.pages) entry.u24(page.address);
    framed(c.blobOffsetOf(record.address), 'slot-6-entry', entry);
    for (const page of record.pages) {
      const w = new Writer(page.length);
      if (page.lead !== undefined) w.u8(page.lead);
      w.u24(page.list).u24(page.program);
      framed(c.blobOffsetOf(page.address), 'slot-6-page', w);
      taggedAt(page.list, 'slot-6-page-list');
    }
  }

  // Base slot 9's sets, and then the copies: one per mode page, read by nothing and emitted anyway
  // because the file has them. Section 69.
  for (const address of handlerSets(c)?.addresses ?? []) taggedAt(address, 'slot-9-list');
  for (const pool of taggedListPools(c)) {
    for (const list of pool.lists) taggedAt(list.start + c.flashBase, 'slot-6-page-list-copy');
  }

  // The screen language. The opcode byte is framed and the operands are carried, which is an
  // honest statement of where the reading stops: the walk knows how long every instruction is on
  // every architecture, and what the coordinates and identifiers inside one mean is open.
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      const w = new Writer(instruction.length).u8(instruction.opcode).raw(instruction.operands);
      let fields = 1;
      if (instruction.glyphs !== undefined) {
        w.raw(instruction.glyphs).u8(0);
        fields += 1;
      }
      partly(instruction.start, 'slot-11-program', w, fields);
    }
    // The terminator after a program that ended by transferring. Its value is known rather than
    // carried, since a terminator is the one opcode with nothing in it. Section 84.
    framed(deadTerminator(c, program), 'slot-11-program', new Writer(1).u8(SCREEN_END));
  }

  // Base slot 7. A set's header and pointer array are typed; a glyph is not, and cannot be.
  //
  // **A glyph is carried on purpose, and the reason is a rail rather than a shortcut.** The
  // decoder reads it to pixels, and pixels do not determine the bytes back: the encoder chose
  // where to skip and where to emit literals, and several encodings draw the same picture. So
  // re-encoding a glyph would produce a valid file that is not this file, and byte equality is
  // the whole test here. The same holds for an encoded picture below.
  for (const font of fontSets(c) ?? []) {
    const off = c.blobOffsetOf(font.address);
    if (off === undefined) continue;
    // Three header bytes: the height, the first code and the count, in whichever of the two
    // orders this set uses. `spare` is the byte the count did not come from, section 78.
    const w = new Writer(font.length).u8(font.height);
    if (font.countAt === 1) w.u8(font.count).u8(font.spare);
    else w.u8(font.first).u8(font.count);
    for (const glyph of font.glyphs) w.u24(glyph ?? 0);
    partly(off, 'slot-7-set', w, font.length - 1);
  }
  for (const set of glyphs(c) ?? []) {
    for (const glyph of set) {
      const off = c.blobOffsetOf(glyph.address);
      if (off === undefined) continue;
      partly(off, 'slot-7-glyph', new Writer(glyph.length)
        .u8(glyph.width)
        .raw(c.blob.subarray(off + 1, off + glyph.length)), 1);
    }
  }

  // The pictures: a five byte header from fields, the body carried, for the reason above.
  const pictures = [...(pictureBank(c, namedContentEnd(c)) ?? [])];
  const inBank = new Set(pictures.map((picture) => picture.address));
  for (const bitmap of bitmaps(c)) if (!inBank.has(bitmap.address)) pictures.push(bitmap);
  for (const picture of pictures) {
    const off = c.blobOffsetOf(picture.address);
    if (off === undefined || picture.length === undefined) continue;
    const owner = inBank.has(picture.address) ? 'picture-bank' : 'slot-11-bitmap';
    partly(off, owner, new Writer(picture.length)
      .u8(picture.kind)
      .u16(picture.stride)
      .u16(picture.rows)
      .raw(c.blob.subarray(off + 5, off + picture.length)), 5);
  }

  // Base slot 13's records: three `u16` of the seven byte header, then the values, which are
  // transitions and are written from their fields since section 86 read them. One header byte is
  // still carried, the `u8` at +0x06, which nothing has a reading for.
  for (const record of stateRecords(c) ?? []) {
    const off = c.blobOffsetOf(record.address);
    if (off === undefined) continue;
    const w = new Writer(record.length)
      .u16(record.first)
      .u16(record.second)
      .u16(record.count)
      .raw(c.blob.subarray(off + 6, off + 7));
    for (const value of record.values) {
      w.u8(0).u16(value.from).u16(value.to).u16(value.operand).u8(value.opcode);
    }
    partly(off, 'slot-13-record', w, record.length - 1);
  }

  // Base slot 5. The group arrays and the whole of a record header are typed now: section 92 read
  // the carrier out of the seven bytes below the class byte, which used to be copied. One byte of a
  // header is still unread, the zero at +0. A duration block is a stream this codec walks to its
  // terminator without decoding.
  for (const group of irGroups(c) ?? []) {
    const w = new Writer(group.length).u8(0).u16(group.addresses.length);
    for (const address of group.addresses) w.u24(address);
    framed(group.start, 'slot-5-group', w);
  }
  const blocks = new Set<number>();
  const bodies = new Set<number>();
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const encoding = irClass(c, address);
      if (encoding === undefined || !IR_HEADER_CLASSES.has(encoding)) continue;
      const start = irRecordStart(c, address);
      const off = start === undefined ? undefined : c.blobOffsetOf(start);
      if (off === undefined) continue;
      const carrier = irCarrier(c, address);
      if (carrier === undefined || start === undefined) continue;
      const w = new Writer(irHeaderLength(c, address))
        // The one byte nothing has read. Carried rather than written as a zero: it is zero in all
        // 3387 records here, and asserting that in the emitter would make a container that
        // disagreed round trip wrong instead of loudly.
        .raw(c.blob.subarray(off, off + IR_CARRIER_AT))
        .u24(carrier.periodNs)
        .u24(carrier.onNs)
        .u8(encoding)
        .u24(start)
        .u8(irGroupCount(c, address));
      for (const pointer of irHeaderPointers(c, address)) w.u24(pointer);
      partly(off, 'slot-5-header', w, irHeaderLength(c, address) - IR_CARRIER_AT);
      // The same two pointers, a different thing behind them: class 1 a duration stream, class 5 a
      // body naming a shared symbol table. Section 82.
      for (const block of irRecordBlocks(c, address)) {
        (encoding === IR_CLASS_STREAM ? blocks : bodies).add(block);
      }
    }
  }
  // Deduplicated, because a block can be named by two records, which is also why an editor cannot
  // change one in place without checking who else points at it. Section 61.
  for (const block of blocks) {
    const words = irBlockWords(c, block);
    if (words === undefined) continue;
    const w = new Writer(2 * words.length);
    for (const word of words) w.u16(word);
    framed(c.blobOffsetOf(block), 'slot-5-block', w);
  }
  // Class 5, all three levels of it, and every one of them is fully typed: a body is a pointer, a
  // count and a byte per index, a symbol table is a count and a pointer each, and a symbol block
  // is a count, its words and its terminator. Nothing here is an encoder's choice the way a glyph
  // or a picture body is, so all of it rebuilds rather than being carried. Section 82.
  const tables = new Set<number>();
  for (const address of bodies) {
    const body = irClass5Body(c, address);
    if (body === undefined) continue;
    const w = new Writer(body.length).u24(body.table).u16(body.indices.length);
    for (const index of body.indices) w.u8(index);
    framed(body.start, 'slot-5-class5-body', w);
    tables.add(body.table);
  }
  const symbols = new Set<number>();
  for (const address of tables) {
    const table = irSymbolTable(c, address);
    if (table === undefined) continue;
    const w = new Writer(table.length).u8(table.symbols.length);
    for (const symbol of table.symbols) w.u24(symbol);
    framed(table.start, 'slot-5-symbol-table', w);
    for (const symbol of table.symbols) symbols.add(symbol);
  }
  for (const address of symbols) {
    const block = irSymbolBlock(c, address);
    if (block === undefined) continue;
    const w = new Writer(block.length).u16(block.pulses.length);
    for (const pulse of block.pulses) w.u16(pulse);
    // The terminator is written as a zero rather than copied, so a block that does not end in one
    // fails the round trip instead of being reproduced quietly. All 50 in the corpus do.
    w.u16(0);
    framed(block.start, 'slot-5-symbol-block', w);
  }

  // Base slot 14's records, whose entry and range tables are fully typed. A record can end inside
  // the next one where the generator shared a tail, so the length is bounded the way `coverage`
  // bounds it and a shortened record falls back to carrying what is left.
  const maps = valueMaps(c);
  if (maps !== undefined && c.architecture !== undefined) {
    // **The width table, not a third copy of it.** This was `c.architecture === 14 ? 2 : 1`, which is
    // `VALUE_MAP_COUNT_WIDTH` written out again, in the file whose job is to mirror the readers.
    const counter = VALUE_MAP_COUNT_WIDTH[c.architecture] ?? 1;
    const starts = maps.map((m) => c.blobOffsetOf(m.address)).filter((o) => o !== undefined);
    for (const record of maps) {
      const off = c.blobOffsetOf(record.address);
      if (off === undefined) continue;
      const inside = starts.filter((o) => o > off && o < off + record.length);
      const bound = inside.length === 0 ? record.length : Math.min(...inside) - off;
      if (bound < record.length) {
        // A shared tail: the record does not own its own end, so nothing here can write it.
        //
        // **It has never happened**, 0 of 239 records across the corpus, the same zero its counterpart
        // in `coverage.ts` reports. Kept because a defence measured at zero is a prediction rather
        // than dead code, and asserted in the tests so the day it fires somebody reads it instead of
        // a record quietly declining to rebuild and the residue copy covering for it.
        continue;
      }
      const w = new Writer(bound).raw(c.blob.subarray(off, off + 1));
      if (counter === 1) w.u8(record.entries.length);
      else w.u16(record.entries.length);
      for (const [value, address] of record.entries) w.u16(value).u24(address);
      w.u8(record.ranges.length);
      for (const [low, high, address] of record.ranges) w.u16(low).u16(high).u24(address);
      partly(off, 'slot-14-record', w, bound - 1);
    }
  }

  return out;
}

/** The base slot number an architecture slot corresponds to, or undefined when it has none. */
function baseOf(c: Container, slot: number): number | undefined {
  if (c.architecture === undefined) return undefined;
  for (let base = 0; base < 20; base += 1) {
    try {
      if (archSlot(c.architecture, base) === slot) return base;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Rebuild a container's bytes.
 *
 * Everything `rebuilds` returns is written from the parse; every byte it does not claim is copied
 * from the source. A byte claimed twice with two different values is an error rather than a last
 * writer wins, for the same reason `coverage` reports overlaps: it means one of the two readers
 * is sized wrong, and that is invisible in either reader's own tests.
 */
export function emit(c: Container): EmitReport {
  const source = c.blob;
  const out = new Uint8Array(source.length);
  out.fill(POISON);

  const written = new Uint8Array(source.length);
  const byOwner = new Map<string, number>();
  let framed = 0;
  let carried = 0;

  for (const rebuild of rebuilds(c)) {
    const { start, bytes, owner } = rebuild;
    if (start < 0 || start + bytes.length > out.length) {
      throw new GspmError(`${owner} at ${start} runs past the container`);
    }
    for (let i = 0; i < bytes.length; i += 1) {
      const byte = bytes[i] as number;
      if (written[start + i] === 1 && out[start + i] !== byte) {
        throw new GspmError(`two rebuilds disagree about byte ${start + i}, one of them is ${owner}`);
      }
      out[start + i] = byte;
      written[start + i] = 1;
    }
    framed += rebuild.framed;
    carried += bytes.length - rebuild.framed;
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + rebuild.framed);
  }

  // The residue, copied by name: exactly the bytes no rebuilder claimed. This is the number the
  // milestone drives to zero, and it is the only route by which a source byte reaches the output
  // without passing through a reader.
  let copied = 0;
  for (let i = 0; i < out.length; i += 1) {
    if (written[i] === 1) continue;
    out[i] = source[i] as number;
    copied += 1;
  }

  // The trailer checksum last, because it covers every byte the rebuilders just wrote. The end
  // marker is part of the frame and sits outside what the checksum covers.
  const endMarker = c.family.endMarker;
  for (let i = 0; i < COOKIE_LENGTH; i += 1) {
    out[out.length - COOKIE_LENGTH + i] = endMarker.charCodeAt(i);
  }
  const checksum = trailerChecksum(out);
  const checksumAt = out.length - TRAILER_CHECKSUM_OFFSET;
  out[checksumAt] = checksum & 0xff;
  out[checksumAt + 1] = (checksum >>> 8) & 0xff;
  framed += TRAILER_CHECKSUM_OFFSET;
  copied -= TRAILER_CHECKSUM_OFFSET;
  byOwner.set('trailer', TRAILER_CHECKSUM_OFFSET);

  return {
    bytes: out,
    framed,
    carried,
    copied,
    byOwner: [...byOwner].sort((a, b) => b[1] - a[1]),
  };
}

/** Whether emitting a container reproduces it exactly, and where the first difference is. */
export interface RoundTrip {
  equal: boolean;
  /** Offset of the first differing byte, or undefined when they match. */
  firstDifference?: number;
  framed: number;
  carried: number;
  copied: number;
  total: number;
}

/**
 * Emit and compare, which is milestone M2's test.
 *
 * Reported rather than asserted, so a caller can measure the whole corpus and see which samples
 * fail instead of stopping at the first.
 */
export function roundTrip(c: Container): RoundTrip {
  const report = emit(c);
  const source = c.blob;
  const totals = {
    framed: report.framed,
    carried: report.carried,
    copied: report.copied,
    total: source.length,
  };
  const bytes = report.bytes;
  if (bytes.length !== source.length) {
    return { equal: false, firstDifference: Math.min(bytes.length, source.length), ...totals };
  }
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] !== source[i]) return { equal: false, firstDifference: i, ...totals };
  }
  return { equal: true, ...totals };
}
