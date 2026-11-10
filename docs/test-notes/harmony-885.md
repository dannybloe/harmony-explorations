# Harmony 885 test notes

The bench Harmony 885s: what was done to them, in order. What the remote and its platform are is
[the reference](../../reference/architectures/harmony-880-885/README.md).

**Two Harmony 885s are on the bench, and both may be written, unit A first**, decision 30. This said
"neither may be written"<!--superseded--> until that decision. One block has been written to unit A, back
unchanged, and nothing to B; this said "Nothing has been written to either"<!--superseded--> until then. Arch 8 is in
`ARCHITECTURES_WITH_A_WRITE_TARGET` since `todo/done/todo-compile-885.md` 1.2, for the flash block path, unit A and
since 1.8 unit B; this said it was "still not in" the list<!--superseded--> until then. Before them, everything known about
this architecture came from a contributor's firmware images and configurations, read off their remotes.

## The first unit, `h885_a`

Recorded in the lab as `units/h885_a.txt` on 27 October 2026, the first arch 8 remote on a cable here.
Every step was a read.

1. **Enumeration only**: product `0xC110`, `bcdDevice` `0x0811`, product string `Harmony Remote 0-4.4.2`,
   100 mA, one HID interface with interrupt endpoints `0x81` in and `0x02` out, 64 bytes, 1 ms. The
   report descriptor is the image's byte for byte, `TestTheLiveHarmony885MatchesItsImage` in
   `tests/usb_protocol/test_usbdesc.py`.
2. **`GET_VERSION`** through the library, which opened the remote unchanged: `44 21 49 01 80 11 08`. The
   four fields the image predicts agree, `tests/harmony_880_885/test_arch8_usb.py`.
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

`todo/done/todo-prepare-885.md` 2.1 and 2.3, one unit on the cable at a time. Every command was a read, and each
unit was named by its identity block before anything else was read: `read-identity.ts --record h885_a`, and
later `--record h885_b`, both answered unchanged. Both report the version block `44 21 49 01 80 11 08`. The
facts are asserted in `tests/harmony_880_885/test_harmony_885_bench_reads.py`; the files are registered as `h885_a_*` and
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
   the lab's file and `tests/harmony_880_885/test_harmony_885_bench_reads.py`. The
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

`todo/done/todo-prepare-885.md` 2.2, **no remote involved**: the version block both units had reported,
`44 21 49 01 80 11 08`, was compared with the header of every Harmony 880, 885, 880 Pro and 720 configuration
file in the lab through the library's own comparison and rail, sixteen files. Four matched on all five fields
they state, four downloads of one 885 configuration with identical headers; the other twelve were refused on
skin and hardware version and nothing else. `packages/corpus/test/read/compatibility.test.ts` asserts the 885's
match and five of the twelve refusals, the files the lab's registry names; the scripts and the whole table
are the lab's.

## 5 November 2026: every key pressed, watched over USB

`todo/done/todo-prepare-885.md` 2.4. One unit on the cable at a time, named by its identity block first
(`read-identity.ts --record`, unchanged both times), then `watch-keys.ts --product 0xc110 --address
0x295,0x3a1`, which polls the two data memory bytes with `READ_MISC` selector 7 and prints each change.
Every command was a read. The remote showed its USB connected screen throughout, and its keys were scanned
anyway. The Harmony Touch was on the cable as well during the first session, and the product id kept it
out. The logs are registered as `h885_a_keys_*` and `h885_b_keys_check` in `tests/lab.py`, and
`tests/harmony_880_885/test_harmony_885_keys.py` asserts what follows. The rules given for every session: never Power, OK
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

The key page, `todo/done/todo-prepare-885.md` 2.6, run in Chrome against a bench 885 at the desk; which unit was
not recorded. It sends the version request and the one byte read of the held key and nothing else. It
connected, proposed the model from the skin, and showed every press, in all three steps.

**Pressing Glow while the page polls ends the connection**, as reported at the bench: the remote's screen
went fully off and its replies stopped; a second Glow did not bring the cable back, and unplugging and
plugging in did, after which the remote was fine. Glow had lit once on the page before it happened. The
node watcher's whole key map run, the day before, kept answering after its one Glow. The cause is not read,
so the page warns against Glow rather than explaining it.

## 7 November 2026: unit A's whole flash, and the first write to a Harmony 885

`todo/done/todo-compile-885.md` 1.3, **unit A on the cable, unit B for a moment first**. In order:

1. **The block rehearsal's dry run with B connected by mistake**: refused at the unit check, its identity
   block not unit A's record. Nothing past the identity was read.
