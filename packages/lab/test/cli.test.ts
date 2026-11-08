/**
 * The scripts' one command line reader, `src/cli.ts`, `todo.md` 7.3.7.
 *
 * **What is held is that it reads exactly what the 68 hand written readers it replaced read**, since moving a script
 * onto it was not allowed to change a command line anyone types: the first `--name` wins, the word after an option
 * is its value even when that word is another option, and the option is then still seen as given; `--name=value` is
 * not read; a trailing `--name` has no value; a word the script does not declare is ignored. Node's `util.parseArgs`
 * differs from the old readers in each of the first four, which is why it is not the base, and the cases below are
 * the measurement: each would fail on a reader built on it. And `--help` prints the usage and exits 0 **before** the
 * script runs, which none of them but `set-delay.ts` did.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { CommandLineSpecError, commandLine } from '../src/cli.ts';

const CHILD = fileURLToPath(new URL('./cli-child.ts', import.meta.url));

/** A command line as `process.argv` holds it: the interpreter, the script, then the words. */
const argv = (...words: string[]): string[] => ['/usr/bin/node', '/repo/packages/x/bin/script.ts', ...words];

const SPEC = {
  usage: 'usage: script.ts --in <file> [--out <file>] [--set <a=b>]... [--commit] [--detail]',
  values: ['in', 'out', 'set'],
  flags: ['commit', 'detail'],
} as const;

/** The child script run with `words`, its exit code and both of its outputs. */
function run(...words: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CHILD, ...words], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('an option takes the word after it, a flag is whether it is there, and the rest are words', () => {
  const cli = commandLine({ ...SPEC, argv: argv('--in', 'a.bin', '--commit', 'loose', '--out', 'b.bin') });
  assert.equal(cli.value('in'), 'a.bin');
  assert.equal(cli.value('out'), 'b.bin');
  assert.equal(cli.flag('commit'), true);
  assert.equal(cli.flag('detail'), false);
  assert.deepEqual(cli.words, ['--in', 'a.bin', '--commit', 'loose', '--out', 'b.bin']);
  assert.deepEqual(cli.argv, argv('--in', 'a.bin', '--commit', 'loose', '--out', 'b.bin'));
});

test('an option not given is undefined, and a flag not given is false', () => {
  const cli = commandLine({ ...SPEC, argv: argv() });
  assert.equal(cli.value('in'), undefined);
  assert.deepEqual(cli.values('set'), []);
  assert.equal(cli.flag('commit'), false);
  assert.deepEqual(cli.words, []);
});

test('a repeated option: value takes the first, values takes every one in order', () => {
  // `parseArgs` takes the last; every script here took the first.
  const cli = commandLine({ ...SPEC, argv: argv('--in', 'first', '--set', '1=2', '--in', 'second', '--set', '3=4') });
  assert.equal(cli.value('in'), 'first');
  assert.deepEqual(cli.values('set'), ['1=2', '3=4']);
});

test('the word after an option is its value even when it is another option, which is then still given', () => {
  // The case with teeth: `--commit` is a write rail's flag. The old readers saw `--commit` here, and so does this;
  // `parseArgs` consumes it as the value and reports no `--commit`.
  const cli = commandLine({ ...SPEC, argv: argv('--in', '--commit') });
  assert.equal(cli.value('in'), '--commit');
  assert.equal(cli.flag('commit'), true);
  // And an occurrence of a repeatable option followed by another is read the same way.
  assert.deepEqual(commandLine({ ...SPEC, argv: argv('--set', '--set', 'x') }).values('set'), ['--set', 'x']);
});

test('--name=value is not an option, and a trailing option has no value', () => {
  const cli = commandLine({ ...SPEC, argv: argv('--in=a.bin', '--out') });
  assert.equal(cli.value('in'), undefined, 'no script here ever read the = form');
  assert.equal(cli.value('out'), undefined);
  assert.equal(cli.flag('commit'), false);
  assert.deepEqual(commandLine({ ...SPEC, argv: argv('--set', 'a=b', '--set') }).values('set'), ['a=b']);
});

test('an unknown option is ignored, as every reader it replaced ignored it, and disturbs nothing else', () => {
  const cli = commandLine({ ...SPEC, argv: argv('--bogus', '--in', 'a.bin', '--comit') });
  assert.equal(cli.value('in'), 'a.bin');
  assert.equal(cli.flag('commit'), false, 'a misspelt flag is not the flag');
  assert.deepEqual(cli.words, ['--bogus', '--in', 'a.bin', '--comit']);
  // And in a script it runs on rather than stopping, `cli-child.ts`.
  const child = run('--bogus', '--out', 'x');
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).out, 'x');
});

test('a declared name the usage text does not mention is refused, whole names only', () => {
  // So `--help` cannot leave out an option a script reads: the names are typed, and each must be in the text.
  assert.throws(() => commandLine({ usage: 'usage: s.ts --output <file>', values: ['out'], argv: argv() }),
    (error: unknown) => error instanceof CommandLineSpecError && /--out\b/.test(error.message));
  assert.throws(() => commandLine({ usage: 'usage: s.ts --in-place', flags: ['in'], argv: argv() }), CommandLineSpecError);
  assert.doesNotThrow(() => commandLine({ usage: 'usage: s.ts [--in <file>]', values: ['in'], argv: argv() }));
});

test('--help prints the usage and exits 0 before the script runs, wherever it stands', () => {
  for (const words of [['--help'], ['--out', 'x', '--help'], ['--commit', '--help', '--set', 'a']]) {
    const child = run(...words);
    assert.equal(child.status, 0, words.join(' '));
    assert.equal(child.stdout,
      'usage: node packages/lab/test/cli-child.ts [--out <file>] [--set <value>]... [--commit] [--fail <message>]\n');
    assert.ok(!child.stdout.includes('"ran"'), 'nothing after the call ran');
    assert.equal(child.stderr, '');
  }
  // The control: without `--help` the same script does run, so the absence above is the stop and not a broken child.
  const ran = run('--out', 'x', '--set', 'a', '--set', 'b', '--commit', 'loose');
  assert.equal(ran.status, 0, ran.stderr);
  assert.deepEqual(JSON.parse(ran.stdout), {
    ran: true, out: 'x', set: ['a', 'b'], commit: true, words: ['--out', 'x', '--set', 'a', '--set', 'b', '--commit', 'loose'],
  });
});

test('fail says why on standard error and exits 1, what every copy of it did', () => {
  const child = run('--fail', '--in is the container to edit');
  assert.equal(child.status, 1);
  assert.equal(child.stderr, '--in is the container to edit\n');
  assert.equal(child.stdout, '');
});
