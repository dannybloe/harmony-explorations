---
name: probe-remote
description: Measure a connected Harmony remote read only, to check an image-derived claim against hardware. Use when a remote is plugged in, when asked to read a remote's descriptors or identity, when a firmware image claim needs confirming on the bench, before believing anything about USB enumeration on this machine, or **before sending any experimental packet to a remote in order to learn a format rather than to check one**, which is a gate this skill holds and which cost six rounds of hardware on 28 August 2026.
---

# Measuring a connected remote

The project is read only, and these remotes are irreplaceable. So a hardware measurement is worth
having and is also the easiest place to do permanent damage. This skill is the ritual that separates
the two.

Logitech's live service being alive changes none of this, since a remote is still irreplaceable and the
service can go at any time; this line once said the recovery servers were gone, which confused the live
service with the discontinued classic one, section 56 and `reference/logitech/service.md`.

## Stop before you experiment: is the answer written down somewhere already

**The gate this skill exists to hold, and it is not the rails.** Read this before sending a packet whose
purpose is to *learn* something rather than to *check* something.

If you are about to send bytes to a remote, or to derive anything at all, in order to work out a
format, a framing, a command number, a field layout or which call to make, **stop and read Logitech's
own client and the firmware.** That is decision 2, and both halves are meant: the firmware is as
important as the client and often more, and the client's advantage is that it is cheap and legible, so
it is the fastest way to find out whether an answer exists at all. The list below is the order to open
them in, not a ranking of what to believe:

1. **Logitech's own client**, mirrored in the lab. It **builds** the packets, so the framing is code
   rather than inference. **MyHarmony is the reference client**, `work/myharmony/xap/`, and for how a
   remote is driven or which service call to make it is the only one to read, per decision 2 and
   `reference/logitech/clients.md`. Harmony Desktop's mirror is the source for
   exactly two things and they are the ones nothing else holds: the file family's per skin templates
   under `software/desktop-webapp/mirror/*/opt/desktop-app-scripts/libs/ds/templates/SKIN<n>/`, and the
   parameter encoders in `en.desktop-app-main.js`. A fact resting on the client alone carries "Stated by
   Logitech, in their client" in its reference footnote, and a search for those words is the ledger.
2. **The firmware**, which is the authority when the two disagree. Where to look per architecture is that
   architecture's `memory.md` and `firmware.md` under `reference/architectures/`, and what each command
   does is `reference/usb-protocol/`.
3. **`reference/`** for what is already established, and **`docs/findings.md`**, the frozen archive, by
   grep rather than by memory for the argument behind it.

Then write down which of the three you checked, in the finding or in the commit. **The absence of that
line is the signal**, because nothing can test that somebody failed to look somewhere.

**Why this is a gate and not advice.** On 28 August 2026 a session spent six rounds of hardware guessing
the parameter framing of the file protocol, got a refusal every time, and had to be told to look at
the client. The answer was one function, `molsonparamwriter.getBytes`, and it had been in the
lab since 9 August. Both guesses tried against the remote were wrong and neither was close. Section 200.

**The failure mode is momentum, not ignorance.** The rule already existed, as decision 12, and it reads
as something you do at the **start** of a topic. The moment that matters is in the middle: the protocol
is half working, a request comes back refused, and the remote is the thing in your hands. That is when
this section applies, and it is exactly when nobody thinks to read a skill. So the trigger is the
**act**, not the subject: sending an experimental packet is the trigger, whatever you were doing before.

**A remote is the most expensive instrument here and the least informative per attempt.** A refusal tells
you one bit. A source tells you the rule. And an experiment can cost the session, or worse: section 200's
near miss is the same day's other lesson, where a filename turned out to be a verb.

## Which remotes this library can open at all

