/**
 * The infrared monitor: what a remote actually sends, heard through a USB receiver, and named.
 *
 * **Why it exists.** Testing a written configuration meant pointing the remote at the real equipment
 * and watching whether it reacted, which says yes or no and nothing else, and is impossible while a
 * device is away for repair. A receiver on the desk says which command arrived, when, how often it
 * repeated and how long the pause before it was, which is what an activity's order and its power on
 * delays need.
 *
 * **The receiver is a Flirc** and its own command line tool does the listening:
 * `irtools listen --raw --elapsed` prints one line per frame of alternating mark and space durations in
 * microseconds, and a line holding a single `+N` between frames, the silence since the last one,
 * rounded to whole milliseconds. Run as a program, the same way concordance is, so none of its code
 * enters this repository. It is a demodulating receiver, so it reports the envelope and never the
 * carrier, and measured against a stored record it lengthens marks by about 50 microseconds and
 * shortens spaces by about 80. The tolerance below is set well outside that.
 *
 * **Only `listen` is ever run.** The same tool has `sendir`, which transmits, and nothing here can
 * reach it: the argument list is a constant and no route takes arguments for it.
 *
 * **Naming a capture is two routes, in order of how much they can be trusted.**
 * 1. The configurations of the remotes on the bench. A capture whose frame matches a record's frame,
 *    duration for duration within the tolerance, is that device's code, exactly: the configuration
 *    knows which device sends it. This needs no decoding, so it works for every protocol family.
 * 2. Logitech's device catalogue, through the archive checkout, for the command's name: within the
 *    device a configuration matched, out of that device's own identified codeset; and for a code no
 *    configuration holds, as the names the catalogue gives that number anywhere, which is a list of
 *    candidates and is shown as one, since a number alone is held by several manufacturers.
 * A capture neither route names is still reported, as unknown, with its raw durations.
 *
 * **A Harmony Touch is named by its own documents**, since `todo-touch.md` 7.1: it holds no configuration file,
 * so the first route had nothing to match its codes against, and a code of a device no other bench remote holds,
 * the Sony Blu-ray of 6.9, came unnamed. `BENCH_TOUCH_SETS` lists the set the bench Touch holds; every command of
 * it is rendered by the codec's renderer of a catalogue definition, `waveformOfArchiveCommand`, at the device's own
 * definition, with its toggle bit both ways, and a capture matching one is that device's command by the documents'
 * own names, which the catalogue route then leaves alone. Held against every press of the Touch's earlier bench
 * runs, `test/touch-full-bench-predicted.test.ts`.
 *
 * **Captured data stays in the lab.** Each frame is appended to a JSON lines file there as it arrives,
 * so a session can be read back while it runs. Codes compiled out of Logitech's database are the same
 * class of data as a configuration, which is why the file is not here.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  catalogueCommands,
  codeIndex,
  codeKey,
  devices,
  framesOfPulses,
  fromFirstMark,
  harmonyTouch,
  identifyCodeset,
  irGroups,
  parse,
  waveformOfArchiveCommand,
  type Container,
  type Pulse,
} from '@harmony/codec/node';
import { irBlockWords, irHeaderPointers, mergedIntervals, pulsesOfWords } from '@harmony/codec/internal';

/** Where the Flirc application keeps its tools on a Mac. `HARMONY_IRTOOLS` overrides it. */
export const DEFAULT_IRTOOLS = '/Applications/Flirc.app/Contents/Resources/irtools';

/**
 * The configurations whose devices a capture is named against: the latest read of every remote on the
 * bench, which is what "the devices in our remotes" means. A hand list, because which read is the
 * current one per unit is a fact about the bench and not something the lab states; a name missing from
 * the lab is skipped rather than refused.
 */
