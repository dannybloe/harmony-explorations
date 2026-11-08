/**
 * A catalogue command's code as the blocks a press sends: the archive's definition of the code's family, how many
 * times a press repeats the code where the family does not say and the device does, section 348, and the blocks
 * and the toggled code that follow. Part of composing catalogue devices, `composecatalogue.ts`, which re-exports it
 * whole.
 */
import {
  type ArchiveProtocol, statedCodeOfDefinition, waveformOfArchiveCommand, withToggleFlipped,
} from '../catalogue/archive.ts';
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import type { DeviceDriving } from '../catalogue/driving.ts';
import { mergedIntervals, type Pulse } from '../infrared/irframe.ts';
import { blockOfStatedCode, statedCode, type StatedCode, statedProtocol } from '../infrared/stated.ts';
import type { StatedBlocks, ToggledCode } from './compose.ts';
import { composableKeycode } from './devicemode.ts';

/**
 * Every protocol definition of an archive by family name, read once per source. `archiveAt` gives one source per
 * checkout, so this is read once per checkout, as it was when it was keyed on the checkout's path.
 */
const PROTOCOLS_OF = new WeakMap<CatalogueSource, ReadonlyMap<string, ArchiveProtocol>>();

/** The archive's protocol definitions by family name, cached per source since a device composes many. */
export function archiveProtocolsByName(archive: CatalogueSource): ReadonlyMap<string, ArchiveProtocol> {
  let found = PROTOCOLS_OF.get(archive);
  if (found === undefined) {
    found = new Map(archive.protocols().map((one) => [one.name, one]));
    PROTOCOLS_OF.set(archive, found);
  }
  return found;
}

