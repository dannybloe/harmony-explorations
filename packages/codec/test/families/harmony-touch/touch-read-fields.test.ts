/**
 * **Every field of version 2 the table says a Harmony Touch's build reads changes what it builds**, decision 43.
 *
 * **Why.** `VERSION_TWO` in `recipe/recipe.ts` says per field, and per part of a field, which kind of family's build
 * reads it, and the guard lets through what it says the Touch reads. A row marked read that the Touch's composer in fact
 * passes over would be a person's choice dropped without a word, which is what the guard exists to stop, and nothing
 * else would see it: the guard passes it, the check lists nothing and the documents build.
 *
 * **The instrument.** The reference document, `test/references/touch-test.json`, built through the one build an
 * application calls, against itself with one field or one member changed. Each case says which row of the table it
 * states and what the table says of the part it states, and the test asks the table, `versionTwoFields`, rather than
 * believing the case:
 *
 * * **read**: the part is read by the Touch's kind of family, and the six documents differ from the reference's;
 * * **not read**: the part is read by no kind the Touch is, and the build refuses as not built, naming the part and the
 *   requirement the table gives it; this is the control, that a change the table does not mark read is stopped rather
 *   than built and found equal;
 * * **none**: the part waits on no requirement, `highestIds`, and the documents are the reference's.
 *
 * **Walked from the table.** Every row of `VERSION_TWO` has a case, and every case names a row, so a row added to the
 * table fails here until it has one. A device's timing and power are read member by member, so the members the table
 * marks read are found by asking the table of each member alone and must be exactly the members with a read case; a
 * channel tuning is read whole, so each of its five members has a case of its own.
 *
 * **Three cases take care**, each because a rule of the build stands in front of the field: a hold on the favourites
 * given to a second activity alone is refused by the rule that one activity holds them, so the case moves the hold and
 * the opening screens with it; a sequence needs an id, the toolkit's form; and a double press exists only on a gesture,
 * so the activity's case is a swipe.
 *
 * **What it does not settle.** That the change reaches the remote as the person meant: this says the documents differ,
 * not how. Which documents and fields each change moves is the composer's tests'. **Width**: the Harmony Touch alone,
 * whose firmware reports architecture 17 and Logitech's templates file it under 18; no compiled family reads a field of
 * version 2, which `unbuilt-fields.test.ts` holds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildFromRecipe, NotBuiltError } from '../../../src/node.ts';
import { readRecipe, VERSION_TWO, versionTwoFields } from '../../../src/recipe/recipe.ts';

type Json = any;

const REFERENCES = new URL('../../references/', import.meta.url);
const BUILT_AT = '2026-11-09T12:00:00';
const ACCOUNT = JSON.parse(readFileSync(new URL('john-doe-account.json', REFERENCES), 'utf8')) as unknown;
const reference = (): Json => JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8'));

/** A row of the table by its owner, its member and, for a form, the form: `device timing`, `activity keys double`. */
const rowKey = (row: { owner: string; member: string; form?: string }): string => [row.owner, row.member, ...(row.form === undefined ? [] : [row.form])].join(' ');

/** What a case expects the table to say of the part it states. */
type Expect = 'read' | 'not read' | 'none';

interface Case {
  /** The row of `VERSION_TWO` the case states. */
  readonly row: string;
  /** For a member read member by member, the member. */
  readonly member?: string;
  readonly label: string;
  readonly expect: Expect;
  /** Where the part the case states is, as `versionTwoFields` says it. */
  readonly where: string;
  readonly change: (document: Json) => void;
}

const device = (document: Json, name: string): Json => document.devices.find((one: Json) => one.name === name);
const activity = (document: Json, name: string): Json => document.activities.find((one: Json) => one.name === name);
const send = (command: string): Json => ({ kind: 'send', command });

/** The members of a device's timing the catalogue states, `DeviceTiming`, each with a value no reference device has. */
const TIMING: Readonly<Record<string, unknown>> = {
  interKeyDelay: 1234, interDeviceDelay: 1234, holdInterDeviceDelay: 1234, powerOnDelay: 1234, inputDelay: 1234,
  connectedAppPowerOnDelay: 1234, pressMinRepeats: 7, minRepeats: 7, isInterKeyDelayOptimized: true,
};
/** The members of a device's power, `RecipeDevicePower`. */
const POWER: Readonly<Record<string, unknown>> = {
  alwaysOn: true, type: 'toggle', on: [send('Stop')], off: [send('Stop')], toggle: [send('Stop')], onReset: [send('Stop')],
};
/** The members of a channel tuning, `DeviceChannelTuning`, each a value the KPN's catalogue entry does not state. */
const TUNING: Readonly<Record<string, unknown>> = {
  fixedDigits: 2, start: [send('Info')], finish: [send('Guide')], greaterTen: [send('Info')], greaterHundred: [send('Info')],
};

