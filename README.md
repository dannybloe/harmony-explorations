# harmony-explorations

**Logitech switched off the software that programmed these remotes. This project is working out how to
program them without it.**

## If you came here looking for a replacement

On 28 May 2025 Logitech discontinued the Harmony Remote Software, the desktop program that 40 of these
remotes were set up with. A remote that already works keeps working, because everything it needs is
stored inside it. What you can no longer do is **change** it: add a device, rename an activity, teach it
a button off an old remote. There is nothing left to do that with.

The newer service, MyHarmony, is still running as of August 2026 and still programmes the remotes it
supports. It does not cover the older models at all, and it is somebody else's server, so how long it
stays up is not up to you.

So the position is simple. The configuration sitting on your remote can be read off it. Nobody outside
Logitech can make a new one.

## What we are trying to build

[FreeHarmony](https://github.com/dannybloe/FreeHarmony): a program on your own computer that reads the
configuration off your remote, lets you change your devices and activities, learns codes from your old
remotes, and writes it back. Nothing hosted, nothing that can be switched off later.

It has begun and there is nothing to install yet. As of 25 August 2026 it is a desktop application
taking shape: it opens, keeps your remotes in one place, and reads a configuration file into the
devices and activities it holds, so the seam between the two repositories is proven by something
that runs. Everything else about it is still ahead, and it cannot be
written until the file a remote stores is properly understood. Working that out is what this repository is
for: the understanding, and the code that does the reading.

**The first version will only read, never write.** These remotes cannot be bought new and a bad write
can turn one into a brick, so the first thing this project ever writes to a remote will not be a guess.

## Where we stand

Seven remotes are on the bench: a Harmony One, a second One kept as a spare, a Harmony 600, a Harmony
525, and a Harmony Touch, a Harmony 350 and a Harmony 300 added later, plus configuration files that
other owners have sent in. The work so far is about the first four; the other three speak a different
protocol and are only partly reachable.

| | |
|---|---|
| Read the whole configuration off a remote | **Works.** What comes off matches a backup of that unit byte for byte |
| Work out what is in it | **Done** to the last byte for the four remote families the tools cover, and nearly so for the fifth |
| List your devices and activities, with their names | **Works.** The names are recovered from the pictures the remote draws on its own screen, because that is the only place it keeps them |
| Take a configuration apart and rebuild it identically | **Works.** This is the test that has to pass before it is safe to change anything |
| Change a configuration on the computer | **Works.** Small edits, bigger ones that move everything after them, and adding a whole device from Logitech's catalogue, whose infrared comes out byte for byte what Logitech's own service would have written |
| Write it back to the remote | **Started.** A remote's own settings have been written back to it unchanged, which proves the mechanism without risking anything. Writing something you actually changed is the next step, and it stays switched off until the way back from a mistake is proven |
| Learn a code from an old remote | Half built: turning a known code into pulses works and is checked against Logitech's own compiler; capturing one from a real remote is read but not built |

**One write has been performed here, and it changed nothing.** On 30 August 2026 a small part of a
spare remote's own settings was erased and written straight back, unchanged, and the remote afterwards
was exactly as it started. Everything else that has ever happened here is reading, and the code
refuses to write at all unless somebody deliberately turns that on.

## The details, for anyone who wants them

| | |
|---|---|
| [docs/status.md](docs/status.md) | where the work stands today |
| [docs/findings.md](docs/findings.md) | every finding, numbered, with the evidence for it |
| [docs/config-format.md](docs/config-format.md) | the file format written up as a specification |
| [docs/roadmap.md](docs/roadmap.md) | the plan, and the decisions behind it |

The analysis was produced by an AI and is published as such, so all of it is written to be checked
rather than trusted: every conclusion carries a test that fails if it stops being true, and the mistakes
are corrected in the open, where they happened, so the rest can be judged against them.

## Contributing

**Configuration files are not being collected at the moment.** More files would answer questions about
models nobody here owns, and the thing that matters next is getting FreeHarmony working on the remotes
that are already here. When there is an application for the files to be useful to, that changes.

Issues and discussions are very welcome for anything else, especially a reading here that disagrees with
what your own remote does. Please do not attach a configuration or a firmware file to an issue: this
repository is public and neither can be published in it.

## Backing up your own remote

Worth doing now, whatever happens to this project, because a remote that loses its configuration cannot
be given a new one. [concordance](https://github.com/jaymzh/concordance) is an existing command line
tool that reads one off:

```sh
concordance -c my-remote-config.EZHex     # the configuration
concordance -f my-remote-firmware.bin     # the firmware
```

One warning is worth more than all the rest: **use lower case flags only.** `-c` reads the configuration
off the remote and `-C` writes one to it, `-f` reads the firmware and `-F` overwrites it. The flag you
want and the flag that reflashes your remote differ by one shift key, and a bare filename with no flag at
all makes concordance decide for itself, which for a configuration means writing it.

## Working on the code

Python 3 for the analysis, Node 24 for the rest. Nothing else has to be installed.

```sh
make all        # the test suites and the document checks
make coverage   # how much of each configuration file is understood
```

Configuration and firmware files are not in this repository, so the tests that need them skip without
them. `CLAUDE.md` is the working brief and describes the layout and the conventions in full.

## Licence

MIT, see [LICENSE](LICENSE). Logitech and Harmony are trademarks of Logitech International S.A., used
here only to say which hardware this is about. This project is not affiliated with Logitech.
