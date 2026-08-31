/**
 * The session-end experiment: does `0xE0 0x01` let a remote leave USB mode when its cable goes?
 *
 *   HARMONY_ENABLE_WRITES=1 node packages/usb/bin/end-session-experiment.ts
 *
 * `docs/findings.md` sections 95, 97 and 99, and the prediction is written down in section 99's
 * "the experiment, prepared" before this script was committed, which is the point of preparing it.
 *
 * **This is the only script in the repository that sends a command which is not a read.** It sends
 * exactly one, `0xE0 0x01`, whose whole effect is to zero one variable in a running remote. It
 * writes no flash, no RAM and nothing that survives a power cycle, and it refuses to run at all
 * unless `HARMONY_ENABLE_WRITES=1` is set, because the rails in `packages/usb/src/rails.ts` decide
 * that and not this file.
 *
 * What it does, in order, and it stops at the first thing that does not hold:
 *
 *  1. finds exactly one Harmony One, and identifies it from what it holds rather than from its port
 *  2. reads its config base and compares it against the spare's lab dump, so the unit is confirmed
 *  3. reads a window twice to show the remote is answering normally
 *  4. sends `0xE0 0x01`
 *  5. reads the same window again, which is the check that the command broke nothing
 *  6. then asks the operator to pull the cable and says exactly what to look for
 *
 * Step 5 matters more than it looks. The command clears the parsed address as well as the state, so
 * a read after it is the difference between "cleared a variable" and "left the command layer in a
 * state where the next read misbehaves".
 */
import {
  HarmonyRemote,
  assertUnitIsPermitted,
  listHarmony,
  openHarmony,
  unitIdentityFromText,
  unitIdentityText,
  WRITES_ENABLED,
} from '../src/index.ts';
import { unitIdentity, unitIdentityPath } from '@harmony/lab';

const CONFIG_BASE = 0x040000;
const WINDOW = 32;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function hex(data: Uint8Array): string {
  return [...data].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

if (!WRITES_ENABLED) {
  fail(
    'this experiment sends one command that is not a read, so it needs HARMONY_ENABLE_WRITES=1.\n' +
      'Read docs/findings.md section 99 first: it says what the command does and what it does not.',
  );
}

/**
 * The unit is identified by its **own identity block**, section 226, not by what it holds.
 *
 * This compared the first 32 bytes of the config region against the spare's dump, which proves
 * content and not identity: any unit whose configuration happened to start the same way would have
 * passed. The remote states which unit it is, in its own program memory, and that is what Logitech's
 * service takes as a serial. The lab holds the recorded value, because a unit identity is that
 * remote's hardware identity and this repository is public.
 */
const PERMITTED_UNIT_LABEL = 'one_spare';
const stored = unitIdentity(PERMITTED_UNIT_LABEL);
if (stored === undefined) {
  fail(`the lab has no recorded identity for ${PERMITTED_UNIT_LABEL}, so the unit on the cable `
    + 'cannot be identified and this experiment must not run. Write the identity read-identity.ts '
    + `prints to ${unitIdentityPath(PERMITTED_UNIT_LABEL)}`);
}
const permitted = unitIdentityFromText(stored);

const candidates = (await listHarmony()).filter((d) => d.productId === 0xc121);
if (candidates.length === 0) fail('no Harmony One attached');
if (candidates.length > 1) fail(`${candidates.length} Harmony Ones attached; attach only the spare`);
const found = candidates[0] as { productId: number; path: string | undefined };

process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ),
);

try {
  // The wake up, retried, because a remote that has been idle loses the first command sent to it.
  let version: Uint8Array | undefined;
  for (let attempt = 1; attempt <= 4 && version === undefined; attempt += 1) {
    try {
      version = await remote.getVersion();
    } catch {
      /* try again */
    }
  }
  if (version === undefined) fail('the remote is not answering');
  process.stdout.write(`version    ${hex(version)}\n`);

  // Which unit, first, before anything is sent that is not a read.
  const identityBlock = await remote.readUnitIdentity();
  assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
  process.stdout.write(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
    + `matches the recorded ${PERMITTED_UNIT_LABEL}\n`);

  const before = await remote.readFlash(CONFIG_BASE, WINDOW);
  process.stdout.write(`config     ${hex(before)}\n\n`);

  process.stdout.write('sending 0xE0 0x01, which clears the command state and expects no reply\n');
  await remote.endSession({ architecture: 12, identityBlock, permittedUnit: permitted });

  const after = await remote.readFlash(CONFIG_BASE, WINDOW);
  const intact = hex(after) === hex(before);
  process.stdout.write(`config     ${hex(after)}  ${intact ? 'unchanged' : 'CHANGED'}\n`);
  if (!intact) fail('the config window changed after the command, which nothing predicted');
  process.stdout.write('the remote still answers and reads correctly afterwards\n\n');

  process.stdout.write(
    'Now pull the USB cable, without doing anything else, and watch the screen.\n' +
      '\n' +
      '  section 99 predicts: the remote LEAVES USB mode and returns to its normal display,\n' +
      '  because the command cleared the gate its cable-out path tests.\n' +
      '\n' +
      '  if it stays in USB mode, the prediction is wrong and section 99 needs the correction,\n' +
      '  not a patch. Take the batteries out to clear it, as section 95 records.\n' +
      '\n' +
      'Either answer is worth having, and the failure is the more interesting one.\n',
  );
} finally {
  await remote.close();
}
