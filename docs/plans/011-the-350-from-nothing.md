# Plan 011: the Harmony 350 from nothing

**Status: open.** Written 31 October 2026 for `todo-compile-350.md` chapter 5, sub-items 5.1 and 5.2. It
carries out for the no screen family what [plan 008](008-the-650-from-nothing.md) carried out for the four slot
family, measured first. Nothing here is built; the census it rests on is
`packages/codec/test/noscreencensus.test.ts`, which reads and writes nothing.

**The rule on this track.** The goal is to compile what Logitech's compiler compiles and compare. Wherever
Logitech's compile makes a choice, our generators reproduce it, and a difference from Logitech is something to
copy, never a question to put to a person. Where a choice cannot be copied byte for byte, the plan says what
reproducing it means and what the check counts instead.

## What it is for

5.1 asks for every section of a Harmony 350 configuration built by a generator, and 5.2 for a check that it
rebuilds and that every byte is attributed to a generator with none carried. Until then every configuration of
ours for this family starts as a copy of a Logitech compile that the composers edit, which is what chapter 4
built: the device, the long press and the favourite channels all edit a donor.

## Where the code stands, measured

Two Logitech compiles, every byte in exactly one category: the 350's is the compile of the test setup (118513
bytes, eight devices, one activity, five favourite channels, four long presses), the 300's is the programmed
Harmony 300 (97474 bytes, four devices, one activity, four favourite channels). The second samples of every
constant below are the five other compiles of the family the lab holds, seven in all, counted where a claim says
so. The cut, with a verdict per category, is the census test; its four verdicts are **builds** (a generator of
ours reproduces the bytes with no Logitech file in hand), **edits** (this family's composer produces them, but only
by editing a donor container), **other** (a generator exists for another family and refuses this one) and
**nowhere**.

| category | 350 bytes | 300 bytes | verdict |
|---|---|---|---|
| header | 11 | 11 | other |
| section table | 60 | 60 | other |
| end marker | 4 | 4 | other |
| trailer | 6 | 6 | other |
| name tree | 259 | 153 | builds |
| architecture record | 7 | 7 | builds |
| log area | 8 | 8 | nowhere |
| clock record | 14 | 14 | builds |
| infrared group table | 25 | 13 | other |
| infrared group arrays | 774 | 474 | edits |
| infrared record headers | 5250 | 3234 | edits |
| infrared blocks | 102982 | 88228 | edits |
| start up table | 34 | 34 | nowhere |
| list, start up | 42 | 42 | nowhere |
| key map table | 28 | 16 | edits |
| key table (map 0) | 69 | 37 | edits |
| device key map | 844 | 536 | edits |
| action list table | 995 | 596 | edits |
| list, send | 2160 | 1330 | edits |
| list, key | 156 | 0 | edits |
| list, power | 157 | 56 | edits |
| list, channel | 35 | 28 | edits |
| list, pin | 109 | 109 | nowhere |
| list, activity | 94 | 53 | nowhere |
| list, uncalled send | 340 | 210 | nowhere |
| list, uncalled silent write | 112 | 56 | nowhere |
| timer table | 49 | 25 | edits |
| timer record | 112 | 56 | edits |
| state variable table | 98 | 80 | other |
| state record, clock | 49 | 49 | other |
| state record, firmware | 77 | 77 | other |
| state record, device power | 184 | 92 | edits |
| state record, device input | 166 | 0 | nowhere |
| state record, activity flag | 7 | 7 | nowhere |
| state record, unnamed | 7 | 7 | nowhere |
| parameter table | 16 | 16 | nowhere |
| parameter group | 21 | 21 | nowhere |
| number sender table | 4 | 4 | edits |
| number sender record | 23 | 23 | edits |
| number sender digit tables | 90 | 90 | edits |
| digit entry table | 2 | 2 | nowhere |
| metadata archive | 3033 | 1610 | edits |
| **total** | **118513** | **97474** | |

In bytes, per verdict:

| verdict | 350 | 300 |
|---|---|---|
| builds | 280 (0.24 percent) | 174 (0.18 percent) |
| edits | 116945 (98.68 percent) | 96435 (98.93 percent) |
| other | 330 (0.28 percent) | 300 (0.31 percent) |
| nowhere | 958 (0.81 percent) | 565 (0.58 percent) |

