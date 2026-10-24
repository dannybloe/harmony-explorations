# Harmony Touch: the platform's firmware

The firmware of this generation is a Linux system, delivered by Logitech's software update service as one
package per family of products[^s196]. Nothing in this reference has opened one, so this page is about the
packages from the outside: which products share which image, which versions exist, and how Logitech
returns a remote of this generation to its factory state. The model's own page, with the version a Touch
reports about itself, is [the Touch's firmware](../../remotes/harmony-touch/firmware.md). How the update
service is reached is [Logitech's update service](../../logitech/update-service.md).

## The images

| image | serves | production | preview | evidence |
|---|---|---|---|---|
| the remotes' image | the Touch, Ultimate, Ultimate One, Ultimate Home, Elite and 950 | 4.15.330, 13041774 bytes | 4.15.250 | [^s196] |
| the hubs' image | skins 97 and 106 | 4.15.600 | 4.15.250 | [^s196] |

**One image serves a whole family, and that is measured rather than read off the sizes**: the file served
for skin 99, the Touch, and the file served for skin 112, the 950, are byte identical, and so are the files
for skins 97 and 106. Only the download's name differs per skin[^s196]. A Harmony Touch reports 4.15.330
for itself, the production build exactly[^s200].

**Two channels exist, production and preview, and no others.** Nine invented channel names, among them
`xmpp` and `xmppupdate`, all return the production build without an error, so a wrong channel name is a
wrong answer rather than a refusal[^s196].

Eight skins have no image on either channel: 98, 101, 107, 109, 113 and 114 of this generation, and 78 and
104, the Harmony 300 and 350, by this route[^s196].

### What is in a package

**The checksum a package states is `MD5`**, where the Harmony 300 and 350's package states an XOR of 16 bit
words; the descriptor is one shape across both, so the algorithm is a field and not a constant. The Touch's
package and the 950's state the same `MD5` over the same length[^s198]. How the remote is handed that
checksum is [usb.md](usb.md).

The hub package is a ZIP holding a manifest and an update file that is itself a ZIP of five members: two
digest lists, an updater program for a 32 bit big endian MIPS processor, a compressed kernel image whose
header names it `Pimento Kernel Image`, and a squashfs root filesystem[^unchecked]. Pimento is the codename
Logitech's templates give skin 97[^s197]. The updater is byte identical between the hubs' preview build and their
production build[^unchecked].

The remotes' package has not been opened, and its processor is **not checked**[^unchecked].

## The factory images

**Logitech publishes two factory images with no key at all**, on its content network at
`Firmware/<skin>/firmware_factory.hfw2`: one for skin 99, the Touch, and one for skin 106, a hub. Every
other skin answers 403 there[^s196].

## A factory reset is a firmware install

**Logitech's way to return a remote of this generation to its factory state is not a command.** A hidden
recovery tool in both of their desktop clients offers a factory reset per product, and the reset installs
a whole factory firmware image fetched over the network[^s196]. That is why a search of the command
protocol could never have found one, [the commands](../../usb-protocol/commands.md). A Touch reset this way
holds a configuration of zero bytes[^s195].

The tool's product list is this generation and nothing older: Touch, Ultimate, Ultimate One, Ultimate Home,
Elite, 950, Pro, Home Control, Smart Control and Smart Keyboard, each with a factory and a latest firmware
button[^s196].

**Two paths on a Touch act when they are opened**, `/sys/factoryreset` and `/sys/reboot`[^s200]. They are
the remote's own reset and restart, not Logitech's recovery route, and why opening them is refused is
[the Touch's usb.md](../../remotes/harmony-touch/usb.md).

## The XMPP update

The older recovery page carries a mode with no product attached, `xmppupdate`[^s196]. It is aimed at the
hubs: a hub's local control interface is the subject, and a Touch has no network interface for one to
listen on[^s196]. **What it installs is not settled.** The hubs' preview build is pinned at 4.15.250 while
production is at 4.15.600, which fits a firmware kept for its old behaviour and does not show it; the
preview parameter appears in every recovery mode, so it does not single this one out[^s196].

## Not checked

* The contents of the remotes' image, its processor, and where on a remote the firmware and the
  configuration live[^unchecked].
* A safe mode or a bootloader on this generation[^unchecked].
* Whether the update service serves a different build to a registered unit than to the anonymous
  request[^unchecked].
* What `xmppupdate` installs[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s198]: Stated by Logitech, by their service. [Section 198](../../../docs/findings.md#s198)
[^unchecked]: Not checked.
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
