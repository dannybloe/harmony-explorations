# Logitech Harmony firmware and config format: arch 12 ("Gin") and arch 14

Reverse engineering notes covering two remotes and three firmware images.

Source material:

* **Harmony One**, concordance 1.5 dump. Firmware 3.4, hardware 0.5.0, skin 54,
  architecture 12, protocol 12, external flash Atmel AT49BV322A (4 MiB, `0x1F:0xC8`),
  USB 046D:C121, config flash used 1634 of 3840 KiB.
* **Harmony 600**, concordance 1.5 dump. Firmware 0.2, hardware 1.1.0, skin 71,
  architecture 14, protocol 14, external flash EON F16-100HIP (4 MiB, `0x15:0x1C`),
  USB 046D:C122, config flash used 721 of 3904 KiB.
* `harmony_one_firmware_3_4.hfw` and `harmony_700_firmware_2_8.hfw`, retrieved from
  harmonyremoterepair.com. The One image is exactly the version running on the
  dumped remote.
* A **second Harmony One** of the same model, firmware and skin, unprogrammed. The pair is
  worth more than two unrelated dumps.
* **Five publicly shared configs from other architectures**, used as controls rather than as
  targets: four architecture 8 configs (720/785/88x class) shared by guyman70718 in
  concordance issue 66, and one architecture 9 config (Harmony 525) published by trelowney.
  Both sets were published by their owners with the account fields already at zero. See
  section 14.
