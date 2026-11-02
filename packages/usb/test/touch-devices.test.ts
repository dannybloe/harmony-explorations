/**
 * What a Harmony Touch is given about its devices and their infrared, measured on one recorded sync: two
 * documents of Logitech's service, a device list and a protocol list, and the second is Logitech's own
 * catalogue definition of each protocol family, unchanged.
 *
 * **The question.** `todo-touch.md` 3.1 asks what the Touch does with each document of its configuration.
 * `touch-sync.test.ts` and `touch-sync-both-ways.test.ts` showed that the configuration is six documents of
 * Logitech's data model, handed to the remote as the service answered them. This file asks what two of
 * them, `DeviceList` and `ProtocolList`, hold in the shape the remote reads them, and how they relate to
 * the catalogue and to each other. What the remote's engine does with them is read in the firmware and
 * asserted by `tests/test_harmony_touch_devices.py`; the reference page is
 * `reference/architectures/harmony-touch/devices-and-infrared.md`.
 *
 * **What it measured.**
 *
 * 1. **The shapes.** `DeviceList` is one key, `DevicesWithFeatures`, a list of entries each holding exactly
 *    `Device`, `DeviceFeatures` and `Commands`; `ProtocolList` is one key, `Protocols`, every entry an
 *    `IrProtocol`. Seven devices, 373 commands, five protocols. Every device record states the same 56
 *    fields, so a writer has one shape to carry.
 * 2. **Commands and protocols join both ways.** Every command's `ProtocolId` names a protocol of the list,
 *    373 of 373, and every protocol is named by a command, 5 of 5: the list holds the families the devices
 *    use and nothing else.
 * 3. **The key code grammar**, the catalogue's (`reference/infrared/families.md`): every key code is
 *    `G:`, the named protocol's own `Name`, three bracketed groups and `:3`, 373 of 373.
 * 4. **The key code and the definition's `KeyCode` field state the same shape.** A definition's `KeyCode`
 *    lists, per group (start, repeat, finish), the segments a block is made of, each an encoded segment
 *    (type 1) or a code segment of literal durations (type 0). Every command's three groups have as many
 *    items as its protocol's lists, a value where an encoded segment stands and a word where a code segment
 *    stands, 373 of 373. Two different fields, one per command and one per family, so the agreement is not
 *    met by construction. It is why the engine can take the structure from each command's key code and
 *    never read the definition's `KeyCode` field; the evidence that it does not is that no file of the
 *    image names that field's `SegmentName`, `tests/test_harmony_touch_devices.py`.
 * 5. **The protocol list is the catalogue's definitions verbatim.** Each of the five entries deep equals,
 *    as parsed JSON, the `definition` of the same family in the infrared archive of Logitech's catalogue,
 *    and its `Id-` is the catalogue's protocol id, 5 of 5. The negative: the five are pairwise distinct,
 *    and one atom changed breaks the equality. Skips without the archive.
 * 6. **Every code segment in the catalogue states its header and its trailer inside its atoms**, 155 of
 *    155, and none carries a payload. The engine reads a code segment's atoms alone, so it drops nothing a
 *    code segment of any family states. Catalogue wide, so wider than the sync; skips without the archive.
 * 7. **One of the five families states a toggle bit**, Microsoft 30 Bit, at a position inside its frame.
 * 8. **Logitech's service hands out the account's `ProtocolList` and `DeviceList`.** The client fetched
 *    each with one `GET` on the account's `json2` address, and the answer is, as parsed JSON, the document
 *    the remote received. `reference/logitech/data-model/model.md` says the service hands out no protocol
 *    list and that a device list fails the same way, from probes of another address form; this is the
 *    measurement that corrects it. The page footnotes this one "Stated by Logitech, by their service",
 *    since what it shows is what the service answers, not what the remote did.
 * 9. **The width.** No command is learned, carries a raw code or goes anywhere but infrared: `Raw` null,
 *    `IsLearned` false and `TransportType` 1 on 373 of 373, `Transport` 1 on 7 of 7. So the raw code path,
 *    Bluetooth, keyboard and IP are read in the engine and not exercised here.
 *
 * **What it rules out.** That a Touch's protocol definitions are compiled, trimmed or translated for it:
 * they are the catalogue's, field for field. And that the protocol list carries families no device uses.
 *
 * **Width.** One sync, one Touch on firmware 4.15.330, one account of seven infrared devices using five
 * families, one client, Harmony Desktop. The catalogue wide check of item 6 covers every family the
 * archive holds.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/usb.md` and its two tests,
 * `reference/infrared/families.md` and `sending.md`, `reference/logitech/data-model/model.md`, the Touch
 * engine decompiled in the lab (its user configuration reader, protocol model and infrared manager), the
 * archive's protocol files, and `docs/findings.md` sections 159, 228, 233 and 348 on the catalogue's
 * notation. Logitech's desktop clients were not consulted: the remote, not the client, reads these
 * documents, and the client hands them over unchanged (`touch-sync.test.ts`).
 *
 * The fixture holds the test account's data, an auth token and the unit's serial, so this file asserts
 * names, counts, structure and equalities and prints no value out of the account. The protocol
 * definitions are Logitech's catalogue data, not the account's. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import * as lab from '@harmony/lab';
import { commands, records, resource, sessions, text } from './touch-recording.ts';
import type { Record_ } from './touch-recording.ts';

const FULL = 'touch_full_sync_recording';

/** One answer the client writes back to the remote, as `touch-sync-both-ways.test.ts` reads it. */
interface Answer {
  uri: string;
  resource?: unknown;
}

