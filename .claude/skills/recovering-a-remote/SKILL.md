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

**One write has been performed here**, section 222, and it put a block of a remote's own bytes back
unchanged, so no route below has ever been exercised in anger and every one of them is a reading
of firmware plus, in one case, a recovery somebody performed by hand from the private lab. A route
that has not been exercised is a prediction.

**Entering safe mode is not free on every model.** On the Harmony 525 it destroys the application
firmware, and a power cycle does not leave it. That is the one-way door in this file and the reason
the rail demanding a verified dump is what separates a recoverable remote from a lost one.

**A damaged configuration cannot reach the bootloader or the safe mode image**, so a remote whose
config is wrong still boots and our own read path still works. That is the structural reassurance
behind a first write, and it is worth more than any of the arguments below.

Moved out of `CLAUDE.md` on 29 August 2026, where nine and a half thousand characters of firmware
reading sat in every session's context to answer a question that only arises when something has gone
wrong or is about to.

## The routes

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
  **This project must still not be what performs the write**: its one write was to arch 12 and changed
  nothing, section 222, arch 9
  has no write target, and a first write should not install firmware on an irreplaceable unit.
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
