# Harmony Touch: the platform

The Harmony Touch belongs to Logitech's last generation of Harmony products. Its firmware is a Linux
system rather than a program for a small microcontroller, it talks to a computer by opening named files
rather than by addressing memory, and it does not take a compiled configuration from the computer: it
fetches its own, through the computer, over the network[^s196][^s198][^s203]. The Harmony Ultimate, Ultimate
One, Ultimate Home, Elite and 950 run the same firmware image, and Logitech's hubs run a sibling of
it[^s196].

**One model of the generation has been read, the Harmony Touch, on one firmware build, 4.15.330.** What this
folder holds is what Logitech states about the generation, what the Touch's firmware image does, read in its
engine and its screens, and what one Touch did on the cable, with Logitech's client and with this project's own
answerer in its place[^s196][^t-touch-from-nothing]. Where a page says the platform, it means that build as the
Touch runs it; the other models of the generation are not checked[^unchecked]. The model's own folder, its keys,
screen and behaviour, is [harmony-touch](../../remotes/harmony-touch/README.md). *Corrected:* this said "This
folder is thin because one model of the generation has been read, and only two of its files"<!--superseded-->,
before the image and the syncs were read.

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 99 | no record in models.ts | no record | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/base/src/models.ts`, and the skins the model folders name by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Which architecture number, 17 or 18

**The two numbers name different things, and nothing on the remote or in Logitech's clients compares
them.** 17 is the number the remote's firmware reports for itself, and it is the number of the software
the remote shares with Logitech's hubs; 18 is the family Logitech's clients file this generation's remotes
under in their templates[^t-touch-arch][^t-touch-arch-client]. This said "The remote and Logitech's
specification disagree, and nothing here settles which is right"<!--superseded--> until the firmware was
read: neither side states the other's number, and nothing checks one against the other, so there is no
disagreement to settle, only two numbers for two things.

| source | number | evidence |
|---|---|---|
| the remote itself, the `arch` field of its `/sys/sysinfo` | **17**, written `0x11` | [^s200] |
| the remote's USB program, which fills that field | 17 when the unit's manufacturing record states no architecture, otherwise the record's | [^t-touch-arch] |
| the remote's engine, its own system information | 17, a fixed string | [^t-touch-arch] |
| the hubs' firmware, the same engine built for their processor | 17, the same fixed string | [^t-touch-arch] |
| concordance, reading the same remote | 17, with protocol 9 | [^s197] |
| Logitech's own protocol templates for skin 99, all 22 of them | **18** | [^s197b] |

**No file of either build of the remote's image names an architecture of 18 under the key `arch`, in
hexadecimal**[^t-touch-arch]. The
image carries a hub's default manufacturing record, at architecture 17 and skin 97, and its USB program
falls back to skin 97, so 17 is not a statement about the Touch's processor or about the Touch: the same
engine, built for an ARM remote and for a MIPS hub, states the same number in both[^t-touch-arch]. That
the hubs had the number first is an inference from that record and that fallback, and no file states
it[^unchecked]. How the field is filled is [firmware.md](firmware.md#the-architecture-number-the-firmware-reports).

**The concordance row is not a second witness**: concordance parses the same field of the same identity
file, as hexadecimal, and keys its own handling of the remote on 17[^x-concordance].

Both readings are right about what they read: the remote states 17 and the templates state 18 for the same
skin[^s200]. The two sources agree on the Harmony One, 12 and 12, and on the Harmony 350, 16 and 16, so the
Touch's two numbers are not an offset between the two numberings[^s197b].

**Nothing in Logitech's clients can notice the difference.** The client parses the template's architecture
into its validator and then compares only the model id and the flash ids against the device, and the one
other place it reads the number, the choice of protocol, gives the same answer for 17 and 18[^s197b]. Harmony
Desktop copies the remote's own `arch` into its model of the unit, and no code reads it back by
name[^t-touch-arch-client]; MyHarmony's decompiled source reads the same way and is not checked by a
test[^unchecked]. A field nothing checks is one that can be wrong for years without anybody
finding out. This reference uses the remote's number, 17, because it was read off the hardware[^d9], and
states both wherever a number is needed.

**Which number a writer would need is not established**[^unchecked]. On the remote the value goes only into
the identity file, and the engine's is a fixed string[^t-touch-arch]; whether anything else on the remote
reads the identity file back is not checked[^unchecked]. What this library writes to this model is the
answers of a sync, through its request rail, [answering a sync](answering-a-sync.md)[^d29]; this said "Nothing in
this library writes to this model"<!--superseded--> until that rail was built.

### The two numbers in Logitech's template map

Logitech's templates name a codename per skin, and they place these skins at the two numbers, counted file
by file[^t-touch-arch-client]:

| architecture | skins, with the codename |
|---|---|
| 17 | 82 Olive, 97 Pimento, 100 JuniperRF, 105 NewCastle, 106 Creemore, 108 NewCastleWhite, 113 Pavarotti, 115 Crackerjack, 400 Creemore |
| 18 | 86 Ravenswood, 99 Juniper, 100 JuniperRF, 102 Harmony Ultimate One, 105 NewCastle, 108 NewCastleWhite, 111 Hops, 112 HopsLite, 116 Orville |

**The remotes' firmware is built for skins at 18 and the hubs' for skins at 17.** Every skin the remotes'
firmware package names, 99, 100, 102, 105, 108, 111 and 112, declares 18 for its identity operation; of the
skins the hubs' package names, 97 and 106 declare 17 in every file and 109 has no templates[^t-touch-arch-client].
Skins 97 and 106 are the two hubs, which Harmony Desktop handles by a path of their own[^s135], and the
update service serves its hub image under both and its Pro 2400 Hub image under 115[^s196]. This said
"Architecture 17 looks like the hubs and 18 like their remotes, and that is not established"<!--superseded-->
until the two packages were set against the map: the split by image holds for every skin that has both,
and what the numbers mean to Logitech is stated nowhere[^unchecked]. Skin 82, Olive, is a rebadge that
Logitech's product table pairs with 83 as a region[^s131], so architecture 17 is not the hubs alone.

**Three skins sit at both numbers, 100, 105 and 108**, and in each it is the same four files at 17, the three
Wi-Fi requests and the device information request, with the other nineteen at 18[^t-touch-arch-client].
This said "Two skins sit at both numbers, 105 and 108"<!--superseded--> until every file was counted: skin 100
had been missed. The device information file of 105 and 108 is one file, naming skin 82 and the codename
Olive, and 100's names the codename Olive too, so templates were copied between skins; a file that names
its skin as these do enforces no model in the client's check[^t-touch-arch-client]. That the Wi-Fi requests
sit at 17 fits a hub and its remote sharing a skin, and is not checked[^unchecked].

## The generation, by Logitech's own lists

| | members | evidence |
|---|---|---|
| Logitech's recovery tool | Touch, Ultimate, Ultimate One, Ultimate Home, Elite, 950, Pro, Home Control, Smart Control and Smart Keyboard, and no model of any older platform | [^s196] |
| one firmware image | the Touch, Ultimate, Ultimate One, Ultimate Home, Elite and 950: skins 99 and 112 receive byte identical files | [^s196] |
| the hub image | skins 97 and 106, byte identical, a different image from the remotes' | [^s196] |
| the file protocol | 19 of the 23 skins Logitech's client specifies: every one but the Harmony One's, the Harmony 700's, the Harmony 510's and one skin that declares no architecture | [^s198] |
| Logitech's own protocol split | architectures 9, 12 and 14 are "legacy" and take the command protocol; every other number, 17 and 18 among them, takes the file protocol | [^s197b] |

**The file protocol is not this generation's alone.** The Harmony 300 and 350, architecture 16, speak it
too, on a microcontroller image rather than Linux[^s196]; their platform is
[harmony-300-350](../harmony-300-350/README.md).

## A long press arrives with this generation

A long press is a second action on one key, chosen by how long the key is held, and a key with one cannot
also repeat, [how a Harmony works](../../how-a-harmony-works.md). **Logitech's product table declares it
for fifteen skins, and none of them is one of the older models**: the Touch, skin 99, is among them,
with the Ultimate, Ultimate One, Ultimate Home, Elite, 950, Pro 2400, Smart Control, Smart Keyboard, Home
Control and Express[^t-long-press]. The Harmony 350, skin 104, declares it as well and is not of this
generation[^t-long-press].

On a Touch a key with a long press sends nothing on the press: its long action fires on the first hold report at least 550 ms after the press, about 600 ms in practice since a held key is reported every 300 ms, and its short action on release, [activities and buttons](activities-and-buttons.md#holding-a-key-and-the-long-press)[^t-touch-activities-firmware]. Which keys the client lets one be given to is not checked[^unchecked].

## The files

| file | what it holds |
|---|---|
| [firmware.md](firmware.md) | the images Logitech serves for this generation, what the remotes' image holds, the architecture number it reports, the factory images, and recovery: a configuration that fails to load, a sync that stops halfway, the remote's own factory reset and Logitech's routes |
| [usb.md](usb.md) | the file protocol as this generation speaks it, the `MD5` write check, provisioning instead of a compile, and a sync of Logitech's client both ways |
| [devices-and-infrared.md](devices-and-infrared.md) | the device and protocol lists, how a command becomes infrared on the remote, a device and definitions of ours, the identifiers of ours, the catalogue's fields and the person's, and what a writer must carry |
| [activities-and-buttons.md](activities-and-buttons.md) | the activities and button maps: key presses, the long press, the number pad, gestures, sequences, the start and switch order, an activity of ours, taking one out, a whole setup of ours, no activity at all, and the fields nothing reads |
| [favourites-and-settings.md](favourites-and-settings.md) | the Context and Settings documents, the favourite channels and the pictures, field by field, and what each composed by a program did |
| [answering-a-sync.md](answering-a-sync.md) | answering a Touch's sync in place of Logitech's server: a sync end to end, what the remote checks of an answer, what an answerer refuses, how a sync aborts and commits, the syncs this project ran, the smallest set of documents and what a commit keeps, entity tags, the direct resource put, and which request names act |
| [api/README.md](api/README.md) | the remote's whole interface as an API: the names its USB program answers and every request its engine registers, each with what it does, its parameters and its answer |

### The documents a sync delivers, and where each is described

A Touch's configuration is the documents it asks for in a sync, each JSON, and pictures, each a PNG; the six
configuration documents are asked for in every sync down, the favourites documents and pictures only when the
remote needs them[^t-touch-sync][^t-touch-host]:

| what | what it holds | its page |
|---|---|---|
| `ActivityList` | the activities: their roles, inputs, power orders, start and end steps | [activities and buttons](activities-and-buttons.md) |
| `MapList` | a button map per device and per activity: keys, screen entries, gestures, sequences | [activities and buttons](activities-and-buttons.md) |
| `DeviceList` | the devices: their records, features and commands | [devices and infrared](devices-and-infrared.md) |
| `ProtocolList` | a definition per code family the commands use | [devices and infrared](devices-and-infrared.md) |
| `Context` | the account: its number, language and the address of the user's favourites | [favourites and settings](favourites-and-settings.md#context) |
| `Settings` | the remote's own settings: brightness, timeout, background, clock | [favourites and settings](favourites-and-settings.md#settings) |
| the user's favourites, a device's favourites, the provider's line up | the favourite channels, their numbers and names, and the channels on offer | [favourites and settings](favourites-and-settings.md#favourite-channels) |
| pictures | the user's backgrounds and their small twins, the channel logos | [favourites and settings](favourites-and-settings.md#pictures) |

How each is asked for and answered is [answering a sync](answering-a-sync.md).

There is no memory page: no address a host can name has been read on this generation, and what a Touch
answers is a set of paths, [the model's memory page](../../remotes/harmony-touch/memory.md).

## Not checked

* Which number Logitech's service files the Touch under; its product capabilities for skin 99 would
  say[^unchecked].
* Which number a writer would need, and whether anything on the remote reads its identity file
  back[^unchecked].
* Whether MyHarmony reads the remote's `arch` back anywhere, and whether either client serialises its
  model of the unit somewhere a property is read without its name[^unchecked].
* Whether a Touch's manufacturing record states an architecture at all; its reported value is 17
  either way[^unchecked].
* Whether the other members of the generation report 17. Through the engine, any remote running this
  image does[^t-touch-arch]; through the USB program it is each unit's record[^unchecked].
* Which DA850 variant the processor is; the image's layout and the rest of what it says about the
  hardware are [firmware.md](firmware.md#the-remotes-package)[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s197]: Measured on a unit. [Section 197](../../../docs/findings.md#s197)
[^s197b]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^d9]: Chosen by this project. [Decision 9](../../../docs/decisions.md#d9)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/base/test/models.test.ts)
[^t-touch-arch]: Read in the firmware. [The test](../../../tests/test_harmony_touch_architecture.py)
[^t-touch-arch-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_architecture.py)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_activities.py)
[^t-touch-from-nothing]: Measured on a unit. [The test](../../../packages/bench/test/touch-from-nothing-runs.test.ts)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-host]: Read in the firmware. [The test](../../../tests/test_harmony_touch_host.py)
[^d29]: Chosen by this project. [Decision 29](../../../docs/decisions.md#d29)
[^unchecked]: Not checked.
