/**
 * The Harmony 300 and 350's keypad as a composed device meets it: which command each key takes in a device's
 * own key map, which scan code and output pin each of the four device keys has, and where the configuration
 * keeps the key maps, the start up instructions and the timers. The no screen family's own facts, plan 007; a
 * module outside `families/` reaches them through the family.
 *
 * **Measured on one compile of one model**, Logitech's compile of the Harmony 350 test setup, the lab's
 * `work/setups/h350-test/compile-Result.EzHex`, `todo-compile-350.md` 3.2, and nowhere else, which is why the
 * table below says the Harmony 350 where the family is the Harmony 300's as well: the 300's keypad is smaller
 * and no 300 compile has been fitted. `packages/codec/test/noscreen.test.ts` holds the fit.
 */
import type { HardKey } from '../../devicemode.ts';

/**
 * Which command each hard key takes in a device's own key map, the family's `deviceModeKeys`, `deviceModeLayout`
 * reading it: per key, the commands in order of preference, the first the device has.
 *
 * **Fitted to the eight devices of Logitech's compile of the Harmony 350 test setup**, each device's map read
 * key by key and each binding named by the catalogue command whose composed record is the record it sends, word
 * for word. On the five devices whose maps hold their own commands only (the LG TV, the Plasma, the Denon, the
 * Switch and the Knoll) this table gives every key Logitech bound to the device's own command and no other, 108
 * keys, with three kinds of binding left out on purpose, each a question this table cannot answer:
 *
 * * **The Input key, scan 35, sends the LG TV's InputNext on all eight maps**, the Plasma's included, which has
 *   inputs of its own: a binding to another device, which by the one compile is the TV the activity shows on,
 *   or the first television, and nothing here tells the two apart.
 * * **Favourite 5, scan 2, takes a command no other key takes on two devices**, Home on the LG and Internet on
 *   the Plasma, and nothing on the other six: a favourite key is one of the five soft buttons a device's button
 *   map in Logitech's service states, the KPN's saved one shows it, and which command a device's default soft
 *   buttons hold is not read. Its other four soft buttons, scans 8, 9, 11 and 34, hold nothing on any of the
 *   seven devices without favourites.
 * * **Volume and mute go to the Denon on five maps**, the Knoll's, the Switch's, the Kodi's, the Sony HT's and
 *   the KPN's, though the Sony HT and the Kodi have volume commands of their own; the LG TV, the Plasma and the
 *   Denon keep theirs. So which device a device mode's volume goes to is Logitech's choice per device, and this
 *   table gives every device its own.
 *
 * And the KPN's map binds three of the table's keys and nothing else of its own, so it is not a sample of a device's
 * own map, and why it binds so few is not read. It is the map the activity ends in and the one holding the
 * favourites, but that is not why: on the bench Harmony 350's two compiles of an earlier setup, with another model of
 * KPN box, the activity ends in the box's map as well, the same map in both, and there 33 bindings send one of the
 * box's own codes, `noscreenactivity.test.ts`. This gave the
 * activity as the reason, until `todo-compile-350.md` 4.2 read those two. **Scan 3, Power, is not here**: a device's power key sends its power step where
 * the catalogue's power is a toggle and switches its power variable where it is not, `devices.ts`.
 *
 * The names are the scan codes' in `reference/remotes/harmony-350/keys.md`. Scan 54, Enter, takes `NumberEnter`
 * and otherwise `Enter` only where no other key holds it, the Harmony One's rule, `HardKey.ifFree`: the Kodi's
 * Enter is on it because its OK key sends Ok, and the Denon's is not because its OK key sends Enter.
 */
