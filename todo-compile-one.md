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
one), and holds the write procedure. **Before writing build code, load `code-for-a-family`** too: the One's
differences belong in the touch family, plan 007.

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
  - [x] 1.2.5 A device page of more than six commands takes several pages, numbered by `paginate`; run end to end in 1.2.9, where its entry stated one page pointer for several, section 397
  - [x] 1.2.6 A long command name broken over two or three lines and cut with `..`, as Logitech's One compiles draw one: one rule reproduces every pad label of the 19 One containers, in the pad font read off the device pages (section 394, `touchLabelLines`)
  - [x] 1.2.7 The donor lettered in ours before any composer spells a name: every set re-lettered in its own colours, every text reading as before (section 396)
  - [x] 1.2.8 The findings and tests for 1.2.2 to 1.2.4 (section 393); 1.2.5's waits for 1.2.6 and 1.2.7, since a paged device needs names it can spell
  - [ ] 1.2.9 The test setup composed on the lettered donor, checked, dry run against `one_spare_track_start`, and written to the spare
  - [x] 1.2.10 A composed device's keys in device mode: the One composer writes an empty key map, where Logitech's One device modes are 49 entries in one order with 46 key presses, and the 650's `HARD_KEYS` does not carry over by key name (the One has no colour keys; Channel Up sends PresetNext on the Philips 70FA930/00S where the 650's order gives DirectionUp); the One's own table fitted from its compiles; 1.2.9 waits on it, since an activity's keypad is read off its devices' maps; done, section 397: `TOUCH_HARD_KEYS`, the touch family's `deviceModeKeys`, and the record in Logitech's shape, every key of the harvest's eight devices as Logitech binds it; corrected per review, section 397
  - [ ] 1.2.11 An activity's screens built for the One rather than copied, `todo-compile-one.md` 4.3 brought forward, decided on 15 October 2026: the One's activity composer copies its frame from an existing activity, and the donor has none; 1.2.9 waits on it
    - [x] 1.2.11.1 What a working screen and a start up screen of Logitech's One compiles consist of, fixed and per activity, measured; done, a scratch measurement over the 64 activities of 15 compiles, asserted as each part is built: one grammar on 64 of 64, every byte fixed, the activity's (name, type, rows and their paging, favourites, its device list) or one of ten named unknowns
    - [ ] 1.2.11.2 The touch family's activity screens built from that, the first activity composed onto a configuration with none
      - [x] 1.2.11.2.1 The pictures the donor lacks, drawn by us under decision 24 and shown before use (the look shown and agreed on 15 October 2026: rounded boxes in a light to dark blue gradient, white icons of the icon font, one box for every pad row): the activity menu row's background, each activity type's icon at the row's size and the start up screen's, and the working screen's three pad boxes; done, `activitypictures.ts`, section 399
      - [x] 1.2.11.2.2 The start up screen built: its record of 55 entries, its hit page, its program and chrome ("Starting" and the name, the type's icon, the two lines), the start up timer created where none exists, and the header list; done, `buildTouchActivityScreens`, on the spare since section 399
      - [x] 1.2.11.2.3 The working screen built: its record and handler lists (the timer, the lights by its pages and favourites), its hit page by pad count, its page lists and their pool copies, its pages (Devices, the pads in their boxes, the labels, the counter) and its chrome; done, `buildTouchActivityScreens`, on the spare since section 399
      - [x] 1.2.11.2.4 The activity's own entries: base slot 11's four case programs, its device list, and the "an activity is running" list the first activity creates; done but the device list, `buildTouchActivityScreens`: Logitech's One gives each activity a device list of its own holding **every** device, 64 of 64 over the fifteen compiles with activities, some devices and then the rest in the idle list's order, the head's order not read (the 600 family's, the activity's devices first and then the idle list's order, fits 12 of 64, corrected from 4 in section 402); ours enters the idle list, the same devices in the idle order, and the measurement goes into 1.2.11.2.6's finding
      - [x] 1.2.11.2.5 The first row on an activity menu that has none; done, the test setup's five activities on the donor with none, on the spare since section 399
      - [x] 1.2.11.2.6 Each part checked against Logitech's: every one of the 64 activities' screens rebuilt from its name, type, rows and device list, the way the Harmony 650's builders are checked; done, section 402: 52 of 64 the same part for part, the other 12 favourite channels (8), a page short of six before the last (2), picture pads (1) and a letter ours lack (1), none different; the start up title's set chosen by what the compile draws in, since every compile with an activity holds two
      - [x] 1.2.11.2.7 The One's look moved from the lab script into the codec's One pipeline: the flat boxes, smoothed letters, device look, colour button circles and centred pad labels
      - [x] 1.2.11.2.9 The screen light timeout as a touch family choice: the 10 s timer of the one pair queueing two lists of the same content (the other 20 s; timer 2 or 3, so found by its shape) is the light, measured on the spare One at 60 s
      - [x] 1.2.11.2.10 The page keys lit on our multi page screens: the activity list and the device lists call the off list and never the on one, which Logitech's compiler adds to every screen whose page keys do something
      - [x] 1.2.11.2.11 The keys below a composed device page bound and labelled: "Activities" and "Devices" copied off the configuration's own device page, which every Logitech device page draws and binds; our pages lit the keys and bound nothing
      - [ ] 1.2.11.2.8 A colour button's word wider than its circle ("Yellow") lies on two colours and stays unsmoothed; settle it before the words go back on by default (a whole button in the colour was tried and rejected)
    - [x] 1.2.11.3 The activity's keypad from its roles with the One's own keys, section 323's rule checked on the One; done, section 398: 1704 of 1752 keys and 38 of 50 activities whole, seven of the nine distinct ones, the keys the family's, `activityKeyRules`
