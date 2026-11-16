/**
 * The FHSDK's API reference on the website, `reference/sdk/`, generated from the packages' own sources.
 *
 * ```
 * node packages/lab/bin/api-reference.ts            check every generated page and block against the sources
 * node packages/lab/bin/api-reference.ts --check    the same, said out loud
 * node packages/lab/bin/api-reference.ts --write    rewrite them from the sources
 * ```
 *
 * **Why generated.** The reference is for somebody who builds an application on the released packages without this
 * checkout, so it is the one place their whole outside is written down, and a copy of a signature or a comment that
 * nobody regenerates is wrong the first time the source moves. So the text is the source's: every exported name an
 * application reaches, its exact signature or shape as the source writes it, and its doc comment as written there.
 * `test/api-reference.test.ts` fails when a committed page differs from what the sources give, the pre-commit hook
 * runs the same check when a source or a page is in the commit, and the site's workflow regenerates the pages and
 * stops the deploy when they differ.
 *
 * **What it writes**, under `reference/sdk/`:
 *
 * * one page per public entry an application uses, `api/<page>.md`, listed in `PAGES` below: its names grouped the
 *   way the entry groups itself, by the comments that open each group in its source, the groups by title and the
 *   names of a group by name, `inReadingOrder`. A page
 *   keeps the introduction written by hand between its `introduction` markers and is generated around it;
 * * in every page of the section, each block between `<!-- example:PATH -->` and `<!-- /example -->`, filled with the
 *   file at PATH as a fenced block, so the guide's code is the code a test runs; and each block between
 *   `<!-- shape:SPECIFIER#NAME -->` and `<!-- /shape -->`, filled with that exported name's shape as its API page
 *   prints it, so a page describing a document shows the type it is and not a copy of it.
 *
 * **Every type an exported signature mentions is reachable**: a type documented on any page is linked under the item
 * that uses it, and one no documented entry exports by name is documented at the foot of the first page that uses it,
 * under "Types these names use", with the types it uses in turn.
 *
 * **A doc comment has a public part and may have a private one.** The pages print a comment up to a line that starts
 * with the TSDoc block tag `@privateRemarks`, and nothing after it: what follows is for whoever works in this
 * repository, the argument, the history and the pointers into its own documents, and stays in the source beside the
 * code it explains. A comment with a line `@hidden` leaves its name off the pages altogether, a member of a class or
 * an interface or an exported name, together with the types only it uses: the members a remote is written through,
 * which an application never calls directly. Neither tag changes what the compiler emits, since no tsconfig here
 * sets `stripInternal` and both tags are ordinary comment text to it; a hidden member is still on the class.
 *
 * **How it reads.** The TypeScript compiler of the workspace, through its API: one program over the entries, its
 * checker resolving each exported name to its declaration, whose source text is printed with the bodies left out, and
 * whose leading doc comment is the item's text. No type checking is asked for, only resolution, so a run takes a few
 * seconds. It reads the repository's own files and writes only under `reference/sdk/`; no lab, no network, no remote.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { commandLine } from '@freeharmony-sdk/lab/cli';

/** The repository's root, which every path below is relative to. */
export const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

/** The section's folder, relative to the root. */
export const SECTION = 'reference/sdk';

/** One page of the generated reference: an entry, or a namespace an entry exports, documented whole. */
export interface PageSpec {
  /** The page's file, relative to `reference/sdk/api/`. */
  readonly page: string;
  /** What an application imports, `@freeharmony-sdk/config`, or the namespace's path, `recipe` on that entry. */
  readonly title: string;
  /** The module whose names the page documents, relative to the root. */
  readonly module: string;
  /** For a namespace: the entry and the name it is exported under, so its members are named `recipe.create`. */
  readonly namespace?: { readonly entry: string; readonly name: string };
}

/**
 * The pages, in the order the website's menu lists them, which is alphabetical by package and then by entry, a
 * namespace of an entry directly after it; a name documented on two is documented on the first and linked from the
 * second. Only what an application builds on: each package's main entry, the config's Node entry, the
 * remote's read and write subpaths and the two namespaces of the config's main entry. Not `./internal`, `./build`,
 * `usb`'s other subpaths or `remote/file`, which serve this repository's scripts, tests and bench; each page's
 * introduction says in a line what those are for.
 */
export const PAGES: readonly PageSpec[] = [
  { page: 'base.md', title: '@freeharmony-sdk/base', module: 'packages/base/src/index.ts' },
  { page: 'base-models.md', title: '@freeharmony-sdk/base/models', module: 'packages/base/src/models.ts' },
  { page: 'config.md', title: '@freeharmony-sdk/config', module: 'packages/config/src/index.ts' },
  {
    page: 'config-harmony-touch.md', title: 'harmonyTouch', module: 'packages/config/src/families/harmony-touch/view.ts',
    namespace: { entry: '@freeharmony-sdk/config', name: 'harmonyTouch' },
  },
  {
    page: 'config-recipe.md', title: 'recipe', module: 'packages/config/src/recipe/toolkit.ts',
    namespace: { entry: '@freeharmony-sdk/config', name: 'recipe' },
  },
  { page: 'config-node.md', title: '@freeharmony-sdk/config/node', module: 'packages/config/src/node.ts' },
  { page: 'remote.md', title: '@freeharmony-sdk/remote', module: 'packages/remote/src/index.ts' },
  { page: 'remote-read.md', title: '@freeharmony-sdk/remote/read', module: 'packages/remote/src/read.ts' },
  { page: 'remote-write.md', title: '@freeharmony-sdk/remote/write', module: 'packages/remote/src/write.ts' },
  { page: 'silhouettes.md', title: '@freeharmony-sdk/silhouettes', module: 'packages/silhouettes/src/index.ts' },
  { page: 'usb.md', title: '@freeharmony-sdk/usb', module: 'packages/usb/src/index.ts' },
];

/** The entries a shape block may name, by the specifier an application imports, and the module each is. */
const ENTRY_MODULES: Readonly<Record<string, string>> = Object.fromEntries(
  PAGES.filter((one) => one.namespace === undefined).map((one) => [one.title, one.module]),
);

