# Harmony 515: the bench unit

What this project has done to its Harmony 515, in order. What the model is and how it behaves is the
reference's, [the 5xx architecture](../../reference/architectures/harmony-5xx/README.md); this file is
our unit only.

## The unit

A second hand Harmony 515, received from onyiaic on 3 November 2026, the first of that model on the bench.
Nothing more is known about where it has been, and more has been asked for. **It may be written**, decision
35. This said it was not a write target<!--superseded--> until that decision. No write path names a 515 yet, so
everything below was a read. Its identity block is recorded in the lab, `units/h515.txt`, which is what any rail would
compare against.

## The first session, 3 November 2026

Read only throughout: enumeration, `GET_VERSION`, the identity block and `READ_FLASH`.

| what | outcome |
|---|---|
| enumeration | product id `0xC111`, `bcdDevice` `0x0943`, product string `Harmony Remote 0-3.4.0`. The `bcdDevice` is the protocol and the skin in plain hex, as on the Harmony 525: protocol 9, skin 67, the 515's in the reference's skin table |
| the version block | `34 10 12 ff 90 43 09`: firmware 3.4, hardware 1.0, flash `FF:12`, architecture 9 in the application, skin 67, platform `0x09`. The firmware matches the reference's 3.4.0 for skin 67 |
| a configuration read | 117443 bytes in one pass with no window retried, every container check passing, format 1.4 with twenty pointers. A different configuration from the one kkong42 posted for a 515. Filed as `dumps/danny/harmony-515-onyiaic/`, registered as `h515_onyiaic_asfound_config`, outside the corpus wide totals like the friend's remotes |
| the firmware | the 64 KiB blocks at `0x810000` and `0x800000`, the application and the safe mode image, **byte for byte the two images kkong42 posted for a Harmony 515**, so those are confirmed on a second unit. Kept in the lab's `reads/` |

**What the session found that was not about the remote**: the harmony-remote band named it a Harmony
525, because it named every remote on product id `0xC111` that way. It now names the model by the skin
in `bcdDevice`, as it already did for the Harmony 880 family. `read-config.ts` still prints "Harmony 525"
for the same reason: the read profile is per product id, and its model field names the first model it
was measured on rather than the one attached.

## The second session, 13 November 2026

Read only. The configuration region, the five 64 KiB blocks from `0x820000` to `0x870000`, read twice with
`read-region.ts`, 327680 bytes each with no window retried, and the two identical. **They begin with the
configuration read on 3 November, byte for byte, and everything after its 117443 bytes is erased**, so nothing
changed on the unit between the two sessions. Filed as `h515_region` and `h515_region_2`,
`tests/harmony_5xx/test_harmony_515.py`. With the two firmware images of the first session this is the external
flash below the log area; the processor's internal flash and its EEPROM, which the Harmony 525's backup also took,
were not read, since no library script reads them.