- [ ] 1.3 A bench test of it: every code as the file predicts, the touch rows, device mode and All Off

## 2. Measure before building

- [ ] 2.1 Every screen byte of the Logitech One configurations in the lab sorted into fixed, dynamic and the setup's, as section 317 did for the 650
- [x] 2.2 What the One's configuration holds that the 600 family's does not: base slot 18, the touch hit map, the clock, the log area, and anything else found; done, a scratch measurement over the 19 distinct One compiles against five of the 600 family's, asserted when each builder lands:
  - raw slot 18 is two zero bytes on 19 of 19, what the firmware does with it unread
  - the touch hit map, base slot 17: 29 to 42 pages and 161 to 247 rectangles, 23 page shapes in every compile but only pages 0 to 2 at one place; nothing builds a whole map
  - the clock's screen side: a second transition on the minute calling two short lists, four header programs at base slot 11 entries 0 to 3, and 13 to 20 timers redrawing a header every four seconds and restarting themselves
  - the log area is 16 records from `0x3FFFF0` to `0x400000` with a three byte capacity, and the parameter block's 11 groups one value set, both on 19 of 19
  - state records 13 and 14 start at 1 and 2 where the 600 family's are 0 and 1; one two byte variable and no delay variables; `ButtonSoundVolume_2` on 19 of 19 and 0 of 5
  - the same structures with the One's content: base slot 8 opens with one call, the event map is 125 bytes with 10 firmware screens in front, the key table 221 bytes, 26 to 34 timers
- [x] 2.3 Which of the 600 family's measurements a builder relies on hold on the One, checked one by one against the One's compiles and its 3.4 image; done against the 19 compiles, the 3.4 image not read for any row:
  - hold: the placer's order, section 328, byte for byte on 19 of 19 once raw slot 18 is passed through `loosen` and `placePieces`; the first wide variable; the name tree's and the value maps' hash orders; the event map's rule with 10 screens in front; the 10 firmware screens then 30 status screens, their texts the One's own
  - hold with the One's values: state records 7 to 17 are constant but 13 and 14 differ; a value map's case count is one byte, `VALUE_MAP_COUNT_WIDTH`; every variable above the clock block is one byte up to 121 where section 276's width rule says two; the minute's second transition. With these four the state tables rebuild byte for byte on 19 of 19 in a scratch copy of the builder
  - do not hold: section 286's eleven start up entries (one call on the One), the 5 or 9 fixed timers (26 to 34, content dependent), section 272's six fixed base slot 9 entries (eight on the One), every four slot screen measurement
  - so chapter 6's placer, state tables, parameter block, log area and event map open by data alone; the rest of the wiring needs section 347's reading again for the One, and chapters 4 and 5 wait on 2.1

## 3. The composers stop borrowing

- [ ] 3.1 The One's composers moved behind the touch family's interface, plan 007, without changing a byte they write
- [ ] 3.2 Each part a composer still copies out of the donor listed, and built by us one at a time
- [ ] 3.3 No remote named outside `families/`, the `code-for-a-family` skill: code outside a family is generic, decided on 15 October 2026
  - [x] 3.3.1 The floor made executable, `test/generic.test.ts`, each module's counts pinned so the list can only be lowered; tightened by 3.3.2 to six shapes with comments left out: 23 modules
  - [x] 3.3.2 The module by module audit, past what a pattern finds; done over the 73 modules outside `families/`: 28 generic, 18 readers holding their per architecture facts in tables, 11 inline per architecture tests in 7 readers, 38 builder facts of one family in 16 modules, and 6 modules that are the Harmony 600 family's whole (`wiring`, `firmwarescreens`, `screenrecords`, `screentexts`, `backgrounds`, `activitykeys`); `compose.ts` passes about 55 of a family's internal names through to shared modules
  - [ ] 3.3.3 Each one moved into its family or into a per architecture table a reader consults, the list in `generic.test.ts` lowered with each move, least entangled first:
    - [x] 3.3.3.1 The inline reader tests into tables: `actions`, `tables`, `compare`, `touch`, `screencategories`, `statetables`'s second copy of the case count width; done, each a named per architecture table or constant read in one place, no reading changed, and six modules off `generic.test.ts`'s list (`statetables` names its one architecture as a constant until 3.3.3.3 moves it)
    - [ ] 3.3.3.2 The six whole modules into `families/four-slot`, `screentexts` first and `wiring` once a family member replaces the rewiring `shared/activities.ts` triggers; with them the four slot half of `assemble` and `modezero`, and the skin sets into the family's choices; `screentexts` and `firmwarescreens` moved, reached by `assemble` through the family's own index; the other four wait on an interface each: `backgrounds` holds the 650's skin set `fonttable` gates on (3.3.3.5), `screenrecords` is called by `backgrounds`, and `activitykeys` and `wiring` by `shared/activities.ts` (3.3.3.3, 3.3.3.4)
    - [ ] 3.3.3.3 The splits shared code reaches into: `activitykeys`, `statetables`, `devicemode`; then `compose.ts` stops passing a family's internals through
    - [ ] 3.3.3.4 One family member for a send's shape, the delay prelude or the bare pair, behind `shared/devices`, `inputs`, `sequence` and the donor input matcher; then the start sequence and the activity's own device list
    - [ ] 3.3.3.5 Faces, fonts and blending per family: `fonttable`, `lettering`, `blending`
    - [ ] 3.3.3.6 The four slot geometry and delay block of `inventory`, last, since moving it closes an import cycle through the registry

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
