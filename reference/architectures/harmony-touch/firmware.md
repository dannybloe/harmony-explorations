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

The service has two channels, production and preview, and six skins of this generation, 98, 101, 107, 109,
113 and 114, have no image on either; both are [the update service](../../logitech/update-service.md#the-service)[^s196].

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

### The remotes' package

**The remotes' package is a Linux system for TI's DA850, with a signature over what runs**, and two
builds of it, production 4.15.330 and preview 4.15.250, are laid out alike[^t-touch-image]. This said the
package had not been opened and its processor was not checked until the image was read.

* **The package** is a ZIP holding a descriptor and one update file. The descriptor sends that file to
  the path `/fw/otaupdate` as a firmware upgrade, states its length and its `MD5`, both of which match the
  file, names skins 99, 100, 102, 105, 108, 111 and 112 as the ones it is for, and asks for a reset
  afterwards[^t-touch-image].
* **The update file** holds five members, `sdigest`, an updater program, `uImage.bin`, a squashfs root
  filesystem and `digest`, the same five names as the hubs' production package. `digest` lists a `SHA-1`
  for each of the other four, and each matches[^t-touch-image].
* **`sdigest` is an RSA signature**, 2048 bits, over the `digest` lines of the three members that run: the
  updater, the kernel and the root filesystem. The public key that checks it is inside the root filesystem,
  the same key in both builds, and the hubs' production package is signed with the same key. So the
  signature shows those three are what the key's holder signed; it says nothing about who that
  is[^t-touch-image].
* **The updater and the kernel are for ARM**, little endian, where the hubs' updater is a big endian MIPS
  executable: a Linux 2.6.37 kernel in a U-Boot image, and an ARM executable. Every build path inside the
  compiled engine names a toolchain for the ARMv5TE instruction set[^t-touch-image].
* **The processor is TI's DA850**, of the DaVinci family, with an ARM926EJ-S core. The kernel names that
  core, and its board code for `juniper`, the codename, is DA850 code that sets up the infrared, the LCD, the
  radio, the touch controller and the MSP430 below. The boot loader's arguments name the DaVinci NAND flash
  driver and tell the kernel to use 64 MiB of memory. Which DA850 variant, and how much memory is fitted, are
  **not checked**[^t-touch-image][^unchecked].
* **The image carries firmware for three other parts**, named by their files and drivers: an MSP430
  microcontroller, which the start up script programs when the part reports no version or a different one; a
  chip its Logitech driver calls CC2544, which that driver programs; and a touch controller, whose driver
  describes itself as a ClearPad driver, which the start up script programs only when the controller reports
  one particular version. The start up script also hands the boot loader file to an updater on every
  start[^t-touch-image]. Of these, the MSP430 reports the keypad's keys and the touch controller gives the
  two zones above the screen, Home and Favorites, [the model's keys](../../remotes/harmony-touch/keys.md#the-key-numbers)[^t-touch-keys].
* **The remote's own program is Lua.** Every Lua file of its engine is compiled Lua 5.1 in the stock layout
  with 8 byte numbers, but for one header byte, the flag stock Lua writes as 0 or 1 for integer numbers,
  which is 4 in every file; the engine's
  module names include a user configuration reader and a proxy for the sync; no Lua file of its screens is
  compiled[^t-touch-image].

## The architecture number the firmware reports

**The firmware reports 17 for itself, by two routes**, and no file of either build of the remotes' image
names an architecture of 18 under the key `arch`, in hexadecimal[^t-touch-arch]. Logitech's templates file the same skins under 18, and what the two numbers
are is [the platform's README](README.md#which-architecture-number-17-or-18).

* **The identity file is filled from the unit's own record.** `/sys/sysinfo` is answered by the remote's
  native USB program, `usr/bin/hal`, which builds the answer once, at start. It fills a record with
  defaults, architecture 17, skin 97, vendor `0x046D`, product `0xC12B` and hardware version `99.00`, and
  then overwrites them from the unit's manufacturing record: the flash partition named `mfg`, read from
  offset 36864 when it opens with the magic `harmony!`, as length prefixed keys and values. The record's
  `arch` is parsed as hexadecimal into the architecture's slot, and that slot is written into the identity
  file as two hex digits. **So 17 is the fallback**, and what a unit reports is its record's `arch` when
  the record has one[^t-touch-arch]. The one Touch whose identity file was read reports skin 99 where the
  fallback is 97, so on that unit the record was read[^s200]; whether that record states an architecture
  is not checked, and the value it reports is 17 either way[^unchecked].
* **The engine states 17 as a fixed string.** The Lua engine's own system information answer carries
  `arch=0x11` as a literal; it takes the skin, the vendor, the product and the unit id from the
  manufacturing record and never its architecture[^t-touch-arch]. What can ask the engine for it on a
  Touch is not checked[^unchecked]. In the production build the same module treats a unit whose host name
  is `juniper` as having no network; the preview build's module holds no such test[^t-touch-arch].
* **Nothing else in the image states an architecture.** Over every file of both builds, `arch=0x` occurs
  in the engine's handler alone and `arch=0x12` nowhere; `arch` as a name of its own occurs only in the
  USB program and the default record below, and elsewhere only as the Lua runtime's processor name and in
  prose[^t-touch-arch].
* **The image carries a hub's default manufacturing record**, the one the engine falls back to when the
  partition holds no valid record. Its keys are `unitid`, `arch`, `skin`, `usb_vendor_id`,
  `usb_product_id`, `hw_ver`, `key` and `cert`; its architecture is 17, its skin 97, which is Pimento in
  Logitech's templates[^s197], and its product `0xC129` where the Touch's is `0xC12B`[^t-touch-arch]. It
  holds a private key and a certificate, and nothing else of it is read here.
* **The hubs' image states the same 17.** The hubs' production image 4.15.600, whose package names skins
  97, 106 and 109, carries the same engine handler built for a MIPS toolchain, with the same fixed string,
  and the same default record byte for byte[^t-touch-arch]. Its root filesystem is squashfs with LZMA blocks
  whose header lacks the size field, so `unsquashfs` refuses it; each block decodes once the size is given
  as unknown, and the decoded blocks tile the data up to the inode table exactly[^t-touch-arch]. What the
  hubs' own native USB program falls back to was not read[^unchecked].

## The factory images

**Logitech publishes two factory images with no key at all**, one for skin 99, the Touch, and one for skin
106, a hub; where, and what every other skin answers, is [the update service](../../logitech/update-service.md#what-it-serves)[^s196].

## A factory reset is a firmware install

**Logitech's way to return a remote of this generation to its factory state is not a command.** A hidden
recovery tool in both of their desktop clients offers a factory reset per product, and the reset installs
a whole factory firmware image fetched over the network[^s196]. That is why a search of the command
protocol could never have found one, [the commands](../../usb-protocol/commands.md). A Touch reset this way
holds a configuration of zero bytes[^s195].

The tool offers this generation and nothing older, [the recovery tool](../../logitech/update-service.md#the-recovery-tool-that-names-it)[^s196].

**Two paths on a Touch act when they are opened**, `/sys/factoryreset` and `/sys/reboot`[^s200]. They are
the remote's own reset and restart, not Logitech's recovery route, and why opening them is refused is
[the Touch's usb.md](../../remotes/harmony-touch/usb.md).

## The XMPP update

The older recovery page carries a mode with no product attached, `xmppupdate`, aimed at the hubs: a hub's
local control interface is the subject, and a Touch has no network interface for one to listen on. What it
installs is not settled, [the recovery tool](../../logitech/update-service.md#the-recovery-tool-that-names-it)[^s196].

## Not checked

* Which DA850 variant the remotes run on, the memory fitted, and the size of their flash[^unchecked].
* Where on a remote the configuration lives, and in what form[^unchecked].
* A safe mode or a bootloader on this generation[^unchecked].
* Whether the update service serves a different build to a registered unit than to the anonymous
  request[^unchecked].
* What `xmppupdate` installs[^unchecked].
* What the hubs' native USB program reports as its architecture when a hub's record states none[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s198]: Stated by Logitech, by their service. [Section 198](../../../docs/findings.md#s198)
[^unchecked]: Not checked.
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^t-touch-image]: Read in the firmware. [The test](../../../tests/test_harmony_touch_image.py)
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/test_harmony_touch_keys.py)
[^t-touch-arch]: Read in the firmware. [The test](../../../tests/test_harmony_touch_architecture.py)
