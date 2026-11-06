/**
 * Build a Harmony Touch set with a device of ours added, or taken out again, from a set the remote holds, check
 * it, and compare what the remote reports afterwards with it: `todo-touch.md` 8.1. It opens no remote: it reads
 * the lab and the device's description and writes into the lab.
 *
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --device <description>
 *   node packages/corpus/bin/touch-device-set.ts --build <new lab folder> --from <set folder> --remove <device id>
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
 * **`--check`** reads the set back as `touch-sync.ts` will, the gate and the codec's reader, and the device as
 * the reader sees it: its commands each with a definition and a key code, its map found by the identifier the
 * engine builds, its keys and its screen list. Against its source: each of the three documents differs by
 * exactly one entry of its list, added or taken out, and in nothing else, `listChanges`, and the other three
 * not at all; exactly those three tags are new, the ones the set's name gives, and in play nowhere in the chain;
 * a remote holding the source is answered three 200 and three 304, a write of answers it sizes. `--same-as`,
 * `--written`, `--hash` and `--list` are `touch-changed-set.ts`'s.
 *
 * **What it prints**: counts, document names, places in a list, `equal` or `not equal`, and the device's own
 * names and numbers, which are ours; never a tag, an address or any other value out of a document, since the
 * documents hold the household's account.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { harmonyTouch } from '@harmony/codec';
import { LAB } from '@harmony/lab';

import {
  answersWhenHolding,
  chainTags,
  changeDocuments,
  listChanges,
  setDifferences,
  writeOfAnswersSize,
  type SetRecord,
} from '../src/touchchangedset.ts';
import { OWN_SET_DOCUMENTS, compareConfigHash, compareRequestList } from '../src/touchownset.ts';
import { WRITE_ANSWERS, keyOf, prepareSet, setTag, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** The three documents a device is told to a Touch in, and the list in each that holds it. */
export const DEVICE_DOCUMENTS: readonly (readonly [string, string])[] = [
  ['DeviceList', 'DevicesWithFeatures'], ['MapList', 'ButtonMaps'], ['ProtocolList', 'Protocols'],
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

/** What `--build` records beside the set: the device added, or the id taken out. */
interface DeviceRecord {
  readonly name: string;
  readonly from: string;
  readonly device?: harmonyTouch.RowDevice;
  readonly removed?: number | string;
}

const readSet = (folder: string): TouchSet => JSON.parse(readFileSync(join(folder, 'set.json'), 'utf8')) as TouchSet;
const readRecord = (folder: string): Partial<DeviceRecord> & SetRecord => {
  const file = join(folder, 'sources.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Partial<DeviceRecord> & SetRecord) : {};
};
const tagsOfTheChain = (folder: string): Set<string> => chainTags(folder, (at) => ({ set: readSet(at), record: readRecord(at) }));
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers);

function build(folder: string): void {
  const out = insideTheLab(folder, 'the set folder');
  if (existsSync(out) && readdirSync(out).length > 0) fail(`${out} already holds files, and a set is never written over`);
  const fromFolder = argument('from');
  const description = argument('device');
  const removeId = argument('remove');
  if (fromFolder === undefined || (description === undefined) === (removeId === undefined)) {
    fail('--build needs --from <set folder> and one of --device <description> or --remove <device id>');
  }
  const from = insideTheLab(fromFolder, 'the source set');
  const source = readSet(from);
  const name = basename(out);
  let documents: harmonyTouch.DeviceDocuments;
  let record: DeviceRecord;
  try {
    if (description !== undefined) {
      const device = (JSON.parse(readFileSync(description, 'utf8')) as { device?: harmonyTouch.RowDevice }).device;
      if (device === undefined) fail(`${description} holds no device`);
      documents = harmonyTouch.withTouchDevice(documentsOf(source), harmonyTouch.composeTouchDeviceOfRow(device));
      record = { name, from, device };
    } else {
      const id = /^[0-9]+$/.test(removeId!) ? Number(removeId) : removeId!;
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
  console.log(`built ${out}: ${record.device !== undefined ? `${record.device.name} added` : `device ${String(record.removed)} taken out`}, `
    + `${DEVICE_DOCUMENTS.map(([d]) => d).join(', ')} under new tags, the other ${OWN_SET_DOCUMENTS.length - DEVICE_DOCUMENTS.length} under the source's, the gate passed`);
}

function check(folder: string): void {
  const dir = insideTheLab(folder, 'the set folder');
  const set = readSet(dir);
  const record = readRecord(dir);
  if ((record.device === undefined && record.removed === undefined) || typeof record.from !== 'string' || typeof record.name !== 'string') {
    fail(`${dir} records no device added or taken out, so it is not a set this script built`);
  }
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

  // The device as the reader sees it, or its absence.
  const id = String(record.device?.id ?? record.removed);
  const device = read.devices.find((d) => d.id === id);
  if (record.device !== undefined) {
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

  // Against the source: one entry of each of the three lists, and nothing else anywhere.
  const was = documentsOf(source);
  const now = documentsOf(set);
  for (const [document, field] of DEVICE_DOCUMENTS) {
    const c = listChanges(was[document], now[document], field);
    const one = record.device !== undefined ? c.added.length === 1 && c.removed.length === 0 : c.added.length === 0 && c.removed.length === 1;
    say(one && c.restEqual, `${document}: ${c.added.length} entries added (${c.added.map((i) => `/${field}/${i}`).join(', ') || 'none'}), `
      + `${c.removed.length} taken out (${c.removed.map((i) => `/${field}/${i}`).join(', ') || 'none'}), everything else ${c.restEqual ? 'equal' : 'NOT equal'}`);
  }
  const diff = setDifferences(source, set);
  const changedDocs = diff.filter((d) => d.values.length > 0).map((d) => d.document);
  const three = DEVICE_DOCUMENTS.map(([d]) => d);
  say(changedDocs.length === three.length && three.every((d) => changedDocs.includes(d)), `content differs in ${changedDocs.join(', ') || 'nothing'}, the other ${diff.length - changedDocs.length} equal`);
  const retagged = diff.filter((d) => d.tagChanged).map((d) => d.document);
  say(retagged.length === three.length && three.every((d) => retagged.includes(d)), `tags: ${retagged.join(', ') || 'none'} new, the other ${diff.length - retagged.length} the source's`);
  const answers = three.map((d) => set.answers.find((a) => keyOf(a.uri) === d));
  say(answers.every((a) => a !== undefined && a.etag === setTag(a, name)), `the three new tags are the ones the set's name gives`);
  const chain = tagsOfTheChain(from);
  say(answers.every((a) => a?.etag !== undefined && !chain.has(a.etag)), `no new tag is stated by a set of the chain before it, ${chain.size} tags`);

  // What the answerer writes for a remote that committed the source.
  if (!('refusals' in gate)) {
    const written = answersWhenHolding(gate.set, source);
    const statuses = written.map((w, i) => `${keyOf(source.answers[i]!.uri)} ${'refuse' in w ? 'refused' : w.statusCode}`);
    const delivered = written.flatMap((w, i) => (!('refuse' in w) && w.statusCode === '200' ? [keyOf(source.answers[i]!.uri)] : []));
    const kept = written.filter((w) => !('refuse' in w) && w.statusCode === '304').length;
    say(delivered.length === three.length && three.every((d) => delivered.includes(d)) && kept === OWN_SET_DOCUMENTS.length - three.length,
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
    const d = setDifferences(readSet(otherDir), set);
    const differing = d.filter((x) => x.values.length > 0).map((x) => x.document);
    const tags = d.filter((x) => x.tagChanged).map((x) => x.document);
    say(differing.length === 0, `content against ${basename(otherDir)}: ${differing.length === 0 ? `equal, ${d.length} of ${d.length} documents as parsed JSON` : `${differing.join(', ')} differ`}; `
      + `tags differing: ${tags.join(', ') || 'none'}`);
  }
  // A run's kept write of answers for the six, against the set: the three 200 with the set's content and tag,
  // the other three 304.
  for (const file of arguments_('written')) {
    const line = readFileSync(insideTheLab(file, 'the kept write of answers'), 'utf8');
    if (!line.startsWith(`${WRITE_ANSWERS}&`)) fail(`${file} is not a kept write of answers`);
    const responses = (JSON.parse(decodeURIComponent(line.split('&responses=')[1] ?? '')) as { responses: { statusCode?: string; uri?: string; etag?: string; resource?: unknown }[] }).responses
      .filter((a) => typeof a.uri === 'string' && a.uri.startsWith('harmony://'));
    const ofSet = (uri: string): SetAnswer | undefined => set.answers.find((a) => keyOf(a.uri) === keyOf(uri));
    const delivered = responses.filter((a) => a.statusCode === '200');
    const right = delivered.length === three.length && delivered.every((a) => three.includes(keyOf(a.uri!))
      && a.etag === ofSet(a.uri!)?.etag && JSON.stringify(a.resource) === JSON.stringify(ofSet(a.uri!)?.resource));
    say(right && responses.length === OWN_SET_DOCUMENTS.length && responses.filter((a) => a.statusCode === '304').length === OWN_SET_DOCUMENTS.length - three.length,
      `the kept write answered ${responses.map((a) => `${keyOf(a.uri!)} ${a.statusCode ?? 'none'}`).join(', ')}; `
      + `${right ? 'the three with this set\'s content and tags' : 'not this set\'s three documents alone'}`);
  }
  for (const file of arguments_('hash')) console.log(`config hash against the set's tags: ${compareConfigHash(readFileSync(insideTheLab(file, 'the hash answer'), 'utf8'), set)}`);
  for (const file of arguments_('list')) {
    console.log('request list against the set\'s tags:');
    for (const line of compareRequestList(readFileSync(insideTheLab(file, 'the request list'), 'utf8'), set)) console.log(`  ${line}`);
  }
  if (bad > 0) process.exit(1);
}

const toBuild = argument('build');
const toCheck = argument('check');
if ((toBuild === undefined) === (toCheck === undefined)) fail('one of --build <new lab folder> or --check <set folder>');
if (toBuild !== undefined) build(toBuild);
else check(toCheck!);
