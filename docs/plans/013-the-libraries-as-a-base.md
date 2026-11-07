# Plan 013: the libraries as a base for FreeHarmony

**Status: open.** Written 7 November 2026, after the Harmony Touch track reached its finish line. Its items are
`todo.md` 7.3. Plan 007 holds the family model this builds on; this plan extends it and does not replace it.

## Why now

Five model groups now sit side by side in `packages/codec`: the Harmony One, the 600/650/700, the 300/350, the
880/885 in progress on its own branch, and the Harmony Touch, which takes JSON documents over a sync instead of a
compiled file. Each was added by the track that needed it, and the structure shows it. Three reviewers read the
packages from three angles, codec structure, package boundaries and maintainability; their reports and their brief
are in the lab, `work/architecture-review/`. They agreed on the main points without seeing each other's work. The
person asked for a clean architecture that is easy to maintain and a sound base for FreeHarmony, and for the rules to
be written down so that later iterations do not have to look at the structure again.

## What the review found, in short

* **"touch" means two things**: `families/touch/` is the Harmony One's family, `harmony-touch/` is the Harmony Touch,
  and the clash runs on into test names and constants.
* **The family model covers three of five groups.** The Touch runs on a parallel stack beside it, and the registry
  quietly gives an unserved architecture the Harmony One's shapes where the family skill says to refuse.
* **The codec depends on `packages/usb`** for the trailer checksum and the model table, which pulls the native USB
  module into anything that only reads a configuration, and is why the Touch's sync answerer sits in `corpus`.
* **The codec reads the disk** in twelve source files (archive, catalogue, fonts), so it cannot load in a renderer.
* **The exported surfaces are wide** (`export *`) while FreeHarmony uses about 21 imports, among them
  `@harmony/lab`, which is a locator of a private folder plus a 1700 line table of named images.
* **`packages/usb` exports test helpers** through `package.json`, and runnable scripts use them.
* **Experiments sit in library sources**: `corpus/src` and `bench/src` hold the numbered Touch steps, 3211 of
  corpus's 4586 lines, and the model of the Touch's firmware engine lives in the bench.
* **Duplicated small helpers**: argument parsing in 33 scripts, a byte comparison defined five times, three
  unrelated functions named `familyOf`.
* **Size**: about 80 loose modules at the codec's top level, six names repeated in the 600 family's folder, fifteen
  files over 1000 lines, `inventory.ts` the largest at 3139.
* **What holds and stays**: no family imports another and `shared/` imports no family; `generic.test.ts` enforces it;
  no dependency cycles between packages and no relative imports across them; every dependency pinned; the rails in
  `packages/usb` behind the guarded transport; the 300/350 family as the template for a new model; the shape of the
  sync answerer, a library function with a thin script.

## Decisions taken in this plan

1. **Two kinds of family.** A *compiled* family builds a container the remote is written with (the Harmony One, the
   600s, the 300/350, the 880/885 when its branch lands). A *document* family builds the documents a remote assembles
   itself (the Harmony Touch). Both are chosen in one registry, **by model and not by architecture number**, since the
   Touch's firmware reports 17, which it shares with the hubs. Each kind has its own small interface; what both share
   is the setup they start from and the infrared, catalogue and archive layers below.
2. **A family that does not serve an architecture refuses**, everywhere. No default borrowed from the Harmony One.
3. **Names say what they are.** `families/touch/` becomes `families/one/`; "touch" means the Harmony Touch only.
   Test and experiment files are named by subject, never by todo step.
4. **A small base package** holds what every other package needs and nothing native: the model table, the trailer
   checksum and the key codes. `packages/codec` stops depending on `packages/usb`.
5. **The codec's core loads anywhere.** Whatever reads the disk sits behind a separate Node entry point.
6. **Every package states its public surface explicitly**, small and deliberate. Composers are not exported (plan
   007 already said so). Test helpers live in a test kit no product imports. `@harmony/lab` is a test and bench
   dependency, never a product one.
7. **Experiments live beside their scripts**, never in a library's `src`. Knowledge about a remote, such as the model
   of the Touch's engine, lives in the codec, whatever bench step produced it.
8. **The rules are written down as a skill with tests that enforce them** (`architecture`, folding in what
   `code-for-a-family` holds), and the choice as a decision in `docs/decisions.md`.

## The order, and the one thing to wait for

The Harmony 885's branch (`worktree-prepare-885`, plan 012) changes the registry, a new family for the 880/885,
`inventory.ts`, the lab package, the USB package's exports and rails, and `write-config.ts`. Moving those files
under it would turn its rebase into a rewrite. Its session agreed on 7 November 2026 to rebase onto main after its
item 2.1, and merging is the person's call. So:

* **Before the 885 branch is in main**, only what touches none of its files:
  the Touch's experiments moved out of `corpus/src` and `bench/src` and the engine model into the codec; the bench and
  Touch test files named by subject; the key reader's dependency declared; the architecture skill drafted.
* **After the 885 branch is in main**, in this order, each step its own commit with its touched tests, `tsc --build`
  and FreeHarmony's own type check and `test/boundary.test.ts`, the full suite in the background:
  1. `families/touch/` renamed `families/one/`, with its constants and tests.
  2. The registry by model, two kinds of family, the refusals; the Touch's documents behind its family; plan 007 and
     the skill updated.
  3. The base package, and the codec off `packages/usb`.
  4. The codec's Node entry point.
  5. The explicit public surfaces; the test kit; `@harmony/lab` out of FreeHarmony's product dependencies.
  6. The shared CLI helper and the one byte comparison.
  7. The codec's top level grouped into folders and the largest files split, in one quiet step when no other
     session works in the codec.
  8. The architecture skill finished, its tests, and the decision.

**FreeHarmony moves with steps 3 to 5.** It imports `@harmony/codec`, `@harmony/usb`, `@harmony/usb/models`,
`@harmony/corpus/read`, `@harmony/lab` and `@harmony/silhouettes`; a step that changes one of those changes
FreeHarmony's imports in the same stretch, so its build never points at a surface that is gone.

## What this plan does not do

It changes no behaviour, no format reading and no rail. A step that would change an output is not a restructuring
step and goes back to its own track. The Harmony Touch's open questions, the 681 families written into its code
description and its key layouts composed by rule, are `todo-touch.md` chapter 10.
