/**
 * The names an entry of a package exports, read off its source, for each package's allow list test,
 * `test/surface.test.ts`, `todo.md` 7.3.6.
 *
 * **Why the source and not the module.** A loaded module shows its values and nothing else: an interface or a
 * type is erased before anything runs, so a test of `Object.keys` would let a new public type through. The source
 * states both, and a main entry here is written as explicit names, so its export statements are the whole of
 * its surface. A test asks this for the list and the loaded module for its values, and holds the two equal, so
 * a reading of the source that missed something fails there.
 *
 * Read with the TypeScript compiler's own parser, the root's pinned `typescript`, which tells a type only export
 * from a value; with `verbatimModuleSyntax` on, a type re-exported without `type` does not compile, so the
 * syntax says which a name is. Not a test file itself, so the runner does not pick it up.
 */
import { readFileSync } from 'node:fs';
import ts from 'typescript';

/** What an entry's export statements name. */
export interface EntryNames {
  /** The names that exist at run time: functions, classes, constants and namespaces. */
  readonly values: string[];
  /** The names of types and interfaces, which a loaded module does not show. */
  readonly types: string[];
  /** The specifier of every `export *` without a name, each of which exports whatever its module does. */
  readonly starExports: string[];
}

const hasExport = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** The names an entry's source exports, each list sorted. */
export function entryNames(file: string | URL): EntryNames {
  const path = typeof file === 'string' ? file : file.pathname;
  const source = ts.createSourceFile(path, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const values: string[] = [];
  const types: string[] = [];
  const starExports: string[] = [];
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const from = statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text : '';
      if (statement.exportClause === undefined) starExports.push(from);
      else if (ts.isNamespaceExport(statement.exportClause)) values.push(statement.exportClause.name.text);
      else {
        for (const element of statement.exportClause.elements) {
          (statement.isTypeOnly || element.isTypeOnly ? types : values).push(element.name.text);
        }
      }
    } else if (hasExport(statement)) {
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) types.push(statement.name.text);
      else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) values.push(declaration.name.text);
        }
      } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name !== undefined) {
        values.push(statement.name.text);
      }
    }
  }
  return { values: values.sort(), types: types.sort(), starExports: starExports.sort() };
}