What the counts say, in the order the plan uses them:

* **Every composer of this family edits a donor, which is the finding that orders the plan.** 98.7 percent of the
  350's bytes are produced by the device, long press and favourite composers, and none of them can run with no
  container to edit. This is where plan 008 started: no generator could add a part the donor lacked. The pieces
  themselves (the infrared records, the send lists, the key maps, the timers, the number sender) are measured
  against Logitech's compile and come out equal: 39 of the 51 records Logitech stores for the plasma, 76 of the 82
  of the four long press devices, all 331 lists on the favourite channels, `noscreen.test.ts` and
  `noscreenfavourites.test.ts`. What is missing is the container they go into.
* **The frame refuses this family.** `FRAME_ARCHITECTURES` holds arch 12 (Harmony One) and arch 14 (Harmony 600,
  650 and 700); `frameArchitecture(16)` throws. So there is no linker, no `takeApart` and no placer for a 350, and
  the 81 bytes of header, section table, end marker and trailer, with every table's count, are the first thing a
  build from nothing cannot write. The raw slot map for this family is stated like arch 10's, `ARCH16_SLOT_MAP`,
  with absent base slots, and not derived from insertions like arch 12's and 14's.
* **Three builders already reproduce their sections byte for byte, on seven of seven compiles**: the name tree
  (`buildNameTree`), the architecture record (`architectureRecord(16, skin)`, skin 104 on the five 350 files and
  79 on the two 300 files) and the clock record (`buildTimestampSection`). They are 280 bytes. They are shared, and
  nobody calls them for this family.
