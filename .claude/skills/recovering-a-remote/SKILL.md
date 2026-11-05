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
behind a first write, and it is worth more than any of the arguments below. **On the Harmony 880 and 885
it covers the bootloader only**: a configuration's base slot 2 chooses where the remote's log append
writes, bounded below `0x010000` and nowhere else, so a wrong slot 2 can reach the application and the
built in configuration above that floor. Their section below has the rest. **On the Harmony Touch the
reassurance has a different shape**: its configuration is documents on a writable layer over a read only
system, so nothing a configuration holds reaches the kernel, the system or the boot loader; for a document
that is missing or is not valid JSON the engine's sync requests keep answering over the cable and the next sync
replaces it; but a document that is valid JSON and lacks a list the reader walks ends the task that loads the
configuration, and then a sync alone cannot replace it and a second sync's last write never gets its answer.
Its section below has the route.

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
   version block: their section below says what stands in for both. The Harmony 880 and 885 have no
   safe mode image and no type 4: their bootloader answers with type 3, and their section below says so.
   The Harmony Touch has a screen and no version block, and no safe mode: its screen and its engine's
   answers on the cable are what there is to read, and its section below says how.
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

**Read before any write to this family, and before anything near its safe mode.** What the firmware does
is `reference/architectures/harmony-300-350/firmware.md` "Safe mode and recovery" and `usb.md` "What the
firmware does with a write", and the argument is the headers of `tests/test_harmony_350_boot.py` (the
bootloader and safe mode, read off the bench Harmony 350), `tests/test_harmony_350_recovery.py` (the
application's side) and `tests/test_harmony_350_file_write.py`. One build, 1.4, and the bench 350's own two
images; the Harmony 300's bootloader and safe mode have not been read. None of the routes below has been
run on a unit.

**Both boards carry a pad row for the processor's in circuit programming**, labelled `ICD_VPP`, `RB7`, `RB6`
(reset or programming voltage, data, clock), `DGND`, `VDD_3V3`, `VBATT` and a serial port, `UART1 RXD` and
`UART1 TXD`, on one board design shared by the Harmony 300 and 350, `reference/architectures/harmony-300-350/README.md`.
A fact and not a route: nothing here has been connected to them, and nothing in this project writes the
processor's flash.

**Safe mode is safe to enter on this family, and that is the difference from the Harmony 525.** Every start
runs the bootloader, then safe mode, and safe mode decides whether to run the application; it writes the
application only when a firmware install asks it to, and then it copies the **staged** copy, never itself.
Entering it by a held key, by the reboot with `0x73`, or because the application failed its checksum writes
nothing, and a plain restart leaves it again. Entering the bootloader writes nothing either until a host
sends it a write or an erase.

**The reassurance for a configuration write: a failed one can be sent again over USB.** The application
starts, rejects a broken configuration, carries on without one and keeps answering on the cable, and no
file command waits on the configuration being valid. A configuration write also cannot reach the firmware:
its erase stops short of the staged firmware copy and never touches the processor's own flash.

The route, in order:

1. **Recognise the state.** There is no screen and no version block.
   * **Without opening anything**, `ioreg` shows the product string: `Harmony Remote 0-1.4.0` is the
     application and `Harmony Remote 4-1.4.0` is safe mode, under the same `046D:C124`. A remote that
     enumerates as `04D8:000B` is in its bootloader, the Microchip programmer, and `openHarmony` refuses it.
   * `/sys/sysinfo`, read only, carries `fw_type`: 0 the application, 4 safe mode.
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
5. **A remote that comes up in safe mode** after a plain restart, with no key held, has an application
   that failed its checksum. Stop and ask: the restore is a firmware install, below, which this project does
   not perform on this family. Safe mode serves the same file protocol and its `/cfg/usercfg` is writable, so
   the configuration route above still reaches the remote there, which is read and not tried.

What must never be part of that route:

* **Never open any path but `/cfg/usercfg` for writing.** An open for writing erases what it opens before it
  answers, and `/fw/bootloader` and `/fw/safemode` are writable rows in the processor's own flash, in the
  application's table and in safe mode's: an open of either erases pages that nothing this project runs
  puts back. An open of `/fw/normalmode` for writing erases the staged copy.
* **Never flush `/fw/normalmode`.** It leaves request 2 for the next start, and safe mode then erases the
  application and copies the staged copy over it **without checking the staged copy first**. With a good
  staged image that is a firmware install; with anything else it leaves an application that fails its
  check and a remote in safe mode. This project does not write firmware to this family.
* **The reboot with `0x73` is not needed.** As read it keeps safe mode for one start and writes nothing,
  and a plain reboot leaves it, so it is harmless and also of no use to a configuration write.
* **Keys held at power on choose the image**: codes `0x03`, `0x32` and `0x2C` keep safe mode, `0x14` keeps
  the bootloader's programmer, and three keys held together restart the processor. Which printed keys
  those are is unknown, so a key stuck or held while the batteries go in is the first suspect for a remote
  that will not leave safe mode.

**What is not covered**, and what would cover it:

* **A configuration that passes the validator and then hangs the remote.** Its state is loaded at start,
  before the main loop that serves USB, so one that hangs there would stand between a restart and the
  cable, and whether the watchdog is on is unread. The protection is the composer's rails,
  `writing-a-config`, not a recovery route.
* **A damaged application.** Safe mode is where such a remote lands, and Logitech's route back is a
  firmware install of the package in the lab, `h350_package`, written to `/fw/normalmode` through the same
  seven commands, flushed and closed, after which safe mode's next start installs it. That is read in both
  ends, the client and safe mode, and has not been run; this project does not write firmware to this family.
* **A damaged safe mode image or bootloader.** With no `HG` at `0x001008`, or key `0x14` held, the bootloader
  stays in its Microchip programmer, which can rewrite internal flash above `0x001000`; nothing here
  implements it, `reference/usb-protocol/bootloader.md`. A damaged bootloader has no route.
* **The last eight bytes of the safe mode image** are not in the lab: the remote serves an internal image
  eight bytes short. They hold a routine its start calls, likely an empty one.

## The Harmony Touch

**Read before any write to a Harmony Touch, and before anything near its reset or restart.** The Touch
reports 17 for its architecture and Logitech's templates file it under 18; say "the Harmony Touch".
Everything here is read, in the production firmware 4.15.330 and in Logitech's two clients, and **none of
it has been run on a unit**: no configuration of ours has reached a Touch, and the one recovery a Touch has
been through was Logitech's hidden recovery tool, `docs/test-notes/harmony-touch.md`. The facts are
`reference/architectures/harmony-touch/firmware.md` "Recovery", the argument is the header of
`tests/test_harmony_touch_recovery.py`, and the working note with every file and line is the lab's
`work/touch-firmware/notes/6.1-recovery.md`. How a sync is answered at all is `answering-a-sync.md` in the
same folder.

**What a configuration cannot reach.** The documents, the provisioning and the engine's state live on a
writable data volume laid over a read only squashfs root; the kernel, the root, the boot loader and the
unit's manufacturing record are elsewhere. A sync writes documents and nothing else, so a bad one leaves the
firmware as it was.

**The reassurance, and how far it goes.** A document that is missing or is not valid JSON makes the remote
load nothing: it signals a configuration failure, the engine runs on, and **a new sync over the cable
replaces it**. A sync that fails before its commit leaves the committed set untouched. Neither needs anything
but the sync itself. **It stops at a document that is valid JSON and lacks a list the reader walks**: the
reader raises, nothing catches it, and the task that loads the configuration ends.

* **At start**, every request that waits for the configuration hangs (23 of the 31 `harmony.engine?`
  requests, `api/engine.md`'s table says which, the four `control.button?` and `connect.discoveryinfo?get`),
  the sync requests still answer, and **every sync aborts at its end**, because the reload of the new set has
  no task to go to. So the remote cannot be synced off that set. The abort leaves the sync flag set unless the
  remote's screens answer the failure with `proxy.abort`, which they do while they hold a sync as running.
* **During a sync**, on the reload of the gathered set, which comes before the commit: the sync aborts with
  553 uncommitted, the committed set is untouched, and the abort's reload never returns, so the abort's own
  answer never comes, no `proxy://Abort` is queued, and a second sync's last write never gets its answer,
  which leaves the sync flag set and `setup.sync` answering 202. **A restart loads the committed set again.**
  The commit is `proxy.finished`, which the remote's screens send once the content is in, and it loads
  nothing first: one sent while the flag is still set would commit the set the reload failed on. The request
  rail refuses `proxy.finished`.
* **No previous set is kept**: a commit removes the old set at once, so a set that raises at start raises at
  every start.

The route, in order:

1. **Recognise the state.** No version block and no safe mode to read. What is read:
   * **The screen**: a "Data error" screen offering a factory reset is what the screens show when their own
     first window fails; which document faults reach it, and what the screens show for a failed load
     otherwise, is not read.
   * **On the cable**, through the read tier of the request rail: `account?getprovisioninfo` answers in every
     state above; `harmony.engine?getconfighash` answers with the committed set's tags when the
     configuration task is alive and **never answers when it ended at start**. A request that does not
     answer is that state; set a timeout and do not resend in a loop.
   * **`setup.sync` answering 202** with no sync of ours running is a sync left flagged.
2. **A sync left flagged, or one stopped halfway before its commit**, is cleared by `proxy.abort` or by a
   restart, and after either the next `setup.sync` starts clean; while the flag is set `setup.sync` answers
   202 and clears nothing. A stop after the commit has done its work. The abort is the recovery tier's first
   step, below:

       node packages/usb/bin/touch-recover.ts --step abort                     # dry run, opens nothing
       HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 HARMONY_TOUCH_RECOVERY=1 \
         node packages/usb/bin/touch-recover.ts --step abort --commit

   It answers 200; **on a remote whose configuration task has ended its answer never comes**, since it
   clears the flags before the reload it then waits on, and the script says so rather than failing.
3. **A set the reader raises on during a sync** needs nothing written: the committed set is intact, so a
   restart, step 5, is the repair, and then fix the document before the next sync.
4. **A committed set that raises at start** needs the stored documents changed before a restart:
   `setup.sync?deleteresources`, after which the remote starts with no configuration and a sync works,
   `--step delete --backup <lab folder>` with the same flags. **The backup is required and checked first**:
   a folder in the lab that holds a file, since the delete removes every stored document and picture and the
   remote keeps no copy, and a remote stuck on a set its reader raises on has nothing worth keeping on it
   except what the backup holds. Its answer carries no status of its own; 501 means the remote is not
   provisioned and nothing was deleted. `proxy.resource?put` of the corrected document would also do, saved
   before its reload is tried, and is not on any tier: putting content is the answerer's, `todo-touch.md`
   6.6. Then restart.
5. **The restart.** `setup.firmware?reboot`, `--step reboot` with the same flags, restarts the remote two
   seconds after it answers 200, without the configuration task; **it answers 202 and restarts nothing
   while a sync flag is set**, so a parked sync takes `--step abort` first, a run of its own, since the
   abort's answer may never come. **There is no battery pull**: the cell is internal and not replaceable by
   Logitech's manual, `reference/remotes/harmony-touch/hardware.md`. What a long hold of Off does is an open
   question in that model's `keys.md`.
6. **Last, the remote's own factory reset**, Settings, General, Factory reset, which erases every document,
   the provisioning and the engine's state and keeps the firmware. Afterwards the remote is not provisioned
   and refuses `setup.sync` with 501. The refusal is read; **what sets it up again is inferred**: Logitech's
   client by its own flow, against the account, and the request that does it is `setup.account?provision`,
   which any host on the cable can send and which is outside the request rail and on the never list below.
   The Settings screen's own text says the reset keeps the account, which disagrees with the reading; whether
   a unit refuses a sync with 501 afterwards is what would settle it.
   Holding Off and Menu while the remote starts selects the same reset by the boot loader's reading; it has
   never been tried and how a person gets the remote to start with the two held is not read.
7. **Back to Logitech's service.** MyHarmony sends the remote's stored tags up, `If-None-Match` on a fetch
   and `If-Match` on an upload; what the service does with a tag it did not issue is the first sync with tags
   of ours to measure. If it goes wrong, `setup.sync?deleteresources` first leaves the remote no tag to send,
   and the factory reset above is the fallback.

**The request rail carries the three recovery requests in a tier of their own**, decided on 5 November 2026
under decision 29: `proxy.abort`, `setup.sync?deleteresources` and `setup.firmware?reboot`,
`TOUCH_RECOVERY_REQUESTS` in `rails.ts`, behind `HARMONY_TOUCH_RECOVERY=1` on top of
`HARMONY_ENABLE_WRITES=1` and `HARMONY_TOUCH_REQUESTS=1`, checked by the rail on the whole line and by the
transport on the bytes. **In order, one per run of `packages/usb/bin/touch-recover.ts`**: `--step abort`,
then `--step delete --backup <lab folder>` only when the stored set itself is what fails, then
`--step reboot`. The script does not chain them, because each answer says what comes next. Every other
`setup.firmware?` and `setup.sync?` verb stays refused, and so do `proxy.finished`, which commits a gathered
set without loading it, and `proxy.resource?put`. **The rail still reads no answer's content**, so answers
that are valid JSON and lack a list the reader walks are saved as written; **the protection is the answerer
refusing a set the codec's reader and check reject before any of it is written**, `todo-touch.md` 6.6, and
the tier is the way back when that fails. None of the three has been sent to a unit.

**What still needs the remote's own factory reset, step 6, and Logitech's client**: a remote whose system
does not start, below, which nothing over USB reaches; and a remote whose provisioning is gone, which only
`setup.account?provision` would restore and which no tier carries.

What must never be part of that route:

* **Never write `/sys/factoryreset` or `/sys/reboot`.** They act on a write; the first arms the factory reset
  and opens the power controller's and radio's firmware loader nodes for writing. The remote's own Settings
  reset does what a recovery needs without them.
* **Never `/fw/otaupdate`, nor anything that installs firmware.** That is Logitech's recovery and this
  project does not write firmware.
* **Never a path that acts when opened**, and never `HARMONY_FILE_PATH_EXPERIMENT` to reach one.
* **Never `setup.account?provision`**: provisioning is the account's, and Logitech's client does it after a
  reset.

**What is not covered**, and what would cover it:

* **A set that loads and then misbehaves**, an activity that hangs the engine rather than the reader. The
  watchdog's file is fed by a task of its own, read on the engine's side; what the native watchdog program
  does with it is inferred from its strings, so whether anything restarts such a remote is not read. The
  protection is the composer and its checks, not a recovery route.
* **What Logitech's hidden recovery tool sends.** Its Silverlight utility is not in the lab. The zero bytes of
  configuration after the one recovery on a Touch is not explained by the production updater, which keeps the
  documents; MyHarmony's "Recover Remote", an update followed by the remote's own reset, would explain it.
* **A system that does not start.** The boot loader falls back to a second kernel volume that nothing in the
  image writes, and keeps a console and a shell on a serial port; whether a Touch's board brings that port
  out is not checked. No USB route back was found.
* **Whether the screens show anything for a configuration task that ended**, and what a person sees.

## The Harmony 880 and 885

**Read before planning any write to this platform, and before deciding what a recovery would be.** The two
Harmony 885s on the bench are read only, `CLAUDE.md` "Never write to a remote", and this platform is not
in `ARCHITECTURES_WITH_A_WRITE_TARGET`. So this section is what a recovery would consist of, and not a
permission. Everything in it is read in the firmware, the application 4.4 and both bootloader builds 4.0,
the 880's and the 885's; none of it has been run on a unit, and no command has been sent to a bootloader on
any remote. The facts are `reference/architectures/harmony-880-885/firmware.md`, `memory.md` and `usb.md`,
and `reference/usb-protocol/bootloader.md` "The Harmony 880 and 885"; the arguments are the headers of
`tests/test_harmony_885_bootloader.py`, `test_harmony_885_start_check.py`,
`test_harmony_885_erase_and_write.py`, `test_harmony_885_write_end.py` and `test_harmony_885_reads.py`.

**There is no safe mode image here, and two things do its work.** The bootloader, the bottom 64 KiB, is a
complete program: when it does not start the application it stays on the cable and answers the
application's own commands, so it can write the application back. And the application carries a small
configuration of its own in its last 8 KiB, at `0x01E000`, which it runs whenever the user's configuration
cannot be trusted. Logitech's classic client treats the bootloader as this platform's safe mode program,
`firmware.md` "The images".

**What can go wrong, and what survives it:**

| what is damaged | what the remote does | the way back |
|---|---|---|
| the configuration | shows a message, then runs the built in configuration as the full application, still on the cable, `firmware.md` "What the application does at start" | write the configuration again and restart |
| the application, erased or half written | fails the bootloader's image check at power on, so the bootloader stays resident and serves the cable, `firmware.md` "What the bootloader does at power on" | erase and write the application back from the unit's backup, through the bootloader, `bootloader.md` "What it can restore" |
| the bootloader's sector | nothing runs at power on | **no USB route**, below |

The route, in order:

1. **Recognise the state.**
   * **The screen.** A failed configuration shows "Go to Website / to update settings" when a cookie or
     marker failed and "Configuration Corrupted" when only the checksum did; a blank identity block shows
     "Missing License" and a blank battery calibration word "Battery ADC Not Calibrated". Each stays 3000
     ticks of the timer, about three seconds if a tick is a millisecond, which is not established, and then
     the built in configuration runs. **Nothing latches**: the verdict is recomputed at every start and at
     no other moment. The bootloader, when resident, shows a screen of its own. `firmware.md` "What the
     application does at start".
   * **Without opening anything**, `ioreg` shows the product string: `Harmony Remote 0-4.4.2` is the
     application and `Harmony Bootloader` the bootloader, the second read in the image and not seen on a
     unit. **The ids do not change**: the bootloader enumerates with the application's own descriptor,
     `046D:C110` and the same `bcdDevice`. `openHarmony` refuses a bootloader by Microchip's ids, which this
     one does not present, so **it opens a remote held in its bootloader as if it were running**.
   * **So read the version block before anything else**: software type 0 is the application and 3 the
     bootloader, whose field 6 is zero where the application's is 8. No type 4 exists on this platform,
     `usb.md` "The version block".
   * **Read the staged install's status**, `READ_MISC` selector 6, which both programs serve. Anything but
     zero means the next restart by the processor's `RESET` installs over the application, see the hazards
     below.
2. **A bad configuration is written again**, with the application still running. Two steps of the other
   platforms' eight step sequence must not be carried over: `WRITE_MISC` selector `0x0A` does not exist
   here and gets no reply, so a writer waiting for one hangs, and status 2 must never be sent. Selector 2
   keeps the remote off the region being rewritten until the next start, and only a restart, `E1 02` with
   no reply, takes up the new configuration. `usb.md` "How a write ends".
3. **A damaged application is written back through the bootloader, never through the running
   application.** An application whose image fails the check lands there by itself at power on. One that
   passes the check and misbehaves is held there by scan code 2 or 33 down at power on. On an 885 those are
   Power and OK, pressed on a unit, but **that holding one at power on keeps the bootloader is not
   checked**, and an 880's keys were not pressed: do not offer it to a person as a route that works,
   `reference/remotes/harmony-885/keys.md` "The keys held at power on". Through the bootloader: erase
   `0x010000`, a 64 KiB sector by every source, write the 64 KiB back from the backup, which it programs
   byte for byte, `0xFF` included, then read the whole 64 KiB back and compare, and only then restart with
   `E1 02`. The image check wants the `HG` magic at `0x010004` and the checksum over offset 4 to the end,
   `firmware.md` "The header is not the later Harmonys'". From the running application, an erase at
   `0x010000` removes the code answering the command; that the next start then lands in the bootloader is
   inferred and not checked. Logitech's own route for a new application stages it at `0x1D0000` and sets
   status 2; a recovery does not need it, and it adds a region nobody has read on a unit.
4. **An erased bootloader has no route back over USB.** Nothing in the reference names another one. Whether
   the board carries pads for the processor's in circuit programming is not checked, and neither is whether
   the bottom 64 KiB is the processor's own flash or the external part, so what such programming would
   reach is not known either, the architecture folder's `README.md` "Shared, in one table". It cannot be
   erased by accident, since it takes the unlock first; putting the identity block back is the one
   deliberate operation that erases it, below.

**The backup, before any write to a unit.**

* **The whole region from `0x000000` to `0x1FDFFF`**, which holds the bootloader, the identity block, the
  hardware version log, the battery calibration word, the application with its built in configuration, the
  user configuration, the staging region at `0x1D0000` and the log area, `memory.md` "The address space".
  Reads of `0x8000` bytes from a `0x8000` boundary never meet the two addresses below that are not flash,
  `usb.md` "Reading flash". **The library bounds a read by where it starts and not where it ends**, so a
  read that starts below `0x1FE000` and runs past it is not refused: keep the end inside the window by
  hand.
* **The identity block at `0x000110`, 48 bytes, and the battery calibration word at `0x000160`** are the
  two things a writer must never leave blank. A blank identity block keeps the user configuration from ever
  being checked, so the built in one runs; a blank calibration word leaves every test of whether a
  configuration is valid seeing only the built in one. Both are only tested for being blank and compared
  with nothing, so the unit's own bytes are what go back, `firmware.md` "What the application does at
  start".
* **Putting either back means erasing the sector that holds the reset vector.** Both sit inside the
  bootloader's 64 KiB, at `0x000110` and `0x000160`, which is inside the first sector under both sector
  maps the outside sources give for that range, eight of 8 KiB or a first one of 16 KiB, `memory.md` "The
  flash part". So it needs the unlock, and an interruption between the erase and the write leaves a remote
  with no bootloader and no route back. Logitech's classic client does exactly this rewrite of the bottom
  64 KiB to erase an identity block, `bootloader.md` "A flash programmer for the whole part". This is read
  from the two pages together and stated on neither.

**What a recovery must not walk into:**

* **No ceiling on erase or write**, in the application or the bootloader: one floor at `0x010000` and
  nothing above it, so a wrong address from there up erases or writes whatever is there, the running
  application included, with no condition. `usb.md` "Writing flash" and "Erasing flash".
* **The unlock opens the bootloader to erase.** A one byte write flash of `0xA7` to `0x000106` sets it,
  and `WRITE_MISC` selector 7 reaches the byte as well, `0x23A` in the application's data memory; it stays
  set until the remote next starts or goes to sleep. Send it for the identity block's sector and for
  nothing else, `memory.md` "Data memory".
* **`F0 D0` and `F0 30` do not mean done.** A write is answered the same whatever was programmed, and a
  refused erase gets no reply at all, so the host waits until it times out. Only a read back says what the
  flash holds.
* **Erase before writing.** Nothing erases on its own, a programmed byte over old content can only clear
  bits, and the application skips `0xFF` bytes where the bootloader writes them, so a write over unerased
  flash reads back partly right and partly old.
* **Status 2 or 6, set by a host, installs over the application at the next `RESET`.** `WRITE_MISC`
  selector 6 sets it, and selector 7 reaches it at `0x100`; then the escape's restart, the three key
  restart or the wake from power down makes the bootloader erase the application and copy 64 KiB over it,
  from `0x1D0000` for 2 and from `0x020000`, the user configuration, for 6. The 880's bootloader resumes an
  interrupted copy from `0x020000` as one from `0x1D0000`. **A power on or a battery pull clears the
  status**, so a remote found with a status other than zero is restarted by a battery pull and not by the
  escape. `firmware.md` "What the bootloader does at power on" and "Restarting".
* **A read whose last byte is `0x000104` or `0x000105`, alone in its chunk**, which takes an odd count
  ending there, is not a flash read: `0x000104` returns the hardware log's newest entry and `0x000105`
  switches a pin on and runs the analogue converter. Both programs do it. There is no odd count hang on
  this platform; this is the hazard an odd count has here, `usb.md` "Reading flash".
* **From `0x1FE000` up is not flash**: the keypad, the USB controller and the display sit there, then a
  window onto RAM from `0x1FFE00`, and past `0x1FFFFF` an address reaches the processor unmasked, by the
  family the configuration space and then the bottom of flash again from `0x400000`, inferred and not
  checked. A read there is a bus cycle on a device, and an erase there reaches a device or the RAM the
  routine runs from, `memory.md` "The address space" and "The flash part".
* **`WRITE_MISC` selector 7 has no bound**, and in the bootloader it reaches the special function registers.

**What is not known**, and stands between this section and a recovery anyone could run:

* Which of the two flash parts a unit carries, and so the sector map below `0x010000`, where Logitech's
  client and concordance disagree and no datasheet was compared.
* Whether holding 2 or 33 at power on works as read, and whether holding all three through a restart
  leaves the remote in its bootloader. On an 885 the three are Power (2), OK (33) and 0 (32), pressed on a
  unit, `tests/test_harmony_885_keys.py`; an 880's keys were not pressed.
* What sits at `0x1D0000` on a unit, and what could interrupt a staged copy and leave status 4 or 7.
* Whether the board has in circuit programming pads, and whether the bottom 64 KiB is in the processor or
  in the external part.
* Any command sent to a bootloader on any remote, and whether this one serves `Harmony Bootloader` as its
  product string; what a watchdog or a supply dip does to the status; how long a timer tick is.
