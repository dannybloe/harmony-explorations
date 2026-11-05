# Harmony 880 and 885: memory

A Harmony 880 or 885 keeps its program and its configuration in one address space. The bottom
64 KiB hold a bootloader that starts the remote, the next 64 KiB the application that runs it, with a
small configuration of its own tucked into its last 8 KiB, and the user's configuration starts at 128 KiB.
This page says what sits where, then how the configuration container is laid out on this architecture,
then the few things in a configuration that are this architecture's own.

Little here was read off a remote: a Harmony 885 answered reads at the application's and the configuration's
addresses, and its identity block at `0x000110`,[^t-arch8-usb] and on 885s a whole configuration read off
from `0x020000` and passed the start check, [the 885's USB page](../../remotes/harmony-885/usb.md#what-reads-off-it).[^t-885-on-a-unit]
An 880 has not been read. The layout comes from two firmware images of each of the two halves
and from concordance's table, and the container from six configurations, as each footnote says. How a
configuration is laid out in general is [the configuration format](../../config-format/README.md); this
page states what differs here.

## The address space

| address | what | source |
|---|---|---|
| `0x000000` to `0x010000` | the **bootloader**, with the reset vector at zero and no image header; its code ends at `0x0639B` on the 880 and `0x063B1` on the 885. The bootloader erases or writes here only under an unlock, which a host sends or which the bootloader sets around its own one byte write to a hardware version log at `0x000140`, [the bootloader](../../usb-protocol/bootloader.md#a-flash-programmer-for-the-whole-part) | [^s116][^t-885-boot] |
| `0x000104` to `0x000106` | three addresses a host's read or write does not treat as flash: a read whose last byte is `0x000104` or `0x000105`, alone in its chunk, returns the hardware log's newest byte or takes a measurement, and a one byte write to `0x000106` sets the unlock, [usb.md](usb.md#reading-flash) | [^t-885-reads][^t-885-flash] |
| `0x000110` | the remote's **identity block**: sixteen bytes of `0xEE`, the field named the serial, then the two GUIDs that tell one remote from another, as the paragraph under this table says; the application tests these 48 bytes for being blank at every start, and a blank block keeps the user configuration from being used, [firmware.md](firmware.md#what-the-application-does-at-start) | [^x-concordance][^t-885-boot][^t-885-start] |
| `0x000140` to `0x000147` | a **hardware version log**, eight one byte entries filled from the bottom; the newest is the version block's hardware field, and both programs can append to it | [^t-885-reads][^t-885-flash] |
| `0x000160` | a **battery calibration word**, which the application tests at start and reports when blank | [^t-885-start] |
| `0x010000` to `0x020000` | the **application firmware**, version 4.4, [firmware.md](firmware.md) | [^s114] |
| `0x01E000` to `0x01FB89` | inside the application's 64 KiB, a **safe mode configuration**: a complete container of 7049 bytes, byte identical in the 880's and the 885's images, which the application runs whenever the user's configuration fails its start check or may not be read, [firmware.md](firmware.md#what-the-application-does-at-start) | [^s114][^t-885-start] |
| `0x020000` | the **user configuration**, the container's own pointers counting from here | [^x-concordance][^s14] |
| `0x1D0000` | where the bootloader copies a staged application from when the status byte asks for status 2, [firmware.md](firmware.md#what-the-bootloader-does-at-power-on), and where Logitech's classic client stages one. What a unit holds there is not checked | [^t-885-boot][^t-885-start-client][^unchecked] |
| `0x1E0000` to `0x1FE000` | the **log area** every configuration declares, 15360 records of 8 bytes, which the application appends to when a configuration's action list asks it to, [below](#what-the-remote-writes-on-its-own) | [^s47][^t-885-log] |
| `0x1FE040` to `0x1FE0C1` | **devices, not flash**: every immediate load of the table pointer into this range names `0x1FE040`, `0x1FE041`, `0x1FE081` or `0x1FE0C1`, with `0x1FE080` and `0x1FE0C0` reached from them. By the code that uses them they are the keypad lines, the USB controller and the display; that identification is the code's reading and not checked against the hardware | [^t-885-boot][^unchecked] |
| `0x1FFE00` to `0x1FFFFF` | where the bootloader and the application call their RAM copies of the flash programming routines, so a window onto data memory and not flash; inferred from where the copies are placed and called, not from a datasheet | [^t-885-boot] |

**The identity block sits below the application**, so a read of the firmware region cannot contain it, and a
read of the bottom 64 KiB, which holds the bootloader, does.[^x-concordance] **It is laid out as the later
remotes' block is**, [the identity block](../../usb-protocol/commands.md#internal-memory): in all five
bottom 64 KiB images read, two 880s', an 885's, an 880 Pro's and a Harmony 720's, each read off its remote,
the 64 bytes from `0x000110` are sixteen bytes of `0xEE`, the field named the serial, which identifies
nothing here either, then two fields of sixteen bytes that are not a uniform fill and differ from remote to
remote, the two GUIDs.[^t-885-boot] **The fourth
field is not the later remotes' sixteen zero bytes**: `0x000110` plus `0x30` is `0x000140`, the hardware
version log. So the application's blank test covers exactly the serial field and the two GUIDs, and a 64 byte
identity read brings the log's first sixteen bytes with it.[^t-885-boot][^t-885-start] This said which bytes there are a serial was not
checked<!--superseded-->, because the address is inside the range the bootloader's code spans, until the
images' bytes there were read.[^t-885-boot]

**The safe mode configuration lives inside the application's region and not in the bootloader's**: the
bottom 64 KiB hold no container at all, in either image. That is the opposite of the Harmony One, whose
safe mode configuration sits at `0x002000` in the bottom 64 KiB.[^s116] It is the oldest configuration
known, built on 3 April 2005, and its architecture record is two zero bytes where a user configuration's
states the architecture and the skin, so the configuration that ships with the firmware names neither.[^s114]

**The log area stops 8 KiB short of 2 MiB**, at `0x1FE000`, where every other architecture's ends on a
round boundary; the stride of 8 bytes is the Harmony 525's and the Harmony 600's as well.[^s47] **The top 8 KiB is where the firmware reaches its devices
and its RAM window**, which fits the log area stopping there; whether everything from `0x1FE000` up is
decoded away from flash, rather than only the addresses the firmware uses, is not checked.[^t-885-boot][^unchecked]
So a read there is a bus cycle on a device or on RAM, and neither program's read path refuses one.[^t-885-boot]

## The flash part

**The firmware knows two flash parts and its application reports both as one.** It reads the part's id and
reports an Atmel `1F:C0` as `01:49`, keeps `01:49`, and reports anything else as `FF:FF`, so the `01:49` a
running remote gives in its version block does not say which part is fitted. The bootloader's version
answer gives the part's own bytes.[^t-885-flash][^t-885-boot] Logitech's classic client names `1F:C0`
the `AT49BV163D` and `01:49` the `S29AL016M`, both 2 MiB.[^t-885-flash-client] No datasheet was compared.[^unchecked]

**An erase removes whatever sector of the part holds the address**: the firmware sends the sector erase
command at the host's address unchanged and holds no sector table.[^t-885-flash] **From `0x010000` up every
source has 64 KiB sectors**: Logitech's classic client gives both parts eight 8 KiB blocks below that and
thirty one of 64 KiB above, to `0x200000`, and concordance gives `01:49` sectors of 16, 8, 8 and 32 KiB
below it and 64 KiB above.[^t-885-flash-client][^x-concordance] The bootloader's own staged install erases
once at `0x010000` and then writes 64 KiB, which works only if that sector is at least that large.[^t-885-boot]

**What one erase can take**, with no unlock: the running application and its safe mode configuration at
`0x010000`, the configuration, the staging source at `0x1D0000` and the log area; below `0x010000`, the
bootloader and the identity block, only after the unlock.[^t-885-flash] Erasing `0x010000` erases the code
the remote is running from; that no reply then follows, and that the next start lands in the bootloader,
which can write the application back, is inferred and not checked.[^t-885-flash][^t-885-boot][^unchecked] At `0x1FE000` and up the sector command reaches a device or
the RAM the routine runs from rather than flash, and above `0x3FFFFF` an address may alias low, past the
unlock; both inferred from the processor family and not checked.[^unchecked]

## What the remote writes on its own

**A configuration can make the remote program its own flash, and the configuration says where.** The
application keeps a log in the region base slot 2 declares, and one action list instruction appends to it:
`0x0F` with an operand low byte of `0xE0` closes the current record, `0xE1` appends one byte and `0xE2` two,
and `0xE3` to `0xEF` do nothing.[^t-885-log] So a key press or an activity whose list holds it programs
flash every time it runs, until the declared number of records is used; then the append stops without a
word, and the application never erases the log on its own: its one erase is the host's
command.[^t-885-log] Two of the sixteen containers of this architecture that have been read carry such a
list, both an 880's and from two of the six configurations the sixteen come from, each appending one
record of five bytes, from lists some of which are bound to a key; what the bytes mean and which key it is
are not checked.[^t-885-log-corpus][^unchecked] The same list sits in a Harmony 525 configuration, where
what the instruction does is not read.[^t-885-log-corpus][^unchecked] All of this is the 880 and 885's
build; the Harmony 720's application is a build of its own and its log writer is not
compared.[^unchecked]

**Where it writes is whatever base slot 2 states.** At start, and only when the user configuration passed
its check and the battery calibration word is not blank, the application reads the slot's two byte count
and three byte start, and scans from the start eight bytes at a time for the first record that reads all
`0xFF`; the limit at `+5` is never read.[^t-885-log] The address is then checked against nothing but the
flash routine's own floor at `0x010000`, [writing flash](usb.md#writing-flash): not against the limit,
the configuration's end, the application or the device window.[^t-885-log][^t-885-flash] So a start that
points elsewhere has the remote program the first erased eight bytes at or after it, which can be inside
the application's padding, inside the configuration itself, or at `0x1FE000` and up, where the firmware
reaches its devices.[^t-885-log] Every configuration read declares `15360, 0x1E0000, 0x1FE000`, so a writer keeps those
three numbers and emits the append only on purpose.[^t-885-log-corpus] **Nothing past the first erased
record is looked at**: the appends program onward from there whatever the flash holds. And records are
framed on the address itself, not on the distance from the start, so a start that is not a multiple of
eight writes a count byte that names bytes never written.[^t-885-log]

**A record is up to seven data bytes, `0xFF` padding, and the number of data bytes in its last byte**:
closing an empty record does nothing, and a seventh byte closes the record by itself.[^t-885-log] That is
the entry layout Logitech's classic client reads for this architecture,
[state](../../config-format/state.md#what-an-entry-holds). This page said what the firmware writes there
is not read<!--superseded--> until the application's log writer was read.[^t-885-log]

**Nothing else is written by the remote itself**, as far as every call of its flash routines goes: that no
other table write in the application reaches flash rests on a reading of its table pointer loads that is
not asserted.[^t-885-log][^unchecked] The application programs flash from four places a
running remote reaches, the host's erase, the host's write, the host's one byte append to the hardware
version log at `0x000140`, and this log, and from one, a migration of an older hardware version byte, that
no call or branch reaches; the bootloader writes at power on as well, [the bootloader](../../usb-protocol/bootloader.md#a-flash-programmer-for-the-whole-part).[^t-885-log][^t-885-boot]
No data EEPROM is in use in either program, and there is no settings store: what the remote remembers,
the clock and the state variables, is data memory and goes with the batteries, so **no value saved on the
remote overrides the configuration**.[^t-885-log]

**The texts "FLASH Memory ID", "Erase", "Write" and "Clear" in the image are four message screens of the
built in configuration that neither program asks for**, so no write path is behind them; that they are a
self test's messages is inferred.[^t-885-log]

## Data memory

What the application keeps where in its RAM, as far as the write path and the start check read it:[^t-885-start][^t-885-end][^t-885-flash]

| address | what |
|---|---|
| `0x086` | the configuration flags: bit 1 the built in configuration passed, bit 2 the user's passed, bit 3 which of the two every lookup uses |
| `0x100` | the staged install's status, which write misc and read misc selector 6 reach, [firmware.md](firmware.md#what-the-bootloader-does-at-power-on) |
| `0x108` to `0x147` | the state variables, 64 bytes: a narrow variable `i` at `0x108 + i`, the wide ones after the narrow, `0xFE` above the last. The clock is variables 0 to 6, narrow in every configuration read, so at `0x108` to `0x10E` |
| `0x119` | state variable 17, which the firmware writes directly with the infrared queue's state, 0 to 3, [actions](../../config-format/actions.md#on-arch-8-the-remote-sends-nothing-more-until-the-configuration-answers)[^t-885-actions] |
| `0x148`, `0x149` | how many narrow and wide variables the running configuration declares |
| `0x15C` to `0x17E` | the infrared queue: its count, a ring of 30 bytes from `0x15D`, and its two cursors[^t-885-queue] |
| `0x182` | bit 3 set while the transmitter waits for the configuration's `0x07 0xFFFA`[^t-885-actions] |
| `0x1CB` to `0x1CD` | seconds since the configuration was built, 24 bits: 0 after every start, recomputed from base slot 3 and the clock, [header records](../../config-format/header-records.md#what-the-harmony-880-and-885-do-with-it)[^t-885-stamp] |
| `0x223` to `0x22C` | the running timers, two entries of five bytes, `{flags; index; u24 remaining}`, [state](../../config-format/state.md#base-slot-12-the-timer-table)[^t-885-timers] |
| `0x31E` to `0x39A` | the action queue: its count, a ring of 120 bytes from `0x31F`, forty instructions, and its two cursors[^t-885-queue] |
| `0x23A` | the unlock: `0xA7` lets an erase or a write below `0x010000` through, and it stays set until the application next starts or goes to sleep |
| `0x212`, `0x213` | which set of routines each of the two RAM slots holds; the copier skips a slot whose byte already names the set it was asked for |
| `0x28D` to `0x28F` | the log's next address, [above](#what-the-remote-writes-on-its-own) |
| `0x290`, `0x291` | the log's records left |
| `0x292` | the byte the log's append programs next |

**Write misc selector 7 writes any byte of data memory**, with no bound, in the application and in the
bootloader alike, [the misc commands](usb.md#how-a-write-ends), so in the application it reaches the
guards of a flash write this table lists: the unlock, the staged install's status, the configuration
flags, and the log's address and count. It also reaches the RAM the flash routines run from, which, if the
window onto it at `0x1FFE00` is what it appears to be, is the code the next erase, write or log append
runs while the slot's byte is left alone, and every special function register, whose meanings here are
inferred from the processor family.[^t-885-log][^t-885-end][^t-885-boot][^unchecked]

**The storage holds 64 bytes and the counts sit right after it, and nothing checks a configuration against
it.** The start's loader seeds every variable the configuration declares and paints `0xFE` from `narrow + 2 *
wide` while it is below `0x40`, the storage's size; the store and the read compare an index with `narrow`
alone, and the one bound, `narrow + wide`, is the host's, on misc selector 1.[^t-885-state] So **a writer's
ceiling on this platform is `narrow + 2 * wide` at most 64 bytes**: 63 variables with the one wide variable
every configuration read declares, 45 of them the configuration's own, about half the 128 a write
instruction can name. Past it the seeding would run on into the two counts and every wide variable would then be
read and written at the wrong place, which is inferred from the arithmetic and not observed.[^t-885-state]
The 16 containers read, six configurations, use 34 to 42 bytes.[^t-885-state-corpus] This said whether the action interpreter's own
writes check that bound was not read<!--superseded-->, until they were read.[^t-885-state]

**Every start reseeds every variable from the configuration in use**, the clock's seven included, except one
whose record states `0xFEFE`, which no configuration read does: the loader's only guard is that a
configuration passed its check, where the Harmony One's is a checksum of its data memory.
Whether anything after the loader puts the running clock back is not read.[^t-885-state][^unchecked]

## The container

| | value |
|---|---|
| cookie and end marker | `TPTP` and `DKDK`[^s14] |
| marker after the pointer table | `WLWL`, which opens the key table, at offset `0x5F`[^s14][^s20] |
| format word | `0x1500`, which is the pointer count: 21 slots[^s194] |
| pointer table | the base layout of 20 slots with a NULL inserted at slot 8, so everything from base slot 8 up sits one raw slot higher[^s20][^s194]; the firmware seeks base slots 2 to 17 through one routine that checks neither a NULL nor the count[^t-885-slots] |
| architecture record | raw slot 1, seven bytes: `08 08`, the skin, `0d`, then three zero bytes. `08 08 0f 0d` on an 880 and `08 08 11 0d` on an 885[^s182] |

Where each base slot sits is [the container's table of every architecture](../../config-format/container.md#one-table-four-architectures).[^s194]

**Logitech's classic client states this architecture's container wrongly.** Its constants for
architecture 8 declare 20 pointer slots and a trailer at offset 91[^s206], where four configurations put
the marker at 95, `0x0B + 4 * 21`, so they carry 21.[^s206b] The same constants reproduce architectures 9
and 12 exactly, so it is not a misreading of the client's convention: it is the client describing a
container no configuration here is.

## What a configuration holds that is this architecture's own

The rest of the format is the same as everywhere else and is stated once in
[the configuration format](../../config-format/README.md). These are the places this architecture differs
or where a page there names it:

* **The state variables 0 to 17 are the firmware's**, so a configuration's own variables start at 18, as on
  the Harmony One and the Harmony 600, 650 and 700, where the Harmony 525's firmware owns 0 to 12.[^s284]
  The first seven are the clock, [state](../../config-format/state.md). **All of them fit in 64 bytes**, so a
  configuration holds at most 63 variables with one wide, [above](#data-memory).[^t-885-state]
* **Event `0x2D` has to be answered with `0x07 0xFFFA` on every screen**, or the remote stops sending after
  its next change of the infrared queue's state: a mode that binds the event has to answer it, and handler
  set 1 has to keep answering for the modes that do not. Every configuration read does both, [actions](../../config-format/actions.md#on-arch-8-the-remote-sends-nothing-more-until-the-configuration-answers).[^t-885-actions][^t-885-actions-corpus]
* **A device's power on delay is a `0x7C`** at the top of the action list its `Power` variable runs when it
  switches on, as on the Harmony 525 and the Harmony One, where the Harmony 600, 650 and 700 keep it in a
  state variable, [actions](../../config-format/actions.md).[^s235] One instruction in 79 of the 80 switch on
  transitions read, and four in the Harmony 880 Pro's delay of 320.[^t-885-actions-corpus] This said it was one
  instruction<!--superseded--> until that configuration was read.
* **37 infrared records carry a second group of block pointers**, in four configurations, all in one
  device: the same RC6 command with one payload bit inverted, which is the shape of a toggling code's
  record, [infrared records](../../config-format/infrared-records.md).[^s134] **This firmware alternates the
  two groups the way the Harmony One's and the Harmony 650's do**, one bit per infrared group, cleared when the
  infrared engine is set up at every restart of the remote,
  with the difference that groups 8 and up share a bit with groups 0 and up,
  [infrared records](../../config-format/infrared-records.md#which-group-a-send-plays).[^t-885-infrared] This
  said whether it alternates was not read<!--superseded-->.
* **An infrared record is read through its own start**, its carrier is the PWM's with no clamp, and a released
  key stops at the one microsecond word that ends every once and held block,
  [sending](../../infrared/sending.md#how-the-harmony-880-and-885-play-a-record).[^t-885-infrared]
* **The codes a device's switching sends open with a silence of that device's own**, which holds every later
  code to every device since one code is sent at a time,
  [sending](../../infrared/sending.md#the-delay-between-devices-on-the-harmony-880-and-885).[^t-885-delay] That it
  is the account's inter device delay is inferred and not checked.[^unchecked]
* **The number sender is base slot 16 and is reached by `0x1F` bands `0xF3` and `0xF5`**; the contributed
  880, 885 and 880 Pro configurations hold no favourite channel, and of two 885 configurations read off units
  one holds two number senders and forty three lists that hand them a number and the other none, [state](../../config-format/state.md#base-slot-16-the-number-sender).[^t-885-number-sender][^t-885-unit-config]
  This said no 880 or 885 configuration read holds a favourite channel<!--superseded--> until one was read off
  a unit.[^t-885-unit-config]
* **Screen opcode 21 inverts a rectangle**, opcodes 22 and 23 do not exist, the fill clips at `160 - x`, and
  a switch that matches nothing runs the bytes after it, [screens](../../config-format/screens.md).[^t-885-screens]
* **The screen is 128 by 160**, and the glyph shapes of its fonts are this architecture's own alphabet,
  which the Harmony 890 and 895 share.[^s129][^s180]
* **A scan code is `(line - 1) * 4 + input`**, on a 4 by 16 lattice, [the key table](../../config-format/modes-and-keys.md).[^s144]
* **Base slot 8's leading list runs at start only when it holds exactly one instruction**, and a longer one
  runs nothing without a word, [modes and keys](../../config-format/modes-and-keys.md#base-slot-8-the-screen-keys-bindings).[^t-885-slots]
* **Base slot 15 holds nine groups of the lengths the firmware demands**, 1, 6, 1, any, 6, 14, 14, 1 and 2,
  and a group of another length fails its check without a word, [state](../../config-format/state.md#the-firmware-demands-the-lengths).[^t-885-parameters]
* **Two timers run at once, not four**; a third start is lost, and while a place is free, starting a
  running one again runs it twice. A duration keeps only its low sixteen bits, [state](../../config-format/state.md#base-slot-12-the-timer-table).[^t-885-timers]
* **Base slot 3 is not the clock**: it is the zero point of a counter of seconds since the build that no
  configuration read uses, and its start up load cannot run on this build, [header records](../../config-format/header-records.md#what-the-harmony-880-and-885-do-with-it).[^t-885-stamp]
* **Base slot 17 is read as a digit entry table**, not as a touch hit map, and every configuration read
  leaves it empty, [modes and keys](../../config-format/modes-and-keys.md#on-the-harmony-880-and-885-a-digit-entry-table).[^t-885-slots]

## Not checked

* Anything on a remote: which of the two flash parts a unit carries, and whether a unit's layout is the
  images'.[^unchecked]
* What sits from `0x1D0000` to the log area, and above the log area.[^unchecked] Below `0x1D0000`, after the
  configuration, an 885 keeps the remains of earlier configurations from the next 64 KiB boundary on,
  [the 885's memory page](../../remotes/harmony-885/memory.md); measured on 885s only, an 880 is not
  checked.[^t-885-on-a-unit] This line said everything between a configuration and the log area was not
  checked<!--superseded--> until 885s were read to `0x1D0000`.[^t-885-on-a-unit]
* The sector map below `0x010000`, where the two outside sources disagree, against a datasheet.[^unchecked]
* Whether a unit has been logging, which a read of `0x1E0000` would show, and which key the two logging
  configurations bind the append to.[^unchecked]

[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s14]: Measured in configurations. [Section 14](../../../docs/findings.md#s14)
[^s47]: Measured in configurations. [Section 47](../../../docs/findings.md#s47)
[^unchecked]: Not checked.
[^s20]: Measured in configurations. [Section 20](../../../docs/findings.md#s20)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s206]: Stated by Logitech, in their client. [Section 206](../../../docs/findings.md#s206)
[^s206b]: Measured in configurations. [Section 206](../../../docs/findings.md#s206)
[^t-885-infrared]: Read in the firmware. [The test](../../../tests/test_harmony_885_infrared.py)
[^t-885-delay]: Read in the firmware. [The test](../../../tests/test_harmony_885_delay.py)
[^t-885-number-sender]: Read in the firmware. [The test](../../../tests/test_harmony_885_number_sender.py)
[^t-885-screens]: Read in the firmware. [The test](../../../tests/test_harmony_885_screens.py)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s235]: Measured in configurations. [Section 235](../../../docs/findings.md#s235)
[^s134]: Measured in configurations. [Section 134](../../../docs/findings.md#s134)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-flash]: Read in the firmware. [The test](../../../tests/test_harmony_885_erase_and_write.py)
[^t-885-flash-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_erase_and_write.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-reads]: Read in the firmware. [The test](../../../tests/test_harmony_885_reads.py)
[^t-885-log]: Read in the firmware. [The test](../../../tests/test_harmony_885_log_area.py)
[^t-885-log-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_log_area.py)
[^t-885-actions]: Read in the firmware. [The test](../../../tests/test_harmony_885_actions.py)
[^t-885-actions-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_actions.py)
[^t-885-queue]: Read in the firmware. [The test](../../../tests/test_harmony_885_queue.py)
[^t-885-state]: Read in the firmware. [The test](../../../tests/test_harmony_885_state.py)
[^t-885-state-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_state.py)
[^t-885-slots]: Read in the firmware. [The test](../../../tests/test_harmony_885_slots.py)
[^t-885-parameters]: Read in the firmware. [The test](../../../tests/test_harmony_885_parameters.py)
[^t-885-timers]: Read in the firmware. [The test](../../../tests/test_harmony_885_timers.py)
[^t-885-stamp]: Read in the firmware. [The test](../../../tests/test_harmony_885_stamp.py)
[^t-885-on-a-unit]: Measured on a unit. [The test](../../../tests/test_harmony_885_bench_reads.py)
[^t-885-unit-config]: Measured in configurations. [The test](../../../tests/test_harmony_885_bench_reads.py)
