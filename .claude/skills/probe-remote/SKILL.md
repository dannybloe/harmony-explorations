---
name: probe-remote
description: Measure a connected Harmony remote read only, to check an image-derived claim against hardware. Use when a remote is plugged in, when asked to read a remote's descriptors or identity, when a firmware image claim needs confirming on the bench, or before believing anything about USB enumeration on this machine.
---

# Measuring a connected remote

The project is read only, and these remotes are irreplaceable. So a hardware measurement is worth
having and is also the easiest place to do permanent damage. This skill is the ritual that separates
the two.

This used to add "with Logitech's recovery servers gone", which is wrong: the MyHarmony service was
measured alive on 7 August 2026 and the owner can sign in and read a remote through it. The classic
`members.harmonyremote.com` service is the one that is discontinued. Nothing about the rails
changes, because a remote is still irreplaceable, the service can go at any time, and it has not
been shown to compile a config any more. See `docs/findings.md` section 56.

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
`GET_VERSION`, `READ_MISC` and `READ_FLASH` have run on both bench remotes and a flash read matches
each unit's own dump byte for byte. A stale rail is worse than no rail, because the first person to
need the forbidden thing learns to ignore the document. So the rule is the narrower one it should
always have been:

* Go through `packages/usb`, never a one off script that opens the device itself. The refusals live
  there.
* **Cap an internal memory read at one chunk.** A transfer of this region that ends in a one byte
  final chunk restarts the remote. `readInternalMemory` refuses more than 62 bytes for that reason.
* Health check between provocations: read something with a known answer, usually a config window
  against the lab dump, and stop at the first failure to recover.
* One remote at a time, and identify which one before trusting any per unit number. Two Harmony Ones
  are on the bench and they are not interchangeable.

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

1. **Write the prediction down first**, in the document, before looking. A measurement that
   confirms a number nobody committed to in advance is worth much less. The `bcdDevice 0x1071`
   result was worth having precisely because the prediction was already published.
2. Measure with the commands above. Record the raw values, not just the interpretation.
3. **Compare field by field against the image**, and say which fields agree rather than
   "it matches". A summary hides the one field that did not.
4. Ask what the measurement settles that the images could not. The endpoint numbers and the
   600's skin were unobtainable from the 600's own dump, which is truncated before its
   descriptor block, so they had rested on a remote nobody here owns.

## Where the result lands

Follow the `finding` skill for the write-up, plus three things specific to hardware:

* **Pin the measured bytes in a test**, so the image and the device cannot drift apart
  silently. `tests/test_usbdesc.py` holds the Harmony 600's live report descriptor this way.
  A hardware measurement that is not executable is just a note.
* **Say it was hardware.** Mark the source of every hardware-derived number in the document.
  `docs/usb-protocol.md` has a "Source" row saying image or live device per column.
* **Check the provenance claim in `docs/findings.md`.** Its introduction states what kind of
  analysis produced the document, and it said "no hardware probing" until the first
  measurement made that false. If a measurement makes that paragraph wrong, correct it in the
  same commit, in place, rather than leaving it standing.

## Things that are cheap while a remote is connected

Ask before assuming there will be another chance; a remote goes back in a drawer.

* Identity and descriptors, per above.
* A config read compared against that unit's lab dump, which is the cheapest proof the whole read
  path still works.
* Anything read only that a document has predicted in advance. Writing the prediction down and
  committing it first costs one commit and is what makes the answer worth having.
