# The version block

### GET_VERSION

**Request: `0x10 | length nibble`.** The parser is inline in the USB callback at `0x0BDFE`
rather than a separate handler, and it sets state 1.

The executor is state 1, `0x0C906`:

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

**Response: `0x28` then 12 bytes**, copied out of a block that `0x1422C` builds. On **arch 9** the
response is `0x27` and seven fields; see below.

**It is twelve fields, and the count closes.** `0x1422C` takes the pointer in `0xEDD` and
`0xEDE` as a base and stores through it with `ADDWF 0xedd,W` at exactly **twelve** sites, from
`0x142C0` to `0x143AE`, one per field, with `0xD1C` as the running offset. Twelve stores, twelve
bytes copied by the executor's loop, and neither number was derived from the other.

Each field comes from its own small accessor. Two of them say something about what they are
without any further work:

* `0x14244` clears `LATF` bit 7, the external flash chip select, then calls `0x10974` and takes a
  **16-bit** result out of `PROD`. A 16-bit value read over SPI from the flash chip is the flash
  id, which the corpus already records per remote as a manufacturer and device byte pair.<!--superseded-->

  **Corrected in section 109.** `0x10974` sends the JEDEC `0x9F` and keeps two of the three bytes it
  gets back, and the pair is **the capacity code and the manufacturer**, not a manufacturer and a
  device id, which is concordance's split. The mechanism decides it: the firmware compares one of the
  two against `0x13`, `0x14` and `0x15` to choose a flash size of 512 KiB, 1 MiB or 2 MiB, and only a
  capacity code can do that. On the bench 600 the pair is `0x15` and `0x1C`, 16 Mbit and EON, which is
  the part section 88 identified from the address validator instead.
* `0x14268` takes two separately fetched values and packs them into one byte, `SWAPF` then
  `ANDLW 0xf0` then `IORWF`, so one of the twelve bytes is **two four-bit fields**. A major and
  minor version pair is the obvious candidate.

Naming the other ten means following their accessors, which is a separate piece of work and is
not done. concordance's `GET_VERSION` yields firmware, hardware, skin, flash id, protocol and
architecture, so those are the candidates, and the honest way to settle it is to compare our
twelve bytes against a concordance run on the same remote once there is a host implementation.
Which is the cross-check roadmap step 3 asks for anyway.

One loose end, recorded rather than smoothed over: `0x28` under the request encoding would be
code `0x20` with length nibble 8, and nibble 8 means **15** payload bytes, not 12. Either the
response length nibble is not the request mapping, or three more bytes follow the loop. Not
resolved.
### The reply's low nibble is the field count, and twelve is not universal

*Measured on a Harmony 525, live device, 8 August 2026. `docs/findings.md` section 76.*

| architecture | reply byte | fields |
|---|---|---|
| 9 | `0x27` | 7, and every one of them identified |
| 12, 14 | `0x28` | 12, by the firmware's own two counts above |

A 525 answers `27 30 25 12 ff 90 16 09`: firmware 3.0, board 2.5.0, flash `0xFF:0x12`, then `0x90`
for architecture 9, skin 22, and `0x09` where the two MyHarmony era remotes carry a compiled in
`0x0C`. concordance reads the nibble as a length and branches on it, accepting 5, 7 or 8 and giving
up the architecture and the skin below 6 and the protocol below 7, which is the same rule seen from
the other side: the nibble counts where it is small and is a floor at 8, and the arch 12 firmware
settles the real figure at twelve by copying twelve bytes.

**Field 4's high nibble is the architecture, now on three architectures.** That reading came from
four images spanning two, so `0x90` on a third is the test it had been waiting for.

### GET_VERSION's twelve bytes, six identified by prediction

The 600 gave `02 11 1c 15 e0 47 0c 02 00 00 02 02`. Laid beside `concordance -i` on the same unit,
six fields had a reading. **That reading was then written down as a prediction for the Harmony One,
before the One was read**, and the One gave `34 05 c8 1f c0 36 0c 34 34 16 34 34`: the first six
bytes exactly as predicted.

| Field | 600 | One | Reading |
|---|---|---|---|
| 0 | `0x02` | `0x34` | firmware version, as two nibbles: `0.2` and `3.4` |
| 1 | `0x11` | `0x05` | hardware version, as two nibbles: `1.1` and `0.5` |
| 2 | `0x1c` | `0xc8` | flash device id |
| 3 | `0x15` | `0x1f` | flash manufacturer id, so the pairs are `15:1C` and `1F:C8` |
| 4 | `0xe0` | `0xc0` | **the architecture** in the high nibble: 14 and 12. Low nibble the **software type** |
| 5 | `0x47` | `0x36` | skin, 71 and 54, which `bcdDevice` says independently |
| 6 | `0x0c` | `0x0c` | a **platform**, not a constant and not the architecture, section 116. What a remote in a recovery role answers is **per architecture**, section 190 |
| 7 | `0x02` | `0x34` | **the version byte at program `0x000017`**, in the boot area |
| 8 | `0x00` | `0x34` | **the version of the image at `0xFF` `+0xE000`**, from `0x01E007` |
| 9 | `0x00` | `0x16` | **the version of the image at `0xFF` `+0x0000`**, by pairing, accessor unexplained |
| 10 | `0x02` | `0x34` | **the safe mode firmware's version**, from `0x001007` |
| 11 | `0x02` | `0x34` | **the running application image's own header version**, from `0x009007` |

