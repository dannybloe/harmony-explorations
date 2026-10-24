# Harmony 300: features

What the 300 offers a person and what Logitech's software lets them set: four devices, one per device key;
favourite channels; and one shortcut that switches several devices on, which Logitech does not call a full
activity. No long press, no screen, no sequences.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 78 | no record | no record | no record | no record | no record | no |
| 79 | no record | no record | no record | no record | no record | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skins 78 and 79, so every column but the last says so. **Long press**
is `SKINS_WITH_A_LONG_PRESS`, Logitech's own list of the models that have one, which names
neither[^t-long-press].

## What Logitech's service states

For a skin 79 entry, `UserAccountDirector/GetProductCapabilities2`:

| | value | evidence |
|---|---|---|
| product family | Harmony300, compiler architecture 16 | [^t-capabilities] |
| max devices | 4 | [^s264], [^t-capabilities] |
| max favourite channels | 4 for the skin 79 entry; the product table gives skin 78 5 | [^s265], [^t-capabilities] for 79; [^t-product-table] for 78 |
| max activities | not stated | [^t-capabilities] |
| display | none | [^t-capabilities] |
| settings | none listed | [^t-capabilities] |
| capabilities stated | FavoriteChannels, CompiledRemoteButtonMapping, PartiallySetupActivities, DeviceDelay, and `Harmony300EMEA` naming the model | [^s265] for `PartiallySetupActivities`; [^t-capabilities] for the whole list |
| not stated | **Activities**, LongPressAction, SupportsMHAssist, RemoteSettings, ColourDisplay, sequences, LeaveDevicesPoweredOn, LocaleEnabled | [^s265] for `Activities`; [^t-long-press] for `LongPressAction`; [^t-capabilities] for the whole list |

The skin 79 product is named "Harmony 300 EMEA" and displayed as "Harmony 300"[^t-capabilities].

## Devices: four, one per key

Logitech's service says 4[^s264], and **every configuration of a 300 carries four infrared groups**,
allocated at the maximum with the unused ones empty[^s264b], the family's rule,
[the family's memory.md](../../architectures/harmony-300-350/memory.md). The group index is the device key,
[keys.md](keys.md). Four keys with no long press is the maximum, where the 350 doubles it with a long
press,
[how a Harmony works](../../how-a-harmony-works.md#holding-a-key-is-two-mechanisms-and-a-repeat-and-a-long-press-exclude-each-other).

## The activity question

**The 300 states no `Activities` capability**, only `PartiallySetupActivities`[^s265], and a remote with
no screen took exactly one activity when model records were filled through Logitech's copy step,
[how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity). Its
setup guide: "Watch TV with one click: Turn your TV and cable/ satellite box on with a single button
press"[^unchecked]. A person who set one up describes it as a shortcut that switches several devices on and
does not remap the keypad[^s265c], which is an activity's switch on step without its keypad map.

**Whether that shortcut is held in the configuration as an activity is not checked**: the activity reader
finds none on any configuration of this family, and raw slot 6's one extra entry is only a
candidate[^s265d].

## Favourite channels

"Personalize buttons: Jump to your favorite channels", Logitech's setup guide[^unchecked]. **A
configuration given four favourites, 1, 2, 3 and 666, holds four**, sent through the number sender as
integers[^s265d]; how the number sender works is
[the configuration format's](../../config-format/state.md#base-slot-16-the-number-sender).

## Not checked

* The device limit as the remote enforces it.
* Whether the Watch TV shortcut is an activity in the file.
* Learning, and any setting.

[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^s264]: Stated by Logitech, by their service. [Section 264](../../../docs/findings.md#s264)
[^s265]: Stated by Logitech, by their service. [Section 265](../../../docs/findings.md#s265)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^s264b]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^unchecked]: Not checked.
[^s265c]: Measured on a unit. [Section 265](../../../docs/findings.md#s265)
[^s265d]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
