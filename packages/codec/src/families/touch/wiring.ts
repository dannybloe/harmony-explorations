/**
 * The Harmony One's own wiring, built from a description: `todo-compile-one.md` 6.3, findings section 410.
 *
 * What a One configuration carries besides its devices, activities and screens and connects the remote's
 * own events to it: the event map, base slot 8's leading list, the timers, base slot 9's seven entries
 * nothing selects and the one left over, and the action lists those name, followed through every call. The
 * log area and the parameter block, which `families/four-slot/wiring.ts` builds with the rest on the Harmony
 * 600, 650 and 700, are built here too, by 6.4's builders, so one call swaps every piece a check compares. The engine, the
 * encoding of an instruction, a list and an entry and the swap into a layout, is `wiringparts.ts`, shared
 * with the four slot family; this module is the catalogue and the numbering, the One's alone.
 *
 * **Measured on the 19 distinct Logitech compiles for the One**, the population of section 405: with every
 * number blanked out, the structures below are the same on all 19 but for three settings, the three second
 * timer and the number of redraw timers. The settings: the Remote Assistant's start, section 403, which
 * `one_config` alone has none of; a `07 FFFB` that two compiles open the ladder list with; and the screen
 * light's two timers, 10 and 20 seconds on all 19 and raised on five of our seven writes. The three second
 * timer and its list are on two compiles, and the redraw timers number 13 to 20. What differs otherwise is
 * numbering: which index each list, mode, variable, value map and screen program has, where the leftover
 * entry sits, the order of the timer table and the device timers it holds.
 *
 * **What is generated**: every instruction, every list's length and order, every entry's tags, flags,
 * form and stored order (`tagSlotOrder` with ties measured on 19 of 19), the front of base slot 10, a run
 * of 168 lists whose indices follow from where it starts, the event map, the leading list, each timer's
 * kind, and the log area and parameter block. **What is carried, the description**: where the
 * start list and the front sit, every other list's index, the modes, variables, value maps, screen
 * programs and the leftover entry the catalogue names, the timer table's order with its device timers
 * whole, and the three settings.
 *
 * **What it does not build**: base slot 10's lists before the start list, which the wiring reaches none of
 * (named from mode records, screen programs and the key table), the two between it and the front, the
 * screens the wiring enters (`todo-compile-one.md` 4.4.3 and 4.4.4), the activities' entries, and every list
 * that starts a redraw timer. Names here are this module's labels, not readings of the firmware: by purpose
 * where a section reads it, otherwise by where the list is bound, `e1.0x26` being
 * entry 1's binding of tag `0x26` and `e1.0x26.3` the list its fourth instruction calls.
 *
 * Read only towards hardware: the result is pieces `withWiring` puts in a layout.
 */