// ---------------------------------------------------------------------------------------------------
// Reading the sources
// ---------------------------------------------------------------------------------------------------

/** A group of names as the source opens it: a title, the sentence after it, and what it holds in order. */
interface Group {
  readonly title: string | undefined;
  readonly paragraphs: string[];
  readonly items: Item[];
}

/** One thing a page lists. */
type Item =
  | { readonly kind: 'name'; readonly name: string; readonly symbol: ts.Symbol }
  | { readonly kind: 'namespace'; readonly name: string; readonly module: string }
  | { readonly kind: 'whole'; readonly module: string }
  | { readonly kind: 'paragraph'; readonly text: string };

/** Where a name is documented: the page, relative to the section, and the anchor its heading gets. */
interface Location {
  readonly page: string;
  readonly anchor: string;
  /** The name as its heading shows it, `recipe.create` on a namespace's page. */
  readonly shown: string;
  /** The heading's text: the name in code, and which it is where a name differing only in case shares the page. */
  readonly heading: string;
  readonly package: string;
}

/** The compiler's options for reading: the workspace's own, with nothing emitted. */
function compilerOptions(): ts.CompilerOptions {
  const read = ts.readConfigFile(join(ROOT, 'tsconfig.base.json'), ts.sys.readFile);
  if (read.error !== undefined) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  const converted = ts.convertCompilerOptionsFromJson((read.config as { compilerOptions: unknown }).compilerOptions, ROOT);
  return {
    ...converted.options, noEmit: true, composite: false, declaration: false, declarationMap: false, sourceMap: false,
  };
}

/** The program over every page's module, made once per run. */
export interface Sources {
  readonly program: ts.Program;
  readonly checker: ts.TypeChecker;
}

export function readSources(): Sources {
  const program = ts.createProgram(PAGES.map((one) => join(ROOT, one.module)), compilerOptions());
  return { program, checker: program.getTypeChecker() };
}

const repoPath = (file: string): string => relative(ROOT, file).split('\\').join('/');

/** The package a source file belongs to, `config` for `packages/config/src/...`, or undefined outside the packages. */
function packageOf(file: string): string | undefined {
  return /^packages\/([^/]+)\//.exec(repoPath(file))?.[1];
}

/** The symbol a name finally stands for, through every import and re-export. */
function finalSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

/** The text of a run of `//` comments, its banner lines of dashes left out, or undefined where it is all banner. */
function lineCommentText(lines: readonly string[]): string | undefined {
  const words = lines.map((line) => line.replace(/^\/\/\s?/, '')).filter((line) => !/^-+\s*$/.test(line));
  const text = words.join(' ').replace(/\s+/g, ' ').trim();
  return text === '' ? undefined : text;
}

/**
 * The comments that open a statement: the runs of `//` lines before it, each run a block of its own where a blank line
 * stands between, and the doc comment directly above it, where there is one.
 */
function leadingComments(source: ts.SourceFile, node: ts.Node): { blocks: string[]; doc: string | undefined } {
  const text = source.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const blocks: string[] = [];
  let run: string[] = [];
  let doc: string | undefined;
  let previousEnd = -1;
  ranges.forEach((range, at) => {
    const comment = text.slice(range.pos, range.end);
    const gap = previousEnd < 0 ? '' : text.slice(previousEnd, range.pos);
    previousEnd = range.end;
    if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
      if (/\n\s*\n/.test(gap) && run.length > 0) {
        const block = lineCommentText(run);
        if (block !== undefined) blocks.push(block);
        run = [];
      }
      run.push(comment);
      return;
    }
    // A doc comment counts as the statement's only when it is the last comment and nothing but one line break stands
    // between it and the statement: a file's own header, above its first statement, is not that statement's.
    const last = at === ranges.length - 1;
    const after = text.slice(range.end, node.getStart(source));
    if (last && comment.startsWith('/**') && !/\n\s*\n/.test(after)) doc = docText(comment);
  });
  if (run.length > 0) {
    const block = lineCommentText(run);
    if (block !== undefined) blocks.push(block);
  }
  return { blocks, doc };
}

/** A doc comment's text: its delimiters and the star at the start of each line taken off, its own line breaks kept. */
function docText(comment: string): string {
  const inner = comment.replace(/^\/\*\*/, '').replace(/\*\/$/, '');
  const lines = inner.split('\n').map((line, at) => (at === 0 ? line.trim() : line.replace(/^\s*\* ?/, '').trimEnd()));
  while (lines.length > 0 && lines[0]!.trim() === '') lines.shift();
  while (lines.length > 0 && lines.at(-1)!.trim() === '') lines.pop();
  return lines.join('\n');
}

/** The tag that ends a doc comment's public part: everything from the line it opens is for this repository only. */
export const PRIVATE_REMARKS = '@privateRemarks';

/** The tag that leaves a name or a member off the pages. */
export const HIDDEN = '@hidden';

const PRIVATE_LINE = /^@privateRemarks\b/;
const HIDDEN_LINE = /^@hidden\s*$/;

/**
 * The part of a doc comment's text the pages print: the lines before the first that opens `@privateRemarks`, with a
 * `@hidden` line left out, or undefined when nothing is left.
 */
export function publicPart(doc: string): string | undefined {
  const lines = doc.split('\n');
  const end = lines.findIndex((line) => PRIVATE_LINE.test(line.trim()));
  const kept = (end < 0 ? lines : lines.slice(0, end)).filter((line) => !HIDDEN_LINE.test(line.trim()));
  while (kept.length > 0 && kept.at(-1)!.trim() === '') kept.pop();
  return kept.length === 0 ? undefined : kept.join('\n');
}

/** Whether a doc comment's text carries `@hidden` on a line of its own. */
const hiddenDoc = (doc: string | undefined): boolean =>
  doc !== undefined && doc.split('\n').some((line) => HIDDEN_LINE.test(line.trim()));

/** Whether a node's own doc comment hides it: a member, or a declaration whose statement carries the comment. */
function isHiddenNode(node: ts.Node): boolean {
  return hiddenDoc(leadingComments(node.getSourceFile(), node).doc);
}