/** What the table says of one member of a device's timing or power, stated alone on the Blu-ray. */
function memberRead(member: 'timing' | 'power', name: string, value: unknown): Expect {
  const document = reference();
  device(document, 'Blu-ray')[member] = { [name]: value };
  const parts = versionTwoFields(readRecipe(document)).filter((one) => one.field === member && 'device' in one.owner && one.owner.device === 'Blu-ray');
  assert.equal(parts.length, 1, `${member} ${name}`);
  return parts[0]!.readBy.includes('document') ? 'read' : 'not read';
}

const CASES: Case[] = [
  // The remote's settings: one row's value changed.
  { row: 'document settings', label: 'the screen brightness', expect: 'read', where: 'the remote\'s settings', change: (d) => { d.settings.ScreenBrightness = 50; } },
  { row: 'document highestIds', label: 'the highest ids given', expect: 'none', where: 'the remote\'s highest ids given', change: (d) => { d.highestIds = { device: 99, activity: 99, sequence: 99 }; } },
  // A device's timing and power, member by member, each stated alone on the Blu-ray, which states neither.
  ...Object.entries(TIMING).map(([name, value]): Case => {
    const expect = memberRead('timing', name, value);
    const repeat = name === 'pressMinRepeats' || name === 'minRepeats';
    return {
      row: 'device timing', member: name, label: `the timing member ${name}`, expect,
      where: `the device Blu-ray's ${expect === 'read' ? (repeat ? 'repeat count' : 'delays') : name}`,
      change: (d) => { device(d, 'Blu-ray').timing = { [name]: value }; },
    };
  }),
  ...Object.entries(POWER).map(([name, value]): Case => {
    const expect = memberRead('power', name, value);
    return {
      row: 'device power', member: name, label: `the power member ${name}`, expect,
      where: `the device Blu-ray's ${expect === 'read' ? 'power' : `power ${name}`}`,
      change: (d) => { device(d, 'Blu-ray').power = { [name]: value }; },
    };
  }),
  // A channel tuning is read whole: each member on the KPN, which states none, over its catalogue entry's.
  ...Object.entries(TUNING).map(([name, value]): Case => ({
    row: 'device channelTuning', member: name, label: `the channel tuning member ${name}`, expect: 'read',
    where: 'the device KPN\'s channel tuning', change: (d) => { device(d, 'KPN').channelTuning = { [name]: value }; },
  })),
  { row: 'device screen', label: 'a device screen of one entry', expect: 'read', where: 'the device Blu-ray\'s screen', change: (d) => { device(d, 'Blu-ray').screen = [{ device: 'Blu-ray', command: 'Stop' }]; } },
  { row: 'device commands', label: 'a command\'s own sending', expect: 'not read', where: 'the device Blu-ray\'s command Stop\'s sending', change: (d) => { device(d, 'Blu-ray').commands = { Stop: { sending: { copies: 5 } } }; } },
  { row: 'device keys double', label: 'a double press in a device\'s own map', expect: 'not read', where: 'the device Blu-ray\'s Menu key, pressed twice', change: (d) => { device(d, 'Blu-ray').keys = [{ key: 'Menu', press: 'double', action: { device: 'Blu-ray', command: 'Stop' } }]; } },
  { row: 'activity opensOn', label: 'the screen an activity opens on', expect: 'read', where: 'the activity Listen to Music\'s opening screen', change: (d) => { activity(d, 'Listen to Music').opensOn = 'Gesturepad'; } },
  {
    // The rule that one activity holds the favourites stands in front: the hold moves, and the two opening screens with it.
    row: 'activity favourites', label: 'the hold on the favourites moved', expect: 'read', where: 'the activity Switch Box\'s hold on the favourites',
    change: (d) => {
      const to = activity(d, 'Switch Box'), from = activity(d, 'Watch TV');
      to.favourites = true; from.favourites = false; from.opensOn = 'Gesturepad'; to.opensOn = 'Favorites';
    },
  },
  { row: 'activity powerOrder', label: 'the power order reversed', expect: 'read', where: 'the activity Watch a Blu-ray\'s power order', change: (d) => { activity(d, 'Watch a Blu-ray').powerOrder = ['Denon AV Receiver', 'Blu-ray', 'LG TV']; } },
  { row: 'activity start', label: 'a step at an activity\'s start', expect: 'read', where: 'the activity Listen to Music\'s steps at its start', change: (d) => { activity(d, 'Listen to Music').start = [{ device: 'Plex', command: 'Info' }]; } },
  {
    row: 'activity start', label: 'a step at an activity\'s start running a sequence', expect: 'not read', where: 'the activity Listen to Music\'s step 1 at its start, running the sequence Q',
    change: (d) => { const a = activity(d, 'Listen to Music'); a.sequences = [{ id: 's9', name: 'Q', steps: [{ device: 'Plex', command: 'Info' }] }]; a.start = [{ sequence: 'Q' }]; },
  },
  { row: 'activity end', label: 'a step at an activity\'s end', expect: 'read', where: 'the activity Listen to Music\'s steps at its end', change: (d) => { activity(d, 'Listen to Music').end = [{ device: 'Plex', command: 'Info' }]; } },
  {
    // A sequence needs an id, the toolkit's form.
    row: 'activity sequences', label: 'a sequence added', expect: 'read', where: 'the activity Listen to Music\'s sequences',
    change: (d) => { activity(d, 'Listen to Music').sequences = [{ id: 's9', name: 'Q', steps: [{ device: 'Plex', command: 'Info' }] }]; },
  },
  { row: 'activity screen label', label: 'a label on a screen entry', expect: 'read', where: 'the activity Watch TV\'s screen item 1\'s label', change: (d) => { activity(d, 'Watch TV').screen[0].label = 'Zzz'; } },
  {
    row: 'activity screen sequence', label: 'a screen entry running a sequence', expect: 'read', where: 'the activity Listen to Music\'s screen item 1, the sequence Q',
    change: (d) => { const a = activity(d, 'Listen to Music'); a.sequences = [{ id: 's9', name: 'Q', steps: [{ device: 'Plex', command: 'Info' }] }]; a.screen = [{ sequence: 'Q' }]; },
  },
  {
    // A double press exists on a gesture alone.
    row: 'activity keys double', label: 'a double press on an activity\'s gesture', expect: 'read', where: 'the activity Watch TV\'s SwipeUp key, pressed twice',
    change: (d) => { activity(d, 'Watch TV').keys.push({ key: 'SwipeUp', press: 'double', action: { device: 'LG TV', command: 'Mute' } }); },
  },
];

