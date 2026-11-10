/**
 * Favourites of ours for a Harmony Touch, a logo of ours drawn as a picture, and what a picture and a favourites
 * document have to be before an answerer hands them to the remote:
 * `packages/codec/src/families/harmony-touch/favourites.ts` and the `favourites address` rule of `check.ts`.
 *
 * **The facts these rest on**, `reference/architectures/harmony-touch/favourites-and-settings.md`: the favourites
 * screen shows the stations of the user's document in their order, a dial position of the tuning device's document
 * gives a station's number, name and picture, and the line up fills what it leaves out; the remote asks every logo at 54
 * by 54. **Read in the screens for this item**, the lab's firmware copy, `juniper/favoritechannel.lua` and
 * `appscommon/harmony.lua`: a channel offered from the line up is added as `{id = station}` appended to the user's
 * stations and nothing else (`addUserFavoriteChannel` given a station, `addIPDevFavoriteChannel`); a channel typed in
 * by number gets a dial position; a second favourite with a number one has is refused (`findDuplicate`); a tile is the
 * logo at its own size centred in 78 by 62 with the number under it (`newChannelImage`), and a file the native decoder
 * cannot read leaves the tile empty (`draws/widgets/image.lua`, `draw` returning on no surface); the screens'
 * request list drops an address already in it (`addToResourceRequests`), so a channel both a favourite and a popular
 * channel has its logo asked once.
 *
 * **What the recorded pictures are**, measured here: the ten pictures of the full sync are PNG, eight bits a channel,
 * colour type 6, not interlaced: a background of 240 by 320 and its twin of 60 by 80, one uploaded logo of 54 by 44
 * and seven station logos of 54 by 54; each passes `readPng` and `pictureRefusals`, so the answerer's replay of
 * Logitech's answers passes the gate.
 *
 * **A favourites document at an address the remote never asks for costs the remote nothing**, so the gate,
 * `refusalsBeforeASync`, lets it through and `favouritesAddressFindings` finds it, for a set's builder to refuse.
 *
 * **Negative results kept**: a picture larger than its box, a 16 bit or truecolour picture without alpha, an
 * interlaced one, a file with a byte of its image data flipped, one cut short, one with bytes after its end and one
 * whose rows name an undefined filter are each refused; a description that changes nothing is refused.
 *
 * **Sources checked first**: the reference pages above, the screens in the lab, `png.ts` and `typeface.ts` for the one
 * encoder and the one typeface. Logitech's client was not consulted: what the remote reads is the screens'.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';

import * as lab from '@harmony/lab';

import { encodePng, readPng } from '../../../src/screens/png.ts';
import { favouritesAddressFindings, refusalsBeforeASync } from '../../../src/families/harmony-touch/check.ts';
import { ComposeRefusal } from '../../../src/families/harmony-touch/compose.ts';
import { CONTENT_SERVICE, CONTENT_USER, documentsOfAnswers, type SyncDocuments } from '../../../src/families/harmony-touch/documents.ts';
import {
  FAVOURITES_LIMIT, LOGO_BOX, LOGO_COLOURS, composeTouchFavourites, drawTouchLogo, pictureRefusals, type OwnFavourites,
} from '../../../src/families/harmony-touch/favourites.ts';
import { readConfiguration, stationLogo } from '../../../src/families/harmony-touch/read.ts';
import { FULL, answersOf } from './touch-sync.ts';
import '../../../src/support/resources.node.ts';

const SIX = 'touch_activity_set_back';
const STATION = stationLogo('station');
const UPLOADED = 'content-image://1.0/image/picture.png;maxX=54;maxY=54';

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));

/** The six the bench Touch holds since 8.2's put back, with the favourites documents of the recorded full sync. */
function held(): SyncDocuments {
  const recorded = documentsOfAnswers(answersOf(FULL));
  const favourites = Object.fromEntries(Object.entries(recorded).filter(([k]) => k.startsWith('content://')));
  return { ...favourites, ...documentsOfAnswers((json(SIX) as { answers: { uri: string; resource: unknown }[] }).answers) };
}

const THE_DESCRIPTION: OwnFavourites = { add: ['61'], order: ['61', '4', '3', '2', '1', '666'], logos: [{ channel: '61', text: '8.3' }] };
const numbersOf = (documents: SyncDocuments): (string | undefined)[] => readConfiguration(documents).favourites[0]!.favourites.map((f) => f.number);

// ---------------------------------------------------------------------------------------------------
// The reader of a PNG, beside the writer
// ---------------------------------------------------------------------------------------------------

