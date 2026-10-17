/**
 * The record reader and builder on a Harmony One screen, `todo-compile-one.md` 4.4.2: the 40 head screens of
 * every One compile read by `recordReading`, put back by `recordOf` and `withModeRecords` from what was read,
 * nothing generated, and the whole file compared byte for byte.
 *
 * What the One adds to the Harmony 650's records, section 405: a page record of seven bytes whose first is the
 * page's hit page, and a page program that calls its chrome, the mode's own program drawn first, with opcode
 * `0x16`. The reader follows the call and spans the chrome as a piece of its own; the builder writes the lead
 * byte and the call's address.
 *
 * Two controls, each of which must fail: one built text byte changed, and two modes' chromes swapped, which
 * keeps every byte of every piece and moves only where a call points.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type BuiltScreen,
  type ContainerPiece,
  assertRebuilt,
  layOutContainer,
  parse,
  recordBuilding,
  recordReading,
  takeApart,
  withModeRecords,
} from '../src/index.ts';
import { blobReader } from '../src/shared/spelling.ts';

/** The nineteen Harmony One compiles: sixteen English of skin 54, two of skin 59 and one Dutch, section 405. */
const ONES = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after', 'one_config', 'one_config_unprogrammed',
  'one_friend_asfound_config'] as const;

/** The head of a One mode table, the 10 firmware screens and the 30 status screens, section 405. */
const HEAD = 40;

type Tamper = (built: BuiltScreen[]) => void;

/** The rebuilt file, its head screens read and put back, after `tamper` has had the built screens. */
function rebuild(name: string, tamper?: Tamper): { out: Uint8Array; structure: number; described: number } {
  const c = parse(require_(name));
  const layout = takeApart(c);
  const r = recordReading(c, layout, blobReader(c));
  const frames = Array.from({ length: HEAD }, (_, m) => r.frame(`mode ${m}`, m));
  const places = frames.map((f, m) => r.placeOf(`mode ${m}`, f));
  const b = recordBuilding(r.homes());
  // A copy of a read piece, its texts drawn inline at the same offsets, so a reference into one finds it.
  const clone = (piece: ContainerPiece): ContainerPiece => {
    const length = r.lengths.get(piece) ?? piece.bytes.length;
    const made = { ...piece, bytes: piece.bytes.slice(0, length), refs: piece.refs.filter((ref) => ref.at < length) };
    for (const [offset, key] of r.inline.get(piece) ?? []) b.inline.set(key, { to: made, offset });
    return made;
  };
  const built: BuiltScreen[] = frames.map((f, m) => {
    const place = places[m] as (typeof places)[number];
    const chromes = place.chromes.map(clone);
    const programs = f.pages.map((pg) => clone(pg.programPiece));
    // A page's call names the chrome as read; it names the copy.
    for (const program of programs) {
      program.refs = program.refs.map((ref) => ('to' in ref && place.chromes.includes(ref.to)
        ? { ...ref, to: chromes[place.chromes.indexOf(ref.to)] as ContainerPiece } : ref));
    }
    const leads = f.pages.map((pg) => pg.page.lead);
    assert.ok(leads.every((lead) => lead !== undefined), `${name} mode ${m}: every One page record has a lead byte`);
    return b.recordOf(clone(f.own).bytes, programs, f.pages.map((pg) => pg.listPiece.bytes.slice(0, pg.list.length)),
      f.pages.map((pg) => c.blob.slice(pg.copyOff, pg.copyOff + pg.copy.length)), f.own.owner,
      { leads: leads as number[], chromes });
  });
  tamper?.(built);
  const out = layOutContainer(withModeRecords(layout, { screens: built, lists: new Map(), inline: b.inline, homes: r.homes() },
    { screens: places, lists: new Map(), lengths: r.lengths, inline: r.inline })).bytes;
  assertRebuilt(out, c, r.regions);
  return { out, structure: r.structure.size, described: r.described.size };
}

test('todo-compile-one 4.4.2: the 40 head screens of every Harmony One compile are read and put back by the record reader and builder, byte for byte on all nineteen',
     skipUnless(...ONES), () => {
  for (const name of ONES) {
    const { structure, described } = rebuild(name);
    // 40 lead bytes described, one per page record; the structure is the same on the eighteen English compiles
    // and larger on the Dutch one, whose head screens draw longer texts.
    assert.deepEqual([structure, described], [name === 'one_friend_asfound_config' ? 5106 : 4995, 40], name);
  }
});

test('todo-compile-one 4.4.2: a changed byte in a built chrome, or two modes\' chromes swapped, is refused by the rebuild check',
     skipUnless('harvest_one_two_devices'), () => {
  // The last byte of mode 10's chrome, its end instruction.
  assert.throws(() => rebuild('harvest_one_two_devices', (built) => {
    const chrome = (built[10] as BuiltScreen).chromes?.[0] as ContainerPiece;
    chrome.bytes[chrome.bytes.length - 1] = (chrome.bytes[chrome.bytes.length - 1] as number) ^ 0xff;
  }), /the built records differ from the configuration's at byte/);
  // Modes 10 and 11 calling each other's chrome: every piece's bytes as read, only the calls moved.
  assert.throws(() => rebuild('harvest_one_two_devices', (built) => {
    const a = built[10] as BuiltScreen;
    const b = built[11] as BuiltScreen;
    const [ca, cb] = [a.chromes?.[0] as ContainerPiece, b.chromes?.[0] as ContainerPiece];
    for (const program of a.programs) program.refs = program.refs.map((ref) => ('to' in ref && ref.to === ca ? { ...ref, to: cb } : ref));
    for (const program of b.programs) program.refs = program.refs.map((ref) => ('to' in ref && ref.to === cb ? { ...ref, to: ca } : ref));
  }), /the built records differ from the configuration's at byte/);
});
