# Harmony 650: features

What the 650 offers a person and what Logitech's software lets them set. Most of this comes from
Logitech rather than from the remote, so the footnotes matter more here than on any other page.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 72 | 8 | 23 | yes | yes | no | no |
| 74 | 8 | 23 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Max devices** and **favourite channel buttons** are Logitech's service, `MaxDevicesPerAccount` and
`MaxFavoriteChannels`[^s136][^t-product-table]. **Long press** is Logitech's service, which declares none
for this model, and the firmware agrees, [keys.md](keys.md)[^s340]. Every other column is a forum's table,
a third party, and its sound and picture keys are not checked there[^unchecked].

## What Logitech's service states

Asked for a skin 72 product through `UserAccountDirector/GetProductCapabilities2`:

| | value |
|---|---|
| product family | Molson, compiler architecture 14[^t-capabilities] |
| max devices | 8[^t-product-table][^t-capabilities] |
| max favourite channels | 23[^t-product-table][^t-capabilities] |
| max activities | not stated[^t-capabilities] |
| display | colour, 2 by 2[^t-capabilities] |
| settings and their defaults | screen lit 20, tilt sensor on, Remote Assistant on[^t-capabilities] |
| capabilities stated | the Harmony 700's list exactly: Activities, FavoriteChannels, RemoteSettings, ColourDisplay, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, LocaleEnabled, DeviceDelay, ActivityMapping, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, SupportsMHAssist, `FavoriteChannelImageScaller` (spelt so by the service), the SmartTV, Apple TV and Roku activities, video calling and the watch app[^t-capabilities] |
| capabilities the Harmony 600 does not state | ColourDisplay and `FavoriteChannelImageScaller`[^t-capabilities] |

## Devices: two vendor figures that disagree

| figure | evidence |
|---|---|
| **8**, Logitech's service, `MaxDevicesPerAccount`, and the classic client's table | [^s136] |
| **5**, Logitech's manual, twice: "set up the Harmony 650 to control up to 5 devices" and "If you have already set up 5 devices (the maximum number of devices for the Harmony 650), the option for adding devices will not be available". Its Product Specification: "Maximum # of devices per account 5" | [^x-manual] |

