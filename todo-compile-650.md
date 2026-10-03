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
  - [ ] 1.3.1 Read a build timestamp Logitech stamped on the 1st of a month, day of month 0 with the previous day's weekday, which our reader refuses and which stops the device composer's save on the 650's current configuration (section 312)
- [ ] 1.4 Choose the test setup: devices and activities that between them use every feature in chapters 2 to 4, passthrough device and favourites included. No real device is needed, since the bench's infrared receiver hears what the remote sends
- [ ] 1.5 Choose the starting setup out of it: part of the test setup, with at least one activity and names that hold every letter the whole test setup needs
- [ ] 1.6 Have Logitech compile it for the 650, read it into the lab, write it back unchanged and register it as the compare base

## 2. Devices, everything that can be checked in device mode

- [x] 2.1 Compose a device from Logitech's catalogue: its infrared codes, its power variable, a device mode screen and key map, a row on the device list (section 285)
- [ ] 2.2 Power on and off as the catalogue states them, the long press version included: composed against the 650's file, and on the remote only Logitech's own long press version, reached by a one byte edit (section 309)
- [ ] 2.3 A new device list page when the last one is full: composed and calibrated against Logitech's own lists (section 312). On the 650 the seventh device's row enters its device, both list pages read n/m and its screens send the LG codes the Flirc expects; still to see a page **opened** on a list a person reaches, which on a corner list happens only at the fifth device, since the one page the seventh opened is on the two row list nothing enters (was L14)
- [ ] 2.4 A full device: every command the catalogue holds, on as many device mode pages as it takes (was 4.3.2)
- [ ] 2.5 A device's inputs: its input states and the commands that select them, directly or by stepping through them in order; the catalogue's are read (`driving.ts`, section 305), composing them is not started
- [ ] 2.6 Every infrared code of the test setup can be written: four in five catalogue commands do today, and the test setup is chosen from devices that compose completely
- [ ] 2.7 Several devices composed at once into one configuration (was 4.3.3)

## 3. Activities

- [x] 3.1 How an activity is built (was 1.1)
- [x] 3.2 Compose an activity: menu row, start up and working screens, its devices on and the rest off (section 291)
- [x] 3.3 The activity's own device list, "Activity" at the bottom (section 294)
- [x] 3.4 Off switches every device off (section 291)
- [ ] 3.5 A device's power on delay and the delay between devices, seen to act: composed (sections 287 and 288), but the activity written gave the delay nothing to hold back (section 291)
- [ ] 3.6 Set each device to the input the activity needs; works today only for a device whose input states came from Logitech's compile, waits on 2.5
- [ ] 3.7 The activity's key map built from its roles, volume to one device and channels to another, rather than copied from an existing activity
- [ ] 3.8 The activity's own screen pages: the commands it labels on the screen
- [ ] 3.9 Picking the running activity again: Logitech gives it a list of its own, the inputs and the working screen without the start up screen or power; ours replays the whole start (tag 5, section 313)
- [ ] 3.10 Leave devices on when switching activities, an option MyHarmony offers the 650: what it changes in the configuration
- [ ] 3.11 Put an activity on Watch TV, Watch a Movie or Listen to Music: one entry in the key map that is always installed; an activity with no key stays on the menu, and an empty key shows the "add an Activity" screen (section 314); `setActivityKey` and `clearActivityKey` built, on the 650 still to see a moved key start its activity, and an emptied key needs a base whose compile left one empty
- [ ] 3.12 A new activity menu page when the last one is full: composed and calibrated against Logitech's own menus (section 316); on the 650 still to check that it pages to the new page, every counter reads n/m and the new row starts its activity
- [ ] 3.13 No help and no Remote Assistant: the Help key does nothing in our configuration and every activity goes straight to its working screen, as the Harmony 600's configuration without an assistant already does; help is postponed to todo-later 3.3
- [ ] 3.14 A passthrough device in an activity, one a signal passes through unaltered

## 4. What else the test setup uses

- [ ] 4.1 Favourite channels, up to 23 on the 650, under Favorites in the Watch TV activity, four to a page, each a number or a logo: both forms, the number sender and the spelled out one, read on the Harmony One only (sections 154 and 156); nothing composes them
- [ ] 4.2 Sequences, on their own and as steps in an activity's start, composed within the queue limit `assertQueueFits` already enforces (section 238)
- [ ] 4.3 The three settings MyHarmony lists for the 650, at the values chosen
  - [x] 4.3.1 How long the screen stays lit: timer 1 (section 292)
  - [ ] 4.3.2 RemoteAssistant, set off, since 3.13 leaves the assistant out
  - [ ] 4.3.3 TiltSensor, waking when picked up
- [ ] 4.4 Save and restore lists, so a delay changed on the remote survives the next start (was L10)

## 5. Milestone: the test setup, composed on the starting configuration

- [ ] 5.1 Compose the rest of the test setup onto 1.6's starting configuration and write it
- [ ] 5.2 Check it against the same test setup compiled by Logitech: every key and every screen item, in every activity and in device mode, shows the same and sends the same infrared, as the bench's receiver hears it, Help and the Remote Assistant apart

## 6. The composers copy nothing

- [x] 6.1 List what each composer copies out of the configuration it is given: the list is 6.2's sub-items, checked against `compose.ts`
- [ ] 6.2 Build each of those ourselves, and write and check the setup again as in 5.2
  - [ ] 6.2.1 The command prelude's operands, copied off the configuration's own preludes
  - [ ] 6.2.2 The power on delay table's case order, copied off one of its own tables
  - [ ] 6.2.3 A new device's identifier, one past the highest in the configuration
  - [ ] 6.2.4 The start variable and the flag every activity sets, read off existing activities' start lists (`arch14Starts`)
  - [ ] 6.2.5 The activity counter variable and the four records keyed by activity, cases appended to them (`activityMaps`)
  - [ ] 6.2.6 Device page chrome and page programs (`fourSlotTemplate`, `fourSlotPageProgram`), backgrounds chosen by majority
  - [ ] 6.2.7 A device mode's key map shape, 47 entries, copied off an existing device mode
  - [ ] 6.2.8 The device mode and activity menu markers
  - [ ] 6.2.9 Menu growth off existing pages (`growFourSlotMenu`, and `openFourSlotMenuPage` copying the last page's chrome)
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

- [ ] 10.1 The frame: cookies, format word, the architecture record, the section table and every address, the end address, the trailer checksum (was 3.1)
- [ ] 10.2 The firmware's own wiring: the shared action lists every activity runs, base slot 9's fixed prefix and leftover entry, base slot 8's leading list, the event map, the log area's three numbers, which only the Harmony One's firmware writes to, the parameter block, the timers
- [ ] 10.3 The state variables: the firmware's own 0 to 17, the header's narrow and wide, the value map and the name tree
- [x] 10.4 Mode 0, the screen for an empty activity key: its table after the end marker is generated by `modeZeroKeyList`, byte equal to every 600, 650 and 700 sample (sections 311 and 315)
- [ ] 10.5 Place the pictures and glyph sets (was 3.2)
- [ ] 10.6 A setup description in, a whole container out; the description is FreeHarmony's own format, todo-later 1.1 (was 3.3)

## 11. The finish line

- [ ] 11.1 Build the test setup with no Logitech file as input, and check that every byte comes from one of our generators
- [ ] 11.2 Write it to the 650 and check it as in 5.2
