/**
 * **A rule for a Harmony Touch's default button maps, scored exactly against every map the bench setup states**,
 * `src/families/harmony-touch/defaultmaps.ts`. On totals it gives nearly all of them; per map, 4 of the 7 devices and
 * 2 of the 5 activities come out with no difference at all.
 *
 * **The question.** A document for the Harmony Touch is to state only what a person chose over the defaults, as the
 * Harmony One's does, and the Touch's family is to derive the defaults. So the defaults need a rule, and the rule a
 * score: of the keys, long presses, screen entries, gestures and number pad entries the setup states, how many does it
 * give, and what is each one it does not. **The rule does not have to equal Logitech's defaults**, since a person
 * reviews the map in the application; the score says how far it is from them on this sample.
 *
 * **The calibration case.** `packages/corpus/setups/touch-test.json`, whose maps were described from the set
 * Logitech's service built for this account. The test notes, `docs/test-notes/harmony-touch.md`, record that the
 * account was filled partly from `packages/corpus/setups/touch-full.json` and partly by hand in Logitech's client,
 * with sequences, delays, long presses and screen labels among what it holds; `touch-full.json` names the game
 * activity and the sequences among the hand part. **Nothing records which maps the hand part changed**, so a
 * difference below is a rule still missing, an edit, or neither, and its kind says only what is seen. **The
 * instrument** is the rule run on each device's command names, read from the device's entry in the lab's sample of
 * the infrared archive through `deviceRecordOfArchive`, which is where a set built from nothing takes a device's
 * commands from; and for an activity, on the recipe's roles and the devices' own maps as the setup states them, so a
 * device's difference does not count twice; the rule run end to end on its own device maps is scored too.
 *
 * **The populations, each a count of something different.**
 *
 * * **Device mode keys**: each device's 26 keys, 182 places; the setup binds 139 of them (LG TV 25, Denon 20, Blu-ray
 *   21, Plex 25, KPN 24, Xbox 24, Switch none) and 17 of those carry a long press.
 * * **Device screen entries**: 254, the list's entries, the pad opener and the number pad's entries together. Each is
 *   matched by what it sends and its group, then scored on its index and on its label.
 * * **Activity keys**: each activity's 26 keys, 130 places; the setup binds 125 and 15 of those carry a long press.
 * * **Gestures**: five per activity, 25 places; the setup states 20, none on the Custom activity, Switch Box.
 * * **Activity screen entries**: 78, of which 45 are the number pad's and 33 the list's.
 *
 * The rough counts this work was asked to check: "104 of 139 device mode keys send the command named as the key" is
 * the control below, 104 under a case blind match too, so that population is the 139 bindings; "120 of 125 activity
 * keys equal the named device's own map" is the routing rule here before the activity's three changes, 120 of the
 * 125 bindings; "244 of 254 device screen entries are named as the entry" is a count of labels equal to the command,
 * not of a rule, and this test does not hold it.
 *
 * **What it measured, in totals.** Device mode presses 137 of 139, with one key bound that the setup leaves unbound;
 * long presses 15 of 17; screen entries 254 of 254 present, 252 at their index, 253 labelled; activity presses 122 of
 * 125, and long presses 13 of 15 with one the setup does not state, on the setup's own device maps; gestures 20 of 20
 * and the Custom activity's none; the activities' number pads 45 of 45. The 14 places where the rule and the setup
 * differ are listed below with a kind each, beside the 33 entries of the activities' lists, of which the rule states
 * none. **Per map**: the devices with no difference in presses, long presses or screen are 4 of 7, the Blu-ray, the
 * Plex, the KPN and the Switch; the differences sit on the LG TV, the Denon and the Xbox. The activities with no
 * difference in keys, gestures or pad, their list entries aside, are 2 of 5 on the setup's own device maps, Watch TV
 * and Listen to Music, and 1 of 5 end to end, Listen to Music.
 *
 * **Before tuning, and how far the tuning is fitted.** Carried over by key name, `HARD_KEYS`, this project's table for
 * the Harmony 600, 650 and 700 (fitted on twenty devices of their configurations and held against two of Logitech's
 * maps), gives 126 of the 139 presses and binds one key the setup leaves unbound, the Xbox's Exit to Clear; the Touch's
 * table gives 137 and one, the Xbox's Exit to Back. The screen's order with the leads that are not the Xbox's or the
 * Blu-ray's alone (the skip and page commands, which four devices hold between them, though no one command more than
 * three) puts 227 of 254 entries at their index; the full lead list 252, the 25 it adds being the Xbox's and the
 * Blu-ray's, each of those leads resting on that one device. The activities' three changes take the presses from 120
 * to 122, and the long presses from 11 to 13 with the extra ones from 3 to 1. **The module marks every preference the
 * sample exercises on one device, or on none, as a hypothesis.** Seven devices is a small sample, and a rule fitted to
 * it predicts other devices only as far as a second sample shows.
 *
 * **What it does not settle.** Why any difference is there: nothing records which maps were changed by hand, and the
 * person does not remember, so a reason given beside a difference is a reading. Whether Logitech's rule is this rule
 * on any device outside the seven. Anything of an activity's screen list but its pad.
 *
 * **What would falsify it.** A second setup Logitech's service built whose maps the rule misses on keys whose
 * commands this sample already has, or a device whose screen list keeps a command a key takes as its own.
 *
 * **Sources checked first.** `reference/logitech/service.md` and `data-model/model.md` on button maps, which say the
 * service names each device's default map and a save replaces it; `reference/how-a-harmony-works.md`; the Touch's
 * `activities-and-buttons.md`, for the number pad's keys, the gestures on every activity but the Custom one, the
 * repeated index and the roles; Logitech's client as source in the lab, which **derives no default map itself**: it
 * asks the service for them (`GetDefaultButtonMaps`) and resets to them through it, and its one local default rule
 * assigns activities to a remote's activity keys, not commands to keys; the recorded client sessions in the lab,
 * which hold no save of a map, only the operations listing; the Harmony One's and the Harmony 600, 650 and 700's key
 * tables, `devicekeys.ts` and `devicemode.ts`, and the compiled families' activity roles, `compose/activityroles.ts`,
 * whose rule the module calls.
 *
 * **Width**: one setup of seven devices and five activities, on the Harmony Touch alone; a Harmony Touch's firmware
 * reports architecture 17 and Logitech's templates file the Harmony Touch under 18. Nothing here touches a remote, and
 * what needs the archive's sample skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE_SAMPLE, skipWithoutIrArchiveSample } from '@harmony/lab';

import { deviceRecordOfArchive } from '../../../src/families/harmony-touch/archivedevice.ts';
import { archiveAt } from '../../../src/catalogue/catalogue.node.ts';
import { ComposeError } from '../../../src/shared/core.ts';
import { BUTTON_KEYS, GESTURE_KEYS, type OwnButton } from '../../../src/families/harmony-touch/compose.ts';
import {
  activityKeyDevices, defaultActivityGestures, defaultActivityKeys, defaultActivityNumberPad, defaultDeviceEntries,
  defaultDeviceKeys, type DefaultActivity, type DeviceMapView, type DefaultEntry, type TouchKeyRule, SCREEN_LEADS,
  TOUCH_KEY_RULES,
} from '../../../src/families/harmony-touch/defaultmaps.ts';
import { readEarlierTouchSetupFile, type EarlierTouchSetupFile } from '../../../src/families/harmony-touch/earlierform.ts';
import type { SetupButton } from '../../../src/families/harmony-touch/setup.ts';
// Another family's table, for a comparison only: the guard that keeps families apart walks their sources, and tests
// of one family read another's tables beside this one (`wiring-one.test.ts` among them).
import { HARD_KEYS } from '../../../src/families/harmony-600-650-700/devicemode.ts';
import '../../../src/support/resources.node.ts';

const SETUP_FILE = new URL('../../../../corpus/setups/touch-test.json', import.meta.url);
const file = (): EarlierTouchSetupFile => readEarlierTouchSetupFile(JSON.parse(readFileSync(SETUP_FILE, 'utf8')));

/** Each device's command names, from its archive entry, by the name the setup gives the device. */
function commandsOfDevices(f: EarlierTouchSetupFile): Map<string, string[]> {
  const archive = archiveAt(IR_ARCHIVE_SAMPLE!);
  const out = new Map<string, string[]>();
  for (const device of f.devices) {
    const part = f.touch.devices.find((one) => one.device === device.name)!;
    const written = deviceRecordOfArchive(archive, { entry: device.device, id: part.id, protocolIds: f.touch.protocols });
    out.set(device.name, (written.record.Commands ?? []).map((command) => command.Name));
  }
  return out;
}

