/**
 * Read a connected remote's version block and print it. Read only, one command.
 *
 *   node packages/usb/bin/read-identity.ts
 *   node packages/usb/bin/read-identity.ts --product 0xc121
 *
 * `GET_VERSION` and nothing else, which is one of the three commands on the read only allow list in
 * `protocol.ts`, so the guarded transport passes it without any authorisation being issued.
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
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';
import { VERSION_FIELD_NAMES, readVersion } from '../src/protocol.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
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
} finally {
  remote.close();
}
