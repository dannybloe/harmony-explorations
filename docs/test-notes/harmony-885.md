# Harmony 885 test notes

The bench Harmony 885s: what was done to them, in order. What the remote and its platform are is
[the reference](../../reference/architectures/harmony-880-885/README.md).

**Two Harmony 885s are on the bench, and both may be written, unit A first**, decision 30. This said
"neither may be written"<!--superseded--> until that decision. Nothing has been written to either: arch 8 is
still not in `ARCHITECTURES_WITH_A_WRITE_TARGET`, and adding it is a demonstration of its own. Before them, everything known about
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
   unit holds a configuration. It was not read further, because the configuration reader had no profile
   for this product id then; this said it has none yet<!--superseded--> until the profile was added, and the
   whole configuration was read on 5 November 2026, below.

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

## 5 November 2026: each unit's configuration and region, and unit A's clock

`todo/todo-prepare-885.md` 2.1 and 2.3, one unit on the cable at a time. Every command was a read, and each
unit was named by its identity block before anything else was read: `read-identity.ts --record h885_a`, and
later `--record h885_b`, both answered unchanged. Both report the version block `44 21 49 01 80 11 08`. The
facts are asserted in `tests/test_harmony_885_bench_reads.py`; the files are registered as `h885_a_*` and
`h885_b_*` in `tests/lab.py`.

### `h885_a`

1. **`read-config.ts` twice**: 568020 bytes each, about 18.6 seconds each, identical, the end marker and
   the trailer checksum passing in the reader. No window was asked for again.
2. **`read-region.ts` twice over `0x020000` to `0x1D0000`**: 1769472 bytes each, about 58 seconds each,
   identical. The configuration is exactly the region's first 568020 bytes, and the region passes the start
   check as the firmware performs it.
3. **Past the configuration**, which ends at `0x0AAAD4`: erased to `0x0B0000`, then 86601 bytes that are
   not `0xFF` up to `0x0D00AA`, with no `TPTP` among them and `DKDK` at `0x0C5429` and `0x0D00A7`; erased
   from there to `0x1D0000`. Remains of earlier configurations, by their shape; not decoded.
4. **`read-ram.ts --address 0x108 --count 8` twice, seconds apart**: the same eight bytes both times but the
   first, the second, which went from 10 to 14. The clock, 2020-10-24 11:37, a Saturday; the bytes are in
   the lab's file and `tests/test_harmony_885_bench_reads.py`. The
   configuration's own records 0 to 6 state 2020-10-24 09:48:37, so the clock read 1 h 48 min 33 s past
   them; when the unit last started is not known.

### `h885_b`

1. **`read-config.ts` twice**: 637127 bytes each, identical. The first read met a sequence break twice and
   the reader asked for the window again each time; the second read met none. **This configuration holds
   favourite channels**: two number sender records and forty three lists that hand them a number, the
   first Harmony 880 or 885 configuration seen with any; `h885_a`'s holds none.
2. **`read-region.ts`, two attempts**: both stopped on a sequence break, one at about half way and one in
   its first window, and filed nothing, since the region reader does not ask for a window again.
3. **The unit restarted by hand.**
4. **`read-region.ts` twice over `0x020000` to `0x1D0000`**: 1769472 bytes each, identical, no break. The
   configuration is exactly the region's first 637127 bytes, and the region passes the start check.
5. **Past the configuration**, which ends at `0x0BB8C7`: erased to `0x0C0000`, then 11743 bytes that are
   not `0xFF` up to `0x0D00AA`, no `TPTP`, `DKDK` at `0x0C4590` and `0x0D00A7`. The 171 bytes from
   `0x0D0000` to `0x0D00AA` are identical to `h885_a`'s.

**The sequence breaks are a measurement with the cause open**, taken from the session's console output, which
was not filed, so no test holds them. Every one read `flash chunk out of sequence`,
one sequence byte expected and another received, a few KiB into a window. Before the restart three of
`h885_b`'s four reads met one; after it, two region reads, 3.5 MB, met none; `h885_a`, on the same cable
earlier in the same session, met none in four reads. What the unit was doing before the restart, or the host
at that moment, are both open, and nothing was retried blind. That `read-region.ts` has no window retry,
where the configuration reader has one, is a gap in the bench tool.

## 5 November 2026: the version block against the configuration files, at the desk

`todo/todo-prepare-885.md` 2.2, **no remote involved**: the version block both units had reported,
`44 21 49 01 80 11 08`, was compared with the header of every Harmony 880, 885, 880 Pro and 720 configuration
file in the lab through the library's own comparison and rail, sixteen files. Four matched on all five fields
they state, four downloads of one 885 configuration with identical headers; the other twelve were refused on
skin and hardware version and nothing else. `packages/corpus/test/compatibility.test.ts` asserts the 885's
match and five of the twelve refusals, the files the lab's registry names; the scripts and the whole table
are the lab's.

## 5 November 2026: every key pressed, watched over USB

