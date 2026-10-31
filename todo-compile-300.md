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
- [ ] 1.2 Its identity recorded as `h300` and a full backup of the unit into the lab, as the 350's 1.5, the configuration read twice and identical
- [ ] 1.3 The 300 on the 350's rail, checked against its own lab record, with which skin the rail compares settled first: 79 in `/sys/sysinfo` and the configuration, 78 in `bcdDevice`
- [ ] 1.4 The first write: its own configuration back unchanged, read back and compared, and the remote still sends what it sent before
- [ ] 1.5 A first change: one delay changed and put back, each heard by the bench's infrared receiver, as the 350's 1.8

## 2. The keys

- [ ] 2.1 Every key sends something: the unit's configuration with every unbound scan code given a send, and a bench test pressing every key, as the 350's keypad check before 2.2.2
- [ ] 2.2 Every key in two modes against the 350's key table, the predictions written first since the two share one moulding; then the codes onto the 300's drawing, its printed labels checked against the unit

## 3. A Logitech compile, written and used

- [ ] 3.1 The test setup cut to four devices, one per device key, and the 300's four favourite channels, on the bench 300's record; the favourites typed into MyHarmony, since our setup script refuses this family's (`todo-later.md` 6.24)
- [ ] 3.2 Compiled by Logitech's service and filed in the lab, and what the compile holds in place of an activity read
- [ ] 3.3 Written to the bench 300 and used with a bench test derived from the compile, the compile added to the infrared monitor's list and the bench restarted before the run

## 4. Our composers on it

- [ ] 4.1 The 350's composers take the 300: four groups, no long press, the device key deciding the group, and 3.2's answer in place of an activity
- [ ] 4.2 The test setup built by us with nothing copied, every byte attributed, and compared with 3.2's compile
- [ ] 4.3 Written to the bench 300 and used with 3.3's bench test
