# Plan 003, the anatomy: how an activity is built, and what a composer has to produce

**Status: done.** The anatomy plan 003 produced, kept as its record. Its structures and counts live in
[the reference](../../reference/config-format/activities-and-devices.md) now, which is where a composer reads
them; this moved into `docs/plans/` beside its plan.

**The goal, in one sentence.** Know what an activity consists of well enough to build one, to the
standard `docs/adding-a-device.md` sets for a device: every structure it touches, in the order a
builder has to touch them, each with a check that can fail.

**This is chapter 1.1 of `todo.md`**, and its plan is `docs/plans/003-how-an-activity-is-built.md`.

**The composer exists now, `composeActivity` in `packages/codec/src/compose.ts`**, chapter 1.2, so
this document has a second job: it is what that function's rules are read out of, and a rule stated
here that the code does not follow is a defect in one of the two. The function does steps 1 to 5
below and deliberately not 6 or 7, which are the screen and live in a separate function for the same
reason `composeDeviceScreen` is separate from `composeDevice`.

## What an activity is, before any bytes

An activity is "Watch TV". You press it, several appliances switch on, their inputs get set, and the
keypad is pointed at a mixture of them: volume to the amplifier, channels to the set top box. Read
`reference/how-a-harmony-works.md` before this document, because everything below is the file's answer to a
question that document asks.

The thing to hold on to, because it is what the bytes turn out to say: an activity is **not a list of
commands**. It is a statement of what the room should look like, and the commands come out of the gap
between that and what the remote believes the room looks like now.

## How it was read, and the standard this document is held to

**Written from `one_config_unprogrammed` alone**, the factory configuration of a Harmony One, which
holds exactly one device and exactly one activity. That is one specimen of every structure an activity
needs, in the smallest form that exists.

**Every numbered claim below is a prediction until it is scored.** The plan asks for this shape, the
one `docs/predictions/harmony-350-programmed.md` uses: write it from one specimen, then score it against a
second and a third, and record what it got wrong in the same document. The scoring section at the
bottom says which specimens and what happened.

## The seven structures, and what an activity shares with a device

Both moved to the reference, whole: [the seven structures](../../reference/config-format/activities-and-devices.md#the-seven-structures-in-the-order-a-builder-touches-them)
and [what an activity shares with a device](../../reference/config-format/activities-and-devices.md#what-an-activity-shares-with-a-device-and-must-not-duplicate).

## What this deliberately does not need

* **A new infrared group or any new codes.** The activity drives devices that already exist.
* **Its own screen pages of commands.** Those are device mode's, section 271.
* **A picture or a glyph encoder.** The name reuses the glyphs the container holds.

## Scoring

**Scored on 6 September 2026** against `one_config`, the same architecture with eight activities rather
than one, and `h600_config`, a different architecture with three. Where a prediction failed, the wider
corpus was then consulted to say how badly, which is why some rows below quote more than two specimens.

| | prediction | verdict |
|---|---|---|
| P1 | one value on the activity counter, written from one place | **right**: 8 activities and 8 writers, 3 and 3 |
| P2 | one key map entry per activity, the prefix never moves | **right**: 16 = 7 + 8 + 1 and 9 = 5 + 3 + 1 |
| P3 | three lifecycle handlers on every activity | **right**, and the supporting sentence was false, corrected above |
| P4 | a composer emits no send instruction of its own | **right**: 0 inline sends on both specimens, 424 through a transition across the corpus |
| P5 | some inline sends exist and are not explained | **right**, and they are elsewhere: 1 on arch 9, 4 on arch 8, 0 on both specimens |
| P6 | the delay belongs to the device, the activity inherits it | **incomplete**, see below |
| P7 | one row on **the** activity menu page | **wrong**, see below |
| P8 | the name resolves and needs no new encoder | **right**: 8 of 8 and 3 of 3 |
| P9 | 10 to 29 action lists of its own | **right** across the corpus |

Seven right, one incomplete, one wrong. The two that failed are both places where a single specimen
could not have shown the answer, which is the argument for this document's shape rather than against it.

### P7 was wrong: an activity menu is several pages

The factory configuration has one activity and therefore one menu page, and the prediction took that
for the structure. It is not. The eight activities of `one_config` sit on **three** pages, 3 and 3 and
2; the Harmony 600's three sit on two, 2 and 1; and the nine of an arch 8 container sit on 1 and 8.
**5 of the fifteen user configurations spread their activities over more than one page** and 10 use a
single page, with three the most any of them uses.

*This paragraph said 8 of fifteen spread and 7 did not*<!--superseded-->, which was a guess written
beside three real examples rather than a count, and the test refuted it on its first run.

**So a composer adding an activity may have to add a page**, and that is a screen edit rather than a
tagged list entry: a new page record, its own tagged list, its own screen program, and the navigation
that reaches it. It is the same problem section 239 hit from the other side, where a seventh device
needed a third page on the device list and that was what blocked the goal.

**What decides when a page fills was not read here, and section 275 read it.** This paragraph said
*three pages of 3, 3 and 2 is not a full page followed by a remainder, so the generator is not simply
packing them*, and it was wrong for a reason worth keeping: the page's capacity had never been
measured, so a full page could not be recognised. It is **three** rows on arch 12 (Harmony One),
measured over six activity menu pages of four containers. So 3, 3 and 2 is a full page, a full page
and the remainder, and the generator is packing them after all.

### P6 was incomplete: arch 14 has no delay to inherit

The prediction is right on the architecture it was written from and says nothing about the one it was
scored against. Arch 14 (Harmony 600 and 700) keeps a power on delay in a **state variable** rather
than inline in the action list, section 236, so `powerOnInstructions` is empty there and so is the
reach report. A composer for a Harmony 600 does something different from a composer for a Harmony One,
and this document had no way to know that from its own specimen.

### One caution the predictions did not state at all

**How much of a device's map an activity reuses varies enormously**, and the factory configuration is
at one extreme. Its single activity shares all 24 of its code sending keys with the device's own map.
Across the eight activities of `one_config` the share runs from **35 of 35** down to **4 of 29**. So
"reference what the devices already put there" is right about the corpus as a whole and would leave a
composer badly wrong about an activity like that one, which is mostly its own bindings.

### What this leaves open

* what tag 5 is for, which no specimen answered, until section 313 read it in the firmware: picking
  the activity that is already running
* the 12 inline sends, now located on arch 8 and arch 9 and still unexplained
* which physical keys the four arch 14 activity scan codes are, and why that architecture binds two
* whether Logitech's generator renumbers activities on a full compile, which is what would decide
  between the two readings section 273 leaves standing for its three odd containers
