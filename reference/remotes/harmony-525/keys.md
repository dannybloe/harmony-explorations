# Harmony 525: keys

Fifty keys: forty four on the keypad, four soft keys at the corners of the screen and two arrow bars
beside it that page through what the screen lists. Every one of them is a button of one 8 by 8 matrix,
and every one is bound in the configurations measured.[^s89]

The drawing, [`reference/silhouettes/h525.svg`](../../silhouettes/h525.svg), is generated from
`packages/silhouettes/src/models/h525.ts`. Its shapes and contours are a hand trace of Logitech's own
documentation; its words and symbols are read off a photograph, because the document prints text on two
bars that the product does not have, `h525.ts`. The photograph's nameplate reads "Harmony 520", which
`h525.ts` records; the drawing is the 525's, the two faces differing by the four teletext keys
alone.[^x-forum]

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
directly and eight through an external latch, and the scan code is `group * 8 + column`, 1 to 64. A
press raises the code with `0x80` and a release with `0x40`, the same event bits the Harmony 600
uses.[^s89]

**Fifty codes are bound, contiguous from 1 to 57 with no multiple of eight**, in both user configurations
measured and, as a subset of 46, in the safe mode container.[^s89c] The remote has fifty buttons, counted
by hand.[^s89b] So every matrix button is bound and every bound code has a button, which the Harmony 600
cannot say. The drawing's fifty keys, 44 on the keypad and six beside the screen, agree, which a test
holds.[^t-fifty-keys]

**Which physical key sends which code is not known for any key.**[^unchecked] The route that would give
it, a live read of the scan code variable while keys are pressed, does not exist on this architecture,
which answers no data memory read over USB, [usb.md](usb.md).[^s90] A calibration configuration compiled
for the model, the route the later remotes took, cannot be had, since Logitech's service compiles nothing
for it.[^s135] Learning is the other route, since the firmware implements the capture.[^s123]

## The keys beside the screen

* **Four soft keys**, one at each corner of the screen, which select the row beside them: "Select the
  device you wish to control by pressing the side LCD button closest to your selection".[^x-manual]
  Their codes are the set 30, 31, 38 and 39, the codes a screen page binds and no activity
  does;[^s27][^s128] which is which is not known, because nothing establishes which of two columns is the
  left one.[^s89] The drawing gives all four the same four candidates rather than pick, `h525.ts`.
* **Paging is a soft key binding**: the four soft keys carry opcode `0x7E`, enter a mode by index, in both
  user configurations, and the 5xx has no page button.[^unchecked][^x-forum] The two keys the drawing
  calls `ScreenPrev` and `ScreenNext` are the arrow keys "that help you page through items", in a sentence
  of the manual that calls the screen a touch screen;[^x-manual] it is not one, [display.md](display.md).

## Keys with a job of their own

| key | what it does |
|---|---|
| Activities | returns to the Activities screen, and leaves device mode[^x-manual] |
| Devices | lists the devices, the way into device mode[^x-manual] |
| Help | starts the on remote help[^x-manual] |
| Glow | lights or turns off the display backlight[^x-manual] |
| Off | turns off the devices of the current activity.[^x-manual] The document prints `Off` under it and the product prints nothing, `h525.ts` |
| Off, held while the batteries go in | **enters safe mode, which destroys the application on this model**: a repair shop's published procedure,[^x-safe-mode] followed on a unit,[^s118] [firmware.md](firmware.md) |
| the four colour keys | teletext by default in the Watch TV activity, customisable elsewhere.[^x-manual] The product marks them with a coloured dot, `h525.ts` |

**The status light**: the manual calls it "the green ring shaped LED that surrounds the Activities
button",[^x-manual] and `h525.ts` describes the bezel around that key as glowing blue on the product.
Both are recorded and neither is settled.[^unchecked]

## Holding a key

No long press, by Logitech's service.[^t-long-press] Whether and how a held key repeats on this
architecture is not checked; the repeat mechanism was read on the Harmony One.[^s127]

## Not checked

* Every key's scan code, and which soft key is which of 30, 31, 38 and 39.[^unchecked]
* Held keys and repeat.[^unchecked]
* The colour of the status light.[^unchecked]

[^s89]: Read in the firmware. [Section 89](../../../docs/findings.md#s89)
[^x-forum]: Stated by a third party. [The forum comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s89c]: Measured in configurations. [Section 89](../../../docs/findings.md#s89)
[^s89b]: Measured on a unit. [Section 89](../../../docs/findings.md#s89)
[^t-fifty-keys]: Measured on a unit. [The test](../../../tests/test_silhouettes.py)
[^unchecked]: Not checked.
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s135]: Stated by Logitech, by their service. [Section 135](../../../docs/findings.md#s135)
[^s123]: Read in the firmware. [Section 123](../../../docs/findings.md#s123)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^s27]: Measured in configurations. [Section 27](../../../docs/findings.md#s27)
[^s128]: Measured in configurations. [Section 128](../../../docs/findings.md#s128)
[^x-safe-mode]: Stated by a third party. [A repair shop's safe mode procedure](https://www.harmonyremoterepair.com/files/theme/Documents/Safe_Mode_Instructions.pdf)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^s127]: Read in the firmware. [Section 127](../../../docs/findings.md#s127)
