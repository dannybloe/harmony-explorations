# Logitech's own host software as a source

Logitech's classic desktop application, the one the Harmony One shipped with, survives and is
not obfuscated, so it can be read as ordinary source with real class and field names. It is the
software that actually drove these remotes for a decade. Where this project has to infer, that
code can be read.

It is also unlicensed proprietary code, so how it may be used needs stating rather than
assuming. This document is the rule and the ledger: what the rule is, why it is what it is, and
every fact currently believed on the client's word alone.

## Why the rule changed, twice

**Read the client and the firmware, both, before deriving anything.** Danny's decision of 28 August
2026, and it reverses the order this document carried for three weeks without demoting the image:
**the firmware is as important as the client and often more**, which he said in those terms the same
day. The client's advantage is that it is cheap and legible, so it is the fastest way to find out
whether an answer exists at all. The client is the cheapest source
there is: it states outright what the firmware only implies and what hardware only hints at, and every
hour this project has lost in the last month was lost by working something out that was written down
in it. Section 197 is nineteen days of a protocol map sitting unread. Section 200 is six rounds of
guessing a packet framing that was one function in their code. Section 202 is a wrong reading
published in four documents while the source that refutes it sat in the lab.

So the question "where do I look" has one answer now and it is not a judgement call. Look there,
then derive.

**The old ordering was `Firmware first, always`**<!--superseded-->, with the client admitted only
where the firmware genuinely could not settle something. Two things were wrong with it. It made the
cheap source the last resort, so the expensive work happened first by default and the check that would
have prevented it came after. And it confused two different questions: **where a fact comes from** and
**what confirms it**. Reading their code first does not make it authoritative, and that half is
unchanged below.

What was decided on 9 August 2026, and still holds: the client may be a source of record at all. The
old rule said never, full stop, which discards facts nobody can recover any other way, and the cost of
discarding them is not abstract: it is remotes that stay unrepairable and get thrown away.

**Firmware is still the better evidence and still wins a disagreement.** It says what the remote does,
where the client says what one host believed. Section 20's off by one lived in two independent parsers
for months because both had copied the same wrong convention from each other.

**The interoperability case is the substantive one, not the licence.** The right to decompile a
program in order to make an independent program work with it is written into European law, in
the Software Directive and in article 45m of the Dutch Auteurswet, and it does not depend on
what licence this repository carries. It permits obtaining the information. It does not permit
republishing the decompiled code, and it does not cover copying expression. So the rule below
is shaped by what that permission actually covers, which is narrower than "we may use it" and
wider than "we may not look".

Changing this repository's licence would not help here and is not the lever it looks like.
Copying from unlicensed proprietary code is an infringement whatever licence the result carries;
MIT is not the obstacle. See `docs/decisions.md` decision 1 for what the licence question is
actually about, which is libconcord and harmony-decompiler.

## The rule

1. **Both sources, before deriving.** Before working out how a remote is driven, what a packet looks
   like, which call to make or what a field means, look in their code **and** in the firmware.
   Open the client early because it is the cheapest place an answer can be, and never treat that as
   a substitute for the image. It is the
   cheapest place an answer can be, and the reason for the order is measured rather than argued:
   sections 197, 200 and 202. `work/myharmony/src/` is MyHarmony decompiled to C# and is the first
   stop; the compiled assemblies beside it are not a substitute, per section 202.
2. **Then confirm, and the firmware is the authority.** Reading the client first says nothing about
   what is believed: where the firmware or the hardware can answer, that is the citation, and where
   neither can, the fact is marked client sourced here and wherever it is used, in those words. A
   client sourced fact may be acted on and may be built on; what it may not do is enter
   `reference/config-format/README.md` as confirmed, or carry a regression test asserting it as true. A test may
   assert our corpus is consistent with it, which is a different claim, and a fact moves out of this
   ledger the day something measures it.
