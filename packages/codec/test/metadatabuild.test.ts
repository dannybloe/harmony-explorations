/**
 * The Harmony 300 and 350's metadata archive built from nothing, `todo-compile-350.md` 5.1.4 and plan 011 step 4: our
 * own deflate writes Logitech's streams, and the builder writes each compile's whole section given that compile's
 * devices and its two choices.
 *
 * **What it settled.**
 *
 * * **The stream.** Our deflate, `src/deflate.ts`, writes the stream of the six distinct archives of the seven named
 *   compiles byte for byte from their texts, 6 of 6: the factory 350, the three device 350, the programmed 350, the test setup's
 *   compile (whose twin without favourites holds the same text), the programmed 300 and the 2011 300. Stock zlib
 *   1.2.12 at its defaults does the same, `tests/test_harmony_350_metadata_deflate.py`; Node's zlib does not, here
 *   on the setup's text as in `noscreencensus.test.ts` on three.
 * * **The section.** `noScreenMetadataSection` writes the section, the length word and the ZIP, of all seven
 *   compiles byte for byte, 7 of 7, from each compile's device names and command names (handed in reversed, so the
 *   order is the builder's), its `DeviceId`s and its ZIP time. That is 3033 bytes on each of the setup's two
 *   compiles, 1517, 1171 and 1487 on the other three Harmony 350 files and 970 and 1610 on the two Harmony 300
 *   files: the whole section, the census's "metadata archive" category, with nothing carried. The `DeviceId`s go in
 *   as a first number on the five Harmony 350 files, consecutive, and as a list on the two Harmony 300 files, which
 *   are not.
 * * **The ZIP's shape is shared** with the Harmony 890 and 895: `metadataZip` writes their three archives byte for
 *   byte too from their texts and times, so the container writer is measured on ten files of two architectures and
 *   the frame around the devices on seven of one.
 * * **What the choices own.** The time is four bytes, its word in the local header and again in the central
 *   directory, the date word beside it being the stamp's date; a section built with our time differs from
 *   Logitech's in those four bytes and nowhere else. `noScreenZipTime`
 *   with each compile's own zone lands within three seconds of the time each compile states, the 413 to 419 second
 *   band read from the other side; five of the seven differ by a two second step or more, so their time words differ. The `DeviceId`s are the digits of eight elements' numbers
 *   and whatever the deflate makes of them, so their bytes cannot be separated from the stream's.
 * * **A correction on the way.** Two devices among the 32 name no command, and the archive spells their list
 *   `<Commands/>`; `withMetadataDevice` wrote an open and a close tag, a text Logitech never produced. The device
 *   element is one writer now, `metadataDeviceElement`, used by both.
 *
 * **Wider than the test, measured once and not asserted**: a scan of the whole lab found 27 files carrying a Harmony
 * 300 or 350 archive and 15 distinct streams among them, the longest text 30775 bytes; our deflate writes 14 of the
 * 15, and the fifteenth is a file of ours deflated by Node's zlib before this existed. Over the wider set the ZIP time
 * band is 413 to 420 seconds, and two more of Logitech's files, contributed ones outside the seven, have `DeviceId`s that are not
 * consecutive, so consecutive numbers are a choice and no rule of the model.
 *
 * **What it does not settle.** That another zlib version agrees; a text longer than 30775 bytes, and one past
 * `DEFLATE_MAX_INPUT`, which the deflate refuses; a name holding a character XML escapes, which no compile holds; a
 * ZIP time near midnight; and whether anything reads the archive at all, plan 011's open list.
 *
 * **Sources checked first.** Plan 011 step 4; `src/metadata.ts` and its reader; `reference/config-format/
 * container.md` on the archive; `tests/test_harmony_350_metadata_deflate.py` for which zlib; the census's two tests of
 * the frame and the time, `noscreencensus.test.ts`. Logitech's client compiles nothing for this family. **Which
 * architectures**: the frame and the device element on arch 16 alone, the ZIP's shape on arch 16 and arch 10.
 *
 * Nothing asserts a device or a command name: they are the owners' equipment and stay in the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { LAB, needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import {
  type Container, deflateRaw, metadataArchive, metadataZip, metadataZipTime, noScreenMetadataSection, noScreenZipTime,
  parse, zipTimeOf,
} from '../src/index.ts';

const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const TWIN = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
const FIVE = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'];
const HARMONY_300 = new Set(['h300_config', 'h300_programmed_config']);
const ARCH10 = ['h890_config', 'h890_config_2', 'h895_config'];

const needsLab = needing(skipWithoutLab(), skipUnless(...FIVE));

const lab = (path: string): Container => {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
};

/** The seven compiles of the family the lab holds, by label. */
function seven(): [string, Container][] {
  return [['setup', lab(COMPILE)], ['setup without favourites', lab(TWIN)],
    ...FIVE.map((name): [string, Container] => [name, parse(require_(name))])];
}

