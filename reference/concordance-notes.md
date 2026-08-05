# Notes on concordance

[jaymzh/concordance](https://github.com/jaymzh/concordance) is the tool everyone uses to talk
to these remotes. Two defects in its firmware handling were found while working out the
firmware layout, and they explain why the firmware had gone unexamined.

## The firmware dump does not return firmware

On both architectures examined, `--dump-safemode` and `--dump-firmware` produce
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
