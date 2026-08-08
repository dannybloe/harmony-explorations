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

Derived from access-bank SFR usage counts across the image.

**Corrected since this section was written.** It said the addresses followed the standard PIC18
high-end map and should be confirmed against the PIC18F67J50 datasheet. They were confirmed, and
eight of 93 names were wrong; the table below is the corrected one, and section 18 has the argument
and the provenance. Nothing here rests on the generic map any more.

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

> **Confirmed independently on 7 August 2026.** Everything below is a fit to a corpus whose real
> build dates were unknown. Section 58 supplies the case this section never had: a config compiled
> while we watched, on a date known before it was read, which the reader recovers exactly. The
> ordering warning at the end of this section still stands, but it now has evidence against it.

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

## 26. Action list opcode `0x7F` is a call, and the operands prove it without the firmware

Section 17 left the opcode table as the most valuable thing to look for, and said the meanings had
to be read out of the arch 14 firmware. One of them did not need to be.

### The search that did not work, first

The plan was the obvious one: the compiler emits a switch as an `XORLW` chain, so the interpreter
should be a chain whose case values are action list opcodes. A scan of the whole 700 image for
chains of three or more cases, scored against the opcodes the configs actually use, returned
eleven candidates and every one of them was the **same chain** read from a different starting
offset: the USB state dispatch at `0x0C720`, which `harmony/pic18/chains.py` already documents as
70 cases running to `0x0C8FE`.

That is the trap the module's own docstring warns about, arriving exactly as described: "the value
of a case depends on where the walk started, so starting one comparison too late shifts every case
value, and both readings can look plausible". A scanner that starts a walk at every `XORLW` in the
image finds one chain many times and calls it many chains.

So the interpreter is not an `XORLW` chain, or it dispatches on something derived from the opcode
rather than on the opcode itself. Both remain open.

### What worked instead

The operand is a `u16` and the opcode is one byte, so every opcode has an operand distribution, and
a distribution is testable against structures derived from elsewhere in the file.

| | 700 | 600 |
|---|---|---|
| `0x7F` uses | 2795 | 1465 |
| distinct operands | 1576 | 834 |
| operand range | 52 to 7655 | 23 to 4755 |
| action lists in the config | 8037 | 4955 |

Every operand is a valid index into the action list table. That alone would be suggestive rather
than conclusive, since the table is large and a range can fit by luck. The closure is where the
range **stops**.

Section 17 established that the lists are packed into exactly five contiguous runs, which is why
four consecutive table entries per config are not `1 + 3 * count` apart. Those runs end at these
indices:

```
700   17, 4323, 5147, 7655, 8036
600   11, 2721, 3154, 4755, 4954
```

`0x7F`'s largest operand is **7655** on the 700 and **4755** on the 600. Both are exactly the last
index before the final run, and not one operand in either config reaches past it.

The run boundaries come from the addresses in the pointer table and the counts inside the lists.
The operand range comes from the instruction stream. Those are unrelated parts of the file, and the
boundary lands on the same index in both configs at two different values. A range that fits by luck
does not do that twice.

### What it means, and what it leaves

`0x7F` takes an action list index and runs it: a call. That agrees with harmony-decompiler's arch 9
table, where `0x7F` is "run an action list", so this meaning transfers across architectures even
though the wider inventory does not. Per decision 7 the upstream table was a hypothesis to test
rather than a fact to adopt, and this is one entry tested and held.

The final run is the interesting leftover. 381 lists on the 700 and 199 on the 600 are addressed by
the table and never called by a `0x7F`, so something else reaches them and it is not another action
list. They are entry points. The key table has 163 and 162 records respectively, which does not
match, so the obvious guess is ruled out. The next section finds what does.

### Base slot 8 is what reaches the final run

If something names those lists, the indices are somewhere in the file, so the search is a sweep: read
a `u16` at every byte offset in the container and ask which section the hits fall in. One section
answers.

| | 700 | 600 |
|---|---|---|
| final run | indices 7656 to 8036, 381 lists | indices 4756 to 4954, 199 lists |
| `u16` readings inside base slot 8 | 3591 | 1962 |
| hits in that index band, expected by chance | 20.9 | 6.0 |
| hits observed | **384** | **199** |
| distinct values among them | 381 | 199 |
| of the run they cover | **all of it, with nothing left over** | **all of it** |

The band is 381 values of 65536, so a section of this size should contain about twenty by accident.
It contains 384, they are 381 distinct values, and those 381 values are exactly the run: nothing
missing, nothing outside. On the 600 it is cleaner still, 199 references for 199 lists, a bijection.

So **base slot 8 owns the final run of action lists**, one reference each. Two of the 700's values
appear more than once, which accounts for 384 against 381 and is what you would expect of a
structure where two entries share a list.

**What this sweep cannot say** is whether slot 8 also calls lists in the other four runs. Those span
indices 0 to 7655, which is twelve percent of the `u16` space, so the noise floor is high enough to
swallow the signal: the same scan reports about a thousand such readings in the 700 and there is no
way to tell a reference from a coincidence at that density. Answering it needs slot 8's record
layout, not a wider sweep.

That layout is not established. The references are not on a fixed stride: the gaps between them are
mostly four and five bytes with a long tail out to twenty two, so slot 8 holds variable length
records rather than a table. Which is a useful thing to know before anyone tries to read it as one.

Slot 8 was already the section worth looking at. Section 16 records it as the only section whose
size changed under the one documented edit in the 700 pair, and `docs/roadmap.md` names it as the
second target of step 6. It is now also the section that owns 381 action lists.

### Two structural facts about operands, whatever the opcodes mean

**Some operands are signed.** `0x07` carries only `0xFFF2` to `0xFFFF`, that is `-14` to `-1`, and
`0x1F` only `0xE800` to `0xFF0A`. Read as unsigned they are numbers with no referent anywhere in
the file; read as signed they are small negative values.

**Several carry bit 15 as a flag rather than as magnitude.** `0x6C` tops out at `0x8014` on both
configs, which is itself odd for an index, and `0x71` at `0x833E` on the 700 against `0x8336` on the
600. An index with a marker bit fits; a range does not.

Neither is claimed as a meaning. They are constraints on what the meanings can be.

## 27. Base slot 8 is bindings: a key press, and the action list it runs

Section 26 found that slot 8 reaches the action lists nothing else calls, and left its layout
unread. It reads, and it reads completely.

### The format

```
+0x00  u8 count; { u16 operand; u8 opcode }[count]      one ordinary action list
       then repeated to the end of the section:
         u8 count; { u8 tag; u16 operand; u8 opcode }[count]
         0x00 bytes between records are skipped
```

An entry is an action list instruction with **one extra byte in front**. The leading plain list is
what fixes where the records start: `1 + 3 * count` from the section's first byte lands exactly on
the first record, in every sample.

The walk consumes every byte, on every config in the corpus, across four architectures:

| Sample | arch | bytes | records | entries |
|---|---|---|---|---|
| 700 user config | 14 | 3592 | 354 | 765 |
| 600 user config | 14 | 1963 | 191 | 403 |
| One user config | 12 | 3928 | 268 | 883 |
| 88x class config | 8 | | 100 | 466 |
| 525 config | 9 | 1086 | 82 | 216 |
| One safe mode config | 12 | | 30 | 30 |

A walk that starts one byte out desynchronises immediately and runs off the end, so consuming the
section exactly is the validation. That is also how the leading list was found: the record walk only
works from offset `1 + 3 * count`, and nothing else about the section suggested a header.

### The tag is a key press

Under the key code split from section 17, `EVENT_MASK` and `SCAN_MASK`, **every tag in every sample
is a press**, `0x80`, with no exceptions across four architectures. The scan codes are a small set
and the set differs per model:

| Architecture | tags | scan codes |
|---|---|---|
| 14, the 600 and 700 | `82 88 89 A2` | 2, 8, 9, 34 |
| 12, the One | `AB AC B0 B1 B2 B3 B4 B5` | 43, 44, 48 to 53 |
| 9, the 525 | `9E 9F A6 A7` | 30, 31, 38, 39 |
| 8, the 88x class | `85 86 87 88 AC AD AE B0` | 5 to 8, 44 to 46, 48 |

Four buttons on architectures 14 and 9, eight on 12 and 8. Different keypads carrying different
scan codes is what physical buttons would do; a field that meant something abstract would have no
reason to move between models.

Within a record the tags always appear in the same order, and only certain subsets occur. On the
700 the shapes are `(89, A2)` 201 times, `(89, 88, A2, 82)` 65 times, `(A2)` 58, `(89)` 12,
`(88, 82)` 10, `(88)` 5.

### What closes it: the controlled pair

The two Harmony 700 configs differ by one documented change, recorded by their owner: one new
sequence, one reassigned standard button, **two new additional buttons**, no device touched. Section
16 established slot 8 as the only section whose size changed.

It grew by **8 bytes**. An entry is 4 bytes, so that is two entries. And the record inventory says
exactly where they went: the record count is 354 in both, while two entry records go from 212 to
211 and four entry records from 65 to 66. **One record gained two entries.**

Two new buttons in the owner's account, two new bindings in the file, in a single record. The
prediction was made by somebody who had never seen the format and the count was produced by a
parser that knows nothing about their description.

### Slot 8 and the action lists

With the correct parse, section 26's open question answers itself. Slot 8's `0x7F` instructions call
610 action lists on the 700 and 308 on the 600. Of those, **381 and 199 land in the final run, cover
it exactly, and each list is called once**; the remaining 229 and 109 call lists in the other runs.

So the final run is the set of lists that only a binding reaches, and slot 8 calls into the general
population as well.

### Not claimed

Which physical buttons those scan codes are. The mapping from scan code to a button somebody can
point at is the experiment in `docs/roadmap.md` step 6, and it needs a remote and a finger.

What a record corresponds to. 354 of them on the 700 against 6 devices and a handful of activities
means a record is something finer, and "a screen of soft buttons" is a guess that fits the counts
without being tested.

And the other opcodes in these records. `0x7F` is a call, per section 26; `0x7E` and the rest are
as unread here as they are in slot 10.

## 28. Most of an arch 14 config is one cross product, against a fixed vocabulary

Opcode `0x6C` was the reason section 17 said the arch 9 opcode table does not transfer: it is the
third most common opcode on architecture 14 and does not appear in the 525 sample at all. It turns
out not to be an isolated instruction but half of the config's dominant structure.

### One shape, most of the file

Grouping every action list by the sequence of its opcodes gives one overwhelming answer:

| Sample | lists | of shape `{0x7A a; 0x6C b}` |
|---|---|---|
| 700 user config | 8037 | 2832 |
| 600 user config | 4955 | 1888 |

Those counts are also the total number of `0x6C` uses in each config, so **every `0x6C` in the file
is the second instruction of a two instruction list whose first is a `0x7A`**. There is no other
context in which it appears.

### The cross product

Partitioning those lists by the `0x7A` operand gives six groups on the 700 and four on the 600. Each
group holds **exactly 472** lists, and every group holds the **same 472 values** of `0x6C`, each
once. Six times 472 is 2832 and four times 472 is 1888, so the partition is complete.

The 472 values are the same on both remotes, and they are not arbitrary:

```
451 values, 0 to 450, contiguous with no gaps
 21 values, 0x8000 to 0x8014, which is 0 to 20 with bit 15 set
```

**That set does not depend on the config.** Two different remotes, two different owners' setups,
different sizes, and the same 472 values with the same split. A vocabulary the format carries rather
than anything the user chose.

So the bulk of an architecture 14 config is the complete cross product of a small per config set
with a fixed 472 entry vocabulary, written out one list per pair. At seven bytes a list that is
19824 bytes on the 700, which is most of what base slot 10 contains.

### What it probably is, stated as a guess

`0x7A` selecting a device and `0x6C` naming a function would fit. The counts are suggestive: the
700's config has six groups and a Harmony 700 supports six devices, the 600's has four and a 600
supports five. The `0x7A` operands are large and scattered, `1E04 1E06 1E07 4EA1 96FC D338` on the
700, which is the shape of database identifiers rather than indices, and three of the six being
adjacent is what several devices from one manufacturer would look like.

Read that way a list is a two instruction program, select this device then send function N, and the
config precomputes one for every combination it might need.

**None of that is established.** The counts fit and nothing here tests them. What is established is
the structure, the partition and the fixed vocabulary.

### Architecture 12 is not the same shape

The One's configs have an analogous dominant pair, `{0x75 a; 0x7E b}`, but only one group and a
value set that is neither the same size nor contiguous: 91 distinct values from 40 to 267 in the
programmed config and 21 from 43 to 110 in the unprogrammed one. So this is an architecture 14
structure and the arch 12 equivalent, if there is one, has not been read. Forcing the two together
would be exactly the kind of transfer section 17 warns about.

## 29. `0x7C` carries a value of at most 100, and longer numbers are spelled out

`0x7C` is the most used opcode on architecture 14, 7272 times in the 700 config and 4788 in the
600, and it turns out to be doing arithmetic.

### Where it occurs

Every use is accounted for by two shapes. 6900 of the 700's are in lists made of **nothing but**
`0x7C`, of length two to five, and the remaining 372 are the third instruction of `{0x7F, 0x7D,
0x7C}`. On the 600 it is 4600 and 188. Nowhere else.

### The operand is two fields

The operand splits at the byte:

* the **high byte** takes the values 0 to 5 on the 700 and 0 to 3 on the 600, which is the same
  count as the cross product groups in section 28, six and four
* the **low byte** runs 1 to 100, contiguous, for every group

Every list keeps one high byte from start to finish, and in every list of length `k` the first
`k - 1` operands have low byte **100**, the maximum, with only the last one varying.

### Which spells out a number

Repeating the largest value a field can hold and then adding a remainder is how you express a
quantity too large for one instruction. Reading a list of length `k` as `(k - 1) * 100 + n` gives,
per group:

| length | lists per group | remainders | value |
|---|---|---|---|
| 2 | 100 | 1 to 100 | 101 to 200 |
| 3 | 100 | 1 to 100 | 201 to 300 |
| 4 | 100 | 1 to 100 | 301 to 400 |
| 5 | **50** | 1 to **50** | 401 to **450** |

The union is 101 to 450, contiguous, with every value appearing exactly once per group. The count
of length five lists is half that of the others, and its remainders stop at 50 rather than 100,
which is not a rounding of anything: it is what a ceiling of 450 requires.

**And 450 is a number this format already used.** Section 28 found `0x6C` indexing a fixed
vocabulary of 451 contiguous values, **0 to 450**, identical on both remotes. The pure `0x7C` lists
express **101 to 450**. Same ceiling, arrived at from an unrelated direction: one is a set of
operand values, the other is a count of list lengths times a field maximum.

So the two structures are the same enumeration seen twice. Values up to 100 fit in one `0x7C`
operand; values from 101 to 450 need two to five, and the config precomputes a list for each.

### What is not established

What the enumeration counts. A per group quantity capped at 450 with a per instruction maximum of
100 is the shape of a duration, a repeat count or a level, and nothing here distinguishes them.

Whether the high byte is the same thing as section 28's group. The counts match, six and four, and
both track the config rather than the model, but matching counts are not identity.

And why the field maximum is 100 rather than 255, when the operand byte could hold more. A decimal
looking bound in a binary field usually means somebody upstream of the encoder thought in decimal.

## 30. The Harmony 650 is arch 14, and it was the third arch 14 sample sitting unopened

`reference/checksums.md` has named three surviving Harmony firmware packages since the corpus was
first written down. Two were downloaded and analysed. The third, the Harmony 650 0.4 package, was
listed with the note "not yet analysed, arch 15" and no copy was ever fetched.

It is arch 14.

### How it was established

Downloaded from the same archive page as the other two, opened with `tools/ezextract.py`, and it
has the same two region shape as the 700 package: a `Region_2.EZUpgrade` of code and a
`Region_3.EZHex` holding a container.

| | evidence |
|---|---|
| code loads at `0x9000` | `loadaddr.find_base` returns 36864 with 1595 boundary hits of 1614 targets, against 410 for the runner up. The arch 14 execution base. |
| the code is a firmware image | its own header checksum verifies over all 75392 bytes, version 0.4, entry point `0x1B658` |
| the container says so itself | section slot 1 states architecture 14, and all ten container checks pass |
| the container sits where arch 14 safe mode configs sit | recovered flash base `0x020000`, format 1.4, 20 pointer slots, 7115 bytes |

The recovered base is the closure rather than an input: `flash_base` is derived from `end_addr`
minus the distance to the end marker, so the file independently agrees with the address the
architecture uses.

Slot 1 is what carries the weight here, because format `0x1400` alone does not separate arch 14
from arch 9. That is the rule stated in `docs/config-format.md`, applied to a model nobody here had
looked at.

### Why it matters more than one corrected note

**Three arch 14 safe mode configs now exist, from three models.** The 600's was read off the
device, the 700's came out of its package, and the 650's out of this one. All three are 7115 bytes
and their **section tables are byte for byte identical**, across three firmware versions with three
distinct build timestamps. Two samples were the standard here; three models agreeing makes the
arch 14 safe mode layout a property of the architecture rather than of a device.

The differences are small and sit where section 24 said they would:

| pair | differing bytes of 7115 |
|---|---|
| 650 0.4 against 700 2.8 | 50 |
| 650 0.4 against 600 0.2 | 77 |
| 600 0.2 against 700 2.8 | 83 |

The 650's and the 600's were built seventy seven seconds apart, on 18 September 2009, which says
they came off one generator run for two models.

**And arch 12 is now the thin one.** Arch 14 has three code images and three safe mode configs;
arch 12 has one of each. The architecture with the popular remote is the architecture with the
least corroboration.

The container corpus is **fifteen samples** as of this section, not the thirteen the earlier
sections above were measured on. Two arch 14 safe mode configs joined it after those were written:
the 600's, read off the device in section 24, and this one. Every claim in this document that was
stated on thirteen has been rerun on all fifteen and still holds, so the older counts are left as
written rather than edited, and `docs/config-format.md` carries the current one. The counts there
are asserted against the sample table in `tests/test_gspm.py` now, since that is the number most
likely to drift next.

### The general point

Only three Harmony firmware packages have ever been published, and all three are the MyHarmony
generation. There is **no public firmware at all** for arch 2, 3, 7, 8, 9, 10 or 15, which is seven
of the eleven architectures concordance names models for and every architecture on Logitech's own
discontinuation list in `reference/models.md`. For those the only route to an image is `READ_FLASH`
off a physical remote.

## 31. Four opcodes address a second operand space, and no other opcode enters it

`0x07`, `0x0F`, `0x1F` and `0x3F` never carry an operand below `0xC000`. Every other opcode in the
inventory does, in nearly every use. That is not a tendency, it is a partition, and it holds over
**85962 instructions in ten configs across four architectures**.

### The law

| claim | evidence |
|---|---|
| the four never take an operand below `0xC000` | 10381 uses, zero exceptions |
| the lowest they ever take is exactly `0xC000` | that is `-16384`, a power of two, so the floor is a boundary and not the smallest value that happened to occur |
| their value sets never collide | no value is ever carried by two of the four, over all ten configs |
| the band is not theirs alone | `0x7A` puts 984 uses above `0xC000` and `0x79` puts 38 there, so this is a region four opcodes live in exclusively, not a region only they can reach |

Read as signed, the four occupy four bands that rise with the opcode:

| opcode | operands, signed, union over the corpus | uses |
|---|---|---|
| `0x07` | `-14` to `-1`, 12 distinct | 4587 |
| `0x0F` | `-192` to `-29`, 10 distinct | 91 |
| `0x1F` | `-6400` to `-241`, 247 distinct | 5329 |
| `0x3F` | `-16384` to `-2510`, 48 distinct | 374 |

The first three bands do not overlap at all. The fourth overlaps the third and still shares no
value with it.

### The four are one family, and the fifth member is already placed

`0x07`, `0x0F`, `0x1F`, `0x3F` are `2^n - 1` for n = 3, 4, 5, 6. The next term, `2^7 - 1`, is
`0x7F`, which section 26 established as the call. So five consecutive all ones opcodes exist, four
of them take an operand from this second space and the fifth takes an index into the action list
table. No other `2^n - 1` value appears in the inventory: `0x01`, `0x03` and `0xFF` are absent
everywhere.

Whether the bit pattern is meaningful or a coincidence of how the opcodes were numbered is not
established. It is recorded because five terms of a series with no gaps is not what an arbitrary
assignment produces.

### Two of them are fixed per architecture

The corpus has two configs for each of arch 14, arch 12 and arch 8. Within every pair:

| opcode | arch 14 | arch 12 | arch 8 |
|---|---|---|---|
| `0x07` | identical, 8 values | identical, 8 values | identical, 8 values |
| `0x0F` | identical, 2 values | identical, 4 values | one config does not use it |
| `0x1F` | 40 of 121 and 87 shared | 73 of 93 and 82 | 63 of 69 and 69 |
| `0x3F` | 4 shared, one set inside the other | identical, 46 values | identical, 5 values |

`0x07`'s eight values are `-14, -13, -11, -10, -9, -4, -3, -1` on arch 14 and
`-10, -9, -8, -7, -5, -4, -3, -1` on both arch 12 and arch 8, with arch 9 carrying a different five.
Two configs of an architecture, from different owners in the arch 14 case, agreeing on the whole
set is what a vocabulary looks like. `0x1F` and `0x3F` vary with the config while keeping most of
their values, so they are a vocabulary with config specific additions rather than a closed one.

At the level of a whole list shape the agreement is sharper still. Of the 52 list shapes that carry
a negative operand on both arch 14 remotes, **29 carry exactly the same set of values**, two
different models with different equipment. The most used of them, `[0x1F, 0x7F]`, appears 710 times
on the 700 and 358 times on the 600 and its `0x1F` operand is one of the same seven values in every
one of those 1068 lists.

### Why this matters before the meaning is known

**These operands are not config data.** A value that survives byte identical across two remotes
that share no devices is a reference into something the firmware supplies, not something the
generator numbered. An editor that renumbers them because they look like indices would corrupt
every list that uses one. The codec should treat operands at or above `0xC000` as opaque and carry
them through unchanged, and `packages/codec` can enforce that before anybody knows what they name.

### What was ruled out

**A relative action list reference.** `0x7F` is an absolute index into the table at base slot 10, so
a negative operand suggested a backward one. Adding the operand to the index of the containing list
lands inside the table for 78% of `0x1F` uses on the 700, 54% on the 600 and 6% on the One, and for
14%, 0% and 4% of `0x3F`. A real addressing mode does not miss.

`0x07` scores 100% on that test on all three, which is the trap: its operands are `-14` to `-1` and
the tables have thousands of entries, so landing in range carries no information at all. Reported
here rather than dropped, because the same number looks like a confirmation until the null case is
computed.

### What is not established

What any of the four name. Four bands of different widths, one of them fourteen values wide and one
of them 247, is consistent with four different tables, or with one table read at four scales, and
nothing here separates those.

Whether the four bands are one number line. `0x07` ends at `-14` and `0x0F` starts at `-29`, which
would be a gap in a shared line; but the corpus only shows values that are used, so an unused gap
proves nothing.

And why the floor is `-16384` rather than `-32768`. Half the negative range is untouched by every
sample.

## 32. Base slot 5 is the infrared database

The first section pointer labelled by function, and it was reached from the opcode work rather
than from the firmware.

### How it was found

Opcode `0x7C`'s operand splits at the byte, and section 29 left the high byte as an unnamed group.
Counting those groups against the section table gives an exact match in every config:

| config | arch | distinct `0x7C` groups | pointers in base slot 5 |
|---|---|---|---|
| 700 | 14 | 6 | 6 |
| 700, second config | 14 | 6 | 6 |
| 600 | 14 | 4 | 4 |
| 525 | 9 | 4 | 4 |
| One, programmed | 12 | 5 | 5 |
| One, unprogrammed | 12 | **1** | **1** |
| 880 a | 8 | 3 | 3 |
| 880 b | 8 | 6 | 6 |
| 880 c | 8 | 7 | 7 |
| 880 d | 8 | 7 | 7 |

Ten of ten, across four architectures, and the group indices are contiguous from zero every time.
The count varies from 1 to 7, so this is not a constant that any table would match. The unprogrammed
Harmony One is the natural minimal case and it lands on 1 without being made to.

### The structure

Base slot 5 is a count prefixed pointer array whose entries are themselves count prefixed pointer
arrays, using the same spare byte idiom as the section table:

```
base slot 5:  u8 count; u24 group_address[count]

per group:    u8 zero; u16 count; u24 record_address[count]
```

Verified over **49 groups and 3058 record pointers in ten configs**: the lead byte is zero every
time, each group occupies exactly `3 + 3 * count` bytes and the groups are packed adjacently with
no gap, and every record pointer lands inside the container. None of the 3058 is an action list
address, so this table addresses something the action list table does not.

Each record opens with a fixed 14 byte header, `{u8; u24; u8; u24; u24; u24}`, whose first pointer
is always the record's own address minus seven, on all four architectures. What the four pointers
are for is not established.

### What the records hold

After the header comes a run of `u16` values in which **bit 15 strictly alternates**. Read with
bit 15 as "this is a mark" and the remaining fifteen bits as microseconds, they are infrared pulse
trains. The most common single value across the corpus is a 568 microsecond mark, and the most
common spaces are 552 and 1662.

The framing is fixed:

```
[leading gap]  header mark, header space,  bits * (mark, space),  trailing mark, trailing gap
```

so the run from the first mark is `2 * bits + 4` values long. **That identity holds for all 2137
framed records in the corpus, with no exception.**

### The closure

The bit count comes out of the record's length. The header timings are two numbers at the front of
the record. They have nothing to do with each other, and they agree:

| header mark / space, measured | records | bits, from the length | the protocol those timings name | its bit count |
|---|---|---|---|---|
| 8990 / 4490 and 9000 / 4500 | 1052 | **32, every one** | NEC, 9000 / 4500 | 32 |
| 3480 / 1730, 3460 / 1730 and 3364 / 1682 | 313 | **48, every one** | Kaseikyo, 3456 / 1728 | 48 |
| 4500 / 4500 and 4485 / 4485 | 168 | 32 | 4500 / 4500 headers are a 32 bit family | 32 |
| 4000 / 4500 | 111 | 24 | not identified | |

The measured NEC header is within 0.11% of the specification and the Kaseikyo one within 0.7%. A
thousand records agreeing on 32 bits and three hundred on 48, where the two quantities are computed
from opposite ends of the record, is the closure. Reading the durations as anything other than
microseconds breaks it.

The bit timings agree independently. Kaseikyo specifies a 432 microsecond mark with 432 and 1296
microsecond spaces; the corpus carries 425 with 450 and 1320. NEC specifies 560 with 560 and 1690;
the corpus carries 568 with 552 and 1662.

### Arch 9 stores infrared differently

Of the 525's 200 records, 36 frame at all and none of those framings is coherent: header pairs like
8053 / 46 and 2354 / 0. Its records are short and full of small byte values rather than `u16`
durations, which is what a table indexed encoding looks like.

That is expected rather than awkward. The firmware's infrared dispatcher routes **four** encoding
classes, listed as an open question in `docs/config-format.md` since section 11. This decodes one
of them. The 880's short pulse records, headers around 303 / 310, are probably another.

Counting only records that frame: 347 of 350 on the 700, 271 of 328 on the One, 301 of 454 on the
880 c, and 97 of 97 on the unprogrammed One.

### What this unblocks

An infrared database extractor, which `docs/roadmap.md` names as the first visible payoff of step 6.
Every config anybody owns carries the codes for their equipment, in microseconds, and those are
exactly the codes people cannot recreate without Logitech, and cannot recreate at all once the
service goes. Section 56 corrects an earlier claim that it already had. `gspm.ir_groups`, `ir_pulses`
and `ir_frame` are the reader.

### What is not established

**What a group is.** One to seven of them, one per `0x7C` group. Equipment is the obvious guess and
the count fits, but nothing here names them.

