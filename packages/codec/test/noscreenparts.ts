/**
 * How the no screen family's tests read a configuration part by part rather than offset by offset, shared by
 * `noscreen.test.ts` (a device, `todo-compile-350.md` 4.1 and 4.4) and `noscreenfavourites.test.ts` (the favourite
 * channels, 4.3). Logitech's compiler numbers lists, maps, timers and records in an order no compile shows a rule
 * for, so a record is compared by what it sends and a list by what it does with every list it calls written out.
 */
import { bytes, type Container, irBlockWords, irGroups, irHeaderPointers, irRecordStart, taggedList } from '../src/index.ts';

/** A record as its header, its own address zeroed, and each block's words: what it sends, wherever it sits. */
export function recordKey(c: Container, address: number): string {
  const off = c.blobOffsetOf(irRecordStart(c, address)!)!;
  const header = c.blob.slice(off, off + 12);
  header.fill(0, 8, 11);
  const blocks = irHeaderPointers(c, address).map((pointer) => (pointer === 0 ? '-' : irBlockWords(c, pointer)!.join(',')));
  return `${Buffer.from(header).toString('hex')}/${blocks.join('|')}`;
}

/** A record's once block without the silence it opens with, and whether it has a held block. */
export function onceWithoutLeadIn(c: Container, address: number): { code: string; held: boolean; opening: number } {
  const [once, held] = irHeaderPointers(c, address);
  const words = irBlockWords(c, once!)!;
  const first = words.findIndex((word) => (word & 0x8000) !== 0);
  return { code: words.slice(first).join(','), held: held !== 0, opening: first };
}

/**
 * One instruction with every list it calls written out, and every send named by the record it sends: its first
 * `width` characters of `recordKey`, which tell apart every code of one device on the maps compared so far, or the
 * whole of it where codes share a long opening, as one device's digits do.
 */
export function spelled(c: Container, one: { operand: number; opcode: number }, depth = 0, width = 40): string {
  if (one.opcode === 0x7d) {
    const group = irGroups(c)![one.operand >> 8]!;
    return `send(${recordKey(c, group.addresses[one.operand & 0xff]!).slice(0, width)}..)`;
  }
  if (one.opcode === 0x7c) return `7c:${(one.operand & 0xff).toString(16)}`;
  if (one.opcode !== 0x7f || depth > 6) return `${one.opcode.toString(16)}:${one.operand.toString(16)}`;
  const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
  const body = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => ({
    operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
  }));
  return `(${body.map((x) => spelled(c, x, depth + 1, width)).join(' ')})`;
}

/** A key map, tag to spelled binding, with the state variable a write or a condition names left out. */
export function spelledMap(c: Container, entry: number, width = 40): Map<number, string> {
  const list = taggedList(c, c.pointerArray(6)![entry]!)!;
  // A condition's variable is its operand's low byte, `71:80vv`, and a write's its opcode's low seven bits, `9v:`.
  return new Map(list.entries.map((one) => [one.tag, spelled(c, one, 0, width)
    .replace(/71:80[0-9a-f]{2}/g, '71:80vv').replace(/\b9[0-9a-f]:/g, '9v:')]));
}
