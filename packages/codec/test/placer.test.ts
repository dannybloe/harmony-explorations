/**
 * Where Logitech's compiler parks pieces and puts its pictures, decided from the content,
 * `todo-compile-650.md` 10.5 and `docs/findings.md` section 328.
 *
 * **The measurement starts from a bag.** `takeApart` gives a compile's layout, `loosen` throws what
 * is parked in front of the tables and the whole picture bank into one bag and shuffles it, and
 * `placePieces` has to put every piece back from the content alone: the key table, the body and the
 * tables are given, and nothing else about where a piece was is left in the input.
 *
 * **Two orders are not fixed by the pictures or the pages, so the comparison is in two halves.** The
 * regions whose order the content states are compared piece for piece; the mode pages' lists and the
 * pictures, which come out of the compiler in an order that varies between two compiles holding the
 * same pictures, are compared as sets, with the one constraint the content does state checked on its own, and
 * then Logitech's two orders are substituted and the container has to come back byte for byte. As
 * placed, every byte that differs from the compile has to be in a place those two orders move: the
 * run of page lists, the bank, an address field naming a page list or a picture, and the trailer
 * checksum.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece } from '../src/index.ts';
import {
  LayoutError,
  inventory,
  layOutContainer,
  loosen,
  parse,
  placePieces,
  renderPages,
  roundTrip,
  takeApart,
} from '../src/index.ts';

/** The thirteen arch 14 compiles of section 312, the population `frame.test.ts` lays out. */
const ARCH14_COMPILES = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;

/** The base slots whose table has its descendants parked in front of it in an order the content states. */
const STATED_SLOTS = [5, 7, 10, 15] as const;

/** How many of the 426 page lists `h700_config` and `h700_config_2` put at the same place. */
const SAME_PAGE_LIST_PLACES = 1;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

