/**
 * The codec's main entry loads where there is no Node, plan 013 decision 5 and `todo.md` 7.3.5: an Electron renderer
 * or a browser imports `@harmony/codec` whole. Whatever reads the disk, compresses through Node's zlib, hashes through
 * Node's crypto or names a Node global sits behind the second entry, `@harmony/codec/node`, `src/node.ts`.
 *
 * **What "loads" means here, and why it is checked on the source and not in a browser.** A module reachable from
 * `src/index.ts` imports no `node:` module and no other Node builtin, and names none of Node's globals, `Buffer`,
 * `process`, `require`, `__dirname`, `__filename` or `global`. Each of those fails a renderer at load or at first use,
 * and none of them fails a test run under Node, which is why nothing caught the fourteen modules that held one until
 * this step. So the import graph is walked from the entry with the TypeScript compiler's own parser, the root's
 * pinned `typescript`, which tells an import that only names types, erased before anything runs, from one that loads
 * a module, and an identifier from a property of the same name; a regular expression could do neither.
 *
 * **What it does not see.** A package outside this repository is not walked: it is either on `PACKAGES`, which says why
 * each loads in a browser, or the walk fails naming it. And a resource the core asks for at run time, a font's bytes
 * or Node's deflate for a PNG, is supplied through `resources.ts`, which is a function call and not an import, so a
 * renderer that never supplies one loads the codec and is refused at the first letter it draws, naming the resource.
 *
 * **The convention it holds as well**: a source file that uses Node is named `*.node.ts`, or is the entry `node.ts`, so
 * the line between the two halves is visible in a file listing, each reader beside the parser it feeds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const PACKAGE = new URL('..', import.meta.url).pathname;
const SOURCE = join(PACKAGE, 'src');
const ENTRY = join(SOURCE, 'index.ts');

/** Node's globals a renderer does not have. `globalThis.X` counts as the same use. */
const NODE_GLOBALS = new Set(['Buffer', 'process', 'require', '__dirname', '__filename', 'global']);

/**
 * The packages outside this repository the core may import, and why each loads in a browser. Every other bare
 * specifier fails the walk, so a dependency added to the core is looked at here before it is believed.
 */
const PACKAGES: Readonly<Record<string, string>> = {
  // Its package states a `browser` build, and its one Node path, `opentype.load` of a file name, is not called here:
  // the fonts are parsed from bytes the caller supplies, `typeface.ts` and `icons.ts`.
  'opentype.js': 'a browser build of its own',
};

/** This repository's packages the core imports, walked like the codec's own source. Each maps a subpath to its file. */
function workspaceFile(specifier: string): string | undefined {
  const match = /^@harmony\/([a-z]+)(?:\/(.+))?$/.exec(specifier);
  if (match === null) return undefined;
  const root = join(PACKAGE, '..', match[1]!);
  const exports = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { exports: Record<string, string> }).exports;
  const target = exports[match[2] === undefined ? '.' : `./${match[2]}`];
  return target === undefined ? undefined : join(root, target);
}

interface Use {
  readonly file: string;
  readonly what: string;
}

