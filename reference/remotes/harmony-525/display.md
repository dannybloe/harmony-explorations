# Harmony 525: display

A 1.5 inch monochrome screen, 96 pixels wide and 64 tall, with two soft keys on each side of it that
select the row beside them. It shows the activities, the device list, an activity's or a device's
commands, and the on remote help.[^x-manual]

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 96 by 64 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 96 by 64 | `h525.ts`, which must agree with the row above |
| panel | monochrome | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| size | 1.5 inch diagonal, "LCD Size"[^x-manual] |
| resolution | 96 x 64, "LCD Resolution";[^x-manual] the configurations state the same, the widest picture drawn at the origin being 96 by 64 in all three arch 9 containers[^s148] |
| colour | monochrome, "LCD Screen"[^x-manual] |
| touch | **none**, though the manual's button table says the arrow keys "page through items on the touch screen";[^x-manual] the soft keys and paging are in [keys.md](keys.md) |
| backlight | lit by the Glow key, not by motion, "Using the Glow Button"[^x-manual] |

## What the screen shows

* **The Activities screen**, "your starting point", reached with the Activities key.[^x-manual]
* **The device list**, reached with the Devices key; a soft key beside a device selects it.[^x-manual]
* **An activity's commands**, for every device the activity uses.[^x-manual]
* **The on remote help**, questions answered Yes or No with the soft keys.[^x-manual]

## Status screens

* **A configuration that fails validation raises status code 26, "Configuration Corrupted", and code 0,
  "Go to Website to update settings", when the other container failed too.** That chooses by which
  container failed, where the Harmony One and the Harmony 600, 650 and 700 choose by which check
  failed.[^s253]
* **Nothing latches**: there is no polled re-check and no armed flag on this model, so the screen the
  Harmony One holds until a power cycle cannot arise here. The remote re-validates when something asks it
  to,[^s253] and a configuration can ask, with one instruction in its action list.[^s254] No configuration
  measured does.[^s254b]
* **A remote in safe mode may show a blank or white screen and give no message**, by a repair shop's
  sheet.[^x-safe-mode]
* **After a firmware reinstall the screen reports the upgrade complete**, in the configuration's language,
  and the message stays until the batteries come out.[^s119b]

## How the configuration draws it

The screen language every architecture shares is [the configuration format's
screens](../../config-format/screens.md). On this model:

* **A picture is one bit a pixel**, and base slot 17 names the picture bank here as on every architecture
  but the Harmony One's.[^s62]
* **A glyph is two bits a pixel**, packed as below, and the font reads as letters.[^s63]
* **A monochrome row is padded to a byte**, and screen opcode 22 takes one operand here;[^s85] opcodes 22
  and 23 are a page select and a page transfer, [screens](../../config-format/screens.md#the-screen-language).[^s101]
* **A picture is placed by opcode 3, a region copy**, destination before source.[^s148]

### How a glyph is packed

A font set's header and terminator are the ones every architecture uses, [base slot
7](../../config-format/screens.md#base-slot-7-the-font-table). What differs is inside a glyph, for the
reason the picture bank differs: the panel is monochrome, so a pixel is two bits rather than two
bytes.[^s63]

```
+0x00  u8   width in pixels
       one row per pixel row, until a 0x00 appears in the leader position:
         +0x00  u8   0x20 | n, n being how many bytes of commands the row occupies
         n bytes of commands, each  kind << 4 | (count - 1):
           0x5   count literal pixels, two bits each, big endian, ceil(2 * count / 8) bytes follow
           0x6   a run of count background pixels, no data
           0xA   a run of count ink pixels, no data
```

The leader's byte count and the commands' pixel count are two independent statements of the row's
length and both have to come out exactly. **Pixel value 2 is the paper and 1 is the ink**; no other
value occurs. Which is which is derived from the encoder rather than from the render: a run is maximal,
so 80 of 80 adjacent run pairs alternate the kinds and 50 of 50 literal pixels beside a kind `6` run read
1, and 160 of 160 glyph cells open with a full width kind `6` run.[^s63]

**Unconfirmed for want of a second sample**: the leader's high nibble is `0x20` in all 1730 rows, so
whether it is a tag or part of a longer length field is open, and values 0 and 3 never appear, so
whether the panel has four levels is open too.[^s63]

**Corrected.** This said the one arch 9 config has no inline string codes at all<!--superseded-->, so
the font's check against the text drawn was unavailable here.[^s46] It draws **1435 codes in 179 strings
and selects a font 244 times**, and all 1435 land on a glyph that is not NULL, so the check runs on this
model and passes. The claim was true of the decoder rather than of the configuration: when it was
written the decoder refused an arch 9 glyph at all, and the packing above was read later without anyone
revisiting the sentence.[^s112]

## Not checked

* Whether the screen shows a clock. The firmware keeps one in its first state variables,[^s284] and no
  read of a running 525 reaches it, [behaviour.md](behaviour.md#the-clock).[^unchecked]
* The display controller, and the backlight's colour.[^unchecked]

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^s148]: Measured in configurations. [Section 148](../../../docs/findings.md#s148)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s254]: Read in the firmware. [Section 254](../../../docs/findings.md#s254)
[^s254b]: Measured in configurations. [Section 254](../../../docs/findings.md#s254)
[^x-safe-mode]: Stated by a third party. [A repair shop's safe mode procedure](https://www.harmonyremoterepair.com/files/theme/Documents/Safe_Mode_Instructions.pdf)
[^s119b]: Measured on a unit. [Section 119](../../../docs/findings.md#s119)
[^s62]: Measured in configurations. [Section 62](../../../docs/findings.md#s62)
[^s63]: Measured in configurations. [Section 63](../../../docs/findings.md#s63)
[^s85]: Measured in configurations. [Section 85](../../../docs/findings.md#s85)
[^s101]: Read in the firmware. [Section 101](../../../docs/findings.md#s101)
[^s46]: Measured in configurations. [Section 46](../../../docs/findings.md#s46)
[^s112]: Measured in configurations. [Section 112](../../../docs/findings.md#s112)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^unchecked]: Not checked.