test('readPng reads back what encodePng writes, truecolour and with alpha', () => {
  const rgb = encodePng(3, 2, new Uint8Array(18).fill(7));
  assert.deepEqual({ ...readPng(rgb), chunks: [...readPng(rgb).chunks] }, { width: 3, height: 2, bitDepth: 8, colourType: 2, interlace: 0, chunks: ['IHDR', 'IDAT', 'IEND'] });
  const rgba = encodePng(3, 2, new Uint8Array(24).fill(7), 4);
  assert.equal(readPng(rgba).colourType, 6);
  assert.throws(() => encodePng(3, 2, new Uint8Array(18), 4), /bytes are not 2 rows of 12/);
});

test('readPng refuses a file that does not decode, each the way it fails', () => {
  const good = encodePng(4, 4, new Uint8Array(64), 4);
  const flipped = good.slice();
  flipped[45] = flipped[45]! ^ 0x01;
  assert.throws(() => readPng(flipped), /CRC is wrong/);
  assert.throws(() => readPng(good.slice(0, good.length - 6)), /cut short|runs past/);
  assert.throws(() => readPng(new Uint8Array([...good, 0, 0, 0, 0])), /follow the IEND|cut short/);
  assert.throws(() => readPng(new Uint8Array([0, ...good.slice(1)])), /signature/);
  // Rows naming filter 9, which PNG does not define, put in a file whose every chunk is otherwise right.
  const raw = new Uint8Array(4 * (1 + 16));
  raw[0] = 9;
  const bad = framed(4, 4, 6, 0, deflateSync(raw));
  assert.throws(() => readPng(bad), /filter 9/);
  // Image data one row short.
  assert.throws(() => readPng(framed(4, 4, 6, 0, deflateSync(new Uint8Array(3 * 17)))), /inflates to 51 bytes/);
});

/** A PNG by hand from its header fields and its compressed data, its CRCs right, for the cases `encodePng` never writes. */
function framed(width: number, height: number, colourType: number, interlace: number, idat: Uint8Array, bitDepth = 8): Uint8Array {
  const crc = (bytes: Uint8Array): number => {
    let c = 0xffffffff;
    for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (kind: string, body: Uint8Array): number[] => {
    const named = new Uint8Array([...new TextEncoder().encode(kind), ...body]);
    const out = new Uint8Array(12 + body.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, body.length);
    out.set(named, 4);
    v.setUint32(8 + body.length, crc(named));
    return [...out];
  };
  const header = new Uint8Array(13);
  const v = new DataView(header.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  header[8] = bitDepth;
  header[9] = colourType;
  header[12] = interlace;
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk('IHDR', header), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array())]);
}

// ---------------------------------------------------------------------------------------------------
// The logo of ours
// ---------------------------------------------------------------------------------------------------

test('a logo of ours is 54 by 54 with alpha, every pixel opaque, its two colours, and the same bytes every time', () => {
  const png = drawTouchLogo('8.3');
  assert.deepEqual(png, drawTouchLogo('8.3'));
  const h = readPng(png);
  assert.deepEqual([h.width, h.height, h.bitDepth, h.colourType, h.interlace], [LOGO_BOX.width, LOGO_BOX.height, 8, 6, 0]);
  assert.deepEqual(pictureRefusals(STATION, png), []);
  assert.deepEqual(pictureRefusals(UPLOADED, png), []);
  // The pixels, out of the one IDAT `encodePng` writes, its rows unfiltered (filter 0).
  const view = new DataView(png.buffer, png.byteOffset);
  const idatAt = 8 + 25;
  const raw = inflateSync(png.subarray(idatAt + 8, idatAt + 8 + view.getUint32(idatAt)));
  const pixel = (x: number, y: number): number[] => [...raw.subarray(y * (1 + 54 * 4) + 1 + x * 4, y * (1 + 54 * 4) + 1 + x * 4 + 4)];
  const all = Array.from({ length: 54 * 54 }, (_, k) => pixel(k % 54, Math.floor(k / 54)));
  assert.ok(all.every((p) => p[3] === 255), 'every pixel opaque');
  assert.deepEqual(pixel(0, 0), [...LOGO_COLOURS.ink, 255]);
  assert.deepEqual(pixel(4, 4), [...LOGO_COLOURS.ground, 255]);
  // Every pixel a blend of the two colours, and both well represented: the text is there and so is its ground.
  const inked = all.filter((p) => p[0] === LOGO_COLOURS.ink[0] && p[1] === LOGO_COLOURS.ink[1] && p[2] === LOGO_COLOURS.ink[2]).length;
  const ground = all.filter((p) => p[0] === LOGO_COLOURS.ground[0] && p[1] === LOGO_COLOURS.ground[1] && p[2] === LOGO_COLOURS.ground[2]).length;
  assert.ok(inked > 54 * 4 * 3 && ground > 54 * 54 / 3, `${inked} ink and ${ground} ground pixels`);
  assert.ok(all.every((p) => p[2]! >= Math.min(LOGO_COLOURS.ink[2], LOGO_COLOURS.ground[2]) && p[2]! <= Math.max(LOGO_COLOURS.ink[2], LOGO_COLOURS.ground[2])));
  // The contrast of the two colours, WCAG's ratio of relative luminances: 7.90, past 7, its strictest grade for text.
  const lum = ([r, g, b]: readonly number[]): number => {
    const lin = (c: number): number => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  };
  const ratio = (lum(LOGO_COLOURS.ground) + 0.05) / (lum(LOGO_COLOURS.ink) + 0.05);
  assert.equal(ratio.toFixed(2), '7.90');
});

