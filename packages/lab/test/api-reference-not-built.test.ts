/**
 * **Every function that can answer "not built yet" says so in its description on the API reference.**
 *
 * The FHSDK's outside holds names nothing is behind yet, and names that are built for some of what they take and not
 * for the rest. Each throws `NotBuiltError` for what is missing, through `notBuilt` or, in one place, directly. A
 * stranger reading the pages cannot see that throw, so a description that does not say it reads as if the whole of
 * the function works.
 *
 * **How it reads the code.** Every `.ts` file of the five packages' `src` is parsed with the compiler the generator
 * uses, and every call of `notBuilt(` and every `new NotBuiltError(` is a site, placed in the nearest named function
 * around it. That function is either a name on the pages, whose description must then say "not built yet", or an
 * internal function, which `BENEATH` maps to the names on the pages it is reached through, each of whose descriptions
 * must say it. A site in neither is a failure: either the function is new on the pages, or a row is missing from the
 * table, and both are decisions somebody has to make in this diff.
 *
 * **And the other way round.** A description that opens a sentence with "Not built yet" while nothing under it can
 * throw any more is a failure too, as is a row of the table whose function no longer throws: so when something gets
 * built, the pages are corrected in the same change. That direction keys on the capital, the form every description
 * here uses, because the pages also say "not built yet" of states that are not a throw, such as a model's key maps
 * in the description of a removal, and those must stay free to.
 *
 * **Its controls are in the test itself**: a planted source string with a new site, a public description stripped of
 * the words, a made up description that claims them, and a table row naming a function that throws nothing, each fed
 * to the same pure `audit` and each shown to fail it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { docOf, modelOf, readSources, ROOT } from '../bin/api-reference.ts';

/** The packages the reference documents, whose `src` is searched for sites. */
const PACKAGES = ['base', 'config', 'remote', 'silhouettes', 'usb'];

/** One place that throws `NotBuiltError`: its file, the named function around it, and its line. */
interface Site {
  readonly file: string;
  readonly fn: string;
  readonly line: number;
}

/**
 * The one site that is not a function answering "not built yet": `notBuilt` itself, whose body is the
 * `new NotBuiltError` every other site reaches it for.
 */
const DEFINITION = 'packages/config/src/support/contract.ts#notBuilt';

/** A function by its file and its name, `packages/config/src/recipe/toolkit.ts#setKey`, as sites and the table name it. */
const keyOf = (file: string, name: string): string => `${file}#${name}`;

/**
 * The name a function goes by, or undefined for one that has none: a declaration's or a method's own, a class's
 * method as `Class.method`, and an arrow or a function expression by the variable or the property it is assigned to.
 * An unnamed callback, a `.map((item) => ...)`, has none, so a site in it belongs to the function around it, which is
 * where its throw arrives.
 */
