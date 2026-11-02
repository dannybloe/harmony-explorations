# Harmony Touch: display

A touch screen in the upper half of the face, which shows the activities, the favourite channels as
pictures, a device's commands, an on screen number pad, the settings and help[^x-touch-manual]. Nothing has
read a picture or a screen description off this model, so this page is the manual's and the drawing's.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | none: no entry for architecture 17 | `SCREEN_SIZES` in `packages/codec/src/render.ts` |
| raster on the drawing | 240 by 320 | `touch.ts`, the size of every screen capture in Logitech's user guide; no configuration of this model has been read |
| panel | no record | `packages/usb/src/models.ts` |
| touch | no record | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is yes |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | evidence |
|---|---|---|
| kind | "LCD touch screen. View, launch, and edit activities and favorites, use the on-screen number pad, change settings, and get help" | [^x-touch-manual], the "Know your product" legend |
| raster | 240 by 320, the size of every one of the fifty screen captures in the user guide. **The vendor's picture of the display, not a measurement** | [^x-touch-manual] |
| backlight | brightness and screen timeout are remote settings, both noted as costing battery; Logitech's service names a `ScreenTimeout` setting for a Touch | [^x-touch-manual], "Remote Settings"; [^s292] |
| backlight, by default | the screen at 85 of 100, the keys at 35, the screen asleep after 10 seconds but never on USB power, when the account gives no value | [^t-touch-favourites-firmware] |
| background | chosen from a set of background images on the remote | [^x-touch-manual], "Remote Settings" |
| backgrounds held | nine built in, each with a small twin for the picker, and the user's own uploaded ones, asked for at every sync; an uploaded one measured 240 by 320 with a 60 by 80 twin | [^t-touch-favourites-firmware][^t-touch-favourites] |
| channel logos | asked for at 54 by 54, and every time in the one sync that carried pictures; a channel added by hand shows its own uploaded picture or none | [^t-touch-favourites-firmware][^t-touch-favourites] |

## Gestures

**Five gestures**: swipe up, down, left and right, and tap, each bound to a command per activity and
editable on the remote. Gesture mode is entered from an activity's command screen[^x-touch-manual]. Swiping
also moves between activities on the home screen and scrolls the favourites[^x-touch-manual].

## What the screen shows

* **The activities**, under Home, swiped left and right, started with a tap[^x-touch-manual].
* **The favourite channels**, under Favorites, as pictures, up to 50, editable and reorderable on the
  remote[^x-touch-manual].
* **A device's commands**, from the device list[^x-touch-manual]; [behaviour.md](behaviour.md).
* **Settings**, at the far right of the home screen[^x-touch-manual].
* **A charging notification** while in the dock or on a computer, and a battery icon that turns red when
  low[^x-touch-manual].

## The clock

The remote keeps the time: "your computer's time will automatically be set to your Harmony Touch every time
you sync your remote. Here, you can change the time and/or switch between 12-24 hour mode"[^x-touch-manual].
**It is shown in the status bar**, in 12 or 24 hour form by the account's `TwelveHourClock` setting, 12
hour when the account gives none[^t-touch-favourites-firmware]. What is settings and pictures on this
screen, field by field, is [favourites-and-settings.md](../../architectures/harmony-touch/favourites-and-settings.md).

## Not checked

* The raster from the firmware or a configuration, neither of which can be read on this model[^unchecked].
* Whether the panel is colour in the sense `models.ts` records, since the model has no record
  there[^unchecked].

[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^unchecked]: Not checked.
