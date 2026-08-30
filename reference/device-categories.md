# Logitech's own device categories, and the era that had none

What a product offered its users is a fact about that product, so the **names** are here. The drawings
are not and never will be: they are Logitech's artwork, pure expression, in the same class as firmware
and configuration binaries, and several of them are third party logos. They stay in the lab, catalogued
in `reference/lab-register.md`. Section 216.

## The finding that matters to FreeHarmony

**The era this project supports had no category pictures at all.** MyHarmony and the classic 7.x
software, which is what a Harmony One and a Harmony 600 were configured with, listed equipment as
**text**. What their graphics hold is photographs of remotes, setup illustrations and window furniture,
and 1554 distinct images across every era of Logitech's software contain not one category icon from
either.

The only set Logitech ever drew is from the **hub** generation, a later product, and it is a set for a
product with door locks and thermostats in it. So an interface here that wants a picture per category is
designing something Logitech never had, rather than reproducing something it did. That is a free hand
rather than a gap, and it is worth knowing before treating their set as a reference.

## What the hub generation named, 95 icons

Read out of the stylesheet that positions each sprite, so these are the application's own class names
rather than anybody's reading of the pictures. Some rows carry several names because one drawing served
several classes.

| group | count | what it is |
|---|---|---|
| audio video equipment | 26 | the part that maps onto what an infrared remote drives |
| smart home | 36 | lights, locks, thermostats, sensors, plugs, blinds, and the bridges for them |
| alert badge variants | 17 | the same drawing again with a warning marker, not separate categories |
| activity role placeholders | 16 | "not set up yet" states for an activity, not equipment at all |

**More of it describes equipment a Harmony One cannot drive than equipment it can**, which is the
practical point: 36 against 26, before the 33 rows that are not categories in the first place.

The audio video set, in full:

```
avr Music        Computer         dvd              fireTV           fireTVStick
GameConsole      HDMI             heos             keypad           MacPC
nintendoWii      nintendoWiiu     nvidiaShield     PC MediaCenter   ps3
roku roku        sonos sonos      sonyPs4          stb              TV
TV-Hd            TVCam            WindowsPC        xbox             xbox360
xboxone
```

Three things to notice before borrowing this list. It is **brand heavy**: a fifth of it names a specific
product rather than a kind of equipment, which ages badly and is why several of the drawings are
somebody else's trademark. It has **no category for an amplifier that is not an AV receiver**, no
tuner, no cassette or minidisc, and no projector, all of which the infrared database this project reads
carries commands for. And `keypad` is not equipment at all.

So it is a useful sanity check on a category list and a poor basis for one.
