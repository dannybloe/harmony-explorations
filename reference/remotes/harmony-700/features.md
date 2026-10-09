# Harmony 700: features

What the 700 offers a person and what Logitech's software lets them set. Most of this comes from
Logitech, not from the remote, so the standing column matters more here than in any other file. The
starting point is Logitech's own statement, `UserAccountDirector/GetProductCapabilities2` for a skin 66
entry, read 7 October 2026, in `reference/capabilities.md` under "The six bench models".

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 66 | 8 | 23 | yes | yes | no | no |
| 69 | 8 | 23 | yes | yes | no | no |

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
| max devices | 8 |
| max favourite channels | 23 |
| max activities | not stated |
| display | colour, 2 by 2 |
| settings and defaults | screen lit 20, tilt sensor on, Remote Assistant on |
| capabilities stated | the Harmony 650's list exactly: Activities, FavoriteChannels, RemoteSettings, ColourDisplay, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, LocaleEnabled, DeviceDelay, ActivityMapping, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, SupportsMHAssist, the SmartTV, Apple TV and Roku activities, FavoriteChannelImageScaling |

All of it **Logitech's service**, `reference/capabilities.md`.

## Devices: two vendor figures that disagree

| figure | standing and source |
|---|---|
| **8** | Logitech's service, `MaxDevicesPerAccount`, and the classic client's table, section 136. What `models.ts` holds |
| **6** | **Logitech's manual**: "configure the Harmony 700 to control up to 6 devices", page 4, and Product Specification, "Maximum number of devices per account 6" |

The manual is the 2009 edition, and the same kind of disagreement exists for the Harmony 650, 5 against 8.
**This table once held 6 for the 700 on the strength of a configuration holding six devices**, which
bounds the maximum below and forbids no seventh; that was withdrawn in section 136 and is the worked
example of a circular claim, `reference/capabilities.md`. **Whether the remote itself enforces any limit
is not checked.**

## Activities

| | standing and source |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities | Logitech's manual page 5 |
| how many activities a 700 may hold | **not stated** by the service or the manual. Whether a 700 record was among the seventeen of the fill test in `docs/how-a-harmony-works.md` is not recorded there, so **not checked** |
| an activity key with no activity enters mode 4, the "add an Activity" placeholder | read from Logitech's compiles, section 314 |

## Favourite channels

* Set up in Logitech's software and shown on the Watch TV activity's screen, Logitech's manual page 9.
* **23**, Logitech's service, `MaxFavoriteChannels`, read 7 October 2026, `reference/capabilities.md`.
* How a favourite is built on the 700 is **not read**; the Harmony 650's is section 344.

## Help and delays

* Help, and advanced help after holding it for five seconds, where the **Inter-Device Delay** is changed on
  the remote: Logitech's manual, the same text as the 600's, pages 8 and 21.
* The **power on delay** in the configuration is in force straight after a write: raised from 60 tenths to
  90 and put back on a unit, and **both heard** with an infrared receiver, section 301.
* A delay saved on the remote would win over the configuration's at start, as measured on the Harmony 600,
  section 303; the 700's store held no saved delay, and the 2.8 build's restore path is **not read**,
  section 303's scope.

## Settings

| setting | standing and source |
|---|---|
| how long the screen stays lit, "Glow Timing" | Logitech's manual page 10; Logitech's service, default 20 |
| tilt sensor | Logitech's service, default on; the manual: the remote "senses when you pick it up" |
| Remote Assistant | Logitech's service, default on |
| leave devices on when switching activities | Logitech's service states `LeaveDevicesPoweredOn`; how it compiles is read on the Harmony 650, section 340 |

## Learning

"IR Learning Yes (Up to 200 Khz)", through the "Learn IR" feature of Logitech's software, Logitech's
manual and Product Specification. Learning on a 700 is **not checked**.

## Not checked

* The device limit the remote or today's software actually enforces.
* How many activities a 700 holds.
* How favourites and sequences are built on the 700's own compiles.
