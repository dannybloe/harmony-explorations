# Harmony 300: features

What the 300 offers a person and what Logitech's software lets them set. The starting point is Logitech's
own statement, `UserAccountDirector/GetProductCapabilities2` for a skin 79 entry, read 7 October 2026, in
`reference/capabilities.md` under "The six bench models".

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 78 | no record | no record | no record | no record | no record | no |
| 79 | no record | no record | no record | no record | no record | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skins 78 and 79, so every column but the last says so; **long press** is
Logitech's service, `SKINS_WITH_A_LONG_PRESS`, which names neither.

## What Logitech's service states

| | value |
|---|---|
| product family | Harmony300, compiler architecture 16 |
| max devices | 4 |
| max favourite channels | 4 for the skin 79 entry; the product table gives skin 78 5 |
| max activities | not stated |
| display | none |
| settings | none listed |
| capabilities stated | FavoriteChannels, CompiledRemoteButtonMapping, PartiallySetupActivities, DeviceDelay, and `Harmony300EMEA` naming the model |
| not stated | **Activities**, LongPressAction, SupportsMHAssist, RemoteSettings, ColourDisplay, sequences, LeaveDevicesPoweredOn, LocaleEnabled |

All of it **Logitech's service**, `reference/capabilities.md` and `docs/predictions-arch16-harmony-300.md`;
the 78 against 79 favourite figures are section 265.

## Devices: four, one per key

Logitech's service says 4, and **every configuration of a 300 carries four infrared groups**, allocated at
the maximum with the unused ones empty, measured, section 264; the group index is the device key,
[keys.md](keys.md). Four keys with no long press is the maximum, where the 350 doubles it with a long press,
`docs/how-a-harmony-works.md`.

## The activity question

**The 300 states no `Activities` capability**, only `PartiallySetupActivities`, and a fill test of model
records accepted exactly one activity for it, `docs/how-a-harmony-works.md`. Its setup guide: "Watch TV with
one click: Turn your TV and cable/ satellite box on with a single button press". An account from the bench
describes it as a shortcut that switches several devices on and does not remap the keypad, section 265.
**Whether that shortcut is held in the configuration as an activity is not checked**: the activity reader
finds none on any configuration of this architecture, section 265, and raw slot 6's one extra entry is
only a candidate.

## Favourite channels

"Personalize buttons: Jump to your favorite channels", Logitech's setup guide. **A configuration given four
favourites, 1, 2, 3 and 666, holds four**, sent through the number sender as integers, measured, section
265.

## Not checked

* The device limit as the remote enforces it.
* Whether the Watch TV shortcut is an activity in the file.
* Learning, and any setting.
