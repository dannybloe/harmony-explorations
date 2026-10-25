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

**The size is three bytes, offsets 4 to 6**, which is how the safe mode image that installs an application
reads it, so the byte at offset 6 is the size's top byte and never a family byte. On seven application
images, of the Harmony One, 350, 600, 650 and 700, those three bytes plus eight are the length whose checksum
verifies; the byte is 1 on the six over 64 KiB, the Harmony 350's among them, and 0 on the One's 60050 and on
the Harmony 600, 650 and 700's safe mode images[^s295].

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
  rewrite a configuration with no protocol beyond what the application speaks[^s191][^s192]. It does not
  call the library for that: it carries its own byte identical copy of the programmer's routines, 601
  bytes at `0x009CCA` matching the library from `0x01E018`[^s191].
* **Safe mode reads the keypad itself**, fifteen port reads from `0x004D8C` on, `PORTB`, `PORTA` bit 4,
  `PORTF` and `PORTG`, the ports of the One's key matrix; that is what a running mode needs, and it says
  nothing about what enters safe mode[^s118].
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

## The command handlers

What each command of [the command table](../../usb-protocol/commands.md#the-command-table) runs in the 3.4
application. A handler sets the state variable and parses its arguments, and the main loop does the work
later[^s19][^t-usb-firmware].

| command | name | state | handler |
|---|---|---|---|
| `0x10` | GET_VERSION | 1 | `0x264B4` |
| `0x30` | WRITE_FLASH | 2 | `0x264C2` |
| `0x50` | READ_FLASH | 4 | `0x2650C` |
| `0x70` | START_IRCAP | 5 | `0x26556` |
| `0xD0` | ERASE_FLASH | 8 | `0x2657A` |
| `0xA0` | WRITE_MISC | 9 | `0x26626` |
| `0xB0` | READ_MISC | 10 | `0x2671E` |

**There is no `0x05` case**, the escape's internal continuation the Harmony 600, 650 and 700 dispatch. The
state variable is at `0x284`, and while a flash write is in progress the dispatch goes to a two entry chain
accepting `0x40` and `0xF0`, at `0x26752`[^s19][^t-usb-firmware].

## The configuration's constants

What the firmware does with two things a configuration states as numbers: the `0x3F` instructions of band `0xC0`
and the groups of the parameter block, base slot 15. The format of both is the configuration format's,
[the action language](../../config-format/actions.md) and [state](../../config-format/state.md#base-slot-15-the-parameter-block).

**Where the configuration starts is never a literal in the application**: no `0x002000` or `0x040000`
reaches `TBLPTRU` anywhere in the 3.4 image, so the base arrives in a variable, and a search for the
constant finds nothing to follow[^s118].

### The `0x3F` band `0xC0`

Confirmed on two configurations and two images, 106 uses each. The operand carries three
fields, `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and the third is a five bit selector, so selectors 0 to 15 arrive
with high byte `0xC0` and 16 to 31 with `0xC1`. The handler accepts fifteen values and drops the other seventeen,
and the configurations use exactly the fifteen[^s102]:

| selector | what it does | uses per configuration |
|---|---|---|
| 17 | sets the **display's light level**: bits 1 to 3 choose one of eight states, bit 0 fades rather than snapping. States 2 to 5 take a level from base slot 15 group 1 and a pair of device levels from group 9, state 6 chooses the state from the measured band, states 0 and 1 turn it off[^s103] | 68 |
| 0 to 12 | sets channel `selector` of the I2C device at address `0x60` to the two bit value the byte table past base slot 15 group 9 states, for bits 1 to 3 being nonzero[^s106] | 36 |
| 16 | enables that device, `LATC` bit 5, set when bits 1 to 3 are nonzero[^s106] | 2 |
| 13 to 15, 18 to 31 | nothing: the handler falls to its exit | 0 |

64 of the 68 are selector 17 state 6 without a fade. **The band's uses are identical in both configurations**, one
of which has five devices and eight activities where the other has one and one, so nothing here varies with what
the remote is set up to control. **They are the compiler's fixed initialisation of the device at `0x60`**, one pass
setting each channel off and one setting each on, and the firmware itself never enables that device: it only
switches it off at shutdown. So a configuration that omits them leaves the device disabled[^s106]. What the device
is, is on [the Harmony One's hardware page](../../remotes/harmony-one/hardware.md); the base slot 15 groups are
[below](#base-slot-15s-groups).

### Base slot 15's groups

From the routines that read them. Every default is a literal in the firmware, used when a group's length does
not match, [state](../../config-format/state.md#the-firmware-demands-the-lengths)[^s44][^s103]:

| group | what it is | the Harmony One's values | default |
|---|---|---|---|
| 0 | the display light fade's per step delay | 44 | 50 |
| 1 | entries 2 to 5 are four display light levels, 0 to 27; entries 0 and 1 are read and discarded | 38, 38, 20, 20, 26, 26 | 9, 16, 24, 27 |
| 4 | three threshold pairs, two apart, turning the four sample sum of analogue channel 1 into a band 0 to 3 with hysteresis | 96, 98, 308, 310, 768, 770 | none |
| 5, 6 | two measurement to level curves over analogue channel 0, eight levels, chosen by the charger input on `PORTB` bit 1: group 6 when it is clear | 3000 to 4051, and 3000 to 4170 | none |
| 7 | a timeout in seconds, handed to the one second scheduler | 0 | 10 |
| 9 | four pairs at four bytes a band, both halves sent to the I2C device at address `0x60` as its registers 2/3 and 4/5; band 3's pair is past the declared entries | 16, 16, 64, 64, 128, 128, then 255, 255 | 64 |

A level above 27 is **silently refused** by the setter, which a writer has to respect: 27 is the number of
distinct `CVREF` voltages the part can produce, and the ladder that maps a level to one is in the
firmware[^s103].

**Groups 5 and 6 are battery millivolts.** The value walked against them is
`mean * A + ((mean * B) >> 16)` where the mean is eight samples of analogue channel 0 and `A` and `B` are two
`u16` in the remote's own internal page `0xFF`, giving 4.284 mV a converter count, and the firmware compares
the result against the literal 3400[^s105]. The thirteen two bit fields are channels of the I2C device at
`0x60`, whose part is not identified: thirteen channels of three states, two eight bit level registers, an
enable pin and no readback[^s106], [the hardware page](../../remotes/harmony-one/hardware.md).

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
[^s19]: Read in the firmware. [Section 19](../../../docs/findings.md#s19)
[^t-usb-firmware]: Read in the firmware. [The test](../../../tests/test_usb_firmware.py)
[^unchecked]: Not checked.
[^s106]: Read in the firmware. [Section 106](../../../docs/findings.md#s106)
[^s44]: Read in the firmware. [Section 44](../../../docs/findings.md#s44)
[^s105]: Read in the firmware. [Section 105](../../../docs/findings.md#s105)
[^s102]: Measured in configurations. [Section 102](../../../docs/findings.md#s102)
[^s103]: Read in the firmware. [Section 103](../../../docs/findings.md#s103)
[^s295]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s118]: Read in the firmware. [Section 118](../../../docs/findings.md#s118)