interface Atom { Type: number; Value: number }
interface SegmentRef { SegmentName: string; SegmentType: number }
interface IrSegment { Name: string; TotalLength: number; Payload: { NumberOfBits: number; ToggleBit: number | null } }
interface CodeSegment { Name: string; Atoms: Atom[] | null; Header: Atom[] | null; Trailer: Atom[] | null; Payload: unknown }
interface Protocol {
  __type: string;
  'Id-': number;
  Name: string;
  CarrierFrequency: number;
  IRSegments: IrSegment[];
  CodeSegments: CodeSegment[];
  KeyCode: { Start: SegmentRef[] | null; Repeat: SegmentRef[] | null; Finish: SegmentRef[] | null };
}
interface Command { Name: string; KeyCode: string; ProtocolId: number; TransportType: number; Raw: unknown; IsLearned: boolean }
interface Entry { Device: Record<string, unknown>; DeviceFeatures: unknown[]; Commands: Command[] }

/**
 * The documents the remote received, by the last segment of their logical address. The same reading
 * as `answers` in `touch-sync-both-ways.test.ts`, which keeps it private; it belongs in `touch-recording.ts`.
 */
function received(): Map<string, unknown> {
  const hlapi = sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi');
  const out = new Map<string, unknown>();
  for (const w of hlapi.filter((s) => s.mode === 'W').map((s) => text(s.written))) {
    if (!w.startsWith('vnd.logitech.proxy/vnd.logitech.response?write')) continue;
    for (const a of (JSON.parse(decodeURIComponent(w.split('&responses=')[1]!)) as { responses: Answer[] }).responses) {
      if (a.uri.startsWith('harmony://')) out.set(resource(a.uri), a.resource);
    }
  }
  return out;
}

const deviceList = (): { DevicesWithFeatures: Entry[] } => received().get('DeviceList') as { DevicesWithFeatures: Entry[] };
const protocolList = (): { Protocols: Protocol[] } => received().get('ProtocolList') as { Protocols: Protocol[] };
const allCommands = (): Command[] => deviceList().DevicesWithFeatures.flatMap((d) => d.Commands);

/** The catalogue's protocol files, each with its family name, its definition and Logitech's id. */
function catalogue(): { name: string; definition: unknown; logitechProtocolId: number | null }[] {
  const directory = lab.irArchivePath('protocols')!;
  return readdirSync(directory)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort()
    .map((f) => JSON.parse(readFileSync(join(directory, f), 'utf8')) as { name: string; definition: unknown; logitechProtocolId: number | null });
}

