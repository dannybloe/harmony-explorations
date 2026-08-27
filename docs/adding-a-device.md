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
| 2 | every family in the catalogue has a measured rhythm | **done** 25 August 2026 |
| 3 | a whole command, not just its frame | **done** 25 August 2026 |
| 4 | the data model describes a device that does not exist yet | **done** 25 August 2026 |
| 5 | a config can change length without breaking | **done** 25 August 2026 |
| 6 | a device composed into a config, read back by our own readers | **done** 25 August 2026, the optional keypad item not taken by its own terms |
| 7 | Logitech compiles the same addition and the two agree | **done** 25 August 2026, blocks byte identical |

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
family in their database. The library's own reader takes every one of the 2921 distinct codes.

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
- [x] **check**: the number of commands FreeHarmony parses out of the recorded census is 2921 of 2921
      distinct codes and 33 of 33 families, with no family refused. It was 2852 and 32 until the
      quaternary base landed on 24 August 2026, and the test names the refused families as a set rather
      than counting them, so a family falling out again says which one

## Phase 2: every family in the catalogue has a measured rhythm

**Done, 25 August 2026.**

The table holds **32 of the catalogue's 33 families**, which is 5218 of 5219 commands. The 33rd is
`Saitek 11 Bit` and it is measured as far as it exists, which is not far: one command in the whole
census, on the Nintendo Wii, named `Unknown` with value `0x000`. The third sitting's account carries
the Wii and the compiled config has no group for it, so their compiler emitted nothing to measure, and
the code itself is a placeholder: a Wii has no infrared receiver, and an all zero value could not state
a set bit's duration even if a record existed. It is left unmeasured deliberately rather than pending. It held 15 and
4193 when this phase was written, 21 and 4743 after two sittings on 24 August 2026, and everything since
came from reading rules rather than from another compile: the records were already in the lab and
the reader could not read them. The eighteen that were missing when the sittings started, largest first: `Sharp 15 Bit` (276 commands, 4 appliances),
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
- [x] the four already compiled, `Pioneer 32 Bit 2`, `MemorexV2 32 Bit Dual`, `Panasonic 16 Bit` and
      `Sharp 48 Bit`, were measured the same day, and they are **not** a desk job on the join: each is a
      one to three command family on an appliance a sibling family dominates, and what identifies it sits
      in a frame the reader does not reach. So they move to phase 3 and are named there. Attributing them
      without reading the second frame would be elimination dressed as measurement.
      `../lab/reads/20260824-plan/family-batches.md`
- [x] **the appliances go on by hand**, in Logitech's own client, because the scripted route was refused
      on that account. Our side starts at the compile, and the read only capture of what their catalogue
      states has to run **while the appliances are still on the record**: it is one half of the join and
      the script reads the list off the account rather than from a file
- [x] **a measurement's two halves are filed together**, added after getting it wrong on 24 August 2026:
      the capture script writes to one path in the working directory, and capturing for the second sample
      overwrote the first sample's. Nothing would have complained, since the generator would have joined
      the first config's records against the second record's appliances and printed a smaller table with
      every remaining row still exact. Each sample now carries its own `catalogue-commands.json` beside
      its container and the generator reads that. The rebuilt half cost one provenance label:
      `Microsoft 30 Bit` is confirmed by one route rather than two, with its durations unchanged
- [x] one compile per account batch, filed in the lab beside the existing one with its own read date.
      The first sitting was 24 August 2026: ten appliances, 945 records, and **four families measured**,
      `Sharp 15 Bit`, `Thomson 12 Bit Toggle`, `RCAV1 LF 24 Bit` and `Philips RC5 13 Bit Toggle`, each
      exact on every one of its own records, with no existing entry's durations moving
- [x] the remaining four appliances and a second compile, done the same evening, plus the Microsoft one
      whose account name the rebuilt capture could not recover. **Two more families**,
      `Philips RECS80 11 Bit` on 35 records and `PanasonicV2 48 Bit` on 4, and `Microsoft 30 Bit` is
      confirmed by two routes again
- [x] **the phase is done as far as their compiler can take it**: every appliance that would buy a family
      has been compiled, so nothing here is waiting on Logitech, on the account or on Danny
