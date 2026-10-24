# Harmony One: features

What the One offers a person and what Logitech's software lets them set: up to fifteen devices, activities
started from the screen, device mode, up to 24 favourite channels, sequences, delays, and a remote's own
Options menu. Most of this comes from Logitech, not from the remote, so the footnotes matter more here
than on any other page: they say which statement a remote or a configuration has confirmed.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 54 | 15 | 24 | yes | yes | no | no |
| 59 | 15 | 24 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Max devices** is Logitech's service, its `MaxDevicesPerAccount`[^s136]; **long press** is Logitech's
service, which declares none for this model[^t-long-press]; every other column is a community comparison
table's[^x-forum-table], and sequences are consistent with what the firmware runs[^s34].

## What Logitech's service states

| | value |
|---|---|
| product family | HarmonyOne, compiler architecture 12[^t-capabilities] |
| max devices | 15[^s136] |
| max favourite channels | 24[^t-product-table][^t-capabilities] |
| max activities | not stated[^s145] |
| display | colour, 2 by 3[^t-capabilities] |
| settings and defaults | **none listed**: no `RemoteSettings` capability, so no screen light, tilt or Remote Assistant setting[^t-capabilities] |
| capabilities stated | Activities, FavoriteChannels, ColourDisplay, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, **ActivityReorder**, LocaleEnabled, DeviceDelay, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, `FavoriteChannelImageScaller` (spelt so by the service), the SmartTV, Apple TV and Roku activities, video calling and the watch app[^t-capabilities] |
| capabilities the 600, 650 and 700 state and the One does not | RemoteSettings, ActivityMapping, SupportsMHAssist[^t-capabilities] |

The table is Logitech's service's answer to `UserAccountDirector/GetProductCapabilities2` for a skin 54
product. The service names that product "Harmony One" and displays it as "Harmony One+", in this answer
and in its product list alike[^t-capabilities].
**ActivityReorder** is checked: MyHarmony lets a One owner order the activity menu, and the Harmony 600,
650 and 700 carry no such capability[^s351].

## Devices

**15**, and three vendor sources agree: Logitech's manual, "configure the Harmony One to control up to 15
devices" and "Maximum number of devices per account 15"[^x-one-manual]; Logitech's service[^s136]; the
community table[^x-forum-table]. No configuration read reaches it. Whether the remote itself enforces a limit
is not checked[^unchecked].

## Device mode

"When you press the Device button, the Harmony One's screen displays a list of your devices. Select the
device you wish to control. After you select a device, the Harmony One controls only that device. You
have access to all the commands for the device included in your Harmony One configuration."[^x-one-manual]
The keypad map device mode installs is the device's own screen record, and every such record sends that
device and no other, 62 of 62[^s271]. The way in and out is [behaviour.md](behaviour.md#device-mode-in-and-out);
what device mode is for is [how a Harmony works](../../how-a-harmony-works.md).

## Activities

* Activities are started by touching them on the "My Activities" screen[^x-one-manual].
* How many a One may hold is **not stated** by the service or the manual[^s145][^x-one-manual].
* The activity menu shows three activities a page and opens a page at the fourth; a menu of ten activities
  paged over four pages on a remote[^s293][^s293b].

## Favourite channels

* **24**[^t-product-table][^x-forum-table]; a Favorites button opens them[^x-one-manual].
* **A favourite is not a key binding**: it is a value of a state variable whose lists send through the
  number sender, base slot 16[^s154]. A channel with a leading zero spells its digits out
  instead[^s156]. The format is [the state reference](../../config-format/state.md).

## Sequences

* Logitech's software allows up to 25 steps[^s327]. **A 25 step sequence hung a One for good three times out
  of three** under heavy tapping, the battery coming out each time: the action queue holds forty
  instructions and drops the rest in silence, and that sequence peaks at 35[^s238]. Why the remote hangs is
  not established[^s238].
* A sequence with a five second pause ran in eight seconds[^s327b].

## Delays

* **Power on delay**: the operand of the device's power on transition's `0x7C`, in tenths of a second, up
  to 450[^s235]. It holds back **that device's** next command and nothing else[^s236].
* **The delay between devices** also opens the one block copies a screen command sends, so a command
  touched on the screen goes out that delay later than the same command on a key[^s337];
  [behaviour.md](behaviour.md#screen-commands-click-and-wait-and-a-held-touch-repeats). It opens every
  record a device's power transitions send too, so by the file a device is switched on or off after that
  delay: 8 of 8 catalogue devices on three of Logitech's compiles, at the catalogue's own delay between
  devices of 100, 500 or 1000 ms, six of them 500. Not heard on a remote; whether a device misses a power
  code sent without it is not tested[^s433].

## Sounds and Options

The button sound can be muted[^s74], and the remote's own Options menu offers screen sounds, the date and
time and a tutorial[^s150]; [display.md](display.md#what-a-person-sees). MyHarmony's settings for this model
edit the configuration and nothing on the remote: six of seven per remote settings records in internal flash
are erased on both remotes read[^s150b].

## Learning

"IR Learning Yes (Up to 200 Khz)"[^x-one-manual]. The learn commands are Logitech's desktop client's,
[the command reference](../../usb-protocol/commands.md); learning on a One is not checked[^unchecked].

## Not checked

* The device and activity limits the remote or today's software enforces[^unchecked].
* Why an oversized sequence hangs the remote[^unchecked].
* Learning on a One[^unchecked].

[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-forum-table]: Stated by a third party. [The comparison table](https://harmony-remote-forum.de/harmony_compare.php)
[^s34]: Read in the firmware. [Section 34](../../../docs/findings.md#s34)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s351]: Stated by Logitech, in their client. [Section 351](../../../docs/findings.md#s351)
[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^unchecked]: Not checked.
[^s271]: Measured in configurations. [Section 271](../../../docs/findings.md#s271)
[^s293]: Measured in configurations. [Section 293](../../../docs/findings.md#s293)
[^s293b]: Measured on a unit. [Section 293](../../../docs/findings.md#s293)
[^s154]: Measured in configurations. [Section 154](../../../docs/findings.md#s154)
[^s156]: Read in the firmware. [Section 156](../../../docs/findings.md#s156)
[^s327]: Stated by Logitech, in their client. [Section 327](../../../docs/findings.md#s327)
[^s238]: Measured on a unit. [Section 238](../../../docs/findings.md#s238)
[^s327b]: Measured on a unit. [Section 327](../../../docs/findings.md#s327)
[^s235]: Measured in configurations. [Section 235](../../../docs/findings.md#s235)
[^s236]: Measured on a unit. [Section 236](../../../docs/findings.md#s236)
[^s337]: Measured in configurations. [Section 337](../../../docs/findings.md#s337)
[^s433]: Measured in configurations. [Section 433](../../../docs/findings.md#s433)
[^s74]: Read in the firmware. [Section 74](../../../docs/findings.md#s74)
[^s150]: Measured in configurations. [Section 150](../../../docs/findings.md#s150)
[^s150b]: Measured on a unit. [Section 150](../../../docs/findings.md#s150)
