# Harmony 515: the bench unit

What this project has done to its Harmony 515, in order. What the model is and how it behaves is the
reference's, [the 5xx architecture](../../reference/architectures/harmony-5xx/README.md); this file is
our unit only.

## The unit

A second hand Harmony 515, received from onyiaic on 3 November 2026, the first of that model on the bench.
Nothing more is known about where it has been, and more has been asked for. **It is not a write target**:
the units `CLAUDE.md`'s "Never write to a remote" names do not include it, so it is read only until that
is decided. Its identity block is recorded in the lab, `units/h515.txt`, which is what any rail would
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