- [x] **twelve families are still unanswered and every one has records in the lab**, which is the finding
      that moves the rest of this phase into phase 3. Ten of the twelve are one shape, a command that is
      more than one frame against a reader that looks at one: `Samsung 16 and 20 Bit` (137 commands),
      `Philips Hurd 16 Bit LongToggle` (85), `Samsung 38 Bit` (34), `MitsubishiO1 Dual 8 16 Bit` (28),
      `Panasonic 16 Bit` (26), `Pioneer 32 Bit 2` (7), `MemorexV2 32 Bit Dual` (2), `Sharp 48 Bit` (1),
      and two whose refusal nothing yet explains, `Videocrypt 11 Bit Toggle` (20) and `Saitek 11 Bit`
      (1). `Galaxis 16 Bit Quad Toggle` (104) is its own small job, a base change. So phase 3 now carries
      476 catalogue commands rather than the handful it looked like. **All twelve are read now**:
      sections 164 to 170 took them one shape at a time, and the last three fell together on 25 August
      2026 when the mark riding with the bit turned out to be one mechanism behind what had been
      written up as three problems
- [x] `make protocols` measures each new family and each entry reproduces every one of its own records
      byte for byte, with `source: 'compiled'`. 38 entries, every one exact on its own records except
      the one named loose entry, and `test/stated.test.ts` asserts both counts
- [x] `Galaxis 16 Bit Quad Toggle` reads its values as **quaternary** digits, two bits a digit, which is
      what makes its eight digit value the 16 bits its name states, section 159. Its refusal is replaced
      by a reading, not widened: `Quad` is read out of the family name exactly as the widths are, and the
      width check that refused all 69 of its codes accepts all 69 under base 4, so nothing was relaxed to
      let them in. A digit outside 0 to 3 on such a family stays a refusal. **This buys the reader and not
      the table**: its 104 commands are now readable and no appliance of that family has been compiled, so
      it has no measured rhythm and cannot yet be emitted
- [x] the three families whose analyser answer disagreed with their compiler stay out of the table on
      their analyser's word alone, section 160. The `documented` provenance is asserted empty in
      `test/stated.test.ts`, so an entry resting on their analyser alone cannot come back quietly
- [x] **check**: `make protocols` covers 32 of 33 catalogue families and at least 5150 of 5219 commands,
      every entry exact on its own records, and the covered share is asserted in a test against the
      recorded census rather than printed. **Passed on 25 August 2026 at 32 and 5218**, section 170:
      three of the four missing families were one mechanism, the mark riding with the bit, and the
      one left is `Saitek 11 Bit` (1 command). The census assertion is delivered: the test in
      `packages/codec/test/stated.test.ts` counts the recorded census itself, 2921 distinct codes all
      read, 32 of 33 families and 5218 of 5219 commands covered, and names the missing family, so any
      of those numbers moving fails a test rather than a memory

## Phase 3: a whole command, not just its frame

**Done, 25 August 2026.**

`pulsesOfFrame` stops at the frame, correctly, because nothing after it follows from the bits. A stored
command is the frame several times over with a gap between copies and a closing silence. Measured on 24
August 2026 over 4195 records whose family is known, in `../lab/reads/20260824-plan/tail-census.md`: the
**gap** is one shape on 7 of 10 families, the **repeat count** on 8 of 10, and five families have exactly
one tail shape across every record. What varies is the closing silence.

- [x] **the splitting rule is measured**, 24 August 2026, `../lab/reads/20260824-plan/step3-notes.md`. A
      frame boundary is a space at least **four times** the median space of the train, and 4 and 6 give
      the identical answer while 9 loses Samsung, which is what says the separators and the bit cells are
      two populations with a gap between them rather than a fitted threshold. Whether the separator
      belongs to the frame before it depends on which half carries and **both have to be tried**: keeping
      it refuses every Samsung code, dropping it refuses every Sony code. Explained whole goes from 1373
      of 2777 records to 1848, and `Samsung 16 and 20 Bit`, `Pioneer 32 Bit 2`, `MemorexV2 32 Bit Dual`
      and `Sharp 48 Bit` read for the first time