/** A press as one line of text, so a stated and a derived one compare and a difference reads in the list. */
function said(press: unknown): string {
  if (press === undefined) return 'nothing';
  if (typeof press === 'string') return press;
  const p = press as Record<string, unknown>;
  if (typeof p['command'] === 'string') return `${String(p['device'])}: ${p['command']}`;
  if (typeof p['sequence'] === 'string') return `the sequence ${p['sequence']}`;
  if (typeof p['client'] === 'string') return `the client's ${p['client']}`;
  return JSON.stringify(press);
}

/** One place where the rule and the setup differ. */
interface Difference {
  readonly where: string;
  readonly button: string;
  readonly action: 'press' | 'long press' | 'index' | 'label' | 'entry' | 'gesture' | 'pad';
  readonly stated: string;
  readonly rule: string;
}

/** The score of one map's keys: bound in the setup, given alike, given otherwise or not at all, and given extra. */
interface KeyScore { stated: number; reproduced: number; missed: number; extra: number }

/** Scores one action of a map's 26 keys against the rule's, and records each difference. */
function scoreKeys(
  where: string, action: 'press' | 'long press', stated: (key: string) => unknown, derived: (key: string) => unknown, out: Difference[],
): KeyScore {
  const score: KeyScore = { stated: 0, reproduced: 0, missed: 0, extra: 0 };
  for (const key of BUTTON_KEYS) {
    const s = stated(key);
    const r = derived(key);
    if (s !== undefined) score.stated++;
    if (said(s) === said(r)) {
      if (s !== undefined) score.reproduced++;
      continue;
    }
    if (s === undefined) score.extra++;
    else score.missed++;
    out.push({ where, button: key, action, stated: said(s), rule: said(r) });
  }
  return score;
}

