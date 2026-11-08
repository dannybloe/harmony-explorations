/**
 * The child process of `cli.test.ts`: a script that reads its command line through `commandLine`, as every script
 * under `packages/<name>/bin` does, and then says what it read, as JSON on standard output.
 *
 * ```
 * node packages/lab/test/cli-child.ts [--out <file>] [--set <value>]... [--commit] [--fail <message>] [words]
 * ```
 *
 * A child, because `--help` and `fail` end the process, which is the whole point of both: a test in the runner's
 * own process could not see an exit code, nor that nothing after `--help` ran. **`ran` is printed only past the
 * call**, so its absence is what shows `--help` stopped the script before it did anything.
 */
import { commandLine, fail } from '../src/cli.ts';

const cli = commandLine({
  usage: 'usage: node packages/lab/test/cli-child.ts [--out <file>] [--set <value>]... [--commit] [--fail <message>]',
  values: ['out', 'set', 'fail'],
  flags: ['commit'],
});

const message = cli.value('fail');
if (message !== undefined) fail(message);
process.stdout.write(`${JSON.stringify({
  ran: true,
  out: cli.value('out') ?? null,
  set: cli.values('set'),
  commit: cli.flag('commit'),
  words: cli.words,
})}\n`);
