# Plan: from here to generating configs

**Superseded by [roadmap.md](roadmap.md), which is the plan of record.** This document is the
earlier proposal, extracted from the write-up posted to harmony-decompiler discussion #7, and it
is kept because its arguments are still the reasoning behind the sequence: the firmware is the
spec, arch 14 first, extract before you generate. Where the two differ, the roadmap wins. The
substantive change is ordering: this document treats the user-facing application as the last
phase, and the roadmap treats it as the goal that every phase reports to.

A starting point to argue with, not a decree. It is built around one strategic
shift and one piece of tooling that I think changes the economics of the whole project.

## The shift: the firmware is the spec

Every question of the form "what does this config byte mean" has an exact answer sitting in
the firmware, in the routine that reads that byte. Sample-diffing produces hypotheses;
reading the consumer produces facts. The IR carrier fields took an afternoon
this way, and came with a numeric self-check (38 kHz implies a stored 263, which the code's
arithmetic turns into exactly 26.25 us). That kind of confirmation is not available from
diffing.

Corollary worth saying out loud: **we do not need to touch firmware at all.** The goal is to
generate config files. Firmware analysis is a means of reading the spec. Nobody should be
flashing modified firmware, which removes the scariest failure mode entirely.

## Do the format work on arch 14 first, even though the One is more popular

This is counterintuitive so let me justify it. On arch 14 (600, 700) the config lives on an
SPI flash that is **not** memory-mapped, so every single config byte the firmware reads goes
through one narrow choke point, the byte-read primitive at `0x1B9AC`. On arch 12 (One) the
config is memory-mapped and read with ordinary loads scattered everywhere.

That choke point is a gift. Instrument that one function and you get a complete, ordered log
of exactly which config bytes the firmware touches, for any action. Decode arch 14 first,
then port the understanding to arch 12, where the structures are clearly related (same GSPM
container, same magic markers, same trailer).

## Phase 0: unblock the basics

* Fix the concordance firmware dump for both architectures (section 6). Right now nobody can
  dump their own firmware correctly, which is why this went unnoticed for years.
* Archive the surviving Logitech `.hfw` firmware files for every model anyone can find,
  before that repair shop's hosting also disappears. This is the single most
  time-sensitive item in the whole plan. Those files are irreplaceable, there is no
  authoritative source left, and everything else here depends on them.
* Publish the load addresses and a scripted Ghidra project setup so nobody repeats section 4.
* Start a labelled config corpus: dumps plus each contributor's description of what is in them
  (which devices, which activities, which buttons do what). A dump with a known description
  is ground truth. A dump without one is much less useful.

## Phase 1: label the config sections from the firmware

The GSPM header is a table of pointers, 21 slots on arch 12 and 19 on arch 14, and we do not
know what any of them are for. But section 10 shows the pattern that answers it: the
dispatcher at `0x12F08` copies a config pointer into a **per-subsystem RAM slot**, and
`0x3BD/0x3BE` turned out to be "the IR subsystem's pointer" purely because of which handler
consumed it.

So: find every RAM location that a config-derived pointer gets copied into, find its
consumers, and each section gets labelled **by function** rather than by guess. This is
mechanical, parallelisable across people, and it converts the pointer table from an unknown
into a map. I would do this before anything else in the format work.

Also in this phase: work out the config trailer checksum. I located it (the u16 immediately
before the `PTYY` marker) but did not derive the algorithm. Nothing can be uploaded until
that is known, so it is on the critical path. The firmware routine that validates a config on
boot is where to look.

## Phase 2: build an emulator harness. This is the highest-leverage item

The whole firmware is available, the chip is a plain PIC18, and the config is a file we
already have. So run the firmware in a simulator with a real config dump serving as the
emulated flash contents.

Why this is worth real effort:

* **Dynamic tracing beats static reading.** Log every config address the firmware reads while
  emulating a specific button press, and you learn precisely which bytes matter for that
  action, in order. That is enormously faster than reading code cold.
* **It closes the verification loop with zero hardware risk.** Watch the IR output pin in the
  emulator, decode the waveform, and compare it against a known-good IR code for that device.
  Now "did I generate a correct config" is an automated test rather than an experiment on
  hardware you cannot replace.
* **It makes the work CI-able.** A regression suite over a corpus of configs becomes possible.

