# Harmony 880 and 885: USB

A Harmony 880 or 885 speaks the same command protocol over its USB cable as the Harmony 525, the Harmony
One and the Harmony 600, 650 and 700: a host asks for its version, reads its flash by address and writes
it back. That is how other people read its configurations and its firmware off their remotes. This page
says how the remote identifies itself and what its version block holds; the protocol itself is
[the USB protocol](../../usb-protocol/README.md).

A Harmony 885 has answered on a cable, and everything below that the images predicted, it reported; the
rest is read in the firmware images or stated by Logitech's client, as each footnote says. This said no
remote of this architecture had been on a cable<!--superseded--> until one was.[^t-arch8-usb]

## Identity

| | value | source |
|---|---|---|
| vendor and product id | `0x046D:0xC110`, Logitech's **Espresso** platform | [^s207] |
| transport | the HID command reports, the first of the three transports Logitech's classic client knows: it builds the same channel for Espresso as for the Harmony 525's and the Harmony One's platforms | [^s207] |
| `bcdDevice` | `0x080F` on an 880 and `0x0811` on an 885: protocol 8 in the high byte and the skin in **plain binary** in the low, the older of the two forms | [^s113], and the 885's on a unit[^t-usbdesc] |
| endpoints | one HID interface, interrupt IN on endpoint 1 and OUT on endpoint 2, 64 bytes each way every 1 ms, and a 33 byte report descriptor that declares the input report Absolute, as the Harmony One's does | [^t-usbdesc] |
| product string | `Harmony Remote 0-4.4.2` on an 885 | [^t-usbdesc] |

**Read as BCD, the 885's word names the wrong remote**: `0x11` is 17 in binary, the Harmony 885, and 11
in BCD, which is a Harmony 655 in Logitech's model list. The 880's `0x0F` is 15 under either reading, so
the 880 alone could not show the difference. The two forms are told apart by the word's value,
[the transport](../../usb-protocol/transport.md).[^s113]

