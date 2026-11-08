/**
 * Every npm dependency is pinned to an exact version.
 *
 * A range hands the choice of which bytes get installed to whoever published most recently. The
 * committed lock file narrows that window, but it does not close it: any `pnpm add`, or anyone
 * refreshing the lock, silently moves a range forward. Pinning turns a dependency update into a
 * diff someone has to approve, which is the only review that actually happens.
 *
 * This is a test rather than a line in CLAUDE.md because the rule is easy to break by accident:
 * `pnpm add` writes a caret by default, so the mistake is the tool's default behaviour.
 *
 * **And since `todo.md` 7.3.9 it holds what the packages may depend on**, the `architecture` skill and plan 013:
 * which package stands on which, at run time and for its tests, held to a table so that a new dependency between
 * packages is a line in this file's diff; no cycle; what a library's `src` loads declared as what it needs at run
 * time; the test kit reached by tests alone; `@harmony/lab` loaded by a library's `src` only where listed; no
 * import into another package's files or out of a library's `src` by a relative path; and every module of a
 * library's `src` reached from one of its entries, or listed with why it is not, which is where an experiment
 * left in a library would show. Each was a fault the architecture review found or a rule it found holding with
 * nothing to keep it so. The scans read each source's specifiers with the compiler's scanner, and each has
 * a control.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/** Every package.json in the workspace: the root, plus one per workspace project. */
function manifests(): Array<{ path: string; json: Record<string, unknown> }> {
  const files = [join(REPO_ROOT, 'package.json')];
  for (const dir of ['packages', 'apps']) {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const candidate = join(root, entry, 'package.json');
      if (existsSync(candidate)) files.push(candidate);
    }
  }
  return files.map((path) => ({
    path: path.slice(REPO_ROOT.length + 1),
    json: JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>,
  }));
}

// An exact version: three numeric parts, optionally a prerelease or build tag. Anything with a
// caret, a tilde, a comparison, an `x`, a range or a `*` fails, and so does `latest`.
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

