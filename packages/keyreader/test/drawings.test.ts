/**
 * The drawings on the key reader page are the published drawings, with every key, its code and its words,
 * in the order of the face.
 *
 * Read off the **published** `drawings.js` (`built.ts` says why the tests read what a browser runs), and
 * checked against two things it was not made from by the same path: the SVG files in
 * `reference/silhouettes/` as the website serves them, and the `data-scan` and `data-scan-candidates`
 * attributes inside those files, which the drawing generator writes and this build never reads. So a key
 * whose code the page carries wrongly, or a drawing the page shows that is not the published one, fails
 * here even though the build and the generator share the model data.
 *
 * The order the page asks for keys is pinned as a whole for the Harmony 885 and the Harmony 720, because it
 * is what a person meets: the face top to bottom, each row left to right. Its row tolerance has a control:
 * without it the four colour keys, along a curve, are asked outer pair first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODELS } from '@harmony/silhouettes';
import type { Key } from '@harmony/silhouettes';
import { WATCH_BY_SKIN } from '@harmony/usb/keys';
import { OUT_DIR } from '../bin/build.ts';
import { NOT_ASKED, WORDS, faceOrder, printedWord, wordsFor } from '../bin/drawings.ts';
import { publishedModule } from './built.ts';
import type { Drawing } from '../src/session.ts';

const SILHOUETTES = join(OUT_DIR, '..', 'silhouettes');

const { DRAWINGS } = (await publishedModule('drawings.js')) as { DRAWINGS: readonly Drawing[] };

function drawing(id: string): Drawing {
  const found = DRAWINGS.find((d) => d.id === id);
  assert.ok(found !== undefined, `the page carries ${id}`);
  return found;
}

/** Each key group's name and code attributes, read out of an SVG's text. */
function svgKeys(svg: string): Map<string, { scan?: number; candidates: number[] }> {
  const keys = new Map<string, { scan?: number; candidates: number[] }>();
  for (const match of svg.matchAll(/<g class="key-group"[^>]*>/g)) {
    const tag = match[0];
    const name = /data-name="([^"]+)"/.exec(tag)?.[1] as string;
    const scan = /data-scan="(\d+)"/.exec(tag)?.[1];
    const candidates = /data-scan-candidates="([\d ]+)"/.exec(tag)?.[1];
    keys.set(name, {
      ...(scan === undefined ? {} : { scan: Number(scan) }),
      candidates: candidates === undefined ? [] : candidates.split(' ').map(Number),
    });
  }
  return keys;
}

test('the page shows the Harmony 720, 880, 880 Pro and 885, the drawn models whose skins it reads keys on', () => {
  assert.deepEqual(DRAWINGS.map((d) => [d.id, d.label, d.skins]), [
    ['h720', 'Harmony 720', [44]], ['h880', 'Harmony 880', [15]], ['h880pro', 'Harmony 880 Pro', [39]],
    ['h885', 'Harmony 885', [17]],
  ]);
  // And every one of their skins is a skin the page reads, which is what put them here.
  for (const d of DRAWINGS) for (const skin of d.skins) assert.ok(skin in WATCH_BY_SKIN, `skin ${skin}`);
  // Every skin the page reads has a drawing now, so the typed name list, which stays for a model that arrives
  // without one, is shown for none of today's. It was the 880 Pro's and the 720's until
  // `todo-prepare-885.md` 2.5.3 drew them.
  const drawnSkins = new Set(DRAWINGS.flatMap((d) => d.skins));
  assert.deepEqual(Object.keys(WATCH_BY_SKIN).map(Number).filter((skin) => !drawnSkins.has(skin)), []);
});

test('each drawing on the page is the published SVG, less only its xmlns', () => {
  for (const d of DRAWINGS) {
    const published = readFileSync(join(SILHOUETTES, `${d.id}.svg`), 'utf8');
    assert.equal(d.svg, published.replace(' xmlns="http://www.w3.org/2000/svg"', ''), d.id);
    assert.ok(!d.svg.includes('://'), `${d.id} carries no address`);
  }
});

