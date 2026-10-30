# Modes and keys

A Harmony shows one screen at a time, and a configuration calls each such screen a **mode**: the activity
menu, a device's own page of commands, a help message, the "Starting" screen of an activity. A mode can
run over several **pages**, the screenfuls a person moves between. This page is about how a configuration
says what pressing a key does on whichever screen is showing.

The answer is a lookup. Each page carries a short map from keys to actions, each mode carries one more,
and an activity, while it runs, installs a map of its own underneath them. A key press is looked up in
the page's map first, then the mode's, then the activity's and a few fixed maps the remote always has,
and the first map that knows the key decides. So a screen can give a key a meaning of its own, and every
key the screen does not mention falls through to the activity.

Those are the two maps a person meets, [How a Harmony works](../how-a-harmony-works.md). **A device's
map**, what device mode gives you, is that device's mode's own map: pick the device and every key
points at it. **An activity's map** is one entry of a table of key maps, installed when the activity
starts. Two devices holding the same key is no conflict, since each device's map holds that device
alone.

A key is known by its **scan code**, the number the keypad reports for it, and a press, a release and
a held repeat are three different events of one scan code. On the Harmony One the touch screen reports
scan codes too, through a table of rectangles.

Below, in order: how a press is resolved; the mode table (base slot 6), its key table and its pages;
the one encoding every map shares; the activities' key maps (base slot 9); the screen keys' bindings
(base slot 8); the touch rectangles (base slot 17); and what a scan code is on each architecture.

## How a key press is resolved

A press is looked up in the current page's own map, then the current mode's own map, then a stack of
key maps the activity and the remote install, and **the first entry whose tag matches decides**: the
firmware runs that entry's instruction and nothing else[^s39]. So a page **overrides** its mode rather
than replacing it. That walk is read in the firmware of the Harmony 600, 650 and 700, where the mode
itself is one place on the stack[^s333]; on the other models it is not read, below.

**On the Harmony 600, 650 and 700 the stack is read in the firmware**, on the 700's 2.8 and the 600's
and 650's 0.2 images, and three of the values it can hold are indirections rather than entries[^s333]:

| stack byte | resolves through |
|---|---|
| `0xFD` | the current mode: its page's list, then the mode's own list |
| `0xFE` | the running activity's entry, the one `0x1F` band `0xFF` selects (`0x120` on the 700, `0x217` on the 600 and 650) |
| `0xFC` | the entry `0x1F` band `0xE8` names (`0x121`, `0x218`) |
| anything else | that base slot 9 index itself |

One variable holds the running entry, so an activity replaces the idle entry rather than stacking on
it[^s333]. On all thirteen of Logitech's compiles for these models read there, one boot list pushes
`01, FE, FD, FC, 02` in that order, and band `0xE8` names entry 0, 3 or 4, so a key is looked up in entry
2, the `0xE8` entry, the current mode, the running entry, then entry 1[^s333]. Entries 2 and 3 bind the
press of all 54 scans to shared lists; whether those lists consume a press depends on a return value
that is not read[^s333]. Device mode leaves the running entry alone: no device list row selects or
pushes one[^s333].

**The order is the mechanism**: it is what lets one map override another rather than merely coexist
with it[^s176]. The push and the pop are opcode `0x1F` with high byte `0xFE` and `0xFD` and the base
slot 9 index in the low byte, run by an entry's enter and leave handlers[^s176].