- [x] the rule lands in `packages/codec/src/irframe.ts` with tests, after the merge and **not** in the
      biphase reader, for the same reason the merge is not: adjacent cells of one kind are cells there.
      `frameSegments` and `framesOfSegments`, and the generator reads through the second now. Two more
      families measured, `Samsung 16 and 20 Bit` on 46 records and `MitsubishiO1 Dual 8 16 Bit` on 40,
      each exact, no existing rhythm moved, and the table is 30 entries covering 24 of 33 families and
      4915 of 5219 commands. `Samsung 38 Bit` followed on 25 August 2026 through the same splitting rule
      plus one new row shape, section 166, taking the table to **31 entries, 25 of 33 families and 4949
      of 5219 commands**: its 38 bits are one frame in sections of 17 and 21, each section's final set
      bit carried by a structural space, 35 of 35 records byte for byte. `Short 11 Bit 2` and
      `Videocrypt 11 Bit Toggle` followed the same day, section 167: their bits are spaces of up to
      8310 microseconds, past the reader's gap ceiling, and the ceiling cannot rise because another
      family's real inter frame gap sits at 8460. Each segment is read at its own scale instead, 42 of
      42 and 32 of 32 byte for byte. `Philips Hurd 16 Bit LongToggle` followed, section 168, a fourth
      row shape: three regions under one bit rule, a set bit being the cell whose first half is silence,
      and its 46 records reproduce **whole, copies and gaps included, word for word**.
      `Galaxis 16 Bit Quad Toggle` followed, section 169, a fifth row shape: quaternary on the
      wire as well as in the catalogue, four space lengths sending two bits per cell, 48 of 48 records
      whole. And `Panasonic 16 Bit`, `MemorexV2 32 Bit Dual` and `Sharp 48 Bit` closed together,
      section 170: their mark rides with the bit, two exact (mark, space) pairs, which the one length
      demand had read as a wobbling flat. The table is **38 entries, 32 of 33 families and 5218 of
      5219 commands**
- [x] **a boundary cannot fall inside the first few cells**, which the tests found rather than the
      measurement: a lead in is a mark and a long space, and on several families that space is over the
      threshold, so a rule with no floor cut the header off as its own segment and every frame then read
      a bit short. A Samsung code came out as `15:400` and a 48 bit corpus record that used to read
      disappeared. The floor is `MIN_BITS` cells
- [x] `MitsubishiO1 Dual 8 16 Bit` reads whole, 40 of 40, which the prototype could not: its code states
      `Start`, two values and `Trailer`, and the generator's per record convention loop finds both values
      once the train is segmented
- [x] **one of those four was the join and it is fixed**, and the other two are a different thing
      entirely, which measuring each one separately established rather than the one explanation that fit
      all three. `Pioneer 32 Bit 2` shares its **first** frame with `Pioneer 32 Bit Dual`, whose codes
      outnumber it 33 to 3 on the same appliance, and the generator's map from a value to a family kept
      one family per value, so all three of its records went to the sibling and the family had no entry
      to emit its 7 catalogue commands from. The join now decides a shared value by the **whole code**:
      the family with a code all of whose frames the record carries, and a refusal where none or several
      qualify. Exactly three records moved, the sibling went 37 to 34, and nothing else in the table
      changed. It is one collision on one appliance across all three samples, which is why it was easy
      to dismiss and why it cost a family
- [x] **`MemorexV2 32 Bit Dual` and `Sharp 48 Bit` are refused by a rail rather than missed by a
      reader**, and the correction is worth keeping: their numbers are read, uniquely and with no
      collision, and what refuses them is that their non carrying half is not one length. The Sharp
      record's marks alternate 409 and 410, the two MemorexV2 records' alternate 560 and 594, and a table
      entry states **one** flat duration, so no entry measured off them could reproduce them byte for
      byte. Reading a value and measuring a rhythm are two different things and the prototype only did
      the first. Admitting them would mean averaging a duration the record does not have, which is the
      opposite of this phase's own rail
- [x] the reading claim needs a **check that cannot be satisfied by a bigger table**: the catalogue share
      is asserted in a test against the recorded census, per phase 2's own last item, rather than measured
      by a script beside the notes as it is today. Delivered on 25 August 2026, the census test in
      `packages/codec/test/stated.test.ts`: it counts the census itself and names the missing family
- [x] extend a rhythm table entry with the repeat count, the gap between copies and the closing silence,
      measured per family the same way the durations are, and refuse an entry whose records disagree
      rather than averaging them. Delivered as `tail` on 25 August 2026, section 171, and the model the
      measurement demanded is richer than this box's wording: copies (with or without the lead in),
      literal words, and pad spaces sharing one per record value solved from a constant total. 24 of 38
      entries carry one; the rest refuse with a named reason, mostly a second, value dependent frame in
      the tail, which is stage two
