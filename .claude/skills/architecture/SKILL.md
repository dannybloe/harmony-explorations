---
name: architecture
description: "Where code goes in this repository and what each package may reach, plan 013 and decision 31: the packages bottom up and their dependency direction, the two kinds of family chosen by model, the codec's folders, a codec core that loads anywhere and reads with no resource, explicit public surfaces with the write paths on write subpaths, the test kit and the lab kept out of what a product imports, one reader for every script's command line, experiments beside their scripts, names by subject, and where a new remote model goes, with the test that holds each rule. Use before adding a package, a module, a public name, a subpath, a dependency between packages, a script or an experiment, before splitting a large file, before adding a remote model to the libraries, and in every agent brief for structural work."
---

# Architecture: where code goes and what it may reach

**The rule, in one sentence: the libraries are a base an application builds on.** Each package has one job and depends
only on what sits below it; each states what it offers by name; and experiments, test helpers and the private lab stay
out of anything a product imports. The decision is 31 in `docs/decisions.md`, the reasoning
`docs/plans/013-the-libraries-as-a-base.md`, the three reviews behind it the lab's `work/architecture-review/`
(`codec-structure.md`, `package-boundaries.md`, `maintainability.md`).

**Why a skill and not the plan alone.** Every fault the reviews found was cheap to make in one commit and dear to find
later: "touch" naming both the Harmony One's family and the Harmony Touch, down to test files told apart by a hyphen;
the codec depending on the USB package for two small facts and so pulling a native module into anything that only reads
a configuration; twelve codec files reading the disk, so the codec could not load in a renderer; `export *` making every
helper public; test helpers exported as API and used by runnable scripts; 3211 lines of numbered experiments in a
library's `src`; a byte comparison defined eight times and a command line read by hand in 68 scripts. None of them broke
a test, and each was the quickest answer in the middle of a task. So the trigger is the **act** of adding a structural
thing, whatever the task was, and most rules here now have a test that fails when they are broken, listed at the end.

## When to load it

Before adding or moving any of these:

* a package, a dependency between two packages, or an npm dependency;
* a module or a folder in a library's `src`, or a split of a large file;
* a name on a main entry, or a subpath in a `package.json` `exports`;
* a script in a `bin/`, or an experiment or a bench scaffold;
* a write path, or a list of units one may write;
* a remote model the libraries did not know;

and in every agent brief for structural work. Before writing build code in `packages/codec/src`, load
`code-for-a-family` as well: it holds the family split at the moment a builder is written, its four questions and its
table of every kind of difference met so far, which this skill does not repeat.

## The packages, bottom up

Read off each `package.json` as of `todo.md` 7.3.10. "Run time" is `dependencies`, what the package's `src` loads;
"development" is `devDependencies`, what only its tests, scripts and experiments load. Both columns are held exactly by
`packages/lab/test/dependencies.test.ts`, so a new dependency between packages is a line in that file's diff.

| package | what it is for | run time | development |
|---|---|---|---|
| `base` | what every package needs and nothing native: the model table, the trailer checksum, the key codes, the one byte comparison | nothing | `testkit` |
| `lab` | locates the private lab and the infrared archive, names the lab's images, skips a test cleanly without them; `./cli`, the one reader of a script's command line | nothing | nothing |
| `usb` | the HID transport, the command protocol, the file protocol, the write rails and the file write | `base`, `node-hid` | `lab`, `testkit` |
| `codec` | the one configuration codec: read, render, edit, compose, build, the Harmony Touch's documents included | `base`, `@mdi/font`, `opentype.js` | `lab`, `testkit`, `usb` |
| `testkit` | what tests share across packages; never a product's dependency | `base`, `lab`, `usb` | nothing |
| `corpus` | reads a configuration off a remote and files it; writes one back; answers the Harmony Touch's sync | `codec`, `lab`, `usb` | `base`, `testkit` |
| `probe` | a structural report about a remote, publishable because it carries shape and not contents | `codec`, `lab`, `usb` | `testkit` |
| `bench` | the bench instrument and the infrared monitor, rough on purpose | `base`, `codec`, `corpus`, `lab`, `usb` | `testkit`, `playwright` |
| `silhouettes` | each model's measured front face and the SVG it generates | nothing | `base`, `codec`, `corpus`, `lab`, `testkit`, `usb` |
| `keyreader` | a browser page that reads which key is pressed, through WebHID | nothing (below) | `base`, `lab`, `silhouettes`, `usb` |

