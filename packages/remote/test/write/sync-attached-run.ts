/**
 * One sync of a document to an attached remote whose configuration is written into flash, a Harmony One unless a
 * scenario names a Harmony 600, 650 or 700, against the pretend remote of the compiled families, for
 * `sync-attached.test.ts`.
 *
 * **Why a file of its own.** A committed write is refused unless the two write flags are in the environment, and
 * the flags are read where the rails are loaded, so a run that commits is a process of its own with the flags set,
 * as the configuration write's own runs are, `write-config-run.ts`. This file is that process and, imported, the
 * same run in the test's process for everything that sends nothing.
 *
 * **What it sets up, with no lab.** The document is the model's empty setup, built here. What the remote holds
 * to begin with is the same setup built at another moment, so the two differ in their stamps and the write has
 * blocks to write; the keeper's region read is that, whole blocks from the region's base with one block of remains
 * above it, and the flash is a pattern everywhere else so no neighbour is blank. The rails are real: the pretend
 * remote asserts each rail its `HarmonyRemote` counterpart asserts, `fake-classic-remote.ts`.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildFromRecipe, recipe, type Recipe } from '@freeharmony-sdk/config/node';
import { unitIdentityText, type FoundRemote, type HarmonyRemote } from '@freeharmony-sdk/usb';
import { CONFIG_REGION_BASE, ERASE_BLOCK_SIZE } from '@freeharmony-sdk/usb/rails';
import { NOMINAL_FLASH_SIZE } from '@freeharmony-sdk/usb/write';

import { syncDocument, type SyncEvent, type SyncOutcome } from '../../src/write.ts';
import { FakeClassicRemote, identityFor } from './fake-classic-remote.ts';

const ONE = { name: 'Harmony One', skin: 54 };

/**
 * Each model this stand in serves, as a remote on the cable states it: its architecture, its product id, the firmware
 * build its write end was read in as the version block's first field (`0x34` is 3.4), the word it enumerates with, BCD
 * of 1000 and its skin, and the label of the library's unit of that model. The Harmony 600 and 650 enumerate alike, as
 * on the bench, and are told apart by their skins; the three share the Harmony One's stand in, which keeps flash per
 * architecture by the rails' own tables.
 */
export const SYNC_MODELS = {
  'Harmony One': { model: ONE, architecture: 12, product: 0xc121, firmware: 0x34, release: 0x1054, label: 'one_spare' },
  'Harmony 600': { model: { name: 'Harmony 600', skin: 71 }, architecture: 14, product: 0xc122, firmware: 0x02, release: 0x1071, label: 'h600' },
  'Harmony 650': { model: { name: 'Harmony 650', skin: 72 }, architecture: 14, product: 0xc122, firmware: 0x02, release: 0x1072, label: 'h650' },
  'Harmony 700': { model: { name: 'Harmony 700', skin: 66 }, architecture: 14, product: 0xc122, firmware: 0x28, release: 0x1066, label: 'h700' },
} as const;
/** When the document is built, and when what the remote holds was. */
export const BUILT_AT = '2026-11-14T10:00:00';
export const HELD_AT = '2026-11-01T08:00:00';

export interface SyncScenario {
  /** Which model is on the cable and synced: a Harmony One unless given. */
  readonly model?: keyof typeof SYNC_MODELS;
  readonly commit?: boolean;
  /** Which unit is on the cable: 1 is the recorded one, the default. */
  readonly onCable?: number;
  /** The word the remote enumerates with; the Harmony One's unless given. */
  readonly release?: number;
  /** The unit label the keeper names; the spare Harmony One's unless given. */
  readonly label?: string;
  /** The remote already holds what the document builds to. */
  readonly holdsTheDocument?: boolean;
  /** Ask for a stop: before the sync starts, or at the first event of a phase. */
  readonly stopAt?: 'start' | 'backup' | 'write';
  /** The observer throws on every event. */
  readonly observerThrows?: boolean;
  /**
   * The first erase reaches the block above the one it was told to erase as well, which flash with a larger erase
   * sector than the write assumes would do: that block is set to `0xff` too.
   */
  readonly eraseReaches?: boolean;
  /** Fail the nth flash write of the first sync, counted from 1, and then run the same sync again. */
  readonly failWrite?: number;
  /** Build the second sync at another moment than the first, where there is a second. */
  readonly againAtAnotherMoment?: boolean;
  /** The remote does not answer when it is opened, with these words. */
  readonly openFails?: string;
  /** Every flash read fails with these words: the compare before the write stops at its first block. */
  readonly readFails?: string;
  /** Every flash read fails with these words once the read back has begun. */
  readonly verifyFails?: string;
  /**
   * Once the read back has begun, one byte of the configuration in flash is changed, so what is read back differs
   * from what was written though every block read back as written while it was.
   */
  readonly verifyDiffers?: boolean;
  /** The restart fails with these words. */
  readonly restartFails?: string;
  /** The keeper cannot keep the configuration it is handed, and says so in these words. */
  readonly keepFails?: string;
  /** The document gives two keys of its device a second command when held, two problems of its check. */
  readonly heldKeys?: boolean;
}