3. **Expression does not travel.** No identifier, no comment, no code, no structure. An address
   is a fact about the hardware; the name Logitech gave it is their writing. Everything below is
   restated in this project's own words for that reason, and the verbatim extraction stays in
   the private lab.
4. **The decompiled source is never published or quoted**, in this repository or anywhere else.
   That is the same rule the lab has always had, and it is also the condition the
   interoperability exception comes with.
5. **A confirmed lead moves out of this document** into the normal places, with the firmware as
   its citation and a line saying the lead came from here. The ledger below should shrink.

## Published user manuals are a third source, and a much easier one

Added 9 August 2026. Logitech's user manuals are documentation written for owners and distributed
freely, and several are still online. They are neither firmware nor decompiled code, so **none of
the rules above applies to them**: quoting a sentence of a manual is ordinary citation, and there is
no expression problem and no interoperability exception to lean on because none is needed.

They are weak on mechanism and strong on intent, which is the opposite of the firmware. The manual
does not say what a packet looks like; it says what the system was for, and that turns out to settle
questions the bytes cannot. The one that paid: the Harmony 880 manual states that a learned infrared
signal is uploaded to Logitech's web site, that **the web site** looks for a matching pattern, and
that a match is converted to a compact form while a miss is stored in its original format. That is
why three of the four infrared encoding classes appear in no config in this corpus, section 42, and
no amount of firmware reading would have said so.

Worth checking a manual before assuming a behaviour is undocumented. [The product line](product-line.md)
lists the forty retired models, and the manuals are indexed under Logitech's support assets.

## Harmony Desktop is a fourth source, and MyHarmony is the reference client

**Read MyHarmony first, and do not use Harmony Desktop's web application as the source for how the
product works or how a remote is driven.** Danny's instruction of 28 August 2026, and his reason is
about the products rather than the code: everything Harmony Desktop can do MyHarmony can do too, and
better, so a reading taken off the newer client describes the generation it was written for and not
the ones on this bench. This section said Harmony Desktop was "and the richest one"<!--superseded-->
for nearly three weeks.

**It cost a whole afternoon the day the rule was written**, and the first account of why was wrong.
This said MyHarmony builds the compile "a different operation of the three the service
offers"<!--superseded-->, which came from finding the name in a compiled assembly rather than from
reading a call site. Section 202 read the source: MyHarmony's sync sends the **same** operation this
project already sends, and the different one is the on screen simulator. What MyHarmony actually does
differently is not send it at all for a Harmony Touch, because its sync branches on the product's
declared capabilities and that product takes a provisioning route with no compile in it.

So the rule is per question. **Which call to make, in which order, with which arguments: MyHarmony,
always**, and it is `../lab/work/myharmony/xap/` plus `../lab/software/MyHarmony/`. Where the two
clients disagree about anything, MyHarmony wins and the disagreement is worth writing down. What
Harmony Desktop's mirror is still good for is the two things nothing else here holds: the **per skin
protocol templates** for the file based family and the **parameter encoder** section 200 needed, both
of which were confirmed against hardware rather than believed on the client's word. Facts already
taken from it stay, and a fact that contradicts MyHarmony goes.

Added 9 August 2026, and it is a **different application** from the MyHarmony client the section
near the end of this document reports as empty. That one is the Silverlight era. This one is
`Harmony Desktop.app`, built January 2022, and it is the application used here on 7 August
2026 to program a Harmony One, so it demonstrably still drives an arch 12 remote.

**Its native half knows nothing.** The application binary is 141 KB and the two C++ frameworks
beside it are a transport: a HID channel with a read and a write, a command object that holds
outgoing packets, an expected packet count and a timeout, and a device record of vendor id, product
id, version, report lengths and skin. There is no command name, no opcode, no config structure and
no infrared symbol in any of it. That is a fact about the architecture rather than a jab: the
intelligence is deliberately elsewhere.

