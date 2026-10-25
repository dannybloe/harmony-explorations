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

**Nothing writes to this family today.** The 350 is on none of the write lists, the transport refuses every
command but open for reading, read, close and ping, and how a remote of this family is recovered is not
checked. So chapter 1 is longer than any other track's: the write route has to be read, railed and rehearsed
before anything is composed for it.

**The route**: the write route first, then what the configuration holds that is still unread, then a
Logitech compile of part of a test setup written and used, then our composers on it, then nothing copied.
**From chapter 3 on, every chapter ends with a configuration that works on the 350.**

---

## 1. The write route

- [ ] 1.1 The decision whether the bench 350 may be written to, asked and recorded as a decision, not assumed; nothing below 1.4 sends a write until it is taken
- [ ] 1.2 How Logitech's client writes a configuration to this family, read in the decompiled client (decision 2): the paths, the open for writing, the write, the commit, the order, the sizes and any reboot or reset it sends
- [ ] 1.3 The same read in the 1.4 firmware image: the write and commit handlers, what validates `/cfg/usercfg` and when, and what the remote does with a file that fails
- [ ] 1.4 Recovery before the first write: how safe mode and the bootloader the file table names are entered, and what restores a remote of this family; into the `recovering-a-remote` skill
- [ ] 1.5 A full backup of the unit into the lab: its identity, `/cfg/usercfg`, and every other file on the inert path list
- [ ] 1.6 The rails: the file write path behind its own rail, `/cfg/usercfg` only, the unit checked against its lab record, the four byte end marker taken back off, and the file protocol's write and commit added to the transport's allow list for this path alone
- [ ] 1.7 The first write: the unit's own configuration back unchanged, read back and compared byte for byte, and the remote still sends what it sent before
- [ ] 1.8 A first change: one delay changed and put back, each heard by the bench's infrared receiver

## 2. What the configuration holds

- [ ] 2.1 Raw slots 5, 6, 8, 9, 12 and 14, read where the firmware's section seeker is called for them; raw 6's extra entry and whether it is the activity
- [ ] 2.2 The scan codes: which code each of the 55 keys raises, from the firmware's keypad table, checked at the bench with the infrared receiver since there is no screen to confirm a press on
- [ ] 2.3 Which infrared group a device takes on the 350, measured on the 300 only
- [ ] 2.4 How a device key's long press is stored
- [ ] 2.5 The state variables on this family: where they live, which the firmware owns, and whether the clock record seeds a running clock

## 3. A Logitech compile, written and used

- [ ] 3.1 The test setup: devices up to the 350's eight, its one activity, five favourite channels and a long press, chosen so between them they use every feature in chapter 4; no real device needed, since the bench's infrared receiver hears what the remote sends
- [ ] 3.2 The starting setup out of it, compiled by Logitech's service onto a test account's 350 record and filed in the lab
- [ ] 3.3 Written to the bench 350 through 1.6's route, with the family's first bench test: no screen, so every step is a key and a code heard

## 4. Our composers on it

- [ ] 4.1 A composed device: its infrared group at the model's maximum allocation, its names in the metadata archive, its key map
- [ ] 4.2 The composed activity
- [ ] 4.3 The favourite channels
- [ ] 4.4 A device key's long press
- [ ] 4.5 The whole test setup, written and run with a bench test

## 5. Nothing copied

- [ ] 5.1 Every section built by a generator: the name tree, the architecture record, the timestamp and clock, the infrared table, the action lists, the parameter block, the number sender, the metadata archive and the slots 2.1 named
- [ ] 5.2 Checked: it rebuilds, and every byte is attributed to a generator with none carried
- [ ] 5.3 Written to the bench 350 and used with a bench test
