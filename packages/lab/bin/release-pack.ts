/**
 * Make a release on this machine: compile the packages an application takes, stage each one as the folder a
 * tarball is made from, and pack it. Nothing is published, and nothing here can publish: the committed
 * `package.json` files stay `private`, and only the staged copy leaves that out.
 *
 *     node packages/lab/bin/release-pack.ts [--dry-run]
 *
 * Why a compile at all: Node refuses to strip types from a file under `node_modules`, so a package an application
 * installs has to ship JavaScript. Why a staging folder and not a pack of the package itself: the tarball's
 * `package.json` is not the committed one (its `exports` name the compiled files, it is not private, its
 * dependencies on the workspace's own packages are versions), and a pack of the package folder would carry its
 * tests, fixtures and scripts as well. The staging folder holds exactly what may leave the machine.
 *
 * The output is under `release/`, which git ignores: `release/build` is the compile, `release/stage` the folders
 * and `release/tarballs` the tarballs. `bin/release-check.ts` installs the tarballs into a throwaway project and
 * loads them.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandLine } from '@freeharmony-sdk/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/lab/bin/release-pack.ts [--dry-run]',
    '',
    'Compiles base, usb, config, remote and silhouettes, stages each as the folder its tarball is made from and packs',
    'the tarballs into release/tarballs, printing each with its size and SHA-256 and the files it holds.',
    '',
    '  --dry-run   compile and stage, print the same lists, and pack nothing',
    '',
    'Nothing is published and nothing leaves release/.',
  ].join('\n'),
  flags: ['dry-run'],
});

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RELEASE = join(ROOT, 'release');
const BUILD = join(RELEASE, 'build');
const STAGE = join(RELEASE, 'stage');
const TARBALLS = join(RELEASE, 'tarballs');

/**
 * The packages a release carries, in dependency order, each with the folders it needs at run time beside its
 * compiled code. Not here on purpose: `lab`, which locates a private folder an application does not have, so no
 * released package may depend on it, decision 45, and `testkit`, `bench`, `probe` and `keyreader`, which an
 * application never builds on.
 */
interface Shipped {
  readonly name: string;
  readonly resources: readonly string[];
  /**
   * Subpaths the workspace uses and a release leaves out, each with the module it names: the entry is dropped from
   * the tarball's `exports` and the compiled module from its files. For what serves this repository's own bench and
   * scripts and no application.
   */
  readonly withheld?: Readonly<Record<string, string>>;
}

const SHIPPED: readonly Shipped[] = [
  { name: 'base', resources: [] },
  { name: 'usb', resources: [] },
  // The codec's Node resources read `fonts/Oxanium` relative to the compiled module, which is why the compile keeps
  // `rootDir: src` and the folder sits beside `dist`.
  { name: 'config', resources: ['fonts'] },
  // Filing a read away in the lab's folder layout is the bench's and the scripts' own; an application keeps what
  // it reads where it chooses.
  {
    name: 'remote',
    resources: [],
    withheld: {
      './file': 'file',
    },
  },
  { name: 'silhouettes', resources: [] },
];

interface Manifest {
  name: string;
  version: string;
  description?: string;
  license?: string;
  type?: string;
  private?: boolean;
  exports: Record<string, string>;
  dependencies?: Record<string, string>;
  [key: string]: unknown;
}

/** What the release reads from the root manifest: the one version, the licence, and where the SDK is documented and kept. */
interface RootManifest {
  version: string;
  license: string;
  homepage: string;
  repository: { type: string; url: string };
  engines?: unknown;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Run a command, show its output and stop the release on failure. */
function run(command: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) {
    process.stderr.write(`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}${result.stderr}`);
    process.exit(1);
  }
  return result.stdout;
}

/**
 * The tarball's manifest, made from the committed one.
 *
 * * `exports` points at the compiled files, types first as a type checker reads the first condition that matches;
 * * the version is the root's, so there is one place to change it and every package carries the same;
 * * a dependency on a workspace package becomes that exact version, because a tarball cannot say `workspace:*`;
 * * development dependencies and scripts are dropped, an application does not install them and they name packages
 *   that are not in a registry;
 * * `private` is absent here only, so an accidental publish of the committed package still fails;
 * * `homepage` and `repository` are the root's, the repository with the package's own folder, so somebody holding
 *   only the tarball finds the documentation and the source.
 */
function releaseManifest(committed: Manifest, root: RootManifest, shipped: Shipped): Manifest {
  const { name: folder, resources, withheld = {} } = shipped;
  const exports: Record<string, unknown> = {};
  for (const [subpath, target] of Object.entries(committed.exports)) {
    // A withheld subpath is not an entry of the release.
    if (Object.hasOwn(withheld, subpath)) continue;
    const stem = target.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, '');
    exports[subpath] = { types: `${stem}.d.ts`, default: `${stem}.js` };
  }
  const dependencies: Record<string, string> = {};
  for (const [name, range] of Object.entries(committed.dependencies ?? {})) {
    dependencies[name] = range.startsWith('workspace:') ? root.version : range;
  }
  const manifest: Record<string, unknown> = {
    name: committed.name,
    version: root.version,
    description: committed.description,
    license: root.license,
    type: committed.type,
    homepage: root.homepage,
    repository: {
      ...root.repository,
      directory: `packages/${folder}`,
    },
    exports,
    files: ['dist', '!dist/**/*.map', ...resources],
  };
  if (Object.keys(dependencies).length > 0) manifest['dependencies'] = dependencies;
  if (root.engines !== undefined) manifest['engines'] = root.engines;
  return manifest as unknown as Manifest;
}