test('every key of each drawing is on the page once, with the code and candidates its SVG states', () => {
  for (const d of DRAWINGS) {
    const inSvg = svgKeys(d.svg);
    assert.deepEqual(d.keys.map((k) => k.name).sort(), [...inSvg.keys()].sort(), d.id);
    for (const key of d.keys) {
      const stated = inSvg.get(key.name);
      assert.equal(key.scan, stated?.scan, `${d.id} ${key.name} scan`);
      assert.deepEqual(key.candidates, stated?.candidates, `${d.id} ${key.name} candidates`);
    }
  }
  // The counts the drawings state of themselves: every key of the 885 measured, 29 of the 880's 53 known,
  // and its two chevron keys narrowed to 20 or 52.
  assert.equal(drawing('h885').keys.filter((k) => k.scan !== undefined).length, 55);
  assert.equal(drawing('h880').keys.length, 53);
  assert.equal(drawing('h880').keys.filter((k) => k.scan !== undefined).length, 29);
  assert.deepEqual(drawing('h880').keys.filter((k) => k.candidates.length > 0).map((k) => [k.name, k.candidates]),
    [['UpArrow', [20, 52]], ['DownArrow', [20, 52]]]);
  // The 880 Pro's 55 and the 720's 49 carry neither a code nor a candidate: one configuration of each is
  // known, and the 880's rule asks for two contributors.
  for (const [id, count] of [['h880pro', 55], ['h720', 49]] as const) {
    assert.equal(drawing(id).keys.length, count, id);
    assert.deepEqual(drawing(id).keys.filter((k) => k.scan !== undefined || k.candidates.length > 0), [], id);
  }
});

test('the 885 is asked for top to bottom, each row left to right, all but Glow', () => {
  // Glow lights the remote and controls no device, and rarely reaches the memory the page reads, so it is on
  // the drawing and out of the order asked, `NOT_ASKED`.
  assert.deepEqual(drawing('h885').keys.filter((k) => k.ask).map((k) => k.name), [
    'AllOff',
    'Activities', 'Help',
    'ScreenLeft1', 'ScreenRight1', 'ScreenLeft2', 'ScreenRight2', 'ScreenLeft3', 'ScreenRight3', 'ScreenLeft4', 'ScreenRight4',
    'ScreenPrev', 'ScreenNext',
    'VolumeMute', 'Device', 'Media', 'PrevChannel',
    'VolumeUp', 'DirectionUp', 'ChannelUp',
    'DirectionLeft', 'Select', 'DirectionRight',
    'VolumeDown', 'DirectionDown', 'ChannelDown',
    'Red', 'Green', 'Yellow', 'Blue',
    'Menu', 'Exit', 'Guide', 'Info',
    'Stop', 'SkipBack', 'SkipForward', 'Play',
    'Record', 'Rewind', 'FastForward', 'Pause',
    'Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8', 'Number9',
    'Clear', 'Number0', 'Enter',
  ]);
  assert.deepEqual(DRAWINGS.flatMap((d) => d.keys.filter((k) => !k.ask).map((k) => `${d.id} ${k.name}`)),
    ['h880 Glow', 'h880pro Glow', 'h885 Glow']);
  assert.deepEqual(Object.keys(NOT_ASKED), ['Glow']);
  // And it is still drawn in face order, between the arrow keys under the screen.
  const all = drawing('h885').keys.map((k) => k.name);
  assert.deepEqual(all.slice(all.indexOf('ScreenPrev'), all.indexOf('ScreenPrev') + 3), ['ScreenPrev', 'Glow', 'ScreenNext']);
  // The 880 is the same face with its two chevron keys where the 885 has four colour keys.
  const h880 = drawing('h880').keys.map((k) => k.name);
  assert.deepEqual(h880.slice(h880.indexOf('ChannelDown') + 1, h880.indexOf('Menu')), ['UpArrow', 'DownArrow']);
  // And the 880 Pro with its four printed keys there, and SOUND and PIC on the row of Device and Media.
  const pro = drawing('h880pro').keys.map((k) => k.name);
  assert.deepEqual(pro.slice(pro.indexOf('ChannelDown') + 1, pro.indexOf('Menu')),
    ['VolumeMute', 'DownArrow', 'UpArrow', 'PrevChannel']);
  assert.deepEqual(pro.slice(pro.indexOf('ScreenNext') + 1, pro.indexOf('VolumeUp')), ['Sound', 'Device', 'Media', 'Picture']);
});