On tooling: MPLAB X's simulator supports these parts and is the obvious cross-check, but it
is awkward to instrument. I would write a purpose-built PIC18 emulator instead. It is a
smaller job than it sounds, because you only need the core instruction set (about 75
instructions, and I already have a working disassembler for all of them), plus TBLPTR, the
FSR indirect registers, a stubbed MSSP that serves bytes out of a config file, TMR0, and a
trace on the IR pin. Everything else can be left unimplemented until something hits it.

Arch 14 is the right emulation target for the same choke-point reason as above.

## Phase 3: extract before you generate

Worth doing early because it delivers value immediately and independently: **the IR codes
people cannot recreate are already sitting in the configs on their own remotes.**

An extractor that pulls the IR database out of existing dumps into a documented, shareable
format:

* needs only read-side understanding, so it lands long before any generator
* cannot break anyone's hardware
* gives every owner something useful right now
* builds exactly the labelled corpus Phase 1 needs
* preserves the data before more remotes die

I would treat this as the first shippable deliverable of the project.

## Phase 4: round-trip compiler

Adopt the harmony-decompiler approach, which is exactly right: model a config as an ordered
list of regions that tiles the blob with no gaps and no overlaps, decode what you understand
into JSON, and preserve everything else as opaque blobs. The invariant is that decompiling
and recompiling an untouched config must be byte-identical. That makes progress measurable
and prevents silent corruption.

Then work up in difficulty:

1. Recompile an untouched config, byte-identical. Proves the container and the tiling.
2. Change one field you fully understand (an IR carrier frequency), verify in the emulator.
3. Change a whole IR command. Verify the emitted waveform.
4. Add a device. Add an activity. Build a config from scratch.

Each step is verifiable in emulation before it ever touches hardware.

## Phase 5: hardware validation, last and carefully

Only once the emulator agrees. Use a remote you can afford to lose, keep a verified copy of
its original config, and know the recovery paths first: there is a safe-mode config in flash and a hardwired reset key combination in the firmware that works
regardless of what the config contains.

## Phase 6: the user-facing tool

Config generator plus an editor plus a community IR database seeded from Phase 3. This is
the part everyone actually wants, and it is deliberately last, because it is ordinary
software work once the format is known.

## Milestones, so progress is legible

1. Anyone can dump their own firmware correctly and load it in Ghidra.
2. Every GSPM section slot is labelled by function.
3. The config checksum is reproducible.
4. Emulator boots a real config and emits a decodable IR waveform.
5. An extractor publishes IR codes out of existing dumps.
6. A config recompiles byte-identically.
7. A hand-modified config produces the expected IR waveform in emulation.
8. A modified config runs correctly on real hardware.
9. A config built from scratch runs on real hardware.

## Known unknowns, stated honestly

* The config checksum algorithm. On the critical path.
* There are **four** IR encoding classes (the dispatcher at `0x12F08`). I traced one. The
  other three need the same treatment.
* Per-model skin and layout dependencies. The `SKIN` field and the differing pointer table
  lengths suggest a per-model component we have not characterised.
* Arch 12 versus arch 14 differences are real and each needs its own pass, though they look
  closely related.
* The LWJL semantics still differ between architectures in a way I do not understand
  (see `config-format.md`), and the translation between the scanner's linear key index and the config's
  event codes has not been found yet.

## On who does this

Worth being straight about, given who wrote the analysis: an AI can produce disassembly,
trace variables, derive formats and draft patches, on request and fairly quickly. What it
cannot do is own a work item. It does not turn up next week, it has no hardware, and it
cannot be the maintainer who says no to a bad patch.

So read this plan as a proposal for humans to pick up, not a commitment. The parts that
suit further AI assistance well are the mechanical, verifiable ones: labelling the remaining
GSPM sections by finding their consumers (Phase 1), deriving record layouts from the code
that reads them (Phase 2), working out the config checksum, and writing the emulator core,
which is a large but very well-specified job. Those are all "read the code and report what it
says" tasks with checkable answers.

The parts that need humans are the ones that need judgement or hardware: deciding the
sequencing, reading a part number off a board, dumping flash off a real remote, agreeing a
sanitisation policy for shared configs, and being the person who takes responsibility when
something gets written to a device that cannot be replaced.

The immediate concrete asks are therefore small and all human-shaped: does anyone object to
the concordance changes in section 6, can someone with a One open it and read the MCU
marking, and does the arch-14-first sequencing argument hold up to people who know these
remotes better.
