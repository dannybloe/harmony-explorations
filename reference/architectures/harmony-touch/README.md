# Harmony Touch: the platform

The Harmony Touch belongs to Logitech's last generation of Harmony products. Its firmware is a Linux
system rather than a program for a small microcontroller, it talks to a computer by opening named files
rather than by addressing memory, and it does not take a compiled configuration from the computer: it
fetches its own, through the computer, over the network[^s196][^s198][^s203]. The Harmony Ultimate, Ultimate
One, Ultimate Home, Elite and 950 run the same firmware image, and Logitech's hubs run a sibling of
it[^s196].

**This folder is thin because one model of the generation has been read, and only two of its files.**
What it holds is what Logitech states about the generation and what a Harmony Touch showed on the cable.
The model's own folder, its keys, screen and behaviour, is
[harmony-touch](../../remotes/harmony-touch/README.md).

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 99 | no record in models.ts | no record | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts`, and the skins the model folders name by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Which architecture number, which is the open question

**The remote and Logitech's specification disagree, and nothing here settles which is right.**

| source | number | evidence |
|---|---|---|
| the remote itself, the `arch` field of its `/sys/sysinfo` | **17**, written `0x11` | [^s200] |
| concordance, reading the same remote | 17, with protocol 9 | [^s197] |
| Logitech's own protocol templates for skin 99, all 22 of them | **18** | [^s197b] |

Both readings are right about what they read: the remote states 17 and the templates state 18 for the same
skin[^s200]. The two sources agree on the Harmony One, 12 and 12, and on the Harmony 350, 16 and 16, so this
is one disagreement and not an offset between the two numberings[^s197b].

**Nothing in Logitech's client can notice it.** The client parses the template's architecture into its
validator and then compares only the model id and the flash ids against the device, and the one other place
it reads the number gives the same answer for 17 and 18[^s197b]. A field nothing checks is one that can be
wrong for years without anybody finding out. This reference uses the remote's number, 17, because it was
read off the hardware[^d9], and states both wherever a number is needed.

**Which number a writer would need is not established**[^s200], and nothing here writes to this model.

### The two numbers in Logitech's template map

Logitech's templates name a codename per skin, and they place these skins at the two numbers[^s197b]:

| architecture | skins, with the codename |
|---|---|
| 17 | 82 Olive, 97 Pimento, 105 NewCastle, 106 Creemore, 108 NewCastleWhite, 113 Pavarotti, 115 Crackerjack, 400 Creemore |
| 18 | 86 Ravenswood, 99 Juniper, 100 JuniperRF, 102 Harmony Ultimate One, 105 NewCastle, 108 NewCastleWhite, 111 Hops, 112 HopsLite, 116 Orville |

**Architecture 17 looks like the hubs and 18 like their remotes, and that is not established.** Skins 97 and
106 are the two hubs, which Harmony Desktop handles by a path of their own[^s135], and the update
service serves its hub image under both and its Pro 2400 Hub image under 115[^s196]. The Touch, skin 99 and codename Juniper, is at 18 in
the map and reports 17 itself. Two skins sit at both numbers, 105 and 108, which fits a hub and its remote
sharing a skin and is not checked[^s197b]. Skin 82, Olive, is a rebadge that Logitech's product table pairs
with 83 as a region[^s131], so architecture 17 is not the hubs alone.

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

Which keys take one on a Touch, and how long the press is, is **not checked**[^unchecked].

## The files

| file | what it holds |
|---|---|
| [firmware.md](firmware.md) | the images Logitech serves for this generation, the factory images, the recovery tool's network reset |
| [usb.md](usb.md) | the file protocol as this generation speaks it, the `MD5` write check, provisioning instead of a compile |

There is no memory page: no address a host can name has been read on this generation, and what a Touch
answers is a set of paths, [the model's memory page](../../remotes/harmony-touch/memory.md).

## Not checked

* Which architecture number is right, and whether anything a writer would do depends on it[^unchecked].
* Whether the other members of the generation report 17 or 18 for themselves[^unchecked].
* The processor, and everything inside the firmware image[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s197]: Measured on a unit. [Section 197](../../../docs/findings.md#s197)
[^s197b]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^d9]: Chosen by this project. [Decision 9](../../../docs/decisions.md#d9)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^unchecked]: Not checked.
