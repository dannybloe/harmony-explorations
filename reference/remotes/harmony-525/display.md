# Harmony 525: display

A 1.5 inch monochrome screen, 96 pixels wide and 64 tall, with two soft keys on each side of it that
select the row beside them. It shows the activities, the device list, an activity's or a device's
commands, and the on remote help.

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

| | value | standing and source |
|---|---|---|
| size | 1.5 inch diagonal | Logitech's manual, "LCD Size" |
| resolution | 96 x 64 | Logitech's manual, "LCD Resolution"; the configuration states the same, the widest picture drawn at the origin being 96 by 64 in all three arch 9 containers, read from configurations, section 148 |
| colour | monochrome | Logitech's manual, "LCD Screen"; `MODELS_BY_SKIN` |
| touch | **none**, though the manual's button table says the arrow keys "page through items on the touch screen" | Logitech's manual, "The buttons on your Harmony 525"; the soft keys and paging, [keys.md](keys.md) |
| backlight | lit by the Glow key, not by motion | Logitech's manual, "Using the Glow Button" |

## How the configuration draws it

* **A picture is one bit a pixel**, and base slot 17 names the picture bank here as on every
  architecture but the Harmony One's, read in the firmware and configurations, section 62.
* **A glyph is two bits a pixel**, and the font reads as letters, section 63.
* **A monochrome row is padded to a byte**, and screen opcode 22 takes one operand here, section 85;
  opcodes 22 and 23 are a page select and a page transfer, section 101.
* **A picture is placed by opcode 3, a region copy**, destination before source, and the renderer draws
  it since section 148; before that an arch 9 page rendered its text and none of its pictures.

`make render` draws a page of a 525 configuration the lab holds.

## What the screen shows

* **The Activities screen**, "your starting point", reached with the Activities key, Logitech's manual.
* **The device list**, reached with the Devices key; a soft key beside a device selects it, Logitech's
  manual, "Controlling your devices individually".
* **An activity's commands**, for every device the activity uses, Logitech's manual, "What's on the
  Harmony 525 screen".
* **The on remote help**, questions answered Yes or No with the soft keys, Logitech's manual, "Using the
  Help button".

## Status screens

* **A configuration that fails validation raises status code 26, "Configuration Corrupted", and code 0,
  "Go to Website to update settings", when the other container failed too.** That chooses by which
  container failed, where the Harmony One and the Harmony 600, 650 and 700 choose by which check failed,
  read in the firmware, section 253.
* **Nothing latches**: there is no polled re-check and no armed flag on this model, so the screen the
  Harmony One holds until a power cycle cannot arise here. The remote re-validates when something asks
  it to, read in the firmware, section 253, and a configuration can ask, one instruction in its action
  list, section 254. No configuration in the corpus does.
* **A remote in safe mode may show a blank or white screen and give no message**, third party, the repair
  shop's sheet quoted in section 118.
* **After a firmware reinstall the screen reports the upgrade complete**, in the unit's configured
  language, and the message stays until the batteries come out, seen at the bench, section 119.

## Not checked

* Whether the screen shows a clock. The firmware keeps one in its first state variables, section 284,
  and nothing reads it off a running 525 here, section 137.
* The display controller, and the backlight's colour.