**The 14 byte header.** Four pointers, one of which is self referential at minus seven, so the
records are chained. The chain is not followed here.

**Why some records carry a `0x7FFF` prefix** before the first mark, and how many. The reader locates
the run rather than assuming an offset, so this does not block decoding, but a writer would need it.

**The other three encoding classes**, including whatever arch 9 uses for all of its records.

## 33. Opcode `0x7D` sends an infrared code, and the reference is one to one

The count gave it away. On the 700, `0x7D` has 350 distinct operands and the infrared database has
350 records. On the 600, 186 and 186.

### The placement

`0x7D`'s operand is `{u8 group; u8 index}` into the base slot 5 table of section 32. Over ten
configs and four architectures:

| config | arch | distinct `0x7D` operands | infrared records | operands outside the table |
|---|---|---|---|---|
| 700 | 14 | 350 | 350 | none |
| 700, second config | 14 | 350 | 350 | none |
| 600 | 14 | 186 | 186 | none |
| 525 | 9 | 200 | 200 | none |
| One, programmed | 12 | 328 | 328 | none |
| One, unprogrammed | 12 | 97 | 97 | none |
| 880 a | 8 | 234 | 234 | none |
| 880 b | 8 | 397 | 397 | none |
| 880 c | 8 | 454 | 454 | none |
| 880 d | 8 | 462 | 462 | none |

**The set of distinct operands is exactly the set of valid `(group, index)` pairs**, ten times over.
Every record is reached, nothing outside the table is named, 3058 records and 3058 distinct
operands.

It is onto rather than one to one: the 700 has 372 `0x7D` instructions naming 350 records, so
twenty two records are sent from more than one list. That is what a shared command looks like and
it does not weaken the set equality, which is the claim.

Note what the set equality would take by accident. The group is a byte and the index is a byte, and
the group sizes are irregular: 30, 111, 65, 52, 10 and 82 on the 700. An operand chosen for some
other reason would have to land inside the right group's length every time, and between them the
ten configs would have to hit all 3058 pairs and no others.

### The second closure

`0x7D` appears in exactly one list shape per config: `{0x7F, 0x7D, 0x7C}` on arch 14 and
`{0x7D, 0x7C}` on arch 8, 9 and 12. Nowhere else, in any config.

In all **3164** of those lists, across ten configs, the `0x7C` operand's high byte **equals the
`0x7D` operand's high byte**. Zero exceptions.

That does two things at once. It confirms the group split of `0x7D`'s operand from a direction that
does not involve the infrared table at all, and it ties `0x7C`'s group to the same grouping,
answering the question section 29 left open about whether the two were the same thing. They are, at
least here.

The `0x7C` value that accompanies a send is small. Over all ten configs it takes six values,
`0, 1, 2, 4, 5, 10`, and 2260 of the 3164 sends carry 1. So it is a count of something rather than
an identifier, which fits `0x7C`'s established reading as a quantity of at most 100 spelled out
above that.

### What arch 14 adds

On arch 14 the idiom carries a leading `0x7F`, which section 26 established as a call to another
action list. Arch 8, 9 and 12 send without it. What the called list does first is not established.

### What is not established

**What a group is.** Section 32 left this open and this section does not close it. What it adds is
that the grouping is shared between the infrared database, `0x7C` and `0x7D`, so whatever names it
will name all three.

**What the accompanying `0x7C` counts.** A repeat count is the obvious reading for a value of 1 next
to an infrared send, and the corpus never shows it above 10, so the obvious reading is also
untested. A value of 0 appears 665 times, which a repeat count would have to explain.

## 34. The action list interpreter, read out of the firmware

Section 26 tried to find this by scanning for `XORLW` chains and failed, because **the opcode
dispatch is a binary search on the opcode value and there is no chain**. That is the correction,
and it is why the search could not have worked.

Found instead by following the data. Located on the Harmony 700 2.8 image and confirmed on the
complete Harmony 600 0.2 image.

### The route in

`0x10A30` reads three bytes into `TBLPTRU:TBLPTRH:TBLPTRL` and starts an SPI read there, so it is
**follow a three byte config pointer**. `0x10A46` reads one byte and advances. Those two are the
whole config reading vocabulary, and their callers are the section consumers.

The action list reader is at `0x10CD6`:

```
CALL 0x10A30          follow the pointer
CALL 0x10A46          read one byte, the count
loop while count:
    CALL 0x0EA5A      one instruction
    count = count - 1
BSF LATF,7            deselect the flash
```

which is `u8 count` followed by that many items, exactly the structure section 17 derived from the
container alone. `0x0EA5A` reads three bytes and hands them on.

### It is a queue machine, not an inline interpreter

`0x0EA5A` does not execute. It **enqueues**. The three bytes go into a circular buffer:

| | Harmony 700 2.8 | Harmony 600 0.2 |
|---|---|---|
| buffer | RAM `0x0127` to `0x019E` | RAM `0x021E` to `0x0295` |
| length | `0x78`, 120 bytes | `0x78`, 120 bytes |
| count, full at `0x78` | `0x126` | `0x21D` |
| read pointer | `0x19F` | `0x296` |
| write pointer | `0x1A1` | `0x298` |
| init, push, pop | `0x0E7D6`, `0x0E7F8`, `0x0E82C` | `0x0E3F4`, `0x0E416`, `0x0E44A` |

120 bytes is **exactly 40 three byte instructions**, on both. So a config's action lists are a
program that is spooled into a 40 instruction queue and drained by a separate loop, which is what
`MISC_QUEUE_ACTION` in the USB command set is for: the host can push into the same queue.

The executor is `0x0EB20` on the 700 and `0x0E73A` on the 600. It tests the queue for empty, pops
three bytes into `0xD49`, `0xD4A`, `0xD4B` on both, and then:

```
if opcode == 0x1F and operand_high == 0xFC:   special case
else:                                          normal dispatch
```

**No config in the corpus takes that special case.** `0x1F`'s operand high byte is one of
`E8 E9 EA EB ED EE EF F0 F1 F2 FB FE FF` across ten configs and `FC` is not among them, sitting in
the gap between `FB` and `FE`. So the firmware has a path nothing here exercises.

### The dispatcher

`0x0EC8E` on the 700, `0x0E89E` on the 600. Identical shape, different RAM addresses. It compares
the opcode against constants and branches, descending:

| test | what happens |
|---|---|
| `opcode < 0x65` | branch away to a second dispatcher, `0x0F160` on the 700 |
| `opcode >= 0x80` | **bit 7 is cleared** and the whole instruction is handed to one routine, `0x17CC4` on the 700 and `0x16360` on the 600 |
| `0x7A <= opcode <= 0x7F` | six individual handlers, below |
| `0x74 <= opcode <= 0x79` | six more |
| `0x6D <= opcode <= 0x73` | and so on |

That every opcode with bit 7 set goes to one routine with the bit stripped explains the shape of
the inventory. Of the 75 distinct opcodes the corpus uses, **55 are at `0x80` or above and account
for 2603 of the 85962 instructions**. They are one family with a parameter, not 55 instructions.
The 20 below `0x80` carry everything else, and the five below `0x65` carry 12462 uses on their own.

### The register file, and four opcodes placed

`0x10E/0x10F` on the 700, a sixteen bit pair, is an **accumulator**:

| opcode | handler does |
|---|---|
| `0x7A` | `accumulator = operand` |
| `0x79` | `accumulator = accumulator + operand` |
| `0x78` | `accumulator = f(accumulator, operand)` via `0x1B23C` |
| `0x77` | `accumulator = g(accumulator, operand)` via `0x1BAF6` |

So the arithmetic machine upstream described is real and this is its register.

### `0x70` and `0x71` are comparisons

Both take the same path. The operand's **low byte is passed to `0x17E28`**, which returns a sixteen
bit value in `PROD`, so the low byte is an index into a lookup that routine owns. The operand's
**low nibble of the high byte selects a comparison**, through an `XORLW` chain at `0x0EEAE`:

| selector | test |
|---|---|
| 0 | equal |
| 1 | not equal |
| 2 | left greater than right |
| 3 | left less than right |
| 4 | left greater than or equal |
| 5 | left less than or equal |
| 6, 7 | not comparisons; both call `0x17D0E`, 7 after computing through `0x1B23C` with `0xFFFF` |

The result is written to the flag at `0x008`. The left hand side is what separates the two opcodes:
**`0x71` compares the byte variable `0x00D`, `0x70` compares the accumulator.**

The corpus splits the same way. `0x71` uses selectors `0` to `5` and nothing else, over 2164 uses.
`0x70` uses `0`, `1`, `2`, `3` and **`7`**, the last one nine times. So the six comparisons belong
to `0x71` and the odd selector to `0x70`. Selector `6` is never used by either.

That is what the operand statistics were seeing. Section 33's commit recorded `0x71`'s operand as
"bit 15 a flag, high byte a group 0 to 5, low byte always under 64", measured over 155 distinct
operands in ten configs with no violation. Read against the firmware:

* the "group 0 to 5" is the **comparison selector**, and `0x71` uses exactly the six values the
  firmware implements as comparisons and none of the two it does not,
* the low byte under 64 is the **index bound of whatever `0x17E28` looks up**,
* bit 15 is a separate flag on the high byte, which the dispatcher masks off with `& 0x0F`.

Three independent measurements of the same field, agreeing. And `[0x71, 0x7F]`, the second most
common two instruction list on arch 14, is a **conditional call**: compare, then call an action
list.

### Other handlers, named by what they touch

| opcode | handler |
|---|---|
| `0x7F` | operand to `0x3CE/0x3CF`, call `0x10CB8`. The call, section 26 |
| `0x7E` | operand to the bank 15 pair `0xF2D/0xF2E`, then `0x1679E` |
| `0x7D` | operand to `0x09A/0x09B`, call `0x130E0`. The infrared send, section 33 |
| `0x7C` | operand to `0x09C/0x09D`, call `0x13102` |
| `0x7B` | shifts the instruction: operand high becomes the opcode, operand low becomes operand high, `0x10D` becomes operand low, and the result is pushed back on the queue. A prefix that builds an instruction from a variable |
| `0x76` | operand to the bank 15 pair `0xF31/0xF32`, then `0x16A34` |
| `0x74` | operand to `0x33F/0x340`, call `0x1A69C` |
| `0x73` | operand to `0x39D/0x39E`, call `0x18814` |
| `0x72` | low byte through `0x17E28`, product to `0x3BB/0x3BC`, high byte to `0x3BA`, call `0x1B30A` |

`0x7B` is worth a second look: an instruction that assembles another instruction out of a runtime
variable and re-queues it is self modifying bytecode, and it explains how a fixed config can act on
a value it did not know at build time.

### What is not established

**What `0x17E28` looks up**, which is the thing `0x70`, `0x71` and `0x72` all index with a byte.
Placing that would name three opcodes at once and probably a section with it.

**What the bank 15 pairs `0xF2D/0xF2E` and `0xF31/0xF32` hold.** They look like special function
registers in a listing and they are not: on the PIC18F67J50 the lowest defined register is `PMSTAT`
at `0xF40`, checked against the gputils header rather than assumed, so everything `0x7E` and `0x76`
write is ordinary memory. Noted because the disassembler prints an `sfr` prefix for anything in
bank 15 and that reads as hardware when it is not.

**Everything below `0x65`**, which is a second dispatcher not read here, and everything at `0x80`
and above, which is one routine not read here.

## 35. Base slot 13 is the state variable table, and the firmware confirms the section table

Section 34 left `0x17E28` as an unnamed lookup that `0x70`, `0x71` and `0x72` all index with a
byte. Reading it names a section, places a third opcode, and confirms in code the one claim in this
project that had to be corrected in place.

### What `0x17E28` reads

A table in RAM at `0x0900`, with two halves:

```
index < threshold:   one byte  at 0x0900 + index,               zero extended to sixteen bits
index >= threshold:  two bytes at 0x0900 + threshold + 2 * (index - threshold), little endian
```

The threshold lives at `0x1EA`. So the variables are **narrow first, then wide**, and how wide a
variable is follows from its index rather than from anything stored beside it.

### Where the table comes from

The initialiser at `0x17974` positions on **config section slot 13** and reads a four field header,
storing the second field into `0x1EA`. In the container that section is:

```
+0x00  u16  count           how many variables
+0x02  u16  narrow          how many are one byte, and the firmware's threshold
+0x04  u16  wide            how many are two bytes
+0x06  u16  narrow again    the same number a second time, purpose unestablished
+0x08  u24  entry[count]
```

Checked on all ten configs: `narrow + wide == count`, the fourth field always equals the second,
and `8 + 3 * count` equals the section's length exactly.

| config | arch | count | narrow | wide | RAM it occupies |
|---|---|---|---|---|---|
| 700 | 14 | 94 | 67 | 27 | 121 |
| 600 | 14 | 74 | 55 | 19 | 93 |
| 525 | 9 | 24 | 23 | 1 | 25 |
| One, programmed | 12 | 46 | 45 | 1 | 47 |
| One, unprogrammed | 12 | 42 | 41 | 1 | 43 |
| 880 c | 8 | 38 | 37 | 1 | 39 |

"State variables" is one of the four subsystems the format's designer named in harmony-decompiler
discussion 1, alongside infrared sending, menus and action lists. Two of those four are now named.

### The closure

Every `0x70`, `0x71` and `0x72` index in every config is **below that config's own count**. That is
already a fit across ten different counts from 24 to 94. But the split is sharper than that:

| opcode | uses | indices |
|---|---|---|
| `0x71` | 2164 | **always below `narrow`**, so always a one byte variable |
| `0x70` | 146 | **always at or above `narrow`**, so always a two byte variable |
| `0x72` | 501 | either half |

Zero violations, ten configs, four architectures.

Section 34 read the firmware and found that **`0x71` compares a byte variable while `0x70` compares
the sixteen bit accumulator**. The config data has no way to know that, and it respects the exact
boundary that each config's own header declares. Two readings from opposite ends meeting on a
number that varies per config, 67 on the 700 and 55 on the 600 and 45 on the One.

In six of the ten configs the largest index used is `count - 1`, so the last variable is live and
the count is a size rather than a ceiling.

### Selectors 6 and 7 assign

Section 34 left them as "not comparisons". `0x17D0E` reads the variable through the same lookup,
adds a sixteen bit delta and clamps against a bound. So `0x70` and `0x71` are one instruction that
either tests a state variable or updates it, and the selector nibble chooses.

### The section table, confirmed in code

The routine every consumer goes through, `0x10B92`, is four instructions of arithmetic:

```
offset = 4 * slot
offset = offset + 0x0B
seek to the container plus offset
read one byte and discard it
follow the three byte pointer that comes next
```

**That is `0x0B + 4 * slot`, then a spare byte, then a `u24`.** Section 20 corrected this document
from a `u32` table at `0x0C` to a `{u8 spare; u24 address}` table at `0x0B`, on arithmetic over
fifteen samples. Here the firmware computes it. The correction is no longer an inference.

### A slot to consumer map, for free

Because `0x10B92` takes the slot in a register that callers load with a literal, one scan gives
every consumer. On the Harmony 700 2.8 image, 19 call sites:

| base slot | consumer at | what is known |
|---|---|---|
| 3 | `0x14956`, `0x14F9A` | the build timestamp, section 21 |
| 4 | `0x16B98` | |
| 5 | `0x17EF6` | the infrared database, section 32. The consumer indexes **twice**, group then record, which is the two level structure read from the container |
| 6 | `0x16816` | |
| 7 | `0x1851A` | |
| 8 | `0x0F78A` | key press bindings, section 27 |
| 9 | `0x1B6FE` | |
| 10 | `0x10CC0` | the action list table, section 34 |
| 11 | `0x1881C` | |
| 12 | `0x174CA`, `0x17596` | |
| 13 | `0x179A4`, `0x17E8C` | **the state variable table**, this section |
| 14 | `0x1B312` | |
| 15 | `0x0F904` | |
| 16 | `0x19A90` | |
| 17 | `0x1A70C`, `0x1A788` | |

Slots 0, 1 and 2 are absent because they are read by the loader rather than by a subsystem, and
slots 18 and 19 are NULL everywhere. Every other slot has a named entry point now, which turns
labelling the remaining ten from a search into a reading.

### What is not established

**What the `count` pointers in slot 13 point at.** Ninety four of them on the 700, three bytes each.
Definitions, defaults or names are all plausible and none is checked.

**Why the header repeats `narrow`.** Two fields hold the same number in all ten configs.

**What any individual variable means.** The table is sized and split; nothing here names entry 9,
which is the one `0x71` reads most.

## 36. Base slot 4 is the firmware event map, and section sizes are upper bounds

The second slot labelled from section 35's map. It also produces a correction that applies to every
section, not just this one.

### The table

Base slot 4 is a fixed shape, identical in all ten configs across four architectures:

```
+0x00  u24  fallback        used when no key matches
+0x03  u16  count           thirty, in every config
+0x05  { u8 key; u24 value }[count]
```

The keys are `0` to `29`, contiguous, every time. The values are `N` to `N + 29`, contiguous, and
the fallback equals `N`. Only `N` varies: 19 on the 700, 14 on the 600, 11 on the 525, 10 on both
Harmony Ones, 4 on all four 880s.

### The consumer

`0x16B98` walks it looking for a key that matches `0xF37/0xF38`, and the callers set that key from
a **literal constant**. Four sites on the 700 load `0x00`, `0x16`, `0x1A` and `0x1B`. So the key
space is the firmware's, not the config's: the firmware raises event number 22 and the config says
what event 22 means on this remote.

The value it finds goes to `0xF2D/0xF2E`, **the same pair opcode `0x7E`'s operand goes to**, and
then both call `0x1679E`. If no key matches, the fallback is used instead.

`0x1679E` treats that pair as "the current item". When it changes, the routine seeks to the
outgoing item's address and runs its **tag 7** action list through the tagged list runner at
`0x1B71E`, which reads a count and then `{u8 tag; ...}` records and enqueues only the ones whose
tag matches. So an item has handlers, and switching away runs one of them.

### The closure

Two different things write the same register, so they must share a numbering space, and they do
not collide. Over ten configs, `0x7E` names 1246 distinct operands and lands inside the reserved
block **once**.

| config | reserved block | highest `0x7E` below it | lowest `0x7E` above it |
|---|---|---|---|
| 700 | 19 to 48 | 16 | 50 |
| 600 | 14 to 43 | 11 | **44** |
| One, programmed | 10 to 39 | **9** | **40** |
| One, unprogrammed | 10 to 39 | **9** | 41 |
| 880 a | 4 to 33 | 1 | **34** |
| 525 | 11 to 40 | 7 | 41, and one operand of 25 sits inside |

The bold entries abut the block exactly. On the programmed Harmony One the config uses 0 to 9, the
block takes 10 to 39, and the config resumes at 40 with no gap on either side. That is one
allocator handing out numbers from a single pool with a reserved range in the middle, and it is
what makes the shared namespace a finding rather than a coincidence of ranges.

The 525's operand 25 is the exception and is reported rather than explained.

### Section sizes are upper bounds, not sizes

**Slot 4's table is 125 bytes.** The distance from slot 4's pointer to slot 5's is between 419 and
1532 depending on the config.

The difference is not padding. It is **slot 5's infrared group arrays**, laid out in the gap. In
nine of the ten configs the first group array starts at exactly `slot 4 + 125`, the byte after the
event map ends; on the 525 it starts later still.

That generalises. `docs/config-format.md` has said since the beginning that "the size comes from
the distance to the next non NULL pointer", and that is a bound rather than a measurement: a
section's own data can end long before the next section's pointer, with another section's
sub-structures filling the space. Any reasoning that treated a large gap as a large section was
reasoning about the wrong bytes.

It also revises the geography of section 32 without changing its structure. Base slot 5 is the
array of group pointers; the group arrays those point at physically live in slot 4's gap. The
two level reading is unchanged, only where the second level sits.

### What is not established

**What the thirty events are.** Four keys are seen in the firmware and the rest are not traced.

**What the numbering space counts**, which is still the `0x7E` question from section 33's commit.
What is new is that `0x7E` and slot 4 share it and that thirty entries of it are reserved.

**Why the fallback repeats the value for key 0**, in every config.

## 37. Base slot 6 is the mode table, and that places `0x7E`

Section 36 found that opcode `0x7E` and the event map write the same register, without saying what
the number in it names. It names an entry in base slot 6.

### The table

```
+0x00  u24  count
+0x03  u24  address[count]
```

A `u24` count, where the six recognised pointer arrays use a `u8` or a `u16`, which is why the
parser's array heuristic never picked this slot up.

### The closure

**The count is exactly one more than the largest `0x7E` operand, in all ten configs.**

| config | arch | count | largest `0x7E` operand |
|---|---|---|---|
| 700 | 14 | 374 | 373 |
| 600 | 14 | 237 | 236 |
| 525 | 9 | 114 | 113 |
| One, programmed | 12 | 268 | 267 |
| One, unprogrammed | 12 | 111 | 110 |
| 880 a | 8 | 103 | 102 |
| 880 b | 8 | 125 | 124 |
| 880 c, 880 d | 8 | 154 | 153 |

Ten counts spanning 103 to 374, and every one of them lands on the operand maximum plus one. Every
value in the event map is inside the same range as well.

So **`0x7E` switches to the entry its operand indexes**, and the reason its operand set looked
strange in section 33's commit is that it is an index into a table nothing had counted yet. The
gap in its values, 17 to 49 on the 700, is the block base slot 4 reserves for firmware events,
which is section 36.

### What an entry is

The consumer at `0x16816` on the 700 and `0x14832` on the 600:

1. indexes slot 6 by the current mode number and follows the pointer, keeping the entry's address,
2. follows a further pointer at offset 6 inside the entry,
3. reads one byte at the entry's start,
4. follows the pointer at offset 1 and runs the tagged action lists there with **tag 6**.

The other half is in `0x1679E`, the routine both `0x7E` and the event map call. Before storing the
new mode it takes the **outgoing** one and runs its tagged lists with **tag 7**.

**Those are the only two tags in either image.** Scanning every literal loaded into the tag
register finds `6` at one site and `7` at one site, on the 700 and on the 600, and nothing else. So
an entry has exactly two handlers: one that runs on the way in and one that runs on the way out.

### The name

Called the mode table because that is what the consumer makes it: a set of things the remote is in
one of at a time, each with an enter handler and a leave handler, switched by an instruction and by
firmware events.

**It is not the activity list.** A Harmony has a handful of activities and this table has 103 to
374 entries, so whatever an entry is, there are far more of them than there are activities. Enter
and leave handlers are exactly what an activity's power on and power off macros would be, so
activities are plausibly *among* the entries, and that is as far as the evidence goes.

### The slot map holds on the second image

Section 35 built the slot to consumer map on the Harmony 700. The same scan on the complete 600
image finds **19 call sites covering slots 3 to 17**, with two sites for slots 3, 12, 13 and 17 and
one for each of the rest: the same shape, site for site. The map is a property of the firmware
rather than of one build.

### What is not established

**What distinguishes one entry from another**, beyond having two handlers. The byte at offset 0 and
the pointer at offset 6 are read and not followed here.

**Why there are so many.** 374 on a config with six infrared groups is the number to explain.

## 38. The slot map on a third image, and what the remaining consumers do

Section 35's map was built on the Harmony 700 and section 37 repeated it on the 600. Here it is
extended to arch 12, and the slots nobody had opened are characterised in one pass.

### Arch 12, and the insertion rule confirmed from the firmware

The Harmony One 3.4 image has the same seeker, found by the same arithmetic, and **24 call sites
covering raw slots 2 to 19**. Two things follow that the containers alone could only suggest.

**It never seeks raw slot 8.** That is exactly the NULL arch 12 inserts. Every other raw slot from
2 to 19 has a consumer and that one has none.

**It does seek raw slot 18**, twice, which is the section arch 12 has and the base layout does not.

So the alignment rule in `docs/config-format.md`, derived from three fingerprints in the container,
is how the firmware actually addresses the table. Arch 12 has more sites than arch 14 has, 24
against 19, because it has two more slots to reach.

### Base slot 3 seeds the real time clock

Its consumer is five instructions long and unambiguous, on all three images:

```
seek base slot 3
index 10
read three bytes
CLRF TMR1H ; CLRF TMR1L ; BSF T1CON,0
```

Timer 1 with its own oscillator is the standard PIC18 real time clock. Section 21 read slot 3 as an
eleven byte build timestamp on the strength of a corpus search and a weekday closure; the consumer
loads three of its bytes and starts the clock from them. The reading is confirmed from the
hardware, on the 700, the 600 and the One.

### Base slot 15 has a size the firmware demands

Its consumer reads the entry count and **compares it against a literal**, bailing out if it differs:

| image | arch | literal | configs of that architecture |
|---|---|---|---|
| Harmony 700 2.8 | 14 | 9 | 9 and 9 |
| Harmony 600 0.2 | 14 | 9 | 9 and 9 |
| Harmony One 3.4 | 12 | **11** | 11 and 11 |

Two different numbers on two architectures, both matching every config. The arch 9 sample carries 5
and the arch 8 samples 9, unverified against their firmwares because no image exists for either.

That is a **rail for anything that writes a config**: the count is not free. A generator that emits
a different number does not get an error, it gets a subsystem that silently does nothing. Recorded
before there is any writer, because it is exactly the kind of constraint a writer discovers by
bricking a remote.

What the entries are is not established. The consumer indexes them by a byte in `0x0B7`, reads one
byte at the target and compares it against `0x0B8`, returning a boolean, so it is a membership test
over a per architecture fixed size set.

### Base slot 7

A count prefixed pointer array of 5 to 18 entries. Its consumer reads a `u16` count, indexes the
array by a byte the caller supplies, reads a three byte value, and later loads that value into
`TBLPTR` and seeks it. So it is a table of flash addresses selected by an index, one level deeper
than the section table itself.

### The rest, characterised rather than named

Each of these has a located consumer and a structure, which is what makes the next attempt cheap.

| base slot | entries across the corpus | what the consumer does |
|---|---|---|
| 9 | 8 to 16 | indexes, follows, and **runs tagged action lists**, then enqueues |
| 11 | 22 to 5711 | indexes, follows, then a chain of ten routines nothing else calls |
| 12 | 5 to 30 | reads a byte, indexes, follows, reads a `u24`, copies through `FSR0` |
| 14 | 11 to 37 | indexes, follows, reads a `u16` then a `u8` |
| 16 | not an array by the usual header | indexes, follows, reads a `u8` and a `u24`, **enqueues an instruction** |
| 17 | not an array by the usual header | indexes, follows, reads a `u8`, then two routines |

Slots 9 and 16 both reach the action list queue, so both hold or reference action lists. Slot 11 is
the largest table in the config on arch 14, 5711 entries on the 700 against 8037 action lists, and
its consumer is the most involved in the set.

### A mistake worth recording

The first pass at this table was automated: disassemble sixty instructions from each consumer and
report the special function registers it touches. It attributed Timer 2 to slot 5 and the analogue
converter to slot 15, and **both were wrong**. Sixty instructions runs past the end of a five
instruction routine and into whatever the compiler placed next, and the tool has no idea where a
routine ends.

Slot 3's Timer 1 survived only because it is genuinely inside the routine. The lesson is that a
window is not a routine: read to the `RETURN` before attributing anything to a consumer.

### What is not established

The contents of slots 7, 9, 11, 12, 14, 15, 16 and 17. Every one now has a consumer address on at
least one image and a structure, which is the difference between a search and a reading.

Slots 9, 14 and 16 came off that list in section 39, slots 7 and 11 in section 40, slot 12 in
section 43, slot 15 in section 44 and slot 17 in section 45. The list is empty.

## 39. Three more sections named, and what the accumulator computes

Section 38 ended with eight slots that had a consumer address and no name, and with the rule that
made naming them possible: read the consumer to its `RETURN`, because a fixed window is not a
routine. Doing that for three of them names three sections, places a fourth opcode, and answers a
question section 34 left open, which is what the arithmetic machine is for.

### Base slot 9 is the binding table

