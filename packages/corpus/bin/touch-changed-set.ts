/**
 * Build a Harmony Touch set with one value changed from a set the remote holds, check it, and compare what the
 * remote reports afterwards with it: `todo-touch.md` 6.9. It opens no remote: it reads the lab and writes into
 * it.
 *
 *   node packages/corpus/bin/touch-changed-set.ts --build <new lab folder> --from <set folder> \
 *     --document <name> --pointer <JSON Pointer> --was <value> --to <value>
 *   node packages/corpus/bin/touch-changed-set.ts --check <set folder> [--same-as <set folder>]... \
 *     [--written <a run's kept write of answers>] [--hash <getconfighash answer>] [--list <request list answer>]
 *
 * **`--build`** copies the set in `--from`, a folder `touch-own-set.ts` or this script wrote, changes the one
 * value `--pointer` names in `--document` from `--was` to `--to`, and gives that document alone a new tag,
 * `setTag` with the new folder's name; the other five keep the source's tags, so the answerer answers them 304
 * on a remote that committed the source. `src/touchchangedset.ts` says why, and why a put back is the same
 * change the other way under a tag of its own. `--was` and `--to` are read as the type the source holds at the
 * pointer, a number, a string or `true` or `false`, so a delay is `--was 1 --to 3` and a name is given as it
 * is. Every tag the chain of sets back to the first has stated is in play, and a new tag equal to one of them
 * is refused. It writes `set.json`, the set `touch-sync.ts --set` reads, and `sources.json`, the source folder
 * and the change. The folder has to be inside the lab and new or empty.
 *
 * **`--check`** reads the set back as `touch-sync.ts` will, the gate and the codec's reader, and against its
 * source: the content differs in exactly the one value recorded, holding `--was` in the source and `--to`
 * here; exactly that document's tag differs, it is the tag the set's name gives, and it is in play nowhere
 * else in the chain; and answering the six as a remote holding the source asks for them gives one 200 and
 * five 304s, a write of answers it sizes. `--same-as` compares the content with another set's as parsed JSON,
 * which is how a put back is shown to be its grandparent's content. `--written` reads a run's kept write of
 * answers for the six, `NNN-answers-request.txt`, and says whether it delivered this set's one document alone
 * with its content and tag and answered the five 304. `--hash` and `--list` compare a kept
 * `getconfighash` answer or request list with the set's tags, as `touch-own-set.ts` does.
 *
 * **What it prints**: counts, document names, pointers, and `equal` or `not equal`; the values of the change
 * itself, which are a delay or a label given on the command line; never a tag, an address or any other value
 * out of a document, since the documents hold the household's account.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { harmonyTouch } from '@harmony/codec';
import { LAB } from '@harmony/lab';

import {
  answersWhenHolding,
  chainTags,
  changeOneValue,
  setDifferences,
  valueAt,
  writeOfAnswersSize,
  type Leaf,
  type OneChange,
  type SetRecord,
} from '../src/touchchangedset.ts';
import { OWN_SET_DOCUMENTS, compareConfigHash, compareRequestList } from '../src/touchownset.ts';
import { WRITE_ANSWERS, keyOf, prepareSet, setTag, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

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

/** What `--build` records beside the set. */
interface ChangeRecord {
  readonly name: string;
  readonly from: string;
  readonly change: OneChange;
}

const readSet = (folder: string): TouchSet => JSON.parse(readFileSync(join(folder, 'set.json'), 'utf8')) as TouchSet;
const readRecord = (folder: string): Partial<ChangeRecord> => {
  const file = join(folder, 'sources.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Partial<ChangeRecord>) : {};
};

/**
 * Every tag stated by the set in `folder` and by each set it was built from, back to the first, `chainTags`; a
 * set `touch-device-set.ts` built is followed through as well, since its record names its source too.
 */
const tagsOfTheChain = (folder: string): Set<string> => chainTags(folder, (at) => ({ set: readSet(at), record: readRecord(at) as SetRecord }));

/** A value from the command line, read as the type `like` has: a number, a boolean, or the text as it is. */
function leafLike(text: string, like: unknown, what: string): Leaf {
  if (typeof like === 'number') {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) fail(`${what} has to be a number, as the document holds one there`);
    return n;
  }
  if (typeof like === 'boolean') {
    if (text !== 'true' && text !== 'false') fail(`${what} has to be true or false, as the document holds a boolean there`);
    return text === 'true';
  }
  return text;
}

function build(folder: string): void {
  const out = insideTheLab(folder, 'the set folder');
  if (existsSync(out) && readdirSync(out).length > 0) fail(`${out} already holds files, and a set is never written over`);
  const fromFolder = argument('from');
  const document = argument('document');
  const pointer = argument('pointer');
  const was = argument('was');
  const to = argument('to');
  if (fromFolder === undefined || document === undefined || pointer === undefined || was === undefined || to === undefined) {
    fail('--build needs --from <set folder> --document <name> --pointer <JSON Pointer> --was <value> --to <value>');
  }
  const from = insideTheLab(fromFolder, 'the source set');
  const source = readSet(from);
  const like = valueAt(source, document, pointer);
  const change: OneChange = { document, pointer, was: leafLike(was, like, '--was'), to: leafLike(to, like, '--to') };
  const name = basename(out);
  const built = changeOneValue({ set: source, change, name, tagsInPlay: tagsOfTheChain(from) });
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  const record: ChangeRecord = { name, from, change };
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`built ${out}: ${document} ${pointer} from ${JSON.stringify(change.was)} to ${JSON.stringify(change.to)}, `
    + `${document} under a new tag, the other ${OWN_SET_DOCUMENTS.length - 1} under the source's, the gate passed`);
}

