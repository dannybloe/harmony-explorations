# Harmony 300 and 350: memory

Where things live on both models, stated once. These remotes keep a small filesystem: the program, a few
records about the remote itself, and **one file holding the configuration**, which is the devices and the
infrared codes a person set up. The layout below comes from the firmware's own file table, and the
configuration from the files a remote serves; nothing here was read as raw memory off a remote.

## The file table

The 1.4 firmware carries its filesystem as data: a pool of names at `0x00910A` and a table of 23 records of
11 bytes at `0x0092A6`, each giving a name a medium, an offset and a size[^s199][^t-firmware].

| path | medium and place | what it is |
|---|---|---|
| `/fw/bootloader` | internal `0x000000`, 4 KiB | the bootloader |
| `/fw/safemode` | internal `0x001000`, 32 KiB | the safe mode image |
| `/fw/normalmode` | internal `0x009000`, 89088 bytes, **and** the external medium at `0x000000`, the same size | the application, resident and stored, the arrangement the [Harmony 525](../harmony-5xx/memory.md) has too |
| `/fw/embeddedcfg` | | an embedded configuration |
| `/cfg/usercfg` | external `0x020000`, 256 KiB | **the user configuration** |
| `/sys/guid`, `/sys/pid`, `/sys/sku`, `/sys/battery`, `/sys/flags0` to `/sys/flags3` | seven 64 byte records from internal `0x01F400` | the unit's records; `/sys/guid` identifies a unit |
| `/fw/config_bits` | internal `0x01FFF8`, 8 bytes | the processor's configuration words |
| `/sys/sysinfo` | dynamic, nothing stored | identity text built on request |
| `/ir/ir_cap` | a stream | infrared capture |

Media: `I` internal program flash, 12 files; `E` the external medium, 3; `D` dynamic, 7; `S` a stream,
1[^s199]. The external medium's part and size are not checked[^unchecked]; concordance reported 512 KiB for
a 350[^s194b].

## The configuration container

The container's general form is [the configuration format's](../../config-format/container.md); this is
what holds on this architecture.

| | value | evidence |
|---|---|---|
| cookies | `GSPM`, then `LWJL` after the pointer table, then `PTYY` | [^s194] |
| pointer slots | 15; the header byte `0x0F` is the count, which is how "format 1.4" turned out to be a slot count all along | [^s194] |
| the marker's offset | `0x47`, which is `0x0B + 4 * 15`, hardcoded in the firmware's validator | [^s259] |
| base address | `0x020000`, the file's place on the external medium | [^s194] |
| slot map | raw slot to base slot in `ARCH16_SLOT_MAP`, `packages/codec/src/gspm.ts`: the name tree, the architecture record, the log area, the clock record, the infrared database, the action list table, the parameter block and the number sender are named; raw 13 is a metadata archive that names devices and commands, [the metadata archive](../../config-format/container.md#the-metadata-archive) and [the container's slots for this family](../../config-format/container.md#the-harmony-300-and-350s-slots); raw 5, 6, 8, 9, 12 and 14 are unread | [^s259b], [^s260], [^s262b] |
| the infrared table | allocated at the model's **maximum** device count, four groups on a 300 and eight on a 350, unused groups empty, unlike every other architecture | [^s263], [^s264] |
| which group a device takes | on the 300, the device key it is assigned to, [the 300's memory.md](../../remotes/harmony-300/memory.md); not the metadata archive's name list, which is alphabetical. On the 350 not checked | [^s265], [^unchecked] |
| what is stored | exactly the codes some action list sends | [^s261] |
| raw slot 8 | twice the device count on a configuration Logitech's current service compiled, and empty on one compiled in 2011, so it follows the compiler and not the model | [^s264], [^s265] |

**A file states its size four bytes short**: `/cfg/usercfg` reports `end_addr - flash_base`, and the read
pads past it rather than serving the `PTYY` marker, so a configuration read as a file needs that marker
appended to be byte identical to concordance's copy, measured on both models[^s262][^s264b].

**A configuration from a different generation of the compiler is not a sample of the same population.**
Raw slot 8's emptiness on the 2011 configuration was first read as a property of the model, and a second
configuration of the same model, compiled by the current service, holds eight for four devices[^s265].
Each configuration states its own build date, so the check is available in every one.

**Every send is paired with a `0x7C` naming the same device**, 602 of 602 lists over the five
configurations of this architecture, some of them as a third shape, `{0x07, 0x7D, 0x7C}`, beside the plain
pair[^s278]. The rule is every architecture's, [the action language](../../config-format/actions.md).

## Not checked

* The external medium's part and size, and the RAM size[^unchecked].
* Raw slots 5, 6, 8, 9 and 12. Raw 6 holds one more entry than there are devices on both models, and
  whether the extra one is the activity is a candidate[^s263].
* Whether the remote keeps a running clock: the configuration has a clock record and the firmware a month
  end routine[^s322], and no state table has been read on this architecture[^unchecked].

[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^t-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_350_firmware.py)
[^unchecked]: Not checked.
[^s194b]: Measured on a unit. [Section 194](../../../docs/findings.md#s194)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s259]: Read in the firmware. [Section 259](../../../docs/findings.md#s259)
[^s259b]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s260]: Measured in configurations. [Section 260](../../../docs/findings.md#s260)
[^s262b]: Measured in configurations. [Section 262](../../../docs/findings.md#s262)
[^s263]: Measured in configurations. [Section 263](../../../docs/findings.md#s263)
[^s264]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^s261]: Measured in configurations. [Section 261](../../../docs/findings.md#s261)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s264b]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s278]: Measured in configurations. [Section 278](../../../docs/findings.md#s278)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
