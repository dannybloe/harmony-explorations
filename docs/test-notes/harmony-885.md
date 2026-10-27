# Harmony 885 test notes

The bench Harmony 885s: what was done to them, in order. What the remote and its platform are is
[the reference](../../reference/architectures/harmony-880-885/README.md).

**Two Harmony 885s are on the bench, and neither may be written**: arch 8 is not in
`ARCHITECTURES_WITH_A_WRITE_TARGET`, and nothing here changes that. Before them, everything known about
this architecture came from a contributor's firmware images and configurations, read off their remotes.

## The first unit, `h885_a`

Recorded in the lab as `units/h885_a.txt` on 27 October 2026, the first arch 8 remote on a cable here.
Every step was a read.

1. **Enumeration only**: product `0xC110`, `bcdDevice` `0x0811`, product string `Harmony Remote 0-4.4.2`,
   100 mA, one HID interface with interrupt endpoints `0x81` in and `0x02` out, 64 bytes, 1 ms. The
   report descriptor is the image's byte for byte, `TestTheLiveHarmony885MatchesItsImage` in
   `tests/test_usbdesc.py`.
2. **`GET_VERSION`** through the library, which opened the remote unchanged: `44 21 49 01 80 11 08`. The
   four fields the image predicts agree, `tests/test_arch8_usb.py`.
3. **The library could not read flash on arch 8**, having no address rule for it, so the 885 image's
   `READ_FLASH` path was read first: it checks no address. The rule and the identity address were added
   on that reading, reads only.
4. **The identity block** at `0x000110`, one 64 byte read, recorded with `read-identity.ts --record
   h885_a`. It carries a per unit value.
5. **The application at `0x010000`**, two reads of 32 KiB: identical to the published 885 image, all
   65536 bytes, in about two seconds.
6. **The configuration's first 32 bytes at `0x020000`**: the `TPTP` cookie and format `0x1500`, so the
   unit holds a configuration. It was not read further; the configuration reader has no profile for
   `0xC110` yet.

The remote answered every command, and nothing was sent that is not a read.

Marked with a sticker on the remote, `A`.

## The second unit, `h885_b`

Recorded in the lab as `units/h885_b.txt` on 27 October 2026 and marked with a sticker, `B`. Its identity
block differs from `h885_a`'s, so the two are told apart by what they hold and not by which port they sit
on. The same reads, the same answers:

1. **`GET_VERSION`**: `44 21 49 01 80 11 08`, identical to `h885_a`, hardware 2.1 and the same flash ids
   included.
2. **The application at `0x010000`**: identical to the published 885 image, all 65536 bytes.
3. **The configuration's first 16 bytes**: the `TPTP` cookie and format `0x1500`, with a different end
   address from `h885_a`'s, so the two hold different configurations.
