/**
 * Which unit is on the cable, from the identity block in its own program memory.
 *
 * **Why this exists.** `WritePermission` asked the caller `targetIsTheSpareRemote`, a boolean, and
 * the answer was always `true`. Two Harmony Ones enumerate identically, so nothing the library could
 * see distinguished the spare from the programmed unit whose configuration is this project's most
 * used sample, and section 188 recorded that as a caller assertion the library cannot check. It can.
 *
 * The route was already read and needs no new protocol: `docs/usb-protocol.md` found a 64 byte
 * identity block at internal page `0xFF` offset `0xF400`, confirmed on three remotes across two
 * architectures, and the closure is strong. `concordance -i` prints three GUIDs for a connected
 * remote, the lab holds that output for one exact unit from months earlier, and all three appear in
 * this block in the same order. So an address predicted in advance returned three values obtained
 * without this code.
 *
 * **This is what Logitech identifies a unit by.** Their service takes those three GUIDs as a serial
 * and `ValidateRemote` refuses a synthetic one, section 136, which is how a remote is bound to an
 * account. Danny's decision on 30 August 2026 was to do the same rather than invent a fingerprint
 * out of configuration bytes, which was this project's own earlier proposal and was reinventing a
 * serial check the hard way.
 *
 * ## Where a serial is kept, which is the caller's business and not this module's
 *
 * Also his decision, the same day, and it is the reason this module holds **no table of units** and
 * reads no file. The comparison is between two blocks a caller supplies, so where the expected one
 * is kept is the caller's decision:
 *
 * * on the bench, a file in the **private lab**, since a unit identifier is that unit's hardware
 *   identity and this repository is public
 * * in **FreeHarmony**, stored with the user's own data alongside everything else it knows about
 *   their remote, which is Danny's statement of the product design on 30 August 2026
 *
 * Both want the same thing out of here: the identity in a form that can be written down and read
 * back, which is `unitIdentityText`, and a comparison that takes it. `packages/probe` is deliberately
 * untouched, because its report is meant to be published **by other people** and dropping the serial
 * from the enumeration path is why it can be.
 *
 * ## The trap this module is mostly about
 *
 * **The field called the serial is `0xEE` filled on every remote read here**, all three of them,
 * `docs/usb-protocol.md`: it is a field nobody writes, and `concordance -i` agrees it is unset. So a
 * comparison of that field alone matches every unit against every other, which is the whole failure
 * this code is supposed to prevent, arrived at by doing the obvious thing. The per unit values are
 * the two GUIDs after it. `identifiesAUnit` is the refusal: a block whose GUID fields are uniform
 * filler is not an identification and must not be treated as one.
 */

/** The internal page the block sits in. `0xFE` is a different page and maps program address zero. */
export const IDENTITY_PAGE = 0xff;

/** Its offset in that page, predicted before it was read and confirmed on three remotes. */
export const IDENTITY_OFFSET = 0xf400;

/**
 * Four 16 byte fields, and the count is even, which matters.
 *
 * An internal read of an **odd** count never terminates and hangs the remote, section 94, so a
 * length is not a free choice here. 64 is the block and is even.
 */
export const IDENTITY_BYTES = 64;

/** Where each field starts, from `docs/usb-protocol.md`'s reading of the block. */
export const IDENTITY_FIELDS = {
  /** All `0xEE` on every unit read here. Present, and useless for telling units apart. */
  serial: 0x00,
  guidA: 0x10,
  guidB: 0x20,
  /** Sixteen zero bytes on every unit read here. */
  trailer: 0x30,
} as const;

export class UnitIdentityError extends Error {}

/** The two GUID fields, 32 bytes, which is the currency every function below deals in. */
export const DISCRIMINATOR_BYTES = IDENTITY_FIELDS.trailer - IDENTITY_FIELDS.guidA;

/**
 * The bytes that actually differ between units: the two GUIDs, 32 bytes.
 *
 * Deliberately not the whole block. Including the serial field would let a comparison pass on
 * sixteen bytes of `0xEE` that every unit has, and including the trailer would add sixteen zeroes.
 * Neither carries information and both would dilute a byte count somebody quotes later.
 *
 * **Two lengths are accepted and no others**: the whole 64 byte block, as a read returns it, and a
 * 32 byte discriminator, as a caller stored it. Anything else is a refusal rather than a subarray of
 * whatever arrived, because the one mistake that matters here is comparing the wrong 32 bytes and
 * getting a confident answer.
 */
