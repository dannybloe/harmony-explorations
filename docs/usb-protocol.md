# The Harmony USB protocol, from the firmware

**Status: in progress.** The transport layer below is complete and quoted from the device's
own descriptors. The command layer is not written yet. This document is the deliverable of
step 3 of `docs/roadmap.md`, and it is being written as each part is established rather than
at the end.

Scope: the Harmony One 3.4 image (architecture 12) and the Harmony 700 2.8 image
(architecture 14). The Harmony 600 0.2 dump is truncated by concordance at 65536 of 70336
bytes, and several of the things this document needs are past the cut, so the 600 is
confirmed against the live remote instead where that is possible.

Method, and why it matters here: everything is derived from the firmware images.
`concordance/specs/protocol.txt` and the libconcord source are consulted **after** a fact is
derived, as corroboration, never as the source. That is partly licensing (concordance is
GPLv3 and this repository is MIT, so its code is not read for structure or copied) and
partly that concordance has two documented defects on exactly these two architectures. See
`reference/concordance-notes.md`.

## 1. The transport

Every byte of every command crosses one of two interrupt endpoints, 64 bytes at a time. The
remote states all of it at enumeration, so this section is quotation rather than inference.

| | Harmony One 3.4 | Harmony 700 2.8 |
|---|---|---|
| Descriptor block at | `0x2E38E` | `0x1B7C6` |
| USB version | 2.00 | 2.00 |
| Vendor and product | `046D:C121` | `046D:C122` |
| `bcdDevice` | `0x1054` | `0x1066` |
| Interface class | 3 (HID), subclass 0, protocol 0 | same |
| Control endpoint packet size | 8 | 8 |
| Endpoint 1 | interrupt IN, 64 bytes, 1 ms | same |
| Endpoint 2 | interrupt OUT, 64 bytes, 1 ms | same |
| Report descriptor | 33 bytes at `0x2E42D` | 33 bytes at `0x1B865` |
| Product string | `Harmony Remote 0-3.4.0` | `Harmony Remote 0-2.8.0` |

Read it with:

```sh
tools/usbdesc.py 700-2.8-Region_2-code-base0x9000.bin 0x9000 --raw
```

### What a host implementation has to get right

* **The endpoint numbering is asymmetric.** IN is endpoint 1, OUT is endpoint **2**. The
  device descriptors say `81 03 40 00 01` and `02 03 40 00 01`, so this is not a symmetric
  pair and code that assumes endpoint 1 in both directions will not talk to the remote.
* **64 bytes each way, and no report ids.** The report descriptor declares report size 8 by
  report count 64 for both the input and the output report, and contains no Report ID item.
  So a report is exactly 64 payload bytes. hidapi wants a leading report id byte of zero
  prepended on some platforms; that byte is not part of the protocol.
* **Vendor defined usage page `0xFF00`.** With interface subclass 0 and protocol 0 this is
  not a boot keyboard or mouse, so no operating system claims the device as an input
  device. On Linux a udev rule is still needed for a non-root process to open it.
* **Interrupt polling at 1 ms** in both directions. One 64 byte report per frame is a
  ceiling of 62.5 KiB/s per direction, so reading the Harmony One's 1.6 MiB config cannot
  beat about 26 seconds however efficient the command layer is.
* The configuration descriptor reports `bmAttributes 0xC0`, self powered, and `bMaxPower
  0x32`, so 100 mA. It draws bus power while charging regardless.

### Two closures that make the location trustworthy

Finding a descriptor block by searching for `12 01` alone would be weak: those two bytes
occur in code. Two independent checks confirm the block:

1. **The chain walks.** Nine descriptors, each one's `bLength` landing exactly on the start
   of the next, ending where an unrecognised type begins. Both images give the same nine:
   device, configuration, interface, HID, endpoint, endpoint, then three strings.
2. **`wTotalLength` closes.** The configuration descriptor declares `0x29`, 41 bytes, and
   the configuration, interface, HID and two endpoint descriptors are 9 + 9 + 9 + 7 + 7 = 41.

A third check confirms the block belongs to the image it was found in rather than to some
other firmware sharing the file: the product string states the firmware version, 2.8.0 and
3.4.0, which was already known from the package each image was extracted from.

### `bcdDevice` carries the skin

The low byte of the device release number, read as BCD, is the remote's skin number. `0x1054`
on a remote known to be skin 54, `0x1066` on one known to be skin 66. Two samples, two
architectures, both known independently, and no other field in the descriptor block plausibly
encodes 54 and 66. The high byte is `0x10` in both and is not identified.

This is more useful than it sounds. **The 600 and the 700 share product id `0xC122`**, so the
product id does not identify an arch 14 model, and the skin does, before a single config byte
is read. It is directly load bearing for the write rails in `docs/roadmap.md`, where a write
must refuse to proceed unless the config's `INTENDEDVERSION` matches the connected remote's
skin.

Prediction, which is cheap to check and not yet checked: the Harmony 600 should report
`bcdDevice 0x1071`, because that remote is skin 71. Its firmware dump is truncated before
the descriptor block, so this needs either a complete dump or a look at the live device's
descriptors.

### The one byte the two architectures disagree on

The 33 byte report descriptors are identical except a single flag bit: the arch 14 input
report is declared `Relative` (`81 06`) and the arch 12 one `Absolute` (`81 02`). No HID
parser interprets a vendor defined blob, so it changes nothing. Recorded because it is the
only difference, which makes it a fingerprint, and because "identical except one byte" is the
sort of claim worth counting rather than eyeballing. It is counted in
`tests/test_usbdesc.py`.

## 2. The USB stack inside the firmware

Not written yet. Two clusters are visible in the 700 image from tracing the USB registers:

* **`0x16E00` to `0x17300`**: `UCFG` is written at `0x16E0A`, `UEP1` at `0x16E2E`, and
  `UCON` bit 3 (`USBEN`) is set at `0x17294`, so this is initialisation and attach.
* **`0x1AD80` to `0x1AF00`**: a chain of eight reads of `UIR` between `0x1ADE0` and
  `0x1AE4E`, each followed by a bit test, so this is the interrupt service routine
  dispatching on the interrupt source.

The route from there to the command dispatcher is the endpoint 2 OUT buffer, which lives in
the buffer descriptor table in USB RAM rather than in a register, so it is reached through
FSR and is invisible to `pic18_trace.py`. The FSR setup has to be found instead.

## 3. The command set

Not written yet. This is where the length nibble mapping, the per command request and
response layouts, and the question of which `MISC` sub-commands the firmware services get
answered.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
