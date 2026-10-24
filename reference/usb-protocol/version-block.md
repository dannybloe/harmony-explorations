# The version block

The first thing a computer asks a Harmony over its cable is what it is. The remote answers with a short
block of bytes: which firmware it runs, its hardware version, which flash chip it carries, its
architecture, whether it is running normally or in safe mode, which model it is (its skin), the platform
it belongs to, and the versions of the other programs it keeps beside the one running. A Harmony One,
600, 650 or 700 answers with twelve bytes and a Harmony 525 with seven. `readVersion` in
`packages/usb/src/protocol.ts` is the library's reading of the block, and this page is its argument.

The request is GET_VERSION, [the commands](commands.md). Each model's own reply is on its usb page, for
example [the Harmony One's](../remotes/harmony-one/usb.md).

## The request and the reply

**Request: `0x10`**, with no arguments. The parser is inline in the USB callback at `0x0BDFE` rather than a
separate handler, and it sets state 1, whose executor is `0x0C906` (Harmony 700 2.8)[^s19][^t-usb-firmware]:

```
0c908: 4f 0e       MOVLW 0x4f         ; a 16-bit pointer, 0x0D4F
0c90a: dd 6f       MOVWF 0xedd
0c90c: 0d 0e       MOVLW 0x0d
0c90e: de 6f       MOVWF 0xede
0c910: 16 ec a1 f0 CALL 0x1422c       ; fills the block at 0x0D4F
0c91a: 28 0e       MOVLW 0x28         ; the response code
0c922: 6d ec b9 f0 CALL 0x172da       ; append it
0c928: 5b 6b       CLRF 0xd5b         ; then copy 12 bytes from 0x0D4F
0c92a: 0c 0e       MOVLW 0x0c
0c92e: 5b 5d       SUBWF 0xd5b,W
0c930: 10 e2       BC 0x0c952
```

**Reply: `0x28` then 12 bytes**, copied out of a block that `0x1422C` builds. **It is twelve fields, and the
count closes**: `0x1422C` stores through the pointer in `0xEDD` and `0xEDE` at exactly twelve sites, from
`0x142C0` to `0x143AE`, one per field, and the executor's loop copies twelve bytes, and neither number was
derived from the other[^s57][^t-usb-firmware].

**The reply byte's low nibble counts the fields, and twelve is not universal**[^s76]:

| remotes | reply byte | fields |
|---|---|---|
| Harmony 525 | `0x27` | 7 |
| Harmony One, 600, 650 and 700 | `0x28` | 12, by the firmware's own two counts above |

concordance reads the nibble as a length and branches on it, accepting 5, 7 or 8 and giving up the
architecture and the skin below 6 and the protocol below 7[^x-concordance]: the nibble counts where it is
small and is a floor at 8, and the firmware settles the real figure at twelve by copying twelve bytes. On
the request side nibble 8 would mean fifteen bytes, so as a length `0x28` does not fit the twelve that
follow; what its low nibble means, if anything, is not checked[^unchecked]. A host that expects twelve
fields refuses a 525's correct answer, which is why `readVersion` takes any block of seven bytes or more
and refuses a shorter one, which carries neither the architecture nor the skin[^s76].

## GET_VERSION's twelve bytes

Eleven of the twelve fields have a reading, from the accessors that fill them and from replies of remotes
that differ in every one of the values. Six were first read off a Harmony 600 beside concordance's report
for the same remote and then written down as a prediction for a Harmony One before it was read; the One
answered with the first six bytes exactly as predicted[^s57][^s59].

| field | Harmony 600 | Harmony One | reading |
|---|---|---|---|
| 0 | `0x02` | `0x34` | firmware version, as two nibbles: 0.2 and 3.4 |
| 1 | `0x11` | `0x05` | hardware version, as two nibbles: 1.1 and 0.5 |
| 2 | `0x1c` | `0xc8` | the second byte of the flash chip's id, below |
| 3 | `0x15` | `0x1f` | the first byte of the flash chip's id, below |
| 4 | `0xe0` | `0xc0` | **the architecture** in the high nibble, 14 and 12, and the **software type** in the low |
| 5 | `0x47` | `0x36` | the skin, 71 and 54, as a plain byte; `bcdDevice` states the same skin independently |
| 6 | `0x0c` | `0x0c` | a **platform**, not the architecture |
| 7 | `0x02` | `0x34` | the version byte at program `0x000017`, in the boot area |
| 8 | `0x00` | `0x34` | the version of the image at `0xFF` `+0xE000`, from `0x01E007` |
| 9 | `0x00` | `0x16` | the version of the image at `0xFF` `+0x0000`, by pairing |
| 10 | `0x02` | `0x34` | the safe mode image's version, from `0x001007` |
| 11 | `0x02` | `0x34` | the running application image's own header version, from `0x009007` |

The rows' evidence: fields 0 to 5 by prediction and two remotes[^s57]; field 4 by its accessor[^s57][^s87];
field 6 by eleven images[^s116]; fields 7 to 11 by the program addresses their accessors build[^s59].

* **Fields 0 and 1** are packed by `0x14268`, which takes two separately fetched values and packs them
  with `SWAPF`, `ANDLW 0xF0` and `IORWF`[^s19][^t-usb-firmware].
* **Fields 2 and 3 are the flash chip's own id, and what the two bytes mean differs by architecture**,
  because one part is parallel NOR and the other is serial. On the Harmony 600, 650 and 700 the accessor
  `0x14244` drops the chip select and `0x10974` sends the JEDEC `0x9F`, keeping two of the three bytes:
  field 3 is the **capacity code**, which the firmware compares against `0x13`, `0x14` and `0x15` to choose
  512 KiB, 1 MiB or 2 MiB, and field 2 the **manufacturer**, `0x1C` being EON's. On the Harmony One field 3
  is the manufacturer, `0x1F` being Atmel's, and field 2 the device. So the pair is written field 3 then
  field 2, `15:1C` and `1F:C8`, and neither byte may be read as the same thing on both
  architectures[^s109]. The Harmony 525 answers `FF:12`[^s76].
* **Field 5 is the skin in plain binary**, where `bcdDevice` carries the same skin in BCD on these remotes,
  [the transport](transport.md#bcddevice-carries-the-skin-in-one-of-two-encodings)[^s113].
* **Fields 8 and 9 version two images that only the Harmony One carries**, the flash programmer and the
  programmable logic image, and the Harmony 600 answers zero for both. That zero is a compiled in constant
  on that architecture, `CLRF INDF0`, and not an absent image answering; field 8 is proved by the address
  its accessor builds, and field 9 by the three internal images pairing onto three fields with the other two
  proved. Field 9's own accessor is a table read whose address does not explain its value[^s59].
* **Fields 7, 10 and 11 repeat field 0** because they version things a firmware release stamps together:
  the boot area, the safe mode image and the running application[^s59].

**Two fields concordance reports are not in the block**: its firmware type and its `IRL, ORL, FRL` have no
field here[^unchecked]. The third component of the hardware version it prints is not in the block at all:
concordance sets it to zero itself[^x-concordance].

### The five compiled in fields

Fields 0, 4, 5 and 6 come from five consecutive `RETLW` instructions, in the order field 0, field 4's
low nibble, field 5, field 6, field 4's high nibble, so their values can be read off any image without
running it: at `0x10648` on the Harmony 700 2.8, `0x11964` on the Harmony 600 0.2, `0x138C8` on the Harmony
650 0.4 and `0x24262` on the Harmony One 3.4[^s57][^t-usb-firmware].

| image | field 0 | field 5 | field 4 high nibble | software type | field 6 |
|---|---|---|---|---|---|
| Harmony 700 2.8 | `0x28` | `0x42`, skin 66 | 14 | 0 | `0x0C` |
| Harmony 600 0.2 | `0x02` | `0x47`, skin 71 | 14 | 0 | `0x0C` |
| Harmony 650 0.4 | `0x04` | `0x48`, skin 72 | 14 | 0 | `0x0C` |
| Harmony One 3.4 | `0x34` | `0x36`, skin 54 | 12 | 0 | `0x0C` |
| Harmony 525 3.0 | `0x30` | `0x16`, skin 22 | 9 | 0 | `0x09` |
| Harmony 880 4.4 | `0x44` | `0x0f`, skin 15 | 8 | 0 | `0x08` |
| Harmony 885 4.4 | `0x44` | `0x11`, skin 17 | 8 | 0 | `0x08` |
| Harmony One safe mode | `0x34` | `0x36`, skin 54 | 12 | 4 | `0x0C` |
| Harmony 600 safe mode | `0x02` | `0x47`, skin 71 | 14 | 4 | `0x0C` |
| Harmony 880 bootloader 4.0 | `0x40` | `0x0f`, skin 15 | 8 | 3 | `0x00` |
| Harmony 885 bootloader 4.0 | `0x40` | `0x11`, skin 17 | 8 | 3 | `0x00` |

Read in the firmware[^s116][^t-usb-firmware].

**Field 4's high nibble is the architecture and nothing else**: three Harmony 600, 650 and 700 images with
three firmware versions and three skins all report 14, the Harmony One reports 12, the Harmony 525 9, and
the four Harmony 880 and 885 images 8. It matches the architecture each remote's own configuration states,
and that is evidence rather than a tautology, because the accessor has exactly one caller and the firmware
never compares the constant with the configuration[^s57][^t-usb-firmware]. The packing leaves four bits
for it, so it can express fifteen architectures[^t-usb-firmware].

**Field 6 is a platform**: `0x0C` on the Harmony One and the Harmony 600, 650 and 700 alike, `0x09` on the
Harmony 525 and `0x08` on the Harmony 880 and 885, the lowest architecture number on each platform. The
Harmony One and the 600, 650 and 700 are one platform under it, which their shared processor family and
container cookies say too[^s116]. The `bcdDevice` high byte has a similar shape with different values, so
the two are not one variable[^s113].

## Software type, and what safe mode changes

**Field 4's low nibble is the software type**, from its own `RETLW` accessor beside the architecture one and
combined by the same `SWAPF`, `ANDLW 0xF0`, `IORWF` shape as fields 0 and 1[^s87][^t-usb-firmware].
Logitech names the values in the comments of its firmware packages, 0 and 4 being application mode and safe
mode, 1 test mode and 3 boot mode, and its client names all five: 0 application, 1 test, 2 minimal, 3
bootloader, 4 safe mode[^s87b]. So the reply says which of a remote's firmware personalities is answering.
`readVersion` names the software type with those words.

**What safe mode changes in the block is per architecture**, because the remotes enter safe mode
differently:

* **On a Harmony One one byte of twelve changes**: field 4's low nibble goes from 0 to 4, and a Harmony One
  in safe mode answers `34 05 c8 1f c4 36 0c 34 34 16 34 34`. Its safe mode image runs beside the
  application and copies nothing over it, so the flash id, the skin and the platform stay as they
  were[^s190].
* **On a Harmony 525 three fields change**, the firmware version, the software type and the platform:
  entering safe mode copies a different image over the application, so a different program, of a
  different generation, is answering, [its usb page](../architectures/harmony-5xx/usb.md)[^s118][^s190].
* **On the Harmony 600, 650 and 700** a Harmony 700 in safe mode answers software type 4[^s295], and the
  Harmony 600's safe mode image carries the platform `0x0C` like its application[^s116]. What else such a
  reply changes on a remote is not checked[^unchecked].

So a caller learns the state from field 4's low nibble and **must not** read field 6 as saying it. A zero
in field 6 is measured only from a Harmony 525 in safe mode[^s118]. On the Harmony 880 and 885 a zero is
seen only in their two bootloader images, which are software type 3, and no safe mode image of that
architecture is known, so whether one would answer zero is not known[^s116][^unchecked].

## What Logitech's client reads from it

Logitech's client reads GET_VERSION when it identifies a remote and assigns the same six fields this page
reads, in the same order: firmware and hardware version as nibble pairs, then flash device id, then flash
manufacturer id, then architecture in the high nibble and software type in the low, then the
skin[^s212]. Its naming of fields 2 and 3 is the Harmony One's reading, above. It names nothing past the
skin. Its region numbers place fields 8 and 9 as the versions of the flash programmer and the programmable
logic image, which agrees with the readings above, [the Harmony One's firmware](../architectures/harmony-one/firmware.md)[^s212].

**One agreement and one contradiction.** The client's file for the Harmony 525's skin declares a flash
device id of `0x12` and a manufacturer of `0xFF`, and its file for the Harmony One declares `0xF9` and
`0x01`; no archive section holds those two statements[^unchecked]. A Harmony 525 reports exactly the first
pair[^s76], and a Harmony One reports `0xC8` and `0x1F`, not the second[^s57b]. Either the One shipped with
more than one flash part or the file is wrong; either way **a writer takes the flash id from the remote and
never from the client's table**, and the write rails in `packages/usb/src/rails.ts` compare a
configuration's declared version against the version block the remote returns rather than against a
constant.

## `bcdDevice` and field 5 on the remotes not yet read for it

The Harmony 700 2.8 image's device descriptor carries `bcdDevice` `0x1066` and the Harmony 650 0.2 build's
`0x1072`, BCD of 1000 plus the skin, where field 5 states the same skins as `0x42` and `0x48` in plain
binary[^s113][^s392]. Neither has been read off a remote's bus[^unchecked].

## Not checked

* What the low nibble of the reply byte `0x28` means, if anything[^unchecked].
* What field 9's accessor reads, given that its address does not explain its value[^s59].
* What a Harmony 600 or 650 in safe mode answers beyond the software type[^unchecked].
* Whether a safe mode image exists on the Harmony 880 and 885, and what its field 6 would be[^unchecked].

[^s19]: Read in the firmware. [Section 19](../../docs/findings.md#s19)
[^t-usb-firmware]: Read in the firmware. [The test](../../tests/test_usb_firmware.py)
[^s57]: Read in the firmware. [Section 57](../../docs/findings.md#s57)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^unchecked]: Not checked.
[^s59]: Read in the firmware. [Section 59](../../docs/findings.md#s59)
[^s87]: Read in the firmware. [Section 87](../../docs/findings.md#s87)
[^s116]: Read in the firmware. [Section 116](../../docs/findings.md#s116)
[^s109]: Read in the firmware. [Section 109](../../docs/findings.md#s109)
[^s113]: Read in the firmware. [Section 113](../../docs/findings.md#s113)
[^s87b]: Stated by Logitech, in their client. [Section 87](../../docs/findings.md#s87)
[^s190]: Measured on a unit. [Section 190](../../docs/findings.md#s190)
[^s118]: Measured on a unit. [Section 118](../../docs/findings.md#s118)
[^s295]: Measured on a unit. [Section 295](../../docs/findings.md#s295)
[^s212]: Stated by Logitech, in their client. [Section 212](../../docs/findings.md#s212)
[^s392]: Read in the firmware. [Section 392](../../docs/findings.md#s392)
[^s57b]: Measured on a unit. [Section 57](../../docs/findings.md#s57)