import { u16, u24, u8 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { takeApart } from '../../frame.ts';
import type { Container } from '../../gspm.ts';
import { ACTION_LIST_TABLE_SLOT, BINDING_SLOT } from '../../gspm.ts';
import { KEY_EVENT_PRESS, KEY_EVENT_SHIFT } from '../../inventory.ts';
import { HANDLER_TABLE_SLOT } from '../../sections.ts';
import { TIMER_KIND_SCHEDULED, TIMER_RECORD_LENGTH, TIMER_SLOT } from '../../tables.ts';
import { buildLogArea, buildParameterBlock } from '../../firmwaresections.ts';
import {
  SYMBOL_KINDS, WiringError, buildEventMap, checkRange, compareWiring, decodeEntry, decodeList, emptySymbols, encode,
  encodeEntry, encodeList, lookup, namedBy, orderOf, piece, tablePiece, tableTargets, tie, wiringList,
  type BuiltWiring, type DeviceTimer, type EntryTemplate, type SymbolKind, type Symbols, type WiringChecked,
  type WiringInstruction,
} from '../../wiringparts.ts';
import { TOUCH_PARAMETERS } from './parameters.ts';
import { TOUCH_FIRMWARE_KEYPAD, TOUCH_FIRMWARE_SCREENS } from './firmwarescreens.ts';

export { TOUCH_FIRMWARE_SCREENS };

/** The architecture of the family's remote, which the log area's and parameter block's tables are keyed by. */
const ARCHITECTURE = 12;


/** How many status codes the event map carries, keys 0 to 29, on 19 of 19. */
const EVENT_COUNT = 30;

/** A press tag for a scan, the key table's split, section 17. */
const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
/** The one tag below the presses that entries 2, 3 and 4 all bind beside them. */
const EVENT_0X30 = 0x30;

/** The settings a description carries. */
export interface TouchWiringSettings {
  /**
   * The Remote Assistant at start, section 403: the start's ladder on the assistant's variable and the
   * leftover entry's binding that sets it 1. On 18 of the 19 compiles; `one_config` has neither, and its
   * start calls the ladder's last rung directly.
   */
  startupAssistant: boolean;
  /**
   * A `07 FFFB` the ladder list opens with, section 73's cancel of all four running timers, on
   * `one_config_unprogrammed` and `one_friend_asfound_config` and on none of the other 16 with the assistant. What decides it is not known; carried, and refused
   * without the assistant, where no compile shows it.
   */
  ladderCancelsTimers: boolean;
  /** Seconds the screen stays lit, the pair's 10 second timer on Logitech's, `screenlight.ts`. */
  screenLight: number;
  /** Its partner's seconds, 20 on Logitech's. */
  screenLightAgain: number;
}

/**
 * The thirteen timers every one of the 19 holds once each, and what each queues. `second0` to `second5` are
 * the six one second timers that enter a screen, numbered in the table's order; `second4`'s screen is the one
 * the `ready` list enters, on 19 of 19, so it is that symbol and not one of its own. The redraw timers,
 * `redraw0` upward in table order, are 13 to 20, started from lists outside the wiring; what sets their
 * number is not established.
 */
const FIXED_TIMERS: readonly { name: string; duration: number | keyof TouchWiringSettings; instruction: WiringInstruction }[] = [
  { name: 'screenLight', duration: 'screenLight', instruction: { call: 'screenLight' } },
  { name: 'screenLightAgain', duration: 'screenLightAgain', instruction: { call: 'screenLightAgain' } },
  { name: 'lightTick', duration: 2, instruction: { call: 'lightTick' } },
  { name: 'lightsOut', duration: 1, instruction: { call: 'lightsOut' } },
  { name: 'readyReset', duration: 5, instruction: { call: 'readyReset' } },
  { name: 'ready5', duration: 5, instruction: { call: 'ready5' } },
  { name: 'enter5', duration: 5, instruction: { enter: 'enter5.screen' } },
  ...Array.from({ length: 6 }, (_, k) => ({
    name: `second${k}`, duration: 1, instruction: { enter: k === 4 ? 'ready.screen' : `second${k}.screen` },
  })),
];
/**
 * A timer two of the 19 hold besides those, `harvest_one_families_1` and `one_friend_asfound_config`: three
 * seconds, queueing a list that relights the screen and enters a screen of the configuration's. What puts it
 * in a compile is not read, so it is the description's to name, as a device's timer is.
 */
const OPTIONAL_TIMERS: readonly { name: string; duration: number; instruction: WiringInstruction }[] = [
  { name: 'show3', duration: 3, instruction: { call: 'show3' } },
];
const REDRAW = /^redraw(\d+)$/;
const REDRAW_SECONDS = 4;

/**
 * The lists the catalogue states, measured on the 19 and named by this module, with the Remote Assistant
 * on. The front's per key lists of entries 2 to 4 are written by `catalogue` rather than listed, since all
 * 53 of each entry's are one body. `e1.tag0F` is entry 1's binding of tag `0x0F`, the one list of entry 1's
 * that sits outside the front.
 */
const LISTS: readonly (readonly [string, string])[] = [
  // The start, base slot 8's one entry point, and the boot it calls.
  ['start', 'call boot | call startIdle | call startUsb'],
  ['boot', 'call boot.keys | 3F F064 | call boot.2 | call boot.3 | call boot.4 | call boot.5 | 1F FE01 | 1F FEFE | call ladder | 1F FEFD | 1F FEFC | 1F FE04 | call events | call boot.clear | call lights | call boot.sound'],
  ['boot.keys', 'call boot.keys.0 | call boot.keys.0 | call boot.keys.2 | call boot.keys.0'],
  ['boot.keys.0', '1F FB00 | 0F FFE1'],
  ['boot.keys.2', '1F FB01 | 0F FFE1'],
  ['boot.2', '07 FFFF | bootVar2 := 0'],
  ['boot.3', '07 FFFF | bootVar3 := 0'],
  ['boot.4', '07 FFFF | bootVar4 := 0'],
  ['boot.5', '07 FFFF | bootVar5 := 0'],
  ['boot.clear', 'keyLightsA := 0 | keyLightsB := 0 | keyLight4 := 0 | keyLight5 := 0 | keyLight6 := 0 | keyLight7 := 0'],
  ['boot.sound', 'buttonSound := 0 | 3F F301'],
  // The Remote Assistant's ladder, section 403: at most 1 its welcome, 2 "Ensure all your devices are off",
  // 3 the ordinary start, `rung`.
  ['ladder', 'call lights | call assistant'],
  ['assistant', '1F FB01 | call assistant.1'],
  ['assistant.1', 'test assistantStep 84 | enter assistantWelcome | call assistant.1.2'],
  ['assistant.1.2', '1F FB02 | call assistant.1.2.1'],
  ['assistant.1.2.1', 'test assistantStep 80 | enter assistantDevicesOff | call assistant.1.2.1.2'],
  ['assistant.1.2.1.2', '1F FB03 | call assistant.1.2.1.2.1'],
  ['assistant.1.2.1.2.1', 'test assistantStep 00 | call rung'],
  ['rung', '1F FB01 | call rung.1'],
  ['rung.1', '71 800D | call ready | map readyMap on location'],
  ['ready', 'call ready.0 | 07 FFFB | call ready.2 | enter ready.screen'],
  ['ready.0', '1F FB00 | call ready.0.1'],
  ['ready.0.1', '71 000D | 3F F100'],
  ['ready.2', '07 FFFF | readyVar := 0'],
  // The lights: the screen's channels and the page keys', section 400, and the tick that keeps them.
  ['lights', '1F FB01 | call lights.1'],
  ['lights.1', '71 800D | call lightUp | call lights.1.2'],
  ['lights.1.2', '1F FB01 | call lights.1.2.1'],
  ['lights.1.2.1', '71 8010 | call lightUp | call lights.1.2.1.2'],
  ['lights.1.2.1.2', '1F FB02 | call lights.1.2.1.2.1'],
  ['lights.1.2.1.2.1', '71 8409 | call lights.1.2.1.2.1.1 | call lights.1.2.1.2.1.2'],
  ['lights.1.2.1.2.1.1', 'stop screenLight | 3F C11C | call lightsOn | call lightTick'],
  ['lights.1.2.1.2.1.2', 'stop screenLight | 3F C11C | call lightsOn | call lightTick'],
  ['lightUp', 'stop screenLight | 3F C11C | call lightsOn | call lightTick'],
  ['lightsOn', '3F C0C2 | 3F C0B2 | 3F C0A2 | 3F C092 | 3F C082 | 3F C102 | call keyLights'],
  ['keyLights', 'call keyLights.0 | call keyLights.1 | call keyLights.2 | call keyLights.3 | call keyLights.4 | call keyLights.5 | call keyLights.6 | call keyLights.7'],
  ['keyLights.0', '1F FB01 | call keyLights.0.1'],
  ['keyLights.0.1', 'test keyLightsA 00 | call keyLights.0.1.1'],
  ['keyLights.0.1.1', '1F FB00 | call keyLights.0.1.1.1'],
  ['keyLights.0.1.1.1', 'test keyLightsB 00 | call keyLights.0.1.1.1.1'],
  ['keyLights.0.1.1.1.1', '3F C032 | 3F C012 | keyLightsA := 1'],
  ['keyLights.1', '1F FB02 | call keyLights.1.1'],
  ['keyLights.1.1', 'test keyLightsA 00 | call keyLights.1.1.1'],
  ['keyLights.1.1.1', '1F FB00 | call keyLights.1.1.1.1'],
  ['keyLights.1.1.1.1', 'test keyLightsB 00 | call keyLights.1.1.1.1.1'],
  ['keyLights.1.1.1.1.1', '3F C012 | keyLightsA := 2'],
  ['keyLights.2', '1F FB03 | call keyLights.2.1'],
  ['keyLights.2.1', 'test keyLightsA 00 | call keyLights.2.1.1'],
  ['keyLights.2.1.1', '1F FB00 | call keyLights.2.1.1.1'],
  ['keyLights.2.1.1.1', 'test keyLightsB 00 | call keyLights.2.1.1.1.1'],
  ['keyLights.2.1.1.1.1', '3F C032 | keyLightsA := 3'],
  ['keyLights.3', '1F FB00 | call keyLights.3.1'],
  ['keyLights.3.1', 'test keyLightsB 03 | call keyLights.3.1.1'],
  ['keyLights.3.1.1', '1F FB00 | call keyLights.3.1.1.1'],
  ['keyLights.3.1.1.1', 'test keyLightsA 00 | call keyLights.3.1.1.1.1'],
  ['keyLights.3.1.1.1.1', '3F C022 | 3F C002 | keyLightsB := 1'],
  ['keyLights.4', '1F FB00 | call keyLights.4.1'],
  ['keyLights.4.1', 'test keyLight4 03 | call keyLights.4.1.1'],
  ['keyLights.4.1.1', '3F C052 | keyLight4 := 1'],
  ['keyLights.5', '1F FB00 | call keyLights.5.1'],
  ['keyLights.5.1', 'test keyLight5 03 | call keyLights.5.1.1'],
  ['keyLights.5.1.1', '3F C072 | keyLight5 := 1'],
  ['keyLights.6', '1F FB00 | call keyLights.6.1'],
  ['keyLights.6.1', 'test keyLight6 03 | call keyLights.6.1.1'],
  ['keyLights.6.1.1', '3F C042 | keyLight6 := 1'],
  ['keyLights.7', '1F FB00 | call keyLights.7.1'],
  ['keyLights.7.1', 'test keyLight7 03 | call keyLights.7.1.1'],
  ['keyLights.7.1.1', '3F C062 | keyLight7 := 1'],
  ['lightTick', 'stop screenLight | call lightTick.1'],
  ['lightTick.1', '1F FB00 | call lightTick.1.1'],
  ['lightTick.1.1', '71 8011 | call lightTick.1.1.1 | start lightTick'],
  ['lightTick.1.1.1', '3F C11D | start screenLight'],
  ['lightsOff', 'stop screenLight | call lightsOff.1'],
  ['lightsOff.1', '3F C0C0 | 3F C0B0 | 3F C0A0 | 3F C090 | 3F C080 | 3F C100 | call lightsOff.1.6 | call lightsOff.1.7 | 3F C050 | 3F C070 | 3F C040 | 3F C060'],
  ['lightsOff.1.6', '3F C030 | 3F C010'],
  ['lightsOff.1.7', '3F C020 | 3F C000'],
  ['lightOffFlag', '3F C110 | 3F F101'],
  // The timers' own lists. The light pair's two hold the same body as two lists, on 19 of 19.
  ['screenLight', 'call lightsOff | call lightOffFlag'],
  ['screenLightAgain', 'call lightsOff | call lightOffFlag'],
  ['lightsOut', 'call lightsOff | 3F C117 | 3F C111 | call lightsOut.3'],
  ['lightsOut.3', '1F FB00 | call lightsOut.3.1'],
  ['lightsOut.3.1', '71 000D | 3F F101'],
  ['readyReset', 'call settle | call ready | 3F C11C'],
  ['ready5', 'call ready | 3F C11C'],
  ['show3', '07 FFFB | call lights | enter show3.screen'],
  // The rest of the start: the leftover entry, and USB Connected while firmware variable 16 is 0.
  ['startIdle', 'select idle | 3F F101 | call startIdle.2'],
  ['startIdle.2', '1F FB02 | call startIdle.2.1'],
  ['startIdle.2.1', '71 0409 | call relight'],
  ['relight', 'call lights | call relight.1'],
  ['relight.1', '1F FB00 | call relight.1.1'],
  ['relight.1.1', 'test relightVar 00 | relightVar := 1'],
  ['startUsb', '1F FB01 | call startUsb.1'],
  ['startUsb.1', '71 0010 | call startUsb.1.1'],
  ['startUsb.1.1', '07 FFFD | enter usbConnected'],
  ['events', '1F FB01 | call events.1'],
  ['events.1', '71 800D | 1F E805 | call events.1.2'],
  ['events.1.2', '1F FB01 | call events.1.2.1'],
  ['events.1.2.1', '71 8010 | 1F E805 | call events.1.2.1.2'],
  ['events.1.2.1.2', '1F FB02 | call events.1.2.1.2.1'],
  ['events.1.2.1.2.1', '71 8409 | 1F E800 | 1F E806'],
  // Entry 1's own lists, the firmware's events, in the front.
  ['e1.0x23', '75 4664 | call menu | enter chargingProblem | 07 FFFB | start screenLightAgain'],
  ['menu', 'map menuMap on location | call menu.1'],
  ['menu.1', '1F FB00 | call menu.1.1'],
  ['menu.1.1', '71 000D | 3F F101'],
  ['e1.0xAF', '75 0FCA | 0F FFA1'],
  ['e1.0x26', '75 4664 | call events | call lights | call e1.0x26.3 | 07 FFFB | call e1.0x26.5'],
  ['e1.0x26.3', '1F FB01 | call e1.0x26.3.1'],
  ['e1.0x26.3.1', 'test bootVar3 80 | call settle | call e1.0x26.3.1.2'],
  ['e1.0x26.3.1.2', 'call settle | 07 FFFD | enter usbConnected'],
  ['settle', 'relightVar := 0 | call settle.1'],
  ['settle.1', 'call settle.1.0 | settleVar := 0'],
  ['settle.1.0', '1F FB01 | call settle.1.0.1'],
  ['settle.1.0.1', 'test bootVar3 00 | call settle.1.0.1.1'],
  ['settle.1.0.1.1', '1F FB01 | call settle.1.0.1.1.1'],
  ['settle.1.0.1.1.1', '71 8010 | enter usbConnected | 07 FFFC'],
  ['e1.0x26.5', '1F FB01 | call e1.0x26.5.1'],
  ['e1.0x26.5.1', '71 000D | start ready5'],
  ['e1.0xAE', '75 0FCA | 0F FFA0'],
  ['e1.0x27', 'call chime | call events | call lights | call e1.common | call e1.0x27.4 | call e1.0x27.5 | call e1.0x27.6'],
  ['chime', '75 4664 | 75 01FF | 75 01FF | 75 01FF | 75 4664'],
  ['e1.common', '1F FB01 | call e1.common.1'],
  ['e1.common.1', '71 000D | call e1.common.1.1'],
  ['e1.common.1.1', '1F FB00 | call e1.common.1.1.1'],
  ['e1.common.1.1.1', '71 800F | call e1.common.1.1.1.1 | call e1.common.1.1.1.2'],
  ['e1.common.1.1.1.1', '1F FB00 | call e1.common.1.1.1.1.1'],
  ['e1.common.1.1.1.1.1', '71 0010 | 3F F201'],
  ['e1.common.1.1.1.2', '1F FB01 | call e1.common.1.1.1.2.1'],
  ['e1.common.1.1.1.2.1', '71 0010 | 3F F200'],
  ['e1.0x27.4', '1F FB00 | call e1.0x27.4.1'],
  ['e1.0x27.4.1', 'test bootVar4 01 | 07 FFFC'],
  ['e1.0x27.5', '1F FB01 | call e1.0x27.5.1'],
  ['e1.0x27.5.1', '71 0009 | 07 FFF6'],
  ['e1.0x27.6', '1F FB02 | call e1.0x27.6.1'],
  ['e1.0x27.6.1', '71 0409 | call relight'],
  ['e1.0xA2', 'idleB7Var := 0 | map readyMap on location'],
  ['e1.tag0F', '1F FB02 | call e1.tag0F.1'],
  ['e1.tag0F.1', '71 8409 | 00 0000 | call settle'],
  ['e1.0x10', 'call e1.0x10.0 | call e1.common'],
  ['e1.0x10.0', '1F FB02 | call e1.0x10.0.1'],
  ['e1.0x10.0.1', '71 0409 | call relight'],
  ['e1.0x1F', 'call e1.0x1F.0 | 3F F100 | 07 FFFB | 75 4664 | call events | 3F C11C | call e1.common | call settle | call ready'],
  ['e1.0x1F.0', '1F FB01 | call e1.0x1F.0.1'],
  ['e1.0x1F.0.1', 'test e1Var 00 | 07 FFFD'],
  ['e1.0x1E', 'call chime | call e1.0x1E.1 | 3F C11C | 3F F200 | call e1.0x1E.4 | call e1.0x1E.5 | call lights | 3F F101'],
  ['e1.0x1E.1', '1F FB01 | call e1.0x1E.1.1'],
  ['e1.0x1E.1.1', 'test e1Var 80 | 07 FFFC | call menu'],
  ['e1.0x1E.4', '1F FB01 | call e1.0x1E.4.1'],
  ['e1.0x1E.4.1', '71 0409 | 07 FFF6'],
  ['e1.0x1E.5', '1F FB02 | call e1.0x1E.5.1'],
  ['e1.0x1E.5.1', '71 0409 | call relight'],
  // Entry 4's one list that is not a key press's, in the front at its tag's place.
  ['e4.0x17', 'call e4.0x17.keys | call lights | call keyLights | 3F F101'],
  ['e4.0x17.keys', 'call boot.keys.2 | call boot.keys.0 | 0F FFE3 | 0F FFE3'],
  // The leftover entry's lists, section 329's entry on this family.
  ['idleEnter', 'map idleEnterMap on location | 07 FFFB | call boot.5 | call idleEnter.3 | map idleMap on location | call lights'],
  ['idleEnter.3', '3F D000 | call idleEnter.3.1'],
  ['idleEnter.3.1', '1F FB02 | call idleEnter.3.1.1'],
  ['idleEnter.3.1.1', '71 8409 | call idleEnter.3.1.1.1 | call ladder'],
  ['idleEnter.3.1.1.1', '1F FB00 | call idleEnter.3.1.1.1.1'],
  ['idleEnter.3.1.1.1.1', 'test bootVar3 00 | call idleEnter.3.1.1.1.1.1'],
  ['idleEnter.3.1.1.1.1.1', 'call idleEnter.3.1.1.1.1.1.0 | enter lowBattery'],
  ['idleEnter.3.1.1.1.1.1.0', '1F FB00 | call idleEnter.3.1.1.1.1.1.0.1'],
  ['idleEnter.3.1.1.1.1.1.0.1', 'test bootVar4 00 | call idleEnter.3.1.1.1.1.1.0.1.1'],
  ['idleEnter.3.1.1.1.1.1.0.1.1', 'map menuMap on location | 07 FFFD'],
  ['idleResume', '07 FFFB | call boot.5 | call idleResume.2 | map idleMap on location | call lights'],
  ['idleResume.2', '1F FB02 | call idleResume.2.1'],
  ['idleResume.2.1', '71 8409 | call idleEnter.3.1.1.1 | call ladder'],
  ['idleB7', 'enter idleB7.screen | idleB7Var := 1'],
];

/** The bodies of the per key lists of entries 2 to 4, each key's own list, 19 of 19. */
const PER_KEY: Readonly<Record<2 | 3 | 4, string>> = {
  2: '07 FFFB | call ready | 3F C11C',
  3: '07 FFFB | call menu | call lights',
  4: 'call lights | call keyLights',
};
/** A list of the front: one of entry 1 to 4's own, `e<entry>.0x<tag>`. Every other name is the description's. */
const FRONT_NAME = /^e[1-4]\.0x[0-9A-F]{2}$/;
const hex = (tag: number): string => tag.toString(16).toUpperCase().padStart(2, '0');

interface TouchTimer {
  name: string;
  duration: number;
  instruction: WiringInstruction;
}

interface Catalogue {
  lists: Map<string, WiringInstruction[]>;
  /** Entries 0 to 6 by index and the leftover entry by its symbol, in the order `withWiring` meets them. */
  entries: EntryTemplate[];
  lead: WiringInstruction[];
  /** The timer table, a template per index and `undefined` for a device's. */
  timers: (TouchTimer | undefined)[];
  /** The front's lists, in index order from where it starts. */
  front: string[];
}

/**
 * Every structure for one set of settings and one timer table: the measured lists with the settings applied,
 * the eight entries, the leading list and the timers, with every list nothing reaches dropped.
 */
function catalogue(settings: TouchWiringSettings, timers: readonly string[]): Catalogue {
  if (settings.ladderCancelsTimers && !settings.startupAssistant) {
    throw new WiringError('no compile opens the ladder with 07 FFFB where it has no Remote Assistant');
  }
  const lists = new Map<string, WiringInstruction[]>();
  for (const [name, body] of LISTS) {
    if (lists.has(name)) throw new WiringError(`the catalogue states ${name} twice`);
    lists.set(name, wiringList(body));
  }
  // Without the assistant the ladder is its last rung, section 403's `one_config`.
  if (!settings.startupAssistant) lists.set('ladder', lists.get('rung')!);
  if (settings.ladderCancelsTimers) lists.set('ladder', [{ op: 0x07, operand: 0xfffb }, ...lists.get('ladder')!]);

  const presses = TOUCH_FIRMWARE_KEYPAD.map(press);
  const own = (entry: 2 | 3 | 4, tag: number): WiringInstruction => {
    const name = `e${entry}.0x${hex(tag)}`;
    lists.set(name, wiringList(PER_KEY[entry]));
    return { call: name };
  };
  const bindings = (pairs: readonly (readonly [number, WiringInstruction])[]): Map<number, WiringInstruction> => new Map(pairs);
  const flagged = (tags: readonly number[]): Map<number, number> => new Map(tags.map((t) => [t, 1]));
  const allOf = (to: (tag: number) => WiringInstruction): [number, WiringInstruction][] =>
    [...presses, EVENT_0X30].map((tag) => [tag, to(tag)]);
  const none = new Map<string, readonly [number, number]>();
  const call = (name: string): WiringInstruction => ({ call: name });

  const entries: EntryTemplate[] = [
    { index: 0, wide: true, ties: none, bindings: bindings([0x1b, 0x1a, 0x1d, 0x1c].map((t) => [t, call('events')])) },
    {
      index: 1, wide: false, ties: new Map([tie(0xaf, 0x26), tie(0xae, 0x27), tie(0x0f, 0x2d)]),
      bindings: bindings([
        [0x23, call('e1.0x23')], [0xaf, call('e1.0xAF')], [0x26, call('e1.0x26')], [0xae, call('e1.0xAE')],
        [0x27, call('e1.0x27')], [0x25, { op: 0, operand: 0 }], [0xa2, call('e1.0xA2')], [0xa5, { select: 'idle' }],
        [0x0f, call('e1.tag0F')], [0x2d, { op: 0x07, operand: 0xfffa }], [0x10, call('e1.0x10')],
        [0x19, { op: 0x07, operand: 0xfff6 }], [0x1f, call('e1.0x1F')], [0x1e, call('e1.0x1E')],
      ]),
    },
    { index: 2, wide: false, ties: none, bindings: bindings(allOf((tag) => own(2, tag))) },
    {
      index: 3, wide: true, ties: new Map([tie(0x17, 0x9e), tie(0x1f, 0x96), tie(0x26, 0xaf)]),
      flags: new Map([...presses, EVENT_0X30].map((t) => [t, 0])),
      bindings: bindings([...allOf((tag) => own(3, tag)), [0x17, call('menu')], [0x1f, { op: 0x07, operand: 0xfffb }], [0x26, call('menu')]]),
    },
    {
      index: 4, wide: true, ties: new Map([tie(0x17, 0x9e)]),
      bindings: bindings([...allOf((tag) => (tag === EVENT_0X30 ? call('lights') : own(4, tag))), [0x17, call('e4.0x17')]]),
    },
    { index: 5, wide: true, ties: none, bindings: bindings([[0x1e, { op: 0x07, operand: 0xfffb }]]) },
    { index: 6, wide: true, ties: none, bindings: bindings([[0x19, call('events')], [0x18, call('events')]]) },
    {
      // Wide where a binding carries a flag, which the assistant's does: narrow on `one_config` alone.
      index: 'idle', wide: settings.startupAssistant, ties: new Map([tie(0xa6, 0xb7)]),
      flags: new Map([[0x01, 0], [0x05, 0], [0xa6, 0], [0xb7, 0], [0xa2, 1]]),
      bindings: bindings([
        [0x01, call('idleEnter')], [0x05, call('idleResume')],
        ...(settings.startupAssistant ? [[0xa2, { write: 'assistantStep', value: 1 }] as const] : []),
        [0xa6, { map: 'idleA6Map', on: 'location' }], [0xb7, call('idleB7')],
      ]),
    },
  ];
  // The front: entries 1 to 4's own lists in each entry's stored order, from where the description puts it.
  const front: string[] = [];
  for (const template of entries.slice(1, 5)) {
    for (const tag of orderOf(template)) {
      const binding = template.bindings.get(tag)!;
      if ('call' in binding && FRONT_NAME.test(binding.call)) front.push(binding.call);
    }
  }

  // The timer table: each name the description gives, in its place.
  const byName = new Map([...FIXED_TIMERS, ...OPTIONAL_TIMERS].map((t) => [t.name, t]));
  const seen = new Set<string>();
  let redraws = 0;
  let seconds = 0;
  const table = timers.map((name, at): TouchTimer | undefined => {
    if (name === '') return undefined;
    if (seen.has(name)) throw new WiringError(`timer ${JSON.stringify(name)} is in the table twice`);
    seen.add(name);
    const redraw = REDRAW.exec(name);
    if (redraw !== null) {
      if (Number(redraw[1]) !== redraws) throw new WiringError(`timer ${at}, ${name}, is out of order: the redraw timers are numbered in table order`);
      redraws += 1;
      lists.set(name, [{ queue: 'redrawFirst' }, { queue: 'redrawSecond' }, { start: name }]);
      return { name, duration: REDRAW_SECONDS, instruction: { call: name } };
    }
    const fixed = byName.get(name);
    if (fixed === undefined) throw new WiringError(`timer ${at}, ${JSON.stringify(name)}, is none the One's firmware holds`);
    if (name.startsWith('second')) {
      if (name !== `second${seconds}`) throw new WiringError(`timer ${at}, ${name}, is out of order: the one second timers are numbered in table order`);
      seconds += 1;
    }
    const duration = typeof fixed.duration === 'number' ? fixed.duration : settings[fixed.duration] as number;
    return { name, duration: checkRange(`timer ${name}'s duration`, duration, 0xffff), instruction: fixed.instruction };
  });
  const missing = FIXED_TIMERS.filter((t) => !seen.has(t.name)).map((t) => t.name);
  if (missing.length > 0) throw new WiringError(`the timer table holds no ${missing.join(', ')}`);

  const lead: WiringInstruction[] = [{ call: 'start' }];

  // Drop what nothing reaches: the assistant's lists without it.
  const reached = new Set<string>();
  const visit = (ins: WiringInstruction): void => {
    if (!('call' in ins) || reached.has(ins.call)) return;
    reached.add(ins.call);
    const body = lists.get(ins.call);
    if (body === undefined) throw new WiringError(`the catalogue calls ${ins.call}, which it does not state`);
    body.forEach(visit);
  };
  lead.forEach(visit);
  for (const e of entries) for (const ins of e.bindings.values()) visit(ins);
  for (const t of table) if (t !== undefined) visit(t.instruction);
  for (const name of [...lists.keys()]) if (!reached.has(name)) lists.delete(name);
  return { lists, entries, lead, timers: table, front };
}

/** A device's own timer, as `families/four-slot/wiring.ts` carries the Harmony 600, 650 and 700's. */
export type { DeviceTimer };

export interface TouchWiringSpec {
  settings: TouchWiringSettings;
  /** Base slot 10 index of the front's first list, entry 1's binding of `0x23`; three past the start list's on 19 of 19. */
  front: number;
  /**
   * The timer table in order: a firmware timer's name, `FIXED_TIMERS`, a redraw timer's, `redraw0` upward,
   * or `''` for a device's, which `deviceTimers` holds whole at that place. The order is the compile's and
   * differs between them, so it is carried, as `families/four-slot/wiring.ts` carries a device timer's place.
   */
  timers: readonly string[];
  deviceTimers: readonly DeviceTimer[];
  /** What the catalogue names and does not generate, by the names `touchWiringNeeds` lists. */
  lists: Readonly<Record<string, number>>;
  modes: Readonly<Record<string, number>>;
  variables: Readonly<Record<string, number>>;
  maps: Readonly<Record<string, number>>;
  entries: Readonly<Record<string, number>>;
  programs: Readonly<Record<string, number>>;
}

/** The symbols this module generates: the firmware's screens, the front's lists. */
function generatedSymbols(cat: Catalogue, front: number): Symbols {
  const out = emptySymbols();
  TOUCH_FIRMWARE_SCREENS.forEach((name, k) => out.modes.set(name, k));
  cat.front.forEach((name, k) => out.lists.set(name, front + k));
  return out;
}

/**
 * The symbols a description has to supply for these settings and this timer table, by kind: every one the
 * catalogue names and does not generate, the timers' own included. A builder numbering a configuration
 * itself allocates exactly these.
 */
export function touchWiringNeeds(settings: TouchWiringSettings, timers: readonly string[]): Record<Exclude<SymbolKind, 'timers'>, string[]> & { frontLength: number } {
  const cat = catalogue(settings, timers);
  const generated = generatedSymbols(cat, 0);
  const out = { lists: new Set<string>(), modes: new Set<string>(), variables: new Set<string>(), maps: new Set<string>(), entries: new Set<string>(), programs: new Set<string>() };
  const add = (kind: SymbolKind, name: string): void => {
    if (kind === 'timers' || generated[kind].has(name)) return;
    out[kind].add(name);
  };
  const named = (ins: WiringInstruction): void => { for (const [kind, name] of namedBy(ins)) add(kind, name); };
  for (const [name, body] of cat.lists) { add('lists', name); body.forEach(named); }
  cat.lead.forEach(named);
  for (const e of cat.entries) {
    if (typeof e.index === 'string') add('entries', e.index);
    for (const ins of e.bindings.values()) named(ins);
  }
  for (const t of cat.timers) if (t !== undefined) named(t.instruction);
  return {
    lists: [...out.lists], modes: [...out.modes], variables: [...out.variables], maps: [...out.maps],
    entries: [...out.entries], programs: [...out.programs], frontLength: cat.front.length,
  };
}

/**
 * Build the One's wiring from a description, as pieces `withWiring` puts in a layout.
 *
 * Refuses a timer table missing a firmware timer or holding one twice, timers out of their numbering, a
 * device timer whose place the table does not mark, a symbol the description lacks or gives for a generated
 * one, and a value too wide for its field.
 */
export function buildTouchWiring(spec: TouchWiringSpec): BuiltWiring {
  const cat = catalogue(spec.settings, spec.timers);
  const devicePlaces = spec.timers.flatMap((name, at) => (name === '' ? [at] : []));
  const sortedDevice = [...spec.deviceTimers].sort((a, b) => a.at - b.at);
  if (JSON.stringify(sortedDevice.map((t) => t.at)) !== JSON.stringify(devicePlaces)) {
    throw new WiringError(`the device timers sit at ${sortedDevice.map((t) => t.at).join(', ') || 'no place'} and the table marks ${devicePlaces.join(', ') || 'none'}`);
  }
  checkRange('the front', spec.front, 0xffff - cat.front.length);
  const generated = generatedSymbols(cat, spec.front);
  const symbols = emptySymbols();
  for (const kind of SYMBOL_KINDS) for (const [k, v] of generated[kind]) symbols[kind].set(k, v);
  const fill = (kind: SymbolKind, given: Readonly<Record<string, number>>): void => {
    for (const [name, value] of Object.entries(given)) {
      if (generated[kind].has(name)) throw new WiringError(`${kind.slice(0, -1)} ${JSON.stringify(name)} is generated, not described`);
      symbols[kind].set(name, value);
    }
  };
  fill('lists', spec.lists);
  fill('modes', spec.modes);
  fill('variables', spec.variables);
  fill('maps', spec.maps);
  fill('entries', spec.entries);
  fill('programs', spec.programs);
  spec.timers.forEach((name, at) => { if (name !== '') symbols.timers.set(name, at); });

  const described = new Map<ContainerPiece, number[]>();
  const made = (bytes: Uint8Array, owner: string, marks: number[]): ContainerPiece => {
    const p = piece(bytes, owner);
    described.set(p, marks);
    return p;
  };

  const logArea = buildLogArea(ARCHITECTURE);
  described.set(logArea, []);
  const eventMap = made(buildEventMap(TOUCH_FIRMWARE_SCREENS.length, EVENT_COUNT, true), 'slot-4-event', []);
  const lead = encodeList(cat.lead, symbols, generated);
  const leadingList = made(lead.bytes, 'slot-8-list', lead.described);
  const { table: parameterTable, groups } = buildParameterBlock(ARCHITECTURE, TOUCH_PARAMETERS);
  for (const p of [parameterTable, ...groups]) described.set(p, []);

  // Base slot 12. The order is the description's, so what names each firmware timer is read off its
  // duration and its opcode, `describeTouchWiring`: those bytes are marked as the description's.
  let device = 0;
  const timerRecords = cat.timers.map((t) => {
    const w = new Writer(TIMER_RECORD_LENGTH).u8(TIMER_KIND_SCHEDULED);
    if (t === undefined) {
      const one = sortedDevice[device++]!;
      w.u24(checkRange('a device timer\'s duration', one.duration, 0xffffff));
      w.u16(checkRange('an operand', one.instruction.operand, 0xffff)).u8(checkRange('an opcode', one.instruction.opcode, 0xff));
      return made(w.bytes, 'slot-12-record', [1, 2, 3, 4, 5, 6]);
    }
    w.u24(t.duration);
    const e = encode(t.instruction, symbols, generated);
    w.u16(e.operand).u8(e.opcode);
    const marks = [1, 2, 3, ...e.described.map((at) => 4 + at)];
    if (!marks.includes(6)) marks.push(6);
    return made(w.bytes, 'slot-12-record', marks);
  });
  const ttable = new Writer(1 + 3 * timerRecords.length).u8(timerRecords.length);
  for (let k = 0; k < timerRecords.length; k += 1) ttable.u24(0);
  const timerTable = piece(ttable.bytes, 'slot-12-table', timerRecords.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 })));
  described.set(timerTable, []);

  // Base slot 9's entries 0 to 6 and the leftover entry.
  const entries = new Map<number, ContainerPiece>();
  for (const template of cat.entries) {
    const index = typeof template.index === 'number' ? template.index : lookup(symbols, 'entries', template.index);
    const e = encodeEntry(template, symbols, generated);
    const marks = [...e.described];
    // Entry 1's first front list is where the front starts, which the description reads there.
    if (template.index === 1) marks.push(1 + 4 * orderOf(template).indexOf(0x23) + 1, 1 + 4 * orderOf(template).indexOf(0x23) + 2);
    // The leftover entry's form says whether the Remote Assistant is there.
    if (template.index === 'idle') marks.push(0);
    if (entries.has(index)) throw new WiringError(`base slot 9 entry ${index} is built twice`);
    entries.set(index, made(e.bytes, 'slot-9-list', marks));
  }

  // Base slot 10: the front at its generated indices, every other list at the description's.
  const lists = new Map<number, ContainerPiece>();
  const listNames = new Map<number, string>();
  for (const [name, body] of cat.lists) {
    const index = lookup(symbols, 'lists', name);
    const e = encodeList(body, symbols, generated);
    const marks = [...e.described];
    // The ladder's first opcode says whether it opens with `07 FFFB`.
    if (name === 'ladder') marks.push(3);
    if (lists.has(index)) throw new WiringError(`action list ${index} is built twice, as ${listNames.get(index)} and as ${name}`);
    lists.set(index, made(e.bytes, 'slot-10-list', marks));
    listNames.set(index, name);
  }
  return {
    logArea, eventMap, leadingList, parameterTable, parameterGroups: groups, timerTable, timerRecords,
    entries, lists, listNames, frontLength: cat.front.length, described,
  };
}

