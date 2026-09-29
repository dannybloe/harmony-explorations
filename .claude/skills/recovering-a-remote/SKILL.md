---
name: recovering-a-remote
description: How a Harmony is recovered when a write goes wrong, per architecture: safe mode, the bootloader, the flash programmer, the EEPROM latch and the write protect interlock. Use before planning or rehearsing a first write, when a remote will not boot or is stuck in safe mode, when judging whether an operation is survivable, and before entering safe mode on any model.
---

# Recovering a remote, per architecture

**Read this before deciding an operation is survivable, not after.** The rails in `CLAUDE.md` say a
write needs a verified dump of that exact unit and a read back afterwards. This is the other half:
what a restore would actually consist of, which differs enough between models that one architecture's
success does not transfer to another.

Three things frame it.

**Flash writes have been performed here since section 222, on three units, and one route below has
been exercised in anger on a fourth**: the reinstall request, which writes no flash from the host and
repaired a Harmony 700 that arrived stuck in safe mode, section 295, and later, with Logitech's 2.8
image staged first, section 297, installed a different build on it. The rest are readings of firmware plus, in one case, a recovery somebody performed
by hand from the private lab. This said "one write has been performed" until 29 September 2026, well
after it stopped being true. A route that has not been exercised is a prediction.

**Entering safe mode is not free on every model.** On the Harmony 525 it destroys the application
firmware, and a power cycle does not leave it. That is the one-way door in this file and the reason
the rail demanding a verified dump is what separates a recoverable remote from a lost one.

**A damaged configuration cannot reach the bootloader or the safe mode image**, so a remote whose
config is wrong still boots and our own read path still works. That is the structural reassurance
behind a first write, and it is worth more than any of the arguments below.

**A stranded remote tells you what is wrong, and there are thirty things it can say.** The container
at flash `0x002000` on a Harmony One is the firmware's status screen library, section 244: 30 screens
on arch 12 and 35 on arch 14, the same list in the same order with five extra in front. Three of them
are about the configuration and they are three **different** screens, an invalid configuration, a
corrupted one, and a request to go to the website and update settings. So read the screen before
diagnosing anything, and `packages/codec/test/status.test.ts` holds the list. What selects a screen is
unread, so the screen says what the firmware thinks and not why.

Moved out of `CLAUDE.md` on 29 August 2026, where nine and a half thousand characters of firmware
reading sat in every session's context to answer a question that only arises when something has gone
wrong or is about to.

## The routes

* **A Harmony 700 stuck in safe mode can reinstall its own application**, section 295, and this is
  the one route here that has been run to repair a remote. It was read on that model's 2.3 safe mode
  image; the Harmony 600 and 650 are arch 14 too and the rail admits them, but on theirs only part of
  the routine has been matched, so a run there is a new measurement. Read the symptom first: software
  type 4 in the version block, the application at internal `0x9000` failing its checksum, and the
  image at external `0x000000` verifying. That external copy is where an arch 14 firmware install
  **stages** the application, and the safe mode image copies it into internal flash at start up when
  the update status byte, data memory `0x100`, is 2. So a remote whose copy step failed still holds a
  good image, and the repair sends no firmware at all:

      node packages/usb/bin/reinstall-firmware.ts --unit <label>            # dry run, reads only
      HARMONY_ENABLE_WRITES=1 HARMONY_FIRMWARE_REINSTALL=1 \
        node packages/usb/bin/reinstall-firmware.ts --unit <label> --commit

  The dry run prints the unit match against `../lab/units/<label>.txt`, the software type, whether
  the staged image verifies and which 1 KiB pages of the installed one differ from it, and the status
  byte. The commit sends `A3 06 00 02`, reads back 2 and restarts; the rail re-reads the staged image
  itself and refuses unless it verifies and fits the `0x15C00` byte copy limit. Afterwards read the
  internal pages again and compare, which is how the 700's repair was shown to have changed exactly
  the damaged page. **Failure modes**: a power loss mid copy leaves safe mode, an erased application
  and the staged copy untouched, so the same command runs again; a status that does not survive the
  restart does nothing. **Logitech's clients did not repair it**: MyHarmony's sync failed, for a
  reason not established, and Harmony Desktop's sync wrote a configuration and left the application
  as it was. **If the staged image does not verify either**, this route alone is closed, and staging
  a verifying image first, below, is the other half; the 2.8 package in the lab states two different flash
  parts, `0x14:0x1C` in its upgrade header and `0x15:0x1C` in its `Data.xml`, so it is not a drop in
  answer. The 600's and 650's 0.2 safe mode images carry the routine's status normalisation, and
  their status handlers and every safe mode escape handler are unread.
  **The same route installs a different build**, decision 18 and section 297: `--image <file> --backup
  <region read>` stages a Logitech image first. That is how the bench 700 went from 2.5 to 2.8, and it
  would be the way back, with the staging read taken before as the image, if it were permitted. From application mode it
  needs the build's status byte handler read, `STATUS_BYTE_READ_ON_APPLICATION`, which is 2.5 only;
  2.8's is unread, so going back from 2.8 means reading `0x1AB96` first or starting from safe mode.