The manual is the 2010 edition. Two readings fit and nothing here chooses: the limit was raised in a
later software generation, or the two describe different things. **Today's software allows more than
five**: a 650 took a MyHarmony sync of six devices[^s305], and Logitech's service has compiled eight
devices for a 650[^s331]. **Whether the remote enforces any limit at all is not read**; nothing in the
firmware has been read for one[^unchecked]. The Harmony 600 and 700 have run past their manuals' figures
too, [the architecture's README](../../architectures/harmony-600-650-700/README.md#not-checked).

The configuration's own ceiling is separate: at most 128 state variables, and a device costs three plus
its inputs, so the device count binds first on every configuration measured[^s331].

## Activities

| | evidence |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities for the rest | [^x-manual] |
| how many activities a 650 may hold is **not stated**: "The number of activities you can add depends on the devices you have added". Every model with a screen took seven when Logitech's service was asked to copy seven into it, [how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity); whether a 650 was among the models filled is not recorded | [^x-manual]; the 650 [^unchecked] |
| an activity key with no activity opens mode 0, "Use the Harmony setup software to add an Activity on this button", and the centre key under "Exit" returns to the screen before; an activity on no key still starts from the Activities menu | [^s311]; seen on a 650 [^s341] |
| which activity each activity key starts: MyHarmony's "Customize Activity Buttons", one activity per key and no empty choice, so a key is empty only with fewer than three activities | [^s340b], [^s340c] |
| no long press on an activity key, or on any key: the firmware raises press, repeat and release only, [keys.md](keys.md) | [^s340] |
| a pass through device, a switch the picture only passes through: switched on and set to its input by the activity, and bound to no key and no screen item; composed and seen on a 650 | [^s339], [^s339b] |
| the activity menu opens a new page when its last one is full, the page Logitech compiles | [^s316] |
| the activity menu's order is **not the person's to choose** in MyHarmony on this model family, [the architecture's misc.md](../../architectures/harmony-600-650-700/misc.md); none of eight Logitech compiles for one 650 account follows the account's stored order, and the remote shows whatever order the configuration states | [^s351] |
| a configuration with no activity starts and runs; More Activities then shows "add Activities" in Logitech's one compile of that kind | [^s374]; [^s383] |

## Favourite channels

* Under **Favorites** in the Watch TV activity, four to a page, each "the button beside the channel
  number or icon"[^x-manual].
* **23** at most, by Logitech's service, `MaxFavoriteChannels`[^t-product-table]; the forum table gives the
  same figure and the manual gives no number.
* **Kept per device, shown per activity**: MyHarmony saves favourites for a device, and an activity shows
  the favourites of the one device that changes its channels, on a page of their own. A "Favorite
  Channels" button among the activity's commands opens it, and a "Commands" button on it, three
  favourites beside it on its first page, goes back. A device that changes channels in no activity has
  its favourites in no screen and not in the file[^s344][^s344b].
* How each favourite's sending is built on this model is **not read**; it is read on the Harmony One
  only[^unchecked]. The compiled file holds one number sender record per device whose favourites are
  shown[^s344].

## Help and the Remote Assistant

* **Help** asks whether things worked and resends what is needed; **held for 5 seconds** it opens
  advanced help[^x-manual]. What advanced help offers on the 650 is not checked[^unchecked].
* **Help belongs to what is running, not to a device**, on the 650 as on the 600 and 700:
  [how a Harmony works](../../how-a-harmony-works.md#help-belongs-to-what-is-running-never-to-a-device)
  has it whole[^s333].
* **The Remote Assistant** is shown after a sync and when an activity starts, can be turned off for a
  while from its own screen, and is back after the next sync[^x-manual]. MyHarmony offers
  `RemoteAssistant` as a setting for the 650 as for the 600 and 700[^s345][^s292]; switched off, Logitech's
  compile holds no Assistant screens at all, below.

## Sequences

Logitech's software allows up to 25 steps, [how a Harmony works](../../how-a-harmony-works.md#what-a-sequence-is-allowed-to-be-25-steps-and-20-seconds).
A sequence composed in the Harmony One's form runs on the 650, and its pause holds back every device of
the activity[^s342]. **Logitech's own compile of a sequence for the 650 has that form**[^s343]. This said
no compile of the 600, 650 or 700 held one, and that the form was inferred from the Harmony One's,
before those two sections. How deep a sequence may go is bounded by the firmware's forty instruction
action queue, [the action language](../../config-format/actions.md)[^s332].

## Delays

* **Power on delay** per device, 0 to 45 seconds in tenths[^s288].
* **Inter device delay** per device, 0 to 2 seconds in tenths[^s287]. It holds back that device's own
  command, a tenth of a second per unit, in an activity's start and in All Off[^s335]; on a device's own
  command pressed in device mode it does not act by the configuration's reading, which is **not
  checked** on the remote[^unchecked].
* **A delay saved on the remote wins** over the configuration's at start, measured on the Harmony
  600[^s303], [the architecture's memory page](../../architectures/harmony-600-650-700/memory.md#the-settings-store).
  A 650 read as found had **none saved**: its settings store held only setting `0x80`
  records, [memory.md](memory.md)[^s282].
* A changed power on delay is live straight after a write and restart[^s283].

## Settings MyHarmony offers

| setting | evidence |
|---|---|
| `GlowTime`, how long the screen stays lit: the configuration's timer 1, [display.md](display.md). MyHarmony sets it with a slider in its "Remote Backlight Settings" dialog | [^s292b]; the dialog [^s346b]; the slider's range [^unchecked] |
| `TiltSensor`, waking when picked up, set in the same dialog. **On, the compile carries one flag instruction, `3F F101`, in three lists, timer 0's among them, and binds one event to one of those lists; off, it carries neither the instruction, nor that list, nor the binding**, and the timers, the screens and the variables do not change. With it on, tilting the remote lights a dark screen, as a key press does, [hardware.md](hardware.md). What the flag does in the firmware is not read | [^s346b]; [^s346c], [^s347]; [^s346] |
| `RemoteAssistant`, set under Settings in MyHarmony. **Off, Logitech's compiler builds no Assistant at all**: its six screens and the steps leading to them after a start and after All Off are absent, and nothing else changes in count | [^s345]; [^s345b] |
| leave devices on when switching activities, **per device**, in the device's power settings: "I want to keep this device on when switching Activities and only turn it off when I press the Off button". In the configuration it removes that device's switch off from the start of every activity that does not use it; the activities that use it still switch it on and All Off still switches it off. Switching from an activity using the device to one without it sent the device nothing, and All Off switched it off | [^s340b]; [^s340c]; [^s340d] |

**The 650's own list is the first three of these and no others**, `GlowTime` at a default of 20 and the
other two on, as Logitech's service answers for a 650[^t-capabilities] and for the 600 and 700[^s292].
Leaving devices on is set per device, above, and is not one of the three settings.

**The remote's language is chosen apart from those three**, in MyHarmony's "Select Language For Your
Remote" dialog, and reaches the compile as its locale rather than as a setting; what it changes in the
configuration is **not checked**[^unchecked].

## Learning

"IR learning: Yes (Up to 200 KHz)", done through MyHarmony with the old remote, manual page
15[^x-manual]. Learning on a 650 is **not checked**[^unchecked].

## Not checked

* The device limit the remote enforces, if any, beyond the eight Logitech compiles[^unchecked].
* How a favourite's sending is built: read on the Harmony One only[^unchecked].
* Advanced help's screens on this model[^unchecked].
* Long press, beyond Logitech's statement and the firmware's three events[^unchecked].

[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^s340]: Read in the firmware. [Section 340](../../../docs/findings.md#s340)
[^unchecked]: Not checked.
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s305]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
[^s331]: Measured in configurations. [Section 331](../../../docs/findings.md#s331)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s341]: Measured on a unit. [Section 341](../../../docs/findings.md#s341)
[^s340b]: Stated by Logitech, in their client. [Section 340](../../../docs/findings.md#s340)
[^s340c]: Measured in configurations. [Section 340](../../../docs/findings.md#s340)
[^s339]: Measured in configurations. [Section 339](../../../docs/findings.md#s339)
[^s339b]: Measured on a unit. [Section 339](../../../docs/findings.md#s339)
[^s316]: Measured in configurations. [Section 316](../../../docs/findings.md#s316)
[^s351]: Measured in configurations. [Section 351](../../../docs/findings.md#s351)
[^s374]: Measured on a unit. [Section 374](../../../docs/findings.md#s374)
[^s383]: Measured in configurations. [Section 383](../../../docs/findings.md#s383)
[^s344]: Measured in configurations. [Section 344](../../../docs/findings.md#s344)
[^s344b]: Measured on a unit. [Section 344](../../../docs/findings.md#s344)
[^s333]: Measured in configurations. [Section 333](../../../docs/findings.md#s333)
[^s345]: Stated by Logitech, by their service. [Section 345](../../../docs/findings.md#s345)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s342]: Measured on a unit. [Section 342](../../../docs/findings.md#s342)
[^s343]: Measured in configurations. [Section 343](../../../docs/findings.md#s343)
[^s332]: Read in the firmware. [Section 332](../../../docs/findings.md#s332)
[^s288]: Measured in configurations. [Section 288](../../../docs/findings.md#s288)
[^s287]: Measured in configurations. [Section 287](../../../docs/findings.md#s287)
[^s335]: Measured on a unit. [Section 335](../../../docs/findings.md#s335)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s282]: Measured on a unit. [Section 282](../../../docs/findings.md#s282)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s292b]: Measured on a unit. [Section 292](../../../docs/findings.md#s292)
[^s346b]: Stated by Logitech, by their service. [Section 346](../../../docs/findings.md#s346)
[^s346c]: Measured in configurations. [Section 346](../../../docs/findings.md#s346)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s346]: Measured on a unit. [Section 346](../../../docs/findings.md#s346)
[^s345b]: Measured in configurations. [Section 345](../../../docs/findings.md#s345)
[^s340d]: Measured on a unit. [Section 340](../../../docs/findings.md#s340)
