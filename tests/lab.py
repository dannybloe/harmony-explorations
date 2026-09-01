"""
Locating the binaries the tests need.

Firmware and config binaries are not in this repository: they are proprietary, and the
archived packages they came from also contain a third party's account details. So tests
that need them look for a local copy and skip cleanly when there is none.

Set HARMONY_LAB to the private working directory. If it is unset, a `lab` directory
alongside the repository is used when one exists:

    export HARMONY_LAB=/path/to/lab
    make test

Files are located by name anywhere beneath that directory, so the corpus can be arranged
however suits it. See reference/checksums.md for what the names refer to.
"""
import glob
import json
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, '..', 'src'))


def _default_lab():
    sibling = os.path.normpath(os.path.join(_HERE, '..', '..', 'lab'))
    return sibling if os.path.isdir(sibling) else None


LAB = os.environ.get('HARMONY_LAB') or _default_lab()

# Logical name -> filename, as named in reference/checksums.md.
IMAGES = {
    'one34_code': 'one-3.4-code-base0x20000.bin',
    # The 525's whole internal program flash, read over USB on 8 August 2026: the bootloader at
    # 0x0000 and the application from 0x1000. It loads at 0x0000, so no base has to be guessed,
    # and it is the only arch 9 firmware this project has. findings.md sections 76 and 80.
    'h525_code': '20260808-harmony-525-internal-0x0000.bin',
    # The first arch 8 firmware this project has ever held, two images of one build differing in
    # two bytes: the skin, 0x0F for the 880 and 0x11 for the 885. Contributed on 10 August 2026
    # through harmony-decompiler discussion 17, dumped with `concordance -b -f`, which works on
    # arch 8 precisely where it fails on arch 12 and 14. They load at 0x010000. Sections 113
    # and 114.
    'arch8_code_880': 'H880-firmware.bin',
    'arch8_code_885': 'H885-firmware.bin',
    # What `concordance --dump-safemode` returns on arch 8, and **it is not safe mode**: both
    # images declare software type 3, which Logitech's own firmware package calls Boot mode,
    # where arch 12 and arch 14 safe mode declares 4. So these are bootloaders. They carry the
    # reset vector the application images lack, load at 0x000000, and hand both interrupt
    # vectors to the application at 0x010400 and 0x010800. Section 116. Named for what they
    # hold rather than for the flag that produced them, which is the third time a file called
    # "safe" on this project has held something else.
    'arch8_boot_880': 'H880-safemode.bin',
    'arch8_boot_885': 'H885-safemode.bin',
    # The 64 KiB below the staged application, read over USB on 8 August 2026. Named "the safe mode
    # application" in checksums.md on the strength of its `HG` header alone, and that label was
    # confirmed three days later by a remote stranded in safe mode reporting five accessor values
    # that are inside this image and inside no other. Section 118.
    'h525_safemode_firmware': '20260808-harmony-525-flash-800000.bin',
    # The 525's whole external firmware region, read over USB on 8 August 2026: the staged
    # application from 0x810000 and the arch 9 safe mode container at +0x8000 that section 76 cut
    # out of it.
    'h525_external_firmware': '20260808-harmony-525-flash-810000.bin',
    # The second internal program page of the three bench remotes, whole, as read over USB and
    # verified against each unit's backup. `0xFF` in the protocol's addressing, and the page that
    # holds the per unit blocks Logitech's client names: a serial, key timing, unit, keypad, display
    # and power settings, a battery calibration and a manufacturing identifier, at 0xF400 and every
    # 0x40 after it. Section 150 is what they turn out to hold, which is almost nothing.
    'one_page_ff': 'one-internal-ff-full.bin',
    'one_spare_page_ff': 'one2-internal-ff-full.bin',
    'h600_page_ff': '600-internal-ff-full.bin',
    # The same staged application, read again on 11 August 2026 while the remote was stranded in
    # safe mode. Kept alongside rather than replacing anything, because its whole value is the
    # comparison: it is byte identical to the other two copies, which is how we know entering safe
    # mode erased internal program flash and left external flash alone. Section 118.
    'h525_staged_firmware': '20260811-harmony-525-flash-810000-safemode.bin',
    'one34_region2': 'one-3.4-Region_2-decoded.bin',
    'one_safemode': 'one-safemode-gspm-base0x2000-raw64k.bin',
    'h700_code': '700-2.8-Region_2-code-base0x9000.bin',
    'h700_gspm': '700-2.8-Region_3-gspm-base0x20000.bin',
    'h600_code': '600-0.2-code-base0x9000-TRUNCATED64k.bin',
    # The same image, complete, read off the remote across both internal pages. Kept alongside the
    # truncated one rather than replacing it: the agreement between the two is the evidence.
    'h600_code_complete': '600-0.2-code-base0x9000-COMPLETE.bin',
    # The Harmony One's 0xFE internal page, read off the spare remote: the bootloader and the
    # image at +0x1000, which no package in the corpus contains because arch 12 runs its
    # application from external NOR. The 0xFF page is deliberately absent from this table, since
    # it holds that unit's identity block.
    'one_internal_fe': 'one-3.4-internal-page-fe.bin',
    # The 600's 0xFE page: bootloader, the safe mode image at +0x1000 that nothing had read before,
    # and the application firmware from +0x9000. Its 0xFF page is absent for the same reason as the
    # Ones': it holds the identity block.
    'h600_internal_fe': '600-0.2-internal-page-fe.bin',
    # The 600's safe mode config, read off its external flash at 0x020000. That address had only
    # ever been established from the 700's update package, so this is the arch 14 layout confirmed
    # on the model it is claimed for. 8192 bytes as read; the container is the first 7115.
    'h600_safemode_gspm': '600-0.2-safemode-gspm-base0x20000.bin',
    # The Harmony 650 update package, the third and last published Harmony firmware. It sat in
    # reference/checksums.md as "not yet analysed, arch 15" until the package was opened; it is
    # arch 14, so arch 14 has three firmware images and three safe mode configs where arch 12 has
    # one of each.
    'h650_code': '650-0.4-Region_2-code-base0x9000.bin',
    'h650_safemode_gspm': '650-0.4-Region_3-gspm-base0x20000.bin',
    # The Harmony 300 and Harmony 350 firmware, fetched from Logitech's own software update
    # service on 28 August 2026, section 196. **The fourth published Harmony firmware and the
    # first that did not come from a third party repair site**: the service serves it under
    # skin 104 and its own manifest names skins 78, 79 and 104, so one image covers both models.
    # A plain PIC18 image executing at 0x9000, like every arch 14 one, which is why the file name
    # follows their convention.
    'h350_code': '350-1.4-Region_2-code-base0x9000.bin',
    # The same firmware as the vendor serves it, ZIP and all, so a test can start from the
    # artefact rather than from a file this project produced out of it. Its Description.xml is
    # what states the checksum seed and algorithm that section 41 derived from config trailers.
    'h350_package': 'skin104-harmony350-production-1.4.0.0',
    'one_hfw': 'harmony_one_firmware_3_4.hfw',
    'h700_hfw': 'harmony_700_firmware_2_8.hfw',
    'h650_hfw': 'harmony_650_firmware_0_4.hfw',
    # Config dumps out of the corpus. The two public sample sets are mirrored from
    # harmony-decompiler; the rest are dumps of specific remotes, so their file names are
    # whatever the contributor's concordance run produced.
    'h525_config': 'config.EZHex',
    # The bench 525's own config, read over USB on 8 August 2026. findings.md section 76.
    'h525_config_2': '20260808T1645Z-harmony-525-config.bin',
    # The arch 9 safe mode container, cut out of the 525's firmware region at flash 0x818000.
    # Deliberately not in CONTAINERS: it is the sample the corpus wide claims are re-derived
    # against, and two of them are still open, base slot 1's extent and the log area's range.
    'h525_safemode_ahcm': '20260808-harmony-525-safemode-ahcm.bin',
    'arch8_config_a': 'Update.EZHex',
    'arch8_config_b': 'Update-1.EZHex',
    'arch8_config_c': 'Update-2.EZHex',
    'arch8_config_d': 'Update-3.EZHex',
    # Two of the eleven configs kkong42 posted on 10 August 2026. Deliberately in IMAGES and not
    # in CONTAINERS: adding them there would move every coverage figure in one commit. They **are**
    # in USER_CONFIGS since section 140, because the reading of them is no longer unexamined: they
    # supplied four of the five counterexamples that sweep found, including the 55 scan codes the 885
    # binds where every skin 15 config binds 53.
    # The 885 is the case that breaks the tie, since 0x0F reads as 15 under either rule and 0x11
    # does not. The 890 is arch 10, a fourth format version and 23 pointer slots.
    'arch8_config_885': 'H885-LivingRoom.EZHex',
    # The 880 config the contributor wrote a full description sheet for, harmony-decompiler issue 18
    # and this dump's own META.md: four devices, four activities, and the custom buttons of each with
    # their page breaks. It is the **first labelled sample on arch 8**, so it is what the inventory
    # reader is checked against rather than another unlabelled file.
    'arch8_config_880': 'H880-Bedroom.EZHex',
    'h890_config': 'H890-Bedroom-1.EZHex',
    # The Harmony 895, arch 10, contributed as issue 34 on 25 August 2026 and the **first arch 10
    # sample whose contents its owner stated**: six devices and five activities, named in the issue.
    # That makes it the calibration case the slot mapping search never had, and section 178 is what
    # it settled. Read 2 of five, the consensus: reads 2, 4 and 5 are byte identical where 1 and 3
    # differ, which is section 122's arch 10 read corruption mitigated by reading five times.
    'h895_config': 'H895-Read-2.EZHex',
    # A second read of the same remote, ten hours later. Its container is byte identical and the file
    # is 594 bytes shorter, all of it trailing slack past the trailer, so this is what a **stable**
    # arch 10 read looks like and it is the control for the pair below. Section 122.
    'h890_config_rescan': 'H890-Bedroom-1-New.EZHex',
    # The second 890, and it is here for being **inconsistent with itself**: its header declares an
    # end 864 bytes before its own end marker, and its trailer checksum does not recompute under any
    # extent tried. It is what turned the circular base check into one that can fail. Section 117.
    'h890_config_2': 'H890-Bedroom-2.EZHex',
    # A second read of **that** remote, and the pair is the finding: this one puts the end marker 108
    # bytes past the declared end where the first put it 864, and recomputes a different checksum,
    # while both declare the same header, the same 23 pointers and the same clock record byte for
    # byte. So it is one config read twice, and what separates the reads is **whole 54 byte chunks
    # duplicated**, 16 in the first and 2 in this one, with nothing lost. Remove them and this file
    # verifies. Section 122, which is where section 117's writer rail came off.
    'h890_config_2_rescan': 'H890-Bedroom-2-New.EZHex',
    # Three more reads of the same remote, contributed on 12 August 2026 after section 122 was
    # written, which is what makes them the out of sample test of it: 11, 13 and 17 chunks over the
    # config where the prediction was a whole number and nothing else. All three are damaged, none
    # verifies, and all three repair to the same 396225 bytes the other two do. The file extension is
    # the contributor's own typo and is left as sent, because a name that has to be corrected to be
    # found is a name that does not match the issue it came from.
    'h890_config_2_redump_1': 'H890-Bedroom-2-Redump-1.EZHez',
    'h890_config_2_redump_2': 'H890-Bedroom-2-Redump-2.EZHez',
    'h890_config_2_redump_3': 'H890-Bedroom-2-Redump-3.EZHez',
    'one_config': 'harmony-one-programmed-config.EZHex',
    'one_config_unprogrammed': 'harmony-one-config.EZHex',
    'h600_config': 'harmony-600-programmed-config.EZHex',
    # Two configs of the same Harmony 700, posted together by their owner. The only controlled
    # pair in the corpus: same remote, one documented change between them.
    'h700_config': 'harmony700.EZHex',
    'h700_config_2': 'harmony700-2.EZHex',
    # The spare Harmony One either side of a sync, 7 August 2026. The change was decided and
    # written down before it was made, which no other pair here can say, and the second half was
    # compiled by the live service rather than found. findings.md section 58.
    'one_spare_before_sync': 'one-spare-before-sync-config.bin',
    'one_spare_after_sync': 'one-spare-after-sync-config.bin',
    # A third state of that same unit, 23 August 2026: Danny's real Classic era configuration,
    # imported into a MyHarmony account and synced onto it by Logitech's own software. The richest
    # known answer sample here, since the account behind it can be queried for every name a reader
    # extracts. Five devices and seven activities. Out of the corpus wide lists. Section 155.
    'one_spare_myharmony': 'one-spare-myharmony-config.bin',
    # A fourth state of that same unit, read on 30 August 2026 because the write rehearsal refused:
    # the remote held a configuration none of the three above matches, six devices and 475 codes
    # against the newest one's five and 418, so something was added and synced onto it after 23
    # August and nothing dumped it afterwards. Named because the rehearsal takes its dumps by name.
    # Out of the corpus wide lists, like the three above it.
    'one_spare_20260830': '20260830T1430Z-harmony-one-spare-config.bin',
    # The same unit read again after the first write this project ever performed, section 222: one
    # 64 KiB block of its own configuration erased and put back unchanged on 30 August 2026. Byte
    # identical to one_spare_20260830, which is why it is kept and why it is excluded from the
    # parseable population.
    'one_spare_after_first_write': '20260830T1618Z-harmony-one-spare-after-first-write-config.bin',
    # The same unit again, read on 1 September 2026 after the first write that **changed** something:
    # two power on delay operands raised, in one 64 KiB block, checksum neutral because both sit at
    # the same word parity. It is one_spare_20260830 plus exactly those two bytes, so it is excluded
    # from the parseable population for the same reason the row above is.
    'one_spare_20260901_delay': '20260901T0555Z-one-spare-20260831-delay-config.bin',
    # And the state after the second changing write an hour later, section 236: the receiver's power
    # on delay raised from six seconds to ten, which is the change that could be seen. Excluded from
    # the parseable population like the two rows above it.
    'one_spare_20260901_denon': '20260901T0645Z-one-spare-denon-delay-config.bin',
    # Two configs Logitech compiled to a specification we wrote, 13 August 2026, and the corpus's only
    # **known answer** samples: three devices and two activities chosen by us, on a throwaway account,
    # then compiled by the live service and downloaded without a byte reaching a remote. Section 132.
    # Deliberately not in CONTAINERS: that population is what every corpus wide total is computed from,
    # so growing it is its own step, and these two are synthetic and are two states of one
    # specification. The lab directory's META.md has the full argument.
    'calibration_one': 'calibration-one-spare.bin',
    'calibration_h600': 'calibration-h600.bin',
    # The third, 23 August 2026: the same account and the same Harmony One as `calibration_one` with
    # three favourite channels added and nothing else, so the pair is a before and after over one
    # logical change. The first config anywhere to populate base slot 16. Section 154.
    'calibration_favchannels': 'calibration-favchannels.bin',
    # The fourth, 23 August 2026, and the first from the **second** test account: Danny's spare Harmony
    # One with five favourite channels, two of them written with a leading zero. Those two do not use
    # base slot 16 at all, they send one digit code each in order, which is what this sample settled.
    # Six devices, one of them referenced by no activity, which refutes the note that the generator
    # drops such a device. Section 156.
    'calibration_favzero': 'calibration-favzero.bin',
    # The fifth, 24 August 2026, and the largest: fifteen appliances chosen so that every protocol family
    # in Logitech's catalogue that the corpus could not settle appears in it, compiled by their own
    # generator. Eighteen of the rhythm table's entries are measured off it, sections 160 to 163. Filed
    # **Renamed twice, and both times the name was saying something false.** Their service hands it back as
    # `Result.EzHex`, and eight files in this lab carry that name, so a lookup by it resolves to whichever
    # the walk reaches first, which is the trap SERVICE_RESPONSES below is addressed by path to avoid. It
    # is also not an EZHex: no XML header at all, just the bare container, which is what section 132 said
    # the download is. Section 165. Read by the TypeScript side only, like the command list below.
    'compiled_protocols': 'compiled-20260824-protocols-gspm.bin',
    # The second of them, the same evening. Its catalogue capture is filed **beside it** rather than at
    # the working directory path the capture script writes to, which is the fix for the second capture
    # having overwritten the first sample's.
    'compiled_protocols_2': 'compiled-20260824b-protocols-gspm.bin',
    'compiled_protocols_3': 'compiled-20260824c-protocols-gspm.bin',
    # The phase 7 pair, 25 August 2026: the calibration account's Harmony One compiled without and
    # with the LG 42LM3400, nothing else changed between the two. Read by the TypeScript side, where
    # the composer under comparison lives. Section 174.
    'phase7_before': 'phase7-before-gspm.bin',
    'phase7_after': 'phase7-after-gspm.bin',
    # A Harmony 350, read off the remote on 27 August 2026 with concordance, since this project's own
    # transport does not reach the file based family at all: its config is a named file rather than a
    # flash address, `reference/models.md`. **Architecture 16, and the first container here from it.**
    # It parses with every framing check passing, which is what section 194 came out of.
    #
    # **Deliberately outside CONTAINERS, ALL_CONTAINERS and USER_CONFIGS**, on the precedent the
    # calibration pair set: those populations are what every corpus wide total is computed from, and
    # admitting a sixth architecture would move sixteen marked numbers across five documents. Whether
    # to admit it is a decision, not a side effect of filing a dump. It is also somebody else's
    # configuration, built 20 July 2026 by the previous owner, so it stays in the lab like any
    # contributed dump.
    'h350_config': 'harmony-350-config.bin',
    # The account's own command list, captured 13 August 2026: a name and a stated code per command.
    # Read by the TypeScript side, where the frame decoder lives; named here so the two tables agree.
    'account_commands': 'GetCommands_mine.json',
    # Not an image and not a config: Harmony Desktop's whole hosted client, mirrored from Logitech's
    # content network on 9 August 2026 and unauthenticated. It is here because the service API surface
    # documented in `docs/host-client.md` is extracted from it, and a claim about that surface has to
    # be recomputable rather than transcribed. Logitech's expression, so it stays in the lab: what
    # travels is the list of operation names, which is functional fact. `software/desktop-webapp`.
    'desktop_webapp_main': 'en.desktop-app-main.js',
    # MyHarmony decompiled to C#, three files of the sync flow. **The reference client**, decision 2:
    # their code and the firmware are both read before anything is derived, and this is the client
    # half. Named here because sections 202 and 203 are claims about what this code does, and a claim
    # about a source that nobody can recompute is a transcription. Logitech's expression, so it stays
    # in the lab and nothing of it is quoted: what travels is which operation is called and on what
    # condition, which is functional fact. `work/myharmony/src`.
    'myharmony_sync_model': 'RemoteSyncUserControlModel.cs',
    'myharmony_update_manager': 'RemoteUpdateManager.cs',
    'myharmony_ds_controller': 'DSController.cs',
    # Not an image and not a config: the wire log of Logitech's own classic client reading a Harmony
    # One, captured 7 August 2026 by running the client rebuilt from its own decompiled source against
    # a local stand-in for its discontinued server. Read by the TypeScript side, where the command
    # encoder lives; named here so the two tables agree. `software/classic/reports/run.log`.
    'classic_read_capture': 'run.log',
    # The classic client's three single byte memory services, decompiled: RAM, on chip EEPROM and
    # internal program memory. Section 211 is a claim about what this code does, and a claim about a
    # source nobody can recompute is a transcription. Logitech's expression, so it stays in the lab
    # and nothing of it is quoted: what travels is which bound each asserts and what it does after a
    # write, which is functional fact. `software/classic/src/hidcommands/.../services/core/memory`.
    'classic_ram_service': 'RamHidService.java',
    'classic_eeprom_service': 'EepromHidService.java',
    'classic_program_service': 'ProgramHidService.java',
    # Five more of the same client's HID services, section 213: the shared base every one of them
    # sends through, the flash service holding the write transfer, the system service with the
    # identity block erase, the state variable service and the diagnostic service the liveness ping
    # goes to. Their code stays in the lab; what travels is functional fact.
    'classic_hid_base': 'AbstractHidService.java',
    'classic_flash_service': 'FlashHIDService.java',
    'classic_system_service': 'SystemHidService.java',
    'classic_state_service': 'StateVariableHidService.java',
    'classic_diagnostic_service': 'DiagnosticHidService.java',
    # The update service, section 214. Section 210 mined its write transfer without registering
    # it; this fixture is for the other half, the region address and size table, which is the
    # source end of the closure in packages/usb/test/classic-capture.test.ts.
    'classic_update_service': 'UpdateHidService.java',
    # Two flash regions off the spare Harmony One, read by Logitech's own client rather than by
    # anything here, section 215. The user config region is the first independent check this
    # project has ever had on packages/corpus/src/read.ts; the embedded one has no counterpart.
    'vendor_region_user_config': 'vendor-region4-user-config.bin',
    'vendor_region_embedded_config': 'vendor-region3-embedded-config.bin',
}

