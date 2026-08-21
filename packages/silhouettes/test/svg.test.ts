/**
 * The generated SVG, and the contract it makes with whatever draws it.
 *
 * Two of these carry real weight. The checked in file has to be what the generator produces, so a hand
 * edit fails the suite instead of surviving as a second source. And no shape may carry a colour that
 * is not one of the documented defaults, because a colour baked into a shape is the one part the
 * interface cannot reach.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DETAIL, LAYERS, MODELS, toSvg } from '../src/index.ts';
import { DEFAULTS, elementId } from '../src/svg.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const drawn = Object.entries(MODELS);

test('the checked in drawing is what the generator produces', () => {
  for (const [id, model] of drawn) {
    const path = join(REPO, 'reference', 'silhouettes', `${id}.svg`);
    const onDisk = readFileSync(path, 'utf8');
    assert.equal(onDisk, toSvg(model),
      `${id}.svg differs from the generator: run make silhouettes rather than editing it`);
    assert.match(onDisk, /GENERATED FILE\. Do not edit\./);
  }
});

test('every colour in the file is a documented default', () => {
  const allowed = new Set<string>(Object.values(DEFAULTS).filter((v) => v.startsWith('#')));
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    for (const m of svg.matchAll(/#[0-9a-fA-F]{3,8}/g)) {
      const colour = m[0]!;
      // A key may state the colour of its own marking where that colour is the button's identity, and
      // the teletext keys are the only case. Those colours are on the key, so they are checked against
      // the model rather than against the palette.
      const fromAKey = model.keys.some((k) => k.accent === colour);
      assert.ok(allowed.has(colour) || fromAKey,
        `${id}: ${colour} is neither a default nor a key's stated accent`);
    }
  }
});

test('every fill and stroke can be replaced from outside', () => {
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    /**
     * Each colour appears twice by design: as the fallback inside `var()` and as a presentation
     * attribute, which is what a renderer with no support for custom properties falls back to.
     *
     * **The fallback is the half this test was missing**, and the comment above claimed it while the
     * body only checked for `var(`. The defaults were declared in a `.silhouette` rule instead, on the
     * drawing's own root, which beats anything a host sets on an ancestor: so `--key-fill` on a wrapper
     * did nothing and the same property on a key group worked. Per key colouring is the case that gets
     * exercised, so the gap survived. Two claims now, and the second is what makes the title true: no
     * rule may declare a custom property, and every `var()` has to carry its default.
     */
    for (const m of svg.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
      const block = m[1]!;
      assert.doesNotMatch(block, /^\s*--[a-z-]+\s*:/m,
        `${id}: a custom property is declared, so an override from an ancestor loses`);
      assert.doesNotMatch(block, /\{[^}]*--[a-z-]+\s*:/,
        `${id}: a custom property is declared inside a rule`);
      for (const line of block.split('\n')) {
        const decl = line.match(/(?:^|[\s{])(fill|stroke|font-family):\s*([^;]+);/);
        if (decl === null) continue;
        const value = decl[2]!.trim();
        if (value === 'none') continue;
        assert.ok(value.startsWith('var('),
          `${id}: ${decl[1]} is ${value}, which the interface cannot override`);
        assert.match(value, /^var\(--[a-z-]+,\s*\S/,
          `${id}: ${decl[1]} reads ${value} with no default, so the file cannot stand alone`);
      }
    }
  }
});

test('an element id is the name in kebab case', () => {
  // `k-screenupperleft` was what a plain lowercase gave, and it is unreadable in a stylesheet.
  assert.equal(elementId('VolumeMute'), 'k-volume-mute');
  assert.equal(elementId('ScreenUpperLeft'), 'k-screen-upper-left');
  assert.equal(elementId('Number4'), 'k-number4');
  // Two adjacent capitals: the single rule gave `k-watch-amovie`.
  assert.equal(elementId('WatchAMovie'), 'k-watch-a-movie');
  assert.equal(elementId('Help'), 'k-help');
  for (const [id, model] of drawn) {
    const ids = model.keys.map((k) => elementId(k.name));
    assert.equal(new Set(ids).size, ids.length, `${id}: two keys share an element id`);
    for (const one of ids) assert.match(one, /^k-[a-z0-9-]+$/);
  }
});

