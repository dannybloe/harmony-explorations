/**
 * One sync of a document to an attached Harmony One, against the pretend remote of the compiled families, for
 * `sync-attached.test.ts`.
 *
 * **Why a file of its own.** A committed write is refused unless the two write flags are in the environment, and
 * the flags are read where the rails are loaded, so a run that commits is a process of its own with the flags set,
 * as the configuration write's own runs are, `write-config-run.ts`. This file is that process and, imported, the
 * same run in the test's process for everything that sends nothing.
 *
 * **What it sets up, with no lab.** The document is the empty Harmony One setup, built here. What the remote holds
 * to begin with is the same setup built at another moment, so the two differ in their stamps and the write has
 * blocks to write; the keeper's region read is that, whole blocks from the region's base with one block of remains
 * above it, and the flash is a pattern everywhere else so no neighbour is blank. The rails are real: the pretend
 * remote asserts each rail its `HarmonyRemote` counterpart asserts, `fake-classic-remote.ts`.
 */
import { buildFromRecipe, recipe } from '@harmony/codec/node';
import { unitIdentityText, type FoundRemote, type HarmonyRemote } from '@harmony/usb';
import { CONFIG_REGION_BASE, ERASE_BLOCK_SIZE } from '@harmony/usb/rails';
import { NOMINAL_FLASH_SIZE } from '@harmony/usb/write';

import { syncDocument, type SyncEvent, type SyncOutcome } from '../../src/write.ts';
import { FakeClassicRemote, identityFor } from './fake-classic-remote.ts';

const ONE = { name: 'Harmony One', skin: 54 };
/** The Harmony One's architecture, product id, firmware build 3.4 and the word it enumerates with, BCD of 1000 and its skin. */
const ARCHITECTURE = 12;
const PRODUCT = 0xc121;
const FIRMWARE = 0x34;
const RELEASE = 0x1054;
/** When the document is built, and when what the remote holds was. */
const BUILT_AT = '2026-11-14T10:00:00';
const HELD_AT = '2026-11-01T08:00:00';

export interface SyncScenario {
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
  /** Fail the nth flash write of the first sync, counted from 1, and then run the same sync again. */
  readonly failWrite?: number;
  /** Build the second sync at another moment than the first, where there is a second. */
  readonly againAtAnotherMoment?: boolean;
}

export interface SyncRun {
  /** The events as short words, in order, of the first sync and, where there was one, of the second. */
  readonly words: string[];
  readonly outcome: SyncOutcome;
  readonly again?: { readonly words: string[]; readonly outcome: SyncOutcome };
  /** The pretend remote's calls, in order, consecutive reads folded. */
  readonly calls: string[];
  readonly journal: number;
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

export async function runSync(scenario: SyncScenario): Promise<SyncRun> {
  const base = CONFIG_REGION_BASE[ARCHITECTURE] as number;
  const blockSize = ERASE_BLOCK_SIZE[ARCHITECTURE] as number;
  const document = recipe.create(ONE);
  const configuration = (builtAt: string): Uint8Array => (buildFromRecipe(document, { builtAt }) as { bytes: Uint8Array }).bytes;
  const built = configuration(BUILT_AT);
  const held = scenario.holdsTheDocument === true ? built : configuration(HELD_AT);

  const region = new Uint8Array((Math.ceil(held.length / blockSize) + 1) * blockSize).fill(0x5a);
  region.set(held, 0);
  const flash = new Uint8Array(NOMINAL_FLASH_SIZE[ARCHITECTURE] as number).fill(0x3c);
  flash.set(region, base);
  const before = Uint8Array.from(flash);

  const remote = new FakeClassicRemote({ architecture: ARCHITECTURE, firmware: FIRMWARE, flash, identity: identityFor(scenario.onCable ?? 1) });
  let writes = 0;
  const write = remote.writeFlash.bind(remote);
  remote.writeFlash = async (p, address, data): Promise<void> => {
    writes += 1;
    if (writes === scenario.failWrite) throw new Error('the cable was pulled');
    await write(p, address, data);
  };

  const found: FoundRemote = {
    vendorId: 0x046d, productId: PRODUCT, path: undefined, product: 'Harmony Remote', manufacturer: 'Logitech',
    release: scenario.release ?? RELEASE,
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
          units: [{ label: scenario.label ?? 'one_spare', regions: new Set(['held']) }],
          records: { text: () => unitIdentityText(identityFor(1)), where: (label) => `units/${label}.txt` },
          region: { name: 'held', bytes: region },
          keep: (bytes) => {
            kept += 1;
            keptTheBuild &&= bytes.length === built.length && bytes.every((b, i) => b === built[i]);
          },
          open: async () => {
            opened += 1;
            return { remote: remote as unknown as HarmonyRemote, productId: PRODUCT };
          },
        },
      },
      sources: { builtAt },
      commit: scenario.commit ?? false,
      onEvent: (event) => {
        events.push(event);
        if (event.kind === 'phase' && event.phase === scenario.stopAt) stop.abort();
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
    kept,
    keptTheBuild,
    opened,
    holdsTheBuild: flash.subarray(base, base + built.length).every((b, i) => b === built[i]),
    unchanged: flash.every((b, i) => b === before[i]),
  };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const scenario = JSON.parse(Buffer.concat(chunks).toString('utf8')) as SyncScenario;
  process.stdout.write(JSON.stringify(await runSync(scenario)));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
