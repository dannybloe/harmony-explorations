# Harmony One: features

What the One offers a person and what Logitech's software lets them set. Most of this comes from
Logitech, not from the remote, so the standing column matters more here than in any other file. The
starting point is Logitech's own statement, `UserAccountDirector/GetProductCapabilities2` for a skin 54
entry, read 7 October 2026, in `reference/capabilities.md` under "The six bench models".

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 54 | 15 | 24 | yes | yes | no | no |
| 59 | 15 | 24 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing of each column, per `reference/capabilities.md`: **max devices** is Logitech's service,
`MaxDevicesPerAccount`, adopted in section 136; **long press** is Logitech's service,
`ProductsManager/GetAllProducts`, which declares none for this model; every other column is the forum
table's, **third party**, and sequences are consistent with what the firmware runs, section 34.

## What Logitech's service states

| | value |
|---|---|
| product family | HarmonyOne, compiler architecture 12 |
| max devices | 15 |
| max favourite channels | 24 |
| max activities | not stated |
| display | colour, 2 by 3 |
| settings and defaults | **none listed**: no `RemoteSettings` capability, so no screen light, tilt or Remote Assistant setting |
| capabilities stated | Activities, FavoriteChannels, ColourDisplay, ActivityCompiledRemoteButtonMapping, PartiallySetupActivities, **ActivityReorder**, LocaleEnabled, DeviceDelay, SupportActivitySequence and ButtonSequences, LeaveDevicesPoweredOn, FavoriteChannelImageScaling, the SmartTV, Apple TV and Roku activities |
| capabilities the 600, 650 and 700 state and the One does not | RemoteSettings, ActivityMapping, SupportsMHAssist |

All of it **Logitech's service**, `reference/capabilities.md`. **ActivityReorder** is the One's alone among
the six bench models: MyHarmony lets a One owner order the activity menu, which it does not offer the
600, 650 or 700, section 351.

## Devices

**15**, and three vendor sources agree: Logitech's manual, "configure the Harmony One to control up to 15
devices" and "Maximum number of devices per account 15"; Logitech's service; the forum table. No
configuration read reaches it. **Whether the remote itself enforces a limit is not checked.**

## Device mode

"When you press the Device button, the Harmony One's screen displays a list of your devices. Select the
device you wish to control. After you select a device, the Harmony One controls only that device. You
have access to all the commands for the device included in your Harmony One configuration." Logitech's
manual, "Controlling your devices individually". The keypad map it installs is the device's own screen
record, and every such record sends that device and no other, 62 of 62, section 271. The way in and out,
and the One's own wording, "Current Activity", are in [behaviour.md](behaviour.md).

## Activities

| | standing and source |
|---|---|
| activities are started by touching them on the "My Activities" screen | Logitech's manual, "Selecting an Activity" |
| how many a One may hold | **not stated** by the service or the manual. Every model with a screen took seven in the fill test of `docs/how-a-harmony-works.md`; whether a One record was among the seventeen is not recorded there, so **not checked** |
| the activity menu shows three activities a page and opens a page at the fourth; a composed menu of ten activities paged over four pages on a unit | read from configurations and seen, section 293 |

## Favourite channels

* **24**, Logitech's service, `MaxFavoriteChannels`, and the forum table; a Favorites button opens them,
  Logitech's manual.
* **A favourite is not a key binding**: it is a value of a state variable whose lists send through the
  number sender, base slot 16, read in a Logitech compile of three favourites made for a One, section 154.
  A channel with a leading zero spells its digits out instead, section 156.

## Sequences

* Logitech's software allows up to 25 steps. **A 25 step sequence hung a One for good three times out of
  three** under heavy tapping, the batteries coming out each time, seen at the bench, section 238: the
  action queue holds forty instructions and drops the rest in silence, and that sequence peaks at 35.
  `assertQueueFits` refuses by the queue's peak depth and not by step count. Why the remote hangs is
  **not established**.
* A sequence with a five second pause ran in eight seconds, seen at the bench, section 327.

## Delays

* **Power on delay**: the operand of the device's power on transition's `0x7C`, in tenths of a second, up
  to 450, read from configurations, section 235. It holds back **that device's** next command and nothing
  else, measured on a unit, section 236.
* **The delay between devices** also opens the one block copies a screen command sends, so a command
  touched on the screen goes out that delay later than the same command on a key, section 337;
  [behaviour.md](behaviour.md).

## Sounds and Options

The button sound can be muted, read in the firmware, section 74, and the remote's own Options menu offers
screen sounds, the date and time and a tutorial, section 150. MyHarmony's settings for this model edit the
configuration and nothing on the remote: six of seven per unit settings records in internal flash are
erased on both units read, section 150.

## Learning

"IR Learning Yes (Up to 200 Khz)", Logitech's manual. The learn commands are Logitech's desktop client's,
`docs/host-client.md`; nothing here has sent one, and learning on a One is **not checked**.

## Not checked

* The device and activity limits the remote or today's software enforces.
* Why an oversized sequence hangs the remote.
* Learning on a One.
