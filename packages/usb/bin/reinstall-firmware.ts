/**
 * Ask an arch 14 remote to reinstall the application image already staged in its own external flash,
 * from safe mode, section 295, or from an application build whose status byte handler is read, which
 * is the Harmony 700's 2.5 and 2.8, sections 297 and 298.
 *
 *   node packages/usb/bin/reinstall-firmware.ts --unit h700
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FIRMWARE_REINSTALL=1 node packages/usb/bin/reinstall-firmware.ts \
 *     --unit h700 --commit
 *
 * With `--image <file> --backup <lab region read>` it first **stages** that image, section 297 and
 * decision 18: the backup must equal the remote's staging region as it stands, byte for byte, before
 * anything is erased, and `--commit` then also needs `HARMONY_FIRMWARE_STAGE=1`. This is how the
 * bench Harmony 700 was taken from 2.5 to 2.8, and the way back is the same command with the 2.5
 * image as `--image` and a fresh read of the region as `--backup`; 2.8's status byte handler is read
 * since section 298.
 *
 * **An erased region is accepted in place of an equal one** when the backup holds an image that
 * verifies, which was written for the one run that stopped past its erase. That arm checks the backup
 * verifies and nothing else, so any verifying image passes it, the one being staged included.
 *
 * ## Why this exists
 *
 * A Harmony 700 arrived showing the safe mode screen after every start. Its application image at
 * internal `0x9000` failed its checksum because one 1 KiB page of it, internal `0x10000`, was erased;
 * the complete image, the same build, sat verified in external flash at `0x000000`, which is where an
 * arch 14 firmware install stages it. MyHarmony's sync failed on it and Harmony Desktop's sync
 * wrote a configuration and left the application as it was, so neither of Logitech's clients
 * repaired it; why MyHarmony's failed is not established.
 *
 * On arch 14 an install is two halves, per Logitech's `firmwareupgrade.xml` for skin 66 and the safe
 * mode image's own install routine at `0x02B90`: the host writes the image into external flash, then
 * sets the update status byte to 2 and restarts the remote, and at start up the safe mode image
 * erases the application area, copies the staged image in, sets the byte back to 0, and runs the
 * application only if its checksum is right. **This sends the second half and nothing else**, so it
 * writes no flash: the remote reinstalls what it already holds.
 *
 * ## What it checks, and what a dry run is worth on its own
 *
 * Without `--commit` it sends nothing that changes the remote. It reads the version block, the unit's
 * identity block, the staged image and the installed one, and prints:
 *
 * * whether the unit is the one `--unit` names, off its identity block against `../lab/units/`
 * * whether it is in safe mode, which is the only state the install routine was read in
 * * whether the staged image verifies and fits the copy limit, and which 1 KiB pages of the installed
 *   image differ from it
 *
 * `--commit` needs `HARMONY_ENABLE_WRITES=1` and `HARMONY_FIRMWARE_REINSTALL=1`, and the library's rail
 * checks everything above again itself before it sends: `requestFirmwareReinstall` in `remote.ts`
 * reads the staged image off the remote, so the image the rail approves is the image the remote holds.
 * Afterwards this waits for the remote to come back on the bus and reads its version block again.
 *
 * **The failure modes, so nobody has to re-derive them.** The status byte lives in data memory, so a
 * power loss mid copy leaves safe mode running, the application erased and the staged copy untouched,
 * and running this again repeats the copy. If the byte does not survive the restart nothing happens
 * at all. The copy starts at `0x9000`, above the bootloader and the safe mode image, and is clamped
 * below `0x1EC00`, below the settings store and the identity block.
 */
import {
  HarmonyRemote,
  RailError,
  RemoteError,
  SOFTWARE_TYPE_SAFE_MODE,
  architectureFromVersion,
  checkFirmwareImage,
  listHarmony,
  openHarmony,
  readVersion,
  softwareTypeFromVersion,
  unitIdentityFromText,
  unitIdentityText,
  assertUnitIsPermitted,
  REINSTALL_MAX_IMAGE,
} from '../src/index.ts';
import { unitIdentity, unitIdentityPath } from '@harmony/lab';
import { readFileSync } from 'node:fs';

