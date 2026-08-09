# Logitech's own host software as a source

Logitech's classic desktop application, the one the Harmony One shipped with, survives and is
not obfuscated, so it can be read as ordinary source with real class and field names. It is the
software that actually drove these remotes for a decade. Where this project has to infer, that
code can be read.

It is also unlicensed proprietary code, so how it may be used needs stating rather than
assuming. This document is the rule and the ledger: what the rule is, why it is what it is, and
every fact currently believed on the client's word alone.

## Why the rule changed

This project derives the USB protocol clean room from the firmware, deliberately, and that
decision stands as the **default**. It is not being abandoned. Firmware evidence is better
evidence: it says what the remote does, where the client only says what one host believed.
Section 20's off by one lived in two independent parsers for months because both had copied the
same wrong convention from each other.

What changed on 9 August 2026 is the handling of the case where the firmware **cannot** settle
something. The old rule said the client is never a source of record, full stop. Applied
honestly that rule discards facts nobody can recover any other way, and the cost of discarding
them is not abstract: it is remotes that stay unrepairable and get thrown away. That was
weighed against the value of an unqualified clean room claim, and the remotes won.

**The interoperability case is the substantive one, not the licence.** The right to decompile a
program in order to make an independent program work with it is written into European law, in
the Software Directive and in article 45m of the Dutch Auteurswet, and it does not depend on
what licence this repository carries. It permits obtaining the information. It does not permit
republishing the decompiled code, and it does not cover copying expression. So the rule below
is shaped by what that permission actually covers, which is narrower than "we may use it" and
wider than "we may not look".

Changing this repository's licence would not help here and is not the lever it looks like.
Copying from unlicensed proprietary code is an infringement whatever licence the result carries;
MIT is not the obstacle. See `docs/roadmap.md` decision 1 for what the licence question is
actually about, which is libconcord and harmony-decompiler.

## The rule

1. **Firmware first, always.** The client says where to look. If the firmware can answer, the
   firmware answers and the write-up cites the firmware address.
2. **A client-sourced fact is marked as one**, here and wherever it is used, in those words. It
   does not enter `docs/config-format.md` as confirmed and it does not get a regression test
   that asserts it as true. A test may assert that our corpus is consistent with it, which is a
   different claim.
3. **Expression does not travel.** No identifier, no comment, no code, no structure. An address
   is a fact about the hardware; the name Logitech gave it is their writing. Everything below is
   restated in this project's own words for that reason, and the verbatim extraction stays in
   the private lab.
4. **The decompiled source is never published or quoted**, in this repository or anywhere else.
   That is the same rule the lab has always had, and it is also the condition the
   interoperability exception comes with.
5. **A confirmed lead moves out of this document** into the normal places, with the firmware as
   its citation and a line saying the lead came from here. The ledger below should shrink.

## Why the client is not an authority, demonstrated

Its own container constants for arch 8 do not describe any arch 8 config in this corpus. It
declares 20 pointer slots and a trailer at offset 91. Four real arch 8 configs put the marker at
95, which is `0x0B + 4 * 21`, so they carry 21 slots.

This is not a misreading of its convention, because the same convention reproduces arch 9 and
arch 12 exactly. It is the client being wrong, or describing a variant nobody here has, and
either way it is the reason rule 1 exists.

## What it confirms that we already derived

None of this is new knowledge and none of it changes a document. It is recorded because a
confirmation from an independent implementation is worth having, and because it calibrates how
far the rest can be trusted.

| what this project derived | the client agrees |
|---|---|
| the pointer table starts at `0x0B`, an item is 4 bytes and an address 3, section 20 | its three constants are 11, 4 and 3 |
| the marker sits at `0x0B + 4 * N` | its trailer offsets are 91 on arch 9 and 99 on arch 12 |
| 22 pointer slots on arch 12, 20 on arch 9 and 14 | the same three numbers |
| the arch 12 user config is at `0x040000` | the same |
| the arch 12 log area writer refuses outside `[0x040000, 0x400000)`, section 47 | it declares the user config region as exactly that range |
| the arch 12 safe mode container is at flash `0x002000` | the same |
| the arch 14 user config is at `0x030000` | the same |
| the arch 14 safe mode image is at internal `0x1000`, not where the file named `-safe.bin` suggested | the same |
| internal memory is two 64 KiB pages, `0xFE` and `0xFF`, so 128 KiB is reachable | it declares one `0xFE0000` region of `0x20000` |
| base slot 3 is the clock, section 21 | its section index 3 is named for the clock |

## The ledger: believed on the client's word alone

Everything in this section is **unconfirmed**. It is a shopping list for firmware work, in
roughly the order it is worth doing.

### A config is invalidated before it is written

The write sequence is a `WRITE_MISC` with selector 2 and no arguments, then the flash write.
Selector 2 is already known to be serviced on arch 14, `docs/usb-protocol.md`, and has no
reading. Selector 11 does the same thing for the embedded config.

So the remote is not erased before a write, it is marked invalid, and a half written config is
never executed because the mark is still set. A separate constant set names six firmware update
states including one for invalid and one for interrupted, which suggests the mark is a state
value rather than a flag.

**This is the highest value item in the document.** It is the missing rail for any future write
path, and it is cheap to confirm: read what selector 2's body at the selector chain writes.

