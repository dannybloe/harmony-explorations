/**
 * What the inventory's parts share and no entry carries: how deep a walk of mapped values goes, the shortest label
 * worth reading, and where a send's operand keeps its infrared group. Exported for the parts alone: `inventory.ts`
 * re-exports every other part and not this one, so nothing here reaches `./internal`.
 */

/** How deep `activityScreens` follows a chain. A guard against a loop, not a reading: three suffice. */
export const MAP_WALK_DEPTH = 12;

/** A string this short says nothing about which activity it belongs to. */
export const SHORTEST_USEFUL_LABEL = 2;

/** The high byte of `0x7D`'s operand: the base slot 5 group. */
export const INFRARED_GROUP_SHIFT = 8;
