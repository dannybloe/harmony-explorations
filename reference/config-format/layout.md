# Layout: how Logitech's compiler places a container

### What decides each byte of the frame on arch 14

Arch 14 (Harmony 600, 650 and 700); [findings.md](../../docs/findings.md) section 318. Laid out by
`layOutContainer` in `packages/codec/src/frame.ts` and taken apart by `takeApart`, which reproduce all
thirteen arch 14 compiles in the lab byte for byte with every address field zeroed first. **The same linker
lays out the Harmony One**, section 395, with `0x1600` and twenty two slots, raw slot 8 NULL and raw slot 18
two zero bytes, base slot 17 the touch hit map's own table with the picture bank on the byte after it, and the
configuration at `0x040000`; all nineteen distinct Logitech One compiles and fifteen of our writes rebuild.

| bytes | value | decided by |
|---|---|---|
| `0x00` | `GSPM` | constant |
| `0x04` | `end_addr` | flash base plus the length less four |
| `0x08` | `0x1400`, two bytes, then a zero | constant: twenty slots, section 194. Read as a `u32` it runs into `0x0B`, the first item's spare byte |
| `0x0B` | twenty `{ 0; u24 }` items | where each table landed; base slots 18 and 19 NULL |
| `0x5B` | `LWJL` | constant |
| base slot 1 | `0e 0e` skin `0d 00 00 00` | the skin is an **input**: the two Harmony 600 compiles state 71 and 73 |
| base slot 3 | `df ad` seven fields `bf ef 00 00 00` | the build time. The frame refuses a layout whose base slot 13 records 0 to 6 state other values, a consistency rule of ours |
| every address field | `u24` | where its target landed |
| `end - 6` | checksum | section 41, over whole 16 bit words |
| `end - 4` | `PTYY` | constant |

Where everything else goes, in order, with no padding anywhere:

```
0x5F             the key table, mode 0's record, where the parsers read it, section 52
                 the body: every structure reached only through an address, in Logitech's order
base slot 0..17  each table, preceded by what Logitech parks in front of it:
                   5   base slot 5's group arrays, in the order the table names them
                   7   per font set in the table's order: its glyphs in field order, then the set
                   9   the mode pages' own tagged lists, in an order only partly stated (below)
                   10  the action lists the body does not hold, which are the table's tail, in
                       table order
                   15  base slot 15's parameter groups, in the order the table names them
                 the picture bank, immediately after base slot 17's two bytes, section 62, in an
                 order the pictures and the pages do not fix
end - 6          the trailer
```

**What is parked and in what order is decided from the content**, [findings.md](../../docs/findings.md) section
328: a parked structure follows everything it names, and the parked pieces of a table come in the
table's own field order. `placePieces` in `packages/codec/src/placer.ts` places them from an
unordered bag and gives Logitech's order exactly for base slots 5, 7, 10 and 15 on all thirteen
compiles. **Two orders are not fixed by the pictures or the pages**: the picture bank and the mode
pages' lists come out in a different permutation in `h700_config` and `h700_config_2`, which hold the
same pictures named in the same order and differ in 14 body pieces and their build time, and no two
compiles holding the same pictures put more than 3 at the same place. One constraint on the second is
stated on the thirteen compiles: each action list parked in front of base slot 10 is called once, by
instruction `0x7F`, from exactly one page list, and the page lists call them in ascending number. It
does not hold on our two configurations that ran, so it is Logitech's habit and not the remote's
demand. `placePieces` keeps that order and puts the rest of the page lists in their pages'
body order and the pictures in the order a screen program first names them; with Logitech's two
permutations substituted, all thirteen come back byte for byte.

