# Todo

**The sequence lives here and nowhere else.** Seven chapters, coarse on purpose. A chapter gets broken
down into a plan under `docs/plans/` when it is reached, and the plan is linked from its item.

Either of us adds, ticks or removes items. Keep the descriptions to one line: the reasoning belongs in
a plan, in `docs/decisions.md`, or in `docs/findings.md` with a test.

**Every item asks the architecture question before it is ticked**, decision 16: does this hold on the
other architectures, and if it was not checked, the item says so. "Not checked" and "no image exists"
are complete answers; an unasked question is not. Section 274 is what prompted it, where a firmware
reading stated as a fact about Harmonys turned out to be arch 12's and the Harmony 525 does it
differently.

*Replaced `docs/plans/002-the-roadmap.md` on 6 September 2026, which carried three separate accounts of the same
sequence. The reasoning it held is `docs/plans/002-the-roadmap.md`, its decisions are
`docs/decisions.md`.*

---

## 1. Activities

Plan: [003-how-an-activity-is-built.md](docs/plans/003-how-an-activity-is-built.md)

- [x] 1.1 Establish how an activity is built, read off the factory configuration.
      Anatomy: [how-an-activity-is-built.md](docs/how-an-activity-is-built.md)
  - [x] 1.1.1 Which sections it occupies, and which it shares with a device
  - [x] 1.1.2 The keypad map: bindings, and the enter and leave lists
  - [x] 1.1.3 The power on sequence, and how a device's delay relates to it
  - [x] 1.1.4 The screen page and its name
  - [x] 1.1.5 The state variable it sets
  - [x] 1.1.6 What an entry in the activity switching table corresponds to: a per model prefix, one per activity, one more (section 272)
  - [x] 1.1.7 Where device mode's own keypad map comes from: the device's own screen record (section 271)
  - [x] 1.1.8 Scored against one_config and h600_config: seven of nine right, P6 incomplete, P7 wrong
- [ ] 1.2 Compose an activity, the counterpart of `composeDevice`: `composeActivity`, on the Harmony One and the Harmony 600, 650 and 700
  - [x] 1.2.1 The screen half on arch 12 (Harmony One): a menu row, its hit rectangle and a drawn name (section 275)
  - [x] 1.2.2 A fourth activity, which needs a new menu page: a page counter, a pool copy, a page count, and undeadening the two page turn keys; Harmony One only, composed on two configurations and written to the spare Harmony One, which pages to four, and the device list's stale totals fixed with it (section 293)
  - [x] 1.2.3 The screen half on arch 14 (Harmony 600 and 650): the activity menu is the two row device list, a row on both buttons, and a page of one activity swaps to the full page picture; composed and checked on the 650, 600 and 700 configurations, not on hardware (section 289)
  - [x] 1.2.4 An activity's own screen mode, so its enter handler can open with an enter mode instruction as all 60 real ones do: a start up screen, then a working screen named by a base slot 14 record device mode's Activities key reaches (section 279)
  - [x] 1.2.5 Put a device's power variable below narrow, renumbering every reference: written 8 September 2026, the variable is one byte and holds 1 after a press, and the seven existing activities came through identical. The television still does not respond, so the width was not the cause (section 277)
  - [x] 1.2.6 The arch 14 send prelude: a delay step of three lists per command, read on 1598 of 1598 and composed with the device's InterDeviceDelay variable and table; not on hardware yet, since it acts only inside a start sequence (section 287)
  - [x] 1.2.7 Power off: a composed device joins the idle map's all off list and every existing activity's enter list as 0, and a composed activity writes every other device 0. Written 24 September 2026 with the Denon in the activity, and Off switches both off (section 280)
  - [x] 1.2.8 A composed device's power on delay on arch 14: the on transition runs the power command and then a 0x72 on PowerOnDelay through a 451 case table, a hundred tenths at a time, 15 of 15, and composed; not on hardware yet (section 288)
  - [x] 1.2.9 An arch 14 activity's own screens: a start up screen of its own, "Starting" and its name, and a working screen that is a device page with "Devices" at the bottom, plus a case in the four lookup records keyed by the activity; composed and checked on the 650, 600 and 700 configurations, not on hardware (section 290)
  - [x] 1.2.10 A composed arch 14 activity's own device list, "Activity" at the bottom: the idle list with the activity's devices first, reproducing all 13 real ones pixel for pixel; written to the 650 for LG kijken, and it shows and leads back as predicted (section 294)
  - [ ] 1.2.11 Check a composed activity on the Harmony 700 itself, which so far is checked only against its configuration files: written once L7 has made it a write target
