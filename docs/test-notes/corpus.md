# The corpus

This file records which configurations the work was measured on: the contributed and compiled
configurations, and where each came from. The reference states what a measurement found; this file says
which files it was taken over. Names and counts live in `tests/lab.py` and `packages/lab`, and the corpus
totals in `docs/status.md`, so this file names the sets rather than restating those.

## Harmony 600, 650 and 700

User configurations of this architecture held in the lab: the Harmony 600's, the Harmony 650's reads,
and two of a contributor's Harmony 700 plus the bench 700's, with Logitech compiled calibration and power
hold compiles beside them.

### The published pair of a Harmony 700

Two configurations of the same Harmony 700, posted together by their owner with one documented change
between them, 979184 and 979242 bytes, `h700_config` and `h700_config_2`, with their checksums in
`docs/checksums.md`. It is the only controlled pair in the corpus and it is what section 16's analysis
rests on. It is not the bench unit.

It also carries the one unresolved contradiction in the format work: the build timestamps in base slot 3
order the pair the opposite way round from the contributor's stated direction of the change, section 21.
Until that is settled a timestamp is not used to order two configurations of the same remote; the
warning itself is in the reference, `reference/remotes/harmony-700/misc.md`, which plan 009 moves to
`reference/config-format/header-records.md` with the timestamp's description.

## Harmony 300 and 350

Five configurations of this architecture are lab fixtures, three of the bench Harmony 350 and two of the
bench Harmony 300, named in `tests/lab.py` and `packages/lab`, and they sit outside the corpus wide totals
by decision, section 194. Which read each one is, and what was predicted before it, is in
[the 350's notes](harmony-350.md) and [the 300's notes](harmony-300.md). This paragraph sat in the
architecture folder's `misc.md` until plan 009's cleaning of the architecture folders.
