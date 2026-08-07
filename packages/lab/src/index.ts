/**
 * Locating the binaries the tests need.
 *
 * The mirror of `tests/lab.py`, with the same contract: firmware and config binaries are not
 * in this repository, so a test that needs one looks for a local copy and skips cleanly when
 * there is none. `HARMONY_LAB` points at the private working directory; failing that, a `lab`
 * directory alongside the repository is used when one exists.
 *
 * The image names are deliberately the same strings as the Python side uses, because the whole
 * point of the golden vector cross-check is that both suites read the same file and say the
 * same thing about it. A name that exists on one side only cannot be cross-checked at all.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = normalize(join(HERE, '..', '..', '..'));

function defaultLab(): string | undefined {
  const sibling = normalize(join(REPO_ROOT, '..', 'lab'));
  return existsSync(sibling) ? sibling : undefined;
}

export const LAB: string | undefined = process.env['HARMONY_LAB'] || defaultLab();

/**
 * Logical name to filename, as named in `reference/checksums.md`.
 *
 * Kept in step with `IMAGES` in `tests/lab.py`; `packages/lab/test/parity.test.ts` fails if the
 * two drift apart, which is cheaper than discovering a missing golden vector months later.
 */
export const IMAGES: Readonly<Record<string, string>> = {
  one34_code: 'one-3.4-code-base0x20000.bin',
  one34_region2: 'one-3.4-Region_2-decoded.bin',
  one_safemode: 'one-safemode-gspm-base0x2000-raw64k.bin',
  h700_code: '700-2.8-Region_2-code-base0x9000.bin',
  h700_gspm: '700-2.8-Region_3-gspm-base0x20000.bin',
  h600_code: '600-0.2-code-base0x9000-TRUNCATED64k.bin',
  // The same image, complete, read off the remote across both internal pages. Kept alongside the
  // truncated one rather than replacing it: the agreement between the two is the evidence.
  h600_code_complete: '600-0.2-code-base0x9000-COMPLETE.bin',
  // The Harmony One's 0xFE internal page. The 0xFF page is deliberately absent: it holds that
  // unit's identity block.
  one_internal_fe: 'one-3.4-internal-page-fe.bin',
  // The 600's 0xFE page. Its 0xFF page is absent: it holds the identity block.
  h600_internal_fe: '600-0.2-internal-page-fe.bin',
  // The 600's safe mode config, read off external flash at 0x020000, which had only ever been
  // established from the 700's package. 8192 bytes as read; the container is the first 7115.
  h600_safemode_gspm: '600-0.2-safemode-gspm-base0x20000.bin',
  // The Harmony 650 package, the third and last published Harmony firmware. Recorded as arch 15
  // until it was opened; it is arch 14, so arch 14 has three code images and three safe mode
  // configs where arch 12 has one of each.
  h650_code: '650-0.4-Region_2-code-base0x9000.bin',
  h650_safemode_gspm: '650-0.4-Region_3-gspm-base0x20000.bin',
  one_hfw: 'harmony_one_firmware_3_4.hfw',
  h700_hfw: 'harmony_700_firmware_2_8.hfw',
  h650_hfw: 'harmony_650_firmware_0_4.hfw',
  h525_config: 'config.EZHex',
  arch8_config_a: 'Update.EZHex',
  arch8_config_b: 'Update-1.EZHex',
  arch8_config_c: 'Update-2.EZHex',
  arch8_config_d: 'Update-3.EZHex',
  one_config: 'harmony-one-programmed-config.EZHex',
  one_config_unprogrammed: 'harmony-one-config.EZHex',
  h600_config: 'harmony-600-programmed-config.EZHex',
  h700_config: 'harmony700.EZHex',
  h700_config_2: 'harmony700-2.EZHex',
  // The spare Harmony One either side of a sync, 7 August 2026. findings.md section 58.
  one_spare_before_sync: 'one-spare-before-sync-config.bin',
  one_spare_after_sync: 'one-spare-after-sync-config.bin',
};

