# Harmony One: miscellaneous

**The rule for this file**: a note goes here only when it fits none of the other nine files. If the same
kind of note would appear in the `misc.md` of several models, it deserves a file of its own in every
model folder instead, and `reference/README.md` and the generator's test get updated with it.

## Why format work prefers the other architecture

On this model a configuration is memory mapped and its reads are scattered through the firmware; on the
Harmony 600, 650 and 700 every read passes one routine. So the code that consumes a field is read there
first and ported here, `CLAUDE.md` key facts. That is a rule about reading code and not about where data
is: two base slots, the touch hit map and the log area's writer, exist on this architecture alone.

## The software the manual names

The One's manual describes Logitech's older desktop software, the **Harmony Remote Software**, Logitech's
manual. Logitech's Harmony Desktop still programs this model, `reference/logitech/clients.md`.

## Infrared bench runs

`packages/bench/irtests/done/one-spare-activities.json` records what four activities and Off send on a
One, with no prediction attached. It is the only bench run for this model.

## Not checked

* Nothing in this file is a claim about the remote beyond the cited sources.