export const BENCH_CONFIGS: readonly string[] = [
  // The Harmony 600's since it holds the six device file, `todo-compile-600.md` 2.2.2, which is the five
  // device test setup plus the Switch; Logitech's own compile it held before named none of those devices.
  'one_config', 'one_spare_page4_base', 'h600_setup6_on', 'h650_devicelist_region',
  'h700_28_config_region', 'h525_config_2',
  // The bench Harmony 350's, by its path in the lab rather than a lab name, since it is a working copy
  // and no lab table names it; todo-compile-350 1.8's bench test. `bin/bench.ts` loads a path.
  'work/350-delay/before.bin',
  // What it holds since todo-compile-350 3.2, Logitech's compile of the test setup, by path for the same
  // reason and because every compile in `work/setups/` carries this file name; 3.3's bench test.
  'work/setups/h350-test/compile-Result.EzHex',
  // The test setup built from nothing, todo-compile-350 5.1.6, which the bench Harmony 350 holds for that item's bench
  // test: the compile names every code it shares with it, and this the KPN's codes the compile does not store.
  'work/setups/h350-test/from-nothing-5.1.6.bin',
  // The same setup with firmware event 0xFF bound, todo-compile-350 5.4, which both the bench Harmony 350 and the bench
  // Harmony 300 are given for 5.3's bench tests: every code the tests expect is named from this file.
  'work/setups/h350-test/from-nothing-5.4.bin',
  // The bench Harmony 300's own configuration, the four devices Logitech's service put on it, written back
  // unchanged by todo-compile-300 1.4; that item's bench test.
  'h300_programmed_config',
];

/**
 * The Harmony Touch sets whose own documents name a capture, by their path in the lab: the set the bench Touch
 * holds, `todo-touch.md` 6.9 and 7.1, the same set with the device of ours that 8.1 adds, whose codes no other
 * set or configuration holds, and the set with the activity of ours that 8.2 adds, which sends only the bench
 * devices' codes and is listed so the monitor names from the set the remote holds during that test. A set is the
 * answerer's file, `packages/corpus/bin/touch-sync.ts --set`, and a Touch keeps no configuration a host can read, so
 * this is what the remote holds as far as anything here knows. A code several sets hold matches once per set, under
 * the same device and command names, which is how the judge reads it.
 */
export const BENCH_TOUCH_SETS: readonly string[] = [
  'work/touch-firmware/sets/6.9-label-back/set.json',
  'work/touch-firmware/sets/8.1-device/set.json',
  'work/touch-firmware/sets/8.2-activity/set.json',
];

/** A space at least this long ends a frame: the Flirc splits there too, and NEC's longest inner space is 4.5 ms. */
const FRAME_GAP_US = 10000;

/**
 * How far a captured duration may sit from the stored one and still match: the larger of 250
 * microseconds and a quarter of the stored value. The receiver's own bias is about 80, so this is
 * three times that, and a quarter keeps long headers from being held to an absolute figure.
 */
export function withinTolerance(stored: number, heard: number): boolean {
  return Math.abs(stored - heard) <= Math.max(250, stored / 4);
}

/** One line of `irtools listen --raw`, read. */
export type ListenLine =
  | { readonly kind: 'gap'; readonly us: number }
  | { readonly kind: 'frame'; readonly pulses: Pulse[] }
  | { readonly kind: 'other'; readonly text: string };

/**
 * Read one line of the listener's output.
 *
 * A lone `+N` is the silence before the next frame; two or more signed numbers are a frame, starting
 * with a mark. Anything else, the version banner and the `Cleaning up` on exit, is passed through.
 */
export function parseListenLine(line: string): ListenLine {
  const values = [...line.matchAll(/[+-]\d+/g)].map((m) => Number(m[0]));
  if (values.length === 1 && /^\s*\+\d+\s*$/.test(line)) return { kind: 'gap', us: values[0]! };
  if (values.length >= 2 && /^\s*[+-]\d+(\s+[+-]\d+)*\s*$/.test(line)) {
    return { kind: 'frame', pulses: values.map((n) => ({ mark: n > 0, us: Math.abs(n) })) };
  }
  return { kind: 'other', text: line.trim() };
}

