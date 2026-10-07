# Todo: compile for the Harmony 650

**The finish line**: a configuration for the Harmony 650 built entirely by us, nothing copied out of a
Logitech file, written to the remote and used.

**Only the Harmony 650.** No other remote is looked at in this track until it is done or we decide
otherwise. What has been done on the others, and what they will need afterwards, is in
[todo-later.md](todo-later.md), together with everything that is needed eventually but is not on
this route. [todo.md](todo.md) stays as it is until everything in it has a home in one of the two;
then it is retired and `CLAUDE.md` is updated, which names it as the one place the sequence lives.

**The route**: start from a Logitech compile of part of a test setup, add the rest with our own
composers until the whole test setup works (chapter 5), then replace every copied part until nothing is
copied. **Every chapter ends with a configuration that works on the 650.**

---

## 1. The write route and a starting configuration

- [x] 1.1 Write a whole configuration to the 650: erase, write, read back and compare, restart (sections 281 to 283)
- [x] 1.2 Skip the welcome tour after a write (section 286)
- [ ] 1.3 Every write to the 650 stamps the clock records and the build timestamp, small edits included, since every restart puts its clock back to the stamp (section 310)
  - [x] 1.3.1 Read a build timestamp Logitech stamped on the 1st of a month: the day counts from 0 and the weekday from Sunday, so day 0 is the 1st and every date we read or wrote before was a day off; the 650 runs a day ahead until its next write (section 322)
- [ ] 1.4 Choose the test setup: devices and activities that between them use every feature in chapters 2 to 4, passthrough device and favourites included. No real device is needed, since the bench's infrared receiver hears what the remote sends
- [ ] 1.5 Choose the starting setup out of it: part of the test setup, with at least one activity and names that hold every letter the whole test setup needs
- [ ] 1.6 Have Logitech compile it for the 650, read it into the lab, write it back unchanged and register it as the compare base

## 2. Devices, everything that can be checked in device mode

