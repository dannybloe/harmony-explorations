/**
 * Read the identity of a remote in the **file based** family. Three commands, none of which writes.
 *
 * Open `/sys/sysinfo` for reading, read it, close it. That path and the eleven field names it
 * returns are strings in the Harmony 300 and 350 firmware, so the format is firmware derived; the
 * packet layout is Logitech's own specification, `docs/findings.md` section 198.
 *
 * **This opens the device**, unlike `list-remotes.ts`, so reach for it deliberately. It goes through
 * `openFileBasedRemote`, whose transport refuses everything except open for reading, read and close,
 * so nothing this script can be made to do will change a byte on the remote.
 *
 * The first thing worth reading in the output is `arch`. Logitech's own specification says a Harmony
 * Touch is architecture 18 and the remote's USB descriptor implies 17, and section 197 records that
 * disagreement as unresolved. This is the read that settles it.
 *
 *     node packages/usb/bin/read-file-identity.ts [--product 0xc12b] [--path <path>] [--raw]
 */
import {
  closeFile,
  openFileBasedRemote,
  openFileForReading,
  parseSysInfo,
  readOpenFile,
  SYSINFO_FIELDS,
} from '../src/filepipe.ts';

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at < 0 ? undefined : process.argv[at + 1];
}

async function main(): Promise<void> {
  const product = arg('--product');
  const path = arg('--path');
  const raw = process.argv.includes('--raw');

  // Built by parts rather than with undefined members, because `exactOptionalPropertyTypes` makes
  // "absent" and "present and undefined" different types, and the selector means the first.
  const select: { productId?: number; path?: string } = {};
  if (product !== undefined) select.productId = Number.parseInt(product, 16);
  if (path !== undefined) select.path = path;
  const transport = await openFileBasedRemote(select);
  try {
    const file = await openFileForReading(transport, '/sys/sysinfo');
    console.log(`opened /sys/sysinfo: handle ${file.handle}, ${file.size} bytes stated`);
    const bytes = await readOpenFile(transport, file.handle, file.size);
    await closeFile(transport, file.handle);

    const text = Buffer.from(bytes).toString('ascii');
    if (raw) {
      console.log('--- raw ---');
      console.log(JSON.stringify(text));
      console.log('--- end ---');
    }

    const fields = parseSysInfo(text);
    console.log(`\n${fields.size} field(s) read:`);
    for (const [name, value] of fields) {
      // Mark the ones the firmware also names, so a field nobody has seen before stands out rather
      // than blending into the list.
      const known = SYSINFO_FIELDS.includes(name) ? ' ' : ' (not in the arch 16 firmware)';
      console.log(`  ${name.padEnd(20)} ${value}${known}`);
    }
    for (const expected of SYSINFO_FIELDS) {
      if (!fields.has(expected)) console.log(`  ${expected.padEnd(20)} ABSENT on this model`);
    }
  } finally {
    await transport.close();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