```
+0x00  u8   count
+0x01  u24  address[count]
```

Eight to sixteen entries in every config in the corpus, each pointing at a tagged list. The
consumer is `0x1B6DE` on the 700, `0x19E22` on the 600 and `0x2E2D2` on the One, and it does one
thing: index the array by a byte the caller supplies, follow the pointer, and run the tagged list
there against a tag the caller also supplies.

**The closure is the index.** One instruction proposes a new current entry, opcode `0x1F` with the
operand's high byte `0xFF` and the index in the low byte, at `0x0F25C`. Its maximum is **exactly
the table's count minus one, in all ten configs**:

| config | arch | count | largest index used |
|---|---|---|---|
| 700, both | 14 | 11 | 10 |
| 600 | 14 | 9 | 8 |
| 525 | 9 | 8 | 7 |
| One, programmed | 12 | 16 | 15 |
| One, unprogrammed | 12 | 9 | 8 |
| 880 a | 8 | 9 | 8 |
| 880 b | 8 | 10 | 9 |
| 880 c, 880 d | 8 | 11 | 10 |

Ten for ten, no slack anywhere, across four architectures. That is the same test that placed
`0x7D` and `0x7E`.

**What an entry holds is button bindings.** Scanning the tags in every entry of every config gives
two populations. Tags below `0x40` are firmware tags: `1` and `2` appear in all ten configs, and
the transition code at `0x0EB80` shows what they are. It compares the current entry against a
proposed one, and when they differ it runs the old entry with **tag 2** and then the new one with
**tag 1**. Leave and enter, the same arrangement base slot 6 has with tags 7 and 6.

Tags at `0x80` and above are **key event codes**, by the `EVENT_MASK` and `SCAN_MASK` split of
section 17: `0x81` is a press of scan code 1, `0xC3` a repeat of scan code 3. That is exactly the
encoding base slot 8 uses, section 27. So an entry is a set of button bindings plus an enter and a
leave handler.

**The controlled pair settles it.** The two Harmony 700 configs differ in one place in this whole
section: entry 8 gains a single binding, tag `0x9A`, a key press. Their owner's own notes record
one new standard button assignment in one activity, `UpArrow = Receiver: InputAv1`. One described
button, one added binding, in one entry, and nothing else in the section moves. Section 16 warns
that the pair's direction is unresolved; this does not depend on the direction.

**What an entry corresponds to is not settled.** That owner describes a six device installation and
the table has eleven entries, so it is not the device list. Devices and activities together is the
obvious reading, since both have their own button layouts in a Harmony, and it is not proven here.
The other changes in that same diff, two new additional buttons and a sequence, do not appear in
this section at all, which fits: additional buttons are on screen items rather than physical keys.

### The tagged list encoding

Base slots 6 and 9 both point at lists in one encoding, read by one firmware routine, `0x1B71E` on
the 700. It has two forms and the first byte says which:

```
+0x00  u8   count                                     when nonzero
+0x01  { u8 tag; u16 operand; u8 opcode }[count]
```

```
+0x00  u8   0
+0x01  u8   count
+0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
```

The routine stops at the **first** entry whose tag matches and runs nothing else, so a duplicate
tag is unreachable through anything but its first copy. In the second form bit 0 of `flags` is
tested after the match; what it selects is not established. `gspm.tagged_list` reads both.

### Base slot 14 is the state value map, and that places `0x72`

Section 34 recorded opcode `0x72` as "low byte through `0x17E28`, product to `0x3BB/0x3BC`, high
byte to `0x3BA`, call `0x1B30A`" and named none of it. `0x17E28` reads a state variable, section
35, and `0x1B30A` is the base slot 14 consumer. So the instruction is a single lookup with two
indices in one operand:

* the operand's **low byte** is a state variable index, into base slot 13,
* the operand's **high byte** selects a record of base slot 14,
* the record is searched for the variable's **value**, and the address found there is followed.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   stepped over by the firmware; 2 in every record in the corpus
+0x01  count                 u16 on arch 14, u8 on arch 8, 9 and 12
+...   { u16 value; u24 address }[count]
+...   u8   count of the range table
+...   { u16 low; u16 high; u24 address }[count]
```

The range table is walked only when no exact value matched, and its bounds are inclusive. Eight of
the ten configs leave it empty; two carry one range between them, which is the only reason it could
be read at all.

**The payload is a pointer, not an instruction**, and the corpus says so independently: all 9776
targets in ten configs land inside their own container. What the firmware does with one is follow
it and hand it to `0x1879C`, which is a **second interpreter**, reading a one byte opcode from the
config and dispatching through an `XORLW` chain over the ten opcodes `1` to `5` and `16` to `20`,
with `0` terminating. It is not the action list language and it is not decoded here. Base slot 6's
mode switch reaches it too, from `0x16796`.

**Both halves of the operand are bounded by the table they index, in all ten configs**, and neither
ever overruns:

| config | `0x72` uses | largest high byte | slot 14 records | largest low byte | state variables |
|---|---|---|---|---|---|
| 700, both | 36 | 35 | 37 | 83 | 94 |
| 600 | 25 | 27 | 29 | 72 | 74 |
| 525 | 11 | 7 | 11 | 13 | 24 |
| One, programmed | 74 | 14 | **15** | 45 | **46** |
| One, unprogrammed | 50 | 15 | **16** | 41 | **42** |
| 880 a | 66 | 12 | **13** | 32 | **33** |
| 880 b | 67 | 11 | **12** | 36 | **37** |
| 880 c, 880 d | 68 | 11 | **12** | 37 | **38** |

Six of the ten are tight on the record index and five on the variable index, in bold, and the rest
are inside by one or two. An opcode whose two operand bytes index two different sections, with both
bounds holding everywhere, is a stronger statement than either bound alone.

**The count width differs by architecture and the key width does not**, and the layout settles it
rather than the firmware being read twice. Compute a record's length under each of the four
combinations and ask whether it lands on another record's start:

| architecture | u8 count, u8 key | u8 count, u16 key | u16 count, u8 key | u16 count, u16 key |
|---|---|---|---|---|
| 14, the 700 | 0 of 37 | 0 | 0 | **36 of 37** |
| 14, the 600 | 0 of 29 | 0 | 0 | **28 of 29** |
| 12, the One | 0 | **13 of 15, 14 of 16** | 6, 8 | 0 |
| 9, the 525 | 0 | **10 of 11** | 6 | 0 |
| 8, all four | 0 | **10 to 11 of 12 to 13** | 6 to 8 | 0 |

One column per row, ahead of every other and accounting for at least four fifths of the records in
every config. **Corrected here:** the first reading
of this had the key varying and the count fixed at `u16`, which scored six of twelve on the older
architectures and looked like a majority until the other two combinations were tried. The records
that still do not land are ones whose addresses point into the middle of a longer record, which is
the generator sharing tails.

### Base slot 16 is the number sender

The largest single result here, and nothing in the corpus uses it.

The consumer is `0x19A90` on the 700, `0x1845E` on the 600 and `0x2C5D0` on the One. After
indexing the array and following the pointer it reads fourteen bytes in sequence and then subtracts
`10000`, `1000`, `100` and `10` in four loops, accumulating a packed decimal result four bits per
digit and raising a digit counter to `5`, `4`, `3` and `2` as each loop fires. That is decimal
conversion, and it is byte for byte the same routine on all three images:

```
image                 index offsets    subtracted constants        digit floors
Harmony 700 2.8       1, 14, 17, 20    0x2710 0x03E8 0x64 0x0A     5 4 3 2
Harmony 600 0.2       1, 14, 17, 20    0x2710 0x03E8 0x64 0x0A     5 4 3 2
Harmony One 3.4       1, 14, 17, 20    0x2710 0x03E8 0x64 0x0A     5 4 3 2
```

It then left aligns the digits, and for each one selects one of three pointers at fixed byte
offsets `0x0E`, `0x11` and `0x14` in the record according to whether the digit is the first, the
last, or neither, follows it, indexes it by the digit and queues the instruction there.

**Fourteen is the closure.** The sequential reads consume `1 + 3 + 1 + 3 + 3 + 3` bytes, which is
`0x0E`, exactly where the first of the three fixed offsets is. The record is not two structures
that happen to be adjacent, it is one:

```
+0x00  u8   flags
+0x01  u24  base, added to the value before conversion
+0x04  u8   minimum number of digits
+0x05  u24  instruction queued first
+0x08  u24  instruction queued last
+0x0B  u24  instruction queued before the digits when the value is long enough
+0x0E  u24  first digit table
+0x11  u24  middle digit table
+0x14  u24  last digit table
```

Each digit table is ten three byte instructions indexed by the digit. Bits 1 and 2 of `flags`
decide whether the prefix instruction fires at all, by setting the threshold it is compared
against: bit 2 sets `0x0100` and bit 1 sets `0x0010`, against the packed decimal value, so a
hundred and ten. With neither bit the threshold is `0xFFFF` and the prefix never fires. Bit 0
makes the prefix consume one of the digits.

So a Harmony sends a channel number by looking up one action list per digit, with a different
table for the leading and trailing digit, and optional prefix and terminator instructions. That is
the shape of every "enter 1, 2, 3 then Enter" sequence a television needs.

**Every config in the corpus carries a count of zero.** All twelve, spanning four architectures.
The section exists, its pointer is real, and nobody on this bench has a device configured to use
it. That is worth stating plainly, because it also explains why no operand statistic could ever
have found this slot, and because `gspm.number_senders` has never had a record to read.

### What the accumulator computes

Section 34 established `0x10E/0x10F` as a sixteen bit accumulator with load, add and two more
operations, and could not say what a config wanted arithmetic for. The high band ladder answers it.

Opcodes `0x1F` through `0x3E` dispatch on the operand's **high byte**, in one descending chain from
`0x0F250` on the 700. Four of its branches pair two sources with two consumers:

| operand high | source | consumer |
|---|---|---|
| `0xF3` | the accumulator `0x10E/0x10F` | base slot 16, the number sender |
| `0xF4` | the accumulator | base slot 14, the value map |
| `0xF5` | the one byte register section 34 calls `0x00D` | base slot 16 |
| `0xF6` | that same byte register | base slot 14 |

In each case the operand's **low byte** selects the record. A fifth branch, everything at `0xF7`
and above, builds an instruction whose opcode is the operand's low byte and whose operand is the
accumulator, and queues it, which is the same self modifying trick section 34 found in `0x7B`.

So the machine computes a number and then either spells it out in decimal or looks it up in a
table. None of the four is used by any config in the corpus, which is consistent with slot 16 being
empty in all of them; slot 14 is reached through `0x72` instead, which does its own lookup rather
than going through the accumulator.

### Routines named in passing

| address, 700 | what it is |
|---|---|
| `0x0EA0E` | queue an instruction already held in RAM at `0x1AA` to `0x1AC` |
| `0x0EA5A` | read three bytes from the config and queue them, section 34 |
| `0x10BEE` | `TBLPTR += 3 * index + offset`, the indexer every array consumer uses |
| `0x10C9A` | save the current config pointer to `0x68B` to `0x68D` |
| `0x10CA8` | restore it, which is how the digit loop rereads the record |
| `0x10CB8` | run action list: seek slot 10, index by `0x3CE/0x3CF`, queue every instruction |
| `0x1B71E` | run a tagged list against a tag |

`0x10BEE` is the one worth carrying. Its two parameters are an index and a byte offset, and the
offset is the array's header size: `1` for a `u8` count, `2` for a `u16` count, `0` for a table
with no count at all. Reading it removes the guesswork from every array in the format.

### What is not established

**What an entry of base slot 9 corresponds to**, beyond having bindings and a lifecycle. Devices
and activities together is the reading the counts support and it is not proven.

**The second table in a base slot 14 record**, empty in every record in the corpus.

**What base slot 16's `flags` bits above 2 do**, and the record's `base` field, which nothing in
the corpus exercises because nothing in the corpus has a record.

**Slots 7, 11, 12, 15 and 17.** Five left, with the same footing section 38 gave them.

Slots 7 and 11 came off that list in section 40, slot 12 in section 43, slot 15 in section 44 and
slot 17 in section 45, which empties the list.

## 40. The second interpreter, and base slot 11

Section 39 ended with a routine located and not decoded: base slot 14's lookup follows an address
and hands it to `0x1879C`, which reads a one byte opcode and dispatches. It is a second bytecode,
unrelated to the action lists, and it is the language that draws the screen.

### Where it is and what reaches it

| image | dispatcher | opcode chain |
|---|---|---|
| Harmony 700 2.8 | `0x1879C` | `0x187A8` |
| Harmony 600 0.2 | `0x16E38` | `0x16E44` |
| Harmony One 3.4 | `0x295AC` | `0x295E6` |

Three entry points, all three read off the firmware rather than guessed:

* **base slot 11**, whose consumer indexes the array by `0x39D` and calls the dispatcher directly.
  Opcode `0x73` of the action list language is what loads `0x39D`, per section 34, so an action
  list can run a screen program.
* **a base slot 14 lookup**, section 39.
* **a mode entry**, through the pointer at offset 6 and then three bytes in. That rule finds 374
  clean programs on the 700, 237 on the 600 and 117 on an arch 8 config, with **zero** failures,
  and finds nothing coherent on arch 9 or arch 12, so it is recorded as arch 8 and arch 14 only.

### The instruction set

The dispatcher reads one byte, runs a handler, and loops. `XORLW` chains decoded with
`harmony/pic18/chains.py`, never by hand.

| opcode | operands | handler does |
|---|---|---|
| 0 | none | return; the program ends |
| 1 | 4 bytes then a `u16` | repeats a primitive `count` times, bounded against the display width |
| 2 | 2 position bytes, `u24` | render the object at that address at that position |
| 3 | 6 bytes, `u24` | the same with a larger position record |
| 4 | 2 position bytes, `u24` | draw the glyph string at that address |
| 5 | 2 position bytes, then the string | draw the glyph string inline in the program |
| 16 | 1 byte | index **base slot 7** by it and follow the result |
| 17 | `u16` operand, `u8` opcode | **queue an action list instruction**, the bridge between the two languages |
| 18 | a switch, narrow | switch on a state variable and jump |
| 19 | the same, wide | counts, values and bounds two bytes instead of one |
| 20 | `u24` | jump; the program continues there |

A switch reads a state variable index, then a table of exact values and a table of inclusive
ranges, and jumps to the first target that matches:

```
u8    state variable index
count                                     u8 in opcode 18, u16 in opcode 19
{ value; u24 target }[count]              value likewise one byte or two
count
{ low; high; u24 target }[count]
```

That is the same shape base slot 14's record has, which is section 39's structure hoisted out of
the stream and given its own section.

**Three architectures, three opcode sets.** The ten above are in all three dispatchers. The Harmony
One's chain has **twelve**: it adds 22 and 23, whose handlers manipulate the stream pointer rather
than drawing, and which no config in the corpus uses. Arch 8's configs use an opcode **21** that no
available firmware implements, since no arch 8 image exists; its length is four operand bytes,
inferred the only way available, by being the one length that lets every stream carrying it reach
a terminator.

### Why it is the screen

The drawing primitive behind opcodes 2, 3, 4 and 5 bounds both its coordinates against `0x80`,
drives `LATB` bit 3 between two write paths, which is a display controller's register select line,
and resolves a glyph by indexing a font table at `0x398` by **the code minus one**. That last
detail is why the inline strings are not text: they are glyph indices. Of the 1000 or so strings in
the corpus, **not one decodes as printable ASCII**, and calling them text would be the easy
mistake.

### The closure

Instructions are variable length and nothing in a program states its length, so one wrong operand
count desynchronises the walk and the next byte read as an opcode is almost certainly not one of
the eleven. Walking every program reachable from base slot 11 and every base slot 14 lookup,
following every jump and every switch arm until nothing new turns up:

| config | arch | programs | instructions | undecodable |
|---|---|---|---|---|
| 700, both | 14 | 6194 | 12847 | 0 |
| 600 | 14 | 4290 | 9042 | 0 |
| 525 | 9 | 22 | 44 | 0 |
| One, programmed | 12 | 304 | 710 | 0 |
| One, unprogrammed | 12 | 278 | 658 | 0 |
| 880 a to d | 8 | 239 to 245 | 552 to 564 | 0 |

**18252 programs, four architectures, nothing left over.** Extract them with
`tools/screen_dump.py`.

### Base slot 11 is the screen program table

```
+0x00  u16  count
+0x02  u24  address[count]
```

One of the six recognised pointer arrays, so the parser already read it; what it points at is what
was missing. 5711 entries on the 700, 3810 on the 600, 22 to 59 elsewhere, and on arch 14 **5703 of
the 5711 are the same two instruction program**, queue one action list instruction and end. So the
table is mostly a level of indirection and the interesting programs are the ones the mode entries
and the value maps jump into.

### Base slot 7 has a caller

Section 38 read slot 7's structure, a pointer array indexed by a caller supplied byte, and could
not say who the caller was. It is opcode 16 of this language.

### What is not established

**Opcodes 22 and 23**, present only in the arch 12 dispatcher and used by no config, so their
operand lengths are unknown. `gspm.SCREEN_ARCH12_ONLY` lists them so a parser refuses them rather
than desynchronising quietly. *Both were read later: 23 in section 54 and 22 in section 64, and
that constant no longer exists.*

**What opcode 21 does.** Only its length is known, and that by inference from four arch 8 configs.

**What the operands of 1, 2 and 3 mean** beyond two of them being coordinates, and what the objects
those opcodes render actually are.

**The mode entry root on arch 9 and arch 12.** The arch 14 rule finds nothing there and the search
over every offset pair found no replacement, so those two architectures reach their screen programs
some other way.

**The glyph table.** Its address is held in RAM at `0x398` and where that is loaded from is not
traced.

## 41. The trailer checksum

Section 22 located the boot validator and could not derive the checksum it enforces. It is a
**sixteen bit XOR of the container's little endian words, seeded with `0x4321`**, over everything
from the container's first byte up to the stored value, which sits six bytes from the end ahead of
the four byte marker.

```python
accumulator = 0x4321
for offset in range(0, len(blob) - 6 - 1, 2):
    accumulator ^= int.from_bytes(blob[offset:offset + 2], 'little')
```

### How it was found, and what failed first

**Brute force did not find it.** 636 combinations of six range choices against six summation
variants and 100 CRC parameter sets, over five containers, produced not a single hit. That is
worth recording as a negative: the algorithm is not one of the standard ones, so a corpus attack
was never going to close this and the firmware was always the route.

Nor was it the constraint section 22 offered. That section observed that the 700 image contains
exactly one `ADDWF` followed by `ADDWFC` and concluded the checksum is not a plain sixteen bit sum.
Correct, and it pointed the wrong way: the operation is `XORWF`, twice, once per byte of the
accumulator, and section 22 had dismissed `XORWF` hits as "mostly comparisons rather than
accumulation". Two of them were not.

### The routine

Reading the validator to its end rather than stopping at the marker checks, which is the same
mistake section 38 recorded in another form:

```
0x16560  accumulator = 0x4321                 two literals, low byte then high
         seek header offset 4, follow         TBLPTR = end_addr
         cursor = end_addr - 2
         read_u16                             the stored checksum
         cursor = TBLPTR - 2
         seek header offset 0                 TBLPTR = the container's first byte
         count = cursor - TBLPTR              bytes from the start to the stored value
         count >>= 1                          words, so an odd trailing byte is dropped
0x16606  loop while count:
             read_u16
             accumulator.low  ^= word.low     XORWF, 0x1661E
             accumulator.high ^= word.high    XORWF, 0x1662C
             count -= 1
```

The seed is written as the two literals `0x21` and `0x43` into an adjacent register pair, which is
searchable, and the search finds it on **all three images**: `0x16562` on the 700, `0x15292` on the
600 and `0x28E36` on the One, each inside that unit's validator. There is a second site on each
image, `0x106E0`, `0x119FC` and `0x2440C`, which seeds the same value in code that first tests a
region selector against `0xFE`. That is the write path and it is not read here.

### The closure

**Fourteen containers, four architectures, three format versions, every one recomputes.** Sizes
from 7115 bytes to 1672832, and the four arch 8 configs that differ from each other in 73 to 84
percent of their bytes.

| | |
|---|---|
| arch 8 | 880 a, b, c, d |
| arch 9 | 525 |
| arch 12 | One programmed, One unprogrammed, One safe mode |
| arch 14 | 700, 700 second, 600, 600 safe mode, 650 safe mode, 700 safe mode |

`gspm.trailer_checksum` and `trailerChecksum` in `packages/codec`, held equal by the golden
vectors, and the parse now reports `trailer_checksum_recomputes` as a container check.

### Why it matters, and what it does not cover

This was **the last thing on the critical path for writing**. A generated config the remote will
accept needs this value right, and nothing else known here is a gate in the same way.

It is a weak checksum and that is worth stating plainly. A word XOR catches any single changed
byte, which is what the test asserts, but it is blind to a transposition of two words and to any
even number of identical changes. So it will not catch a corrupted transfer as reliably as its
sixteen bits suggest, and a writer should not treat a passing checksum as evidence that a config
is correct, only that the remote will not refuse it outright.

## 42. The infrared class byte, and why three classes cannot be derived from the corpus

The roadmap has carried "three of the four infrared encoding classes" as a known unknown since
step 3, on the reading that the corpus contains records of classes nobody has decoded. It does not.
It contains one class, and that changes what the open question is.

### The byte

**The pointer array does not point at a record's first byte.** It points seven bytes in, at a byte
the firmware reads on its own and branches on before reading anything else, and the three bytes
after it point back to the record's real start. Section 32 saw the second half of that, recording
that "the first pointer is always the record's own address minus seven"; the byte in front of it
is the encoding class.

```
record start                     ... the record's own fields
record start + 7   u8   class    <- the pointer array points here
                   u24  address  <- points back to record start
```

The distance is **exactly seven in all 2858 records of all ten configs**, four architectures
included, which is what makes it a layout rather than a coincidence.

### The census

| architecture | records | class byte |
|---|---|---|
| 8 | 1547 | 1, and nothing else |
| 9 | 200 | **5**, and nothing else |
| 12 | 425 | 1, and nothing else |
| 14 | 886 | 1, and nothing else |

No config mixes classes. Every one of the 2858 records on the three architectures whose firmware
is available is class 1.

### The dispatch

Three sites per image, and the same three on all three images, each an `XORLW` chain over exactly
`{1, 2, 3, 4}` and no other value:

| image | send | stop | record loader |
|---|---|---|---|
| Harmony 700 2.8 | `0x12F0E` | `0x12F4E` | `0x17F32` |
| Harmony 600 0.2 | `0x11C90` | `0x11CD0` | `0x165CE` |
| Harmony One 3.4 | `0x26E98` | `0x26ED6` | `0x297AA` |

The send dispatcher copies the record pointer into a different RAM variable per class, `0x3CA`,
`0x3BD`, `0x3AF` for classes 1, 2 and 3 and none for class 4, and jumps to a different routine.
`0x3BD` is the variable section 32 traced.

### What this changes

**The other three classes cannot be derived from the corpus, because no config in it uses one.**
That is a different problem from the one the roadmap describes, and a harder one: the only evidence
available is the firmware, and the only test available is that the reading is self consistent,
since there is nothing to decode against.

**The records section 32 cannot frame are class 1 as well**, 617 of them across the corpus. So the
arch 8 "second population with headers near 303 and 310" that `docs/config-format.md` attributes to
another encoding class is nothing of the sort. Whatever it is, it is inside class 1, and it needs a
better class 1 reader.

### What the class 1 loader reads

Enough of it to say where section 32's header of fourteen skipped bytes comes from. From the
record's real start the loader reads a `u8`, then a `u24` duration in units of 0.1 microseconds
which it clamps to 256000 and divides by four when it exceeds a byte, setting the Timer 2
prescaler to match, then a second `u24` the same way, and writes both into a RAM pair. Those are
the two values the carrier timer is loaded from.

### What is not established

**What arch 9's 5 means.** No arch 9 firmware exists here, so it is either a fifth class its
firmware implements or a different field entirely, and the corpus cannot tell the two apart.

**Classes 2, 3 and 4**, for the reason above.

**The rest of the class 1 record**, beyond the two carrier durations and section 32's mark and
space stream.

## 43. Base slot 12 is the timer table

The section that runs an action later. It is the thirteenth of twenty base slots to be named, it is
the one that explains where a Harmony's backlight timeout and its two hour power off live, and it
closes with the cleanest fit in this document so far.

### The subsystem in RAM

One module on the Harmony 700 image, `0x173EC` to `0x17940`, and nothing outside it touches its
data. That data is an array of **four** entries of five bytes at `0x06E5`:

```
+0x00  u8   flags       bit 0 armed, bit 4 scheduled rather than counted in software
+0x01  u8   index       which base slot 12 record this timer is running
+0x02  u24  remaining
```

Every access to it multiplies the entry number by five, so the module is found by looking for
`MULLW 0x05`. There are **exactly 30 such sites in one contiguous block on all four images**, the
700, the complete 600, the 650 and the Harmony One, which is the same subsystem four times.

Three entry points, and all three are the shape the name predicts:

| routine, 700 | what it does |
|---|---|
| `0x17536` | **start**: take the first entry that is not armed, arm it, and load its duration |
| `0x176E4` | **cancel**: find the entry running a given index, disarm it and clear the index |
| `0x17448` | **poll**: for each armed entry whose remaining is zero, disarm it and queue its instruction |

### The record

Both start and cancel take an index in the same register, and start reads the record with it:

```
seek base slot 12
read u8 count
TBLPTR += 3 * index
follow the three byte pointer
read u8            the kind
read u24           the duration
```

The poll routine reads the same record and skips the first four bytes, which is the kind and the
duration, then reads a `u24` and hands it to `0x0E93E`. That routine copies three bytes into
`0x1AD` to `0x1AF` and calls the queue push, so the last three bytes of the record are **one action
list instruction**. Four skipped bytes plus three is seven, and seven is what the corpus says:

```
+0x00  u8   kind
+0x01  u24  duration
+0x04  u24  the instruction queued on expiry
```

Across the ten user configs the pointers land on 159 records, and **every gap between consecutive
records is exactly 7**, with one exception per config on arch 8 and arch 12, where the records sit
in two runs rather than one. Nothing is left over and nothing overlaps.

### The closure

The instruction that starts a timer is opcode `0x1F` with the operand's high byte `0xEB`, and the
one that cancels it is `0xEA`, both in the descending ladder section 39 read the arithmetic
branches of. The operand's low byte is the index. So the config states, twice and independently,
how many timers it has: once as the section's count, and once as the set of indices its action
lists name.

| config | arch | records | distinct indices started | cancelled | out of range |
|---|---|---|---|---|---|
| 700, both configs | 14 | 9 | 9 | 7 | none |
| 600 | 14 | 5 | 5 | 3 | none |
| 525 | 9 | 5 | 5 | 2 | none |
| One, programmed | 12 | 30 | 30 | 23 | none |
| One, unprogrammed | 12 | 28 | 28 | 21 | none |
| 880 a | 8 | 19 | 19 | 12 | none |
| 880 b, c, d | 8 | 18 | 18 | 12 | none |

**The set of indices started is exactly `0 .. count - 1`, in all ten**, four architectures, counts
from 5 to 30. Not a subset and not an overrun: every record is reachable and no instruction names
one that is not there. The cancelled set is a subset of the started set every time, which is what
a cancel means.

The three safe mode configs are the negative case: no slot 12 records and no `0xEB` or `0xEA`
instruction anywhere. A recovery image has nothing to schedule.

### The unit is one second

`T1CON` is set to `0x1E` at `0x1B908`: Timer 1 clocked from its own oscillator, not synchronised,
oscillator enabled, **prescale 1:2**. The scheduler's tick, `0x14C22`, samples `TMR1H` and takes
bits 7 and 6 of it as a four phase counter, so one tick is `2 * 256 * 64` oscillator periods, which
is `2^14`. The Timer 1 oscillator on this part exists for a 32.768 kHz watch crystal, and
`32768 / 2^14` is exactly 1 Hz.

The corpus agrees. The durations across all 159 records are 1, 2, 3, 4, 5, 10, 20 and one value of
**7200**, which is exactly two hours. Every other value is a plausible interface timeout in
seconds, and the outlier is a round number of hours rather than a round number of anything else.

Marked as inferred rather than measured on one point: the crystal frequency is the standard one
for that peripheral and nobody here has put a scope on the board.

### Two kinds, one of them unused

The record's first byte selects how the timer is counted. The corpus carries `1` in **all 159
records**, which arms the one second scheduler above. `0` instead leaves the entry to `0x177D8`,
which decrements the full 24 bit remaining by one per call from somewhere this project has not
followed, because no config asks for it. The two paths are distinguished at run time by bit 4 of
the RAM entry's flags, and the scheduled path clamps the duration to sixteen bits on the way in,
so a config asking for more than 65535 seconds silently gets 65535.

### What the instruction is

Of the 159, 116 carry opcode `0x7F` and 41 carry `0x7E`, with one `0x07` and one `0x1F`. `0x7E`
enters a mode, section 37, and `0x7F` is placed in section 34. So a timer is not a macro: it fires
exactly **one** instruction, and anything longer is expressed by making that instruction run an
action list. That is a constraint on a writer, and it is the sort that would otherwise be found by
emitting a two instruction timer and watching only the first one run.

### What is not established

**Which timer is which.** The section is sized, its records are decoded and every one of them is
reachable; nothing here says that index 3 on the 600 is the backlight.

**The software counted kind**, for want of a config that uses it.

**Where the four RAM entries are copied back from the scheduler.** The poll routine tests the RAM
entry's remaining while the scheduler counts down its own sixteen bit copy, and the routine that
reconciles the two was not read.

## 44. Base slot 15 is the parameter block, and the firmware checks every group's length

Section 38 found that the firmware compares this section's entry count against a literal, 9 on
arch 14 and 11 on arch 12, and could say no more than "a membership test over a per architecture
fixed size set". It is not a set and it is not a membership test. It is a **block of numbered
parameter groups**, and the count check is one of eight of the same kind.

### The shape

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   entries
+0x01  u16  value[entries]
```

