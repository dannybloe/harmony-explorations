/**
 * Build a Harmony Touch set with a device of ours added, or taken out again, from a set the remote holds, check
 * it, and compare what the remote reports afterwards with it: `todo-touch.md` 8.1; and the same for an activity of
 * ours, 8.2. It opens no remote: it reads the lab and the description and writes into the lab.
 *
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --device <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --remove <device id>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --activity <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --remove-activity <activity id>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --favourites <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <favourites set folder> --favourites-back
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --settings <description> --context <lab description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <settings set folder> --settings-back
 *   node packages/corpus/bin/touch-device-set.ts --describe-context <set folder> --out <new lab file>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --removal <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <removal set folder> --removal-back
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --setup <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <setup set folder> --setup-back
 *   node packages/corpus/bin/touch-device-set.ts --describe-setup <set folder> --out <new description file>
 *   node packages/corpus/bin/touch-device-set.ts --check <set folder> [--same-as <set folder>]... \
 *     [--written <a run's kept write of answers>] [--hash <getconfighash answer>] [--list <request list answer>]
 *
 * **`--build --device`** reads a device described by its family and numbers, a JSON file whose `device` is a
 * `RowDevice` (`packages/corpus/touch-devices/test-projector.json`), composes it with the codec,
 * `composeTouchDeviceOfRow`, and adds it to the set in `--from` with `withTouchDevice`: the device to
 * `DeviceList`, its map to `MapList`, its definition to `ProtocolList`. Those three documents get new tags,
 * `setTag` with the new folder's name, and the other three keep the source's, so a remote that committed the
 * source is answered 304 for them, `changeDocuments` in `src/touchchangedset.ts`. **`--build --remove`** is the
 * exact inverse, `withoutTouchDevice`, the three documents again under new tags of their own. Every tag the chain
 * of sets back to the first has stated is in play, and a new tag equal to one of them is refused. It writes
 * `set.json`, the set `touch-sync.ts --set` reads, and `sources.json`, the source folder and the device or the
 * id taken out. The folder has to be inside the lab and new or empty.
 *
 * **`--build --activity`** reads an activity described by its devices, steps, keys and screen entries, a JSON file
 * whose `activity` is an `OwnActivity` (`packages/corpus/touch-activities/test-cinema.json`), composes it against the
 * source set's own devices, `composeTouchActivity`, and adds it with `withTouchActivity`: the activity to
 * `ActivityList` and its map to `MapList`, the two documents an activity lives in, the other four keeping the
 * source's tags. Neither `Context` nor `Settings` names an activity, and no other document names one by id; the
 * 8.2 preflight in the lab says how that was checked. **`--build --remove-activity`** is its exact inverse,
 * `withoutTouchActivity`. The record beside the set says `activity` or `removedActivity`, so `chainTags` follows it.
 *
 * **`--build --favourites`** reads favourites described by channel number, a JSON file whose `favourites` is an
 * `OwnFavourites` (`packages/corpus/touch-favourites/8.3-favourites.json`), composes them against what the remote
 * holds, `composeTouchFavourites`, and delivers the favourites documents it changes and the logos of ours beside
 * the source's six, which keep the source's content and tags, `withContent` in `src/touchfavouritesset.ts`, 8.3.
 * What the remote holds at a favourites address or a picture's is the latest set of the chain that delivered one
 * and otherwise the recorded full sync's, `touch_full_sync_recording`, `heldContent`. **`--build
 * --favourites-back`** is its exact inverse: every favourites document and picture the set in `--from` delivered,
 * as the remote held it before, tags and all, `putBackContent`. The record says `favourites` or `favouritesBack`.
 *
 * **`--build --settings`** reads a Settings description, a JSON file whose `settings` is an `OwnSettings`
 * (`packages/corpus/touch-settings/8.4-settings.json`), and a Context description in the lab, a JSON file whose
 * `context` is an `OwnContext`, the seven fields a Touch reads, which hold the account's and so never enter the
 * repository; composes both against the source's, `composeTouchSettings` and `composeTouchContext`, and delivers them
 * under new tags beside the source's other four, `withSettingsAndContext` in `src/touchsettingsset.ts`, 8.4. The set is
 * the six alone: favourites or pictures the source delivered are the remote's once it is committed. **`--build
 * --settings-back`** is its exact inverse, the source's Settings and Context, content and tags. The record says
 * `settings`, with the Context description's path and never its content, or `settingsBack`. **`--describe-context`**
 * writes the description of a set's Context as the remote holds it into a new lab file, printing nothing of it.
 *
 * **`--build --removal`** reads devices and activities of the remote's own to take out, by the names the lists show, a
 * JSON file whose `removal` is a `NamedRemoval` (`packages/corpus/touch-removals/8.5-removal.json`), takes them out of
 * the source with everything that names them, `withoutTouchEntries` in the codec, and delivers those of the four
 * documents a device or an activity is named in whose content changed, under new tags, beside the source's others,
 * `withRemoval` in `src/touchremovalset.ts`, 8.5. **`--build --removal-back`** is its exact inverse, the documents the
 * removal changed as the remote held them before, content and tags, `putBackRemoval`. The record says `removal` or
 * `removalBack`. `--check` of either prints the structural diff entry by entry, `removalChanges`.
 *
 * **`--build --setup`** reads a whole setup, a JSON file whose `setup` is a `TouchSetup`
 * (`packages/corpus/touch-setups/8.6-test-setup.json`), composes it onto the source with every device and activity taken
 * out, the source's own device and protocol lists standing for the catalogue, `composeTouchSetup` in the codec, and
 * delivers the four documents a device or an activity is named in under new tags beside the source's Context and
 * Settings, `withSetup` in `src/touchsetupset.ts`, 8.6. **`--build --setup-back`** is its exact inverse, the four as the
 * remote held them before, content and tags, `putBackSetup`. The record says `setup`, the description's path, or
 * `setupBack`. `--check` of a setup set prints the field by field comparison with the source's documents,
 * `compareSetup`, and is NOT OK on any difference no row explains. **`--describe-setup`** writes the description of a
 * set's setup, `describeTouchSetup`, into a new file: what the person chose, names and numbers, and no code, address or
 * key, so it is written where the repository keeps it.
 *
 * **`--check`** reads the set back as `touch-sync.ts` will, the gate and the codec's reader, and the device as
 * the reader sees it: its commands each with a definition and a key code, its map found by the identifier the
 * engine builds, its keys and its screen list; for an activity, its place on the list and type, its devices in
 * power on order with their inputs, its start and end steps, and its map's keys and entries, each naming a command
 * its device has. Against its source: each of the three documents of a device, or the two of an activity, differs
 * by exactly one entry of its list, added or taken out, and in nothing else, `listChanges`, and the other documents
 * not at all; exactly those tags are new, the ones the set's name gives, and in play nowhere in the chain; a
 * remote holding the source is answered 200 for those and 304 for the rest, a write of answers it sizes.
 * `--same-as`, `--written`, `--hash` and `--list` are `touch-changed-set.ts`'s.
 *
 * **What it prints**: counts, document names, places in a list, `equal` or `not equal`, the device's or activity's
 * own names and numbers, which are ours, and the names of the devices and commands an activity of ours uses; never a
 * tag, an address or any other value out of a document, since the documents hold the household's account.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { harmonyTouch, readPng as readPngHeader } from '@harmony/codec';
import { LAB } from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import {
  answersWhenHolding,
  chainTags,
  changeDocuments,
  differences,
  listChanges,
  setDifferences,
  writeOfAnswersSize,
  type SetRecord,
} from '../src/touchchangedset.ts';
import {
  compareContentRequests, contentKind, contentOfComposed, documentsHeld, heldContent, isContent, logosAsked, putBackContent,
  withContent,
} from '../src/touchfavouritesset.ts';
import { OWN_SET_DOCUMENTS, compareConfigHash, compareRequestList } from '../src/touchownset.ts';
import { SETTINGS_SET_DOCUMENTS, putBackSettingsAndContext, settingsChanges, sixOf, withSettingsAndContext } from '../src/touchsettingsset.ts';
import { REMOVAL_DOCUMENTS, putBackRemoval, removalChanges, withRemoval } from '../src/touchremovalset.ts';
import { SETUP_DOCUMENTS, SETUP_IDS, compareSetup, comparisonLines, putBackSetup, withSetup } from '../src/touchsetupset.ts';
import { WRITE_ANSWERS, answerOf, keyOf, prepareSet, resultOf, setTag, type RemoteRequest, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** The three documents a device is told to a Touch in, and the list in each that holds it. */
export const DEVICE_DOCUMENTS: readonly (readonly [string, string])[] = [
  ['DeviceList', 'DevicesWithFeatures'], ['MapList', 'ButtonMaps'], ['ProtocolList', 'Protocols'],
];
/** The two documents an activity is told to a Touch in, and the list in each that holds it. */
export const ACTIVITY_DOCUMENTS: readonly (readonly [string, string])[] = [
  ['ActivityList', 'Activities'], ['MapList', 'ButtonMaps'],
];

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function arguments_(name: string): string[] {
  return process.argv.flatMap((a, i) => (a === `--${name}` && process.argv[i + 1] !== undefined ? [process.argv[i + 1]!] : []));
}