`todo/todo-prepare-885.md` 2.4. One unit on the cable at a time, named by its identity block first
(`read-identity.ts --record`, unchanged both times), then `watch-keys.ts --product 0xc110 --address
0x295,0x3a1`, which polls the two data memory bytes with `READ_MISC` selector 7 and prints each change.
Every command was a read. The remote showed its USB connected screen throughout, and its keys were scanned
anyway. The Harmony Touch was on the cable as well during the first session, and the product id kept it
out. The logs are registered as `h885_a_keys_*` and `h885_b_keys_check` in `tests/lab.py`, and
`tests/test_harmony_885_keys.py` asserts what follows. The rules given for every session: never Power, OK
and 0 down together, which restarts the remote, and no key down while the batteries go in or the cable goes
on, since Power or OK held there keeps the bootloader. Each key is named by the step list's order, the key
asked for at that point; the log holds codes only.

### `h885_a`

1. **The first run, before cleaning**: fifteen presses, 1, 2, 3, 5, 6, 7, 8, 10, 32, 11, 11, 8, 11, 14 and
   15. Activities to Device as predicted; the first Mute read 32 for about 70 ms and then 11, a second Mute
   read 11 cleanly; the fourth key left of the screen and Mute, which felt unreliable, were pressed again;
   then 14 and 15, d-pad left and Vol -. The arrow left below the screen (12) never appeared and Vol +
   did nothing at all; d-pad up (16) does not appear either. Stopped there.
2. **The key contacts cleaned**: the remote opened and its domes cleaned. Pressed freely while open, 71
   presses over 48 of the 55 codes, every key pressed registering, some needing a firmer press; Vol + gave
   13. 1, 2, 5, 6, 7, 11 and 37 do not appear in that log.
3. **The map run**, steps 1 to 14 of the step list: every key gave the code predicted for it but six, and
   all 55 codes came in this run, five of them on a second press.
   Exit, 0, OK, d-pad down and d-pad right registered nothing in the run and were pressed again, 18, 32,
   33, 34 and 35. Glow (41) showed on `0x3A1` only, a press shorter than one poll of `0x295`.
4. **The six**: Info 51, Blue 52, Skip 53, Fwd 54, Pause 55, Play 56, where the prediction had Skip 51,
   Fwd 52, Pause 53, Play 54, Info 55, Blue 56: the prediction's order rotated by two. In the first pass of
   that row the two keys after Fwd gave 56 then 55, the reverse of the step list's Pause then Play. The row
   was pressed again in the step list's order, giving Pause 55 and Play 56, and then each of the six alone,
   whose names the log does not hold; `h885_b` gives Pause 55 and Play 56 too. So two passes against one,
   each named by the order asked, until the check by position under `h885_b` below settled it.
5. **Mute held**: `0x295` read 11 for 3.85 s and cleared on release; an earlier hold of 0.71 s was a short
   one.
6. **Never seen**: 4, 9, 28, 30, 39, 42, 47, 49 and 64, the codes the key table leaves empty. The Mute reading 32
   before the cleaning did not recur in any press after it.

`0x3A1` read 13 at rest when the map run started, Vol +, the last key of the free pressing.

### `h885_b`

Sixteen keys, each the code `h885_a` gave: Guide 50, Info 51, Blue 52, Skip 53, Fwd 54, Pause 55, Play 56,
Activities 1, Help 3, the bottom key left of the screen 8, the top key right of it 45, Exit 18, 0 32, OK 33,
d-pad right 35, Enter 63, named by the order the notes give, which is the order the log shows. So the six
hold on a second unit. `0x3A1` read 53 at rest before any press, a key no filed log shows.

**By position**, afterwards (`h885_b_keys_by_position`). The colour keys carry a colour and no text, so
their names, and Pause and Play's, had rested on the order asked. Asked instead by where they sit in the
manual's drawing, the colour keys left to right along their curve and then the transport block's top right
key and the one below it: Red 20, Green 19, Yellow 60, Blue 52, Play 56 and Pause 55, the codes the map
already gave. So A's first pass of the transport row, 56 then 55, was the one out of order.

The predictions came from a contributor's survey of a Harmony 880 board with four 885 additions, in the
lab; the test header says how it was read and scores it, 49 keys right and six wrong.

## 6 November 2026: the key page in Chrome, and Glow

The key page, `todo/todo-prepare-885.md` 2.6, run in Chrome against a bench 885 at the desk; which unit was
not recorded. It sends the version request and the one byte read of the held key and nothing else. It
connected, proposed the model from the skin, and showed every press, in all three steps.

**Pressing Glow while the page polls ends the connection**, as reported at the bench: the remote's screen
went fully off and its replies stopped; a second Glow did not bring the cable back, and unplugging and
plugging in did, after which the remote was fine. Glow had lit once on the page before it happened. The
node watcher's whole key map run, the day before, kept answering after its one Glow. The cause is not read,
so the page warns against Glow rather than explaining it.
