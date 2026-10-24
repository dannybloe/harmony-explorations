# Harmony One: display

A 2.2 inch colour touch screen, 176 pixels wide and 220 tall. It shows activities, devices and their
commands as rows and blocks a finger touches, a page counter, the battery, an infrared indicator and **a
clock**. The two strips beside it turn the page, and the two keys below it are labelled by it. Everything it
shows, apart from one screen, comes out of the configuration and not out of the firmware.

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

| | value |
|---|---|
| size | 2.2 inch diagonal, "LCD Size"[^x-one-manual] |
| resolution | "220 x 176 (QCIF+)"[^x-one-manual]; a full screen picture in a configuration is 176 wide and 220 tall[^s54] |
| colour | "64,000 Color"[^x-one-manual] |
| touch | capacitive, "Touch Screen Technology"[^x-one-manual]. The configuration agrees on its own: base slot 17 is a touch hit map on this platform alone[^s45][^s62] |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first; a raw picture is 5 plus two bytes a pixel[^s54], [the screens reference](../../config-format/screens.md) |

## What a person sees

* **The activity menu**, "My Activities", three rows a page, with "Options" and "Devices" above the two
  keys below the screen[^x-one-manual][^s275][^s293]. Each row is the row picture, the activity's icon and
  its name left aligned; "Options" and "Devices" are drawn before the rows on the first page and after them
  on every later page; a row touched clicks, starts the activity and leaves device mode. The same layout on
  all eighteen English configurations read, holding none to eight activities[^s419].
* **The device list**, three rows a page, reached from "Devices", with "Activities" below it[^x-one-manual][^s275].
  Each row is the row picture, the device's icon and its name left aligned in one to three lines[^s424].
  With no activity running it lists every device in one order; **while an activity runs** it lists the
  devices that activity's start switches on first, in that order, and then the rest in the order of the
  list shown with nothing running[^s402][^s424]. **With no device at all** the list would be one page of
  "Devices" and "Activities" with no row, inferred and not seen[^s429].
* **A page counter** on a list of several pages: "2 pages" at the top and "1/", "2/" on each
  page[^s293]; the arrows beside the screen "illuminate only if there are multiple pages"[^x-one-manual].
  **The configuration decides that, not the firmware**: a screen's entry list switches the pair of lights
  on and its leaving list switches it off, on every screen of several pages in the nineteen compiles
  read[^s400].
* **A device page** shows that device's commands as pads, and labels the two keys below it "Activities", or
  "Current Activity" while an activity runs, and "Devices", in the configuration's language[^s401].
* **An activity shows two screens**: a start up screen, "Keep the remote pointed at your system", titled
  "Starting" and the activity's name, and then a working screen, often with a Remote Assistant screen
  between them[^s279][^s279b]. The working screen shows the activity's commands six to a page, "Devices" on
  the right key below the screen and "Favorites" on the left where the activity has favourite channels; a
  command on it may be a sequence of commands and pauses[^s423].
