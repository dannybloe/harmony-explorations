/**
 * `make catalogue-raw`: keep the infrared archive and its raw capture current, and derive from the
 * capture what the archive drops. Todo-later items 1.3 and 1.4.
 *
 * Four steps, in order, each reported:
 *
 * 1. **The archive checkout** is updated with `git pull --ff-only` and its commit printed. A pull that
 *    is not a fast forward stops the run rather than merging somebody else's history into ours.
 * 2. **The newest raw release** on GitHub is compared with the lab's `SHA256SUMS`. When it differs, every
 *    file it lists is downloaded into `incoming-<tag>/` and checked against its checksum, and only when
 *    all of them verify are the old files moved to `previous-<sha>/` and the new ones put in their place.
 *    So an interrupted or corrupt download leaves the capture as it was.
 * 3. **One streaming pass** over the capture writes three files into `derived/`: a copy re-compressed as
 *    independent gzip members of `RAW_BLOCK_LINES` lines, an index of every device's member, and the side
 *    file of `RAW_FIELDS`. The pass also projects every raw action list the way the archive does and
 *    compares it with the archive's, which is item 1.4's measurement and the alignment the side file
 *    depends on, `packages/codec/src/catalogueraw.ts`.
 * 4. **A lookup is timed**, the cold one that loads the index and the warm ones after it.
 *
 * Step 3 runs only when the derived files are absent, stale against `SHA256SUMS`, built with another
 * field list, or aligned against another archive build; `--force` runs it anyway. `--no-pull` skips step 1 and `--offline` skips steps
 * 1 and 2. Never in `make all`: it reads 5.5 GB and writes about 400 MB into the lab.
 *
 * **Token rule: never print a raw line or a whole device.** This prints counts and sizes only.
 */
import { createHash } from 'node:crypto';
import {
  closeSync, createReadStream, createWriteStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync,
  renameSync, statSync, writeFileSync, writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { createGunzip, gzipSync } from 'node:zlib';
import { IR_ARCHIVE, LAB, imagePath } from '@harmony/lab';
import { archiveManifest } from '../src/archive.ts';
import { deviceDriving } from '../src/driving.ts';
import {
  RAW_BLOCKS_FILE, RAW_BLOCK_LINES, RAW_DERIVED_DIRECTORY, RAW_FEATURES_FILE, RAW_FIELDS, RAW_FIELDS_FILE,
  RAW_FIELDS_FORMAT, RAW_INDEX_ENTRY, RAW_INDEX_FILE, RAW_INDEX_HEADER, RAW_INDEX_MAGIC, RAW_MANIFEST_FILE,
  RAW_SUMS_FILE, type RawDeviceRecord, type RawFieldsEntry, type RawManifest, alignDevice, catalogueRules,
  rawCaptureLine, rawDerivedState, rawFieldsEntry, rawProjection, statedSha256,
} from '../src/catalogueraw.ts';

const RELEASES = 'https://api.github.com/repos/pickysysadmin/logitech-harmony-ir-archive/releases';
const offline = process.argv.includes('--offline');
const noPull = offline || process.argv.includes('--no-pull');
const force = process.argv.includes('--force');

if (IR_ARCHIVE === undefined) {
  console.error('no infrared archive: clone logitech-harmony-ir-archive beside this repository, or set HARMONY_IR_ARCHIVE');
  process.exit(1);
}
const featuresPath = imagePath('ir_archive_raw_features');
const RAW = featuresPath !== undefined ? dirname(featuresPath)
  : LAB !== undefined ? join(LAB, 'work', 'ir-archive-raw') : undefined;
if (RAW === undefined || !existsSync(join(RAW, RAW_SUMS_FILE))) {
  console.error('no raw capture in the lab: expected work/ir-archive-raw/ with its SHA256SUMS');
  process.exit(1);
}

function megabytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

// Step 1: the archive checkout.
/**
 * The checkout's commit, read out of `.git` rather than by running git, so that `--no-pull` runs no git
 * at all: a symbolic `HEAD` names a ref, which is a loose file or a line of `packed-refs`.
 */
function archiveCommit(): string | undefined {
  const dotGit = join(IR_ARCHIVE!, '.git');
  if (!existsSync(join(dotGit, 'HEAD'))) return undefined;
  const head = readFileSync(join(dotGit, 'HEAD'), 'utf8').trim();
  if (!head.startsWith('ref: ')) return head;
  const ref = head.slice(5);
  if (existsSync(join(dotGit, ref))) return readFileSync(join(dotGit, ref), 'utf8').trim();
  const packed = existsSync(join(dotGit, 'packed-refs')) ? readFileSync(join(dotGit, 'packed-refs'), 'utf8') : '';
  return packed.split('\n').find((line) => line.endsWith(` ${ref}`))?.split(' ')[0];
}
if (!noPull) {
  const said = execFileSync('git', ['-C', IR_ARCHIVE, 'pull', '--ff-only'], { encoding: 'utf8' }).trim();
  console.log(`archive: ${said.split('\n').at(-1)}`);
}
const commit = archiveCommit();
const generated = archiveManifest(IR_ARCHIVE).generated;
console.log(`archive: commit ${commit?.slice(0, 10) ?? 'unknown'}, generated ${generated}`);

// Step 2: the newest raw release.
function parseSums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (match !== null) out.set(match[2]!, match[1]!);
  }
  return out;
}