const sum = (scores: readonly KeyScore[]): KeyScore => scores.reduce(
  (a, b) => ({ stated: a.stated + b.stated, reproduced: a.reproduced + b.reproduced, missed: a.missed + b.missed, extra: a.extra + b.extra }),
  { stated: 0, reproduced: 0, missed: 0, extra: 0 },
);
const row = (s: KeyScore): [number, number, number, number] => [s.stated, s.reproduced, s.missed, s.extra];

/** The device keys of the setup, a key's binding by key. */
const keyOf = (buttons: readonly SetupButton[], key: string): SetupButton | undefined => buttons.find((one) => one.key === key);

/** Scores every device's keys under `rules`, press and long press. */
function scoreDevices(f: EarlierTouchSetupFile, commands: Map<string, string[]>, rules: readonly TouchKeyRule[]) {
  const presses: Difference[] = [];
  const longs: Difference[] = [];
  const press: Record<string, [number, number, number, number]> = {};
  const long: Record<string, [number, number, number, number]> = {};
  const all: { press: KeyScore[]; long: KeyScore[] } = { press: [], long: [] };
  for (const part of f.touch.devices) {
    const keys = defaultDeviceKeys(commands.get(part.device)!, rules);
    const p = scoreKeys(part.device, 'press', (key) => keyOf(part.buttons, key)?.press, (key) => keys[key as keyof typeof keys]?.press, presses);
    const l = scoreKeys(part.device, 'long press', (key) => keyOf(part.buttons, key)?.longPress, (key) => keys[key as keyof typeof keys]?.longPress, longs);
    press[part.device] = row(p);
    long[part.device] = row(l);
    all.press.push(p);
    all.long.push(l);
  }
  return { press, long, pressTotal: row(sum(all.press)), longTotal: row(sum(all.long)), presses, longs };
}

/** A difference with the kind this reading gives it; the kind is not compared, it is there to be read in the diff. */
type Kinded = Difference & { readonly kind: string };
const unkinded = (list: readonly Kinded[]): Difference[] => list.map(({ kind: _kind, ...rest }) => rest);

// The kinds, each claiming only what is seen; a comment beside a difference gives a reading where there is one.
const NOT_RECORDED = 'differs, cause not recorded';
const NO_ORDER = 'no order of preferences gives both this and another device\'s binding';
const EQUAL_LONG = 'a long press equal to the press, which the rule leaves out';
const COLLISION = 'Logitech\'s map writes it at the pad\'s right key index in the list\'s group, where another entry is; the rule keeps its own place';

/** The device differences under the tuned rule, kinds included. */
const DEVICE_PRESS_DIFFERENCES: readonly Kinded[] = [
  // A reading that suspects a hand edit: the Denon's Info command is on no key in the setup and still off its screen
  // list, which an Info key sending Info at some point would explain, and ModeJazzClub and ModeMatrix are on it.
  { kind: NOT_RECORDED, where: 'Denon AV Receiver', button: 'Info', action: 'press', stated: 'ModeJazzClub', rule: 'Info' },
  // The Denon has no Red; InputTuner is on its screen list too, as a command no key of the rule takes.
  { kind: NOT_RECORDED, where: 'Denon AV Receiver', button: 'Red', action: 'press', stated: 'InputTuner', rule: 'nothing' },
  // The Xbox has Back and Clear and the setup binds neither to Exit; the Denon's Exit takes Back.
  { kind: NO_ORDER, where: 'Xbox', button: 'Exit', action: 'press', stated: 'nothing', rule: 'Back' },
];
const DEVICE_LONG_DIFFERENCES: readonly Kinded[] = [
  // The LG TV's Menu sends Home and holds Home; on the Denon, the one other device where a long press would equal its
  // press, the setup states none on three keys. The rule follows the Denon, a hypothesis.
  { kind: EQUAL_LONG, where: 'LG TV', button: 'Menu', action: 'long press', stated: 'Home', rule: 'nothing' },
  { kind: NOT_RECORDED, where: 'Denon AV Receiver', button: 'Info', action: 'long press', stated: 'ModeMatrix', rule: 'nothing' },
];
const SCREEN_DIFFERENCES: readonly Kinded[] = [
  { kind: COLLISION, where: 'LG TV', button: '-', action: 'index', stated: '11', rule: '5' },
  // The Play a Game activity's pad labels the same command NumberPlus, the rule's label.
  { kind: NOT_RECORDED, where: 'Xbox', button: '.', action: 'label', stated: '.', rule: 'NumberPlus' },
  { kind: COLLISION, where: 'Xbox', button: '#', action: 'index', stated: '11', rule: '16' },
];

