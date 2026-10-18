/**
 * Taking modes out of a configuration, and pages out of a mode: base slot 6's other direction from `appendMode`,
 * `todo-compile-one.md` 4.10, findings section 421. Generic: it reads and rewrites the container's own structures,
 * the mode table, the entries, the tagged lists, their second copies, the screen programs and the pictures they
 * draw, and names no remote.
 *
 * **Why a mode cannot simply be left unreached.** A mode's number is its place in base slot 6's table, and every
 * place that enters one names that number: an `0x7E` wherever an instruction can be, `instructionSites`' holders,
 * and the event map, which maps the firmware's status codes to modes. So taking a mode out renumbers every mode
 * above it, as dropping a list renumbers base slot 10 (`dropLists`), and a site left at its old number enters the
 * wrong screen with every check passing.
 *
 * **What goes with a mode**: its table entry, its entry (`6 + 3 * pages` bytes), its own tagged list, each page's
 * record, list and second copy (section 69, the k-th copy in the pools being the k-th page's, so a copy left
 * behind pairs every later page with the wrong copy), and every screen program its pages reach that nothing kept
 * reaches. A picture those programs alone drew goes too. Lists are not dropped here: a list the mode alone ran
 * is left in base slot 10, reached by nothing, for the caller to drop with `dropLists`, since that renumbering
 * has a floor and checks of its own.
 *
 * **What is refused** rather than written: a place outside the dropped modes that still enters one, unless it sits
 * in a list nothing kept reaches (the caller drops it, and `stale` names it); the event map naming one; mode 0,
 * which is the key table; a reference from a kept piece into anything taken out, a text drawn by reference into a
 * dropped program among them; and a cut that would split an address field.
 *
 * **Scope, decision 16**: measured on the Harmony One alone, on the sixteen English compiles of skin 54, whose
 * welcome tour and Remote Assistant the touch family's `withouttour.ts` takes out with it; nothing here is a fact of
 * that remote, and on the Harmony 600, 650 and 700 it has not been run. A caller draws its texts away from what goes
 * first, since a kept text drawn by reference into a dropped program is refused here.
 */
import { type Container, parse } from '../gspm.ts';
import { type ContainerLayout, type ContainerPiece, type PieceRef, layOutContainer, takeApart } from '../frame.ts';
import { type InstructionSite, instructionSites, listCallSites, namedLists } from '../assemble.ts';
import { eventMap, modePages, modeProgramRoots, modeRecords, modeTable, pageListCopies, taggedListExtent } from '../sections.ts';
import { reachablePrograms, screenProgramRoots } from '../screen.ts';
import { ComposeError } from './core.ts';

/** Opcode `0x7E`, entering a mode by number, `inventory.ts`' `ENTER_MODE`, named here to keep this module's imports small. */
const ENTER = 0x7e;

/** A run of bytes taken out, as blob offsets, half open. */
export interface Cut { from: number; to: number }

/** A layout with runs of bytes taken out, and where a byte of the input landed. */
export interface CutLayout {
  layout: ContainerLayout;
  /** The piece and offset an input blob offset landed at, undefined where it was cut. */
  at: (blobOffset: number) => { piece: ContainerPiece; offset: number } | undefined;
  /** Pictures dropped because only cut programs drew them. */
  pictures: number;
}

/**
 * The configuration taken apart with every byte of `cuts` taken out of the pieces holding it: a piece cut whole is
 * dropped, a piece cut in part keeps the rest, and every address field moves with what it names. A picture that
 * something named before and nothing names after is dropped too. Refused: a cut through an address field, a kept
 * reference naming a cut byte, the key table cut.
 */
