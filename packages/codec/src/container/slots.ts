/**
 * Which raw slot of a container's pointer table each base slot is, per architecture: the slots an architecture
 * inserts, the two architectures with a map of their own, and the lookups every reader asks, `baseSlot` and
 * `archSlot`. Re-exported whole by `gspm.ts`, so every name keeps its path.
 */
import { GspmError } from './gspm.ts';

/**
 * The pointer table is one table across architectures, with per architecture insertions rather
 * than a per architecture meaning. Arch 9 and arch 14 carry the base layout of 20 slots, whose last
 * two, base 18 and base 19, are NULL in every sample. Arch 8 adds a NULL at slot 8, so everything
 * from there on shifts up by one and it carries 21. Arch 12 adds that same NULL plus a real section
 * at slot 18, so it carries 22 and the two trailing NULLs land at 20 and 21.
 *
 * Worth having because the project decodes arch 14, where every config read passes through one
 * SPI primitive, while the popular remote is the arch 12 Harmony One. A section labelled on one
 * transfers to the other through this table rather than through a second investigation.
 */
export const INSERTED_SLOTS: Readonly<Record<number, readonly number[]>> = {
  9: [],
  14: [],
  8: [8],
  12: [8, 18],
};

/** How many slots the base layout has. Base 18 and 19 are NULL in every container. */
export const BASE_SLOT_COUNT = 20;

/**
 * Where each base slot sits on arch 10 (Harmony 890 and 895), or `undefined` where the architecture
 * does not have that slot at all. Index is the base slot. Section 183.
 *
 * **Stated rather than derived, because arch 10 cannot be described as insertions.** Five base slots
 * are **absent**, 0, 2, 8, 13 and 14, which is what `INSERTED_SLOTS` has no way to say, and that is
 * why this table exists at all rather than an arch 10 row being added there.
 *
 * Every present slot is placed by its own contents. What places each one is in the row comments and
 * asserted row by row in `packages/codec/test/container/arch10.test.ts`, the decisive one being base slot 10:
 * consecutive entries of its table sit `1 + 3 * count` apart, and exactly one arch 10 slot reproduces
 * arch 8's signature of four breaks where every other array scores near zero.
 *
 * **Section 183 placed four of these rows by order and two of the four were wrong**, section 184, and
 * that correction is the reason this docstring no longer has a paragraph excusing them. Base slots 4
 * and 6 confirmed: the event map is 125 bytes holding 30 entries on both arch 10 containers, exactly
 * as on arch 8, and every mode record on both carries a screen program that decodes, 137 of 137 and
 * 169 of 169. Base slots 13 and 14 are **refuted** and are absent here as a result. The lesson is
 * section 183's own, one turn later: a slot between two placed neighbours has only one home given a
 * monotone mapping, and "only one home" is not evidence that the section is there at all.
 */
export const ARCH10_SLOT_MAP: readonly (number | undefined)[] = [
  undefined, // 0, absent: no 0xFEED word occurs anywhere in either payload
  0, // 1, the architecture record, which is why arch 10 looked like it stated none
  undefined, // 2, absent: the log area closure holds on no candidate
  4, // 3, the 0xADDF clock frame. Raw slot 3 itself is the metadata archive, section 260, which is
  //    one of the eight raw slots this map places nothing on
  5, // 4, the event map: 125 bytes holding 30 entries, the same on arch 8 and on both arch 10 configs
  6, // 5, four infrared groups holding all 300 records
  9, // 6, the mode table: every record carries a screen program that decodes, 137/137 and 169/169
  10, // 7, all eight font set addresses
  undefined, // 8, absent: nowhere to go once base 9 takes raw 11
  11, // 9, twelve tagged lists and 323 bindings against the Harmony 880's twelve and 322
  12, // 10, the packing closure, four breaks, arch 8's exact signature
  14, // 11, a u16 array all resolving, 39 against the Harmony 880's 38
  15, // 12, a u8 count of 17 in 52 bytes, identical to the Harmony 880's
  // 13, absent: section 130's closure is that the first seven records hold the build timestamp's own
  // fields, and searching both payloads for a run of pointers whose targets carry those seven values
  // finds nothing, at every field offset 0 to 8 and at both one and two bytes wide, where the arch 8
  // control hits exactly once. Raw slot 16, which section 183 put this on, is a fixed table of about
  // 1024 bytes in which no three byte value resolves to an address at all.
  undefined,
  // 14, absent: base slot 14's section count is one byte on every architecture and raw slot 17's is
  // two, and no slot in either container satisfies the record shape, whose signature is a leading
  // byte of 2 and targets that decode as screen programs. Raw 17's own targets are neither: 11 of 41
  // decode as a program on the Harmony 890 and 2 of 32 on the Harmony 895.
  undefined,
  18, // 15, a u8 count, 14 against the Harmony 880's 9, per architecture by section 44
  19, // 16, an empty array, as on arch 8
  20, // 17, two bytes before the picture bank
  21, // 18, NULL
  22, // 19, NULL
];

