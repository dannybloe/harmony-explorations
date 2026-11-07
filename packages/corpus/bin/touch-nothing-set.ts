/**
 * Build a Harmony Touch set **from a setup file with no Logitech document as input**, its put back, and the description
 * of the account it takes the account's values from; and check a set built so against 8.6's: `todo-touch.md` 9.1. It
 * opens no remote: it reads the lab, the setup file and the archive of the catalogue, and writes into the lab.
 *
 *   node packages/corpus/bin/touch-nothing-set.ts --describe-account <set folder> --out <new lab file>
 *   node packages/corpus/bin/touch-nothing-set.ts --build <new lab folder> --setup <setup file> --account <lab file> [--archive <checkout>]
 *   node packages/corpus/bin/touch-nothing-set.ts --build <new lab folder> --back <set folder> --from <9.1 set folder>
 *   node packages/corpus/bin/touch-nothing-set.ts --check <set folder> --against <set folder> [--held <set folder>] [--archive <checkout>]
 *
 * **`--describe-account`** writes the account's values out of a set the remote holds into a new lab file,
 * `describeTouchAccount` in `src/touchnothingset.ts`: Context's seven fields a Touch reads, the tuning device's
 * favourites address and key, and the six documents' addresses. It prints nothing of them.
 *
 * **`--build --setup`** builds the six documents and the two pictures of our background from the setup file
 * (`packages/corpus/setups/touch-test.json`), the archive and the account file, `withNothing`, each under a digest of its
 * content, and writes `set.json`, `sources.json`, which names the setup file, the account file's path and never its
 * content, and the archive, and the two pictures as files beside them, `background.png` and `background-small.png`, for
 * a person to look at before the set goes anywhere. The archive is `HARMONY_IR_ARCHIVE` or the checkout beside this
 * repository unless `--archive` names one.
 *
 * **`--build --back`** writes the put back, the six documents of `--back`'s set, content and tags, `putBackNothing`; the
 * set in `--from` is the one it puts back.
 *
 * **`--check`** reads a set as `touch-sync.ts` will, the gate and the codec's reader and check, and prints the field by
 * field comparison with `--against`'s set, `compareNothing`, NOT OK on any field no row explains, and what every command
 * sends against what it sends from `--against`'s documents, `waveformClosure`, NOT OK on any command that differs. With
 * `--held`, what the answerer writes for a remote that committed that set, and the size of the write; and the pictures
 * the set holds answered to a remote that holds none of them, and the size of that write alone.
 *
 * **What it prints**: counts, document names, field paths, the devices' names and `equal` or `not equal`; never a tag,
 * an address or any value out of a document.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { harmonyTouch } from '@harmony/codec';
import { IR_ARCHIVE, LAB } from '@harmony/lab';

import { answersWhenHolding, writeOfAnswersSize } from '../src/touchchangedset.ts';
import { comparisonLines } from '../src/touchsetupset.ts';
import { compareNothing, describeTouchAccount, putBackNothing, waveformClosure, withNothing, type TouchAccountFile } from '../src/touchnothingset.ts';
import { keyOf, prepareSet, type TouchSet } from '../src/touchsync.ts';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

/** A path inside the lab, resolved through its links, or a refusal; the same rule as `touch-device-set.ts`. */
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

const readSet = (folder: string): TouchSet => JSON.parse(readFileSync(join(folder, 'set.json'), 'utf8')) as TouchSet;
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);
const archive = (): string => argument('archive') ?? IR_ARCHIVE ?? fail('no archive of the catalogue: set HARMONY_IR_ARCHIVE or pass --archive');

function newFolder(folder: string): string {
  const out = insideTheLab(folder, 'the set folder');
  if (existsSync(out) && readdirSync(out).length > 0) fail(`${out} already holds files, and a set is never written over`);
  return out;
}

function describeAccount(folder: string): void {
  const outFile = argument('out') ?? fail('--describe-account needs --out <new lab file>');
  const out = insideTheLab(outFile, 'the account file');
  if (existsSync(out)) fail(`${out} exists, and an account file is never written over`);
  const described = describeTouchAccount(readSet(insideTheLab(folder, 'the set')));
  if ('refusal' in described) fail(described.refusal);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ about: `todo-touch.md 9.1: the account's values, described from ${basename(folder)}; kept in the lab, never in the repository`, account: described.account }, null, 1)}\n`);
  console.log(`written: the account's values, ${Object.keys(described.account.addresses).length} addresses, to ${out}`);
}