/** A fixed shuffle, so a failure reproduces; the seed only has to differ between two calls. */
function shuffled(seed: number): (pieces: ContainerPiece[]) => ContainerPiece[] {
  return (pieces) => {
    const out = [...pieces];
    let state = seed;
    for (let i = out.length - 1; i > 0; i -= 1) {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      const j = state % (i + 1);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
}

const samePieces = (a: readonly ContainerPiece[], b: readonly ContainerPiece[]): boolean =>
  a.length === b.length && a.every((piece, i) => piece === b[i]);

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

/** `layout` with base slot 9's parked lists and the bank in Logitech's order rather than the placer's. */
function withLogitechsFreeOrders(layout: ContainerLayout, logitech: ContainerLayout): ContainerLayout {
  return {
    ...layout,
    sections: layout.sections.map((placed, slot) =>
      (slot === 9 && placed !== undefined ? { ...placed, before: logitech.sections[9]!.before } : placed)),
    pictures: logitech.pictures,
  };
}

test('what is parked in front of base slots 5, 7, 10 and 15 is placed from a shuffled bag exactly as Logitech parks it',
     skipUnless(...ARCH14_COMPILES), () => {
  let exact = 0;
  for (const name of ARCH14_COMPILES) {
    const logitech = takeApart(containerOf(name));
    const placed = placePieces(loosen(logitech, shuffled(7))).layout;
    for (const slot of STATED_SLOTS) {
      assert.ok(samePieces(placed.sections[slot]!.before, logitech.sections[slot]!.before), `${name}: base slot ${slot}`);
      exact += 1;
    }
    // Nothing is parked anywhere else, on either side, and every table is where it was.
    placed.sections.forEach((placement, slot) => {
      const theirs = logitech.sections[slot];
      if (placement === undefined || theirs === undefined) {
        assert.equal(placement, theirs, `${name}: base slot ${slot}`);
        return;
      }
      assert.ok(samePieces(placement.head, theirs.head), `${name}: base slot ${slot}'s table`);
      if (slot !== 9 && !(STATED_SLOTS as readonly number[]).includes(slot)) {
        assert.equal(placement.before.length, 0, `${name}: something placed in front of base slot ${slot}`);
        assert.equal(theirs.before.length, 0, `${name}: Logitech parks something in front of base slot ${slot}`);
      }
    });
  }
  assert.equal(exact, ARCH14_COMPILES.length * STATED_SLOTS.length);
});

test('a font set follows its own glyphs, and the two other plausible orders fail on every compile',
     skipUnless(...ARCH14_COMPILES), () => {
  // The controls: the set before its glyphs, and every glyph before every set. Both keep the sets in
  // the table's order and each set's glyphs in field order, so all they change is the one claim.
  let preorder = 0;
  let glyphsFirst = 0;
  for (const name of ARCH14_COMPILES) {
    const logitech = takeApart(containerOf(name)).sections[7]!.before;
    const sets = logitech.filter((piece) => piece.owner === 'slot-7-set');
    const glyphsOf = (set: ContainerPiece): ContainerPiece[] =>
      [...set.refs].sort((a, b) => a.at - b.at).flatMap((ref) => ('to' in ref ? [ref.to] : []));
    if (samePieces(sets.flatMap((set) => [set, ...glyphsOf(set)]), logitech)) preorder += 1;
    if (samePieces([...sets.flatMap(glyphsOf), ...sets], logitech)) glyphsFirst += 1;
  }
  assert.equal(preorder, 0);
  assert.equal(glyphsFirst, 0);
});

test('the action lists parked in front of base slot 10 are numbered as the page lists call them',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const logitech = takeApart(containerOf(name));
    // The parked lists are the table's tail: the body holds lists 0 to n - 1 and the bag the rest.
    const table = [...logitech.sections[10]!.head[0]!.refs].sort((a, b) => a.at - b.at)
      .flatMap((ref) => ('to' in ref ? [ref.to] : []));
    const inBody = logitech.body.filter((piece) => piece.owner === 'slot-10-list').length;
    assert.ok(samePieces(table.slice(inBody), logitech.sections[10]!.before), `${name}: not the table's tail`);

    // And the page lists that call one keep Logitech's relative order when placed, while placing the
    // page lists in their pages' order, the obvious alternative, does not.
    const placement = placePieces(loosen(logitech, shuffled(11)));
    const stated = new Set(placement.pageListsStated);
    const theirs = logitech.sections[9]!.before.filter((list) => stated.has(list));
    assert.ok(samePieces(placement.pageListsStated, theirs), `${name}: the stated page lists`);
    const byPage = logitech.body.filter((piece) => piece.owner === 'slot-6-page')
      .flatMap((page) => page.refs.flatMap((ref) => ('to' in ref && stated.has(ref.to) ? [ref.to] : [])));
    assert.ok(!samePieces(byPage, theirs), `${name}: page order would have done`);

    // The claim itself: read Logitech's page lists in their stored order and collect every `0x7F`
    // call into the parked run, and the result is the run's numbers, each once, in ascending order.
    const calls = logitech.sections[9]!.before.flatMap((list) => callsOf(list).filter((n) => n >= inBody));
    assert.deepEqual(calls, Array.from({ length: table.length - inBody }, (_, k) => inBody + k), `${name}: calls`);
  }
});

/** The action list numbers a page list calls through `0x7F`, in entry order. Section 34. */
function callsOf(list: ContainerPiece): number[] {
  const wide = list.bytes[0] === 0;
  const count = wide ? list.bytes[1]! : list.bytes[0]!;
  const stride = wide ? 5 : 4;
  const out: number[] = [];
  for (let k = 0; k < count; k += 1) {
    const at = (wide ? 2 : 1) + stride * k + stride - 3;
    if (list.bytes[at + 2] === 0x7f) out.push(list.bytes[at]! | (list.bytes[at + 1]! << 8));
  }
  return out;
}