/** A key code's three bracketed groups, each split into its items, as the catalogue's grammar writes them. */
const KEY_CODE = /^G:([^:]+):\(([^()]*)\)\(([^()]*)\)\(([^()]*)\):(\d+)$/;
function groups(keyCode: string): string[][] {
  const m = KEY_CODE.exec(keyCode);
  assert.ok(m, 'a key code of the catalogue grammar');
  return [m[2]!, m[3]!, m[4]!].map((g) => (g === '' ? [] : g.split('_')));
}

/** A value item is a one character position, an `x` and digits; anything else is a word. */
const isValue = (item: string): boolean => item[1] === 'x';

test('a Touch is given its devices as one list of devices with features and commands, and its protocols as one list', lab.skipUnless(FULL), () => {
  const devices = deviceList();
  const protocols = protocolList();
  assert.deepEqual(Object.keys(devices), ['DevicesWithFeatures']);
  assert.deepEqual(Object.keys(protocols), ['Protocols']);
  for (const entry of devices.DevicesWithFeatures) assert.deepEqual(Object.keys(entry).sort(), ['Commands', 'Device', 'DeviceFeatures']);
  assert.equal(devices.DevicesWithFeatures.length, 7);
  assert.equal(allCommands().length, 373);
  assert.deepEqual(protocols.Protocols.map((p) => p.__type), Array(5).fill('IrProtocol'));
});

test('every device record states the same fields', lab.skipUnless(FULL), () => {
  const shapes = new Set(deviceList().DevicesWithFeatures.map((d) => Object.keys(d.Device).sort().join(' ')));
  assert.equal(shapes.size, 1, 'one shape across the seven');
  assert.equal([...shapes][0]!.split(' ').length, 56);
});

test('every command names a protocol of the list, and every protocol of the list is named by a command', lab.skipUnless(FULL), () => {
  const ids = new Set(protocolList().Protocols.map((p) => String(p['Id-'])));
  const named = allCommands().map((c) => String(c.ProtocolId));
  assert.equal(named.filter((id) => ids.has(id)).length, 373);
  assert.deepEqual([...new Set(named)].sort(), [...ids].sort());
});

test('every key code is G, its protocol name, three bracketed groups and 3', lab.skipUnless(FULL), () => {
  const byId = new Map(protocolList().Protocols.map((p) => [String(p['Id-']), p]));
  let matched = 0;
  for (const c of allCommands()) {
    const m = KEY_CODE.exec(c.KeyCode);
    if (m && m[1] === byId.get(String(c.ProtocolId))!.Name && m[5] === '3') matched += 1;
  }
  assert.equal(matched, 373);
});

test('every key code has the shape its protocol\'s KeyCode field states, a value for an encoded segment and a word for a code segment', lab.skipUnless(FULL), () => {
  const byId = new Map(protocolList().Protocols.map((p) => [String(p['Id-']), p]));
  let agree = 0;
  for (const c of allCommands()) {
    const p = byId.get(String(c.ProtocolId))!;
    const stated = [p.KeyCode.Start, p.KeyCode.Repeat, p.KeyCode.Finish].map((g) => (g ?? []).map((r) => (r.SegmentType === 1 ? 'value' : 'word')));
    const written = groups(c.KeyCode).map((g) => g.map((item) => (isValue(item) ? 'value' : 'word')));
    if (JSON.stringify(stated) === JSON.stringify(written)) agree += 1;
  }
  assert.equal(agree, 373);
});

test('one family of the five states a toggle bit, at a position inside its frame', lab.skipUnless(FULL), () => {
  const toggling = protocolList().Protocols.flatMap((p) => p.IRSegments.filter((s) => s.Payload.ToggleBit !== null).map((s) => ({ p, s })));
  assert.deepEqual(toggling.map((t) => t.p.Name), ['Microsoft 30 Bit']);
  const { s } = toggling[0]!;
  // A position, not a bound on a total: the bit has to be one of the frame's own.
  assert.equal(Number.isInteger(s.Payload.ToggleBit) && s.Payload.ToggleBit! >= 0 && s.Payload.ToggleBit! < s.Payload.NumberOfBits, true, 'inside the frame');
});

