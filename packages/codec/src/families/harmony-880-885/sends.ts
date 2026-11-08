/**
 * The side keys family's send, the Harmony 880 and 885: the plain pair, `{0x7D, 0x7C}` naming one device, with the
 * device's power on delay as one bare `0x7C` wait at the end of its on list, `pairDeviceSends` in
 * `shared/sendpair.ts`, which the One family shares. `SIDE_KEYS_SENDS` is what the shared composers ask,
 * `Family.sends`.
 *
 * **What it rests on.** Every send list of the eight arch 8 configurations the lab holds, six contributed and the
 * two bench units', is the pair with both halves naming one group, 3280 of 3280; every one of their 44 power
 * variables switches on through a list of one call, the power command's send list, and one wait of the device's
 * own; and no wait anywhere in them is above 100 tenths, a longer delay being written as several waits of 100,
 * `todo/todo-prepare-885.md` 3.1's reading of the 880 Pro's 32 seconds. All three are asserted in
 * `sidekeysdevice.test.ts`. So one wait of at most 100 is composed and a longer delay is refused, until a device
 * that needs one is composed.
 *
 * **A power step is spelled as these remotes' compiles spell it**, `sideKeysPowerStep` below, `todo-compile-885.md`
 * 2.2 and 2.3: its record opens with the device's delay between devices, the long press version included, and its
 * send carries a quantity of 1. Before that a composed device's power went out with no silence in front, so a
 * device switch could send back to back, and at the catalogue's inter key delay, the Harmony 650 and 700's form.
 *
 * **Two rails of this family's own are held here, before anything is built**, since the device half is the first
 * thing the shared device composer asks of a family:
 *
 * * the state variables have 64 bytes on the Harmony 880 and 885, `narrow + 2 * wide`, and the firmware checks
 *   nothing, so a device that would take them past 64 is refused, `reference/config-format/state.md`,
 *   `tests/test_harmony_885_state.py`. The device composer adds one one byte variable, the power, so the check is
 *   that one more fits. This is the codec's half of `todo-compile-885.md` 4.3, for a composed device only;
 * * groups 8 and up toggle with groups 0 and up, eight bits for sixteen groups, and the firmware flips a group's
 *   bit at every send to it, toggling or not, `reference/config-format/infrared-records.md`,
 *   `tests/test_harmony_885_infrared.py`. So in group 8 or higher a code that alternates two forms is refused,
 *   since the partner group's sends would flip its bit, and so is any device at all whose partner group, eight
 *   below, holds a code of two forms, since this device's sends would flip that one's: either way a press would
 *   send the form the device takes for a held key. A code of two forms is a record of two pointer groups, the form
 *   `writing-a-config` names. A group past 15 is refused too: the firmware takes the group from the send's high
 *   byte and the configuration holds at most 15 devices.
 *
 * **What is refused for now**: everything the input composer and the sequence composer ask, since neither has been
 * run on an 885, `todo-compile-885.md` 2.6 and 4.1, and matching a donor's sends, which nothing here needs. A
 * refusal says so rather than answering with the Harmony One's, which would be the same bytes and unmeasured here.
 * `sequenceRecords` is a value and cannot refuse: it states the Harmony One's answer and is **not measured on
 * these remotes**, and only the sequence composer reads it, after `sendLists`, which refuses first.
 */
import type { DeviceSends, PowerStepSpelling, SendShape } from '../family.ts';
import type { Container } from '../../gspm.ts';
import { irGroupCount, irGroups } from '../../ir.ts';
import { stateTable } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ComposeDevice } from '../../shared/devices.ts';
import { pairDeviceSends } from '../../shared/sendpair.ts';

/** The models this family serves, as a person names them, for a refusal. */
export const SIDE_KEYS_NAME = 'the Harmony 880 and 885';

/**
 * The bytes the firmware gives the state variables, `narrow + 2 * wide`: 64 on the Harmony 880 and 885, read in
 * the firmware, `tests/test_harmony_885_state.py`.
 */
export const SIDE_KEYS_STATE_BYTES = 64;

