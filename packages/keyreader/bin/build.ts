/**
 * Build the key reader page into `reference/key-reader/`, where the website publishes it.
 *
 *   node packages/keyreader/bin/build.ts           write the page (make key-reader)
 *   node packages/keyreader/bin/build.ts --check   say whether the written page matches its sources
 *
 * **Why a build at all.** The website is MkDocs over `reference/` and serves files as they are, so the page
 * has to be JavaScript by the time it gets there, and the sources are TypeScript. **Why this build.** The
 * sources use erasable syntax only (`erasableSyntaxOnly`, `tsconfig.base.json`), so turning them into
 * JavaScript is removing the types and nothing else: no bundler is needed and none is added. The compiler
 * that does it is the TypeScript this repository already pins, through `transpileModule`, rather than
 * Node's own `stripTypeScriptTypes`, which is marked experimental, warns on every call and may change
 * between Node releases; a generated file checked against its generator needs a generator whose output
 * does not move under it.
 *
 * **Comments are removed on the way out.** The sources carry the reasoning, at length, and stay the place
 * to read it; the library modules the page loads were written for this repository, and their comments
 * talk about its own work, which the reference does not describe. Each published file starts with a line
 * naming its source.
 *
 * **Which files are published is decided by the imports, from `page.ts` on**, and then checked against
 * `PUBLISHED`, an allow list: a module the page does not import is not published, and a module the page
 * does import that is not on the list stops the build. So a new import of the `@harmony/usb` barrel, which
 * reaches for node-hid and the write paths, cannot slip into the page unnoticed. Every import specifier is
 * rewritten to the published file beside it, so the browser needs no import map.
 *
 * **Every published script is named for its content**, `page.3f9c0a1b2d.js`: its base name and the first
 * ten hex digits of the SHA-256 of what it holds, its imports' stamped names included, so a change anywhere
 * below a module changes its name too, up to `page.js` and the one script tag in `index.html`. That is what
 * stops a browser mixing two builds, which happened at the bench: a cached `page.js` from one build ran
 * against the next build's `index.html` and stopped at an element the old script expected. With names that
 * follow the content, a new page can only ask for new scripts, and an old page asking for a script that is
 * gone gets nothing rather than the wrong one. A query string on an unchanged name would fix the first case
 * and not the second, since the server ignores it and serves the newest file. `test/build.test.ts` checks
 * that every import, and the script tag, carries the stamp of the file it names.
 *
 * One module has no TypeScript source and is written rather than compiled, `drawings.js`: the drawings of the
 * models the page shows, inlined from `reference/silhouettes/`, `bin/drawings.ts`.
 *
 * `index.html` is copied from `web/` with a line naming its source. The test,
 * `packages/keyreader/test/build.test.ts`, holds the written files against this build, the way
 * `reference/silhouettes/` is held against its generator, and refuses anything else in the folder.
 */
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawingsModule } from './drawings.ts';
import { commandLine } from '@harmony/lab/cli';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const ROOT = resolve(PACKAGE, '..', '..');
const USB = join(ROOT, 'packages', 'usb', 'src');
const BASE = join(ROOT, 'packages', 'base', 'src');

/** Where the page is written: a folder of `reference/`, which the website copies as it is. */
export const OUT_DIR = join(ROOT, 'reference', 'key-reader');

/** The module the browser loads first, named by the page's one script tag. */
const ENTRY = join(PACKAGE, 'src', 'page.ts');

/**
 * Every module the page may load: its source, and the name it is published under.
 *
 * The three from `packages/usb` and `packages/base` import nothing, which is why they can be loaded as they are. Adding a row
 * is adding code a stranger's browser runs against their remote, and `test/send.test.ts` reads every file
 * published here for a second way to send.
 */
const PUBLISHED: ReadonlyMap<string, string> = new Map([
  [ENTRY, 'page.js'],
  [join(PACKAGE, 'src', 'link.ts'), 'link.js'],
  [join(PACKAGE, 'src', 'presses.ts'), 'presses.js'],
  [join(PACKAGE, 'src', 'session.ts'), 'session.js'],
  [join(PACKAGE, 'src', 'face.ts'), 'face.js'],
  [join(PACKAGE, 'src', 'visit.ts'), 'visit.js'],
  [join(USB, 'protocol.ts'), 'protocol.js'],
  [join(BASE, 'keys.ts'), 'keys.js'],
  [join(BASE, 'models.ts'), 'models.js'],
]);

/** The drawings, read as the website publishes them; `bin/drawings.ts` says why they are inlined. */
const SILHOUETTES = join(ROOT, 'reference', 'silhouettes');

/**
 * Modules the build writes rather than compiles: the path an import of one resolves to, and the name it is
 * published under. They have no TypeScript source, only a declaration of their shape beside the sources
 * (`src/drawings.d.ts`), and like every other module they are published only when the page imports them.
 */
