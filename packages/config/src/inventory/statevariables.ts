/**
 * The state variables a configuration names, the firmware's own and the configuration's: base slot 0's name tree
 * joined to base slot 13's records, the device identifiers the names carry, each device's own variables, and which
 * variables the firmware owns per architecture. Part of the inventory, `inventory.ts`, which says what the reading
 * is for.
 */
import { Container } from '../container/gspm.ts';
import { nameNodes, type StateRecord, stateRecords } from '../container/sections.ts';
import { irGroups } from '../infrared/ir.ts';
import type { ScreenChoice } from '../screens/render.ts';

/**
 * The level base slot 0 names state variables at. Level 0 names the containers, `Root` and `State`
 * and, on the generators that emit it, `HarmonyAssistant`; level 2 is a menu below one of those.
 */
export const STATE_NAME_LEVEL = 1;

/**
 * The variable that counts the activities, by name, in every one of the seventeen containers of
 * the corpus that carry a name tree. Its highest value **is** the number of activities: zero in a
 * safe mode container, one in the config Logitech compiled for a single activity while we watched.
 */
export const ACTIVITY_STATE_NAME = 'CurrentActivityState';

/** How a level 1 name is put together, once the trailing value count is taken off. */
export interface StateVariable {
  /** Index into base slot 13, which is what the name node states. */
  index: number;
  /** The whole name as the config spells it, the user's device name included. */
  name: string;
  /**
   * The name with the trailing `_<values>` removed, or the whole name when there is none. It ends
   * in a qualifier of its own: a device identifier on the arch 14 configs, and a small number
   * elsewhere, `CurrentActivityState_0` being the one every container carries.
   */
  label: string;
  /**
   * The number the name ends in, which is the record's highest value plus one, or undefined when
   * the name does not end in a number. 250 of 250 agree across four architectures.
   */
  stated?: number;
  /**
   * The Logitech device identifier, when the name carries one: a token of six digits or more,
   * which the two arch 14 configs use and the older generators do not. Not stored anywhere in the
   * container as a number, so it is host side metadata like the rest of base slot 0.
   */
  deviceId?: number;
  record?: StateRecord;
}

const DEVICE_ID = /^\d{6,}$/;
const TRAILING_COUNT = /_(\d+)$/;

/** Every named state variable, joined to the base slot 13 record its index names. */
export function stateVariables(c: Container): StateVariable[] {
  const records = stateRecords(c) ?? [];
  const out: StateVariable[] = [];
  for (const node of nameNodes(c) ?? []) {
    if (node.level !== STATE_NAME_LEVEL) continue;
    const tail = TRAILING_COUNT.exec(node.name);
    const parts = node.name.split('_');
    const id = parts.slice(0, -1).find((part) => DEVICE_ID.test(part));
    out.push({
      index: node.index,
      name: node.name,
      label: tail === null ? node.name : node.name.slice(0, node.name.length - tail[0].length),
      ...(tail === null ? {} : { stated: Number(tail[1]) }),
      ...(id === undefined ? {} : { deviceId: Number(id) }),
      ...(records[node.index] === undefined ? {} : { record: records[node.index] }),
    });
  }
  return out;
}

/**
 * How many devices the config drives: one infrared group per device.
 *
 * Base slot 5's groups are the device partition of the infrared database, 8 to 164 codes each, and
 * a group may be empty. Two things say a group is a device rather than some other grouping: the
 * config compiled for one device carries exactly one group, and on the two arch 14 configs the
 * number of distinct device identifiers in the state variable names is the number of groups, 4 and
 * 6. Section 86.
 */
export function deviceCount(c: Container): number | undefined {
  return irGroups(c)?.length;
}

/** The distinct device identifiers the names carry, in first appearance order. Arch 14 only. */
export function deviceIds(c: Container): number[] {
  const out: number[] = [];
  for (const variable of stateVariables(c)) {
    if (variable.deviceId !== undefined && !out.includes(variable.deviceId)) {
      out.push(variable.deviceId);
    }
  }
  return out;
}

