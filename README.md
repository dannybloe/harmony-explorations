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

It does not exist yet, and it cannot be written until the file a remote stores is properly understood.
Working that out is what this repository is for: the understanding, and the code that does the reading.

**The first version will only read, never write.** These remotes cannot be bought new and a bad write
can turn one into a brick, so the first thing this project ever writes to a remote will not be a guess.

## Where we stand

Four remotes are on the bench, a Harmony One, a second One kept as a spare, a Harmony 600 and a Harmony
525, plus configuration files that other owners have sent in.

| | |
|---|---|
| Read the whole configuration off a remote | **Works.** What comes off matches a backup of that unit byte for byte |
| Work out what is in it | **Done** for every configuration file in the collection, to the last byte |
| List your devices and activities, with their names | **Works.** The names are recovered from the pictures the remote draws on its own screen, because that is the only place it keeps them |
| Take a configuration apart and rebuild it identically | **Works.** This is the test that has to pass before it is safe to change anything |
| Change something and write it back | **Not yet.** The next big step, and deliberately switched off |
| Learn a code from an old remote | Understood in principle, not built |

**Nothing has ever been written to any remote here.** Reading is all that has happened, and the code
refuses to write unless somebody deliberately turns that on.

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

If you do read your own remote with [concordance](https://github.com/jaymzh/concordance), one warning is
worth more than the rest: **use lower case flags only.** `-c` reads the configuration off the remote and
`-C` writes one to it, `-f` reads the firmware and `-F` overwrites it, so the flag you want and the flag
that reflashes your remote differ by one shift key.

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
