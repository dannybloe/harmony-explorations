# Todo: compile for the Harmony 300

**Archived:** every item is ticked, nothing is open.

**Closed on 1 November 2026, folded into [todo-compile-350.md](todo-compile-350.md) by decision 28**: the
Harmony 300 and the Harmony 350 are one remote for configurations, one configuration entry bringing a 300
level with a 350. What was still open moved: 5.2 to the 350's 4.6, 5.3 to `todo-freeharmony.md` 1.7,
5.1 and 5.4 to `todo-later.md` 6.25. Kept as the record of the route.

**The finish line, changed on 31 October 2026**: settle whether the Harmony 300 is a Harmony 350 with
other printing, and if it is, fold it into [todo-compile-350.md](todo-compile-350.md) with the model's
limits as settings rather than keep a track of its own. todo.md 3.7.

**Why**: every difference the reference lists between the two models is a choice Logitech's service and
client make per model (four devices against eight, no long press, a cut down activity, four or five
favourites), and the printing. The remote itself runs one program built twice: the two applications
align instruction for instruction, and the one difference that is not an address is how a send from an
infrared group above 3 sets a pin, `tests/harmony_300_350/test_harmony_300_350_images.py`. Nothing in either reads which
model a configuration states, `tests/harmony_300_350/test_harmony_350_skin.py`, and our write route does not compare it.

**Before working any item, load the `harmony-300-350` skill**, in this session and in every agent brief.

---

## 1. The write route

- [x] 1.1 The decision whether the bench 300 may be written to, asked and recorded as a decision, not assumed: decision 26, taken with the 350's 1.1; the write rail already names a record `h300`, skin 79
- [x] 1.2 Its identity recorded as `h300` and a full backup of the unit into the lab, as the 350's 1.5, the configuration read twice and identical: the lab's `units/h300.txt` and `reads/20261031T1205Z-h300-backup/`, 97470 bytes, the four device configuration read in section 265 byte for byte
- [x] 1.3 The 300 on the 350's rail, checked against its own lab record, with which skin the rail compares settled first: 79 in `/sys/sysinfo` and the configuration, 78 in `bcdDevice`; the rail compares `/sys/sysinfo`'s, 79, and the dry run passed
- [x] 1.4 The first write: its own configuration back unchanged, read back and compared, and the remote still sends what it sent before: verified and restarted, then `packages/bench/irtests/done/300-1-4-own-config.json` passed every step
- [x] 1.5 A first change: one delay changed and put back, each heard by the bench's infrared receiver, as the 350's 1.8: the TV's power on delay inside Watch TV at 100 and back at 50 tenths, the first Volume Up 11.5 s and 6.5 s after the TV's power code, `packages/bench/irtests/done/300-1-5-delay-*.json`; `set-delay.ts` changes only the power state's copy, which no key reaches on this file

## 2. The keys

- [x] 2.1 Every key sends something: the unit's configuration with every unbound scan code given a send, and a bench test pressing every key, as the 350's keypad check before 2.2.2: the lab's `work/300-every-key/every-key.bin`, 12 keys given Info's list, `packages/bench/irtests/done/300-2-1-every-key.json` passed all 18 steps, no key silent or sending twice
- [x] 2.2 Every key in two modes against the 350's key table, the predictions written first since the two share one moulding; then the codes onto the 300's drawing, its printed labels checked against the unit: 49 keys heard on the code of the 350 key in the same place, P1 to P5 held, four failed steps the US wording on the European unit; the European printing is its own drawing, `h300eu`, carrying the 49, `packages/bench/test/harmony-300-350/keys300.test.ts`

## 3. A Logitech compile, written and used

Changed on 31 October 2026: the bench 300 already held a Logitech compile of its record, so no new setup was put on the account. The record holds no devices any more; the compile is kept in the lab and is the reference.

- [x] 3.1 A Logitech compile of a four device setup for the bench 300: `h300_programmed_config`, compiled from its record with the Panasonic television, the KPN box, the Panasonic DVD player and the Sony video recorder and four favourite channels, section 265
- [x] 3.2 What the compile holds in place of an activity read: Watch TV is one list that toggles the KPN's and the television's power with their waits and ends in the KPN's mode, the lab's `work/setups/h350-test/chapter4-reading.md`, and its delay heard in 1.5
- [x] 3.3 Written to the bench 300 and used: 1.4's write of it unchanged, and the bench tests of 1.4, 1.5, 2.1 and 2.2 on it
- [x] 3.4 Moved to 5.1, since it is a check of our build rather than of Logitech's

## 4. Is it a 350

- [x] 4.1 The two applications compared, both read off the units: one program linked twice, the only difference that is not an address the send kind a group above 3 gets, 0xFF on the 300 and 3 on the 350; bootloader and safe mode are other builds and run no configuration, `tests/harmony_300_350/test_harmony_300_350_images.py`
- [x] 4.2 What the four send kinds do: the lists entry 0 binds to firmware events 0x2D to 0x30, read in the configurations, so the one difference is known before the bench says it: one list on four pins, `tests/harmony_300_350/test_harmony_300_350_send_events.py`, and then the hang it hid, `tests/harmony_300_350/test_harmony_300_group_4_send.py`
- [x] 4.3 Logitech's compile of the 350's test setup written to the bench 300 and the 350's 3.3 bench test run on it, the predictions written first, the long press devices in groups 4 to 7 among the steps: as compiled it hangs the 300 at the first send from group 4, `tests/harmony_300_350/test_harmony_300_group_4_send.py`; with firmware event 0xFF bound to event 0x30's list, one entry in key map 0, all four groups above 3 sent and the remote kept working, the lab's `work/300-event-ff/`
- [x] 4.4 The verdict in the reference, decided as decision 28, the 300 a 350 for configurations or what differs, and this track folded into the 350's with the device count, the long press and the favourites as the model's settings: `reference/architectures/harmony-300-350/README.md`, "Making a Harmony 300 behave as a Harmony 350", `packages/codec/test/families/harmony-300-350/noscreeneventff.test.ts`

## 5. Logitech's 300 compile rebuilt

What stays the 300's own if 4.4 folds the track: our composers with the 300's settings checked against Logitech's compile for it.

- [x] 5.1 The recipe our composers rebuild it from, `packages/corpus/setups/h300-test.json`, checked against the compile: devices, keys, Watch TV and the favourites: moved to `todo-later.md` 6.25
- [x] 5.2 A power on delay edited in every copy a key reaches: Watch TV's list holds its own, which `set-delay.ts` did not change until the 350's 4.6; the activity's copy exists for a device with one power code only, a device with separate on and off codes reaches its delay through its power variable's list: moved to `todo-compile-350.md` 4.6
- [x] 5.3 The favourites in the 300's own key order, which `composeNoScreenFavourites` refuses: Logitech's compile puts them on other keys than the 350's: moved to `todo-freeharmony.md` 1.7
- [x] 5.4 The test setup built by us with the 300's settings, compared with 3.1's compile, written to the bench 300 and used with 3.3's bench test: moved to `todo-later.md` 6.25
