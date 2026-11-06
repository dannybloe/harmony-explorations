/**
 * What the tests of the key reader load: the page **as published**, and the same page with one guard taken
 * out, for the controls.
 *
 * The tests import the JavaScript in `reference/key-reader/` rather than the TypeScript in `src/`, because
 * that is what a stranger's browser runs, and `build.test.ts` holds those files equal to what the build
 * makes of the sources. Node runs them as they are: they are ES modules that import only each other.
 *
 * **A control is the published page with one refusal disarmed.** Every refusal in `link.ts` is a call of
 * `refuse` whose first argument is its name, and the build keeps that text, so replacing
 * `refuse('length',` with `void ('length',` turns exactly that refusal into an expression that does
 * nothing, and leaves every other one in place. A test that still passes with its refusal disarmed was not
 * testing that refusal, which is what each control is there to show cannot happen.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_DIR, buildKeyReader, publishedName } from '../bin/build.ts';
import type * as LinkModule from '../src/link.ts';

/** The link module's surface, typed from the source the published file was built from. */
export type Link = typeof LinkModule;

/**
 * Where a published script is, by its base name: every script is published under a name carrying its
 * content's stamp, `bin/build.ts`, so a test names `link.js` and this finds `link.<stamp>.js`.
 */
export function publishedPath(base: string): string {
  return join(OUT_DIR, publishedName(buildKeyReader(), base));
}

/** A published module, imported by its base name. */
export async function publishedModule(base: string): Promise<unknown> {
  return import(pathToFileURL(publishedPath(base)).href);
}

/** A built file's text, by its base name. */
export function builtText(files: ReadonlyMap<string, string>, base: string): string {
  return files.get(publishedName(files, base)) as string;
}

/** Append to a built file, named by its base name, for the controls that add a second way to send. */
export function appendTo(files: Map<string, string>, base: string, text: string): void {
  const name = publishedName(files, base);
  files.set(name, `${files.get(name) as string}${text}`);
}

/** The published link module. */
export async function publishedLink(): Promise<Link> {
  return (await publishedModule('link.js')) as Link;
}

/**
 * The link module with one refusal disarmed, from a fresh build written to a temporary folder.
 *
 * Asserts that the refusal is called in exactly one place, so a control can never disarm two at once nor
 * silently disarm none after a rename.
 */
export async function linkWithout(refusal: string): Promise<Link> {
  return (await publishedWith('link.js', `refuse('${refusal}',`, `void ('${refusal}',`)) as Link;
}

/**
 * One published module with one piece of its text replaced, from a fresh build written to a temporary
 * folder beside the rest of the page, so that its imports still resolve. The text has to occur exactly once.
 */
export async function publishedWith(base: string, from: string, to: string): Promise<unknown> {
  const files = buildKeyReader();
  // The edited file keeps its name, so the stamps of the rest still lead to it.
  const name = publishedName(files, base);
  const text = files.get(name);
  assert.ok(text !== undefined, `${name} is published`);
  assert.equal(text.split(from).length - 1, 1, `${from} appears exactly once in ${name}`);
  files.set(name, text.replace(from, to));
  const directory = mkdtempSync(join(tmpdir(), 'keyreader-control-'));
  for (const [file, content] of files) writeFileSync(join(directory, file), content);
  return import(pathToFileURL(join(directory, name)).href);
}

/** Which refusal a call ends in, or undefined when it returns or throws something that is not a refusal. */
export function refusalOf(call: () => unknown): string | undefined {
  try {
    call();
  } catch (error) {
    const named = (error as { refusal?: unknown }).refusal;
    return typeof named === 'string' ? named : undefined;
  }
  return undefined;
}
