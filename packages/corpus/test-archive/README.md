# Archived tests

These nine files test one off set builders: the code in `../experiments/` and `../bin/touch-*-set.ts` that built the
sets of documents for single bench experiments on a Harmony Touch. Each file was the check of one experiment, whose run
is recorded in `docs/test-notes/harmony-touch.md`:

| file | the experiment it checked |
|---|---|
| `touch-own-set.test.ts` | the remote's own documents given back under tags of ours |
| `touch-changed-set.test.ts` | one value changed and put back |
| `touch-device-set.test.ts` | a device of ours added and taken out |
| `touch-activity-set.test.ts` | an activity of ours added and taken out |
| `touch-favourites-set.test.ts` | favourites and a logo of ours |
| `touch-settings-set.test.ts` | a Settings and a Context of ours |
| `touch-removal-set.test.ts` | an activity and a device of Logitech's taken out and put back |
| `touch-setup-set.test.ts` | the whole test setup composed by us |
| `touch-empty-set.test.ts` | the empty configuration |

An application syncs through `syncDocument`, not through these builders, so nothing an application calls is tested
only here. The tests stay because a test is never deleted while the code it tests is in the repository, and they are
typechecked with the rest of the package (`../tsconfig.json` includes this folder).

They are **not in the standard runs**: the `test` glob of the root `package.json` only walks each package's `test/`
folder, and neither `make all` nor `make full` calls them.

To run them, with the lab present:

    make test-archive

Without the lab the tests that need its evidence skip. The shared runner they start in child processes,
`../test/touch/touch-sync-run.ts`, stays in the standard tests, since `touch-sync.test.ts` uses it too.
