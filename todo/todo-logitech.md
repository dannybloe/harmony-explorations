# Todo: what only Logitech's service knows

**Why this matters**: Logitech's configuration service still compiles, and it can be withdrawn without notice. The
device database is safe, archived and checked out beside this repository, but how their compiler turns that database
into bytes on a remote exists only on their server. We learn it by comparing a configuration they compiled with the
database entries that went into it, and once the service is gone no new comparison can be made. The requirement it
serves is R72, the import from a user's own account, and everything the composers still refuse for want of a compile.

**Before working any item, load the `gathering-logitech` skill**, in this session and in every agent brief: it holds
the rules, says where the facts are and what counts as done. **Gathering needs the service, processing does not**:
chapters G1 to G6 gather, the compiles filed in the lab and what makes them usable later; chapters P2 and P3 work the
rules out of the files already held. An item of the gathering part is only done when its file is checked to hold what
it was compiled for, the family present or the setting seen to change something.

**Every compile writes to the test account**: devices added, a compile requested, devices removed. That needs a
go-ahead and is paced rather than fired in bulk; the `myharmony-service` skill holds the accounts and the rails. A
compiled file is Logitech's output and stays in the lab; only names and numbers about it come into this repository.
The two old tracks, with their ticked items, are `todo/done/todo-secure-logitech.md` and `todo/done/todo-process-logitech.md`;
the numbers here are theirs with a G or a P in front.

**How big the gap was**, measured with the composer's own test over every command in the archive: 46 infrared families
write completely, 10 write except for 231 commands, and 631 write nothing. Those 631 hold 391507 of the database's
2067863 commands, and 10046 of its 54118 code sets have no command that writes.

## Gathering

### G1. The harvesting route

- [ ] G1.2 The same two devices compiled for the One, 650 and 350 (lab `work/harvest/first-run`, `check-650`, `check-350*`): the 650 stores 181 of the One's 196 infrared records identically; the other 15 are single shot copies of the power, digit and OK commands, which on the One open with the devices' half second delay between devices and on the 650 with none, and on the One a screen command sends such a copy far more often than a key does (section 337); the 350 shares only 90 of 296 pattern pieces with the One and takes eight devices of any type per compile, four televisions included. So the families are compiled on the Harmony One, 15 per compile, and on the Harmony 350, 8 per compile, with a sample of about 20 families on the 650; the 600 and 700 share the 650's architecture and the 300 the 350's, each confirmed by one compile of the same two devices
  - [ ] G1.2.3 The 300 (lab `check-300`): not the same file as the 350's; four in five of its 32 byte pieces are in the 350's file in a different order, and of the 650's duration blocks found in either, 100 are in both, 6 only in the 350's and 1 only in the 300's. Whether the 300 needs a family harvest of its own, at 4 devices per compile, needs a decision

### G2. The infrared families we cannot write

- [ ] G2.2 Compile them, 15 devices per compile and nearly every one from a different family, the largest families first, every compile filed in the lab; each device keeps its own records, so 2.3's check stays per family
  - [ ] G2.2.1 Paused on 7 October 2026: the run on the first test account's Harmony One entry got the spare Harmony One's serial blocked by the service, after 3 compiles holding 7 devices (lab `work/harvest/families-one`); the incident and the rules are in the `myharmony-service` skill; the block was lifted by Logitech, reported on 12 October 2026, so the spare is usable with the service again, and resuming still waits on 2.2.3's rules
  - [ ] G2.2.2 Why pausing costs little: of the 641 families, 482 lack only the number of times a press repeats the code; the count is the device's own, `timing.pressMinRepeats`, findings section 348, and the composer uses it (P2.2), so the harvest is not needed for those families' infrared to work; three as a default would have been wrong on 299 records of our own compiles
  - [ ] G2.2.3 Resume only much slower, on a serial whose loss costs nothing (a Harmony One or 525 that may come from a friend), adding devices once and leaving them on, and stopping for good at the first refusal; that serial exists since 11 October 2026, the friend's Harmony One, now the project owner's and linked to the first test account (decision 21)
- [ ] G2.4 The 10 families that write except for a few odd codes: compile a device holding those codes, and check the codes are in it
- [ ] G2.6 The commands the composer still refuses for want of a compile, P2.2.2 (1740 commands, a device mixing two counts), 2.2.4 (215, a count of 0) and 2.4 (231): a few devices holding them, compiled on the test account under 2.2.3's rules; parked on 10 October 2026, the Harmony 650 track goes first

### G3. How the compiler handles every feature, on every supported model

