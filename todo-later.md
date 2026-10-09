# Todo: later

Everything that has to be done eventually for the library and FreeHarmony to be complete, and that is
not on the route to a configuration built entirely by us for the Harmony 650. That route is
[todo-compile-650.md](todo-compile-650.md). An item moves there when it turns out to block it. What needs
Logitech's service is gathered first, in [todo-secure-logitech.md](todo-secure-logitech.md), and processed
in [todo-process-logitech.md](todo-process-logitech.md).

The old numbers in brackets are [todo.md](todo.md)'s, which stays as it is until everything in it has a
home in one of the two files.

---

## 1. The device library

- [ ] 1.1 FreeHarmony: how a device is stored in our own library (was 4.1)
- [ ] 1.2 FreeHarmony: convert Logitech's database records into that format (was 4.2)
  - [x] 1.2.1 Read a device's driving rules out of the archive: timing, power, inputs, channel tuning and states, `driving.ts` (section 305)
  - [x] 1.2.2 Ask the archive's author whether his converter sorts every action list on `Order`: it does, every list, stated in his README; the raw file stays, since it holds fields the archive drops (section 305)
- [x] 1.3 The raw capture behind the infrared archive, `make catalogue-raw` and `catalogueRules`: a script that updates the archive clone, fetches a newer raw release by its checksums, extracts what the archive drops (per step send or record, input numbering, the connected app mark) into a small side file and indexes every device's position; the catalogue reader answers from both
- [x] 1.4 Confirm the archive's statement that every per input and per state list is in Order sequence, against the raw capture: all of 680091, 82622 and 29326 lists (section 305)

## 2. Learning codes

- [x] 2.1 Infrared capture over USB, read out of the firmware (section 98)
- [ ] 2.2 A learned code's tail shape
- [ ] 2.3 A learned code's storage class
- [ ] 2.4 The three encoding classes no configuration in the corpus carries

## 3. Remote settings

- [ ] 3.1 Find where each setting lives, per model
  - [ ] 3.1.1 How long the screen stays lit on the Harmony 700: which of its pair of timers it is
  - [ ] 3.1.2 RemoteAssistant, the question after an activity starts, on the Harmony 600 and 700
  - [ ] 3.1.3 TiltSensor, waking when picked up, on the Harmony 600 and 700
  - [ ] 3.1.4 The Harmony Touch's eleven, among them screen brightness and screen timeout
  - [ ] 3.1.5 The Harmony One's and the Harmony 525's, which Logitech's service does not list
- [ ] 3.2 Read and change them from FreeHarmony
- [ ] 3.3 Help and the Remote Assistant on the Harmony 600, 650 and 700, postponed from the 650's compile track, which builds without them
  - [ ] 3.3.1 Help, short press, per activity: the "Attempting to fix" screen that resends power and inputs, then a question per device ("Is the TV on?") that resends that command
  - [ ] 3.3.2 Help held five seconds: the delay fixing menu, with a picker row and five delay screens per device
  - [ ] 3.3.3 Help's per device parts: the "Is the X off?" question for Off, the four counters the answers bump, and the "Fix it now" wizards All Off offers once a counter is high enough
  - [ ] 3.3.4 The Remote Assistant: one screen per activity, a branch on one variable before the working screen, and a shared screen for Off and after a sync

## 4. The app

- [ ] 4.1 The interface
- [ ] 4.2 Publish `packages/*` so somebody without this checkout can build it (decision 4)

## 5. Other remotes, after the Harmony 650

The Harmony 600 and 700 are the 650's type and run the same code, so they are a confirmation each.
The Harmony One is a different type, with a touch screen and its own screens, so it is a port.

- [ ] 5.1 The spare Harmony One: port the 650's track
  - [x] 5.1.1 A whole configuration written (sections 222 to 251), and the clock and build timestamp stamped (sections 111 and 130)
  - [x] 5.1.2 A composed device, on hardware (sections 242 and 278), and a new device list page (sections 241, 242 and 293)
  - [x] 5.1.3 A composed activity, on hardware (sections 278 to 280), a new menu page (section 293), and Off (section 280)
  - [ ] 5.1.4 Power on and off with the long press version: not composed; whether its configurations hold long press versions is unchecked
  - [ ] 5.1.5 A power on delay: not composed, a composed device gets none on the Harmony One
  - [ ] 5.1.6 Everything else in the 650's track