test('the controls bite: a reversed table order and an unnamed address field both show',
     skipUnless(...ARCH14_COMPILES), () => {
  let caught = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const logitech = takeApart(c);
    const placed = placePieces(loosen(logitech)).layout;
    // The parameter groups reversed, with everything else as placed and Logitech's two free orders:
    // the substitution that otherwise gives the compile back no longer does.
    const fifteen = placed.sections[15]!;
    const reversed = { ...placed, sections: placed.sections.map((p, slot) =>
      (slot === 15 ? { ...fifteen, before: [...fifteen.before].reverse() } : p)) };
    if (firstDifference(layOutContainer(withLogitechsFreeOrders(reversed, logitech)).bytes, c.blob) !== undefined) {
      caught += 1;
    }
  }
  assert.equal(caught, ARCH14_COMPILES.length);

  // Without the address fields that name a moved page list or picture, the runs, the bank and the
  // checksum no longer cover every changed byte: on h650_config_region 2674 bytes are left over.
  const c = containerOf('h650_config_region');
  const placed = placePieces(loosen(takeApart(c))).layout;
  const out = layOutContainer(placed);
  const run = placed.sections[9]!.before;
  const runStart = out.offsetOf(run[0]!)!;
  const runEnd = runStart + run.reduce((n, piece) => n + piece.bytes.length, 0);
  const bank = out.offsetOf(placed.pictures[0]!)!;
  const checksum = c.blob.length - 6;
  let left = 0;
  for (let i = 0; i < c.blob.length; i += 1) {
    if (out.bytes[i] === c.blob[i]) continue;
    if (!((i >= runStart && i < runEnd) || (i >= bank && i < checksum + 2))) left += 1;
  }
  assert.equal(left, 2674);
});

test('with the two free orders substituted the thirteen come back byte for byte, and as placed every difference is named',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const logitech = takeApart(c);
    const placed = placePieces(loosen(logitech, shuffled(3))).layout;
    assert.equal(firstDifference(layOutContainer(withLogitechsFreeOrders(placed, logitech)).bytes, c.blob), undefined,
      `${name}: differs with Logitech's two orders`);

    // As placed: the same pieces in each of the two runs, and every changed byte is in a named place.
    const out = layOutContainer(placed);
    assert.equal(out.bytes.length, c.blob.length, `${name}: length`);
    const run = placed.sections[9]!.before;
    assert.deepEqual(new Set(run), new Set(logitech.sections[9]!.before), `${name}: page lists`);
    assert.deepEqual(new Set(placed.pictures), new Set(logitech.pictures), `${name}: pictures`);
    const named = new Set<number>();
    const moved = new Set<ContainerPiece>([...run, ...placed.pictures]);
    const runStart = out.offsetOf(run[0]!)!;
    const runEnd = runStart + run.reduce((n, piece) => n + piece.bytes.length, 0);
    const bank = out.offsetOf(placed.pictures[0]!)!;
    const checksum = c.blob.length - 6;
    for (const piece of [placed.keyTable, ...placed.body]) {
      for (const ref of piece.refs) {
        if (!('to' in ref) || !moved.has(ref.to)) continue;
        for (let k = 0; k < 3; k += 1) named.add(out.offsetOf(piece)! + ref.at + k);
      }
    }
    let unnamed = 0;
    for (let i = 0; i < c.blob.length; i += 1) {
      if (out.bytes[i] === c.blob[i]) continue;
      const known = (i >= runStart && i < runEnd) || (i >= bank && i < checksum)
        || named.has(i) || i === checksum || i === checksum + 1;
      if (!known) unnamed += 1;
    }
    assert.equal(unnamed, 0, `${name}: a byte changed that the two free orders do not explain`);

    // And it is the same configuration: what the readers make of it is unchanged, and it round trips.
    assert.equal(JSON.stringify(inventory(out.container)), JSON.stringify(inventory(c)), `${name}: inventory`);
    assert.ok(roundTrip(out.container).equal, `${name}: round trip`);
  }
});

