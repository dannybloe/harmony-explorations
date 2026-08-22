---
name: how-a-harmony-works
description: What a Harmony does from the point of view of somebody holding one: activities, device mode, how each model gets into device mode and back. Read this BEFORE designing or building anything about what a remote does, what an interface offers, or what a config field means for a person. Use when a task touches button mapping, activities, devices, screens, or any question of the form "what should the interface show here".
---

# How a Harmony works, from the outside

**This skill exists because of a mistake, and the mistake is the point of it.** On 22 August 2026 a
device page was built in FreeHarmony that showed a keypad per **activity**, on the strength of a
measurement over five configuration files: every keypad binding in them sits in an activity's map. The
measurement was correct and the conclusion was wrong, because the thing being designed was the
**device mode** editor and nobody had written down that device mode exists.

Every document in this repository is about bytes, firmware and pointers. Not one of them said what a
Harmony does when you press a button on it. So a design question got answered out of the file format
instead of out of the product, and the file format cannot answer it.

Read `docs/how-a-harmony-works.md` before designing anything that touches behaviour. It is short and
it is the missing half of every finding here.

## The one paragraph, if you read nothing else

A Harmony has **activities** and it has **device mode**, and both map the whole keypad.

An activity is "Watch TV": it switches equipment on, sets inputs, and gives the keypad a map that
spans several devices, so volume goes to the amplifier and channels go to the set top box. Device mode
is what **Devices** gives you: a list of your equipment, and picking one points **every** button at
**that one device**. Logitech's own words, from the Harmony One manual: "After you select a device, the
Harmony One controls only that device."

**Danny's picture of device mode is the one to build from**: it is like reaching for the old remote that
came in the box with that appliance. There is nothing but that appliance on it. So the two maps are
separate things, authored separately, and Logitech's software has a page for each. In an activity any key
may carry any command of any appliance you own; in a device's map there is one appliance, so **two
appliances holding the same key is not a conflict** and a page about a device mentions no activity at all.

**The screen is the bigger half of device mode.** An old remote has far more buttons than a Harmony, so
what people build there is pages on the screen, a screenful of commands at a time, for the functions the
keypad has no room for. Those never belonged on an activity's keypad map, which carries what you use
often. That is why Logitech can say you hardly ever need device mode and be right, and why it matters
anyway: the alternative is walking to the cupboard.

**How you get in and out is per model, and the words differ.** A Harmony 525 has a Devices key and its
own Activities key. A **Harmony 600 has no such key at all**: its screen writes "Devices" above the
centre key of the three below the display, and "Activity" to come back. A Harmony One has both as items
on its touch panel, the second called "Current Activity". On a Harmony 885 you press DEVICE and press it
again to leave. So do not print "Current Activity" as though it were the product's vocabulary, and do
not put a Devices key on a drawing of a 600. `docs/how-a-harmony-works.md` has the table with the
manuals' own wording.

## What follows for the format work

**A button map belongs to a device first**, which is how Logitech's software authors it, and the corpus
shows it from the other side, `docs/findings.md` section 151: of 1105 pairs of a device and a button across
the fifteen user configurations, 1096 send the same command in every activity that binds them, and 47 of 50
devices agree everywhere. So an activity's map reads as the device's map plus that activity's overrides,
which is what lets a device map be **reconstructed** where the file states none.

**That measurement is about the activity maps and says nothing about what a device page shows.** Getting
that backwards is the mistake this skill exists for, and it was made three times running: a keypad per
activity, then a device map annotated with activities, then a save reported per activity. A page about a
device shows one appliance and mentions no activity.

**Where the remote keeps a device's own map is open** and is named as an open question rather than guessed
at: no keypad map in any configuration here sends a code outside an activity. That the keypad **is**
remapped is not in doubt, since Logitech says so. Do not close the storage question by inventing a
mechanism, and do not restate the dead phrasing `every keypad binding belongs to an activity` in
`reference/superseded.md`.

## The rule this skill is really about

**A measurement over the corpus answers "what do these files contain". It never answers "what does
the product do".** Those are different questions with different sources, and the corpus will happily
agree with itself about a feature it has no bytes for. When a design question arrives, the order is:
what does the remote do, then what does the file say about it, then what can we read.

When the product answer is not written down anywhere here, **ask Danny before designing around its
absence.** He has the remotes on the desk and has used them for years, and one sentence from him is
worth an afternoon of counting.
