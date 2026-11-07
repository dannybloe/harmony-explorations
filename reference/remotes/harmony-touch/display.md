# Harmony Touch: display

A touch screen in the upper half of the face, which shows the activities, the favourite channels as
pictures, a device's commands, an on screen number pad, the settings and help[^x-touch-manual]. No picture
or screen description has been read off a remote of this model over the cable; what its screens draw and when
is read in its firmware, whose screens are source in the image, what one unit's screen showed after a sync of
this project is marked measured where it stands, and the rest is the manual's. This said the page was
the manual's and the drawing's<!--superseded--> until the firmware was read.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 240 by 320 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, read in the firmware, since no configuration of this model has been read: the screens' own constants, the kernel's panel entry, the drawing library and the touch driver, `tests/test_harmony_touch_keys.py` |
| raster on the drawing | 240 by 320 | `touch.ts`, which must agree with the row above |
| panel | no record | `packages/usb/src/models.ts` |
| touch | no record | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is yes |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | evidence |
|---|---|---|
| kind | "LCD touch screen. View, launch, and edit activities and favorites, use the on-screen number pad, change settings, and get help" | [^x-touch-manual], the "Know your product" legend |
| raster | **240 by 320**, stated by four programs in the firmware: the screens' own width and height; the kernel's display panel entry `ILl9341_240x320`, which the board code named for the Touch's codename hands to the display controller when it registers it; the drawing library, which scales the touch controller's reports to 240 by 320 whichever sensor is fitted; and the touch driver's handler for one of its two sensor models, which reports a finger's height on the display as 320 less the sensor's. Every one of the fifty screen captures in the user guide is that size too | [^t-touch-keys], [^x-touch-manual] |
| backlight | brightness and screen timeout are remote settings, both noted as costing battery; Logitech's service names a `ScreenTimeout` setting for a Touch | [^x-touch-manual], "Remote Settings"; [^s292] |
| backlight, on the remote | **screen brightness and key brightness, each a slider from 10 to 100**, past 95 a warning that brighter screen and keys drain the battery faster; **screen timeout a slider from 1 to 30 seconds**, beside the screen lock switch. A setting of 100 is the display backlight's step 26 and the key light's step 42, and a lower one is scaled in proportion and rounded down | [^t-touch-keys], [^t-touch-favourites-firmware] |
| backlight, by default | the screen at 85 of 100, the keys at 35, the screen asleep after 10 seconds but never on USB power, when the account gives no value | [^t-touch-favourites-firmware] |
| backlight, from a sync | a delivered settings document sets the screen's and the keys' backlight and the timeout at the sync's end, with no restart; one with the screen at 20 and the timeout at 30 seconds left the screen dimmed and dimming about 30 seconds after a touch off the cable, and the remote's own back restored full brightness and about 10 seconds | [^t-touch-favourites-firmware], [^t-touch-settings-of-ours] |
| background | chosen from a set of background images on the remote | [^x-touch-manual], "Remote Settings" |
| backgrounds held | nine built in, each with a small twin for the picker, and the user's own uploaded ones, asked for at every sync; an uploaded one measured 240 by 320 with a 60 by 80 twin | [^t-touch-favourites-firmware][^t-touch-favourites] |
| channel logos | asked for at 54 by 54, and every time in the one sync that carried pictures; a channel added by hand shows its own uploaded picture or none | [^t-touch-favourites-firmware][^t-touch-favourites] |

## Gestures

**Five gestures**: swipe up, down, left and right, and tap, each bound to a command per activity and
editable on the remote. Gesture mode is entered from an activity's command screen[^x-touch-manual].
**Eleven events reach those five**: each swipe and the tap also held, and the tap doubled, the held forms
being the gesture's long press action and the double tap its double press action; the remote's own
gesture editor sets all eleven, to a command, a sequence or the number pad, and neither of Logitech's
clients has a screen for any of them[^t-touch-beyond-firmware][^t-touch-beyond-client]. This paragraph
used to stop at the manual's five, which are the gesture buttons and not every gesture. Swiping
also moves between activities on the home screen and scrolls the favourites[^x-touch-manual].

**How the gesture pad tells them apart**, read in the firmware[^t-touch-keys]. One recogniser does it,
attached in two places, the gesture pad of an activity's commands and the lock screen; ordinary taps, the
swipe through the activity list and the scroll of the favourites go through other parts of the screens'
library and are not described here[^t-touch-keys].

* **A swipe** counts once the finger has travelled 60 pixels on the gesture pad and 150 on the lock screen,
  and is up, down, left or right by which quarter of the compass its direction falls in.
* **A swipe held** 700 ms after it counted is that swipe's held form.
* **A touch held** 700 ms without moving is a held tap.
* **A second touch within 300 ms of the first press** makes a double tap. A tap released within 300 ms of its
  press is sent 300 ms after the press; one released between 300 and 700 ms is sent by neither timer, as
  read[^t-touch-keys].