test('device mode: the rule gives 137 of the 139 key presses and binds one key the setup leaves unbound, and 15 of the 17 long presses', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const s = scoreDevices(f, commandsOfDevices(f), TOUCH_KEY_RULES);
  // [bound in the setup, reproduced, missed, bound by the rule where the setup leaves the key unbound]
  assert.deepEqual(s.press, {
    'LG TV': [25, 25, 0, 0], 'Denon AV Receiver': [20, 18, 2, 0], 'Blu-ray': [21, 21, 0, 0], Plex: [25, 25, 0, 0],
    KPN: [24, 24, 0, 0], Xbox: [24, 24, 0, 1], Switch: [0, 0, 0, 0],
  });
  assert.deepEqual(s.pressTotal, [139, 137, 2, 1]);
  assert.deepEqual(s.long, {
    'LG TV': [2, 1, 1, 0], 'Denon AV Receiver': [3, 2, 1, 0], 'Blu-ray': [3, 3, 0, 0], Plex: [2, 2, 0, 0],
    KPN: [2, 2, 0, 0], Xbox: [5, 5, 0, 0], Switch: [0, 0, 0, 0],
  });
  assert.deepEqual(s.longTotal, [17, 15, 2, 0]);
  assert.deepEqual(s.presses, unkinded(DEVICE_PRESS_DIFFERENCES));
  assert.deepEqual(s.longs, unkinded(DEVICE_LONG_DIFFERENCES));
});

test('before tuning: the Harmony 600, 650 and 700\'s key table carried over by name gives 126 of the 139 presses and binds the Xbox\'s Exit to Clear', skipWithoutIrArchiveSample(), () => {
  // That table names a key as printed; these are the Touch's names for the same keys. It has no DVR key, so DVR
  // takes the command named as it, and no long press, and every preference counts as the key's own.
  const TOUCH_NAME: Readonly<Record<string, string>> = {
    'Volume up': 'VolumeUp', 'Volume down': 'VolumeDown', Mute: 'VolumeMute', 'Fast forward': 'FastForward',
    'Channel up': 'ChannelUp', 'Channel down': 'ChannelDown', Right: 'DirectionRight', Left: 'DirectionLeft',
    Up: 'DirectionUp', Down: 'DirectionDown', 'Previous channel': 'PrevChannel',
  };
  const carried: TouchKeyRule[] = [];
  for (const key of BUTTON_KEYS) {
    const theirs = HARD_KEYS.find((one) => (TOUCH_NAME[one.button] ?? one.button) === key);
    carried.push({ key, own: theirs?.prefer ?? [key] });
  }
  const f = file();
  const s = scoreDevices(f, commandsOfDevices(f), carried);
  assert.deepEqual(s.press, {
    'LG TV': [25, 25, 0, 0], 'Denon AV Receiver': [20, 13, 7, 0], 'Blu-ray': [21, 21, 0, 0], Plex: [25, 24, 1, 0],
    KPN: [24, 24, 0, 0], Xbox: [24, 19, 5, 1], Switch: [0, 0, 0, 0],
  });
  assert.deepEqual(s.pressTotal, [139, 126, 13, 1]);
  // The one key it binds that the setup leaves unbound, and the command.
  assert.deepEqual(s.presses.filter((d) => d.stated === 'nothing'), [{ where: 'Xbox', button: 'Exit', action: 'press', stated: 'nothing', rule: 'Clear' }]);
});

test('the control: every key sending only the command named as the key gives 104 of the 139 presses, and no long press', skipWithoutIrArchiveSample(), () => {
  const byName: TouchKeyRule[] = BUTTON_KEYS.map((key) => ({ key, own: [key] }));
  const f = file();
  const s = scoreDevices(f, commandsOfDevices(f), byName);
  assert.deepEqual(s.press, {
    'LG TV': [25, 21, 4, 0], 'Denon AV Receiver': [20, 8, 12, 0], 'Blu-ray': [21, 15, 6, 0], Plex: [25, 22, 3, 0],
    KPN: [24, 22, 2, 0], Xbox: [24, 16, 8, 0], Switch: [0, 0, 0, 0],
  });
  assert.deepEqual(s.pressTotal, [139, 104, 35, 0]);
  assert.deepEqual(s.longTotal, [17, 0, 17, 0]);
});

