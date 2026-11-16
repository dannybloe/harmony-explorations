/**
 * A family's first block, its held block and its release block derived whole from Logitech's own definition, and
 * the long gaps that derivation chunks joined back for a writer. Re-exported whole by `archive.ts`, which reads the
 * definitions and the rhythms this builds on, and whose docstring says what may cross from the archive.
 */
import type { BlockTail, BlockTailItem, FrameShape, Pulse } from '../infrared/irframe.ts';
import {
  type ArchiveKeyCode, type ArchiveProtocol, type ArchiveRhythm, orderedFields, rhythmOfDefinition, rhythmOfSegment,
  segmentRefs, type SegmentRef, shapeOfRhythm,
} from './archive.ts';
import { atomUs, type Segment } from './archiveschema.ts';

/** Why a block could not be derived from a definition. Counted rather than thrown, as a refusal is. */
export type BlockRefusal =
  | 'the rhythm itself could not be read'
  | 'the definition states no repeat cycle'
  | 'a cycle names a segment the definition does not hold'
  | 'a cycle names an infrared segment stating no readable rhythm'
  | 'a padded cycle of several frames whose shared period is not one number'
  | 'a copy stating its constant half last follows a mark';

/**
 * A block as our table states it, derived from a definition, plus the repeat count it stated.
 *
 * `tail` is the whole first block and `held` is one repetition, which is our table's pair. **`held`
 * needs no repeat count and `tail` does**, which is the finding this type carries in its shape: a
 * repetition is stated in full by `KeyCode.Repeat`, and how many of them Logitech's compiler emits is
 * stated on 39 definitions of 684 and nowhere else.
 */
export interface ArchiveBlock {
  readonly tail: BlockTail;
  readonly held: BlockTail;
  /**
   * The block a remote sends when the key comes up, on the 60 families whose keycode names a third
   * group and undefined on the rest. Section 233.
   *
   * A configuration's record holds three block pointers and this is the third. The archive's renderer
   * has only two sections and appends this one to the **first**, which is how it was read.
   */
  readonly release?: BlockTail;
  /** `pressMinimumRepeats`, or undefined on the 645 definitions that state none. */
  readonly statedRepeats: number | undefined;
  /**
   * The **other** rhythms this block's copies go out in, for `FrameShape.also`.
   *
   * Empty on all but the 44 families whose segments do not state one rhythm, section 232. A copy item's
   * `shape` indexes it, offset by one, so a caller must pass this to the emitter or a copy naming a
   * later shape throws. That is deliberate: a silent fallback to the first shape would send one
   * segment in another's rhythm and the waveform would look well formed.
   */
  readonly also: readonly FrameShape[];
}

/** The width `blockOfDefinition` chunks a literal gap at, the widest duration a stored word holds. */
export const GAP_CHUNK_US = 32767;

/**
 * A block's gaps joined back into one silence each, where `blockOfDefinition` chunked them: a space of
 * exactly `GAP_CHUNK_US` absorbs the space after it. Section 359.
 *
 * **Why a writer needs this and a comparison does not.** The chunking is ours, greedy, and a train
 * comparison joins it anyway; but a configuration spells a long silence by the half word rule,
 * `compiledBlockWords` in `compose.ts`, and that rule can only be applied to a silence it sees whole.
 * Fed the chunks, it spells each on its own, so `Microsoft 30 Bit`'s 68643 went out as 32767, 32767 and
 * 3109 where every Logitech compile holding the family writes 32767, 17938 and 17938, the same signal in
 * other words. Measured on the 72 records of a Harmony One compile of the harvest, section 359.
 *
 * **Only a chunk is joined, never two spaces in general**: a biphase family sends two adjacent half cells
 * of one kind as two cells and Logitech stores them as two words, so merging every run of spaces would
 * write words no compile holds. A half cell is never as wide as a stored word.
 */
export function joinedGaps(pulses: readonly Pulse[]): Pulse[] {
  const out: Pulse[] = [];
  for (const one of pulses) {
    const last = out[out.length - 1];
    if (last !== undefined && !last.mark && !one.mark && last.us >= GAP_CHUNK_US && (last.us % GAP_CHUNK_US) === 0) {
      out[out.length - 1] = { mark: false, us: last.us + one.us };
    } else out.push({ ...one });
  }
  return out;
}