_cache = {}


def _find(filename):
    """First match for `filename` anywhere under LAB, or None."""
    if filename in _cache:
        return _cache[filename]
    found = None
    if LAB and os.path.isdir(LAB):
        for root, dirs, files in os.walk(LAB):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            if filename in files:
                found = os.path.join(root, filename)
                break
    _cache[filename] = found
    return found


# Every config container in the corpus, in the order the coverage report prints them. One list,
# because the same nineteen are walked by the Python tests, by
# `packages/codec/test/coverage.test.ts` and by `tools/facts.py`, and a corpus total is only
# comparable between them if they agree on what the corpus is.
#
# **It was fifteen until 14 August 2026**, and the four it left out are the Harmony One sync pair and
# the two containers found inside the arch 12 (Harmony One) firmware images. The sync pair was excluded
# on the argument that two dumps of one remote would count one unit twice in every total. That argument
# was **decided against**, section 142, on two grounds: a corpus wide total measures what
# a reader can read and not how many remotes exist, so the unit is the container; and the two dumps are
# genuinely different files, since Logitech's own software wrote a config between them, which is what
# made that pair the evidence for section 58. The TypeScript side had been counting all nineteen the
# whole time, so this is one definition replacing two rather than a widening.
# Fixtures that parse as a container but must not join a corpus wide population, because the
# container they parse to is **already in it under another name**. Section 215.
#
# `vendor_region_user_config` is the whole user config region of the spare Harmony One as Logitech's
# own client read it, and `gspm.parse` trims to the declared end, so it parses to a body of exactly
# 1232237 bytes: byte for byte the same container as `one_spare_before_sync`. That identity is the
# **point** of keeping the file, and it is precisely why counting it would be wrong. Admitting it
# moved `parseable_containers` and `odd_body_verifying` by one each, and both moves were one config
# counted twice.
#
# **The embedded config beside it is excluded too, and this note said the opposite for an hour.** It
# was admitted on the strength of a search that found no counterpart, and the search was wrong: it
# looked only under `dumps/` and only at files below 200 KB, while the counterpart is `one_safemode`,
# cut out of a firmware image and living elsewhere. Their bodies are identical, all 8902 bytes, and
# the golden vectors differ only in where the container sits in its file, 0 against 8192.
#
# That makes it a duplicate for counting purposes and **better evidence than the new container it was
# mistaken for**: one copy came out of the programmed Harmony One's firmware image and the other off
# the spare unit through Logitech's client, so the two agreeing confirms both that our cut was made in
# the right place and that the embedded config is the same on two units.
PARSEABLE_EXCLUDED = ('vendor_region_user_config', 'vendor_region_embedded_config',
                      'one_spare_after_first_write', 'one_spare_20260901_delay',
                      'one_spare_20260901_denon')

