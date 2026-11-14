/**
 * The catalogue composer reads a code at the widths its family's definition states, section 359.
 *
 * **What is claimed, and over what.** An infrared command in Logitech's catalogue is a family name and a
 * value written in a notation, `G:Motorola 16 Bit Hex:()(0x...)():3`, and how wide each value is and what
 * base its digits are in is stated by the family's definition. The composer read the width off the
 * family's name until this section, and so refused every command whose name does not spell its width in
 * bits: over the whole archive, 52658 commands of 156 families. Read at the definition's widths, the
 * reading the renderer `make prontocheck` scores against every rendering in the archive already made, all
 * but 172 of them read, and those 172 are not infrared codes a remote can send: three families with no
 * rhythm at all and 31 codes misspelt in the catalogue itself, none of them rendered there. On the codes
 * both readings read, the rhythm table's block is the same under both except on 224 codes of three
 * families, where the name's block is the definition's at no count and the definition's reading gives the
 * definition's own block at the count the family states.
 *
 * **Against Logitech.** Three devices of the harvest's third Harmony One compile hold such codes, and
 * composed whole onto the Harmony 650's configuration every record is Logitech's, word for word after
 * the opening silence: the Gemini TestQuhd, all 70 of whose codes only the definition reads, 72 of 72,
 * and the one such code each of the Sony RDR-GXD500 and the Rosen 0602-2XX-8. **Those three families
 * state the right width in their names** and write values wider than it, so they confirm the definition's
 * route and its masking, not a width the name got wrong. That reading is checked against Logitech only as
 * trains: the factory configuration of the Harmony 350 holds `Philips RC5Ex`, whose name states no width,
 * and the definition's build at 3 is each of its 30 records; a contributed Harmony 880 configuration, not
 * a fixture here, holds `Russound 9 Bit Quad`. Every other admitted family is composed from the definition
 * alone, no container in the lab holding a code of it that only the definition reads.
 *
 * **What is not claimed.** Anything on a remote; and anything about the release groups, the counts of 0
 * and the conflicting stated counts that still refuse most of what this section reads: the composer
 * refuses a device mixing two families' counts and a count of 0 for want of a compile that shows
 * either, part of R10.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IR_ARCHIVE_SAMPLE,
  LAB,
  needing,
  require_,
  skipUnless,
  skipWithoutIrArchiveSample,
  skipWithoutLab,
} from '@harmony/lab';
import {
  catalogueCommands,
  catalogueDevice,
  type Container,
  devices,
  irGroups,
  parse,
  payloadOf,
  type Pulse,
  statedCode,
  waveformOfArchiveCommand,
  archiveAt,
} from '../../src/node.ts';
import {
  archiveProtocolsByName,
  catalogueCommandBlocks,
  compiledBlockWords,
  composableKeycode,
  composeCatalogueDevices,
} from '../../src/build.ts';
import { irHeaderPointers, irBlockWords, joinedGaps, mergedIntervals } from '../../src/internal.ts';

const HARVEST_THREE = 'work/harvest/families-one/compile-003-Result.EzHex';

function open(fixture: string): Container {
  const bytes = fixture.startsWith('work/')
    ? new Uint8Array(readFileSync(join(LAB!, fixture)))
    : require_(fixture);
  let payload = bytes;
  try { payload = payloadOf(bytes); } catch { /* a bare container */ }
  return parse(payload);
}

/** A group's records as their three blocks' words, `-` for an empty pointer. */
function recordBlocks(c: Container, group: number): string[][] {
  return irGroups(c)![group]!.addresses.map((address) => irHeaderPointers(c, address).slice(0, 3).map((pointer) => {
    if (pointer === 0) return '-';
    return irBlockWords(c, pointer)!.filter((word, at, all) => !(word === 0 && at === all.length - 1)).join(',');
  }));
}

/** The record without its once block's opening silence: a Harmony One compile opens its blocks with none. */
const withoutLead = (blocks: readonly string[]): string => {
  const words = blocks[0]!.split(',').map(Number);
  return [words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(','), ...blocks.slice(1)].join('|');
};

/** A block as its merged intervals, the silence it opens with dropped. */
function train(pulses: readonly Pulse[]): string {
  const merged = mergedIntervals(pulses);
  while (merged.length > 0 && !merged[0]!.mark) merged.shift();
  return merged.map((one) => `${one.mark ? '+' : '-'}${one.us}`).join(',');
}