The groups sit in one contiguous run immediately before the pointer array, and on arch 8, arch 9
and arch 14 the run's length is **exactly** the sum of the groups, so nothing is unaccounted for.
On arch 12 there are twelve spare bytes in the run, which is the only untidy number here.

### The guard, which is the whole point

`0x0F8F0` on the Harmony 700 and `0x23262` on the One are one routine with two arguments, a byte
offset into the pointer array and an expected length:

```
seek base slot 15
read u8 count, and return 0 unless it is 9 (11 on the One)
TBLPTR += offset
follow the three byte pointer
read u8 and return whether it equals the expected length
```

Every caller does the same thing with the answer: if the length is right it reads that many `u16`
values out of the group, and **if it is wrong it uses constants compiled into the firmware
instead**. So a group whose length a writer changes is not rejected, it is ignored, exactly like
the section count in section 38.

### The closure

The call sites give the expected length per group, and they are literals in the code rather than
anything derived from a config:

| group | arch 14 expects | arch 12 expects |
|---|---|---|
| 0 | 1 | 1 |
| 1 | 4 | 6 |
| 2 | 1 | |
| 3 | 4 | |
| 4 | | 6 |
| 5 | 14 | 16 |
| 6 | 14 | |
| 7 | 1 | 1 |
| 9 | | 6 |
| 10 | | 8 |

Fourteen predictions from two images, and **every one of them holds in every container of its
architecture**: the two Harmony 700 configs, the 600's, both Ones', and the three safe mode
containers, thirteen in all. The numbers differ between the architectures in four places, so this
is not one constant matching everywhere; it is each firmware's own table matching its own configs.

A blank in the table means no call site was found on that image, not a length of zero. Arch 8 and
arch 9 have no row because no firmware for either exists here.

### What some of the groups hold

Named where the consumer says so, and left alone where it does not.

**Group 7 is a timeout in seconds.** One value, handed to the same one second scheduler the timers
in section 43 use, with a compiled in default of 10. Every config in the corpus carries 0.

**Groups 5 and 6 are a measurement to level curve**, and there are two of them because the consumer
picks between them on a run time condition. The consumer walks the list comparing a stored sixteen
bit measurement against each entry and counting how many it exceeds, capped, which turns a reading
into a small integer. The values are non decreasing and end in a repeated sentinel:

| container | arch | curve |
|---|---|---|
| Harmony 700 | 14 | 2025, 2075, 2375, 2425, 2475, 2525, then 3300 eight times |
| Harmony 600 | 14 | 2025, 2075, 2100, 2125, 2200, 2525, then 3300 eight times |
| Harmony One | 12 | 3000, 3015, 3627 ... 4025, 4051, then 9999 twice |
| Harmony 880 | 8 | 2500, 2515, 3600 ... 4030, 4045, then 9999 four times |

**Read as millivolts these are battery curves, and that is a conjecture rather than a finding.**
What supports it: the same module reads the analogue converter, `ADCON0` and `ADRESL`/`ADRESH` at
`0x0F938`, and the ranges are the right ones for the cells those remotes take. The 600 runs on two
alkaline cells, and 2025 to 2525 mV is 1.01 to 1.26 V each. The One has a lithium pack in a
charging cradle, and 3000 to 4051 mV is exactly a single lithium cell from empty to full. The
sentinels are 3300 on arch 14, which is the regulator rail, and 9999 on the others, which is above
anything measurable. What is missing: nobody has put a meter on a board, and the scaling between
the converter's counts and those numbers was not followed through.

**Group 4 is `96, 98, 308, 310, 768, 770` in all twelve containers on arch 8, 12 and 14**, three
pairs two apart, which is the shape of three thresholds with hysteresis. Arch 9's equivalent group
is `600, 602, 766, 769`. What they threshold is not established.

### The numbering is per architecture

Arch 9 carries five groups where the others carry nine or eleven, and its contents line up with a
subset of arch 12's in a different order: its group 0 is arch 12's group 2, its group 1 is arch
12's group 3, and so on. **A group index is not portable**, which is worth stating because every
other section indexed so far transfers between architectures by base slot.

### What is not established

**What groups 0, 1, 2, 3, 8, 9 and 10 hold.** Each has a consumer address and a length; none has a
name.

**Whether the curves really are millivolts**, per the paragraph above.

**The twelve spare bytes** in the arch 12 run.

## 45. Base slot 17 is the touch screen hit map, and that is the last unnamed pointer

The Harmony One is the only remote in this project with a touch panel, and this is the only section
that only arch 12 populates. Those two facts turn out to be the same fact.

### Why it took until now

Section 38 filed slot 17 as "not an array by the usual header", and the reason it looked that way
is that the corpus's arch 14 configs, which everything here is decoded on first, all carry a count
of **zero**. So does the arch 9 sample, so do all four arch 8 ones, and so do all three safe mode
containers. Eleven of thirteen containers say nothing at all. The two that do are the Harmony Ones.

There is a general lesson in that. The rule "prefer arch 14, then port" is right for reading code
and wrong for finding data, because a section is only visible in a config that uses it.

### The structure

Two levels of the usual count prefixed pointer array, over a twelve byte record:

```
+0x00  u8   pages
+0x01  u24  page[pages]
```

each page

```
+0x00  u8   areas
+0x01  u24  area[areas]
```

each area

```
+0x00  u16  x
+0x02  u16  width
+0x04  u16  y
+0x06  u16  height
+0x08  u8   the key code a hit reports
+0x09  u24  the record's own address
```

The arithmetic closes twice over. A page's records are laid out contiguously **immediately before
the page's own header**, so the last one ends exactly where the header starts: true for 42 pages of
42 and 32 of 32. And every record's last three bytes are its own address: 247 of 247 and 182 of
182. That back pointer is the same device section 42 found in the infrared records.

### The firmware, which leaves nothing to infer

The consumer is `0x25D70` on the Harmony One 3.4 image. It seeks raw slot 19, indexes it by a page
number, reads the page's count, and then walks the records doing exactly this, at `0x25E5A` to
`0x25EC4`:

```
if X >= x and X < x + width and Y >= y and Y < y + height:
    return the byte at +8
```

sixteen bit compares throughout, half open on both axes, and it **returns on the first match**
rather than continuing. The point comes from `0x217`/`0x219`, filled at `0x2621C` from a serial
packet whose coordinate is assembled as `(high & 0x1F) << 8 | low`. Thirteen bits, which is the
usual packing for a resistive panel controller, and the largest coordinate any rectangle reaches is
4437.

First match winning matters for a writer: **104 pairs of rectangles on the same page overlap**, so
the order of a page's records is part of the data and not incidental.

### The codes, and what a page looks like

The byte at +8 takes exactly ten values in both configs, and a page's records carry them in a fixed
order. Writing them as offsets from `0x30`:

| page size | codes, in order |
|---|---|
| 2 | `0x2E 0x2F` |
| 3 | `0x30`, then those two |
| 4 to 8 | `0x30` upward, consecutively, then those two |
| 9 | `0x30` to `0x35`, `0x2B`, then those two |
| 10 | `0x30` to `0x35`, `0x2B`, `0x2C`, then those two |

All nine shapes occur in both configs and there is no tenth. So a page is **up to eight selectable
items plus two that are always there**, and the two that are always there are, in the geometry, a
tall narrow strip at each edge of the panel: `x = 765` and `x = 3556`, both 492 wide and 2000 high.
Scroll up and scroll down is the obvious reading of two edge strips present on every page including
the one that has nothing else.

The ten codes are `0x2B`, `0x2C`, `0x2E`, `0x2F` and `0x30` to `0x35`, which are 43, 44, 46, 47 and
48 to 53. **The One's key table carries a block of scan codes 43 to 53** where the arch 14 remotes
number 41 to 54 contiguously, and the touch map uses ten of that block's eleven. So the panel feeds
the same key path the keypad does, which is why nothing else in the config had to know about it.

### The geometry is not user data

The two Harmony One configs come from different remotes with entirely different setups, 4277 action
lists against 2141, and their touch maps share **70 of the 70** distinct nine byte payloads the
smaller one carries; the larger adds five. The 35 distinct rectangle sizes are identical between
them. What differs is how many pages there are, 42 against 32.

That is what says this is a layout resource rather than a user's configuration, and it is also why
no amount of diffing the Harmony 700 pair could ever have found it.

### What is not established

**What a page corresponds to.** 42 and 32 match no other count in either config.

**The panel's own coordinate range.** Thirteen bits is what the packet can carry; the largest
rectangle runs to 4437, which is either the panel's edge or deliberately past it.

**Why one code of the eleven, 45, is missing** from the map while the key table has it.

## 46. Base slot 7 is the font table

Section 40 placed the slot, as the table the screen language's opcode 16 indexes, and left its
targets unread. They are glyphs, and with them a config's text can be drawn.

**Corrected in place.** The first version of this section, committed the day before, read the byte
at the start of a set as its slot count. It is the **glyph height**. That single mistake cut every
set from 46 to 76 glyphs down to 8 to 18, made the corpus look like 913 images when it holds 3933,
and then produced a second, worse error: the inline strings' codes appeared to run past the end of
the set their program selected, and this section declared the obvious reading ruled out. It is not
ruled out; it is right, and the closure below is as clean as any in this document. The lesson is
the one section 17 already recorded in different words: **when a structure refuses to make sense,
suspect the field assignment before writing up the anomaly.**

### The set

```
+0x00  u8   glyph height in pixels, shared by every glyph in the set
+0x01  u8   the glyph count on arch 12, and 1 on arch 8, 9 and 14
+0x02  u8   the glyph count on arch 8, 9 and 14, and 0 on arch 12
+0x03  u24  glyph[count]     NULL for a code this config never draws
```

The count is the same for every set in a container and differs between containers: 75 on the
Harmony 700, 71 on the 600, 73 and 72 on the two Ones, 74 to 76 on the arch 8 configs, 66 on the
525 and 46 in all three safe mode containers. So it is a character set size, chosen per config
rather than per typeface, and most of its codes are NULL because a config ships only the glyphs its
own text uses.

Which of the two header bytes holds it is **measured rather than explained**. On arch 8, 9 and 14
the byte at `+0x01` is 1 in every set of every container and the count is at `+0x02`; on arch 12 it
is the other way round with a zero in the spare byte. The firmware reads the pair as a single `u16`
and never bounds a glyph code with it, so the code does not settle the question either.

### The glyph

```
+0x00  u8   width in pixels
```

then a stream of one byte operations:

| byte | meaning |
|---|---|
| `0x00` | end of glyph |
| `0x80` plus n | n pixels of the background, not stored |
| n, below `0x80` | n literal pixels follow, **two bytes each** |

A row is exactly `width` pixels and the next one begins as soon as that many are accounted for.

### Three closures

**Every row comes to exactly `width`.** 3933 glyphs across arch 8, arch 12 and arch 14, every
stream ending on `0x00` with no row half finished. The operations are variable length and nothing
marks a row boundary, so one wrong pixel size desynchronises everything after it.

**Every glyph produces exactly the height its set declares.** 3933 of 3933. The height is stored
once, in the set header, and recovered 3933 times from streams that never mention it.

**Every inline string resolves.** Walking every reachable screen program and tracking which font
opcode 16 last selected, **16054 glyph codes across twelve containers land on a non-NULL glyph of
that font**, with the code taken as one based. Not one is out of range and not one hits a NULL
slot. Zero is the string terminator, which is why the index is the code minus one, exactly as the
firmware does it at `0x185E4`.

### The wrong pixel size scores near zero

The calibration this project asks for, on a decode rather than on an address. The same decoder with
a one byte pixel:

| config | two byte pixel | one byte pixel |
|---|---|---|
| Harmony 700 | 130 of 130 | 11 of 130 |
| Harmony One | 147 of 147 | 0 of 147 |
| Harmony 880 | 66 of 66 | 6 of 66 |

**Arch 9 is not covered.** The Harmony 525's glyphs share the `0x00` terminator and nothing else
this decoder understands, and no arch 9 firmware exists here, so `gspm.images` refuses that
architecture rather than producing a plausible wrong bitmap.

### The firmware

Opcode 16's handler at `0x18508` on the Harmony 700 reads its one byte operand, seeks base slot 7,
reads the section's `u16` count, indexes by the operand and stores the resulting `u24` into
`0x398` to `0x39A`. That is the pointer section 40 found the renderer using and could not trace to
a source.

The renderer, at `0x185E4`, seeks that address, skips one byte, reads a `u16`, and then indexes
what follows at stride three by **the code minus one** before following the pointer. Skipping one
and reading two is the three byte header above, so the index lands on `glyph[code - 1]`.

### They are letters

`tools/screen_dump.py --strings` draws each inline string through the font its own program
selected. The Harmony 700's come out as readable labels of the form `(0 sec)`, `(0.1 sec)`,
`(0.2 sec)`, which are the delay choices in its menus. That exercises the whole chain in one go:
the program walk, opcode 16, the code minus one, and the bitmap decoder.

The pixel is sixteen bits and fifteen distinct values occur across the corpus, dominated by
`0xFFFF` and `0x0000`. Whether those are RGB565 is not established and does not matter to the
decode.

### What is not established

**Which header byte is the count**, per the paragraph above.

**What the glyph codes mean.** They are a per config character set, so code 5 is a space in the
700's configs and nothing says it is a space in anyone else's. A writer that wants to add text has
to build a set and number it, not look a character up.

**Arch 9's packing.**

## 47. Base slot 2 is the log area, and the pointer table is fully named

Slot 2 was the last of the twenty base slots that was neither named nor NULL. It is not a pointer
to a structure at all: it is three numbers reserving a region of flash **above the config** that the
firmware appends to and never erases.

### Why it was last

Two reasons, and both are methodological rather than accidental.

It does not look like the other sections. Every named slot so far is a count prefixed pointer array
or a framed record, so the eye that has read fourteen of those reads eight bytes and expects a
header. There is no header. Eight bytes on arch 8, 9 and 14, nine on arch 12, and every byte of
them is a field.

And the architecture this project decodes first never reads it. The census of calls to the section
seeker `0x10B92` on the Harmony 700 2.8 image returns raw slots 3 to 17 with no site for slot 2,
while the same census on the One's `0x2BA76` returns raw 2 to 19 with only the arch 14 NULL at 8
missing. So the standard method, follow the seek to its consumer, has nothing to follow on arch 14.
That is the same trap as section 45: **"prefer arch 14, then port" is a rule about reading code, and
it goes wrong when the thing to find is only exercised somewhere else.** Twice now.

### The structure

```
+0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
+0x02  u24  start           the first byte of the region
+0x05  u24  limit           one past its last byte
```

The field boundaries are fixed by arithmetic before any code is read, because
`limit - start == capacity * stride` holds in all thirteen containers with one stride per
architecture:

| | capacity | start | limit | span | stride |
|---|---|---|---|---|---|
| arch 14, both user configs | 16384 | `0x1E0000` | `0x200000` | 131072 | 8 |
| arch 14, all three safe mode | 16384 | `0x0E0000` | `0x100000` | 131072 | 8 |
| arch 9, Harmony 525 | 8192 | `0x070000` | `0x080000` | 65536 | 8 |
| arch 8, all four | 15360 | `0x1E0000` | `0x1FE000` | 122880 | 8 |
| arch 12, both Harmony Ones | 16 | `0x3FFFF0` | `0x400000` | 16 | 1 |

The calibration is the wrong split. Reading the leading field as a `u24` on the eight byte
architectures leaves two bytes for the limit, and the region that describes is then **smaller than
one unit of the capacity it declares** in every container. The correct split divides exactly in
every container.

Two independent things say the region is real rather than an artefact of a lucky division. It sits
**above the config's own `end_addr`** in all thirteen, and its `limit` is a round flash boundary in
all thirteen: `0x080000`, `0x100000`, `0x200000` or `0x400000` exactly, with arch 8 the one that
stops 8 KiB short of 2 MiB.

### What the arch 12 firmware does with it

One reader and one writer, and only on arch 12.

**The boot scan**, `0x2DB4C`, called once from `0x28AF8` inside the init sequence at `0x28AE0`. It
seeks raw slot 2, reads the capacity into `0x2E8` and the start address into `0x2E5`, then walks
`capacity` bytes from `start` and remembers the address and the remaining count of the **last byte
that is not `0xFF`**. That is the whole state: the append position is recovered from the erased
pattern rather than stored anywhere, which is what an append only journal in flash does.

**The append**, `0x2DC0A`, writes the single byte in `0x2EB` at that position through
`0x2B85E`, then increments the address and decrements the remaining count. It has two rails of its
own, both compiled in rather than taken from the config:

* the address must be inside `[0x040000, 0x400000)`, and outside it the routine **zeroes the
  remaining count**, so a config declaring a bad region disables the facility instead of writing
  somewhere it should not;
* it refuses once the remaining count reaches zero, so the region cannot overrun its `limit`.

Both routines reach the external NOR through the same windowed sequence: the address's high byte
minus 3 goes to `0x020025` through `TBLWT`, and the high byte is then replaced by `0x13`.

### What appends

All ten call sites of `0x2DC0A` are in one dispatcher at `0x25688`, which is a branch of the
**same descending operand ladder** that starts and cancels timers in section 43. The ladder has
already established `0xE0 <= operand high <= 0xEF` when it reaches this point, and the low nibble
selects the case. Decoded with `chains.xor_chain(code, 0x20000, 0x25688)`, since an `XORLW` chain's
literals are not its case values:

| case | operand high | at | appends |
|---|---|---|---|
| 1 | `0xE1` | `0x256A0` | one byte, from `0x0E14` |
| 2 | `0xE2` | `0x256A6` | two bytes, from `0x0E15` and `0x0E16` |
| 3 | `0xE3` | `0x256BC` | six bytes, from `0x108`, `0x109`, `0x10A`, `0x10B`, `0x10D`, `0x10E`, in that order reversed |
| 4 | `0xE4` | `0x25702` | three bytes, filled by `0x2D6FE` from a pointer to them |
| 5 | `0xE5` | `0x25734` | two bytes, the sixteen bit value `0x2372A` returns in `PROD` |

Every case ends by branching to the same final `CALL` at `0x25756`, which is why ten call sites
cover fourteen appended bytes. So the record is **one to six bytes with no length prefix and no
tag**: whatever reads the region back has to know the shape from the case, which means the reader
is not on the remote.

Cases 4 and 5 pre-load their bytes with `3, 2, 1` and `2, 1` before the call that overwrites them,
so those are defaults for a call that can fail. What the two sources compute is not established.

**No config in the corpus uses any of them.** A census of every action list instruction in all ten
configs finds no `OPCODE_SELECT_HANDLER` with an operand high of `0xE0` to `0xE6`. This is the
second section in that position, after the number sender of section 39: firmware that exists, is
reachable, and that Logitech's generator never emitted. It is worth saying plainly that this makes
the naming rest on the firmware alone.

### What is not established

**What is logged.** The case names the record shape and the RAM addresses it copies; what those
addresses mean at the moment of the call has not been traced, and no config triggers one to
observe.

**The stride of 8 on arch 8, 9 and 14.** It is exact in nine containers, so it is a field boundary
rather than a coincidence, but no code that reads this section on those architectures has been
found. The arch 14 application does not, and the obvious remaining candidate is the bootloader in
the internal `0xFE` page, which has not been searched.

**Whether anything is in there.** Reading `0x3FFFF0` off a Harmony One would say whether those
sixteen bytes are erased, and that read has not been done.

### Where it lands

`gspm.LogArea`, `gspm.Container.log_area` and `gspm.Container.log_reference`, with `LOG_STRIDE`
carrying the per architecture table. `tests/test_interpreter.py::TestTheLogArea` pins the field
split, the calibration, the two firmware routines, the arch 14 negative and the empty corpus
census.

With this, **every one of the twenty base slots is accounted for**: 0 and 1 are the header records,
2 to 17 are sixteen named sections, and 18 and 19 are NULL in all thirteen containers.

## 48. The button mapping experiment, predicted before it is run

This section is written **before** the measurement, which is the point of it. A hardware result
that confirms a number nobody committed to in advance is worth much less, and this experiment has
failed three times upstream, so it is worth being explicit about what would count as a success.

### The variable to watch

Section 13 read the arch 14 keypad scanner: a 14 by 4 matrix, rows active low, returning
`row * 4 + column` as a linear index from 1 to 56, with 0 for no key. What it did not do is say
where that index is kept, and that is what a live read needs.

The handler is `0x1937A` on the Harmony 700 2.8 image. It calls the scanner, and:

* stores the fresh code in a local, `0xD07`;
* returns immediately if it equals the code already held, which is the debounce;
* on a change, writes the fresh code to `0x3A4` and then to `0x3A2`;
* raises the event by **ORing the event type onto `0x3A2`**, at `0x193AC`:
  `MOVLW 0x40 ; MOVLB 3 ; IORWF 0x3A2,W`. `0x40` is the release type of section 17.

So `0x3A2` holds the **bare scan code with no event bits**, which is exactly the number a config's
key table indexes by.

The bench remote is a 600, not a 700, and the RAM layout is per build rather than per architecture.
The same three instruction shape appears twice in the complete 600 0.2 image, at `0x179FA` and
`0x17A44`, naming bank 7 offset `0x3D`. Tracing `0x73D` in the 600 and `0x3A2` in the 700 returns
**seventeen accesses each, of the same kinds in the same order**, with a partner variable of three
accesses each, `0x73F` against `0x3A4`. That correspondence is the reason for believing the port
without a second measurement.

Arch 12 has no such helper section behind it, so it is a weaker prediction. The One 3.4 image
carries the same shape at two places, naming `0x2FB` and `0x202`. `0x2FB` traces like the arch 14
variable, fifteen accesses with the same clear, OR and store pattern and a fresh code arriving from
`0xD04`; `0x202` is read from inside the `0x2FB` handler, so the two are related and which is the
keypad is not settled. The One is the remote with a touch panel and section 45's hit map, so a
second event source is expected to exist.

| remote | data address | from |
|---|---|---|
| Harmony 600 | `0x073D` | 600 0.2, `0x179FA` and `0x17A44` |
| Harmony 700 | `0x03A2` | 700 2.8, `0x193AC` |
| Harmony One | `0x02FB`, and `0x0202` as the other candidate | One 3.4, `0x2BF00`, `0x2BF6E`, `0x25F24`, `0x25F8A` |

### The predictions

1. **At rest the variable reads 0**, and it returns to 0 when the key is let go, so a press and a
   release are two observable transitions.
2. **A held key reads a value in 1 to 56 on the 600**, from the scanner's own range, and the top
   two bits are clear, because the event type is ORed on somewhere else and never stored here.
3. **Every value observed appears in that unit's own key table.** The 600's config carries 54
   distinct scan codes in three event classes, section 17, and a pressed key that produced a code
   outside that set would falsify the whole chain rather than just this reading.
4. **The map is dense but not complete**: 54 codes over 56 matrix positions, so at most two
   positions have no config entry, and the 600 has fewer than 54 physical buttons, so some codes
   belong to no button at all. A key that produces nothing is therefore not automatically a
   failure, and the codes that no key produces are as much of the result as the ones that do.
5. **`0x2FB` on the One is the keypad and `0x0202` is not.** This is the one prediction that is a
   guess rather than a reading, and it is written down so that being wrong costs something.

### Why polling is enough

The read costs one USB exchange, so the loop runs at tens of hertz, and a key press held by a human
lasts an order of magnitude longer than that. The debounce works in the remote's favour here too:
the handler ignores a repeat of the same code, so the variable holds steady for as long as the key
is down rather than flickering.

The tool is `packages/usb/bin/watch-keys.ts`, `make watch-keys`. It only reads, it prints one line
per change, and it seeds itself from the resting value so the first read is not reported as a
press.

*The result goes in this section, below this line, and the predictions above are not edited.*

### The result: the experiment cannot be run this way, and it produced a quarter of the answer

Measured 7 August 2026 on the bench Harmony 600, firmware 0.2, every one of its 54 buttons pressed
by hand while the host watched over USB.

**Predictions 1 to 5 are all unresolved rather than confirmed or refuted, because the premise
underneath them is wrong.** A remote attached to USB shows a sync screen and **does not run its
application**, so the keypad handler never runs, `0x73D` and `0x73F` never change, and no scan code
is ever computed. The resting values are 0 and 6 and they stayed at 0 and 6 through every press of
the session. Prediction 1 is technically true of `0x73D` and means nothing.

That is not a setup mistake, and it was checked three ways. The remote enters sync mode
**immediately on being plugged in**, before the host sends anything, so it is not our traffic that
puts it there. It stays there after the host closes the handle. And the row lines never move: 246
consecutive samples of `PORTA`, `PORTD` and `PORTE` at rest returned one constant value each, and
across the whole session they never changed once, including during presses.

**What the firmware does instead is legible and is the reason a quarter survives.** It parks all
fourteen row lines low at once and enables interrupt-on-change on the column port, so that any key
pulls its own column down and wakes the part without a scan. That parked state is exactly what
makes the row unobservable and the column observable:

```
PORTB  0xFE   at rest, top nibble all high, no key
PORTB  0xDA   Menu held, bit 5 low
```

Since the scan code is `row * 4 + column`, a press reports **`(code - 1) mod 4` and nothing else**.

### The census, and the closure it produces

All 54 buttons, every one of which reported a column, so there is no button on this remote wired
outside the matrix. The table is in `tests/test_keypad.py`; the census is:

| column | buttons |
|---|---|
| 1 | 14 |
| 2 | 14 |
| 3 | 13 |
| 4 | 13 |

**A column has exactly 14 positions**, so two of those numbers are at the hard ceiling and the
other two are one short. Now the independent artefact. The 600's own config, read off that same
unit, carries **54 keypad scan codes, contiguous 1 to 54**, so of the 56 matrix positions exactly
55 and 56 are unoccupied. `column_of(55)` is 3 and `column_of(56)` is 4.

