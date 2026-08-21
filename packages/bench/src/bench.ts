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
import {
  activities,
  devices,
  irGroups,
  irRepeatPeriod,
  keyCodes,
  describeChoices,
  keyLabels,
  pageScans,
  modePages,
  renderVariants,
  type Container,
  type ModePage,
  rasterPng,
  renderPage,
  idleActivityValue,
  parse,
  summary,
} from '@harmony/codec';
import { modelForSkin, VERSION_FIELD_NAMES } from '@harmony/usb';

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
  /** The configs the lab holds, by the name `loadConfig` takes. Nothing to do with hardware. */
  configNames(): string[];
  loadConfig(name: string): Uint8Array | undefined;
}

/**
 * The version block's field names, from the library.
 *
 * **This was a table here and it moved on 21 August 2026.** It was the only place the block was
 * labelled anywhere, which was fine while the bench was the only thing showing one; FreeHarmony
 * needing a firmware version and a flash id is what made a second copy imminent, and this project's
 * oldest rule is that two copies of a derivation are two copies until one of them moves. It had
 * already drifted: it called field 6 a constant `0x0C` for a month after the bench Harmony 525
 * reported `0x09`, section 76, because `make facts` cannot see prose inside code.
 *
 * Re-exported rather than imported at the call site so that the page's own shape does not change.
 */
export const VERSION_FIELDS = VERSION_FIELD_NAMES;

/** A device as the page shows it: what it is called, and how it behaves when a key is held. */
export interface DeviceView {
  readonly group: number;
  readonly name: string | undefined;
  /** Which route named it, since `names` is stated and `screen` is a last resort. Section 126. */
  readonly source: string | undefined;
  readonly codes: number;
  /** How many of its codes carry a held block, so how many can repeat at all. Section 127. */
  readonly repeating: number;
  /** The distinct repeat periods of those codes, in milliseconds, ascending. */
  readonly repeatMs: number[];
}

export interface ActivityView {
  readonly activity: number;
  readonly name: string | undefined;
  readonly page: number;
  readonly scans: number[];
  readonly devices: number[];
}

/** One button binding that sends infrared, and what holding it does. */
export interface KeyView {
  /** A mode page's list, or the key map an activity installs. Both hold bindings that send. */
  readonly where: string;
  readonly index: number;
  /** 0 none, 1 release, 2 press, 3 repeat. A send is a press bar seventeen handlers in the corpus. */
  readonly event: number;
  readonly scan: number;
  readonly group: number;
  readonly code: number;
  /** How many codes the binding sends: more than one is a macro. */
  readonly sends: number;
  /** The repeat period of the first code, milliseconds, or undefined where it does not repeat. */
  readonly repeatMs: number | undefined;
  /**
   * The label the screen draws for this key, where it has one. Section 128.
   *
   * Only a page binding can have one, since a set binding is a key on the keypad and the screen does not
   * label it. `labelSource` says how it was attributed, and the page shows it, because a label read off
   * a Harmony One's own hit map is stated and one placed by the screen row table is a reading of the
   * hardware's layout.
   */
  readonly label: string | undefined;
  readonly labelSource: string | undefined;
}

/**
 * A page of the config that has a screen, for the picker.
 *
 * **Every page that binds a key, not every page that sends a code.** The first version of this list
 * came from the key table, which only holds bindings that end in an infrared code, so the activity
 * pages were missing from it: an activity key selects a handler set and sends nothing itself. The
 * pages the interface most wants were the ones it could not offer.
 */
export interface PageKeyView {
  readonly scan: number;
  /** What the screen draws beside it, section 128, and how that was attributed. */
  readonly label: string | undefined;
  readonly labelSource: string | undefined;
  /** The activity this key starts, where it starts one. */
  readonly activity: string | undefined;
}

export interface PageView {
  readonly index: number;
  readonly keys: PageKeyView[];
  /** The activities this page starts, by name where they have one, so the picker can say so. */
  readonly activities: string[];
}

export interface InventoryView {
  readonly name: string;
  readonly architecture: number | undefined;
  /** The skin its slot 1 states, which is per config rather than per model. Section 81. */
  readonly skin: number | undefined;
  /**
   * The model that skin number names, where this project knows one.
   *
   * **Often it does not, and that is the config's doing rather than a gap in the table.** A Harmony
   * One's config here says 59 where the remote itself reports 54, and a Harmony 600's says 73 against
   * 71; the two arch 8 and arch 9 samples say 15 and 22, which are the numbers those remotes report.
   * Section 81 read why: an editor copies the word rather than computing it.
   */
  readonly model: string | undefined;
  readonly builtAt: string | undefined;
  readonly idle: number | undefined;
  readonly devices: DeviceView[];
  readonly activities: ActivityView[];
  readonly keys: KeyView[];
  readonly pages: PageView[];
}

