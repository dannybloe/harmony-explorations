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

## The firmware's own screens

The screens at the front of base slot 6 that every configuration of this architecture carries for the
firmware: **fourteen on the Harmony 600 and 650**, "USB Connected", Low Battery, Insert batteries,
Unable to charge, Update Successful and Upgrade Successful, Ready to learn, Command Received, Terminate
Entry, the two "add an Activity" placeholders and three blanks, and **nineteen on the Harmony 700**,
whose four charging frames and "Please charge your remote" come on top, sections 347 and 357. The firmware
never enters one by number: the configuration's own lists do, so what a person sees of them is the
configuration's wiring, read on the 600's and 650's 0.2 builds, section 355.

Their keys, read from configurations, section 357, on 21 compiles of the three models:

* **The placeholders**, "Use the Harmony setup software to add an Activity on this button" and "... to add
  Activities", swallow every key event of scans 1 to 54 but the press of scan 25, the centre key below the
  display, which goes back. On the 600 and 650 mode 0's is the table after the end marker, section 311.
* **Low Battery** runs the wiring's low battery exit on the press of scan 25; the other battery screens
  swallow every key event.
* **"USB Connected" is left by the presses of scans 11, 12 and 51 in turn**, while every other key event,
  those keys' own releases and repeats included, starts the count again. How a person completes it is
  **not read and not tried**.

## What Logitech's compiler does on these models

Read from Logitech's compiles, the compiler being on Logitech's service and not in hand:

* **A device's own pages**: every hard key takes the first of a short list of command names the device
  has; the screen opens with the power commands and a fixed short list, then every command no key holds,
  sorted, case folded; each label in the largest of six text sizes that fits on one line or two. Twenty
  catalogue devices reproduced, section 325.
* **The activity menu's order is not the owner's.** MyHarmony offers its reorder screen only to remotes
  with capability `ActivityReorder`, which every remote with a screen carries except the Harmony 600,
  650, 665 and 700; MyHarmony's client and Logitech's catalogue, section 351. What the compiler's order
  follows is not established.
* **A start up title's line break**: on one line up to 126 pixels on the Harmony 650, 116 on the 600 and
  123 on the 700 as far as their compiles show, broken from 130, 130 and 163, section 358.
* **A configuration with no activity**, of which one compile is in hand, a Harmony 650's: More Activities
  on the activity menu opens "add Activities", section 383.

## Configurations in the corpus

User configurations of this architecture held in the lab: the Harmony 600's, the Harmony 650's reads,
and two of a contributor's Harmony 700 plus the bench 700's, with Logitech compiled calibration and power
hold compiles beside them. Names and counts are in `tests/lab.py` and `packages/lab`, and the corpus
totals in `docs/status.md`; nothing here restates them.

## Not checked

* Nothing in this file is a claim about a remote beyond the cited sources.
