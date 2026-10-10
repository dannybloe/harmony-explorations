# Harmony 525: keys

The drawing, [`reference/silhouettes/h525.svg`](../../silhouettes/h525.svg), is generated from
`packages/silhouettes/src/models/h525.ts`. Its shapes and contours are a hand trace of Logitech's own
documentation; its words and symbols are read off a photograph, because the document prints text on two
bars that the product does not have, `h525.ts`. The photograph's nameplate reads "Harmony 520", which
`h525.ts` and `reference/capabilities.md` both record; the drawing is the 525's.

![The Harmony 525's face](../../silhouettes/h525.svg)

## Every key on the drawing

<!-- generated:keys -->
50 keys on the drawing `h525`, 44 on the keypad and 6 that the screen speaks for. 0 carry a measured scan code and 4 are left between two candidates by the drawing.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Activities` | keypad | printed | not measured |  | Activities |
| `AllOff` | keypad | printed | not measured |  |  |
| `Blue` | keypad | printed | not measured |  |  |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Devices` | keypad | printed | not measured |  | Devices |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  | Fwd |
| `Glow` | keypad | printed | not measured |  | Glow |
| `Green` | keypad | printed | not measured |  |  |
| `Guide` | keypad | printed | not measured |  | Guide |
| `Hash` | keypad | printed | not measured |  | #, enter |
| `Help` | keypad | printed | not measured |  | Help |
| `Info` | keypad | printed | not measured |  | Info |
| `Menu` | keypad | printed | not measured |  | Menu |
| `Number0` | keypad | printed | not measured |  | 0 |
| `Number1` | keypad | printed | not measured |  | 1 |
| `Number2` | keypad | printed | not measured |  | 2, abc |
| `Number3` | keypad | printed | not measured |  | 3, def |
| `Number4` | keypad | printed | not measured |  | 4, ghi |
| `Number5` | keypad | printed | not measured |  | 5, jkl |
| `Number6` | keypad | printed | not measured |  | 6, mno |
| `Number7` | keypad | printed | not measured |  | 7, pqrs |
| `Number8` | keypad | printed | not measured |  | 8, tuv |
| `Number9` | keypad | printed | not measured |  | 9, wxyz |
| `Pause` | keypad | printed | not measured |  | Pause |
| `Play` | keypad | printed | not measured |  | Play |
| `PrevChannel` | keypad | printed | not measured |  | Prev |
| `Record` | keypad | printed | not measured |  | Rec |
| `Red` | keypad | printed | not measured |  |  |
| `Rewind` | keypad | printed | not measured |  | Rew |
| `Select` | keypad | printed | not measured |  | OK |
| `SkipBack` | keypad | printed | not measured |  | Replay |
| `SkipForward` | keypad | printed | not measured |  | Skip |
| `Star` | keypad | printed | not measured |  | *, clear |
| `Stop` | keypad | printed | not measured |  | Stop |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  | Mute |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `Yellow` | keypad | printed | not measured |  |  |
| `ScreenNext` | screen | printed | not measured |  |  |
| `ScreenPrev` | screen | printed | not measured |  |  |
| `SoftLowerLeft` | screen | printed | one of 30 or 31 or 38 or 39 | 3 |  |
| `SoftLowerRight` | screen | printed | one of 30 or 31 or 38 or 39 | 4 |  |
| `SoftUpperLeft` | screen | printed | one of 30 or 31 or 38 or 39 | 1 |  |
| `SoftUpperRight` | screen | printed | one of 30 or 31 or 38 or 39 | 2 |  |

Generated from `packages/silhouettes/src/models/h525.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Fifty keys, and every one is bound

**The keypad is an 8 by 8 matrix scanned over one sense line**, `PORTB` bit 7, eight lines driven
directly and eight through an external latch, and the scan code is `group * 8 + column`, 1 to 64, read in
the firmware, section 89. A press raises the code with `0x80` and a release with `0x40`, the same event
bits the Harmony 600 uses, section 89.

**Fifty codes are bound, contiguous from 1 to 57 with no multiple of eight**, in both user configurations
and, as a subset of 46, in the safe mode container, read from configurations, section 89. The remote was
then counted by hand and has fifty buttons, measured on a unit, section 89. So every matrix button is
bound and every bound code has a button, which the Harmony 600 cannot say. The drawing's fifty keys, 44
on the keypad and six beside the screen, agree, `reference/capabilities.md`.

**Which physical key sends which code is not known for any key.** The route that would give it, a live
read of the scan code variable while keys are pressed, does not exist on this architecture, which answers
no data memory read over USB, section 90; [usb.md](usb.md). `reference/button-maps.md` has no arch 9
table, because the calibration configurations were compiled for other models, `h525.ts`. Learning is the
other route, section 123, and has not been tried.

## The keys beside the screen

* **Four soft keys**, one at each corner of the screen, which select the row beside them: "Select the
  device you wish to control by pressing the side LCD button closest to your selection", Logitech's manual.
  Their codes are the set 30, 31, 38 and 39, without knowing which is which, because nothing establishes
  which of two columns is the left one, read in the firmware, section 89; the drawing gives all four the
  same four candidates rather than pick, `h525.ts`.
* **Paging is a soft key binding**: the four soft keys carry opcode `0x7E`, enter a mode by index, 57 and
  18 times across the two user configurations, and the 5xx has no page button, read from configurations,
  `reference/capabilities.md`. The two keys the drawing calls `ScreenPrev` and `ScreenNext` are the arrow
  keys "that help you page through items", Logitech's manual, which calls the screen a touch screen in
  that sentence; it is not one, [display.md](display.md).

## Keys with a job of their own

| key | what it does | standing and source |
|---|---|---|
| Activities | returns to the Activities screen, and leaves device mode | Logitech's manual; `docs/how-a-harmony-works.md` |
| Devices | lists the devices, the way into device mode | Logitech's manual; `docs/how-a-harmony-works.md` |
| Help | starts the on remote help | Logitech's manual |
| Glow | lights or turns off the display backlight | Logitech's manual |
| Off | turns off the devices of the current activity | Logitech's manual. The document prints `Off` under it and the product prints nothing, `h525.ts` |
| Off, held while the batteries go in | **enters safe mode, which destroys the application on this model**. A repair shop's published procedure, followed on a unit | third party, then measured, section 118; [firmware.md](firmware.md) |
| the four colour keys | teletext by default in the Watch TV activity, customisable elsewhere. The product marks them with a coloured dot | Logitech's manual, "Using the Coloured Buttons (Teletext)"; `h525.ts` |

**The status light**: the manual calls it "the green ring shaped LED that surrounds the Activities button",
and `h525.ts` describes the bezel around that key as glowing blue on the product. Both are recorded and
neither is settled.

## Holding a key

No long press, Logitech's service, `reference/capabilities.md`. Whether and how a held key repeats on
this architecture is **not checked**; the repeat mechanism of section 127 was read on the Harmony One.

## Not checked

* Every key's scan code, and which soft key is which of 30, 31, 38 and 39.
* Held keys and repeat.
* The colour of the status light.
