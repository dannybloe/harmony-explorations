---
name: recovering-a-remote
description: "How a Harmony is recovered when a write goes wrong, per architecture: safe mode, the bootloader, the flash programmer, the EEPROM latch and the write protect interlock. Use before planning or rehearsing a first write, when a remote will not boot or is stuck in safe mode, when judging whether an operation is survivable, and before entering safe mode on any model."
---

# Recovering a remote, per architecture

**Read this before deciding an operation is survivable, not after.** The rails in `CLAUDE.md` say a
write needs a verified dump of that exact unit and a read back afterwards. This is the other half:
what a restore would actually consist of, which differs enough between models that one architecture's
success does not transfer to another. The mechanisms are the reference's, on each architecture's
`firmware.md` under `reference/architectures/`; this skill holds the order of checks, the commands and
the traps.

Four things frame it.

**Most of the routes below are readings, and a route that has not been exercised is a prediction.**
Five units have had flash written, the spare Harmony One, the Harmony 525, the Harmony 650, the Harmony
600 and the Harmony 700, and `CLAUDE.md` "Never write to a remote" is the record of each. One route here
has been run to repair a remote: the reinstall request, which writes no flash from the host and repaired a
Harmony 700 that arrived stuck in safe mode, section 295, and later, with Logitech's 2.8 image staged
first, section 297, installed a different build on it. One other recovery was performed by hand, on the
Harmony 525, from a script in the private lab. This said "four units" and "two writes" after both had
stopped being true, and "one write has been performed" before that; it was corrected against `CLAUDE.md`
by plan 009's step 6.2.

**Entering safe mode is not free on every model.** On the Harmony 525 it destroys the application
firmware, and a power cycle does not leave it. That is the one-way door in this file and the reason
the rail demanding a verified dump is what separates a recoverable remote from a lost one.

**A damaged configuration cannot reach the bootloader or the safe mode image**, so a remote whose
config is wrong still boots and our own read path still works. That is the structural reassurance
behind a first write, and it is worth more than any of the arguments below.

**A stranded remote tells you what is wrong, so read the screen before diagnosing anything.** The
firmware's status screens are a library of 30 on the Harmony One and 35 on the Harmony 600, 650 and 700,
three of them about the configuration and three **different** screens: an invalid configuration, a
corrupted one, and a request to go to the website and update settings, `reference/config-format/screens.md`
"Status screens", with the list in `packages/codec/test/status.test.ts`. **What selects a screen is read**,
section 249: a status code, the same number on every architecture, plus a base per container. Cookies that
do not match give code 0, "Go to Website to update settings"; cookies that match with a trailer checksum
that does not give code 26, "Configuration Corrupted". This said "what selects a screen is unread" until
plan 009's step 6.2. On a Harmony One a failed validation **latches** until a power cycle, and the Harmony
600, 650, 700 and 525 do not latch, `reference/remotes/harmony-one/behaviour.md` "After a write".

Moved out of `CLAUDE.md` on 29 August 2026, where nine and a half thousand characters of firmware
reading sat in every session's context to answer a question that only arises when something has gone
wrong or is about to.

## The order of checks

1. **The screen**, above.
2. **The version block**: software type 4 is safe mode and 0 the application, on every architecture
   read, `reference/usb-protocol/version-block.md`. On a Harmony One enumeration cannot tell the two
   apart, since the product id does not change. The Harmony 300 and 350 have neither a screen nor a
   version block: their section below says what stands in for both.
3. **Which architecture**, and then that route below. Nothing transfers between them by default.
4. **What a file actually holds, before trusting its name**, before anything is restored from it.

## The routes

* **A Harmony 700 stuck in safe mode can reinstall its own application**, section 295, and this is
  the one route here that has been run to repair a remote. It was read on that model's 2.3 safe mode
  image; the Harmony 600 and 650 are on the same architecture and the rail admits them, but on theirs
  only part of the routine has been matched, so a run there is a new measurement. Read the symptom
  first: software type 4 in the version block, the application at internal `0x9000` failing its
  checksum, and the image at external `0x000000` verifying. That external copy is where an install
  **stages** the application, and the safe mode image copies it into internal flash at start up when
  the update status byte is 2, `reference/architectures/harmony-600-650-700/firmware.md` "Installing
  firmware" and `reference/usb-protocol/commands.md`, selector `0x06`. So a remote whose copy step
  failed still holds a good image, and the repair sends no firmware at all:

      node packages/usb/bin/reinstall-firmware.ts --unit <label>            # dry run, reads only
      HARMONY_ENABLE_WRITES=1 HARMONY_FIRMWARE_REINSTALL=1 \
        node packages/usb/bin/reinstall-firmware.ts --unit <label> --commit

  The dry run prints the unit match against `../lab/units/<label>.txt`, the software type, whether
  the staged image verifies and which 1 KiB pages of the installed one differ from it, and the status
  byte. The commit sends `A3 06 00 02`, reads back 2 and restarts; the rail re-reads the staged image
  itself and refuses unless it verifies and fits the `0x15C00` byte copy limit. Afterwards read the
  internal pages again and compare, which is how the 700's repair was shown to have changed exactly
  the damaged page. **Failure modes**: an interrupted install leaves safe mode, an erased application
  and the staged copy untouched, so the same command runs again; a status that does not survive the
  restart does nothing. **Logitech's clients did not repair it**, `docs/test-notes/harmony-700.md`.
  **If the staged image does not verify either**, this route alone is closed, and staging a verifying
  image first, below, is the other half; the 2.8 package in the lab states two different flash parts,
  `reference/remotes/harmony-700/hardware.md`, so it is not a drop in answer.
  **The same route installs a different build**, decision 18 and section 297: `--image <file> --backup
  <region read>` stages a Logitech image first. That is how the bench 700 went from 2.5 to 2.8, and it
  is the way back: the 2.5 image the unit arrived with, cut out of its first staging read, as the image,
  and a fresh read of the region as it stands as the backup. From application mode it needs the build's
  status byte handler read, `STATUS_BYTE_READ_ON_APPLICATION`, which is 2.5 and 2.8, section 298.