- [x] test whether a family's closing silence is padding to a **constant total block duration**. Section
      152 tried that across the corpus and got 31 of 41 classes; per family it is exact: eleven entries
      state a constant total, named with their totals in `test/stated.test.ts`, Toshiba's 215736 constant
      across 622 records, and the families with pure literal tails need none
- [x] `blockOfStatedCode`, beside `pulsesOfStatedCode`: a catalogue string in rather than a bare number,
      because the whole record shapes need every stated value, a whole block out, refusing a family whose
      tail is not one shape rather than guessing one
- [x] **check**: for every record in the corpus and the compiled sample whose family the table names,
      building the whole block from the family entry plus that record's own number reproduces the record
      byte for byte, and the families where it does not are named with their counts. `tailExact` per
      entry, measured by the generator and pinned per family in `test/stated.test.ts`: 2045 of 2242
      records of tailed entries rebuild whole, and each shortfall is named with its reason
- [x] **the negative**: a family with no measured tail is refused, and the test says so: `Sharp 15 Bit
      2` (second frame in the tail), `Panasonic 16 Bit` (one record) and `Saitek 11 Bit` (not in the
      table) all come back `undefined` from `blockOfStatedCode`
- [x] **the held block and the trailing block, the phase's leftover**: everything above measures a
      record's **first** block, the one a press sends once. A record points at up to three, section
      127: the held block repeats for as long as the key is down and its duration is the repeat rate
      the user feels. Measured on 25 August 2026, section 171: 31 families carry one, 2151 of 2214
      records rebuild it word for word, and whether a command has one is the command's property, 517
      of Toshiba's 622. `blockOfStatedCode(code, periodNs, 'held')` emits it. The trailing pointer is
      empty on effectively everything (three Logitech records carry an empty block), and the open
      pieces are named in the section: the toggle families' second pointer group, the whole record
      shapes' held pointers, Kreatel and Mitsubishi
