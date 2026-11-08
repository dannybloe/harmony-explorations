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
 * **The run is `writeFileFamilyConfiguration` in `src/filewrite.ts`**, on `@harmony/usb/write` since `todo.md`
 * 7.3.10, so an application writes one of these remotes through the same function; this script keeps its
 * command line, the lab's unit records and models, the files and the journal.
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
import { FILE_FAMILY_UNITS, writeFileFamilyConfiguration } from '../src/filewrite.ts';
import { unitIdentityFromText } from '../src/identity.ts';
import { commandLine } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/usb/bin/write-file-config.ts --unit h350 --config <file> --backup <file> [--path <device path>]',
    '       HARMONY_ENABLE_WRITES=1 HARMONY_FILE_WRITE=1 node packages/usb/bin/write-file-config.ts \\',
    '         --unit h350 --config <file> --backup <file> --commit [--no-reboot]',
  ].join('\n'),
  values: ['unit', 'config', 'backup', 'path'],
  flags: ['commit', 'no-reboot'],
});

/**
 * The units decision 26 permits, and the skin each one's identity file states: the library's own list since
 * `todo.md` 7.3.10's review, so this script and an application cannot hold two that differ.
 */
const UNITS = FILE_FAMILY_UNITS;

/** The family's one product id, which both models report. */
const FILE_FAMILY_PRODUCT = 0xc124;

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
  const unitLabel = cli.value('unit') ?? fail(`--unit names the lab record: ${Object.keys(UNITS).join(' or ')}`);
  const unit = UNITS[unitLabel] ?? fail(`--unit ${unitLabel} is not a permitted unit of this family `
    + `(${Object.keys(UNITS).join(', ')}), decision 26`);
  const configPath = cli.value('config') ?? fail('--config is the container to put on the remote');
  const backupPath = cli.value('backup') ?? fail("--backup is the lab's copy of what the unit holds now");
  const commit = cli.flag('commit');
  const reboot = !cli.flag('no-reboot');
  const devicePath = cli.value('path');

  // The journal first, so that even a refusal is on record. A journal that cannot be opened is a
  // refusal rather than a warning, the reasoning of `write-config.ts`.
  journalPath = `${configPath}.write-${new Date().toISOString().replace(/[:.]/g, '')}.log`;
  appendFileSync(journalPath, `# ${cli.argv.slice(1).join(' ')}\n`);

  const recorded = unitIdentity(unitLabel);
  if (recorded === undefined) {
    fail(`no unit record at ${unitIdentityPath(unitLabel)}: record it first with `
      + `node packages/usb/bin/read-file-identity.ts --product 0xc124 --record ${unitLabel}`);
  }
  const permittedUnit = unitIdentityFromText(recorded);

  // The container and the backup, read here; what the container must be, and everything after it, is
  // `writeFileFamilyConfiguration`'s since `todo.md` 7.3.10, which every line below is printed and journalled from.
  const container = new Uint8Array(readFileSync(configPath));
  const backup = new Uint8Array(readFileSync(backupPath));

  const select: { productId: number; path?: string } = { productId: FILE_FAMILY_PRODUCT };
  if (devicePath !== undefined) select.path = devicePath;
  await writeFileFamilyConfiguration({
    unit: { label: unitLabel, record: unitIdentityPath(unitLabel) },
    permittedUnit,
    container: { name: configPath, bytes: container },
    backup,
    commit,
    reboot,
    open: () => openFileBasedRemote(select),
    say,
    // Armed where it was before: once the dry run's judgement has passed and immediately before the commit's
    // first command, which is the open for writing that erases.
    onCommit: () => {
      process.on('SIGINT', () => {
        say('interrupted: if the open was sent, the remote holds no configuration until this path writes the '
          + 'backup or this file again');
        process.exit(130);
      });
    },
  });
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
