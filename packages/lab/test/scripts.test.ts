/**
 * Every script under `packages/<name>/bin` reads its command line through `@harmony/lab/cli`, and before anything
 * else it does.
 *
 * Before this reader 68 scripts read `process.argv` by hand, each with its own copy of `argument` and `fail`, and only one
 * of them answered `--help`; the rest ran, which is how a `--help` given to `packages/codec/bin/render.ts` wrote a
 * file into the lab. So three things are held here, over every script, by reading their text, since a script runs
 * when it is imported and some of them open a remote:
 *
 * * **No script reads `process.argv` itself**, beyond the two entry point checks listed below with their reason.
 * * **Every script that runs calls `commandLine`**, the three modules that are only imported listed with theirs.
 * * **The call is the first thing that runs**: at the top of the module, nothing but imports and comments above it,
 *   or the first statement of the block that runs the script. A call further down would still answer `--help`,
 *   after whatever came before it had run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGES = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/** Every script, as `<package>/bin/<file>`. */
function scripts(): string[] {
  const out: string[] = [];
  for (const name of readdirSync(PACKAGES).sort()) {
    const bin = join(PACKAGES, name, 'bin');
    if (!existsSync(bin)) continue;
    for (const file of readdirSync(bin).sort()) if (file.endsWith('.ts')) out.push(`${name}/bin/${file}`);
  }
  return out;
}

const text = (script: string): string => readFileSync(join(PACKAGES, script), 'utf8');

/**
 * The reads of `process.argv` left in a script, and why. Both ask whether the module is the one being run, so that a
 * test importing it does not run it; neither reads an option. `import.meta.main` asks the same and is what the other
 * scripts use, and switching these two to it was left out of a step that was to change no behaviour.
 */
const ENTRY_POINT_CHECKS: Readonly<Record<string, string>> = {
  'silhouettes/bin/extract.ts': 'if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {',
  'silhouettes/bin/remotes.ts':
    'if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {',
};

/** Modules under `bin` that are imported and never run, so they read no command line. */
const NOT_RUN: Readonly<Record<string, string>> = {
  'codec/bin/corpus.ts': 'the lists of containers the corpus tools and their tests share',
  'codec/bin/drawings.ts': "the calibration drawings' keys, read by the codec's tests",
  'keyreader/bin/drawings.ts': "the drawn models' words, read by bin/build.ts and the key reader's tests",
};

test('the scan found the scripts, rather than nothing', () => {
  // Without this a wrong path would make every check below pass on no files. 74 on 8 November 2026, 77 on 9 November with the codec's carry-codes, build-recipe and reference scripts, 78 on 10 November with the requirements document's.
  const all = scripts();
  assert.equal(all.length, 78);
  for (const one of [...Object.keys(ENTRY_POINT_CHECKS), ...Object.keys(NOT_RUN)]) assert.ok(all.includes(one), one);
});

test('no script reads process.argv itself, beyond the entry point checks listed with their reason', () => {
  const offenders: string[] = [];
  for (const script of scripts()) {
    let source = text(script);
    const allowed = ENTRY_POINT_CHECKS[script];
    if (allowed !== undefined) {
      assert.equal(source.split(allowed).length, 2, `${script} still holds its entry point check, once`);
      source = source.replace(allowed, '');
    }
    if (source.includes('process.argv')) offenders.push(script);
  }
  assert.deepEqual(offenders, []);
});

test('every script that runs reads its command line through @harmony/lab/cli, once', () => {
  const missing: string[] = [];
  for (const script of scripts()) {
    if (NOT_RUN[script] !== undefined) continue;
    const source = text(script);
    const imported = /^import \{[^}]*\bcommandLine\b[^}]*\} from '@harmony\/lab\/cli';$/m.test(source);
    const calls = source.split('commandLine({').length - 1;
    if (!imported || calls !== 1) missing.push(`${script}: imported ${imported}, ${calls} calls`);
  }
  assert.deepEqual(missing, []);
  // And the modules that are only imported read none, so a test importing them never meets a `--help`.
  for (const script of Object.keys(NOT_RUN)) assert.ok(!text(script).includes('commandLine('), script);
});

test('the call is the first thing a script runs', () => {
  const late: string[] = [];
  for (const script of scripts()) {
    if (NOT_RUN[script] !== undefined) continue;
    const lines = text(script).split('\n');
    const at = lines.findIndex((line) => /^\s*(?:const cli = )?commandLine\(\{$/.test(line));
    if (at < 0) {
      late.push(`${script}: no call`);
      continue;
    }
    if (/^\s/.test(lines[at]!)) {
      // Inside the block that runs the script: the first statement of `main` or of the entry point check.
      const before = lines.slice(0, at).filter((line) => line.trim() !== '').at(-1) ?? '';
      if (!/^(?:async )?function main\(\): (?:Promise<)?void>? \{$|^if \(.*\) \{$/.test(before)) late.push(`${script}: after ${before}`);
      continue;
    }
    // At the top of the module: nothing above it but imports and comments.
    let inComment = false;
    let inImport = false;
    for (const line of lines.slice(0, at)) {
      const trimmed = line.trim();
      if (inComment) {
        inComment = !trimmed.includes('*/');
        continue;
      }
      if (inImport) {
        inImport = !trimmed.endsWith(';');
        continue;
      }
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#!')) continue;
      if (trimmed.startsWith('/*')) {
        inComment = !trimmed.includes('*/');
        continue;
      }
      if (line.startsWith('import ')) {
        inImport = !trimmed.endsWith(';');
        continue;
      }
      late.push(`${script}: after ${trimmed}`);
      break;
    }
  }
  assert.deepEqual(late, []);
});