- [x] **stage two, the second frame as a tail item**: delivered the same day, section 171. A tail item
      names the index of one of the code's own stated frames, the Sharp 15 families turned out to
      **state** their second value rather than derive it, and their alternating frames forced the
      second pad rule, a constant copy period instead of a block total, 65000 exactly on Sharp 15 Bit.
      31 entries carry a tail and 2437 of 2682 records rebuild their whole first block. Still named
      and open: `Kreatel IP 22 Bit` (toggle shaped repeat, 164 records), `MitsubishiO1 Dual 8 16 Bit`
      (its 16 bit frame's encoding never read, 40), ten Samsung and two Pioneer Dual records off their
      family shape, and the single record families

## Phase 4: the data model carries what a new device needs

**Done, 25 August 2026.**

The application's model was shaped for what a config **read** so far, and this goal asks it to describe a
device that does not exist yet. Its command already holds a family, a width, a frame, a carrier and the
three duration blocks, `InfraredSignal` in FreeHarmony's `src/shared/library.ts`, so the catalogue route
has somewhere to land. What is not established is everything a config needs and the model has no field
for.

- [x] **the audit first, and it is the item that cannot be skipped**: walk every byte phase 6 has to
      write and check it against the model, naming each gap. Not a redesign, a list. Delivered below,
      25 August 2026: nine insertions walked, one field gap and four named rules, none a redesign
- [x] decide whether a definition **stores** its pulses or **derives** them from the family plus the
      number. Deriving keeps one source and makes a definition portable; storing survives the rhythm
      table being wrong. The measured position is that a family's durations reproduce every one of its
      records byte for byte, so deriving is the default and the field stays optional for a learned code.
      Decided derive, 25 August 2026: `InfraredSignal.stated` keeps the catalogue's code string whole,
      `pulsesOf` in FreeHarmony's `src/main/frames.ts` derives from it, and a stored block outranks a
      derived one because a measurement outranks a table. `test/pulses.test.ts` there
- [x] a device's **inputs**: the config models them as state variables with values, section 86, and the
      model has `properties` and `DeviceProperty`. Check that an input list survives the round trip.
      Both directions tested, 25 August 2026: config to model with exact per sample counts in
      `test/import.test.ts`, and model through the store whole, transitions and all, in
      `test/library.test.ts`, which no store test had ever done with a non empty list
- [x] the **timings** a device needs before it will listen. `DeviceTiming` exists and all six of its
      fields are marked unknown in FreeHarmony's `writeback.ts` for a stated reason: which base slot 15
      group holds them is not read. This goal does not need them, and a device added without them takes
      the firmware's defaults, so the item is to **say so in the model** rather than to leave a caller
      guessing. Said, 25 August 2026: `DeviceTiming`'s docstring states that absent means the firmware's
      defaults and never unknown to the model
- [x] **an appliance has options, not just commands**, noticed on 24 August 2026 while adding one of
      phase 2's appliances by hand: their client asked whether the television is used with a SCART cable,
      and an account's appliance record carries `IsScartCableSupported` beside four more flags of that
      kind. The catalogue lists `InputScart1` among that appliance's commands, so the answer plausibly
      decides which input command an activity uses. Untested, `docs/host-client.md`. The item is to decide
      whether a definition carries such an answer or refuses to hold one, since an importer that silently
      drops it produces a device whose inputs are wrong in a way nobody can see. Decided carry, 25
      August 2026: `DeviceDefinition.options` keeps the flags verbatim under Logitech's own spelling,
      nothing may act on one until the meaning is measured, and absent means nobody asked
- [x] provenance survives: a definition fetched from Logitech carries `origin: 'from-logitech'` and
      `mayBeShared` false, which is decision 11 and is not negotiable. Asserted where the origin is
      minted, `test/logitech.test.ts`, 25 August 2026
- [x] **check**: a definition built from a catalogue reply, round tripped through the store, produces the
      same pulses on the way out as it did on the way in, and a definition with no family and no pulses
      is refused rather than written as a device that sends nothing. `test/pulses.test.ts` in
      FreeHarmony, 25 August 2026: two derivations either side of a disk write compare equal, including
      a Toshiba command that has no single frame value at all, and `pulsesOf` answers `undefined` for a
      signal with no stated code and no pulses, which is the refusal a composer has to honour

### The audit, 25 August 2026

Every byte phase 6 writes, checked against `src/shared/library.ts`, `content.ts` and `writeback.ts` in
FreeHarmony, and against what the emitters actually take: `irBuildRecord` wants a carrier period, a
class byte and three block pointers per group, and `blockOfStatedCode` wants the catalogue's code
string whole, because a tail item may name the code's second frame, section 171.

| phase 6 writes | it needs from the model | the model has | gap |
|---|---|---|---|
| base slot 5, a group and one record per command | the carrier, the once block, the held block | `carrierHz` and the three pulse fields, or a family and its stated frames to derive them | 1 and 2 below |
| base slot 0, the device's name node | the label, each property's name and value count | `DeviceUse.label`, `DeviceProperty.name` and `values` | none |
| base slot 13, its state variables | values, transitions, the resting value, the maximum | `values` and `StateTransition`; the maximum is `values` minus one | 3 below |
| base slot 10, one action list per command | a device position and a command index | `Step` | none |
| base slots 6 and 11, the device's pages | the drawn label per command, the commands grouped into pages | `DeviceCommand.name` and `group`, `ButtonBinding.forDevice` | 5 below |
| base slot 17, the hit rectangles | geometry per model | nothing, correctly | none, the geometry is the composer's |
| the device list page's new row | the label | `DeviceUse.label` | none |
| base slot 8, the page's key bindings | nothing new, derived from the pages | | none |
| base slot 9, a keypad binding, optional | a named scan | `ButtonBinding.scan` and `key` | none |

Five gaps, one a field and four of them rules to write down rather than fields to add:

1. **The signal stores one frame and 1476 of 2921 catalogue codes state more than one, or a word.**
   Phase 1 already deferred this here. The emitter needs the code whole, so the fix is not a wider
   frame field: the signal keeps the catalogue's own code string, and the pulses derive from it. That
   is the store or derive box, decided below.
2. **Nothing says whether a command repeats while held.** A held block is per command in the format,
   517 of Toshiba's 622 records carry one, and neither the catalogue reply nor the model states it.
   `blockOfStatedCode` emits the family's held block for any code, so the choice is the composer's,
   and the rule can be measured off the compiled samples per function group before phase 6 needs it.
3. **A property's resting value, base slot 13's `first`, has no field and needs none.** Nothing is
   running when a config is generated, section 130, so a composed device's variables rest at 0 and
   the composer stamps that, the same way a save stamps the clock.
4. **Properties have no source on a catalogue fetch.** The reply is commands; a Power or Input
   property and its transitions are authored out of the command list, and the account level flags of
   the options box are plausibly what selects the input commands. The model holds everything authored,
   so this is composer work and not a field.
5. **A device's screen pages have no authored shape, and do not need one for this goal.**
   `ButtonBinding.inDeviceMode` is the config's own page index, which does not exist before the
   compose, so the layout is a deterministic composer rule over the command order rather than a
   stored field. `forDevice` plus the order the commands sit in is sufficient input.

## Phase 5: a config can change length without breaking

**Done, 25 August 2026.**

The wall. A Harmony One config states **12045** addresses inside itself and another **5884** positions are
implied by what precedes them, `make growth`. Adding anything moves everything above it.
`docs/growing-a-config.md` is the survey behind `edit.ts` refusing to change a length; this phase is what
lifts that refusal.

- [x] `relocate(container, at, delta)`: shift the bytes, then rewrite every **stated** address at or above
      the insertion. The census in `growth.ts` is the list of address classes and is already exhaustive.
      `packages/codec/src/relocate.ts`, 25 August 2026, section 172. **The census was not exhaustive**:
      it missed base slot 16's records and digit tables, which only the two made configs populate, so
      the corpus could never have shown it, and both made configs are in the check's population now
- [x] the **implied** positions, each named rather than swept up: the picture bank's walk, every mode
      page's second copy of its tagged list, base slot 5's shared duration blocks, base slot 16's shared
      digit tables. All four are claims, so the check's claim comparison covers each; the bank's walk is
      the one that bit, twice: its extent is implied by landing on the trailer, so a bank container's
      top is not insertable, and its stated start sits two bias bytes below its first picture, so the
      bank's bottom means the section start. Section 172
- [x] the three restamped fields: `end_addr`, the trailer checksum, and the end marker's position.
      The first two are restamped, checksum last since it runs over everything; the third moves only
      when the slot count changes, which is per architecture and never a growth, `restamps` in
      `growth.ts`
- [x] base slot 15's group lengths and entry count are **not** touched, since the firmware replaces a
      group whose length it does not expect with compiled in defaults, silently, section 44. By
      construction and by test: a relocation rewrites address fields alone, and the mechanical half of
      the check fails on any byte that is not a rewritten pointer or one of the two restamps
- [x] **check, and this is the one that carries the phase**: for every container in the corpus, insert a
      run of filler at each of a set of offsets, relocate, and assert that every reader reports exactly
      what it reported before. Same devices with the same names, same activities, same drawn text, same
      key bindings, same infrared frames, same rendered screens, and the checksum and end marker verify.
      `test/relocate.test.ts`, 25 August 2026: 19 corpus containers plus the two made configs, two
      offsets each, the claim multiset and the whole inventory compared, plus a mechanical half that
      demands the byte diff against a naive shift be exactly the rewritten fields and the two restamps.
      What it found on the way is the floor: filler between the marker and the key table is read as key
      records, section 52, so `relocationFloor` starts past the key table and `relocate` refuses below it
- [x] **the negative**: switching off the rewrite of any one address class has to break that check, and
      the test names which class it disabled. All 21 classes a Harmony One config states addresses in,
      each omission caught by the identical check that passes whole, and the class list is asserted
      exactly so a class falling out of the census is a diff and not a silence
- [x] `edit.ts` keeps refusing a length change by default. The relocation pass is a separate entry point,
      so a same length edit cannot accidentally take this road. Nothing in `edit.ts` calls or imports
      `relocate.ts`, and its refusal tests are untouched

## Phase 6: a device composed into a config

**Done, 25 August 2026**, short of the optional keypad item, which its own text gates on a named scan.
The screen half is `composeDeviceScreen`, section 173, Harmony One (arch 12) alone by design.

A device is not a list of codes. Seven pieces, and each one is an insertion that phase 5 has to carry.

- [x] base slot 5: a new device group and one record per command, built by `irBuildRecord` and
      `irBuildBlock`, which exist and are tested. `composeIrGroup` in `packages/codec/src/compose.ts`,
      25 August 2026: blocks derived from the stated codes and deduplicated the way the corpus shares
      them, the group appended because a device is its group's index, and the held block chosen per
      command since nothing states it, phase 4's audit gap 2
- [x] base slot 0: the device's node in the name tree, so its label exists in ASCII, section 126.
      `composeDevice` appends `<label>_Power_2` at level 1 under the new variable's index and grows
      the frame's own stated length; the label is refused if it carries the grammar's separator
- [x] base slot 13: its state variables with their transitions, one action list instruction each, and
      **none of the firmware's own 0 to 12**, section 138. One power variable, `first` 0 because
      nothing runs when a config is generated, both transitions running the power command's list, and
      the new index asserted above the firmware's thirteen
- [x] base slot 10: one action list per command, so a binding has something to point at. One
      four byte list per command, a single send of `(group << 8) | record`, appended to the table so
      no existing list renumbers
- [x] base slot 6 and 11: a device mode page whose screen program draws the device's name, reusing glyph
      codes the config already carries. A code is a config's own index into its font table, section 112,
      so a new string is spelled out of codes that already exist or the phase stops and says which
      character is missing. `composeDeviceScreen`, 25 August 2026, section 173: the mode block is laid
      out the way every corpus mode is, list, chrome, page program, page record, entry, and the refusal
      is per character **per font**, which mattered immediately: font 10, which titles every corpus
      device mode, cannot spell `LG` on `one_config`, so the title uses font 9
- [x] base slot 17: the hit rectangles for that page, since a screen button's place is stated and not
      inferred on this remote, section 125. **Stated by reuse rather than by insertion**: the page
      declares hit page 10, the standard six slot device layout, and section 125's own closure is that a
      page binds a subset of what its hit page offers, so base slot 17 gains no bytes
- [x] **the device list page gains a row, and nothing else navigates to a new page.** The mode that lists
      the equipment is what device mode opens on, so a device page nobody can reach is the failure that
      would pass every reader test in phase 6's check. That page needs the label drawn, a hit rectangle
      and a binding that enters the new mode. Done, and the count was the surprise: `one_config` has
      **ten** device list menus, one per context the list is shown in, each getting the row, the flip
      retagged to the bottom key and the lead byte moved to the three row layout, section 173
- [x] base slot 8: the key bindings for that page. The page's own tagged list lands in base slot 8 where
      every page list lives, section 83, and its section 69 pool copy extends the last pool, since the
      pool walk only accepts a run holding a base slot 9 set
- [ ] base slot 9: the keypad, **optional and only for a named scan.** Not needed for this goal, and a
      scan `reference/button-maps.md` does not name must not be bound on a guess. Not taken, by its own
      terms: the composed record list is the empty wide form
- [x] **check**: take a real config, add a television from the catalogue, and our own readers report one
      more device with the right name, its commands decode back to the exact numbers the catalogue states,
      every screen still renders with nothing unresolved, the byte accounting is still 100% with no
      overlaps, and the whole file round trips through the emitter.
      `packages/codec/test/compose.test.ts`, 25 August 2026, and finishing it found a placement defect in
      the naming half: the state record had dropped the timer table out of the relocation census
      silently, section 173, and a regression now pins the table's survival
- [x] **check, the reachability half**: the device list page's own bindings reach the new page, and the
      new page's bindings reach the new commands, walked by the same four hop chain that names an
      activity, section 120. A page that renders and cannot be reached passes everything above. Walked
      off the composed container: every menu's row runs the shared list that beeps, enters the new mode
      and marks device mode, and each of the page's rows is one send to the new group

## Phase 7: Logitech compiles the same addition and the two agree

**Done, 25 August 2026**, section 174. The differences are written, and the blocks are not merely
equivalent: they are byte identical.

The known answer check, and the only one that can catch a config that is valid and wrong.

- [x] compile two configurations on the same account, differing by exactly the device phase 6 adds.
      `phase7.py` in the lab, run by Danny on 25 August 2026: the calibration account's Harmony One,
      compiled, given the LG 42LM3400 out of the catalogue, compiled again. `phase7_before` and
      `phase7_after` in the lab index
- [x] compare **inventories, not bytes**: device count and names, command numbers per device, activity
      structure, and what each key sends. One more device on their side and ours, activities untouched
      on both, and for the three commands the caller asked for, our once and held blocks are **byte
      identical to their records**, after two of their spelling conventions were measured and adopted:
      the lead-in silence every once block opens with, and the half word rule with its closing one
      microsecond word, section 174
- [x] **check**: the difference between their addition and ours is empty, or every difference in it is
      explained in writing before the phase is ticked. Five differences, all in section 174: they
      prepend the group and renumber where we append; they add all 67 catalogue commands as 79 records
      where we add the chosen three; their name is the account's with spaces as underscores where ours
      is the caller's; their PowerToggle carries a held block, which settles phase 4's audit gap 2 in
      the direction our default already took; and their screens are this generator era's layout, which
      `composeDeviceScreen` refuses by name because its fonts and row shapes are read off the classic
      era family, follow-up work and not a defect the comparison can hide

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
**unproven by measurement**: the spare Harmony One's original contents are in the lab byte for byte and
verified against the unit, and restoring from a dump has never been tried, here or anywhere in this
project except by hand on the Harmony 525. It is no longer **unread**, since section 189: the Harmony
One's bootloader is a resident USB flash programmer entered from a key held at power on, it protects
itself from its own erase, and it copies nothing, so entering it destroys nothing. Two things that
changes and one it does not. A remote whose internal image is destroyed still attaches and answers, which
is the deepest fallback in the part; and the Harmony 525 comparison in the paragraph above is not merely
a different architecture, it is a different mechanism, because on arch 12 recovery is not an install.
What it does not change is this box, because that programmer writes internal flash and a config lives in
external NOR, so it is **not** shown to put a config back. And it is a milestone with its own place in the plan, M4, which a checklist item is
not allowed to consume on its way past.

**So the gate is one sentence.** Phase 8 starts when Danny says so, with phase 7 ticked and the
restore-from-dump route rehearsed first, and not because phase 7 finished.

**Danny said so on 25 August 2026**, the day after phase 7 ticked, and the derivation that stood in
front of the rehearsal was done the same day, section 175: the whole transfer is read on both bench
architectures, clean room from the firmware, with concordance's length map turning up as
corroboration afterwards. An announce, a run of `0x4A` data packets that are answered by nothing, and
`0xF1 0x30` acknowledged once with `0xF0 0x30` from state 3.

**`writeFlash` still refuses, and the reason moved.** Two things about the medium are open and either
decides whether a write lands rather than corrupts: whether the firmware erases before it programs,
and whether a host must pace its data packets given one 63 byte staging buffer and no per packet
reply. Flash only clears bits, so programming over unerased content silently yields the AND of old and
new.

**So the rehearsal shrinks to one erase block**, which is what section 175 recommends and what the
first box below now asks for. A Harmony One config is about 1.6 MB and 26 blocks, and the count is per config; one block of it, erased and
rewritten from the verified dump with the bytes it already holds, exercises the erase, the announce,
the packets, the done and the read back compare, ends byte identical either way, and is repeatable if
it fails halfway.

**One thing this paragraph claimed and it was wrong**, corrected before anything ran: that writing the
block without erasing first would answer the erase question by measurement. It cannot, because the
bytes being written are the bytes already there, so the AND of old and new is the bytes back and both
answers look identical. The rehearsal erases explicitly instead, which is correct under either answer,
and the erase question waits for a write that actually changes something.

## Phase 8: the write path, on the spare Harmony One

M4, and behind the gate above. The rails are written and off, `packages/usb/src/rails.ts`.

- [ ] a verified original dump of the spare Harmony One in the lab, byte for byte against the device.
      This exists and gets re-verified on the day
- [ ] **the restore rehearsed before the write, not after it.** Nothing here has ever put a config back
      onto a remote, so the recovery path is a belief and not a measurement. Write the unit's **own**
      dump back first and read it back identical: a write that changes nothing is the cheapest possible
      first write, and it is the only one whose correct outcome is known in advance. **One 64 KiB erase
      block of it, not the whole config**, section 175: same exercise end to end, a twenty sixth of the
      erase cycles, and repeatable if it fails halfway
- [x] **whether a host must pace its data packets**, answered by reading, section 175: the command
      dispatcher returns whether work is pending and its caller drains the staging buffer in the same
      service call, on all three images, so a packet is programmed before the dispatcher can be
      entered again and the done cannot overtake the last packet. `writeFlash` defaults to no delay
      on that derivation and keeps the delay as an option. **What is still not derived is the
      silicon**: whether the USB peripheral can accept a second report before the firmware has
      serviced the first is the endpoint's buffer descriptor, unread, so the streamed run on the
      block above is still worth watching even though the firmware asks for nothing
- [ ] the dry run first, which needs no flag and writes nothing:
      `node packages/usb/bin/rehearse-block.ts --dump <image> --block 0x...`. It reads the block,
      compares it with the dump and prints the packet plan, and it is what turns
      `originalDumpVerified` from a caller's word into a measurement for the range being written
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