/** Whether every declaration of a symbol stands under a doc comment that hides it. */
function isHiddenSymbol(symbol: ts.Symbol): boolean {
  const declarations = symbol.declarations ?? [];
  return declarations.length > 0 && declarations.some((one) => !ts.isSourceFile(one) && isHiddenNode(statementOf(one)));
}

/**
 * A group's title and the rest of its opening comment. **A comment opens a group when it starts with a short title and
 * a colon**, `Reading a configuration: the container out of its bytes...`; one that does not is a paragraph inside the
 * group already open. A title is at most 60 characters, plain words, and the whole comment when it is that short.
 */
function titleOf(block: string): { title: string; rest: string } | undefined {
  const plain = /^([A-Z][^:*`.]{1,59}):\s+(.*)$/s.exec(block);
  if (plain !== null) {
    const rest = plain[2]!.trim();
    return { title: plain[1]!.trim(), rest: rest.charAt(0).toUpperCase() + rest.slice(1) };
  }
  if (block.length <= 60 && !/[.:]\s/.test(block)) return { title: block.replace(/[.:]$/, ''), rest: '' };
  return undefined;
}

/** The module a module specifier of a statement resolves to, as a path relative to the root. */
function moduleOf(checker: ts.TypeChecker, specifier: ts.Expression): string {
  const symbol = checker.getSymbolAtLocation(specifier);
  const declaration = symbol?.valueDeclaration;
  if (declaration === undefined || !ts.isSourceFile(declaration)) throw new Error(`cannot resolve ${specifier.getText()}`);
  return repoPath(declaration.fileName);
}

const hasExportModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** A module's names in its own order, grouped by the comments that open each group. */
export function groupsOf(sources: Sources, module: string): Group[] {
  const { program, checker } = sources;
  const source = program.getSourceFile(join(ROOT, module));
  if (source === undefined) throw new Error(`${module} is not in the program`);
  const groups: Group[] = [{ title: undefined, paragraphs: [], items: [] }];
  const current = (): Group => groups.at(-1)!;
  const open = (blocks: readonly string[]): void => {
    for (const block of blocks) {
      const titled = titleOf(block);
      if (titled !== undefined) {
        groups.push({ title: titled.title, paragraphs: titled.rest === '' ? [] : [titled.rest], items: [] });
      } else if (current().items.length === 0) {
        current().paragraphs.push(block);
      } else {
        current().items.push({ kind: 'paragraph', text: block });
      }
    }
  };
  const named = (identifier: ts.Identifier | ts.StringLiteral): void => {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (symbol === undefined) throw new Error(`${module}: cannot resolve ${identifier.text}`);
    const target = finalSymbol(checker, symbol);
    if (!isHiddenSymbol(target)) current().items.push({ kind: 'name', name: identifier.text, symbol: target });
  };
  for (const statement of source.statements) {
    const exported = ts.isExportDeclaration(statement) || hasExportModifier(statement);
    if (!exported) continue;
    open(leadingComments(source, statement).blocks);
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      if (clause === undefined) {
        current().items.push({ kind: 'whole', module: moduleOf(checker, statement.moduleSpecifier!) });
      } else if (ts.isNamespaceExport(clause)) {
        current().items.push({ kind: 'namespace', name: clause.name.text, module: moduleOf(checker, statement.moduleSpecifier!) });
      } else {
        for (const element of clause.elements) {
          if (statement.moduleSpecifier === undefined) {
            // `export { X }` of a name the module imported or declared: the declaration it stands for.
            const local = checker.getExportSpecifierLocalTargetSymbol(element);
            if (local === undefined) throw new Error(`${module}: cannot resolve ${element.name.text}`);
            const target = finalSymbol(checker, local);
            if (!isHiddenSymbol(target)) current().items.push({ kind: 'name', name: element.name.text, symbol: target });
          } else {
            named(element.name);
          }
        }
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) named(declaration.name);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement)) && statement.name !== undefined
    ) {
      // An overloaded function is one name: its later declarations are the same symbol, listed once.
      const already = current().items.some((item) => item.kind === 'name' && item.name === statement.name!.text);
      if (!already) named(statement.name);
    }
  }
  return groups.filter((group) => group.items.length > 0 || group.paragraphs.length > 0);
}

// ---------------------------------------------------------------------------------------------------
// Printing a declaration
// ---------------------------------------------------------------------------------------------------

const FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType
  | ts.TypeFormatFlags.WriteArrowStyleSignature;

/**
 * A declaration's own text, from its first token to its end, its `export` taken off: each member whose comment hides
 * it left out, and each comment inside cut to its public part.
 */
function own(node: ts.Node): string {
  const source = node.getSourceFile();
  const start = node.getStart(source);
  const cuts: Array<{ from: number; to: number }> = [];
  const visit = (child: ts.Node): void => {
    if ((ts.isTypeElement(child) || ts.isClassElement(child)) && isHiddenNode(child)) {
      // From the end of what precedes it, so its comment and its line go with it.
      cuts.push({ from: Math.max(child.getFullStart(), start), to: child.end });
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  let text = source.text.slice(start, node.end);
  for (const cut of cuts.sort((a, b) => b.from - a.from)) text = text.slice(0, cut.from - start) + text.slice(cut.to - start);
  return shownCode(text).replace(/^export\s+(declare\s+)?/, '');
}

/**
 * Source text as a page shows it in a fenced block: its line comments left out, since they speak to whoever edits the
 * code, and each doc comment cut to its public part, or left out where it has none. A line that held only a comment
 * goes with it.
 */
function shownCode(code: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, code);
  let kept = '';
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia) continue;
    kept += scanner.getTokenText();
  }
  // The scanner keeps every line break, so the lines still stand where the source's did: one that is empty now and was
  // not held a comment alone, and goes.
  const source = code.split('\n');
  const text = kept.split('\n').map((line) => line.trimEnd())
    .filter((line, at) => line.trim() !== '' || source[at]!.trim() === '').join('\n');
  return text.replace(/^([ \t]*)\/\*\*[\s\S]*?\*\/[ \t]*\n?/gm, (comment: string, indent: string) => {
    const shown = publicPart(docText(comment.trim()));
    if (shown === undefined) return '';
    const lines = shown.split('\n');
    const body = lines.length === 1 ? `/** ${lines[0]} */`
      : `/**\n${lines.map((line) => (line === '' ? `${indent} *` : `${indent} * ${line}`)).join('\n')}\n${indent} */`;
    return `${indent}${body}${comment.endsWith('\n') ? '\n' : ''}`;
  });
}

/** The statement a declaration's doc comment sits on: a variable's is its statement's. */
function statementOf(declaration: ts.Declaration): ts.Node {
  return ts.isVariableDeclaration(declaration) ? declaration.parent.parent : declaration;
}

/** A body's lines indented by two, for a class member printed inside its class. */
const indent = (text: string, by = '  '): string => text.split('\n').map((line) => (line === '' ? line : by + line)).join('\n');

/** A member's doc comment as a comment again, its public part only, for the shape printed in a fenced block. */
function memberDoc(source: ts.SourceFile, member: ts.Node): string {
  const found = leadingComments(source, member).doc;
  const doc = found === undefined ? undefined : publicPart(found);
  if (doc === undefined) return '';
  const lines = doc.split('\n');
  return lines.length === 1 ? `/** ${lines[0]} */\n` : `/**\n${lines.map((line) => (line === '' ? ' *' : ` * ${line}`)).join('\n')}\n */\n`;
}

/** Whether a class member is outside the class's shape on the pages: private, protected, or hidden by its comment. */
function isHidden(member: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) ?? [] : [];
  if (modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword)) return true;
  if (member.name !== undefined && ts.isPrivateIdentifier(member.name)) return true;
  return isHiddenNode(member);
}

/** A function's or a method's head: everything up to its body, with the return type the checker infers if none is written. */
function head(checker: ts.TypeChecker, node: ts.SignatureDeclaration & { body?: ts.Node | undefined }, prefix = ''): string {
  const source = node.getSourceFile();
  const end = node.body !== undefined ? node.body.getStart(source) : node.end;
  let text = shownCode(source.text.slice(node.getStart(source), end).trim()).replace(/^export\s+/, '').replace(/;$/, '');
  if (node.type === undefined && !ts.isConstructorDeclaration(node) && !ts.isSetAccessorDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node);
    if (signature !== undefined) {
      text += `: ${checker.typeToString(checker.getReturnTypeOfSignature(signature), node, FLAGS)}`;
    }
  }
  return prefix + text;
}

/** A class's public shape: its heading, then each public member as a declaration with its doc comment. */
function classShape(checker: ts.TypeChecker, node: ts.ClassDeclaration): string {
  const source = node.getSourceFile();
  const heritage = (node.heritageClauses ?? []).map((clause) => clause.getText()).join(' ');
  const typeParameters = node.typeParameters === undefined ? '' : `<${node.typeParameters.map((p) => p.getText()).join(', ')}>`;
  const lines: string[] = [];
  for (const member of node.members) {
    if (isHidden(member) || ts.isClassStaticBlockDeclaration(member) || ts.isSemicolonClassElement(member)) continue;
    let text: string;
    if (ts.isPropertyDeclaration(member)) {
      const modifiers = (ts.getModifiers(member) ?? []).map((m) => m.getText()).filter((m) => m !== 'public').join(' ');
      const type = member.type !== undefined ? member.type.getText()
        : checker.typeToString(checker.getTypeAtLocation(member), member, FLAGS);
      text = `${modifiers === '' ? '' : `${modifiers} `}${member.name.getText()}${member.questionToken ? '?' : ''}: ${type};`;
    } else if (
      ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member)
      || ts.isSetAccessorDeclaration(member)
    ) {
      text = `${head(checker, member).replace(/^public\s+/, '')};`;
    } else {
      continue;
    }
    lines.push(indent(memberDoc(source, member) + text));
  }
  const top = `class ${node.name?.text ?? ''}${typeParameters}${heritage === '' ? '' : ` ${heritage}`}`;
  return lines.length === 0 ? `${top} {}` : `${top} {\n${lines.join('\n')}\n}`;
}

/** The longest initializer printed as written: longer data is shown by its type. */
const MAX_INITIALIZER_LINES = 60;

/** A constant's shape: its written type, a function's signature, or short data as written. */
function constantShape(checker: ts.TypeChecker, node: ts.VariableDeclaration): string {
  const keyword = (node.parent.flags & ts.NodeFlags.Const) !== 0 ? 'const' : 'let';
  const name = node.name.getText();
  if (node.type !== undefined) return `${keyword} ${name}: ${node.type.getText()}`;
  const initializer = node.initializer;
  // A list of the units a write may reach, `CONFIG_WRITE_UNITS` and its kind, names this project's own remotes, which
  // the reference names none of: it is shown by the type it satisfies, or the checker's, never by its value.
  if (name.endsWith('_UNITS')) {
    if (initializer !== undefined && ts.isSatisfiesExpression(initializer)) return `${keyword} ${name}: ${initializer.type.getText()}`;
    return `${keyword} ${name}: ${checker.typeToString(checker.getTypeAtLocation(node.name), node, FLAGS)}`;
  }
  const typed = (): string => `${keyword} ${name}: ${checker.typeToString(checker.getTypeAtLocation(node.name), node, FLAGS)}`;
  if (initializer === undefined || ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return typed();
  const text = shownCode(initializer.getText());
  if (text.split('\n').length > MAX_INITIALIZER_LINES) return typed();
  return `${keyword} ${name} = ${text}`;
}

/** Every declaration of a symbol printed as its shape, one after the other. */
function shapeOf(checker: ts.TypeChecker, symbol: ts.Symbol): string {
  const out: string[] = [];
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration)) {
      // Overloads are each printed; the implementation of an overloaded function is not part of its shape.
      const overloaded = (symbol.declarations ?? []).filter(ts.isFunctionDeclaration).length > 1;
      if (overloaded && declaration.body !== undefined) continue;
      out.push(head(checker, declaration));
    } else if (ts.isClassDeclaration(declaration)) {
      out.push(classShape(checker, declaration));
    } else if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
      out.push(own(declaration));
    } else if (ts.isVariableDeclaration(declaration)) {
      out.push(constantShape(checker, declaration));
    } else if (ts.isSourceFile(declaration) || ts.isModuleDeclaration(declaration)) {
      continue;
    } else {
      out.push(own(declaration));
    }
  }
  return out.join('\n\n');
}

/** A symbol's doc comment, its public part, from the first of its declarations that carries one. */
export function docOf(symbol: ts.Symbol): string | undefined {
  for (const declaration of symbol.declarations ?? []) {
    const statement = statementOf(declaration);
    const { doc } = leadingComments(declaration.getSourceFile(), statement);
    if (doc !== undefined) return publicPart(doc);
  }
  return undefined;
}

/** Whether a declaration is the workspace's own, rather than the language's or a dependency's. */
function isOurs(declaration: ts.Declaration): boolean {
  const file = repoPath(declaration.getSourceFile().fileName);
  return file.startsWith('packages/') && !file.includes('/node_modules/');
}

/** The workspace's own symbols a symbol's declarations mention in a type, each once, in the order met. */
function mentioned(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol[] {
  const found: ts.Symbol[] = [];
  const add = (identifier: ts.Node): void => {
    const at = checker.getSymbolAtLocation(identifier);
    if (at === undefined) return;
    const target = finalSymbol(checker, at);
    if (target === symbol || target.flags & ts.SymbolFlags.TypeParameter) return;
    const declaration = target.declarations?.[0];
    if (declaration === undefined || !isOurs(declaration) || ts.isSourceFile(declaration)) return;
    if (!found.includes(target)) found.push(target);
  };
  const visit = (node: ts.Node): void => {
    // A member left off the pages takes the types only it uses with it.
    if ((ts.isTypeElement(node) || ts.isClassElement(node)) && isHiddenNode(node)) return;
    if (ts.isTypeReferenceNode(node)) add(ts.isQualifiedName(node.typeName) ? node.typeName.right : node.typeName);
    else if (ts.isExpressionWithTypeArguments(node)) add(node.expression);
    else if (ts.isTypeQueryNode(node)) add(ts.isQualifiedName(node.exprName) ? node.exprName.right : node.exprName);
    ts.forEachChild(node, visit);
  };
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration)) {
      if (declaration.type !== undefined) visit(declaration.type);
      else if (declaration.initializer !== undefined
        && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
        visit(declaration.initializer);
      }
    } else if (ts.isClassDeclaration(declaration)) {
      for (const clause of declaration.heritageClauses ?? []) visit(clause);
      for (const member of declaration.members) {
        if (isHidden(member)) continue;
        if (ts.isPropertyDeclaration(member) && member.type !== undefined) visit(member.type);
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
          for (const parameter of member.parameters) if (parameter.type !== undefined) visit(parameter.type);
          if (member.type !== undefined) visit(member.type);
        }
      }
    } else if (ts.isFunctionDeclaration(declaration)) {
      for (const parameter of declaration.parameters) if (parameter.type !== undefined) visit(parameter.type);
      if (declaration.type !== undefined) visit(declaration.type);
      for (const parameter of declaration.typeParameters ?? []) visit(parameter);
    } else if (!ts.isSourceFile(declaration)) {
      visit(declaration);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------------
// The text of a doc comment on the website
// ---------------------------------------------------------------------------------------------------

/** GitHub's and the website's anchor for a heading that is a name in code, which the two agree on. */
export function anchorOf(text: string): string {
  return text.toLowerCase().replace(/[^\w\- ]/g, '').replace(/ /g, '-');
}

/** What a page's prose may link: every documented name, by the name an item's text writes it as. */
interface Linker {
  readonly byName: ReadonlyMap<string, readonly Location[]>;
}

/** The link from one page of the section to a file of the repository, relative, which the site's hook places. */
function linkFromPage(page: string, target: string): string {
  return posix.relative(posix.dirname(`${SECTION}/${page}`), target);
}

/**
 * The files of the repository a page may link to: those git tracks and those it would add, never one it ignores. A
 * path is linked only when it is one of them, because the site's workflow checks the pages in a fresh checkout, and
 * a file that exists only on this machine would be linked here and not there, so the check would fail on the
 * difference. Read once, lazily; without git, every file on the disk.
 */
let repositoryFiles: ReadonlySet<string> | undefined | null = null;

/** The files a page of the section never links, `fileNamed` says why. */
const UNLINKED = /^(?:docs\/test-notes\/|docs\/lab-register\.md$|CLAUDE\.md$|docs\/findings\.md$|docs\/plans\/)|(?:^|\/)tests?\//;
function inTheRepository(path: string): boolean {
  if (repositoryFiles === null) {
    try {
      const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
      repositoryFiles = new Set(listed.split('\n').filter((line) => line.length > 0));
    } catch {
      repositoryFiles = undefined;
    }
  }
  return repositoryFiles === undefined ? existsSync(join(ROOT, path)) : repositoryFiles.has(path);
}

/**
 * The repository file a path written in a comment names, looked for beside the comment's own file and then up through
 * its package to the root; undefined where none exists or where the section may not link: the test notes, the register
 * of the private folder, this repository's working brief, the findings archive, its plans, and any test. A public part
 * names none of these, and the section's guard counts such a link; this keeps one out even where a name slips through.
 */
function fileNamed(path: string, from: string): string | undefined {
  if (!/^[\w./-]+\.(?:ts|md|json|py|txt)$/.test(path) || path.startsWith('../')) return undefined;
  const places: string[] = [];
  for (let at = dirname(join(ROOT, from)); at.startsWith(ROOT); at = dirname(at)) {
    places.push(at);
    if (at === ROOT) break;
  }
  for (const place of places) {
    const candidate = repoPath(join(place, path));
    if (candidate.startsWith('..')) continue;
    if (UNLINKED.test(candidate)) return undefined;
    if (inTheRepository(candidate)) return candidate;
  }
  return undefined;
}

/**
 * A doc comment as Markdown on a page of the section: code kept as it is, an angle bracket in prose escaped so it is
 * not taken for HTML, a name in code that is documented linked to where it is, and a file of this repository named in
 * code linked to it.
 */
function prose(text: string, page: string, from: string, linker: Linker, pkg: string): string {
  const out: string[] = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      out.push(line);
      continue;
    }
    if (fenced) {
      out.push(line);
      continue;
    }
    let result = '';
    let rest = line;
    const span = /(`+)(.+?)\1/;
    for (let match = span.exec(rest); match !== null; match = span.exec(rest)) {
      result += rest.slice(0, match.index).replace(/</g, '&lt;');
      result += codeLink(match[0], match[2]!, page, from, linker, pkg);
      rest = rest.slice(match.index + match[0].length);
    }
    out.push(result + rest.replace(/</g, '&lt;'));
  }
  return out.join('\n');
}