test('two compiles with the same pictures, named first in the same order, store the bank and the page lists in different orders',
     skipUnless('h700_config', 'h700_config_2'), () => {
  const a = takeApart(containerOf('h700_config'));
  const b = takeApart(containerOf('h700_config_2'));
  const key = (piece: ContainerPiece): string => Buffer.from(piece.bytes).toString('hex');
  // The same 24 pictures byte for byte, and a body of the same 16251 pieces in the same order, 16237 of
  // them byte for byte at the same place. The 14 that differ are seven clock records, four screen
  // programs, a mode entry, a key map and one action list: two compiles of nearly one setup.
  assert.deepEqual(a.pictures.map(key).sort(), b.pictures.map(key).sort());
  assert.equal(a.body.length, 16251);
  assert.equal(b.body.length, 16251);
  assert.equal(a.body.filter((piece, i) => key(piece) === key(b.body[i]!)).length, 16237);
  // The body names the pictures first in the same order in both, which is the order the placer uses.
  const firstNamed = (layout: ContainerLayout): string[] => {
    const pictures = new Set(layout.pictures);
    const seen: string[] = [];
    for (const piece of layout.body) {
      for (const ref of [...piece.refs].sort((x, y) => x.at - y.at)) {
        if ('to' in ref && pictures.has(ref.to) && !seen.includes(key(ref.to))) seen.push(key(ref.to));
      }
    }
    return seen;
  };
  assert.deepEqual(firstNamed(a), firstNamed(b));
  assert.equal(firstNamed(a).length, 24);
  // And the banks are two permutations anyway: 1 of the 24 pictures is at the same place in both.
  assert.equal(a.pictures.filter((piece, i) => key(piece) === key(b.pictures[i]!)).length, 1);
  // The page lists likewise, compared by the page each list belongs to; the lists their calls name
  // were numbered in the order the lists were emitted, so the action list table differs too.
  const pageOrder = (layout: ContainerLayout): number[] => {
    const pages = layout.body.filter((piece) => piece.owner === 'slot-6-page');
    const pageOf = new Map<ContainerPiece, number>();
    pages.forEach((page, index) => page.refs.forEach((ref) => { if ('to' in ref) pageOf.set(ref.to, index); }));
    return layout.sections[9]!.before.map((list) => pageOf.get(list)!);
  };
  const orderA = pageOrder(a);
  const orderB = pageOrder(b);
  assert.equal(orderA.length, 426);
  assert.equal(orderB.length, 426);
  assert.equal(orderA.filter((page, i) => page === orderB[i]).length, SAME_PAGE_LIST_PLACES);
});

test('the placement does not depend on the order the bag arrives in',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const logitech = takeApart(containerOf(name));
    const one = layOutContainer(placePieces(loosen(logitech, shuffled(1))).layout).bytes;
    const two = layOutContainer(placePieces(loosen(logitech, shuffled(2))).layout).bytes;
    const reversed = layOutContainer(placePieces(loosen(logitech, (pieces) => [...pieces].reverse())).layout).bytes;
    assert.equal(firstDifference(one, two), undefined, name);
    assert.equal(firstDifference(one, reversed), undefined, name);
  }
});

test('compiles holding the same pictures never put more than three of them at the same place',
     skipUnless(...ARCH14_COMPILES), () => {
  // The population behind "the bank's order is not fixed by the pictures": every pair of the
  // thirteen whose banks hold the same pictures byte for byte, compared place by place.
  const key = (piece: ContainerPiece): string => Buffer.from(piece.bytes).toString('hex');
  const banks = ARCH14_COMPILES.map((name) => takeApart(containerOf(name)).pictures.map(key));
  let pairs = 0;
  let most = 0;
  for (let i = 0; i < banks.length; i += 1) {
    for (let j = i + 1; j < banks.length; j += 1) {
      const a = banks[i]!;
      const b = banks[j]!;
      if ([...a].sort().join() !== [...b].sort().join()) continue;
      pairs += 1;
      most = Math.max(most, a.filter((picture, k) => picture === b[k]).length);
    }
  }
  assert.equal(pairs, 17);
  assert.equal(most, 3);
});

