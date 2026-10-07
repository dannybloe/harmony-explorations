---
name: writing-a-config
description: "The rails a config writer must respect, and why each one exists. Use before changing any byte of a Harmony configuration container: editing a device, an activity, a key binding, a favourite channel, an infrared record or a screen, running the write rehearsal, or working on edit.ts, relocate.ts or the write path in packages/usb. Also use when judging whether a proposed edit is safe."
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

* **Base slot 13's `narrow` and `wide` size the state variable storage, and `count` does not**,
  section 276, so appending a variable moves two words of that four word header rather than one. The
  firmware allocates `narrow + 2 * wide` bytes, which is what the store's own width arithmetic needs,
  and then **fills every byte above that with `0xFE` at each boot**. The seeding loop runs **first**
  and over `count`, so a container whose count exceeds the sum seeds those variables correctly and
  then paints over them: they hold 65278 instead of what their record states. The fourth header word
  is fetched and stored nowhere, and `count` survives only in a scratch byte, so nothing compares an
  index against it. Measured on arch 12 (Harmony One) at `0x2A330` and arch 14 (Harmony 700 reference
  image) at `0x17A42`. **The fill's ceiling is per image and not per architecture**, `0x7F` on the
  Harmony One, `0xFF` on the Harmony 700 and `0xC0` on the Harmony 600, and a second arm starts the
  fill at the constant 18 when a flags bit says so, which is unread. The fill is **not** measured on
  arch 9 (Harmony 525), so nothing here says what a 525 does with a variable above its storage.
  **This one is not a prediction.** The composer here raised `count` alone, and the device it added to
  the spare Harmony One appeared on the activity menu, beeped when pressed and started nothing; a read
  only look at the connected remote found the `0xFE` run beginning at exactly the byte the arithmetic
  predicts, with the activity's own variable the first casualty. `narrow + wide == count` on 19 of 19
  containers and `assertStateTableConsistent` refuses a container that breaks it.
  **A separate bound check exists and is not this**: seven instructions comparing an index against
  `narrow + wide`, on all six images in the lab, whose callers are **`WRITE_MISC` and `READ_MISC`
  selector `0x01`**, a host poking a variable over USB. A configuration's own state write clears bit 7
  of the opcode and reaches the store unchecked, so that bound is nothing a config writer has to
  respect. Reading that guard as the config's was this section's recorded error. What it is worth
  knowing for is the reply: a refused read returns 0, which looks exactly like a variable holding 0.
* **A configuration holds at most 128 state variables, and Logitech's own reach 112 to 124**, section
  NNN. A write names its variable in the low seven bits of the opcode, section 277, so a variable at 128
  cannot be set, and `compose.ts` refuses one. A device composed here costs three variables plus its
  inputs, 3 to 14 on the devices measured; Logitech's costs six more, seven on one device. The other
  bound is the model's own device count, `maxDevices` in `packages/usb`'s model table, eight on a Harmony
  650 and 700 by Logitech's own figure, which `composeCatalogueDevices` checks before composing anything.
  **The device count binds first on every configuration measured**: the compositions onto the Harmony
  650 and 700 bases within eight devices end at 94 to 110 variables, and the ceiling was met only past
  the device count, composing onto two of Logitech's own eight device compiles, at 122 and 124, with no
  device count passed. The ceiling is met on the Harmony 650 and 700 only; the Harmony 600's two
  configurations hold 66 and 74.
* **Every send is paired with a `0x7C` naming the same device**, section 278. Section 33 found the
  shape, `{0x7D, 0x7C}` on arch 8, 9 and 12 and `{0x7F, 0x7D, 0x7C}` on arch 14, with no bare send
  anywhere in the corpus, and section 278 found out what it costs to ignore: the device composer
  emitted the send alone, the result answered every pad press correctly, and an activity that ran the
  same list switched nothing on. The transition fired; the send did not go out. Pairing it fixed that
  on the spare Harmony One. **The trap is that the obvious check passes**: section 242 tested a composed
  device with a pad press, which is the one route that works. So a composed send is checked from an
  activity, not from a key. Why the firmware treats the two routes differently is unread. **On arch 14
  the `0x7F` in front is a delay step of three lists**, section 287: a load and a condition private to
  the command and a delay list shared by the device, whose base slot 14 table queues the device's inter
  device delay while a list raising the start variable runs: an activity's start, All Off or a Help
  screen, and never a device's own command pressed in device mode, section 335, which watched it hold back the device's own
  command on the Harmony 650. The composer emits all three, with the device's
  `InterDeviceDelay` variable and its table, and a writer adding a command by hand must too. **And
  switching an arch 14 device on runs the power command and then its power on delay**, section 288: a
  `0x72` on `PowerOnDelay_<identifier>` through a 451 case table that queues the wait a hundred tenths
  at a time. A power variable whose on transition runs the power command alone switches the device on
  with no wait, so, by section 236's reading measured on the Harmony One, the activity's next command
  to it can arrive before it is ready.