/** A path inside the lab, resolved through its links, or a refusal; the same rule as `touch-own-set.ts`. */
function insideTheLab(path: string, what: string): string {
  if (LAB === undefined) fail('there is no lab directory');
  const lab = realpathSync(LAB);
  let existing = resolve(path);
  const rest: string[] = [];
  while (!existsSync(existing)) {
    rest.unshift(basename(existing));
    existing = dirname(existing);
  }
  const real = join(realpathSync(existing), ...rest);
  if (!real.startsWith(lab + sep)) fail(`${what} ${real} is not inside the lab, ${lab}`);
  return real;
}

/** What `--build` records beside the set: the device or activity added, or the id taken out. */
interface DeviceRecord {
  readonly name: string;
  readonly from: string;
  readonly device?: harmonyTouch.RowDevice;
  readonly removed?: number | string;
  readonly activity?: harmonyTouch.OwnActivity;
  readonly removedActivity?: number | string;
  readonly favourites?: harmonyTouch.OwnFavourites;
  readonly favouritesBack?: true;
  /** 8.4: the Settings description, and the lab path of the Context description, never its content. */
  readonly settings?: harmonyTouch.OwnSettings;
  readonly context?: string;
  readonly settingsBack?: true;
  /** 8.5: the devices and activities taken out, by name, or their put back. */
  readonly removal?: harmonyTouch.NamedRemoval;
  readonly removalBack?: true;
  /** 8.6: the path of the setup's description, or its put back. */
  readonly setup?: string;
  readonly setupBack?: true;
}

const readSet = (folder: string): TouchSet => JSON.parse(readFileSync(join(folder, 'set.json'), 'utf8')) as TouchSet;
const readRecord = (folder: string): Partial<DeviceRecord> & SetRecord => {
  const file = join(folder, 'sources.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Partial<DeviceRecord> & SetRecord) : {};
};
const tagsOfTheChain = (folder: string): Set<string> => chainTags(folder, (at) => ({ set: readSet(at), record: readRecord(at) }));
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers);

/** The favourites documents and pictures the recorded full sync delivered, the last of Logitech's on the bench unit. */
const recordedContent = (): SetAnswer[] =>
  (answersWritten(sessions(commands(records('touch_full_sync_recording'))).filter((x) => x.path === '/sys/hlapi')) as unknown as SetAnswer[])
    .filter(isContent);
/** What the remote holds at each favourites address and picture once the set in `folder` is committed. */
const heldAfter = (folder: string | undefined): Map<string, SetAnswer> =>
  heldContent(folder, (at) => ({ set: readSet(at), record: readRecord(at) }), recordedContent());

function build(folder: string): void {
  const out = insideTheLab(folder, 'the set folder');
  if (existsSync(out) && readdirSync(out).length > 0) fail(`${out} already holds files, and a set is never written over`);
  const fromFolder = argument('from');
  const description = argument('device');
  const removeId = argument('remove');
  const activityDescription = argument('activity');
  const removeActivityId = argument('remove-activity');
  const favouritesDescription = argument('favourites');
  const favouritesBack = process.argv.includes('--favourites-back') ? true : undefined;
  const settingsDescription = argument('settings');
  const settingsBack = process.argv.includes('--settings-back') ? true : undefined;
  const removalDescription = argument('removal');
  const removalBack = process.argv.includes('--removal-back') ? true : undefined;
  const setupDescription = argument('setup');
  const setupBack = process.argv.includes('--setup-back') ? true : undefined;
  const given = [description, removeId, activityDescription, removeActivityId, favouritesDescription, favouritesBack, settingsDescription, settingsBack,
    removalDescription, removalBack, setupDescription, setupBack].filter((x) => x !== undefined).length;
  if (fromFolder === undefined || given !== 1) {
    fail('--build needs --from <set folder> and one of --device <description>, --remove <device id>, --activity <description>, '
      + '--remove-activity <activity id>, --favourites <description>, --favourites-back, --settings <description> with --context <lab description>, '
      + '--settings-back, --removal <description>, --removal-back, --setup <description> or --setup-back');
  }
  const from = insideTheLab(fromFolder, 'the source set');
  const source = readSet(from);
  const name = basename(out);
  if (favouritesDescription !== undefined || favouritesBack !== undefined) {
    buildFavourites(out, from, source, name, favouritesDescription);
    return;
  }
  if (settingsDescription !== undefined || settingsBack !== undefined) {
    buildSettings(out, from, source, name, settingsDescription);
    return;
  }
  if (removalDescription !== undefined || removalBack !== undefined) {
    buildRemoval(out, from, source, name, removalDescription);
    return;
  }
  if (setupDescription !== undefined || setupBack !== undefined) {
    buildSetup(out, from, source, name, setupDescription);
    return;
  }
  let documents: harmonyTouch.DeviceDocuments | harmonyTouch.ActivityDocuments;
  let record: DeviceRecord;
  const idOf = (text: string): number | string => (/^[0-9]+$/.test(text) ? Number(text) : text);
  try {
    if (activityDescription !== undefined) {
      const activity = (JSON.parse(readFileSync(activityDescription, 'utf8')) as { activity?: harmonyTouch.OwnActivity }).activity;
      if (activity === undefined) fail(`${activityDescription} holds no activity`);
      const was = documentsOf(source);
      documents = harmonyTouch.withTouchActivity(was, harmonyTouch.composeTouchActivity(activity, was));
      record = { name, from, activity };
    } else if (removeActivityId !== undefined) {
      const id = idOf(removeActivityId);
      documents = harmonyTouch.withoutTouchActivity(documentsOf(source), id);
      record = { name, from, removedActivity: id };
    } else if (description !== undefined) {
      const device = (JSON.parse(readFileSync(description, 'utf8')) as { device?: harmonyTouch.RowDevice }).device;
      if (device === undefined) fail(`${description} holds no device`);
      documents = harmonyTouch.withTouchDevice(documentsOf(source), harmonyTouch.composeTouchDeviceOfRow(device));
      record = { name, from, device };
    } else {
      const id = idOf(removeId!);
      documents = harmonyTouch.withoutTouchDevice(documentsOf(source), id);
      record = { name, from, removed: id };
    }
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal) fail(`refused, no set written: ${e.message}`);
    throw e;
  }
  const built = changeDocuments({ set: source, documents: { ...documents }, name, tagsInPlay: tagsOfTheChain(from) });
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  const lists = kindOf(record) === 'activity' ? ACTIVITY_DOCUMENTS : DEVICE_DOCUMENTS;
  const what = record.device !== undefined ? `${record.device.name} added` : record.activity !== undefined ? `${record.activity.name} added`
    : record.removed !== undefined ? `device ${String(record.removed)} taken out` : `activity ${String(record.removedActivity)} taken out`;
  console.log(`built ${out}: ${what}, ${lists.map(([d]) => d).join(', ')} under new tags, the other ${OWN_SET_DOCUMENTS.length - lists.length} under the source's, the gate passed`);
}

/**
 * `--build --favourites` and `--build --favourites-back`, the header: the content composed, or put back as the remote
 * held it before the set in `from`, beside `from`'s six.
 */
