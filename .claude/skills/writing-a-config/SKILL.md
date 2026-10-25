---
name: writing-a-config
description: "The rails a config writer must respect, and why each one exists. Use before changing any byte of a Harmony configuration container: editing a device, an activity, a key binding, a favourite channel, an infrared record or a screen, running the write rehearsal, or working on edit.ts, relocate.ts or the write path in packages/usb. Also use when judging whether a proposed edit is safe."
---

# Writing a config: the checklist

**Every rail here is a way to produce a configuration the remote accepts and mishandles.** Not a crash
and not a refused file, but one that passes both checksums, renders identically, closes every count this
project can check, and is wrong. One of them, an oversized sequence, hung a Harmony One three times out of
three, each needing a battery pull.

## When to load it

Before changing any byte of a container: an edit in `packages/codec/src/edit.ts`, a relocation through
`relocate.ts`, a composer that builds a device, an activity, a sequence, a menu or a screen, the write path
in `packages/usb` and `packages/corpus/bin/write-config.ts`, and whenever somebody asks whether an edit is
safe. Before writing build code in `packages/codec/src`, load `code-for-a-family` as well.

## What frames it

* **Version 1 of the application is read only**, and every write path sits behind
  `HARMONY_ENABLE_WRITES=1`, so reaching these rails is deliberate.
* **These rails have been exercised on hardware.** Seven units may be written and five have had flash
  written, `CLAUDE.md` "Never write to a remote". Several rails below came from a write that went wrong
  in exactly the way the rail describes: the painted over variable, the bare send, the saved delay that
  won, the hang. This skill used to say nothing here had ever written to a
  remote, which stopped being true with the first write.
* **The hardware rails are separate** and stay in `CLAUDE.md`, always loaded: never write to a remote
  outside the permitted units, firmware is never written, no write without a verified dump of that exact
  unit, every write read back and compared. Those are about the device; these are about the file.
* **The evidence lives in the reference now.** Each item names the page and heading that holds the
  measurement, the counts and the archive section; this skill keeps the rule, the trap and the code that
  enforces it. `CLAUDE.md` "Rails a writer will have to respect" keeps the one line table.

## The checklist

### State variables, `reference/config-format/state.md`

* **Base slot 13's `narrow` and `wide` size the storage, and `count` does not**, "What the four header
  words do". Appending a variable moves **two** header words. Raise `count` alone and the variable is
  seeded and then painted over with `0xFE` at boot: a device composed that way on the spare Harmony One
  appeared on the menu, beeped and started nothing (`docs/test-notes/harmony-one.md`).
  `assertStateTableConsistent` refuses it. The USB bound check on `narrow + wide` is the host's, not the
  config's, and a refused read answers 0, which looks like a variable holding 0.
* **At most 128 state variables**, "Variables 18 and up are the configuration's own". `compose.ts`
  refuses a variable at 128; the model's device count, `maxDevices` in `packages/usb`'s model table and
  checked by `composeCatalogueDevices`, binds first on every configuration measured.
* **The clock is the first seven records and the firmware owns more**, "Variables 0 to 6 are the clock",
  "Variables 7 to 17 belong to the firmware too" and "What a writer does with the clock". Stamp eight
  values, since the year's maximum moves with it; the day counts from 0, so a 31st is stored as 30 and
  its maximum stays 30. Reuse none of the firmware's block, 0 to 17 or 0 to 12 by architecture,
  `firmwareStateVariableMax`. `clockStateEdits` does the stamping. This page once said a 31st needed its
  maximum raised to 31, that a save on a 31st writes a day of 31 against a range that stops at
  30, which set every clock we wrote a day ahead.
* **A delay saved on the remote wins over the configuration's at start**, arch 14 (Harmony 600, 650 and
  700), "On arch 14 a delay saved on the remote wins". **Read the settings store before writing a delay**;
  the Harmony 600's KPN box went to 45 tenths in flash and the remote kept 10. A composed device gets
  neither the save nor the restore program (`todo.md` L10). `setPowerOnDelayVariable` bounds the value to
  the 451 case table, not to the record's `max`.