* **958 bytes have no generator anywhere**, and they are of three kinds. Constants: the log area (8 bytes), the
  parameter block (37), the digit entry table (2), the start up table (34) and its lists (42), and the four pin
  lists the key table's tags without an event type bring (109), the same in all seven compiles for every constant
  that is a constant. Things the setup chooses and nobody has built: the activity's ten lists and flag (101),
  which other agents are building, and the Denon's input variable (166). And what Logitech stores that nothing
  reaches: 34 send lists and 16 silent write lists, 452 bytes, 50 lists in all that the lab note's hand count of
  the same file also finds (331 lists, 50 unreferenced, 10 the activity's).
* **The metadata archive is the one part with a hard answer already.** It is 3033 bytes of the 350's file and 1610
  of the 300's. Node's zlib reproduces none of the three archives tried at any of 3465 settings, and stock zlib at
  its defaults reproduces all six distinct archives the lab holds (`tests/test_harmony_350_metadata_deflate.py`),
  so the archive needs a deflate of our own, calibrated against six streams. The text around the devices is the
  same 149 and 610 characters in 7 of 7 compiles. Two fields are not a function of the file: a device's number is
  the account's (consecutive within each of the five 350 compiles and within neither 300 compile) and the ZIP's
  time is the stamp's less whole hours and 413 to 419 seconds in 7 of 7, so no rule recovers it to the second;
  its date is the stamp's date in all seven.
* **Lists, maps, timers and state records are numbered in an order no rule is known for.** Two compiles of one
  account already differ in it, chapter 4's reading of the setup compile against its twin without favourites; the
  order of a key map's tags is the one part simulated, `inCompilerOrder`. So a byte for byte match with Logitech's
  file for the whole container cannot be the check, and the check below says what replaces it.
* **The regions of the file come in one order in all seven compiles**: the key table, the first lists, the
  firmware's state records, the infrared records, the device key maps, the lists, the timer records, the device
  state records, the number sender, then the sections. In the 350's compile the infrared region is cut in two: the
  Denon's 19 input records, 11887 bytes, sit after the number sender, and every other record before the key maps.
  Measured as an order, not as a rule for it.

## The approach

The same one as plan 008, with the differences this family makes.

**One builder, in the no screen family, that numbers everything itself.** It allocates every list, map, timer,
state variable and infrared record, and hands each generator a description with those numbers instead of one read
off a donor. Each existing composer gains a way to emit fresh pieces from that description, beside its edit of a
donor, which stays for reading Logitech's compiles and for the calibration tests that compare against them. The
pieces go into one bag that `placePieces` and `layOutContainer` turn into a container, so placement stays the
linker's.

**What this family does not have, which makes it smaller than plan 008.** No screens, no pictures, no letters and
no fonts: the 650's 723489 carried bytes were mostly these. There is nothing in this family's file that only
Logitech's artwork can supply. The cost moves to the three places where Logitech's behaviour is a compiler's and
not a format's: the numbering order, the archive's stream and the lists it stores uncalled.

**Where a choice of Logitech's cannot be copied by rule**, the plan reproduces the shape and the check counts the
rest as description: the numbers a generator reads off a description are counted apart from the bytes it computes,
as `attributeBytes` does for the four slot family, since those come from wherever the description came from, and in
a build from nothing that is our own allocator. Four such places are known: the list, map and timer numbers, the state variables' indices, the ZIP's time
(two bytes in each of its two places) and a device's number in the archive.

## The steps

Each step says what it builds, what it is measured against, what it shares with other families and on which
families that sharing is measured, and the check that it passed. Every step ends with the census test's pinned
counts moving, so the ledger of what is attributed is in the diff.

1. **The frame for the family.** `FRAME_ARCHITECTURES[16]` and a raw slot table stated like arch 10's, with the
   six raw slots no base slot names (raw 5, 6, 8, 12, 13 and 14) as family slots, so `takeApart` and
   `layOutContainer` accept a 350 or a 300 compile. **Bytes**: 81 on both files, and every counted table's count.
   **Measured against**: all seven compiles, flash base `0x020000` and 15 pointers in all seven, a group table of
   8 groups on the 350 files and 4 on the 300's. **Shared with**: the linker and `placer.ts`, measured on arch 12
   (Harmony One) and arch 14 (Harmony 600, 650 and 700); the order of regions above is measured here on arch 16 in
   7 of 7 and is what the placer's table needs for this family, not checked beyond the order. **Check**: take each
   of the seven compiles apart and lay it out again byte for byte; a changed pointer count or flash base is
   refused. Not checked: the infrared region's split in two, which the placer has to reproduce or the check fails
   on the Denon's compile, and is step 6's if it is a property of the inputs.
2. **The state tables on our numbers.** Facts for the family, `Family.stateTables`: the firmware's 18 variables
   with the records 7 to 17 (the same `first` and `max` in 7 of 7, no transitions), the clock records seeded from
   the stamp with no transition (7 of 7), a wide count of 1 in 7 of 7, no value maps, no minute call. The generic
   `describeStateTables` and `buildStateTables` then rebuild the section from its description. **Bytes**: 224 on
   the 350 (the table 98, the clock records 49, the firmware's 77) and 206 on the 300, the compiler's first wide variable's 7 on both, plus the name tree's 259 and 153 that already build. **Shared with**: the four slot family (13 compiles on arch 14) and the touch family (19
   on arch 12), whose facts differ in where the width line falls and in the minute call, which is the reason they
   are facts and not tests. **Check**: the description read off each of the seven compiles builds the same bytes;
   the name tree's order under 48 nodes, where two variables can share a bucket, is checked against the 48 trees
   `composedNameTreeOrder` already rebuilds, arch 16 among them. Not checked: the order of the device variables'
   indices, which Logitech allocates and our allocator must reproduce: in the setup compile they run from 18 to
   28 as Sony HT, Knoll, Switch, LG TV, the Denon's input, Plasma, Denon, Kodi, the activity flag, KPN and the LG
   TV's input, which is neither the setup's order of devices nor the keys', so it is one more numbering of the
   compiler's to find or to count as description.
3. **The family's constants.** The log area, the parameter block, the digit entry table, raw slot 14's NULL, the
   start up table and its lists, and the key table's four pin tags with the pin lists they reach. **Bytes**: 232 on
   both files, plus the key table's four pin entries. **Measured against**: the constants are identical in 7 of 7
   (the census test); the start up lists call the empty list and the four device selects, so they vary with the
   devices only in which map the first selects, which is description; the pin lists are the one part read by
   hand in one compile, with the same 109 bytes in both files, and **have not been compared byte for byte across
   the seven**: that comparison is this step's first act. **Shared with**: nothing; the log area equals the
   Harmony 525's slot 2 byte for byte (the slot map's own statement) and is not claimed to be shared. **Check**:
   each constant equals the seven compiles'; a pin list that differs in a second sample is a fact about a
   configuration and not a constant, and moves to description.
4. **The metadata archive from nothing.** The ZIP's records and the text around the devices (149 and 610
   characters, 7 of 7), the device elements as `withMetadataDevice` writes them (names sorted by character code,
   numbered from 0), and a deflate of our own that writes the stream stock zlib writes at its defaults. **Bytes**:
   3033 on the 350 and 1610 on the 300, which is the largest single piece nobody writes whole. **Measured against**:
   six distinct archives, byte for byte, with stock zlib 1.2.12 the reference and the control that level 1 is not
   the stream. **Shared with**: arch 10 (Harmony 890 and 895) keeps a 270 byte archive in raw slot 3 and
   `METADATA_SLOT` already serves both; stock zlib reproduces its 132 byte stream in three files, which cannot
   tell the setting from 54 others at that size, so the sharing is consistent and not measured. **Check**: our
   deflate equals the six streams; a hand edited XML does not. The device number and the ZIP time are written as
   choices: consecutive numbers counting on from the setup's first, and the stamp less the zone's whole hours less
   416 seconds, the middle of the 413 to 419 band, so those four bytes in two places are counted as description.
   Not checked: another version of stock zlib agreeing with 1.2.12, and whether anything reads the archive.
