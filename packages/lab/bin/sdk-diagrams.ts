/**
 * The four drawings of the SDK section's overview page,
 * `reference/sdk/overview.md`, generated from the packages' own sources and
 * laid out by graphviz, and the text each image carries for a reader who
 * cannot see it.
 *
 * ```
 * node packages/lab/bin/sdk-diagrams.ts            check the drawings
 * node packages/lab/bin/sdk-diagrams.ts --check    the same, said out loud
 * node packages/lab/bin/sdk-diagrams.ts --write    write them again
 * ```
 *
 * **Why generated.** A drawing of how the packages fit together describes the
 * code, and one drawn by hand is right until the first change nobody carries
 * into it. So what each drawing says is read here from the code, and only the
 * layout is left to graphviz, as the `draw-a-diagram` skill has it:
 *
 * * **the packages**: which depends on which, read off each `package.json`,
 *   and whether each loads in a browser, which follows from whether it
 *   reaches a native module; what an application takes from each is the one
 *   line per package written below, `TAKES`;
 * * **the life of a document**: what each step returns, asked of the
 *   TypeScript compiler for the function the step names, on the entry an
 *   application imports it from;
 * * **the shape of a document**: every field of the recipe's types with the
 *   type the source gives it, read off the declarations, and a line wherever a
 *   field's type names another type of the drawing;
 * * **a sync**: its endings and whether each state lets the remote be
 *   unplugged, read off the initialisers of `SYNC_ENDINGS` and `SYNC_STATES`;
 *   and its phases per kind of remote, read off the two lists the guide's sync
 *   example asserts when it runs, `packages/remote/examples/sync.ts`, so the
 *   order drawn is the order a sync was seen to report. Each phase read there
 *   must be a member of `SyncPhase`. One ending is marked as reached by no
 *   model yet, `NOT_REACHED_YET`, the one statement here the code states in a
 *   comment and not as data.
 *
 * **The image's text is made from the same data.** Each drawing's alternative
 * text, what a screen reader says in its place, restates what the drawing
 * shows, so it is written here beside the drawing and filled into the page,
 * where a copy written by hand would go stale while the drawing was held.
 *
 * **What is committed, and what the check holds.** Each drawing is two files
 * under `reference/sdk/diagrams/`: the DOT source this script writes and the
 * SVG graphviz draws from it. graphviz does not promise the same SVG from one
 * version to the next, so the check holds the DOT source to the sources byte
 * for byte, and the SVG to its DOT source by the SHA-256 the SVG records of
 * the source it was drawn from. Where the `dot` on the machine is the version
 * the SVG records, the check also draws the SVG again and compares it whole.
 * It holds the page's image texts to the sources as well. `--write` writes
 * every DOT source and the page's image texts, and draws again only the SVG
 * whose source changed, so a newer graphviz does not rewrite drawings that say
 * nothing new. `packages/lab/test/sdk-diagrams.test.ts` runs the check.
 *
 * **What it reads and writes.** The repository's own files, through the
 * compiler's API as the API reference's generator reads them, and `dot`, a
 * system tool, `brew install graphviz`. It writes only under
 * `reference/sdk/diagrams/` and the image texts of `reference/sdk/overview.md`.
 * No lab, no network, no remote.
 */
import { commandLine } from '@freeharmony-sdk/lab/cli';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

import {
  PAGES,
  readSources,
  ROOT,
  type Sources,
} from './api-reference.ts';

/** Where the drawings are, relative to the root. */
export const FOLDER = 'reference/sdk/diagrams';

/** The page that shows them, relative to the root. */
export const PAGE = 'reference/sdk/overview.md';

/**
 * One drawing: its name, which both its files carry, its DOT source, and the
 * text its image carries on the page.
 */
export interface Diagram {
  readonly name: string;
  readonly dot: string;
  readonly alt: string;
}

// ---------------------------------------------------------------------------
// How every drawing looks
// ---------------------------------------------------------------------------

// Few colours, and none that only red against green tells apart: dark ink, a
// mid grey for lines, a light blue for a header and a lighter one for a row a
// line leaves from. Every drawing paints its own white ground, so it reads the
// same on the site's light theme and on its dark one.
const INK = '#1f2328';
const LINE = '#57606a';
const HEADER = '#d6e4f5';
const SHADED = '#eef4fb';
const GROUND = '#ffffff';
const FONT = 'Helvetica';
const CODE = 'Courier';

/**
 * The lines every drawing opens with: its ground, fonts and colours. Every
 * drawing runs from the top down, since its boxes are wider than they are
 * tall and a page's column is narrow.
 */
function opening(name: string): string[] {

  const graph = [
    'rankdir=TB',
    `bgcolor="${GROUND}"`,
    'pad=0.3',
    'nodesep=0.35',
    'ranksep=0.5',
    `fontname="${FONT}"`,
  ];

  const node = [
    'shape=plaintext',
    `fontname="${FONT}"`,
    'fontsize=12',
    `fontcolor="${INK}"`,
    `color="${LINE}"`,
  ];

  const edge = [
    `fontname="${FONT}"`,
    'fontsize=11',
    `fontcolor="${INK}"`,
    `color="${LINE}"`,
    'arrowsize=0.7',
  ];

  return [
    `digraph ${name} {`,
    `  graph [${graph.join(', ')}];`,
    `  node [${node.join(', ')}];`,
    `  edge [${edge.join(', ')}];`,
  ];

}

/** A drawing's lines closed into its DOT source, with its image's text. */
function closed(
  name: string,
  lines: readonly string[],
  alt: string,
): Diagram {
  return {
    name,
    dot: [...lines, '}'].join('\n') + '\n',
    alt,
  };
}

