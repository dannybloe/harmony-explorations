/**
 * One run of `writeFileFamilyConfiguration` against `FakeFileRemote`, for `file-family-run.test.ts`,
 * `todo.md` 7.3.10.
 *
 * **Two ways in**, the shape `filewrite.test.ts` uses: a test calls `runFileFamily` in its own process for the
 * shipped state, the flags unset, and starts this file as a process of its own with `HARMONY_ENABLE_WRITES=1` and
 * `HARMONY_FILE_WRITE=1` for a commit, since the rails read the flags once, when `rails.ts` loads; a scenario goes
 * in as JSON on standard input and the result comes back as JSON. **Nothing here can reach a device**: the only
 * transport the run is handed is the fake behind the guard `openFileBasedRemote` returns.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { guardFileProtocol } from '../../src/filepipe.ts';
import { writeFileFamilyConfiguration, type FileFamilyWriteResult } from '../../src/filewrite.ts';
import { IDENTITY_BYTES, IDENTITY_FIELDS } from '../../src/identity.ts';
import { trailerChecksum } from '../../src/trailer.ts';
import { FakeFileRemote } from './fake-file-remote.ts';

/**
 * A synthetic container in this family's shape, `filewrite.test.ts`'s fixture: `GSPM`, `end_addr` naming the
 * end marker above `0x020000`, `LWJL` at `0x47`, a body, the trailer checksum, `PTYY`.
 */
export function container(length: number, seed = 1): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 7 + seed * 13) & 0xff;
  bytes.set([0x47, 0x53, 0x50, 0x4d], 0);
  new DataView(bytes.buffer).setUint32(4, 0x020000 + length - 4, true);
  bytes.set([0x4c, 0x57, 0x4a, 0x4c], 0x47);
  bytes.set([0x50, 0x54, 0x59, 0x59], length - 4);
  new DataView(bytes.buffer).setUint16(length - 6, trailerChecksum(bytes), true);
  return bytes;
}

/** An identity block in the shape a remote's is: `0xEE`, two GUIDs, filler. Seed 1 is the recorded unit. */
export function guidFor(seed: number): Uint8Array {
  const block = new Uint8Array(IDENTITY_BYTES).fill(0xff);
  block.fill(0xee, IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  for (let i = 0; i < 0x20; i += 1) block[IDENTITY_FIELDS.guidA + i] = (seed * 31 + i * 7 + 1) & 0xff;
  return block;
}

/** A Harmony 350's identity file as the fake serves it. */
const SYSINFO = 'arch 0x10\nskin 0x68\nfw_ver 1.4.0\nlink_packet_length 64\n';

export interface FileFamilyScenario {
  readonly commit?: boolean;
  readonly reboot?: boolean;
  /** Hand the container in as a remote serves it, four bytes short. */
  readonly asRead?: boolean;
  /** Hand in bytes that are no container at all. */
  readonly notAContainer?: boolean;
  /** The label the caller names its unit by; `h350`, whose skin the fake states, when absent. */
  readonly label?: string;
  /** Which unit is on the cable, by seed; 1, the recorded one, when absent. */
  readonly onCable?: number;
  /** What the remote holds: the backup (absent), or a configuration the caller holds no copy of. */
  readonly remoteHolds?: 'backup' | 'unknown';
}

export interface FileFamilyRun {
  readonly result?: Omit<FileFamilyWriteResult, 'container'> & { readonly containerLength: number };
  readonly error?: { readonly name: string; readonly message: string };
  readonly lines: string[];
  readonly opened: boolean;
  /** Where `onCommit` was called, as the number of reports sent before it, or -1. */
  readonly onCommitAt: number;
  readonly erased: boolean;
  readonly rebooted: boolean;
  readonly flashHoldsIt: boolean;
  /** The first two bytes of every report sent, service and command. */
  readonly sent: string[];
}

export async function runFileFamily(scenario: FileFamilyScenario): Promise<FileFamilyRun> {
  const backup = container(5000, 1);
  const next = container(62 * 50 + 100, 2);
  const remote = new FakeFileRemote({
    sysinfo: SYSINFO,
    guid: guidFor(scenario.onCable ?? 1),
    usercfg: scenario.remoteHolds === 'unknown' ? container(4000, 3) : backup,
  });
  const lines: string[] = [];
  let opened = false;
  let onCommitAt = -1;
  const handedIn = scenario.notAContainer ? new Uint8Array(100).fill(0x11)
    : scenario.asRead ? next.subarray(0, next.length - 4) : next;
  let result: FileFamilyRun['result'];
  let error: FileFamilyRun['error'];
  try {
    const { container: written, ...rest } = await writeFileFamilyConfiguration({
      unit: { label: scenario.label ?? 'h350', record: `units/${scenario.label ?? 'h350'}.txt` },
      permittedUnit: guidFor(1),
      container: { name: 'x.bin', bytes: handedIn },
      backup,
      commit: scenario.commit ?? false,
      reboot: scenario.reboot ?? true,
      open: async () => {
        opened = true;
        return guardFileProtocol(remote);
      },
      say: (line) => lines.push(line),
      onCommit: () => { onCommitAt = remote.sent.length; },
    });
    result = { ...rest, containerLength: written.length };
  } catch (thrown: unknown) {
    error = thrown instanceof Error
      ? { name: thrown.constructor.name, message: thrown.message }
      : { name: typeof thrown, message: String(thrown) };
  }
  return {
    ...(result === undefined ? {} : { result }),
    ...(error === undefined ? {} : { error }),
    lines,
    opened,
    onCommitAt,
    erased: remote.erased,
    rebooted: remote.rebooted,
    flashHoldsIt: remote.flash.subarray(0, next.length).every((b, i) => b === next[i]),
    sent: remote.sent.map((r) => [...r.subarray(0, 2)].map((b) => b.toString(16).padStart(2, '0')).join(' ')),
  };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  process.stdout.write(JSON.stringify(await runFileFamily(JSON.parse(Buffer.concat(chunks).toString('utf8')) as FileFamilyScenario)));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