/** What a module's source loads and which Node globals it names, from the compiler's reading of it. */
function readModule(file: string, text: string): { readonly loads: string[]; readonly uses: string[] } {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const loads: string[] = [];
  const uses: string[] = [];
  // A name the module declares itself, `const global = ...`, is its own and not Node's wherever it is used. Coarser than
  // the compiler's scopes, which is the safe direction: a module would have to declare a `Buffer` of its own to hide one.
  const declared = new Set<string>();
  const declare = (node: ts.Node): void => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)
      || ts.isBindingElement(node) || ts.isImportSpecifier(node) || ts.isImportClause(node) || ts.isNamespaceImport(node))
      && node.name !== undefined && ts.isIdentifier(node.name)) declared.add(node.name.text);
    ts.forEachChild(node, declare);
  };
  declare(source);
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      // `import type { X }` is erased whole; `import { type X }` is kept as an import of the module under
      // `verbatimModuleSyntax`, so it loads and is followed.
      if (!(node.importClause?.isTypeOnly ?? false)) loads.push((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined && !node.isTypeOnly) loads.push((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      loads.push(argument !== undefined && ts.isStringLiteral(argument) ? argument.text : '<a computed import>');
    } else if (ts.isIdentifier(node) && NODE_GLOBALS.has(node.text)) {
      const parent = node.parent;
      // A property's name, `x.process`, or a key, `{ process: 1 }`, or a member's or a binding's own name is not the global.
      const named = (ts.isPropertyAccessExpression(parent) && parent.name === node)
        || ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent)
          || ts.isPropertySignature(parent) || ts.isVariableDeclaration(parent) || ts.isParameter(parent)
          || ts.isFunctionDeclaration(parent) || ts.isBindingElement(parent)) && parent.name === node);
      if (!named && !declared.has(node.text)) uses.push(node.text);
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'globalThis'
      && NODE_GLOBALS.has(node.name.text)) {
      uses.push(`globalThis.${node.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { loads, uses };
}

/**
 * Every module the entry reaches, and every Node use among them. `read` is the source of a file, the disk's unless a
 * control hands in another text for one module.
 */
function walk(entry: string, read: (file: string) => string = (file) => readFileSync(file, 'utf8')): { reached: string[]; uses: Use[] } {
  const reached = new Set<string>();
  const uses: Use[] = [];
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (reached.has(file)) continue;
    reached.add(file);
    const name = relative(PACKAGE, file);
    const { loads, uses: globals } = readModule(file, read(file));
    for (const what of globals) uses.push({ file: name, what: `the global ${what}` });
    for (const specifier of loads) {
      if (specifier.startsWith('.')) queue.push(resolve(dirname(file), specifier));
      else if (specifier.startsWith('node:') || isBuiltin(specifier)) uses.push({ file: name, what: `an import of ${specifier}` });
      else if (workspaceFile(specifier) !== undefined) queue.push(workspaceFile(specifier)!);
      else if (!(specifier in PACKAGES)) uses.push({ file: name, what: `an import of ${specifier}, a package not known to load in a browser` });
    }
  }
  return { reached: [...reached], uses };
}

const described = (uses: readonly Use[]): string => uses.map((one) => `${one.file}: ${one.what}`).join('\n');

test('no module the codec\'s main entry reaches imports a Node module or names a Node global', () => {
  // And none the two subpaths reach, `./build` and `./internal`, which load anywhere too since `todo.md` 7.3.6
  // took most of the old barrel off the main entry and put it under them.
  const reached: string[] = [];
  for (const entry of [ENTRY, join(SOURCE, 'build.ts'), join(SOURCE, 'internal.ts')]) {
    const walked = walk(entry);
    assert.deepEqual(walked.uses, [], `${relative(PACKAGE, entry)}:\n${described(walked.uses)}`);
    reached.push(...walked.reached);
  }
  // The walks reached the codec, the families and the base package, so an empty list is not an empty walk.
  for (const one of ['src/container/gspm.ts', 'src/families/registry.ts', 'src/families/harmony-touch/index.ts', 'src/catalogue/archive.ts', 'src/drawing/typeface.ts']) {
    assert.ok(reached.includes(join(PACKAGE, one)), `the walk reached ${one}`);
  }
  assert.ok(reached.some((file) => file.includes(`${join('packages', 'base')}`)), 'the walk reached packages/base');
});

test('the control: a node:fs import or a Buffer added to a module the entry reaches fails the walk', () => {
  const bytes = join(SOURCE, 'support', 'bytes.ts');
  const deep = join(SOURCE, 'families', 'harmony-one', 'sends.ts');
  for (const [file, added, expected] of [
    [bytes, "import { readFileSync } from 'node:fs';\n", 'an import of node:fs'],
    [deep, "import { join } from 'path';\n", 'an import of path'],
    [bytes, 'export const seen = Buffer.from([1]);\n', 'the global Buffer'],
    [bytes, 'export const where = globalThis.process;\n', 'the global globalThis.process'],
    [deep, "export const later = import('node:zlib');\n", 'an import of node:zlib'],
  ] as const) {
    const { uses } = walk(ENTRY, (one) => readFileSync(one, 'utf8') + (one === file ? added : ''));
    assert.deepEqual(uses, [{ file: relative(PACKAGE, file), what: expected }], `${added.trim()} in ${relative(PACKAGE, file)}`);
  }
  // And what is not a use: a type only import of a Node module, and a property or key that happens to share a name.
  const { uses } = walk(ENTRY, (one) => readFileSync(one, 'utf8') + (one === bytes
    ? "import type { Stats } from 'node:fs';\nexport const property = { process: 1 }.process;\n"
    : ''));
  assert.deepEqual(uses, []);
});

test('a source file that uses Node is named *.node.ts or is the Node entry, so the two halves show in a listing', () => {
  const files: string[] = [];
  const list = (directory: string): void => {
    for (const one of readdirSync(directory)) {
      const path = join(directory, one);
      if (statSync(path).isDirectory()) list(path);
      else if (one.endsWith('.ts') && !one.endsWith('.d.ts')) files.push(path);
    }
  };
  list(SOURCE);
  const using = files.filter((file) => {
    const { loads, uses } = readModule(file, readFileSync(file, 'utf8'));
    return uses.length > 0 || loads.some((one) => one.startsWith('node:') || isBuiltin(one));
  }).map((file) => relative(SOURCE, file)).sort();
  const misnamed = using.filter((file) => !file.endsWith('.node.ts') && file !== 'node.ts');
  assert.deepEqual(misnamed, []);
  // And the Node half is what the step moved there, so a new one is a decision someone sees.
  assert.deepEqual(using, [
    'catalogue/archive.node.ts', 'catalogue/carried.node.ts', 'catalogue/catalogue.node.ts', 'catalogue/catalogueraw.node.ts',
    'catalogue/driving.node.ts',
    'support/resources.node.ts',
  ]);
});

test('the Node entry carries every name of the main entry, so a Node caller imports from one place', async () => {
  const main = await import('../src/index.ts');
  const node = await import('../src/node.ts');
  const missing = Object.keys(main).filter((name) => !(name in node));
  assert.deepEqual(missing, []);
  // And the readers it adds are not on the main entry.
  for (const name of ['archiveProtocols', 'catalogueDevice', 'catalogueDriving', 'catalogueRules', 'archiveAt']) {
    assert.ok(name in node, `${name} is on the Node entry`);
    assert.ok(!(name in main), `${name} is not on the main entry`);
  }
});