- [x] 1.3 Write one to the spare Harmony One and watch the television, per docs/plans/004-writing-an-activity.md
  - [x] 1.3.1 First write: the activity appears on the menu and beeps, and starts nothing (section 276)
  - [x] 1.3.2 Why: base slot 13's narrow and wide size the state variable storage and everything above it is painted with 0xFE at every boot, so the power variable held 65278 instead of 0. Measured on arch 12 and both arch 14 images, confirmed on hardware; the fill is unmeasured on arch 9
  - [x] 1.3.3 Read the spare's region fresh, since the first write invalidated the dump every later one compares against: once before every write since
  - [x] 1.3.4 Rebuild with the fixed header and write again: written 7 September 2026, 25 blocks, reads back identical, and the variable is seeded to 0 with the 0xFE run starting two bytes higher exactly as predicted
  - [x] 1.3.5 The television still does not respond: the transition fired all along and the composed send was bare, where every corpus send is paired with a 0x7C for the same device (section 278)
  - [x] 1.3.6 Cheap discriminator before building a screen: point a 0x7E at a mode the config already has. The screen changed and nothing was sent, so it was not the cause (section 278)
  - [x] 1.3.7 Pair every composed send with its 0x7C: written 24 September 2026, 25 blocks, and the activity switches the television on through the composed device (section 278)
  - [x] 1.3.8 Rebuild from the composers alone and write that: written 24 September 2026, 25 blocks, the activity shows its start up and working screens with header, pads and Devices, and comes back from device mode (section 279)
- [ ] 1.4 Write one to the Harmony 650 and watch the television, the arch 14 counterpart of 1.3
  - [x] 1.4.1 Read the cache drop and the restart in the 650's own firmware, then send each once: both as read, and the drop arms the next erase, which at 0x030000 may update a setting in the remote's settings store (section 282)
  - [x] 1.4.2 A first write that changes something: one delay byte changed and reverted, to see what a remote that keeps its settings in memory does with a new one: live straight after the restart, and every restart resets the clock (section 283)
  - [ ] 1.4.3 A composed device on the 650, catalogue to remote, as 4.3.1 did on the One
    - [x] Read whether variables 13 to 17 are the firmware's on the 650 before composing one there: they are, 0 to 17 on the Harmony One, 600, 650, 700 and 880 and 885 while the 525 keeps 0 to 12, and the rail follows (section 284)
    - [x] Compose it offline: arch 14's screen half built, the LG on its own two page device mode with a key map and on all five device lists, every check passing, 13 blocks (section 285)
    - [x] Write it once the 650 is reassembled, with `write-config.ts` against `h650_config_region`, then press its screen items, its volume key in device mode, and Off: all six predictions hold (section 285)
    - [x] Read the 650's region back and register it as the next compare base: `h650_lg_region`, the written file byte for byte
    - [x] Skip the 650's welcome tour after a write: list 660's enter becomes a call to the tour's exit, written, the tour gone (section 286)
    - [ ] Fix `deviceModeMaps`, which picks a help screen for the 700s' A/V switch because it skips a device mode with no key and counts an enter handler as one, and restate section 271's counts (section 285); the bench 700's configuration is in the lab now as a third case
  - [x] 1.4.4 A composed activity, which needed 1.2.9 first: "LG kijken" written, 14 blocks, and all eight predictions hold on the remote (section 291)
    - [x] Write the start variable, 52 on the 650, to 1 near the start of its enter list and to 0 at the end, as all 13 arch 14 activities do, or the inter device delay does not act: written with the screens and the activity runs, while whether the delay acts cannot be told by eye (sections 290 and 291)
    - [x] A region read of the 650 covering 0x110000 before the write, since the composed device's delays reach that block: `h650_pre144_region`, and `h650_post144_region` after (section 291)
  - [x] 1.4.5 How long the screen stays lit: timer 1 on the 650, MyHarmony's GlowTime, 8 seconds as compiled, written as 20 and then 10 and timed on the remote (section 292)
- [ ] 1.5 Compose and write an activity for the Harmony 525: nothing composes one yet, and nothing can compile a configuration for that model, so there is no vendor file to check ours against (section 269 wrote one block back unchanged)

## 2. Screens

- [ ] 2.1 Categorise everything the remote shows
  - [ ] 2.1.1 What is identical on every remote of a model, so it can be carried
  - [ ] 2.1.2 What is dynamic
  - [ ] 2.1.3 What depends on the configuration's own content
- [ ] 2.2 Measure 2.1.1 first: two configurations of one model side by side
- [ ] 2.3 Build what cannot be carried

## 3. The compiler

- [ ] 3.1 Lay out a container from nothing: the section table and every address
- [ ] 3.2 Place the reused pictures and glyph sets
- [ ] 3.3 A document in, a whole container out
- [ ] 3.4 Generate the text inside a screen program rather than carrying it
- [ ] 3.5 Write a fully built configuration to the spare Harmony One and use it

## 4. The device library