2. **The same dry run with unit A**: the identity matched `h885_a`, the block `0x0C0000` read off the remote
   matched `h885_a_region`, and the plan was printed: the neighbours read, one erase, 21 transfers, the read
   back.
3. **`read-region.ts` from `0x000000` to `0x1FE000`, the whole flash**: finished, 2088960 bytes.
4. **The same, the second copy, twice**: both stopped on a `flash chunk out of sequence`, once late in the
   run and once early, and filed nothing. The same as unit B's region reads before its restart, below.
5. **Unit A restarted by hand** and plugged in again.
6. **The second copy again**: finished with no break, 68 seconds, byte identical to the first.
7. **The block written back**, `rehearse-block.ts --commit` with both write flags: the unit check passed; the
   neighbours `0x0B0000` and `0x0D0000` read; `0x0C0000` erased and read back as all ones; the neighbours read
   again unchanged; 21 transfers; the block read back byte identical to the dump. **The remote's screen showed
   nothing during the write.** The script prints no times, so the erase was not timed.
8. **`read-config.ts` once**: 568020 bytes, no window retried, SHA-256 equal to `h885_a_config`'s.
9. **Unplugged and used**: it woke, ran an activity and answered keys as before.

**What the backup holds**, `tests/harmony_880_885/test_harmony_885_flash_backup.py`: the application is Logitech's published
885 image byte for byte; the bootloader differs from the published one in 33 bytes, 31 in the identity block's
two per unit fields and two at `0x000162`, beside the battery calibration word; the configuration region is the earlier region read; the
staging region holds 48129 bytes that are not `0xFF`; the log area is erased. Filed as `h885_a_flash` and
`h885_a_flash_2`, and the read after the write as `h885_a_after_block_config`.

**The erase**: the block held bytes from `0x0C0000` to `0x0C542C`, and the bytes directly either side of it,
`0x0BFFFF` and `0x0D0000`, are not `0xFF`; after the erase the block was all ones and both stayed. So the
sector starts on `0x0C0000` and is no larger than 64 KiB. **32 KiB is not excluded**: everything the block
held was in its lower half. A rehearsal on a block whose upper half holds data would decide it.

**Unit A's keys are unreliable**, as said at the bench, and unit B's work better, so hands-on tests run on B
once B has its own backup and one block written back.

## 7 November 2026: unit B's whole flash, and one block written back

`todo/done/todo-compile-885.md` 1.8, **unit B on the cable**. In order:

1. **The dry run at `0x0C0000`**: the identity matched `h885_b`. That block was then given up, after the
   review of 1.3: on B the block under it is live configuration, B's ending at `0x0BB8C7`.
2. **`read-region.ts` over the whole flash**: finished, 2088960 bytes.
3. **The second copy**: stopped at 6% on a `flash chunk out of sequence`, filed nothing.
4. **Unit B restarted by hand**, then the second copy finished with no break, byte identical to the first.
5. **The dry run at `0x0D0000`**: the block matched `h885_b_region`.
6. **The block written back**, both write flags: the neighbours `0x0C0000` and `0x0E0000` read, the block
   erased and read back as all ones, the neighbours unchanged, 21 transfers, the block read back identical.
7. **`read-config.ts` once**: 637127 bytes, no window retried, identical to `h885_b_config`.
8. **Unplugged and used**: it woke and responded to keys and an activity; what each should do on this unit's
   configuration was not compared.

**What B's backup holds**, `tests/harmony_880_885/test_harmony_885_flash_backup.py`: the application is the published 885
image; the bootloader differs from the published one in 34 bytes, all 32 of the identity block's per unit
fields and the two at `0x000162`; the region is the earlier region read; the staging region holds 48129 bytes
that are not `0xFF`, as on A, and the log area is erased. Filed as `h885_b_flash`, `h885_b_flash_2` and
`h885_b_after_block_config`.

**Every read that met a sequence break came before a hand restart**, on both units, and none after one, up
to here; the next section met them after a restart too.

## 7 November 2026: the first whole configuration, unit B's own, restarted

`todo/done/todo-compile-885.md` 1.4, **unit B on the cable**. Its own configuration, `h885_b_config`, copied into
the lab's work folder and written back with a fresh stamp. In order:

1. **The dry run**: stopped on a `flash chunk out of sequence` while comparing blocks; nothing written.
2. **Unit B restarted by hand**, and the dry run again: the identity matched, 17 bytes differ in the blocks
   `0x020000`, `0x050000` and `0x0B0000`, each block matched the dump, the install status at `0x100` read 0.