async function sha256Of(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

interface Release { tag_name: string; draft: boolean; published_at: string;
  assets: { name: string; browser_download_url: string }[] }

let release: string | undefined;
if (!offline) {
  const headers = { 'User-Agent': 'harmony-explorations', Accept: 'application/vnd.github+json' };
  const releases = await (await fetch(RELEASES, { headers })).json() as Release[];
  const newest = releases.filter((one) => one.tag_name.startsWith('raw-') && !one.draft)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))[0];
  if (newest === undefined) throw new Error('the archive publishes no raw release');
  const sumsAsset = newest.assets.find((one) => one.name === RAW_SUMS_FILE);
  if (sumsAsset === undefined) throw new Error(`release ${newest.tag_name} has no ${RAW_SUMS_FILE}`);
  const sumsText = await (await fetch(sumsAsset.browser_download_url, { headers })).text();
  const theirs = parseSums(sumsText);
  const ours = parseSums(readFileSync(join(RAW, RAW_SUMS_FILE), 'utf8'));
  const same = theirs.size === ours.size && [...theirs].every(([file, sum]) => ours.get(file) === sum);
  if (same) {
    release = newest.tag_name;
    console.log(`raw release: ${newest.tag_name} is what the lab holds`);
  } else {
    console.log(`raw release: ${newest.tag_name} differs from the lab's ${RAW_SUMS_FILE}, downloading`);
    const incoming = join(RAW, `incoming-${newest.tag_name}`);
    mkdirSync(incoming, { recursive: true });
    for (const [file, sum] of theirs) {
      const asset = newest.assets.find((one) => one.name === file);
      if (asset === undefined) throw new Error(`release ${newest.tag_name} lists ${file} and does not publish it`);
      const target = join(incoming, file);
      const reply = await fetch(asset.browser_download_url, { headers });
      if (!reply.ok || reply.body === null) throw new Error(`download of ${file} failed: ${reply.status}`);
      await pipeline(Readable.fromWeb(reply.body as never), createWriteStream(target));
      const got = await sha256Of(target);
      if (got !== sum) throw new Error(`${file}: SHA-256 ${got.slice(0, 12)}, the release states ${sum.slice(0, 12)}; old files kept`);
      console.log(`  ${file}: ${megabytes(statSync(target).size)}, checksum verified`);
    }
    // The schema notes are not in SHA256SUMS; carried along when the release has them.
    for (const extra of ['RAW-SCHEMA.md']) {
      const asset = newest.assets.find((one) => one.name === extra);
      if (asset !== undefined) writeFileSync(join(incoming, extra), Buffer.from(await (await fetch(asset.browser_download_url, { headers })).arrayBuffer()));
    }
    writeFileSync(join(incoming, RAW_SUMS_FILE), sumsText);
    // Everything verified: only now do the old files move aside.
    const previous = join(RAW, `previous-${(ours.get(RAW_FEATURES_FILE) ?? 'unknown').slice(0, 12)}`);
    mkdirSync(previous, { recursive: true });
    for (const file of readdirSync(incoming)) {
      if (existsSync(join(RAW, file))) renameSync(join(RAW, file), join(previous, file));
      renameSync(join(incoming, file), join(RAW, file));
    }
    console.log(`  the previous files are in ${previous}`);
    release = newest.tag_name;
  }
}

// Step 3: the derivation, when it is needed.
const state = rawDerivedState(RAW);
const sha256 = statedSha256(RAW, RAW_FEATURES_FILE);
if (sha256 === undefined) throw new Error(`${RAW_SUMS_FILE} states no checksum for ${RAW_FEATURES_FILE}`);
const needed = force || state.state !== 'fresh' || state.manifest.archive.generated !== generated;
console.log(`derived files: ${state.state === 'stale' ? `stale, ${state.reason}` : state.state}`
  + (state.state === 'fresh' && state.manifest.archive.generated !== generated ? ', aligned against another archive build' : ''));

