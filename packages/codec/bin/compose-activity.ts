/**
 * Put an activity into a configuration, keypad map, state transitions, menu row and all.
 *
 *   node packages/codec/bin/compose-activity.ts --in <config> --out <file> --label 'LG kijken' \
 *       --targets 51=1 --keys 3:4809,4:4810,9:4813,19:4811,20:4812 --icon-like 'LG WebOS' \
 *       --pads Power:4808,Mute:4813 --startup-like 'LG WebOS'
 *
 * Or from roles, section 323, the way Logitech's compiler builds one: `--roles volume=3,control=1`
 * names the devices by group, and the keypad is the volume device's three volume keys and the
 * control device's own map for the rest; `--commands 1:Teletext,0:Netflix` names the screen's
 * commands by device group and the label the device's own screen draws them under. Either replaces
 * `--keys` or `--pads`, and giving both of a pair is refused.
 *
 * The counterpart of `compose-device.ts` and the same job for chapter 1: run the composition on a
 * real configuration and print every check somebody should read before the result goes near a
 * remote. `composeActivity` builds what the remote **runs** and `composeActivityMenuRow` builds what
 * **starts** it, and neither is worth anything without the other, so this does both and refuses if
 * either half does not read back.
 *
 * **It reuses what the configuration already has rather than composing anything new to send.** An
 * activity's job is to set devices' state variables and point the keypad at existing action lists,
 * section 273: 424 sends in the corpus are reached through a state transition against 12 written
 * inline. So `--targets` names a device's own power variable and the value to drive it to, and
 * `--keys` names lists the configuration already carries. Nothing here invents an infrared code, and
 * a configuration with no record of a device cannot be given an activity that drives it.
 *
 * **A length change, like `compose-device.ts` and unlike `set-delay.ts`**, so the block count is
 * printed: everything after the first insertion moves and the trailer checksum moves with it.
 *
 * **The activity gets its own two screens**, section 279: the start up screen of `--startup-like`,
 * an existing activity's, and a working screen of its own with `--pads` on it, `label:list` pairs,
 * which may be none. `--no-screen` leaves both out, which is what this produced before and what left
 * the remote on the page that started the activity. **On a Harmony 600, 650 or 700 the start up
 * screen is the activity's own**, section 290, "Starting" and its label, with `--startup-like`
 * choosing whose picture it copies, and the working screen is a device page with "Devices" at the
 * bottom and `--pads` in its corners, four to a page.
 *
 * **Every other device is switched off**, section 280: a real enter list writes every device's
 * power variable, 1 for the devices it uses and 0 for the rest, so the targets are completed with a 0
 * for each device the configuration's all off list names and `--targets` does not.
 * `--leave-others-on` leaves them out, which is what this produced before.
 *
 * **The build timestamp is stamped**, unlike `compose-device.ts`, which deliberately does not. That
 * script's reason was that an exercise should differ from its input only where it says; this one is
 * meant to be written, and an arch 12 (Harmony One) remote reseeds its clock from that stamp at
 * every boot, section 111, so an unstamped save is a wrong clock by exactly its staleness. The rail
 * is in the `writing-a-config` skill.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  ACTION_QUEUE_INSTRUCTIONS,
  ACTIVITY_STATE_NAME,
  firmwareStateVariableMax,
  activityBindings,
  assertQueueFits,
  assertStateTableConsistent,
  activityPowerTargets,
  activityKeysFromRoles,
  activityScreenRows,
  activityScreens,
  caseQueued,
  valueMaps,
  composeActivity,
  composeActivityDeviceList,
  composeActivityMenuRow,
  composeActivityScreen,
  nextActivityValue,
  coverage,
  handlerSetRoles,
  handlerSets,
  localTimestamp,
  parse,
  roundTrip,
  saveEdits,
  stateVariables,
  trailerAgrees,
  worstQueueRun,
} from '../src/index.ts';

/** The erase block a Harmony One, 525 and 650 clear in one go, which is what a write is counted in. */
const ERASE_BLOCK = 0x10000;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const input = argument('in') ?? fail('--in is the container to add to');
const output = argument('out') ?? fail('--out is where the result goes');
const label = argument('label') ?? fail('--label is what the menu row will say');
const targetsArg = argument('targets')
  ?? fail('--targets is variable=value pairs, comma separated, the devices this activity sets up');
const keysArg = argument('keys') ?? '';
// Which existing activity menu row's icon the new row wears, by its drawn label, so a television
// activity gets the television's. Without it the first row's icon is copied, whatever it shows.
const iconLike = argument('icon-like');
const withScreen = !process.argv.includes('--no-screen');
const startupLike = argument('startup-like');
const padsArg = argument('pads') ?? '';

const targets = targetsArg.split(',').map((one) => {
  const [variable, value] = one.split('=');
  if (variable === undefined || value === undefined) fail(`${one} is not variable=value`);
  return { variable: Number(variable), value: Number(value) };
});
const keys = keysArg === '' ? [] : keysArg.split(',').map((one) => {
  const [scan, list] = one.split(':');
  if (scan === undefined || list === undefined) fail(`${one} is not scan:list`);
  return { scan: Number(scan), list: Number(list) };
});

