# Harmony 600: features

What the 600 offers a person and what Logitech's software lets them set. Most of this comes from
Logitech, not from the remote, so the standing column matters more here than in any other file. The
starting point is Logitech's own statement, `UserAccountDirector/GetProductCapabilities2` for a skin 71
entry, read 7 October 2026, in `reference/capabilities.md` under "The six bench models".

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 71 | 5 | 23 | yes | yes | no | no |
| 73 | 5 | 23 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing of each column, per `reference/capabilities.md`: **max devices** is Logitech's service,
`MaxDevicesPerAccount`, adopted in section 136; **long press** is Logitech's service,
`ProductsManager/GetAllProducts`, which declares none for this model; every other column is the forum
table's, **third party**. The favourite channel figure is also Logitech's service now, below.

## What Logitech's service states

| | value |
|---|---|
| product family | Molson, compiler architecture 14 |
| max devices | 5 |
| max favourite channels | 23 |
| max activities | not stated |
| display | monochrome, 2 by 2 |
| settings and defaults | screen lit 20, tilt sensor on, Remote Assistant on |
| capabilities stated | Activities, FavoriteChannels, RemoteSettings, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, LocaleEnabled, DeviceDelay, ActivityMapping, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, SupportsMHAssist, the SmartTV, Apple TV and Roku activities |
| capabilities the 650 and 700 state and the 600 does not | ColourDisplay, FavoriteChannelImageScaling |

All of it **Logitech's service**, `reference/capabilities.md`.

## Devices: the vendor figures agree

| figure | standing and source |
|---|---|
| **5** | Logitech's manual: "configure the Harmony 600 to control up to 5 devices", and Product Specification, "Maximum number of devices per account 5" |
| **5** | Logitech's service, `MaxDevicesPerAccount`, and the forum table; what `models.ts` holds |

This is the one model of the three on this architecture where manual and service agree; the 650's manual
says 5 against the service's 8, and the 700's 6 against 8. **Whether the remote itself enforces any
limit is not checked.** The configuration's own ceiling is separate: at most 128 state variables, and the
device count binds first on every configuration measured, section 331.

## Activities

| | standing and source |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities, which "opens a list of all Activities on the remote screen" | Logitech's manual, page 5 |
| how many activities a 600 may hold | **not stated** by the service or the manual. The fill test of seventeen model records found every model with a screen taking seven, `docs/how-a-harmony-works.md`; whether a 600 record was among them is not recorded there, so **not checked** |
| which activity each activity key starts: one entry in a key map that is always installed, scans 5, 1 and 7 | read from Logitech's compiles of this architecture, the 600's among them, section 314 |
| an activity key with no activity opens mode 0, "add an Activity on this button" | read from configurations, section 311 |

## Favourite channels

* Set up in Logitech's software under the Watch TV activity and shown on the remote's screen when Watch
  TV is selected, a side key per channel, with icons, Logitech's manual pages 6 and 9.
* **23**, Logitech's service, `MaxFavoriteChannels`, read 7 October 2026, `reference/capabilities.md`.
  The manual gives no number.
* How a favourite is built on this model is **not read**; the Harmony 650's is section 344.

## Help

* Help resends what an activity needs and asks whether that fixed it; **held for 5 seconds** it opens
  advanced help, where the **Inter-Device Delay** is changed on the remote itself, Logitech's manual
  pages 8 and 22.
* Help belongs to what is running and not to a device, read in Logitech's compiles of this architecture,
  section 333 and `docs/how-a-harmony-works.md`.

## Delays

* The manual names four: **Power On Delay**, **Inter-key Delay** and **Input Delay**, set in Logitech's
  software per device, and **Inter-Device Delay**, set on the remote through advanced help. Logitech's
  manual pages 21 and 22.
* **A delay saved on the remote wins** over the configuration's at every start: the configuration
  copies a saved value from the remote's settings store over its own, read in the 600's 0.2 image and
  measured on a unit, where a power on delay changed in the configuration was not heard because a saved
  one overrode it, section 303. Which action on the remote saves a delay is **not established**.
* A saved delay can be cleared over USB, measured on a unit, section 305; [usb.md](usb.md).

## Sequences

Logitech's service states `SupportActivitySequence` and `ButtonSequences`. A sequence as Logitech
compiles it on this architecture is read on the Harmony 650, section 343; **on a 600 not checked**.

## Settings

| setting | standing and source |
|---|---|
| how long the screen stays lit, "Glow Timing" | Logitech's manual; Logitech's service, default 20 |
| tilt sensor | Logitech's service, default on; the manual: the remote "senses when you pick it up" |
| Remote Assistant | Logitech's service, default on |
| leave devices on when switching activities | Logitech's service states `LeaveDevicesPoweredOn`; how it compiles is read on the Harmony 650, section 340 |

## Learning

"IR Learning Yes (Up to 200 Khz)", through the "Learn IR" feature of Logitech's software, Logitech's
manual page 20 and Product Specification. Learning on a 600 is **not checked**.

## Not checked

* The device limit the remote or today's software actually enforces.
* How many activities a 600 holds.
* How favourites and sequences are built on the 600's own compiles.
* Which action saves a delay on the remote.
