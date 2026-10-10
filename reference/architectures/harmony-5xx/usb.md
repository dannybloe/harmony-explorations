# Harmony 5xx: USB

The command protocol is `docs/usb-protocol.md` and the rails are `packages/usb/src/rails.ts`, with the
argument in `CLAUDE.md`'s "Never write to a remote". This file states what holds on this architecture,
measured on a Harmony 525, and links there for the rest.

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
  and the Harmony 600, 650 and 700 carry BCD of `1000 + skin`. So that rule is the later generation's,
  measured, sections 76 and 195.
* **The version block is seven fields**, and the reply byte's low nibble says so: `27 30 25 12 ff 90 16 09`
  is firmware 3.0, board 2.5, flash `FF:12`, architecture 9 with software type 0, skin 22 and a platform
  byte of `0x09`, measured, section 76. A host that expects twelve fields refuses a correct answer twice,
  which is what this library did until section 76.
* **In safe mode** the block is `20 25 12 ff 94 16 00`, firmware 2.0, software type 4 and a platform byte
  of zero; the product string becomes `Harmony Safe Mode!`; and the HID report descriptor differs in one
  input flag. The product id and `bcdDevice` do not change, so enumeration cannot tell, measured, section
  118.
* **The unit identity is in EEPROM**, protocol address `0x200010`, not at the Harmony One's internal
  `0xFF` `+0xF400`, which this architecture refuses as an address, measured, section 268;
  `IDENTITY_ADDRESS` in `packages/usb`.

## Commands

Seven in the application's dispatch, decoded from its chain, section 267:

| byte | command |
|---|---|
| `0x10` | `GET_VERSION` |
| `0x30` | `WRITE_FLASH` |
| `0x50` | `READ_FLASH` |
| `0x70` | `START_IRCAP`, the learn capture; `0x80` stops it, section 123 |
| `0xA0` | `WRITE_MISC` |
| `0xB0` | `READ_MISC` |
| `0xD0` | `ERASE_FLASH` |

* **Reads work across the windows** of [memory.md](memory.md): internal flash, EEPROM and the serial
  flash answer content; data memory answers zeros whatever it holds, sections 119 and 137.
* **`READ_MISC` serves selector 1 alone**, a parameter by index, and every other selector answers two
  bytes the firmware has just cleared, read in the firmware, section 90. So there is **no live RAM read,
  no battery reading and no keypad census** on this architecture. A third party reports selector 1
  index 0 moving with the clock; nothing here has sent it, section 90.
* **The first exchange after connecting can go unanswered**, and a single retry covers it; no reset is
  sent, section 76.
* **`ERASE_FLASH` is a general flash erase whose window the address chooses**: an address with top byte
  `0x00` erases the running firmware's own internal program flash, one in the EEPROM window does nothing
  and reports success, and one in the serial flash window erases a 64 KiB block of the part, read in the
  firmware, section 267. **The firmware bounds that last arm by the part and nowhere finer**, so all eight
  blocks are reachable, both firmware images among them. On the Harmony One the remote refuses part of
  that range itself; here nothing in the remote does, section 267.

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
names them, and the identity block read off the remote is compared with the lab's record of one. A write
to a 525 has been performed, one block of its own bytes put back unchanged, measured on a unit, section
269.

**Why this library's rail is the whole protection here**: the configuration begins at `0x820000`, the
stored application sits in the block below it at `0x810000`, the safe mode image below that, and the
firmware refuses none of them, section 267. So `assertEraseAllowed` requires a block aligned address and
a whole block between `CONFIG_REGION_BASE` and `WRITABLE_CEILING`, and the ceiling stops below the log
area at `0x870000` rather than at the part's end, `packages/usb/src/rails.ts`.

**What a write does here that it does not do on the Harmony One**: nothing restarts, since the
configuration is not executed in place, and nothing needs re-checking, since this model re-validates only
when asked, sections 253 and 269. The configuration of a 525 fits inside one 64 KiB block with its
trailer checksum, so a block's read back covers the whole configuration, section 269.

**What is refused on this architecture and why**: the restart, because the escape dispatcher has not been
read; the data memory write, because its executor has not been read and the part's register page sits
where the bound would pass an address that is neither memory nor a register; the settings store and the
firmware reinstall, which are another architecture's, sections 269 and 295.

## Not checked

* `WRITE_MISC` and the escape on this image, beyond what the dispatch shows.
* Rehearsing any block of the region but `0x820000`.
* Every model of this architecture but the Harmony 525.