function build(folder: string): void {
  const out = newFolder(folder);
  const back = argument('back');
  if (back !== undefined) {
    const from = insideTheLab(argument('from') ?? fail('--build --back needs --from <9.1 set folder>'), 'the set put back');
    const before = insideTheLab(back, 'the set before');
    const put = putBackNothing(readSet(from), readSet(before));
    if ('refusals' in put) fail(put.refusals.join('\n'));
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'set.json'), `${JSON.stringify(put.set, null, 1)}\n`);
    writeFileSync(join(out, 'sources.json'), `${JSON.stringify({ name: basename(out), from, back: before }, null, 1)}\n`);
    console.log(`written: the put back of ${basename(from)}, ${put.set.answers.length} documents as ${basename(before)} holds them`);
    return;
  }
  const setupFile = resolve(argument('setup') ?? fail('--build needs --setup <setup file> and --account <lab file>, or --back'));
  const accountFile = insideTheLab(argument('account') ?? fail('--build needs --account <lab file>'), 'the account file');
  const account = (JSON.parse(readFileSync(accountFile, 'utf8')) as { account: TouchAccountFile }).account;
  const built = withNothing({ file: JSON.parse(readFileSync(setupFile, 'utf8')), archive: archive(), account });
  if ('refusals' in built) fail(built.refusals.join('\n'));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'set.json'), `${JSON.stringify(built.set, null, 1)}\n`);
  writeFileSync(join(out, 'sources.json'), `${JSON.stringify({ name: basename(out), setup: setupFile, account: accountFile, archive: archive() }, null, 1)}\n`);
  const background = harmonyTouch.ourBackground();
  writeFileSync(join(out, 'background.png'), background.picture);
  writeFileSync(join(out, 'background-small.png'), background.twin);
  console.log(`written: ${built.set.answers.length} answers built from ${basename(setupFile)}, six documents and two pictures, each under a digest of its content, and the two pictures as files`);
}

function check(folder: string): void {
  const dir = insideTheLab(folder, 'the set');
  const set = readSet(dir);
  let ok = true;
  const say = (good: boolean, line: string): void => {
    if (!good) ok = false;
    console.log(`${good ? 'ok' : 'NOT OK'}  ${line}`);
  };
  const gate = prepareSet(set);
  say(!('refusals' in gate), 'refusals' in gate ? `the gate refuses: ${gate.refusals.join('; ')}` : `the gate passes, ${gate.set.tags.stated} tags stated, ${gate.set.tags.ours} ours`);
  const read = harmonyTouch.readConfiguration(documentsOf(set));
  console.log(`reader: ${read.activities.length} activities, ${read.devices.length} devices, ${read.maps.length} maps, ${read.protocols.length} definitions`);
  const findings = harmonyTouch.checkConfiguration(read);
  say(!findings.some((f) => f.effect === 'refused'), `check: ${findings.length} findings, ${findings.filter((f) => f.effect === 'refused').length} refused, rules ${[...new Set(findings.map((f) => f.rule))].join(', ') || 'none'}`);

  const againstFolder = argument('against');
  if (againstFolder !== undefined) {
    const against = readSet(insideTheLab(againstFolder, 'the set compared with'));
    const comparison = compareNothing(documentsOf(set), documentsOf(against));
    for (const l of comparisonLines(comparison)) console.log(l);
    const unexplained = comparison.flatMap((c) => c.rows).filter((r) => r.why.startsWith('unexplained'));
    say(unexplained.length === 0, `against ${basename(againstFolder)}: ${unexplained.length} fields no row explains`);
    const closure = waveformClosure(documentsOf(set), documentsOf(against));
    for (const d of closure.devices) say(d.differs.length === 0 && d.unmatched.length === 0, `${d.device}: ${d.same} commands send the same, ${d.differs.length} differ, ${d.unmatched.length} unmatched`);
    console.log(`families of ${basename(againstFolder)} stating a toggle bit, which ours do not: ${closure.toggling.join(', ') || 'none'}`);
  }

  const heldFolder = argument('held');
  if (heldFolder !== undefined && !('refusals' in gate)) {
    // The six documents the held set holds, which the remote asks for in one list; a picture is asked in another.
    const whole = readSet(insideTheLab(heldFolder, 'the set held'));
    const held: TouchSet = { answers: whole.answers.filter((a) => a['body-type'] === 'application/json') };
    const written = answersWhenHolding(gate.set, held);
    console.log(`a remote holding ${basename(heldFolder)} is answered ${written.map((w, i) => `${keyOf(held.answers[i]!.uri)} ${'refuse' in w ? 'refused' : w.statusCode}`).join(', ')}`);
    const size = writeOfAnswersSize(written);
    console.log(`write of answers: ${size.length} characters, ${size.chunks} ${size.chunks === 1 ? 'chunk' : 'chunks'} of ${size.perChunk}, the last ${size.last}`);
    const starts = Array.from({ length: size.chunks }, (_, i) => size.line.slice(i * size.perChunk, i * size.perChunk + 12));
    say(!size.line.includes('Content-Length') && starts.slice(1).every((s) => !s.startsWith('vnd.logitech')),
      'no chunk carries Content-Length, and no chunk after the first opens with a request name');
    // The pictures, asked for untagged by a remote that holds none of them.
    const pictures = set.answers.filter((a) => a['body-type'] === 'image/png').map((a) => ({ uri: a.uri, 'body-type': a['body-type'], resource: null }));
    if (pictures.length > 0) {
      const answered = answersWhenHolding(gate.set, { answers: pictures });
      console.log(`its ${pictures.length} pictures, asked for untagged, are answered ${answered.map((w) => ('refuse' in w ? 'refused' : w.statusCode)).join(', ')}`);
      const p = writeOfAnswersSize(answered);
      console.log(`write of those answers alone: ${p.length} characters, ${p.chunks} ${p.chunks === 1 ? 'chunk' : 'chunks'}, the last ${p.last}`);
    }
  }
  if (!ok) process.exit(1);
}

const describeFolder = argument('describe-account');
const buildFolder = argument('build');
const checkFolder = argument('check');
if (describeFolder !== undefined) describeAccount(describeFolder);
else if (buildFolder !== undefined) build(buildFolder);
else if (checkFolder !== undefined) check(checkFolder);
else fail('give --describe-account <set folder>, --build <new lab folder> or --check <set folder>');