The rules the table keeps:

* **Downward only, and no cycle.** `base` and `lab` are the floor; `usb` and `codec` stand on `base` and never on each
  other at run time; everything else stands on those. A cycle through the test kit is real, `base` and `usb` take it
  for their tests and it stands on them, and `tsc --build` refuses a cycle between project references, which is why
  those two packages' tests are a project of their own, `packages/base/test/tsconfig.json` and
  `packages/usb/test/tsconfig.json`.
* **Across packages by package name and an exported subpath, never by a relative path** into another package's files,
  so what one package takes of another is on that package's surface.
* **What `src` loads at run time is a run time dependency**; what only tests, scripts and experiments load is a
  development one. Two exceptions, each held by name: `keyreader`'s `src` loads `@harmony/base` and `@harmony/usb`,
  declared for development, which works because `bin/build.ts` bundles the page and publishes the modules it reaches;
  and `testkit` reads an entry's names with the root's pinned `typescript`.
* **Every npm dependency is pinned exactly**, and checked for what it pulls in before it is added (`CLAUDE.md`). A
  dependency of the codec's core also has to load in a browser, below.
* **Every directory of TypeScript is typechecked by a project, and the root references every project**, `src`, `test`,
  `bin` and `experiments` alike. A new package joins the root `tsconfig.json` in the same commit.
* **A new package is the exception.** Plan 013 added two, `base` to take the codec off `usb` and `testkit` to take test
  helpers out of `usb`'s exports, each because a dependency pointed the wrong way. A module in an existing package is
  the default; a package needs a dependency direction no existing one can give.

## Two kinds of family, chosen by model

**Plan 013 decisions 1 and 2.** A *compiled* family builds the one container a remote is written with, the `Family`
interface in `families/family.ts`, `kind: 'compiled'`: the Harmony One's, the 600, 650 and 700's, the 300 and 350's and
the 880 and 885's. A *document* family builds the documents a remote assembles its configuration from, the
`DocumentFamily` interface in `families/document.ts`, `kind: 'document'`: the Harmony Touch's,
`families/harmony-touch/family.ts`. The two interfaces name nothing of each other's; what both share sits below them,
the setup, the infrared definitions, the catalogue and the archive. A new remote that is given documents gets a
`DocumentFamily`, never a `Family` of members that refuse.

**The registry chooses by model**, `familyOfModel` in `families/registry.ts`: a model by Logitech's name and its skin,
looked up in the model table or, for a model the table holds no record of, `MODELS_OUTSIDE_THE_TABLE` beside it,
answered with a family of either kind or refused with the model named. `recipeTarget` asks it. **The container route
stays**, `familyOf(c)` by the architecture a container states, and answers with a compiled family alone, since a
container is compiled for one architecture. Never choose by architecture number where a model is in hand: the Harmony
Touch's firmware reports 17, which it shares with the hubs.

**A family that does not serve a model refuses**, everywhere, plan 013 decision 2. `traitsOf`, `sendsOf`,
`activityStartOf` and `choicesOf` refuse a configuration no family serves through `NoFamilyError`, naming its
architecture and model, where until `todo.md` 7.3.3 they gave it the Harmony One's shapes. A reader that has to read
such a configuration asks `familyOf(c)`, which answers undefined, and reads on its own terms.

**Each family's folder is named after its remotes**, as `reference/architectures/` names them: `harmony-one/`,
`harmony-600-650-700/`, `harmony-300-350/`, `harmony-880-885/` and `harmony-touch/`, `todo.md` 7.3.8. "Touch" means the
Harmony Touch, or the Harmony One's touch panel where a reader of base slot 17 says so, and never a family. The
identifiers inside keep their older names (`FOUR_SLOT`, `fourSlot...`, `noScreen...`, `sideKeys...`).