Which of the held and double forms a button map can bind is the map's question,
[the platform's activities and buttons](../../architectures/harmony-touch/activities-and-buttons.md).

## What the screen shows

* **The activities**, under Home, swiped left and right, started with a tap[^x-touch-manual]. **Each entry shows
  the activity's name in capitals, broken onto two lines at its first space**: an activity named "Listen to
  Music" reads LISTEN over TO MUSIC, and renamed "Music Test" it read MUSIC over TEST once the renamed list was
  synced to the remote[^t-touch-changed-set]. What happens to a name with no space, or one too wide for the
  entry, is not checked[^unchecked]. **An activity with no picture of its own is drawn with its type's default
  picture, at the place its order gives it**: a Custom activity added by a program, with no `ImageKey`, showed
  last of six on the list with the picture of a custom activity, and its command list, the screen it opens on,
  listed its four entries in the order of their places in the map, each a label with no icon, none of them naming a
  function[^t-touch-activity-of-ours]. The default picture of a type other than Custom is not
  checked[^unchecked].
* **The favourite channels**, under Favorites, as pictures, up to 50, editable and reorderable on the
  remote[^x-touch-manual]. **The tiles follow the user's favourites document**: delivered by a program with a
  channel added first and the rest reversed, the screen showed the six in that order, the added channel's tile
  with its number, 61, and a logo drawn by the program, a 54 by 54 picture at the address of the station's logo, in
  place of the station's own[^t-touch-favourites-of-ours].
* **A device's commands**, from the device list[^x-touch-manual]; [behaviour.md](behaviour.md). **A device whose
  type has no picture of its own is drawn in the device list with the default picture**, and **a screen entry
  that names no function is drawn without an icon**: a projector added by a program, a type the remote holds no
  picture for, showed last in the list with its name and the default picture, and its command screen listed its
  eleven entries in the order of their places in the map, each a label with no icon, none of them naming a
  function[^t-touch-device-of-ours]. Which device types do have a picture of their own is not
  checked[^unchecked].
* **Settings**, at the far right of the home screen[^x-touch-manual]: one entry of the menu behind the right
  hand button at the foot of the activity list, beside Help, Devices, Edit and the sleep timer[^t-touch-keys].
* **The background shows at the foot of every screen, under the screens' dark footer**: a user background of ours,
  dark blue with a bright yellow band across its foot, showed as a band at the foot of every screen, the activity list
  among them; consistent with the picture's design, and nothing else of it was compared[^t-touch-from-nothing].
* **With no activity and no device**, the screens show pages of their own, worded by the firmware and not by any
  configuration, [features](features.md#an-empty-configuration)[^t-touch-empty][^t-touch-empty-screens].
* **The "Powering off" screen's help text runs past its right edge** in English, "Point the remote at your devices
  while th", cut off there, with Logitech's documents and with a set of this project's alike, so it is the firmware's
  layout and no configuration's[^t-touch-from-nothing].

## Charging and the battery

Read in the firmware[^t-touch-keys]:

* **The Charging screen opens when the remote goes into its dock or onto a mains adapter**, closes on a
  tap, and lets the display sleep after 10 seconds. **On the power source named `usb` it does not open**: the
  remote shows its USB screen instead, and the status bar shows the charging symbol. That `usb` is a
  computer's port is inferred from the name.
* **Fully charged** is shown once the charge current falls to 0.3 A or less, and only after the remote went
  into the dock or onto the adapter while running, since only that change marks it as charging.
* **The status bar's battery** is one of three pictures on battery, full from 3.85 V, half from 3.7 V
  and a quarter below, and the charging symbol on `usb`, `cradle` and `wall_adapter`. **All four pictures
  are the same near white and nothing else**, at every level.
* **Below 3.55 V on battery a Low battery screen appears and the remote switches itself off 10 seconds
  later.** That screen's picture is red.

This page said, on the manual's word, that a charging notification appears "while in the dock or on a
computer"<!--superseded--> and that the battery icon "turns red when low"<!--superseded-->. The firmware
shows the Charging screen in the dock and on a mains adapter only, and the status bar's battery picture
does not turn red; the Low battery screen shows a red icon, which the manual's sentence may describe. On
the fifth power source the power controller names, `usb_charge`, the screens' battery check takes the same
branch as `usb`, by a match on the name, and the status bar's table holds no picture for it; what the
status bar then shows is **not checked**[^unchecked].

## The clock

The remote keeps the time: "your computer's time will automatically be set to your Harmony Touch every time
you sync your remote. Here, you can change the time and/or switch between 12-24 hour mode"[^x-touch-manual].
**It is shown in the status bar**, in 12 or 24 hour form by the account's `TwelveHourClock` setting, 12
hour when the account gives none[^t-touch-favourites-firmware]. What is settings and pictures on this
screen, field by field, is [favourites-and-settings.md](../../architectures/harmony-touch/favourites-and-settings.md).

## Not checked

* Which display module a unit has: the kernel's driver knows several of one controller family, and the
  panel entry names the controller and the size only[^unchecked].
* What the native drawing library does with a touch's coordinates between the sensor and the
  screens[^unchecked].
* Whether the panel is colour in the sense `models.ts` records, since the model has no record
  there[^unchecked].

[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^unchecked]: Not checked.
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/test_harmony_touch_keys.py)
[^t-touch-beyond-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
[^t-touch-beyond-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
[^t-touch-changed-set]: Measured on a unit. [The test](../../../packages/usb/test/touch-changed-set-sync.test.ts)
[^t-touch-device-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-device-runs.test.ts)
[^t-touch-activity-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-activity-runs.test.ts)
[^t-touch-favourites-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-favourites-runs.test.ts)
[^t-touch-settings-of-ours]: Measured on a unit. [The test](../../../packages/corpus/test/touch-settings-runs.test.ts)
[^t-touch-from-nothing]: Measured on a unit. [The test](../../../packages/bench/test/touch-from-nothing-runs.test.ts)
[^t-touch-empty]: Measured on a unit. [The test](../../../packages/bench/test/touch-empty-runs.test.ts)
[^t-touch-empty-screens]: Read in the firmware. [The test](../../../tests/test_harmony_touch_empty_screens.py)