test('no dependency is specified as a range', () => {
  const offenders: string[] = [];
  for (const { path, json } of manifests()) {
    for (const field of DEPENDENCY_FIELDS) {
      const deps = json[field] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const [name, spec] of Object.entries(deps)) {
        // A workspace sibling is not a published package, so it has no version to pin.
        if (spec.startsWith('workspace:')) continue;
        if (!EXACT.test(spec)) offenders.push(`${path}: ${field}.${name} = ${spec}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the lock file records the same exact specifiers', () => {
  // Belt and braces: package.json could be pinned while the lock file still carries a range
  // left over from an earlier install, and then `pnpm install --frozen-lockfile` would install
  // whatever that range resolved to on someone else's machine.
  const lock = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');
  const ranged = [...lock.matchAll(/^\s*specifier:\s*(.+)$/gm)]
    .map((m) => m[1]!.trim())
    .filter((spec) => !spec.startsWith('workspace:') && !EXACT.test(spec));
  assert.deepEqual(ranged, []);
});

test('the manifest scan found the workspace, rather than nothing', () => {
  // Without this, a wrong REPO_ROOT would make both checks above pass by finding no manifests.
  const found = manifests();
  // Ten packages since `todo.md` 7.3.6 added `packages/testkit`.
  assert.equal(found.length, 11, 'the workspace manifests: the root plus ten packages');
  assert.ok(found.some((m) => m.path === 'packages/codec/package.json'));
});

// The packages' boundaries, `todo.md` 7.3.9.

const PACKAGES = join(REPO_ROOT, 'packages');

/** Each package's folder name, read off `packages/`. */
const PACKAGE_NAMES: readonly string[] = readdirSync(PACKAGES)
  .filter((name) => existsSync(join(PACKAGES, name, 'package.json'))).sort();

interface Manifest {
  readonly name: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly exports?: Record<string, string>;
}

const manifestOf = (name: string): Manifest =>
  JSON.parse(readFileSync(join(PACKAGES, name, 'package.json'), 'utf8')) as Manifest;

/**
 * What each package's `src` needs at run time, its `dependencies`, whole. **Downward only**: `base` and `lab` stand
 * on nothing, `usb` and `codec` on `base` and never on each other, and everything else on those, the
 * `architecture` skill's table. A new entry here is a decision about what a product built on the package
 * installs, so it shows in this diff. `silhouettes` and `keyreader` are empty because what they ship is
 * generated or bundled, and `testkit` is never a product's.
 */
const AT_RUN_TIME: Readonly<Record<string, readonly string[]>> = {
  base: [],
  bench: ['@harmony/base', '@harmony/codec', '@harmony/corpus', '@harmony/lab', '@harmony/usb'],
  codec: ['@harmony/base', '@mdi/font', 'opentype.js'],
  corpus: ['@harmony/codec', '@harmony/lab', '@harmony/usb'],
  keyreader: [],
  lab: [],
  // `@harmony/lab` is listed while no module of `src` loads it, the review's finding, kept as found.
  probe: ['@harmony/codec', '@harmony/lab', '@harmony/usb'],
  silhouettes: [],
  testkit: ['@harmony/base', '@harmony/lab', '@harmony/usb'],
  usb: ['@harmony/base', 'node-hid'],
};

/** What only each package's tests, scripts and experiments need, its `devDependencies`, whole. */
const FOR_DEVELOPMENT: Readonly<Record<string, readonly string[]>> = {
  base: ['@harmony/testkit'],
  bench: ['@harmony/testkit', 'playwright'],
  codec: ['@harmony/lab', '@harmony/testkit', '@harmony/usb'],
  corpus: ['@harmony/base', '@harmony/testkit'],
  // The page's `src` loads `@harmony/base` and `@harmony/usb`, bundled for a browser by `bin/build.ts`.
  keyreader: ['@harmony/base', '@harmony/lab', '@harmony/silhouettes', '@harmony/usb'],
  lab: [],
  probe: ['@harmony/testkit'],
  silhouettes: ['@harmony/base', '@harmony/codec', '@harmony/corpus', '@harmony/lab', '@harmony/testkit', '@harmony/usb'],
  testkit: [],
  usb: ['@harmony/lab', '@harmony/testkit'],
};

/** A cycle in a graph of packages, as the path that closes it, or undefined when there is none. */
function cycleIn(graph: Readonly<Record<string, readonly string[]>>): string[] | undefined {
  const done = new Set<string>();
  const visit = (node: string, path: string[]): string[] | undefined => {
    if (path.includes(node)) return [...path.slice(path.indexOf(node)), node];
    if (done.has(node)) return undefined;
    for (const next of graph[node] ?? []) {
      const found = visit(next, [...path, node]);
      if (found !== undefined) return found;
    }
    done.add(node);
    return undefined;
  };
  for (const node of Object.keys(graph).sort()) {
    const found = visit(node, []);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The graph between this workspace's packages that one field of the manifests states, by folder name. */
function workspaceGraph(field: 'dependencies' | 'devDependencies'): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const name of PACKAGE_NAMES) {
    graph[name] = Object.keys(manifestOf(name)[field] ?? {})
      .filter((dep) => dep.startsWith('@harmony/')).map((dep) => dep.slice('@harmony/'.length)).sort();
  }
  return graph;
}

test('each package depends on exactly the packages of its table, at run time and for its tests', () => {
  assert.deepEqual(PACKAGE_NAMES, Object.keys(AT_RUN_TIME), 'a package added has its row in both tables');
  for (const name of PACKAGE_NAMES) {
    const manifest = manifestOf(name);
    assert.deepEqual(Object.keys(manifest.dependencies ?? {}).sort(), AT_RUN_TIME[name], `${name} at run time`);
    assert.deepEqual(Object.keys(manifest.devDependencies ?? {}).sort(), FOR_DEVELOPMENT[name], `${name} for development`);
  }
});

test('the packages stand on each other at run time with no cycle', () => {
  assert.equal(cycleIn(workspaceGraph('dependencies')), undefined);
});

test('the control: a cycle is found, and the test kit closes one through the tests of the packages it stands on', () => {
  assert.deepEqual(cycleIn({ a: ['b'], b: ['c'], c: ['a'], d: [] }), ['a', 'b', 'c', 'a']);
  assert.equal(cycleIn({ a: ['b'], b: ['c'], c: [] }), undefined);
  // Live: `base` and `usb` take the test kit for their tests and the kit stands on them, which is why those two
  // packages' tests are a project of their own, `test/tsconfig.json`, since `todo.md` 7.3.6.
  const both: Record<string, string[]> = {};
  const runTime = workspaceGraph('dependencies');
  const development = workspaceGraph('devDependencies');
  for (const name of PACKAGE_NAMES) both[name] = [...runTime[name]!, ...development[name]!];
  assert.ok(cycleIn(both)?.includes('testkit'), 'the run time and test graph together close a cycle through the kit');
});

/** Every TypeScript file under a folder, `node_modules`, build output and dot folders left out. */
function typescriptUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    // Only what is source: `dist/` is the compiler's output, and a dot folder (`.scratch/`) is ignored scratch.
    // Both are absent from a fresh worktree, which is where these checks first passed while a checkout
    // with a build and a scratch file failed them.
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...typescriptUnder(path));
    else if (/\.(ts|tsx|mts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) found.push(path);
  }
  return found;
}

/**
 * The module specifiers of a source, read by the compiler's own scanner, `ts.preProcessFile`: an import, an export
 * from, a bare import and a dynamic import with a literal, and never a string or a comment that looks like one,
 * which a line pattern took for imports in the controls below and in a screen's text, `body(61, 'command from')`.
 * The scanner leaves out `export * as name from`, which the codec's main entry uses, so that one form is added from
 * a pattern anchored at the start of a line, where a string in a control never stands.
 */
function specifiersOf(source: string): string[] {
  const found = ts.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName);
  for (const match of source.matchAll(/^\s*export\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"]/gm)) found.push(match[1]!);
  return found;
}

/** Each file's specifiers, read once, since several checks below walk the same sources. */
const READ = new Map<string, string[]>();
function specifiersIn(file: string): string[] {
  let found = READ.get(file);
  if (found === undefined) READ.set(file, found = specifiersOf(readFileSync(file, 'utf8')));
  return found;
}

/** The package a bare specifier names: `@scope/name` or `name`, without a subpath. */
const packageOf = (specifier: string): string =>
  specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');

const isBare = (specifier: string): boolean => !specifier.startsWith('.') && !specifier.startsWith('node:');

test('what a library\'s src loads is a dependency it states for run time, but in the two packages listed', () => {
  // The exceptions, each with why. A package is a product's only through what its `src` loads, so a module loaded
  // there and stated for development only is missing from what an install brings.
  const EXCEPT: Readonly<Record<string, readonly string[]>> = {
    // Bundled for a browser by `bin/build.ts`, which publishes the modules it reaches; nothing installs it.
    keyreader: ['@harmony/base', '@harmony/usb'],
    // The test kit is only ever a development dependency, and reads an entry's names with the root's compiler.
    testkit: ['typescript'],
  };
  const missing: string[] = [];
  for (const name of PACKAGE_NAMES) {
    const stated = new Set(Object.keys(manifestOf(name).dependencies ?? {}));
    const loaded = new Set<string>();
    for (const file of typescriptUnder(join(PACKAGES, name, 'src'))) {
      for (const specifier of specifiersIn(file)) if (isBare(specifier)) loaded.add(packageOf(specifier));
    }
    const unstated = [...loaded].filter((dep) => !stated.has(dep)).sort();
    assert.deepEqual(unstated, [...(EXCEPT[name] ?? [])], `${name}'s src loads what it does not state for run time`);
    if (unstated.length > 0) missing.push(name);
  }
  // The control: the scan read the sources and found the two exceptions, so an empty list elsewhere is real.
  assert.deepEqual(missing, ['keyreader', 'testkit']);
});

test('the test kit is a development dependency only, and nothing but a test imports it', () => {
  const offending: string[] = [];
  const found: string[] = [];
  for (const name of PACKAGE_NAMES) {
    if (name === 'testkit') continue;
    assert.equal(manifestOf(name).dependencies?.['@harmony/testkit'], undefined, `${name} states the kit for run time`);
    for (const file of typescriptUnder(join(PACKAGES, name))) {
      const imports = specifiersIn(file).some((s) => packageOf(s) === '@harmony/testkit');
      if (!imports) continue;
      const where = relative(join(PACKAGES, name), file);
      if (where.split(sep)[0] === 'test') found.push(`${name}/${where.split(sep).join('/')}`);
      else offending.push(`${name}/${where}`);
    }
  }
  assert.deepEqual(offending, []);
  // The control: the specifier is seen where it is used, a surface test, so an empty list above is real.
  assert.ok(found.includes('codec/test/surface.test.ts'), 'the codec\'s surface test reads names through the kit');
});

test('a library\'s src loads @harmony/lab in exactly the modules listed, each with why', () => {
  // `@harmony/lab` locates a private folder; an application has none. A module here is one a product built on its
  // package could reach, so each is a decision, plan 013 decision 6.
  const LISTED: Readonly<Record<string, string>> = {
    // The bench instrument opens lab images, loaded only when one is asked for.
    'bench/src/bench.ts': 'the bench instrument opens the lab\'s images',
    // The client of Logitech's service for the gathering track, reached by its two scripts and no entry.
    'corpus/src/myharmony.ts': 'the gathering track\'s service client keeps its session in the lab',
    // The test kit is a development dependency only.
    'testkit/src/touch-recording.ts': 'the test kit reads recorded syncs out of the lab by name',
  };
  const found: string[] = [];
  for (const name of PACKAGE_NAMES) {
    for (const file of typescriptUnder(join(PACKAGES, name, 'src'))) {
      if (specifiersIn(file).some((s) => packageOf(s) === '@harmony/lab')) {
        found.push(relative(PACKAGES, file).split(sep).join('/'));
      }
    }
  }
  assert.deepEqual(found.sort(), Object.keys(LISTED).sort());
});

/**
 * The relative specifiers of a file that leave where it may reach: its own package for any file, and its own `src`
 * for a module of a library's `src`, which loads no test, script or experiment.
 */
function reachesOut(file: string, source: string): string[] {
  const inside = relative(PACKAGES, file).split(sep);
  const own = join(PACKAGES, inside[0]!);
  const bound = inside[1] === 'src' ? join(own, 'src') : own;
  const out: string[] = [];
  for (const specifier of specifiersOf(source)) {
    if (!specifier.startsWith('.')) continue;
    const target = normalize(join(dirname(file), specifier));
    if (relative(bound, target).startsWith('..')) out.push(specifier);
  }
  return out;
}

test('no file imports another package\'s files by a relative path, and no library src reaches out of its src', () => {
  // Across packages by name and an exported subpath only, so what one package takes of another is on that
  // package's surface; a `src` module that loaded an experiment would put the experiment in every product.
  const offending: string[] = [];
  for (const name of PACKAGE_NAMES) {
    for (const file of typescriptUnder(join(PACKAGES, name))) {
      for (const specifier of reachesOut(file, readFileSync(file, 'utf8'))) {
        offending.push(`${relative(PACKAGES, file)}: ${specifier}`);
      }
    }
  }
  assert.deepEqual(offending, []);
});

test('the control: a relative import into another package or out of a src is found, and one inside is not', () => {
  const module = join(PACKAGES, 'corpus', 'src', 'write.ts');
  const script = join(PACKAGES, 'corpus', 'bin', 'write-config.ts');
  assert.deepEqual(reachesOut(module, [
    "import { a } from '../../codec/src/index.ts';",
    "import { b } from '../experiments/touchownset.ts';",
    "const c = await import('../bin/write-config.ts');",
    "import { d } from './writeconfig.ts';",
    "import { e } from '@harmony/codec';",
    // A comment and a string that read like imports, which the scanner leaves alone.
    "/** import { f } from '../../usb/src/rails.ts'; */",
    "// import { g } from '../../usb/src/rails.ts';",
    "const h = \"import { i } from '../../usb/src/rails.ts'\";",
  ].join('\n')), ['../../codec/src/index.ts', '../experiments/touchownset.ts', '../bin/write-config.ts']);
  // A script and a test reach their own package's `src` and experiments, which is what they are for.
  assert.deepEqual(reachesOut(script, "import { a } from '../src/writeconfig.ts';\nimport { b } from '../experiments/touchownset.ts';"), []);
  assert.deepEqual(reachesOut(script, "import { a } from '../../usb/src/rails.ts';"), ['../../usb/src/rails.ts']);
});

/** The entry modules of a package: what its `exports` names, or for the key reader the page it bundles. */
function entriesOf(name: string): string[] {
  const exports = manifestOf(name).exports;
  if (exports !== undefined) return Object.values(exports).map((path) => normalize(join(PACKAGES, name, path)));
  // No `exports`: the page `bin/build.ts` bundles from `src/page.ts` on, publishing what it reaches.
  return name === 'keyreader' ? [join(PACKAGES, name, 'src', 'page.ts')] : [];
}

/** The modules of a package's `src` that none of its entries reaches through relative imports. */
function unreached(name: string): string[] {
  const all = new Set(typescriptUnder(join(PACKAGES, name, 'src')));
  const seen = new Set<string>();
  const next = entriesOf(name).filter((file) => all.has(file));
  while (next.length > 0) {
    const file = next.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of specifiersIn(file)) {
      if (!specifier.startsWith('.')) continue;
      const target = normalize(join(dirname(file), specifier));
      if (all.has(target) && !seen.has(target)) next.push(target);
    }
  }
  return [...all].filter((file) => !seen.has(file)).map((file) => relative(PACKAGES, file).split(sep).join('/')).sort();
}

test('every module of a library\'s src is reached from one of its entries, or listed with why not', () => {
  // A module no entry reaches is offered to no application. It is an experiment, which lives beside its script,
  // plan 013 decision 7, or a library part missing from an entry, or a part only scripts use. Each listed here is
  // one of the last two, as found by `todo.md` 7.3.9; a module joining the list is a decision about which.
  const LISTED: Readonly<Record<string, string>> = {
    // Library parts on no entry, reached by their tests and scripts through `../src/` paths.
    'codec/src/families/harmony-600-650-700/assemble.ts': 'a setup in, a whole Harmony 600 family container out',
    'codec/src/families/harmony-600-650-700/compare.ts': 'two configurations of one setup compared, compare-setup.ts',
    'codec/src/families/harmony-600-650-700/screentexts.ts': 'every text the family draws, which assemble.ts takes',
    'codec/src/families/harmony-one/empty.ts': 'the Harmony One built from nothing, empty-one.ts',
    'codec/src/families/harmony-one/emptynumbering.ts': 'its numbering, which empty.ts takes',
    'codec/src/families/harmony-one/numbering.ts': 'its screen sets numbered by role, which empty.ts takes',
    'codec/src/families/harmony-one/skeleton.ts': 'its skeleton, which empty.ts takes',
    'codec/src/families/harmony-one/view.ts': 'a Harmony One reduced to what a person meets, for comparing two',
    // The gathering track's client of Logitech's service, `todo-secure-logitech.md`, used by harvest.ts and
    // build-setup.ts.
    'corpus/src/harvest.ts': 'a harvest\'s pieces that need no network',
    'corpus/src/myharmony.ts': 'a session with Logitech\'s service',
    'corpus/src/record.ts': 'the calls on one remote record the two scripts share',
    'corpus/src/setup.ts': 'a setup as data and the payload that puts an activity on a record',
  };
  const found = PACKAGE_NAMES.flatMap(unreached);
  assert.deepEqual(found, Object.keys(LISTED).sort());
});

test('the control: a module only a script imports is unreached, and the walk follows an entry down', () => {
  // Live, over the codec: the walk reaches the container reader below the entries, and the One's empty build,
  // which only its script and tests import, is not reached.
  const codec = unreached('codec');
  assert.ok(!codec.includes('codec/src/container/gspm.ts'), 'the container reader, which every entry reaches');
  assert.ok(codec.includes('codec/src/families/harmony-one/empty.ts'));
  assert.ok(statSync(join(PACKAGES, 'codec', 'src', 'container', 'gspm.ts')).isFile());
  // And every package with entries had them found, rather than an empty walk listing everything as unreached.
  for (const name of PACKAGE_NAMES) assert.ok(entriesOf(name).length > 0 || name === 'testkit', name);
});