/** A span of code in prose, linked where it names something documented or a file of the repository. */
function codeLink(span: string, inner: string, page: string, from: string, linker: Linker, pkg: string): string {
  const name = /^([A-Za-z_$][\w$]*)(?:\.[\w$.]+)?(?:\(\))?$/.exec(inner);
  if (name !== null) {
    const located = pick(linker.byName.get(name[1]!), name[1]!, page, pkg);
    if (located !== undefined) {
      const target = located.page === page ? `#${located.anchor}` : `${posix.relative(posix.dirname(page), located.page)}#${located.anchor}`;
      return `[${span}](${target})`;
    }
  }
  const file = fileNamed(inner, from);
  if (file !== undefined) {
    // A page of the reference is linked as a page of the site; anything else of the repository is placed by the hook.
    return `[${span}](${linkFromPage(page, file)})`;
  }
  return span;
}

/**
 * Of the places a name is documented, the one on this page, else in this package, else the only one. A namespace's
 * member is found by its short name only on its own page, `create` meaning `recipe.create` there and nothing elsewhere.
 */
function pick(found: readonly Location[] | undefined, name: string, page: string, pkg: string): Location | undefined {
  const places = (found ?? []).filter((one) => one.page === page || one.shown === name);
  if (places.length === 0) return undefined;
  return places.find((one) => one.page === page) ?? (places.length === 1 ? places[0] : places.find((one) => one.package === pkg));
}