CONTAINERS = (
    'h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'h525_config_2', 'one_config',
    'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
    'arch8_config_d', 'h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm',
    # In the corpus deliberately, and it is the one member that breaks two corpus wide habits:
    # its font sets start at code 32 and declare four different counts. Excluding it would leave
    # the corpus agreeing with itself, which is exactly the condition that hid the first glyph
    # code for a month. Sections 77 and 78.
    'h525_safemode_ahcm',
    # Two states of one Harmony One, either side of the sync section 58 watched.
    'one_spare_before_sync', 'one_spare_after_sync',
    # The two containers inside the arch 12 (Harmony One) 3.4 image: the safe mode container at flash
    # 0x002000, and the config region.
    'one_safemode', 'one34_region2',
)

# Every **user** config: what a remote was actually programmed with, so no safe mode container and
# nothing from arch 10 (Harmony 890), where every reader is gated because the slot mapping is not
# established. Unlike `CONTAINERS` this **does** include the two Harmony One sync-pair dumps, because
# a claim of the form "this holds in every config" is about configs and not about units, and it is
# not a corpus wide total that double counting could distort.
#
# **It exists because eight test classes each carried their own literal** of seven, nine or ten
# names, while `docs/config-format.md` said "ten configs across four architectures" throughout and
# the lab holds fifteen. Two of them, `arch8_config_880` and `arch8_config_885`, were read by the
# TypeScript suite and by the golden vectors and by no assertion on this side at all. A population
# nobody compares is a population that drifts, which `TheCorpusWidePopulationsAgree` already says of
# the four container lists and now says of this one against its TypeScript mirror.
# `docs/findings.md` section 140.
USER_CONFIGS = (
    'h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'h525_config_2', 'one_config',
    'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync',
    'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
    'arch8_config_880', 'arch8_config_885',
)