/** A refusal an operator reads, thrown so that the `finally` below still closes the device. */
class Refusal extends Error {}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

/**
 * The units this may be pointed at: the arch 14 (Harmony 600, 650 and 700) remotes on the write list,
 * Danny's decisions of 27 and 29 September 2026. The rail compares the identity read off the remote
 * with the record for the label, so this list is what keeps a label for any other unit out, the
 * everyday Harmony One's included, rather than the architecture check alone.
 */
const UNITS = ['h600', 'h650', 'h700'];

const unitLabel = argument('unit');
const commit = process.argv.includes('--commit');
const imagePath = argument('image');
const backupPath = argument('backup');
if ((imagePath === undefined) !== (backupPath === undefined)) {
  process.stderr.write('--image and --backup go together: staging erases the copy the backup restores\n');
  process.exit(2);
}
if (unitLabel === undefined || !/^[a-z0-9_]+$/.test(unitLabel)) {
  process.stderr.write('usage: reinstall-firmware.ts --unit <label> [--commit]\n');
  process.exit(2);
}
if (!UNITS.includes(unitLabel)) {
  process.stderr.write(`refused: ${unitLabel} is not a unit this may reinstall; it takes ${UNITS.join(', ')}\n`);
  process.exit(1);
}

/** Internal program memory from `0x9000` for `length` bytes, across the two 64 KiB pages. */
async function installedImage(remote: HarmonyRemote, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length);
  const first = Math.min(length, 0x10000 - 0x9000);
  out.set(await remote.readFlash(0xfe9000, first), 0);
  if (length > first) out.set(await remote.readFlash(0xff0000, length - first), first);
  return out;
}

async function openTheOnlyRemote(): Promise<HarmonyRemote> {
  const attached = await listHarmony();
  if (attached.length !== 1) {
    throw new Refusal(`${attached.length} remotes are attached; attach only the one to repair`);
  }
  const found = attached[0] as { productId: number; path: string | undefined };
  process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);
  return new HarmonyRemote(await openHarmony(
    found.path === undefined ? { productId: found.productId } : { productId: found.productId, path: found.path },
  ));
}

