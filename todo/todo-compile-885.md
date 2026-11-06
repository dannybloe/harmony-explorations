# Todo: compile for the Harmony 885

**The finish line**: a configuration for the Harmony 885 built entirely by us, nothing copied out of a
Logitech file, written to the remote and used. The same finish line as
[todo-compile-650.md](todo-compile-650.md), chosen over stopping at the milestone of chapter 5.

**The difference from the 650's route**: Logitech's service compiles nothing for the 880 or 885, so there is
no Logitech compile of our test setup to check against. The compare base is unit A's own configuration,
read off it in [todo-prepare-885.md](todo-prepare-885.md) 2.1, with the contributed 880 and 885
configurations beside it; a step is checked by what the remote does on the bench and by the base.

**Before any item**: read `../lab/work/legacy-remotes/HANDOVER.md` and [plan 012](../docs/plans/012-the-legacy-remotes.md),
write the item's brief into `../lab/work/legacy-remotes/notes/harmony-885/` and update the handover's state,
both before the item starts. **Load the `harmony-885` skill first**, in this session and in every agent brief. Before any build code in `packages/codec/src`, load `code-for-a-family`.

**The rails**: decision 30 permits the two bench units, A first. The configuration at `0x020000` only, base
slot 2 kept as every configuration states it, and nothing else written: not the firmware, the bootloader,
the staging source or the log area. Every chapter ends with a configuration that works on the 885.

**The architecture question**: the 880 and 885 share one application build, so a reading of it holds for
both; what is measured on a bench 885 holds for the 885 until an 880 confirms it. The 880 Pro and 720 are
not covered.

Written on 6 November 2026; linked from `todo-later.md` 5.6.

---

## 1. The write route and a starting configuration

- [x] 1.1 The `harmony-885` skill, as the 650 has its own: where the facts are, the rails, the write and bench procedure as they are established below; its write procedure is empty until 1.2 to 1.4 fill it in, and it names the backup a first write needs, which the lab does not hold yet
- [ ] 1.2 Arch 8 a write target, its own demonstration (section 269): the erase table's row, `ARCHITECTURES_WITH_A_WRITE_TARGET`, a target in `write-config.ts`, the unit check against `units/h885_a.txt`
- [ ] 1.3 One block of unit A's configuration written back unchanged and read back identical, the remote still running
- [ ] 1.4 Unit A's whole configuration written back unchanged: the write sequence as the firmware reads it (prepare 1.5), how the remote takes it up, and the clock afterwards, read over USB
- [ ] 1.5 Every write stamps the build time, if the 885 sets its clock from it as the 650 does (prepare 2.3)
- [ ] 1.6 Choose the test setup: the 650's devices and activities where the 885 can hold them, so the infrared bench tests carry over; what the 885 cannot hold, named
- [ ] 1.7 The starting configuration: unit A's own, registered as the compare base, its devices and activities read by our reader

## 2. Devices, everything that can be checked in device mode

- [ ] 2.1 Compose a device from Logitech's catalogue onto the base: its infrared codes, its power, a device mode with its screen and key map, a row on the device list
- [ ] 2.2 Power on and off as the catalogue states them, the long press version included
- [ ] 2.3 The opening silence of every switching code, the 885's inter device delay (prepare 3.11)
- [ ] 2.4 A new device list page when the last one is full
- [ ] 2.5 A full device: every command the catalogue holds, on as many device mode pages as it takes
- [ ] 2.6 A device's inputs, directly or by stepping through them
- [ ] 2.7 Several devices composed at once into one configuration

## 3. Activities

- [ ] 3.1 How an activity is built on the 885, read in the base and the contributed configurations
- [ ] 3.2 Compose an activity: menu row, start up and working screens, its devices on and the rest off
- [ ] 3.3 The activity's key map from its roles, volume to one device and channels to another
- [ ] 3.4 The activity's own screen pages
- [ ] 3.5 Off switches every device off; picking the running activity again
- [ ] 3.6 A new activity menu page when the last one is full
- [ ] 3.7 A passthrough device in an activity
- [ ] 3.8 Help and anything like the Remote Assistant left out, as on the 650

## 4. What else the test setup uses

- [ ] 4.1 Sequences, within the two timers and the queue the firmware allows (prepare 3.2, 3.6)
- [ ] 4.2 The settings the 885 has, at the values chosen
- [ ] 4.3 The state variables within the 64 byte ceiling (prepare 3.3)

## 5. Milestone: the test setup, composed on the starting configuration

- [ ] 5.1 Compose the rest of the test setup onto the base and write it to unit A, every key and screen item heard and seen on the bench
- [ ] 5.2 Check it against the base's own devices and activities: what Logitech's compile did for a kind of thing, ours does the same, or the difference is named

## 6. Our composers stop borrowing parts from the base

- [ ] 6.1 List what each composer copies out of the configuration it is given
- [ ] 6.2 Build each of those ourselves, and write and check the setup again as in 5.1

## 7. Screens built by us

- [ ] 7.1 How the 885 draws a screen, written up as a screen family of the codec beside the One's and the four slot one (plan 007)
- [ ] 7.2 Probe: an almost empty configuration on unit A, to see what the remote demands at minimum
- [ ] 7.3 Categorise every screen: the same on every 885, dynamic, or depending on the configuration
- [ ] 7.4 The device list, the activity menu and Off built by us
- [ ] 7.5 The firmware's own screens and the setup screens the probe shows are needed
- [ ] 7.6 Written to unit A with every screen this chapter builds, and checked as in 5.1

## 8. Text and fonts

- [ ] 8.1 Generate the text inside every screen program rather than carrying it
- [ ] 8.2 Our letters, Oxanium as on the 650 (decision 19), in the 885's font format
- [ ] 8.3 Written to unit A and looked at

## 9. Pictures

- [ ] 9.1 The pictures drawn by rule, in the 885's encoding (section 363 reproduced Logitech's on arch 8)
- [ ] 9.2 The designed pictures and icons replaced by our own

## 10. The container from nothing

- [ ] 10.1 The frame: cookies, format word, the architecture record, the section table and every address, the trailer checksum
- [ ] 10.2 The firmware's own wiring, the event map, the timers and the log area's numbers (base slot 2 as every configuration states it)
- [ ] 10.3 The state variables and the name tree
- [ ] 10.4 Place the pictures and glyph sets
- [ ] 10.5 An empty starting configuration built by our own generators, no device and no activity, written once to unit A

## 11. The finish line

- [ ] 11.1 Build the test setup with no Logitech file as input, every byte from one of our generators
- [ ] 11.2 Write it to unit A and check it as in 5.1