/**
 * Derive a family's first block and its held block from Logitech's own definition.
 *
 * **What a definition states and what it does not.** `KeyCode` names the segments of one repetition,
 * of a preceding start block and of a release block; each infrared segment states its trailer and, where
 * it is padded, the constant duration a copy is stretched to; each code segment states literal
 * durations. All of that is the block's **shape** and it is derived here. What is **not** stated, on 645
 * definitions of 684, is how many repetitions the compiler emits, so it is an argument rather than a
 * derivation. Where `pressMinimumRepeats` does state it, it agrees with all five of the blocks measured
 * here that have it, which is the only calibration available for it.
 *
 * **Three conventions of theirs are folded in, each measured against our own blocks.**
 *
 * * The block's **final duration is one microsecond longer** than the definition states. Measured on
 *   every one of the measured families that can show it, in both places it can land: the last pad where
 *   the block is padded, and the last literal word where it is not. **It is the stored form's and not
 *   the signal's**, section 230, which is what `storedForm: false` turns off: Logitech's compiler adds
 *   it when writing a configuration and the archive's renderer does not when producing a waveform.
 * * A **padded copy** becomes a pad our emitter solves, against a block total where one repetition holds
 *   a single frame and against a per copy period where it holds several. The second branch is the two
 *   `Sharp 15` families, whose two frames differ in duration so one shared pad cannot state both.
 * * A **biphase** copy has a fixed duration, so its gap is a literal rather than a pad. That is not a
 *   choice: our emitter solves one pad value for a whole block, and the `+ 1` makes that division
 *   inexact, which is why Logitech's compiler stores literals for these families too.
 *
 * The gap is chunked at 32767 microseconds, which is the widest duration a stored word holds. **The
 * chunking is ours and not theirs**: `Magnavox 13 Bit`'s 92000 is stored as 32767, 32767 and 26466,
 * greedily, while `Microsoft 30 Bit`'s 68643 is stored as 32767, 17938 and 17938, which no greedy rule
 * produces. A gap is additive on the wire, so both send the same signal and a comparison is made on the
 * train rather than on the words.
 */