// ---------------------------------------------------------------------------------------------------
// The pages
// ---------------------------------------------------------------------------------------------------

/** The markers a page's own introduction stands between, kept as written. */
export const INTRODUCTION_OPEN = '<!-- introduction -->';
export const INTRODUCTION_CLOSE = '<!-- /introduction -->';

/** What every generated page says about itself, where an editor sees it before changing anything. */
const GENERATED_NOTE = '<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, '
  + 'apart from the introduction above. -->';

/** Everything a run knows: the pages' groups, and where each documented symbol is. */
interface Model {
  readonly sources: Sources;
  readonly groups: ReadonlyMap<string, Group[]>;
  readonly located: Map<ts.Symbol, Location>;
  /** Per package, the types no documented entry exports by name and the documented names use, in the order met. */
  readonly used: Map<string, ts.Symbol[]>;
  readonly linker: Linker;
}

/** The packages in the order their pages come, which is the order of their pages of types. */
const PACKAGES = [...new Set(PAGES.map((one) => packageOf(join(ROOT, one.module))!))];

/**
 * The page of a package's types that no documented entry exports by name: what an application meets inside what it is
 * given and never has to name. Kept apart from the entries' pages so those read as the entry, and so that following
 * every type through to its end, which reaches far into a package, does not bury them.
 */
