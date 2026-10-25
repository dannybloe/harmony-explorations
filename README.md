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

It has begun and there is nothing to install yet. It cannot be finished until the file a remote stores
is properly understood, and working that out is what this repository is for: the understanding, and the
code that reads, changes and writes that file.

**The first version will only read, never write.** These remotes cannot be bought new and a bad write
can turn one into a brick, so writing stays switched off in the application until the way back from a
mistake is proven.

## Where we stand

A configuration can be read off a Harmony One, 525, 600, 650 or 700, taken apart to the last byte, changed
on the computer and put back together, and configurations built here have been written to this project's
own test remotes, never to anybody else's. The Harmony Touch, 350 and 300 speak a different protocol and
are only partly reachable. [docs/status.md](docs/status.md) has the detail and the numbers, and
[todo.md](todo.md) what comes next.

## The details, for anyone who wants them

| | |
|---|---|
| [reference/README.md](reference/README.md) | how a Harmony works and everything known about each model, its memory, its USB protocol and its configuration file, every fact marked with the kind of evidence behind it |
| [docs/findings.md](docs/findings.md) | the archive of numbered findings that the reference's footnotes point into, with the evidence for each |
| [docs/status.md](docs/status.md) | where the work stands |
| [todo.md](todo.md) | the plan |

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
concordance -f my-remote-firmware.bin     # the firmware, on older models only
```

The firmware read is complete on the older models, such as the Harmony 880, 885 and the 520 and 525
family. On a Harmony One, 600, 650 or 700 it returns no usable firmware, because of two entries in
concordance's own table of remotes, so the configuration is the part worth keeping there,
[docs/concordance-notes.md](docs/concordance-notes.md).

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