/**
 * Base slot to raw slot on arch 16 (Harmony 300 and 350), section 259, partial by design.
 *
 * **Fifteen slots, and they are not the base twenty with insertions**, so nothing transfers by index
 * and every entry here is measured. The instrument is the firmware's own section seeker at `0x10BCE`
 * in the skin 104 image, which computes `0x0B + 4 * slot` from a slot number its callers load as a
 * literal: fourteen callers naming raw slots 3 to 12, which is the same shape section 35 used on arch
 * 14. An entry is `undefined` where the slot has not been identified rather than where the container
 * lacks it, which is the opposite of arch 10's map and is why this comment says so: `archSlot` throws
 * for an absent base slot, so an unread slot refuses rather than answering wrongly, and that is the
 * rail this architecture needs most.
 *
 * **Two raw slots have a measured meaning and no base slot, section 263**, and they stay `undefined`
 * for exactly that reason. Removing one device from the bench remote takes raw slot 6 from five
 * pointers to four and raw slot 8 from eight to six. Their lengths are **devices plus one** and
 * **devices times two**, four, five, four and six, eight, six over the three containers, and the
 * Chromecast counts in both despite having no infrared commands at all, so both count devices rather
 * than devices that can send something. Knowing what a slot counts is not knowing which base slot it
 * is, and a map entry is a claim about the second, so neither is placed here. The cross architecture
 * route was tried and fails: no count prefixed base slot in the corpus has either length on more than
 * three of the thirteen containers that state both counts. The firmware has since named both, raw 6
 * base slot 9 and raw 8 base slot 12 (`tests/harmony_300_350/test_harmony_350_slots.py`), and they stay out of the map
 * until a reader here needs them, as the entry for base slot 13 below says.
 */
export const ARCH16_SLOT_MAP: readonly (number | undefined)[] = [
  0, // 0, the 0xFEED name tree, 131 bytes under Root, State and Radio
  1, // 1, seven bytes: architecture 16 twice, the skin (104 on a 350, 79 on a European 300), then the constant 0x0d
  // 2, the log area, section 260. Eight bytes, and they are byte for byte what the Harmony 525's base
  //    slot 2 holds, `00 20 00 00 07 00 00 08`, on a different architecture. The archive in raw slot
  //    13 of the same container states the log's own record layout, an infrared event carrying a
  //    device and a command and a device selected event, which is a second source with nothing in
  //    common with the byte match. The firmware never seeks it, exactly as arch 14 never seeks base
  //    slot 2.
  2,
  3, // 3, the 0xADDF framed clock record, which the container check already verified
  undefined, // 4, unread
  4, // 5, the infrared database. Eight groups, each `u8 spare; u16 count; u24 record[]`, and a record
  //    is the base layout exactly: the pointer bias of 7, a group count byte, then three block
  //    pointers per group. Its once blocks open with the 50 ms lead in silence section 174 measured
  //    and its held blocks do not, so once and held are in their base positions.
  undefined, // 6, unread
  undefined, // 7, unread
  undefined, // 8, unread
  undefined, // 9, unread
  7, // 10, the action list table. 171 lists, each `u8 length` then three byte instructions, and the
  //    idiom `xx 00 7f` is section 26's call to another list, which is what the key table holds too.
  undefined, // 11, unread
  undefined, // 12, unread
  // 13, the state variable table, raw slot 9, read in the 1.4 firmware: its seeder at `0x16E6C` reads
  //     base slot 13's four header words and seeds records of base slot 13's layout, and the record
  //     locator at `0x17360` indexes past the same eight byte header (`tests/harmony_300_350/test_harmony_350_slots.py`).
  //     Placed here for the delay reader, `tests/harmony_300_350/test_harmony_350_delay.py` and
  //     `packages/codec/test/families/harmony-300-350/filefamilydelays.test.ts`: once it is, `devices`, `deviceDelays` and
  //     `setPowerOnDelay` read and edit this family's power on delays with no change of their own,
  //     because a device's power on delay here is the arch 8, 9 and 12 shape, one `0x7C` at the top
  //     level of the list its `Power` variable runs going from off to on. Raw 6 and 8, base slots 9 and
  //     12 by the same reading, are still left out: nothing here needs them yet, and placing a slot
  //     hands every reader of it a container it has not been run on.
  9,
  undefined, // 14, unread
  10, // 15, the parameter block. Five groups, each `u8 length` then that many bytes, which is base
  //     slot 15's shape and per architecture by section 44.
  // 16, the number sender, section 262, and the **differential** is what names it rather than a
  //     shape: raw slot 11 is a count of zero in the factory configuration and a count of one in the
  //     programmed one, whose owner put five favourite channels on exactly one device. Its record is
  //     base slot 16's layout byte for byte, fourteen bytes of header then three digit table
  //     pointers, and each table's ten entries call a list that sends a code from the group the same
  //     device's own digits belong to. So the mechanism section 154 measured on arch 12 is unchanged
  //     here, which is not true of every slot on this architecture.
  11,
  undefined, // 17, unread
  undefined, // 18, unread
  undefined, // 19, unread
];