export const typesPage = (pkg: string): string => `${pkg}-types.md`;

/** A types page as a page, for what prints one. */
const typesSpec = (pkg: string): PageSpec => ({ page: typesPage(pkg), title: `@freeharmony-sdk/${pkg}`, module: '' });

/** The name a symbol is shown under on a page: a namespace's members carry the namespace. */
const shownName = (spec: PageSpec, name: string): string => (spec.namespace === undefined ? name : `${spec.namespace.name}.${name}`);

/** Where every name of every page is documented, and the types each page adds at its foot. */
export function modelOf(sources: Sources): Model {
  const groups = new Map<string, Group[]>();
  const located = new Map<ts.Symbol, Location>();
  const used = new Map<string, ts.Symbol[]>();
  const anchors = new Map<string, Set<string>>();
  const place = (spec: PageSpec, name: string, symbol: ts.Symbol, shown = shownName(spec, name)): void => {
    if (located.has(symbol)) return;
    const taken = anchors.get(spec.page) ?? new Set<string>();
    // An anchor is the heading in lower case, so a function and a type that differ only in case, `configLanguage` and
    // `ConfigLanguage`, would share one: the second heading says which it is.
    let heading = `\`${shown}\``;
    if (taken.has(anchorOf(heading))) heading += symbol.flags & ts.SymbolFlags.Value ? ' (value)' : ' (type)';
    const anchor = anchorOf(heading);
    if (taken.has(anchor)) throw new Error(`${spec.page}: two names would have the anchor #${anchor}`);
    taken.add(anchor);
    anchors.set(spec.page, taken);
    const pkg = packageOf(join(ROOT, spec.module)) ?? spec.page.replace(/-types\.md$/, '');
    located.set(symbol, { page: `api/${spec.page}`, anchor, shown, heading, package: pkg });
  };
  for (const spec of PAGES) {
    const page = groupsOf(sources, spec.module);
    groups.set(spec.page, page);
    for (const group of page) for (const item of group.items) if (item.kind === 'name') place(spec, item.name, item.symbol);
  }
  // The types the names use and no entry exports by name, each documented on its own package's page of types, with
  // the types it uses in turn, followed to the end, so every type a documented shape names is on some page.
  const queue: ts.Symbol[] = [...located.keys()];
  while (queue.length > 0) {
    for (const symbol of mentioned(sources.checker, queue.shift()!)) {
      if (located.has(symbol)) continue;
      const pkg = packageOf(symbol.declarations![0]!.getSourceFile().fileName)!;
      if (!PACKAGES.includes(pkg)) throw new Error(`${symbol.name} is declared in ${pkg}, which no page documents`);
      place(typesSpec(pkg), symbol.name, symbol, symbol.name);
      used.set(pkg, [...(used.get(pkg) ?? []), symbol]);
      queue.push(symbol);
    }
  }
  const byName = new Map<string, Location[]>();
  for (const [symbol, location] of located) {
    const names = new Set([symbol.name, location.shown]);
    for (const name of names) byName.set(name, [...(byName.get(name) ?? []), location]);
  }
  return { sources, groups, located, used, linker: { byName } };
}