/** Every command of the archive, as its keycode, once per codeset that holds it. Read once per file. */
let keycodes: string[] | undefined;
function archiveKeycodes(): string[] {
  if (keycodes !== undefined) return keycodes;
  const out: string[] = [];
  for (const bucket of readdirSync(join(IR_ARCHIVE_SAMPLE!, 'codesets'))) {
    for (const file of readdirSync(join(IR_ARCHIVE_SAMPLE!, 'codesets', bucket))) {
      const raw = JSON.parse(readFileSync(join(IR_ARCHIVE_SAMPLE!, 'codesets', bucket, file), 'utf8')) as unknown;
      const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as { keycode?: string }[];
      for (const { keycode } of list) if (keycode !== undefined && /^G:[^:]+:/.test(keycode)) out.push(keycode);
    }
  }
  keycodes = out;
  return out;
}
const familyOf = (keycode: string): string => /^G:([^:]+):/.exec(keycode)![1]!;

/** Three devices of the harvest's third Harmony One compile whose codes only the definition reads, all or one. */
const CLOSURE = [
  { manufacturer: 'Gemini', model: 'TestQuhd', group: 1, unnamed: 70, records: 72 },
  { manufacturer: 'Sony', model: 'RDR-GXD500', group: 0, unnamed: 1, records: 63 },
  { manufacturer: 'Rosen_Aviation', model: '0602-2XX-8', group: 3, unnamed: 1, records: 48 },
] as const;

test('three devices holding codes only the definition reads, composed whole, press as Logitech compiled them on a Harmony One, word for word',
  needing(skipWithoutIrArchiveSample(), skipUnless('h650_panasonic_config')), () => {
    const base = open('h650_panasonic_config');
    const theirs = open(HARVEST_THREE);
    const results: string[] = [];
    for (const one of CLOSURE) {
      const codes = catalogueCommands(IR_ARCHIVE_SAMPLE!, catalogueDevice(IR_ARCHIVE_SAMPLE!, one.manufacturer, one.model).codeset!);
      const unnamed = codes.filter(({ keycode }) => statedCode(keycode) === undefined).length;
      const composed = composeCatalogueDevices(base, archiveAt(IR_ARCHIVE_SAMPLE!), [{ manufacturer: one.manufacturer, model: one.model,
        label: 'Test', full: true }], { maxDevices: 99 });
      assert.deepEqual(composed.devices[0]!.leftOut, [], `${one.model}: every catalogue command composes`);
      const c = parse(composed.bytes);
      const ours = recordBlocks(c, devices(c).find((d) => d.name === 'Test')!.group!).map(withoutLead);
      const logitech = new Set(recordBlocks(theirs, one.group).map(withoutLead));
      results.push(`${one.model}: ${unnamed} unnamed, ${ours.filter((r) => logitech.has(r)).length} of ${ours.length}`);
    }
    // Every record, once, held and tail block, is one of Logitech's for the device. The Sony's group holds
    // ten more of Logitech's, the digits again with a first block only, which are not read here.
    assert.deepEqual(results, [
      'TestQuhd: 70 unnamed, 72 of 72',
      'RDR-GXD500: 1 unnamed, 63 of 63',
      '0602-2XX-8: 1 unnamed, 48 of 48',
    ]);
  });

test('the controls: read at the name\'s widths the TestQuhd composes nothing, spelt without its gaps joined no record is Logitech\'s, and built at 1 no press is',
  // The harvest compile it compares against is a lab file, so it skips without the lab as well.
  needing(skipWithoutIrArchiveSample(), skipWithoutLab()), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE_SAMPLE!));
    const codes = catalogueCommands(IR_ARCHIVE_SAMPLE!, catalogueDevice(IR_ARCHIVE_SAMPLE!, 'Gemini', 'TestQuhd').codeset!);
    assert.equal(codes.length, 70);
    // At the name's widths not one code reads, so before this section the device had nothing to compose.
    assert.equal(codes.filter(({ keycode }) => composableKeycode(keycode)).length, 0);
    const theirs = recordBlocks(open(HARVEST_THREE), 1);
    const theirOnce = new Set(theirs.map((blocks) => withoutLead(blocks.slice(0, 1))));
    const theirTrains = new Set(theirs.map((blocks) =>
      train(blocks[0]!.split(',').map(Number).map((word) => ({ mark: (word & 0x8000) !== 0, us: word & 0x7fff })))));
    // A press as the writer spells it, from its first mark on, the way `withoutLead` reads Logitech's.
    const fromFirstMark = (words: readonly number[]) =>
      words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(',');
    const spelt = (pulses: readonly Pulse[]) =>
      fromFirstMark(compiledBlockWords(pulses).map((one) => (one.mark ? 0x8000 : 0) | one.microseconds));
    // **The control's speller is the one before section 359**: each pulse its own word, which is what
    // `compiledBlockWords` did with pulses no wider than a word, the trailing gap giving up its microsecond.
    const chunkByChunk = (pulses: readonly Pulse[]) => {
      const words = pulses.map((one) => (one.mark ? 0x8000 : 0) | one.us);
      const last = pulses.at(-1)!;
      if (!last.mark && last.us >= 2) words.splice(words.length - 1, 1, last.us - 1, 1);
      return fromFirstMark(words);
    };
    let joined = 0;
    let unjoined = 0;
    let atOne = 0;
    for (const { keycode } of codes) {
      const blocks = catalogueCommandBlocks(keycode, { repeats: 3 }, protocols);
      assert.ok(blocks !== undefined && !('refusal' in blocks), keycode);
      if (theirOnce.has(spelt(blocks.once))) joined += 1;
      const raw = waveformOfArchiveCommand(protocols.get('Microsoft 30 Bit')!, keycode, { repeats: 3, asStored: true });
      assert.ok(!('refusal' in raw));
      if (theirOnce.has(chunkByChunk(raw.once))) unjoined += 1;
      const one = catalogueCommandBlocks(keycode, { repeats: 1 }, protocols);
      assert.ok(one !== undefined && !('refusal' in one));
      if (theirTrains.has(train(one.once))) atOne += 1;
    }
    // Every press joined is one of Logitech's, word for word; the same blocks with the definition's
    // chunks spelt one by one are none of them, though they are the same signal; and at the count the
    // device does not state no press is Logitech's at all, even as a signal.
    assert.equal(joined, 70);
    assert.equal(unjoined, 0);
    assert.equal(atOne, 0);
  });

