/**
 * Locating the binaries the tests need.
 *
 * The mirror of `tests/lab.py`, with the same contract: firmware and config binaries are not
 * in this repository, so a test that needs one looks for a local copy and skips cleanly when
 * there is none. `HARMONY_LAB` points at the private working directory; failing that, a `lab`
 * directory alongside the repository is used when one exists.
 *
 * The image names are deliberately the same strings as the Python side uses, because the whole
 * point of the golden vector cross-check is that both suites read the same file and say the
 * same thing about it. A name that exists on one side only cannot be cross-checked at all.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = normalize(join(HERE, '..', '..', '..'));

function defaultLab(): string | undefined {
  const sibling = normalize(join(REPO_ROOT, '..', 'lab'));
  return existsSync(sibling) ? sibling : undefined;
}

export const LAB: string | undefined = process.env['HARMONY_LAB'] || defaultLab();

/**
 * Logical name to filename, as named in `reference/checksums.md`.
 *
 * Kept in step with `IMAGES` in `tests/lab.py`; `packages/lab/test/parity.test.ts` fails if the
 * two drift apart, which is cheaper than discovering a missing golden vector months later.
 */
export const IMAGES: Readonly<Record<string, string>> = {
  one34_code: 'one-3.4-code-base0x20000.bin',
  // The 525's whole internal program flash, read over USB on 8 August 2026: the bootloader at
  // 0x0000 and the application from 0x1000. The only arch 9 firmware this project has, and a
  // PIC18F4550, so a listing needs `--part 4550`. findings.md sections 76 and 80.
  h525_code: '20260808-harmony-525-internal-0x0000.bin',
  // The first arch 8 firmware this project has ever held, two images of one build differing in
  // two bytes: the skin, 0x0F for the 880 and 0x11 for the 885. Contributed on 10 August 2026
  // through harmony-decompiler discussion 17, dumped with `concordance -b -f`, which works on
  // arch 8 precisely where it fails on arch 12 and 14. They load at 0x010000. Sections 113 and 114.
  arch8_code_880: 'H880-firmware.bin',
  arch8_code_885: 'H885-firmware.bin',
  // What `concordance --dump-safemode` returns on arch 8, and **it is not safe mode**: both images
  // declare software type 3, which Logitech's own firmware package calls Boot mode, where arch 12 and
  // arch 14 safe mode declares 4. So these are bootloaders. They carry the reset vector the
  // application images lack, load at 0x000000, and hand both interrupt vectors to the application at
  // 0x010400 and 0x010800. Section 116. Named for what they hold rather than for the flag that
  // produced them, which is the third time a file called "safe" here has held something else.
  arch8_boot_880: 'H880-safemode.bin',
  arch8_boot_885: 'H885-safemode.bin',
  // The 64 KiB below the staged application, read over USB on 8 August 2026. Named "the safe mode
  // application" in checksums.md on the strength of its `HG` header alone, and that label was
  // confirmed three days later by a remote stranded in safe mode reporting five accessor values that
  // are inside this image and inside no other. Section 118.
  h525_safemode_firmware: '20260808-harmony-525-flash-800000.bin',
  // The 525's whole external firmware region, read over USB on 8 August 2026: the staged application
  // from 0x810000 and the arch 9 safe mode container at +0x8000 that section 76 cut out of it.
  h525_external_firmware: '20260808-harmony-525-flash-810000.bin',
  // The second internal program page of the three bench remotes, whole, read over USB and verified
  // against each unit's backup. It holds the per unit blocks Logitech's client names, and section 150
  // is what they turn out to hold, which is almost nothing.
  one_page_ff: 'one-internal-ff-full.bin',
  one_spare_page_ff: 'one2-internal-ff-full.bin',
  h600_page_ff: '600-internal-ff-full.bin',
  // The same staged application, read again on 11 August 2026 while the remote was stranded in safe
  // mode. Kept alongside rather than replacing anything, because its whole value is the comparison:
  // it is byte identical to the other two copies, which is how we know entering safe mode erased
  // internal program flash and left external flash alone. Section 118.
  h525_staged_firmware: '20260811-harmony-525-flash-810000-safemode.bin',
  one34_region2: 'one-3.4-Region_2-decoded.bin',
  one_safemode: 'one-safemode-gspm-base0x2000-raw64k.bin',
  h700_code: '700-2.8-Region_2-code-base0x9000.bin',
  h700_gspm: '700-2.8-Region_3-gspm-base0x20000.bin',
  h600_code: '600-0.2-code-base0x9000-TRUNCATED64k.bin',
  // The same image, complete, read off the remote across both internal pages. Kept alongside the
  // truncated one rather than replacing it: the agreement between the two is the evidence.
  h600_code_complete: '600-0.2-code-base0x9000-COMPLETE.bin',
  // The Harmony One's 0xFE internal page. The 0xFF page is deliberately absent: it holds that
  // unit's identity block.
  one_internal_fe: 'one-3.4-internal-page-fe.bin',
  // The 600's 0xFE page. Its 0xFF page is absent: it holds the identity block.
  h600_internal_fe: '600-0.2-internal-page-fe.bin',
  // The 600's safe mode config, read off external flash at 0x020000, which had only ever been
  // established from the 700's package. 8192 bytes as read; the container is the first 7115.
  h600_safemode_gspm: '600-0.2-safemode-gspm-base0x20000.bin',
  // The Harmony 650 package, the third and last published Harmony firmware. Recorded as arch 15
  // until it was opened; it is arch 14, so arch 14 has three code images and three safe mode
  // configs where arch 12 has one of each.
  h650_code: '650-0.4-Region_2-code-base0x9000.bin',
  h650_safemode_gspm: '650-0.4-Region_3-gspm-base0x20000.bin',
  // The Harmony 300 and Harmony 350 firmware, fetched from Logitech's own software update service
  // on 28 August 2026, section 196. **The fourth published Harmony firmware and the first that did
  // not come from a third party repair site**: the service serves it under skin 104 and its own
  // manifest names skins 78, 79 and 104, so one image covers both models. A plain PIC18 image
  // executing at 0x9000 like every arch 14 one, which is why its file name follows theirs.
  h350_code: '350-1.4-Region_2-code-base0x9000.bin',
  // The same firmware as the vendor serves it, ZIP and all, so a test can start from the artefact
  // rather than from a file this project produced out of it.
  h350_package: 'skin104-harmony350-production-1.4.0.0',
  one_hfw: 'harmony_one_firmware_3_4.hfw',
  h700_hfw: 'harmony_700_firmware_2_8.hfw',
  h650_hfw: 'harmony_650_firmware_0_4.hfw',
  h525_config: 'config.EZHex',
  // The bench 525's own config, read over USB on 8 August 2026. The corpus's second arch 9 sample
  // and the first not published by a stranger, which is where the two sample standard starts.
  h525_config_2: '20260808T1645Z-harmony-525-config.bin',
  // The arch 9 safe mode container, cut out of the 525's own firmware region at flash 0x818000 on
  // 8 August 2026. Section 76 kept it out of the corpus because it contradicted six corpus claims;
  // section 77 read one of them and section 78 read four more, so what is left is base slot 1's
  // extent and the log area's range, both recorded rather than asserted. It is the only container
  // whose font sets do not start at code 1, which is what made that field readable at all.
  h525_safemode_ahcm: '20260808-harmony-525-safemode-ahcm.bin',
  arch8_config_a: 'Update.EZHex',
  arch8_config_b: 'Update-1.EZHex',
  arch8_config_c: 'Update-2.EZHex',
  arch8_config_d: 'Update-3.EZHex',
  // Two of the eleven configs kkong42 posted on 10 August 2026. Deliberately in IMAGES and not in
  // CONTAINERS: they are here as headers to check a skin against, and adding them to the corpus
  // would move every coverage figure in one commit with the reading of them unexamined. The 885 is
  // the case that breaks the tie, since 0x0F reads as 15 under either rule and 0x11 does not. The
  // 890 is arch 10, a fourth format version and 23 pointer slots.
  arch8_config_885: 'H885-LivingRoom.EZHex',
  // The 880 config with a written description behind it, issue 18: four devices, four activities and
  // the custom buttons of each. The first labelled arch 8 sample, so it is the one the inventory
  // reader is checked against.
  arch8_config_880: 'H880-Bedroom.EZHex',
  h890_config: 'H890-Bedroom-1.EZHex',
  // The Harmony 895, arch 10, contributed as issue 34 on 25 August 2026 and the **first arch 10
  // sample whose contents its owner stated**: six devices and five activities, named in the issue.
  // That makes it the calibration case the slot mapping search never had, and section 178 is what it
  // settled. Read 2 of five, the consensus: reads 2, 4 and 5 are byte identical where 1 and 3 differ,
  // which is the arch 10 read corruption of section 122 being mitigated by reading five times.
  h895_config: 'H895-Read-2.EZHex',
  // A second read of the same remote, ten hours later. Its container is byte identical and the file is
  // 594 bytes shorter, all of it trailing slack past the trailer, so this is what a **stable** arch 10
  // read looks like and it is the control for the pair below. Section 122.
  h890_config_rescan: 'H890-Bedroom-1-New.EZHex',
  // The second 890, here for being **inconsistent with itself**: its header declares an end 864 bytes
  // before its own end marker, and its trailer checksum does not recompute under any extent tried. It
  // is what turned the circular base check into one that can fail. Section 117.
  h890_config_2: 'H890-Bedroom-2.EZHex',
  // A second read of **that** remote, and the pair is the finding: this one puts the end marker 108
  // bytes past the declared end where the first put it 864, and recomputes a different checksum, while
  // both declare the same header, the same 23 pointers and the same clock record byte for byte. So it
  // is one config read twice, and what separates the reads is **whole 54 byte chunks duplicated**, 16
  // in the first and 2 in this one, with nothing lost. Remove them and this file verifies. Section 122,
  // which is where section 117's writer rail came off.
  h890_config_2_rescan: 'H890-Bedroom-2-New.EZHex',
  // Three more reads of the same remote, contributed on 12 August 2026 after section 122 was written,
  // which is what makes them its out of sample test: 11, 13 and 17 chunks over the config where the
  // prediction was a whole number and nothing else. All three are damaged and all three repair to the
  // same 396225 bytes. The extension is the contributor's own typo, left as sent.
  h890_config_2_redump_1: 'H890-Bedroom-2-Redump-1.EZHez',
  h890_config_2_redump_2: 'H890-Bedroom-2-Redump-2.EZHez',
  h890_config_2_redump_3: 'H890-Bedroom-2-Redump-3.EZHez',
  one_config: 'harmony-one-programmed-config.EZHex',
  one_config_unprogrammed: 'harmony-one-config.EZHex',
  h600_config: 'harmony-600-programmed-config.EZHex',
  h700_config: 'harmony700.EZHex',
  h700_config_2: 'harmony700-2.EZHex',
  // The spare Harmony One either side of a sync, 7 August 2026. findings.md section 58.
  one_spare_before_sync: 'one-spare-before-sync-config.bin',
  one_spare_after_sync: 'one-spare-after-sync-config.bin',
  // A third state of that same unit, 23 August 2026: Danny's real Classic era configuration,
  // imported into a MyHarmony account and synced onto it by Logitech's own software. **The richest
  // known answer sample here**, because the account behind it is one we hold credentials for, so
  // every device and activity name a reader extracts can be checked against what Logitech says the
  // account holds. Five devices and seven activities against the other three samples' three and two.
  // Out of the corpus wide lists like them. Section 155.
  one_spare_myharmony: 'one-spare-myharmony-config.bin',
  // A fourth state of that same unit, read on 30 August 2026 **because the write rehearsal refused**:
  // the remote held a configuration none of the three above matches, six devices and 475 codes
  // against the newest one's five and 418, so something was added and synced onto it after 23 August
  // and nothing dumped it afterwards. Named here rather than left as an anonymous read because the
  // write rehearsal takes its dumps by name and this is the one it would put back. **That script is
  // deliberately not named here**: `packages/lab` is an instrument a blind reviewer may be handed,
  // where `packages/usb` is withheld whole, so a comment in this file pointing at the write path
  // widens what a reviewer sees. `TheWriteReviewWithholdListIsComplete` caught the first wording.
  one_spare_20260830: '20260830T1430Z-harmony-one-spare-config.bin',
  // The same unit read again **after** the first write this project ever performed, section 222: one
  // 64 KiB block of its own configuration erased and put back unchanged on 30 August 2026. It is byte
  // identical to `one_spare_20260830` and that identity is the whole point of keeping it, which is
  // also why it is excluded from the parseable population: counting it would count one configuration
  // twice. The verification read failed twice before it succeeded, section 222, which is recorded
  // there and unexplained.
  one_spare_after_first_write: '20260830T1618Z-harmony-one-spare-after-first-write-config.bin',
  // The same unit again, read on 1 September 2026 **after the first write that changed something**:
  // two power on delay operands raised, in one 64 KiB block, checksum neutral because both sit at
  // the same word parity. It differs from `one_spare_20260830` in exactly those two bytes and in
  // nothing else, which is what the read back established, so it is that configuration plus a known
  // edit rather than a new sample and it is excluded from the parseable population for the same
  // reason the row above is. It is named because the write rehearsal takes its dumps by name and,
  // the device having been changed, this is now the only image its byte compare can match.
  one_spare_20260901_delay: '20260901T0555Z-one-spare-20260831-delay-config.bin',
  // And the state after the **second** changing write, an hour later: the receiver's power on delay
  // raised from six seconds to ten, which is the change the bench could see, section 236. Registered
  // for the same reason as the row above, which is the reason itself: after a write the remote
  // matches no dump, so the compare in front of the next write refuses until a fresh read exists, and
  // that includes the write that puts the original bytes back. Excluded from the parseable population
  // like the other two, being `one_spare_20260830` plus three known bytes.
  one_spare_20260901_denon: '20260901T0645Z-one-spare-denon-delay-config.bin',
  // The same unit read as a **region** rather than as a container, 1 September 2026, after the
  // revert put it back to `one_spare_20260830`. It runs from the config base to the end of the block
  // the container ends inside, `0x040000` to `0x1E0000`, and that extra 38036 bytes is the whole
  // point: an edit moves the trailer checksum, the checksum is in that last block, and a write
  // refuses a block its known good content does not cover. Its leading 1665900 bytes are byte
  // identical to `one_spare_20260830` and the rest reads as erased flash, which is the control that
  // makes it a second independent read rather than a new claim. Excluded from the parseable
  // population for the same reason the reads above are.
  one_spare_20260901_region: '20260901T084229Z-one-spare-region-0x40000-0x1e0000.bin',
  // **The first configuration this project's own codec produced and put on a remote**, 1 September
  // 2026, section 237. It is `one_spare_20260830` with one device's power on delay raised from six
  // seconds to ten, through `setPowerOnDelay` and `applyEdits`, so it differs in two bytes: the
  // operand, and the trailer checksum a megabyte further on that `applyEdits` restamped. Those two
  // land in different 64 KiB blocks, which is the measurement behind a same length edit costing two
  // erases. Read back off the remote afterwards and byte identical to the file that was sent.
  // Excluded from the parseable population like the other states of this unit.
  one_spare_written_by_us: '20260901T0851Z-one-spare-written-by-us-config.bin',
  // The same state read as a region, so the revert has known good content for both blocks. Its
  // leading bytes are `one_spare_written_by_us` exactly and its tail is unchanged from
  // `one_spare_20260901_region`, which together say the write reached those two bytes and nothing
  // else in 1703936. **This is the fourth region or container of one unit registered in a day**, and
  // that is the wart section 237 records rather than solves: a write invalidates the dump the next
  // one compares against, so the compare that makes a write recoverable is also what makes it one
  // way until a fresh read exists.
  one_spare_written_region: '20260901T091517Z-one-spare-written-region-0x40000-0x1e0000.bin',
  // The spare as the first write that added a device left it, 3 September 2026, section 242: the
  // first candidate of section 241 byte for byte over its 1668321 bytes, then zero fill. The compare
  // base for the second write, which carries readable labels and a stamp.
  one_spare_plus_lg_region: '20260903T092929Z-one-spare-plus-lg-region-0x40000-0x1e0000.bin',
  // The state the second device write left the spare in, 3 September 2026: 24 of its 25 blocks hold
  // the second candidate and 0x70000 is erased flash. Read because the previous dump had stopped
  // being the unit's content, which is what the writer's compare refused on. Section 242.
  one_spare_mixed_region: '20260903T104804Z-one-spare-mixed-region-0x40000-0x1e0000.bin',
  // The state the second device write left the spare in once it was finished, 3 September 2026: the
  // mixed region above with 0x70000 filled in, so its first 1668291 bytes are the second candidate
  // byte for byte. Read as the compare base for the first write to use the whole eight step
  // sequence, section 246, since the dump a write compares against is invalidated by that write.
  one_spare_plus_lg2_region: '20260903T172120Z-one-spare-plus-lg2-region-0x40000-0x1e0000.bin',
  // And the same unit after the first write to use the whole eight step sequence, section 247:
  // one power on delay raised, so it is the region above with two bytes different, the operand
  // and the trailer checksum, in two different erase blocks.
  one_spare_denon65_region: '20260903T174116Z-one-spare-denon65-region-0x40000-0x1e0000.bin',
  // And after the revert that was also section 248's control: **byte for byte identical to
  // `one_spare_plus_lg2_region` over all 1703936 bytes**, which is why it is here rather than
  // being left out as a duplicate. The identity is the claim, and it is asserted.
  one_spare_reverted_region: '20260903T175608Z-one-spare-reverted-region-0x40000-0x1e0000.bin',
  // Two configs Logitech compiled to a specification we wrote, 13 August 2026: the corpus's only
  // known answer samples. Section 132. Not in the corpus wide lists, on purpose; see tests/lab.py.
  calibration_one: 'calibration-one-spare.bin',
  calibration_h600: 'calibration-h600.bin',
  // The third, 23 August 2026: the same account and the same Harmony One as `calibration_one`, with
  // three favourite channels added and nothing else. **The first config anywhere to populate base
  // slot 16**, which section 39 read out of firmware and no found config exercises. Section 154.
  calibration_favchannels: 'calibration-favchannels.bin',
  // The fourth, 23 August 2026, and the first from the **second** test account: Danny's spare Harmony
  // One with five favourite channels, two of them written with a leading zero. Those two do not use
  // base slot 16 at all, they send one digit code each in order, which is what this sample settled.
  // Six devices, one of them referenced by no activity, which refutes the note that the generator
  // drops such a device. Section 156.
  calibration_favzero: 'calibration-favzero.bin',
  // The fifth, 24 August 2026, and the largest: fifteen appliances chosen so that every protocol family
  // in Logitech's catalogue that the corpus could not settle appears in it, compiled by their own
  // generator. It is what eighteen of the rhythm table's entries are measured off, sections 160 to 163.
  // **Renamed twice, and both times the name was saying something false.** Their service hands it back
  // as `Result.EzHex`, and eight files in this lab carry that name, so a lookup by it resolves to
  // whichever the walk reaches first. It is also not an EZHex: there is no XML header on it at all,
  // just the bare container, which is what section 132 said the download is. Under the old extension it
  // joined the population of EZHex files whose signed header is checked and failed four of those
  // checks, correctly. Section 165.
  compiled_protocols: 'compiled-20260824-protocols-gspm.bin',
  // **The second of these, 24 August 2026 in the evening**, made the same way and for the same reason:
  // ten more appliances chosen so that Logitech's compiler emits the families the first one did not
  // reach. It sits beside a `catalogue-commands.json` of its own, which is the fix for what went wrong
  // between the two: the first sample's catalogue capture lived at one mutable path in the working
  // directory and the second capture overwrote it. A measurement's two inputs are filed together now.
  compiled_protocols_2: 'compiled-20260824b-protocols-gspm.bin',
  // The third, an hour later: the four appliances the second sitting had no room for, plus the
  // Microsoft one whose account name the rebuilt capture of the first could not recover.
  compiled_protocols_3: 'compiled-20260824c-protocols-gspm.bin',
  // The phase 7 pair, 25 August 2026: the calibration account's Harmony One compiled without and
  // with the LG 42LM3400, ten minutes apart, nothing else changed between the two. The known
  // answer for `docs/adding-a-device.md` phase 7: what Logitech's generator adds for the same
  // television `composeDevice` adds, compared in `packages/codec/test/compose.test.ts`. Not in the
  // corpus wide lists, like every compiled-to-order sample. Section 174.
  // The Harmony 350, arch 16, read with concordance since this library's transport does not reach
  // the file based family, section 193. Named here so the golden comparison can load it; it is
  // deliberately outside every corpus wide population, section 194.
  h350_config: 'harmony-350-config.bin',
  phase7_before: 'phase7-before-gspm.bin',
  phase7_after: 'phase7-after-gspm.bin',
  // The account's own command list, captured 13 August 2026: a name and a stated code per command,
  // for the three devices of the calibration account. Not an image and not a config. It is here so
  // that section 154's naming closure is a test rather than a paragraph: the digit tables of a number
  // sender are matched against these names through a decoded infrared frame, which needs both a
  // container reader and a frame decoder, and only TypeScript has the second.
  account_commands: 'GetCommands_mine.json',
  // Not an image and not a config: Harmony Desktop's whole hosted client, mirrored on 9 August 2026.
  // The service API surface in `docs/host-client.md` is extracted from it by
  // `tests/test_host_client.py`. Nothing in TypeScript reads it, and it is here because the two
  // tables are asserted equal: a fixture on one side only is the drift this parity test exists for,
  // and it caught exactly that on the day this entry was added.
  desktop_webapp_main: 'en.desktop-app-main.js',
  // MyHarmony decompiled to C#, three files of the sync flow. The reference client, decision 2: their
  // code and the firmware are both read before anything is derived. Sections 202 and 203 are claims
  // about what this code does, and `tests/test_host_client.py` recomputes them, so they are named here
  // only to keep the two fixture tables identical, which is what the parity test is for.
  myharmony_sync_model: 'RemoteSyncUserControlModel.cs',
  myharmony_update_manager: 'RemoteUpdateManager.cs',
  myharmony_ds_controller: 'DSController.cs',
  // Not an image and not a config: the wire log of Logitech's own classic client reading a Harmony
  // One, captured on 7 August 2026 by running the client rebuilt from its own decompiled source
  // against a local stand-in for its discontinued server. 69572 lines, of which 69344 are packets.
  // It is the only capture here of a remote being driven by an implementation that is not ours, so
  // it is the one place our command encoder can be checked against an independent one rather than
  // against itself. `software/classic/reports/run.log`, section 210.
  classic_read_capture: 'run.log',
  // The classic client's three single byte memory services, decompiled. Section 211 is a claim about
  // what this code does, so the claim has to be recomputable from the source rather than transcribed.
  // Logitech's expression, so it stays in the lab and nothing of it is quoted: what travels is which
  // bound is asserted and what happens after a write, which is functional fact. Python reads them;
  // they are named here only to keep the two fixture tables identical.
  classic_ram_service: 'RamHidService.java',
  classic_eeprom_service: 'EepromHidService.java',
  classic_program_service: 'ProgramHidService.java',
  // Five more of the same client's HID services, section 213: the shared base that all of them send
  // through, the flash service that carries the write transfer, the system service with the identity
  // block erase, the state variable service, and the diagnostic service the liveness ping goes to.
  // Same rule as above: their code stays in the lab, and what travels is functional fact.
  classic_hid_base: 'AbstractHidService.java',
  classic_flash_service: 'FlashHIDService.java',
  classic_system_service: 'SystemHidService.java',
  classic_state_service: 'StateVariableHidService.java',
  classic_diagnostic_service: 'DiagnosticHidService.java',
  // The update service, section 214. Section 210 mined its write transfer without registering
  // it; what this fixture is for is the other half, the region address and size table, which
  // is the source end of the closure in `packages/usb/test/classic-capture.test.ts`.
  classic_update_service: 'UpdateHidService.java',
  // Two flash regions off the spare Harmony One, read by **Logitech's own client** rather than by
  // anything here, section 215. The user config region is the first independent check this project
  // has ever had on `packages/corpus/src/read.ts`: its leading bytes and our own dump of the same
  // unit agree exactly. The embedded one has no counterpart in the lab at all.
  vendor_region_user_config: 'vendor-region4-user-config.bin',
  vendor_region_embedded_config: 'vendor-region3-embedded-config.bin',
};