The measured deficit is one in column 3 and one in column 4. It agrees exactly.

Nothing was fitted to make that happen. The buttons were counted off a photograph and pressed in a
written order; the scan codes come out of a config generated by Logitech's software years ago. The
weakest link in the chain, section 17's claim that a key code is an event type plus a scan code and
that the 600's 162 records are 54 codes in three classes, has now been **checked against the
hardware for the first time**, and so has the scanner's `row * 4 + column` arithmetic from section
13.

### What is now known, and what is not

Known: the Harmony 600 has 54 matrix buttons and 56 matrix positions; scan codes 55 and 56 belong
to no button, so a config that binds them binds a key nobody can press; and for each of the 54
buttons, the scan code modulo 4.

Not known: the row, which is 14 candidates per button. The offline route through the config was
checked and does not exist: slot 0's named tree holds state variable names (`TV_Power`,
`CurrentActivityState`) and no button or command names.

Three leads for the row, none of them run:

* **The four bound scan codes.** Base slot 8 names exactly four in every arch 14 config, the same
  four in the 600 and both 700s: 2, 8, 9 and 34, in columns 2, 4, 1 and 2. Being identical across
  three configs of two models makes them firmware level buttons rather than user bindings. Three of
  the four columns match `power`, `more activities` and `devices`, which is suggestive and is not
  evidence.
* **Their rows are low**, 0, 1, 2 and 8, and the top of the remote is where the special buttons are.
  If the matrix is wired roughly top to bottom the ordering constrains a lot.
* **The Harmony One.** Written here as "worth more, because its matrix is 7 by 8, so a press is
  worth `(code - 1) mod 8`". **Both halves of that are wrong and the next subsection is the
  measurement that says so.** The 7 by 8 came from an upstream matrix encoding that section 17
  already discarded, and it was never established for arch 12 by anything in this project.

**The route that would finish it is blocked on purpose.** `WRITE_MISC` selector `0x07` writes a
byte into the data memory of a running remote, so a host could drive the row lines itself and read
the matrix out completely, which is precisely what the parked firmware will not do. That is a write
to a live device, on arch 14, where `packages/usb/src/rails.ts` allows no write target at all. It
is recorded here as the shape of the answer, not as a plan.

### Arch 12 gives nothing at all, and that is the interesting half

The spare Harmony One was attached the same evening. It enters sync mode on being plugged in
exactly as the 600 does, so that behaviour is a property of the family rather than of one model.
Then the same measurement, and the result is a clean negative.

**Sixteen distinct buttons, spread over the whole remote, every one of them pulled the same single
bit.** Four in a first pass, twelve chosen for maximum physical separation in a second: `power`,
`activities`, `help`, `menu`, `exit`, `guide`, `channel up`, `mute`, `fast forward`, `record`, `3`,
`enter`. Every press is `PORTB` bit 5 and only bit 5. No other bit on any of the seven ports moved
once in the whole session, and `0x2FB`, the arch 12 equivalent of the variable the 600 would not
update, did not move either.

**Bit 5 is therefore not a column line, and that is a proof rather than an impression.** A column
holds at most as many buttons as the matrix has rows. The One has 40 physical matrix buttons, so
for sixteen of them to share one column the matrix would need at least sixteen rows and at most
three columns, and then the other two column lines would have shown up among sixteen presses drawn
from every region of the remote. They never did.

The firmware agrees. A search of the One 3.4 image for the shape the arch 14 column reader has, a
run of `BTFSS port,bit ; RETLW n`, **finds nothing at all**, where both arch 14 images have exactly
one. What arch 12 has instead is the pattern upstream describes for arch 9: a binary search for the
key over a **single sense line**, driven by a table of masks. A single sense line is precisely what
sixteen buttons on one bit looks like.

So the ceiling is not the same on the two architectures:

| | wake mechanism observed | what USB yields |
|---|---|---|
| arch 14, Harmony 600 | interrupt-on-change per column, four lines | the column, `(code - 1) mod 4` |
| arch 12, Harmony One | one shared sense line | that a key is down, and nothing else |

One incidental observation, recorded because it was not looked for. A single tap on the touch panel
pulled `PORTB` bit 4 low and **it stayed low** for the rest of the session, where a keypress
releases within a fifth of a second. So the panel is a separate input on its own line with its own
latching behaviour, which is consistent with section 45: its codes are the 43 to 53 block and they
do not come out of the matrix.

**A prediction, written before anything tests it.** The One has 42 buttons in the photograph, two
of which are the touch areas flanking the screen, leaving 40 in the matrix. Its config carries
scan codes 1 to 40, then 43 to 53, then 55. So the 40 matrix buttons should be codes 1 to 40, the
43 to 53 block is the touch panel, and **55 is not a button**. Nothing here tests that.

### Where it lands

`packages/usb/bin/watch-columns.ts`, `make watch-columns`, which reads `PORTB` and reports a column
per press, and `watch-keys.ts --address --mask` for watching a port with unrelated traffic in it.
`tests/test_keypad.py` pins the 54 measurements and the closure against the config.

## 49. Most of a config is a region nothing named reaches, and screen opcode 2 is its only referent

Found by the byte accounting of milestone M2 rather than by looking for it, which is the argument
for having built the accounting first. With sixteen sections named and the two largest readers
ported, the Harmony 600 is 24.5% attributed and the Harmony One 7.2%. The rest is not scattered
across the file. It is one region at the top of it.

### The region

Take the highest byte any structure this project can name reaches, and everything above it. **The
figures below were measured when two readers had been ported and are therefore stale**; with every
reader landed the region is 61.1% of a Harmony 700, 58.8% of a Harmony 600, 81.4% of a Harmony One
and 3.9% of the arch 9 sample. The ranking does not change, which is the point of leaving them:

| sample | highest named structure | container ends | the region |
|---|---|---|---|
| Harmony 700 | `0x052C5F` | `0x0EF0F0` | 631953 bytes, 64.5% |
| Harmony 600 | `0x043AA7` | `0x0B4365` | 460990 bytes, 62.5% |
| Harmony One | `0x048BC6` | `0x198680` | 1374394 bytes, 82.2% |
| Harmony One, spare | `0x01DE24` | `0x12CD6D` | 1109833 bytes, 90.1% |
| 880, arch 8 | `0x025EBA` | `0x06C760` | 289446 bytes, 65.2% |
| 525, arch 9 | `0x011FD0` | `0x013296` | 4806 bytes, 6.1% |
| the three safe mode | `0x000879` | `0x001BCB` | 4946 bytes, 69.5% of a tiny file |

**It is not padding.** The Harmony 600's holds 140 distinct byte values, 35% of it zero and 0.6%
`0xFF`, which is the wrong shape for erased flash and the wrong shape for a run of one record type.

### What points at it

One thing, and only one. **Screen language opcode 2**, whose five operands are two position bytes
and a three byte flash address, section 40. Every target it names lands in the region, in every
config that has one:

| sample | opcode 2 targets in the region | opcode 4 targets in the region |
|---|---|---|
| Harmony 600 | 4 of 4 | 0 of 21 |
| Harmony One | 141 of 141 | 0 of 60 |

Opcode 4 has the same shape, five operands ending in an address, and never points there, so this is
a property of opcode 2 and not of "screen opcodes that carry an address".

**The two container kinds with no opcode 2 have no region either.** The arch 9 sample and the three
safe mode containers emit none, and their unattributed remainder is 4806 and 4946 bytes rather than
hundreds of kilobytes. That is the closure: the region exists exactly where its referent does.

### What is not established

**What the data is.** The obvious guess from opcode 2's shape, a position and an address, is that
it draws a picture, and the region's size tracking the model's screen would fit: a Harmony One with
a colour touch panel carries 1.37 MB where a 600 carries 0.46 MB and an arch 9 remote with a small
monochrome display carries none. That is a conjecture and it is written here as one. Nothing has
been decoded and no firmware has been read for it.

> **Answered by section 51, and the conjecture was right.** The region is image data: rows of 176
> big endian RGB565 pixels on arch 12, with blank screens of exactly `176 * 220 * 2` bytes fixing
> the height. Recovered on both Harmony Ones independently. What addresses it is still unknown, so
> the sentence above about "not established" now applies only to the referent.

> **Answered in part by section 50, and the answer is narrower than this section expected.** The
> firmware was read and opcode 2 does draw a picture, with a header this section did not know
> about. But the pictures are 125 to 885 bytes each, so all sixteen of the Harmony One's come to
> under seven kilobytes of its 1.37 MB region. Opcode 2 is still the only referent found, and it is
> now known to account for almost none of what it points into. Section 50 records what that rules
> out.

**Why so few referents.** Three to sixteen distinct targets for hundreds of kilobytes, so either
each target addresses something very large, or a target is the head of a table with structure of
its own. Those are different problems and the difference is not settled.

> **Section 50 rules out the first of those two and does not establish the second.** A picture
> states its own size and the size is small, so no target addresses something very large. Whether a
> target heads a table is not settled either: the pictures do not tile, so they are not a run of
> records, and the region's only ascending pointer-shaped runs turned out to be misaligned reads of
> base slot 10's own array.

Two counts in the table above are occurrences and not distinct addresses, which section 50 measures
instead: the Harmony 600's four opcode 2 instructions name three places and the Harmony One's 141
name sixteen. Both readings say the same thing about the region and the difference is recorded so
the two sections can be compared.

**Whether opcode 2 is the only way in.** It is the only one found. Pointers inside records have not
been swept, so a second referent from a structure that is itself only partly decoded is possible.

> **Still open after section 51**, which swept eight candidates and found nothing. Two of them were
> the same misalignment trap this section's own successor fell into twice.

### Why it matters more than its size

It is the largest single unknown in the format, it is the reason M2's coverage number cannot pass
about 35% no matter how many section readers are ported, and it is the first thing a writer would
have to reproduce. It is also the best remaining target for the firmware method of the
`trace-section` skill: opcode 2 has a handler in the arch 14 dispatcher at `0x1879C`, and that
handler is what the region is for.

## 50. Screen opcode 2 draws a bitmap, and that is not what fills the region

Section 49 named opcode 2 as the only referent of the region that holds most of a config, and left
what it points at as a conjecture. The firmware settles the conjecture and refuses the conclusion
that was hoped for: opcode 2 draws a picture, the picture states its own size, and the size is far
too small to be what the region holds.

### The route through the firmware

On the Harmony 700 2.8 image, base `0x9000`. The screen dispatcher is at `0x1879C` and its opcode
chain at `0x187A8`, section 40. Decoded with `harmony/pic18/chains.py`, because an `XORLW` chain's
literals are not its case values, case 2 lands at `0x187D6`, which is an `RCALL` to `0x183EA` and a
branch back to the dispatcher. The same shape is at `0x16E44` on the complete Harmony 600 0.2 image.

`0x183EA` is the instruction's own handler and it does four things: read the two position bytes,
read a three byte address, **seek the config stream to that address**, and call `0x0E3EC` with the
position in `0x2A1` and `0x2A2`. It saves `TBLPTR` before the seek and restores it after, which is
what makes the picture a separate object rather than something inline in the program.

`0x0E3EC` is the renderer. It reads one byte, the kind, and switches on it through the chain at
`0x0E3F6`:

| kind | handler | what it is |
|---|---|---|
| 0 | `0x0E404`, body at `0x0E44E` | raw rows |
| 1 | `0x0E426`, body at `0x0E530` | the skip and literal encoding a glyph uses |
| 2 | `0x0E44C` | a bare `RETURN`: valid, draws nothing |
| anything else | falls through | returns without reading the header |

### The object

```
+0x00  u8   kind
+0x01  u16  stride, in bytes per row
+0x03  u16  rows
+0x05       the pixels
```

The kind 0 body reads those two `u16` and then loops: while `row < rows`, put `stride` in `0x29E`,
the position plus the row in `0x299` and `0x29A`, call the row writer at `0x0E292`, then set
`0x6DE`/`0x6DF` to `stride` and call `0x10BAC` to advance the stream.

> **`stride` is in pixels, not bytes, and this section said bytes.** A pixel is two bytes here as it
> is in a glyph, so a raw picture is `5 + 2 * stride * rows`. Corrected in section 54, where the
> corpus settles it: consecutive pictures then sit exactly that far apart, and 14 of the Harmony
> 600's 15 gaps are exact. Two claims below rest on the halved figure and are wrong because of it,
> both marked where they appear.

Kind 1 reads and **discards** the same four header bytes, then runs a byte at a time: `0x00` ends,
`0x80` advances a row, bit 7 set skips that many, and a value below `0x80` introduces that many
literal pixels. That is the base slot 7 glyph encoding of section 46, byte for byte, which is why
`stride` is recorded in bytes rather than pixels: a pixel is two bytes on both paths. `0x00` and
`0x80` are separate cases in the code ahead of the generic bit 7 path, so the row break is read
rather than charitably interpreted as a skip of zero.

**The encoded extent has a closure, which is why it is claimed.** This section said on the day it
landed that kind 1's extent was not established and that the readers would return no length rather
than guess one. That was resolved within the hour and is corrected here rather than rewritten: the
terminator makes the extent walkable, and the check that it is walked correctly is that the body
**discards the header and then breaks rows exactly `rows - 1` times anyway**. Two independent
statements of one number, and a walk one control byte out of step would agree with neither. It
holds for all 51 encoded pictures in the corpus, on arch 8, arch 12 and arch 14.

**Two rails for a writer, both from the code rather than from the data.** The firmware loads only
the **low byte** of each `u16`, so a stride or a row count above 255 is taken modulo 256 with no
error. And the row loop stops drawing above row 128 but keeps advancing the stream, so a picture
taller than that is read in full and partly discarded. Neither is visible in the corpus, where the
largest stride is 88 and the largest row count 18.

### What the corpus holds

`gspm.Container.bitmaps()` walks every reachable screen program, collects every opcode 2 address
and decodes each header. Every one of them decodes, in every container:

| sample | pictures | kinds | strides | rows | raw bytes |
|---|---|---|---|---|---|
| Harmony 700, both | 4 | 0 and 1 | 12 | 10 | 536 |
| Harmony 600 | 3 | 0 and 1 | 12 | 10 | 411 |
| Harmony One, both | 16 | 0 and 1 | 20, 22, 88 | 10, 11, 18 | 6795 |
| 880, arch 8 | 10 | 0 and 1 | 16 to 19 | 10 | 2423 |
| 525, arch 9 | 0 | | | | 0 |
| the three safe mode | 0 | | | | 0 |

**These counts are the ones reachable at the time**, before sections 53 and 54 made a mode record's
own screen program a root. The corpus holds 16 to 29 pictures per config, not 3 to 16, and the byte
totals are an order of magnitude larger. The conclusion this section drew from the small numbers is
reversed there.

No kind outside 0 and 1 appears, no header runs past the end of its container, and the strides are
per model rather than per config, which is what a layout resource looks like rather than user data.
The two container kinds that emit no opcode 2 have no pictures, the same negative case as section
49's.

### The negative, which is the point

6795 bytes of pictures against a 1374394 byte region on the Harmony One. **Opcode 2 accounts for
about one part in two hundred of what it points into**, counting both kinds at their full extent.

> **Reversed by sections 53 and 54.** Opcode 2 accounts for 98% of the Harmony 600's region, 93% of
> the 700's, 97% of arch 8's and 48% of the Harmony One's, once the programs inside mode records are
> reachable and the raw extent is not halved. The negative below was a measurement of what could be
> reached, not of what exists. Three measurements were made to find the
rest, and all three came back negative. They are recorded here so nobody repeats them:

* ~~**The pictures do not tile.**~~ **Wrong, and wrong because of the halved extent above.** They
  tile exactly, once a raw picture is `5 + 2 * stride * rows`: 14 of the Harmony 600's 15 gaps are
  precisely the extent of the picture before them. Corrected in section 54 and the test now asserts
  the tiling.
* **There is no pointer table into the region.** The two longest ascending runs of three byte
  values landing in the region, 231 and 157 entries with near constant strides, both turned out to
  be base slot 10's own pointer array read one byte out of alignment. A misaligned read of an
  ascending table is itself ascending, which is worth knowing before trusting the next one.
* **The bytes look like pixels and that is not a decode.** On the Harmony 600, which has a
  monochrome screen, the region holds 1119 distinct sixteen bit words and 40% of the non zero ones
  are exact RGB565 greys when read big endian, against roughly 0.05% for random data; long runs
  read as monotone gradients only in that byte order. The Harmony One, which has a colour screen,
  holds 31056 distinct words. Suggestive, consistent with the two panels, and not sufficient: no
  image width fits, nothing frames the data, and a hypothesis that cannot say where one picture
  ends is not a reading.

So section 49's ranking stands and its explanation does not. The region is still the largest single
unknown in the format, and the next move is no longer "read opcode 2's handler", because that is
done. It is to find the second referent, which means sweeping addresses out of the sections that
are decoded but whose record fields are not all named.

### Where it lands

* `docs/config-format.md`, under the screen language.
* `src/harmony/gspm.py`: `Bitmap`, `Container.bitmap_at`, `Container.bitmap_reference`,
  `Container.bitmaps`, and `Container.reachable_screen_programs`, which `tools/screen_dump.py` now
  calls instead of keeping its own copy of the walk.
* `packages/codec/src/screen.ts`: the same four, and a `slot-11-bitmap` claim in the byte
  accounting, for both kinds.
* `tests/test_interpreter.py` `TestTheBitmap` and `packages/codec/test/screen.test.ts`.

## 51. The region is image data, and the second referent is still missing

Section 49 found the region and could not say what it holds. Section 50 read the firmware that
draws the one thing pointing into it and found the pointer accounts for about one part in two
hundred of it. This says what the bytes are. It does not say what addresses them, and the list of
things that turned out not to is the longer half of the section.

### The measurement

Three claims, each with its own closure, and none of them a decode: there is no framing in the
region, so nothing here reads a structure.

**A row is 176 pixels.** Recovered by minimising the mean absolute difference between vertically
adjacent pixels over candidate widths 8 to 512, on the busiest 16 KB window of the region, which is
picked by distinct pixel count because a smooth gradient scores well at every width and says
nothing. On the Harmony One the answer is 176 with the runner up at 1.5 times the score, and on the
**second, unrelated Harmony One** it is 176 again. Wrong widths score two to twenty times worse and
the test asserts it, per the calibration rule in the verification standard.

**A screen is 220 rows.** Fixed independently of the width, by blank screens: the region contains
runs of zero bytes exactly `176 * 220 * 2` bytes long, four in one config and three in the other,
and no run in the corpus falls within four kilobytes of that length without being one of them.
Nothing in the width recovery produces the number 220, so the two are two statements and not one
restated.

> **Both confirmed by the format itself in section 54**, which is a better outcome than a
> measurement surviving. A picture's header on the Harmony One reads `stride 176, rows 220`, so the
> two numbers this section recovered from the bytes are stated in the file. Eight pictures per
> config carry exactly that geometry.

**A pixel is two bytes, big endian, RGB565.** Byte order is measured rather than assumed: the same
window at the same width scores worse read little endian, because swapping a pixel's halves turns a
smooth image into a noisy one. Supporting it from the other architecture, the Harmony 600 has a
monochrome screen and 40% of its non zero big endian words are exact RGB565 greys against about
0.05% for random data, while the colour Harmony One holds 31056 distinct words.

Rendered at 176 pixels with a luminance ramp, a window of the Harmony One's region is a coherent
picture with shading, edges and a lit object. That is what prompted the measurements and it is not
one of them.

### What this does not settle

**The width on arch 14.** The same recovery on the Harmony 600 and on arch 8 prefers 127 or 128
with a margin of about 2%, which is not a result, and on the Harmony 700 it produces no clear
answer at all. So the geometry is established on arch 12 and merely suggested elsewhere. The 600
having a smaller monochrome panel is consistent with 128 and is not evidence for it.

**Where one image starts.** Images are packed with no header: a sweep of the whole region for the
five byte header of section 50 finds exactly the pictures opcode 2 already names and not one more.
Row phase cannot locate a boundary either, and the reason is worth writing down rather than
rediscovering: the score compares row `r` with row `r + 1`, and shifting both by the same amount
leaves it unchanged, so the measure is blind to phase by construction.

### The referent, and eight places it is not

> **Found in sections 53 and 54, and it was screen opcode 2 all along.** Not a second referent but
> the same one, in programs nothing could reach: a mode record carries a screen program after its
> tagged list, and on arch 12 that program could not be decoded because opcode 23 had no operand
> count. The eight negatives below were all correct about where it is not.

The point of the search was the second referent, and it was not found. These were ruled out, each
by a measurement rather than by inspection:

| candidate | result |
|---|---|
| more of screen opcode 2 | 3 to 16 targets per config, all tiny, section 50 |
| screen opcode 3, the other bitmap draw | **one instruction in the entire corpus**, on arch 8 |
| any other caller of the renderer | only opcode 3 and the text path, which draws a glyph with it |
| infrared record headers | in region addresses at 5 of 186 offsets, noise |
| further bitmap headers inside the region | exactly the known ones, none extra |
| the log area of base slot 2 | reserves flash far above the container, not inside it |
| base slot 0 | a tree of state variable names, no addresses |
| a pointer to a blank screen boundary | none, at any of the four, plus or minus two bytes |

Opcode 3 is worth its own line. Its handler at `0x18440` on the Harmony 700 reads a kind byte and
dispatches to the same two bodies opcode 2 does, differing only in copying a six byte position
record instead of two, so it is a second bitmap draw in the language. It is also used **once** in
ten configs, so it explains nothing.

Two of the negatives were the **same trap twice**, and it is the one to remember here. Twice a long
ascending run of three byte values seemed to be a table into the region, and twice it was a
misaligned read of base slot 10's own pointer array. The signature is exact: a real entry whose
high byte is constant, read one byte late, puts that constant in the low position and multiplies
every delta by 256. A run of 231 entries with a constant `0x05` low byte and a constant `0x700`
delta is a table of real entries stepping by 7, seen sideways.

### Why it still matters

The region is 59% of a Harmony 600 and 81% of a Harmony One, it is the whole of the gap between
M2's 26% and a round trip, and it is now known to be pictures rather than an unknown. A writer that
cannot place an image cannot write a config, so the open question has not moved, only sharpened:
**what tells the remote where a picture is.** The next places to look are the fields of decoded
records that are not yet named, and the arch 14 firmware's other readers of an absolute config
address, of which the seek routine at `0x18D98` has fifty callers and only a handful have been
attributed.

### Where it lands

* `src/harmony/region.py`, reverse engineering only and deliberately not in `packages/codec`: a
  width recovered by minimising a difference is a measurement and not a reader, and standing it
  next to the readers would invite a caller to treat it as one.
* `tests/test_region.py`, five tests including the calibration case and the byte order comparison.
* `docs/config-format.md`, under the screen language.

## 52. Base slot 6's pointer does not land on its entry, and the key table is one of them

Found while hunting section 51's missing referent, by asking whether a mode entry's three trailing
bytes could be an address. They cannot, but the census that asked came back with tags spanning
**0 to 255**, which is not a tag space, and that was the thread.

### What the pointer points at

The same shape base slot 5's infrared records have, and section 42 already wrote down: the array's
pointer lands **inside** the record, on a discriminator byte, with a `u24` back pointer to the
record's start immediately after it.

```
at the record start   u8 count; { u8 tag; u16 operand; u8 opcode }[count]
at the table pointer  u8 kind; u24 the record's own start
```

Records are laid out contiguously and a record runs to about seven hundred bytes, so the pointer
lands hundreds of bytes past the head. Reading the tagged list at the pointer therefore decodes the
tail as if it were the head, and because the byte there is usually zero, which is also the wide
form's marker, the result is a plausible looking list whose count runs to 255. That is what the
byte accounting refused to claim two commits ago, correctly and for the wrong reason: the extent
was not unsettled, the start was wrong.

Three closures, over 1616 mode records in eight containers spanning four architectures:

* **every** pointer's back pointer points backwards, 1616 of 1616,
* the count read at the start gives a list that **fits inside the record**, 1616 of 1616, where a
  wrong start overruns,
* on both Harmony Ones every mode carries **exactly one tag 6 and one tag 7**, 379 of 379, which
  is section 37's enter and leave handler pair holding exactly. It does not hold on arch 14 or arch
  8, so the pairing is recorded as an arch 12 property rather than generalised.

The other tags are key codes. A mode record maps a key code to one action list instruction, which
is what a mode should be and is a stronger statement of section 37 than section 37 made.

### The key table is a mode record

The overlap detector found this rather than anybody noticing. Claiming the mode records put exactly
one collision in every container that has a key table, and it is total: the container's key table
sits at `markerOffset + 4` with a `u8` count and four byte records, and **base slot 6's first mode
record starts on the same byte with the same count and the same entries.** On the Harmony 600 both
are 162 records over 649 bytes at blob `0x5F`.

So the structure after the marker is not header furniture with a private layout. It is a mode
record, the first one, and the tagged list encoding is the key table encoding. Section 17's reading
of a key code as an event type plus a scan code is a reading of a **tag**, and it stands: what
changes is that the same encoding is used in 237 to 374 other places in the same file.

The accounting claims those bytes once, under the name they had first.

### What it does not do

**It does not find section 51's referent.** A tagged list entry's payload is a three byte action
list instruction, so it cannot hold a `u24` address, and the census that started this confirmed it.

**It does not decode a mode record.** The tagged list is about forty five bytes of a seven hundred
byte record, so 90% of base slot 6 is still unattributed, and on the Harmony 700 that is 240 KB
sitting below the region rather than in it. That is now the largest unexplained structure whose
**owner is known**, which makes it a better target than the region.

Coverage moves to 28.3% on a Harmony 700 and 26.5% on a Harmony 600.

### Where it lands

* `docs/config-format.md`, base slot 6.
* `src/harmony/gspm.py`: `ModeRecord` and `Container.mode_records`.
* `packages/codec/src/sections.ts`: `modeRecords`, plus `slot-6-mode` and `slot-6-tail` claims.
* `tests/test_interpreter.py` `TestTheModeRecord`, and `packages/codec/test/sections.test.ts`.

## 53. A mode record carries a screen program, and that is what names the large pictures

Section 52 corrected where a base slot 6 record starts and observed that only about a tenth of one
is decoded. This reads most of the rest, and in doing so it answers a large part of section 51's
question about what addresses the region.

### The rule

**Immediately after a mode record's tagged list there is a screen program.** Its address is the
record's own start plus the length of that list, which is a quantity section 52 had to establish
before it could be computed at all: at the old, wrong start the arithmetic lands nowhere.

Section 40 already suspected a third source of screen programs and could not place it, and
`screen_program_roots` said so in its docstring. This is it.

The closure is that **every one of them decodes, with nothing left over**:

| container | records | programs that decode |
|---|---|---|
| Harmony 700, both | 374 | 374 |
| Harmony 600 | 237 | 237 |
| 880, arch 8 | 103 | 103 |
| the three safe mode | 35 | 35 |
| Harmony One, both | 268 and 111 | **0** |
| 525, arch 9 | 114 | 43 |

That is a real check and not an observation. Screen instructions are variable length with no length
field, so a start one byte out desynchronises and the next byte read as an opcode is almost
certainly not one of the eleven. It happened during this work, in exactly that form: the two codecs
disagreed on 37 of the Harmony 600's roots by a single byte, because the Python side inferred the
tagged list's form from its entries and an **empty** wide list has no entry to infer from. The
TypeScript side read the form from the byte and was right.

**Arch 12 and arch 9 are excluded**, in the code and not by a comment. On the Harmony One not one
of 268 records is followed by a program, so whatever follows the list there is a different thing
and is not established. `MODE_PROGRAM_ARCHITECTURES` is `{8, 14}`.

### What it reaches

1629 programs across the corpus that nothing reached before, taking the total from 18252 to 19881,
and the inline string codes from 16054 to 39170, every one of which still resolves to a glyph of
the font its own program selected. The three safe mode containers go from **zero** programs to 35:
they carry no base slot 11 table at all, so every program in one is reached through a mode record.