* A **Harmony 700 config**, architecture 14, skin 66, posted publicly by
  [@dmrzzz](https://github.com/dmrzzz). The second arch 14 config and the only one from the
  same model as the 700 firmware image disassembled here, which is why it carries more than
  its share of section 15.

Everything below is derived from those files plus the concordance source tree. Every
numeric claim was checked against at least two independent samples where possible.

**Authorship and provenance.** This document was produced by Claude (Anthropic's AI) from
the source material listed above. No insider information and **no writes to any remote**. It
was pure offline analysis of files until section 19, which now also rests on hardware. The
programmed Harmony 600 was enumerated read only, and then three read commands were sent to it from
this project's own host code: GET_VERSION, READ_MISC and READ_FLASH. **Nothing has been written to a
remote, by any path.** Every other claim in this document is offline analysis, which means it is
independently checkable and should be checked. Verification method is shown alongside the conclusions
rather than just asserted, most importantly the calibration table in section 5 and the
numeric closure in section 13. The highest-risk item used to be that the SFR map assumed the
standard PIC18 high-end register layout rather than the PIC18F67J50 map specifically. That
risk was real: eight of 93 names were wrong, and the whole USB register block was at the
wrong addresses. Section 18 has the correction. The remaining one is that the arch 12 part
number is inferred, not read off a board. Errors are documented where they occurred rather
than quietly fixed, so the rest can be calibrated against them.

Fourteen have been found and corrected so far. The newest is the sharpest: this document recorded
that a `READ_FLASH` through sub-selector `0xFE` "returns nothing at all", on the strength of one
probe at one offset that produced no reply. It reads fine, and it is the one that maps from program
address zero. **A null result from a single probe is a fact about that probe**, and writing it up as
a property of the selector turned a missing measurement into a finding. Section 22.

Before it, one that shows where a number came from: three arch 8 configs were recorded here as
"generated about ten minutes apart", a figure that came from outside rather than from the configs.
They carry their own build timestamps, and those say 33 and 25 minutes. The conclusion drawn from it
stands, section 21.

Before that, the oldest defect here: the container's section table starts at `0x0B` rather than
`0x0C`, an item is a spare byte plus a three byte
address, and the three bytes both parsers dismissed as padding are the final section's address. So
every container had been read one slot short since the first day, in both implementations, with
every consistency check passing. It decoded correctly regardless, because that slot is NULL in all
thirteen samples. Section 20, which is mostly about the two warnings that were recorded and not
chased: a derivation with an unexplained `- 3` in it, and an ambiguity documented next to it.

Before that, two came from the first hardware run and share a shape worth more than either fact: an
acknowledgement's length nibble is `0` while its command byte follows anyway, and a flash chunk's
first payload byte is a sequence number rather than data. In both cases a test existed and passed,
because the test encoded the same assumption as the code. Circular, not weak. Section 19.

Before those, the SFR map was the generic PIC18 layout rather than this family's, section 18, and
READ_FLASH's response was published as located when only the request had been. That one's lesson: it
came from following shared variables instead of control flow, so the code found proved what the
variables held and nothing about which command was running. Section 19.

The most consequential is that key codes were read as
`0x80 | (row << 3) | col`, a matrix address with bit 7 as a flag, when the top two bits are the
event type and the rest is the keypad scanner's own scan code; that one had generated a whole
paragraph of wrong reasoning about the 600's table not being able to describe its own keypad, and
section 17 replaces it. Two more are the same claim corrected twice in opposite directions, which
is worth reading as a pair: arch 12 and 14 were first said to use a container unrelated to the
Harmony 525's, then said to nest the 525's `0xFEED`/`0xBEEF` frames one per section, and in fact
there is **exactly one such frame per container, at section slot 0**. The first correction was
right that the formats are compatible and wrong about how far. See sections 7 and 15. `SUBFWB` and
`SUBWFB` were swapped in the
disassembler, which inverted an arithmetic expression in the infrared scaling block. A hand
count of LWJL codes was wrong, 107 rather than 108. And `BTFSC` and `BTFSS` were swapped,
which inverted the stated polarity of every bit test: the infrared enable mask, the keypad
columns and the reset key combination are all active low, not active high as first written.
And a rule for deriving the container's section marker from the cookie was wrong while still
producing the right answer on the only sample that exercised it, which is the most dangerous
shape an error can have; see section 14. None of those changed a structural conclusion, but they
produced readable listings rather than obvious failures, which is why the encodings are now
asserted in `tests/test_isa.py` and every documented finding has a regression test.

---

## 1. Summary

The firmware is PIC18 machine code and it is directly disassemblable. The reason this
had not been established is that `concordance --dump-firmware` does not return usable
code on either architecture, for two different reasons:

* **Arch 12 (Harmony One).** The dump contains no code at all. It returns a small
  GSPM config container instead. The application lives at flash `0x020000`, which
  concordance never reads.
* **Arch 14 (Harmony 600/700).** The dump *is* real PIC18 code, but it is silently
  truncated. The firmware image is 70336 bytes on the 600 and 76672 bytes on the 700,
  while `FIRMWARE_MAX_SIZE` is 65536. The missing tail contains the entry point.

Load addresses, determined empirically and cross-validated:

| Image | Size | Execution base | Entry point |
|---|---|---|---|
| Harmony One 3.4 | 60050 (`0xEA92`) | `0x020000` | `0x02EA38` |
| Harmony 600 0.2 | 70336 (`0x112C0`) | `0x009000` | `0x01A26E` |
| Harmony 700 2.8 | 76672 (`0x12B80`) | `0x009000` | `0x01BB38` |

## 2. Why the concordance dumps look the way they do

On both remotes, `--dump-safemode` and `--dump-firmware` produce **byte-identical**
output. From `libconcord/libconcord.cpp`:

```c
read_safemode_from_remote() -> _read_fw_from_remote(..., ri.arch->flash_base, ...)
read_firmware_from_remote() -> _read_fw_from_remote(..., ri.arch->firmware_base, ...)
```

`remote_info.h` sets `flash_base = 0x000000` and `firmware_base = 0` for arch 12, and
`flash_base = 0x000000` with `firmware_base = 0x000000` for arch 14 (carrying the
comment `0x010000 but not yet supported`). Both calls therefore read `FIRMWARE_MAX_SIZE`
= 64 KiB starting at flash address 0.

`--dump-firmware` also writes its output into an EZUp XML wrapper with
`<TYPE>Firmware_Main</TYPE>`, which is misleading: the wrapper is a fixed template and
the payload is whatever raw flash was read.

### Arch 12 content at flash 0
Of 65536 bytes, only about 9 KiB is non-`0xFF`:

* `0x000000-0x00011F` unidentified table, see section 8
* `0x002000-0x0042C6` a **GSPM config container**, not code
* everything else erased `0xFF`

### Arch 14 content at flash 0
All 65536 bytes are populated, and all of it is PIC18 code. This is the first 64 KiB of
a 70336-byte image.

## 3. Flash layout per architecture

| | arch 12 (Gin, Harmony One) | arch 14 (Harmony 600 / 700) |
|---|---|---|
| firmware storage (external flash) | `0x020000` to `0x02EA92` | `0x000000` to `0x0112C0` (600), `0x012B80` (700) |
| firmware execution base | `0x020000` | `0x009000` |
| execution model | in place from external flash | copied into internal flash |
| safe-mode GSPM config | `0x002000` to `0x0042C6` | `0x020000` to `0x021BC7` |
| user GSPM config | `0x040000` | `0x030000` |
| what concordance dumps | safe-mode config, no code | first 64 KiB of the code, truncated |

Both architectures reserve a 128 KiB firmware area. Arch 12 puts it at `0x020000` with
the safe-mode config below it; arch 14 puts it at `0x000000` with the safe-mode config
above it. The two are mirror images of each other.

### Why the execution models differ

For arch 12 the storage address and the execution address are the same (`0x020000`),
so the PIC18 must be executing in place from the external NOR flash. That requires an
80-pin PIC18 J-series part with an external memory bus, running in extended
microcontroller mode: addresses below `0x020000` resolve to the 128 KiB of internal
flash, addresses at and above `0x020000` go out onto the external bus.

For arch 14 the storage address (`0x000000`) and the execution address (`0x009000`)
differ, so the image cannot be executed where it is stored. `remote_info.h` names the
arch 14 part as **PIC18F67J50**, a 64-pin device with no external memory bus, which
confirms it: the bootloader must copy the image from external flash into internal flash
at `0x009000`. That leaves internal `0x000000-0x008FFF` (36 KiB) for the bootloader
itself.

For arch 12 the `micro` field is empty. Given the EMB requirement and that arch 14 is
a `PIC18F67J50`, the One is almost certainly the 80-pin sibling, `PIC18F87J50`. Worth
confirming by opening a remote and reading the marking.

### Arch 12 has an extra indirection in the update file

The One's `Region_2.EZUpgrade` decodes to 68952 bytes that split in two:

```
[0x00000 .. 0x022C6)   8902 bytes   destination flash 0x002000 (safe-mode GSPM config)
[0x022C6 .. 0x10D58)  60050 bytes   destination flash 0x020000 (application code)
```

The first part is **byte-identical** to the GSPM blob read off the dumped remote at
flash `0x2000`. That is what proves the split point. The split is discoverable from the
data itself: the GSPM header's `end_addr` field marks where the config ends.

Arch 14 keeps the two parts in separate files instead: the 700's `.hfw` ships
`Region_2.EZUpgrade` (code) and `Region_3.EZHex` (a GSPM config based at `0x020000`).

## 4. Firmware image header

Identical across all three images:

```
0x00  u16   checksum
0x02  ff ff
0x04  u16   (image_size - 8) & 0xFFFF   i.e. byte count from offset 8 to end
0x06  u8    0x00 on arch 12, 0x01 on arch 14
0x07  u8    firmware version, BCD
0x08  48 47  the magic that concordance's _fix_magic_bytes() writes
0x0A  GOTO <entry point>
0x0E  RETURN
```

Observed:

| Image | bytes 0x00-0x09 | version byte | size field | actual size |
|---|---|---|---|---|
| One 3.4 | `cd d8 ff ff 8a ea 00 34 48 47` | `0x34` = 3.4 | `0xEA8A` | `0xEA92` |
| 600 0.2 | `2b 6a ff ff b8 12 01 02 48 47` | `0x02` = 0.2 | `0x12B8` | `0x112C0` |
| 700 2.8 | `a1 d6 ff ff 78 2b 01 28 48 47` | `0x28` = 2.8 | `0x2B78` | `0x12B80` |

The size field matches `(size - 8) & 0xFFFF` exactly on both untruncated images. Applied
to the 600, it yields `0x112C0` = 70336 bytes, and `0x112C0` is the only candidate
consistent with the observed maximum branch target of `0x01A292`. So concordance's
64 KiB read on the 600 is missing the last **4800 bytes**, including the entry point at
`0x01A26E`.

### Checksum
Seeds `suma = 0x21`, `sumb = 0x43`; XOR the even bytes into `suma` and the odd bytes
into `sumb` over the range `[4 .. end_of_image]`. This reproduces bytes 0 and 1 exactly
on the One image.

Note that this differs from `_fix_magic_bytes()`, which starts the sum at
`firmware_4847_offset` and always runs to `FIRMWARE_MAX_SIZE`. The correct model is two
independent constants: the `0x48 0x47` magic sits at offset **8**, the checksum range
starts at offset **4**, and the range ends at the actual image size, not at 64 KiB.

## 5. Determining the load address

Method: decode every `GOTO`/`CALL` pair (`0xEF`/`0xEC`/`0xED` followed by a word whose
top nibble is `0xF`), reconstruct the 20-bit word address, double it to get a byte
address, then for a candidate base count how many targets fall inside the image and,
of those, how many are immediately preceded by a flow terminator (`RETURN`, `RETFIE`,
`RESET`, `RETLW`, the second word of a `GOTO`, or a `BRA`). A correct base makes almost
every target land on a function boundary; a wrong base does not.

Calibration on the One, where the base is independently known from the update file's
destination:

| base | in range | boundary hit |
|---|---|---|
| `0x000000` | 0 / 1315 | 0.0% |
| `0x010000` | 7 / 1315 | 14.3% |
| **`0x020000`** | **1308 / 1315 (99.5%)** | **98.9%** |
| `0x030000` | 0 / 1315 | 0.0% |

Harmony 600 dump:

| base | in range | boundary hit |
|---|---|---|
| `0x000000` | 232 / 1362 | 13.4% |
| `0x008000` | 1043 / 1362 | 18.9% |
| **`0x009000`** | **1181 / 1362 (86.7%)** | **99.0%** |
| `0x010000` | 1130 / 1362 | 27.3% |

Harmony 700 `Region_2`, the untruncated arch 14 image:

| base | in range | boundary hit |
|---|---|---|
| `0x000000` | 801 / 1638 | 11.9% |
| `0x008000` | 1436 / 1638 | 19.2% |
| **`0x009000`** | **1638 / 1638 (100.0%)** | **98.5%** |
| `0x00A000` | 1554 / 1638 | 30.1% |
| `0x010000` | 1238 / 1638 | 12.0% |

The 700 gives a clean 100% in-range result because the image is complete. The 600 falls
short of 100% only because of the truncation: its 181 out-of-range targets all lie in
`0x01900A` to `0x01A292`, that is, in the missing tail. **Zero** targets fall below
`0x009000` on either arch 14 image, which is what fixes the base.

Corroboration: the lowest branch target is `0x00904C` on **both** the 600 0.2 and the
700 2.8, that is, the same first function address in two different firmware versions
for two different models. Same link map, same codebase.

The 7 stragglers on the One target a 5-entry vector table in internal flash at
`0x01E00C`, `0x01E00E`, `0x01E010`, `0x01E012`, `0x01E014`. That looks like the
bootloader's exported service routines, plausibly the flash erase and write helpers the
application needs in order to reprogram the external flash.

## 6. Confirmation that this is PIC18

Not inference. Sample from the One at `0x20030`, and note the header at `0x20000` is
data, not code:

```
020000: cd d8       (checksum, not an instruction)
...
020008: 48 47       (magic, not an instruction)
02000a: 1c ef 75 f1 GOTO  0x02ea38
02000e: 12 00       RETURN
020030: 0f 01       MOVLB 0xf
020032: 14 0e       MOVLW 0x14
020034: 5f 6f       MOVWF 0x5f,BANKED
020036: 37 ec 6c f1 CALL  0x02d86e
02003a: 02 01       MOVLB 0x2
02003c: c7 6b       CLRF  0xc7,BANKED
...
020050: 04 01       MOVLB 0x4
020052: 40 0e       MOVLW 0x40
020054: 11 6f       MOVWF 0x11,BANKED
020056: 28 0e       MOVLW 0x28
020058: 12 6f       MOVWF 0x12,BANKED
```

Opcode high-byte histograms:

| | One 3.4 | 600 0.2 |
|---|---|---|
| `0x01` MOVLB | 3458 | 3684 |
| `0x0E` MOVLW | 3911 | 3369 |
| `0x6F` MOVWF banked | 1829 | 1949 |
| `0x6E` MOVWF | 1442 | (in tail) |
| `0xEC` CALL | 1183 | 1194 |
| `0xD0` BRA | 712 | 757 |

Textbook C-compiler PIC18 profile, consistent with the description in discussion #7 of
code "compiled from C with minimal hand crafted assembly". `DEADDEAD` appears as linker
fill in the One image.

## 7. The GSPM config container

Now validated against **four** independent samples at four different base addresses:
the One's safe-mode config (`0x002000`), the One's user config (`0x040000`), the 700's
`Region_3` safe-mode config (`0x020000`), and the 600's user config (`0x030000`).

```
0x00  char[4]  "GSPM"        magic (equals concordance's arch-12/14 cookie 0x4D505347)
0x04  u32      end_addr      absolute flash address of the trailing "PTYY" marker
0x08  u32      format        0x00001600 on arch 12, 0x00001400 on arch 14
0x0B  item[N]  section_table { u8 spare; u24 address }[N]; 0 means section absent
      char[4]  "LWJL"        first section magic
      u8       count
               {u8 event_code; u16 index; u8 flags}[count]
...
end-6 u16      checksum
end-4 char[4]  "PTYY"        end marker (matches arch 12/14 `end_vector = 4`)
```

Pointers are **absolute flash addresses**, not relative, so these blobs are position
dependent. `end_addr` resolved exactly onto `PTYY` in all four samples.

### The pointer table length is architecture dependent

* arch 12: **N = 22**, `LWJL` at `0x63`
* arch 14: **N = 20**, `LWJL` at `0x5B`

Nothing in the header states `N`. A parser should locate the `LWJL` magic and derive
`N = (offset_of_LWJL - 0x0B) / 4`. That formula checks out on both architectures.

**Corrected.** This section originally read `N = 21` and `N = 19`, with the table at `0x0C` and
three bytes of padding before the marker, and the formula carried a `- 3` for that padding.
Section 20 has the correction: the table starts at `0x0B`, the three bytes are the last section's
address, and `N` is one higher everywhere. Nothing else in this section changed, because the
addresses the old reading produced were all correct.

The `format` field at `0x08` is a version: `0x1600` on arch 12 matches
`<REGION ID="5">1.6</REGION>` in the One's firmware `Data.xml`, and `0x1400` on arch 14
matches its own config generation. Read as major/minor in the upper and lower byte.

Observed pointer values:

| slot | One safe cfg @0x2000 | One user cfg @0x40000 | 600 user cfg @0x30000 |
|---|---|---|---|
| 0 | `0x0029AD` | `0x076197` | `0x063702` |
| 1-6 | `0x0029B4`..`0x002A50` | `0x0762AE`..`0x076740` | `0x063D26`..`0x064007` |
| 7 | `0x004107` | `0x085E44` | `0x072CDB` |
| 8 | NULL | NULL | `0x072D0A` |
| 9-18 | `0x00410C`..`0x0042BA` | `0x085E7C`..`0x08C076` | `0x0734B5`..`0x07A33B` |
| 19 | `0x0042BC` | `0x08C078` | NULL |
| 20-21 | NULL, NULL | NULL, NULL | n/a (only 20 slots) |

In the One's 1.6 MB user config all 22 pointers land inside the first 310 KiB; the
remaining 1.36 MB is reached indirectly, presumably the IR code database and the
touchscreen bitmaps.

### The 525 container is inside this one

**Corrected twice, in opposite directions. Read section 15 for the current statement before
using anything here.** The first version of this document claimed that arch 12 and 14 have no
`0xFEED`/`0xBEEF` framing and therefore need a parser unrelated to the 525's. That was
wrong, and wrong in the direction that mattered: it told people not to reuse work that is
in fact directly reusable.

The correction below then overshot, claiming a frame per section. There is **exactly one frame
per container, at section slot 0**, on all thirteen samples. The rest of this subsection is the
overshoot as written, kept because how it happened is the instructive part.

The two are **nested**, not alternatives. GSPM is an outer layer carrying the pointer table.
Each section that table points at begins with `0xFEED` and ends with `0xBEEF`, which is the
container discussion #1 documents for the 525 class.

Section slot 0 of the Harmony One user config, at blob offset `0x036197`:

```
036197  ed fe 15 01 00  a7 08 00 00 00 00 00  52 6f 6f 74     ....... .......Root
        ^^^^^ ^^^^^                                           FEED, u16 length 0x0115
...
0362ac  ef be                                                 BEEF
```

So the layering is:

```
GSPM header                    arch 12/14 only, absolute pointer table
  section 0   FEED ... BEEF    the 525's container, one frame per section
  section 1   FEED ... BEEF
  ...
u16 checksum + "PTYY"
```

How the error happened, since it is instructive: the check performed was a count of
`0xFEED` occurrences across the whole 1.6 MB config, which came to 47. That was compared
against the roughly 25 hits two random bytes would produce in that much data, judged to be
the same order of magnitude, and dismissed as coincidence. The count was never correlated
with the section pointer addresses, which is where every one of those hits actually sits.
Counting an artefact is not the same as locating it.

### Architecture codenames

From the `NOTINTENDED` comments inside `Region_2.EZUpgrade`:

| arch | codename | arch | codename |
|---|---|---|---|
| 2 | 745 | 9 | Mocha |
| 3 | 768 | 10 | Cappuccino |
| 6 | 112 | 11 | Cognac |
| 7 | 659 | **12** | **Gin** |
| 8 | Espresso | | |

`SOFTWARETYPE`: 0 = normal, 2 = Test mode, 3 = Boot mode.

## 8. LWJL, and a caution about reading too much into it

**Superseded in its central claim. Read section 17 first.** The matrix encoding this section
works from is wrong: an event code carries an event type in its top two bits and the scanner's
own scan code in the rest. Everything below that counts "matrix" against "non-matrix" codes, or
reads rows out of them, is counting the wrong thing, and the caution the section ends with turns
out to have been warranted for a different reason than the one given. It is kept because the
row and column tables below are the raw material somebody may want to re-derive, and because
this is what the analysis looked like before the correction.

**Harmony One user config**: `count = 55`. Using the `0x80 | (row << 3) | col` matrix
encoding from discussion #1, that is 52 matrix entries over 7 rows by 8 columns, plus 3
non-matrix codes (`0x06`, `0x07`, `0x2D`). `flags` is `0x7f` on all 55, and the `index`
field runs 0, 1, 2, ... 54 strictly sequentially, so the information content is the
**ordering** of the event codes.

Occupied positions:

| row | columns |
|---|---|
| 0 | 1 2 3 4 5 6 7 |
| 1 | 0 1 2 3 4 5 6 7 |
| 2 | 0 1 2 3 4 5 6 7 |
| 3 | 0 1 2 3 4 5 6 7 |
| 4 | 0 1 2 3 4 5 6 7 |
| 5 | 0 3 4 5 6 7 |
| 6 | 0 1 2 3 4 5 7 |

Order, index 0 to 54:

```
0x89 0x88 0x8B 0x8A 0x8D 0x8C 0x8F 0x06 0x8E 0x07
0x81 0x83 0x82 0x85 0x84 0x87 0x86 0x98 0x99 0x9A
0x9B 0x9C 0x9D 0x9E 0x9F 0x90 0x91 0x92 0x93 0x94
0x95 0x96 0x97 0xAB 0xA8 0xAF 0xAE 0xAD 0xAC 0xA3
0xA2 0xA1 0xA0 0xA7 0xA6 0xA5 0x2D 0xA4 0xB2 0xB3
0xB0 0xB1 0xB7 0xB4 0xB5
```

**Harmony 600 user config**: `count = 162`, and the records look structurally different.
Every record has `index = 0`, and `flags` is either `0x00` or `0x07`. The codes are 55
non-matrix values (`0x41`-`0x76`, contiguous) plus 108 matrix values spanning rows 0-6
**and** rows 8-14, that is, bit 6 of the code selects a second bank of rows.

162 codes is far more than the 600 has physical buttons, and no handler indices are
present. So the arch 12 and arch 14 LWJL sections are probably not the same thing: the
One's reads like an actual binding table, the 600's reads like an enumeration of
supported event codes. The 700's `Region_3` safe-mode config has `count = 0`, and the
One's safe-mode config has `count = 2` (codes `0xAF` and `0xAE`, `flags = 0x00`, which
looks like a two-button recovery UI).

**Do not treat the 600 table as that remote's physical key matrix.** The semantics of
this section across architectures are unresolved.

**Resolved in section 17, and the opposite way round.** The 600's table is exactly its keypad: 54
scan codes in three event classes. "162 codes is far more than the 600 has physical buttons" was
the right observation and the wrong inference, because the 162 includes each key three times. The
second bank of rows at 8 to 14 was bit 6 of the code, which is the release flag, not a row bit.

## 9. Still unidentified

External flash `0x000000-0x00011F` on the Harmony One: 288 bytes in which **every
nibble is one of {6, 7, E, F}**. Equivalently, bits 1, 2, 5 and 6 of every byte are
never cleared. On NOR flash, where erased is `0xFF` and programming can only clear
bits, that is the signature of a counter or a log advanced by clearing one bit at a
time. Layout: `0x000000-0x000055` looks header-like, then `0x000097-0x00011F` is twelve
identical 9-byte records `67 67 F7 F7 F7 F7 FF FF FF`.

Candidates: boot counter, config generation counter, per-sector wear map. Diffing this
range across two dumps of the same remote taken at different times would settle it
immediately. Note this region does **not** exist on the 600, where flash `0x000000` is
the start of the firmware image.

## 10. Ghidra recipe

For the One's code half (`one34_code.bin`, 60050 bytes):

* Processor **PIC-18**, little-endian, 24-bit addressing.
* Base address **`0x20000`** in the CODE space.
* Entry point **`0x2EA38`**.
* Mark `0x20000-0x2002F` as data. It is the header plus `DEADDEAD` fill. Letting the
  analyzer run over it produces plausible-looking nonsense: `48 47` disassembles as a
  valid `RLNCF`, so it will not obviously look wrong.
* Add the five external entry points at `0x1E00C` through `0x1E014`.
* Expect to define the SFR names by hand from the PIC18F87J50 register map. Ghidra's
  generic PIC-18 spec does not name them, and the peripheral code is unreadable without
  them.

For arch 14 (`h700_r2.bin`, 76672 bytes, or the 600 dump):

* Same processor, base address **`0x9000`**, entry point `0x1BB38` for the 700 and
  `0x1A26E` for the 600.
* Header is only `0x00`-`0x0F` here; real code starts at `0x9010`.
* Prefer the 700 image over the 600 dump: it is complete, whereas the 600 dump is
  missing its last 4800 bytes.

Independent sanity check outside Ghidra: `gpdasm -p p18f67j50` (arch 14) or
`-p p18f87j50` (arch 12) from gputils, after converting to Intel HEX.

## 11. Suggested concordance changes

### arch 12, `remote_info.h`
```c
0x020000,   // firmware_base          (was 0; the firmware dump reads the wrong region)
8,          // firmware_4847_offset   (was 0; magic confirmed at image offset 8)
```
`0xEA92` fits inside `FIRMWARE_MAX_SIZE`, so a single 64 KiB read at `0x020000` captures
the whole application.

### arch 14
`firmware_base = 0x000000` is already correct; the existing comment suggesting
`0x010000` is wrong, since `0x010000` falls in the middle of the image. The real defect
is that `FIRMWARE_MAX_SIZE` (64 KiB) is smaller than the arch 14 firmware region.
Observed images need 70336 and 76672 bytes. The firmware area runs up to the safe-mode
config at `0x020000`, so a per-architecture firmware size of `0x020000` would be safe.

### `_fix_magic_bytes()`
The checksum range and the `0x48 0x47` offset are separate constants (4 and 8
respectively on both architectures), and the range should end at the image size rather
than at `FIRMWARE_MAX_SIZE`.

### Safety warning

`firmware_base` is also consumed by `erase_firmware()` and by
`write_firmware_to_remote(direct=1)`. If you apply any of these patches locally, use
the read path only (`concordance -f`). Do not run any erase or write operation against
a remote with a patched architecture table.

## 12. Open items

* Confirm the MCU markings on an opened Harmony One (expected `PIC18F87J50` or a close
  sibling) and on a 600.
* Dump external flash `0x020000-0x02FFFF` off a Harmony One and diff against
  `one34_code.bin` to confirm the arch 12 execute-in-place model on hardware.
* Dump external flash `0x000000-0x0112C0` off the Harmony 600 to recover the missing
  4800-byte tail and its entry point.
* Identify what regions 0, 1, 5 and 11 are on arch 12. Only region 2 ships in the One's
  `.hfw`, and only regions 2 and 3 in the 700's.
* Resolve the LWJL semantic difference between arch 12 and arch 14.
* Now that the firmware disassembles, the physical-button-to-matrix-position mapping
  should be recoverable from the key scanning routine directly, without flashing test
  configs onto hardware.

## 13. Firmware internals: first Ghidra pass (Harmony 700 2.8)

Ghidra 12.1.2, language `PIC-18:LE:24:PIC-18`, base `0x9000`. Result: **28974
instructions covering 66640 of the 76672 code bytes, about 87%**, in 521 functions.

Two practical notes on the setup:

* `analyzeHeadless` rejects a relative project path with `Path element starting with
  '.' is not permitted`. Use an absolute path.
* Auto-analysis on a raw binary finds almost nothing on its own, because there is no
  entry point and no relocations. Seeding it works far better: feed it the `CALL`,
  `RCALL` and `GOTO` targets extracted independently (501 function seeds and 99
  code-only seeds here), create functions at each, then run analysis. That is what
  produced the 87%.
* The PIC processor module ships a single generic `PIC-18` variant, so SFRs come out as
  `sfrF80` style names. The peripheral map below was worked out separately and has to be
  applied by hand.

Working command:

```
analyzeHeadless <abs-project-dir> harmony \
  -import harmony700_2.8.bin \
  -processor "PIC-18:LE:24:PIC-18" \
  -loader BinaryLoader -loader-baseAddr 0x9000
```

### Peripheral map

Derived from access-bank SFR usage counts across the image. SFR addresses follow the
standard PIC18 high-end map and should be confirmed against the PIC18F67J50 datasheet.

| Address | Name | Uses | Role |
|---|---|---|---|
| `0xF82` | PORTC | 50 | bit 2 is the **IR LED output** |
| `0xF8A` | LATB | 160 | display driver, block at `0x0D412` |
| `0xF8E` | LATF | 135 | second heavy peripheral |
| `0xF80` `0xF83` `0xF84` | PORTA PORTD PORTE | 6 / 15 / 6 | **keypad row drive** |
| `0xF81` | PORTB | 27 | **keypad column read**, bits 4-7 |
| `0xFD5`-`0xFD7` | T0CON TMR0L/H | 19 | IR receive (learning) timebase |
| `0xFE9`/`0xFEA`/`0xFEF` | FSR0L/H, INDF0 | 272 / 204 / 193 | main pointer register, as expected from compiled C |

### `0x10D00`: cycle-accurate delay, the most-used primitive

```
10d00: f9 24       ADDWF PCL,W
10d02: f9 6e       MOVWF PCL
10d04: 00 00       NOP        <- long NOP sled follows
```

A computed jump into a run of `NOP`s, so the delay is `W`-proportional and
cycle-exact. 28 direct callers. Note it appears at the same address `0x010D00` in both
the 600 0.2 and the 700 2.8 images.

### `0x194A4`: software IR carrier modulator

Not a hardware PWM. The carrier is generated in software, fully unrolled over 8
half-cycles:

```
194b4: 82 84       BSF PORTC,2      ; IR LED on
194b6: bc 51       MOVF 0xbc,B,W    ; on-time
194b8: 80 ec 86 f0 CALL 0x10d00     ; delay
194bc: 82 94       BCF PORTC,2      ; IR LED off
194be: bd 51       MOVF 0xbd,B,W    ; off-time
194c0: 80 ec 86 f0 CALL 0x10d00     ; delay
194c4: be a1 BTFSS 0xbe,B,0   ; bit n of mask selects whether this
194c6: 82 84       BSF PORTC,2      ;   half-cycle drives the LED
...                                 ; repeats for bits 0 through 7
```

Bank-13 variables: `0xBC` = on-time, `0xBD` = off-time, `0xBE` = an 8-bit mask selecting
which half-cycles drive the LED. The mask is **active low**: the test is `BTFSS`, which skips
the guarded `BSF PORTC,2` when the bit is set, so a **clear** bit turns the LED on. All three are loaded at `0x194A8`-`0x194B0` via
`MOVFF` from `0x08D`, `0x08E` and `0x3BF`. A programmable on/off time plus a per-half-
cycle enable mask is exactly what you need to synthesise arbitrary carrier frequencies
and duty cycles (36, 38, 40, 56 kHz) as well as carrier-less protocols. Single caller,
`0x195F0`.

Tracing where `0x08D`, `0x08E` and `0x3BF` are filled from is the direct route to how
the config's IR timing data is interpreted.

### The full IR chain, from config pointer to waveform

Traced end to end by following every write to `0x08D`, `0x08E` and `0x3BF`.

**Step 1, the action dispatcher at `0x12F08`.** A compiler switch (the PIC18 `XORLW`
cumulative-compare idiom) reads a selector from data `0x08B` and routes a 16-bit pointer
held in `0x095/0x096` into one of four subsystem pointer slots:

| selector at `0x08B` | pointer copied to | handler |
|---|---|---|
| 1 | `0x3CA/0x3CB` | `0x1AF2C` |
| **2** | **`0x3BD/0x3BE`** | **`0x193CE`, the IR path traced below** |
| 3 | `0x3AF/0x3B0` | `0x1973C` |
| 4 | none | `0x1A8A6` |

All four handlers write the same low-level variables (`0xDB8` timer preload, `0x08D`
on-time, `0xDBB` pattern byte), so all four are IR output renderers, not unrelated
peripherals. The selector therefore looks like an **IR encoding class** carried in the
config, with four distinct renderers. It is written at four sites: `0x17F4C`, `0x18006`,
`0x1809E`, `0x180F0`, and cleared at `0x12F8A` and `0x13C00`.

`0x3BD/0x3BE` is written exactly once in the whole image, at `0x12F2C`, which makes the
dispatcher the only way into the IR path.

**Step 2, the IR parameter block at `0x193CE`.** The handler parses the block that
pointer refers to:

```
193d0: bd c3 e9 ff MOVFF 0x3bd,FSR0L      ; FSR0 = parameter block
193d8: ee cf 00 fd MOVFF POSTINC0,0xd00   ; u16 LE at offset 0
193dc: ed cf 01 fd MOVFF POSTDEC0,0xd01
193e4: d8 90       BCF STATUS,0           ; x 4 (16-bit shift left twice)
193ee: 0a 0e       MOVLW 0x0a             ; / 10 via the divide at 0x1BAF6
193fc: 7b ec dd f0 CALL 0x1baf6
1940c: 13 08       SUBLW 0x13             ; if q > 19 then q -= 19 else q = 0
19418: 00 cd 8e f0 MOVFF 0xd00,0x08e      ; 0x08E = carrier period, in cycles
1941c: ...         FSR0 = block + 2
1942c: ef 50       MOVF INDF0,W           ; u8 at offset 2
                   ... same x4/10, then "if q > 8 then q -= 8 else q = 0"
19468: 00 cd 8d f0 MOVFF 0xd00,0x08d      ; 0x08D = carrier ON time, in cycles
19470: 8e 5f       SUBWF 0x8e,B,F         ; 0x08E = period - on = OFF time
```

So the block is:

| Offset | Type | Meaning |
|---|---|---|
| 0 | u16 LE | carrier period |
| 2 | u8 | carrier on-time (duty) |

Both are converted with `value * 4 / 10` and then have a fixed loop overhead subtracted
(19 cycles for the period, 8 for the on-time), clamped at zero.

**Step 3, conversion to the delay parameter.**

```
19472: 65 0e       MOVLW 0x65
19474: d8 80       BSF STATUS,0
19476: 8d 55       SUBFWB 0x8d,B,W        ; W = 0x65 - value
19482: 8d 9f       BCF 0x8d,B,7           ; (value & 0x7F) << 1
19484: 8d 47       RLNCF 0x8d,B,F
```

The delay routine at `0x10D00` has **exactly 100 `NOP`s followed by `RETURN`**, and
`0x65` = 101, so a parameter of `(101 - x) * 2` lands `x` NOPs from the end and burns
exactly `x` cycles. The inversion is just sled indexing.

**Numeric check.** `value * 4 / 10` cycles means 4 instruction cycles per unit of 0.1 µs,
so the core runs at 4 MIPS (16 MHz). Testing that against a real carrier: 38 kHz is a
26.3 µs period, so the config would store 263, giving `263 * 4 / 10` = 105 cycles, which
at 4 MIPS is 26.25 µs. That closes, and it confirms both the 0.1 µs storage unit and the
16 MHz clock. The 19-cycle subtraction is the measured overhead of the unrolled
modulator block.

**Step 4, the transmit loop at `0x195C6`.**

```
195c6: d5 9e       BCF T0CON,7            ; stop TMR0
195c8: f2 94       BCF INTCON,2           ; clear TMR0IF
195ca: b9 cd d7 ff MOVFF 0xdb9,TMR0H      ; preload = this burst's duration
195ce: b8 cd d6 ff MOVFF 0xdb8,TMR0L
195d2: d5 8e       BSF T0CON,7            ; start TMR0
195d6: c1 51       MOVF 0xc1,B,W          ; index++
195e2: 05 0e       MOVLW 0x05             ; FSR0 = 0x0500 + index
195e4: ef cf bb fd MOVFF INDF0,0xdbb      ; fetch pattern byte
195ec: bb cd bf f3 MOVFF 0xdbb,0x3bf      ; -> the modulator's enable mask
195f0: 59 df       RCALL 0x194a4          ; emit 8 half-cycles
195f2: f2 a4 BTFSS INTCON,2         ; wait for TMR0 overflow
195f4: fe d7       BRA 0x195f2
195f8: ba 07       DECF 0xba,B,F          ; repeat 0xDBA times
195fa: e5 e1       BNZ 0x195c6
```

So the firmware **pre-renders the IR signal into a RAM bitmap at data address `0x0500`,
one byte per 8 carrier half-cycles**, then plays it back timer-paced with TMR0. That
design is why the remote can emit essentially any protocol: the carrier shape is
parameterised (period, duty, per-half-cycle mask) and the envelope is just a bit buffer.

**Step 5, the `0x0500` buffer is a ring FIFO.** Found by locating every code path that
builds an FSR pointing into RAM page `0x05xx`. There are no `LFSR FSRn,0x05xx` and no
`MOVLB 0x5` anywhere; every access is `CLRF FSR0H / ADDLW index / MOVWF FSR0L /
MOVLW 0x05 / ADDWFC FSR0H,F`.

State variables, all in bank 3:

| Variable | Role |
|---|---|
| `0x3C1` | read index (consumer, `0x195D6` and `0x1958A`) |
| `0x3C2` | write index (producer, `0x131A0`) |
| `0x3C0` | pending byte count, `+= 2` by the producer, `DECF` per byte consumed |

Producer, `0x13194`, enqueues two bytes per call:

```
13196: 8a a1 BTFSS 0x8a,B,0
1319a: 21 ec dd f0 CALL 0x1ba42      ; enter critical section
131a0: c2 51       MOVF 0xc2,B,W     ; write index
131a2: c2 2b       INCF 0xc2,B,F     ; post-increment
131aa: 05 0e       MOVLW 0x05        ; FSR0 = 0x0500 + index
131ae: a5 c0 ef ff MOVFF 0x0a5,INDF0 ; store byte 1
131c0: a6 c0 ef ff MOVFF 0x0a6,INDF0 ; store byte 2
131c8: c0 27       ADDWF 0xc0,B,F    ; pending += 2
131d0: 1e ec dd f0 CALL 0x1ba3c      ; leave critical section
```

`0x1BA42` is `BCF INTCON,6` + `BCF INTCON,7` (clear PEIE and GIE) and `0x1BA3C` is the
matching pair of `BSF`s, so those are interrupt disable and enable. `0x08A` bit 0 is a
"caller already holds the lock" flag, so the guard nests safely.

The two bytes come from `0x0A5`/`0x0A6`, written from the 16-bit argument `0xD00`/`0xD01`
at exactly three sites: `0x18240`, `0x18304` and `0x18334`. All three sit in the same
`0x17E00`-`0x18400` region that writes the encoding selector `0x08B`, so that region is
the IR encoder.

**Step 6, the stream format.** The consumer at `0x19560` reads a command byte, then
decides how much follows:

```
1956a: ef cf ba fd MOVFF INDF0,0xdba   ; command byte
19570: c0 07       DECF 0xc0,B,F       ; pending--
19572: 80 0e       MOVLW 0x80
19576: ba 15       ANDWF 0xba,B,W
1957a: 57 e0       BZ 0x1962a          ; bit 7 selects a second command form
1957c: 04 0e       MOVLW 0x04
1957e: ba 25       ADDWF 0xba,B,W      ; required = command + 4
19582: c0 5d       SUBWF 0xc0,B,W
19584: 01 e2       BC 0x19588          ; enough buffered? else wait at 0x19712
19598: ef 1c       COMF INDF0,W        ; TMR0 preload, stored complemented
1959c: b8 6f       MOVWF 0xb8,B
```

So each record is a command byte whose bit 7 picks one of two forms, whose low bits give
the number of pattern bytes that follow (the same `0xDBA` that the play loop at `0x195F8`
counts down), followed by a 16-bit TMR0 preload stored **complemented**, because TMR0
counts up to overflow so the preload is the negated duration.

**Step 7, and this is the surprise: on arch 14 the config is not memory-mapped.**

The encoder gets its data through two accessors, `0x10A46` (one byte, 95 references) and
`0x10A5E` (two bytes, 45 references). Both begin `CALL 0x18DBC` and then `TBLRD*+`. But
`0x18DBC` is `GOTO 0x1B9AC`, and:

```
1b9ac: c9 68       SETF SSP1BUF         ; clock out 0xFF to clock a byte in
1b9ae: c7 a0       BTFSS SSP1STAT,0     ; BF, so wait for the byte to arrive
1b9b0: fe d7       BRA 0x1b9ae
1b9b2: c9 50       MOVF SSP1BUF,W       ; the byte
```

and the matching output primitive `0x1B984`:

```
1b984: 9e 96       BCF PIR1,3           ; SSPIF
1b986: c6 9e       BCF SSP1CON1,7       ; WCOL
1b988: c6 c3 c9 ff MOVFF 0x3c6,SSP1BUF  ; start transfer
1b98c: c6 be       BTFSC SSP1CON1,7     ; and check WCOL again afterwards
```

These listings said `SSPBUF`, `SSPSTAT` and `SSPCON1` when first published. The registers
and the addresses are unchanged; the part has two synchronous serial ports and the
disassembler now numbers them, so the config flash reads over port 1. See section 18 for
why the register table was rebuilt.

That is the PIC18 **hardware MSSP in SPI mode**. `0x18CEC` is `BSF LATF,7` then
`BCF LATF,7`, so **LATF bit 7 is the flash chip select**. `0x18D98` shifts
`TBLPTRU`, `TBLPTRH`, `TBLPTRL` out as the three address bytes. And the surrounding code
sends recognisable SPI NOR opcodes: `0x18DC6` sends `0xD8` (64 KiB block erase) and
`0x18DD2` sends `0x05` (read status register) followed by a loop polling bit 0, the
write-in-progress bit.

So `TBLPTR` here is **not** doing a real program-memory table read. It is being used as a
convenient 24-bit address counter, and `TBLRD*+` is used purely because it increments
`TBLPTR` in one instruction. The value read into `TABLAT` is discarded.

This independently confirms the arch 12 versus arch 14 split derived in section 3:

| | arch 12 (One) | arch 14 (600 / 700) |
|---|---|---|
| Flash part | Atmel AT49BV322A, **parallel** NOR | EON F16-100HIP, **SPI** serial |
| concordance flash ID | `0x1F:0xC8` (manufacturer:device) | `0x15:0x1C` (capacity:manufacturer, JEDEC SPI order) |
| Config access | memory-mapped into program space via the external memory bus | byte at a time over hardware SPI |
| Firmware execution | in place from external flash at `0x020000` | must be copied to internal flash at `0x009000` |

An SPI flash is not executable, so on arch 14 the firmware *has* to be copied into
internal flash. That is exactly the conclusion the `0x9000` load base forced, arrived at
from a completely different direction. The two agree.

It also explains the accessor design: with no memory mapping, every config byte costs an
SPI transaction, so the firmware streams records through a byte-at-a-time reader and
pre-renders the IR waveform into the `0x0500` ring buffer rather than reading it on
demand during transmission.

### `0x19486`: IR receive timebase

```
19492: d7 68       SETF TMR0H
19494: d6 68       SETF TMR0L
19496: d5 8e       BSF T0CON,7      ; start timer
```
with the matching stop at `0x1949A` (`BCF T0CON,7`, `BCF INTCON,5`). This is the
learning-mode edge timing capture.

### `0x190A6`: keypad scan

The matrix is **14 rows by 4 columns**, rows active low, and the `MULLW 0x04` below is what makes
that a reading of the code rather than an inference from a table size. Section 17 records an
attempt to overturn this from an upstream analogy, and why the code wins.

Three row-driver helpers do read-modify-write on a port, preserving the non-matrix bits:

| Helper | Port | Mask | Row lines |
|---|---|---|---|
| `0x1907E` | PORTE | `0x80` | bits 0-6, 7 rows |
| `0x19052` | PORTA | `0xC7` | bits 3-5, 3 rows |
| `0x19068` | PORTD | `0xF0` | bits 0-3, 4 rows |

7 + 3 + 4 = 14 row lines. `0x19094` reads the columns and returns 1 to 4. The tests are
`BTFSS`, which skips the `RETLW` when the bit is set, so a code is returned for the first
column line found **low**, consistent with the active-low row drive:

```
19094: 81 a8 BTFSS PORTB,4
19096: 01 0c       RETLW 0x01
19098: 81 aa BTFSS PORTB,5
1909a: 02 0c       RETLW 0x02
1909c: 81 ac BTFSS PORTB,6
1909e: 03 0c       RETLW 0x03
190a0: 81 ae BTFSS PORTB,7
190a2: 04 0c       RETLW 0x04
190a4: 00 0c       RETLW 0x00       ; no column active
```

The row walk builds a one-hot mask by shifting, inverts it, and drives one row low at a
time (group 1 shown, `0x1914E`-`0x1918C`):

```
19156: 01 0e       MOVLW 0x01       ; group 2 uses 0x08 here (PORTA bit 3)
19160: e8 46       RLNCF WREG,F     ; shift left `row` times
19162: fe 0b       ANDLW 0xfe
19168: e8 1c       COMF WREG,W      ; invert: active low
1916a: 7f 0b       ANDLW 0x7f
1916e: a1 6f       MOVWF 0xa1,B
19170: 86 df       RCALL 0x1907e    ; drive PORTE
19172: 90 df       RCALL 0x19094    ; read column
```

Final code assembly at `0x19274`:

```
19274: 81 50       MOVF PORTB,W     ; read to clear the mismatch condition
19278: f2 90       BCF INTCON,0     ; clear RBIF (PORTB interrupt-on-change)
1927c: 01 51       MOVF 0x01,B,W    ; row+1, 0 means nothing pressed
1927e: 0d e0       BZ 0x1929a
19282: 01 07       DECF 0x01,B,F    ; to 0-based row
19288: 04 0d       MULLW 0x04       ; row * 4
1928e: 00 25       ADDWF 0x00,B,W   ; + column (1..4)
...
1929a: 00 0e       MOVLW 0x00       ; no key
```

So the scanner returns **`row * 4 + column`**, a linear index from 1 to 56, with 0
meaning no key. Columns are detected via PORTB interrupt-on-change, which is how the
remote wakes from sleep on a keypress.

### `0x19120`: hardwired reset key combination

Before the normal scan, three specific intersections are probed directly, and one of
them executes the PIC18 `RESET` instruction. `BTFSS` skips the `RESET` when the bit is set,
so the reset fires when `PORTB,6` reads **low**, which in an active-low matrix means the key
is being held:

```
1911e: 83 94       BCF PORTD,2
19120: 81 ac BTFSS PORTB,6
19122: ff 00       RESET
```

That is a hardware-level recovery combination, independent of any config. The two
probes before it (`PORTE,1` with `PORTB,5`, and `PORTE,4` with `PORTB,7`) gate whether
the check runs.

### `0x1B8CE`: port initialisation

Touches TRISA through TRISG and PORTA through PORTG in one block, near the entry point
at `0x1BB38`. This is the pin direction setup, and it is where the definitive pin
assignment can be read off.

### This settles the LWJL question

**It did not, and the conclusion below is wrong. See section 17.** The half that holds is the
scanner's native code being a linear 1 to 56 index rather than `0x80 | (row << 3) | col`. That
was the right observation, and the mistake was to conclude the config must therefore be using a
different namespace, instead of asking whether the config's codes were being read correctly. They
were not. Under the corrected reading the 600's 162 entries are 54 scan codes from exactly that 1
to 56 range, in three event classes, and no translation layer needs to exist. The original text
follows.

The physical matrix on arch 14 is 14 by 4, so **56 physical key positions**, and the
scanner's native code is a linear 1 to 56 index, not `0x80 | (row << 3) | col`. The
600's LWJL section lists **108** matrix-style codes and 162 entries in total. Those
cannot both be describing the same thing, so the 600's LWJL is definitively **not** that
remote's physical key matrix. It is more likely an event-code namespace shared across
the whole arch 14 family.

By contrast the One's LWJL has 52 matrix entries over 7 rows by 8 columns, which is also
56 positions, and does plausibly correspond to real hardware. So the arch 12 and arch 14
LWJL sections genuinely differ in meaning, and there must be a translation somewhere
between the scanner's linear index and the event codes the config uses. Finding that
translation is now the concrete next step for the button mapping problem.

## 14. The container is one format across four architectures

Section 7 established the container against four samples, all of them arch 12 or arch 14. That
is enough to describe those two architectures and not enough to say anything about the format.
Adding the two publicly shared sample sets closes that gap, because a rule that survives
architectures nobody tuned it for is a rule about the format.

Corpus now used for container claims, nine samples:

| Sample | Arch | Cookie | Base | Format | Slots | Marker | Key records |
|---|---|---|---|---|---|---|---|
| One safe-mode config | 12 | `GSPM` | `0x002000` | 1.6 | 21 | `LWJL` `0x63` | 2 |
| One 3.4 `Region_2` prefix | 12 | `GSPM` | `0x002000` | 1.6 | 21 | `LWJL` `0x63` | 2 |
| One user config | 12 | `GSPM` | `0x040000` | 1.6 | 21 | `LWJL` `0x63` | 55 |
| One user config, second unit | 12 | `GSPM` | `0x040000` | 1.6 | 21 | `LWJL` `0x63` | 55 |
| 700 `Region_3` | 14 | `GSPM` | `0x020000` | 1.4 | 19 | `LWJL` `0x5B` | 0 |
| 600 user config | 14 | `GSPM` | `0x030000` | 1.4 | 19 | `LWJL` `0x5B` | 162 |
| 88x class, four configs | 8 | `TPTP` | `0x020000` | 1.5 | 20 | `WLWL` `0x5F` | 56 |
| 525 config | 9 | `AHCM` | `0x020000` | 1.4 | 19 | `CMAH` `0x5B` | 0 |

All five consistency checks pass on all nine: `end_addr` lands exactly on the end marker, the
padding before the marker is zero, the marker is the one expected for that cookie, the slot
count is one of the known lengths, and every non-null pointer lands inside the blob.

What that buys, concretely:

* The **base address derivation** now holds across five different base addresses and four
  cookies, so it is a property of the header rather than a coincidence of two models.
* The **slot count derivation** holds across four table lengths, 19 to 21.
* The `format` field is **not** an architecture identifier. Arch 9 and arch 14 both carry
  `0x1400`. Whatever it versions, it is not the architecture, and the cookie is what identifies
  that.

### The cookies come from the same table concordance already had

`libconcord/remote_info.h` carries a per architecture cookie: `BMBM` for arch 7, `TPTP` for
arch 8, `AHCM` for arch 9, `GSPM` for arch 12, 14, 16 and 17, and a two byte value for arch 2
and arch 3. Those are the container magics. Nobody appears to have connected the two, probably
because the cookie is used there only as a validity check on a config being uploaded.

Only the three verified here are in the parser. Arch 7's end marker is unknown because no arch 7
sample exists in the corpus, and guessing it would produce exactly the kind of plausible wrong
answer this project keeps having to correct.

### `WLWL` is a key table, `CMAH` is not established

`WLWL` on arch 8 is followed by a count byte of 56 and then 56 records in the same
`{u8 event_code; u16 index; u8 flags}` layout as `LWJL`. The codes are dominated by the
`0x80 | (row << 3) | col` matrix form and include the same three non-matrix codes the One has,
`0x06`, `0x07` and `0x2D`. So it is the same section under a different name.

On arch 9 the byte in the count position after `CMAH` is zero. That is consistent with an empty
table and equally consistent with `CMAH` being a plain header terminator, so nothing is claimed:
the parser records per family whether a key table starts at the marker, and arch 9 is marked as
not established.

**Correction.** An intermediate version of the parser derived that from the data instead, on the
theory that a marker equal to the cookie reversed terminates the header. That theory came from
seeing `AHCM` and `MCHA` and pattern matching too fast: the marker on arch 9 is `CMAH`, and
`AHCM` reversed is `MCHA`, which is the *end* marker. The rule was wrong even though it produced
the right answer for the wrong reason on the one sample that exercised it. Markers are now a
recorded per architecture fact, asserted against the data rather than computed from it.

### Arch 8 and arch 12 share a canonical key ordering, with one transposition

47 event codes appear in both the One's 55-entry table and arch 8's 56-entry table. On that
shared subset, the two architectures list them in the same order, with a single adjacent
transposition: the One has `0x06 0x8E 0x07`, arch 8 has `0x06 0x07 0x8E`. Remove `0x8E` from
both and the sequences are byte-identical.

```
One,   shared subset: 88 8B 8A 8D 8C 8F 06 8E 07 81 83 82 85 87 86 98 ...
arch 8, shared subset: 88 8B 8A 8D 8C 8F 06 07 8E 81 83 82 85 87 86 98 ...
```

Codes unique to one side are presumably the physical difference between the remotes: `0x84`
`0x89` `0x93` `0x9C` `0x9E` `0xA7` `0xAF` `0xB1` on the One, `0xA9` `0xB6` `0xB8` `0xB9` `0xBA`
`0xBB` `0xBD` `0xBE` `0xBF` on arch 8.

Why this matters more than it looks. The order is not sorted, not grouped by row in any obvious
way, and yet two architectures separated by several hardware generations agree on it. The
straightforward reading is that this is Logitech's canonical key ordering, carried forward
across models. If that holds, then establishing which physical button each code belongs to on
**one** remote transfers most of the way to the others, and that is the problem
harmony-decompiler is currently blocked on after three failed attempts. Independent support:
they report the same relationship between arch 8 and arch 9, 41 shared codes of 51, in order.

The four arch 8 configs also carry a byte-identical key table, which is worth stating because
those same four files differ from each other in 73 to 84 percent of their bytes.

### The EZHex wrapper verifies its own split

Config files are an XML header, a two byte `\r\n`, then the container. The header states
`BINARYDATASIZE`, the exact payload length, and `CHECKSUM`, an XOR of every payload byte seeded
with `0x69`. Both verify on all eight config samples, so the split point is checked rather than
sniffed, and `src/harmony/ezfile.py` now uses the declared length in preference to searching for
a magic.

`INTENDEDVERSION` carries `PROTOCOL`, `SKIN`, `FLASH` and `BOARD`. That is what a remote compares
against before accepting a config, which makes it part of the eventual write path rather than a
curiosity.

**Small correction to upstream, recorded for calibration.** harmony-decompiler's sample README
gives the 525's header as 3153 bytes plus a 2 byte separator, which totals two more than the
file holds. The XML text is 3151 bytes and the 3153 already includes the separator. The
derivation `payload = last BINARYDATASIZE bytes` avoids the question entirely, which is the
argument for deriving boundaries rather than measuring them by hand.

## 15. A config states its own architecture, and slot 0 is the only frame

Both of these came out of adding a **Harmony 700 config**, posted publicly by dmrzzz. It
matters disproportionately for one reason: the arch 14 firmware image this project disassembles is the
Harmony 700 2.8 image, and until this file arrived the architecture had exactly one config
sample, the Harmony 600 dump. The section labelling method needs two configs of the same
architecture, so that a slot pointing at the same structure in both is a section rather than a
misread. This is the second one, and it is from the same model as the firmware.

The corpus is now **thirteen container samples across four architectures**, four of each
except arch 9 which has one: arch 12 contributes two user configs from two different One units,
two copies of the safe mode config and one from the firmware package, and arch 14 contributes the
600 user config, both Harmony 700 user configs and the 700 firmware package container.

### Section slot 1 states the architecture, twice

A fixed seven byte record: the architecture number, the same number again, a `u16`, then three
zero bytes.

| Sample | slot 1 bytes | arch | known independently from |
|---|---|---|---|
| arch 8 configs, all four | `08 08 0f 0d 00 00 00` | 8 | `<PROTOCOL>8</PROTOCOL>` |
| Harmony 525 | `09 09 16 0d 00 00 00` | 9 | `<PROTOCOL>9</PROTOCOL>` |
| One safe mode config | `0c 0c 36 0c 00 00 00` | 12 | dumped from a Harmony One |
| One firmware 3.4 package | `0c 0c 36 0c 00 00 00` | 12 | the package it came out of |
| One user configs, both units | `0c 0c 3b 0d 00 00 00` | 12 | `<PROTOCOL>12</PROTOCOL>` |
| Harmony 700 user config | `0e 0e 42 0d 00 00 00` | 14 | `<PROTOCOL>14</PROTOCOL>` |
| Harmony 700 firmware 2.8 package | `0e 0e 42 0d 00 00 00` | 14 | the package it came out of |
| Harmony 600 user config | `0e 0e 49 0d 00 00 00` | 14 | `<PROTOCOL>14</PROTOCOL>` |

Every sample is a calibration case: its architecture was already known from a source that is
not this record, so the record is being checked rather than merely being self consistent. Four
distinct architecture values, thirteen agreements, no exceptions. What would falsify it is a
single config whose slot 1 byte disagreed with its own `<PROTOCOL>`.

Why it is worth having rather than a curiosity: **the cookie cannot tell arch 12 from arch 14**,
because both are `GSPM`. A config read off a remote over USB has no EZHex header to consult, so
without this record the reader would have to guess from the format version or the pointer count,
both of which are weaker signals. `src/harmony/gspm.py` now reports it, and reports it only when
the two copies agree, so a coincidence cannot be promoted to a fact.

The `u16` beside it is **not identified**. What is measured: 3126 for the One's safe mode config,
3343 arch 8, 3350 the 525, 3387 both One user configs, 3394 the 700 (both the user config and
the firmware package container), 3401 the 600. So it is not the architecture, since arch 14
shows two values. It is not the config contents, since four arch 8 configs that differ in 73 to
84 percent of their bytes carry the same value. It is not purely the model, since the One's safe
mode config and its user config differ. A generator or target firmware version fits all six
observations and is still a guess, so it is recorded as one.

The most interesting single data point is that the 700 user config and the container inside 700
firmware 2.8 carry the same 3394. Those two files have nothing to do with each other: one was
generated by Logitech's servers for a stranger's remote, the other shipped inside a firmware
package.

### There is exactly one `0xFEED` frame, and it is slot 0

**This corrects section 7 a second time.** The claim there is that every section the pointer
table points at is a `0xFEED`/`0xBEEF` frame. It is not. There is one frame per container, at
slot 0, in all thirteen samples.

The frame:

```
+0x00  u16    0xFEED       `ed fe` in a hex dump
+0x02  u16    length       from the cookie, stopping short of the terminator
+0x04  u8     00
+0x05  ...    payload      always begins A7 08 00 00 00 00 00 "Root"
+len   u16    0xBEEF
```

Two independent confirmations of the length rule. First, the terminator is where the length says
in all thirteen. Second, the frame occupies `length + 2` bytes and the **slot 1 pointer lands on
exactly that byte** in all thirteen, and the pointer table and the length field are different
parts of the file, so agreeing is not automatic.

The exclusivity is the part that needed care, because it is the part the earlier correction got
wrong. Every `ed fe` byte pair in every container was validated: read the `u16` at +2, check for
`ef be` where it points. One passes, in each sample, at slot 0. That the Harmony One's 1.6 MB
config holds 31 `ed fe` pairs and 106 `ef be` pairs is exactly what chance produces in that much
data, and none of the other 30 closes.

One exception, which is why validating beats trusting: the One's safe mode config carries a
degenerate **empty frame**, `ed fe 00 00 00 ef be`, length 0 with the terminator five bytes in.
Read length 0 as "empty". Whether the firmware's parser special cases it that way is unconfirmed;
no arch 12 or arch 14 config parser has been located in the firmware yet, and that is a question
for step 6.

**How the error happened, since that is the useful part.** The first version counted `0xFEED`
occurrences across the whole config, got 47, compared it to the roughly 25 that two random bytes
would produce, and dismissed the framing as coincidence. The correction then located the frame at
slot 0, saw that it was genuine, and generalised from one slot to all of them without checking
the other eighteen. Both mistakes are the same mistake in different clothes: a count is not a
location, and one location is not a rule. The fix is that the parser now validates frames
structurally and `tests/test_gspm.py` asserts that no second frame exists, which is the assertion
neither earlier version made.

### A lead on what slot 0 is for

The frame payload is a tree of named nodes under `Root`. The 700 config's holds 62 names, which
between them describe the installation without any further decoding: six devices by numeric id,
appearing by role as a TV, a receiver, a Blu-ray player, a VCR and an A/V switch, each with
`<Role>_Power_2` state, input selection (`TV_Input_10`, `Receiver_Input_16`, `VCR_Input_3`,
`A/V_Switch_Input_5`), and per device timing in `PowerOnDelay_<id>_65278`,
`InterDeviceDelay_<id>_65278`, `DefaultPowerOnDelay_<id>_255`. Two global entries,
`CurrentActivityState_0_6` and `CurrentLocation_1`.

The trailing number reads as the variable's range rather than its value: 2 for a power state, 10
against 16 for two different input counts, 255 for the defaults, 65278 which is `0xFEFE`. That is
consistent across every name in the section and it matches the format designer's own remark that
the pointer table addresses "data for each of the various subsystems (IR sending, state
variables, menus, action lists etc)".

