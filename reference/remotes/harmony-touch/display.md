# Harmony Touch: display

A touch screen in the upper half of the face, which shows the activities, the favourite channels as
pictures, a device's commands, an on screen number pad, the settings and help. Nothing here has read a
picture or a screen description off this model, so this page is the manual's and the drawing's.

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

| | value | standing and source |
|---|---|---|
| kind | "LCD touch screen. View, launch, and edit activities and favorites, use the on-screen number pad, change settings, and get help" | Logitech's manual, the "Know your product" legend |
| raster | 240 by 320, the size of every one of the fifty screen captures in the user guide. **The vendor's picture of the display, not a measurement** | `touch.ts` |
| backlight | brightness and screen timeout are remote settings, both noted as costing battery | Logitech's manual, "Remote Settings"; Logitech's service names a `ScreenTimeout` setting for a Touch, section 292 |
| background | chosen from a set of background images on the remote | Logitech's manual, "Remote Settings" |

## Gestures

**Five gestures**: swipe up, down, left and right, and tap, each bound to a command per activity and
editable on the remote. Gesture mode is entered from an activity's command screen, Logitech's manual,
"Gesture Control". Swiping also moves between activities on the home screen and scrolls the favourites,
Logitech's manual.

## What the screen shows

* **The activities**, under Home, swiped left and right, started with a tap, Logitech's manual, "Using your
  Activities".
* **The favourite channels**, under Favorites, as pictures, up to 50, editable and reorderable on the
  remote, Logitech's manual.
* **A device's commands**, from the device list, Logitech's manual, "Using Devices"; [behaviour.md](behaviour.md).
* **Settings**, at the far right of the home screen, Logitech's manual, "Settings".
* **A charging notification** while in the dock or on a computer, and a battery icon that turns red when
  low, Logitech's manual.

## The clock

The remote keeps the time: "your computer's time will automatically be set to your Harmony Touch every time
you sync your remote. Here, you can change the time and/or switch between 12-24 hour mode", Logitech's
manual, "Remote Settings". Where on the screen it appears is **not checked**, and nobody has recorded
looking.

## Not checked

* The raster from the firmware or a configuration, neither of which this project can read on this model.
* Whether the panel is colour in the sense `models.ts` records, since the model has no record there.
