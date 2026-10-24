# The bootloader

The first 4 KiB of a Harmony One's or a Harmony 600's own program flash hold a small program that runs
before anything else at every power on. It decides what to start, and if it starts nothing it waits on the
USB cable as a **flash programmer** of its own, with a protocol that shares nothing with
[the commands](commands.md) the running remote answers: no length nibble, no command in the high nibble,
no state machine. A host that can drive one cannot drive the other. It can rewrite the processor's
internal flash; it is not shown to reach the configuration's external flash. Nothing in this reference has
sent it a command, and `packages/usb` implements none of it; `openHarmony` refuses a remote in its
bootloader.

What follows is read in the Harmony One 3.4's and the Harmony 600 0.2's internal `0xFE` pages, whose command
switches are at `0x0047C` and `0x001A8`[^s189]. Where each architecture keeps it, and how it differs
between the Harmony 600 and 650, is [the Harmony One's memory](../architectures/harmony-one/memory.md) and
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

## Not checked

* Any command sent to a bootloader, on any remote[^unchecked].
* Which keys enter it, and whether entering it by keys works as read[^unchecked].
* Whether the numbering is Microchip's stock HID bootloader's[^unchecked].

[^s189]: Read in the firmware. [Section 189](../../docs/findings.md#s189)
[^unchecked]: Not checked.
[^s87]: Read in the firmware. [Section 87](../../docs/findings.md#s87)
[^s191]: Read in the firmware. [Section 191](../../docs/findings.md#s191)