* Recovery paths first, and **check what the file actually holds before trusting its name**. On
  arch 12 `*-safe.bin` is flash `0x000000` to `0x010000`, which contains the safe mode `GSPM`
  container at `0x002000`, and the One's has been verified against the device byte for byte. On
  **arch 14 the file called `-safe.bin` is not a safe mode image at all**: the 600's is the
  application firmware from program `0x9000`, truncated at 64 KiB, byte identical to
  `600-0.2-code-base0x9000-TRUNCATED64k.bin`. Its real safe mode is the 24320 byte image at
  internal `0xFE+0x1000`, which verifies its own checksum and was first read in August 2026. A rail
  that says "restore from the safe dump" would have restored the wrong thing on arch 14.
  The hardwired reset key combination at `0x19120` is the other path.
  **Entering safe mode on arch 9 destroys the application firmware**, section 118, measured on the
  bench 525 by reading its internal flash before and after: the bootloader is byte identical, the
  28 KiB application is gone, and an image under 10 KiB sits in its place with everything above
  `0x3800` erased. The part has 32 KiB, so there is no room for a second image **in internal program
  flash** and safe mode has to be copied over the application. **So safe mode is not a free fallback on
  arch 9 and must never be entered as an experiment**: a power cycle does not leave it, and leaving it
  needs the application copied back, which is why the rail demanding a verified dump of that exact unit
  is what separates a recoverable remote from a lost one. Arch 14 keeps both images resident in
  internal flash and does not have this problem. **On arch 9 both images are resident too, in external
  flash, and the internal region is a copy of whichever the bootloader last put there**: the
  application at `0x810000`, read twice and matching the internal copy byte for byte, and the safe mode
  image at `0x800000`, whose five version accessors are exactly what a stranded 525 reported. That
  second identification is the calibration worth remembering, because the label was written from the
  header on 8 August and the device confirmed it on 11 August. So nothing is transferred from a host to
  enter safe mode and nothing has to be to leave it. What tells the bootloader which image to install
  is **byte 0 of the on chip EEPROM**, section 119, and `0x02` selects the application: 1 and 5 request
  safe mode, 2 requests the application, the bootloader marks 3 or 4 **before** copying, writes **6** on
  success, and the running image consumes the 6 by writing 0 and putting a message on the screen. So 3
  and 4 are in progress marks that make an interrupted install retry, and **0 is the resting value**, at
  which nothing is installed and whatever is resident runs. **The address
  space the protocol calls flash is a set of tagged windows and only one of them is flash**: on arch 9
  top byte `0x00` is 32 KiB of internal program flash, `0x20` is 256 bytes of EEPROM, `0x40` is 2048
  bytes of data memory, `0x30` is eight bytes, and `0x80` to `0x87` is the serial chip. Every bound is
  a documented size of the PIC18F4550. So concordance's `FinishFirmware` byte is **confirmed from the
  firmware and no longer client sourced**, and section 88's arch 9 rule was the validator's default arm
  read as the whole rule, which is why `packages/usb` refused three regions the device serves.
  `ARCH9_WINDOWS` carries them now. **A read only measurement refuted the first reading of the latch**:
  the stranded 525's EEPROM byte 0 is 0, not the 3 predicted, so safe mode persists by being resident
  and not by being reinstalled, and only the byte could tell those apart. **The recovery has been
  performed and it worked**, by hand, on 11 August 2026, from the private lab script: the 525 came
  back with software type 0, its version reply matching 8 August byte for byte, its application region
  restored including two offsets that were erased flash while it was stranded, and its config intact.
  Its screen said the upgrade was complete, which was observed **before** the firmware path that emits
  that message had been found, and looking for what emitted it is what completed the state machine.
  **This project must still not be what performs the write**, and the reason changed on 6 September
  2026 without the conclusion changing. It used to be that "arch 9 has no write
  target"<!--superseded-->; arch 9 has one now, section 269, and what refuses this write is the
  **range**: the writable window runs from the configuration at `0x820000` to the log area at
  `0x870000`, so the EEPROM at `0x200000` and both firmware images below `0x820000` are outside it.
  Two writes have been performed, both a block of a remote's own bytes put back unchanged, and neither
  installed anything. **Installing firmware on an irreplaceable unit is not what a write path this
  young should be doing**, which is the argument that never rested on the rail.
  **Safe mode has a published entry procedure and it is a cold boot key test**, section 118: charge,
  pull the battery, hold Off, insert the battery while still holding, up to 30 seconds. So it involves
  no config, no host and no USB command, which is why searching the running firmware for it failed.
  The source is a third party repair business rather than Logitech, so **which key** it names is a
  hypothesis of the same standing as an upstream finding, and **the cheap confirmation is read only
  hardware on the spare One**. The mechanism itself is **read and closed**, section 189, and this
  entry had it backwards for a fortnight: the arch 12 internal bootloader **does** test a key, and
  saying it had "zero port reads so it does not test the key"<!--superseded--> came from a test whose
  guard discarded the one instruction that reads, a `MOVFF`, because a `MOVFF` has no addressing mode
  field. Section 87 had the right answer in `docs/findings.md` the whole time, so two sections of the
  one document that has never drifted contradicted each other, each with a passing test.