It is deliberately **not** recorded as a section label. Naming a section from what its data looks
like is the thing `.claude/skills/trace-section/SKILL.md` exists to prevent: the label has to come
from the firmware routine that consumes the pointer. This is a strong candidate for "state
variables" and nothing more until that routine is found.

## 16. The Harmony 700 pair, and what a controlled sample buys

Both of dmrzzz's Harmony 700 dumps are in the corpus, so the corpus has its first **controlled
pair**: two configs of one remote, with the owner's own written account of what differs.
Everything else available is either two different remotes, where nearly everything differs, or
the four arch 8 configs, which differ from each other in 73 to 84 percent of their bytes with no
record of why.

Source, with the permission explicit in it, is
<https://github.com/trelowney/harmony-decompiler/issues/9>. The issue body of 2026-08-04 carries
the current dump; a comment 22 minutes later carries an older one recovered from the owner's
version control, with the diff of the notes file they keep beside the dumps. Both are posted
under "I have had a look at what is in it and I am happy to publish it".

**Which file is which, and this is now in question.** The comment states its attachment is the
older dump, and that file's own timestamp is 2024-10-12 against 2026-08-04 for the other, so
`harmony700-2.EZHex` was taken as the earlier of the two. Everything below is stated in that
direction, older to newer.

Section 21 contradicts it. Each config carries its own build timestamp, and they read 2021-07-30
for `harmony700.EZHex` against 2023-04-22 for `harmony700-2.EZHex`, which is the opposite order.
The discrepancy is unresolved and section 21 sets out what does and does not bear on it. Nothing
below has been rewritten, because the direction here rests on the owner's own statement, which is
better evidence about provenance than a byte is. But **every "older to newer" in this section is
provisional until that is settled**, and the direction can be read the other way throughout.

