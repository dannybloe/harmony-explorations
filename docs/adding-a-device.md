# Adding a device to a remote: the checklist

**The goal, in one sentence.** Pick an appliance out of Logitech's catalogue, put it on a Harmony One,
and press a button on the remote and have the appliance respond.

**The button is one the remote draws on its screen**, and the reason is convenience rather than
necessity. A screen button's position is **stated** by the config, base slot 17's rectangles picked out
by a mode page's own byte, section 125, so a target we author is a target the firmware will hit, and a
device page full of commands is what device mode is mostly used for anyway.

**A physical key is available too, and this paragraph got it wrong twice before it got it right.** It
first claimed nothing here can name the keypad, then that 12 keys were unnamed and learnable. Both are
wrong, and the second was arithmetic: 44 keys drawn minus 32 named is 12, and that difference is not one
population. The measured breakdown of the Harmony One's 44 keys, `reference/button-maps.md` against
`reference/silhouettes/one.svg`:

| | keys | |
|---|---|---|
| named, scan known | 32 | `Guide` is scan 18, so binding it is a lookup |
| named, scan known, which of a pair unresolved | 4 | the two up keys and the two down keys |
| no scan at all | 8 | `Off`, `Help`, `Activities`, `ScreenPrev`, `ScreenNext`, `SoftLeft`, `SoftRight`, `Enter` |

**The eight are not a gap to close.** Logitech's own button maps name 36 buttons for this remote and
every one of them is placed, section 145, so the eight are keys their software never offers as a target
because the remote uses them itself. Nothing is waiting to be learned there, and binding one in their
client is not possible.

So the keypad is a real second route for 32 keys, and this goal takes the screen because it needs no
lookup at all.

**It has two finish lines and only the first one is this checklist's.** Phases 1 to 7 end in a config we
built ourselves, carrying a device that was not in it before, which every reader here reports correctly
and which Logitech's own compiler agrees with. Nothing is written to any remote to get there and no rail
moves. Phases 8 and 9 put it on the spare Harmony One and press the button, and they are the **first write
this project would ever perform**, so they are a decision of their own and are gated as such below. Work
the first part without waiting on the second.

**Why this document exists.** Every part of this has been started at some point and none of it has been
finished, because each session picked a piece and the goal went out of sight. This is the plan of record
for that goal and nothing else. It is a checklist rather than an argument: an item is either done or it
is not, and every phase ends in a check that can fail. `docs/roadmap.md` stays the plan of record for
the project as a whole and points here for this goal.

**How to use it.** Work top to bottom. Tick an item only when its check is a test in the repository, not
when the code exists. When a phase is finished, the line under its heading says so and the next session
starts at the first unticked box.

## Where it stands

| phase | what it gets us | status |
|---|---|---|
| 1 | the catalogue reads whole, in the application too | **done** 24 August 2026 |
| 2 | every family in the catalogue has a measured rhythm | not started |
| 3 | a whole command, not just its frame | not started |
| 4 | the data model describes a device that does not exist yet | not started |
| 5 | a config can change length without breaking | not started |
| 6 | a device composed into a config, read back by our own readers | not started |
| 7 | Logitech compiles the same addition and the two agree | not started |

That is the checklist. Below it, behind a gate:

| phase | what it gets us | status |
|---|---|---|
| 8 | the write path, on the spare Harmony One | needs a decision first |
| 9 | the appliance responds | needs a decision first |

## What this deliberately does not need

Named so that nobody adds them to the critical path.

* **Learning a code from an old remote.** That is M5 and a second route to the same place. The catalogue
  route is enough for this goal, and capture is already read, section 98.
* **An encoder for pictures and glyph bodies.** A device page reuses glyphs the config already has,
  which is why phase 6 has a text item rather than a font item.
* **Matching Logitech's byte layout.** Two compiles of one unchanged account differ in 67% of their
  bytes, section 154, so equality with their generator is not achievable and not wanted. Phase 6
  compares inventories.
* **Any remote other than the Harmony One.** It is the only architecture with a write target, and arch
  14 (Harmony 600) stays read only until a second one exists. Phases 1 to 7 are architecture neutral and
  7 and 8 are the One alone.
* **The application's interface.** Phase 1 touches FreeHarmony's main process and no screen. The rest of
  this repository owes FreeHarmony an API, not a page.
