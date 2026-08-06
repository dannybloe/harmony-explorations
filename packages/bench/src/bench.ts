/**
 * What the bench instrument can do, independent of how it is asked.
 *
 * Everything the page can request is a method here, and there is no method that writes. That is the
 * same discipline as the reader interface in `@harmony/corpus`: the safety property is a shape, not
 * a promise, so it survives somebody adding a route without reading the rails.
 *
 * The hardware is injected rather than imported, so the whole surface is testable with a plain
 * object and no remote attached. `liveDeps()` is the one place that reaches for real USB.
 */
import { fileRead, profileFor, readConfig, type ConfigReader, type ReadProgress } from '@harmony/corpus';
import { parse, summary } from '@harmony/codec';

export interface AttachedRemote {
  readonly productId: number;
  readonly product: string | undefined;
  readonly path: string | undefined;
  /** Whether this project knows a config base for it. Most models it will not. */
  readonly known: boolean;
  readonly model: string | undefined;
  readonly architecture: number | undefined;
}

/** An opened remote, narrowed to reads and a close. */
export interface OpenRemote extends ConfigReader {
  close(): Promise<void>;
}

export interface BenchDeps {
  listRemotes(): Promise<Array<{ productId: number; product?: string | undefined; path?: string | undefined }>>;
  openRemote(productId: number): Promise<OpenRemote>;
  labRoot(): string | undefined;
  now(): Date;
}

/**
 * The version block, named where this project has earned a name for a field.
 *
 * Ten of the twelve were unnamed when the block was first read and five still are. Showing "field 7"
 * is the honest rendering: inventing a label for a byte nobody has placed is exactly the kind of
 * thing `docs/config-format.md` marks as unconfirmed, and a screen should not be laxer than a
 * document. See `docs/usb-protocol.md` section 4.
 */
export const VERSION_FIELDS: readonly (string | undefined)[] = [
  'firmware version',
  'hardware version',
  'flash device id',
  'flash manufacturer id',
  'protocol, high nibble',
  'skin',
  'constant 0x0C on every remote seen',
  undefined,
  'version of the image at 0xFF +0xE000',
  'version of the image at 0xFF +0x0000',
  undefined,
  undefined,
];

export interface LogEntry {
  readonly at: string;
  readonly what: string;
  readonly outcome: 'ok' | 'failed';
  readonly detail: string;
}

export class Bench {
  private readonly deps: BenchDeps;
  private readonly entries: LogEntry[] = [];

  constructor(deps: BenchDeps) {
    this.deps = deps;
  }

  /** Every command that reached a remote, so it is visible that nothing else did. */
  get log(): readonly LogEntry[] {
    return this.entries;
  }

  private record(what: string, outcome: 'ok' | 'failed', detail: string): void {
    this.entries.push({ at: this.deps.now().toISOString(), what, outcome, detail });
  }

  /** Enumeration only: this asks the operating system and opens nothing. */
  async remotes(): Promise<AttachedRemote[]> {
    const found = await this.deps.listRemotes();
    return found.map((d) => {
      let model: string | undefined;
      let architecture: number | undefined;
      try {
        const profile = profileFor(d.productId);
        model = profile.model;
        architecture = profile.architecture;
      } catch {
        // Expected for most models. Two architectures are covered out of at least eleven, so an
        // unknown remote is news worth showing rather than an error worth throwing.
      }
      return {
        productId: d.productId,
        product: d.product,
        path: d.path,
        known: model !== undefined,
        model,
        architecture,
      };
    });
  }

  /** Open, ask for the version block, close. The cheapest thing that says which unit this is. */
  async identify(productId: number): Promise<{ fields: number[]; named: Array<{ index: number; value: number; name: string | undefined }> }> {
    const remote = await this.deps.openRemote(productId);
    try {
      const block = await remote.getVersion();
      const fields = Array.from(block);
      this.record('GET_VERSION', 'ok', `${fields.length} fields`);
      return {
        fields,
        named: fields.map((value, index) => ({ index, value, name: VERSION_FIELDS[index] })),
      };
    } catch (err) {
      this.record('GET_VERSION', 'failed', String(err));
      throw err;
    } finally {
      await remote.close();
    }
  }

  /**
   * Read the whole config and file it.
   *
   * `onProgress` exists because this takes 40 seconds on a Harmony One at the measured 30 KiB/s,
   * which is far too long for a window that has stopped repainting.
   */
  async read(
    productId: number,
    label: string,
    onProgress?: (progress: ReadProgress) => void,
  ): Promise<Record<string, unknown>> {
    const labRoot = this.deps.labRoot();
    if (labRoot === undefined) throw new Error('no lab directory found; set HARMONY_LAB');
    const profile = profileFor(productId);
    const remote = await this.deps.openRemote(productId);
    try {
      const options = onProgress === undefined ? {} : { onProgress };
      const read = await readConfig(remote, profile, options);
      const when = this.deps.now();
      const filed = fileRead(labRoot, read, label, when);
      this.record(
        'READ_FLASH',
        'ok',
        `${read.bytes.length} bytes from 0x${profile.configBase.toString(16)}, filed as ${filed.config}`,
      );
      return {
        filed,
        bytes: read.bytes.length,
        durationMs: Math.round(read.durationMs),
        versionBlock: Array.from(read.versionBlock),
        container: summary(parse(read.bytes)),
      };
    } catch (err) {
      this.record('READ_FLASH', 'failed', String(err));
      throw err;
    } finally {
      await remote.close();
    }
  }
}

/** The one place that touches real hardware and the real lab directory. */
export async function liveDeps(): Promise<BenchDeps> {
  const { listHarmony, openHarmony, HarmonyRemote } = await import('@harmony/usb');
  const { LAB } = await import('@harmony/lab');
  return {
    async listRemotes() {
      return listHarmony();
    },
    async openRemote(productId: number) {
      const remote = new HarmonyRemote(await openHarmony({ productId }), { timeoutMs: 2000 });
      return {
        getVersion: () => remote.getVersion(),
        readFlash: (address: number, count: number) => remote.readFlash(address, count),
        close: () => remote.close(),
      };
    },
    labRoot: () => LAB,
    now: () => new Date(),
  };
}