**Who may reach a family's modules.** No family imports another; nothing outside `families/` imports a family's module,
it asks the registry; the four entries at the top of `src` are the exception, since publishing a family's parts is
their job (`./build` carries the Harmony 300 and 350's index and the Harmony Touch's, the main entry the Touch's view).
`codec/test/generic.test.ts` holds both halves and reads the families off the directory, so a new family is covered
without being named.

## The codec's folders

**`todo.md` 7.3.8.** Outside `families/`, `shared/` and `recipe/`, the codec's modules sit in ten folders by what a
module is for, and the four entries stay at the top of `src`:

| folder | what sits there | which entry carries it |
|---|---|---|
| `container/` | the container and its sections, read and encoded | `./internal` |
| `inventory/` | what a configuration is for, as an application reads it | `./internal` |
| `infrared/` | pulses, frames and protocols | `./internal` |
| `catalogue/` | Logitech's device catalogue and infrared archive, with their `*.node.ts` readers | `./internal`, the readers `./node` |
| `screens/` | the remote's screens read and drawn | `./internal` |
| `edit/` | a configuration changed in place | `./internal` |
| `support/` | what everything leans on: bytes, deflate, the resources and their Node supplier | `./internal` |
| `drawing/` | our letters, pictures and icons | `./build` |
| `compose/` | the composers outside a family | `./build` |
| `assembly/` | a container built from nothing | `./build` |

`shared/` holds what every family's configuration is built from, `families/<name>/` what differs per family, plan 007,
and `recipe/` reads the recipe a build starts from. `docs/README.md`'s codec entry lists each folder's modules. A new
module goes in the folder whose question it answers; a module that fits none is a reason to ask, not to add an
eleventh folder or leave it loose at the top.

**A large file is split by subject, and the original module re-exports its parts.** `inventory.ts` went from 3175
lines to a docstring, its composition and seven parts beside it, each a section the file already had, every
declaration moved whole with its comment and in its order. Importers keep their path and the entries carry exactly the
names they did; a part only the other parts read is not re-exported (`inventory/common.ts`), so a split adds no public
name. Check a split the way 7.3.8 did: every original line in exactly one part, the entries' exports compared before
and after, and one output byte identical.

## The codec's core loads anywhere, and reads with no resource

**Plan 013 decision 5, `todo.md` 7.3.5.** The main entry, `./build` and `./internal` load in an Electron renderer or a
browser: nothing they reach imports a Node module or names a Node global (`Buffer`, `process`, `require`, `__dirname`,
`__filename`, `global`), `codec/test/mainentry.test.ts`, which walks the import graph with the compiler's own parser.

* **Node lives in `*.node.ts` files and the `./node` entry**, `src/node.ts`, each reader beside the parser it feeds, so
  the line between the halves shows in a file listing. The Node entry carries the main entry whole, so a Node caller
  imports from one place, and a Node caller of `./build` or `./internal` imports `./node` as well.
* **What the core needs from its host is supplied, not imported**: the fonts, the icon list, a PNG's deflate and
  SHA-256 go through `support/resources.ts`, supplied by the Node entry as it loads or by a renderer through
  `supplyResources`. A builder that is handed the catalogue gets a `CatalogueSource`.
* **Reading needs no resource.** 7.3.5 passed its walk and its consumers' type checks and broke reading for every caller
  of the main entry: `characterMap` tried our own alphabet on every configuration, the alphabet came from Oxanium, and
  only the Node entry supplied Oxanium, so `devices`, `activities` and `inventory` threw on all of them and FreeHarmony's
  import test failed 9 of 9. The alphabet is generated data now, `screens/oxaniumalphabet.ts`, held to the font by its
  own test. **A reader never asks the loader for anything**; a resource is for drawing and building.
  `codec/test/mainentryreads.test.ts` holds it in fresh processes over one configuration of every compiled family and
  of the remotes no family serves. **A type check of a consumer is not a run**: when a step changes what an entry
  loads, run a reader through it.
* **A package outside this repository in the core** is on `PACKAGES` in `mainentry.test.ts` with the reason it loads in
  a browser, or the walk fails naming it.

## Explicit public surfaces

**Plan 013 decision 6, `todo.md` 7.3.6.** A package's main entry is what an application builds on: explicit names,
grouped by what an application does with them, no `export *` from a module. **Each main entry is held to a list by its
`test/surface.test.ts`**, which reads the entry's source through `@harmony/testkit/surface` (the only way to see its
types) and holds the loaded module to the same values. So a new public name is a line in that list's diff, and adding
it is a decision about the surface, not a side effect of exporting a helper.

Everything else a package offers is under a named subpath, each module whole, for this repository's scripts, tests and
the libraries built on it; there `export *` is the point:

