/**
 * The recipe references, plan 014 and decision 32: record their fingerprints, and show where a build differs from the
 * one a reference stood for. The references are `packages/codec/test/references/`: each a recipe, and in
 * `references.json` the stamp it is built with and the fingerprint and size of its build, `builtDigest`. No build is
 * committed; the bytes a fingerprint stood for are rebuilt from the recipe at the commit that recorded it.
 *
 *   node packages/codec/bin/reference.ts --record [--name <reference>]
 *   node packages/codec/bin/reference.ts --diff --name <reference> [--at <commit>]
 *
 * **`--record`** builds every reference, or the one named, and writes its fingerprint and size into `references.json`.
 * Run it only when a change to the build is meant to move a reference, and say in the commit which change and whether
 * the new build has been on a remote.
 *
 * **`--diff`** builds the reference's recipe twice: here, and with the packages as they stood at `--at`, by default
 * the last commit that changed `references.json`, which is the code that recorded its fingerprint. The packages are
 * exported into a temporary folder with `git archive`, linked to this checkout's installed dependencies, and removed
 * afterwards; nothing in this checkout is changed. A configuration is compared byte for byte, each difference named
 * by the part of the configuration the codec's coverage says holds it; documents are compared document by document.
 */
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandLine, fail } from '@harmony/lab/cli';
import { buildFromRecipe, builtDigest, parse, type Built } from '../src/node.ts';
import { claims } from '../src/container/coverage.ts';

const cli = commandLine({
  usage: 'usage: node packages/codec/bin/reference.ts --record [--name <reference>]\n'
    + '       node packages/codec/bin/reference.ts --diff --name <reference> [--at <commit>]',
  flags: ['record', 'diff'],
  values: ['name', 'at'],
});

const FOLDER = fileURLToPath(new URL('../test/references/', import.meta.url));
const REPOSITORY = fileURLToPath(new URL('../../../', import.meta.url));
const INDEX = join(FOLDER, 'references.json');

interface Reference {
  readonly name: string;
  readonly about: string;
  readonly builtAt: string;
  readonly sha256: string;
  readonly size: number;
  readonly onRemote: string;
  readonly benchFile?: string;
  readonly stampedAt?: string;
}

const references = (): Reference[] => JSON.parse(readFileSync(INDEX, 'utf8')) as Reference[];
const account = (): unknown => JSON.parse(readFileSync(join(FOLDER, 'john-doe-account.json'), 'utf8'));
const recipe = (name: string): unknown => JSON.parse(readFileSync(join(FOLDER, `${name}.json`), 'utf8'));
const build = (r: Reference): Built => buildFromRecipe(recipe(r.name), { builtAt: r.builtAt, account: account() as never });
const sizeOf = (built: Built): number => (built.kind === 'configuration' ? built.bytes.length
  : JSON.stringify(built.documents).length + built.pictures.reduce((n, p) => n + p.png.length, 0));

