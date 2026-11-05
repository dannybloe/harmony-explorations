# Harmony Touch: the platform's firmware

The firmware of this generation is a Linux system, delivered by Logitech's software update service as one
package per family of products[^s196]. This page is about the packages, which products share which image,
which versions exist and what one holds, and about how a remote of this generation is brought back when a
configuration goes wrong, by its own means and by Logitech's. The model's own page, with the version a Touch
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
  manufacturing record and never its architecture[^t-touch-arch]. On a Touch the request
  `harmony.system?systeminfo` asks the engine for it, over `/sys/hlapi`, and passes the default check there,
  [system](api/system.md#harmonysystemsysteminfo)[^t-touch-api-setup]; it has not been sent to a
  unit[^unchecked]. In the production build the same module treats a unit whose host name
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

## Recovery

**A configuration that goes wrong stays a configuration problem**: the stored documents live on a writable
layer over a read only system, and nothing a configuration holds reaches the kernel, the root filesystem or
the boot loader[^t-touch-recovery]. For a document that is missing or is not valid JSON the engine's sync
requests keep answering over the cable and the next sync replaces it[^t-touch-recovery]. **Two cases a sync
cannot repair on its own** come from a document that is valid JSON and lacks a list the reader walks, one at
start and one during a sync, both below, and both end in a restart. All of this is read in the production
build 4.15.330, and **one route has been run on a remote**: a sync stopped halfway, cleared by the abort and
the restart over the cable, [below](#a-sync-that-stops-halfway)[^t-touch-first-sync]. The configuration that
fails to load has not been tried[^unchecked].

### A configuration that fails to load

**A stored set fails in one of two ways, and they end differently.** A document that is missing or is not
valid JSON makes the load return nothing: the engine signals a configuration failure and carries on
with no configuration, so a sync works as usual. A document that is valid JSON but lacks a list the reader
walks makes the reader raise an error, and nothing in the task that loads the configuration catches it, so
that task ends. The remote does not restart itself over it: the watchdog's file is fed by a task of its own,
which is read on the engine's side, and that the native watchdog program then has nothing to act on is
inferred from its strings, its control flow not being decoded[^t-touch-recovery].

**An error at start** ends the task before it has registered for anything, and then:

* every request that waits for the configuration never answers: 23 of the 31 `harmony.engine?` requests, the
  ones [the engine](api/engine.md) lists with `WaitAccountRegistered`, the four `control.button?` requests and
  `connect.discoveryinfo?get`, [the checks before a handler](api/README.md#the-checks-before-a-handler);
* the sync requests still answer, because on a Touch the local connection is started without waiting for the
  configuration and every connection is served on its own;
* **but every sync aborts at its end**, because the reload of the new set finds nothing to load it, so a sync
  cannot move a remote off a set that raises at start. The abort empties the queue and announces the failure
  and does not clear the sync flag; the remote's screens answer that announcement with `proxy.abort` while
  they hold a sync as running, which clears it, and a sync they do not hold that way leaves it set, so that
  `setup.sync` answers 202 until `proxy.abort` or a restart[^t-touch-recovery];
* two requests reach the stored documents anyway, `setup.sync?deleteresources`, which deletes them all, and
  `proxy.resource?put`, which saves the one document it carries before it tries a reload; a restart then
  loads what is left[^t-touch-recovery].

**An error during a sync**, when the remote tries the gathered set: the remote tries it as soon as the last of
the six answers is saved, **before the commit**, which is `proxy.finished`, sent by the remote's own screens
once the content and pictures are in. So the sync aborts uncommitted and the committed set is untouched on
disk. The abort's own reload never returns, so the abort is never answered and `proxy://Abort` is never
queued, and a second sync's last write never gets its answer and leaves the sync flag set. A restart loads
the committed set again[^t-touch-recovery]. **The commit loads nothing first**: a `proxy.finished` sent while
the flag is still set commits the gathered set whatever its reload did, and the next start then meets it as
a set that raises at start[^t-touch-recovery].

**The restart over the cable** is `setup.firmware?reboot`, [setup](api/setup.md#setupfirmwarereboot): it
restarts the remote two seconds later without involving the task that loads the configuration, so it reaches
a remote whose configuration task has ended. It answers 202 while a sync flag is set, and `proxy.abort`
clears the flags first[^t-touch-recovery].

**No previous set is kept.** A commit removes the old set as soon as the new one is in place, and every start
deletes the set gathered for a sync, so a committed set that raises at start does so at every start until it
is deleted or replaced[^t-touch-recovery].

### A sync that stops halfway

* **Before the commit, with the remote left running**, the sync flag stays set and `setup.sync` answers 202;
  no timeout clears it, and `proxy.abort` does, [proxy](api/proxy.md#proxyabort)[^t-touch-recovery].
* **A restart before the commit** deletes the set aside and clears the flag; of the requests queued for the
  account only the puts are kept across a restart[^t-touch-recovery].
* **After the commit**, the new set is in place before `proxy://Finished` is queued, so a sync stopped there
  has done its work, [answering a sync](answering-a-sync.md#how-a-sync-aborts-and-how-an-answerer-learns-of-it)[^t-touch-host].
* **Power lost inside the commit**, between its two renames, leaves the remote starting with no configuration
  and the engine running, so a sync works; this is inferred from the order of the renames and the start's
  cleanup, not tried[^t-touch-recovery].

**Measured on a unit, the first of these**: a sync stopped by its answerer before its commit, after the remote
had taken the six configuration documents and asked for its favourites. `harmony.engine?getconfighash` then
answered 202, "sync in progress"; `proxy.abort` answered 200; the same read then answered 200 with the stored
documents' tags unchanged from before the sync, so the abort cleared the flag and touched no stored document;
and `setup.firmware?reboot` answered 200, after which the remote started normally[^t-touch-first-sync]. So the
order the reading gives, the read first, the abort, the read again and the restart, holds on a unit for a sync
stopped before its commit. A sync stopped inside the hand over, a configuration task that has ended, and the
deletion of the stored documents have not been tried[^unchecked].

### The remote's own factory reset

**A factory reset erases the data and the cache volumes and nothing else.** Every document, the index, the
provisioning and the engine's state live on the data volume, the firmware drop and the reset marker on the
cache volume; the kernel, the root filesystem, the boot loader and the unit's manufacturing record stay. The
reset runs in the kernel's built in start program before the root and data volumes are mounted: armed by the
kernel's arguments, before anything is mounted, and armed by the marker, once the cache volume that holds the
marker is[^t-touch-recovery]. **Afterwards the remote is not provisioned**, so `setup.sync` refuses with
501, [the checks before a handler](api/README.md#the-checks-before-a-handler)[^t-touch-api-setup]. What
provisions it again is inferred: Logitech's client by its own flow, and the request that does it is
`setup.account?provision`, which any host on the cable can send[^t-touch-recovery].
**The remote's own Settings screen says otherwise**: its text says the reset removes devices and activities
and keeps the account, where the reading has the provisioning, and with it the link to the account, erased
with the rest of the data volume. Either the text is wrong or the erase spares something not read; a unit
that refuses a sync with 501 after the reset would settle it for the reading[^unchecked].

**Three things arm it**[^t-touch-recovery]:

* **the marker** `/cache/factoryreset`, which a write to `/sys/factoryreset` creates,
  [the names](api/names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api-names], and which the
  Settings reset on the remote's own screen creates;
* **the restart's word**: the native restart passes `factoryreset` to the kernel when the marker exists, and
  `upgrade` when a firmware drop does. The kernel's power controller driver holds the same two words; that it
  hands them to the controller as the reason for the restart is inferred;
* **the boot loader**, which reads the power controller's reason and key state at start and adds
  `factoryreset` to the kernel's arguments when the reason is 2, or when the keys held are exactly Off and
  Menu. That bit 0 is Off and bit 19 Menu is the kernel's numbering,
  [the keys](../../remotes/harmony-touch/keys.md#the-key-numbers)[^t-touch-keys], and that the boot loader
  numbers them the same is inferred from both calling bit 0 the power button. Reason 1 is a firmware upgrade.

**The remote's own screens offer two resets and no plain restart.** Settings has a factory reset, except in
demo mode, which creates the marker and restarts with the word. A data error screen, shown when the screens'
first window fails to load or their window stack empties, offers a factory reset that restarts with the
word and does not create the marker, so it rests on the word reaching the boot loader[^t-touch-recovery].

### Logitech's recovery routes

**Logitech's two clients bring a remote of this generation back in two different ways**, and both go through
the native program's paths rather than the engine, so neither needs the configuration
task[^t-touch-recovery-client]:

* **MyHarmony's "Recover Remote"** installs a firmware update and, when that succeeds, writes `1` to
  `/sys/factoryreset` and `reboot` to `/sys/reboot`. Harmony Desktop carries the same reset. A separate
  operation of theirs writes `all` to `/sys/factoryreset` and does not restart; what the remote's handler does
  differently with the two is not read[^t-touch-recovery-client].
* **Harmony Desktop's recovery view** installs the factory image,
  [the factory images](#the-factory-images), through the ordinary firmware install and sends no
  reset[^t-touch-recovery-client].

**A firmware install keeps the documents by the updater the production package carries**: it writes the
kernel, root, log and boot loader volumes, and deletes only five system folders of the writable
layer[^t-touch-recovery]. A Touch reset through the hidden recovery tool held a configuration of zero
bytes[^s195], which this does not explain: the factory package's own updater and what the tool sends are not
read[^unchecked]. None of them is a command of the older remotes' protocol,
[the commands](../../usb-protocol/commands.md). The tool offers this generation and nothing older,
[the recovery tool](../../logitech/update-service.md#the-recovery-tool-that-names-it)[^s196].

> This said Logitech's way to return a remote of this generation to its factory state "is not a
> command"<!--superseded--> and is a factory firmware image installed by the hidden recovery
> tool[^s196], until both clients were read: that is Harmony Desktop's recovery view, MyHarmony's sends the
> reset through `/sys/factoryreset` and `/sys/reboot`, and the remote has a reset of its own[^t-touch-recovery-client].

**Two paths on a Touch act on a write**, `/sys/factoryreset` and `/sys/reboot`: opening either runs
nothing, writing `reboot` to the second restarts the remote, and writing `all` to the first opens the power
controller's and the radio's firmware loader device nodes for writing and arms a factory reset that runs at
the next start, [the names](api/names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api-names]. What it writes to the nodes and what the drivers do is not read.
They are the remote's own reset and restart, and why the library does not open them is
[the Touch's usb.md](../../remotes/harmony-touch/usb.md).

> This said the two act when they are opened<!--superseded-->, from a unit on which both opened for reading
> and nothing happened[^s200], until the native program's name table was read: each fills the write slot of
> its entry and no other[^t-touch-api-names].

### Below the application

**There is no second copy of the application and no safe mode of the kind the older remotes have**: one root
volume, one data volume and one cache volume. The recovery system is the kernel's built in start program,
which installs a firmware drop or runs a factory reset before the system is mounted. The boot loader tries
the kernel volume and then a second one, `kernel2`, which nothing in the image writes; what a unit holds there
is not checked[^unchecked]. The boot loader and a shell are on a serial port; whether a Touch's board brings
it out is not checked[^unchecked]. Nothing here offers a way back over USB for a remote whose system does not
start, and none was found[^t-touch-recovery].

## The XMPP update

The older recovery page carries a mode with no product attached, `xmppupdate`, aimed at the hubs: a hub's
local control interface is the subject, and a Touch has no network interface for one to listen on. What it
installs is not settled, [the recovery tool](../../logitech/update-service.md#the-recovery-tool-that-names-it)[^s196].

## Not checked

* Which DA850 variant the remotes run on, the memory fitted, and the size of their flash[^unchecked].
* Where on a remote the configuration lives, and in what form[^unchecked].
* Whether a unit's second kernel volume holds anything, and whether the serial port is reachable[^unchecked].
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
[^t-touch-api-setup]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_setup.py)
[^t-touch-arch]: Read in the firmware. [The test](../../../tests/test_harmony_touch_architecture.py)
[^t-touch-api-names]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_names.py)
[^t-touch-recovery]: Read in the firmware. [The test](../../../tests/test_harmony_touch_recovery.py)
[^t-touch-first-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-first-sync.test.ts)
[^t-touch-recovery-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_recovery.py)
[^t-touch-host]: Read in the firmware. [The test](../../../tests/test_harmony_touch_host.py)
