# Harmony 300 and 350: firmware

**The two models' applications are one program linked twice, and the images below it are not shared.** Read
off a Harmony 300 and off a Harmony 350, the two applications are the same code with one routine changed and
every address after it moved by up to ten bytes; their bootloaders are different builds and their safe mode
images are different versions, 1.2 on the Harmony 300 read and 1.4 on the Harmony 350[^t-harmony-300-350-images-u].
Logitech's package manifest names the Harmony 300's two skins and the Harmony 350's for one image, which is a
statement about the package: the one image in it is what a Harmony 350 runs and is not what the
Harmony 300 read runs[^t-harmony-300-350-images-u]. Both are ordinary PIC18 programs like the Harmony 600's.
Each model folder's `firmware.md` points here, and [the comparison](#the-two-models-images-compared) is below.

## The 1.4 image

| | value | evidence |
|---|---|---|
| package | a ZIP holding `Description.xml` and `Region_2.EZUpgrade`, whose `<INTENDED>` names skins 78, 79 and 104, written to `/fw/normalmode` | [^s196] |
| version | 1.4, in the manifest and the image header; MyHarmony's version list also names both models at 1.4.0 | [^s196], [^x-versiondb] |
| decoded | 73472 bytes, an `HG` header that verifies, an ordinary PIC18 image | [^s196b] |
| load base | `0x9000`: 1581 of 1582 branch targets land on a boundary there, 99.9%, against 475 of 1460 for the runner up at `0xC000`, 32.5%; the instruction at `0x9000` is `GOTO 0x1AED4` and the header's own entry point field is `0x1AED4`, so the base has a closure and not only a score. It agrees with `/fw/normalmode`'s own row in the file table | [^s196b], [^s199] |
| the checksum Logitech's manifest states | the XOR of little endian words configuration containers use, seeded `0x4321`, [the container](../../config-format/container.md#the-trailer-checksum) | [^s196] |

**Where it comes from**: Logitech's software update service, production channel, by product and with no
login[^s196]. MyHarmony asks that service for the Harmony 350 by name, where the Harmony 600, 650 and 700
take another route[^s295].

## The two models' images compared

**The package image is the Harmony 350's application, byte for byte**: a Harmony 350 serves `/fw/normalmode`
as the package's first 73464 bytes, and the package's last eight are `0xFF`, the eight the remote does not
serve because it states the header's length, which is 8 short[^t-harmony-300-350-images-u]. **A Harmony 300
serves a different build of the same version.** Its header states the same version, 1.4, and the same length,
73472, but the two images differ in 37809 of 73464 bytes read straight across, which is what a shift of up to
ten bytes does to every address operand[^t-harmony-300-350-images-u]. Aligned instruction by instruction with
the address operands masked they are one program, and these are the only places the two differ, the
Harmony 350's addresses first[^t-harmony-300-350-images]:

| | Harmony 300 | Harmony 350 |
|---|---|---|
| header checksum, entry point | `0xAF6A`, `GOTO 0x1AECA` | `0x8F7B`, `GOTO 0x1AED4` |
| where the code ends | `0x1AEEE`, `0xFF` to `0x1AEF8` | `0x1AEF8` |
| USB `bcdDevice`, one word of the descriptor constant | `0x1078`, at `0x1AC06` | `0x1104`, at `0x1AC10` |
| the `0x7D` arm, a send, at `0x1134E` in the 350 | stores the group's send kind as it stands | stores the kind `AND 3`, at `0x11356`, `0x1136A` and `0x11384` |
| a `CALL` at `0x11A8C` | an `RCALL` to the same target | a `CALL`, since the ten bytes before it put the target out of range |

**Every other instruction is the same**: 30579 equal byte for byte, 1083 calls and jumps and 54 relative
branches whose targets moved by the shift of the place they point at and nothing else, and 9 pointer bytes
loaded as literals, each the 300's plus the shift[^t-harmony-300-350-images]. The shift, 350 against 300, is
0 below `0x11356`, 2 from `0x11358`, 4 from `0x1136E`, 8 from `0x1138A` and 10 from `0x11A90`, so **an address
quoted on this page for the application is the 300's with that shift added, and is the same in both below
`0x11356`**. The product string `Harmony Remote 0-1.4.0` is the same in both.

