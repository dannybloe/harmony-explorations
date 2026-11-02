/**
 * What a Harmony Touch is handed about its activities and button maps, measured in the two documents a
 * full sync delivers, `ActivityList` and `MapList`, with `DeviceList` beside them where a closure needs
 * the devices.
 *
 * **The question.** `todo-touch.md` 3.1 asked what the remote does with every field of the activity list
 * and the button maps. The reading of the engine and the screens is `tests/test_harmony_touch_activities.py`,
 * which also holds what the image itself shows; this file measures what the documents hold, so that every
 * rule the reading found is checked against the one account's documents that exist, and so that the
 * reference states the documents' shape from a measurement rather than from Logitech's schema.
 *
 * **The instrument** is `touch-sync-both-ways.test.ts`'s: the full sync of the filled account, recorded
 * through the lab's copy of Harmony Desktop and decoded by `touch-recording.ts`. The documents are the ones
 * the client wrote to the remote in its `proxy/response?write` answers, which that file shows equal, as
 * parsed JSON, to Logitech's web answers. `documents` below shapes the shared `answersWritten` walk of
 * `touch-recording.ts`, the one walk every test of what the remote received goes through, the codec's reader
 * tests among them, by the package's `./test/touch-recording` export.
 *
 * **What was measured, each against the reading it checks.**
 *
 * 1. **Maps are found by identifier, and every identifier is `16417` plus `Device` and the map's device or
 *    `Activity` and the map's activity**, 12 of 12. The engine looks a press up by exactly that string and
 *    does nothing when it is not a loaded map, and 16417 is the screens' own identifier. **One device map
 *    per device and one activity map per activity, and no root map**: 7 device maps whose devices are the
 *    device list's seven, 5 activity maps whose activities are the activity list's five. The engine makes a
 *    root map of its own when the document has none.
 * 2. **A button's action names the device it sends to.** In device maps 387 of 393 buttons name the map's
 *    own device and the other 6 are client actions with no device, the number pad openers; in activity maps
 *    all 250 command actions, short, long and double, name a device among the activity's roles. All 654
 *    command actions name a command their device has, matched case blind as the engine matches. So a map
 *    states its own device or activity twice, once in its identifier and once in a field the engine stores
 *    and never reads, and the device a key sends to is always the action's.
 * 3. **`ButtonState` is one value per map**: 1 on every button of 3 maps and 0 on every button of the other
 *    9. The 3 are exactly the maps that carry `ButtonMapId-` instead of `ButtonMapId`, and `ButtonId` is
 *    nonzero on exactly their 206 buttons. In Logitech's enumeration 0 is `Default` and 1 `Original`. These
 *    are the documents as synced down: the remote writes 1 to 4 itself when it edits a map. As account
 *    history and not as a claim: the three maps are those the setup edited in Logitech's client.
 * 4. **`TextOnRemote` is on exactly the 332 screen entries**, the label the screens show, and it differs
 *    from the action's command on 8 of the 230 that are not number pad entries: 6 are the number pad
 *    openers, client actions labelled `123`, one runs the sequence and one is a relabelled command.
 * 5. **`FunctionGroupType` is 0 on 507 buttons, 2 on 103 and 36 on 6**, the 6 being the openers. 102 of the
 *    103 are screen entries drawn on the number pad and one is a key. In 10 of the 12 maps the number pad
 *    entries and the list entries both count their `IndexInMenu` from 0, so an index names a list entry and
 *    a number pad entry at once and only the group tells them apart. 100 of the 102 number pad entries name
 *    a command the number pad screen places on a key, by name; the other 2 are `Clear`, which it places on
 *    none.
 * 6. **Two device maps repeat a list index**, each once and each with one index missing, so of the two
 *    entries the earlier is overwritten in both the engine's table and the screens' list. **Measured on a
 *    unit**: after this sync, the person at the bench looked for the two overwritten entries on their
 *    devices' screens and found neither. That is one look at one unit, reported by that person and
 *    recorded in `docs/test-notes/harmony-touch.md`; what this file asserts is the structure the look
 *    checked, the repeated positions.
 * 7. **42 long presses, on 32 keys and 10 gestures and on no screen entry**, the keys under ten names and
 *    the gestures under three, and 4 double presses, all on a gesture's tap.
 * 8. **Every gesture action finds its device button by function id**: all 34 gesture actions carry a
 *    function id, and for each the first button with the same `FunctionId-` in the action's device's own map,
 *    in the order the screens list it, names the same command. That is the lookup the gesture screen makes
 *    instead of running the gesture's own entry. Its fallback for an action with no function id, by command
 *    or key name, is not exercised, since no action measured lacks one. The negative: in the first other
 *    device's map the same search finds nothing for 8 of the 34 and the same command for 26, so the match in
 *    the action's own device is not one any map would give.
 * 9. **Gestures: five on each activity map except the one whose activity is of the Custom type**, 20 in all,
 *    and none on a device map. One account; that Logitech's defaults always do this is not checked.
 * 10. **One sequence, on an activity map**: three steps ordered 1, 2, 3, the middle one a
 *    `ButtonDelayAction` whose `Duration` is 1 where the setup entered one second, run by two buttons, a key
 *    and a screen entry; `Sequences` is null on all 7 device maps.
 * 11. **Start and end steps added by hand are stored on the activity**: one activity holds three
 *    `EnterActions`, one of each kind, ordered 4, 5 and 6, the delay's `Duration` 2 where the setup
 *    entered two seconds, and one `LeaveActions` entry ordered 1; the other four activities hold empty
 *    lists. Why the start steps begin at 4 is not known.
 * 12. **Roles**: 17 roles in 13 activity and device pairs, 3 pairs holding two roles; in every pair the
 *    roles agree on both power orders and the selected input, and within each activity no two devices
 *    share a power on order or a power off order. The engine stores a power step under its order as a
 *    table key, so a shared number would lose a step. `NextDevicePowerOnDelay` is null on all 17.
 * 13. **Every selected input names one of its device's inputs**, 11 of 11, which is what the engine needs:
 *    a name that is not one is skipped silently.
 * 14. **`ActivityGroup` is not `Type`**: they differ on 3 of 5 activities, and
 *    `SuggestedDisplay` is the name at position `Type` of Logitech's `ActivityType` enumeration on 5 of 5.
 * 15. **One activity is the tuning default, and it holds one channel changing role**, of 2 in the account.
 * 16. **Every activity carries `Zones`**, which Logitech's `Activity` entity does not list, and 26 fields,
 *    which the entity's 25 and `Zones` make exactly.
 * 17. **The keys are named by 26 names**, the drawing's 27 keypad keys less Off, which the screens handle
 *    themselves, and with the documents' `DVR` for the drawing's `Dvr`.
 *
 * **Width.** One account, one sync, Harmony Desktop 1.0.303, one Touch on firmware 4.15.330. The account
 * held no Sonos, Roku, speaker or home control device and no multi zone activity, so the roles and actions
 * for those are absent and nothing here bears on them. Nothing is a claim about what Logitech's service
 * sends to any other account.
 *
 * **Sources checked first.** `touch-sync-both-ways.test.ts` and `touch-sync.test.ts`;
 * `reference/architectures/harmony-touch/` and `reference/remotes/harmony-touch/`;
 * `reference/logitech/data-model/model.md`, `entities.md` and `model.json` for Logitech's schema, which
 * test 14 and 16 read; the lab's reading of the Touch engine and screens for this step, which is
 * `tests/test_harmony_touch_activities.py`'s header.
 *
 * **The controls.** Each closure was broken once by hand and failed: the identifier prefix changed, an
 * activity's roles emptied, the gesture lookup pointed at the wrong device and then given a wrong command,
 * the input names replaced, the
 * schema's `ActivityType` shifted by one and `Zones` added to the schema's fields.
 *
 * The fixture holds the test account's data, so this file asserts names, counts, structure and equalities,
 * prints no identifier, and skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as lab from '@harmony/lab';
import { answersWritten, commands, records, resource, sessions } from './touch-recording.ts';

const FULL = 'touch_full_sync_recording';
const MODEL = join(import.meta.dirname, '..', '..', '..', 'reference', 'logitech', 'data-model', 'model.json');

/** Logitech's JSON, walked by field name. */
type Json = any;

