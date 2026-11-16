/**
 * The FHSDK's API reference on the website, `reference/sdk/`, is what the packages' sources generate,
 * `bin/api-reference.ts`.
 *
 * **The gatekeeper.** A committed page that differs from what the sources give fails here with the command that fixes
 * it: a doc comment changed and not regenerated, a name added to an entry, a signature changed, an example changed
 * without the guide following, or a page edited by hand outside its introduction. The pre-commit hook runs the same
 * check when a source or a page is in the commit, and the site's workflow stops the deploy on it.
 *
 * **Its controls are independent of the generator's own reading.** The names each entry exports are read here through
 * the test kit's reader of an entry's source, which the packages' surface tests use, and each must be on its page, as
 * a heading or as a line linking where it is documented; a doc comment is checked word for word against the source
 * text it came from; and the guide's examples are exactly the files the examples test runs.
 *
 * **What a page leaves out is held too.** A doc comment's private part, from `@privateRemarks` on, is on no page, and
 * a member marked `@hidden` is left off its class's page while the class still carries it at run time; and every
 * subpath a package exports either has a page or is named in the index page's list of what is left out, so a subpath
 * added to a `package.json` is a decision about the reference and not a silent gap.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entryNames } from '@freeharmony-sdk/testkit/surface';
import ts from 'typescript';
import { exampleBlock, generatedFiles, PAGES, publicPart, ROOT, run, SECTION } from '../bin/api-reference.ts';

const committed = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

test('every committed page and block of the API reference is what the sources generate', () => {
  assert.deepEqual(run(false), []);
});

test('the reference is these pages, so a page added or dropped shows in this diff and in the site\'s menu', () => {
  assert.deepEqual([...generatedFiles().keys()], [
    ...PAGES.map((one) => `${SECTION}/api/${one.page}`),
    `${SECTION}/api/config-types.md`, `${SECTION}/api/remote-types.md`, `${SECTION}/api/silhouettes-types.md`,
    `${SECTION}/api/usb-types.md`,
    `${SECTION}/api/README.md`,
    `${SECTION}/documents.md`,
    `${SECTION}/guide.md`,
    `${SECTION}/overview.md`,
    `${SECTION}/README.md`,
  ]);
});

test('every name an entry exports is on its page, as its heading or as a line linking where it is documented', () => {
  for (const page of PAGES) {
    const names = entryNames(join(ROOT, page.module));
    const text = committed(`${SECTION}/api/${page.page}`);
    const shown = (name: string): string => (page.namespace === undefined ? name : `${page.namespace.name}.${name}`);
    for (const name of [...names.values, ...names.types]) {
      const heading = new RegExp(`^### \`${shown(name).replace(/[.$]/g, '\\$&')}\`( \\((type|value)\\))?$`, 'm');
      const linked = `* \`${shown(name)}\`: documented on [`;
      assert.ok(heading.test(text) || text.includes(linked), `${page.page} does not show ${shown(name)}`);
    }
  }
});

test('a doc comment is on its page as the source writes it, and the control: one word changed is no longer found', () => {
  // `buildFromRecipe`'s, read off its source by hand: the first sentence, and a bullet with a name the page links.
  const source = committed('packages/config/src/families/fromrecipe.ts');
  assert.ok(source.includes(' * The remote a recipe describes, built from nothing. Takes the recipe as parsed JSON and reads it, so a caller hands'));
  const page = committed(`${SECTION}/api/config.md`);
  assert.ok(page.includes('The remote a recipe describes, built from nothing. Takes the recipe as parsed JSON and reads it, so a caller hands'));
  assert.ok(!page.includes('The remote a recipe describes, built from scratch.'));
});

test('the guide shows exactly the examples the examples test runs, each as its file', () => {
  const folder = 'packages/remote/examples';
  const files = readdirSync(join(ROOT, folder)).filter((name) => name.endsWith('.ts')).sort();
  const guide = committed(`${SECTION}/guide.md`);
  const shown = [...guide.matchAll(/<!-- example:([^ ]+) -->/g)].map((match) => match[1]!);
  assert.deepEqual([...shown].sort(), files.map((name) => `${folder}/${name}`));
  // Each block is the file's text, not a copy of it: the control is the block the generator would write for it.
  for (const path of shown) assert.ok(guide.includes(exampleBlock(path)), path);
});

test('a private remark is on no page, and the control: the public part before it is', () => {
  // `useArchitecture`'s comment, read off its source by hand: a public part, then `@privateRemarks` and the argument.
  const source = committed('packages/usb/src/remote.ts');
  assert.ok(source.includes('   * Narrows rather than overrides: it refuses to change an architecture the caller supplied, so a'));
  const page = committed(`${SECTION}/api/usb.md`);
  assert.ok(page.includes('Adopt the architecture the remote itself stated, once its version block has been read.'));
  assert.ok(!page.includes('Narrows rather than overrides: it refuses to change an architecture the caller supplied'));
  assert.ok(!page.includes('@privateRemarks'));
  // The cut itself, on a comment's text as the generator reads it.
  assert.equal(publicPart('Public.\n\n@privateRemarks\nPrivate.'), 'Public.');
  assert.equal(publicPart('@privateRemarks\nAll private.'), undefined);
  assert.equal(publicPart('Public.\n@hidden'), 'Public.');
});

/** The members of `HarmonyRemote` that write to a remote, restart it, end a session or exist for an experiment. */
const HIDDEN_MEMBERS = [
  'endSession', 'eraseFlash', 'invalidateCachedRegions', 'readInternalMemoryExpectingAHang', 'requestFirmwareReinstall',
  'resetDevice', 'stageFirmware', 'writeFlash', 'writeRam', 'writeSettings',
];