test('a logo\'s text is one to four characters the typeface draws', () => {
  for (const text of ['', '12345', ' 8', '8 ']) assert.throws(() => drawTouchLogo(text), ComposeRefusal, JSON.stringify(text));
  assert.throws(() => drawTouchLogo('一'), /draws no/);
});

// ---------------------------------------------------------------------------------------------------
// What a picture has to be
// ---------------------------------------------------------------------------------------------------

test('a picture is refused off a logo\'s address, larger than its box, in another form, interlaced, or not decoding', () => {
  const logo = drawTouchLogo('8.3');
  assert.match(pictureRefusals('content-image://1.0/externalImage/a;maxX=108;maxY=108', logo)[0]!, /not at the address of a channel logo or a background/);
  assert.deepEqual(pictureRefusals('https://example.invalid/a.png', logo), []);
  assert.match(pictureRefusals('https://example.invalid/a_small.png', encodePng(61, 80, new Uint8Array(61 * 80 * 4), 4))[0]!, /larger than the 60 by 80 a background is drawn in/);
  assert.match(pictureRefusals(stationLogo('station').replace('maxX=54', 'maxX=40'), logo)[0]!, /54 by 54, larger than the 40 by 54/);
  assert.match(pictureRefusals(STATION, encodePng(60, 60, new Uint8Array(60 * 60 * 4), 4))[0]!, /larger than the 54 by 54/);
  assert.match(pictureRefusals(STATION, encodePng(54, 54, new Uint8Array(54 * 54 * 3)))[0]!, /colour type 2/);
  assert.match(pictureRefusals(STATION, framed(2, 2, 6, 0, deflateSync(new Uint8Array(2 * (1 + 16))), 16))[0]!, /16 bits/);
  assert.ok(pictureRefusals(STATION, framed(2, 2, 6, 1, deflateSync(new Uint8Array(8)))).some((r) => /interlaced/.test(r)));
  assert.match(pictureRefusals(STATION, logo.slice(0, 40))[0]!, /does not decode/);
});

test('every picture the recorded full sync delivered passes the picture rule, its two backgrounds and its eight logos',
  lab.needing(lab.skipUnless(FULL)), () => {
    const pictures = answersOf(FULL).filter((a) => (a as { 'body-type'?: string })['body-type'] === 'image/png');
    assert.equal(pictures.length, 10);
    const forms = pictures.map((a) => {
      const h = readPng(Buffer.from(String(a.resource), 'base64'));
      return `${h.width}x${h.height} ${h.bitDepth} ${h.colourType} ${h.interlace}`;
    });
    assert.deepEqual(forms, ['240x320 8 6 0', '60x80 8 6 0', '54x44 8 6 0', ...Array<string>(7).fill('54x54 8 6 0')]);
    const verdicts = pictures.map((a) => pictureRefusals(a.uri, Buffer.from(String(a.resource), 'base64')));
    assert.deepEqual(verdicts.map((v) => v.length), Array<number>(10).fill(0));
  });

// ---------------------------------------------------------------------------------------------------
// Composing favourites
// ---------------------------------------------------------------------------------------------------

test('the 8.3 favourites change the user\'s document alone: the channel added from the line up first, the five reversed, a logo at its station\'s address',
  lab.needing(lab.skipUnless(SIX, FULL)), () => {
    const documents = held();
    assert.deepEqual(numbersOf(documents), ['666', '1', '2', '3', '4']);
    const out = composeTouchFavourites(THE_DESCRIPTION, documents);
    const changed = Object.keys(out.documents);
    assert.equal(changed.length, 1);
    assert.ok(changed[0]!.startsWith(CONTENT_USER));
    const after = { ...documents, ...out.documents };
    assert.deepEqual(numbersOf(after), THE_DESCRIPTION.order);
    const read = readConfiguration(after).favourites[0]!;
    const added = read.favourites[0]!;
    // The channel added carries no dial position: its number, name and logo are the line up's.
    assert.deepEqual([added.dial, added.numberAt?.document, added.added, added.logo], [undefined, 'ContentService', false, stationLogo(added.station)]);
    // The other five as they were, each from its dial position.
    assert.ok(read.favourites.slice(1).every((f) => f.numberAt?.document === 'ContentDevice'));
    assert.deepEqual(out.pictures.map((p) => p.uri), [added.logo]);
    assert.deepEqual(out.pictures[0]!.png, drawTouchLogo('8.3'));
    // Every station entry of the source is carried as it was, only moved, and the document is otherwise equal.
    const before = documents[changed[0]!] as Record<string, unknown>;
    const now = out.documents[changed[0]!] as Record<string, unknown>;
    assert.deepEqual(Object.keys(now), Object.keys(before));
    assert.deepEqual({ ...now, preferences: null }, { ...before, preferences: null });
    // And the gate passes the six with it.
    assert.deepEqual(refusalsBeforeASync(after), []);
  });

