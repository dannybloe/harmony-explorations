/**
 * Check that an application can use what `release-pack.ts` made: the tarballs hold only what may leave the machine,
 * install offline into a project of their own, and every subpath they export loads under plain Node.
 *
 *     node packages/lab/bin/release-check.ts [--keep]
 *
 * Nothing is fetched and nothing is published. The throwaway project is made under the system's temporary folder,
 * outside this repository, with the `package.json` and the overrides a consumer writes to take the tarballs: a packed
 * package names its dependencies on the others by version, which no registry holds, so each name is pointed at its
 * tarball.
 *
 * **What it covers:** the file list of every tarball against an allowed list written here and not taken from the pack
 * script, the manifests, the install, the load of every subpath of every packed `exports` map with no flag (so Node's
 * refusal to strip types under `node_modules` would show), that the codec's Node entry reads its fonts and the icon
 * package from the installed copies, and a type check of an import of every subpath by a consumer.
 *
 * **What it does not cover:** the native HID binding. `node-hid` is a dependency of `usb`, loaded only when a remote
 * is opened, and its own install needs a binary fetched from the network, so the project points it at an empty stand-in
 * and the load of `usb` proves nothing about it. No remote is opened, and nothing here enumerates one. `@mdi/font` and
 * `opentype.js` are installed from the local package store, so a store without them stops the check.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandLine } from '@freeharmony-sdk/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/lab/bin/release-check.ts [--keep]',
    '',
    'Checks the tarballs in release/tarballs (make them with release-pack first): their file lists, their manifests, an',
    'offline install into a throwaway project and the load of every subpath they export.',
    '',
    '  --keep   leave the throwaway project in place and print where it is',
  ].join('\n'),
  flags: ['keep'],
});

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const TARBALLS = join(ROOT, 'release', 'tarballs');

/**
 * The files a tarball may hold, each as a whole path with the folder `package/` removed. Written out and not shared
 * with the pack script: a check that reads the same list it checks is a check of nothing. Compiled code and its
 * declarations, the manifest and the licence, and the codec's font and the font's own licence. A map, a test, a
 * fixture, a script or anything under `var` matches none of these.
 */
const ALLOWED: readonly RegExp[] = [
  /^package\.json$/,
  /^LICENSE$/,
  /^dist\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.js$/,
  /^dist\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.d\.ts$/,
  /^fonts\/Oxanium\/OFL\.txt$/,
  /^fonts\/Oxanium\/static\/Oxanium-[A-Za-z]+\.ttf$/,
];

/** Names that must never appear in a path, said separately so the failure names the reason. */
const NEVER: ReadonlyArray<readonly [RegExp, string]> = [
  [/\.map$/, 'a source map'],
  [/(?:^|\/)(?:test|tests|bin|var|experiments|fixtures?)\//, 'a test, script, experiment, fixture or var file'],
  [/\.test\.[jt]s$/, 'a test'],
  [/(?:^|\/)node_modules\//, 'an installed dependency'],
];

const failures: string[] = [];
function fail(message: string): void {
  failures.push(message);
  console.log(`  FAIL ${message}`);
}
function ok(message: string): void {
  console.log(`  ok   ${message}`);
}

function run(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env });
}

// Which tarballs there are is read off the folder, so the check follows whatever the pack script made.
if (!existsSync(TARBALLS)) {
  console.error('there is no release/tarballs: run make release-pack first');
  process.exit(1);
}
const tarballs = readdirSync(TARBALLS).filter((f) => f.endsWith('.tgz')).sort();
if (tarballs.length === 0) {
  console.error('release/tarballs holds no tarball: run make release-pack first');
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'harmony-release-check-'));

interface Packed {
  readonly file: string;
  readonly manifest: {
    name: string;
    version: string;
    private?: unknown;
    license?: string;
    exports: Record<string, { types: string; default: string }>;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
  };
  readonly files: readonly string[];
}

