# The bootloader

The bootloader is the small program that runs before anything else at every power on and decides what to
start. Two quite different ones are known, and what holds for one says nothing about the other.

**On the Harmony One and the Harmony 600** it is the first 4 KiB of the processor's own program flash, and
if it starts nothing it waits on the USB cable as a **flash programmer** of its own, with a protocol that
shares nothing with [the commands](commands.md) the running remote answers: no length nibble, no command in
the high nibble, no state machine. A host that can drive one cannot drive the other. It can rewrite the
processor's internal flash; it is not shown to reach the configuration's external flash. Nothing in this
reference has sent it a command, and `packages/usb` implements none of it; `openHarmony` refuses a remote in
its bootloader.

**On the Harmony 880 and 885** it is the bottom 64 KiB of the one flash part, and if it starts nothing it
answers **the application's own command protocol**, so a host that can talk to a running remote can talk to
it with the same packets, and it can rewrite every part of the flash, its own 64 KiB only after an unlock,
[below](#the-harmony-880-and-885).[^t-885-boot]

The sections before the Harmony 880 and 885's are read in the Harmony One 3.4's and the Harmony 600 0.2's
internal `0xFE` pages, whose command switches are at `0x0047C` and `0x001A8`[^s189]; this page described
those two alone until the Harmony 880 and 885's bootloader was read.[^t-885-boot] Where each architecture
keeps it, and how it differs between the Harmony 600 and 650, is
[the Harmony One's memory](../architectures/harmony-one/memory.md) and
[the Harmony 600, 650 and 700's](../architectures/harmony-600-650-700/memory.md).

## How a remote gets there

On the Harmony One, at every power on the bootloader configures the external memory bus, checks that
external flash is programmed by requiring the byte at `0x020024` to be neither `0x00` nor `0xFF`, and then
scans the keypad and compares the result against two literals[^s189]:

| keypad byte | what the bootloader does |
|---|---|
| `0x0E` | stays resident, in its USB service loop |
| `0x1E` | runs the image above `0x1000` without validating it |
| anything else | validates that image's `48 47` header magic and runs it if present |

**When the external flash check fails the keypad scan is skipped**, which costs nothing: the path then
falls through the validator to the image, or to a status that lands in the same loop. Every path that does
not hand off ends in a USB service loop that never returns, so a remote whose image above `0x1000` is
destroyed still attaches and answers. The scan reaches the keypad over the external memory bus, a `TBLWT`
to `0x020020` and a `TBLRD` from `0x020021`, plus one `PORTB` read[^s189]. Which physical keys give
`0x0E` is not known[^unchecked]. On the Harmony 600, 650 and 700 the bootloader compares two other key
codes, `0x14` and `0x2C`[^s87], and entering it by keys has not been tried on either
architecture[^unchecked].

## How a host recognises it

**The bootloader enumerates as `04D8:000B`**, with `bcdDevice` `0x0000`, device class zero, an 8 byte
control endpoint, one configuration of 32 bytes at 100 mA and every string index zero, so no manufacturer,
product or serial string. Its descriptors sit inside the 4 KiB, at `0x0F6E` on the Harmony One and `0x0EA6`
on the Harmony 600, and they are identical where it counts. `0x04D8` is Microchip's vendor id, where the
image above `0x1000` names itself `046D:C121` and `Harmony Remote 4-3.4.0` on the Harmony One[^s189]. So a
remote in its bootloader is recognised by enumeration alone, which `listHarmony` decides without opening
the device or sending anything[^s189].

## The protocol

**The command is the whole first byte of a report on endpoint 1.** Endpoint 1 OUT and endpoint 1 IN point
at the same buffer, `0x0420`, per their own buffer descriptors at `0x408` to `0x40F`, with the reply length
going into `0x40D`. So buffer offsets `0x422` to `0x424` are a 24 bit **request** address on the commands
that take one and **reply** payload on the commands that produce one[^s189].

Twelve commands, `0x00` to `0x0A` and `0xFF`, decoded from an `XORLW` chain through
`src/harmony/pic18/chains.py`. The case sets of the two images are equal, the same two commands share one
routine on each, and the erase routines, `0x003CA` on the Harmony One and `0x000F6` on the Harmony 600, are
the same instruction sequence with only the branch targets differing, so this is one programmer compiled
from one source[^s189]:

| command | what it does, mechanically |
|---|---|
| `0x00` | reply four bytes, the third and fourth being `0x00` and `0x02` |
| `0x01`, `0x06` | read program memory through `TBLRD`; two commands, one routine |
| `0x09` | read data memory through `FSR` |
| `0x02` | copy the request into the holding latches and commit |
| `0x08` | the same, without the commit |
| `0x0A` | write 64 bytes of `0xFF` through `TBLWT` and commit |
| `0x03` | erase, **refusing any address below `0x001000`** |
| `0x04` | disarm `EECON1` and fill the reply with `0xBB` |
| `0x05` | count the request's bytes and reply with the length |
| `0x07` | reply one byte, with no routine at all |
| `0xFF` | disable USB, delay, then run the image above `0x1000` |

**The erase refuses to erase the bootloader**, since `0x001000` is its end, and has no upper bound: a rail
written by somebody protecting the recovery path rather than the payload, and the reason the route can
survive its own use[^s189].

**The names are deliberately left out**, because the descriptors say this bootloader is probably not
Logitech's. The hypothesis is a stock Microchip HID bootloader, whose numbering would be documented outside
this reference; it would also explain why four of the twelve commands do nothing useful, since neither the
Harmony One's processor nor the Harmony 600's has data EEPROM or a separate configuration access path. It
has not been compared with Microchip's documentation[^unchecked].

**The commit is the PIC18 unlock**, `0x55` and `0xAA` into `EECON2` then `BSF EECON1,1`. `EECON1` takes
`0x04` to write and `0x14` to erase a row, and each bootloader writes it seven times with the same values in
the same order. On the PIC18F87J50 and PIC18F67J50 bits 6 and 7 of that register are unimplemented, so the
`0xC4` an unreferenced routine writes is `WREN`, not a reach into the configuration words; that reading is
the generic PIC18 layout and belongs to the Harmony 525's PIC18F4550. `WPROG` is never set in either image,
so programming goes through the holding latches a block at a time[^s189].

## What it can restore

**Whether any of it reaches external flash is not shown, and it matters.** Every write and erase path goes
through `EECON1` and `EECON2`, which is the processor's internal self programming interface, and the Harmony
One's configuration lives in external parallel NOR; nothing here issues a NOR command sequence. So the
programmer is **not** shown to restore a configuration, and what it is shown to reinstall is the internal
image. Its read commands are unbounded, and the keypad scan proves a `TBLRD` above internal flash does reach
the external bus[^s189]. On the Harmony One, safe mode is the route that does reach the configuration's
flash, with the application's own commands, [the commands](commands.md#erase_flash)[^s191].

## The Harmony 880 and 885

**A complete program with its own USB service loop, not a stub.** At power on it installs a staged
application if one is waiting, keeps itself resident if one of two keys is held, and otherwise checks the
application and hands over to it. When it stays, it shows a screen of its own, attaches to USB and serves
commands until a host sends the restart, and it does the same when the application fails the check, so a
remote whose application is destroyed still answers on the cable. Read in both bootloader builds, the
Harmony 880's and the Harmony 885's, version 4.0, which agree on everything on this page but write misc
selector 2, which clears one flag bit on the 880 and two on the 885; how they differ during a staged
install, and what the bootloader does at power on in order, is
[the architecture's firmware page](../architectures/harmony-880-885/firmware.md#what-the-bootloader-does-at-power-on).[^t-885-boot]

### How a host recognises it

**It carries the running application's own device descriptor**, byte for byte, `046D:C110` with the same
`bcdDevice`, so vendor and product id cannot tell the two apart, and a host that opens a remote by its ids
opens this program too. What differs is the product string, `Harmony Bootloader` where the application
says `Harmony Remote 0-4.4.2`, and the version answer, whose software type is 3 where the application's
is 0, [the version block](version-block.md).[^t-885-boot]

### The protocol

The application's framing, [the commands](commands.md): the command in the high nibble of the first byte,
the length code in the low one. Six commands and the escape, where the application's switch has the same
six and `0x70`:[^t-885-boot]

| command | what it does |
|---|---|
| `0x10` version | the version block: firmware 4.0, the hardware version, the flash part's device and manufacturer ids read off the part itself, architecture 8 with software type 3, the skin, and zero in field 6 |
| `0x30` write flash | each byte programmed into the flash part, the address checked as below. A one byte write to `0x000106` is not programmed: it sets the unlock |
| `0x50` read flash | one table read per byte and **no bound on the address**; a read whose last byte is `0x000104` or `0x000105`, alone in its chunk, returns the newest hardware version or a measurement instead, as the application's does, [the Harmony 880 and 885's usb page](../architectures/harmony-880-885/usb.md#reading-flash) |
| `0xA0` write misc | four selectors: 2 clears flag bits, 5 masks or unmasks interrupts, 6 sets the **status byte** that asks for a staged install, 7 writes one byte of data memory at any address, the special function registers included |
| `0xB0` read misc | selector 6 returns the status byte, 7 one byte of data memory, any other zero |
| `0xD0` erase | erases the sector of the flash part at the address. A refused erase shows error code 2 on the screen and drops the command, so **no reply is sent** |
| `0xE0` escape | sub command `0x01` clears the command state; `0x02` and `0x03` detach from USB and restart, after which the power on decision runs again |

**There is no `0x70`**, where the application on this platform has one, as the applications of the Harmony
One and the Harmony 600, 650 and 700 do.[^t-885-boot] What each selector of the two misc commands does is read and not asserted;
their case sets are.[^t-885-boot]

### A flash programmer for the whole part

**Erase and write have one bound, a floor, and no ceiling.** An address at or above `0x010000`, the
application, the configuration and everything above them, is erased and written with no condition. Below
it, the bootloader's own 64 KiB, an erase or a write is refused unless the unlock byte is `0xA7`. A host sets
the unlock by a one byte write flash of `0xA7` to `0x000106`, and write misc selector 7, which writes any
byte of data memory, reaches it too; it is cleared at every power on. The bootloader also sets it itself,
and clears it straight after, around its one write into its own 64 KiB, a byte of a hardware version log at
`0x000140`. The check is the
first thing the erase and both programming routines do, on the address they start at, and the erase command
checks the floor once more before it starts.[^t-885-boot] **Logitech's classic client writes exactly that
byte to exactly that address** before it rewrites the bottom 64 KiB to erase a remote's identity block, the
one unlock it sends before any write,
[Logitech's classic client](../logitech/classic-client.md#erasing-the-identity-block).[^t-885-boot-client]

The programming itself is the command sequences of an AMD style NOR flash part, unlock cycles to
`0x000AAA` and `0x000555`, run from a copy of the bootloader's routines in RAM, since code cannot run from
the part it is programming. It programs through the part's unlock bypass mode and writes every byte it is
sent, `0xFF` included, where the application skips `0xFF` bytes.[^t-885-boot][^t-885-flash] The firmware
knows two flash parts; which one is fitted, and so the sector map an erase below `0x010000` meets, is not
checked, while from `0x010000` up every source gives 64 KiB sectors,
[the platform's memory](../architectures/harmony-880-885/memory.md#the-flash-part).[^t-885-flash][^unchecked]

### What it can restore

**A remote whose application is damaged still reaches it**, by itself when the image check fails and by a
held key when the application passes its check but misbehaves, and through it a host can erase and write
the application back with the commands it already sends to a running remote. What it cannot restore is
itself: an erased bootloader sector leaves nothing to run at power on, and erasing one takes the unlock
first, so it does not happen by accident.[^t-885-boot] On an 885 the two keys are Power and OK, by the
codes the application raised for them on a unit and the scan arithmetic the bootloader shares with it; that
holding one at power on keeps the bootloader is not checked.[^t-885-keys-u][^t-885-boot][^unchecked]

## Not checked

* Any command sent to a bootloader, on any remote[^unchecked].
* Which keys enter it, and whether entering it by keys works as read[^unchecked].
* On the Harmony 880 and 885, whether holding Power or OK at power on keeps it (an 880's keys are not
  pressed at all), which of the two
  flash parts is fitted, and that the bootloader serves `Harmony Bootloader` for the descriptor's
  product index[^unchecked].
* Whether the numbering is Microchip's stock HID bootloader's[^unchecked].

[^s189]: Read in the firmware. [Section 189](../../docs/findings.md#s189)
[^unchecked]: Not checked.
[^s87]: Read in the firmware. [Section 87](../../docs/findings.md#s87)
[^s191]: Read in the firmware. [Section 191](../../docs/findings.md#s191)
[^t-885-boot]: Read in the firmware. [The test](../../tests/test_harmony_885_bootloader.py)
[^t-885-keys-u]: Measured on a unit. [The test](../../tests/test_harmony_885_keys.py)
[^t-885-boot-client]: Stated by Logitech, in their client. [The test](../../tests/test_harmony_885_bootloader.py)
[^t-885-flash]: Read in the firmware. [The test](../../tests/test_harmony_885_erase_and_write.py)