* **Base slot 13's first seven records are the clock and are stamped too**, section 130: `first` is the
  value a variable holds when the config is generated, and records 0 to 6 are second, minute, hour, day,
  weekday, month and year, each equal to the corresponding field of base slot 3's timestamp in all 21
  containers. So a carried over config carries a stale clock in two places, not one, and none of them may
  be reused for anything else, which section 74 had already said of 3, 5 and 6. **The firmware owns
  more than seven, and how many is per architecture**, sections 138 and 284: its variables state the
  identical value and maximum in every user configuration of their architecture, safe mode differing at
  14 on arch 12, and base slot 0 names none of them, which stops at 12 on arch 9 (Harmony 525) and at 17 on arch 8, 12 and 14, where the firmware's
  alternative fill also starts at 18 on every image read, the checksum does on arch 12 and 14, and it
  stores into several of 13 to 17 itself. So the rail is to reuse
  none of that block, `firmwareStateVariableMax`, and their values differ per architecture, so a carried
  over config must keep each architecture's own. Section 138 said thirteen for every architecture, having
  measured the boundary on two Harmony 525 configs. **It is eight values, not seven**, which building
  the rail found rather than reading it. **Six** maxima are constants, `59, 59, 23, 30, 6, 11`, and the
  year's moves with its value and has to be stamped: it is that year plus one, and left unstamped it is a
  config declaring a value outside its own variable's range. **The day of the month counts from 0 and
  the weekday from Sunday**, `docs/findings.md` section 322, so the 31st is stored as 30 and fits.
  This page said the day's maximum moved too, that a save on a 31st writes a day of 31 against a range
  that stops at 30<!--superseded-->, and the writer raised it; that came from reading the day from 1, it
  set every clock we wrote a day ahead, and `h700_config` was built on a 31st and stores 30 against 30.
  A save now writes at most 30 and puts an old save's 31 back to 30. `clockStateEdits` in
  `packages/codec/src/edit.ts`, and it refuses a base slot 13 whose other maxima are not the clock's.
* **Base slot 3's timestamp is stamped at write time, not copied**, section 111: an arch 12 remote's
  clock holds this value at every boot, so a stale timestamp is a wrong clock by exactly its staleness.
  The rail holds on the other architectures too without needing their measurement, because stamping the
  moment of writing is the right provenance value whatever the remote does with it, and it holds whether
  the firmware reads this record or base slot 13's `first`, which section 137 says nothing separates:
  both get stamped by a save. **`write-config.ts` stamps every write itself**, todo-compile-650 1.3, and
  saves the stamped file over `--config` before it erases anything; `--as-is` is the one way to write
  a file's own stamp, for a compile put back unchanged. This is the one
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
* **A power on delay holds back one device and not the activity**, section 236. The `0x7C` quantity
  goes into a queue whose entries are tagged with a device, and both consumers of that queue, the
  picker that decides whether a send may go out and the tick that counts a quantity down, first ask
  one shared helper whether an earlier entry names the same device. So two devices never wait for
  each other and a quantity with nothing behind it for its own device is never felt. Measured both
  ways on a Harmony One on 1 September 2026: a television's delay raised to ten seconds in an
  activity that sends it one command changed nothing, and the receiver's raised in the same activity,
  where an input change follows, moved its gap from six seconds to ten. In the corpus 37<!--fact:delay_unfelt--> of 129<!--fact:delay_pairs--> pairs
  of an activity and a device it switches on can never show that device's delay. So a writer may
  change the byte, and an interface that calls it a pause in the activity is wrong for a quarter of
  them.
* **On arch 14 a delay saved on the remote wins over the configuration's at start**, section 303,
  measured across three starts on the Harmony 600. Logitech's compiler gives every delay a table that
  saves its value into the remote's settings store under a per device key, `0x7A key, 0x6C value`,
  reached from the remote's own delay page, and lists that read a saved value back into the variable,
  which hang off list 1 on the 600 and the 650 and off list 2 on the 700. So raising
  `PowerOnDelay_<id>`'s `first` changes nothing on a unit that has one saved for that device: the
  Harmony 600's KPN box went to 45 tenths in flash and the remote kept 10, the same to half a
  millisecond on the receiver. **Read the store before writing a delay**, internal `0x01EC00`, settings
  `0x00` to `0x13` and `0x18` to `0x2B`; the Harmony 650 and 700 hold none. A composed device gets
  neither program, so its delays are not saved, which is `todo.md` L10.