const cache = new Map<string, string | undefined>();

/** First match for `filename` anywhere under LAB, or undefined. */
function find(filename: string): string | undefined {
  if (cache.has(filename)) return cache.get(filename);
  let found: string | undefined;
  if (LAB && existsSync(LAB)) {
    const queue: string[] = [LAB];
    while (queue.length && !found) {
      const dir = queue.shift() as string;
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const full = join(dir, entry);
        if (entry === filename && statSync(full).isFile()) {
          found = full;
          break;
        }
        try {
          if (statSync(full).isDirectory()) queue.push(full);
        } catch {
          // A dangling symlink is not worth failing a test run over.
        }
      }
    }
  }
  cache.set(filename, found);
  return found;
}

/** Absolute path to a named image, or undefined when it is not available. */
export function imagePath(name: keyof typeof IMAGES | string): string | undefined {
  const filename = IMAGES[name];
  if (filename === undefined) throw new Error(`no image named ${name}`);
  return find(filename);
}

/** Bytes of a named image, or undefined when it is not available. */
export function load(name: keyof typeof IMAGES | string): Uint8Array | undefined {
  const path = imagePath(name);
  return path === undefined ? undefined : new Uint8Array(readFileSync(path));
}

/**
 * Bytes of a named image, or throw. For use inside a test already guarded by `skipUnless`.
 */
export function require_(name: keyof typeof IMAGES | string): Uint8Array {
  const data = load(name);
  if (data === undefined) {
    throw new Error(
      `no ${IMAGES[name]} found; set HARMONY_LAB (searched: ${LAB ?? 'nothing, HARMONY_LAB unset'})`,
    );
  }
  return data;
}

/**
 * A golden vector: what the Python parser says about a sample, for this side to match.
 *
 * Generated by `tools/golden.py --write` and kept in the lab directory rather than in the
 * repository, because a vector states section addresses and sizes for somebody's actual
 * configuration. Publishing a checksum is fine; publishing a structural map of a stranger's
 * remote is not.
 */
export function goldenVector(name: string): Record<string, unknown> | undefined {
  if (!LAB) return undefined;
  const path = join(LAB, 'golden', `${name}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

/** Like `skipUnless`, but for a test that needs the golden vector as well as the image. */
export function skipUnlessGolden(name: string): { skip: string | false } {
  const image = skipUnless(name);
  if (image.skip !== false) return image;
  if (goldenVector(name) === undefined) {
    return { skip: `no golden vector for ${name}: run tools/golden.py --write` };
  }
  return { skip: false };
}

/**
 * A `{ skip }` option for `node:test`, so a missing image reads as skipped and not as passed.
 *
 * `node:test` has no equivalent of unittest's SkipTest exception, so the skip has to be decided
 * before the test body runs. That is the reason this returns an options object rather than
 * throwing: a test that silently passes because its fixture is absent is worse than no test.
 */
export function skipUnless(...names: string[]): { skip: string | false } {
  const missing = names.filter((n) => imagePath(n) === undefined);
  if (missing.length === 0) return { skip: false };
  return { skip: `lab image not available: ${missing.map((n) => IMAGES[n]).join(', ')}` };
}

/**
 * A `{ skip }` option for a test whose claim is about the corpus as a whole.
 *
 * Such a test should **fail** rather than skip when the lab is there and a sample is missing,
 * because a partial corpus cannot support a claim about spread and a silent pass would hide that.
 * It should still skip when there is no lab at all, which is the ordinary state of a fresh clone.
 * Conflating the two made ten tests fail in a checkout with no lab while `CLAUDE.md` promised a
 * clean skip, so the distinction is the whole point of this being separate from `skipUnless`.
 */
export function skipWithoutLab(): { skip: string | false } {
  if (LAB !== undefined && existsSync(LAB)) return { skip: false };
  return { skip: 'no lab directory; set HARMONY_LAB or put one alongside the repository' };
}
