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
  are multiple pages", Logitech's manual. **The firmware does not decide that, the configuration does**: a
  screen's entry list switches the pair of lights on and its leaving list switches it off, on every screen of
  several pages in the nineteen compiles, section 400.
* **A device page labels the two keys below it** "Activities", or "Current Activity" while an activity runs,
  and "Devices", in the configuration's language, and binds both where its hit page offers them, every device page of Logitech's compiles,
  section 401.
* **An activity shows two screens**: a start up screen, "Keep the remote pointed at your system", and then
  a working screen, often with a Remote Assistant screen between them, read from 60 activities of thirteen
  configurations and seen on a unit, section 279.
* **Devices, pressed while an activity runs, lists every device**, from a list that activity has of its own:
  some devices first, the activity's among them, and then the rest in the order of the list shown with no
  activity running, read from configurations, 64 activities of fifteen, section 402.
* **Status icons**: an infrared indicator that "flashes whenever an IR command is being sent" and a battery
  indicator, Logitech's manual, "Status icons".
* **Options**: the remote's own menu, with the date and time, screen sounds and a tutorial, Logitech's
  manual and read from configurations, section 150; and a slideshow of the owner's pictures, shown while
  the remote sits in its charging station, Logitech's manual.
* **Status screens** for a configuration the remote rejects: thirty, held in the container at external
  `0x002000`, read from configurations, section 244. A failed validation **latches** the screen until a
  power cycle on this model and on no other read, sections 250, 252 and 253; [behaviour.md](behaviour.md).
* **What Logitech emits whatever the setup**: 78 screens, the 40 firmware and status screens, the welcome
  tour, screen sensitivity, the clock's pickers, Options, the Remote Assistant at start and seven blank
  screens, with 36 pictures, the same on sixteen compiles of skin 54, read from configurations, section 405.
  The European skin's clock pickers differ, the everyday One's compile also has another Options menu and no
  Remote Assistant, and a Dutch compile has the same screens in Dutch.
* **Which of those the firmware shows by itself: one.** The 3.4 firmware takes a screen from the configuration by
  number only for status code 9, "LCD Module Failed", after its display test fails at start; "Missing License",
  "Configuration Corrupted" and "Go to Website to update settings" come from the status screens at `0x002000`
  while those verify, "Application Terminated" sits behind a state its main loop never reaches as read, and no
  other status code is raised, so the configuration's other 29 status screens are not shown at all. Every other
  screen that is shown is shown because the configuration's own lists enter it, and seven at the head (two blanks,
  the update, upgrade and learning screens) are entered by nothing, read in the firmware and in nineteen
  configurations, section 408.
* **The ten firmware screens' words and places**: Low Battery says "The battery level is low!", USB Connected
  "USB Connected", the update and learning screens "Update Successful", "Upgrade Success", "Update in
  progress", "Learning..." and "Firmware upgrade in progress", and the charging problem screen four lines,
  "Charging problem.", "Contact customer support:", "http://supportinfo." and "harmonyremote.com"; each line
  centred on the 176 pixel width, and on Low Battery and the charging problem screen "OK" at 124, 201, inside the
  touch area the page binds, code 49, the lower right of the screen. Read from configurations on the eighteen
  English compiles, section 409.
* **USB**: "USB Connected" on the cable, seen at the bench, section 155.
* **Safe mode** lists five images, each with a checksum and a version, seen at the bench and matched to
  the images read off the unit, section 190; [firmware.md](firmware.md).

## Letters and pads

* **A letter is a stored picture, copied as it is.** The configuration carries its font sets, each glyph in
  its own colours, and the remote draws text by copying those pixels; it mixes nothing with what lies behind,
  so a smoothed letter is smoothed against one background colour chosen in advance, read in configurations,
  sections 46 and 396.
* **Five faces**, at 11, 14 and 16 pixels and at 15 in two weights, each set in its own ink, over a shadow of its own on all but one; the
  button labels carry a dark shadow one pixel down and right, read from configurations, section 396.
* **How many font sets**: Logitech's compiles carry 16 to 18. The font select instruction takes its index as
  one byte and nothing in its handler bounds it, read in the 3.4 firmware, section 399; and a set past the
  eighteenth draws: a configuration carrying 31 showed its screens in sets 21 to 28 on the spare One, seen at
  the bench, section 399.
* **A pad** is a box 81 pixels wide and 50 tall at one of six places, two per row, read from configurations,
  section 394. On a device page Logitech puts a label's lines 20 pixels into the pad, or at 15 and 26, or 9,
  20 and 31, in a 14 pixel set, which leaves a one line label's capitals 2 pixels below the middle;
  activity screens place them alike, section 399.
* **Logitech's pad colours**: a device page's pads are orange brown gradients averaging `#ae6a37`, an
  activity's a blue one averaging `#2b98ba`, read from configurations, section 399.
* **The colour keys**: two configurations draw a glossy circle over the pad labelled Red, Green, Yellow or
  Blue on one activity page; everywhere else the word sits on the ordinary pad, section 399.
* **An activity's working screen draws its title in the activity menu's title font**, not a device page's,
  read from configurations, section 399.
* **A start up screen's title is one line**, "Starting" and the activity's name, and Logitech joins the two with
  a blank of its own rather than the space: a glyph only the title's font set holds, a pixel wider than the
  space in Logitech's letters, read from configurations, section 406. A text is stored once and every later
  copy of the same codes points at it, on this model as on the 600 family, section 406.

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
* Whether the One runs a configuration that leaves out the screens nothing enters, section 408.