* **How many times a press sends the code is the ratio between the first two blocks**, section 258, so
  changing it is not a same length edit. The first block holds the code as many times as a press sends
  it and the second holds one press's worth, and 1913 of 1913 records that name both divide whole. Two
  traps. **Reading the first block's copy count alone is wrong for a family that sends more than one
  code word per repetition**: the Harmony One's receiver stores six copies and two for its Sharp codes
  and three and one for its 48 bit ones, which is 3 sends both times, and a writer that copied the six
  would triple a device it meant to leave alone. And a family whose definition states an intro section
  of a **different** code word has a ratio one higher than the count Logitech states, one family in
  this corpus, so the ratio is the setting only where the family has no intro.

* **A frame can be written and its tail cannot simply be copied**, section 152. Five durations off a
  record rebuild its frame exactly, and 52 of 58 device groups use one set of timings for every code,
  so a code stated as a bare number elsewhere can be written using a sibling code's timings. What
  follows the frame does **not** follow from the bits: 140 distinct shapes across the corpus, and a rule
  for 29<!--fact:protocol_tails--> of the rhythm table's 37<!--fact:protocol_measured--> measured entries but no general rule
  behind them, and a constant total block duration explains only 31 of 41 classes. **A further
  33<!--fact:protocol_tails_stated--> entries carry a block derived from Logitech's own statement of it**, section 228, so
  62<!--fact:protocol_tails_all--> of the table's 681<!--fact:protocol_entries--> entries can emit a whole record and the rest can emit only a frame.
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
* **A sequence at Logitech's own stated limit can hang a remote for good**, measured on 23 August 2026. The
  hang itself is deliberately not a finding, by Danny's call, and the notes sit in the lab beside the config,
  `../lab/reads/20260823T1408Z-onres-sequence-NOTES.md`, so a session that finds no section for it must not
  conclude it is unread. A 25 step sequence, their maximum, expands to roughly 55 three byte instructions
  in one action list, and heavy tapping of the touch panel while it runs hung a Harmony One three times
  out of three with the batteries out each time, against five gentle or untouched runs that all completed.
  The mechanism is open and two readings are dead. **This is a new hazard class**: a config the remote
  accepts, whose checksums verify, which this project accounts for to the byte, and which writes nowhere it
  should not. It simply runs. So a writer **refuses** an oversized sequence rather than warning. The pause
  itself is opcode `0x7C` inline in tenths of a second in the low byte, so 25.5 seconds is the ceiling the
  format can express and their 20 second limit sits just under it.

  **The number is the peak depth of the action queue, and it is forty**, section 238. Not the total a
  sequence expands to, which is what this page said for two days: the main loop rotates whatever an
  instruction pushed to the head, so opcode `0x7F` is a call, the ring holds the call stack, and what runs
  out is how deep the nesting goes rather than how long the program is. Every push into a full ring is
  discarded with no error anywhere, so a config that asks for more runs and quietly does less than it says.
  `assertQueueFits` in `packages/codec/src/queue.ts` is the refusal and `write-config.ts` performs it
  before anything is erased.

  **What is settled is the hard ceiling, not the safe one.** Nothing in the corpus overflows: the sequence
  that hung a remote peaks at 35 of the 40, and every configuration Logitech compiled from an ordinary
  account peaks at 22 or below. So the sequence leaves five slots for every key press, state change and
  display event the remote still has to queue where an ordinary config leaves eighteen, and nothing has
  been measured in between. A softer bound than 40 is a decision rather than a reading.

  **The shape is a finding, section 327, and `composeSequence` in `packages/codec/src/sequence.ts` builds
  one** and refuses through `assertQueueFits`. A command is one call of its send list, a pause one `0x7C`
  per device the activity switches on, in the order its start does, and there is one list per binding.
  Three things a writer gets wrong otherwise. A device's sequence sends carry its **inter key delay**, so
  the spare Harmony One's set top box, at 200 ms, calls lists at 2 where its device mode keys call lists
  at 1. A 20 second wait is **one** `0x7C` of 200, which is what Logitech's compiler wrote, and not runs of
  100. And on arch 14 (Harmony 600, 650 and 700) no compile holds a sequence, so five parts of the form
  are inferences, named in `ARCH14_INFERRED`, until one does.
