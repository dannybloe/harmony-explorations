# Harmony 885: keys

A Harmony 885 has 55 keys and an 880 53. Each key sits at a crossing of the keypad's wiring, and the
firmware turns that crossing into a number, its scan code, which is what a configuration binds a command
to. This page says how the numbers are laid out and which of them a key occupies. Which printed key sits at
which number is not known, because no drawing of this model exists yet.

## Every key on the drawing

<!-- generated:keys -->
No drawing of this model exists yet, so no key is listed here: the row for `harmony-885` in `REMOTES` names none. A drawing added to `packages/silhouettes` fills this block.

Generated from `REMOTES` in `packages/silhouettes/bin/remotes.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The lattice

**The keypad is 4 inputs by 16 lines**, and the firmware computes a key's scan code as
`(line - 1) * 4 + input`, with the input running 1 to 4 and the line 1 to 16, so the codes run 1 to 64.
A line of zero means no key. The same routine is in both application images and both bootloaders, and in
no image of another architecture, so the arithmetic is this architecture's and not to be carried to
another.[^s144]

**Every configuration agrees**: each code any of six configurations binds with a press falls in 1 to 64,
all four inputs are occupied in every one, and nothing binds 64, so line 16 input 4 has no key on either
model. Counted by input, an 885 configuration's press codes split 14, 14, 14 and 13.[^s144b]

## Which positions hold a key

| model | positions | empty scan codes |
|---|---|---|
| Harmony 885 | 55 | 4, 9, 28, 30, 39, 42, 47, 49 and 64 |
| Harmony 880 | 53 | the 885's nine, and 19 and 60 |

**The key table states the hardware, and it matches a survey of both circuit boards exactly**, as sets:
the table after the pointer table lists every scan code the firmware can produce rather than what one
configuration happens to bind, and the 880's two missing codes are exactly the two colour buttons the
survey names as the 885's alone.[^s177] How a person meets the colour keys is in [README.md](README.md).

**A code is a position, not a legend.** The 880 and the 885 already differ over two positions of one
lattice, so the same code on another model of this platform can be a differently printed key.[^s177]

## The keys beside the screen

**Eight keys sit in two columns beside the screen, and their labels in four rows**, at pixel rows 42,
74, 106 and 138 with a line pitch of 14. The left column is 5, 6, 7 and 8 and the right column 45, 46,
48 and 44, top to bottom: one configuration's activity menu names all eight keys of one page, and draws
four of the names at x 3 and four at x 70 to 97.[^s128] Those are the keys the screen speaks for, and on
this architecture they share exactly one scan code with the keypad's bindings, where every other
architecture measured shares none.[^s128]

## Not checked

* Which printed key sits at which scan code: that needs a drawing or a unit.[^unchecked]

[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s144b]: Measured in configurations. [Section 144](../../../docs/findings.md#s144)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^s128]: Measured in configurations. [Section 128](../../../docs/findings.md#s128)
[^unchecked]: Not checked.
