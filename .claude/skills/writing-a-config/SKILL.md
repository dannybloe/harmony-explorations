---
name: writing-a-config
description: The rails a config writer must respect, and why each one exists. Use before changing any byte of a Harmony configuration container: editing a device, an activity, a key binding, a favourite channel, an infrared record or a screen, running the write rehearsal, or working on edit.ts, relocate.ts or the write path in packages/usb. Also use when judging whether a proposed edit is safe.
---

# Writing a config: the rails, and the evidence behind each

**Every rail here is a way to produce a configuration the remote accepts and mishandles.** That is
the hazard class this skill exists for: not a crash, not a refused file, but a config that passes
both checksums, renders identically, closes every count this project can check, and is wrong. One of
them, the oversized sequence, hung a Harmony One three times out of three, each needing a battery
pull.

Two things frame the rest. **Version 1 of the application is read only** and every write path sits
behind `HARMONY_ENABLE_WRITES=1`, so reaching these rails is deliberate. And **nothing here has ever
written to a remote**, so a rail that has not been exercised is a prediction, not a habit.

The hardware rails are separate and they stay in `CLAUDE.md`, always loaded: never write to a remote,
firmware is never written, no write without a verified dump of that exact unit, every write read back
and compared. Those are about the device. These are about the file.

Moved out of `CLAUDE.md` on 29 August 2026, where thirteen thousand characters of evidence sat in
every session's context to describe a moment that only happens while editing a container. The
headline of each rail stayed behind as a table, so a session can see that a rail exists without
loading the argument for it.

## The rails

Collected here because they are scattered across a dozen findings and every one of them is a way to
produce a config the remote accepts and mishandles.

* **Base slot 13's first seven records are the clock and are stamped too**, section 130: `first` is the
  value a variable holds when the config is generated, and records 0 to 6 are second, minute, hour, day,
  weekday, month and year, each equal to the corresponding field of base slot 3's timestamp in all 21
  containers. So a carried over config carries a stale clock in two places, not one, and none of them may
  be reused for anything else, which section 74 had already said of 3, 5 and 6. **The firmware owns
  thirteen and not seven**, section 138: variables 7 to 12 state the identical value and maximum in every
  container of their architecture and base slot 0 names none of them, index 13 being where both stop. So
  the rail is to reuse none of 0 to 12, and on arch 9 (Harmony 525) their values differ from the other
  three architectures, so a carried over config must keep each architecture's own. **It is eight values and
  sometimes nine, not seven**, which building the rail found rather than reading it. **Five** maxima are
  constants, `59, 59, 23, 6, 11`. Two move with their value and both have to be stamped: the year's is
  that year plus one, and the day of the month's is 30 in every container here because none was built on
  a 31st, so a save on a 31st writes a day of 31 into a variable whose stated range stops at 30. Either
  one left unstamped is a config declaring a value outside its own variable's range. This page said
  "six maxima are constants"<!--superseded--> until 29 August 2026, having found the year's and missed
  the day's, and `packages/codec/src/sections.ts` carries the day half with the note that it cost
  nothing but asking for the 31st. `clockStateEdits` in `packages/codec/src/edit.ts`, and it refuses a
  base slot 13 whose other maxima are not the clock's.
* **Base slot 3's timestamp is stamped at write time, not copied**, section 111: an arch 12 remote's
  clock holds this value at every boot, so a stale timestamp is a wrong clock by exactly its staleness.
  The rail holds on the other architectures too without needing their measurement, because stamping the
  moment of writing is the right provenance value whatever the remote does with it, and it holds whether
  the firmware reads this record or base slot 13's `first`, which section 137 says nothing separates:
  both get stamped by a save. This is the one
  field where reproducing the input byte for byte, which is what a round trip test wants, is the wrong
  thing for a save.
* **`end_addr` is restamped when anything changes length**, and it is the only header field that
  moves with a section's growth, which is also why the container's base is anchored on the clock
  record here rather than computed from the marker. **This used to add "and a real generator got that<!--superseded-->
  wrong", and no generator did**, section 122: the Harmony 890 config that declared an end 864 bytes
  before its own end marker was a **read** with 16 duplicated 54 byte chunks in it, and a second read
  of the same remote duplicated 2. So no config in the corpus shows a generator getting this wrong,
  and what the case actually demonstrates is the next rail down.
* **A read can insert bytes without losing any, so a config that parses is not a config that
  arrived**, section 122. Every read of an arch 10 remote here came back with 2 to 28 surplus chunks,
  and the two that were usable were the two where the duplicates happened to land in the zero fill
  past the container. The two independent checks are the trailer checksum, which the boot validator
  computes, and the end marker's position against the declared `end_addr`. Neither is sufficient: a
  duplicated run of zeroes leaves the checksum untouched, and the checksum is blind to two transposed
  words. `packages/corpus/src/read.ts` performs both after every read, and the checksum half was
  added because of this, not before it.
