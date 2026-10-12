# Plan 008: the Harmony 650 from nothing

**Status: open.** Written 12 October 2026 for `todo-compile-650.md` 11.1.1, which carries out plan 007's
step 4. The sub-items of 11.1.1 are this plan's steps.

## What it is for

11.1.1 asks for an empty starting configuration, no device and no activity, built by our own generators
with no Logitech compile as input, onto which the composers then add the first device and the first
activity. Until it exists every configuration of ours starts as a copy of a Logitech compile that each
generator overwrites in part, so 11.1's claim, every byte from one of our generators, cannot be made.

## Where the code stands, measured

Measured on the assembled test setup and on Logitech's two smallest Harmony 650 compiles; the inventory
behind these numbers is the lab's `work/agent-11-1-1/INVENTORY.md`.

* The assembled test setup in our letters is 1001820 bytes, of which 723489 are still the donor's: the
  picture bank 360664, infrared 214292, action lists 76170, screen programs 44482, the mode records and
  their pages about 21000. The rest is generated.
* **No generator can add a part the donor lacks.** Each describes its part of the donor, rebuilds it and
  puts it back over the donor's own pieces: `withModeRecords`, `withWiring`, `withPictures`,
  `withOxaniumFonts`, `withScreenTexts` all replace in place. Only `withStateTables` appends records, and
  only the linker, `layOutContainer` with `placePieces`, takes pieces made in code with no donor at all.
* **Most build halves need no container**: `buildWiring`, `buildStateTables`, `modeZeroKeyList`,
  `buildPictures`, `buildOurPictures`. The firmware screens, the screen records and the texts read the
  container only for its fonts and character map, which ours supply. The font table is the exception: it
  measures each of Logitech's sets to choose our face for it.
* **What nobody builds and an empty configuration still needs**: the tables of base slots 6, 7, 9, 10, 11,
  16 and 17; the three battery programs every menu queues; the clock's hour list; the case programs of
  the idle, idle entry and location value maps; the all off list, whose content with no device is not
  known since no Logitech compile with none exists.
* **The composers find things by Logitech's content**: the activity menu by its activity rows, the device
  lists by their device rows, the menu marker off existing rows, the start up font off existing start up
  screens, the device page fonts off the first device page, every background by Logitech's picture
  content key, and the all off list only with two devices or more. Each is a refusal on an empty
  configuration, and section 364 met the first of them.
* **The state tables refuse the smallest compile**: two of its 21 named variables share a bucket of the
  name tree, where section 324 pinned the order on 32 to 90. An empty configuration names fewer still.

## The approach

**One builder, in the four slot family, that numbers everything itself.** It allocates every mode,
action list, screen program, value map, state variable and base slot 9 entry, and hands each generator a
description with those numbers instead of one read off a donor. Each generator gains a way to emit fresh
pieces from that description, beside its existing put back, which stays for reading Logitech's compiles
and for the calibration tests that rebuild them. The pieces go into one bag that `placePieces` and
`layOutContainer` turn into a container, so placement stays the linker's, section 328.

**Only our own look can be built from nothing**, so the builder requires our letters, the state colours
and our pictures. Logitech's letters and designed backgrounds are their artwork and exist only in a
compile. These three choices stay choices for a configuration made on a donor.

**What an empty configuration holds**, from the decisions already taken: the firmware's fourteen own
screens, the idle device list and the activity menu with no row, Off, the wiring with this track's
settings, the state variables 0 to 17 and the few the screens use, mode 0's key list, the rule pictures
and our own, and our font table. **No** Help, Remote Assistant, tour or status screens (3.13, 7.4, 10.2.2,
section 355). The event map stays whole, since the firmware reads it only for status screens it never
draws from a configuration (section 355); its codes name a screen the configuration holds.

**The composers are moved off Logitech's content one lookup at a time**, each to the description the
builder made or to a structural reading that holds on Logitech's compiles too, so their tests on the
lab's compiles keep passing. The test of each move is that the same composition comes out byte equal on
`h650_start_config`, as every move in plan 007 was held to.

## The steps

1. **The skeleton.** Every section table, an empty name tree, mode 0's key list, our font table described
   in code (which sets, in which face, colouring and order), laid out and passing every parse check. The
   font table's description is new: today a set's face is measured off Logitech's.
2. **The wiring and the state tables on our numbers**, with the parts nobody builds yet: the hour list,
   the battery programs, the case programs of the idle, idle entry and location maps, and an all off list
   for no device. The name tree's order checked below 32 variables.
3. **The screens**: the firmware's fourteen, the idle device list and the activity menu with no row, Off,
   drawn in the state colours with our pictures and letters, their page list copies placed where the
   reader finds them.
4. **The empty configuration checked**: every byte attributed to a generator, the attribution taught our
   pictures, colours and fresh pieces; then written once to the 650 with a bench test, to see it start,
   show both empty menus and switch off.
5. **The composers on it**: each lookup above moved to the description; the all off list for one device;
   then the first device composed onto the empty configuration, then the first activity. 11.1 then builds
   the whole test setup on it.

## Open

* **What Logitech's compiler puts in the all off list, the idle map's case and the two row device list
  with no device.** No compile with none exists. The builder's choice is the least that keeps every
  reader working, and the bench test of step 4 is what checks it.
* **The two row device list**, which nothing enters on the 650 (section 326), is left out unless step 5
  finds a composer that needs it.
