# Notes on concordance

[jaymzh/concordance](https://github.com/jaymzh/concordance) is the tool everyone uses to talk
to these remotes. Two defects in its firmware handling were found while working out the
firmware layout, and they explain why the firmware had gone unexamined **on the two
architectures this project has hardware for**.

Everything below is asserted against a checkout in `tests/test_concordance_notes.py`, which reads
the constants out of `libconcord/` and skips when there is no checkout to read. Measured against
concordance 1.5.

## The firmware dump does not return firmware, on arch 12 and arch 14

> **Corrected on 8 August 2026.** This section was written as though it described the tool, and it
> describes two entries in the tool's architecture table. The reading is unchanged for arch 12 and
> arch 14; what was wrong was the scope, which four documents had picked up and generalised. On
> **arch 8 and arch 9 the dump works and returns the complete firmware**, and that matters
> practically: it is how a stranger with an 880 can send a usable image, and how the incoming 525
> will be dumped. See "Where the dump is fine" below.

On both architectures examined here, `--dump-safemode` and `--dump-firmware` produce
**byte-identical** output. From `libconcord/libconcord.cpp`:

```c
read_safemode_from_remote() -> _read_fw_from_remote(..., ri.arch->flash_base, ...)
read_firmware_from_remote() -> _read_fw_from_remote(..., ri.arch->firmware_base, ...)
```

`remote_info.h` has `flash_base = 0x000000` and `firmware_base` of either `0` (arch 12) or
`0x000000` (arch 14, carrying the comment `0x010000 but not yet supported`). Both calls
therefore read `FIRMWARE_MAX_SIZE` = 64 KiB from flash address 0.

Consequences:

* **arch 12** (Harmony One): address 0 is not where the firmware lives. The application is at
  `0x020000`. The dump returns a small GSPM config blob instead, with no executable code at
  all.
* **arch 14** (Harmony 600, 700): address 0 *is* the firmware, but the image is larger than
  `FIRMWARE_MAX_SIZE`. It is silently truncated, losing the tail that contains the entry point.

`--dump-firmware` also wraps its output in an EZUp XML template with
`<TYPE>Firmware_Main</TYPE>`, which reads as a claim about the payload but is a fixed string.
`-b` writes the raw bytes instead, and the dump path modifies nothing: `dump_firmware()` calls
`read_firmware_from_remote()` and writes the result. `_fix_magic_bytes()` runs on the write path
only.

## Where the dump is fine

Both defects come from one architecture entry each, not from the code, so the same command on a
different remote is a different proposition:

| arch | flash_base | firmware_base | config_base | what `--dump-firmware` returns |
|---|---|---|---|---|
| 8 (720, 785, 880, 882, 885) | `0x000000` | `0x010000` | `0x020000` | the whole firmware region |
| 9 (51x, 52x, 55x) | `0x800000` | `0x810000` | `0x820000` | the whole firmware region |
| 12 (One) | `0x000000` | `0` | `0x040000` | a config blob, no code at all |
| 14 (600, 700) | `0x000000` | `0x000000` | `0x030000` | real code, truncated at 64 KiB |

On arch 8 and arch 9 `firmware_base` is its own region rather than a repeat of `flash_base`, so the
two dumps differ; and `config_base - firmware_base` is `0x10000` on both, which is exactly
`FIRMWARE_MAX_SIZE`. One read therefore covers the region with nothing truncated and nothing
foreign included. So `concordance -b -f` is worth asking a contributor for on those two, and is
worth nothing on ours.

One consequence worth stating when asking: on arch 8 the serial number is at flash `0x000110`,
below `firmware_base`, so a firmware dump cannot contain it. `--dump-safemode` reads the region
that does.

## The documented long option for `-b` does not exist

`--help` and `concordance.1` both name the flag `-b, --binary-only`. `long_options` in
`concordance/concordance.c` registers it as `"binary"`, and getopt matches unambiguous
abbreviations rather than extensions, so the documented spelling is not a longer form of a valid
one, it is simply rejected:

```
--binary-only -> concordance: unrecognized option `--binary-only', exit 1
--binary      -> accepted
-b            -> accepted
```

Harmless once known, and worth knowing before telling a contributor to run something. Asking for
plain `--dump-firmware` avoids the question: the EZUp wrapper it writes is hex encoded `<DATA>`
elements, which `harmony.ezfile.load_image` reads directly.

## Suggested changes

### arch 12, `remote_info.h`

```c
0x020000,   // firmware_base          (was 0; the dump reads the wrong region)
8,          // firmware_4847_offset   (was 0; magic confirmed at image offset 8)
```

The arch 12 image is `0xEA92` bytes, which fits inside `FIRMWARE_MAX_SIZE`, so a single 64 KiB
read at `0x020000` captures the whole application.

### arch 14

`firmware_base = 0x000000` is already correct. The existing comment suggesting `0x010000` is
misleading, since `0x010000` falls in the middle of the image.

The real defect is that `FIRMWARE_MAX_SIZE` (65536) is smaller than the arch 14 firmware
region. Observed images need 70336 bytes (600 fw 0.2) and 76672 bytes (700 fw 2.8). The
firmware area runs up to the safe-mode config at `0x020000`, so a per-architecture firmware
size of `0x020000` would be safe.

### `_fix_magic_bytes()`

It currently starts the checksum at `firmware_4847_offset` and always runs to
`FIRMWARE_MAX_SIZE`. Neither matches the observed format. These are two independent constants:

* the `0x48 0x47` magic sits at image offset **8**
* the checksum range starts at image offset **4**
* the range ends at the **actual image size**, not at 64 KiB

Verified on the One 3.4 image: seeds `suma = 0x21`, `sumb = 0x43`, XOR even bytes into `suma`
and odd bytes into `sumb` over `[4 .. end]`, which reproduces bytes 0 and 1 exactly.

## Bricking risk if you patch this locally

`firmware_base` is also consumed by `erase_firmware()` and by
`write_firmware_to_remote(direct=1)`. A build with a patched architecture table must be treated
as **read-only**: use `concordance -f` and nothing else. Do not run any erase or write
operation against a remote with a patched table.

## Incidental: the two flash ID orderings are not a bug

concordance reports the One's flash as `0x1F:0xC8` and the 600's as `0x15:0x1C`. Those look
inconsistent but are not. The One has an Atmel AT49BV322A, a parallel NOR, reported as
manufacturer then device. The 600 has an EON F16-100HIP, an SPI serial flash, reported in
JEDEC order as capacity then manufacturer. Two genuinely different flash interfaces. Worth
knowing before anyone "fixes" it.
