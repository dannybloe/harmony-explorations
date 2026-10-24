# Harmony One: miscellaneous

**The rule for this file**: a note goes here only when it fits none of the other files of this folder.

## One platform, one model

Logitech's client puts one model on architecture 12, the Harmony One under its two skins, 54 and its
European twin 59, and calls the platform **Gin**[^s81][^s131]. So this folder and the model's folder,
[harmony-one](../../remotes/harmony-one/README.md), describe the same remotes. The line between them is the
one every other architecture draws: what follows from the processor, the memory and the firmware is here,
and what a person meets holding the remote, its keys, its screen and its behaviour, is in the model's
folder.

## The configuration is the Harmony 600, 650 and 700's, with two more slots

The container is the same family as the Harmony 600, 650 and 700's, `GSPM` and `PTYY` with the marker
`LWJL`, at format `0x1600` where theirs is `0x1400`[^s7]. Its pointer table is the same table with two
slots inserted, one empty and one holding a section of its own, which makes 22 where theirs has 20, so a section labelled on one transfers to the other by its base slot index[^s115]. Two base slots
are read by this firmware and not by theirs: base slot 17, which here is the touch screen's hit map, and
base slot 2, the log area[^s45][^s47].

## Not checked

* Whether any Harmony One was built on other hardware than the one described here[^unchecked].

[^s81]: Stated by Logitech, in their client. [Section 81](../../../docs/findings.md#s81)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s7]: Measured in configurations. [Section 7](../../../docs/findings.md#s7)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s45]: Read in the firmware. [Section 45](../../../docs/findings.md#s45)
[^s47]: Read in the firmware. [Section 47](../../../docs/findings.md#s47)
[^unchecked]: Not checked.