`openHarmony` refuses three families on purpose: the **file based** remotes (Harmony Touch, 300 and
350), the **tunnelled** ones (the Harmony 890 platform), and a remote sitting in its **bootloader**.
The argument for each refusal is in `docs/README.md` under "Where things go", and it is about this
library, so it stays there. What each family speaks is the reference's: the file protocol and why a path
on it can be an action, `reference/usb-protocol/file-protocol.md`; the tunnelled transport,
`reference/architectures/harmony-890-895/usb.md`; the bootloader, `reference/usb-protocol/bootloader.md`.
Read both before widening any of those refusals.

## The rails

**Never write, never erase, never reset.** See "Never write to a remote" in `CLAUDE.md`. That one is
absolute and is enforced in `packages/usb/src/rails.ts` rather than here.

**Prefer enumeration.** Anything that only needs to know what is attached, or what the descriptors
say, must not open the device. libusb caches configuration, interface and endpoint descriptors during
enumeration, so all of them are readable without an open handle and without a single transfer
reaching the remote. `listHarmony`, `packages/usb/bin/list-remotes.ts` and `tools/usbprobe.py` are
that path and must never grow one that sends a command.

**Read commands are allowed, through the library.** This section used to say never send a command at
all, on the grounds that the command layer was unverified against hardware. It is verified now:
`GET_VERSION`, `READ_MISC` and `READ_FLASH` have run on every model this library opens, the Harmony One,
525, 600, 650 and 700, and a flash read matches each unit's own dump byte for byte. A stale rail is worse
than no rail, because the first person to need the forbidden thing learns to ignore the document. So the
rule is the narrower one it should always have been:

* Go through `packages/usb`, never a one off script that opens the device itself. The refusals live
  there.
* **Never ask for an odd count on an internal memory read.** It hangs the remote, and even a read that
  returns has overwritten 2247 bytes of its memory; the mechanism is
  `reference/usb-protocol/commands.md`, "The odd count hazard". `readInternalMemory` refuses odd counts
  and nothing else. **There is no length cap and this said there was one**, "refuses more than 62
  bytes",<!--superseded--> until two earlier refusals turned out to be bounds around the hazard rather
  than the hazard, the second of which would have let 65 and 127 hang a remote, sections 94 and 96.
* **`HARMONY_ODD_READ_EXPERIMENT=1` is the only way past that refusal**, a named door in `rails.ts`.
  The refusal was bypassed twice by patching `remote.ts` and patching it back, and a rail edited under
  time pressure with nothing in the tests to say so is worse than a door that announces itself.
* Health check between provocations: read something with a known answer, usually a config window
  against the lab dump, and stop at the first failure to recover.
* One remote at a time, and identify which one before trusting any per unit number. Three Harmony Ones
  are on the bench, and the Harmony 600 and 650 report the same product id and architecture, so units
  that enumerate alike are not interchangeable; the identity block tells them apart.

## What a bench session does to a remote

What to expect, so that it is not re-derived: each of these cost a round of hardware. The facts are the
reference's, `reference/remotes/harmony-one/behaviour.md` "On the cable", and the history is
`docs/test-notes/harmony-one.md` "Stranding".

* **A clean read only session leaves a remote normally**, so a session needs to send nothing at the end.
  USB mode is left on the cable's removal while the command state is zero, and a completed read clears
  its own state.
* **A hang ends in a genuine device reset**: the remote reboots, its data memory and clock are reset,
  and its configuration is intact. So nothing a hang corrupts survives it.
* **The escape's `0x01` ends a session and is not a reset; `0x02` restarts the remote**,
  `reference/usb-protocol/commands.md`. `packages/usb/bin/end-session-experiment.ts` sends the first,
  is gated by `assertSessionEndAllowed`, and is deliberately unrun because the controls made it
  unnecessary.
* **A Harmony One left idle in USB mode can drop its first command**, and a retry answers in full.
  `getVersion` resends once when a remote that has never spoken says nothing, and that bounded retry is
  the only one: everything after the first command stays strict.