| package | main entry | subpaths |
|---|---|---|
| `codec` | read, show devices, activities and screens, edit in place, start a build through the recipe and the registry, check before a write, infrared; the Harmony Touch as the namespace `harmonyTouch`, its view with no composer | `./node` (the disk), `./build` (composers and builders, off the main entry by plan 007), `./internal` (the format's parts) |
| `usb` | find, open and read a remote, check a configuration; `RailError` and no other rail | `./rails` (whole), `./write` (its own list), `./internal`, `./protocol`, `./readwindow`, `./touchsession`, `./touchrecording`; `./models`, `./keys` and `./trailer` re-export `base` until FreeHarmony's half of 7.3.6 |
| `corpus` | reading a configuration off a remote | `./read`, `./file`, `./write` (its own list) |
| `base` | the model table, the trailer checksum, the key codes, `sameBytes` | `./models`, `./trailer`, `./keys`, `./bytes` |
| `bench`, `probe`, `silhouettes` | their own lists | `./internal` |
| `lab` | the locators and the image table | `./cli` |
| `testkit` | none | `./touch-recording`, `./fake-touch-remote`, `./surface` |

* **Composers stay off a main entry.** An application starts a build from the recipe and the registry.
* **A subpath is named by what it is** (`./node`, `./build`, `./internal`, `./write`), never by who uses it, and every
  subpath a package exports is listed in its surface test.
* **A module no entry reaches is offered to no application.** Each one is listed with why in
  `lab/test/dependencies.test.ts`: as found in 7.3.9, the Harmony 600 family's whole build from a setup
  (`assemble.ts`, `screentexts.ts`) and its comparison, the Harmony One's build from nothing (`empty.ts` and the three
  modules it takes) and its comparison view, all reached by their tests and scripts through `../src/` paths; and
  `corpus`'s four modules of the gathering track's client of Logitech's service. A new module joins an entry, or joins
  that list with its reason, or is an experiment and goes beside its script.

## The write paths

**`todo.md` 7.3.10.** Each of the three ways this library changes a remote is a library function an application can
call, with a thin script over it, and none is on a main entry:

| path | function | subpath | the units it may write |
|---|---|---|---|
| a compiled configuration to the Harmony One, 600, 650, 700 and 885 | `writeConfiguration`, `corpus/src/writeconfig.ts` | `@harmony/corpus/write` | `CONFIG_WRITE_UNITS`, with `CONFIG_WRITE_MODELS` holding what each model's write end needs |
| the file write to the Harmony 300 and 350 | `writeFileFamilyConfiguration`, `usb/src/filewrite.ts` | `@harmony/usb/write` | `FILE_FAMILY_UNITS` |
| answering the Harmony Touch's sync | `answerTouchSync`, `corpus/src/touchsync.ts` | `@harmony/corpus/write` | `TOUCH_SYNC_UNITS` |

* **The list of writable units is the library's**, never a caller's copy: a label outside it is refused before
  anything is stamped, judged or opened, and the scripts read the library's list rather than keeping one. A caller
  supplies only what is its own: the lab's region reads, the unit's record, the files.
* **The journal is required**: the line sink is a required option of the two writes, so a caller cannot run one
  without recording what it did, the reason `CLAUDE.md` gives for the writer's journal.
* **A function takes what an application has**: an options object for what a script's flags say, an `open` callback,
  a line sink, and returns a result. The script parses its arguments, finds its paths, prints and journals.
* **The rails do not move.** They stay in `packages/usb/src/rails.ts` and on the guarded transport, asserted on the
  same inputs and in the same place relative to the cable; `CLAUDE.md` "Never write to a remote" is the rule, and
  `writing-a-config` the rails of the file. A new write path is a decision of its own and goes behind a write subpath,
  with its own unit list.

## Test helpers and the lab

* **What tests share across packages is in `@harmony/testkit`**, only ever a development dependency, and imported by
  tests alone: the lab readers of a recorded Touch sync, the pretend Touch, the reader of an entry's names. Until 7.3.6
  two of these were `@harmony/usb/test/*` subpaths and five runnable scripts imported them. **A script never imports
  the test kit**; what a script needs is a library, as the recorded sync's decoder became `@harmony/usb/touchrecording`.
