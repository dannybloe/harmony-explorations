/**
 * A raw deflate stream, RFC 1951, written the way stock zlib writes one at its default level, so that the metadata
 * archive a configuration carries can be built byte for byte, plan 011 step 4.
 *
 * **Why our own and not `node:zlib`.** Logitech's compiler deflates the archive as stock zlib 1.2.12 does at level 6,
 * memory level 8 and the default strategy: that setting reproduces the six distinct archives of the family's seven
 * named compiles,
 * `tests/harmony_300_350/test_harmony_350_metadata_deflate.py`. Node's zlib is a fork whose matcher differs, and it reproduces none of
 * three of those streams at any of 3465 settings, `noscreencensus.test.ts`. A stream that only inflates to the same
 * text would make the archive the one section of a built configuration that can never be compared with Logitech's
 * byte for byte, so the stream is written here, from the format and from what zlib is documented and observed to do.
 * No zlib source is copied or ported; MIT holds, and no dependency is added.
 *
 * **What has to be reproduced, and there are two halves.** Deflate fixes how a stream is decoded and nothing about
 * which stream an encoder chooses, so equality with another encoder means making its choices:
 *
 * 1. **Which matches.** A hash of the next three bytes, `((a << 10) ^ (b << 5) ^ c)` over fifteen bits, heads a chain
 *    of earlier positions with the same hash, newest first, and position 0 is never on a chain because the chain's
 *    empty value is 0. A search walks at most 128 links, a quarter of that once the match it has to beat is 8 bytes or
 *    more, stops at a match of 128, looks no further back than 32768 less 262 bytes, and only takes a candidate that is
 *    strictly longer than the best so far, which starts at the previous position's match. **Lazy evaluation**: a match
 *    found at one position is held, the next position is searched too unless the held match is already 16 or longer,
 *    and the held match is emitted only when the next one is no longer; otherwise the held position goes out as a
 *    literal. A match of exactly three bytes more than 4096 back is dropped. Every position a match covers is entered
 *    on the chains as it is passed. zlib's description of its algorithm, `algorithm.txt`, and its level table give
 *    the shape; the details that decide the bit, the dropped three byte match, the empty chain value of 0 and the tie
 *    breaks below, are calibrated rather than read, and `deflate.test.ts` records what each is worth.
 * 2. **Which codes.** A block ends after 16383 symbols, or at the end. Each block's Huffman codes are built from its
 *    counts by repeatedly joining the two least frequent nodes, where a tie goes to the node of smaller depth and then
 *    to whichever the heap holds first; a code longer than 15 bits (7 for the code length alphabet) is cut back by
 *    moving leaves down from the deepest level that has room. The code lengths are written with the run length codes
 *    16, 17 and 18 for runs of at least 3 or 4, the literal and distance tables each on their own, and the block is
 *    written stored, with the fixed codes or with its own, whichever costs fewest bits, a tie going to the fixed codes.
 *    **The tie breaks are the part no format document states**: they are what zlib does, calibrated against the six
 *    streams and against stock zlib on synthetic inputs, `deflate.test.ts`.
 *
 * **Limits, refused rather than guessed.** Only the default level is written, since it is the only one any archive
 * here was made with. An input of 65274 bytes or more is refused: past that zlib slides its window, which renumbers
 * every chain and changes which candidates a search sees, and no archive needs it (the longest
 * text in the lab is 30775 bytes).
 * Not checked: whether a version of zlib other than 1.2.12 writes the same streams.
 *
 * **And the reader**, at the end of this module: `inflateRaw` and `inflateZlib`, held to Node's
 * zlib by `inflate.test.ts`, so a PNG and a metadata archive are read where there is no Node.
 */

/** The window, and how far back a match may reach: the window less the lookahead zlib keeps, 32768 less 262. */
const WINDOW = 32768;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
const MAX_DISTANCE = WINDOW - MIN_LOOKAHEAD;
/** A three byte match this far back or further is not worth its distance code, and is dropped. */
const TOO_FAR = 4096;
/** Fifteen bits of hash: zlib's memory level 8 gives `8 + 7`, and the three bytes are shifted by five each. */
const HASH_BITS = 15;
const HASH_MASK = (1 << HASH_BITS) - 1;
/** The default level's four numbers: when a search is cut to a quarter, when laziness stops, a match long enough, a chain's length. */
const GOOD_LENGTH = 8;
const LAZY_LENGTH = 16;
const NICE_LENGTH = 128;
const CHAIN_LENGTH = 128;
/** A block ends after this many symbols: memory level 8's buffer of 16384, less one. */
const SYMBOLS_PER_BLOCK = (1 << (8 + 6)) - 1;
/** The largest input written without sliding the window, the point at which zlib would first slide it. */
export const DEFLATE_MAX_INPUT = WINDOW + MAX_DISTANCE - 1;

