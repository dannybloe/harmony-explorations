/**
 * Two sections whose content no configuration chooses, built: base slot 2, the log area, and base slot
 * 15, the parameter block. `todo-compile-650.md` 10.2 built both for the Harmony 600, 650 and 700 inside
 * `wiring.ts`; `todo-compile-one.md` 6.4 moved the building here so that the Harmony One's are built by
 * the same code, plan 007.
 *
 * **What differs between architectures is data read in one place**, as the frame's is:
 *
 * * the log area's region is the architecture's, `LOG_AREAS`, the same on every compile of it: on arch 14
 *   (Harmony 600, 650 and 700) sixteen thousand eight byte records from `0x1E0000` to `0x200000` on the
 *   thirteen compiles section 312 lists, and on arch 12 (Harmony One) sixteen records from `0x3FFFF0` to
 *   `0x400000` on its 19 distinct compiles, `todo-compile-one.md` 2.2. Its capacity is a `u24` on arch 12
 *   and a `u16` on arch 14, the readers' own `LOG_AREA_WIDE_ARCHITECTURES`;
 * * the parameter block's group lengths the firmware demands are the readers' `PARAMETER_GROUP_COUNTS`,
 *   and the twelve bytes the Harmony One's firmware reads past group 9's declared entries are the
 *   readers' `LIGHT_BAND_ARCHITECTURES` and offsets, section 103.
 *
 * **The parameter block's values are the model's**, not the architecture's, `reference/config-format/README.md` under
 * base slot 15: one set per model on the thirteen arch 14 compiles, the Harmony 600 and the 650 differing
 * in group 3, and one set on the Harmony One's 19. So a caller supplies them, from its family: the
 * Harmony 600, 650 and 700's are `families/four-slot/wiring.ts`' `PARAMETER_VALUES`, the Harmony One's
 * `families/touch/parameters.ts`. This module checks them against the lengths the firmware demands, the
 * rail `writing-a-config` names: a group whose length differs is replaced by compiled in defaults
 * without a word.
 *
 * Read only towards hardware: the result is pieces `layOutContainer` places.
 */
import { Writer } from './emit.ts';
import type { ContainerLayout, ContainerPiece } from './frame.ts';
import { LOG_AREA_SLOT, LOG_AREA_WIDE_ARCHITECTURES } from './sections.ts';
import {
  LIGHT_BAND_ARCHITECTURES, LIGHT_BAND_FIELDS_AT, LIGHT_BAND_FIELDS_LENGTH, LIGHT_BAND_GROUP, LIGHT_BAND_PAIR_AT,
  LIGHT_BAND_PAIR_LENGTH, PARAMETER_GROUP_COUNTS, PARAMETER_SLOT,
} from './tables.ts';

/** A refusal, named so a caller can tell a bad description from a bug. */
export class FirmwareSectionsError extends Error {}

/** The log area's three numbers: capacity in records, then the region's first byte and one past its last. */
export interface LogAreaRegion {
  readonly capacity: number;
  readonly start: number;
  readonly limit: number;
}

/**
 * The log area every user configuration of an architecture states, measured on that architecture's
 * compiles. Logitech's client declares `0x0E0000` to `0x100000` for arch 14 instead, which is the safe
 * mode image's, section 206; every configuration here states the region below. Only the Harmony One's
 * firmware writes to its log area, section 47; no arch 14 image here has been found to.
 */
export const LOG_AREAS: Readonly<Record<number, LogAreaRegion>> = {
  12: { capacity: 16, start: 0x3ffff0, limit: 0x400000 },
  14: { capacity: 16384, start: 0x1e0000, limit: 0x200000 },
};

/** Base slot 2 for `architecture`: capacity, then the region's two ends, addresses outside the container. */
export function buildLogArea(architecture: number): ContainerPiece {
  const area = LOG_AREAS[architecture];
  if (area === undefined) {
    const known = Object.keys(LOG_AREAS).map((one) => `arch ${one}`).join(' and ');
    throw new FirmwareSectionsError(`the log area is built for ${known}, not arch ${architecture}`);
  }
  const width = LOG_AREA_WIDE_ARCHITECTURES.has(architecture) ? 3 : 2;
  const w = new Writer(width + 6);
  if (width === 3) w.u24(area.capacity); else w.u16(area.capacity);
  w.u24(0).u24(0);
  return { bytes: w.bytes, refs: [{ at: width, address: area.start }, { at: width + 3, address: area.limit }], owner: 'slot-2-log' };
}

/**
 * The parameter block's content: every group's `u16` values in table order, and where the architecture's
 * firmware reads past group 9, `LIGHT_BAND_ARCHITECTURES`, what it reads there: band 3's two device
 * levels and the eight bytes of two bit fields, section 103.
 */
export interface ParameterBlockSpec {
  readonly groups: readonly (readonly number[])[];
  readonly lightBand?: { readonly pair: readonly [number, number]; readonly fields: readonly number[] };
}

export interface BuiltParameterBlock {
  /** The count and a pointer per group. */
  table: ContainerPiece;
  /** One piece per group, in table order; group 9's carries the light band's bytes where it has them. */
  groups: ContainerPiece[];
}

/**
 * Base slot 15 for `architecture`: a group per entry of `spec.groups`, each `u8 entries` then its values,
 * and a table naming them. Refuses a group whose length is not the one the firmware demands, a value wider
 * than its two bytes, and the light band's bytes where the architecture has none or lacks them where it has.
 */
