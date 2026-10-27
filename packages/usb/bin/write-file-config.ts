/**
 * Put a configuration onto a Harmony 300 or Harmony 350, and read it back. `todo-compile-350.md` 1.6.
 *
 *   node packages/usb/bin/write-file-config.ts --unit h350 --config <file> --backup <file>
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FILE_WRITE=1 node packages/usb/bin/write-file-config.ts \
 *     --unit h350 --config <file> --backup <file> --commit [--no-reboot]
 *
 * **Without `--commit` it only reads**: the identity file, `/sys/guid` and the configuration as it
 * stands, every one through `openFileBasedRemote`'s read path, and it says what a commit would do: the
 * unit check against the lab's `units/<unit>.txt`, what the remote holds against the backup, the
 * container's size and checksum, and how many chunks and packets it would take. A refusal there is the
 * same refusal a commit would meet, since both ask `assertFileWriteTarget`.
 *
 * **With `--commit` and both flags it runs `writeFileConfig`**, whose docstring is the sequence: the
 * file system reset, the open for writing, which erases the configuration before the remote answers it,
 * the chunks, the check, the flush on `m`, the close, a read back compared byte for byte, and the
 * reboot unless `--no-reboot`. Every line is also appended to a journal beside `--config`, one per run,
 * because the open destroys what was there and a killed run's account of itself is then the only
 * record of what it sent, section 243.
 *
 * * `--unit` names the lab record, `h350` or `h300`, decision 26. Record one with
 *   `read-file-identity.ts --product 0xc124 --record h350`. The record is compared with `/sys/guid` read
 *   off the remote, which is the only thing on the cable that tells the two models' units apart, since
 *   both enumerate as `0xC124`. The skin the identity file states is checked against the label too, as
 *   a second reading that costs nothing.
 * * `--config` is the container to write. **A file read off a remote is four bytes short** of one, the
 *   end marker the remote does not serve, and when the marker is all that is missing it is put back and
 *   the journal says so; anything else that is not a whole container is refused.
 * * `--backup` is the lab's copy of what the unit holds now, as read or whole. The write proceeds only
 *   when the remote holds that, holds this configuration already, or holds no configuration at all,
 *   `judgeCurrentContent`, so the open never erases something the lab cannot put back.
 *
 * Nothing in this script has been run against a remote.
 */
import { appendFileSync, readFileSync } from 'node:fs';

import { unitIdentity, unitIdentityPath } from '@harmony/lab';

import { openFileBasedRemote } from '../src/filepipe.ts';
import {
  chunksFor,
  judgeCurrentContent,
  readFileWriteFacts,
  withEndMarker,
  writeFileConfig,
} from '../src/filewrite.ts';
import { unitIdentityFromText } from '../src/identity.ts';
import {
  FILE_WRITE_DOOR,
  FILE_WRITE_PATHS,
  RailError,
  WRITES_ENABLED,
  assertFileFamilyContainer,
  assertFileWriteTarget,
} from '../src/rails.ts';

/** The units decision 26 permits, and the skin each one's identity file states. */
const UNITS: Readonly<Record<string, { readonly model: string; readonly skin: number }>> = {
  h350: { model: 'Harmony 350', skin: 0x68 },
  h300: { model: 'Harmony 300', skin: 0x4f },
};

/** The family's one product id, which both models report. */
const FILE_FAMILY_PRODUCT = 0xc124;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

let journalPath: string | undefined;

