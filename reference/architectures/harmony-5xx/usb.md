# Harmony 5xx: USB

A remote of this platform talks to a computer the way the Harmony One and the Harmony 600, 650 and 700 do:
it shows up as a vendor specific HID device and answers short commands, read this, erase that, write
this. The commands are the same family and fewer of them are implemented, and two things a host can do on
the later remotes are missing here, reading the processor's working memory and restarting the remote.

The command protocol is [the USB protocol reference](../../usb-protocol/README.md) and the rails are
`packages/usb/src/rails.ts`. This file states what holds on this architecture, measured on a Harmony 525;
the other models are not checked.[^unchecked]

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC111 | `PROFILES` in `packages/corpus/src/read.ts` |
| flash top bytes accepted | 0x80 to 0x87, so external flash is 0x800000 to 0x880000 | `ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX` in `packages/usb/src/protocol.ts` |
| the other windows | 0x00 internal-program-memory below 0x8000, 0x20 eeprom below 0x0100, 0x30 arch9-tag-30 below 0x0008, 0x40 data-memory below 0x0800 | `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

* **`bcdDevice` is `0x0916`**: the protocol number 9 and the skin 22 as plain hex, where the Harmony One
  and the Harmony 600, 650 and 700 carry BCD of `1000 + skin`. So that rule is the later generation's, and
  [the transport](../../usb-protocol/transport.md) has both forms.[^s76][^s195]
* **The version block is seven fields**, and the reply byte's low nibble says so: `27 30 25 12 ff 90 16 09`
  is firmware 3.0, board 2.5, flash `FF:12`, architecture 9 with software type 0, skin 22 and a platform
  byte of `0x09`. A host that expects twelve fields refuses a correct answer twice.[^s76]
* **In safe mode** the block is `20 25 12 ff 94 16 00`, firmware 2.0, software type 4 and a platform byte
  of zero; the product string becomes `Harmony Safe Mode!`; and the HID report descriptor differs in one
  input flag. The product id and `bcdDevice` do not change, so enumeration cannot tell the two
  apart.[^s118]
* **The unit identity is in EEPROM**, protocol address `0x200010`, not at the Harmony One's internal
  `0xFF` `+0xF400`, which this architecture refuses as an address; `IDENTITY_ADDRESS` in
  `packages/usb`.[^s268]

## Commands

Seven in the application's dispatch, decoded from its chain:[^s267]

| byte | command |
|---|---|
| `0x10` | `GET_VERSION` |
| `0x30` | `WRITE_FLASH` |
| `0x50` | `READ_FLASH` |
| `0x70` | `START_IRCAP`, the learn capture; `0x80` stops it[^s123] |
| `0xA0` | `WRITE_MISC` |
| `0xB0` | `READ_MISC` |
| `0xD0` | `ERASE_FLASH` |

* **Reads work across the windows** of [memory.md](memory.md): internal flash, EEPROM and the serial
  flash answer content.[^s119b] The data memory window answers zeros whatever it holds.[^s137]
* **The first exchange after connecting can go unanswered**, and a single retry covers it; no reset is
  needed.[^s76]
* **`ERASE_FLASH` is a general flash erase whose window the address chooses**: an address with top byte
  `0x00` erases the running firmware's own internal program flash, one in the EEPROM window does nothing
  and reports success, and one in the serial flash window erases a 64 KiB block of the part. **The
  firmware bounds that last arm by the part and nowhere finer**, so all eight blocks are reachable, both
  firmware images among them. On the Harmony One the remote refuses part of that range itself; here
  nothing in the remote does, [firmware.md](firmware.md).[^s267]

### `READ_MISC`, and why there is no live memory read

On the Harmony One and the Harmony 600, 650 and 700, `READ_MISC` selector 7 reads a byte of the running
remote's data memory, which is how a host watches the keypad or the clock. **On this platform the
executor serves selector 1 and nothing else.** It emits the reply code `0xC2`, echoes the selector,
clears its two result bytes, and only then tests the selector; every selector but 1 skips the body and
sends the two bytes it has just cleared.[^s90]

Selector 1 returns a parameter by index. The reply is `C2`, the selector, the **high** byte and then the
low byte. Below index `0x1A0` the parameter is one byte fetched through `INDF0` and the high byte is
always zero; at `0x1A0` and above it is two bytes, with a real high half.[^s90]

**Selector 1 has been sent to a unit, and its answer was misread.** A sweep of nine selectors, 0, 1, 2, 4,
5, 6, 7, 8 and 12, read zero for every one, and for selector 1 that zero was the decoder taking the high
byte, which is zero for every byte sized parameter, as the value. So the sweep says nothing about what
selector 1 answers, and the decoder now exposes both bytes.[^s90b] **What selector 1 answers on a running
remote has not been read with the corrected decoder**; a third party's report, recorded in the
findings archive, has index 0 moving with the clock and the first seven words decoding to a date and
time.[^unchecked]

So the data memory read and the battery reading the later remotes serve do not exist here, and with the
data memory window answering zeros too, no read path to this platform's working memory is known. Whether
selector 1's index reaches anything beyond its parameters is not checked.[^unchecked]

## Write standing

<!-- generated:write-rails -->
| path | open on this architecture | list |
|---|---|---|
| erase and write a configuration block | yes | `ARCHITECTURES_WITH_A_WRITE_TARGET` |
| drop the cached region descriptors, `WRITE_MISC` 0x02 | yes | `ARCHITECTURES_WITH_AN_INVALIDATE_TARGET` |
| restart, the escape's 0x02 | no | `ARCHITECTURES_WITH_A_RESET_TARGET` |
| write a byte of data memory, `WRITE_MISC` 0x07 | no | `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET` |
| append to the settings store | no | `ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET`, `SETTINGS_WRITE_READ_ON` |
| ask safe mode to install the staged firmware | no | `ARCHITECTURES_WITH_A_REINSTALL_TARGET`, `REINSTALL_MAX_IMAGE`, `STATUS_BYTE_READ_ON_APPLICATION` |

Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be: an architecture names a kind of remote, and the unit check compares the identity block read off the remote with the lab's record of a permitted unit.

Generated from `packages/usb/src/rails.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Which units may be written** is not this reference's to say: `CLAUDE.md`'s "Never write to a remote"
names them, and the unit check compares the identity block read off the remote with a record of a
permitted unit.