export function blockOfDefinition(
  protocol: ArchiveProtocol, repeats: number,
  options: { readonly storedForm?: boolean; readonly keyCode?: ArchiveKeyCode } = {},
): ArchiveBlock | { readonly refusal: BlockRefusal } {
  // **The one microsecond belongs to the stored form and not to the signal**, section 230. It is what
  // Logitech's **compiler** writes into a configuration, measured on every block we have off it; their
  // own **renderer**, which turns the same definition into a waveform, does not add it. Comparing our
  // blocks against 13 million of those renderings is what separated the two, and before that separation
  // the difference read as our being wrong by one unit on the last word of every padded family.
  const storedForm = options.storedForm ?? true;
  const rhythm = rhythmOfDefinition(protocol);
  if ('refusal' in rhythm) return { refusal: 'the rhythm itself could not be read' };
  // A command's own groups where the caller has them, the family's default otherwise. See
  // `keyCodeOfStatedCode` for why the two are not the same thing.
  const keycode = options.keyCode ?? protocol.definition.KeyCode;
  const cycle = keycode?.Repeat ?? [];
  const start = keycode?.Start ?? [];
  /** How many frames one repetition sends, which is where the release block's own frames start. */
  const cyclePayloadCount = cycle.filter((r) => r.SegmentType === 1).length;
  // **How many frames the code sends, which is the greater of what the definition names and what the
  // cycles ask for.** Taking it from `keycodeFields` alone is section 230's last correction: `Revox 11
  // Bit` declares **one** field and every one of its codes states **two** values, so a copy index
  // clamped at zero sent the first value twice and the second never. That is 79 commands over six
  // families, and it is the failure that is hardest to see from the outside, because the waveform is
  // well formed, decodes cleanly, and carries the wrong number.
  const frames = Math.max(
    Object.keys(protocol.keycodeFields ?? {}).length,
    [keycode?.Start ?? [], keycode?.Repeat ?? [], keycode?.Finish ?? []]
      .flat().filter((r) => r.SegmentType === 1).length,
    1,
  );
  const startPayloads = (keycode?.Start ?? []).filter((r) => r.SegmentType === 1).length;
  /**
   * How many values the code actually states, which is the ceiling on a copy's frame index.
   *
   * **`frames` is the greater of the field count and the payload count and cannot be that ceiling**,
   * section 232. A code stating **fewer** values than the definition has fields is real:
   * `Revox 11 Bit 2` declares two fields and 73 of its codes state one value, naming the second segment,
   * so a copy clamped at the field count asked for a frame the code does not hold and the emitter threw.
   * A code stating **more** than the field count is also real, section 230's `Revox 11 Bit`, which is why
   * `frames` takes the maximum. So the count of values is the supplied keycode's own payloads, and only
   * where no keycode was supplied does the field count have to stand in for it.
   */
  const values = options.keyCode === undefined ? frames : Math.max(
    [keycode?.Start ?? [], keycode?.Repeat ?? [], keycode?.Finish ?? []]
      .flat().filter((r) => r.SegmentType === 1).length,
    1,
  );
  const infrared = protocol.definition.IRSegments ?? [];
  const literals = protocol.definition.CodeSegments ?? [];

  /**
   * Every infrared segment's own rhythm, section 232, with the frame segment first.
   *
   * **A second infrared segment need not state the frame's rhythm and 44 families prove it.** A dual
   * family such as `Samsung 16 and 20 Bit` states two frames of the same shape and those are one entry
   * here; a toggle family such as `Classe 16 Bit Toggle` states three cells of different widths and
   * those are three. Reading only the first would emit a third of that command, and refusing the family
   * is what this did until 31 August 2026, at a cost of 84694 commands.
   *
   * Compared on the shape rather than on the segment objects, which carry per atom bounds that differ
   * between two segments stating the same rhythm, and keyed on the shape so two segments of one rhythm
   * share one entry and every existing block keeps its single shape and its `shape`-free copies.
   */
  const shapes: FrameShape[] = [];
  const readings: ArchiveRhythm[] = [];
  const shapeAt = new Map<string, number>();
  const frameOf = infrared.find((s) => s.Name === protocol.name)
    ?? (infrared.length === 1 ? infrared[0] : undefined);
  /**
   * A rhythm's key, **without its lead in**, which is what makes this additive rather than a rewrite.
   *
   * Two segments of one rhythm and two lead ins are already handled, by emitting the second's header as
   * literal words in front of a bare copy: that is `ownHeader` below and section 230 measured it into
   * place. Keying on the lead as well would give such a segment a shape of its own and route it down the
   * new path instead, which is a second way of saying the same thing and would have to earn its place
   * by measurement. So the key is the cells and the durations, and a difference in the lead alone still
   * takes the old route.
   */
  const shapeKey = (r: ArchiveRhythm): string => JSON.stringify([
    // **The lead is part of the key for the two shapes that have no bare form.** A pulse timing copy can
    // be emitted bare, by zeroing its header, so a segment differing only in its lead takes the older
    // route: its header goes out as literal words in front of a bare copy. A biphase or cell table copy
    // has no such form, so a lead of its own has to be a shape of its own or the frame's lead would be
    // sent again in front of every one of its copies.
    r.cells === undefined ? null : [r.cells.cells, r.cells.bits, r.cells.lead],
    r.biphase === undefined ? null
      : [r.biphase.mark, r.biphase.space, r.biphase.firstMark ?? null, r.biphase.setIsMark,
         r.biphase.lead],
    r.timings === undefined ? null
      : [r.timings.flat, r.timings.zero, r.timings.one, r.timings.carries, r.timings.oneMark ?? null,
         r.timings.firstMark ?? null, r.timings.carriedFirst === true, r.timings.closing ?? null],
    r.framePeriod ?? null,
  ]);
  if (frameOf !== undefined) {
    shapes.push(shapeOfRhythm(rhythm));
    readings.push(rhythm);
    shapeAt.set(shapeKey(rhythm), 0);
  }
  /** Which rhythm a segment goes out in, or a refusal naming why it could not be read. */
  const shapeIndex = (segment: Segment): number | BlockRefusal => {
    if (segment === frameOf) return 0;
    const read = rhythmOfSegment(protocol, segment);
    if ('refusal' in read) return 'a cycle names an infrared segment stating no readable rhythm';
    const key = shapeKey(read);
    const known = shapeAt.get(key);
    if (known !== undefined) return known;
    shapes.push(shapeOfRhythm(read));
    readings.push(read);
    shapeAt.set(key, shapes.length - 1);
    return shapes.length - 1;
  };
  const named = (ref: SegmentRef): Segment | undefined =>
    (ref.SegmentType === 1 ? infrared : literals).find((s) => s.Name === ref.SegmentName);
  /** A segment's full name back to the short id a `keycodeFields` entry names it by. */
  const refIds = new Map([...segmentRefs(protocol)].map(([id, ref]) => [ref.SegmentName ?? '', id]));

  /** The words a payload copy leaves over: the constant half where the cell states it last, then the
   * trailer. */
  const closing = (trailer: readonly number[], which: number): number[] => {
    const out: number[] = [];
    // **The rhythm the copy actually went out in**, section 232, not the family's first: a family can
    // send several and only the segment that was emitted knows whether its cell left a half over.
    const of = readings[which] ?? rhythm;
    // Nothing is left over where the emitter states the cell in its own order: the copy already ends on
    // its constant half, so appending another would send it twice.
    if (of.timings !== undefined && of.cellCarriedFirst && of.timings.carriedFirst !== true) {
      out.push(of.timings.carries === 'space' ? of.timings.flat : -of.timings.flat);
    }
    out.push(...trailer);
    return out;
  };
  /** A gap in stored words, each at most the widest a duration word holds. `joinedGaps` undoes it. */
  const chunked = (us: number): number[] => {
    const out: number[] = [];
    for (let left = us; left > 0; left -= GAP_CHUNK_US) out.push(-Math.min(left, GAP_CHUNK_US));
    return out;
  };
  /**
   * How long one biphase copy runs, which is fixed because both cells hold the same two halves.
   *
   * **Per rhythm and per width since section 232**, because a family can send several: `Classe 16 Bit
   * Toggle`'s three segments are 442, 880 and 442 microsecond half cells at 4, 1 and 16 bits, so one
   * answer for the family would be wrong for two of the three. Undefined where the segment states no
   * width, since a copy's duration cannot be known without one.
   */
  const biphaseCopy = (which: number, bits: number | undefined): number | undefined => {
    const b = shapes[which]?.biphase;
    if (b === undefined || bits === undefined) return undefined;
    return b.lead.reduce((n, p) => n + p.us, 0) + bits * (b.mark + b.space);
  };

  // One emission of a `KeyCode` entry: its items and the duration it nominally runs for, which is what
  // a block total is summed from. A payload emission's own duration is value dependent, so an unpadded
  // one contributes nothing and the block then carries no total, which is right: it has no pad either.
  interface Emission {
    items: BlockTailItem[];
    nominal: number | undefined;
    padded: boolean;
    /** Which of the code's frames this copy sent, so a block can tell one padded frame from two. */
    frame?: number;
  }
  let payloads = 0;
  let base = 0;
  /** How many payload copies the whole block has emitted, which is what decides the folded lead. */
  let emitted = 0;

  /**
   * Which of the code's values each segment carries, keyed by the segment id a keycode names.
   *
   * **A cycle position picks the next unused field whose `segment` matches it**, section 232, and that
   * is a strict generalisation of counting payloads rather than a second rule: where every field names
   * segment `"0"`, the list for `"0"` is 0, 1, 2 and taking the k-th gives exactly the payload counter.
   * Where a cycle names segments in an order the fields do not, it differs and the fields win.
   * `LifesizeIconA 17 Bit Toggle` is the case: its cycle is 0, 1, 0, 1 and its fields in token order are
   * 0, 0, 1, 1, so the counter pairs the second cycle position with the second field and the pairing
   * rule pairs it with the third.
   *
   * Used only where there is a field per frame and every payload's id has one, since otherwise it
   * cannot answer: `Revox 11 Bit` declares one field and its codes state two values, section 230, and
   * there the payload counter is still the reading.
   */
  const perSegment = new Map<string, number[]>();
  {
    const fields = orderedFields(protocol);
    fields.forEach((f, at) => {
      const key = `${f.sequence}|${f.segment}`;
      perSegment.set(key, [...(perSegment.get(key) ?? []), at]);
    });
    const asked = [
      ...(keycode?.Start ?? []).map((r) => ['start', r] as const),
      ...cycle.map((r) => ['repeat', r] as const),
    ].filter(([, r]) => r.SegmentType === 1)
      .map(([seq, r]) => `${seq}|${refIds.get(r.SegmentName ?? '') ?? ''}`);
    // **Every position asked for needs a field of its own**, which is the guard rather than tidiness: a
    // dual family's code states two values and gives both the position digit `0`, so its cycle names
    // segment `"0"` twice where only one field does. Pairing both with that one field sent the first
    // value twice and the second never, on 8 `MemorexV2 32 Bit Dual` commands and 48 `Daewoo 16 Bit`
    // ones. Where the pairing cannot answer, the payload counter is still the reading.
    const wanted = new Map<string, number>();
    for (const key of asked) wanted.set(key, (wanted.get(key) ?? 0) + 1);
    const short = [...wanted].some(([key, n]) => (perSegment.get(key) ?? []).length < n);
    if (fields.length !== frames || short) perSegment.clear();
  }
  /** How many times this group has already named each segment id, keyed as the map above. */
  let seenId = new Map<string, number>();
  const emit = (
    ref: SegmentRef, first: boolean, sequence: 'start' | 'repeat' | 'finish', previous?: BlockTailItem,
  ): Emission | BlockRefusal => {
    const segment = named(ref);
    if (segment === undefined) return 'a cycle names a segment the definition does not hold';
    // **A segment with no payload is a literal whatever its declared type**, section 233. `Airboard
    // 9 Bit` states its repeat and its release as infrared segments, type 1, carrying a whole waveform
    // in the header and no `Payload` at all, so reading the type alone sent them down the frame path
    // and refused 151 codes. There is nothing to fill in, which is what makes it a literal.
    if (ref.SegmentType !== 1 || segment.Payload === undefined || segment.Payload === null) {
      // A literal group: its header and trailer verbatim, padded out to its own stated total. This is
      // the ditto `Toshiba 32 Bit` and `JerroldO1 16 Bit` send after their one frame.
      const words = [...(segment.Header ?? []), ...(segment.Trailer ?? [])]
        .map(atomUs);
      const stated = segment.TotalLength ?? 0;
      const held = words.reduce((n, w) => n + Math.abs(w), 0);
      if (stated > held) words.push(...chunked(stated - held));
      return { items: [{ words }], nominal: Math.max(stated, held), padded: false };
    }
    // The frame, and **which of the family's rhythms it goes out in**, section 232. A dual family such
    // as `Samsung 16 and 20 Bit` states two frames of the same shape and both are rhythm 0 at two frame
    // indices; a toggle family such as `Classe 16 Bit Toggle` states three cells of different widths and
    // those are three rhythms in one repetition. This refused the second case outright until 31 August
    // 2026, at a cost of 84694 commands, and a segment stating a shape our reader cannot read at all is
    // still a refusal rather than a coercion into the frame's.
    const frame = frameOf;
    const which = shapeIndex(segment);
    if (typeof which === 'string') return which;
    // Which of the code's frames this copy sends. **The index restarts with every repetition**, which
    // the two `Sharp 15` families measure: they alternate their two frames rather than sticking on the
    // second. The start block's payloads come first, so a cycle of one payload after a payload start is
    // the **second** frame, which is what `Pioneer 32 Bit 2` does.
    // **Which of the code's values this copy carries.** The k-th time a group names a segment, it takes
    // the k-th field of that group with that segment, section 232. Where every field names segment `"0"`
    // that is exactly the payload counter below, so this is a generalisation rather than a second rule;
    // where a group names its segments in an order the fields do not, the fields win, which is what
    // `LifesizeIconA 17 Bit Toggle`'s 0, 1, 0, 1 cycle over 0, 0, 1, 1 fields needs. `base` plays no
    // part here because the group already says whether this is the start block or a repetition.
    const key = `${sequence}|${refIds.get(ref.SegmentName ?? '') ?? ''}`;
    const mine = perSegment.get(key);
    const kth = seenId.get(key) ?? 0;
    seenId.set(key, kth + 1);
    const at = mine === undefined ? Math.min(base + payloads, values - 1)
      : Math.min(mine[kth] ?? mine[mine.length - 1]!, values - 1);
    payloads += 1;
    emitted += 1;
    // A folded lead sits inside the first block's first copy; every later copy drops it, and so does
    // every copy of the held block, which is what `JVC 16 Bit`'s measured pair shows.
    // **A second segment states its own header, and it need not be the frame's.** Three cases occur and
    // one rule covers them: the second frame of `Samsung 16 and 20 Bit` has no header at all and opens
    // straight on a bit cell, `BelCanto 16 Bit`'s has a header of its own, 525 and 4200 where the frame's
    // is 8400 and 4200, and `Sharp 15 Bit`'s cycle names the same segment twice so there is nothing to
    // differ. A copy's header comes from the shape, which is one per family, so a header of its own is
    // emitted as literal words and the copy is `bare`.
    //
    // Found by comparing against the archive's renderings, section 230: taking the second copy as
    // `full` sent the frame's 8400 lead in where the archive's renderer sends 525, on every code of the family.
    const ownHead = (segment.Header ?? []).map(atomUs);
    const frameHead = (frame?.Header ?? []).map(atomUs);
    // **Only where the copy goes out in the frame's own rhythm**, section 232. A segment with a rhythm
    // of its own carries its own lead in inside that rhythm, so emitting the header again as literal
    // words would send it twice, and marking the copy `bare` would drop a biphase lead the emitter has
    // no way to put back.
    const ownHeader = which === 0 && segment !== frame
      && JSON.stringify(ownHead) !== JSON.stringify(frameHead);
    // **The shift that models a constant half stated last needs a space in front of the copy.** Our
    // emitter opens a copy on the flat half, and for such a family that half belongs at the **end** of
    // the previous cell, so it only lands right where nothing carrying a level precedes it: an absorbed
    // header, or a gap. Where a mark comes immediately before, the two merge into one longer mark and
    // the signal is wrong by the length of the flat half.
    //
    // `Bell 16 Bit` and `Panasonic 31 Bit` are the case, section 230: both open on a lead in whose last
    // atom is a mark and both close each copy on a mark, so every one of their 905 commands disagreed
    // with the archive's rendering on that one interval. Refused rather than approximated.
    const of = readings[which] ?? rhythm;
    if (of.cellCarriedFirst && !ownHeader && of.timings?.carriedFirst !== true) {
      const before = previous;
      if (before !== undefined && 'words' in before) {
        const last = before.words[before.words.length - 1];
        if (last !== undefined && last > 0) return 'a copy stating its constant half last follows a mark';
      }
    }
    const bare = ownHeader || (of.leadFolded && !(first && emitted === 1));
    const items: BlockTailItem[] = [];
    // Marked as the copy's own, so a copy period counts it: the lead in belongs to this segment and not
    // to the gap before it. Section 230.
    if (ownHeader && ownHead.length > 0) items.push({ words: ownHead, ofCopy: true });
    items.push({
      copy: bare ? 'bare' : 'full',
      ...(at === 0 ? {} : { at }),
      ...(which === 0 ? {} : { shape: which }),
    });
    const words = closing((segment.Trailer ?? []).map(atomUs),
                          which);
    const stated = segment.TotalLength ?? 0;
    const fixed = biphaseCopy(which,
      which === 0 ? rhythm.bits : (segment.Payload?.NumberOfBits ?? undefined));
    if (stated > 0 && fixed !== undefined) {
      // Biphase: the copy's duration is known, so the gap is a literal.
      const held = words.reduce((n, w) => n + Math.abs(w), 0);
      if (words.length > 0) items.push({ words: [...words, ...chunked(stated - fixed - held)] });
      else items.push({ words: chunked(stated - fixed) });
      return { items, nominal: stated, padded: false };
    }
    if (words.length > 0) items.push({ words });
    if (stated > 0) items.push({ pad: 0 });
    return { items, nominal: stated > 0 ? stated : undefined, padded: stated > 0, frame: at };
  };

  const build = (
    refs: readonly (readonly SegmentRef[])[], first: boolean, from: number,
    named?: readonly ('start' | 'repeat' | 'finish')[],
    // Whether this block carries the stored microsecond: the first and held blocks do and a release block
    // does not, section 365.
    stored: boolean = storedForm,
  ): BlockTail | BlockRefusal => {
    base = from;
    payloads = 0;
    seenId = new Map();
    emitted = 0;
    const opens = first && start.length > 0 && refs.length > 1;
    const items: BlockTailItem[] = [];
    let nominal = 0;
    let pads = 0;
    let known = true;
    let period: number | undefined;
    let cyclePayloads = 0;
    /** The frames a pad was solved for, which is one of the two tests between the two pad rules. */
    const paddedFrames = new Set<number>();
    /** Set once two padded copies of one cycle state different periods. */
    let perPad = false;
    /** Each padded copy's own stated period, and where its pad item sits, so it can be stamped. */
    const nominals: (number | undefined)[] = [];
    const padItems: number[] = [];
    for (const [index, list] of refs.entries()) {
      payloads = 0;
      seenId = new Map();
      // Every repetition counts its frames from where the start block stopped.
      if (opens && index > 0) base = startPayloads;
      for (const ref of list) {
        // The code segment a folded lead came from is skipped: its durations are already the first
        // copy's header, and emitting them again sends the lead twice.
        if (rhythm.leadFolded && ref.SegmentType === 0
          && ref.SegmentName === `${protocol.name} KeyCodeStart`) continue;
        const one = emit(ref, first,
                         named?.[index] ?? (opens && index === 0 ? 'start' : 'repeat'),
                         items[items.length - 1]);
        if (typeof one === 'string') return one;
        items.push(...one.items);
        if (one.nominal === undefined) known = false; else nominal += one.nominal;
        if (one.padded) {
          pads += 1;
          if (one.frame !== undefined) paddedFrames.add(one.frame);
          // **Where two copies of one cycle state different periods, each pad carries its own**,
          // section 233. This was a refusal, 7353 codes over 21 families, on the reading that a block
          // has one copy period. It has one **default**: 21 families state a `TotalLength` per segment
          // and send two of them per repetition, `Adcom 12 Bit Dual` padding to 53500 and then to
          // 107000, so the number belongs to the pad and the block's is what a pad falls back on.
          if (period !== undefined && period !== one.nominal) perPad = true;
          period = one.nominal;
          nominals.push(one.nominal);
          padItems.push(items.length - 1);
        }
      }
      if (index === refs.length - 1) cyclePayloads = list.filter((r) => r.SegmentType === 1).length;
    }
    // The one microsecond the compiler adds to a block's last duration, in whichever of the two places
    // that block ends.
    const last = stored ? items[items.length - 1] : undefined;
    if (last !== undefined && 'pad' in last) items[items.length - 1] = { pad: 1 };
    else if (last !== undefined && 'words' in last && last.words.length > 0) {
      const words = [...last.words];
      const at = words.length - 1;
      words[at] = words[at]! + Math.sign(words[at]!);
      items[items.length - 1] = { words };
    }
    const lead = first && rhythm.leadFolded && rhythm.timings !== undefined
      ? rhythm.timings.header[0] + rhythm.timings.header[1] : 0;
    if (pads === 0) return { items };
    // Stamping happens after the walk, since whether the periods differ is only known at the end.
    //
    // **A block total nobody can compute is the second case for a per pad period**, section 233. The
    // first is two pads disagreeing; this one is a cycle where a padded copy sits beside an unpadded
    // one whose length the definition does not state, so the block has no total to solve against while
    // the pad itself knows exactly what it is stretching to. `Airboard 9 Bit` is the case, 151 codes: a
    // start block of one padded segment and one that states no total at all.
    if (perPad || !known) {
      for (const [n, at] of padItems.entries()) {
        const item = items[at];
        const own = nominals[n];
        if (item === undefined || !('pad' in item) || own === undefined) {
          return 'a padded cycle of several frames whose shared period is not one number';
        }
        items[at] = { ...item, period: own };
      }
      return { items };
    }
    // **A block pads each copy to its own period where the copies can differ in length, and against a
    // single block total where they cannot. Two tests and not one, which cost a measurement to get
    // right**, section 230. A cycle of several payloads needs a pad each, those frames being different
    // values. So does a block whose **start block and cycle** pad different frames, which is the case
    // that was missed: `Roku 32 Bit 1` states one payload per cycle and pads twice, its start block's
    // value and its repetition's, and the two carry a different number of set bits, so one shared pad
    // splits the difference and both are wrong. 52 of its 918 commands, the other 866 agreeing only
    // because their two values happen to run the same length; `Daewoo 40 Bit` is the same shape and was
    // wrong on all 27 of its.
    //
    // **Replacing the first test rather than joining it costs 9488 commands**, measured over the whole
    // archive: a cycle of two payloads that clamp to one frame index has one padded frame and several
    // pads, so it needs the per copy rule, and the frame test alone sends it to the block total where
    // the division does not come out whole and the emitter refuses. Both tests are load bearing.
    if (cyclePayloads > 1 || paddedFrames.size > 1) return { items, copyPeriod: period! };
    if (!known) return 'a padded cycle of several frames whose shared period is not one number';
    return { items, total: nominal + lead + (stored ? 1 : 0) };
  };

  // The first block is the start block then the cycle as many times as asked; the held block is one
  // cycle, and needs no count at all.
  // **A code may state no repetition, and then its start block is the whole transmission**, section
  // 233. This was a refusal, 1334 codes over 21 families, on the reading that a block pair needs a
  // cycle. It does not: `B and O 17 Bit 2` writes `(0x01111111111111111)()()`, a start block and
  // nothing else, which is a command sent once however long the key is held. So the held block is
  // **empty** rather than absent, which is the honest answer and is what a remote does with it: it
  // repeats nothing.
  if (cycle.length === 0 && start.length === 0) {
    return { refusal: 'the definition states no repeat cycle' };
  }
  const tail = build(cycle.length === 0 ? [start]
    : [...(start.length > 0 ? [start] : []), ...Array.from({ length: repeats }, () => cycle)], true, 0);
  if (typeof tail === 'string') return { refusal: tail };
  // The held block starts where the first block's start block left off, which is why
  // `Pioneer 32 Bit 2` repeats its **second** frame: its start block sent the first.
  const held = cycle.length === 0 ? { items: [] } : build([cycle], false, startPayloads);
  if (typeof held === 'string') return { refusal: held };
  // **The release block, which our table does have a slot for after all**, section 233. This refused
  // any family whose keycode names a third group, 60 families and 17230 codes, on the ground that our
  // block pair had nowhere to put it. A configuration's record holds **three** block pointers, once,
  // held and tail, and the third is exactly this: what a remote sends when the key comes up.
  //
  // What settled it was the archive's rendering, which has only two sections and puts the release
  // group at the end of the **first** one. Ours was an exact prefix of theirs on every one of the 60
  // families, and every length difference was a whole number of the release group's own frames, so
  // reading it as a block appended to the first transmission is a measurement rather than a guess.
  //
  // It is built as its own block rather than appended to `tail`, because a configuration keeps it in a
  // pointer of its own and because appending it would move the pad arithmetic: the pad rule reads the
  // payload count of the **last** group it walked, and the stored form's one extra microsecond lands on
  // the block's last duration.
  //
  // **And a release block carries no stored microsecond**, section 365: every
  // first and held block of every configuration in the lab but the Harmony 525's, whose blocks are of another
  // class, ends in the one microsecond word the compiler carves off its trailing gap, and neither of the
  // lab's two distinct record tails does: the PlayStation 3's `StopSpacer` on the Harmony One, 650 and 700 and
  // `Microsoft 36 Bit`'s release on the contributed Harmony 880 or 885 configurations, each the definition's
  // finish group to the microsecond with nothing added.
  const finish = keycode?.Finish ?? [];
  let release: BlockTail | undefined;
  if (finish.length > 0) {
    const built = build([finish], false, startPayloads + cyclePayloadCount, ['finish'], false);
    if (typeof built === 'string') return { refusal: built };
    release = built;
  }
  return {
    tail, held,
    ...(release === undefined ? {} : { release }),
    statedRepeats: protocol.pressMinimumRepeats ?? undefined,
    also: shapes.slice(1),
  };
}