### What changed, in the owner's words

Their notes diff, abbreviated to the lines that moved. This is an activity called "Watch TV" and
one called "Watch Bluray" on a six device installation:

```diff
   * Netflix = (Receiver: InputAv1, TV: Netflix)
+  * NintendoSwitch = (Receiver: InputHdmi4, TV: InputHdmi2)
 * Standard Buttons
+  * UpArrow = Receiver: InputAv1
 * Additional Buttons
-  * Netflix (Sequence)
+  * Nintendo Switch (Sequence)
+  * Home = TV: Home
-  * Home = TV
+  * TV Vol+ = TV: VolumeUp
+  * TV Vol- = TV: VolumeDown
```

So: one new sequence, one new standard button assignment, two new additional buttons, one
respecified, one sequence dropped from the additional buttons while staying a sequence, and some
repositioning in the Bluray activity. No device added, removed or changed.

The owner's own caveat is worth carrying: "Accuracy not guaranteed, but this comes from an svn
history". The notes are a record of intent rather than a dump of the config, so they say what was
meant, and the bytes say what was emitted.

**One thing does not follow the description.** All of that was added, and yet the newer config is
**58 bytes smaller**. Whatever the generator does, config size is not a running total of what the
configuration contains.

### Establishing that it is the same remote

Four independent agreements, none of which a different remote would produce:

* The XML headers are **byte identical apart from `BINARYDATASIZE`**. Same skin 66, same flash
  `0x15:0x1C`, same board `0.0.0`, same protocol 14, same `CHECKSUM` value of 15.
* The same `version word` 3394 in section slot 1.
* **Section slot 0 is byte identical**, all 2328 bytes. That is the named state variable tree, so
  the two configs describe the same six devices with the same roles, the same input counts and the
  same delay settings. This is the decisive one: it makes them the same installation rather than
  merely the same model.
* The **key table is byte identical**, all 163 records including their `index` fields, so nothing
  was remapped to a different button.

### Where the change is

The payload shrank by 58 bytes. The layout moved by a constant either side of one section, and
only one section changed size:

| Base slots | shift, older to newer | note |
|---|---|---|
| 0 to 8 | 50 bytes earlier | so the region ahead of slot 0 lost 50 bytes |
| 8 | shrank by 8 | 3600 to 3592 bytes, the only section whose size changed |
| 9 to 17 | 58 bytes earlier | the 50 above plus slot 8's 8 bytes |

Per section, after realigning for those shifts:

| Slot | bytes | differing | reading |
|---|---|---|---|
| 0 | 2328 | 0 | the state variable tree, untouched |
| 1 | 7 | 0 | the architecture record |
| 2 | 8 | 0 | |
| 3 | 14 | 7 | |
| 4 | 1193 | 1 | one byte |
| 5 | 19 | 7 | a pointer array, all six entries +50 |
| 6 | 74011 | 938, 1.3% | |
| 7 | 53 | 21 | a pointer array, all 17 entries +50 |
| 8 | 3592 to 3600 | rewritten | diverges at +0x22 and does not realign |
| 9 | 2920 | 90% | |
| 10 | 24113 | 40% | a pointer array of 8037 entries, 14 distinct deltas |
| 11 | 17135 | 40% | a pointer array, all 5711 entries +50 |
| 12 | 28 | 16 | a pointer array, all nine entries +50 |
| 13 | 290 | 32% | |
| 14 | 215 | 19% | |
| 15 | 28 | 9 | a pointer array, all nine entries +58 |
| 16 | 1 | 0 | |
| 17 | 598324 | 89% | the bulk |

**The change is not localised, and it is worth being precise about that**, because the size table
above invites the opposite reading. Only slot 8 changed *size*. By content the config splits three
ways:

* **Untouched.** Slots 0, 1, 2 and 16, the whole header apart from `end_addr` and the pointer
  table, and the entire key table. Slot 4 differs in one byte of 1193 and slot 6 in 1.3 percent.
* **Displaced only.** The six pointer arrays, whose entries moved by exactly the layout shift.
* **Rewritten wholesale, at unchanged size.** Slot 9, 2920 bytes and 90 percent different. Slot
  17, 598324 bytes and 89 percent different. The 249 KiB region ahead of slot 0, 46 percent
  different, which no pointer in the table addresses. None of these is explained by displacement:
  read as 2, 3 or 4 byte values, almost none of their values moved by the layout shift, so this is
  different content rather than the same content at new addresses.

