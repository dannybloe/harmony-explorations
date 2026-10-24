# Layout: how Logitech's compiler places a container

Logitech's compiler, which ran on their servers, turned a person's devices and activities into the
configuration file a remote holds. This page is about **where that compiler puts things** inside the file: the
fixed frame at the start and the end, the order of the tables in between, and the order of the entries inside a
list. Almost none of it matters to the remote, which finds what it needs by the addresses the file states. It
matters to anyone who wants to write a file Logitech's compiler could have written, and to anyone comparing two
compiles, because two compiles of the same account can differ in most of their bytes and still mean the same.

What each structure is lives on its own page: [the container](container.md) for the header, the section table
and the trailer, and the page for each base slot for its table. What it costs to move something once it is
placed is [relocation](relocation.md).

**Which remotes this covers.** The frame and the placement are measured on the Harmony 600, 650 and 700 and on
the Harmony One[^s318][^s395][^s426]. The Harmony 525, 880, 885, 890 and 895 are not checked, and
`layOutContainer` refuses them[^s426]. The hash order at the end of this page is measured more widely, and says
where.

## The frame

On the Harmony 600, 650 and 700 every byte of the frame is decided by the content, the skin and the build
time[^s318]. `layOutContainer` in `packages/codec/src/frame.ts` lays a container out and `takeApart` takes one
apart, and between them they rebuild all thirteen of Logitech's compiles for these models byte for byte, with
every address field zeroed first[^s318].

| bytes | value | decided by |
|---|---|---|
| `0x00` | `GSPM` | constant |
| `0x04` | `end_addr` | the flash base plus the length less four |
| `0x08` | `0x1400`, two bytes, then a zero | constant: twenty slots, [the container](container.md). Read as a `u32` it runs into `0x0B`, the first item's spare byte |
| `0x0B` | twenty `{ 0; u24 }` items | where each table landed; base slots 18 and 19 NULL |
| `0x5B` | `LWJL` | constant |
| base slot 1 | `0e 0e` skin `0d 00 00 00` | the skin is an **input**: the two Harmony 600 compiles state 71 and 73 |
| base slot 3 | `df ad` seven fields `bf ef 00 00 00` | the build time, [header records](header-records.md) |
| every address field | `u24` | where its target landed |
| `end - 6` | checksum | the trailer checksum, [the container](container.md), over whole 16 bit words |
| `end - 4` | `PTYY` | constant |

**The Harmony One's frame is laid out by the same rule**, with what differs held as data rather than in a
second linker: the format word `0x1600` and twenty two slots, raw slot 8 NULL, raw slot 18 two zero bytes with
nothing parked in front of it, base slot 17 the touch hit map's own table, with the picture bank on the byte
after it, and the configuration at flash `0x040000`[^s395]. All nineteen distinct compiles Logitech made for
the One rebuild byte for byte, and so do fifteen configurations this project composed[^s395]. The One's safe
mode configuration, stamped 2007, rebuilds but for the one byte of its architecture record that every
configuration from 2009 on states differently, [header records](header-records.md)[^s395].

`layOutContainer` also refuses a layout whose base slot 13 clock records disagree with the build time it is
given, which is a consistency rule of this project and not something the remote checks[^s318].

## Where everything else goes

In order, with no padding anywhere[^s318][^s395]:

```
0x5F             the key table, mode 0's record, where the parsers read it
                 the body: every structure reached only through an address, in Logitech's order
base slot 0..17  each table, preceded by what Logitech parks in front of it:
                   5   base slot 5's infrared groups, in the order the table names them
                   7   per font set in the table's order: its glyphs in field order, then the set
                   9   the mode pages' own tagged lists, in an order only partly stated (below)
                   10  the action lists the body does not hold, which are the table's tail, in
                       table order
                   15  base slot 15's parameter groups, in the order the table names them
                 the picture bank, immediately after base slot 17
end - 6          the trailer
```

On arch 14 base slot 17 is two bytes and the bank follows them; on the Harmony One base slot 17 is the hit map's
table and the bank follows that[^s395].

**What is parked, and in what order, is decided by the content**: a parked structure follows everything it names,
and the parked pieces of a table come in the table's own field order[^s328]. `placePieces` in
`packages/codec/src/placer.ts` places them from an unordered bag and gives Logitech's order exactly for base slots
5, 7, 10 and 15, on all thirteen arch 14 compiles[^s328] and on all nineteen of the Harmony One's[^s426]. On the
One no glyph is shared between font sets, and the parked action lists are base slot 10's tail, as on arch 14[^s426].

