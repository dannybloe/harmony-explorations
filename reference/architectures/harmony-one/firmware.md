# Harmony One firmware

The Harmony One runs one program, the application, and keeps four smaller ones beside it: a bootloader
that decides at power on what to start, a safe mode that can repair the remote, an image for its
programmable logic, and a library that programs the external flash. Of the five, Logitech's package
carries only the application, together with the configuration safe mode shows[^s3]. This page says where each lives, how the package that carries the
application is laid out, and what safe mode can and cannot do. Where each sits in memory is
[memory.md](memory.md).

## The images

| image | version | where it is stored | where it runs |
|---|---|---|---|
| application | 3.4 | external `0x020000` to `0x02EA92`, 60050 bytes, and a stored copy at `0x3D0000` | in place at `0x020000`, entry point `0x02EA38`[^s3][^s1]; `0x020000` to `0x02002F` is data, the header and a `DEADDEAD` fill, which a disassembler must be told, since `48 47` decodes as a valid instruction[^s10] |
| safe mode | 3.4[^s23] | internal `0xFE` `+0x1000` | internal flash[^s189] |
| bootloader | none, it has no header | internal `0xFE` `+0x0000` | internal flash, from the reset vector[^s189] |
| programmable logic image | 1.6[^s23] | internal `0xFF` `+0x0000` | not known[^s206] |
| external flash programmer | 3.4[^s23] | internal `0xFF` `+0xE000` | internal flash, called by the application and by safe mode[^s191] |

**The version block carries the versions of five images**, in fields 7 to 11, and Logitech's client
numbers them by region: 0 the bootloader, 1 safe mode, 2 normal mode, 3 the embedded configuration at
`0x002000`, 4 the user configuration at `0x040000`, 5 the programmable logic and 11 the flash programmer
library[^s212]. The table of regions with their addresses is in [memory.md](memory.md#how-logitechs-client-names-the-regions).

**Every image but the bootloader opens with the same header**: a `u16` checksum, the size less eight, the
version in BCD, the magic `48 47` at offset 8, and a `GOTO` to the entry point. The checksum XORs the even
bytes into one seed and the odd bytes into another, `0x21` and `0x43`, over the image from offset 4 to its
end, so an image can be checked without anything to compare it with[^s4].

## Logitech's package, and where its parts load

Logitech's 3.4 package carries the application in one region file, `Region_2.EZUpgrade`, whose data
decodes to 68952 bytes in two parts[^s3]:

| bytes of the decoded region | length | loads at |
|---|---|---|
| `0x00000` to `0x022C6` | 8902 | external `0x002000`, the safe mode configuration |
| `0x022C6` to `0x10D58` | 60050 | external `0x020000`, the application |

The file states the split itself, as two phases typed `Configuration_Static` and `Firmware_Main`, and
the safe mode configuration's own header marks the same boundary[^s87]. The Harmony 600, 650 and 700's
packages keep the two parts in separate files instead[^s3].

**The application a remote runs is the package's, byte for byte**, both the copy at `0x020000` and the
stored copy at `0x3D0000`[^s88].

## Safe mode, the bootloader and recovery

* **Safe mode copies nothing over the application**, unlike the Harmony 525's, so entering it destroys
  nothing and a plain power cycle boots normally again[^s189][^s190].
* **In safe mode only the software type in the version block changes**, to 4, and the remote enumerates
  with the same product id, so enumeration cannot tell the two apart[^s190].
* **Safe mode carries six of the application's seven commands**, the same bytes and the same states,
  without `0x70` START_IRCAP, and both flash commands reach the external flash programmer, so it could
  rewrite a configuration with no protocol beyond what the application speaks[^s191][^s192].
* **The bootloader is a USB flash programmer** that enumerates as a Microchip device and writes internal
  flash only. At start it scans the keypad and compares two codes, `0x0E` and `0x1E`; the second runs
  the safe mode image without validating it[^s189]. Otherwise it checks only that the image at `0x1000`
  carries the `48 47` magic, so it validates that an image is present and not that it is intact[^s87].
* **The application cannot erase its own configuration.** Its only route to the external eraser is the
  USB `ERASE_FLASH` handler, which takes the address from the request, so an erased block of the
  configuration is always a host's doing. Programming, which the firmware does unasked, only clears
  bits[^s243].

### Which screen the 3.4 firmware draws

A screen held in a Harmony One's configuration is shown because the configuration's own instructions ask
for it. The firmware itself picks a screen out of a configuration by number exactly once, for one status
message; the other status messages it raises on its own come from a small status library or from its own
code[^s408]. The detail,
for anyone writing a configuration, counts over the 78 screens at the head of every compiled configuration's
mode table:

**Which of the 78 the 3.4 firmware draws by number**: one. A mode becomes current only from an `0x7E` operand, the
mode stack (a mode that was current) or base slot 4, and base slot 4 is walked only for status code 9, "LCD Module
Failed", after the licence check passed and while the configuration's verdict stands, so its key 9 (mode 19 in
every compile) is the one screen the firmware takes from a configuration; codes 0, 26 and 27 are drawn from the
status container at `0x002000` when it verifies and by the firmware itself otherwise, 25 is unreachable as read,
and no caller raises the other 25. Of the head the configuration's own instructions enter modes 0, 1 and 9 (Low
Battery, USB Connected, the charging problem) and no instruction the readers locate enters modes 2 to 8; on the
sixteen compiles of skin 54 all 38 others are entered by the configuration, 30 from a key or touch, two Remote
Assistant screens from the start and six blank screens by timers. Above the head one device list per compile is
named by no enter at all. Harmony One 3.4 only; computed jumps, `FSR` writes and a computed `0x7E` not excluded[^s408].

## Not checked

* **A restore of a configuration through safe mode.** The code for it is read, and it has never been
  performed[^unchecked].
* **What the programmable logic does**, and when its image is loaded into it[^unchecked].
* **Any firmware but 3.4** on this architecture[^unchecked].

[^s3]: Read in the firmware. [Section 3](../../../docs/findings.md#s3)
[^s1]: Read in the firmware. [Section 1](../../../docs/findings.md#s1)
[^s10]: Read in the firmware. [Section 10](../../../docs/findings.md#s10)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s206]: Measured on a unit. [Section 206](../../../docs/findings.md#s206)
[^s191]: Read in the firmware. [Section 191](../../../docs/findings.md#s191)
[^s212]: Stated by Logitech, in their client. [Section 212](../../../docs/findings.md#s212)
[^s4]: Read in the firmware. [Section 4](../../../docs/findings.md#s4)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s192]: Read in the firmware. [Section 192](../../../docs/findings.md#s192)
[^s243]: Read in the firmware. [Section 243](../../../docs/findings.md#s243)
[^s408]: Read in the firmware. [Section 408](../../../docs/findings.md#s408)
[^unchecked]: Not checked.