/** Print a line and append it to the journal before anything else happens. */
function say(line: string): void {
  process.stdout.write(`${line}\n`);
  if (journalPath !== undefined) appendFileSync(journalPath, `${line}\n`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  if (journalPath !== undefined) appendFileSync(journalPath, `FAILED: ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const unitLabel = argument('unit') ?? fail(`--unit names the lab record: ${Object.keys(UNITS).join(' or ')}`);
  const unit = UNITS[unitLabel] ?? fail(`--unit ${unitLabel} is not a permitted unit of this family `
    + `(${Object.keys(UNITS).join(', ')}), decision 26`);
  const configPath = argument('config') ?? fail('--config is the container to put on the remote');
  const backupPath = argument('backup') ?? fail("--backup is the lab's copy of what the unit holds now");
  const commit = process.argv.includes('--commit');
  const reboot = !process.argv.includes('--no-reboot');
  const devicePath = argument('path');

  // The journal first, so that even a refusal is on record. A journal that cannot be opened is a
  // refusal rather than a warning, the reasoning of `write-config.ts`.
  journalPath = `${configPath}.write-${new Date().toISOString().replace(/[:.]/g, '')}.log`;
  appendFileSync(journalPath, `# ${process.argv.slice(1).join(' ')}\n`);

  const recorded = unitIdentity(unitLabel);
  if (recorded === undefined) {
    fail(`no unit record at ${unitIdentityPath(unitLabel)}: record it first with `
      + `node packages/usb/bin/read-file-identity.ts --product 0xc124 --record ${unitLabel}`);
  }
  const permittedUnit = unitIdentityFromText(recorded);

  // The container: whole, or as read and short of its end marker by exactly four bytes.
  let container: Uint8Array = new Uint8Array(readFileSync(configPath));
  try {
    assertFileFamilyContainer(container);
  } catch (whole: unknown) {
    const marked = withEndMarker(container);
    try {
      assertFileFamilyContainer(marked);
    } catch {
      fail(`${configPath} is not a whole configuration for this family: ${
        whole instanceof Error ? whole.message : String(whole)}`);
    }
    say(`${configPath} is ${container.length} bytes, as a remote serves it: the four byte end marker is put `
      + 'back, since the remote\'s start up check demands it');
    container = marked;
  }
  const backup = new Uint8Array(readFileSync(backupPath));

  const chunks = chunksFor(container);
  const packets = chunks.reduce((n, c) => n + c.payloads.length, 0);
  const stored = assertFileFamilyContainer(container).storedChecksum;
  say(`${unit.model}, unit record ${unitLabel}: writing ${container.length} bytes to ${FILE_WRITE_PATHS[0]}, `
    + `checksum 0x${stored.toString(16).padStart(4, '0')}, in ${chunks.length} chunks of ${packets} data packets`);

  const select: { productId: number; path?: string } = { productId: FILE_FAMILY_PRODUCT };
  if (devicePath !== undefined) select.path = devicePath;
  const transport = await openFileBasedRemote(select);
  try {
    const facts = await readFileWriteFacts(transport);
    const skin = Number.parseInt(facts.sysinfo.get('skin') ?? '', 16);
    say(`the remote states architecture ${facts.sysinfo.get('arch') ?? '?'}, skin ${facts.sysinfo.get('skin') ?? '?'}, `
      + `firmware ${facts.sysinfo.get('fw_ver') ?? '?'}, and serves /cfg/usercfg as ${facts.current.length} bytes`);
    if (skin !== unit.skin) {
      fail(`the remote states skin 0x${Number.isNaN(skin) ? '?' : skin.toString(16)}, and a ${unit.model} `
        + `states 0x${unit.skin.toString(16)}: this is not the unit ${unitLabel} names`);
    }

    // The same judgement a commit makes, without the flags: a dry run refuses where a commit would.
    try {
      assertFileWriteTarget({
        path: FILE_WRITE_PATHS[0] as string,
        sysinfo: facts.sysinfo,
        guid: facts.guid,
        permittedUnit,
        container,
      });
      say(`/sys/guid matches ${unitIdentityPath(unitLabel)}`);
      say(`the remote holds ${judgeCurrentContent(facts.current, backup, container)}`);
    } catch (error: unknown) {
      if (error instanceof RailError) fail(`refused: ${error.message}`);
      throw error;
    }

    if (!commit) {
      say('read only: nothing was sent that changes the remote. With --commit, '
        + `HARMONY_ENABLE_WRITES=1 (${WRITES_ENABLED ? 'set' : 'not set'}) and HARMONY_FILE_WRITE=1 `
        + `(${FILE_WRITE_DOOR ? 'set' : 'not set'}), the open for writing erases the configuration before `
        + `it answers, then ${chunks.length} write commands, the check, the flush, the close, a read back`
        + `${reboot ? ' and the reboot' : ''}`);
      return;
    }

    process.on('SIGINT', () => {
      say('interrupted: if the open was sent, the remote holds no configuration until this path writes the '
        + 'backup or this file again');
      process.exit(130);
    });
    const result = await writeFileConfig(transport, {
      path: FILE_WRITE_PATHS[0] as string,
      container,
      permittedUnit,
      backup,
      reboot,
      log: say,
    });
    say(`verified: ${result.readBackLength} bytes read back identical, check answered ${result.checkAnswer}`
      + `${result.rebooted ? ', reboot sent' : ', no reboot sent'}`);
  } finally {
    await transport.close().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