// ---------------------------------------------------------------------------------------------------------------
// The alphabets, RFC 1951 section 3.2.5

const END_OF_BLOCK = 256;
const LITERAL_CODES = 286;
const DISTANCE_CODES = 30;
const LENGTH_CODES = 285 - 257 + 1;
const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073,
  4097, 6145, 8193, 12289, 16385, 24577];
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
/** The code length alphabet's extra bits, codes 16, 17 and 18 only, and the order its lengths are written in. */
const CODE_LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
const CODE_LENGTH_CODES = 19;

/** The fixed codes' lengths, RFC 1951 section 3.2.6. */
const FIXED_LITERAL_LENGTHS = Array.from({ length: 288 }, (_, n) => (n < 144 ? 8 : n < 256 ? 9 : n < 280 ? 7 : 8));
const FIXED_DISTANCE_LENGTHS = Array.from({ length: DISTANCE_CODES }, () => 5);

/** The length code of a match length, 0 to 28; 258 takes code 285 of its own and not 284's last value. */
const LENGTH_CODE = new Uint8Array(MAX_MATCH + 1);
for (let code = 0; code < LENGTH_CODES; code += 1) {
  const top = code + 1 < LENGTH_CODES ? LENGTH_BASE[code + 1]! : MAX_MATCH + 1;
  for (let length = LENGTH_BASE[code]!; length < top && length <= MAX_MATCH; length += 1) LENGTH_CODE[length] = code;
}

/** The distance code of a distance, 0 to 29. */
function distanceCode(distance: number): number {
  let code = DISTANCE_CODES - 1;
  while (DISTANCE_BASE[code]! > distance) code -= 1;
  return code;
}

// ---------------------------------------------------------------------------------------------------------------
// Bits out, least significant first, which is the order RFC 1951 section 3.1.1 packs them in

class Bits {
  private readonly out: number[] = [];
  private buffer = 0;
  private count = 0;

  put(value: number, width: number): void {
    for (let bit = 0; bit < width; bit += 1) {
      this.buffer |= ((value >>> bit) & 1) << this.count;
      this.count += 1;
      if (this.count === 8) {
        this.out.push(this.buffer);
        this.buffer = 0;
        this.count = 0;
      }
    }
  }

  /** A Huffman code goes out most significant bit first, RFC 1951 section 3.1.1. */
  code(code: number, width: number): void {
    for (let bit = width - 1; bit >= 0; bit -= 1) this.put((code >>> bit) & 1, 1);
  }

  /** Pad to a byte boundary with zeros, as a stored block and the end of the stream need. */
  align(): void {
    if (this.count > 0) this.put(0, 8 - this.count);
  }

