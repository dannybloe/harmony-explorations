/**
 * Is this configuration for this remote: the compatibility gate, performed rather than asserted.
 *
 * A config that arrives as a **file** carries an XML wrapper, and in it an `<INTENDEDVERSION>` block
 * naming the remote it was built for. Logitech's own software compares that block against the
 * connected remote and refuses a mismatch, and `docs/findings.md` section 87 read the comparison out
 * of their file format classes: **six fields**, `PROTOCOL`, `SKIN`, `FLASH`, `BOARD`,
 * `SOFTWARETYPE` and `ARCHITECTURE`, with an absent or empty field matching anything.
 *
 * `docs/adding-a-device.md` phase 8 has asked for that comparison since 25 August 2026 and nothing
 * performed it: `WritePermission` took a boolean called `intendedVersionMatches` and every caller
 * passed `true`. So the rail with the most specific job of all of them, refusing a config built for
 * a different remote, was the caller's opinion. This module is that comparison, and section 225 is
 * the derivation of which remote-side value each field means.
 *
 * ## The mapping, and how each side states itself
 *
 * The two sides use different notations for the same quantity, which is most of the work here:
 *
 * | field | the config states | the remote reports | so |
 * |---|---|---|---|
 * | `PROTOCOL` | `12` | architecture nibble `0xC` | decimal, and it is the **architecture** |
 * | `SKIN` | `54` | field 5 | decimal |
 * | `FLASH` | `0x1F:0xC8` | fields 3 and 2 as `1F:C8` | manufacturer and device, per half |
 * | `BOARD` | `0.5.0` | field 1's two nibbles, `0.5` | three components against two |
 * | `SOFTWARETYPE` | `0` | architecture field's low nibble | decimal |
 * | `ARCHITECTURE` | never stated in any sample | architecture nibble | decimal, unexercised |
 *
 * **`PROTOCOL` carries the architecture and not a protocol version**, which is the one that could
 * have gone wrong quietly: this project has a `platform` field too, field 6, and it is `0x0C` on
 * both arch 12 (Harmony One) and arch 14 (Harmony 600), so reading `PROTOCOL` as that would match a
 * Harmony 600's config to a Harmony One. The corpus settles it: six configs state 12, 14, 9 and 8,
 * one per architecture, which is the architecture nibble and cannot be field 6.
 *
 * **`BOARD`'s third component is not in the version block**, and that is not a gap in our reading.
 * concordance's own `GET_VERSION` sets `hw_ver_micro = 0` outright with the comment that "usbnet
 * remotes have a non-zero micro version", so for every model this library speaks to the third
 * component is zero by construction. Both sides are therefore normalised to three components with a
 * zero fill, which makes `0.5` and `0.5.0` the same board.
 *
 * ## What it refuses, and the one thing it deliberately does not
 *
 * A field the config states and this table does not know is a **refusal**, not something ignored.
 * That is the rule this repository has relearned twice from missing table entries read as
 * permission, `WRITABLE_CEILING`'s hole and the band table's, and a comparison that skips what it
 * does not understand is the same shape: it would report a match having compared nothing.
 *
 * An **absent** field is not a refusal, because the format says so: a wrapper offering a fallback
 * entry with no fields at all is how Logitech attaches a "not compatible" message to every remote
 * the entries above it did not catch. So `compared` is part of the result and a caller that needs
 * the gate to have done work has to look at it. A container read off a remote has **no wrapper at
 * all**, so it states nothing and `compared` is zero; that is the truth about such a container and
 * not a pass.
 */
import { readVersion, type VersionReading } from './protocol.ts';

/** What a config's wrapper states, field name to value, exactly as it states it. */
export type StatedVersion = Readonly<Record<string, string>>;

export type FieldVerdict = 'match' | 'mismatch' | 'not-stated';

export interface CompatibilityField {
  /** The wrapper's own name for the field. */
  readonly field: string;
  /** What the config said, or undefined where it said nothing. */
  readonly stated: string | undefined;
  /** What the remote says, in the config's notation, so the two can be shown side by side. */
  readonly reported: string;
  readonly verdict: FieldVerdict;
}

export interface Compatibility {
  readonly fields: readonly CompatibilityField[];
  /** How many fields carried an actual comparison. Zero means the config claimed nothing. */
  readonly compared: number;
  /** The names of the fields that disagree, in table order. */
  readonly mismatched: readonly string[];
  /** True when nothing disagrees. **Not** the same as having checked anything. */
  readonly compatible: boolean;
}

export class CompatibilityError extends Error {}

/** Three components, zero filled, so a two component board version compares with a three. */
function threeComponents(text: string): string {
  const parts = text.split('.').map((p) => p.trim());
  while (parts.length < 3) parts.push('0');
  return parts.slice(0, 3).map((p) => String(Number.parseInt(p, 10) || 0)).join('.');
}