// 1. What is in each tarball.
console.log('tarballs');
const packed: Packed[] = [];
for (const file of tarballs) {
  const path = join(TARBALLS, file);
  const listing = run('tar', ['-tzf', path], scratch);
  if (listing.status !== 0) {
    fail(`${file}: tar could not list it: ${listing.stderr}`);
    continue;
  }
  const files = listing.stdout
    .split('\n')
    .filter((line) => line !== '' && !line.endsWith('/'))
    .map((line) => line.replace(/^package\//, ''));
  const into = join(scratch, 'unpacked', file.replace(/\.tgz$/, ''));
  mkdirSync(into, { recursive: true });
  const extract = run('tar', ['-xzf', path, '-C', into, '--strip-components=1'], scratch);
  if (extract.status !== 0) {
    fail(`${file}: tar could not unpack it: ${extract.stderr}`);
    continue;
  }
  let bad = 0;
  for (const name of files) {
    const never = NEVER.find(([pattern]) => pattern.test(name));
    if (never !== undefined) {
      fail(`${file}: ${name} is ${never[1]}`);
      bad += 1;
    } else if (!ALLOWED.some((pattern) => pattern.test(name))) {
      fail(`${file}: ${name} is not on the list of files a tarball may hold`);
      bad += 1;
    }
  }
  if (bad === 0) ok(`${file}: ${files.length} files, all on the allowed list`);
  packed.push({ file, manifest: JSON.parse(readFileSync(join(into, 'package.json'), 'utf8')), files });
}

// 2. The manifests: one version, no `private`, a licence with its text, and every `exports` target in the tarball.
console.log('manifests');
const versions = new Set(packed.map((p) => p.manifest.version));
if (versions.size === 1) ok(`one version, ${[...versions][0]}`);
else fail(`the packages carry ${versions.size} versions: ${[...versions].join(', ')}`);
const names = new Set(packed.map((p) => p.manifest.name));
for (const p of packed) {
  const { manifest, files } = p;
  if ('private' in manifest) fail(`${manifest.name} is private in its tarball`);
  if (manifest.license === undefined || !files.includes('LICENSE')) fail(`${manifest.name} states no licence or carries no LICENSE`);
  for (const forbidden of ['scripts', 'devDependencies']) {
    if (forbidden in manifest) fail(`${manifest.name} carries ${forbidden}`);
  }
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith('@freeharmony-sdk/')) {
      if (!names.has(name)) fail(`${manifest.name} depends on ${name}, which is in no tarball`);
      if (range !== manifest.version) fail(`${manifest.name} depends on ${name} at ${range} and not at its own version`);
    } else if (!/^\d+\.\d+\.\d+$/.test(range)) {
      fail(`${manifest.name} depends on ${name} at ${range}, which is not an exact version`);
    }
  }
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    for (const file of [target.types, target.default]) {
      if (!files.includes(file.replace(/^\.\//, ''))) fail(`${manifest.name} exports ${subpath} as ${file}, which is not in the tarball`);
    }
  }
}
if (failures.length === 0) ok('no private, one licence, exact versions, every export target packed');

// 3. A consumer: the project, the overrides, the offline install.
console.log('install');
const project = join(scratch, 'consumer');
mkdirSync(project, { recursive: true });
const tarballUrl = (p: Packed): string => `file:${join(TARBALLS, p.file)}`;
const standIn = join(scratch, 'node-hid-stand-in');
mkdirSync(standIn, { recursive: true });
writeFileSync(join(standIn, 'package.json'), JSON.stringify({ name: 'node-hid', version: '3.4.0', main: 'index.js' }));
writeFileSync(join(standIn, 'index.js'), 'module.exports = { devices() { return []; } };\n');
const dependencies = Object.fromEntries(packed.map((p) => [p.manifest.name, tarballUrl(p)]));
writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'release-consumer', version: '0.0.0', private: true, type: 'module', dependencies }, null, 2));
// pnpm 11 reads overrides from its workspace file. Each package of ours is pointed at its tarball, and `node-hid` at
// the stand-in because its real install fetches a binary.
writeFileSync(
  join(project, 'pnpm-workspace.yaml'),
  `overrides:\n${[...packed.map((p) => `  "${p.manifest.name}": "${tarballUrl(p)}"`), `  "node-hid": "file:${standIn}"`].join('\n')}\n`,
);
const install = run('pnpm', ['install', '--offline', '--ignore-scripts'], project);
if (install.status !== 0) {
  fail(`the offline install failed:\n${install.stdout}${install.stderr}`);
} else {
  ok('installed offline from the tarballs');
}