/** A family spelling with its letter case and its spacing set aside: trimmed, runs of white space as one. */
function foldedFamily(spelling: string): string {
  return spelling.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Per definition map, its names by folded spelling, `null` where two definitions fold alike. */
const FOLDED_OF = new WeakMap<ReadonlyMap<string, ArchiveProtocol>, Map<string, string | null>>();

/**
 * The archive's definition of a catalogue code's family: by the code's own spelling of the family, and
 * where no definition is spelt that way, by the one spelt the same but for letter case and spacing.
 * `undefined` where neither finds one, or where the folded spelling would fit two definitions.
 *
 * **Why the code's spelling is not always a definition's name.** Five spellings in the catalogue's codes
 * name no definition, 222 commands: `Ada 40 Bit` (82), `AudioAnalogue 14 bit` (108), `DAM 12 Bit` (29),
 * `toshiba 32 Bit` (2) and `Intellibus 17 Bit ` with a trailing space (1). Until todo-process-logitech 2.3
 * they found no definition, the first four no rhythm row either, and those four were refused as having no
 * rhythm, section 361.
 *
 * **Why folding is Logitech's answer and not a guess.** Every command of Logitech's service carries a
 * `ProtocolId` beside its keycode, the field MyHarmony's client knows as `Command.ProtocolId`, and the
 * definitions carry the same id. Over the 13293293 commands of the raw capture behind the archive that carry a
 * keycode, the id names the keycode's own spelling on 13292991 and on the other 302, every command of the five spellings,
 * it names the definition spelt the same but for case and spacing, and on none does it name another
 * family. The archive's `protocol` field is that id's name. **And folding merges nothing**: the 684
 * definitions fold to 684 different spellings, and a pair that folded alike would be refused here rather
 * than one of them picked.
 */
export function catalogueProtocol(
  keycode: string, protocols: ReadonlyMap<string, ArchiveProtocol>,
): ArchiveProtocol | undefined {
  const family = /^G:([^:]+):/.exec(keycode)?.[1];
  if (family === undefined) return undefined;
  const exact = protocols.get(family);
  if (exact !== undefined) return exact;
  let folded = FOLDED_OF.get(protocols);
  if (folded === undefined) {
    folded = new Map();
    for (const name of protocols.keys()) {
      const key = foldedFamily(name);
      folded.set(key, folded.has(key) ? null : name);
    }
    FOLDED_OF.set(protocols, folded);
  }
  const name = folded.get(foldedFamily(family));
  return name === undefined || name === null ? undefined : protocols.get(name);
}

/** A device's press count for the families that state none, or why it is not known. */
export type PressRepeats = { readonly repeats: number } | { readonly refusal: string };

/**
 * How many times one press of this device sends the repeating part of a code whose family's definition
 * states no count: the device's own `timing.pressMinRepeats`, or a refusal where the compiles do not say.
 *
 * **What the count is.** A press is the start group once, the repeat group this many times, and the
 * release group, which is the archive README's reading of the hub's infrared engine and the one
 * `blockOfDefinition` builds. Section 348 scored it against every Logitech compile in the lab whose
 * devices are known: on 45 of the 47 catalogue devices of the compiles our own accounts produced, the
 * records of every family whose definition states no count repeat exactly the device's number, 1 or 3,
 * the `Kreatel IP 22 Bit` set top box at 1 on four compiles; the two others are the second refusal below.
 * Only three of the 45 state 1, so that is what separates it from a default of 3. That is
 * what retired the rule this replaced, that such a family gets no block at all because the count is not
 * the family's: it is not, it is the device's.
 *
 * **Two refusals, each a place the compiles leave open rather than a guess.**
 *
 * * **A count of 0**, 124 devices of the archive, 120 of them with a codeset. The hub plays it as the
 *   start group alone, per the archive README, and no compile here holds a catalogue device stating it,
 *   so what Logitech's compiler for these remotes writes is not seen. (Section 258's games console is
 *   at 0 in its account and was written at 1, but its family states 1, so it says nothing about 0.)
 *
 * **A count of 2 is composed, and that is unconfirmed**: 1518 devices of the archive with a codeset state
 * it, no compile here shows it either, and it is built as the rule says, between the 1 and the 3 that are
 * seen. 0 is refused where 2 is not because at 0 the hub's reading changes kind, a press with no repeat
 * group at all, where 2 only changes how many.
 * * **A device whose codeset holds a family stating a count other than the device's.** Two devices of
 *   the compiles are this case, a Toshiba television and a Yamaha receiver, both stating 3, both mostly
 *   `Toshiba 32 Bit`, which states 1: Logitech wrote 1 for **every** command of both, the `Memorex 32
 *   Bit` and `PanasonicV2 48 Bit` ones included, which state no count. So on such a device the
 *   device's number is not the one used, and which one is cannot be read off two samples, so it is not
 *   composed. A third, a Sony television stating 3 and mostly `Sony 12 Bit`, which states 3 as well,
 *   gives its one `Toshiba 32 Bit` command 3 rather than its family's 1: the family's own statement does
 *   not always win either.
 */
export function cataloguePressRepeats(
  driving: { readonly timing: Pick<DeviceDriving['timing'], 'pressMinRepeats'> }, keycodes: Iterable<string>,
  protocols: ReadonlyMap<string, ArchiveProtocol>,
): PressRepeats {
  const repeats = driving.timing.pressMinRepeats;
  if (repeats === 0) {
    return { refusal: 'the device states a repeat count of 0, which no Logitech compile here shows' };
  }
  for (const keycode of keycodes) {
    const protocol = catalogueProtocol(keycode, protocols);
    const stated = protocol?.pressMinimumRepeats ?? null;
    if (protocol !== undefined && stated !== null && stated !== repeats) {
      return {
        refusal: `the device states a repeat count of ${repeats} and its ${protocol.name} commands' family states `
          + `${stated}, and on such a device Logitech's compiler does not always use the device's number`,
      };
    }
  }
  return { repeats };
}

/**
 * How many times the rhythm table's whole block repeats the code, for each family whose definition states
 * no count and which the table holds a whole block for, section 350.
 *
 * **Why this exists.** Each row was measured off records Logitech compiled, so its block carries the count
 * those records repeat and gives it to every device: `Memorex 32 Bit` was measured on a Toshiba
 * television's records, written at 1, and the Dell 2300MP, which states 3 and was written at 3, got 1 on
 * all 34 of its ordinary records. The count is the device's, section 348, so where the device states
 * another number the command is built from the definition at the device's count instead,
 * `catalogueCommandBlocks`.
 *
 * **How each number was read**: by rebuilding the table's block of every distinct code of the family in
 * the archive from Logitech's definition at 0 to 6 repetitions, the count being the one at which the two
 * agree interval for interval, `sameTrain`. Each number is the count most of the family's codes that
 * rebuild at any count rebuild at. Of the 37520 distinct codes, 33264 rebuild at their family's number,
 * 22 at another one, every one of them a code whose own groups already state a frame more than once, and
 * 4234 at none; on `MemorexO1 32 Bit` and `Samsung 38 Bit` the ones that rebuild are a minority, 22 of
 * 3671 and 53 of 400, so their number rests on those. `make composecensus` prints the tally per family, and
 * a test names one code per family that rebuilds at its number and at no other. A family the generator
 * adds later and this map does not name is refused rather than given a guessed count.
 */
export const TABLE_PRESS_REPEATS: ReadonlyMap<string, number> = new Map([
  ['JVC 16 Bit', 3],
  ['Magnavox 13 Bit', 3],
  ['Memorex 32 Bit', 1],
  ['MemorexO1 32 Bit', 1],
  ['MemorexV2 32 Bit', 3],
  ['MemorexV2 32 Bit Dual', 3],
  ['Microsoft 30 Bit', 3],
  ['PanasonicV2 48 Bit', 3],
  ['Philips Hurd 16 Bit LongToggle', 3],
  ['Philips RC5 13 Bit Toggle', 3],
  ['Philips RECS80 11 Bit', 3],
  ['Pioneer 32 Bit', 3],
  ['Pioneer 32 Bit 2', 3],
  ['Pioneer 32 Bit Dual', 3],
  ['PioneerO1 32 Bit', 3],
  ['PioneerO1 32 Bit Dual', 3],
  ['RCAV1 LF 24 Bit', 3],
  ['Samsung 38 Bit', 1],
  ['Sharp 15 Bit', 3],
  ['Sharp 15 Bit 2', 3],
  ['Sharp 48 Bit 2', 3],
  ['Short 11 Bit 2', 3],
  ['Sony 15 Bit', 3],
  ['Sony 20 Bit', 3],
  ['Thomson 12 Bit Toggle', 3],
  ['Videocrypt 11 Bit Toggle', 3],
]);

/** A block's intervals with adjacent ones of a kind joined and the silence it opens with dropped. */
function trimmedTrain(pulses: readonly Pulse[]): Pulse[] {
  const merged = mergedIntervals(pulses);
  while (merged.length > 0 && !merged[0]!.mark) merged.shift();
  return merged;
}

/**
 * Whether two blocks send the same train: adjacent intervals of a kind joined, the silence a block opens
 * with dropped, and the last interval allowed to differ by the one microsecond a stored block ends in.
 *
 * **Why the microsecond is forgiven, and only there.** Logitech's compiler adds it to every block it
 * stores, section 230, and the definition route adds it too; the table's long toggle shape does not, so
 * `Philips Hurd 16 Bit LongToggle`'s table block is the definition's at 3 short of exactly that microsecond
 * on 1675 of its 1700 codes. Compared exactly it would read at no count. Over all 37520 distinct codes of
 * these families, that family's 1675 are the only ones this forgiveness changes.
 */
export function sameTrain(a: readonly Pulse[], b: readonly Pulse[]): boolean {
  const [x, y] = [trimmedTrain(a), trimmedTrain(b)];
  return x.length === y.length && x.every((one, at) => one.mark === y[at]!.mark
    && (one.us === y[at]!.us || (at === x.length - 1 && Math.abs(one.us - y[at]!.us) === 1)));
}

/**
 * Where the rhythm table composes a code whose family states no count, the blocks at the device's count:
 * `undefined` where the table's own block is at it, the definition's blocks at the device's count where
 * it is not, and a refusal where the two disagree about how many frames a press sends. Section 350.
 *
 * * **A family stating a count** is the table's: its row carries that count, sections 228 and 348.
 * * **A device whose count is not known**, `cataloguePressRepeats`'s two refusals, keeps the table's
 *   block, which is what it was composed with before this: what the compiler writes on such a device is
 *   `todo-process-logitech.md` 2.2.2 and 2.2.4, and refusing here would take away records the compiles
 *   show right, the Sony KE-50MR1E's 35 `Sony 15 Bit` ones at 3 among them.
 * * **Both blocks come from the definition**, the held one too, so a record is one source's and not two.
 *   On the Dell 2300MP both are Logitech's own, all 35 records whole, held power step included.
 * * **A code whose table block sends a different number of intervals from the definition's at the table's
 *   count is refused** at any other count. That is a disagreement about how many frames a press sends,
 *   which is the very thing in question: a `Magnavox 13 Bit` code with a start group only, three copies in
 *   the table and one from the definition, or a four frame `Microsoft 30 Bit` code. 252 of the 37520
 *   distinct codes are of this kind, the 22 that rebuild at another count among them, and no compile shows
 *   which a press sends at another count.
 * * **3989 of the other codes the definition does not rebuild differ only in a duration**, and those are
 *   built from the definition; 15 more it cannot build at all and they are refused. 3634 are
 *   `MemorexO1 32 Bit`'s, where the definition pads every copy to a
 *   constant 107600 microseconds and the row states a literal gap measured on three records that all carry
 *   twenty set bits, which only 22 of the family's codes in the archive do, section 228 corrected; that the
 *   definition's gap is what Logitech's compiler writes for the others is a reading of their definition
 *   and no compile here shows it. 347 are `Samsung 38 Bit`'s, a closing silence and on 133 a space
 *   between its two sections, not settled either way, and 8 `MemorexV2 32 Bit Dual`'s, a gap after a frame.
 */
function tableBlocksAtDeviceCount(
  keycode: string, read: StatedCode, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
  toggleFlipped: boolean,
): StatedBlocks | { readonly refusal: string } | undefined {
  const family = read.family;
  const protocol = protocols.get(family);
  if (protocol === undefined || protocol.pressMinimumRepeats !== null) return undefined;
  if ('refusal' in press) return undefined;
  const tabled = TABLE_PRESS_REPEATS.get(family);
  if (tabled === undefined) {
    return { refusal: `the rhythm table's count for ${family} has not been read, so its block's count is not known` };
  }
  if (tabled === press.repeats) return undefined;
  const table = blockOfStatedCode(read, undefined, 'once');
  const atTable = waveformOfArchiveCommand(protocol, keycode, { repeats: tabled, asStored: true });
  if (table !== undefined && !('refusal' in atTable)
    && trimmedTrain(table).length !== trimmedTrain(atTable.once).length) {
    return {
      refusal: `the rhythm table's block for this code and the definition at the table's ${tabled} send `
        + 'different numbers of frames, so how many a press sends at the device\'s count is not known',
    };
  }
  return blocksAtDeviceCount(protocol, keycode, press.repeats, toggleFlipped);
}

/** A command's blocks from its family's definition at the device's count, or why there are none. */
function blocksAtDeviceCount(
  protocol: ArchiveProtocol, keycode: string, repeats: number, toggleFlipped: boolean,
): StatedBlocks | { readonly refusal: string } {
  const built = waveformOfArchiveCommand(protocol, keycode, { repeats, asStored: true, toggleFlipped });
  if ('refusal' in built) return { refusal: built.refusal };
  if (built.once.length === 0) return { refusal: 'the code sends nothing on a press' };
  return {
    once: built.once,
    ...(built.held.length === 0 ? {} : { held: built.held }),
    // The release behind the record's third pointer, todo-process-logitech 2.5, which until then refused
    // the command: Logitech's compiles put it there, `StatedBlocks.release` carries the measurement.
    ...(built.release === undefined || built.release.length === 0 ? {} : { release: built.release }),
  };
}

/** Whether a catalogue code names a release group, its third: `G:<family>:(start)(repeat)(release)`. */
export function namesReleaseGroup(keycode: string): boolean {
  const groups = /^G:[^:]+:\(([^)]*)\)\(([^)]*)\)\(([^)]*)\)/.exec(keycode);
  return groups !== null && groups[3]!.trim() !== '';
}

