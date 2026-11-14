/**
 * The list of the infrared archive's sample and the check that a folder holds exactly it.
 *
 * The sample is the copy in the lab of the archive's files that tests read, `IR_ARCHIVE_SAMPLE` in the index, which
 * says why it exists and why it is in the lab. Here is its list, one line per file, `<sha256>  <path>`, sorted by
 * path, the form `shasum -a 256` prints and checks, and the one question both the test and the script that takes the
 * sample ask of a folder: what in it differs from the list.
 *
 * **A line whose checksum is `-` is a file asked for and not yet taken**: the way a test that needs one more device
 * gets it. Add the line, take the sample, and the script writes the checksum in; until then the check reports the
 * file as not taken, so a list can never quietly hold a path nothing verified.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** One file of the sample: its path in the archive's layout, and the SHA-256 it was copied at, or undefined until taken. */
export interface SampleEntry {
  readonly path: string;
  readonly sha256: string | undefined;
}

/**
 * The paths a sample may hold, which are the archive's own kinds of file: its manifest and top index, a
 * manufacturer's index or one of its devices, a codeset in its two letter bucket, a protocol definition. Anything
 * else, a path that climbs out above all, is refused when the list is read, since the script copies what it lists.
 */
const KINDS: readonly RegExp[] = [
  /^manifest\.json$/,
  /^index\.json$/,
  /^devices\/[^/]+\/[^/]+\.json$/,
  /^codesets\/[0-9a-f]{2}\/[0-9a-f]+\.json$/,
  /^protocols\/[^/]+\.json$/,
];

/** Whether a path is one a sample may hold: one of the archive's kinds, with no segment that climbs. */
export function isSamplePath(path: string): boolean {
  return !path.split('/').some((part) => part === '..' || part === '.' || part === '') && KINDS.some((kind) => kind.test(path));
}

/** The list read: every line an entry, sorted by path with none twice. Throws naming the first line that is not. */
export function parseSampleList(text: string): SampleEntry[] {
  const entries: SampleEntry[] = [];
  text.split('\n').forEach((line, index) => {
    if (line === '') return;
    const match = /^([0-9a-f]{64}|-) {2}(.+)$/.exec(line);
    if (match === null) throw new Error(`line ${index + 1} is not "<sha256>  <path>": ${line}`);
    const path = match[2]!;
    if (!isSamplePath(path)) throw new Error(`line ${index + 1} names no file of the archive's layout: ${path}`);
    const before = entries.at(-1);
    if (before !== undefined && !(before.path < path)) throw new Error(`line ${index + 1} is out of order or twice: ${path}`);
    entries.push({ path, sha256: match[1] === '-' ? undefined : match[1]! });
  });
  return entries;
}

/** The list written, as `parseSampleList` reads it. */
export function formatSampleList(entries: readonly SampleEntry[]): string {
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sorted.map((one) => `${one.sha256 ?? '-'}  ${one.path}`).join('\n') + '\n';
}

/** The SHA-256 of a file's bytes, in hex. */
export function sha256OfFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Every file under a folder, as paths from it with forward slashes. */
function filesUnder(folder: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(folder, prefix), { withFileTypes: true })) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...filesUnder(folder, path));
    else found.push(path);
  }
  return found;
}

/**
 * What in a folder differs from the list, one sentence each, none when the folder is the sample: a listed file that
 * is missing, one whose bytes are not the listed checksum's, one listed and never taken, and a file the list does
 * not name, but for `allowed`, the note of ours the sample carries.
 */
export function sampleFaults(folder: string, entries: readonly SampleEntry[], allowed: readonly string[] = []): string[] {
  const faults: string[] = [];
  if (!existsSync(folder)) return [`${folder}: no such folder`];
  for (const one of entries) {
    const file = join(folder, ...one.path.split('/'));
    if (one.sha256 === undefined) faults.push(`${one.path}: listed and not yet taken`);
    else if (!existsSync(file) || !statSync(file).isFile()) faults.push(`${one.path}: missing`);
    else if (sha256OfFile(file) !== one.sha256) faults.push(`${one.path}: not the bytes the list states`);
  }
  const listed = new Set(entries.map((one) => one.path));
  for (const path of filesUnder(folder)) {
    if (!listed.has(path) && !allowed.includes(path)) faults.push(`${path}: in the folder and not on the list`);
  }
  return faults;
}