Slot 8 belongs to a fourth case, changing both size and content: it diverges 34 bytes in and never
resynchronises, so it was regenerated rather than patched.

That corroborates something already recorded here from the arch 8 set, where three configs
generated within about half an hour of each other differ in 73 to 84 percent of their bytes:
**Logitech's
generator does not emit minimal diffs.** A pair like this one narrows the search enormously
compared to two unrelated configs, but it does not hand over a small edit. The consequence for the
application is the one already in `docs/roadmap.md`: an editor here must make minimal diffs against
an existing config, because reproducing what Logitech's generator would have emitted is not
achievable.

### That the six arrays hold real pointers

The pair is what turns "these sections fit the shape of a pointer array" into a fact. In five of
the six arrays, **every entry moved by exactly the layout shift**, +50 or +58 according to which
side of slot 8 its target sits on. The shift is known independently, from the container's own
pointer table in the header, so this is two unrelated parts of the file agreeing. A section that
merely happened to satisfy `width + 3 * count == length` would have no reason to.

Slot 10 is the exception and it argues the same way. Its 8037 entries moved by **fourteen
different deltas**, not one, because they address the 249 KiB region ahead of slot 0 that was
rewritten rather than displaced. A table of offsets into a rebuilt region is exactly what that
looks like; a coincidence would not have produced a small set of consistent deltas either.

The pointer width is three bytes, which is a deliberate saving rather than an oddity: 24 bits
covers a config region that tops out around 1.4 MB, and at 8037 entries a fourth byte would cost
8 KiB in slot 10 alone.

### One pointer table across four architectures

Recognising the arrays made an alignment visible. Arch 9 and arch 14 carry arrays at slots 5, 7,
10, 11, 12 and 15. Arch 8 and arch 12 carry them at 5, 7, **11, 12, 13 and 16**, and those are
precisely the architectures whose slot 8 is NULL. So the table is one table with a NULL inserted
at slot 8 on arch 8 and arch 12:

| Architecture | slots | insertions | trailing NULL lands at |
|---|---|---|---|
| 9, 14 | 19 | none, the base layout | 18 |
| 8 | 20 | NULL at 8 | 19 |
| 12 | 21 | NULL at 8, real section at 18 | 20 |

Three fingerprints agree, which is what makes this an alignment rather than arithmetic that
happens to fit:

* the six pointer array slots all map to base slots 5, 7, 10, 11, 12, 15;
* the single **one byte** section maps to base slot 16 on all four architectures;
* base slot 18 is NULL on all four.

Each holds in every sample: two arch 14 configs, two arch 12, four arch 8, one arch 9.

**This is the most useful consequence in this section.** The format work is done on arch 14
because there every config byte read passes through the single SPI primitive at `0x1B9AC`, while
the remote most people own is the arch 12 Harmony One. Section labels now transfer between them
through `gspm.base_slot` and `gspm.arch_slot` rather than through a second investigation. It also
means the arch 9 sample, which was kept only as a control, is a full participant: it uses the base
layout unmodified.

What would falsify it: an architecture whose pointer arrays or one byte section land somewhere the
mapping does not predict. `gspm.base_slot` raises for an architecture whose insertions have not
been established rather than assuming none, so arch 7, 15 and the rest are refusals and not silent
wrong answers.

### Three negatives, which are the most solid thing here

A described change plus an unchanged structure rules things out, and ruling out is worth as much
as a label.

**The key table does not hold button assignments.** It is byte identical between the two dumps,
all 163 records including their middle field, while the described change reassigns `UpArrow`, adds
`TV Vol+` and `TV Vol-`, and respecifies `Home`. Whatever `LWJL` is, it is not the button to action
map. That sharpens the caution in section 8 and it matters for the button mapping problem
harmony-decompiler is blocked on: the table is a property of the remote, not of the configuration
loaded onto it.

**Nothing indexed by the six pointer arrays is per button or per sequence.** Every one of the six
counts is identical across the pair: 6, 17, 8037, 5711, 9 and 9. Adding a sequence and three
button assignments changed none of them. Whatever those thousands of entries address, it is not
allocated per assignment.

**No device data moved.** Slot 0, the named state variable tree, is byte identical across all 2328
bytes, consistent with a change that touched no device. This is the pair's calibration case for
slot 0: a change that should not affect it did not.

### A lead on slot 8, and why it stays a lead

Slot 8 is the only section that changed size, and the change was button assignments plus one
sequence, so per assignment records are the obvious candidate. Its first bytes support it: a
leading `0x0B`, then three byte groups whose third byte is `0x7E` or `0x7F`:

```
0b  12 00 7e  02 00 7f  03 00 7f  04 00 7f  05 00 7f  0e 00 7e  32 01 7f  ...
```

Which is the shape of an opcode with a 16 bit operand, and harmony-decompiler reports a config
interpreter in the 525's firmware behaving as an accumulator machine, so action lists as bytecode
is their reading too.

It stays a lead, and deliberately so. Slots 9 and 17 were rewritten just as thoroughly without
changing size, so slot 8 is singled out by its size change alone, which is weak evidence on its
own. Naming a section from what its bytes look like is the failure mode
`.claude/skills/trace-section/SKILL.md` exists to prevent. The label has to come from the firmware
routine that reads the pointer, and on arch 14 those routines are enumerable through the SPI
primitive at `0x1B9AC`. Slot 8 is now the first one to go after.

### What the pair also settled

The `version word` in section slot 1 did not move: both dumps read 3394, across roughly two years
and a configuration change. So it is not a timestamp and not a revision counter for the config
itself.

## 17. Key codes carry an event type, and slot 10 holds the action lists

Both of these started as claims in harmony-decompiler discussions 5 and 6, which by decision 7 of
`docs/roadmap.md` are hypotheses rather than facts to adopt. Both were tested against our own
corpus with our own parser, and both survive. Neither is quoted here as evidence: the numbers
below are ours, and where upstream reports a figure it is noted as an independent second opinion
rather than as the source.

### An event code is an event type plus a scan code

**This corrects a claim this project published.** `docs/config-format.md` and section 8 above
stated that key codes encode `0x80 | (row << 3) | col`, with bit 7 marking a matrix key. They do
not. The top two bits are the event type and the rest is the keypad scanner's own scan code:

| Bits 7,6 | Event |
|---|---|
| `00` | not a keypad event |
| `01` | release |
| `10` | press |
| `11` | repeat |

Three agreements, and each comes from somewhere different:

**The count closes exactly.** Decomposed this way, the Harmony 600's 162 records are scan codes 1
to 54, contiguous, appearing once in each of release, press and repeat. 54 times 3 is 162 with
nothing left over. The Harmony 700's 163 are the same 162 plus one code with no event bits at all.
Under the old reading the same table was 108 "matrix" codes against 54 "non-matrix" ones, and 108
matrix codes cannot describe a 56 position keypad, which is why section 8 above ends by warning
that the table could not be the remote's keypad. It is the remote's keypad. The warning was a
symptom of the wrong split.

**The scan codes fit the scanner's own range, and that comes from the firmware rather than from
the config.** Section 13 records that the arch 14 keypad scanner at `0x190A6` returns a linear
index from 1 to 56. The table uses 1 to 54 of exactly that range. The old reading produced rows 0
to 6 and 8 to 14, which is not a range at all, and required a translation layer between the
scanner and the config that nobody could find. No such layer needs to exist.

**The three event classes carry an identical scan code set**, all 54 shared, in both arch 14
samples. If bit 7 were part of the address then a code and that code with bit 7 set would be
different keys, and there would be no reason for the sets to coincide, let alone coincide exactly
three times over.

Arch 12 and arch 8 come out differently and cleanly: **presses only**, 52 on the One and 53 on the
arch 8 remote, with no release or repeat entries, plus the three codes with no event bits (`0x06`,
`0x07`, `0x2D`) that both share. The One's safe mode config is press of scan 47 and scan 46, which
is the two key recovery combination. So the difference between the architectures is real rather
than an artefact: arch 14 enumerates every event type per key and the older architectures record
only presses.

The earlier finding that arch 8 and arch 12 **share a canonical ordering** survives unchanged: 47
`(event, scan)` pairs in common, in identical order once press of scan 14 is dropped. Worth stating
explicitly, since that finding was originally derived under the wrong reading and could easily have
been an artefact of it. It is not.

Upstream's own words for this, from discussion 6, are "Bit 7 was never part of the matrix address",
with the same three event flags. They reached it by reading their architecture's firmware at
`0x07160`; we reached it by counting our own tables. Two routes, one answer.

**What this changes in the code.** `KeyRecord.is_matrix`, `.row` and `.col` are gone from
`src/harmony/gspm.py`, replaced by `.event_type`, `.event_name`, `.scan_code` and `.is_keypad`.
They were removed rather than deprecated: a wrong reading left available is a wrong reading that
gets used.

**A lead that died within the hour, recorded because the way it died is the point.** Upstream
describes the arch 9 scanner as a binary search for a column over 8 columns using a single sense
line, driven by exactly 14 masks:
`0x0F 0x03 0x01 0x02 0x0C 0x04 0x08 0xF0 0x30 0x10 0x20 0xC0 0x40 0x80`. Fourteen is what a binary
search over two nibbles costs, seven per nibble. Since section 13 describes the arch 14 keypad as
14 rows by 4 columns, the obvious suspicion was that "14 rows" was a misreading of a 14 entry mask
table and that the real geometry was 7 by 8, matching their `(row << 3) + column`.

It is not. Arch 14 computes the index arithmetically and the code says so plainly:

```
19282: 01 07       DECF 0xd01,F     ; row, one based
19288: 04 0d       MULLW 0x04       ; times four
1928a: f3 50       MOVF PRODL,W
1928e: 00 25       ADDWF 0xd00,W    ; plus column, 1 to 4
```

`MULLW 0x04` settles it: `(row - 1) * 4 + column`, 14 rows of 4, 1 to 56. The two architectures
have genuinely different keypad hardware and genuinely different scanners, which is unsurprising
given one has a touchscreen and the other does not.

The lesson is the one this project's own doctrine already states and I still walked past: the
answer was in this document, 500 lines above, in a disassembly listing that had been sitting there
since the first Ghidra pass. Reaching for an upstream analogy before re-reading our own code is
exactly the failure decision 7 of `docs/roadmap.md` exists to prevent. The scan codes are
unaffected either way, since those are the scanner's linear index in both readings.

### Base slot 10 is the action list address table

Each entry addresses an action list, and a list is a `u8` count followed by that many three byte
instructions, each a `u16` operand and an opcode byte.

The reading is carried by a closure, not by the shape fitting. A list occupies `1 + 3 * count`
bytes, and the lists are packed back to back, so consecutive table entries should sit exactly that
far apart. The addresses come from the pointer table and the counts come from the lists themselves,
which are unrelated parts of the file:

| Sample | lists | instructions | consecutive pairs packed |
|---|---|---|---|
| 700 user config, arch 14 | 8037 | 19651 | 8032 of 8036 |
| 600 user config, arch 14 | 4955 | 12194 | 4950 of 4954 |
| One user config, arch 12 | 4277 | 11640 | 4272 of 4276 |
| 88x class config, arch 8 | 1318 | 3311 | 1313 of 1317 |
| 525 config, arch 9 | 487 | 1043 | 482 of 486 |

**Exactly four exceptions per config, in every one of them.** That regularity is itself the
explanation: the lists are packed into five contiguous runs, so four times the next list is
somewhere else. Each of those four gaps is tens of kilobytes, never an off by one. On the 700 the
runs are four in the region ahead of slot 0 and one inside base slot 9, which accounts precisely
for the 7656 and 381 split of where the table's entries point.

The 525 numbers, 487 lists and 482 of 486 packed, are the same numbers harmony-decompiler reports
for that file. Reproducing them through our own slot numbering also cross checks the alignment in
section 16: their "section 10" and our base slot 10 are the same section.