3. **The commit**, both write flags: the status 0; the cache drop answered; each block erased, read back as
   all ones with its neighbours unchanged, and written; the whole configuration read back identical to the
   file; the status 0 again; the restart `E1 02` sent.
4. **Back on the bus within five seconds**, on its own.
5. **Data memory `0x100` to `0x10F`**: the status 0, the clock `2026-11-07 12:09:18`, a Saturday, against the
   stamp `12:09:07`, with the host clock at 12:10:56. The restart reseeded the clock from the configuration.
6. **`read-config.ts`**: 637127 bytes, one window retried, identical to the written file.
7. **`read-region.ts` twice**: the first finished and differs from `h885_b_region` in exactly the stamp's 17
   bytes; the second stopped on a sequence break and filed nothing.
8. **Unplugged and used**: it looked and behaved as before, as far as could be told at the bench.

`tests/harmony_880_885/test_harmony_885_first_config_write.py`. Filed as `h885_b_written_1_4` (the stamped file, with the
writer's journals beside it), `h885_b_after_1_4_config`, `h885_b_after_1_4_region` and `h885_b_clock_after_1_4`.

**The sequence breaks are not only before a hand restart**, which the sections above said: two of the four
reads after the write's restart met one. The configuration reader asks for the window again; the two region
readers stop. Their window retry is the gap to close before the next long read.

## 7 November 2026: the first composed device, the Sony HT, on unit B

`todo/done/todo-compile-885.md` 2.1, **unit B on the cable**. The file is unit A's configuration with the Sony HT
composed onto it (`h885_composed_2_1`), so B now carries A's devices and activities plus the Sony, as 1.6
decided; B's own configuration stays in the lab backup. In order:

1. **The dry run**: nine blocks differ, `0x020000` to `0x0A0000`, each matched B's region after 1.4; the
   status read 0.
2. **The first commit**: stopped on a `flash chunk out of sequence` while comparing, before the drop; nothing
   was written. The writer's block reads then gained the shared window retry.
3. **The commit again**: the status 0; the drop; nine sectors erased, each with its neighbours unchanged, and
   written; the whole configuration read back identical to the file; the status 0; `E1 02`.
4. **Back on the bus within ten seconds**; the clock `16:01:16` against the stamp `16:01:09`, the status 0.
5. **`read-config.ts`**: 572238 bytes, no window retried, identical to the written file.
6. **At the bench, against the prediction**: the device list has a second page with Sony HT at the top left
   and "1 OF 2" on the first, outside the activities and inside one; the Sony page shows its title and the
   eight labels where predicted; nothing looked wrong. What the keys send was not measured.

Filed as `h885_b_written_2_1` and `h885_b_after_2_1_config`; `tests/harmony_880_885/test_harmony_885_first_config_write.py`.
**B's region has not been read since**, so the next write to B starts with a region read as its compare base.

## 8 November 2026: the Sony HT's power with its silence, on unit B

`todo/done/todo-compile-885.md` 2.2 and 2.3, **unit B on the cable**. The file is 2.1's composition again with the
Sony HT's two power records opening with 500 ms of silence and sent at a quantity of 1 (`h885_composed_2_3`).
In order:

1. **`read-region.ts` over `0x020000` to `0x1D0000`, once**: no window retried; 2.1's written file in its first
   572238 bytes, and the region after 1.4 outside the nine sectors 2.1 erased. Filed as `h885_b_after_2_1_region`,
   the compare base from here on.
2. **The dry run**: the unit matched `h885_b`; seven blocks differ, `0x020000` and `0x050000` to `0x0A0000`, each
   matched the region; the status read 0.
3. **The commit**, both write flags: the status 0; the drop; seven sectors erased, each staying inside its own
   block, and written; one window asked for again during a block compare; the whole configuration read back
   identical to the file, one window asked for again; the status 0; `E1 02`.
4. **Back on the bus by itself**; data memory `0x100`: the status 0, the clock `16:51:19` against the stamp
   `16:51:12`.
5. **`read-config.ts`**: 572270 bytes, six windows retried, identical to the written file.
6. **At the bench, with the infrared monitor**: on the Sony HT page, Vol + and Power pressed in turn, twice. Each
   press was heard as three frames; Power as the Sony HT's power code, which the monitor matched against
   Logitech's own compile of that device. The half second before Power was not observable at the bench: the
   monitor times a frame from the one before it, not from the key press. The screens were not reported changed.

Filed as `h885_b_written_2_3`, `h885_b_after_2_3_config` and `h885_b_clock_after_2_3`;
`tests/harmony_880_885/test_harmony_885_first_config_write.py`.