# Every container a per container claim is made over. It differs from `CONTAINERS` by exactly two
# names now, section 142, where it used to differ by six: the arch 8 (Harmony 880 and 885) configs are
# containers and are outside the corpus wide totals, because adding them there moves every coverage
# figure and that is its own step with its own reading to check.
#
# **The two languages disagreed about what the corpus is and nothing compared them**, section 141,
# which is the defect `TheCorpusWidePopulationsAgree` was written for, one boundary further out: the
# four TypeScript lists held nineteen while `CONTAINERS` held fifteen, and each side's own totals
# stayed self consistent so no test could see it. `CONTAINERS` is the nineteen now and the check is an
# equality rather than a containment.
#
# What stays out of both, and why, so that "every container" is a statement and not a shrug. Arch 10
# (Harmony 890): every reader is gated, because the slot mapping is not established. The calibration
# pair: they are synthetic and deliberately outside every corpus wide figure. Firmware images:
# `gspm.parse` is permissive enough to accept several of them, which is why this is a list rather than
# a filter.
ALL_CONTAINERS = CONTAINERS + ('arch8_config_880', 'arch8_config_885')

# The one container whose fonts do not follow the generator's conventions. Named here rather than
# spelled out in each test, so a claim that has to exclude it says why.
ASCII_FONTS = 'h525_safemode_ahcm'