/** A compile's archive, as its section, its ZIP and the deflate stream and text inside it. */
function archiveOf(c: Container) {
  const m = metadataArchive(c)!;
  const section = c.blob.subarray(m.offset, m.offset + 4 + m.length);
  const zip = section.subarray(4);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.length);
  const nameLength = view.getUint16(26, true);
  let central = -1;
  for (let at = 30 + nameLength; at + 46 <= zip.length && central < 0; at += 1) if (view.getUint32(at, true) === 0x02014b50) central = at;
  const stream = zip.subarray(30 + nameLength, 30 + nameLength + view.getUint32(central + 20, true));
  return { m, section, zip, stream, text: Buffer.from(m.xml, 'utf8') };
}

test('our deflate writes the stream of the six distinct archives of the seven named compiles, and each inflates to its text', needsLab, () => {
  // Six and not seven: the setup's two compiles hold the same text and the same stream.
  const distinct = new Map<string, ReturnType<typeof archiveOf>>();
  for (const [label, c] of seven()) {
    const one = archiveOf(c);
    const key = Buffer.from(one.stream).toString('hex');
    if (![...distinct.values()].some((seen) => Buffer.from(seen.stream).toString('hex') === key)) distinct.set(label, one);
  }
  assert.equal(distinct.size, 6);
  const equal = [...distinct].filter(([, one]) => Buffer.from(deflateRaw(one.text)).equals(Buffer.from(one.stream))).map(([label]) => label);
  assert.deepEqual(equal, [...distinct.keys()]);
  for (const [label, one] of distinct) {
    assert.deepEqual(Buffer.from(inflateRawSync(deflateRaw(one.text))), Buffer.from(one.text), label);
  }
  // The control: Node's zlib, a fork whose matcher differs, does not write the setup's stream, so the equality is not
  // a property of deflate in general.
  const setup = distinct.get('setup')!;
  assert.ok(!Buffer.from(deflateRawSync(setup.text)).equals(Buffer.from(setup.stream)));
});

test('the builder writes each of the seven compiles\' metadata section byte for byte from its devices and its own choices', needsLab, () => {
  const sizes: Record<string, number> = {};
  for (const [label, c] of seven()) {
    const { m, section } = archiveOf(c);
    // The devices as a setup would hand them in, commands in no particular order: reversed, so the sort is ours.
    const devices = m.devices.map((one) => ({ name: one.name, commands: one.commands.map((command) => command.name).reverse() }));
    const ids = m.devices.map((one) => Number(one.deviceId));
    const deviceIds = HARMONY_300.has(label) ? ids : { first: ids[0]! };
    const built = noScreenMetadataSection(devices, { deviceIds, time: metadataZipTime(section.subarray(4)) });
    assert.deepEqual(Buffer.from(built), Buffer.from(section), label);
    sizes[label] = built.length;
  }
  assert.deepEqual(sizes, {
    'setup': 3033, 'setup without favourites': 3033, 'h350_config': 1517, 'h350_three_devices_config': 1171,
    'h350_programmed_config': 1487, 'h300_config': 970, 'h300_programmed_config': 1610,
  });
});