export interface SyncRun {
  /** The events as short words, in order, of the first sync and, where there was one, of the second. */
  readonly words: string[];
  readonly outcome: SyncOutcome;
  readonly again?: { readonly words: string[]; readonly outcome: SyncOutcome };
  /** The pretend remote's calls, in order, consecutive reads folded. */
  readonly calls: string[];
  readonly journal: number;
  /** The journal's lines themselves, of both syncs where there were two. */
  readonly lines: readonly string[];
  /** How often the keeper was handed the configuration, and whether it was the one built. */
  readonly kept: number;
  readonly keptTheBuild: boolean;
  readonly opened: number;
  /** Whether the remote ends holding the built configuration, and whether its flash is as it began. */
  readonly holdsTheBuild: boolean;
  readonly unchanged: boolean;
}

const words = (events: readonly SyncEvent[]): string[] => events.map((event) => (event.kind === 'phase' ? event.phase
  : event.kind === 'progress' ? `${event.phase} ${event.done}/${event.total}`
    : event.kind === 'attention' ? `! ${event.attention}` : `= ${event.outcome.result}`));

/** Each model's empty setup's configuration by the model and the moment it was built at, for every run of this process. */
const BUILDS = new Map<string, Uint8Array>();

/** The empty Harmony One setup with two keys of a device given a second command when held, which its check refuses twice. */
export function heldKeysDocument(): Recipe {
  return recipe.open({
    model: ONE,
    devices: [{ name: 'Television', device: 'Made/TV', keys: [
      { key: 'VolumeUp', press: 'held', action: { nothing: true } },
      { key: 'VolumeDown', press: 'held', action: { nothing: true } },
    ] }],
    activities: [],
  });
}

