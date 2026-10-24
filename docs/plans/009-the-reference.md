# Plan 009: the reference

**Status: open.** Written 24 October 2026 for `todo-reference.md` 1.2 and 1.3, which this plan answers
together. It carries out decision 25 and supersedes plan 005 in part: plan 005's three deliverables and its
rules stand, its `docs/spec/` is `reference/`, its committed static site is a site built on every push and
never committed, and its steps are `todo-reference.md`'s chapters. When this plan is accepted, plan 005's
status line reads "superseded in part by plan 009".

The raw material is the two inventories of `todo-reference.md` 1.1: inventory A, of `docs/` (with
`docs/config-format.md`, `docs/usb-protocol.md`, `docs/host-client.md`, `docs/status.md` and
`docs/myharmony/` each read section by section), and inventory B, of `reference/`, the root documents and
the facts restated in skills. They are not in the repository (see the open questions), so this plan holds
everything a step needs to start: the layout, the move table, the order and the risks. A step that needs a
row's detail, its duplicates or the stale statements it names reads the inventory row.

## Decisions taken for this plan

Taken before the plan was written, and not reopened here:

* **The Harmony One gets its own architecture folder.** So do the Harmony 880/885 (architecture 8), the
  Harmony 890/895 (architecture 10) and the Harmony Touch.
* **The Harmony 880/885 and 890/895 get full folders**, a model folder in the ten file shape of the bench
  models and an architecture folder, holding everything the project knows about them. A Harmony 885 is
  about to join the bench, so these folders have to be ready to be filled the way the 650's was. Until it
  arrives, what is known only from contributed configurations and images says so in its footnote.
* **The Harmony Touch keeps its model folder and gets an architecture folder**, thin if that is all that is
  known, covering its family. The disagreement between the architecture its specification states, 18, and
  the one the remote reports, 17, is that folder's open question and not this plan's.
* **The drawings stay in one shared generated folder**, `reference/silhouettes/`, linked from the model pages.
* **`reference/button-maps.md` is split**: the per model tables become data the drawings already hold, in
  `packages/silhouettes`, generated into each model's keys page; the derivation through accounts goes to
  the archive or the test notes; the five readers are rewritten.
* **Test accounts and our units go to `docs/test-notes/`.** Prediction documents, tool notes, the lab
  register, the checksums and the list of disproved claims go to `docs/`.