## Two orders the content does not fix

**The picture bank and the mode pages' lists come out in a different order in compiles that hold the same
pictures.** Two Harmony 700 compiles that hold the same pictures, named in the same order, and differ in 14 body
pieces and their build time put them in different permutations, and no two arch 14 compiles holding the same
pictures put more than 3 at the same place[^s328]. On the Harmony One two compiles whose bodies differ in five
clock records put 3 of 75 pictures and 1 of 198 page lists at the same place[^s426]. What fixes the order is
not known[^s328][^s426].

One constraint on the page lists is stated on every compile: each action list parked in front of base slot 10 is
called once, by instruction `0x7F`, from exactly one page list, and the page lists call them in ascending
number[^s328][^s426]. Two configurations this project composed break it and ran on a Harmony 650, so it is
Logitech's habit and not the remote's demand[^s328b]. `placePieces` keeps that order, puts the other page lists
in their pages' body order and the pictures in the order a screen program first names them; with Logitech's two
permutations substituted, every compile comes back byte for byte, and as placed every One mode page draws pixel
for pixel as Logitech's[^s328][^s426].

**So two compiles of one account are not one file.** Three arch 8 (Harmony 880 and 885) configurations made in one sitting
differ in 73 to 84 percent of their bytes[^s14], and two compiles of an unchanged Harmony One account differ
in 67 percent[^s132][^s154]. Two compiles that share a build timestamp are byte identical, so the reshuffle
travels with that field[^s154].

## Nothing on the remote reads these positions

Read on the Harmony 600 0.2, 650 0.2 and 0.4 and 700 2.8 images[^s328c]:

* **base slot 17 is fetched at two call sites, and both index it as the hit map's** `count, u24[]`; neither adds
  the two bytes that lead to the picture bank;
* **past the header, the container validator's only fixed offset is the marker at `0x5B`**: it reads the cookie at
  0 and `end_addr` at 4, then compares `LWJL` at `0x5B`, and finds the end marker and the checksum through
  `end_addr`;
* **no instruction that loads a literal loads `0x5F`**, the key table's offset. That is a negative over literals,
  and an offset computed from the marker would not show in it; mode 0 is reached through base slot 6[^s311].

Pictures are drawn by the address a screen program states[^s146]. So placement is free as far as anything found
on these images reads it, and the parked pieces moved by the two configurations above ran[^s328b]. No container
with the key table or the bank elsewhere has been written, and this project's own readers find both by position,
so `layOutContainer` keeps them where Logitech puts them[^s328]. The firmware half is not read on the Harmony
One[^s426].

## The order is a hash table's bucket order

**Where the compiler builds a list out of a map keyed by small numbers, it stores the entries in that map's
iteration order**, which is ascending

    hash(k) & (capacity - 1),   hash(k) = k ^ (k >>> 7) ^ (k >>> 4)

with a capacity of 16 doubled while the entry count exceeds three quarters of it. That is `java.util.HashMap` in
Java 6 and 7, whose supplemental hash has two more terms that are zero for a key below 4096; Java 5 and earlier
hash differently and fail every list measured, and Java 8 and later hash such a key to itself[^s315]. That
Logitech's compiler is written in Java is an inference from this alone[^s315].

It holds on four kinds of list:

| list | key | where it holds | footnote |
|---|---|---|---|
| mode 0's key list after the end marker | the tag | 39 lists of two or more entries, 12 distinct, on arch 8, 10, 12, 14 and 16, with no step down; the hash is pinned term by term | [^s315] |
| every mode and page tagged list | the tag | 6921 of 6921 lists of two or more tags in the thirteen arch 14 compiles, every device mode page included, and the key sets of 40 of 40 activities | [^s330][^s323] |
| the name tree's level 1 nodes | the state variable's index | 13 of 13 arch 14 compiles, and none fits in index order; 22 distinct trees on arch 8, 9, 12 and 16 with no step down | [^s324] |
| base slot 14's cases | the case value | all 410 records of two or more cases in the thirteen arch 14 compiles; the 332 that are not ascending hold only the key sets 0 to 20 and 0 to 450, 166 records each, each set in one identical order, and the other 78 have every key below 16, so those two sets are what pin it | [^s319] |

