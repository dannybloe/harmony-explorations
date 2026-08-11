# harmony-explorations

Collecting everything needed to program a Logitech Harmony remote again, without Logitech.

## The problem

On 28 May 2025 Logitech discontinued the Harmony Remote Software, the desktop program that 40 of
these remotes were set up with. `members.harmonyremote.com` now serves a discontinuation notice and
nothing else. `reference/models.md` lists the models it covered.

The newer service, MyHarmony, does still answer, and in August 2026 it still compiled a config and
synced it to a remote on this bench. That is worth being accurate about, because this project has
twice written it off on paper and been wrong. But it is a hosted service nobody here controls, it can
be switched off without notice, and it does not cover the older models at all.

So the position today is simple. A config already on a remote can be read off it. **Nobody outside
Logitech can generate a new one.** That is the thing to fix.

## Where this is going

[FreeHarmony](https://github.com/dannybloe/FreeHarmony): a local, cross platform application that
reads the config off your remote, lets you edit its devices and activities, learns infrared codes
from your old remotes, and writes it back. Nothing hosted, nothing to switch off. Version 1 will be
read only, because the first write to an irreplaceable device should not be a guess.

That application does not exist yet, and it cannot be built until the config format is understood.

## What this repository is for

**Collecting the knowledge and the code that FreeHarmony will be built on.** Two kinds of thing, kept
together on purpose:

* the **documents**, which work out what every byte of a config means and why anyone should believe it
* the **libraries** that read a remote and parse a config, which are those documents in executable
  form, so a finding cannot land in a document and quietly never reach the code

The route is generating config files, never modifying firmware. A config is a program in a data
format and the firmware is its interpreter, so the firmware is the authoritative specification for
every config field. Nothing has ever been written to a remote here.

This repository is MIT. FreeHarmony is AGPL-3.0 and consumes these libraries.

## Progress and findings

| | |
|---|---|
| [docs/status.md](docs/status.md) | **where the work stands**: what reads today, and what the corpus of dumps holds |
| [docs/findings.md](docs/findings.md) | every finding, numbered, with its evidence and its corrections |
| [docs/config-format.md](docs/config-format.md) | the format as a specification, with anything unconfirmed marked as such |
| [docs/roadmap.md](docs/roadmap.md) | the plan: what gets answered next, and why that one |

Five architectures are covered and six are not. The analysis was produced by an AI and is published as
such, so every claim is written to be checkable: a confirmed fact lands as a structured spec entry, a
written argument, and a regression test, and mistakes are corrected in place rather than quietly, so
the rest can be calibrated against them.

## Contribute: send a dump of your remote

**This is the bottleneck.** Almost every open question here is open because nobody involved owns the
remote that would answer it. One config off a model nobody has seen is worth more than another week of
reading the firmware we already have.

Most wanted right now:

* **a Harmony 890 or 895 firmware dump.** Two 890 configs are here and cannot be read, and no firmware
  exists to settle them. This is the hardest blocker in the project.
* **anything at all from a 610, 620, 628, 659, 670, 676, 680 or 688.** Eight models, no sample.
* also unseen: the 745, the 748, the 768, the 720, the 785, and any 55x.

[docs/status.md](docs/status.md#what-the-corpus-holds) has the full table of what is covered.

### How

[concordance](https://github.com/jaymzh/concordance) is the tool. Install it, plug the remote in with
its USB cable, and run these where you want the files:

```sh
concordance -c                              # the config. Writes config.EZHex
concordance -i > harmony-600-info.txt       # what the remote says it is. Prints to the screen, so
                                            # redirect it, and end the name in -info.txt
concordance -b -f                           # the firmware. Writes firmware.bin. Only worth it on the
                                            # models listed below
```

**Then email the files to freeharmony@bloemeland.nl, and say which model they came off.** Anything you
remember about what was set up on it is worth having too: a description is what lets a structure in the
file be matched to something in the world, and it is much harder to reconstruct later.

Please do not attach a dump to an issue or a discussion. This repository is public, and a config is
Logitech generated data including an infrared database compiled from Logitech's own, so it cannot be
published here. That is also why no firmware or config is in this repository. Issues and discussions
are very welcome for everything else.

**Lower case flags only.** `-c` reads the config off the remote and `-C` writes one to it; `-f` reads
the firmware and `-F` overwrites it. The flag you want and the flag that reflashes your remote differ
by one shift key. `-r` reboots it. And never pass a bare filename: `concordance somefile` works out
for itself what the file is for, and for a config that means writing it to the remote.

**The firmware dump only works on some models.** On the 51x, 52x, 55x, 720, 785, 880, 882 and 885 it
returns the complete firmware. On the One, 600, 650 and 700 it returns something that is not usable
firmware, which is a defect in concordance's architecture table rather than a problem with your remote.
Nobody knows which it does on an 890 or an 895, so if you have one, running it is itself useful. It is
a read command either way.

**What is in the files, so you can decide.** A config holds an equipment inventory and the device and
activity names you chose, and no account data; that was checked rather than assumed. The `-i` output
holds your remote's serial number and unique identifiers. Firmware is Logitech's own code and holds
nothing of yours. Nothing you send is published or committed anywhere, and if you would rather not
send the serial number, leave the `-i` output out and just say the model.

## Working on the code

Python 3 for the analysis, Node 24 for the TypeScript packages. Neither needs anything else installed:
every dependency is pinned to an exact version and the test runner is Node's own.

```sh
make all        # the suites, the document checks and the TypeScript packages
make corpus     # what the local collection of dumps holds
make coverage   # the byte accounting: how much of each config is understood
```

Firmware images and configs are not in this repository, so the tests that need them skip cleanly
without them. [reference/checksums.md](reference/checksums.md) says how to obtain and verify the files
yourself. `CLAUDE.md` is the working brief and documents the layout and the conventions in full.

## Safety

These remotes are irreplaceable and this project treats them that way. Read paths only: writing is
behind a flag that is off, the rails are enforced in the library rather than in a user interface, and
no write has ever been performed. If you are experimenting with your own remote, take a full dump
first and keep it.

## Licence

MIT, see [LICENSE](LICENSE). Logitech, Harmony and the model names are trademarks of Logitech
International S.A., used here only to identify the hardware. This project is not affiliated with
Logitech.