/** Scores each device's screen entries: present, at their index, with their label; and what each differs in. */
function scoreScreens(f: EarlierTouchSetupFile, commands: Map<string, string[]>, rules: Parameters<typeof defaultDeviceEntries>[1]) {
  const per: Record<string, [number, number, number, number, number]> = {};
  const differences: Difference[] = [];
  for (const part of f.touch.devices) {
    const derived = defaultDeviceEntries(commands.get(part.device)!, rules);
    const stated = part.buttons.filter((one) => one.entry !== undefined);
    const ident = (e: { press: unknown; group?: number }): string => `${e.group ?? 0} ${said(e.press)}`;
    const byIdent = new Map<string, DefaultEntry>(derived.map((e) => [ident(e), e]));
    let present = 0;
    let placed = 0;
    let labelled = 0;
    for (const e of stated) {
      const r = byIdent.get(ident(e));
      if (r === undefined) {
        differences.push({ where: part.device, button: e.entry!, action: 'entry', stated: `index ${e.index}`, rule: 'nothing' });
        continue;
      }
      present++;
      if (r.index === e.index) placed++;
      else differences.push({ where: part.device, button: e.entry!, action: 'index', stated: String(e.index), rule: String(r.index) });
      if (r.entry === e.entry) labelled++;
      else differences.push({ where: part.device, button: e.entry!, action: 'label', stated: e.entry!, rule: r.entry });
    }
    const statedIdents = new Set(stated.map(ident));
    const extra = derived.filter((e) => !statedIdents.has(ident(e))).length;
    per[part.device] = [stated.length, present, placed, labelled, extra];
  }
  const total = Object.values(per).reduce((a, b) => a.map((x, k) => x + b[k]!) as typeof a, [0, 0, 0, 0, 0]);
  return { per, total, differences };
}

test('device screens: the rule gives all 254 entries, 252 at their index and 253 with their label, and no entry the setup does not state', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const s = scoreScreens(f, commandsOfDevices(f), {});
  // [stated, present in the rule's, at the same index, with the same label, the rule's entries the setup lacks]
  assert.deepEqual(s.per, {
    'LG TV': [39, 39, 38, 39, 0], 'Denon AV Receiver': [105, 105, 105, 105, 0], 'Blu-ray': [14, 14, 14, 14, 0],
    Plex: [36, 36, 36, 36, 0], KPN: [15, 15, 15, 15, 0], Xbox: [34, 34, 33, 33, 0], Switch: [11, 11, 11, 11, 0],
  });
  assert.deepEqual(s.total, [254, 254, 252, 253, 0]);
  assert.deepEqual(s.differences, unkinded(SCREEN_DIFFERENCES));
  // Advance and Audio among the leads change nothing on this sample: the sorted order puts each where it leads.
  const without = SCREEN_LEADS.filter((name) => name !== 'Advance' && name !== 'Audio');
  assert.equal(without.length, SCREEN_LEADS.length - 2);
  assert.deepEqual(scoreScreens(f, commandsOfDevices(f), { leads: without }).total, [254, 254, 252, 253, 0]);
});

test('per map: 4 of the 7 devices come out with no difference in presses, long presses or screen', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const commands = commandsOfDevices(f);
  const keys = scoreDevices(f, commands, TOUCH_KEY_RULES);
  const screens = scoreScreens(f, commands, {});
  const differing = new Set([...keys.presses, ...keys.longs, ...screens.differences].map((d) => d.where));
  assert.deepEqual(f.touch.devices.map((one) => one.device).filter((name) => !differing.has(name)), ['Blu-ray', 'Plex', 'KPN', 'Switch']);
  assert.deepEqual([...differing].sort(), ['Denon AV Receiver', 'LG TV', 'Xbox']);
});

test('the control: taking a key\'s fallback off the screen list as well loses 11 of the 254 entries and leaves 82 at their index, against 252', skipWithoutIrArchiveSample(), () => {
  // The module keeps a command a key takes as a fallback on the list; this rule makes every fallback one of the
  // key's own, so it leaves the list, and with it a long press of the same name (Home, SkipBack, SkipForward held).
  const noFallback: TouchKeyRule[] = TOUCH_KEY_RULES.map((rule) => ({
    key: rule.key, own: [...rule.own, ...(rule.fallback ?? [])], ...(rule.long === undefined ? {} : { long: rule.long }),
  }));
  const f = file();
  const s = scoreScreens(f, commandsOfDevices(f), { keys: noFallback });
  assert.deepEqual(s.per, {
    'LG TV': [39, 38, 11, 38, 0], 'Denon AV Receiver': [105, 103, 14, 103, 0], 'Blu-ray': [14, 13, 0, 13, 0],
    Plex: [36, 35, 15, 35, 0], KPN: [15, 15, 15, 15, 0], Xbox: [34, 28, 16, 27, 0], Switch: [11, 11, 11, 11, 0],
  });
  assert.deepEqual(s.total, [254, 243, 82, 242, 0]);
  // The eleven gone, each list's later entries moving up one place for each.
  assert.deepEqual(s.differences.filter((d) => d.action === 'entry').map((d) => `${d.where} ${d.button}`), [
    'LG TV Home', 'Denon AV Receiver SkipBack', 'Denon AV Receiver SkipForward', 'Blu-ray Home', 'Plex SkipForward',
    'Xbox SkipBack', 'Xbox SkipForward', 'Xbox Y', 'Xbox B', 'Xbox X', 'Xbox A',
  ]);
});