**The capacity is pinned only in places.** Two arch 16 key lists, of 11 and 13 entries, fit 16 and 32 buckets
and fail at the other, so the threshold lies between them; the 55 to 59 entry lists fit both 64 and 128 and are
pinned from above only; the two Harmony 600 name trees, 32 and 41 nodes, fit 64 buckets and fail at 128. The
starting 16 is Java's default, adopted rather than measured[^s315][^s324]. For base slot 14 the table size is
unknown, and a key set outside the measured ones, 0 to 15 and the runs 0 to 20 and 0 to 450, may come out in
another order: keys 2 to 13 and 16 would put 16 first under one rule and last under the other, so
`compilerCaseOrder` accepts only those sets[^s319].

**Two keys in one bucket keep an order the rule does not give.** 33 of the 39 key lists hold such a tie, and
mode 0's list on a Harmony 600, 650 and 700 holds none, since at 256 buckets the hash is a one to one map of a
byte[^s315]. In a device mode's key map `0x2D` precedes `0xA4` in their shared bucket on 83 of 83; in other modes'
lists `0xC3` is stored before `0x87` on 454 lists and after it on 117, which fits a map that puts a new entry at
the head of its bucket, so a tie shows the order the compiler inserted the keys in[^s330]. No arch 14 name tree
has a tie; on arch 8 and 12 ten distinct pairs tie, fifteen times, and every time the larger index is
stored first[^s324].

**Where it does not hold, or is not settled**: the Harmony 525's safe mode configuration's mode 0 list steps down
at every capacity from 16 to 256[^s315]; on arch 8, 9 and 12 base slot 14's cases all have keys below
16, where the hash is the key itself, the largest 9 over 65 records, so they fit any rule[^s319]; the Harmony
890 and 895 have no name tree[^s324], and their value maps are not scored, having no reader here[^unchecked].

**Nothing on the remote reads any of these orders.** A key lookup takes the first equal tag[^s311], base slot
14's exact match walks the cases in stored order and leaves at the first equal key, trying the range table only
when none matched, `0x19A2E` on the Harmony 600's 0.2 image and `0x1B30A` on the Harmony 700's 2.8[^s319b],
and base slot 0, the name tree, is read by the host and not by the remote,
[header records](header-records.md). The order is reproduced so that a written file is one Logitech's compiler
could have written: `modeZeroKeyList`, `compilerTagOrder`, `buildNameTree` and `compilerCaseOrder` in
`packages/codec` generate it, each refusing a tie it has not measured.

## For a writer

* **Make minimal changes to an existing configuration.** Reproducing what Logitech's compiler would have written
  for a changed account is not possible, because the bank's and the page lists' order is not fixed by the
  content[^s328][^s154].
* **Keep the key table directly after the marker and the picture bank directly after base slot 17.** Nothing
  found on the remote demands it, and nothing with them elsewhere has been written[^s328].
* **Order a new list's entries by the bucket rule** where the file is meant to match Logitech's, and leave a tie
  in an existing list as it is stored[^s315][^s330].

[^s318]: Measured in configurations. [Section 318](../../docs/findings.md#s318)
[^s395]: Measured in configurations. [Section 395](../../docs/findings.md#s395)
[^s426]: Measured in configurations. [Section 426](../../docs/findings.md#s426)
[^s328]: Measured in configurations. [Section 328](../../docs/findings.md#s328)
[^s328b]: Measured on a unit. [Section 328](../../docs/findings.md#s328)
[^s14]: Measured in configurations. [Section 14](../../docs/findings.md#s14)
[^s132]: Measured in configurations. [Section 132](../../docs/findings.md#s132)
[^s154]: Measured in configurations. [Section 154](../../docs/findings.md#s154)
[^s328c]: Read in the firmware. [Section 328](../../docs/findings.md#s328)
[^s311]: Read in the firmware. [Section 311](../../docs/findings.md#s311)
[^s146]: Read in the firmware. [Section 146](../../docs/findings.md#s146)
[^s315]: Measured in configurations. [Section 315](../../docs/findings.md#s315)
[^s330]: Measured in configurations. [Section 330](../../docs/findings.md#s330)
[^s323]: Measured in configurations. [Section 323](../../docs/findings.md#s323)
[^s324]: Measured in configurations. [Section 324](../../docs/findings.md#s324)
[^s319]: Measured in configurations. [Section 319](../../docs/findings.md#s319)
[^s319b]: Read in the firmware. [Section 319](../../docs/findings.md#s319)
[^unchecked]: Not checked.