* **Base slot 15's group lengths and entry count are demanded**, "The firmware demands the lengths": a
  different length or count is silently replaced by defaults or ignored, and a group index does not port
  between architectures.
* **A timer fires one instruction, not a list**, and its duration is clamped to sixteen bits with no
  error, "Base slot 12: the timer table".
* **A favourite channel is not a key binding and not one mechanism**, "Base slot 16: the number sender".
  It touches base slots 16, 10 and 13 and the screen, and adds no key binding and no infrared group; a
  channel with a leading zero is spelled out digit by digit instead, and each route has its own
  precondition. Reading it as a page of keys is the mistake `reference/how-a-harmony-works.md` warns
  about: the format answers "what is in this file", not "how does the product model this".
* **A record's three digit tables are three pointers and may be shared**, same section: check who else
  names a table before editing it in place.
* **The log area's writer refuses out of range and on arch 12 (Harmony One) a good config disarms it**,
  "Base slot 2: the log area". Using the facility needs a 64 KiB erase inside the configuration region.

### Actions, `reference/config-format/actions.md`

* **Every send is paired with a `0x7C` naming the same device**, "`0x7D` sends an infrared code". A bare
  send works from a key press and sends nothing from an activity's transition, so **the obvious check
  passes**: test a composed send from an activity, never from a key. On arch 14 each send list also opens
  with a `0x7F` delay step of three lists, and a command added by hand needs all three.
* **Switching an arch 14 device on runs its power command and then its power on delay**, state.md "On
  arch 14, eight variables per device". A power transition with the command alone switches on with no
  wait.
* **A power on delay holds back one device, not the activity**, "`0x7C` is a per device delay in tenths
  of a second". 37<!--fact:delay_unfelt--> of 129<!--fact:delay_pairs--> activity and device pairs here
  can never show it, so an interface that calls it a pause in the activity is wrong for a quarter of them.
* **A sequence is bounded by the action queue's peak depth, forty, and an oversized one is refused, not
  warned about**, "The action queue holds forty instructions" and "A sequence is one action list of calls
  and per device pauses". A 25 step sequence, Logitech's own limit, hung a Harmony One three times out of
  three under heavy tapping (`docs/test-notes/harmony-one.md`, which says where the unpublished notes
  are). `assertQueueFits` refuses and `write-config.ts` runs it before anything is erased; 40 is the hard
  ceiling and a softer one is a decision nobody has taken. `composeSequence` builds the shape: a send
  carries the device's inter key delay, a 20 second wait is one `0x7C` of 200, and on the Harmony 650 a
  command sends its one block copy; `ARCH14_INFERRED` names the part still inferred on arch 14.

### Container and header, `reference/config-format/container.md` and `header-records.md`

* **Base slot 3's timestamp is stamped at write time, never copied**, header-records.md "What the remote
  does with it". The one field where a round trip and a save differ. `write-config.ts` stamps every write
  and saves the stamped file over `--config` before erasing; `--as-is` writes a file's own stamp, for a
  compile put back unchanged.
* **The trailer checksum is weak**, container.md "The trailer checksum": blind to two transposed words,
  and two edits at the same word parity cancel (`packages/codec/test/edit.test.ts` shows it). Passing
  means the remote will not refuse the file, not that it is right.
* **A config that parses is not a config that arrived**, container.md "Telling a configuration that
  arrived from one that parses". A read can insert bytes; `packages/corpus/src/read.ts` checks the end
  marker against `end_addr` and the checksum after every read. This rail once said a real generator got
  `end_addr` wrong; that file was a damaged read, and no generator did.

### Relocation and layout, `reference/config-format/relocation.md` and `layout.md`, "For a writer"