const GENERATED: ReadonlyMap<string, string> = new Map([[join(PACKAGE, 'src', 'drawings.js'), 'drawings.js']]);

/** The header a generated module starts with, naming where it came from as a compiled one does. */
const GENERATED_HEADER =
  '// Generated by packages/keyreader/bin/build.ts from the drawings in reference/silhouettes/ and the key data '
  + 'in packages/silhouettes, through packages/keyreader/bin/drawings.ts. Do not edit: run make key-reader.\n';

/** The package subpaths the page imports, and the source each names; `packages/usb/package.json` and `packages/base/package.json`. */
const PACKAGE_SPECIFIERS: ReadonlyMap<string, string> = new Map([
  ['@harmony/usb/protocol', join(USB, 'protocol.ts')],
  ['@harmony/base/keys', join(BASE, 'keys.ts')],
  ['@harmony/base/models', join(BASE, 'models.ts')],
]);

const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2023,
  module: ts.ModuleKind.ESNext,
  // As the workspace compiles: an import marked `type` disappears, and every other import stays exactly
  // as written, so what the page loads is what the source says it loads.
  verbatimModuleSyntax: true,
  removeComments: true,
  newLine: ts.NewLineKind.LineFeed,
};

/** The repository relative path of a file, with forward slashes, for headers and messages. */
function shown(path: string): string {
  return relative(ROOT, path).split('\\').join('/');
}

/** The import and export specifiers of a module, where each sits in the text, and any dynamic import. */
function specifiers(fileName: string, text: string): { text: string; start: number; end: number }[] {
  const file = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2023, true, ts.ScriptKind.JS);
  const found: { text: string; start: number; end: number }[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      // Inside the quotes, so the rewrite keeps whichever quote the compiler printed.
      found.push({
        text: node.moduleSpecifier.text,
        start: node.moduleSpecifier.getStart(file) + 1,
        end: node.moduleSpecifier.getEnd() - 1,
      });
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      // A dynamic import would load a module this build never saw, so the allow list would not hold.
      throw new Error(`${fileName}: a dynamic import, which the key reader build does not follow`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** The source file a specifier names, from the module that imports it. */
function resolveSpecifier(importer: string, specifier: string): string {
  if (specifier.startsWith('.')) return resolve(dirname(importer), specifier);
  const named = PACKAGE_SPECIFIERS.get(specifier);
  if (named === undefined) {
    throw new Error(`${shown(importer)} imports ${specifier}, which the key reader does not publish`);
  }
  return named;
}

/** One module as JavaScript, its imports rewritten to the published files, and the sources it imports. */
function compile(source: string): { text: string; imports: string[] } {
  const name = PUBLISHED.get(source);
  if (name === undefined) {
    throw new Error(`${shown(source)} is imported by the page and is not in PUBLISHED, the build's allow list`);
  }
  const output = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: COMPILER_OPTIONS,
    fileName: source,
    reportDiagnostics: true,
  });
  if (output.diagnostics !== undefined && output.diagnostics.length > 0) {
    const first = ts.flattenDiagnosticMessageText(output.diagnostics[0]?.messageText ?? '', '\n');
    throw new Error(`${shown(source)}: ${first}`);
  }
  let text = output.outputText;
  const imports: string[] = [];
  // From the end backwards, so that each rewrite leaves the positions before it valid.
  for (const found of specifiers(name, text).reverse()) {
    const target = resolveSpecifier(source, found.text);
    const targetName = PUBLISHED.get(target) ?? GENERATED.get(target);
    if (targetName === undefined) {
      throw new Error(`${shown(source)} imports ${shown(target)}, which is not in PUBLISHED, the build's allow list`);
    }
    imports.push(target);
    text = `${text.slice(0, found.start)}./${targetName}${text.slice(found.end)}`;
  }
  const header = `// Generated by packages/keyreader/bin/build.ts from ${shown(source)}. Do not edit: run make key-reader.\n`;
  return { text: header + text, imports };
}

/** How many hex digits of the content's SHA-256 a published script's name carries. */
export const STAMP_LENGTH = 10;

/** The stamp of a file's content. */
export function stampOf(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, STAMP_LENGTH);
}

/** A stamped script name, `page.3f9c0a1b2d.js`: its base, its stamp. */
const STAMPED = new RegExp(`^([a-z]+)\\.([0-9a-f]{${STAMP_LENGTH}})\\.js$`);

/** A published script's base name, `page.js`, from its stamped one, `page.3f9c0a1b2d.js`; others as they are. */
export function baseName(name: string): string {
  const match = STAMPED.exec(name);
  return match === null ? name : `${match[1] as string}.js`;
}

/** The stamp a published name carries, or undefined for a name with none. */
export function stampIn(name: string): string | undefined {
  return STAMPED.exec(name)?.[2];
}

/** The stamped name under which a build publishes a base name, for the tests and for anything reading one. */
export function publishedName(files: ReadonlyMap<string, string>, base: string): string {
  const found = [...files.keys()].filter((name) => baseName(name) === base);
  if (found.length !== 1) throw new Error(`the build publishes ${found.length} files named ${base}`);
  return found[0] as string;
}