export function withoutRanges(c: Container, cuts: readonly Cut[]): CutLayout {
  const layout = takeApart(c);
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== c.blob.length) throw new ComposeError('the configuration does not take apart into itself');
  const merged = [...cuts].filter((one) => one.to > one.from).sort((a, b) => a.from - b.from)
    .reduce<Cut[]>((out, one) => {
      const last = out[out.length - 1];
      if (last !== undefined && one.from <= last.to) last.to = Math.max(last.to, one.to);
      else out.push({ ...one });
      return out;
    }, []);
  const inserted = Object.values(layout.inserted ?? {});
  const all = [layout.keyTable, ...layout.body, ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])),
    ...inserted.flatMap((s) => [...s.before, ...s.head]), ...layout.pictures];
  const offsetOf = new Map(all.map((piece) => [piece, laid.offsetOf(piece) as number]));

  // Per piece, its cuts in its own offsets.
  const local = new Map<ContainerPiece, Cut[]>();
  for (const piece of all) {
    const from = offsetOf.get(piece) as number;
    const to = from + piece.bytes.length;
    const mine = merged.filter((one) => one.from < to && one.to > from)
      .map((one) => ({ from: Math.max(one.from, from) - from, to: Math.min(one.to, to) - from }));
    if (mine.length > 0) local.set(piece, mine);
  }
  if (local.has(layout.keyTable)) throw new ComposeError('a cut reaches the key table, mode 0\'s record');
  const whole = (piece: ContainerPiece): boolean => {
    const mine = local.get(piece);
    return mine !== undefined && mine.length === 1 && mine[0]!.from === 0 && mine[0]!.to === piece.bytes.length;
  };
  /** An offset in a piece after its cuts, or undefined where it is cut. */
  const map = (piece: ContainerPiece, offset: number): number | undefined => {
    let shift = 0;
    for (const one of local.get(piece) ?? []) {
      if (offset >= one.to) shift += one.to - one.from;
      else if (offset >= one.from) return undefined;
    }
    return offset - shift;
  };
  const cutField = (piece: ContainerPiece, at: number): 'none' | 'all' | 'part' => {
    const inside = [0, 1, 2].filter((k) => map(piece, at + k) === undefined).length;
    return inside === 0 ? 'none' : inside === 3 ? 'all' : 'part';
  };

  // Every piece made again, its bytes less its cuts and its own address fields moved.
  const fresh = new Map<ContainerPiece, ContainerPiece>();
  for (const piece of all) {
    if (whole(piece)) continue;
    const mine = local.get(piece) ?? [];
    let bytes = piece.bytes;
    if (mine.length > 0) {
      const kept: number[] = [];
      for (let k = 0; k < piece.bytes.length; k += 1) if (map(piece, k) !== undefined) kept.push(piece.bytes[k] as number);
      bytes = Uint8Array.from(kept);
    }
    fresh.set(piece, { ...piece, bytes, refs: [] });
  }
  // Pictures named before and by nothing kept after go too.
  const namedBefore = new Set<ContainerPiece>();
  const namedAfter = new Set<ContainerPiece>();
  for (const piece of all) {
    for (const ref of piece.refs) {
      if (!('to' in ref)) continue;
      namedBefore.add(ref.to);
      if (fresh.has(piece) && cutField(piece, ref.at) === 'none') namedAfter.add(ref.to);
    }
  }
  let pictures = 0;
  for (const piece of layout.pictures) {
    if (fresh.has(piece) && namedBefore.has(piece) && !namedAfter.has(piece)) {
      fresh.delete(piece);
      pictures += 1;
    }
  }
  for (const [old, made] of fresh) {
    made.refs = old.refs.flatMap((ref): PieceRef[] => {
      const field = cutField(old, ref.at);
      if (field === 'part') throw new ComposeError(`a cut splits an address field ${ref.at} bytes into a ${old.owner ?? 'piece'}`);
      if (field === 'all') return [];
      const at = map(old, ref.at) as number;
      if (!('to' in ref)) return [{ ...ref, at }];
      const target = fresh.get(ref.to);
      const offset = target === undefined ? undefined : map(ref.to, ref.offset);
      if (target === undefined || offset === undefined) {
        throw new ComposeError(`a ${old.owner ?? 'piece'} that stays names a ${ref.to.owner ?? 'piece'} being taken out`);
      }
      return [{ at, to: target, offset }];
    });
  }
  const keep = (run: readonly ContainerPiece[]): ContainerPiece[] =>
    run.flatMap((piece) => (fresh.has(piece) ? [fresh.get(piece) as ContainerPiece] : []));
  const placement = (s: { before: ContainerPiece[]; head: ContainerPiece[] }): { before: ContainerPiece[]; head: ContainerPiece[] } => {
    const head = keep(s.head);
    if (head.length !== s.head.length) throw new ComposeError('a cut takes a section\'s table out whole');
    return { before: keep(s.before), head };
  };
  const result: ContainerLayout = {
    ...layout,
    keyTable: fresh.get(layout.keyTable) as ContainerPiece,
    body: keep(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : placement(s))),
    ...(layout.inserted === undefined ? {} : {
      inserted: Object.fromEntries(Object.entries(layout.inserted).map(([raw, s]) => [raw, placement(s)])),
    }),
    pictures: keep(layout.pictures),
  };
  const starts = all.map((piece) => ({ piece, from: offsetOf.get(piece) as number })).sort((a, b) => a.from - b.from);
  const at = (blobOffset: number): { piece: ContainerPiece; offset: number } | undefined => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] as (typeof starts)[number]).from <= blobOffset) low = mid;
      else high = mid - 1;
    }
    const found = starts[low] as (typeof starts)[number];
    const piece = fresh.get(found.piece);
    const offset = piece === undefined ? undefined : map(found.piece, blobOffset - found.from);
    return piece === undefined || offset === undefined ? undefined : { piece, offset };
  };
  return { layout: result, at, pictures };
}