* **Restamp `end_addr` and the checksum after any change of length**; nothing else in the header moves.
* **Parsing is not validating**: a device cloned into a Harmony 525 configuration passed every check and
  addressed every infrared command wrongly. That is why `edit.ts` refuses a length change and
  `relocate.ts` is separate.
* **A section's size is not the gap to the next pointer**, and **a picture's position is implied by
  everything before it**, so inserting or resizing one moves every later address.
* **A same length edit costs two 64 KiB erase blocks** because the checksum and a page's list copy sit
  far away. So a write reads the affected blocks, applies, erases, writes each block back whole, reads
  back, and compares every block it will touch **before** erasing any, against a flash region rather than
  a container. `write-config.ts` does this; "write the bytes that changed" is the shape to avoid.
* **Make minimal diffs against an existing configuration**: a small logical change reshuffles the whole
  image in Logitech's output, so reproducing their generator is not achievable. Two compiles sharing a
  build timestamp are byte identical, so asking twice can return the same artefact.

### Keys and screens, `reference/config-format/modes-and-keys.md` and `screens.md`, "For a writer"

* **Every mode page's tagged list has a second copy**: nothing reads it, an editor changes both.
* **A one page screen deadens the two page turn keys** on the Harmony One, so growing a menu to two pages
  removes those bindings and restates the header's total and each page's number (`paginate`), or the
  second page is unreachable while every check passes.
  **Two readers mislead here and both already have**: `keyCodes` answers 0 for those scans because it
  reports only bindings that end in an infrared code (use `pageScans`), and `ModeRecord` has no `list`
  field, so `if (record.list !== undefined)` walks nothing and reports a clean zero.
* **An arch 14 device mode binds every key**, to the device's command or to nothing. A key left out is
  resolved against a map the device does not own.
* **A device's button is stated in its own map and in every activity map that binds it**, so a change is
  written into each.
* **Shared bytes**: a string can be drawn by reference from elsewhere, so an edit in place or a restated
  counter digit changes every borrower (`pageTexts` repoints them first); a queued program of ours takes a
  free base slot 11 entry below 256, since entry 6653 ran as 253 and stalled a Harmony 650 in a loop.
* **A glyph or picture re-encodes to its original bytes** (`encodeBitmap`, `encodeGlyph`; arch 9 (Harmony
  525) unchecked), and anything unchanged is still carried through as it is.
* **Arch 14 menus are built, never copied off a menu's last page**,
  `reference/architectures/harmony-600-650-700/compiler.md` "Menu pages, built" and "The two row list".
  `fourSlotMenuChrome` builds each kind's chrome and a grown page is checked against it before and after;
  every page of a grown list restates its `n/m` counter; the activity menu is not a two row device list;
  nothing on the remote enters the two row list, so a bench check uses a corner list, whose first new page
  opens at the fifth device. The composer refuses a tenth page and a label wider than 60 pixels, and a
  page whose picture the configuration does not hold. Geometry does not transfer from the Harmony One.

### Infrared records, `reference/config-format/infrared-records.md`, "For a writer"

* **Duration blocks, class 5 bodies, symbol tables and symbols are shared**: check who else names one.
* **Once, held and tail**: the held block's trailing gap is the repeat rate, and a duration word caps at
  32767 us. `0x7C` is not what repeats a held key.
* **How many times a press sends is the ratio of the first two blocks**, a length change through
  `relocate.ts`; the first block's copies alone are wrong for a two code word family.
* **A toggling code needs both pointer groups**, the code as stated first.
* **A carrier period is truncated, not rounded**, per record.
* **A frame can be rebuilt; its tail cannot be copied from a sibling**, which may carry the sibling's
  second command, `reference/infrared/families.md`. 62<!--fact:protocol_tails_all--> of the rhythm
  table's 681<!--fact:protocol_entries--> entries can emit a whole record: a rule for
  29<!--fact:protocol_tails--> of its 37<!--fact:protocol_measured--> measured entries and
  33<!--fact:protocol_tails_stated--> derived from Logitech's statement, and the rest only a frame.