test('before tuning the screen\'s order: without the leads only the Xbox or the Blu-ray holds, 227 of the 254 entries are at their index', skipWithoutIrArchiveSample(), () => {
  // What is left of the leads: the skip and page commands that the Denon, the Plex, the KPN and the Xbox hold between
  // them, SkipBack, SkipBackward, Replay, SkipForward, Advance, PageUp and PageDown, and the Blu-ray's ChapterPrev and
  // ChapterNext, kept because they are the same job on a fifth device. Out go Clear and everything after PageDown, which
  // the Xbox alone or the Blu-ray alone holds. The power commands are not leads but a list of their own, kept here.
  const kept = ['ChapterPrev', 'SkipBack', 'SkipBackward', 'Replay', 'ChapterNext', 'SkipForward', 'Advance', 'PageUp', 'PageDown'];
  const f = file();
  const s = scoreScreens(f, commandsOfDevices(f), { leads: kept });
  assert.deepEqual(s.per, {
    'LG TV': [39, 39, 38, 39, 0], 'Denon AV Receiver': [105, 105, 105, 105, 0], 'Blu-ray': [14, 14, 7, 14, 0],
    Plex: [36, 36, 36, 36, 0], KPN: [15, 15, 15, 15, 0], Xbox: [34, 34, 15, 33, 0], Switch: [11, 11, 11, 11, 0],
  });
  assert.deepEqual(s.total, [254, 254, 227, 253, 0]);
});

/** The setup's own map of a device, as an activity reads it. */
function statedView(f: EarlierTouchSetupFile, commands: Map<string, string[]>, device: string): DeviceMapView {
  const part = f.touch.devices.find((one) => one.device === device)!;
  const keys: Record<string, { press: string; longPress?: string }> = {};
  for (const b of part.buttons) {
    if (b.key === undefined || typeof b.press !== 'string') continue;
    keys[b.key] = typeof b.longPress === 'string' ? { press: b.press, longPress: b.longPress } : { press: b.press };
  }
  const pad = part.buttons.filter((b) => b.group === 2 && b.entry !== undefined && typeof b.press === 'string')
    .map((b) => ({ entry: b.entry!, index: b.index!, group: 2, press: b.press as string }));
  return { commands: commands.get(device)!, keys, pad };
}

/** The rule's own map of a device, as an activity reads it. */
function derivedView(commands: Map<string, string[]>, device: string): DeviceMapView {
  const names = commands.get(device)!;
  return { commands: names, keys: defaultDeviceKeys(names), pad: defaultDeviceEntries(names).filter((e) => e.group === 2) };
}

