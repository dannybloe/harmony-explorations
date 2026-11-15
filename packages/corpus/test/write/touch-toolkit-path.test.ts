/**
 * **The whole path an application takes for a Harmony Touch, with nothing attached**: a document created through the
 * toolkit, two devices found and fetched from the archive and added, an activity made of both, the changes a person
 * makes (a key of the activity, a key of a device's own map, a held press, a gesture's double press, a device's delay
 * and a setting), every key of the activity and of each device asked, the document checked, built into the six
 * documents a sync delivers, read back through the Touch's own reader, and synced to a pretend Harmony Touch; then a
 * second round on the same document, a device removed and another added, checked, built and synced again. It is the
 * Harmony One's `packages/codec/test/recipe/toolkitpath.test.ts` taken to the other kind of family and on to the sync.
 *
 * **What is claimed.** That the functions an application is given fit each other with nothing in between: each step
 * takes the previous step's result as it is, and the only imports are the entries an application has, the codec's
 * Node entry and the corpus's write subpath, beside the lab's sample and the references' invented account a test
 * supplies. That `keys` answers every place of the model for each owner, the chosen presses marked chosen with what
 * was chosen and every other marked default, with exact counts, `key` agreeing with `keys` place by place, and `screen`
 * answering. That the check lists no error, the build gives six documents and our two pictures, and the dry run sends
 * nothing while the commit ends written with the events in the order the sync contract states for a Touch,
 * `sync-contract.test.ts`. And on the second round, that no id is given again: the device added after the removal is
 * `d3`, its documents' id 900000103, and 900000102 is in no built document.
 *
 * **Why the read back is believed.** The built documents are read by `harmonyTouch.readConfiguration`, which reads the
 * documents as the remote's engine does and never sees the document they were built from: a button names a device by
 * its id in the device list and a command by name, and the reader finds the command on that device as the engine
 * does. Each chosen press is then compared with the device list's own command of that name, read off the same
 * documents by a route that does not pass through any map: the television's volume up key in its own map sends the
 * code the receiver's own map sends on its volume up key, R32's example; the activity's Info key sends the code the
 * receiver's device record holds for Mute; the held Guide and the double Tap send the television's Options and Stop.
 * The receiver's delay is read off its device record and the setting off the Settings document. **Every press the
 * questions answered is also compared with the built maps** (79 presses of the activity, 64 of each device), which
 * holds that what an application is shown is what is built; that comparison is not independent, since the build and
 * the questions share `resolveMaps`, and it is the read back above that is.
 *
 * **The controls.** A key nobody chose still holds its default, read the same way: the television's volume down key
 * in its own map sends the television's own code, the activity's volume down sends the receiver's by the receiver's
 * job, and the Guide key's short press, beside the held press that was chosen, still sends the television's Guide.
 * The television's delay, which nobody set, is the catalogue's. A document with no settings, the path's state before
 * they are set, is refused by the build, which is why the path sets them.
 *
 * **Over what.** The lab's sample of the infrared archive, decision 42: the Sony KDL-32W705B found by what a person
 * types, the Denon AVR-1912 by a result an application kept, as the One's path test does, and the Sony BDP-S6500 found
 * by what a person types in the second round. **Scope**: built and synced to a pretend Harmony Touch, on no real
 * remote; whether the remote does what the documents say is the bench's, and nothing built here has been sent to one.
 *
 * **No proof is recorded here.** The requirements this path exercises are of two kinds and neither can be met by it:
 * the toolkit's, the check's and the sync's, R76 to R79, are requirements of the FHSDK as a whole with one status for
 * every model, which stay open while other models answer not built; and a key's choice, a held press and a gesture's
 * commands on the Touch, R31, R32, R38 and R40, show on a remote and need a run on the bench unit, which no document
 * built on this path has had. What the test does show corrected two written statuses of the Touch, each of which said
 * its family could not do what is built and read back here: R32, a device's key given another device's command, now
 * waits on a run on the unit alone; R22, an activity's keys mapped from its devices' jobs, now waits on the FHSDK's
 * shared work, since its learned command landing on its key needs a build that reads a command's own code, R19.
 *
 * **What did not fit** is listed beside the assertions that met it, each comment starting "Did not fit".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE_SAMPLE, needing, skipWithoutIrArchiveSample } from '@harmony/lab';
import {
  archiveSourceAt, buildFromRecipe, fetchDevice, findDevices, harmonyTouch, recipe,
  type BuildSources, type Recipe,
} from '@harmony/codec/node';
import { pretendRemote, syncDocument, type SyncEvent, type SyncOutcome } from '@harmony/corpus/write';

/**
 * The references' invented account, John Doe's, with a household address on the domain that resolves nowhere, as the
 * sync contract's tests supply it: a Touch's documents carry the account's identifiers, which an application reads off
 * the remote and never puts in a document. Read as a fixture, not imported.
 */
