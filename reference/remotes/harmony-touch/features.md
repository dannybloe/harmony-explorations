# Harmony Touch: features

What the Touch offers a person and what Logitech's software lets them set. Little of it is measured: no
configuration of this model exists as a file anywhere this project can reach, so its limits are Logitech's
word, from the manual, the service and the client. Its keys and screens are read in its firmware,
[keys.md](keys.md) and [display.md](display.md).

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
| devices | "up to 15 different devices"; Logitech's product table states 15 for skin 99 | [^x-touch-manual], [^t-touch-products] |
| favourite channels | "up to 50", with pictures, added, removed and reordered on the remote; the product table states 50 | [^x-touch-manual], [^t-touch-products] |
| activities | reorderable on the remote; no limit is stated, and the product table's `MaxActivities` is empty for skin 99 | [^x-touch-manual], "Reorder Activities", [^t-touch-products] |
| gestures | five per activity, [display.md](display.md) | [^x-touch-manual] |
| learning | through the IR window, from another remote | [^x-touch-manual], "Know your product" |
| delays and inputs | adjustable on the remote, per device and per activity | [^x-touch-manual], "Settings" |
| remote settings | a `ScreenTimeout`, where the Harmony 600 and 700 list `GlowTime`, `TiltSensor` and `RemoteAssistant` | [^s292] |
| `IsEnabled` | true in the global product table | [^s202] |
| capabilities that decide the sync route | `SupportsCertificateActivation`, and **not** `LocaleEnabled` | [^s202] |
| Harmony Desktop | on its supported list, and off the list of products it compiles for | [^s135] |

## Favourite channels

**Each favourite is a channel the remote shows as a picture, in an order the account keeps, and pressing
one sends its channel number as digit presses** to the device that the activity marked as the tuning
default changes channels with, starting that activity first when it is not running[^t-touch-favourites-firmware].
On the account measured there was one such activity and one such device; the firmware allows more than
one[^t-touch-favourites][^t-touch-favourites-firmware]. How the digits go out is set per device on the
account: set to send the number then OK, channel 7 is 7 then OK; set to three digits, it is 0, 0,
7[^t-touch-favourites][^t-touch-favourites-firmware]. The remote's add screen refuses a fifty first
favourite with a warning, read in its screens, which matches Logitech's "up to
50"[^t-touch-favourites-firmware][^x-touch-manual].
A channel added by hand keeps its own number, name and uploaded picture; one from the provider's list
takes its logo from Logitech[^t-touch-favourites-firmware]. The documents behind them and every field are
[favourites-and-settings.md](../../architectures/harmony-touch/favourites-and-settings.md).

## The remote's own settings

**Nine settings act on the remote**: the background, the user's own backgrounds, the clock's 12 or 24 hour
form, the screen's and the keys' brightness, the screen timeout, the lock screen, the edit lock and the
motion sensor; with no value from the account, brightness is 85, the timeout 10 seconds and the keys'
brightness 35[^t-touch-favourites-firmware]. **A setting changed on the remote is kept only when the
account's settings already list it**[^t-touch-favourites-firmware]; vibration, which the remote's software
knows, was in none of the three syncs measured[^t-touch-favourites]. The table is
[favourites-and-settings.md](../../architectures/harmony-touch/favourites-and-settings.md#settings).

## No compiled configuration exists for this model

**MyHarmony never asks the service to compile one.** The product's capabilities send its sync down the
provisioning route, where the remote asks the client for what it wants as a list of web requests, each by a
logical address in Logitech's own scheme, and the client performs them and hands back the
answers[^s202][^t-touch-sync]. So every request for a Touch configuration as a
compile ends in an error, and no amount of asking the service differently produces a file[^s203]. The route
is [the platform's usb.md](../../architectures/harmony-touch/usb.md).

That is why no compiled configuration of this model has been read, and why its capability fields are
Logitech's word rather than measured. What a sync delivers is Logitech's own documents, read field by field
on [the platform's pages](../../architectures/harmony-touch/README.md).

## Changes on the remote travel back

Changes made on the remote, favourite channels, backgrounds and commands among them, "are synced back to
your myharmony.com account"[^x-touch-manual]. **Measured for the settings**: a change of the screen and button
brightness and the background went up as the remote's whole settings document, the client sent it to
Logitech's service the same as parsed JSON, and the service answered with the same document[^t-touch-both-ways].
Logitech's client asks for the remote's changes only when nothing is waiting on the account, among its other
conditions[^t-client-reverse-sync], [usb.md](../../architectures/harmony-touch/usb.md#provisioning-instead-of-a-compile). Favourite
channels and commands changed on the remote are not checked[^unchecked].

## Not checked

* The device and activity limits as the remote enforces them; the favourites' limit is
  the remote's code, never tried on one[^unchecked].
* Which keys take a long press[^unchecked].
* Learning, gestures and every setting on a unit[^unchecked].

[^unchecked]: Not checked.
[^t-touch-products]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s202]: Stated by Logitech, by their service. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-client-reverse-sync]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py), class `TheClientAsksForTheRemotesChangesOnlyWithNothingPending`
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
