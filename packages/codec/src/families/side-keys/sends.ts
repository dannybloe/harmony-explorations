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
 * that needs one is composed, `todo-compile-885.md` 2.2.
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
import type { DeviceSends, SendShape } from '../family.ts';
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

/** A refusal for a shared composer's question nobody has run on this family yet, with the step that will. */
const notYet = (what: string, step: string) => (): never => {
  throw new ComposeError(`${what} is not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md ${step}`);
};

/** The side keys family's send, `Family.sends`. */
export const SIDE_KEYS_SENDS: SendShape = {
  listsPerSend: 1,
  device: sideKeysDevice,
  switchOnList: notYet('a device\'s inputs', '2.6'),
  sendWriter: notYet('a device\'s inputs', '2.6'),
  sendLists: notYet('a sequence', '4.1'),
  newSendLists: notYet('a sequence', '4.1'),
  // Not measured on these remotes; see the header.
  sequenceRecords: 'named',
  oneBlockCopyRefusal: `a one block copy is not composed for ${SIDE_KEYS_NAME}: no sequence has been, todo-compile-885.md 4.1`,
};
