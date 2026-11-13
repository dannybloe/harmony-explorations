# Harmony 785 test notes

The bench Harmony 785s: what was done to them, in order. The remote runs on the Harmony 880 and 885's
platform, [the reference](../../reference/architectures/harmony-880-885/README.md), and nothing in the reference
covers the 785 itself yet.

**Two Harmony 785s are on the bench, and both may be written**, decision 34. This said neither may be
written<!--superseded--> until that decision. No write path names a 785 yet, so every step below was a read.

## The first unit, `h785_a`

Recorded in the lab as `units/h785_a.txt` on 10 November 2026, on its first contact.

1. **Enumeration only**: product `0xC110`, `bcdDevice` `0x082D`, protocol 8 and skin 45 in plain binary,
   product string `Harmony Remote 0-4.5.0`.
2. **The prediction**, [docs/predictions/harmony-785.md](../predictions/harmony-785.md), committed before
   anything was sent.
3. **`GET_VERSION`**: `45 09 49 01 80 2D 08`, application 4.5, hardware 0.9, flash `0x49` from manufacturer
   `0x01`, architecture 8, software type 0, skin 45, platform `0x08`. Every predicted field held.
4. **The identity block** read with `read-identity.ts --record h785_a`.
5. **The configuration**, `read-config.ts --label h785-a`: 425953 bytes, no window retried, every container
   check passing. It holds a previous owner's three devices and three activities, which stay in the lab.
6. **The whole flash**, `0x000000` to `0x1FE000`, twice with `read-region.ts --anywhere`: both identical, no
   window retried.

What the flash holds, `tests/harmony_880_885/test_harmony_785_first_read.py`:

* the Harmony 720's application 4.5 with the skin set to 45 and eight more bytes changed;
* a bootloader no image here has, version 4.4, product string `Harmony Remote 3-4.4.2`;
* the configuration from `0x020000`;
* a copy of the running application in the staging region from `0x1D0000`;
* six written bytes at the start of the log area, the rest erased.

## The second unit, `h785_b`

Recorded in the lab as `units/h785_b.txt` on 13 November 2026, on its first contact, after unit A had been
unplugged. Every step was a read.

1. **`GET_VERSION`**: `45 08 49 01 80 2D 08`, A's block but for the hardware version, 0.8.
2. **The identity block** read with `read-identity.ts --record h785_b`, and compared with A's record before
   anything else: it differs, so the remote on the cable was not A.
3. **The configuration**, `read-config.ts --label h785-b`: 518269 bytes, no window retried. A previous owner's
   setup, which stays in the lab.
4. **The whole flash**, twice. The first read finished with no window retried. **The second stopped after its
   retries and filed nothing**; the remote answered its version normally afterwards, and the error itself was
   lost, because the command's output was cut short. Run again with the whole output kept in the lab, it
   finished with no window retried, and the two reads are identical.

What the flash holds, in the same test:

* the same application as A;
* **a different bootloader from A's**: the Harmony 720's 4.2 build with the skin set to 45, product string
  `Harmony Remote 3-4.2.4`;
* the configuration from `0x020000` and the application's copy in the staging region, as on A;
* 118 identical entries at the start of the log area, where A has one.