// 4. Load every subpath, under plain Node, and read the codec's resources from the installed copy.
console.log('load');
if (install.status === 0) {
  const subpaths = packed.flatMap((p) => Object.keys(p.manifest.exports).map((s) => (s === '.' ? p.manifest.name : `${p.manifest.name}/${s.slice(2)}`)));
  const codec = packed.find((p) => p.manifest.name === '@freeharmony-sdk/config');
  writeFileSync(
    join(project, 'probe.mjs'),
    [
      "import { realpathSync, readFileSync } from 'node:fs';",
      `const subpaths = ${JSON.stringify(subpaths)};`,
      'const report = { loaded: [], failed: [] };',
      'for (const spec of subpaths) {',
      '  try {',
      '    const module = await import(spec);',
      '    report.loaded.push([spec, Object.keys(module).length]);',
      '  } catch (error) {',
      '    report.failed.push([spec, String(error && error.stack ? error.stack.split("\\n").slice(0, 3).join(" | ") : error)]);',
      '  }',
      '}',
      // The fonts: the Node entry supplies them as it loads, and the internal entry hands them out.
      'if (subpaths.includes("@freeharmony-sdk/config/node") && subpaths.includes("@freeharmony-sdk/config/internal")) {',
      '  try {',
      '    await import("@freeharmony-sdk/config/node");',
      '    const { resource } = await import("@freeharmony-sdk/config/internal");',
      '    const font = resource("oxanium")("Regular");',
      '    const icons = resource("iconFont")();',
      '    const list = resource("iconList")();',
      '    const home = realpathSync(new URL(import.meta.resolve("@freeharmony-sdk/config/node")));',
      '    report.fonts = { home, oxaniumBytes: font.length, oxaniumMagic: Buffer.from(font.slice(0, 4)).toString("hex"), iconFontBytes: icons.length, iconListChars: list.length };',
      '  } catch (error) {',
      '    report.fontsError = String(error && error.stack ? error.stack.split("\\n").slice(0, 3).join(" | ") : error);',
      '  }',
      '}',
      'console.log(JSON.stringify(report));',
    ].join('\n'),
  );
  // Plain `node`: no flag, so a package that still shipped TypeScript would be refused here.
  const probe = run('node', ['probe.mjs'], project);
  if (probe.status !== 0) {
    fail(`the probe did not run:\n${probe.stdout}${probe.stderr}`);
  } else {
    const report = JSON.parse(probe.stdout.trim().split('\n').at(-1)!) as {
      loaded: Array<[string, number]>;
      failed: Array<[string, string]>;
      fonts?: { home: string; oxaniumBytes: number; oxaniumMagic: string; iconFontBytes: number; iconListChars: number };
      fontsError?: string;
    };
    for (const [spec, why] of report.failed) fail(`${spec} did not load: ${why}`);
    for (const [spec, count] of report.loaded) if (count === 0) fail(`${spec} loaded and exports nothing`);
    if (report.failed.length === 0 && report.loaded.every(([, count]) => count > 0)) {
      ok(`${report.loaded.length} of ${subpaths.length} subpaths load and export names`);
    }
    // The font must be the packed one, read from beside the installed copy.
    const packedFont = readFileSync(join(scratch, 'unpacked', codec?.file.replace(/\.tgz$/, '') ?? '', 'fonts', 'Oxanium', 'static', 'Oxanium-Regular.ttf'));
    if (report.fontsError !== undefined) fail(`the codec's resources: ${report.fontsError}`);
    else if (report.fonts === undefined) fail('the codec entries the font check needs are not exported');
    else {
      const { home, oxaniumBytes, oxaniumMagic, iconFontBytes, iconListChars } = report.fonts;
      if (!home.includes(`${join('node_modules', '@freeharmony-sdk', 'config')}`) && !home.includes(join('node_modules', '.pnpm'))) {
        fail(`the codec loaded from ${home}, which is not an installed copy`);
      } else if (oxaniumBytes !== packedFont.length || oxaniumMagic !== '00010000') {
        fail(`the Oxanium font read ${oxaniumBytes} bytes starting ${oxaniumMagic}, and the packed one is ${packedFont.length}`);
      } else if (iconFontBytes === 0 || iconListChars === 0) {
        fail('the icon package read nothing');
      } else {
        ok(`the codec reads its font (${oxaniumBytes} bytes) and the icon package from the installed copy`);
      }
    }
  }

  // 5. A consumer's type check: one import of every subpath, strict, with the declaration files checked too.
  console.log('types');
  writeFileSync(
    join(project, 'consumer.ts'),
    `${subpaths.map((spec, i) => `import * as m${i} from '${spec}';`).join('\n')}\nexport const all = [${subpaths.map((_, i) => `m${i}`).join(', ')}];\n`,
  );
  writeFileSync(
    join(project, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'ES2023',
        strict: true,
        noEmit: true,
        // The declaration files are part of what is shipped, so they are checked and not skipped.
        skipLibCheck: false,
        // Node's own types come from this repository's install: a consumer has its own.
        typeRoots: [join(ROOT, 'node_modules', '@types')],
        types: ['node'],
      },
      files: ['consumer.ts'],
    }),
  );
  const tsc = run(join(ROOT, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], project);
  if (tsc.status !== 0) fail(`a consumer's type check failed:\n${tsc.stdout.split('\n').slice(0, 12).join('\n')}`);
  else ok('a strict consumer imports every subpath with the declarations checked');
}

if (cli.flag('keep')) console.log(`\nthe throwaway project is ${project}`);
else rmSync(scratch, { recursive: true, force: true });

console.log('');
if (failures.length > 0) {
  console.log(`${failures.length} failures`);
  process.exit(1);
}
console.log(`release check passed for ${packed.length} tarballs`);
