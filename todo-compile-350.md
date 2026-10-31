# Todo: compile for the Harmony 350

**The finish line**: a configuration for the Harmony 350 built entirely by us, nothing copied out of a
Logitech file, written to the bench 350 and used. The same finish line as
[todo-compile-650.md](todo-compile-650.md), [todo-compile-700.md](todo-compile-700.md) and
[todo-compile-600.md](todo-compile-600.md), on a remote that shares none of their code: no screen, a file
protocol instead of the command protocol, and a container of 15 slots of which six are unread.

**Why the 350 before the 300**: they share one firmware image, one protocol and one container, and the 350
holds what the 300 holds and more (eight devices against four, a long press on its device keys, an
activity). A route that reaches the 350's finish line covers the 300's, which then needs only what it lacks,
[todo-compile-300.md](todo-compile-300.md). todo.md 3.7.

**Before working any item, load the `harmony-300-350` skill**, in this session and in every agent brief, and
`code-for-a-family` before any build code: this is a new family in the codec, and what differs belongs in it.

**Nothing wrote to this family when this plan was written.** The 350 was on none of the write lists, the
transport refused every command but open for reading, read, close and ping, and how a remote of this family
is recovered was not checked. So chapter 1 is longer than any other track's: the write route had to be read,
railed and rehearsed before anything was composed for it. It is done: decision 26 permits the bench 300 and
350, `/cfg/usercfg` is written behind its own rail, and a changed delay was heard on the receiver.

**The route**: the write route first, then what the configuration holds that is still unread, then a
Logitech compile of part of a test setup written and used, then our composers on it, then nothing copied.
**From chapter 3 on, every chapter ends with a configuration that works on the 350.**

---

## 1. The write route

- [x] 1.1 The decision whether the bench 350 may be written to, asked and recorded as a decision, not assumed; nothing below 1.4 sends a write until it is taken: yes, and the 300 too, decision 26
- [x] 1.2 How Logitech's client writes a configuration to this family, read in the decompiled client (decision 2): the paths, the open for writing, the write, the commit, the order, the sizes and any reboot or reset it sends: seven commands, `tests/test_file_family_write_route.py`; the path and the checksum fields come from the package's manifest, not the template
- [x] 1.3 The same read in the 1.4 firmware image: the write and commit handlers, what validates `/cfg/usercfg` and when, and what the remote does with a file that fails: the reset only closes an open file, the open for writing erases at once, the check compares the stored checksum word, a failing configuration is left unused with no fallback, `tests/test_harmony_350_file_write.py`
- [x] 1.4 Recovery before the first write: how safe mode and the bootloader the file table names are entered, and what restores a remote of this family; into the `recovering-a-remote` skill: a failed configuration write is redone over USB, since the remote answers with no valid configuration; safe mode and the bootloader images are not read, `tests/test_harmony_350_recovery.py`; read since off the bench 350: every start runs both, safe mode chooses the application, and entering either writes nothing, `tests/test_harmony_350_boot.py`
- [x] 1.5 A full backup of the unit into the lab: its identity, `/cfg/usercfg`, and every other file on the inert path list: the lab's `reads/20261027T1700Z-h350-backup/`, the configuration read twice and identical
- [x] 1.6 The rails: the file write path behind its own rail, `/cfg/usercfg` only, the unit checked against its lab record, the four byte end marker written, not taken back off as this said until the firmware showed the start check demands it, and the file protocol's write and commit added to the transport's allow list for this path alone: `writeFileConfig` behind `HARMONY_FILE_WRITE=1`, `packages/usb/test/filewrite.test.ts`; the unit recorded as `h350` and the dry run clean
- [x] 1.7 The first write: the unit's own configuration back unchanged, read back and compared byte for byte, and the remote still sends what it sent before: on the fourth run, after the transport's dropped zero byte was found; the check answered `m`, the read back was identical, and off the cable the remote sent the bench TV's codes, eleven presses
- [x] 1.8 A first change: one delay changed and put back, each heard by the bench's infrared receiver

## 2. What the configuration holds

- [x] 2.1 Raw slots 5, 6, 8, 9, 12 and 14, read where the firmware's section seeker is called for them; raw 6's extra entry and whether it is the activity: raw 5 the start up instructions, raw 6 the key map table with entry 0 the key table, the activity a binding and not a map, raw 8 timers, raw 9 state variables, raw 12 an empty digit table, raw 14 NULL, `tests/test_harmony_350_slots.py`
- [x] 2.2 The scan codes: which code each of the 55 keys raises, from the firmware's keypad table, checked at the bench with the infrared receiver since there is no screen to confirm a press on
  - [x] 2.2.1 Read: the 1.4 image's keypad scan numbers a key 1 to 56 and the key maps bind it as it is; 47 keys tied to a code and eight narrowed to sets from five configurations, `tests/test_harmony_350_keys.py`, `packages/bench/test/keys350.test.ts`
  - [x] 2.2.2 Checked at the bench: `packages/bench/irtests/350-2-2-keys.json` against `docs/predictions/harmony-350-keys.md`, which also settles the receiver's device key, one favourite and the arrow pair; then the codes onto the drawing with a `SCAN_SOURCES` row: every key that sent did so on the predicted code, AVR/Game is the receiver, favourite 5 is code 2 and the upper arrow 25, the lower 26; 44 codes on the drawing, `h350_keys_ir`, `TheBench350HeardEveryKey` in `tests/test_harmony_350_keys.py`
