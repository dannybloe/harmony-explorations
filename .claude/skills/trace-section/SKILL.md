---
name: trace-section
description: Label a config section pointer by finding the firmware code that consumes it. Use when asked to identify what a GSPM/TPTP/AHCM section slot is for, to trace a config field to the firmware routine that reads it, or to work out which subsystem owns a pointer. Also the method for any "what does this config byte mean" question, since the answer is always in the code that reads it.
---

# Labelling a config section from the firmware

The container is a table of 19 to 21 absolute pointers and almost none of them are labelled.
This is the method that labelled the infrared one, and it produces facts rather than
hypotheses, because it reads the interpreter rather than diffing the program.

The shape of the method: **the firmware copies each config pointer into a per-subsystem RAM
variable, so whoever reads that variable tells you what the section is for.** The IR section
was identified because the dispatcher at `0x12F08` copied a pointer into `0x3BD/0x3BE` and the
handler that consumed it drove the IR LED.

Do the work on **arch 14** (the Harmony 700 2.8 image, base `0x9000`) unless there is a reason
not to. Every config byte read on arch 14 passes through one SPI primitive at `0x1B9AC`, so
the readers are enumerable. On arch 12 the config is memory-mapped and reads are ordinary
loads scattered everywhere. Decode arch 14, then port to arch 12 and confirm.

## Step 1: get the actual pointer values

```sh
python3 tools/gspm_parse.py <config.EZHex> --json
```

The JSON gives each slot both a `blob_offset` and a `file_offset`; they differ by the length of
whatever the container is wrapped in, an EZHex XML header or a flash dump, and picking the wrong
one shifts every section silently rather than failing. Do this for **two** configs of the same
architecture, because a slot that points at the same structure in both is a section, and a slot
that only makes sense in one is a misread. Arch 14 now has two: the Harmony 600 dump and the
Harmony 700 config, the latter from the same model as the reference firmware image.

Two configs of the **same remote** with a known difference between them beat two configs of two
remotes by a wide margin. The corpus has one such pair, the two Harmony 700 configs, with their
owner's written account of the change. Use it, but read `docs/findings.md` section 16 first: it
narrows the search a great deal and it still does not hand over a small edit, because Logitech's
generator rewrites whole sections that the change did not touch. Only one section changed *size*,
which is not the same as only one section changing.

The pair's most reliable output is negative. It established that the key table is **not** the
button to action map, and that nothing the six pointer arrays index is allocated per assignment.
Prefer that kind of conclusion: a described change that leaves a structure untouched rules the
structure out, and ruling out is cheap and does not decay.

**Do not start from scratch. Every slot from 3 to 17 already has a named firmware entry point**,
in `docs/findings.md` section 35: the routine `0x10B92` on the Harmony 700 image takes the slot
number in a register that callers load with a literal, so one scan produced the whole map. Go
straight to the consumer for the slot you want and skip steps 2 and 3 below.

**A section's size is not the distance to the next pointer**, it is an upper bound on it. Base
slot 4 holds 125 bytes and the gap to slot 5 is up to 1532, because slot 5's infrared group arrays
live in between. Read the consumer to learn where the section's own data ends. See
`docs/findings.md` section 36.

Look at the bytes the pointer lands on before touching the firmware. Only **slot 0** is
`0xFEED` framed, so for every other slot the size comes from the distance to the next
non-NULL pointer, and the pointers ascend with the slot number. The size alone often rules out
most guesses.

Two slots are already known, and neither is a target: slot 0 is that one frame, holding a tree
of named nodes under `Root`, and slot 1 is a seven byte record stating the architecture. See
`docs/config-format.md`.

## Step 2: find where the firmware reads that slot

The container header is read at load time, so look for the routine that walks the pointer
table at header offset `0x0C` onwards. On arch 14 start from the callers of the SPI byte read
at `0x1B9AC`:

```sh
python3 tools/pic18_disasm.py <image> 0x9000 0x1B9AC 40
python3 tools/pic18_trace.py <image> 0x9000 <ram addr> [<ram addr> ...]
```

The loader stores each pointer somewhere. Those destinations are the per-subsystem variables,
and they are the actual subject of this method.

## Step 3: find the consumers of that variable

```sh
python3 tools/pic18_trace.py <image> 0x9000 0x3BD 0x3BE
```

Then disassemble around each reader until the routine's purpose is obvious: which hardware it
touches, which SFR it writes, what it does with the bytes it fetched. `docs/findings.md`
section 13 lists the SFRs already identified, which is usually what turns a routine into a
name.

## Step 4: name the section by what the consumer does

Not by what the data looks like. "Section 7 is the IR parameter block" is a claim about the
consumer, and that is why it is checkable.

A prior worth having, from the person who designed the format: the table points at "data for
each of the various subsystems (IR sending, state variables, menus, action lists etc)". Use it
to generate candidates, never as evidence.

## Before you read: grep the findings for the structure's own constants

**One grep, every time, and it is not optional.** Section 256 is why: a dig into the Harmony 525's
action list interpreter met a range chain, read it out of the image, published it as an opcode band,
and had to be corrected an hour later. The correct reading had been in `docs/findings.md` since 9
August, in section 72, on a different architecture, and the constant was in
`src/harmony/gspm.py` with that section number in its comment.

Nothing in the image announces that a structure has been read before, and the four places rule only
makes a claim findable **if somebody looks**. So look, before reading rather than after:

* grep `docs/findings.md` for the **constants** the structure is built out of, in both spellings:
  `0xC000` and `0xC0`, an address, an opcode value, a length.
* grep it for the **phrase** you would use to describe what you are about to claim, "operand's high
  byte", "second copy", "container select".
* grep `src/harmony/` and `packages/codec/src/` for the same constants. A value that is already a
  named constant in the library has a section number in its docstring.

**A hit on another architecture counts.** That is the case that fails, because the dig is forwards
from an address and the prior reading is filed under a different image. `docs/findings.md` is 32000
lines and grepping it costs nothing; re-deriving a claim wrongly costs an afternoon and puts a wrong
statement in the record.

**A hit on the same architecture counts most, and it happened**, section 257: section 139's entry 23
already held the Harmony 525's whole band ladder, at the same addresses, and an afternoon re-derived
it anyway. So this check is not only for cross architecture work.

**The library answers faster than the prose**, and both re-derivations were sitting in it as named
constants with the section number in the comment: `OPERAND_HIGH_BAND` in `src/harmony/gspm.py` and
`BANDS_3F_ARCH9` in `packages/codec/src/actions.ts`. Grep `src/harmony/` and `packages/*/src/` first
for that reason, and read the comment rather than only the value.

**A collision is not a contradiction, and check it anyway.** Two constants in section 257's audit hit
prior art at the same address in a sibling image, and both were coincidences between two builds. Where
the value was is in the checking: it found that a finding had presented one build's addresses as its
architecture's. **An address does not transfer between two builds of the same firmware**, so a table
of addresses names an image, and a claim that spans an architecture has to be asserted over both.

## Pitfalls, all of which have cost time here

* **`pic18_trace.py` cannot see indirect access through FSR.** A variable written only via
  `INDF` looks like it has no writers. When a trace comes back empty, search for the `LFSR`
  that sets up the pointer instead. This is the single most common dead end.
* **Bank tracking is inferential.** The tool follows `MOVLB` and drops to unknown at any
  control transfer, and it marks accesses whose bank it could not establish. Treat those
  differently from confirmed ones; do not quietly promote them.
* **A callee can set the bank its caller writes in, and then the tracer answers with the wrong
  address rather than with silence.** This is worse than the `FSR` dead end above and it is the
  second one, section 253. On the Harmony 525 a routine calls a wrapper and then masks one bit into
  a flags byte; the `MOVLB` that selects the bank is **inside the wrapper**, after the call and
  before the return, so a linear reading and the tracer both attribute the write to the caller's
  own bank. The tracer then reports it against a plausible neighbouring address where it finds
  unrelated accesses and no contradiction. The same write also uses a mask rather than `BSF` or
  `BCF`, so a scan for bit writes of that flag misses it too.
  **So a variable can have a writer neither instrument will show you.** When a flag's writers look
  too few for what the firmware plainly does with it, read the **callers of the routine that
  computes it** rather than the writers of the flag, and check what the callee leaves `BSR` at.
* **A wrong load address produces a plausible listing, not an error.** Bases are `0x9000` for
  arch 14 and `0x20000` for arch 12. For an unexamined image use `loadaddr.find_base` and
  check the margin over the runner-up.
* **Do not trust the 600 dump for disassembly.** concordance truncates it at 65536 of 70336
  bytes and the entry point is in the missing tail. Use the 700 image.
* **A key code is an event type plus a scan code**, `0xC0` and `0x3F`, not a matrix address with
  bit 7 as a flag. That misreading stood here for a while and produced a whole paragraph of wrong
  reasoning about the 600's table being unable to describe its own keypad. It can: 54 scan codes
  times three event types. See `docs/findings.md` section 17.

## When the static route stalls

Two dynamic routes exist, both read-only:

* **RAM over USB, and which architecture decides whether it is any use.** `READ_MISC` with
  sub-command `MISC_RAM 0x06` reads live RAM off a running remote; `packages/usb` is built and
  `read-ram.ts` is the instrument. **On arch 14 it cannot label a section**: a connected Harmony 600
  has not loaded its config, `docs/findings.md` section 110, and the loader's own variables are all
  zero, so no section is live and there is no per subsystem pointer variable to poll. **On arch 12 it
  can**, section 111: a connected Harmony One has read its base slot 15 and is executing, so a
  candidate variable can hold a real value. Two things temper it even there. A remote on USB is in USB
  mode, so its normal user interface cannot be driven by hand and the values are whatever the last
  normal mode pass left; and its analogue sampler does not run, so anything downstream of a
  measurement is frozen. Use it for hardware state the firmware sets up regardless, which is what
  sections 105 and 110 used it for, and on arch 12 for asking whether a variable a config should have
  filled is filled.
  **This entry said "a remote on USB has not loaded its config" flat, for one day**<!--superseded-->, on the strength
  of one architecture. That is the mistake the pitfall about arch 14 at the end of this file warns
  about, made in the dynamic route rather than the static one.
* **The emulator**, deferred by decision 5 in `docs/roadmap.md`. If a question genuinely needs
  an ordered trace of every config byte read, that is the argument for building it, and it
  should be made explicitly rather than by drifting into it.

## Finishing

A labelled section is a finding, so it lands in three places at once: the structured fact in
`docs/config-format.md`, the reasoning and the trace in `docs/findings.md`, and a regression
test in `tests/`. Use the `finding` skill, which does exactly that and refuses to skip the
test.

Two independent samples minimum. Mark anything single-sample as unconfirmed, in the document,
in those words.
