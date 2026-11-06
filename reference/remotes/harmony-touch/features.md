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
| gestures | five per activity, [display.md](display.md), which are the five gesture buttons; eleven gestures reach them, below | [^x-touch-manual] |
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
7[^t-touch-favourites][^t-touch-favourites-firmware]. The three digit setting and the start before a favourite
tapped with nothing running are measured on a unit with an infrared receiver, five favourites
tapped[^t-touch-in-use]. The remote's add screen refuses a fifty first
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

## Beyond Logitech's software

**A Touch acts on more of its documents than MyHarmony or Harmony Desktop lets a person set.** What follows
is what the remote does with a field that neither client offers, so it is what another program writing
the documents could offer that Logitech's could not. A field the remote reads and then ignores is not on
it, and neither is fixed behaviour no document changes.

**On the remote's own screens too, so the clients are the only ones missing it:**

* **Gestures.** Eleven gestures reach the five gesture buttons: four swipes and a tap, each also held,
  and a double tap. The remote's gesture editor binds each to a command, a sequence or the number pad;
  neither client has a screen for any gesture[^t-touch-beyond-firmware][^t-touch-beyond-client].
* **The clock's form, the screen's and the keys' brightness, the timeout, the lock screen, the edit lock,
  the motion sensor and vibration.** Neither client names any of these nine settings: MyHarmony's remote
  settings page edits three settings of the older remotes, none of which a Touch has. Both clients set
  only the background and the user's own backgrounds[^t-touch-beyond-client]. The remote's own settings
  screens set the nine, within the ranges below[^t-touch-favourites-firmware].

**Further than the remote's own screens go:**

* **The keys' light off.** A key brightness below 5 turns the key light off, and the remote's own slider
  starts at 10, so only a document reaches it[^t-touch-favourites-firmware][^t-touch-beyond-firmware].
* **A screen timeout past 30 seconds.** The remote's slider runs from 1 to 30; a value from a document
  reaches the sleep timer unclamped, and the lock screen uses half of it[^t-touch-beyond-firmware]. Zero is
  not refused on the way either, so zero is not a value to offer.
* **The edit lock, set from outside.** It locks the remote's Remote, Devices and Activities menus and its
  gesture editor, and not its own switch, so anyone holding the remote can turn it off again[^t-touch-beyond-firmware].
* **Vibration that lasts.** With no vibration row in the account's settings, which is how every sync
  measured arrived, the remote vibrates with effect 13 where it has a motor, and a change made on the
  remote is not kept, since the remote edits only rows the account already has. A document carrying the
  rows is the only way to make a choice stick. A row present with no value gives the effect the text
  `nil`, not 13[^t-touch-favourites-firmware][^t-touch-beyond-firmware][^t-touch-favourites].
* **More than five user backgrounds.** Every value of the row is fetched with its small twin, and the
  remote applies no count[^t-touch-beyond-firmware][^t-touch-favourites-firmware].

**Only a document reaches these, read in the remote's engine**[^t-touch-beyond-firmware]:

* **A code of one's own.** A command's code and its protocol family are whatever the device document says,
  and the clients take them only from Logitech's database, from Logitech's analysis of a learned code, or
  from learning.
* **The delay for a device that has to connect first**, used in place of an activity's input delay when its
  input is flagged online.
* **Channel tuning beyond what the clients offer**: keys sent before a two or three digit channel, which
  neither client names, and keys sent before the digits. The clients offer the padding and the number then OK.
* **A code held for a set time on any step** of a sequence or an activity's start, the step's `Duration`,
  where Harmony Desktop offers one on a power step only and no screen of MyHarmony offers one. This is not
  the long press of a key, which MyHarmony does set, [keys.md](keys.md#holding-a-key).
* **What Help resends first**, which the power set types decide.
* **A key or screen entry that starts an activity**, inside an activity's or a device's map; the clients
  offer that on the remote's top level, which a Touch does not have.
* **A hidden activity**, by a negative position in the order; the remote's screens then cannot find it by
  its id either.
* **Favourites on more than one activity**, and a channel number holding a dot or a dash.

**Read as possible and never exercised**, each pieced together from more than one place in the
engine[^t-touch-beyond-firmware]: a long press on an on screen command, which the engine fires by the time
held and the screens report while it is held, except for an entry bound to a sequence; and a sequence on a
device's own keys, run in device mode.

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

**A sync need not come from Logitech's client.** One driven end to end by a program of this project, every
document, favourites document and picture answered 304 so that the remote kept its own, was committed by the
remote, which then started normally with its favourites in place, [answering a
sync](../../architectures/harmony-touch/answering-a-sync.md)[^t-touch-second-sync]. **A whole set delivered
with 200 by a program of this project is stored and committed, and its entity tags become the remote's**: the
remote's own six configuration documents, answered 200 under tags of ours, were committed, its configuration
hash then carried those tags, and the next sync asked for the six with them[^t-touch-own-set-sync]. **A document
changed by this project reaches what the remote does**: a sequence's delay and an activity's name, each changed
in one value, delivered alone with 200 and committed, changed the pause the remote left between two commands and
the name on its activity list, and putting each value back restored them[^t-touch-changed-set]. **A device
composed by this project is listed and sent**: a projector of ours, its map and a definition written from this
project's own table, added to the three lists the remote held and delivered with 200, showed in the device list,
and each of its eleven commands was heard when pressed; taking it out again restored the set before,
[a device of ours](../../architectures/harmony-touch/devices-and-infrared.md#a-device-of-ours)[^t-touch-device-of-ours].
**An activity composed by this project is listed and runs**: an activity of ours from two devices the remote held,
with a map and screen entries of its own, added to the activity and map lists and delivered with 200, showed on the
activity list and was started, used, switched and stopped as its record states; taking it out again restored the
set before, [an activity of ours](../../architectures/harmony-touch/activities-and-buttons.md#an-activity-of-ours)[^t-touch-activity-of-ours].
**Favourites and a logo composed by this project are shown and sent**: the user's favourites document with a
channel of the line up added and the order reversed, and a logo of ours at the address of that channel's station
logo, delivered with 200, put the six favourites on the screen in the document's order with our logo on the added
one, which sent its line up number; delivering the remote's own two back restored the old order and logo,
[favourites and settings](../../architectures/harmony-touch/favourites-and-settings.md#favourite-channels)[^t-touch-favourites-of-ours].
A document composed whole by this project is not checked[^unchecked].

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
* Learning, gestures and every setting on a unit, and every item beyond Logitech's software above[^unchecked].

[^unchecked]: Not checked.
[^t-touch-products]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s202]: Stated by Logitech, by their service. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-second-sync.test.ts)
[^t-touch-own-set-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-own-set-sync.test.ts)
[^t-touch-changed-set]: Measured on a unit. [The test](../../../packages/usb/test/touch-changed-set-sync.test.ts)
[^t-touch-device-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch81-runs.test.ts)
[^t-touch-activity-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch82-runs.test.ts)
[^t-client-reverse-sync]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py), class `TheClientAsksForTheRemotesChangesOnlyWithNothingPending`
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-in-use]: Measured on a unit. [The test](../../../packages/bench/test/touch71-runs.test.ts)
[^t-touch-favourites-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch83-runs.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^t-touch-beyond-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
[^t-touch-beyond-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
