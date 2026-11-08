/**
 * Build the set `todo-touch.md` 6.8 delivers to a Harmony Touch, check it, and compare what the remote reports
 * afterwards with it. It opens no remote: it reads the lab and writes into it.
 *
 *   node packages/corpus/bin/touch-own-set.ts --build <new lab folder> --requests <request list answer> \
 *     [--handed-up <answers request of a hand over>]...
 *   node packages/corpus/bin/touch-own-set.ts --check <set folder> [--hash <getconfighash answer>] \
 *     [--list <request list answer>]
 *
 * **`--build`** takes the six configuration documents from the recorded full sync of Logitech's client, the lab
 * fixture `touch_full_sync_recording`, and lets a document a hand over of ours wrote back replace its
 * recorded copy: each `--handed-up` is the kept request line of a hand over's write of answers, `NNN-answers-
 * request.txt` in a run's folder, whose answers are the remote's own documents as handed up, with the tag our
 * hand over gave them. Then `buildOwnSet`, `experiments/touchownset.ts`: each of the six only when the tag the remote
 * last asked for it with, `--requests`, equals the tag its source delivered it under, every new tag `setTag`
 * with the folder's name, and the answerer's gate passed. It writes `set.json`, the set `touch-sync.ts --set`
 * reads, and `sources.json`, which document came from which file. The folder has to be inside the lab and
 * new or empty.
 *
 * **`--check`** reads the set back as `touch-sync.ts` will: the gate, the codec's reader, every document
 * against its source as parsed JSON, a hand over's document also against the copy the answerer kept under
 * `handed-up/`, the tags all new, and the write of answers the six make, its length and its chunks, against
 * the largest write Logitech's client made in the recording. With `--hash`, a kept `getconfighash` answer
 * against the hash the set predicts; with `--list`, a kept request list against the set's tags.
 *
 * **What it prints**: counts, shapes, and `equal` or `not equal`; never a tag, an address or a value out of a
 * document, since the documents hold the household's account. The tags themselves are in the lab files.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { harmonyTouch } from '@harmony/codec/node';
import { LAB, require_ } from '@harmony/lab';
import { answersWritten, commands, recordsOf, sessions, text } from '@harmony/usb/touchrecording';

import { CONFIG_HASH_DOCUMENTS, OWN_SET_DOCUMENTS, buildOwnSet, compareConfigHash, compareRequestList, type OwnSource } from '../experiments/touchownset.ts';
import { writeOfAnswersSize } from '../experiments/touchchangedset.ts';
import {
  SYNC,
  WRITE_ANSWERS,
  answerOf,
  keyOf,
  ourTag,
  prepareSet,
  resultOf,
  type RemoteRequest,
  type TouchSet,
} from '../src/touchsync.ts';

const RECORDING = 'touch_full_sync_recording';

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

/** A path inside the lab, resolved, or a refusal: nothing this script reads or writes is outside it. */
function insideTheLab(path: string, what: string): string {
  if (LAB === undefined) fail('there is no lab directory');
  const lab = realpathSync(LAB);
  // The nearest part of the path that exists, resolved through its links, and the rest as written.
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

/** The six documents of the recorded full sync's sync down, each with the tag Logitech's client delivered. */
function recordedSources(): OwnSource[] {
  const hlapi = sessions(commands(recordsOf(require_(RECORDING)))).filter((s) => s.path === '/sys/hlapi');
  const at = hlapi.findIndex((s) => s.mode === 'W' && text(s.written) === SYNC);
  if (at < 0) fail(`the recording ${RECORDING} holds no sync down`);
  return answersWritten(hlapi.slice(at))
    .filter((a) => a.uri.startsWith('harmony://') && a.statusCode === '200' && typeof a.etag === 'string')
    .map((a) => ({ uri: a.uri, resource: a.resource, tag: a.etag as string, from: 'the recorded full sync' }));
}

/** The documents a hand over of ours wrote back, out of its kept write of answers. */
function handedUpSources(file: string): OwnSource[] {
  const line = readFileSync(file, 'utf8');
  if (!line.startsWith(`${WRITE_ANSWERS}&`)) fail(`${file} is not a kept write of answers`);
  const responses = (JSON.parse(decodeURIComponent(line.split('&responses=')[1] ?? '')) as { responses: { statusCode: string; uri: string; etag?: string; resource?: unknown }[] }).responses;
  return responses
    .filter((a) => a.statusCode === '200' && a.uri.startsWith('harmony://') && typeof a.etag === 'string')
    .map((a) => ({ uri: a.uri, resource: a.resource, tag: a.etag as string, from: 'a hand over of ours' }));
}

/** The requests of a kept request list answer. */
function requestsOf(file: string): RemoteRequest[] {
  const requests = resultOf(readFileSync(file, 'utf8'))?.['requests'];
  if (!Array.isArray(requests)) fail(`${file} holds no request list`);
  return requests as RemoteRequest[];
}

interface Sources {
  readonly name: string;
  readonly recording: string;
  readonly requests: string;
  readonly handedUp: readonly string[];
  readonly rows: readonly { document: string; from: string }[];
}

function build(folder: string): void {
  const out = insideTheLab(folder, 'the set folder');
  if (existsSync(out) && readdirSync(out).length > 0) fail(`${out} already holds files, and a set is never written over`);
  const requestsFile = argument('requests');
  if (requestsFile === undefined) fail('--build needs --requests <request list answer>, the last list the remote asked for the six in');
  const requests = requestsOf(insideTheLab(requestsFile, 'the request list'));
  const handedUp = arguments_('handed-up').map((f) => insideTheLab(f, 'the hand over\'s answers'));
  const sources = [...recordedSources(), ...handedUp.flatMap(handedUpSources)];
  const name = basename(out);
  const built = buildOwnSet({ sources, requests, name });
  if ('refusals' in built) {
    console.log(`refused, ${built.refusals.length} reasons, no set written:`);
    for (const r of built.refusals) console.log(`  ${r}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set)}\n`);
  const record: Sources = { name, recording: RECORDING, requests: insideTheLab(requestsFile, 'the request list'), handedUp, rows: built.rows };
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`built ${out}: ${built.set.answers.length} documents, every tag new and stated, the gate passed`);
  for (const row of built.rows) console.log(`  ${row.document}: from ${row.from}, the remote's tag equal to the source's`);
}

function check(folder: string): void {
  const dir = insideTheLab(folder, 'the set folder');
  const set = JSON.parse(readFileSync(join(dir, 'set.json'), 'utf8')) as TouchSet;
  const record = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')) as Sources;
  let bad = 0;
  const say = (ok: boolean, line: string): void => {
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok' : 'NOT OK'}: ${line}`);
  };

  // The gate, as the answerer meets it.
  const gate = prepareSet(set);
  say(!('refusals' in gate), `the gate, ${'refusals' in gate ? `${gate.refusals.length} refusals` : `passed, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`}`);
  // The codec's reader, as the remote's engine will read the set.
  const documents = harmonyTouch.documentsOfAnswers(set.answers);
  const read = harmonyTouch.readConfiguration(documents);
  say(read.absent.length === 0, `the reader read it, ${read.activities.length} activities, ${read.devices.length} devices, `
    + `${read.maps.length} button maps, ${read.protocols.length} protocols, settings ${read.settings === undefined ? 'absent' : 'present'}, `
    + `context ${read.context === undefined ? 'absent' : 'present'}`);
  say(OWN_SET_DOCUMENTS.every((d) => set.answers.some((a) => keyOf(a.uri) === d)) && set.answers.length === OWN_SET_DOCUMENTS.length,
    `the six documents and nothing else, ${set.answers.length} answers`);

  // Every document against its source, re-read from the files the build used.
  const sources = [...recordedSources(), ...record.handedUp.flatMap(handedUpSources)];
  const last = new Map<string, OwnSource>();
  for (const s of sources) last.set(keyOf(s.uri), s);
  for (const a of set.answers) {
    const document = keyOf(a.uri);
    const source = last.get(document);
    say(source !== undefined && JSON.stringify(a.resource) === JSON.stringify(source.resource) && typeof a.resource === 'object',
      `${document} equals its source, ${source?.from ?? 'none'}, as parsed JSON, and is an object`);
    // A hand over's document also against the copy the answerer kept before answering it.
    if (source?.from === 'a hand over of ours') {
      for (const file of record.handedUp) {
        const kept = join(dirname(file), 'handed-up');
        const copy = existsSync(kept) ? readdirSync(kept).find((f) => f.endsWith(`-${document}.json`)) : undefined;
        if (copy !== undefined) {
          say(JSON.stringify(JSON.parse(readFileSync(join(kept, copy), 'utf8'))) === JSON.stringify(a.resource),
            `${document} equals the copy the hand over kept in the lab, as parsed JSON`);
        }
      }
    }
  }
  // The tags: all stated, all different, none a tag in play or one `ourTag` gives the same body.
  const requests = requestsOf(record.requests);
  const inPlay = new Set([...requests.map((r) => r.etag), ...sources.map((s) => s.tag)]);
  say(set.answers.every((a) => typeof a.etag === 'string' && !inPlay.has(a.etag) && a.etag !== ourTag(a)),
    'every tag is stated, differs from every tag the remote asked with and every source\'s, and from the tag a hand over would give the same document');
  say(new Set(set.answers.map((a) => a.etag)).size === set.answers.length, 'no two tags are the same');

  // The write of answers the six make, built by the answerer's own rule against the remote's last requests.
  if (!('refusals' in gate)) {
    const written = requests.map((r) => answerOf(r, { kind: 'set', set: gate.set }));
    const refused = written.filter((w) => 'refuse' in w).length;
    const statuses = written.map((w) => ('refuse' in w ? 'refused' : w.statusCode));
    say(refused === 0 && statuses.every((s) => s === '200'), `the remote's last request list answered ${statuses.join(' ')}`);
    // One rule for the size of a write, shared with `touch-changed-set.ts`, rather than a copy here.
    const { line, perChunk, chunks, last: lastChunk } = writeOfAnswersSize(written);
    const hlapi = sessions(commands(recordsOf(require_(RECORDING)))).filter((s) => s.path === '/sys/hlapi');
    const theirs = Math.max(...hlapi.filter((s) => s.mode === 'W').map((s) => text(s.written)).filter((w) => w.startsWith(WRITE_ANSWERS)).map((w) => w.length));
    console.log(`write of answers: ${line.length} characters, ${chunks} chunks of ${perChunk}, the last ${lastChunk}; `
      + `the largest Logitech's client wrote in the recording, ${theirs}`);
    // The listener takes `Content-Length: ` anywhere in a chunk as an announcement, and forgets an announcement
    // when a chunk carries a request name other than the write's, `halhttpserverconnector.lua`.
    const starts = Array.from({ length: chunks }, (_, i) => line.slice(i * perChunk, i * perChunk + 12));
    say(!line.includes('Content-Length') && starts.slice(1).every((s) => !s.startsWith('vnd.logitech')),
      'no chunk carries Content-Length, and no chunk after the first opens with a request name');
  }

  for (const file of arguments_('hash')) console.log(`config hash against the set's ${CONFIG_HASH_DOCUMENTS.join(', ')} tags: ${compareConfigHash(readFileSync(insideTheLab(file, 'the hash answer'), 'utf8'), set)}`);
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
