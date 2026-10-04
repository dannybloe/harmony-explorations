# Harmony 600, 650 and 700: miscellaneous

**The rule for this file** is the model folders' rule: a note goes here only when it fits none of the
other files, and a kind of note that recurs gets a file of its own.

## Names

* Logitech's client calls the platform **Molson** and lists it on the **Mocha** transport with the 5xx
  models, `reference/models.md`. Neither name means anything on the desk.
* The configuration container is the Harmony One's, `GSPM` and `PTYY`, at format 1.4 with 20 pointer
  slots where the One's is 1.6 with 22; a section on this architecture transfers to the One by base slot
  index, `CLAUDE.md` key facts.

## Why this architecture is the one to read firmware on

Every configuration byte the firmware reads passes through one SPI routine, so a configuration field can
be traced to the code that consumes it at one choke point; on the Harmony One reads are scattered
because the configuration is memory mapped. `CLAUDE.md` key facts and the `trace-section` skill. That is
a rule about reading code and not about where data is, the same file's pitfalls.

## Configurations in the corpus

User configurations of this architecture held in the lab: the Harmony 600's, the Harmony 650's reads,
and two of a contributor's Harmony 700 plus the bench 700's, with Logitech compiled calibration and power
hold compiles beside them. Names and counts are in `tests/lab.py` and `packages/lab`, and the corpus
totals in `docs/status.md`; nothing here restates them.

## Not checked

* Nothing in this file is a claim about a remote beyond the cited sources.