test('the placer refuses a piece it has no rule for, and one its rule does not reach',
     skipUnless('h600_config'), () => {
  const fresh = (): ReturnType<typeof loosen> => loosen(takeApart(containerOf('h600_config')));

  // A kind that belongs in the body.
  const block = fresh();
  const bag = [...block.loose, { bytes: new Uint8Array(4), refs: [], owner: 'slot-5-block' }];
  assert.throws(() => placePieces({ ...block, loose: bag }), /no rule for a loose slot-5-block/);

  const twice = fresh();
  const pieces = [...twice.loose];
  assert.throws(() => placePieces({ ...twice, loose: [...pieces, pieces[0]!] }), /listed twice/);

  // A glyph no set names, and a picture nothing draws.
  for (const owner of ['slot-7-glyph', 'picture-bank']) {
    const stray = fresh();
    const extra: ContainerPiece = { bytes: new Uint8Array(8), refs: [], owner };
    assert.throws(() => placePieces({ ...stray, loose: [...stray.loose, extra] }),
      (error: unknown) => error instanceof LayoutError && /no rule reaches/.test(error.message), owner);
  }
});

// ---------------------------------------------------------------------------------------------------------
// The Harmony One, `todo-compile-one.md` 6.2 and `docs/findings.md` section 426: the same placer, the same rule.

/**
 * Every Harmony One configuration Logitech compiled that the lab holds, `frame.test.ts`' population: seventeen
 * names and the three harvest compiles read by their path, nineteen distinct containers in twenty fixtures, since
 * `one_config_unprogrammed` and `one_spare_before_sync` are one container read twice.
 */
const ONE_COMPILES = [
  'one_config', 'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync',
  'one_spare_myharmony', 'one_spare_20260830', 'calibration_one', 'calibration_favchannels',
  'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_two_devices', 'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after',
] as const;
const ONE_HARVEST = [1, 2, 3].map((n) => `work/harvest/families-one/compile-00${n}-Result.EzHex`);
const ONE_FIXTURES = [...ONE_COMPILES, ...ONE_HARVEST];

/** The mode pages of the twenty Harmony One fixtures, each drawn as placed and as Logitech stored it. */
const ONE_PAGES_DRAWN = 4962;

/** A fixture by name, or by its path under the lab for a harvest compile. A missing one fails rather than skips. */
function oneContainer(fixture: string): Container {
  if (!fixture.startsWith('work/')) return containerOf(fixture);
  const path = join(LAB!, fixture);
  assert.ok(existsSync(path), `${fixture} is in the lab`);
  return parse(new Uint8Array(readFileSync(path)));
}

test('on the Harmony One what is parked in front of base slots 5, 7, 10 and 15 is placed from a shuffled bag exactly as Logitech parks it, and raw slot 18 is carried with nothing in front',
     skipUnless(...ONE_COMPILES), () => {
  let exact = 0;
  for (const name of ONE_FIXTURES) {
    const logitech = takeApart(oneContainer(name));
    const placed = placePieces(loosen(logitech, shuffled(7))).layout;
    for (const slot of STATED_SLOTS) {
      assert.ok(samePieces(placed.sections[slot]!.before, logitech.sections[slot]!.before), `${name}: base slot ${slot}`);
      exact += 1;
    }
    placed.sections.forEach((placement, slot) => {
      const theirs = logitech.sections[slot];
      if (placement === undefined || theirs === undefined) {
        assert.equal(placement, theirs, `${name}: base slot ${slot}`);
        return;
      }
      assert.ok(samePieces(placement.head, theirs.head), `${name}: base slot ${slot}'s table`);
      if (slot !== 9 && !(STATED_SLOTS as readonly number[]).includes(slot)) {
        assert.equal(placement.before.length, 0, `${name}: something placed in front of base slot ${slot}`);
        assert.equal(theirs.before.length, 0, `${name}: Logitech parks something in front of base slot ${slot}`);
      }
    });
    // The One's own section, the frame's data and not the placer's: its table carried, nothing parked in front.
    assert.deepEqual(Object.keys(placed.inserted ?? {}), ['18'], `${name}: inserted sections`);
    assert.equal(placed.inserted![18]!.head[0], logitech.inserted![18]!.head[0], `${name}: raw slot 18's table`);
    assert.equal(placed.inserted![18]!.before.length, 0, `${name}: parked in front of raw slot 18`);
  }
  assert.equal(exact, ONE_FIXTURES.length * STATED_SLOTS.length);
});