// ---------------------------------------------------------------------------------------------------------
// What a mode holds.

/** The runs a set of modes, or a mode's last pages, hold, and the program instructions in them. */
interface ModeParts {
  cuts: Cut[];
  /** Blob offsets of every instruction of a program taken out, for telling a kept site from a cut one. */
  programAt: Set<number>;
  /** The tagged lists taken out, as blob offset runs. */
  lists: Cut[];
}

/**
 * What goes with `modes` whole and with the pages of `pages` from the given page on: the entries and own lists of
 * the whole ones, each page's record, list and copy, and the programs only those pages reach. Programs are taken by
 * the piece that starts at each, which `takeApart` cuts at every address something names.
 */
function modeParts(c: Container, modes: ReadonlySet<number>, pages: ReadonlyMap<number, number>): ModeParts {
  const records = modeRecords(c);
  if (records === undefined) throw new ComposeError('base slot 6 does not read');
  const blobOf = (address: number): number => {
    const off = c.blobOffsetOf(address);
    if (off === undefined) throw new ComposeError(`0x${address.toString(16)} is outside the configuration`);
    return off;
  };
  const copies = pageListCopies(c);
  const all = modePages(c);
  if (copies.length !== all.length) throw new ComposeError(`${copies.length} page list copies for ${all.length} pages`);
  const extentAt = (off: number): Cut => {
    const extent = taggedListExtent(c.blob, off);
    if (extent === undefined) throw new ComposeError(`no tagged list at ${off}`);
    return { from: off, to: off + extent.length };
  };
  const cuts: Cut[] = [];
  const lists: Cut[] = [];
  const droppedRoots: number[] = [];
  let k = 0;
  records.forEach((record, mode) => {
    const whole = modes.has(mode);
    const from = whole ? 0 : pages.get(mode);
    if (whole) {
      const entry = blobOf(record.address);
      cuts.push({ from: entry, to: entry + record.entryLength });
      const own = extentAt(blobOf(record.start));
      cuts.push(own);
      lists.push(own);
    }
    record.pages.forEach((page, p) => {
      const copy = copies[k] as number;
      k += 1;
      if (from === undefined || p < from) return;
      const at = blobOf(page.address);
      cuts.push({ from: at, to: at + page.length });
      const list = extentAt(blobOf(page.list));
      const second = extentAt(copy);
      cuts.push(list, second);
      lists.push(list, second);
      droppedRoots.push(page.program);
    });
  });
  // The programs only the dropped pages reach: what every other root reaches stays, the mode program roots of the
  // modes dropped whole and the dropped pages' own programs being the roots that go.
  const goingRoots = new Set(droppedRoots);
  const programRoots = modeProgramRoots(c);
  records.forEach((_, mode) => { if (modes.has(mode) && programRoots[mode] !== undefined) goingRoots.add(programRoots[mode] as number); });
  const keptRoots = screenProgramRoots(c).filter((one) => !goingRoots.has(one));
  const kept = reachablePrograms(c, keptRoots);
  const programAt = new Set<number>();
  const layout = takeApart(c);
  const laid = layOutContainer(layout);
  const pieceStarting = new Map<number, ContainerPiece>();
  for (const piece of layout.body) pieceStarting.set(laid.offsetOf(piece) as number, piece);
  for (const [address, program] of reachablePrograms(c, [...goingRoots])) {
    if (kept.has(address)) continue;
    const off = blobOf(address);
    const piece = pieceStarting.get(off);
    const last = program[program.length - 1];
    if (last === undefined) continue;
    const end = last.start + last.length;
    if (piece === undefined || off + piece.bytes.length < end) throw new ComposeError(`the program at ${off} is not a piece of its own`);
    cuts.push({ from: off, to: off + piece.bytes.length });
    for (const one of program) programAt.add(one.start);
  }
  return { cuts, programAt, lists };
}