/** One documented name: its heading, its shape, its doc comment and the documented types it uses. */
function itemText(model: Model, spec: PageSpec, symbol: ts.Symbol): string {
  const { checker } = model.sources;
  const page = `api/${spec.page}`;
  const declaration = symbol.declarations?.[0];
  const from = declaration === undefined ? spec.module : repoPath(declaration.getSourceFile().fileName);
  const pkg = packageOf(from) ?? '';
  const parts = [`### ${model.located.get(symbol)!.heading}`, '', '```ts', shapeOf(checker, symbol), '```'];
  const doc = docOf(symbol);
  if (doc !== undefined) parts.push('', prose(doc, page, from, model.linker, pkg));
  const uses = mentioned(checker, symbol).flatMap((one) => {
    const location = model.located.get(one);
    if (location === undefined) return [];
    const target = location.page === page ? `#${location.anchor}` : `${posix.relative(posix.dirname(page), location.page)}#${location.anchor}`;
    return [`[\`${location.shown}\`](${target})`];
  });
  if (uses.length > 0) parts.push('', `Uses ${uses.join(', ')}.`);
  return parts.join('\n');
}

/** Two names as a reader looks one up: by letter whatever the case, a capital before its small letter on a tie. */
const alphabetical = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);

/**
 * **A page's groups as a reader finds things in them: alphabetical.** The groups by their titles, the one without a
 * title first, since it opens the page. Inside a group what explains it comes first, in the source's order, its
 * paragraphs, a whole entry it passes on and its namespaces, and then every name by name, so a name is found by its
 * letter and never by knowing where the source put it.
 */
function inReadingOrder(spec: PageSpec, groups: readonly Group[]): Group[] {
  const kindOrder = (item: Item): number => (item.kind === 'paragraph' ? 0 : item.kind === 'whole' ? 1 : item.kind === 'namespace' ? 2 : 3);
  return groups
    .map((group, at) => ({ group, at }))
    .sort((a, b) => (a.group.title === undefined ? -1 : b.group.title === undefined ? 1 : alphabetical(a.group.title, b.group.title)) || a.at - b.at)
    .map(({ group }) => ({
      ...group,
      items: group.items
        .map((item, at) => ({ item, at }))
        .sort((a, b) => kindOrder(a.item) - kindOrder(b.item)
          || (a.item.kind === 'name' && b.item.kind === 'name' ? alphabetical(shownName(spec, a.item.name), shownName(spec, b.item.name))
            : a.item.kind === 'namespace' && b.item.kind === 'namespace' ? alphabetical(a.item.name, b.item.name) : 0)
          || a.at - b.at)
        .map(({ item }) => item),
    }));
}