function buildFavourites(out: string, from: string, source: TouchSet, name: string, description: string | undefined): void {
  const held = heldAfter(from);
  let content;
  let record: DeviceRecord;
  if (description !== undefined) {
    const favourites = (JSON.parse(readFileSync(description, 'utf8')) as { favourites?: harmonyTouch.OwnFavourites }).favourites;
    if (favourites === undefined) fail(`${description} holds no favourites`);
    try {
      content = contentOfComposed(harmonyTouch.composeTouchFavourites(favourites, documentsHeld(source, held)));
    } catch (e) {
      if (e instanceof harmonyTouch.ComposeRefusal) fail(`refused, no set written: ${e.message}`);
      throw e;
    }
    record = { name, from, favourites };
  } else {
    const forward = readRecord(from);
    if (forward.favourites === undefined || typeof forward.from !== 'string') fail(`${from} records no favourites delivered, so there is nothing to put back`);
    const put = putBackContent(source, heldAfter(forward.from));
    if (!Array.isArray(put)) fail(`refused, no set written: ${put.refusals.join('; ')}`);
    content = put;
    record = { name, from, favouritesBack: true };
  }
  const built = withContent({ set: source, content, held, name, tagsInPlay: tagsOfTheChain(from) });
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  const delivered = built.set.answers.filter(isContent).map((a) => contentKind(a.uri));
  console.log(`built ${out}: ${record.favourites !== undefined ? 'favourites of ours' : 'the favourites put back'}, delivering ${delivered.join(', ')}; `
    + `the six under the source's tags, the gate passed`);
}

/**
 * `--build --settings` and `--build --settings-back`, the header: Settings and Context composed, or put back as the
 * remote held them before the set in `from`, beside `from`'s other four.
 */
function buildSettings(out: string, from: string, source: TouchSet, name: string, description: string | undefined): void {
  let built: { readonly set: TouchSet } | { readonly refusals: readonly string[] };
  let record: DeviceRecord;
  if (description !== undefined) {
    const settings = (JSON.parse(readFileSync(description, 'utf8')) as { settings?: harmonyTouch.OwnSettings }).settings;
    if (settings === undefined) fail(`${description} holds no settings`);
    const contextFile = argument('context');
    if (contextFile === undefined) fail('--settings needs --context <lab description>, the seven Context fields a Touch reads');
    const contextPath = insideTheLab(contextFile, 'the Context description');
    const context = (JSON.parse(readFileSync(contextPath, 'utf8')) as { context?: harmonyTouch.OwnContext }).context;
    if (context === undefined) fail(`${contextPath} holds no context`);
    built = withSettingsAndContext({ set: source, settings: settings!, context: context!, name, tagsInPlay: tagsOfTheChain(from) });
    record = { name, from, settings: settings!, context: contextPath };
  } else {
    const forward = readRecord(from);
    if (forward.settings === undefined || typeof forward.from !== 'string') fail(`${from} records no Settings delivered, so there is nothing to put back`);
    built = putBackSettingsAndContext(source, readSet(insideTheLab(String(forward.from), 'the set it was built from')));
    record = { name, from, settingsBack: true };
  }
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`built ${out}: ${record.settings !== undefined ? 'Settings of ours and Context composed' : 'Settings and Context put back'}, `
    + `${SETTINGS_SET_DOCUMENTS.join(' and ')} under ${record.settings !== undefined ? 'new tags' : 'the tags the remote held before'}, the other four under the source's, the gate passed`);
}

/**
 * `--build --removal` and `--build --removal-back`, the header: devices and activities of the remote's own taken out of
 * the source, or the documents the removal in `from` changed put back as the remote held them.
 */
function buildRemoval(out: string, from: string, source: TouchSet, name: string, description: string | undefined): void {
  let built: { readonly set: TouchSet } | { readonly refusals: readonly string[] };
  let record: DeviceRecord;
  if (description !== undefined) {
    const removal = (JSON.parse(readFileSync(description, 'utf8')) as { removal?: harmonyTouch.NamedRemoval }).removal;
    if (removal === undefined) fail(`${description} holds no removal`);
    built = withRemoval({ set: source, removal: removal!, name, tagsInPlay: tagsOfTheChain(from) });
    record = { name, from, removal: removal! };
  } else {
    const forward = readRecord(from);
    if (forward.removal === undefined || typeof forward.from !== 'string') fail(`${from} records no removal, so there is nothing to put back`);
    built = putBackRemoval(source, readSet(insideTheLab(String(forward.from), 'the set it was built from')));
    record = { name, from, removalBack: true };
  }
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  const delivered = setDifferences(source, built.set).filter((d) => d.tagChanged).map((d) => d.document);
  console.log(`built ${out}: ${record.removal !== undefined ? `${[...(record.removal.activities ?? []), ...(record.removal.devices ?? [])].join(' and ')} taken out` : 'the removal put back'}, `
    + `${delivered.join(', ')} under ${record.removal !== undefined ? 'new tags' : 'the tags the remote held before'}, the other ${OWN_SET_DOCUMENTS.length - delivered.length} under the source's, the gate passed`);
}

/**
 * `--build --setup` and `--build --setup-back`, the header: a whole setup composed onto the source with its devices
 * and activities taken out, or the four documents the setup in `from` composed put back as the remote held them.
 */
function buildSetup(out: string, from: string, source: TouchSet, name: string, description: string | undefined): void {
  let built: { readonly set: TouchSet } | { readonly refusals: readonly string[] };
  let record: DeviceRecord;
  if (description !== undefined) {
    const setup = (JSON.parse(readFileSync(description, 'utf8')) as { setup?: harmonyTouch.TouchSetup }).setup;
    if (setup === undefined) fail(`${description} holds no setup`);
    built = withSetup({ set: source, setup: setup!, name, tagsInPlay: tagsOfTheChain(from) });
    record = { name, from, setup: description };
  } else {
    const forward = readRecord(from);
    if (forward.setup === undefined || typeof forward.from !== 'string') fail(`${from} records no setup, so there is nothing to put back`);
    built = putBackSetup(source, readSet(insideTheLab(String(forward.from), 'the set it was built from')));
    record = { name, from, setupBack: true };
  }
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`built ${out}: ${record.setup !== undefined ? 'the whole setup composed' : 'the setup put back'}, ${SETUP_DOCUMENTS.join(', ')} under `
    + `${record.setup !== undefined ? 'new tags' : 'the tags the remote held before'}, Context and Settings under the source's, the gate passed`);
}