**This library reads these remotes and writes none of them.** It said it opened none<!--superseded-->
until a Harmony 885 was opened unchanged; what it lacked was an address rule for reads, which it has now.
Its configuration reader holds a profile for `0xC110`, reading from `0x020000`,[^t-read-profile] and has read
a configuration off 885s whole;[^t-885-on-a-unit] the generated table in the
[Harmony 885's usb.md](../../remotes/harmony-885/usb.md) states what the code holds. This said
the reader still held no profile for `0xC110`<!--superseded--> until one was added.[^t-read-profile]

## Reading flash

**The application checks no address on a read.** `READ_FLASH` parses the address into a 24 bit table
pointer and fetches every byte with one table read; only the erase calls an address check. So a read
past the part is not refused by the remote, and the bound of `0x200000` is the library's, the program
memory space of a PIC18.[^t-arch8-read]

**A read comes back in chunks of 62, 30, 14 or 6 data bytes and a last one of 1 to 5**: the remote sends
a chunk of length 63, 31, 15 or 7, the sequence byte included, the largest that the remaining count fills,
or the rest when fewer than six bytes remain. The sequence byte steps by `0x11` from chunk to chunk. The
count reaches zero for every one of the 65536 counts, because the byte loop counts down by one and every
chunk carries at least one byte, so **the odd count hang of the Harmony One has no counterpart here**; an
odd count on a remote is not measured.[^t-885-reads][^unchecked] This page used to quote 63, 31, 15 and 7
as the chunk sizes, which are the lengths with the sequence byte in them.[^t-885-reads]

**Two last bytes are not flash.** When a read's last byte is `0x000104` or `0x000105` and it is alone in
its chunk, which needs an odd count ending there, the remote does not fetch it:[^t-885-reads]

* `0x000104` returns the newest entry of the hardware version log at `0x000140` to `0x000147`, the same
  byte the version block reports as the hardware version, in place of the flash byte there.[^t-885-reads]
* **`0x000105` takes a measurement**: by the registers it uses, which the processor family names a port
  and the analogue converter, it switches a pin on, averages eight conversions on channel 1, switches the
  pin off and returns a scaled result. It is the one read that acts on the hardware. The register reading
  is inferred from the family, and what channel 1 measures is not identified.[^t-885-reads][^unchecked]

The bootloader does the same at the same two addresses.[^t-885-boot] This page said what those return is
not checked<!--superseded--> until the routines were read.[^t-885-reads]

**The 8 KiB below `0x200000` hold devices, not only flash**: the firmware reaches what the code that uses
them makes its keypad latches, its USB controller and its display controller at `0x1FE040` to `0x1FE0C1`,
and runs code in a window onto its RAM from `0x1FFE00`, so a read there is a bus cycle on a device or on
RAM, [memory.md](memory.md); which part sits at each address is not checked against the hardware.[^t-885-boot][^unchecked]
A read of the display controller's data port would advance the controller's own address, on the controller
family its command bytes fit, and a read of the USB controller's data port reads whichever of its registers
is selected; both inferred, not checked.[^unchecked] **Above `0x1FFFFF`** the address goes to the processor
unmasked, and a read that starts below `0x200000` and runs past it continues above it. By the PIC18 family
that reaches the configuration space up to `0x3FFFFF` and the bottom of flash again from `0x400000`; inferred
from the family and not checked against the part.[^t-885-reads][^unchecked]

**So the safe window for reading a whole region is `0x000000` to `0x1FDFFF`, ending no transfer at
`0x000104` or `0x000105` with an odd count.** Reads of `0x8000` bytes from a `0x8000` boundary and the
64 byte identity read never meet the two.[^t-885-reads] The library refuses a read by where it **starts**
and not where it ends, so a read that starts below `0x1FE000` and runs into the device window is not
refused by `packages/usb`; its region check, `validateRegionByte` in `packages/usb/src/protocol.ts`, is the
evidence.

## Writing flash

**A write is the transfer every Harmony uses, and the remote never says whether anything was written.** An
announce with an address and a count, data packets of up to 63 bytes with no reply each, and a done packet
the remote answers with `F0 30`.[^t-885-flash] What a host has to know on this platform:[^t-885-flash]

* **The remote erases nothing before it programs.** Each byte goes into whatever the flash holds, so a
  sector has to be erased first, and over old content a programmed byte can only clear bits.
* **The application skips `0xFF` bytes** and leaves the old byte there, where the bootloader programs every
  byte, `0xFF` included.[^t-885-flash][^t-885-boot] Over erased flash the two come to the same thing; over
  unerased flash a write can read back partly right and partly old.
* **The address is checked once per packet, on its first byte**, with the floor at `0x010000` and the
  unlock below it as in the bootloader, and **no ceiling**. A packet starting just below `0x010000` without
  the unlock is dropped whole, its bytes above `0x010000` included, and the next one lands where it would
  have.
* **`F0 30` comes back whatever happened**: a refused packet, a program that failed and a count never
  reached all answer the same. Only a read back says what was written.
* **The announced count is never enforced**; the transfer is as long as the packets the host sends. The
  3150 byte transfer is Logitech's client's choice, and nothing in the remote bounds it.
* **The length nibble decodes as on the other platforms read**: 0 to 7 as they are, `0x08` as 15, `0x09`
  as 31 and `0x0A` as 63, and `0x0B` to `0x0F` left as 11 to 15, [the commands](../../usb-protocol/commands.md#the-first-byte-is-a-command-and-a-length).
* **Two addresses are not flash.** A one byte packet at `0x000106` sets the unlock and writes nothing, and
  the unlock then stays set until the remote next starts or goes to sleep; a write with one byte left at
  `0x000104` appends to the hardware log instead, and in the application programs nothing unless the
  unlock was set first.
* A packet that is neither data nor done ends the transfer with no reply.

## Erasing flash

**One erase takes one address and removes the sector of the part that holds it**, [memory.md](memory.md#the-flash-part).
The application checks the address twice, as the bootloader does: a floor at `0x010000` below which the
erase needs the unlock byte, and **no ceiling**.[^t-885-flash] So the running application at `0x010000`
is erased with no unlock at all; only the bootloader, below, is guarded.[^t-885-flash] That the remote then
stops answering until its bootloader takes over at the next start is inferred, not checked.[^unchecked]

**`F0 D0` does not mean erased.** Once the floor passes, the erase runs at once and the reply follows
whatever the routine did, a refusal by the unlock test or a part that gave up included. **A refused erase
gets no reply from the command**: the remote calls its error routine and drops the command, so the host
waits for a reply that does not come; what the error routine does besides drawing is not read.[^t-885-flash][^unchecked]
So a writer should erase only whole 64 KiB sectors from `0x020000`, and read every erased sector back.[^t-885-flash]

## How a write ends

**The escape is handled**, by the packet parser before the command switch, which is why the switch holds no
case for it: `E1 01` clears the command state, and `E1 02` and `E1 03` restart the remote, which waits 500
ticks of its timer and executes the processor's `RESET`; none of them replies, and any other sub code does
nothing.[^t-885-end] This page said the dispatch's lack of a case meant that, so neither the session end
nor the restart is reached from it<!--superseded-->, until the parser was read.[^t-885-end]

**Only a restart takes up a new configuration**: the check and the sizing of its state variables run at a
start and at no other moment, [firmware.md](firmware.md#what-the-application-does-at-start).[^t-885-end][^t-885-start]

**The misc commands.** `WRITE_MISC` takes five bytes whatever its length nibble, serves six selectors and
answers each `F0 A0`; any other selector gets no reply at all.[^t-885-end]

| selector | `WRITE_MISC` | `READ_MISC` |
|---|---|---|
| `0x01` | writes a state variable: of the four bytes after the selector, the second is the index and the last two the value; an index past the declared variables is refused and still answered | the state variable at the low address byte, high byte then low |
| `0x02` | moves every lookup to the built in configuration until the next start | |
| `0x05` | a zero first byte switches every interrupt off; anything else on | |
| `0x06` | the staged install's status: the first byte must be zero, the second is the status | the status, when the address's high byte is zero |
| `0x07` | one byte of data memory at the address, with no bound | one byte of data memory, with no bound |
| `0x08` | recalculates a value from the clock, when a configuration passed its check | |
| any other | no reply | two zero bytes |

**Write misc selector 7 reaches the guards of a flash write the application keeps in data memory**: the unlock, the staged install's status, the configuration flags, the log's address and the RAM the flash
routines run from, [memory.md](memory.md#data-memory).[^t-885-log]

`READ_MISC` answers `C2`, the selector and **two** bytes; a host that takes a narrow state variable from
the third byte reads zero, the trap [the commands](../../usb-protocol/commands.md) record on the Harmony
525.[^t-885-end] **The clock is state variables 0 to 6**, at data memory `0x108` to `0x10E`, so either
`READ_MISC` selector reads it, [memory.md](memory.md#data-memory).[^t-885-end]

**Of the eight step write sequence of the Harmony One and the Harmony 600, 650 and 700,
[the commands](../../usb-protocol/commands.md#a-configuration-write-in-order), two steps must not be carried
over**:[^t-885-end]

* **step 2, `WRITE_MISC` selector `0x0A`, does not exist here**, and sending it gets no reply at all, so a
  writer waiting for one hangs until it times out;
* **step 7, status 2, must not be sent**: at the restart that follows, the bootloader would erase the
  application and copy 64 KiB from `0x1D0000` over it, [firmware.md](firmware.md#what-the-bootloader-does-at-power-on).

Step 3, status 0 and its read back, is harmless and worth keeping as a read, since a status other than zero
turns the restart into an application install; step 4, selector 2, keeps the remote off the region being
rewritten; step 8 is `E1 02`, with no reply, after which the remote comes back through its
bootloader.[^t-885-end] Logitech's classic client never writes the status for a configuration on this
platform: after the write it erases the event range the configuration's header names, restarts the remote
the same way, and then writes the saved state variables back and sets the clock.[^t-885-end-client]

**On an 885 that sequence was performed once and the remote took the configuration up**: selector 2 was
answered, three sectors of the configuration were erased and rewritten, the status read 0 before and after,
`E1 02` was sent, and the remote was back on the bus within five seconds holding the written configuration
byte for byte, its clock standing on the configuration's stamp plus the seconds since the restart. The status
was read with `READ_MISC` selector 7 at `0x100`. An 880 is not checked.[^t-885-first-write][^unchecked]

## In the bootloader

**The bootloader answers the same protocol**, six of the application's commands and the escape, with no
`0x70`, and it enumerates with the application's own device descriptor, so the ids cannot tell a remote
held in its bootloader from a running one; the product string `Harmony Bootloader` and the version
block's software type 3 can, [the bootloader](../../usb-protocol/bootloader.md#the-harmony-880-and-885).[^t-885-boot]
This page listed which commands the bootloader dispatches<!--superseded--> as not checked until the bootloader
was read.

## The version block

The firmware answers the version request from five constants returned by consecutive `RETLW`
instructions at `0x11C46`, in the order field 0, field 4's low nibble, field 5, field 6, field 4's high
nibble.[^s114]

| field | application, 880 | application, 885 | bootloader, 880 and 885 | what it is |
|---|---|---|---|---|
| 0 | `0x44` | `0x44` | `0x40` | the firmware version, BCD |
| 4, low nibble | 0 | 0 | 3 | the software type: application, or Boot mode |
| 5 | `0x0F` | `0x11` | `0x0F`, `0x11` | the skin, 15 or 17 |
| 6 | `0x08` | `0x08` | 0 | the platform, below |
| 4, high nibble | 8 | 8 | 8 | the architecture |

Read in the two applications[^s114] and the two bootloaders.[^s116] A Harmony 885 running its application
answers `44 21 49 01 80 11 08`, the four predicted fields exactly.[^t-arch8-usb] **The other three come from
the remote itself**: the hardware version is the newest entry of the hardware log at `0x000140`, and the
flash ids are read off the part, with an Atmel `1F:C0` reported as `01:49` by the application and as it
is by the bootloader, [memory.md](memory.md#the-flash-part).[^t-885-reads][^t-885-flash]

**Field 6 names a platform and not an architecture.** It is 8 here, 9 on the Harmony 525, and 12 on both
the Harmony One and the Harmony 600, 650 and 700, and it is the same in a remote's safe mode image as in
its application on those last two, so it reads as the lowest architecture of its platform. That reading
is not confirmed, and nothing depends on it.[^s116]

**In the two bootloaders field 6 is zero**, where the applications carry 8. No safe mode image of this
architecture is known, so whether one would report zero there too is not checked.[^s116][^unchecked] The
mode a remote is in is field 4's low nibble, [the version block](../../usb-protocol/version-block.md).

## What a configuration file states against it

A configuration file's header names the remote it was built for, and a host compares it with this block
before writing, [the EZHex wrapper](../../config-format/ezhex.md#which-remote-a-file-is-for). On this
platform the comparison works as written, and two of its fields mean something narrower than their
names:

* **`FLASH` asks whether the application knows the part, not which part is fitted.** The configuration
  files read for this platform all state `0x01:0x49`,[^t-version-file] which is what the application
  reports for either part it knows, [memory.md](memory.md#the-flash-part). A unit whose part the
  application does not know reports `FF:FF`,[^t-885-flash] and the comparison refuses such a block
  against a file stating `0x01:0x49`.[^t-version-file]
* **`BOARD` is stored on each unit**: it is the newest entry of the hardware log at `0x000140`, which the
  bootloader writes and a host can append to, so it is not a constant compiled into the firmware. The
  library's rails confine a flash write to the configuration region, so nothing it sends reaches that
  log.[^t-885-reads][^t-885-flash]
* **`PROTOCOL` is the architecture, 8, and field 6 is 8 here as well.** So on this platform a reader that
  took `PROTOCOL` from field 6 would still compare correctly, and nothing on it would show that
  mistake.[^t-version-885]

**The Harmony 885 configuration read matches the block a Harmony 885 reports on all five fields it
states.** Five Harmony 880 configuration files are refused against the same block on `SKIN` and `BOARD`, skin
15 against 17 and board 1.8.0 against 2.1, and on nothing else.[^t-version-885] Whether an 880
configuration would run on an 885 is not checked.[^unchecked]

## Not checked

* Which of the two flash parts a unit carries: the application reports both as flash `0x49` from
  manufacturer `0x01`, as a Harmony 885 does, [memory.md](memory.md#the-flash-part).[^t-arch8-usb][^t-885-flash][^unchecked]
* Whether the USB controller drops a report that arrives while a packet is programmed with interrupts off,
  and what the restart's write to it does.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s113]: Read in the firmware. [Section 113](../../../docs/findings.md#s113)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^unchecked]: Not checked.
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-arch8-read]: Read in the firmware. [The test](../../../tests/test_arch8_usb.py)
[^t-usbdesc]: Measured on a unit. [The test](../../../tests/test_usbdesc.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-reads]: Read in the firmware. [The test](../../../tests/test_harmony_885_reads.py)
[^t-885-flash]: Read in the firmware. [The test](../../../tests/test_harmony_885_erase_and_write.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-end-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-first-write]: Measured on a unit. [The test](../../../tests/test_harmony_885_first_config_write.py)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-log]: Read in the firmware. [The test](../../../tests/test_harmony_885_log_area.py)
[^t-885-on-a-unit]: Measured on a unit. [The test](../../../tests/test_harmony_885_bench_reads.py)
[^t-read-profile]: Measured in configurations. [The test](../../../packages/corpus/test/read.test.ts)
[^t-version-885]: Measured on a unit. [The test](../../../packages/corpus/test/compatibility.test.ts)
[^t-version-file]: Measured in configurations. [The test](../../../packages/corpus/test/compatibility.test.ts)