const JOHN_DOE = JSON.parse(readFileSync(new URL('../../../codec/test/references/john-doe-account.json', import.meta.url), 'utf8')) as { context: Record<string, unknown> };
// Did not fit: the account's type, `TouchAccount`, is on no entry an application builds on, only on `./build`'s
// `harmonyTouch`, so an application holding one names it as the build's option, `BuildSources['account']`.
const ACCOUNT = { ...JOHN_DOE, context: { ...JOHN_DOE.context, HouseholdUserProfileUri: 'https://example.invalid/john-doe/household' } } as unknown as NonNullable<BuildSources['account']>;
const SOURCES: BuildSources = { builtAt: '2026-11-15T09:00:00', account: ACCOUNT };

/** What a sync of a Harmony Touch reports when it is written, the sync contract's `TOUCH_WRITTEN`. */
const TOUCH_WRITTEN = ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= written'];

/** One sync, as an application runs it, with its events as short words and its journal. */
async function sync(document: Recipe, remote: ReturnType<typeof pretendRemote>, commit: boolean): Promise<{ words: string[]; lines: string[]; outcome: SyncOutcome }> {
  const events: SyncEvent[] = [];
  const lines: string[] = [];
  const outcome = await syncDocument({ document, remote, sources: SOURCES, commit, onEvent: (event) => events.push(event), journal: (line) => lines.push(line) });
  const words = events.map((event) => (event.kind === 'phase' ? event.phase
    : event.kind === 'progress' ? `${event.phase} ${event.done}/${event.total}`
      : event.kind === 'attention' ? `! ${event.attention}` : `= ${event.outcome.result}`));
  return { words, lines, outcome };
}

type Built = Extract<ReturnType<typeof buildFromRecipe>, { kind: 'documents' }>;
/** The build of a Touch document: its documents and pictures, the kind asserted rather than assumed. */
function build(document: Recipe): Built {
  const built = buildFromRecipe(document, SOURCES);
  assert.equal(built.kind, 'documents');
  return built as Built;
}

type Read = ReturnType<typeof harmonyTouch.readConfiguration>;
type ReadMap = NonNullable<Read['devices'][number]['map']>;
type ReadAction = NonNullable<ReadMap['buttons'][number]['press']>;

/** A press of a built map's button: the short, the held or the double, by the toolkit's word for it. */
function builtPress(map: ReadMap, key: { readonly key: string; readonly surface: string }, press: { readonly press: string; readonly label?: string }): ReadAction | undefined {
  // A pad place is drawn under its label and carries no key name in the documents; every other place by its name.
  const button = key.surface === 'pad'
    ? map.buttons.find((one) => one.kind === 'number pad' && one.label === press.label)
    : map.buttons.find((one) => one.kind !== 'number pad' && one.key === key.key);
  if (button === undefined) return undefined;
  return press.press === 'short' ? button.press : press.press === 'held' ? button.longPress : button.doublePress;
}

/** What a built action does in the words of the remote's own documents: a device's name and a command, or nothing. */
const said = (action: ReadAction | undefined): string => (action === undefined ? 'nothing'
  : action.kind === 'command' ? `${action.device?.name}: ${action.commandName}` : action.kind);

/** The counts of one owner's answer: places, presses, chosen, default, and presses that do something. */
function counted(answers: ReturnType<typeof recipe.keys>): { places: number; presses: number; chosen: number; defaults: number; bound: number } {
  const presses = answers.flatMap((one) => one.presses);
  return {
    places: answers.length,
    presses: presses.length,
    chosen: presses.filter((one) => !one.isDefault).length,
    defaults: presses.filter((one) => one.isDefault).length,
    bound: presses.filter((one) => !('nothing' in one.action)).length,
  };
}