/**
 * A reader's table of one fact per architecture, keyed by the architecture's number: plan 007's sanctioned form
 * for a fact that differs between remotes outside `families/`, read with the configuration's own architecture and
 * never with a literal one. Named so that `test/package/generic.test.ts` can tell such a table from code testing which
 * remote it is: what sits inside one is the table's to hold, a key scan included.
 */
export type PerArchitecture<T> = Readonly<Record<number, T>>;

/**
 * Base slot to raw slot for every architecture whose alignment is established.
 *
 * **The four insertion architectures are derived from `INSERTED_SLOTS` rather than written out**, so
 * there is still one statement of their alignment and not two. Only arch 10 is stated, because
 * insertions cannot express an absent slot. Same rule as the opcode table: a derivation lives once.
 */
export const SLOT_MAPS: Readonly<Record<number, readonly (number | undefined)[]>> = {
  ...Object.fromEntries(Object.entries(INSERTED_SLOTS).map(([architecture, inserted]) => {
    const sorted = [...inserted].sort((a, b) => a - b);
    return [architecture, Array.from({ length: BASE_SLOT_COUNT }, (_unused, base) => {
      let slot = base;
      for (const at of sorted) if (at <= slot) slot += 1;
      return slot;
    })];
  })),
  10: ARCH10_SLOT_MAP,
  16: ARCH16_SLOT_MAP,
};

function slotMap(architecture: number): readonly (number | undefined)[] {
  const map = SLOT_MAPS[architecture];
  if (map === undefined) {
    throw new GspmError(`slot alignment not established for architecture ${architecture}`);
  }
  return map;
}

/**
 * Map a slot on `architecture` to the same section's slot in the 20 slot base layout.
 *
 * Returns undefined for a raw slot the base layout does not have, whether because the architecture
 * inserted it or because it is one of arch 10's eight that correspond to no base slot. Throws for an
 * architecture whose alignment has not been established.
 */
export function baseSlot(architecture: number, slot: number): number | undefined {
  const map = slotMap(architecture);
  const base = map.indexOf(slot);
  return base === -1 ? undefined : base;
}

/**
 * Inverse of `baseSlot`: where the base layout's slot sits on `architecture`.
 *
 * **Throws when the architecture does not have that base slot**, which arch 10 is the first case of.
 * Returning a number would hand a reader the neighbouring section, which is exactly the failure the
 * arch 10 rail was put up to prevent, so the absence has to be loud. Callers that can carry on
 * without a section already catch `GspmError` and return undefined.
 */
export function archSlot(architecture: number, base: number): number {
  const slot = slotMap(architecture)[base];
  if (slot === undefined) {
    throw new GspmError(`architecture ${architecture} has no base slot ${base}`);
  }
  return slot;
}