/** Text made safe inside a graphviz HTML label. */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Text in the code font. */
function code(text: string): string {
  return `<FONT FACE="${CODE}">${escaped(text)}</FONT>`;
}

/** Text in the muted colour, smaller. */
function small(text: string): string {
  return `<FONT POINT-SIZE="10" COLOR="${LINE}">${escaped(text)}</FONT>`;
}

/** Text in bold. */
function bold(text: string): string {
  return `<B>${escaped(text)}</B>`;
}

/** Words broken into lines of about `width` characters each. */
function lineUp(words: string, width: number): string[] {

  const lines: string[] = [];
  let line = '';

  for (const word of words.split(/\s+/)) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line === '' ? word : `${line} ${word}`;
    }
  }

  if (line !== '') {
    lines.push(line);
  }

  return lines;

}

/**
 * Words as graphviz HTML text in lines of about `width` characters, since a
 * label does not wrap by itself. The breaks are `<BR/>`, and the cell they
 * stand in aligns them.
 */
function wrapped(words: string, width: number): string {
  return lineUp(words, width).map(escaped).join('<BR/>');
}

/** The opening of a graphviz HTML table, with the drawings' cell style. */
function tableOpening(padding: number): string {

  const attributes = [
    'BORDER="0"',
    'CELLBORDER="1"',
    'CELLSPACING="0"',
    `CELLPADDING="${padding}"`,
    `COLOR="${LINE}"`,
  ];

  return `<TABLE ${attributes.join(' ')}>`;

}

/** A box of a header and lines under it, as a graphviz HTML label. */
function table(
  header: string,
  rows: readonly string[],
  fill: string,
): string {

  // `BALIGN` puts every line of a cell to the left, where `ALIGN` places
  // only the cell's text as a whole.
  const cell = 'ALIGN="LEFT" BALIGN="LEFT"';
  const head = `<TR><TD BGCOLOR="${fill}" ${cell}>${header}</TD></TR>`;
  const body = rows.map((row) => `<TR><TD ${cell}>${row}</TD></TR>`);

  return `<${tableOpening(5)}${head}${body.join('')}</TABLE>>`;

}

/** A box whose header is coloured, for what a drawing is about. */
function headed(header: string, rows: readonly string[]): string {
  return table(
    header,
    rows,
    HEADER,
  );
}

/** A box whose header is lightly shaded, for a result or a phase. */
function shaded(header: string, rows: readonly string[]): string {
  return table(
    header,
    rows,
    SHADED,
  );
}

/** A box with no colour, for what stands around the subject. */
function plain(header: string, rows: readonly string[]): string {
  return table(
    header,
    rows,
    GROUND,
  );
}

/**
 * A type as an image's text writes it: brackets and angle brackets would be
 * read as the page's own markup there, so a list and a promise are said in
 * words.
 */
function spoken(type: string): string {
  return type
    .replace(/^Promise<(.+)>$/, 'a promise of $1')
    .replace(/^(\w+)\[\]$/, 'a list of $1');
}

/** A node's line in a DOT source. */
function node(id: string, label: string): string {
  return `  ${id} [label=${label}];`;
}

/** Words joined as a sentence lists them: `a`, `a and b`, `a, b and c`. */
function listed(words: readonly string[], last = 'and'): string {

  if (words.length < 2) {
    return words.join('');
  }

  return `${words.slice(0, -1).join(', ')} ${last} ${words.at(-1)}`;

}