/**
 * The skin the config's own slot 1 states: the low byte of its version word, section 81.
 *
 * **Per config and not per model**, which is why this is not the same question as which remote is
 * attached: an editor copies the word rather than computing it, and one Harmony One carries two
 * different ones either side of a sync.
 */
function skinOf(c: { versionWord?: number | undefined }): number | undefined {
  return c.versionWord === undefined ? undefined : c.versionWord & 0xff;
}

/**
 * How much of a file a container has to be for the file to count as a config.
 *
 * Halfway across a gap that nothing in the lab sits in: a config file is 0.869 to 1.000 of its own
 * length, and the four firmware images with a container embedded in them are 0.108 to 0.234.
 */
export const CONFIG_FILE_SHARE = 0.5;

/** Milliseconds to one decimal, from microseconds. */
function ms(microseconds: number): number {
  return Math.round(microseconds / 100) / 10;
}

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


  /**
   * The configs the lab holds. No hardware, so this works with nothing attached.
   *
   * The point of having it here rather than only after a read: a read takes 40 seconds on a Harmony
   * One and needs the remote on the desk, and most of the time the question is about a config that is
   * already filed.
   */
  configs(): string[] {
    return this.deps.configNames();
  }

  /**
   * What a config is for: its devices, its activities, and what each button sends.
   *
   * This is the composed view of sections 120 to 127, and it is deliberately the same call the
   * application will make: `inventory` in the codec is what orders the readers, and a screen that
   * assembled them itself would be a second copy of that order.
   *
   * The repeat column is the one that is not obvious. Holding a key replays the record's second
   * duration block for as long as it is down, so its length **is** the interval between two sends,
   * section 127. It is shown per device as the distinct periods and per key as its own, because that
   * is the number somebody trying to work out why a volume key overshoots is looking for.
   */
  inventory(name: string): InventoryView {
    const blob = this.deps.loadConfig(name);
    if (blob === undefined) throw new Error(`no config called ${name} in the lab`);
    const c = parse(blob);
    const groups = irGroups(c) ?? [];
    const labels = keyLabels(c);
    // **Once, and indexed by the page it starts from.** `activities` is a four hop chain, section 121,
    // and calling it inside the per page loop below made this whole view take up to sixteen seconds on
    // a Harmony 700 config: 289 pages times the whole chain. A click that takes that long looks like a
    // click that did nothing, which is how it was found. The map is the fix and the hoist is the point.
    const starting = new Map<number, ActivityView[]>();
    for (const one of activities(c)) {
      const list = starting.get(one.page) ?? [];
      list.push({
        activity: one.activity,
        name: one.name,
        page: one.page,
        scans: one.scans,
        devices: one.devices,
      });
      starting.set(one.page, list);
    }
    const periodOf = (group: number, code: number): number | undefined => {
      const address = groups[group]?.addresses[code];
      if (address === undefined) return undefined;
      const period = irRepeatPeriod(c, address);
      return period === undefined ? undefined : ms(period);
    };
    const deviceViews = devices(c).map((device): DeviceView => {
      const periods = new Set<number>();
      let repeating = 0;
      for (let code = 0; code < device.codes; code += 1) {
        const period = periodOf(device.group, code);
        if (period === undefined) continue;
        repeating += 1;
        periods.add(period);
      }
      return {
        group: device.group,
        name: device.name,
        source: device.source,
        codes: device.codes,
        repeating,
        repeatMs: [...periods].sort((a, b) => a - b),
      };
    });
    return {
      name,
      architecture: c.architecture,
      skin: skinOf(c),
      model: modelForSkin(skinOf(c))?.name,
      builtAt: c.builtAt,
      idle: idleActivityValue(c),
      devices: deviceViews,
      activities: [...starting.values()].flat(),
      pages: pageScans(c).flatMap((scans, index) => {
        if (scans.length === 0) return [];
        const starts = starting.get(index) ?? [];
        return [{
          index,
          keys: scans.map((scan) => {
            const label = labels.get(`${index}:${scan}`);
            const activity = starts.find((one) => one.scans.includes(scan));
            return {
              scan,
              label: label?.text,
              labelSource: label?.source,
              activity: activity?.name,
            };
          }),
          activities: starts.flatMap((one) => (one.name === undefined ? [] : [one.name])),
        }];
      }),
      keys: keyCodes(c).map((key) => {
        const first = key.codes[0] as { group: number; code: number };
        const label = key.where === 'page' ? labels.get(`${key.index}:${key.scan}`) : undefined;
        return {
          where: key.where,
          index: key.index,
          event: key.event,
          scan: key.scan,
          group: first.group,
          code: first.code,
          sends: key.codes.length,
          repeatMs: periodOf(first.group, first.code),
          label: label?.text,
          labelSource: label?.source,
        };
      }),
    };
  }

  /**
   * One of a config's screens, drawn, as a PNG.
   *
   * **The same call an editor makes.** A config read off a remote is bytes, `parse` takes bytes and
   * `renderPage` returns a raster, so nothing here touches a file: the picture is made on the way out.
   * That is the point of it living in the codec rather than in a script that writes PNG files.
   *
   * `branches` is what the caller must not hide: a page whose program switches on a state variable has
   * more than one appearance and this is the first, section 129.
   */
  screen(name: string, page: number, variant = 0): { png: Uint8Array; width: number; height: number;
    pictures: number; strings: number; branches: number } {
    const { c, chosen, pages } = this.pageOf(name, page);
    // Variant 0 is the all first arms path, which is what `renderPage` draws, so the common case does
    // not pay for the walk.
    const rendered = variant === 0
      ? renderPage(c, chosen)
      : renderVariants(c, chosen.program, variant + 1).variants[variant]?.page;
    if (rendered === undefined) {
      throw new Error(variant === 0
        ? 'this architecture has no known display size'
        : `page ${page} of ${pages.length} has no variant ${variant}`);
    }
    return {
      png: rasterPng(rendered.raster),
      width: rendered.raster.width,
      height: rendered.raster.height,
      pictures: rendered.pictures,
      strings: rendered.strings,
      branches: rendered.branches,
    };
  }

  /**
   * The appearances a page has, with the condition of each in words.
   *
   * A page whose program switches on the state of the remote looks different depending on that state,
   * section 129, and an interface that shows one of them without saying so is lying by omission. So the
   * conditions are named from base slot 0 where the variable has a name, and by index where it does
   * not. `truncated` means the list is capped rather than complete.
   */
  variants(name: string, page: number): {
    truncated: boolean;
    variants: Array<{ index: number; conditions: string[] }>;
  } {
    const { c, chosen } = this.pageOf(name, page);
    const walked = renderVariants(c, chosen.program);
    return {
      truncated: walked.truncated,
      variants: walked.variants.map((one, index) => ({
        index,
        conditions: describeChoices(c, one.choices),
      })),
    };
  }

  /** The config and the page both screen calls need, refused rather than defaulted. */
  private pageOf(name: string, page: number): {
    c: Container; chosen: ModePage; pages: ModePage[];
  } {
    const blob = this.deps.loadConfig(name);
    if (blob === undefined) throw new Error(`no config called ${name} in the lab`);
    const c = parse(blob);
    const pages = modePages(c);
    const chosen = pages[page];
    if (chosen === undefined) throw new Error(`no page ${page}, the config has ${pages.length}`);
    return { c, chosen, pages };
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
  const { IMAGES, LAB, imagePath, load } = await import('@harmony/lab');
  const { existsSync } = await import('node:fs');
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
    // Every named image the lab actually has that **is** a config, rather than a file with one inside
    // it. Filtering by what parses rather than by a second hand written list is what stops this
    // drifting from the corpus, but parsing alone is too loose: an arch 8 firmware image carries a
    // safe mode container, section 116, and so does an arch 12 internal page. The measured gap is
    // wide enough to be safe. A real config file is 0.869 to 1.000 of its own length and those four
    // embedded ones are 0.108 to 0.234.
    configNames() {
      const found: string[] = [];
      for (const name of Object.keys(IMAGES)) {
        const path = imagePath(name);
        if (path === undefined || !existsSync(path)) continue;
        const blob = load(name);
        if (blob === undefined || blob.length === 0) continue;
        try {
          const c = parse(blob);
          if (c.architecture === undefined) continue;
          const declared = Number((summary(c) as Record<string, unknown>)['length'] ?? 0);
          if (declared / blob.length >= CONFIG_FILE_SHARE) found.push(name);
        } catch {
          // Not a container at all. Most of the lab is firmware.
        }
      }
      return found.sort();
    },
    loadConfig: (name: string) => load(name),
  };
}