/** Scores every activity's keys, gestures and pad with its devices' maps from `mapOf`. */
function scoreActivities(f: EarlierTouchSetupFile, mapOf: (device: string) => DeviceMapView, changes?: Parameters<typeof defaultActivityKeys>[2]) {
  const presses: Difference[] = [];
  const longs: Difference[] = [];
  const others: Difference[] = [];
  const press: Record<string, [number, number, number, number]> = {};
  const long: Record<string, [number, number, number, number]> = {};
  const gesture: Record<string, [number, number]> = {};
  const pad: Record<string, [number, number, number]> = {};
  const list: Record<string, number> = {};
  const all: { press: KeyScore[]; long: KeyScore[] } = { press: [], long: [] };
  for (const part of f.touch.activities) {
    const recipe = f.activities.find((one) => one.name === part.activity)!;
    const activity: DefaultActivity = { type: recipe.type, devices: recipe.devices };
    const keys = defaultActivityKeys(activity, mapOf, changes);
    const key = (k: string): OwnButton | undefined => part.buttons.find((one) => one.key === k);
    const p = scoreKeys(part.activity, 'press', (k) => key(k)?.press, (k) => keys[k as keyof typeof keys]?.press, presses);
    const l = scoreKeys(part.activity, 'long press', (k) => key(k)?.longPress, (k) => keys[k as keyof typeof keys]?.longPress, longs);
    press[part.activity] = row(p);
    long[part.activity] = row(l);
    all.press.push(p);
    all.long.push(l);

    // A gesture is scored whole, its three actions together, over the five places of every activity.
    const derived = defaultActivityGestures(activity, mapOf);
    let stated = 0;
    let alike = 0;
    for (const g of GESTURE_KEYS) {
      const s = part.buttons.find((one) => one.gesture === g);
      const r = derived[g];
      if (s !== undefined) stated++;
      const whole = (b: { press?: unknown; longPress?: unknown; doublePress?: unknown } | undefined): string =>
        b === undefined ? 'nothing' : `${said(b.press)}, held ${said(b.longPress)}, twice ${said(b.doublePress)}`;
      if (whole(s) === whole(r)) alike++;
      else others.push({ where: part.activity, button: g, action: 'gesture', stated: whole(s), rule: whole(r) });
    }
    gesture[part.activity] = [stated, alike];

    // The pad's entries by place: [stated, given alike with label and command, given where the setup has none].
    const derivedPad = defaultActivityNumberPad(activity, mapOf);
    const statedPad = part.buttons.filter((one) => one.group === 2 && one.entry !== undefined);
    const sameAs = (e: OwnButton) => derivedPad.some((r) => r.index === e.index && r.entry === e.entry && said(r.press) === said(e.press));
    for (const e of statedPad) if (!sameAs(e)) others.push({ where: part.activity, button: e.entry!, action: 'pad', stated: said(e.press), rule: 'otherwise' });
    const extra = derivedPad.filter((r) => !statedPad.some((e) => e.index === r.index));
    for (const r of extra) others.push({ where: part.activity, button: r.entry, action: 'pad', stated: 'nothing', rule: said(r.press) });
    pad[part.activity] = [statedPad.length, statedPad.filter(sameAs).length, extra.length];
    // The list's entries, which the rule states none of.
    list[part.activity] = part.buttons.filter((one) => one.entry !== undefined && one.group !== 2).length;
  }
  return { press, long, pressTotal: row(sum(all.press)), longTotal: row(sum(all.long)), gesture, pad, list, presses, longs, others };
}

/** The activity differences on the setup's own device maps, kinds included. */
const ACTIVITY_PRESS_DIFFERENCES: readonly Kinded[] = [
  { kind: NOT_RECORDED, where: 'Watch a Blu-ray', button: 'Guide', action: 'press', stated: 'Blu-ray: TopMenu', rule: 'Blu-ray: Select' },
  // A sequence the rule makes none of; the test notes name sequences among what the account was filled with by hand.
  { kind: NOT_RECORDED, where: 'Watch a Blu-ray', button: 'Yellow', action: 'press', stated: 'the sequence Test Sequence', rule: 'Blu-ray: Yellow' },
  // The Xbox's own map in the setup leaves Exit unbound; the activity's key sends Clear, in the pad's group.
  { kind: NOT_RECORDED, where: 'Play a Game', button: 'Exit', action: 'press', stated: 'Xbox: Clear', rule: 'nothing' },
];
const ACTIVITY_LONG_DIFFERENCES: readonly Kinded[] = [
  { kind: NOT_RECORDED, where: 'Watch a Blu-ray', button: 'Guide', action: 'long press', stated: 'Blu-ray: Subtitle', rule: 'nothing' },
  { kind: NOT_RECORDED, where: 'Watch a Blu-ray', button: 'Yellow', action: 'long press', stated: 'Blu-ray: Yellow', rule: 'nothing' },
  // The KPN's own map holds Advance on Fast forward and Replay on Rewind; the activity keeps Replay and holds nothing
  // on Fast forward.
  { kind: NOT_RECORDED, where: 'Switch Box', button: 'FastForward', action: 'long press', stated: 'nothing', rule: 'KPN: Advance' },
];

test('activities on the setup\'s own device maps: 122 of the 125 key presses and 13 of the 15 long presses, every gesture and every pad entry', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const commands = commandsOfDevices(f);
  const s = scoreActivities(f, (device) => statedView(f, commands, device));
  assert.deepEqual(s.press, {
    'Watch TV': [25, 25, 0, 0], 'Watch a Blu-ray': [24, 22, 2, 0], 'Listen to Music': [25, 25, 0, 0],
    'Switch Box': [26, 26, 0, 0], 'Play a Game': [25, 24, 1, 0],
  });
  assert.deepEqual(s.pressTotal, [125, 122, 3, 0]);
  assert.deepEqual(s.long, {
    'Watch TV': [2, 2, 0, 0], 'Watch a Blu-ray': [6, 4, 2, 0], 'Listen to Music': [2, 2, 0, 0],
    'Switch Box': [1, 1, 0, 1], 'Play a Game': [4, 4, 0, 0],
  });
  assert.deepEqual(s.longTotal, [15, 13, 2, 1]);
  // [stated, given alike] over the five gestures of each; Switch Box, of the Custom type, has none and is given none.
  assert.deepEqual(s.gesture, {
    'Watch TV': [5, 5], 'Watch a Blu-ray': [5, 5], 'Listen to Music': [5, 5], 'Switch Box': [0, 5], 'Play a Game': [5, 5],
  });
  // [stated, given alike, given where the setup has none]
  assert.deepEqual(s.pad, {
    'Watch TV': [11, 11, 0], 'Watch a Blu-ray': [0, 0, 0], 'Listen to Music': [12, 12, 0], 'Switch Box': [11, 11, 0],
    'Play a Game': [11, 11, 0],
  });
  assert.deepEqual(s.others, []);
  // The list entries outside the pad, 33, which the rule states none of.
  assert.deepEqual(s.list, { 'Watch TV': 4, 'Watch a Blu-ray': 9, 'Listen to Music': 1, 'Switch Box': 6, 'Play a Game': 13 });
  assert.deepEqual(s.presses, unkinded(ACTIVITY_PRESS_DIFFERENCES));
  assert.deepEqual(s.longs, unkinded(ACTIVITY_LONG_DIFFERENCES));
  // Per map, the list entries aside: 2 of the 5 activities with no difference.
  const differing = new Set([...s.presses, ...s.longs, ...s.others].map((d) => d.where));
  assert.deepEqual(f.touch.activities.map((one) => one.activity).filter((name) => !differing.has(name)), ['Watch TV', 'Listen to Music']);
});

