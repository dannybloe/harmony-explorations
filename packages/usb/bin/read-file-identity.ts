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
 * Touch is architecture 18 and concordance, reading the remote, reported 17, section 197. This read was
 * taken on a Touch and the remote states 17 itself, section 200, which settles what the remote reports
 * and not which number is right: both sources read what they read, and nothing here depends on the
 * choice. This said the USB descriptor implied 17 and that this read would settle the disagreement
 * until 10 October 2026.
 *
 *     node packages/usb/bin/read-file-identity.ts [--product 0xc12b] [--path <path>] [--raw]
 *     node packages/usb/bin/read-file-identity.ts --product 0xc124 --record h350 [--force]
 *     node packages/usb/bin/read-file-identity.ts --product 0xc12b --record touch [--force]
 *
 * ## `--record <label>`, the unit record the file write path compares against
 *
 * `todo-compile-350.md` 1.6. Reads one more file, `/sys/guid`, which is on `INERT_PATHS` and goes
 * through the same open for reading, read and close, and writes its two GUIDs to the lab's
 * `units/<label>.txt` in the form `read-identity.ts --record` writes for the command family. **It is
 * the same block**: sixteen `0xEE`, two GUIDs, and filler, 64 bytes, with the identity file's `guid`
 * field being its hex. So `unitIdentityText` and `sameUnit` take it unchanged, and one record format
 * serves every family.
 *
 * The same three refusals as that script, for the same reasons: it prints eight characters and writes
 * the rest into the private lab, since the value identifies a piece of hardware; it refuses a block
 * whose GUIDs are filler, which would match every unit; and it refuses to move a label to a different
 * unit without `--force`, since a label pointing at the wrong remote permits a write to it. The labels
 * `write-file-config.ts` looks for are `h350` and `h300`.
 *
 * ## A remote that refuses `/sys/guid`: the Harmony Touch, `todo-touch.md` 6.2
 *
 * A Touch refuses `/sys/guid` at open, `reference/remotes/harmony-touch/usb.md`, so it has no identity
 * block to record. What tells one Touch from another is the identity file's `serial_number`, which the
 * remote's native program fills from the unit's manufacturing record, `tests/test_harmony_touch_serial.py`.
 * So when the remote refuses `/sys/guid`, its identity file states a Touch's architecture and skin, 17 and
 * 99 as the remote numbers them, and it states a serial, the record is
 * `unitIdentityFromSerial` of that serial: 32 bytes in the same hex form, which `sameUnit` compares as it
 * compares two GUIDs, and the record's comment says which source it came from. Nothing more is opened
 * for it: the serial is in the identity file already read.
 *
 * The same three refusals hold. Eight characters of the record are printed and never the serial; an empty
 * serial, which is what the remote states when its manufacturing record is missing, and filler are
 * refused, since either would match every such unit; and a label is not moved without `--force`. The
 * label the Touch's request channel looks for is `touch`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { unitIdentity, unitIdentityPath } from '@harmony/lab';

import {
  closeFile,
  openFileBasedRemote,
  openFileForReading,
  parseSysInfo,
  readFile,
  readOpenFile,
  SYSINFO_FIELDS,
} from '../src/filepipe.ts';
import { identifiesAUnit, unitIdentityFromSerial, unitIdentityText } from '../src/identity.ts';
import { TOUCH_REQUEST_ARCHITECTURES, TOUCH_REQUEST_SKINS } from '../src/rails.ts';
import { TransportError } from '../src/transport.ts';

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const product = arg('--product');
  const path = arg('--path');
  const raw = process.argv.includes('--raw');
  const record = arg('--record');
  const force = process.argv.includes('--force');
  if (record !== undefined && !/^[a-z0-9_]+$/.test(record)) {
    fail(`--record takes a label of lower case letters, digits and underscores, not ${record}`);
  }

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

    if (record !== undefined) {
      // One more read, of an inert path, through the same guarded transport. A Harmony Touch refuses it
      // at open, and only that refusal, from a remote whose identity file states a Touch's architecture
      // and skin, sends the record to the serial; any other failure stands. A Harmony 300 or 350 that
      // refused would otherwise get a serial record under its label, which the file write rail would then
      // fail to match: safe, but an error that names nothing, where this names the cause.
      const statesATouch = TOUCH_REQUEST_ARCHITECTURES.includes(Number.parseInt(fields.get('arch') ?? '', 16))
        && TOUCH_REQUEST_SKINS.includes(Number.parseInt(fields.get('skin') ?? '', 16));
      let block: Uint8Array | undefined;
      try {
        block = await readFile(transport, '/sys/guid');
      } catch (error: unknown) {
        const refusedAtOpen = error instanceof TransportError && /the remote refused command 0x1$/.test(error.message);
        if (!refusedAtOpen || !statesATouch) throw error;
      }
      let text: string;
      let source: string;
      if (block !== undefined) {
        if (block.length !== 64 || !identifiesAUnit(block)) {
          fail(`\n/sys/guid came back as ${block.length} bytes that carry no per unit value, so recording `
            + 'it would give the write rail something that matches every unit. Refusing.');
        }
        text = unitIdentityText(block);
        source = '# the two GUIDs of /sys/guid, the same identity block the command family keeps in program memory\n';
      } else {
        const serial = fields.get('serial_number');
        if (serial === undefined) {
          fail('\nthe remote refused /sys/guid and its identity file states no serial_number, so nothing on '
            + 'the cable says which unit this is. Refusing.');
        }
        try {
          text = unitIdentityText(unitIdentityFromSerial(serial));
        } catch (error: unknown) {
          fail(`\nthe identity file's serial_number cannot identify a unit: ${
            error instanceof Error ? error.message : String(error)}. Recording it would give the rail `
            + 'something that matches every unit. Refusing.');
        }
        source = '# no /sys/guid on this remote, refused at open: SHA-256 of the /sys/sysinfo serial_number, which the\n'
          + "# remote fills from its manufacturing record's unitid; unitIdentityFromSerial in packages/usb/src/identity.ts\n";
      }
      const existing = unitIdentity(record);
      if (existing !== undefined && existing !== text && !force) {
        fail(`\n${unitIdentityPath(record)} already records a different unit. Refusing: a label `
          + 'pointing at the wrong remote is worse than one pointing at nothing, because the rail '
          + 'would then permit a write to whatever was recorded last. Pass --force if this label '
          + 'really should move to the remote on the cable.');
      }
      const where = unitIdentityPath(record);
      if (where.startsWith('<no lab>')) fail('\nno lab directory, so there is nowhere to record it');
      mkdirSync(dirname(where), { recursive: true });
      const now = new Date().toISOString().slice(0, 10);
      writeFileSync(where,
        `# ${record}: architecture ${fields.get('arch') ?? '?'}, skin ${fields.get('skin') ?? '?'}, `
        + `firmware ${fields.get('fw_ver') ?? '?'}\n`
        + `# read ${now} by packages/usb/bin/read-file-identity.ts --record ${record}\n`
        + source
        + `${text}\n`);
      console.log(`\nunit identity ${text.slice(0, 8)}..., ${existing === text ? 'unchanged' : 'recorded'} in ${where}`);
      // A read back, because a file the rail depends on is worth checking rather than assuming.
      if (!readFileSync(where, 'utf8').includes(text)) fail('the recorded file does not contain what was read');
    }
  } finally {
    await transport.close();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