* **Check what a file actually holds before trusting its name.** On the Harmony One `*-safe.bin` is
  flash `0x000000` to `0x010000`, which contains the safe mode `GSPM` container at `0x002000`, verified
  against the device byte for byte. On the **Harmony 600, 650 and 700 the file called `-safe.bin` is not
  a safe mode image at all** but the application truncated at 64 KiB, and the real safe mode image is in
  internal flash, `reference/architectures/harmony-600-650-700/firmware.md` "Safe mode" and
  `docs/checksums.md`. A rail that says "restore from the safe dump" would have restored the wrong thing
  there. The other path on those models is a reset key combination the Harmony 700's 2.8 image hardwires,
  in the same page's routine table.

* **On the Harmony 525, never enter safe mode as an experiment.** It copies the safe mode image over the
  application, a power cycle does not leave it, and leaving it needs the application copied back by
  setting EEPROM byte 0 to 2 and restarting, `reference/architectures/harmony-5xx/firmware.md` "How the
  bootloader chooses an image" and "Safe mode is a one way door"; what each window of its address space
  is, the EEPROM among them, is that folder's `memory.md`. **The recovery has been performed once and it
  worked**, by hand from the private lab, `docs/test-notes/harmony-525.md`. **This project must still not
  be what performs that write**, and the reason changed without the conclusion changing. It used to be
  that "arch 9 has no write target"<!--superseded-->; it has one now, section 269, and what refuses this
  write is the **range**: the writable window runs from the configuration at `0x820000` to the log area
  at `0x870000`, so the EEPROM at `0x200000` and both firmware images below `0x820000` are outside it.
  **Installing firmware on an irreplaceable unit is not what a write path this young should be doing**,
  which is the argument that never rested on the rail.

* **Safe mode has a published entry procedure and it is a cold boot key test**: charge, pull the battery,
  hold Off, insert the battery while still holding, up to 30 seconds. So it involves no config, no host
  and no USB command, which is why searching the running firmware for it failed. The source is a third
  party repair business rather than Logitech, and it has been confirmed on a Harmony 525, section 118,
  and on a Harmony One, section 190, where it does not stick: a plain power cycle boots normally. This
  said the cheap confirmation on the Harmony One was still to do until plan 009's step 6.2. **A reading
  that a routine does not test something can come from the test's guard**: the Harmony One bootloader was
  written up as testing no key, "zero port reads so it does not test the key"<!--superseded-->, because a
  guard selecting direct accesses discarded the one `MOVFF` that reads, section 189.

* **The Harmony One's bootloader is a USB flash programmer, and that is the recovery route**, section
  189, `reference/architectures/harmony-one/firmware.md` "Safe mode, the bootloader and recovery" and
  `reference/usb-protocol/bootloader.md`. Every path that does not hand off converges on its USB service
  loop, including the one taken when the image is gone. **Unlike the Harmony 525 it copies nothing**, so
  entering recovery on a Harmony One destroys nothing and the 525's one way door does not transfer.
  **The limit is per level**, section 191: the bootloader writes only internal flash, so it cannot restore
  a configuration, and this file said that of recovery as a whole for a few hours. The **safe mode image**
  carries its own external flash programmer and six of the application's seven commands, both flash
  commands among them, so the restore route needs no protocol work, section 192, and **what is left is a
  rehearsal**: a restore through safe mode has never been performed.

