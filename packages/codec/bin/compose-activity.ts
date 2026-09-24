/**
 * Put an activity into a configuration, keypad map, state transitions, menu row and all.
 *
 *   node packages/codec/bin/compose-activity.ts --in <config> --out <file> --label 'LG kijken' \
 *       --targets 51=1 --keys 3:4809,4:4810,9:4813,19:4811,20:4812 --icon-like 'LG WebOS'
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
  FIRMWARE_STATE_VARIABLE_MAX,
  activityBindings,
  assertQueueFits,
  assertStateTableConsistent,
  composeActivity,
  composeActivityMenuRow,
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

/** The erase block a Harmony One clears in one go, which is what a write is counted in. */
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

const before = parse(new Uint8Array(readFileSync(input)));
const counter = stateVariables(before).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
const wasBindings = activityBindings(before);
process.stdout.write(`${input}: ${before.blob.length} bytes, arch ${before.architecture}, `
  + `${wasBindings.length} activities, counter values 0 to ${counter?.record?.second}, `
  + `idle ${counter?.record?.first}\n`);

// What the arguments name, spelled out, because a wrong variable or a wrong list produces a
// configuration that renders correctly and does the wrong thing, which every refusal here is for.
const lists = before.actionLists() ?? [];
for (const target of targets) {
  const variable = stateVariables(before).find((one) => one.index === target.variable);
  if (variable === undefined) fail(`the config has no state variable ${target.variable}`);
  if (variable.index <= FIRMWARE_STATE_VARIABLE_MAX) {
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

const built = composeActivity(before, { label, targets, keys });
const shown = composeActivityMenuRow(parse(built.bytes), built.label, built.set,
                                     iconLike === undefined ? {} : { iconLike });
// A save is stamped with the moment of saving, base slot 3 and the clock's own state values.
const builtAt = localTimestamp(new Date());
const after = parse(saveEdits(parse(shown.bytes), [], builtAt).bytes);

// Read the result back with the same readers rather than trusting the composition.
const nowBindings = activityBindings(after);
if (nowBindings.length !== wasBindings.length + 1) fail('the activity did not arrive on the menu');
const added = nowBindings.find((one) => one.set === built.set);
if (added === undefined) fail('the new keypad map is bound to nothing');
if (handlerSetRoles(after)[built.set] !== 'activity') fail('the new entry does not read as an activity');
if (added.scan !== shown.scan || added.list !== shown.rowList) {
  fail('the menu row the reader finds is not the one that was composed');
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
  + `entry ${built.set} of ${grown?.addresses.length}, menu row on scan ${shown.scan} of mode `
  + `${shown.menu} page ${shown.page}, running list ${shown.rowList}\n`);
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
for (let at = shorter; at < after.blob.length; at += ERASE_BLOCK) {
  blocks.add(Math.floor(at / ERASE_BLOCK) * ERASE_BLOCK);
}
const first = Math.min(...blocks);
process.stdout.write(`the write would touch ${blocks.size} erase block(s) of `
  + `${ERASE_BLOCK / 1024} KiB, the first at offset 0x${first.toString(16)}, `
  + `${after.blob.length - before.blob.length} bytes longer than the input\n`);

writeFileSync(output, after.blob);
process.stdout.write(`wrote ${output}\n`);