- [ ] 5.2 The Harmony 600: confirm the 650's track
  - [x] 5.2.1 A whole configuration written (sections 302 and 303)
  - [ ] 5.2.2 A composed device: refused while its device list is full (section 285)
  - [ ] 5.2.3 A composed activity and its own device list: against its file only (sections 289, 290 and 294)
  - [ ] 5.2.4 A delay saved on the remote overrides the configuration's (section 303), so a written delay can do nothing
- [ ] 5.3 The Harmony 700: confirm the 650's track
  - [x] 5.3.1 A whole configuration written (sections 300 and 301)
  - [ ] 5.3.2 A composed device: refused while its device list is full (section 285)
  - [ ] 5.3.3 A composed activity and its own device list: against its file only, and never on the remote (was 1.2.11)
- [ ] 5.4 Compose and write an activity for the Harmony 525; nothing can compile a configuration for that model, so there is no vendor file to check ours against (was 1.5)
  - [x] 5.4.1 One block written back unchanged (section 269)
  - [ ] 5.4.2 Whether the 0xFE fill above the state variable storage happens on the Harmony 525 too: unmeasured (was 1.3.2)
- [ ] 5.5 The Harmony 300 and 350, and the Harmony Touch: the file based family, read only so far
- [ ] 5.6 The legacy remotes, Harmony 880, 885, 890 and 895: contributed configurations only, no compiler
- [ ] 5.7 A reference folder and a skill for every remote on the bench, the way the Harmony 650 has `reference/remotes/harmony-650/` and the `harmony-650` skill: the folder holds the model's facts with a source each, the skill says to read it first and carries that remote's write and bench procedure, so an agent sent to any remote starts from what is known; the One, 600, 700, 300 and 350 moved to [todo-process-logitech.md](todo-process-logitech.md), whose processing lands in their folders
  - [ ] 5.7.4 Harmony 525, with an architecture folder of its own, and the hazard that its application firmware sits one erase block below its configuration
  - [ ] 5.7.6 Harmony Touch, file based as well, read only

## 6. Fine tuning and loose ends

