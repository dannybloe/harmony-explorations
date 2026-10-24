# Todo: the reference

**The finish line**: everything this project knows about how a Harmony works, in `reference/`, once, in a
clear structure a stranger can read, and published as a website from it. This is `todo.md` 3.6, and it
takes over `todo-later.md` chapter 8, plan 005's steps, which now live here.

**What was agreed before starting**, 24 October 2026:

* **All knowledge in `reference/`**: per model in `reference/remotes/<model>/`, per architecture in
  `reference/architectures/<family>/`, and the subjects that cross models (the configuration file, the USB
  protocol, infrared, how a remote behaves for a person, Logitech's data model and software, the glossary)
  in their own homes in `reference/`. Plan 005 and decision 25 named the folder `docs/spec/`; that changes
  to `reference/`, and decision 25 is corrected in place.
* **`docs/` holds only the project's bookkeeping**: status, decisions, plans, the findings archive, test
  notes and the lab method. The internal lookup lists now in `reference/` move there.
* **One home per fact.** A second place links to it. Facts the code holds are generated into the text and a
  test fails when they differ. The website is built from `reference/` on publishing and never committed.
* **The reference is a real reference**: nothing about our units, the bench, accounts, the lab, dumps, our
  test setup or todo items. Those go to `docs/test-notes/`. A test guards the line.
* **Evidence as footnotes**: a fact carries a named footnote, `[^s424]`, saying what kind of evidence it is
  (read in the firmware, measured on a unit, stated by Logitech, a choice of this project, not checked) and
  linking to the findings section that holds the argument. Each findings heading gets a short fixed anchor,
  `#s424`, so the links stay valid.
* **`docs/findings.md` is a frozen archive**: nothing new is added, its sections stay where they are.

## 1. Inventory and plan

- [x] 1.1 An inventory of every document and every section of the large ones: knowledge or bookkeeping, which model or subject, where it belongs, what it duplicates; done by two agents, reading only, about 20 stale or contradicting statements among what they found
- [x] 1.2 The website's structure: the sections a reader meets, in order, and the folder layout under `reference/` that follows it
- [x] 1.3 A plan, `docs/plans/009-the-reference.md`: the target layout, a move table per file and section, and the order; shown before anything moves
- [x] 1.4 Decision 25 corrected in place: `reference/` instead of `docs/spec/`, footnotes as the evidence form, written in layers, the website built and not committed

## 2. The skeleton

- [x] 2.1 Files moved into the layout with `git mv`, every path that names them rewritten: `CLAUDE.md`, skills, code, tests, generators, links; whole files moved, the three large documents cut by heading, pointers to their sections retargeted, `make facts` 245 and 546 before and after, and FreeHarmony's mentions on its branch `reference-paths`
- [x] 2.2 A short fixed anchor on every findings heading, with no other change to the archive: 436 section anchors and 25 decision anchors, the one live link corrected, digest pinned in tests/test_archive.py
- [x] 2.3 The tests that guard the layout: no bench, lab, account, dump or todo in `reference/`, every link and footnote resolves, no em or en dashes; `tests/test_reference.py` runs plan 009's five guards from `tools/reference_guards.py` against a pinned list that may only shrink (bench 551, names 29, copy 7, footnotes 0, links 0), each guard shown failing on a planted line in `reference/infrared/README.md` and kept failing on a synthetic tree; dashes stay `make prose`'s

## 3. Models and architectures

- [x] 3.1 Each model folder cleaned: our own units out to `docs/test-notes/<model>.md`, the evidence as footnotes, duplicates replaced by links (one agent per model); then the architecture folders the same way, except the two compiler pages left for 4.1, and the items the model agents reported applied
- [x] 3.2 The memory maps into their architecture folders: all five maps removed, their content in the Harmony One, 5xx and 600-650-700 folders with the first footnotes, the units' records in `docs/test-notes/`, the three contradictions settled
- [x] 3.3 The button maps into each model's keys, the tables as data the drawings already hold, the derivation to the archive; every scan code names its source, the arrow pairs and Help settled, `button-maps.md` removed
- [x] 3.4 `reference/capabilities.md` and `reference/models.md` absorbed into the model and architecture folders, the remotes index and Logitech's product line; the service's capability answers pinned by a test
- [x] 3.5 Thinner folders for the Harmony 880/885 and 890, which only contributed configurations: `harmony-880-885/` and `harmony-890-895/` (five files each, a generated slot map from `SLOT_MAPS`), `remotes/harmony-885/` and `harmony-890/` (ten each, no drawing yet, so `drawing` is optional and the test names the two folders allowed without one), every fact footnoted; the load address table of `docs/checksums.md` folded into the five architectures' firmware pages

## 4. Subjects across models

- [x] 4.1 The configuration file format, one home, its per model facts linked to the model folders; both compiler pages, the cross-page moves applied, an independent review of every changed statement against the archive and its nine corrections
- [x] 4.2 The USB protocol
- [x] 4.3 Infrared, gathered from the code and the findings
- [x] 4.4 How a Harmony works for a person
- [x] 4.5 Logitech's world: their data model, their host software, their device catalogue
- [ ] 4.6 The glossary

## 5. The findings archive

- [ ] 5.1 Every section's conclusion checked against `reference/`: present, added, or marked as disproved in `docs/superseded.md`'s successor (agents by section range)

## 6. The rules

- [ ] 6.1 `CLAUDE.md` keeps the instructions and points to `reference/` for the facts it now repeats
- [ ] 6.2 The skills and the `finding` procedure send a new fact to its home in `reference/` with its footnote

## 7. The website

7.1 runs straight after 2.1, so the site's strict build checks every link from chapter 3 on (plan 009, section 3).

- [x] 7.1 MkDocs with the Material theme, pinned, the contents from 1.2, built from `reference/`: `mkdocs.yml`, `tools/site/` (hook and 29 hashed pins), `make site`; strict fails today on 38 pages the navigation names that later steps write and 3 it omits that 3.3 and 3.4 remove, so `SITE_STRICT=false` until then
- [ ] 7.2 Published by GitHub Pages through a build on every push; the built site is not committed