if (cli.flag('record')) {
  const only = cli.value('name');
  const all = references();
  if (only !== undefined && !all.some((r) => r.name === only)) fail(`no reference is called ${only}`);
  const updated = all.map((r) => {
    if (only !== undefined && r.name !== only) return r;
    const built = build(r);
    const next = { ...r, sha256: builtDigest(built), size: sizeOf(built) };
    console.log(`${r.name}: ${next.sha256 === r.sha256 ? 'unchanged' : `${r.sha256 || 'none'} -> ${next.sha256}`}, ${next.size} bytes`);
    return next;
  });
  writeFileSync(INDEX, `${JSON.stringify(updated, null, 1)}\n`);
} else if (cli.flag('diff')) {
  const name = cli.value('name') ?? fail('--diff needs --name, the reference to compare');
  const r = references().find((one) => one.name === name) ?? fail(`no reference is called ${name}`);
  const git = (...args: string[]): string => execFileSync('git', ['-C', REPOSITORY, ...args], { encoding: 'utf8' }).trim();
  const at = cli.value('at') ?? git('log', '-1', '--format=%H', '--', 'packages/codec/test/references/references.json');
  const tree = mkdtempSync(join(tmpdir(), 'harmony-reference-'));
  try {
    exportPackages(at, tree);
    const before = buildAt(tree, r);
    const now = build(r);
    console.log(`${name}: at ${at.slice(0, 8)} ${builtDigest(before)}, here ${builtDigest(now)}`);
    if (now.kind === 'configuration' && before.kind === 'configuration') compareConfigurations(before.bytes, now.bytes);
    else compareDocuments(before, now);
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
} else {
  fail('give --record or --diff');
}

/** The packages at `commit` in `tree`, each linked to its own dependencies as this checkout has them installed. */
function exportPackages(commit: string, tree: string): void {
  execFileSync('sh', ['-c', `git -C '${REPOSITORY}' archive '${commit}' packages | tar -x -C '${tree}'`]);
  symlinkSync(join(REPOSITORY, 'node_modules'), join(tree, 'node_modules'));
  for (const name of readdirSync(join(tree, 'packages'))) {
    const installed = join(REPOSITORY, 'packages', name, 'node_modules');
    const into = join(tree, 'packages', name, 'node_modules');
    mkdirSync(join(into, '@harmony'), { recursive: true });
    for (const other of readdirSync(join(tree, 'packages'))) {
      if (other !== name) symlinkSync(join(tree, 'packages', other), join(into, '@harmony', other));
    }
    let entries: string[] = [];
    try { entries = readdirSync(installed); } catch { continue; }
    for (const entry of entries.filter((e) => e !== '@harmony' && e !== '.bin')) {
      const from = join(installed, entry);
      if (entry.startsWith('@') && !lstatSync(from).isSymbolicLink()) {
        mkdirSync(join(into, entry), { recursive: true });
        for (const scoped of readdirSync(from)) symlinkSync(realpathSync(join(from, scoped)), join(into, entry, scoped));
      } else {
        symlinkSync(realpathSync(from), join(into, entry));
      }
    }
  }
}

/** The reference built with the packages in `tree`, by a small program run there, its result read back. */
function buildAt(tree: string, r: Reference): Built {
  const out = join(tree, 'built.json');
  const program = join(tree, 'build.ts');
  writeFileSync(program, [
    `import { buildFromRecipe } from './packages/codec/src/node.ts';`,
    `import { readFileSync, writeFileSync } from 'node:fs';`,
    `const built = buildFromRecipe(JSON.parse(readFileSync(${JSON.stringify(join(FOLDER, `${r.name}.json`))}, 'utf8')),`,
    `  { builtAt: ${JSON.stringify(r.builtAt)}, account: JSON.parse(readFileSync(${JSON.stringify(join(FOLDER, 'john-doe-account.json'))}, 'utf8')) });`,
    `writeFileSync(${JSON.stringify(out)}, JSON.stringify(built.kind === 'configuration'`,
    `  ? { ...built, bytes: Buffer.from(built.bytes).toString('base64') }`,
    `  : { ...built, pictures: built.pictures.map((p) => ({ uri: p.uri, png: Buffer.from(p.png).toString('base64') })) }));`,
  ].join('\n'));
  execFileSync(process.execPath, [program], { stdio: 'inherit' });
  const read = JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown>;
  const bytes = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'base64'));
  return read['kind'] === 'configuration'
    ? { ...(read as never as Built), bytes: bytes(read['bytes'] as string) } as Built
    : { ...(read as never as Built), pictures: (read['pictures'] as { uri: string; png: string }[]).map((p) => ({ uri: p.uri, png: bytes(p.png) })) } as Built;
}

/** Where two configurations differ: the count, the first, and the parts of the earlier one that hold them. */
function compareConfigurations(a: Uint8Array, b: Uint8Array): void {
  const owner: (string | undefined)[] = new Array(a.length);
  const span: number[] = new Array(a.length).fill(Infinity);
  for (const claim of claims(parse(a))) {
    for (let k = claim.start; k < claim.start + claim.length && k < a.length; k += 1) {
      if (claim.length < span[k]!) { span[k] = claim.length; owner[k] = claim.owner; }
    }
  }
  const n = Math.min(a.length, b.length);
  let first = -1;
  let count = 0;
  const byPart = new Map<string, number>();
  for (let k = 0; k < n; k += 1) {
    if (a[k] === b[k]) continue;
    if (first < 0) first = k;
    count += 1;
    const part = owner[k] ?? 'unclaimed';
    byPart.set(part, (byPart.get(part) ?? 0) + 1);
  }
  if (first < 0 && a.length === b.length) {
    console.log('the same, byte for byte');
    return;
  }
  console.log(`${count} of ${n} common bytes differ, the first at 0x${(first < 0 ? n : first).toString(16)}; lengths ${a.length} and ${b.length}`);
  for (const [part, many] of [...byPart].sort((x, y) => y[1] - x[1])) console.log(`  ${part}: ${many}`);
}

/** Which documents and pictures of two sets differ. */
function compareDocuments(a: Built, b: Built): void {
  if (a.kind !== 'documents' || b.kind !== 'documents') {
    console.log(`one build is ${a.kind} and the other ${b.kind}`);
    return;
  }
  const names = [...new Set([...Object.keys(a.documents), ...Object.keys(b.documents)])];
  for (const d of names) {
    const x = JSON.stringify((a.documents as Record<string, unknown>)[d]);
    const y = JSON.stringify((b.documents as Record<string, unknown>)[d]);
    console.log(`  ${d}: ${x === y ? 'the same' : `differs (${x?.length ?? 0} and ${y?.length ?? 0} characters)`}`);
  }
  const pictures = (s: typeof a): Map<string, string> => new Map(s.pictures.map((p) => [p.uri, Buffer.from(p.png).toString('base64')]));
  const pa = pictures(a);
  const pb = pictures(b);
  for (const uri of new Set([...pa.keys(), ...pb.keys()])) console.log(`  ${uri.split('/').pop()}: ${pa.get(uri) === pb.get(uri) ? 'the same' : 'differs'}`);
}