/** The declarations the compiler emits for a module of the workspace, with the workspace's own options. */
function declarationsOf(module: string): string {
  const read = ts.readConfigFile(join(ROOT, 'tsconfig.base.json'), ts.sys.readFile);
  const options = ts.convertCompilerOptionsFromJson((read.config as { compilerOptions: unknown }).compilerOptions, ROOT).options;
  let out = '';
  const program = ts.createProgram([join(ROOT, module)], {
    ...options, noEmit: false, declaration: true, emitDeclarationOnly: true, composite: false, declarationMap: false,
  });
  program.emit(program.getSourceFile(join(ROOT, module)), (name, text) => { if (name.endsWith('remote.d.ts')) out = text; });
  return out;
}

test('the members a remote is written through are off the USB page and still in the declarations, the control a read member', () => {
  const page = committed(`${SECTION}/api/usb.md`);
  const declarations = declarationsOf('packages/usb/src/remote.ts');
  assert.ok(declarations.includes('class HarmonyRemote'), 'no declarations were emitted, so this checks nothing');
  for (const member of HIDDEN_MEMBERS) {
    assert.ok(!new RegExp(`\\b${member}\\(`).test(page), `${member} is on the usb page`);
    // `@hidden` is a word in a comment to the compiler: what `packages/remote` calls stays declared.
    assert.ok(new RegExp(`\\b${member}\\(`).test(declarations), `${member} is missing from the declarations`);
  }
  assert.ok(!page.includes('WritePermission'), 'the type only the hidden members use is on the usb page');
  // The control: a read member is on the page, so the check above cannot pass by finding no class at all.
  assert.ok(/\breadFlash\(/.test(page));
  // And no experiment's door is named anywhere in the section.
  for (const file of [...generatedFiles().keys()]) assert.ok(!committed(file).includes('ODD_READ'), file);
});

/** The packages the reference documents, by folder. */
const PACKAGES = ['base', 'config', 'remote', 'silhouettes', 'usb'];

/**
 * The subpaths a package exports that neither have a page nor are named in the index page's list of what is left out,
 * as `@freeharmony-sdk/<package>/<subpath>`. The list is read the way it is written: a span naming a package's subpath
 * names that package for the spans after it, which may name a further subpath of it as `/<subpath>`.
 */
function unaccounted(exportsOf: Readonly<Record<string, readonly string[]>>, index: string): string[] {
  const section = index.slice(index.indexOf('## What is not here'));
  const named = new Set<string>();
  let current: string | undefined;
  for (const [, span] of section.matchAll(/`([^`]+)`/g)) {
    const whole = /^@freeharmony-sdk\/([a-z]+)(\/[a-z]+)?$/.exec(span!);
    if (whole !== null) {
      current = whole[1];
      if (whole[2] !== undefined) named.add(`@freeharmony-sdk/${current}${whole[2]}`);
    } else if (/^\/[a-z]+$/.test(span!) && current !== undefined) {
      named.add(`@freeharmony-sdk/${current}${span}`);
    }
  }
  const paged = new Set(PAGES.filter((one) => one.namespace === undefined).map((one) => one.title));
  return Object.entries(exportsOf).flatMap(([pkg, subpaths]) => subpaths
    .filter((sub) => sub !== '.')
    .map((sub) => `@freeharmony-sdk/${pkg}${sub.slice(1)}`)
    .filter((name) => !paged.has(name) && !named.has(name)));
}

test('every subpath a package exports has a page or is named in what the index leaves out, and the control', () => {
  const exportsOf = Object.fromEntries(PACKAGES.map((pkg) => [pkg,
    Object.keys((JSON.parse(committed(`packages/${pkg}/package.json`)) as { exports: Record<string, unknown> }).exports)]));
  const index = committed(`${SECTION}/api/README.md`);
  assert.deepEqual(unaccounted(exportsOf, index), []);
  // The control: a subpath added to a package is found, and so is one the list stops naming.
  assert.deepEqual(unaccounted({ ...exportsOf, config: [...exportsOf['config']!, './extra'] }, index), ['@freeharmony-sdk/config/extra']);
  assert.deepEqual(unaccounted(exportsOf, index.replace('`/touchsession` and', '')), ['@freeharmony-sdk/usb/touchsession']);
});
