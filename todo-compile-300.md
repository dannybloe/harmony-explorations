# Todo: compile for the Harmony 300

**The finish line**: a configuration for the Harmony 300 built entirely by us, nothing copied out of a
Logitech file, written to the bench 300 and used. The same finish line as
[todo-compile-350.md](todo-compile-350.md), and the same code: this track carries only what the 300 needs
beyond the 350's. Chapters 1 to 3 need only the hardware and Logitech's service and run beside the 350's
chapter 4; chapter 4 waits for the 350's composers. todo.md 3.7.

**Rewritten on 31 October 2026, after the 350's chapters 1 to 3**, which showed what this plan lacked: a
Logitech compile of the setup to check the remote and our build against, a check of every key before
trusting the keypad, and a first change heard before a whole configuration rides on the route.

**Before working any item, load the `harmony-300-350` skill**, in this session and in every agent brief.

**What differs from the 350, by the reference**:
* it takes **four devices**, and its infrared table holds four groups where the 350's holds eight;
* its device keys have **no long press**;
* Logitech's service gives it **no activity**, only partly set up ones;
* the bench unit is **the European model**, skin 79, with four favourite channels where skin 78 has five,
  and reports 78 in its USB descriptor;
* which infrared group a device takes follows **the device key it is assigned to**, measured on this model.

---

## 1. The write route

- [x] 1.1 The decision whether the bench 300 may be written to, asked and recorded as a decision, not assumed: decision 26, taken with the 350's 1.1; the write rail already names a record `h300`, skin 79
- [x] 1.2 Its identity recorded as `h300` and a full backup of the unit into the lab, as the 350's 1.5, the configuration read twice and identical: the lab's `units/h300.txt` and `reads/20261031T1205Z-h300-backup/`, 97470 bytes, the four device configuration read in section 265 byte for byte
- [x] 1.3 The 300 on the 350's rail, checked against its own lab record, with which skin the rail compares settled first: 79 in `/sys/sysinfo` and the configuration, 78 in `bcdDevice`; the rail compares `/sys/sysinfo`'s, 79, and the dry run passed
- [x] 1.4 The first write: its own configuration back unchanged, read back and compared, and the remote still sends what it sent before: verified and restarted, then `packages/bench/irtests/done/300-1-4-own-config.json` passed every step
- [x] 1.5 A first change: one delay changed and put back, each heard by the bench's infrared receiver, as the 350's 1.8: the TV's power on delay inside Watch TV at 100 and back at 50 tenths, the first Volume Up 11.5 s and 6.5 s after the TV's power code, `packages/bench/irtests/done/300-1-5-delay-*.json`; `set-delay.ts` changes only the power state's copy, which no key reaches on this file

## 2. The keys

- [x] 2.1 Every key sends something: the unit's configuration with every unbound scan code given a send, and a bench test pressing every key, as the 350's keypad check before 2.2.2: the lab's `work/300-every-key/every-key.bin`, 12 keys given Info's list, `packages/bench/irtests/done/300-2-1-every-key.json` passed all 18 steps, no key silent or sending twice
- [x] 2.2 Every key in two modes against the 350's key table, the predictions written first since the two share one moulding; then the codes onto the 300's drawing, its printed labels checked against the unit: 49 keys heard on the code of the 350 key in the same place, P1 to P5 held, four failed steps the US wording on the European unit; the European printing is its own drawing, `h300eu`, carrying the 49, `packages/bench/test/keys300.test.ts`

## 3. A Logitech compile, written and used

Changed on 31 October 2026: the bench 300 already held a Logitech compile of its record, so no new setup was put on the account. The record holds no devices any more; the compile is kept in the lab and is the reference.

- [x] 3.1 A Logitech compile of a four device setup for the bench 300: `h300_programmed_config`, compiled from its record with the Panasonic television, the KPN box, the Panasonic DVD player and the Sony video recorder and four favourite channels, section 265
- [x] 3.2 What the compile holds in place of an activity read: Watch TV is one list that toggles the KPN's and the television's power with their waits and ends in the KPN's mode, the lab's `work/setups/h350-test/chapter4-reading.md`, and its delay heard in 1.5
- [x] 3.3 Written to the bench 300 and used: 1.4's write of it unchanged, and the bench tests of 1.4, 1.5, 2.1 and 2.2 on it
- [ ] 3.4 The recipe our composers rebuild it from, `packages/corpus/setups/h300-test.json`, checked against the compile: devices, keys, Watch TV and the favourites

## 4. Our composers on it

- [ ] 4.1 The 350's composers take the 300: four groups, no long press, the device key deciding the group, and 3.2's answer in place of an activity
  - [ ] 4.1.1 A power on delay edited in every copy a key reaches: Watch TV's list holds its own, which `set-delay.ts` does not change
  - [ ] 4.1.2 The favourites in the 300's own key order, which `composeNoScreenFavourites` refuses: Logitech's compile puts them on other keys than the 350's
- [ ] 4.2 The test setup built by us with nothing copied, every byte attributed, and compared with 3.2's compile
- [ ] 4.3 Written to the bench 300 and used with 3.3's bench test