- [ ] 6.1 A library function for any remote: point a device's power keys in device mode at the long press version where the configuration holds one; done by hand once on the Harmony 650 (was L15)
- [ ] 6.2 `blockOfStatedCode` builds a one frame press for the Memorex 32 Bit family where Logitech's compiled press holds three (was L13)
- [ ] 6.3 A delay saved on a Harmony 600, 650 or 700 wins over the configuration's: left are why the bench gap moved only 0.1 of 0.5 seconds, how the compiler picks a device's key, and what wrote the Harmony 600's two saved delays (was L9)
- [ ] 6.4 Fix `deviceModeMaps`, which picks a help screen for the 700s' A/V switch, and restate section 271's counts (was 1.4.3's last item)
- [ ] 6.5 `make protocols --write` no longer reproduces `src/protocols.ts`: a measured row's counts move and four tests fail (was L12)
- [ ] 6.6 The bench's infrared monitor names no KPN frame whose first flashes the receiver merged; match it by its tail (was L11)
- [ ] 6.7 Flash reads stop out of sequence now and then in a write run, and the writer's journal does not record the error (was L8)
- [ ] 6.8 A black screen on the Harmony 650 after unplugging, once, cleared by a battery pull (was L5)
- [ ] 6.9 `GET_VERSION` field 6 and field 9's accessor, the two fields of twelve with no reading (was L3)
- [ ] 6.10 Excavate the lab: discovery is done, the reading phase is left, in tag order (was L2)
- [ ] 6.11 Five documents call the spare Harmony One's first configuration a factory configuration; it is a Logitech compile with one television and one activity, so correct the claim in place and add the wording to `reference/superseded.md`
- [ ] 6.12 Whether Logitech compiles a configuration with no activities, or none at all; MyHarmony greys out its Sync button without activities, but our compile call never goes through the button
- [ ] 6.13 Six Python tests fail on the Harmony 650 and 700 compiles the long press work added to the lab, and the golden vector list lacks `h650_plasma_base`: the EzHex population counts 23 against 17, and the per config checks on those six files
- [ ] 6.14 The composer reads a code's digit widths from the family name, where the archive reader takes them from Logitech's definition; 52,517 catalogue commands are refused for it
- [ ] 6.15 Release blocks and toggle bits as Logitech renders them: about 4,360 writable catalogue commands differ from Logitech's own rendering
- [ ] 6.16 A repeat count for the families whose definition states none, GoVideo and Panasonic 48 Bit first, which would unlock about 165,000 commands; the count is per device, `timing.pressMinRepeats` in the archive, which `driving.ts` already reads and the composer does not use; the archive's README says the same (commits ca0349b and fdbaffa), from the Harmony Hub's own code, and the sends per press in Logitech's compiles agreed with the service's per device count on 9 of 10 (the Kreatel box the exception); the measurement is `todo-process-logitech.md` 2.2
- [x] 6.17 Toolchain checks walk `.claude/worktrees/`, so an agent's worktree fails the facts, prose and write review checks until it is removed
- [ ] 6.18 Read the battery before writing to a remote, and refuse or warn when it is too low; a threshold per model is a guess until measured, but a remote that is about 3 V fresh and reads under 2 V is likely too low. For FreeHarmony as much as for the bench
  - [ ] 6.18.1 What each model takes, from Logitech's manuals: Harmony One one lithium ion cell; Harmony 600 and 650 AA alkaline, two on the bench 650 (the manuals do not say how many); Harmony 700 NiMH AA, charged on USB; Harmony 525 four AAA; Harmony 300 and 350 two AA; Harmony Touch an internal rechargeable
  - [ ] 6.18.2 The read has been sent to the Harmony 650 only, 2860 mV against 2.92 V on a meter (section 340); whether the One, 600 and 700 answer it the same way is unchecked, and the Harmony 525 refuses it

## 8. The specification and the code are the product ([plan 005](docs/plans/005-specs-and-code.md))

- [ ] 8.1 The decision: three deliverables, the `docs/spec/` layout, `findings.md` frozen as an archive, evidence per fact
- [ ] 8.2 Move the files into the layout and rewrite every path that names them
- [ ] 8.3 One folder per model in `docs/spec/remotes/`, ten files each, every fact with its standing, generated where the code already knows, nothing about our own units
  - [ ] 8.3.1 The Harmony 650 as the sample, with the shared Harmony 600, 650 and 700 architecture folder: built, generated blocks tested by `make remote-reference`; still to move our own units into `docs/test-notes/650-test-notes.md` with a test guarding the line
  - [ ] 8.3.2 The other bench models: One, 525, 600, 700, 300/350, Touch; thinner folders for the 880/885 and 890
  - [ ] 8.3.3 Absorb `reference/capabilities.md`
- [ ] 8.4 The specification is the first place to read and write: `CLAUDE.md` and the skills route to it
- [x] 8.5 A drawing for every bench model
  - [x] 8.5.1 Harmony 350: drawn from the manual's vector page, 55 keys, no scan code measured yet
  - [x] 8.5.2 Harmony 300: the 350's shapes with the 300's printing, read off its guide's cover photograph
  - [x] 8.5.3 Harmony 650 and 700: the 600's face with their own model number
  - [x] 8.5.4 Harmony Touch: from the manual's vector page, 29 keys and the touch screen
- [ ] 8.6 `docs/spec/infrared.md`, gathered from the code and the findings
- [ ] 8.7 A static HTML site built from `docs/spec/` and the drawings, committed, browsing models and their sections

## 7. Done, carried over from todo.md

- [x] 7.1 Read a configuration: 100% of every sample's bytes attributed
- [x] 7.2 The container codec in TypeScript, proven equal to the Python reader field for field
- [x] 7.3 The USB command protocol, both directions, and the write rails
- [x] 7.4 Change a field in place, and change a section's length
- [x] 7.5 Infrared: 681 protocol families in the rhythm table, and blocks byte identical to Logitech's own compiler for the same codes
- [x] 7.6 The Harmony 700 repaired out of safe mode and taken from firmware 2.5 to 2.8 (sections 295 to 299)
- [x] 7.7 The settings store on the Harmony 600, 650 and 700 read and written over USB, and the 600's saved delay cleared (sections 304 and 305)
- [x] 7.8 A device's power variable below narrow (section 277), and the firmware's own state variables 0 to 17 (section 284)
- [x] Two copies of the corner label wrap rule, `fourSlotLabelLines` in compose.ts and `wrapAtSpaces` in devicemode.ts: made one, `wrapAtSpaces` with `LABEL_WRAP_WIDTH` (section 330)
