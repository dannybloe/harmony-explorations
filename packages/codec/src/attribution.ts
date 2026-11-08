/**
 * The bookkeeping every family's attribution of a finished configuration does, whichever generators it asks: a ledger
 * of which generator owns each byte, a byte credited only once its rebuild is the file, the bytes a generator read off
 * the file as its description counted apart, and what is left reported by the region that claims it or as claimed by
 * nothing. `todo-compile-350.md` 5.2.1, written for the Harmony 300 and 350's attribution, `families/harmony-300-350/
 * attribution.ts`.
 *
 * **Why it is outside every family.** Nothing here knows a byte of any remote: it takes the generators' names, their
 * rebuilt bytes and the regions a reader claims, and counts. The questions it answers are the ones the other two
 * families' attributions answer for themselves, `attributeBytes` in `families/harmony-600-650-700/assemble.ts` and
 * `oneBuiltBytes` and `oneAttributedBytes` in `families/harmony-one/`: a first claim wins, the description is counted
 * apart, and what no generator reproduces is named by its owner in `coverage.ts`' `claims` or reported unclaimed.
 * Those two keep their own ledgers, which predate this one and are pinned by their tests; folding them onto it is
 * open, not done, and nothing here depends on it.
 *
 * **Two words this module uses the way the plans do.** A byte is **carried** where a reader knows what structure it
 * sits in and no generator rebuilt it: on a configuration made from a donor it came from the donor, and on a
 * Logitech compile it is a part no generator of ours writes yet. A byte is **unclaimed** where no reader even knows
 * the structure, which on a parsed configuration means a gap the readers do not cover.
 */
import type { Claim } from './coverage.ts';

/** What a ledger returns once every generator has marked: the counts per generator and what is left. */
export interface Attributed<Name extends string> {
  /** Per byte of the configuration: 0 where no generator rebuilt it, else 1 + its generator's index in the ledger's names. */
  readonly owners: Uint8Array;
  /** Bytes each generator rebuilt, its description's included. */
  readonly generated: Record<Name, number>;
  /** Of those, the bytes each generator read off the configuration as its description rather than computing them. */
  readonly described: Record<Name, number>;
  /** The bytes no generator rebuilt that a reader's region holds, by the region's owner. */
  readonly carried: Map<string, number>;
  /** The bytes no generator rebuilt and no region holds. */
  readonly unclaimed: number;
  /**
   * Bytes a second generator rebuilt as well, after the first had them: a measure of how often two generators write
   * the same bytes, which the first-claim rule otherwise hides. Each such byte is still the first's.
   */
  readonly contested: number;
  /** Which generators reached the contested bytes, `first > second`, with how many. */
  readonly contests: Map<string, number>;
  readonly total: number;
}

/**
 * Which generator owns each byte of one configuration. A byte goes to the first generator that marks it; a later mark
 * by another generator counts as contested and changes nothing.
 */
export class ByteLedger<Name extends string> {
  readonly owners: Uint8Array;
  private readonly isDescribed: Uint8Array;
  private readonly contests = new Map<string, number>();
  private contested = 0;
  private readonly blob: Uint8Array;
  private readonly names: readonly Name[];
  private readonly ignoring: ReadonlySet<Name>;

  /**
   * `ignoring` names generators whose marks are dropped: the control that a generator's claim is what keeps its bytes
   * attributed, since with it dropped they have to come back as carried.
   */
  constructor(blob: Uint8Array, names: readonly Name[], ignoring: ReadonlySet<Name> = new Set()) {
    this.blob = blob;
    this.names = names;
    this.ignoring = ignoring;
    this.owners = new Uint8Array(blob.length);
    this.isDescribed = new Uint8Array(blob.length);
  }

  /** The generator that owns a byte, or undefined. */
  ownerOf(k: number): Name | undefined {
    const tag = this.owners[k] ?? 0;
    return tag === 0 ? undefined : this.names[tag - 1];
  }