* **An activity.** A device added in device mode is reachable without one, `docs/how-a-harmony-works.md`,
  and an activity would add a second keypad map to author for no gain here. Adding a device **to** an
  existing activity is the natural next goal and is not this one.
* **Logitech's device search in the application.** It exists already, `src/main/logitech/client.ts` in
  FreeHarmony, which is why phase 1 is a parser swap and not a new route.

## Assumptions, which are decisions if any of them is wrong

1. **The checklist ends short of hardware, and that is deliberate.** It used to say "the plan ends on
   hardware", which quietly put lifting the write flag on an irreplaceable remote inside a list of boxes
   to tick. Phases 1 to 7 are checkable with nothing plugged in, so they get worked to the end first, and
   the write is asked for separately when there is something worth writing. Shipping a writer to users is
   a third thing again, FreeHarmony's step 4, and version 1 is read only by decision 8.
2. **Logitech's service is a measurement instrument, not a runtime dependency.** Asking their compiler
   for a family we hold no sample of is how the current eighteen were measured, sections 160 to 163, and
   it is how the rest get measured. Nothing built here calls it at run time.
3. **The first device added is one whose family we already hold**, so that phase 6 is not blocked on
   phase 2 finishing. A television of a family in the table, on the spare Harmony One.

## Phase 1: the catalogue reads whole, in the application too

**Done, 24 August 2026.**

FreeHarmony carried its own parser for Logitech's code notation, written before section 159 read that
notation as a grammar. Measured against the 5219 commands in the wide census: it read **1221**, and on
**60 of 102 appliances it read nothing at all**, including every Toshiba code, which is the largest
family in their database. The library's own reader takes 2852 of 2921 distinct codes.

- [x] `src/main/logitech/client.ts` in FreeHarmony calls `statedCode` from `@harmony/codec`, through one
      exported conversion `catalogueCode`, and `protocol.ts`'s private `KEY_CODE` regex, `StatedCode` type
      and `statedCode` are gone
- [x] **the reader was not exported from `packages/codec` at all**, which is half the cause and was not in
      this phase when it was written: `protocols.ts` and `stated.ts` were reachable only by file path, so
      the barrel offered no way to read their notation. A library that does not export a reader is part of
      why a second one gets written, so the export is the fix and not only the call site
- [x] the two stale claims in that file's docstring go: that a code cannot be carried across, and that
      turning a name and a number into a rhythm needs **an encoder per protocol family**<!--superseded-->
      "which nothing here has". Both were refuted by sections 157 and 158, where a family's durations turn
      out to be the family's and a stated code is emitted from the table
- [x] a test in FreeHarmony reads the recorded census and asserts the count it now parses, with the old
      count named as what it was
- [x] **a code stating several frames stores none**, which the swap forced a decision about. 1476 of the
      2921 distinct codes state more than one frame or name one with a word, and the stored signal has one
      frame field, so those keep their family and their width and no value. Storing the first would be a
      command that looks whole and sends half of itself, which is exactly what the old reader did to
      `Pioneer 32 Bit 2`. Widening the stored shape is phase 4
- [x] **check**: the number of commands FreeHarmony parses out of the recorded census is 2852 of 2921
      distinct codes, and the one family refused is `Galaxis 16 Bit Quad Toggle` by name

## Phase 2: every family in the catalogue has a measured rhythm

The table holds 15 of the catalogue's 33 families, which is 4193 of 5219 commands and 70 of 102
appliances complete. The eighteen missing, largest first: `Sharp 15 Bit` (276 commands, 4 appliances),
`Samsung 16 and 20 Bit` (137), `Thomson 12 Bit Toggle` (124), `Galaxis 16 Bit Quad Toggle` (104),
`Philips Hurd 16 Bit LongToggle` (85), `RCAV1 LF 24 Bit` (83), `Philips RC5 13 Bit Toggle` (40),
`Samsung 38 Bit` (34), `Short 11 Bit 2` (31), `MitsubishiO1 Dual 8 16 Bit` (28), `Panasonic 16 Bit` (26),
`Philips RECS80 11 Bit` (23), `Videocrypt 11 Bit Toggle` (20), `Pioneer 32 Bit 2` (7),
`PanasonicV2 48 Bit` (4), `MemorexV2 32 Bit Dual` (2), `Sharp 48 Bit` (1), `Saitek 11 Bit` (1).

The route is measured and it is the one that produced the current entries: `DeviceManager/UpdateMultiple`
puts a catalogue appliance on the account, their service compiles a configuration containing it, and the
durations in the result are the ones their generator emits.