* **`@harmony/lab` is a test, bench and script dependency, never a product one.** It locates a private folder of
  firmware images and holds a table of named lab files; an application has no lab. A library's `src` loads it in three
  modules, each listed with why: `bench/src/bench.ts`, which opens lab images; `corpus/src/myharmony.ts`, the gathering
  track's service client, reached by no entry; and the test kit's `touch-recording.ts`. `corpus` and `probe` still state
  it for run time, `probe` while no module of its `src` loads it, and FreeHarmony still links it until its half of
  7.3.6.
* **The lab walk follows no linked folder out of the lab**, and ends on a loop of links. A scratch checkout in the lab
  links its `node_modules` to this repository's, and once `usb` and `testkit` depended on each other those links were
  a loop: nine test files of a full run hung for over an hour with nothing printed. A linked folder is walked only when
  its real path stays inside the lab, and no real folder twice, `lab/test/find.test.ts`.
* **A test skips cleanly without the lab and never passes on evidence it does not have**, `CLAUDE.md` "This repository
  is public"; that rule is the lab's, not this skill's.

## Scripts, experiments and names

* **One reader for every script's command line**, `@harmony/lab/cli`, `todo.md` 7.3.7. Every script under
  `packages/<name>/bin` declares the names it reads, each of which must appear in its usage text, and calls the reader
  first; **`--help` prints the usage and exits 0 before the script does anything**. The reader keeps the hand written
  readers' rules exactly (the first occurrence wins, the word after an option is its value even when it is another
  option, no `--name=value`, an unknown option ignored), which is why it is not `util.parseArgs`. It lives in `lab`,
  the scripts' and tests' package, so that `base`, which a renderer loads, does not carry it.
* **One copy of a small helper.** The byte comparison is `sameBytes` in `@harmony/base/bytes`, which the codec
  re-exports and the USB package's guards use; eight private copies went in 7.3.7, four of them on a rail. Before
  writing a helper, look for it in `base` and the codec's `support/`. `firstDifference` in `usb/src/blockwrite.ts`
  answers another question, where two blocks differ, and is not a copy.
* **A library's `src` holds what an application or another library calls.** A bench run's scaffold, the set a numbered
  step builds, a plan of keys to press, is an experiment and lives in the package's `experiments/` beside the `bin/`
  script that runs it: 7.3.1 moved nine set builders out of `corpus/src` and six test plans out of `bench/src`, 3211 of
  corpus's 4586 source lines. `experiments/` is in the package's `tsconfig.json` like `src`, and no module of `src`
  imports one.
* **Knowledge about a remote lives in the codec, whatever produced it.** The model of the Harmony Touch's activity
  engine came out of bench runs and is `families/harmony-touch/engine.ts`, so an application can ask what an activity
  will send.
* **Names by subject, never by todo step.** `touch-device-runs.test.ts`, not `touch82.test.ts`: a reader cannot tell
  what 8.2 was without the todo file. A todo item belongs in a header as provenance. A model number (`keys300`,
  `h885base`) or an architecture (`arch10`) in a name is a subject. What still carries a step in its name is recorded
  run input, the setups under `corpus/touch-setups/`, the plans under `bench/irtests/` and the constants that name
  them, left as they were recorded, and one older test, `bench/test/final53.test.ts`, listed in `tests/test_toolchain.py`.
* **The codec's tests show their family as the existing ones do**: `one*` for the Harmony One's, `noscreen*` for the
  300 and 350's, `touch-*` for the Harmony Touch's, and no prefix for the 600 family's, which was first. This is the
  convention found, not a rule a test holds; follow the files beside the one being added.

## Where a new model goes

The Harmony 300 and 350's family is the template: built from nothing, every member it cannot state refusing with the
reason, `families/harmony-300-350/index.ts`. In order:

1. **Its facts first**: `reference/architectures/<family folder>/` and `reference/remotes/<model>/`, and a skill of its
   own for the bench (one per remote). The libraries follow the reference, never the other way round.
2. **The model table**: its skin in `packages/base/src/models.ts`, or, for a model the table has no record of, a row of
   `MODELS_OUTSIDE_THE_TABLE` in the registry.