export const NO_SCREEN_HARD_KEYS: readonly HardKey[] = [
  { scan: 10, button: 'Menu', prefer: ['Menu'] },
  { scan: 12, button: 'Exit', prefer: ['Exit', 'Back'] },
  { scan: 13, button: 'Red', prefer: ['Red'] },
  { scan: 27, button: 'Green', prefer: ['Green'] },
  { scan: 28, button: 'Yellow', prefer: ['Yellow'] },
  { scan: 29, button: 'Blue', prefer: ['Blue'] },
  { scan: 14, button: 'Left', prefer: ['DirectionLeft'] },
  { scan: 31, button: 'Right', prefer: ['DirectionRight'] },
  { scan: 42, button: 'Down', prefer: ['DirectionDown'] },
  { scan: 51, button: 'Up', prefer: ['DirectionUp'] },
  { scan: 15, button: 'Mute', prefer: ['Mute'] },
  { scan: 49, button: 'Volume up', prefer: ['VolumeUp'] },
  { scan: 52, button: 'Volume down', prefer: ['VolumeDown'] },
  { scan: 19, button: 'Clear', prefer: ['Clear', '-'] },
  { scan: 20, button: '0', prefer: ['0'] },
  { scan: 24, button: '1', prefer: ['1'] },
  { scan: 47, button: '2', prefer: ['2'] },
  { scan: 39, button: '3', prefer: ['3'] },
  { scan: 17, button: '4', prefer: ['4'] },
  { scan: 48, button: '5', prefer: ['5'] },
  { scan: 37, button: '6', prefer: ['6'] },
  { scan: 18, button: '7', prefer: ['7'] },
  { scan: 53, button: '8', prefer: ['8'] },
  { scan: 45, button: '9', prefer: ['9'] },
  { scan: 21, button: 'Skip back', prefer: ['ChapterPrev', 'SkipBack', 'SkipBackward'] },
  { scan: 38, button: 'Skip forward', prefer: ['ChapterNext', 'SkipForward'] },
  { scan: 22, button: 'Rewind', prefer: ['Rewind'] },
  { scan: 30, button: 'Fast forward', prefer: ['FastForward'] },
  { scan: 23, button: 'Record', prefer: ['Record'] },
  { scan: 40, button: 'Stop', prefer: ['Stop'] },
  { scan: 44, button: 'Play', prefer: ['Play'] },
  { scan: 46, button: 'Pause', prefer: ['Pause'] },
  { scan: 25, button: 'Up arrow', prefer: ['PageUp'] },
  { scan: 26, button: 'Down arrow', prefer: ['PageDown'] },
  { scan: 32, button: 'Previous channel', prefer: ['ChannelPrev', 'Prev', 'Back'] },
  { scan: 33, button: 'Guide', prefer: ['Guide'] },
  { scan: 36, button: 'Info', prefer: ['Info'] },
  { scan: 41, button: 'Channel down', prefer: ['ChannelDown'] },
  { scan: 55, button: 'Channel up', prefer: ['ChannelUp'] },
  { scan: 50, button: 'OK', prefer: ['OK', 'Ok', 'Select', 'Enter'] },
  { scan: 54, button: 'Enter', prefer: ['NumberEnter'], ifFree: ['Enter'] },
  { scan: 16, button: 'DVR', prefer: ['DVR'] },
];

/** The Power key's scan code, whose binding in a device's map is the power step or the power variable's switch. */
export const POWER_SCAN = 3;

// ---------------------------------------------------------------------------------------------------------------
// Logitech's routing in a device's map, `todo-compile-350.md` 4.1.1. Every rule below is a choice Logitech's service
// makes and its compiler writes, copied so that a device composed here stores and binds what Logitech's compile of
// the same setup does. The service states two of them itself: its mode maps of the test setup's eight devices, the
// lab's `work/myharmony/responses/20261031-h350-setup_GetDeviceModeButtonMaps-all.json`, carry an override on the
// keys a device's map borrows, `TvInput` to the TV key's mode and the volume keys to the receiver. What the service
// does for a setup it was never asked about is not read; the rules are what its compiles show, with their counts.
// `packages/codec/test/noscreenrouting.test.ts` holds each.

/**
 * The Input key, and the commands a device's own Input key takes, first the device has: on every compile of the
 * family read, every device map's Input sends the input command of the device on the TV key's short press, the
 * device mode the service calls its TV mode, and that device's own map binds it too; which command was each time
 * the first of these the device has: `InputNext` on the test setup's LG and the Harmony 300's Panasonic, `Input` on
 * another owner's LG, `Source` on the Philips of the bench 350's first configuration. A TV mode device with none of
 * them, the plasma of three compiles, leaves Input bound on no map.
 */
export const INPUT_KEY = { scan: 35, prefer: ['InputNext', 'Input', 'Source'] } as const;

/** Volume up, volume down and mute, which a device's map takes from the receiver where Logitech routes them. */
export const VOLUME_SCANS: readonly number[] = [49, 52, 15];

