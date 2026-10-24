# Harmony 5xx: firmware

What a remote of this platform runs, where its firmware is stored, and how it gets installed. The
processor runs one firmware image out of its own flash. Two further images sit on the external flash chip
as stored copies, the normal application and a safe mode image, and a small bootloader that never changes
copies one of them in when a byte in the EEPROM asks it to. That arrangement is what makes this platform
different to look after: **entering safe mode overwrites the running application**, and an erase in the
wrong place reaches the stored copies, because the firmware itself refuses neither.

Read off a Harmony 525 and out of its own images; the other models of this architecture are not
checked.[^unchecked] What the 525's own versions and product strings are is the model's
[firmware.md](../../remotes/harmony-525/firmware.md).

## Images

| image | where | load address and entry |
|---|---|---|
| bootloader | internal `0x0000` to `0x0FFF`, in no external image, so only the device has it[^s76] | base `0x0000`; reset `GOTO 0x0EF6`, inside itself; the high priority interrupt vector `GOTO 0x1400`, inside the application[^s76] |
| **application 3.0** | runs from internal `0x1000`; stored at external `0x810000`, `HG` framed at `+4` and `GH` at `0x6FFE`[^s76] | base `0x1000`, `GOTO 0x07FB4` at `0x1008`. Derived at 717 branch targets on an instruction boundary against 326 for the runner up, then confirmed against the internal copy, byte identical over all 28672 bytes[^s76] |
| **safe mode image 2.0** | stored at external `0x800000`; it reports software type 4[^s76][^s118] | base `0x1000` too, 182 boundary hits of 183, `GOTO 0x017EA` at `0x1008`[^s118]; a different firmware and not a copy, 27994 of its 28672 bytes differing from the application's[^s76] |

The application's entry fits 32 KiB of program flash and its reset vector lands below `0x1000`, which is
what placed a bootloader under the application before the internal flash was read.[^s76]

There is **no Logitech package** of this firmware: the images come off a unit, and Logitech's current
software update service serves the file based and Linux generations only.[^s196]

**The application's image holds a second USB descriptor block that validates as well as the real one**:
a Microchip stock descriptor at `0x00E92` claiming `04D8:000B` with a zero release, left in by the USB
stack the firmware is built on, beside the remote's own at `0x07DFE` claiming `046D:C111` and `0x0916`. A
chain walk cannot tell them apart, so the block naming Logitech's vendor id is the remote's.[^s113]
[The USB transport](../../usb-protocol/transport.md) has the general rule.

## Routines read on the application image

| routine | |
|---|---|
| the USB command dispatch, seven commands, [usb.md](usb.md) | [^s267] |
| the address validator and its windows, [memory.md](memory.md) | [^s119] |
| the external flash eraser and writer, the SPI driver | [^s267] |
| `READ_MISC`, whose executor has a body for selector 1 alone | [^s90] |
| the infrared capture: `0x70` at `0x02F56` sets state 5, clears the headers of two buffers at `0x0500` and `0x0542` and sets a toggle at `0x0584`; `0x80` at `0x030F8` sets state 6; the producer at `0x060BE` runs on its own while the state is 5 and fills the buffer the toggle picks. The Harmony One's arrangement with other addresses and the same 66 byte spacing; the `0x90` header and the sequence step inside the producer are not located | [^s123] |
| every configuration byte read, through one SPI primitive: `0x07F7A` writes a byte and `0x07F8E` reads one, under an ordinary serial flash driver, read at `0x0756A`, chip select at `0x07524` and `0x07530`. The Harmony 600, 650 and 700 have the same single point; the Harmony One has none | [^s80] |
| the infrared player at `0x076CE`: a pulse is a `u16` whose bit 15 turns the carrier on and whose low fifteen bits are a timer count, less six for the loop's own cost; `0x07680` starts the carrier and `0x076C0` stops it | [^s80] |
| the infrared record's class switch at `0x05108`: class 1 and class 5 have arms of their own and anything else a third; class 5's arm pushes a count and then that many pulse words, reached through a table of three byte entries the record header does not give | [^s80] |
| the keypad scanner | [^s89] |
| the configuration validator and the status screen choice | [^s253] |
| the action queue ring | [^s254] |
| the state variable seeder and which variables the firmware owns | [^s274][^s284] |
| the version accessors | [^s87] |
| Timer 1's setup, compiled in at `0x00E7A` in the bootloader and `0x07EDC` in the application, with only the enable separate. The Harmony One attributes the same `0x1E` to a routine reading base slot 3; here it is a fixed peripheral setup | [^s137b] |

