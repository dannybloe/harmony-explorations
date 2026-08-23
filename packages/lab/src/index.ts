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
};

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