/**
 * Logitech's numeric device types the routing below asks about, the names its service's reply gives them in the
 * lab's test setup capture: a television, and the receiver, `StereoReceiver`.
 */
export const TELEVISION_TYPE = 1;
export const RECEIVER_TYPE = 5;

/**
 * The commands a television's fifth favourite key takes in its own map, first the device has, per skin, since the
 * key is the Harmony 350's: `Fav5` in the service's mode maps. The test setup's LG holds Home there and its plasma
 * Internet, and the plasma holds Internet there in both other Harmony 350 compiles it is in; no device of another
 * type binds it on any compile. **One compile disagrees**: the bench 350's first configuration, compiled for its
 * previous owner, binds nothing there on a Philips television with a Home command, and nothing says whether that
 * owner changed it; the test setup's compile is the one composed against, so it decides. **The order of the two
 * is not measured**: no television read has both commands, so putting Internet first fails no test, a control
 * run and reverted.
 */
export const FAVOURITE_FIVE: Readonly<Record<number, { readonly scan: number; readonly prefer: readonly string[] }>> = {
  104: { scan: 2, prefer: ['Home', 'Internet'] },
};

/**
 * A command Logitech stores for a device and binds to no key of the Harmony 350, since the key the service puts it
 * on, `Teletext` in its mode maps, is not on that keypad: the device's Teletext, stored with a send list nothing
 * calls. In the service's maps of the test setup the key is on the plasma's and the KPN's, the two of eight devices
 * with a Teletext command; on the five Harmony 350 compiles read, 11 of 11 devices with the command store it so.
 * The Harmony 300, which has the key, binds it there, so this is the Harmony 350's.
 */
export const STORED_UNBOUND: readonly string[] = ['Teletext'];

/**
 * The values a device's power variable is set to by a list of its own that nothing calls, `07 FFFF` then the write:
 * the silent flag, so the write runs no transition and sends nothing, `SILENT_WRITE` in `actions.ts`. Logitech's
 * compiles of this family store the two for every device, 0 and 1, 27 of 27 devices over the seven files of the
 * Harmony 300 and 350 read, none of the 54 lists called, and no other list there opens with the flag,
 * `noscreenrouting.test.ts`. What would call them is not read: on the other families a list of this shape is a
 * reset an activity's help or an input change runs, `inputs.ts`.
 */
export const POWER_RESETS: readonly number[] = [0, 1];

/**
 * Which device types Logitech stores one block copies of the ten digits for, each with a send list nothing calls
 * unless a favourite channel does. By type and not by a command, since a Playstation 3 holds copies and has no
 * ChannelUp. Measured on 25 devices of the six current compiles of the family, every one agreeing, ten copies or
 * none: held for 1 television (seven devices), 2 VCR, 16 a satellite receiver, 18 a PVR (six), 23 a game console and
 * 35 a media player (two); not for 4 DVD (two), 5 receiver, 7 projector, 21 a Marantz network receiver, 22 a home
 * theatre system and 30 a switch. A type not in this table is refused rather than guessed.
 */
export const DIGIT_COPIES_BY_TYPE: ReadonlyMap<number, boolean> = new Map([
  [1, true], [2, true], [16, true], [18, true], [23, true], [35, true],
  [4, false], [5, false], [7, false], [21, false], [22, false], [30, false],
]);

/** A device of the account, as a setup names it and the catalogue types it. */
export interface AccountDevice {
  readonly name: string;
  readonly deviceType: number;
}

/**
 * Whose volume and mute a device's map sends: its own if it is a television or a receiver, otherwise the first
 * receiver of the account, otherwise the first television, otherwise its own. In the account's order, which is the
 * setup's and the metadata archive's.
 *
 * **Measured**: all eight devices of Logitech's compile of the test setup, which the service's mode maps state as
 * overrides on the five that are neither (the Denon's own map naming the Denon), the KPN's map binding no mute,
 * which its service map gives no override either; and with no receiver, the television, on 9 of the 12 devices that
 * are neither on the other five current compiles. Of the three that disagree two keep their own, a QNAP media player
 * and a Marantz network receiver, both on compiles made for earlier owners, where a person may have used the
 * service's volume screen, which offers that choice per key; nothing in the files says. The third is a Harmony
 * 300's KPN, whose map binds no volume at all, for a reason no file states, `noscreenactivity.test.ts`.
 */
