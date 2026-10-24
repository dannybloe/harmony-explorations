# Harmony 700: features

What the 700 offers a person and what Logitech's software lets them set: how many devices, the activity
keys, favourite channels, help, delays and the remote's own settings. Most of this comes from Logitech
rather than from the remote, so the evidence matters more here than in any other file.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 66 | 8 | 23 | yes | yes | no | no |
| 69 | 8 | 23 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Max devices** and **favourite channel buttons** are Logitech's service, `MaxDevicesPerAccount` and
`MaxFavoriteChannels`[^t-product-table], the device counts adopted from it[^s136]; **long press** is
Logitech's service too, which declares none for this model[^t-long-press]. The other three columns are a
forum table's[^x-forum].

## What Logitech's service states

Logitech's service, asked for the capabilities of a skin 66 product through
`UserAccountDirector/GetProductCapabilities2`, states what follows[^t-capabilities].

| | value |
|---|---|
| product family | Molson, compiler architecture 14 |
| max devices | 8 |
| max favourite channels | 23 |
| max activities | not stated |
| display | colour, 2 by 2 |
| settings and defaults | screen lit 20, tilt sensor on, Remote Assistant on |
| capabilities stated | the Harmony 650's list exactly: Activities, FavoriteChannels, RemoteSettings, ColourDisplay, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, LocaleEnabled, DeviceDelay, ActivityMapping, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, SupportsMHAssist, the SmartTV, Apple TV and Roku activities, video calling and the watch app, and `FavoriteChannelImageScaller`, spelt so by the service |

## Devices: Logitech's figures, and what the remote runs

| figure | evidence |
|---|---|
| **8**: Logitech's service, `MaxDevicesPerAccount`, and the classic client's table; what `models.ts` holds | [^t-product-table], [^s136] |
| **8**: the manual's 2010 edition, "you can set up the Harmony 700 to control up to 8 devices" and "If you have already set up 8 devices (the maximum number of devices for the Harmony 700), the option for adding devices will not be available" | [^x-manual-2010] |
| **6**: the manual's 2009 edition in English, "configure the Harmony 700 to control up to 6 devices", page 4, and its Product Specification, "Maximum number of devices per account 6" | [^x-manual] |

So **the two vendor figures are two editions**: the 2009 manual says 6, and Logitech's own 2010 manual
agrees with the service on 8. This said the figures disagreed as an open question<!--superseded--> until
the 2010 edition was read. The Harmony 650 has the same kind of disagreement, 5 against 8.

**A configuration holding six devices bounds the maximum below and forbids no seventh**: this table once
held 6 for the 700 on that ground, which was withdrawn as the worked example of a circular claim[^s136].
**The remote does not hold to six**: a configuration of seven devices ran on a 700, the seventh switched on,
set three times and switched off by the activities that use it, measured with an infrared
receiver[^s386]. Whether it takes an eighth, and whether anything on the remote counts devices at all, is
not checked[^unchecked].

## Activities

| | evidence |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities | [^x-manual] |
| how many activities a 700 may hold: **not stated** by the service or the manual | [^unchecked] |
| an activity key with no activity enters mode 4, the "add an Activity" placeholder | [^s314] |

## Favourite channels

* Set up in Logitech's software and shown on the Watch TV activity's screen, manual page 9[^x-manual].
* **23**, Logitech's service, `MaxFavoriteChannels`[^t-product-table].
* How a favourite is built on the 700 is not read[^unchecked]; the Harmony 650's is read[^s344].

## Help and delays

* Help, and advanced help after holding it for five seconds, where the **Inter-Device Delay** is changed on
  the remote: the same text as the 600's manual, pages 8 and 21[^x-manual].
* The **power on delay** in the configuration is in force straight after a write: raised from 60 tenths to
  90 and put back on a 700, and **both heard** with an infrared receiver[^s301].
* A delay saved on the remote would win over the configuration's at start, as measured on the Harmony
  600[^s303]; [the architecture's memory page](../../architectures/harmony-600-650-700/memory.md) has the
  settings store. On Logitech's 700 configurations every delay variable, 10 of 10, is saved and has a
  restore list, as on the 600, but the restore hangs off list 2, whose shape is the 600's list 1, while the
  700's list 1 is another list[^s303b]. Which list the 2.8 build runs at start, and its restore path, are
  not read[^unchecked].

## Settings

| setting | evidence |
|---|---|
| how long the screen stays lit, "Glow Timing"; Logitech's service gives a default of 20 | [^x-manual], [^t-capabilities] |
| tilt sensor: the remote "senses when you pick it up"; Logitech's service gives it on by default | [^x-manual], [^t-capabilities] |
| Remote Assistant, on by default by Logitech's service[^t-capabilities]. On every Logitech compile for the 700 the Assistant's "Turn off Assistant" key writes a variable to 1, and leaving "USB Connected" restores the running activity's keys only while that variable is 0; none with the Assistant off has been read | [^s382] |
| leave devices on when switching activities: Logitech's service states `LeaveDevicesPoweredOn`; how it compiles is read on the Harmony 650 | [^t-capabilities], [^s340] |

## Learning

"IR Learning Yes (Up to 200 Khz)", through the "Learn IR" feature of Logitech's software, in the manual and
its Product Specification[^x-manual]. Learning on a 700 is not checked[^unchecked].

## Not checked

* The device limit the remote or today's software actually enforces, past the seven a 700 ran[^s386].
* How many activities a 700 holds[^unchecked].
* How favourites and sequences are built on the 700's own compiles[^unchecked].

[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-forum]: Stated by a third party. [The forum comparison table](https://harmony-remote-forum.de/harmony_compare.php)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^x-manual-2010]: Stated by Logitech, in the manual. [The 2010 edition, in English](https://cdn-cx-images.dynamite.myharmony.com/usermanuals/harmony700-usermanual-en.pdf)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual, the 2009 edition](https://www.manualslib.com/manual/96454/Logitech-Harmony-700.html)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^unchecked]: Not checked.
[^s314]: Measured in configurations. [Section 314](../../../docs/findings.md#s314)
[^s344]: Measured in configurations. [Section 344](../../../docs/findings.md#s344)
[^s301]: Measured on a unit. [Section 301](../../../docs/findings.md#s301)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s303b]: Measured in configurations. [Section 303](../../../docs/findings.md#s303)
[^s382]: Measured in configurations. [Section 382](../../../docs/findings.md#s382)
[^s340]: Measured in configurations. [Section 340](../../../docs/findings.md#s340)
