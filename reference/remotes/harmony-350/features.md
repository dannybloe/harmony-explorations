# Harmony 350: features

What the 350 offers a person: up to eight devices behind four keys, one activity, five favourite
channels, and a second action on each device key when it is held. Below that, what Logitech's software
states the model can be given, and how far a configuration bears it out.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 104 | no record | no record | no record | no record | no record | yes |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skin 104, so every column but the last says so; the **long press** comes
from Logitech's service's product records[^t-models].

## What Logitech's service states

| | value |
|---|---|
| product family | Harmony350[^t-capabilities] |
| compiler architecture | 16[^t-capabilities] |
| max devices | 8[^s263] |
| max favourite channels | 5[^s263] |
| max activities | **1**[^s145] |
| display | none[^t-capabilities] |
| settings | none listed[^t-capabilities] |
| capabilities stated | `Activities`[^s264], `LongPressAction`[^s264], and `FavoriteChannels`, `CompiledRemoteButtonMapping`, `DeviceDelay` and `SupportsMHAssist`[^t-capabilities] |
| not stated | `RemoteSettings`, `ColourDisplay`, `ActivityCompiledRemoteButtonMapping`, `SupportActivitySequence`, `ButtonSequences`, `LeaveDevicesPoweredOn`, `LocaleEnabled`, and `PartiallySetupActivities`, which the Harmony 300 states[^t-capabilities] |

So no sequences and no remote settings. The table is the service's answer to
`UserAccountDirector/GetProductCapabilities2` for a skin 104 product[^t-capabilities].

## Devices: eight, and the long press is why

"Control up to eight devices individually using these four Device buttons, each with a short press or a
longer two second press"[^x-manual]. Logitech's service says 8[^s263], and a configuration's infrared
table is allocated at that maximum whatever the device count,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container).
Four keys times two presses is exactly the stated maximum, where the Harmony 300 has four keys, no long
press and four devices; the arithmetic is in
[how a Harmony works](../../how-a-harmony-works.md#holding-a-key-is-two-mechanisms-and-a-repeat-and-a-long-press-exclude-each-other).

## One activity

The **Watch TV** activity powers on and off "devices you use to watch TV"; pressing Watch TV again turns
them all off[^x-manual]. Logitech's product record states a maximum of one activity, and it is the only
enabled product with any value in that field[^s145]; the 350 declares `Activities` where the Harmony 300 declares only
`PartiallySetupActivities`[^s264]. Why a remote without a screen holds one is in
[how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity).
Whether the limit is the remote's and not only the software's is **not checked**: no configuration can be
given a second activity to compare. **In the configuration the activity is one key's binding**, which
sends codes or sets the devices' state variables and then selects one device's map, with no key map of its
own,
[the family's memory page](../../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for)[^t-harmony-350-slots-c].

## Favourite channels

"Program up to five Favorite Channels for your TV or cable/satellite receiver"[^x-manual]; 5 per Logitech's
service[^s263]. **A configuration given five holds five**[^s263b], each sent through the number sender[^s262].
**Pressed on a unit, each favourite key sent its channel as the device's own digits**, one code per digit
and nothing after the last, favourites 1 to 5 the channels in the order they were entered, and a channel
with a leading zero with its zero[^t-harmony-350-setup-u]. Which code each favourite key is,
[keys.md](keys.md#how-each-code-is-known). The digits a favourite sends are not the records the device's digit
keys send but a copy of each with one block and no silence in front of it,
[the number sender](../../config-format/state.md#base-slot-16-the-number-sender)[^t-noscreen-favourites].

## Delays

A configuration compiled for a 350 holds one pause of 170 tenths of a second in a list shaped like a power
on transition[^s327]; how this architecture interprets it is **not read**.

## Not checked

* The device and activity limits as the remote enforces them.
* Learning, and any setting beyond those Logitech's service lists.

[^t-models]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^s263]: Stated by Logitech, by their service. [Section 263](../../../docs/findings.md#s263)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s264]: Stated by Logitech, by their service. [Section 264](../../../docs/findings.md#s264)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s263b]: Measured in configurations. [Section 263](../../../docs/findings.md#s263)
[^s262]: Measured in configurations. [Section 262](../../../docs/findings.md#s262)
[^s327]: Measured in configurations. [Section 327](../../../docs/findings.md#s327)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
[^t-harmony-350-setup-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
[^t-noscreen-favourites]: Measured in configurations. [The test](../../../packages/codec/test/noscreenfavourites.test.ts)