test('on the Harmony One a font set follows its own glyphs, no glyph is named by two sets, and the two other plausible orders fail on every compile',
     skipUnless(...ONE_COMPILES), () => {
  let preorder = 0;
  let glyphsFirst = 0;
  let shared = 0;
  let sets = 0;
  for (const name of ONE_FIXTURES) {
    const logitech = takeApart(oneContainer(name)).sections[7]!.before;
    const own = logitech.filter((piece) => piece.owner === 'slot-7-set');
    const glyphsOf = (set: ContainerPiece): ContainerPiece[] =>
      [...set.refs].sort((a, b) => a.at - b.at).flatMap((ref) => ('to' in ref ? [ref.to] : []));
    if (samePieces(own.flatMap((set) => [set, ...glyphsOf(set)]), logitech)) preorder += 1;
    if (samePieces([...own.flatMap(glyphsOf), ...own], logitech)) glyphsFirst += 1;
    const all = own.flatMap(glyphsOf);
    shared += all.length - new Set(all).size;
    sets += own.length;
  }
  assert.equal(preorder, 0);
  assert.equal(glyphsFirst, 0);
  assert.equal(shared, 0);
  // 16 to 18 sets a fixture, so the glyph rule holds over every set of the twenty.
  assert.equal(sets, ONE_SETS);
});

/** The font sets of the twenty Harmony One fixtures. */
const ONE_SETS = 350;

test('on the Harmony One the action lists parked in front of base slot 10 are the table\'s tail, numbered as the page lists call them',
     skipUnless(...ONE_COMPILES), () => {
  let stated = 0;
  let chosen = 0;
  for (const name of ONE_FIXTURES) {
    const logitech = takeApart(oneContainer(name));
    const table = [...logitech.sections[10]!.head[0]!.refs].sort((a, b) => a.at - b.at)
      .flatMap((ref) => ('to' in ref ? [ref.to] : []));
    const inBody = logitech.body.filter((piece) => piece.owner === 'slot-10-list').length;
    assert.ok(samePieces(table.slice(inBody), logitech.sections[10]!.before), `${name}: not the table's tail`);

    // The page lists that call one keep Logitech's relative order when placed; their pages' order would not.
    const placement = placePieces(loosen(logitech, shuffled(11)));
    const statedSet = new Set(placement.pageListsStated);
    const theirs = logitech.sections[9]!.before.filter((list) => statedSet.has(list));
    assert.ok(samePieces(placement.pageListsStated, theirs), `${name}: the stated page lists`);
    const byPage = logitech.body.filter((piece) => piece.owner === 'slot-6-page')
      .flatMap((page) => page.refs.flatMap((ref) => ('to' in ref && statedSet.has(ref.to) ? [ref.to] : [])));
    assert.ok(!samePieces(byPage, theirs), `${name}: page order would have done`);

    // The claim itself: every parked list called once, in ascending number, in Logitech's stored page list order.
    const calls = logitech.sections[9]!.before.flatMap((list) => callsOf(list).filter((n) => n >= inBody));
    assert.deepEqual(calls, Array.from({ length: table.length - inBody }, (_, k) => inBody + k), `${name}: calls`);
    stated += placement.pageListsStated.length;
    chosen += placement.pageListsChosen.length;
  }
  // Over the twenty fixtures, how many page lists the content places and how many are the placer's choice.
  assert.deepEqual([stated, chosen], ONE_PAGE_LISTS);
});

/** The page lists of the twenty Harmony One fixtures: placed by the lists they call, and left to the placer. */
const ONE_PAGE_LISTS = [3912, 1050];

