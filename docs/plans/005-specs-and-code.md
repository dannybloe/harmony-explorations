# Plan 005: the specification and the code are the product

**Status: open.** Picked up once the current loose ends are done: the Harmony 650's missing input
(the firmware's "value changed" transitions), and the merges in flight. Written 4 October 2026.

## What this project delivers

Three things, and everything else is scaffolding:

1. **How a Harmony works**, written as a specification a stranger can read and FreeHarmony can show or
   publish: per model, per architecture, the configuration file, the USB protocol, infrared, and how a
   remote behaves in use.
2. **How to program it**: the libraries that read, change and write configurations and talk to a
   remote, which FreeHarmony builds on.
3. **The tests that hold the two together**: every claim in the specification has a test, so when the
   code and the text disagree a test fails, rather than one of them going quietly stale.

The findings journal, the plans, the status page and the lab notes are how the knowledge was dug up.
They are worth keeping as a record and they are not what a reader of this project needs.

## The layout

The line runs between **public knowledge** and **project bookkeeping**, not between `docs/` and
`reference/` as today.

```
docs/spec/                    how a Harmony works, public
  remotes/<model>/            ten files per model: README, hardware, keys, display, features,
                              behaviour, memory, firmware, usb, misc; the drawing in the folder
  architectures/<family>/     what the models of one family share, memory map and firmware above all
  config-format.md            the configuration file, from today's docs/config-format.md
  usb-protocol.md             talking to a remote, from today's docs/usb-protocol.md
  infrared.md                 how a code becomes light; new, gathered out of the code and the findings
  behaviour.md                how a remote behaves in use, from today's docs/how-a-harmony-works.md
docs/                         the project: status, decisions, plans, the findings archive, the lab
                              method, and test notes per unit in docs/test-notes/
reference/                    internal lookup lists only: checksums, the lab register, the dead claims
                              list, the silhouettes' sources
```

## Rules

- **The specification describes the model, never our bench.** Which account a unit is linked to,
  which dumps and lab reads exist, which units may be written, what was composed onto one: all of
  that goes to `docs/test-notes/<model>-test-notes.md`. A test fails when a specification file
  mentions the lab, an account, a dump or a bench unit.
- **Evidence per fact, not a story.** Each fact states its standing in a few words: measured on a
  unit, read in the firmware, stated in Logitech's manual, stated by Logitech's service, a design
  choice of this project, or **not checked**, plus the test that holds it and, where it helps, what
  would refute it. Who decided something does not matter to a reader; what kind of evidence it is does.
- **What lives in code is generated into the text**, as `make remote-reference` already does for the
  650, and a test fails when the two differ.
- **No second copy of a derivation.** A long argument is linked, not restated.

## `docs/findings.md` becomes an archive

It is frozen: nothing new is added, and it stays where it is, because code and tests cite its sections
about 4000 times across 243 files and other documents about 2600 times, and every one of those must
keep resolving. New knowledge goes straight to its home in `docs/spec/` with its evidence line. Old
content migrates when it is touched, not as one rewrite. This changes how decision 9 and the `finding`
skill's four places work and is recorded as a decision when the plan is picked up.

## Steps

1. Write the decision in `docs/decisions.md`: the three deliverables, the layout, the findings
   archive, evidence per fact.
2. Move the files into the layout with `git mv` and rewrite every path that names them: `CLAUDE.md`,
   the skills, the generators, the tests, code comments. The tests that read these files are what
   catch a path left behind.
3. Clean the Harmony 650 folder and its architecture folder: move everything about our own units into
   `docs/test-notes/650-test-notes.md`, and add the test that keeps the specification free of it.
4. Make the specification the first place to read and write: `CLAUDE.md` says so, the `finding`
   skill routes a confirmed fact to its home in `docs/spec/` and counts the specification among the
   summaries to sweep, and `how-a-harmony-works`, `probe-remote` and `draw-remote` point at it.
5. The other bench models' folders the same way: One, 525, 600, 700, 300/350, Touch; thinner folders
   for the 880/885 and 890; then `reference/capabilities.md` is absorbed.
6. `docs/spec/infrared.md`, gathered from the code's own docstrings and the findings, linking rather
   than copying.
7. The static HTML site, built from `docs/spec/` and the drawings, committed.

`todo-later.md` chapter 8 carries these as items.