/** The largest power on delay one `0x7C` carries in this family's compiles, in tenths: 100, 0 of 3280 lists above. */
export const SIDE_KEYS_LONGEST_WAIT = 100;

/** The first group whose toggle bit another group shares: eight bits for sixteen groups. */
export const SIDE_KEYS_SHARED_TOGGLE_FROM = 8;

/** The groups a send can name, by the configuration's fifteen devices at most. */
export const SIDE_KEYS_GROUPS = 16;

/**
 * A device's lists, after the family's rails: the state variables' 64 bytes with the power variable added, and a
 * toggling code kept out of the groups that share a toggle bit.
 */
function sideKeysDevice(c: Container, group: number, device: ComposeDevice): DeviceSends {
  const table = stateTable(c);
  if (table === undefined) throw new ComposeError('base slot 13 does not read as a table');
  // One more one byte variable, the device's power, which `appendNarrowStateVariable` puts in at `narrow`.
  const bytes = table.narrow + 1 + 2 * table.wide;
  if (bytes > SIDE_KEYS_STATE_BYTES) {
    throw new ComposeError(`the state variables would take ${bytes} bytes and ${SIDE_KEYS_NAME} have ${SIDE_KEYS_STATE_BYTES}`);
  }
  if (group >= SIDE_KEYS_GROUPS) {
    throw new ComposeError(`infrared group ${group} is past the ${SIDE_KEYS_GROUPS} ${SIDE_KEYS_NAME} can send from`);
  }
  if (group >= SIDE_KEYS_SHARED_TOGGLE_FROM && device.commands.some((one) => one.toggled !== undefined)) {
    throw new ComposeError(`a toggling code in infrared group ${group} would share its toggle bit with group `
      + `${group - SIDE_KEYS_SHARED_TOGGLE_FROM} on ${SIDE_KEYS_NAME}`);
  }
  // The other half: the partner group's own codes of two forms, which this device's sends would flip.
  if (group >= SIDE_KEYS_SHARED_TOGGLE_FROM) {
    const partner = group - SIDE_KEYS_SHARED_TOGGLE_FROM;
    const toggling = irGroups(c)?.[partner]?.addresses.filter((address) => irGroupCount(c, address) === 2).length ?? 0;
    if (toggling > 0) {
      throw new ComposeError(`infrared group ${partner} holds ${toggling} toggling codes, and a device in group `
        + `${group} would flip their toggle bit at every send on ${SIDE_KEYS_NAME}`);
    }
  }
  return pairDeviceSends(c, group, device, SIDE_KEYS_LONGEST_WAIT, SIDE_KEYS_NAME);
}

/**
 * The delay between devices a composed device gets where it states none, in tenths: 500 ms, the catalogue's own
 * on every one of the eight devices of the owners' sheets the archive names and on the Sony DAV-C540, and the
 * silence 51 of the 84 device groups of the sixteen arch 8 containers open their switching codes with, copies of
 * six configurations counted each time, `todo-prepare-885.md` 3.11; 20 of the 28 distinct devices with a power
 * variable in the eight configurations, `sidekeysdevice.test.ts`. Ours: a device composed from the catalogue always states its own.
 */
export const SIDE_KEYS_INTER_DEVICE_DEFAULT = 5;

/**
 * The longest delay between devices composed, in tenths. The configurations' longest is 10, a second, on 12 of
 * the 84 device groups, and no ceiling is read in the firmware, which plays a silence of any length word by word;
 * 100, ten seconds, is the bound of the family's other wait, `SIDE_KEYS_LONGEST_WAIT`, taken so that a value
 * nobody meant, a delay in milliseconds given as tenths, is refused rather than played for minutes. Ours.
 */
export const SIDE_KEYS_LONGEST_INTER_DEVICE = 100;

/**
 * The opening silence of a device whose delay between devices is 0, in microseconds: 50 ms, the silence every
 * code with a held block opens with and the whole lead of four of the 84 device groups, 2850 of 2850 and 4 of
 * 84, `todo-prepare-885.md` 3.11. No arch 8 record opens with a mark, 0 of 5792, so a lead of nothing is a shape
 * Logitech's compiler never wrote. Ours: whether those four devices state 0 is not known.
 */
