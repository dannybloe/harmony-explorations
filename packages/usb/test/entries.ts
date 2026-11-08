/**
 * Every entry this package's `package.json` exports, loaded: what a caller of `@harmony/usb` can reach by an
 * import, `todo.md` 7.3.6.
 *
 * **Why the tests ask this and not the barrel.** Several rules here were written as "the barrel offers no
 * way to build a write", and they were checked against `index.ts` alone. Once the main entry became a short
 * list and the rest moved under named subpaths, a check of the barrel alone would pass while the same name sat
 * one subpath away. So a rule about what the package offers is asked of every entry, and the entries are read
 * from `package.json` rather than listed here, so a subpath added there is checked without an edit here.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { readFileSync } from 'node:fs';

const PACKAGE = new URL('../package.json', import.meta.url);

/** Each subpath `package.json` exports, `.` among them, with the file it names. */
export function packageExports(): Record<string, string> {
  return (JSON.parse(readFileSync(PACKAGE, 'utf8')) as { exports: Record<string, string> }).exports;
}

/** Each exported entry loaded, by its subpath. */
export async function packageEntries(): Promise<Map<string, Record<string, unknown>>> {
  const out = new Map<string, Record<string, unknown>>();
  for (const [subpath, file] of Object.entries(packageExports())) {
    out.set(subpath, (await import(new URL(`../${file}`, import.meta.url).href)) as Record<string, unknown>);
  }
  return out;
}

/** Every name any entry exports, with the subpaths that export it. */
export async function exportedNames(): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const [subpath, entry] of await packageEntries()) {
    for (const name of Object.keys(entry)) out.set(name, [...(out.get(name) ?? []), subpath]);
  }
  return out;
}
