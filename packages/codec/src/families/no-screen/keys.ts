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
