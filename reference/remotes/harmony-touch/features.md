# Harmony Touch: features

What the Touch offers a person and what Logitech's software lets them set. No compiled configuration of this
model exists, so its limits are Logitech's word, from the manual, the service and the client. Its keys and
screens are read in its firmware, [keys.md](keys.md) and [display.md](display.md), and what one unit did with
documents a program of this project delivered is measured, [below](#no-compiled-configuration-exists-for-this-model).
This said "Little of it is measured"<!--superseded--> before those syncs.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 99 | no record | no record | no record | no record | no record | yes |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
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
  not refused on the way either, and it is a sleep timer due at once after every wake, so zero is not a value to
  offer[^t-touch-favourites-firmware]. Nor is a screen brightness below 4 from a document: the backlight holds it
  at 10, but the fade before the screen sleeps never ends, so the remote never sleeps on
  battery[^t-touch-favourites-firmware].
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
**Settings composed by this project act**: the remote's own settings document with the screen brightness at 20 and
the timeout at 30 seconds, delivered with 200, left the screen dimmed and the screen taking about 30 seconds to dim
off the cable, with no restart; delivering the remote's own back restored full brightness and about 10 seconds. A
context document rebuilt from a description of the fields a Touch reads was stored and reported in the same sync,
[favourites and settings](../../architectures/harmony-touch/favourites-and-settings.md#settings)[^t-touch-settings-of-ours].
**An activity and a device of Logitech's can be taken out by this project**: an activity and the receiver it shared
with three other activities, taken out of the four documents that named them with every role, key, gesture, entry and
protocol of the receiver's, delivered with 200, left four activities and six devices on the remote's lists and the
other activities starting and ending without a code of the receiver; delivering the four back restored both,
[taking out](../../architectures/harmony-touch/activities-and-buttons.md#taking-out-an-activity-and-a-device)[^t-touch-removal-of-theirs].
**A whole setup composed by this project runs as the one it was described from**: every device and every activity of
the documents a Touch held, described in this project's own terms and composed again under ids of ours, the four
documents that name them delivered with 200, ran the ten tests at an infrared receiver that Logitech's documents had
run, every expected code heard and every timed pause in its band, 418 of 418; delivering the four back restored the set before,
[a whole setup of ours](../../architectures/harmony-touch/activities-and-buttons.md#a-whole-setup-of-ours)[^t-touch-setup-of-ours].
*Corrected:* this said a document composed whole by this project was not checked<!--superseded--> until that run.
**A configuration built by this project from nothing runs**: the six documents and a background picture written from
a setup file, Logitech's catalogue entries and this project's own table of code families, with no document of
Logitech's as input, delivered with 200, were committed; every activity was started from off and ended at an infrared
receiver with every expected code heard, 38 of 38, from all seven devices and all five code families of its
definitions, the background of ours was drawn, and delivering the remote's own six back restored the set before,
[built from nothing](../../architectures/harmony-touch/devices-and-infrared.md#built-from-nothing)[^t-touch-from-nothing].
The other keys of such a set at a receiver are not checked[^unchecked]. A setup that is not a description of one
Logitech's service built is not checked[^unchecked].

## An empty configuration

**A Touch takes a configuration with no device and no activity**, and shows its own empty pages. Delivered by this
project with the remote's own context and settings, the four lists empty, it was committed and the remote started on
it: the favourites page showed the remote's screen for no favourites, no activity page was offered, after a restart the
home page was an empty device page, and the settings menu looked as usual. Delivering the remote's own lists and its
three favourites documents back restored the set before, [answering a
sync](../../architectures/harmony-touch/answering-a-sync.md#the-smallest-set-of-documents)[^t-touch-empty]. What the
empty device page and its menu look like in detail is not checked[^unchecked].

**The words on those screens are the firmware's and no configuration changes them.** The screen for no favourites says
"Please sign in to your Harmony account to add your favorite TV channels.", and the screens' "no activity" notice, put
up while no activity is listed when the screens load, at a start, on Off and when the remote leaves USB power after
its USB screen, until its OK is pressed, opens "You have not set up any Activities." and
asks the person to sign in to their Harmony account; both are the image's own text, one table per language, and a
configuration chooses only the language, through the context[^t-touch-empty-screens]. So an application that is not
Logitech's service cannot word them otherwise, and a remote it leaves empty points the person at a Harmony account.
Right after the empty set's sync a text of that kind was seen once and not identified[^t-touch-empty].

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
* Learning, gestures and every setting on a unit but the screen brightness and the timeout, and every item beyond
  Logitech's software above[^unchecked].

[^unchecked]: Not checked.
[^t-touch-products]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/base/test/models.test.ts)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s202]: Stated by Logitech, by their service. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-second-sync.test.ts)
[^t-touch-own-set-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-own-set-sync.test.ts)
[^t-touch-changed-set]: Measured on a unit. [The test](../../../packages/usb/test/touch-changed-set-sync.test.ts)
[^t-touch-device-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-device-runs.test.ts)
[^t-touch-activity-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-activity-runs.test.ts)
[^t-client-reverse-sync]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py), class `TheClientAsksForTheRemotesChangesOnlyWithNothingPending`
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-in-use]: Measured on a unit. [The test](../../../packages/bench/test/touch-full-bench-runs.test.ts)
[^t-touch-favourites-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-favourites-runs.test.ts)
[^t-touch-settings-of-ours]: Measured on a unit. [The test](../../../packages/corpus/test/touch-settings-runs.test.ts)
[^t-touch-removal-of-theirs]: Measured on a unit. [The test](../../../packages/bench/test/touch-removal-runs.test.ts)
[^t-touch-setup-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch-setup-runs.test.ts)
[^t-touch-empty]: Measured on a unit. [The test](../../../packages/bench/test/touch-empty-runs.test.ts)
[^t-touch-from-nothing]: Measured on a unit. [The test](../../../packages/bench/test/touch-from-nothing-runs.test.ts)
[^t-touch-empty-screens]: Read in the firmware. [The test](../../../tests/test_harmony_touch_empty_screens.py)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^t-touch-beyond-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
[^t-touch-beyond-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
