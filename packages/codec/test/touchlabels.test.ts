/**
 * How a command's name is laid out on a Harmony One pad, findings section 394 and
 * `src/families/touch/labels.ts`: the cases that pin each part of the rule, on Logitech's own compiles of
 * catalogue devices, and a census of every label the device pages of Logitech's One compiles draw.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { needing, require_, skipUnless } from '@harmony/lab';
import { characterMap, decode, deviceModeMaps, modeRecords, parse, type Container } from '../src/index.ts';
import { fontSets } from '../src/font.ts';
import {
  SCREEN_DRAW_IMAGE, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram,
} from '../src/screen.ts';
import { DEVICE_PAGE_SLOTS } from '../src/families/touch/menus.ts';
import {
  padFontOf, TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH, touchLabelLines, touchLabelWords,
} from '../src/families/touch/labels.ts';
import { textGlyphs } from '../src/shared/spelling.ts';

/** A drawn line: its text, where its first glyph goes, and the font it was drawn in. */
interface Drawn { text: string; x: number; y: number; font: number }

/** Every pad of every page of every mode the device list enters, with the lines drawn inside its box. */
function devicePads(c: Container): { mode: number; page: number; slot: number; lines: Drawn[] }[] {
  const map = characterMap(c);
  assert.ok(map !== undefined, 'the configuration has a character map');
  const records = modeRecords(c) ?? [];
  const out: { mode: number; page: number; slot: number; lines: Drawn[] }[] = [];
  for (const mode of new Set(deviceModeMaps(c).map((one) => one.mode))) {
    (records[mode]?.pages ?? []).forEach((page, p) => {
      let font = -1;
      const pads = new Map<number, Drawn[]>();
      for (const one of screenProgram(c, page.program) ?? []) {
        if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] as number;
        if (one.opcode === SCREEN_DRAW_IMAGE) {
          const slot = DEVICE_PAGE_SLOTS.findIndex(([x, y]) => one.operands[0] === x && one.operands[1] === y);
          if (slot >= 0) pads.set(slot, []);
        }
        if (one.opcode !== SCREEN_TEXT_INLINE && one.opcode !== SCREEN_TEXT_AT) continue;
        const [x, y] = [one.operands[0] as number, one.operands[1] as number];
        const slot = DEVICE_PAGE_SLOTS.findIndex(([px, py]) => x >= px && x < px + TOUCH_PAD_WIDTH && y >= py && y < py + TOUCH_PAD_HEIGHT);
        const glyphs = textGlyphs(c, one);
        if (slot < 0 || !pads.has(slot) || glyphs === undefined) continue;
        pads.get(slot)!.push({ text: decode(glyphs, map), x, y, font });
      }
      for (const [slot, lines] of pads) if (lines.length > 0) out.push({ mode, page: p, slot, lines });
    });
  }
  return out;
}

/** `name` laid out on the pad at `slot` of `c`, as `text@x,y` per line. */
function laidOut(c: Container, name: string, slot: number): string[] {
  const font = padFontOf(c)!;
  const [x, y] = DEVICE_PAGE_SLOTS[slot]!;
  return touchLabelLines(c, characterMap(c)!, fontSets(c)![font]!, font, name, { x, y }).map((one) => `${one.text}@${one.x},${one.y}`);
}

test('a name splits before a capital, a digit or a plus after a lower case letter, after a single hyphen, and at a space',
     () => {
  const words = (name: string): string[] => touchLabelWords(name).map((one) => one.sep + one.text);
  assert.deepEqual(words('ModeDTSNeo6Cinema'), ['Mode', 'DTSNeo', '6Cinema']);
  assert.deepEqual(words('InputHDMI2V2'), ['Input', 'HDMI2V2']);
  assert.deepEqual(words('VolumeMain+'), ['Volume', 'Main', '+']);
  assert.deepEqual(words('PowerOff-All'), ['Power', 'Off-', 'All']);
  assert.deepEqual(words('Mode Direct/Stereo'), ['Mode', ' Direct/Stereo']);
  assert.deepEqual(words('DTSNEO:XToggle'), ['DTSNEO:XToggle']);
  assert.deepEqual(words('Volume--'), ['Volume--']);
});