**The same Harmony One in safe mode gives `34 05 c8 1f c4 36 0c 34 34 16 34 34`**, section 190,
measured on 27 August 2026. **One byte of twelve differs**, field 4's low nibble going from 0 to 4, and
the flash id and the skin are unchanged as hardware fields should be. Compare the Harmony 525, section
118, whose safe mode block differs in **three** fields, adding the firmware version and the platform,
because arch 9 copies a different image over its application where arch 12 runs one resident beside it.
So a caller must read field 4's low nibble to learn the state, and **must not** read field 6 as saying
it: zero there means safe mode on arch 9 and arch 8 and means nothing of the sort on arch 12.

**The reading is executable, in `readVersion`.** Added on 21 August 2026 in
`packages/usb/src/protocol.ts`, because FreeHarmony needs a firmware version and a flash id for a
document and must not compute either itself: interpreting a reply is the library's job. It surfaces the
six fields this table establishes and no more, keeps the whole block beside them so nothing it does not
understand is lost, and refuses a block under seven bytes, which carries neither the architecture nor
the skin. `VERSION_FIELD_NAMES` moved there in the same change, from `packages/bench`, which had been
the only place the block was labelled at all and had carried a wrong claim about field 6 for a month.
Asserted against all three bench remotes in `packages/usb/test/protocol.test.ts`.

That is six fields agreeing across two architectures, with the second remote differing in every one
of the values the reading predicts. Fields 2 and 3 are the 16-bit SPI read the firmware performs with
the chip select low, characterised as "the flash id" from the image alone; fields 0 and 1 are the
packed nibble shape the `SWAPF`, `ANDLW 0xF0`, `IORWF` sequence builds. So two of the six are
agreements between a disassembly and a device.

**Field 4's low nibble is the software type, and this document said it was a compiled in zero.**<!--superseded-->
It comes from its own `RETLW` accessor beside the architecture one, and the two are combined by the
same `SWAPF`, `ANDLW 0xF0`, `IORWF` shape as fields 0 and 1. Zero on all four application images and
**4 on the safe mode image of each bench remote**, whose other four accessors are byte for byte
identical to the application's. Logitech's firmware packages name the values in their own comments:
0 and 4 are "application mode or Safe mode", 1 is Test mode and 3 is Boot mode. The client names
all five independently: 0 application, 1 test, 2 minimal, 3 bootloader, 4 safe mode.
`docs/findings.md` section 87.

So the reply says which of a remote's four firmware personalities is answering. Both bench remotes
read zero because both were running their application. **The prediction, recorded before anyone
tries it**: a 600 in safe mode answers field 4 as `0xE4` and a One as `0xC4`.

**Fields 8 and 9 are both placed now, and by the thing this paragraph used to say did not exist.** It read: "`0x16` on
the One is the only value in the block that has no counterpart anywhere in concordance's output".
The counterpart is not in concordance's output, it is in the remote. Reading the One's internal
memory in full turned up three images carrying the `48 47` header, and the one at `0xFF` `+0x0000`
has `0x16` in its header's version byte. On the 600 that address holds no image, only zeros, and the
600's field 9 is `0x00`. Two remotes, a distinctive value in a block otherwise full of `0x34`, and an
absence matching an absence.

> **Corrected in section 59 of `docs/findings.md`.** The two paragraphs below place fields 8 and 9
> correctly and argue for them wrongly. Both rest on the Harmony 600 reporting `0x00` as an absent
> image answering zero, and on the 700 image those two bytes are `CLRF INDF0`, a compiled in
> constant. Arch 14 zeroes exactly the two fields that name images only arch 12 carries, which is
> consistent with the assignment but is not a measurement of it. Field 8 is now proved by the
> address its accessor builds, `0x01E007`, and field 9 by the three internal images pairing onto
> three fields with the other two proved. Field 9's own accessor is a table read whose address does
> not explain its value, and that is unresolved.