/** Text that starts a sentence, its first letter a capital. */
function opened(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Reading the sources
// ---------------------------------------------------------------------------

/** The five packages an application installs, by folder. */
export const PACKAGES = [
  'base',
  'config',
  'remote',
  'silhouettes',
  'usb',
] as const;

/** The scope every package of the SDK is published under. */
const SCOPE = '@freeharmony-sdk/';

/**
 * The run time dependencies that are native modules, built for the machine
 * they are installed on, and so never loaded in a browser.
 */
const NATIVE = ['node-hid'];

/** A package's manifest, as far as the drawing reads it. */
interface Manifest {
  readonly name: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}

function manifestOf(folder: string): Manifest {

  const file = join(ROOT, `packages/${folder}/package.json`);

  return JSON.parse(readFileSync(file, 'utf8')) as Manifest;

}

/** An exported name: the entry an application imports it from, and its path. */
interface Name {
  readonly entry: string;
  readonly path: string;
}

/** The config package's main entry, where most names are imported from. */
const CONFIG_ENTRY = '@freeharmony-sdk/config';

/** The entry a sync and its types are imported from. */
const SYNC_ENTRY = '@freeharmony-sdk/remote/write';

/** A name of the config package's main entry. */
function inConfig(path: string): Name {
  return {
    entry: CONFIG_ENTRY,
    path,
  };
}

/** A name of the sync's entry. */
function inSync(path: string): Name {
  return {
    entry: SYNC_ENTRY,
    path,
  };
}

/**
 * An entry's module symbol, by the specifier an application imports, through
 * the program the API reference's generator reads.
 */
function entrySymbol(sources: Sources, specifier: string): ts.Symbol {

  const page = PAGES.find((one) => {
    return one.title === specifier && one.namespace === undefined;
  });

  if (page === undefined) {
    throw new Error(`${specifier} is not an entry the API reference documents`);
  }

  const file = sources.program.getSourceFile(join(ROOT, page.module));

  const symbol = file === undefined
    ? undefined
    : sources.checker.getSymbolAtLocation(file);

  if (symbol === undefined) {
    throw new Error(`the compiler did not read ${page.module}`);
  }

  return symbol;

}

/**
 * The symbol an exported name stands for: `recipe.create` is found through
 * the namespace an entry exports.
 */
function exported(sources: Sources, name: Name): ts.Symbol {

  const { checker } = sources;
  let symbol = entrySymbol(sources, name.entry);

  for (const part of name.path.split('.')) {
    const found = checker
      .getExportsOfModule(symbol)
      .find((one) => one.name === part);

    if (found === undefined) {
      throw new Error(`${name.entry} exports no ${name.path}`);
    }

    const alias = found.flags & ts.SymbolFlags.Alias;

    symbol = alias ? checker.getAliasedSymbol(found) : found;
  }

  return symbol;

}

/** What a function returns, as the compiler writes the type. */
function returnType(sources: Sources, name: Name): string {

  const { checker } = sources;
  const symbol = exported(sources, name);
  const [signature] = checker.getTypeOfSymbol(symbol).getCallSignatures();

  if (signature === undefined) {
    throw new Error(`${name.path} of ${name.entry} is not a function`);
  }

  return checker.typeToString(checker.getReturnTypeOfSignature(signature));

}

/**
 * A type's source text as a drawing shows it: on one line, and `readonly`
 * left out, since every field of the document has it.
 */
function typeText(type: ts.Node): string {
  return type
    .getText()
    .replace(/\breadonly\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A line of a drawn type: a field and its type, or a union's member. */
interface Row {
  readonly name?: string;
  readonly type: string;
}

/** A field of an interface as a row: its name, `?` where optional, its type. */
function fieldRow(member: ts.PropertySignature): Row {

  const optional = member.questionToken === undefined ? '' : '?';
  const type = member.type === undefined ? 'unknown' : typeText(member.type);

  return {
    name: member.name.getText() + optional,
    type,
  };

}

/** An interface's fields, or a type alias's union members, in order. */
function rowsOf(sources: Sources, name: Name): Row[] {

  const declaration = exported(sources, name).declarations?.[0];

  if (declaration !== undefined && ts.isInterfaceDeclaration(declaration)) {
    return declaration.members
      .filter(ts.isPropertySignature)
      .map(fieldRow);
  }

  if (declaration !== undefined && ts.isTypeAliasDeclaration(declaration)) {
    const { type } = declaration;
    const members = ts.isUnionTypeNode(type) ? type.types : [type];

    return members.map((member) => {
      return {
        type: typeText(member),
      };
    });
  }

  throw new Error(`${name.path} is neither an interface nor a type`);

}

/** A plain value a constant holds: a string, true or false. */
type Plain = string | boolean;

/** A literal's value, or a refusal naming where it is not plain data. */
function literal(value: ts.Expression, where: string): Plain {

  if (ts.isStringLiteral(value)) {
    return value.text;
  }

  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  // A long text is written as several strings joined by `+`. The drawings
  // use none of those texts, so one reads as empty rather than as a refusal.
  if (ts.isBinaryExpression(value)) {
    return '';
  }

  throw new Error(`${where} is not plain data`);

}

/** An initialiser with its `as const` and `satisfies` taken off. */
function bare(value: ts.Expression): ts.Expression {

  let at = value;

  while (
    ts.isAsExpression(at)
    || ts.isSatisfiesExpression(at)
    || ts.isParenthesizedExpression(at)
  ) {
    at = at.expression;
  }

  return at;

}

/** A property's name as the source writes it, quoted or not. */
function keyOf(property: ts.ObjectLiteralElementLike): string {

  const { name } = property;

  if (name === undefined) {
    return '';
  }

  return ts.isStringLiteral(name) ? name.text : name.getText();

}

/** The fields of an object literal, each with the value it is given. */
function fieldsOf(
  value: ts.Expression,
  where: string,
): Map<string, ts.Expression> {

  const object = bare(value);

  if (!ts.isObjectLiteralExpression(object)) {
    throw new Error(`${where} is not an object literal`);
  }

  const out = new Map<string, ts.Expression>();

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(`${where} holds something other than plain fields`);
    }

    out.set(keyOf(property), property.initializer);
  }

  return out;

}

/** An object literal of plain values, as a map. */
function plainOf(value: ts.Expression, where: string): Map<string, Plain> {

  const out = new Map<string, Plain>();

  for (const [key, field] of fieldsOf(value, where)) {
    out.set(key, literal(field, `${where}.${key}`));
  }

  return out;

}

/** The initialiser of an exported constant, as the source writes it. */
function initialiser(sources: Sources, name: Name): ts.Expression {

  const declaration = exported(sources, name).declarations?.[0];

  if (
    declaration === undefined
    || !ts.isVariableDeclaration(declaration)
    || declaration.initializer === undefined
  ) {
    throw new Error(`${name.path} is not a constant with a value`);
  }

  return declaration.initializer;

}

/** One way a sync ends, as `SYNC_ENDINGS` states it. */
export interface Ending {
  readonly result: string;
  readonly remote: string;
  readonly state?: string;
}

/** One ending read off its object literal. */
function endingOf(element: ts.Expression, where: string): Ending {

  const fields = plainOf(element, where);
  const state = fields.get('state');

  const ending = {
    result: String(fields.get('result')),
    remote: String(fields.get('remote')),
  };

  if (state === undefined) {
    return ending;
  }

  return {
    ...ending,
    state: String(state),
  };

}

/** `SYNC_ENDINGS`: each kind of remote and its endings, in order. */
function endingsOf(sources: Sources): Map<string, Ending[]> {

  const value = initialiser(sources, inSync('SYNC_ENDINGS'));
  const out = new Map<string, Ending[]>();

  for (const [kind, list] of fieldsOf(value, 'SYNC_ENDINGS')) {
    const where = `SYNC_ENDINGS.${kind}`;

    if (!ts.isArrayLiteralExpression(list)) {
      throw new Error(`${where} is not a list`);
    }

    out.set(kind, list.elements.map((element) => endingOf(element, where)));
  }

  return out;

}

/** Whether each state of `SYNC_STATES` lets the remote be unplugged. */
function unpluggable(sources: Sources): Map<string, boolean> {

  const value = initialiser(sources, inSync('SYNC_STATES'));
  const out = new Map<string, boolean>();

  for (const [state, fields] of fieldsOf(value, 'SYNC_STATES')) {
    const plainFields = plainOf(fields, `SYNC_STATES.${state}`);

    out.set(state, plainFields.get('unplug') === true);
  }

  return out;

}

/**
 * The states of `SYNC_ENDINGS` no sync of any model reaches yet, each marked
 * so in the drawing. **Written here because the code says it in words and
 * not as data**: the comment over `SYNC_STATES` in
 * `packages/remote/src/sync.ts` says only a Harmony 885's write withholds a
 * restart and no document builds for an 885 yet. A name here that is not a
 * state of the endings stops the generator, so a state renamed or removed
 * cannot leave a stale mark behind; one that becomes reachable is taken off
 * by hand when the 885's build lands.
 */
export const NOT_REACHED_YET = ['restart-withheld'];

/** How the drawing words an ending that no model reaches yet. */
const UNREACHED = 'not reached by any model yet';

/** The guide's sync example, which asserts the phases of each kind. */
export const SYNC_EXAMPLE = 'packages/remote/examples/sync.ts';

/**
 * The two lists of phases the sync example asserts, by the kind of remote
 * `SYNC_ENDINGS` names, and the constant of the example each is read from.
 */
export const PHASE_LISTS = {
  compiled: 'configurationPhases',
  document: 'documentPhases',
} as const;

/** The list of strings a constant of a source file holds. */
function listIn(file: ts.SourceFile, constant: string): string[] | undefined {

  let found: string[] | undefined;

  const visit = (at: ts.Node): void => {

    const named = ts.isVariableDeclaration(at)
      && at.name.getText() === constant
      && at.initializer !== undefined;

    if (named) {
      const list = bare(at.initializer!);

      if (ts.isArrayLiteralExpression(list)) {
        found = list.elements.map((element) => {
          return String(literal(element, `${constant} in ${file.fileName}`));
        });
      }
    }

    ts.forEachChild(at, visit);
  };

  visit(file);

  return found;

}

/** The phases each kind of sync reports, in order, from the sync example. */
function phasesOf(sources: Sources): Map<string, string[]> {

  const text = readFileSync(join(ROOT, SYNC_EXAMPLE), 'utf8');

  const file = ts.createSourceFile(
    SYNC_EXAMPLE,
    text,
    ts.ScriptTarget.Latest,
    true,
  );

  const known = rowsOf(sources, inSync('SyncPhase'))
    .map((row) => row.type.replace(/'/g, ''));

  const out = new Map<string, string[]>();

  for (const [kind, constant] of Object.entries(PHASE_LISTS)) {
    const phases = listIn(file, constant);

    if (phases === undefined) {
      throw new Error(`${SYNC_EXAMPLE} has no list ${constant} of phases`);
    }

    for (const phase of phases) {
      if (!known.includes(phase)) {
        throw new Error(`${constant} names ${phase}, which is no SyncPhase`);
      }
    }

    out.set(kind, phases);
  }

  return out;

}

// ---------------------------------------------------------------------------
// The packages
// ---------------------------------------------------------------------------

/**
 * What an application takes from each package, a line each: the only words
 * of the drawings not read off the code, since what a package is for is a
 * sentence and not a field. The section's opening page says it at length.
 */
const TAKES: Readonly<Record<(typeof PACKAGES)[number], string>> = {
  base: 'the table of models, the key codes, and what the SDK must do, '
    + 'with each model\'s status',
  config: 'the document and its toolkit, the check, the build, finding a '
    + 'device, what each model can do, reading a configuration file',
  remote: 'reading a remote\'s configuration; on its write subpath the sync '
    + 'and a pretend remote',
  silhouettes: 'each model\'s front face, as data and as a drawing',
  usb: 'finding a remote on the USB cable and opening it to read',
};

/**
 * Each package's run time dependencies on the SDK's own packages and on
 * native modules, by package folder.
 */
function dependenciesOf(): Map<string, string[]> {

  const out = new Map<string, string[]>();

  for (const folder of PACKAGES) {
    const named = Object.keys(manifestOf(folder).dependencies ?? {});

    const kept = named
      .filter((name) => name.startsWith(SCOPE) || NATIVE.includes(name))
      .map((name) => name.replace(SCOPE, ''))
      .sort();

    out.set(folder, kept);
  }

  return out;

}

/** Whether a package reaches a native module, through any it depends on. */
function reachesNative(
  folder: string,
  dependencies: ReadonlyMap<string, readonly string[]>,
): boolean {

  const direct = dependencies.get(folder) ?? [];

  return direct.some((name) => {
    return NATIVE.includes(name) || reachesNative(name, dependencies);
  });

}

/** The packages drawing's image text: who depends on whom, where each runs. */
function packagesAlt(
  dependencies: ReadonlyMap<string, readonly string[]>,
): string {

  const depending = [...dependencies]
    .filter((entry) => entry[1].length > 0)
    .map((entry) => `${entry[0]} depends on ${listed(entry[1])}`);

  const native = PACKAGES.filter((folder) => {
    return reachesNative(folder, dependencies);
  });

  const anywhere = PACKAGES.filter((folder) => !native.includes(folder));

  return 'The five packages an application imports by name: '
    + `${listed(PACKAGES)}. ${opened(depending.join('; '))}; `
    + `${listed(NATIVE)} is a native module. ${opened(listed(anywhere))} load `
    + `in a browser and in Node; ${listed(native)} run in Node.`;

}

function packagesDiagram(): Diagram {

  const dependencies = dependenciesOf();
  const lines = opening('packages');

  lines.push(node('application', plain(bold('an application'), [])));

  for (const folder of PACKAGES) {
    const where = reachesNative(folder, dependencies)
      ? 'runs in Node, through a native module'
      : 'loads in a browser and in Node';

    const rows = [wrapped(TAKES[folder], 34), small(where)];

    lines.push(node(folder, headed(code(SCOPE + folder), rows)));
  }

  for (const native of NATIVE) {
    const rows = [small('a native module')];

    lines.push(node(`"${native}"`, plain(code(native), rows)));
  }

  // The application imports each package by its name, which the dashed lines
  // say; a solid line is one package depending on another.
  for (const folder of PACKAGES) {
    lines.push(`  application -> ${folder} [style=dashed, color="${LINE}"];`);
  }

  for (const [folder, names] of dependencies) {
    for (const name of names) {
      lines.push(`  ${folder} -> "${name}" [label=" depends on"];`);
    }
  }

  return closed(
    'packages',
    lines,
    packagesAlt(dependencies),
  );

}

// ---------------------------------------------------------------------------
// The life of a document
// ---------------------------------------------------------------------------

/** A step an application takes: the function it calls and what it gives. */
interface Step {
  readonly id: string;
  readonly word: string;
  readonly name: Name;
  readonly gives: string;
}

/**
 * The steps, in the order an application meets them. A change stands for
 * every change of the toolkit, which all return the same type.
 */
const STEPS: readonly Step[] = [
  {
    id: 'create',
    word: 'create',
    name: inConfig('recipe.create'),
    gives: 'the document, empty and valid for its model',
  },
  {
    id: 'open',
    word: 'open',
    name: inConfig('recipe.open'),
    gives: 'the document, its shape checked',
  },
  {
    id: 'change',
    word: 'change, such as',
    name: inConfig('recipe.setKey'),
    gives: 'a new document and what else the change touched',
  },
  {
    id: 'check',
    word: 'check',
    name: inConfig('recipe.check'),
    gives: 'every problem, each at the place it concerns',
  },
  {
    id: 'build',
    word: 'build',
    name: inConfig('buildFromRecipe'),
    gives: 'what the remote is sent',
  },
  {
    id: 'sync',
    word: 'sync',
    name: inSync('syncDocument'),
    gives: 'how it ended, and what it left the remote as',
  },
];

function lifeDiagram(sources: Sources): Diagram {

  const lines = opening('life');
  const document = returnType(sources, inConfig('recipe.create'));
  const said: string[] = [];

  const model = plain(bold('a model'), [small('by Logitech\'s name')]);
  const saved = plain(bold('a saved document'), [small('JSON')]);
  const held = [code(document), small('plain data')];

  lines.push(node('model', model));
  lines.push(node('saved', saved));
  lines.push(node('document', headed(bold('the document'), held)));

  for (const step of STEPS) {
    const rows = [code(step.name.path), small(step.name.entry)];
    const type = returnType(sources, step.name);
    const gives = shaded(code(type), [wrapped(step.gives, 26)]);

    lines.push(node(step.id, plain(bold(step.word), rows)));
    lines.push(node(`${step.id}_gives`, gives));
    lines.push(`  ${step.id} -> ${step.id}_gives;`);
    said.push(`${step.name.path} gives ${spoken(type)}, ${step.gives}`);
  }

  // Where each step starts from: a model, a saved document, or the document
  // an application holds.
  lines.push('  model -> create;');
  lines.push('  saved -> open;');
  lines.push('  create_gives -> document;');
  lines.push('  open_gives -> document;');

  for (const step of STEPS) {
    if (step.id !== 'create' && step.id !== 'open') {
      lines.push(`  document -> ${step.id};`);
    }
  }

  // A change's result holds the new document, which is the one an
  // application holds from then on.
  lines.push('  change_gives -> document [label=" its document", style=dashed];');

  const alt = 'The steps an application takes with a document, a '
    + `${document}, and what each gives back: ${said.join('; ')}. A change's `
    + 'new document is the one an application holds from then on.';

  return closed(
    'life',
    lines,
    alt,
  );

}

// ---------------------------------------------------------------------------
// The shape of a document
// ---------------------------------------------------------------------------

/** The document's types the drawing shows, the document first. */
const DOCUMENT_TYPES = [
  'Recipe',
  'RecipeModel',
  'RecipeDevice',
  'RecipeActivity',
  'RecipeActivityDevice',
  'RecipeKey',
  'RecipeKeyAction',
  'RecipeScreenItem',
  'RecipeScreenCommand',
  'RecipeSetting',
];

/** The other types of the drawing a row's type names. */
function named(row: Row, of: string): string[] {

  const words = [...row.type.matchAll(/\b[A-Z]\w*\b/g)]
    .map((match) => match[0])
    .filter((word) => DOCUMENT_TYPES.includes(word) && word !== of);

  return [...new Set(words)];

}

/** One type's box, with a port on each row a line leaves from. */
function typeBox(name: string, rows: readonly Row[]): string {

  const cells = rows.map((row, at) => {

    // A row that names another type of the drawing is where a line leaves
    // from, so it is shaded.
    const fill = named(row, name).length > 0 ? ` BGCOLOR="${SHADED}"` : '';

    const text = row.name === undefined
      ? code(row.type)
      : `${escaped(row.name)}  ${code(row.type)}`;

    return `<TR><TD PORT="r${at}" ALIGN="LEFT"${fill}>${text}</TD></TR>`;
  });

  const head = `<TR><TD BGCOLOR="${HEADER}">${bold(name)}</TD></TR>`;

  return `<${tableOpening(4)}${head}${cells.join('')}</TABLE>>`;

}

function shapeDiagram(sources: Sources): Diagram {

  const lines = opening('shape');
  const edges: string[] = [];
  const holds: string[] = [];

  for (const name of DOCUMENT_TYPES) {
    const rows = rowsOf(sources, inConfig(name));
    const reached = new Set<string>();

    lines.push(node(name, typeBox(name, rows)));

    rows.forEach((row, at) => {
      for (const target of named(row, name)) {
        edges.push(`  ${name}:r${at} -> ${target};`);
        reached.add(target);
      }
    });

    if (reached.size > 0) {
      holds.push(`${name} holds ${listed([...reached])}`);
    }
  }

  lines.push(...edges);

  const alt = 'The fields of a document, a Recipe, and of the types it holds, '
    + `each field with its type: ${holds.join('; ')}.`;

  return closed(
    'shape',
    lines,
    alt,
  );

}

// ---------------------------------------------------------------------------
// A sync
// ---------------------------------------------------------------------------

/** How the drawing names each kind of remote `SYNC_ENDINGS` lists. */
const KINDS: Readonly<Record<string, string>> = {
  compiled: 'a remote sent one configuration file',
  document: 'a remote sent documents',
};

/** The same, short, under an ending that only one kind has. */
const SHORT_KINDS: Readonly<Record<string, string>> = {
  compiled: 'a configuration file only',
  document: 'documents only',
};

/** How the drawing words what a sync left the remote as. */
const LEFT_AS: Readonly<Record<string, string>> = {
  'as-before': 'the remote as it was',
  'new-configuration': 'the remote holds the new configuration',
  'needs-recovery': 'the remote needs its recovery',
};

/** The same, as an image's text words it after "leaves the remote". */
const LEFT_AS_SPOKEN: Readonly<Record<string, string>> = {
  'as-before': 'as it was',
  'new-configuration': 'holding the new configuration',
  'needs-recovery': 'needing its recovery',
};

/** A phase's node, by its kind of remote, as a DOT identifier. */
function phaseId(kind: string, phase: string): string {
  return `${kind}_${phase.replace(/-/g, '_')}`;
}

/** An ending of the sync, and the kinds of remote it is an ending of. */
interface Shared {
  readonly ending: Ending;
  readonly kinds: readonly string[];
}

/** The endings grouped by what they leave the remote as, in order. */
function byRemote(
  endings: ReadonlyMap<string, readonly Ending[]>,
): Map<string, Map<string, Shared>> {

  const groups = new Map<string, Map<string, Shared>>();

  for (const [kind, list] of endings) {
    for (const ending of list) {
      const key = `${ending.result} ${ending.state ?? ''}`;
      const group = groups.get(ending.remote) ?? new Map<string, Shared>();
      const kinds = group.get(key)?.kinds ?? [];

      group.set(key, {
        ending,
        kinds: [...kinds, kind],
      });

      groups.set(ending.remote, group);
    }
  }

  return groups;

}

/** What the drawing says of the endings, read once from the sources. */
interface EndingFacts {
  readonly everyKind: number;
  readonly unplug: ReadonlyMap<string, boolean>;
}

/** An ending's name: its result, and its state where it has one. */
function endingName(ending: Ending): string {
  return ending.state === undefined
    ? ending.result
    : `${ending.result}: ${ending.state}`;
}

/**
 * What the drawing says under an ending: the kinds of remote it is an ending
 * of, whether a state lets the remote be unplugged, and whether no model
 * reaches it yet.
 */
function endingNotes(shared: Shared, facts: EndingFacts): string[] {

  const { state } = shared.ending;
  const [only] = shared.kinds;

  const which = shared.kinds.length === facts.everyKind
    ? 'either kind'
    : SHORT_KINDS[only!] ?? only!;

  if (state === undefined) {
    return [which];
  }

  const unplugging = facts.unplug.get(state) === true
    ? 'may be unplugged'
    : 'do not unplug';

  if (NOT_REACHED_YET.includes(state)) {
    return [which, unplugging, UNREACHED];
  }

  return [which, unplugging];

}

/** One ending as a row of its box. */
function endingRow(shared: Shared, facts: EndingFacts): string {

  const { result, state } = shared.ending;
  const notes = small(endingNotes(shared, facts).join(', '));

  if (state === undefined) {
    return `${code(result)}<BR/>${notes}`;
  }

  return `${code(result)}: ${code(state)}<BR/>${notes}`;

}

/** Refuse a mark of `NOT_REACHED_YET` that names no state of the endings. */
function checkUnreached(endings: ReadonlyMap<string, readonly Ending[]>): void {

  const states = [...endings.values()]
    .flat()
    .map((ending) => ending.state);

  for (const state of NOT_REACHED_YET) {
    if (!states.includes(state)) {
      throw new Error(`NOT_REACHED_YET names ${state}, which no ending has`);
    }
  }

}

/** The sync drawing's image text: the phases of each kind, then the endings. */
function syncAlt(
  phases: ReadonlyMap<string, readonly string[]>,
  groups: ReadonlyMap<string, ReadonlyMap<string, Shared>>,
): string {

  const chains = [...phases].map((entry) => {
    return `For ${KINDS[entry[0]] ?? entry[0]}: ${entry[1].join(', ')}.`;
  });

  const left = [...groups].map((entry) => {

    const names = [...entry[1].values()].map((shared) => {

      const name = endingName(shared.ending);
      const state = shared.ending.state;

      return state !== undefined && NOT_REACHED_YET.includes(state)
        ? `${name}, ${UNREACHED}`
        : name;
    });

    return `${LEFT_AS_SPOKEN[entry[0]] ?? entry[0]} (${names.join('; ')})`;
  });

  const leaves = listed(left, 'or');

  return `The phases of a sync, in order. ${chains.join(' ')} From any phase `
    + `the sync ends in one outcome, which leaves the remote ${leaves}.`;

}

function syncDiagram(sources: Sources): Diagram {

  const endings = endingsOf(sources);
  const phases = phasesOf(sources);
  const groups = byRemote(endings);
  const lines = opening('sync');

  const facts = {
    everyKind: endings.size,
    unplug: unpluggable(sources),
  };

  checkUnreached(endings);
  lines.push('  compound=true;');

  // Each kind of remote's phases, in the order a sync reports them, in a box
  // of its own.
  for (const [kind, list] of phases) {
    const label = `<${bold(KINDS[kind] ?? kind)}>`;
    const chain = list.map((phase) => phaseId(kind, phase));

    lines.push(`  subgraph cluster_${kind} {`);
    lines.push(`    label=${label}; style=rounded; color="${LINE}"; margin=12;`);

    for (const phase of list) {
      lines.push(`  ${node(phaseId(kind, phase), shaded(code(phase), []))}`);
    }

    lines.push(`    ${chain.join(' -> ')};`);
    lines.push('  }');
  }

  // A sync ends in one outcome from whichever phase it reached, so the line
  // leaves the box of phases rather than one of them.
  lines.push(node('outcome', headed(bold('the outcome'), [code('SyncOutcome')])));

  for (const [kind, list] of phases) {
    const last = phaseId(kind, list.at(-1)!);
    const attributes = `ltail=cluster_${kind}, label=" from any phase"`;

    lines.push(`  ${last} -> outcome [${attributes}];`);
  }

  // One box per state a sync can leave the remote in, listing the endings
  // that leave it so.
  for (const [remote, group] of groups) {
    const rows = [...group.values()].map((shared) => endingRow(shared, facts));
    const header = `${bold(LEFT_AS[remote] ?? remote)}<BR/>${small(remote)}`;
    const id = `left_${remote.replace(/-/g, '_')}`;

    lines.push(node(id, plain(header, rows)));
    lines.push(`  outcome -> ${id};`);
  }

  return closed(
    'sync',
    lines,
    syncAlt(phases, groups),
  );

}

// ---------------------------------------------------------------------------
// The page's image texts
// ---------------------------------------------------------------------------

/** The width the page's prose is wrapped at. */
const PAGE_WIDTH = 116;

/**
 * A drawing's image on the page, whatever text it carries now: from an `![`
 * to the image's own link, with no other image between.
 */
function imageOn(name: string): RegExp {

  const text = '(?:(?!!\\[)[\\s\\S])*?';
  const link = `\\]\\(diagrams/${name}\\.svg\\)`;

  return new RegExp(`!\\[${text}${link}`, 'g');

}

/** A drawing's image as the page writes it, its text wrapped as prose is. */
function image(diagram: Diagram): string {

  const whole = `![${diagram.alt}](diagrams/${diagram.name}.svg)`;

  return lineUp(whole, PAGE_WIDTH).join('\n');

}

/**
 * The page with each drawing's image carrying the text the sources make, or
 * a refusal where an image is not on it exactly once.
 */
export function pageWithAlts(text: string, expected: readonly Diagram[]): string {

  let out = text;

  for (const diagram of expected) {
    const found = text.match(imageOn(diagram.name)) ?? [];

    if (found.length !== 1) {

      const times = `${found.length} times, not once`;

      throw new Error(`${PAGE} shows diagrams/${diagram.name}.svg ${times}`);
    }

    out = out.replace(imageOn(diagram.name), image(diagram));
  }

  return out;

}

// ---------------------------------------------------------------------------
// Drawing, checking and writing
// ---------------------------------------------------------------------------

/** Every drawing's DOT source, as the sources make it now. */
export function diagrams(sources: Sources = readSources()): Diagram[] {
  return [
    packagesDiagram(),
    lifeDiagram(sources),
    shapeDiagram(sources),
    syncDiagram(sources),
  ];
}

/** The SHA-256 of a DOT source, which the SVG drawn from it records. */
export function digestOf(dot: string): string {
  return createHash('sha256').update(dot).digest('hex');
}

/** What an SVG records of the graphviz that drew it and of its source. */
export interface DrawnFrom {
  readonly version: string;
  readonly digest: string;
}

/** The comment an SVG records its graphviz and its source in. */
function recordLine(version: string, diagram: Diagram): string {
  return `<!-- drawn by graphviz ${version} from ${diagram.name}.dot, `
    + `sha256 ${digestOf(diagram.dot)}. Generated: do not edit. -->`;
}

const RECORD = new RegExp(
  '<!-- drawn by graphviz (\\S+) from \\S+\\.dot, '
  + 'sha256 ([0-9a-f]{64})\\. Generated: do not edit\\. -->',
);

/** What an SVG records, or undefined for one that records nothing. */
export function recordIn(svg: string): DrawnFrom | undefined {

  const match = RECORD.exec(svg);

  if (match === null) {
    return undefined;
  }

  return {
    version: match[1]!,
    digest: match[2]!,
  };

}

/**
 * The version of the `dot` on this machine, or undefined where there is
 * none. `dot -V` answers on standard error on most builds, so both streams
 * are read.
 */
export function dotVersion(): string | undefined {

  const said = spawnSync('dot', ['-V'], {
    encoding: 'utf8',
  });

  if (said.error !== undefined) {
    return undefined;
  }

  return /version (\S+)/.exec(`${said.stdout}${said.stderr}`)?.[1];

}

/**
 * The SVG graphviz draws from a DOT source, made fit to stand in a page: no
 * XML prologue or document type, which a page does not allow inside it; no
 * size in points, so it scales to the column while its `viewBox` keeps its
 * shape; and graphviz's own comment replaced by the record of its source.
 */
export function drawn(diagram: Diagram, version: string): string {

  const svg = execFileSync('dot', ['-Tsvg'], {
    input: diagram.dot,
    encoding: 'utf8',
  });

  const body = svg
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(/<!DOCTYPE[^>]*>\s*/, '')
    .replace(/<!-- Generated by graphviz[^>]*-->\s*/, '')
    .replace(/(<svg\b[^>]*?)\s+width="[^"]*"\s+height="[^"]*"/, '$1');

  return `${recordLine(version, diagram)}\n${body}`;

}

/** The command that puts a drawing right, named in every problem. */
const FIX = 'run make sdk-diagrams-write';

/** What a check is given: what the sources make, the files, and `dot`. */
export interface CheckInput {
  readonly expected: readonly Diagram[];
  readonly committed: (path: string) => string | undefined;
  readonly version: string | undefined;
}

/** The problems with one committed drawing; empty where it agrees. */
function drawingProblems(diagram: Diagram, input: CheckInput): string[] {

  const { committed, version } = input;
  const dotPath = `${FOLDER}/${diagram.name}.dot`;
  const svgPath = `${FOLDER}/${diagram.name}.svg`;
  const svg = committed(svgPath);
  const record = svg === undefined ? undefined : recordIn(svg);
  const problems: string[] = [];

  if (committed(dotPath) !== diagram.dot) {
    problems.push(`${dotPath} differs from what the sources make: ${FIX}`);
  }

  if (record === undefined) {
    return [...problems, `${svgPath} is missing or records no source: ${FIX}`];
  }

  if (record.digest !== digestOf(diagram.dot)) {
    return [...problems, `${svgPath} was drawn from another source: ${FIX}`];
  }

  // The same graphviz draws the same SVG, so here the drawing itself is held,
  // and not only its source.
  const same = version !== undefined && version === record.version;

  if (same && drawn(diagram, version) !== svg) {
    problems.push(`${svgPath} is not what graphviz ${version} draws: ${FIX}`);
  }

  return problems;

}

/**
 * The problems with the committed drawings and the page's image texts, given
 * what the sources make and the version of `dot` here; empty where they all
 * agree.
 */
export function problemsWith(input: CheckInput): string[] {

  const { expected, committed } = input;
  const problems = expected.flatMap((diagram) => drawingProblems(diagram, input));
  const page = committed(PAGE);

  if (page === undefined) {
    return [...problems, `${PAGE} is missing`];
  }

  try {
    if (pageWithAlts(page, expected) !== page) {
      problems.push(`${PAGE} has image texts the sources do not make: ${FIX}`);
    }
  } catch (error) {
    problems.push((error as Error).message);
  }

  return problems;

}

/** A file's text by its path from the root, or undefined where there is none. */
function readIfThere(path: string): string | undefined {

  const file = join(ROOT, path);

  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;

}

/** Check the committed drawings, or write them; the problems found. */
export function run(write: boolean): string[] {

  const expected = diagrams();
  const version = dotVersion();

  if (!write) {
    return problemsWith({
      expected,
      committed: readIfThere,
      version,
    });
  }

  if (version === undefined) {

    const install = 'brew install graphviz';

    return [`graphviz is not installed, so nothing can be drawn: ${install}`];
  }

  for (const diagram of expected) {
    const svgPath = `${FOLDER}/${diagram.name}.svg`;
    const svg = readIfThere(svgPath);
    const record = svg === undefined ? undefined : recordIn(svg);

    writeFileSync(join(ROOT, `${FOLDER}/${diagram.name}.dot`), diagram.dot);

    // Drawn again only where its source changed, so a newer graphviz
    // rewrites nothing that says nothing new.
    if (record?.digest !== digestOf(diagram.dot)) {
      writeFileSync(join(ROOT, svgPath), drawn(diagram, version));
    }
  }

  const page = readIfThere(PAGE) ?? '';

  writeFileSync(join(ROOT, PAGE), pageWithAlts(page, expected));

  return [];

}

function main(): void {

  const cli = commandLine({
    usage: [
      'usage: node packages/lab/bin/sdk-diagrams.ts [--check | --write]',
      '',
      'The drawings of the SDK\'s overview page, reference/sdk/diagrams/,',
      'generated from the packages\' sources and laid out by graphviz, and',
      'the text each image carries on reference/sdk/overview.md.',
      '',
      '  --check   compare every drawing\'s DOT source with what the sources',
      '            make, its SVG with that source, and the page\'s image',
      '            texts, and fail naming each that differs (the default)',
      '  --write   write the DOT sources and the image texts again, and draw',
      '            again each SVG whose source changed; needs graphviz',
    ].join('\n'),
    flags: ['check', 'write'],
  });

  const write = cli.flag('write');
  const problems = run(write);

  for (const problem of problems) {
    console.error(problem);
  }

  if (problems.length > 0) {
    process.exit(1);
  }

  console.log(write ? 'the SDK drawings written' : 'the SDK drawings agree');

}

if (import.meta.main) {
  main();
}