/** The chosen presses of one owner's answer, as `key press: device command`, which is what a person chose. */
const chosenOf = (answers: ReturnType<typeof recipe.keys>, names: Readonly<Record<string, string>>): string[] => answers
  .flatMap((one) => one.presses.filter((press) => !press.isDefault).map((press) => `${one.key} ${press.press}: ${'device' in press.action ? `${names[press.action.device]} ${press.action.command}` : JSON.stringify(press.action)}`));

/**
 * Every press `keys` answers for an owner compared with the built map's: the same device's name and command, or
 * nothing on both. Returns how many presses were compared and how many send something, the differences failing.
 */
function sameAsBuilt(document: Recipe, owner: Parameters<typeof recipe.keys>[1], map: ReadMap): { compared: number; bound: number } {
  const names = Object.fromEntries(recipe.devices(document).map((one) => [one.id, one.name]));
  let compared = 0;
  let bound = 0;
  for (const key of recipe.keys(document, owner)) {
    for (const press of key.presses) {
      const asked = 'device' in press.action ? `${names[press.action.device]}: ${press.action.command}` : 'nothing' in press.action ? 'nothing' : 'sequence';
      assert.equal(said(builtPress(map, key, press)), asked, `${JSON.stringify(owner)} ${key.key} ${press.press}`);
      compared += 1;
      if (asked !== 'nothing') bound += 1;
    }
  }
  return { compared, bound };
}

/** The key code the engine would send for a built action: the command it finds on the action's device. */
const codeOf = (action: ReadAction | undefined): string | null | undefined => action?.command?.keyCode;