/**
 * Whether the definition, at the count the rhythm table's row carries, sends the row's own first block for
 * a code the row composes: the family's stated count, or `TABLE_PRESS_REPEATS`'s for a family stating none.
 * The gate on moving a code naming a release group, or of a whole record row, from the row to the
 * definition, todo-process-logitech 2.5: only the blocks the row lacks may change, so a code whose first
 * block the two disagree about stays the row's. Judged on the code as stated, so its toggled group takes
 * the same route.
 */
function definitionKeepsTheRow(protocol: ArchiveProtocol, keycode: string, read: StatedCode): boolean {
  const count = protocol.pressMinimumRepeats ?? TABLE_PRESS_REPEATS.get(read.family);
  if (count === undefined) return false;
  const row = blockOfStatedCode(read, undefined, 'once');
  const built = waveformOfArchiveCommand(protocol, keycode, { repeats: count, asStored: true });
  return row !== undefined && !('refusal' in built) && built.once.length > 0 && sameTrain(row, built.once);
}

/**
 * The press's blocks for one command at the device's count: for a family the rhythm table holds no whole
 * block for, section 348, and for one it holds a block for at another device's count, section 350.
 * `undefined` where the table's block is the one to send; a refusal where neither is known.
 *
 * Read through `waveformOfArchiveCommand`, the one composition of a definition's readings, so the frames
 * are the ones `make prontocheck` holds against two million of the archive's renderings, sent as the code
 * states them rather than with the toggle cleared. **A command naming a release group gets the release as
 * its own block**, `StatedBlocks.release`, the record's third pointer, todo-process-logitech 2.5; it was
 * refused until then, on the ground that no compile here held one, and two families' compiles do.
 *
 * `toggleFlipped` gives the same command's blocks with its toggle bit flipped, by the same route: what a
 * record's second pointer group holds, `catalogueToggledCode`.
 */
