# Todo: compile for the Harmony One

**The finish line**: a configuration for the Harmony One built entirely by us, nothing copied out of a
Logitech file, written to the spare Harmony One and used. The same finish line as
[todo-compile-650.md](todo-compile-650.md), [todo-compile-700.md](todo-compile-700.md) and
[todo-compile-600.md](todo-compile-600.md). This is `todo.md` 3.5.

**Why the One now**: decided on 15 October 2026, after the 600 finished the Harmony 600, 650 and 700's
tracks. It is the other screen family, the touch family of plan 007, and the remote most of the format
work was first measured on; the spare Harmony One was first written on 30 August 2026, section 222.

**Before working any item, load the `harmony-one` skill**, in this session and in every agent brief: it
says where the remote's facts are, which of the two Ones may be written (the spare, never the everyday
one), and holds the write procedure.

**Why this track is the 650's long route and not the 600's short one**: the 600 and the 700 reused
builders the 650 track had made. The One has composers that add a device, an activity and a menu page to
a Logitech file (`todo.md` 1.2.1, 1.2.2, 1.3 and 4.3.1), and nothing that builds from nothing: the frame,
the placer, the wiring, the screen texts, the screen records, the firmware screens, the pictures, the
fonts and the assembly all refuse anything but the Harmony 600, 650 and 700 today.

**What differs from the 600, 650 and 700, by the reference** (`reference/remotes/harmony-one/`):
* it runs its configuration **in place** out of memory mapped parallel flash, where they copy theirs
  from serial flash, so a write restarts it;
* its container has **22 pointer slots**, two more than theirs: a NULL at slot 8 and a real section at
  slot 18 (`CLAUDE.md` key facts);
* its screen is **touch**, 176 by 220 in colour, reached through a hit map over the drawing rather than
  through keys beside the screen, and it **clicks** before every command touched there;
* it **shows a clock**;
* it takes **15 devices**;
* a status screen **latches** until the battery comes out, where the 600 family's re-arms (sections 250
  to 253);
* the parameter block holds **11 groups**, not 9, with lengths of its own (`docs/config-format.md`).

**The route**: the composers we have, run on a Logitech One configuration, give the first file on the
spare; then every part the composers still borrow is built by us, as the 650's chapters 6 to 10 did; then
the empty configuration from nothing, then the test setup on it.

**The look**: our own letters and pictures, the button boxes behind every touchable command included, decision 24, decided on 15 October 2026; its colours are not
decided. **The test setup** is the 650 family's, `packages/corpus/setups/h650-test.json`, retargeted at the
One with its sequence's keys translated by name, since the One's keys have other scan codes.

---

## 1. The starting point

- [x] 1.1 Read the spare Harmony One's region into the lab as the compare base, and record which configuration it holds; done: `one_spare_track_start`, 0x1A0000 bytes from 0x040000, its unit checked against the spare's record; it holds MyHarmony's sync of the spare, seven devices and eight activities, with section 293's two test activities composed onto it, 1669427 bytes, every check passing
- [ ] 1.2 The test setup composed with the One's composers on a Logitech One configuration lettered in ours, checked and written to the spare; the donor is Logitech's compile of the Denon and the LG for the One (`harvest_one_two_devices`), skin 54 as the spare reports
  - [x] 1.2.1 The setup's device and activity steps shared by every family, `composeSetupParts` and `composeSetup` in `shared/setup.ts`, the Harmony 650 family's assembly unchanged byte for byte
  - [x] 1.2.2 A device's inputs composed on the One: Logitech's compiles of the same catalogue devices for the One and the 650 hold the same variables, values, transitions and waits, and a send there is the send and its quantity with no prelude
  - [x] 1.2.3 A device's power on delay composed on the One, a wait after its power on, which was missing: on Logitech's One compiles that wait is the catalogue's power on delay in tenths on 8 of 8 harvest devices (section 393)
  - [x] 1.2.4 The input put back after a power on (the Plasma's), placed after that wait as on the 600 family, where three of Logitech's One compiles put theirs too (section 393); 1.3 hears whether it goes out
  - [x] 1.2.5 A device page of more than six commands takes several pages, numbered by `paginate`; not yet run end to end
  - [x] 1.2.6 A long command name broken over two or three lines and cut with `..`, as Logitech's One compiles draw one: one rule reproduces every pad label of the 19 One containers, in the pad font read off the device pages (section 394, `touchLabelLines`)
  - [x] 1.2.7 The donor lettered in ours before any composer spells a name: every set re-lettered in its own colours, every text reading as before (section 396)
  - [x] 1.2.8 The findings and tests for 1.2.2 to 1.2.4 (section 393); 1.2.5's waits for 1.2.6 and 1.2.7, since a paged device needs names it can spell
  - [ ] 1.2.9 The test setup composed on the lettered donor, checked, dry run against `one_spare_track_start`, and written to the spare
- [ ] 1.3 A bench test of it: every code as the file predicts, the touch rows, device mode and All Off

## 2. Measure before building

- [ ] 2.1 Every screen byte of the Logitech One configurations in the lab sorted into fixed, dynamic and the setup's, as section 317 did for the 650
- [ ] 2.2 What the One's configuration holds that the 600 family's does not: base slot 18, the touch hit map, the clock, the log area, and anything else found
- [ ] 2.3 Which of the 600 family's measurements a builder relies on hold on the One, checked one by one against the One's compiles and its 3.4 image

## 3. The composers stop borrowing

- [ ] 3.1 The One's composers moved behind the touch family's interface, plan 007, without changing a byte they write
- [ ] 3.2 Each part a composer still copies out of the donor listed, and built by us one at a time

## 4. Screens built by us

- [ ] 4.1 The activity menu: rows, hit rectangles, page counters and the page turn keys
- [ ] 4.2 A device's pages: rows of commands and their hit rectangles
- [ ] 4.3 An activity's own screens: its start up screen and its working screen
- [ ] 4.4 The screens every configuration carries: the menus, Off, Help and the rest found in 2.2

## 5. Text, fonts and pictures

- [ ] 5.1 The text inside every screen program spelled from its word, as the 650's 8.1
- [x] 5.2 The fonts the One's screens draw, generated: five faces of the One's own, fitted to its rows, each set in its own colours (section 396); their weight is a choice, `faceWeights`
- [ ] 5.3 The pictures, built or drawn by us, the button boxes of the device pages and the menus among them

## 6. The container from nothing

- [x] 6.1 The frame for 22 slots: cookies, format word, the architecture record and the section table; `layOutContainer` rebuilds all 19 distinct Logitech One compiles and 15 of our writes byte for byte, the safe mode library and a half written read apart (section 395)
- [ ] 6.2 The placer for the One's pictures and glyph sets
- [ ] 6.3 The wiring: the One's own lists, settings and timers
- [ ] 6.4 The parameter block's 11 groups, the clock records, the state variable storage and the log area

## 7. The empty configuration for the One

- [ ] 7.1 Built for the skin the spare reports, decision 23, and checked: it rebuilds, every byte attributed to a generator and none carried
- [ ] 7.2 Written to the spare Harmony One with a bench test: it starts, shows its menus, the clock runs, All Off returns

## 8. The finish line

- [ ] 8.1 The test setup assembled on the empty configuration, checked against the same setup composed in 1.2
- [ ] 8.2 Written to the spare Harmony One and run with a bench test: behaviour as the file predicts and the look seen at the bench