**Elsewhere is a hosted web application**, named by the bundle's own setup URL, and it is **data
driven on top of that**. The packet layout for a given remote is not compiled into anything. It is
one file per operation per model, served from Logitech's content network, and the client's own
cache manifest enumerates all of them. Twenty three models, twenty three operations each, and
three of the models are architectures this project works on: arch 12's Harmony One, arch 14 under
an internal codename, and an arch 9 remote.

**The rules above apply unchanged.** The files are Logitech's expression, they stay in the private
lab, nothing is quoted here, and every fact taken from them is marked client sourced and enters the
ledger below rather than `reference/config-format/README.md`. What makes this source better than the decompiled
client is only that it is **legible**: a packet is stated as a packet rather than reconstructed from
disassembly, so the cost of checking a claim against the firmware drops rather than the standard
for believing one.

**It is live, and that is the reason it was mirrored the same day it was found.** Everything the
manifest lists is in the lab now, with provenance and a hash. The service could be withdrawn at any
time, which is the same argument the write rails rest on.

## The ledger: believed on the client's word alone

Everything in this section is **unconfirmed**. It is a shopping list for firmware work, in
roughly the order it is worth doing.

### A config is invalidated before it is written

The write sequence is a `WRITE_MISC` with selector 2 and no arguments, then the flash write.
Selector 2 is already known to be serviced on arch 14, `reference/usb-protocol/commands.md`, and has no
reading. Selector 11 does the same thing for the embedded config.

So the remote is not erased before a write, it is marked invalid, and a half written config is
never executed because the mark is still set. A separate constant set names six firmware update
states including one for invalid and one for interrupted, which suggests the mark is a state
value rather than a flag.

**This is the highest value item in the document.** It is the missing rail for any future write
path, and it is cheap to confirm: read what selector 2's body at the selector chain writes.

### Confirmed and moved out