const pads = padsArg === '' ? [] : padsArg.split(',').map((one) => {
  const cut = one.lastIndexOf(':');
  if (cut <= 0) fail(`${one} is not label:list`);
  return { label: one.slice(0, cut), list: Number(one.slice(cut + 1)) };
});

const before = parse(new Uint8Array(readFileSync(input)));

// Section 323: the keypad from roles and the screen from commands, in place of the two lists above.
const rolesArg = argument('roles');
const commandsArg = argument('commands');
if (rolesArg !== undefined && keys.length > 0) fail('--roles builds the keypad, so --keys is not also taken');
if (commandsArg !== undefined && pads.length > 0) fail('--commands builds the screen, so --pads is not also taken');
if (rolesArg !== undefined) {
  const roles = Object.fromEntries(rolesArg.split(',').map((one) => {
    const [role, group] = one.split('=');
    if ((role !== 'volume' && role !== 'control') || group === undefined) fail(`${one} is not volume=<group> or control=<group>`);
    return [role, Number(group)];
  }));
  keys.push(...activityKeysFromRoles(before, roles));
}
if (commandsArg !== undefined) {
  pads.push(...activityScreenRows(before, commandsArg.split(',').map((one) => {
    const cut = one.indexOf(':');
    if (cut <= 0) fail(`${one} is not <group>:<label>`);
    return { group: Number(one.slice(0, cut)), label: one.slice(cut + 1) };
  })));
}
const named = new Set(targets.map((one) => one.variable));
const othersOff = process.argv.includes('--leave-others-on') ? [] : activityPowerTargets(
  before, targets.filter((one) => one.value !== 0).map((one) => one.variable),
).filter((one) => one.value === 0 && !named.has(one.variable));
targets.push(...othersOff);
const counter = stateVariables(before).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
const wasBindings = activityBindings(before);
process.stdout.write(`${input}: ${before.blob.length} bytes, arch ${before.architecture}, `
  + `${new Set(wasBindings.map((one) => one.activity)).size} activities, counter values 0 to ${counter?.record?.second}, `
  + `idle ${counter?.record?.first}\n`);

// What the arguments name, spelled out, because a wrong variable or a wrong list produces a
// configuration that renders correctly and does the wrong thing, which every refusal here is for.
const lists = before.actionLists() ?? [];
for (const target of targets) {
  const variable = stateVariables(before).find((one) => one.index === target.variable);
  if (variable === undefined) fail(`the config has no state variable ${target.variable}`);
  if (variable.index <= firmwareStateVariableMax(before.architecture)) {
    fail(`variable ${target.variable} is one of the firmware's own, which an activity may not write`);
  }
  const transition = variable.record?.values.find((one) => one.to === target.value);
  process.stdout.write(`  sets ${variable.label} to ${target.value}, which runs `
    + `${transition === undefined ? 'NOTHING: no transition states that value' : `list ${transition.operand}`}\n`);
}
for (const key of keys) {
  const list = lists[key.list];
  process.stdout.write(`  binds scan ${key.scan} to list ${key.list}: `
    + `${list === undefined ? 'MISSING' : list.map((one) => `0x${one.opcode.toString(16)}:${one.operand}`).join(' ')}\n`);
}

const screen = withScreen
  ? composeActivityScreen(before, nextActivityValue(before), label, pads,
                          startupLike === undefined ? {} : { startupLike })
  : undefined;
const built = composeActivity(screen === undefined ? before : parse(screen.bytes), {
  label, targets, keys,
  ...(screen === undefined ? {} : {
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode, activeList: screen.activeList,
      startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
      activity: screen.activity,
    },
  }),
});
const shown = composeActivityMenuRow(parse(built.bytes), built.label, built.set,
                                     iconLike === undefined ? {} : { iconLike });
// A save is stamped with the moment of saving, base slot 3 and the clock's own state values.
const builtAt = localTimestamp(new Date());
// On a Harmony 600, 650 or 700 the key under Devices gets the activity's own device list, its devices
// first, section 294; composeActivityScreen pointed it at the idle one, which says "Activities". After
// the menu row, since an activity is found through the row that starts it.
const listed = screen !== undefined && before.architecture === 14
  ? composeActivityDeviceList(parse(shown.bytes), built.activity)
  : undefined;
const after = parse(saveEdits(parse(listed?.bytes ?? shown.bytes), [], builtAt).bytes);