3. **Reading** is per architecture by nature and is exempt from the family rule, but each fact is one table keyed by
   architecture (`archSlot`, `FRAME_ARCHITECTURES`, `PerArchitecture`), never an inline test in a function's body. A
   read profile, `corpus/src/read.ts` `PROFILES`, does not add a write target, `CLAUDE.md`. The new model's
   configuration joins `mainentryreads.test.ts`'s population.
4. **Building** gets a family folder named after its remotes, a `Family` for a compiled file or a `DocumentFamily` for
   documents, every member stated or refusing, and its row in the registry. Load `code-for-a-family`, and before any
   byte of a container changes, `writing-a-config`.
5. **Tests** named by subject; the registry's counts in `registry.test.ts` and the family folders in
   `generic.test.ts`'s control move in the same diff, which is the point of asserting them exactly.
6. **The surface**: an application that needs a new name for it gets one on the main entry's list, deliberately; its
   composers stay on `./build`. Writing it is a write path of its own, the section above, and a permission of its own in
   `CLAUDE.md`, never a side effect of adding the model.

## What holds each rule

**Since 7.3.9** marks a check written with this skill, each with a control: a test that feeds the check a sample which
breaks the rule and requires it to be found, beside a live run that broke each rule once in the working tree and saw
the check fail. A rule marked *no test* is held by this skill and review alone, and says why.