/** A stored record's frames: its first block cut at every silence that ends one, marks first. */
export function framesOfTrain(train: readonly Pulse[]): Pulse[][] {
  const out: Pulse[][] = [];
  let current: Pulse[] = [];
  for (const one of fromFirstMark(mergedIntervals(train))) {
    if (!one.mark && one.us >= FRAME_GAP_US) {
      if (current.length > 0) out.push(current);
      current = [];
      continue;
    }
    if (current.length === 0 && !one.mark) continue;
    current.push(one);
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** Whether a heard frame is a stored one: same number of durations, each within the tolerance. */
export function sameFrame(stored: readonly Pulse[], heard: readonly Pulse[]): boolean {
  // A trailing space is not part of what the receiver reports, so a stored frame ending in one is
  // compared without it.
  const s = stored[stored.length - 1]?.mark === false ? stored.slice(0, -1) : stored;
  const h = heard[heard.length - 1]?.mark === false ? heard.slice(0, -1) : heard;
  if (s.length !== h.length) return false;
  return s.every((one, i) => one.mark === h[i]!.mark && withinTolerance(one.us, h[i]!.us));
}

/** Each heard duration against the stored one at the same position, for the comparison panel. */
function compareWith(
  stored: readonly Pulse[] | undefined, heard: readonly Pulse[],
): { stored: Pulse[]; within: boolean[] } | undefined {
  if (stored === undefined) return undefined;
  return {
    stored: [...stored],
    within: heard.map((one, i) => {
      const s = stored[i];
      return s !== undefined && s.mark === one.mark && withinTolerance(s.us, one.us);
    }),
  };
}

/** Where a stored frame came from: which bench remote, which device, which of its codes. */
export interface KnownCode {
  readonly config: string;
  readonly device: string;
  readonly group: number;
  readonly code: number;
  /** Logitech's command name, out of the device's own identified codeset, where the archive is present. */
  readonly command: string | undefined;
  /** Whether the matching frame is the record's repeat block, so a held key, rather than its first press. */
  readonly repeat: boolean;
  /** Whether it is the record's opening frame, the command itself, rather than anything sent after it. */
  readonly opening: boolean;
  /** The stored durations, for the comparison panel. */
  readonly stored: Pulse[];
}

/** A stored frame, whose command name is filled in once the catalogue has been read. */
type StoredFrame = { -readonly [K in keyof KnownCode]: KnownCode[K] };

/** The number a frame decodes to as a pulse distance code, keyed the way the catalogue keys it. */
export function frameNumber(frame: readonly Pulse[]): { key: string; bits: number } | undefined {
  const train = [...frame, { mark: false, us: 40000 }];
  const read = framesOfPulses(train);
  const one = read.length === 1 ? read[0] : undefined;
  return one === undefined || one.bits === 0 ? undefined : { key: codeKey(one.value.toString(16)), bits: one.bits };
}

/**
 * The codeset of the infrared archive each bench device's codes came from, by the device's name as its
 * configuration states it, for `CodeBook.nameFromCatalogue`: the Harmony 300 and 350 test setup's devices,
 * and those of the Harmony 300 and 350 configurations `keys350.test.ts` reads. Found once by the whole
 * archive pass and written down, since a device's codes do not change; `null` for a device the archive
 * states none of the numbers of. Held against that pass by a slow test, so it cannot drift unseen.
 *
 * **One entry is per configuration.** Logitech's compile of the test setup holds 15 of the KPN's codes and
 * two codesets state all 15, so the pass takes the first by name, a tie broken alphabetically; our own
 * builds of the setup hold 45 and settle it on the other. The compile's entry keeps its name, so a code is
 * named as the pass named it when the bench test's expectations were written (`KPN List`, not `Select`).
 */
export const BENCH_CODESETS: ReadonlyMap<string, string | null> = new Map([
  ['Denon', 'codesets/d5/d5ef7355a399626d.json'],
  ['KPN', 'codesets/16/16195a125730fb59.json'],
  ['work/setups/h350-test/compile-Result.EzHex KPN', 'codesets/01/01d77ca78a30aff7.json'],
  ['Knoll', 'codesets/01/0179ceb621d5e7ff.json'],
  ['Kodi', 'codesets/cd/cdab49cb0013d6d3.json'],
  ['LG_TV', 'codesets/00/0021f2f8d0237725.json'],
  ['Panasonic_DVD', 'codesets/01/01e3c33b6f57b3c3.json'],
  ['Panasonic_TV', 'codesets/05/0550e75a7943cd2f.json'],
  ['Panasonic_TX-29PS11P', 'codesets/19/1955ed219a38fb93.json'],
  ['Plasma', 'codesets/05/0550e75a7943cd2f.json'],
  ['PS', null],
  ['Sagem_ITAD-83_SD', 'codesets/0a/0a8924875b3d98ac.json'],
  ['Sony_HT', 'codesets/22/22296a7606010372.json'],
  ['Sony_VCR', 'codesets/03/036c74a3cb5fe10c.json'],
  ['Switch', 'codesets/01/01b772891663865a.json'],
  ['TV', 'codesets/05/0550e75a7943cd2f.json'],
]);

/** The codeset `known` states for one device of one configuration: `config device` first, then `device`. */
export function knownCodeset(
  known: ReadonlyMap<string, string | null>, config: string, device: string,
): string | null | undefined {
  const qualified = `${config} ${device}`;
  return known.has(qualified) ? known.get(qualified) : known.get(device);
}

/** What the catalogue gives a number: per command name, how many codesets use it under that name. */
export interface CatalogueGuess {
  readonly name: string;
  readonly codesets: number;
}

/**
 * The stored frames of every bench remote, with names.
 *
 * Built once, and the catalogue half is built in the background because its index is a full pass over
 * the archive and about eight seconds: until it is ready, captures are named by device and code number.
 */
export class CodeBook implements FrameBook {
  private readonly frames: StoredFrame[] = [];
  private index: Map<string, string[]> | undefined;
  private catalogueRead = false;
  /**
   * The codeset each device was named from after `nameFromCatalogue`, by its configuration's name and the
   * device's name as the configuration states it, `config device`; what `BENCH_CODESETS` is held against.
   */
  readonly identified = new Map<string, string>();
  private readonly archive: string | undefined;
  /** The Touch sets among `configs`, whose names come from their documents and never from the catalogue. */
  private readonly touchSets = new Set<string>();
  readonly configs: string[] = [];

  /**
   * `touchSets` is empty unless asked for, `BENCH_TOUCH_SETS` being what the bench passes, so a test that builds a
   * book of one configuration gets that configuration's names and nothing else.
   */
  constructor(
    load: (name: string) => Uint8Array | undefined,
    names: readonly string[] = BENCH_CONFIGS,
    archive: string | undefined = undefined,
    touchSets: readonly string[] = [],
  ) {
    this.archive = archive;
    for (const name of names) {
      const blob = load(name);
      if (blob === undefined) continue;
      let c: Container;
      try { c = parse(blob); } catch { continue; }
      this.configs.push(name);
      this.add(name, c);
    }
    for (const name of touchSets) {
      const blob = load(name);
      if (blob === undefined) continue;
      let answers: unknown;
      try { answers = (JSON.parse(new TextDecoder().decode(blob)) as { answers?: unknown }).answers; } catch { continue; }
      if (!Array.isArray(answers)) continue;
      this.configs.push(name);
      this.touchSets.add(name);
      this.addTouch(name, harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(answers as harmonyTouch.SyncAnswer[])));
    }
  }

  /**
   * A Touch's codes: each command of each device rendered from its definition, the first transmission and one
   * repetition, the toggle bit as stated and flipped, since the remote flips it from press to press. The group is
   * the device's place in the device list and the code the command's place in the device, which is what a
   * `KnownCode` from a set means by them. A command the renderer declines is left out, and so unnamed.
   */
  private addTouch(config: string, c: harmonyTouch.Configuration): void {
    for (const [group, d] of c.devices.entries()) {
      for (const [code, command] of d.commands.entries()) {
        if (command.protocol === undefined || typeof command.keyCode !== 'string') continue;
        for (const toggleFlipped of [false, true]) {
          const sent = waveformOfArchiveCommand(command.protocol.archive, command.keyCode, { asStored: true, toggleFlipped });
          if ('refusal' in sent) continue;
          for (const [slot, train] of [sent.once, sent.held].entries()) {
            for (const [at, stored] of framesOfTrain(train).entries()) {
              this.frames.push({
                config, device: d.name ?? `group ${group}`, group, code, command: command.name, repeat: slot === 1,
                opening: slot === 0 && at === 0, stored,
              });
            }
          }
        }
      }
    }
  }

  private add(config: string, c: Container): void {
    const groups = irGroups(c) ?? [];
    const named = new Map(devices(c).map((one) => [one.group, one.name]));
    for (const [group, entry] of groups.entries()) {
      const device = named.get(group) ?? `group ${group}`;
      for (const [code, address] of entry.addresses.entries()) {
        const blocks = irHeaderPointers(c, address);
        for (const [slot, block] of blocks.slice(0, 2).entries()) {
          if (!block) continue;
          const words = irBlockWords(c, block);
          if (!words) continue;
          for (const [at, stored] of framesOfTrain(pulsesOfWords(words)).entries()) {
            this.frames.push({
              config, device, group, code, command: undefined, repeat: slot === 1, opening: slot === 0 && at === 0, stored,
            });
          }
        }
      }
    }
  }

  /** How many stored frames there are, for the status line. */
  get size(): number { return this.frames.length; }

  /** Whether the catalogue's names are in yet. */
  get named(): boolean { return this.catalogueRead; }

  /**
   * What the monitor will report for one stored code: its device and its command name, taken from the
   * code's opening frame, or undefined when the book holds no such code.
   *
   * For a prediction written before a press, which has to name a command the way a capture of it will be
   * named: the Harmony 350's key test, `packages/bench/test/keys350.test.ts`, asks this of every code a
   * key map sends. The command is undefined when the catalogue could not name the device's codeset.
   */
  storedName(config: string, group: number, code: number): { device: string; command: string | undefined } | undefined {
    const one = this.frames.find((f) => f.opening && f.config === config && f.group === group && f.code === code);
    return one === undefined ? undefined : { device: one.device, command: one.command };
  }

  /**
   * Read the catalogue and name every stored frame's command out of its own device's codeset.
   *
   * Per device rather than per number, the rule `make catalogue` follows: identify the device's codeset
   * from all the numbers it sends, then take the name from that codeset only.
   *
   * **A device whose codeset is already known is read from that one file.** A configuration states the
   * numbers a device sends and not which codeset they came from, so finding out means `codeIndex`, a pass
   * over every codeset of the archive, about fourteen seconds. The bench's devices never change, so
   * `known` names each one's codeset by the device name its configuration states, `BENCH_CODESETS`, and
   * the pass runs only for a device it does not name; `null` is a device the archive states none of the
   * numbers of, which the pass would only confirm. An entry `config device` wins over `device` where one
   * configuration's codes do not settle the codeset, see `BENCH_CODESETS`. A known codeset is used when it
   * states more than half
   * the numbers the device sends, since the best codeset need not state all of them (the bench Denon's
   * states 132 of its 150) and a codeset of another device states next to none; otherwise the device is
   * identified from the index as before, so a stale entry costs time and not a wrong name.
   * `BENCH_CODESETS` is held against the index by a slow test in `irmonitor.test.ts`.
   */
  nameFromCatalogue(known: ReadonlyMap<string, string | null> = new Map()): void {
    const archive = this.archive;
    if (archive === undefined || !existsSync(archive)) return;
    const index = (): Map<string, string[]> => (this.index ??= codeIndex(archive));
    const byDevice = new Map<string, StoredFrame[]>();
    for (const one of this.frames) {
      if (this.touchSets.has(one.config)) continue;
      const key = `${one.config}\u0000${one.group}`;
      const list = byDevice.get(key) ?? [];
      list.push(one);
      byDevice.set(key, list);
    }
    for (const list of byDevice.values()) {
      const numbers: string[] = [];
      for (const one of list) {
        const key = one.repeat ? undefined : frameNumber(one.stored)?.key;
        if (key !== undefined) numbers.push(key);
      }
      const device = list[0]!.device;
      const config = list[0]!.config;
      const namesIn = (codeset: string): Map<string, string> => {
        const names = new Map<string, string>();
        for (const command of catalogueCommands(archive, codeset)) {
          for (const value of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
            const key = codeKey(value[1]!);
            if (!names.has(key)) names.set(key, command.name);
          }
        }
        return names;
      };
      const stated = knownCodeset(known, config, device);
      if (stated === null) continue;
      let codeset = stated;
      let names = codeset === undefined ? undefined : namesIn(codeset);
      if (names === undefined || 2 * numbers.filter((number) => names!.has(number)).length <= numbers.length) {
        codeset = identifyCodeset(index(), numbers)?.codeset;
        names = codeset === undefined ? undefined : namesIn(codeset);
      }
      if (codeset === undefined || names === undefined) continue;
      this.identified.set(`${config} ${device}`, codeset);
      for (const one of list) {
        const key = frameNumber(one.stored)?.key;
        const command = key === undefined ? undefined : names.get(key);
        if (command !== undefined) one.command = command;
      }
    }
    this.catalogueRead = true;
  }

  /** Every bench device a heard frame matches, one entry per device and code. */
  match(heard: readonly Pulse[]): KnownCode[] {
    const out: KnownCode[] = [];
    const seen = new Set<string>();
    for (const one of this.frames) {
      if (!sameFrame(one.stored, heard)) continue;
      const key = `${one.config}/${one.group}/${one.code}/${one.repeat}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(one);
    }
    return out;
  }

  /** What the catalogue calls a number anywhere, for a frame no bench remote holds. */
  guess(key: string): CatalogueGuess[] {
    if (this.index === undefined || this.archive === undefined) return [];
    const codesets = this.index.get(key) ?? [];
    const counts = new Map<string, number>();
    // Capped, since one number can sit in thousands of codesets and the names repeat.
    for (const codeset of codesets.slice(0, 200)) {
      for (const command of catalogueCommands(this.archive, codeset)) {
        if ([...command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)].some((v) => codeKey(v[1]!) === key)) {
          counts.set(command.name, (counts.get(command.name) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()].map(([name, n]) => ({ name, codesets: n }))
      .sort((a, b) => b.codesets - a.codesets).slice(0, 5);
  }
}

/** One frame as heard, with what it was matched to. */
export interface HeardFrame {
  readonly seq: number;
  /** The host's clock when the line arrived, ISO. */
  readonly at: string;
  /** The silence before it, as the receiver reported it, in microseconds; undefined for the first. */
  readonly gapUs: number | undefined;
  readonly pulses: Pulse[];
  /** The number it decodes to as a pulse distance code, where it does. */
  readonly number: string | undefined;
  readonly bits: number | undefined;
  readonly matches: KnownCode[];
  readonly guesses: CatalogueGuess[];
  /**
   * The press this frame repeats, by its `seq`, when it is a held key's or a short press's trailing
   * frame rather than a command of its own. Set when it follows that press within `REPEAT_WINDOW_US`
   * and matches a frame of one of the same codes; `matches` is then narrowed to those codes.
   *
   * Needed because a repeat frame often says nothing by itself: NEC's is a header and one mark, the
   * same for every NEC code there is, so on its own it matches every one of them.
   */
  readonly repeatOf: number | undefined;
  /**
   * True for a frame that is only ever sent after a command, a repeat or trailing frame, heard with no
   * command before it: the press began before listening did, or its first frame was missed. Such a
   * frame often fits hundreds of codes, NEC's repeat being one header and one flash for all of them,
   * so `matches` is then a list of what it could follow rather than a name.
   */
  readonly bare: boolean;
  /**
   * True for a frame nothing reads at all: no bench remote's code fits it, it decodes to no number and
   * it is no repeat. A camera's infrared light does this: taking photographs of the remote at the bench
   * put 21 such frames in one test run, 5 to 23 durations each. Their shape does not tell them from a
   * code, since a burst can be as regular as a real one, so this is a statement about the reading and
   * not a verdict that the frame is noise: the page hides them by default, behind a switch, and counts what it hid, and
   * the lab's log keeps every one. A code of ours sent wrongly would land here too, which is why it is
   * counted rather than dropped.
   */
  readonly unreadable: boolean;
  /**
   * The heard durations against the first match's stored ones, each with whether it is within the
   * tolerance, so the page highlights what this module decided rather than deciding again.
   */
  readonly compare: { stored: Pulse[]; within: boolean[] } | undefined;
}

/** A frame this soon after the previous one may be its repeat. NEC repeats every 108 ms. */
export const REPEAT_WINDOW_US = 200000;

/** What the page is told: a frame, or a change in whether the receiver is listening. */
export type MonitorEvent =
  | { readonly type: 'frame'; readonly frame: HeardFrame }
  | { readonly type: 'status'; readonly listening: boolean; readonly detail: string }
  /** A recording or test changed, `irsession.ts`; carried on the same stream so the page needs one. */
  | { readonly type: 'run'; readonly run: unknown };

/** The listener as a dependency, so a test can feed it lines. */
/**
 * What the monitor asks of a code book: which stored frames a heard one is, and what the catalogue calls
 * a number nobody here holds. `CodeBook` is the real one; a test hands in a few frames of its own.
 */
export interface FrameBook {
  match(heard: readonly Pulse[]): KnownCode[];
  guess(key: string): CatalogueGuess[];
}

export interface LineSource {
  start(onLine: (line: string) => void, onExit: (detail: string) => void): void;
  stop(): void;
}

/**
 * The real listener: `irtools listen --raw` under `script`, so that it sees a terminal.
 *
 * **The terminal is the point.** Redirected into a pipe, the tool buffers its output and the frames
 * arrived only when it exited, which was the first thing found on the bench: a two minute capture
 * that showed nothing until it was stopped. A pseudo terminal makes it flush every line.
 */
export function irtoolsSource(path = process.env['HARMONY_IRTOOLS'] ?? DEFAULT_IRTOOLS): LineSource {
  let child: ChildProcess | undefined;
  return {
    start(onLine, onExit) {
      if (!existsSync(path)) {
        onExit(`no irtools at ${path}; install the Flirc application or set HARMONY_IRTOOLS`);
        return;
      }
      // `--elapsed` is what prints the silence between frames; without it every gap is missing and a
      // held key's repeats cannot be told from separate presses, which the first version found out.
      child = spawn('/usr/bin/script', ['-q', '/dev/null', path, 'listen', '--raw', '--elapsed'],
        { stdio: ['ignore', 'pipe', 'pipe'] });
      let buffer = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) onLine(line);
      });
      child.on('exit', (code) => onExit(`irtools stopped, exit ${code ?? 'signal'}`));
    },
    stop() { child?.kill('SIGINT'); child = undefined; },
  };
}

/**
 * The monitor: lines in, named frames out, to whoever is subscribed and to the lab's log.
 */
export class IrMonitor {
  private readonly subscribers = new Set<(event: MonitorEvent) => void>();
  private readonly recentFrames: HeardFrame[] = [];
  private listening = false;
  private detail = 'not started';
  private pendingGap: number | undefined;
  private seq = 0;
  /** The last frame that was a command of its own, which a following repeat attaches to. */
  private press: HeardFrame | undefined;

  private readonly source: LineSource;
  private readonly book: () => FrameBook;
  private readonly now: () => Date;
  private readonly logPath: string | undefined;

  constructor(source: LineSource, book: () => FrameBook, now: () => Date, logPath: string | undefined) {
    this.source = source;
    this.book = book;
    this.now = now;
    this.logPath = logPath;
  }

  get status(): { listening: boolean; detail: string } {
    return { listening: this.listening, detail: this.detail };
  }

  /** The last frames heard, newest last, for a page that opens after they arrived. */
  recent(limit = 200): HeardFrame[] {
    return this.recentFrames.slice(-limit);
  }

  /** Start listening if nobody has yet. Idempotent, so every page that opens may ask. */
  start(): void {
    if (this.listening) return;
    this.listening = true;
    this.detail = 'listening';
    this.emit({ type: 'status', listening: true, detail: this.detail });
    this.source.start((line) => this.line(line), (detail) => {
      this.listening = false;
      this.detail = detail;
      this.emit({ type: 'status', listening: false, detail });
    });
  }

  stop(): void {
    this.source.stop();
  }

  subscribe(fn: (event: MonitorEvent) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /** One line of the listener's output. Public so a test can drive it without a process. */
  line(text: string): void {
    const read = parseListenLine(text);
    if (read.kind === 'gap') { this.pendingGap = read.us; return; }
    if (read.kind !== 'frame') {
      // A line that is neither a frame nor a gap goes into the log as it came, because a code the
      // receiver reports in some other shape would otherwise vanish without trace: nothing heard and
      // something heard that this reader could not read look identical on the page.
      if (read.kind === 'other' && read.text !== '' && this.logPath !== undefined) {
        try {
          appendFileSync(this.logPath, `${JSON.stringify({ type: 'other', at: this.now().toISOString(), text: read.text })}\n`);
        } catch { /* the log is a convenience */ }
      }
      return;
    }
    const book = this.book();
    const decoded = frameNumber(read.pulses);
    let matches = book.match(read.pulses);
    const seq = (this.seq += 1);
    // The first gap the tool prints is the time since it started, not a silence between frames.
    const gapUs = seq === 1 ? undefined : this.pendingGap;
    const codeOf = (one: KnownCode) => `${one.config}/${one.group}/${one.code}`;
    let repeatOf: number | undefined;
    const press = this.press;
    if (press !== undefined && gapUs !== undefined && gapUs <= REPEAT_WINDOW_US) {
      const pressed = new Set(press.matches.map(codeOf));
      const same = matches.filter((one) => pressed.has(codeOf(one)));
      // A repeat either matches a frame of the pressed code, or is the pressed frame again, which is
      // how a family without a separate repeat frame holds a key.
      if (same.length > 0 || (decoded !== undefined && decoded.key === press.number)) {
        repeatOf = press.seq;
        matches = same.length > 0 ? same : press.matches;
      }
    }
    const frame: HeardFrame = {
      seq,
      at: this.now().toISOString(),
      gapUs,
      pulses: read.pulses,
      number: decoded?.key,
      bits: decoded?.bits,
      matches,
      guesses: repeatOf === undefined && matches.length === 0 && decoded !== undefined ? book.guess(decoded.key) : [],
      repeatOf,
      bare: repeatOf === undefined && matches.length > 0 && !matches.some((one) => one.opening),
      unreadable: repeatOf === undefined && matches.length === 0 && decoded === undefined,
      compare: compareWith(matches[0]?.stored, read.pulses),
    };
    if (repeatOf === undefined) this.press = frame;
    this.pendingGap = undefined;
    this.recentFrames.push(frame);
    if (this.recentFrames.length > 1000) this.recentFrames.shift();
    if (this.logPath !== undefined) {
      try { appendFileSync(this.logPath, `${JSON.stringify(frame)}\n`); } catch { /* the log is a convenience */ }
    }
    this.emit({ type: 'frame', frame });
  }

  /** Put an event on the stream that did not come from the receiver, a run changing. */
  publish(event: MonitorEvent): void {
    this.emit(event);
  }

  private emit(event: MonitorEvent): void {
    for (const fn of this.subscribers) fn(event);
  }
}

/** The lab file a session's frames go to, one per start of the bench: `reads/<stamp>-ir-monitor.jsonl`. */
export function monitorLogPath(labRoot: string | undefined, now: Date): string | undefined {
  if (labRoot === undefined) return undefined;
  const directory = join(labRoot, 'reads');
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 13) + 'Z';
  return join(directory, `${stamp}-ir-monitor.jsonl`);
}
