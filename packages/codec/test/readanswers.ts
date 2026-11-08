/**
 * The child process of `mainentryreads.test.ts`: reads configurations through one of the codec's two entries and
 * prints what the readers answer, as JSON on standard output.
 *
 * ```
 * node packages/codec/test/readanswers.ts <entry> <mode> <name>=<path> ...
 * ```
 *
 * `entry` is `main`, `src/index.ts`, which supplies no resource, or `node`, `src/node.ts`, which supplies all five,
 * `resources.ts`. **Nothing else in this file loads the codec** but `src/internal.ts`, which supplies no resource
 * either, so on `main` this process holds exactly what a renderer holds: the core and no resource. It says so in its answer, `supplied`, by asking for each resource.
 *
 * `mode` is `as-written`, or `from-font`, the control: the reader's alphabet is taken from the font again, as it
 * was until the generated module, by a load hook that rewrites `text.ts` as it loads. The rewrite is checked to
 * have happened, so a control that changed nothing cannot pass for one that bit.
 */
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const [entry, mode, ...named] = process.argv.slice(2);

/** What `readCharacterMap` says in `text.ts`, and what the control makes it say. */
const READER = '[...ALPHABETS, oxaniumAlphabet()]';
const FROM_FONT = '[...ALPHABETS, oxaniumAlphabetFromFont()]';

let rewritten = false;
if (mode === 'from-font') {
  registerHooks({
    load(url, context, nextLoad) {
      const loaded = nextLoad(url, context);
      if (!url.endsWith('/codec/src/text.ts')) return loaded;
      const source = String(loaded.source);
      if (!source.includes(READER)) throw new Error(`text.ts no longer says ${READER}: the control has nothing to rewrite`);
      rewritten = true;
      return { ...loaded, source: source.replace(READER, FROM_FONT) };
    },
  });
} else if (mode !== 'as-written') {
  throw new Error(`no mode called ${mode}`);
}

if (entry !== 'main' && entry !== 'node') throw new Error(`no entry called ${entry}`);
// The entry first, so on `node` its resources are supplied as before; then `./internal`, which loads anywhere as the
// main entry does and carries the two readers this file asks that the main entry does not since `todo.md` 7.3.6,
// `characterMap` and `resource`.
const chosen = entry === 'node' ? await import('../src/node.ts') : await import('../src/index.ts');
const codec = { ...(await import('../src/internal.ts')), ...chosen };

/** JSON for what the readers give: a map or a set as its entries, bytes as hexadecimal. */
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return { map: [...value] };
  if (value instanceof Set) return { set: [...value] };
  if (value instanceof Uint8Array) return { bytes: Buffer.from(value).toString('hex') };
  if (typeof value === 'bigint') return { bigint: value.toString() };
  if (value === undefined) return { undefined: true };
  return value;
}

const RESOURCES = ['oxanium', 'iconFont', 'iconList', 'deflate', 'sha256'] as const;
const supplied = RESOURCES.filter((name) => {
  try {
    codec.resource(name);
    return true;
  } catch (error) {
    if (error instanceof codec.ResourceError) return false;
    throw error;
  }
});

const answers: Record<string, unknown> = {};
for (const one of named) {
  const at = one.indexOf('=');
  const name = one.slice(0, at);
  const c = codec.parse(new Uint8Array(readFileSync(one.slice(at + 1))));
  try {
    answers[name] = JSON.parse(JSON.stringify({
      characterMap: codec.characterMap(c),
      devices: codec.devices(c),
      activities: codec.activities(c),
      inventory: codec.inventory(c),
    }, replacer));
  } catch (error) {
    // The refusal is the answer, named, so the test reports which configuration and which resource.
    answers[name] = { refused: `${(error as Error).constructor.name}: ${(error as Error).message}` };
  }
}

process.stdout.write(JSON.stringify({ supplied, rewritten, answers }));
