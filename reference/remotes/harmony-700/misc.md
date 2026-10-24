# Harmony 700: miscellaneous

**The rule for this file**: a note goes here only when it fits none of the other nine files. If the same
kind of note would appear in the `misc.md` of several models, it deserves a file of its own in every
model folder instead, and `reference/README.md` and the generator's test get updated with it.

## Two configurations of one 700, and their timestamps

Two configurations of one Harmony 700, published by their owner with one documented change between them,
979184 and 979242 bytes, are a controlled pair[^s16]. **Their build timestamps order them the opposite way
round from the owner's stated direction of the change**, and that is unresolved, so a timestamp is not used
to order two configurations of the same remote[^s21].

## The software the manual names

The 700's manual describes Logitech's older desktop software, the **Harmony Remote Software**[^x-manual].
Today's clients for this model are MyHarmony and Harmony Desktop, and how each behaves with a 700 in safe
mode is in [behaviour.md](behaviour.md)[^s295].

## A boot step only the 2026 compiles carry

Logitech's five 700 compiles of 2026 carry one more instruction in the configuration's boot list, `3F F715`
after `3F F632`, which neither 700 compile of 2021 and 2023 carries, nor any Harmony 600 or 650
compile[^s347]. No MyHarmony setting is known to cause it, and whether the firmware version the service
compiles for or the service's own generation decides it is not established[^unchecked].

## Not checked

* Nothing in this file is a claim about the remote beyond the cited sources.

[^s16]: Measured in configurations. [Section 16](../../../docs/findings.md#s16)
[^s21]: Measured in configurations. [Section 21](../../../docs/findings.md#s21)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual, the 2009 edition](https://www.manualslib.com/manual/96454/Logitech-Harmony-700.html)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^unchecked]: Not checked.
