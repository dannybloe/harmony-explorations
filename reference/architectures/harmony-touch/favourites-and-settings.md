# Harmony Touch: favourites, settings and pictures

Besides its activities, devices, button maps and infrared protocols, a Harmony Touch receives four more
kinds of thing when it syncs: a **Context** document about its account, a **Settings** document with its
own settings, **three documents its favourite channels are spread over**, and **pictures**, a background
and the channel logos[^t-touch-both-ways]. This page says what the remote does with each. The order they
arrive in and how they are addressed on the cable is [usb.md](usb.md); the documents are Logitech's own
data model, [the data model](../../logitech/data-model/model.md).

What a person holding the remote meets of it is on the model's pages,
[features.md](../../remotes/harmony-touch/features.md) and [display.md](../../remotes/harmony-touch/display.md).

## Favourite channels

**A favourite is a station.** The remote shows the favourites in the order of one list, in the user's
favourites document; the channel number it sends, a channel's name and its own picture are in a second
document, about the device that tunes; and the provider's whole line up, in a third, fills in whatever the
second leaves out[^t-touch-favourites][^t-touch-favourites-firmware].

**On the account measured, the favourites belong to one activity and one device**: the activity the
account marks as the default for tuning, and the device that activity changes channels
with[^t-touch-favourites]. The firmware allows more than one: it keeps favourites for every activity marked
that way whose roles include changing channels or controlling a Roku, a Sonos or a speaker, and for a
speaker device in device mode; when no such activity
is running, its favourites screen shows those of the first activity of type 1 it finds, with no stated
order among several[^t-touch-favourites-firmware]; type 1 is `WatchTV` in Logitech's `ActivityType`, counted
from `NotSpecified` at 0, and the activity measured as the tuning default was of that type[^t-touch-favourites].

**Pressing a favourite sends its channel number as digit presses to that device.** If its activity is not
running, the remote starts it first and sends the number at the end of the start, the way an activity's
own default channel is sent[^t-touch-favourites-firmware]. How the digits go out is set per device on the
account, by its channel tuning settings. Two settings were measured:

| the device's channel tuning | what the remote sends for channel 7 | for channel 123 |
|---|---|---|
| the number, then OK | 7, OK | 1, 2, 3, OK |
| three digits, padded with zeros | 0, 0, 7 | 1, 2, 3 |

The two rows are what the documents held and what the remote's code does with
them[^t-touch-favourites][^t-touch-favourites-firmware]. Other channel tuning settings were not
measured[^unchecked].

**On the remote**, up to 50 favourites can be held: the add screen refuses a fifty first with a
warning. That is read in the screens; the test holds the number 50 and not the
refusal[^t-touch-favourites-firmware]. Reordering them changes only the user's favourites document, and
changing a channel changes the device's as well; each goes up to the account at the next
sync[^t-touch-favourites-firmware]. What such a change looks like on the cable is not
checked[^unchecked].

## Settings

**A sync's Settings document holds eleven named rows**, each a list of values with a default, and the
remote reads nine of them[^t-touch-favourites][^t-touch-favourites-firmware]. The firmware also knows
`HapticFlag` and `HapticEffect`, vibration, which no sync measured carried, and the table lists them
too:

| setting | what it does on the remote | with no value on the account |
|---|---|---|
| `BackgroundImage` | the background picture, one of nine built into the remote or one of the user's own | a built in picture |
| `UserImages` | the user's own backgrounds, each fetched with a small twin for the picker; the row allows five, a count the remote does not read | none |
| `TwelveHourClock` | the clock in the status bar, 12 hour or 24 hour, and the set time screen | 12 hour |
| `ScreenBrightness` | the screen's backlight; a value is held to 10 to 100 | 85 |
| `ScreenTimeout` | seconds before the screen goes to sleep, which it does not do on USB power; a value is not clamped, and the lock screen uses half of it | 10 |
| `ScreenLockFlag` | the lock screen, shown when the screen fades out | off |
| `EditLock` | locks the Remote, Devices and Activities menus and the gesture editor, and not its own switch | off |
| `KeyBrightness` | the keys' backlight; a value from the account is taken from 5 to 100 and turns the light off below 5, where the remote's own slider starts at 10 | 35 |
| `AccelFlag` | whether the motion sensor reports, on hardware that has one | on |
| `HapticFlag` | vibration, offered only on hardware that reports a vibration motor; in no sync measured | on |
| `HapticEffect` | the vibration's effect; in no sync measured | `"13"` |
| `IsWiFiEnabled`, `TimeZoneFlag` | nothing: neither name occurs anywhere in the remote's software, searched with its exact case | |