| rule | held by |
|---|---|
| each package depends on exactly its table's packages, at run time and for development | `lab/test/dependencies.test.ts`: "each package depends on exactly the packages of its table, at run time and for its tests" (since 7.3.9) |
| no cycle between packages at run time | the same file: "the packages stand on each other at run time with no cycle", and "the control: a cycle is found, and the test kit closes one through the tests of the packages it stands on" (since 7.3.9); `tsc --build` refuses a reference cycle |
| `base` depends on nothing, its modules import nothing | `base/test/base.test.ts`: "the package depends on nothing, and its tests on the test kit alone", "the four modules import nothing, and the index only them" |
| the codec's `src` does not load `usb` | `codec/test/dependencies.test.ts`: "no file in the codec source imports @harmony/usb", "the codec states the base as a dependency and the transport only as a development one" |
| what `src` loads is a run time dependency | `lab/test/dependencies.test.ts`: "what a library's src loads is a dependency it states for run time, but in the two packages listed" (since 7.3.9) |
| no relative import across packages, none out of a library's `src` | the same file: "no file imports another package's files by a relative path, and no library src reaches out of its src", and its control (since 7.3.9) |
| every npm dependency pinned exactly | the same file: "no dependency is specified as a range", "the lock file records the same exact specifiers" |
| every directory of TypeScript in a project, every project referenced | `tests/test_toolchain.py` `TypeScriptProjects`: `test_every_directory_of_typescript_is_inside_its_own_project`, `experiments` among its directories since 7.3.9, and `test_the_root_project_references_every_package` |
| the registry chooses by model, two kinds, a model no family serves refused | `codec/test/registry.test.ts`: "every model of the model table is chosen a compiled family by its architecture or refused naming it...", "a configuration no family serves is refused by each of the four questions...", "a Logitech configuration of the Harmony 525 and the 890 is refused by the four questions and still read" |
| code outside the families names no remote, and reaches no family's module but through an entry | `codec/test/generic.test.ts`: "code outside the families names no remote but in the modules of the debt list...", with its control; every family's folder read off the directory since 7.3.9, where it named two |
| no family imports another | the same file: "no family imports another family's module, so each is reached through the registry alone", and its control (since 7.3.9) |
| the codec's core loads anywhere, Node only in `*.node.ts` | `codec/test/mainentry.test.ts`: "no module the codec's main entry reaches imports a Node module or names a Node global", its control, "a source file that uses Node is named *.node.ts or is the Node entry...", "the Node entry carries every name of the main entry..." |
| reading needs no resource | `codec/test/mainentryreads.test.ts`: "the main entry reads every family with no resource supplied, answering as the Node entry does", and its control |
| each main entry an explicit list, no `export *`, each package's subpaths listed | `test/surface.test.ts` in `base`, `bench`, `codec`, `corpus`, `probe`, `silhouettes` and `usb`: "the main entry exports exactly its list, by explicit names", "the package exports exactly its list of subpaths"; the codec's also "the Harmony Touch on the main entry is its view, by explicit names, and no composer" and "the Node entry is the main entry whole and its own list". *No test* for `lab`'s and `testkit`'s, which no product is meant to build on, nor for `keyreader`, which has no `exports` and is bundled |
| every module of a library's `src` reached from an entry, or listed with why | `lab/test/dependencies.test.ts`: "every module of a library's src is reached from one of its entries, or listed with why not", and its control (since 7.3.9) |
| the rails off `usb`'s main entry, `./write` a list | `usb/test/surface.test.ts`: "the rails are off the main entry but for the refusal a caller meets, and whole on a subpath", "the write subpath exports exactly its list", "the package exports exactly its list of subpaths, and no test file"; `usb/test/rails.test.ts`: "the package offers no way to build a request that changes a remote" over every entry |
| the write paths on write subpaths, never a main entry | `corpus/test/write-surface.test.ts`: "the write subpath exports exactly its list, by explicit names", "the two write functions are on the write subpath and on no other entry"; the file write by `usb`'s surface lists |
| the writable units are the library's, refused before anything opens | `corpus/test/write-config-run.test.ts`: "refuses a label outside the list before it stamps, checks or opens anything"; `usb/test/file-family-run.test.ts`: "refuses a label outside the library's list before the container is judged or anything is opened", "holds the units the script's table held, and the script's table is the library's"; `corpus/test/touch-answer.test.ts`: "refuses a label outside the library's list with both flags set...", "holds one Touch, and the script names it from the library rather than a copy of its own" |
| the journal required | the type check: the line sink is a required option of `writeConfiguration` and `writeFileFamilyConfiguration` |
| the test kit a development dependency only, imported by tests alone | `lab/test/dependencies.test.ts`: "the test kit is a development dependency only, and nothing but a test imports it" (since 7.3.9) |
| `@harmony/lab` loaded by a library's `src` only where listed | the same file: "a library's src loads @harmony/lab in exactly the modules listed, each with why" (since 7.3.9); FreeHarmony's `test/boundary.test.ts` on its side |
| the lab walk follows no linked folder out | `lab/test/find.test.ts`: "the walk follows no linked folder out of the lab and ends on a loop of links" |
| one reader for every script, `--help` runs nothing | `lab/test/scripts.test.ts`: "every script that runs reads its command line through @harmony/lab/cli, once", "no script reads process.argv itself...", "the call is the first thing a script runs"; `lab/test/cli.test.ts`: "--help prints the usage and exits 0 before the script runs, wherever it stands" |
| one byte comparison | `base/test/bytes.test.ts`: "no module defines a byte comparison of its own, but this one and those listed", and its control (since 7.3.9). It reads a declaration's shape, so a copy written inline or under another signature passes |
| no experiment in a library's `src`, none imported by it | the unreached module check and the relative import check above (since 7.3.9); a module that is an experiment and is also exported passes both, which review catches |
| names by subject, never by todo step | `tests/test_toolchain.py` `FilesAreNamedBySubject`: `test_no_typescript_file_is_named_by_a_todo_step_but_those_listed`, and its control (since 7.3.9). It reads TypeScript file names; a step written as three digits would read as a model |
| a new model through the registry | `registry.test.ts`'s exact counts and `generic.test.ts`'s family folders |
| a module in the folder whose question it answers; a split re-exports its parts | *no test*: which folder a module belongs in is a judgement, and a split is checked once, as 7.3.8 did, not on every commit |

**Run the guard files, not a suite**, after a structural change, each bare:

    node --test packages/lab/test/dependencies.test.ts packages/codec/test/generic.test.ts packages/base/test/bytes.test.ts
    node --test packages/codec/test/mainentry.test.ts packages/codec/test/mainentryreads.test.ts
    node --test 'packages/*/test/surface.test.ts' packages/corpus/test/write-surface.test.ts
    NO_COLOR=1 PYTHONPATH=src:tests python3 -m unittest tests.test_toolchain

## Related

* `code-for-a-family`: the family split at the moment build code is written, its four questions, its checks over a
  diff and its table of every kind of difference met so far. This skill states the families' kinds, where they sit and
  who may reach them; that one is how a builder keeps them apart.
* `writing-a-config`: the rails a configuration must respect, whichever family built it.
* `code-navigation`: ask the language index who imports a module before moving it.
* `finding`: a structural rule that turns out wrong is corrected in place, with the reason.
* `harmony-300-350`: the template family's own facts.