**Help is scan 3, and among the key maps only the running entry binds it**, on these three models: the
release and the repeat on 40 of 40 activity entries and 13 of 13 idle entries and on no other entry, and
scan 3 in no device mode, 0 of 83[^s333]. Modes bind it too, 467 of them, all the remote's own help,
delay and status screens and none a device mode, start up screen or working screen[^s333]. So an entry
with no scan 3 binding makes Help do nothing on its own screens and in device mode entered from it,
which is the form a composed activity takes. What Help does for a person is
[How a Harmony works](../how-a-harmony-works.md#help-belongs-to-what-is-running-never-to-a-device).

## Base slot 6: the mode table

Every screen the remote can show is an entry of this table, which is why it has hundreds of entries
where a Harmony has a handful of activities[^s37]. No field says what kind of screen an entry is.

```
+0x00  u24  count
+0x03  u24  address[count]
```

A `u24` count, where the six recognised pointer arrays use a `u8` or a `u16`, so the parser's array
heuristic does not pick this slot up[^s37]. Measured on 15<!--fact:user_configs--> user configurations
across four architectures[^s37].

**The count is exactly one more than the largest `0x7E` operand, in every configuration**, over counts
from 75 to 374, and every value in base slot 4's event map is in range too[^s37][^s263]. So `0x7E` and
the event map both index this table, and `0x7E` is the instruction that **switches to the entry its
operand names**[^s37].

**The pointer does not land on the entry.** It lands inside the record, on a discriminator byte with a
`u24` back pointer to the record's start immediately after it, as base slot 5's infrared records
do[^s52]:

```
at the record start   u8 count; { u8 tag; u16 operand; u8 opcode }[count]
at the table pointer  u8 kind; u24 the record's own start; u16 pages; u24 page[pages]
```

Records are contiguous and run to about seven hundred bytes, so the pointer lands hundreds of bytes past
the head. The closures, over 2926 records in 21 containers: the back pointer always points backwards, and
the count read at the start always gives a list that fits inside the record, where a wrong start
overruns[^s52][^s141].

`kind` is 0 in 2326 entries and 1 in 70, all of the latter on arch 8 and arch 12[^s66b]. The firmware
tests its bit 0 and branches, so it is a flag[^s66]; what it selects is not read, below.

The entry is `6 + 3 * pages` bytes: the offset and the stride are the two literals the consumer at
`0x16816` on the Harmony 700 feeds to its `3 * index + literal` helper, so neither is inferred from the
bytes[^s37][^s66].

The record's list maps a **tag** to one action list instruction, in the encoding under
[Tagged lists](#tagged-lists). Two tags are the handlers: **tag 7 when the mode is left and tag 6 when it
is entered**, the only two the Harmony 700's and the Harmony 600's images select[^s37], and on the Harmony One every mode
carries exactly one of each, 379 of 379[^s52]. The other tags are key codes.

### A device's mode is device mode's keypad map

**Those key codes are device mode's keypad map**[^s271]. The record's own list is the keypad and its
pages are the screen. For every infrared group in the corpus, the mode whose two maps are largest for
that group is unique, exists, and sends **only** that device:

| | count |
|---|---|
| device groups with at least one infrared code | 62 |
| such a mode exists, uniquely | 62 |
| it addresses exactly one device, on keypad and pages alike | 62 |
| keypad bindings across the 62 | 1609 |
| screen bindings across the 62 | 1818 |

Measured over the fifteen user configurations on four architectures[^s271]. The two halves are
comparable in size and **which is larger varies**: the screen half is larger in 8 of the fifteen and the
keypad half in 7, so the corpus total is not a statement that device mode is mostly screen[^s271]. They
are disjoint populations: no scan code appears in both halves in any of the fifteen[^s271].

**On the Harmony One the drawn device list's own row enters exactly this mode**, 8 of 8 over four
configurations, which is the closure, since that route reads the screen and never an infrared
group[^s271]. **On the Harmony 600, 650 and 700 the same closure holds for 21 of the 23 rows it can
compare**, over four user configurations and a calibration configuration; the two that do not are one
device's, an A/V switch on two configurations of one Harmony 700, whose mode binds no key[^s285]. There
the reader is wrong and not the list, below.

**On those three models a device's mode binds every key**: on all 21 device modes of the four user
configurations the mode's own list holds 47 entries, the mode's two navigation entries, a `0x72` and a
`0x73`, and one per key, each sending that device's command or bound to **nothing**, never left
out[^s285].

How a device's map relates to the activities' maps is [base slot 9](#a-set-is-one-activitys-keypad-map)
below. Read with `deviceModeMaps` in `packages/codec/src/inventory.ts`.

### The key table is the first mode record

**The container's key table, the table after the marker that closes the section table (`LWJL` or `WLWL`), is the first mode record**, byte for
byte: same offset, same count, same four byte entries[^s52]. The tagged list encoding and the key table
encoding are one encoding.

So its length is the record's, and a record has two forms: **an empty one is the wide form**, a zero
lead byte and a zero count, two bytes where `1 + 4 * count` says one[^s84]. That is the whole of it on
the Harmony 600's, 650's and 700's safe mode containers. On the Harmony 525 there is no key table at the
marker at all, and the record there is an ordinary mode record, 189 bytes in its safe mode
container[^s84].

**It is mode 0's own tagged list**, and each entry is a key event with one action list instruction, run
when mode 0 is on screen and the event matches[^s311], read in the Harmony 600's 0.2 firmware. Mode 0 is
the "Use the Harmony setup software to add an Activity on this button" screen on a Harmony 600 and 650,
which an activity key with no activity opens by pushing the mode and entering mode 0; a page with no text
on a Harmony 700, whose placeholder is mode 4; and "The battery level is low!" on a Harmony One[^s311b].
An entry of `00 00 00` is a deliberate swallow: the key matches, the all zero instruction is dropped,
and nothing below it sees the key[^s311].

```
u8   event_code    event type in the top two bits, scan code in the rest
u16  operand       the operand of one action list instruction
u8   opcode        that instruction's opcode
```

**Logitech's compiler writes it as a constant per model**, ordered by
[the hash rule](layout.md#the-order-is-a-hash-tables-bucket-order)[^s311b]:

| model | entries | content | containers carrying exactly these bytes |
|---|---|---|---|
| Harmony 600 and 650 | 162 | every scan 1 to 54 as release, press and repeat, each `00 00 00`, except the press of scan 25, `FC FF 07`: instruction `0x07` with `0xFFFC`, pop the mode stack | 19 |
| Harmony 700 | 163 | an enter handler, tag `0x06`, setting one state variable to 1 (opcode `0x80` plus its number: the low battery flag, the variable the Low Battery screen's Exit clears, which every battery screen sets on entry; 40, 43 or 44 so far[^s357]), then the 600's 162 key events in the same order, all `00 00 00`, scan 25 included | 10, in 3 variants by that one byte |
| Harmony One | 55 | 52 presses plus `0x06`, `0x07` and `0x2D` with no event bits, each `0x7F`, calling the action list numbered by its own position, 0 to 54 | 34, every user configuration |
| Harmony 880 and 885 | 56 or 58 | 53 presses plus the same three as the One, in the same order on five configurations, with operands differing in 2 of 56; one Harmony 885 configuration has 58 | not one constant |
| the Harmony One's safe mode configuration | 2 | the presses of scans 47 and 46, a two button recovery screen | |
| the Harmony 700's region 3 | 0 | empty | |
| Harmony 525 | none | the byte where a count would sit after `CMAH` is zero; the keys are bound in the mode records instead, [its keys page](../remotes/harmony-525/keys.md#fifty-keys-and-every-one-is-bound) | |

On the Harmony 880 and 885, 890, and 300 and 350 it is not one constant: configurations agree in some
pairs and differ in others[^s311b]. **On the Harmony 300 and 350, which have no mode table, it is not a
mode's list at all**: it is entry 0 of base slot 9, the map looked up last, holding the device keys and the
activity's key, [their memory page](../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for)[^t-harmony-350-slots]. The codec
generates the Harmony 600, 650 and 700 tables rather than copying them, `modeZeroKeyList` in
`packages/codec/src/families/four-slot/modezero.ts`.

So the Harmony 600, 650 and 700 enumerate all three event types for every key, while the Harmony One and
the Harmony 880 and 885 record presses only[^s17]. That is a difference between the architectures and
not an artefact of the reading.

**A screen program follows the list**, at the record's start plus the list's length, and every record
has one on **every** architecture: 374 of 374, 237 of 237, 268 of 268, 103 of 103, 114 of 114, and 35 of
35 in a safe mode container[^s53][^s64]. That program is where the region's large pictures are addressed
from[^s53].

### A mode's pages

Each `page[]` address is a record of two pointers, and on the Harmony One one byte in front of them,
measured on seventeen containers across four architectures[^s66b]:

```
arch 8, 9, 14   u24 list; u24 program                 6 bytes
arch 12         u8 lead; u24 list; u24 program        7 bytes
```

`list` is a tagged list and `program` is a screen program. The firmware searches the page's list for a
tag first and the mode record's own list second, and both offsets are read off the code: one routine
runs the list at `page + 0` and then the one at `entry + 1`[^s69]. The lead byte is the zero based
index into base slot 17's hit map, stating which page of touch rectangles a touch on this mode page
consults, [below](#which-hit-page-a-mode-page-uses)[^s125].

Two tags are searched in a page's list either side of the code that moves a wrapping page cursor,
`0x29` and `0x2A`[^s69]; what they name is not read, below.

**Every page's list also has a second copy**, which nothing reads, [below](#the-pool-of-lists-and-the-copies).

The closures: 2906 of 2906 page pointers resolve; the page abutting an entry sits exactly six bytes
before it on arch 8, 9 and 14 and exactly seven on arch 12, in 2396 of 2396 entries, which is where the
length comes from since nothing states it; every `list` decodes as a tagged list and lands in the run
above base slot 7's table, which it fills to within 4 to 34 bytes; every `program` decodes as a screen
program[^s66b].

**Prefer `program` over the root computed from the record.** On arch 8, 9 and 14 the first page's
program is usually the same address; on arch 12 it never is, because the stated program begins with a
call (opcode 22) to the fragment sitting where the computation lands[^s66b][^s64].

Read with `gspm.mode_records`, `gspm.mode_pages` and `gspm.mode_program_roots`; `gspm.mode_table`
returns the raw pointers.

## Tagged lists

Base slots 6 and 9 both point at lists in this encoding, and one firmware routine reads both. Which of
the two forms applies is decided by the first byte, as the firmware decides it[^s39]:

```
+0x00  u8   count                                     when nonzero
+0x01  { u8 tag; u16 operand; u8 opcode }[count]
```

```
+0x00  u8   0
+0x01  u8   count
+0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
```

The firmware stops at the **first** entry whose tag matches and runs nothing else, so a duplicate tag is
unreachable through anything but its first copy[^s39]. Bit 0 of `flags` in the second form is tested
after the match; what it selects is not read, below.

A tag is a **key event code** where its top two bits are nonzero, by the split under
[Key codes](#key-codes-and-scan-codes): `0x81` is a press of scan code 1. A tag whose event type is 0 is a
handler or one of a handful of codes that are not key events[^s17].

Read with `gspm.tagged_list`.

## Base slot 9: the key map table

```
+0x00  u8   count
+0x01  u24  address[count]
```

Six to seventeen entries, each pointing at a tagged list, measured on 15<!--fact:user_configs--> user
configurations across four architectures. **The largest index any configuration uses is exactly the
count minus one, in all fifteen**, over counts from 6 to 17[^s39].

**The pointer is the list**, unlike base slot 6's, which lands inside a record. Read a slot 9 target as
slot 6's shape, a `u8` and a `u24` back pointer, and not one of the 54 sets in the corpus gives an
address below itself where all 1616 of slot 6's do. So the extent is the list's own declared
length[^s67].

The index is carried by opcode `0x1F` with the operand's high byte `0xFF` and the index in the low byte.
When it changes, the firmware runs the outgoing entry's list with **tag 2** and the incoming one's with
**tag 1**, the same leave and enter arrangement base slot 6 has with tags 7 and 6[^s39]. Those two
handlers are the pop and the push of [the lookup stack](#how-a-key-press-is-resolved)[^s176]. An entry's
other tags are key event codes, so an entry is a set of key bindings with a lifecycle.

Of two configurations of one Harmony 700, compiled before and after one standard button was assigned
in one activity, this section differs in exactly one place: one added press binding in one
entry[^s39].

### What an entry is: a fixed prefix, one per activity, and one more

**An entry is one of three things, and a device is never one of them.** Split the table by which entries
the configuration's own `0x1F` ever selects[^s272]:

| population | what it is | how many |
|---|---|---|
| never selected | a contiguous prefix, per model | 7 on arch 8 and 12, 5 on arch 14, 4 on arch 9 |
| an activity's key map | one per activity, what `activities` reports as its `set` | one per activity |
| the one left over | selected, and carries a tag 1 enter handler and no leave handler | exactly one |

15 of 15 user configurations on all four architectures, and the prefix length moves with neither the
device count nor the activity count[^s272][^s273]. On the Harmony 600, 650 and 700 the left over entry is
the **idle** entry, the one the `0xFE` indirection names when no activity runs, and its Help bindings
are the idle ones above[^s333]. On a Harmony One's factory configuration it is installed from the boot
chain and binds the Devices key, which is consistent with its being the idle map there too[^s272]; its bindings send infrared codes in 6 of the 15 and not in the other 9[^s272].

How an activity is numbered and where its entry goes is
[Activities and devices](activities-and-devices.md#1-a-value-of-the-activity-counter). Read with
`handlerSetRoles` in `packages/codec/src/inventory.ts`.

**The Harmony 300 and 350 fill the table differently**, read in their firmware and measured on their five
configurations, outside the fifteen above: entry 0 is the key table, entries 1 to N are the devices' maps,
one per device, and the activity has no entry, its key selecting a device's map instead,
[their memory page](../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for)[^t-harmony-350-slots][^t-harmony-350-slots-c].

### A set is one activity's keypad map

Over the fifteen user configurations: 158 sets, 65 installed by something in the configuration, 50 of
those by an activity, and **exactly those 50 send an infrared code**[^s151]. No set an activity does not
install sends one, so base slot 9 holds no spares. The other 108 send nothing, and 38 of them bind fifty
or more keys to lists of comparisons, register work and mode entries, which is a menu[^s151].

**Device mode's map is not here**: a device's own map is its mode record's own list,
[above](#a-devices-mode-is-device-modes-keypad-map)[^s271]. The Harmony 300 and 350, with no mode table,
are the exception, above[^t-harmony-350-slots].

For every pair of a device and a scan code, the command that pair sends is the **same in every activity
map that binds it**, 1096 of 1105, and 47 of 50 devices agree on every one of their buttons[^s151]. The
nine exceptions are per activity overrides, an amplifier's input selection being the clearest. 970 of the
1096 are bound in every activity that drives that device and 126 in only some, which is authoring rather
than structure[^s151].

**Another device often holds the button in some of a device's activities.** Asked the other way round, over
the same 1105 pairs: in every activity that drives the device the button is that device's on 938, another
device holds it in at least one such activity on 131, nothing holds it in at least one on 117, and both on
81. It is concentrated: the Harmony One's receiver in one configuration has 35 buttons, eight activities
drive it, and 3 of the 35 are its own in all eight[^s151]. So a change written into every activity that
drives a device would take most of that receiver's buttons off another device, which is the writer's rule
[below](#for-a-writer).

**Reconstructing a device's map from that agreement is not sound and is not needed**, since a device's
own map is stated. Scored against it: of 1123 pairs of a device and a key that some activity binds, the
device's own map holds the same command on 896 and a different one on 136 where every activity agrees,
and it binds a further 568 keys no activity binds at all[^s271]. So the reconstruction is wrong on 13% of
what it can see and blind to a third again as much.

### The pool of lists, and the copies

The sets sit in a pool of tagged lists packed end to end, which also holds one list per mode page. The
pool is bounded at both ends without searching: it begins on the byte after a mode entry's page array
and ends at the lowest address above that which another reader already names, and a run must hold at
least one set on a list boundary. 29 runs in seventeen containers, tiling exactly[^s67].

The lists that are not sets are **a second copy of every mode page's own list**, in mode table order: the
k-th copy belongs to the k-th page, 2906 of 2906 in all seventeen containers with nothing left over on
either side[^s69]. Every empty copy is in the wide form and every wide form one is empty[^s68].

The copy is identical in **meaning** and not in bytes. Form, entry count, tag, flags, opcode and operand
all agree per entry, with one exception: opcode `0x7F`'s operand is an index into base slot 10, and the
two copies name different table entries whose **action lists decode identically**, 5861 of 5861
pairs[^s69]. A byte comparison of the two runs therefore reports a difference that is not one.

**Nothing reads a copy.** The tagged list runner has five references on each of the two architectures
read for it, the Harmony 700 and the Harmony One, and every one takes its pointer from a page record or
from a mode entry[^s69]. Reading every byte position in a container as a `u24` finds 27 that name a copy
across seventeen containers, against 148.8 that chance predicts[^s69b]. Their position is implied by
everything packed before them, as a picture's is. Why the compiler emits them is not known, below.

## Base slot 8: the screen keys' bindings

```
+0x00  u8 count; { u16 operand; u8 opcode }[count]      one ordinary action list
       then repeated to the end of the section:
         u8 count; { u8 tag; u16 operand; u8 opcode }[count]
         0x00 bytes between records are skipped
```

An entry is an action list instruction with a tag byte in front. The walk consumes the section exactly,
on seven configurations across architectures 8, 9, 12 and 14, and a walk that starts one byte out
desynchronises immediately, which is what makes consuming it the validation[^s27].

**The repeated records are the mode page lists**[^s83]. Every mode page's list is inside this section in
all nineteen containers, and the leading action list plus those lists tile the section exactly, so the
walk above and the tagged list reading of base slot 6 are two names for one structure: a record is a
narrow tagged list, and the `0x00` it skips is the wide form's lead byte. The leading list is the
section's own and is `1 + 3 * count` bytes, 4 on arch 8 and arch 12 and 34 on arch 9 and arch 14[^s83].
On the Harmony 600, 650 and 700 it is the eleven start up entry points the firmware queues by index,
[the firmware's own wiring](../architectures/harmony-600-650-700/compiler.md#the-firmwares-own-wiring-on-arch-14)[^s347].
Slot 8's `0x7F` instructions also call **every** action list in the final packed run, exactly once each,
which is the only thing that reaches those lists, [Actions](actions.md#0x7f-calls-a-list-by-its-index)[^s83].

**A tag is a key press.** Under the event and scan split, every tag in every sample is a press, `0x80`,
and the scan codes are model specific: 2, 8, 9 and 34 on the Harmony 600, 650 and 700; 43, 44 and 48 to
53 on the Harmony One; 30, 31, 38 and 39 on the Harmony 525; 5 to 8, 44 to 46 and 48 on the Harmony 880
and 885[^s27][^s128].

**Those are the keys the screen labels, and the two populations are disjoint**[^s128]. A scan bound here
is a key the screen speaks for; a scan bound by a base slot 9 set is a key on the keypad, and across the
corpus the two share no code at all on architectures 9, 12 and 14 and exactly one on architecture 8. One
Harmony 525 configuration binds a fifth screen key, scan 22, on a page that labels nothing[^s128].

**A screen key's label is the text drawn in its place**, and the place comes from two sources[^s128]. On
the Harmony One base slot 17 states it: the key's rectangle, with the label attributed to the
**nearest** region rather than the first one containing its start point, and several strings in one
region joined in reading order. Elsewhere the keys sit in two columns beside the screen at rows measured
per model, from where activities whose names are derived without geometry are drawn; each model's keys
page states its rows. A row's band is about a line and a half deep, since an item may wrap; a
continuation line is at most 16 pixels below the line it continues, which keeps a menu footer out of a
label. A row holds one item across, belonging to both its keys, or one per column, split at the widest
gap between adjacent x positions when that gap is at least 24 pixels. 2001 labels come from the hit map
and 4914 from the rows, 98.9% of every screen key binding in the corpus, and they agree with the
activity chain on 62 of the 63 keys where both have an opinion[^s128].

**Two configurations of one Harmony 700 close it.** The description of the one change between them
includes two new additional buttons; slot 8 grew by 8 bytes, an entry is 4, the record count is
unchanged, and exactly one record went from two entries to four[^s27].

**The key table is not the button to action map.** It is byte identical across that pair while the
change reassigned buttons[^s27]. Slot 8 is where a screen key's press meets an action list.

## Base slot 17: the touch screen hit map

**On the Harmony One this is where a touch lands**: a list of rectangles per page, each reporting a scan
code, read on the Harmony One 3.4 image and two configurations[^s45][^s45b]. It is empty, with a count of
zero, in every other container in the corpus, since the One is the only remote here with a touch panel.
Where it is empty the section is **two** zero bytes rather than one, because the pointer lands two bytes
in front of the picture bank that follows it, which is the same bias the bank walk starts from; both
bytes are zero in all thirteen containers that do this[^s84].

```
+0x00  u8   pages
+0x01  u24  page[pages]
```

each page

```
+0x00  u8   areas
+0x01  u24  area[areas]
```

each area, twelve bytes

```
+0x00  u16  x
+0x02  u16  width
+0x04  u16  y
+0x06  u16  height
+0x08  u8   the key code a hit reports
+0x09  u24  the record's own address
```

The firmware walks a page in order and **returns the first rectangle containing the point**, with the
test half open on both axes, `x <= X < x + width`[^s45]. Rectangles on a page do overlap, 104 pairs
across the corpus, so a page's order is meaningful[^s45b]. The panel reports thirteen bit coordinates
and the largest rectangle reaches 4437[^s45b].

A page's areas are laid out contiguously immediately before the page's own header, and each area's last
three bytes are its own address; both hold for every page and every area in both configurations[^s45b].

### What a code says

The code at `+0x08` takes ten values, 43, 44, 46, 47 and 48 to 53, which sit inside the block of scan
codes the One's key table carries where the Harmony 600, 650 and 700 number 41 to 54. A page's codes run
48 upward consecutively, then 43 and 44 for the two largest pages, and always end with 46 and 47, which
are a tall strip at each edge of the panel. Nine page shapes exist and no others[^s45b].

**A code is a position, not a name**: the first area a page stores is scan 48, the second 49 and so on,
with 46 and 47 carried by the two edges wherever they sit[^s275]. So which scan is which row differs
from page to page, and it does: on one configuration's activity menu the three rows are scans 50, 51 and
52 on the first page and 48, 49 and 50 on the second[^s275].

**A short device list page is the full page's rectangles**: for `r` rows it carries the full page's
first `r` row rectangles under scans 48 upward, the full page's bottom key rectangle under scan
`48 + r`, then the two edges. Stated by the one row and two row pages beside a full page on two
configurations[^s241]; `composeMenuPage` derives a hit page the configuration lacks this way.

### The keys beside and below the screen

**The two rectangles at the panel's edges are the page turn keys, and no page binds them**[^s275]. All
778 mode pages of four Harmony One containers offer both, and 0 of them carry a binding on scan 46 or
47. Those two rectangles sit outside the drawn area, which is the geometry saying the keys are beside
the screen rather than on it.

**They are bound in two other places**, and `keyCodes` is the wrong reader to ask about either, since it
reports only bindings that end in an infrared code and answers 0 for these scans[^s275]:

* **Base slot 9 entries 1, 2, 3 and 4**, a press of each scan in each, so 8 bindings per container on
  all four. Those are the fixed prefix nothing selects. Entry 1 is the only one giving the two scans
  different lists, a beep then opcode `0x0f` with `0xFFA0` against `0xFFA1`, not decoded[^s275].
* **A mode record's own tagged list, exactly when the mode has one page.** Both keys on 538 of 538
  single page modes and neither on 0 of 58 multi page ones, 1076 bindings, every one a press, and 966 of
  them the **null instruction** of opcode 0 with operand 0[^s275][^s293].

So paging is a default the firmware supplies, and a screen with nowhere to page turns it **off**. All 12
one page list menus in the corpus carry those bindings[^s275].

**A mode of several pages states its page count in two more places**, on the Harmony One, over six
containers[^s293]:

```
header (the program every page calls first, one per mode, 656 of 656 distinct)
  op 4 or 5 at (0x17, 0x12)   the total, equal to the page count, 58 of 58; absent on a one page mode
  op 4 or 5 at (0x23, 0x12)   the word, "pages" on all six
  op 0x17; op 0               a one page mode's header ends here, 598 of 598
each page, in its own program or where its switch arms rejoin, after a second switch on 7 of 73
  op 4 or 5 at (18 - w, 18)   its number, right aligned: w is the text's width in its font, so a "4"
                              starts at 12 and a "10" at 8; every page of all 58
  op 4 or 5 at (18, 18)       "/"
```

A one page mode draws neither the total nor a number. **531 of the 598 bind both page turn keys to the
null instruction**, 1086 of 1196 bindings; the other 67 name a list on one key or both, 15 of them only
lists of three null instructions[^s293]. The total, the numbers and the bindings are independent of
each other.

**The two keys below the display are rectangles too**, and which of them a page enables is the
difference between the two list menus[^s275]: a device list page has a rectangle for the left key only,
on 29 of 29 pages, bound to opcode `0x72`; an activity menu page has both, on 6 of 6, bound to mode
entries. **A key with no rectangle is not enabled**, which is what the right one is in device mode. The
left one is labelled "Activities" there and "Options" in an activity, with "Devices" on the right, and its
`0x72` maps a state variable's value rather than turning a page, variable 35 in one user configuration
and 40 in the factory one, so where it goes depends on what is running[^s275].

**The geometry is not user data.** Two Harmony Ones with entirely different configurations carry the
same 35 rectangle sizes and share 70 of 70 distinct records; only the number of pages differs[^s125].
The rectangles' places on the panel, the grid they form and the transform from panel units to pixels are
[the Harmony One's display page](../remotes/harmony-one/display.md#where-a-touch-lands-the-hit-map).

### Which hit page a mode page uses

**It is stated by the mode page**, in the Harmony One's `lead` byte in front of a mode page record's two
pointers, a zero based index into `page[]` above[^s125]. Over two configurations, 330 and 152 mode pages
and 42 and 32 hit map pages: every value in range with no gaps, every hit page named by at least one
mode page, and **no mode page binds a key code its indexed hit page does not offer**, on 268 and 104
pages. Shifting the index breaks 54 to 227 of them[^s125].

How Logitech's compiler numbers and places the hit pages, and the rules that build one from what a page
draws, are [the Harmony One's compiler page](../architectures/harmony-one/compiler.md#the-hit-pages-the-fixed-screens-name).

Read with `gspm.touch_pages` and `gspm.Container.touch_hit`, or in TypeScript with `touchPages`,
`touchPageOf` and `touchOwner`.

## Key codes and scan codes

A key event code is not a matrix address. **The top two bits are the event type and the rest is the
keypad scanner's own scan code**, `EVENT_MASK` `0xC0` and `SCAN_MASK` `0x3F`[^s17]:

| Bits 7,6 | Event |
|---|---|
| `00` | none, the handful of codes that are not keypad events at all |
| `01` | release |
| `10` | press |
| `11` | repeat |

Three agreements settle the split, among them that it makes the Harmony 700's table 54 scan codes times
three events, which a keypad can be[^s17]. **On the 1.4 image the Harmony 300 and 350 run, the `11` event does not repeat**:
it fires once, when a key has been held for a time the configuration sets, and a press then ends in it or
in the release and never both, [their firmware](../architectures/harmony-300-350/firmware.md#a-held-key)[^t-long-press].

**A scan code's arithmetic is per architecture**, because the scanner that produces it is not one
routine across the family, so the same number means a different place on each:

| architecture | scan code | where it is stated |
|---|---|---|
| Harmony 880 and 885 | `(line - 1) * 4 + input`, 1 to 64, on a 4 by 16 lattice; nothing binds 64 | [the platform](../architectures/harmony-880-885/README.md)[^s144] |
| Harmony 525 | `group * 8 + column`, 1 to 64, on an 8 by 8 matrix; nothing binds a multiple of 8 | [the platform](../architectures/harmony-5xx/README.md)[^s89] |
| Harmony 600, 650 and 700 | `(row - 1) * 4 + column`, 14 rows of 4, 1 to 56, 54 bound | [the Harmony 600's keys](../remotes/harmony-600/keys.md#where-the-scan-codes-come-from)[^s17][^s48] |
| Harmony One | not established, 1 to 55 bound; sixteen buttons share one sense line, so no census yields a code | [the Harmony One's keys](../remotes/harmony-one/keys.md#where-the-scan-codes-come-from)[^s48] |

The first two and the third are read in the firmware[^s144][^s89][^s17], and the third is also measured
on a unit by pressing every key, which yields the column, `(code - 1) mod 4`[^s48].

The **position** of a key is a separate question and is not established by any encoding: an encoding says
which cell a code is, not which printed button sits in that cell. It does not follow from the codes
either, since no divisor puts a Harmony 600's digit row on one line[^s133]. Each model's keys page names
its keys and says where each name came from.

## For a writer

* **A duplicate tag is dead data.** The firmware stops at the first matching entry, so a writer that emits
  two entries with one tag has emitted an unreachable one, silently[^s39].
* **Every mode page's list has a second copy, and an editor changes both.** Nothing reads the copy, so an
  emitter that omits it still passes every check the remote makes, and its position is implied by what
  is packed before it rather than stated[^s69]. Because the copy sits 72 to 214 KiB away from the page's
  own list, an edit to a page's bindings touches two 64 KiB erase blocks, 187 of 187 editable pages across
  five configurations on two architectures[^s187].
* **A one page screen deadens the two page turn keys, and growing it to two pages must undo that**, on
  the Harmony One. Leave the two null bindings and the file closes every count, passes both checksums,
  renders every page identically, and the second page cannot be reached[^s275]. The header's total and
  each page's number have to be restated too, or the old total stays drawn[^s293]. Cutting only the null
  instruction is conservative, since 15 of the 67 other one page modes bind lists of null instructions
  there[^s293].
* **A row is recognised by geometry, never by its code**, and an area appended anywhere but after the last
  content area renumbers every area after it, which silently moves a binding the page already
  had[^s275].
* **A Harmony 600, 650 or 700 device mode binds every key**, each to the device's command or to nothing,
  and a composed one must too: a key a mode leaves out is resolved further down the stack, against a map
  the device does not own[^s285]. What a left out key then does on these remotes has not been measured.
* **A device's button is stated in its own map and again in every activity map that binds it**, so a
  change to it has to be written into each of them, or it is invisible in the activity a person is
  sitting in[^s151][^s271]. An activity where another device holds that button is left as it is, and named
  before the change is made, rather than refused as a whole or overwritten[^s151].
* **An entry with no scan 3 binding has no Help**, on the Harmony 600, 650 and 700, on its own screens and
  in device mode entered from it[^s333].

## Not checked

* What `kind`'s bit 0 in a mode entry selects[^unchecked].
* What bit 0 of `flags` in a wide tagged list entry selects[^unchecked].
* What tags `0x29` and `0x2A` in a page's list name[^unchecked].
* Why Logitech's compiler emits the copies of the page lists; no configuration can answer it[^unchecked].
* Whether the left over base slot 9 entry is the idle map on the Harmony One, 880 and 885 and 525, as the
  Harmony 600, 650 and 700 firmware shows it to be there, and why its bindings send codes in only some
  configurations[^unchecked].
* Whether entries 2 and 3's press bindings on the Harmony 600, 650 and 700 consume a press[^unchecked].
* The order of the key lookup on the Harmony One, 880 and 885 and 525, which is read in the firmware on
  the Harmony 600, 650 and 700 only[^unchecked].
* The device mode closure on the Harmony 600, 650 and 700 for the Harmony 700's A/V switch:
  `deviceModeMaps` considers only modes with a keypad binding and counts a mode's enter handler, tag 6,
  as one, so for a mode that binds no key it picks a help screen. Until the reader is fixed the closure
  stands at 21 of 23[^unchecked].
* What base slot 9 entry 1's `0x0f` instructions on the page turn keys do[^unchecked].
* The Harmony One's scan code arithmetic, and the position of a key on any model from its code
  alone[^unchecked].

[^s39]: Measured in configurations. [Section 39](../../docs/findings.md#s39)
[^s333]: Read in the firmware. [Section 333](../../docs/findings.md#s333)
[^s176]: Measured in configurations. [Section 176](../../docs/findings.md#s176)
[^s37]: Measured in configurations. [Section 37](../../docs/findings.md#s37)
[^s263]: Measured in configurations. [Section 263](../../docs/findings.md#s263)
[^s52]: Measured in configurations. [Section 52](../../docs/findings.md#s52)
[^s141]: Measured in configurations. [Section 141](../../docs/findings.md#s141)
[^s66b]: Measured in configurations. [Section 66](../../docs/findings.md#s66)
[^s66]: Read in the firmware. [Section 66](../../docs/findings.md#s66)
[^s271]: Measured in configurations. [Section 271](../../docs/findings.md#s271)
[^s285]: Measured in configurations. [Section 285](../../docs/findings.md#s285)
[^s84]: Measured in configurations. [Section 84](../../docs/findings.md#s84)
[^s311]: Read in the firmware. [Section 311](../../docs/findings.md#s311)
[^s311b]: Measured in configurations. [Section 311](../../docs/findings.md#s311)
[^s357]: Measured in configurations. [Section 357](../../docs/findings.md#s357)
[^s17]: Measured in configurations. [Section 17](../../docs/findings.md#s17)
[^s53]: Measured in configurations. [Section 53](../../docs/findings.md#s53)
[^s64]: Measured in configurations. [Section 64](../../docs/findings.md#s64)
[^s69]: Read in the firmware. [Section 69](../../docs/findings.md#s69)
[^s125]: Measured in configurations. [Section 125](../../docs/findings.md#s125)
[^s67]: Measured in configurations. [Section 67](../../docs/findings.md#s67)
[^s272]: Measured in configurations. [Section 272](../../docs/findings.md#s272)
[^s273]: Measured in configurations. [Section 273](../../docs/findings.md#s273)
[^s151]: Measured in configurations. [Section 151](../../docs/findings.md#s151)
[^s68]: Measured in configurations. [Section 68](../../docs/findings.md#s68)
[^s69b]: Measured in configurations. [Section 69](../../docs/findings.md#s69)
[^s27]: Measured in configurations. [Section 27](../../docs/findings.md#s27)
[^s83]: Measured in configurations. [Section 83](../../docs/findings.md#s83)
[^s347]: Measured in configurations. [Section 347](../../docs/findings.md#s347)
[^s128]: Measured in configurations. [Section 128](../../docs/findings.md#s128)
[^s45]: Read in the firmware. [Section 45](../../docs/findings.md#s45)
[^s45b]: Measured in configurations. [Section 45](../../docs/findings.md#s45)
[^s275]: Measured in configurations. [Section 275](../../docs/findings.md#s275)
[^s241]: Measured in configurations. [Section 241](../../docs/findings.md#s241)
[^s293]: Measured in configurations. [Section 293](../../docs/findings.md#s293)
[^s144]: Read in the firmware. [Section 144](../../docs/findings.md#s144)
[^s89]: Read in the firmware. [Section 89](../../docs/findings.md#s89)
[^s48]: Measured on a unit. [Section 48](../../docs/findings.md#s48)
[^s133]: Measured in configurations. [Section 133](../../docs/findings.md#s133)
[^s187]: Measured in configurations. [Section 187](../../docs/findings.md#s187)
[^unchecked]: Not checked.
[^t-harmony-350-slots]: Read in the firmware. [The test](../../tests/test_harmony_350_slots.py)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../tests/test_harmony_350_slots.py)
[^t-long-press]: Read in the firmware. [The test](../../tests/test_harmony_350_long_press.py)
