/**
 * Bounds-checked little-endian reads over a byte array.
 *
 * Python's `struct.unpack_from` raises when it runs off the end of a buffer, and the parser this
 * is a port of leans on that: several of its checks are written as "read it and see". JavaScript
 * does the opposite and hands back `undefined`, which then becomes `NaN` in arithmetic and a
 * plausible-looking wrong answer three functions later. So every read goes through here, and
 * running off the end is an error with an offset in it.
 *
 * The 24-bit read is not a convenience. Six sections per config are arrays of three-byte flash
 * pointers, because 24 bits covers the whole config region and the fourth byte would have cost
 * 8 KiB in one section of the Harmony 700 config alone.
 */

export class BytesError extends RangeError {}

function at(data: Uint8Array, offset: number): number {
  const byte = data[offset];
  if (byte === undefined) {
    throw new BytesError(`read at offset ${offset} is outside a ${data.length} byte buffer`);
  }
  return byte;
}

export function u8(data: Uint8Array, offset: number): number {
  return at(data, offset);
}

export function u16(data: Uint8Array, offset: number): number {
  return at(data, offset) | (at(data, offset + 1) << 8);
}

export function u24(data: Uint8Array, offset: number): number {
  return at(data, offset) | (at(data, offset + 1) << 8) | (at(data, offset + 2) << 16);
}

export function u32(data: Uint8Array, offset: number): number {
  // Assembled with multiplication rather than a shift, because `<< 24` in JavaScript produces a
  // signed 32-bit result and a flash address with the top bit set would come back negative.
  return u24(data, offset) + at(data, offset + 3) * 0x1000000;
}

/** The unsigned little-endian integer of `width` bytes at `offset`. */
export function uint(data: Uint8Array, offset: number, width: number): number {
  switch (width) {
    case 1:
      return u8(data, offset);
    case 2:
      return u16(data, offset);
    case 3:
      return u24(data, offset);
    case 4:
      return u32(data, offset);
    default:
      throw new BytesError(`no ${width} byte integer reader`);
  }
}

/** ASCII text of `length` bytes at `offset`, for the four letter cookies and markers. */
export function ascii(data: Uint8Array, offset: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(at(data, offset + i));
  return out;
}

/** Whether `data` holds `needle` at `offset`, false rather than throwing when it runs off. */
export function matchesAt(data: Uint8Array, offset: number, needle: Uint8Array): boolean {
  if (offset < 0 || offset + needle.length > data.length) return false;
  for (let i = 0; i < needle.length; i += 1) {
    if (data[offset + i] !== needle[i]) return false;
  }
  return true;
}

/** Offset of the first occurrence of `needle` at or after `from`, or -1. */
export function indexOf(data: Uint8Array, needle: Uint8Array, from = 0): number {
  if (needle.length === 0) return from;
  const last = data.length - needle.length;
  const first = needle[0] as number;
  for (let off = Math.max(0, from); off <= last; off += 1) {
    if (data[off] !== first) continue;
    if (matchesAt(data, off, needle)) return off;
  }
  return -1;
}

/** The bytes of an ASCII string, for spelling cookies out where they are used. */
export function bytesOf(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}
