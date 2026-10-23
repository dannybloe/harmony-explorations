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
* **A rectangle follows from what the screen draws** where it is a button or a key: a 50 pixel button picture on
  the grid has a rectangle of its own place and column, its fifty rows raised five pixels, and a word drawn below
  the screen on the right half has the right key's rectangle, both on every page of the nineteen compiles read; a
  rectangle's code is its place on the page, 48 to 53, then 43 and 44, then the side strips' 46 and 47. Rectangles
  drawn around text or pictures follow no such rule: the welcome tour's own, a message screen's body, the start up
  and help screens', 771 of the 2524 before the side strips on the nineteen compiles. Section 417,
  `packages/codec/src/families/touch/hitpages.ts`.
* **Logitech numbers the hit pages by first use**: walking the screens and their pages in order, each new page
  takes the next number, so the first three screens, Low Battery, USB Connected and a blank screen, are touched
  through pages 0, 1 and 2 on every compile read. Section 417.

## What the screen shows

* **The activity menu**, "My Activities", three rows a page, with "Options" and "Devices" above the two
  keys below the screen, Logitech's manual and read from configurations, sections 275 and 293.
* **The activity menu is one layout on every English configuration read**, eighteen, holding none to eight
  activities: each row the row picture, the activity's icon and its name left aligned; "Options" and "Devices" drawn
  before the rows on the first page and after them on every later page (read on menus of three pages, none of two),
  and touched in that order; a row touched
  clicks, selects the activity's key map and leaves device mode. Section 419.
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
* **Options and its screens**: Options is two pages of rows, "Turn Remote Assistant" On or Off, "Tutorial" and
  "Date and Time", then "Turn Screen Sounds Off" or On and "Screen Sensitivity", the bottom left key reading
  "Activities" or "Current Activity". Screen sensitivity offers five levels, Very Low to Very High, and confirms the
  one picked with "Screen sensitivity is set to" the level and "OK". Date and Time walks through pickers: Year,
  Month, Day, Hour, Minute and Time of Day, AM or PM. A picker is up to six buttons, two to a row, except Year's
  three full width buttons and Screen Sensitivity's Medium alone in the middle row, with "Back" on the bottom left
  key, and on a screen of several pages its page and the count at the top, "1/5 pages"; the Month picker leads to a
  Day picker of the month's days, 28, 30 or 31. Read from configurations on the sixteen English compiles of skin 54,
  section 411.
* **The Year picker offers the year the configuration was built and the year either side**, 2025 to 2027 on
  compiles of 2026, on all nineteen compiles read. Where those years hold a leap year the compiles carry a Day
  picker of 29 days and a second Month picker whose February enters it, on all three compiles read that hold one;
  the European compiles' Hour picker counts 24 hours and they have no Time of Day picker. Read from configurations, section 411.
* **A picker frames one of its buttons**: four lines two pixels wide round a cell of six in two columns, or of three full
  width, in one colour, the same bytes on every compile read; which button is framed is the value of one state variable both
  frames are looked up on, and what that is to a person is not checked on a remote. Read from configurations, section 416.
* **The status screen code 9 draws** says "System Message: 9" as its title over "LCD Module" and "Failed"; the seven
  blank screens the timers enter show one picture each and no text. Read from configurations, section 411.
* **The screens' background is black**: one whole screen picture, every pixel black, drawn by 66 to 314 instructions
  a compile depending on how many devices and activities it holds, the firmware and status screens among them, and
  stored three or four times by Logitech's compiles. Of the seven blank screens the timers enter, each drawing one
  picture, six show three photographs of blurred lights instead of the black, two screens each, and the seventh the
  charging screen's picture; what the six are for is not read. Read from configurations on the sixteen English
  compiles of skin 54, section 422.
* **The configuration's thirty status screens** all look like code 9's: "System Message: N" as the title, N the
  status code, over one to four centred lines of Logitech's words for the code, such as "Go to Website" and "to update
  settings" for 0, "Configuration" and "Corrupted" for 26, and for 16 the one line "Battery Trickle\Charge", backslash
  and all. The firmware draws none of them but code 9's as read, section 408. Read from configurations on the sixteen
  English compiles of skin 54 and both European ones, section 413.
* **The welcome tour** is eleven screens, each a picture, a few lines of text at the left and "Exit" at the bottom
  right. A person meets them as "Welcome!", the arrows, what activities are, "Watch TV", selecting it, the display,
  another activity, the Help button, Help asking questions, the Off button and "It's that easy!"; the arrows turn
  the page, and the Activities, Help and Off keys and the touch areas go on where a screen asks for them. Options'
  Tutorial row starts it, read on the sixteen English compiles of skin 54. Read from configurations on those sixteen
  and both European ones, section 412.