// Read the result back with the same readers rather than trusting the composition.
const nowBindings = activityBindings(after);
// One binding per scan the row answers to: one on a Harmony One, both buttons of a row on a Harmony
// 600, 650 or 700, section 273, each running one of the row lists that were written.
const added = nowBindings.filter((one) => one.set === built.set);
if (added.length === 0) fail('the new keypad map is bound to nothing');
if (nowBindings.length !== wasBindings.length + shown.scans.length) {
  fail(`${nowBindings.length - wasBindings.length} bindings arrived for a row on ${shown.scans.length} scans`);
}
if (handlerSetRoles(after)[built.set] !== 'activity') fail('the new entry does not read as an activity');
const composedLists = new Set(Array.from({ length: shown.rowLists }, (_, k) => shown.rowList + k));
if (added.map((one) => one.scan).sort((a, b) => a - b).join() !== [...shown.scans].sort((a, b) => a - b).join()
    || !added.every((one) => composedLists.has(one.list))) {
  fail('the menu row the reader finds is not the one that was composed');
}
// The Harmony One is read back through the walk from device mode's Activities key; a Harmony 600, 650
// or 700 has no such key, so there each record keyed by the activity is asked for its new case, and the
// working screen's must enter the composed screen.
if (screen !== undefined && after.architecture === 12
    && activityScreens(after)?.screens.get(built.activity) !== screen.mode) {
  fail('the record the remote returns through does not name the composed working screen');
}
if (screen !== undefined && after.architecture === 14) {
  const maps = valueMaps(after) ?? [];
  const caseOf = (map: number): number | undefined =>
    maps[map]?.entries.find(([key]) => key === built.activity)?.[1];
  for (const map of screen.maps ?? []) {
    if (caseOf(map) === undefined) fail(`base slot 14 record ${map} has no case for activity ${built.activity}`);
  }
  const entered = caseOf(screen.map);
  if (entered === undefined || caseQueued(after, entered)?.operand !== screen.mode) {
    fail('the working screen record does not name the composed working screen');
  }
  for (const map of listed?.maps ?? []) {
    const opened = caseOf(map);
    if (opened === undefined || caseQueued(after, opened)?.operand !== listed?.mode) {
      fail(`base slot 14 record ${map} does not open the activity's own device list`);
    }
  }
}
const report = coverage(after);
if (report.accounted !== report.total) {
  fail(`${report.total - report.accounted} byte(s) of the result are claimed by no reader`);
}
if (report.overlaps.length > 0) fail(`${report.overlaps.length} byte range(s) are claimed twice`);
if (!trailerAgrees(after)) fail('the result does not state its own checksum');
if (!roundTrip(after).equal) fail('the emitter does not reproduce the result');
assertQueueFits(after);
assertStateTableConsistent(after);
const worst = worstQueueRun(after);
const grown = handlerSets(after);

process.stdout.write(`stamped ${builtAt}\n`);
process.stdout.write(`${after.blob.length} bytes, activity number ${built.activity}, keypad map `
  + `entry ${built.set} of ${grown?.addresses.length}, menu row on scan ${shown.scans.join(' and ')} of mode `
  + `${shown.menu} page ${shown.page}, running lists ${shown.rowList} to ${shown.rowList + shown.rowLists - 1}\n`);
if (screen !== undefined && after.architecture === 14) {
  process.stdout.write(`working screen mode ${screen.mode}, ${screen.pages} page(s), start up screen mode `
    + `${screen.startupMode}, cases in base slot 14 records ${(screen.maps ?? []).join(', ')}, start sequence `
    + `variable ${screen.startVariable} and flag ${screen.flagVariable}\n`);
  if (listed !== undefined) {
    process.stdout.write(`device list mode ${listed.mode}, copied from ${listed.idleMode}, rows entering device `
      + `modes ${listed.order.join(', ')}, opened by records ${listed.maps.join(', ')}\n`);
  }
} else if (screen !== undefined) {
  process.stdout.write(`working screen mode ${screen.mode}, pads on scans [${screen.scans.join(', ')}], `
    + `Devices key list ${screen.devicesList}, start up screen mode ${screen.startupMode}, `
    + `returned to through base slot 14 record ${screen.map}\n`);
}
process.stdout.write('every byte accounted, no overlap, checksum agrees, emitter round trips, '
  + `all four hops read back, deepest action list ${worst?.peak} of ${ACTION_QUEUE_INSTRUCTIONS} `
  + 'queue slots\n');

// What the write would cost, in the unit a write is actually performed in.
const blocks = new Set<number>();
const shorter = Math.min(before.blob.length, after.blob.length);
for (let at = 0; at < shorter; at += 1) {
  if (before.blob[at] === after.blob[at]) continue;
  const block = Math.floor(at / ERASE_BLOCK) * ERASE_BLOCK;
  blocks.add(block);
  at = block + ERASE_BLOCK - 1;
}
// Every block the growth reaches, counted from the block the shorter one ends in: stepping from
// `shorter` itself misses the last block whenever the tail crosses a boundary, as it did in
// `compose-device.ts`.
for (let block = Math.floor(shorter / ERASE_BLOCK) * ERASE_BLOCK; block < after.blob.length;
  block += ERASE_BLOCK) {
  blocks.add(block);
}
const first = Math.min(...blocks);
process.stdout.write(`the write would touch ${blocks.size} erase block(s) of `
  + `${ERASE_BLOCK / 1024} KiB, the first at offset 0x${first.toString(16)}, `
  + `${after.blob.length - before.blob.length} bytes longer than the input\n`);

writeFileSync(output, after.blob);
process.stdout.write(`wrote ${output}\n`);
