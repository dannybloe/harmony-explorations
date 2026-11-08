/**
 * Reading a configuration through the codec's main entry needs no resource, a fix to `todo.md` 7.3.5.
 *
 * **What 7.3.5 checked and what it did not.** `mainentry.test.ts` walks the import graph from `src/index.ts` and
 * holds that nothing it reaches imports Node. It never ran a reader. And the readers did not run: `characterMap`
 * tries our own alphabet on every configuration, Logitech's included, and the alphabet was drawn from Oxanium,
 * whose files only the Node entry supplies. So through the main entry `devices`, `activities` and `inventory`
 * threw `ResourceError: the codec was supplied no oxanium` on every configuration, and FreeHarmony, which imports
 * the main entry alone, failed its import test 9 of 9. The alphabet is generated data now, `oxaniumalphabet.ts`,
 * held to the font by `oxaniumalphabet.test.ts`.
 *
 * **How this is checked.** In fresh processes, `readanswers.ts`: one loads `src/index.ts` and nothing else of the
 * codec, so it holds what a renderer holds and says so by asking for each resource; one loads the Node entry,
 * which supplies all five. Each reads one configuration of every compiled family and the two remotes no family
 * serves, and the answers of `characterMap`, `devices`, `activities` and `inventory` have to be the same. The
 * process is fresh because a test in this one has already imported the Node resources, and a supplied resource
 * cannot be taken back.
 *
 * **The population**, one configuration of Logitech's per family and our own letters where a family has them,
 * since our alphabet is the one that needed the font: a Harmony One compile and one of ours written to the spare;
 * a Harmony 650 compile, a Harmony 600 setup of ours and an empty Harmony 650 of ours in blended letters, which
 * are read by structure rather than by form; a Harmony 350, a Harmony 885, a Harmony 525 and a Harmony 890. The
 * Harmony Touch is given documents, not a container, and has no `characterMap`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { imagePath, require_, skipWithoutLab } from '@harmony/lab';

const CHILD = fileURLToPath(new URL('./readanswers.ts', import.meta.url));

/** Each configuration, with the alphabet it reads in, so the population is seen to be what it says. */
const SAMPLES: Readonly<Record<string, string | null>> = {
  harvest_one_two_devices: 'one',
  one_spare_lists_written: 'oxanium',
  h650_config_region: 'h600',
  h600_setup6_on: 'oxanium',
  h650_empty_blended_base: 'oxanium',
  // No screen, so no alphabet; read for its devices.
  h350_config: null,
  h885_a_config: 'arch8',
  h525_config: 'h525',
  h890_config: 'arch8',
};

interface Answers {
  readonly supplied: readonly string[];
  readonly rewritten: boolean;
  readonly answers: Readonly<Record<string, { refused?: string; characterMap?: { alphabet: string } | null; devices?: unknown[] }>>;
}

/** What the readers answer in a fresh process through `entry`, the configurations' paths handed in. */
function answer(entry: 'main' | 'node', mode: 'as-written' | 'from-font'): Answers {
  const named = Object.keys(SAMPLES).map((name) => {
    require_(name);
    return `${name}=${imagePath(name)!}`;
  });
  const run = spawnSync(process.execPath, [CHILD, entry, mode, ...named], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as Answers;
}

test('the main entry reads every family with no resource supplied, answering as the Node entry does', skipWithoutLab(), () => {
  const main = answer('main', 'as-written');
  const node = answer('node', 'as-written');
  // The two processes are what they claim to be: one holds no resource, the other all five.
  assert.deepEqual(main.supplied, []);
  assert.deepEqual(node.supplied, ['oxanium', 'iconFont', 'iconList', 'deflate', 'sha256']);
  for (const name of Object.keys(SAMPLES)) {
    const read = main.answers[name]!;
    assert.equal(read.refused, undefined, `${name} through the main entry`);
    assert.deepStrictEqual(read, node.answers[name], `${name}: the main entry answers as the Node entry`);
  }
  // And the population is what the header says: each read in the alphabet it is listed with, and every
  // configuration but the empty one naming at least one device.
  assert.deepEqual(
    Object.fromEntries(Object.entries(main.answers).map(([name, one]) => [name, one.characterMap?.alphabet ?? null])),
    SAMPLES,
  );
  assert.deepEqual(
    Object.entries(main.answers).filter(([, one]) => (one.devices ?? []).length === 0).map(([name]) => name),
    ['h650_empty_blended_base'],
  );
});

test('the control: with the reader taking our alphabet from the font again, the main entry refuses every family',
     skipWithoutLab(), () => {
  const control = answer('main', 'from-font');
  assert.equal(control.rewritten, true, 'the control rewrote the reader');
  assert.deepEqual(control.supplied, []);
  for (const name of Object.keys(SAMPLES)) {
    assert.match(control.answers[name]!.refused ?? '', /^ResourceError: the codec was supplied no oxanium/, name);
  }
});