test('a key is addressable by name, kind, provenance and code', () => {
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    for (const key of model.keys) {
      assert.match(svg, new RegExp(`data-name="${key.name}"`), `${id}: ${key.name} is not addressable`);
    }
    // The two halves of one moulding are separate groups, which is what lets the interface light up
    // ChannelUp without ChannelDown. Asserted because it is the requirement, not a side effect.
    for (const rocker of model.rockers ?? []) {
      for (const name of rocker.keys) {
        assert.match(svg, new RegExp(`<g class="key-group" id="${elementId(name)}"`),
          `${id}: ${name} has no group of its own`);
      }
    }
    assert.match(svg, /data-kind="keypad"/);
    assert.match(svg, /data-src="(catalogue|printed)"/);
  }
});

test('every layer is present and named', () => {
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    for (const layer of LAYERS) {
      if (layer === 'screen' && model.screen === undefined) continue;
      assert.match(svg, new RegExp(`class="layer-${layer}"`), `${id}: no ${layer} layer`);
    }
  }
});

test('a detail level leaves out what it says it leaves out', () => {
  for (const [id, model] of drawn) {
    const thumb = toSvg(model, { layers: DETAIL.thumbnail });
    assert.doesNotMatch(thumb, /class="layer-text"/, `${id}: a thumbnail still carries text`);
    assert.doesNotMatch(thumb, /class="layer-icons"/, `${id}: a thumbnail still carries symbols`);
    assert.match(thumb, /class="layer-keys"/);
    /**
     * And what it leaves out was really there, counted per element rather than as a share of the file.
     *
     * This was a byte ratio, stated per model, and it was a fossil: it read 0.751 on the Harmony 525
     * the day it was measured and 0.733 a day later, because stating a mark's size and adding the
     * letter groups under the digits grew the text layer. Nothing was wrong either time, so the number
     * only ever recorded when it was last restamped.
     *
     * A count of elements is the claim that was wanted. It moves when a key gains or loses a marking,
     * which is a real change and shows up in the diff, and it fails on the bug this drawing has already
     * had twice: regenerating a model from an extraction and silently dropping every symbol.
     */
    const PRINTING: Readonly<Record<string, { text: number; marks: number; keys: number }>> = {
      h525: { text: 44, marks: 36, keys: 50 },
      h600: { text: 37, marks: 56, keys: 54 },
      one: { text: 34, marks: 32, keys: 44 },
    };
    const want = PRINTING[id]!;
    const count = (svg: string, re: RegExp): number => (svg.match(re) ?? []).length;
    const full = toSvg(model);
    assert.equal(count(full, /<text/g), want.text, `${id}: printed words`);
    assert.equal(count(full, /class="mark /g), want.marks, `${id}: symbols`);
    assert.equal(count(thumb, /<text/g), 0, `${id}: a thumbnail still prints`);
    assert.equal(count(thumb, /class="mark /g), 0, `${id}: a thumbnail still carries a symbol`);
    // The keys themselves survive, which is what separates a thumbnail from an outline.
    assert.equal(count(thumb, /class="key-group"/g), want.keys, `${id}: a thumbnail lost keys`);

    const outline = toSvg(model, { layers: DETAIL.outline });
    assert.doesNotMatch(outline, /class="layer-keys"/, `${id}: an outline still carries keys`);
    assert.match(outline, /class="body"/);
    assert.equal(count(outline, /class="key-group"/g), 0, `${id}: an outline still carries keys`);
  }
});

test('a stroke stays a stroke at any size', () => {
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    // Without this a one unit line on a drawing a thousand units tall is a grey haze at thumbnail
    // size, which is exactly where a thumbnail lives.
    assert.match(svg, /vector-effect: non-scaling-stroke/, `${id}: strokes will vanish when scaled down`);
  }
});

test('one stroke width for every key, rocker and seam', () => {
  for (const [id, model] of drawn) {
    const svg = toSvg(model);
    const widths = new Set<string>();
    for (const m of svg.matchAll(/class="(key|key-segment|rocker|seam)[^"]*"[^>]*stroke-width="([\d.]+)"/g)) {
      widths.add(m[2]!);
    }
    // A rocker at one width with a seam inside it at another reads as two kinds of edge on the same
    // moulding, and the difference shows most when zoomed out.
    assert.equal(widths.size, 1, `${id}: key strokes come in ${widths.size} widths: ${[...widths]}`);
  }
});

test('the rotation is on the group, so the lettering turns with the key', () => {
  for (const [, model] of drawn) {
    for (const key of model.keys) {
      if (key.angle === 0) continue;
      const svg = toSvg(model);
      assert.match(svg, new RegExp(`data-name="${key.name}"[^>]*transform="rotate\\(`));
    }
  }
});