export function buildParameterBlock(architecture: number, spec: ParameterBlockSpec): BuiltParameterBlock {
  const demanded = PARAMETER_GROUP_COUNTS.get(architecture);
  if (demanded === undefined) throw new FirmwareSectionsError(`no firmware's group lengths are read for arch ${architecture}`);
  for (const [index, length] of demanded) {
    const group = spec.groups[index];
    if (group === undefined || group.length !== length) {
      throw new FirmwareSectionsError(`arch ${architecture}'s firmware demands ${length} values in group ${index}, not ${group?.length ?? 'none'}`);
    }
  }
  if (spec.groups.length > 0xff) throw new FirmwareSectionsError(`${spec.groups.length} groups is more than a one byte count holds`);
  const banded = LIGHT_BAND_ARCHITECTURES.has(architecture);
  if (banded !== (spec.lightBand !== undefined)) {
    throw new FirmwareSectionsError(banded ? `arch ${architecture}'s firmware reads past group ${LIGHT_BAND_GROUP} and nothing is given there`
      : `arch ${architecture}'s firmware is not read past group ${LIGHT_BAND_GROUP}, so nothing goes there`);
  }
  const groups = spec.groups.map((values, index) => {
    if (values.length > 0xff) throw new FirmwareSectionsError(`group ${index} of ${values.length} values is more than its one byte count holds`);
    for (const v of values) {
      if (!Number.isInteger(v) || v < 0 || v > 0xffff) throw new FirmwareSectionsError(`a parameter is a u16, not ${v}`);
    }
    const band = index === LIGHT_BAND_GROUP ? spec.lightBand : undefined;
    // The light band's two readers count from past the count byte, and the pair sits straight after the
    // declared values on the Harmony One; a group of another length would put them elsewhere.
    if (band !== undefined && 2 * values.length !== LIGHT_BAND_PAIR_AT) {
      throw new FirmwareSectionsError(`the light band's pair is read ${LIGHT_BAND_PAIR_AT} bytes into group ${index}, past ${values.length} values`);
    }
    const w = new Writer(1 + 2 * values.length + (band === undefined ? 0 : LIGHT_BAND_FIELDS_AT + LIGHT_BAND_FIELDS_LENGTH - LIGHT_BAND_PAIR_AT));
    w.u8(values.length);
    for (const v of values) w.u16(v);
    if (band !== undefined) {
      if (band.pair.length * 2 !== LIGHT_BAND_PAIR_LENGTH || band.fields.length !== LIGHT_BAND_FIELDS_LENGTH
        || LIGHT_BAND_PAIR_AT + LIGHT_BAND_PAIR_LENGTH !== LIGHT_BAND_FIELDS_AT) {
        throw new FirmwareSectionsError(`the light band is two levels and ${LIGHT_BAND_FIELDS_LENGTH} bytes of fields`);
      }
      for (const v of band.pair) {
        if (!Number.isInteger(v) || v < 0 || v > 0xffff) throw new FirmwareSectionsError(`a light band level is a u16, not ${v}`);
      }
      w.u16(band.pair[0]).u16(band.pair[1]);
      for (const b of band.fields) {
        if (!Number.isInteger(b) || b < 0 || b > 0xff) throw new FirmwareSectionsError(`a light band field byte is a byte, not ${b}`);
        w.u8(b);
      }
    }
    return { bytes: w.bytes, refs: [], owner: 'slot-15-group' } satisfies ContainerPiece;
  });
  const t = new Writer(1 + 3 * groups.length).u8(groups.length);
  for (let k = 0; k < groups.length; k += 1) t.u24(0);
  const table: ContainerPiece = { bytes: t.bytes, refs: groups.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 })), owner: 'slot-15-table' };
  return { table, groups };
}

/** The one piece a slot's table is, or a refusal. */
function tablePiece(layout: ContainerLayout, slot: number): ContainerPiece {
  const head = layout.sections[slot]?.head;
  if (head === undefined || head.length !== 1) throw new FirmwareSectionsError(`base slot ${slot}'s table is not one piece`);
  return head[0]!;
}

/**
 * A layout with its log area and parameter block swapped for built ones: the log area's piece, the
 * parameter table, and each group in the place of the group the old table names at the same index, which
 * keeps the caller's emission order. Refuses a group count that differs, and any other piece naming a
 * replaced one.
 */
export function withFirmwareSections(layout: ContainerLayout, log: ContainerPiece, block: BuiltParameterBlock): ContainerLayout {
  const replace = new Map<ContainerPiece, ContainerPiece>();
  replace.set(tablePiece(layout, LOG_AREA_SLOT), log);
  const old = tablePiece(layout, PARAMETER_SLOT);
  replace.set(old, block.table);
  const oldGroups = [...old.refs].sort((a, b) => a.at - b.at).map((ref) => ('to' in ref && ref.offset === 0 ? ref.to : undefined));
  if (oldGroups.length !== block.groups.length) {
    throw new FirmwareSectionsError(`base slot 15 holds ${oldGroups.length} groups and ${block.groups.length} were built`);
  }
  oldGroups.forEach((p, k) => {
    if (p === undefined) throw new FirmwareSectionsError(`base slot 15's group ${k} is not a piece of its own`);
    replace.set(p, block.groups[k]!);
  });
  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.map((p) => replace.get(p) ?? p);
  const sections = layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) }));
  const body = rewrite(layout.body);
  const pictures = rewrite(layout.pictures);
  const ours = new Set<ContainerPiece>(replace.values());
  const kept = [layout.keyTable, ...body, ...sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...pictures];
  for (const p of kept) {
    if (ours.has(p)) continue;
    if (p.refs.some((r) => 'to' in r && replace.has(r.to))) {
      throw new FirmwareSectionsError(`a piece${p.owner === undefined ? '' : ` (${p.owner})`} names a piece being replaced`);
    }
  }
  return { ...layout, body, sections, pictures };
}