**What the one changed routine does.** The action list dispatcher's arm for `0x7D` maps the operand's high
byte, the infrared group, to a send kind in `0x203` before it calls the send handler: group 0 stays 0 and 3
stays 3, 1 becomes 2 and 2 becomes 1, and any group from 4 up becomes `0xFF`. The 350's build then keeps only
the low two bits, so a group from 4 up is kind 3 there, where the 300's leaves `0xFF`[^t-harmony-300-350-images].
The kind picks the firmware event the send raises, `0x2D` for 0 and for `0xFF`, `0x2F` for 1, `0x2E` for 2 and
`0x30` for 3, [the key tags below `0x40`](#the-keypad-scan). **So the two builds disagree for one input only,
a send from a group above 3: the 300's build raises the event of group 0 and the 350's the event of group
3**[^t-harmony-300-350-images]. The tracer finds no other direct access to the kind, which
is its blind spot for indirect ones, and no configuration of the family read holds a
group above 3, which makes the difference unreached in all five[^t-harmony-300-350-images]. Logitech's service
holds a Harmony 300 to four infrared groups and a Harmony 350 to eight, [the README](README.md#how-the-two-differ),
so a configuration it compiles for a 300 cannot reach the difference at all and one for a 350 with more than
four groups can. What the four events do on a unit is not checked[^unchecked].

**The bootloader and safe mode differ more**, [below](#the-two-models-bootloaders-and-safe-mode-images).

## Routines read on it

**Addresses here are the Harmony 350's**, from the package image; for a Harmony 300's application subtract the
shift above.

| routine | evidence |
|---|---|
| the file table and the name pool | [^s199] |
| the configuration test the host's check runs, at `0x14AC2`: `GSPM` compared from `0x14AE8`, `LWJL` at the hardcoded `0x47`, then the stored checksum word returned rather than recomputed. Section 259 called it the configuration validator<!--superseded-->; the validator that runs at start is the next row | [^s259], [^t-harmony-350-firmware], [^t-harmony-350-file-write] |
| the configuration validator at `0x16090`, run at start and from a second call site in the main loop while the verdict is clear: `GSPM`, `LWJL` at `0x47`, `PTYY` at `end_addr` and the trailer checksum, below | [^t-harmony-350-file-write] |
| the file protocol: the request parser at `0xCB88`, the reply dispatcher at `0xE2F0`, the file lookup at `0x12CF0`, the close at `0x12CE6`, the read size of `/cfg/usercfg` at `0x14C58`, [usb.md](usb.md#what-the-firmware-does-with-a-write) | [^t-harmony-350-file-write] |
| the section seeker, `0x0B + 4 * slot` at `0x10BCE` on the 350's 1.4 image, called for raw slots 3 to 12 from 14 call sites | [^s259] |
| the readers of raw slots 5, 6, 8, 9 and 12: the start up event table at `0x11D48`, called once from the validator's tail at `0x162B8`; the key map lookup at `0x1113A` and its tagged list reader at `0x1AB24`; the timer start at `0x16A2E` and the expiry pass at `0x1694A`; the state variable seeder at `0x16E6C` and the record locator at `0x17360`; the digit entry reader at `0x19D56`. What each slot is, [memory.md](memory.md#the-six-slots-the-firmware-was-read-for) | [^t-harmony-350-slots] |
| the keypad scan at `0x1892A`, its returns at `0x188C8`, and the key events it raises: press at `0x18B4A`, release at `0x18B84` and `0x18BCE`, held at `0x18AEA`; the firmware's own events at `0x145E2` and `0x11EA6`, [below](#the-keypad-scan) | [^t-harmony-350-keys] |
| the keypad's three events, raised at `0x18AEA`, `0x18B4A`, `0x18B84` and `0x18BCE`; the hold counter at `0x312`, started at `0x1959E` and decremented from `0x19708`; parameter 0, the hold time, written by `0x3F` band `0xF0` at `0x117C4`, [below](#a-held-key) | [^t-long-press] |
| the month end routine of the clock, at `0x14382` | [^s322] |
| the state variables: the reader at `0x17302` and the store at `0x172B2`, from data memory `0x108`; the tick at `0x13C12`, which adds the time elapsed to the second; the minute's step queued at `0x13E52`; bands `0xF2` and `0xF1` of `0x1F` at `0x11984`, one added to a variable or taken off it, wrapping through its `max` at `0x171E8`; the reply carrying the clock at `0x0F3BE`. What they add up to, [memory.md](memory.md#the-state-variables) | [^t-harmony-350-clock] |
| the state variable bound | [^s276] |
| the skin: its getter at `0x14626`, reading byte 2 of the `/sys/sku` record at internal `0x01F4C0`; the three places that report it, `0x13216`, `0x1389A` and `0x0F258`; the record writer at `0x15288`, which nothing calls; the device descriptor, a constant at `0x1AC04`. What they add up to, [below](#the-skin) | [^t-harmony-350-skin] |

## A held key

**A key press ends in one of two events, and that is what a long press is on this image.** A key raises
its press when it goes down and starts a hold counter. Let go while the counter runs and the remote
raises the release; keep the key down until the counter runs out and it raises a third event instead,
after which no release follows[^t-long-press]. The three are the event types of
[key codes](../../config-format/modes-and-keys.md#key-codes-and-scan-codes): `0x80` the press, `0x40` the
release, and `0xC0`, which that table calls repeat and which here fires once and never repeats, so it is
called the held event on this page[^t-long-press]. So the firmware tells a short press from a long one by
itself, for every key, and a configuration only chooses which of the two endings it binds.

| | what the 1.4 image does | evidence |
|---|---|---|
| the hold | parameter 0 times 100 ticks, one value for every key; a count of 1000 runs out on the 1001st tick and then stops | [^t-long-press] |
| parameter 0 | written by `0x3F` with operand `0xF0nn`, which sets it to `nn`; `0xF6nn` and `0xF7nn` set two others. The image starts it at 10, and every configuration of this family read sets 10 again at start, so the hold is 1001 ticks. A third writer sits in the USB service and was not followed | [^t-long-press], [^t-long-press-c], [^unchecked] |
| the tick | the one the power on delay counts in, 100 ticks to each tenth of a second the delay waits, so by the delay measured on a unit 1001 ticks are about 1.005 s, where Logitech's guide says two seconds; the kind 0 timers of [the timer table](memory.md#the-six-slots-the-firmware-was-read-for) count the same tick | [^t-long-press], [^t-long-press-u], [^x-manual-350] |
| a select ends the hold | `0x1F` band `0xFF`, which selects a key map, and bands `0xFE` and `0xFD`, which push and pop the map stack, clear the counter, so a press whose binding selects a map is followed by neither a release nor a held event | [^t-long-press] |

How each model's configurations use it is [memory.md](memory.md#a-device-key-and-its-long-press): a
Harmony 350 binds a key's short press device to the release and a long press device to the held event.
All of this is read in the Harmony 350's application. The Harmony 300's application is the same code at
every routine named here, [the comparison](#the-two-models-images-compared)[^t-harmony-300-350-images]. The
Harmony 650's firmware raises the same three events with the same reload, `0x200` times 100,
[its keys](../../remotes/harmony-650/keys.md); whether its counter also stops after the held event is not
checked[^unchecked].

## The skin

**The Harmony 350's 1.4 image reports the unit's skin and never acts on it.** It reads one byte, tells the host, and has no
branch on it that anything reaches[^t-harmony-350-skin]. So the keypad scan, the held event, the file write
path and the configuration validator treat a remote that states skin 79 as they treat one that states 104, and the
firmware caps nothing by skin: the limits this family states per skin, [the README](README.md#how-the-two-differ),
are Logitech's service's and not the image's[^t-harmony-350-skin].

| | what the image does | evidence |
|---|---|---|
| where the skin comes from | byte 2 of a 64 byte record in internal flash, the file table's `/sys/sku` row at `0x01F4C0`, so `0x01F4C2`; the getter is `0x14626`. A unit's `/sys/sysinfo` states exactly that byte | [^t-harmony-350-skin], [^t-harmony-350-skin-u] |
| who reads it | three places, each storing the byte into a reply and testing nothing: the `skin` field of `/sys/sysinfo`, a second builder of the same fields and one of the one byte replies of the reply dispatcher | [^t-harmony-350-skin] |
| the only branch on it | a record writer at `0x15288` whose chain separates a blank record, skin 72 and skin 79 from the rest and sets a four byte value of the record to 2 for those two and 1 for the others. **Nothing calls it**: no transfer into its routines from outside, and no instruction or table anywhere in the image holds its address; the safe mode image holds the same routine and is as silent about it. A call through a pointer, which one helper at `0x19F1C` makes, would not have been seen, and the pointers it jumps to were not enumerated[^unchecked] | [^t-harmony-350-skin] |
| the record's last bytes | the value above, 2 on a skin 79 unit and 1 on a skin 104 one, and nothing read in the image fetches it | [^t-harmony-350-skin-u] |
| the check command on `/sys/sku` | compares the record's first two bytes with the host's value and looks at nothing else | [^t-harmony-350-skin] |
| the board | a nibble of `PORTD`, which `/sys/sysinfo` states as `hw_ver`, 0 on both models' units read, so the two boards do not differ there | [^t-harmony-350-skin], [^t-harmony-350-skin-u] |
| the configuration's own skin | base slot 1 states it, [the container](../../config-format/header-records.md#base-slot-1-the-architecture-record), and the firmware never reads that slot: the section seeker loads slots 3 to 12 and the validator reads header offsets 0, 4 and `0x47` | [^t-harmony-350-skin], [^t-harmony-350-slots] |

**What holds for a Harmony 300's application.** This section was read in the Harmony 350's image, which is also
what a Harmony 350 unit serves. The Harmony 300's is the same code but for the one routine, [the
comparison](#the-two-models-images-compared): the skin getter at `0x14626` and the record writer at
`0x15288` sit in runs both images share, so the 300's are at `0x1461C` and `0x1527E` and instruction for
instruction the same, and the one routine that differs, the send kind, does not read the skin[^t-harmony-300-350-images].
So the statements above hold for a Harmony 300's application as read here, with its own `/sys/sku` record. The
descriptor is where the two images differ and a skin shows: it is a constant in flash, copied to the endpoint
buffer unchanged, whose `bcdDevice` is `0x1104` in the 350's image and `0x1078` in the 300's, which is why a
Harmony 300 enumerates as `0x1078` whatever skin its record holds, [its usb.md](../../remotes/harmony-300/usb.md)[^t-harmony-350-skin][^t-harmony-300-350-images].
Logitech's package names skins 78, 79 and 104 together, which is its word about the package and not a
measurement of what a 300 runs[^s196]. Nothing in either image makes a configuration behave differently by
skin[^t-harmony-350-skin][^t-harmony-300-350-images].

## Routines read in the bootloader and safe mode

Both images read off a Harmony 350, at the file table's addresses, with the PIC18F67J50 register map
(the Harmony 300's two images are not these, [below](#the-two-models-bootloaders-and-safe-mode-images)): the
bootloader reaches `ANCON0` and `ANCON1` through the shadow bit of `WDTCON` and uses `UCON` at `0xF65`, both
that family's, both images program 64 bytes at a time, and safe mode erases 1 KiB pages. Which part exactly is not
checked[^t-harmony-350-boot][^unchecked].

| routine | evidence |
|---|---|
| the bootloader's reset vector `GOTO 0x0EFA`; its start decision at `0x0700`; the header test for `HG` at `0x001008`, `0x0782`; the keypad scan at `0x0360`; the command switch at `0x01A8`, the Harmony 600's | [^t-harmony-350-boot] |
| safe mode's entry `0x758E` and start `0x520C`; the request kept or cleared at `0x717C`, `0x0F` at `0x53BC`, the install at `0x5424`; the keypad scan at `0x6948` and the key switch at `0x527E`; the application check at `0x53DE`, with the header checksum at `0x3FE0` | [^t-harmony-350-boot] |

## What validates the configuration

**In the 1.4 image a remote keeps its judgement of the configuration in one bit and acts on the bit**, not
on the bytes: the configuration's verdict, bit 2 of data memory `0x68E`, the same byte and bit the Harmony
700 uses[^t-harmony-350-file-write][^s310]. Six of the fourteen calls that seek a section of the
configuration test the bit a few instructions before and skip the configuration when it is clear, and a
seventh runs only after the validator has set it; whether the other seven are reached only with the bit
set is not checked[^t-harmony-350-file-write][^unchecked].

| | what sets or clears it | evidence |
|---|---|---|
| at start | the validator at `0x16090`: `GSPM` at the start, `LWJL` at `0x47`, `PTYY` at `end_addr`, then the trailer checksum, seeded `0x4321`, over the little endian words from the start to the stored word at `end_addr - 2`, [the container](../../config-format/container.md#the-trailer-checksum) | [^t-harmony-350-file-write] |
| the checksum's gate | skipped while bit 0 of setting `0x80` in the settings store is clear, the gate the Harmony 600, 650 and 700 have; an absent setting reads `0xFF`, so a store without one asks for the checksum | [^t-harmony-350-file-write], [^s354] |
| a second call site in the main loop | the same validator again, only if the verdict is clear; that this is the end of a USB session is likely and not checked | [^t-harmony-350-file-write] |
| an open of `/cfg/usercfg` for writing | clears it | [^t-harmony-350-file-write] |
| the host's check answering `m` for `/cfg/usercfg` | sets it, on the stored checksum word alone and without `PTYY`, [usb.md](usb.md#what-the-firmware-does-with-a-write) | [^t-harmony-350-file-write] |

**In the code read, a configuration that fails is not refused and does not stop the firmware.** The validator returns
with the verdict clear and an error code latched, 8 when a marker is missing and 4 when the checksum fails,
which a routine at `0x1A7EE` copies to `0x700` while setting four port pins, and the start goes on without
loading the configuration's state[^t-harmony-350-file-write]. What the code then does with those pins is
[below](#safe-mode-and-recovery); how a unit behaves with a failing configuration is not checked[^unchecked]. **There is no configuration to fall back on**: `/fw/embeddedcfg` is a name in the
firmware's pool that no row of the file table and no instruction points at, [memory.md](memory.md)[^t-harmony-350-file-write].

The checksum as read reproduces the stored word of every configuration read off a Harmony 300 and a
Harmony 350, five of them[^t-harmony-350-file-write].

## Safe mode and recovery

**Entering safe mode or the bootloader on this family destroys nothing**, the opposite of the
[Harmony 525](../harmony-5xx/firmware.md), whose safe mode copies itself over the application. The file
table names the two images below the application, the bootloader, 4 KiB at internal `0x000000`, and safe
mode, 32 KiB at `0x001000`[^s199]; both run at every start before it, and the only thing either writes on
its own is an install the application asked for[^t-harmony-350-boot]. What follows about the two images is
read in a Harmony 350's copies, on 1.4, since Logitech's package carries the application alone; a Harmony 300's
two are different builds, [compared below](#the-two-models-bootloaders-and-safe-mode-images), and none of it
has been done to a unit[^unchecked].

### What runs at a start

| step | what happens | evidence |
|---|---|---|
| the bootloader | scans the keypad: key `0x14` keeps it, as a USB programmer; key `0x2C` runs safe mode at once; anything else runs safe mode if its header mark `HG` is at `0x001008`, and keeps the programmer otherwise. It never runs the application and never reads the request byte below | [^t-harmony-350-boot] |
| safe mode, first | keeps the request byte only after a restart by the `RESET` instruction and clears it after any other, a power on among them | [^t-harmony-350-boot] |
| a request of `0x0F` | the reboot with parameter `0x73`: cleared, and safe mode stays for this one start | [^t-harmony-350-boot] |
| a request of 2 | a firmware install's flush and close: safe mode **installs the staged copy**, below, and clears the request; 4, 6 and 7 do the same, and the 1.4 application sets none of them | [^t-harmony-350-boot] |
| a key held | `0x03`, `0x32` or `0x2C`: safe mode stays | [^t-harmony-350-boot] |
| otherwise | safe mode checks the application against the checksum in its header, seeds `0x21` and `0x43`, and runs it at `0x900A` when it matches; when it does not, safe mode stays | [^t-harmony-350-boot] |

**This page said the application's start clears that request only after a restart by the reset
instruction**<!--superseded-->, which read the branch the wrong way round: it keeps the request after exactly
that restart and clears it after any other, which is how the request reaches safe
mode[^t-harmony-350-recovery].

**The install copies the staged copy and never safe mode.** It reads the staged image's length at external
`0x000004`, adds 8 and caps it at `0x15C00`, erases 1 KiB pages of internal flash from `0x009000` and copies
the external bytes from `0x000000` over them, the arrangement the Harmony 600, 650 and 700 have,
[their firmware.md](../harmony-600-650-700/firmware.md). **It does not check the staged copy first**: a bad
one leaves a bad application, and then the check of the same start fails and the remote stays in safe mode,
still on the cable. The cap keeps the erase below `0x01F400`, the unit's own records[^t-harmony-350-boot].

### The keypad scan

**Every key is a number from 1 to 56, and all three images number it the same way.** The bootloader,
safe mode and the application share one scan routine, literal for literal, apart from one key of the
bootloader's three key restart[^t-harmony-350-boot][^t-harmony-350-keys]. It pulls one of fourteen drive
lines low at a time, `PORTE` bits 0 to 6, `PORTA` bits 3 to 5 and `PORTD` bits 0 to 3, reads four returns,
`PORTB` bits 4 to 7, and numbers the key `4 * line + return`, return counting from 1; 0 is no key.

**The application hands that number to the key maps as it is**, with an event type in the top two bits:
`0x80` when a key goes down, `0x40` when it is let go or replaced by another, and `0xC0` once it has been
held past a timer the press arms. A configuration's key map tag is therefore that type plus the code, and a
tag below `0x40` is not a key: the firmware raises `0x26` to `0x28` and, from its send path, `0x2D` to
`0x30` through the same lookup[^t-harmony-350-keys]. Which key carries which code is each model's, [the
Harmony 350's keys](../../remotes/harmony-350/keys.md#scan-codes).

| code | where | what the start up images do with it | the key, by the Harmony 350's table |
|---|---|---|---|
| `0x14`, 20 | `PORTE` bit 4 with `PORTB` bit 7 | the bootloader stays, as a USB programmer | the digit 0 |
| `0x2C`, 44 | `PORTD` bit 0 with `PORTB` bit 7 | the bootloader runs safe mode unchecked, and safe mode stays | Play |
| `0x03`, 3 | `PORTE` bit 0 with `PORTB` bit 6 | safe mode stays | Power |
| `0x32`, 50 | `PORTD` bit 2 with `PORTB` bit 5 | safe mode stays | OK |

The bootloader's two codes are the Harmony 600's, [the bootloader](../../usb-protocol/bootloader.md)[^t-harmony-350-boot].
The restart the scan tests first is codes 6, 53 and 51 held together in the application and safe mode,
Watch TV, the digit 8 and the up direction key, and codes 6, 20 and 51 in the bootloader[^t-harmony-350-boot].
The key column rests on the Harmony 350's table, which is read and inferred from configurations, and none of
it has been tried on a remote[^t-harmony-350-keys-c][^unchecked].

### What each serves over USB

* **Safe mode answers the application's file protocol**: the same device descriptor, `046D:C124` with
  release `0x1104`, ten of the application's switch tables case for case, the control commands, device
  control and the check among them, and a file table of eleven rows. So the
  product id cannot tell the two apart; **the product string can**, `Harmony Remote 4-1.4.0` in safe mode
  against the application's `Harmony Remote 0-1.4.0`, and `/sys/sysinfo` states `fw_type` 4, which
  Logitech's client calls safe mode[^t-harmony-350-boot][^t-harmony-350-recovery-client]. That every command
  behaves as the application's does is not checked[^unchecked].
* **It can take a configuration and an application.** `/cfg/usercfg` is readable and writable in its
  table, and `/fw/normalmode` is the resident application for reading and the staged copy for writing; a
  flush of the staged copy stores request 2 and its close reboots, so the next start installs
  it[^t-harmony-350-boot]. `/fw/bootloader` and `/fw/safemode` are writable rows there too.
* **The bootloader is the Microchip USB programmer** of the Harmony One and the Harmony 600, `04D8:000B`,
  with the Harmony 600's twelve commands and its erase that refuses anything below `0x001000`,
  [the bootloader](../../usb-protocol/bootloader.md). It writes internal flash only, and only when a host
  sends a write or an erase[^t-harmony-350-boot].

### Restoring a remote

**A failed configuration write can be sent again over USB.** The application starts, rejects a broken
configuration, carries on without one and keeps answering on the cable: nothing in the USB service and the
file commands it reaches reads the configuration's verdict, and the only two instructions there that touch
it are the open for writing, which clears it, and a matching check, which sets it[^t-harmony-350-recovery].
A write that stops with the power on leaves a file open, which the file system reset closes; one that stops
with the power off leaves a configuration the start rejects, after which the remote runs on with no
configuration and answers on the cable, [usb.md](usb.md#what-the-firmware-does-with-a-write)[^t-harmony-350-recovery].

**A damaged application is restored by safe mode, with the same seven commands as a configuration**: a
remote whose application fails its checksum stays in safe mode, a host writes the application to
`/fw/normalmode`, flushes and closes, and the next start installs it[^t-harmony-350-boot]. That is
Logitech's own route: its client calls an install required whenever a remote reports safe mode, and its
firmware sequence for skin 104 is the configuration's seven commands, writing the package's image to
`/fw/normalmode` with the reboot its manifest asks for[^t-harmony-350-recovery-client][^t-harmony-350-recovery-package].
**A damaged safe mode image** is the bootloader's case: with no `HG` mark, or key `0x14` held, the remote
stays in the programmer, which can rewrite internal flash above `0x001000`[^t-harmony-350-boot].

| | what the 1.4 application does | evidence |
|---|---|---|
| a failing configuration | latches an error code, 8 for a missing marker and 4 for the checksum, which stands until the processor restarts, and switches four output pins on and off in a pattern counted from it, from the main loop. It neither stops nor restarts. That the pins are the remote's lights is not checked | [^t-harmony-350-recovery], [^unchecked] |
| the firmware type `/sys/sysinfo` states | always 0, a constant in the code; safe mode's is 4 | [^t-harmony-350-recovery], [^t-harmony-350-boot] |
| a request for the next start | a byte in data memory, `0x0F` from the reboot command's parameter `0x73` and 2 from a flush of `/fw/normalmode` open for writing, whose close then restarts; safe mode acts on both, [above](#what-runs-at-a-start) | [^t-harmony-350-recovery], [^t-harmony-350-boot] |
| three keys held together | restart the processor, tested at the start of the keypad routine; safe mode tests the same three and the bootloader swaps one for key `0x14`. By the Harmony 350's key table they are Watch TV, the digit 8 and the up direction key, [above](#the-keypad-scan), which has not been tried | [^t-harmony-350-recovery], [^t-harmony-350-boot], [^t-harmony-350-keys-c], [^unchecked] |
| a way into the images below it | none: no call or jump in the application targets an address below `0x9000`, and its three reset instructions restart the processor with nothing written on the way, which runs the bootloader and then safe mode | [^t-harmony-350-recovery] |

* **A configuration write cannot damage the firmware.** Its erase runs from `0x020000` to `0x07FFFF`, the
  staged copy ends below `0x020000`, and nothing in it reaches the processor's own flash, where the
  application, the safe mode image and the bootloader live[^t-harmony-350-recovery].
* **An internal image is served eight bytes short.** The application states the size of `/fw/safemode`
  and `/fw/normalmode` for reading as the image header's length field, which is the length less 8, so a
  read ends eight bytes before the image does: 26040 bytes of a 26048 byte safe mode
  image[^t-harmony-350-boot-unit][^t-harmony-350-boot]. Those eight bytes hold a routine safe mode's start
  calls, which is therefore not read[^unchecked]. The check command tests the `HG` header in both internal
  images, so a remote can verify them without a read[^t-harmony-350-recovery].

## The two models' bootloaders and safe mode images

**They are different builds, and the safe mode images are different versions.** Read off a Harmony 300 and
off a Harmony 350, with the PIC18F67J50 register map[^t-harmony-300-350-images-u]:

| | Harmony 300 | Harmony 350 |
|---|---|---|
| safe mode version, from the header's byte 7 and the product string | 1.2, `Harmony Remote 4-1.2.0` | 1.4, `Harmony Remote 4-1.4.0` |
| safe mode length stated, served | 25408, 25400 | 26048, 26040 |
| safe mode entry point | `0x72D2` | `0x758E` |
| safe mode `bcdDevice`, at `0x102A` | `0x1078` | `0x1104` |

* **The two safe mode images differ in version as well as in model**, so which of what follows is the model's
  and which the version's cannot be told from these two[^t-harmony-300-350-images]. With RAM addresses,
  literals and branch targets masked their listings differ in 24 stretches. The larger ones: a block of 709
  instructions that sits `0xF46` lower in the Harmony 350's image than in the Harmony 300's, a stretch of 181
  instructions, 408 bytes, at `0x3B52` in the Harmony 350's that the Harmony 300's has no counterpart of, and
  a block of state in bank 14 in the Harmony 350's that holds 15000 and 1000 and compares a sum with
  1000[^t-harmony-300-350-images]. What the added code does, and whether any of it is in the file protocol
  that carries a configuration, is not read[^unchecked].
* **The bootloaders differ in 1998 of 4096 bytes.** Their start decision is the same and the rest of the build is not: the keys `0x14` and
  `0x2C` and the test for `HG` are in both; **one key of the restart combination differs**, the Harmony
  300's scan testing `PORTD` bit 3 with `PORTB` bit 4, code 53, as the application does, where the
  Harmony 350's tests `PORTE` bit 4 with `PORTB` bit 7, code 20; the Harmony 350's has a byte exchange on the
  second serial port, `SSP2`, at `0x0E6C` that the Harmony 300's has no counterpart of, the Harmony 300's only
  switching that port off; the two set up their ports and oscillator with different values; and the Harmony
  300's start code makes `PORTB` bit 3 an output where the Harmony 350's makes `PORTG` bit 0 one and drives
  it as a counted pattern[^t-harmony-300-350-images]. What those pins are wired to is not read[^unchecked].
* **Neither runs a configuration.** The application interprets a configuration's action lists and these two
  do not, so a difference in them cannot change what a configuration does once the application runs; whether
  one changes how a configuration is written to a unit in safe mode is not read[^unchecked].

## Not checked

* Which image Logitech's service serves a Harmony 300 when asked by skin 78 or 79: the package fetched
  was the one for skin 104, and the Harmony 300 read runs a different build of the same version[^unchecked].
* Which of the two applications is the later build: both say 1.4, and the Harmony 350's carries the mask[^unchecked].
* That a Harmony 300 of the other printing, skin 78, runs the build a skin 79 unit does[^unchecked].
* Which version a given remote runs: its `/sys/sysinfo` carries a version field, and only the product
  string's 1.4.0 has been read[^s193].
* What a Harmony 300's bootloader and safe mode image do beyond how they differ from the Harmony 350's, and
  any build of either but the two read; that the four start codes and the restart are the keys the Harmony 350's table names; and the eight bytes at the end of the safe mode image that
  a read does not return[^unchecked].
* Whether a configuration that passes the validator and hangs while its state is loaded at start would
  keep a remote from the USB service, and whether the processor's watchdog is on, which is in the
  configuration words at internal `0x01FFF8`[^unchecked].
* What a failed validation shows a person, and whether a configuration the check marked good is put to
  use before the remote restarts, since the check sets the verdict without the loading the start does[^unchecked].
* Whether a unit's settings store holds setting `0x80`, and so whether its start checks the
  checksum[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^x-versiondb]: Stated by Logitech, in their client. [MyHarmony's version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^s196b]: Read in the firmware. [Section 196](../../../docs/findings.md#s196)
[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^s295]: Stated by Logitech, in their client. [Section 295](../../../docs/findings.md#s295)
[^s259]: Read in the firmware. [Section 259](../../../docs/findings.md#s259)
[^t-harmony-350-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_350_firmware.py)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
[^unchecked]: Not checked.
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^t-harmony-350-file-write]: Read in the firmware. [The test](../../../tests/test_harmony_350_file_write.py)
[^t-harmony-350-recovery]: Read in the firmware. [The test](../../../tests/test_harmony_350_recovery.py)
[^t-harmony-350-recovery-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_350_recovery.py)
[^t-harmony-350-recovery-package]: Stated by Logitech, by their service. [The test](../../../tests/test_harmony_350_recovery.py)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^t-harmony-350-slots]: Read in the firmware. [The test](../../../tests/test_harmony_350_slots.py)
[^t-harmony-350-clock]: Read in the firmware. [The test](../../../tests/test_harmony_350_clock.py)
[^t-harmony-350-boot]: Read in the firmware. [The test](../../../tests/test_harmony_350_boot.py)
[^t-harmony-350-boot-unit]: Measured on a unit. [The test](../../../tests/test_harmony_350_boot.py)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_long_press.py)
[^x-manual-350]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^t-harmony-350-keys]: Read in the firmware. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-300-350-images]: Read in the firmware. [The test](../../../tests/test_harmony_300_350_images.py)
[^t-harmony-300-350-images-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_350_images.py)
[^t-harmony-350-skin]: Read in the firmware. [The test](../../../tests/test_harmony_350_skin.py)
[^t-harmony-350-skin-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_skin.py)
