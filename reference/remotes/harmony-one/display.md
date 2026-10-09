# Harmony One: display

A 2.2 inch colour touch screen, 176 pixels wide and 220 tall. It shows activities, devices and their
commands as rows of blocks a finger touches, a page counter, the battery, an infrared indicator and **a
clock**. The two keys beside it page, and the two below it are labelled by it.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 176 by 220 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 176 by 220 | `one.ts`, which must agree with the row above |
| panel | colour | `packages/usb/src/models.ts` |
| touch | yes | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is yes |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | standing and source |
|---|---|---|
| size | 2.2 inch diagonal | Logitech's manual, "LCD Size" |
| resolution | "220 x 176 (QCIF+)"; a full screen picture in a configuration is 176 wide and 220 tall | Logitech's manual; read from configurations, section 54 |
| colour | "64,000 Color" | Logitech's manual; Logitech's service, display "colour, 2 by 3", `reference/capabilities.md` |
| touch | capacitive | Logitech's manual, "Touch Screen Technology". Confirmed independently by the configuration: base slot 17 is a touch hit map on this architecture alone, sections 45 and 62 |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first; a raw picture is 5 plus two bytes a pixel | read from configurations, section 54 and `docs/config-format.md` |

## Where a touch lands: the hit map

* **Base slot 17** holds the screen's touch rectangles: up to eight items and the two side strips per
  page, the page chosen by the mode page's lead byte, and the hit test returns the first rectangle that
  matches, read in the firmware and configurations, sections 45 and 125.
* The geometry is fixed for the model: two units' configurations share every hit record and every
  rectangle size, section 125.
* **The screen grid** is three 50 pixel blocks at a 54 pixel pitch, one or two per row, never three, read
  from configurations and confirmed at the bench, section 125. The panel's touch area reaches below the
  220 pixel picture.
* Panel to pixel, vertically: `panel_y = 4356 - (872/54) * pixel_y`, measured, section 125; the horizontal
  half rests on one reading. `packages/codec/src/touch.ts` is the executable form.

## What the screen shows

* **The activity menu**, "My Activities", three rows a page, with "Options" and "Devices" above the two
  keys below the screen, Logitech's manual and read from configurations, sections 275 and 293.
* **The device list**, three rows a page, reached from "Devices", with "Activities" below it, Logitech's
  manual and section 275.
* **A page counter** in three places on a list of several pages: "2 pages" at the top and "1/", "2/" on
  each page, read from configurations, section 293; the arrows beside the screen "illuminate only if there
  are multiple pages", Logitech's manual.
* **An activity shows two screens**: a start up screen, "Keep the remote pointed at your system", and then
  a working screen, often with a Remote Assistant screen between them, read from 60 activities of thirteen
  configurations and seen on a unit, section 279.
* **Status icons**: an infrared indicator that "flashes whenever an IR command is being sent" and a battery
  indicator, Logitech's manual, "Status icons".
* **Options**: the remote's own menu, with the date and time, screen sounds and a tutorial, Logitech's
  manual and read from configurations, section 150; and a slideshow of the owner's pictures, shown while
  the remote sits in its charging station, Logitech's manual.
* **Status screens** for a configuration the remote rejects: thirty, held in the container at external
  `0x002000`, read from configurations, section 244. A failed validation **latches** the screen until a
  power cycle on this model and on no other read, sections 250, 252 and 253; [behaviour.md](behaviour.md).
* **USB**: "USB Connected" on the cable, seen at the bench, section 155.
* **Safe mode** lists five images, each with a checksum and a version, seen at the bench and matched to
  the images read off the unit, section 190; [firmware.md](firmware.md).

## The clock

**The One shows the time**: small, the day and the time in twelve hour form, `Sun 3:42` after a battery
pull, seen at the bench, section 242. The manual: "You can change the date and time that appears on the
Harmony One's screen", from Options. It is the only bench model whose screen shows one, `CLAUDE.md`. The
clock is the first seven state variables and is seeded from the configuration's stamp,
[behaviour.md](behaviour.md). On the account from the bench, it "runs badly wrong after a while" and has
never been used, section 111.

## Not checked

* The panel part and the touch controller.
* The horizontal scale of the panel to pixel transform.
* Whether the date on screen, not only the time, matches the stamp, sections 242 and 322.
* What the slideshow looks like on this unit, and the infrared indicator.
