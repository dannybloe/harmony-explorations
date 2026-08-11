# harmony-explorations

Reverse engineering the Logitech Harmony config format, so configs can be generated again.

A config already on a remote can be read off it, but nobody outside Logitech can generate a new one.
The goal is to change that, and the route is **generating config files rather than modifying
firmware**: a config is a program in a data format and the firmware is its interpreter, so the
firmware is the authoritative specification for every config field. That turns format work from
inference into fact finding.

**This repository holds the specification, the evidence and the libraries.** The documents argue for
the format, the TypeScript packages implement it, and the two live together because a codec in a
second repository drifts away from the spec it implements. All MIT.

**The application is [FreeHarmony](https://github.com/dannybloe/FreeHarmony)**, a separate
repository, AGPL-3.0: a local, cross platform program that reads a config off a remote, edits its
devices and activities, learns infrared codes and writes the result back. Version 1 is read only.

Related effort, and a privileged source of hypotheses:
[trelowney/harmony-decompiler](https://github.com/trelowney/harmony-decompiler).

## Start here

| | |
|---|---|
| **[docs/status.md](docs/status.md)** | **where the work stands**: what reads today, what the corpus holds, the headline findings |
| [docs/roadmap.md](docs/roadmap.md) | the plan of record: decisions, milestones, what is answered next and why that one |
| [docs/findings.md](docs/findings.md) | the authoritative technical reference, 121 numbered sections, every claim with its evidence and its corrections |
| [docs/config-format.md](docs/config-format.md) | the format as a specification, structured, with everything unconfirmed marked as such |
| [docs/glossary.md](docs/glossary.md) | the vocabulary, and per term whether it is Logitech's word, ours, or a standard one |

Five architectures are covered and six are not. **Nothing has ever been written to a remote.**

## Can you help? Send a dump of your remote

**This is the bottleneck.** Almost every open question in this project is open because nobody
involved owns the remote that would answer it. A single config off a model nobody here has seen is
worth more than another week of reading the firmware we already have.

[docs/status.md](docs/status.md#what-the-corpus-holds) has the coverage table: which architectures
are covered, which firmware is held, and what would help most. The short version:

* **A Harmony 890 or 895 firmware dump is the hardest blocker in the project.** Two 890 configs are
  here and cannot be read, because arch 10's twenty three pointer slots are provably not a
  relabelling of the twenty and no firmware exists to settle them.
* **Arch 7 has eight models and not one sample**: 610, 620, 628, 659, 670, 676, 680, 688.
* Also unseen: the 745, the 748 and the 768, and the 720 and 785 on arch 8, and any 55x.

### How to send one

**Email it to freeharmony@bloemeland.nl.** Please do not attach it to an issue or a discussion: this
repository is public, and a config is Logitech generated data including an infrared database compiled
from Logitech's own, so it cannot be published here. That is the same reason firmware is not in this
repository either. Issues and discussions are very welcome for everything else.

To make a dump, [concordance](https://github.com/jaymzh/concordance) is the tool. Install it, plug the
remote in with its USB cable, and run these in whatever directory you want the files in:

```sh
concordance -c                              # the config. Writes config.EZHex
concordance -i > harmony-600-info.txt       # what the remote says it is. Prints to the screen, so
                                            # redirect it, and end the name in -info.txt
concordance -b -f                           # the firmware. Writes firmware.bin. Only worth it on the
                                            # models listed below
```

**Lower case flags only.** `-c` reads the config off the remote and `-C` writes one to it; `-f` reads
the firmware and `-F` overwrites it. The flag you want and the flag that reflashes your remote differ
by one shift key. `-r` reboots it. And never pass a bare filename: `concordance somefile` is
"automatic mode", which works out what to do with the file, and for a config that means writing it to
the remote.

**The firmware dump only works on some models**, and that is a defect in concordance's architecture
table rather than in your remote: on the 51x, 52x, 55x, 720, 785, 880, 882 and 885 it returns the
complete firmware, and on the One, 600, 650 and 700 it returns something that is not usable firmware
at all. [reference/concordance-notes.md](reference/concordance-notes.md) has the reason and the patch.
**Nobody knows which it does on an 890 or an 895**, and finding out is itself useful, so if you have
one: run it, and say what you got. It is a read command either way.

That is the whole ask: two files and a model name.

If you would rather send nothing of your config at all, there is a structural report that carries the
**shape** of a config and none of its contents, so it can go in a public discussion instead:
`make probe`, or `node packages/probe/bin/probe.ts --file <config>`. It needs a checkout and a build,
so today it is for people who already do that. [docs/roadmap.md](docs/roadmap.md) step 8 has the
reasoning and `packages/probe` has the tests that keep it empty of contents.

## What is deliberately not here

**No firmware or config binaries, no config dumps, no Ghidra projects.** Unlicensed proprietary
Logitech code and data, per above. The archived `.hfw` firmware packages additionally contain a
`Data.xml` carrying the original downloader's Logitech `UserId`, account GUIDs, `ServerID` and an
`ASPSESSIONID` session cookie, so redistributing one redistributes a stranger's session details.
[reference/checksums.md](reference/checksums.md) publishes SHA-256 checksums and provenance instead,
so you can obtain the files yourself and confirm you have the identical ones.

Binaries live in a private `lab` directory beside this checkout, which the tooling finds
automatically. Tests skip cleanly when it is absent, and `make test-nolab` is what enforces that.
`.githooks/pre-commit` checks staged content, so a rename or a `git add -f` gets caught anyway;
install it with `make hooks`, once per clone.

## Layout

```
docs/                the specification, the plan and the evidence, per "Start here" above
src/harmony/         the research library: one shared PIC18 decoder, plus the format readers
packages/            TypeScript: codec, usb, corpus, probe, lab, bench
tools/               command line wrappers around the library, no logic of their own
tests/               one regression test per documented finding
reference/           checksums and provenance, model and capability tables, button drawings
```

There is one instruction decoder, in `src/harmony/pic18/isa.py`, and that is enforced rather than
conventional: an earlier version of this work carried a copy of the opcode table in each tool and two
of the copies disagreed with the datasheet, which produced listings that were readable and wrong. The
same rule now applies to the codec, after `emit.ts` and `edit.ts` were each found deriving one field
independently and both getting it right, which is the state that precedes two diverging copies.

## Quickstart

Python 3 and nothing else for the analysis side, Node 24 for the TypeScript packages. Both need a
firmware image or a config, which are not in this repository:
[reference/checksums.md](reference/checksums.md) says how to obtain and verify one.

```sh
python3 tools/ezextract.py harmony_700_firmware_2_8.hfw --out ./work   # unwrap a .hfw
python3 tools/gspm_parse.py work/Region_3.EZHex                        # parse a config container
python3 tools/pic18_disasm.py work/Region_2.EZUpgrade 0x9000 0x194a4 30 # disassemble, with SFR names
python3 tools/pic18_trace.py work/Region_2.EZUpgrade 0x9000 0x3BF      # every access to a variable

make test lint prose ts    # the suites, the document conventions, the TypeScript packages
make all                   # everything except Ghidra and the bench instrument
make corpus coverage text   # what the lab holds, the byte accounting, the readable text
```

`pic18_trace.py` is the highest value one: the entire infrared chain came out of pointing it at three
variables. Starting on a model nobody has looked at yet, find its load address first, because a
disassembler given the wrong base produces a plausible listing rather than an obvious failure:

```python
from harmony.pic18 import loadaddr
best, ranked = loadaddr.find_base(open('image.bin', 'rb').read())
print(best)            # check the margin over ranked[1] before trusting it
```

Every npm dependency is pinned to an exact version, no `^` and no `~`, and `pnpm-lock.yaml` is
committed, so a dependency update is a diff someone has to approve rather than a decision made by
whoever published last. The test runner is Node's own: `vitest` was rejected for bringing 71 packages
including a CSS toolchain.

## Provenance

**The analysis and tools here were produced by Claude (Anthropic's AI)**, working from concordance
dumps, archived Logitech firmware packages, configs other people published, and four remotes on the
bench read over USB by this project's own code. No insider information, and nothing has ever been
written to a remote.

So claims are expected to be checkable, and they are written to be. Every confirmed fact lands in four
places at once: the structured fact in [docs/config-format.md](docs/config-format.md), the reasoning and
the evidence in [docs/findings.md](docs/findings.md), a regression test, and a sweep of everything that
summarised the old answer. A claim that is not executable is only an assertion.

**Corrections are recorded in place rather than quietly fixed**, so the rest can be calibrated against
them. Forty six so far, all in [docs/findings.md](docs/findings.md). The instructive ones are collected
there: a field split that produced nonsense which the analysis then explained away instead of
suspecting, a derivation rule that was wrong and still gave the right answer on the only sample that
exercised it, and a register map that was assumed to be the generic PIC18 layout when eight of 93 names
differ. [reference/superseded.md](reference/superseded.md) lists the dead wordings and `make facts`
refuses them anywhere outside a correction.

The item most worth verifying before relying on it: the arch 12 part number is inferred rather than read
off a board.

## Licence

MIT, see [LICENSE](LICENSE). That covers everything in this repository: the tools, the
documents and the derived data.

It does **not** cover the Logitech firmware and config binaries the tools operate on. Those
are not here and are not ours to license. Obtaining them is your affair, and
[reference/checksums.md](reference/checksums.md) says where they came from.

## Safety

**Do not write to, erase, or flash a remote.** These devices are irreplaceable. Note that patching a
concordance architecture constant to fix the firmware dump also redirects `erase_firmware()` and
`write_firmware_to_remote(direct=1)`, so a patched build must be treated as read-only.

This used to add "and Logitech's recovery servers are gone", which is wrong, and the rail stands
anyway: a service that answers today can be withdrawn tomorrow, and it has not been shown to
compile a config any more. See section 56 of [findings.md](docs/findings.md).