* **Names, lab paths and handles become the kind of evidence** in the reference. The archive keeps them.
* **The reference never mentions the third party copy of Logitech's device database** (decision 15's
  checkout), its repository, its author, or that this project holds a copy. A fact that came out of it may
  stay as knowledge, and its footnote says only that Logitech states it. Everything about the copy itself
  (where it is, how it is read, `packages/lab`'s handling of it, decision 15, the converter) is bookkeeping
  and stays in `docs/`. Logitech's own catalogue concepts, such as protocol families and command names, are
  knowledge.
* **What Logitech's compiler writes into a file is reference knowledge.** This project's own design choices
  (letters, colours, the empty configuration, the recipe) stay in `docs/` as decisions.
* **The frozen archive may have its links to moved files corrected and short fixed anchors added to its
  headings**, `#s424`, and nothing else.
* **`CLAUDE.md` keeps instructions, rails and pitfalls**; facts about models move to the reference with a
  pointer left behind.
* **Contradictions the inventories found are settled by checking them in the step for that model or
  subject**, not here. The list of which step owns which is at the end of the move table.
* **Written in layers**: each subject opens in plain words and grows technical further down.
* **The website**: MkDocs with the Material theme, pinned, built by a GitHub Action from `reference/` on every
  push, never committed.

Settled by this plan where the inventories disagreed or asked, each with its reason:

1. **The configuration format is a folder, `reference/config-format/`**, not one file. It is 6246 lines over
   ten subjects; code comments cite its subsections by name, and a split by subject turns those into file
   paths that a link check can verify; the website wants a page per subject.
2. **The USB protocol is a folder** for the same reasons, 2086 lines. **The host client document is not a
   folder of its own**: it joins `reference/logitech/`, because `todo-reference.md` 4.5 groups Logitech's
   data model, software and device catalogue as one subject.
3. **Architecture folders are named for the models a reader holds**: `harmony-880-885` and
   `harmony-890-895`, like `harmony-600-650-700` and `harmony-300-350`. `harmony-5xx` keeps its name, since
   it is a series of seven models and renaming it would rewrite every reader for no gain.
4. **Model folders for regional pairs carry one name, as `harmony-525` covers the 520 too**: `harmony-885`
   holds skins 15 and 17 (the 880 and the 885, one remote with two regional names), named for the bench unit
   that is coming, and `harmony-890` holds skins 19 and 23 (the 890 and the 895), named for the remote the
   contributed configurations came from.
5. **The operating concept is `reference/how-a-harmony-works.md`**, not `behaviour.md`: every model folder
   already has a `behaviour.md`, and the skill, `CLAUDE.md` and FreeHarmony use this name.
6. **Logitech's data model sits at `reference/logitech/data-model/`**, not `reference/myharmony/`, for the
   grouping in point 2.
7. **`reference/models.md` and `reference/capabilities.md` are split by subject** (inventory B kept the first
   and merged the second into it): the model index to `reference/remotes/README.md`, architectures and
   protocol families to `reference/architectures/README.md`, Logitech's own product list to
   `reference/logitech/product-line.md`, per model rows to the model folders.
8. **The glossary splits**: Harmony and standard words to `reference/glossary.md`; the project's process
   words (corpus, lab, rail, fact marker, superseded, golden vector) stay at `docs/glossary.md`, so links to
   those keep their path.
9. **There is no client sourced ledger file.** A fact believed on the word of Logitech's client carries the
   evidence words "Stated by Logitech, in their client" in its home; a search for those words is the
   ledger. One home per fact rules out a second list.
10. **Prediction documents go to `docs/predictions/`**, renamed by model, with the predictions inside the
    525 memory map as their own file.
11. **`docs/adding-a-device.md`, `docs/emulator-design.md` and `docs/how-an-activity-is-built.md` stay where
    they are as records**: FreeHarmony cites the first, renumbering them as plans would break the rule that
    plans are numbered in the order written, and their knowledge leaves them by the move table.
12. **`reference/ghidra_functions.txt` is removed**: unchanged since the first commit, it names no image, and
    `bin/setup-ghidra.sh` now writes a fresh one to `tools/ghidra/`.
13. **Lab fixture names describe the bench.** A footnote names an archive section or a test, never a fixture.
14. **No stub files at old paths.** The archive's links are corrected instead, which the decision allows, and
    FreeHarmony's mentions are rewritten in a commit there.

## 1. The target layout

```
reference/                          how a Harmony works; never our bench
  README.md                         introduction: what a Harmony is, how to read this, how evidence is marked
  how-a-harmony-works.md            activities, device mode, the screen, sequences, help, held keys
  glossary.md                       Logitech's words, standard words and this project's names for structures
  remotes/
    README.md                       every model: skins, architecture, platform, standing per field (generated table)
    harmony-300/  harmony-350/  harmony-525/  harmony-600/  harmony-650/  harmony-700/
    harmony-885/  harmony-890/  harmony-one/  harmony-touch/
                                    each the same ten files: README, keys, display, features, behaviour,
                                    hardware, memory, firmware, usb, misc
  architectures/
    README.md                       what an architecture is; the comparison table; which model sits on which;
                                    the three protocol families; platform codenames
    harmony-300-350/                README, firmware, memory, misc, usb
    harmony-5xx/                    README, firmware, memory, misc, usb
    harmony-600-650-700/            README, compiler, firmware, memory, misc, usb
    harmony-880-885/                README, firmware, memory, misc, usb
    harmony-890-895/                README, firmware, memory, misc, usb
    harmony-one/                    README, compiler, firmware, memory, misc, usb
    harmony-touch/                  README, firmware, usb (thin)
  config-format/
    README.md                       what a configuration is, conventions, the one base slot index
    container.md                    header, cookies, section table, base address, checksum, arrival checks,
                                    pointer arrays, slot maps for every architecture, the metadata archive
    ezhex.md                        the file wrapper a host receives
    header-records.md               base slots 0 (name tree), 1 (architecture record), 3 (timestamp)
    modes-and-keys.md               base slots 6, 8, 9, 17; tagged lists; the key table; the key lookup stack
    activities-and-devices.md       which key starts which activity, which devices a config drives, the
                                    seven structures of an activity
    actions.md                      base slot 10 and the action list language
    state.md                        base slots 2, 4, 12, 13, 14, 15, 16
    screens.md                      the screen language, pictures, the picture bank, fonts, text
    infrared-records.md             base slot 5: records, groups, blocks, classes 1 and 5
    layout.md                       how Logitech's compiler places and orders a container
    relocation.md                   stated against implied positions, what growing a section costs
  usb-protocol/
    README.md  transport.md  commands.md  version-block.md  bootloader.md  file-protocol.md
  infrared/
    README.md                       how a code becomes light, in plain words
    frames.md                       bit frames, biphase, cell tables, rhythms
    families.md                     the rhythm table, families named by Logitech's catalogue, stated rows, tails
    sending.md                      sends per press, held keys, long press, power hold, block spelling, carrier
  logitech/
    README.md                       Logitech's world in plain words: products, software, services, what is alive
    product-line.md                 the discontinuation notice, the model list, the live catalogue
    clients.md                      the classic client, MyHarmony, Harmony Desktop, the manuals as sources
    classic-client.md               what the classic client does on the wire
    service.md                      the configuration service: surface, operations, behaviour
    update-service.md               the software update service and the recovery tool
    device-catalogue.md             Logitech's device catalogue: its categories, how it names devices,
                                    commands and protocol families; nothing about any copy of it
    data-model/                     model.md, entities.md, core-model.mmd, model.json, operations.json
  silhouettes/                      the generated drawings, shared, as now

docs/                               the project's bookkeeping
  README.md  status.md  decisions.md  glossary.md
  findings.md                       the frozen archive, anchors added
  plans/                            001 to 009
  test-notes/
    README.md                       every unit on the bench, its model, whether it may be written
    accounts.md                     the test accounts and what each holds
    corpus.md                       the contributed and compiled configurations and where each came from
    harmony-300.md  harmony-350.md  harmony-525.md  harmony-600.md  harmony-650.md
    harmony-700.md  harmony-one.md  harmony-touch.md   (harmony-885.md when the unit arrives)
  predictions/
    harmony-300.md  harmony-300-programmed.md  harmony-350-programmed.md  harmony-525.md
    number-sender.md  power-hold.md  sequence-delay.md
  adding-a-device.md  emulator-design.md  how-an-activity-is-built.md  lab-excavation.md
  recipe.md  review-before-first-write.md  two-repositories.md
  checksums.md  concordance-notes.md  lab-register.md  superseded.md
```

**Room for the Harmony 885.** Its model and architecture folders exist from the start in the full shape, so
the unit's arrival adds content and changes no path: a measured fact replaces a footnote that says
"Measured in configurations" or "Not checked", the unit's own notes start `docs/test-notes/harmony-885.md`,
and its drawing goes through the `draw-remote` skill into `packages/silhouettes`, which fills the generated
keys and display blocks that until then say no drawing exists.

### The website's navigation

The order a reader meets, as top level tabs:

1. **Introduction**, `reference/README.md`.
2. **How a Harmony works**, `reference/how-a-harmony-works.md`. This comes before the remotes, which is the
   one place the order differs from the brief: every model page assumes activities and device mode, the
   page is plain words throughout, and `CLAUDE.md` makes it the first thing to know.
3. **Remotes**: the model index, then the models by number (300, 350, 525, 600, 650, 700, 885, 890) and
   the One and the Touch. Inside a model the pages run in layers, the way a person meets the remote first:
   overview, keys, display, features, behaviour, then hardware, memory, firmware, USB, other.
4. **Architectures**: the comparison page, then each family: overview, compiler where there is one, memory,
   firmware, USB, other.
5. **The formats**, three groups: the configuration file (README, container, header records, modes and
   keys, activities and devices, actions, state, screens, infrared records, layout, relocation, the EZHex
   wrapper last as the outermost layer), talking to a remote (README, transport, commands, version block,
   bootloader, file protocol), infrared (README, frames, families, sending).
6. **Logitech's world**: README, product line, clients, classic client, service, update service, device
   catalogue, data model (model.md, with entities.md as its full listing).
7. **Glossary.**

The archive is published beside the reference but not in the navigation; see step 7.1.

## 2. The move table

Abbreviations: **CF/** `reference/config-format/`, **U/** `reference/usb-protocol/`, **IR/**
`reference/infrared/`, **L/** `reference/logitech/`, **R/m/** `reference/remotes/harmony-m/`, **A9/**
`architectures/harmony-5xx/`, **A12/** `architectures/harmony-one/`, **A14/**
`architectures/harmony-600-650-700/`, **A16/** `architectures/harmony-300-350/`, **A8/**
`architectures/harmony-880-885/`, **A10/** `architectures/harmony-890-895/`, **AT/**
`architectures/harmony-touch/`, **AR** `reference/architectures/README.md`, **RR** `reference/remotes/README.md`,
**TN/** `docs/test-notes/`, **PR/** `docs/predictions/`, **codec header** the header comment of the codec
module that builds the thing described.

"Primary" is where the section goes in step 2.1, whole and unedited. "Leaves later" is what the owning step
then takes out of it. "Drop" means the archive section named already holds it; the owning step deletes it
and leaves the footnote. Line numbers are as the inventory read them; the split script cuts by heading.

### Whole files

| file | target | step |
|---|---|---|
| `reference/superseded.md` | `docs/superseded.md`; names in its rows rewritten impersonally | 2.1 |
| `reference/lab-register.md` | `docs/lab-register.md` | 2.1 |
| `reference/checksums.md` | `docs/checksums.md`; leaves later: load addresses to each architecture's firmware.md (3.2, 3.5), the 65534 byte read clamp to U/commands.md (4.2), the update service route to L/update-service.md (4.5), the arch 8 bootloader and arch 10 read notes to A8/ and A10/ (3.5), public samples' provenance to TN/corpus.md | 2.1 |
| `reference/concordance-notes.md` | `docs/concordance-notes.md`; leaves later: the firmware image header checksum to the architectures' firmware.md, the arch 8 firmware region and serial at `0x000110` to A8/ (3.2, 3.5) | 2.1 |
| `reference/ghidra_functions.txt` | removed | 2.1 |
| `reference/device-categories.md` | L/device-catalogue.md; its pointer to icons kept in the lab is rewritten without the lab (4.5) | 2.1 |
| `reference/silhouettes/*.svg` | stay | |
| `reference/remotes/README.md` | `reference/README.md` as the introduction's seed (index and standing words, the standing words rewritten as the footnote convention); "Adding a model" to the `draw-remote` skill; a new RR is written in 3.4 | 2.1 |
| `reference/button-maps.md` | split in 3.3: the two tables become drawing data generated into R/one/keys.md and R/600/keys.md (and the 650 and 700 through the shared drawing); the three rules, voting and the completeness check drop to findings section 133; "what is not decided" is settled against section 323 (600) and 398 (One); "what is deliberately not here" to the `draw-remote` skill; provenance to TN/accounts.md; file removed | 3.3 |
| `reference/capabilities.md` | split in 3.4: intro, source standing, field standing, long press list and rationale to RR; the 22 row skin table becomes RR's generated table from `MODELS_BY_SKIN`; the six models' service statements to each R/m/features.md (they already restate it) with the filed answers' location to TN/accounts.md; key counts to each R/m/keys.md; regional names and the 885's face to R/885/; the silhouette digression to the `draw-remote` skill or dropped; the wish list to `todo-later.md`; file removed | 3.4 |
| `reference/models.md` | split in 3.4: Source and the list verbatim to L/product-line.md; "By architecture", "the number range", "three protocol families" and platform codenames (Gin, Molson, Mocha, Espresso, Cappuccino) to AR; skin tables to RR's generated table; the live catalogue to L/product-line.md; the Touch's enumeration as `0x046D:0xC12B` and the refuted configuration path to R/touch/usb.md; arch 8 and 10 rows to A8/ and A10/ READMEs; "what this project holds" column to TN/corpus.md; "Not recorded here" dropped; file removed | 3.4 |
| `reference/architectures/*`, `reference/remotes/*` | see "Models and architectures" below | 3.x |
| `docs/myharmony/` (model.md, model.json, operations.json, entities.md, core-model.mmd) | L/data-model/; the hand area count table in model.md dropped for entities.md's generated headings (4.5) | 2.1 |
| `docs/predictions-arch16-harmony-300.md` | PR/harmony-300.md | 2.1 |
| `docs/predictions-arch16-harmony-300-programmed.md` | PR/harmony-300-programmed.md | 2.1 |
| `docs/predictions-arch16-programmed.md` | PR/harmony-350-programmed.md | 2.1 |
| `docs/predictions-number-sender.md` | PR/number-sender.md | 2.1 |
| `docs/predictions-power-hold.md` | PR/power-hold.md; the held power rule, `ceil(hold / length)`, written nowhere else, to IR/sending.md (4.3), stated as Logitech's `{command, durationMs}` without the copy it was read in | 2.1 |
| `docs/predictions-sequence-delay.md` | PR/sequence-delay.md | 2.1 |
| `docs/how-a-harmony-works.md` | `reference/how-a-harmony-works.md`; leaves later (4.4): each model's way in and out of device mode to R/m/behaviour.md (the 885's to R/885/behaviour.md, stated by Logitech); the One's four touch keys and click to R/one/; the counts 1096 of 1105, 131, 62 of 62 to CF/modes-and-keys.md; screenless remotes hold one activity to A16/README.md; pause encoding and queue peak to CF/actions.md; "the rule this document is for" stays in the skill and `CLAUDE.md`; names rewritten as evidence | 2.1 |
| `docs/glossary.md` | `reference/glossary.md`; "The corpus" and the process words of "Tooling and process" stay at `docs/glossary.md` | 2.1 |
| `docs/growing-a-config.md` | CF/relocation.md, its `growth_*` fact markers with it; the six relocation steps become `relocate.ts`'s header (4.1) | 2.1 |
| `docs/memory-map.md` | 3.2: Addressing to U/commands.md (corrected to the odd count rule); execution models, the mirror and the top of program memory to AR; the rest dropped; file removed | 3.2 |
| `docs/memory-map-one.md` | 3.2: flash and internal memory long form to A12/memory.md, merged with the architecture rows of R/one/memory.md; "three Ones read" to TN/harmony-one.md; open questions to A12/memory.md "Not checked", the stale one about the internal images settled; file removed | 3.2 |
| `docs/memory-map-600.md` | 3.2: architecture rows to A14/memory.md, the 0.2 build's data memory under a per build heading; the 600's own rows to R/600/memory.md; this unit's records and delays to TN/harmony-600.md; the 2 MiB argument dropped to section 88; file removed | 3.2 |
| `docs/memory-map-700.md` | 3.2: model rows to R/700/memory.md, the install clamp `0x1EC00` to A14/firmware.md; arrival, repair and what the unit settled to TN/harmony-700.md; the published pair to TN/corpus.md; file removed | 3.2 |
| `docs/memory-map-525.md` | 3.2: external flash, windows, internal memory and the clock outcome to A9/memory.md and A9/firmware.md; the bcdDevice rule to U/transport.md; class 5 to CF/infrared-records.md; the safety hazards to A9/firmware.md (the permission stays in `CLAUDE.md`); predictions and their scoring to PR/harmony-525.md; sessions to TN/harmony-525.md; its `coverage_h525_config` marker with its sentence; file removed | 3.2 |
| `docs/two-repositories.md` | stays whole as the home of everything about the copy of Logitech's database (source, provenance, decisions 11 and 15, the converter); from lines 117 to 269 only Logitech's own facts leave, in 4.3 and 4.5: the notation grammar, rhythm table, cell tables and several rhythm families to IR/families.md, how the catalogue names devices and commands to L/device-catalogue.md, the live service routes to L/service.md, each footnoted as stated by Logitech | 4.3, 4.5 |
| `docs/adding-a-device.md` | stays as a record; the One's key census to R/one/keys.md (3.1); catalogue facts (33 families, base 4) to IR/families.md as Logitech's (4.3), the counts over the copy (2921 of 2921 codes) staying here; unit facts to TN/harmony-one.md (3.1) | 3.1, 4.3 |
| `docs/how-an-activity-is-built.md` | stays as plan 003's record; its seven structures and the sharing counts to CF/activities-and-devices.md (2.1, primary), leaving a link; the scoring's two facts to CF/ and R/one/display.md (4.1) | 2.1 |
| `docs/emulator-design.md`, `docs/lab-excavation.md`, `docs/review-before-first-write.md`, `docs/recipe.md`, `docs/decisions.md`, `docs/README.md` | stay; `docs/README.md` rows naming moved files rewritten in 2.1; decision 16's body keeps its arch 8 and 10 facts as its record, restated with footnotes in A8/ and A10/ (3.5) | 2.1 |
| `docs/findings.md` | stays, frozen; anchors and link corrections only | 2.2 |
| `docs/plans/*` | stay; link targets corrected only | 2.1 |
| `README.md` | stays; "Where we stand" becomes a pointer to `docs/status.md`; the details table names `reference/`; the backup block's `concordance -f` wording corrected (the block is read by `tests/test_concordance_notes.py`) | 6.1 |
| `CLAUDE.md` | sections in its own table below | 6.1 |
| `.claude/skills/*` | in their own table below | 6.2 |

### `docs/config-format.md`, by section

Moved to CF/README.md with `git mv` first, so its history follows the largest piece, then cut.

| lines | section | primary (2.1) | leaves later (4.1 unless named) |
|---|---|---|---|
| 1 to 23 | preamble | CF/README.md | stale scope sentence rewritten |
| 24 to 82 | Outer container | CF/container.md, the paragraph `tests/test_gspm.py` quotes moved verbatim | the two correction paragraphs drop to sections 143 and 194 |
| 83 to 143 | per architecture cookies | CF/container.md | the arch 10 consequences to A10/memory.md (3.5) |
| 145 to 189 | Recovering the base address | CF/container.md | blockquotes drop to 76, 117, 122; the `0x820000` address spaces stay in A9/memory.md |
| 191 to 229 | the section table at `0x0B` | CF/container.md | correction drops to 20 |
| 231 to 320 | EZHex | CF/ezhex.md | the "no configuration has been changed" sentence corrected |
| 322 to 373 | trailer checksum; arrived against parses | CF/container.md | |
| 375 to 475 | what decides each byte of the frame | CF/layout.md | the empty One's forms to A12/compiler.md; fixture names to TN/corpus.md |
| 477 to 604 | the firmware's own wiring on arch 14 | A14/compiler.md | |
| 606 to 704 | the firmware's own wiring on the One | A12/compiler.md | the empty One paragraph is our build: codec header |
| 706 to 782 | Sections | CF/README.md | merged with 6167 to 6224 into one index; populations to TN/corpus.md; the designer's hint drops |
| 784 to 815 | base slot 1, arch 10 placement | CF/header-records.md | merged with 4998 to 5084; arch 10 placement to A10/memory.md (3.5) |
| 817 to 880 | base slot 2, the log area | CF/state.md | per model regions to the memory files; "already full on both Ones" to TN/harmony-one.md |
| 882 to 990 | base slots 4 and 6 | CF/state.md; CF/modes-and-keys.md | device mode's product sense stays in `reference/how-a-harmony-works.md`, linked |
| 991 to 1560 | arch 14 device lists, device pages, menus, activity screens, texts, fonts, tour, delays prelude | A14/compiler.md | the One's texts and joiner (1313 to 1363) and Logitech's sixteen font sets (1365 to 1445) to A12/compiler.md; our faces and blending to decisions 22 and 24; the bench column and 1.506 s timing to TN/harmony-650.md, the behaviour to R/650/features.md; per compile mode lists to TN/corpus.md |
| 1562 to 1640 | key table is the first mode record; a mode's pages; tagged lists | CF/modes-and-keys.md | merged with 5991 to 6045 |
| 1642 to 1777 | base slot 9 | CF/modes-and-keys.md | contributor handle replaced by evidence |
| 1778 to 1858 | arch 14 entry 1 and an activity's key map | A14/compiler.md | test account statements to TN/accounts.md |
| 1861 to 1946 | base slot 14 | CF/state.md | case order to CF/layout.md; the One's working screen record to A12/compiler.md |
| 1948 to 2116 | screen language; what opcode 2 draws | CF/screens.md | the 525's page addressed controller to A9/firmware.md; correction drops to 85 |
| 2118 to 2303 | picture bank; what fills the region | CF/screens.md | One specifics to R/one/display.md; our transparency is a choice: codec header and a decision to write (4.1 lists it); the region story drops to 51, 54, 55 |
| 2305 to 2389 | base slot 11 | CF/screens.md | arch 14 corner program to A14/compiler.md; our corner programs: codec header and a decision to write; the One's table to A12/compiler.md |
| 2391 to 2465 | base slot 7, fonts | CF/screens.md | arch 10 sets to A10/memory.md (3.5) |
| 2467 to 2500 | arch 9 two bit glyphs | R/525/display.md | one line stays in CF/screens.md |
| 2502 to 2555 | glyph codes and text recovery | CF/screens.md | |
| 2557 to 2616 | the One's pads, device pages, assistant, key lights | A12/compiler.md | the spare One confirmation to TN/harmony-one.md; what a person sees to R/one/display.md |
| 2618 to 2801 | base slot 17, the hit map | CF/modes-and-keys.md | geometry and transform to R/one/display.md; hit pages built to A12/compiler.md; units named to TN/harmony-one.md |
| 2803 to 2842 | screen sections by category, arch 14 | A14/compiler.md | our picture rules: codec header; the fixture table to TN/corpus.md |
| 2844 to 3178 | screen sections, the One | A12/compiler.md | the empty One and the composed setup: codec header and TN/harmony-one.md; the stale "unconfirmed until 7.2" settled |
| 3180 to 3190 | which screen the 3.4 firmware draws | A12/firmware.md | R/one/display.md links |
| 3192 to 3310 | base slot 15 | CF/state.md | the One's group meanings to A12/firmware.md; per model values to the model files |
| 3312 to 3365 | base slot 12 | CF/state.md | glow time to the model features.md files |
| 3367 to 3461 | base slot 16 | CF/state.md | the misplaced arch 16 group paragraph to A16/memory.md; the bench read to TN/harmony-350.md; a name removed |
| 3463 to 3642 | base slot 13, the clock records | CF/state.md | per architecture variable meanings to the memory files; merged with 5724 to 5733 |
| 3644 to 3761 | delays and the saved delay | CF/state.md | the restore program to A14/compiler.md; the store layout to A14/memory.md; the USB append to U/commands.md; bench writes to TN/harmony-600.md, -650, -700 |
| 3763 to 3850 | a device's inputs; state tables built | A14/compiler.md | the One's half to A12/compiler.md |
| 3852 to 3993 | base slot 5 records | CF/infrared-records.md | the 890's 300 records and the 895's none to A10/memory.md (3.5); history drops to 139, 141 |
| 3995 to 4286 | class 1 bit frame, biphase, cell table, rhythms | IR/frames.md and IR/families.md | the arch 8 records with a toggled copy named in IR/frames.md and A8/memory.md |
| 4288 to 4370 | class 5; once, held and tail | CF/infrared-records.md | arch 9 detail to A9/; repeat rate as a person meets it to `reference/how-a-harmony-works.md` |
| 4371 to 4406 | the metadata archive, arch 16 slots | CF/container.md | arch 16 detail to A16/memory.md; arch 10 detail to A10/memory.md |
| 4408 to 4570 | sends per press, codes, block spelling | IR/sending.md | the compiler's power wiring to A14/compiler.md |
| 4572 to 4612 | group checks | CF/infrared-records.md | the stale "header not established" corrected |
| 4614 to 4678 | base slot 8 | CF/modes-and-keys.md | per architecture label rows to the keys files |
| 4680 to 4790 | slot 0, the name tree | CF/header-records.md | node order to CF/layout.md |
| 4792 to 4996 | which key starts which activity; which devices | CF/activities-and-devices.md | the arch 14 seeding guard to A14/firmware.md; the 650 restart to R/650/behaviour.md and the run to TN/harmony-650.md; the contributor check to TN/corpus.md |
| 4998 to 5084 | slot 1 again | CF/header-records.md | merged with 784; sample pointer table to TN/corpus.md; "Dutch units" to TN/ |
| 5086 to 5172 | slot 3, the timestamp | CF/header-records.md | corrections drop to 138, 322; the 700 pair's direction warning stays here |
| 5174 to 5215 | six arrays of three byte pointers | CF/container.md | stale "not yet established" corrected |
| 5217 to 5915 | base slot 10 and the action language | CF/actions.md | the arch 9 ring to A9/memory.md; arch 9 re-validation to A9/firmware.md; the tour to A14/compiler.md; the One's band `0xC0` to A12/firmware.md; the click convention to A12/compiler.md; where arch 8 keeps its power on delay to A8/memory.md; bench runs to TN/; names removed; stale `0x73`, `0x6C`, `{0x7A; 0x6C}` statements settled |
| 5917 to 5959 | the rest of the inventory | drop to 37, 73 | |
| 5961 to 5989 | one table, four architectures | CF/container.md | extended to arch 10 and 16 |
| 5991 to 6064 | the key table; scan arithmetic per architecture | CF/modes-and-keys.md | per architecture lattices to the keys files, arch 8's to R/885/keys.md |
| 6066 to 6076 | hash bucket order | CF/layout.md | the same rule for the name tree and value cases merged here |
| 6078 to 6141 | arch 8 and 12 code ordering; arch 14 table; arch 9 binding; not the button map | drop to 315, 17, 16, 311 | arch 9's binding to R/525/keys.md, the owner's count to TN/harmony-525.md |
| 6143 to 6165 | infrared parameter block | IR/sending.md | |
| 6167 to 6224 | what is known, by base slot | CF/README.md | merged into the one index |
| 6226 to 6246 | open questions | `docs/status.md` open list | answered ones dropped |

### `docs/usb-protocol.md`, by section

Moved to U/README.md with `git mv` first, then cut. Section numbers here are the document's own, which
code comments cite; each such comment is rewritten to a file.

| section | primary (2.1) | leaves later (4.2 unless named) |
|---|---|---|
| preamble | U/README.md | status lines dropped |
| 1, transport, host notes, closures, the one differing byte | U/transport.md | per model values stay in R/m/usb.md only; closures drop to their sections |
| 1, confirmed against the bench remote | TN/harmony-600.md | the measured standing to U/transport.md |
| 1, bcdDevice in two encodings | U/transport.md | the 525's second descriptor to A9/firmware.md; the 890's form and the arch 8 `0x0811` case to A10/usb.md and A8/usb.md (3.5) |
| 2, attach, buffers, buffer to handler | A14/firmware.md, a USB stack section | |
| 3, the first byte, command table, parse and execute, learn bracket, escape, restart, responses, requests | U/commands.md | handler addresses to A14/firmware.md and A12/firmware.md; the arch 9 erase to A9/usb.md; the 525's first write to TN/harmony-525.md |
| 3, `0x10` with a payload | A14/usb.md | |
| 3, GET_VERSION | U/version-block.md | |
| 3, READ_MISC, WRITE_MISC, READ_FLASH, WRITE_FLASH, the classifier, the state machine, state 4 | U/commands.md | per architecture parts to each architecture's usb.md and firmware.md; the arch 12 interlock and validator to A12/firmware.md; "sent to" lines to TN/; dead attributions drop to 22, 91, 94, 175 |
| 4, intro and unit table; every remote against its backups; predictions for the 600 and the second One | TN/harmony-600.md, TN/harmony-one.md | facts to A14/memory.md and A12/memory.md; narratives drop to 22, 23, 59 |
| 4, the flash read; live RAM; still open | U/commands.md | |
| 4, field count; twelve bytes | U/version-block.md | the arch 8 rows of the literal table named in A8/firmware.md |
| 4, internal memory two pages | U/commands.md | page contents to A12/memory.md and A14/memory.md |
| 4, the arch 12 flash map | A12/memory.md | |
| 4, how the prediction did; the three offsets | drop to 22, 59, 94, 96 | the odd count hazard stays in U/commands.md |
| 4, answered since | drop | |
| 4, the One drops its first command | R/one/behaviour.md | stale "cannot be said why" settled against 155 |
| 5, the bootloader | U/bootloader.md | |
| 6, the file based family | U/file-protocol.md | the request framing in R/touch/usb.md absorbed here; skin 96 under "Not checked"; "what this means for packages/usb" dropped |
| 7, against Logitech's client | L/classic-client.md | one line and the section link in U/README.md |
| Corroboration | U/README.md | |

### `docs/host-client.md`, by section

Moved to L/clients.md with `git mv` first, then cut.

| section | primary (2.1) | notes |
|---|---|---|
| preamble; manuals as a third source; Desktop as a fourth; MyHarmony checked; the guided setup | L/clients.md | the 880 manual's learned code fact to IR/README.md (4.3) |
| why the rule changed; the rule; the ledger intro; confirmed and moved out; where the extraction lives | drop | decision 9 holds the rule; rule 5 to the `finding` skill (6.2); the ledger is the footnote words |
| the client is not an authority (its arch 8 constants); what it confirms; session from Desktop; liveness ping; write transfer; identity erase; state variables by name; region index space; where a region read may go; every byte write read back; its own bounds | L/classic-client.md | A8/memory.md links the arch 8 calibration note (3.5) |
| the service API; measured surface; button maps read; browser sign in; confirmed 21 August; DetectLanguage; product lists; adding a remote; a sync is recorded; the compile refuses arch 9; what the analysis service takes; serial validation | L/service.md | the account before and after to TN/accounts.md; the `KeyCode` grammar to IR/families.md; the arch 9 refusal also named in R/525/features.md; the Touch's sync branch to R/touch/features.md |
| what the clients offer around a learned code | L/data-model/model.md | capability flags to RR (3.4) |
| a config is invalidated before it is written | drop | U/commands.md holds it |
| no factory reset over the command protocol | U/commands.md (client codes) | the network reset and the Linux generation to L/update-service.md and AT/firmware.md; the reset once performed on a Touch to TN/harmony-touch.md |
| base slot 2's event log | CF/state.md | marked stated by Logitech, in their client |
| arch 14 settings records; arch 12 regions (twice); the arch 9 map disagrees | A14/memory.md, A12/memory.md, A9/memory.md | the "unidentified" against the client's labels settled in 3.2 |
| infrared learning stream | U/commands.md | |
| the whole arch 12 config write | U/commands.md, "A configuration write" | the 9450 against 3150 chunk noted there |
| flash block geometry | drop | R/one/hardware.md holds it |
| version reply field map; read selector names | U/version-block.md; U/commands.md | |
| the clock by name | L/classic-client.md | field meanings to CF/state.md |
| smaller leads | A14/memory.md | arch 7's table start to CF/container.md; arch 9 EEPROM to A9/memory.md |
| update service, recovery tool, the service, what it serves | L/update-service.md | the 300 and 350 image to A16/firmware.md; the Touch factory image and the hub images to AT/firmware.md |
| the file based family stated whole | U/file-protocol.md | |

### `docs/status.md`

Stays as bookkeeping: the intro, the byte accounting table (read by `tests/test_documents.py`), the coverage
table, what the corpus holds, where the work stands and the two open lists, about 400 lines. In 2.1 only
what exists nowhere else moves out: the bench paragraph to TN/README.md; the 5.6 minutes a day drift bound
and the calibration words to A12/memory.md; the learn session buffer addresses to U/commands.md; the arch 10
part of "what the corpus holds" to A10/ (3.5). Everything else that states a fact ("Status", "Headline
findings", the commentary, "What moved most recently", about 1900 lines) is a summary of archive sections and
is deleted in 5.1, once the archive check has confirmed each fact is in the reference. Its 47 fact markers are
handled under the risks. The personal names go with the deleted text; what remains is rewritten impersonally.

### Models and architectures

| folder | stays | leaves (step) |
|---|---|---|
| R/650/ | all ten files | misc.md whole to TN/harmony-650.md and the account to TN/accounts.md; bench rows of README, hardware, display, features, behaviour, memory, firmware, usb to TN/harmony-650.md; "images in the lab" to `docs/checksums.md`; keys.md's two populations and what a press raises to A14/README.md; the "tension, reconciled" paragraph to one sentence in A14/usb.md (3.1) |
| R/600/ | all ten | bench rows to TN/harmony-600.md; the calibration configuration to TN/accounts.md; "our one look" points to decision 20; Logitech's service statement stays here and leaves capabilities (3.1, 3.4) |
| R/700/ | all ten | bench rows to TN/harmony-700.md; the published pair to TN/corpus.md, its timestamp warning to CF/header-records.md (3.1) |
| R/one/ | all ten, the platform half moving out | memory, firmware and usb's architecture content and misc's "why no arch folder" to A12/; "What every configuration wires" and the compiler half of display's "What the screen shows" to A12/compiler.md; the hand "Write standing" table replaced by A12/usb.md's generated `write-rails` block; the stranding account and bench runs to TN/harmony-one.md; the arch 14 preference to the `trace-section` skill (3.2, 3.1) |
| R/525/ | all ten | misc predictions to PR/harmony-525.md, the Dutch configuration to TN/corpus.md; "what has been done over USB" and the 51195 bytes to TN/harmony-525.md (3.1) |
| R/300/, R/350/ | all ten each | configurations read, first read and predictions to TN/ and PR/; the serial validation to L/service.md; the factory configuration's families to TN/corpus.md (3.1) |
| R/touch/ | all ten | misc's "why no arch folder" replaced by a link to AT/; the 17 against 18 disagreement (README, misc twice) to AT/README.md as its open question; the first contact history to TN/harmony-touch.md; behaviour's "on the cable" to usb.md, the factory reset to firmware.md; docs/README's Touch rows (`/sys/sysinfo`, `/rf/deviceinfo`, the `0x80` string encoding, paths that are actions, the six configuration spellings tried) to usb.md and U/file-protocol.md, the attempts to TN/harmony-touch.md (3.1) |
| R/885/ (new) | ten files | README: skins 15 and 17, the regional names, the face and its four teletext keys; features: the device count 15 and what the service states; display: 128 by 160 from the picture bank; behaviour: the DEVICE key in and out, and Logitech's advice against device mode, from the manual; keys: the arch 8 lattice; every other file "Not checked" until the unit arrives (3.5) |
| R/890/ (new) | ten files | README: skins 19 and 23; features: the device count; display: 128 by 160 measured on both skins' configurations; usb: the tunnelled family and why no HID command reaches it; memory: the configurations' size and shape; the rest "Not checked" (3.5) |
| A14/ | README, firmware, memory, misc, usb, compiler (new) | firmware's lab filenames to `docs/checksums.md`; misc's "why read firmware here" to the `trace-section` skill and "Configurations in the corpus" to TN/corpus.md; usb's "Units" paragraph to TN/README.md; memory's per unit rows to TN/ (3.2) |
| A9/ | README, firmware, memory, misc, usb | README's "what has been read" column, misc's "why worth the trouble" and corpus, usb's write performed and firmware's "performed once, by hand" to TN/harmony-525.md and TN/corpus.md; the selector 1 contradiction settled here (3.2) |
| A16/ | README, firmware, memory, misc, usb | firmware's per unit versions and misc's corpus to TN/; the `MetaData.xml` note to CF/container.md; "a statement at the bench" reworded as evidence (3.1, 3.2) |
| A12/ (new) | README, compiler, firmware, memory, misc, usb | from R/one/, `docs/memory-map-one.md`, CF ranges, U ranges, the client's region tables, the `CLAUDE.md` key facts column (6.1) and the load addresses from checksums (3.2) |
| A8/ (new) | README, firmware, memory, misc, usb | README: the models on it (720, 785, 880, 882, 885), platform Espresso, what is known only from contributed configurations and images, gathered from `CLAUDE.md` (key facts, rails, the concordance pitfall), config-format, status, decision 16, models.md, capabilities.md, concordance-notes, checksums, usb-protocol, host-client and the skills; memory: the cookies `TPTP`/`DKDK`, the NULL inserted at slot 8, the 21 slot table and the client's wrong 20, where it keeps its power on delay, the toggled copies in 37 records, the code ordering shared with arch 12; firmware: the route through `concordance -b -f`, the firmware region from `0x000000` to `0x020000`, the serial at `0x000110`, the two application images and two bootloaders (software type 3), versions 4.4 and boot 4.0, load addresses; usb: the bcdDevice encoding `0x0811`, field 4 zero meaning safe mode; misc: names (3.5) |
| A10/ (new) | README, firmware, memory, misc, usb | README: the models on it (890, 895, and presumed 890 Pro, 892, 897), platform Cappuccino, contributed configurations only, no firmware, gathered from the same sources plus `docs/README.md`'s tunnelled family paragraphs and the `writing-a-config`, `trace-section` and `probe-remote` skills; memory: no base slot 0 and the architecture stated in raw slot 0, its slot map (generated from its code constant), the metadata archive, its font sets and picture bank, base slot 5's records; usb: the tunnelled family, the bcdDevice form `0x0A`, and the read defect (every read returned 2 to 28 surplus 54 byte chunks, which no checksum catches), with the reader rail that answers it; firmware: "no image exists" (3.5) |
| AT/ (new, thin) | README, firmware, usb | README: the family (the Linux generation and the hub family of Logitech's template map, skins 82, 97, 106, 113, 115), the long press arriving with this generation, and the open question 18 against 17 with both sources; firmware: the image family 4.15.330, the factory image the update service serves for skins 99 and 106, the recovery tool's network reset, `xmppupdate` and the hub images; usb: the file based family as this generation speaks it, the `MD5` write check, provisioning instead of a compile (3.5) |

### `CLAUDE.md`, by section (6.1)

| section | stays | leaves to |
|---|---|---|
| How a Harmony works | a pointer and three instructions: check a 600, 650 or 700 clock by a USB memory read and never ask for a look; a corpus measurement never answers what the product does; ask when the product answer is not written down | `reference/how-a-harmony-works.md` (the 885's device key to R/885/behaviour.md) |
| Decisions already taken | the list | item 5's per architecture RAM facts to A9/usb.md, A12/usb.md, A14/usb.md (its stale arch 14 sentence settled against section 387) |
| Never write to a remote, opening and "Seven units" | the rule, the unit list, the unit check | the per unit write history to each TN/ file; the 525 and arch 14 constants and invalidate semantics to A9/memory.md and A14/usb.md; the bench count to TN/README.md |
| Firmware is never written | the rail | the reinstall and staging mechanics to A14/firmware.md |
| A config write is a sequence | "the eight step sequence, implemented behind the rails" | status codes, the latch per architecture, the clock reseed and 3150 byte transfers to A12/usb.md, A14/usb.md, A9/firmware.md and U/commands.md |
| the other write rails, read only is not harmless | all rails | the mechanisms to the architecture files and U/commands.md; "rehearse-block.ts alone" corrected |
| Never write a bare architecture number | the table, as a conversation aid | rows 17 and 18's facts to AT/README.md; rows 8 and 10 point to A8/ and A10/ |
| Key facts | a pointer | the table's columns to A12/README.md and A14/README.md; cookies, slot 1, slot 3, pointer table, `0x0B` to CF/container.md and CF/header-records.md; the European skins to RR; the One's clock to R/one/behaviour.md; Ghidra and "prefer arch 14" to the `trace-section` skill, one line staying |
| Rails a writer will have to respect | the table, unchanged, its fact markers with it | the "section NNN" placeholder filled |
| Pitfalls, verification, commands, planning, the two repositories, text other people wrote, public repository, plain language, dashes, where things go | stay | "Where things go" rewritten for the layout; "decision 16" kept (a test requires it) |

### Skills (6.2)

| skill | keeps | facts leave to |
|---|---|---|
| `how-a-harmony-works` | the ritual, pointing at `reference/how-a-harmony-works.md` | its stale "device map is open" dropped |
| `writing-a-config` | the checklist and when to load it | each rail's evidence to the "For a writer" subsection of its CF/ file (4.1); stale lines and "section NNN" settled |
| `finding` | the gate | the four places rewritten, see step 6.2 |
| `probe-remote` | the rules and the gate | the odd count mechanism to U/commands.md; the stranding history to TN/harmony-one.md |
| `recovering-a-remote` | commands and the order of checks | mechanisms to A9/firmware.md, A12/firmware.md, A14/firmware.md; stale counts settled |
| `myharmony-service` | the procedure, the API mechanics, the traps | service facts to L/service.md and L/update-service.md; the account map and the serial incident to TN/accounts.md; the Touch's provisioning and the Linux generation list to AT/; the hub generation note to L/clients.md |
| `trace-section` | the method | gains the "prefer arch 14" reading rule and the Ghidra line; addresses it states also in the architecture firmware routine tables |
| model skills: `harmony-one`, `-525`, `-600`, `-650`, `-700`, `-300-350`, `-touch` | procedure | restated facts become links; "Where things live" tables follow the layout; the Touch's names AT/ and U/file-protocol.md |
| `draw-remote`, `gathering-logitech`, others | procedure | stale lines settled; `draw-remote` gains "Adding a model" and the `data-scan` rule |

### Passages that name the copy of Logitech's device database

Nothing in `reference/` names it today; its loose files that do (`checksums.md`, `lab-register.md`,
`superseded.md`) leave for `docs/`. These passages are on their way in, and the step that moves each one
keeps the fact, footnotes it as stated by Logitech, and removes the copy, its repository and its author:

| passage | goes to | step |
|---|---|---|
| config-format 3405 to 3408, "the archive's name" order of the arch 16 groups | A16/memory.md | 3.1 |
| config-format 3782, "the archive does not keep the mark" | A14/compiler.md | 4.1 |
| config-format 4103, "Logitech's device catalogue, archived, states" | IR/families.md | 4.3 |
| config-format 4424, `timing.pressMinRepeats` "in the archive" | IR/sending.md | 4.3 |
| `docs/predictions-power-hold.md` line 9, the rule's source | IR/sending.md (the rule only) | 4.3 |
| `docs/two-repositories.md` lines 117 to 141, the copy as a source | stays in `docs/` | 4.3 |
| `docs/adding-a-device.md` phases 1 to 3, counts over the copy | stay in `docs/`; Logitech's facts only to IR/ | 4.3 |
| `docs/status.md` lines 521 to 530, 861 to 862, 1502, 1808 to 1857 (the archived catalogue, the maintainer's waveforms) | deleted with status's summaries in 5.1; any fact that survives is restated as Logitech's | 5.1 |
| CLAUDE.md "Logitech's device database, archived by a third party, is a source"; the `gathering-logitech` and `myharmony-service` skills where they name it | stay: instructions and bookkeeping, not reference | 6.1, 6.2 |

The archive's own mentions stay, since the archive keeps names and paths. "The live service's device
database", `deviceManager`, is Logitech's and is knowledge.

### Who settles which contradiction

Inventory B's list: 1 to 3 (arrow pairs, 34 against 32, candidates in the drawings) in 3.3; 4, 12 to 16 in
6.2; 5, 6, 11 and the "section NNN" placeholder in 6.1; 7 (the 525's selector 1) and the 600 identity block's
GUID count in 3.2; 8 to 10 (the Xbox 360 remote's architecture, stale model and capability lines) in 3.4; 17
in 2.1; 18 (product id printed as "none") in 3.1 by the generator; 19 (names) by each owning step, with the
2.3 guard. Inventory A's stale items in config-format in 4.1, in the USB and client documents in 4.2 and 4.5,
the data model conflicts (`GetButtonMaps`, `ProtocolList`, `IsEnabled` counts) in 4.5, the memory maps in 3.2,
`docs/README.md` rows in 2.1, decision 6's unit count in 6.1.

## 3. The order of work

The chapters are `todo-reference.md`'s, with one change proposed: **7.1 runs right after 2.1**, so the strict
site build guards every link from chapter 3 on.

Every step, before it is ticked: `make all` green; `make remote-reference` clean; the dash check zero; the
guards of 2.3 green once they exist; and decision 16's question asked of every fact that moved into an
architecture file, whether the claim is as wide as the folder it now sits in. An agent working on a model
loads that model's skill.

**Chapter 1.** 1.2 and 1.3 tick when this plan is accepted.

**2.1, the moves, one agent, sequential commits.** In this order, each commit green on its own:
1. Count the fact markers (`make facts`) and record the number.
2. Whole file moves with `git mv`, each commit holding the moves and the rewrites of every reader of those
   paths, nothing else: the lookup lists to `docs/`, the data model to L/data-model/, the predictions, the
   operating concept, the glossary, growing-a-config, device categories, the remotes README, and the three
   large documents to the README of their new home.
3. The splits, by heading, from the move table: each section appended whole to its primary target under its
   own heading; new folders created with a seed README so every link lands. A content commit, separate from
   the moves so `git log --follow` keeps working.
4. Comment pointers that named a heading of a split document are rewritten to name the file and heading.
5. `ghidra_functions.txt` removed; status's only copies moved; `docs/README.md` rows rewritten; plan and todo
   links corrected.
6. FreeHarmony: one commit there rewriting its mentions (its `CLAUDE.md` and code comments name
   `docs/how-a-harmony-works.md`, `docs/usb-protocol.md`, `docs/host-client.md`, `reference/capabilities.md`,
   `reference/button-maps.md`); nothing there reads them as data and its tests stay green. Repeated after
   3.3 and 3.4 for the two files those remove.

Done when: a grep for every old path finds nothing outside `docs/findings.md`; `make facts` reports the
recorded count; the risky readers below each pass their own check.

**2.2, the archive, one agent, in parallel with 2.3 and 7.1.** A line `<a id="s424"></a>` directly above each
`## 424.` heading, 1 to 436; `<a id="d25"></a>` at the start of each decision in `docs/decisions.md`; the
archive's links to moved files corrected from the same mapping 2.1 used, by script. Done when the archive's
text, with anchor lines removed and link targets blanked, has the same digest as before, and that digest is
pinned in the archive test.

**2.3, the guards, one agent.** The tests in section 5, each shown failing once on a planted violation
before it is relied on.

**7.1, the site, one agent, after 2.1.** `mkdocs.yml` at the root with `docs_dir: reference`, the navigation
of section 1, and validation of links, anchors and omitted pages at warning level under `--strict`; Material
pinned with every transitive dependency to an exact version in `tools/site/requirements.txt`, each checked for
what it pulls in; a hook in `tools/site/hooks.py` that publishes the archive as one page per section under
`archive/` (4 MB is too large for one page, and GitHub does not render it), rewrites a footnote link to
`docs/findings.md#sN` to that page, and rewrites any other link that leaves `reference/` to the file on
GitHub; `site/` in `.gitignore`; `make site` builds locally. Whether Material is still maintained upstream
is checked when it is pinned; a pinned build keeps working either way. Done when the strict build passes and
breaks on a planted broken link.

**Chapter 3, models and architectures.**
* 3.2 first, three agents in parallel, one per architecture with its models' memory files: arch 9 with the
  525, arch 12 creating A12/ out of the One's folder, arch 14 with the 600, 650 and 700. The memory maps go,
  `tests/test_memory_map.py` and `tests/test_harmony_525_flash.py` are rewritten to read their figures in the
  new homes.
* Then 3.1, one agent per bench model folder and its test notes file (300, 350, 525, 600, 650, 700, One,
  Touch), in parallel: bench content out, evidence as footnotes, duplicates replaced by links. No agent edits
  an architecture folder, `CLAUDE.md` or a skill; what belongs there is reported. And 3.5 in parallel: one
  agent builds A8/, A10/, AT/, R/885/ and R/890/ from every source the move table names, adding their
  `REMOTES` and `ARCHITECTURES` rows.
* Then 3.3, then 3.4, one after the other, since both change `packages/silhouettes/bin/remotes.ts`. 3.3
  moves the button map tables into the drawing data, settles the decided arrow pairs there and rewrites the
  five readers; 3.4 writes RR with its generated table and removes models.md and capabilities.md.

**Chapter 4, subjects.** 4.1 by several agents, one per group of CF/ files (container, ezhex and header
records; modes, keys, activities and devices; actions and state; screens; infrared records, layout and
relocation) plus one per compiler file (A12, A14); 4.2, 4.3 and 4.5 one agent each, all in parallel. An
agent edits only its own files and reports anything that belongs elsewhere, applied afterwards. 4.1 lists
our design choices that have no decision yet (the picture transparency, the corner programs, the empty
Harmony One) so a decision can be written; until then the description sits in the codec header. 4.4 after
4.1, since it moves counts into CF/. 4.6 last, since the glossary links the pages the others settle. Done per
file when it opens in plain words, every fact carries its footnote, its internal duplicates are one, its
contradictions from the inventories are checked against the firmware or a test and settled, and code
comments citing its headings still land.

**5.1, the archive check.** Four agents read sections 1 to 110, 111 to 220, 221 to 330 and 331 to 436 and
report, per section: conclusion present (where), missing, or dead. They change nothing. One agent then adds
the missing ones to their homes and the dead ones to `docs/superseded.md`, and only then deletes status.md's
summaries. Done when all 436 are classified and the counts are reported.

**Chapter 6.** 6.1 (`CLAUDE.md` and `README.md`) and 6.2 (skills, by agents per group) in parallel. The
`finding` skill's four places become: the fact in its reference home with its footnote; the argument in the
header of the regression test, since the archive takes nothing new; the regression test; the sweep of
summaries, which now includes `reference/` and `docs/superseded.md`. Done when `CLAUDE.md`'s tests (decision
16, its size) and its fact markers pass, and every skill's trigger description is unchanged.

**7.2.** `.github/workflows/site.yml`: on every push to main, install the pinned requirements, `mkdocs build
--strict`, upload and deploy to GitHub Pages; each action pinned to a commit. Enabling Pages is a repository
setting, so it is asked for rather than done. Done when the first deploy is viewed and the footnote links reach
their archive pages.

### The risky moves and how each is handled

| what | the risk | handled by |
|---|---|---|
| `tools/facts.py` reading `reference/superseded.md` (`SUPERSEDED`), run by `make facts`, `make all` and the pre-commit hook | a wrong path fails every commit, or worse checks nothing | the constant changes in the same commit as the move; `make facts` must report the marker count recorded before 2.1, and a table read as zero rows fails rather than passes |
| the 47 fact markers in `docs/status.md` and 47 in config-format | a deleted paragraph loses its check | markers travel with their sentences; status's are deleted in 5.1 only where `make facts` shows the same marker attached elsewhere, otherwise the sentence moves first |
| `tools/lab_register.py` (`REGISTER`), `bin/lab-register-hook.py`, `make lab-check`, `tests/test_toolchain.py` | the hook fails open, so a broken path is silent | the constant moves with the file; after the move `make lab-check` answers a known path and the hook, run by hand on a lab path, prints its row |
| `packages/silhouettes/bin/remotes.ts` (`REMOTES`, `ARCHITECTURES`) and the ten files test in `remotes.test.ts` | new folders and `compiler.md` fail the shape test; a row without a drawing fails the drawing test | each row declares its folder's files and an optional drawing, and the test checks every folder against its row; a model without a drawing gets keys and display blocks saying none exists |
| `reference/button-maps.md`'s five readers (`packages/codec/bin/catalogue.ts`, `catalogue.test.ts`, `irframe.test.ts`, `packages/silhouettes/test/models.test.ts`, `tests/test_host_client.py`) and `make prontocheck` | five parsers in two languages | rewritten in 3.3 to read the drawing data; the Python test reads the generated keys block, which `make remote-reference` keeps equal to that data |
| `tests/test_gspm.py` quoting config-format's prose | a move or reword breaks it | the paragraph moves verbatim to CF/container.md and the test reads that path; whether the quote becomes a generated statement is decided in 4.1 |
| `tests/test_memory_map.py`, `tests/test_harmony_525_flash.py`, and the citing `test_findings.py`, `test_host_client.py`, `classic-capture.test.ts` | the maps leave | the tests are rewritten to read the figures where they land, never deleted, since the figures stay |
| `tests/test_toolchain.py`'s withhold list in `docs/review-before-first-write.md` | every reference file that states the write transfer must be withheld | the test runs after each move; new paths join the list in the same commit |
| `tools/myharmony_model.py`, `tools/model_pdf.py`, `.gitignore`, `tests/test_myharmony_model.py`, `tests/test_function_maps.py`, `catalogue.test.ts` | generators write to fixed paths | one commit moves the folder and all six; `make myharmony-model` is the check |
| `tests/test_documents.py` | reads status's coverage table and requires "decision 16" in `CLAUDE.md` | the table stays; 6.1 keeps the phrase |
| code comments citing documents by section (about 40 files) | a split breaks the anchor | rewritten in 2.1 step 4 to file and heading; the link test reads Markdown only, so these are found by grep for the old paths |
| FreeHarmony naming our paths | its readers point nowhere | a commit there after 2.1, 3.3 and 3.4 |
| `docs/findings.md` citing moved paths about 190 times | dead links in the archive | corrected in 2.2, link targets only, under the digest check |

## 4. The footnote convention

A fact in `reference/` carries a named footnote. The label says where the argument is; the definition says
what kind of evidence it is, then links.

**Labels**, the only forms there are:

| label | meaning | definition links to |
|---|---|---|
| `[^s424]` | the argument is archive section 424 | `docs/findings.md#s424` |
| `[^s424b]` | the same section backing a fact of a second kind on the same page | as above |
| `[^d25]` | a choice of this project, taken as decision 25 | `docs/decisions.md#d25` |
| `[^t-name]` | established after the archive froze; the argument is in the header of the test that holds it | that test file |
| `[^x-name]` | a public outside source with no archive section, such as the forum comparison table or a repair shop's procedure | that source's public address |
| `[^unchecked]` | not checked | nothing |

A label may be referenced several times on a page and is defined once, at the end of the page, in order of
first use. One footnote names one section; a fact resting on two carries two footnotes.

**Evidence words**, the definition's first words, exactly one of:

* **Read in the firmware.**
* **Measured on a unit.**
* **Measured in configurations.** Counted over compiled configuration files. For the Harmony 880/885 and
  890/895 this is, until a unit arrives, the only measurement there is, and the model pages say so at the top.
* **Stated by Logitech**, optionally followed by one of ", in the manual", ", by their service", ", in their
  client", ", in their catalogue". The third is what the project calls client sourced. A fact read in the
  copy of Logitech's device database is "Stated by Logitech, in their catalogue" and the footnote names no
  copy.
* **Stated by a third party.** Only with an `x` label, and never for the copy of Logitech's database.
* **Chosen by this project.** Only with a `d` label.
* **Not checked.** Only with `[^unchecked]`.

**The link form** is a relative path from the page, so it works in an editor and on GitHub, and the site's
hook redirects it:

```
[^s424]: Read in the firmware. [Section 424](../../../docs/findings.md#s424)
[^d20]: Chosen by this project. [Decision 20](../../docs/decisions.md#d20)
[^t-saved-delay]: Measured on a unit. [The test](../../packages/usb/test/settings.test.ts)
[^unchecked]: Not checked.
```

**The anchors**: a line `<a id="s424"></a>` directly above `## 424.` in the archive, and `<a id="d25"></a>` at
the start of decision 25, so a heading's wording never matters to a link.

## 5. The tests that guard the result

* **`tests/test_reference.py`**, new, in `make all`:
  * the reference describes no bench: no "bench", "lab", "dump", "test account", "our unit", "the spare",
    "everyday", "friend", "todo", no fixture name, no link into `docs/test-notes/`, `docs/lab-register.md`
    or `../lab`; Logitech's generated data files (`model.json`, `operations.json`, `entities.md`,
    `core-model.mmd`) are exempt, since those are Logitech's words;
  * the reference names no person: the names are read at run time from the repository's commit authors and
    the contributor headings of `docs/checksums.md`, so the test file carries none;
  * the reference never names the copy of Logitech's device database: no page names its repository or its
    checkout, the variable that locates it, decision 15, or its author, whose names are read at run time
    from the checkout's own commit authors when `packages/lab` finds it, so the test names nobody; the
    repository and variable patterns apply without the checkout too;
  * every footnote is well formed: every reference has a definition and every definition a reference, the
    label has one of the allowed forms, the evidence words are allowed and match the label, the section, decision
    or test it names exists;
  * every relative link in `reference/`, `docs/`, the root documents and the skills resolves, file and anchor.
* **`tests/test_archive.py`**, new: the archive is frozen (normalised digest as in 2.2); every `## N.` heading
  1 to 436 has exactly one anchor directly above it; every link in the archive resolves.
* **`packages/silhouettes/test/remotes.test.ts`**, changed: every model and architecture folder matches the
  files its row declares; the generated blocks are current, as now.
* **The site's strict build**, in the Action on every push and `make site` locally: broken links, broken
  anchors and pages left out of the navigation fail it.
* **Existing guards, kept pointing at the new paths**: `make prose` (dashes, already over every Markdown
  file), `make facts` (markers and dead phrases, failing on an empty table), `tests/test_toolchain.py` (lab
  register, withhold list), `tests/test_documents.py`, and the rewritten readers of the risk table.

One home per fact is not tested mechanically beyond the generated blocks; each step's review checks it.

## 6. Deliberately left out

* No stubs at old paths, and no `docs/client-sourced.md`.
* No content rewrite beyond what each step needs: a file is layered, deduplicated and footnoted in its step,
  not restyled.
* No new findings, and no code changes beyond those named: the arrow pairs (3.3), the file based product id
  in the generated blocks (3.1), the One's write standing as a generated block (3.1), and the readers.
* No architecture folders for arch 7, arch 15 or the hub family beyond what AT/ holds about it.
* Plans and the archive keep their content; only link targets and anchors change. `docs/emulator-design.md`
  keeps its stale statements as the record it is.
* No versioned site, no custom domain, no PDF, no search beyond Material's own, no translation.

## 7. Open questions

Settled when the plan was accepted, 24 October 2026:

1. **The two evidence words are accepted**, "Measured in configurations" and "Stated by a third party", and
   decision 25 names them.
2. **The inventories stay outside the repository.** They were working material; this plan carries what they
   found, and the move table is the part that matters.
3. **The site publishes the archive**, split one page per section by the build as step 7.1 describes, so the
   footnotes work on the website too.