* **The Harmony One's bootloader is a USB flash programmer, and that is the recovery route**, section
  189. It scans the keypad before anything else, over the external memory bus rather than through a
  port; a byte of `0x0E` keeps it resident in a USB service loop that never returns, `0x1E` forces the
  image above `0x1000` to run without validating it, and **every path that does not hand off converges
  on that loop**, including the one taken when the image is gone. Twelve commands, `0x00` to `0x0A`
  plus `0xFF`, identical on the Harmony 600 down to the instruction sequence of the erase, so it is one
  programmer from one source rather than one reading. **It protects itself**: erase refuses any address
  below `0x001000`, which is the bootloader's own end, and has no upper bound. **Unlike arch 9 it
  copies nothing**, so entering recovery on a Harmony One destroys nothing and the Harmony 525's one
  way door does not transfer. **The limit is per level and section 191 moved it**: the
  **bootloader** writes only internal flash, through `EECON1` and `EECON2`, so it cannot restore a
  config, and this file said that of recovery as a whole for a few hours. The **safe mode image** one
  level up carries its own external flash programmer, 601 bytes byte identical to the resident library
  at `0x01E018` the application calls, with the AMD command set and separate erase and program gates.
  So a Harmony One **can** write the flash a config lives in. **And we can drive it, since section
  192**: safe mode is not a second protocol, its dispatcher carries six of the application's seven
  commands with the same command bytes and the same state numbers, absent only infrared capture, and
  both flash commands reach that programmer. So the restore route needs no protocol work and what is
  left is a rehearsal. The reassurance for a first write also
  sits elsewhere and is structural: a damaged config cannot reach the bootloader or the image, so the
  remote still boots and our own read path still works.

* **A flash address is classified before it is used, and that is the write protect interlock**, section
  192. One routine, three callers in every image where it is located, being the write, read and erase
  handlers: a top byte of `0xFE` or `0xFF` means internal program flash page `top & 1`, a top byte below
  the architecture's ceiling means the external medium, and anything else selects nothing. The ceiling
  is `0x40` on arch 12 (Harmony One) and `0x20` on arch 14, measured on both the Harmony 600 and the
  Harmony 700 images, so it states
  the size of the medium, and the arch 12 figure is section 47's log area bound reached by a second
  consumer with no shared code. **The interlock is a byte and it rests at refuse**, so a rejected
  address is a no operation rather than a write elsewhere, and it **composes** with section 175's bit
  rather than replacing it: that bit decides whether a write below `0x020000` proceeds and this routine
  decides whether a request means that region, whose whole reach is exactly `[0x000000, 0x020000)`.
  **On arch 12 the top byte is a page number and not an address**: it is written biased by three to a
  register at external `0x020025` and then replaced by `0x13`, which leaves sixteen bits of offset and
  is where the 64 KiB erase block comes from.

* **The external flash programmer is at internal `0x01E000` and we have held it since section 22**,
  section 191, which is where section 186's blind reviewer said the instruction "is not in anything this
  project holds". True of the review packet, which deliberately excluded the internal pages, and false
  of the repository, so **a blind reviewer's statement is scoped to the packet** and copying one out of
  that scope is how a withhold list produces a wrong claim rather than a missing one. It also closes
  section 186's other half: erase and program are separate gates, so **neither bench architecture erases
  before it programs** and the caller erasing is measured on both.

* The other two arch 12 measurements from section 118 stand: the safe mode image does read the
  matrix, and the config base reaches `TBLPTRU` from a variable with no literal anywhere.