async function main(): Promise<void> {
  const stored = unitIdentity(unitLabel as string);
  if (stored === undefined) {
    throw new Refusal(`the lab has no recorded identity at ${unitIdentityPath(unitLabel as string)}`);
  }
  const permittedUnit = unitIdentityFromText(stored);
  const remote = await openTheOnlyRemote();
  let restarted = false;
  try {
    const versionBytes = await remote.getVersion();
    const architecture = architectureFromVersion(versionBytes);
    const version = readVersion(versionBytes);
    const softwareType = softwareTypeFromVersion(versionBytes);
    process.stdout.write(`firmware ${version.firmware}, software type ${softwareType}, `
      + `architecture ${architecture}, skin ${version.skin}\n`);
    if (architecture === undefined) throw new Refusal('the remote did not say which architecture it is');

    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit });
    process.stdout.write(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which matches `
      + `the recorded ${unitLabel}\n`);
    if (imagePath === undefined && softwareType !== SOFTWARE_TYPE_SAFE_MODE) {
      throw new Refusal('the remote is not in safe mode, so there is nothing for this to repair');
    }

    // In 32 KiB reads, since a `READ_FLASH` count is sixteen bits and the copy limit is not.
    const staged = new Uint8Array(REINSTALL_MAX_IMAGE);
    for (let at = 0; at < REINSTALL_MAX_IMAGE; at += 0x8000) {
      staged.set(await remote.readFlash(at, Math.min(0x8000, REINSTALL_MAX_IMAGE - at)), at);
    }
    const check = checkFirmwareImage(staged);
    process.stdout.write(`staged image at external 0x000000: version ${check.version}, ${check.size} `
      + `bytes, ${check.verifies ? 'verifies' : 'DOES NOT VERIFY'}\n`);
    const stagedUsable = check.verifies && check.size <= REINSTALL_MAX_IMAGE;
    // A repair installs what is staged, so it needs a usable staged image. A stage replaces it, so
    // what is there now only matters against the backup, below.
    if (imagePath === undefined && !stagedUsable) {
      throw new Refusal('the staged image cannot be installed as it stands');
    }
    if (stagedUsable) {
      const installed = await installedImage(remote, check.size);
      const installedCheck = checkFirmwareImage(installed);
      const pages = new Set<number>();
      for (let i = 0; i < check.size; i += 1) {
        if (installed[i] !== staged[i]) pages.add((0x9000 + i) & ~0x3ff);
      }
      process.stdout.write(`installed image at internal 0x9000: version ${installedCheck.version}, `
        + `${installedCheck.verifies ? 'verifies' : 'does not verify'}; `
        + `${pages.size} KiB page(s) differ from the staged one`
        + `${pages.size > 0 ? `: ${[...pages].map((p) => `0x${p.toString(16)}`).join(', ')}` : ''}\n`);
    }
    process.stdout.write(`update status byte: ${await remote.readUpdateStatus()}\n`);

    let image: Uint8Array | undefined;
    if (imagePath !== undefined && backupPath !== undefined) {
      image = new Uint8Array(readFileSync(imagePath));
      const imageCheck = checkFirmwareImage(image);
      process.stdout.write(`image to stage: version ${imageCheck.version}, ${imageCheck.size} bytes of `
        + `${image.length}, ${imageCheck.verifies ? 'verifies' : 'DOES NOT VERIFY'}\n`);
      if (!imageCheck.verifies || imageCheck.size !== image.length) {
        throw new Refusal('the image does not verify at its own length, so it cannot be staged');
      }
      // The whole staging region, 128 KiB, against the backup, which is what makes it a way back.
      const current = new Uint8Array(0x20000);
      for (let at = 0; at < current.length; at += 0x8000) current.set(await remote.readFlash(at, 0x8000), at);
      const backup = new Uint8Array(readFileSync(backupPath)).subarray(0, 0x20000);
      const same = backup.length === current.length && backup.every((byte, i) => byte === current[i]);
      // An erased region is what a stage interrupted after its erase leaves, which the first run of
      // this did, section 297. The backup is then accepted as the way back only if it holds an image
      // that verifies, since there is nothing on the remote left to compare it with.
      const erased = current.every((byte) => byte === 0xff);
      const backupImage = checkFirmwareImage(backup);
      process.stdout.write(`backup ${backupPath}: ${same ? 'equals' : 'DIFFERS FROM'} the staging region `
        + `on the remote${erased ? ', which is erased' : ''}; its image is ${backupImage.version}, `
        + `${backupImage.verifies ? 'verifying' : 'NOT VERIFYING'}\n`);
      if (!same && !(erased && backupImage.verifies)) {
        throw new Refusal('the backup is not what the remote holds, so it is no way back');
      }
      process.stdout.write(`plan: status byte 0, erase 0x000000 and 0x010000, write ${image.length} bytes, `
        + 'read 128 KiB back and compare, status byte 2, restart\n');
    }

    if (!commit) {
      process.stdout.write('dry run: nothing was sent that changes the remote. --commit sets the '
        + 'update status to 2 and restarts it, and the remote copies the staged image in itself.\n');
      return;
    }
    if (image !== undefined) {
      process.stdout.write('staging the image\n');
      await remote.stageFirmware({ permittedUnit }, image);
      process.stdout.write('staged and read back identical\n');
    }
    process.stdout.write('sending the update status 2 and the restart\n');
    await remote.requestFirmwareReinstall({ permittedUnit });
    restarted = true;
  } finally {
    await remote.close().catch(() => undefined);
  }
  if (!restarted) return;

  // The remote leaves the bus, copies, and comes back. Poll enumeration rather than opening anything,
  // then read its version block once.
  process.stdout.write('waiting for the remote to come back on the bus\n');
  const deadline = Date.now() + 120_000;
  await new Promise((resolve) => setTimeout(resolve, 5000));
  while (Date.now() < deadline) {
    if ((await listHarmony()).length === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const again = await openTheOnlyRemote();
  try {
    const versionBytes = await again.getVersion();
    const version = readVersion(versionBytes);
    process.stdout.write(`after: firmware ${version.firmware}, software type `
      + `${softwareTypeFromVersion(versionBytes)}\n`);
  } finally {
    await again.close().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Refusal || error instanceof RailError || error instanceof RemoteError) {
    process.stderr.write(`refused: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
});