**Not read**: the escape command's dispatcher, which is why the restart is refused on this architecture;
`WRITE_MISC` selector 7, which is why the data memory write is refused, [usb.md](usb.md). The cache drop,
`WRITE_MISC` selector 2, is on the invalidate list because it came with the write list's permission and
the list keeps what was permitted, `packages/usb/src/rails.ts`; no reading of its executor on this image
is recorded.[^unchecked]

## How the bootloader chooses an image

At every boot it reads EEPROM byte 0 and acts on it:[^s119]

| byte 0 | what the bootloader does |
|---|---|
| 2 | copies the application from external flash into internal flash, marking 4 first and 6 on success |
| 1 or 5 | copies the safe mode image, marking 3 first and 6 on success |
| 3 or 4 | an interrupted install: does it again |
| 6 | nothing; the running application sees it, writes 0 and puts a message on the screen |
| 0 or anything else | nothing: runs what is resident |

**If installing the application fails, it installs safe mode instead**, so a failed copy lands in safe
mode rather than nowhere.[^s119]

## Safe mode is a one way door

* **Entered by holding Off while the batteries go in**, a repair shop's procedure for other
  models[^x-safe-mode] that holds on a Harmony 525.[^s118]
* **Entering it destroys the application in internal flash.** The part's 32 KiB hold the bootloader and
  one image, so the bootloader copies the safe mode image over the application. Measured by reading
  internal flash before and after; the stored copy at `0x810000` survives.[^s118]
* **A power cycle does not leave it**: the safe mode image is what is resident and byte 0 asks for
  nothing.[^s119]
* **Leaving it needs the application copied back**, which is byte 0 set to 2 and a restart. Done once on a
  unit, which came back with its application and its configuration intact.[^s119b] **This library's
  write path does not perform it**: the EEPROM is outside the range `packages/usb/src/rails.ts` lets a
  write reach.

**So safe mode must never be entered on this model as an experiment.** The Harmony One and the Harmony
600, 650 and 700 keep their safe mode image resident beside the application and lose nothing by entering
it.[^s189]

## The erase hazard

**An `ERASE_FLASH` is bounded to the flash part and nowhere finer.** The handler classifies the address
into a window, and the external flash arm erases whatever block of the part it names: all eight are
reachable, `0x800000`, the safe mode image, and `0x810000`, the application, among them.[^s267]

**There is an interlock in the image, and it guards the wrong medium for this hazard.** `0x06500` resets
the processor unless `0x105` holds `0xAC`, so its failure mode is a reset rather than a refusal. The erase
handler arms it before its selector switch, and it is called by the two internal program flash routines
and nothing else: the external flash arm reaches the erase at `0x07576` without consulting it.[^s267] On a
Harmony One a wrong address meets a ceiling the remote enforces itself;[^s192] here it meets nothing in the
remote, which is why the architecture 9 entry in `packages/usb/src/rails.ts` stops below the log area
rather than at the top of the part, [usb.md](usb.md).

**The pair of stored images is what makes that matter.** Entering safe mode destroys the application, and
the copy at `0x810000` is what puts it back. An erase that took both `0x800000` and `0x810000` would leave
a remote with no route to either image.[^s118][^s267]

**And no configuration can be rebuilt for this model.** It belongs to Logitech's classic platform, whose
software Logitech has discontinued,[^s56] and Logitech's live service has skin 22 switched off, so nothing
compiles a configuration for a 525 and there is no vendor built file to put back after a bad
write.[^s135][^s145]