export function catalogueCommandBlocks(
  keycode: string, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
  options: { readonly toggleFlipped?: boolean } = {},
): StatedBlocks | { readonly refusal: string } | undefined {
  const toggleFlipped = options.toggleFlipped === true;
  const read = catalogueCode(keycode, protocols);
  if (read === undefined) return { refusal: 'our keycode reader declines the code' };
  // **The table's whole block is for a code its family's name reads as well**, section 359. Every row was
  // measured or derived over such codes, `bin/protocols.ts` reading them by the name, so a code only the
  // definition's widths read is a shape no row was checked against: on 78 of them a row's block takes
  // the code and sends fewer frames than it states, or none. Those go to the definition at the device's
  // count below, the route of a family with no whole block, section 348.
  //
  //
  // **And so is a code naming a release group, or of a family whose row is a whole record shape, where the
  // definition sends the row's own first block**, todo-process-logitech 2.5, section 365. No row holds a
  // release, and the `quad`, `longToggle` and `sections` rows build no held block, where Logitech's compiles
  // hold both: the release behind the record's third pointer on a `Logitech 24 Bit` code of the Sony
  // PlayStation 3, and a held block on every record but the power steps and copies of the Yamaha DVD-S501,
  // the Microsoft VIP2250 and the Samsung BDC8000 on a Harmony One, which got none of their records whole from the row and 44 of 46, 36 of
  // 37 and 34 of 35 from the definition. The definition states both, so such a code goes below.
  //
  // **Only where the two agree about the first block**, `definitionKeepsTheRow`: the definition at the row's
  // count sends the row's train, so what moves is the block the row lacks and nothing it measured. Where
  // they disagree, `Samsung 38 Bit`'s durations section 350 left unsettled among them and `Magnavox 13 Bit`
  // codes whose release group names another value, no compile here shows which a press sends, so those
  // keep the row's block as before, without a held block or a release.
  const named = statedCode(keycode) !== undefined;
  const entry = statedProtocol(read.family);
  const wholeRecord = entry !== undefined
    && (entry.quad !== undefined || entry.longToggle !== undefined || entry.sections !== undefined);
  const byTable = named && composableKeycode(keycode, read);
  const own = catalogueProtocol(keycode, protocols);
  const rerouted = byTable && (namesReleaseGroup(keycode) || wholeRecord) && own !== undefined
    && definitionKeepsTheRow(own, keycode, read);
  if (byTable && !rerouted) return tableBlocksAtDeviceCount(keycode, read, press, protocols, toggleFlipped);
  if (entry === undefined) return { refusal: `no rhythm for ${read.family}` };
  // **A rerouted code keeps the count the row's block carried** where the device's would not be used for
  // it, as `tableBlocksAtDeviceCount` does: a family stating its own count is built at that count whatever
  // the device states, its row carrying it, sections 228 and 348; and on a device whose count is not known
  // a family stating none is built at `TABLE_PRESS_REPEATS`'s. Without this a code the table composed would
  // be refused on such a device. A code the table did not compose takes the device's count as before, so the
  // refusals of todo-process-logitech 2.2.3 are untouched.
  if (rerouted) {
    const count = own!.pressMinimumRepeats ?? ('refusal' in press ? TABLE_PRESS_REPEATS.get(read.family) : press.repeats);
    if (count !== undefined) return blocksAtDeviceCount(own!, keycode, count, toggleFlipped);
  }
  // **A code the name reads and the family's whole block does not take goes to the definition too**,
  // section 361, which until then refused it: 87 commands of four families, a `Pioneer 32 Bit Dual` code
  // stating one value where the row's block names two, `Philips Hurd 16 Bit LongToggle` and `Galaxis 16
  // Bit Quad Toggle` codes stating three frames where the row's shape takes one, and `Entone 56 Bit` codes
  // stating their value in the start group where the row's block sends the repeat group's. The ground is
  // the one above: the row holds no evidence for a shape it does not take, and the definition states it.
  // The refusal covered a `sections` row too, `Samsung 38 Bit`'s, whose block refused no code. On the codes
  // the four rows do take, the definition at the row's count sends the row's own train on 4797 of 4834; and
  // Logitech's compiles of the two catalogue devices here holding such a code, a Pioneer receiver and a
  // Philips television on a Harmony One, hold the definition's block word for word.
  if ('refusal' in press) return press;
  const protocol = catalogueProtocol(keycode, protocols);
  if (protocol === undefined) return { refusal: `the archive holds no definition of ${read.family}` };
  return blocksAtDeviceCount(protocol, keycode, press.repeats, toggleFlipped);
}