  byte(value: number): void {
    this.out.push(value & 0xff);
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Huffman codes from counts

/** Add `by` to one entry of a count table. */
function bump(table: Int32Array, at: number, by: number): void {
  table[at] = table[at]! + by;
}

interface Tree {
  /** Each symbol's code length, zero for a symbol not used. */
  readonly lengths: Int32Array;
  /** The highest symbol with a code, which bounds what is written of the table. */
  readonly maxCode: number;
  /** The block's cost in bits with these codes, extra bits included, and with the fixed codes where there are any. */
  readonly cost: number;
  readonly fixedCost: number;
}

/**
 * The code lengths for one alphabet's counts, limited to `maxLength` bits.
 *
 * The tree is built bottom up from a heap ordered by count and then by depth, the depth of a leaf being 0 and of a
 * joined node one more than the deeper of its two; the two nodes taken out are joined into a new one numbered after
 * every symbol, and the order nodes leave the heap is kept, since the length limit walks it back. Where fewer than
 * two symbols are used a code is still given to two, the missing one being symbol 0 or the lowest of 1 and 2 not
 * used, with a count of one that the costs do not count.
 */
function buildTree(counts: Int32Array, maxLength: number, extra: readonly number[], extraFrom: number,
  fixedLengths?: readonly number[]): Tree {
  const symbols = counts.length;
  const nodes = 2 * symbols + 1;
  const weight = new Int32Array(nodes);
  const depth = new Int32Array(nodes);
  const parent = new Int32Array(nodes);
  const length = new Int32Array(nodes);
  weight.set(counts);
  const heap = new Int32Array(nodes + 1);
  let heapLength = 0;
  let sortedFrom = nodes;
  let maxCode = -1;
  let cost = 0;
  let fixedCost = 0;
  for (let n = 0; n < symbols; n += 1) {
    if (weight[n] !== 0) {
      heapLength += 1;
      heap[heapLength] = n;
      maxCode = n;
    }
  }
  while (heapLength < 2) {
    const node = maxCode < 2 ? (maxCode += 1) : 0;
    heapLength += 1;
    heap[heapLength] = node;
    weight[node] = 1;
    // The forced code's one count is not in the block, so its cost is taken back out.
    cost -= 1;
    if (fixedLengths !== undefined) fixedCost -= fixedLengths[node]!;
  }
  const lighter = (a: number, b: number): boolean =>
    weight[a]! < weight[b]! || (weight[a] === weight[b] && depth[a]! <= depth[b]!);
  const sink = (from: number): void => {
    const node = heap[from]!;
    let at = from;
    let child = at * 2;
    while (child <= heapLength) {
      if (child < heapLength && lighter(heap[child + 1]!, heap[child]!)) child += 1;
      if (lighter(node, heap[child]!)) break;
      heap[at] = heap[child]!;
      at = child;
      child *= 2;
    }
    heap[at] = node;
  };
  for (let at = heapLength >> 1; at >= 1; at -= 1) sink(at);
  let next = symbols;
  do {
    const first = heap[1]!;
    heap[1] = heap[heapLength]!;
    heapLength -= 1;
    sink(1);
    const second = heap[1]!;
    sortedFrom -= 1;
    heap[sortedFrom] = first;
    sortedFrom -= 1;
    heap[sortedFrom] = second;
    weight[next] = weight[first]! + weight[second]!;
    depth[next] = Math.max(depth[first]!, depth[second]!) + 1;
    parent[first] = next;
    parent[second] = next;
    heap[1] = next;
    next += 1;
    sink(1);
  } while (heapLength >= 2);
  sortedFrom -= 1;
  heap[sortedFrom] = heap[1]!;

  // Lengths from the root down, the sorted order putting every parent before its children. A node deeper than the
  // limit is put at the limit and counted, internal nodes included, which is how much the levels have to be mended.
  const perLength = new Int32Array(maxLength + 1);
  let over = 0;
  length[heap[sortedFrom]!] = 0;
  for (let at = sortedFrom + 1; at < nodes; at += 1) {
    const node = heap[at]!;
    let bits = length[parent[node]!]! + 1;
    if (bits > maxLength) {
      bits = maxLength;
      over += 1;
    }
    length[node] = bits;
    if (node > maxCode) continue;
    bump(perLength, bits, 1);
    const extraBits = node >= extraFrom ? extra[node - extraFrom]! : 0;
    cost += weight[node]! * (bits + extraBits);
    if (fixedLengths !== undefined) fixedCost += weight[node]! * (fixedLengths[node]! + extraBits);
  }
  if (over > 0) {
    // Each pass takes a leaf from the deepest level below the limit that has one and puts it and an overflowing leaf
    // one level down as a pair, which keeps the code complete; then the lengths are dealt out again, longest first,
    // to the leaves in the order they left the heap, lightest first.
    do {
      let bits = maxLength - 1;
      while (perLength[bits] === 0) bits -= 1;
      bump(perLength, bits, -1);
      bump(perLength, bits + 1, 2);
      bump(perLength, maxLength, -1);
      over -= 2;
    } while (over > 0);
    let at = nodes;
    for (let bits = maxLength; bits !== 0; bits -= 1) {
      let left = perLength[bits]!;
      while (left !== 0) {
        at -= 1;
        const node = heap[at]!;
        if (node > maxCode) continue;
        if (length[node] !== bits) {
          cost += (bits - length[node]!) * weight[node]!;
          length[node] = bits;
        }
        left -= 1;
      }
    }
  }
  const lengths = new Int32Array(symbols);
  for (let n = 0; n <= maxCode; n += 1) lengths[n] = length[n]!;
  return { lengths, maxCode, cost, fixedCost };
}

/** The canonical codes for a set of lengths, RFC 1951 section 3.2.2. */
function canonicalCodes(lengths: ArrayLike<number>): Int32Array {
  const perLength = new Int32Array(16);
  for (let n = 0; n < lengths.length; n += 1) bump(perLength, lengths[n]!, 1);
  perLength[0] = 0;
  const next = new Int32Array(16);
  let code = 0;
  for (let bits = 1; bits < 16; bits += 1) {
    code = (code + perLength[bits - 1]!) << 1;
    next[bits] = code;
  }
  const codes = new Int32Array(lengths.length);
  for (let n = 0; n < lengths.length; n += 1) {
    const bits = lengths[n]!;
    if (bits !== 0) {
      codes[n] = next[bits]!;
      bump(next, bits, 1);
    }
  }
  return codes;
}

/**
 * A table of code lengths as the code length alphabet writes it, RFC 1951 section 3.2.7: each run either as single
 * lengths, as one length and then code 16 for 3 to 6 repeats of it, or as code 17 or 18 for 3 to 10 or 11 to 138
 * zeros. A run is cut at 138 zeros, at 6 repeats after a length already written, and at 7 otherwise, and a run shorter
 * than 3 (or than 4, where the length before it differs and is not zero) goes out as single lengths.
 */
function lengthRuns(lengths: Int32Array, maxCode: number, emit: (symbol: number, extraValue: number) => void): void {
  let previous = -1;
  let following = lengths[0]!;
  let count = 0;
  let maxCount = following === 0 ? 138 : 7;
  let minCount = following === 0 ? 3 : 4;
  for (let n = 0; n <= maxCode; n += 1) {
    const current = following;
    // Past the last code a length no code has, so the final run always ends.
    following = n + 1 <= maxCode ? lengths[n + 1]! : -1;
    count += 1;
    if (count < maxCount && current === following) continue;
    if (count < minCount) {
      for (let k = 0; k < count; k += 1) emit(current, 0);
    } else if (current !== 0) {
      if (current !== previous) {
        emit(current, 0);
        count -= 1;
      }
      emit(16, count - 3);
    } else if (count <= 10) {
      emit(17, count - 3);
    } else {
      emit(18, count - 11);
    }
    count = 0;
    previous = current;
    if (following === 0) {
      maxCount = 138;
      minCount = 3;
    } else if (current === following) {
      maxCount = 6;
      minCount = 3;
    } else {
      maxCount = 7;
      minCount = 4;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Blocks

/** One block's symbols: a literal is a distance of 0, a match its length and distance. */
interface Symbols {
  readonly literalOrLength: Int32Array;
  readonly distance: Int32Array;
  count: number;
}

function writeBlock(out: Bits, block: Symbols, input: Uint8Array, start: number, end: number, last: boolean): void {
  const literalCounts = new Int32Array(LITERAL_CODES);
  const distanceCounts = new Int32Array(DISTANCE_CODES);
  for (let k = 0; k < block.count; k += 1) {
    const distance = block.distance[k]!;
    if (distance === 0) {
      bump(literalCounts, block.literalOrLength[k]!, 1);
    } else {
      bump(literalCounts, 257 + LENGTH_CODE[block.literalOrLength[k]!]!, 1);
      bump(distanceCounts, distanceCode(distance), 1);
    }
  }
  literalCounts[END_OF_BLOCK] = 1;
  const literals = buildTree(literalCounts, 15, LENGTH_EXTRA, 257, FIXED_LITERAL_LENGTHS);
  const distances = buildTree(distanceCounts, 15, DISTANCE_EXTRA, 0, FIXED_DISTANCE_LENGTHS);
  const codeLengthCounts = new Int32Array(CODE_LENGTH_CODES);
  const count = (symbol: number): void => bump(codeLengthCounts, symbol, 1);
  lengthRuns(literals.lengths, literals.maxCode, count);
  lengthRuns(distances.lengths, distances.maxCode, count);
  const codeLengths = buildTree(codeLengthCounts, 7, CODE_LENGTH_EXTRA, 0);
  let lastCodeLength = CODE_LENGTH_CODES - 1;
  while (lastCodeLength >= 3 && codeLengths.lengths[CODE_LENGTH_ORDER[lastCodeLength]!] === 0) lastCodeLength -= 1;
  const ownCost = literals.cost + distances.cost + codeLengths.cost + 3 * (lastCodeLength + 1) + 5 + 5 + 4;
  const fixedCost = literals.fixedCost + distances.fixedCost;
  // In whole bytes, the three bit block header and up to seven of padding counted, a tie going to the fixed codes.
  let bestBytes = (ownCost + 3 + 7) >> 3;
  const fixedBytes = (fixedCost + 3 + 7) >> 3;
  if (fixedBytes <= bestBytes) bestBytes = fixedBytes;
  const storedLength = end - start;
  const final = last ? 1 : 0;
  if (storedLength + 4 <= bestBytes) {
    out.put(final, 1);
    out.put(0, 2);
    out.align();
    out.byte(storedLength);
    out.byte(storedLength >> 8);
    out.byte(~storedLength);
    out.byte(~storedLength >> 8);
    for (let at = start; at < end; at += 1) out.byte(input[at]!);
    return;
  }
  let literalLengths: ArrayLike<number>;
  let distanceLengths: ArrayLike<number>;
  out.put(final, 1);
  if (fixedBytes === bestBytes) {
    out.put(1, 2);
    literalLengths = FIXED_LITERAL_LENGTHS;
    distanceLengths = FIXED_DISTANCE_LENGTHS;
  } else {
    out.put(2, 2);
    out.put(literals.maxCode + 1 - 257, 5);
    out.put(distances.maxCode + 1 - 1, 5);
    out.put(lastCodeLength + 1 - 4, 4);
    for (let rank = 0; rank <= lastCodeLength; rank += 1) out.put(codeLengths.lengths[CODE_LENGTH_ORDER[rank]!]!, 3);
    const lengthCodes = canonicalCodes(codeLengths.lengths);
    const write = (symbol: number, extraValue: number): void => {
      out.code(lengthCodes[symbol]!, codeLengths.lengths[symbol]!);
      if (symbol >= 16) out.put(extraValue, CODE_LENGTH_EXTRA[symbol]!);
    };
    lengthRuns(literals.lengths, literals.maxCode, write);
    lengthRuns(distances.lengths, distances.maxCode, write);
    literalLengths = literals.lengths;
    distanceLengths = distances.lengths;
  }
  const literalCodes = canonicalCodes(literalLengths);
  const distanceCodes = canonicalCodes(distanceLengths);
  for (let k = 0; k < block.count; k += 1) {
    const distance = block.distance[k]!;
    const value = block.literalOrLength[k]!;
    if (distance === 0) {
      out.code(literalCodes[value]!, literalLengths[value]!);
      continue;
    }
    const lengthCode = LENGTH_CODE[value]!;
    out.code(literalCodes[257 + lengthCode]!, literalLengths[257 + lengthCode]!);
    out.put(value - LENGTH_BASE[lengthCode]!, LENGTH_EXTRA[lengthCode]!);
    const code = distanceCode(distance);
    out.code(distanceCodes[code]!, distanceLengths[code]!);
    out.put(distance - DISTANCE_BASE[code]!, DISTANCE_EXTRA[code]!);
  }
  out.code(literalCodes[END_OF_BLOCK]!, literalLengths[END_OF_BLOCK]!);
}

// ---------------------------------------------------------------------------------------------------------------
// The matcher

/**
 * `input` deflated as one raw stream, no zlib header and no checksum, which is what a ZIP entry holds: the stream
 * stock zlib 1.2.12 writes at level 6, memory level 8, window 15 and the default strategy, for every input this was
 * calibrated on. Refuses an input of more than `DEFLATE_MAX_INPUT` bytes, the module header says why.
 */
export function deflateRaw(input: Uint8Array): Uint8Array {
  const size = input.length;
  if (size > DEFLATE_MAX_INPUT) {
    throw new RangeError(`deflateRaw writes at most ${DEFLATE_MAX_INPUT} bytes, the size below which zlib never slides its window; this is ${size}`);
  }
  // The bytes past the end read as zeros, so a comparison may run over the end and is then cut to what is there.
  const data = new Uint8Array(size + MAX_MATCH + MIN_MATCH);
  data.set(input);
  const head = new Int32Array(1 << HASH_BITS);
  const previous = new Int32Array(WINDOW);
  const hashAt = (at: number): number => ((data[at]! << 10) ^ (data[at + 1]! << 5) ^ data[at + 2]!) & HASH_MASK;
  /** Enter `at` on its chain and answer the chain's head before it, 0 for none. */
  const insert = (at: number): number => {
    const hash = hashAt(at);
    const before = head[hash]!;
    previous[at & (WINDOW - 1)] = before;
    head[hash] = at;
    return before;
  };

  let matchStart = 0;
  /** The longest match at `at` along the chain from `candidate`, strictly longer than `beat`, or `beat`. */
  const longest = (at: number, candidate: number, beat: number, remaining: number): number => {
    let chain = beat >= GOOD_LENGTH ? CHAIN_LENGTH >> 2 : CHAIN_LENGTH;
    const nice = Math.min(NICE_LENGTH, remaining);
    const limit = at > MAX_DISTANCE ? at - MAX_DISTANCE : 0;
    let best = beat;
    let from = candidate;
    do {
      // The cheap rejections first, on the two bytes that would make the match longer than the best and the two it
      // starts with; they decide nothing the full comparison would not, so they are only a speed.
      if (data[from + best] === data[at + best] && data[from + best - 1] === data[at + best - 1]
        && data[from] === data[at] && data[from + 1] === data[at + 1]) {
        let length = 2;
        while (length < MAX_MATCH && data[from + length] === data[at + length]) length += 1;
        if (length > best) {
          matchStart = from;
          best = length;
          if (length >= nice) break;
        }
      }
      from = previous[from & (WINDOW - 1)]!;
      chain -= 1;
    } while (from > limit && chain !== 0);
    return best <= remaining ? best : remaining;
  };

  const out = new Bits();
  const block: Symbols = {
    literalOrLength: new Int32Array(SYMBOLS_PER_BLOCK),
    distance: new Int32Array(SYMBOLS_PER_BLOCK),
    count: 0,
  };
  let blockStart = 0;
  /** One symbol into the block, answering whether the block is full. */
  const tally = (value: number, distance: number): boolean => {
    block.literalOrLength[block.count] = value;
    block.distance[block.count] = distance;
    block.count += 1;
    return block.count === SYMBOLS_PER_BLOCK;
  };
  const flush = (end: number, last: boolean): void => {
    writeBlock(out, block, input, blockStart, end, last);
    block.count = 0;
    blockStart = end;
  };

  let at = 0;
  let matchLength = MIN_MATCH - 1;
  let held = false;
  while (at < size) {
    const remaining = size - at;
    const candidate = remaining >= MIN_MATCH ? insert(at) : 0;
    const previousLength = matchLength;
    const previousStart = matchStart;
    matchLength = MIN_MATCH - 1;
    if (candidate !== 0 && previousLength < LAZY_LENGTH && at - candidate <= MAX_DISTANCE) {
      matchLength = longest(at, candidate, previousLength, remaining);
      if (matchLength === MIN_MATCH && at - matchStart > TOO_FAR) matchLength = MIN_MATCH - 1;
    }
    if (previousLength >= MIN_MATCH && matchLength <= previousLength) {
      // The held match wins: it starts one back, and every position it covers past this one goes on the chains.
      const lastInsert = size - MIN_MATCH;
      const full = tally(previousLength, at - 1 - previousStart);
      for (let skip = previousLength - 2; skip > 0; skip -= 1) {
        at += 1;
        if (at <= lastInsert) insert(at);
      }
      at += 1;
      held = false;
      matchLength = MIN_MATCH - 1;
      if (full) flush(at, false);
    } else if (held) {
      // The held position goes out as a literal and this one is held in its place.
      if (tally(data[at - 1]!, 0)) flush(at, false);
      at += 1;
    } else {
      held = true;
      at += 1;
    }
  }
  if (held) tally(data[at - 1]!, 0);
  flush(at, true);
  out.align();
  return out.bytes();
}

// ---------------------------------------------------------------------------------------------------------------
// And the stream read back, RFC 1951 for a raw stream and RFC 1950 for its zlib wrapping

/*
 * **Why the reader is here too.** A PNG's image data and a metadata archive's entry were
 * inflated by Node's zlib, which kept the codec's core from loading where there is no Node. Inflating, unlike
 * deflating, has one answer for every stream, so our own reader can be held to Node's exactly: it is, on every PNG and
 * every metadata archive the tests and the lab hold and on streams damaged at random, `inflate.test.ts`. It sits beside
 * the writer because it reads the same tables, a field's decoder beside its encoder.
 *
 * **What it refuses is what zlib refuses**, so a reader that tries a candidate offset and takes a refusal as "not here",
 * as `metadata.ts` does on a Harmony 890's container, finds the same answer it did: a block type of 3; a stored block
 * whose length and complement disagree; more than 286 literal and length codes or 30 distance codes; a code length code
 * that is not complete; a repeat with nothing before it or past the last length; no end of block code; a literal and
 * length or a distance code that is over-subscribed, or incomplete other than by being one code of one bit; a code no
 * table holds, length codes 286 and 287 and distance codes 30 and 31 among them; a distance reaching back before the
 * start; and a stream that ends early. Bytes after the end of the stream are not read, as zlib does not read them. The
 * decoding is the plain one, a code's bits one at a time against the count of each length, which is slower than
 * zlib's tables and fast enough for a logo and a few kilobytes of text.
 */

/** A stream that does not inflate, with what is wrong with it. */
export class InflateError extends RangeError {}

/** The longest code deflate allows. */
const MAX_CODE_BITS = 15;

/** A canonical Huffman code for decoding: how many codes of each length, and the symbols in the order of their codes. */
interface Decoding {
  readonly counts: Uint16Array;
  readonly symbols: Uint16Array;
}

/**
 * The code `lengths` give the first `n` symbols, and how far it is from complete: below zero over-subscribed, above
 * zero incomplete, zero complete or empty.
 */
function decoding(lengths: ArrayLike<number>, n: number): { readonly code: Decoding; readonly left: number } {
  const counts = new Uint16Array(MAX_CODE_BITS + 1);
  for (let symbol = 0; symbol < n; symbol += 1) counts[lengths[symbol]!]! += 1;
  const symbols = new Uint16Array(n);
  if (counts[0] === n) return { code: { counts, symbols }, left: 0 };
  let left = 1;
  for (let length = 1; length <= MAX_CODE_BITS; length += 1) {
    left = left * 2 - counts[length]!;
    if (left < 0) return { code: { counts, symbols }, left };
  }
  const next = new Uint16Array(MAX_CODE_BITS + 2);
  for (let length = 1; length <= MAX_CODE_BITS; length += 1) next[length + 1] = next[length]! + counts[length]!;
  for (let symbol = 0; symbol < n; symbol += 1) {
    const length = lengths[symbol]!;
    if (length !== 0) symbols[next[length]!++] = symbol;
  }
  return { code: { counts, symbols }, left };
}

/** Whether a code is one an inflater may use: complete, or empty, or a single code of one bit. */
function usable(read: { readonly code: Decoding; readonly left: number }, n: number): boolean {
  return read.left === 0 || (read.left > 0 && n === read.code.counts[0]! + read.code.counts[1]!);
}

/** Bits in, least significant first, the order `Bits` above packs them in. */
class BitsIn {
  /** The next byte not yet taken into `buffer`. */
  at: number;
  private readonly data: Uint8Array;
  private buffer = 0;
  private count = 0;

  constructor(data: Uint8Array, at: number) {
    this.data = data;
    this.at = at;
  }

  bits(width: number): number {
    let value = this.buffer;
    while (this.count < width) {
      if (this.at >= this.data.length) throw new InflateError('the stream ends early');
      value |= this.data[this.at]! << this.count;
      this.at += 1;
      this.count += 8;
    }
    this.buffer = value >>> width;
    this.count -= width;
    return value & ((1 << width) - 1);
  }

  /** One symbol of `code`, its bits most significant first, RFC 1951 section 3.1.1. */
  decode(code: Decoding): number {
    let bits = 0;
    let first = 0;
    let index = 0;
    for (let length = 1; length <= MAX_CODE_BITS; length += 1) {
      bits |= this.bits(1);
      const count = code.counts[length]!;
      if (bits - first < count) return code.symbols[index + bits - first]!;
      index += count;
      first = (first + count) << 1;
      bits <<= 1;
    }
    throw new InflateError('a code no table holds');
  }

  /** Drop the rest of the byte being read, as a stored block and the end of a stream do. */
  align(): void {
    this.buffer = 0;
    this.count = 0;
  }
}

/** The output, grown as it fills. */
class BytesOut {
  bytes = new Uint8Array(1 << 16);
  length = 0;

  room(more: number): void {
    if (this.length + more <= this.bytes.length) return;
    let size = this.bytes.length * 2;
    while (size < this.length + more) size *= 2;
    const grown = new Uint8Array(size);
    grown.set(this.bytes.subarray(0, this.length));
    this.bytes = grown;
  }
}

const FIXED_LITERALS = decoding(FIXED_LITERAL_LENGTHS, FIXED_LITERAL_LENGTHS.length).code;
const FIXED_DISTANCES = decoding(FIXED_DISTANCE_LENGTHS, FIXED_DISTANCE_LENGTHS.length).code;

/** The block headers of a dynamic block, read into its two codes. */
function dynamicCodes(input: BitsIn): { readonly literals: Decoding; readonly distances: Decoding } {
  const literalCount = input.bits(5) + 257;
  const distanceCount = input.bits(5) + 1;
  const codeLengthCount = input.bits(4) + 4;
  if (literalCount > LITERAL_CODES || distanceCount > DISTANCE_CODES) throw new InflateError('too many literal and length or distance codes');
  const codeLengths = new Uint8Array(CODE_LENGTH_CODES);
  for (let index = 0; index < codeLengthCount; index += 1) codeLengths[CODE_LENGTH_ORDER[index]!] = input.bits(3);
  const lengthCode = decoding(codeLengths, CODE_LENGTH_CODES);
  if (lengthCode.left !== 0) throw new InflateError('the code length code is not complete');
  const lengths = new Uint8Array(literalCount + distanceCount);
  let index = 0;
  while (index < lengths.length) {
    const symbol = input.decode(lengthCode.code);
    if (symbol < 16) {
      lengths[index] = symbol;
      index += 1;
      continue;
    }
    let value = 0;
    let repeat: number;
    if (symbol === 16) {
      if (index === 0) throw new InflateError('a repeat with no length before it');
      value = lengths[index - 1]!;
      repeat = 3 + input.bits(2);
    } else if (symbol === 17) {
      repeat = 3 + input.bits(3);
    } else {
      repeat = 11 + input.bits(7);
    }
    if (index + repeat > lengths.length) throw new InflateError('a repeat past the last length');
    lengths.fill(value, index, index + repeat);
    index += repeat;
  }
  if (lengths[END_OF_BLOCK] === 0) throw new InflateError('no end of block code');
  const literals = decoding(lengths.subarray(0, literalCount), literalCount);
  if (!usable(literals, literalCount)) throw new InflateError('the literal and length code is over-subscribed or incomplete');
  const distances = decoding(lengths.subarray(literalCount), distanceCount);
  if (!usable(distances, distanceCount)) throw new InflateError('the distance code is over-subscribed or incomplete');
  return { literals: literals.code, distances: distances.code };
}

/** The raw stream starting at `at`, inflated, and the byte after its last block. */
function inflateFrom(stream: Uint8Array, at: number): { readonly out: Uint8Array; readonly end: number } {
  const input = new BitsIn(stream, at);
  const out = new BytesOut();
  let last = 0;
  do {
    last = input.bits(1);
    const type = input.bits(2);
    if (type === 0) {
      input.align();
      if (input.at + 4 > stream.length) throw new InflateError('the stream ends early');
      const length = stream[input.at]! | (stream[input.at + 1]! << 8);
      const complement = stream[input.at + 2]! | (stream[input.at + 3]! << 8);
      if (length !== (~complement & 0xffff)) throw new InflateError('a stored block whose length and its complement disagree');
      input.at += 4;
      if (input.at + length > stream.length) throw new InflateError('the stream ends early');
      out.room(length);
      out.bytes.set(stream.subarray(input.at, input.at + length), out.length);
      out.length += length;
      input.at += length;
      continue;
    }
    if (type === 3) throw new InflateError('block type 3, which deflate does not define');
    const { literals, distances } = type === 1 ? { literals: FIXED_LITERALS, distances: FIXED_DISTANCES } : dynamicCodes(input);
    for (;;) {
      const symbol = input.decode(literals);
      if (symbol < END_OF_BLOCK) {
        out.room(1);
        out.bytes[out.length] = symbol;
        out.length += 1;
        continue;
      }
      if (symbol === END_OF_BLOCK) break;
      const code = symbol - 257;
      if (code >= LENGTH_CODES) throw new InflateError(`length code ${symbol}, which deflate does not define`);
      const length = LENGTH_BASE[code]! + input.bits(LENGTH_EXTRA[code]!);
      const distanceSymbol = input.decode(distances);
      if (distanceSymbol >= DISTANCE_CODES) throw new InflateError(`distance code ${distanceSymbol}, which deflate does not define`);
      const distance = DISTANCE_BASE[distanceSymbol]! + input.bits(DISTANCE_EXTRA[distanceSymbol]!);
      if (distance > out.length) throw new InflateError('a distance reaching back before the start');
      out.room(length);
      for (let copied = 0; copied < length; copied += 1) {
        out.bytes[out.length] = out.bytes[out.length - distance]!;
        out.length += 1;
      }
    }
  } while (last === 0);
  input.align();
  return { out: out.bytes.slice(0, out.length), end: input.at };
}

/** A raw deflate stream inflated, what a ZIP entry holds, as Node's `inflateRawSync` inflates it. */
export function inflateRaw(stream: Uint8Array): Uint8Array {
  return inflateFrom(stream, 0).out;
}

/** Adler-32, RFC 1950 section 8, the check a zlib stream ends with. */
export function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let at = 0; at < bytes.length;) {
    // 5552 bytes is the most that can be summed before `b` must be reduced, zlib's NMAX; a double holds far more,
    // so this only keeps the arithmetic in the range the reduction was written for.
    const end = Math.min(at + 5552, bytes.length);
    for (; at < end; at += 1) {
      a += bytes[at]!;
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * A zlib stream, RFC 1950, inflated, what a PNG's image data is, as Node's `inflateSync` inflates it: the header
 * checked, its window at most 32 KiB and no preset dictionary, and the Adler-32 at the end compared.
 */
export function inflateZlib(stream: Uint8Array): Uint8Array {
  if (stream.length < 2) throw new InflateError('the stream ends early');
  const method = stream[0]!;
  const flags = stream[1]!;
  if (((method << 8) | flags) % 31 !== 0) throw new InflateError('a zlib header whose check is wrong');
  if ((method & 0x0f) !== 8) throw new InflateError('a zlib header naming a method other than deflate');
  if (method >> 4 > 7) throw new InflateError('a zlib header with a window over 32 KiB');
  if ((flags & 0x20) !== 0) throw new InflateError('a zlib header asking for a preset dictionary');
  const { out, end } = inflateFrom(stream, 2);
  if (end + 4 > stream.length) throw new InflateError('the stream ends early');
  const stated = ((stream[end]! << 24) | (stream[end + 1]! << 16) | (stream[end + 2]! << 8) | stream[end + 3]!) >>> 0;
  if (stated !== adler32(out)) throw new InflateError('the Adler-32 at the end is wrong');
  return out;
}
