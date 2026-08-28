/**
 * Read one file off a remote in the **file based** family and print it. Four commands, none of
 * which writes.
 *
 * `read-file-identity.ts` answers one question and this one is the general instrument: it reads any
 * path on `INERT_PATHS` and prints it both as text and as bytes, because a file on this protocol may
 * be either and the only way to find out is to look. Anything off that list needs
 * `HARMONY_FILE_PATH_EXPERIMENT=1`, which is the named door in front of a path that may be an
 * action rather than a file, `docs/findings.md` section 200.
 *
 * **This opens the device.** It goes through `openFileBasedRemote`, whose transport permits open for
 * reading, read, close and ping and refuses everything else, so nothing this script can be made to
 * do will change a byte on the remote.
 *
 * **What it prints may identify a unit.** `/sys/guid`, `/sys/sysinfo` and `/rf/deviceinfo` carry
 * serials and pairing identifiers, which is personal data under this repository's own rule, so the
 * output goes on a terminal and never into a commit.
 *
 *     node packages/usb/bin/read-file.ts --file /rf/deviceinfo [--product 0xc12b] [--device <path>]
 */
import { INERT_PATHS, openFileBasedRemote, readFile } from '../src/filepipe.ts';

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at < 0 ? undefined : process.argv[at + 1];
}

/** A hex and ASCII dump, sixteen bytes to a line, because a text file and a packed one look alike. */
function dump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let at = 0; at < bytes.length; at += 16) {
    const row = bytes.slice(at, at + 16);
    const hex = [...row].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const text = [...row].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    lines.push(`  ${at.toString(16).padStart(4, '0')}  ${hex.padEnd(47)}  ${text}`);
  }
  return lines.join('\n');
}

/** Whether every byte is something a text file would hold, which decides how to print it. */
function isText(bytes: Uint8Array): boolean {
  return [...bytes].every((b) => (b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09);
}

async function main(): Promise<void> {
  const file = arg('--file');
  if (file === undefined) {
    console.error('--file is required. Paths this script will open without the named door:');
    for (const path of INERT_PATHS) console.error(`  ${path}`);
    process.exit(2);
  }
  const product = arg('--product');
  const device = arg('--device');

  // Built by parts rather than with undefined members, because `exactOptionalPropertyTypes` makes
  // "absent" and "present and undefined" different types, and the selector means the first.
  const select: { productId?: number; path?: string } = {};
  if (product !== undefined) select.productId = Number.parseInt(product, 16);
  if (device !== undefined) select.path = device;

  const transport = await openFileBasedRemote(select);
  try {
    const bytes = await readFile(transport, file);
    console.log(`${file}: ${bytes.length} bytes`);
    if (bytes.length === 0) return;
    console.log(dump(bytes));
    // Printed verbatim rather than parsed: this family stores one file as lines of name and value
    // and another as JSON behind a `Response,` prefix, so a reader that assumed either shape would
    // mangle the other. `read-file-identity.ts` is where the identity file's own parse lives.
    if (isText(bytes)) {
      console.log('\nas text:');
      console.log(Buffer.from(bytes).toString('ascii'));
    } else {
      console.log('\nnot text: at least one byte is outside the printable range');
    }
  } finally {
    await transport.close();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