test('rounding and truncating the carrier period differ on the two 38 kHz families of the five and agree on the rest', lab.skipUnless(FULL), () => {
  // The engine takes the period through a conversion that rounds, `tests/test_harmony_touch_devices.py`;
  // a compiled configuration states it truncated, `reference/infrared/sending.md`.
  const differ = protocolList().Protocols.filter((p) => Math.round(1e9 / p.CarrierFrequency) !== Math.floor(1e9 / p.CarrierFrequency));
  assert.equal(differ.length, 2);
  assert.deepEqual(differ.map((p) => p.CarrierFrequency), [38000, 38000]);
});

test('each protocol a Touch is given is Logitech\'s catalogue definition, unchanged, under the catalogue\'s own id', lab.needing(lab.skipUnless(FULL), lab.skipWithoutIrArchive()), () => {
  const byName = new Map(catalogue().map((c) => [c.name, c]));
  const given = protocolList().Protocols;
  let equal = 0;
  let sameId = 0;
  for (const p of given) {
    const c = byName.get(p.Name)!;
    assert.ok(c, `the catalogue holds ${p.Name}`);
    assert.deepEqual(p, c.definition);
    equal += 1;
    if (p['Id-'] === c.logitechProtocolId) sameId += 1;
  }
  assert.equal(equal, 5);
  assert.equal(sameId, 5);
  // The negative: the five are pairwise distinct, so equality is not met by accident, and one atom
  // changed is no longer the catalogue's definition.
  assert.equal(new Set(given.map((p) => JSON.stringify(p))).size, 5);
  const changed = structuredClone(given[0]!);
  changed.IRSegments[0]!.TotalLength += 1;
  assert.notDeepEqual(changed, byName.get(changed.Name)!.definition);
});

test('every code segment in the catalogue states its header and trailer inside its atoms and carries no payload', lab.skipWithoutIrArchive(), () => {
  const same = (a: Atom[], b: Atom[]) => a.length === b.length && a.every((x, i) => x.Type === b[i]!.Type && x.Value === b[i]!.Value);
  let segments = 0;
  let inside = 0;
  let payloads = 0;
  for (const c of catalogue()) {
    for (const s of (c.definition as { CodeSegments: CodeSegment[] | null }).CodeSegments ?? []) {
      segments += 1;
      if (s.Payload !== null && s.Payload !== undefined) payloads += 1;
      const atoms = s.Atoms ?? [];
      const header = s.Header ?? [];
      const trailer = s.Trailer ?? [];
      if (atoms.length > 0 && same(atoms.slice(0, header.length), header) && same(atoms.slice(atoms.length - trailer.length), trailer)) inside += 1;
    }
  }
  assert.equal(segments, 155);
  assert.equal(inside, 155);
  assert.equal(payloads, 0);
});

test('Logitech\'s service hands out the account\'s protocol list and device list, the documents the remote receives', lab.skipUnless(FULL), () => {
  const all: Record_[] = records(FULL);
  const given = received();
  for (const name of ['ProtocolList', 'DeviceList']) {
    const gets = all.filter((r) => (r.kind === 'xhr' || r.kind === 'fetch') && r.method?.toUpperCase() === 'GET'
      && new RegExp(`/UserAccountDirector\\.svc/json2/Account/[0-9]+/${name}$`).test((r.url ?? '').split('?')[0]!));
    assert.equal(gets.length, 1, `one GET of ${name}`);
    assert.equal(typeof gets[0]!.response, 'string');
    assert.deepEqual(JSON.parse(gets[0]!.response as string), given.get(name), `${name} as the remote received it`);
  }
});

test('no command of the sync is learned, carries a raw code or goes anywhere but infrared', lab.skipUnless(FULL), () => {
  const cmds = allCommands();
  assert.equal(cmds.filter((c) => c.Raw === null).length, 373);
  assert.equal(cmds.filter((c) => c.IsLearned === false).length, 373);
  assert.equal(cmds.filter((c) => c.TransportType === 1).length, 373);
  assert.equal(deviceList().DevicesWithFeatures.filter((d) => d.Device['Transport'] === 1).length, 7);
});