test('on the Harmony One with the two free orders substituted the nineteen distinct compiles, twenty fixtures, come back byte for byte, and as placed every difference is named, every page draws as Logitech\'s and the bank is found again',
     skipUnless(...ONE_COMPILES), () => {
  let pages = 0;
  const key = (piece: ContainerPiece): string => Buffer.from(piece.bytes).toString('hex');
  for (const name of ONE_FIXTURES) {
    const c = oneContainer(name);
    const logitech = takeApart(c);
    const placed = placePieces(loosen(logitech, shuffled(3))).layout;
    assert.equal(firstDifference(layOutContainer(withLogitechsFreeOrders(placed, logitech)).bytes, c.blob), undefined,
      `${name}: differs with Logitech's two orders`);

    const out = layOutContainer(placed);
    assert.equal(out.bytes.length, c.blob.length, `${name}: length`);
    const run = placed.sections[9]!.before;
    const moved = new Set<ContainerPiece>([...run, ...placed.pictures]);
    const runStart = out.offsetOf(run[0]!)!;
    const runEnd = runStart + run.reduce((n, piece) => n + piece.bytes.length, 0);
    const bank = out.offsetOf(placed.pictures[0]!)!;
    const checksum = c.blob.length - 6;
    const named = new Set<number>();
    for (const piece of [placed.keyTable, ...placed.body]) {
      for (const ref of piece.refs) {
        if (!('to' in ref) || !moved.has(ref.to)) continue;
        for (let k = 0; k < 3; k += 1) named.add(out.offsetOf(piece)! + ref.at + k);
      }
    }
    let unnamed = 0;
    for (let i = 0; i < c.blob.length; i += 1) {
      if (out.bytes[i] === c.blob[i]) continue;
      const known = (i >= runStart && i < runEnd) || (i >= bank && i < checksum)
        || named.has(i) || i === checksum || i === checksum + 1;
      if (!known) unnamed += 1;
    }
    assert.equal(unnamed, 0, `${name}: a byte changed that the two free orders do not explain`);

    // The same configuration to every reader: its inventory, the emitter's round trip, the bank found by its
    // search where the placer put it, and every mode page drawn pixel for pixel as Logitech's file draws it.
    assert.equal(JSON.stringify(inventory(out.container)), JSON.stringify(inventory(c)), `${name}: inventory`);
    assert.ok(roundTrip(out.container).equal, `${name}: round trip`);
    assert.deepEqual(takeApart(out.container).pictures.map(key), placed.pictures.map(key), `${name}: the bank read back`);
    const theirs = renderPages(c);
    const ours = renderPages(out.container);
    assert.equal(ours.length, theirs.length, `${name}: pages`);
    theirs.forEach((page, k) => {
      assert.ok(page !== undefined, `${name}: page ${k} does not draw`);
      assert.deepEqual(ours[k]?.raster, page.raster, `${name}: page ${k}`);
      pages += 1;
    });
  }
  assert.equal(pages, ONE_PAGES_DRAWN);
});

test('on the Harmony One the placement does not depend on the order the bag arrives in',
     skipUnless(...ONE_COMPILES), () => {
  for (const name of ONE_FIXTURES) {
    const logitech = takeApart(oneContainer(name));
    const one = layOutContainer(placePieces(loosen(logitech, shuffled(1))).layout).bytes;
    const two = layOutContainer(placePieces(loosen(logitech, shuffled(2))).layout).bytes;
    const reversed = layOutContainer(placePieces(loosen(logitech, (pieces) => [...pieces].reverse())).layout).bytes;
    assert.equal(firstDifference(one, two), undefined, name);
    assert.equal(firstDifference(one, reversed), undefined, name);
  }
});