#: Where the captured replies from Logitech's live service sit, relative to the lab root.
#:
#: **Addressed by path and not through `IMAGES`**, unlike everything else here, and for a measured
#: reason: `_find` walks the lab for a bare filename and takes the first hit, and four of these
#: filenames exist four times over, once per account the measurement used. Those captures are from
#: different accounts and say different things, so the first hit is the wrong answer three times in
#: four and the walk order is the file system's business rather than ours. One directory, named.
SERVICE_RESPONSES = ('work', 'myharmony', 'responses')

#: The second account's captures, which sit in their own directory rather than in the one above.
#:
#: The probe derives the directory from the account selector precisely so one account's replies
#: cannot be written over another's, so a reply from the second account is reached by naming the
#: account and not by hoping a suffixed filename was used. Section 220 is the first test to need it.
SERVICE_RESPONSES_ACCOUNT2 = ('work', 'myharmony', 'responses-account2')

#: Which directory each account selector's replies land in, so a caller says `account=2` rather
#: than knowing the layout.
SERVICE_RESPONSE_DIRS = {1: SERVICE_RESPONSES, 2: SERVICE_RESPONSES_ACCOUNT2}

#: Logitech's own per skin protocol templates, inside the mirrored desktop client. Section 197.
#:
#: **Addressed by path for the same measured reason as the replies above**, and more sharply:
#: `identifyremote.xml` exists in fourteen of the twenty three skin directories and says something
#: different in each, so a bare filename walk returns whichever the file system offers first. The
#: build identifier in the middle of the path moves when Logitech publishes, so it is discovered
#: rather than named.
CLIENT_TEMPLATES = ('software', 'desktop-webapp', 'mirror')
_TEMPLATE_TAIL = ('opt', 'desktop-app-scripts', 'libs', 'ds', 'templates')


