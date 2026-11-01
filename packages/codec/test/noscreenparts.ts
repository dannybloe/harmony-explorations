/**
 * How the no screen family's tests read a configuration part by part rather than offset by offset, shared by
 * `noscreen.test.ts` (a device, `todo-compile-350.md` 4.1 and 4.4) and `noscreenfavourites.test.ts` (the favourite
 * channels, 4.3). Logitech's compiler numbers lists, maps, timers and records in an order no compile shows a rule
 * for, so a record is compared by what it sends and a list by what it does with every list it calls written out.
 */
import {
  bytes, type Container, devices, irBlockWords, irGroups, irHeaderPointers, irRecordStart, mapOfGroup, stateRecords, stateVariables,
  taggedList,
} from '../src/index.ts';

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

// What follows reads a whole configuration part by part with every number that follows placement named, for the
// tests that hold a file composed here against Logitech's whole compile: `noscreenremove.test.ts`, 4.1.3, and
// `noscreensetup.test.ts`, 4.5.

/**
 * A spelling with every number that follows placement named instead: a select by the device whose map it is, a
 * timer start as `ebnn` (every timer of one key is the same record), and a state variable by its name, in a write,
 * a condition and a load. What is left is what the instruction does.
 */
export function namer(c: Container): (text: string) => string {
  const owner = new Map<number, string>();
  for (const one of devices(c)) if (one.name !== undefined && one.group !== undefined) owner.set(mapOfGroup(c, one.group), one.name);
  const names = new Map(stateVariables(c).map((one) => [one.index, one.name]));
  const variable = (hex: string) => names.get(parseInt(hex, 16)) ?? `?${hex}`;
  return (text) => text
    .replace(/1f:ff([0-9a-f]{1,2})\b/g, (_, map: string) => `select(${owner.get(parseInt(map, 16)) ?? `?${map}`})`)
    .replace(/1f:eb[0-9a-f]{1,2}\b/g, 'ebnn')
    .replace(/\b([89][0-9a-f]):/g, (_, opcode: string) => `w(${names.get(parseInt(opcode, 16) - 0x80) ?? `?${opcode}`}):`)
    .replace(/71:80([0-9a-f]{2})\b/g, (_, hex: string) => `if(${variable(hex)})`)
    .replace(/71:([0-9a-f]{1,2})\b/g, (_, hex: string) => `on(${variable(hex)})`);
}

/** Every action list, written out and named, as a multiset. */
export function allLists(c: Container): Map<string, number> {
  const name = namer(c);
  const out = new Map<string, number>();
  c.pointerArray(7)!.forEach((_, index) => {
    const text = name(spelled(c, { operand: index, opcode: 0x7f }));
    out.set(text, (out.get(text) ?? 0) + 1);
  });
  return out;
}

/** A key map, tag to binding written out and named; the map of a device by its name, the key table as `keys`. */
export function maps(c: Container): Record<string, Record<string, string>> {
  const name = namer(c);
  const read = (entry: number) => Object.fromEntries(taggedList(c, c.pointerArray(6)![entry]!)!.entries
    .map((one) => [one.tag.toString(16), name(spelled(c, one))]));
  const out: Record<string, Record<string, string>> = { keys: read(0) };
  for (const one of devices(c)) if (one.name !== undefined && one.group !== undefined) out[one.name] = read(mapOfGroup(c, one.group));
  return out;
}

/** Each group's records, by device name, as `recordKey`s in the group's order. */
export function records(c: Container): Record<string, string[]> {
  const groups = irGroups(c)!;
  return Object.fromEntries(devices(c).filter((one) => one.name !== undefined && one.group !== undefined)
    .map((one) => [one.name!, groups[one.group!]!.addresses.map((address) => recordKey(c, address))]));
}

/** Each state variable's record by name: its first value, its maximum and its transitions written out. */
export function transitions(c: Container): Record<string, string> {
  const name = namer(c);
  const all = stateRecords(c)!;
  return Object.fromEntries(stateVariables(c).map((one) => {
    const record = all[one.index]!;
    return [one.name, `${record.first}/${record.second} ${record.values.map((value) => `${value.from}>${value.to} ${name(spelled(c, value))}`).sort().join(' ')}`];
  }));
}

/** Every timer record's seven bytes, sorted. */
export function timerRecords(c: Container): string[] {
  return c.pointerArray(8)!.map((address) => {
    const at = c.blobOffsetOf(address)!;
    return Array.from(c.blob.subarray(at, at + 7)).join(',');
  }).sort();
}

export const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