test('the Denon\'s labels on Logitech\'s Harmony One compile: three lines, a cut at 72 and 73, a lone word of 73, a hyphen and a join of 72',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  assert.equal(padFontOf(c), 7);
  // Positions are the measured ones, section 394, each a line centred on its own width, odd pixel left.
  assert.deepEqual(laidOut(c, 'ModeDTSNeo6Cinema', 3), ['Mode@114,101', 'DTSNeo@108,112', '6Cinema@105,123']);
  assert.deepEqual(laidOut(c, 'DTSNEO:XToggle', 1), ['DTSNEO:XT..@96,58']);
  assert.deepEqual(laidOut(c, 'ModeDirect/Stereo', 4), ['Mode@31,161', 'Direct/Ster..@12,172']);
  assert.deepEqual(laidOut(c, 'ModeDTSSurround', 5), ['Mode@114,161', 'DTSSurround@93,172']);
  assert.deepEqual(laidOut(c, 'PowerOff-All', 4), ['PowerOff-@17,161', 'All@39,172']);
  assert.deepEqual(laidOut(c, 'QuickSelect1', 4), ['QuickSelect1@10,166']);
  // And each is what the compile draws, somewhere on the receiver's device pages.
  const drawn = new Set(devicePads(c).flatMap((pad) => pad.lines.map((one) => `${one.text}@${one.x},${one.y}`)));
  for (const line of ['Mode@114,101', 'DTSNeo@108,112', '6Cinema@105,123', 'DTSNEO:XT..@96,58', 'Direct/Ster..@12,172',
                      'DTSSurround@93,172', 'PowerOff-@17,161', 'All@39,172', 'QuickSelect1@10,166']) {
    assert.ok(drawn.has(line), `${line} is drawn`);
  }
});

test('a join of 73 breaks, a cut word takes its own line and the next word another, an upper case run before a digit stays whole',
     needing(skipUnless('one_config_unprogrammed', 'harvest_one_families_2', 'harvest_one_families_3')), () => {
  const factory = parse(require_('one_config_unprogrammed'));
  assert.deepEqual(laidOut(factory, 'QuickAccess', 1), ['Quick@114,53', 'Access@108,64']);
  const families3 = parse(require_('harvest_one_families_3'));
  assert.deepEqual(laidOut(families3, 'EffectEntertainmentShow', 3), ['Effect@112,101', 'Entertainm..@95,112', 'Show@113,123']);
  assert.deepEqual(laidOut(families3, 'VolumeMain+', 4), ['VolumeMain@11,161', '+@43,172']);
  const families2 = parse(require_('harvest_one_families_2'));
  assert.deepEqual(laidOut(families2, 'InputHDMI2V2', 2), ['Input@32,107', 'HDMI2V2@22,118']);
});

/** Logitech's Harmony One compiles whose device pages the census reads, one of each distinct container. */
const COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'calibration_one',
  'harvest_one_two_devices', 'harvest_one_families_2', 'harvest_one_families_3'] as const;

test('every label the device pages of eight Logitech Harmony One compiles draw is where the rule puts it, its lines rejoined',
     skipUnless(...COMPILES), () => {
  // The name is not in the file, so each pad's drawn lines are joined back, with or without a space at
  // each break, and a pad counts as reproduced when one joining lays out to exactly the drawn lines. A cut
  // line or a glyph the character map cannot name has no name to join back and is counted apart.
  const counts: Record<string, string> = {};
  for (const name of COMPILES) {
    const c = parse(require_(name));
    let reproduced = 0;
    let considered = 0;
    let skipped = 0;
    for (const pad of devicePads(c)) {
      const texts = pad.lines.map((one) => one.text);
      if (texts.some((one) => one.includes('..') || one.includes('¿'))) { skipped += 1; continue; }
      considered += 1;
      const want = pad.lines.map((one) => `${one.text}@${one.x},${one.y}`);
      for (let m = 0; m < 1 << (texts.length - 1); m += 1) {
        const joined = texts.reduce((all, one, j) => (j === 0 ? one : all + ((m >> (j - 1)) & 1 ? ' ' : '') + one), '');
        let got: string[] = [];
        try { got = laidOut(c, joined, pad.slot); } catch { continue; }
        if (got.join('|') === want.join('|')) { reproduced += 1; break; }
      }
    }
    counts[name] = `${reproduced}/${considered}+${skipped}`;
  }
  // `reproduced/considered+skipped` per compile, every considered pad reproduced: 915 of 915.
  assert.deepEqual(counts, {
    one_config: '81/81+0', one_config_unprogrammed: '50/50+0', one_spare_after_sync: '79/79+2',
    one_spare_myharmony: '184/184+7', calibration_one: '108/108+2', harvest_one_two_devices: '116/116+7',
    harvest_one_families_2: '96/96+0', harvest_one_families_3: '201/201+6',
  });
});