test('joinedGaps joins a chunked gap and leaves two half cells and a short space apart, and the writer spells the joined silence by the half word rule',
  () => {
    const chunked: Pulse[] = [{ mark: true, us: 441 }, { mark: false, us: 32767 }, { mark: false, us: 32767 },
      { mark: false, us: 3109 }, { mark: true, us: 2632 }];
    assert.deepEqual(joinedGaps(chunked), [{ mark: true, us: 441 }, { mark: false, us: 68643 }, { mark: true, us: 2632 }]);
    // Between two copies, as Logitech's `Microsoft 30 Bit` records hold it: 32767, 17938 and 17938, where the
    // chunks spelt one by one are 32767, 32767 and 3109.
    assert.deepEqual(compiledBlockWords(joinedGaps(chunked)).map((one) => one.microseconds), [441, 32767, 17938, 17938, 2632]);
    // And the speller joins them itself, so a caller handing it the chunks gets the same words.
    assert.deepEqual(compiledBlockWords(chunked), compiledBlockWords(joinedGaps(chunked)));
    // Two half cells of one kind are two cells and stay two: a biphase family stores them as two words.
    const cells: Pulse[] = [{ mark: true, us: 441 }, { mark: false, us: 446 }, { mark: false, us: 446 }];
    assert.deepEqual(joinedGaps(cells), cells);
    // A space under a whole chunk ends the gap, whatever follows it.
    const ended: Pulse[] = [{ mark: false, us: 3109 }, { mark: false, us: 32767 }];
    assert.deepEqual(joinedGaps(ended), ended);
  });

test('the Harmony 350\'s factory configuration holds 30 records of `Philips RC5Ex`, a family only the definition reads, each the definition\'s build at 3',
  needing(skipWithoutIrArchiveSample(), skipUnless('h350_config')), () => {
    const protocols = archiveProtocolsByName(archiveAt(IR_ARCHIVE_SAMPLE!));
    const protocol = protocols.get('Philips RC5Ex')!;
    const known = new Map<string, Set<number>>();
    for (const keycode of new Set(archiveKeycodes().filter((one) => familyOf(one) === 'Philips RC5Ex'))) {
      assert.equal(statedCode(keycode), undefined, 'the name reads no code of the family');
      for (let n = 0; n <= 6; n += 1) {
        const built = waveformOfArchiveCommand(protocol, keycode, { repeats: n, asStored: true });
        if ('refusal' in built || built.once.length === 0) continue;
        const key = train(built.once);
        known.set(key, (known.get(key) ?? new Set()).add(n));
      }
    }
    const c = open('h350_config');
    const counts = new Map<string, number>();
    const groups = new Map<number, number>();
    for (const [at, group] of irGroups(c)!.entries()) {
      for (const address of group.addresses) {
        const [once] = irHeaderPointers(c, address);
        const words = irBlockWords(c, once!)!.filter((word) => word !== 0);
        const found = known.get(train(words.map((word) => ({ mark: (word & 0x8000) !== 0, us: word & 0x7fff }))));
        if (found === undefined) continue;
        const key = [...found].join('/');
        counts.set(key, (counts.get(key) ?? 0) + 1);
        groups.set(at, (groups.get(at) ?? 0) + 1);
      }
    }
    assert.deepEqual([...counts], [['3', 30]]);
    // And the 30 are one whole group, so a record of it the build missed would fail here.
    assert.deepEqual([...groups], [[3, 30]]);
    assert.equal(irGroups(c)![3]!.addresses.length, 30);
  });
