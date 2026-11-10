/**
 * One run of `writeConfiguration` against `FakeClassicRemote`, for `write-config-run.test.ts`.
 *
 * **Two ways in.** A test calls `runWrite` in its own process for everything that happens in the shipped state,
 * the flags unset, which is every refusal and the dry run. A run that has to get past `assertFirstWriteAllowed`
 * needs `HARMONY_ENABLE_WRITES=1` and `HARMONY_FIRST_WRITE=1`, which the rails read once when `rails.ts` loads,
 * so the test starts this file as a process of its own with the two flags set, hands it a scenario as JSON on
 * standard input and reads the same result back as JSON, the shape `touch-sync-run.ts` and `filewrite.test.ts`
 * use. **Nothing here can reach a device**: the only remote the write is ever handed is the fake, through the
 * scenario's `open`, and nothing in this file enumerates or opens hardware.
 *
 * **The configuration is a real one**, a lab sample named by the scenario, because the write parses it and runs
 * the codec's checks on it before anything is opened, and a synthetic container that passes them would be a
 * second derivation of the format. The region read is built from it: the configuration from the base, padded
 * to whole blocks, and one block of remains above it, so the write has a neighbour on each side to measure.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { require_ } from '@harmony/lab';
import { unitIdentityText, type HarmonyRemote } from '@harmony/usb';
import { CONFIG_REGION_BASE, ERASE_BLOCK_SIZE } from '@harmony/usb/rails';
import { NOMINAL_FLASH_SIZE } from '@harmony/usb/write';

import { stampForWrite } from '../../src/stamp.ts';
import {
  writeConfiguration,
  type ConfigWriteResult,
  type ConfigWriteStamp,
} from '../../src/write.ts';
import { FakeClassicRemote, identityFor } from './fake-classic-remote.ts';

/** The moment every `now` stamp is taken at, so a test can compute the bytes it expects. */
export const WHEN = new Date(2026, 9, 7, 9, 30, 15);

/** What a test asks for. */
export interface WriteScenario {
  /** The lab name of the configuration to write. */
  readonly sample: string;
  readonly architecture: 8 | 12 | 14;
  /** The firmware build the remote reports, as two nibbles; the model's own when absent. */
  readonly firmware?: number;
  /** Which unit is on the cable, by seed; 1, the recorded one, when absent. */
  readonly onCable?: number;
  /** Whether a record exists for the unit; true when absent. */
  readonly recorded?: boolean;
  readonly stamp?: 'now' | 'as-is' | 'resume';
  readonly commit?: boolean;
  readonly invalidate?: boolean;
  readonly restart?: boolean;
  readonly only?: 'drop' | 'restart';
  /**
   * What the remote's region holds: the region read (`region`, when absent); the configuration as it will be
   * written (`written`); the region read with the first block the write changes erased, what a run that stopped
   * after its erase leaves (`erased-first`); or the region read with a byte changed in that block, content the
   * caller does not hold (`other`).
   */
  readonly remoteHolds?: 'region' | 'written' | 'erased-first' | 'other';
  /** A byte of the region read to change, so the configuration differs from it there. */
  readonly regionFlip?: number;
  /** A byte of the configuration to change, damaging it. */
  readonly configFlip?: number;
  /** The name the region read goes by; `r`, the unit's own, when absent. */
  readonly regionName?: string;
  /** The label the caller names its one unit by; a bench unit of the remote's own model when absent. */
  readonly label?: string;
  /** Cut the region read to half the configuration. */
  readonly regionShort?: boolean;
  /** Data memory before the first erase and after it, by address, for the 885's install status. */
  readonly ram?: Readonly<Record<number, number>>;
  readonly ramAfterErase?: Readonly<Record<number, number>>;
}

export interface WriteRun {
  readonly outcome?: ConfigWriteResult;
  readonly error?: { readonly name: string; readonly message: string };
  /** Every line of the account, in order. */
  readonly lines: string[];
  /** The fake's calls in order, `saveStamped` among them where the write handed the stamped bytes over. */
  readonly calls: string[];
  readonly opened: boolean;
  readonly closed: boolean;
  readonly pastTheErase: boolean[];
  readonly warnings: string[];
  /** Whether the remote's region now holds the configuration as written, byte for byte, from the base. */
  readonly holdsTheConfig: boolean;
  /** Whether the remote's flash is unchanged from before the run. */
  readonly unchanged: boolean;
}

const PRODUCT: Record<number, number> = { 8: 0xc110, 12: 0xc121, 14: 0xc122 };
const FIRMWARE: Record<number, number> = { 8: 0x44, 12: 0x34, 14: 0x02 };
/** A unit of `CONFIG_WRITE_UNITS` per architecture, the one a scenario writes unless it names another. */
const LABEL: Record<number, string> = { 8: 'h885_a', 12: 'one_spare', 14: 'h650' };