- [x] pick one appliance per missing family out of the census, so that one compile covers as many as
      possible. Done on 24 August 2026, and checking it against the record that was already compiled cut
      it: **four of the 18 families were on that record already**, one to three commands each, so they
      were compiled and did not reach the table for want of records to attribute rather than for want of
      data. That leaves **14 families never compiled and 14 appliances**, which is one sitting rather than
      two. The makes, the models and the catalogue ids are in
      `../lab/reads/20260824-plan/family-batches.md`
- [ ] the four already compiled, `Pioneer 32 Bit 2`, `MemorexV2 32 Bit Dual`, `Panasonic 16 Bit` and
      `Sharp 48 Bit`, are a **desk job on evidence already held** and come first because they are free.
      Their durations are in the configuration of 24 August 2026 and what is missing is a way to attribute
      one to three records to a family
- [ ] **the appliances go on by hand**, in Logitech's own client, because the scripted route was refused
      on that account. Our side starts at the compile, and the read only capture of what their catalogue
      states has to run **while the appliances are still on the record**: it is one half of the join and
      the script reads the list off the account rather than from a file
- [ ] one compile per account batch, filed in the lab beside the existing one with its own read date
- [ ] `make protocols` measures each new family and each entry reproduces every one of its own records
      byte for byte, with `source: 'compiled'`
- [ ] `Galaxis 16 Bit Quad Toggle` reads its values as **quaternary** digits, two bits a digit, which is
      what makes its eight digit value the 16 bits its name states, section 159. Its refusal is replaced
      by a reading, not widened
- [ ] the three families whose analyser answer disagreed with their compiler stay out of the table on
      their analyser's word alone, section 160
- [ ] **check**: `make protocols` covers 32 of 33 catalogue families and at least 5150 of 5219 commands,
      every entry exact on its own records, and the covered share is asserted in a test against the
      recorded census rather than printed

## Phase 3: a whole command, not just its frame

`pulsesOfFrame` stops at the frame, correctly, because nothing after it follows from the bits. A stored
command is the frame several times over with a gap between copies and a closing silence. Measured on 24
August 2026 over 4195 records whose family is known, in `../lab/reads/20260824-plan/tail-census.md`: the
**gap** is one shape on 7 of 10 families, the **repeat count** on 8 of 10, and five families have exactly
one tail shape across every record. What varies is the closing silence.

- [ ] extend a rhythm table entry with the repeat count, the gap between copies and the closing silence,
      measured per family the same way the durations are, and refuse an entry whose records disagree
      rather than averaging them
- [ ] test whether a family's closing silence is padding to a **constant total block duration**. Section
      152 tried that across the corpus and got 31 of 41 classes; it has never been tried per family, and
      per family is where the rhythm turned out to live
- [ ] `blockOfStatedCode`, beside `pulsesOfStatedCode`: a family name, a number and a carrier in, a whole
      block out, refusing a family whose tail is not one shape rather than guessing one
- [ ] **check**: for every record in the corpus and the compiled sample whose family the table names,
      building the whole block from the family entry plus that record's own number reproduces the record
      byte for byte, and the families where it does not are named with their counts
- [ ] **the negative**: a family with no measured tail is refused, and the test says so

## Phase 4: the data model carries what a new device needs

The application's model was shaped for what a config **read** so far, and this goal asks it to describe a
device that does not exist yet. Its command already holds a family, a width, a frame, a carrier and the
three duration blocks, `InfraredSignal` in FreeHarmony's `src/shared/library.ts`, so the catalogue route
has somewhere to land. What is not established is everything a config needs and the model has no field
for.

- [ ] **the audit first, and it is the item that cannot be skipped**: walk every byte phase 6 has to
      write and check it against the model, naming each gap. Not a redesign, a list
- [ ] decide whether a definition **stores** its pulses or **derives** them from the family plus the
      number. Deriving keeps one source and makes a definition portable; storing survives the rhythm
      table being wrong. The measured position is that a family's durations reproduce every one of its
      records byte for byte, so deriving is the default and the field stays optional for a learned code
- [ ] a device's **inputs**: the config models them as state variables with values, section 86, and the
      model has `properties` and `DeviceProperty`. Check that an input list survives the round trip
