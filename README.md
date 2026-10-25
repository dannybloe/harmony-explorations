# harmony-explorations

Logitech's Harmony remotes were among the best universal remotes ever made. You told Logitech's software
which equipment you had and what you wanted to watch or listen to, and the remote did the rest: it
switched everything on, picked the right inputs and sent each button to the device that needed it.

The remote does all of that by itself, but changing what is on it has always gone through Logitech.
Logitech stopped making Harmony remotes a couple of years ago and has been closing down the services
behind them since. The original desktop software stopped working in May 2025, and the MyHarmony service that still
programs the newer models could go the same way at any moment. When it does, a remote keeps doing what it
did the day it was last synced, and nobody can add a device or change an activity on it again.

This project sets out to learn everything there is to know about these remotes, so that they can be
programmed without any Logitech service at all: what the configuration file on the remote holds, what the
firmware does with it, how a computer talks to the remote over USB and how the infrared codes are built.
What we learn goes into [FreeHarmony](https://github.com/dannybloe/FreeHarmony), a program for your own
computer that reads the configuration off your remote, lets you change your devices and activities and
writes it back. No account and no server, so nothing that can be switched off. It is early days and there
is nothing to install yet.

## The reference

Everything we have found out is collected in
[How a Harmony works](https://dannybloe.github.io/harmony-explorations/): what the remotes do, each model
in depth, and the configuration file, the USB protocol and the infrared codes. Each fact says how we know
it, whether it was read in the firmware, measured on a remote or taken from Logitech.

It is a work in progress and some of it will turn out to be wrong. Much of the analysis was done with the
help of an AI, which is why every conclusion is backed by a test that fails when it stops being true, and
why mistakes are corrected in the open rather than quietly.

## Where we are

These remotes are on the bench: the Harmony One, 300, 350, 525, 600, 650, 700 and Touch.

* On the Harmony One, 600, 650 and 700 we can read the configuration and account for every byte of it, and
  each of them has run a configuration we built ourselves from scratch, without copying anything from a
  Logitech file.
* The Harmony 525 can be read completely, and we have written its own configuration back to it. Logitech
  no longer builds configurations for this model at all.
* The Harmony 300, 350 and Touch use a different protocol, and so far we only read them. The 350 and 300
  are what we work on next.
* The Harmony 880, 885, 890 and 895 we know from configurations other people sent in.

## Sending us your configuration

Every configuration helps, whatever the model. Each one shows how Logitech's software set up a remote
with devices and activities we have never configured ourselves, and that is exactly what we learn from.

Read the configuration off your remote with concordance, as described under backing up below. Then open an
issue telling us which model you have and what is set up on it, and we will arrange a private way to send
the file. Please don't attach it to the issue: this repository is public and a configuration can't be
published here. A configuration holds the devices and activities you set up, and no account details.

Issues are also welcome when something in the reference doesn't match what your own remote does.

## Backing up your own remote

If you own a Harmony, back up its configuration now, whatever happens to this project: a remote that
loses it can't be given a new one. [concordance](https://github.com/jaymzh/concordance) is an existing
command line tool that reads it off:

```sh
concordance -c my-remote-config.EZHex     # the configuration
concordance -f my-remote-firmware.bin     # the firmware, on older models only
```

The firmware read works on the older models, such as the Harmony 880, 885 and the 520 and 525 family.
On a Harmony One, 600, 650 or 700 it returns no usable firmware because of two entries in concordance's
own list of remotes, so there the configuration is what to keep,
[docs/concordance-notes.md](docs/concordance-notes.md).

Use lower case flags only. `-c` reads the configuration and `-C` writes one to the remote, `-f` reads the
firmware and `-F` overwrites it. A missed shift key is the difference between a backup and a reflash, and
a filename without any flag lets concordance decide for itself, which for a configuration means writing
it.

## Licence

MIT, see [LICENSE](LICENSE). Logitech and Harmony are trademarks of Logitech International S.A., used
here only to say which hardware this is about. This project is not affiliated with Logitech.