export const SIDE_KEYS_SHORTEST_LEAD_US = 50000;

/**
 * The quantity of a power step's send: 1, what 60 of the 88 power transitions of eight arch 8 configurations carry,
 * and what every other send of a composed device carries, so its most common once only quantity, which Logitech's
 * power send equals on 88 of 88. Ours.
 */
export const SIDE_KEYS_POWER_QUANTITY = 1;

/**
 * How the Harmony 880 and 885 spell a power step, `SendShape.powerStep`, `todo-compile-885.md` 2.2 and 2.3.
 *
 * **The silence in front is the device's delay between devices.** Every record a power transition sends in the
 * eight configurations the lab holds of these remotes opens with its device's own silence and has no held block,
 * 88 transitions of 44 power variables, which are 28 distinct devices since four of the configurations are copies
 * of one account, `sidekeysdevice.test.ts`. The silence is the device's and not the power key's: every record of
 * those devices with no held block opens with it. The reference's "The delay between devices on the Harmony 880
 * and 885" reads it as that delay, inferred from the Harmony One's closure. The long press version gets it too:
 * the one device of the eight the archive names whose catalogue entry holds the key, a Panasonic television's power
 * on and off for a second, opens both seven frame records with the same 800 ms its other switching codes carry.
 * Logitech's form, as the corpus spells it; that the value is the catalogue's `interDeviceDelay` is the inference,
 * since the owners' devices carry edited values.
 *
 * **The quantity is 1, not the inter key delay.** Logitech's compiles for the Harmony 650 and 700 send a power step
 * at the catalogue's inter key delay, section 320. These remotes' compiles do not: their power sends carry 0, 1 or
 * 2, on 13, 30 and 1 of the 44 power variables (by model, the 880s' 1 on 13 of 24, 0 on 10 and 2 on 1, the 885s' 1
 * on 17 of 20 and 0 on 3), each the most common quantity of the device's other once only sends. Of the eight
 * devices the archive names, the two whose catalogue entry states an inter key delay of 500 ms, a VCR and a
 * LaserDisc player in one configuration, are sent at 1; that is all the evidence against the inter key delay. The
 * quantity is not a function of the records: one DVD player with identical power records is sent at 1 in one
 * configuration and 0 in another. What chooses 0 or 2 is not read, so 1, the commonest and the most common of a
 * composed device's own sends, is ours.
 */
function sideKeysPowerStep(device: ComposeDevice): PowerStepSpelling {
  const tenths = device.interDeviceDelay ?? SIDE_KEYS_INTER_DEVICE_DEFAULT;
  if (!Number.isInteger(tenths) || tenths < 0 || tenths > SIDE_KEYS_LONGEST_INTER_DEVICE) {
    throw new ComposeError(`a delay between devices of ${tenths} tenths is not composed for ${SIDE_KEYS_NAME}: `
      + `0 to ${SIDE_KEYS_LONGEST_INTER_DEVICE}`);
  }
  return {
    leadInUs: tenths === 0 ? SIDE_KEYS_SHORTEST_LEAD_US : tenths * 100000,
    quantity: SIDE_KEYS_POWER_QUANTITY,
  };
}

/** A refusal for a shared composer's question nobody has run on this family yet, with the step that will. */
const notYet = (what: string, step: string) => (): never => {
  throw new ComposeError(`${what} is not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md ${step}`);
};

/** The side keys family's send, `Family.sends`. */
export const SIDE_KEYS_SENDS: SendShape = {
  listsPerSend: 1,
  device: sideKeysDevice,
  powerStep: sideKeysPowerStep,
  switchOnList: notYet('a device\'s inputs', '2.6'),
  sendWriter: notYet('a device\'s inputs', '2.6'),
  sendLists: notYet('a sequence', '4.1'),
  newSendLists: notYet('a sequence', '4.1'),
  // Not measured on these remotes; see the header.
  sequenceRecords: 'named',
  oneBlockCopyRefusal: `a one block copy is not composed for ${SIDE_KEYS_NAME}: no sequence has been, todo-compile-885.md 4.1`,
};