/** Whether a site's instruction sits in what is taken out: a dropped tagged list or a dropped program's instruction. */
function heldBy(parts: ModeParts, site: InstructionSite): boolean {
  if (site.holder === 'screen program') return parts.programAt.has(site.at - 1);
  if (site.holder === 'mode key map' || site.holder === 'page list' || site.holder === 'page list copy') {
    return parts.lists.some((one) => site.at >= one.from && site.at < one.to);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------------
// Dropping modes.

/** What `dropModes` did. */
export interface DroppedModes {
  container: Container;
  /** The modes taken out, ascending, in the input's numbering. */
  dropped: number[];
  /** Places that entered a mode and were renumbered, the event map's included. */
  renumbered: number;
  /** Lists left naming a dropped mode, each reached by nothing kept: the caller's to drop. */
  stale: number[];
  /** Pictures only the dropped modes drew. */
  pictures: number;
}

/**
 * Take modes out of base slot 6, with everything only they hold, and renumber every place that enters a mode
 * above each. Refuses mode 0, a mode the table does not hold, and a kept place entering a dropped mode, unless it
 * sits in a list nothing kept reaches, which `stale` names for the caller to drop.
 */
export function dropModes(c: Container, drop: Iterable<number>): DroppedModes {
  const dropping = [...new Set(drop)].sort((a, b) => a - b);
  const table = modeTable(c);
  const records = modeRecords(c);
  if (table === undefined || records === undefined) throw new ComposeError('base slot 6 does not read');
  for (const mode of dropping) {
    if (!Number.isInteger(mode) || mode <= 0 || mode >= records.length) throw new ComposeError(`there is no mode ${mode} to drop`);
  }
  const gone = new Set(dropping);
  const parts = modeParts(c, gone, new Map());

  // The lists something kept reaches, with the dropped modes' own places left out.
  const reached = namedLists(c, listCallSites(c).filter((site) => !heldBy(parts, { ...site, operand: site.list })));
  const below = (mode: number): number => dropping.filter((one) => one < mode).length;
  const bytes = c.blob.slice();
  const stale = new Set<number>();
  let renumbered = 0;
  for (const site of instructionSites(c, ENTER)) {
    if (heldBy(parts, site)) continue;
    if (gone.has(site.operand)) {
      if (site.within !== undefined && !reached.has(site.within)) { stale.add(site.within); continue; }
      throw new ComposeError(`mode ${site.operand} is entered by a ${site.holder} at ${site.at}${site.within === undefined ? '' : ` in list ${site.within}`}, so it cannot be dropped`);
    }
    const now = site.operand - below(site.operand);
    if (now === site.operand) continue;
    bytes[site.at] = now & 0xff;
    bytes[site.at + 1] = now >> 8;
    renumbered += 1;
  }
  // The event map: the fallback, then each code's mode, every one a `u24`.
  const events = eventMap(c);
  if (events !== undefined) {
    const fields = [events.start, ...Array.from({ length: events.entries.size }, (_, k) => events.start + 5 + 4 * k + 1)];
    for (const at of fields) {
      const mode = (bytes[at] as number) | ((bytes[at + 1] as number) << 8) | ((bytes[at + 2] as number) << 16);
      if (gone.has(mode)) throw new ComposeError(`the event map names mode ${mode}, so it cannot be dropped`);
      const now = mode - below(mode);
      if (now === mode) continue;
      bytes.set([now & 0xff, (now >> 8) & 0xff, now >> 16], at);
      renumbered += 1;
    }
  }
  // The table: each dropped entry's pointer cut and the count restated.
  const renumberedContainer = parse(bytes);
  const cuts = [...parts.cuts, ...dropping.map((mode) => ({ from: table.start + 3 + 3 * mode, to: table.start + 6 + 3 * mode }))];
  const cut = withoutRanges(renumberedContainer, cuts);
  const head = cut.at(table.start);
  if (head === undefined || head.offset !== 0) throw new ComposeError('base slot 6\'s table did not survive the cut');
  const count = records.length - dropping.length;
  head.piece.bytes.set([count & 0xff, (count >> 8) & 0xff, count >> 16], 0);
  const container = layOutContainer(cut.layout).container;
  checkModeDrop(c, container, dropping, parts, [...stale]);
  return { container, dropped: dropping, renumbered, stale: [...stale].sort((a, b) => a - b), pictures: cut.pictures };
}

/**
 * That a drop renumbered every place entering a mode and nothing else: a fresh census of `after`'s `0x7E` places
 * and `0x7F` places, by holder, is `before`'s without the dropped modes' own, each mode less the dropped modes
 * below it; and the table holds the kept modes, each with its pages. Recomputed from both containers, as
 * `checkRenumbering` is for lists, so a short census cannot vouch for itself.
 */
function checkModeDrop(before: Container, after: Container, dropped: readonly number[], parts: ModeParts, stale: readonly number[]): void {
  const gone = new Set(dropped);
  const map = (mode: number): number => mode - dropped.filter((one) => one < mode).length;
  const staleSet = new Set(stale);
  const sorted = (lines: string[]): string[] => lines.sort();
  const inStale = (site: InstructionSite): boolean => site.within !== undefined && staleSet.has(site.within);
  const was = sorted(instructionSites(before, ENTER).filter((site) => !heldBy(parts, site) && !inStale(site))
    .map((site) => `${site.holder} ${map(site.operand)}${site.within === undefined ? '' : ` in ${site.within}`}`));
  const now = sorted(instructionSites(after, ENTER).filter((site) => !inStale(site))
    .map((site) => `${site.holder} ${site.operand}${site.within === undefined ? '' : ` in ${site.within}`}`));
  if (was.length !== now.length || was.some((one, k) => one !== now[k])) {
    throw new ComposeError(`the drop left ${now.length} places entering a mode where ${was.length} were expected, or named other modes`);
  }
  const lists = (c: Container, skip: (site: InstructionSite) => boolean): string[] => sorted(listCallSites(c)
    .filter((site) => !skip({ ...site, operand: site.list }))
    .map((site) => `${site.holder} ${site.list}${site.within === undefined ? '' : ` in ${site.within}`}`));
  const listsWas = lists(before, (site) => heldBy(parts, site));
  const listsNow = lists(after, () => false);
  if (listsWas.length !== listsNow.length || listsWas.some((one, k) => one !== listsNow[k])) {
    throw new ComposeError('the drop changed a place naming a list outside the dropped modes');
  }
  const kept = (modeRecords(before) ?? []).flatMap((record, mode) => (gone.has(mode) ? [] : [record.pages.length]));
  const left = (modeRecords(after) ?? []).map((record) => record.pages.length);
  if (kept.join() !== left.join()) throw new ComposeError('the table does not hold the kept modes with their pages');
}

// ---------------------------------------------------------------------------------------------------------
// Dropping a mode's last pages.

/**
 * Take a mode's pages from `keep` on out, with their records, lists, copies and the programs only they reach, and
 * restate the entry's page count. Nothing is renumbered: a page has no number anything names. The pages kept are
 * left as they are, so a caller that changes how many pages a screen draws builds the kept ones again, with
 * `withModeRecords`.
 */
export function dropModePages(c: Container, mode: number, keep: number): Container {
  const record = (modeRecords(c) ?? [])[mode];
  if (record === undefined) throw new ComposeError(`there is no mode ${mode}`);
  if (!Number.isInteger(keep) || keep < 1 || keep >= record.pages.length) {
    throw new ComposeError(`mode ${mode} has ${record.pages.length} pages, so keeping ${keep} drops none or all`);
  }
  const parts = modeParts(c, new Set(), new Map([[mode, keep]]));
  const entry = c.blobOffsetOf(record.address) as number;
  const cut = withoutRanges(c, [...parts.cuts, { from: entry + 6 + 3 * keep, to: entry + 6 + 3 * record.pages.length }]);
  const head = cut.at(entry);
  if (head === undefined) throw new ComposeError(`mode ${mode}'s entry did not survive the cut`);
  head.piece.bytes.set([keep & 0xff, keep >> 8], head.offset + 4);
  const container = layOutContainer(cut.layout).container;
  const after = (modeRecords(container) ?? [])[mode];
  if (after?.pages.length !== keep) throw new ComposeError(`mode ${mode} reads ${after?.pages.length} pages after the drop, not ${keep}`);
  const listsWas = listCallSites(c).filter((site) => !heldBy(parts, { ...site, operand: site.list })).length;
  if (listCallSites(container).length !== listsWas) throw new ComposeError('the page drop changed a place naming a list outside the pages');
  return container;
}

