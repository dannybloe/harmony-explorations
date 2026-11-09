# Plan 014: one build from a recipe, for every remote served

**Status: done.** The references are held as recipes and fingerprints rather than as committed builds, decision 32 as corrected the same day. Written 9 November 2026, after `todo.md` 7.3.10 put the write paths in the libraries. Its items
are `todo.md` 7.3.11. Plan 013 holds the families and the registry this builds on; plan 007 the family model.

## Why

Every remote the libraries serve, the Harmony 885 apart, can be built from nothing, but each through its own steps:
the Harmony One as an empty configuration and then a setup composed onto it, the Harmony 600, 650 and 700 the same
with another family's functions, the Harmony 300 and 350 through one builder with a request of its own, the Harmony
Touch through its own namespace and a setup file that is a recipe with a part only it reads. An application has to
know all four routes. The person asked for one: a JSON document with everything in it goes in, and what goes out
is what is sent to the remote.

## What was decided, in the conversation that asked for it

1. **The JSON is the recipe**, `packages/codec/src/recipe/recipe.ts`, extended where it falls short. It already
   names the model, the devices, the activities, the favourites, the family's choices and the Harmony Touch's part.
2. **A recipe may carry its codes.** Today a device names a catalogue entry and the build reads its codes from the
   archive. A recipe may now hold a device's definition itself, codes included, which is what a code learned off a
   remote needs in FreeHarmony, and what lets a test run with no archive. The handful of codes the test recipes
   carry may be committed: they are a few devices' worth, no more than learning them off the remote would give.
3. **References are our own builds, committed, and the tests run without the lab.** The tests of what this
   repository delivers, compiling and syncing, must run on a checkout with no lab. So a reference, the bytes a
   recipe built before, is committed beside its recipe. **Only our own builds**: a compile of Logitech's stays out
   whatever is scrubbed from it, since the reason is copyright and not personal data, and a build composed onto one
   of their compiles is partly theirs. A configuration of ours carries no serial and no account name; a Harmony
   Touch document of ours carries only identifiers we composed. Recorded as [decision 32](../decisions.md#d32).
4. **The look is part of the recipe.** Some remotes are built with our typeface, colours and icons, which may later
   come from FreeHarmony. So a reference recipe states its whole look, the typeface, the inks, the colours and the
   icons, and does not lean on a family's defaults: a default that changes must not change a reference silently.
   The typeface is named by the recipe and supplied by the host as the codec's resources are; Oxanium is the only
   one built today.
5. **Several recipes per remote**, each an integration test of one thing: a remote with nothing, a full setup, a
   sequence, the favourites, a choice turned the other way.

## The shape

    buildFromRecipe(recipe, { builtAt, archive? }) -> Built
      Built = { kind: 'configuration', model, bytes }          the compiled families
            | { kind: 'documents', model, documents, pictures } the Harmony Touch

* **The registry chooses**, by the recipe's model, as it does today, and the family builds. A family that builds
  from a recipe says so as a member of its interface, plan 007's rule: no test of which remote it is in the
  function. The Harmony 300 and 350's request and the Harmony Touch's setup are read out of the recipe by their
  own families.
* **From nothing only.** A build composed onto a compile of Logitech's stays its family's own function, for the
  tests that hold our composers to theirs; it is not a route an application takes.
* **Codes**: a device carried in the recipe is served first, a catalogue entry from the archive the caller gives,
  and a recipe that names an entry with no archive given is refused naming the device.
* **The time a build is stamped with is an argument**, so a reference rebuilds byte for byte.
* **Sending stays apart.** What `Built` holds is what the write functions on `@harmony/corpus/write` take, behind
  their rails, unchanged.

## The tests

Per remote, under `packages/codec/test/`, one test per recipe: build it, compare with the committed reference byte
for byte, and a control that a changed recipe changes the bytes. **The comparison is also the proof that a reference
is ours**: a compile of Logitech's cannot be rebuilt from a recipe. The pre-commit hook lets a configuration file in
only in the references folder and only beside a recipe of the same name.

**Where a reference comes from.** The lab holds our builds that were written to the bench units and used there.
Each reference starts as one of those: its recipe is written with the codes inline and the look stated, rebuilt,
and compared with the lab's file. Equal is the best reference there is, a file a remote ran. Different is a finding
to explain before anything is committed, plan 013's "two copies disagreeing is the finding". A remote with no bench
written build, the Harmony 600's full setup and the Harmony 300's so far, gets a reference that says it has not been
on a remote.

## Not in it

The Harmony 885, which comes later on its own track; FreeHarmony, which stays decoupled until the libraries are
opened up to it in one pass; a second typeface, which waits for FreeHarmony to supply one.
