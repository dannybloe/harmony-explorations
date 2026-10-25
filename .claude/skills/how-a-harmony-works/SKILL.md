---
name: how-a-harmony-works
description: "What a Harmony does from the point of view of somebody holding one: activities, device mode, how each model gets into device mode and back. Read this BEFORE designing or building anything about what a remote does, what an interface offers, or what a config field means for a person. Use when a task touches button mapping, activities, devices, screens, or any question of the form \"what should the interface show here\"."
---

# How a Harmony works, from the outside

**This skill exists because of a mistake, and the mistake is the point of it.** On 22 August 2026 a
device page was built in FreeHarmony that showed a keypad per **activity**, on the strength of a correct
measurement over the corpus (every keypad binding sits in a map an activity installs), while the thing
being designed was the **device mode** editor and nothing here said device mode exists. The file format
answered a product question, and the file format cannot answer one.

## The ritual

1. **Read `reference/how-a-harmony-works.md` before designing anything that touches behaviour**: a
   page, a control, a drawing, or what a config field means for a person. It opens in plain words and
   it is the missing half of every finding here. Its sections: the two things a Harmony can be doing,
   getting into device mode and back, why device mode is not a corner of the product, why a button map
   belongs to a device first, sequences, the screen, favourite channels, held keys, the remotes with no
   screen, and Help.
2. **Then the model's own `reference/remotes/<model>/behaviour.md`** for how that model gets into
   device mode and back and the words it puts on its screen. The words differ per model, so do not
   print one model's wording as the product's vocabulary ("Current Activity" is the Harmony One's), and
   do not put a Devices key on a drawing of a Harmony 600, 650 or 700, which have none.
3. **Then, and only then, what the file says**: `reference/config-format/modes-and-keys.md` for the
   maps, `reference/config-format/activities-and-devices.md` for what an activity is in bytes.

## What it settles for a design, in one line each

The argument for each is on the page above; these are the conclusions a design trips over.

* **Activities and device mode both map the whole keypad.** In device mode every button points at the
  one device chosen, Logitech's own statement in the Harmony One manual.
* **A page about a device shows that one device and mentions no activity**: not which activity uses a
  key, not which other device holds it, not where a change lands. Two devices holding the same key is
  not a conflict. Getting this backwards cost three attempts in FreeHarmony.
* **A device page reads the device's own map, which the file states**, base slot 9's middle layer, the
  device's own screen record. It never reconstructs one from what the activities agree on: that
  reconstruction is wrong on 136 of the 1032 pairs where they agree and blind to 568 keys no activity
  binds, `reference/config-format/modes-and-keys.md`. This skill called where a device's map lives
  an open question<!--superseded--> long after section 271 had read it, until `todo-reference.md` 6.2.
* **The buttons other devices hold are the activity editor's constraint**, never the device editor's.
* **The screen is the bigger half of device mode in use**: what people build there is pages of a
  device's rarer commands. Which half is larger in a configuration varies, so neither is the main one.
* **Help belongs to what is running, never to a device**; a device page binds no Help.
* **The Harmony 600, 650 and 700 show no clock**, so their clock is checked by reading memory over USB
  and never by asking anyone to look at the screen. Only the Harmony One shows the time.

The phrasing `every keypad binding belongs to an activity` is dead and on `docs/superseded.md`'s
list<!--superseded-->; do not restate it.

## The rule this skill is really about

**A measurement over the corpus answers "what do these files contain". It never answers "what does
the product do".** Those are different questions with different sources, and the corpus will happily
agree with itself about a feature it has no bytes for. When a design question arrives, the order is:
what does the remote do, then what does the file say about it, then what can we read.

When the product answer is not written down anywhere here, **ask before designing around its
absence.** The person working on this has the remotes on the desk and has used them for years, and one
sentence from them is worth an afternoon of counting.