**Why this library's rail is the whole protection here**: the configuration begins at `0x820000`, the
stored application sits in the block below it at `0x810000`, the safe mode image below that, and the
firmware refuses none of them.[^s267] So `assertEraseAllowed` requires a block aligned address and a whole
block between `CONFIG_REGION_BASE` and `WRITABLE_CEILING`, and the ceiling stops below the log area at
`0x870000` rather than at the part's end, `packages/usb/src/rails.ts`.

**What a write does here that it does not do on the Harmony One**: nothing restarts, since the
configuration is not executed in place, and nothing needs re-checking, since this platform re-validates
only when asked.[^s253][^s269] A configuration of a 525 fits inside one 64 KiB block with its trailer
checksum, so reading a written block back covers the whole configuration.[^s269]

**What is refused on this architecture and why**: the restart, because the escape dispatcher has not been
read; the data memory write, because its executor has not been read and the part's register page sits
where the bound would pass an address that is neither memory nor a register;[^unchecked] the settings
store and the firmware reinstall, which are read on the Harmony 600, 650 and 700 only.[^s295]

## Not checked

* `WRITE_MISC` and the escape on this image, beyond what the dispatch shows.[^unchecked]
* What selector 1 of `READ_MISC` answers, decoded correctly, on a running remote.[^unchecked]
* Erasing and writing any block of the configuration region but `0x820000`.[^unchecked]
* Every model of this architecture but the Harmony 525.[^unchecked]

[^unchecked]: Not checked.
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s123]: Read in the firmware. [Section 123](../../../docs/findings.md#s123)
[^s119b]: Measured on a unit. [Section 119](../../../docs/findings.md#s119)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s90b]: Measured on a unit. [Section 90](../../../docs/findings.md#s90)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s295]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
