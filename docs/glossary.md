# Glossary

The vocabulary this project has grown, in one place, for anyone reading the other documents
without having watched them being written.

**Three kinds of term are mixed together here and the difference matters.** Some words are
**Logitech's own**, read out of their files or their software, and using them differently would
be an error. Some are **this project's names** for something nobody had named, and could have
been called anything. A few are **standard** terms from USB, from the PIC18 microcontroller or
from ordinary software practice, listed because they turn up without explanation. Each entry
says which it is.

Grouped by subject rather than alphabetically, because the terms only make sense in relation to
each other. `docs/findings.md` is the technical reference and `docs/config-format.md` the
specification; this file defines the words those use.

## The two kinds of file

**config** (Logitech's concept, our short name). The file that makes a remote do anything: which
equipment you own, what appears on the screen, which infrared pulses each button sends, what an
activity switches on. A remote with no config is inert. Logitech's service compiled one for you
and sent it to the remote. Generating these again is the whole point of the project.

**firmware** (standard). The program permanently inside the remote, which reads the config and
acts on it. It is not a config and is never modified here. It matters because **the firmware is
the authoritative specification for every config field**: what the firmware does with a byte is
by definition what that byte means. Reading it turns guessing into fact finding.

**image** (standard). One firmware file, as a flat block of bytes. "The 700 2.8 image" means the
firmware version 2.8 of a Harmony 700.

**EZHex, EZUp, `.hfw`** (Logitech's names). Wrappers. An EZHex file is an XML header followed by
the config itself; `.hfw` is a firmware update package. `tools/ezextract.py` opens them.

**dump** (standard). A copy of what is actually on a specific remote, read out over USB, as
opposed to a file that was sent to it. A dump is evidence about one physical unit.

## The corpus

**corpus** (our name). Every sample file the project holds: configs, firmware images and the
containers cut out of them. It lives in a private directory called the **lab**, never in this
repository, because the files are Logitech's material and a config records what equipment
somebody owns.

**lab** (our name). That private directory, alongside the repository. `HARMONY_LAB` points at
it, and the test suite skips cleanly when it is absent, so a fresh clone with no lab still
passes.

**sample** (standard). One file in the corpus. "Two samples" is the minimum evidence for a claim
here, and **two samples of one model are much weaker than two architectures**.

**contributor** (our name). Someone who shared a dump. Each contributed directory carries a
`META.md` recording who, when, with what permission, and **what is in the config**, which is the
part that is hardest to recover later and most valuable to have.

**counterexample supply** (our name). A sample kept specifically because it disagrees with the
rest. A claim that every file in the corpus confirms may just mean the corpus agrees with
itself, so a file that breaks a rule is worth more than one that keeps it.

## The remote's identity

**architecture**, often **arch** (Logitech's concept, their number). Which internal generation a
remote belongs to. A Harmony One is architecture 12, a 600 and a 700 are 14, a 525 is 9, an 880
and an 885 are 8, an 890 is 10. Different architectures store their config differently and run
different firmware, so **a rule proven on one architecture is not proven anywhere else**. Most
mistakes recorded in this project are a claim measured on one architecture and stated of all of
them.

**protocol** (Logitech's term). A number a config states about itself, and in every sample here
it equals the architecture. Treated as the same thing until something separates them.

**skin** (Logitech's term). A model number: an index into Logitech's own list of models. 15 is a
Harmony 880, 17 an 885, 19 an 890, 22 a 525, 54 a Harmony One, 66 a 700, 71 a 600, 72 a 650. It
matters because a 600 and a 700 report the **same** USB product id, so the skin is the only thing
that tells them apart before any config is read. Nothing to do with visual appearance despite the
name.

**board**, **flash id** (Logitech's terms). Hardware revision, and an identifier of the memory
chip fitted. Both appear in a config's header, and a writer must check them against the connected
remote before writing anything.

**`INTENDEDVERSION`** (Logitech's name). The block in a config's XML header stating which remote
the file was built for: protocol, skin, board and flash id. This is what a write must match.

## Inside a config: the container

**container** (our name). The config's own file format, underneath any wrapper. One format across
every architecture, which is why a discovery on one model transfers. Its parts:

**cookie** (our name). Four bytes at the start identifying the format family: `GSPM` on
architectures 12 and 14, `TPTP` on 8 and 10, `AHCM` on 9. A file's cookie says which family it
belongs to but **not** which architecture, because two architectures can share one.

**end marker** (our name). Four bytes at the very end, `PTYY`, `DKDK` or `MCHA` respectively. That
the header's stated end address lands exactly on it is one of the checks that makes a parse
trustworthy, and it became one only in section 117: while the base address was computed from the
marker's position, that check tested its own assumption and could not fail. One Harmony 890 config
fails it, and the failure is real.

**pointer table** (our name). A list near the start of the file saying where each part of the
config lives. Each entry is a spare byte plus a three byte address.

**section** (our name). One part of the config, pointed at by one entry in that table: the
infrared database, the screen programs, the timer table, and so on. Twenty of them.

**slot** (our name). The position of a section in the pointer table. **base slot** is the
canonical numbering used in all documents; **arch slot** is the raw position in a particular
architecture's table, which differs because some architectures insert extra entries. Always quote
base slots, and translate.

**trailer** and **trailer checksum** (our name). The last bytes, ending in a checksum over the
whole file. It is **weak**: it cannot see two swapped words, so a file passing it means the remote
will accept it, not that it is correct.

**blob** and **blob offset** (our name). The container itself, and where it starts inside the
file. Distinguished from a **file offset** because confusing the two shifts every address
silently instead of failing, which has cost time here more than once.

**flash base** (our name). The address in the remote's memory where the config will live, which is
what the pointers inside it are relative to. `0x040000` on a Harmony One, `0x030000` on a 600.

## Inside a config: the contents

**device** (Logitech's concept). One piece of equipment, a television or a receiver. In the file a
device turns out to be **one group in the infrared database**.

**activity** (Logitech's concept). One thing you want to do, "watch TV", which switches several
devices on and sets their inputs. Counted by a single variable inside the config.

**mode**, **mode page** (our names). A screen the remote can show, and one page of it.

**number sender** (our name). Base slot 16: one record per appliance that takes a channel number,
with a table per decimal digit. Populated only by made configs, sections 154 to 156.

**favourite channel** (Logitech's concept). A screen button that tunes a channel. Not a key binding:
it lands in four sections at once, and a channel with a leading zero is spelled out digit by digit
instead of going through the number sender. Sections 154 and 156.

**protocol family** (Logitech's concept, their names). The named rhythm a code's durations follow,
`NEC2`, `Sony 12 Bit` and so on. `packages/codec/src/protocols.ts` is the measured table of them,
and each entry states which route measured it. Sections 157 to 169.

**lead in** (our name). The silence Logitech's generator opens every once block with, 50 ms on most
commands and longer on ones that get a settling time. A generator convention, not a format
constraint. Section 174.

**biphase** (standard). An encoding where every bit is one cell and the bit is which half of the
cell carries. It has one duration, so the mark and space reader has nothing to split; a separate
reader handles it. Sections 162 to 164.

**action list** (our name). A little program the remote runs when you press a button: three byte
instructions in a queue. One of two interpreters inside the remote, and fully read.

**screen program** (our name). A second little language, one byte per instruction, that draws the
screen. Also fully read. Its text instruction is how an activity's name reaches the display.

**state variable** (Logitech's concept, they name them). A value the remote remembers, like which
input a television is on. Their **names** are spelled out in the config in plain text, which is
how we know what the rest of the file is for.

**glyph** and **font set** (standard terms, our use). One character's pixels, and a table of them
at one size. **A glyph code is not a character**: it is an index into the config's own font table,
assigned per config, so the same code means different letters in two files. Text is recovered by
recognising the pixels, not by looking the code up.

**picture bank** (our name). Most of a config by volume: a plain run of images with no table and no
count, addressed only by the screen programs that draw them.

**tagged list** (our name). A recurring small structure whose header states its own shape. The
lesson attached to it: **read a structure's form from the byte that states it, never from its
contents**, because an empty one has no contents to read.

## Safe mode and recovery

**safe mode** (Logitech's concept). A minimal fallback the remote falls back to when a normal
update fails. It has its own firmware and its **own config**, shipped inside the firmware rather
than sent by the service.

**bootloader** (standard). The small program that runs first at power on and can load the rest. On
architecture 8 it sits below the region we have, which is why the current firmware images are
missing their own starting point.

**reset vector** (standard, PIC18). The fixed address a microcontroller begins executing at.

**watchdog** (standard). A timer that reboots the chip if the program stops feeding it. Relevant
because one firmware loop feeds it while stuck, so a bug that should have ended in a reboot
instead hangs.

## USB and the wire

**HID** (standard). The USB device class the remotes use, the same one keyboards use, with fixed
size messages called **reports**. 64 bytes each way here.

**descriptor** (standard). A small block a USB device hands the computer at plug in, stating who it
is and what its channels are. Present inside the firmware image, so it can be read without any
hardware.

**vendor id** and **product id** (standard). Who made the device and which model. Logitech is
`0x046D`. Not enough on its own: a 600 and a 700 share `0xC122`.

**`bcdDevice`** (standard USB field name). A device revision number, and on these remotes the
place the **skin** is carried. The name contains the trap: see BCD below.

**BCD** (standard). Binary coded decimal, an old way of storing numbers where each decimal digit
gets four bits, so seventeen is stored as `0x17` rather than as the value 17. Architectures 12, 14,
16 and 17 honour that convention in `bcdDevice` and architectures 8 and 9 do not, so **the same byte
has to be read two different ways depending on the remote**, and reading it wrongly names a
different real model instead of failing. A skin of 100 or more does not fit in the byte at all and
is refused, section 195.

**`GET_VERSION`, `READ_FLASH`, `READ_MISC`, `WRITE_FLASH`, `ERASE_FLASH`** (Logitech's commands,
names from concordance). The commands a host sends. Only the reading ones are used here.

**enumeration** (standard). The computer asking what is plugged in. Distinguished sharply from
**opening** a device: enumeration touches nothing, opening claims an irreplaceable remote, and
anything that only needs to know whether a remote is attached must do the first.

## Reading the firmware

**PIC18** (standard). The microcontroller family inside these remotes.

**disassembly** (standard). Turning the firmware's bytes back into instructions. It only works if
you know the **load address**, the memory address the file was built to run at; a wrong one
produces a listing that reads perfectly and means something else entirely.

**entry point** (standard). Where the firmware starts.

**SFR**, special function register (standard, PIC18). A memory address that is really a hardware
control, for a timer or the infrared transmitter. **The map of which address is which differs per
chip**, and using the wrong map produces a readable, wrong listing.

**`RETLW` table** (standard PIC18 instruction, our name for the pattern). A run of instructions
each returning one constant, which is how the firmware stores its own version, skin and
architecture. Readable without running anything.

**`XORLW` chain** (standard instruction, our name for the pattern). How the compiler writes a
switch statement. Its literals are **not** the case values: each is the difference to the next, so
they must be decoded cumulatively. Reading them literally produced a duplicate case, which was the
only warning.

**trace** (our name for the technique). Finding every place the firmware touches a given memory
address, which is how a config section gets identified: whoever reads the variable a section was
loaded into tells you what the section is for.

## Tooling and process

**concordance** (someone else's program). The existing open source tool for talking to these
remotes. Used here as a cross-check and as a source of protocol facts, never copied, because its
licence is incompatible with this repository's. It has two known defects on our architectures,
recorded in `reference/concordance-notes.md`.

**Ghidra** (standard tool). A disassembler and decompiler. Its project files embed a copy of the
firmware, so they never go in this repository.

**byte accounting**, printed by `make coverage` (our name). What share of a config the reader can
attribute to a known structure. 100% means nothing is unexplained; **overlaps mean two readers
claim the same byte**, which is a defect rather than something to interpret.

**gap** and **gap family** (our names). A run of bytes nothing claims, and a set of gaps with the
same length. Families are what to look at: five gaps of the same size usually mean one
misunderstood structure rather than five mysteries.

**emitter** and **round trip** (standard terms, our use). Code that writes a config back out from
what the reader understood, and the test that the bytes come back identical. It deliberately builds
into an empty buffer rather than editing a copy, because **an emitter that starts from a copy passes
a round trip test while writing nothing at all**.

**golden vector** (standard practice, our use). A stored expected result, used here to check that
the Python and TypeScript readers agree field for field. Two implementations that quietly diverge
are the failure it exists to prevent.

**regression test** (standard). A test whose job is to fail when a conclusion stops being true.
Every confirmed fact in this project has one, because the analysis is AI produced and published as
such, so a claim that is not executable is only an assertion.

**rail** (our name). A refusal built into the library rather than into an interface, so it cannot
be bypassed by writing a script. The write rails are why nothing has ever been written to a remote
here.

**fact marker** (our name). An HTML comment written directly after a number in a document, naming
the fact that number states. It does not render, so a reader never sees it, and it lets `make facts`
recompute the value from the corpus and refuse a document that has drifted away from the code.
`tools/facts.py --list` prints every fact available and `make facts-write` updates every copy of
one. No example is spelled out here on purpose: this file would then contain a marker naming a fact
that does not exist, and the check would fail on it.

**superseded** (our name). A claim a later finding killed. Recorded in `reference/superseded.md`
in the same commit, after which the tooling refuses that wording anywhere outside a correction.
This exists because an audit found eleven documents restating claims that `docs/findings.md` had
already corrected.

**correction** (our convention). An error recorded **in place**, with how it happened, rather than
quietly fixed. They are kept deliberately, so a reader can calibrate how much to trust the rest, and
the most instructive are the ones where a wrong rule produced the right answer. The running count
lives in the `docs/findings.md` preamble and is deliberately not repeated here: a number copied into
a second document is a number that goes stale, which is the failure the fact markers above exist to
catch.