**The platform codenames and the skin number table**, 9 August 2026. A resource file carries nine
USB vendor and product pairs against Logitech's internal platform names, and 46 skin numbers
against models. Five skins this project had already measured, from firmware literals and from live
remotes, all agree exactly, and the full table sharpened section 81's rule for the two containers
that carry a skin their remote does not have. The platforms are in [the architectures](../architectures/README.md#platforms-and-product-ids)
and the skins in [the remotes index](../remotes/README.md#where-the-skin-numbers-come-from), and
`tests/test_gspm.py` asserts the corpus against the skins rather than asserting the table.

That one had already been used as a lead in section 81, before this document existed, which is
part of why the rule needed writing down.

**The erase block table and the writable ceiling**, 9 August 2026, now in
`packages/usb/src/rails.ts` as `ERASE_BLOCK_SIZE` and `WRITABLE_CEILING`. They went into the code
while still client sourced, because of which way they cut: **they make the rail refuse more.**
Tightening a refusal on weak evidence costs a write that might have been fine. Loosening one costs
a remote.

**`WRITABLE_CEILING` was confirmed the same day, and by the device rather than by the firmware.**
Reading a Harmony One's own flash at `0x3D0000` returns an application firmware image, byte
identical to the archived package and to the copy the remote runs from, **on both Harmony Ones**,
one of which has never had vendor software near it. So the client was right and the top 192 KiB of
the nominal config region is not spare. `docs/findings.md` section 88.
`ERASE_BLOCK_SIZE` is still unconfirmed, and confirming it means erasing something, so it will stay
that way for a while.

The confirmation took as long as it did for a reason worth recording here rather than only in the
finding: this project's own address validator refused every arch 12 address above `0x200000`, so
the read that would have checked the client's claim was impossible until that was fixed. A wrong
refusal hides exactly what it refuses.

The client picks a flash block table from the chip's JEDEC manufacturer and device id, which it
reads over USB. Every chip it lists against arch 12 is uniform 64 KiB from `0x010000` to 4 MiB, so
**an erase anywhere in the arch 12 config region takes 64 KiB with it**, and the fine boot blocks
are all below `0x010000` and outside anything the rails permit.

**The bottom of flash is per chip and this said it was not**, section 221. It read "for every chip
it lists against arch 12 the layout is `16K, 8K, 8K, 32K`"<!--superseded--> and then uniform 64 KiB,
which is one row, `S29AL032D`. Two of the three arch 12 rows begin with eight 8 KiB blocks instead,
and the part both bench Harmony Ones report is one of those. The word "every" is what turned a row
into a table. Nothing the rails do changes, since no rail permits an address down there, and the
half they rest on is the half that survives.

**The 64 KiB figure has a firmware reason since section 192, and that reason establishes less than
this paragraph claimed.** Before every flash access the arch 12 firmware writes the request's top
byte, biased by three, to a register at external `0x020025`, and then replaces that top byte with a
fixed `0x13`. Sixteen bits of offset are left, so the **addressing window** is 64 KiB by
construction.

**Corrected on 29 August 2026.** This went on to say the block size therefore "follows from the
addressing rather than from a chip table", and so was "no longer held on the client's word". It does
not follow: a 64 KiB window bounds what one command can reach and says nothing about how much the
chip erases at once. The refutation is in this document already, under "Flash block geometry" below,
where the bottom 64 KiB is stated to erase in 8 KiB blocks **under that same window**. So a window
and a sector are different quantities and the firmware only gives the first.

`ERASE_BLOCK_SIZE` is therefore still **client sourced and unconfirmed**, exactly as the paragraph
twelve lines above this one says, and the two statements contradicted each other until this
correction. The client's table remains the source for the block size, for the **fine** boot blocks
and for the alignment rule, none of which the firmware states.

**What would confirm it costs no write.** The client picks its table from the chip's JEDEC
manufacturer and device id, which it reads over USB, so reading that id off the connected unit and
matching it to the table's row is a read and settles which row applies. Confirming the *erase* span
directly does mean erasing something, which is why it has waited.
Two consequences the rails now enforce:

* an erase address must be a **block boundary**. The client walks its table from zero and starts
  erasing at the first boundary at or after the address, so an unaligned caller gets neither the
  erase it asked for nor an error.
* the writable ceiling is `0x3D0000`, not the nominal `0x400000`, because the client declares the
  remote's **stored application firmware** at `0x3D0000`, inside the region section 47's own
  validator treats as config. A writer that trusted the nominal top would erase the firmware.

`packages/usb/test/rails.test.ts` names those two addresses as the cases that used to be allowed.
Confirmations that cost nothing and came with it: `ERASE_FLASH` is `0xD0` with a 24 bit address
and no count, `WRITE_FLASH` is `0x30` and takes the same five bytes as `READ_FLASH`, and both are
most significant byte first. All three were already read from the firmware.

The one new protocol shape is a **sixth byte**: both flash commands have a variant that appends a
memory type selector, and both erase variants likewise. Nothing here has seen one sent, and the
firmware reading has the five byte form, so it is recorded and not acted on.

**Base slot 0's frame length is 24 bits, not 16**, 9 August 2026. The client reads three bytes at
`+0x02` of the `0xFEED` frame, where this project read two and described the byte at `+0x04` as a
spare that is "zero in every sample". It is zero in every sample because the largest name tree in
the corpus is 2326 bytes, twenty eight times below the 16 bit boundary, so **no sample here can
separate the two readings**.

Adopted anyway, in both codecs, because the readings cannot disagree on anything this project has
and the wider one survives a config the corpus does not contain. `tests/test_gspm.py` states
exactly that: the byte is zero everywhere, the narrow read equals the wide one everywhere, and the
largest tree is pinned so a sample that could tell them apart fails loudly.

The same routine confirms two things already believed: the terminator is `0xBEEF` at
`start + length`, which is section 83's `length + 2` from a different direction, and an older
architecture uses a different magic with a 16 bit length, which is why the width is stated per
magic rather than per architecture.

**The file format classes, 9 August 2026, and this one is different in kind**: it corrected four
things and none of the corrections needed the client's word for anything. `docs/findings.md`
section 87. The EZ container's split rule is structural rather than arithmetic, both declarations
in the header are optional, the compatibility gate compares six fields rather than four, and an
arch 12 firmware package states its own two way split in `<PHASE>` elements. Every one of those was
then checked against files this project has held since the first week, so what the client supplied
was the **question**, and the corpus supplied the answer.

That is the shape this document argued the client was for, and it is worth naming as a fourth
category beside the ledger, the confirmations and the dead ends: a source can be worth reading
because of what it makes you go and measure, without a single fact travelling from it.

**The platform codenames no longer rest on the client at all**, same date. Logitech's firmware
packages carry a comment naming the architecture on every entry of the list they refuse, so
Espresso, Mocha, Cappuccino, Cognac, Gin and Molson are corroborated by a shipped data file rather
than by decompiled code. The skin table above is unaffected and still client sourced.

**The software type values**, same date, and they came from a package rather than from the client:
0 application, 4 safe mode, 1 test, 3 boot. Section 87 places them in `GET_VERSION` field 4's low
nibble by reading the same accessor out of each bench remote's application and safe mode images.

### Flash block geometry, which changes an erase rail

The client states a block table for arch 12 as counts and sizes: **eight blocks of 8192 bytes,
then sixty three of 65536**. The 64 KiB figure is what this project measured and built its erase
rail on, and it is right for everything above the first 64 KiB. What is new is that **the bottom
64 KiB of flash erases in 8 KiB blocks**, and that is exactly where the embedded config at
`0x002000` lives.

**Which row this is was settled on 30 August 2026**, section 221: it is Atmel `AT49BV322A`,
manufacturer 31 and device 200, and that is the pair both bench Harmony Ones report in their version
block, `1F:C8`. So this is not "the arch 12 table", it is the row for the part on the bench, and the
paragraph above stated a different row as the architecture's. The join was available the whole time,
since the id is recorded five hundred lines below in this same document.

A rail that requires a 64 KiB aligned address and a whole 64 KiB block inside the region is
therefore too coarse at the bottom of flash and would refuse a legitimate erase there, which is the
safe direction, but it also means the rail's stated reason is wrong for that range. Client sourced,
unconfirmed, and worth measuring before an erase rail is relied on for anything below `0x010000`.

## MyHarmony was checked and holds no protocol, and why that is worth knowing

*9 August 2026. A negative result, recorded because it closes a route that looked obvious and
would otherwise be proposed again.*

The classic client is one of Logitech's two desktop applications. The other is MyHarmony, which
replaced it, and the reasonable expectation was that the newer software knows at least as much.
It does not, and the reason is structural rather than accidental.

**It is not a native application.** MyHarmony is a Silverlight application inside a Chromium
shell, so the interesting half is managed .NET rather than machine code, and a disassembler is
the wrong tool for it. The application itself is not installed either: it was downloaded from
Logitech's servers at run time. What survives is 16 copies in the shell's browser cache, in two
vintages, from our own sessions. They decompile to about 244000 lines of readable C#.

**Its USB layer carries no protocol constants at all.** In 17800 lines of driver code there are
nine distinct byte-valued hex literals and not one of them is a command byte. Every operation is
a *string name*, `readflashinterpreter`, `send`, `packet`, resolved against XML the server sends
at run time. There is a packet writer and interpreter per platform family, arch 14 among them,
and they assemble packets from a script rather than from knowledge. So the protocol knowledge
was moved to the server between the two generations.

> ~~and the server is gone~~. **Wrong, corrected 9 August 2026, and it is the second time this
> project has killed a live service on paper.** `svcs.myharmony.com` answered on 7 August 2026,
> its certificate had been renewed that July, and section 58 had it compile a config for a device
> chosen from its catalogue that week and sync it to a remote. The classic service is the one that
> is discontinued, section 56, and this sentence collapsed the two again exactly as `CLAUDE.md`
> warns.

That inverts the expectation and it is the useful part: **the classic client is not merely the
better source, it is plausibly the last copy of that knowledge outside the firmware itself.**

**The correction changes what MyHarmony is worth, and upwards.** If the packet scripts are XML the
server sends at run time, and the server answers, then those scripts are **retrievable** rather than
lost. That is a larger prize than the device catalogue: it would be an independent statement of the
command layer per platform family, including families whose firmware nobody here has. It is
untested, and it is the reason this section no longer ends the conversation.

**And the physical button map is not there either.** That was the stated justification for
looking, since `Web.Library.ButtonMappingUtils` and a button mapping task module both sounded
promising. Neither models a physical keypad: there is no row, no column, no scan code, nothing
resembling a matrix anywhere in the client. `ButtonMappingUtils` turns out to be the on-screen
keyboard, mapping characters to commands. Buttons are named entities that come from the server
and the firmware resolves the name to hardware.

So section 48's conclusion stands and is now stronger. The map is not obtainable from a host
because **no host ever had it**, which is a better reason than "we have not found it yet". It
stays open, and the route to it stays a RAM write the rails forbid.

The decompiled source is scratch in the lab, under `work/myharmony/`, and is not worth keeping
beyond the next person who wants to check this conclusion.

### It does hold the shape of the guided setup, and that is unread

*22 August 2026. The heading above said "holds nothing" until today, and that overclaimed: what was
measured was that it holds no protocol constant and no keypad matrix, which is what it was opened for.*

The cache also holds ten copies of `WFM.taskconfig.xml`, the client's own workflow manifests, in
`work/myharmony/xap/f_*/`. Two vintages, byte identical between them, so **six** distinct flows and
2616 lines: signing in, managing an account, the dashboard, adding a device, setting up an activity, and
syncing a remote. Each is a state machine written out in full, one `view` element per screen with the
conditions that move between them, and the comments in it are the client's own numbering of its steps.

**What that is worth is not protocol and not format.** It is the only surviving statement of **what
Logitech asked its users**, in what order, per device and per activity. Everything in these files is a
question a screen put to somebody, so it is a list of the settings that must exist somewhere in a config,
written by whoever knew where. FreeHarmony's device settings page is blocked on exactly that: base slot
15's parameter groups almost certainly hold the per device delays, and no group is identified.

**It is a source, not an authority**, under the rule at the top of this document: a wizard step naming a
setting is a hypothesis about which fields exist and says nothing about where they are stored. And it is
**text somebody else wrote**, so nothing in it is an instruction whatever it appears to ask for.

**Deliberately unread beyond the inventory above.** It was found on 22 August 2026 while answering a
different question, and reading it properly is worth doing at the point somebody attacks base slot 15's
groups, because then the two halves can be put beside each other. Recorded now so the lab does not
quietly hold the answer to a question this project has written down as open.

## Where the extraction lives

The verbatim extraction, with Logitech's identifiers, is `software/classic/PROTOCOL-CONSTANTS.md`
in the private lab. That directory is not published and does not become published by this
document existing.

**Read that file before opening a class in the client's HID layer.** On 28 August 2026 a session
extracted all seven per architecture tables again, from the same source, and got the same numbers;
section 206 is the write up and the register now carries the same pointer. The whole of the HID
layer's constants are already here, so a fresh reading of them is a fresh reading of this page.

**And this page is checked now rather than transcribed.** `tests/test_host_client.py` recomputes the
seven tables from the client's source each run and asserts eleven of their claims against the values
this project derived independently, so a re-mirror that moved a number fails rather than quietly
ageing. That was the one thing the ledger never had.