/**
 * Fixtures that parse as a container but must not join a corpus wide population, because the
 * container they parse to is **already in it under another name**. Section 215. Mirrors
 * `PARSEABLE_EXCLUDED` in `tests/lab.py`, and `parity.test.ts` compares the two.
 *
 * `vendor_region_user_config` is the whole user config region of the spare Harmony One as Logitech's
 * own client read it, and `parse` trims to the declared end, so it yields exactly the same 1232237
 * byte container as `one_spare_before_sync`. That identity is the **point** of keeping the file, and
 * it is exactly why counting it would be wrong: it moved two corpus totals by one each, and both
 * moves were one config counted twice.
 *
 * **The embedded config beside it is excluded too, and this said the opposite for an hour.** Its
 * counterpart is `one_safemode`, cut out of a firmware image, which a first search missed by looking
 * only under the dumps directory at small files. The bodies are identical, all 8902 bytes, and the
 * golden vectors differ only in where the container sits in its file.
 */
export const PARSEABLE_EXCLUDED: readonly string[] =
  ['vendor_region_user_config', 'vendor_region_embedded_config', 'one_spare_after_first_write',
    'one_spare_20260901_delay', 'one_spare_20260901_denon', 'one_spare_20260901_region',
    'one_spare_written_by_us', 'one_spare_written_region', 'one_spare_plus_lg_region',
    'one_spare_mixed_region', 'one_spare_plus_lg2_region', 'one_spare_denon65_region',
    'one_spare_reverted_region'];