if (needed) {
  const started = Date.now();
  const got = await sha256Of(join(RAW, RAW_FEATURES_FILE));
  if (got !== sha256) throw new Error(`${RAW_FEATURES_FILE} has SHA-256 ${got.slice(0, 12)}, ${RAW_SUMS_FILE} states ${sha256.slice(0, 12)}`);
  console.log(`capture: checksum verified in ${((Date.now() - started) / 1000).toFixed(0)} s`);

  // Where each device's archive record is, by global device id.
  const where = new Map<number, string>();
  const devicesRoot = join(IR_ARCHIVE, 'devices');
  for (const slug of readdirSync(devicesRoot)) {
    for (const row of JSON.parse(readFileSync(join(devicesRoot, slug, 'index.json'), 'utf8')) as { f: string; id: number }[]) {
      where.set(row.id, join(devicesRoot, slug, row.f));
    }
  }

  const derived = join(RAW, RAW_DERIVED_DIRECTORY);
  mkdirSync(derived, { recursive: true });
  // Written under temporary names and renamed at the end, manifest last, so a run that stops halfway
  // leaves either the previous derivation or nothing that `rawDerivedState` calls fresh.
  const temporary = (file: string): string => join(derived, `${file}.partial`);
  const blocks = openSync(temporary(RAW_BLOCKS_FILE), 'w');
  const entries: [id: number, line: number, block: number][] = [];
  const blockAt: [offset: number, length: number][] = [];
  let pending: string[] = [];
  let offset = 0;
  const flush = (): void => {
    if (pending.length === 0) return;
    const member = gzipSync(Buffer.from(pending.join(''), 'utf8'));
    writeSync(blocks, member);
    blockAt.push([offset, member.length]);
    offset += member.length;
    pending = [];
  };

  const side: Record<string, RawFieldsEntry> = {};
  const families = new Map<string, { compared: number; outOfOrder: number; sorted: number; stored: number;
    outOfOrderSorted: number; outOfOrderStored: number; unaligned: number }>();
  const stored = Object.fromEntries(RAW_FIELDS.map((one) => [one.name, 0]));
  let devices = 0;
  let missing = 0;
  let inputsUnaligned = 0;
  let unalignedPaths = 0;
  let largestLine = 0;
  const lines = createInterface({ input: createReadStream(join(RAW, RAW_FEATURES_FILE)).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    largestLine = Math.max(largestLine, line.length);
    entries.push([0, pending.length, blockAt.length]);
    pending.push(`${line}\n`);
    if (pending.length === RAW_BLOCK_LINES) flush();
    const raw = JSON.parse(line) as RawDeviceRecord;
    entries[entries.length - 1]![0] = raw.id;
    devices += 1;
    const file = where.get(raw.id);
    if (file === undefined) { missing += 1; continue; }
    const projection = rawProjection(raw);
    const alignment = alignDevice(projection, deviceDriving(JSON.parse(readFileSync(file, 'utf8'))));
    if (!alignment.inputsAligned) inputsUnaligned += 1;
    unalignedPaths += alignment.unaligned.length;
    for (const one of alignment.compared) {
      const counts = families.get(one.family) ?? { compared: 0, outOfOrder: 0, sorted: 0, stored: 0,
        outOfOrderSorted: 0, outOfOrderStored: 0, unaligned: 0 };
      counts.compared += 1;
      if (one.storedOutOfOrder) counts.outOfOrder += 1;
      if (one.matchesSorted) counts.sorted += 1;
      if (one.matchesStored) counts.stored += 1;
      if (one.storedOutOfOrder && one.matchesSorted) counts.outOfOrderSorted += 1;
      if (one.storedOutOfOrder && one.matchesStored) counts.outOfOrderStored += 1;
      families.set(one.family, counts);
    }
    const entry = rawFieldsEntry(projection, alignment);
    if (entry !== undefined) {
      side[String(raw.id)] = entry;
      for (const values of [...Object.values(entry.i ?? {}), ...Object.values(entry.s ?? {})]) {
        for (const name of Object.keys(values)) stored[name] = (stored[name] ?? 0) + 1;
      }
    }
  }
  flush();
  closeSync(blocks);

  // The index, sorted by id so a lookup is a binary search over a buffer.
  entries.sort((a, b) => a[0] - b[0]);
  const index = Buffer.alloc(RAW_INDEX_HEADER + entries.length * RAW_INDEX_ENTRY);
  index.write(RAW_INDEX_MAGIC, 0, 'latin1');
  index.writeUInt32LE(entries.length, 4);
  entries.forEach(([id, line, block], at) => {
    if (at > 0 && entries[at - 1]![0] === id) throw new Error(`device ${id} occurs twice in the capture`);
    const here = RAW_INDEX_HEADER + at * RAW_INDEX_ENTRY;
    index.writeUInt32LE(id, here);
    index.writeUInt32LE(line, here + 4);
    index.writeDoubleLE(blockAt[block]![0], here + 8);
    index.writeUInt32LE(blockAt[block]![1], here + 16);
  });
  writeFileSync(temporary(RAW_INDEX_FILE), index);
  writeFileSync(temporary(RAW_FIELDS_FILE), gzipSync(Buffer.from(JSON.stringify({
    fields: RAW_FIELDS.map((one) => ({ name: one.name, raw: one.raw, anchor: one.anchor, meaning: one.meaning })),
    devices: side,
  }), 'utf8')));
  for (const file of [RAW_BLOCKS_FILE, RAW_INDEX_FILE, RAW_FIELDS_FILE]) renameSync(temporary(file), join(derived, file));

  const seconds = (Date.now() - started) / 1000;
  const sizes = Object.fromEntries([RAW_BLOCKS_FILE, RAW_INDEX_FILE, RAW_FIELDS_FILE].map((file) => [file, statSync(join(derived, file)).size]));
  const manifest: RawManifest = {
    format: RAW_FIELDS_FORMAT,
    source: { file: RAW_FEATURES_FILE, sha256, ...(release === undefined ? {} : { release }) },
    archive: { generated, ...(commit === undefined ? {} : { commit }) },
    fields: RAW_FIELDS.map((one) => one.name),
    devices, blockLines: RAW_BLOCK_LINES,
    measured: {
      seconds, sizes, largestLine, devicesWithEntries: Object.keys(side).length, storedValues: stored,
      devicesNotInArchive: missing, devicesWithInputsUnaligned: inputsUnaligned, unalignedPaths,
      lists: Object.fromEntries(families),
    },
  };
  writeFileSync(join(derived, RAW_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`derived: ${devices} devices in ${seconds.toFixed(0)} s, ${missing} not in the archive`);
  for (const [file, size] of Object.entries(sizes)) console.log(`  ${file}: ${megabytes(size)}`);
  console.log(`  side file entries: ${Object.keys(side).length} devices, values stored ${JSON.stringify(stored)}`);
  console.log(`  devices whose inputs do not line up by name: ${inputsUnaligned}; paths left unaligned: ${unalignedPaths}`);
  console.log('lists compared with the archive, item 1.4 (family: compared, stored out of Order, archive equals'
    + ' Order sequence, archive equals stored order; of the out of Order ones, the same two):');
  for (const [family, counts] of families) {
    console.log(`  ${family}: ${counts.compared}, ${counts.outOfOrder}, ${counts.sorted}, ${counts.stored}; `
      + `${counts.outOfOrderSorted}, ${counts.outOfOrderStored}`);
  }
}

// Step 4: the lookup, timed. Two devices section 321 calibrated against, and the television of 305.
const probes: [string, string, number][] = [];
for (const slug of readdirSync(join(IR_ARCHIVE, 'devices'))) {
  if (!['Sony', 'Panasonic', 'LG'].includes(slug)) continue;
  for (const row of JSON.parse(readFileSync(join(IR_ARCHIVE, 'devices', slug, 'index.json'), 'utf8')) as { f: string; id: number; m: string | null }[]) {
    if (['KDL-32W705B', 'TX-P42GT30E', 'OLED65G26LA'].includes(row.m ?? '')) probes.push([slug, row.f, row.id]);
  }
}
for (const [slug, file, id] of probes) {
  let at = performance.now();
  const line = rawCaptureLine(RAW, id);
  const fetchMs = performance.now() - at;
  at = performance.now();
  const rules = catalogueRules(IR_ARCHIVE, slug, file, { raw: RAW });
  const rulesMs = performance.now() - at;
  const silent = [...rules.raw!.steps.values()].filter((one) => one['devActionType'] === 1).length;
  console.log(`lookup ${slug}/${file}: raw line ${line === undefined ? 'absent' : `${line.length} characters`} in `
    + `${fetchMs.toFixed(1)} ms, both sources in ${rulesMs.toFixed(1)} ms; ${rules.raw!.steps.size} state steps, ${silent} only recording`);
}