- [ ] the **timings** a device needs before it will listen. `DeviceTiming` exists and all six of its
      fields are marked unknown in FreeHarmony's `writeback.ts` for a stated reason: which base slot 15
      group holds them is not read. This goal does not need them, and a device added without them takes
      the firmware's defaults, so the item is to **say so in the model** rather than to leave a caller
      guessing
- [ ] **an appliance has options, not just commands**, noticed on 24 August 2026 while adding one of
      phase 2's appliances by hand: their client asked whether the television is used with a SCART cable,
      and an account's appliance record carries `IsScartCableSupported` beside four more flags of that
      kind. The catalogue lists `InputScart1` among that appliance's commands, so the answer plausibly
      decides which input command an activity uses. Untested, `docs/host-client.md`. The item is to decide
      whether a definition carries such an answer or refuses to hold one, since an importer that silently
      drops it produces a device whose inputs are wrong in a way nobody can see
- [ ] provenance survives: a definition fetched from Logitech carries `origin: 'from-logitech'` and
      `mayBeShared` false, which is decision 11 and is not negotiable
- [ ] **check**: a definition built from a catalogue reply, round tripped through the store, produces the
      same pulses on the way out as it did on the way in, and a definition with no family and no pulses
      is refused rather than written as a device that sends nothing

## Phase 5: a config can change length without breaking

The wall. A Harmony One config states **12045** addresses inside itself and another **5884** positions are
implied by what precedes them, `make growth`. Adding anything moves everything above it.
`docs/growing-a-config.md` is the survey behind `edit.ts` refusing to change a length; this phase is what
lifts that refusal.

- [ ] `relocate(container, at, delta)`: shift the bytes, then rewrite every **stated** address at or above
      the insertion. The census in `growth.ts` is the list of address classes and is already exhaustive
- [ ] the **implied** positions, each named rather than swept up: the picture bank's walk, every mode
      page's second copy of its tagged list, base slot 5's shared duration blocks, base slot 16's shared
      digit tables
- [ ] the three restamped fields: `end_addr`, the trailer checksum, and the end marker's position
- [ ] base slot 15's group lengths and entry count are **not** touched, since the firmware replaces a
      group whose length it does not expect with compiled in defaults, silently, section 44
- [ ] **check, and this is the one that carries the phase**: for every container in the corpus, insert a
      run of filler at each of a set of offsets, relocate, and assert that every reader reports exactly
      what it reported before. Same devices with the same names, same activities, same drawn text, same
      key bindings, same infrared frames, same rendered screens, and the checksum and end marker verify
- [ ] **the negative**: switching off the rewrite of any one address class has to break that check, and
      the test names which class it disabled
- [ ] `edit.ts` keeps refusing a length change by default. The relocation pass is a separate entry point,
      so a same length edit cannot accidentally take this road

## Phase 6: a device composed into a config

A device is not a list of codes. Seven pieces, and each one is an insertion that phase 5 has to carry.

- [ ] base slot 5: a new device group and one record per command, built by `irBuildRecord` and
      `irBuildBlock`, which exist and are tested
- [ ] base slot 0: the device's node in the name tree, so its label exists in ASCII, section 126
- [ ] base slot 13: its state variables with their transitions, one action list instruction each, and
      **none of the firmware's own 0 to 12**, section 138
- [ ] base slot 10: one action list per command, so a binding has something to point at
- [ ] base slot 6 and 11: a device mode page whose screen program draws the device's name, reusing glyph
      codes the config already carries. A code is a config's own index into its font table, section 112,
      so a new string is spelled out of codes that already exist or the phase stops and says which
      character is missing
- [ ] base slot 17: the hit rectangles for that page, since a screen button's place is stated and not
      inferred on this remote, section 125
- [ ] **the device list page gains a row, and nothing else navigates to a new page.** The mode that lists
      the equipment is what device mode opens on, so a device page nobody can reach is the failure that
      would pass every reader test in phase 6's check. That page needs the label drawn, a hit rectangle
      and a binding that enters the new mode
- [ ] base slot 8: the key bindings for that page
- [ ] base slot 9: the keypad, **optional and only for a named scan.** Not needed for this goal, and a
      scan `reference/button-maps.md` does not name must not be bound on a guess
- [ ] **check**: take a real config, add a television from the catalogue, and our own readers report one
      more device with the right name, its commands decode back to the exact numbers the catalogue states,
      every screen still renders with nothing unresolved, the byte accounting is still 100% with no
      overlaps, and the whole file round trips through the emitter