test('the 720 is asked for top to bottom, each row left to right, every key', () => {
  assert.deepEqual(drawing('h720').keys.filter((k) => k.ask).map((k) => k.name), [
    'AllOff', 'Activities', 'Device', 'Help',
    'ScreenLeft1', 'ScreenRight1', 'ScreenLeft2', 'ScreenRight2', 'ScreenLeft3', 'ScreenRight3',
    'ScreenPrev', 'ScreenNext', 'Guide', 'Info', 'Exit', 'Menu', 'DownArrow', 'UpArrow',
    'VolumeUp', 'DirectionUp', 'ChannelUp',
    'DirectionLeft', 'Select', 'DirectionRight',
    'VolumeDown', 'DirectionDown', 'ChannelDown',
    'VolumeMute', 'PrevChannel',
    'Stop', 'SkipBack', 'SkipForward', 'Play',
    'Record', 'Rewind', 'FastForward', 'Pause',
    'Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8', 'Number9',
    'Clear', 'Number0', 'Enter',
  ]);
});

test('control: without the row tolerance the colour keys are asked outer pair first', () => {
  // The curve bends, so its two outer keys sit higher than its two inner ones; ordered by height alone the
  // page would ask for Red and Blue before Green and Yellow, which is not how a person reads the row.
  const order = faceOrder(MODELS['h885']?.keys ?? [], 0).map((k) => k.name);
  const at = order.indexOf('Red');
  assert.deepEqual(order.slice(at, at + 4), ['Red', 'Blue', 'Green', 'Yellow']);
});

test('a key is named by its print, and by its place where it prints nothing; never by colour alone', () => {
  const words = new Map(drawing('h885').keys.map((k) => [k.name, k.words]));
  assert.equal(words.get('Pause'), 'PAUSE');
  assert.equal(words.get('Number2'), '2');
  assert.equal(words.get('Enter'), 'ENTER');
  assert.equal(words.get('ScreenLeft1'), 'the top key left of the screen');
  for (const colour of ['Red', 'Green', 'Yellow', 'Blue']) {
    assert.match(words.get(colour) as string, /of the four keys at the bottom of the curve/, colour);
  }
  // One name is a different key on another face, so each drawing has its own words for it.
  const said = (id: string, name: string): string | undefined => drawing(id).keys.find((k) => k.name === name)?.words;
  assert.equal(said('h880', 'UpArrow'), 'the left key at the bottom of the curve, printed with an up chevron');
  assert.equal(said('h880pro', 'UpArrow'),
    'the third of the four keys at the bottom of the curve, from the left, printed with an up triangle');
  assert.equal(said('h720', 'UpArrow'), 'the key below Menu, printed with an up chevron');
  assert.equal(said('h880pro', 'VolumeMute'), 'MUTE');
  assert.equal(said('h880pro', 'Sound'), 'SOUND');
  assert.equal(said('h880pro', 'Picture'), 'PIC');
  assert.equal(said('h885', 'AllOff'), 'OFF');
  assert.equal(said('h720', 'AllOff'), 'the power key, alone at the top left');
  assert.equal(said('h720', 'VolumeMute'), 'Mute');
  // No key on any drawing is named by a colour word alone: a colour is only ever beside a position.
  for (const d of DRAWINGS) {
    for (const key of d.keys) {
      assert.doesNotMatch(key.words, /^\(?(red|green|yellow|blue)\)?$/i, `${d.id} ${key.name}`);
    }
  }
  // Every key without a print has a row, and no row is for a key that prints a word or is not on its drawing.
  for (const d of DRAWINGS) for (const key of d.keys) assert.ok(key.words.length > 0, `${d.id} ${key.name}`);
  assert.deepEqual(Object.keys(WORDS).sort(), DRAWINGS.map((d) => d.id).sort(), 'one set of rows per drawing shown');
  for (const [id, rows] of Object.entries(WORDS)) {
    for (const name of Object.keys(rows)) {
      const key = MODELS[id]?.keys.find((k) => k.name === name);
      assert.ok(key !== undefined && printedWord(key) === undefined, `${id} WORDS row ${name}`);
    }
  }
});

test('control: a key with neither a print nor a row, or with both, stops the build', () => {
  const pause = MODELS['h885']?.keys.find((k) => k.name === 'Pause') as Key;
  const red = MODELS['h885']?.keys.find((k) => k.name === 'Red') as Key;
  assert.throws(() => wordsFor('h885', { ...red, name: 'Unheard' }), /prints no word and has no row/);
  assert.throws(() => wordsFor('h885', { ...pause, name: 'Red' }), /needs no row in WORDS/);
  // And a row is a row for its own drawing only: the 885's Red has none on the 880 Pro's.
  assert.throws(() => wordsFor('h880pro', red), /prints no word and has no row/);
});