  /**
   * Credit `length` bytes at `from` to `who`, the offsets `described` names as its description. Use only where the
   * caller has already held the rebuild to the file, or where the bytes are by construction the generator's, such as
   * the frame's after the whole file laid out again into itself.
   */
  mark(from: number, length: number, who: Name, described: (k: number) => boolean = () => false): void {
    const tag = this.names.indexOf(who) + 1;
    if (tag === 0) throw new RangeError(`${who} is no generator of this ledger`);
    if (this.ignoring.has(who)) return;
    for (let k = from; k < from + length && k < this.owners.length; k += 1) {
      const there = this.owners[k]!;
      if (there !== 0) {
        if (there !== tag) {
          this.contested += 1;
          const key = `${this.names[there - 1]} > ${who}`;
          this.contests.set(key, (this.contests.get(key) ?? 0) + 1);
        }
        continue;
      }
      this.owners[k] = tag;
      if (described(k)) this.isDescribed[k] = 1;
    }
  }

  /** Whether the file holds `expected` at `at`, byte for byte. */
  holds(at: number, expected: Uint8Array): boolean {
    if (at < 0 || at + expected.length > this.blob.length) return false;
    for (let k = 0; k < expected.length; k += 1) if (this.blob[at + k] !== expected[k]) return false;
    return true;
  }

  /**
   * Credit `expected` to `who` at `at` only where the file holds it byte for byte: the rebuild held to the file before
   * anything is counted. `described` lists offsets within `expected` that are the generator's description. Returns
   * whether it was credited.
   */
  markRebuilt(at: number, expected: Uint8Array, who: Name, described: ReadonlySet<number> = new Set()): boolean {
    if (!this.holds(at, expected)) return false;
    this.mark(at, expected.length, who, (k) => described.has(k - at));
    return true;
  }

  /**
   * The counts, with what no generator rebuilt named by the first region in `regions` that holds it, a region's
   * bytes counted once whatever overlaps it, or reported unclaimed where none does.
   */
  tally(regions: readonly Claim[]): Attributed<Name> {
    const generated = Object.fromEntries(this.names.map((name) => [name, 0])) as Record<Name, number>;
    const described = Object.fromEntries(this.names.map((name) => [name, 0])) as Record<Name, number>;
    this.owners.forEach((tag, k) => {
      if (tag === 0) return;
      const name = this.names[tag - 1]!;
      generated[name] += 1;
      if (this.isDescribed[k] === 1) described[name] += 1;
    });
    const carried = new Map<string, number>();
    const seen = new Uint8Array(this.owners.length);
    for (const region of regions) {
      let count = 0;
      for (let k = region.start; k < region.start + region.length && k < seen.length; k += 1) {
        if (seen[k] === 1) continue;
        seen[k] = 1;
        if (this.owners[k] === 0) count += 1;
      }
      if (count > 0) carried.set(region.owner, (carried.get(region.owner) ?? 0) + count);
    }
    const unclaimed = this.owners.reduce((n, tag, k) => n + (tag === 0 && seen[k] === 0 ? 1 : 0), 0);
    return {
      owners: this.owners, generated, described, carried, unclaimed, contested: this.contested, contests: new Map(this.contests),
      total: this.owners.length,
    };
  }
}

/**
 * Which bytes of a generator's output its description reaches, found by asking the generator rather than by knowing
 * it: each number of the description changed in turn and the output written again, and a byte that differs is the
 * description's. A number is changed three ways, its bit 0, bit 8 and bit 16 flipped one at a time, so that every
 * byte of a number up to three bytes wide is reached: a list index is two bytes of an operand and a carrier period
 * three of a header, and flipping bit 0 alone would find only the lowest. A change the generator refuses, a group
 * pushed past a byte for one, or that changes the output's length, says nothing about bytes and is skipped, which can
 * only under count what is described.
 *
 * This is how the description is counted apart without each generator stating which of its bytes are numbers it was
 * handed, which would be a second statement of every shape beside the writer's own.
 */
export function describedByChange(write: (numbers: readonly number[]) => Uint8Array, numbers: readonly number[]): Set<number> {
  const base = write(numbers);
  const out = new Set<number>();
  numbers.forEach((value, i) => {
    for (const bit of [0x1, 0x100, 0x10000]) {
      let other: Uint8Array;
      try {
        other = write(numbers.map((one, k) => (k === i ? value ^ bit : one)));
      } catch {
        continue;
      }
      if (other.length !== base.length) continue;
      other.forEach((one, k) => { if (one !== base[k]) out.add(k); });
    }
  });
  return out;
}

/** The offsets at which two outputs of one length differ: what a change of description reached. */
export function differing(a: Uint8Array, b: Uint8Array): Set<number> {
  const out = new Set<number>();
  if (a.length !== b.length) return out;
  a.forEach((one, k) => { if (one !== b[k]) out.add(k); });
  return out;
}
