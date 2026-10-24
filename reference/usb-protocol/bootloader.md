# The bootloader

## 5. The bootloader speaks a second protocol, and it is a flash programmer

`findings.md` section 189. Everything above is the **application's** protocol. The bootloader in the
first 4 KiB of internal program memory has its own, and the two share nothing: no length nibble, no
high nibble command, no state machine. A host that can drive one cannot drive the other.

**How a remote gets there.** At every power on the bootloader configures the external memory bus, checks
that external flash is programmed by requiring the byte at `0x020024` to be neither `0x00` nor `0xFF`,
and then scans the keypad and compares the resulting byte against two literals. `0x0E` keeps it
resident; `0x1E` runs the image above `0x1000` without validating it; anything else validates that
image's `48 47` header magic and runs it if present. **When the external flash check fails the keypad
scan is skipped**, which costs nothing: the path then falls through the validator to the image or to
status 9, and status 9 lands in the same loop. Every path that does not hand off converges on a USB service loop that never returns, so a
remote whose image above `0x1000` is destroyed still attaches and answers. The scan reaches the keypad
over the **external memory bus**, a `TBLWT` to `0x020020` and a `TBLRD` from `0x020021`, plus one
`PORTB` read.

**The command is the whole first byte of a report on endpoint 1.** Not a nibble. **Endpoint 1 OUT and
endpoint 1 IN point at the same buffer**, `0x0420`, per their own descriptors at `0x408` to `0x40F`, with
the reply length going into `0x40D`. So buffer offsets `0x422` to `0x424` are a 24 bit **request**
address on the commands that take one and **reply** payload on the commands that produce one, and this
document had command `0x00` the wrong way round for an hour. Twelve commands, `0x00` to `0x0A` contiguous
plus `0xFF`, decoded from an `XORLW` chain and therefore through `chains.py` rather than by hand:

| command | what it does, mechanically | confirmed |
|---|---|---|
| `0x00` | reply four bytes, the third and fourth being `0x00` and `0x02` | both |
| `0x01`, `0x06` | read program memory through `TBLRD`. Two commands, one routine | both |
| `0x09` | read data memory through `FSR` | both |
| `0x02` | copy the request into the holding latches and commit | both |
| `0x08` | the same, without the commit | both |
| `0x0A` | write 64 bytes of `0xFF` through `TBLWT` and commit | both |
| `0x03` | erase, **refusing any address below `0x001000`** | both |
| `0x04` | disarm `EECON1` and fill the reply with `0xBB` | both |
| `0x05` | count the request's bytes and reply with the length | both |
| `0x07` | reply one byte, no routine at all | both |
| `0xFF` | disable USB, delay, then run the image above `0x1000` | both |

**The column is mechanical and the names are deliberately absent**, because the descriptors say this
bootloader is probably not Logitech's. Both carry their own, inside the 4 KiB, and they are
**`04D8:000B`** with `bcdDevice` `0x0000` and every string index zero, where the image above `0x1000` is
`046D:C121` with the string `Harmony Remote 4-3.4.0`. `0x04D8` is **Microchip's** vendor id. So the
hypothesis is a stock Microchip HID bootloader whose numbering is documented outside this project, which
would be an external cross-check on the table, and which would explain why four of the twelve commands do
nothing useful: neither bench part has data EEPROM or a separate configuration access path. Untested,
decision 7.

**And that identity is the bench observable for the recovery state**: a Harmony One in its bootloader
enumerates as `04D8:000B` with no product string, which `listHarmony` decides without opening the device
or sending anything.

"confirmed both" means the Harmony One's `one_internal_fe` and the Harmony 600's `h600_internal_fe`,
whose switches sit at `0x0047C` and `0x001A8`. The case sets are equal, the same two commands share one
routine on each, and the erase routines are the same instruction sequence with only the branch targets
differing, so this is one programmer compiled from one source.

**The commit is the PIC18 unlock**, `0x55` and `0xAA` into `EECON2` then `BSF EECON1,1`. `EECON1` takes
`0x04` to write and `0x14` to erase a row, and each bootloader writes it seven times with the same
values in the same order. On the PIC18F87J50 and PIC18F67J50 bits 6 and 7 of that register are
**unimplemented**, so the `0xC4` an unreferenced routine writes is `WREN` and not, as this said for an
hour, a reach into the configuration words: that reading is the generic PIC18 layout and belongs to the
Harmony 525's PIC18F4550. `WPROG` is never set in either image, so programming goes through the holding
latches a block at a time.

**Unconfirmed, and load bearing: whether any of this reaches external flash.** Every write and erase
path goes through `EECON1` and `EECON2`, which is the internal self programming interface, and the
config lives in external parallel NOR. Nothing here issues a NOR command sequence. So the programmer is
**not** shown to restore a config and must not be documented as if it were; what it is shown to
reinstall is the internal image. The read commands are a separate matter and are unbounded, and the
keypad scan proves a `TBLRD` above internal flash does reach the external bus.

**Nothing here has been sent to a remote.** This is a firmware reading only, and `packages/usb`
implements none of it.