/**
 * A level 1 name that belongs to a device, split into the device's label and the property.
 *
 * A device variable is named `<label>_<property>_<values>` and a global is named
 * `<name>_<values>` or `<name>_<qualifier>_<values>` with a **numeric** qualifier, which is what
 * separates the two: `TV_Power_2` is a device's, `CurrentActivityState_0_4` and
 * `DefaultPowerOnDelay_92595307_255` are not. Section 86 read the shape and called the qualifier "a
 * device identifier on the arch 14 configs, and a small number elsewhere"; that number is exactly the
 * discriminator, since no property word is a number.
 *
 * The label keeps its underscores, because a device label is the user's own words and often several
 * of them: two containers here have a label of four tokens.
 */
export interface DeviceVariable {
  index: number;
  /** The device's label as base slot 0 spells it, underscores included. */
  device: string;
  /** The last token, which is what the variable tracks about that device. */
  property: string;
}

/** The level 1 names that belong to a device rather than to the config as a whole. */
export function deviceVariables(c: Container): DeviceVariable[] {
  const out: DeviceVariable[] = [];
  for (const variable of stateVariables(c)) {
    const cut = variable.label.lastIndexOf('_');
    if (cut <= 0) continue;
    const property = variable.label.slice(cut + 1);
    // A numeric qualifier means the name belongs to the config, not to a device.
    if (property.length === 0 || /^[0-9]+$/.test(property)) continue;
    out.push({ index: variable.index, device: variable.label.slice(0, cut), property });
  }
  return out;
}

/**
 * The state variables the firmware owns, by index, section 130.
 *
 * **Not a guess from their ranges**: every one of them is `first` equal to the corresponding field of
 * the config's own build timestamp, in all 21 containers of the corpus, with `second` equal to the
 * field's maximum. Section 74 had already read three of them out of the action list language, where
 * opcode `0x07` band `0xF8` steps a date held in variables 3, 5 and 6, and this says which is which
 * and adds the other four.
 *
 * The weekday's zero is a **Sunday** and the day of the month counts from 0, section 322, which is how
 * the firmware's own calendar counts both. This said the weekday's zero was a Saturday, from base slot
 * 3's epoch<!--superseded-->, and that reading is the same bytes as this one on every date the corpus
 * holds, which is why a corpus fit could not tell the two apart and the firmware had to.
 *
 * **A writer must stamp these, not copy them**, the same rail as base slot 3's timestamp, section 111.
 * A config carried over with its old values sets the remote's clock to the moment the old config was
 * generated.
 *
 * **The clock is not read out of base slot 3 at all**, section 138: the firmware seeds state variable `n`
 * from record `n`'s `first`, and on arch 12 variable `n` lives at RAM `0x108 + n`, so the clock at
 * `0x108` to `0x10E` **is** records 0 to 6. Base slot 3 is the epoch it subtracts against to work out how
 * long ago the config was built. The rail does not move, because both records get stamped by a save.
 *
 * **The block runs to 12 and not to 6.** Indices 7 to 12 carry exactly one `first`/`second` pair per
 * architecture across all 21 containers and base slot 0 names none of them, and four of their maxima
 * agree with bytes measured on a connected Harmony One by a route with no shared code. They are listed
 * here so that a writer refuses to reuse them; the ones with a meaning say which architecture it was read
 * on, because arch 9 states different maxima for the same indices and nothing establishes that it puts
 * the same things there.
 */
export const FIRMWARE_STATE_VARIABLES: Readonly<Record<number, string>> = {
  0: 'second',
  1: 'minute',
  2: 'hour',
  3: 'day of the month, where 0 is the 1st',
  4: 'day of the week, where 0 is a Sunday',
  5: 'month, zero based',
  6: 'year since 2000',
  // Firmware owned by the same evidence as the clock, fixed per architecture and named by no config.
  // Sections 111 and 103 measured 8, 9, 10 and 11 on a Harmony One and read their level counts out of
  // the firmware, which is where the meanings come from and why they carry that scope.
  7: 'firmware reserved, meaning unread',
  8: 'display light band on arch 12, four levels',
  9: 'battery gauge on arch 12, eight levels',
  10: 'saved display light state on arch 12',
  11: 'cached display light level on arch 12',
  12: 'firmware reserved, meaning unread',
};