test('before tuning the activities: routing by role alone gives 120 of the 125 presses and 11 of the 15 long presses with 3 extra', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const commands = commandsOfDevices(f);
  const s = scoreActivities(f, (device) => statedView(f, commands, device), []);
  assert.deepEqual(s.pressTotal, [125, 120, 5, 0]);
  assert.deepEqual(s.longTotal, [15, 11, 4, 3]);
});

test('activities end to end on the rule\'s own device maps: two device mode differences carry over, the LG TV\'s Menu long press and the Xbox\'s Exit, and nothing else changes', skipWithoutIrArchiveSample(), () => {
  const f = file();
  const commands = commandsOfDevices(f);
  const s = scoreActivities(f, (device) => derivedView(commands, device));
  assert.deepEqual(s.pressTotal, [125, 122, 3, 0]);
  assert.deepEqual(s.longTotal, [15, 12, 3, 1]);
  // Every difference, whole: the list on the setup's own device maps with Play a Game's Exit now Back, from the rule's
  // Xbox Exit, and Watch TV's Menu long press added, which is the LG TV's own difference again and not a second one.
  assert.deepEqual(s.presses, [
    ...unkinded(ACTIVITY_PRESS_DIFFERENCES).filter((d) => d.where !== 'Play a Game'),
    { where: 'Play a Game', button: 'Exit', action: 'press', stated: 'Xbox: Clear', rule: 'Xbox: Back' },
  ]);
  assert.deepEqual(s.longs, [
    { where: 'Watch TV', button: 'Menu', action: 'long press', stated: 'LG TV: Home', rule: 'nothing' },
    ...unkinded(ACTIVITY_LONG_DIFFERENCES),
  ]);
  assert.deepEqual(s.others, []);
  const differing = new Set([...s.presses, ...s.longs, ...s.others].map((d) => d.where));
  assert.deepEqual(f.touch.activities.map((one) => one.activity).filter((name) => !differing.has(name)), ['Listen to Music']);
});

test('the routing refuses two devices holding the volume role, as the compiled families\' rule does, and passes one', () => {
  const two: DefaultActivity = { type: 'WatchTV', devices: [{ device: 'A', roles: ['Volume'] }, { device: 'B', roles: ['Volume', 'ChannelChanging'] }] };
  assert.throws(() => activityKeyDevices(two), (error: unknown) => error instanceof ComposeError && /devices A and B both hold Volume/.test(error.message));
  const one: DefaultActivity = { type: 'WatchTV', devices: [{ device: 'A', roles: ['Volume'] }, { device: 'B', roles: ['PlayMovie'] }] };
  assert.deepEqual(activityKeyDevices(one), { volume: 'A', control: 'B' });
});

test('the control: a device with no commands gets no key, no screen entry, and gives an activity nothing', () => {
  assert.deepEqual(defaultDeviceKeys([]), {});
  assert.deepEqual(defaultDeviceEntries([]), []);
  const empty: DeviceMapView = { commands: [], keys: {}, pad: [] };
  const activity: DefaultActivity = { type: 'WatchTV', devices: [{ device: 'A', roles: ['Display', 'ChannelChanging', 'Volume'] }] };
  assert.deepEqual(defaultActivityKeys(activity, () => empty), {});
  assert.deepEqual(defaultActivityGestures(activity, () => empty), {});
  assert.deepEqual(defaultActivityNumberPad(activity, () => empty), []);
  // And the live half: one command named as a key gives that key, and the screen nothing, since a key takes it.
  assert.deepEqual(defaultDeviceKeys(['Play']), { Play: { press: 'Play' } });
  assert.deepEqual(defaultDeviceEntries(['Play']), []);
});