const build = (document: Json): string => {
  const built = buildFromRecipe(document, { builtAt: BUILT_AT, account: ACCOUNT as never });
  assert.equal(built.kind, 'documents');
  return JSON.stringify((built as { documents: unknown }).documents);
};

test('every row of the table has a case and every case names a row, and the members read are exactly the table\'s', () => {
  assert.deepEqual([...new Set(CASES.map((one) => one.row))].sort(), VERSION_TWO.map(rowKey).sort());
  // The members of timing and power the table marks read, asked of the table one by one above, and the cases' count.
  const readMembers = (row: string): string[] => CASES.filter((one) => one.row === row && one.expect === 'read').map((one) => one.member!);
  assert.deepEqual(readMembers('device timing'), ['interKeyDelay', 'interDeviceDelay', 'powerOnDelay', 'inputDelay', 'pressMinRepeats']);
  assert.deepEqual(readMembers('device power'), ['alwaysOn']);
  assert.deepEqual(['read', 'not read', 'none'].map((expect) => CASES.filter((one) => one.expect === expect).length), [22, 12, 1]);
});

test('each case states the part it says, and the table says of it what the case expects', () => {
  for (const one of CASES) {
    const document = reference();
    one.change(document);
    const part = versionTwoFields(readRecipe(document)).find((stated) => stated.where === one.where);
    assert.ok(part !== undefined, `${one.label}: no part ${one.where}`);
    const said: Expect = part.requirement === undefined ? 'none' : part.readBy.includes('document') ? 'read' : 'not read';
    assert.equal(said, one.expect, one.label);
  }
});

test('a field the table says the Harmony Touch reads changes its six documents, one marked unread is refused as not built, and highestIds changes nothing', () => {
  const plain = build(reference());
  const outcomes: Record<Expect, string[]> = { read: [], 'not read': [], none: [] };
  for (const one of CASES) {
    const document = reference();
    one.change(document);
    if (one.expect === 'not read') {
      const part = versionTwoFields(readRecipe(document)).find((stated) => stated.where === one.where)!;
      assert.throws(() => build(document), (error: unknown) => error instanceof NotBuiltError && error.requirement === part.requirement
        && error.message.includes(one.where), one.label);
    } else {
      assert.equal(build(document) !== plain, one.expect === 'read', one.label);
    }
    outcomes[one.expect].push(one.label);
  }
  assert.deepEqual([outcomes.read.length, outcomes['not read'].length, outcomes.none.length], [22, 12, 1]);
});