export function volumeSource(device: AccountDevice, account: readonly AccountDevice[]): string {
  if (device.deviceType === TELEVISION_TYPE || device.deviceType === RECEIVER_TYPE) return device.name;
  const receiver = account.find((one) => one.deviceType === RECEIVER_TYPE);
  if (receiver !== undefined) return receiver.name;
  return account.find((one) => one.deviceType === TELEVISION_TYPE)?.name ?? device.name;
}

/**
 * The four device keys by place, top left, top right, bottom left and bottom right: the scan code each raises
 * and the output pin its press switches, on both models, `reference/architectures/harmony-300-350/memory.md`
 * "A device key and its long press". A device on a key's short press takes the infrared group of the key's
 * place, and a long press device `4 + place`.
 */
export const DEVICE_KEYS: readonly { readonly place: string; readonly scan: number; readonly pin: number }[] = [
  { place: 'top left', scan: 5, pin: 0 },
  { place: 'top right', scan: 1, pin: 2 },
  { place: 'bottom left', scan: 7, pin: 1 },
  { place: 'bottom right', scan: 4, pin: 3 },
];

/**
 * The infrared group a long press device takes is this plus its key's place, `todo-compile-350.md` 4.4: on all
 * four keys of Logitech's compile of the Harmony 350 test setup, groups 4 to 7 for the top left to the bottom
 * right, and on the one long press of another owner's Harmony 350 compile that selects a device of its own,
 * `reference/architectures/harmony-300-350/memory.md` "Which infrared group a device takes". The Harmony 300 has
 * no long press, so a long press is this family's fact on the 350 alone.
 */
export const LONG_PRESS_GROUP_BASE = DEVICE_KEYS.length;

/**
 * The scan codes of the keys a favourite channel goes on, in the order the channels are given, per skin: the
 * Harmony 350's, skin 104, `todo-compile-350.md` 4.3. Logitech's compile of the test setup puts the channels 1,
 * 2, 3, 666 and 07, entered in that order, on scans 8, 9, 11, 34 and 2; the three other Harmony 350 compiles with
 * five favourites, which come from two remotes, hold them on the same five scans, and with the fourth and fifth
 * on 34 and 2 where their channels, 4 and then 666 or 130, read as entered in that order too, though nothing
 * records how they were. So the order is scored on one compile and measured with five channels; fewer take the
 * first of them, which is our choice, since no compile holds fewer on a Harmony 350. Which scan is which printed key is `reference/remotes/harmony-350/keys.md`.
 *
 * **The Harmony 300 has no entry**: its one compile with favourites holds 1, 2, 3 and 666 on scans 8, 2, 9 and 34,
 * another order on another keypad, `reference/remotes/harmony-300/features.md`, and one compile is one sample with
 * nothing to say how the channels were entered, so a favourite composed for it is refused until a second is read.
 * A table by skin rather than a test of the skin, so the composer asks it a question.
 */
export const FAVOURITE_SCANS: Readonly<Record<number, readonly number[]>> = {
  104: [8, 9, 11, 34, 2],
};

/**
 * The two timers a device key's press starts per device on the key, in the order it starts them, as the low
 * byte of the instruction each runs when it fires and its duration in ticks: the pin switched one way at 400
 * and back at 600, measured on every press list of the Harmony 350 compiles read, `memory.md`.
 */
export const KEY_TIMERS: readonly { readonly ticks: number; readonly pinState: number }[] = [
  { ticks: 400, pinState: 0 },
  { ticks: 600, pinState: 2 },
];

/**
 * The raw slots the family's composer edits that the slot map does not name, so that no reader of a base slot is
 * handed a container it has not been run on, `ARCH16_SLOT_MAP`'s docstring: the key maps, base slot 9 by the
 * firmware's reading, and the timers, base slot 12, `tests/test_harmony_350_slots.py`. A family's own table, since
 * the family is one architecture's.
 */
export const KEY_MAP_SLOT = 6;
export const TIMER_SLOT = 8;
/** The start up instructions, the family's own, raw slot 5. */
export const START_UP_SLOT = 5;
/**
 * The start up event whose list selects the map of the device on infrared group 0, the TV key's short press, as its
 * last instruction: entry 1, on all seven compiles of the family read, `reference/architectures/harmony-300-350/memory.md`.
 */
export const START_UP_SELECT_ENTRY = 1;