- [ ] 4.1 FreeHarmony: how a device is stored in our own library
- [ ] 4.2 FreeHarmony: convert Logitech's database records into that format
- [ ] 4.3 Turn device information into a compilation that works on a remote
  - [x] 4.3.1 One device, six commands, catalogue to remote, television answered (section 242)
  - [ ] 4.3.2 A full device of ninety commands
  - [ ] 4.3.3 Several devices at once

## 5. Learning codes

Deliberately later. First target is devices that already exist in a catalogue.

- [x] 5.1 Infrared capture over USB, read out of the firmware (section 98)
- [ ] 5.2 A learned code's tail shape
- [ ] 5.3 A learned code's storage class
- [ ] 5.4 The three encoding classes no configuration in the corpus carries

## 6. Remote settings

The remote's own settings rather than its devices and activities. Logitech's service lists them per model.

- [ ] 6.1 Find where each setting lives, per model
  - [ ] 6.1.1 GlowTime, how long the screen stays lit: a timer (section 292)
    - [x] On the Harmony 650: timer 1, 8 seconds as compiled, written as 20 and then 10 and timed on the remote
    - [ ] On the Harmony 700: which of its pair of timers it is, on the bench unit
  - [ ] 6.1.2 RemoteAssistant, the question after an activity starts, on the Harmony 600, 650 and 700
  - [ ] 6.1.3 TiltSensor, waking when picked up, on the Harmony 600, 650 and 700
  - [ ] 6.1.4 The Harmony Touch's eleven, among them screen brightness and screen timeout
  - [ ] 6.1.5 The Harmony One's and the Harmony 525's, which Logitech's service does not list
- [ ] 6.2 Read and change them from FreeHarmony

## 7. The app

After 3 produces something.

- [ ] 7.1 The interface
- [ ] 7.2 Publish `packages/*` so somebody without this checkout can build it (decision 4)

---

## Loose ends, not part of a chapter

- [ ] L1 **A sequence long enough to hang a remote has no refusal in the code.** The only rail on this
      page with nothing behind it: no bound in `packages/codec`, no test, no section. Nothing composed
      here may be written to a remote until it has a number and a refusal
- [ ] L2 Excavate the lab: discovery is done, the reading phase is left, in tag order.
      Method and grid: [lab-excavation.md](docs/lab-excavation.md)
- [ ] L3 `GET_VERSION` field 6 and field 9's accessor, the two fields of twelve with no reading
- [x] L4 A second arch 14 remote: the Harmony 650, arch 14's write target, while the Harmony 600 stayed excluded until L6 (section 281)
- [ ] L5 A black screen on the Harmony 650 after unplugging, once, after the write of a 20 second screen timer, cleared by a battery pull with the configuration intact; not seen after the next write (section 292)
- [ ] L6 The Harmony 600 as a write target, Danny's decision of 29 September 2026, while the everyday Harmony One stays excluded
  - [ ] Record its identity as `h600` with `read-identity.ts --record` and read its whole configuration region into the lab
  - [ ] Write one block back unchanged with `rehearse-block.ts`
  - [ ] A real write with `write-config.ts`, whose cache drop and restart are read on the 600's own 0.2 build (section 282)
- [ ] L7 The Harmony 700 as a write target, the same decision, once it is on the bench
  - [x] Read its identity, its firmware and its configuration, read only; the configuration is also the third case 1.4's `deviceModeMaps` item waits for
  - [x] It arrived stuck in safe mode with one page of its application erased, and was repaired by making it reinstall its own staged copy, `reinstall-firmware.ts` (section 295)
  - [x] Taken from firmware 2.5 to 2.8 by staging Logitech's image and letting it install itself, decision 18 (section 297)
  - [ ] Read the cache drop and the restart in its build, 2.8 since section 297 and the reference image, whose drop sets a second flag the 0.2 builds do not and half of which is unread (sections 282 and 283), and only then add 2.8 to `write-config.ts`
  - [ ] Read the 2.8 application's status byte routine, `0x1AB96`, before staging on it from application mode again (section 297)
  - [x] Record its identity as `h700` and read its whole configuration region
  - [ ] Write one block back unchanged with `rehearse-block.ts`
  - [ ] A real write with `write-config.ts`

---

## Done, at chapter granularity

- [x] Read a configuration: 100% of every sample's bytes attributed
- [x] The container codec in TypeScript, proven equal to the Python reader field for field
- [x] The USB command protocol, both directions, and the write rails
- [x] Change a field in place, and change a section's length
- [x] Write to a remote: one block unchanged, a field changed and reverted, a device added, a delay
      raised, and the whole eight step sequence sent (arch 12, sections 222 to 251)
- [x] Write to a second architecture: one block unchanged on the Harmony 525 (section 269)
- [x] Write to a third architecture: one block unchanged on the Harmony 650 (section 281)
- [x] Infrared: 681 protocol families in the rhythm table, and blocks byte identical to Logitech's
      own compiler for the same codes
