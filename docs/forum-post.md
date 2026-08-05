# The firmware is PIC18 and it disassembles: load addresses for arch 12 and arch 14, and why every firmware dump so far has been useless

Intended for discussion #7 (Reverse Engineering Firmware / Ghidra). Sections 6 and 7
belong more naturally in #1 and #6, so split them off if that is tidier.

> **This analysis was produced by Claude (Anthropic's AI)** from dumps and archived firmware
> files, not by a human reading the disassembly. That matters for how you read it, so there
> is a full note on provenance, method and what to double-check under "Who wrote this" below.
> Short version: it is all offline analysis of files, so all of it is independently
> verifiable, and it should be verified.

---

@glenharris was right in #7: it is a Microchip PIC, specifically PIC18, and it is
compiled C with a little hand-written assembly. I have now confirmed that and pinned
down the load addresses, so the images can go straight into Ghidra.

The reason nobody had got anywhere is that `concordance --dump-firmware` does not give
you usable code, and it fails differently on the two architectures I have:

* **arch 12 (Harmony One)**: the dump contains **no code at all**. It returns a small
  GSPM config container. The application lives at flash `0x020000`, which concordance
  never reads.
* **arch 14 (Harmony 600 / 700)**: the dump **is** real PIC18 code, but it is silently
  truncated. The image is 70336 bytes on the 600 and 76672 on the 700, against a
  `FIRMWARE_MAX_SIZE` of 65536. The missing tail contains the entry point.

Load addresses:

| Image | Size | Execution base | Entry point |
|---|---|---|---|
| Harmony One 3.4 | 60050 (`0xEA92`) | `0x020000` | `0x02EA38` |
| Harmony 600 0.2 | 70336 (`0x112C0`) | `0x009000` | `0x01A26E` |
| Harmony 700 2.8 | 76672 (`0x12B80`) | `0x009000` | `0x01BB38` |

Source material: concordance 1.5 dumps of a Harmony One (fw 3.4, hw 0.5.0, skin 54,
AT49BV322A) and a Harmony 600 (fw 0.2, hw 1.1.0, skin 71, EON F16-100HIP), both supplied by
the person posting this, plus `harmony_one_firmware_3_4.hfw` and
`harmony_700_firmware_2_8.hfw` from harmonyremoterepair.com. The One `.hfw` turns out to be
exactly the version running on that remote, which made a very useful cross-check.

## Who wrote this

This analysis was produced by **Claude** (Anthropic's AI), working from the files above.
Flagging that up front because it should change how you read it, in both directions.

What it is: everything here derives from those dumps, the two `.hfw` packages, and the
concordance source tree. There is no insider knowledge, no datasheet nobody else has, and no
hardware was probed or written to. All of it is offline analysis of files, which means all of
it is independently checkable, and it should be checked.

The post deliberately shows its working rather than just its conclusions, so you can judge
each claim on its own merits. The load addresses come with a calibration table showing the
method scores 98.9% on a case where the answer was known independently and 11 to 30% on
wrong answers (section 4). The IR carrier finding comes with a numeric closure: the code's
arithmetic says 38 kHz implies a stored value of 263, which works out to 26.25 us
(section 10). The container format was validated against four independent samples at four
different base addresses (section 7). Where that kind of confirmation was not available, the
text says so.

It also records two places where earlier conclusions were wrong and got corrected: a
`SUBFWB`/`SUBWFB` opcode mix-up (section 10) and a miscount of 107 versus 108 codes
(section 8). Those are left in on purpose. An analysis that reports no mistakes is not more
trustworthy, just less legible, and knowing where the errors were helps you calibrate the
rest.

Things most worth verifying before relying on them, in rough order of risk:

* **The SFR map.** It assumes the standard PIC18 high-end register layout rather than the
  PIC18F67J50 datasheet specifically. The addresses that matter most (`PORTC`, `PORTB`,
  `TMR0`, `SSPBUF`) behave consistently with their inferred roles, but check them.
* **The arch 12 part number.** `PIC18F87J50` is inferred from the external memory bus
  requirement plus concordance naming the arch 14 sibling. Nobody has read the marking off a
  board.
* **Bit-test polarity** in a couple of the SPI listings, where the sense of some
  `BTFSC`/`BTFSS` reads oddly. It does not affect the conclusions, but the annotations may
  be off by an inversion.
* **The LWJL semantics** across architectures remain genuinely unexplained (section 8).

Conversely, the things that should be solid because they are cross-checked from independent
directions: the load addresses, the flash layouts, the firmware header format, and the arch
12 versus arch 14 storage model, which was derived once from branch targets and then again,
separately, from finding the SPI code (section 10).

## 0. What this changes, in plain terms

Skip ahead if you want the hex. The point in one paragraph:

A config file is a **program in a data format**. The firmware in the remote is the
**interpreter** that runs it. Everything this project needs to know about the config format
is already written down, precisely and unambiguously, inside that interpreter. Up to now the
format has been attacked by diffing sample configs and inferring meaning, which got roughly
3.5% decoded and then stalled on button mappings. The firmware turns that from inference
into reading.

I did not expect the firmware to be reachable when I started. It turns out it is, and the
only reason nobody had looked is that `concordance --dump-firmware` does not actually hand
you the firmware (section 1). Once you have the right file at the right load address it
disassembles cleanly: 87% of the 700 image into 520 functions, and from there I traced one
whole subsystem, keypress to infrared light, including the exact config fields that set the
IR carrier frequency.

So "can we ever write our own configs" is yes, and the useful part is that it stops being a
guessing game with a bricked remote as the failure mode. Section 13 proposes how to get from
here to there.

To be clear about what is **not** done: I have not decoded the config format. I have the
outer container for two architectures, one small table, and one subsystem's parameter block.
The IR database, activities, menus and display are still opaque. That is the real work. What
changed is that there is now a reliable method for doing it.

## 1. Why the dumps are what they are

On both remotes `--dump-safemode` and `--dump-firmware` give **byte-identical** output.
From `libconcord/libconcord.cpp`:

```c
read_safemode_from_remote() -> _read_fw_from_remote(..., ri.arch->flash_base, ...)
read_firmware_from_remote() -> _read_fw_from_remote(..., ri.arch->firmware_base, ...)
```

With `flash_base = 0x000000` and `firmware_base` either `0` (arch 12) or `0x000000`
(arch 14), both calls read 64 KiB at address 0. The EZUp wrapper saying
`<TYPE>Firmware_Main</TYPE>` is a fixed template, not a statement about the payload.

On the One, only about 9 KiB of that 64 KiB is non-`0xFF`, and none of it is code:

* `0x000000-0x00011F` unidentified table, see section 8
* `0x002000-0x0042C6` a **GSPM config container**
* rest erased

On the 600 all 64 KiB is populated and all of it is PIC18 code.

## 2. Flash layout, per architecture

| | arch 12 (Gin, One) | arch 14 (600 / 700) |
|---|---|---|
| firmware storage (external flash) | `0x020000`-`0x02EA92` | `0x000000`-`0x0112C0` (600), `0x012B80` (700) |
| firmware execution base | `0x020000` | `0x009000` |
| execution model | in place from external flash | copied into internal flash |
| safe-mode GSPM config | `0x002000`-`0x0042C6` | `0x020000`-`0x021BC7` |
| user GSPM config | `0x040000` | `0x030000` |
| what concordance dumps | the safe-mode config | first 64 KiB of code, truncated |

Both reserve a 128 KiB firmware area. Arch 12 puts it at `0x020000` with the safe-mode
config below; arch 14 puts it at `0x000000` with the safe-mode config above. Mirror
images.

**Why the execution models differ.** On arch 12 the storage address and the execution
address are the same, so the PIC18 is executing in place out of the external NOR flash.
That needs an 80-pin PIC18 J-series with an external memory bus in extended
microcontroller mode: below `0x020000` you get the 128 KiB of internal flash, at and
above it you go out on the external bus.

On arch 14 storage is `0x000000` but execution is `0x009000`, so the image cannot run
where it is stored. `remote_info.h` already names arch 14 as **PIC18F67J50**, a 64-pin
part with no external memory bus, which fits: the bootloader copies the image into
internal flash at `0x009000`, leaving internal `0x000000-0x008FFF` (36 KiB) for the
bootloader.

Arch 12's `micro` field is empty. Given the EMB requirement and the arch 14 part, the
One is almost certainly the 80-pin sibling, `PIC18F87J50`. Someone with a remote open
should read the marking.

**Arch 12 hides an extra indirection in the update file.** The One's
`Region_2.EZUpgrade` decodes to 68952 bytes that split in two:

```
[0x00000 .. 0x022C6)   8902 bytes  -> flash 0x002000 (safe-mode GSPM config)
[0x022C6 .. 0x10D58)  60050 bytes  -> flash 0x020000 (application code)
```

The first part is **byte-identical to what the remote handed back** at flash `0x2000`,
which is what proves the split point. And the split is discoverable from the data
itself: the GSPM header's `end_addr` field marks exactly where the config ends. Arch 14
does not need this, it ships the two parts as separate files (`Region_2.EZUpgrade` for
code, `Region_3.EZHex` for the config).

## 3. Firmware image header, identical on all three images

```
0x00  u16   checksum
0x02  ff ff
0x04  u16   (image_size - 8) & 0xFFFF        byte count from offset 8 to end
0x06  u8    0x00 on arch 12, 0x01 on arch 14
0x07  u8    firmware version, BCD
0x08  48 47  the magic _fix_magic_bytes() writes
0x0A  GOTO <entry point>
0x0E  RETURN
```

| Image | bytes 0x00-0x09 | version | size field | actual size |
|---|---|---|---|---|
| One 3.4 | `cd d8 ff ff 8a ea 00 34 48 47` | `0x34` = 3.4 | `0xEA8A` | `0xEA92` |
| 600 0.2 | `2b 6a ff ff b8 12 01 02 48 47` | `0x02` = 0.2 | `0x12B8` | `0x112C0` |
| 700 2.8 | `a1 d6 ff ff 78 2b 01 28 48 47` | `0x28` = 2.8 | `0x2B78` | `0x12B80` |

The size field matches `(size - 8) & 0xFFFF` exactly on both untruncated images. Applied
to the truncated 600 dump it gives `0x112C0` = 70336 bytes, and that is the only
candidate consistent with the observed maximum branch target of `0x01A292`. So the 600
dump is missing its last **4800 bytes**, entry point included.

Checksum: seeds `suma = 0x21`, `sumb = 0x43`, XOR even bytes into `suma` and odd bytes
into `sumb` over `[4 .. end]`. Reproduces bytes 0-1 exactly.

That is worth noting because `_fix_magic_bytes()` currently starts the sum at
`firmware_4847_offset` and always runs to `FIRMWARE_MAX_SIZE`. They are actually two
independent constants: magic at offset **8**, checksum range starting at offset **4**,
ending at the real image size.

## 4. How I got the load addresses

Decode every `GOTO`/`CALL` pair (`0xEF`/`0xEC`/`0xED` followed by a word with top nibble
`0xF`), rebuild the 20-bit word address, double it. Then for a candidate base, count how
many targets land inside the image, and of those how many are immediately preceded by a
flow terminator (`RETURN`, `RETFIE`, `RESET`, `RETLW`, the second word of a `GOTO`, or a
`BRA`). A correct base puts nearly every target on a function boundary. A wrong base
does not, and the second metric is what separates them, because "in range" alone is
easy to fake.

Calibration on the One, where I know the answer independently from the update file's
destination address:

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

Harmony 700 `Region_2`, the complete arch 14 image:

| base | in range | boundary hit |
|---|---|---|
| `0x000000` | 801 / 1638 | 11.9% |
| `0x008000` | 1436 / 1638 | 19.2% |
| **`0x009000`** | **1638 / 1638 (100.0%)** | **98.5%** |
| `0x00A000` | 1554 / 1638 | 30.1% |
| `0x010000` | 1238 / 1638 | 12.0% |

Note the 700 gives a clean 100%, because that image is complete. The 600 falls short
only because of the truncation: its 181 out-of-range targets all sit in `0x01900A` to
`0x01A292`, i.e. in the missing tail. **Zero** targets fall below `0x009000` on either
arch 14 image, which is what actually fixes the base.

Nice corroboration: the lowest branch target is `0x00904C` on **both** the 600 0.2 and
the 700 2.8. Same first function address across two models and two firmware versions,
so same link map and same codebase.

The 7 stragglers on the One point at a 5-entry vector table in internal flash:
`0x01E00C`, `0x01E00E`, `0x01E010`, `0x01E012`, `0x01E014`. Looks like the bootloader's
exported service routines, probably the flash erase and write helpers the application
needs to reprogram the external flash.

## 5. Ghidra recipe

Arch 12 (the One's code half, 60050 bytes):

* Processor **PIC-18**, little-endian, 24-bit addressing.
* Base **`0x20000`** in the CODE space, entry point **`0x2EA38`**.
* Mark `0x20000-0x2002F` as data. It is the header plus `DEADDEAD` linker fill, and if
  you let the analyzer eat it you get plausible-looking nonsense: `48 47` disassembles
  as a perfectly valid `RLNCF`, so it will not obviously look wrong.
* Add the five external entry points at `0x1E00C`-`0x1E014`.
* Budget time for defining SFRs by hand from the PIC18F87J50 register map. The generic
  PIC-18 spec does not name them and the peripheral code is unreadable without them.

Arch 14 (use the 700 `Region_2`, not a 600 dump, because it is complete):

* Same processor, base **`0x9000`**, entry `0x1BB38` (700) or `0x1A26E` (600).
* Header is only `0x00`-`0x0F` here, real code starts at `0x9010`.

Sanity check outside Ghidra: `gpdasm -p p18f67j50` (arch 14) or `-p p18f87j50`
(arch 12) from gputils, after converting to Intel HEX.

Sample, One at `0x20030`:

```
02000a: 1c ef 75 f1  GOTO  0x02ea38
02000e: 12 00        RETURN
020030: 0f 01        MOVLB 0xf
020032: 14 0e        MOVLW 0x14
020034: 5f 6f        MOVWF 0x5f,BANKED
020036: 37 ec 6c f1  CALL  0x02d86e
02003a: 02 01        MOVLB 0x2
02003c: c7 6b        CLRF  0xc7,BANKED
020050: 04 01        MOVLB 0x4
020052: 40 0e        MOVLW 0x40
020054: 11 6f        MOVWF 0x11,BANKED
```

Opcode high-byte histograms, One and 600: `0x01 MOVLB` 3458 / 3684, `0x0E MOVLW`
3911 / 3369, `0x6F MOVWF banked` 1829 / 1949, `0xEC CALL` 1183 / 1194, `0xD0 BRA`
712 / 757. Textbook compiled-C PIC18.

## 6. Suggested concordance changes

arch 12, `remote_info.h`:

```c
0x020000,   // firmware_base          (was 0; the firmware dump reads the wrong region)
8,          // firmware_4847_offset   (was 0; magic confirmed at image offset 8)
```

`0xEA92` fits in `FIRMWARE_MAX_SIZE`, so one 64 KiB read at `0x020000` gets the whole
application.

arch 14: `firmware_base = 0x000000` is already right, and the existing
`// firmware_base (0x010000 but not yet supported)` comment is misleading, because
`0x010000` lands in the middle of the image. The real defect is that `FIRMWARE_MAX_SIZE`
is smaller than the arch 14 firmware region. The area runs up to the safe-mode config at
`0x020000`, so a per-architecture firmware size of `0x020000` would be safe.

**Safety warning, this can brick a remote.** `firmware_base` is also consumed by
`erase_firmware()` and by `write_firmware_to_remote(direct=1)`. If you apply any of this
locally, use the read path only (`concordance -f`). Do not run any erase or write
operation against a remote with a patched architecture table.

## 7. The GSPM config container (relevant to #1)

Worth flagging before anyone tries to reuse the 525 parser: neither the One nor the 600
has any `0xFEED`/`0xBEEF` framing at all. Completely different container. I have now
validated this layout against **four** samples at four different base addresses: the
One's safe-mode config (`0x002000`), the One's user config (`0x040000`), the 700's
`Region_3` (`0x020000`), and the 600's user config (`0x030000`).

```
0x00  char[4]  "GSPM"        magic (equals the arch 12/14 cookie 0x4D505347)
0x04  u32      end_addr      absolute flash address of the trailing "PTYY" marker
0x08  u32      format        0x00001600 on arch 12, 0x00001400 on arch 14
0x0C  u32[N]   section_ptr[] absolute flash addresses; 0 means absent
      u8[3]    00 00 00      padding
      char[4]  "LWJL"        first section magic
      u8       count
               {u8 event_code; u16 index; u8 flags}[count]
...
end-6 u16      checksum
end-4 char[4]  "PTYY"        end marker (matches `end_vector = 4`)
```

Pointers are **absolute**, not relative, so these blobs are position dependent.
`end_addr` resolved onto `PTYY` in all four samples.

**Gotcha: the pointer table length is architecture dependent, and the header does not
state it.** Arch 12 has N = 21 with `LWJL` at `0x63`; arch 14 has N = 19 with `LWJL` at
`0x5B`. A parser should find the `LWJL` magic and derive
`N = (offset_of_LWJL - 3 - 0x0C) / 4`, which checks out on both.

The `format` field is a version: `0x1600` on arch 12 matches
`<REGION ID="5">1.6</REGION>` in the One's firmware `Data.xml`.

Also, architecture codenames, from the `NOTINTENDED` comments inside
`Region_2.EZUpgrade`: 2 = 745, 3 = 768, 6 = 112, 7 = 659, 8 = Espresso, 9 = Mocha,
10 = Cappuccino, 11 = Cognac, **12 = Gin**. And `SOFTWARETYPE` 0 = normal,
2 = Test mode, 3 = Boot mode.

## 8. LWJL, with a caution (relevant to #6)

The **Harmony One** user config has `count = 55`. Using @trelowney's
`0x80 | (row << 3) | col` from #1: 52 matrix entries over 7 rows by 8 columns, plus 3
non-matrix codes (`0x06`, `0x07`, `0x2D`). `flags` is `0x7f` on all 55, and `index` runs
0, 1, 2 ... 54 strictly sequentially, so the useful content is the ordering.

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

But the **Harmony 600** config has `count = 162` and the records look structurally
different: `index` is 0 on every single one, `flags` is `0x00` or `0x07`, and the codes
are 54 contiguous non-matrix values (`0x41`-`0x76`) plus 108 matrix values spanning rows
0-6 **and** rows 8-14, so bit 6 of the code selects a second bank of rows.

162 is far more than the 600 has buttons, and there are no handler indices. So I do not
think arch 12 and arch 14 LWJL are the same thing: the One's reads like a real binding
table, the 600's reads like an enumeration of supported event codes. For reference the
700's `Region_3` safe-mode config has `count = 0`, and the One's safe-mode config has
`count = 2` (`0xAF`, `0xAE`, `flags = 0x00`), which looks like a two-button recovery UI.

**Please do not take the 600 table as that remote's physical key matrix.** The
cross-architecture semantics here are unresolved.

One upside for the plan in #6: now that the firmware disassembles, the
physical-button-to-matrix-position mapping should be recoverable from the key scanning
routine directly, instead of flashing test configs onto hardware. That seems like the
safer route.

## 9. One thing I could not identify

External flash `0x000000-0x00011F` on the Harmony One: 288 bytes where **every nibble
is one of {6, 7, E, F}**. Bits 1, 2, 5 and 6 of every byte are never cleared. On NOR
flash, where erased is `0xFF` and programming only clears bits, that is the signature of
a counter or log advanced by clearing one bit at a time. Layout: `0x000000-0x000055`
looks header-like, then `0x000097-0x00011F` is twelve identical 9-byte records
`67 67 F7 F7 F7 F7 FF FF FF`.

Boot counter? Config generation counter? Per-sector wear map? If anyone has two dumps of
the same remote taken at different times, diffing this range would answer it. Note it
does not exist on the 600, where flash `0x000000` is the start of the firmware image.

## 10. First Ghidra pass: IR modulator and keypad scanner located

I have since actually run this through Ghidra 12.1.2 on the 700 2.8 image. Result:
**28974 instructions covering 66640 of the 76672 code bytes, about 87%**, in 521
functions. Two setup notes for anyone repeating it:

* `analyzeHeadless` rejects a relative project path (`Path element starting with '.' is
  not permitted`). Absolute path only.
* Auto-analysis on a raw binary finds almost nothing by itself. Seed it: extract the
  `CALL`, `RCALL` and `GOTO` targets first, create functions at each, then analyse. That
  is the difference between a nearly empty listing and 87% coverage.

Working command:

```
analyzeHeadless <abs-project-dir> harmony \
  -import harmony700_2.8.bin \
  -processor "PIC-18:LE:24:PIC-18" \
  -loader BinaryLoader -loader-baseAddr 0x9000
```

### `0x10D00`, the most-used primitive: cycle-exact delay

```
10d00: f9 24       ADDWF PCL,W
10d02: f9 6e       MOVWF PCL
10d04: 00 00       NOP        <- long NOP sled follows
```

Computed jump into a NOP sled, so the delay is `W`-proportional and cycle-exact. 28
direct callers. Same address `0x010D00` in both the 600 0.2 and the 700 2.8.

### `0x194A4`: the IR carrier is generated in software

Not a hardware PWM. Fully unrolled over 8 half-cycles, with **PORTC bit 2 as the IR LED**:

```
194b4: 82 84       BSF PORTC,2      ; LED on
194b6: bc 51       MOVF 0xbc,B,W    ; on-time
194b8: 80 ec 86 f0 CALL 0x10d00     ; delay
194bc: 82 94       BCF PORTC,2      ; LED off
194be: bd 51       MOVF 0xbd,B,W    ; off-time
194c0: 80 ec 86 f0 CALL 0x10d00     ; delay
194c4: be a1       BTFSC 0xbe,B,0   ; bit n of mask selects whether this
194c6: 82 84       BSF PORTC,2      ;   half-cycle drives the LED
...                                 ; repeats for bits 0..7
```

Bank-13 `0xBC` = on-time, `0xBD` = off-time, `0xBE` = an 8-bit mask of which half-cycles
drive the LED, all loaded at `0x194A8`-`0x194B0` from `0x08D`, `0x08E`, `0x3BF`.
Programmable on/off times plus a per-half-cycle enable mask is exactly what you need for
arbitrary carrier frequencies and duty cycles (36/38/40/56 kHz) plus carrier-less
protocols. Single caller at `0x195F0`.

Related: `0x19486` sets up TMR0 (`SETF TMR0H`, `SETF TMR0L`, `BSF T0CON,7`) with a stop
at `0x1949A`. That is the learning-mode edge timing capture.

### The full IR chain, traced

I followed every write to `0x08D`, `0x08E` and `0x3BF`. The chain is complete.

**An action dispatcher at `0x12F08`.** Standard PIC18 compiler switch (cumulative
`XORLW` compares). Reads a selector from data `0x08B` and routes a 16-bit pointer in
`0x095/0x096` into one of four subsystem slots:

| selector `0x08B` | pointer to | handler |
|---|---|---|
| 1 | `0x3CA/0x3CB` | `0x1AF2C` |
| **2** | **`0x3BD/0x3BE`** | **`0x193CE`, the IR path below** |
| 3 | `0x3AF/0x3B0` | `0x1973C` |
| 4 | none | `0x1A8A6` |

All four handlers write the same low-level variables (`0xDB8` timer preload, `0x08D`
on-time, `0xDBB` pattern byte), so these are four **IR renderer variants**, not unrelated
peripherals. So the selector looks like an IR encoding class carried in the config. It is
written at `0x17F4C`, `0x18006`, `0x1809E` and `0x180F0`. And `0x3BD/0x3BE` is written
exactly once in the whole image, at `0x12F2C`, so the dispatcher is the only way in.

**The IR parameter block, parsed at `0x193CE`:**

| Offset | Type | Meaning |
|---|---|---|
| 0 | u16 LE | carrier period |
| 2 | u8 | carrier on-time (duty) |

Both go through `value * 4 / 10`, then a fixed loop overhead is subtracted (19 cycles for
the period, 8 for the on-time), clamped at zero. Off-time is then computed as
`period - on`:

```
193d8: ee cf 00 fd MOVFF POSTINC0,0xd00   ; u16 at offset 0
193ee: 0a 0e       MOVLW 0x0a             ; /10 via the 16-bit divide at 0x1BAF6
1940c: 13 08       SUBLW 0x13             ; if q > 19 then q -= 19 else 0
19418: 00 cd 8e f0 MOVFF 0xd00,0x08e      ; period, in cycles
1942c: ef 50       MOVF INDF0,W           ; u8 at offset 2 -> same treatment, -8
19468: 00 cd 8d f0 MOVFF 0xd00,0x08d      ; ON time
19470: 8e 5f       SUBWF 0x8e,B,F         ; OFF = period - ON
```

Then `(0x65 - x) * 2` converts a cycle count into the delay parameter. The sled at
`0x10D00` is **exactly 100 NOPs then RETURN**, and `0x65` = 101, so that lands `x` NOPs
from the end and burns exactly `x` cycles. The inversion is just sled indexing.

**Numeric check, and it closes.** `value * 4 / 10` cycles implies 4 instruction cycles
per 0.1 µs, i.e. a 4 MIPS core at 16 MHz. Test against a real carrier: 38 kHz is 26.3 µs,
so the config stores 263, giving `263 * 4 / 10` = 105 cycles = 26.25 µs at 4 MIPS. That
confirms both the 0.1 µs storage unit for the period field and the 16 MHz clock. The 19
subtracted cycles are the measured overhead of the unrolled modulator block.

**And the transmit loop at `0x195C6`:**

```
195ca: b9 cd d7 ff MOVFF 0xdb9,TMR0H      ; preload = this burst's duration
195ce: b8 cd d6 ff MOVFF 0xdb8,TMR0L
195d2: d5 8e       BSF T0CON,7            ; start TMR0
195e2: 05 0e       MOVLW 0x05             ; FSR0 = 0x0500 + index++
195e4: ef cf bb fd MOVFF INDF0,0xdbb      ; fetch pattern byte
195ec: bb cd bf f3 MOVFF 0xdbb,0x3bf      ; -> modulator enable mask
195f0: 59 df       RCALL 0x194a4          ; emit 8 half-cycles
195f2: f2 a4       BTFSC INTCON,2         ; wait for TMR0 overflow
195f4: fe d7       BRA 0x195f2
195f8: ba 07       DECF 0xba,B,F          ; repeat 0xDBA times
```

So the firmware **pre-renders the IR signal into a RAM bitmap at data address `0x0500`,
one byte per 8 carrier half-cycles**, and plays it back TMR0-paced. That is why the
remote can emit essentially any protocol: the carrier is fully parameterised (period,
duty, per-half-cycle mask) and the envelope is just a bit buffer.

### What fills the `0x0500` buffer: a ring FIFO, and a surprise about storage

Found by locating every code path that builds an FSR into RAM page `0x05xx`. There is no
`LFSR FSRn,0x05xx` and no `MOVLB 0x5` anywhere in the image; every access is the
`CLRF FSR0H / ADDLW index / MOVWF FSR0L / MOVLW 0x05 / ADDWFC FSR0H,F` idiom.

It is a **ring FIFO** with three bank-3 state variables:

| Variable | Role |
|---|---|
| `0x3C1` | read index (consumer) |
| `0x3C2` | write index (producer) |
| `0x3C0` | pending byte count, `+= 2` per enqueue, `DECF` per byte consumed |

Producer at `0x13194`, two bytes per call, interrupt-guarded:

```
1319a: 21 ec dd f0 CALL 0x1ba42      ; BCF INTCON,6 / BCF INTCON,7  (enter)
131a0: c2 51       MOVF 0xc2,B,W     ; write index, post-increment
131aa: 05 0e       MOVLW 0x05        ; FSR0 = 0x0500 + index
131ae: a5 c0 ef ff MOVFF 0x0a5,INDF0
131c0: a6 c0 ef ff MOVFF 0x0a6,INDF0
131c8: c0 27       ADDWF 0xc0,B,F    ; pending += 2
131d0: 1e ec dd f0 CALL 0x1ba3c      ; BSF INTCON,6 / BSF INTCON,7  (leave)
```

`0x08A` bit 0 is a "caller already holds the lock" flag so the guard nests. The two bytes
come from `0x0A5`/`0x0A6`, written from the 16-bit argument at exactly three sites
(`0x18240`, `0x18304`, `0x18334`), all inside the same `0x17E00`-`0x18400` region that
writes the encoding selector `0x08B`. That region is the encoder.

**Stream format.** The consumer at `0x19560` reads a command byte and decides how much
follows:

```
1956a: ef cf ba fd MOVFF INDF0,0xdba   ; command byte
19572: 80 0e       MOVLW 0x80
19576: ba 15       ANDWF 0xba,B,W
1957a: 57 e0       BZ 0x1962a          ; bit 7 selects a second command form
1957e: ba 25       ADDWF 0xba,B,W      ; required = command + 4
19582: c0 5d       SUBWF 0xc0,B,W
19584: 01 e2       BC 0x19588          ; enough buffered? else wait at 0x19712
19598: ef 1c       COMF INDF0,W        ; TMR0 preload, stored COMPLEMENTED
```

Each record: a command byte, bit 7 picking one of two forms, low bits giving the count of
pattern bytes that follow (the same `0xDBA` the play loop counts down), then a 16-bit
TMR0 preload stored complemented, since TMR0 counts up to overflow.

**Now the surprise.** The encoder reads its data through `0x10A46` (one byte, 95 refs) and
`0x10A5E` (two bytes, 45 refs). Both start `CALL 0x18DBC` then `TBLRD*+`, which looks like
program-memory table reads. It is not. `0x18DBC` is `GOTO 0x1B9AC`:

```
1b9ac: c9 68       SETF SSPBUF        ; clock out 0xFF to clock a byte in
1b9ae: c7 a0       BTFSC 0xc7,0
1b9b0: fe d7       BRA 0x1b9ae
1b9b2: c9 50       MOVF SSPBUF,W
```

and the output primitive `0x1B984`:

```
1b984: 9e 96       BCF PIR1,3         ; SSPIF
1b986: c6 9e       BCF SSPCON1,7      ; WCOL
1b988: c6 c3 c9 ff MOVFF 0x3c6,SSPBUF
```

That is the **hardware MSSP in SPI mode**. `0x18CEC` is `BSF LATF,7` / `BCF LATF,7`, so
**LATF bit 7 is the flash chip select**. `0x18D98` shifts `TBLPTRU`, `TBLPTRH`, `TBLPTRL`
out as the three address bytes. And the surrounding code sends recognisable SPI NOR
opcodes: `0x18DC6` sends `0xD8` (64 KiB block erase), `0x18DD2` sends `0x05` (read status)
followed by a loop polling bit 0, the write-in-progress bit.

So `TBLPTR` is not doing a real table read at all. It is being used as a 24-bit address
counter for the SPI flash, and `TBLRD*+` is used purely because it increments `TBLPTR` in
one instruction. The `TABLAT` result is discarded.

**On arch 14 the config is therefore not memory-mapped.** That confirms the arch 12 versus
arch 14 split from section 2, from a completely independent direction:

| | arch 12 (One) | arch 14 (600 / 700) |
|---|---|---|
| Flash part | Atmel AT49BV322A, **parallel** NOR | EON F16-100HIP, **SPI** serial |
| concordance flash ID | `0x1F:0xC8` (mfr:device) | `0x15:0x1C` (capacity:mfr, JEDEC SPI order) |
| Config access | memory-mapped via the external memory bus | byte at a time over hardware SPI |
| Firmware execution | in place from external flash at `0x020000` | copied to internal flash at `0x009000` |

An SPI flash is not executable, so arch 14 *has* to copy the firmware into internal flash.
That is precisely what the `0x9000` load base forced me to conclude earlier from branch
target analysis alone. Two independent lines of evidence, same answer.

It also explains the design: with no memory mapping, every config byte costs an SPI
transaction, so the firmware streams records through a byte-at-a-time reader and
pre-renders the whole IR waveform into the `0x0500` ring buffer instead of reading it on
demand mid-transmission.

Practical consequence for this project: the two flash ID orderings concordance reports
(`0x1F:0xC8` versus `0x15:0x1C`) are not an inconsistency in its code, they reflect two
genuinely different flash interfaces. Worth knowing before anyone "fixes" that.

One correction while I am here, in case anyone reuses my numbers: I initially had `SUBFWB`
and `SUBWFB` swapped in my own disassembler (PIC18 `SUBFWB` is `0x54-0x57`, `SUBWFB` is
`0x58-0x5B`). It only affected the scaling block above, which is why the `0x65` constant
is a subtract-from rather than a subtract. The keypad and modulator findings do not use
those opcodes and are unchanged.

### `0x190A6`: keypad scanner, and it is 14 rows by 4 columns

Three row-driver helpers, each doing a masked read-modify-write so non-matrix pins on
the same port survive:

| Helper | Port | Mask | Row lines |
|---|---|---|---|
| `0x1907E` | PORTE | `0x80` | bits 0-6, 7 rows |
| `0x19052` | PORTA | `0xC7` | bits 3-5, 3 rows |
| `0x19068` | PORTD | `0xF0` | bits 0-3, 4 rows |

7 + 3 + 4 = 14 rows. Rows are **active low**. Columns come from `0x19094`:

```
19094: 81 a8       BTFSC PORTB,4
19096: 01 0c       RETLW 0x01
19098: 81 aa       BTFSC PORTB,5
1909a: 02 0c       RETLW 0x02
1909c: 81 ac       BTFSC PORTB,6
1909e: 03 0c       RETLW 0x03
190a0: 81 ae       BTFSC PORTB,7
190a2: 04 0c       RETLW 0x04
190a4: 00 0c       RETLW 0x00
```

Row walk builds a one-hot mask by shifting and inverts it (group 1, `0x1914E`-`0x1918C`;
group 2 starts from `MOVLW 0x08` for PORTA bit 3):

```
19156: 01 0e       MOVLW 0x01
19160: e8 46       RLNCF WREG,F     ; shift left `row` times
19162: fe 0b       ANDLW 0xfe
19168: e8 1c       COMF WREG,W      ; invert -> active low
1916a: 7f 0b       ANDLW 0x7f
19170: 86 df       RCALL 0x1907e    ; drive PORTE
19172: 90 df       RCALL 0x19094    ; read column
```

And the code assembly at `0x19274`:

```
19274: 81 50       MOVF PORTB,W     ; read to clear the mismatch condition
19278: f2 90       BCF INTCON,0     ; clear RBIF (interrupt-on-change)
1927c: 01 51       MOVF 0x01,B,W    ; row+1; 0 means nothing pressed
1927e: 0d e0       BZ 0x1929a
19282: 01 07       DECF 0x01,B,F    ; 0-based row
19288: 04 0d       MULLW 0x04       ; row * 4
1928e: 00 25       ADDWF 0x00,B,W   ; + column (1..4)
```

So the scanner returns **`row * 4 + column`**, a linear 1..56 index, 0 for no key.
Columns are wired to PORTB interrupt-on-change, which is how the remote wakes from sleep.

### Bonus: a hardwired reset key combination at `0x19120`

Before the normal scan, three intersections are probed directly and one of them runs the
PIC18 `RESET` instruction:

```
1911e: 83 94       BCF PORTD,2
19120: 81 ac       BTFSC PORTB,6
19122: ff 00       RESET
```

Config-independent hardware recovery combo. The two probes before it (`PORTE,1` with
`PORTB,5`, and `PORTE,4` with `PORTB,7`) gate whether that check runs. Might be worth
knowing for anyone bricking remotes.

### This resolves the LWJL question from section 8

Arch 14's physical matrix is 14 by 4, so **56 physical positions**, and the scanner's
native key code is a linear 1..56 index, *not* `0x80 | (row << 3) | col`. The 600's LWJL
lists **108** matrix-style codes out of 162 entries. Those cannot be the same thing, so
the 600 LWJL is definitively **not** that remote's physical matrix. Most likely it is an
event-code namespace shared across the whole arch 14 family.

The One's LWJL, on the other hand, has 52 matrix entries over 7 rows by 8 columns, also
56 positions, and does plausibly reflect real hardware. So arch 12 and arch 14 LWJL
really do differ in meaning, and somewhere there is a translation between the scanner's
linear index and the event codes the config uses. Finding that translation is the
concrete next step for the button mapping problem in #6, and it is now a tractable
disassembly job rather than a hardware-poking job.

Peripheral map, for whoever picks this up (standard PIC18 high-end SFR addresses, worth
confirming against the PIC18F67J50 datasheet):

| SFR | Uses | Role |
|---|---|---|
| PORTC `0xF82` | 50 | bit 2 = IR LED output |
| LATB `0xF8A` | 160 | display driver, block at `0x0D412` |
| LATF `0xF8E` | 135 | second heavy peripheral |
| PORTA/D/E | 6/15/6 | keypad row drive |
| PORTB `0xF81` | 27 | keypad column read, bits 4-7 |
| T0CON, TMR0L/H | 19 | IR receive timebase |

`0x1B8CE` initialises TRISA through TRISG and is where the definitive pin assignment can
be read off.

## 11. Open items

Things this analysis could not settle, all of which need a human with hardware:

* Confirm the MCU markings on an opened Harmony One (expected `PIC18F87J50` or close
  sibling) and on a 600.
* Dump external flash `0x020000-0x02FFFF` off a One and diff against the extracted code
  to confirm execute-in-place on real hardware.
* Dump `0x000000-0x0112C0` off a 600 to recover the missing 4800-byte tail.
* What are regions 0, 1, 5 and 11 on arch 12? Only region 2 ships in the One's `.hfw`,
  only 2 and 3 in the 700's.

The extracted binaries (the One's 60050-byte code half, the decoded 700 `Region_2` and
`Region_3`, the 600's 64 KiB code dump, all four GSPM blobs) all exist and are reproducible
from the checksums in `reference/checksums.md`, but are not published for the reasons in
section 12.

The user config dumps behind the LWJL findings are the remote owner's personal configuration
data and are not included. Specific structures can be extracted from them on request, if the
owner agrees.

## 12. Code, data and what is not published

Everything is in a public repository rather than a zip, so it stays current and can be
forked and corrected: **<https://github.com/dannybloe/harmony-explorations>**

```
docs/findings.md            the full technical reference this post condenses
docs/config-format.md       the GSPM format spec, kept separate so tools can track it
docs/forum-post.md          this post, for the record
tools/gspm_parse.py         parser for the GSPM config container
tools/pic18_disasm.py       PIC18 disassembler with SFR names resolved
tools/pic18_trace.py        finds every access to a given data memory address
tools/ghidra/               headless seed script plus the extracted branch targets
reference/checksums.md      SHA-256 and provenance for the six binaries
reference/concordance-notes.md  the two defects above, with suggested patches
```

Notes on the pieces that matter:

**`tools/gspm_parse.py`** is probably the most immediately useful thing there, and a candidate
for the decompiler's container layer. It takes a filename and nothing else: the flash base
address is recovered from the header's absolute `end_addr` field, and the pointer table length
from where the `LWJL` magic sits, so there is no per-model configuration to get wrong. It
accepts either a bare blob or a raw flash dump with the blob somewhere inside it. Verified
against four independent samples at four different base addresses (`0x002000`, `0x020000`,
`0x030000`, `0x040000`), covering both format versions and both pointer table lengths, with all
consistency checks passing on all four. `--json` for pipeline use.

**`tools/pic18_trace.py`** is the tool that made section 10 possible. Point it at a data
address and it reports every read, write and bit operation touching it, tracking `MOVLB` to
resolve banked addressing and handling `MOVFF` separately. This section is essentially the
output of pointing it at three variables. One caveat: the `MOVLB` tracking is a linear scan, so
it is exact for straight-line code and approximate across branches. In practice the compiler
emits `MOVLB` right before each access, so it works, but treat hits as leads to confirm.

**`tools/pic18_disasm.py`** resolves SFR names (`PORTC`, `TMR0L`, `SSPBUF`), which Ghidra's
generic PIC-18 language does not. Every listing in this post came out of it. Its SFR map
follows the standard PIC18 high-end layout and should be checked against the PIC18F67J50
datasheet before anyone leans on it hard.

**`tools/ghidra/`** holds the headless script and the two seed lists, which together take
Ghidra from a nearly empty listing to 87% coverage, since auto-analysis on a raw binary has no
entry point to work from.

### What is deliberately not in the repository

**No firmware or config binaries.** Two reasons, and the second one caught me by surprise:

1. **Copyright.** They are unlicensed proprietary Logitech binaries. A repair shop hosting
   them does not give the rest of us redistribution rights.
2. **Personal data.** The archived `.hfw` packages contain a `Data.xml` carrying the
   original downloader's Logitech `UserId`, `CookieKeyValue` account GUIDs, `ServerID` and
   an `ASPSESSIONID` session cookie. Somebody who downloaded that firmware years ago had
   their session details shipped inside the file. Redistributing it redistributes those.

The README carries **SHA-256 checksums and provenance** for all six binaries instead, so
you can fetch the `.hfw` yourself and confirm you have the identical file. That gets
reproducibility without either problem.

Worth flagging for Phase 0 of the plan below: if the project does archive these firmware
files, **strip `Data.xml` of the account fields first.** Nothing needs them, and mirroring
as-is would spread one person's credentials across every mirror we create.

**No user config dumps.** Those are the remote owner's personal configuration data. Specific
structures can be extracted from them on request, and they could go into a labelled corpus
once the project agrees a sanitisation approach, but that is the owner's call to make.

## 13. Proposed plan: from here to actually configuring remotes

Offered as a starting point to argue with, not a decree. It is built around one strategic
shift and one piece of tooling that I think changes the economics of the whole project.

### The shift: the firmware is the spec

Every question of the form "what does this config byte mean" has an exact answer sitting in
the firmware, in the routine that reads that byte. Sample-diffing produces hypotheses;
reading the consumer produces facts. The IR carrier fields in section 10 took an afternoon
this way, and came with a numeric self-check (38 kHz implies a stored 263, which the code's
arithmetic turns into exactly 26.25 us). That kind of confirmation is not available from
diffing.

Corollary worth saying out loud: **we do not need to touch firmware at all.** The goal is to
generate config files. Firmware analysis is a means of reading the spec. Nobody should be
flashing modified firmware, which removes the scariest failure mode entirely.

### Do the format work on arch 14 first, even though the One is more popular

This is counterintuitive so let me justify it. On arch 14 (600, 700) the config lives on an
SPI flash that is **not** memory-mapped, so every single config byte the firmware reads goes
through one narrow choke point, the byte-read primitive at `0x1B9AC`. On arch 12 (One) the
config is memory-mapped and read with ordinary loads scattered everywhere.

That choke point is a gift. Instrument that one function and you get a complete, ordered log
of exactly which config bytes the firmware touches, for any action. Decode arch 14 first,
then port the understanding to arch 12, where the structures are clearly related (same GSPM
container, same magic markers, same trailer).

### Phase 0: unblock the basics

* Fix the concordance firmware dump for both architectures (section 6). Right now nobody can
  dump their own firmware correctly, which is why this went unnoticed for years.
* Archive the surviving Logitech `.hfw` firmware files for every model anyone can find,
  before that repair shop's hosting also disappears. This is the single most
  time-sensitive item in the whole plan. Those files are irreplaceable, there is no
  authoritative source left, and everything else here depends on them.
* Publish the load addresses and a scripted Ghidra project setup so nobody repeats section 4.
* Start a labelled config corpus: dumps plus the owner's description of what is in them
  (which devices, which activities, which buttons do what). A dump with a known description
  is ground truth. A dump without one is much less useful.

### Phase 1: label the config sections from the firmware

The GSPM header is a table of pointers, 21 slots on arch 12 and 19 on arch 14, and we do not
know what any of them are for. But section 10 shows the pattern that answers it: the
dispatcher at `0x12F08` copies a config pointer into a **per-subsystem RAM slot**, and
`0x3BD/0x3BE` turned out to be "the IR subsystem's pointer" purely because of which handler
consumed it.

So: find every RAM location that a config-derived pointer gets copied into, find its
consumers, and each section gets labelled **by function** rather than by guess. This is
mechanical, parallelisable across people, and it converts the pointer table from an unknown
into a map. I would do this before anything else in the format work.

Also in this phase: work out the config trailer checksum. I located it (the u16 immediately
before the `PTYY` marker) but did not derive the algorithm. Nothing can be uploaded until
that is known, so it is on the critical path. The firmware routine that validates a config on
boot is where to look.

### Phase 2: build an emulator harness. This is the highest-leverage item

The whole firmware is available, the chip is a plain PIC18, and the config is a file we
already have. So run the firmware in a simulator with a real config dump serving as the
emulated flash contents.

Why this is worth real effort:

* **Dynamic tracing beats static reading.** Log every config address the firmware reads while
  emulating a specific button press, and you learn precisely which bytes matter for that
  action, in order. That is enormously faster than reading code cold.
* **It closes the verification loop with zero hardware risk.** Watch the IR output pin in the
  emulator, decode the waveform, and compare it against a known-good IR code for that device.
  Now "did I generate a correct config" is an automated test rather than an experiment on
  hardware you cannot replace.
* **It makes the work CI-able.** A regression suite over a corpus of configs becomes possible.

On tooling: MPLAB X's simulator supports these parts and is the obvious cross-check, but it
is awkward to instrument. I would write a purpose-built PIC18 emulator instead. It is a
smaller job than it sounds, because you only need the core instruction set (about 75
instructions, and I already have a working disassembler for all of them), plus TBLPTR, the
FSR indirect registers, a stubbed MSSP that serves bytes out of a config file, TMR0, and a
trace on the IR pin. Everything else can be left unimplemented until something hits it.

Arch 14 is the right emulation target for the same choke-point reason as above.

### Phase 3: extract before you generate

Worth doing early because it delivers value immediately and independently: **the IR codes
people cannot recreate are already sitting in the configs on their own remotes.**

An extractor that pulls the IR database out of existing dumps into a documented, shareable
format:

* needs only read-side understanding, so it lands long before any generator
* cannot break anyone's hardware
* gives every owner something useful right now
* builds exactly the labelled corpus Phase 1 needs
* preserves the data before more remotes die

I would treat this as the first shippable deliverable of the project.

### Phase 4: round-trip compiler

Adopt @trelowney's approach, which I think is exactly right: model a config as an ordered
list of regions that tiles the blob with no gaps and no overlaps, decode what you understand
into JSON, and preserve everything else as opaque blobs. The invariant is that decompiling
and recompiling an untouched config must be byte-identical. That makes progress measurable
and prevents silent corruption.

Then work up in difficulty:

1. Recompile an untouched config, byte-identical. Proves the container and the tiling.
2. Change one field you fully understand (an IR carrier frequency), verify in the emulator.
3. Change a whole IR command. Verify the emitted waveform.
4. Add a device. Add an activity. Build a config from scratch.

Each step is verifiable in emulation before it ever touches hardware.

### Phase 5: hardware validation, last and carefully

Only once the emulator agrees. Use a remote you can afford to lose, keep a verified copy of
its original config, and know the recovery paths first: there is a safe-mode config in flash
(section 2) and a hardwired reset key combination in the firmware (section 10) that works
regardless of what the config contains.

### Phase 6: the user-facing tool

Config generator plus an editor plus a community IR database seeded from Phase 3. This is
the part everyone actually wants, and it is deliberately last, because it is ordinary
software work once the format is known.

### Milestones, so progress is legible

1. Anyone can dump their own firmware correctly and load it in Ghidra.
2. Every GSPM section slot is labelled by function.
3. The config checksum is reproducible.
4. Emulator boots a real config and emits a decodable IR waveform.
5. An extractor publishes IR codes out of existing dumps.
6. A config recompiles byte-identically.
7. A hand-modified config produces the expected IR waveform in emulation.
8. A modified config runs correctly on real hardware.
9. A config built from scratch runs on real hardware.

### Known unknowns, stated honestly

* The config checksum algorithm. On the critical path.
* There are **four** IR encoding classes (the dispatcher in section 10). I traced one. The
  other three need the same treatment.
* Per-model skin and layout dependencies. The `SKIN` field and the differing pointer table
  lengths suggest a per-model component we have not characterised.
* Arch 12 versus arch 14 differences are real and each needs its own pass, though they look
  closely related.
* The LWJL semantics still differ between architectures in a way I do not understand
  (section 8), and the translation between the scanner's linear key index and the config's
  event codes has not been found yet.

### On who does this

Worth being straight about, given who wrote the analysis: an AI can produce disassembly,
trace variables, derive formats and draft patches, on request and fairly quickly. What it
cannot do is own a work item. It does not turn up next week, it has no hardware, and it
cannot be the maintainer who says no to a bad patch.

So read this plan as a proposal for humans to pick up, not a commitment. The parts that
suit further AI assistance well are the mechanical, verifiable ones: labelling the remaining
GSPM sections by finding their consumers (Phase 1), deriving record layouts from the code
that reads them (Phase 2), working out the config checksum, and writing the emulator core,
which is a large but very well-specified job. Those are all "read the code and report what it
says" tasks with checkable answers.

The parts that need humans are the ones that need judgement or hardware: deciding the
sequencing, reading a part number off a board, dumping flash off a real remote, agreeing a
sanitisation policy for shared configs, and being the person who takes responsibility when
something gets written to a device that cannot be replaced.

The immediate concrete asks are therefore small and all human-shaped: does anyone object to
the concordance changes in section 6, can someone with a One open it and read the MCU
marking, and does the arch-14-first sequencing argument hold up to people who know these
remotes better.
