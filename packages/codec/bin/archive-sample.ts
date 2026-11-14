/**
 * Check the lab's sample of the infrared archive against its list, or take the sample out of a checkout.
 *
 * ```
 * node packages/codec/bin/archive-sample.ts            check the lab's sample against the list
 * node packages/codec/bin/archive-sample.ts --take     copy what the list names out of the checkout, into the lab
 * node packages/codec/bin/archive-sample.ts --take --repin   the same, at the checkout's release whatever the list states
 * ```
 *
 * **Why there is a sample.** The tests read a fixed copy of the few hundred archive files they need and never the
 * checkout, which is a third party's living repository and moves with every pull, `IR_ARCHIVE_SAMPLE` in
 * `@harmony/lab`. The copy is in the lab, since the files are Logitech's, and this repository holds its list, every
 * path with the SHA-256 it was copied at.
 *
 * **Taking it.** Each listed file is copied from the checkout into the lab, and its bytes must be the listed
 * checksum's. A file the lab already holds at its checksum is left alone, so a checkout that has moved on does no
 * harm to a sample already taken. A file the lab lacks and the checkout holds at other bytes is refused, by name:
 * the checkout is at another release than the list was pinned at, and mixing two releases in one sample is how a
 * device would come to name a codeset that is no longer its own. `--repin` is the deliberate way through: every
 * file is taken from the checkout as it is and the list rewritten with what was copied, which moves the whole sample
 * to that release, and the tests that hold its contents are then run and repinned where they differ.
 *
 * **Adding a file** a test needs: add its line to the list with `-` for the checksum and take the sample; the
 * checksum is written in. Files in the lab's copy that the list no longer names are removed.
 *
 * Beside the copies it writes one note of ours, when the sample was taken, which release the checkout stated and the
 * checkout's commit authors, which `tools/reference_guards.py` keeps out of the reference without this repository
 * naming them. Reads the checkout, writes the lab and the list; no network, no remote.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  formatSampleList, IR_ARCHIVE, IR_ARCHIVE_SAMPLE_LIST, IR_ARCHIVE_SAMPLE_NOTE, irArchiveSampleIn, LAB, parseSampleList,
  sampleFaults, sha256OfFile, type SampleEntry,
} from '@harmony/lab';
import { commandLine } from '@harmony/lab/cli';

/** The lines git prints for a command in the checkout, or none where it is no git checkout. */
function gitLines(checkout: string, args: readonly string[]): string[] {
  try {
    return execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8' }).split('\n').filter((line) => line !== '');
  } catch {
    return [];
  }
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

/** Copy what the list names out of the checkout; the problems met, and the list as it stands afterwards. */
function take(checkout: string, sample: string, entries: readonly SampleEntry[], repin: boolean): { problems: string[]; entries: SampleEntry[]; copied: number } {
  const problems: string[] = [];
  const after: SampleEntry[] = [];
  let copied = 0;
  for (const one of entries) {
    const target = join(sample, ...one.path.split('/'));
    const source = join(checkout, ...one.path.split('/'));
    const held = existsSync(target) && statSync(target).isFile() ? sha256OfFile(target) : undefined;
    // Already taken, at the bytes the list states: the sample is fixed, whatever the checkout holds now.
    if (!repin && one.sha256 !== undefined && held === one.sha256) { after.push(one); continue; }
    if (!existsSync(source)) { problems.push(`${one.path}: not in the checkout`); after.push(one); continue; }
    const found = sha256OfFile(source);
    if (!repin && one.sha256 !== undefined && found !== one.sha256) {
      problems.push(`${one.path}: the checkout holds other bytes than the list states, so it is at another release`);
      after.push(one);
      continue;
    }
    if (held !== found) {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
      copied += 1;
    }
    after.push({ path: one.path, sha256: found });
  }
  return { problems, entries: after, copied };
}

function main(): void {
  const cli = commandLine({
    usage: 'usage: node packages/codec/bin/archive-sample.ts [--take [--repin]]',
    flags: ['take', 'repin'],
  });
  if (LAB === undefined) { console.error('no lab: the sample is kept there'); process.exit(1); }
  const sample = irArchiveSampleIn(LAB);
  let entries = parseSampleList(readFileSync(IR_ARCHIVE_SAMPLE_LIST, 'utf8'));

  if (cli.flag('take')) {
    if (IR_ARCHIVE === undefined || !existsSync(IR_ARCHIVE)) { console.error('no checkout of the infrared archive to take the sample from'); process.exit(1); }
    mkdirSync(sample, { recursive: true });
    const taken = take(IR_ARCHIVE, sample, entries, cli.flag('repin'));
    for (const problem of taken.problems) console.error(problem);
    if (taken.problems.length > 0) {
      console.error(`${taken.problems.length} file(s) not taken; nothing else was changed in the list`);
      process.exit(1);
    }
    entries = taken.entries;
    // What the list no longer names leaves the lab's copy, so the folder is the list and nothing more.
    const listed = new Set(entries.map((one) => one.path));
    let removed = 0;
    for (const path of filesUnder(sample)) {
      if (listed.has(path) || path === IR_ARCHIVE_SAMPLE_NOTE) continue;
      rmSync(join(sample, ...path.split('/')));
      removed += 1;
    }
    const list = formatSampleList(entries);
    const listChanged = list !== readFileSync(IR_ARCHIVE_SAMPLE_LIST, 'utf8');
    if (listChanged) writeFileSync(IR_ARCHIVE_SAMPLE_LIST, list);
    const note = join(sample, IR_ARCHIVE_SAMPLE_NOTE);
    if (taken.copied > 0 || removed > 0 || !existsSync(note)) {
      const manifest = join(sample, 'manifest.json');
      const release = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, 'utf8')) as { generated?: unknown }).generated : undefined;
      const people = [
        ...gitLines(IR_ARCHIVE, ['log', '--format=%an%n%ae']),
        ...gitLines(IR_ARCHIVE, ['remote', 'get-url', 'origin']),
      ];
      writeFileSync(note, `${JSON.stringify({
        what: 'A sample of the infrared archive for this project\'s tests; the list is packages/lab/ir-archive-sample.sha256 in the repository.',
        taken: new Date().toISOString().slice(0, 10),
        release: typeof release === 'string' ? release : null,
        files: entries.length,
        people: [...new Set(people)],
      }, null, 2)}\n`);
    }
    console.log(`${entries.length} files in the sample, ${taken.copied} copied, ${removed} removed${listChanged ? ', the list rewritten' : ''}`);
  }

  const faults = sampleFaults(sample, entries, [IR_ARCHIVE_SAMPLE_NOTE]);
  for (const fault of faults) console.error(fault);
  if (faults.length > 0) {
    console.error(`the lab's sample differs from the list in ${faults.length} place(s)`);
    process.exit(1);
  }
  console.log(`the lab's sample of the infrared archive is its list: ${entries.length} files`);
}

if (import.meta.main) main();
