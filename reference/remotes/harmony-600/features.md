# Harmony 600: features

What the 600 offers a person and what Logitech's software lets them set: five devices, activities on
three dedicated keys and a list, favourite channels on the Watch TV screen, Help, four kinds of delay and
a few remote settings. Most of this comes from Logitech, not from the remote, so the footnotes matter
more here than in any other file: Logitech's manual, Logitech's service, a third party's comparison table,
and where the remote itself was tried, what it did.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 71 | 5 | 23 | yes | yes | no | no |
| 73 | 5 | 23 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Max devices** and **favourite channel buttons** are Logitech's service, `MaxDevicesPerAccount` and
`MaxFavoriteChannels`[^s136][^t-product-table]. **Long press** is Logitech's service too: its product list
declares none for this model[^t-long-press]. The other columns are the forum table's[^x-forum].

## What Logitech's service states

Asked for a skin 71 product through `UserAccountDirector/GetProductCapabilities2`:

| | value |
|---|---|
| product family | Molson, compiler architecture 14[^t-capabilities] |
| max devices | 5[^t-product-table][^t-capabilities] |
| max favourite channels | 23[^t-product-table][^t-capabilities] |
| max activities | not stated[^t-product-table] |
| display | monochrome, 2 by 2[^t-capabilities] |
| settings and their defaults | screen lit 20, tilt sensor on, Remote Assistant on[^s292][^t-capabilities] |
| capabilities stated | Activities, FavoriteChannels, RemoteSettings, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, LocaleEnabled, DeviceDelay, ActivityMapping, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, SupportsMHAssist, the SmartTV, Apple TV and Roku activities, video calling and the watch app[^t-capabilities] |
| capabilities the 650 and 700 state and the 600 does not | ColourDisplay and `FavoriteChannelImageScaller`, spelt so by the service[^t-capabilities] |

The display row is Logitech's word for what the remote shows: a monochrome screen, where the Harmony 650 and
700 state colour.

## Devices