**Opcode meanings are deliberately not adopted.** Upstream publishes a partial table (`0x7F` run
an action list, `0x7E` select a record, `0x7D` send a command, `0x7C` queue a flag, `0x7A` down to
`0x77` as an accumulator machine's load, add, multiply and divide) derived from the arch 9
firmware. Our data says that table does not transfer as it stands, and that is worth knowing
before anyone leans on it: arch 14's third most common opcode is `0x6C`, 2832 occurrences in the
700, and `0x6C` does not appear in the 525 sample at all. The inventories do overlap, so this is
one instruction set with per architecture extensions rather than two encodings, but the meanings
have to be read out of the arch 14 firmware. That is now the most valuable thing to look for while
in there.

## 18. The register map was the wrong one, and there is a shadow register set

This section is a correction, and the correction was pre-announced: the intro has listed the
SFR map as the highest-risk item in this document since it was written, because the table in
`src/harmony/pic18/isa.py` was the generic high-end PIC18 layout rather than the map of the
part actually in these remotes. Going into the USB work meant needing the USB registers, and
that is the point at which the risk was checked instead of restated.

**Eight of 93 names were wrong.** The PIC18F67J50 and PIC18F87J50 move the whole capture,
compare and analogue block relative to a classic part such as the PIC18F4550:

| Address | Was named | Actually is |
|---|---|---|
| `0xFBA` | CCP2CON | ECCP2AS |
| `0xFBB` | CCPR2L | CCP1CON |
| `0xFBC` | CCPR2H | CCPR1L |
| `0xFBD` | CCP1CON | CCPR1H |
| `0xFBE` | CCPR1L | ECCP1DEL |
| `0xFBF` | CCPR1H | ECCP1AS |
| `0xFC0` | ADCON2 | WDTCON |
| `0xFD1` | WDTCON | CM2CON |

Capture and compare module 2 is at `0xFB6` to `0xFBA` on this family, so the old table's
`CCP2CON` and `CCPR2L` names were pointing at module 1's registers, and its `CCP1CON` was
pointing at a data register.

**The USB block was worse than wrong, it was absent.** On this family the USB registers sit
at `0xF4C` to `0xF65`, where the generic map puts the parallel master port and the capture
and compare registers. So `UCON` is `0xF65`, not the `0xF6D` of the classic parts, and any
attempt to read the USB driver with the old table would have labelled twenty six USB
registers as something else entirely and produced a listing that read perfectly.

Nothing published had depended on the eight wrong names, which was luck rather than process:
the only SFR names quoted in this document were port, interrupt and serial port registers,
which the two maps agree on. The listings in section 13 now say `SSP1BUF` where they said
`SSPBUF`, at the same address `0xFC9`. That is a naming change and not a correction: the part
has two synchronous serial ports, so they are numbered, and the config flash hangs off port
one.

Provenance for the new table is the gputils 1.5.2 register maps `p18f67j50.inc` and
`p18f87j50.inc`, merged, which is checkable against the register file summary in either
datasheet. Addresses and register names are hardware facts.

### The 80-pin part adds exactly six registers

Merging the two maps is safe because they differ in six entries, all of them the extra port
on the larger package: `PORTH`, `PORTJ`, `LATH`, `LATJ`, `TRISH`, `TRISJ`. A useful side
effect for reading the arch 12 image: those six names resolving anywhere in an arch 14 image
would mean the address was not an SFR access at all.

### ADSHR: ten addresses carry two registers

The more interesting half. `WDTCON` bit 4 is `ADSHR`, and setting it swaps a second register
in at ten shared addresses. A disassembly that ignores the bit reports the wrong register
there, with no sign that anything is wrong.

The firmware does not merely use the mechanism, it demonstrates it. Port initialisation in
the 700 2.8 image writes the same two addresses twice, once on each side of the bit:

```
1b8bc: c2 6a       CLRF ADCON0
1b8be: 86 0e       MOVLW 0x86
1b8c0: c1 6e       MOVWF ADCON1        ; converter settings
1b8c2: c0 88       BSF WDTCON,4        ; ADSHR = 1
1b8c4: f8 0e       MOVLW 0xf8
1b8c6: c1 6e       MOVWF ANCON0        ; same address as ADCON1
1b8c8: c2 68       SETF ANCON1         ; same address as ADCON0
1b8ca: c0 8e       BSF WDTCON,7        ; REGSLP, unrelated
1b8cc: c0 98       BCF WDTCON,4        ; ADSHR = 0
```

Read without `ADSHR`, this block writes `ADCON1` twice with different values two
instructions apart and contradicts itself. Read with it, the shadow values are exactly what
`ANCON0` and `ANCON1` are set to when every pin is configured digital, `0xF8` and `0xFF`,
while `ADCON0` and `ADCON1` get plausible converter settings. That closure confirms both the
mechanism and those two register identities from the image alone.

The ten shared addresses, primary name first: `0xFC1` ADCON1 / **ANCON0**, `0xFC2` ADCON0 /
**ANCON1**, `0xFCB` PR2 / MEMCON, `0xFCC` TMR2 / PADCFG1, `0xFCD` T1CON / ODCON3, `0xFCE`
TMR1L / ODCON2, `0xFCF` TMR1H / ODCON1, `0xFD1` CM2CON / CM2CON1, `0xFD2` CM1CON / CM1CON1,
`0xFD3` OSCCON / REFOCON. Only the two in bold are confirmed from an image; the rest are the
remaining alias pairs in the same register map and are unexercised by anything read so far.

`MEMCON` is the external memory bus controller, which exists only on the 80-pin part, and
the arch 12 remote is the one whose config is memory-mapped. That makes `0xFCB` under
`ADSHR` a place worth watching in the One image. It is not usable as proof of the part
number, because the same address is `PR2` in the primary view and Timer 2 is a far more
ordinary thing for this firmware to touch.

The disassembler now tracks `ADSHR` the way it tracks `BSR`, with one difference recorded in
the code: `BSR` is invalidated at every branch, because a linear scan cannot follow it,
while `ADSHR` is an ordinary register bit that survives control flow. It is assumed clear at
an arbitrary entry point, which is what it is after reset, and every window in the image so
far is a few instructions long and closes with a matching `BCF`.

Three other sites set and clear the bit with **nothing in between**: `0xF93C`, `0xFB2A` and
one at `0x1B896` that only clears it. A set immediately followed by a clear cannot be
selecting a register, so something else is going on, plausibly an erratum workaround, since
the surrounding code at `0xF93C` is an analogue channel select. Recorded as unexplained
rather than explained away.

### What this cost and what it bought

Cost: nothing published, one afternoon. Bought: `tests/test_isa.py` now fails if the table
regresses towards the generic map, checking the USB block, the moved capture and compare
block, the absence of `ADCON2` on a part that has `WDTCON` at `0xFC0`, and the six 80-pin
extras. `tests/test_disasm.py` pins the `ADSHR` window above, byte for byte, as a listing
whose only coherent reading needs the bit.

Also fixed while in there: `trace.report` crashed on any address that had hits, because it
formatted a namedtuple with `%s`. So `pic18_trace.py`, described in the project brief as the
highest-value tool here, could only report addresses with no accesses at all.

## 19. The USB command layer, and a switch that lies about its case values

The protocol itself lives in `docs/usb-protocol.md`, which is the spec other tools consume.
This section is the reasoning: how it was found, and the two places it could have been read
wrongly.

### Route in

The USB registers on this family are at `0xF4C` to `0xF65`, which nothing knew until section
18. Tracing them split the driver into two clusters immediately: `0x16E00` to `0x17300` writes
`UCFG`, `UEP1`, `UEP2` and sets `USBEN`, so initialisation and attach, and `0x1AD80` to
`0x1AF00` reads `UIR` eight times with a bit test after each, so the interrupt service.

Neither leads to the protocol, because the report buffers live in the buffer descriptor table
and are only ever reached through FSR, which `pic18_trace.py` cannot see. What worked was
going at the accessors: the buffer descriptor registers **are** ordinary banked addresses, so
tracing `0x410` to `0x413` found the four instructions that hand endpoint 2 OUT to the
hardware, and reading the literals off them gave the buffer address, `0x0428`. Then
`pic18_xref.py`, written for this, walked callers from the accessor that returns that address
up to the command entry point at `0x0BD0A`.

That tool did not exist before this section. `pic18_trace.py` answers "what touches this
variable"; there was no way to ask "what calls this routine", which is the question that
connects a generated helper to the logic that uses it.

### The switch that lies

The command table is a chain of `XORLW` comparisons, which is how this compiler emits a switch
on a processor with no compare-against-literal instruction. The literals are **not** the case
values. Each one is the XOR of the previous case with the next, so the case value is the
running XOR of every literal so far:

```
0bdcc: MOVF  0xd00,W
0bdce: XORLW 0x05    ; case 0x05
0bdd0: BNZ   0x0bdd4
0bdd2: BRA   0x0c500
0bdd4: XORLW 0xb5    ; 0x05 ^ 0xb5 = 0xb0, so case 0xb0, not case 0xb5
0bdd6: BNZ   0x0bdda
0bdd8: BRA   0x0c4ce
```

Read as case values, the literals give `0x05, 0xB5, 0x10, 0x70, 0xA0, 0x20, 0x60, 0x20`.
Read correctly, they give `0x05, 0xB0, 0xA0, 0xD0, 0x70, 0x50, 0x30, 0x10`, which are seven
known command bytes plus one internal case. The wrong reading contains a duplicate, `0x20`
twice, which is the tell: a switch cannot have two identical cases. That is the only warning
the wrong reading gives, and it would be easy to miss.

So the chain is decoded programmatically in `harmony/pic18/chains.py` rather than by hand,
for the same reason there is one opcode table. The remaining `MISC` sub-command chains will go
through it too.

### What closes the reading

Three things, none of which the derivation was aimed at.

**The length nibble ends exactly at the report size.** Nibbles 0 to 7 mean 0 to 7 payload
bytes, and 8, 9 and `0xA` mean 15, 31 and 63. Those are 2^4-1, 2^5-1 and 2^6-1, and 63 payload
bytes plus the one command byte is 64, which is the report size the USB descriptors declare in
section 1 of the protocol document. Two independent parts of the firmware agreeing on 64.

**The state numbers are identical across both architectures while the state variable is
not.** Every command handler opens by assigning a state and then just parses its arguments,
leaving the work to the main loop. WRITE_FLASH is 2, READ_FLASH 4, START_IRCAP 5,
ERASE_FLASH 8, WRITE_MISC 9, READ_MISC 10, GET_VERSION 1, in the 700, the 600 and the One
alike. The variable holding it is at `0xEC9`, `0x1C1` and `0x284` respectively. Same protocol
implementation compiled for three different memory maps, rather than three implementations
that happen to agree.

**Endpoint 1 OUT is absent three times over.** The endpoint descriptors declare IN on
endpoint 1 and OUT on endpoint 2. `UEP1 = 0x1A` has `EPOUTEN` clear. And the buffer descriptor
for endpoint 1 OUT, at `0x408`, has no direct access anywhere in the image, while its three
neighbours at `0x40C`, `0x410` and `0x400` have between them dozens. Indirect access through
FSR would be invisible, so that third point is weaker than the other two on its own; taken
with them it is confirmation. Three independent statements of the same asymmetry, which
matters because a host that assumes endpoint 1 in both directions will not talk to the remote
at all.

### The state gate, and why it is a safety property

The dispatch is itself gated on the state, so the table above is the **idle** table. In state
2 a different two entry chain runs, handling `0x40` and `0xF0`, and `0x40` is
WRITE_FLASH_DATA. WRITE_FLASH sets state 2 as its first instruction.

So the firmware accepts flash data only after it has agreed to a write. That is worth stating
plainly because the write rails in `docs/roadmap.md` are host side, and it is useful to know
which of them the device also enforces. This one it does. It does not follow that any other
rail is enforced, and nothing here has been tested against hardware.

### A prediction, then a measurement

The transport section of `docs/usb-protocol.md` said, before anything was checked, that the
Harmony 600 should report `bcdDevice 0x1071`. The reasoning was two images, `0x1054` on a
remote known to be skin 54 and `0x1066` on one known to be skin 66, so the low byte read as
BCD is the skin, so the 600 at skin 71 should say `0x1071`. Written down as a prediction
because the 600's own dump is truncated before its descriptor block and could not settle it.

The remote was then plugged in and enumerated. `bcdDevice 4209`, which is `0x1071`.

Everything else agreed too: product `0xC122`, shared with the 700 as claimed, one HID
interface with two endpoints, 64 byte input and output reports, a 1 ms interval, full speed,
`bMaxPacketSize0 8`, and the string `Harmony Remote 0-0.2.0` in the same shape as the other
two with this remote's firmware version in it.

The most useful part was not the prediction. **The 33 byte HID report descriptor came back
byte for byte identical to the 700 image's, `81 06` included**, where the arch 12 image has
`81 02`. That one flag difference was recorded earlier as a curiosity and a fingerprint; it is
now known to track the architecture rather than the model or the firmware version, because a
third arch 14 device with a wildly different firmware version, 0.2 against 2.8, sides with the
other arch 14 image. It also means the 700, which is not on the bench, is a sound reading
proxy for the 600 at least this far.

The endpoint descriptors needed a second tool, because `ioreg` does not report them. pyusb
does, still without opening the device: libusb caches a device's descriptors when it
enumerates. **IN on endpoint 1, OUT on endpoint 2, 64 bytes, 1 ms, measured**, plus
`bmAttributes 0xC0` and 100 mA off the configuration descriptor. Field for field the image's
`07 05 81 03 40 00 01` and `07 05 02 03 40 00 01`. The asymmetry was the one transport detail
a host implementation is most likely to get wrong, and it is no longer taken on the word of a
remote nobody here owns.

Recorded as hardware measurement in an otherwise offline document, and pinned in
`tests/test_usbdesc.py` so the images and the measurements cannot drift apart silently.

Two lessons came out of the method rather than the result, and both are now in the
`probe-remote` skill so they are not rediscovered. `system_profiler SPUSBDataType` returns
nothing at all on this machine while exiting 0, which produced a confident false negative: a
watcher polling it reported no remote for six minutes while the remote was plugged in. And the
useful measurements are all available without opening the device, which is what makes them
safe to take at all while the project is read only.

### READ_FLASH, and a lead that survived

The previous version of this section recorded the READ_FLASH argument layout as an unconfirmed
lead: bytes 1 to 3 a 24-bit address and bytes 4 and 5 a 16-bit count, with the top address byte
doubling as a region selector. Following the switch confirmed it, and the confirmation is the
kind worth preferring, because the firmware demonstrates the meaning rather than being
consistent with it.

The three address bytes are copied into `TBLPTRL`, `TBLPTRH` and `TBLPTRU`. That fixes two
things: the bytes are an address, and the wire order is most significant first.

**Correction, made one commit later.** The paragraph above originally said a third thing, that
the target is the external config flash, because the `TBLPTR` load sits between `BCF LATF,7`
and `BSF LATF,7` and `LATF` bit 7 is the flash chip select from section 13. The chip select
bracket is real. Attributing it to READ_FLASH was not checked, and it does not survive
checking: the routine it lives in, `0x13E90`, has one caller, behind a flag test, and its other
branch calls `0x1B50A`, which sets `EECON1` to `FREE | WREN`. Those are the internal flash
erase enable and write enable bits. A routine whose two branches are a read and an erase is not
a read path, so `0x13E90` is more likely the erase or write machinery, which on arch 14 has to
prepare internal flash because the config is copied there to run.

The same correction takes the response chunking with it. A 16-bit remaining count is compared
against `0x3F` and data moves in 63 byte pieces, on the same variable pair READ_FLASH parses
its last two bytes into, so those bytes being a count is a strong inference. But which command
reaches that code was never established, and calling it READ_FLASH's response was the same
mistake twice in one commit.

What the mistake was, precisely: **following variables instead of following control flow.**
The argument variables are shared between commands, so finding code that uses them proves what
the variables are and nothing about which command is running. The request side is safe because
the parser is reached from the dispatch table, so its ownership is known.

### Doing it the right way, immediately afterwards

Starting from the state machine instead found it. State 4 is not compared anywhere with the
`SUBWF` form most of the machine uses, so it took a second look: it is a case in an `XORLW`
chain at `0x0D388`. That chain's seven cases are 2, 4, 5, 6, `0x0B`, `0x20` and `0x35`, which
are plausible small state values, and that plausibility check is the whole reason to trust this
decode when the 32 case result elsewhere in the same firmware is not trusted.

State 4 goes to `0x0D3A8`, and the body is READ_FLASH's per chunk step. It ORs the two count
bytes together to test for zero, clears the state variable and returns when they reach it, and
otherwise subtracts the chunk size from them as a 16-bit quantity. So **bytes 4 and 5 of the
request are a 16-bit count**, established from the dispatch this time rather than from a shared
variable, and the command completes by returning the state machine to idle.

The chunk size comes out of `0xED3`, which is the same variable READ_MISC parses its item
selector into. So the sharing that caused the retraction is not hypothetical, it is confirmed in
the very next routine.

### And then the state machine turned out to be one table

Deriving the state dispatch properly settled the rest of it, and revealed that a claim two
paragraphs up was made too early. The main loop's dispatch is **one `XORLW` chain of 70 cases**
from `0x0C720` to `0x0C8FE`, values `0x01` to `0xD6`, all distinct, reaching 31 bodies. States 2
and `0x0B` are special cased with ordinary comparisons just before it.

Asked for that chain earlier, the decoder returned 32 cases and I wrote that up as the tool
over-running into unrelated code and declared the result untrustworthy. **It was the default
`limit` of 32.** The chain is real and continuous, the values are coherent, and the honest
version is that I mistook my own truncation for a defect in the analysis. The docstring in
`chains.py` now says so, along with the second trap the same episode exposed: a case value
depends on where the walk starts, so beginning one comparison too late shifts every value and
both readings can look plausible.

With the table in hand:

* every command state has an executor, and `0x0C982` is READ_FLASH's
* **the 63 byte chunking is READ_FLASH's after all.** `0x0C9B2` is reached from `0x0C988`, two
  instructions after the state 4 body. So that attribution is restored, this time by control
  flow from the dispatch rather than by finding code touching the same variables
* state 4 also has a **second** dispatch site, the seven case chain at `0x0D388`, which sends it
  to `0x0D3A8`. Both are real. That `0x0C982` starts a chunk and `0x0D3A8` finishes one is what
  the two bodies suggest, and it is inference

### Live RAM over USB, and a number worth not adopting

READ_MISC's executor is state 10 at `0x0CB92`. It replies `0xC2`, echoes the selector, then the
data, and dispatches on the selector to **exactly four** bodies: `0x01`, `0x06`, `0x07` and
`0x0C`.

`0xC2` is itself a small finding: responses reuse the request encoding, a code in the high nibble
and a payload length in the low one, so `0xC2` means two payload bytes, the selector and one data
byte. WRITE_MISC replies `0xF0` then `0xA0`, a bare acknowledgement naming what it acknowledges.

Selector `0x07`:

```
0cbf4: ce ce e9 ff MOVFF 0xece,FSR0L
0cbf8: cf ce ea ff MOVFF 0xecf,FSR0H
0cbfc: ef cf 64 fd MOVFF INDF0,0xd64
```

The 16-bit parameter becomes `FSR0` and the byte at that data address comes back. **Live RAM of a
running remote is readable over USB.** That is the capability the roadmap wants in place of the
deferred emulator, and it makes the button mapping experiment reachable: poll the keypad
scanner's index variable while pressing every key.

**And it is `0x07`, not the `0x06` libconcord's header calls `MISC_RAM`.** On arch 14, `0x06` is
a different accessor, going through `0x1AB8A`. Whether the upstream number is right for the
architecture it was written against is not established here. This is the clearest return the
project's "derive rather than adopt" rule has paid: `0x06` taken on faith would have read the
wrong thing and still returned a plausible byte, which is the failure mode that does not
announce itself.

### The rest of the layouts, and no event injection

WRITE_MISC's selector chain turned out to be at parse time, `0x0C3AA`, which is why the executor
looked empty: it only acknowledges. **Nine selectors**, `0x01`, `0x02`, `0x05` to `0x0B`, and
three of them close open questions.

`0x07` **writes** an arbitrary data address, exactly mirroring the read:
`MOVFF 0xd5e,FSR0L`, `MOVFF 0xd5f,FSR0H`, `MOVFF 0xd61,INDF0`. Volatile, so it cannot brick a
remote, but it is a write to a live device and it is now in the safety rails in
`docs/roadmap.md` and `CLAUDE.md` rather than in the toolkit.

`0x09` sets the packet-handled flag and branches out, doing nothing. `0x03` is not in the chain
at all. libconcord names those `MISC_QUEUE_EVENT` and `MISC_QUEUE_ACTION`, so on that naming
**there is no event injection on arch 14**: driving the remote from the host is not available and
the button mapping experiment stays a human at the keypad, which is what the roadmap assumed.
The caveat is the same one this whole section keeps earning: the names are upstream's, and
upstream's `MISC_RAM 0x06` was wrong here. What the image establishes is that `0x09` is a no-op
and `0x03` is unhandled.

The remaining request layouts came out of one derivation, each parser bounded by the next
parser's entry address:

| Command | Bytes | Layout |
|---|---|---|
| `0x30` WRITE_FLASH | 5 | 24-bit address, 16-bit count, **identical to READ_FLASH** |
| `0x70` START_IRCAP | 0 | no arguments |
| `0xA0` WRITE_MISC | 5 | selector, 16-bit address, 16-bit value |
| `0xD0` ERASE_FLASH | 3 | 24-bit address, **no count** |

The first version of that scan had no bound and ran each handler into the next, reporting eight
argument bytes for READ_FLASH where five had already been derived by hand. The five were right.
Catching it took comparing a scan against a hand reading of the same code, which is the argument
for doing one of each rather than trusting either alone.

Two of those rows have consequences beyond the protocol. WRITE_FLASH and READ_FLASH share their
encoding and their validator, so region rules apply to writes as well as reads. And ERASE_FLASH
takes no count, so an erase cannot be scoped by the caller and the only available bound is
refusing the address.

63 matching the largest payload the length nibble can describe survives as an agreement between
two parts of the firmware. What does not survive is calling it the fourth confirmation of the
64 byte report, since the third and fourth were the same observation counted twice.

Byte 1 is also validated, and that is where the regions turned out to live. Below `0x20` is an
ordinary flash address. `0xFE` and `0xFF` select something else, with the low bit kept as a
sub-selector and the remaining 16 bits bounded to `0xFFC0`, exactly 64 short of the end of a
64 KiB window. Anything else is refused.

**What that does not settle**, and the distinction matters because `docs/roadmap.md` asks the
question in terms of four named regions: one sub-selector bit gives two regions, not four, and
the routine those reads go to has not been read. So the shape of the region mechanism is
established and the mapping onto `MCU_FLASH`, `MCU_EEPROM`, `MCU_ID` and `EXT_FLASH` is not.
Either not all four are reachable on arch 14, or a region is selected some other way as well.

### The config validator, and three searches that failed first

Roadmap step 3 asks for the boot-time config validator to be **located**, not derived, because
the trailer checksum lives there and is wanted in step 6. It is found, in both images:

| | cookie check | end marker check |
|---|---|---|
| Harmony 700 2.8 | `0x16492` | `0x1652C` |
| Harmony One 3.4 | `0x28DAC` | `0x28E18` |

```
16492: 47 0e       MOVLW 0x47        ; 'G'
16496: 00 19       XORWF 0xd00,W
16498: 08 e1       BNZ 0x164aa       ; bail out on the first mismatch
1649a: 53 0e       MOVLW 0x53        ; 'S'
164a0: 50 0e       MOVLW 0x50        ; 'P'
164a6: 4d 0e       MOVLW 0x4d        ; 'M'
164ac: 07 d1       BRA 0x166bc       ; rejected
```

Worth recording how it was found, because three earlier searches came back empty and each empty
result was itself a fact:

1. **The markers are not in either image as text.** `GSPM`, `PTYY` and `WLWL` are all absent as
   ASCII. So the obvious search finds nothing, and the compiler has instead emitted them as four
   consecutive `MOVLW` instructions, which is what the successful search looked for.
2. **There is no 16-bit accumulate anywhere near a config byte read.** The whole 700 image
   contains exactly **one** `ADDWF` followed by `ADDWFC`, and it is nowhere near the config
   accessors. So whatever the trailer checksum is, it is not a plain 16-bit sum accumulated that
   way.
3. Broadening to `XORWF` and to `ADDWF` with a separate carry propagate gave 27 and 14 candidates
   near a config read, none distinctive, and most of the `XORWF` hits are comparisons rather than
   accumulation. Not resolved, and not resolvable by pattern alone.

Neither validator address has a direct caller, so both are reached by a computed jump, which is
why walking the call graph would not have found them either.

**The checksum algorithm is not derived**, and the second search above is a useful constraint on
what it can be rather than a step towards it. Step 6 starts from the code around these two
addresses.

### What the first hardware run changed

Three commands have now been sent to the programmed Harmony 600 from our own host code, read only.
The layouts are in `docs/usb-protocol.md` section 4; what belongs here is what the run says about the
method.

**The strongest result is the one with an external answer.** 256 bytes read from flash `0x030000`
are byte-identical to the lab dump of that same unit, which concordance made months earlier. A read
that returns plausible bytes proves nothing at all, and almost every mistake available here returns
plausible bytes: a wrong length nibble, a byte-swapped address, an off-by-one chunk boundary. Only a
comparison against an independently obtained answer separates those from a correct read.

**Two things this project had inferred were wrong, and both were wrong in the same way.** An
acknowledgement's length nibble is `0` while its command byte follows it anyway, and a data chunk's
first payload byte is a sequence number rather than data. In both cases a test existed and passed,
because the test encoded the same assumption as the code. That is the failure mode of testing against
a document rather than a device, and it is worth stating plainly: the tests were not weak, they were
circular. The tell was available in advance, though, and was written down: the first version of the
chunk test used code `0xFA`, which decodes as an acknowledgement, and choosing an arbitrary value for
an unestablished field is itself the warning.

**One result could not have been faked.** `READ_MISC` selector `0x07` reading data address `0x1C1`
returns 10, and 10 is the state that `READ_MISC` itself sets. So the read observes the command
performing the read, at an address predicted from the disassembly, holding the value the disassembly
says it holds at that instant. Compare the alternative evidence for "this is a RAM read", which
would have been that the byte looked reasonable.

**And the same address through selector `0x06` returns 0.** libconcord's header calls `0x06`
`MISC_RAM`. Both selectors are serviced and they are not the same accessor, so adopting the upstream
number would have produced a read of the wrong thing that still returned a plausible byte, which is
precisely the case the project's derive-rather-than-adopt rule exists for. This is the first time
that rule has been vindicated by measurement rather than by argument.

**GET_VERSION's twelve bytes are six identified, by prediction rather than by fitting.** Comparing the
600's block against `concordance -i` gave a reading of six fields. That reading was written down as a
prediction for the Harmony One before the One was read, and the One's first six bytes came back exactly
as predicted, on a remote differing in skin, firmware, hardware version, flash part and architecture.
The flash id pair and the packed nibble shape were already characterised from the image, so two of the
six are agreements between a disassembly and a device.

Six fields remain, and what is said about them is deliberately weaker than what is said about the
first six. Field 6 is `0x0C` on both remotes, so it is a constant. Fields 7, 10 and 11 repeat field 0
on both, which is an observation and not a reading: three copies of the firmware version is a strange
thing to carry, and other components' version numbers happening to match on both units is the more
likely explanation. Fields 8 and 9 are unexplained.

**Two negative results, which are worth as much as the positives here.** A read of internal program
memory reaches the first 64 KiB only, because the top address byte is spent on the region selector and
the firmware bounds the rest to `0xFFC0`, while a PIC18 keeps its device id at `0x3FFFFE`. So the
route to `MCU_ID` that `docs/roadmap.md` wanted does not exist, and the arch 12 part number stays
inferred until another route is found. And a 63 byte read of that same region **restarted a remote**:
it left the USB bus, re-enumerated by itself, and came back healthy with its config still
byte-identical to its dump. The owner watched it restart, so it is the device resetting rather than a
host artefact. Every command in that session was a read.

That one was then reproduced on purpose, on the spare unprogrammed unit, because "sometimes it
restarts" is not a finding and a rail built on it would be superstition. Five restarts, all
self-recovering, config verified against the dump across three windows afterwards. The table is in
`docs/usb-protocol.md` section 4; what it rules out is more useful than what it shows. Not the
ordering, since the failing case fails last as readily as first. Not the chunk count, since 124 bytes
is two chunks and is fine. Not the size 63 alone, since 63 at offset zero is fine. What is left is a
final chunk of exactly one byte, with offset zero somehow exempt, and that is where it was left:
`packages/usb` caps an internal read at one chunk, which is a cap and not an explanation.

### An honest gap

The four sub-commands of the `0xE0` escape are `0x01`, `0x02`, `0x03` and `0x05`. What each
does is not established beyond the first few instructions of each path, and the `0x05` one is
the odd one, since it feeds the internal case of the main table rather than doing anything
itself. The `0x05` case is present in both arch 14 images and absent from the arch 12 one,
which tracks the architecture rather than the firmware version, the 600 being 0.2 against the
700's 2.8. No explanation is offered for that yet.

## 20. The section table was one slot short, and the padding was never padding

The container parser had an off by one from the first day it existed, in both implementations,
and every consistency check passed anyway. This section is the correction and, more usefully, why
nothing caught it.

### What the parser believed

The header was read as twelve bytes, then a table of `N` four byte pointers at `0x0C`, then three
zero bytes of padding, then the four letter marker. `N` was derived, because the header does not
state it:

```
N = (marker_offset - 3 - 0x0C) / 4
```

That gave 19 on arch 9 and 14, 20 on arch 8, 21 on arch 12, and it reproduced the measured marker
offset on all thirteen samples. The `- 3` was the padding. Nobody could say why a format that
derives everything else would need exactly three bytes of it, and `docs/config-format.md` carried
an explicit ambiguity next to the formula: a trailing NULL pointer and extra padding are
indistinguishable, so 19 pointers plus seven zero bytes reads the same as 20 pointers plus three.
The document said so rather than picking silently, and `tests/test_gspm.py` had a class named
`TestPointerTablePaddingAmbiguity` pinning the consequence.

### What it actually is

The table starts at `0x0B`, and an item is four bytes made of a spare byte and a **three** byte
little endian address:

```
0x0B  { u8 spare; u24 address }[N]
```

The addresses therefore still land on `0x0C`, `0x10`, `0x14`, which is why every address the old
parser reported was correct. What it lacked was the last item, whose address occupies the three
bytes immediately before the marker. Those are the three bytes the old formula subtracted as
padding.

So `N` is one higher on every architecture: 20 on arch 9 and 14, 21 on arch 8, 22 on arch 12.

### What closes it

Arithmetic on the whole corpus, and it closes in a way the old reading cannot match:

```
0x0B + 4 * N == marker_offset      exactly, thirteen samples, four architectures
```

No remainder. The old reading had to subtract three bytes to make its own arithmetic meet the
marker, and could not say what they were. This one meets it with nothing left over, which is the
same kind of closure as the IR carrier finding in section 12: the numbers land on each other
rather than merely near each other.

Two further checks agree. Reading an address at `0x0B + 4k` instead of `0x0C + 4k` gives values
far outside the blob, so the pointer is offset by one within the item and not the item by one
within the table. And the `spare` byte is zero in every section of every sample, which is
precisely why a four byte read of the item worked: the byte the fourth read consumed was the next
item's spare byte, always zero. The parsers now read three bytes and check the spare, because a
nonzero one would otherwise add `0x1000000` to an address and produce a plausible wrong answer
instead of an error.

### Why every check passed

Because the missing slot is NULL in all thirteen samples. A NULL section is an absent section, so
a parser that never knew about it decoded exactly the same configuration. In base slot terms the
base layout is 20 slots whose last two, base 18 and base 19, are NULL on all four architectures.
The old parser stopped after base 18.

That is the honest explanation of a bug living this long, and it is also the reason the fix
changes no decoded output: not one section address, length, action list or key record moves. The
`spare` field and one extra NULL section per container are the whole diff, plus regenerated golden
vectors that differ only by those.

### The check that would have caught it

There now is one, and it is the derivation stated as a closure rather than as a subtraction:

```
section_table_ends_at_the_marker:  0x0B + 4 * N == marker_offset
```

The old code could not have run this check, since under its own reading the table stopped three
bytes short of the marker by construction. A derivation with an unexplained constant in it was the
warning, and the ambiguity written next to it was the second warning. Both were recorded honestly
and neither was chased. The lesson is narrower than "check your arithmetic": **an unexplained
fudge factor in a derivation is a finding waiting to happen, and documenting it is not the same as
resolving it.**

`tests/test_gspm.py` class `TestPointerTableLength` and
`packages/codec/test/gspm.test.ts` hold this, in both implementations, over every sample.

## 21. Slot 3 says when the config was built, and the weekday proves it

Base slot 3 is an eleven byte record framed by a cookie pair of its own, `0xADDF` opening and
`0xEFBF` nine bytes later. It holds a timestamp. Layout is in `docs/config-format.md`.

This one is worth reading for the method rather than the fact, because the fact is small and the
method is the difference between a decode and a guess.

### The field assignment was searched for, not read

Three of the seven bytes were obvious from their ranges alone across the corpus: `0..48`, `3..58`
and `0..23` are seconds, minutes and hours, and nothing else has those bounds. That left four
bytes and no way to tell day from month from year from weekday by inspection, because several
samples happen to carry `06 06` in adjacent positions and month, weekday and day are all small
numbers.

So it was not read. The assignment was searched: every one of the 24 permutations of those four
bytes, times a zero based or one based month, times each of the seven possible weekday offsets.
For each candidate, every sample's date was constructed and its weekday computed and compared.

**Exactly one of the 336 candidates survives all twelve distinct samples.** A single sample admits
many; a handful admits several; the whole corpus admits one. The test in `tests/test_gspm.py` is
that search rather than a table of expected dates, so reordering the fields in the parser fails it
and a table would not.

### The closure

The surviving assignment says the weekday byte is `0` for a Saturday. That looks arbitrary until
you notice the year is stored as an offset from 2000, and that **1 January 2000 was a Saturday**.
The weekday byte is days since that date modulo 7:

```
(date - 2000-01-01).days % 7 == stored weekday      thirteen samples, four architectures
```

Two different fields, one anchor, no free parameters. That is the same kind of agreement as the IR
carrier finding in section 12, and it is the reason to believe a seven byte decode derived from a
corpus of thirteen. The check is in both parsers rather than only in the tests: a record whose
weekday disagrees with its date reads as absent.

### What it dates, and two things that confirm it

| Sample | arch | built at |
|---|---|---|
| One safe mode config, dumped off a remote | 12 | 2007-10-24 02:22:08 |
| One safe mode config, extracted from firmware 3.4 | 12 | 2007-10-24 02:22:08 |
| Factory config inside 700 firmware 2.8 | 14 | 2009-04-15 01:58:02 |
| Harmony 700 user config | 14 | 2021-07-30 14:30:00 |
| Harmony 700 user config, second | 14 | 2023-04-22 00:03:06 |
| Harmony One user config, programmed unit | 12 | 2023-07-07 10:46:47 |
| Harmony 600 user config | 14 | 2023-07-15 12:29:04 |
| Harmony One user config, spare unit | 12 | 2023-07-28 13:27:33 |
| Harmony 525 config | 9 | 2024-01-21 20:20:44 |
| arch 8 config a | 8 | 2024-06-19 23:36:03 |
| arch 8 configs b, c, d | 8 | 2024-06-25 17:43:46, 18:16:36, 18:41:48 |

The first two rows are the check that no single file could give: **two files obtained by completely
different routes, a dump off a remote and a region extracted from a firmware package, agree to the
second.** They are the same build, so they should, and they do.

The 2007 and 2009 dates land on when the Harmony One and the Harmony 700 shipped, which the
reading was not fitted to.

### A correction: the arch 8 cluster is about thirty minutes, not ten

This document has said since section 15 that three of the four arch 8 configs were "generated about
ten minutes apart". That figure did not come from the configs. The configs now say 17:43:46,
18:16:36 and 18:41:48 on 2024-06-25, so **33 and 25 minutes apart**, with the fourth six days
earlier on 2024-06-19.

The point being made survives and is slightly strengthened: three configs generated within an hour
of each other, by one person in one sitting, differ in 73 to 84 percent of their bytes. Logitech's
generator does not emit minimal diffs. The correction is to the number, not the conclusion.

### A discrepancy this opens, which is not resolved

Section 16 states the direction of the Harmony 700 controlled pair, older to newer, and everything
in that section is stated in that direction. It rests on the owner's own words, that the comment
attachment is the older dump, plus file timestamps of 2024-10-12 against 2026-08-04.

The records disagree. `harmony700.EZHex` reads 2021-07-30 and `harmony700-2.EZHex` reads
2023-04-22, which puts the file section 16 calls the older one **21 months later**.

What can be said:

* It is not a decoding artefact. Both dates pass the weekday closure, both are plausible, and the
  reading is the unique one across the whole corpus.
* Content volume does not settle it. Both configs hold **8037 action list entries and 19651
  instructions**, and all six pointer arrays match in entry count and section length. The only
  difference is 58 bytes of payload.
* One weak indication favours the record. The owner's notes diff, quoted in section 16, is a list
  of additions: a new sequence, a new standard button, two new additional buttons. Under the
  record's ordering the payload grows by 58 bytes from older to newer, which fits additions; under
  section 16's ordering it shrinks. Weak, because this project has already established that the
  generator reshuffles rather than appends, and 58 bytes out of 979 KB is noise either way.
* A file timestamp is evidence about a file, not about a config. A config generated in 2023 can sit
  in a directory until 2026, and a remote can be left programmed with an older config than the
  newest one its owner generated.

So there are two live possibilities and no way to choose between them here: either the pair's
direction is inverted, or the record is not written when the config is generated. Both would matter,
the first to every statement in section 16 and the second to what the timestamp actually means.
Section 16 is marked accordingly and is **not** rewritten. Asking the owner settles it in one
message and is the obvious next step, since the corpus cannot.

Until then, nothing in this project should treat the record as establishing an order between two
configs of the same remote.

## 22. The internal read window is two pages, and one of them holds the remote's identity

Measured on the spare unprogrammed Harmony One, read only. `docs/usb-protocol.md` section 4 has the
tables; this is what it corrects and what it settles.

### The correction

This project recorded, from a measurement, that a `READ_FLASH` with top address byte `0xFF` returns
internal program memory and that the same read with `0xFE` **returns nothing at all**. Both halves
are wrong, and they are wrong the other way round. The same offset through both sub-selectors, at six
offsets, returns different bytes every time, and it is `0xFE` that maps from program address zero.

The failure is worth naming because it is not an arithmetic slip. One probe was run at one offset
through one selector, it returned data, and the other selector was recorded as returning nothing on
the strength of a single attempt that produced no reply. **A null result from one probe is a fact
about that probe.** Calling it a property of the selector turned a missing measurement into a
documented finding, and the wording, "returns nothing at all", made it sound like the strongest kind
of negative rather than the weakest.

The two pages are pinned in `packages/usb/test/hardware.test.ts` now, as a difference rather than as
a value: the same offset through the two selectors must not return the same bytes.

### What the pages hold

`0xFE` is program memory from address zero, which the three PIC18 vectors confirm. Above that, three
separate offsets carry the **`48 47` image header this project already parses** in
`src/harmony/firmware.py`, so they are packaged images and not loose code, and `parse_header` reads
all three: one at `0xFE` `+0x1000`, one at `0xFF` `+0x0000`, one at `0xFF` `+0xE000`. The last opens
with a run of `BRA` instructions, so it is a jump table into a callable library.

The `0xFF` page ends in per unit data. From `0xF000` to the `0xFFC0` bound everything is erased except
a 64 byte block at `+0xF400`, four bytes at `+0xF580` and eleven bytes at `+0xF640`.

**That list was written from the three offsets predicted in advance, and it is not the whole
inventory.** Counting the non-erased runs programmatically afterwards turned up two more on the One
and several on the 600. See "Both `0xFF` pages, counted rather than looked at" in section 23.

### The closure

The 64 byte block is four 16 byte fields, and `concordance -i` prints three GUIDs for a connected
remote. The lab holds that output for this exact unit, taken months earlier by other software.

**All three appear in the block, in the same order, at `+0x00`, `+0x10` and `+0x20`**, the latter two
in mixed endian byte order, with sixteen zero bytes at `+0x30`. An address named in advance returning
three values obtained without this code, in order, is not a coincidence that needs arguing about.

The first field is `0xEE` filled, and `concordance -i` reports this unit's serial as all E's. That is
the expected answer for the never programmed spare, and it means both readers of that location agree
it is unset. A blank is a weaker match than a random GUID would be, taken alone; the other two fields
are what make it decisive.

The values are not published. A remote's serial GUIDs are personal data under this repository's own
rules, so the tests assert the block's shape and never its contents.

### The prediction, and how it did

Committed before any of it was read, in `36fa23e`:

| Predicted | Outcome |
|---|---|
| `0xE000` a library or support image | confirmed, an image header and a jump table |
| `0xF400` a per unit identifier, 64 bytes | confirmed, and exactly 64 bytes |
| `0xF640` a manufacturing identifier, 64 bytes | partly, a record is there but eleven bytes and unidentified |

Three offsets named in advance, in four kilobytes that are otherwise erased, all three holding non
code data. The eleven bytes at `+0xF640` are `09 00 20 11 02 18 e0 3c 00 67 01` and nothing here
explains them.

### What it changes downstream

`MCU_ID` stays unreachable and the reason changes. The window is 128 KiB in two pages rather than the
64 KiB this project claimed, and a PIC18 keeps its device id at `0x3FFFFE`, outside either. The
conclusion is unaffected; the justification was wrong and is corrected in place.

The useful consequence is the other direction. **The whole of the One's internal memory is now
readable**, 128 KiB at 62 bytes a read, which turns the internal half of "a complete firmware dump of
both bench remotes" from an unknown into about two thousand reads. What is up there is code that no
image in the corpus contains, because on arch 12 the application runs from external NOR.

## 23. The Harmony 600's firmware, complete, and checked by its own checksum

The 600's firmware image has been truncated for as long as this project has existed. `concordance
--dump-safemode` returns 65536 bytes of a 70336 byte image, so the last 4800 bytes were missing and
with them the entry point at `0x1A26E`, which is why every arch 14 disassembly here has used the
Harmony 700 2.8 package as a stand in for the remote actually on the bench.

It is read now, off the remote, by this project's own code. **70336 bytes, and the image's own
header checksum verifies over all of them.**

### How, in one paragraph

Arch 14 runs its application from internal flash with an exec base of `0x9000`, where arch 12 runs
from external NOR. Section 22 established that the internal read window is two 64 KiB pages rather
than one. Those two facts together put the whole image inside reach: program `0x09000` to `0x0FFFE`
through sub-selector `0xFE`, and `0x10000` to `0x1A2C0` through `0xFF`. That is 1136 reads of 62
bytes, and it takes five seconds.

### Why it is believed

Three things, and the first is the one that matters.

**The image validates itself.** `src/harmony/firmware.py` already knew the header format and its
checksum, from images decoded out of `.hfw` packages. The size field holds `(size - 8) & 0xFFFF`, so
it is ambiguous modulo 64 KiB, and the candidates are 4800, 70336 and 135872 bytes. Only 70336
verifies: stored `0x6A2B`, computed `0x6A2B`. The truncated file does not verify at any candidate.
A 16 bit checksum over 70 KiB agreeing by chance is a one in 65536 event, and the wrong-length
candidates demonstrate what a mismatch looks like.

**65534 bytes agree with a dump made by other software.** Everything the truncated file can express
was re-read off the device and compared: zero differences. Two bytes could not be compared, program
`0x0FFFE` and `0x0FFFF`, because the firmware clamps the read offset at `0xFFC0` and a 62 byte read
from there ends at `0xFFFD`. Those two are taken from the truncated dump, which is the only place
they exist, and they are inside the checksum that verifies.

**The recovered tail is plausible on its own terms.** 4698 of its 4864 bytes are not erased flash,
the last non-erased byte sits at `0x1A297`, and the image ends at `0x1A2C0`. The entry point the
header has always pointed at, `0x1A26E`, is inside the recovered region, so the code it names is
readable here for the first time.

### A defect this exposed in our own tooling

`firmware.recover_size` resolved the modulo 64 KiB ambiguity by taking the smallest candidate at
least as long as the buffer it was given. That is right for a truncated file, which is what it was
written for, and wrong for a buffer holding more than the image, which is what a live read of the
surrounding memory produces: it answered 135872 for the 600.

It now **checks** instead of guessing. A candidate that lies inside the buffer can have its checksum
verified, so the function tries that first, smallest up, and only falls back to the old rule when no
candidate can be checked. Both cases now answer 70336. A heuristic that had a closure available and
was not using it is a small thing, but it is the same shape as the mistake in section 22: an answer
produced without evidence, in a place where evidence was cheap.

### The One, swept in full, and a field that stopped being unexplained

The One's two pages were read the same way afterwards, 2114 reads, ten seconds. There is no second
copy of any of it to compare against, because on arch 12 the application runs from external NOR and
no `.hfw` package covers the internal flash. So the checksums are the whole argument, and there are
three of them:

| Image | length | version | checksum |
|---|---|---|---|
| `0xFE` `+0x1000` | 45356 | 3.4 | `0xDB1C`, verifies |
| `0xFF` `+0x0000` | 8438 | 1.6 | `0xCB09`, verifies |
| `0xFF` `+0xE000` | 634 | 3.4 | `0xD9E9`, verifies |

Three independent images each validating their own contents. Below the first sits the bootloader,
from the reset vector at zero to `+0x1000`, with no header of its own.

**A second Harmony One has since supplied the copy this lacked.** Its `0xFE` page is byte identical
over all 65534 bytes and its `0xFF` page differs in 39 bytes, all of them inside the three regions
predicted in advance: the identity block, two bytes at `+0xF582` and seven at `+0xF643`. So these
pages are firmware rather than per unit state that happens to look like code, which is a claim one
remote could not support however well its checksums verified.

**That middle row places version block field 9.** Section 4 of `docs/usb-protocol.md` had it as
unexplained, with the remark that `0x16` on the One "is the only value in the block that has no
counterpart anywhere in concordance's output". True, and the counterpart was never going to be in
concordance's output: it is in the remote. The image at `0xFF` `+0x0000` carries `0x16` in its
header's version byte, which is a distinctive value in a block otherwise full of `0x34`. The 600 has
no image at that address, only zeros, and its field 9 is `0x00`.

Field 8 behaves the same way, `0x34` on the One against `0x00` on the 600, and the One has two more
images versioned `0x34`. Neither of their addresses has been read on the 600, so the obvious test is
two reads.

### The 600's own pages, and a recovery path that was not what it said

Both of the 600's pages were swept in full afterwards, which finished the map and turned up two
things worth more than the bytes.

**Field 8 fell out of it.** The section above left field 8 open with a named test: the One has images
versioned `0x34` at `0xFE` `+0x1000` and `0xFF` `+0xE000`, the 600 reports `0x00`, so read those two
addresses on the 600. The 600 has a safe mode image at `0xFE` `+0x1000`, 24320 bytes at version
`0x02`, checksum verifying, and **nothing at `0xFF` `+0xE000`**. So field 8 is the version of the
image at `0xFF` `+0xE000`, exactly parallel to field 9 and the image at `0xFF` `+0x0000`. The
alternative is refuted rather than merely unfavoured: a field naming the safe mode image would read
`0x02` on the 600.

That closes "fields 8 and 9 of the version block", which has been on the open list since the block
was first read.

**And `-safe.bin` does not mean the same thing on the two architectures.** The safety rails in
`CLAUDE.md` name the per unit `*-safe.bin` as the first recovery path. On the One that file is flash
`0x000000` to `0x010000`, it contains the safe mode `GSPM` container at `0x002000`, and it has now
been verified against the device byte for byte. On the 600 the file with the same suffix is **the
application firmware from program `0x9000`, truncated at 64 KiB**, byte identical to the file this
project already called `600-0.2-code-base0x9000-TRUNCATED64k.bin`. It is not a safe mode image and it
never was.

The 600's actual safe mode is the 24320 byte image at internal `0xFE` `+0x1000`, which nothing had
read until now, because arch 14 keeps safe mode in internal flash where arch 12 keeps it in external
NOR. A rail that said "restore from the safe dump" would have restored the application over the
application and left the recovery path untouched. The rail is corrected and the image is in the lab.

### Both `0xFF` pages, counted rather than looked at

Writing the two memory maps needed a complete list of what is in those pages rather than a list of
the addresses somebody had thought to look at, so the non-erased runs were counted by a script.
That is the "count programmatically, never by eye" rule applied to a region this project had
already declared mapped, and it found regions nobody had named.

Every run of non-`0xFF` bytes, with runs closer together than 64 bytes merged, since the read
granularity is 62:

| Offset in the `0xFF` page | Harmony One | Harmony 600 |
|---|---|---|
| `+0x0000` | 8438, an image, version 1.6 | 41624, the tail of the application |
| `+0xE000` | 634, an image, version 3.4 | absent |
| `+0xEC00` | absent | **121 bytes, unidentified** |
| `+0xF400` | 64, the identity block | 48, the identity block with its fourth field erased |
| `+0xF580` | 4 | 4 |
| `+0xF5C0` | **2, unidentified** | absent |
| `+0xF640` | 11 | 12 |
| `+0xF6C0` | absent | **4, unidentified** |
| `+0xF735` | absent | **3, unidentified** |
| `+0xFFF8` | 6, the **configuration words**, section 25 | 6, the **configuration words**, section 25 |

Everything else in both pages is erased. The bolded rows were new when this section was written and
nothing here said what any of them were.

**`+0xFFF8` is settled now, in section 25, and this paragraph used to get it wrong.** It read: "on a
PIC18 J-series part the configuration words sit at the top of program memory, **but not of this
page**, so the resemblance is a prompt to check rather than a reading." The second clause is false.
`0xFE` maps from program address zero, so `0xFF` is the high half and `0xFF` `+0xFFF8` is program
`0x1FFF8`, which is exactly where the configuration words are. The hedge came from not carrying the
page mapping through the arithmetic, one section after establishing it.

And the 600's identity block measures 48
non-erased bytes against the One's 64, which is not a disagreement: the One's fourth field is
sixteen zero bytes and the 600's is erased, so both hold three GUIDs and an unused fourth slot.

The two Harmony Ones agree on every run above, including the lengths of the unidentified ones, and
differ only inside `+0xF400`, `+0xF582` and `+0xF643`.

### What it does not settle

`MCU_ID` is still out of reach, per section 22, so the arch 12 part number stays inferred. The last
two bytes of every page are unreadable, because the offset clamps at `0xFFC0` and 62 bytes from
there end at `0xFFFD`; no image runs that far, so nothing here depends on them. And the 700 2.8
image remains worth keeping: it is a second arch 14 sample and the only one for that model.

## 24. The 600's safe mode config, read where the 700's package said it would be

Section 3 has put the architecture 14 safe mode config at flash `0x020000` for as long as this
document has existed, and until now that address rested on **one** file: `Region_3.EZHex` out of the
Harmony 700's 2.8 update package, whose own `end_addr` recovers a base of `0x020000`. No 700 has
ever been connected here, and the 600 that has been on the bench for months was never asked for
that address. So an architecture-wide claim was carried by a single model's installer.

### The read

8192 bytes off the 600's external flash at `0x020000`, read only, external flash so no internal page
and no restart risk. What came back parses as a container and passes every check the parser makes:

| | value |
|---|---|
| magic | `GSPM` |
| `end_addr` | `0x021BC7`, which recovers a flash base of exactly `0x020000` |
| length | 7115 bytes including the `PTYY` end marker |
| format | `0x1400`, that is 1.4 |
| architecture, from slot 1 | 14 |
| section slots | 20, the architecture 14 count |
| checks | all ten, including the section table ending exactly at the marker |

The remaining 1077 bytes of the read are erased, so the container is the whole of what is there.

The base address is the part worth stating plainly, because it is not an assumption the parser was
given: `flash_base` is **recovered** from `end_addr` minus the distance to the end marker. The file
was read from `0x020000` and independently says it belongs at `0x020000`.

### The comparison nobody asked for

The 600's safe mode config and the 700's are **the same length to the byte**, 7115, and their
section tables are **identical**: all twenty pointers, same addresses. They differ in 83 bytes.

That is worth pausing on. Section 16 established that a small logical change to a user config
reshuffles the whole image, three arch 8 configs generated ten minutes apart differing in 73 to 84
percent of their bytes. These two were built five months apart, by the timestamps in slot 3, one on
15 April 2009 and one on 18 September 2009, and they have byte identical layout. So the safe mode
config is not a generated config in the sense the user configs are. It is a fixed artifact that gets
rebuilt.

Where the 83 differences sit says something too. Seventy four of them are **before the first
section**, in the `LWJL` block that the section table does not point at, six are in slot 3 (the
timestamp, which must differ) two in slot 17 and one in slot 1. `LWJL` is the key code table, and
section 17 established that it is a property of the remote rather than of the configuration. Two
different keypads is exactly the thing that ought to differ between a 600 and a 700 while everything
else stays put.

**Not claimed:** what those bytes mean. The clusters are pairs about `0x17` to `0x2A` apart, one
member of each pair reading `0x00` on the 600 against `0x1F` on the 700. Reading them is key table
work and belongs with section 17, not here.

### What it closes

`docs/memory-map-600.md` had one row sourced from another model's installer, and that row is now a
measurement. Nothing changed about the address, which is the point: a prediction that had to hold
for the architecture claim to stand held.

## 25. The six bytes at the top of the `0xFF` page are the configuration words

Section 23 listed an unexplained run of six bytes at `0xFF` `+0xFFF8`, present on all three bench
remotes at the same offset and the same length, and hedged about what it might be. It is the PIC18
configuration words, and the identification needs no new measurement, only the arithmetic already
established plus an authoritative table.

### The closure

`0xFE` maps one to one from program address zero, confirmed in section 22 by the three PIC18 vectors
sitting at `0x0000`, `0x0008` and `0x0018`. So `0xFF` is the high half of a 128 KiB program memory
and `0xFF` `+0xFFF8` is program address `0x1FFF8`.

gputils ships a linker script per part, and for both candidates it says the same thing:

```
CODEPAGE   NAME=page       START=0x0               END=0x1FFF7
CODEPAGE   NAME=config     START=0x1FFF8           END=0x1FFFD        PROTECTED
CODEPAGE   NAME=devid      START=0x3FFFFE          END=0x3FFFFF       PROTECTED
```

`18f67j50_g.lkr` and `18f87j50_g.lkr` are byte for byte identical on those three lines, which
matters because the 600 is a `PIC18F67J50` and the One is inferred to be the 80 pin sibling.

So the configuration region is `0x1FFF8` to `0x1FFFD`, **six bytes**, and the observed run is six
bytes at that exact address. Offset and length both, on two architectures, against a table nobody
here wrote. The last configuration byte is the last byte of the region rather than of the page,
which is why the run is six and not eight.

### The two unreadable bytes turn out to be nothing

Section 23 records that the read offset clamps at `0xFFC0` and a 62 byte read from there ends at
`0xFFFD`, so `0x1FFFE` and `0x1FFFF` cannot be read at all. Those two addresses are past
`END=0x1FFFD`: they are not configuration and not program memory. **The clamp costs nothing.** That
was previously stated as "no image runs that far", which is true but weaker than the real answer.

The arithmetic lands exactly, which is worth stating as its own closure: `0xFFC0` plus 62 bytes ends
on page offset `0xFFFD`, and `0x10000` plus `0xFFFD` is `0x1FFFD`, the last configuration byte. The
largest read the firmware permits stops on precisely the last byte worth having. Whether the bound
was chosen for that reason or the two coincide is not something this can answer.

### What it changes

The configuration words hold the oscillator and PLL selection, the watchdog, the stack overflow
reset, the extended instruction set bit and the code protection setting. Two consequences.

**A hardware recovery through ICSP becomes a copy rather than a guess.** Restoring a bricked
internal flash needs the program image, which section 23 already has for all three units with
verifying checksums, and the configuration words, which without this section would have had to be
inferred from how the firmware behaves. Nothing here has been attempted and the ICSP pads have never
been looked for; what changes is that the information exists rather than the procedure.

**It is weak support for the arch 12 part number.** A device whose configuration words sit at
`0x1FFF8` has 128 KiB of program memory, which is what the `PIC18F87J50` has. That is consistent
with the inference in section 3 rather than a confirmation of it, since every member of the family
with that flash size would say the same. `MCU_ID` at `0x3FFFFE` remains out of reach, per section 22.

### Not claimed

What the six bytes actually say. Decoding them into `WDTEN`, `PLLDIV`, `XINST` and the rest is a
byte level reading of a per unit region that is not published here, and nothing in this project
needs it yet.

## References

* concordance: https://github.com/jaymzh/concordance
* harmony-decompiler discussions: https://github.com/trelowney/harmony-decompiler/discussions
* firmware and legacy software archive: https://www.harmonyremoterepair.com/software-firmware.html
