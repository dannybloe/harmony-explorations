# The corpus

This file records which configurations the work was measured on: the contributed and compiled
configurations, and where each came from. The reference states what a measurement found; this file says
which files it was taken over. Names and counts live in `tests/lab.py` and `packages/lab`, and the corpus
totals in `docs/status.md`, so this file names the sets rather than restating those.

## The three populations

Every corpus claim walks one of three populations, each defined once, in `tests/lab.py`, and the
difference between them is a difference in the question:

* `ALL_CONTAINERS`, 21, every container a **per container** claim is made over.
* `CONTAINERS`, 19<!--fact:containers-->, the narrower population a corpus wide **total** is computed
  from. It leaves the two Harmony 880 and 885 configurations out, because adding them moves every
  coverage figure in one commit. **It includes the Harmony One sync pair**: a configuration before a sync
  and the same remote's after one are two containers, because the bytes differ, and a total over
  containers is not a headcount of remotes. The configuration format's front page said 15 and gave
  excluding that pair as the reason until 29 August 2026, a paraphrase of a claim `docs/superseded.md`
  already carried; both halves were wrong.
* `USER_CONFIGS`, 15<!--fact:user_configs-->, every configuration a remote was actually programmed with.

**A count in prose drifts, which is why each carries a marker `make facts` recomputes.** The same
front page's evidence column said "ten configs" in eight rows and "thirteen containers" in three while the
lab held fifteen of each, section 140, and then "nine configs", "sixteen samples" or "twelve containers" in
seven more, each a list written by hand inside one test, section 141. A row short of the full population
says which containers are missing and why, because an excluded sample is a claim too. This section sat
on that front page until plan 009's step 4.1.

### The containers behind the first corpus claims

The bench Harmony 525's own configuration, read over USB on 8 August 2026, is identical in every
container field to the published arch 9 sample, section 76; the same remote's safe mode container, cut
out of its firmware region at flash `0x818000`, is `h525_safemode_ahcm`, held out for a while because it
contradicted six established claims at once and in the corpus since sections 77 to 79 re-derived all six,
[the 525's notes](harmony-525.md).

**Observed pointer values**, for orientation, from four containers read early: the Harmony One's safe
mode configuration and its user configuration, and the user configurations of a Harmony 600 and the
published Harmony 700. The reference states the rule they show, that the non NULL pointers ascend with the
slot number, without the values:

| Slot | One safe cfg @`0x2000` | One user cfg @`0x40000` | 600 user cfg @`0x30000` | 700 user cfg @`0x30000` |
|---|---|---|---|---|
| 0 | `0x0029AD` | `0x076197` | `0x063702` | `0x06E3B5` |
| 1 to 6 | `0x0029B4`..`0x002A50` | `0x0762AE`..`0x076740` | `0x063D26`..`0x064007` | `0x06ECCD`..`0x06F1A6` |
| 7 | `0x004107` | `0x085E44` | `0x072CDB` | `0x0812C1` |
| 8 | NULL | NULL | `0x072D0A` | `0x0812F6` |
| 9 to 18 | `0x00410C`..`0x0042BA` | `0x085E7C`..`0x08C076` | `0x0734B5`..`0x07A33B` | `0x0820FE`..NULL |
| 19 | `0x0042BC` | `0x08C078` | NULL | NULL |
| 20, 21 | NULL, NULL | NULL, NULL | n/a, 20 slots only | n/a, 20 slots only |

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
warning is in the reference with the timestamp's description,
[dating a configuration](../../reference/config-format/header-records.md#dating-a-configuration-and-where-that-fails),
and the 700's [misc.md](../../reference/remotes/harmony-700/misc.md) says it of the pair.

### Per compile counts the reference states without the file names

Moved here from the architecture's compiler page when plan 009's step 4.1 named its columns by model.

**The two row device list's mode**, section 326, per compile: 166 `h600_config`, 167 `calibration_h600`,
179 `h650_config_region`, 226 `h650_panasonic_config`, 325 and 337 the 650's two power hold compiles, 283
both `h700_config`, 166 `h700_28_config_region`, and 297, 295, 295 and 297 the 700's four.

**Screen bytes per compile**, section 317:

| configuration | screen bytes | fixed | dynamic | setup |
|---|---|---|---|---|
| `h650_config_region` | 628447 | 471329 | 13391 | 143727 |
| `h650_panasonic_config` | 645496 | 471328 | 13391 | 160777 |
| `h650_power_hold_compile` | 679481 | 471328 | 13391 | 194762 |
| `h650_power_hold_compile_2` | 681067 | 471328 | 13391 | 196348 |

**The writers of the start variable**, section 335: the reference's table names its five columns a
Harmony 650, a Harmony 600, another 600, a Harmony 700 and another 650. Before that step they were
headed, in the same order, "650", "600", `calibration_h600`, "700" and "bench 650".

## Harmony 880 and 885

**A contributor's description of his own configuration**, section 124: the owner of the Harmony 880 whose
configuration arrived on 10 August 2026 sent a sheet of which devices it drives, which activities its menu
offers and what each activity's screens are for. It is the first thing that could contradict the readers
from outside the code, and checking against it moved four of them. The reference keeps what was learnt,
a menu entry that is not an activity and the readers' agreement with the sheet, without the person.

## Harmony 300 and 350

Five configurations of this architecture are lab fixtures, three of the bench Harmony 350 and two of the
bench Harmony 300, named in `tests/lab.py` and `packages/lab`, and they sit outside the corpus wide totals
by decision, section 194. Which read each one is, and what was predicted before it, is in
[the 350's notes](harmony-350.md) and [the 300's notes](harmony-300.md). This paragraph sat in the
architecture folder's `misc.md` until plan 009's cleaning of the architecture folders.

## What the corpus holds per architecture

Plan 009's step 3.4 moved this column out of the reference's table of the models Logitech retired, which
said beside each architecture what this project had of it. Counts move as the lab grows; the lab and
`tests/lab.py` are the record, and this is the shape:

| architecture | what this project holds |
|---|---|
| 8, the Harmony 880 and 885 | six configurations from two contributors, two application firmware images and two bootloaders; no unit |
| 9, the Harmony 525 | a unit: two user configurations, a safe mode container and its whole internal flash, [the 525's notes](harmony-525.md) |
| 10, the Harmony 890 and 895 | two Harmony 890 configurations and five further reads of them, no firmware and no unit; every reader but the container framing refuses them, section 117 |
| 2, 3, 7, 15, and the 810, 820 and 850 | nothing |

The architectures with units on the bench, the Harmony One's, the 600, 650 and 700's, the 300 and 350's
and the Touch's, are in their own notes and in the sections above.

