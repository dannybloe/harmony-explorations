# Logitech's software update service

Logitech kept its remotes' firmware on a service of its own, separate from the one that holds accounts
and compiles configurations. It is still running and it hands a firmware image to anyone who asks with
the right header: no login, no account and no registered remote[^s196]. It serves the generation of
remotes that runs Linux and the Harmony 300 and 350; the older remotes of MyHarmony's generation took
their firmware from a list on Logitech's file server instead, and that list still names versions whose
images are no longer served[^x-versiondb][^unchecked].

What each image is lives with the platform it runs on: [the Harmony 300 and 350's
firmware](../architectures/harmony-300-350/firmware.md) and [the Linux generation's
firmware](../architectures/harmony-touch/firmware.md). This page is the service.

## The service

The address is `sus.dhg.myharmony.com`, and its paths are templates in the configuration service's own
Discovery listing[^s196]:

    https://sus.dhg.myharmony.com/SoftwareUpdatesPlatform/SoftwareUpdates/product/{productId}/unit/{unitId}/image/latest
    .../product/{productId}/unit/{unitId}/features
    .../product/{productId}/unit/{unitId}/info
    .../product/{productId}/unit/{unitId}/streams
    .../getUpdates

**`{productId}` is the skin, and `unit/0` is accepted**, so neither a serial nor a registered remote is
needed. `image/latest` takes `channel` and `criticalOnly` and answers with an identifier, a size and a
download address on Logitech's content network, which needs no header of its own. `info` and `streams`
answer 404 for unit 0[^s196].

**Every request needs the header `Logitech-SUS-Key`**, whose forty character value Harmony Desktop's web
application carries as `susKey`[^s196b]. Without it every path answers 404 or 403, which is exactly what a
service that no longer exists would answer, so the absence of a reply says nothing until a client's own
headers have been copied[^s196].

**Two channels exist and no more**, `production` and `preview`, which return different builds. Any other
channel name returns the production build with no error, `xmpp` and `xmppupdate` among nine tried, so a
claim about a channel needs two names that disagree[^s196].

`features` returns the current and latest feature sets, 33 features for a hub, none of them naming
XMPP[^s196].

## What it serves

Eleven images: nine packages of the Linux generation, among them the remotes' image and the hubs', and
one image for the Harmony 300 and 350 under skin 104[^s196]. **One image serves a whole family**: skins
99 and 112 receive the same file, as do skins 97 and 106[^s196]. What a package of the Linux generation
holds is [that generation's firmware](../architectures/harmony-touch/firmware.md): the one opened, the
hubs', carries an updater for a 32 bit big endian MIPS processor and a squashfs root
filesystem[^unchecked], and the remotes' package has not been opened. The skin 104 image is an ordinary
PIC18 firmware in the same package format as the older remotes' `.hfw` files, and its manifest states its
checksum's seed and algorithm, [its page](../architectures/harmony-300-350/firmware.md)[^s196].

**Eight skins have no image on either channel**: 78 and 104 by the factory route below, 98, 101, 107,
109, 113 and 114[^s196].

**A second route, with no key, serves factory images only**: the content network's
`Firmware/<skin>/firmware_factory.hfw2` serves skin 99 and skin 106 and answers 403 for every other
skin[^s196].

## The recovery tool that names it

Both of Logitech's newer desktop clients carry a hidden recovery tool, and they are not the same
tool[^s196b].

| | MyHarmony, the Windows client | Harmony Desktop's web application |
|---|---|---|
| reached by | Alt-F9 after signing in | shift plus double click on the title bar |
| what it is | a live page, `https://setup.myharmony.com/remoterecoverytool/DefaultRRT.html`, named inside the client | a view inside the client's bundle |
| offers | factory and latest firmware for ten products, plus `recoverproducttolatest`, `unpair` and `xmppupdate` | factory reset, update firmware, recover product, unpair |
| XMPP | a firmware install button | an in app toggle under hub settings, labelled a developer option |

The older tool's buttons each load `recover.aspx?<mode>`, and those pages are byte identical except for
the mode handed to a Silverlight utility, with the update service's address beside it[^s196]:

    SUSAddress=https://sus.dhg.myharmony.com, SUSChannel=production, Mode=<mode>,
    TargetFW=, SpecialSUSStream=preview, discoveryServiceUrl=https://svcs.myharmony.com

**The ten products are the Linux generation only**: Touch, Ultimate, Ultimate One, Ultimate Home, Elite,
950, Pro, Home Control, Smart Control and Smart Keyboard. Its factory reset installs a whole firmware
image rather than sending the remote a command, [the Linux generation's
firmware](../architectures/harmony-touch/firmware.md)[^s196].

**What `xmppupdate` installs is not established.** It is the only mode with no product named, and the
hub's preview build, 4.15.250, against production's 4.15.600, fits the public episode in which a hub
firmware removed the local XMPP interface and a later one restored it as a developer option; but no
feature on either channel names XMPP, and the preview parameter is passed by every mode rather than by
that one[^s196].

## MyHarmony's own version list

MyHarmony's generation does not ask the update service. The client reads a list,
`https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml`, and builds each download from the
address it states under `https://files.myharmony.com/Assets/`[^unchecked]. The list names fifteen
skins[^x-versiondb]:

| model | skin | firmware the list names |
|---|---|---|
| Harmony One | 54 | 3.4 |
| Harmony 510, in two skins | 67, 68 | 1.2 |
| Harmony 300, in two regions | 78, 79 | 1.4.0 |
| Harmony 700 | 66 | 2.8 |
| Harmony 600 | 71 | **0.3** |
| Harmony 650 | 72 | 0.4 |
| Harmony 665 | 75 | 0.5, with a download address naming 0.4 |
| Harmony 200, in two regions | 80, 81 | 2.8.0 |
| skin 82, named Olive in the list | 82 | 1.1.8 |
| skin 86, named Ravenswood in the list | 86 | 0.8.9 |
| skin 97, the Ultimate Hub | 97 | 0.1 |
| Harmony 350 | 104 | 1.4.0 |

**The images it names are not served**: the list answers, as do other files on that server, and the
firmware images it points at answer 404[^unchecked]. For the Harmony 600 the list names 0.3, a version
newer than the 0.2 [its firmware page](../remotes/harmony-600/firmware.md) describes.

## Not checked

* Whether a firmware image the list names was ever needed before MyHarmony would program a
  remote[^unchecked].
* What the remotes' package of the Linux generation runs on[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../docs/findings.md#s196)
[^x-versiondb]: Stated by Logitech. [MyHarmony's firmware version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^unchecked]: Not checked.
[^s196b]: Stated by Logitech, in their client. [Section 196](../../docs/findings.md#s196)