const cache = new Map<string, string[]>();

/**
 * The scratch directory `CLAUDE.md` documents, which is where a working copy of a curated file ends
 * up. A path under it loses to any other match for the same name.
 */
const SCRATCH = 'work';

/**
 * How a match ranks when a name resolves to more than one file: scratch last, then shallowest, then
 * alphabetically so the answer does not depend on the order the filesystem hands entries back.
 *
 * **`find` used to take the first match in traversal order and say nothing.** Two names in the lab
 * resolve twice today, `h600_code_complete` to `firmware/derived/` and to `work/`, and
 * `desktop_webapp_main` to its own directory and to a mirror seven levels down, and in both cases the
 * traversal order handed back the copy. The bytes are identical in both pairs, measured, so nothing
 * was wrong and nothing would have said so if a `work/` copy were edited: `reference/checksums.md`
 * claims provenance for a file that was not the one read. Section 139.
 */
function rank(path: string): [number, number, string] {
  const relative = LAB === undefined ? path : path.slice(LAB.length + 1);
  const scratch = relative.split(sep)[0] === SCRATCH ? 1 : 0;
  return [scratch, relative.split(sep).length, relative];
}

/** Every match for `filename` anywhere under LAB, best first. */
function findAll(filename: string): string[] {
  const cached = cache.get(filename);
  if (cached !== undefined) return cached;
  const found: string[] = [];
  if (LAB && existsSync(LAB)) {
    const queue: string[] = [LAB];
    while (queue.length) {
      const dir = queue.shift() as string;
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const full = join(dir, entry);
        // **One guarded stat, not two.** The name match called `statSync` outside the `try`, so a
        // dangling symlink carrying a lab image's name threw `ENOENT` out of `imagePath`, which made
        // `skipUnless` throw instead of returning a skip and took the whole test file with it. The
        // comment on the catch below already said a dangling symlink is not worth failing a run
        // over, three lines under the call that did. Section 139.
        let entryStat;
        try {
          entryStat = statSync(full);
        } catch {
          continue;
        }
        if (entry === filename && entryStat.isFile()) found.push(full);
        else if (entryStat.isDirectory()) queue.push(full);
      }
    }
  }
  found.sort((a, b) => {
    const [as, ad, ap] = rank(a);
    const [bs, bd, bp] = rank(b);
    return as - bs || ad - bd || ap.localeCompare(bp);
  });
  cache.set(filename, found);
  return found;
}