* **Parsing is not validating, and somebody else's experiment is the proof**, section 117:
  harmony-decompiler's author cloned a device into an arch 9 config, and the result passed both
  checksums, rendered every screen pixel identical, closed its counts and **was accepted by this
  project's parser**, while every infrared command in it addressed the wrong place. Inserting bytes
  moved the class 5 symbol tables that section 82 reads, and pointers inside a carried run are
  checked by nothing here. This is the demonstration behind `edit.ts` refusing to change a length.
* **The trailer checksum is weak**, section 41: a `u16` XOR of little endian words seeded `0x4321`.
  Blind to two transposed words, so passing means the remote will not refuse the file, not that the
  file is right. **Demonstrated rather than argued now**: writing one operand into a mode page's
  list and into its copy leaves the checksum bit for bit identical, because the two edits sit at the
  same word parity and cancel. `packages/codec/test/edit.test.ts`.
* **Base slot 15's group lengths are demanded by the firmware**, section 44. A group whose length
  differs is silently replaced by compiled in defaults. A group index is **not** portable between
  architectures, unlike every other indexed structure here.
* **Base slot 15's entry count** is likewise demanded, 9 on arch 14 and 11 on arch 12: a different
  count gets a silent no-op, not an error.
* **A timer fires one instruction, not a list**, and its duration is clamped to sixteen bits with no
  error, section 43.
* **Infrared duration blocks are shared** between records, section 61, so a writer cannot edit one
  in place without checking who else names it.
* **A record's three block pointers are once, held and tail**, section 127: the firmware samples the
  keypad at every block boundary, so slot 1 is sent only while the key is down and then **repeats for as
  long as it is**, and the interval a user feels is that block's own duration. Editing its trailing gap
  is how a repeat rate changes, per code, and a duration word caps at 32767 us so a same length edit can
  only reach the ceiling of the words already there. `0x7C` is **not** what repeats a held key, which is
  the reading section 70 guessed at and this refutes.
* **A frame can be written and its tail cannot simply be copied**, section 152. Five durations off a
  record rebuild its frame exactly, and 52 of 58 device groups use one set of timings for every code,
  so a code stated as a bare number elsewhere can be written using a sibling code's timings. What
  follows the frame does **not** follow from the bits: 140 distinct shapes across the corpus, and a rule
  for 29<!--fact:protocol_tails--> of the rhythm table's 37<!--fact:protocol_measured--> measured entries but no general rule
  behind them, and a constant total block duration explains only 31 of 41 classes. **A further
  16<!--fact:protocol_tails_stated--> entries carry a block derived from Logitech's own statement of it**, section 228, so
  45 of the table's 458<!--fact:protocol_entries--> entries can emit a whole record and the rest can emit only a frame.
  A derived block matches on the wire and not necessarily word for word, since their compiler chunks a
  long gap inconsistently, so for a family we measured the measured row is still the one to write. **And 226 records
  hold a second, different code in the tail**, so copying a sibling's tail would emit the sibling's
  second command. The second code is systematic rather than authored, a complement, a near variant or a
  constant lead in, so a writer has to know which shape its group is in. A config with no record of that
  appliance cannot have one invented for it either way.
* **A record's carrier period is truncated, not rounded**, section 92: it is `floor(1e9 / f)` in
  nanoseconds, so 36 kHz is stored as 27777 and a writer that rounds emits 27778 and differs from
  Logitech's generator by one byte per device. The carrier is per record, not per device.
* **A picture's position is implied by everything before it**, section 55, so inserting or resizing
  one moves every later address.
* **Every mode page's tagged list has a second copy that nothing reads**, section 69, whose position
  is likewise implied rather than stated. An editor that changes a page's bindings has to change
  both, and an emitter that omits the copy still passes every check the remote makes.
* **A section's size is not the gap to the next pointer**, section 36. Slot 4 holds 125 bytes where
  the gap is up to 1532, because slot 5's group arrays sit inside it.
* **The log area's writer refuses out of range rather than erroring**, section 47: an address
  outside `[0x040000, 0x400000)` zeroes the remaining count instead of writing. **On arch 12 that is
  what actually happens**, section 111: both One configs declare `[0x3FFFF0, 0x400000)`, which is the
  top sixteen bytes of a 64 KiB block both bench units carry a `00 FF` pattern in, so the boot scan
  recovers `0x400000` and the writer disarms itself. The rail read as protection against a bad config
  is what fires on a good one, and using the facility at all would need a 64 KiB erase inside the
  config region.
* **A glyph and an encoded picture cannot be re-encoded from their pixels**, which the emitter
  found rather than the firmware: several control streams draw the same image, so re-encoding one
  produces a valid file that is not the original. An editor carries every image it did not change
  through byte for byte.