test('composing favourites refuses what the remote would refuse or never show', lab.needing(lab.skipUnless(SIX, FULL)), () => {
  const documents = held();
  const refused = (d: OwnFavourites, pattern: RegExp): void => {
    assert.throws(() => composeTouchFavourites(d, documents), (e: unknown) => e instanceof ComposeRefusal && pattern.test(e.message), JSON.stringify(d));
  };
  refused({ add: ['99999'], order: ['666', '1', '2', '3', '4', '99999'] }, /not a channel of the line up/);
  refused({ add: ['1'], order: ['666', '1', '2', '3', '4'] }, /already a favourite/);
  // NPO 1's station is on the line up a second time, at 925: the station is a favourite under another number.
  refused({ add: ['925'], order: ['666', '1', '2', '3', '4', '925'] }, /already a favourite under another number/);
  refused({ order: ['666', '1', '2', '3'] }, /every one of the 5 favourites/);
  refused({ order: ['666', '1', '2', '3', '3'] }, /every one of the 5 favourites/);
  refused({ order: ['666', '1', '2', '3', '4'] }, /changes nothing/);
  refused({ order: ['666', '1', '2', '3', '4'], logos: [{ channel: '61', text: 'x' }] }, /not a favourite/);
  refused({ order: ['666', '1', '2', '3', '4'], logos: [{ channel: '1', text: 'a' }, { channel: '1', text: 'b' }] }, /two logos/);
  // More than the remote holds: 46 channels of the line up added to its five.
  const channels = (documents[Object.keys(documents).find((k) => k.startsWith(CONTENT_SERVICE))!] as { channels: { number: string; station: { id: string } }[] }).channels;
  const favouriteStations = new Set(readConfiguration(documents).favourites[0]!.favourites.map((f) => f.station));
  const free = channels.filter((c) => !favouriteStations.has(c.station.id)).map((c) => c.number);
  const stations = new Set<string>();
  const add = free.filter((n) => { const s = channels.find((c) => c.number === n)!.station.id; if (stations.has(s)) return false; stations.add(s); return true; })
    .slice(0, FAVOURITES_LIMIT - 4);
  refused({ add, order: ['666', '1', '2', '3', '4', ...add] }, /51 favourites, where the remote holds 50/);
});

// ---------------------------------------------------------------------------------------------------
// The favourites address rule of the gate
// ---------------------------------------------------------------------------------------------------

test('a favourites document at an address the set\'s own documents never ask for, or a line up with nothing to place it, is found, and the gate lets it through',
  lab.needing(lab.skipUnless(SIX, FULL)), () => {
    const documents = held();
    const six = documentsOfAnswers((json(SIX) as { answers: { uri: string; resource: unknown }[] }).answers);
    const user = Object.keys(documents).find((k) => k.startsWith(CONTENT_USER))!;
    const service = Object.keys(documents).find((k) => k.startsWith(CONTENT_SERVICE))!;
    assert.deepEqual(favouritesAddressFindings({ ...six, [user]: documents[user] }), []);
    const elsewhere = favouritesAddressFindings({ ...six, [`${user}x`]: documents[user] });
    assert.deepEqual(elsewhere.map((f) => [f.rule, f.effect, f.document]), [['favourites address', 'refused', 'ContentUser']]);
    // The line up alone: with no user's document the service it is asked under is not named, so it cannot be placed.
    assert.deepEqual(favouritesAddressFindings({ ...six, [service]: documents[service] }).map((f) => f.rule), ['favourites address']);
    assert.deepEqual(favouritesAddressFindings({ ...six, [user]: documents[user], [service]: documents[service] }), []);
    // A finding never quotes the address; and the gate passes all of them, since none costs the remote anything.
    assert.ok(elsewhere.every((f) => !f.message.includes('content://') && !f.document.includes('content://')));
    assert.deepEqual(refusalsBeforeASync({ ...six, [`${user}x`]: documents[user] }), []);
  });