test('the Harmony 300 files\' DeviceIds are not consecutive, so counting on from the first does not reproduce them', needsLab, () => {
  // The negative of the choice above: the 350 files are written from a first number, and the 300 files cannot be.
  for (const [label, c] of seven().filter(([name]) => HARMONY_300.has(name))) {
    const { m, section } = archiveOf(c);
    const devices = m.devices.map((one) => ({ name: one.name, commands: one.commands.map((command) => command.name) }));
    const built = noScreenMetadataSection(devices, { deviceIds: { first: Number(m.devices[0]!.deviceId) }, time: metadataZipTime(section.subarray(4)) });
    assert.ok(!Buffer.from(built).equals(Buffer.from(section)), label);
  }
});

test('the ZIP time owns four bytes of the section, and our choice of it lands within three seconds of each compile\'s', needsLab, () => {
  const offsets: number[] = [];
  for (const [label, c] of seven()) {
    const { m, section } = archiveOf(c);
    const devices = m.devices.map((one) => ({ name: one.name, commands: one.commands.map((command) => command.name) }));
    const ids = m.devices.map((one) => Number(one.deviceId));
    const stated = metadataZipTime(section.subarray(4));
    // Each compile's zone, the whole hours between its stamp and its ZIP time, which the caller supplies.
    const [date, clock] = c.builtAt!.split('T') as [string, string];
    const [hours, minutes, seconds] = clock.split(':').map(Number) as [number, number, number];
    const zip = zipTimeOf(stated);
    const gap = hours * 3600 + minutes * 60 + seconds - (zip.hour * 3600 + zip.minute * 60 + zip.second);
    const zone = Math.round(gap / 3600);
    const ours = noScreenZipTime(c.builtAt!, zone);
    assert.equal(`${ours.year}-${String(ours.month).padStart(2, '0')}-${String(ours.day).padStart(2, '0')}`, date, label);
    const off = (ours.hour * 3600 + ours.minute * 60 + ours.second) - (zip.hour * 3600 + zip.minute * 60 + zip.second);
    // Built with our time, the section differs from Logitech's in the time word of each of its two headers and
    // nowhere else, the date being the same; and it differs at all exactly when the two times' words differ, the
    // field holding seconds in pairs.
    const built = noScreenMetadataSection(devices, { deviceIds: ids, time: ours });
    assert.equal(built.length, section.length, label);
    const differing = [...built].map((byte, k) => (byte === section[k] ? -1 : k)).filter((k) => k >= 0);
    const zipAt = 4;
    const centralAt = section.length - 22 - 58;
    const timeBytes = new Set([zipAt + 10, zipAt + 11, centralAt + 12, centralAt + 13]);
    assert.ok(differing.every((k) => timeBytes.has(k)), `${label}: ${differing.join(' ')}`);
    const wordsDiffer = Math.floor(ours.second / 2) !== Math.floor(zip.second / 2) || ours.minute !== zip.minute || ours.hour !== zip.hour;
    assert.equal(differing.length > 0, wordsDiffer, label);
    offsets.push(off);
  }
  // Each compile's offset, in the order above, our time less theirs: five of the seven a whole two second step or more
  // away, so the byte comparison above bites on those.
  assert.deepEqual(offsets, [-3, -3, 1, 3, 2, 3, 0]);
});

test('the ZIP around the text is the Harmony 890 and 895\'s shape too: their three archives written byte for byte', skipUnless(...ARCH10), () => {
  for (const name of ARCH10) {
    const { m, zip } = archiveOf(parse(require_(name)));
    assert.deepEqual(Buffer.from(metadataZip(m.xml, metadataZipTime(zip))), Buffer.from(zip), name);
  }
});