/**
 * The bytes the write will put on the remote: stamped at `WHEN`, or the file as it is. A file the stamp refuses
 * is one the write refuses too, so for the layout of the remote it stands as it is.
 */
export function writtenBytes(config: Uint8Array, stamp: WriteScenario['stamp']): Uint8Array {
  if (stamp !== 'now' && stamp !== undefined) return config;
  try {
    return stampForWrite(config, WHEN).bytes;
  } catch {
    return config;
  }
}

export async function runWrite(scenario: WriteScenario): Promise<WriteRun> {
  const architecture = scenario.architecture;
  const base = CONFIG_REGION_BASE[architecture] as number;
  const blockSize = ERASE_BLOCK_SIZE[architecture] as number;
  const config = Uint8Array.from(require_(scenario.sample));
  if (scenario.configFlip !== undefined) config[scenario.configFlip]! ^= 0x01;

  // The region read: the configuration from the base, whole blocks, and one block of remains above it.
  const blocks = Math.ceil(config.length / blockSize) + 1;
  let region = new Uint8Array(blocks * blockSize).fill(0x5a);
  region.set(config, 0);
  if (scenario.regionFlip !== undefined) region[scenario.regionFlip]! ^= 0x01;
  const written = writtenBytes(config, scenario.stamp);
  const target = Uint8Array.from(region);
  target.set(written, 0);
  const firstChanged = Math.floor(target.findIndex((b, i) => b !== region[i]) / blockSize) * blockSize;
  if (scenario.regionShort) region = region.subarray(0, Math.floor(config.length / 2));

  // The remote: a pattern everywhere, so a neighbour is never blank, and the region at the base.
  const flash = new Uint8Array(NOMINAL_FLASH_SIZE[architecture] as number).fill(0x3c);
  const holds = scenario.remoteHolds ?? 'region';
  flash.set(holds === 'written' ? target : region, base);
  if (holds === 'erased-first') flash.fill(0xff, base + firstChanged, base + firstChanged + blockSize);
  if (holds === 'other') flash[base + firstChanged]! ^= 0x80;
  const before = Uint8Array.from(flash);

  let erased = false;
  const remote = new FakeClassicRemote({
    architecture,
    firmware: scenario.firmware ?? FIRMWARE[architecture] as number,
    flash,
    identity: identityFor(scenario.onCable ?? 1),
    ram: new Proxy({}, { get: (_, key) => (erased ? scenario.ramAfterErase : scenario.ram)?.[Number(key)] }),
  });
  const erase = remote.eraseFlash.bind(remote);
  remote.eraseFlash = async (p, address): Promise<void> => {
    await erase(p, address);
    erased = true;
  };

  const lines: string[] = [];
  const pastTheErase: boolean[] = [];
  const warnings: string[] = [];
  let opened = false;
  const stamp: ConfigWriteStamp = scenario.stamp === 'as-is' ? { kind: 'as-is' }
    : scenario.stamp === 'resume' ? { kind: 'resume', journal: 'x.bin.write-20261007T093015000Z.log' }
      : { kind: 'now', at: WHEN };

  let outcome: ConfigWriteResult | undefined;
  let error: { name: string; message: string } | undefined;
  try {
    outcome = await writeConfiguration({
      config: { name: 'x.bin', bytes: config },
      region: { name: scenario.regionName ?? 'r', bytes: region },
      units: [{ label: scenario.label ?? LABEL[architecture] as string, regions: new Set(['r']) }],
      records: {
        text: () => (scenario.recorded === false ? undefined : unitIdentityText(identityFor(1))),
        where: (label) => `units/${label}.txt`,
      },
      stamp,
      commit: scenario.commit ?? false,
      invalidate: scenario.invalidate ?? true,
      restart: scenario.restart ?? true,
      ...(scenario.only === undefined ? {} : { only: scenario.only }),
      open: async () => {
        opened = true;
        return { remote: remote as unknown as HarmonyRemote, productId: PRODUCT[architecture] as number };
      },
      saveStamped: () => { remote.calls.push('saveStamped'); },
      say: (line) => lines.push(line),
      onPastTheErase: (value) => pastTheErase.push(value),
      warn: (line) => warnings.push(line),
    });
  } catch (thrown: unknown) {
    error = thrown instanceof Error
      ? { name: thrown.constructor.name, message: thrown.message }
      : { name: typeof thrown, message: String(thrown) };
  }

  const now = flash.subarray(base, base + written.length);
  return {
    ...(outcome === undefined ? {} : { outcome }),
    ...(error === undefined ? {} : { error }),
    lines,
    calls: remote.calls,
    opened,
    closed: remote.closed,
    pastTheErase,
    warnings,
    holdsTheConfig: now.every((b, i) => b === written[i]),
    unchanged: flash.every((b, i) => b === before[i]),
  };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const scenario = JSON.parse(Buffer.concat(chunks).toString('utf8')) as WriteScenario;
  process.stdout.write(JSON.stringify(await runWrite(scenario)));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