/**
 * The highest index the firmware owns, so a writer can refuse the whole block in one test.
 *
 * Section 138. Thirteen, not seven, is the block **common to every architecture**: on arch 9 index 13 is
 * where its configs start naming a variable through base slot 0 and its firmware's literal 13 sits. Section 284 found the
 * block reaching 17 on the other three, so a writer asks `firmwareStateVariableMax` below.
 */
export const FIRMWARE_STATE_VARIABLE_MAX = 12;

/**
 * The highest index the firmware owns, per architecture: what a writer refuses, section 284.
 *
 * `FIRMWARE_STATE_VARIABLE_MAX` above is the block common to every architecture, and it was read as
 * the block on all of them until section 284 measured 13 to 17 separately. On arch 8 (Harmony 880 and
 * 885), arch 12 (Harmony One) and arch 14 (Harmony 600, 650 and 700) those five carry one `first` and
 * `second` per architecture in every container, safe mode ones included, with a single exception at 14
 * on arch 12 where safe mode states its own; base slot 0 names none of them; and the firmware's
 * alternative fill starts at 18 on the Harmony One, 600, 650, 700, 880 and 885 images, as the checksum
 * that gates the seeder does on the Harmony One and arch 14. The firmware also stores into some of them
 * directly, 13, 15, 16 and 17 on the Harmony One, the 880 and the 885, all five on the 700, and 13, 16
 * and 17 on the 650 and 600, and into none above 17 but bytes of data that decode as code. Section
 * 138's cut at 12 came from arch 9 (Harmony 525), where its configurations name 13 upward and its own
 * seeder compares the index against the literal 13.
 *
 * Arch 16 (Harmony 300 and 350) owns 0 to 17 as well, read in its 1.4 firmware image,
 * `reference/architectures/harmony-300-350/memory.md` "The state variables":
 * its alternative fill and the memory check that gates its seeder both start at 18, it stores directly
 * into 0, 3, 4, 5, 11, 13, 16 and 17, and it steps the minute itself, `tests/firmware/test_firmware_state_block.py`
 * and `tests/harmony_300_350/test_harmony_350_clock.py`.
 *
 * An architecture not listed gets the widest block, since refusing a variable that turns out to be free
 * costs a composer nothing and writing one the firmware owns costs a device that silently misbehaves.
 * Arch 10 (Harmony 890 and 895) is not listed because nothing here reads its state table.
 */
export const FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE: Readonly<Record<number, number>> = {
  8: 17,
  9: 12,
  12: 17,
  14: 17,
  16: 17,
};

/** The highest firmware owned index on `architecture`, the widest known block when it is unlisted. */
export function firmwareStateVariableMax(architecture: number | undefined): number {
  const stated = architecture === undefined ? undefined : FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE[architecture];
  return stated ?? Math.max(...Object.values(FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE));
}

/**
 * A screen variant's conditions in words, one per branch the program took.
 *
 * **The name is the point.** A variant is a list of switch arms, and "arm 1 of 2 at state 35" tells a
 * person nothing, while `PS3_Power = 1` tells them exactly when the screen looks like that. Base slot 0
 * names the state variables, section 77, so the two readings meet here.
 *
 * Only some variables are named: `one_config` has 46 base slot 13 records and 12 names, so an unnamed
 * one is shown by its index rather than invented. That is the same rule `VERSION_FIELDS` follows in the
 * bench instrument, and for the same reason.
 */
export function describeChoices(c: Container, choices: readonly ScreenChoice[]): string[] {
  const names = new Map(stateVariables(c).map((one) => [one.index, one.label]));
  return choices.map((choice) => {
    const name = names.get(choice.variable)
      ?? FIRMWARE_STATE_VARIABLES[choice.variable]
      ?? `state variable ${choice.variable}`;
    const when = choice.value !== undefined
      ? `= ${choice.value}`
      : `in ${choice.from} to ${choice.to}`;
    return `${name} ${when}`;
  });
}