def template_path(skin, name):
    """Absolute path to one protocol template, or None when the lab has not got it.

    `skin` is the number Logitech's directory name carries, so 54 for a Harmony One and 99 for a
    Harmony Touch. The build directory between the mirror root and `opt` is globbed, because it is
    a publication identifier and pinning it would break on the next mirror.
    """
    if not LAB:
        return None
    root = os.path.join(LAB, *CLIENT_TEMPLATES)
    if not os.path.isdir(root):
        return None
    for build in sorted(os.listdir(root)):
        for version in sorted(glob.glob(os.path.join(root, build, '*', '*'))):
            p = os.path.join(version, *_TEMPLATE_TAIL, 'SKIN%d' % skin, name)
            if os.path.isfile(p):
                return p
    return None


def template(skin, name):
    """One protocol template as text, or raise SkipTest when the lab has not got it."""
    p = template_path(skin, name)
    if not p:
        raise unittest.SkipTest(
            'no SKIN%d/%s in the mirrored client (searched: %s)'
            % (skin, name, LAB or 'nothing, HARMONY_LAB unset'))
    with open(p, encoding='utf-8-sig') as fh:
        return fh.read()


def template_skins():
    """Every skin directory the mirrored client carries, as integers, or an empty tuple."""
    p = template_path(54, 'identifyremote.xml')
    if not p:
        return ()
    base = os.path.dirname(os.path.dirname(p))
    return tuple(sorted(int(d[4:]) for d in os.listdir(base)
                        if d.startswith('SKIN') and d[4:].isdigit()))