And the pictures. Section 50 counted 3 to 16 per config and called them small, which they were:
the ones a mode record names are not.

| container | pictures before | after | largest | bytes | share of the region |
|---|---|---|---|---|---|
| Harmony 700 | 4 | 21 | stride 128, 128 rows | 279149 | 46.7% |
| Harmony 600 | 3 | 16 | stride 128, 128 rows | 213468 | 49.2% |
| 880, arch 8 | 10 | 28 | stride 128, 160 rows | 144257 | 50.7% |
| Harmony One | 16 | 16 | stride 88, 10 rows | 6795 | 0.5% |

**So about half of the region on arch 8 and arch 14 is pictures the screen language names**, and
section 51's missing referent was not missing so much as unreachable: it is screen opcode 2 after
all, in programs that needed section 52's correction to reach. Section 50's negative stands for the
Harmony One, where mode records carry no program and the region is still 99.5% unaccounted.

### What it does not do

**It does not read the whole record.** The tagged list plus the program is most of a mode record but
not all of it, and the byte accounting shows what is left.

**It does not explain arch 12.** The One's region is 1.36 MB and this reaches none of it. Whatever
an arch 12 mode record holds after its list, it is not a screen program, and that is now the
sharpest open question in the format: the same structure, on the architecture the project cares
most about, laid out differently.

Coverage: **59.3% of a Harmony 700**, up from 28.3%, 57.5% of a Harmony 600, 50.6% of arch 8 and
89.5% of a safe mode container. Arch 12 stays at 8.6%.

### Where it lands

* `docs/config-format.md`, base slot 6 and the screen language.
* `src/harmony/gspm.py`: `MODE_PROGRAM_ARCHITECTURES`, `Container.mode_program_roots`,
  `Container.tagged_list_length`, and the roots list.
* `packages/codec/src/sections.ts` and `src/screen.ts`, the same two.
* `tests/test_interpreter.py` and `packages/codec/test/screen.test.ts`, with every corpus total
  moved and the old value recorded beside the new one.

## 54. One missing operand count was holding arch 12 shut, and the region is pictures

Section 53 left the sharpest open question in the format: a mode record carries a screen program on
arch 8 and arch 14, and on arch 12 not one of 268 does. That turned out to be false, and the reason
it looked true was a single absent table entry.

### Opcode 23 takes no operand

Dumping what follows an arch 12 mode record's tagged list shows a program that starts
`02 00 00 6e 7c 12`, which is screen opcode 2 with an address in the region, and then runs into a
`0x17`. Opcodes 22 and 23 are in the arch 12 dispatcher and in no config the corpus had reached, so
`SCREEN_FIXED_OPERANDS` had neither and the walk refused, correctly, rather than desynchronising.

Opcode 23's handler is at `0x29640` on the Harmony One 3.4 image. It copies the stream position into
`0x19C` to `0x19E`, writes the position minus three into a table, sets `0x19E` to `0x13` and returns
to the loop. **It makes no read call at all**, where every other handler in that dispatcher calls
its own reader; opcode 16's is one instruction, `RCALL 0x292AC`. So it consumes no operand.

That is the whole change: one entry, `23: 0`. With it, **268 of 268 arch 12 mode programs decode**,
each containing exactly one opcode 23 and one opcode 2. Opcode 22 appears nowhere in the corpus, so
it stays unestablished and a parser still refuses it.

A brute force over operand counts 0 to 7 for both opcodes was run first and could not choose: 22
never occurs, and 23 decodes at both 0 and 5. The firmware settled what the corpus could not, which
is the project's usual order of authority and worth noting because the temptation was to take the
count that produced the larger picture count.

### `stride` is in pixels, and section 50 said bytes

With arch 12 open, its pictures read `stride 176, rows 220`, which is exactly the geometry section
51 recovered by minimising a row difference. That agreement is also what exposed an error: at
`5 + stride * rows` such a picture is 38725 bytes, but section 51's blank screens are 77440, twice
that, and the filled ones correlate at 352 bytes a row rather than 176.

A pixel is two bytes, as it is in a glyph and as the encoded kind already assumed, so a raw picture
is **`5 + 2 * stride * rows`**. The corpus closes it without ambiguity: consecutive pictures then sit
exactly that far apart, 14 of the Harmony 600's 15 gaps, 17 of the 700's 20 and 23 of arch 8's 27,
where under the halved reading not one gap matched anything. Section 50's "the pictures do not tile"<!--superseded-->
was an artefact of the halved extent and is corrected there.

### What the region is

Both corrections together:

| container | pictures | bytes | share of the region |
|---|---|---|---|
| Harmony 600 | 16 | 426700 | **98.3%** |
| Harmony 700 | 21 | 558037 | **93.3%** |
| 880, arch 8 | 28 | 276019 | **97.0%** |
| Harmony One | 28 | 656275 | 48.2% |
| Harmony One, spare | 27 | 578830 | 52.5% |

So the region that sections 49, 50 and 51 circled is, on three of the four architectures,
**essentially all pictures, all addressed by screen opcode 2**. There was never a second referent.
There was one referent in programs that could not be reached, for two different reasons on two
different architectures: on arch 8 and arch 14 because a mode record's program had no known start,
and on arch 12 because of one missing operand count.

The Harmony One's remaining half is the open item, and it is a different question from the one this
started as: not "what addresses the region" but "what else is in it besides the 28 pictures".

> **Answered in section 55: nothing else.** The region is one contiguous array of pictures, 98 of
> them on that config, of which 28 are addressed. The rest are in the same array and nothing this
> project can reach draws them.

### Coverage

M2's number, which is what all of this was for:

| sample | before this session | now |
|---|---|---|
| Harmony 700 | 26.0% | **87.8%** |
| Harmony 600 | 24.5% | **86.4%** |
| Harmony One | 7.2% | **47.9%** |
| 880, arch 8 | 12.4% | **80.2%** |
| the three safe mode | 64.5% | **89.5%** |

Zero overlapping claims anywhere, which is the check that keeps those numbers honest.

### Where it lands

* `docs/config-format.md`, the screen language and base slot 6.
* `SCREEN_FIXED_OPERANDS[23] = 0` and `SCREEN_ARCH12_ONLY = {22}` in both codecs, the latter
  replaced by `SCREEN_OPERANDS_BY_ARCHITECTURE` in section 64 once 22 was read too;
  `MODE_PROGRAM_ARCHITECTURES` gains 12; `PIXEL_BYTES` and the corrected raw extent.
* `tests/test_interpreter.py` and `packages/codec/test/screen.test.ts`, where the tiling test now
  asserts the opposite of what it did and says so.

## 55. The region is one array of pictures, and about a third of them are addressed

Section 54 left the Harmony One at 48% of its region explained and framed the remainder as a
different question: not what addresses the region, but what else is in it besides the pictures.
The answer is nothing. It is all pictures, and the ones nothing addresses sit in the same array as
the ones that do.

### The walk

Every gap the byte accounting reported inside the region begins with a valid picture header. Walking
a gap as a run of pictures, each stating its own size, consumes it to the byte: seven gaps on the
Harmony One, 44 pictures, every one exact. Extending that to the whole region does the same.

| container | pictures | bytes | landed | addressed by opcode 2 |
|---|---|---|---|---|
| Harmony One | 98 | 1361283 | exact | 28 |
| Harmony One, spare | 70 | 1102735 | exact | 27 |
| Harmony 600 | 18 | 434210 | exact | 16 |
| Harmony 700, both | 24 | 598320 | exact | 21 |
| 880, arch 8 | 32 | 284539 | exact | 28 |
| the other three arch 8 | 31 to 33 | 239618 to 242658 | exact | 27 to 29 |

**Landing exactly on the trailer is the proof, not the parse.** Pictures are variable length and
state their own size, so a walk that starts one byte out reads a header out of pixel data and
either stops early or overshoots. Nine containers, nine exact landings, over runs of 18 to 98
records. The test asserts that offsets one to three bytes either side of the true start do not walk
at all.

### Finding the start

The bank begins where the named content stops, but not on that exact byte: sections the codec does
not fully read leave a short head, one byte on the Harmony 600 and 181 on a Harmony One. So the
reader tries offsets in order under **two** constraints, and exactly one candidate satisfies both in
every container:

* the walk lands on the trailer, and
* every picture screen opcode 2 names appears in the run, at its own address.

The first alone is not enough. On two arch 8 configs eleven and thirty starts land on the trailer,
because a wrong head can still parse into whole records; adding the second leaves one. That is worth
stating because searching for a start is normally a bad idea, and what makes it safe here is that
the search is checked twice against things it did not choose.

### What it means

The region is a **picture bank**: a contiguous array with no table, no count and no header, running
from the end of the named content to the trailer.

> **Corrected in section 62.** "No header" stands, but "nothing names it" does not: on arch 8,
> arch 9 and arch 14 **base slot 17 points two bytes in front of the bank**, on all seven samples,
> so the search below is needed on arch 12 alone. And the arch 9 sample, offered here as one of the
> four containers with no such region, has four pictures. It emits no screen opcode 2 and it has
> them anyway, which is where the inference went wrong. About a third of its entries are drawn by a screen
program and the rest are not drawn by anything this project can reach. Whether they are spares, or
addressed by something still unread, is not established and the reader does not pretend otherwise:
it reports them, it does not explain them.

For a writer this is the most useful shape it could have had. A picture's position is implied by
everything before it, so inserting or resizing one moves every later address, which is consistent
with what section 16 observed about the generator rewriting whole sections for a small change.

### Coverage

| sample | before this session | now |
|---|---|---|
| Harmony 700 | 26.0% | **91.9%** |
| Harmony 600 | 24.5% | **87.4%** |
| Harmony One | 7.2% | **90.0%** |
| Harmony One, spare | 3.2% | **97.0%** |
| 880, arch 8 | 12.4% | **82.2%** |

Zero overlapping claims anywhere. The bank and the pictures opcode 2 names are disjoint by
construction: the named ones are claimed only when they fall outside the bank, which in the current
corpus is never.

### Where it lands

* `docs/config-format.md`, the screen language.
* `Container.picture_run`, `Container.picture_bank` and `Container.named_content_end` in
  `src/harmony/gspm.py`; `pictureRun`, `pictureBank` and `namedContentEnd` in `packages/codec`,
  with a `picture-bank` claim.
* `tests/test_interpreter.py` `TestThePictureBank` and `packages/codec/test/screen.test.ts`.

## 56. "Logitech's servers are gone" was false, and it was load bearing

This project opened four of its documents with a sentence that is not true. `README.md` said
"Logitech's servers are gone, so a config already on a remote can be read off it, but nobody can
generate a new one". `CLAUDE.md`, `docs/roadmap.md` and the `probe-remote` skill each carried a
version of the same clause, and section 32 used it to explain why an infrared extractor is worth
building. Nobody here had ever checked it. It was inherited from the general knowledge that Harmony
was discontinued, repeated until it read like a measured fact, and then reasoned from.

It is wrong because there are **two** services and only one of them is gone.

### The measurement

Taken on 7 August 2026 from the bench machine. Every number below is one command anybody can rerun,
which matters more than usual here, because unlike every other finding in this document this one is
about the outside world and will decay.

| Host | Resolves to | HTTP |
|---|---|---|
| `svcs.myharmony.com` | `prod-auto-lb-2-1658367766.us-east-1.elb.amazonaws.com`, two addresses | 403 on `/` |
| `sl.dhg.myharmony.com` | `d7h69h8uqh3sy.cloudfront.net` | 200, serves assets |
| `www.myharmony.com` | four addresses, `nginx` | 200, redirects to a locale |
| `members.harmonyremote.com` | `d2mqwx6wju8p2w.cloudfront.net`, `AmazonS3` | 200 |

Three things separate a service that answers from a bucket that has outlived its owner.

* **`svcs.myharmony.com` is an application, not a file store.** It resolves to a load balancer whose
  name says `prod-auto-lb-2`, and a 403 on the root path is a running application declining an
  unauthenticated request. A withdrawn service gives NXDOMAIN or a parking page.
* **Its certificate was renewed five weeks ago.** `CN=*.myharmony.com`, issued by Amazon,
  `notBefore Jul 5 00:00:00 2026`, `notAfter Jan 18 2027`. This is the independent closure and it is
  the strongest single fact in the section: a certificate is a thing somebody has to keep renewing,
  so a fresh one is evidence of an operator rather than of an unpaid-for leftover. Nothing about the
  DNS or the 403 could distinguish "maintained" from "forgotten and still billed"; the certificate
  can.
* **An account still authenticates.** The owner signed in to the service from the bench machine with
  his own account, and it authenticated him and recognised the remote attached over USB. Sign-in is
  server side by construction, so this is not something a cached page can fake.

And `members.harmonyremote.com`, the one that **is** gone, says so in its own words: a static S3
page last modified 31 July 2025, titled "Logitech Harmony Remote Software Discontinuation". That is
the **classic** service, the 7.x software the Harmony One originally shipped with, and it is almost
certainly the source of the belief. Both halves of the sentence were true of something. They were
true of different things.

### What this does not establish, which is most of it

The corrected premise is narrow and the temptation to widen it should be resisted.

* ~~**It is not established that the service still compiles a config.**~~ **Established the same
  day, in section 58**, which is why this bullet is struck through rather than removed. It read:
  "Authenticating an account and identifying an attached remote are the cheap half. Producing a new
  config for one of these architectures is the expensive half, it is what this project exists to
  replace, and no observation here touches it." The expensive half was then measured: the service
  compiled a config for a Harmony One and it was written to the remote and read back. The
  distinction the bullet drew was the right one to draw and the answer went the other way.
* **It is not a recovery path.** A service that answers today can be withdrawn tomorrow with no
  notice and no appeal, and the classic service on the other row of that table is what that looks
  like afterwards.
* **It changes nothing about the remotes.** A Harmony One is out of production either way. The
  scarce thing was never the config server.

### Why no rail moves

Every safety rule in `CLAUDE.md` survives this correction untouched, and it is worth being explicit
about why, because a correction that leaves the conclusion standing invites the suspicion that the
conclusion was never resting on the premise.

It partly was. The rail's stated justification was "these devices are irreplaceable **and**
Logitech's recovery servers are gone", and half of that conjunction has now failed. What remains is
the half that was always doing the work: the devices are irreplaceable. The three bullets above are
the argument that the failed half was never load bearing for the rail even though it was load
bearing for the prose. So the wording changes in five places and the behaviour changes nowhere.

The one thing that does change is the project's own standard. `docs/findings.md` opens by claiming
its assertions are checkable, and this one sat in the front page of the repository for months
without anyone spending the thirty seconds a `dig` costs. **An inherited premise is not a finding**,
however many documents repeat it. This section exists as much to record that as to record the DNS.

### Where it lands

* `README.md`, `CLAUDE.md`, `docs/roadmap.md` and `.claude/skills/probe-remote/SKILL.md`, each
  corrected in place with the old wording quoted rather than deleted.
* Section 32 of this document, whose "once the servers are gone" is narrowed to what it can support.
* **No regression test, deliberately.** The three-part rule wants one and it is the wrong tool here:
  a test that resolves a hostname would reach an external service on every `make test`, fail
  offline, and assert a fact about somebody else's infrastructure that we would rather have change
  than pin. The commands in the table are the executable part, and the date on the section is the
  admission that the answer expires. This is the only finding in this document with no test, and
  saying so is the point.

## 57. Version block field 4 is the architecture, and its accessors are compiled in literals

Ten of `GET_VERSION`'s twelve fields were unnamed and the open items list has said so for a while.
One comes off it here, and the interesting part is how cheap it turned out to be once the question
was asked of the image instead of of the two remotes.

Field 4 read `0xE0` on the Harmony 600 and `0xC0` on the Harmony One, and section 44 of
`docs/usb-protocol.md` wrote that down as "protocol in the high nibble: 14 and 12". That is the name
concordance uses, adopted because the numbers were right and nobody pushed on it. But 14 and 12 are
not protocol revisions that happen to be adjacent, they are **the architecture numbers**, the same
two the config states in base slot 1 and the same two this project organises everything else by.

### The accessors are RETLW, so the answer is a table lookup

The version block builder at `0x1422C` fills twelve bytes, each from its own small accessor.
Five of those accessors sit consecutively, two bytes apart, and every one of them is a single
`RETLW`:

```
10648: 28 0c       RETLW 0x28     field 0, the firmware version
1064a: 00 0c       RETLW 0x00     field 4, low nibble
1064c: 42 0c       RETLW 0x42     field 5, the skin
1064e: 0c 0c       RETLW 0x0c     field 6
10650: 0e 0c       RETLW 0x0e     field 4, high nibble
```

So these values are compiled into the image and need no device, no execution and no inference. The
builder packs two of them into one byte at `0x14268`, `SWAPF` then `ANDLW 0xF0` then `IORWF`, which
is the nibble packing `docs/usb-protocol.md` had already spotted without knowing which byte it
built.

The table was then located in all four available images by searching for the same five literal
pattern, with each image's own firmware version and skin as the anchor. One hit in each, no
ambiguity.

| Image | at | field 0 | skin | field 4 high | architecture |
|---|---|---|---|---|---|
| 700 2.8 | `0x10648` | `0x28` | 66 | `0x0e` | 14 |
| 600 0.2, complete | `0x11964` | `0x02` | 71 | `0x0e` | 14 |
| 650 0.4 | `0x138C8` | `0x04` | 72 | `0x0e` | 14 |
| One 3.4 | `0x24262` | `0x34` | 54 | `0x0c` | 12 |

### Why this names it rather than renames it

Two remotes reading 14 and 12 is compatible with almost any label, because there are only two of
them and any two numbers agree with any two numbers. The table above is what makes it a finding.

**It varies with the architecture and with nothing else.** Three arch 14 images, three different
firmware versions (2.8, 0.2, 0.4), three different skins (66, 71, 72), three different models, and
all three return 14. A protocol revision that never moved across three firmware generations of the
same family would be a strange protocol revision. The arch 12 image is the contrast case and
returns 12.

**It agrees with what the config says about itself.** Base slot 1 states the architecture, and on
all three bench remotes the nibble equals what that unit's own config carries: 14 on the 600, 12 on
both Harmony Ones. Two independent artefacts, a firmware image and a config, produced years apart by
different parts of Logitech's toolchain.

**And that agreement is not circular**, which is the part worth checking rather than assuming. The
accessor at `0x10650` has **exactly one caller**, the version block builder. The firmware never
compares this constant against the architecture in the config it is running, so the two agreeing is
a fact about the world rather than a consequence of one being copied from the other. Had the
firmware validated one against the other, the agreement would have proved nothing at all.

**A third artefact agrees, and it names the field.** An `.EZHex` opens with an XML header stating
the remote a config was built for, and its `PROTOCOL` element reads 12 on the Harmony One's config,
14 on the 600's and 9 on the arch 9 sample. Those are the architecture numbers. The rest of that
header maps onto the block just as exactly: `BOARD 0.5.0` against field 1's `0x05`, `SKIN 54`
against field 5's `0x36`, `FLASH 0x1F:0xC8` against fields 3 and 2. So the same number reaches the
host over USB and the generator over XML, and Logitech's own word for it is **protocol**. This
section renames it anyway, because what the value identifies is what this project and concordance
both call the architecture, and because a name that only makes sense next to a second, absent notion
of architecture is the worse of the two. The header is a fourth prediction waiting to be tested:
`docs/memory-map-525.md` uses it to predict seven of the twelve bytes for a remote nobody here has
connected.

### Three smaller things that came with it

* **Field 6 is a constant and not a field count.** `0x0C` on both remotes invited reading it as
  twelve, the number of fields, and that reading is now dead: it comes from its own `RETLW 0x0c` in
  every image including the arch 12 one, so it is a compiled in constant that happens to equal
  twelve. What it means is still unknown, but it is no longer self-referential.
* **Field 4's low nibble is a compiled in zero on all four images.** It is a genuine second
  four-bit field, since the packing builds it from a separate accessor, and every image this project
  has sets it to zero. So it is undetermined rather than absent, and a fifth image is what would
  move it.
* **A writer rail.** The high nibble is masked with `ANDLW 0xF0` after a `SWAPF`, so this byte
  **cannot express an architecture above 15**. Every architecture named in this project is below
  that, which is why nothing has hit the ceiling, and it is a real constraint on any future one.

### Two predictions, recorded before the fact

Neither a Harmony 700 nor a Harmony 650 has ever been connected here, so the skins in the table
above are unverified readings of an image. Writing the consequence down now is what makes connecting
one worth doing: the skin is reported in binary in field 5 and in BCD in `bcdDevice`, as the 600's
71 and `0x1071` and the One's 54 and `0x1054` both show. So a **700 should enumerate `bcdDevice`
`0x1066`** and a **650 `0x1072`**. If either does not, the reading of field 5 is wrong and this
section's location of the table with it.

### Where it lands

* `docs/usb-protocol.md`, the twelve field table and the accessor table under it.
* `tests/test_usb_firmware.py`, `TestFieldFourIsTheArchitecture`, five tests over all four images.
* The open items list, which loses one of its ten unnamed fields and keeps the other nine.

## 58. The service still compiles configs, and the corpus now has a pair we asked for

Section 56 established that Logitech's MyHarmony service answers and refused to conclude anything
about whether it still **compiles**. That question is now answered, and the answer arrived with a
second thing that is worth more: the first config in this corpus whose contents were chosen by us
and written down before it existed.

### What was done

On 7 August 2026, on the **spare** Harmony One, which is the only unit these rails allow anywhere
near a write. Nothing here was written by us; Logitech's own software did the writing over its own
sync, and both reads either side were ours, through `packages/corpus/bin/read-config.ts`.

1. **Baseline.** The unit's config read off the remote, 1232237 bytes, and compared against the dump
   already in the lab: **identical, 1232237 of 1232237**. So the state before the experiment is not
   assumed, it is proved, which matters because the owner had been clicking around in the software
   beforehand.
2. **One change, decided in advance.** One device added, a Denon AV receiver picked arbitrarily from
   Logitech's database, plus one activity, the activity only because their software refuses to
   proceed without one.
3. **Sync.** It ran to 100%, the remote rebooted itself, and the software then hung at 99% of its
   own follow-up work and had to be closed. The reboot is the useful detail: a remote restarts
   **after** the config write completes, so the hang was in the host and the write was already done.
4. **Read back.** 1326564 bytes.

### The service compiles

The new config's build timestamp, recovered by our own reader from slot 3, is **2026-08-06
13:54:22**. It is 94327 bytes larger than the one it replaced, it holds a device that was not there
before, and every container check passes. A cache cannot produce that, because nothing had ever
compiled this combination of devices for this remote.

So the premise this project ran on for months, corrected once already in section 56, is wrong in a
second way. It is not merely that the servers answer. **They still do the thing the project exists
to replace.** That changes no goal here: a service that can be withdrawn without notice is not a
plan, the software driving it is barely usable for real configuration, and none of it helps the
architectures Logitech never served from this endpoint. But it should be said plainly rather than
softened.

### What the change looks like in the config

**It is a whole regeneration, not an increment.** The naive expectation was the old config plus a
device. Instead the previous owner's television is gone and almost every count moved, most of them
**down**:

| | before | after |
|---|---|---|
| bytes | 1232237 | 1326564 |
| built | 2023-07-28 13:27:33 | 2026-08-06 13:54:22 |
| infrared records | 97 | **125** |
| mode records | 111 | 106 |
| action lists | 2141 | 2079 |
| binding records | 104 | 96 |
| touch map | 32 pages, 182 rectangles | 31 pages, 171 rectangles |
| font sets | 18 | 17 |
| screen programs | 389 | 384 |
| pictures in the bank | 70 | 64 |

This is section 16's finding again, from the other direction: the generator rewrites everything, so
a byte diff between two configs is not a description of the change. The counts are, and the one that
moved the way it had to is the infrared database, from 97 records to 125. A device is codes before
it is anything else.

**Slot 0 names it outright.** The tree of state variable names is where a config says what it is
for, and the two read:

```
before   Root  State  TV_Input_12  CurrentLocation_1  TV_TVInput_3  TV_Screen_10
               ButtonSoundVolume_2  TV_Power_2  CurrentActivityState_0_2
after    Root  State  CurrentActivityState_0_2  CurrentLocation_1  ButtonSoundVolume_2
               Denon_AV_Receiver_Input_23  Denon_AV_Receiver_Power_2
```

The device that was asked for, with its 23 inputs, and the television that was not asked for is
absent. That is the tie between "what the owner clicked" and "what is in the flash", and it is the
first time this project has had one.

### The codec was tested by this and it held

Every config in the corpus before today was built between 2007 and 2023. A reader that had grown
quietly dependent on a generator quirk of that era would pass the whole suite and fail here. It did
not:

* **Every container check passes**, including the trailer checksum of section 41.
* **384 screen programs decode with nothing left over**, none undecodable. That is the strongest
  single check available, because screen instructions are variable length with no length field, so
  a walk that desynchronises fails rather than returning something plausible.
* **The picture bank walks exactly onto the trailer**, 64 records. Section 55 established that a
  start one to three bytes out does not walk at all, so finding the bank in a file nobody had seen
  is a check on the whole layout rule.
* **M2 byte accounting reads 91.5%**, 1213419 of 1326564, **zero overlaps**. Lower than the 97.0%
  the untouched unit scores, which is expected and not a regression: the old config was a nearly
  empty remote and this one has real content in the parts still unread.
* The infrared extractor pulls 123 of the 125 records, the other two being the encoding classes
  section 42 records as unimplemented. The headers read 3364/1682 microseconds over 48 bits, which
  is a recognisable protocol family rather than noise.

### An independent confirmation of section 21

Section 21 placed the seven fields of the build timestamp by picking the only one of 336 candidate
assignments that fits the corpus. A fit is not a confirmation: every config in the corpus arrived
with its stamp and no way to check it against anything.

This one was compiled while we watched. The owner made the change on **6 August 2026** and the
reader recovers **2026-08-06 13:54:22** without being told. The day of week byte closes too, and on
two different values: the record stores 6 for the 2023 config, a Friday, and 5 for the 2026 one, a
Thursday, matching days since 1 January 2000 modulo 7 in both cases.

It also bears on the open contradiction. Section 21 refuses to order two configs of one remote by
their stamp, because doing so contradicts the recorded direction of the Harmony 700 pair. **This
pair's direction is observed rather than recorded**, and the stamp orders it correctly. One case
does not overturn the 700's, so the warning stands, but it is the first evidence that the reading is
right and the 700 pair's recorded direction is what is wrong.

### What this does not mean

* **No rail moves.** Nothing was written by us, the write target was the spare, and the write was
  performed by the vendor's own software doing its supported operation. `HARMONY_ENABLE_WRITES` is
  still off.
* **The generator is not an oracle we can lean on.** It regenerates everything, so it cannot be used
  to produce a minimal diff, which was the hope going in. What it can produce is **labelled
  samples**: configs whose semantic content is known because we chose it. That is a different and
  slower instrument, and it is still the best one this project has ever had.
* **The spare is no longer unprogrammed.** Its original state is preserved byte for byte in the lab
  and verified against the device, so it survives as data, but the unit itself now carries a
  configuration. Anything that wanted a virgin arch 12 remote wants the dump, not the remote.

### Where it lands

* Section 56, whose "not established" bullet is struck through in place rather than deleted.
* `lab.py` gains `one_spare_before_sync` and `one_spare_after_sync`, with a `META.md` recording
  what was asked for, because a sample nobody described is a sample nobody can use.
* `tests/test_sync_pair.py`, twelve tests: both halves parse, the counts, the names in slot 0 with
  the negative half asserted too, the timestamp against a date known in advance, and the day of week
  byte against the arithmetic rather than against the parser that already checks it.

## 59. The version block names four images, and one of them is the safe mode firmware