/** Every file under a folder, as a path from the folder, sorted. */
function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, base));
    else out.push(relative(base, path));
  }
  return out.sort();
}

/**
 * Carry a package's hand written declaration files into its compiled folder, and make the emitted declarations find
 * them. The compiler copies no `.d.ts` it was given as a source, and an ambient `declare module` is seen by a consumer
 * only if something it already reads points at the file. The codec states the shape of the one package it uses that
 * ships no types, `opentype.js`, this way, and without this its declarations would name a module the consumer's
 * compiler cannot find.
 */
function carryAmbientDeclarations(name: string, dist: string): void {
  const src = join(ROOT, 'packages', name, 'src');
  const written = walk(src).filter((file) => file.endsWith('.d.ts'));
  for (const file of written) {
    cpSync(join(src, file), join(dist, file));
    const modules = [...readFileSync(join(src, file), 'utf8').matchAll(/declare module '([^']+)'/g)].map((m) => m[1]!);
    for (const emitted of walk(dist).filter((f) => f.endsWith('.d.ts') && f !== file)) {
      const path = join(dist, emitted);
      const text = readFileSync(path, 'utf8');
      if (!modules.some((module) => text.includes(`from '${module}'`))) continue;
      const toFile = relative(dirname(path), join(dist, file));
      writeFileSync(path, `/// <reference path="${toFile.startsWith('.') ? toFile : `./${toFile}`}" />\n${text}`);
    }
  }
}

/**
 * The tarball's README: what the package is, in the manifest's own sentence, how the five belong together and where
 * the documentation is. Written here and not kept as a file per package, so it cannot say something else than the
 * manifest packed beside it.
 */
function releaseReadme(manifest: Manifest, root: RootManifest): string {

  return [
    `# ${manifest.name}`,
    '',
    `${manifest.description}.`,
    '',
    'One of the five packages of the FreeHarmony SDK, which reads, edits, builds and syncs the configuration of a',
    'Logitech Harmony remote. The five are released together under one version and depend on each other at exactly',
    'that version.',
    '',
    `Documentation, with a guide and the API reference: ${root.homepage}`,
    '',
    `Licence: ${root.license}.`,
    '',
  ].join('\n');

}

const rootManifest = readJson<RootManifest>(join(ROOT, 'package.json'));

// A fresh release every time: a file left from an earlier run would be packed without anyone having chosen it.
// The compile keeps its own incremental state and is not cleared.
// A dry run leaves the tarballs of an earlier run alone, since it makes none.
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
if (!cli.flag('dry-run')) {
  rmSync(TARBALLS, { recursive: true, force: true });
  mkdirSync(TARBALLS, { recursive: true });
}

console.log('compiling');
run(join(ROOT, 'node_modules', '.bin', 'tsc'), ['--build', 'tsconfig.release.json'], ROOT);

let packed = 0;
for (const shipped of SHIPPED) {
  const { name, resources, withheld = {} } = shipped;
  const stage = join(STAGE, name);
  const committed = readJson<Manifest>(join(ROOT, 'packages', name, 'package.json'));

  // The compiled code, without anything a consumer cannot use: a map points at sources the tarball does not carry.
  cpSync(join(BUILD, name), join(stage, 'dist'), {
    recursive: true,
    filter: (source) => !source.endsWith('.map') && !source.endsWith('.tsbuildinfo'),
  });
  carryAmbientDeclarations(name, join(stage, 'dist'));

  // A withheld module leaves with its entry. A module the release still carries must not import it, or the tarball
  // would name a file it does not hold; the release check loads every entry, which is what finds that.
  for (const module of Object.values(withheld)) {
    rmSync(join(stage, 'dist', `${module}.js`));
    rmSync(join(stage, 'dist', `${module}.d.ts`));
  }

  for (const resource of resources) cpSync(join(ROOT, 'packages', name, resource), join(stage, resource), { recursive: true });
  cpSync(join(ROOT, 'LICENSE'), join(stage, 'LICENSE'));
  const manifest = releaseManifest(
    committed,
    rootManifest,
    shipped,
  );

  writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(stage, 'README.md'), releaseReadme(manifest, rootManifest));

  // npm only to make the archive: no script runs and nothing is fetched. `--dry-run` builds the same list without
  // writing the file.
  const json = run(
    'npm',
    ['pack', '--json', '--ignore-scripts', ...(cli.flag('dry-run') ? ['--dry-run'] : ['--pack-destination', TARBALLS])],
    stage,
  );
  const report = (JSON.parse(json) as Array<{ filename: string; size: number; unpackedSize: number; files: Array<{ path: string }> }>)[0]!;

  const tarball = join(TARBALLS, report.filename);
  const digest = cli.flag('dry-run') ? 'not packed' : createHash('sha256').update(readFileSync(tarball)).digest('hex');
  console.log('');
  console.log(`${committed.name}@${rootManifest.version}  ${report.filename}`);
  console.log(`  size    ${report.size} bytes packed, ${report.unpackedSize} unpacked, ${report.files.length} files`);
  console.log(`  sha256  ${digest}`);
  for (const file of report.files.map((f) => f.path).sort()) console.log(`    ${file}`);
  packed += 1;
}

console.log('');
console.log(
  cli.flag('dry-run')
    ? `dry run: ${packed} packages listed, nothing packed`
    : `${packed} tarballs in ${TARBALLS}`,
);