The defaults are the firmware's[^t-touch-favourites-firmware]. Three settings the firmware knows never
arrived in any sync measured: `HapticFlag` and `HapticEffect`, vibration, offered only on hardware that
reports a vibration motor, and `ActivityPressDuration`, which no screen asks
for[^t-touch-favourites][^t-touch-favourites-firmware]. **A change made on the remote can only edit a row the
account already has**: for a setting missing from the account's document, nothing stores what is chosen
on the remote, and the firmware's default is what it reads again[^t-touch-favourites-firmware]. Whether the remote shows a vibration or
motion setting is not checked[^unchecked].

On the remote the timeout is a slider from 1 to 30 seconds and the screen and key brightness are sliders from
10 to 100 each, with a warning past 95 that a brighter screen and keys drain the battery faster; a setting of
100 is the display backlight's step 26 and the key light's step 42[^t-touch-keys]. What the settings screens
offer is [the model's display page](../../remotes/harmony-touch/display.md#the-panel).

The document's own fields: `RemoteName` is the model name on the About screen, the firmware's own when
empty; `UserImageBucketUri` is where the user's backgrounds are fetched from[^t-touch-favourites-firmware].

## Context

**Six of Context's 21 fields act on a Touch**, and a seventh goes into its usage report[^t-touch-favourites-firmware]:

| field | what it does |
|---|---|
| `AccountId-` | the account number in the address of every document the remote hands up[^t-touch-favourites] |
| `HouseholdUserProfileUri` | the address of the user's favourites document; without it the remote asks for no favourites at all |
| `Language` | the language of the screens, the part before the `-` |
| `Email` | shown as the user name on the account screen, in place of the provisioning user name |
| `InstallerId` | set means an installer's remote: the activity tutorial is not offered, and the usage report says professional |
| `SetupSession` | its `Type` 0 marks the setup complete; its `SetupType` `"321"` hides the activity tutorial |
| `CountryCode` | the country in the usage report |

**Eight are read by nothing**: `GlobalRemoteUri`, `HouseholdId-`, `KeyboardLocale`, `RemoteJid`,
`CustomerId` and `HouseholdDeviceProfileUri` occur nowhere in the remote's software, and no code reads the
document's `ConfigVersion` or `Mode`, which rests on the decompiled engine: the screens' own
`ConfigVersion` is a counter of theirs, not this field[^t-touch-favourites-firmware]. **The other six are read only by code for a hub,
for a network client or for pairing**: `AccountUri` addresses a hub's home control document, `Locale` feeds a
hub's sunrise and sunset and the time zone screen of a Touch tethered to a hub, `DataConsent` and
`LatestSLAAcceptedDate` are echoed to a network client, and `Name` and `LatestSLAAccepted` are read by the
pairing and firmware check code[^t-touch-favourites-firmware]. Whether any of that runs on a Touch synced
over USB is not checked[^unchecked].

Five of the 21 are not in Logitech's data model as this reference holds it: `CustomerId`, `DataConsent`,
`Email`, `LatestSLAAccepted` and `LatestSLAAcceptedDate`[^t-touch-favourites]. Context arrived the same in
both syncs measured that carried one[^t-touch-favourites].

## Pictures

**Every picture is fetched again at every sync but the channel logos from the line up**, and in the one
sync that carried pictures those too. Such a logo is skipped while an expiry stored with it has not
passed, and the expiry comes from a `cache-Control` field on the answer, which no answer in that sync
carried; so a logo was given no expiry and is fetched every time[^t-touch-favourites][^t-touch-favourites-firmware]. The background, its
twin and an uploaded channel logo have no such rule; each is asked for with the entity tag the remote
holds[^t-touch-favourites-firmware]. Before the pictures are asked for, every picture already held is carried
into the new set, so one that fails to arrive keeps its old copy[^t-touch-favourites-firmware]. **Measured:
pictures the remote holds are asked for with their tags**, all ten in a later sync with exactly the tags they
were delivered with, where the sync that delivered them had asked for every one untagged; answered 304, the
remote kept them and committed the set[^t-touch-second-sync].

**What is asked for, in order**[^t-touch-favourites][^t-touch-favourites-firmware]:

1. each of the user's backgrounds in `UserImages`, and its twin, from `UserImageBucketUri`
2. for each favourite in the order shown: the channel's own uploaded picture when it has one; otherwise
   the station's logo, unless the channel was added by hand, which then has no picture
3. the logo of each popular channel in the line up, which the remote offers when a favourite is added on
   it; at most 25, a cap read in the screens, where the test holds the number

In the one sync that carried pictures, the background was 240 by 320 with a 60 by 80 twin, a station logo 54 by 54 and an
uploaded logo 54 by 44, all PNG; the remote asks for logos at 54 by 54[^t-touch-favourites][^t-touch-favourites-firmware].
A background appears in the remote's picker only once its small twin is stored, which is read in the
screens and not asserted[^t-touch-favourites-firmware].

## The documents

The rest of this page is the documents field by field, for whoever reads or builds them.

### Where each is kept

Everything lands in `/data/resources/` on the remote, beside the six configuration documents, with an
entry in `index.json` holding its entity tag, its type and its expiry; during a sync it goes to `/data/tmp/`
first[^t-touch-favourites-firmware]. **A picture answered without an entity tag is not saved, and a
favourites document answered without one aborts the whole sync**[^t-touch-favourites-untagged].

> This said a favourites document answered without a tag is not saved<!--superseded-->, like a picture, until
> the write handler was read: it aborts the sync over a failed answer to anything but a
> picture[^t-touch-favourites-untagged].

| what | the address the remote asks for | the file it is kept as |
|---|---|---|
| Context | `harmony://Remote/<remote>/Context` | `Context.json` |
| Settings | `harmony://Account/<account>/Remote/<remote>/Settings` | `Settings.json` |
| the user's favourites | `content://1.0/user;` and Context's `HouseholdUserProfileUri` | `ContentUser.json` |
| a device's favourites | `content://1.0/device;` and the device's `DeviceProfileUri` | `CD_` and the device's `ContentProfileKey` |
| the provider's line up | `content://1.0/service/` and the service id | `CS_` and the service id |
| a user background | `UserImageBucketUri` and the name in `UserImages`, and the same with `_small` before `.png` | the file name |
| a station logo | `content-image://1.0/station/<station>/image;maxX=54;maxY=54;type=png` | the station id and `.png` |
| an uploaded channel logo | `content-image://1.0/image/<image>;maxX=54;maxY=54` | the image's name |

The addresses of the three favourites documents were measured equal to these, built from the documents
named[^t-touch-favourites]; the file names are the remote's code[^t-touch-favourites-firmware].

### Which favourites documents are asked for

The user's document is asked for when there is a favourites activity or a speaker and Context names the
household user profile; a device's document for the favourites device of each favourites activity and for
each speaker, device types 19 and 33; a line up for each favourites activity's service, which is the first
key under the device's `ContentProfileKey` in the user's document, skipping an antenna only service, named
in braces, and the Roku, Sonos and Heos ones[^t-touch-favourites-firmware]. On the account measured, that made the
tuning device's document the only one asked for, though every device carries a profile
address[^t-touch-favourites].

**On a Touch synced through a computer all three kinds are asked for without an entity tag, every time**: the
remote's screens ask for them, read each document's file before its tag, and during a sync read files from the
set being gathered, where no favourites document is yet. So an untagged favourites request says nothing about
what the remote holds, and an answer of 304 makes it keep its own copy, [answering a
sync](answering-a-sync.md#the-entity-tag-an-answerer-sends)[^t-touch-favourites-untagged].

**Measured in a sync answered by a program of this project**: the user's, the tuning device's and the line up's
documents were each asked for without a tag, though an earlier sync of Logitech's had delivered each with 200
and a tag; each was answered 304 with a tag of ours, the sync was committed, and the remote still showed its
favourites afterwards[^t-touch-second-sync]. That fits the reading above. It does not by itself rule out a
narrower one, that the tag is sent only when both the document's file and its index entry exist, since which
favourites files the remote held was not read on the unit, so the cause is not checked[^unchecked].

### The user's favourites document

| field | what the remote does with it |
|---|---|
| `id` | the address the document is handed up to, `content://1.0/user/<id>` |
| `preferences.<ContentProfileKey>.<service>.stations` | **the favourites, in the order shown**; each station is its `id` alone |
| `location` | not checked[^unchecked]; its `postalCode` occurs nowhere in the remote's software |
| `user_profile_uri` | nothing, it occurs nowhere in the remote's software; it equals Context's `HouseholdUserProfileUri`[^t-touch-favourites] |

Measured: one device key, one service, and the stations in exactly the order of the device document's
dial positions; no dial position in the user's document[^t-touch-favourites]. The rest is the remote's
code[^t-touch-favourites-firmware].

### A device's favourites document

| field | what the remote does with it |
|---|---|
| `id` | the address the document is handed up to, `content://1.0/device/<id>`, a different id from the user document's |
| `services.<service>.dialPositions` | one per favourite: |
| `station` | which station it is |
| `number` | **the channel number that is sent**, as text of digits |
| `name` | the name shown, before the line up's short name |
| `image` | an uploaded logo, shown in place of the station's |
| `added` | true for a channel added by hand: its number, name and picture come from here alone and it gets no station logo |
| `device_profile_uri` | nothing, it occurs nowhere in the remote's software |

For a channel from the line up the dial number equals the line up's number for that station; a channel
added by hand is in no channel of the line up[^t-touch-favourites]. What is left out of a dial position
is filled from the line up: the number, the short name, and the station's logo[^t-touch-favourites-firmware].

### The provider's line up

`channels` is the line up, each a `number` and a `station` with an `id`, a `shortName` and, on some, a
`fullName`; a `popularRank` marks a popular channel. The remote reads those: the number and short name to
fill in a favourite, the station id to match it and to name its logo, and the full name and rank for the
popular channels offered when a favourite is added[^t-touch-favourites-firmware]. The document's
`operatorName`, `msoId` and `lineupId` occur nowhere in the remote's software[^t-touch-favourites-firmware];
whether it reads its `name`, `serviceType` or `location`, a station's `attributes` or a channel's `popular`
flag is not checked[^unchecked]. Measured: no two channels share a number, and a station can be on more
than one[^t-touch-favourites].

### How a favourite becomes key presses

Read in the remote's engine as decompiled; the engine ships compiled, so only the names it uses are
asserted against the image[^t-touch-favourites-firmware]:

1. A tap on a favourite asks the engine to change channel to its dial number, or to start the favourites
   activity with that channel when it is not running; then the channel is sent once the start's commands
   have gone.
2. The engine picks the device the request names; otherwise the running activity's first role device in
   this order: Roku, Sonos, app, speaker, then **channel changing**; and when the device that names is not
   found, the activity's default device.
3. For an infrared device, a number holding anything but digits, `-` and `.` is refused. Then the device's
   `ChannelTuningFeature` shapes it: its `StartActions`; the number, padded with leading zeros to
   `FixedDigits` (none when it is null), with `GreaterTenActions` before a two digit number of 10 or more
   and `GreaterHundredActions` before a number of three or more digits of 100 or more; its `FinishActions`.
4. Each digit is the device's command named after the digit, sent with the device's inter key delay. A
   number holding `-` or `.`, or a device with no channel tuning feature, is sent character by character
   without the padding. An action whose command the device lacks, an empty name included, sends nothing.

Measured on the tuning device, for the two choices in the table above[^t-touch-favourites]:

| the choice | `FixedDigits` | start, greater than ten, greater than hundred | finish |
|---|---|---|---|
| the number, then OK | null | none | one press of `OK` |
| three digits | 3 | one press each, with an empty command name | one press, with an empty command name |

### Settings, field by field

`Settings` holds four fields, `DefaultImageBucketUri`, `RemoteName`, `Settings` and `UserImageBucketUri`,
and each row is `Name`, `SettingId`, `Values`, `DefaultValue`, `MinCount` and `MaxCount`, exactly
Logitech's `RemoteSettings` and `RemoteSetting`, in the same eleven rows in the same order in every sync
measured[^t-touch-favourites]. The remote reads only `Name`, the first of `Values` (every value of
`UserImages`) and, for a yes or no setting, `DefaultValue`: `SettingId`, `MinCount` and `MaxCount` occur nowhere in its
software[^t-touch-favourites-firmware].

**How a value is read**[^t-touch-favourites-firmware]:

* a yes or no setting (`TwelveHourClock`, `AccelFlag`, `ScreenLockFlag`, `EditLock`, `HapticFlag`) is its
  first value, or with none the row's `DefaultValue`, as `"true"` or not
* a number (`ScreenBrightness`, `ScreenTimeout`, `KeyBrightness`, `ActivityPressDuration`) is its first
  value; **the row's `DefaultValue` is never consulted**
* when that leaves nothing, or the row is missing, the firmware's default in the table above; except that
  `HapticEffect` is made text first, so a row present with no value gives the text `nil` and not
  `"13"`[^t-touch-beyond-firmware]

**Two corrections**: this section said the remote reads only the first of `Values` for every
row, and that a row with no value always takes the firmware's default; the background list is read whole
and the vibration effect is the exception above[^t-touch-beyond-firmware].

So the two rows measured with no value and a null default, `ScreenBrightness` and `ScreenTimeout`, take 85
and 10[^t-touch-favourites][^t-touch-favourites-firmware]. The backlight is set to the screen level scaled
to 26 steps, and the keys' light to the key level scaled to 42, each rounded down[^t-touch-favourites-firmware].

**How a value is written**: a change on the remote replaces the row's first value and, if it changed,
hands the whole document up; it adds no row[^t-touch-favourites-firmware]. The hand over is
[usb.md](usb.md). A Settings document saved that way carries no entity tag, so the next sync asks for
Settings untagged and gets the whole document; in the full sync measured, Settings was the one document
asked for without a tag, which is consistent with this, as settings had been changed on the remote
before it; the answer to the hand over carried a tag[^t-touch-favourites][^t-touch-favourites-firmware].

**A background** is drawn from `/data/resources/` when its name is in `UserImages` and from the nine built
in pictures otherwise[^t-touch-favourites-firmware]. A chosen background that is neither is fetched from
`DefaultImageBucketUri` with its twin, and then looked for among the built in pictures, which would not
find it; read, never exercised[^t-touch-favourites-firmware].

### The expiry rule

The expiry stored with a document or picture is the remote's clock when the answer arrived plus the
`max-age` of the answer's `cache-Control` field, and there is none without the
field[^t-touch-favourites-firmware]. Only three kinds of picture consult it: a station logo and a popular
channel's logo, which are not asked for while it lies ahead, and a Sonos or Heos favourite's picture,
which is asked for regardless[^t-touch-favourites-firmware]. None of the 19 documents and pictures written
to the remote in the sync measured carried the field[^t-touch-favourites].

## Not checked

* Anything on this page observed on a remote's screen or its infrared: what the remote does is its
  code[^unchecked].
* Channel tuning settings other than the two measured[^unchecked].
* What a change of favourites made on the remote looks like when it is handed up[^unchecked].
* Whether the code that reads Context's other six fields runs on a Touch synced over USB: the hub,
  network client, pairing, discovery and firmware check code, which decides whether `AccountUri`,
  `Locale`, `DataConsent`, `LatestSLAAcceptedDate`, `Name` and `LatestSLAAccepted` act[^unchecked].
* Whether a Touch reports a vibration motor or a motion sensor[^unchecked].
* Whether Logitech's other client, MyHarmony, sends `cache-Control`, which would let a logo
  expire[^unchecked].
* More than one favourites activity, a speaker, a Sonos, Roku or Heos device, and an antenna only
  service[^unchecked].
* The other products that run the same firmware image, where the screens differ by skin[^unchecked].

[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-touch-favourites]: Measured on a unit. [The test](../../../packages/usb/test/touch-favourites.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^t-touch-favourites-untagged]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites_untagged.py)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-second-sync.test.ts)
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/test_harmony_touch_keys.py)
[^unchecked]: Not checked.
[^t-touch-beyond-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_beyond_the_clients.py)