* **Two erase blocks is the floor for any edit, not a page binding's quirk**, section 237. The
  trailer checksum sits at the far end of the container and `applyEdits` restamps it, so a one byte
  change to a device's power on delay moves `0x083BFD` and `0x1D6B66` on the spare Harmony One, 1.3
  MiB apart and therefore in different blocks. Two things follow for a writer. The known good content
  it compares against has to be a flash **region** and not a container, since the checksum's block
  runs past the container's declared end and those bytes are still destroyed by the erase. And every
  block it will touch is read and compared **before** any of them is erased, because a second block
  that turns out not to match would otherwise be discovered with the first already rewritten.
  `packages/corpus/bin/write-config.ts` is the implementation and it has done this once.
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

* **A one page screen deadens the two page turn keys**, section 275, arch 12 (Harmony One), and it is
  the newest way to produce a file the remote accepts and mishandles. A Harmony One turns a list's
  pages with the two touch keys **beside** the display, scans 46 and 47, and **no mode page binds
  them**, 0 over 778 pages, so paging is a default the firmware supplies. What a screen can do is
  switch that default off, and a screen with one page does: both keys on **538 of 538** single page
  modes and neither on **0 of 58** multi page ones, 1076 bindings over four containers, every one a
  press, in the **mode record's own** tagged list rather than a page's, and 966 of them the **null
  instruction** of opcode 0 with operand 0. So a writer growing a menu from one page to two has to
  remove those two bindings. Leave them and the file closes every count this project can check,
  passes both checksums, renders every page identically, and the second page cannot be reached. All
  **12** one page list menus in the corpus carry them: the activity menu and three device lists on
  each of the three configurations whose menus hold one page.
  **Two readers will mislead you here and both already have.** `keyCodes` answers 0 for these scans,
  because it reports only bindings that end in an infrared code, which is the `keyCodes` versus
  `pageScans` trap met a third time. And `ModeRecord` has **no `list` field**, its own tagged list
  being already parsed in `entries`, so a walk written as `if (record.list !== undefined)` walks
  nothing and reports a clean zero, which is exactly what happened when this was first measured.

* **An arch 14 device mode binds every key, and a composed one must too**, section 285. On all 21
  device modes of the four arch 14 user configurations the mode's own list holds 47 entries: besides
  the mode's two navigation entries, a `0x72` and a `0x73`, each key sends that device's command or is
  bound to **nothing**, never left out. A key a mode leaves out is
  resolved further down, against base slot 9, section 271's order, which is a map this device does not
  own; what a left out key then does on an arch 14 remote has not been measured. The arch 14 composer copies the key set of an existing device mode
  and binds only the keys whose frame one of the new commands sends. A device list whose last page is
  full gets a new page, and **every page of that list then has to count to the new total**, `n/m` on
  the title's line, a list of one page gaining a counter it did not have, section 312: a page added
  without it reads `2/3` on a list of four. That was refused until then. **The activity menu pages the
  same way and is not a two row device list**, section 316: its counter sits at the corner lists' x,
  and its new page draws the working screens' one command picture rather than its last page's, so a
  composer that took both from the device list's two row rule would write a page that parses and draws
  the counter and background no Logitech compile has. **Since section 334 no menu page is copied off its
  menu**: `fourSlotMenuChrome` builds each kind's chrome, title, bottom word, counter position, queued
  program and the background by content per look, and a grown or opened page is checked against that
  builder before and after, which is what turns "the last page looked right" into a refusal when it does
  not. A page whose picture the configuration does not hold is refused, since a configuration holds a
  picture only where one of its own programs draws it. Two refusals are deliberate: a
  tenth page, whose counter would be two digits drawn further left, and a label wider than sixty pixels,
  the composer's own limit, the widest compiled corner label being 59. **Restating a counter digit can
  take a digit other screens borrow**: the compiler draws a string inline once and points every equal
  string at it, so cutting it needs the borrowers pointed elsewhere first, `pageTexts`. Three conventions are kept although nothing says the remote needs them, so that a
  composed page is one the compiler could have written: a row list per button and per copy, entries
  stored 9, 8, 34, 2, and no font selected that is already in effect. **Where the arch 14 screens differ from
  the Harmony One's is geometry, and none of it transfers**: four labelled corners, scans 8, 2, 9 and 34
  filled in that order, right hand labels ending at x 125, and one device list per configuration drawn
  in two rows with centred labels. **Nothing on the remote enters that two row list**, section 326: a
  composer writes it to match Logitech, and a check on a remote has to use a corner list, which opens
  its first new page at the fifth device.