Section 57 named field 4 by reading five `RETLW` accessors. The remaining unnamed fields turn out to
be easier still, because their accessors say what they read: each one loads a **24 bit program
address** into three consecutive RAM bytes and calls the image's byte reader. So the question "what
is field 10 a version of" is answered by an address rather than by matching values, which is the
difference between this section and the reasoning it corrects.

### The addresses

The reader is `0x1B558` on the 700, `0x19C7C` on the 600 and `0x2E70A` on the One. Its callers:

| Field | 700 2.8 | 600 0.2 | One 3.4 | Address built |
|---|---|---|---|---|
| 7 | `0x10654` | `0x11970` | `0x2426E` | `0x000017` |
| 8 | hardcoded | hardcoded | `0x243E4` | `0x01E007` |
| 10 | `0x106B6` | `0x119D2` | `0x2439C` | `0x001007` |
| 11 | `0x1067E` | `0x1199A` | different | `0x009007` |

Every one of those addresses ends in **7**, and an image header on these remotes carries its version
byte at offset 7, ahead of the `48 47` magic at offset 8. So each field is the version byte of the
image at the address minus seven, and the three known image bases fall straight out:

* `0x001000`, which is the image at `0xFE` `+0x1000`: **the safe mode firmware**. Field 10.
* `0x009000`, which is **the application itself** on arch 14, since `0x9000` is its exec base.
  Field 11.
* `0x01E007` on the One, the image at `0xFF` `+0xE000`. Field 8.

Resolved against each unit's own memory dumps and compared with what that remote actually reported:
field 7, 10 and 11 agree on the Harmony 600, and fields 7 and 10 agree on the Harmony One. Five
checks, two architectures, no disagreements. Field 8's address lands in the One's `0xFF` page, which
is deliberately absent from `tests/lab.py` because it carries that unit's identity block, so its
address is pinned and its value is not.

### Two fields named

**Field 10 is the safe mode firmware's version.** `docs/usb-protocol.md` had this as a candidate and
explicitly declined to claim it: "the safe mode image at `0xFE` `+0x1000` carries the same version as
the application on both remotes, `0x34` and `0x02`, so a field naming it would be indistinguishable
from a field naming the application. That is exactly why nothing is claimed." The restraint was
right and the address settles it, because `0x001007` cannot be the application on either
architecture.

**Field 11 is the running application image's own header version.** Proved on arch 14, where the
accessor reads `0x009007` and `0x9000` is the exec base. On arch 12 the accessor uses a different
mechanism that is not decoded here, and its value agrees.

That answers the standing question of why fields 7, 10 and 11 all repeat field 0. They are versions
of four different things that happen to carry the same number, because a firmware release sets them
together. Field 0 is a constant compiled into the application; field 11 is the same version read
back out of that application's header; field 10 is the safe mode image beside it; field 7 is a byte
somewhere else again.

### Field 7 is narrowed, not named

It reads program `0x000017`, and the neighbourhood is the same on both architectures:

```
One 3.4   0x000010:  ff ff ff ff ff ff ff 34  00 ef 04 f1 12 00 ff ff
600 0.2   0x000010:  ff ff ff ff ff ff ff 02  00 ef 4c f0 12 00 ff ff
```

Seven erased bytes, the version, then a `GOTO` and a `RETURN`. So it is a lone version byte in the
boot area laid out at the same offset an image header would use, with the rest of the header never
written. Plausibly what the bootloader records when it installs an application, which would explain
why it tracks the application version. **That last sentence is a conjecture and is marked as one**:
nothing here identifies the code that writes it.

### The correction: arch 14 hardcodes what it cannot read

`docs/usb-protocol.md` placed fields 8 and 9 by saying they are the versions of the images at
`0xFF` `+0xE000` and `0xFF` `+0x0000`, and offered the Harmony 600 as the negative case, since it
reports `0x00` for both and has no such images.

> **That argument does not work.** On the 700 image, fields 8 and 9 are `CLRF INDF0` at `0x14378`
> and `0x1438C`: a compiled in zero, not a read that found nothing. The 600's two zeroes are
> therefore not evidence about images at all, and the "negative case" was reading a constant as a
> measurement.

The conclusion survives, on better evidence, and the constant turns out to be a confirmation rather
than a problem:

* **Field 8 is proved by address**, `0x01E007`, which is exactly the image the old argument guessed.
* **Field 9 rests on an exhaustive pairing.** The One holds exactly three images in internal memory
  and the block has exactly three fields naming one each. Fields 10 and 8 are proved to name
  `0xFE` `+0x1000` and `0xFF` `+0xE000`, so the remaining field and the remaining image are each
  other's only candidates, and the value matches: `0x16` is what sits at `0x010007`.
* **Arch 14 zeroes exactly the two fields whose images it lacks.** The 600's `0xFF` page carries no
  image at all, and fields 8 and 9 are the two that name images on that page. A firmware that
  compiled in zero for precisely those two, and reads the other two by address, is consistent with
  the assignment rather than indifferent to it.

### What is still open

**Field 9's accessor does not explain its value, and that is recorded rather than smoothed over.**
It is not one of the address-passing accessors. On the One it is a bare table read, `TBLPTR` set to
`0x020024` and a single `TBLRD*`, at `0x24290`. Program `0x020000` is the application's exec base on
arch 12, so that is the application image plus `0x24`, and the byte there is `0xDE`, part of a run of
`DE AD` filler. The remote reports `0x16`. So the table read does not resolve to the application
image, and where it does resolve is not established. Both halves are worth stating: the accessor is
located, and reading it does not currently produce the answer the device gives.

**Field 6 is the only field with no reading at all.** Section 57 established it is a compiled in
`0x0C` on all four images, which killed the idea that it counts the fields, and put nothing in its
place.

So the block stands at eleven of twelve fields with a reading, one of those eleven carrying an
unexplained accessor.

### Where it lands

* `docs/usb-protocol.md`, the field table, with the fields 8 and 9 paragraph corrected in place.
* `tests/test_usb_firmware.py`: `ACCESSOR_ADDRESSES` and four tests, covering the addresses on three
  images, the addressed bytes against two remotes' measured blocks, the arch 14 `CLRF` pair, and the
  pairing that carries field 9.

## 60. The state variable record, found by asking the labelled pair a question

Section 58 said the deliberately built config pair is "a different and slower instrument" than the
minimal diff it was hoped to be. This is the first thing it produced, and it took one question.

Base slot 13 has been named since section 35: a header, then a `u24` pointer per state variable.
What those pointers land on was never read. `docs/config-format.md` said so in italics: "what the
`count` pointers reach are not established."

### The question

The owner replaced a television with an AV receiver, and the two configs' slot 0 name trees record
what each remote was for:

```
before   TV_Input_12   TV_TVInput_3   TV_Screen_10   TV_Power_2   ...
after    Denon_AV_Receiver_Input_23   Denon_AV_Receiver_Power_2   ...
```

An input selector went from twelve inputs to twenty three. So: **is there a structure that reads 12
in one config and 23 in the other?** That is a question the corpus could not be asked before,
because until this week no config's contents were known.

Two candidates were checked and ruled out first, which is worth recording so nobody redoes them.
The base slot 14 value maps are **identical** across the pair, sixteen of them with the same entry
counts. So are the screen language switches, all eight of them, same variable and same arm count.
Both are the interface skeleton and neither scales with the equipment.

### The answer

The state table's records do. In the earlier config one record declares **12**; in the later one,
one declares **23**; and in each config it is the only large one. Reading the bytes:

```
before, record 33   00 00 0b 00 0c 00 00  then 12 values      103 bytes
after,  record 25   00 00 16 00 17 00 00  then 23 values      191 bytes
```

`0x0C` is 12 and `0x17` is 23, both at offset 4. So the record is:

```
+0x00  u16  zero in every record in the corpus
+0x02  u16  not the count, and not explained
+0x04  u16  count
+0x06  u8   not explained
+0x07       value[count], eight bytes each
```

and its length is **`7 + 8 * count`**. Nothing in the container declares that length, which is why
the records went unread: the pointer array gives their starts and nothing gives their extent.

The earlier config's `TV_Screen_10` has a record of 10 beside it, and the three `_2` suffixed names
in each config have records of 2. So the number in a state variable's name is the number of values
its record carries.

### Three closures

**The length rule holds corpus wide.** Across 14 containers and four architectures, of 627
consecutive record pairs, 610 end exactly where the next begins and **none overruns**. The 17 that
do not abut are the ends of runs, since a config's state records sit in two or three separate
blocks rather than one.

**Byte accounting agrees.** Claiming the records adds 698 claims and produces **zero overlaps** with
any other structure in any container. That is a stronger check than the abutting one, because it
tests the records against everything else the codec knows rather than only against each other. A
length rule that was too generous would collide with whatever follows a run.

**The count matches an artefact in a different section.** Slot 0's name tree and slot 13's records
are separate structures written by the same generator, and they agree on 12, 23, 10 and three 2s.

### What is not claimed

**The names do not map onto the records one for one, and the mismatch is stated rather than
smoothed.** The earlier config names a `TV_TVInput_3` that no record counts, and holds a record of
6 that no name mentions. So the suffix agreeing with a count is evidence about what the count means,
not a claim that the tree indexes the table.

**The eight byte values are not decoded.** The only invariant across all 509 in the corpus is that
the first byte is zero. The last byte is `0x7F` in 412 of them and five other values in the rest, so
it is not a terminator, and no reading is offered here rather than one that fits the majority and
quietly fails on the rest. In the receiver's record the third field runs 12, 10, 17, 15 and the
fourth 1508, 1608, 1509, 1533, which look like two index spaces and are left as that.

### Coverage

Modest, because the records are small, and it moves every architecture including the one that had
been stuck:

| Sample | before | after |
|---|---|---|
| Harmony 700 | 91.9% | **92.0%** |
| Harmony 600 | 87.4% | **87.5%** |
| Harmony One | 90.0% | **90.1%** |
| the safe mode containers | 89.5% | **91.8%** |
| 525, arch 9 | 14.1% | **14.6%** |
| 880, arch 8 | 82.2% | **82.3%** |

### Where it lands

* `docs/config-format.md`, base slot 13, replacing the italicised "not established".
* `gspm.StateRecord` and `Container.state_records`; `stateRecords` in `packages/codec/src/sections.ts`
  with a `slot-13-record` coverage claim.
* `tests/test_interpreter.py`, `TestTheStateVariableRecord`: the corpus wide overrun check, the
  pair reading 12 and 23, the partial name agreement stated as partial, and the one invariant the
  undecoded values have.

## 61. An infrared record's durations sit below its header, and coverage jumps to 98%

The infrared database has been named since section 32 and its records were still the largest
unclaimed thing in a config: 79470 bytes on a Harmony One, the biggest single gap the byte
accounting reported. They were unclaimed on purpose. `packages/codec/src/coverage.ts` said so:

> A record's extent is not established, and the duration run is located as the longest alternating
> one rather than read from a length, so claiming it is a heuristic wearing a measurement's
> clothes. Doing so anyway put one or two runs per config on top of a base slot 10 list, which is
> the overlap detector saying the same thing.

Both halves of that were right, and both are now fixed. The reason the heuristic failed is worth
following, because the record is laid out the opposite way round from everything else here.

### The header is 21 bytes and points backwards

```
+0x00  u16  } seven bytes, the same in every record of one device
+0x02  u16  }
+0x06  u8   }
+0x07  u8   the encoding class, and where the group array's pointer lands
+0x08  u24  the record's own start, the back pointer of section 42
+0x0B  u8
+0x0C  u24  data block, or NULL
+0x0F  u24  data block, or NULL
+0x12  u24  zero in every record seen
```

The two block pointers do not point after the header. They point **below** it: a record's durations
sit in front of it, and the header is the last thing in the run. On a Harmony One record at
`0x0429E5` the blocks are at `0x0426A9` and `0x042915`, 828 and 208 bytes earlier, and
`620 + 208 + 21` is exactly the 849 bytes to the next record.

That is why the old reader missed. It started at the header and walked forwards, so it read the
**next** record's data, and it stopped at the first place the mark and space alternation broke.

### A block is a duration run closed by a zero word

The alternation breaks because a block holds the frame **three times**, separated by a run of
consecutive spaces. On the Denon record above, one frame is 101 pulses and the block is 310 words:
lead in, frame, `32767 / 20422 / 20422` gap, frame, gap, frame, zero. The longest alternating run
finds one frame of the three, which is why the extent came out at 202 bytes instead of 620.

Read properly, the block states its own end: `u16` durations until a word reads zero, the zero
included.

### Two closures

**The terminator agrees with the layout.** The headers and the blocks tile a contiguous region, so
the distance from a block to the next boundary is an independent second opinion on its length. Over
3490 blocks in eleven configs, **3357 agree exactly, 133 stop short, and none overruns.** The short
ones are all arch 8 and are padding; short can only under claim, so it is the safe direction.

**Byte accounting agrees, and it is the harder test.** Claiming the headers and the deduplicated
blocks produces **zero overlaps** in any container, against every other structure the codec knows.
That is what the old heuristic could not do.

| Sample | before | after |
|---|---|---|
| Harmony 700 | 92.0% | **98.1%** |
| Harmony 600 | 87.5% | **98.7%** |
| Harmony One | 90.1% | **98.0%** |
| Harmony One, spare | 97.0% | **98.6%** |
| 880, arch 8 | 82.3% | **94.4%** |

### Blocks are shared, which is the point of the two pointers

Five of the Denon's 125 records are a bare 21 byte header whose pointers name blocks another record
also names. So one duration stream can serve several codes, and anything accumulating bytes has to
deduplicate or it will double count. A writer has the mirror of this constraint: a block cannot be
edited in place without checking who else names it.

### The mistake this section made, kept because it is the useful part

The first version of the reader argued that the terminator was also a validity check: a record of an
encoding class we do not decode would find no zero word, so nothing would claim it. The test written
to pin that **failed**, and the failure is the interesting result. All 277 blocks of the arch 9
sample do find a zero word, and **not one of them lands where the block ends**. A zero word is
common enough in arbitrary data to be found by accident, at a plausible looking distance.

So the terminator says how long a block is once you already know it is a block, and nothing more.
What keeps arch 9 out of the accounting is the **class byte**: every record there reads 5 and only
class 1 is claimed. Had the test been written to agree with the docstring rather than to check it,
the codec would have quietly claimed 277 wrong extents in a sample nobody looks at closely.

### Where it lands

* `docs/config-format.md`, base slot 5.
* `gspm.ir_record_blocks` and `gspm.ir_block_length`; `irRecordBlocks` and `irBlockLength` in
  `packages/codec/src/ir.ts`, with `slot-5-header` and `slot-5-block` coverage claims.
* `tests/test_gspm.py`, `TestTheInfraredRecordExtent`: the terminator against the layout, the arch 9
  negative case with the counts that refuted the first version, the sharing, and that the pointers
  point backwards.

## 62. Base slot 17 names the picture bank, and arch 9's pictures are one bit a pixel

Two corrections, both of section 55, both found by reading harmony-decompiler's `FORMAT.md` and
then testing what it says against our own parse rather than adopting it. That is what decision 7 in
`CLAUDE.md` asks for, and it paid here in a way that quoting them would not have: their claim is
about their own section numbering and their own sample, and checking it turned up something they did
not claim.

### What they said, and what checking it showed

Their section 4h reports that arch 9's section 17 is four bitmaps, `u8 format; u16 width; u16
height` then 768 bytes at one bit a pixel, 96 by 64, which is the 525's LCD size. Reading our own
parse of the same file at base slot 17:

```
00 00 | 02 60 00 40 00 | <768 bytes> | 02 60 00 40 00 | ...
```

`kind 2`, stride 96, rows 64. Four of them, and `2 + 4 * 773 + 6` is **exactly** the 3100 bytes from
the slot 17 pointer to the end of the container, the six being the trailer. So the claim holds.

**But that header is our picture header**, `u8 kind; u16 stride; u16 rows` from sections 50 and 54,
not a format of its own. Which raises the question their numbering hides: what is at base slot 17 on
the other architectures?

| sample | first bytes at base slot 17 | reads as |
|---|---|---|
| 525, arch 9 | `00 00 02 60 00 40 00` | kind 2, 96 x 64 |
| 880, arch 8 | `00 00 00 80 00 a0 00` | kind 0, 128 x 160 |
| 600, arch 14 | `00 00 00 80 00 80 00` | kind 0, 128 x 128 |
| 700, arch 14 | `00 00 00 80 00 80 00` | kind 0, 128 x 128 |

Those are the exact dimensions section 53 identified as the large pictures a mode program names. So
base slot 17, plus two, is the start of the **picture bank**.

### The bank is addressed, on three architectures of four

Section 55 found the bank's start by trying every offset above the named content and keeping the one
whose walk lands exactly on the trailer while containing every addressed picture. It works, and it
was never necessary except on arch 12: **`slot 17 + 2` is the bank start on all seven arch 8, arch 9
and arch 14 samples**, exactly, with the walk from there landing on the trailer.

Arch 12 is the exception and the reason is now obvious rather than mysterious. It is the only
architecture here with a touch screen, and section 45 established that base slot 17 is its touch hit
map. So the slot is reused, and on arch 12 the bank really is unaddressed and the search stays.

What the two bytes ahead of the bank are is not established. They are zero in all seven.

### Arch 9 has a region after all

Section 55's closure was that the containers emitting no screen opcode 2, the arch 9 sample and the
three safe mode containers, have no such region.<!--superseded--> Three of those four still hold. The arch 9 sample
does not: it emits no opcode 2 and it carries four pictures regardless.

**The faulty step was inferring absence from unreachability.** Nothing in the 525's programs draws a
picture, and the pictures are there, named by a pointer nobody had followed. That is the same shape
of error as section 49's hunt for a second referent, and it is worth noticing that it recurred.

> **Corrected by section 64, and the correction is the same lesson a third time.** The paragraph
> above says nothing in the 525's programs draws a picture. Something does: **screen opcode 22**,
> eleven operand bytes whose last three are a picture address, 912 instances across 114 mode
> records. It was invisible because the programs holding it were themselves unreachable, for want
> of that one operand count. So the reasoning was not merely "absence from unreachability" but the
> same step twice over, and the fix was the same as section 54's: one table entry.

**Kind selects the pixel depth, and the depths are per architecture.** Section 50 read kind 2 off the
arch 12 and arch 14 firmware as a handler that is a bare `RETURN`, which is correct for those. On
arch 9, whose remote has a monochrome LCD, kind 2 is one bit a pixel: `5 + stride * rows / 8`, which
makes 96 by 64 come to 773 bytes. That is why the reader gave kind 2 no length and why arch 9 could
not be walked.

### Coverage

Arch 9 moves for the first time in a while, and nothing else changes, since the other architectures
were already reading their banks by search.

| Sample | before | after |
|---|---|---|
| 525, arch 9 | 14.6% | **18.5%** |

Still the worst covered architecture by a wide margin, and still for the same reason: there is no
arch 9 firmware here to appeal to. `docs/memory-map-525.md` is the plan for changing that.

### Where it lands

* Section 55, corrected in place, and `TestThePictureBank.WITHOUT` loses `h525_config` with the
  reason in a comment.
* `gspm.picture_bank_start`, `BITMAP_MONOCHROME_ARCHITECTURES`; `pictureBankStart` in
  `packages/codec/src/screen.ts`. `picture_bank` prefers the stated start and falls back to the
  search, so arch 12 is unaffected.
* `tests/test_interpreter.py`: the four monochrome pictures, and the stated start against all eight
  samples that have one plus arch 12 as the negative case.

## 63. Arch 9 packs a glyph two bits to a pixel, and its font reads as letters

Section 62's lesson, one slot over. The picture bank turned out to be present on arch 9 and encoded
at a smaller pixel depth because the 525 has a monochrome panel; base slot 7 is the same story, and
the reader had been refusing that architecture since section 46 with "the glyphs are packed
differently" and nothing more.

The set header is not the difference. `font_sets` already read arch 9: five sets, heights 11, 11,
11, 11 and 8, 66 glyph slots each, 160 of the 330 non NULL. What refused was the glyph itself, which
on arch 8, 12 and 14 is a flat stream of skip and literal operations with a two byte pixel.

### The encoding

```
+0x00  u8   width in pixels
       one row per pixel row, until a 0x00 appears in the leader position:
         +0x00  u8   0x20 | n, n being how many bytes of commands the row occupies
         n bytes of commands, each  kind << 4 | (count - 1):
           0x5   count literal pixels, two bits each, big endian, ceil(2 * count / 8) bytes follow
           0x6   a run of count background pixels, no data
           0xA   a run of count ink pixels, no data
```

The Harmony One's `H`, seven wide and eleven tall, is the whole format in one line:

```
07  21 66  21 66  23 56 9a 98  23 56 9a 98  23 56 9a 98  23 60 a4 60  23 56 9a 98 ... 21 66  00
```

Two blank rows, `0x66` being a run of seven; then stem rows, `0x56` seven literal pixels in
`9a 98`, whose bit pairs are `10 01 10 10 10 01 10`; then the crossbar, `60 a4 60`, one background
pixel, five ink and one more background; then the stems again and two blank rows.

The rows have **two independent statements of their own length**, the leader's byte count and the
commands' pixel count, and both have to come out exactly. That redundancy is what makes a misread
fail loudly instead of producing a plausible bitmap.

### Four closures, all inside one sample

The corpus has one arch 9 config and there is no arch 9 firmware, so the usual "two independent
samples" is unavailable. What replaces it is four checks over 160 glyphs, three of them structural:

| check | result |
|---|---|
| every row comes to exactly the glyph's `width` | 160 of 160 |
| every glyph comes to exactly its set's `height` | 160 of 160 |
| the decode ends exactly where the next glyph starts, nothing left over | 160 of 160 |
| the glyphs render as Latin letters, digits and punctuation | by eye, `--images` |

The third is the same closure section 55 used on the picture bank, and it is tested the way that
one is: truncating the glyph by a single byte has to **fail**, because the terminator is the last
byte. A glyph carrying even one byte of slack would still find its terminator in the short read.

### Which value is the ink, derived rather than chosen

Only two of the four values a two bit pixel can hold ever occur, 1 and 2, in 5489 literal pixels.
Which is the ink, and what the two run kinds fill with, could have been settled by looking at the
render and keeping whichever looked like letters. It was not, because that is the weakest kind of
argument available and section 46's own correction came from trusting a plausible reading.

The encoder supplies a better one. **A run is maximal**: it would have been extended rather than
restarted, so whatever sits beside a run holds a different value. Two consequences, measured:

* **80 of 80** adjacent run pairs alternate the two kinds. Never `6` beside `6`, never `A` beside
  `A`. So the two kinds hold different values, and since only two values exist they hold one each.
* **50 of 50** literal pixels immediately beside a kind `6` run read **1**, never 2. So kind `6`
  does not hold 1. It holds 2, and kind `A` holds 1.

That fixes the pair to each other without deciding which is the paper. **160 of 160 glyph cells
open with a full width run of kind `6`**, and kind `A` never appears in the top or bottom row of any
cell. A font whose cells opened with a row of ink would underline every line of text on the screen.
So kind `6` is the background, value 2 is the paper and value 1 is the ink.

A weaker version of the same question was tried first and is recorded because it is a useful
calibration: minimising the vertical pixel difference over the two assignments, which is how
section 51 recovered the picture width, scores 23.6% against 27.5%. A margin of 1.16 times, where
section 51 had 1.5, and not enough to conclude anything from. The maximality argument has no
counterexample at all.

### What did not close, and it matters

Section 46's third closure was that **16054 inline string codes all resolve** to a non NULL glyph
of the font their own program selected. It is not available here: the 525's config has **zero**
inline string codes. Only 22 screen programs are reachable at all, against 4527 on a Harmony 600,
because arch 9's mode records mostly do not decode and section 53's mode program root therefore
reaches almost nothing.

So the glyphs are read and **nothing in this config is known to draw them**, which is the same
shape as section 62's pictures. Both point at the one thing arch 9 is missing rather than at a
defect in either reading.

> **Section 64 supplies the closure the same day.** One missing operand count was hiding the
> programs, and with it 136 are reachable rather than 22 and there are **1205 inline string codes,
> all 1205 resolving**. They draw as readable English phrases. Neither finding was derived from the
> other, so the check is genuine: the width was fixed by picture addresses and the glyphs by their
> own row and height arithmetic, and they agree.

Two smaller things are unexplained rather than glossed. The row leader's high nibble is `0x20` in
all 1730 rows, so whether it is a tag or the high bits of a longer length field is not settled by
one sample. And values 0 and 3 never occur, so whether the panel has four grey levels of which this
font uses two, or the two bits are a value beside its complement, is likewise open.

### Coverage

| Sample | before | after |
|---|---|---|
| 525, arch 9 | 18.5% | **25.7%** |

Still last by a wide margin. The rest of the gap is the mode record tail, 71 of 114 not decoding,
and that needs firmware. `docs/memory-map-525.md` is the plan.

### Where it lands

* `gspm.IMAGE_PACKED_ARCHITECTURES` and the constants beside it, `Container._packed_image`;
  `packedGlyph` in `packages/codec/src/font.ts`. `IMAGE_ARCHITECTURES` gains 9 in both.
* `tools/screen_dump.py --images` draws them, through a `paper_value` that stops a renderer
  treating every nonzero value as ink.
* `tests/test_interpreter.py`, `TestTheArch9GlyphPacking`: six tests, one per closure above plus a
  calibration that the packed reader is refused where it does not belong.
* The corpus glyph total moves from 3933 to 4093 in both suites.

## 64. Screen opcode 22 is a call on arch 12 and a picture draw on arch 9

The third time an architecture's mode programs turned out to be shut by a single missing operand
count, and the second time it was this pair of opcodes. Section 54 opened arch 12 with `23: 0`.
This opens arch 9, and it also answers what sections 62 and 63 had to leave standing.

### Arch 12, from the firmware

Opcode 22 was in the arch 12 dispatcher and in no config, so its width was unestablished and both
codecs refused it. Its handler is at `0x2966E` on the Harmony One 3.4 image:

```
2966e: CALL 0x2b88a          ; the current stream position -> 0x01F..0x021
29672: MOVFF 0x01f,0xd34
29676: MOVFF 0x020,0xd35
2967a: MOVFF 0x021,0xd36     ; save it
2967e: MOVLW 0x03
29682: ADDWF 0xd34,F         ; ... plus three
29690: CALL 0x2b8ac          ; read a u24 and seek there
```

`0x2B88A` computes where the reader is and reads nothing. `0x2B8AC` reads three bytes and makes
them the new position. So **opcode 22 consumes three operand bytes, jumps to the address they
hold, and leaves the byte after them in `0xD34` to `0xD36`.** That is a call with a return address.

And it names the other half. Section 54 described `0x29640`, opcode 23's handler, as copying the
stream position into `0x19C` to `0x19E` and had no name for it. It copies **`0xD34` to `0xD36`**,
which is what opcode 22 wrote. Opcode 23 is the **return**.

A trace of those three bytes over the whole image, restricted to the dispatcher, shows exactly one
writer and one reader: `0x29672` onwards and `0x29640` onwards. Outside the dispatcher the same RAM
is reused by unrelated code, which is why the restriction is in the test rather than assumed away.

**One link register, not a stack**, so these calls do not nest. That is a writer rail.

No config in the corpus uses opcode 22 on arch 12, so the width is firmware and the semantics are
untested against data.

### Arch 9, from the corpus, because there is no firmware

Every arch 9 mode record's tail starts `16 00 03 00 00 00 00 60 08 8b 2f 03 17`, repeated with an
incrementing first operand byte. Eight of them, and the middle bytes step by eight:

```
00  03 00  00 00  00  60 08  8b 2f 03
01  03 00  08 00  08  60 08  8b 2f 03
02  03 00  10 00  10  60 08  8b 2f 03
...
07  03 00  38 00  38  60 08  8b 2f 03
```

The 525's screen is 96 by 64 and `0x60` is 96, so eight bands of eight rows cover it exactly. The
individual fields are **not** claimed here. What is claimed is the width, eleven, and that the last
three bytes are a `u24`.

**The closure is that the `u24` is always a picture.** Walking the bank from where base slot 17
says it starts, section 62, gives four addresses. At width eleven, **all 912 instances across all
114 mode records name one of those four**. At every other width from 3 to 15, zero do.

The calibration matters because the obvious criterion is useless here. Six widths, 0 through 5,
also decode all 114 records, because a short operand count simply lands the walk on a byte that
happens to be a valid opcode. That is exactly the ambiguity section 54 could not resolve for
opcode 23 and had to take to the firmware. Here there is no firmware and the corpus separates the
candidates by itself, on a criterion the candidates cannot influence.

So `SCREEN_FIXED_OPERANDS` can no longer hold opcode 22 at all: it is the one opcode whose width
differs by architecture, three on arch 12 and eleven on arch 9. And only arch 12's address is a
program; arch 9's is a picture and must not be walked into.

### What it opens

| | before | after |
|---|---|---|
| arch 9 mode records carrying a screen program | 0 of 114 | **114 of 114** |
| reachable screen programs in the 525 config | 22 | **136** |
| inline string codes in the 525 config | 0 | **1205**, all resolving |
| byte accounting, 525 | 25.7% | **49.8%** |

`MODE_PROGRAM_ARCHITECTURES` is now all four.

**The 1205 strings are the real prize**, because they close section 63 rather than this one.
Section 46's third check, that every inline code lands on a non NULL glyph of the font its own
program selected, was unavailable on arch 9 this morning for want of any strings to check. The
codes now resolve, and `tools/screen_dump.py --strings` draws them as readable English phrases.
The glyph packing was derived from row and height arithmetic and the operand width from picture
addresses, so neither finding fed the other and their agreement is a genuine check.

### Where it lands

* `gspm.SCREEN_OPERANDS_BY_ARCHITECTURE`, `SCREEN_CALL`, `SCREEN_CALL_TARGET_ARCHITECTURES`,
  replacing `SCREEN_ARCH12_ONLY`; the same three in `packages/codec/src/screen.ts`.
  `MODE_PROGRAM_ARCHITECTURES` gains 9 in both.
* Sections 62 and 63 corrected in place: both said nothing in the 525's config draws the thing
  they had just read, and both were wrong for the same reason.
* `tests/test_interpreter.py`, `TestScreenOpcode22`: the dispatcher case, the link register trace,
  the 912 pictures, the calibration over every other width, and the 1205 strings.

## 65. Infrared class 5 keeps class 1's header, and that is all it keeps

Arch 9's infrared records have been the largest single unread structure in the corpus for a while,
and `docs/memory-map-525.md` lists them as the one thing a firmware image would settle. This does
not settle them. It reads the part that does not need a firmware, and it says exactly where the
part that does begins, which is worth more than it sounds: the byte accounting had **one** gap of
28711 bytes on the 525, 73% of everything still unattributed, and it was not labelled.

### The gap is base slot 5, and both of its ends are fixed

The gap runs `0x021F3B` to `0x028F62`. Base slot 5's group arrays name 200 records, and:

* the **lowest** backward pointer any record holds is `0x021F3B`, and
* the **highest** header ends at `0x028F62`.

Neither number was chosen to make the other agree. The bottom comes from the pointers and the top
from the headers, and they land on the two ends of a gap that the accounting reported before this
reading existed. `gspm.ir_region` returns the pair.

### Everything structural about class 1's header holds on class 5

Section 61 read a 21 byte header off class 1: the class byte where the pointer array lands, the
record's own start three bytes later, two `u24` pointing backwards at data blocks, and a third
`u24` that is always NULL. All four hold on all 200 arch 9 records:

| | |
|---|---|
| class byte at +7 | 5 in 200 of 200 |
| `u24` at +8 is the record's own start, seven back | 200 of 200 |
| both `u24` at +12 and +15 point backwards and stay in the area | 200 of 200 |
| `u24` at +18 | NULL in 200 of 200 |
| the headers never overlap, so 21 bytes each fits | 199 of 199 |

So the header is one structure across two encoding classes, which is the same shape of result as
section 52's "the container's key table is the first mode record, byte for byte".

**The blocks are a different matter and are deliberately not claimed.** Below the header, class 5's
bytes are not duration streams. Section 61 already recorded the trap: all of arch 9's blocks find a
zero word and not one of them is in the right place, so a reader that walked to a terminator would
claim a confident and wrong extent. `irPulses` on an arch 9 record still returns a plausible
looking list of durations today, and a test pins that it does, because the gate has to be the
**class byte** and nothing else.

### What class 5 actually is, as far as the bytes go

Recorded because it is what the next person starts from, and marked as **not established**. The
area alternates block content and headers, and a record's body reads:

```
u24   a shared descriptor, 66 distinct values over 200 records, 135 of them
      landing in a second unattributed area of 1814 bytes near base slot 5's own pointer
