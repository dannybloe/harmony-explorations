# harmony-explorations

**Logitech switched off the software that programmed these remotes. This project is working out how to
program them without it.**

## Everything we know: the reference

**[How a Harmony works](https://dannybloe.github.io/harmony-explorations/)** is the primary source of
information here: what the remotes do, each model in depth, its keys, screen, memory, firmware and USB
protocol, and how the configuration file and the infrared codes work. Every fact says how it is known,
whether read in the firmware, measured on a remote or stated by Logitech.

It is work in progress and not guaranteed to be correct. It was produced with an AI and is published as
such, so it is written to be checked rather than trusted: each conclusion carries a test that fails if it
stops being true, and mistakes are corrected in the open, where they happened, so the rest can be judged
against them.

## If you came here looking for a replacement

On 28 May 2025 Logitech discontinued the Harmony Remote Software, the desktop program that 40 of these
remotes were set up with. A remote that already works keeps working, because everything it needs is
stored inside it. What you can no longer do is **change** it: add a device, rename an activity, teach it
a button off an old remote. There is nothing left to do that with.

The newer service, MyHarmony, is still running and still programmes the remotes it supports. It does not
cover the older models at all, and it is somebody else's server, so how long it stays up is not up to you.

## What we are trying to build

[FreeHarmony](https://github.com/dannybloe/FreeHarmony): a program on your own computer that reads the
configuration off your remote, lets you change your devices and activities, learns codes from your old
remotes, and writes it back. Nothing hosted, nothing that can be switched off later. It has begun and there
is nothing to install yet; this repository holds the understanding and the code underneath it.

**The first version will only read, never write.** These remotes cannot be bought new and a bad write can
turn one into a brick, so writing stays switched off in the application until the way back from a mistake
is proven.

## Where we stand

On the bench: the Harmony One, 300, 350, 525, 600, 650, 700 and Touch.

* **Harmony One, 600, 650 and 700**: a configuration is read off the remote and taken apart to the last
  byte, and each of the four has run a configuration built entirely here, with nothing copied out of a
  Logitech file, written to a test remote and used.
* **Harmony 525**: read in full, and written to once with its own configuration put back unchanged. Nothing
  can compile a configuration for it, Logitech included.
* **Harmony 300, 350 and Touch**: they speak a different protocol and are read only. The 350 and the 300
  are next.
* **Harmony 880, 885, 890 and 895**: known from configurations people sent in; a Harmony 885 is on its way.

## Contributing a configuration

**Every configuration helps, of any model.** Each one is another sample of how Logitech's software built
a file, with devices and activities nobody here has set up, and that is what this work learns from.

1. Read the configuration off your remote with concordance, as under [backing up](#backing-up-your-own-remote)
   below. The firmware read is welcome too on the older models where it works.
2. **Open an issue saying which model you have**, and what is set up on it: the devices, the activities
   and anything you changed by hand. That description is what makes a file useful.
3. **Do not attach the file to the issue.** This repository is public and a configuration cannot be
   published in it, so the transfer is arranged privately from there.

A configuration carries the devices and activities you set up and no account details. Issues are welcome
for anything else too, especially a reading on the reference that disagrees with what your own remote does.

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

## Licence

MIT, see [LICENSE](LICENSE). Logitech and Harmony are trademarks of Logitech International S.A., used
here only to say which hardware this is about. This project is not affiliated with Logitech.