function check(folder: string): void {
  const dir = insideTheLab(folder, 'the set folder');
  const set = readSet(dir);
  const record = readRecord(dir);
  if (record.change === undefined || typeof record.from !== 'string' || typeof record.name !== 'string') {
    fail(`${dir} records no change, so it is not a set this script built; touch-own-set.ts --check reads the others`);
  }
  const { change, name } = record as ChangeRecord;
  const from = insideTheLab(record.from, 'the source set');
  const source = readSet(from);
  let bad = 0;
  const say = (ok: boolean, line: string): void => {
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
  };

  // The gate and the codec's reader, as the answerer and the remote's engine meet the set.
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  const read = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(set.answers));
  say(read.absent.length === 0, `the reader read it, ${read.activities.length} activities, ${read.devices.length} devices, `
    + `${read.maps.length} button maps, ${read.protocols.length} protocols`);
  say(set.answers.length === OWN_SET_DOCUMENTS.length && OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)),
    `the six documents and nothing else, ${set.answers.length} answers`);

  // Against the source: one value of one document, and that document's tag alone.
  const diff = setDifferences(source, set);
  const changed = diff.filter((d) => d.values.length > 0);
  say(changed.length === 1 && changed[0]!.document === change.document && changed[0]!.values.length === 1 && changed[0]!.values[0] === change.pointer,
    `against ${basename(from)}: ${changed.length === 0 ? 'no document differs' : changed.map((d) => `${d.document} differs at ${d.values.length} ${d.values.length === 1 ? 'place' : 'places'}${d.values.length === 1 ? `, ${d.values[0]}` : ''}`).join('; ')}, `
    + `the change recorded is ${change.document} ${change.pointer}`);
  say(valueAt(source, change.document, change.pointer) === change.was && valueAt(set, change.document, change.pointer) === change.to,
    `the source holds ${JSON.stringify(change.was)} there and this set ${JSON.stringify(change.to)}`);
  const retagged = diff.filter((d) => d.tagChanged).map((d) => d.document);
  say(retagged.length === 1 && retagged[0] === change.document, `tags: ${retagged.join(', ') || 'none'} new, the other ${diff.length - retagged.length} the source's`);
  const answer = set.answers.find((a) => keyOf(a.uri) === change.document);
  say(answer !== undefined && answer.etag === setTag(answer, name), `${change.document}'s tag is the one the set's name gives it`);
  const chain = tagsOfTheChain(from);
  say(answer?.etag !== undefined && !chain.has(answer.etag), `${change.document}'s tag is stated by no set of the chain before it, ${chain.size} tags`);

  // What the answerer writes for a remote that committed the source.
  if (!('refusals' in gate)) {
    const written = answersWhenHolding(gate.set, source);
    const statuses = written.map((w, i) => `${keyOf(source.answers[i]!.uri)} ${'refuse' in w ? 'refused' : w.statusCode}`);
    const twoHundreds = written.filter((w) => !('refuse' in w) && w.statusCode === '200').length;
    const threeOhFours = written.filter((w) => !('refuse' in w) && w.statusCode === '304').length;
    say(twoHundreds === 1 && threeOhFours === OWN_SET_DOCUMENTS.length - 1 && statuses.includes(`${change.document} 200`),
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
  // A run's kept write of answers for the six, against the set: the changed document 200 with the set's content
  // and tag, the other five 304.
  for (const file of arguments_('written')) {
    const line = readFileSync(insideTheLab(file, 'the kept write of answers'), 'utf8');
    if (!line.startsWith(`${WRITE_ANSWERS}&`)) fail(`${file} is not a kept write of answers`);
    const responses = (JSON.parse(decodeURIComponent(line.split('&responses=')[1] ?? '')) as { responses: { statusCode?: string; uri?: string; etag?: string; resource?: unknown }[] }).responses
      .filter((a) => typeof a.uri === 'string' && a.uri.startsWith('harmony://'));
    const ofSet = (uri: string): SetAnswer | undefined => set.answers.find((a) => keyOf(a.uri) === keyOf(uri));
    const delivered = responses.filter((a) => a.statusCode === '200');
    const right = delivered.length === 1 && keyOf(delivered[0]!.uri!) === change.document
      && delivered[0]!.etag === ofSet(delivered[0]!.uri!)?.etag
      && JSON.stringify(delivered[0]!.resource) === JSON.stringify(ofSet(delivered[0]!.uri!)?.resource);
    say(right && responses.length === OWN_SET_DOCUMENTS.length && responses.filter((a) => a.statusCode === '304').length === OWN_SET_DOCUMENTS.length - 1,
      `the kept write answered ${responses.map((a) => `${keyOf(a.uri!)} ${a.statusCode ?? 'none'}`).join(', ')}; `
      + `${right ? `${change.document} with this set's content and tag` : 'not this set\'s one document alone'}`);
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