* **What strands a remote until its battery comes out is unexplained, and it is parked.** Expect it, a
  battery pull clears it, and nothing here knows why. What reopens it is another occurrence, nothing
  else, and **do not re-derive the dead leads**, which the test notes list.

**Two things to capture if a stranding happens**, because the two occurrences that needed a battery pull
lost both: how many commands this session had sent, and whether the screen still said USB mode before
anything was unplugged. `packages/usb/bin/session-end-control.ts` is the instrument for a control round.

## What works on this machine, and what silently does not

* **`system_profiler SPUSBDataType` produces nothing at all here**, not even for unrelated
  devices, because of the sandbox. It exits 0 with empty output, so a script that greps it for
  a device concludes "not connected" and is believed. This already produced one false negative
  in this project: a six minute watcher reported no remote while the remote was plugged in.
  **Do not use it, and do not poll it.**
* **`ioreg` works.** For identity, one command:

  ```sh
  ioreg -rc IOUSBHostDevice -w0 | grep -E '"(idVendor|idProduct|bcdDevice|USB Product Name)"'
  ```

  For the HID report descriptor of a specific device, pick the block out by product id:

  ```sh
  ioreg -rc IOHIDInterface -w0 | awk 'BEGIN{RS="\\+-o "} /"ProductID" = 49442/ {print}'
  ```

  `ioreg` reports `bcdDevice` in decimal, so convert: 4209 is `0x1071`.
* **Endpoints need pyusb**, since `ioreg` does not report them. It lives in the private lab so
  it is not a dependency of anything here:

  ```sh
  python3 -m venv ../lab/work/venv && ../lab/work/venv/bin/pip install pyusb
  ../lab/work/venv/bin/python tools/usbprobe.py
  ```

  `tools/usbprobe.py` is the read-only probe. Extend that rather than writing a new script, and
  keep its no-open property intact.
* To wait for a device to appear, poll `ioreg`, never `system_profiler`:

  ```sh
  until ioreg -rc IOUSBHostDevice -w0 | grep -q '"idVendor" = 1133'; do sleep 3; done
  ```

## Method

1. **Write the prediction down first**, and commit it, before looking. A measurement that
   confirms a number nobody committed to in advance is worth much less. The `bcdDevice 0x1071`
   result was worth having precisely because the prediction was already published.
2. Measure with the commands above. Record the raw values, not just the interpretation.
3. **Compare field by field against the image**, and say which fields agree rather than
   "it matches". A summary hides the one field that did not.
4. Ask what the measurement settles that the images could not. The endpoint numbers and the
   600's skin were unobtainable from the 600's first dump, which was truncated before its
   descriptor block, so they had rested on a remote nobody here owns until the unit answered.

## Where the result lands

Follow the `finding` skill for the write-up, plus three things specific to hardware:

* **Pin the measured bytes in a test**, so the image and the device cannot drift apart
  silently. `tests/test_usbdesc.py` holds the Harmony 600's live report descriptor this way.
  A hardware measurement that is not executable is just a note.
* **Say it was hardware.** Every hardware-derived number in `reference/` carries a footnote whose
  evidence words are "Measured on a unit.", per the footnote convention in `reference/README.md`,
  and a number read off the image says "Read in the firmware." instead.
* **Keep the unit out of the reference.** The reference states what the model does; which unit was
  read, what was sent to it and in which session goes to that model's `docs/test-notes/` file. The
  argument for a new measurement lives in the header of the test that pins it, footnoted `[^t-name]`,
  since `docs/findings.md` is a frozen archive and takes nothing new. Write the prediction down in
  `docs/predictions/` or the test notes before the read.

## Things that are cheap while a remote is connected

Ask before assuming there will be another chance; a remote goes back in a drawer.

* Identity and descriptors, per above.
* A config read compared against that unit's lab dump, which is the cheapest proof the whole read
  path still works.
* Anything read only that a document has predicted in advance. Writing the prediction down and
  committing it first costs one commit and is what makes the answer worth having.
