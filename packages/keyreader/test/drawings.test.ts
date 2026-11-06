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
 * The order the page asks for keys is pinned as a whole for the Harmony 885, because it is what a person
 * meets: the face top to bottom, each row left to right. Its row tolerance has a control: without it the
 * four colour keys, along a curve, are asked outer pair first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MODELS } from '@harmony/silhouettes';
import type { Key } from '@harmony/silhouettes';
import { WATCH_BY_SKIN } from '@harmony/usb/keys';
import { OUT_DIR } from '../bin/build.ts';
import { WORDS, faceOrder, printedWord, wordsFor } from '../bin/drawings.ts';
import type { Drawing } from '../src/session.ts';

const SILHOUETTES = join(OUT_DIR, '..', 'silhouettes');

const { DRAWINGS } = (await import(pathToFileURL(join(OUT_DIR, 'drawings.js')).href)) as { DRAWINGS: readonly Drawing[] };

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

test('the page shows the Harmony 880 and 885, the drawn models whose skins it reads keys on', () => {
  assert.deepEqual(DRAWINGS.map((d) => [d.id, d.label, d.skins]), [['h880', 'Harmony 880', [15]], ['h885', 'Harmony 885', [17]]]);
  // And every one of their skins is a skin the page reads, which is what put them here.
  for (const d of DRAWINGS) for (const skin of d.skins) assert.ok(skin in WATCH_BY_SKIN, `skin ${skin}`);
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
});

test('the 885 is asked for top to bottom, each row left to right', () => {
  assert.deepEqual(drawing('h885').keys.map((k) => k.name), [
    'AllOff',
    'Activities', 'Help',
    'ScreenLeft1', 'ScreenRight1', 'ScreenLeft2', 'ScreenRight2', 'ScreenLeft3', 'ScreenRight3', 'ScreenLeft4', 'ScreenRight4',
    'ScreenPrev', 'Glow', 'ScreenNext',
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
  // The 880 is the same face with its two chevron keys where the 885 has four colour keys.
  const h880 = drawing('h880').keys.map((k) => k.name);
  assert.deepEqual(h880.slice(h880.indexOf('ChannelDown') + 1, h880.indexOf('Menu')), ['UpArrow', 'DownArrow']);
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
  // Every key without a print has a row, and no row is for a key that prints a word or is on no drawing.
  for (const d of DRAWINGS) for (const key of d.keys) assert.ok(key.words.length > 0, `${d.id} ${key.name}`);
  const drawn = Object.values(MODELS).filter((m) => pageShows(m.id)).flatMap((m) => m.keys);
  for (const name of Object.keys(WORDS)) {
    const key = drawn.find((k) => k.name === name);
    assert.ok(key !== undefined && printedWord(key) === undefined, `WORDS row ${name}`);
  }
});

/** Whether the page carries a drawing of this id. */
function pageShows(id: string): boolean {
  return DRAWINGS.some((d) => d.id === id);
}

test('control: a key with neither a print nor a row, or with both, stops the build', () => {
  const pause = MODELS['h885']?.keys.find((k) => k.name === 'Pause') as Key;
  const red = MODELS['h885']?.keys.find((k) => k.name === 'Red') as Key;
  assert.throws(() => wordsFor({ ...red, name: 'Unheard' }), /prints no word and has no row/);
  assert.throws(() => wordsFor({ ...pause, name: 'Red' }), /needs no row in WORDS/);
});