* **A favourite channel is not a key binding**, section 154, and a writer that adds one has to touch
  four sections rather than a keypad map. Base slot 16 gains a record **per appliance** that takes a
  number, not per channel; base slot 10 gains a list per channel, loading the number and handing it to
  that record; base slot 13 gains the state variable values whose transitions run those lists, which is
  where the reference actually lives; and the screen gains a page. No new key binding and no new
  infrared group. Reading a favourite channel as a page of keys is the mistake to avoid, and it is the
  same mistake `docs/how-a-harmony-works.md` warns about generally: the format answers "what is in this
  file" and not "how does the product model this".
* **And it is not one mechanism either**, section 156. A channel that survives being written as an
  integer goes through base slot 16, and one that does not, meaning anything with a leading zero, is
  **spelled out** instead: one base slot 10 list per digit, each sending that appliance's own digit
  code. Measured on a config authored with `1` and `001` together, where the two take different roads
  and the record's minimum digit count stays zero. So a writer chooses, and the choice has a
  precondition on each side: the spelled out form needs the digit codes to exist as sends in base slot
  5, the sender form needs the record in base slot 16. The floor field is **not** how a leading zero is
  expressed, which is what a reading of the firmware alone would have concluded.
* **A record's three digit tables are three pointers and may be shared**, section 154. The one sample
  carries three byte identical copies at three addresses, and nothing in the format requires that, so
  editing a digit's instruction in place needs the same check base slot 5's duration blocks need: who
  else names this table. The accounting and the emitter both deduplicate by address for that reason.
* **A sequence at Logitech's own stated limit can hang a remote for good**, measured on 23 August 2026 and
  deliberately not a finding, by Danny's call: the notes sit in the lab beside the config,
  `../lab/reads/20260823T1408Z-onres-sequence-NOTES.md`, so a session that finds no section for it must not
  conclude it is unread. A 25 step sequence, their maximum, expands to roughly 55 three byte instructions
  in one action list, and heavy tapping of the touch panel while it runs hung a Harmony One three times
  out of three with the batteries out each time, against five gentle or untouched runs that all completed.
  The mechanism is open and two readings are dead. **This is a new hazard class**: a config the remote
  accepts, whose checksums verify, which this project accounts for to the byte, and which writes nowhere it
  should not. It simply runs. So a writer **refuses** an oversized sequence rather than warning, bounded by
  the expanded instruction count and not by their item count, which permits this one. The pause itself is
  opcode `0x7C` inline in tenths of a second in the low byte, so 25.5 seconds is the ceiling the format can
  express and their 20 second limit sits just under it.

  **That refusal is not implemented anywhere, and this rail is the only one here with nothing behind
  it.** Written down on 29 August 2026 rather than left to be discovered: there is no bound in
  `packages/codec`, no test, and no section in `docs/findings.md`, because the measurement was
  deliberately kept out of the findings. Every other rail on this page traces to a firmware reading
  with an assertion behind it; this one traces to a lab note. So the highest severity way to build a
  config that harms a remote is invisible to `make facts`, `make test` and every other check this
  repository has, and a session that greps for a refusal will find none and may conclude there is
  nothing to refuse. **Nothing composed here may be written to a remote until this has a number and a
  refusal**, and the number is the open part: 55 expanded instructions hung one and the largest clean
  run is unmeasured, so the bound has to come from a run that establishes a ceiling rather than from
  the one figure that failed.
* **A same length edit is not a small write, and the cheapest one costs two erase blocks**, section
  187. `edit.ts` permits a same length edit and refuses a length change, which is the right rule for
  the **container** and says nothing about the **medium**: flash only clears bits, so changing one
  byte means erasing its whole 64 KiB block and writing back everything else in it. And it is two
  blocks rather than one because of section 69, since every mode page's tagged list has a second copy
  an editor must also change and the copy sits 72 to 214 KiB away. Measured at **187 of 187** editable
  pages across five configs on two architectures, exactly two blocks every time. So one button on one
  screen means erasing and rewriting 128 KiB, preserving about 131000 bytes nobody asked to change,
  and opening **two** windows where a block is erased and not yet written. The rehearsal does not have
  this problem because it writes a whole block back from a verified dump, so the properties that make
  it a safe first write are exactly the ones an editor lacks. **The consequence is a design
  constraint**: an editor's write step is read the affected blocks, apply the edits, erase, write back
  whole, verify by reading, and not "write the bytes that changed", which is what `Edit` being a start
  and a run of bytes suggests.
* **A small logical change reshuffles the whole image.** Three arch 8 configs generated ten minutes
  apart differ in 73 to 84% of their bytes, and two compiles of an **unchanged** arch 12 (Harmony One)
  account differ in 67%, section 154. So an editor makes minimal diffs against an existing
  config; reproducing what Logitech's generator would have emitted is not achievable. What that
  section adds is the other half: two compiles that share a build timestamp are **byte identical**, so
  the reshuffle travels with that field and asking twice can hand back the same artefact rather than a
  second sample.