### There is no factory reset

Command `0xE0` carries four sub-command codes. The client sends three of them and all three
live in its diagnostics layer, not in anything a user reaches: one resets the USB interface, one
resets the remote, and one invalidates a test firmware image. A fourth method exists for
clearing test flags and its body is empty.

This project reads codes 1, 2, 3 and 5 as serviced by the arch 14 firmware,
`docs/findings.md` section 19, and the two lists agree on 1 and 2 and disagree on the rest. So
the correspondence between the code and what it does is open, and the honest statement is only
the negative one: **no path in the vendor's own software returns a remote to a factory state.**
The nearest thing is invalidate and overwrite.

### Arch 14 keeps per model settings in internal program memory

A run of twelve 64 byte records above the application firmware, at `0x01F400` and every `0x40`
after it, ending at `0x01F640`, followed by a 1024 byte block at `0x01F800`. What the client
believes each holds, restated:

| address | what it holds |
|---|---|
| `0x01F400` | the unit's serial identifier |
| `0x01F440` | key timing |
| `0x01F480` | infrared capture silence timing |
| `0x01F4C0` | unit settings |
| `0x01F500` | keypad settings |
| `0x01F540` | display settings |
| `0x01F580` | battery calibration |
| `0x01F5C0` | power settings |
| `0x01F600` | other settings |
| `0x01F640` | a manufacturing identifier |
| `0x01F800` | test flags, 1024 bytes |

The first address is also declared as the start of a 1024 byte system parameter block, so the
twelve records are probably subdivisions of one block rather than twelve unrelated ones.

**This is the answer to a question already asked here**: which settings a remote has that its
config does not carry, and therefore what FreeHarmony would need per model rather than per
architecture. It is also directly readable over USB, since it is inside the `0xFE` window that
`READ_FLASH` already reaches, so confirming it needs a remote rather than a disassembler.

Arch 12 has the same idea at different addresses: an identifier block at `0xFFF400` and a
manufacturing identifier at `0xFFF640`, both 64 bytes, with a 1024 byte granularity stated for
the first.

### Arch 12 has regions this project has never named

| address | size | what the client calls it, restated |
|---|---|---|
| `0xFE0000` | `0x1000` | the bootstrap, which matches what section 59 found there |
| `0xFE1000` | `0xF000` | the safe mode image |
| `0xFF0000` | `0x4000` | a programmable logic device image |
| `0xFFE000` | `0x1000` | a support library |
| `0x3D0000` | `0x20000` | the stored application firmware |

Two of these settle open questions if they hold. `docs/findings.md` calls the image at `0xFF`
plus `0xE000` "a library or support image, distinct from the bootstrap at zero", which is
exactly what the client calls it. And a programmable logic device on arch 12 is new information
about the hardware, not just the memory map: nothing in this project had suggested the One
carries one.

The last row is the awkward one. `0x3D0000` sits inside the `[0x040000, 0x400000)` region the
same class declares as user configuration, so the usable config region must stop below it. A
writer that trusted the declared range would run into the stored firmware.

### The arch 9 map disagrees with our measurements

The client places the safe mode image at `0x800000`, the application firmware at `0x810000` and
a 32 KiB embedded config at `0x820000`, and states no user configuration base at all.

This project measured a Harmony 525 answering at `0x800000`, `0x810000`, `0x820000` and
`0x870000`, section 76, read the user config at `0x820000` and found the safe mode container at
`0x818000`, inside what the client calls application firmware.

One of the two is wrong about arch 9. Ours is a live measurement of a real remote and the
client's is a constant, so the burden is on the client, but the disagreement is worth keeping
because arch 9 is the architecture this project understands least.

### Confirmed and moved out

**The platform codenames and the skin number table**, 9 August 2026. A resource file carries nine
USB vendor and product pairs against Logitech's internal platform names, and 46 skin numbers
against models. Five skins this project had already measured, from firmware literals and from live
remotes, all agree exactly, and the full table sharpened section 81's rule for the two containers
that carry a skin their remote does not have. It is in `reference/models.md` with its provenance,
and `tests/test_gspm.py` asserts the corpus against it rather than asserting the table.

That one had already been used as a lead in section 81, before this document existed, which is
part of why the rule needed writing down.

### Smaller leads

* The container header carries an event offset at `+0x14` and a base date offset at `+0x18` on
  every architecture from 8 upward. Base slot 3's timestamp is section 21; what an event offset
  in the header is has never been asked here.
* Base slot 2 is named for flash storage in every architecture class, which fits the log area
  reading in section 47 and suggests the name should be broader than "log area".
* Arch 14 declares a user logging region at `0x0E0000` of 128 KiB, which is where a log area
  pointer on arch 14 would have to point. Section 47 found the writer is arch 12 only, so this
  says the region exists on arch 14 even though nothing writes it.
* Arch 12 and arch 14 each declare an embedded configuration region, `0x1E000` and `0x4000`,
  distinct from the safe mode image and from the user config.
* Read selector 12 is `docs/usb-protocol.md`'s "not read yet" selector `0x0C`. The client uses
  it to ask what hardware features the remote has.

## Where the extraction lives

The verbatim extraction, with Logitech's identifiers, is `software/classic/PROTOCOL-CONSTANTS.md`
in the private lab. That directory is not published and does not become published by this
document existing.