/**
 * Name every script for its content, rewriting each import to the stamped name of what it imports.
 *
 * Done from the leaves up, because a module's stamp covers its imports' stamped names: a module's final
 * text needs every module it imports named first. The page's imports form no cycle; one would stop the
 * build here rather than loop.
 */
function stampScripts(plain: ReadonlyMap<string, string>): Map<string, string> {
  const finished = new Map<string, { name: string; text: string }>();
  const visiting = new Set<string>();
  const finish = (base: string): { name: string; text: string } => {
    const done = finished.get(base);
    if (done !== undefined) return done;
    if (visiting.has(base)) throw new Error(`${base} imports itself through its imports, which the stamps cannot name`);
    visiting.add(base);
    let text = plain.get(base) as string;
    // From the end backwards, so that each rewrite leaves the positions before it valid.
    for (const found of specifiers(base, text).reverse()) {
      const target = found.text.startsWith('./') ? found.text.slice(2) : found.text;
      if (!plain.has(target)) throw new Error(`${base} imports ${found.text}, which the build did not write`);
      text = `${text.slice(0, found.start)}./${finish(target).name}${text.slice(found.end)}`;
    }
    visiting.delete(base);
    const result = { name: base.replace(/\.js$/, `.${stampOf(text)}.js`), text };
    finished.set(base, result);
    return result;
  };
  const out = new Map<string, string>();
  for (const base of plain.keys()) {
    const { name, text } = finish(base);
    out.set(name, text);
  }
  return out;
}

/** The whole page, as the files to write: published name to content. */
export function buildKeyReader(): Map<string, string> {
  const files = new Map<string, string>();
  const pending = [ENTRY];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const source = pending.pop() as string;
    if (seen.has(source)) continue;
    seen.add(source);
    const generated = GENERATED.get(source);
    if (generated !== undefined) {
      files.set(generated, drawingsModule(SILHOUETTES, GENERATED_HEADER));
      continue;
    }
    const { text, imports } = compile(source);
    files.set(PUBLISHED.get(source) as string, text);
    pending.push(...imports);
  }

  const scripts = stampScripts(files);
  const html = readFileSync(join(PACKAGE, 'web', 'index.html'), 'utf8');
  const doctype = '<!doctype html>\n';
  if (!html.startsWith(doctype)) throw new Error('packages/keyreader/web/index.html has to start with its doctype');
  // The page's one script tag names the entry by its stamp, so a new page never runs an old script.
  const tag = '<script type="module" src="page.js">';
  if (html.split(tag).length !== 2) throw new Error(`packages/keyreader/web/index.html should hold ${tag} exactly once`);
  const entry = `<script type="module" src="${publishedName(scripts, 'page.js')}">`;
  scripts.set(
    'index.html',
    `${doctype}<!-- Generated by packages/keyreader/bin/build.ts from packages/keyreader/web/index.html. Do not edit: run make key-reader. -->\n${html.slice(doctype.length).replace(tag, entry)}`,
  );

  // Sorted, so that the map and a listing of the folder compare in one assertion.
  return new Map([...scripts].sort(([a], [b]) => a.localeCompare(b)));
}

/** The names in the folder that differ from the build, are missing, or should not be there. */
export function driftFrom(built: ReadonlyMap<string, string>, directory = OUT_DIR): string[] {
  const present = existsSync(directory) ? readdirSync(directory) : [];
  const drift: string[] = [];
  for (const [name, content] of built) {
    const path = join(directory, name);
    if (!existsSync(path)) drift.push(`${name} is missing`);
    else if (readFileSync(path, 'utf8') !== content) drift.push(`${name} differs from its source`);
  }
  for (const name of present) {
    if (!built.has(name)) drift.push(`${name} is not part of the page`);
  }
  return drift;
}

function main(): void {
  const cli = commandLine({
    usage: [
      'usage: node packages/keyreader/bin/build.ts           write the page (make key-reader)',
      '       node packages/keyreader/bin/build.ts --check   say whether the written page matches its sources',
    ].join('\n'),
    flags: ['check'],
  });
  const built = buildKeyReader();
  if (cli.flag('check')) {
    const drift = driftFrom(built);
    for (const line of drift) process.stderr.write(`reference/key-reader/${line}\n`);
    if (drift.length > 0) process.exit(1);
    process.stdout.write(`reference/key-reader/ matches its sources, ${built.size} files\n`);
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  // Only the build's own files live here, so anything else is a file a previous build wrote.
  for (const name of readdirSync(OUT_DIR)) {
    if (!built.has(name)) rmSync(join(OUT_DIR, name));
  }
  for (const [name, content] of built) writeFileSync(join(OUT_DIR, name), content);
  process.stdout.write(`wrote ${built.size} files to reference/key-reader/\n`);
}

if (import.meta.main) main();