export async function runSync(scenario: SyncScenario): Promise<SyncRun> {
  const on = SYNC_MODELS[scenario.model ?? 'Harmony One'];
  const ARCHITECTURE = on.architecture;
  const base = CONFIG_REGION_BASE[ARCHITECTURE] as number;
  const blockSize = ERASE_BLOCK_SIZE[ARCHITECTURE] as number;
  // What the remote holds is always built from the empty setup; the document synced is that setup, or one its check
  // refuses, which nothing builds.
  const plain = recipe.create(on.model);
  const document = scenario.heldKeys === true ? heldKeysDocument() : plain;
  const configuration = (builtAt: string): Uint8Array => {
    // The same setup built at the same moment is the same bytes, so the runs of one process build each moment once.
    const key = `${on.model.name} ${builtAt}`;
    const known = BUILDS.get(key) ?? (buildFromRecipe(plain, { builtAt }) as { bytes: Uint8Array }).bytes;
    BUILDS.set(key, known);
    return Uint8Array.from(known);
  };
  const built = configuration(BUILT_AT);
  const held = scenario.holdsTheDocument === true ? built : configuration(HELD_AT);

  const region = new Uint8Array((Math.ceil(held.length / blockSize) + 1) * blockSize).fill(0x5a);
  region.set(held, 0);
  const flash = new Uint8Array(NOMINAL_FLASH_SIZE[ARCHITECTURE] as number).fill(0x3c);
  flash.set(region, base);
  const before = Uint8Array.from(flash);

  const remote = new FakeClassicRemote({ architecture: ARCHITECTURE, firmware: on.firmware, flash, identity: identityFor(scenario.onCable ?? 1) });
  let writes = 0;
  const write = remote.writeFlash.bind(remote);
  // Reads fail from the start, or from the moment the read back is entered, which the events say.
  let reading = scenario.readFails;
  const read = remote.readFlash.bind(remote);
  remote.readFlash = async (address, count): Promise<Uint8Array> => {
    if (reading !== undefined) throw new Error(reading);
    return read(address, count);
  };
  const reset = remote.resetDevice.bind(remote);
  remote.resetDevice = async (p): Promise<void> => {
    if (scenario.restartFails !== undefined) throw new Error(scenario.restartFails);
    await reset(p);
  };
  let erases = 0;
  const erase = remote.eraseFlash.bind(remote);
  remote.eraseFlash = async (p, address): Promise<void> => {
    erases += 1;
    await erase(p, address);
    if (scenario.eraseReaches === true && erases === 1) flash.fill(0xff, address + blockSize, address + 2 * blockSize);
  };
  remote.writeFlash = async (p, address, data): Promise<void> => {
    writes += 1;
    if (writes === scenario.failWrite) throw new Error('the cable was pulled');
    await write(p, address, data);
  };

  const found: FoundRemote = {
    vendorId: 0x046d, productId: on.product, path: undefined, product: 'Harmony Remote', manufacturer: 'Logitech',
    release: scenario.release ?? on.release,
  };
  let kept = 0;
  let keptTheBuild = true;
  let opened = 0;
  const lines: string[] = [];
  const stop = new AbortController();
  if (scenario.stopAt === 'start') stop.abort();

  const once = async (builtAt: string = BUILT_AT): Promise<{ words: string[]; outcome: SyncOutcome }> => {
    const events: SyncEvent[] = [];
    const outcome = await syncDocument({
      document,
      remote: {
        kind: 'attached',
        found,
        keeper: {
          kind: 'compiled',
          units: [{ label: scenario.label ?? on.label, regions: new Set(['held']) }],
          records: { text: () => unitIdentityText(identityFor(1)), where: (label) => `units/${label}.txt` },
          region: { name: 'held', bytes: region },
          keep: (bytes) => {
            if (scenario.keepFails !== undefined) throw new Error(scenario.keepFails);
            kept += 1;
            keptTheBuild &&= bytes.length === built.length && bytes.every((b, i) => b === built[i]);
          },
          open: async () => {
            opened += 1;
            if (scenario.openFails !== undefined) throw new Error(scenario.openFails);
            return { remote: remote as unknown as HarmonyRemote, productId: on.product };
          },
        },
      },
      sources: { builtAt },
      commit: scenario.commit ?? false,
      onEvent: (event) => {
        events.push(event);
        if (event.kind === 'phase' && event.phase === scenario.stopAt) stop.abort();
        if (event.kind === 'phase' && event.phase === 'verify' && scenario.verifyFails !== undefined) reading = scenario.verifyFails;
        // A byte in the middle of the configuration, past every block's own read back: inverted, so it differs.
        if (event.kind === 'phase' && event.phase === 'verify' && scenario.verifyDiffers === true) {
          const at = base + Math.floor(built.length / 2);
          flash[at] = flash[at]! ^ 0xff;
        }
        if (scenario.observerThrows === true) throw new Error('the screen failed');
      },
      journal: (line) => lines.push(line),
      stop: stop.signal,
    });
    return { words: words(events), outcome };
  };

  const first = await once();
  const again = scenario.failWrite === undefined ? undefined : await once(scenario.againAtAnotherMoment === true ? '2026-11-14T10:00:07' : BUILT_AT);
  return {
    ...first,
    ...(again === undefined ? {} : { again }),
    calls: remote.calls,
    journal: lines.length,
    lines,
    kept,
    keptTheBuild,
    opened,
    holdsTheBuild: flash.subarray(base, base + built.length).every((b, i) => b === built[i]),
    unchanged: flash.every((b, i) => b === before[i]),
  };
}

/**
 * One run in a process of its own with the two write flags set, which is how a test commits: the rails read the flags
 * once, as they load, so the test's own process, which has neither, cannot.
 */
export function runSyncCommitted(scenario: SyncScenario): SyncRun {
  return runSyncCommittedAll([scenario])[0]!;
}

/**
 * Several runs in one process of their own with the two write flags set, one after another, each with its own stand
 * in, flash and keeper, so a test that commits many pays for one process rather than one per run.
 */
export function runSyncCommittedAll(scenarios: readonly SyncScenario[]): SyncRun[] {
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
    input: JSON.stringify(scenarios),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_FIRST_WRITE: '1' },
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return JSON.parse(out) as SyncRun[];
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  // A list of scenarios is run one after another and answered as a list; one scenario alone, as itself.
  const asked = JSON.parse(Buffer.concat(chunks).toString('utf8')) as SyncScenario | SyncScenario[];
  if (!Array.isArray(asked)) {
    process.stdout.write(JSON.stringify(await runSync(asked)));
    return;
  }
  const runs: SyncRun[] = [];
  for (const scenario of asked) runs.push(await runSync(scenario));
  process.stdout.write(JSON.stringify(runs));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