/**
 * A catalogue code with its toggle bit flipped, as the composer takes it for a record's **second pointer
 * group**, todo-process-logitech 2.5: the flipped reading, and its blocks by the route the code's own took,
 * `catalogueCommandBlocks` with `toggleFlipped`, so the table's block where the code's own is the table's.
 * `undefined` for a code whose family's definition states no toggle bit or states one outside its frames.
 *
 * **What Logitech's compiler writes.** On every record of a toggle family in every compile in the lab, the
 * record holds two groups and the second is the first with the toggle bit flipped, in its first and held
 * blocks; none in the lab has a tail. The first is the code as the catalogue states it, which a code stating its toggle bit set shows,
 * `withToggleFlipped` in `archive.ts`. The firmware alternates the two per device, section 365.
 */
export function catalogueToggledCode(
  keycode: string, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
): ToggledCode | { readonly refusal: string } | undefined {
  const protocol = catalogueProtocol(keycode, protocols);
  const read = catalogueCode(keycode, protocols);
  if (protocol === undefined || read === undefined) return undefined;
  const frames = withToggleFlipped(protocol, read.frames);
  if (frames === undefined) return undefined;
  const blocks = catalogueCommandBlocks(keycode, press, protocols, { toggleFlipped: true });
  if (blocks !== undefined && 'refusal' in blocks) return blocks;
  return { read: { ...read, frames }, ...(blocks === undefined ? {} : { blocks }) };
}