test('a Harmony Touch document created, filled, changed, asked, checked, built, read back and synced to a pretend remote, then a device removed and another added and synced again',
  needing(skipWithoutIrArchiveSample()), async () => {
    const sources = [archiveSourceAt(IR_ARCHIVE_SAMPLE as string)];

    // 1. A document for the model, as a person picks it.
    let document = recipe.create({ name: 'Harmony Touch' });

    // 2. The devices, found and fetched, added as they come.
    const search = await findDevices(sources, { manufacturer: 'sony', model: 'kdl 32w705b' });
    assert.deepEqual(search.failed, []);
    const found = search.found[0]!;
    assert.deepEqual([found.entry, found.match], ['Sony/KDL-32W705B', 1]);
    const kept = { source: 'archive', entry: 'Denon/AVR-1912', manufacturer: 'Denon', model: 'AVR-1912', match: 1 };
    document = recipe.addDevice(document, { name: 'Television', device: await fetchDevice(sources, found) }).document;
    document = recipe.addDevice(document, { name: 'Receiver', device: await fetchDevice(sources, kept) }).document;
    assert.deepEqual(recipe.devices(document).map((one) => [one.id, one.name]), [['d1', 'Television'], ['d2', 'Receiver']]);

    // 3. An activity of both, each switched to the input a person picks from the device's own list.
    assert.ok(recipe.inputs(document, 'd1').includes('HDMI 1/MHL') && recipe.inputs(document, 'd2').includes('TV'));
    document = recipe.addActivity(document, {
      name: 'Watch TV', type: 'WatchTV',
      devices: [{ device: 'd1', input: 'HDMI 1/MHL', roles: ['Display', 'ChannelChanging'] }, { device: 'd2', input: 'TV', roles: ['Volume'] }],
    }).document;
    const watch = { activity: 'a1' } as const;
    const television = { device: 'd1' } as const;
    const receiver = { device: 'd2' } as const;

    // The defaults before any choice, which the changes below are chosen against: the gesture's double press is the
    // television's Pause by default and its held press the receiver's Mute, so a double press of Stop is a change.
    const tap = recipe.key(document, { owner: watch, key: 'Tap' });
    assert.deepEqual(tap.presses.map((one) => [one.press, one.isDefault, one.action]),
      [['short', true, { device: 'd1', command: 'Play' }], ['held', true, { device: 'd2', command: 'Mute' }], ['double', true, { device: 'd1', command: 'Pause' }]]);

    // 4. The changes a person makes, each through the call made for it, each touching nothing else.
    const changes = [
      recipe.setKey(document, { owner: watch, key: 'Info' }, { device: 'd2', command: 'Mute' }),
    ];
    document = changes.at(-1)!.document;
    changes.push(recipe.setKey(document, { owner: television, key: 'VolumeUp' }, { device: 'd2', command: 'VolumeUp' }));
    document = changes.at(-1)!.document;
    changes.push(recipe.setKey(document, { owner: watch, key: 'Guide', press: 'held' }, { device: 'd1', command: 'Options' }));
    document = changes.at(-1)!.document;
    changes.push(recipe.setKey(document, { owner: watch, key: 'Tap', press: 'double' }, { device: 'd1', command: 'Stop' }));
    document = changes.at(-1)!.document;
    changes.push(recipe.setDevice(document, 'd2', { timing: { interKeyDelay: 250 } }));
    document = changes.at(-1)!.document;
    assert.deepEqual(changes.map((one) => one.effects), [[], [], [], [], []]);

    // Did not fit: the check lists no error for a Touch document stating no settings, and the build refuses it, so the
    // check passed what the build then refused. The control: the same document with the settings set below builds.
    assert.deepEqual(recipe.check(document), []);
    assert.throws(() => buildFromRecipe(document, SOURCES), /the document states no settings, and a Harmony Touch's Settings states every row/);
    // Did not fit: nothing in the toolkit says which settings a model has, their ranges or their defaults. The firmware's
    // defaults are on the main entry, `harmonyTouch.FIRMWARE_SETTINGS`, and the build refuses two of its rows, the
    // vibration and its effect, which a Settings of ours does not write, while the check again lists nothing.
    let everyDefault = document;
    for (const [name, value] of Object.entries(harmonyTouch.FIRMWARE_SETTINGS)) everyDefault = recipe.setSetting(everyDefault, name, value).document;
    assert.deepEqual(recipe.check(everyDefault), []);
    assert.throws(() => buildFromRecipe(everyDefault, SOURCES), /the setting HapticFlag is not one a Harmony Touch's Settings of ours writes/);
    // So the path states the seven rows the build writes, the firmware's defaults but the two it refuses, and one of
    // them changed: the screen's timeout at 30 seconds, where the firmware's is 10.
    const written = ['TwelveHourClock', 'ScreenBrightness', 'ScreenTimeout', 'ScreenLockFlag', 'EditLock', 'KeyBrightness', 'AccelFlag'] as const;
    for (const name of written) document = recipe.setSetting(document, name, harmonyTouch.FIRMWARE_SETTINGS[name]).document;
    assert.equal(harmonyTouch.FIRMWARE_SETTINGS.ScreenTimeout, 10);
    document = recipe.setSetting(document, 'ScreenTimeout', 30).document;

    // 5. The questions. Every place of the model for each owner: a device's map binds 38 places with 64 presses, an
    // activity's 43 and 79, its five gestures beside them. Three presses of the activity are chosen, one of the
    // television's own map, none of the receiver's; every other press is the family's default.
    const names = Object.fromEntries(recipe.devices(document).map((one) => [one.id, one.name]));
    const activityKeys = recipe.keys(document, watch);
    const televisionKeys = recipe.keys(document, television);
    const receiverKeys = recipe.keys(document, receiver);
    assert.deepEqual(counted(activityKeys), { places: 43, presses: 79, chosen: 3, defaults: 76, bound: 48 });
    assert.deepEqual(counted(televisionKeys), { places: 38, presses: 64, chosen: 1, defaults: 63, bound: 38 });
    assert.deepEqual(counted(receiverKeys), { places: 38, presses: 64, chosen: 0, defaults: 64, bound: 24 });
    // The chosen ones are exactly what was chosen, with what was chosen; no answer says why a key cannot be chosen.
    assert.deepEqual(chosenOf(activityKeys, names), ['Guide held: Television Options', 'Info short: Receiver Mute', 'Tap double: Television Stop']);
    assert.deepEqual(chosenOf(televisionKeys, names), ['VolumeUp short: Receiver VolumeUp']);
    assert.ok([...activityKeys, ...televisionKeys, ...receiverKeys].every((one) => one.why === undefined));
    // Every place `keyNames` gives an owner's map is answered, in its order, and the remote's own three are not.
    const places = recipe.keyNames(document);
    assert.equal(places.length, 46);
    assert.deepEqual(activityKeys.map((one) => one.key), places.filter((one) => one.boundBy === 'both' || one.boundBy === 'activity').map((one) => one.key));
    assert.deepEqual(televisionKeys.map((one) => one.key), places.filter((one) => one.boundBy === 'both' || one.boundBy === 'device').map((one) => one.key));
    // `key` for one place agrees with `keys`, on every place of every owner.
    for (const [owner, answers] of [[watch, activityKeys], [television, televisionKeys], [receiver, receiverKeys]] as const) {
      for (const answer of answers) assert.deepEqual(recipe.key(document, { owner, key: answer.key }), answer, `${JSON.stringify(owner)} ${answer.key}`);
    }
    // The delay set on the receiver is shown at every key sending a receiver command, as the person's, and the
    // television's stays the catalogue's: the setting lives on the device and every key shows it.
    const sendingTo = (device: string) => [...activityKeys, ...televisionKeys, ...receiverKeys].flatMap((one) => one.presses)
      .flatMap((press) => ('sending' in press && press.action.device === device ? [press.sending.settings.interKeyDelay] : []));
    assert.deepEqual([...new Set(sendingTo('d2').map((one) => JSON.stringify(one)))], [JSON.stringify({ value: 250, isDefault: false })]);
    assert.deepEqual([...new Set(sendingTo('d1').map((one) => JSON.stringify(one)))], [JSON.stringify({ value: 100, isDefault: true })]);
    // The screens: each device's list is the family's, 39 and 52 entries, the television's opening with its Home and
    // the entry that opens the number pad. Did not fit, a surprising default: an activity's screen is empty unless a
    // person states one, where an activity Logitech's service builds lists its devices' commands.
    const televisionScreen = recipe.screen(document, television);
    assert.deepEqual([televisionScreen.items.length, televisionScreen.isDefault, recipe.screen(document, receiver).items.length], [39, true, 52]);
    assert.deepEqual(televisionScreen.items.slice(0, 2), [{ device: 'd1', command: 'Home', isDefault: true }, { label: '123', client: 'Numpad', isDefault: true }]);
    assert.deepEqual(recipe.screen(document, watch), { owner: watch, items: [], isDefault: true });

    // 6. Checked, and built with the account: the six documents a sync delivers and our two pictures.
    assert.deepEqual(recipe.check(document), []);
    const built = build(document);
    assert.deepEqual(Object.keys(built.documents).sort(), ['ActivityList', 'Context', 'DeviceList', 'MapList', 'ProtocolList', 'Settings']);
    assert.equal(built.pictures.length, 2);

    // 7. Read back by the Touch's own reader, which never sees the document.
    const read = harmonyTouch.readConfiguration(built.documents);
    assert.deepEqual(read.absent, []);
    assert.deepEqual(read.devices.map((one) => [one.id, one.name, one.controlPort]), [['900000101', 'Television', 0], ['900000102', 'Receiver', 0]]);
    assert.deepEqual(read.activities.map((one) => [one.id, one.name]), [['900000201', 'Watch TV']]);
    const [builtTelevision, builtReceiver] = read.devices as [Read['devices'][number], Read['devices'][number]];
    const builtWatch = read.activities[0]!;
    const deviceCode = (device: Read['devices'][number], command: string): string | null | undefined => device.commandsByName.get(command.toLowerCase())?.keyCode;
    const button = (map: ReadMap | undefined, key: string) => map?.buttons.find((one) => one.key === key);
    // The codes compared below are each a code of its own, so a comparison can tell one command from another and two
    // missing codes cannot pass as equal.
    const compared = [['Receiver', 'VolumeUp'], ['Receiver', 'VolumeDown'], ['Receiver', 'Mute'], ['Television', 'VolumeDown'], ['Television', 'Options'], ['Television', 'Guide'], ['Television', 'Stop']]
      .map(([device, command]) => deviceCode(device === 'Receiver' ? builtReceiver : builtTelevision, command!));
    assert.ok(compared.every((code) => typeof code === 'string' && code.length > 0), JSON.stringify(compared));
    assert.equal(new Set(compared).size, compared.length);
    // R32's example: the television's volume up key in its own map sends what the receiver's own map sends on its own.
    const receiverVolumeUp = button(builtReceiver.map, 'VolumeUp')?.press;
    assert.equal(said(receiverVolumeUp), 'Receiver: VolumeUp');
    assert.equal(said(button(builtTelevision.map, 'VolumeUp')?.press), 'Receiver: VolumeUp');
    assert.equal(codeOf(button(builtTelevision.map, 'VolumeUp')?.press), codeOf(receiverVolumeUp));
    // The control: the key beside it, which nobody chose, sends the television's own code.
    assert.equal(said(button(builtTelevision.map, 'VolumeDown')?.press), 'Television: VolumeDown');
    assert.equal(codeOf(button(builtTelevision.map, 'VolumeDown')?.press), deviceCode(builtTelevision, 'VolumeDown'));
    // The activity's Info key sends the receiver's Mute, the code the receiver's own record holds.
    assert.equal(codeOf(button(builtWatch.map, 'Info')?.press), deviceCode(builtReceiver, 'Mute'));
    assert.equal(said(button(builtWatch.map, 'Info')?.press), 'Receiver: Mute');
    // The held Guide sends the television's Options, and its short press, which nobody chose, still the Guide.
    assert.equal(codeOf(button(builtWatch.map, 'Guide')?.longPress), deviceCode(builtTelevision, 'Options'));
    assert.equal(codeOf(button(builtWatch.map, 'Guide')?.press), deviceCode(builtTelevision, 'Guide'));
    // The gesture's double press sends the television's Stop, its held press the receiver's Mute as by default.
    assert.equal(codeOf(button(builtWatch.map, 'Tap')?.doublePress), deviceCode(builtTelevision, 'Stop'));
    assert.equal(said(button(builtWatch.map, 'Tap')?.longPress), 'Receiver: Mute');
    // The control in the activity: its volume down sends the receiver's, by the receiver's job, which nobody chose.
    assert.equal(codeOf(button(builtWatch.map, 'VolumeDown')?.press), deviceCode(builtReceiver, 'VolumeDown'));
    // Each device switched to the input chosen, a name the device's own inputs hold, as the engine sets the activity
    // up: by the first role naming each device, its jobs beside it.
    assert.deepEqual(builtWatch.devices.map((one) => [one.device?.name, one.role.input, one.role.inputKnown, one.kinds]),
      [['Television', 'HDMI 1/MHL', true, ['DisplayActivityRole', 'ChannelChangingActivityRole']], ['Receiver', 'TV', true, ['VolumeActivityRole']]]);
    // The receiver's delay as set, the television's the catalogue's, which the question answered as the default.
    assert.deepEqual([builtReceiver.interKeyDelayMs, builtTelevision.interKeyDelayMs], [250, 100]);
    // The setting: the timeout as set, and the brightness, which was not changed, the firmware's default.
    assert.deepEqual([read.settings?.screenTimeout.value, read.settings?.screenBrightness.value], [30, harmonyTouch.FIRMWARE_SETTINGS.ScreenBrightness]);
    // What an application is shown is what is built: every press of every owner, the not independent comparison.
    assert.deepEqual(sameAsBuilt(document, watch, builtWatch.map!), { compared: 79, bound: 48 });
    assert.deepEqual(sameAsBuilt(document, television, builtTelevision.map!), { compared: 64, bound: 38 });
    assert.deepEqual(sameAsBuilt(document, receiver, builtReceiver.map!), { compared: 64, bound: 24 });
    // And the device screens, entry by entry in their order, by the label the remote shows.
    const entries = (map: ReadMap | undefined): string[] => (map?.buttons ?? []).filter((one) => one.kind === 'entry')
      .sort((x, y) => (x.index ?? 0) - (y.index ?? 0)).map((one) => one.label ?? '');
    assert.deepEqual(entries(builtTelevision.map), televisionScreen.items.map((one) => one.label ?? ('command' in one ? one.command : '')));

    // 8. Synced to a pretend Harmony Touch: a dry run first, which sends nothing, then the commit.
    const remote = pretendRemote({ model: document.model });
    const dry = await sync(document, remote, false);
    assert.deepEqual(dry.words, ['identify', 'check', 'build', '= dry-run']);
    assert.deepEqual(dry.outcome, { result: 'dry-run', remote: 'as-before', message: 'everything before the remote is acted on was done, and the set holds 6 documents and 2 pictures' });
    assert.equal(remote.holds(), undefined);
    const first = await sync(document, remote, true);
    assert.deepEqual(first.words, TOUCH_WRITTEN);
    assert.deepEqual(first.outcome, { result: 'written', remote: 'new-configuration' });
    assert.ok(first.lines.includes('pretend Harmony Touch: built 6 documents and 2 pictures, a set of 8 answers the gate passes'), first.lines.join('\n'));
    // Did not fit: a pretend Touch holds the document it was synced, not the set it was sent, and no read gives that set
    // back (`pretendReader` refuses a Touch), so the set is shown by building again what it holds, which is the set built.
    assert.equal(remote.holds(), document);
    assert.deepEqual(build(remote.holds()!).documents, built.documents);

    // 9. A second round on the same document: the receiver taken out, a Blu-ray player found and added, the television
    // given the volume in the activity and a film activity made of the two.
    const removal = recipe.remove(document, receiver);
    // The two choices that sent a receiver command go back to their defaults and the activity no longer uses it.
    // Did not fit: nothing says the activity's volume keys, which by default sent the receiver's, now send nothing;
    // the effects name only choices a person made, and the check after it lists nothing.
    assert.deepEqual(removal.effects.map((one) => one.message), [
      'Television\'s own map\'s VolumeUp key sent a command of Receiver and goes back to its default',
      'activity Watch TV no longer uses Receiver',
      'activity Watch TV\'s Info key sent a command of Receiver and goes back to its default',
    ]);
    document = removal.document;
    assert.deepEqual(recipe.key(document, { owner: watch, key: 'VolumeUp' }).presses.map((one) => [one.press, one.isDefault, one.action]),
      [['short', true, { nothing: true }], ['held', true, { nothing: true }]]);
    assert.deepEqual(recipe.check(document), []);
    const player = (await findDevices(sources, { manufacturer: 'sony', model: 'bdp s6500' })).found[0]!;
    assert.deepEqual([player.entry, player.match], ['Sony/BDP-S6500', 1]);
    document = recipe.addDevice(document, { name: 'Blu-ray', device: await fetchDevice(sources, player) }).document;
    document = recipe.setActivity(document, 'a1', { devices: [{ device: 'd1', input: 'HDMI 1/MHL', roles: ['Display', 'ChannelChanging', 'Volume'] }] }).document;
    document = recipe.addActivity(document, {
      name: 'Watch a Film', type: 'WatchDvd',
      devices: [{ device: 'd1', input: 'HDMI 2', roles: ['Display', 'Volume'] }, { device: 'd3', roles: ['PlayMovie'] }],
    }).document;
    // Ids are never given twice: the player is d3, not the receiver's d2, and the document records the highest given.
    assert.deepEqual(recipe.devices(document).map((one) => [one.id, one.name]), [['d1', 'Television'], ['d3', 'Blu-ray']]);
    assert.deepEqual(recipe.activities(document).map((one) => [one.id, one.name]), [['a1', 'Watch TV'], ['a2', 'Watch a Film']]);
    assert.deepEqual(document.highestIds, { device: 3, activity: 2 });
    // The choices that did not name the receiver stay the person's; the volume keys follow the new job.
    assert.deepEqual(chosenOf(recipe.keys(document, watch), { d1: 'Television', d3: 'Blu-ray' }), ['Guide held: Television Options', 'Tap double: Television Stop']);
    assert.deepEqual(recipe.key(document, { owner: watch, key: 'VolumeUp' }).presses[0]!.action, { device: 'd1', command: 'VolumeUp' });
    assert.deepEqual(counted(recipe.keys(document, { activity: 'a2' })).places, 43);
    assert.deepEqual(recipe.check(document), []);

    const again = build(document);
    const reread = harmonyTouch.readConfiguration(again.documents);
    assert.deepEqual(reread.devices.map((one) => [one.id, one.name]), [['900000101', 'Television'], ['900000103', 'Blu-ray']]);
    assert.deepEqual(reread.activities.map((one) => [one.id, one.name]), [['900000201', 'Watch TV'], ['900000202', 'Watch a Film']]);
    // The receiver's document id is in no document of the new set, so nothing the remote keeps by it passes on.
    assert.equal(JSON.stringify(again.documents, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value)).includes('900000102'), false);
    // The control: it was in the first set.
    assert.equal(JSON.stringify(built.documents, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value)).includes('900000102'), true);
    assert.equal(said(button(reread.activities[0]!.map, 'VolumeUp')?.press), 'Television: VolumeUp');

    const second = await sync(document, remote, true);
    assert.deepEqual(second.words, TOUCH_WRITTEN);
    assert.deepEqual(second.outcome, { result: 'written', remote: 'new-configuration' });
    assert.equal(remote.holds(), document);
    assert.deepEqual(build(remote.holds()!).documents, again.documents);
  });