* **A flash address is classified before it is used, and that is the write protect interlock**, section
  192, `reference/usb-protocol/commands.md` and `reference/architectures/harmony-one/memory.md`. A top byte
  of `0xFE` or `0xFF` means internal program flash, a top byte below the architecture's ceiling means the
  external medium, and anything else selects nothing. **It rests at refuse**, so a rejected address is a
  no operation rather than a write elsewhere, and it **composes** with section 175's bit rather than
  replacing it. On the Harmony 525 the firmware bounds an erase to the part and nowhere finer, and the
  interlock its image does have guards internal flash only, `reference/architectures/harmony-5xx/firmware.md`
  "The erase hazard".

* **The caller erases**: neither the Harmony One nor the Harmony 600 erases before it programs,
  `reference/usb-protocol/commands.md`. **And a blind reviewer's statement is scoped to its packet**:
  section 186's reviewer said the external flash programmer was in nothing this project holds, which was
  true of the review packet and false of the repository, section 191. Copying a reviewer's statement out of
  its scope is how a withhold list produces a wrong claim rather than a missing one.

## The Harmony 300 and 350

**Read before the family's first write, `todo-compile-350.md` 1.6 and 1.7.** What the firmware does is
`reference/architectures/harmony-300-350/firmware.md` "Safe mode and recovery" and `usb.md` "What the
firmware does with a write", and the argument is the headers of `tests/test_harmony_350_recovery.py` and
`tests/test_harmony_350_file_write.py`. All of it is read in the 1.4 **application** alone: the
bootloader and the safe mode image are not in the lab, so nothing below says what either does, and none of
it has been done to a unit.

**The reassurance, and the reason a first write is survivable: a failed configuration write can be sent
again over USB.** The application starts, rejects a broken configuration, carries on without one and keeps
answering on the cable, and no file command waits on the configuration being valid. A configuration write
also cannot reach the firmware: its erase stops short of the staged firmware copy and never touches the
processor's own flash.

The route, in order:

1. **Recognise the state.** There is no screen and no version block.
   * `/sys/sysinfo`, read only, carries `fw_type`: the 1.4 application can only ever answer 0, so a 3 or a
     4 means the bootloader or safe mode is answering, by Logitech's client's numbering, and what to do then
     is unread. Stop and ask.
   * A rejected configuration latches an error code, 8 for a missing marker and 4 for the checksum, and the
     remote switches four outputs on and off in a pattern counted from it, likely its lights. **The code
     stands until the processor restarts**, even after a good configuration has been written.
   * A read of `/cfg/usercfg` states `end_addr` less the base as its size, and zero when that field is
     erased, so an empty read means an erased header.
2. **Rerun the whole write from the file system reset**, `0xFF` with `0x66`, with the same container and
   its four byte end marker: the reset closes a file an interrupted attempt left open, which is all an
   interrupted attempt with the power on leaves behind. One with the power off left a rejected configuration
   and nothing open, and the same rerun covers it. This is exactly what Logitech's client does on a failure.
3. **Read back and compare**, the four end marker bytes put back, through `read-file.ts --file
   /cfg/usercfg --product 0xc124`. An `m` from the check proves the header and the stored checksum word
   arrived and not the body.
4. **Then restart the processor**, the reboot `0xFF` with `0x00` or a battery pull: the latched code stands
   until one, and the start is where a configuration is validated and loaded.

What must never be part of that route:

* **Never open any path but `/cfg/usercfg` for writing.** An open for writing erases what it opens before it
  answers, and `/fw/bootloader` and `/fw/safemode` are writable rows in the processor's own flash: an open
  of either erases pages that no route read here puts back.
* **Never send the reboot with `0x73`, and never flush `/fw/normalmode`.** Each leaves a request in data
  memory for the code that runs before the application, `0x0F` and 2, and what the bootloader or safe mode
  does with it is unread. On the Harmony 525 entering safe mode destroys the application, and nothing here
  rules that out for this family.
* **Three keys held together restart the processor**, tested in the keypad routine. Which three is unknown, and as far
  as the application says it is a reboot and writes nothing.

**What is not covered**, and what would cover it:

* **A configuration that passes the validator and then hangs the remote.** Its state is loaded at start,
  before the main loop that serves USB, so one that hangs there would stand between a restart and the
  cable, and whether the watchdog is on is unread. The protection is the composer's rails,
  `writing-a-config`, not a recovery route.
* **A damaged application.** Logitech's route is a firmware install of the package in the lab,
  `h350_package`, written to `/fw/normalmode` through the same seven commands, which lands in the staged
  copy on the external medium; its manifest asks for the reboot, and Logitech's client calls an install
  required whenever a remote reports safe mode. What installs the staged copy is in the images this project
  does not hold, so this is a prediction and not a route, and this project does not write firmware to this
  family.
* **The two unread images are readable files on the remote**, `/fw/bootloader` and `/fw/safemode`. Reading
  them into the lab is what would answer how safe mode is entered and whether it overwrites anything. Both
  paths are off the transport's inert list, so that read is a decision and needs
  `HARMONY_FILE_PATH_EXPERIMENT=1`, and it is not a step of a configuration write.
