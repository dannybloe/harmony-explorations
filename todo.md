# Todo

**The sequence lives here and nowhere else.** Six chapters, coarse on purpose. A chapter gets broken
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
- [x] 1.2 Compose an activity, the counterpart of `composeDevice`: `composeActivity`, four architectures
  - [x] 1.2.1 The screen half on arch 12 (Harmony One): a menu row, its hit rectangle and a drawn name (section 275)
  - [ ] 1.2.2 A fourth activity, which needs a new menu page: a page counter, a pool copy, a page count, and undeadening the two page turn keys (section 275)
  - [ ] 1.2.3 The screen half on arch 14 (Harmony 600), where an activity binds two keys (section 273)
- [ ] 1.3 Write one to the spare Harmony One and watch the television, per docs/plans/004-writing-an-activity.md

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
- [x] 4.3 Turn device information into a compilation that works on a remote
  - [x] 4.3.1 One device, six commands, catalogue to remote, television answered (section 242)
  - [ ] 4.3.2 A full device of ninety commands
  - [ ] 4.3.3 Several devices at once

## 5. Learning codes

Deliberately later. First target is devices that already exist in a catalogue.

- [x] 5.1 Infrared capture over USB, read out of the firmware (section 98)
- [ ] 5.2 A learned code's tail shape
- [ ] 5.3 A learned code's storage class
- [ ] 5.4 The three encoding classes no configuration in the corpus carries

## 6. The app

After 3 produces something.

- [ ] 6.1 The interface
- [ ] 6.2 Publish `packages/*` so somebody without this checkout can build it (decision 4)

---

## Loose ends, not part of a chapter

- [ ] L1 **A sequence long enough to hang a remote has no refusal in the code.** The only rail on this
      page with nothing behind it: no bound in `packages/codec`, no test, no section. Nothing composed
      here may be written to a remote until it has a number and a refusal
- [ ] L2 Excavate the lab: discovery is done, the reading phase is left, in tag order.
      Method and grid: [lab-excavation.md](docs/lab-excavation.md)
- [ ] L3 `GET_VERSION` field 6 and field 9's accessor, the two fields of twelve with no reading
- [ ] L4 A second arch 14 remote, which is what writing to a Harmony 600 waits on

---

## Done, at chapter granularity

- [x] Read a configuration: 100% of every sample's bytes attributed
- [x] The container codec in TypeScript, proven equal to the Python reader field for field
- [x] The USB command protocol, both directions, and the write rails
- [x] Change a field in place, and change a section's length
- [x] Write to a remote: one block unchanged, a field changed and reverted, a device added, a delay
      raised, and the whole eight step sequence sent (arch 12, sections 222 to 251)
- [x] Write to a second architecture: one block unchanged on the Harmony 525 (section 269)
- [x] Infrared: 681 protocol families in the rhythm table, and blocks byte identical to Logitech's
      own compiler for the same codes