u16   39 in most records
u16
      then a run of small values, typically 32 of exactly two values followed by 04 05 06 07 08
```

Thirty two of two alternating symbols is the shape of a 32 bit remote code with one symbol per bit,
which would make class 5 a **table driven** encoding where class 1 is a literal one, and the shared
descriptor the table. That is a conjecture with nothing behind it but the shape. It is not in the
code and it should be tested against an arch 9 firmware rather than against more of the same file.

The rule "each header's block area is the one immediately before it" was tried and **fails**: it
holds for 135 of 199 and the other 64 point further back, so the areas are shared in some pattern
this does not recover.

### Coverage

| Sample | before | after |
|---|---|---|
| 525, arch 9 | 49.8% | **55.1%** |

4200 bytes, being 200 headers of 21. The 24511 bytes of block content stay in the gaps, where an
undecoded structure belongs; inflating the number by claiming a span whose contents nobody can read
would make the measure useless for exactly the thing it exists to track.

### Where it lands

* `gspm.IR_CLASS_ARCH9`, `IR_HEADER_CLASSES` and `gspm.ir_region`; the same three in
  `packages/codec/src/ir.ts`. `coverage.ts` claims the header for both classes and the blocks for
  class 1 alone.
* `tests/test_gspm.py`, `TestTheArch9InfraredHeader`: the four header properties, the non overlap,
  the region landing on both gap boundaries, the deliberate refusal of the blocks, and a
  calibration that class 1 is untouched.

## 66. A mode has pages, and each one names its own key map and its own screen

Base slot 6's entry was read as four bytes: a kind byte and a `u24` back pointer to the record
(section 52). That was not wrong, only short. The entry runs on for a `u16` and an array of `u24`
addresses, and what those addresses reach is most of what the byte accounting still could not name
on any architecture.

### How it was found

Not by reading the firmware. By asking `make coverage --detail` for the **whole** gap list rather
than the twenty largest it prints, and noticing that on all four architectures the leftovers fall
into two families with **exactly the same number of gaps in each**:

| container | arch | unaccounted | gaps after `slot-6-tail` | gaps after `slot-11-program` |
|---|---|---|---|---|
| 525 | 9 | 35201 | 2430 in 114 | 5351 in 114 |
| 880 a | 8 | 24661 | 3723 in 103 | 8684 in 103 |
| Harmony One | 12 | 33616 | 7380 in 268 | 22288 in 268 |
| Harmony 600 | 14 | 9403 | 4177 in 237 | 3256 in 237 |

114, 103, 268 and 237 are the mode counts. Two families with one count between them is one
structure straddling the four bytes that were claimed, not two structures beside it.

### What the firmware reads

Section 37 located base slot 6's consumer at `0x16816` on the Harmony 700 and said it "follows a
further pointer at offset 6 inside the entry", read and not followed. Following it is this section.

```
CALL 0x10B92           seek base slot 6 and follow its pointer
0x6E3:0x6E4 = mode     the index
0x6E2 = 3              the literal
CALL 0x10C36           TBLPTR += 3 * index + literal, then seek
CALL 0x10A30           follow the u24 there: the entry
save TBLPTR in F2A..F2C
0x6E3:0x6E4 = 0
0x6E2 = 6
CALL 0x10C36           TBLPTR = entry + 6
CALL 0x10A30           follow the u24 there
save TBLPTR in F25..F27
```

`0x10C36` is four instructions of `3 * index + literal`, which is what makes the offset and the
stride facts rather than a reading of the bytes. The same helper is used twice with two literals,
3 for the section's own array and 6 for the entry's.

Then at `0x169AA`, reached when the remote changes page:

```
TBLPTR = entry
0x6D9 = 4
CALL 0x10B48           TBLPTR = entry + 4
0x6D3:0x6D4 = 0x0D3E
CALL 0x10A5E           read two bytes into 0x0D3E
```

`0x10A5E` reads exactly two bytes, and `0x0D3E:0x0D3F` is then compared against a counter that the
surrounding code increments at one site and decrements at another, wrapping to zero at the top and
to the count minus one at the bottom. That counter goes back into `0x6E3:0x6E4` with a literal of
**0**, and `0x10C36` is called again from `entry + 6`. So the `u16` is a count and what follows it
is an array of that many `u24`s, indexed by a wrapping cursor.

```
at the table pointer   u8 kind; u24 record start; u16 pages; u24 page[pages]
```

The old four byte reading is the first two fields of this.

### What a page is

`F25..F27` holds the address of one page, and three routines read it back.

| site | offset | what it does with it |
|---|---|---|
| `0x16918` | page + 0 | follow the `u24`, run the tagged list there against a tag |
| `0x16778` | page + 3 | follow the `u24`, hand it to `0x1879C` |
| `0x28166` / `0x28422` / `0x281A2` | arch 12, see below | the same two, one byte later |

`0x1879C` is the screen language interpreter, section 40. `0x1B71E` is the tagged list runner,
section 39. So a page is two pointers: a tagged list of its own and a screen program.

```
arch 8, 9, 14   u24 list; u24 program                6 bytes
arch 12         u8 unknown; u24 list; u24 program    7 bytes
```

**The arch 12 lead byte comes from the consumer, not from the layout**, and it is the one place
this could have gone wrong quietly. The Harmony One 3.4 image has three call sites for slot 6,
`0x25D24`, `0x28280` and `0x28380`; `0x28280` is the analogue of `0x16816`, with the same literals
3 and 6, and its page reader at `0x28166` sets the offset register to **zero and reads one byte**
before the pointer follows at offset 1 (`0x28422`) and offset 4 (`0x281A2`). Nothing in either
image reads that byte back afterwards, so what it selects is not established.

The corroboration from the data is that the page abutting each entry sits exactly six bytes before
it on arch 8, 9 and 14 and exactly seven on arch 12, in **2396 of 2396 entries** across seventeen
containers. A field split one byte out satisfies neither the distance nor the two checks below.

### The three closures

**Every page pointer resolves**, 2906 of 2906 in seventeen containers spanning four architectures,
three format versions and four flash bases. Page counts run 1 to 14, with 2238 entries carrying
exactly one.

**Every list field lands in the one unclaimed run above base slot 7's table**, 1503 of 1503 in the
eight configs measured before the claim existed, and claiming them fills that run almost exactly:

| container | run above slot 7's table | page lists claim | left over |
|---|---|---|---|
| 525 | 1086 | 1052 | 34 |
| 880 a | 2050 | 2046 | 4 |
| Harmony One | 3928 | 3924 | 4 |
| Harmony 600 | 1963 | 1929 | 34 |
| Harmony 700 | 3592 | 3558 | 34 |

That run was a single contiguous gap in every container and nothing had explained it. It is a pool
of per page key maps.

**Every program field decodes as a screen program**, 1503 of 1503, which is the check section 53
established: instructions are variable length with no length field, so a start one byte out
desynchronises and the next byte read as an opcode is almost certainly not one of the eleven.

And zero overlaps. The byte accounting reports none in any of the seventeen containers after the
entry, the page and the page's list are all claimed, which is what says the extents are right
rather than merely plausible.

### It corrects section 53 in one direction and confirms it in the other

Section 53 computes a mode's screen program as the record start plus the length of its tagged
list. A page **states** it, so the two can be compared.

| arch | first page's program equals the computed root |
|---|---|
| 9 | 114 of 114 |
| 14 | 237 of 237, 374 of 374, 35 of 35 |
| 8 | 92 of 103, 112 of 125, 140 of 154 twice |
| 12 | **0 of 268, 0 of 111, 0 of 30** |

On arch 12 they never coincide, and the reason is not that section 53 was wrong: the stated
program starts 8 to 46 bytes later and its **first instruction is a call to the address section 53
computed**. Opcode 22 is a call on arch 12 (section 64), so the computed root is a fragment the
real program calls rather than a mistake. On arch 8 the eleven to fourteen disagreements per
config are the same shape, 37 to 56 bytes later.

The rule worth keeping: where a structure states an address, use the stated one. The computed one
was right about which architectures have mode programs and wrong about where three of them start.

### What it moves

Byte accounting, `make coverage`, zero overlaps everywhere:

| container | before | after |
|---|---|---|
| 525, arch 9 | 55.1% | 64.1% |
| 880, arch 8 | 94.4% | 97.0% |
| Harmony One, arch 12 | 98.0% | 99.6% |
| Harmony 600, arch 14 | 98.7% | 99.6% |
| Harmony 700, arch 14 | 98.1% | 99.5% |
| safe mode, arch 14 | 91.8% | 98.2% |
| safe mode, arch 12 | 19.1% | 35.0% |

Screen programs across the corpus go from 20374 to 21392 and inline string codes from 41793 to
55542, every one of which still resolves to a glyph of the font its own program selected.

**And the pictures.** Section 55 could name about a third of a picture bank by screen opcode 2.
Now **every picture in an arch 12 bank is named**, 98 of 98 and 70 of 70, with exactly two left
over per container on arch 8 and arch 14. The One goes from 28 addressed pictures to 98, with
strides up to 176 and row counts up to 220. So the bank is not a region that happens to hold
pictures, it is the set of pictures the programs draw, and the two unnamed ones per arch 8 and
arch 14 container are the whole of what is left of that question.

### What it does not do

**It does not read the rest of a mode record.** On arch 12 and arch 14 what remains unaccounted is
now **seven gaps**, of which two carry almost all of it: 5854 bytes in two runs on the Harmony One,
2941 on the 600, 4845 on the 700, each following a mode entry. That is the next target and it is a
much smaller one than the 268 and 237 gaps it replaces.

**It does not touch arch 9's infrared.** 24467 of the 525's remaining 28165 bytes are the class 5
block area of section 65, which wants a firmware nobody has.

**It does not say what the lead byte selects**, nor the kind byte at the entry's start, which is 0
in 2326 entries and 1 in 70, all of them on arch 8 and arch 12. The firmware tests its bit 0 at
`0x168AE` and branches, so it is a flag rather than an index, and that is as far as this goes.

**It does not name the tags.** The tagged list at a page is searched for tag `0x29` and then tag
`0x2A`, at four sites between them, and the mode record's own list is searched as a fallback when
the page's yields nothing. So a page **overrides** rather than replaces. Under section 17's split a
tag is an event type and a scan code, which makes these scan codes 41 and 42 with event type 0, and
the two sit either side of the code that increments the page cursor. Calling them the page keys is
the obvious reading and it is not evidence, so it is not claimed here.

### Where it lands

* `docs/config-format.md`, base slot 6.
* `src/harmony/gspm.py`: `ModePage`, `MODE_PAGE_LEAD_ARCHITECTURES`, `MODE_PAGE_POINTERS`,
  `MODE_ENTRY_HEADER`, `Container.mode_pages`, and the page programs in
  `screen_program_roots`.
* `packages/codec/src/sections.ts`: the same, plus `modePages`; `src/screen.ts` for the roots and
  `src/coverage.ts` for the `slot-6-entry`, `slot-6-page` and `slot-6-page-list` claims, which
  replace the four byte `slot-6-tail` one.
* `tests/test_interpreter.py` `TestTheModePages`, and `packages/codec/test/sections.test.ts`, with
  every corpus total moved and the old value recorded beside the new one.

## 67. The two runs are a pool of tagged lists, and only base slot 9's part of it is claimable

Section 66 left the remaining unaccounted bytes as two runs per container, both following a mode
entry: 5854 on the Harmony One, 2941 on the 600, 4845 on the 700. This says what is in them, claims
the part that is derived, and records at length why the rest is not, because the tempting claim here
fails a test it looks like it should pass.

### They are tagged lists, packed end to end

The first bytes of the Harmony 600's larger run:

```
02 89 cc 09 7f a2 33 00 7e | 02 89 cd 09 7f a2 33 00 7e | 01 a2 ...
```

which is the narrow tagged list form of section 39, `u8 count` then `{ u8 tag; u16 operand; u8
opcode }[count]`, three lists in nineteen bytes. Walking each list by its own declared length from
the run's first byte lands exactly on the run's end, in **25 runs across sixteen containers and four
architectures**, with the wide form's `u8 0; u8 count` handled the same way. A run of zero bytes is a
sequence of empty wide lists, which is why both runs begin with one.

### Base slot 9's pointers land on a list, and that is the claim

`coverage.ts` has refused to claim base slot 9's sets since section 52, in those words: slot 9's
pointers land on lists that decode, but nothing had established that they land on the **start**
rather than inside, and claiming an extent on that basis is what produced overlaps before.

Settled by the negative. Read a slot 9 pointer's target as slot 6's shape, `u8 kind` followed by a
`u24` back pointer, and ask whether that `u24` gives an address below the pointer itself:

| | sets | that yield a backward address |
|---|---|---|
| base slot 9, six containers | 54 | **0** |
| base slot 6, for calibration | 1616 | 1616 |

Not one of 54. So the indirection base slot 6 has is not present here, the pointer is the list, and
the list states its own length. Every one of the 54 decodes, 1364 entries between them, and their
tags are `0x81` to `0xbf`, which is section 17's key code shape and matches section 39 calling this
the binding table.

Coverage with the sets alone, zero overlaps: 99.8% on a Harmony One, 99.7% on a 600, 99.6% on a
700, 97.2% on arch 8 and 65.1% on the 525. With the rest of the pool, below, it goes further.

### What the rest is, and why it is not claimed

The lists the walk finds, counted at the true run start:

| container | arch | lists | pages | slot 9 sets | pages + sets |
|---|---|---|---|---|---|
| Harmony One | 12 | 346 | 330 | 16 | 346 |
| Harmony One, spare after sync | 12 | 153 | 144 | 9 | 153 |
| Harmony 600 | 14 | 263 | 254 | 9 | 263 |
| Harmony 700, both | 14 | 437 | 426 | 11 | 437 |
| 525 | 9 | 143 | 135 | 8 | 143 |
| 880 a to d | 8 | 150, 183, 215, 215 | 141, 173, 204, 204 | 9, 10, 11, 11 | 150, 183, 215, 215 |
| the safe mode containers | 12, 14 | 31, 36 | 30, 35 | 1, 1 | 31, 36 |

**Sixteen of sixteen, exactly.** One list per page plus one per base slot 9 set, and the page half
is not the list a page names: those are a different pool, above base slot 7's table, and only 62 of
330 on the One are even byte identical to one here.

~~**It is still not claimable, and the reason is a test that failed.**~~ **That was wrong, and it
was wrong in an instructive way.** The paragraph below is kept because the measurement in it is
correct and the conclusion drawn from it was not.

> The picture bank of section 55 is claimed without any pointer naming it, because its start is
> *derived*: candidate offsets are tried and exactly one satisfies both the exact landing and the
> presence of every addressed picture. The same derivation was run here, requiring the walk to land
> on the run's end and every base slot 9 pointer in the run to fall on a list boundary, and it gives
> **41, 45, 50, 42, 35 and 1275 candidate starts** rather than one. A tagged list walk is far too
> permissive to locate anything: a wrong start tiles just as happily as the right one.

The measurement holds: a tagged list walk really does tile from hundreds of wrong offsets, so the
exact landing is not evidence on its own and section 55 was safe only because a second constraint
carried it. **What was wrong was concluding that the start therefore could not be had.** It does not
have to be searched for at all.

**Every one of the 29 runs begins on the byte after a mode entry's page array ends**, in seventeen
containers. The start is stated, by the structure section 66 read. Asking whether the walk could
find the start was asking the wrong question of the wrong structure, and the lesson is the one this
document keeps relearning: when the data could tell you and something else does tell you, believe
the something else.

### The pool, bounded at both ends

```
start   a mode entry's end, that is  entry + 6 + 3 * pages
walk    tagged lists, each by its own declared length
end     the lowest address above the start that another reader already names
```

The upper bound uses only addresses other readers produce: mode record starts, entries, pages,
page lists, page programs, the mode table, and base slots 10 and 11. **Base slots 10 and 11 by base
number and never by raw slot**, because raw slot 10 is base slot 9 on arch 8 and arch 12, and slot
9's sets are inside a pool, so bounding with them stops the walk on the thing it is meant to
contain. That mistake was made once here and it cost the arch 12 safe mode container, which came
back with no pool at all while every other container came back right.

One further condition, and it is what makes the rule specific rather than merely satisfiable: **a
run has to contain at least one base slot 9 set, on a list boundary.** With it the rule accepts two
runs of the seven candidates in a Harmony One, two of 206 in the 525 and two of 130 in an arch 8
config, and one in each safe mode container. Seventeen of seventeen, byte for byte the runs above.

Nothing in this consults the byte accounting, which would be circular. It is a reader.

### The negatives, so the next attempt is cheaper

**Nothing names these lists.** Every three byte value in the container was resolved against every
list start: on the Harmony One 21 of 346 are named at all, 16 of them by base slot 9's own table and
the other five from inside picture data and an action list operand, which is what coincidence looks
like at that density. The two runs' own start addresses appear nowhere; what does appear is each
run's **end**, in base slot 10's table, because that is simply where the next action list begins.

**There is no fifth consumer in the firmware.** The tagged list runner `0x1B71E` has exactly four
call sites on the Harmony 700 image: `0x167DE` and `0x168A0` are a mode record's list with tags 7
and 6, `0x16938` and `0x16966` are a page's list and its fallback to the mode record's, and
`0x1B718` is base slot 9's, reached from its consumer at `0x1B6FE` with the index in `0x3C3` and the
tag in `0x3C4`. None of them reaches the pool. So whatever walks the other 330 lists either indexes
them from a base this analysis has not found, or is not the tagged list runner at all.

**They are not copies of the page lists**, tested byte for byte: 62 of 330 match on the One, 135 of
254 on the 600, and a container whose modes are nearly empty matches 30 of 30, which is what an
empty list matching an empty list gives.

### What it moves, and it is the milestone

| container | before section 66 | after 66 | sets, 67 | the pool, 67 |
|---|---|---|---|---|
| Harmony One | 98.0% | 99.6% | 99.8% | **100.0%** |
| Harmony One, spare | 98.6% | 99.8% | 99.8% | **100.0%** |
| Harmony 600 | 98.7% | 99.6% | 99.7% | **100.0%** |
| Harmony 700 | 98.1% | 99.5% | 99.6% | **100.0%** |
| 880, arch 8 | 94.4% | 97.0% | 97.2% | 97.7% |
| 525, arch 9 | 55.1% | 64.1% | 65.1% | 66.4% |
| safe mode, arch 14 | 91.8% | 98.2% | 98.4% | 99.4% |

**Both target architectures are at 100.0%**, with 24 bytes unattributed in a 1.63 MB Harmony One
config and 41 in a Harmony 600. Zero overlaps in all seventeen containers. That is the first of the
three parts of milestone M2 in `docs/roadmap.md` complete for arch 12 and arch 14: an emitter can
now rebuild essentially all of a config rather than copying a residue.

Arch 8 and arch 9 are not there, and both remainders are infrared: 9864 bytes of duration blocks on
arch 8 and 24467 of class 5 on arch 9, the latter still wanting a firmware nobody has.

### Where it lands

* `docs/config-format.md`, base slot 9 and the pool.
* `packages/codec/src/sections.ts`: `taggedListPools`, and `src/coverage.ts` for the `slot-9-list`
  and `tagged-list-pool` claims, replacing the comment that said why there were none.
* `packages/codec/test/sections.test.ts`: the 54 sets, their entry counts, the absent back pointer
  with base slot 6 as the calibration, and the pool's two derived ends with the count identity.

## 68. A mode page has two tagged lists, keyed by the same tags

Section 67 claimed the pool and left its purpose open, with the count identity as the only clue:
one list per mode page plus one per base slot 9 set, exact in every container. This says what the
per page ones are, and does not say where the firmware reads them, which is now the sharper half.

### The pairing

**Every page's list has a twin in the pool with exactly the same tag sequence.**

| container | pages | paired | pool lists left over |
|---|---|---|---|
| the four Harmony One configs | 330, 152, 152, 144 | all | 0 |
| the two Harmony 700 configs | 426, 426 | all | 0 |
| Harmony 600 | 254 | all | 0 |
| 525, arch 9 | 135 | all | 0 |
| the four arch 8 configs | 141, 173, 204, 204 | all | 0 |
| the five safe mode containers | 30, 30, 35, 35, 35 | all | 0 |

**2906 of 2906 pages, seventeen of seventeen containers, and nothing unpaired in either direction.**
It is a bijection, not a coincidence of totals: the tag multisets agree exactly, which is what the
aggregate first showed. On a Harmony One the pool's tags are `0xb1` 264 times, `0xb2` 251, `0xb0`
100, `0xb3` 80, and the page lists' tags are the same eight tags at the same eight counts.

What differs is the payload. Over the pairs, **0 of 175 entries share an operand** on a Harmony One
and 0 of 115 on a 600, while 161 of 175 and 70 of 115 share an opcode. So the same tag maps to two
different things, of the same kind.

The two lists are never adjacent, never at the same rank in their pools, 85 of 330 by address order
on a Harmony One, and never the same bytes: the pairing is by content and the layout does not
express it.

### What it settles about the pool

The count identity of section 67 is explained: `pages + sets` because the pool is one list per page
plus base slot 9's, and slot 9's are simply stored in the same run. Nothing is left over on either
side of the ledger, in any container, which is the strongest form the check can take.

**The empty ones are consistent too.** 62 of 330 pool lists on a Harmony One carry no entries, and
**every empty list is in the wide form and every wide form list is empty**, 62 of 62, 63 of 63, 72
of 72, 53 of 53 and 41 of 41. That is the shape section 53's correction predicted: an empty wide
list has no entry to carry a flags byte, which is why inferring the form from the entries fails.

### What it does not settle, and where to look

**Nowhere in either firmware image is a second list per page read**, and that is now a sharper
statement than section 67's. A page record is `u24 list; u24 program`, six bytes, seven on arch 12,
and it carries exactly one list pointer. The tagged list runner `0x1B71E` has four call sites, all
accounted for. And the helper that indexes an entry, `0x10C36`, is called with a literal of 6 at
exactly one site in the image, `0x1684C`, with the index zero: the firmware never computes
`entry + 6 + 3 * pages`, which is where a pool begins.

So the twin is not reached from the page record, not by walking from the entry, and not through the
routine that runs every other tagged list. Three routes ruled out. What is left is that some
consumer holds the pool's address by another means, or that the second list is read by code that
does not use the tagged list runner at all, which the identical tag sequences make plausible: the
same tags with different operands is what a **second table over the same keys** looks like, and its
reader need not be the first one's.

The next attempt should start from the tags rather than the pointers. On arch 14 they are `0xa2`,
`0x89`, `0x88` and `0x82`, four values covering every entry in both lists, and a scan for the code
that loads those literals is the same one paragraph move that found the mode handlers in section 37.

### Where it lands

* `docs/config-format.md`, base slot 6's pages.
* `packages/codec/test/sections.test.ts`: the bijection over the corpus, the operand disagreement
  as the statement that the twins are not copies, and the wide form matching emptiness exactly.

## References

* concordance: https://github.com/jaymzh/concordance
* harmony-decompiler discussions: https://github.com/trelowney/harmony-decompiler/discussions
* firmware and legacy software archive: https://www.harmonyremoterepair.com/software-firmware.html