/** Best match for `filename` anywhere under LAB, or undefined. */
function find(filename: string): string | undefined {
  return findAll(filename)[0];
}

/** Absolute path to a named image, or undefined when it is not available. */
export function imagePath(name: keyof typeof IMAGES | string): string | undefined {
  const filename = IMAGES[name];
  if (filename === undefined) throw new Error(`no image named ${name}`);
  return find(filename);
}

/**
 * Every path a named image resolves to, best first, so a test can see an ambiguity `imagePath`
 * resolves silently. Exported for that reason and for no other.
 */
export function imagePaths(name: keyof typeof IMAGES | string): string[] {
  const filename = IMAGES[name];
  if (filename === undefined) throw new Error(`no image named ${name}`);
  return findAll(filename);
}

/** Bytes of a named image, or undefined when it is not available. */
export function load(name: keyof typeof IMAGES | string): Uint8Array | undefined {
  const path = imagePath(name);
  return path === undefined ? undefined : new Uint8Array(readFileSync(path));
}

/**
 * Bytes of a named image, or throw. For use inside a test already guarded by `skipUnless`.
 */
export function require_(name: keyof typeof IMAGES | string): Uint8Array {
  const data = load(name);
  if (data === undefined) {
    throw new Error(
      `no ${IMAGES[name]} found; set HARMONY_LAB (searched: ${LAB ?? 'nothing, HARMONY_LAB unset'})`,
    );
  }
  return data;
}