5. **The empty configuration.** Everything above, plus an empty infrared table at the model's allocation (8
   groups of no record on the 350, 4 on the 300; five of eight are empty in the factory 350, the second sample),
   an empty key table, no map, no list but the start up's and the pins', and an archive naming no device. **Bytes**:
   every byte of this configuration is one of the first five steps', and what is left of the 350's file is the
   devices' own; the first complete attribution is over this configuration. **Measured against**: no compile holds
   it. The smallest compile of the family holds three devices (`h350_config`), so what Logitech writes for a key
   table with no device is not read, the same open as plan 008's all off list. **Check**: it parses and every
   container check passes; the attribution below reports no carried and no unclaimed byte; then it is written to
   the bench 350 behind decision 26's rail and watched with the infrared receiver: the remote starts, no key
   sends, and nothing hangs. Not checked: what the firmware does with a start up select that names no map; the
   least that keeps every reader working is the builder's choice until the bench says.
6. **The composers on the empty configuration.** Each of `composeNoScreenDevice`, its long press, and
   `composeNoScreenFavourites` emits pieces from a description beside its donor edit, and the first device, then
   the long press, then the favourites are composed onto the empty configuration. **Measured against**: the same
   composition onto Logitech's donor, as `noscreen.test.ts` already holds it part by part, and **the empty
   configuration's composition must equal the donor's composition in every part, since the numbering is
   description**, which is plan 008 step 5's test. **Shared with**: `composeDeviceFor` and `appendActionLists` in
   the shared composers, measured on arch 12 and 14 compiles and, for this family, on the plasma and the four long
   press devices. **Check**: the composed device equals Logitech's in records, send lists, power variable and map
   keys as it does today (39 of 51 records, 38 of 40 bindings), and Logitech's other choices, the Input key, the
   volume routing and the favourite key (`todo-compile-350.md` 4.1.1), are copied as chapter 4 decides.
7. **What Logitech stores and the setup does not name.** The 34 send lists and 16 silent write lists nothing
   calls, the ten one block copies of the plasma's digits that no list or key reaches, and the Denon's inputs, which
   the family's sends refuse with `todo-compile-350.md` 4.2 named, so the agents on the activity may reach them
   first: a variable of 19 values, 19 transitions each calling one send list, and 19 infrared records
   Logitech places after the number sender. **Bytes**: 452 for the uncalled lists, 166 for the input records on the
   350, plus the 11887 bytes of the 19 records. **Measured against**: the setup compile and the other six, where
   the rule for which sends are stored uncalled is **not known**: the plasma's 12 records that no list reaches are
   the one measured case (`noscreen.test.ts`). Reproducing the stored ones is this step's work, found by
   counting over the seven compiles which sends of a device are stored and which are not, the way the digit
   copies were. **Shared with**: `inputs.ts`, the shared input composer, whose send members `NO_SCREEN_SENDS` refuses today;
   measured on the four slot and touch families, not on this one. **Check**: a Denon composed from the catalogue
   writes the 19 values and the 19 records Logitech's compile holds, and the stored uncalled lists equal
   Logitech's on the devices the compile holds; where the rule is not found the check names the lists it does not
   reproduce and 5.2 counts them as the plan's remainder, not as carried.
