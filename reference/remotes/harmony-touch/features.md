# Harmony Touch: features

What the Touch offers a person and what Logitech's software lets them set. The starting point is Logitech's
own statement as `reference/capabilities.md` records it, which for this model is short: skin 99 is the
Harmony Touch in the live product table, it declares a long press, and the six model capability table of
that file does not include it. The rest is the manual and what section 202 read of the client.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 99 | no record | no record | no record | no record | no record | yes |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skin 99, so every column but the last says so, deliberately,
`reference/capabilities.md`. **Long press** is Logitech's service, `ProductsManager/GetAllProducts`, where
the Touch is the first of the generation that declares it, `reference/capabilities.md`.

## What Logitech states

| | value | standing and source |
|---|---|---|
| devices | "up to 15 different devices" | Logitech's manual |
| favourite channels | "up to 50", with pictures, added, removed and reordered on the remote | Logitech's manual |
| activities | reorderable on the remote; how many it holds is not stated | Logitech's manual, "Reorder Activities" |
| gestures | five per activity, [display.md](display.md) | Logitech's manual |
| learning | through the IR window, from another remote | Logitech's manual, "Know your product" |
| delays and inputs | adjustable on the remote, per device and per activity | Logitech's manual, "Settings" |
| remote settings | a `ScreenTimeout`, where the Harmony 600 and 700 list `GlowTime`, `TiltSensor` and `RemoteAssistant` | Logitech's service, section 292 |
| `IsEnabled` | true in the global product table | Logitech's service, section 202 |
| capabilities that decide the sync route | `SupportsCertificateActivation`, and **not** `LocaleEnabled` | Logitech's service, section 202 |
| Harmony Desktop | on its supported list, and off the list of products it compiles for | Logitech's client, section 135 |

## No compiled configuration exists for this model

**MyHarmony never asks the service to compile one.** The product's capabilities send its sync down the
provisioning route, where the remote asks the client for what it wants as a list of web requests, by
absolute address, and the client only carries them, Logitech's client, sections 202 and 203. So every
attempt to fetch a Touch configuration as a compile ends in an error, and **no amount of asking the
service differently produces a file**, section 203.

That is the reason this project has no configuration of this model, and why its keys, screens and
capability fields are the manual's rather than read.

## Changes on the remote travel back

Changes made on the remote, favourite channels, backgrounds and commands among them, "are synced back to
your myharmony.com account", Logitech's manual, "Syncing Your Remote Back to Myharmony.com".

## Not checked

* The device, activity and favourite limits as the remote or today's software enforces them.
* Which keys take a long press.
* Learning, gestures and every setting on a unit.