def template_names(skin):
    """Every template file name for one skin, or an empty tuple when the lab has not got it."""
    p = template_path(54, 'identifyremote.xml')
    if not p:
        return ()
    base = os.path.join(os.path.dirname(os.path.dirname(p)), 'SKIN%d' % skin)
    if not os.path.isdir(base):
        return ()
    return tuple(sorted(f for f in os.listdir(base) if f.endswith('.xml')))


def require_templates(*pairs):
    """Skip up front unless every (skin, name) pair is present, mirroring `require`."""
    missing = ['SKIN%d/%s' % pair for pair in pairs if not template_path(*pair)]
    if missing:
        raise unittest.SkipTest('the mirrored client is missing %s' % ', '.join(missing))


def path(name):
    """Absolute path to a named image, or None when it is not available."""
    return _find(IMAGES[name])


def response_path(filename, account=1):
    """Absolute path to a captured service reply, or None when the lab has not got it."""
    if not LAB:
        return None
    p = os.path.join(LAB, *SERVICE_RESPONSE_DIRS[account], filename)
    return p if os.path.isfile(p) else None


def response(filename, account=1):
    """One captured service reply, parsed, or raise SkipTest when the lab has not got it.

    The replies carry a byte order mark, which `json.loads` refuses by name, so the encoding is
    stated here once rather than in every caller.
    """
    p = response_path(filename, account)
    if not p:
        raise unittest.SkipTest(
            'no %s captured for account %d; set HARMONY_LAB (searched: %s)'
            % (filename, account, LAB or 'nothing, HARMONY_LAB unset'))
    with open(p, encoding='utf-8-sig') as fh:
        return json.load(fh)