## Re-validation from an action list

**An action list instruction can make this remote check its configuration again**, which no other architecture
allows, [the action language](../../config-format/actions.md#arch-9-re-validates-the-configuration-on-0x1f-with-operand-high-byte-0xc0-to-0xcf).
The opcodes that reach the dispatch chain are `0x1F` to `0x3E`, and `0xC0` to `0xCF` is a band of the
**operand's high byte**. The handler takes that high byte's **low nibble** as an order selector and calls the
container re-validation, which validates a container and writes the verdict bit the status screens are chosen
by; nibble values 2 and 3 choose which container goes first[^s255]. The same byte has more bands: `0xD0`,
`0xE0` and `0xF0` are three further groups, unread, and `0xFC` is special cased in the interpreter's loop head
before the dispatch begins[^s254].

**An instruction is staged in the format's own field order**, operand low, operand high, opcode: the chain
switches on `0x3D8`, so `0x3D7` is the operand's low byte, `0x3D8` its high byte and `0x3D9` the opcode, and the
loop head compares the **third** byte against opcode `0x1F` and the **second** against a sub-command value. The
bank is established by the last explicit `MOVLB` before the branch into the chain and the absence of any other on
the path[^s255].

## The display driver

**The 525's panel is driven by a page addressed display controller**[^s101]. Screen opcode 22 calls the routine
at `0x038EC`, which keeps the page index at `0xC0` and derives `row * 8` and `row * 8 + 7` beside it, and the
transfer at `0x03898` sends `0xB0 | row`, the page address command. Opcode 23 then sends 96 pixels, preceded
by a column address in two nibbles where **the panel's column 0 is the controller's column 3**[^s101]. What the
two opcodes mean in a configuration is [screens](../../config-format/screens.md#opcodes-22-and-23-per-architecture).

**The controller is ST7565 class and not an SSD1306**: six ST7565 only commands appear in the driver's
initialisation, in the order that family documents, and none of the ten SSD1306 only ones do[^s101]. The exact
part is not established[^unchecked].

## Not checked

* Any firmware for this architecture other than the 525's 3.0 and 2.0.[^unchecked]
* Whether the key combination at power on touches EEPROM byte 0.[^unchecked]
* The escape dispatcher, the cache drop and `WRITE_MISC` selector 7 on this image.[^unchecked]
* Which routine, if any, reads base slot 3's build timestamp on this architecture.[^unchecked]
* Whether an odd count internal read hangs this model as it hangs a Harmony One; `packages/usb` refuses
  one here too, [memory.md](memory.md).[^unchecked]

[^unchecked]: Not checked.
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s113]: Read in the firmware. [Section 113](../../../docs/findings.md#s113)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s123]: Read in the firmware. [Section 123](../../../docs/findings.md#s123)
[^s80]: Read in the firmware. [Section 80](../../../docs/findings.md#s80)
[^s89]: Read in the firmware. [Section 89](../../../docs/findings.md#s89)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s254]: Read in the firmware. [Section 254](../../../docs/findings.md#s254)
[^s274]: Read in the firmware. [Section 274](../../../docs/findings.md#s274)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s137b]: Read in the firmware. [Section 137](../../../docs/findings.md#s137)
[^x-safe-mode]: Stated by a third party. [A repair shop's safe mode procedure](https://www.harmonyremoterepair.com/files/theme/Documents/Safe_Mode_Instructions.pdf)
[^s119b]: Measured on a unit. [Section 119](../../../docs/findings.md#s119)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s192]: Read in the firmware. [Section 192](../../../docs/findings.md#s192)
[^s101]: Read in the firmware. [Section 101](../../../docs/findings.md#s101)
[^s56]: Stated by Logitech. [Section 56](../../../docs/findings.md#s56)
[^s135]: Stated by Logitech, by their service. [Section 135](../../../docs/findings.md#s135)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s255]: Read in the firmware. [Section 255](../../../docs/findings.md#s255)