**The Harmony One is placed by the same rule, with nothing of its own**, [findings.md](../../docs/findings.md)
section 426: on all nineteen distinct One compiles, twenty fixtures, base slots 5, 7, 10 and 15 come
back exactly from a shuffled bag, the parked action lists are base slot 10's tail and are called once
each in ascending number by the page lists, no glyph is shared between sets, and with Logitech's two
permutations substituted every compile comes back byte for byte; as placed, every mode page draws
pixel for pixel as Logitech's. Its raw slot 18 is carried with nothing parked in front of it. The bank
and the page lists are not fixed on the One either: `calibration_favchannels` and `phase7_before`,
whose bodies differ in five clock records, put 3 of 75 pictures and 1 of 198 page lists at the same
place; what fixes the order is open, and no two One compiles share a build time. The firmware half is unread on the One, whose bank the container states nowhere. On the
composed path `composeSetup` places the result the same way, after the look and before the stamp.

**A Harmony One with nothing in it**, [findings.md](../../docs/findings.md) section 431, `buildTouchSkeleton` in
`families/touch/skeleton.ts`: every check the parser runs passes with these empty forms, and nothing has been written
to a remote.

| base slot | empty form | count width, 19 of 19 One compiles |
|---|---|---|
| 2 | nine zero bytes, the log area's length on the One; a placeholder, since every compile states its region | |
| 4 | `00 00 00 00 00`, fallback mode 0 and no status code | |
| 5, 9, 12, 15, 17 | `00` | one byte |
| 6 | `00 00 00` | three bytes |
| 8 | `00`, an action list of nothing | |
| 10, 11 | `00 00` | two bytes |
| 16 | `00`, no favourite channel | one byte |
| raw slot 18 | `00 00`, nothing parked in front, as on every One compile | |
| key table | `00 00`, the empty tagged list, until mode 0, Low Battery, has its own key map | |

The key table every One compile holds is one constant, the same bytes on 19 of 19: 55 entries, entry `k` calling
action list `k`, the firmware screens' own lists, so it comes with them. Base slots 0, 13 and 14 hold the eighteen
firmware variables, the first seven the stamped clock, and the compiler's two byte variable; base slot 7 holds
section 427's 18 sets. `takeApart` refuses a container with no mode, since it finds the key table's end through mode
0's record.

The order of the body is carried, not derived. **Nothing on the remote reads any of these orders or
positions that has been found**: on the Harmony 600 and 650 0.2, 650 0.4 and 700 2.8 images, base slot
17 is fetched at two call sites, both indexing it as the hit map's `count, u24[]` and neither adding
the bank's two byte bias; past the header, the cookie at 0 and `end_addr` at 4, the validator's only
fixed offset is the marker at `0x5B`, and no literal instruction on the four loads `0x5F`, the key
table's offset; pictures are drawn by stated address, section 146,
and mode 0 is reached through base slot 6, section 311. Two configurations of ours parked more in front
of base slots 5 and 9 and ran on the Harmony 650, sections 285 and 291. A container with the key table
or the bank elsewhere has not been written, and our own readers find both by position. Every compile's
build timestamp is laid out from its time.
**Corrected by section 322**: this said one compile states day 0 of October with 30 September's
weekday<!--superseded--> and was carried as field bytes. The day counts from 0, so that stamp is
Thursday 1 October and the encoder produces it; the six said to be stamped that day were made on the
2nd.
### The order is a hash table's bucket order

The list after the end marker stores its entries in ascending `hash(tag) & (capacity - 1)`, with
`hash(t) = t ^ (t >>> 7) ^ (t >>> 4)` and a capacity of 16 doubled while the count exceeds three
quarters of it: `java.util.HashMap` in Java 6 and 7. No step down on any of the 39 such lists of two or
more entries in the parseable corpus, 12 distinct and six of them contained in no other, on arch 8, 10,
12, 14 and 16. The hash is pinned term by term; the capacity only in places, and the starting 16 is
Java's default rather than a measurement. Other tagged lists are not asserted, and the Harmony 525's
safe mode container's mode 0 list breaks the rule. Two tags in one bucket
keep an order the rule does not give, and 33 of the 39 hold such a tie; mode 0's list on a Harmony
600, 650 and 700 holds none, so `modeZeroKeyList` generates it. [findings.md](../../docs/findings.md) section 315.
