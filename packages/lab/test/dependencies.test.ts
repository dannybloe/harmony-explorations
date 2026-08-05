/**
 * Every npm dependency is pinned to an exact version.
 *
 * A range hands the choice of which bytes get installed to whoever published most recently. The
 * committed lock file narrows that window, but it does not close it: any `pnpm add`, or anyone
 * refreshing the lock, silently moves a range forward. Pinning turns a dependency update into a
 * diff someone has to approve, which is the only review that actually happens.
 *
 * This is a test rather than a line in CLAUDE.md because the rule is easy to break by accident:
 * `pnpm add` writes a caret by default, so the mistake is the tool's default behaviour.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/** Every package.json in the workspace: the root, plus one per workspace project. */
function manifests(): Array<{ path: string; json: Record<string, unknown> }> {
  const files = [join(REPO_ROOT, 'package.json')];
  for (const dir of ['packages', 'apps']) {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const candidate = join(root, entry, 'package.json');
      if (existsSync(candidate)) files.push(candidate);
    }
  }
  return files.map((path) => ({
    path: path.slice(REPO_ROOT.length + 1),
    json: JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>,
  }));
}

// An exact version: three numeric parts, optionally a prerelease or build tag. Anything with a
// caret, a tilde, a comparison, an `x`, a range or a `*` fails, and so does `latest`.
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

test('no dependency is specified as a range', () => {
  const offenders: string[] = [];
  for (const { path, json } of manifests()) {
    for (const field of DEPENDENCY_FIELDS) {
      const deps = json[field] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const [name, spec] of Object.entries(deps)) {
        // A workspace sibling is not a published package, so it has no version to pin.
        if (spec.startsWith('workspace:')) continue;
        if (!EXACT.test(spec)) offenders.push(`${path}: ${field}.${name} = ${spec}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the lock file records the same exact specifiers', () => {
  // Belt and braces: package.json could be pinned while the lock file still carries a range
  // left over from an earlier install, and then `pnpm install --frozen-lockfile` would install
  // whatever that range resolved to on someone else's machine.
  const lock = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');
  const ranged = [...lock.matchAll(/^\s*specifier:\s*(.+)$/gm)]
    .map((m) => m[1]!.trim())
    .filter((spec) => !spec.startsWith('workspace:') && !EXACT.test(spec));
  assert.deepEqual(ranged, []);
});

test('the manifest scan found the workspace, rather than nothing', () => {
  // Without this, a wrong REPO_ROOT would make both checks above pass by finding no manifests.
  const found = manifests();
  assert.ok(found.length >= 3, `only found ${found.length} manifests`);
  assert.ok(found.some((m) => m.path === 'packages/codec/package.json'));
});