* **Status icons**: an infrared indicator that "flashes whenever an IR command is being sent" and a battery
  indicator[^x-one-manual]; [the strip along the top](#the-clock-and-the-strip-along-the-top).
* **Options**: the remote's own menu, two pages of rows, "Turn Remote Assistant" On or Off, "Tutorial" and
  "Date and Time", then "Turn Screen Sounds Off" or On and "Screen Sensitivity", the bottom left key reading
  "Activities" or "Current Activity"[^s150][^s411]. Screen sensitivity offers five levels, Very Low to Very
  High, and confirms the one picked. Date and Time walks through pickers: Year, Month, Day, Hour, Minute and
  Time of Day, AM or PM; the Month picker leads to a Day picker of the month's 28, 30 or 31 days. A picker
  is up to six buttons, two to a row, except Year's three full width buttons and Screen Sensitivity's Medium
  alone in the middle row, with "Back" on the bottom left key, and on a screen of several pages its page and
  the count at the top, "1/5 pages"[^s411].
  A slideshow of the owner's pictures is shown while the remote sits in its charging station[^x-one-manual].
* **The Year picker offers the year the configuration was built and the year either side**, on all nineteen
  compiles read. The European compiles' Hour picker counts 24 hours and they have no Time of Day
  picker[^s411].
* **A picker frames one of its buttons** in one colour; which button is framed is the value of one state
  variable, and what that is to a person is not checked on a remote[^s416].
* **The firmware's own screens**: Low Battery says "The battery level is low!" with "OK", USB Connected "USB
  Connected", the update and learning screens "Update Successful", "Upgrade Success", "Update in progress",
  "Learning..." and "Firmware upgrade in progress", and the charging problem screen "Charging problem.",
  "Contact customer support:", "http://supportinfo." and "harmonyremote.com"[^s409]. "USB Connected" is
  what the cable brings up[^s155].
* **Status screens** for a configuration the remote rejects: thirty, each titled "System Message: N", N the
  status code, over one to four lines of Logitech's words for it, such as "Go to Website" and "to update
  settings" for 0 and "Configuration" and "Corrupted" for 26; for 16 the one line "Battery Trickle\Charge",
  backslash and all[^s413]; code 9's says "System Message: 9" over "LCD Module" and "Failed"[^s411]. They are held in a container of their own at external
  `0x002000`[^s244]. A failed validation **latches** the screen until a power cycle on this model and on no
  other read[^s250][^s252][^s253]; [behaviour.md](behaviour.md#after-a-write).
* **The welcome tour** is eleven screens, each a picture, a few lines of text at the left and "Exit" at the
  bottom right: "Welcome!", the arrows, what activities are, "Watch TV", selecting it, the display, another
  activity, the Help button, Help asking questions, the Off button and "It's that easy!". The arrows turn the
  page, and the Activities, Help and Off keys and the touch areas go on where a screen asks for them.
  Options' Tutorial row starts it[^s412].
* **The Remote Assistant at start** is five screens titled "PowerOff:" under "Remote Assistant:": "Welcome to
  your remote.", "Ensure all your devices are off" (twice), "Do you want to hide the Remote Assistant?" and
  "To hide the remote assistant, use the software to update the display settings for your remote.", with "OK"
  or "Yes" and "No" below[^s412]. Starting the remote past it leaves them in the configuration, which holds a
  path back through Options' "Turn Remote Assistant On", not seen on a remote[^s403][^s412].
* **A configuration may leave the tour and the assistant out.** Options then has one page of three rows,
  Date and Time, Screen Sounds and Screen Sensitivity, with no page counter, and the remote starts on its
  ordinary screen; seen on a remote with such a configuration written to it, a form no compile of Logitech's
  holds[^s421]. **The page keys' lights follow the screen's entering list, not its page count**, so a one
  page Options entering as the two page one does shows the page keys lit with nothing to turn to[^s421].
* **Help pressed with nothing on** runs the power off help, every screen titled "PowerOff": "Attemping to fix
  the problem..." (Logitech's spelling) while it sends some devices' power off again, then "Did that fix the
  problem? If not, the remote will ask you questions to help correct the problem.", and on No one question per
  device, "Is the TV off?", whose No sends that device's power off again and asks "Now is the TV off?", until
  Yes. With no device to turn off it shows "Nothing to do"[^s415]. Every question is answered through the
  keys below the screen, "Yes" the left and "No" the right[^s429].
* **Safe mode** lists five images, each with a checksum and a version[^s190]; [firmware.md](firmware.md).

## The clock and the strip along the top

**The One shows the time**: small, the day and the time, `Sun 3:42` after the battery was taken out and put
back[^s242]. The manual: "You can change the date and time that appears on the Harmony One's
screen", from Options[^x-one-manual]. The Harmony 600, 650 and 700 show none,
[the 650's display page](../harmony-650/display.md). Where the time comes from is
[behaviour.md](behaviour.md#the-clock).

**The strip along the top is four screen programs of the configuration's own**[^s414]: the battery gauge, one
of eight pictures by the firmware's gauge, at the top right; a second gauge on a second firmware variable,
read as charging by what it draws and unconfirmed; the sending mark, the infrared indicator; and the clock,
the day, the hour and its colon, and the minutes. On all seventeen compiles of skin 54 the hour is on a
twelve hour clock; on both compiles of the European skin 59 on a twenty four hour clock. The strip draws no
AM or PM[^s414].

## Where a touch lands: the hit map

* **The screen grid** is three 50 pixel blocks at a 54 pixel pitch, one or two per row, never three[^s125][^s125b].
  The panel's touch area reaches below the 220 pixel picture.
* **Base slot 17** holds the screen's touch rectangles: up to eight items and the two side strips per page,
  the page chosen by the mode page's lead byte, and the hit test returns the first rectangle that
  matches[^s45][^s125].
* The geometry is fixed for the model: two remotes' configurations share every hit record and every
  rectangle size[^s125].
* Panel to pixel, vertically: `panel_y = 4356 - (872/54) * pixel_y`[^s125b]; the horizontal half rests on
  one reading. `packages/codec/src/touch.ts` is the executable form.
* **A rectangle follows from what the screen draws** where it is a button or a key: a 50 pixel button
  picture on the grid has a rectangle of its own place and column, and a word drawn below the screen on the
  right half has the right key's rectangle. Rectangles drawn around text or pictures follow no such rule. How
  Logitech numbers the hit pages and their codes is
  [the modes and keys reference](../../config-format/modes-and-keys.md) and the platform's
  [compiler page](../../architectures/harmony-one/compiler.md)[^s417].

## Which screens the firmware shows by itself

**One.** The 3.4 firmware takes a screen from the configuration by number only for status code 9, "LCD Module
Failed", after its display test fails at start; every other screen that is shown is shown because the
configuration's own lists enter it[^s408]. The long form, and which screens nothing enters, is
[the platform's firmware page](../../architectures/harmony-one/firmware.md#which-screen-the-34-firmware-draws).
What Logitech's compiler puts on every configuration whatever the setup, 78 screens, is
[the platform's compiler page](../../architectures/harmony-one/compiler.md).

## How the screen is drawn

* **A page is drawn over what the screen held**: the firmware clears the whole screen at start up and on
  three of its own screens, and the routine that draws a page clears nothing before it, so a pixel a page
  leaves undrawn shows the screen before, and every screen has to draw its whole background. Read by its
  direct calls; not seen on a remote[^s425].
* **A screen can be filled with one instruction**: screen instruction 1 fills a rectangle, `x`, `y`, width
  and height and a colour, clipped to the screen, its rows counted to `y` plus the height in eight bits.
  Logitech uses it for the welcome tour's black background and for the frames round a picker's
  button[^s425].
* **The screens' background is black**: one whole screen picture, every pixel black, drawn by 66 to 314
  instructions a compile depending on how many devices and activities it holds, and stored three or four
  times by Logitech's compiles. Of the seven blank screens the timers enter, six show three photographs of
  blurred lights instead, two screens each, and the seventh the charging screen's picture; what the six are
  for is not read[^s422].
* **The gauges leave pixels undrawn**: each gauge picture is 20 by 11, drawn at x 153 and y 4, and every one
  but level 0 of the battery gauge, a grey question mark, leaves its top row and left column undrawn, so what
  shows there is what was behind it; level 3 also leaves its bottom row and most of the right end of its body
  and tip undrawn. On all nineteen compiles[^s414][^s428].

## Letters and pads

* **A letter is a stored picture, copied as it is.** The configuration carries its font sets, each glyph in
  its own colours, and the remote draws text by copying those pixels; it mixes nothing with what lies behind,
  so a smoothed letter is smoothed against one background colour chosen in advance[^s46][^s396].
* **Five faces**, at 11, 14 and 16 pixels and at 15 in two weights, each set in its own ink, over a shadow of
  its own on all but one; the button labels carry a dark shadow one pixel down and right[^s396].
* **How many font sets**: Logitech's compiles carry 16 to 18. The font select instruction takes its index as
  one byte and nothing in its handler bounds it[^s399], and a set past the eighteenth draws: a configuration
  carrying 31 showed its screens in sets 21 to 28 on a remote[^s399b].
* **Which sets an English compile of skin 54 holds**: sixteen on every one, in the same faces and colours, of
  which three only the welcome tour draws, and two more the setup brings; the sixteen sit in eight orders
  relative to each other over sixteen compiles. The first 60 glyph codes are numbered in one order on all
  sixteen, and not on the two English compiles of the European skin 59[^s427].
* **A pad** is a box 81 pixels wide and 50 tall at one of six places, two per row[^s394]. On a device page a
  label's lines sit 20 pixels into the pad, or at 15 and 26, or 9, 20 and 31, in a 14 pixel set, which leaves
  a one line label's capitals 2 pixels below the middle; activity screens place them alike[^s399c].
* **Logitech's pad colours**: a device page's pads are orange brown gradients averaging `#ae6a37`, an
  activity's a blue one averaging `#2b98ba`[^s399c].
* **The colour keys**: two configurations draw a glossy circle over the pad labelled Red, Green, Yellow or
  Blue on one activity page; everywhere else the word sits on the ordinary pad[^s399c].
* **An activity's working screen draws its title in the activity menu's title font**, not a device
  page's[^s399c].
* **A start up screen's title is one line**, "Starting" and the activity's name, joined by a blank of the
  title font's own rather than the space, a pixel wider than the space[^s406]. A text is stored once and every
  later copy of the same codes points at it, on this model as on the 600 family[^s406].

## Not checked

* The panel part and the touch controller[^unchecked].
* The horizontal scale of the panel to pixel transform[^unchecked].
* Whether the date on screen, not only the time, matches the configuration's stamp[^unchecked].
* What the slideshow and the infrared indicator look like on a remote[^unchecked].
* Whether the One runs a configuration that leaves out the screens nothing enters[^unchecked].

[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^s54]: Measured in configurations. [Section 54](../../../docs/findings.md#s54)
[^s45]: Read in the firmware. [Section 45](../../../docs/findings.md#s45)
[^s62]: Measured in configurations. [Section 62](../../../docs/findings.md#s62)
[^s275]: Measured in configurations. [Section 275](../../../docs/findings.md#s275)
[^s293]: Measured in configurations. [Section 293](../../../docs/findings.md#s293)
[^s419]: Measured in configurations. [Section 419](../../../docs/findings.md#s419)
[^s424]: Measured in configurations. [Section 424](../../../docs/findings.md#s424)
[^s402]: Measured in configurations. [Section 402](../../../docs/findings.md#s402)
[^s429]: Measured in configurations. [Section 429](../../../docs/findings.md#s429)
[^s400]: Measured in configurations. [Section 400](../../../docs/findings.md#s400)
[^s401]: Measured in configurations. [Section 401](../../../docs/findings.md#s401)
[^s279]: Measured in configurations. [Section 279](../../../docs/findings.md#s279)
[^s279b]: Measured on a unit. [Section 279](../../../docs/findings.md#s279)
[^s423]: Measured in configurations. [Section 423](../../../docs/findings.md#s423)
[^s150]: Measured in configurations. [Section 150](../../../docs/findings.md#s150)
[^s411]: Measured in configurations. [Section 411](../../../docs/findings.md#s411)
[^s416]: Measured in configurations. [Section 416](../../../docs/findings.md#s416)
[^s409]: Measured in configurations. [Section 409](../../../docs/findings.md#s409)
[^s155]: Measured on a unit. [Section 155](../../../docs/findings.md#s155)
[^s413]: Measured in configurations. [Section 413](../../../docs/findings.md#s413)
[^s244]: Measured in configurations. [Section 244](../../../docs/findings.md#s244)
[^s250]: Read in the firmware. [Section 250](../../../docs/findings.md#s250)
[^s252]: Read in the firmware. [Section 252](../../../docs/findings.md#s252)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s412]: Measured in configurations. [Section 412](../../../docs/findings.md#s412)
[^s403]: Measured in configurations. [Section 403](../../../docs/findings.md#s403)
[^s421]: Measured on a unit. [Section 421](../../../docs/findings.md#s421)
[^s415]: Measured in configurations. [Section 415](../../../docs/findings.md#s415)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s242]: Measured on a unit. [Section 242](../../../docs/findings.md#s242)
[^s414]: Measured in configurations. [Section 414](../../../docs/findings.md#s414)
[^s125]: Measured in configurations. [Section 125](../../../docs/findings.md#s125)
[^s125b]: Measured on a unit. [Section 125](../../../docs/findings.md#s125)
[^s417]: Measured in configurations. [Section 417](../../../docs/findings.md#s417)
[^s408]: Read in the firmware. [Section 408](../../../docs/findings.md#s408)
[^s425]: Read in the firmware. [Section 425](../../../docs/findings.md#s425)
[^s422]: Measured in configurations. [Section 422](../../../docs/findings.md#s422)
[^s428]: Measured in configurations. [Section 428](../../../docs/findings.md#s428)
[^s46]: Read in the firmware. [Section 46](../../../docs/findings.md#s46)
[^s396]: Measured in configurations. [Section 396](../../../docs/findings.md#s396)
[^s399]: Read in the firmware. [Section 399](../../../docs/findings.md#s399)
[^s399b]: Measured on a unit. [Section 399](../../../docs/findings.md#s399)
[^s427]: Measured in configurations. [Section 427](../../../docs/findings.md#s427)
[^s394]: Measured in configurations. [Section 394](../../../docs/findings.md#s394)
[^s399c]: Measured in configurations. [Section 399](../../../docs/findings.md#s399)
[^s406]: Measured in configurations. [Section 406](../../../docs/findings.md#s406)
[^unchecked]: Not checked.
