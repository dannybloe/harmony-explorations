# Harmony Touch: features

What the Touch offers a person and what Logitech's software lets them set. Little of it is measured: no
configuration of this model exists as a file anywhere this project can reach, so its limits, keys and
screens are Logitech's word, from the manual, the service and the client.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 99 | no record | no record | no record | no record | no record | yes |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

`MODELS_BY_SKIN` has no record for skin 99, so every column but the last says so, deliberately: a record
states what a model's hardware can do, and nothing has read those fields out of this model's
firmware[^unchecked]. **Long press** is Logitech's product table, where skin 99 declares
`LongPressAction`[^t-long-press]; the platform's [README](../../architectures/harmony-touch/README.md) has
which other skins do.

## What Logitech states

| | value | evidence |
|---|---|---|
| devices | "up to 15 different devices" | [^x-touch-manual] |
| favourite channels | "up to 50", with pictures, added, removed and reordered on the remote | [^x-touch-manual] |
| activities | reorderable on the remote; how many it holds is not stated | [^x-touch-manual], "Reorder Activities" |
| gestures | five per activity, [display.md](display.md) | [^x-touch-manual] |
| learning | through the IR window, from another remote | [^x-touch-manual], "Know your product" |
| delays and inputs | adjustable on the remote, per device and per activity | [^x-touch-manual], "Settings" |
| remote settings | a `ScreenTimeout`, where the Harmony 600 and 700 list `GlowTime`, `TiltSensor` and `RemoteAssistant` | [^s292] |
| `IsEnabled` | true in the global product table | [^s202] |
| capabilities that decide the sync route | `SupportsCertificateActivation`, and **not** `LocaleEnabled` | [^s202] |
| Harmony Desktop | on its supported list, and off the list of products it compiles for | [^s135] |

## No compiled configuration exists for this model

**MyHarmony never asks the service to compile one.** The product's capabilities send its sync down the
provisioning route, where the remote asks the client for what it wants as a list of web requests by absolute
address, and the client only carries them[^s202][^s203]. So every request for a Touch configuration as a
compile ends in an error, and no amount of asking the service differently produces a file[^s203]. The route
is [the platform's usb.md](../../architectures/harmony-touch/usb.md).

That is why no configuration of this model has been read, and why its keys, screens and capability fields
are the manual's rather than measured.

## Changes on the remote travel back

Changes made on the remote, favourite channels, backgrounds and commands among them, "are synced back to
your myharmony.com account"[^x-touch-manual].

## Not checked

* The device, activity and favourite limits as the remote or today's software enforces them[^unchecked].
* Which keys take a long press[^unchecked].
* Learning, gestures and every setting on a unit[^unchecked].

[^unchecked]: Not checked.
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s202]: Stated by Logitech, by their service. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