8. **The activity, the device routing, the top left key and a device's removal**, which other agents are building
   (`todo-compile-350.md` 4.1.1 to 4.1.3 and 4.2). They are steps of this plan only as dependencies: the 350's
   setup cannot be built from nothing without them, and the attribution counts their bytes the way it counts
   the rest, by the generator that emits them and not by how it was written.
9. **The whole test setup, built with no Logitech file as input**, and the check below.

## The check that proves 5.2

"It rebuilds, and every byte is attributed to a generator with none carried" is three separate claims, and the
650's `attributeBytes` shows how to hold each.

1. **The attribution function**, `attributeBytes`'s counterpart for this family: for each generator, describe the
   container, rebuild its part, and count a byte as the generator's **only after its rebuild is byte equal on the
   container read**; the numbers a generator reads off the container are counted apart as description; what is left
   is named by what claims it, by `claims` in `coverage.ts`, which already names 96.6 percent of the 350's file
   and attributes the rest by the census test's own cut. It runs over **Logitech's compiles first**, which is the
   calibration: the function is trusted when it attributes all seven of them without a disagreement, and what it
   leaves carried on the setup compile is the ledger of what no generator builds yet. Today that ledger is
   118233 carried of 118513, and the census test's pinned verdict bytes are its steps.
2. **On our own build**, the same function reports **zero carried and zero unclaimed**. That is 5.2's claim in
   its literal form, and it holds only if the function is not generous: the control plants a byte copied out of
   a donor into our build and the function counts it as carried, as plan 008's did.
3. **Nothing was handed in.** The assembly entry takes the setup description and the infrared archive's path and
   nothing else, and the build test runs with no lab present, so there is no donor it could have read. The
   second check is not enough alone: an attribution that says every byte is generated tells nothing about whether
   the generator read the byte from a file it was given.

And what replaces byte equality with Logitech's file, which the numbering makes unreachable: **part by part**,
which is how `noscreen.test.ts` already compares a device (a record by its header and blocks, a list by what it
does with every list it calls written out, a map by tag and spelled binding); the **round trip** of step 1 over
our own output; and the **inflated archive** equal to Logitech's text for the same devices, since its stream is
equal to stock zlib's and the text is ours.

## Open, and not checked

* **What the 350 does with a key table that selects nothing**, step 5: no compile shows it; the bench settles it.
* **The numbering of lists, maps, timers and state records.** No rule is known; a simulation of the compiler's
  hash map ordered the key maps' tags, `inCompilerOrder`, and the same may order the rest. Trying it is a
  measurement against seven compiles and is not started. Until it is found the numbers are description.
* **Which sends Logitech stores uncalled**, step 7.
* **The pin lists across the seven**, step 3: read by hand in one compile and equal in size in two.
* **What reads the archive.** No instruction of the firmware is known to seek raw slot 13; the log area's records
  name a device and a command by number, which the archive would name for a host. So a device's number and the
  ZIP's time are written as choices and nothing on a remote is known to depend on either.
* **The Harmony 300's own parts**: four groups, no long press, a favourite order of its own that one compile
  states (`FAVOURITE_SCANS` has no row for it), and its map 0 with 37 bytes where the 350's has 69. The frame,
  the state tables, the constants and the archive are shared and measured on its compile; its composers are
  `todo-compile-300.md`'s.
* **Another version of stock zlib**, and a longer text than the 25088 bytes the setup's archive holds.
* **Written to the bench 350** is 5.3, with a bench test; step 5 writes the empty configuration once, to see it
  start, as plan 008's step 4 did.
