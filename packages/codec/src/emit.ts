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
 */

import {
  CLOCK_COOKIE,
  CLOCK_END,
  CLOCK_EPOCH_MS,
  Container,
  GspmError,
  MS_PER_DAY,
  POINTER_SIZE,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  trailerChecksum,
} from './gspm.ts';
import { countedPointers } from './valuemap.ts';
import {
  EVENT_MAP_SLOT,
  STATE_TABLE_SLOT,
  eventMap,
  handlerSets,
  modeTable,
  stateTable,
} from './sections.ts';
import {
  TIMER_RECORD_LENGTH,
  TOUCH_AREA_LENGTH,
  parameterGroups,
  timers,
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
export const END_ADDR_OFFSET = 4;
export const FORMAT_OFFSET = 8;
/** The format word's own bytes. The fourth is section slot 0's spare, which the table writes. */
export const FORMAT_LENGTH = SECTION_TABLE_OFFSET - FORMAT_OFFSET;

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
  const seen = new Set<number>();

  /** A rebuild where some of the bytes came through as an opaque run rather than as fields. */
  const partly = (start: number | undefined, owner: string, w: Writer, fields: number): void => {
    if (start === undefined || seen.has(start)) return;
    if (w.remaining !== 0) {
      throw new GspmError(`${owner} wrote ${w.bytes.length - w.remaining} of ${w.bytes.length}`);
    }
    seen.add(start);
    out.push({ start, bytes: w.bytes, owner, framed: fields });
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
  const archAt = sectionStart(1);
  if (archAt !== undefined && c.architecture !== undefined && c.versionWord !== undefined) {
    partly(archAt, 'slot-1-arch', new Writer(7)
      .u8(c.architecture)
      .u8(c.architecture)
      .u16(c.versionWord)
      .raw(c.blob.subarray(archAt + 4, archAt + 7)), 4);
  }

  // Section slot 3's timestamp, and the day of week byte is the interesting one: it is derived
  // rather than stored back, so emitting it recomputes days since 1 January 2000 modulo 7 and the
  // round trip is a second confirmation of section 21's field assignment, on every container that
  // has one.
  const clockAt = sectionStart(3);
  if (clockAt !== undefined && c.builtAt !== undefined) {
    const t = c.builtAt;
    const year = Number(t.slice(0, 4));
    const month = Number(t.slice(5, 7)) - 1;
    const day = Number(t.slice(8, 10));
    const dow = ((Math.floor((Date.UTC(year, month, day) - CLOCK_EPOCH_MS) / MS_PER_DAY) % 7) + 7) % 7;
    framed(clockAt, 'slot-3-clock', new Writer(11)
      .raw(CLOCK_COOKIE)
      .u8(Number(t.slice(17, 19)))
      .u8(Number(t.slice(14, 16)))
      .u8(Number(t.slice(11, 13)))
      .u8(day)
      .u8(dow)
      .u8(month)
      .u8(year - 2000)
      .raw(CLOCK_END));
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
    framed(array.start, `slot-${base ?? i}-table`, w);
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
  const touch = touchPages(c);
  if (touch !== undefined) {
    const w = new Writer(touch.length).u8(touch.records.length);
    for (const page of touch.records) w.u24(page.address);
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

/** Kept so the pointer size is referenced where an emitter would need it next. */
export const EMIT_POINTER_SIZE = POINTER_SIZE;