- [x] 2.1 Compose a device from Logitech's catalogue: its infrared codes, its power variable, a device mode screen and key map, a row on the device list (section 285)
- [x] 2.2 Power on and off as the catalogue states them, the long press version included: composed against the 650's file, and on the remote only Logitech's own long press version, reached by a one byte edit (section 309); composed from the catalogue and calibrated on 17 of 18 power hold devices (section 320), on the 650 the composed Plasma's power on and off went out as the long press version, seven frames in one burst, from its activity, its device page and All Off (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`)
- [ ] 2.3 A new device list page when the last one is full: composed and calibrated against Logitech's own lists (section 312). On the 650 the seventh device's row enters its device, both list pages read n/m and its screens send the LG codes the Flirc expects; still to see a page **opened** on a list a person reaches, which on a corner list happens first at the fifth device, since the one page the seventh opened is on the two row list nothing enters (section 326), so the check needs a 650 configuration with four devices and a fifth composed onto it (was L14)
- [x] 2.4 A full device: every command the catalogue holds, on as many device mode pages as it takes (was 4.3.2); composed the way Logitech lays it out, 527 of 527 keys and 466 of 468 screen items on 19 devices (section 325); on the 650 the whole TX-P42GT30E, 63 of 63 commands on 7 pages, rebuilt onto `h650_panasonic_config` (`lab/work/bench-2-4/`): every page and corner as drawn, power on and off seven frames, InputHdmi1 three, five hard keys each the Plasma's own command, All Off nothing (`reads/20261006T153704Z-ir-test-harmony-650-the-whole-plasma-on-seven-pages.json`); one label drawn in the green title font showed as its shadow alone, fixed in the composer and seen white on the remote (`reads/20261006T155725Z-ir-test-harmony-650-plasma-page-3-label-colour.json`)
- [x] 2.5 A device's inputs: its input states and the commands that select them, directly or by stepping through them in order; the catalogue's are read (`driving.ts`, section 305) and composed, 174 of 175 of Logitech's transitions matched on ten devices (`inputs.ts`, section 321); on the 650 the composed Plasma's activity sent power and then **no** input (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`): its input state's transitions are Logitech's "value changed" kind (`from -3`), as on Logitech's own Panasonic in the same file, and the LG's that do fire are the wildcard kind (`from -2`); the walker is read now (section 332): both kinds fire through a bare write, and what the composed file lacked against Logitech's is the catalogue's power on reset, composed since, which explains the second start's silence only if the first start left the input state at HDMI 1; the first start's silence is not explained by the file and wants a RAM read of the input state before and after a start; rebuilt with Logitech's silent input reset after power on (section 332), both starts sent PowerOn and then InputHdmi1 (`reads/20261006T145448Z-ir-test-harmony-650-plasma-kijken-sends-its-input.json`)
- [ ] 2.6 Every infrared code of the test setup can be written: four in five catalogue commands do today, and the test setup is chosen from devices that compose completely
- [x] 2.7 Several devices composed at once into one configuration (was 4.3.3): `composeCatalogueDevices`, one run equals one at a time, and on five Logitech compiles of 14 devices the device lists match 22 of 22 pages (section 331); on the 650 still to write the TX-29AK40F and the Knoll onto `h650_panasonic_config` and see both rows, their pages and their power codes; written in one run onto it: both rows on the Devices list in every one of its six copies, each copy keeping its own order, both pages open, Pana sent PanasonicV2 PowerToggle three times and Knoll 0x01FE00FF with seven repeats, All Off sent nothing for either (`reads/20261006T152222Z-ir-test-harmony-650-two-devices-composed-in-one-write.json`)

## 3. Activities

- [x] 3.1 How an activity is built (was 1.1)
- [x] 3.2 Compose an activity: menu row, start up and working screens, its devices on and the rest off (section 291)
- [x] 3.3 The activity's own device list, "Activity" at the bottom (section 294)
- [x] 3.4 Off switches every device off (section 291)
- [x] 3.5 A device's power on delay and the delay between devices, seen to act: composed (sections 287 and 288), but the activity written gave the delay nothing to hold back (section 291); the combined bench file's Plasma kijken would have, and its input was never sent, see 2.5; the power on delay is seen to act now, InputHdmi1 held back 6.5 s after PowerOn on both starts (`reads/20261006T145448Z-ir-test-harmony-650-plasma-kijken-sends-its-input.json`); the delay between devices holds back the device's own command: with the KPN box's at 2 s the KPN to Denon gap stayed 0.62 s (`reads/20261007T060756Z-ir-test-harmony-650-the-kpn-box-s-delay-between-devices-at-2-s.json`), with the Denon's at 2 s it grew from 0.62 s to 2.13 s in Kijk TV's start and from 0.61 s to 2.12 s in All Off (`reads/20261007T061443Z-ir-test-harmony-650-the-denon-s-delay-between-devices-at-2-s.json`), so it acts in All Off too, against section 287's inference that it acts inside an activity's start only; the Off key map and the Help screens raise the variable its step tests, section NNN
- [x] 3.6 Set each device to the input the activity needs; composed for a catalogue device too since section 321; on the 650 power was heard and the input not, see 2.5; heard on the 650 after the rebuild, InputHdmi1 on both starts (`reads/20261006T145448Z-ir-test-harmony-650-plasma-kijken-sends-its-input.json`)
- [x] 3.7 The activity's key map built from its roles, volume to one device and channels to another, rather than copied from an existing activity: built (`activityroles.ts`), exactly Logitech's on 20 of 40 compiled activities with every difference named (section 323); on the 650 Kijk TV's volume and mute went to the Denon and channel, digit and OK to the KPN box (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`)
- [x] 3.8 The activity's own screen pages: the commands it labels on the screen; built from a list of device commands, 41 of 47 pages identical to Logitech's (section 323); on the 650 Kijk TV's corners showed and sent Teletext, Radio and TV to the KPN box and Dimmer to the Denon (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`)
- [ ] 3.9 Picking the running activity again: Logitech gives it a list of its own, the inputs and the working screen without the start up screen or power; ours replays the whole start (tag 5, section 313)
- [ ] 3.10 Leave devices on when switching activities, an option MyHarmony offers the 650: what it changes in the configuration
- [ ] 3.11 Put an activity on Watch TV, Watch a Movie or Listen to Music: one entry in the key map that is always installed; an activity with no key stays on the menu, and an empty key shows the "add an Activity" screen (section 314); `setActivityKey` and `clearActivityKey` built, on the 650 Watch TV moved to Kijk TV started it, and TV kijken still started from the menu (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`); still to see an emptied key, which needs a base whose compile left one empty
- [x] 3.12 A new activity menu page when the last one is full: composed and calibrated against Logitech's own menus (section 316); on the 650 the menu paged 1/3, 2/3, 3/3 and wrapped, and the new page's Plasma kijken started (`reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`)
- [x] 3.13 No help and no Remote Assistant: the Help key does nothing in our configuration and every activity goes straight to its working screen, as the Harmony 600's configuration without an assistant already does; help is postponed to todo-later 3.3; a composed activity binds no Help and has no assistant branch, matching the no-assistant 600 configuration 4 of 4 (section 333); on the 650 Help pressed and held in Kijk TV did nothing, and on the Plasma's device page Help ran the idle entry's help, PowerOff to the LG, the Denon and the Plasma and then 'Did that fix the problem?', which is section 333's prediction: device modes bind no Help and a press there reaches the running entry, here the idle one carried from Logitech's compile; that one is Help itself and goes with todo-later 3.3 (`reads/20261007T054551Z-ir-test-harmony-650-help-does-nothing-and-the-gap-between-devices.json`)
- [ ] 3.14 A passthrough device in an activity, one a signal passes through unaltered

## 4. What else the test setup uses

- [ ] 4.1 Favourite channels, up to 23 on the 650, under Favorites in the Watch TV activity, four to a page, each a number or a logo: both forms, the number sender and the spelled out one, read on the Harmony One only (sections 154 and 156); nothing composes them
- [ ] 4.2 Sequences, on their own and as steps in an activity's start, composed within the queue limit `assertQueueFits` already enforces (section 238); `composeSequence` built and calibrated on the Harmony One's four compiles, its arch 14 form inferred and listed in `ARCH14_INFERRED` (section 327); on the 650 still to hear KPN 1, 2 s, KPN 2, 20 s, KPN Red from one press of Red
- [ ] 4.3 The three settings MyHarmony lists for the 650, at the values chosen
  - [x] 4.3.1 How long the screen stays lit: timer 1 (section 292)
  - [ ] 4.3.2 RemoteAssistant, set off, since 3.13 leaves the assistant out: the setting is applied by Logitech's compiler and what it changes in the bytes is not found, since every compile in the lab has it on; settling it needs one compile with it off, an account write (section 333)
  - [ ] 4.3.3 TiltSensor, waking when picked up
- [ ] 4.4 Save and restore lists, so a delay changed on the remote survives the next start (was L10)

## 5. Milestone: the test setup, composed on the starting configuration

- [ ] 5.1 Compose the rest of the test setup onto 1.6's starting configuration and write it
- [ ] 5.2 Check it against the same test setup compiled by Logitech: every key and every screen item, in every activity and in device mode, shows the same and sends the same infrared, as the bench's receiver hears it, Help and the Remote Assistant apart

## 6. The composers copy nothing

- [x] 6.1 List what each composer copies out of the configuration it is given: the list is 6.2's sub-items, checked against `compose.ts`
- [ ] 6.2 Build each of those ourselves, and write and check the setup again as in 5.2
  - [x] 6.2.1 The command prelude's operands: the constant load and a test of the start variable, built and checked against the configuration's own (section 319)
  - [x] 6.2.2 The power on delay table's case order: the compiler's hash order, generated (section 319)
  - [x] 6.2.3 A new device's identifier, one past the highest in the configuration, computed (section 319)
  - [x] 6.2.4 The start variable and the flag every activity sets: from the Off key map, records generated, every activity checked against them (section 329)
  - [x] 6.2.5 The activity counter variable and the four records keyed by activity: their keys follow from the counter's record, checked (section 329)
  - [x] 6.2.6 Device page chrome and page programs: built by `deviceModeChrome` and checked against every device mode page, 639 of 639 on 13 compiles (section 330)
  - [x] 6.2.7 A device mode's key map, 47 entries, built by `deviceModeKeyMap` in the compiler's hash order, 83 of 83 maps (section 330)
  - [x] 6.2.8 The device mode and activity menu markers: one variable, 1 on every device row and 0 on every activity row, generated and checked (section 329)
  - [x] 6.2.9 Menu growth off existing pages: every menu page built per kind by `fourSlotMenuChrome` and checked, 164 of 164 on 13 compiles (section 334)
  - [ ] 6.2.10 The start up and working screens off an existing activity's (`workingTemplate14`), and the Devices key's case
  - [ ] 6.2.11 An activity's own device list, copied from the idle list, its "Activity" word from another activity's list
  - [ ] 6.2.12 Letters and fonts off the configuration's own (`codesFor`, `fontThatSpells`)
  - [ ] 6.2.13 Write the setup again and check it as in 5.2

## 7. Screens built by us

- [ ] 7.1 Probe: write an almost empty configuration to the 650 and record what the remote demands at minimum, so screens it does not need are not built
- [x] 7.2 Categorise every screen left: the same on every 650, dynamic, or depending on the configuration; every screen byte of the four 650 compiles is attributed to exactly one, about three quarters fixed (section 317)
- [ ] 7.3 The screen records for the device list, the activity menu and Off, each page with its second copy (section 69)
- [ ] 7.4 Build the standard screens the probe shows are needed: the setup and status screens, and the welcome tour if it cannot simply be skipped

## 8. Text and fonts

- [ ] 8.1 Generate the text inside every screen program, Logitech's included, rather than carrying it (was 3.4)
- [ ] 8.2 Decide where the letter shapes come from, then build the font table

## 9. Pictures

- [ ] 9.1 Build the backgrounds ourselves: the cross dividing the four corners, the one item page, the device list's line and the start up screen's picture; the 650 draws no device or activity icons
- [ ] 9.2 Favourite channel logos

## 10. The container from nothing

- [x] 10.1 The frame: cookies, format word, the architecture record, the section table and every address, the end address, the trailer checksum; `layOutContainer` rebuilds all 13 Logitech compiles byte for byte, the skin and build time given (section 318, was 3.1)
- [ ] 10.2 The firmware's own wiring: the shared action lists every activity runs, base slot 9's fixed prefix and leftover entry, base slot 8's leading list, the event map, the log area's three numbers, which only the Harmony One's firmware writes to, the parameter block, the timers
- [x] 10.3 The state variables: the firmware's own 0 to 17, the header's narrow and wide, the value map and the name tree; generated from a description, byte for byte on all 13 Logitech compiles (section 324)
- [x] 10.4 Mode 0, the screen for an empty activity key: its table after the end marker is generated by `modeZeroKeyList`, byte equal to every 600, 650 and 700 sample (sections 311 and 315)
- [ ] 10.5 Place the pictures and glyph sets (was 3.2): `placer.ts` places everything Logitech parks exactly as Logitech does on 13 of 13; the picture bank's and half the page lists' order is our own choice, nothing found in the firmware reads a position (section 328); on the 650 still to run a file placed our way and see every screen and code unchanged
- [ ] 10.6 A setup description in, a whole container out; the description is FreeHarmony's own format, todo-later 1.1 (was 3.3)

## 11. The finish line

- [ ] 11.1 Build the test setup with no Logitech file as input, and check that every byte comes from one of our generators
- [ ] 11.2 Write it to the 650 and check it as in 5.2