- [ ] **check, the reachability half**: the device list page's own bindings reach the new page, and the
      new page's bindings reach the new commands, walked by the same four hop chain that names an
      activity, section 120. A page that renders and cannot be reached passes everything above

## Phase 7: Logitech compiles the same addition and the two agree

The known answer check, and the only one that can catch a config that is valid and wrong.

- [ ] compile two configurations on the same account, differing by exactly the device phase 6 adds
- [ ] compare **inventories, not bytes**: device count and names, command numbers per device, activity
      structure, and what each key sends
- [ ] **check**: the difference between their addition and ours is empty, or every difference in it is
      explained in writing before the phase is ticked

## The gate between the two parts

**Why the write cannot simply be dropped.** Nothing in phases 1 to 7 can prove a config **works**. The
strongest cautionary case this project holds is section 117: somebody cloned a device into a config, and
the result passed both checksums, rendered every screen pixel identical, closed its counts and was
accepted by this parser, while every infrared command in it addressed the wrong place. Agreement with
Logitech's compiler is a much better check than that and it is still a comparison of two files. The only
falsifier for "the config works" is an appliance responding to it. So the hardware run stays the real
finish line and is not written out of the goal.

**Why it is nonetheless a separate decision.** Three reasons, and each is enough on its own. It is the
first write this project would ever perform, on a device that cannot be replaced. The recovery route is
**unproven**: the spare Harmony One's original contents are in the lab byte for byte and verified against
the unit, and restoring from a dump has never been tried, here or anywhere in this project except by hand
on the Harmony 525. And it is a milestone with its own place in the plan, M4, which a checklist item is
not allowed to consume on its way past.

**So the gate is one sentence.** Phase 8 starts when Danny says so, with phase 7 ticked and the
restore-from-dump route rehearsed first, and not because phase 7 finished.

## Phase 8: the write path, on the spare Harmony One

M4, and behind the gate above. The rails are written and off, `packages/usb/src/rails.ts`.

- [ ] a verified original dump of the spare Harmony One in the lab, byte for byte against the device.
      This exists and gets re-verified on the day
- [ ] **the restore rehearsed before the write, not after it.** Nothing here has ever put a config back
      onto a remote, so the recovery path is a belief and not a measurement. Write the unit's **own**
      dump back first and read it back identical: a write that changes nothing is the cheapest possible
      first write, and it is the only one whose correct outcome is known in advance
- [ ] `INTENDEDVERSION` compared against the connected remote's protocol, skin, board and flash id, and
      refused on any mismatch
- [ ] `ERASE_FLASH` scoped: a block aligned address and a whole block inside the config region, with the
      ceiling at `0x3D0000` because the stored application firmware sits inside the nominally writable
      region
- [ ] `WRITE_FLASH` restricted to the config region for the detected architecture, refused by the library
      and not by the interface
- [ ] every write followed by a `READ_FLASH` of the same range and a byte comparison, where a mismatch is
      a failure and not a warning
- [ ] **check**: a config we produced is on the spare Harmony One and reads back byte identical to what
      we sent
- [ ] the flag stays off for anything that is not this bench script

## Phase 9: the appliance responds

- [ ] write the config phase 6 produced to the spare Harmony One
- [ ] press the device's button at the appliance and watch it respond
- [ ] **check**: the appliance responds, the remote still boots, its clock is right, its other activities
      still work, and the config reads back byte identical
- [ ] write up the whole run as a finding, with what did not work the first time

## The order, and what could be done in parallel

Phase 1 is independent of everything and is half a day. Phase 2 needs one bench session with the network
and then a measurement pass. Phase 3 depends on phase 2 only for the families phase 2 adds, so it can
start on the families already in the table. Phase 4's audit can be done today and its decisions want
phase 3's answer. Phase 5 depends on nothing and is the longest; it is the one to start early and it is
where the risk is. Phase 6 needs phases 3, 4 and 5. Phase 7 needs phase 6, and it is where the checklist
ends. Phases 8 and 9 need hardware, phase 6, and the gate.

**The one thing that would change this plan**: if phase 5's check cannot be made to pass on all nineteen
containers, then adding a device to an existing config is out, and the fallback is a config **generated**
whole rather than edited, which is a different project and much larger. That is why phase 5's check is
stated as an equality over every reader rather than as a round trip: a round trip would pass on a
relocation that moved a pointer nobody reads.