- [x] 2.3 Which infrared group a device takes on the 350, measured on the 300 only: a short press takes the key's place, `TV/Media` 0 to `DVD/Music` 3, selected on the key's release, `tests/test_harmony_350_device_groups.py`; the long press waits for a compile with a device on one, 3.1; the bottom left and top left keys heard selecting their devices on the bench 350; the long press `4 + place` on one contributed file, `tests/test_harmony_350_long_press.py`
- [x] 2.4 How a device key's long press is stored: a binding of the held event, `0xC0` and the scan code, in raw slot 6's entry 0 selecting the second device's map, read in the one configuration with one (harmony-decompiler issue 37); the firmware ends a press in a release or, held about a second, in that event and no release, the short press device is bound to the release, and a key with one device selects nothing when held, `tests/test_harmony_350_long_press.py`; not watched on a unit
- [x] 2.5 The state variables on this family: where they live, which the firmware owns, and whether the clock record seeds a running clock: from `0x108`, 0 to 17 the firmware's, and the clock records seed a clock the firmware runs to the minute while no configuration carries it into the hour, `tests/test_harmony_350_clock.py`

## 3. A Logitech compile, written and used

- [x] 3.1 The test setup: devices up to the 350's eight, its one activity, five favourite channels and a long press, chosen so between them they use every feature in chapter 4; no real device needed, since the bench's infrared receiver hears what the remote sends: `packages/corpus/setups/h350-test.json`, the shared test setup's seven devices and the Knoll, TV kijken on Watch TV, 1, 2, 3, 666 and 07 on the KPN; the service placed the eight on the four keys itself, a short and a long press each
- [x] 3.2 The starting setup out of it, compiled by Logitech's service onto a test account's 350 record and filed in the lab: the bench 350's own record on the first test account, the lab's `work/setups/h350-test/`; the compile check's missing activity is the check's, since this family names no activity and Watch TV's binding is there. This said one compile with `build-setup.ts`'s new `favourites` stage; that stage's save was ignored by the 350 and its first compile, kept as `first-compile/`, bound no favourite, so the five were typed into MyHarmony's screen and a second compile bound them; the 350 keeps them on its mode map, `favourites.test.ts`; a stage of ours that saves them there, its sub-item 3.2.1 until then, is optional and `todo-later.md` 6.24
- [x] 3.3 Written to the bench 350 through 1.6's route, with the family's first bench test: no screen, so every step is a key and a code heard: the compile written and read back identical, `irtests/done/350-3-3-logitech-setup.json` run twice, 20 of 20 steps each once matched against the compile from the pulses (the first run's own verdicts failed seven, its monitor not having loaded the compile); favourites 1 to 4 are codes 8, 9, 11 and 34, nine keys onto the drawing, a power on delay holds back no other device, `h350_logitech_setup_ir` and `_2`, `packages/bench/test/setup350.test.ts`, `TheBench350HeardTheTestSetup`

## 4. Our composers on it

- [ ] 4.1 A composed device: its infrared group at the model's maximum allocation, its names in the metadata archive, its key map; the no screen family's first members, and the Plasma composed onto the three device file matches Logitech's compile of it in records, send lists, power variable, waits, metadata and 38 of 40 bindings, `packages/codec/test/noscreen.test.ts`
  - [ ] 4.1.1 The product answers the composer stopped at: the Input key's device, volume to the receiver per device, the favourite key and soft buttons, the uncalled one block digit copies; the copies are what favourites send in four compiles, so the open part is why other devices hold them
  - [ ] 4.1.2 The top left key, which needs raw slot 5's start up select
  - [ ] 4.1.3 Composing onto the full test compile, after a device removal step, since all eight groups are in use
  - [ ] 4.1.4 The metadata archive's `Index` and `DeviceId`, once what reads the archive is known
  - [ ] 4.1.5 A composed device written to the bench 350 and heard
- [ ] 4.2 The composed activity
- [x] 4.3 The favourite channels: `composeNoScreenFavourites`, up to five on one device, composed onto Logitech's compile without favourites equals its compile with them in length, the KPN's map, the number sender and all 331 lists, `packages/codec/test/noscreenfavourites.test.ts`; the Harmony 300's key order is its own track's, and a bench test is 4.5's
- [x] 4.4 A device key's long press: `composeNoScreenDevice` with `press: 'long'`, groups 4 to 7, held event, press list and timers equal to Logitech's compile on the four long press devices, `packages/codec/test/noscreen.test.ts`; Logitech's other routing of volume, Input and the favourite key is 4.1.1, and a bench test is 4.5's
- [ ] 4.5 The whole test setup, written and run with a bench test

## 5. Nothing copied

- [ ] 5.1 Every section built by a generator: the name tree, the architecture record, the timestamp and clock, the infrared table, the action lists, the parameter block, the number sender, the metadata archive and the slots 2.1 named
- [ ] 5.2 Checked: it rebuilds, and every byte is attributed to a generator with none carried
- [ ] 5.3 Written to the bench 350 and used with a bench test