def require_responses(*filenames, account=1):
    """Skip the whole test unless every named reply is present, per `require`'s own argument."""
    missing = [f for f in filenames if not response_path(f, account)]
    if missing:
        raise unittest.SkipTest(
            'no %s captured for account %d; set HARMONY_LAB (searched: %s)'
            % (', '.join(missing), account, LAB or 'nothing, HARMONY_LAB unset'))


def load(name):
    """Bytes of a named image, or raise SkipTest when it is not available."""
    p = path(name)
    if not p:
        raise unittest.SkipTest(
            'no %s found; set HARMONY_LAB (searched: %s)'
            % (IMAGES[name], LAB or 'nothing, HARMONY_LAB unset'))
    with open(p, 'rb') as fh:
        return fh.read()


def require(*names):
    """Skip the whole test unless every named image is present.

    Call this before a loop that ends in a corpus wide assertion. `load` raises SkipTest, but
    **inside `subTest` unittest skips only that subtest and carries on**, so a loop of subTests
    finishes having loaded nothing and the total afterwards is asserted against zero. That is not
    a clean skip, it is a failure, and it made nine tests fail in a checkout with no lab while the
    documents promised otherwise.

    Also the right call when a test hands a path to something that opens it itself, since `path`
    answers None rather than skipping.
    """
    missing = [IMAGES[name] for name in names if not path(name)]
    if missing:
        raise unittest.SkipTest(
            'no %s found; set HARMONY_LAB (searched: %s)'
            % (', '.join(missing), LAB or 'nothing, HARMONY_LAB unset'))
