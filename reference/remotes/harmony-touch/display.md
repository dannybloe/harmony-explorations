# Harmony Touch: display

A touch screen in the upper half of the face, which shows the activities, the favourite channels as
pictures, a device's commands, an on screen number pad, the settings and help[^x-touch-manual]. No picture
or screen description has been read off a remote of this model; what its screens draw and when is read in
its firmware, whose screens are source in the image, and the rest is the manual's. This said the page was
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

* **The activities**, under Home, swiped left and right, started with a tap[^x-touch-manual].
* **The favourite channels**, under Favorites, as pictures, up to 50, editable and reorderable on the
  remote[^x-touch-manual].
* **A device's commands**, from the device list[^x-touch-manual]; [behaviour.md](behaviour.md).
* **Settings**, at the far right of the home screen[^x-touch-manual]: one entry of the menu behind the right
  hand button at the foot of the activity list, beside Help, Devices, Edit and the sleep timer[^t-touch-keys].

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