/** A decimal or `0x` prefixed number, whichever the side happened to use. */
function value(text: string): number {
  return Number.parseInt(text.trim(), text.trim().toLowerCase().startsWith('0x') ? 16 : 10);
}

/**
 * A flash id half, always hex.
 *
 * **Never `value`, and a test caught that.** A JEDEC manufacturer and device id is hex by
 * definition, and the corpus writes both halves `0x` prefixed, so a general "decimal unless
 * prefixed" reader turns `1F` into 1 and then reports a mismatch for a chip that matches, or worse
 * a match for one that does not: `10` would read as ten against the remote's sixteen. There is no
 * reading of a flash id in which the base is the writer's choice.
 */
function flashHalf(text: string): number {
  const trimmed = text.trim().replace(/^0[xX]/, '');
  return /^[0-9a-fA-F]+$/.test(trimmed) ? Number.parseInt(trimmed, 16) : Number.NaN;
}

/**
 * How to compare one field, and how to say what the remote reports in the config's own notation.
 *
 * **The keys of this table are the six fields**, and they are deliberately not a second copy of
 * `INTENDED_VERSION_FIELDS` in `packages/codec`: that list is the config format's vocabulary and
 * belongs there, this table is the mapping to a protocol reading and belongs here.
 * `packages/usb/test/compatible.test.ts` compares the two entry for entry, which is what this
 * repository does with two tables that must agree rather than trusting them to.
 */
const COMPARATORS: Readonly<Record<string, (r: VersionReading) => {
  reported: string;
  same: (stated: string) => boolean;
}>> = {
  PROTOCOL: (r) => ({
    reported: String(r.architecture),
    same: (s) => value(s) === r.architecture,
  }),
  SKIN: (r) => ({ reported: String(r.skin), same: (s) => value(s) === r.skin }),
  FLASH: (r) => ({
    reported: `0x${r.flash.replace(':', ':0x')}`,
    same: (s) => {
      const stated = s.split(':');
      const reported = r.flash.split(':');
      if (stated.length !== 2 || reported.length !== 2) return false;
      return stated.every((half, i) => {
        const a = flashHalf(half);
        const b = flashHalf(reported[i] as string);
        return Number.isNaN(a) || Number.isNaN(b) ? false : a === b;
      });
    },
  }),
  BOARD: (r) => ({
    reported: threeComponents(r.hardware),
    same: (s) => threeComponents(s) === threeComponents(r.hardware),
  }),
  SOFTWARETYPE: (r) => ({
    reported: String(r.softwareType),
    same: (s) => value(s) === r.softwareType,
  }),
  ARCHITECTURE: (r) => ({
    reported: String(r.architecture),
    same: (s) => value(s) === r.architecture,
  }),
};

/** The fields this module can compare, in table order. */
export const COMPARABLE_FIELDS: readonly string[] = Object.keys(COMPARATORS);

/**
 * Compare what a config states against what a remote reports.
 *
 * Throws on a field this module has no comparator for, and on a version block too short to be an
 * identity. Never returns a bare boolean: the caller of a refusal needs to know which field.
 */
export function compareIntendedVersion(
  stated: StatedVersion,
  reading: VersionReading,
): Compatibility {
  for (const field of Object.keys(stated)) {
    if (COMPARATORS[field] === undefined) {
      throw new CompatibilityError(
        `${field} is not a field this comparison knows, so a match would mean nothing: the six ` +
          `it compares are ${COMPARABLE_FIELDS.join(', ')}`,
      );
    }
  }

  const fields: CompatibilityField[] = [];
  const mismatched: string[] = [];
  let compared = 0;
  for (const field of COMPARABLE_FIELDS) {
    const how = (COMPARATORS[field] as (r: VersionReading) => {
      reported: string;
      same: (s: string) => boolean;
    })(reading);
    const raw = stated[field];
    // Absent and empty are the same case, per the format's own rule, and whitespace is trimmed
    // because a wrapper written across lines states an empty field as a newline.
    if (raw === undefined || raw.trim() === '') {
      fields.push({ field, stated: raw, reported: how.reported, verdict: 'not-stated' });
      continue;
    }
    compared += 1;
    const same = how.same(raw);
    if (!same) mismatched.push(field);
    fields.push({
      field,
      stated: raw,
      reported: how.reported,
      verdict: same ? 'match' : 'mismatch',
    });
  }

  return { fields, compared, mismatched, compatible: mismatched.length === 0 };
}

/** The same, from the raw version block a remote sent, which is what a rail is handed. */
export function compareIntendedVersionAgainstBlock(
  stated: StatedVersion,
  versionBlock: Uint8Array,
): Compatibility {
  return compareIntendedVersion(stated, readVersion(versionBlock));
}