/**
 * A golden vector: what the Python parser says about a sample, for this side to match.
 *
 * Generated by `tools/golden.py --write` and kept in the lab directory rather than in the
 * repository, because a vector states section addresses and sizes for somebody's actual
 * configuration and **this project would be the one publishing it**, on behalf of a contributor who
 * sent a dump and was not asked. Publishing a checksum is fine; publishing that map for them is not.
 *
 * **The line is consent, not the data**, and saying it the other way put this in contradiction with
 * `packages/probe`, whose `SectionReport` publishes per slot addresses and lengths deliberately.
 * That is the same shape of information and the opposite situation: the probe runs on a contributor's
 * own machine, on their own remote, and produces a file they decide whether to send. Two stated
 * policies in one repository with no way for a reader to tell which was meant, found by review on
 * 13 August 2026 and reconciled here and in `report.ts` in one commit. Section 139.
 */
export function goldenVector(name: string): Record<string, unknown> | undefined {
  if (!LAB) return undefined;
  const path = join(LAB, 'golden', `${name}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

/** Like `skipUnless`, but for a test that needs the golden vector as well as the image. */
export function skipUnlessGolden(name: string): { skip: string | false } {
  const image = skipUnless(name);
  if (image.skip !== false) return image;
  if (goldenVector(name) === undefined) {
    return { skip: `no golden vector for ${name}: run tools/golden.py --write` };
  }
  return { skip: false };
}

/**
 * A `{ skip }` option for `node:test`, so a missing image reads as skipped and not as passed.
 *
 * `node:test` has no equivalent of unittest's SkipTest exception, so the skip has to be decided
 * before the test body runs. That is the reason this returns an options object rather than
 * throwing: a test that silently passes because its fixture is absent is worse than no test.
 */
export function skipUnless(...names: string[]): { skip: string | false } {
  const missing = names.filter((n) => imagePath(n) === undefined);
  if (missing.length === 0) return { skip: false };
  return { skip: `lab image not available: ${missing.map((n) => IMAGES[n]).join(', ')}` };
}

/**
 * A `{ skip }` option for a test whose claim is about the corpus as a whole.
 *
 * Such a test should **fail** rather than skip when the lab is there and a sample is missing,
 * because a partial corpus cannot support a claim about spread and a silent pass would hide that.
 * It should still skip when there is no lab at all, which is the ordinary state of a fresh clone.
 * Conflating the two made ten tests fail in a checkout with no lab while `CLAUDE.md` promised a
 * clean skip, so the distinction is the whole point of this being separate from `skipUnless`.
 */
export function skipWithoutLab(): { skip: string | false } {
  if (LAB !== undefined && existsSync(LAB)) return { skip: false };
  return { skip: 'no lab directory; set HARMONY_LAB or put one alongside the repository' };
}

/**
 * Where the lab keeps a unit identity, one file per remote, named after the unit.
 *
 * **Deliberately not in `IMAGES`.** That registry is the corpus, and `PARSEABLE` is discovered from
 * it, so registering a 64 byte identity block there would put it in the parseable population and
 * move about seven corpus wide totals for a file that is not a config. A unit identity is a different
 * kind of thing and gets a different door.
 */
const UNITS_DIRECTORY = 'units';

/**
 * The recorded identity of a named unit, as hex text, or undefined when the lab has no record.
 *
 * **Why the lab and not this repository**: a unit identity is that remote's hardware identity, the
 * two GUIDs Logitech's own service takes as a serial, and this repository is public. Danny's
 * decision on 30 August 2026. FreeHarmony will keep the same value with the user's own data, which is
 * the same arrangement with a different owner, so the stored form is deliberately the plain hex
 * `unitIdentityText` produces rather than anything this package invents.
 *
 * Undefined rather than throwing, like `load`, so a caller decides whether a missing record is a skip
 * or a refusal. Every write path here treats it as a refusal: without a record there is nothing to
 * compare the connected remote against, and that is exactly when a write must not proceed.
 */
export function unitIdentity(label: string): string | undefined {
  if (LAB === undefined) return undefined;
  const path = join(LAB, UNITS_DIRECTORY, `${label}.txt`);
  if (!existsSync(path)) return undefined;
  // Comments and blank lines are allowed, so the file can say which remote it is and when it was
  // read without a second file to hold that. The first content line is the identity.
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed !== '' && !trimmed.startsWith('#')) return trimmed;
  }
  return undefined;
}

/** Absolute path of a unit identity file, for a script that has to tell the operator where to put it. */
export function unitIdentityPath(label: string): string {
  return join(LAB ?? '<no lab>', UNITS_DIRECTORY, `${label}.txt`);
}

/**
 * Locating the Harmony infrared archive, which is a **different kind of thing from the lab** and so
 * gets its own locator rather than a second meaning for `LAB`.
 *
 * The lab is private, holds unlicensed firmware and other people's configurations, and never leaves
 * this machine. The archive is a **public** third party checkout of Logitech's own infrared database,
 * `github.com/pickysysadmin/logitech-harmony-ir-archive`, which anybody can clone. Both are absent in
 * a fresh checkout and both make their tests skip, which is the only thing they have in common; the
 * rules about what may be copied out of each are opposite, so nothing here should read as though one
 * locator served both.
 *
 * Decision 15 in `docs/roadmap.md` is what may cross into this repository from it: durations and
 * names, through our own converter, and never a file of the archive's own.
 */
function defaultIrArchive(): string | undefined {
  const sibling = normalize(join(REPO_ROOT, '..', 'logitech-harmony-ir-archive'));
  return existsSync(sibling) ? sibling : undefined;
}

export const IR_ARCHIVE: string | undefined =
  process.env['HARMONY_IR_ARCHIVE'] || defaultIrArchive();

/**
 * A path inside the archive checkout, or undefined when there is no checkout.
 *
 * Undefined rather than throwing, matching `imagePath`, so the caller decides between a skip and a
 * refusal. `bin/protocols.ts` refuses, because the archive is what names a measured rhythm and a
 * table regenerated without it would silently carry the analyser's names again.
 */
export function irArchivePath(...parts: string[]): string | undefined {
  if (IR_ARCHIVE === undefined) return undefined;
  const path = join(IR_ARCHIVE, ...parts);
  return existsSync(path) ? path : undefined;
}

/** The `node:test` skip option for a test that needs the archive, mirroring `skipWithoutLab`. */
export function skipWithoutIrArchive(): { skip: string | false } {
  if (IR_ARCHIVE !== undefined && existsSync(IR_ARCHIVE)) return { skip: false };
  return {
    skip: 'no infrared archive; set HARMONY_IR_ARCHIVE or clone '
      + 'logitech-harmony-ir-archive alongside the repository',
  };
}

/**
 * Both skip reasons at once, so a test needing the lab **and** the archive skips when either is absent.
 *
 * **Spreading the option objects does not work, and this exists because that was tried.**
 * `{ ...skipWithoutIrArchive(), ...skipUnless('x') }` keeps the second object's `skip`, so such a test
 * runs its body with no archive whenever the lab is present. Measured on 31 August 2026 by pointing
 * `HARMONY_IR_ARCHIVE` at a directory that does not exist: three tests failed where they should have
 * skipped. That is the control `make test-nolab` performs for the lab and cannot perform for the
 * archive, so the guard has to be right by construction rather than by a check nobody runs.
 *
 * It lives here rather than in the one test file that first needed it, because a second copy of a guard
 * is the state this repository's oldest rule forbids and the next file to need two reasons would write
 * one.
 */
export function needing(...options: readonly { skip: string | false }[]): { skip: string | false } {
  const reason = options.map((one) => one.skip).find((one) => one !== false);
  return { skip: reason ?? false };
}
