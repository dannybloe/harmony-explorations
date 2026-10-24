# Harmony 890: keys

What a Harmony 890's or 895's keypad is, as far as its configurations say. Every key is a number, its
scan code, which is what a configuration binds a command to; which printed key sits at which number is not
known, because no drawing and no unit of this model exist here.

## Every key on the drawing

<!-- generated:keys -->
No drawing of this model exists yet, so no key is listed here: the row for `harmony-890` in `REMOTES` names none. A drawing added to `packages/silhouettes` fills this block.

Generated from `REMOTES` in `packages/silhouettes/bin/remotes.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The key positions

**A Harmony 895's key table holds exactly the Harmony 885's 55 positions**, as sets: the table after the
pointer table lists every scan code the firmware can produce, and its 55 press codes are the ones a survey
of an 885's circuit board found populated, with nothing outside them. So this platform's keypad is the
Harmony 880 and 885's 4 by 16 lattice, [the 885's keys](../harmony-885/keys.md).[^s177]

**A code is a position and not a legend.** The 880 and the 885 already differ over two positions of one
lattice, so the same code on an 895 can be a differently printed key, and per key identity needs this
remote's own labels.[^s177]

**Four further entries carry event type `0x00`**, at scan codes 6, 7, 45 and 46, beside the 55 presses: a
fourth event type beside press, release and repeat, which is not read.[^s177]

## Not checked

* Which printed key sits at which scan code.[^unchecked]
* Whether a Harmony 890's key table is the 895's: the table was compared on the 895.[^unchecked]

[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^unchecked]: Not checked.
