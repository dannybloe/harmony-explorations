---
name: probe-remote
description: Measure a connected Harmony remote read only, to check an image-derived claim against hardware. Use when a remote is plugged in, when asked to read a remote's descriptors or identity, when a firmware image claim needs confirming on the bench, or before believing anything about USB enumeration on this machine.
---

# Measuring a connected remote

The project is read only, and these remotes are irreplaceable with Logitech's recovery servers
gone. So a hardware measurement is worth having and is also the easiest place to do permanent
damage. This skill is the ritual that separates the two.

## The rails, which are not negotiable

**Enumeration only.** Read what the operating system learns when the device is plugged in.
Nothing else.

* **Never open or claim the device.** libusb caches configuration, interface and endpoint
  descriptors during enumeration, so all of them are readable without an open handle and
  without a single transfer reaching the remote.
* **Never send a command.** Not `GET_VERSION`, not a `READ_FLASH`, not a "harmless" one. A
  read command is still a command, and the command layer is unverified against hardware.
* **Never write, never erase, never reset.** See "Never write to a remote" in `CLAUDE.md`.
* If a measurement seems to need opening the device, it belongs in `packages/usb` behind the
  write flag where the rails live in code, not in a research tool. Stop and say so.

Sending commands to a remote becomes a real activity later, at roadmap step 5, on a config
read path with the safety rails implemented. It is not this.

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
* Nothing else, yet. Everything more interesting needs the command layer, which needs the
  safety rails, which is roadmap step 5.