export function unitDiscriminator(blockOrDiscriminator: Uint8Array): Uint8Array {
  const bytes = blockOrDiscriminator;
  if (bytes.length === DISCRIMINATOR_BYTES) return bytes;
  if (bytes.length === IDENTITY_BYTES) {
    return bytes.subarray(IDENTITY_FIELDS.guidA, IDENTITY_FIELDS.trailer);
  }
  throw new UnitIdentityError(
    `a unit identity is ${IDENTITY_BYTES} bytes as read or ${DISCRIMINATOR_BYTES} as stored, ` +
      `and this is ${bytes.length}`,
  );
}

/** Bytes that are all one value, which is what an unwritten field looks like. */
function uniform(bytes: Uint8Array): boolean {
  const first = bytes[0];
  return bytes.every((b) => b === first);
}

/**
 * Whether this block says anything about **which** unit it came from.
 *
 * The refusal, not a convenience. `0xEE`, `0xFF` and `0x00` fills are all things this project has
 * seen in a field nobody writes, and a uniform GUID pair would make two units indistinguishable
 * while a byte comparison reported a confident match.
 */
export function identifiesAUnit(blockOrDiscriminator: Uint8Array): boolean {
  const discriminator = unitDiscriminator(blockOrDiscriminator);
  if (uniform(discriminator)) return false;
  // Each GUID uniform on its own is the same problem one level down: a unit with one written GUID
  // and one filler field is identified by half as many bytes as a caller would assume.
  const a = discriminator.subarray(0, 0x10);
  const b = discriminator.subarray(0x10);
  return !uniform(a) && !uniform(b);
}

/**
 * The identity as text, for a caller that has to store it and read it back.
 *
 * Hex of the discriminator, 64 characters, lower case, no separators. The form matters because both
 * callers persist it: the bench writes the block into the lab and FreeHarmony keeps it with the
 * user's data, so a value written by one version has to be readable by the next. Hex of the bytes as
 * they came is the one encoding with nothing to get wrong later; a GUID rendering would not be,
 * since the two after the serial are stored mixed endian and every reader would have to agree on
 * which way round to print them.
 */
export function unitIdentityText(block: Uint8Array): string {
  return [...unitDiscriminator(block)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The inverse, for reading a stored identity back. Refuses anything that is not the right length. */
export function unitIdentityFromText(text: string): Uint8Array {
  const cleaned = text.trim().toLowerCase();
  const expected = DISCRIMINATOR_BYTES * 2;
  if (!new RegExp(`^[0-9a-f]{${expected}}$`).test(cleaned)) {
    throw new UnitIdentityError(
      `a stored unit identity is ${expected} hex characters and this is ` +
        `${cleaned.length}${/^[0-9a-f]*$/.test(cleaned) ? '' : ' and not all hex'}`,
    );
  }
  const out = new Uint8Array(expected / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(cleaned.slice(2 * i, 2 * i + 2), 16);
  }
  return out;
}

/**
 * Whether two identity blocks came off the same unit.
 *
 * Byte exact over the discriminator, and it refuses rather than answering false when either block
 * carries no identity: `false` would read as "a different unit" where the truth is "this cannot be
 * told", and a rail acting on the first is a rail that refuses for a reason that is not true.
 */
export function sameUnit(a: Uint8Array, b: Uint8Array): boolean {
  for (const [name, block] of [['read', a], ['expected', b]] as const) {
    if (!identifiesAUnit(block)) {
      throw new UnitIdentityError(
        `the ${name} identity block carries no per unit value: its GUID fields are uniform filler, ` +
          'so it cannot say which remote this is. The field named the serial is 0xEE on every unit ' +
          'here and is not an identifier.',
      );
    }
  }
  const left = unitDiscriminator(a);
  const right = unitDiscriminator(b);
  return left.length === right.length && left.every((byte, i) => byte === right[i]);
}