test('two Harmony One compiles whose bodies differ in five clock records store the bank and the page lists in different orders',
     skipUnless('calibration_favchannels', 'phase7_before'), () => {
  const a = takeApart(containerOf('calibration_favchannels'));
  const b = takeApart(containerOf('phase7_before'));
  const key = (piece: ContainerPiece): string => Buffer.from(piece.bytes).toString('hex');
  // The same 75 pictures byte for byte, and a body of 4509 pieces, 4504 of them byte for byte at the same place;
  // the five that differ are clock records, which the stamp seeds.
  assert.deepEqual(a.pictures.map(key).sort(), b.pictures.map(key).sort());
  assert.equal(a.pictures.length, 75);
  assert.deepEqual([a.body.length, b.body.length], [4509, 4509]);
  const differing = a.body.flatMap((piece, i) => (key(piece) === key(b.body[i]!) ? [] : [piece.owner]));
  assert.deepEqual(differing, Array.from({ length: 5 }, () => 'slot-13-record'));
  assert.notEqual(a.builtAt, b.builtAt);
  // The body names the pictures first in the same order in both, the placer's order, and the banks are two
  // permutations anyway, 3 of the 75 places holding the same bytes. Compared by their bytes, since the pieces of
  // two files are two sets of objects: the 75 are 57 distinct pictures, the rest copies Logitech's compile stores
  // again, so the first named order lists 57.
  const firstNamed = (layout: ContainerLayout): string[] => {
    const pictures = new Set(layout.pictures);
    const seen: string[] = [];
    for (const piece of layout.body) {
      for (const ref of [...piece.refs].sort((x, y) => x.at - y.at)) {
        if ('to' in ref && pictures.has(ref.to) && !seen.includes(key(ref.to))) seen.push(key(ref.to));
      }
    }
    return seen;
  };
  assert.deepEqual(firstNamed(a), firstNamed(b));
  assert.equal(firstNamed(a).length, 57);
  assert.equal(a.pictures.filter((piece, i) => key(piece) === key(b.pictures[i]!)).length, 3);
  // The page lists likewise, by the page each belongs to: 1 of 198 at the same place.
  const pageOrder = (layout: ContainerLayout): number[] => {
    const pageOf = new Map<ContainerPiece, number>();
    layout.body.filter((piece) => piece.owner === 'slot-6-page')
      .forEach((page, index) => page.refs.forEach((ref) => { if ('to' in ref) pageOf.set(ref.to, index); }));
    return layout.sections[9]!.before.map((list) => pageOf.get(list)!);
  };
  const orderA = pageOrder(a);
  const orderB = pageOrder(b);
  assert.deepEqual([orderA.length, orderB.length], [198, 198]);
  assert.equal(orderA.filter((page, i) => page === orderB[i]).length, 1);
});

test('distinct Harmony One compiles holding the same pictures never put more than five of them at the same place',
     skipUnless(...ONE_COMPILES), () => {
  // One container read twice is one compile, so `one_spare_before_sync` is left out and its twin kept.
  const key = (piece: ContainerPiece): string => Buffer.from(piece.bytes).toString('hex');
  const distinct = ONE_FIXTURES.filter((name) => name !== 'one_spare_before_sync');
  const banks = distinct.map((name) => takeApart(oneContainer(name)).pictures.map(key));
  let pairs = 0;
  let most = 0;
  for (let i = 0; i < banks.length; i += 1) {
    for (let j = i + 1; j < banks.length; j += 1) {
      const a = banks[i]!;
      const b = banks[j]!;
      if ([...a].sort().join() !== [...b].sort().join()) continue;
      pairs += 1;
      most = Math.max(most, a.filter((picture, k) => picture === b[k]).length);
    }
  }
  assert.equal(distinct.length, 19);
  assert.equal(pairs, 8);
  assert.equal(most, 5);
});

test('the controls bite on the Harmony One: without raw slot 18 the frame refuses the placement, and a piece parked in front of it is refused',
     skipUnless('calibration_one'), () => {
  const logitech = takeApart(containerOf('calibration_one'));
  // The placer before `todo-compile-one.md` 6.2 dropped the inserted section, and the frame refuses a layout lacking it.
  const { inserted: _dropped, ...without } = loosen(logitech);
  assert.throws(() => layOutContainer(placePieces(without).layout), /raw slot 18 of arch 12 has no table/);
  // A piece parked in front of raw slot 18 has no rule to put it back, so loosening refuses it rather than dropping it.
  const parked: ContainerLayout = {
    ...logitech,
    inserted: { 18: { before: [{ bytes: new Uint8Array(2), refs: [] }], head: logitech.inserted![18]!.head } },
  };
  assert.throws(() => loosen(parked), /parked in front of raw slot 18/);
});
