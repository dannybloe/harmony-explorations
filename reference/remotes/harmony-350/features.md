# Harmony 350: features

What the 350 offers a person and what Logitech's software lets them set. The starting point is Logitech's
own statement, `UserAccountDirector/GetProductCapabilities2` for a skin 104 entry, read 7 October 2026, in
`reference/capabilities.md` under "The six bench models".

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 104 | no record | no record | no record | no record | no record | yes |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skin 104, so every column but the last says so; **long press** is
Logitech's service, `SKINS_WITH_A_LONG_PRESS`.

## What Logitech's service states

| | value |
|---|---|
| product family | Harmony350, compiler architecture 16 |
| max devices | 8 |
| max favourite channels | 5 |
| max activities | **1** |
| display | none |
| settings | none listed |
| capabilities stated | Activities, FavoriteChannels, CompiledRemoteButtonMapping, DeviceDelay, LongPressAction, SupportsMHAssist |
| not stated | RemoteSettings, ColourDisplay, ActivityCompiledRemoteButtonMapping, SupportActivitySequence, ButtonSequences, LeaveDevicesPoweredOn, LocaleEnabled |

All of it **Logitech's service**, `reference/capabilities.md`. So no sequences and no remote settings.

## Devices: eight, and the long press is why

"Control up to eight devices individually using these four Device buttons, each with a short press or a
longer two second press", Logitech's manual. Logitech's service says 8, and **every configuration of a 350
carries eight infrared groups whatever the device count**, the table being allocated at the maximum,
measured, section 263. Four keys times two presses is exactly the stated maximum, where the 300 has four
keys, no long press and four devices, `docs/how-a-harmony-works.md`.

## One activity

The **Watch TV** activity "automatically power[s] on/off devices you use to watch TV"; pressing Watch TV
again turns them all off, Logitech's manual. `MaxActivities` 1, Logitech's service, and a fill test of
model records accepted exactly one, `docs/how-a-harmony-works.md`. That the limit is the remote's and not
only the software's is **not checked**: no configuration can be given a second activity to compare.

## Favourite channels

"Program up to five Favorite Channels for your TV or cable/satellite receiver", Logitech's manual; 5 per
Logitech's service; **a configuration given five holds five**, sent through the number sender, measured,
sections 262 and 263.

## Delays

Logitech's service states `DeviceDelay`. A factory configuration holds one pause of 170 tenths in a list
shaped like a power on transition, read from configurations, section 327; how this architecture interprets
it is **not read**.

## Not checked

* The device and activity limits as the remote enforces them.
* Learning, and any setting beyond those Logitech's service lists.
