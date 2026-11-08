/**
 * The command line of every script under `packages/<name>/bin`, read one way.
 *
 * `todo.md` 7.3.7, plan 013 step 6. Until then each script carried its own `argument`, `fail`, `flag` and
 * `arguments_`, 33 copies of the first, and only one of the 68 that read a command line answered `--help`: the rest
 * ran, which is how a `--help` given to `packages/codec/bin/render.ts` wrote a file into the lab. Here
 * `--help` prints the script's usage and exits 0 before the script does anything else, for every script that reads
 * its command line through this.
 *
 * **It reads exactly what the copies read, and that is why it is not `util.parseArgs`.** Node's parser was the
 * obvious base and was measured against the scripts' shapes, and it differs from them in four places, each of which
 * would have changed a command line someone already types:
 *
 * * a repeated option: the scripts take the **first** occurrence, `parseArgs` the last;
 * * an option that takes a value consumes the next word, so in `--unit --commit` the scripts read `--unit` as
 *   `--commit` **and** see `--commit` set, where `parseArgs` sees no `--commit`. That one is a write rail's flag;
 * * `--name=value` is accepted by `parseArgs` and by none of the scripts;
 * * a trailing `--name` with nothing after it is `true` to `parseArgs` and absent to the scripts.
 *
 * So the rules are the copies' rules, stated once:
 *
 * * `value(name)` is the word after the first `--name`, or undefined where there is none;
 * * `values(name)` is the word after every `--name`, in order, an occurrence with nothing after it left out;
 * * `flag(name)` is whether `--name` is any word of the command line;
 * * `words` is everything after the script's own path, for the scripts that take positional words;
 * * **a word the script does not declare is ignored**, as every copy ignored it. Refusing an unknown flag would be
 *   a change of command line, so it is not done here; a script that wants it can compare `words` itself.
 *
 * A script declares the names it reads, and the declaration is typed, so reading an undeclared name is a type error
 * rather than an `undefined` at the bench. Every declared name must also appear in the usage text, checked on every
 * run, so the usage `--help` prints cannot leave out an option the script reads.
 *
 * Here and not in `packages/base`, because a command line belongs to a script and never to a library: `base` is
 * what FreeHarmony's renderer loads, and `@harmony/lab` is already the scripts' and the tests' package, decision 6
 * of plan 013. Nothing in it reads the disk or depends on anything.
 */

/** What a script reads off its command line, and what `--help` prints. */
export interface CommandLineSpec<V extends string, F extends string> {
  /**
   * The whole text `--help` prints, usually starting `usage:`. Every name in `values` and `flags` has to appear in
   * it as `--name`.
   */
  readonly usage: string;
  /** The options that take the word after them, named without their dashes. */
  readonly values?: readonly V[];
  /** The options that stand alone, named without their dashes. */
  readonly flags?: readonly F[];
  /** The command line to read, `process.argv` unless a test gives one: the interpreter, the script, then words. */
  readonly argv?: readonly string[];
}

/** A command line read by the rules above. */
export interface CommandLine<V extends string, F extends string> {
  /** The word after the first `--name`, or undefined. */
  value(name: V): string | undefined;
  /** The word after every `--name`, in order, an occurrence with nothing after it left out. */
  values(name: V): string[];
  /** Whether `--name` is any word of the command line. */
  flag(name: F): boolean;
  /** The words after the script's own path. */
  readonly words: readonly string[];
  /** The whole command line as given, the interpreter and the script included, for a journal that records it. */
  readonly argv: readonly string[];
  /** Print the usage to standard output and exit 0, for a script that also shows it when given nothing. */
  help(): never;
}

/** A declared name missing from the usage text: a mistake in the script, never in what was typed. */
export class CommandLineSpecError extends Error {}

/**
 * Read the command line, and on `--help` print the usage and exit 0 before returning.
 *
 * Call it as the first statement of a script, after the imports and before anything that reads, writes or opens,
 * since nothing after a `--help` may run.
 */
export function commandLine<const V extends string = never, const F extends string = never>(
  spec: CommandLineSpec<V, F>,
): CommandLine<V, F> {
  const missing = [...(spec.values ?? []), ...(spec.flags ?? [])].filter((name) => !mentions(spec.usage, name));
  if (missing.length > 0) {
    throw new CommandLineSpecError(`the usage text does not mention ${missing.map((name) => `--${name}`).join(', ')}`);
  }
  const argv = [...(spec.argv ?? process.argv)];
  const words = argv.slice(2);
  const help = (): never => {
    process.stdout.write(spec.usage.endsWith('\n') ? spec.usage : `${spec.usage}\n`);
    process.exit(0);
  };
  if (words.includes('--help')) help();
  return {
    // The whole command line is searched, as every copy searched `process.argv`, so the answers are theirs. The
    // interpreter's and the script's paths are never `--` anything, so it reads the same as searching `words`.
    value(name) {
      const at = argv.indexOf(`--${name}`);
      return at < 0 ? undefined : argv[at + 1];
    },
    values(name) {
      const out: string[] = [];
      argv.forEach((word, at) => {
        const next = argv[at + 1];
        if (word === `--${name}` && next !== undefined) out.push(next);
      });
      return out;
    },
    flag(name) {
      return argv.includes(`--${name}`);
    },
    words,
    argv,
    help,
  };
}

/** Whether `usage` names `--name` as a whole option, so `--out` is not found inside `--output`. */
function mentions(usage: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`--${escaped}(?![\\w-])`).test(usage);
}

/** Say why the script stops, on standard error, and exit 1: what every copy of `fail` did. */
export function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
