# Harmony One: memory

A Harmony One has two memories a computer can read over its cable. The larger is a 4 MiB flash chip
beside the processor, which holds the remote's program, its configuration and a few smaller things; the
processor reads that chip like ordinary memory and runs the program straight out of it. The smaller is
the processor's own 128 KiB of program flash, which holds the code that starts the remote and the code
that rewrites the chip. This page says what sits where in each, and then what the processor keeps in its
working memory while it runs.

How a host names an address in either memory, and the notation `0xFE` `+0x1000` used below, is in
[the command reference](../../usb-protocol/commands.md#addressing-in-short). "Erased" means `0xFF` bytes,
and a range with no row is erased. How this layout differs from the Harmony 600, 650 and 700's is set
out in [the comparison of architectures](../README.md).

## External flash, 4 MiB parallel NOR

<!-- generated:memory-constants -->
| what | value | constant |
|---|---|---|
| external flash size | 4096 KiB | `FLASH_TOP_BYTE_BOUND`, `protocol.ts` |
| user configuration starts at | external 0x040000 | `CONFIG_REGION_BASE`, `rails.ts` |
| highest address a write may reach | external 0x3D0000 | `WRITABLE_CEILING`, `rails.ts` |
| erase block | 64 KiB | `ERASE_BLOCK_SIZE`, `rails.ts` |
| firmware staging region | none | `STAGING_REGION`, `rails.ts` |
| settings store | none read: its constants are architecture 14's | `ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET`, `rails.ts` |

Generated from `packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The part is an Atmel AT49BV322A, a 4 MiB parallel NOR flash that identifies itself as `1F:C8`, and the
processor reaches it as memory on its external bus[^s88][^s221].

| address | length | contents |
|---|---|---|
| `0x000000` to `0x000120` | 288 | a table nobody has identified[^s9] |
| `0x002000` to `0x0042C6` | 8902 | the **safe mode configuration**, a `GSPM` container at format 1.6, which is also the library the status screens are drawn from[^s3][^s244] |
| `0x020000` to `0x02EA92` | 60050 | the **application firmware**, version 3.4, executed where it sits[^s3] |
| `0x040000` to `0x400000` | 3840 KiB | the **user configuration region** as declared; a configuration's length varies with what is on the remote, and only the region is fixed[^s88] |
| `0x3D0000` to `0x3DEA92` | 60050 | a **second, stored copy of the application**, byte for byte the copy at `0x020000`[^s88] |
| `0x3F0000` to `0x400000` | 64 KiB | `00 FF` repeating, the last two bytes both `0x00`[^s88] |

Everything else is erased, including all of `0x010000` to `0x020000` and `0x3DEA92` to
`0x3F0000`[^s88][^s111].

**The last two rows sit inside the declared configuration region.** That is why a write stops at
`0x3D0000` and not at the top of the region: a writer that took the declared range at face value would
erase the remote's own stored firmware[^s88]. The region's two ends close independently: concordance's
table puts the region's base at `0x040000`[^x-concordance], and `0x040000` plus 3840 KiB is `0x400000`, the
end of the 4 MiB part, where the firmware's own address bound sits too[^s88].

**The space past a configuration's end is not blank.** Flash is erased only where a write needs the
room, so the bytes of an earlier, longer configuration stay behind the current one; one remote held
408034 such bytes[^s215].

**The `00 FF` block kills the configuration's log area.** Base slot 2 declares this architecture's log
region as `0x3FFFF0` to `0x400000`, sixteen one byte records, which is the top of this block, so the
region a configuration reserves is already written before any configuration asks. Its last byte is
`0x00`: the boot scan at `0x2DB4C` recovers the position after the last byte that is not erased, which is
`0x400000`, and the appender's own upper bound at `0x2DC1A` rejects that address by zeroing the remaining
count. The facility is dead, and using it would need an erase of a 64 KiB block inside the configuration
region. Read in the 3.4 application, and measured in configurations[^s47][^s111]. Who writes the block is
not known.

### A protocol address's top byte is a page number

The firmware never uses the top byte of a requested address as an address. It writes the byte, less
three, to a register at external `0x020025`, and then replaces it with a fixed `0x13`, so every access to
this flash happens through one 64 KiB window[^s192]. The addresses in the table above are still the right
way to read the map, because the bias and the window cancel, but two things follow that a flat map hides.

* **The erase block is 64 KiB because the window is**, sixteen bits of offset under a forced top byte,
  rather than because of a parameter of the chip[^s192][^s222].
* **A request whose top byte is below `0x03` underflows the bias**, and no test stands in front of it.
  Read in the firmware and never sent[^s192].

**`0x02002x` is a small register file and not flash**, whatever the first rows of the table suggest,
because the bus decoder aliases it: `0x020020` and `0x020021` are the memory mapped keypad, `0x020024` is
the identity byte the bootloader reads and rejects when it is `0x00` or `0xFF`, and `0x020025` is the page
register above[^s189][^s192]. So a table read by the firmware at those numbers and a host's read at the
same numbers do not ask the same question of the same silicon.

## Internal program memory, two pages of 64 KiB

The processor's own flash holds the bootloader, the safe mode image, an image for the programmable logic
and the routine that programs the external chip. **Not the application**, which runs from external
flash. No firmware package Logitech published covers any of this memory, so the argument that a read of
it is good is that each image verifies its own header checksum[^s22][^s4].

| page and offset | length | contents |
|---|---|---|
| `0xFE` `+0x0000` | 4096 | the **bootloader**, with no header of its own and the reset vector at zero. It scans the keypad at start and compares two codes, `0x0E` and `0x1E`. It is also a **USB flash programmer** of twelve commands, whose erase refuses any address below `0x001000` and so cannot erase itself[^s87][^s189] |
| `0xFE` `+0x1000` | 45356 | the **safe mode image**, version 3.4, checksum `0xDB1C`. The bootloader runs it by a `GOTO 0x0100A` through its header, and a key code of `0x1E` runs it without validating it[^s189][^s190] |
| `0xFF` `+0x0000` | 8438 | the **programmable logic image**, version 1.6, checksum `0xCB09`; its version is field 9 of the version block[^s206][^s212] |
| `0xFF` `+0xE000` | 634 | the **external flash programmer**, version 3.4, checksum `0xD9E9`, opening with a run of `BRA`, so a jump table into a callable library. Five gates at `0x01E00C` to `0x01E014`, the AMD command set unlock at `0x022AAA` and `0x022555`, erase and program on separate gates, and a sleep routine that disables the external bus. It lives here because its callers cannot run from the bus while it is being programmed. Its version is field 8[^s191][^s212] |
| `0xFF` `+0xF400` | 64 | the **identity block**: a field named the serial, then two GUIDs, then sixteen zero bytes. The serial field holds `0xEE` on every unit read, so only the two GUIDs tell one remote from another[^s22][^s226] |
| `0xFF` `+0xF580` | 4 | the **battery gauge's scale**, two `u16`: 4, then a per unit trim. Millivolts per converter count is `4 + trim/65536`, about 4.284[^s105] |
| `0xFF` `+0xF5C0` | 4 | two more `u16`, 94 and `0xFFFF`, fetched by the same helper as the scale; their consumer is not traced[^s105] |
| `0xFF` `+0xF640` | 11 | a record nobody has identified[^s22] |
| `0xFF` `+0xFFF8` | 6 | the processor's **configuration words**, program `0x1FFF8` to `0x1FFFD`[^s25] |

The safe mode image ends at `+0xC12C` and the rest of that page is erased. Everything not listed in the
`0xFF` page is erased too[^s22].

**The remote states this inventory itself, and it agrees.** In safe mode a Harmony One lists five images
on its screen with a checksum and a version each. Four of the checksums are the ones in the table; the
fifth row shows none, which is what marks it as the bootloader, the one image with no header to carry
one[^s190].

**The two pages are firmware, apart from three per unit records**: the identity block, the battery trim
at `+0xF582` and the record at `+0xF643`. Two units' pages differ in 39 bytes and every one of them is in
those three places[^s23]. The battery trim differs because a factory calibration constant is exactly what
differs from unit to unit[^s105]. The identity block's values are a unit's serial and this reference
never states them.

**Two memories answer to `0x01F580`.** The processor carries 128 KiB of program flash at `0x000000` to
`0x01FFFF`, and only addresses above that leave on the external bus, which is why the application sits at
`0x020000`. So a table read in the firmware at `0x01F580` reads the `0xFF` page, while a host's read at
`0x01F580` reaches the external chip and answers `0xFF`, since the internal pages are reached through the
top address bytes `0xFE` and `0xFF` instead[^s105][^s111].

## How Logitech's client names the regions

Logitech's client lists seven regions for the Harmony One, and each one it names matches what is
there[^s206]:

| region | number | address | size | what is there |
|---|---|---|---|---|
| boot loader | 0 | `0xFE0000` | `0x1000` | the bootloader |
| safe mode | 1 | `0xFE1000` | `0xF000` | the safe mode image |
| normal mode | 2 | `0x3D0000` | `0x20000` | the stored copy of the application |
| embedded config | 3 | `0x002000` | | the safe mode configuration |
| user config | 4 | `0x040000` | | the user configuration |
| programmable logic image | 5 | `0xFF0000` | `0x4000` | the 1.6 image; 5939 of the window's bytes are not erased |
| flash programmer library | 11 | `0xFFE000` | `0x1000` | the external flash programmer; 601 bytes are not erased |

The numbers, the names and the sizes are Logitech's[^s212b]. The two entries at the bottom are where the
version block's fields 9 and 8 come from, which the client states as each region's version[^s212b].
Logitech's protocol specification names the 64 byte identity block separately, at `0xFFF400`[^s197].

## Data memory

Read in the firmware, and read live over the cable through `READ_MISC` selector 7, which answers on this
architecture while the remote runs its configuration[^s111]:

| address | what |
|---|---|
| `0x108 + n` | state variable `n`. The first seven are the clock[^s111][^s138] |
| `0x108` up to `0x108 + 17` | the firmware's own state variables, 0 to 17[^s284] |
| `0x110` | the display light band[^s111] |
| `0x111` | the battery gauge's cached level[^s111] |
| `0x2EC` to `0x2EE` | the font pointer: the address of the set the next text is drawn in, written by the copy at `0x2B93C` that the font select handler at `0x292AC` calls, in the 3.4 image[^s399] |
| `0x0EE8` | the cached region descriptors that `WRITE_MISC` selector `0x02` drops[^s246] |

At every boot the state variable storage above `narrow + 2 * wide` is painted `0xFE`[^s276]. The write
path's own variables are listed with the commands, in [the command reference](../../usb-protocol/commands.md).

**What a configuration seeds that storage with**, measured on Logitech's compiles for this model: the
firmware's variables 13 and 14 start at 1 and 2 with maxima 1 and 4, where the Harmony 600, 650 and 700's
start at 0 and 1; every variable of the configuration's own is one byte, with maxima up to 121; and the
one two byte variable, at index `narrow`, runs from 0 to 65277 and is the one the clock pickers read and
write while the time is being set[^t-one-state-tables][^s432].

## Not checked

* **What the table at external `0x000000` is**, and who writes the `00 FF` block at `0x3F0000`[^s9].
* **The consumers of the records at `0xFF` `+0xF5C0` and `+0xF640`**[^s105].
* **How fast the clock loses time.** Two mechanisms are read and both only lose time, so 5.6 minutes a day
  is an upper bound and not a figure; it has never been measured[^s111].
* **What the programmable logic is.** Logitech's client names an image for one and the window holds one,
  but what the logic does is unread[^s206].
* **The processor's part number.** Most likely a `PIC18F87J50`, the 80 pin part with an external memory
  bus, inferred and not measured, because the device id is out of reach of every read; see
  [the comparison of architectures](../README.md#what-no-read-can-show)[^s3].

[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s221]: Measured on a unit. [Section 221](../../../docs/findings.md#s221)
[^s9]: Measured on a unit. [Section 9](../../../docs/findings.md#s9)
[^s3]: Read in the firmware. [Section 3](../../../docs/findings.md#s3)
[^s244]: Read in the firmware. [Section 244](../../../docs/findings.md#s244)
[^s111]: Measured on a unit. [Section 111](../../../docs/findings.md#s111)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s215]: Measured on a unit. [Section 215](../../../docs/findings.md#s215)
[^s47]: Measured in configurations. [Section 47](../../../docs/findings.md#s47)
[^s192]: Read in the firmware. [Section 192](../../../docs/findings.md#s192)
[^s222]: Measured on a unit. [Section 222](../../../docs/findings.md#s222)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s22]: Measured on a unit. [Section 22](../../../docs/findings.md#s22)
[^s4]: Read in the firmware. [Section 4](../../../docs/findings.md#s4)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s206]: Measured on a unit. [Section 206](../../../docs/findings.md#s206)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s191]: Read in the firmware. [Section 191](../../../docs/findings.md#s191)
[^s226]: Measured on a unit. [Section 226](../../../docs/findings.md#s226)
[^s105]: Read in the firmware. [Section 105](../../../docs/findings.md#s105)
[^s25]: Measured on a unit. [Section 25](../../../docs/findings.md#s25)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s212b]: Stated by Logitech, in their client. [Section 212](../../../docs/findings.md#s212)
[^s197]: Stated by Logitech. [Section 197](../../../docs/findings.md#s197)
[^s138]: Read in the firmware. [Section 138](../../../docs/findings.md#s138)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s399]: Read in the firmware. [Section 399](../../../docs/findings.md#s399)
[^s246]: Read in the firmware. [Section 246](../../../docs/findings.md#s246)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
[^t-one-state-tables]: Measured in configurations. [The test](../../../packages/codec/test/statetables.test.ts)
[^s432]: Measured in configurations. [Section 432](../../../docs/findings.md#s432)
