/**
 * Read a connected remote's version block and print it, and optionally record which unit it is.
 *
 *   node packages/usb/bin/read-identity.ts
 *   node packages/usb/bin/read-identity.ts --product 0xc121
 *   node packages/usb/bin/read-identity.ts --product 0xc121 --record one_spare
 *
 * `GET_VERSION` by default, which is one of the three commands on the read only allow list in
 * `protocol.ts`, so the guarded transport passes it without any authorisation being issued.
 *
 * ## `--record <label>`, which is the other identity a remote has
 *
 * The version block says which **model** this is and nothing about which **unit**: two Harmony Ones
 * report identical blocks, which is the whole reason the write rails could not tell them apart.
 * Section 226. `--record` adds one `READ_FLASH` of the 64 byte identity block in the remote's own
 * program memory and writes it to `../lab/units/<label>.txt`, which is what those rails compare a
 * connected remote against.
 *
 * Three things about it are deliberate.
 *
 * It **writes the file rather than printing the value**, and prints eight characters of it. That
 * value identifies a specific piece of somebody's hardware, so it belongs in the private lab and not
 * in a terminal log that gets pasted into an issue. `read-file.ts` carries the same rule.
 *
 * It **refuses a block that does not identify a unit**. The field named the serial is `0xEE` on every
 * remote read here, so a block can be present, well formed and useless; recording one would give the
 * rails something to compare that matches every unit.
 *
 * And it **refuses to overwrite a different value** without `--force`. A label pointing at the wrong
 * unit is worse than a label pointing at nothing, since the rail would then permit writes to whatever
 * was recorded last.
 *
 * **Why this exists.** `readVersion` has been the library's identity reader since 21 August 2026 and
 * had no command line at all: the only way to see what a remote reports was `make probe`, which
 * builds a whole structural report, or the bench server. That gap showed up on 27 August 2026 with a
 * Harmony One sitting in safe mode on the desk and the interesting number, the software type, being
 * one exchange away and unreachable without writing a script.
 *
 * The field worth the trip is **software type**: 0 in normal operation and 4 in safe mode, which are
 * Logitech's own values. Section 87 derived the safe mode column of its table from the images rather
 * than from a remote, so a live 4 is a first. Field 6, the platform, is `0x00` for a remote in safe
 * mode or a bootloader and `0x0C` on a Harmony One running normally, so the two fields corroborate
 * each other.
 *
 * Nothing is written and no rail is touched; see `packages/usb/src/rails.ts`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { unitIdentity, unitIdentityPath } from '@harmony/lab';

import {
  HarmonyRemote,
  identifiesAUnit,
  listHarmony,
  openHarmony,
  unitIdentityText,
} from '../src/index.ts';
import { VERSION_FIELD_NAMES, readVersion } from '../src/protocol.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const record = argument('record');
const force = process.argv.includes('--force');
if (record !== undefined && !/^[a-z0-9_]+$/.test(record)) {
  fail(`--record takes a label of lower case letters, digits and underscores, not ${record}`);
}

const wanted = argument('product');
const wantedPath = argument('path');
const attached = await listHarmony();
const candidates = attached.filter(
  (d) =>
    (wanted === undefined || d.productId === Number.parseInt(wanted, 16)) &&
    (wantedPath === undefined || d.path === wantedPath),
);
if (candidates.length === 0) {
  fail('no matching Harmony remote attached (list-remotes.ts says what is there)');
}
if (candidates.length > 1) {
  const seen = candidates.map((d) => `0x${d.productId.toString(16)} at ${d.path}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --path to say which`);
}

const found = candidates[0] as { productId: number; path: string | undefined };
process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ),
  { timeoutMs: 2000 },
);

try {
  // `getVersion` resends once by itself when a remote that has never spoken says nothing, section
  // 155, so no retry loop is needed here.
  const fields = await remote.getVersion();
  const reading = readVersion(fields);

  process.stdout.write(`\nfirmware      ${reading.firmware}\n`);
  process.stdout.write(`hardware      ${reading.hardware}\n`);
  process.stdout.write(`flash         ${reading.flash}\n`);
  process.stdout.write(`architecture  ${reading.architecture}\n`);
  process.stdout.write(
    `software type ${reading.softwareType}` +
      `${reading.softwareTypeName === undefined ? '' : ` (${reading.softwareTypeName})`}\n`,
  );
  process.stdout.write(`skin          ${reading.skin}\n`);
  process.stdout.write(`platform      0x${reading.platform.toString(16).padStart(2, '0')}\n`);

  // The whole block as it came, because six of its fields are identified and the rest are kept
  // rather than dropped, and an unidentified byte moving is how the next one gets named.
  process.stdout.write('\nthe block as received:\n');
  for (const [index, byte] of fields.entries()) {
    const name = VERSION_FIELD_NAMES[index] ?? 'unidentified';
    process.stdout.write(`  ${String(index).padStart(2)}  0x${byte.toString(16).padStart(2, '0')}  ${name}\n`);
  }

  if (record !== undefined) {
    // One more read, of internal program memory rather than the config flash. The count is 64 and
    // even, which is a rail: an internal read of an odd count never terminates, section 94.
    const block = await remote.readUnitIdentity();
    if (!identifiesAUnit(block)) {
      fail('\nthis remote\'s identity block carries no per unit value: its two GUID fields are '
        + 'uniform filler, so recording it would give the write rails something that matches every '
        + 'unit. Refusing. The field named the serial is 0xEE on every remote read here and is not '
        + 'an identifier.');
    }
    const text = unitIdentityText(block);
    const existing = unitIdentity(record);
    if (existing !== undefined && existing !== text && !force) {
      fail(`\n${unitIdentityPath(record)} already records a different unit. Refusing: a label `
        + 'pointing at the wrong remote is worse than one pointing at nothing, because the rails '
        + 'would then permit a write to whatever was recorded last. Pass --force if this label '
        + 'really should move to the remote on the cable.');
    }
    const path = unitIdentityPath(record);
    if (path.startsWith('<no lab>')) fail('\nno lab directory, so there is nowhere to record it');
    mkdirSync(dirname(path), { recursive: true });
    const now = new Date().toISOString().slice(0, 10);
    writeFileSync(path,
      `# ${record}: product 0x${found.productId.toString(16)}, firmware ${reading.firmware}, `
      + `skin ${reading.skin}, architecture ${reading.architecture}\n`
      + `# read ${now} by packages/usb/bin/read-identity.ts --record ${record}\n`
      + `# the two GUIDs of the identity block at internal page 0xff offset 0xf400, section 226\n`
      + `${text}\n`);
    process.stdout.write(`\nunit identity ${text.slice(0, 8)}..., ${existing === text
      ? 'unchanged' : 'recorded'} in ${path}\n`);
    // A read back, because a file the rails depend on is worth checking rather than assuming.
    const back = readFileSync(path, 'utf8');
    if (!back.includes(text)) fail('the recorded file does not contain what was read');
  }
} finally {
  remote.close();
}