**Five**, and Logitech agrees with itself: the manual says "configure the Harmony 600 to control up to 5
devices" and its Product Specification "Maximum number of devices per account 5"[^x-manual], and the
service's `MaxDevicesPerAccount` is 5[^t-product-table]. This is the one model of the three on this
architecture where manual and service agree; the 650's manual says 5 against the service's 8, and the
700's 6 against 8, [the architecture's README](../../architectures/harmony-600-650-700/README.md#how-the-three-differ).

**The remote does not hold to five.** A configuration of six devices ran on a 600, and the sixth device's
codes were sent from an activity's start, from All Off and from its own device page, which the Devices
screen reached[^s390]. Whether it takes a seventh, and whether anything on the remote counts devices at
all, is not checked[^unchecked]. This project's library keeps refusing a sixth, since five is Logitech's
statement for the model[^s390].

A configuration has a ceiling of its own, at most 128 state variables; the device count binds first on
every configuration measured, and Logitech's two 600 configurations read here hold 66 and 74 state
variables[^s331].

## Activities

| | evidence |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities, which "opens a list of all Activities on the remote screen" | [^x-manual] |
| how many activities a 600 may hold: **not stated** by the service or the manual. Of seventeen models filled with seven activities, every model with a screen took seven, [how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity); whether a 600 was among them is not recorded | [^unchecked] |
| which activity each activity key starts: one entry in a key map that is always installed, scan codes 5, 1 and 7 | [^s314] |
| an activity key with no activity opens mode 0, "add an Activity on this button" | [^s311] |

## Favourite channels

* Set up in Logitech's software under the Watch TV activity and shown on the remote's screen when Watch
  TV is selected, a side key per channel, with icons, manual pages 6 and 9[^x-manual].
* **23** at most, Logitech's service[^t-product-table]. The manual gives no number.
* How a favourite is built on this model is **not read**[^unchecked]; the Harmony 650's is[^s344].

## Help

* Help resends what an activity needs and asks whether that fixed it; **held for 5 seconds** it opens
  advanced help, where the **Inter-Device Delay** is changed on the remote itself, manual pages 8 and
  22[^x-manual].
* Help belongs to what is running and not to a device[^s333],
  [how a Harmony works](../../how-a-harmony-works.md#help-belongs-to-what-is-running-never-to-a-device).

## Delays

* The manual names four: **Power On Delay**, **Inter-key Delay** and **Input Delay**, set in Logitech's
  software per device, and **Inter-Device Delay**, set on the remote through advanced help, manual pages
  21 and 22[^x-manual].
* **A delay saved on the remote wins** over the configuration's at every start: the configuration copies
  a saved value from the remote's settings store over its own. Read in the 600's 0.2 image[^s303], and
  measured on a unit, where a power on delay changed in the configuration was not heard because a saved
  one overrode it[^s303b]. Which action on the remote saves a delay is not established[^unchecked].
* A saved delay can be cleared over USB[^s305], [usb.md](usb.md).
* **The copy is the configuration's, not the firmware's**: a restore list per saved delay, reached from
  list 1, on both of Logitech's 600 configurations, all 8 of 8 delay variables on one and 6 of 6 on the
  other saved and restored[^s303c]. That the firmware runs list 1 at start is inferred, not read[^s303b].
  A configuration without those lists runs its own values even with a delay saved on the remote[^s391].

## Sequences

Logitech's service states `SupportActivitySequence` and `ButtonSequences`[^t-capabilities]. A sequence as
Logitech compiles it on this architecture is read on the Harmony 650[^s343]; on a 600 it is not
checked[^unchecked].

## Settings

| setting | evidence |
|---|---|
| how long the screen stays lit, "Glow Timing"; the service's default is 20 | [^x-manual], [^s292] |
| tilt sensor, default on; the manual: the remote "senses when you pick it up" | [^s292], [^x-manual] |
| Remote Assistant, default on. One of Logitech's 600 compiles has none of the Assistant's screens, branch or variable, which fits its being compiled with the setting off and is not established, since its settings at compile time were not saved | [^s292], [^s333], [^s347] |
| leave devices on when switching activities, `LeaveDevicesPoweredOn`, stated by Logitech's service; how it compiles is read on the Harmony 650 | [^t-capabilities], [^s340] |

## Learning

"IR Learning Yes (Up to 200 Khz)", through the "Learn IR" feature of Logitech's software, manual page 20
and Product Specification[^x-manual]. Learning on a 600 is not checked[^unchecked].

## Not checked

* The device limit the remote or today's software actually enforces, past the six the remote ran[^s390].
* How many activities a 600 holds[^unchecked].
* How favourites and sequences are built on the 600's own compiles[^unchecked].
* Which action saves a delay on the remote[^unchecked].

[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-forum]: Stated by a third party. [The comparison table of harmony-remote-forum.de](https://www.harmony-remote-forum.de/harmony_compare.php)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^s390]: Measured on a unit. [Section 390](../../../docs/findings.md#s390)
[^unchecked]: Not checked.
[^s331]: Measured in configurations. [Section 331](../../../docs/findings.md#s331)
[^s314]: Measured in configurations. [Section 314](../../../docs/findings.md#s314)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s344]: Measured in configurations. [Section 344](../../../docs/findings.md#s344)
[^s333]: Measured in configurations. [Section 333](../../../docs/findings.md#s333)
[^s303]: Read in the firmware. [Section 303](../../../docs/findings.md#s303)
[^s303b]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s305]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
[^s303c]: Measured in configurations. [Section 303](../../../docs/findings.md#s303)
[^s391]: Measured on a unit. [Section 391](../../../docs/findings.md#s391)
[^s343]: Measured in configurations. [Section 343](../../../docs/findings.md#s343)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s340]: Measured in configurations. [Section 340](../../../docs/findings.md#s340)
