# Logitech Harmony firmware and config format: arch 12 ("Gin") and arch 14

Reverse engineering notes covering two remotes and three firmware images.

Source material:

* **Harmony One**, concordance 1.5 dump. Firmware 3.4, hardware 0.5.0, skin 54,
  architecture 12, protocol 12, external flash Atmel AT49BV322A (4 MiB, `0x1F:0xC8`),
  USB 046D:C121, config flash used 1634 of 3840 KiB.
* **Harmony 600**, concordance 1.5 dump. Firmware 0.2, hardware 1.1.0, skin 71,
  architecture 14, protocol 14, external flash EON F16-100HIP (2 MiB, `0x15:0x1C`),
  USB 046D:C122, config flash used 721 of 1856 KiB.
* `harmony_one_firmware_3_4.hfw` and `harmony_700_firmware_2_8.hfw`, retrieved from
  harmonyremoterepair.com. The One image is exactly the version running on the
  dumped remote.
* A **second Harmony One** of the same model, firmware and skin, unprogrammed. The pair is
  worth more than two unrelated dumps.
* A **Harmony 525**, architecture 9, connected on 8 August 2026. Its config, its two external
  flash images and the first bytes of its internal program memory were read over USB by this
  project's own code. The third architecture with hardware here, and the first arch 9 firmware
  anywhere in this project. Section 76.
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
this project's own host code: GET_VERSION, READ_MISC and READ_FLASH. Section 76 does the same to a
Harmony 525 and takes its firmware off it, so arch 9 is no longer an architecture reasoned about
purely from one stranger's config. **Nothing has been written to a
remote, by any path.** Every other claim in this document is offline analysis, which means it is
independently checkable and should be checked. Verification method is shown alongside the conclusions
rather than just asserted, most importantly the calibration table in section 5 and the
numeric closure in section 13. The highest-risk item used to be that the SFR map assumed the
standard PIC18 high-end register layout rather than the PIC18F67J50 map specifically. That
risk was real: eight of 93 names were wrong, and the whole USB register block was at the
wrong addresses. Section 18 has the correction. The remaining one is that the arch 12 part
number is inferred, not read off a board. Errors are documented where they occurred rather
than quietly fixed, so the rest can be calibrated against them.

Thirty one have been found and corrected so far. The newest is in section 109 and it is a field name
this project took from concordance and never questioned: `GET_VERSION`'s flash id is not a
manufacturer and a device byte, it is a capacity code and a manufacturer. The firmware compares one of
the two against three literals to choose a flash size, and only a capacity code can do that. Measured
on the bench 600 the same afternoon the mechanism was read.

Before it, section 108: `packages/codec` resolved
the second dispatcher's four opcodes as exact values where the firmware compares against them as
floors, so it answered "no reading at all" for `0x20` where the remote runs `0x1F`'s handler. It never
showed up in a number because no config emits anything but the canonical four, which is the same shape
as the correction below it: a claim no sample could contradict.

Before it, section 107, and it is a claim two
documents made in the same words: that arch 12's `0x3F` bands are **the only** structure in the format
that is not one table across architectures. They are one of two. The opcode block `0x65` to `0x6E` is
arch 14 only, and the reason it went unnoticed is that no arch 8, 9 or 12 config emits an instruction
from it, so nothing in the corpus contradicted the claim; only the other architectures' dispatchers
do. A rule that says "port this by index" is worth checking against the firmware of the architecture
you are porting to, not only against its configs.

Before it, two in section 106, both mine, made in section 103 and caught by reading one call deeper
the same day: group 9 is four pairs of device levels and not four timeouts, because `0x249A0` sends
both halves straight out over I2C and nothing counts them down, and the flag that indexes the twelve
spare bytes is operand bits 1 to 3 normalised to a boolean rather than bit 0. The first is this document's own rule about naming a
structure by its consumer, failed by stopping one call short of the consumer.

Before them, sections 103 and 104, which have the same cause read from two sides. Section 84 called
base slot 15's twelve spare bytes
"a shape rather than a reading" because they are the size of six `u16` values with no count byte;
they are not that shape at all, they are the group before them continuing past its declared length,
and the reader arrives by arithmetic rather than by a pointer. Section 73 recorded `0x1F` band `0xFC`
as a no-op because the dispatcher's arm for it does nothing; the instruction never reaches the
dispatcher, because the fetch tests for it first. Both times the structure was found and the thing
that reaches it was not, which is the same mistake as this project's own rule about following
control flow rather than variables, one level higher up.

Before them, section 98's two, which were made and caught within the same session, which is the
useful thing about them. One read the USB
buffer descriptor's byte count as a software counter and drew an inference about the codebase from
three architectures sharing it, when the address is fixed by the part. The other concluded from a
scan that arch 14 had no learn report header, when the scan had reported it and the filter dropped
it: the store is through `INDF0`, whose address is `0xEF`, and this project's own pitfall list warns
that indirect access is invisible to a search keyed on addresses.

Before them, section 96's: the restart hazard was
written up as a threshold at a program address, and there is no threshold. The response sender has
no bound, so an unterminated read walks over its own counter and what decides the outcome is the
parity of a byte 2247 further on. The bisection that produced the threshold was real and its
fourteen measurements are all predicted by the correct reading, but every offset it happened to try
below the supposed boundary had an even byte in the deciding position.

Before it, section 81's: the version word
beside the architecture was recorded as per model rather than per config, and one Harmony One
carries two different words either side of the sync section 58 watched. It is a skin number, and
nothing on the remote reads the section it sits in.

Before it, section 78's, which is the same shape
as section 77's one section over: two fields of a font set header had been assigned meanings by the
values they happened to hold, and the sample that varied them was again the arch 9 safe mode
container. It moved the arch 12 safe mode container from 39.1% attributed to 99.6%.

Before it, section 77's, and it is the most
productive kind: `FRAME_PROLOGUE`, a nine byte constant this project matched at the head of every
`0xFEED` frame, was never a prologue. It was the first node of a list, and two of its bytes were
that node's own length. Recording it as a fixed string is what kept base slot 0 unread for months,
and the sample that exposed it did so by being the one container whose first node is named
something else.

Before it, section 76's, and it is one this
project set up deliberately: `docs/memory-map-525.md` published nine predictions before a Harmony
525 was connected, and the one that failed was not in the list at all. Two documents said bit 23 of
arch 9's flash address "reads as a flag rather than an address bit", from concordance's table<!--superseded-->
disagreeing with the config's own arithmetic. It is the reverse: bit 23 belongs to the read
command's address and not to the container's. The reasoning was sound and one sided, because only
the config was available to reason from, and the remote settled it in one command.

Before it, section 75's, and it is the kindest
kind: section 61 read an infrared header as a flat 21 bytes and every word of its argument holds,
because 21 bytes is what the header is when the count at `+0x0B` is one, which is every record it
looked at. The claim was not wrong so much as unaware of its own scope, and the byte that states
the scope was sitting unnamed in the layout it published.

Before it, section 74's, and it is the same
mistake twice in a row: section 71 settled whether `0x74` and `0x75` are one instruction or two by
reading the architecture that issues neither of them. The rule that would have caught it was
written down in section 73, one section earlier, after it had cost three misreadings there. Count
who uses an opcode before choosing which firmware to open.

Before it, a reading that was right about the
shape and wrong about the size: section 72 had the `0x3F` `0xD0` band consuming the next **three
instructions** off the queue, because the queue holds three byte instructions and the handler calls
the queue reader three times. The reader pops one **byte**. Four instructions of disassembly settle
it, and none of them were read before the claim was published. Section 73.

The sharpest is still this one: this document recorded
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
code on either architecture **here**, for two different reasons. It does on arch 8 and
arch 9, which is section 2's correction of 8 August 2026 and is not a detail: it is the
route to an image for a model this project has no hardware for.

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

### Corrected 8 August 2026: this is two architecture entries, not the tool

*The section above was read as a statement about concordance, and it is a statement about arch 12
and arch 14. On arch 8 and arch 9 the same command returns the complete firmware.* The generalised
form had reached four documents, and it had a practical cost: it made asking a contributor with an
880 for a dump look pointless, when it is the only route to an arch 8 image that exists.

Two properties separate those architectures from ours, both read out of the same table:

| arch | flash_base | firmware_base | config_base |
|---|---|---|---|
| 8 | `0x000000` | `0x010000` | `0x020000` |
| 9 | `0x800000` | `0x810000` | `0x820000` |
| 12 | `0x000000` | `0` | `0x040000` |
| 14 | `0x000000` | `0x000000` | `0x030000` |

First, `firmware_base` differs from `flash_base`, so the two dumps are not the same read and the
firmware dump is aimed at firmware. Second, `config_base - firmware_base` is `0x10000` on both,
which is exactly `FIRMWARE_MAX_SIZE`, so one read covers the whole firmware region with nothing
truncated and nothing foreign in it. That second closure is what makes the answer a fact rather
than a hope: the size cap that breaks arch 14 happens to be the region size on arch 8 and arch 9.

Two consequences. `concordance -b -f` is a reasonable thing to ask a stranger for, on a 720, 785,
880, 882 or 885, and the request can honestly say the file cannot contain their serial number,
which sits at flash `0x000110`, below `firmware_base`. And **arch 9's infrared, listed as wanting a
firmware nobody has, is reachable**:<!--superseded--> the 525 arriving in August 2026 can be dumped this way.

Asserted in `tests/test_concordance_notes.py`, which reads the constants out of a concordance
checkout and skips when there is none. Nothing here reads that source for structure or copies it;
these are constants describing hardware, which is the same footing as the rest of this section.

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
flash `0x2000`. That is what proves the split point. The split is also discoverable from the
data itself: the GSPM header's `end_addr` field marks where the config ends.

> **The file states it too, and this section did not notice**, section 87. Those are two
> `<PHASE>` elements typed `Configuration_Static` and `Firmware_Main`, and the reader here threw
> the phase structure away before recovering the boundary from the container. Both routes give
> 8902 and 60050, so the derivation was right and it was a derivation of something the file says
> out loud.

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

Only the One package was read when this table was written, so architecture **14, Molson** is
missing from it: the 700 package refuses that one too, in the same words. `reference/models.md`
carries the full list.

`SOFTWARETYPE`: **0 = application, 1 = test, 2 = minimal, 3 = bootloader, 4 = safe mode.**

This used to read "0 = normal, 2 = Test mode, 3 = Boot mode", and the 2 was a misreading: the<!--superseded-->
entry commented "Test mode" carries a 1. The two values a firmware package accepts are 0 and 4,
under one comment reading
"must be in application mode or Safe mode", and section 87 separates them by reading the same
accessor out of each remote's two images.

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

> **Both sentences describe the corpus and neither is the rule**, section 87. The header ends at
> the line carrying `</INFORMATION>`; the declared length is a check on that split rather than the
> definition of it, and so is the checksum. Either may be absent, CR LF is not required, and a file
> with no header at all is legal and is in the corpus. The reader computes both splits now and
> compares them, which is a stronger check than either alone: they agree on all ten configs.

`INTENDEDVERSION` carries `PROTOCOL`, `SKIN`, `FLASH` and `BOARD`. That is what a remote compares<!--superseded-->
against before accepting a config, which makes it part of the eventual write path rather than a
curiosity.

> **Six fields, not four**, section 87: `SOFTWARETYPE` and `ARCHITECTURE` are compared too, and a
> field that is absent or empty matches anything. The four field reading survived because every
> config declares the same `SOFTWARETYPE` and none declares an `ARCHITECTURE`.

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
final chunk of exactly one byte, with offset zero somehow exempt, and that is where it was left.

~~`packages/usb` caps an internal read at one chunk~~<!--superseded-->, which was a bound around the
hazard rather than the hazard itself. It refuses the measured condition instead since 9 August 2026,
`count % 62 == 1`, which is section 93. Still a workaround and not an explanation.

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

## 31. Four opcodes take an operand above `0xC000` and no other opcode enters that band

~~Titled "Four opcodes address a second operand space" until section 72, which is the wrong noun:
the operand is not an address into anything, it is the rest of the opcode.~~ **The measurement
below is unchanged and every number in it still holds.** What changed is the reading, and it is
recorded here rather than rewritten because the partition was found before the dispatcher was, and
that is the more instructive order.

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
which is the one `0x71` reads most. **Answered by section 86**: base slot 0 names every variable
the generator gave a name to, and the name says what it is for and how many values it takes.

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

### Why they are unused: a server chose the class

Logitech's own published user manuals say it outright, and they are a source class this project had
not used: documentation written for users and distributed freely, which is neither firmware nor
decompiled code and carries none of the latter's restrictions.

The Harmony 880 manual, version 1.2, describes what happens when a button on the original remote is
pressed at the learning sensor. The sensor learns the signal; the remote uploads it over the USB
cable and the computer's internet connection to the Harmony web site; **the web site** tries to find
a matching pattern; if none is found the signal is "stored as-is in its original format"; and if one
is found the web site "converts the signal into a format for convenient storage". The Harmony 520
manual carries the same five steps with the actor named more loosely as the software.

So **the encoding class is a decision taken on Logitech's server**, after the signal has left the
remote, and neither the remote nor the desktop client picks it. That explains the shape of the
corpus exactly: every config here was compiled by that service, so every record carries whichever
class the pattern match produced, and the classes the firmware can decode but no config uses are the
ones the service never emitted for these particular devices. It also predicts that a signal the
database could not match is stored in a **raw** form, which is a candidate for one of the three.

Two consequences that are not about this section. The pattern matching was **server side**, and the
classic service is the one that is discontinued, section 56, so anything that learns a code without
it has to make that choice locally. And the sensor is a separate part: the 880 manual places an
infrared sensor "at the end opposite to the USB connector" and its front panel description names a
dedicated infrared learning port, so receiving does not share the transmit path.

**Three manuals across three architectures, and the mechanism is only in the older two.** The 880
is arch 8 and the 520 arch 9, and both carry the five steps. The Harmony 525's own manual, from the
later era, documents the same feature as a per device Learn IR action with the same 5 to 10 cm
spacing and **no description of what happens to the signal**, deferring to instructions delivered
online. So the feature is not model specific, which is what the owner reports from having used it on
every remote here, and the era that documented its mechanism is the era whose service is gone.

**The records section 32 cannot frame are class 1 as well**, 617 of them across the corpus. So the
arch 8 "second population with headers near 303 and 310" that `docs/config-format.md` attributes to
another encoding class is nothing of the sort. Whatever it is, it is inside class 1, and it needs a
better class 1 reader.

### What the class 1 loader reads

Enough of it to say where section 32's header of fourteen skipped bytes comes from. From the
record's real start the loader reads a `u8`, then a `u24` duration which it clamps to 256000 and
divides by four when it exceeds a byte, setting the Timer 2 prescaler to match, then a second `u24`
the same way, and writes both into a RAM pair. Those are the two values the carrier timer is loaded
from.

~~This used to say the `u24` is "in units of 0.1 microseconds". It is nanoseconds, and the two~~<!--superseded-->
values are a carrier period and its fifty percent on time. The unit here was inherited from section
12's prediction rather than measured, and no value had been read out of the corpus when it was
written. Section 92.

### What is not established

**What arch 9's 5 means.** No arch 9 firmware exists here, so it is either a fifth class its
firmware implements or a different field entirely, and the corpus cannot tell the two apart.

**Classes 2, 3 and 4**, for the reason above.

**The rest of the class 1 record**, beyond the two carrier durations and section 32's mark and
space stream. Narrowed to one byte by section 92, which named the two durations: what is left is
the `u8` at `+0x00`, zero in every record of the corpus.

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

**Read as millivolts these are battery curves, and that is a conjecture rather than a finding.**<!--superseded-->

> **Section 105 turns it into a finding, without a meter.** The conversion is arithmetic:
> `mean * word(0x01F580) + ((mean * word(0x01F582)) >> 16)`, which is `4 + trim/65536` millivolts a
> converter count, about 4.284. The two words are per unit calibration in internal page `0xFF`, and
> the firmware compares the result against the literal 3400, in the same units as the curve.

What supports it: the same module reads the analogue converter, `ADCON0` and `ADRESL`/`ADRESH` at
`0x0F938`, and the ranges are the right ones for the cells those remotes take. The 600 runs on two
alkaline cells, and 2025 to 2525 mV is 1.01 to 1.26 V each. The One has a lithium pack in a
charging cradle, and 3000 to 4051 mV is exactly a single lithium cell from empty to full. The
sentinels are 3300 on arch 14, which is the regulator rail, and 9999 on the others, which is above
anything measurable. What is missing: nobody has put a meter on a board, and the scaling between
the converter's counts and those numbers was not followed through.

**Group 4 is `96, 98, 308, 310, 768, 770` in all twelve containers on arch 8, 12 and 14**, three
pairs two apart, which is the shape of three thresholds with hysteresis. Arch 9's equivalent group
is `600, 602, 766, 769`. What they threshold is not established.<!--superseded-->

> **Section 103 reads it**: the four sample sum of analogue channel 1, giving a band 0 to 3, and the
> band chooses the display light's level and the pair of device levels section 106 reads. What
> channel 1 physically measures is
> still not established, and that is a different question from what the group thresholds.

### The numbering is per architecture

Arch 9 carries five groups where the others carry nine or eleven, and its contents line up with a
subset of arch 12's in a different order: its group 0 is arch 12's group 2, its group 1 is arch
12's group 3, and so on. **A group index is not portable**, which is worth stating because every
other section indexed so far transfers between architectures by base slot.

### What is not established

**What groups 0, 1, 2, 3, 8, 9 and 10 hold.** Each has a consumer address and a length; none has a
name.<!--superseded-->

> **Groups 0, 1 and 9 are named in section 103**: the display light's fade delay, its four levels and
> four pairs of device levels, which section 103 called timeouts and section 106 corrected. Groups 2,
> 3, 8 and 10 are still only a consumer and a length.

**Whether the curves really are millivolts**, per the paragraph above. Section 105 supports the
reading with the charger input and a calibration word in flash, and the arithmetic between converter
counts and millivolts is still not read.

**The twelve spare bytes** in the arch 12 run.<!--superseded-->

> **Read in section 103**: group 9's fourth device level pair, then a table of two bit fields that band
> `0xC0` selectors 0 to 12 index. Two readers, twelve bytes, no remainder. What the thirteen
> properties are is what is left, and both One configs carry the same table so no comparison can
> name them.

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
+0x01  u8   the first glyph code
+0x02  u8   the glyph count
+0x03  u24  glyph[count]     NULL for a code this config never draws
```

**Corrected again in section 78**, and the correction is recorded here rather than only there,
because this is the layout other sections quote. The version this section published read `+0x01` as
"the glyph count on arch 12, and 1 on arch 8, 9 and 14" and `+0x02` as the reverse, and marked which<!--superseded-->
byte holds the count as measured rather than explained. It is the byte at `+0x02`, unless that byte
is zero and then the count is at `+0x01`; and `+0x01` is not a spare but the **first glyph code**,
which is 1 in every container the corpus had when this section was written. The count is not keyed
on the architecture: the One's own safe mode container carries the other shape.

The count is the same for every set in a container and differs between containers: 75 on the
Harmony 700, 71 on the 600, 73 and 72 on the two Ones, 74 to 76 on the arch 8 configs, 66 on the
525 and 46 in all three safe mode containers. So it is a character set size, chosen per config
rather than per typeface, and most of its codes are NULL because a config ships only the glyphs its
own text uses. **That too holds only of the corpus as it was**: the arch 9 safe mode container
declares 91, 90, 50 and 90 in one container, so it is chosen per set and every generated config
happens to choose once.

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

**Which header byte is the count** was the item here, and section 78 settled it.

**What the glyph codes mean.** They are a per config character set, so code 5 is a space in the
700's configs and nothing says it is a space in anyone else's. A writer that wants to add text has
to build a set and number it, not look a character up. Section 78 narrows this too: the arch 9 safe
mode container's codes **are** ASCII, so the encoding is a choice a generator makes rather than a
property of the format, and a config that starts its sets at 1 has renumbered.

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

**One explanation is ruled out, on 8 August 2026.** The obvious one was that the installed image
differs from the published package, since only the package had been read at that address. It does
not: the One's own dump of external flash at `0x020000` is byte identical to
`one-3.4-code-base0x20000.bin` over the package's whole 60050 bytes, and its byte at `0x020024` is
`0xDE` as well. The builder's field order was re-derived at the same time and it holds: the twelve
bytes are sent from `0xD26`, `0xD27`, `0xD21`, `0xD20`, `0xD2A` then `0xD2B` to `0xD2F`, `0xD24` and
`0xD22`, which puts fields 7, 8 and 10 on the accessors already proved by address and leaves field 9
on `0x24290` with nothing else writing its variable in between.

So what is left is a **hardware** question rather than a firmware one: what a `TBLRD` returns on this
part when `TBLPTR` is past the on-chip flash, which is where `0x020024` sits if the internal memory
is 128 KB. The One's own `0xFF` page holds `0x16` at `+0x0007`, which is program `0x010007` and is
what the pairing predicts, so a table read that folded the address into on-chip memory would have to
fold `0x020024` onto `0x010007` and there is no rule under which it does.

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

Section 86 settles that too, and the mismatch was the count being the wrong field: the suffix is the
record's **highest value** plus one, not its number of values, and against that field it agrees in
all 250 named variables. The record of 6 belongs to a variable of 3 values with two transitions
each.

**The eight byte values are not decoded.** The only invariant across all 509 in the corpus is that<!--superseded-->
the first byte is zero. The last byte is `0x7F` in 412 of them and five other values in the rest, so
it is not a terminator, and no reading is offered here rather than one that fits the majority and
quietly fails on the rest. In the receiver's record the third field runs 12, 10, 17, 15 and the
fourth 1508, 1608, 1509, 1533, which look like two index spaces and are left as that.

**Read by section 86**, and the paragraph above is why it took another twenty six sections: the last
byte is an action list **opcode**, so `0x7F` in most of them and five other opcodes elsewhere is
exactly what it should be, and the two index spaces are a value the variable moves from and a value
it moves to. Refusing a reading that fits the majority was right; what was missing was the field
that says which majority, and base slot 0's name for the variable supplied it.

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

### The header states its own length and points backwards

> ~~The header is 21 bytes~~. **Corrected by section 75.** It is `12 + 9 * count`, and `+0x0B`,
> unnamed below, is the count of nine byte pointer groups. Twenty one is the `count == 1` case,
> which is every record on arch 12 and arch 14 and most of arch 9, so everything this section
> argues holds; what it missed is 37 records a config on arch 8 that carry a second group, and
> with it the "zero in every record seen" at `+0x12`, which is the first group's third pointer.

```
+0x00  u8   zero, and nothing has been found that reads it
+0x01  u24  the carrier period in nanoseconds, section 92
+0x04  u24  the carrier on time, the period halved, section 92
+0x07  u8   the encoding class, and where the group array's pointer lands
+0x08  u24  the record's own start, the back pointer of section 42
+0x0B  u8   the number of pointer groups that follow, section 75
+0x0C  u24  data block, or NULL   }
+0x0F  u24  data block, or NULL   } one group
+0x12  u24  data block, or NULL   }
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

**Corrected by section 85: the width is one, not eleven.** The rest of this part stands, including
every byte quoted below and the picture it lands on, because both readings consume the same twelve
bytes; what section 85 changes is that the `03` in the second column is an **opcode** rather than an
operand, and the address belongs to it. Read on for how the wrong structure survived a closure and a
calibration, which is the instructive part.

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
says it starts, section 62, gives four addresses. At width eleven, **all 912 instances across all<!--superseded-->
114 mode records name one of those four**. At every other width from 3 to 15, zero do.

That closure is real and it is not evidence for eleven, which section 85 is about: the `u24` is
opcode 3's operand either way, and no width other than eleven puts opcode 22's own operands on top
of it. A closure that only one candidate can satisfy does not distinguish that candidate from the
one that reads the same bytes differently.

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

**It was, and the conjecture is right**, section 82: the descriptor is the symbol table, the run of
small values is one index per bit, and the 1814 bytes are the tables and their pulse blocks to the
byte. **The count is wrong and instructively so.** This read the `u24` at each block area's start,
which is a body start only 135 times in 199, so 64 of the reads landed inside an index stream and
"66 distinct values" is 5 tables plus 64 pieces of misaligned data. The 135 that did land in the
1814 bytes were the correct reads all along, which is why the wrong rule produced the right lead.

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
block area of section 65, which wants an arch 9 firmware. The lab has none, and the route is
known: `concordance -b -f` returns the whole firmware region on arch 9, and the 525 arriving in
August 2026 can be dumped that way.

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

~~**They are not copies of the page lists**, tested byte for byte: 62 of 330 match on the One, 135
of 254 on the 600, and a container whose modes are nearly empty matches 30 of 30, which is what an
empty list matching an empty list gives.~~ **Wrong, and wrong for a reason worth keeping.** They
are copies, every one of 2906 of them, and the byte comparison missed it because the copies differ
in exactly one field: opcode `0x7F`'s operand is an index into base slot 10, and the two copies
name different table entries that hold **identical action lists**. So the bytes differ and the
meaning does not, and a byte comparison cannot tell those apart. Section 69.

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
arch 8 and 24467 of class 5 on arch 9, ~~the latter still wanting a firmware nobody has~~.<!--superseded-->

> **Corrected on 8 August 2026.** "Nobody has" was read as a permanent condition and it is a
> statement about our lab. `concordance -b -f` returns the complete firmware region on both arch 8
> and arch 9, so an arch 8 image is one contributor away and arch 9's arrives with the 525. Worse
> for the original claim, arch 8's blocks are **framed by `0x7FFF`** and want no firmware at all:
> 9712 of its 10257 bytes are 36 such blocks, 23 of 316 bytes and 13 of 188, with the counts
> identical in all four arch 8 configs. The claim discouraged work that was already possible.

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

~~What differs is the payload. Over the pairs, **0 of 175 entries share an operand** on a Harmony
One and 0 of 115 on a 600, while 161 of 175 and 70 of 115 share an opcode. So the same tag maps to
two different things, of the same kind.~~ **The opcode figures are an artefact of the wrong
pairing.** Paired by rank, every entry shares its opcode, 5861 of 5861 pairs across the corpus, and
only opcode `0x7F`'s operand differs. Section 69.

~~The two lists are never adjacent, never at the same rank in their pools, 85 of 330 by address
order on a Harmony One, and never the same bytes: the pairing is by content and the layout does not
express it.~~ **Every clause of that is wrong, and the mistake was measuring rank in the wrong
order.** It compared the two runs by address, when the order that matters is **mode table order**:
the k-th copy in the pool belongs to the k-th page, in all seventeen containers with nothing left
over. The layout expresses the pairing exactly, which is how it is reached without a pointer.
Section 69.

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

**That is what section 69 did, and the tags were the wrong door.** They are key codes, so the
firmware never loads them as literals; what it loads are the pointers. Reading the runner's two
call sites properly is what closed it.

### Where it lands

* `docs/config-format.md`, base slot 6's pages.
* `packages/codec/test/sections.test.ts`: the bijection over the corpus, the operand disagreement
  as the statement that the twins are not copies, and the wide form matching emptiness exactly.

## 69. The second list is a copy of the first, and nothing reads it

Sections 67 and 68 left one question: what reaches the pool's non slot 9 lists, given that no
pointer names them and no firmware route computes their address. The answer is that nothing does,
and the reason it took three sections to get there is that two measurements said the opposite of
what they looked like they said.

### The runner has two call sites for a mode, and both are accounted for

Section 67 listed the tagged list runner's call sites and called two of them "a page's list and its
fallback to the mode record's". Reading them properly is what settles it. On the Harmony 700 image,
`0x168F4` is one routine with two consecutive blocks:

```
16916:  TBLPTR <- F25/F26/F27      the current page record
        CALL 0x18D98               seek
        0x6D9 = 0 ; CALL 0x10B48   advance by 0 bytes
        CALL 0x10A30               follow the u24 there
        0x3C5 <- F2F               the tag to look for
16938:  CALL 0x1B71E               run the list

16942:  TBLPTR <- F2A/F2B/F2C      the mode entry
        CALL 0x18D98               seek
        0x6D9 = 1 ; CALL 0x10B48   advance by 1 byte
        CALL 0x10A30               follow the u24 there
        0x3C5 <- F2F
16966:  CALL 0x1B71E
```

`0x10B48` adds `0x6D9` to `TBLPTR` as a plain byte count, which the routine itself shows. So the
first block reads the `u24` at **page record + 0**, which is the page's list of section 66, and the
second the `u24` at **entry + 1**, which is the back pointer to the mode record's own list that
section 52 read. That is the override arrangement `config-format.md` already describes, now with
the two field offsets read off the code rather than inferred.

Both pointers are computed at `0x167E0`: the entry comes from base slot 6's table by `3 * mode + 3`,
and the page record from `entry + 6 + 3 * page` at `0x16A06`, which is the page array of section 66.
Section 68 saw that `0x10C36` is called with a literal of 6 at exactly one site and read it as
evidence that nothing computes a pool start; it is that site, and what it computes is the **first
page pointer**.

The other three references are the mode record's list again with tag 6 at `0x168A0`, the same with
tag 7 at `0x167DE`, and base slot 9's at `0x1B718`, reached from `0x1B6FE`. The arch 12 image has
the same five references to its runner at `0x2E2F2`, in the same two block shape at `0x28430` to
`0x284AA`. **Neither architecture has a sixth.**

### Nothing names a copy, and the search was the most permissive one available

Every byte position in a container read as a little endian `u24` and matched against every copy's
address:

| container | copies | positions naming one | expected by chance |
|---|---|---|---|
| Harmony One | 330 | 13 | 32.9 |
| Harmony One, spare unprogrammed | 152 | 1 | 11.2 |
| Harmony 600 | 254 | 1 | 11.2 |
| Harmony 700, both | 426 | 4 | 24.9 |
| 525, arch 9 | 135 | 0 | 0.6 |
| 880 a to d | 141 to 204 | 0, 2, 0, 0 | 3.7 to 6.0 |
| the five safe mode containers | 30 to 35 | 0 | under 0.1 |

**27 across seventeen containers against 148.8 that chance predicts**, and every one of the 27 sits
inside a screen program, an action list, a picture or another tagged list, where a three byte window
crosses a field boundary. The count being *under* the chance figure is the point: a search this
permissive would find spurious hits even if the structure were pointed at properly, and it finds
fewer than noise.

### They are copies, in meaning rather than in bytes

Section 67 tested byte equality, got 62 of 330 on a Harmony One, and concluded they were not copies.
The right pairing is by **rank in mode table order**, not by address, and the right comparison
allows one field to differ:

| | |
|---|---|
| form, wide or narrow | agrees |
| entry count | agrees |
| tag, per entry | agrees |
| flags, per entry | agrees |
| opcode, per entry | agrees |
| operand, per entry | agrees, **except** opcode `0x7F` |
| opcode `0x7F`'s operand | differs, and both index base slot 10 |

Opcode `0x7F`'s operand is an action list index, section 34. The two indices are different and the
action lists they name decode to **identical instructions**: 5861 of 5861 pairs, seventeen
containers, four architectures. So the copies are the same list, and the byte comparison could
never have seen it.

**2906 of 2906 pages, and the k-th copy is the k-th page.** Which is a claim that needs calibrating,
because most pages carry the same one or two tags as their neighbours and agreement on tags alone
would be cheap. Pairing the same two runs off by one:

| container | correct pairing | shifted by one | shifted by two |
|---|---|---|---|
| Harmony One | 330 of 330 | 192 | 163 |
| Harmony 600 | 254 of 254 | 109 | 87 |
| Harmony 700 | 426 of 426 | 168 | 144 |

100% against 39 to 58%, on tags and opcodes alone. With the operands included the wrong pairings
collapse further.

The direction is visible in the indices. On a Harmony One the page's copy names indices 3442 to
4276 of a 4277 entry table, which is exactly the last 835 entries, one per binding, all distinct;
the pool's copy names 238 to 3148, and reuses them. On the other three architectures the two share
many indices instead. So the generator appends a fresh action list per page binding and leaves the
shared set behind, which is a generator artefact rather than a format feature.

### What it means for a writer

The copies are **dead data that still has to be reproduced**. An emitter that omits them produces a
config the remote would run correctly and that differs from what Logitech's generator emits, and
section 41's trailer checksum will not notice. Three consequences:

* An editor changing a page's bindings should change both copies, or the two disagree. Nothing will
  read the difference, but a later reader of the file will.
* A copy's position is implied by everything packed before it, the same rail section 55 records for
  pictures. Nothing points at it, so nothing can be moved by editing a pointer.
* `slot-6-page-list-copy` is what the byte accounting calls them now, replacing
  `tagged-list-pool`, which named the run rather than the contents.

### What is still not known

**Why the copy exists at all** is a question about Logitech's generator, not about the format, and
no config in the corpus can answer it. The honest statement is that the format permits it, the
firmware ignores it, and the corpus contains it without exception.

One smaller thing stays open and it blocks nothing. The tags are key codes in section 17's shape,
and which physical key each of the four arch 14 values names is part of the button map section 48
leaves open. Reading them would say which buttons a page binds, which is a label rather than a
structure.

### Where it lands

* `docs/config-format.md`, base slot 6's pages and base slot 9's pool.
* `packages/codec/src/sections.ts`: `pageListCopies` and `ACTION_LIST_INDEX_OPCODE`, and
  `src/coverage.ts` for the renamed claim.
* `packages/codec/test/sections.test.ts`: the semantic identity per entry, the off by one
  calibration with its scores, and the pointer scan against its chance baseline.

## 70. Opcode `0x7C` is a per device quantity, capped at 100 and spelled out above it

`0x7C` is the most used instruction in the corpus, 21882 of 97537, and it has been unread since
section 29 guessed it was "a quantity of at most 100". It is the companion of `0x7D`, the infrared
send, and the two differ in one bit.

### The handlers are the same routine twice

On the Harmony 700 image, `0x7D`'s handler is `0x130E0` and `0x7C`'s is `0x13102`, sixteen
instructions apart:

```
130e0:  MOVFF 0x09B,0x099          the operand's low byte
        MOVFF 0x09A,0x098          its high byte
        RCALL 0x12FD6              the worker
        ...                        priority 2

13102:  BSF   0x09C,6              set bit 6 of the high byte
        MOVFF 0x09D,0x099
        MOVFF 0x09C,0x098
        RCALL 0x12FD6              the same worker
        ...                        priority 1
```

The byte order matters and is settled by the executor: `0x09A` and `0x09C` are written from `0x1BC`,
the popped instruction's second operand byte, so they hold the **high** byte. That is what
`config-format.md`'s `0x09A/0x09B` notation meant and it was ambiguous.

The Harmony One image mirrors it exactly: `0x26F74` with priority 2, `0x26F96` with `BSF 0x6BD,6`
and priority 1, sharing the worker at `0x26F4E`. **Two architectures, the same pair of routines.**

### The worker is a queue, and bit 6 changes what enqueueing means

`0x12FD6` writes into a circular buffer of 30 bytes at RAM `0x65` to `0x83`, with a write cursor at
`0x085/0x086`, a read cursor at `0x083/0x084` and a count at `0x064`. Entries are two bytes,
`{ u8 tag; u8 value }`, and the tag is `kind << 4 | group`: `0x0` for a send, `0x4` for this
opcode, and `0x5` for ~~a third producer that is not an action list opcode~~ **opcode `0x67`,
which section 71 found in the dispatcher: it is one after all.**

With bit 6 clear the worker pushes the two bytes and returns. With it set it first walks the queue
to its last entry and then, at `0x13088`:

| condition | what happens |
|---|---|
| the last entry's tag differs | push a new entry |
| the last entry's value is already 100 | push a new entry |
| the new value is smaller | **drop it** |
| otherwise | overwrite the last entry's value |

So consecutive quantities for one device collapse to the larger, **except at 100**, where the fold
is refused and a second entry is pushed instead. That is the mechanism that makes a quantity above
100 expressible at all, and it is read off the code rather than inferred from the data.

The sender consults the queue for a `0x4` tag at `0x13830` and `0x13AC8`, through the scan at
`0x13204`, and changes its own timing parameter accordingly.

### The corpus closes it twice

**The group is always one the infrared table has.** Over 21882 uses in twelve containers spanning
four architectures, every high byte is below that config's infrared group count, with no exception.
That is the closure section 33 used for `0x7D`, applied to a table this operand was not derived
from, and the group counts vary from 1 to 7 across the corpus so it is not vacuous.

**The value never exceeds the cap.** 0 to 100 everywhere, never 101, in all 21882.

**And arch 14 spells the whole range out.** Its configs carry a generated table of lists made of
nothing but this opcode, `(g,100)` repeated then a remainder:

| container | groups | lists per group | totals |
|---|---|---|---|
| Harmony 700, both configs | 6 | 350 | 101 to 450, contiguous |
| Harmony 600 | 4 | 350 | 101 to 450, contiguous |

**Every total from 101 to 450, once per group, nothing missing and nothing twice**, and not one list
of the 4900 fails the cap-then-remainder shape. A reading where the run did not sum would have to
explain why the last instruction's value is exactly `total - 100 * (length - 1)` in every one of
them.

The table starts at 101 because 1 to 100 needs a single instruction and is not worth a list of its
own. Arch 8, 9 and 12 have no such table: there `0x7C` almost always follows a `0x7D` for the same
group, 340 of 345 on a Harmony One, carrying a small value.

### What is not established

**What the quantity measures.** The evidence says it is per device, bounded at 450 in practice,
consumed by the infrared sender, and folded by taking the larger of two consecutive requests. That
last rule is what a duration behaves like and not what a repeat count behaves like, but the unit is
a guess and this document does not make it. Finishing it wants the timer that drains the queue.

~~**The third producer**, tag `0x5`, which reaches the same worker from outside the action list
language.~~ **It is opcode `0x67`**, section 71, and it was called an outsider only because this
section read the queue before the dispatcher. What it means is still open.

### The rails it yields

* **The value is capped at 100 by the firmware**, not by convention. A writer emitting 150 in one
  instruction gets a queue entry the sender will treat as 150 only if nothing folds it, and the
  fold rule is written against the cap. Spell it out.
* **A config cannot have more than sixteen infrared groups**, because the queue tag is
  `kind << 4 | group`. The corpus tops out at seven, so nothing has met this, and a generator that
  did would corrupt the tag rather than fail.
* **Consecutive quantities for one device are not independent.** An editor inserting one next to
  an existing one changes the existing one's effect.

### Where it lands

* `docs/config-format.md`, the action list opcode inventory: `0x7C` moves out of the unread table.
* `packages/codec/src/ir.ts`: `irQuantity` with `IR_QUANTITY_OPCODE`, `IR_QUANTITY_CAP`,
  `IR_QUANTITY_QUEUE_BIT` and `IR_MAX_GROUPS`.
* `packages/codec/test/sections.test.ts`: the group closure against the infrared table, the 101 to
  450 closure, and the refusals that stop `irQuantity` summing a shape it has not read.

## 71. The `0x65` to `0x6D` block is an accumulator machine, and `0x6C` writes a device record

Section 70 read one opcode by chasing its handler. This reads the dispatcher instead and takes nine
at once, which is the cheaper move and should have come first: the binary search at `0x0EC8E` on the
Harmony 700 image names a handler for every opcode in `0x65` to `0x7F`, so each is a routine to read
rather than a thing to look for.

### The accumulator machine

Sections 34 and 39 placed `0x7A` as "load the accumulator", `0x79` as "add", and `0x78` and `0x77`
as two more operations through helpers. The block below `0x6E` is the rest of the same machine,
working on the sixteen bit pair at RAM `0x10E/0x10F`:

| opcode | handler | what it does |
|---|---|---|
| `0x6D` | `0x0F052` | accumulator **shifted left** by the operand's low byte, `RLCF` in a loop |
| `0x6C` | `0x0F072` | **writes a device record**, below |
| `0x6B` | `0x0F096` | accumulator **AND** operand |
| `0x6A` | `0x0F0BA` | accumulator **OR** operand |
| `0x69` | `0x0F0DE` | accumulator **XOR** operand |
| `0x68` | `0x0F104` | accumulator **shifted right** by the operand's low byte, `RRCF` in a loop |
| `0x67` | `0x0F12C` | operand to `0x09E/0x09F`, then `0x13128` |
| `0x66`, `0x65` | `0x0F146` | the operand's high byte, or both bytes, to `0x159F4` |

Both shifts read their count from `WREG` and skip the loop entirely when it is zero, so a shift of
zero is a defined no-op rather than a shift of 256.

**`0x67` closes an open item in section 70.** That section found a third producer feeding the
infrared queue with tag `0x5` and said it was not an action list opcode. It is: `0x67`, and the
routine it calls is `0x13128`, the third of the three siblings section 70 disassembled. Reading the
queue before the dispatcher is what made it look like an outsider.

**And `0x74` and `0x75` are the same instruction.** The dispatcher never compares against `0x75`:
at `0x0EE12` it tests `>= 0x74` and both fall into one handler, and nothing downstream reads the
opcode byte `0x1BD`, whose only readers are the two dispatcher comparisons themselves. So `0x75`'s
4380 uses run `0x74`'s code. What that code means is still open; that there is one meaning and not
two is not.

### `0x6C` never stands alone

Every use in the corpus is the second half of a pair:

```
0x7A key        load the accumulator
0x6C value      write it
```

**7552 of 7552**, in three arch 14 containers, and the list holding them is exactly those two
instructions and nothing else, 2832, 2832 and 1888 times. Arch 8, 9 and 12 do not use the opcode at
all.

The handler passes the operand to `0x11B92`, which splits **bit 15** off into its own argument,
clears it, looks the accumulator up to a record index with `0xFF` for not found, and writes the
remaining fifteen bits as two bytes into that record. So the operand is a field selector and a
value, not one number.

### The corpus says the key is a device

| container | infrared groups | distinct `0x7A` keys |
|---|---|---|
| Harmony 700, both configs | 6 | 6 |
| Harmony 600 | 4 | 4 |

And per key, exactly:

| field | values | count |
|---|---|---|
| bit 15 clear | 0 to 450, contiguous | 451 |
| bit 15 set | 0 to 20, contiguous | 21 |

**Every key, every container, with nothing missing and nothing twice.** 6 times 472 is 2832 and 4
times 472 is 1888, which is every use accounted for. A reading where bit 15 were part of the value
would have to explain why 0 to 450 and `0x8000` to `0x8014` are both complete and nothing lies
between.

**0 to 450 is the same enumeration `0x7C` carries**, section 70, reached from an unrelated
direction: there it is a per group quantity spelled in units of at most 100, here it is one
instruction per value. So the two opcodes write the same kind of thing by different routes, and the
`0x7C` route exists because a byte wide queue cannot carry 450.

The keys are 16 bit values that occur nowhere else in the container except as `0x7A` operands, so
they are identifiers the generator brought in rather than offsets into anything here. On the 700
three of the six share a high byte, `0x1E04`, `0x1E06` and `0x1E07`, which is what a run of device
ids from one manufacturer looks like. That is a suggestion and not a reading.

### The generated tables

The `0x7C` lists of section 70 sit in **contiguous blocks of 350 table entries**, one block per
group, though not in ascending order of total. The `[0x7A, 0x6C]` lists are scattered through the
table instead. Both are generated sets covering a range exhaustively, which is what a settings menu
needs: one action list per selectable value.

### What it moves

Of 97537 action list instructions in the corpus, the share using an opcode with a reading goes from
**64.6% to 72.3%**. What is left at the top is `0x1F` at 6119 uses, `0x07` at 5739, `0x75` and
`0x74` at 4380 and below, `0x73` at 3927 and `0x00` at 3053.

### Where it lands

* `docs/config-format.md`, the action list opcode table.
* `packages/codec/src/ir.ts`: `deviceAssignment`, `ACCUMULATOR_LOAD_OPCODE`,
  `DEVICE_ASSIGN_OPCODE` and `DEVICE_ASSIGN_FIELD_BIT`.
* `packages/codec/test/sections.test.ts`: that no `0x6C` stands alone, the key count against the
  infrared table, both fields enumerated exhaustively, and the pair's refusals.

## 72. Below `0x65` the operand is a second opcode field, and `0x00` does nothing

Section 31 measured that four opcodes, `0x07`, `0x0F`, `0x1F` and `0x3F`, never carry an operand
below `0xC000` where every other opcode does, and called that a **second operand space**: references
the firmware supplies rather than indices the generator assigns. The measurement is right and the
name is not. The operand is not a reference. It is **the rest of the opcode**.

### The dispatcher says so

The action list dispatcher branches to `0x0F160` for any opcode below `0x65`, and from there it
stops testing the opcode after five ranges and starts testing a byte of the operand:

| opcodes | dispatches on | the band it ignores |
|---|---|---|
| below `0x07` | nothing, it returns | everything |
| `0x07` to `0x0E` | the operand's **low** byte | not established |
| `0x0F` to `0x1E` | the operand's **low** byte | `0xF0` and above |
| `0x1F` to `0x3E` | the operand's **high** byte | not established |
| `0x3F` to `0x64` | the operand's **high** byte | below `0xB0` |

So `0xC000` is not a floor on a value, it is the bottom of the lowest band the firmware tests, and
section 31's four opcodes are four ranges rather than four instructions.

### The corpus fits it exactly

| range | uses | opcodes that occur | landing in an ignored band |
|---|---|---|---|
| below `0x07` | 3053 | `0x00` | n/a |
| `0x07` to `0x0E` | 5739 | `0x07` | none stated |
| `0x0F` to `0x1E` | 111 | `0x0F` | **0** |
| `0x1F` to `0x3E` | 6119 | `0x1F` | none stated |
| `0x3F` to `0x64` | 644 | `0x3F` | **0** |

**Exactly five opcodes occur below `0x65` in the whole corpus**, one per range, and each is the top
of its range: `0x07`, `0x0F`, `0x1F` and `0x3F` are `2^n - 1`. So the generator emits the range's
boundary value and never anything else in it, over 15666 instructions. What the low bits of the
opcode would mean is not established, because nothing exercises them.

### `0x00` is a no-op

The dispatcher's first test is `opcode >= 0x07`, and below that it returns without reading the
operand at all. **3053 instructions in the corpus are opcode `0x00`, and every one carries operand
zero**, so they are three zero bytes each. A reader should not invent a meaning for them and an
emitter has to keep them, since a list's length is declared in entries.

### What the sub opcodes do, as far as they are read

For opcodes `0x1F` to `0x3E`, on the operand's high byte, `0xFB` alone is 2371 uses:

| high byte | what |
|---|---|
| `0xFB` | the byte register at RAM `0x10D` **= operand low** |
| `0xFA` | `0x10D` **+=** operand low |
| `0xF9` | `0x10D` **\*=** operand low |
| `0xF8` | `0x10D` = a helper of the two, `0x097DC` |
| `0xFF`, `0xFE`, `0xFD` | operand low into `0x1B1`, `0x123`, `0x125`, each with its own call |
| `0xFC` | nothing |
| `0xF7` | builds an instruction from the accumulator and pushes it back, as `0x7B` does |

That names `0x10D`, which section 34 mentioned only as the byte `0x7B` injects: it is a byte wide
register with its own load, add and multiply.

For opcodes `0x07` to `0x0E`, on the operand's low byte:

| low byte | what |
|---|---|
| `0xFF` | sets the flag at `0x122` |
| `0xFE` | runs the current binding set's list with **tag 5**, through `0x1B6DE` |
| `0xFD` | **pushes** a sixteen bit value on a stack at RAM `0x111`, pointer `0x110` |
| `0xFC` | **pops** it, comparing against `0xFEFE` |

So `0x07` is a control flow family with a real stack, which fits section 26's reading of `0x7F` as
the call.

For opcodes `0x3F` to `0x64`, on the operand's high byte, the `0xD0` band is the interesting one:
it **consumes the next three instructions off the queue** and hands twelve bytes to `0x13156` in
the infrared sender. That is the first multi word instruction found in this language, and it means
a reader that walks an action list one instruction at a time is right about the bytes and wrong
about the boundaries wherever that band appears.

### What is not read

The branches below `0xF3` for `0x1F`, below `0xFC` for `0x07`, and below `0xE0` for `0x0F`. Between
them they hold about 6000 of the 15666, so this is a third of the second space rather than all of
it.

### Where it lands

* `docs/config-format.md`, replacing the "second operand space" subsection's framing.
* `packages/codec/src/ir.ts`: `subOpcode`, `SECOND_SPACE_LIMIT`, `ACTION_NOOP_LIMIT` and
  `SECOND_SPACE_RANGES`.
* `packages/codec/test/sections.test.ts`: the five opcodes, the two ignored bands with zero
  instructions in them, and every no-op carrying operand zero.

## 73. Both dispatchers read to the end, and what a third of the language turns out to be

Sections 70, 71 and 72 each took a slice of the action list language and stopped: one opcode, then
nine, then the shape of the space below `0x65`. The habit was mine rather than the material's, and
the instruction was to stop batching. So this section reads **every remaining branch of both
dispatchers** to its `RETURN`, and what it costs is one afternoon rather than the six that reading
them a handful at a time would have taken.

The material rewards it, because the branches are not independent. The `0x80` family and two of
`0x1F`'s bands turn out to end in the same routine, which is only visible if you read both.

### `0x80 | n` writes state variable `n`

The dispatcher at `0x0EC8E` strips bit 7 and hands the instruction to one routine, which
sections 34 and 35 recorded without saying what the routine does. It is `0x17CC4`, and the handover
is explicit:

```
0eca2: BCF   0xbd,B,7        the opcode, bit 7 cleared
0eca4: MOVFF 0x1bb,0x1f4     the operand, low
0eca8: MOVFF 0x1bc,0x1f5     the operand, high
0ecac: MOVFF 0x1bd,0x1f3     the index
0ecb0: MOVFF 0x122,0x1f2     a flag: zero asks for a notification afterwards
0ecb4: CALL  0x17cc4
```

`0x17CC4` indexes the base slot 13 state variable table through `0x17E28`, then calls `0x17DD8`,
which decides the width from the table's own `narrow` count: below it, one byte at RAM
`0x900 + index`; at or above it, `index -= narrow; index *= 2; index += narrow` and two bytes. So
**`0x80 | n` means "state variable `n` = the operand"**, and the 55 opcodes at the top of the
inventory are one instruction with a five bit field, exactly as the shape of the dispatcher
suggested and nobody had confirmed.

Two closures, over 12 containers and 3011 uses:

* **0 name a variable the table does not have.**
* **0 of the 2947 narrow writes carry a high byte**, which the firmware would silently drop. A
  generator that did not know the width would have left some.

The second is the stronger one, because the first only says the indices are small.

### `0x73` runs a screen program

`0x18814` loads slot `0x0B` into `0x6DD`, seeks with `0x10B92`, puts the operand in the sixteen bit
index at `0x6E1` with element size 2 at `0x6E0`, indexes with `0x10BEE`, follows the pointer with
`0x10A30` and calls the screen interpreter at `0x1879C`. So **`0x73` runs the base slot 11 screen
program its operand indexes**, the same table `0x7F` does for action lists.

**No arch 14 config issues it**, so that reading was about to be published against a handler nothing
in the corpus reaches. Checked on the architecture that does use it: the One's dispatcher at
`0x25128` copies the operand into `0x2F1/0x2F2` and calls `0x296F4`, which asks for arch slot `0x0C`
(base slot 11), indexes with element size 2 and jumps to `0x295AC`, the arch 12 screen interpreter.
Same structure, different addresses.

3927 uses across 8 containers, all of them arch 8, 9 or 12, **0 outside the table**.

### `0x1F` is a register machine

Every band, on the operand's high byte, with the low byte as the argument. The byte register is
`0x10D` and the sixteen bit accumulator is `0x10E/0x10F`:

| band | what |
|---|---|
| `0xFF` | select the current binding table entry, base slot 9. Section 39 |
| `0xFE`, `0xFD` | add to, remove from a set the interpreter keeps at `0x118`, counted at `0x117` |
| `0xFC` | nothing |
| `0xFB`, `0xFA`, `0xF9`, `0xF8` | byte register: load, add, multiply, divide |
| `0xF7` | execute the accumulator as an instruction, the low byte its opcode |
| `0xF6`, `0xF5`, `0xF4`, `0xF3` | send the byte register or the accumulator to base slot 16 or 14. Section 39 |
| `0xF2`, `0xF1` | increment, decrement the state variable the low byte names |
| `0xF0`, `0xEF` | byte register, accumulator = that state variable |
| `0xEE`, `0xED` | that state variable = byte register, accumulator |
| `0xEC`, `0xE8`, `0xE6` | store the low byte in a RAM variable, three different ones |
| `0xEB`, `0xEA` | start, cancel the base slot 12 timer the low byte indexes. Section 43 |
| `0xE9` | split the low byte into three fields, bit 0 and bits 1 to 3 and bits 4 to 7 |
| `0xE7` | load the accumulator from one of three system registers |
| `0xE5` down to `0xE0` | nothing |

**The pairs are the tell.** `0xF6` against `0xF4`, `0xF5` against `0xF3`, `0xF0` against `0xEF`,
`0xEE` against `0xED`: the same operation twice, once for the byte register and once for the
accumulator. A band table read one entry at a time would not show that, and it is what makes the
`0x10D` reading safe.

`0xEE` and `0xED` share a tail at `0x0F3E2` that sets `0x1F3` and `0x1F2` and calls `0x17CC4`,
**the same routine the `0x80` family uses**. So the language has two ways to write a state
variable, one with the index in the opcode and one with it in the operand, and they are the same
store. That is the join two separate readings would have missed.

The closure is the index again: over 17 containers and 2937 uses of the `0xE7` to `0xF2` band,
**0 name a variable the table does not have**, and in thirteen of the seventeen the highest index
used is exactly `count - 1`.

### `0x07` is a control flow and housekeeping family

Thirteen operations with no argument, on the operand's low byte. Sections 26 and 72 had the top
four:

| band | what |
|---|---|
| `0xFF` | set the pending flag at `0x122` |
| `0xFE` | run the current binding set's list with tag 5. Section 39 |
| `0xFD`, `0xFC` | push, pop a register pair on a stack at `0x111` with pointer `0x110` |
| `0xFB` | **cancel all four running timers**, `0x1776E` |
| `0xFA`, `0xF6`, `0xF4`, `0xF3`, `0xF2` | five helpers with no argument |
| `0xF9` | read the clock, base slot 3, `0x14F84` |
| `0xF8` | read three fixed state variables, 3, 5 and 6, `0x14FE0` |
| `0xF7` | re-run the current mode page's tagged list, `0x16776`. Section 69 |
| `0xF5` | pop the stack and mark the slot empty |

`0xFB` is worth its own line: `0x1776E` walks the same four slot table of five byte entries at
`0x6E5` that `0x1F`'s `0xEB` and `0xEA` bands do, which is the four concurrent timers section 43
measured from the other end. Three instructions, one table, and the count agrees.

### `0x0F` is peripherals and a diagnostic channel

On the low byte, and mostly not about the config at all:

| band | what |
|---|---|
| `0xF0` | nothing |
| `0xE0` | emit one to three bytes on a diagnostic channel<!--superseded--> through `0x159F4`. Nibble 6 emits `0xAA` twice, nibble 4 emits the constants 3, 2, 1. **Section 108 read `0x159F4`**: the channel is a page program into a region of the external serial flash |
| `0xC0`, `0xB0`, `0xA0` | peripheral operations with two fields, one field, and a boolean |
| `0x80` | move between the byte register and the accumulator, both directions |
| `0x70`, `0x60`, `0x50` | nothing |
| `0x40` | a lookup whose sixteen bit result goes to scratch |

The `0xE0` band emitting a fixed `0xAA 0xAA` and a fixed `3 2 1` is what makes it read as
diagnostic rather than functional. **The corpus uses band `0x60` six times**, and that band does
nothing at all.

### `0x3F`, and the one place the architectures diverge

Four bands on the high byte: `0xF0` loads one of three byte registers through an `XORLW` chain
whose cases are 0, 1, 2, 6 and 7, so **nibbles 3 and 5 fall into the default and do nothing**, 84
uses of them in the corpus. `0xE0` is four operations on a pair of RAM words. `0xD0` is below.

The lowest band is `0xB0` on arch 14 and **`0xC0` on arch 12**, and the routines behind them are
not the same code. Arch 14's `0x0F782` seeks base slot 8 and bounds the operand against its leading
byte; arch 12's `0x24F24`, reached from the dispatcher at `0x25330`, splits the operand into bit 0,
bits 1 to 3 and bits 4 to 8 and drives a peripheral, `LATC` bit 5 among them.

**This was found by a closure failing.** Reading arch 12's `0x3F 0xC0` through arch 14's handler
predicts an index into base slot 8, and the corpus refutes it flatly: indices reach 194 where that
slot's leading byte is 1, 412 of 424 uses out of range. The prediction was wrong because the
handler was the wrong one, not because the reading was subtle. So **the second operand space is not
one table across architectures**, unlike the main opcode table and unlike the pointer table, and a
writer cannot port a `0x3F` band from one to the other.

That is **three times in one section**: `0x3F` band `0xC0`, `0x73`, and `0x3F` band `0xB0` itself,
all read on arch 14 and all used only elsewhere. `CLAUDE.md` already says the rule about preferring
arch 14 is about reading code rather than finding data, and the practical form of it is narrower
and worth stating: **before reading a handler, count who uses the opcode.** One query, and it says
which firmware to open. Every one of the three would have been caught by it.

### Correcting section 72 on the `0xD0` band

Section 72 says the `0xD0` band "consumes the next three instructions off the queue" and hands over
twelve bytes. **It consumes three bytes and hands over four.** `0x0E82C` is not an instruction
fetch: it pops **one byte** off the 120 byte circular queue at `0x127` to `0x19E`, decrements the
count at `0x126` and wraps. Three calls, three bytes.

The error was reading "three calls to the queue reader" as "three instructions" because the queue
is described everywhere as holding three byte instructions. The right check was to read the
callee, which takes four instructions to do and settles it.

What survives is the part that matters: `0x3F` with a high byte in `0xD0` to `0xDF` is a **six byte
instruction**, and a reader that walks an action list three bytes at a time is right about the
bytes and wrong about the boundaries wherever it appears. It is also **retried rather than failed**
when its destination queue has fewer than four slots free: `0x13156` returns zero, and the
dispatcher rewinds the queue pointer by three and adds three back to the count, so the same
instruction runs again next time round.

In the corpus its three byte payload is always a well formed instruction, `0x7F` in 40 of 60 uses
and `0x7E` in 19. That is consistent rather than confirming, since a decoder stays aligned either
way, but it does say the payload is an action list reference rather than raw data.

### The disassembler was calling bank 15 variables SFRs

`sfr_name` labelled anything at `0xF00` and above `sfrXXX`. On this family the SFR page starts at
**`0xF40`**, with `PMSTAT` the lowest named register in Microchip's own header, and the 4 KiB of
general purpose registers run up to `0xF3F`. A `MOVFF` carries a twelve bit absolute address, so
the interpreter's own stack at `0xF28` and its scratch at `0xF18` to `0xF30` were being printed as
unnamed peripherals. Fixed: below `SFR_PAGE_START` the name is `gprXXX`.

Same family as the generic SFR map of section 18, and caught the same way, against the header
rather than by reasoning about the listing.

### Where the language stands, honestly

The first version of `packages/codec/src/actions.ts` counted every branch above as read and
reported **100%**. That is the wrong number and the way it is wrong is worth recording: knowing
which routine runs and which RAM byte it writes is not the same as knowing what the instruction
means for a config. So a reading now carries a **depth**, `meaning` or `placement`, and the
progress number is reported both ways:

| | share of 97537 instructions |
|---|---|
| meaning | 90.3% |
| placement only | 9.7% |
| no reading at all | 6 instructions, one opcode, `0x6E` |

Against 24.5% with no reading when step 6 was last measured. Per architecture the meaning figure is
98.5% on the Harmony 700, 98.3% on the 600, 90.4% on the 525, 85 to 89% on arch 8 and **75 to 80%
on the Harmony One**, which is the gap worth closing next: it is the arch 12 `0x3F` peripheral band
and the `0x0F` bands, neither of which arch 14 exercises.

What is placement only, ranked, is now a measurement rather than a memory:

| uses | what |
|---|---|
| 4380 | `0x74`/`0x75`, whose meaning section 71 already failed to close |
| 1830 | `0x07` band `0xF8`, three fixed state variables |
| 1214 | `0x07` band `0xFF`, the pending flag |
| 436 | `0x07` band `0xF5` |
| 424 | `0x3F` band `0xC0`, arch 12 peripherals |

The top three are 78% of what is left, and none of them is a config structure: they are interpreter
and hardware state. So the remaining work on this language is worth less to a codec than its size
suggests, which is itself a finding.

### What would falsify it

A config using `0x80 | n` with `n` at or above its state variable count, or a narrow write carrying
a high byte. A `0x73` operand outside base slot 11. An arch 14 config using `0x3F` band `0xC0`,
which would put the two architectures back on one table and make the divergence a misreading.

### Where it lands

* `docs/config-format.md`: the second operand space subsection, and the opcode inventory.
* `packages/codec/src/actions.ts`: the whole table, `reading` and `readingCoverage`.
* `packages/codec/test/actions.test.ts`: the two closures, the band boundaries, the depth
  distinction, and that the corpus leaves exactly one opcode unread.
* `src/harmony/pic18/isa.py`: `SFR_PAGE_START`, with `tests/test_isa.py` pinning it.


## 74. The Harmony One's remaining opcodes, and what the remote does with them

Section 73 measured an arch 12 gap and named it: 75 to 80% of the One's instructions had a meaning
against 98.5% of the 700's, because the arch 12 `0x3F` peripheral band and the `0x0F` bands are
never exercised by arch 14. It also stated the rule that had just cost it three misreadings:
**count who uses an opcode before choosing which firmware to open.** This section is that rule
applied to the rest, and it pays immediately, because the two biggest items turn out to be things
the remote does rather than things the config describes.

Ranked before starting, on arch 12 configs only:

| uses | what |
|---|---|
| 3391 | `0x75` |
| 1117 | the `0x07` family |
| 318 | `0x3F` band `0xC0` |
| 78 | `0x3F` band `0xF0` |

### `0x75` is the beeper

**Arch 14 issues it zero times.** All 4380 uses are arch 12, 8 and 9, so section 71 read the
handler on the one architecture that has no use for it. On the One the dispatcher tests `0x75` at
`0x25100` and calls `0x2411E`, which is a square wave generator:

```
0xD21/0xD22 = operand low, shifted left twice        the half period, times four
if 0xE12 == 0: return                                a gate, below
loop while counter < operand high:
    BTG LATG,0                                       toggle the pin
    0xEE4/0xEE5 = 0xD21/0xD22 ; CALL 0x2CCC4         delay
    BTG LATG,0
    0xEE4/0xEE5 = 0xD21/0xD22 ; CALL 0x2CCC4
```

`0x2CCC4` shifts its argument **right** twice and busy loops that many times, so the caller's
multiply by four and the callee's divide by four cancel: the delay is the operand's low byte in
iterations, seventeen instruction cycles each.

**The numeric closure is the pitch.** Section 32 derived the core clock independently, from the
infrared carrier: 4 MIPS, so an instruction cycle is 0.25 us. The corpus uses exactly four
operands, and every one of them lands in the audible band:

| operand | cycles | half period | frequency | duration | uses |
|---|---|---|---|---|---|
| `0x01FF` | 1 | 1084 us | 461 Hz | 2.2 ms | 80 |
| `0x0FCA` | 15 | 859 us | 582 Hz | 26 ms | 4238 |
| `0x4664` | 70 | 425 us | 1176 Hz | 60 ms | 56 |
| `0x8C19` | 140 | 106 us | 4706 Hz | 30 ms | 6 |

Those figures count the delay loop alone. Counting the toggle, the call and the loop test around it
moves the lowest tone by under 1% and the highest by about 8%, to 457 and 4324 Hz. Either way it is
a click and three beeps, 2 to 60 ms, and `0x0FCA` at 4238 uses is the one on nearly every button.

**Second closure: nothing else drives the pin.** `LATG` bit 0 is touched in exactly two places in
the One's 3 MB image, and both are the two `BTG` instructions above. The 700 sets and clears the
same pin in six places, none of them a tone loop, which is consistent with arch 14 never issuing
the instruction and using the pin for something else.

The pin is identified from behaviour rather than from a schematic, so "the beeper" is an inference
from a square wave at speech frequencies in short bursts. What is not an inference is the
arithmetic.

### `0x3F` with high byte `0xF3` is the sound gate

The generator returns without doing anything when `0xE12` is zero. `0xE12` is written by exactly
one instruction, `0x3F` with high byte `0xF3`, in the band handler at `0x24EE2`. So a config can
mute its own beeper, and the first named state variable in the One's slot 0 tree is
`ButtonSoundVolume_2`, which is at least the right subject.

**That band gave a prediction, and it held.** Its `XORLW` chain has cases 0 to 5 on arch 12 and
cases 0, 1, 2, 6 and 7 on arch 14, so the two architectures should never use each other's nibbles:

| arch | nibbles used |
|---|---|
| 8 | 0, 1, 2 |
| 9 | 0, 1 |
| 12 | 0, 1, 2, **3, 5** |
| 14 | 0, 1, 2, **6** |

106 uses on arch 12 of nibbles arch 14 has no case for, 3 on arch 14 of one arch 12 has no case
for, and **no config crosses**. Section 73 argued the `0x3F` bands diverge between architectures
from a band boundary and a failed prediction; this is the same claim with a prediction that
succeeded.

### Correcting section 71: `0x74` and `0x75` are two instructions

Section 71 concluded that `0x74` and `0x75` are "one instruction, not two",<!--superseded--> because the arch 14
dispatcher never tests `0x75`. That is true of arch 14 and it is the wrong architecture to ask:
**arch 14 issues neither.** The One's dispatcher tests both, four instructions apart, and sends
them to different routines: `0x75` to the tone generator and `0x74` to `0x2CFA8`, which shifts a
24 bit value left four bits, ORs in the operand's low byte and increments a digit count.

So the digit accumulator section 71 described is real, and it is `0x74`. Nothing in the corpus
issues `0x74`, on any architecture. The reading that failed to close there failed because it was
being asked of the wrong opcode.

### `0x07` band `0xF8` steps the date

886 uses on arch 12 and 944 on arch 8; arch 14 issues it never. `0x27F78` reads three bytes and
calls `0x28072`, which is a calendar:

```
switch (month):
  case 3, 5, 8, 10: last = 29         the four thirty day months, zero based
  case 1:           last = 28         February
  default:          last = 30
if day != last:  ...
else:            month = (month + 1) mod 12
write both back
```

**Two closures, and neither is subtle.** The case set `{3, 5, 8, 10}` is exactly April, June,
September and November counted from zero, with February alone and 31 as the default. And the month
is reduced **modulo 12**.

The three bytes are at the state variable base plus 3, plus 5 and plus 6. That base is `0x900` on
arch 14 and `0x108` on arch 12, derived from each firmware's own write routine, and **the offsets
are the same three in both**. So state variable 3 is the day of month, 5 is the month and 6 is the
year, and they are firmware defined rather than assigned by the generator.

The corpus agrees from a third direction: the value counts of the first twelve base slot 13 records
are identical across all four architectures, `0 ? 1 1 0 1 0 0 0 0 0 0`, with only index 1 differing
between arch 12 and arch 14. The low indices are reserved.

**Not confirmed by the names.** Slot 0's tree names variables under `Root/State`, and the names at
positions 3, 5 and 6 are ordinary device states, so the tree is not in index order. Its trailing
numbers are domain sizes, `TV_Input_14` against `TV_Power_2`, not indices. Mapping a name to an
index needs the tree parsed properly and is open.

### `0x07` band `0xFF` makes the next state variable write silent

It sets one byte, `0x122` on arch 14 and `0xE24` on arch 12. That byte is what the dispatcher hands
to the state variable write as its fourth argument, and the write routine skips its notification
path when it is nonzero. The dispatcher **clears it immediately afterwards**, so it applies to one
write and no more.

1214 uses. For an emitter it is a rail: dropping a `0x07 0xFF` does not change what a config
computes, it changes whether the screen redraws.

### Arch 12 confirmations, since the readings were made elsewhere

* `0x80 | n`, the state variable write, at `0x24F94` and `0x2A598`. Same handover as arch 14, bit 7
  cleared, operand and index and the silent flag. Narrow variables at `0x108 + index`.
* `0x07` band `0xFB`, cancel all timers: `0x2A05E` clears bit 0 of four five byte slots at `0xEE8`,
  the same four the timer instructions of section 43 use.
* `0x07` band `0xF9`, read the clock: `0x27F20` seeks slot 3.

### Where the language stands

| | share of 97537 instructions |
|---|---|
| meaning | 97.9% |
| placement only | 2.1% |
| no reading at all | 6 instructions, one opcode, `0x6E` |

Against 90.3% at the end of section 73 and 24.5% unread before it. Per architecture: 98.5% on arch
14, **97.0% on arch 12**, 97.6% on arch 8, 97.1% on arch 9. The gap section 73 measured is closed.

What is left is small and mostly one thing, `0x3F` band `0xC0` on arch 12 at 424 uses, a peripheral
selected by operand bits 4 to 8 that drives `LATC` bit 5 among others. It is hardware state rather
than config structure, which is what the rest of the remainder is too.

> **This table is where the section stood, and two things about it are worth a reader's caution.**
> Section 103 moved arch 12 by reading the band above, so the live figures are the marked ones in
> `CLAUDE.md` and `docs/roadmap.md` and `make reading` prints them. And the population these
> percentages were taken over was never written down: on 10 August 2026 no sample list reproduced
> 97537, so the shares here are sound relative to each other and the denominator is not recoverable.
> That is the reason `packages/codec/bin/reading.ts` exists.

### What would falsify it

An arch 14 config issuing `0x75`, or an arch 12 config using nibble 6 or 7 of the `0x3F` `0xF0`
band. A `0x75` operand whose low byte implies a frequency outside the audible band. A config whose
state variable 5 is written with a value at or above 12 by an instruction other than the date step.

### Where it lands

* `docs/config-format.md`: the opcode inventory, and the state variable section.
* `packages/codec/src/actions.ts`: `0x74`, `0x75`, `0x07`'s `0xF8` and `0xFF`, `0x3F`'s `0xF0`.
* `packages/codec/test/actions.test.ts`: the four tone operands, the disjoint nibble sets, and the
  coverage figures.


## 75. An infrared record header is a counted list of pointer groups, and arch 8 closes

Arch 8 sat at 97.7% of its bytes attributed while both target architectures were at 100.0%, and
the reason recorded for leaving it there was that its remainder wanted a firmware nobody has. Two
things were wrong with that. The remainder is **self framed**, so it wants no firmware, and arch 8
being a control rather than a target is a statement about which remote the product supports, not
about whether a reader is right. The corpus already holds four arch 8 configs and reading them
costs no hardware.

### The measurement that started it

`make coverage --detail` prints the twenty largest gaps and there are 128, so the first step was
to ask for all of them. The remainder decomposes, and three of the families have the **same count
in all four configs**:

| bytes | gaps | between |
|---|---|---|
| 7268 | 23 of 316 | an infrared block and the next header |
| 2444 | 13 of 188 | the same |
| 333 | 37 of 9 | a header and its own block |
| 152 | 1 | as the first two |
| 60 | 54 small | section boundaries |

23 and 13 make 36, and with the 152 that is **37 blocks**. 37 nine byte gaps. And the header byte
at `+11`, which section 61 recorded without a meaning, is **2 in exactly 37 records**. Three
independent 37s is not a coincidence, and none of them moves when the config grows from 234 records
to 462.

### The header is `12 + 9 * count`

Section 61 read the header as a flat 21 bytes: a class byte at `+7`, the record's own start at
`+8`, two block pointers at `+12` and `+15`, and a NULL at `+18`. That is the `count == 1` case,
and it is every record on arch 12, arch 14 and arch 9's own 139, which is why it held.

```
+0x00  ...  eleven bytes: the carrier at +1 and +4 by section 92, class at +7,
            and the record's own start at +8
+0x0B  u8   count, how many pointer groups follow
+0x0C  group[count], each { u24 block; u24 block; u24 block }
```

So a two group header is 30 bytes, not 21, and it names up to six blocks rather than two. The
"NULL at `+18`" was the first group's third pointer, which happens to be NULL in every arch 9
record and in most others.

**Everything the accounting could not attribute follows from that one byte.** The 37 nine byte
gaps are the second group. The 37 unclaimed blocks are what its pointers name. And the reason they
looked like tails of a truncated block is that they sit immediately after the first group's blocks,
which is how the generator packs them.

### It closes arch 8

| sample | before | after |
|---|---|---|
| arch8_config_a | 97.7% | **100.0%** |
| arch8_config_b | 98.1% | **100.0%** |
| arch8_config_c | 98.1% | **100.0%** |
| arch8_config_d | 98.1% | **100.0%** |
| h525_config, arch 9 | 66.4% | 67.1% |

Arch 12 and arch 14 do not move, which is the check that matters: their count is 1 everywhere, so
the new reader computes exactly what the old one did. **Zero overlaps in all seventeen containers**,
before and after. Arch 9 gains 549 bytes from its own 61 two group records, and the rest of its
remainder is still class 5.

That is a fourth architecture at 100.0%, and the infrared reader is the same code on all four.

### The 49 bytes that are left, and three things they are not

What remains on arch 8 is 60 bytes, of which 51 are single bytes and 49 of those sit between a
screen program and a mode page. The value is always zero. Recorded here because the obvious
explanations are all refuted and the next person should not spend the afternoon again:

* **Not length parity.** All 49 padded programs have **even** length, and 358 unpadded ones have
  odd length. The rule would have to be the opposite of the obvious one and it is not that either.
* **Not address alignment.** The pad byte falls on both parities of its flash address, and so does
  the structure after it.
* **Not a terminator after a jump.** Every one of the 49 programs is four bytes, `SCREEN_JUMP` plus
  its three operand bytes, and the byte after is `0x00`, which is `SCREEN_END`. That reads like an
  explicit end the program reader drops. It is not: on arch 12 and arch 14 **zero** of 319 and 478
  jump ending programs are followed by a zero byte, and on arch 8 only 49 of 251 are.

So they are trailing slack at the end of the screen program area, and what puts them there is open.
Arch 8 rounds to 100.0% with them, on the same rounding that gives arch 12 its 24 unattributed
bytes and arch 14 its 41.

### What would falsify it

A record with `+11` above 1 on arch 12 or arch 14, which would mean the count is not what keeps
those architectures on the old reading. A two group record whose second group names a block already
named by the first, which would show up as an overlap. An arch 8 config whose count of two group
records is not 37.

### Where it lands

* `docs/config-format.md`: base slot 5's record header.
* `packages/codec/src/ir.ts`: `IR_HEADER_BASE`, `IR_HEADER_GROUP`, `IR_GROUP_COUNT_AT`,
  `irGroupCount`, `irHeaderLength`, and `irRecordBlocks` walking every group.
* `packages/codec/src/coverage.ts`: the header claim takes its length from the record.
* `packages/codec/test/sections.test.ts` and `test/coverage.test.ts`.


## 76. A Harmony 525 on the bench: two address spaces, a seven byte version block, and arch 9 firmware

A Harmony 525 was connected on 8 August 2026, which made architecture 9 the third this project has
hardware for. `docs/memory-map-525.md` exists so that session was a test rather than a description:
every number in it was published before the remote arrived. Eight of the nine predictions hold
exactly. The ninth is wrong and it is the interesting one, and two things nobody had predicted at
all were what actually stood between us and a config read.

### The identity, predicted against measured

Enumeration first, opening nothing:

| | predicted | measured |
|---|---|---|
| `idProduct` | `0xC111` | `0xC111` |
| `bcdDevice` | `0x0916` | `0x0916` |

Both hold, so the `bcdDevice` rule really is generation specific. The Harmony One enumerates
`0x1054` and the 600 `0x1071`, a constant `0x10` followed by the skin in BCD; read that way a 525
would be `0x1022` and it is not. Read as plain hex it is protocol 9 and skin 22, both exact.
Section 57's corroboration of field 5 through `bcdDevice` therefore holds for the MyHarmony era and
must not be carried back.

Then `GET_VERSION`, which answered `27 30 25 12 ff 90 16 09`:

| field | predicted | measured | |
|---|---|---|---|
| 0 | `0x30` | `0x30` | firmware 3.0, and the USB vendor string says `Harmony Remote 0-3.0.0` |
| 1 | `0x25` | `0x25` | `BOARD 2.5.0` |
| 2 | `0x12` | `0x12` | flash device id |
| 3 | `0xFF` | `0xFF` | flash manufacturer id, so a 25F040, 512 KiB |
| 4 | `0x90` | `0x90` | `PROTOCOL 9` in the high nibble |
| 5 | `0x16` | `0x16` | `SKIN 22` |
| 6 | `0x0C` | **`0x09`** | the one miss |

**Field 4 is the claim that mattered and it holds.** Section 57 read its high nibble as the
architecture from four images spanning two architectures. A third architecture is a real test of
that and `0x90` is the whole claim in one byte.

**Field 6 is not a constant.** It is `0x0C` on arch 12 and arch 14, which is why it was predicted
here and why it sits in the open list as "a compiled in `0x0C` with no reading". On this remote it
is `0x09`, which is the architecture and the protocol. concordance reads that byte as the protocol
when the block is seven long and takes the protocol from the architecture nibble when it is longer,
so on arch 12 and arch 14 nothing reads it and a stale `0x0C` would never show. That is a
hypothesis rather than a reading: it would make the 600 claim protocol 12 where its own config
header says 14. What is established is only that the byte is not the same everywhere.

### The version block is seven fields, and the nibble says so

The reply is `0x27`: high nibble `0x2` for a version response, low nibble 7. Every one of those
seven bytes is identified above. On arch 12 and arch 14 the reply is `0x28` while the firmware
copies twelve, which is why this project read the nibble as decoration and matched the whole byte.

concordance reads it as a length and branches on it, accepting 5, 7 or 8 and giving up the
architecture and the skin below 6 and the protocol below 7. Both readings are now needed: the
nibble is a count where it is small and a floor at 8, where the arch 12 firmware settles the real
figure at twelve by copying twelve bytes.

Matching the whole byte meant a perfectly good answer from a working remote decoded as an anonymous
data reply, and then a second check refused it for not being twelve bytes long. **A remote that
answers correctly and is refused twice by the host is the worst shape a protocol bug can take**,
because every symptom points at the device.

### Two address spaces, a megabyte apart

This is what actually blocked the read, and nothing had predicted it.

`READ_FLASH` on this remote is **silent** at `0x010000`, `0x020000` and `0x030000`, and answers at
`0x800000`, `0x810000`, `0x820000` and `0x870000`. At `0x820000` the first bytes are
`41 48 43 4d`, which is `AHCM`. So the config is exactly where concordance's architecture table
says it is, `config_base = 0x820000`, with `flash_base = 0x800000` and `firmware_base = 0x810000`.

**And the container's own pointers are `0x02xxxx`.** Its `end_addr` is `0x0002C7F7`, section slot 0
points at `0x029609`, and the recovered base is `0x020000`. Computing the length as
`end_addr - config_base` gives **minus 8337413**, which is how this was found rather than assumed.

So both numbers are right and they are different numbers:

| | value | what uses it |
|---|---|---|
| read base | `0x820000` | the address a `READ_FLASH` command must name |
| container base | `0x020000` | what every pointer inside the file counts from |

`docs/memory-map-525.md` and `packages/corpus/src/read.ts` both said bit 23 "reads as a flag rather<!--superseded-->
than an address bit", from concordance's table disagreeing with the config's own arithmetic. It is
the opposite: bit 23 is part of the command's address and absent from the config's. The reasoning
that produced the wrong version was sound and one sided, since only the config was available.

**The device refuses by saying nothing.** On arch 12 and arch 14 the firmware's validator at
`0x13DFE` rejects a top address byte outside `< 0x20`, `0xFE` and `0xFF`. Whatever arch 9's rule
is, a rejected address produces silence rather than an error, so a wrong base looks like a broken
cable. That is worth stating because the entry in `read.ts` was written with a comment promising
the failure would be loud, on the grounds that `parseHeader` refuses anything that is not a
container. It never got that far.

### The firmware, which was the prize

`0x800000` and `0x810000` both hold an image beginning `xx xx ff ff 48 47 00 70`, where `48 47` is
`HG` and the first two bytes differ between them, so they are plausibly a checksum. `0x810000` is
the larger, 37912 of 65536 bytes not `0x00` or `0xFF` against 8826 at `0x800000`.

`loadaddr.find_base` puts the `0x810000` image at program `0x1000`, scoring 717 boundary hits
against 326 for base 0 and 153 for the next candidate, which is the wide separation that module
asks for. Three independent things agree with it:

* Disassembled at `0x1000` the first eight bytes are the header and `0x1008` is
  `GOTO 0x07FB4`, with ordinary code from `0x1010`: `MOVLB`, `CLRF`, `BTFSS`, `BRA`, `BCF LATE,2`.
* `0x07FB4` fits inside 32 KiB, which is the program memory of the `PIC18LF4550` concordance names
  for this architecture.
* A read of **internal** program memory at `0x000000` returns `7b ef 07 f0`, a `GOTO 0x0EF6`. That
  is the reset vector, and it lands **below** `0x1000`, so the region under the application image
  is a bootloader and the application starts exactly where `find_base` put it.

So the layout is: bootloader in internal flash below `0x1000`, the application above it, its update
image in external flash at `0x810000`, a second image at `0x800000`, and the config at `0x820000`.

**Internal program memory is at plain low addresses here**, not behind the `0xFE` and `0xFF` window
arch 12 and arch 14 use. This project's cap on internal reads keys on those two top bytes, so on
arch 9 it protected nothing until the region rule learned about the architecture. The cap is now
applied to top byte `0x00` on arch 9 for the same reason it exists elsewhere: an arch 12 remote
leaves the USB bus when such a read ends in a one byte chunk, and nothing establishes that this one
does not.

### The internal read, and what it confirms

Read on the owner's say so, 529 commands of 62 bytes each, one chunk per command, with a
`GET_VERSION` health check every 64 reads. **No restart, no missed health check, and the remote
answered normally afterwards.** That is the arch 12 hazard not reproducing here rather than being
absent, since a single chunk read is what the cap was always meant to permit.

The result is a closure that could not be had any other way. Internal program memory
`0x1000` to `0x7FFF` and the external image at `0x810000` are **byte identical over all 28672
bytes**. So the external image is the running application rather than a version of it, and
`find_base`'s answer of `0x1000` is confirmed by the device: a wrong base would have misaligned the
comparison everywhere instead of matching exactly.

Three more things fall out of it:

* **The image frames itself.** `HG` at `+4` and `GH` at `0x6FFE`, so it spans `0x7000` bytes,
  which is program `0x1000` to `0x7FFF` inclusive. Both external images carry the same frame.
* **The bootloader is below it**, `0x0000` to `0x0FFF`, 3781 of 4096 bytes used. The reset vector
  at `0x0000` is `GOTO 0x0EF6`, inside itself; the high priority interrupt vector at `0x0008` is
  `GOTO 0x1400`, inside the application. So it hands interrupts to the application, and it exists
  in no external image, which makes it the one part of this remote's code that only the device has.
* **`0x800000` is a different firmware**, not a copy: 27994 of 28672 bytes differ from the running
  one, and `find_base` puts it at `0x1000` too, 182 boundary hits of 183. Safe mode, by position
  and by the company it keeps.

### A second container, in the firmware region

Checking what else was in the `0x810000` region found `AHCM` at offset `0x8000`, so flash
`0x818000`: a **safe mode config**, 15342 bytes, twenty slots, marker `CMAH`, architecture 9, and
its trailer checksum recomputes. The first arch 9 safe mode container, and the arch 12 and arch 14
pattern repeating on a third architecture.

Its base is `0x018000`, which is `0x800000` below the address `READ_FLASH` names, exactly as the
user config's `0x020000` is below `0x820000`. **Two containers, one offset**, which is the two
address space finding checking itself on a sample that did not exist when it was made.

**It is not in the corpus, and that is deliberate.** It contradicts six claims the corpus asserts,
and each is a question rather than a count:

| what it contradicts | on this container |
|---|---|
| base slot 1 is seven bytes and slot 2 follows it | slot 2 starts **three** bytes in, so a seven byte reading overlaps it by four. Every one of the sixteen corpus samples has exactly seven |
| the log area is a region above the config | `0x0F0000` to `0x100000` here, above a 512 KiB flash |
| slot 0's frame is a tree under `Root` | its first node is named `CurrentActivityState_PowerOff_1`, and six header bytes differ |
| a font set declares one count per container | four sets declaring 91, 90, 50 and 90, which section 78 confirmed rather than explained away |
| the font header's spare byte is constant per architecture | it is not, here: section 78 read it as the first glyph code |<!--superseded-->
| the corpus glyph and string totals | both move, which is only a consequence of the above |

Adding it would have turned six properties into six exceptions in one commit, and the honest order
is the other way round: re-derive each, then assert against it. **An arch 9 firmware exists now**,
which is what the first two want.

**The third is settled, and it was not a fix.** The row above says "the root node is named `Curr`",
which is what the comparison reported, and the reason it reported that is the whole of section 77:
slot 0 was matched against a fixed nine byte prologue, so a container whose first node is not
`Root` looked like one whose root was renamed. `Curr` is the first four characters of a state
variable's name. Re-deriving the claim read the section instead, and `Root` is there, third. Regenerate the file from the flash dump with
`gspm.parse(open(dump,'rb').read()[0x8000:])`; its checksum is in `reference/checksums.md`.

### The config, and what it settles

51195 bytes read over USB with this project's own code and filed in the lab. Every container
prediction holds: `AHCM` and `MCHA`, marker `CMAH`, format `0x1400`, 20 pointer slots, architecture
9 in slot 1. The trailer checksum recomputes over all 51195 bytes, which is the closure on the whole
read: a transfer that drifted anywhere would fail it.

The byte accounting reads 77.1% and the emitter round trips it byte for byte. That is the corpus's
**second** arch 9 sample, which is where this project's verification standard starts, and the first
that did not come from a stranger.

### What it rules out

That the USB command layer is MyHarmony era only. `GET_VERSION` and `READ_FLASH` both work on an
EasyZapper era remote from this project's own host code, with the same command bytes and the same
length nibble mapping concordance uses.

That `packages/usb` was ready for a third architecture. Three things had to change and all three
were arch 12 assumptions written as universals: the version reply matched as a whole byte, the
version length fixed at twelve, and the region validator hard coded.

That the first exchange after connecting is reliable. The very first `GET_VERSION` of the session
returned nothing within three polls of two seconds; every exchange since has answered in **2 ms**,
four in a row identical. libconcord sends `COMMAND_RESET_USB` before anything else to every non
Z-Wave remote with the comment that otherwise "the first communication attempt fails", and
`readConfig` already retries once on silence, which is why it never saw this. **No reset was sent
here and none is proposed**, since the rails forbid one and a single retry covers it.

### What would falsify it

A second 525 whose version block is not seven fields, or whose field 6 is not `0x09`. An arch 9
remote that answers a `READ_FLASH` below `0x800000` other than in internal program memory. A
container on arch 9 whose own pointers count from `0x820000`. An `0x810000` image that does not
disassemble at `0x1000`.

### Where it lands

* `packages/usb/src/protocol.ts`: `VERSION_REPLY_CODE`, `VERSION_NIBBLE_LONG`,
  `VERSION_FIELD_COUNT_MIN`, and `validateRegionByte` taking an architecture.
* `packages/usb/src/remote.ts`: `RemoteOptions.architecture`, and `getVersion` accepting a block
  that is not twelve bytes.
* `packages/corpus/src/read.ts`: the 525 profile, no longer `unverified`, and `containerBase`.
* `packages/usb/test/protocol.test.ts` and `packages/corpus/test/read.test.ts`.
* `docs/memory-map-525.md`, rewritten from predictions to measurements.
* `reference/checksums.md`: the config, the two flash images, the internal memory and the safe
  mode container.
* `packages/usb/src/remote.ts`: the one chunk cap moved into `readFlash`, so it covers arch 9's
  internal region as well as the `0xFE` window it was written for.


## 77. Base slot 0 is a tree of named nodes, and level 1 names the state variables

The one section the emitter could not touch, and the last one whose extent was known while none of
its contents were. `coverage` counted its bytes because the `0xFEED` frame states its own length,
so a Harmony One config could report 100% attributed with 277 bytes inside it understood only as
"this many".

**What opened it was a sample whose first node is not called `Root`.** Section 76 found an arch 9
safe mode container in the 525's firmware region, and the first thing it contradicted was
`FRAME_PROLOGUE`, a constant this project had carried for months:

```
a7 08 00 00 00 00 00 R o o t
```

That is not a prologue. It is the **first node**, which in every config anyone had happens to be
named `Root` with both its fields zero. In the safe mode container the first node is
`CurrentActivityState_PowerOff_1`, and `Root` is the third.

### The reading

```
the frame
+0x00  u16   0xFEED
+0x02  u24   length, counted from the cookie, terminator excluded
+0x05        nodes, packed end to end, up to +length
+len   u16   0xBEEF

a node
+0x00  u8    0xA7
+0x01  u16   4 + the name's length
+0x03  u16   level
+0x05  u16   index
+0x07  char  name[]
```

The `u16` at `+0x01` is what makes the walk self checking: it counts the two fields and the name
and not the tag, so `Root` states 8 and `State` states 9, which is `4 + 4` and `4 + 5`. It was
sitting in the published layout the whole time as the second and third bytes of a fixed prologue.

**Widened on 9 August 2026.** The frame's length was published here as a `u16` at `+0x02` with the
byte at `+0x04` a spare that is "zero in every sample". Logitech's own client reads three bytes<!--superseded-->
there, `docs/host-client.md`, and it is right that the sample evidence proves nothing either way:
the largest name tree in the corpus is 2326 bytes, twenty eight times below the 16 bit boundary,
so the high byte would be zero under both readings. Both codecs take the wider one, because two
readings that cannot be separated by any available sample should be settled by which one survives
a sample nobody has. **This is client sourced and stays marked as unconfirmed**, and
`tests/test_gspm.py` asserts the corpus statement rather than the claim: the byte is zero in every
container, the narrow read equals the wide one in every container, and the largest tree is pinned
so a container that could tell them apart fails there instead of being absorbed.

That is the third time here that a byte beside a length turned out to belong to it, after the font
header's first glyph code in section 78 and the wide tagged list in the pitfall list. The rule
those three make is already written down: infer a structure's form from the byte that states it,
and when a byte next to a length is always zero, suspect the length.

### The closures, all three corpus wide

* **The nodes tile the frame exactly**, in every framed container, landing on the byte the
  stated length names with nothing left over and nothing short. `nameNodes` returns undefined
  rather than a partial list when they do not, which is the same discipline `glyphAt` uses.
* **Level 0's indices are a permutation of `0..n-1`** in every container, whatever order the nodes
  appear in. In the safe mode container the level 0 nodes are `State` at index 1 and `Root` at
  index 0, in that file order, so the index is the node's place and the file's order is free.
* **Every level 1 index is inside base slot 13's state variable count**, in every container. Not
  loosely: the largest is 93 of 94 on a Harmony 700, 73 of 74 on a 600, 44 of 46 on a One, 19 of 21
  on the bench 525. So **level 1 names base slot 13's table, entry by entry**, which is the
  designer's prior in harmony-decompiler discussion #1 made executable for the first time.

Level 2 exists on arch 8 and arch 9 and holds a small menu, `AssistantMenu` and `Show` under
`HarmonyAssistant`, with indices that run within their own level.

### What it rules out

That `Root` is structural. Nothing in the frame distinguishes it; it is a name at level 0 like any
other, and a reader that requires it refuses a container the remote accepts.

That base slot 0 needs a firmware. It was read from four architectures of data and one sample that
broke the pattern, with no arch 12 or arch 14 code opened at all. Sixteen of the nineteen containers `make coverage`
reports carry nodes, and the two that do not are the One's safe mode config, whose frame is the
degenerate empty one.

### What would falsify it

A frame whose nodes do not tile it. A level 0 index that repeats or skips. A level 1 index at or
above base slot 13's count, which would mean the two tables are not the same table. A name
containing a byte that is not text, which would suggest the field is not a name.

### Where it lands

* `docs/config-format.md`: base slot 0.
* `packages/codec/src/sections.ts`: `nameNodes`, and the constants beside it.
* `packages/codec/src/emit.ts`: base slot 0 is rebuilt from fields, so **every owner the accounting
  claims is now rebuilt** and what stays copied is only what nothing claims: 22 bytes of a Harmony
  One config, 39 of a 600.
* `packages/codec/test/sections.test.ts`, including the negative: a node length one byte out stops
  the frame tiling.


## 78. A font set states its first glyph code, and the count is not where the architecture says

Section 46 read the three byte header above a glyph pointer array as `height`, then a count and a
spare byte that swap places by architecture, and recorded under "what is not established" that
**which of the two holds the count is measured rather than explained**. It is explained now, and
the explanation makes the other byte a field rather than a constant:

```
+0x00  u8   glyph height in pixels
+0x01  u8   the first glyph code
+0x02  u8   the glyph count
+0x03  u24  glyph[count]
```

so a code's index is `code - first`, and section 46's "the code minus one" is that formula with the
value every config in the corpus happens to carry.

### The sample that could show it

Every container anyone here had starts its sets at code 1, which is precisely why the byte read as a
constant: a field whose value never varies is indistinguishable from padding. The arch 9 safe mode
container from section 76 is the first sample where it varies, and it varies to a number that names
itself. Its four sets declare `(32, 91)`, `(32, 90)`, `(72, 50)` and `(32, 90)`, and 32 is the ASCII
space.

**Its strings are English.** Rendered through `glyph[code - 32]`, the 54 inline strings of its
screen programs come out as `USB CONNECTED`, `Update Successful`, `E0 : Error Startup`, `Entry`.
Rendered through `glyph[code - 1]` none of them resolves at all, because a code of 122 runs past the
end of a 91 entry array. 54 of 54 against 0 of 54.

**Two independent structures agree.** The glyphs a set ships are exactly the characters that set's
own strings use, computed from the pointer array on one side and from the screen programs on the
other:

```
font 0   codes used     .0:ABCDEFGHILMNOPRSTUW\abcdefghiklmnopqrstuvwyz
         glyphs present  .0:ABCDEFGHILMNOPRSTUW\abcdefghiklmnopqrstuvwyz
font 3   codes used     :ACDcehiostvy
         glyphs present :ACDHcehiostvy
```

One spare glyph in font 3 and none at all in font 0. That is section 46's "a config ships only the
glyphs its own text uses" restated as an equality, and it cannot come out that way under a wrong
first code.

**The array ends where the count says.** Entry 90 of set 0 is the last plausible address and entry
91 onwards reads as glyph data, so 91 at `+0x02` is the count and the pointer array is exactly that
long. A reading with 122 entries, which is what indexing by `code - 1` would need, runs into the
glyphs.

This also gives the arch 9 glyph decoder its first readable text. Section 63 derived the two bit
packing from the encoder's own regularities and recorded that it could not run section 46's third
closure, because the one arch 9 config had no inline string codes at all. It has one now, in
letters.

### And the count is not keyed on the architecture

The same reading of `+0x02` immediately falsifies the other half. **The One's own safe mode
container carries the shape section 46 assigned to arch 8, 9 and 14**: `(14, 1, 46)`, a 46 glyph set
with the count at `+0x02`, on an arch 12 container. Read with the count at `+0x01` it is a set of
one glyph, and its 47 inline strings resolve 0 of 47 instead of 47 of 47.

So the rule is a property of the container, not of the remote:

> read the count at `+0x02`, unless that byte is zero, and then the count is at `+0x01` and the
> first code is 1.

That is a discriminator rather than an explanation, and it is stated as one. What is still not
known is **why** arch 12 user configs put the count in the first code's byte with a zero below it,
and the firmware does not settle it: the arch 14 renderer at `0x185E4` subtracts a literal 1 rather
than the header byte, and it never bounds a code with the count at all. So on that architecture
both fields are advisory to the firmware and load bearing to a reader.

### 5437 bytes, in one byte

The arch 12 safe mode container was **39.1%** attributed, with 5437 unaccounted bytes that appeared<!--superseded-->
in no user config. `CLAUDE.md` recorded a `u8 tag; u8 n; u16 v[n]` walk that tiled them to within a
byte and warned it should not be believed on that basis. It should not have been: the whole
remainder was the 45 glyphs and 135 pointer bytes of a set the reader had cut to one entry.

| | before | after |
|---|---|---|
| accounted | 3465 of 8902 | 8870 of 8902 |
| | 39.1% | 99.6% |

**The lesson is the one section 46 recorded and this section had to apply again.** Section 46's
correction was that the header's first byte is a height and not a count; the same paragraph then
published two more fields whose meanings had been assigned by which value they happened to hold.
When a field's value never varies across the corpus, the corpus cannot tell you what it is, and the
honest move is to say so and go looking for the sample where it varies. That sample existed, and it
was in the firmware region of a remote nobody had connected.

### What would falsify it

A container whose sets start at a code other than 1 and whose strings do not resolve through
`code - first`. A set whose pointer array is longer or shorter than the count at the byte this rule
picks. An arch 12 user config with a nonzero byte at `+0x02`, which would break the discriminator
outright.

### Where it lands

* `docs/config-format.md`: base slot 7.
* `packages/codec/src/font.ts`, `fontSetHeader` and `glyphOf`; `src/harmony/gspm.py`,
  `font_set_header`, mirrored.
* `packages/codec/test/screen.test.ts` and `tests/test_interpreter.py`, including the two
  negatives: the old reading resolves 0 of 47 strings on the One's safe mode container and runs
  the arch 9 codes off the end of their set.
* The arch 9 safe mode container joins the corpus as a sample, `h525_safemode_ahcm`, and stays out
  of the corpus wide claim lists. Section 76 kept it out over six contradictions; section 77 read
  one and this section reads four, so what is left is base slot 1's extent and the log area's
  range.


## 79. The last two of the six, and neither was a contradiction

Section 76 kept the arch 9 safe mode container out of the corpus because it contradicted six
claims, and set the order: re-derive each, then assert against it. Sections 77 and 78 took four of
them and turned two into findings. These are the other two, and both dissolve on measurement rather
than resolving into new structure. That is worth recording as clearly as the two that did not,
because a list of six anomalies with four real ones and two artefacts is the normal shape of such a
list.

### Base slot 1 is three bytes here, and its extent was never stated

The record is seven bytes in all sixteen other containers, `protocol, protocol, version word,
0x00 0x00, 0x00 or 0x10`, and three bytes here: `09 09 12`, with base slot 2 starting immediately
after.

There is nothing to explain. **A section's extent is the distance to the next pointer**, section
36, and slot 1 was the one place both parsers read a fixed length instead. What that cost is
instructive: reading seven bytes here takes the version word's high byte out of base slot 2's
capacity field and reports `0x0012` as this section's, which is a perfectly plausible word. No
check would have caught it, because the value is only ever compared with other configs of the same
model and this is the only container of its kind.

So both parsers now bound the record by `sectionLength(1)`, take the architecture when there are
two bytes and the version word when there are four, and this container reports **an architecture
and no version word**, which is what it holds.

**A lead, sharpened rather than settled.** `tests/test_gspm.py` recorded that the version word is<!--superseded-->
per model, not per config, and that its meaning is not established. **Section 81 corrects the first
half of that**, with a pair from this same corpus. Its low byte is very close to the remote's
skin:

| container | version word | remote's skin |
|---|---|---|
| Harmony One, user config | `0x0D3B` (59) | 54 |
| Harmony One, safe mode | `0x0C36` (54) | 54 |
| Harmony 600, user config | `0x0D49` (73) | 71 |
| Harmony 600, safe mode | `0x0D47` (71) | 71 |
| Harmony 650, safe mode | `0x0D48` (72) | 72 |
| Harmony 700, user config and safe mode | `0x0D42` (66) | 66 |
| Harmony 525, user config | `0x0D16` (22) | 22 |
| Harmony 880, user config | `0x0D0F` (15) | 15 |

Six exact, and the two that miss are both user configs whose own EZHex header states the skin the
remote reports, 54 and 71. The high byte is `0x0D` in every container but one, the One's safe mode
config at `0x0C`, which is what "an older word" in `tests/test_gspm.py` was already saying. So the
low byte is a skin like model number and the high byte a version, and what a writer must not do is
assume it can compute either: it is copied from the config being edited.

### The log area's range obeys every rule section 47 states

The recorded contradiction was "the log area is a region above the config" against "`0x0F0000` to
`0x100000` here, above a 512 KiB flash". Measured against section 47's own three checks it passes
all of them: the region sits above this container's `end_addr` of `0x01BBEE`, its `limit` is a
round flash boundary, and `limit - start` is `capacity * 8` exactly, 65536 against 8192.

**The 512 KiB came from the same field in the other container.** The 525's user config names
`0x070000` to `0x080000`, and that is what "a 512 KiB flash" was measuring against, so the
comparison was the field against itself.

What the corpus actually shows is that a safe mode container does not name its remote's chip:

| | limit | the remote's own config says |
|---|---|---|
| arch 9 safe mode | `0x100000` | `0x080000` |
| arch 14 safe mode, all three | `0x100000` | `0x200000` |
| arch 12 safe mode | `0x400000` | `0x400000` |

Two architectures, both naming 1 MiB, neither matching the unit. A safe mode config ships inside a
firmware package rather than being generated for a remote, so the size it names is the family's
nominal one. The arch 12 pair agreeing is not evidence against that: its region is 16 bytes with
stride 1 and looks nothing like the others.

### What this closes

All six. The container is in the corpus now, `h525_safemode_ahcm`, and in the corpus wide claim
lists, where it is the counterexample two of them have to name: its font sets start at code 32 and
declare four different counts. **Excluding it would have left the corpus agreeing with itself**,
which is the condition that hid the first glyph code, so the tests assert the exception rather than
skipping it.

The corpus totals it moves are the sixth item on section 76's list, and they move as arithmetic:
21552<!--fact:screen_programs--> screen programs, 4315<!--fact:glyphs--> glyphs and
58083<!--fact:inline_string_codes--> inline string codes.

### One tooling hole, found on the way

`make facts` reported that every marked number agreed while `docs/config-format.md` said "thirteen
containers" with a `fact:containers` marker on it. The marker regex only matches digits, so a
marker on a spelled out number is invisible to the checker that exists to catch exactly this. It is
an error now: a `fact:` marker with no number in front of it is reported, and the count of markers
has to match the count of matched values.

The other half of the same lesson is in `packages/codec/test/screen.test.ts`, whose corpus totals
had drifted from the Python suite's because both sides pin their own: `h525_config_2` joined one
list and not the other, and each file then agreed with itself. The list is the same fifteen samples
as `lab.CONTAINERS` now.


## 80. The arch 9 infrared chain, and the register map that nearly wrecked it

The first work done in the Harmony 525's firmware, which arrived on 8 August 2026 and which
section 65 named as the thing class 5 infrared wants. This does not read class 5's layout. It finds
the code that plays it, states the shape of the loop, and records the two things that would have
made a wrong answer look right.

### The register map is a different part, and 65 of 139 names disagree

`isa.py` has carried one SFR map since section 18, the PIC18F67J50 and 87J50 one, with a docstring
naming the exact hazard: `0xFBD` is `CCP1CON` on a PIC18F4550 and `CCPR1H` here. **The 525 is a
PIC18F4550**, so the hazard stopped being hypothetical the moment its firmware was read. The two
maps share 139 addresses and disagree about 65 of them: the whole CCP block moves, `0xFC0` is
`ADCON2` rather than `WDTCON`, so there is no `ADSHR` shadow set on this part at all, and the USB
block sits at `0xF60` to `0xF7F` against `0xF4C` to `0xF65`.

The carrier setup below writes `0x0C` to `0xFBD`. Under the right map that is `CCP1CON = 0x0C`,
PWM mode, which is the whole point of the routine. Under the default map it is a duty cycle byte
going into `CCPR1H`, which is readable, plausible and says nothing. So `disassemble` takes a part
now, `isa.PARTS` holds the maps, and `tools/pic18_disasm.py --part 4550` is how an arch 9 listing
is taken. An unknown part name is an error rather than a fallback.

### The SPI primitive, which is arch 9's choke point

`0x07F7A` writes one byte to `SSPBUF` and waits; `0x07F8E` reads one by clocking a dummy byte out
through it. Above them sits an ordinary SPI NOR driver: `0x0756A` issues command `0x03`, read data,
and `0x07524` and `0x07530` raise and lower chip select on `LATE` bit 2. Commands `0x05`, `0x06`,
`0x04`, `0xD8` and `0xAB` appear at the neighbouring entry points.

**This is the arch 9 analogue of arch 14's `0x1B9AC`**, the single point every config byte passes
through, and it is what makes arch 9 tractable the way arch 14 is. Arch 12 has no such point.

### A pulse is a `u16` and its top bit is the carrier

The player at `0x076CE` reads pairs of bytes out of a RAM queue at `0x600`, indexed by `0x2D9` with
`0x2D8` counting the bytes left. For each pair:

* bit 15 set carries the saved duty from `0x22C` into `CCPR1`, and clear zeroes it. So the top bit
  is **carrier on** and the low fifteen bits are a timer count.
* six is subtracted from the count before it is loaded into TMR0, which is the loop's own overhead.

`0x07680` starts the carrier, writing `PR2` from a computed period and putting CCP1 into PWM mode;
`0x076C0` stops it. The producer side is `0x0277C`, which pushes two bytes and adds two to `0x2D8`.

### The class byte is switched on in one place

`0x05108`. The class is in `0x2A`, the access bank byte section 61 reads out of the record header at
`+7`:

| class | arm |
|---|---|
| 1 | `0x05116` |
| 5 | `0x0513E` |
| anything else | `0x051FE` |

That is the first direct confirmation that the class byte is what selects the encoding, rather than
an inference from which records decode.

### What class 5's arm does, and what it does not say

```
seek the walking pointer 0x291..0x293 into the flash
stop if it is NULL or if the remaining count 0x230..0x231 is zero
read one byte -> 0x15C
seek 0x22D..0x22F
read a u16 -> 0x705
refuse if 2 * that would overflow the 0xFE byte queue
loop 0x705 times:
    read a u16 -> 0x707
    push it as a pulse
advance the walking pointer by one and decrement the remaining count
```

So the words it pushes are **pulse words in the same form the player consumes**, a count followed by
that many, with no terminator. That is already worth having, because section 61 recorded that arch
9's blocks have no terminator where class 1's convention would put one, and a count prefix is
exactly what that looks like from the outside.

**Where the words come from is not established, and the obvious reading fails.** Reading a `u16`
count at each of the two block pointers in a record header gives counts of 62786 and up, which is
not a count of anything. The firmware reads them from `0x22D`, and one byte from the walking list
becomes `0x15C`, which `0x066F4` multiplies by three and adds to `0x15B`: an index into a table of
three byte entries. So there is a level of indirection between the record and its pulses that the
header alone does not give, and section 65's "a shared descriptor, 66 distinct values over 200
records" is very likely that table. **That is where the next session starts**, and it should start
by settling what `0x22D` holds, since `0x22C` and `0x22D` are also written as carrier parameters
elsewhere and the bank on those accesses is inferred rather than known.

### Where it lands

* `src/harmony/pic18/isa.py`, `SFR_4550` and `PARTS`; `tools/pic18_disasm.py --part`.
* `tests/test_isa.py`, including the count of disagreeing addresses and the refusal of an unknown
  part.
* `tests/test_findings.py`, which pins every address above against the image, because finding them
  again is a search.
* `tests/lab.py`, `h525_code`, the 525's whole internal program flash.


## 81. Base slots 0 and 1 are host side, and the version word is per config

Section 79 left the version word as a sharpened lead: its low byte is very close to the remote's
skin, exactly in six containers of eight, and 59 and 73 in the two that miss. This settles what kind
of field it is without settling what picks the value, and it does that by asking a question the
corpus cannot answer: **who reads it.**

### Nobody on the remote reads either of them

The section seeker takes a raw slot number in a register that every caller loads with a literal, so
one scan gives the whole census. Run on both firmwares, walking back from each call site to its
`MOVLW`:

| image | seeker | raw slots seeked |
|---|---|---|
| Harmony One 3.4 | `0x2BA76` | 2 to 19, 24 sites, none unresolved |
| Harmony 700 2.8 | `0x10B92` | 3 to 17, 19 sites, none unresolved |

**Raw slot 0 and raw slot 1 appear on neither.** Section 47 already reported these two censuses, for
what they say about slot 2, and the absence at the other end went unremarked. So the two sections
this project has just learned to read, base slot 0's name tree in section 77 and base slot 1's
architecture record, are the two the firmware never fetches. They are written for the host software
and nothing on the remote validates them.

That explains three things at once that otherwise look like defects: slot 1 can be three bytes long
in one container and seven in the rest, section 79; its version word can name a skin the remote does
not report, below; and base slot 0 can carry a state variable's name that no interpreter ever needs.

### The word is per config, and one remote proves it

`tests/test_gspm.py` asserted that the word is per model rather than per config. The corpus contains<!--superseded-->
the counterexample and it was the one pair nobody had compared:

| container | word | when |
|---|---|---|
| the spare Harmony One, before its sync | `0x0D3B` | built 2023 |
| **the same unit, after** | `0x0D36` | built 6 August 2026, watched |

One physical remote, two configs from Logitech's own service, two different words. Section 58 is
what makes this evidence rather than an anomaly: that sync was performed and observed, so the
direction and the provenance are known rather than inferred. The programmed Harmony One carries
`0x0D3B` too, so the claim as published is false in both directions: two units of one model can
agree, and one unit can disagree with itself.

### What the low byte is

A skin number, in Logitech's own numbering. Six of the eight containers whose remote's skin is known
carry it exactly:

| | word | low byte | the remote's skin |
|---|---|---|---|
| Harmony One, safe mode and the 2026 config | `0x0C36`, `0x0D36` | 54 | 54 |
| Harmony 700, user config and factory container | `0x0D42` | 66 | 66 |
| Harmony 600, safe mode | `0x0D47` | 71 | 71 |
| Harmony 650, safe mode | `0x0D48` | 72 | 72 |
| Harmony 525, both configs | `0x0D16` | 22 | 22 |
| Harmony 880, all four configs | `0x0D0F` | 15 | 15 |
| Harmony One, the 2023 configs | `0x0D3B` | **59** | 54 |
| Harmony 600, user config | `0x0D49` | **73** | 71 |

The two that miss are not arbitrary. Logitech's own classic software, in the private lab, carries a
table of platform families against skin numbers, and it agrees with all six exact cases; the family
it calls Gin is the arch 12 platform this project already names that way. In that table 59 and 73
are unallocated.

**Corrected on 9 August 2026, when the whole table was read rather than the part that prompted
this.** This paragraph said each orphan "is the next free number inside its own family's block:<!--superseded-->
Gin holds 54, and the family holding 66, 71 and 72 stops there". Gin's block **is** 54 alone, but
55 is allocated to another family, so that rule does not produce 59 and the sentence was doing work
it could not do. The table is a set of contiguous runs, `9-25`, `39-41`, `44-45`, `48-50`, `52-58`,
`60-68`, `71-72` and three singletons, and the rule that does hold is: each orphan is **the first
free number above the run containing that remote's own skin.** 54 sits in `52-58`, whose first free
number above is 59; 71 sits in `71-72`, whose first free number above is 73. Two cases, both exact,
and computed from the table rather than read off it.

So the conclusion survives, that both read as later members of the same numbering rather than as a
different kind of value, and it now rests on something that can fail. The full table is in
`reference/models.md` with its provenance, per `docs/host-client.md`. It dates from before the
MyHarmony era, which is why a later skin would be missing from it, and that is also why this stays
a **lead confirmed in kind and not in detail**: what selects 54 over 59 for one remote is not
established.

### What it is not

**Not the remote's own skin.** `one_config`'s EZHex header states `<SKIN>54</SKIN>` while its body
carries 59, in the same file.

**Not the build date.** The One's 2026 config carries the lower number and its 2023 configs the
higher one, so the value does not advance with time.

**Not the architecture**, which section 20 already established, and not the config contents: four
arch 8 configs differing in 73 to 84 percent of their bytes share one word.

The high byte is `0x0D` in every container built from 2009 onward and `0x0C` in the One's 2007
factory container, which is what "an older word" in the superseded test was seeing.

### For a writer

Copy the word, do not compute it. Nothing on the remote reads it, so a wrong value costs nothing on
the device and everything to whoever reads the config afterwards, which now includes this project.

### Where it lands

* `docs/config-format.md`, base slot 1.
* `tests/test_gspm.py`, with the corrected claim and the falsifying pair.
* `tests/test_findings.py`, the census, computed rather than quoted.


## 82. Infrared class 5 is class 1 with a dictionary

The last remainder in the byte accounting, and it closes the way section 65 guessed it would. Class
1 spells a code as a literal run of durations. Class 5 spells it as a run of **indices** into a
table of short pulse blocks, so a code that repeats a bit pattern stores that pattern once. Three
levels where class 1 has one:

```
record body    u24  the symbol table's address
               u16  n, bytes of index stream
               u8   index[n]                     zero based, into that table
                                                 5 + n bytes

symbol table   u8   count
               u24  symbol[count]                1 + 3 * count bytes

symbol block   u16  count
               u16  pulse[count]                 bit 15 carrier on, low 15 bits microseconds
               u16  0x0000                       4 + 2 * count bytes
```

The header is unchanged, section 65, and so is what its two pointers mean: a thing to send. What
changed is what is behind them, and that is decided by the class byte at `+7` alone.

### The firmware states every field of it

Arch 9, the 525's own image, `--part 4550`. The loader is at `0x04FF6` and the player's class 5 arm
at `0x0513E`, both reached once per pointer:

| what | where | which field |
|---|---|---|
| read the header pointer, seek it, stop if NULL | `0x04FF6` | the body's address |
| **only when the class byte `0x22A` is 5**, read three bytes into `0x22D` | `0x05002` | `u24 table` |
| read two bytes into `0x230` | `0x05018` | `u16 n` |
| save the read position into `0x291` | `0x05326` | the index stream starts here |
| per step: read one byte into `0x15C`, decrement `0x230`, advance `0x291` | `0x0514C`, `0x051E4` | one `u8` index |
| offset `= 3 * 0x15C + 0x15B`, where `0x15B` is loaded with 1 | `0x066F4`, `0x05370` | skip the count, three bytes an entry |
| add that to the table address and seek | `0x06792` | `symbol[index]` |
| read three bytes into `TBLPTR` and seek those | `0x06560` | the entry is a `u24` |
| read two bytes into `0x705` | `0x05178` | the block's `u16 count` |
| that many times: read two bytes, push them to the pulse queue | `0x051AC` | `pulse[count]` |

So the count prefix is why section 65 could not find a terminator, the `+1` is the count byte of the
table, and the three byte stride is the table's entry width. Nothing here is inferred from the data:
each of the four widths is a literal in the code that reads it.

The block's trailing zero word is **not** read by any of this, since the count already says where
the block stops. It is there in all 50 blocks of the corpus anyway, so the emitter writes a zero
rather than copying what it found, and a block that ever lacks one fails the round trip.

### The data agrees, and it agrees everywhere

Both arch 9 configs, every class 5 record, no exceptions and no unparsed remainder:

| | `h525_config` | `h525_config_2` |
|---|---|---|
| class 5 records | 200 | 107 |
| non NULL header pointers | 414 | 286 |
| distinct bodies | 380 | 266 |
| index bytes | 22062 | 10270 |
| symbol tables | 5 | 1 |
| symbols per table | 11, 3, 7, 7, 15 | 7 |
| bodies naming one table | 2 to 206 | 266 |
| distinct symbol blocks | 43 | 7 |
| pulses in a block | 1 to 54 | 1 to 16 |
| bytes: bodies, tables, blocks | 23962, 134, 1680 | 11600, 22, 82 |

Every index is inside its table, every block's count fits the file, and **every table sits exactly
on top of the last of its own blocks**, delta zero for all six tables. That last one is the
independent closure the gate asks for: nothing in the reader arranges it, and a wrong entry width or
a wrong count offset would put the top of the block run somewhere else.

### What it decodes to, which is the closure that matters

Expanding one 39 index body of `h525_config` through its table, in microseconds, mark as `+`:

```
[-32767 x14 -20631] [+8990 -4490] [+568 -552] x6 [+568 -1662] x8 ... [+568] [-20111 -20111]
[+8990 -2230] [+568 -32767 -32767 -30543]
```

That is NEC, exactly: a 9000 and 4500 header, 32 bits of 560 with 560 or 1690 spaces, a trailing
mark, and a **repeat frame** of 9000 and 2250. The table holds one symbol for a zero bit, one for a
one bit, and one each for the header, the trailing mark, the gaps and the repeat, which is why the
index streams of two buttons on the same device differ only in the middle. A long gap is split into
words of `0x7FFF`, since 32767 microseconds is all a fifteen bit field can say.

So the microsecond unit and the carrier bit carry over from class 1 unchanged, and this is a
compression scheme rather than a different encoding. It is also why the corpus's arch 9 configs are
smaller than their arch 12 equivalents per code.

### What section 65 saw, and why its count was wrong

Section 65 recorded the body as `u24 a shared descriptor, 66 distinct values over 200 records, 135
of them landing in a second unattributed area of 1814 bytes`, and guessed from a run of 32
alternating values that class 5 might be table driven with one symbol per bit. **The guess was
right and the count was a misaligned read**, which is the third time this project has been caught by
that family, sections 49 and 55 being the others.

It read the `u24` at the start of each block area, which is the previous header's end. That is a
body start only when a body happens to end there, which is the case 135 times out of 199; the other
64 reads landed inside an index stream and produced a value that is not a pointer at all.
Reproduced exactly: 65 distinct values over 199 area starts, and 135 of those starts are genuine
body starts. **And the 1814 bytes are the symbol tables plus the symbol blocks, to the byte**: 134
and 1680. Section 65's descriptor was the symbol table pointer, seen through an alignment that was
right two times in three.

### For a writer

Everything at these two lower levels is shared, more than anywhere else in the format. Two records
name one body 34 times in `h525_config`, 206 bodies name one symbol table, and a symbol block is
reused by every code that has a zero bit in it. So an editor changes nothing here in place: a new
code appends a body and reuses the table, and a changed timing means a new symbol rather than an
edited one.

### Where the accounting lands

Arch 9 goes from 67.1 to 99.95 percent on `h525_config` and 77.1 to 99.92 on `h525_config_2`, with
zero overlaps, and the emitter rebuilds all of it from fields: `framed` rises from 22063 to 47839
and from 15079 to 26783, and both still round trip byte for byte.

What is left on arch 9 is **43 bytes in six gaps, and they are not arch 9's**. The same six shapes
sit in every container in the corpus: the `0xBEEF` that closes base slot 0's frame, three zero bytes
before base slot 4, a tagged list between base slot 7's table and the page list pool, and a byte
either side of base slot 17's table. That is one small finding across four architectures rather than
anything to do with infrared, and it is the next thing to do.

### Where it lands

* `docs/config-format.md`, base slot 5, the three class 5 structures.
* `packages/codec/src/ir.ts`, `irClass5Body`, `irSymbolTable` and `irSymbolBlock`; the claims and
  the rebuilders in `coverage.ts` and `emit.ts`.
* `packages/codec/test/sections.test.ts`, the corpus numbers above and the NEC expansion.
* `tests/test_findings.py`, the firmware addresses, pinned against the image.


## 83. Three rules take the residue to single figures, and one of them names base slot 8

Section 82 left the accounting with the same six shapes in every container, four architectures
included, and said that was one small finding rather than four. It is three, and the largest of them
is a structure rather than padding.

### Base slot 8 is its leading action list, and every mode page list

Section 27 read base slot 8 as a leading action list followed by records, and used
`1 + 3 * count` from the section's first byte to find where the records begin. That leading list was
never claimed, so every container was short by exactly its length: 4 bytes on arch 8 and arch 12,
34 on arch 9 and arch 14, where the counts are 1 and 11.

Claiming it turned up the more interesting half. **Every mode page's list is inside base slot 8's
section**, and the leading list plus those lists tile the section exactly:

| sample | section | leading list | page lists | pages inside |
|---|---|---|---|---|
| `h700_gspm` | 104 | 34 | 70 | 35 of 35 |
| `h600_config` | 1963 | 34 | 1929 | 254 of 254 |
| `one_config` | 3928 | 4 | 3924 | 330 of 330 |
| `arch8_config_a` | 2050 | 4 | 2046 | 141 of 141 |
| `h525_config` | 1086 | 34 | 1052 | 135 of 135 |

So section 27's "records", `u8 count; { u8 tag; u16 operand; u8 opcode }[count]`, and section 66's
narrow tagged list, `u8 count; 4 byte entry[count]`, are the same bytes read twice, and the `0x00`
bytes section 27 skipped between records are the wide form's lead byte, which section 66 read.
Neither reading is wrong; they are one structure with two names, and the accounting is what made
that visible, because both walks consume the section exactly and only one of them can own it.

**This does not touch section 27's evidence.** The controlled pair still says slot 8 grew by 8 bytes
when its owner added two buttons, which is two entries of a page's list, and the tags are still key
presses with a per model scan code set. What changes is where those entries live: in the mode
pages' own lists, which is where a page's bindings would be expected to live.

The one container this does not hold on is `h525_safemode_ahcm`, whose 44 pages point at **two**
lists between them. The claim is per page, so the tiling has to be counted per offset, which is what
the byte accounting does anyway.

### Base slot 0's frame is two bytes longer than the length it states

The `0xBEEF` terminator sits **outside** the stated length, which `gspm.ts` has documented since
section 20 and the emitter has always written. The accounting claimed the length alone, so every
container in the corpus was two bytes short in the same place, and the two sides disagreed without
any test noticing: `rebuilds` is checked against `claims` in one direction only.

An empty frame states a length of zero and is seven fixed bytes: cookie, the three byte zero length
and the terminator. Both arch 12 safe mode containers carry one, and `nameNodes` returns
nothing for it, so the emitter needed its own case or the claim would have been unrebuilt.

### An empty counted array is an array

`pointerArrayAt` refuses a count of zero on purpose: with no entries, `width + 3 * count === length`
checks nothing, so accepting it would let any short section pass as a pointer array. The section is
still the count field, so it is claimed separately, under the same name, and only when the section
is at most three bytes and every one of them is zero. Three, because the count is one or two bytes
and arch 12 pads base slot 16's to three.

That is base slot 16 in every container, since **no config anybody has uses the number sender**, and
base slots 5, 11 and 12 in the safe mode containers, which carry no infrared, no screen programs and
no timers.

### Where it leaves the accounting

Every user config is at 100.0 percent, zero overlaps everywhere, and the emitter's copied residue is
what is left:

| container | bytes left | what they are |
|---|---|---|
| arch 14 and arch 9 user configs | 4 | 3 zero bytes above the clock record, 1 above base slot 17's count |
| arch 12 user configs | 15 | those, plus 12 in base slot 15 between two parameter groups |
| arch 8 user configs | 53 to 68 | those, plus one zero byte after each of 50 to 65 screen programs |
| safe mode containers | 6 to 21 | the same shapes |

Named individually so the next session starts from a list. Three of them look like a section's own
tail: base slot 3's section is 14 bytes and the clock record is 11, and base slot 17's is one byte
longer than its count. The arch 8 family is the interesting one, 50 gaps of one byte in a config,
each a zero between a screen program's last instruction and a mode page record.

**The arch 9 safe mode container is a separate matter**, at 86.0 percent with 2144 bytes left, and
it is not in this list because what it has is structures rather than tails: a 1617 byte run above
base slot 17 and four runs of 26 to 189 bytes that read as instructions.

### Where it lands

* `packages/codec/src/coverage.ts`, the three claims, and `emit.ts`, their rebuilders.
* `packages/codec/test/coverage.test.ts`, all three as corpus wide rules rather than per sample
  numbers, each named after what would falsify it.
* `docs/config-format.md`, base slots 0 and 8.


## 84. Five rules take every user config to the byte, and the residue copy to nothing

Section 83 left a list rather than a number: 4 to 68 bytes per container in five shapes, three of
which looked like a section's own tail and one of which was 50 to 65 single zero bytes on arch 8.
All five are read now. **Every user config in the corpus is accounted for to the byte, the emitter
rebuilds all of it, and the residue copy writes nothing at all**, on eighteen of the nineteen
containers. The nineteenth is the arch 9 safe mode one, which has structures left rather than tails.

### A screen program that ends by transferring still carries its terminator

The arch 8 family, and the only one of the five that is a structure rather than an extent.

`screenProgram` stops at a jump or a switch, because after either the stream is somewhere else, so
the byte after the last instruction belongs to whatever comes next. On arch 8 there is usually
nothing next: 49, 61, 64 and 64 of those bytes per config are a single `0x00` that no reader
claimed, and every one of them sits immediately in front of a mode page record.

**The closure is positional and it comes from the same file.** In exactly that place, between a
program and the page record after it, most programs end with a `SCREEN_END` the walk **does** reach:

| sample | pages | preceded by a reached terminator | preceded by an unclaimed zero | abutting |
|---|---|---|---|---|
| `arch8_config_a` | 141 | 91 | 49 | 1 |
| `arch8_config_b` | 173 | 112 | 61 | 0 |
| `arch8_config_c` | 204 | 140 | 64 | 0 |
| `arch8_config_d` | 204 | 140 | 64 | 0 |
| `one_config` | 330 | 294 | 0 | 36 |
| `h600_config` | 254 | 254 | 0 | 0 |

So the generator emits a terminator at the end of a program's storage whether or not it can be
executed, and the two columns differ only in what the last instruction was. The 36 arch 12 pages in
the last column are the other direction: a jump that abuts the record with no terminator at all,
which is why the claim is made only when the byte is zero.

It is a program's own byte, not a page record's leading one, and the two readings are separable:
nothing points at the byte before a page record, so no firmware path reads it as part of the record,
while the 294 and 91 reached ones are executed instructions.

Counted as programs rather than as bytes it is 52, 64, 67 and 67, because three per arch 8 config
end in a switch whose following zero another program's walk had already claimed.

### Three extents that were one field short

Nothing conceptual, and each one was invisible until the container had nothing else left in it.

* **Base slot 3 is 14 bytes and the clock record is 11.** The record closes at its own `0xEFBF`,
  so the three bytes after it are the section's. Zero in all nineteen containers, and written as
  zeros by the emitter rather than carried, so a tail that is not zero fails the round trip.
* **Base slot 17 is two bytes where it names the picture bank.** Section 62 established that the
  pointer lands `PICTURE_BANK_BIAS`, which is 2, in front of the bank on arch 8, 9 and 14. The
  section's own part is therefore those two bytes, not the one byte an empty count accounts for.
  Both are zero in all thirteen containers that do this.
* **The key table's extent is the mode record's**, not `1 + 4 * count`. Section 52 found the two are
  the same bytes; a mode record has two forms and **an empty one is the wide form**, a zero lead
  byte and a zero count, two bytes where the narrow arithmetic says one. That is the whole of it on
  the arch 14 safe mode containers, and it is where their two unclaimed bytes each came from. The
  old claim also required a nonzero key count, so an empty record was claimed as nothing.

The last of those has a second half. **Arch 9 has no key table**, so on arch 9 the record at the
marker is an ordinary mode record, and the rule that skipped it left 189 bytes of
`h525_safemode_ahcm` unclaimed. The skip is now conditional on there being a key table at all.

### Twelve bytes on arch 12 that belong to base slot 15 and to no group

Section 44 saw these and called them the only untidy number in the section. They sit between the
tenth and eleventh of arch 12's eleven parameter groups, the groups either side of them are
contiguous with their neighbours, and the pointer array names the eleventh outright.

They are byte identical in all six arch 12 containers, `ff 00 ff 00 00 00 00 00 55 55 55 55`, and no
`u24` anywhere in any container names their address. Twelve bytes is six `u16` values, which is the
body of a six value group without its count byte, but a count of `0xff` cannot be read out of the
first byte and nothing points at them, so that is a shape rather than a reading.<!--superseded-->

*Corrected by section 103, in the blockquote below the next paragraph: the shape was wrong and the
instinct behind it was right.*

**So this claim is an attribution and not a decoding, and the emitter says so**: whose the bytes are
is settled by position, inside base slot 15's run between two of its groups, and what they say is
not, so they are carried rather than framed. That distinction is the reason the emitter reports two
numbers, and this is the first claim to use it deliberately.<!--superseded-->

> **Section 103 decodes them, and the "shape rather than a reading" was the right instinct pointed
> at the wrong shape.** They are not six `u16` values with a missing count byte. They are group 9
> continuing past the six entries its own header declares: four bytes that `0x249A0` reads as one
> more device level pair, then eight that `0x2492E` reads as bytes, four two bit fields each. The reason
> nothing points at them is that nothing needs to, because their reader arrives by adding an offset
> to the group before them. They stay carried rather than framed, which is now a choice about the
> emitter rather than an admission about the reading.

### Where it leaves the accounting

Every container in the corpus except the arch 9 safe mode one is at 100.0 percent of its bytes, with
zero overlaps, and `emit` reports **`copied` as zero** on all eighteen: every byte is written by a
rebuilder, from a field or from a carried run. The residue copy still exists and still covers
nothing, which is the state milestone M2's first three parts were aiming at.

What each container gained, against section 83's list:

| container | bytes | what they were |
|---|---|---|
| arch 14 and arch 9 user configs | 4 to 6 | the clock tail, base slot 17's second byte, an empty key record |
| arch 12 user configs | 15 | the clock tail plus base slot 15's twelve |
| arch 8 user configs | 53 to 68 | those plus 49 to 64 dead terminators |
| arch 12 safe mode containers | 15 | the clock tail plus base slot 15's twelve |
| arch 14 safe mode containers | 6 | the clock tail, base slot 17, an empty key record |
| `h525_safemode_ahcm` | 193 | those plus the 189 byte mode record arch 9 was skipping |

### What finishing cost, which is worth recording

Two tests had to move, and both moves are the same shape: a demonstration that depends on a defect
stops demonstrating anything when the defect is fixed.

`the gap families are computed over every gap, not the listed ones` was pinned to `h525_config`'s
203 gaps, then to `arch8_config_a`'s 51 after section 82, and now no container has more gaps than
the report lists. The grouping is a pure function of a gap list now, `gapFamilies`, and the test
hands it 54 synthetic gaps. The corpus keeps a weaker version: on the one sample that still has
gaps, the families partition them exactly.

`an edit no reader claims is refused` looked for an unclaimed byte in `h600_config` to try to write.
There is not one. The rail it tests was always two rules, "inside one claim, not merely covered by
several", and the second half is what a fully claimed container can still exercise: an edit spanning
the boundary between two adjacent claims is refused. The test also asserts, now, that every byte of
that config belongs to a structure, which is the fact that made the first half untestable.

### Where it lands

* `packages/codec/src/screen.ts`, `deadTerminator`, and the claim and rebuilder either side of it.
* `packages/codec/src/coverage.ts` and `emit.ts`, the four extents, and `gapFamilies` as a pure
  function.
* `packages/codec/test/coverage.test.ts`, one corpus wide test per rule, each named after what would
  falsify it, plus the pinned per sample terminator counts.
* `docs/config-format.md`, base slots 3, 11, 15 and 17.


## 85. Opcode 22 takes one operand on arch 9, and a monochrome row is padded to a byte

Two corrections, both found in the arch 9 safe mode container, both invisible in every other
container in the corpus, and both of the same shape: **a rule that is wrong and a corpus that cannot
say so, because every sample happens to sit on the one case where the wrong rule gives the right
answer.** Section 83's list said this container had structures left rather than tails, and it does;
what it did not say is that two of its own readers were wrong.

Together they take `h525_safemode_ahcm` from 87.3 to 98.2 percent, and they leave 283 bytes in four
runs, named at the end.

### Opcode 22 is a row select, not an eleven byte picture draw

Section 64 read opcode 22 on arch 9 as eleven operands whose last three name a picture, against
three on arch 12 where the firmware says it is a call. The picture is real. **The instruction is
not**: those eleven bytes are one operand, then an **opcode 3**, which is nine operands ending in a
flash address, exactly as the shared table has always had it.

```
16 nn 03 00 yy 00 yy 60 08 aa aa aa
^^ ^^                                 opcode 22, one operand: the row, 0 to 7
      ^^ .....................        opcode 3, nine operands
         ^^ ^^ ^^ ^^                  two (0, 8 * row) pairs
                     ^^ ^^            96 wide, 8 high
                           ^^ ^^ ^^   the picture
```

Both readings consume the same twelve bytes and end on the same `u24`, so they agree about
everything observable **whenever opcode 22 is followed by opcode 3**. That is 1856 times out of
1856 in the two arch 9 user configs, which is why section 64's closure held: it was reading opcode
3's address through opcode 22's swallowed operands, and every other width scored zero because every
other width lands on neither.

The safe mode container has four that are not followed by opcode 3, two of them opcode 16 and two
opcode 4, and there the eleven byte reading walks straight off a program. That program is the 49th,
it was lost, and it is the one that draws "Nothing to do" and "OK".

**The closure for one is arithmetic rather than positional.** The operand runs 0 to 7 and nothing
else, **eight per mode page, once each**:

| sample | pages | opcode 22 | per page | operand values |
|---|---|---|---|---|
| `h525_config` | 135 | 1080 | 8 | 0 to 7, 135 of each |
| `h525_config_2` | 97 | 776 | 8 | 0 to 7, 97 of each |
| `h525_safemode_ahcm` | 44 | 348 | 8, one page 4 | 0 to 7 |

and the opcode 3 that follows draws at `y = 8 * operand`, 96 wide and 8 high, in all 1856. Eight
rows of eight pixels, 96 by 64, which is the 525's screen: **every picture in both user configs is
exactly 96 by 64**, four of them in one and five in the other, and a page draws all eight of its
strips from one of them.

Why a full screen image is drawn as eight strips at all is **not established**. The obvious guess is
that the operand marks which menu row the strip is, so that a key press can be attributed to it,
which would make it arch 9's equivalent of arch 12's touch hit map. Nothing here tests that, and no
arch 9 firmware routine has been traced to opcode 22.

### A monochrome row is padded to a whole byte

Section 62 read arch 9's kind 2 picture as one bit a pixel and sized it `stride * rows / 8`. It is
`ceil(stride / 8) * rows`: a row starts on a byte boundary.

The two agree for every picture in both user configs, because all nine of them are 96 pixels wide
and 96 is a multiple of 8. The safe mode container's bank opens with a **19 pixel** one, and there
the difference is 23 bytes against 30, so the old rule desynchronised on the second picture and the
whole bank of 1616 bytes stayed unclaimed.

Under the corrected rule the bank walks and lands **exactly on the trailer**, which is the same
closure the bank walk uses everywhere else:

| | kind | pixels | bytes |
|---|---|---|---|
| 1 | 2 | 19 x 10 | 35 |
| 2 | 2 | 96 x 64 | 773 |
| 3 | 2 | 96 x 64 | 773 |
| 4 | 2 | 18 x 10 | 35 |

Two full screens and two small ones, 1616 bytes, ending on the byte the trailer starts at.

### What moved

| | before | after |
|---|---|---|
| `h525_safemode_ahcm` accounted | 13391 of 15342, 87.3% | 15059 of 15342, 98.2% |
| its reachable programs | 48 | 49 |
| font sets its strings use | 0 and 3 | 0, 1, 2 and 3 |
| corpus inline string codes | 58068 | 58083 |
| corpus screen programs | 21551 | 21552 |

The font line is worth stating separately, because it is an independent structure agreeing:
section 78 read this container's font sets as four, starting at code 32, 32, 72 and 32. Two of them
were used by nothing at all under the old reading. The program the eleven byte width lost is the one
that selects them, and its strings are "Nothing to do" in font 1 and "OK" in font 2, both of which
resolve, in ASCII, against the codes those sets carry.

Neither user config moves by a byte in the accounting. The corrections are visible in the emitter
instead, where the arch 9 framed share rises from 61.0 to 62.4 percent on `h525_config`: an opcode
byte that used to be carried inside opcode 22's operands is a framed opcode now.

### What is left, and why it is not claimed

283 bytes of `h525_safemode_ahcm`, in four runs, and **no pointer anywhere names any of them**. A
`u24` scan of the whole container finds nothing, and neither does a search of the 525's internal
program flash or either 64 KiB external flash read.

| where | bytes | what it decodes as |
|---|---|---|
| `0x1A10D` | 26 | a screen program: two row draws, then a jump that is claimed |
| `0x1A12B` | 26 | the same, drawing the other small picture |
| `0x1A170` | 108 | 36 action list instructions, every opcode with a reading |
| `0x1A2EB` | 123 | 41 of them, likewise, running up to the first section pointer |

The two screen runs sit inside a switch's case blocks and are not reached by it: the switch at
`0x1A100` tests state variable 11 and sends 0 to `0x1A127` and 1 to `0x1A145`, and those are the
**jumps at the end** of each block rather than the drawing code in front of them. Both jumps go to
the same terminator. So under this reading the container carries two icon draws that cannot execute.

They are left unclaimed on purpose. Claiming a run because it decodes would be inferring a structure
from its contents rather than from the byte that states it, which is the mistake this project has
recorded three times, and dead code in one container is not a format fact. What would settle it is
an arch 9 firmware trace of the switch handler, which nobody has read yet.

### Where it lands

* `docs/config-format.md`, base slot 11's opcode table and the picture header.
* `packages/codec/src/screen.ts` and `src/harmony/gspm.py`, both widths, in both languages, with
  the golden vectors regenerated so the two still agree.
* `packages/codec/test/screen.test.ts` and `tests/test_interpreter.py`, the row structure per page,
  the calibration that no other width produces it, and the safe mode container as the sample that
  separates one from eleven.


## 86. A config states its devices and its activities, and a state variable is a machine

The application has to show a user their devices and their activities before it can let them edit
anything, and until now nothing here could produce either list. Both are stated rather than
inferred, and finding out which fields state them also decoded the last undecoded record in base
slot 13.

**No brand or model out of a contributor's config is quoted here.** The generic role words the
generator emits, `TV`, `Receiver`, `PowerOnDelay`, `CurrentActivityState`, are structure rather than
inventory and appear freely; the one brand anywhere in this repository is from the owner's own
deliberate sync, section 58, where the device was picked arbitrarily to make the experiment. Every
number below is a count.

### A level 1 name ends in the number of values its variable takes

Section 77 read base slot 0 as a list of named nodes and established that a level 1 node's index is
a base slot 13 state variable. The name itself was left alone. It is three parts,
`<label>_<qualifier>_<values>`, and the last of them is the variable's own range:

**`values` is the record's `u16` at +0x02 plus one, in 250 of 250 named variables**, across arch 8,
9, 12 and 14. That settles a field section 60 recorded as "unexplained, not the count and not an
index into it": it is the **highest value** the variable takes.

The qualifier is a Logitech device identifier on the two arch 14 configs, six digits or more, and a
small number on the older generators. It is never stored in the container as a number, which is
consistent with base slot 0 being host side, section 81.

### The eight byte values are transitions

Section 60 read the record's length as `7 + 8 * count` and said the values were not decoded, the
only invariant being a zero first byte. They are transitions:

```
+0x00  u8   zero, in all 551 of them, the same spare byte the section table carries
+0x01  i16  from, or a negative sentinel
+0x03  i16  to, or a negative sentinel
+0x05  u16  operand   the three bytes are one action list instruction
+0x07  u8   opcode
```

Four checks, all corpus wide and none of them arranged by the reading:

* every instruction has a reading in `actions.ts`, 551 of 551, and 439 of them are opcode `0x7F`,
  which names a base slot 10 action list **by index**. Every one of those indices exists.
* no `from` or `to` names a value the variable cannot take: every non negative one is inside `0` to
  the record's highest value.
* the sentinels are `-2`, in both fields, and `-3` in `from`. There is no third.
* a record either carries no transitions at all, 164 of them, or **covers every value of its
  variable the same number of times**: once in 83 records, twice in two and four times in one. So
  `count` counts transitions rather than values, and it is a multiple of `second + 1`.

The last of those is what ties the values to the header. A list that happened to sit after a header
would not cover exactly `0` to `second` with nothing missing and nothing extra, 86 times.

### The activities are counted by one variable, and the devices are the infrared groups

**Every container in the corpus that has a name tree names exactly one `CurrentActivityState`**, in
that spelling, qualified as `CurrentActivityState_0`. Its highest value is the number of activities:
value 0 is no activity running and the rest are the activities themselves.

**A device is an infrared group.** Base slot 5's groups partition the database, 8 to 164 codes each
and occasionally none, and two independent things say a group is one device: on the two arch 14
configs the number of distinct device identifiers in the state variable names equals the number of
groups, 4 and 6, and the calibration below.

| sample | named variables | activities | devices |
|---|---|---|---|
| `one_spare_before_sync` | 7 | 1 | 1 |
| `one_spare_after_sync` | 5 | 1 | 1 |
| `one_config` | 12 | 8 | 5 |
| `one_config_unprogrammed` | 7 | 1 | 1 |
| `h600_config` | 41 | 3 | 4 |
| `h700_config` | 60 | 5 | 6 |
| `arch8_config_a` to `_d` | 7 to 13 | 1 to 3 | 3 to 7 |
| `h525_config` | 8 | 3 | 4 |
| `h525_safemode_ahcm` | 1 | 0 | none |

**The calibration is the deliberate pair of section 58**, which is why that experiment was worth
doing: `one_spare_after_sync` was compiled by Logitech's own service on 6 August 2026 for exactly
**one device and one activity**, chosen that day and written down before the remote was read. It
reports one and one. The other end is the arch 9 safe mode container, which drives nothing: one
named variable, the activity state, highest value zero.

The gate's other question, what would falsify this, has a cheap answer: a config built for a known
number of devices and activities that reports a different pair. That is one sync away whenever a
remote and the service are both to hand.

### A second measurement, which agrees on the count and not on the numbering

The action list language writes a state variable with opcode `0x80 | n`, so the writes to the
activity variable can be counted directly. Every value written is inside the variable's range, in
all fourteen containers, and **the number of distinct values written is the variable's highest
value** in the twelve that have any activities at all:

| highest value | distinct values written |
|---|---|
| 1 | 1 |
| 3 | 3 |
| 5 | 5 |
| 8 | 8 |
| 0, the arch 9 safe mode container | 1 |

The values are `0` upwards with one exception, `one_config`, which writes 0 to 6 and 8 and never 7.
So the count agrees with the reading twice over, and **which value means "no activity" does not**:
either 0 is the idle state and the writes are one per activity starting at 0, or the top value is,
and neither the safe mode container nor the deliberate pair separates them. Left open rather than
guessed.

### What it does not read

The activities have no names anywhere in base slot 0. A device's name is in the label of its
variables, and a device with no state variables has no name at all, which is why the identifier
count matches the group count on arch 14 and the label count does not match it elsewhere. Where an
activity's name is drawn from is open; the obvious place to look is the text a mode page's screen
program draws.

The `u16` at +0x00 of a record is at most the highest value in all 735 records and zero in most, so
it reads as an initial value. Nothing has been traced to it and it is marked unconfirmed.

### Where it lands

* `docs/config-format.md`, base slots 0 and 13.
* `packages/codec/src/sections.ts`, the decoded transition, and `src/inventory.ts`, which is the
  application's view: `stateVariables`, `activityCount`, `deviceCount`, `deviceIds`.
* `packages/codec/src/emit.ts` frames the transitions now rather than carrying them, which is what
  moves the arch 14 framed share by half a point.
* `packages/codec/test/inventory.test.ts`, counts and shapes only, and `src/harmony/gspm.py`'s
  docstring, since the research library reads the same record.


## 87. The wrapper states what we were deriving, and a remote says which image is running

This section came out of reading Logitech's own file format classes, the last of the digs into the
classic client. The expectation was confirmation of things already known, and most of it is exactly
that. What was not expected is that **three separate things this project derives are stated
outright in files it has held since the first week**, and that one of them opens a question nobody
here had thought to ask.

Two of the three corrections below are the good kind, where the wrong rule produced the right
answer, and one of them is a rule this project had never applied at all.

### The split is structural, and both declarations are optional

Section 14 says config files are "an XML header, a two byte `\r\n`, then the container", and that
`src/harmony/ezfile.py` uses the declared length "in preference to searching for a magic". Both
halves are true of the corpus and neither is the rule.

The rule is that the header ends at the line carrying `</INFORMATION>`, and the payload is
everything after that line's terminator. `BINARYDATASIZE` is a **check** on that split, not the
definition of it, and so is `CHECKSUM`. Three consequences, each with a sample:

* **A file with no header at all is legal.** A reader that finds no XML on the first line treats
  the whole file as payload. `Region_3.EZHex` in the Harmony 700 package is exactly that: 7115
  bytes beginning `GSPM`, no XML anywhere. Our reader got it right by searching for a container
  cookie, which is a guess that happened to land on offset zero.
* **A file that declares neither length nor checksum is legal**, and a missing one passes rather
  than fails. Every firmware wrapper in the corpus is one. Our reader reported the absence as a
  failed check, which conflates "this file does not say" with "this file is wrong".
* **CR LF is not required.** The `.hfw` firmware wrappers end their first line CR LF and every
  other line with a bare LF, 79 of them. A split computed by counting header lines and assuming
  two byte terminators is wrong by one byte per line on those files; a split taken from the
  terminator itself is not. The consuming reader counts the difference explicitly, which is how
  the question became visible.

`parse_ezhex` now computes both splits and records whether they agree. **They agree on all ten
configs**, across four architectures, four container cookies and three format versions. That is
worth having as a check rather than a coincidence: one derivation counts backwards from the end of
the file and the other reads forwards from the header's own terminator, and they have no reason to
land on the same byte unless both are right.

The checksum reading is confirmed exactly as recorded, an XOR of every payload byte seeded `0x69`,
with one detail added: the consuming reader parses the declared value as a signed 16 bit number and
then narrows it to a byte, so a checksum of `0x80` upwards may legitimately be written negative. No
sample does. A reader that matched digits only, as both of ours did, would have failed silently on
the first one that did.

### The compatibility gate compares six fields, not four

`INTENDEDVERSION` was recorded here as `PROTOCOL`, `SKIN`, `FLASH` and `BOARD`. The comparison is
over six: those four plus **`SOFTWARETYPE`** and **`ARCHITECTURE`**. Three rules go with it, and
each one changes what a match means:

* **An absent or empty field matches anything.** That is not a quirk, it is how a file offers a
  fallback: an entry whose `<VERSION>` is empty matches every remote, and the config headers here
  use exactly that to attach a "not compatible with your remote" message to everything the entries
  above it did not catch.
* **A list of versions is a disjunction.** Any one matching is a match.
* **`BOARD` is normalised before comparison**, and only on the file's side: a two part revision
  such as `0.5` is extended to `0.5.0`, and a value with no separator at all is run through a
  legacy conversion. So a file and a remote can state the same board differently and still match.

Every config in the corpus declares `SOFTWARETYPE` 0 and none declares an `ARCHITECTURE`, which is
why a four field reading survived: one of the two missing fields is constant and the other is
absent, and absent means match. One arch 8 config also carries a `SOFTWARE` element, which looks
like a version gate and is **not** one of the six, so it is never compared.

### `SOFTWARETYPE` names which of the remote's four images is running

The One and 700 firmware packages carry an `INTENDED` list of versions they may be applied to and a
`NOTINTENDED` list they may not, and Logitech left a comment on every entry. Section 7 already used
those comments for the architecture codenames. It also recorded the software types as
"0 = normal, 2 = Test mode, 3 = Boot mode", and **the 2 is wrong**: the entries are<!--superseded-->

| value | the package's own comment |
|---|---|
| 0 and 4 | "must be in application mode or Safe mode", both accepted |
| 1 | "Test mode", refused |
| 3 | "Boot mode", refused |

**Confirmed a second time, from a different place in the client**, which is worth having because
the two do not depend on each other: it carries the five names against the same numbers, 0
APPLICATION, 1 TEST, 2 MINIMAL, 3 BOOTLOADER, 4 SAFEMODE. So there is a fifth type no package
mentions, and the value section 7 wrongly attributed to Test mode is the one that means minimal.

So a remote has four firmware personalities and the file says which ones it is for. That leaves
which of 0 and 4 is which, and the images settle it without any hardware.

**Field 4's low nibble is the software type.** `docs/usb-protocol.md` had it as "a compiled in
zero" and `tests/test_usb_firmware.py` asserted that it was undetermined, on the evidence that all
four application images return zero from that accessor. The safe mode image of the same remote
returns 4:

| accessor | 600 application | 600 safe mode | One application | One safe mode |
|---|---|---|---|---|
| firmware version | `0x02` | `0x02` | `0x34` | `0x34` |
| **software type** | `0x00` | **`0x04`** | `0x00` | **`0x04`** |
| skin | `0x47` | `0x47` | `0x36` | `0x36` |
| field 6's constant | `0x0C` | `0x0C` | `0x0C` | `0x0C` |
| architecture | `0x0E` | `0x0E` | `0x0C` | `0x0C` |

Two remotes, two architectures, five accessors each, and **exactly one of the five differs between
a remote's two images**. That is what makes it an identification rather than a remark about two
numbers: if the run had been found by pattern matching, the other four would not line up.

Every user config declares 0, and a user config is written to a remote running its application, so
**0 is application mode and 4 is safe mode**. The images agree with the package's comment rather
than being read through it.

Where the byte goes, from the 600's version block builder at `0x13952`:

```
CALL <software type>      -> 0x0D25
CALL <architecture>       -> 0x0D26
SWAPF 0x0D26,W            ; architecture into the high nibble
ANDLW 0xF0
IORWF 0x0D25,W            ; software type into the low one
MOVWF 0x0D27              ; field 4
```

The One does the same at `0x269A6`. Both bench remotes reported a zero low nibble because both were
running their application.

**The prediction, written down before anyone tries it**: a Harmony 600 in safe mode answers field 4
as `0xE4` and a Harmony One as `0xC4`. That is worth having because it gives the application a way
to know a remote is not in its normal state, which a write path needs and currently lacks. It is
also the first thing here that would be read differently depending on how the remote was started.

### The bootloader checks two keys at power on, and we cannot say which keys

Asked which combination puts a remote into safe mode, which the prediction above needs if anyone
ever wants to test it. The client does not know: it writes safe mode firmware and never tells a
user how to get there. The bootloader does, and it is only 4 KiB.

The first 4 KiB of internal program memory scans the keypad before anything else and compares the
code it gets against **two literals**, then falls back on a check of the image at `0x1000`:

| | Harmony One, arch 12 | Harmony 600, arch 14 |
|---|---|---|
| stay in the bootloader, status 6 | `0x0E` | `0x14` |
| transfer to the image at `0x1000` | `0x1E` | `0x2C` |
| otherwise, if that image is present | transfer to `0x0100A` | transfer to `0x0100A` |
| and if it is not, status 9 | | |

Two architectures, one design, down to the status codes. The fallback check is worth naming
because it is weaker than it looks: it reads `0x001008` and compares `0x48` then `0x47`, which is
the `48 47` magic at offset 8 of an image header, section 4. So the bootloader asks whether an
image is **present**, not whether it is intact, and the checksum each image carries is verified by
something else or by nobody.

**Which physical keys carry codes `0x1E` and `0x2C` is not answered here, and cannot be.** That is
section 48: a remote on USB never runs its keypad handler, arch 12 yields nothing at all because
sixteen buttons share one sense line, and arch 14 yields the column only. The one thing the codes
do is survive that reading: `(code - 1) mod 4` puts both of the 600's boot keys in the **same
column**, ten rows and four rows down a 14 by 4 matrix. Two keys in one column is what a keypad
looks like; two codes that decoded to impossible positions would have meant the namespace was
wrong.

So the practical answer is a negative one, and it is worth stating plainly: **this project cannot
tell someone which buttons to hold**, and finding out by trying combinations on an irreplaceable
remote is not a good trade for confirming a number that nothing depends on. The prediction is
recorded so that a remote which ends up in safe mode by other means, most likely an interrupted
firmware update, can be recognised rather than induced.

One thing this does not settle: whether the image at `0x1000` stays and answers USB, or hands off
to the application at `0x9000` and only stays when it cannot. It must do the second in the normal
case, because both bench remotes report software type 0 rather than 4, and that image reports 4.
Its own decision has not been read.

### An arch 12 package states its own split

Section 3 records that the One's `Region_2.EZUpgrade` decodes to 68952 bytes that split into 8902
for the safe mode config and 60050 for the application code, and says "the split is discoverable
from the data itself: the GSPM header's `end_addr` field marks where the config ends". True, and
the file states it directly: those are two `<PHASE>` elements, typed `Configuration_Static` and
`Firmware_Main`, each with its own `<DATAS>` block. Our reader concatenated every `<DATA>` element
in the file and then recovered the boundary from the container header.

The two routes agree to the byte, which is why this is a closure rather than only a correction:

| phase | its own bytes | recomputed from the container header |
|---|---|---|
| `Configuration_Static` | 8902 | 8902 |
| `Firmware_Main` | 60050 | 60050 |

Arch 14 keeps them in separate regions instead, as section 3 says, and the 700 package's single
phase is `Firmware_Main` at 76672 bytes. A `<DATA>` element carries 32 bytes and the last one of a
phase carries the remainder, 6 bytes and 18 bytes in the One's two phases.

`ezfile.read_phases` returns them separately now. `split_arch12_region2` stays, because it works on
a decoded payload where the phases are gone, and because two routes agreeing is worth a test.

### The arch 14 flash may be a quarter of the size this project records

The `FLASH` field is the flash chip's JEDEC id, and section 13 records that it is read in a
different order on the two architectures: manufacturer then device on arch 12's parallel part,
capacity then manufacturer on arch 14's SPI one. Which makes the corpus say something odd.

| file | `FLASH` |
|---|---|
| both Harmony 700 configs | `0x15:0x1C` |
| the Harmony 600 config, and the live 600 over USB | `0x15:0x1C` |
| the Harmony 700 **firmware package** | `0x14:0x1C` |

`0x1C` is EON. A JEDEC SPI capacity byte is a power of two, so `0x15` is 2 MiB and `0x14` is 1 MiB,
and the family therefore has at least two capacities with the firmware package aimed at the smaller
one. Two further routes agree that the bench 600 holds **2 MiB**: the part number this document
already records for it, an EON F16, is a 16 Mbit device, which is 2 MiB; and Logitech's client has
exactly two arch 14 flash geometries, 16 and 32 blocks of 64 KiB, which is 1 MiB and 2 MiB, with no
4 MiB entry at all.

Against that, one route says 4 MiB: concordance's architecture table, which gives the arch 14 config
region as 3904 KiB from `0x030000`, ending exactly at `0x400000`. `docs/memory-map-600.md` and
`docs/memory-map-700.md` take their "4 MiB SPI" from it. That is the same table that is wrong about
firmware on this architecture, `reference/concordance-notes.md`, so it is the weakest of the four
and the other three do not depend on each other.

**Unresolved, and one read settles it.** The 600's user config starts at `0x030000`. Read sixteen
bytes at `0x230000`, which is that address plus 2 MiB. A 2 MiB part ignores the high address bit and
returns the config's own first bytes, `GSPM`; a 4 MiB part returns whatever is really there, which
at that address is erased. Seeing `GSPM` proves 2 MiB. Nothing here is changed on the strength of
the argument alone, because the numbers derived from the 4 MiB figure are all upper bounds on a
region and none of them is load bearing for a read path. It matters for a write path, which is why
it is written down now rather than when a write is attempted.

### What did not need correcting

Recorded because a dig that only reports its surprises overstates them. The checksum seed and
algorithm, the `.hfw` being a ZIP of regions, `<DATA>` elements being plain hex, `EZHex` and `EZUp`
differing by payload placement rather than by extension, the architecture codenames of section 7,
and the whole of `IntelHex32File`, which is a textbook Intel HEX reader with `0xFF` fill and no
Harmony specific behaviour at all. Nothing in the corpus is an Intel HEX file; the class is there
for a path these remotes do not use.

### Where it lands

* `docs/config-format.md`, the wrapper section, rewritten around the structural split.
* `src/harmony/ezfile.py` and `packages/codec/src/ezhex.ts`: both splits computed and compared,
  absent declarations no longer failures, a signed checksum accepted, six intended version fields,
  and `read_phases` on the Python side.
* `tests/test_ezfile.py`, `packages/codec/test/ezhex.test.ts`, and
  `tests/test_usb_firmware.py`, where the software type replaces the assertion that the nibble was
  undetermined.
* `docs/usb-protocol.md` and section 7 above, both corrected in place.


## 88. Each firmware bounds a flash address at its own flash size, and they differ

Section 87 left the arch 14 flash size open at 2 MiB by three routes against 4 MiB by concordance's
architecture table, and named the read that would settle it: sixteen bytes at `0x230000` on the 600,
which on a 2 MiB part would alias to the config's own first bytes.

**The read was refused before it reached the wire, and the refusal is the answer.**

### What the remote actually did

A Harmony 600 on the bench, 9 August 2026, read only. `GET_VERSION` first as the go/no-go, which
returned `02 11 1c 15 e0 47 0c 02 00 00 02 02`, byte for byte what this document already records,
and its field 4 of `0xE0` is section 87's software type reading confirmed on a live device: an
architecture 14 remote running its application.

| address | result |
|---|---|
| `0x030000` | `47 53 50 4d ...`, the config's `GSPM` cookie |
| `0x130000` | erased, and **different** from `0x030000` |
| `0x1F0000` | erased, and answered |
| `0x230000` | refused by our own library, because the firmware's validator rejects `0x23` |

`0x130000` is the calibration case and it is the one that matters most: a 1 MiB part would alias
there, and it does not, so the method can tell aliasing from a distinct address. `0x1F0000`
answering fixes the top of the reachable range just under `0x200000`.

### The two validators disagree, and each matches its own part

The bound is a literal in each firmware's address validator. Arch 14's was already pinned at
`0x13DFE` in the 700 image, with the bound `0x20`. Arch 12's had never been located here; this
project had read one validator and applied it to both architectures. It is at `0x2637A` in the One's
image and builds a different literal:

```
263b0: 40 0e       MOVLW 0x40
263b2: 00 5c       SUBWF 0x00,W      ; the top address byte
263bc: 13 e2       BC 0x263e4        ; at or above 0x40, reject
```

**Arch 9 makes it three, and it is a window rather than a ceiling.** A Harmony 525 was on the
bench too, and its validator at `0x02E30` compares against `0x80` and then against `0x88`, refusing
below the first and at or above the second. It needs a floor because its serial flash is addressed
a megabyte up, which section 76 measured on hardware and could not explain from any code.

| architecture | the window | span | the part |
|---|---|---|---|
| 9, Harmony 525 | `0x80` to `0x88` | 512 KiB | 25F040 |
| 12, Harmony One | below `0x40` | 4 MiB | Atmel AT49BV322A, 32 Mbit |
| 14, Harmony 600 | below `0x20` | 2 MiB | EON F16, 16 Mbit |

**Each window is exactly the capacity of that model's flash part.** That is what makes this a
measurement rather than a protocol detail: a single firmware refusing addresses above its flash
would only show that somebody wrote a constant, and three whose constants track three different
chips shows what the constant is for.

It also settles arch 9's window from the other direction. `ARCH9_FLASH_TOP_MIN` and `MAX` were
measured on a live 525 the day before, by trying addresses until one answered, and had no firmware
behind them. They have one now, and the two agree exactly.

So the arch 14 external flash is **2 MiB**, and the question section 87 left open is closed by the
firmware, which is this project's authoritative source. The three routes that already said 2 MiB
were the `FLASH` field's capacity byte, the part number, and the vendor client's block tables. The
one route that said 4 MiB was concordance's architecture table, and it is not merely unsupported
now: the addresses it claims as config region above `0x200000` are addresses an arch 14 remote
refuses.

### The correction, and why it never bit

`validateRegionByte` used `0x20` for both bench architectures. On arch 12 that refused every address
from `0x200000` to `0x400000`, which is the upper half of a Harmony One's flash. Nothing noticed
because the largest One config in the corpus is 1.6 MB and ends below `0x1D8000`, so no read this
project has ever done wanted the range it was refusing.

The table is `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts`, and an architecture that is
not in it is refused rather than given a neighbour's bound. That is the same rule the erase block
table follows and for the same reason: this is the second time a constant read from one architecture
has been quietly applied to another, after section 87's font header, and the fix in both cases is a
table with a hole in it rather than a default.

**The write rails do not move.** `WRITABLE_CEILING` for arch 12 is `0x3D0000`, below `0x400000`, so
it stays the tighter of the two and the loosened read bound does not reach a write path.

### The prediction, recorded before the measurement

Written down here and committed before a Harmony One was connected, because a confirmation of a
number nobody committed to in advance is worth much less:

* a Harmony One **answers** a `READ_FLASH` at `0x200000`, which is the address the 600 refuses, and
  returns erased bytes because a One's config ends far below it
* a Harmony One **refuses** `0x400000`, in the library and in the device
* the same two addresses on the 600 behave the other way round at `0x200000`

That is one address behaving differently on two remotes, predicted from two disassembled validators.

### The measurement, and it found more than it was for

Both bench remotes attached at once, 9 August 2026, read only. Every read below went through
`packages/usb`, and each one is preceded by a `GET_VERSION` for a reason given under the next
heading.

| address | Harmony One, arch 12 | Harmony 600, arch 14 |
|---|---|---|
| `0x200000` | **answers**, erased | **silent**, and awake: its version reply came back first |
| `0x3F0000` | answers, and not erased | refused before the wire |
| `0x400000` | refused before the wire | refused before the wire |

One address, two remotes, opposite outcomes, predicted from two disassembled validators and
committed before either remote was connected. `0x400000` is our own refusal rather than a device
measurement, and that is what it should be: the bound comes from the firmware and the library
enforces it before sending.

**The upper half of a Harmony One's flash had never been read, and the reason is the bug being
corrected.** `docs/memory-map-one.md` said "everything else is erased" of a region no read had ever
reached, because `validateRegionByte` refused it. What is up there:

| address | length | what |
|---|---|---|
| `0x3D0000` to `0x3DEA92` | 60050 | the **application firmware as stored**, version 3.4 |
| `0x3F0000` to `0x400000` | 64 KiB | `00 FF` repeating, unidentified |

The first is byte identical to the 3.4 package's `Firmware_Main` phase over the 64 bytes compared,
carries the `48 47` header magic with version `0x34`, and is exactly 60050 bytes, the same length as
the copy at `0x020000`. The two copies are identical over the 16 bytes compared. **So a Harmony One
holds its application firmware twice**: the running copy at `0x020000`, which it executes in place,
and a stored copy at `0x3D0000`.

Not an alias of the low copy, which is worth stating because a flash that ignored an address bit
would fake exactly this. The offset would have to be `0x3B0000`, which would put the config's
`GSPM` at `0x040000` onto `0x3F0000`, and `0x3F0000` holds the repeating pattern instead.

**`WRITABLE_CEILING` is measured now.** It was adopted from the vendor client as an unconfirmed
constant, on the argument that it only makes the rail refuse more, with a note to confirm it from
the firmware before anything relied on the number. It is confirmed by something better than the
firmware: the remote itself. There really is an application firmware image at `0x3D0000` on a real
Harmony One, and a writer that trusted the nominal `0x400000` top would have erased it.

The last 64 KiB block is unexplained. It is one whole erase block, filled with alternating `0x00`
and `0xFF` except that the final two bytes are both `0x00`, and nothing here has looked for what
writes it.

### One sample, and the sample is the wrong one to generalise from

Recorded before the second Harmony One was connected, because the gap is in this section's own
reasoning rather than in the data.

The unit read above is the **spare**, identified from its container header rather than its label:
1326564 bytes, which is `one_spare_after_sync`. That unit had Logitech's own software write a
config to it on 7 August 2026, section 58. So a firmware copy found on it is a firmware copy on a
remote that recently had vendor software attached, and concluding "a Harmony One holds two copies"
from that is a step this section is not entitled to.

The programmed One has never had anything but reads from this project, and its previous owner last
touched it years ago. Three outcomes, all informative:

| what the second unit holds at `0x3D0000` | what it would mean |
|---|---|
| the same image, version `0x34` | a standing property of the model, and `WRITABLE_CEILING` is settled |
| erased | the sync wrote it, which would be a much larger finding about what a config sync does |
| an image of a **different** version than the one it runs | not a backup but a staging area, and the update mechanism is visible in it |

The third is the one nobody has ruled out, and it is the reason this is worth a second remote at
all. The same question applies to the `00 FF` block: a factory pattern or something the sync left.

**Prediction**: the same image, version `0x34`, and the same pattern block. That is the dull
outcome and it is what the client's separate declaration of a firmware region implies, since it
declares the region for every arch 12 remote rather than for a state a remote can be in.

**Measured the same day, and the dull outcome is what happened.** Both Harmony Ones were attached
at once and read through their device paths, then identified from what they hold rather than from
the path or the label: one config head matches `one_spare_after_sync` and the other matches the
programmed One's own `.EZHex`, byte for byte over 32 bytes.

| address | spare One | programmed One |
|---|---|---|
| `0x3D0000` | the 3.4 image, 64 of 64 bytes identical to the package | identical |
| `0x3E0000` | erased | erased |
| `0x3F0000` | `00 FF` repeating | identical |
| `0x3FFFF0` | ends `00 00` | identical |

The programmed One has had nothing but reads from this project and no vendor software near it. So
the stored firmware copy is a property of the model, the staging area reading is ruled out because
the stored copy is the version the remote runs, and **`WRITABLE_CEILING` now rests on two units**,
one of which has never been written to by anything in living memory.

### A remote that has been idle loses the first command sent to it

Found by nearly drawing the wrong conclusion from it. `read-window.ts` sent one command and got
nothing back from a Harmony One **at its own config base**, an address that certainly works. Three
reads of the same address immediately afterwards all returned the config. So the first command was
lost, not refused.

That matters here more than it would anywhere else, because this section's whole measurement is
"does this address answer". A silence with two possible causes proves nothing, and the silence at
`0x200000` on the 600 is the result the section rests on. So `read-window.ts` sends `GET_VERSION`
first and reports a failure there as the remote not answering, rather than as an empty window. The
600's version reply is in the log beside its silence, which is what makes that silence evidence.

Logitech's own config headers carry a message for this: "press any button on your Harmony to wake
it up". It was in the corpus the whole time, in the `CONFIGURATION` block section 87 read for other
reasons.

### Where it lands

* `packages/usb/src/protocol.ts`, the bound per architecture with no default.
* `packages/usb/test/protocol.test.ts` and `test/remote.test.ts`, where `0x200000` is now the
  address that separates the two rather than a constant both refuse.
* `docs/memory-map-600.md` and `docs/memory-map-700.md`, whose flash size was open and is not.
* `docs/memory-map-one.md`, which gains the two rows above and loses a sentence that described a
  region nothing had read.
* `packages/usb/bin/read-window.ts`, which is the tool this needed and did not have, with the
  version exchange it needed after the first measurement nearly went wrong.
* `docs/host-client.md`, where `WRITABLE_CEILING` moves out of the ledger of things believed on the
  client's word alone.


## 89. Arch 9 scans an 8 by 8 keypad over one sense line, and its configs bind fifty of it

The question that started this was whether the button census of section 48, run on the Harmony 600
on 7 August 2026, was still worth running on the Harmony 525. The answer is no, and arriving at it
produced the arch 9 keypad instead, out of the firmware and the configs rather than out of anybody's
fingers.

Section 48 left the reason to expect nothing as an upstream claim: arch 12 was measured to sense on
one shared line, and the section noted that this is "the pattern upstream describes for arch 9".
`h525_code` has been in the lab since 8 August 2026, so that no longer has to be borrowed.

### The shape, and how the search for it went wrong first

The arch 14 column reader is a run of `BTFSS port,bit ; RETLW n`. Scanning for it finds exactly one
run in each arch 14 image and none in the other two:

| image | runs of three or more | at |
|---|---|---|
| 700 2.8 | 1 | `0x19094`, four pairs, `PORTB` bits 4 to 7 returning 1 to 4 |
| 600 0.2 complete | 1 | `0x17730`, the same four pairs |
| One 3.4 | 0 | |
| 525 internal | 0 | |

**The first version of that scan reported zero everywhere, including the images that visibly have
one.** A pair is four bytes, and stepping by two lands on the `RETLW`, which breaks every run at
length one. Worth recording because the failure mode is the dangerous one: a search for a shape
that silently finds nothing is indistinguishable from the shape being absent, which is the exact
inference the scan was built to support.

What arch 9 has instead is visible in a census of its port accesses. `PORTB` takes 70 accesses of
which 64 are bit tests, and **58 of those test bit 7**, in two clusters of 29 at `0x00898` and
`0x06FA8`. The first is below `0x1000` and therefore in the bootloader, the second in the
application, so the same routine exists twice. One bit tested 58 times is not a column port.

### The scanner

Three routines, all in the application copy:

* `0x06FA4` binary searches one group of eight lines and returns 1 to 8, or 0 for none. It writes a
  mask through the helper at `0x0715A` and tests `PORTB,7` after each: `0x0F`, then `0x03` or
  `0xF0`, then the individual bits. Eight leaves, each a `RETLW`.
* `0x0701C` calls it, keeps the answer, then binary searches the second group through the helper at
  `0x07156` and adds `0x00`, `0x08`, `0x10`, `0x18`, `0x20`, `0x28`, `0x30` or `0x38` to it. So the
  scan code is **`group * 8 + column`, a linear index from 1 to 64**, with 0 for no key.
* `0x070FA` calls `0x070C4`, which calls the scanner, and debounces: it returns immediately when
  the fresh code equals the one already held, and on a change copies the fresh code to `0x2DE` and
  `0x3C8` before ORing the event type on elsewhere, `0x80` for a press and `0x40` for a release.

That is the same three part shape as the 600's `0x73D` and `0x73F` and the 700's `0x3A2` and
`0x3A4`, so **`0x2DE` is arch 9's bare scan code variable**, with `0x3C8` as its partner.

The two drive helpers differ in a way that explains where sixteen lines come from on a part whose
port has eight. `0x0715A` writes `LATD` and settles. `0x07156` writes `LATD`, strobes `LATE` bit 0
low and high, then sets `LATD` back to all ones: that is a write into an **external latch** clocked
by `LATE` bit 0. Eight lines driven directly and eight through the latch, sensed on one line.

| | arch 14, 600 and 700 | arch 12, One | arch 9, 525 |
|---|---|---|---|
| matrix | 14 by 4 | not established | 8 by 8 |
| scan code | `row * 4 + column`, 1 to 56 | not established | `group * 8 + column`, 1 to 64 |
| sense | four column lines, interrupt on change | one shared line | one line, `PORTB` bit 7 |
| drive | `PORTA`, `PORTD`, `PORTE` | not established | `LATD`, plus a latch on `LATE` bit 0 |
| scan code variable | `0x73D` / `0x3A2` | `0x2FB` or `0x202`, unsettled | `0x2DE` |

### The closure, from the configs

A mode record's entries are the same four bytes a key record is, section 52, so the bound scan
codes are extractable on every architecture including the one with no key table at the marker.
Taking every entry whose event bits are `0x80`:

| container | distinct press codes | highest |
|---|---|---|
| 525 user config | 50 | 57 |
| 525 second user config | 50 | 57 |
| 525 safe mode container | 46 | 57 |

**The two user configs bind exactly the same fifty codes**, and the safe mode container's forty six
are a subset of them. Now the part that is a closure rather than a description. The scanner can
produce any code from 1 to 64, and:

* **not one bound code is a multiple of eight**, in any of the three containers, so the group
  position that the mask `0x80` path reaches binds nothing at all;
* every bound code lies in the resulting lattice of eight groups of seven;
* and within that lattice the fifty are **contiguous from 1 to 57**, with only 58 to 63 above them.

Nothing was fitted. The lattice comes from a firmware read on 9 August 2026 and the codes come from
configs generated by Logitech's software years earlier. So arch 9's keypad is 8 by 8 with one column
unpopulated, and **the Harmony 525 has fifty matrix buttons**.

### Confirmed: the owner counted fifty

That last sentence was the falsifiable one, and it was **written down, committed and pushed before
anybody counted**, which is what makes the confirmation worth having. Commit `4a2079b` carries the
number; the owner then counted the buttons on the bench 525 and reported fifty.

It is a small measurement and it closes more than it looks. Fifty physical buttons against fifty
bound codes means **every matrix button on that remote is bound in its config and every bound code
has a button**, so there is no unbound key and no code left over. That is a stronger statement than
the 600's, where 54 codes cover 54 buttons but two matrix positions exist with neither, and it says
the lattice is not merely consistent with the codes but exactly filled by them.

Compare the 600, which reached the same place from the other direction: 54 codes contiguous 1 to 54
over 56 matrix positions, two unoccupied, confirmed by pressing all 54. The arch 9 version cost one
count instead of an evening at the keypad, because the firmware states the lattice and the config
states which of it is used. **Source: the physical remote, counted by the owner, 9 August 2026.**

### What this does not give

The row, or rather the group, and therefore which physical button a code belongs to. That is the
same ceiling section 48 hit, and arch 9 sits below arch 14 rather than beside it: with one sense
line a press is not even worth a column. The route that would finish it is a live read of `0x2DE`
while somebody presses keys, and the next section is the measurement that says arch 9 does not
offer one.

### Where it lands

* `docs/config-format.md`, the key table section, whose arch 9 row said no table is claimed after
  `CMAH` and now also says where arch 9 binds its keys and how many.
* `tests/test_keypad.py`, which gains the arch 9 lattice and the corpus check behind it.
* `packages/usb/bin/watch-keys.ts`, which now knows the 525's addresses, for whenever arch 9 gets a
  RAM read.


## 90. `READ_MISC` selector `0x07` answers on arch 9 and returns zero for every address

Live RAM of a running remote is readable over USB. That is section 48's instrument, it is the
capability `docs/roadmap.md` accepted in place of the deferred emulator, and it was derived on arch
14 and confirmed on arch 12. **It is not true on arch 9**, and this section is the measurement,
taken on the bench Harmony 525 on 9 August 2026.

### The negative that was nearly written down

`watch-keys.ts` was pointed at `0x2DE` and `0x3C8`, the previous section's variables, and every
button pressed on the 525 left both at 0. Section 48 has a ready made explanation for exactly that
result, since a 600 and a One both park in sync mode without running their keypad handler, so the
obvious write up was "arch 9 does the same, the ceiling is a property of the family".

The positive control refused it. Watching the five ports and the two latches instead reported every
one of them at 0, `PORTC` included, and `PORTC` carries the USB data lines of a part that is at
that moment answering USB commands. A port that reads zero while it is switching is not a reading,
it is an absence.

### The calibration

Four banks of the 525's own data memory against the same four on the 600, one byte per exchange:

| bank | Harmony 525, arch 9 | Harmony 600, arch 14 |
|---|---|---|
| `0x100` | 0 of 256 nonzero | 25 of 256 |
| `0x300` | 0 of 256 | 77 of 256 |
| `0x700` | 0 of 256 | 41 of 256 |
| `0xE00` | 0 of 256 | 159 of 256 |
| `0xF60`, the SFR page | 0 of 160 | 84 of 160 |

Plus `0x000` and `0x200` on the 525, also entirely zero, and `0x200` on a Harmony One at 107 of 128
nonzero. **1696 distinct addresses on the 525, spanning general purpose banks and the special
function register page, every one of them zero.**

The remote is not refusing. A refusal arrives as a wrong reply kind or a wrong selector and the
library raises on both; what comes back is a well formed `0xC2` misc reply echoing selector `0x07`
and carrying a byte, and the byte is always zero. Every other selector in the chain, `0x01`, `0x02`,
`0x06`, `0x08`, `0x09` and `0x0C`, answers the same way.

**It is not a selector numbering difference, and that was worth checking.** Logitech's own client
names selector 6 as the memory one and 7 as something else, where this project derived 7 from the
firmware and found 6 to be a different accessor. On an architecture where 7 answers nothing, 6 is
the obvious candidate. It is not: over a window that returns 77 live bytes of 160 on a Harmony 600
through selector 7, the 525 returns zero through **all nine** selectors tried, 0, 1, 2, 4, 5, 6, 7,
8 and 12. Arch 9 serves no misc read at all.

That check needed one correction on the way, and it is the same shape as the rest of this section.
The first sweep used `0x300` to `0x35F` and reported zero on the 525 and zero on the 600, which
looks like agreement and is worthless: that window is genuinely empty on both. A window has to be
shown live on the calibration remote before its emptiness anywhere else means anything.

So on arch 9 the selector is accepted and serviced by something that is not an indirect load. What
that something is has **not** been read: the arch 14 primitive is
`MOVFF x,FSR0L ; MOVFF y,FSR0H ; MOVFF INDF0,z` at `0x0CBF4`, and a search for that shape in
`h525_code` returns 67 sites, none of them in a USB command handler. Arch 9's `READ_MISC` body is
not located yet, so this section is a measurement and not yet a reading.

### What it costs

* **The button mapping experiment is unreachable on arch 9**, not merely capped as it is on arch 12
  and arch 14. There is no instrument, so there is no ceiling to hit.
* **`docs/usb-protocol.md`'s RAM read is an arch 12 and arch 14 fact**, and its own text left room
  for this: "Whether the upstream number is right for another architecture is not established." It
  is established now, in the negative, for the number and for the capability together.
* The emulator argument is per architecture. Decision 5 in `docs/roadmap.md` deferred the emulator
  partly on live RAM polling, and on arch 9 that leg is missing.

### The instrument this needed and did not have

`watch-keys.ts` reports **changes**. It therefore cannot distinguish a variable that never moves
from an address the remote does not serve, and from the host those two look identical: a log with
nothing after the resting line. That is how a wrong negative nearly reached a document, and it is
the same shape as section 88's lost first command, where a silence had two causes.

`packages/usb/bin/read-ram.ts` is the fix, the RAM analogue of `read-window.ts`: it prints content
rather than changes, and `--summary` answers the question a positive control actually asks, which
is whether a window contains anything at all. A watcher says what moved; only a reader says whether
anybody is home.

### Where it lands

* `docs/usb-protocol.md`, where the RAM read gains the architecture it holds on and the one it does
  not.
* `packages/usb/bin/read-ram.ts`, new, and `watch-keys.ts`, which now wakes the remote first so that
  the read seeding its resting value is not the command that gets lost.
* `tests/test_usb_firmware.py`, which pins the arch 14 primitive's shape and its absence from the
  arch 9 image, so that finding the arch 9 handler later has something to contradict.


## 91. Infrared learning is a command family the firmware brackets and a stream nobody has found

The last square of the client dig. `docs/host-client.md`'s rule is firmware first, and this section
is a clean example of what that buys and what it costs: the client describes the whole of infrared
learning, the firmware settles the half of it that is control flow, and the half that carries the
actual pulse data is **not located in any image here** and therefore stays client-sourced.

### What the firmware settles

`0x70` START_IRCAP is already in the dispatch table, taking no arguments and setting state 5. What
had not been read is what happens next, and the state machine says it plainly.

* **State 5 has its own command chain**, at `0x0C5D4` in the 700 image. It accepts exactly one
  command, `0x80`, and that sets the state variable to **6**. So `0x80` is the stop, and it is a
  command that only exists inside a learning session.
* **Any other command during a session aborts it.** The fall through at `0x0C5EE` clears the state
  variable to 0 and sets the error byte, so a host that sends anything else mid-learn does not get
  an error reply, it gets a session that quietly ended.
* **States 6 and 7 share one executor**, `0x0CB20`, reached from the main state chain at `0x0C720`
  where both cases point at it. It sets the state to 7, then emits two response bytes, `0xF0` and
  then `0x70`. That is the acknowledgement shape this document already records for WRITE_MISC,
  which replies `0xF0` then `0xA0`: a bare acknowledgement naming the command it acknowledges.
* The 600 0.2 image carries the same three instruction shape with its own addresses, setting its
  own state variable to 6 and its own error byte, so this is the architecture and not one build.

So the bracket is firmware fact: `0x70` opens, `0x80` closes, `0xF0` plus the command echoes the
close, and the states run 5, 6, 7.

### A negative that did not survive being checked

This section first said the following, and it is wrong in its inference rather than its facts, so
it is corrected here rather than deleted.

> No `0x90` is emitted by the response builder in either arch 14 image. Enumerating every
> `MOVLW k ; MOVWF f` pair in the 700 and listing what the response byte at `0x358` can hold gives
> eighteen distinct literals, of which the command shaped ones are `0x30`, `0x50`, `0x70`, `0xA0`,
> `0xD0` and `0xF0`, all echoes.

Every word of that is still true, and it establishes nothing. **The same scan finds no `0x60`
either**, and `0x60` is the code of `READ_FLASH`'s data response, which certainly exists and which
this project has driven thousands of times. A data response carries a **computed** length nibble,
so its code byte is assembled at run time out of `0x60` and a count and never appears as a literal
anywhere. A scan for literals therefore cannot see any data response, and using it to argue about
one is a category error.

It was caught by running the scan on the Harmony One to answer a follow up question and noticing
`0x60` missing from a list that had to contain it. Worth recording as a shape: **a search that can
only find one kind of thing proves nothing about a kind it cannot find**, and the way to notice is
to run it against something already known to be there.

### The receiver exists on every architecture, which is the real answer

Asking the question of the hardware instead settles it. Learning needs a capture, and a PIC18 does
that with a CCP module, whose mode is stated in the low nibble of its control register: `0100` to
`0111` are the four capture modes, `10xx` compare, `11xx` PWM. What each image writes:

| image | CCP1 | CCP2 |
|---|---|---|
| One 3.4, arch 12 | `0x0C` PWM at `0x2DA62` | `0x04` and `0x05` **capture**, at `0x2B46C`, `0x2B4D8`, `0x2041A` |
| 700 2.8, arch 14 | `0x0C` PWM at `0x1AFB4` | the same three, at `0x0904C`, `0x090B8`, `0x0941E` |
| 600 0.2, arch 14 | `0x0C` PWM at `0x196D8` | the same three, same addresses as the 700 |
| 525, arch 9 | `0x0C` PWM at `0x076B8` | the same three, at `0x05EEC`, `0x05F58`, `0x0141A` |

CCP1 in PWM is the carrier this project already read from the transmit side, section 32. **CCP2 in
capture on both edges is the receiver**, and it is configured in all four images including arch 9.
Modes `0x04` and `0x05` are every falling edge and every rising edge, which is exactly what
measuring an envelope and a gap alternately requires, and it matches the alternation the client's
reader expects.

There is a driver around it, read on the One: `0x2B46C` selects falling edge capture, clears the
CCP2 interrupt flag in `PIR2` and enables it in `PIE2`; `0x2B476` is the mirror that disables and
clears; and `0x2B47E` reads the capture register **twice into two different pairs and compares
them**, which is a glitch check on a value that can change under the read. `0x2B510` clears eight
state bytes and jumps into the starter, so it is the session initialiser.

So the capability is not in doubt on any architecture here.

### The samples do reach the host, and the firmware search cannot find how

The owner used this feature. With the classic software the remote was put into a learning mode, a
second remote was held against the back of it, a button was pressed, and **the client recognised
the received code immediately** and moved on to processing it. That is a first hand account of
observed behaviour, recorded here as such: it is not a measurement and it is not firmware, and it
is still much better evidence about what the system did than anything derivable from a client that
nobody has run.

It settles the question this section was holding open. The samples reach the host live, during the
session, which is exactly the model Logitech's own learning service implements. So a sender exists.

**And an exhaustive search of the response path does not contain it.** On both architectures:

* every state body in the machine emits its response codes as literals or as a code ORed with a
  computed length nibble, and the scan sees both forms. The One has 10 states and the 700 has 70.
  **Not one of them emits `0x90`**, on either architecture.
* the byte at a time sender has 32 callers on the One and every one of them lies inside the command
  response region, `0x26980` to `0x26D92`. None is in the capture driver.
* the response buffer's write pointer and its length counter are touched only inside the USB
  transport layer, `0x2003C` to `0x203BE`. The capture driver touches neither.
* the internal `0xFE` pages carry no separate learner: the One's configures no capture at all, and
  the 600's hits are its own application firmware at the same addresses.

Every one of those is a fact, and together they say a search from the response path backwards has
been run out. So **an assumption in that search is wrong** rather than the feature being absent.

### Two of the three candidates die on the client's transport layer

The owner's next remark killed the easiest one: he has learned codes on **all** of these remotes,
repeatedly, and the feature is called Learn Command in the classic software. So it is not a case of
reading the wrong firmware.

Reading the client's HID channel kills a second. It is one pipe in each direction with no report
ids, and the read side hands every report it gets straight to whichever service is listening. There
is no second endpoint the capture could be using, and this project's own descriptor work agrees:
**one interrupt IN endpoint, number 1**, `docs/usb-protocol.md`.

And it is genuinely unsolicited. The learning service calls something on every packet that looks
like a poll and is not: it only takes the next item off a queue the reader thread has already
filled, with a timeout, and sends nothing to the remote. So the remote pushes reports of its own
accord while a session is open, and no request is outstanding to carry them as a reply.

### Which says exactly where the sender has to be

If the reports arrive on endpoint 1 IN, the firmware has to fill **the same buffer every command
response uses**, whose descriptor is at `0x40C` and whose byte count at `0x40D` the response builder
increments once per appended byte. There is no other way out of the part.

`0x40D` is touched in four places, all inside the transport. `0x40C` is touched in nine, and
**eight are in the transport and one is not**: `0x2AF1A`, in a routine at `0x2AEF4` that gates on a
mode variable and clears the descriptor's bit 6. That is the only code in the image outside the USB
layer that touches the input endpoint's descriptor, which makes it the one place worth reading next.
Whether it is the learn sender or ordinary USB plumbing that happens to sit outside the region this
project drew around the transport is **not established**, and it should be read before it is
believed: this section has already retracted one conclusion drawn from a suggestive absence.

### What the client supplies, and it is unconfirmed

Restated in this project's own words, per rule 3. All of it belongs to `docs/host-client.md`'s
ledger and none of it enters `docs/config-format.md`.

A data report is: a code byte whose length nibble is **zero**, then a byte carrying two counters in
its nibbles, then big endian `u16` words, and **the byte count in the last byte of the report**.
That last part is the striking one, because every other command in this protocol declares its length
in the low nibble of byte 0, and here that nibble is zero and the real count lives at the far end of
the report. Word count is `(count - 2) / 2`.

The two counters are a sequence, 0 to 15 and expected to increment, and a **dropped counter**. A
change in the dropped counter means the remote lost samples, and the number lost is twice the
increase, so **samples are dropped in pairs**, which fits data that alternates between two kinds.
The client tolerates exactly one out of order report, holding it back until its partner arrives, and
gives up on the second.

The first three words of a session are **calibration, not data**: a last pulse on time, a first
pulse time, and a clock count. The carrier period is the gap between the two times divided by one
less than the clock count, in microseconds, and the frequency is a million over that. Section 32's
carrier finding is about the same quantity from the transmit side, where 38 kHz implies a stored
263, so the two are checkable against each other whenever a real session is captured.

After calibration the words alternate envelope and gap, and **the unit of an envelope word depends
on the architecture**: on the older ones it is a count of carrier cycles and has to be divided by
the frequency just measured, and on the newer ones it is already microseconds. A gap word is total
elapsed time rather than a duration, so the preceding envelope is subtracted from it. The
architecture split is at architecture id 2, which is below everything this project targets, so for
arch 8, 9, 12 and 14 the microsecond reading is the one that applies.

Finally, the session is bracketed on the host side by two configuration state changes, one before
and one after, and after the stop the client waits an architecture specific reboot delay before
carrying on. So **stopping a learn can restart the remote**, which is worth knowing before anyone
drives this.

### A second client, found the same day, and what two sources agree on

Added 9 August 2026. `Harmony Desktop.app` is a different application from the decompiled classic
client and from the MyHarmony one this project had checked, and its packet layouts are served per
model as ordinary files. It describes the same session, for the Harmony One by name, and the two
clients were written years apart by different means.

**Where they agree, believe it more.** The classic client said the session is bracketed by two
configuration state changes; this one gives the bytes, a restart command with a subcommand, an entry
point selecting start or stop learn, and a configuration type. Both agree the capture opens with
`0x70` and closes with `0x80`, which the firmware had already settled, and both terminate the read
on `0xF0 0x70`, which the firmware had also settled. So the bracket now has three independent
sources and the entry point values have one.

**Where they disagree is the useful part.** The classic client takes learn reports off a queue its
reader thread filled without sending anything, which reads as the remote pushing reports unsolicited
during the session. The Desktop one models the same bytes as a command's response stream: two
packets after the start, an unspecified number after the stop, ending at the acknowledgement. Both
put the samples on the one IN endpoint and end at the same terminator, so **they can be one wire
behaviour described from two heights**, and that would explain why no separate sender exists to be
found. But which it is decides what an implementation does, keep reading during the session or read
after the stop, and it is **not established**.<!--superseded-->

> **Settled by section 98, and in the classic client's favour.** The reports are pushed: the
> transport checks a toggle and two buffer status bytes on every pass and hands the endpoint
> whichever of two buffers at `0x0600` and `0x0642` is full, consulting no command at all. A host
> must keep reading during the session.

What it changes for the search: `0x2AF1A` is no longer the obvious next thing to read. The response<!--superseded-->
paths of the `0x70` and `0x80` handlers are, because both clients say the bytes come back the way
every other response does.

> Also wrong, section 98, and instructively. There is no response path to read, because the samples
> never pass through the response machinery: the firmware points the endpoint's buffer descriptor
> straight at the capture buffer. The search failed twice because both attempts assumed the bytes
> would be sent, and `START_IRCAP` names the buffers in the four addresses it clears.

**And the enter and leave commands are writes.** The restart command puts a remote into a mode, and
its entry points cover far more than learning: config updates, firmware updates and upgrades. It sits
behind `WRITES_ENABLED` in `packages/usb/src/rails.ts` when it is implemented, and no read path may
issue it. `docs/host-client.md` has the rest, marked client sourced.

### Where it lands

* `docs/usb-protocol.md`, the state machine and the two commands, from the firmware.
* `docs/host-client.md`, the packet layout, the counters, the carrier arithmetic and the reboot
  delay, in the ledger, marked unconfirmed.
* `tests/test_usb_firmware.py`, which pins the state 5 chain and the shared executor on both arch 14
  images, so the bracket cannot rot, and the capture mode selection on all four.
* `reference/superseded.md`, so the withdrawn inference cannot be restated.


## 92. The seven bytes below an infrared record's class byte are its carrier

The last unread field of a class 1 record, and the one a writer cannot do without. Section 42 read
the **widths** out of the firmware and left the values unnamed: from the record's real start the
loader reads a `u8`, then a `u24`, then a second `u24`, which is `+0x00` to `+0x06`, the seven bytes
that sit below the class byte at `+0x07`. Those two `u24` values are the infrared carrier, a period
and a fifty percent on time, in **nanoseconds**.

```
+0x00  u8   zero in all 3387 records here; what it selects is not established
+0x01  u24  carrier period, nanoseconds
+0x04  u24  carrier on time, nanoseconds, the period halved
+0x07  u8   class
+0x08  u24  the record's own start, which is where the loader reads from
+0x0B  u8   how many nine byte pointer groups follow
```

### Why it is the carrier and not some other pair of durations

Four things, and no single one of them would be enough.

**The halving.** The second value is `period >> 1` in every record of the corpus, exactly, to the
bit. That is a square wave at fifty percent duty, which is what an infrared carrier is and what
almost nothing else is.

**The frequencies.** Read as nanoseconds, `1e9 / period` lands on the frequencies consumer infrared
actually uses and on nothing else. Nine values across the corpus, the common ones being 38.0, 36.0,
37.9, 36.4, 36.2, 40.0 and 56.3 kHz. Under any other unit they are not carriers: as tenths of a
microsecond, which is what section 42 assumed, every record here would read as 380 Hz.

**The truncation, which is the closure.** A stored period is `floor(1e9 / f)` for a frequency in
whole hundreds of hertz. 40 kHz divides exactly and is stored as 25000. 38 kHz is 26315.79 and is
stored as 26315. 36 kHz is 27777.78 and is stored as 27777, which is 36001 Hz read back, and that
is the detail that makes the direction of the arithmetic checkable: the generator truncated rather
than rounding, so a writer that rounds emits 27778 and differs from Logitech by one byte per
device. The first version of the regression test asserted 27777 was 36 kHz to the hertz and failed,
which is how the truncation was noticed at all.

**The firmware's own arithmetic.** The class 1 arm at `0x17F48` on the Harmony 700, reached from the
record loader's dispatch at `0x17F32`, clamps the first `u24` at 256000 and, when the value no
longer fits in sixteen bits, divides it by four and sets the Timer 2 prescaler to four to match.
Both are period arithmetic. The clamp is a 3.9 kHz floor under the nanosecond reading and 39 Hz
under the tenths of a microsecond one, and the prescaler arm engages below 15.3 kHz, which is
exactly where a Timer 2 period register would need help. It then stores the two values as a `u16`
pair through `FSR0`, the second one two bytes above the first, which is a period and a duty side by
side.

### It agrees with a prediction made in section 12, which is the independent route

Section 12 derived the core clock from the software carrier modulator and tested it against a real
carrier: 38 kHz is a 26.3 us period, so the config would store 263, and `263 * 4 / 10` is 105
cycles, which at 4 MIPS is 26.25 us. The config stores **26315**, and 26315 divided by 100 is
263.15. So the number section 12 predicted from the transmit side is this field scaled from
nanoseconds to tenths of a microsecond, and a closure derived years apart in this document from two
different directions lands on the same value.

That does not settle where the division by 100 happens. The class 1 arm read here does not do it,
and the class 2 arm immediately above it at `0x18002` loads a literal 100 within eight instructions
of its own first read, so the scaling is somewhere in the path between this pair and the modulator's
`0x08E`. Not established, and not needed for a writer, which states the field in the unit the field
is in.

### Correction: the unit in section 42

Section 42 says the loader reads "a `u24` duration in units of 0.1 microseconds". The width is
right and the unit is wrong; it was inherited from section 12's prediction about the modulator's
input rather than measured on the field, and no value had been read out of the corpus at the time.
Corrected here rather than silently, per the house convention. Nothing else in section 42 depends
on it: the clamp, the prescaler and the storage are all described correctly.

### What it changes

The emitter frames the whole record header now, where it used to copy the eleven bytes in front of
the group count. One byte of a record is still unread, the zero at `+0x00`, and it is carried
rather than written as a zero, because asserting a value that is constant across the corpus would
turn a container that disagreed into a wrong round trip instead of a loud one.

For a writer this is the field that says what a device's codes are modulated at, and **it is per
record rather than per config**: a Harmony One config in the corpus carries 38 kHz for four of its
five infrared groups and 56.3 kHz inside the fifth, alongside 38 kHz, so a group is not a single
carrier either. Anything that learns a code has to state a carrier for it, and section 91 is where
the measurement of one would come from.

### A class 1 record can now be built from timings alone, which is the point of reading it

`irBuildBlock` and `irBuildRecord` in `packages/codec/src/ir.ts` take **no container**. They take a
carrier and a list of marks and spaces in microseconds, which is exactly what a learn session
produces and all it produces, and they return the bytes. Every class 1 record in the corpus,
across arch 8, arch 12 and arch 14, comes back byte for byte when its own carrier and pulses are
fed back through them.

That is worth stating plainly because of what it settles. Section 42 established that Logitech's
**server** chose the encoding class, and section 91 that the classic service which did it is the
discontinued one, which raised the question of whether learning a code is possible at all without
it. It is: a class 1 record is a raw duration list plus a carrier, nothing in it is a choice the way
a picture encoding is, and this codec can make one. What the server added was compression, matching
against its database, and a name. Losing it costs the compression, not the capability.

Two things this does not do, and neither is a detail. It does not place a record: `start` and the
block addresses are parameters, because a record's position is implied by everything around it, the
same rule section 55 states for pictures. And it does not measure a carrier, which is section 91's
open transport question. **Building the bytes was the part that could be settled without hardware,
and it is settled.**

## 93. The internal read cap is stricter than the hazard it was built for

**Written before measuring, and committed before the remote was touched**, which is the only reason
the numbers below are worth anything. `docs/host-client.md`'s Desktop client reads a unit's identity
block as a single 64 byte `READ_FLASH` from internal memory, and this project's library refuses that
read.

### Where the cap came from, and the arithmetic that was missed

`readInternalMemory` and `readFlash` both refuse an internal read of more than one chunk, 62 bytes,
because a read of that region restarted a remote five times. The measurements behind it are in the
code and they already say what the condition is:

| read | result |
|---|---|
| 63 bytes at `0x1000` | restarted, 3 of 3 |
| 63 bytes at `0x0040` | completed, then the remote died |
| 63 bytes at `0x0000` | fine, twice |
| **64 bytes at `0x1000`** | **fine, twice** |
| 124 bytes at `0x1000` | fine, twice |

A chunk carries 62 data bytes, one of the 63 the largest length nibble describes being the sequence
number. So 63 bytes is 62 plus a final chunk of **one**, and 64 is 62 plus **two**, and 124 is two
full chunks. The hazard is a final chunk of exactly one byte, which is `count % 62 == 1`, and the
cap that was written to avoid it refuses everything above 62 instead.

**64 bytes was already measured as safe when the cap was written.** The cap is not wrong, it is
coarse, and this project has been describing it as the shape of the hazard rather than as a bound
around it.

### The prediction

1. A 64 byte internal read on the spare Harmony One **succeeds and does not restart it**, at an
   offset other than zero, reproducing the client's own shape.
2. It returns 64 bytes, in two chunks.
3. The remote answers a config window against its own lab dump afterwards, unchanged.

* If all three hold, the refusal should become `count % FLASH_CHUNK_DATA == 1` rather than
  `count > FLASH_CHUNK_DATA`, and the reason attached to it should be the final chunk rather than
  the chunk count.
* *Left as written, because it is the committed prediction. It is also wrong, and section 94 says
  why within the day: the condition is an odd count, and this one would have let 65 through.*

**The address is deliberately not the identity block.** `0xFFF400` is what the client reads and it
holds the unit's serial GUIDs, which this repository does not publish and has no reason to read.
`0xFF` offset `0xE000` is the same page and the same transfer shape, and the client's own region map
calls it a PIC library.

### Measured

9 August 2026, on the spare Harmony One with both Ones attached at once. **The unit was identified
by what it holds, not by its port**: its config base reads back the bytes of `one_spare_after_sync`
where the other reads those of `one_config`, which is the only way to tell two Harmony Ones apart,
since they enumerate identically and report no serial number.

| read | bytes back | remote afterwards |
|---|---|---|
| page `0xFF`, offset `0xE000`, 64 bytes | 64 | answered `GET_VERSION` immediately |
| page `0xFF`, offset `0x1000`, 64 bytes | 64 | answered |
| page `0xFF`, offset `0x1000`, 124 bytes | 124 | answered |
| page `0xFE`, offset `0x1000`, 64 bytes | 64 | answered |

The 64 byte read at `0xE000` was run twice, in separate sessions. The config window at `0x040000`
was read before the first and after the last and was byte identical, so nothing here disturbed the
remote at all. **All three predictions hold.**

~~The refusal became `count % FLASH_CHUNK_DATA == 1` on the strength of this, as the measured~~<!--superseded-->
~~condition~~, and it is not. It is a curve through four data
points, and section 94 read the loop that same day: the fetch primitive can only read a word, the
loop subtracts two and exits on zero, so **any odd count never terminates**. 65 and 127 are odd and
are not `62n + 1`, so the rail installed here would have let them through. The refusal is an odd
count now.

### A confirmation nobody asked for

`GET_VERSION` field 8 is documented as the version of the image at page `0xFF` offset `0xE000`,
read by the firmware from program `0x01E007`, and the Harmony One reports `0x34`. The 64 byte read
above starts at `0xE000`, so its eighth byte is `0xE007`, and it is `0x34`. That accessor had been
derived from disassembly and checked against the value the remote reports; this is the first time
the byte has been read at the address directly.

The two bytes after it are `0x48 0x47`, and the client's own image header builder writes `0x4748` at
that position, so the region carries an image of the shape the client knows how to make. What the
region is for is still only the client's word, `docs/host-client.md`.

### What it does not settle

**Why a one byte final chunk restarts a remote**, which is unchanged: the refusal is narrower now
and it is still a workaround. Offset zero being exempt is unexplained too. Widening this on an
architecture nobody has tested is the thing not to do, and the arch 9 remote is the one that would
tempt somebody, since its internal memory sits at plain low addresses where every caller can reach
it.

## 94. An odd internal read count never terminates, and that is the whole restart

Section 93 measured the hazard and narrowed a rail around it. This reads the firmware and finds the
cause, which is neither the chunk count nor the final chunk's size: **an internal read of an odd
number of bytes puts the Harmony One in a loop that cannot end**.

### The loop

`0x26BC8` on the Harmony One, inside the `READ_FLASH` body's branch for an internal top address
byte. One pass:

```
26bc8: 04 00       CLRWDT              ; the watchdog is fed every pass
26bca..26bd2                           ; the 24 bit address into the primitive's arguments
26bd6: 85 ec 73 f1 CALL 0x2e70a        ; fetch
26bda: f3 cf 32 fd MOVFF PRODL,0xd32
26bde: f4 cf 33 fd MOVFF PRODH,0xd33
26be2..26bf2                           ; address += 2
26bf4..26bfc                           ; emit 0xd32 through the byte sender
26c00..26c08                           ; emit 0xd33
26c0c: 02 0e       MOVLW 0x02
26c10: 31 5f       SUBWF 0xd31,F       ; remaining -= 2
26c14: 31 51       MOVF 0xd31,W
26c16: 00 08       SUBLW 0x00          ; carry only when remaining == 0
26c18: d7 e3       BNC 0x26bc8         ; otherwise go round again
```

Three facts and they are enough.

**The fetch can only read a word.** `0x2E70A` sets `TBLPTR` and does `TBLRD*+` then `TBLRD*`,
returning two bytes in `PRODL` and `PRODH`. There is no single byte entry point. Its twin on arch 14
is `0x1B558`, structurally identical, and both are the only routines of that shape in their images.

**So the loop is committed to two bytes a pass**: it emits both, advances the address by two and
subtracts two.

**And the exit test is equality with zero**, not a signed comparison. From an odd count the
remaining value steps 1, 255, 253, 251 and back to 1, and never equals zero. The loop runs forever,
pushing bytes into the response buffer and walking the address through program memory, and
`CLRWDT` at the top means the watchdog will not break it either.

### Why the trigger looked like a final chunk of one byte

The length clamp at `0x0C9B2` on the 700, whose arch 12 twin fronts this loop, picks the largest
representable payload not exceeding what is left: 63, 31, 15, 7, or a literal 0 to 6. A payload
carries one sequence byte, so the data a chunk can hold is 62, 30, 14, 6, or 0 to 5. **Every one of
those is even except 1, 3 and 5**, which only occur when five or fewer bytes remain.

Since every large chunk removes an even number, the parity of the remaining count never changes. An
odd total is odd at the end. So:

| request | chunks | outcome |
|---|---|---|
| 62 | 62 | terminates |
| 63 | 62, 1 | **never terminates** |
| 64 | 62, 2 | terminates |
| 65 | 62, 3 | **never terminates** |
| 124 | 62, 62 | terminates |
| 125 | 62, 62, 1 | **never terminates** |
| 128 | 62, 62, 4 | terminates |

Every measurement this project has taken sits in that table, and the "final chunk of exactly one
byte" reading of section 93 was a description of the only odd tail the sizes anyone had tried
happened to produce. **63 and 125 are `62n + 1` and 65 and 127 are not**, so the rail section 93
installed would have let a remote hang.

### The rail

`packages/usb` refuses an odd count for an internal read, and the reason attached to it is now a
mechanism rather than a symptom. It is the third form of this refusal in one day and the first that
is derived rather than fitted: `count > 62` was a bound around the hazard, `count % 62 == 1` was a
curve fitted to four data points, and this is what the code does.

### What is still not explained

**`63` bytes at offset zero was recorded as fine, twice.** This reading says it should hang. Two
trials is thin, the observation is nearly a year old in project time and was taken while the
question was still "is it the chunk count", and the branch at `0x26BB2` that this body sits behind
tests the **top address byte** rather than the offset, so there is no offset zero case in the code
to appeal to. It should be re-measured before anyone builds on the exemption. It is not needed for
the rail, which refuses odd counts everywhere.

**Whether arch 14 and arch 9 share it** is untested on hardware. The word-only primitive exists on
arch 14 at `0x1B558`, so the shape is there. Nothing here justifies trying an odd read on a remote
to find out.

### The prediction this makes, and it is cheap

An internal read of **65** bytes should hang a Harmony One where 64 and 124 do not, and 65 is not
`62n + 1`. That is the experiment that separates this reading from section 93's, and it costs one
deliberate restart of the spare, of the kind that has recovered five times already.

### Performed, and it holds

9 August 2026, on the spare with the programmed One unplugged, the unit identified by its config
window matching `one_spare_after_sync` rather than by its port. Prediction committed first, in the
paragraph above.

| step | result |
|---|---|
| `GET_VERSION` | `34 05 c8 1f c0 36 0c 34 34 16 34 34` |
| control: 64 bytes at `0xFF` `+0x1000` | 64 bytes back, remote answering |
| **65 bytes at the same address** | **failed after 146 ms, and the remote stopped answering** |

**Confirmed from outside the software too**: the owner, watching the remote, reported that it reset.
That matters because the host side can only see silence, and silence has more than one cause.

It re-enumerated on its own at a **different device path**, which is what says it restarted rather
than merely stalled, and afterwards `GET_VERSION` matched, three flash windows read, the config
window was byte identical to the one taken before the experiment, and a 64 byte internal read
worked again. Disruption, not damage, exactly as the five earlier restarts.

So the separating case goes the way the firmware says: **65 hangs a remote and 64 does not**, and
`count % 62 == 1` would have permitted it. The rail is an odd count, and it is now derived from the
loop, confirmed against the loop's own prediction on hardware, and observed by two people.

### Offset zero, predicted before measuring

The one observation this reading cannot accommodate is the old note that **63 bytes at offset zero
was fine, twice**. Written down before the retest, in the same session, so the answer cannot be
fitted afterwards.

**The prediction is that it hangs**, like every other odd count. The body this loop sits in is
reached through a branch on the **top address byte**, `0x26BB2`, and there is no test of the offset
anywhere between that branch and the loop. Nothing in the code distinguishes offset zero, so if the
loop is entered at all the counter behaves the same way.

If it does **not** hang, the reading is incomplete rather than wrong, and the two candidates worth
separating are: the loop is never entered for that address, meaning some earlier check returns
first; or it is entered and something ends it, which would have to be a reset from another cause,
since the watchdog is fed inside it. A control of 62 bytes at the same address distinguishes "the
address answers" from "the address is refused" before the odd read is tried.

A single old observation with two trials is thin evidence either way, and the most likely outcome is
that it was a misattribution made while the question was still "is it the chunk count".

### Measured, and the prediction is wrong

It was not a misattribution. On the spare, minutes after the 65 byte restart and in the same
session:

| read | result |
|---|---|
| page `0xFF`, offset 0, **62** bytes, control | 62 bytes, remote answering |
| page `0xFE`, offset 0, **62** bytes, control | 62 bytes, and **different bytes**, so the page selector is live |
| page `0xFF`, offset 0, **63** bytes | **63 bytes back in 39 ms, remote answering** |

`GET_VERSION` and the config window were unchanged afterwards, and the device path did not change,
so nothing restarted. **Offset zero is genuinely exempt, and the old two trial note stands.**

That is the third time in this project that a suggestive absence turned out to be worth retesting
rather than explaining away, and this time the retest went against the reading rather than for it.

### What survives and what is withdrawn

**The loop is real and its arithmetic is as described.** It is why 65 hangs where 64 and 124 do not,
which was measured on hardware after being predicted, and that case is not affected by anything
here.

**What is withdrawn is that the loop explains every internal read.** It cannot, because it does not
distinguish offset zero and the device does. So there is a step in front of it that this section has
not read.

### The attribution: settled by the validator, and the withdrawal is reversed

The doubt was that `0x26BB2` tests the top address byte against zero and against `0xFE` and sends
everything else to a shared exit, so page `0xFF` looked as though it never reached this loop. The
arch 12 validator at `0x2637A` settles it, and it does exactly what arch 14's was said to do:

```
2637a: 87 c2 00 f0 MOVFF 0x287,0x000   ; the top address byte
2637e: 00 90       BCF 0x00,0          ; clear bit 0, so 0xFF becomes 0xFE
26384: fe 0e       MOVLW 0xfe
26386: 00 18       XORWF 0x00,W        ; and compare with 0xFE: both pages match
26390: 17 e0       BZ 0x263c0          ; taken: the internal path
...
263d4: fe 0e       MOVLW 0xfe
263d6: 8b 6f       MOVWF 0x8b,B        ; 0x28B := 0xFE, written back unconditionally
263d8: 01 0e       MOVLW 0x01
263da: 87 17       ANDWF 0x87,B,F      ; 0x287 &= 1: the page bit is all that survives
263dc: 01 0c       RETLW 0x01          ; accept
```

So **the low bit of the top address byte is the page selector**, the value the read body tests has
already been normalised to `0xFE`, and the page bit becomes the top byte of the 24-bit address the
loop is handed, which is why the two pages map to program `0x00xxxx` and `0x01xxxx`. Page `0xFF`
reaches this loop. The withdrawal above is reversed: **the loop is the internal read body for both
pages**, and the measurement agrees, since 65 bytes at page `0xFF` hangs exactly as the loop says it
must.

The validator also bounds the offset, at `0xFFF8` rather than the `0xFFC0` this project's library
uses, and it does not touch the count at all.

### What is still open, and it is narrower now

**Offset zero, and the whole path is read now without finding it.** `0x28A` was the thing to check
and it is the **chunk** size rather than the request's: `0x26B4C` does `DECF 0xD30,W` into it, so it
is the clamped payload minus its sequence byte. The chunker in front of it, `0x26AF0`, is the arch
12 twin of arch 14's `0x0C9B2`, comparing the 16-bit remaining count at `0x288` against 63 and
clamping to 63, 31, 15 or 7. And the count itself is parsed verbatim at two identical sites,
`0x264E8` for `WRITE_FLASH` and `0x26532` for `READ_FLASH`, each ending in the same call to the
validator.

So a 63 byte request is chunked 62 then 1, at any offset, and the loop cannot end on the second
chunk. **None of those four routines tests the offset**: the parse, the validator, the chunker and
the loop each read the address only to range check it or to hand it on.

**That is as far as the negative goes, and the first draft of it went further and was wrong.** It
said the exemption is not in the `READ_FLASH` path at all, on the strength of a sweep for branches
on the offset bytes across `0x264E8` to `0x26C1C`. Two things were wrong with that. The sweep was
**vacuous**, testing a category name the decoder does not emit, so it counted zero whatever the
image held. And the range spans several command bodies rather than this one path, so even a working
sweep would have been answering a different question. Enumerating the accesses by hand instead found
28 of them, including a real comparison at `0x268AC` of the whole 24-bit address against `0x020000`,
the arch 12 execution base, which sets a flag bit. That one is in the flash machinery rather than on
the path traced here, and it is pinned in the tests so the next reader does not have to find it
again.

The lesson is the project's own and it cost an hour here: **a negative asserted by a test that
cannot fail is worse than no test**, because it reads as evidence. What is left is genuinely
narrower than before and no more than that: the byte sender and the USB layer behind it, which is
the only other code every emitted byte passes through; the flash machinery around `0x268xx`, which
does look at the address; an interrupt; or something about that particular address that no reading
of this path will show.

### Bounding it on hardware: predicted before measuring

Two more offsets, on page `0xFF`, 63 bytes each, each with a 62 byte control at the same offset
first. Written down before the remote was plugged in.

**The prediction is that both hang**, making offset zero uniquely exempt. Offset `0x40` is the
stronger of the two, because the original note already records 63 bytes there as having completed
and then killed the remote, so a hang there is a reproduction rather than a new fact. Offset 2 is
the one that carries information either way, because nothing has ever been tried next to zero.

What each outcome would mean, so that none of them can be fitted afterwards:

* **Both hang.** Offset zero alone is exempt, and whatever explains it is about that exact address
  rather than about a range. That is the outcome the loop reading expects everywhere except at zero,
  and it leaves the puzzle exactly where it is now, only sharper.
* **Offset 2 survives and `0x40` hangs.** It is not offset zero but a low range, with a boundary
  somewhere between them, and a boundary is something a comparison in the firmware can have. That
  would be the most useful result, because it turns "why is zero special" into "find the constant".
* **Both survive.** The exemption is wide, the original `0x40` note is wrong, and the odd count
  reading needs re-examining rather than patching, since 63 at `+0x1000` restarts a remote and would
  then be the special case rather than the rule.

### Offset 2 survives, so it is a range and not one address

| read | result |
|---|---|
| page `0xFF`, offset 2, 62 bytes, control | 62 bytes, remote answering |
| page `0xFF`, offset 2, **63** bytes | **returned in 35 ms, remote answering** |

`GET_VERSION` and the config window were unchanged afterwards. So the prediction is wrong for the
second time on this question, and it is wrong in the direction that carries information: **offset
zero is not uniquely exempt.** Whatever decides this is a comparison against a bound, not a test for
a single address, and a bound is a constant somebody can find.

`0x40` is the decisive one now, because the original note records it as fatal. If it hangs, the
boundary sits between 2 and `0x40` and the constant can be searched for directly.

### `0x40` survives too, which is the third outcome and the worst one

| read | result |
|---|---|
| page `0xFF`, offset `0x40`, 62 bytes, control | 62 bytes, remote answering |
| page `0xFF`, offset `0x40`, **63** bytes | **returned in 39 ms, remote answering** |

Version and config unchanged either side. So 63 bytes is harmless at offsets 0, 2 and `0x40`, and
the original note recorded the same read at `0x40` as having killed a remote.

That is the outcome written down above as the one where the odd count reading "needs re-examining
rather than patching", so it is re-examined here rather than repaired.

**What is measured, first hand, on the spare:**

| read | outcome |
|---|---|
| 62 bytes at `+0`, `+2`, `+0x40`, `+0x1000` | fine |
| 63 bytes at `+0`, `+2`, `+0x40` | fine |
| 64 bytes at `+0x1000`, `+0xE000`, and page `0xFE` `+0x1000` | fine |
| 124 bytes at `+0x1000` | fine |
| **65 bytes at `+0x1000`** | **hung, and the hang did not self-clear** |

Every hang this project has ever seen is at offset `0x1000`, and every read away from `0x1000` has
been fine whatever its parity. **The one thing never measured first hand is 63 bytes at `+0x1000`**,
which is the reading the original note rests on and the control that separates the two candidate
explanations:

* if it hangs, the offset is what matters and the boundary is between `0x40` and `0x1000`, with the
  parity rule holding above it;
* if it survives, the offset is irrelevant and the trigger is a final chunk of **3** rather than of
  any odd size, since 65 is `62 + 3` and every 63 tried is `62 + 1`. The loop reading would then be
  wrong about which odd values matter, and the original 3-of-3 note about 63 at `0x1000` would be
  about something else entirely.

### The missing control, run at last: the offset decides

| read | result |
|---|---|
| page `0xFF`, offset `0x1000`, 62 bytes, control | 62 bytes, remote answering |
| page `0xFF`, offset `0x1000`, **63** bytes | **failed after 146 ms, remote gone** |

So the original note reproduces, first hand this time, and **the offset is what matters**. 63 bytes
is harmless at 0, 2 and `0x40` and fatal at `0x1000`, so there is a boundary between `0x40` and
`0x1000` and it is a comparison somebody can find.<!--superseded-->

> Section 96: the offset matters, but only because it fixes which byte of flash lands on the loop's
> counter. There is no boundary and no comparison.

The remote **came back on its own in about three seconds**, at a new device path, and answered with
its config byte identical. That is a sixth self-clearing restart and it is further reason to think
the earlier freeze belonged to the charger transition rather than to these reads.

**The parity rule survives but only above the boundary.** At `0x1000`, 62, 64 and 124 are fine and
63 and 65 are fatal, which is exactly the loop's arithmetic. Below the boundary the loop's
arithmetic apparently does not apply, and nothing read so far says why.

### What would find the constant, and what it costs

A bisection between `0x40` and `0x1000` is about six reads and gives the boundary to a byte, and
each hang now looks like three seconds and a self-clearing restart rather than a battery pull. That<!--superseded-->
is the cheapest route to a number that can then be searched for in the image, which is what turns
this from a measured curiosity into a firmware fact.

It is deliberately **not** automated. A script that hangs an irreplaceable device six times in a row
is exactly the thing that should need saying out loud each time, and the environment's own safety
check refused to run one, which was the right call.

### The bisection, run step by step, and the threshold is an address

Fourteen reads on the spare, each one announced, each hang self-clearing in about three seconds at a
new device path, with the config verified at the end and byte identical to its dump.

| offset on page `0xFF` | 63 bytes |
|---|---|
| 0, 2, `0x40`, `0x800`, `0xA00`, `0xA40`, `0xA50`, **`0xA54`** | survives |
| **`0xA56`**, `0xA58`, `0xA60`, `0xB00`, `0xC00`, `0x1000` | hangs |
| `0xA80` | returned, and the remote died immediately after |

**It is deterministic.** `0xA54` survives three times out of three and `0xA56` hangs three out of
three, which is what makes the boundary worth quoting: a bisection over single trials of a flaky
effect would have produced a number that meant nothing.

`0xA80` reproduces the one shape the original notes recorded and this project had never explained:
the read completes and the remote dies afterwards rather than during. It sits above the boundary, so
it is not a separate phenomenon.

**The threshold is on the start address, not the end.** 65 bytes from `0xA54` reaches exactly as far
as 63 bytes from `0xA56`, and it survives. So what decides is where the read begins.

**And it is an absolute program address, not an offset.** The same offset `0xA56` on page `0xFE`
survives. Page `0xFE` maps from program zero and page `0xFF` from program `0x010000`, section 22, so
the boundary is at program **`0x010A56`**, which is why no read on page `0xFE` has ever hung: that<!--superseded-->
whole page lies below it.

> **Corrected by section 96, on the same day.** There is no boundary. Whether an unterminated read
> ends is decided by the parity of one flash byte `0x8C7` above where the failing chunk starts,
> because the response sender has no bound and the loop eventually overwrites its own counter with
> what it is reading. Every offset tried below `0xA56` happened to have an even byte there, and on
> that reading 568 of the 1323 even offsets below it hang. The page `0xFE` observation is explained
> the same way, by content rather than by a range. Everything measured below stands; the word
> boundary does not, and neither does the search for the comparison it implies.

### What that reframes

**The parity rule is real but it is local.** Above `0x010A56`, 62, 64 and 124 are fine and 63 and 65<!--superseded-->
are fatal, which is the loop's arithmetic exactly. Below it, odd counts are harmless at every offset
tried. So the loop reading explains the failure but not the boundary, and something about that
address decides whether the failure can happen at all.

> Also corrected by section 96. The parity rule is not local and it is not about the count reaching
> zero by itself: an odd count never terminates at any address, and what varies is whether the
> counter is overwritten with something even before the remote is beyond saving.

### What sits there, read off the remote

Read on 9 August 2026 in even chunks, so no odd count and no risk of the failure this section is
about. Two things, and the second one kills the obvious explanation.

**The region carries the image header this project predicted from the client's own file.** Its first
ten bytes are a `u16`, then `FF FF`, then four bytes, then `48 47`, and the client's image builder
writes a checksum at 0, `0xFFFF` at 2, four bytes at 4 and `0x4748` at 8, `docs/host-client.md`. So
the shape was predicted from Logitech's build description and then found on the device, which is the
first independent check of that description against hardware.

**The body is a program, not a bitstream.** From `0xA40` it is records of exactly `0x50` bytes,
found at `0xA40`, `0xA90`, `0xAE0` and `0xB30`, each opening `00 17 01 01 00 00 27 10` followed by
three bytes, then about 28 bytes of mostly-set bit vector, then zero fill. `17 01 01` carries a
32-bit operand and the values seen are round decimals, 10000, 5000 and 100000, which read as
microseconds. Elsewhere the stream is dense in `12 xx` pairs. That is the shape of a player driving
an external part with delays between vectors, which fits the client calling it a CPLD image, and it
is a program rather than the raw bitstream a CPLD load would need.

**And `0xA56` is not the end of anything.** It falls inside the bit vector of the record that starts
at `0xA40`, and the same record structure continues unbroken for at least three more records past
it. So the boundary is neither the end of the image nor a record boundary, and the tidy explanation,
that a read starting past the image hangs, is wrong.

What remains is the strange part measured above: a read that **starts** past `0x010A56` hangs, while<!--superseded-->
a read that starts below it and **reaches** past it is fine. That is not a property of the memory, it
is a decision taken from the start address, so it is a comparison somewhere this section has not
found rather than anything about what is stored there.

> Wrong on both halves, section 96. It **is** a property of the memory, just not of the memory at
> `0xA56`: the deciding byte sits `0x8C7` further on, which is why reading what is stored at the
> supposed boundary explained nothing. And the start address matters only because it fixes which
> byte that is.

The rail is unchanged and does not depend on any of it: it refuses odd counts everywhere, which is
more than the hazard needs on page `0xFE` and exactly what it needs above `0x010A56`.

### A remote can get stuck in USB mode, and it is not this section's doing

Recorded as a bench fact and **not** as a consequence of these reads, because the first version of
this subsection made it one and the sequence does not support it.

What happened: after the 65 byte test the remote left the bus, came back on its own at a different
device path, and was verified healthy, version, three flash windows, the config byte identical and a
64 byte internal read. Later, off the charger and plugged into USB, it did not enumerate at all.
Unplugging the cable left it **still showing USB mode**, and taking the batteries out cleared it.

**No causal link to the reads is established and one was claimed here for an hour.** Successful
operations sat between the test and the freeze, and a charger to USB transition sat between them
too, which is a state change this project has never exercised. Adjacency is not cause, and writing
it up as cause is the same error this document warns about elsewhere.

What is worth keeping is the operational fact: **a Harmony One can end up stuck in USB mode and need
its batteries out**, so a bench session should expect that and not read a silent remote as a result.
The earlier claim that every restart recovered on its own stands, because every restart did.

An odd count hangs a remote, demonstrated on hardware after being predicted. The loop that does it
is read, the validator in front of it is read, the chunker and the parse are read, and one special
case is in none of them. The rail does not depend on it, because it refuses odd counts everywhere,
which is strictly more than the hazard needs.

## 95. A remote stays in USB mode when the cable goes, and its own software never lets that happen

An owner's observation on 9 August 2026, and it turns out to be a product requirement rather than a
curiosity: pull the cable and the Harmony One keeps showing USB mode until the batteries come out.

### The firmware can see the cable go

The USB stack tests the bits that would tell it. `0x200E0` tests `UCON` bit 5, `SE0`, which is the
bus reset and detach condition, and `0x2011A` tests `SUSPND`. The service routine at `0x2D886`
handles `UIR` bit 3 `TRNIF` and bit 4 `IDLEIF` and bit 2 `ACTVIF`, and the state machine enables
`URSTIE` and `IDLEIE` in `UIE` before it moves on. A detach looks exactly like idle, so the module
notices.

So the mechanism is not missing. What is missing is anything that takes the **application** out of
USB mode on that event, and this section has not found one.

### Logitech's own software never relies on it

Every operation in the Desktop client's own files ends with an explicit command rather than with a
disconnect, `docs/host-client.md`. The config write ends with a reset, `0xE0 0x02`, marked to wait
for the remote to reboot. The learn session ends with a restart command carrying a stop entry point.
And the entry point table's first value is **terminate**.

So the remote is designed to be told when a session is over. Pulling the cable is not that, and it
is not a case their software ever exercises.

### How deep it goes, measured

Reconnecting does not help. With the remote showing USB mode after its cable had been pulled, it was
plugged back in and **did not enumerate at all**: sixteen seconds of polling, two other Logitech
devices visible on the same machine and no Harmony among them. Only taking the batteries out clears
it.

So this is not a stale screen over a working stack. The remote stops presenting itself on the bus,
and the host has no way back in, which means no command can rescue it either.

### It also explains the freeze earlier the same day, and corrects a correction

At midday a remote was found hung and not enumerating, and this document briefly blamed a 65 byte
read, then retracted that when the owner's account showed successful operations and a charger to USB
transition in between. **The retraction was right about the read and wrong to leave it unexplained.**
This is the explanation: every session this project runs ends by closing a handle and pulling a
cable, which is exactly the case that leaves a remote in this state. It is reproducible on purpose,
which the midday event never was.

So the cause is how a session ends rather than what the session did, and the odd count read is
cleared of it a second time and for a better reason.

### Observed again the same day, and the sequence is fully known this time

The spare One did it again after the section 96 falsification reads: cable pulled, remote stuck
showing USB mode, batteries out to clear it. This one is worth recording because **nothing unusual
preceded it**. The last command it received was an ordinary 32 byte `READ_FLASH` of the config base,<!--superseded-->
which answered correctly and matched its dump, and the deliberate hang before that had already
cleared itself and been verified healthy.
So the pattern is exactly what this section claims: it is the disconnect, not the traffic.<!--superseded-->

Two occurrences on the same unit on one day, and the second following a plain successful read, moves
this from an owner's observation to something a bench session should simply expect.

> **Wrong, and the control that shows it was run on 10 August 2026.** A session containing nothing
> but one plain 32 byte read, followed by pulling the cable, left the remote **out** of USB mode and
> back on its normal display. So a disconnect on its own does not strand a remote, and this
> subsection's "nothing unusual preceded it" was reading "the last command" as "the session". Both
> sticking occurrences followed sessions that contained a deliberate odd count hang; the one that did
> not, did not stick. Section 99 has the control and what it points at.

### What it means for the application

**A session has to be ended, not abandoned.** Version 1 of FreeHarmony is read only and closing a
handle is all it does, so it leaves a remote in USB mode exactly as observed, and unreachable until
its owner takes the batteries out. Ending it properly means sending a command, which is a state
change and therefore sits behind `WRITES_ENABLED` in `packages/usb/src/rails.ts` along with
everything else that changes a remote.

That is an uncomfortable place for a read only product to be: **the polite way to finish is behind
the flag that exists to stop it touching anything.** Worth deciding deliberately rather than
discovering, and it is the strongest argument yet for a narrow exception with its own rail rather
than for widening the write flag.

That is worth having written down before the product is built, because it is the kind of thing that
reads as a bug report from the first user and is a design decision here. Until then the honest
behaviour is what this project already does: leave the remote alone, and tell the user that the
batteries clear it.

**Which command is not established.** `0xE0 0x02` is a reset and the client uses it after a write;
whether a read only session should reset a remote at all is a product question rather than a
protocol one, and the terminate entry point may be the gentler answer.

## 96. There is no boundary: the response sender has no bound, so the loop overwrites its own counter

Section 94 ended by saying the threshold at program `0x010A56` had to be a comparison somewhere in
the firmware and that somebody could find it. There is no such comparison, and there is no
threshold. What decides whether an unterminated read ends is **the byte the loop happens to read
`0x8C7` bytes above where it starts**, because the byte sender writes past the end of the response
buffer and eventually writes into the loop's own counter.

### The sender does not bound anything

`0x20394` is nine instructions and there is no length check among them:

```
20394: 02 01       MOVLB 0x2
20396: c7 c2 e9 ff MOVFF 0x2c7,FSR0L      ; a 16 bit write pointer, 0x2C7/0x2C8
2039a: c8 c2 ea ff MOVFF 0x2c8,FSR0H
2039e: c7 2b       INCF 0x2c7,F           ; advanced before the byte lands
203a0: 00 0e       MOVLW 0x00
203a2: c8 23       ADDWFC 0x2c8,F
203a4: cd c2 ef ff MOVFF 0x2cd,INDF0      ; the byte, wherever the pointer now points
203a8: 04 01       MOVLB 0x4
203aa: 0d 2b       INCF 0x40d,F           ; and the response length, also unbounded
203ac: 12 00       RETURN
```

So a caller that sends more bytes than the buffer holds walks the pointer up through data memory,
writing what it sends. The loop of section 94 is exactly such a caller: with an odd count it never
reaches its exit test, and it emits two bytes an iteration for as long as it runs.

### Where the pointer starts, and what it reaches

The command layer reloads the pointer before **every** response, at `0x2015E`, after polling the
descriptor bit that says the previous report has gone:

```
2014c: 04 01       MOVLB 0x4
2014e: 0c bf       BTFSC 0x40c,7          ; previous report still pending, come back later
20150: b5 d0       BRA 0x202bc
20152: 05 0e       MOVLW 0x05
20154: 02 01       MOVLB 0x2
20156: 84 5d       SUBWF 0x284,W          ; the command state
20158: 27 e0       BZ 0x201a8
2015a: 02 01       MOVLB 0x2
2015c: 68 0e       MOVLW 0x68
2015e: c7 6f       MOVWF 0x2c7            ; buffer base 0x0468
20160: 04 0e       MOVLW 0x04
20162: c8 6f       MOVWF 0x2c8
```

The read body then sends two bytes before the loop starts, the response code at `0x26B9C` and
`0x28C` at `0x26BA8`, so the loop's first data byte lands at **`0x046A`**. Its counter is `0xD31`,
its scratch word `0xD32` and `0xD33`, and its 24 bit address `0xD34` to `0xD36`, all above the
pointer and all in its path.

`0xD31 - 0x046A` is **`0x8C7`**, which is 2247 bytes, or 1124 iterations. Until then nothing the
loop writes changes anything it uses: the pointer only climbs, `0xD32` and `0xD33` are rewritten
every iteration anyway, and the address bytes sit above the counter. At iteration 1124 the counter
is overwritten with a byte read from flash, and from that moment:

* if the byte is **even**, the count reaches zero and the read completes normally, having scribbled
  2247 bytes of data memory on its way;
* if it is **odd**, the loop carries on, the next writes land on the address bytes, the read jumps
  somewhere else and the remote does not come back until it restarts.

**So the rule is a parity test on one byte of flash, `0x8C7` above the start of the chunk that hangs.**
Not a comparison, not a region, and nothing about `0x010A56` at all.

### Every measurement so far, predicted

A simulation of the loop, given the sender's behaviour above, the addresses out of the disassembly
and the page `0xFF` image read off the spare, predicts **21 of 21** measurements from sections 93
and 94, including the shape the bisection could not place: offset `0xA80`, where the read returns
and the remote dies immediately afterwards, which is the even case with 2247 bytes of collateral.

Two controls, because a simulation with a free parameter would predict anything:

| the write pointer starts at | measurements predicted |
|---|---|
| `0x0466` to `0x0469` | 16 to 18 of 21 |
| **`0x046A`, the value the firmware gives** | **21 of 21** |
| `0x046B` to `0x046E` | 15 to 17 of 21 |

and, with the sender given the bound it does not have, so that only the count decides:

| model | measurements predicted |
|---|---|
| bounded sender, parity of the count alone | 11 of 21, and it cannot tell any two offsets apart |

The constant was not fitted. `0x0468` is a literal at `0x2015E` and the two preamble bytes are two
`CALL`s, so `0x046A` was read out of the firmware and then tested.

The model is `src/harmony/readloop.py` and the 21 of 21 above is one command away for anyone holding
the page. Two more were then predicted in advance and measured, below, for 23 of 23. **The regression test deliberately does not run it against that page**, because page
`0xFF` carries the remote's identity block and is the one image kept out of `tests/lab.py` for that
reason. So the test pins the mechanism, which is where the argument actually lives: that the sender
is nine instructions with no comparison, skip or branch among them, that the pointer is reloaded per
report from `0x0468`, that two bytes precede the loop, and that the counter therefore sits `0x8C7`
above where the loop starts writing. The model is then exercised on synthetic pages, including the
negative that a byte one position either side of the deciding one changes nothing.

There is a second, independent check that does not use the simulation at all. Take the fourteen
bisection outcomes as fourteen parity constraints on an unknown offset `k`, and search every `k`
from 1 to `0xD31`: 27 of 3377 satisfy all fourteen, and `0x8C7` is one of them. That sounds weak
until the null is measured. Shuffling which outcomes were hangs, 300 times, **297 of the 300
shuffles admit no `k` at all**, so a satisfiable pattern is itself the unlikely thing here.

### What this kills

**The threshold at `0x010A56` is an artefact of which offsets the bisection chose.** Every offset
tried below it, `0`, `2`, `0x40`, `0x800`, `0xA00`, `0xA40`, `0xA50` and `0xA54`, happens to have an
even byte `0x8C7` above its final chunk. They are round numbers, and round numbers in this image
land in structured, zero rich data, so that is less of a coincidence than it looks. On the same
reading **568 of the 1323 even offsets below `0xA56` hang**, and 983 offsets above it survive in the
first `0x2000` alone.

The bisection was not wasted: it is what forced the explanation to be content dependent, since no
comparison produces a threshold at `0xA56`, and it is the data every part of this section is tested
against. What it does not support is the word boundary.

### Falsified on hardware, in both directions, the same day

Two 63 byte reads on page `0xFF`, each with a 62 byte control at the same offset first, written down
here and committed before the spare One was plugged in. The unit was identified from what it holds,
not from its path: its config base matches `one-spare-after-sync-config.bin` byte for byte.

| offset | deciding byte | boundary reading | section 96 | measured |
|---|---|---|---|---|
| `0x0004`, 62 bytes | | returns | returns | 62 bytes in 4 ms |
| `0x0004`, **63** bytes | `0x01` at page offset `0x0909` | returns, it is far below the threshold | **hangs** | **failed after 146 ms, remote gone** |
| `0x0A66`, 62 bytes | | returns | returns | 62 bytes in 4 ms |
| `0x0A66`, **63** bytes | `0xFE` at page offset `0x136B` | hangs, it is above the threshold | **returns** | **63 bytes in 45 ms** |

**Both predictions hold and the two readings disagree about both.** `0x0004` is four bytes above an
offset measured safe three times and 2642 bytes below the supposed threshold, and it hangs. `0x0A66`
sits above the threshold and comes back. So the threshold is not a weak rule with exceptions, it is
not a rule at all, and one byte of flash 2247 further on decides each case.

The remote came back on its own in under two seconds at a new device path, a seventh self-clearing
restart, and its config base read back identical afterwards.

That takes the record to **23 of 23 measurements predicted**, of which these two were predicted in
public before the remote was connected, which the other 21 were not.

### What it means for the rail

Nothing changes and the reason is now better. `packages/usb` refuses an odd count on internal
memory everywhere, and an odd total is exactly the condition for an odd final chunk, because the
chunker emits 62 byte chunks and a remainder. What the refusal prevents is not a restart at certain
addresses: it is a loop that writes an unbounded amount of flash content over data memory, whose
best case is 2247 bytes of collateral damage and a successful looking reply. The reply from a
"survived" odd read is not trustworthy either, which is a reason to refuse the count rather than
tolerate the ones that return.

### The same defect is on all three architectures, and only the distance differs

Established the same day, so the paragraph that used to end this section saying it was not is gone.
Each image was read the same way, starting from the fetch primitive's own shape, a `TBLRD*+` and a
`TBLRD*` six bytes apart feeding `PRODL` and `PRODH`, rather than from an address guessed by
analogy.

| | fetch | loop head | exit test | sender | buffer base | counter | distance |
|---|---|---|---|---|---|---|---|
| arch 12, One 3.4 | `0x2E70A` | `0x26BC8` | `0x26C16` | `0x20394` | `0x0468` | `0xD31` | `0x8C7`, 2247 |
| arch 14, 700 2.8 | `0x1B558` | `0x0CA8A` | `0x0CAD6` | `0x172DA` | `0x0468` | `0xD5D` | `0x8F3`, 2291 |
| arch 9, 525 | `0x07DC4` | `0x03372` | `0x033A4` | `0x0173C` | `0x0468` | `0x70B` | `0x2A1`, 673 |

Everything that makes the defect a defect is common to all three:

* the exit test is `SUBLW 0x00` then `BNC` on each, so an odd count never reaches zero;
* the step is two, because the fetch can only read a word;
* the sender advances a 16 bit pointer and stores through it with **no bound**, and increments the
  same byte at `0x40D` on all three;<!--superseded-->

> **Corrected within the hour, section 98.** That line went on to call the shared `0x40D` "the sort
> of coincidence that says one codebase rather than three". It is not a coincidence and it says
> nothing about the codebase: `0x40C` is the USB buffer descriptor for endpoint 1 IN, `0x40D` is its
> byte count and `0x40E` and `0x40F` its buffer address. Those are fixed by the part, so all three
> would share them however they were written. The genuinely shared software choice is the buffer
> base `0x0468`, and one address is thin evidence.
* the buffer base is the literal `0x0468` on all three, reloaded per report;
* two bytes precede the loop, so it starts writing at `0x046A` everywhere;
* and the loop's counter sits **below** its own address bytes in every layout, so the runaway
  pointer always reaches the counter first. That ordering is what makes the outcome a parity test on
  one byte rather than a jump to an arbitrary address.

**What differs is only how long the remote survives.** Arch 9 decides after 337 passes where arch 12
takes 1124 and arch 14 1146, so a 525 scribbles a third as much of its memory before the byte that
settles it, and reaches that byte three times sooner.

`src/harmony/readloop.py` carries all three as `PROFILES`. The library's refusal is on the count and
is architecture independent, so nothing about the rail changes; what this settles is that adding a
read profile for a new architecture must not be taken as evidence that its internal read path is
safe, because on the evidence here it will have the same defect.

## 97. Ending a session politely means resetting the remote, and the restart command does nothing on a One

Section 95 left a product question open: FreeHarmony ends every session by closing a handle and
having its user pull a cable, which is exactly what leaves a remote stuck in USB mode. The polite
alternative was assumed to be expensive, on the grounds that any command is a state change and
belongs behind `WRITES_ENABLED`. This reads what the two candidate commands actually do, on both
bench architectures, and the answer is worse and clearer than the assumption.

### The restart command is `WRITE_MISC` selector `0x0A`, and on arch 12 it is a no-op

`docs/host-client.md` records the Desktop client sending `0xA0 0x0A 0x07 0x00` to **a Harmony One**
to enter learning, and the same with `0x08` to leave it. That is `WRITE_MISC` with selector `0x0A`,
an entry point and a configuration type. Both selector chains decode with
`harmony/pic18/chains.py`, never by hand:

| | selectors serviced |
|---|---|
| One 3.4, chain at `0x2666C` | `0x01`, `0x02`, `0x05`, `0x06`, `0x07`, `0x08`, `0x0A`, `0x0B` |
| 700 2.8, chain at `0x0C3AA` | the same, plus `0x09` |

The decode is calibrated on a case whose answer is already known: `0x07` lands on the RAM write,
`MOVFF` into `FSR0L`, `FSR0H` and `INDF0`, on both images, which is the selector this project
already uses.

On the One, selector `0x0A` is four instructions at `0x2670C`:

```
2670c: 0d 01       MOVLB 0xd
2670e: 01 0e       MOVLW 0x01
26710: 21 6f       MOVWF 0xd21      ; the "packet handled" flag, and nothing else
26712: 04 d0       BRA 0x2671c
```

and `0x05`, `0x08` and `0x0B` are the same shape. `0x05` even reads the entry point byte and
branches on it to the same address either way, which is an empty conditional left in the source.

**So Logitech's own client sends a command to a Harmony One that the Harmony One ignores.** That is
not a contradiction in the client, it is a host written across skins: arch 14 acts on it, arch 12
does not need it, and the host sends it either way.

### On arch 14 it acts, for five entry points, by injecting action list instructions

`0x0C448` compares the entry point against `0x07`, `0x08`, `0x05`, `0x09` and `0x0A`, and anything
else falls to the same "handled" flag and does nothing. For those five it builds two three byte
records at `0x1AD`, `0x1AE`, `0x1AF` and calls `0x0EA36` for each:

| | operand | opcode |
|---|---|---|
| first | entry point, with `0xB0 \| (configuration type & 0x0F)` as its high byte | `0x3F` |
| second | `0xFFF4` | `0x07` |

Three bytes, operand then opcode, handed one at a time to a single routine: that is an **action list
instruction**, section 34, and `0x3F` and `0x07` are two of the bands section 73 read. So the
restart command is not a protocol operation with its own machinery at all. It is a way for a host to
push two instructions into the interpreter the config already programs.

**And it confirms the client's entry point numbering from the firmware.** The client lists eleven
entry points in order: terminate, default, before and after a config update, after a firmware
update, start and stop update, start and stop learn, start and stop upgrade. Number them from zero
and the five the firmware acts on are start update, start learn, stop learn, start upgrade and stop
upgrade. The client's own learn sequence uses `0x07` and `0x08`, which land on start learn and stop
learn, so two of the five are pinned by a source that never saw the firmware. **Terminate is entry
point zero, and it is one of the six that do nothing.**

### The escape is on both architectures, and it was nearly missed

Section on `0xE0` in `docs/usb-protocol.md` had this for arch 14 only. Arch 12 has it too, at
`0x26434`, and a scan for the chain style would never have found it because it tests with `SUBWF`
where arch 14 uses `XORLW`:

```
2642e: f0 0e       MOVLW 0xf0
26432: 1f 17       ANDWF 0xd1f,F     ; mask the command
26434: e0 0e       MOVLW 0xe0
26438: 1f 5d       SUBWF 0xd1f,W
2643a: 1c e1       BNZ 0x26474       ; not the escape, take the ordinary command chain
```

Both then read one more byte and dispatch it. Sub-commands `0x01`, `0x02` and `0x03` on both, plus
`0x05` on arch 14. An unrecognised sub-command falls through into the ordinary command chain rather
than being rejected.

### `0xE0 0x02` is a real reset, and the two images agree instruction for instruction

Sub-commands `0x02` and `0x03` set one flag byte, `0x32C` on the One and `0x6FF` on the 700. One
place reads it, and it turns a top level mode variable from 1 into 3:

```
28c30: 01 0e  MOVLW 0x01        |  16330: 01 0e  MOVLW 0x01
28c32: 15 6f  MOVWF 0x315       |  16334: a5 6f  MOVWF 0x3a5
28c36: 2c 51  MOVF 0x32c,W      |  16338: ff 51  MOVF 0x6ff,W
28c38: 03 e0  BZ  0x28c40       |  1633a: 03 e0  BZ  0x16342
28c3c: 03 0e  MOVLW 0x03        |  1633e: 03 0e  MOVLW 0x03
28c3e: 15 6f  MOVWF 0x315       |  16340: a5 6f  MOVWF 0x3a5
```

and mode 3 is:

```
28d30: f4 0e  MOVLW 0xf4        |  16410: f4 0e  MOVLW 0xf4
28d34: 01 0e  MOVLW 0x01        |  16414: 01 0e  MOVLW 0x01     ; 0x01F4, so 500 of something
28d38: CALL 0x2ccac             |  16418: CALL 0x1a3ee
28d3e: MOVF  0xec0,W            |  1641e: MOVF  0x1c1,W         ; poll until nonzero,
28d42: CALL 0x2cb86             |  16422: CALL 0x1a2c4          ;   servicing meanwhile
28d48: CALL 0x2cb80             |  16428: CALL 0x1a2be          ; then finish
28d4c: ff 00  RESET             |  1642c: ff 00  RESET
```

`RESET` is the PIC18 software reset instruction. So the client's post write `0xE0 0x02` really does
reboot the remote, after a bounded wait, and the same code does it on both architectures. Six such
instructions exist in the One image and five in the 700's, so finding them is not the same as
finding this one; what makes this one the reset is the path from the flag.

### `0xE0 0x01` is the one that is not a reset

```
2645a: 84 6b       CLRF 0x284       |  0bd82: c9 6b  CLRF 0xec9
26460: 8b 69       SETF 0x28b       |  0bd88: d5 69  SETF 0xed5
```

`0x284` is the One's command state variable, the one `READ_MISC` selector `0x07` reads back as ten
while it is being read, section 90, and `0xEC9` is arch 14's. `0x28B` is the read path's top address
byte, and `0xFF` is a value its own validator turns into `0xFE`, so setting it invalidates whatever
address a half finished command had parsed.

**So `0xE0 0x01` ends the command session and nothing more.** It is the same two instructions on
both architectures, which is the two sample requirement met on the only claim here that a product
decision would rest on.

### What it settles, and what it does not

**It does not solve section 95.** Nothing read here takes the remote out of USB mode. `0xE0 0x01`<!--superseded-->
abandons the command state machine; the top level mode variable is untouched and only the reset path
writes it. So of the two candidates, one is a reboot and the other does not do the thing that was
wanted.

That is a cleaner answer than the question expected: **a polite end is a reboot, or it is nothing.**<!--superseded-->
The restart command's terminate entry point, which was the hopeful reading of the client's entry
point table, is a no-op on arch 14 and the whole selector is a no-op on arch 12.

> **Overturned by section 99, later the same day, and it is the better answer.** USB mode does have
> an exit, and it is **gated on the command state variable being zero**, which is exactly what
> `0xE0 0x01` clears. So the gentle command is not useless: on the firmware's own structure it is
> the thing that lets a remote leave USB mode when the cable goes. "A polite end is a reboot, or it
> is nothing" is wrong, and it was written from having read only mode 3.

For FreeHarmony the decision is therefore between three honest options, and it is the owner's:<!--superseded-->
reboot the remote at the end of every read only session, leave it in USB mode and tell the user the
batteries clear it, or find what does write that mode variable, which this section has not done.
`0x315` on the One takes 1, 2 and 3 and only mode 3 is read here.

> The third option is the one that was taken, immediately, and it is section 99.

**Nothing here has been sent to a remote.** Both commands are writes in the sense that matters, they
change a device's state, so they belong behind `WRITES_ENABLED` exactly where `docs/host-client.md`
already put them, and reading what they do does not change that.

## 98. The learn samples are never sent: the endpoint is pointed straight at them

Section 91 established the learn session's bracket from the firmware and then failed to find any
code that sends capture data. It searched twice, for a routine emitting `0x90` and for a second
caller of the byte sender, and found neither, and recorded that "an assumption is wrong" without
saying which. This is which: **the samples do not go through the byte sender at all.** The firmware
fills a buffer and hands the USB endpoint that buffer's address, so nothing ever "sends" the bytes
one at a time and no code emits `0x90` in the sense the search was looking for.

### What `0x40C` actually is, which is where the misreading started

`0x40C` had been read as a response descriptor and `0x40D` as a length counter. They are the
**buffer descriptor** for endpoint 1 IN, in the USB dual port RAM that starts at `0x400` on all
three parts:

| | |
|---|---|
| `0x40C` | status. Bit 7 is `UOWN`, which is why `BTFSC 0x40c,7` at `0x2014E` means "the previous report has not gone yet" |
| `0x40D` | byte count, which is why the sender increments it once per byte |
| `0x40E`, `0x40F` | the buffer's address |

The proof is `0x2017A`, which sets the count to `0x40` and the address to `0x0468` with two
literals, in that order, immediately after clearing the write pointer. So the "response buffer" is
the endpoint's buffer and the "sender" is a routine that stores a byte into it and bumps the
hardware count. Section 96 is unaffected: an unbounded store through a climbing pointer is exactly
as bad either way, and rather worse when the pointer starts inside dual port RAM.

**This also withdraws a claim of my own from an hour earlier**, that three architectures sharing
`0x40D` says something about the codebase. It says something about the part.

### A second producer, pointing the endpoint somewhere else

`0x40D` and `0x40E` have one other writer, at `0x2028C`, and it does not use the `0x0468` buffer at
all:

```
2026c: MOVFF 0xd67,FSR0L        ; the buffer chosen below
20274: MOVLW 0x02 / ADDWF       ; skip its two byte header
2027c: MOVLW 0x3f / ADDWF       ; and its 64th payload byte
20284: MOVFF 0xd6b,INDF0        ;   holds the length
2028a: MOVLW 0x40 / MOVWF 0x40d ; a full report
2028e: MOVFF 0xd67,FSR0L        ; and the endpoint reads straight from the buffer + 2
2029e: MOVFF FSR0L,0x40e
202a2: MOVFF FSR0H,0x40f
```

`0xD67` is chosen at `0x201A8` from **two buffers at `0x0600` and `0x0642`**, by a toggle at
`0x0684` and a status byte at the head of each. That is a ping pong pair, and the arm happens
whenever one is ready rather than in response to anything.

### The buffers are the learn session's, and `START_IRCAP` says so

`0x26556` is `START_IRCAP`, the `0x70` handler. After setting the state to 5 it does exactly one
other thing:

```
2655e: CLRF 0x600     ; buffer A status
26562: CLRF 0x601     ;   and its length
26566: CLRF 0x642     ; buffer B
2656a: CLRF 0x643
2656e: MOVLW 0x01 / MOVWF 0x684   ; and the toggle
```

**The arch 14 handler is the same handler**, `0x0C2B2` on the 700, clearing the same four addresses
and setting the same toggle, and its transport picks a buffer at `0x16E5E` exactly as arch 12's does
at `0x201B0`. So the mechanism is two architectures, not one.

### The report layout, arch 12

The producer is `0x2B68E`, called from fourteen sites in the capture path. It appends to whichever
buffer is open, opening one with a header when the length is zero:

| offset in the buffer | |
|---|---|
| `+0` | status: 1 while filling, 3 once handed to the endpoint |
| `+1` | payload length so far, which starts at 4 and grows by 2 |
| `+2` | `0x90`, the response code section 91 went looking for |
| `+3` | a sequence byte, `0x28C`, which the same routine advances by `0x10` per report |
| `+4` onward | samples |

and what the host sees is the 64 bytes from `+2`, zero filled beyond the payload, **with the payload
length repeated in the last byte of the report**. A buffer is closed once its length would pass
`0x3D`, 61, and the other one takes over.

**A sample is a big endian `u16`, high byte first**, appended two bytes at a time. The values are
differences of the CCP2 capture register, `0x2B644` onward subtracting one capture from the previous
with `SUBWF` and `SUBWFB`, so they are **durations, not timestamps**. The capture path also pushes
literal `0x8000` and `0x0000` values as frame markers, and `0x8000` has bit 15 set, which is the
same mark bit an infrared duration block uses in a stored config, section 32. So the learn stream
and the config's own duration encoding agree, which is the closure worth having: what comes off the
remote is already in the form a record wants.

### The arch 14 header is the same, and the reason it looked otherwise is a lesson

This section first said the header was arch 12 only, on the strength of a scan finding no store of
`0x90` into `0x602` in the 700 or 600 images. That scan was right and the conclusion was wrong.
Arch 14 reaches the same buffers through `FSR`, so the store is `MOVWF INDF0`, and the scan had in
fact reported it, at `0x0938C` with `f=0xEF`. `0xEF` **is** `INDF0`. It was filtered out by a test
for the literal buffer offsets, which is the project's own recorded pitfall about indirect access,
made while writing the paragraph that warns about it.

Read properly, the producer at `0x0926E` is the same routine:

| | One 3.4 | 700 2.8 |
|---|---|---|
| gate | state 5 | state 5, `0xEC9` |
| buffers | `0x0600` and `0x0642`, chosen on `0x0684` | the same three addresses |
| status while filling | 1, at `+0` | 1, at `+0`, `0x0937C` |
| response code at `+2` | `0x90`, `0x2B742` | `0x90`, `0x0938C` |
| sequence at `+3` | `0x28C`, advanced by `0x10` | `0xED4`, advanced by `0x10` |
| a sample | high byte then low byte, length `+= 2` | the same, `0x093C4` and `0x093D0` |
| close a buffer at | length past `0x3D` | length past `0x3D`, `0x0932E` |

So the report layout is two architectures, not one. **What is arch 12 only is the differencing**:
`0x2B644` subtracts one capture from the previous with `SUBWF` and `SUBWFB`. On arch 14 the capture
reaches the staging variable at `0x091CA` with a previous value kept beside it at `0x319`, which is
the shape of a difference, but the arithmetic itself was not read and `0x090AC` is a re-arm of
`CCP2CON` rather than the subtraction. Called a duration on arch 12 and left open on arch 14.

### What it settles about the two clients

Section 91 recorded a disagreement it could not resolve: the classic client takes learn reports off
a queue a reader thread has already filled, which reads as the remote pushing them unsolicited,
while the Desktop client models them as a command's response stream. **The firmware sides with the
classic client.** Nothing in the arming path consults a command: the transport looks at the toggle
and the two status bytes on every pass, and hands the endpoint whichever buffer is full. A host that
waits for a request to answer will lose reports, and one that keeps reading during the session will
not.

That is a requirement for FreeHarmony rather than a curiosity, and it is the half of learning the
dead service cannot take with it: the remote produces the timings, and section 92's carrier plus
`packages/codec`'s record builder already turn timings into a record.

## 99. USB mode does have an exit, and it is gated on the command state being zero

Section 97 ended by saying a polite session end is a reboot or nothing, and offered finding what
writes the top level mode variable as the third option. Taken immediately, and it overturns the
conclusion: the exit exists, the firmware polls for the cable itself, and what stops it running is
one byte that `0xE0 0x01` clears.

### The mode loop, and what mode 1 is

`0x315` on the One is a three valued mode selected at `0x28C9C`. Mode 3 is the reset, section 97.
**Mode 1 is USB mode**, and its body polls a port pin and the USB module:

```
28cf2: 80 50       MOVF PORTA,W
28cf4: 10 0b       ANDLW 0x10        ; PORTA bit 4
28cf6: 0b e1       BNZ 0x28d0e
28cf8: 80 50       MOVF PORTA,W      ; read again
28cfa: 10 0b       ANDLW 0x10
28cfc: 0c e1       BNZ 0x28d16
28cfe: 01 0e       MOVLW 0x01
28d00: 00 6e       MOVWF 0x00
28d02: 65 50       MOVF UCON,W
28d04: 02 0b       ANDLW 0x02        ; SUSPND
28d06: 01 e0       BZ 0x28d0a
28d08: 01 0e       MOVLW 0x01
28d0a: 00 5c       SUBWF 0x00,W
28d0c: 04 e1       BNZ 0x28d16
28d0e: b3 ec 31 f1 CALL 0x26366      ; clear the command state, then leave
28d12: 06 d0       BRA 0x28d20
```

**The polarity of `PORTA` bit 4 is deliberately not claimed.** This project has twice recorded a bit
sense being inverted in its own notes, and nothing here establishes whether the pin is high or low
when a cable is present. What the structure states without needing the polarity is that mode 1
watches a pin and the USB `SUSPND` bit, and has two ways to reach the exit at `0x28D20`.

### The two ways out, and only one of them is unconditional

```
28d16: 84 51       MOVF 0x284,W      ; the command state variable
28d18: 01 e1       BNZ 0x28d1e       ; not idle: go round again, stay in USB mode
28d1c: 01 d0       BRA 0x28d20       ; idle: leave
28d20: 43 ec 5b f1 CALL 0x2b686      ; and the exit releases the pins and drops the mode
28d24: 93 8c       BSF TRISB,6
28d26: 8a 8c       BSF LATB,6
28d28: 29 d0       BRA 0x28d7c       ; CLRF 0x315
```

`0x26366`, the routine the other path calls first, is a full command reset: it clears `0x284`, the
three address bytes, three counters, and sets `0x28B`. So one path clears the gate and then leaves,
and the other leaves **only if the gate is already clear**.

Once `0x315` is zero the top level loop is back at its guard chain, which can enter mode 2 when two
routines report ready, two deferred work flags at `0x25D` and `0x25E` are clear, and `0x2628E`
reports idle. **Mode 2 is the application.**

### Why a remote can be left stuck, without needing any of that polarity

Every command body sets `0x284` to its own state number, and the shared exit at `0x267E4` clears it
**only when the packet was not handled**:

```
267e4: 21 51       MOVF 0xd21,W      ; the packet handled flag
267e6: 04 e1       BNZ 0x267f2       ; handled: skip the clear
267ea: 84 6b       CLRF 0x284
267ee: 8b 69       SETF 0x28b
```

So a handled command leaves the state variable holding its own number unless its own body clears it.
That is the byte the conditional exit tests. **A session that ends by closing a handle leaves
whatever the last command set**, and if that is nonzero the remote takes the conditional path and
stays where it is, which is what section 95 recorded twice on the bench.

**What is not established from the firmware alone** is which commands leave `0x284` nonzero at the
moment a host walks away. `READ_FLASH` ends by clearing its state, `docs/usb-protocol.md`, so a
plain read may well leave the gate open; the bench observation on 9 August 2026 followed exactly
such a read and the remote still stuck, which means either the polarity puts that case on the
conditional path with something else set, or the clear does not happen where it is assumed to. That
is one hardware experiment, and it is not this section's to run.

### What it changes

**The polite end is `0xE0 0x01`, and it is not a reboot.** It is the one command that clears the
gate, and clearing the gate is the difference between a remote that leaves USB mode when its cable
goes and one that does not. Section 97 called that command "the one that is not a reset" and could
not say what it was for; this is what it is for.

It stays behind `WRITES_ENABLED`, because it changes a device's state and this project's rails do
not bend for convenience. But the decision it feeds is no longer "reboot or nothing": it is whether
a read only product may send one command whose whole effect is to zero a state variable, which is a
far easier thing to argue than a reset. **The owner's call, and it is now a cheap experiment**: send
it, pull the cable, see whether the remote leaves USB mode.

### The experiment, prepared, with the prediction committed first

`packages/usb/bin/end-session-experiment.ts` runs it, and it exists in this commit so that the
prediction below is on record before any remote is attached. That ordering is the `probe-remote`
skill's rule and it is what makes the answer worth having: a measurement that confirms a number
nobody committed to in advance is worth much less.

**The prediction: the remote leaves USB mode when the cable is pulled**, and returns to its normal
display without needing its batteries out. The reasoning is section 99's chain: the last command the
script sends before the cable comes out is `0xE0 0x01`, which clears `0x284`, and the conditional
exit at `0x28D16` leaves USB mode exactly when `0x284` is zero.

What each outcome means, written down now so that none of them can be fitted afterwards:

* **It leaves USB mode.** The chain holds end to end, and the session end question becomes a policy
  question rather than a technical one: one command, no reboot, no storage touched.
* **It stays in USB mode.** Then the gate is not the only thing holding it, and the next suspect is
  the pin polarity this section deliberately declined to claim, or the guard chain in front of mode 2
  rather than the exit from mode 1. The correction goes in this section, not into the script.
* **It leaves USB mode without the command**, which the script cannot tell on its own and which one
  extra run answers: pull the cable after a plain read and see. If that also works, then the two
  bench observations on 9 August 2026 had a cause this section has not found, and the command is
  irrelevant rather than sufficient. **This is the control, and it is worth running first**, because
  it costs nothing and it is the only run that can make the other two meaningless.

The script identifies the unit from its config rather than from its port, refuses to run without
`HARMONY_ENABLE_WRITES=1`, and reads the same window before and after the command so that "cleared a
variable" is distinguishable from "left the command layer confused". Sending it needs
`assertSessionEndAllowed`, which refuses the two reboot sub-commands by number, refuses arch 9
because nobody has read its escape, and refuses anything but the spare remote until the policy
question is decided.

### The control ran first, three times, and it is the outcome that makes the experiment unnecessary

10 August 2026, on the spare, each round sending nothing but one 32 byte `READ_FLASH` of the config
base and then closing the handle. The screen is the evidence; enumeration after a replug is a proxy,
because a remote stuck in USB mode does not come back on the bus.

| round | how | cable out | screen | replug proxy |
|---|---|---|---|---|
| 1 | `read-window` by hand | | **left USB mode** | not run |
| 2 | `session-end-control.ts` | after 19 s | **left USB mode** | enumerated after 17 s, agrees |
| 3 | `session-end-control.ts` | after 7 s | **left USB mode** | reported nothing in 25 s, **wrong** |

**Three of three, so this is measured rather than observed.** A clean read only session does not
strand a remote.

**Round three's proxy was a false negative and the tool was at fault**, which is worth recording
rather than quietly fixing. The replug window was 25 seconds, chosen because section 95's stuck
remote had been polled for sixteen, and that is not margin: it has to cover somebody walking to the
desk and finding the socket, which round two shows takes 17 seconds. So the window turned "the remote
is stuck" and "the cable was not in yet" into one output and the script reported the interesting one.
It waits two minutes now and names both possibilities. **A script that cannot tell two outcomes apart
must not report one of them**, and this one did for exactly one round.

**A fourth run is deliberately not counted.** It was started by accident while checking that the
script refuses with nothing attached, on a bench where something was attached, so no one was watching
the screen. It was a read and the config came back identical, but an unobserved round is not a round.
The rule it broke is this project's own: enumerating is not opening, and "checking that it refuses"
is not a reason to open an irreplaceable device.

**So the premise is gone.** No command was needed. The third outcome written down above was the one
that "can make the other two meaningless", and it is the one that happened, so the session-end
experiment was not run: it would now be asking whether a command also achieves something the remote
already does by itself.

**And the chain in this section survives it intact**, which is worth being clear about because it
would be easy to read this as the section being wrong. `READ_FLASH` clears its own state when it
completes, `docs/usb-protocol.md`, so after a completed read the gate at `0x284` is open and the
unconditional exit is available. The control is what section 99 predicts for a clean session. What
was wrong was section 95's inference, and mine on top of it, that the disconnect alone strands a
remote.

### What it points at instead, as a hypothesis with a read only test

**Both sticking occurrences followed a session containing a deliberate odd count hang**, and the
session that contained none did not stick. Section 96 says what such a read does: it walks an
unbounded write pointer up through data memory from `0x046A`, writing flash content over whatever it
passes.

`0x284`, `0x315` and the deferred work flags at `0x25D` and `0x25E` all sit **below** `0x046A`, so
the runaway cannot reach them. **`0x2628E`'s four idle flags do not**: they are `0xED5`, `0xED6`,
`0xEDC` and `0xEDD`, and that routine returns 1 only when all four are zero. It is one of the two
ways the guard chain in front of mode 2 can be satisfied. So a remote whose runaway left any of those
four nonzero cannot enter the application by that route, and would sit wherever it is until a power
cycle clears data memory. That fits the shape of what was seen: not "the cable did not register" but
"there was nowhere to go".

**Unconfirmed, and it is a hypothesis rather than a finding**, because one session of each is not two
samples of anything. What makes it worth stating is that the test is a **read**: `READ_MISC` selector
`0x07` returns any data address, so reading `0xED5`, `0xED6`, `0xEDC` and `0xEDD` after a hang and
comparing them against a healthy remote settles it without writing anything. It does need a
deliberate hang, which is the owner's call and not something to schedule here.

### The test, prepared, and its predictions committed first

`packages/usb/bin/idle-flags-after-hang.ts`, gated on `HARMONY_ODD_READ_EXPERIMENT=1`. Four steps: a
baseline on a healthy remote, the deliberate hang at page `0xFF` offset `0x1000`, the same reads
after it recovers, and a window of data memory compared against the page `0xFF` image. Every step is
a `READ_MISC` or a `READ_FLASH`; nothing is written.

**Prediction one, the hypothesis itself: at least one of the four idle flags reads nonzero
afterwards**, where all four read zero before. `0x2628E` returns "idle" only when all four are zero,
and that routine is one of the two ways the guard chain in front of the application can be satisfied.

**Prediction two, the negative control: `0x284` and `0x315` are unchanged.** Both sit below `0x046A`
and the write pointer only climbs, so the runaway cannot reach them. If they move, the model of where
the pointer goes is wrong and prediction one means nothing either way.

**Prediction three, and this is the sharp one: a window of data memory reproduces a known stretch of
flash, byte for byte.** The runaway deposits what it reads. Its pointer starts at `0x046A` and the
chunk that never terminates starts at page offset `0x1000 + 62`, so data address `a` should hold page
`0xFF` byte `0x103E + (a - 0x046A)`. The script reads 48 bytes from `0x0480`, which is above the few
bytes each reply overwrites in the endpoint buffer and below `0xD31` where the runaway corrupts its
own address and the correspondence stops. **48 of 48 or the model is wrong**, and unlike the other two
this one cannot be explained by anything else: data memory containing a predictable stretch of program
flash is not a coincidence available to any other reading.

What each failure would mean, written down so none of them can be fitted afterwards:

* **Flags nonzero, controls unchanged, window matches.** The mechanism is confirmed end to end, and
  the stranding of 9 August 2026 has a cause. Section 95's story becomes a consequence of section 96.
* **Window matches, flags still zero.** The deposit is real and reaches data memory as described, but
  it is not those four flags that strand a remote, so the guard chain needs reading further: `0x27826`
  and `0x2A942` are the other two conditions and neither has been opened.
* **Window does not match, flags nonzero anyway.** Then something else disturbs the flags and the
  deposit model is wrong, which is the worst outcome because it makes section 96's arithmetic suspect
  where 23 measurements currently support it.
* **Everything unchanged.** The recovery is a real device reset rather than a re-enumeration, and data
  memory is reinitialised before anything can be read. That is separable and costs nothing to check:
  a real reset also resets the remote's clock, so the screen answers it.

**The last outcome is the likeliest way this experiment fails to say anything**, and it is worth
stating in advance rather than discovering: everything here is read *after* the remote comes back, and
if coming back means resetting, the evidence is gone by then. If that is what happens, the next
version has to read the flags **while** the remote is still hung, which the USB layer cannot do, and
the question would go back to the firmware.

**What it already changes for FreeHarmony is the part that mattered.** A read only session that ends
normally does not strand a remote, so version 1 needs to send nothing at the end, and the awkward
choice section 95 posed does not arise. The gentle escape stays implemented, gated and unused, which
is the right place for it.

## 100. A hang ends in a real device reset, which kills the idle flag hypothesis by mechanism

Run on 10 August 2026, on the spare, with all three predictions and all four failure modes committed
first. The fourth failure mode is the one that happened, and it turned out to be a finding rather
than a wasted run.

### What was measured

| step | result |
|---|---|
| baseline, four idle flags `0xED5`, `0xED6`, `0xEDC`, `0xEDD` | `00 00 00 00`, as prediction one required |
| baseline controls `0x284`, `0x315` | `0A 00` |
| 63 bytes at page `0xFF` offset `0x1000` | stopped answering, as every recorded hang has |
| it came back on the bus | yes, on its own |
| reading anything afterwards | **the remote did not answer** |
| the screen, before the batteries came out | **it rebooted, came up in USB mode, and its clock had been reset** |

**The clock settles it.** A reset clock is not something a USB re-enumeration does. So what this
project has been calling a self-clearing restart for two days is a **genuine device reset**, and the
remote's data memory is reinitialised as part of it.

### Which refutes the hypothesis without ever reading the flags

Section 99 proposed that a hang strands a remote by leaving `0x2628E`'s four idle flags nonzero. That
requires the corruption to **survive** the hang. It cannot: the hang ends in a reset, and a reset
clears data memory. So the mechanism is unavailable, and the flags after recovery are guaranteed clean
whatever the runaway did to them.

**This is a better refutation than a measurement would have been**, and worth being explicit about
why: reading the flags and finding them zero would have left two explanations standing, the hypothesis
being wrong and the reset having wiped the evidence. The clock separates them, and it was the screen
that answered rather than anything the host could see. The pre-registered note that this was the
likeliest way the experiment would say nothing is what made the question worth asking of the operator
at all.

**Prediction three is untested and stays that way.** The window of data memory reproducing page `0xFF`
byte for byte was the sharp one, and it cannot be read after a reset. Reading it needs the flags read
**while** the remote is hung, and it is hung precisely by not answering, so the USB path cannot do it.
That question goes back to the firmware or nowhere.

### And it takes the stranding's cause with it

**The remote did not strand.** It rebooted, came up in USB mode, and when the cable was pulled it left
USB mode and showed its normal display, exactly as the three control rounds did. So a hang does not
strand a remote either, and section 99's suspect is gone along with its mechanism.

**What both stranding events on 9 August 2026 share is a charger.** The first followed the remote being
taken off the charger and plugged into USB; the second followed a session after which the remote went
back on the charger and later returned to USB. Every run on 10 August, three controls and this hang,
went from USB to unplugged and back to USB with no charger in the sequence, and none of them stranded.

So the suspect is **the charger to USB transition**, which section 95 floated in one clause and then
dropped in favour of the disconnect. It is a state change nothing here has exercised deliberately, and
it is cheap to exercise: charge the remote, move it to USB, read something, pull the cable. Recorded
as the next question rather than as an answer, because two events sharing a circumstance is a lead and
not a cause, and this section exists because the previous lead was wrong.

> It was wrong again. Two subsections down it was exercised and it did not reproduce, so this suspect
> is dead as well and the stranding is unexplained. Left standing here because the order in which the
> leads died is the useful part.

### The charger round, prepared, and this prediction is the weakest of the three

`session-end-control.ts --from-charger`, which is the same round with the transition put back in front
of it. **The first wait is the experiment**, not the setup: the first stranding's signature was that
the remote, taken off the charger and plugged into USB, did not enumerate at all, so a remote that
never appears is the result and the script says so instead of timing out with a shrug.

**The prediction is that it reproduces**, most likely at the enumeration step, and it is worth saying
plainly that this is a weaker prediction than the ones before it. The two earlier experiments predicted
from a mechanism read out of the firmware. **This one predicts from a coincidence**: two events shared
a charger, four events without one behaved. Nothing here explains what a charger would do, and the only
candidate worth writing down is that `PORTA` bit 4, the pin mode 1 polls, might be asserted by the
charger as well as by USB, so a remote arriving from a charger never sees a transition at all. That is
speculation and is marked as such; it is not the reason for the prediction, it is the shape a reason
might have.

**If it does not reproduce, the two events of 9 August 2026 are unexplained**, and that is what gets
written down. Not narrowed, not left implied: unexplained, with three leads dead, so that nobody later
mistakes the silence for a conclusion. Two remaining differences would still be untested at that point
and both are worth naming now rather than reaching for afterwards: those sessions ran many commands
where these ran one, and both happened after hours of continuous bench work rather than to a remote
picked up cold.

### It did not reproduce, so the stranding is unexplained

Run on 10 August 2026, with the remote off USB and on its charger before the script was started, which
the script now refuses to proceed without.

| step | result |
|---|---|
| taken off the charger, plugged into USB | **enumerated after 16 s** |
| one 32 byte `READ_FLASH` of the config base | 32 bytes, identical to every other round |
| cable pulled | **USB mode disappeared**, the screen went back to normal |
| plugged back in | enumerated after 12 s, the proxy agreeing with the screen |

**So the charger lead is dead too, and the two events of 9 August 2026 are unexplained.** Written that
way deliberately. Three leads have now been followed and all three are dead: the disconnect on its own,
falsified by three control rounds; the odd count hang's RAM corruption, refuted by mechanism because
the hang ends in a device reset; and the charger to USB transition, which behaved exactly like every
other round. Nobody should read the end of this section as a narrowing.

**One caveat on this round, recorded rather than smoothed over**: how long the remote sat on the
charger is not recorded, only that it was there and off USB when the script started. If anyone wants to
close this harder, the run to do is the same one after a long charge, and a genuinely flat remote
brought up to charge is a different state again.

**What is still untested, named now so that a later reader does not have to invent it.** Those two
sessions ran dozens of commands each where every round here ran one, and both happened after hours of
continuous bench work on a remote that had been power cycled repeatedly, rather than to a remote picked
up cold. Either could matter and neither is a lead until something suggests a mechanism. What has not
been observed even once is a stranding that anybody was watching for, and the honest summary of this
whole thread is that **a bench session should expect it, a battery pull clears it, and nothing here
knows why**, which is where section 95 started and is now the considered position rather than the
first guess.

### Parked, on 10 August 2026, and what would reopen it

The owner's decision, and his reading of it: **it may be an anomaly of this particular unit.** That is
a reasonable candidate and it is not testable with what is here, because the spare has had an unusual
life. It was synced by Logitech's own software on 7 August 2026, deliberately hung well over a dozen
times since, and had its batteries pulled repeatedly, and it is the only unit any stranding has been
seen on. The programmed Harmony One has had nothing but reads and has never done it.

So the thread stops here rather than continuing to generate leads at a decreasing rate. **What would
reopen it is one thing: another occurrence.** If it happens again, the two facts to capture at the
moment it happens, both of which every previous occurrence lost, are how many commands the session had
sent and whether the screen still showed USB mode before anything was unplugged. The instrument for
either is `session-end-control.ts`, and the third stranding is worth more than any further round of
the ones already run.

**Do not re-derive the dead leads.** The disconnect, the hang's corruption and the charger are all
followed and all dead, and each cost a round of hardware. A future session that reads section 95 and
proposes one of them has re-derived a negative that is already here.

### Two things the baseline measured on the way

**`0x284` reads `0x0A` while it is being read**, which is the tenth state, the one `READ_MISC` itself
sets. That is section 90's closure observed again from our own code on arch 12 rather than arch 14.

**`0x315` reads `0x00` with a host attached and mid command**, and section 99 called mode 1 "USB
mode". That is loose and this tightens it: **zero is the state a serviced remote sits in**, the arm at
`0x28B1E` that falls through to the USB service call when `0x315` is zero. Mode 1 is not where a
remote lives while a host talks to it; it is the arm the loop computes afterwards, which polls the
cable and either leaves or goes round again. Nothing in section 99's chain depends on the label, since
the gate and the exit are in mode 1's body either way, but the label was wrong and is corrected here.

### What the script is for now

`packages/usb/bin/idle-flags-after-hang.ts` answered its question and cannot answer the one it was
built for. It is kept, because it is the only thing here that demonstrates the reset, and because its
baseline leg is a useful two second check that a remote's idle flags are clean. Its post-hang leg
failed with "the remote is not answering", which is now explained rather than a bug to fix: it opened
the device as soon as it enumerated, and a remote that has just reset needs longer than that.

## 101. Arch 9's screen opcodes 22 and 23 are a page select and a page transfer

An outside lead, verified here rather than adopted. On 10 August 2026 trelowney, who maintains
harmony-decompiler and published the arch 9 config this project uses as a control, wrote with two
firmware addresses and a reading of what they do, having noticed that
`docs/config-format.md` left arch 9's opcode 22 without a traced consumer.

**Decision 7 applies and was followed**: an upstream finding is a hypothesis to test. Every address
below was checked against this project's own 525 image, read off the remote on 8 August 2026, and the
dispatcher was decoded with `harmony/pic18/chains.py` rather than by eye. What came from outside is a
pointer to where to look; what is asserted here is this project's own reading of its own image.

### The dispatcher, and both handlers

`0x04650`, fourteen opcodes, and the two in question:

| opcode | handler | |
|---|---|---|
| 22 | `0x046D6` | reads one operand byte into `0xD9`, calls `0x038EC` |
| 23 | `0x046E8` | no operand, drives the panel |

```
038ec: d9 c0 c0 f0 MOVFF 0x0d9,0x0c0   ; the row index, kept
038f0: 08 0e       MOVLW 0x08
038f4: d9 03       MULWF 0x0d9
038f6: f3 cf c1 f0 MOVFF PRODL,0x0c1   ; row * 8
038fa: 07 0e       MOVLW 0x07
038fc: f3 24       ADDWF PRODL,W
038fe: c2 6f       MOVWF 0x0c2         ; row * 8 + 7
```

and opcode 23:

```
046e8: 8d 84       BSF LATE,2          ; the external latch arch 9 clocks with LATE
046ea: 89 9a       BCF LATA,5
046ee: 60 0e       MOVLW 0x60          ; 96, the panel's width
046f4: d7 6b       CLRF 0x0d7
04714: 4c ec 1c f0 CALL 0x03898        ; the transfer
04718: 89 8a       BSF LATA,5
0471a: 8d 94       BCF LATE,2
0471c: b5 ec 3a f0 CALL 0x0756a
```

### The closure the lead did not have

`0x03898` opens with two instructions that name the hardware:

```
03898: b0 0e       MOVLW 0xb0
0389c: c0 11       IORWF 0x0c0,W       ; 0xB0 | row
0389e: c1 d9       RCALL 0x03c22       ; and out to the panel
```

`0xB0 | page` is the **page address command** of the SSD1306 family of monochrome display
controllers, which address a 128 by 64 panel as eight pages of eight pixel rows. So `0xC0` is not a
row marked for later use by something else: it is a page index sent to the panel as a command, and
`0xC1` and `0xC2` are that page's first and last pixel rows, kept for whatever needs to clip to it.

That settles the open question `docs/config-format.md` recorded beside opcode 22, and it settles it
by naming the part rather than by describing the arithmetic. **Opcode 22 selects a page, opcode 23
transfers 96 pixels into it.** Eight of each per mode page is one full 96 by 64 screen, which is
exactly what section 85 measured from the data without knowing why it was eight.

### Opcode 23 is not arch 12 only, and the table said it was

The same message reported that as a stale line, and it is. Counted rather than eyeballed, over every
screen program in each container:

| sample | architecture | opcode 22 | opcode 23 |
|---|---|---|---|
| `one_config` | 12 | 330 | 268 |
| `one_config_unprogrammed` | 12 | 152 | 111 |
| `h525_config` | 9 | 1992 | 1992 |
| `h525_config_2` | 9 | 1376 | 1376 |
| the three arch 14 and the arch 8 control | 14, 8 | 0 | 0 |

**On arch 9 they are paired one to one**, which is what a select and a transfer should be, and on
arch 12 they are not, because there a call does not have to return through opcode 23 on every path.

Nothing was broken by the stale line: `packages/codec` accepts opcode 23 globally with zero operands,
so every arch 9 program has always decoded. It was the comment that drifted, which is the failure mode
step 4 of this project's own convention exists to catch and which caught nothing here because the
sweep was of the numbers, not of the words beside them.

**And two counts that look contradictory are not.** Section 85 gives 1080 opcode 22s for
`h525_config` and the table above gives 1992. The populations differ: 1080 is the mode pages, eight
per page across 135 pages, and the remaining 912 sit in programs base slot 11 addresses directly. Both
are right and neither is complete on its own, so a number quoted from either needs its population
attached. Worth stating because the earlier superseded figure for this was 912, and a reader meeting
912, 1080 and 1992 for the same opcode would reasonably conclude that two of them are wrong.

## 102. Arch 12's `0x3F` band `0xC0` is three fields and three mechanisms, and it is still placement

The largest single item left in the action list language: 424 uses on arch 12, described as
"a peripheral operation selected by operand bits 4 to 8" and marked placement only.<!--superseded--> Read here as far
as it goes, which is further than that and short of meaning, and the honest headline is that **the
reading depth figure does not move**.

### The operand is three fields, and the dispatcher states the split

`0x25330`'s arm for a high byte at or above `0xC0`:

```
2540a: c0 0e       MOVLW 0xc0
2540c: be 5d       SUBWF 0xbe,B,W      ; the operand's high byte
2540e: 01 e2       BC 0x25412
25412: 01 0e       MOVLW 0x01
25414: bd 15       ANDWF 0xbd,B,W      ; bit 0
25418: bc 6f       MOVWF 0xebc
2541c: bd 41       RRNCF 0xebd,W
2541e: 7f 0b       ANDLW 0x7f
25420: 07 0b       ANDLW 0x07          ; bits 1 to 3
25424: bb 6f       MOVWF 0xebb
25426: bd ce 00 f0 MOVFF 0xebd,0x000   ; and the whole operand, shifted four
2542a: be ce 01 f0 MOVFF 0xebe,0x001
25432: 01 32       RRCF 0x01,F         ; four times
2543a: 1f 0e       MOVLW 0x1f
2543c: 00 14       ANDWF 0x00,W        ; bits 4 to 8, five bits
```

So the instruction carries `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and the third is a **five bit
selector** rather than the four the old description implied.

### Three mechanisms behind it, and the corpus respects the bound exactly

`0x24F24` branches on the selector:

| selector | what runs |
|---|---|
| 16 | sets `LATC` bit 5 when bits 1 to 3 are nonzero, clears it when they are zero |
| 17 | copies bit 0 and bits 1 to 3 into `gprF11` and `gprF10` and jumps to the state machine at `0x23952` |
| 0 to 12 | bounded here, then `0x2492E`, which seeks and reads a **config byte** at an offset of `0x10 + 4 * bit0 + (selector >> 2)` through the address register at `0x19C` |
| 13 to 15, 18 to 31 | fall to the exit; nothing runs |

**The closure is that the corpus uses exactly the accepted values and nothing else.** Across both
Harmony One configs the selector takes 0 to 12, 16 and 17, fifteen distinct values out of a possible
thirty two, and never once one of the seventeen the handler refuses. A five bit field whose data
respects a bound stated only in the firmware is the field split confirming itself.

### The uses are boilerplate, which is what makes the rest hard

The two arch 12 configs are **identical** in this band: 106 uses each, 33 distinct field
combinations each, the same counts for each combination. One of those configs has five devices and
eight activities and the other has one and one, section 86. So nothing about this band varies with
what the remote is set up to control, and 64 of the 106 are the single combination selector 17 with
bits 1 to 3 equal to 6.

That is worth having and it is also why this stops at placement. A band whose uses do not vary with
content cannot be tied to content by comparing configs, which is the technique that named most of the
sections in this document. What it points at instead is a fixed part of the generator's output, and
naming that needs the state machine at `0x23952` read, which dispatches on bits 1 to 3 as a state
from 7 downwards and shares `LATC` bit 5 with the selector 16 case.

**`LATC` bit 5 is not identified.** Ten sites drive it, three of them inside the same subsystem as
`0x23952` and five in a routine at `0x2E53E` that runs Timer 1 with `T1CON` set to `0x1E` and toggles
the pin in a loop. That is the shape of a bit banged output,<!--superseded--> and this document has one identified
`PORTC` bit already, bit 2 as the infrared LED, section 13. Bit 5 is left unnamed rather than guessed
at, because the last time a peripheral was named from its shape here the polarity came out inverted
in three places, and a pin has no polarity to check against.

> **Section 106 names it, and the shape was misleading.** It is an enable, not a data line: it is set
> at the end of a device's power up sequence and cleared at the start of its power down, and the data
> goes over I2C through the hardware MSSP. `0x2E53E`, the loop that made it look bit banged, has no
> callers at all. The caution was still the right call, since the shape on its own would have named
> it wrong.

### One defect fixed on the way

`packages/codec` built the arch 12 band by renaming arch 14's `0xB0` entry to `0xC0`, which kept
arch 14's description sitting on arch 12's handler. Section 73 warns about exactly that, and the
warning is a few lines above the code that did it. It survived because the borrowed text was vague
enough to read as true of both. Arch 12 has its own entry now.

### What would move the number

Not this band by itself. `readingCoverage` counts placement as placement however well described, so
the One stays at 97.0%<!--superseded--> and saying otherwise would be the depth distinction this project introduced
precisely to stop that. What would move it is the state machine at `0x23952`, and that is a subsystem
rather than an opcode: eight states, a predicate at `0x23CA6`, and a peripheral nobody has named.

> **Read in section 103, and the number does move.** Selector 17 is the display's light level and
> that is a meaning, so 68 of the band's 106 uses per config leave the placement column. What
> stayed placement is selector 16 and selectors 0 to 12, and the "peripheral nobody has named" was
> two peripherals: `CVREF`, which the datasheet names for us, and `LATC` bit 5, which **section 106**
> reads as the enable of an I2C device at address 0x60 whose thirteen channels the selectors are.

## 103. The `0x3F` band `0xC0` state machine sets the display's light level, and base slot 15's twelve spare bytes are read after all

Section 102 stopped at the door of `0x23952` and said what was behind it would need a subsystem
read rather than an opcode. It did, and the subsystem turns out to be the one part of the remote's
own behaviour that the config controls end to end: four brightness levels, four pairs of device
levels, three thresholds and a fade rate, all stated by base slot 15, driving one analogue output and
one pin.

### The state machine is eight states over one variable

`0xF10` is the state, and the arms are a descending chain plus two tests above it:

| state | what it does |
|---|---|
| 7 | continues only if the light is currently on, `0x23CA6` being "is the cached level nonzero", then falls to 6 |
| 6 | re-derives the band from the measurement, `0x2346A`, then maps band 0 to 3 onto states 2 to 5 |
| 5, 4, 3, 2 | target level = the band's level, and send the band's pair of device levels |
| 1, 0 | target level = 0, which turns it off |

Every arm converges on `0x23B7E`, which saves the state in `0x112` and, when the target is nonzero,
applies it. The operand's **bit 0** picks how: `0x23BA0` sets the level in one step, `0x23C02` walks
one index at a time towards it with a delay between steps. So bit 0 is fade against snap, and bits
1 to 3 are the state, which is exactly the field split section 102 read out of the dispatcher
without knowing what either field selected.

### The level is an index into the comparator reference, and the table proves it

`0x23BA0` is nine lines of arithmetic and one store:

```
23ba0: MOVF  gprF12,W        ; the level
23ba4: SUBLW 0x1b            ; refuse anything above 27
23baa: MOVF  0x113,W         ; the cached level
23bb0: BZ    0x23c00         ; and do nothing when it has not changed
23bb2: BSF   WDTCON,4
23be2: TBLRD*                ; from 0x2EA54 + level
23be6: MOVWF CVRCON
23bf6: BSF   LATA,5          ; when the level is nonzero
23bfa: BCF   LATA,5          ; when it is zero
```

`CVRCON` is `0x0F77`, the comparator voltage reference control, and the 28 bytes at `0x2EA54` are
**not a tuned list**. `CVREF` with `CVRSS` clear takes `CVR/24` of `AVDD` in the low range and
`1/4 + CVR/32` in the high range, thirty settings for `CVR` 1 to 15 in each, three of which collide
at `0.375`, `0.5` and `0.625`. Merge the two ranges, prefer the high range on a tie, and you get 27
distinct voltages in ascending order. The table is `0x00` for off followed by exactly those 27, in
exactly that order, and the code's own ceiling of 27 is their count:

```
00  e1 e2 e3 e4 e5 e6 c1 e7 c2 e8 c3 c4 c5 ea c6 eb c7 c8 c9 ed ca ee cb cc cd ce cf
```

That is the independent numeric closure this project's standard asks for: the table is derivable
from the part's datasheet and from nothing in the config, and the derivation reproduces both the
byte order and the bound. `packages/codec` does not need the table, so it is asserted in
`tests/test_backlight.py` against the derivation rather than against a copy of itself.

**A second build carries the same routine.** The One's safe mode image, internal page `0xFE`, has
it at `0x04F16` with the same `SUBLW 0x1b`, the same `MOVWF CVRCON`, the same `LATA` bit 5, and the
same 28 bytes at `0xC0E0`. Two independently built images, one architecture; there is no arch 14 or
arch 9 equivalent, which is consistent with band `0xC0` being the one part of the second operand
space that does not port.

**Do not read the `ADSHR` window around the store as evidence.** `0xF77` is not one of the ten
shadowed addresses, so `BSF WDTCON,4` changes nothing there, and the same empty bracket appears at
`0x23440` and `0x232AE` with **no instruction at all** between the set and the clear. It is a
compiler idiom for a block that might have needed the shadow set, and a listing that treats every
occurrence as meaningful will invent a second register.

### Base slot 15 states all of it, and four groups get names

The guard `0x23262` is the one section 44 read: its first argument is a **byte offset into the
pointer array**, so offset `3 * n` reaches group `n`. Four groups feed this subsystem, and the
lengths it demands are the ones section 44 already predicted from the call sites:

| group | length | what it holds | the Harmony One's values | firmware default |
|---|---|---|---|---|
| 0 | 1 | the fade's per step delay | 44 | 50 |
| 1 | 6 | entries 2 to 5 are the four levels; entries 0 and 1 are read and discarded | 20, 20, 26, 26 | 9, 16, 24, 27 |
| 4 | 6 | three threshold pairs, two apart, that turn the measurement into a band 0 to 3 | 96, 98, 308, 310, 768, 770 | none, the band stays put |
| 9 | 6 | four pairs at `4 * band`, so band 3's pair is past the declared end. **Called timeouts here first and they are not**, section 106: both halves go straight out over I2C as device register values | 16, 16, 64, 64, 128, 128 | 64 |

Group 1's first two entries are the interesting detail: the code reads six `u16` values and keeps
the last four. Both One configs carry 38 there, which is **above the ceiling of 27**, so they could
not be levels even if something read them. Whatever they were for, nothing in this firmware reads
them.

Section 44 left group 4 as "three thresholds with hysteresis, what they threshold is not
established".<!--superseded--> What they threshold is the four sample sum of analogue channel 1, and
the hysteresis is real: inside a band the level only moves if it has crossed the whole band,
`0x2353A`.

### The twelve spare bytes are read by exactly two sites, and nothing is left over

Section 44 called them "the only untidy number here" and section 84 claimed them by position rather
than by reading. They are read, they are read by this band, and the two readers account for all
twelve:

```
group 9's declared entries    10 00 10 00 40 00 40 00 80 00 80 00
the twelve bytes above them   ff 00 ff 00  00 00 00 00  55 55 55 55
                              \________/   \_________________________/
                              band 3's     a table of two bit fields
                              pair         band 0xC0 selectors 0 to 12 index
```

`0x249A0` adds `4 * band` to the cursor and reads two `u16` values, so band 3 reads bytes 12 to 15
of a group whose header declares six entries. It gets 255 and 255, which continues 16, 64, 128 as a
ratchet upwards rather than being noise. `0x2492E`, which is band `0xC0`'s handler for selectors 0
to 12, reads a **single byte** at `0x10 + 4 * flag + (selector >> 2)` and then extracts the two bit
field `selector & 3` from it, so eight bytes hold sixteen fields per value of the flag, thirteen of
which the selector range uses. The values are `0x00` four times and `0x55` four times, which is
every field zero for the flag clear and every field one for it set.

**`flag` is bits 1 to 3, squashed to a boolean, and this section said bit 0 for a few hours.**
`0x24F6C` reads `0xEBB`, which the dispatcher filled from bits 1 to 3, tests it against zero and
normalises it to 0 or 1 before handing it on; bit 0 reaches `0x2492E` not at all. The corpus agrees
with the corrected reading and not the wrong one: every use of selectors 0 to 12 has bit 0 clear, and
they come in pairs with bits 1 to 3 zero and nonzero, which under the wrong reading would have been
the same instruction twice. The mistake is the one this project keeps recording in other forms: the
field split was read correctly out of the dispatcher and then the wrong field was carried into the
handler.

So the instruction is "set property `selector` to the state base slot 15 gives for bits 1 to 3 being
nonzero", and both One configs make that a plain on and off. What the thirteen properties are is
section 106, and it is a device rather than thirteen loose ends.

**Twelve bytes, twelve accounted for, in both One configs.** The accounting number does not move,
because section 84 had already claimed them; what moves is that arch 12's base slot 15 no longer
has a run whose only justification is that it sits between two things.

### The band it responds to is not the battery, and separating the two closes something else

There are two four sample-or-more analogue quantities in this firmware and only two analogue
channels, and the earlier reading of this subsystem had them confused.

* **Channel 0**, eight samples averaged at `0x2372A`, then compared against base slot 15 group 5 or
  group 6 at `0x238BC`, giving an **eight** level result in `0x111`. That is section 44's millivolt
  curve, and it is the battery.
* **Channel 1**, four samples summed at `0x235D2`, then group 4's three pairs at `0x234D4`, giving
  a **four** level result in `0x110`. That is what this subsystem reads.

**What channel 1 measures is not established and is deliberately not named here.** Two readings fit
and they differ only in how the sensor is wired: an ambient light sensor whose voltage rises with
light, in which case a brighter room gets a brighter screen for longer, or one whose voltage rises
in the dark, in which case a dark room does. The firmware cannot distinguish them, and this project
has already recorded what happens when a peripheral is named from its shape, section 13's inverted
polarities. It is left as "the band".

**A read only bench measurement settles it in one command, and the prediction goes here first.**
`0x110` is a single data memory byte, so `read-ram.ts --address 0x110` reads it, and covering the
sensor while the remote is on USB should move it. Three outcomes, committed before anyone looks:

1. it reads 0 to 3 and changes when the sensor is covered, which names the polarity and therefore
   the sensor;
2. it reads a plausible value and never changes, which means the sampler does not run while the
   remote is on USB, section 48's finding about the keypad applied to the analogue path;
3. it reads 0 always, which is the same conclusion with less information.

Outcomes 2 and 3 are the likely ones and they are worth having: they would say this whole subsystem
is unobservable over USB, which is a fact FreeHarmony needs about what it can and cannot show.

### What this does to the reading depth

Selector 17 is a meaning by the definition in `packages/codec/src/actions.ts`: its effect is tied to
data the config states, and an editor could put "turn the display light off", "bring it up to the
automatic level" and "fade rather than snap" in front of a user. Selector 16 and selectors 0 to 12
stay placement, because `LATC` bit 5 and the thirteen properties have no names.

So the band resolves by selector now, the way the firmware does, rather than carrying one reading
for three mechanisms. The split in each One config is 68 uses of selector 17 against 36 of
selectors 0 to 12 and 2 of selector 16, and 65 of the 68 are state 6 without a fade, which is
"bring the light up to whatever the band says". Three instructions in the whole corpus set bit 0.

## 104. `0x1F` band `0xFC` is intercepted before the dispatcher, on all four architectures

Found while asking how a band change reaches a config. `0x2346A` announces one by calling
`0x24BF0`, which pushes three bytes onto the action list queue: the code, `0xFC`, `0x1F`. The queue
is popped in the same order into operand low, operand high and opcode, so the instruction is
`0x1F` with operand `0xFC00 | code`.

`packages/codec` said that instruction does nothing. It says so because section 73 read the `0x1F`
dispatcher and its `0xFC` arm genuinely falls through to the common exit. **The dispatcher never
sees it.** The instruction fetch tests for it first:

```
24dd2: RCALL 0x24b40        ; pop three bytes
24dde: RCALL 0x24b40
24de4: MOVLW 0x1f
24de6: SUBWF 0xd46,W        ; the opcode
24de8: BNZ   0x24df8        ; not this: dispatch normally
24dea: MOVLW 0xfc
24dec: SUBWF 0xd45,W        ; the operand's high byte
24dee: BNZ   0x24df8
24df0: MOVFF 0xd44,0xeb2    ; the low byte becomes the event code
24df4: GOTO  0x24d40        ; and the dispatcher is skipped entirely
```

`0x24D40` walks the stack of active handlers downwards from `0xE19` and offers the code to each
until one accepts it. So the reading is "deliver the low byte as an event to the innermost handler
that will take it", and a table built from the dispatcher alone cannot see that.

**All four architectures do it, with the same two comparisons in the same place:** arch 12
`0x24DE4`, the Harmony 600 `0x0E752`, the Harmony 700 `0x0EB38`, the Harmony 525 `0x01BB4`. So this
is not an arch 12 divergence, unlike band `0xC0`.

**No config in the corpus uses it**, in any of the six samples, which is why nothing caught it: the
wrong reading was never exercised. That also means the correction moves no numbers. It is worth
recording anyway, because the shape of the mistake generalises: this project's rule is "read a
dispatcher, not one handler at a time", and the rule has a second half it did not state, which is
that a dispatcher is not the only thing that can consume an opcode. Anything upstream of it gets a
first look.

## 105. `PORTB` bit 1 is the charger input, and the battery curve really is millivolts

Section 44 read groups 5 and 6 as a measurement to level curve, noted that "the consumer picks
between them on a run time condition", and read them as millivolts while calling that "a conjecture
rather than a finding".<!--superseded--> The condition is readable, and so is the arithmetic the
conjecture needed.

`0x24042` is four instructions:

```
24042: MOVF  PORTB,W
24044: ANDLW 0x02
24046: BNZ   0x24050       ; PORTB<1> set: return 0
24048: MOVF  0x2d7,W
2404a: ANDLW 0x01
2404e: BZ    0x24052       ; and a software flag clear: return 1
```

`0x238A2` uses the answer to choose group 6 when it is 1 and group 5 when it is 0. So the polarity is
stated: **`PORTB` bit 1 clear is charging.**

### The scale is millivolts per count, and the trim word is per unit

Section 44 wanted a meter on a board. It does not need one, because the conversion is arithmetic and
every constant in it is readable.

`0x2372A` sums **eight** samples of analogue channel 0 and shifts right three, so it holds a mean in
0 to 1023. Then two words come out of flash through the helper at `0x2E70A`, which is nothing but
"read a `u16` at a fixed address":

| routine | address | value |
|---|---|---|
| `0x231B0` | `0x01F580` | 4, on both Harmony Ones |
| `0x231CE` | `0x01F582` | 18724 on one unit, 18416 on the other |
| `0x231EC` | `0x01F5C0` | 94, on both |
| `0x2320A` | `0x01F5C2` | `0xFFFF`, on both |

The caller tests each for `0xFFFF` and substitutes 1, so an erased word means "not calibrated". Then
`0x2E874` multiplies, twice, and the result is

```
millivolts = mean * word(0x01F580) + ((mean * word(0x01F582)) >> 16)
```

which is `mean * (4 + 18724/65536)`, or **4.2857 mV a count**. Full scale is then 4384 mV, and that
is the closure: the curve runs 3000 to 4051, which needs 700 to 945 counts of the 1023 available, so
the whole of a lithium cell's range fits with headroom and nothing else does. A scale of 4 would put
a full cell off the top of the curve and a scale of 8 would put an empty one below its bottom.

**And the firmware compares the result against a literal in the same units.** At `0x2385C` it tests
the result against `0x0D48`, which is 3400, with the charger absent, and raises a flag. 3400 mV is a
low battery warning for a single lithium cell, it sits inside the config's own curve, and it is a
constant in the code rather than anything a config states. Two numbers in the same units, one from
the config and one from the firmware, agreeing about what a battery is.

So section 44's conjecture is a finding. Five things support it and none of them is the shape of the
numbers: the eight sample mean, the scale word, the second word's per unit trim, the literal at 3400,
and the curve pair.

### The trim word was already in the lab, filed as unidentified

**A claim written earlier in this section said nothing here had read those four words, and that was
wrong.** The reasoning was that the arch 12 dumps cover flash `0x000000` to `0x010000` and
`0x020000` upwards, so `0x01F580` falls in the gap. It does, in **external** flash. The processor's
`TBLPTR` does not reach external flash there: this part has 128 KiB of on-chip program memory at
`0x000000` to `0x01FFFF`, and only addresses above it go out on the external bus, which is why the
application lives at `0x020000`. So `0x01F580` is **internal**, page `0xFF` offset `0xF580`, and both
Harmony Ones' `0xFF` pages have been read in full.

That is worth stating as a hazard rather than as a slip. **The same numeric address names two
different memories depending on who asks.** A `TBLRD` at `0x01F580` reads on-chip flash; a
`READ_FLASH` over USB at `0x01F580` reads the external part and answers `0xFF`, because the internal
window is reached by the top address byte `0xFF` instead. Both are correct and they disagree, and
`docs/memory-map-one.md` lists them as separate rows without saying they overlap.

`docs/memory-map-one.md` already had these bytes, as two rows reading "unidentified": `0xFF`
`+0xF580`, four bytes, and `0xFF` `+0xF5C0`, two. It also already recorded that two Harmony Ones
differ in 39 bytes and that `+0xF582` is one of the three places they do. Which is exactly what a per
unit calibration trim would look like, and nothing had connected the two facts.

Publishing these four values is deliberate. They are instrument calibration and not identity: the
identity block is `+0xF400` and is never published here, and the page's other per unit record at
`+0xF640` is already quoted in the memory map on the same reasoning.

### What is still not established

The word at `0x01F5C0`, 94 on both units, and its partner at `0x01F5C2`, which is erased on both so
its consumer runs on the substituted 1. Both are read by the same helper and neither has a caller
traced here. And what the flag `0x2385C` raises at 3400 mV is used for.

## 106. `LATC` bit 5 enables an I2C device, and band `0xC0`'s thirteen properties are its channels

Three loose ends left by sections 102 and 103: an unnamed pin, thirteen unnamed properties, and the
loop at `0x2E53E` that also drives the pin. They are one thing, and following the pin found it.

### The bus is I2C, in hardware, and only on arch 12

`0x2D2E6` writes and `0x2D32E` reads through `0x2DCCC` and `0x2DD0E`, which are not bit banging at
all. They drive the MSSP: `SSP1CON2` bit 0 for a start, bit 1 for a repeated start, bit 2 for a stop,
bits 4 and 5 for the acknowledge, `SSP1BUF` for the byte, `SSP1STAT` bit 0 for buffer full and
`SSP1CON1` bit 7 for a write collision. That is the I2C master, and the address byte is `0xC0` to
write and `0xC1` to read, so the device is at **7 bit address 0x60**.

**The same peripheral is in a different mode on arch 14, and counting the registers says so.** The
Harmony One's image touches `SSP1CON2` ten times; the Harmony 600's and the 700's touch it **not at
all** and use `SSP1BUF` six times each. `SSP1CON2` exists only for I2C, so arch 14 runs the MSSP as
SPI, which is exactly what section 8's config read primitive at `0x1B9AC` needs. So the reason band
`0xC0` is arch 12 only is not a quirk of the opcode table: **the device it talks to is arch 12 only**,
and there is no bus free to talk to one on arch 14.

### What the device looks like from the firmware's side

Everything written to it, and nothing is ever read:

| what | where from | register | values seen |
|---|---|---|---|
| thirteen two bit channel states | `0x2D254`, 40 call sites | a RAM bitmap at `0x259`, then the device | 0, 1 and 2 |
| an eight bit level | `0x249A0`, from base slot 15 group 9 | 2 and 3, high byte first | 16, 64, 128, 255 by band |
| a second eight bit level | `0x249A0`, the pair's other half | 4 and 5 | the same values |
| an eight bit level | `0x23D1C`, computed | 2 and 3 | 3, 15, 63, 255 |
| its enable | `0x23DF0` and band `0xC0` selector 16 | `LATC` bit 5 | set on, clear off |

`0x23DF0` is the on and off sequence, and it is where the pin gets its name. Powering up calls
`0x23E52` and `0x23F10`, which set channels to 1, and then **sets** the pin. Powering down calls
`0x23E0C` for channels 12 down to 8 and `0x23EA2` for 0 up to 7, all thirteen to 0, and then
**clears** it. A pin set at the end of a device's
initialisation and cleared at the start of its shutdown is that device's enable, and that is as far as
naming it goes here.

**The firmware's own four levels are a logarithmic ladder.** `0x23CB2` with its argument 2 to 5
computes `0xFF >> (2 * (5 - argument))`, which is 3, 15, 63 and 255, and writes it to registers 2 and
3 with every channel enabled. Group 9's four values, 16, 64, 128 and 255, are the same shape from the
config: four steps ending at full scale, spaced so the low end is finely divided. Two independent
sources agreeing on the range and the top of it is what makes 255 full scale rather than a
coincidence.

### Group 9 is not four timeouts, and section 103 said it was

`0x249A0` reads group 9's pair for the band and does exactly two things with it: sends the first half
to registers 2 and 3 and the second to 4 and 5. There is no countdown, no scheduler entry and no
comparison. **So "timeout" was wrong**, and it was inferred from the values ascending 16, 64, 128, 255
and from the routine sitting inside the display light's states. Corrected in place in section 103.

The structure the section derived from it is untouched: four bytes a band, band 3's pair in the spare
run, twelve bytes accounted for. Only the name of the thing was wrong, which is the failure mode this
document's own rule about naming a section by its consumer exists to prevent. The consumer was one
call deeper than the reading went.

### Most of the subsystem is unreachable, and the config is what switches it on

This is the part worth carrying into the application.

* **`0x23CB2` is only ever called with its argument zero**, from `0x28CAE` and `0x2C9A6`, both
  shutdown paths. `gprF14` is written nowhere else in the image. So of `0x23DF0`'s two arms only the
  power-down one runs, and `0x23E52`, `0x23F10` and the four level ladder at `0x23D00` are
  unreachable.
* **`0x2D32E`, the I2C read, has no callers at all.** The device is write only in this build.
* **`0x2E53E` has no callers either**, and its one variable `0x303` is read there and written nowhere.
  It starts Timer 1 from the 32.768 kHz oscillator, `T1CON` `0x1E` giving 16384 Hz after the 1:2
  prescale, and then loops forever driving `LATC` bit 5 from bits of `TMR1H`. Bit 6 of the high byte
  is timer bit 14, which at that rate toggles every two seconds. It is dead code that would have
  blinked the device's enable, and it is the routine whose shape made section 102 read the pin as a
  bit banged output rather than as an enable.

So the firmware turns this device **off** at shutdown and never turns it on. Everything that switches
it on or sets a channel comes from a config, through band `0xC0` selectors 16 and 0 to 12, and
everything that sets its level comes from a config, through selector 17 and group 9.

**That answers a question section 102 raised and could not settle.** It asked why the band's uses are
identical in both One configs when one has five devices and eight activities and the other has one and
one, and treated it as a dead end for naming. The reason is that they are not content at all: they are
the generator's fixed initialisation sequence for this device, emitted into every config, one pass
setting each of the thirteen channels off and one setting each on. A config that omitted them would
leave the device disabled, which is a rail a writer has to respect and could not have guessed.

### What is not established

**Which device it is.** Thirteen channels of three states, two eight bit level registers, an enable
pin and no readback is the shape of an LED driver, and on this remote the obvious load is the keypad
backlight, dimmed by the same band that dims the screen. **That is an inference and it is not
confirmed**, so the documents say "the device at 0x60". Naming a peripheral from its shape is what
inverted three polarities in section 13, and a part number guessed from a register map cannot be
checked against anything here.

What would settle it: the address, the register numbers and the value ranges are enough to identify
the part from a datasheet search, and a photograph of the board would do it outright. Neither is
firmware work.

## 107. The action list language has multiply, divide and modulo, and the block one of them sits in is arch 14 only

`0x6E` was the last opcode in the corpus with no reading at all, six instructions in three configs.
Reading it took one arm of one dispatcher and turned over four other things, which is the third time
in this document that following the cheapest remaining item was worth more than choosing a target by
size.

### One helper, two answers

The arm at `0x0F01C` on the Harmony 700 copies the accumulator and the operand into a scratch frame,
calls `0x1BAF6`, and stores what comes back into the accumulator. `0x1BAF6` is a **restoring binary
division**: sixteen iterations of a 32 bit shift left, a trial subtract of the divisor from the high
half, and on no borrow a real subtract plus a set of the quotient's low bit. So the quotient is built
in the dividend's own registers as it shifts out, and the remainder is left above it.

`0x77`, twelve instructions higher in the same ladder, calls **the same routine** and takes `0x020`,
the quotient. `0x6E` takes `0x01C`, the remainder. That is the whole difference between the two
opcodes, and it is what makes both readings safe rather than one:

| opcode | helper | result slot | what it is |
|---|---|---|---|
| `0x77` | `0x1BAF6` | `0x020`, the dividend's own registers | accumulator divided by the operand |
| `0x6E` | `0x1BAF6` | `0x01C`, above it | accumulator modulo the operand |
| `0x78` | `0x1B23C` | `0x01E` | accumulator times the operand, low sixteen bits |

`0x1B23C` is a 16 by 16 multiply into 32 bits, four `MULWF` partial products added with carry, and
`0x78` takes only the low word. **Section 34 had `0x77` and `0x78` as "an accumulator operation
through a helper", a placement**, because it found the arms and not the helpers. Both are meanings
now.

**The argument frame is one frame and its order is the same in all four images**: the remainder
lowest, then the product's low word, then the dividend, then the divisor. Different addresses per
build, same order, which is what says the three opcodes share the compiler's arithmetic frame rather
than each having its own.

**A zero operand is defined, not a trap.** The loop always runs sixteen iterations, so nothing hangs:
a divisor of zero makes every trial subtract succeed, which leaves `0xFFFF` in the quotient and the
dividend itself in the remainder. A writer gets no error and no useful answer.

### The block is arch 14 only, and that is the second divergence in the language

`0x6E` sits inside `0x65` to `0x6E`, the accumulator machine section 71 read. On the Harmony One the
same descending ladder tests **every one of those ten opcodes** and branches to the dispatcher's
common exit at `0x25892`, doing nothing: `0x6E` at `0x25302`, `0x6D` at `0x2530A`, `0x6B` at
`0x25312` covering `0x6B` and `0x6C`, `0x6A`, `0x69`, and `0x68` at `0x2532A` with no test below it
so `0x65` to `0x68` land there too. The 525 is the same and shorter: its ladder stops at `0x6F` and
everything below falls to `0x023E4`.

So the shift, the boolean operations, the device record writer and the modulo are all arch 14's, and
the reading table has to answer per architecture. **That is the second structure in this format that
is not one table across architectures**, after arch 12's `0x3F` band `0xC0`, section 102, and the two
are unrelated: one is a band inside an opcode, this is ten whole opcodes.

**The corpus agrees without being asked.** Of the eleven opcodes `0x65` to `0x6F`, exactly two are
used anywhere: `0x6C` 7552 times and `0x6E` six times, both on arch 14 only, and no arch 8, 9 or 12
config touches one. A generator emitting an instruction its target ignores is the kind of thing that
would show up here, and it does not.

### `0x6F` is a no-op with a mechanism

The arm above `0x6E` reads the accumulator, ORs its two bytes to test for zero, and then branches to
the dispatcher's exit **from both arms of the test**. It is on all three architectures whose firmware
we hold, identically. No config uses it. A compiler emitted a comparison whose two outcomes are the
same code, which is what an empty `if` compiles to, so the instruction is a defined nothing and not
an unread one.

### `0x70` and `0x71` are eight operations, not one

Both opcodes reach one handler, which reads the state variable the operand's low byte names and then
dispatches on the **low nibble of the operand's high byte** through an `XORLW` chain: `0x0EEAE` on
the 700 and `0x25198` on the One, the same chain.

| nibble | what it does |
|---|---|
| 0, 1 | condition: the left side is equal to, and is not equal to, the variable |
| 2, 3 | condition: greater than, and less than |
| 4, 5 | condition: greater than or equal to, and less than or equal to |
| 6 | the left side **is added to** the variable, clamped to its stated range |
| 7 | the same, negated first, so **subtracted from** it |
| 8 to 15 | nothing: no arm of the chain, after the variable has been read |

**The order is `docs/config-format.md`'s, from section 34, and checking it against that document is
what caught a slip here**: the chain tests nibble 7 first and falls through to nibble 0, so pairing
its `BZ` targets with nibbles in the order they appear puts 3, 4 and 5 in the wrong places. The first
draft of this section did exactly that, and the earlier document was right.

The left side is the accumulator for `0x70` and a byte register for `0x71`. Six comparisons in
complementary pairs is a complete set, which is the closure on the chain; nibble 7 negates by
multiplying by `0xFFFF` and then reaches nibble 6's writer, which reads the variable, adds and
clamps against the range base slot 13 states.

**Section 34 called both opcodes "compare".** Six of the eight are, and the corpus uses nibbles 0 to
5 for 2353 instructions against 9 for nibble 7, with nibble 6 and the dead nibbles never emitted at
all. But the nine are load bearing: they are what a
generator builds a remainder out of, so the wrong name hid the rest of this section.

### What the six instructions are for

The corpus idiom is eight instructions and identical in all three arch 14 configs bar the variable
numbers:

```
accumulator = X                 the value being edited
scratch = accumulator           save it
accumulator = X
accumulator = X mod n           n is 5 or 10
call a list holding one instruction: scratch = scratch - accumulator
accumulator = scratch
X = accumulator
```

So `X` becomes `X - (X mod n)`, the largest multiple of `n` at or below it. **What `X` is comes out of
the config rather than the firmware**: every other list touching it copies it to or from a state
variable whose base slot 0 name is a device's inter device delay for the `n` of 5 and its power on
delay for the `n` of 10, and two more lists step the same variable up by that `n` and down by it.
Three configs, two models, six instances, and the modulus equals the step every time. The instruction
snaps a delay onto the grid its plus and minus buttons move on.

### The closure is an identity, and the other architectures supply the other half

Arch 8 and arch 12 have no modulo, and their generator computes a remainder anyway:

```
accumulator = accumulator / n
accumulator = accumulator * n
call a list holding one instruction: variable = variable - accumulator
```

which is `x - (x / n) * n`, the remainder. **Every multiply in the corpus is the second half of that
pair**: eight multiplies, eight preceded by a divide with the same operand, in four arch 8 configs
and two arch 12 ones. Arch 14 uses neither opcode and reaches for `0x6E`.

So the two generations of generator compute the two halves of `x = (x / n) * n + (x mod n)`, each
with a subtract and the primitive its architecture has. Reading either confirms the other, and
neither reading can be an accident of one image, because the identity is arithmetic and the two
idioms were emitted by different software for different remotes.

### Where it leaves the number

The step 6 depth number has no unread instructions left anywhere in the corpus. `0x6E` was the last,
and `make reading` prints zero:

| | before section 107 | after |
|---|---|---|
| meaning | 98.2% | 98.4%<!--fact:reading_meaning--> |
| placement | 1.8% | 1.6%<!--fact:reading_placement--> |
| no reading at all | 6 instructions | 0<!--fact:reading_unread--> |

Per architecture the divide and multiply move arch 8 the furthest, from 97.6% to
98.1%<!--fact:reading_arch8-->, because 76 of its 116 corpus divides are its own. Arch 12 goes to
98.5%<!--fact:reading_arch12-->, arch 14 stays at 98.5%<!--fact:reading_arch14--> and arch 9 stays at
96.0%<!--fact:reading_arch9--> since it uses none of these opcodes at all.

### What is not established

**What the remaining placement is.** 1.6% of the corpus, and most of it is arch 12's `0x3F` band
`0xC0` selectors 0 to 12 and 16, which section 106 read as far as the firmware allows: the channels
of a device nobody has named.

**`0x65`, `0x66` and `0x76`.** Section 71 names a handler for each and no config in the corpus uses
one, so they cost the number nothing and are left alone deliberately. `0x66` and `0x65` share
`0x0F146`, which passes the operand to `0x159F4`; `0x76` passes it to `0x16A34`.

**Why the block is arch 14 only.** The plausible reading is that it was added for the generator that
produced the 600 and 700 configs and never backported, since arch 8 is older and arch 9 older still,
and the arch 12 firmware carries the ladder entries without the code. Nothing here tests that, and
the One's own firmware is younger than the 700's by version number alone.

## 108. The diagnostic channel writes to the serial flash, and the arch 14 firmware sizes the chip itself

Three opcodes were left with a handler and no reading: `0x65`, `0x66` and `0x76`. No config in the
corpus uses one, so they cost the depth number nothing, which is exactly why they were still there.
Reading them settled an open item that four other routes had only bounded.

### `0x65` and `0x66` append to a region of the external flash

Their arm is six instructions and they share it. `0x66` puts the operand's **high** byte in `0x0FC`
and calls `0x159F4`; `0x65` puts the **low** byte there, calls the same routine, and then **falls
through into `0x66`'s arm**, so one opcode sends two bytes and the other one, out of the same code.

`0x159F4` is the routine section 73 already found from the other side and called "a diagnostic
channel", because `0x0F`'s `0xE0` band feeds it fixed byte patterns. Followed to the end it is a
**write to the external serial flash**, one byte at a time:

| routine | command | what |
|---|---|---|
| `0x18D98` | `0x03` | READ, then the three address bytes out of `TBLPTR`, high first |
| `0x18DBC` | | one byte in, `0x1B9AC`, the config read primitive of section 8 |
| `0x18DEA` | `0x02` | PAGE PROGRAM: the address, one byte, then poll `0x05` until bit 0 clears |
| `0x18DC0` | `0xD8` | BLOCK ERASE, with the same poll |
| `0x18D30` | `0x9F` | READ ID, three bytes back |

So the SPI vocabulary is five commands, and `LATF` **bit 7 is the chip select**: `0x18CEC` is a
`BSF` followed by a `BCF`, a deassert then an assert, which is what frames every one of them.
`TBLPTR` is the cursor into the serial flash rather than into program memory, which is the second
half of an upstream hypothesis this project had listed as worth checking; the first half named
`LATE` bit 2 as the chip select, on arch 9, and on arch 14 it is `LATF` bit 7.

**An action list can therefore make a remote write to its own flash.** That is a rail rather than a
curiosity, and the flag it sits behind is not in the config: it is whether the region exists at all.

### The region is computed, not declared, and base slot 2 does not decide it

`0x159F4` reads five values and returns without writing if either the region's start or its size is
zero. Those two come from `0x15D3A`, which allocates:

* **upper bound**: the detected chip size, `0x688`;
* **lower bound**: the container header's `end_addr` at offset 4, plus three, so the first byte after
  the config's end marker;
* **size**: the largest `N * 64 KiB` for `N` from 8 down to 2 that fits below the upper bound and
  still starts above the lower one. 64 KiB is the erase block of the parts it identifies.

The region is the top of the chip. **Section 47's base slot 2 declares 128 KiB at `0x1E0000` in both
arch 14 user configs, and this allocator would compute 512 KiB at `0x180000` for the same configs**,
because eight blocks fit above a config that ends around `0x120000`. So the two do not agree, and the
census that section ran, no seek of slot 2 anywhere in the arch 14 image, now has a mechanism rather
than only a count: **the remote does not read the reservation, it makes its own.** A writer must not
assume the two describe the same bytes.

### The chip size comes from a JEDEC id, and 2 MiB is the largest the firmware knows

`0x18D30` sends `0x9F` and reads three bytes; the firmware keeps the capacity code and the
manufacturer id and compares them against a table of accepted pairs. Each arm stores the **high byte
of a 24 bit size**:

| capacity code | size | manufacturers accepted |
|---|---|---|
| `0x13` | `0x080000`, 512 KiB | `0x20` ST, `0x1C` EON |
| `0x14` | `0x100000`, 1 MiB | `0xC2` Macronix, `0x1C` EON |
| `0x15` | `0x200000`, **2 MiB** | `0xC2` Macronix, `0x1C` EON, `0xEF` Winbond |

Anything else leaves the size **zero**, which disables the journal and nothing else, since config
reads address the flash through `TBLPTR` directly.

**This corroborates section 88 and does not settle anything, because section 88 already did.** That
section closed the arch 14 flash size at 2 MiB from the address validator's own literal and a live
600, and named the part on the board: an EON F16, 16 Mbit. The table here is the same firmware's list
of parts it will accept, derived independently, and **the pair it accepts at 2 MiB includes EON**,
`0x1C` with capacity `0x15`, which is that part. So the identification table and the validator agree,
and a 4 MiB chip would be one this remote's own firmware cannot identify.

**`CLAUDE.md` still listed the size as open**, which is drift of exactly the kind step 4 of the
finding rule exists to stop: section 88 answered it on 9 August 2026 and the summary was never swept.
Removed in the same commit as this section.

**Three images, and the table is per build.** The Harmony 700 and the 650 accept the same seven
(capacity, manufacturer) pairs, at almost the same address. The Harmony 600's table is elsewhere and
accepts six of the seven, dropping EON at 1 MiB. So the list is a build time choice and one image
would have made it look like a constant; what all three agree on is where it stops.

### `0x76` positions a cursor and nothing names what it walks

`0x16A34` keeps a sixteen bit index at `0xF23` and a flash cursor at `0xF25`. Given a new index it
reads the index-th **three byte pointer** of an array, through the same `index * 3` helper the six
counted pointer arrays use, starts a read there and remembers the index so a later instruction walks
forward instead of restarting. Records end at `0xFEFE` and the reader takes `0x2A` bytes at a time.

Which array is **not established**. It is not reached through the section seeker in this routine, and
no config uses the opcode, so there is nothing to compare against. Placement, deliberately, and named
in the reading table by what it does rather than by what it does it to.

### The second dispatcher tests ranges, not four opcodes

Found while checking where `0x65` sits in the ladder, and it is a correction to this project's own
table. `0x0F160` on the 700 and `0x25330` on the One are the same descending pair of comparisons: at
or above `0x3F` takes the `0x3F` bands, at or above `0x1F` the `0x1F` bands, at or above `0x0F` the
`0x0F` bands, and the rest the `0x07` ones. So **`0x20` behaves exactly like `0x1F`** and `0x40` like
`0x3F`.

`packages/codec` resolved those four as exact cases and answered "no reading at all" for every other
value in the range. Every config in the corpus emits only the canonical four, which is why the number
never noticed, and it was still a wrong claim about the firmware. With the ranges in place **no
opcode anywhere returns "no reading at all"**, on any architecture.

### Where it leaves the table

Every opcode in `0x65` to `0x7F` has a reading, every band below `0x65` has one, and the third state
the depth distinction allows for is now unreachable. The number does not move, because nothing in the
corpus uses the three opcodes this section read, and that is the point worth keeping: **a placement
nobody exercises is where a wrong reading survives longest.**

This is the third structure in the position section 39's number sender and section 47's log ladder
are in: firmware that exists, is reachable, and that Logitech's generator never emitted. Three of
them now, all in the same subsystem family, which starts to look less like an accident and more like
a facility the host software used during development and never shipped.

### What is not established

**What is in the journal.** The bytes an appender sends are whatever the instruction carries, and
`0x0F`'s `0xE0` band sends fixed patterns like `0xAA 0xAA` and `3 2 1`. Nothing reads the region back
on the remote, so what is written is only meaningful to whoever reads the chip afterwards.

**Whether any region exists on a real remote.** The allocator needs a recognised chip and a config
whose end leaves at least two blocks free, and both bench remotes' configs do. Reading `0x1E0000` or
`0x180000` off the 600 over USB would say whether either region has ever been written; that read has
not been done and it is read only.

**Which array `0x76` walks**, above.

## 109. What the flash journal holds on a real remote

Section 108 read a writer and could not say whether anything has ever gone through it. A Harmony 600
is on the bench, so this section is written in two halves: the predictions first, committed before any
read, and then what the remote said. The convention is the `probe-remote` skill's, and it exists
because a measurement that confirms a number nobody committed to in advance is worth much less.

### What the arithmetic says about this unit

The 600's own config, from the lab dump that is verified byte for byte against the device:

| | value |
|---|---|
| `endAddr`, the trailing `PTYY` marker | `0x0E4361` |
| the allocator's floor, `endAddr + 3` | `0x0E4364` |
| the chip size, section 88's EON F16 | `0x200000` |
| **the region section 108's allocator computes** | `[0x180000, 0x200000)`, eight blocks, 512 KiB |
| **the region base slot 2 declares** | `[0x1E0000, 0x200000)`, capacity 16384, stride 8, 128 KiB |

Eight blocks is the allocator's maximum and it fits, because the config ends more than 512 KiB below
the top of a 2 MiB part. So the two regions share a limit and disagree about the start, which is what
section 108 argued from the firmware alone.

### The predictions

1. **A window at `0x0E4358` matches the lab dump for its first thirteen bytes**, with `PTYY` at
   offset 9, and its **last three bytes read `0xFF`**. That is the calibration case: it is the only
   read here whose answer is already known, it proves the address arithmetic and the read path
   together, and its tail is the first byte of evidence about what is above a config.
2. **`0x180000` reads sixteen `0xFF` bytes.** Nothing has ever been appended, because the appender is
   reached only from `0x0F`'s `0xE0` band and from `0x65` and `0x66`, and **no config in the corpus
   emits any of the three**. If it is not erased, something writes it that section 108 did not find,
   and that is the outcome worth having.
3. **`0x1E0000` reads sixteen `0xFF` bytes**, for the same reason and also because nothing on arch 14
   reads base slot 2 at all.
4. **The two windows are identical**, which is what `--compare` reports, and which also says the part
   is not aliasing one address onto the other.

What would falsify the section rather than a prediction: a mismatch in the first window. The whole
allocator argument is arithmetic on `endAddr`, so if the control does not land where it is computed to
land, nothing else measured here means anything.

### What the remote said

A Harmony 600 on the bench, 10 August 2026, read only, thirteen windows of sixteen bytes each.
`GET_VERSION` first as the go/no-go, which returned `02 11 1c 15 e0 47 0c 02 00 00 02 02`, byte for
byte what sections 87 and 88 already record for this unit.

| address | result |
|---|---|
| `0x0E4358` | `00 00 00 00 00 00 00 49 d3 50 54 59 59 ff ff ff`: the lab dump's last thirteen bytes, `PTYY` at offset 9, then three erased |
| `0x180000` | sixteen `0xFF` |
| `0x1E0000` | sixteen `0xFF`, and `--compare` says identical |
| `0x030000` | `47 53 50 4d ...`, the `GSPM` cookie |
| `0x0E4368`, `0x0F0000`, `0x100000`, `0x140000`, `0x190000`, `0x1C0000`, `0x1FFFF0` | sixteen `0xFF` each |

**All four predictions hold.** The control landed exactly where the arithmetic put it, which is the
one that had to; both candidate regions are erased; and nothing anywhere above the config has ever
been written, from three bytes past the end marker to the last sixteen bytes of the chip. So the
journal exists in the firmware and has never been used on this remote, which is what a facility no
config reaches should look like.

**One prediction was badly framed and saying so is the point of writing them down.** Prediction 4
claimed that two identical windows also showed the part is not aliasing one address onto the other.
Two **erased** windows are identical whatever the part does, so it showed nothing. The test that does
work needs content on one side: `0x0E4358` against `0x1E4358`, the same offset one megabyte up, came
back **different**, and `0x030000` answering with a cookie is what makes an `0xFF` window information
rather than the tool's default.

### The flash id in `GET_VERSION` is the JEDEC id, and its two bytes are the wrong way round

Not predicted, and it fell out of the version reply that was only meant to be a go/no-go.

`docs/usb-protocol.md` had already traced field accessor `0x14244`: it clears `LATF` bit 7 and calls
`0x10974` for a sixteen bit result, and recorded that the corpus already had the pair per remote as a
manufacturer and a device byte,<!--superseded--> which is concordance's naming. `0x10974` is the routine section
108 read: it sends `0x9F`, keeps two of the three bytes in `0x686` and `0x687`, and those two are the
only sources in the image for the version block's pair. So the field is **the JEDEC id read over SPI
at the moment the version block is built**, and the split is not manufacturer and device:

| byte | on this 600 | what it is |
|---|---|---|
| `0x686`, version field 3 | `0x15` | the **capacity code**, which the firmware compares against `0x13`, `0x14` and `0x15` to choose 512 KiB, 1 MiB or 2 MiB |
| `0x687`, version field 2 | `0x1C` | the **manufacturer id**, EON |

The mechanism is what settles it rather than the convention: one byte selects a size and the other
does not, and only the capacity code can select a size. `0x1C` is EON's registered id and `0x15` is
the 16 Mbit capacity code in the family these parts come from.

**So the bench 600 reports the pair `(EON, 16 Mbit)` and section 108's table accepts exactly that
pair at 2 MiB.** Section 88 identified the same part from a different direction, the address
validator's own ceiling plus which addresses the remote refuses. Three routes, one part, and this one
is the remote saying it over USB.

### Where it lands

* `docs/usb-protocol.md`, the field pair renamed, and `packages/usb/test/hardware.test.ts`, whose
  comment on those two fields carried concordance's split.
* `packages/usb/test/hardware.test.ts`: the two regions read and asserted erased, gated on the
  hardware flag and on the 600 being attached.
* `tests/test_interpreter.py`, `TestTheLogArea`: the allocator's arithmetic on each arch 14 **user**
  config, against what base slot 2 declares, plus the marker's position, which is the half of the
  measurement that can be checked without a remote.

**One thing the test found on the way**, and it sharpens what slot 2 is. The three arch 14 **safe
mode** containers declare a limit of `0x100000` where the user configs declare `0x200000`. So the
declared limit is the **generator's** idea of the chip size, not the remote's: those images were built
for a 1 MiB part. That is consistent with the section being host side reservation, and it is why the
comparison above is restricted to user configs.

## 110. The journal's own variables on a running remote

Section 109 read the flash and found the region erased, which says nothing about whether the firmware
ever computed a region at all. The four variables the allocator writes are in data memory, and
`READ_MISC` reads data memory off a running remote. So the arithmetic section 108 derived can be
compared against what the remote actually holds, which is a stronger check than an erased window.

Predictions first and committed before the read, per the `probe-remote` skill.

### The three states the read can distinguish

The setup is two independent steps, which is what makes one window informative rather than a coin
flip:

* **the container check**, `0x164B4`: reads the config's four byte marker, compares it against
  `4C 57 4A 4C`, which is `LWJL`, and only then takes the header's `end_addr` at offset 4 and stores
  `end_addr + 3` into `0x0F9` as the allocator's floor;
* **the journal init**, `0x1594A`, called once from `0x1623C`: clears `0x0F0` to `0x0F8` and calls the
  allocator, which fills `0x0F3` with the region's start and `0x0F6` with its size.

So the window says which of the two ran:

| what the window shows | what it means |
|---|---|
| floor set, region set | both ran, and section 108's arithmetic can be compared against the values |
| floor set, region zero | the config was validated and the journal was never set up |
| both zero | neither ran, and USB mode skips more of the config load than this project assumed |

### The predictions

All four values are 24 bit and **little endian, low byte at the lowest address**, which is how the
allocator stores them.

| address | predicted | what it is |
|---|---|---|
| `0x0F3` | `00 00 18` | the region's start, `0x180000` |
| `0x0F6` | `00 00 08` | its size, `0x080000`, eight blocks |
| `0x0F9` | `64 43 0E` | the floor, `0x0E4364`, this unit's `end_addr` plus three |
| `0x688` | `00 00 20` | the chip size, `0x200000`, from the JEDEC capacity code |
| `0x68E` bit 4 | clear | the container base selector: clear is the user config at `0x030000`, set is safe mode |

**What is expected, and it is not confident.** The chip identification demonstrably runs on USB,
because the version block carries the JEDEC pair section 109 measured, so `0x688` is the most likely
of the five to be set. The config load is the uncertain one: a remote on USB never runs its
application, section 48, and whether it validates and loads a config on the way to USB mode has never
been established here. So the honest expectation is `0x688` set and the other four unknown, and the
value of the read is in which of the three states above comes back.

**What would falsify section 108 rather than a prediction.** If `0x0F3` and `0x0F6` are set to
anything other than `0x180000` and `0x080000`, the allocator has been misread. That is the outcome
worth most, and it is the reason this read is worth a commit before it happens.

### What the remote said

Not yet measured.

## References

* concordance: https://github.com/jaymzh/concordance
* harmony-decompiler discussions: https://github.com/trelowney/harmony-decompiler/discussions
* firmware and legacy software archive: https://www.harmonyremoterepair.com/software-firmware.html