/** The documents of the `harmony://` answers the client wrote to the remote, by resource name. */
function documents(): Record<string, Json> {
  const out: Record<string, Json> = {};
  const hlapi = sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi');
  // The shared walk gives every answer in order; this test keeps the documents, and a later answer for a
  // resource replaces an earlier one, as in the walk this replaced.
  for (const a of answersWritten(hlapi)) if (a.uri.startsWith('harmony://')) out[resource(a.uri)] = a.resource;
  return out;
}

/** A `__type` without its namespace. */
const kind = (x: Json): string => String(x.__type).split(':')[0]!;

let cache: { activities: Json[]; maps: Json[]; devices: Json[] } | undefined;
function load(): { activities: Json[]; maps: Json[]; devices: Json[] } {
  if (!cache) {
    const d = documents();
    cache = { activities: d.ActivityList.Activities, maps: d.MapList.ButtonMaps, devices: d.DeviceList.DevicesWithFeatures };
  }
  return cache;
}

const deviceMaps = (maps: Json[]): Json[] => maps.filter((m) => kind(m) === 'DeviceButtonMap');
const activityMaps = (maps: Json[]): Json[] => maps.filter((m) => kind(m) === 'ActivityButtonMap');
const buttons = (maps: Json[]): Json[] => maps.flatMap((m) => m.Buttons as Json[]);
const ACTIONS = ['ButtonAction', 'ButtonLongPressAction', 'ButtonDoublePressAction'] as const;
const count = <T>(xs: T[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const x of xs) out[String(x)] = (out[String(x)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort());
};
/** The number pad's group, which the engine keeps apart from the list entries. */
const NUMBER_PAD = 2;
const isListEntry = (b: Json): boolean => kind(b) === 'SoftRemoteButton' && b.FunctionGroupType !== NUMBER_PAD;

/** The identifier the engine looks a map up by, from the map's own fields. */
function expectedIdentifier(m: Json, prefix = '16417'): string {
  return kind(m) === 'DeviceButtonMap' ? `${prefix}Device${m['DeviceId-']}` : `${prefix}Activity${m['ActivityId-']}`;
}

test('every button map is found by 16417 and its device or activity, one per device and per activity, and none is a root map', lab.skipUnless(FULL), () => {
  const { activities, maps, devices } = load();
  assert.deepEqual(count(maps.map(kind)), { ActivityButtonMap: 5, DeviceButtonMap: 7 });
  // Counted rather than compared one by one, so a failure prints no identifier.
  assert.equal(maps.filter((m) => m.ButtonMapIdentifier === expectedIdentifier(m)).length, 12);
  assert.equal(maps.filter((m) => m.ButtonMapIdentifier === expectedIdentifier(m, '16420')).length, 0, 'the negative: the hub identifier matches none');
  const ids = (xs: unknown[]): string => JSON.stringify(xs.map(String).sort());
  assert.ok(ids(deviceMaps(maps).map((m) => m['DeviceId-'])) === ids(devices.map((d) => d.Device['Id-'])), 'the device maps are the devices');
  assert.ok(ids(activityMaps(maps).map((m) => m['ActivityId-'])) === ids(activities.map((a) => a['Id-'])), 'the activity maps are the activities');
});

test('a button sends to the device its action names: the map\'s own in device mode, one of the activity\'s in an activity', lab.skipUnless(FULL), () => {
  const { activities, maps, devices } = load();
  const own = deviceMaps(maps).flatMap((m) => (m.Buttons as Json[]).map((b) => b.ButtonAction['DeviceId-'] === m['DeviceId-'] ? 'own' : kind(b.ButtonAction)));
  assert.deepEqual(count(own), { ButtonClientAction: 6, own: 387 });
  const roles = new Map(activities.map((a) => [a['Id-'], new Set((a.Roles as Json[]).map((r) => r['DeviceId-']))]));
  const commanded = activityMaps(maps).flatMap((m) => (m.Buttons as Json[]).flatMap((b) =>
    ACTIONS.map((k) => b[k]).filter((a) => a && kind(a) === 'ButtonCommandAction').map((a) => roles.get(m['ActivityId-'])!.has(a['DeviceId-']))));
  assert.deepEqual(count(commanded), { true: 250 });
  const named = new Map(devices.map((d) => [d.Device['Id-'], new Set((d.Commands as Json[]).map((c) => String(c.Name).toLowerCase()))]));
  const known = buttons(maps).flatMap((b) => ACTIONS.map((k) => b[k]).filter((a) => a && kind(a) === 'ButtonCommandAction')
    .map((a) => named.get(a['DeviceId-'])!.has(String(a.CommandName).toLowerCase())));
  assert.deepEqual(count(known), { true: 654 });
});

test('ButtonState is one value per map, 1 exactly on the maps that carry ButtonMapId- and a ButtonId on every button', lab.skipUnless(FULL), () => {
  const { maps } = load();
  const perMap = maps.map((m) => {
    const states = new Set((m.Buttons as Json[]).map((b) => b.ButtonState));
    assert.equal(states.size, 1, 'one state per map');
    return { state: [...states][0], carriesId: 'ButtonMapId-' in m, carriesNullId: 'ButtonMapId' in m && m.ButtonMapId === null };
  });
  assert.deepEqual(count(perMap.map((p) => `${p.state} ${p.carriesId} ${p.carriesNullId}`)), { '0 false true': 9, '1 true false': 3 });
  const all = buttons(maps);
  assert.deepEqual(count(all.map((b) => b.ButtonState)), { 0: 410, 1: 206 });
  assert.equal(all.filter((b) => b.ButtonId !== 0).length, 206);
  assert.equal(all.filter((b) => b.ButtonId !== 0 && b.ButtonState === 1).length, 206);
});

test('every screen entry carries TextOnRemote, and outside the number pad it differs from the command on 8 of 230', lab.skipUnless(FULL), () => {
  const all = buttons(load().maps);
  assert.deepEqual(count(all.map(kind)), { GestureRemoteButton: 20, HardRemoteButton: 264, SoftRemoteButton: 332 });
  assert.deepEqual(all.filter((b) => 'TextOnRemote' in b).map(kind), Array<string>(332).fill('SoftRemoteButton'));
  const list = all.filter(isListEntry);
  assert.equal(list.length, 230);
  const differ = list.filter((b) => b.TextOnRemote !== b.ButtonAction.CommandName);
  assert.deepEqual(count(differ.map((b) => kind(b.ButtonAction))), { ButtonClientAction: 6, ButtonCommandAction: 1, ButtonSequenceAction: 1 });
  assert.deepEqual(differ.filter((b) => kind(b.ButtonAction) === 'ButtonClientAction').map((b) => [b.TextOnRemote, b.ButtonAction.ActionName]), Array(6).fill(['123', 'Numpad']));
});

test('number pad entries are group 2, count from 0 beside the list entries, and land on a number pad key by name but for Clear', lab.skipUnless(FULL), () => {
  const { maps } = load();
  const all = buttons(maps);
  assert.deepEqual(count(all.map((b) => b.FunctionGroupType)), { 0: 507, 2: 103, 36: 6 });
  assert.deepEqual(count(all.filter((b) => b.FunctionGroupType === NUMBER_PAD).map(kind)), { HardRemoteButton: 1, SoftRemoteButton: 102 });
  assert.deepEqual(all.filter((b) => b.FunctionGroupType === 36).map((b) => kind(b.ButtonAction)), Array<string>(6).fill('ButtonClientAction'));
  const bothFromZero = maps.filter((m) => {
    const soft = (m.Buttons as Json[]).filter((b) => kind(b) === 'SoftRemoteButton');
    const pad = soft.filter((b) => b.FunctionGroupType === NUMBER_PAD).map((b) => b.MenuItem.IndexInMenu);
    const list = soft.filter((b) => b.FunctionGroupType !== NUMBER_PAD).map((b) => b.MenuItem.IndexInMenu);
    return pad.length > 0 && list.length > 0 && Math.min(...pad) === 0 && Math.min(...list) === 0;
  });
  assert.equal(bothFromZero.length, 10);
  // The number pad screen's own placement: digits by value, four names on the left key, four on the right.
  const placed = new Set(['-', '.', '*', 'NumberPlus', 'Enter', 'NumberEnter', '#', 'ENT']);
  const pad = all.filter((b) => kind(b) === 'SoftRemoteButton' && b.FunctionGroupType === NUMBER_PAD).map((b) => String(b.ButtonAction.CommandName));
  assert.deepEqual(count(pad.map((c) => (/^\d$/.test(c) || placed.has(c) ? 'on a key' : c))), { Clear: 2, 'on a key': 100 });
});

test('two device maps repeat one list index each and miss one, and no activity map repeats one', lab.skipUnless(FULL), () => {
  const shape = load().maps.map((m) => {
    const indexes = (m.Buttons as Json[]).filter((b) => kind(b) === 'SoftRemoteButton' && b.FunctionGroupType !== NUMBER_PAD).map((b) => b.MenuItem.IndexInMenu as number);
    const repeated = Object.values(count(indexes)).filter((n) => n > 1).length;
    const missing = indexes.length === 0 ? 0 : Math.max(...indexes) + 1 - new Set(indexes).size;
    return `${kind(m)} repeated ${repeated} missing ${missing}`;
  });
  assert.deepEqual(count(shape), {
    'ActivityButtonMap repeated 0 missing 0': 5,
    'DeviceButtonMap repeated 0 missing 0': 5,
    'DeviceButtonMap repeated 1 missing 1': 2,
  });
});

test('42 long presses, on ten key names and three gestures and on no screen entry, and 4 double presses, all on a tap', lab.skipUnless(FULL), () => {
  const all = buttons(load().maps);
  assert.deepEqual(count(all.filter((b) => b.ButtonLongPressAction).map(kind)), { GestureRemoteButton: 10, HardRemoteButton: 32 });
  const held = (k: string): string[] => [...new Set(all.filter((b) => b.ButtonLongPressAction && kind(b) === k).map((b) => b.ButtonKey as string))].sort();
  assert.deepEqual(held('HardRemoteButton'), ['ChannelDown', 'ChannelUp', 'FastForward', 'Guide', 'Info', 'Menu', 'PrevChannel', 'Rewind', 'Stop', 'Yellow']);
  assert.deepEqual(held('GestureRemoteButton'), ['SwipeLeft', 'SwipeRight', 'Tap']);
  assert.deepEqual(all.filter((b) => b.ButtonDoublePressAction).map((b) => `${kind(b)} ${b.ButtonKey}`), Array<string>(4).fill('GestureRemoteButton Tap'));
});

/** A device map's buttons in the order the screens list them: everything but list entries, then the list by index. */
function screenOrder(m: Json): Json[] {
  const list = new Map<number, Json>();
  const rest: Json[] = [];
  for (const b of m.Buttons as Json[]) {
    if (kind(b) === 'SoftRemoteButton' && (b.FunctionGroupType === 0 || b.FunctionGroupType === 36)) list.set(b.MenuItem.IndexInMenu, b);
    else rest.push(b);
  }
  return [...rest, ...[...list.keys()].sort((a, b) => a - b).map((k) => list.get(k)!)];
}

test('every gesture action has a function id, and the first button with that id in its own device\'s map names the same command', lab.skipUnless(FULL), () => {
  const { maps } = load();
  const byDevice = new Map(deviceMaps(maps).map((m) => [m['DeviceId-'], screenOrder(m)]));
  const look = (a: Json, device: unknown): string => {
    const hit = byDevice.get(device)!.find((b) => b.ButtonAction && b.ButtonAction['FunctionId-'] === a['FunctionId-']);
    return hit ? (hit.ButtonAction.CommandName === a.CommandName ? 'same command' : 'another command') : 'none';
  };
  const gestures = buttons(maps).filter((b) => kind(b) === 'GestureRemoteButton');
  const actions = gestures.flatMap((b) => ACTIONS.map((k) => b[k]).filter(Boolean));
  assert.equal(actions.filter((a) => a['FunctionId-'] > 0).length, 34);
  assert.deepEqual(count(actions.map((a) => look(a, a['DeviceId-']))), { 'same command': 34 });
  // The negative: in the first other device's map the same search finds nothing for 8 of the 34, so the
  // lookup in the action's own device is not satisfied by any map whatever.
  const others = [...byDevice.keys()];
  const elsewhere = actions.map((a) => look(a, others.find((d) => d !== a['DeviceId-'])));
  assert.deepEqual(count(elsewhere), { none: 8, 'same command': 26 });
});

test('gestures: five on each activity map but the one of the Custom type, and none on a device map', lab.skipUnless(FULL), () => {
  const { activities, maps } = load();
  const type = new Map(activities.map((a) => [a['Id-'], a.Type as number]));
  const custom = 5; // `Custom` in Logitech's `ActivityType`, which test 14 reads out of the schema
  const perMap = maps.map((m) => `${kind(m)} ${kind(m) === 'ActivityButtonMap' && type.get(m['ActivityId-']) === custom ? 'custom' : ''} ${(m.Buttons as Json[]).filter((b) => kind(b) === 'GestureRemoteButton').map((b) => b.ButtonKey).sort().join(',')}`);
  assert.deepEqual(count(perMap), {
    'ActivityButtonMap  SwipeDown,SwipeLeft,SwipeRight,SwipeUp,Tap': 4,
    'ActivityButtonMap custom ': 1,
    'DeviceButtonMap  ': 7,
  });
});

test('one sequence, on an activity map, three steps with a delay in seconds, run by a key and a screen entry', lab.skipUnless(FULL), () => {
  const { maps } = load();
  assert.deepEqual(deviceMaps(maps).map((m) => m.Sequences), Array(7).fill(null));
  const holding = maps.filter((m) => Array.isArray(m.Sequences) && m.Sequences.length > 0);
  assert.equal(holding.length, 1);
  assert.equal(kind(holding[0]), 'ActivityButtonMap');
  const [sequence] = holding[0].Sequences as Json[];
  assert.deepEqual(Object.keys(sequence).sort(), ['Actions', 'Name', 'SequenceId']);
  assert.deepEqual((sequence.Actions as Json[]).map((a) => `${a.Order} ${kind(a)}`), ['1 ButtonCommandAction', '2 ButtonDelayAction', '3 ButtonCommandAction']);
  // The setup entered a one second delay; the engine multiplies Duration by 1000.
  assert.equal(sequence.Actions[1].Duration, 1);
  const runners = (holding[0].Buttons as Json[]).filter((b) => kind(b.ButtonAction) === 'ButtonSequenceAction');
  assert.deepEqual(runners.map(kind).sort(), ['HardRemoteButton', 'SoftRemoteButton']);
  assert.ok(runners.every((b) => b.ButtonAction.SequenceId === sequence.SequenceId), 'both run the one sequence');
  assert.equal(buttons(maps).filter((b) => ACTIONS.some((k) => b[k] && kind(b[k]) === 'ButtonSequenceAction')).length, 2);
});

test('start and end steps added by hand are stored on the activity, ordered from 4, with a delay in seconds', lab.skipUnless(FULL), () => {
  const { activities } = load();
  assert.deepEqual(activities.map((a) => [Array.isArray(a.EnterActions), Array.isArray(a.LeaveActions)]), Array(5).fill([true, true]));
  const steps = activities.filter((a) => a.EnterActions.length > 0 || a.LeaveActions.length > 0);
  assert.equal(steps.length, 1);
  const [one] = steps;
  assert.deepEqual((one.EnterActions as Json[]).map((x) => `${x.ActionOrder} ${kind(x)}`), ['4 CommandActivityAction', '5 DelayActivityAction', '6 ChannelActivityAction']);
  assert.deepEqual((one.LeaveActions as Json[]).map((x) => `${x.ActionOrder} ${kind(x)}`), ['1 CommandActivityAction']);
  // The setup entered a two second delay.
  assert.equal(one.EnterActions[1].Duration, 2);
  assert.ok(!('DeviceId-' in one.EnterActions[1]), 'a delay names no device');
});

test('roles: every activity and device pair agrees on its orders and input, and no two devices of an activity share an order', lab.skipUnless(FULL), () => {
  const { activities } = load();
  const roles = activities.flatMap((a) => (a.Roles as Json[]).map((r) => ({ a, r })));
  assert.equal(roles.length, 17);
  assert.deepEqual(roles.map(({ r }) => r.NextDevicePowerOnDelay), Array(17).fill(null));
  const pairs = new Map<string, Json[]>();
  for (const { a, r } of roles) pairs.set(`${a['Id-']} ${r['DeviceId-']}`, [...(pairs.get(`${a['Id-']} ${r['DeviceId-']}`) ?? []), r]);
  assert.equal(pairs.size, 13);
  assert.equal([...pairs.values()].filter((rs) => rs.length > 1).length, 3);
  const agree = [...pairs.values()].filter((rs) => new Set(rs.map((r) => JSON.stringify([r.PowerOnOrder, r.PowerOffOrder, r.SelectedInput?.Name ?? null]))).size === 1);
  assert.equal(agree.length, 13);
  for (const a of activities) {
    const byDevice = new Map((a.Roles as Json[]).map((r) => [r['DeviceId-'], r]));
    for (const order of ['PowerOnOrder', 'PowerOffOrder']) {
      const numbers = [...byDevice.values()].map((r) => r[order]);
      assert.equal(new Set(numbers).size, numbers.length, `${order} distinct within an activity`);
    }
  }
});

test('every selected input names one of its device\'s inputs', lab.skipUnless(FULL), () => {
  const { activities, devices } = load();
  const inputs = new Map(devices.map((d) => [d.Device['Id-'], new Set((d.DeviceFeatures as Json[])
    .filter((f) => kind(f) === 'InputFeature').flatMap((f) => (f.Inputs ?? []) as Json[]).map((i) => i.InputName))]));
  const selected = activities.flatMap((a) => (a.Roles as Json[]).filter((r) => r.SelectedInput?.Name));
  assert.equal(selected.length, 11);
  assert.deepEqual(count(selected.map((r) => inputs.get(r['DeviceId-'])!.has(r.SelectedInput.Name))), { true: 11 });
});

/** Logitech's schema as the reference recovered it. */
const schema = (): { entities: Record<string, { values: string[]; fields: { name: string }[] }> } => JSON.parse(readFileSync(MODEL, 'utf8'));

test('Type and ActivityGroup differ on 3 of 5 activities, and SuggestedDisplay is the ActivityType name at Type', lab.skipUnless(FULL), () => {
  const { activities } = load();
  const names = schema().entities.ActivityType!.values;
  assert.equal(activities.filter((a) => a.Type !== a.ActivityGroup).length, 3);
  assert.equal(activities.filter((a) => a.SuggestedDisplay === names[a.Type]).length, 5);
  assert.equal(names[5], 'Custom');
});

test('one activity is the tuning default, and it holds one of the two channel changing roles', lab.skipUnless(FULL), () => {
  const { activities } = load();
  const changing = (a: Json): number => (a.Roles as Json[]).filter((r) => kind(r) === 'ChannelChangingActivityRole').length;
  const tuning = activities.filter((a) => a.IsTuningDefault === true);
  assert.equal(tuning.length, 1);
  assert.equal(changing(tuning[0]), 1);
  assert.equal(activities.reduce((n, a) => n + changing(a), 0), 2);
});

test('every activity carries Zones, which Logitech\'s Activity entity does not list, and the entity\'s other 25 fields', lab.skipUnless(FULL), () => {
  const { activities } = load();
  const fields = schema().entities.Activity!.fields.map((f) => f.name);
  assert.equal(fields.length, 25);
  assert.ok(!fields.includes('Zones'));
  for (const a of activities) {
    // The documents mark an identifier with a trailing hyphen; the schema does not.
    assert.deepEqual(Object.keys(a).map((k) => k.replace(/-$/, '')).sort(), [...fields, 'Zones'].sort());
  }
});

test('the keys are named by 26 names: the drawing\'s keypad less Off, with DVR spelt as the documents spell it', lab.skipUnless(FULL), () => {
  const names = new Set(buttons(load().maps).filter((b) => kind(b) === 'HardRemoteButton').map((b) => b.ButtonKey as string));
  assert.deepEqual([...names].sort(), [
    'Blue', 'ChannelDown', 'ChannelUp', 'DVR', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'DirectionUp',
    'Exit', 'FastForward', 'Green', 'Guide', 'Info', 'Menu', 'Pause', 'Play', 'PrevChannel', 'Record', 'Red',
    'Rewind', 'Select', 'Stop', 'VolumeDown', 'VolumeMute', 'VolumeUp', 'Yellow',
  ]);
});