* **The Remote Assistant at start** is five screens titled "PowerOff:" under "Remote Assistant:": "Welcome to your
  remote.", "Ensure all your devices are off" (twice, once as the start shows it and once after the welcome), "Do
  you want to hide the Remote Assistant?" and "To hide the remote assistant, use the software to update the display
  settings for your remote.", with "OK" or "Yes" and "No" below. A configuration holds them where its start runs
  the assistant's ladder, every compile read but the everyday One's, section 412; starting the remote past it leaves
  them in the configuration, which holds a path back to them through Options' "Turn Remote Assistant On", not seen
  on a remote, sections 403 and 412. Leaving the tour and these five out of a configuration takes Options down to
  one page without "Tutorial" and "Turn Remote Assistant", a form no compile read holds. Seen on a Harmony
  One with such a configuration written to it, section 421: it started on its ordinary screen with no welcome, no
  "Ensure all your devices are off" and no "Welcome!", and Options showed one page of three rows, Date and Time,
  Screen Sounds and Screen Sensitivity, with no page counter. **The page keys' lights follow the screen's entering
  list, not its page count**: a screen of several pages enters through a list that lights them and a screen of one
  page through one that does not, on every compile read, so a one page Options entering as the two page one does
  shows the page keys lit with nothing to turn to, which the same remote showed until its entering list was made a
  one page screen's, section 421.
* **Help pressed with nothing on** runs the power off help, every screen titled "PowerOff": "Attemping to fix the
  problem..." (Logitech's spelling) while it sends some devices' power off again, then "Did that fix the problem?
  If not, the remote will ask you questions to help correct the problem.", and on No one question per device, "Is
  the TV off?", whose No sends that device's power off again and asks "Now is the TV off?", until Yes; where it was
  sent again, "Did that fix the problem?" comes before the next device. A device name too long for a line breaks at a space or after a hyphen.
  With no device to turn off it shows "Nothing to do". Read from configurations on the sixteen English compiles of
  skin 54 and both European ones, not watched on a remote, section 415.
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
* **Which sets an English compile of skin 54 holds**: sixteen on every one, in the same faces and colours, of which
  three only the welcome tour draws, and two more the setup brings, the start up titles' with an activity and the
  activity page count's where the menu or a working screen has several pages; the sixteen sit in eight orders
  relative to each other over sixteen compiles. The first 60 glyph codes are numbered in one order on all sixteen,
  and not on the two English compiles of the European skin 59. Read from configurations, section 427.
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
* **An activity's two screens are one shape each in English**: the start up screen binds 52 keys, each to a list of
  its own of three empty instructions; the working screen shows the activity's commands six to a page, a short page only
  where a page is the last or the activity's own layout leaves one short, "Devices" on the right key below the screen
  and "Favorites" on the left where the activity has favourite channels, and a command on it may be a sequence of
  commands and pauses, read from configurations, 63 activities of 11 names on fourteen compiles, section 423.

## The clock

**The One shows the time**: small, the day and the time in twelve hour form, `Sun 3:42` after a battery
pull, seen at the bench, section 242. The manual: "You can change the date and time that appears on the
Harmony One's screen", from Options. It is the only bench model whose screen shows one, `CLAUDE.md`. The
clock is the first seven state variables and is seeded from the configuration's stamp,
[behaviour.md](behaviour.md). On the account from the bench, it "runs badly wrong after a while" and has
never been used, section 111.

**The strip along the top is four screen programs of the configuration's own**, read from configurations,
section 414: the battery gauge, eight pictures by the firmware's gauge at the top right; a second gauge on a second
firmware variable, which at 0 draws the gauge, at 3 the full gauge, and at 1 or 2 a picture of its own at level 0 and
otherwise an animation stepped by the second, three frames at levels 1 to 3 and two at 4 to 7, read as charging by
what it draws and unconfirmed; the sending mark, the infrared indicator, one picture or another at the top by the
firmware's sending flag; and the clock at y 18, the day ending at x 138, the hour and its colon ending at x 156 and
the minutes from x 158. On all seventeen compiles of skin 54 the hour is on a twelve hour clock, as the bench saw; on both compiles of the European skin 59 on a twenty four hour clock. The strip draws no AM or PM.

## Not checked

* The panel part and the touch controller.
* The horizontal scale of the panel to pixel transform.
* Whether the date on screen, not only the time, matches the stamp, sections 242 and 322.
* What the slideshow looks like on this unit, and the infrared indicator.
* Whether the One runs a configuration that leaves out the screens nothing enters, section 408.