/**
 * A catalogue code as the composer reads it: at the widths and in the bases its family's definition
 * states, `statedCodeOfDefinition`, and at the name's only for a family the archive defines none of.
 * **The definition is found by `catalogueProtocol`**, so a code spelling its family in another letter case
 * or with a trailing space is read by its definition and carries the definition's name as its `family`,
 * which is what the rhythm table is looked up by; 221 commands of four such spellings were refused as having no
 * rhythm until section 361, and a fifth spelling's one command is refused for its device's count of 0. Section 359.
 *
 * **Why the definition and not the name.** The composer read every code at the widths the family's name
 * spells until section 359, and so refused 52658 commands of 156 families as unreadable: a name such as
 * `Russound 9 Bit Quad` gives the digit count, `Motorola 16 Bit Hex`, whose values are 32 bits, neither
 * count, and `Philips RC5Ex` no number at all, sections 231 and 233. On the codes both read, the table's block is the same under either reading on 101369
 * of 101593 and differs on 224, all of `Motorola 16 Bit Quad Toggle`, `Kathrein 16 Bit Quad Toggle` and
 * `Pace 18 Bit Quad Toggle`, whose toggle field the name made sixteen bits wide where the definition makes
 * it one: the name's block is the definition's at no count, the definition's at the count the family
 * states, 1.
 */
export function catalogueCode(
  keycode: string, protocols: ReadonlyMap<string, ArchiveProtocol>,
): StatedCode | undefined {
  const protocol = catalogueProtocol(keycode, protocols);
  if (protocol === undefined) return statedCode(keycode);
  const read = statedCodeOfDefinition(protocol, keycode);
  return read === undefined || read.family === protocol.name ? read : { ...read, family: protocol.name };
}
