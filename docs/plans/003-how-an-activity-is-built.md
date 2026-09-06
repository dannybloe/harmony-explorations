# Plan 003: how an activity is built

**Status: open.** Written 6 September 2026. This is chapter 1 of `todo.md` worked out.

**The goal it serves**, in Danny's words that day: a configuration this project built itself, holding
one or more devices and one or more activities, written to a Harmony One, working. Its content is
entirely ours, and its **pictures and letter shapes are reused** from a configuration Logitech built.
Drawing our own bitmaps would be good to have one day and is explicitly not now.

---


**The goal, stated the way Danny stated it on 6 September 2026:** a configuration this project built
itself, holding one or more devices and one or more activities, written to a Harmony One, working. Its
content is entirely ours. Its **pictures and letter shapes are reused** from a configuration Logitech
built, and that is a deliberate allowance rather than a gap: drawing our own bitmaps would be good to
have one day and is explicitly not now.

**That goal is not on the milestone list in its own right**, which is why this section exists. M4 is
writing bytes to a remote, M6 is authoring, and building a whole container from a model falls between
them. It is now the thing the sequence is aimed at.

#### Where the work actually stands, measured on 6 September 2026

The distance was misjudged twice in one conversation before it was measured, so the measurement is
recorded here rather than the impression. `make coverage --detail` gives what a reader attributes per
structure and `make emit --detail` gives what the emitter builds from typed fields; the ratio, per
structure, on `one_config`:

| structure | bytes | built from fields |
|---|---|---|
| the picture bank | 1361283 | 0% |
| the glyph sets | 58433 | 1% |
| base slot 11, the screen programs | 32648 | 22% |
| base slot 5, the infrared database | 125238 | 100% |
| base slot 10, the action lists | 39197 | 100% |
| base slot 6, the screen's pages and modes | about 25000 | 100% |
| every remaining table and record | about 5000 | 94 to 100% |

Three readings of that table, and the first two are corrections of things said earlier the same day:

* **The aggregate figure is misleading and must not be quoted as progress.** `make emit` reports 13.6%
  for a Harmony One, and that number is the picture bank: 85% of the file is artwork. Quoted as a
  measure of how much of a configuration we can build, it is wrong by a factor of six.
* **The screen programs' missing 78% is the drawn text, not the program.** The instructions are built
  from fields and the text payload inside them is carried, which is what FreeHarmony's
  `src/shared/writeback.ts` already says of the `carried` verdict. `composeDeviceScreen` spells text
  from the glyph sets a container already holds, so this is nearer than the percentage suggests.
* **So no structure's bytes are fundamentally beyond us.** What is missing is not an encoder.

#### What is missing is knowing what an activity is made of

For a **device** the whole chain exists and has run on hardware: `composeIrGroup`, `composeDevice` and
`composeDeviceScreen` build the infrared group, its records and duration blocks, the action lists, the
state variables and the screen page, and section 242 wrote the result to the spare Harmony One and the
television answered it. `docs/adding-a-device.md` is that chain written down as a checklist.

For an **activity** there is the reading side and nothing else. No composer, no checklist, and two
things this project's own specification marks as not established:

* **What an entry in the activity switching table corresponds to is unread.** `docs/config-format.md`
  records eleven entries against a six device installation and says that devices and activities
  together is the reading the counts support and is not proven. So nothing here can say how many
  entries a configuration of ours should carry.
* **Where device mode's own keypad map comes from is open**, section 151, with three candidate
  readings and no evidence between them. An activity built correctly could still leave the Devices
  button pointing at nothing.

Neither is code to be written. Both are firmware to be read, which is why **no size is given for this
step**: it may be an afternoon or it may go the way of the screen language.

#### Step 1, and it is the next thing: establish how an activity is built

**Read one activity end to end and write down what it consists of**, to the standard
`docs/adding-a-device.md` sets for a device: every structure it touches, in the order a builder has to
touch them, each with a check that can fail.

**Read it on the factory configuration, not on a working one.** `one_config_unprogrammed` holds
exactly one device and one activity, against eight activities in `one_config`, and it carries the
full picture bank and glyph sets. So it is one specimen of every structure an activity needs, in the
smallest form that exists, and it is the same artwork a built configuration would reuse.

What the write up has to answer, at minimum:

* which sections an activity occupies, and which of them it shares with a device
* the keypad map: how a set of button bindings is stated, and how its enter and leave lists are
  reached. Section 151 is the reading, opcode `0x1F` with an operand high byte of `0xFF` is the index,
  tag 1 and tag 2 are enter and leave
* the power on sequence: which action list holds it, and how a device's power on delay relates to it,
  section 234, where a delay holds back one device rather than the sequence
* the screen page and its name, and whether an activity's page differs in kind from a device's
* the state variable an activity sets, and its place among the thirteen the firmware owns
* the two open questions above, answered or restated as open with the evidence that narrows them

**The check that ends this step** is that the document predicts the second specimen. Write it from the
factory configuration, then score it against an activity in `one_config` and one in a Harmony 600
configuration, and record what it got wrong. `docs/predictions-arch16-programmed.md` is the shape:
predictions written down before the measurement, then scored in the same document.

#### The rest of chapter 1, past step 1

The chapter list above is the coarse view; these are the remaining pieces of **chapter 1 and 3**
specifically, named and not scheduled:

* **Compose an activity**, the counterpart of `composeDevice`. Known work once step 1 lands.
* **Lay out a container from nothing**: choose the section table and every address, and place the
  supplied artwork. Nothing does this today. It is mechanical rather than unknown, since the part
  that knows which fields hold addresses needing a restamp is `relocate.ts` and the survey behind it
  is `docs/growing-a-config.md`.
* **The proof on hardware**: write it to the spare Harmony One, choose the activity, and watch the
  television.

**Removing a device or an activity is not on this list, and that is Danny's correction of 6 September
2026.** It was offered as a third piece of work on the reasoning that reaching a configuration
unlike the one on the remote means deleting what is there. That reasoning took the current code's
shape, where every entry point takes an existing container, for a property of the problem. It is not
one: a configuration built from a model never removes anything, because nothing was there. The real
content of that concern is **layout**, which is the second bullet above.