/** `--describe-setup`, the header: a set's setup described, written into a new file; it holds no value of the account. */
function describeSetup(folder: string): void {
  const outFile = argument('out');
  if (outFile === undefined) fail('--describe-setup needs --out <new description file>');
  const out = resolve(outFile!);
  if (existsSync(out)) fail(`${out} exists, and a description is never written over`);
  const set = sixOf(readSet(insideTheLab(folder, 'the set folder')));
  const setup = harmonyTouch.describeTouchSetup(documentsOf(set), SETUP_IDS);
  const about = `todo-touch.md 8.6: the bench Harmony Touch's whole test setup as the person built it in Logitech's software, `
    + `described from the set it held, ${basename(folder)}, by describeTouchSetup in packages/codec/src/harmony-touch/setup.ts: each device `
    + 'by its maker and model, which find its catalogue record, and what was chosen for it, its name, control port, press repeats, delays, '
    + 'power and input settings and its own map; each activity with its roles, inputs, steps, map, gestures and sequences. Ids of ours, '
    + `OWN_IDS: devices from ${SETUP_IDS.device}, activities from ${SETUP_IDS.activity}, sequences from ${SETUP_IDS.sequence}. `
    + 'No code, address or key: the commands, their codes and the definitions are the catalogue record\'s, and composeTouchSetup carries them.';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${setupJson({ about, setup }, '')}\n`);
  console.log(`described ${basename(folder)} into ${out}: ${setup.devices.length} devices, ${setup.activities.length} activities, `
    + `${setup.devices.reduce((n, d) => n + d.buttons.length, 0) + setup.activities.reduce((n, a) => n + (a.buttons?.length ?? 0), 0)} buttons`);
}

/**
 * A description as JSON a person reads: indented, with each button, role, step and sequence step on a line of its own,
 * so the 616 buttons of the bench setup read as a list of keys and entries rather than as a page per button.
 */
function setupJson(x: unknown, indent: string): string {
  const oneLine = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v)
    && ('press' in v || 'roles' in v || 'delaySeconds' in v || 'command' in v || 'channel' in v);
  if (Array.isArray(x)) {
    if (x.length === 0) return '[]';
    return `[\n${x.map((v) => `${indent} ${oneLine(v) ? JSON.stringify(v) : setupJson(v, `${indent} `)}`).join(',\n')}\n${indent}]`;
  }
  if (typeof x === 'object' && x !== null) {
    if (oneLine(x)) return JSON.stringify(x);
    const entries = Object.entries(x);
    if (entries.length === 0) return '{}';
    return `{\n${entries.map(([k, v]) => `${indent} ${JSON.stringify(k)}: ${setupJson(v, `${indent} `)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(x);
}

/** `--describe-context`, the header: a set's Context as a description, written into a new lab file and never printed. */
function describeContext(folder: string): void {
  const outFile = argument('out');
  if (outFile === undefined) fail('--describe-context needs --out <new lab file>');
  const out = insideTheLab(outFile, 'the description file');
  if (existsSync(out)) fail(`${out} exists, and a description is never written over`);
  const context = readSet(insideTheLab(folder, 'the set folder')).answers.find((a) => keyOf(a.uri) === 'Context');
  if (context === undefined) fail(`${folder} holds no Context`);
  const description = harmonyTouch.describeTouchContext(context!.resource as harmonyTouch.Context);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ context: description }, null, 2)}\n`);
  console.log(`wrote ${out}: the ${Object.keys(description).length} Context fields a Touch reads, as the set holds them`);
}

/**
 * `--check` of a Settings set, the header: the gate and the reader; the six documents and nothing else; Settings
 * differing from the source in exactly the rows the description names, by the values it gives, or for a put back in
 * the rows the forward set changed, back to the source's before it; Context equal to the source's, and to what the
 * description composes; the other four the source's, content and tags; the two tags new and the set's name's, or for
 * a put back the ones the remote held before; what a remote holding the source is answered and the write's size.
 */
function checkSettings(set: TouchSet, record: Partial<DeviceRecord> & SetRecord, say: (ok: boolean, line: string) => void): void {
  const from = insideTheLab(String(record.from), 'the source set');
  const source = sixOf(readSet(from));
  const name = String(record.name);
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals: ${gate.refusals.join('; ')}` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  const read = harmonyTouch.readConfiguration(documentsOf(set));
  say(read.absent.length === 0 && read.settings !== undefined && read.context !== undefined, `the reader read it, the settings and the context among it`);
  const findings = harmonyTouch.checkConfiguration(read);
  const before = harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(documentsOf(source)));
  say(findings.length === before.length, `the check, ${findings.length} findings here and ${before.length} on the source, none refused`);
  say(set.answers.length === OWN_SET_DOCUMENTS.length && OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)),
    `the six documents and nothing else, ${set.answers.length} answers`);

  const was = documentsOf(source);
  const now = documentsOf(set);
  // The rows the description names, or for a put back the rows the forward set changed.
  const forward = record.settingsBack ? readSet(from) : undefined;
  const beforeForward = forward === undefined ? undefined : sixOf(readSet(insideTheLab(String(readRecord(from).from), 'the set before the forward set')));
  const named = record.settings !== undefined ? Object.keys(record.settings.values) : settingsChanges(documentsOf(beforeForward!)['Settings'], was['Settings']).rows.map((r) => r.name);
  const changes = settingsChanges(was['Settings'], now['Settings']);
  const expected = (n: string): string | undefined => (record.settings !== undefined ? record.settings.values[n]
    : settingsChanges(documentsOf(beforeForward!)['Settings'], was['Settings']).rows.find((r) => r.name === n)?.was);
  console.log('Settings, the rows that change:');
  for (const r of changes.rows) {
    const row = harmonyTouch.SETTING_ROWS[r.name];
    console.log(`  ${r.name}: ${r.was ?? 'none'} to ${r.now ?? 'none'}${row === undefined ? '' : `, ${row.what}, acting ${row.acts}`}`);
  }
  say(changes.rows.length === named.length && named.every((n) => changes.rows.some((r) => r.name === n && r.now === expected(n))) && changes.restEqual,
    `Settings: ${changes.rows.length} rows differ, ${named.join(' and ')}, to the values ${record.settings !== undefined ? 'the description gives' : 'the remote held before'}; everything else ${changes.restEqual ? 'equal' : 'NOT equal'}`);
  const contextSame = differences(was['Context'], now['Context']).length === 0;
  say(contextSame, `Context: content ${contextSame ? 'equal' : 'NOT equal'} to the source's`);
  if (record.settings !== undefined && typeof record.context === 'string') {
    const description = (JSON.parse(readFileSync(insideTheLab(record.context, 'the Context description'), 'utf8')) as { context: harmonyTouch.OwnContext }).context;
    const composed = harmonyTouch.composeTouchContext(description, was['Context'] as harmonyTouch.Context);
    say(JSON.stringify(composed) === JSON.stringify(now['Context']), 'Context: the description composes exactly this document, key order included');
    const fields = harmonyTouch.CONTEXT_FIELDS_READ;
    say(Object.keys(description).length === fields.length, `Context: the description states the ${fields.length} fields a Touch reads, and the other ${Object.keys(now['Context'] as object).length - fields.length} are carried`);
  }
  if (beforeForward !== undefined) {
    const sameAsBefore = (d: string): boolean => {
      const x = beforeForward.answers.find((a) => keyOf(a.uri) === d);
      const y = set.answers.find((a) => keyOf(a.uri) === d);
      return x !== undefined && y !== undefined && x.etag === y.etag && differences(x.resource, y.resource).length === 0;
    };
    say(SETTINGS_SET_DOCUMENTS.every(sameAsBefore), 'Settings and Context are what the remote held before the set they put back, content and tags');
  }
  const diff = setDifferences(source, set);
  const others = diff.filter((d) => !(SETTINGS_SET_DOCUMENTS as readonly string[]).includes(d.document));
  say(others.every((d) => d.values.length === 0 && !d.tagChanged), `the other ${others.length}: ${others.map((d) => d.document).join(', ')}, content and tags the source's`);
  const retagged = diff.filter((d) => d.tagChanged).map((d) => d.document);
  say(retagged.length === 2 && SETTINGS_SET_DOCUMENTS.every((d) => retagged.includes(d)), `tags: ${retagged.join(', ') || 'none'} new, the other ${diff.length - retagged.length} the source's`);
  const ours = SETTINGS_SET_DOCUMENTS.map((d) => set.answers.find((a) => keyOf(a.uri) === d));
  if (record.settings !== undefined) {
    say(ours.every((a) => a !== undefined && a.etag === setTag(a, name)), 'the two new tags are the ones the set\'s name gives');
    const chain = tagsOfTheChain(from);
    say(ours.every((a) => a?.etag !== undefined && !chain.has(a.etag)), `no new tag is stated by a set of the chain before it, ${chain.size} tags`);
  }
  checkTheRuns(set, source, from, [...SETTINGS_SET_DOCUMENTS], say);
}

/**
 * `--check` of a removal set or its put back, the header: the gate and the reader; the six and nothing else; every
 * finding of the check one the source had; for the removal, nothing of what was taken out left anywhere in the six,
 * by name or by id, the favourites still read whole, every remaining activity's devices found, and the structural diff
 * entry by entry with nothing added, the order of what remains kept and every other field of the four equal; for the
 * put back, the documents the removal changed as the remote held them before, content and tags; the documents
 * delivered retagged and the rest the source's; what a remote holding the source is answered and the write's size.
 */
function checkRemoval(set: TouchSet, record: Partial<DeviceRecord> & SetRecord, say: (ok: boolean, line: string) => void): void {
  const from = insideTheLab(String(record.from), 'the source set');
  const source = sixOf(readSet(from));
  const name = String(record.name);
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals: ${gate.refusals.join('; ')}` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  say(set.answers.length === OWN_SET_DOCUMENTS.length && OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)),
    `the six documents and nothing else, ${set.answers.length} answers`);
  const was = documentsOf(source);
  const now = documentsOf(set);
  const read = harmonyTouch.readConfiguration(now);
  say(read.absent.length === 0, `the reader read it, ${read.activities.length} activities, ${read.devices.length} devices, ${read.maps.length} button maps, ${read.protocols.length} protocols`);
  const findings = harmonyTouch.checkConfiguration(read);
  const before = harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(was));
  say(findings.every((f) => before.some((b) => b.rule === f.rule && b.message === f.message)) && findings.filter((f) => f.effect === 'refused').length === 0,
    `the check, ${findings.length} findings here and ${before.length} on the source, each of a rule and kind the source has, none refused`);

  // The favourites as the remote will read them, with the favourites documents it holds.
  const held = heldAfter(from);
  const favourites = harmonyTouch.readConfiguration(documentsHeld(set, held)).favourites;
  const favouritesBefore = harmonyTouch.readConfiguration(documentsHeld(source, held)).favourites;
  say(favourites.length === favouritesBefore.length && favourites.every((f, i) => f.missing.length === 0 && f.device?.name === favouritesBefore[i]?.device?.name
    && f.favourites.length === favouritesBefore[i]?.favourites.length),
  `the favourites: ${favourites.map((f) => `${f.activity.name ?? 'an activity'} through ${f.device?.name ?? 'no device'}, ${f.favourites.length} channels, ${f.missing.length} documents missing`).join('; ') || 'none'}, as on the source`);
  for (const a of read.activities) {
    say(a.devices.every((d) => d.device !== undefined) && a.map !== undefined,
      `${a.name ?? 'an activity'}, place ${String(a.order)}: ${a.devices.map((d) => d.device?.name ?? 'a missing device').join(', ')}; its map ${a.map === undefined ? 'NOT found' : `found, ${a.map.keys.length} keys, ${a.map.entries.size} entries, ${a.map.gestures.length} gestures`}`);
  }

  const forward = record.removalBack ? readRecord(from) : undefined;
  if (record.removal !== undefined) {
    const removal = record.removal;
    const ids = harmonyTouch.removalOfNames(was, removal);
    const gone = [...(removal.devices ?? []).map((n, i) => [n, ids.devices![i]!] as const), ...(removal.activities ?? []).map((n, i) => [n, ids.activities![i]!] as const)];
    for (const [n, id] of gone) {
      const listed = read.devices.some((d) => d.name === n) || read.activities.some((a) => a.name === n);
      const places = OWN_SET_DOCUMENTS.filter((d) => JSON.stringify(now[d as keyof typeof now]).includes(String(id)));
      say(!listed && places.length === 0, `${n}: in neither list, and its id in ${places.length === 0 ? 'none of the six' : places.join(', ')}`);
    }
  }
  const diff = removalChanges(record.removalBack ? documentsOf(readSet(from)) : was, now);
  if (record.removal !== undefined) {
    console.log('what the removal takes out and changes:');
    for (const c of diff.changes) console.log(`  ${c.document}: ${c.entry}, ${c.kind}${c.details.length > 0 ? `: ${c.details.join('; ')}` : ''}`);
    say(!diff.changes.some((c) => c.kind === 'added') && diff.orderKept && diff.restEqual,
      `nothing added, ${diff.changes.filter((c) => c.kind === 'taken out').length} entries taken out and ${diff.changes.filter((c) => c.kind === 'changed').length} changed, `
      + `the rest in the order it had, every other field of the four ${diff.restEqual ? 'equal' : 'NOT equal'}`);
  } else {
    // The put back against the set before the removal: equal, content and tags.
    const beforeForward = sixOf(readSet(insideTheLab(String(forward?.from), 'the set before the removal')));
    const d = setDifferences(beforeForward, set);
    say(d.every((x) => x.values.length === 0 && !x.tagChanged), `the six are the set before the removal, ${basename(String(forward?.from))}, content and tags: ${d.filter((x) => x.values.length > 0 || x.tagChanged).map((x) => x.document).join(', ') || 'all equal'}`);
    say(diff.changes.every((c) => c.kind === 'added' || c.kind === 'changed'), `against the removal set, ${diff.changes.filter((c) => c.kind === 'added').length} entries back and ${diff.changes.filter((c) => c.kind === 'changed').length} changed back`);
  }

  const sd = setDifferences(source, set);
  const touched = sd.filter((x) => x.values.length > 0).map((x) => x.document);
  const retagged = sd.filter((x) => x.tagChanged).map((x) => x.document);
  say(touched.every((d) => REMOVAL_DOCUMENTS.some(([x]) => x === d)) && JSON.stringify(touched) === JSON.stringify(retagged),
    `content differs in ${touched.join(', ') || 'nothing'}, exactly those retagged, the other ${sd.length - touched.length} the source's, content and tags`);
  if (record.removal !== undefined) {
    const answers = touched.map((d) => set.answers.find((a) => keyOf(a.uri) === d));
    say(answers.every((a) => a !== undefined && a.etag === setTag(a, name)), `the ${touched.length} new tags are the ones the set's name gives`);
    const chain = tagsOfTheChain(from);
    say(answers.every((a) => a?.etag !== undefined && !chain.has(a.etag)), `no new tag is stated by a set of the chain before it, ${chain.size} tags`);
  }
  checkTheRuns(set, source, from, touched, say);
}

/**
 * `--check` of a setup set or its put back, the header: the gate and the reader; the six and nothing else; the check's
 * findings, each one the source has; the favourites read whole through the tuning device; each activity's devices and
 * map found; for the setup, the field by field comparison with the source's documents, Logitech's, every difference
 * explained; for the put back, the source's documents, content and tags; the documents delivered retagged and the rest
 * the source's; what a remote holding the source is answered and the write's size.
 */
function checkSetup(set: TouchSet, record: Partial<DeviceRecord> & SetRecord, say: (ok: boolean, line: string) => void): void {
  const from = insideTheLab(String(record.from), 'the source set');
  const source = sixOf(readSet(from));
  const name = String(record.name);
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals: ${gate.refusals.join('; ')}` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  say(set.answers.length === OWN_SET_DOCUMENTS.length && OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)),
    `the six documents and nothing else, ${set.answers.length} answers`);
  const was = documentsOf(source);
  const now = documentsOf(set);
  const read = harmonyTouch.readConfiguration(now);
  say(read.absent.length === 0, `the reader read it, ${read.activities.length} activities, ${read.devices.length} devices, ${read.maps.length} button maps, ${read.protocols.length} protocols`);
  const findings = harmonyTouch.checkConfiguration(read);
  const before = harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(was));
  say(findings.length === before.length && findings.every((f) => before.some((b) => b.rule === f.rule)) && findings.filter((f) => f.effect === 'refused').length === 0,
    `the check, ${findings.length} findings here and ${before.length} on the source, each of a rule the source has, none refused`);
  const held = heldAfter(from);
  const favourites = harmonyTouch.readConfiguration(documentsHeld(set, held)).favourites;
  const favouritesBefore = harmonyTouch.readConfiguration(documentsHeld(source, held)).favourites;
  say(favourites.length === favouritesBefore.length && favourites.every((f, i) => f.missing.length === 0 && f.device?.name === favouritesBefore[i]?.device?.name
    && f.favourites.length === favouritesBefore[i]?.favourites.length),
  `the favourites: ${favourites.map((f) => `${f.activity.name ?? 'an activity'} through ${f.device?.name ?? 'no device'}, ${f.favourites.length} channels, ${f.missing.length} documents missing`).join('; ') || 'none'}, as on the source`);
  for (const a of read.activities) {
    say(a.devices.every((d) => d.device !== undefined) && a.map !== undefined,
      `${a.name ?? 'an activity'}, place ${String(a.order)}: ${a.devices.map((d) => d.device?.name ?? 'a missing device').join(', ')}; its map ${a.map === undefined ? 'NOT found' : `found, ${a.map.keys.length} keys, ${a.map.entries.size} entries, ${a.map.gestures.length} gestures`}`);
  }
  if (record.setup !== undefined) {
    // Ours against Logitech's, the documents the source holds, field by field.
    const comparison = compareSetup(now, was);
    console.log('our documents against the source\'s, field by field:');
    for (const line of comparisonLines(comparison)) console.log(`  ${line}`);
    const unexplained = comparison.flatMap((c) => c.rows.filter((r) => r.why.startsWith('unexplained')));
    say(unexplained.length === 0, `every field equal, equal after a stated normalisation or different for a stated reason; ${unexplained.length} unexplained`);
  } else {
    const forward = readRecord(from);
    const beforeForward = sixOf(readSet(insideTheLab(String(forward.from), 'the set before the setup')));
    const d = setDifferences(beforeForward, set);
    say(d.every((x) => x.values.length === 0 && !x.tagChanged), `the six are the set before the setup, ${basename(String(forward.from))}, content and tags: ${d.filter((x) => x.values.length > 0 || x.tagChanged).map((x) => x.document).join(', ') || 'all equal'}`);
  }
  const sd = setDifferences(source, set);
  const retagged = sd.filter((x) => x.tagChanged).map((x) => x.document);
  say(JSON.stringify(retagged) === JSON.stringify([...SETUP_DOCUMENTS].sort((x, y) => OWN_SET_DOCUMENTS.indexOf(x) - OWN_SET_DOCUMENTS.indexOf(y))),
    `retagged: ${retagged.join(', ') || 'nothing'}, the other ${sd.length - retagged.length} the source's, content and tags; content differs in ${sd.filter((x) => x.values.length > 0).map((x) => x.document).join(', ') || 'nothing'}`);
  if (record.setup !== undefined) {
    const answers = retagged.map((d) => set.answers.find((a) => keyOf(a.uri) === d));
    say(answers.every((a) => a !== undefined && a.etag === setTag(a, name)), `the ${retagged.length} new tags are the ones the set's name gives`);
    const chain = tagsOfTheChain(from);
    say(answers.every((a) => a?.etag !== undefined && !chain.has(a.etag)), `no new tag is stated by a set of the chain before it, ${chain.size} tags`);
  }
  checkTheRuns(set, source, from, retagged, say);
}

/** Whether a record is of a device added or taken out, an activity, or favourites; undefined when it is none. */
function kindOf(record: Partial<DeviceRecord>): 'device' | 'activity' | 'favourites' | 'settings' | 'removal' | 'setup' | undefined {
  if (record.setup !== undefined || record.setupBack !== undefined) return 'setup';
  if (record.removal !== undefined || record.removalBack !== undefined) return 'removal';
  if (record.settings !== undefined || record.settingsBack !== undefined) return 'settings';
  if (record.device !== undefined || record.removed !== undefined) return 'device';
  if (record.activity !== undefined || record.removedActivity !== undefined) return 'activity';
  if (record.favourites !== undefined || record.favouritesBack !== undefined) return 'favourites';
  return undefined;
}

/**
 * `--check` of a favourites set, the header: the gate and the reader; the six the source's, content and tags; each
 * piece of content, its kind and tag; the favourites as the remote will show them and where each number, name and
 * logo comes from; each picture's form, and that the remote asks for it; for a forward set, the logo is the
 * description's drawing, and for a put back, the content is what the remote held before, tags and all; what a remote
 * holding the source is answered, and the size of each write.
 */
function checkFavourites(dir: string, set: TouchSet, record: Partial<DeviceRecord> & SetRecord, say: (ok: boolean, line: string) => void): void {
  const from = insideTheLab(String(record.from), 'the source set');
  const source = readSet(from);
  const name = String(record.name);
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals: ${gate.refusals.join('; ')}` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  const six = set.answers.filter((a) => !isContent(a));
  const sourceSix = source.answers.filter((a) => !isContent(a));
  const diff = setDifferences({ answers: sourceSix }, { answers: six });
  say(six.length === OWN_SET_DOCUMENTS.length && diff.every((d) => d.values.length === 0 && !d.tagChanged),
    `the six: ${six.length} documents, content and tags the source's`);

  const before = heldAfter(from);
  const after = documentsHeld(set, before);
  const read = harmonyTouch.readConfiguration(after);
  say(read.absent.length === 0 && read.favourites.length === 1 && read.favourites[0]!.missing.length === 0,
    `the reader read the six and the three favourites documents the remote will hold, ${read.favourites.length} favourites activity`);
  const f = read.favourites[0];
  const content = set.answers.filter(isContent);
  const chain = tagsOfTheChain(from);
  // For a put back, what the remote held before the set it puts back: its tags are the ones to restore.
  const forwardRecord = record.favouritesBack ? readRecord(from) : undefined;
  const beforeForward = forwardRecord === undefined ? undefined : heldAfter(typeof forwardRecord.from === 'string' ? forwardRecord.from : undefined);
  for (const a of content) {
    const tagRule = beforeForward !== undefined ? a.etag === beforeForward.get(a.uri)?.etag : a.etag === setTag(a, name);
    say(tagRule && a.etag !== undefined && !chain.has(a.etag) && a.etag !== before.get(a.uri)?.etag,
      `${contentKind(a.uri)}: delivered under ${record.favouritesBack ? 'the tag the remote held before the set it puts back' : 'the tag the set\'s name gives'}, in play nowhere down the chain`);
  }
  if (f !== undefined) {
    console.log(`favourites as the remote will show them, ${f.favourites.length}:`);
    for (const one of f.favourites) {
      const logo = one.logo === undefined ? 'no logo' : `${contentKind(one.logo)}${content.some((a) => a.uri === one.logo) ? ', of this set' : ''}`;
      console.log(`  ${one.number ?? 'no number'} ${one.name ?? 'no name'}: number from ${one.numberAt?.document === 'ContentService' ? 'the line up' : 'its dial position'}, ${logo}`);
    }
    say(f.favourites.every((x) => typeof x.number === 'string' && x.number !== '' && /^[0-9]+$/.test(x.number)), 'every favourite has a number of digits, which a tap sends');
    say(new Set(f.favourites.map((x) => x.number)).size === f.favourites.length, 'no two favourites share a number');
    if (record.favourites !== undefined) {
      say(JSON.stringify(f.favourites.map((x) => x.number)) === JSON.stringify(record.favourites.order), `the order is the description's, ${record.favourites.order.join(', ')}`);
    }
  }
  const asked = logosAsked(after);
  for (const a of content.filter((x) => x['body-type'] === 'image/png')) {
    const bytes = Buffer.from(String(a.resource), 'base64');
    let form = 'does not decode';
    try {
      const h = readPngHeader(bytes);
      form = `${h.width} by ${h.height}, ${h.bitDepth} bits, colour type ${h.colourType}, ${h.interlace === 0 ? 'not ' : ''}interlaced, ${bytes.length} bytes`;
    } catch { /* reported as not decoding */ }
    say(harmonyTouch.pictureRefusals(a.uri, bytes).length === 0, `${contentKind(a.uri)}: ${form}, the codec's picture rule passes it`);
    say(asked.includes(a.uri), `${contentKind(a.uri)}: the remote asks for it, place ${asked.indexOf(a.uri) + 1} of the ${asked.length} logos it asks for`);
    if (record.favourites !== undefined) {
      const drawn = (record.favourites.logos ?? []).map((l) => Buffer.from(harmonyTouch.drawTouchLogo(l.text)).toString('base64'));
      say(drawn.includes(String(a.resource)), `${contentKind(a.uri)}: the drawing of the description's text, byte for byte`);
    }
  }
  if (beforeForward !== undefined) {
    const was = beforeForward;
    say(content.every((a) => {
      const w = was.get(a.uri);
      return w !== undefined && w.etag === a.etag && w['body-type'] === a['body-type'] && JSON.stringify(w.resource) === JSON.stringify(a.resource);
    }) && content.length === readSet(from).answers.filter(isContent).length,
    `the ${content.length} pieces are what the remote held before the set they put back, content and tags`);
  }

  // What the answerer writes for a remote that committed the source, list by list as the remote asks.
  if (!('refusals' in gate) && f !== undefined) {
    // The six alone: what the source delivered beyond them the remote holds, and a report never names an address.
    const sixAnswers = answersWhenHolding(gate.set, { answers: sourceSix }).map((w, i) => `${keyOf(sourceSix[i]!.uri)} ${'refuse' in w ? 'refused' : w.statusCode}`);
    const allSix304 = sixAnswers.every((x) => x.endsWith(' 304'));
    const favourites = [f.addresses.user, f.addresses.device, f.addresses.service].filter((x): x is string => x !== undefined)
      .map((uri) => ({ uri, w: answerOf({ verb: 'get', uri }, { kind: 'set', set: gate.set }) }));
    const pictures = asked.map((uri) => ({ uri, w: answerOf({ verb: 'get', uri, ...(before.get(uri)?.etag === undefined ? {} : { etag: before.get(uri)!.etag! }) }, { kind: 'set', set: gate.set }) }));
    const status = (w: ReturnType<typeof answerOf>): string => ('refuse' in w ? 'refused' : w.statusCode);
    say(allSix304, `a remote holding ${basename(from)} is answered the six ${sixAnswers.join(', ')}`);
    say(favourites.every(({ uri, w }) => status(w) === (content.some((a) => a.uri === uri) ? '200' : '304')),
      `its favourites requests, untagged: ${favourites.map(({ uri, w }) => `${contentKind(uri)} ${status(w)}`).join(', ')}`);
    const delivered = pictures.filter(({ w }) => status(w) === '200').map(({ uri }) => uri);
    say(pictures.every(({ w }) => status(w) === '200' || status(w) === '304')
      && delivered.length === content.filter((a) => a['body-type'] === 'image/png').length,
      `its ${pictures.length} logo requests, with the tags it holds: ${delivered.length} answered 200, ${pictures.length - delivered.length} 304`);
    for (const { uri, w } of favourites.filter(({ w }) => status(w) === '200')) {
      const size = writeOfAnswersSize([w]);
      console.log(`write of answers, ${contentKind(uri)}: ${size.length} characters, ${size.chunks} ${size.chunks === 1 ? 'chunk' : 'chunks'}, the last ${size.last}`);
    }
    const size = writeOfAnswersSize(pictures.map(({ w }) => w));
    console.log(`write of answers, the logos as one list: ${size.length} characters, ${size.chunks} ${size.chunks === 1 ? 'chunk' : 'chunks'}, the last ${size.last}`);
  }

  for (const other of arguments_('same-as')) {
    const otherSet = readSet(insideTheLab(other, 'the set to compare with'));
    const d = setDifferences({ answers: otherSet.answers.filter((a) => !isContent(a)) }, { answers: six });
    say(d.every((x) => x.values.length === 0), `the six against ${basename(other)}: ${d.filter((x) => x.values.length > 0).map((x) => x.document).join(', ') || 'equal'}`);
  }
  for (const file of arguments_('written')) {
    const line = readFileSync(insideTheLab(file, 'the kept write of answers'), 'utf8');
    if (!line.startsWith(`${WRITE_ANSWERS}&`)) fail(`${file} is not a kept write of answers`);
    const responses = (JSON.parse(decodeURIComponent(line.split('&responses=')[1] ?? '')) as { responses: { statusCode?: string; uri?: string; etag?: string; resource?: unknown }[] }).responses;
    for (const r of responses.filter((x) => typeof x.uri === 'string' && (isContent({ uri: x.uri }) || x.uri.startsWith('harmony://')))) {
      const ours = set.answers.find((a) => a.uri === r.uri || (r.uri!.startsWith('harmony://') && keyOf(a.uri) === keyOf(r.uri!)));
      const delivered = r.statusCode === '200';
      const right = ours !== undefined && delivered ? r.etag === ours.etag && JSON.stringify(r.resource) === JSON.stringify(ours.resource) : !delivered;
      const what = r.uri!.startsWith('harmony://') ? keyOf(r.uri!) : contentKind(r.uri!);
      say(right && (ours !== undefined && isContent(ours) ? delivered : true), `the kept write answered ${what} ${r.statusCode ?? 'none'}${delivered ? (right ? ', with this set\'s content and tag' : ', NOT with this set\'s content and tag') : ''}`);
    }
  }
  for (const file of arguments_('hash')) console.log(`config hash against the set's tags: ${compareConfigHash(readFileSync(insideTheLab(file, 'the hash answer'), 'utf8'), set)}`);
  for (const file of arguments_('list')) {
    const text = readFileSync(insideTheLab(file, 'the request list'), 'utf8');
    const requests = (resultOf(text)?.['requests'] ?? []) as RemoteRequest[];
    console.log('request list against the set\'s tags:');
    if (requests.some((r) => typeof r?.uri === 'string' && r.uri.startsWith('harmony://'))) for (const l of compareRequestList(text, set)) console.log(`  ${l}`);
    for (const l of compareContentRequests(requests, set).filter((x) => !x.endsWith('not asked for'))) console.log(`  ${l}`);
  }
}

/**
 * What the answerer writes for a remote that committed the source, the size of that write, and a run's kept files read
 * against the set, `--same-as`, `--written`, `--hash` and `--list`: the end of every `--check` but a favourites set's.
 * `touched` names the documents the set delivers with 200.
 */
function checkTheRuns(set: TouchSet, source: TouchSet, from: string, touched: readonly string[], say: (ok: boolean, line: string) => void): void {
  const gate = prepareSet(set);
  // What the answerer writes for a remote that committed the source.
  if (!('refusals' in gate)) {
    const written = answersWhenHolding(gate.set, source);
    const statuses = written.map((w, i) => `${keyOf(source.answers[i]!.uri)} ${'refuse' in w ? 'refused' : w.statusCode}`);
    const delivered = written.flatMap((w, i) => (!('refuse' in w) && w.statusCode === '200' ? [keyOf(source.answers[i]!.uri)] : []));
    const kept = written.filter((w) => !('refuse' in w) && w.statusCode === '304').length;
    say(delivered.length === touched.length && touched.every((d) => delivered.includes(d)) && kept === OWN_SET_DOCUMENTS.length - touched.length,
      `a remote holding ${basename(from)} is answered ${statuses.join(', ')}`);
    const size = writeOfAnswersSize(written);
    console.log(`write of answers: ${size.length} characters, ${size.chunks} ${size.chunks === 1 ? 'chunk' : 'chunks'} of ${size.perChunk}, the last ${size.last}`);
    // The listener takes `Content-Length: ` anywhere in a chunk as an announcement, and forgets an announcement
    // when a chunk carries a request name other than the write's, `halhttpserverconnector.lua`.
    const starts = Array.from({ length: size.chunks }, (_, i) => size.line.slice(i * size.perChunk, i * size.perChunk + 12));
    say(!size.line.includes('Content-Length') && starts.slice(1).every((s) => !s.startsWith('vnd.logitech')),
      'no chunk carries Content-Length, and no chunk after the first opens with a request name');
  }

  for (const other of arguments_('same-as')) {
    const otherDir = insideTheLab(other, 'the set to compare with');
    // The six alone: a set compared with may carry favourites or pictures, whose addresses hold the account's
    // identifiers and are never printed, `todo-touch.md` 8.4.
    const d = setDifferences(sixOf(readSet(otherDir)), sixOf(set));
    const differing = d.filter((x) => x.values.length > 0).map((x) => x.document);
    const tags = d.filter((x) => x.tagChanged).map((x) => x.document);
    say(differing.length === 0, `content against ${basename(otherDir)}: ${differing.length === 0 ? `equal, ${d.length} of ${d.length} documents as parsed JSON` : `${differing.join(', ')} differ`}; `
      + `tags differing: ${tags.join(', ') || 'none'}`);
  }
  // A run's kept write of answers for the six, against the set: the changed documents 200 with the set's content
  // and tag, the others 304.
  for (const file of arguments_('written')) {
    const line = readFileSync(insideTheLab(file, 'the kept write of answers'), 'utf8');
    if (!line.startsWith(`${WRITE_ANSWERS}&`)) fail(`${file} is not a kept write of answers`);
    const responses = (JSON.parse(decodeURIComponent(line.split('&responses=')[1] ?? '')) as { responses: { statusCode?: string; uri?: string; etag?: string; resource?: unknown }[] }).responses
      .filter((a) => typeof a.uri === 'string' && a.uri.startsWith('harmony://'));
    const ofSet = (uri: string): SetAnswer | undefined => set.answers.find((a) => keyOf(a.uri) === keyOf(uri));
    const delivered = responses.filter((a) => a.statusCode === '200');
    const right = delivered.length === touched.length && delivered.every((a) => touched.includes(keyOf(a.uri!))
      && a.etag === ofSet(a.uri!)?.etag && JSON.stringify(a.resource) === JSON.stringify(ofSet(a.uri!)?.resource));
    say(right && responses.length === OWN_SET_DOCUMENTS.length && responses.filter((a) => a.statusCode === '304').length === OWN_SET_DOCUMENTS.length - touched.length,
      `the kept write answered ${responses.map((a) => `${keyOf(a.uri!)} ${a.statusCode ?? 'none'}`).join(', ')}; `
      + `${right ? `the ${touched.length} with this set's content and tags` : `not this set's ${touched.length} documents alone`}`);
  }
  for (const file of arguments_('hash')) console.log(`config hash against the set's tags: ${compareConfigHash(readFileSync(insideTheLab(file, 'the hash answer'), 'utf8'), set)}`);
  for (const file of arguments_('list')) {
    console.log('request list against the set\'s tags:');
    for (const line of compareRequestList(readFileSync(insideTheLab(file, 'the request list'), 'utf8'), set)) console.log(`  ${line}`);
  }
}

function check(folder: string): void {
  const dir = insideTheLab(folder, 'the set folder');
  const set = readSet(dir);
  const record = readRecord(dir);
  const kind = kindOf(record);
  if (kind === undefined || typeof record.from !== 'string' || typeof record.name !== 'string') {
    fail(`${dir} records no device, activity, favourites, settings, removal or setup, so it is not a set this script built`);
  }
  if (kind === 'setup') {
    let wrong = 0;
    checkSetup(set, record, (ok, line) => {
      if (!ok) wrong += 1;
      console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
    });
    if (wrong > 0) process.exit(1);
    return;
  }
  if (kind === 'removal') {
    let wrong = 0;
    checkRemoval(set, record, (ok, line) => {
      if (!ok) wrong += 1;
      console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
    });
    if (wrong > 0) process.exit(1);
    return;
  }
  if (kind === 'settings') {
    let wrong = 0;
    checkSettings(set, record, (ok, line) => {
      if (!ok) wrong += 1;
      console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
    });
    if (wrong > 0) process.exit(1);
    return;
  }
  if (kind === 'favourites') {
    let wrong = 0;
    checkFavourites(dir, set, record, (ok, line) => {
      if (!ok) wrong += 1;
      console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
    });
    if (wrong > 0) process.exit(1);
    return;
  }
  const adds = record.device !== undefined || record.activity !== undefined;
  const lists = kind === 'activity' ? ACTIVITY_DOCUMENTS : DEVICE_DOCUMENTS;
  const name = record.name;
  const from = insideTheLab(record.from, 'the source set');
  const source = readSet(from);
  let bad = 0;
  const say = (ok: boolean, line: string): void => {
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
  };

  // The gate and the codec's reader, as the answerer and the remote's engine meet the set.
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals: ${gate.refusals.join('; ')}` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  const read = harmonyTouch.readConfiguration(documentsOf(set));
  say(read.absent.length === 0, `the reader read it, ${read.activities.length} activities, ${read.devices.length} devices, `
    + `${read.maps.length} button maps, ${read.protocols.length} protocols`);
  const findings = harmonyTouch.checkConfiguration(read);
  const before = harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(documentsOf(source)));
  say(findings.length === before.length, `the check, ${findings.length} findings here and ${before.length} on the source, none refused`);
  say(set.answers.length === OWN_SET_DOCUMENTS.length && OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)),
    `the six documents and nothing else, ${set.answers.length} answers`);

  // The device or the activity as the reader sees it, or its absence.
  const id = String(record.device?.id ?? record.removed ?? record.activity?.id ?? record.removedActivity);
  const device = read.devices.find((d) => d.id === id);
  const activity = read.activities.find((a) => a.id === id);
  if (record.activity !== undefined) {
    const a = record.activity;
    say(activity !== undefined && activity.name === a.name && !activity.hidden && activity.type === harmonyTouch.ACTIVITY_TYPES.indexOf(a.type),
      `${a.name}: listed at place ${String(activity?.order)}, type ${String(activity?.type)}, not hidden`);
    const devices = activity?.devices ?? [];
    say(devices.length === a.devices.length && devices.every((d) => d.device !== undefined && (typeof d.role.input !== 'string' || d.role.inputKnown)),
      `its devices in power on order: ${devices.map((d) => `${d.device?.name ?? 'unknown'}${typeof d.role.input === 'string' ? ` (${d.role.input})` : ''}`).join(', ')}`);
    const steps = [...(activity?.enter ?? []), ...(activity?.leave ?? [])];
    say(steps.length === (a.enter?.length ?? 0) + (a.leave?.length ?? 0) && steps.every((x) => x.kind === 'delay' || x.command !== undefined),
      `its start steps, ${(activity?.enter ?? []).map((x) => (x.kind === 'delay' ? `${(x.durationMs ?? 0) / 1000} s` : `${x.device?.name} ${x.commandName}`)).join(', ') || 'none'}; `
      + `its end steps, ${(activity?.leave ?? []).map((x) => (x.kind === 'delay' ? `${(x.durationMs ?? 0) / 1000} s` : `${x.device?.name} ${x.commandName}`)).join(', ') || 'none'}`);
    const map = activity?.map;
    const keys = map?.keys ?? [];
    const entries = [...(map?.entries.values() ?? [])];
    const sends = (b: harmonyTouch.ReadButton) => b.press?.kind === 'command' && b.press.command !== undefined;
    say(map !== undefined && keys.length === Object.keys(a.keys ?? {}).length && entries.length === (a.entries?.length ?? 0) && [...keys, ...entries].every(sends),
      `its map, found by the engine's identifier: ${keys.length} keys, ${entries.length} screen entries, each sending a command its device has`);
    for (const k of keys) console.log(`  ${k.key}: ${k.press?.device?.name ?? 'no device'} ${k.press?.command?.name ?? 'no command'}`);
    for (const e of entries) console.log(`  entry ${e.index} "${e.label}": ${e.press?.device?.name ?? 'no device'} ${e.press?.command?.name ?? 'no command'}`);
  } else if (record.removedActivity !== undefined) {
    say(activity === undefined, `activity ${id} is not in the activity list`);
  } else if (record.device !== undefined) {
    const d = record.device;
    const commands = device?.commands ?? [];
    const sendable = commands.filter((c) => c.protocol !== undefined && typeof c.keyCode === 'string');
    say(device !== undefined && device.name === d.name && commands.length === d.commands.length && sendable.length === commands.length,
      `${d.name}: ${commands.length} commands read, ${sendable.length} with a definition and a key code`);
    const map = device?.map;
    const keys = map?.keys.filter((k) => k.press?.kind === 'command' && k.press.deviceId === id) ?? [];
    const list = [...(map?.entries.values() ?? [])];
    say(map !== undefined && keys.length > 0 && list.length === d.commands.filter((c) => c.onScreen !== false).length,
      `its map, found by the engine's identifier: ${keys.length} keys, ${list.length} screen entries`);
    for (const c of commands) console.log(`  ${c.name}: ${c.keyCode ?? 'no key code'}`);
  } else {
    say(device === undefined, `device ${id} is not in the device list`);
  }

  // Against the source: one entry of each of the lists, and nothing else anywhere.
  const was = documentsOf(source);
  const now = documentsOf(set);
  for (const [document, field] of lists) {
    const c = listChanges(was[document], now[document], field);
    const one = adds ? c.added.length === 1 && c.removed.length === 0 : c.added.length === 0 && c.removed.length === 1;
    say(one && c.restEqual, `${document}: ${c.added.length} entries added (${c.added.map((i) => `/${field}/${i}`).join(', ') || 'none'}), `
      + `${c.removed.length} taken out (${c.removed.map((i) => `/${field}/${i}`).join(', ') || 'none'}), everything else ${c.restEqual ? 'equal' : 'NOT equal'}`);
  }
  const diff = setDifferences(source, set);
  const changedDocs = diff.filter((d) => d.values.length > 0).map((d) => d.document);
  const touched = lists.map(([d]) => d);
  say(changedDocs.length === touched.length && touched.every((d) => changedDocs.includes(d)), `content differs in ${changedDocs.join(', ') || 'nothing'}, the other ${diff.length - changedDocs.length} equal`);
  const retagged = diff.filter((d) => d.tagChanged).map((d) => d.document);
  say(retagged.length === touched.length && touched.every((d) => retagged.includes(d)), `tags: ${retagged.join(', ') || 'none'} new, the other ${diff.length - retagged.length} the source's`);
  const answers = touched.map((d) => set.answers.find((a) => keyOf(a.uri) === d));
  say(answers.every((a) => a !== undefined && a.etag === setTag(a, name)), `the ${touched.length} new tags are the ones the set's name gives`);
  const chain = tagsOfTheChain(from);
  say(answers.every((a) => a?.etag !== undefined && !chain.has(a.etag)), `no new tag is stated by a set of the chain before it, ${chain.size} tags`);

  checkTheRuns(set, source, from, touched, say);
  if (bad > 0) process.exit(1);
}

const toBuild = argument('build');
const toCheck = argument('check');
const toDescribe = argument('describe-context');
const toDescribeSetup = argument('describe-setup');
if ([toBuild, toCheck, toDescribe, toDescribeSetup].filter((x) => x !== undefined).length !== 1) {
  fail('one of --build <new lab folder>, --check <set folder>, --describe-context <set folder> --out <new lab file> '
    + 'or --describe-setup <set folder> --out <new description file>');
}
if (toBuild !== undefined) build(toBuild);
else if (toDescribe !== undefined) describeContext(toDescribe);
else if (toDescribeSetup !== undefined) describeSetup(toDescribeSetup);
else check(toCheck!);