/** The heading of a page, its introduction kept, and its groups generated. */
export function pageText(model: Model, spec: PageSpec, existing: string | undefined): string {
  const page = `api/${spec.page}`;
  const introduction = existing === undefined ? '' : introductionOf(existing, page);
  const heading = spec.namespace === undefined ? `# \`${spec.title}\`` : `# \`${spec.title}\` on \`${spec.namespace.entry}\``;
  const out: string[] = [heading, '', INTRODUCTION_OPEN, introduction, INTRODUCTION_CLOSE, '', GENERATED_NOTE];
  for (const group of inReadingOrder(spec, model.groups.get(spec.page)!)) {
    out.push('');
    if (group.title !== undefined) out.push(`## ${group.title}`, '');
    // Names documented on an earlier page are listed together, one line each, linking there.
    let elsewhere: string[] = [];
    const flush = (): void => {
      if (elsewhere.length > 0) out.push(elsewhere.join('\n'), '');
      elsewhere = [];
    };
    for (const paragraph of group.paragraphs) out.push(prose(paragraph, page, spec.module, model.linker, packageOf(spec.module) ?? ''), '');
    for (const item of group.items) {
      // Anything but a name documented elsewhere ends the list of such names.
      const elsewhereName = item.kind === 'name' && (() => {
        const located = model.located.get(item.symbol)!;
        return located.page !== page || located.shown !== shownName(spec, item.name);
      })();
      if (!elsewhereName) flush();
      if (item.kind === 'paragraph') {
        out.push(prose(item.text, page, spec.module, model.linker, packageOf(spec.module) ?? ''), '');
      } else if (item.kind === 'whole') {
        const documented = PAGES.find((one) => one.module === item.module && one.namespace === undefined);
        if (documented === undefined) throw new Error(`${spec.page}: everything of ${item.module} is exported, which no page documents`);
        out.push(`Everything on [\`${documented.title}\`](${posix.relative(posix.dirname(page), `api/${documented.page}`)}).`, '');
      } else if (item.kind === 'namespace') {
        const documented = PAGES.find((one) => one.module === item.module && one.namespace?.name === item.name);
        if (documented === undefined) throw new Error(`${spec.page}: the namespace ${item.name} has no page`);
        out.push(`### \`${item.name}\``, '', `A namespace: every name of [\`${item.name}\`](${posix.relative(posix.dirname(page), `api/${documented.page}`)}), `
          + `as \`${item.name}.<name>\`.`, '');
      } else {
        const location = model.located.get(item.symbol)!;
        if (location.page === page && location.shown === shownName(spec, item.name)) {
          out.push(itemText(model, spec, item.symbol), '');
        } else {
          const target = `${posix.relative(posix.dirname(page), location.page)}#${location.anchor}`;
          const where = PAGES.find((one) => `api/${one.page}` === location.page)?.title ?? location.page;
          const same = location.shown === shownName(spec, item.name) ? '' : `, as \`${location.shown}\``;
          elsewhere.push(`* \`${shownName(spec, item.name)}\`: documented on [\`${where}\`](${target})${same}.`);
        }
      }
    }
    flush();
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** A package's page of types: its introduction kept, and every type it holds, by name. */
export function typesPageText(model: Model, pkg: string, existing: string | undefined): string {
  const spec = typesSpec(pkg);
  const page = `api/${spec.page}`;
  const introduction = existing === undefined ? '' : introductionOf(existing, page);
  const out: string[] = [`# More types of \`${spec.title}\``, '', INTRODUCTION_OPEN, introduction, INTRODUCTION_CLOSE, '', GENERATED_NOTE, ''];
  const types = [...(model.used.get(pkg) ?? [])].sort((a, b) => alphabetical(a.getName(), b.getName()));
  for (const symbol of types) out.push(itemText(model, spec, symbol), '');
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** The packages that have a page of types, in the order of their pages. */
export const typesPackages = (model: Model): string[] => PACKAGES.filter((pkg) => (model.used.get(pkg) ?? []).length > 0);

/** The introduction a page keeps, between its markers. */
export function introductionOf(text: string, where: string): string {
  const start = text.indexOf(INTRODUCTION_OPEN);
  const end = text.indexOf(INTRODUCTION_CLOSE);
  if (start < 0 || end < start) throw new Error(`${where} has no ${INTRODUCTION_OPEN} ... ${INTRODUCTION_CLOSE} pair`);
  return text.slice(start + INTRODUCTION_OPEN.length, end).trim();
}

// ---------------------------------------------------------------------------------------------------
// The blocks inside a page written by hand
// ---------------------------------------------------------------------------------------------------

const EXAMPLE = /<!-- example:([^ ]+) -->\n[\s\S]*?<!-- \/example -->/g;
const SHAPE = /<!-- shape:([^ #]+)#([\w$.]+) -->\n[\s\S]*?<!-- \/shape -->/g;

/** An example file as the fenced block a page shows. */
export function exampleBlock(path: string): string {
  const file = join(ROOT, path);
  if (!existsSync(file)) throw new Error(`the example ${path} does not exist`);
  return `<!-- example:${path} -->\n\`\`\`ts\n${readFileSync(file, 'utf8').trimEnd()}\n\`\`\`\n<!-- /example -->`;
}

/**
 * An exported name's shape as the fenced block a page shows, with a link to where it is documented. The name is an
 * entry's own, `Recipe`, or a namespace's member by the namespace, `recipe.Problem`.
 */
function shapeBlock(model: Model, page: string, specifier: string, name: string): string {
  if (ENTRY_MODULES[specifier] === undefined) throw new Error(`${page}: ${specifier} is not an entry the reference documents`);
  const [first, member] = name.split('.');
  const spec = member === undefined
    ? PAGES.find((one) => one.title === specifier && one.namespace === undefined)
    : PAGES.find((one) => one.namespace?.entry === specifier && one.namespace.name === first);
  const wanted = member ?? first!;
  const item = spec === undefined ? undefined : model.groups.get(spec.page)!
    .flatMap((group) => group.items).find((one) => one.kind === 'name' && one.name === wanted);
  if (item === undefined || item.kind !== 'name') throw new Error(`${page}: ${specifier} exports no ${name}`);
  const location = model.located.get(item.symbol)!;
  const link = `[\`${location.shown}\`](${posix.relative(posix.dirname(page), location.page)}#${location.anchor})`;
  return `<!-- shape:${specifier}#${name} -->\n\`\`\`ts\n${shapeOf(model.sources.checker, item.symbol)}\n\`\`\`\n\n`
    + `From ${link}.\n<!-- /shape -->`;
}

/** A page written by hand with its generated blocks filled. */
export function filledText(model: Model, page: string, text: string): string {
  return text
    .replace(EXAMPLE, (_, path: string) => exampleBlock(path))
    .replace(SHAPE, (_, specifier: string, name: string) => shapeBlock(model, page, specifier, name));
}

/** Every Markdown file of the section that is not a generated API page, relative to the section. */
function handWritten(): string[] {
  const out: string[] = [];
  const generated = new Set([...PAGES.map((one) => `api/${one.page}`), ...PACKAGES.map((pkg) => `api/${typesPage(pkg)}`)]);
  const walk = (folder: string): void => {
    const at = join(ROOT, SECTION, folder);
    if (!existsSync(at)) return;
    for (const name of readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = folder === '' ? name.name : `${folder}/${name.name}`;
      if (name.isDirectory()) walk(path);
      else if (name.name.endsWith('.md') && !generated.has(path)) out.push(path);
    }
  };
  walk('');
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Checking and writing
// ---------------------------------------------------------------------------------------------------

const readIfThere = (path: string): string | undefined =>
  (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : undefined);

/** Every generated file by its path from the root, as the sources make it from what is committed now. */
export function generatedFiles(sources: Sources = readSources()): Map<string, string> {
  const model = modelOf(sources);
  const files = new Map<string, string>();
  for (const spec of PAGES) {
    const path = `${SECTION}/api/${spec.page}`;
    files.set(path, filledText(model, `api/${spec.page}`, pageText(model, spec, readIfThere(path))));
  }
  for (const pkg of typesPackages(model)) {
    const path = `${SECTION}/api/${typesPage(pkg)}`;
    files.set(path, typesPageText(model, pkg, readIfThere(path)));
  }
  for (const page of handWritten()) {
    const path = `${SECTION}/${page}`;
    files.set(path, filledText(model, page, readIfThere(path)!));
  }
  return files;
}

/** Check every generated file against the sources, or rewrite them; the problems found, empty when all agree. */
export function run(write: boolean): string[] {
  let files: Map<string, string>;
  try {
    files = generatedFiles();
  } catch (error) {
    return [(error as Error).message];
  }
  const problems: string[] = [];
  for (const [path, expected] of files) {
    if (readIfThere(path) === expected) continue;
    if (write) writeFileSync(join(ROOT, path), expected);
    else problems.push(`${path} differs from what the sources generate: run make api-reference-write`);
  }
  return problems;
}

function main(): void {
  const cli = commandLine({
    usage: [
      'usage: node packages/lab/bin/api-reference.ts [--check | --write]',
      '',
      'The FHSDK\'s API reference on the website, reference/sdk/, generated from the packages\' sources.',
      '',
      '  --check   compare every generated page and block with what the sources give, and fail naming each that',
      '            differs (the default)',
      '  --write   rewrite them from the sources',
    ].join('\n'),
    flags: ['check', 'write'],
  });
  const write = cli.flag('write');
  const problems = run(write);
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log(write ? 'the API reference written' : 'the API reference agrees with the sources');
}

if (import.meta.main) main();