**Field 8 was settled the same way, by the two reads named as the test.** Both candidate addresses
were then read on the 600. It has an image at `0xFE` `+0x1000`, the safe mode one, 24320 bytes at
version `0x02`, and its checksum verifies. And it has **nothing at all at `0xFF` `+0xE000`**, which is
erased. Field 8 is `0x00`. So field 8 is the version of the image at `0xFF` `+0xE000`, and the
alternative is ruled out rather than merely unfavoured: if field 8 named the safe mode image, the 600
would report `0x02` there, and it does not.

**Fields 4, 5 and 6 come from compiled in literals, and that names field 4.** The version block's
accessors for them are five consecutive `RETLW` instructions, so their values are readable off any
image without running anything. On the 700 2.8 they are at `0x10648`, on the complete 600 0.2 at
`0x11964`, on the 650 0.4 at `0x138C8` and on the One 3.4 at `0x24262`, in the order field 0, field
4's low nibble, field 5, field 6, field 4's high nibble.

| Image | field 0 | field 5 | field 4 high | architecture |
|---|---|---|---|---|
| 700 2.8 | `0x28` | `0x42`, so skin 66 | `0x0e` | 14 |
| 600 0.2 | `0x02` | `0x47`, so skin 71 | `0x0e` | 14 |
| 650 0.4 | `0x04` | `0x48`, so skin 72 | `0x0e` | 14 |
| One 3.4 | `0x34` | `0x36`, so skin 54 | `0x0c` | 12 |
| 880 4.4 | `0x44` | `0x0f`, so skin 15 | `0x08` | 8 |
| 885 4.4 | `0x44` | `0x11`, so skin 17 | `0x08` | 8 |
| 880 boot 4.0 | `0x40` | `0x0f`, so skin 15 | `0x08` | 8 |
| 885 boot 4.0 | `0x40` | `0x11`, so skin 17 | `0x08` | 8 |

Three arch 14 images with three different firmware versions and three different skins all report
14, the arch 12 image reports 12, and **the four arch 8 images report 8**, so the byte tracks the
architecture and nothing else across three architectures now. The last two of those are the arch 8
**bootloaders**, section 116, whose software type nibble is 3 where an application's is 0 and a safe
mode image's is 4, so they are a third value of that field on a third architecture. The arch 8 pair is the sharpest case in
the table: one build, two models, and field 5 is the only one of the five constants that differs
between them. It also
matches the architecture each bench remote's own config states in base slot 1, on all three units.
That agreement is evidence rather than a tautology, because the accessor has exactly one caller and
the firmware never compares the constant against the config. Read as "protocol" until then;
`docs/findings.md` section 57.

Two predictions fall out for remotes nobody here has connected, and they are recorded now so that
connecting one is a test rather than a confirmation: a Harmony 700 should enumerate `bcdDevice`
`0x1066` and a Harmony 650 `0x1072`, since the skin is reported in binary here and in BCD there.

**What is still not claimed.** ~~Fields 7, 10 and 11 repeating field 0 is an observation, not a
reading.~~ **All three have readings now**, in section 59: field 7 is the version byte at program
`0x000017`, field 10 the safe mode firmware's, and field 11 the running application image's own
header. They agree with field 0 because they version four things a firmware release stamps
together, which is what this section already suspected and rightly declined to claim. It read:

> Three copies of the firmware version is a strange thing for a version block to carry, and the
> likelier explanation is that they version other components which happen to match. One candidate
> is now visible: the safe mode image at `0xFE` `+0x1000` carries the same version as the
> application on both remotes, `0x34` and `0x02`, so a field naming it would be indistinguishable
> from a field naming the application. That is exactly why nothing is claimed.

The candidate was the right one and the objection was the right objection. What answered it was not
a better comparison of values but the address the accessor builds, `0x001007`, which cannot be the
application on either architecture.

Concordance prints three things this block could plausibly carry, of which **two** are still
unplaced: firmware type and `IRL, ORL, FRL`. The third component of the hardware version is not
unplaced but absent, section 225: concordance sets it to zero itself and says why.
### The version reply's field map, which agrees with ours field for field

The client's identify operation reads `GET_VERSION` and assigns the same fields this project derived
from disassembly and prediction: firmware version and hardware version as nibble pairs, then flash
device id, then flash manufacturer id, then a byte carrying the architecture in the high nibble and
the software type in the low, then the skin. Six fields, the same six, in the same order.

It stops there. It has no name for field 6, the compiled in `0x0C` this project cannot explain, nor
for anything above it, so the client does not settle that and never did.

**One agreement and one contradiction, both measured.** The arch 9 skin declares a flash device id
of `0x12` and a manufacturer of `0xFF`, and the bench Harmony 525 reports exactly that pair. The
Harmony One skin declares `0xF9` and `0x01`, and the bench Harmony One reports `0xC8` and `0x1F`.
Either the One shipped with more than one flash part or the file is wrong; either way **a writer
must take the flash id from the remote and never from this table**, and `rails.ts` already says the
config's declared version is matched against the remote rather than against a constant.