/**
 * Read a description back off a laid out Harmony One container, `takeApart`'s result.
 *
 * Reads only the bytes `BuiltWiring.described` marks: the symbols the generated structures name and do not
 * generate, each firmware timer's duration and opcode, which name it, a device timer whole, the leftover
 * entry's form and the ladder's first opcode, which are the settings, and where the front starts. The two
 * timers of each pair whose durations do not tell them apart, the screen light's and the five second ones,
 * are told apart by the lists that start them, which the catalogue states.
 */
export function describeTouchWiring(layout: ContainerLayout): TouchWiringSpec {
  if (layout.architecture !== ARCHITECTURE) throw new WiringError(`the One's wiring is read off arch ${ARCHITECTURE}, not arch ${layout.architecture}`);
  const entryPieces = tableTargets(tablePiece(layout, HANDLER_TABLE_SLOT));
  const listPieces = tableTargets(tablePiece(layout, ACTION_LIST_TABLE_SLOT));
  const timerPieces = tableTargets(tablePiece(layout, TIMER_SLOT));
  const leadPiece = tablePiece(layout, BINDING_SLOT);
  if (entryPieces.length < 8) throw new WiringError(`base slot 9 holds ${entryPieces.length} entries, fewer than the eight every One configuration has`);
  // The event map is generated whole, so nothing is read off it: a compile whose base is not the ten
  // firmware screens is refused by the comparison, not here.

  // The timers, by duration and opcode where that tells them apart; the pairs are settled below.
  const deviceTimers: DeviceTimer[] = [];
  const timers: string[] = [];
  const pairs = { light: [] as number[], five: [] as number[] };
  let redraws = 0;
  let seconds = 0;
  timerPieces.forEach((p, at) => {
    const duration = u24(p.bytes, 1);
    const opcode = u8(p.bytes, 6);
    const operand = u16(p.bytes, 4);
    if (opcode >= 0x80) { deviceTimers.push({ at, duration, instruction: { opcode, operand } }); timers.push(''); return; }
    const key = `${opcode === 0x7e ? 'enter' : opcode === 0x7f ? 'call' : `0x${opcode.toString(16)}`} ${duration}`;
    switch (key) {
      case 'enter 1': timers.push(`second${seconds++}`); return;
      case 'enter 5': timers.push('enter5'); return;
      case 'call 1': timers.push('lightsOut'); return;
      case 'call 2': timers.push('lightTick'); return;
      case 'call 3': timers.push('show3'); return;
      case `call ${REDRAW_SECONDS}`: timers.push(`redraw${redraws++}`); return;
      case 'call 5': pairs.five.push(at); timers.push(''); return;
      default:
        if (opcode !== 0x7f) throw new WiringError(`timer ${at} is none the One's firmware holds: ${key} seconds`);
        pairs.light.push(at); timers.push('');
    }
  });
  if (pairs.five.length !== 2 || pairs.light.length !== 2) {
    throw new WiringError(`the timer table holds ${pairs.five.length} five second timers calling a list and ${pairs.light.length} of the screen light's, where the One holds two of each`);
  }
  // Provisionally in table order, which the lists that start them correct.
  timers[pairs.five[0]!] = 'ready5';
  timers[pairs.five[1]!] = 'readyReset';
  timers[pairs.light[0]!] = 'screenLight';
  timers[pairs.light[1]!] = 'screenLightAgain';

  // The settings: the leftover entry is the one entry 1's scan 37 press selects.
  const probe = catalogue({ startupAssistant: true, ladderCancelsTimers: false, screenLight: 0, screenLightAgain: 0 }, timers);
  const entry1 = probe.entries.find((e) => e.index === 1)!;
  const order1 = orderOf(entry1);
  const idle = u8(entryPieces[1]!.bytes, 1 + 4 * order1.indexOf(0xa5) + 1);
  const idlePiece = entryPieces[idle];
  if (idlePiece === undefined) throw new WiringError(`the leftover entry would be base slot 9 entry ${idle}, which the table does not hold`);
  const startupAssistant = u8(idlePiece.bytes, 0) === 0;
  const front = u16(entryPieces[1]!.bytes, 1 + 4 * order1.indexOf(0x23) + 1);
  const start = u16(leadPiece.bytes, 1);
  const boot = u16(listPieces[start]?.bytes ?? new Uint8Array(4), 1);
  const ladderAt = (probe.lists.get('boot') ?? []).findIndex((ins) => 'call' in ins && ins.call === 'ladder');
  const ladder = u16(listPieces[boot]?.bytes ?? new Uint8Array(64), 1 + 3 * ladderAt);
  const ladderPiece = listPieces[ladder];
  if (ladderPiece === undefined) throw new WiringError(`the ladder would be action list ${ladder}, which the table does not hold`);
  const ladderCancelsTimers = startupAssistant && u8(ladderPiece.bytes, 3) === 0x07;
  const settings: TouchWiringSettings = {
    startupAssistant, ladderCancelsTimers,
    screenLight: u24(timerPieces[pairs.light[0]!]!.bytes, 1), screenLightAgain: u24(timerPieces[pairs.light[1]!]!.bytes, 1),
  };

  // `unsure` holds the timers whose names are provisional: their records are not read, and the lists only
  // they reach are left unread rather than refused.
  const read = (names: readonly string[], unsure: ReadonlySet<number>): { symbols: Symbols; cat: Catalogue } => {
    const cat = catalogue(settings, names);
    const generated = generatedSymbols(cat, front);
    const symbols = emptySymbols();
    symbols.entries.set('idle', idle);
    // The timers' own lists and screens, off the records.
    cat.timers.forEach((t, at) => {
      if (t === undefined || unsure.has(at)) return;
      const p = timerPieces[at]!;
      decodeList([t.instruction], new Uint8Array([1, ...p.bytes.slice(4, 7)]), symbols, generated);
    });
    decodeList(cat.lead, leadPiece.bytes, symbols, generated);
    // Lists are found through symbols read before them, so read until nothing new.
    const pending = new Map(cat.lists);
    const entriesPending = [...cat.entries];
    for (let progress = true; progress;) {
      progress = false;
      for (const [name, body] of pending) {
        const index = generated.lists.get(name) ?? symbols.lists.get(name);
        if (index === undefined) continue;
        const p = listPieces[index];
        if (p === undefined) throw new WiringError(`list ${name} would be action list ${index}, which the table does not hold`);
        decodeList(body, p.bytes, symbols, generated);
        pending.delete(name);
        progress = true;
      }
      for (let k = entriesPending.length - 1; k >= 0; k -= 1) {
        const template = entriesPending[k]!;
        const index = typeof template.index === 'number' ? template.index : symbols.entries.get(template.index);
        if (index === undefined) continue;
        decodeEntry(template, entryPieces[index]!.bytes, symbols, generated);
        entriesPending.splice(k, 1);
        progress = true;
      }
    }
    if ((unsure.size === 0 && pending.size > 0) || entriesPending.length > 0) {
      throw new WiringError(`nothing names ${[...pending.keys(), ...entriesPending.map((e) => String(e.index))].join(', ')}`);
    }
    return { symbols, cat };
  };

  // The lists name which of each pair they start: `e1.0x26.5.1` the five second one that is not the
  // reset's, `e1.0x23` the screen light's partner. Read once with the four unread, put right, read again.
  let { symbols } = read(timers, new Set([...pairs.five, ...pairs.light]));
  for (const [name, other] of [['ready5', 'readyReset'], ['screenLightAgain', 'screenLight']] as const) {
    const at = symbols.timers.get(name);
    if (at === undefined) throw new WiringError(`no list starts timer ${name}`);
    if (timers[at] !== name) {
      const was = timers.indexOf(name);
      if (timers[at] !== other) throw new WiringError(`the list starting ${name} starts timer ${at}, which is ${timers[at] || 'a device\'s'}`);
      [timers[at], timers[was]] = [name, other];
    }
  }
  if (timers[pairs.light[0]!] !== 'screenLight') {
    settings.screenLight = u24(timerPieces[timers.indexOf('screenLight')]!.bytes, 1);
    settings.screenLightAgain = u24(timerPieces[timers.indexOf('screenLightAgain')]!.bytes, 1);
  }
  ({ symbols } = read(timers, new Set()));

  const record = (kind: SymbolKind): Record<string, number> => Object.fromEntries(symbols[kind]);
  return {
    settings, front, timers, deviceTimers,
    lists: record('lists'), modes: record('modes'), variables: record('variables'), maps: record('maps'),
    entries: record('entries'), programs: record('programs'),
  };
}

/**
 * The configuration's wiring against the one built from its own description, `compareWiring`: refused with
 * the first difference and the built piece it falls in. The calibration of section 410.
 */
export function checkTouchWiring(c: Container): WiringChecked {
  const layout = takeApart(c);
  return compareWiring(c, layout, buildTouchWiring(describeTouchWiring(layout)));
}