- [ ] G3.3 One test setup per model that between them use every feature that model offers, plan 006 being the Harmony 650's, compiled for each model; check every device and activity of the setup is in the file
- [ ] G3.4 Every setting a model offers, compiled both ways: screen light, Remote Assistant, tilt sensor, leave devices on when switching activities, and whatever 3.2 adds; check the two compiles differ
- [ ] G3.5 A passthrough device in an activity, compiled with and without it; check the two differ
- [ ] G3.6 Favourite channels: plain numbers, a leading zero, a logo, more than one page; check each channel is in the file; plain numbers over two pages compiled on the Harmony 650, four on the KPN box and four on the LG, and an activity shows only the favourites of the device that changes its channels (`h650_favourites_config`, `h650_favourites_base`, section 344); a leading zero and a logo still to compile
- [ ] G3.7 Sequences, on their own and as a step in an activity's start; check each sequence's commands are in the file; one on its own compiled on the Harmony 650, KPN 1, 2 s, KPN 2, 20 s, KPN Red on Red in TV kijken, all three commands in the file (`h650_sequence_config`, section 343)
- [ ] G3.8 A learned code: a raw infrared command added to a device; check the file holds a record for it
- [ ] G3.9 What a person changes by hand in the service: a key reassigned in an activity, a command renamed on the screen, a delay or an input changed; check each compile differs from its control
- [ ] G3.10 Long press actions, on the models that declare them; check the compile differs from its control
- [ ] G3.11 A model at its maximum number of devices and with many activities, so every page break and limit is seen on each model; check every device and activity is in the file
- [ ] G3.12 More activities, to calibrate which device gets which key in an activity (exact on 20 of 40 compiled activities, about 14 distinct, and on 4 of 6, 223 of 226 keys, in two Harmony 650 configurations other owners posted, section 323); check every activity is in the file
- [ ] G3.13 Which key a device's command goes on, per kind of device: the device mode table is fitted to 20 devices, and the test setup built from nothing differs from Logitech's compile on the KPN box, Kodi and the Denon, where the choice also follows the kind of device, Kodi's Enter on the Enter key and the receiver's not (`todo-compile-650.md` 11.2.1, section 380); devices of each kind compiled through the harvest, and the table fitted per kind
- [ ] G3.14 Inputs chosen through a menu on the television: one device whose inputs are stepped up and down in a menu and confirmed, the Hitachi LE32V407 (Input, then Up or Down through TV, AV, Component, HDMI 1, HDMI 2, USB, then Select), and one that opens a menu and takes a key per input, compiled in an activity each on two different inputs; 17109 devices in the archive step a menu and 1822 take a key per input, about one television in six, and the composer refuses both, P3.1; check each file holds the device's input variable with a transition for every pair of inputs

### G4. Everything else only the services hold

- [ ] G4.1 The latest firmware for every bench model, filed in the lab where it is missing: MyHarmony's own version list, `files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml`, still served and filed in the lab's `firmware/packages/versiondb/`, names the One 3.4, the 700 2.8, the 650 0.4, the 300 and 350 1.4.0, all held, and **the 600 0.3**, newer than any 600 image in the lab; every image it names answers 404 on that server while the list and the other assets still answer, so 0.3 is not obtainable this way

### G5. What lands in this repository

- [ ] G5.1 How the service is used: which calls, in which order, to put devices on an account, compile and fetch the file, in `reference/logitech/data-model/`
- [ ] G5.2 An index of the harvest: per family and per feature, which lab compile holds the answer and for which model, names and numbers only, so nothing gathered is findable only in the lab

### G6. Two more that only the service can answer

- [ ] G6.1 Whether Logitech compiles a configuration with no activities, or none at all; MyHarmony greys out its Sync button without activities, but our compile call never goes through the button; with no activities it does (sections 352 and 364, the harvest compiles); with no devices unknown
- [ ] G6.2 Optional, needed only if Logitech has to compile another Harmony 300 or 350 setup with favourite channels: a favourites stage for the two sending `UpdateDeviceModeButtonMaps`, behind a door of its own, a new kind of write to Logitech's service that waits for a go-ahead. The 350 keeps its favourites on the device's mode map, which `SaveButtonMaps` does not reach, commit 00ab8d5b; our own favourites are `todo-compile-350.md` 4.3 and do not depend on it (was 3.2.1 there)

## Processing

### P2. The infrared families the composer refuses

- [ ] P2.2 The 482 families that lack only the press repeat count, about 339000 commands: take it from the device, `timing.pressMinRepeats` in the archive, where the family states none; `driving.ts` reads it and the composer does not use it; first score it against every Logitech compile in the lab and name the families it gets wrong, `Kreatel IP 22 Bit`'s intro section and the two Memorex families first; the archive's README names it as the count (commits ca0349b and fdbaffa)
  - [ ] P2.2.2 1740 commands in 337 families: a device whose code set holds a family stating a count other than its own; two devices were written at their main family's count, an unconfirmed reading, so these are refused; the compiles that would settle it are G2.6
  - [ ] P2.2.4 215 commands in 6 families: a device stating a count of 0, which no compile in the lab shows; the compile is G2.6
- [ ] P2.4 The 10 families that compose except for 231 commands; Logitech's own version of those codes is G2.4

### P3. The inputs the composer refuses

- [ ] P3.1 Inputs chosen through a menu: the composer refuses a device whose inputs state a start, finish or previous list, since no compile showed how Logitech's compiler writes one; from G3.14's compiles, read how a transition from one input to another is written (open the menu, how many steps up or down, confirm), whether it takes the shorter way and whether it assumes the menu opens on the current input or at the top, then compose it; the archive's input types are the service's numbering, 2 a key that cycles, 3 a menu then a key per input, 4 a menu stepped and confirmed, read in MyHarmony's `InputType`