function functionName(node: ts.Node): string | undefined {

  if (ts.isFunctionDeclaration(node)) return node.name?.text;

  if (ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {

    const own = ts.isConstructorDeclaration(node) ? 'constructor' : node.name.getText();
    const owner = node.parent;

    return ts.isClassLike(owner) && owner.name !== undefined ? `${owner.name.text}.${own}` : own;

  }

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {

    const parent = node.parent;

    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;

    if (ts.isPropertyAssignment(parent)) return parent.name.getText();

  }

  return undefined;

}

/** The nearest named function around a node, or undefined at the top of a file. */
function enclosingName(node: ts.Node): string | undefined {

  for (let at = node.parent; at !== undefined; at = at.parent) {
    const name = ts.isFunctionLike(at) ? functionName(at) : undefined;

    if (name !== undefined) return name;
  }

  return undefined;

}

/** Whether a node is a call of `notBuilt(` or a `new NotBuiltError(`, by the name it calls. */
function throwsNotBuilt(node: ts.Node): boolean {

  if (ts.isCallExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === 'notBuilt';
  }

  if (ts.isNewExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === 'NotBuiltError';
  }

  return false;

}

/** Every site in one file's text, read as source and never run, which is what lets a control plant one. */
function sitesIn(file: string, text: string): Site[] {

  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: Site[] = [];

  const visit = (node: ts.Node): void => {

    if (throwsNotBuilt(node)) {
      found.push({
        file,
        fn: enclosingName(node) ?? '<top>',
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      });
    }

    ts.forEachChild(node, visit);

  };

  visit(source);

  return found;

}

/** Every `.ts` file under a folder, by its path from the root. */
function sourceFiles(folder: string): string[] {

  const entries = readdirSync(join(ROOT, folder), { withFileTypes: true });

  return entries.flatMap((entry) => {

    const path = `${folder}/${entry.name}`;

    if (entry.isDirectory()) return sourceFiles(path);

    return entry.name.endsWith('.ts') ? [path] : [];

  });

}

/** Every site of the five packages, the definition of `notBuilt` left out. */
function everySite(): Site[] {

  const files = PACKAGES.flatMap((pkg) => sourceFiles(`packages/${pkg}/src`));

  return files
    .flatMap((file) => sitesIn(file, readFileSync(join(ROOT, file), 'utf8')))
    .filter((site) => keyOf(site.file, site.fn) !== DEFINITION);

}

/** A row of `BENEATH`: the names on the pages an internal function is reached through, and why it throws. */
interface Beneath {
  readonly names: readonly string[];
  readonly why: string;
}

const TOOLKIT = 'packages/config/src/recipe/toolkit.ts';

/**
 * **The internal functions that throw, and the names on the pages a caller reaches them through.** Each name's
 * description must say "not built yet", since that is the only place a stranger can learn the throw. The names are
 * as the pages head them, a namespace's members with the namespace.
 */
const BENEATH: Readonly<Record<string, Beneath>> = {
  [keyOf(TOOLKIT, 'servedBy')]: {
    names: [
      'recipe.addActivity', 'recipe.addDevice', 'recipe.check', 'recipe.create', 'recipe.key', 'recipe.keyNames',
      'recipe.keys', 'recipe.screen', 'recipe.setActivity', 'recipe.setDevice', 'recipe.setKey', 'recipe.setScreen',
      'recipe.setSetting', 'recipe.settings',
    ],
    why: 'a document for a model no family builds for, met by every change, question and check that needs the family',
  },
  [keyOf(TOOLKIT, 'mapsToAnswer')]: {
    names: ['recipe.key', 'recipe.keyNames', 'recipe.keys', 'recipe.screen'],
    why: 'a model whose family has no key maps yet, which the questions about keys and screens answer from',
  },
  [keyOf(TOOLKIT, 'openingScreen')]: {
    names: ['recipe.setActivity'],
    why: 'the screen an activity opens on, for a model whose family names no screens yet',
  },
  [keyOf('packages/config/src/recipe/recipe.ts', 'refuseUnbuiltFields')]: {
    names: ['buildFromRecipe'],
    why: 'a field of version 2 the build of the model\'s kind of family does not read, asked by every route to a build',
  },
  [keyOf('packages/config/src/families/fromrecipe.ts', 'builtFrom')]: {
    names: ['buildFromRecipe'],
    why: 'the build itself, which buildFromRecipe wraps to tidy up after it',
  },
  [keyOf('packages/config/src/shared/setup.ts', 'checkStatedKeys')]: {
    names: ['buildFromRecipe'],
    why: 'a key\'s choice a compiled family\'s composer does not build, a held or a double press or a sequence',
  },
  [keyOf('packages/config/src/families/harmony-300-350/setup.ts', 'composeNoScreenSetup')]: {
    names: ['buildFromRecipe'],
    why: 'a key\'s choice on the Harmony 300 and 350, whose composer builds none',
  },
  [keyOf('packages/config/src/families/harmony-touch/recipemaps.ts', 'stepOf')]: {
    names: ['buildFromRecipe'],
    why: 'a sequence as a step of a Harmony Touch activity\'s start or end',
  },
  [keyOf('packages/config/src/families/harmony-touch/recipemaps.ts', 'settingsOf')]: {
    names: ['buildFromRecipe'],
    why: 'a Harmony Touch setting its build does not write yet',
  },
};

/** One name on the pages: the function it is, by `keyOf`, where it is one, and its public description in one line. */
interface Described {
  readonly shown: string;
  readonly fn: string | undefined;
  readonly text: string;
}

/** The function a declaration is, by `keyOf`, or undefined for a type, a class or a constant that holds data. */
function declaredFunction(declaration: ts.Declaration): string | undefined {

  let node: ts.Node = declaration;
  const initializer = ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;

  if (initializer !== undefined && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
    node = initializer;
  }

  if (!ts.isFunctionLike(node)) return undefined;

  const name = functionName(node);
  const file = declaration.getSourceFile().fileName.slice(ROOT.length + 1);

  return name === undefined ? undefined : keyOf(file, name);

}

/** Every name the pages document, with its description as the pages print it, its line breaks made spaces. */
function everyDescribed(): Described[] {

  const model = modelOf(readSources());

  return [...model.located].map(([symbol, location]): Described => {

    const fns = (symbol.declarations ?? []).map(declaredFunction);
    const text = (docOf(symbol) ?? '').replace(/\s+/g, ' ');

    return {
      shown: location.shown,
      fn: fns.find((one) => one !== undefined),
      text,
    };

  });

}

/** What any description that answers "not built yet" contains, in any case. */
const SAYS = /not built yet/i;

/** The sentence a description opens to say what is not built yet, which only a description over a throw may hold. */
const CLAIMS = /\bNot built yet\b/;

/** What `audit` is given: the sites, the names on the pages, and the table of what lies beneath them. */
interface Findings {
  readonly sites: readonly Site[];
  readonly described: readonly Described[];
  readonly beneath: Readonly<Record<string, Beneath>>;
}

/** Every disagreement between the sites, the pages and the table, each a sentence; empty where all three agree. */
function audit(findings: Findings): string[] {

  const { sites, described, beneath } = findings;
  const problems: string[] = [];
  const byFunction = new Map(described.flatMap((one): [string, Described][] => {
    return one.fn === undefined ? [] : [[one.fn, one]];
  }));
  const byShown = new Map(described.map((one) => [one.shown, one]));
  const throwing = new Set(sites.map((site) => keyOf(site.file, site.fn)));
  // The names a description may claim "Not built yet" for: those with a site of their own and those a row names.
  const answering = new Set<string>();

  for (const fn of throwing) {

    const own = byFunction.get(fn);
    const row = beneath[fn];

    if (own !== undefined) {
      answering.add(own.shown);

      if (!SAYS.test(own.text)) {
        problems.push(`${own.shown} throws NotBuiltError and its description does not say not built yet`);
      }
    } else if (row === undefined) {
      problems.push(`${fn} throws NotBuiltError and is neither a name on the pages nor a row of BENEATH`);
    }

  }

  for (const [fn, row] of Object.entries(beneath)) {

    if (!throwing.has(fn)) problems.push(`${fn} is a row of BENEATH and throws no NotBuiltError any more`);

    for (const name of row.names) {
      const shown = byShown.get(name);

      answering.add(name);

      if (shown === undefined) {
        problems.push(`${fn}'s row names ${name}, which is on no page`);
      } else if (!SAYS.test(shown.text)) {
        problems.push(`${name} reaches ${fn}, which throws NotBuiltError, and its description does not say not built yet`);
      }
    }

  }

  for (const one of described) {
    if (CLAIMS.test(one.text) && !answering.has(one.shown)) {
      problems.push(`${one.shown}'s description says Not built yet, and nothing under it throws NotBuiltError`);
    }
  }

  return problems;

}

test('every function that throws NotBuiltError says not built yet on its page, and the pages claim it of no other', () => {

  const findings = {
    sites: everySite(),
    described: everyDescribed(),
    beneath: BENEATH,
  };

  assert.deepEqual(audit(findings), []);

});

test('the sites, the names they reach and the table are exactly these, so a change to any shows in this diff', () => {

  const sites = everySite();
  const described = everyDescribed();
  const onPages = new Set(described.flatMap((one) => (one.fn === undefined ? [] : [one.fn])));
  const direct = described
    .filter((one) => one.fn !== undefined && sites.some((site) => keyOf(site.file, site.fn) === one.fn))
    .map((one) => one.shown)
    .sort();
  const internal = new Set(sites.map((site) => keyOf(site.file, site.fn)).filter((fn) => !onPages.has(fn)));
  const claiming = described
    .filter((one) => CLAIMS.test(one.text))
    .map((one) => one.shown)
    .sort();

  assert.equal(sites.length, 30);
  assert.deepEqual(direct, [
    'networkArchiveSource', 'recipe.favourites', 'recipe.setActivity', 'recipe.setDevice', 'recipe.setDeviceCommand',
    'recipe.setFavourites', 'recipe.setKey', 'recipe.setLook', 'recipe.setScreen', 'recipe.setSetting', 'recipe.settings',
    'syncDocument',
  ]);
  assert.deepEqual([...internal].sort(), Object.keys(BENEATH).sort());
  assert.equal(Object.keys(BENEATH).length, 9);
  // Every name a stranger reads "Not built yet" under: the twelve with a site of their own and the nine more only a
  // row reaches, the build and eight of the toolkit's.
  assert.deepEqual(claiming, [
    'buildFromRecipe', 'networkArchiveSource', 'recipe.addActivity', 'recipe.addDevice', 'recipe.check',
    'recipe.create', 'recipe.favourites', 'recipe.key', 'recipe.keyNames', 'recipe.keys', 'recipe.screen',
    'recipe.setActivity', 'recipe.setDevice', 'recipe.setDeviceCommand', 'recipe.setFavourites', 'recipe.setKey',
    'recipe.setLook', 'recipe.setScreen', 'recipe.setSetting', 'recipe.settings', 'syncDocument',
  ]);

});

test('the controls: each way the pages and the code can part is found', () => {

  const real = {
    sites: everySite(),
    described: everyDescribed(),
    beneath: BENEATH,
  };

  // A new function that throws, on no page and in no row.
  const planted = sitesIn(
    'packages/config/src/planted.ts',
    'export function planted(): never {\n  return notBuilt(\'planted\', 1);\n}\n',
  );

  assert.deepEqual(planted, [{ file: 'packages/config/src/planted.ts', fn: 'planted', line: 2 }]);
  assert.deepEqual(audit({ ...real, sites: [...real.sites, ...planted] }), [
    'packages/config/src/planted.ts#planted throws NotBuiltError and is neither a name on the pages nor a row of BENEATH',
  ]);

  // A site in an unnamed callback belongs to the function around it, where its throw arrives.
  const callback = sitesIn(
    'packages/config/src/planted.ts',
    'export function outer(items: number[]) {\n  return items.map(() => new NotBuiltError(\'outer\', 1));\n}\n',
  );

  assert.deepEqual(callback.map((site) => site.fn), ['outer']);

  // A function on the pages that throws, its description stripped of the words.
  const silent = real.described.map((one) => (one.shown === 'recipe.setLook' ? { ...one, text: 'The look of the screens.' } : one));

  assert.deepEqual(audit({ ...real, described: silent }), [
    'recipe.setLook throws NotBuiltError and its description does not say not built yet',
  ]);

  // A name reached through a row, its description stripped of the words.
  const quiet = real.described.map((one) => (one.shown === 'recipe.check' ? { ...one, text: 'Every problem.' } : one));

  assert.deepEqual(audit({ ...real, described: quiet }), [
    `recipe.check reaches ${keyOf(TOOLKIT, 'servedBy')}, which throws NotBuiltError, and its description does not say not built yet`,
  ]);

  // A description that claims it over nothing that throws: once something is built, its page has to follow.
  const madeUp = {
    shown: 'madeUp',
    fn: 'packages/config/src/made.ts#madeUp',
    text: 'Not built yet: nothing at all.',
  };

  assert.deepEqual(audit({ ...real, described: [...real.described, madeUp] }), [
    'madeUp\'s description says Not built yet, and nothing under it throws NotBuiltError',
  ]);

  // A row whose function throws nothing any more.
  const stale = {
    ...BENEATH,
    'packages/config/src/gone.ts#gone': { names: ['recipe.check'], why: 'built since' },
  };

  assert.deepEqual(audit({ ...real, beneath: stale }), [
    'packages/config/src/gone.ts#gone is a row of BENEATH and throws no NotBuiltError any more',
  ]);

});
