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

Device mode is not a corner of the product. It is how anybody reaches a command that is not on their
activity's map, which is most commands most of the time: you are watching television, you want an
obscure picture setting, you press Devices, pick the TV, press the button, and go back.

**How you get in and out is per model, and the words differ.** A Harmony 525 has a Devices key and its
own Activities key. A **Harmony 600 has no such key at all**: its screen writes "Devices" above the
centre key of the three below the display, and "Activity" to come back. A Harmony One has both as items
on its touch panel, the second called "Current Activity". On a Harmony 885 you press DEVICE and press it
again to leave. So do not print "Current Activity" as though it were the product's vocabulary, and do
not put a Devices key on a drawing of a 600. `docs/how-a-harmony-works.md` has the table with the
manuals' own wording.

## What follows for the format work

**A button map belongs to a device first.** Logitech's own software authors it per device, which is
what the measurement in `docs/findings.md` section 151 shows from the other side: of 1105 pairs of a
device and a button across the fifteen user configurations, 1096 send the same command in every activity
that binds them, and 47 of 50 devices agree everywhere. An activity's map is that device map plus the
activity's own overrides.

**So an interface about a device shows the device's map**, not one activity's. And a change to a
device's button has to reach every activity that inherited it, or the change is invisible in the very
activity somebody is sitting in.

**But not the activities where another device holds that button**, which is the ordinary case and not an
edge: the Harmony One's receiver in the lab has 35 buttons, eight activities drive it, and **three of the
35 are its own in all eight**. A button that works the television while you are watching television and
the amplifier while you are listening to music is how a Harmony is set up. Write where there is room,
leave the rest, and say which.

**Where device mode's own keypad map lives is open**, and it is named as an open question rather than
guessed at: no keypad map in any configuration here sends a code outside an activity. Do not close
that by inventing a mechanism, and do not restate the closed version of it either, which is the dead
phrasing `every keypad binding belongs to an activity` in `reference/superseded.md`.

## The rule this skill is really about

**A measurement over the corpus answers "what do these files contain". It never answers "what does
the product do".** Those are different questions with different sources, and the corpus will happily
agree with itself about a feature it has no bytes for. When a design question arrives, the order is:
what does the remote do, then what does the file say about it, then what can we read.

When the product answer is not written down anywhere here, **ask Danny before designing around its
absence.** He has the remotes on the desk and has used them for years, and one sentence from him is
worth an afternoon of counting.
