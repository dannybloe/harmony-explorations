/**
 * `proves`, the line inside a test that says which requirement of the FHSDK the test proves, and for which bench
 * models, decision 33.
 *
 * **Why the test says it, and not the requirements data.** A requirement's met used to be typed beside it in
 * `packages/base/src/requirements.ts`, naming its tests by hand, and no test knew it was named: a test rewritten to
 * show something else left its met standing. Now the claim sits in the test it rests on, so whoever changes the
 * test sees it, and the met is derived from the claims. `packages/codec/bin/requirements.ts` reads every test source
 * statically, never running one, finds each call of `proves` and generates `packages/base/src/proofs.ts`, the data an
 * application reads at run time, with a test that fails when the generated module and the sources disagree.
 *
 * **How it is written.** Inside the test whose body shows the requirement, as its first statement, and with literal
 * arguments only, since the generator reads the call off the source and cannot evaluate an expression:
 *
 * ```
 * proves(1, ['harmony-650'], ['docs/test-notes/harmony-650.md#memory-as-read']);
 * proves(20, 'every');
 * ```
 *
 * the requirement's number; the keys of the bench models it is proven for, or `'every'` for one that does not
 * depend on the remote, as Pronto Hex does not and as a requirement of the FHSDK as a whole cannot; and, where the
 * requirement shows on a remote (`needsBench`), where it was shown on a unit: a bench test, this one when it is
 * one, or a passage of `docs/test-notes/` by its heading's anchor. A call through any other name, `proof.proves(...)`,
 * is not read as a proof, which is how the checks below are tested with wrong arguments without proving anything.
 *
 * **At run time it checks its own arguments and does nothing else**: a number that is a requirement, a key that is a
 * bench model, each named once, and records given as paths. Whether the paths exist, whether a requirement that
 * shows on a remote names a record, and whether a model also carries a written status, are judged over every proof
 * at once by `packages/base/test/requirements.test.ts`, where the whole set is in view. The Python tests have the
 * same helper, `tests/proves.py`.
 */
import { benchModel, requirement, type BenchModelKey } from '@harmony/base/requirements';

/** The models a proof is for: some bench models by key, or every one. */
export type ProvenFor = readonly BenchModelKey[] | 'every';

/**
 * Say that the test this is called in proves requirement `number` for `models`, shown on a unit in `bench` where the
 * requirement needs it. Throws a `TypeError` naming the fault when the arguments are not a requirement, bench models
 * and paths, so a mistyped proof fails its test rather than being read as evidence.
 */
export function proves(number: number, models: ProvenFor, bench: readonly string[] = []): void {
  if (!Number.isInteger(number) || requirement(number) === undefined) throw new TypeError(`proves: no requirement R${number}`);
  if (models !== 'every') {
    if (!Array.isArray(models) || models.length === 0) throw new TypeError(`proves: R${number} names no model`);
    for (const key of models) {
      if (benchModel(key) === undefined) throw new TypeError(`proves: R${number} names ${String(key)}, which is no bench model`);
    }
    if (new Set(models).size !== models.length) throw new TypeError(`proves: R${number} names a model twice`);
  }
  for (const path of bench) {
    if (typeof path !== 'string' || path.length === 0) throw new TypeError(`proves: R${number} names a bench record that is no path`);
  }
}
