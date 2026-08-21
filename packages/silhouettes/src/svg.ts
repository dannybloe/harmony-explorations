/**
 * Turn a measured model into SVG.
 *
 * Two things this has to get right, and both are requirements from the interface rather than taste.
 *
 * **Every visible part is addressable.** A key is a group carrying its name, its population and its
 * scan code as data attributes, so the host colours or selects it without knowing anything about this
 * drawing. Colouring every key that drives one device is then one CSS rule.
 *
 * **Nothing carries a colour of its own.** Every fill and stroke reads a custom property with a
 * default, so a host can set a colour, a gradient or a theme without the drawing being regenerated.
 * A shape with a colour baked in would be the one part the host could not reach, and there is a test
 * that refuses it.
 */
import { ICONS, extentOf } from './icons.ts';
import { CASE_HEIGHT, LAYERS } from './types.ts';
import type { Key, Label, LayerName, Model, Rocker } from './types.ts';

export interface SvgOptions {
  /**
   * Which layers to emit. Omitting a layer keeps the file small, which is the point for a real
   * thumbnail; a host that wants to switch one off live hides the layer's class instead.
   */
  readonly layers?: readonly LayerName[];
}

/**
 * Layer sets worth naming, since a caller should not have to remember which layers a thumbnail wants.
 *
 * Typed with `satisfies` rather than annotated as a record, so `DETAIL.thumbnail` is known to exist:
 * a `Record<string, ...>` makes every lookup possibly undefined and pushes a check onto every caller
 * for keys that are right here in the file.
 */
export const DETAIL = {
  full: LAYERS,
  /** Shape only: what reads at the size of a list row, where text would be a grey smear. */
  thumbnail: ['case', 'screen', 'keys'],
  /** The bare outline, for an icon. */
  outline: ['case'],
} satisfies Record<string, readonly LayerName[]>;

/**
 * Text sizes in model units.
 *
 * `small` was 11 and the captions collided: on the Harmony 600, `Watch TV` and `Watch a Movie` ran
 * into each other under their keys. The photograph settles it. `Watch a Movie` is printed about 55
 * pixels wide for thirteen characters, which on this drawing's scale is a little over four units a
 * character, so nine is the size that fits where the real printing fits.
 */
const FONT_SIZE = { normal: 15, small: 9 } as const;

/**
 * One stroke width for every key, rocker and seam.
 *
 * Not three, which is what it was. A rocker at 1.4 with a 1 unit seam inside it reads as two
 * different kinds of edge on the same moulding, and the difference is most visible zoomed out, which
 * is where a thumbnail lives. The case keeps its own heavier line, since it is the outermost edge.
 */
const STROKE = 1.4;
const CASE_STROKE = 2;

/**
 * The default value of every custom property, and the one place it is written.
 *
 * Each is emitted twice on purpose: as the fallback inside `var()` in the style block, and as a
 * presentation attribute on the shape. That is not two sources, because both come from here, and it
 * buys the thing that made it necessary. **A renderer that does not understand custom properties
 * drops the whole declaration**, and then a shape with no other colour is filled black. librsvg does
 * exactly that, so the first version of this file rendered as a black slab, which is also what an
 * `<img src="...svg">` and any thumbnail pipeline would have shown.
 *
 * A presentation attribute has lower priority than a style rule, so in a browser the variable still
 * wins and the theming is untouched. The attribute is what is left when it cannot.
 */
export const DEFAULTS = {
  caseFill: '#fff',
  caseStroke: '#333',
  recessFill: '#eee',
  keyFill: '#fff',
  keyStroke: '#666',
  keyText: '#222',
  accent: '#d23c3c',
  font: 'system-ui, sans-serif',
} as const;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function num(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/**
 * Where a printed word goes relative to its key.
 *
 * The rule is the printing on the remote: a word on the face is centred on it, and a word beside the
 * key clears the key's own edge. `dx` and `dy` exist because the printing is not always where the
 * rule puts it, and a measured exception beats a rule bent to fit it.
 */
function labelAt(key: Key, label: Label): { x: number; y: number; anchor: string; size: number } {
  const size = FONT_SIZE[label.size ?? 'normal'];
  // An absolute place wins over the rule, for a segment whose own box is the whole moulding.
  if (label.x !== undefined && label.y !== undefined) {
    return { x: label.x + (label.dx ?? 0), y: label.y + (label.dy ?? 0), anchor: 'middle', size };
  }
  const { cx, cy, w, h } = key.shape;
  // A word printed under a key nearly touches it: on the Harmony 600 the activity keys end at row 97
  // and their captions are printed with a baseline around 104, so the gap is a unit or two and not
  // the four that had the captions floating well clear of the keys.
  const gap = label.size === 'small' ? 1 : 4;
  const dx = label.dx ?? 0;
  const dy = label.dy ?? 0;
  switch (label.place) {
    case 'above':
      return { x: cx + dx, y: cy - h / 2 - gap + dy, anchor: 'middle', size };
    case 'below':
      // A word under a key sits on its own baseline, so the offset is the gap plus the cap height.
      return { x: cx + dx, y: cy + h / 2 + gap + size * 0.8 + dy, anchor: 'middle', size };
    case 'left':
      return { x: cx - w / 2 - gap + dx, y: cy + size * 0.35 + dy, anchor: 'end', size };
    case 'right':
      return { x: cx + w / 2 + gap + dx, y: cy + size * 0.35 + dy, anchor: 'start', size };
    default:
      // Centred on the face. The 0.35 is the optical centre of a cap height rather than the
      // baseline, which is what puts a digit in the middle of its key instead of low in it.
      return { x: cx + dx, y: cy + size * 0.35 + dy, anchor: 'middle', size };
  }
}

/**
 * The symbol on a key, scaled into the key and centred on it.
 *
 * The mark is fitted to the key by its **own measured extent**, so a wide mark stays wide and a
 * square one stays square. The fractions are read off the photograph: a Harmony 600's teletext bar is
 * about 20 of the key's 35 pixels across and its mute mark fills most of the key's height, so a mark
 * gets about two thirds of the width and three fifths of the height and takes whichever binds first.
 */
function iconMarkup(key: Key): string {
  const icon = ICONS[key.icon!];
  if (icon === undefined) throw new Error(`${key.name}: no icon called ${key.icon}`);
  const at = key.markAt;
  const cx = at?.x ?? key.shape.cx;
  const cy = at?.y ?? key.shape.cy;
  const w = key.markSize ?? key.shape.w;
  const h = key.markSize ?? key.shape.h;
  const extent = extentOf(icon);
  // A mark that is one stroke is unconstrained across itself, so `extentOf` reports that axis as
  // effectively zero and the other one is what binds. `Math.min` of a huge number and a real one does
  // the right thing without a special case.
  // A stated size is the mark's **longer** side, and the shorter one follows from the mark's own
  // proportion; the fractions are the default's business only. It reads as the width because every
  // mark that states one is wider than it is tall or square, and the first that is not is a Harmony
  // One's paging arrow, three times as tall as it is wide, where 27.4 is its height.
  const box = key.markSize === undefined ? [w * 0.66, h * 0.6] : [w, h];
  const scale = Math.min(box[0]! / extent.w, box[1]! / extent.h);
  const parts = icon.parts.map((part) => {
    const colour = part.accent ? (key.accent ?? DEFAULTS.accent) : DEFAULTS.keyText;
    const klass = `mark mark-${part.mode}${part.accent ? ' mark-accent' : ''}`;
    const style = part.mode === 'fill'
      ? `fill="${colour}" stroke="none"`
      : `fill="none" stroke="${colour}" stroke-width="0.16" stroke-linecap="round" stroke-linejoin="round"`;
    return `<path class="${klass}" d="${part.d}" ${style} />`;
  }).join('');
  const own = key.accent === undefined ? '' : ` style="--accent: ${key.accent}"`;
  // One transform for the whole mark, so the parts of a multi part symbol cannot drift apart.
  return `<g transform="translate(${num(cx)} ${num(cy)}) scale(${num(scale)})"${own}>${parts}</g>`;
}

/**
 * The element id for a key: `VolumeMute` becomes `k-volume-mute`.
 *
 * Not a lowercased run of the name, which gave `k-screenupperleft`. A digit stays attached to the word
 * it belongs to, so `Number4` is `k-number4` rather than `k-number-4`, because the digit is part of
 * the button's name and not a separate word.
 *
 * Two rules, not one. The first splits a capital after a lowercase or a digit; the second splits a
 * capital that begins a word after another capital, which is what `WatchAMovie` needs. With only the
 * first it came out `k-watch-amovie`.
 */
export function elementId(name: string): string {
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');
  return `k-${kebab.toLowerCase()}`;
}

function keyAttrs(key: Key): string {
  const bits = [
    `id="${elementId(key.name)}"`,
    `data-name="${esc(key.name)}"`,
    `data-kind="${key.kind}"`,
    `data-src="${key.src}"`,
  ];
  if (key.scan !== undefined) bits.push(`data-scan="${key.scan}"`);
  if (key.scanCandidates !== undefined) bits.push(`data-scan-candidates="${key.scanCandidates.join(' ')}"`);
  if (key.zone !== undefined) bits.push(`data-zone="${key.zone}"`);
  return bits.join(' ');
}

/**
 * A key's rotation, as a transform on its own group.
 *
 * Deliberately not baked into the path: with the rotation on the group the lettering and the symbol
 * turn with the key, which is what they do on the remote because they are printed on it. It also
 * keeps the measured coordinates in the file readable, so somebody checking a reading against the
 * photograph sees the numbers that were measured.
 */
function rotation(key: Key): string {
  if (key.angle === 0) return '';
  return ` transform="rotate(${num(key.angle)} ${num(key.shape.cx)} ${num(key.shape.cy)})"`;
}

export function toSvg(model: Model, options: SvgOptions = {}): string {
  const layers = new Set(options.layers ?? LAYERS);
  const on = (name: LayerName) => layers.has(name);
  const out: string[] = [];

  /**
   * A margin, because a stroke straddles its own path: the case outline is `CASE_STROKE` units wide and
   * centred on the contour, so half of it sits outside the shape and a box of exactly the case's extent
   * cuts that half off all the way round. It showed at the widest point, where the side read thinner
   * than the rest of the line. One case stroke covers it and leaves room for the fraction of a unit a
   * closed spline bulges past the row it joins.
   */
  const m = CASE_STROKE;
  out.push('<svg xmlns="http://www.w3.org/2000/svg" '
    + `viewBox="${-m} ${-m} ${model.width + 2 * m} ${model.height + 2 * m}"`);
  out.push(`     role="img" aria-labelledby="title desc" class="silhouette silhouette-${model.id}">`);
  out.push(`  <title id="title">${esc(model.label)}, front face</title>`);
  out.push(`  <desc id="desc">${esc(describe(model))}</desc>`);
  out.push('');
  out.push('  <!--');
  out.push('    GENERATED FILE. Do not edit.');
  out.push('');
  out.push('    The measured geometry lives in packages/silhouettes/src/models/, which is where a');
  out.push('    correction goes, and `make silhouettes` writes this. A test asserts this file is byte');
  out.push('    for byte what the generator produces, so an edit here fails the suite rather than');
  out.push('    surviving as a second source.');
  out.push('  -->');
  out.push('');
  out.push(style());
  out.push('');

  if (on('case')) {
    out.push('  <g class="layer-case">');
    out.push(`    <path class="body" d="${model.case}" `
      + `fill="${DEFAULTS.caseFill}" stroke="${DEFAULTS.caseStroke}" `
      + `stroke-width="${CASE_STROKE}" />`);
    /**
     * The regions, **clipped to the case**.
     *
     * A region is a feature of the case and can never be outside it, and a drawing can say otherwise:
     * the Harmony 525's top face is a full width rectangle in the traced drawing, so its two upper
     * corners stuck out past the rounded case. Clipping is right rather than editing the rectangle,
     * because the rectangle is what the drawing says and the case is what bounds it.
     */
    if (model.regions.length > 0) {
      out.push(`    <clipPath id="case-clip"><path d="${model.case}" /></clipPath>`);
    }
    for (const region of model.regions) {
      const fill = region.form === 'recess' ? DEFAULTS.recessFill : 'none';
      out.push(`    <path class="region region-${region.form}" id="${region.id}" d="${region.path}" `
        + `clip-path="url(#case-clip)" `
        + `fill="${fill}" stroke="${DEFAULTS.caseStroke}" stroke-width="1" />`);
    }
    out.push('  </g>');
  }

  if (on('screen') && model.screen !== undefined) {
    const s = model.screen;
    out.push('  <g class="layer-screen">');
    // The rectangle carries the display's own raster size, so anything expressed in screen pixels,
    // a rendered page or a touch rectangle out of the config, can be placed here by whoever has it
    // without knowing this model's coordinates.
    out.push(`    <rect class="lcd" id="screen" x="${num(s.x)}" y="${num(s.y)}" `
      + `width="${num(s.w)}" height="${num(s.h)}" rx="3" `
      + `data-pixels="${s.pixels.width}x${s.pixels.height}" data-touch="${s.touch}" `
      + `fill="${DEFAULTS.recessFill}" stroke="${DEFAULTS.caseStroke}" stroke-width="1" />`);
    out.push('  </g>');
  }

  /**
   * Every key is drawn, including the touch ones.
   *
   * This filtered `kind: 'touch'` out, on the reading that a touch region is a screen button the config
   * draws rather than a part of the case. That is right for the buttons **on** the display, and they are
   * not keys here at all: they are a later layer, drawn from a config. It is wrong for the four regions
   * a Harmony One has **off** the display, two beside the screen and two under it, which are permanent,
   * visible and exactly what an interface has to be able to point at. So the filter was excluding the
   * only keys that ever carried the kind, and `touch` now means what it says: a region on the panel.
   */
  const drawn = model.keys;
  /**
   * Which moulding each segment key belongs to.
   *
   * A segment is drawn as the **moulding's own outline clipped to that segment's region**, not as a
   * shape of its own. That is what makes a half of a rocker exactly half of the real moulding: the
   * traced drawing states one outline per moulding and nothing inside it, so a separately drawn half
   * would be an approximation of a shape that is already known. It also means a half's fill cannot
   * spill past the moulding, which the approximation could.
   */
  const mouldingOf = new Map<string, string>();
  for (const rocker of model.rockers ?? []) {
    for (const name of rocker.keys) mouldingOf.set(name, rocker.path);
  }
  if (on('keys')) {
    const clipped = drawn.filter((k) => mouldingOf.has(k.name));
    if (clipped.length > 0) {
      out.push('  <defs>');
      for (const key of clipped) {
        out.push(`    <clipPath id="seg-${elementId(key.name)}">`
          + `<path d="${key.shape.path}" /></clipPath>`);
      }
      out.push('  </defs>');
    }
    out.push('  <g class="layer-keys">');
    // A moulding is drawn in two passes, and that is not tidiness. Filled first so a segment's own
    // fill lands on top of it, then **outlined last**, after every segment, so the outline is a full
    // stroke everywhere. Drawing it once with both meant each segment's fill painted over the inner
    // half of the shared edge, which showed up as a line that thickened and thinned around a rocker.
    for (const rocker of model.rockers ?? []) {
      out.push(`    <path class="rocker-fill" id="${rocker.id}" d="${rocker.path}" `
        + `fill="${DEFAULTS.keyFill}" stroke="none" />`);
    }
    for (const key of drawn) {
      const moulding = mouldingOf.get(key.name);
      out.push(`    <g class="key-group" ${keyAttrs(key)}${rotation(key)}>`);
      if (moulding === undefined) {
        out.push(`      <path class="key" d="${key.shape.path}" `
          + `fill="${DEFAULTS.keyFill}" stroke="${DEFAULTS.keyStroke}" stroke-width="${STROKE}" />`);
      } else {
        out.push(`      <path class="key key-segment" d="${moulding}" `
          + `clip-path="url(#seg-${elementId(key.name)})" `
          + `fill="${DEFAULTS.keyFill}" stroke="none" />`);
      }
      if (on('icons') && key.marks !== undefined) {
        // The document's own marks, at their own places. Filled, because that is how a printed symbol
        // on these drawings is: a closed shape, not a stroke.
        const own = key.accent === undefined ? '' : ` style="--accent: ${key.accent}"`;
        const paint = key.accent ?? DEFAULTS.keyText;
        const parts = key.marks.map((d) => `<path class="mark mark-fill" d="${d}" `
          + `fill="${paint}" stroke="none" />`).join('');
        out.push(`      <g class="layer-icons"${own}>${parts}</g>`);
      } else if (on('icons') && key.icon !== undefined) {
        out.push(`      <g class="layer-icons">${iconMarkup(key)}</g>`);
      }
      if (on('text')) {
        for (const label of key.labels ?? []) {
          const at = labelAt(key, label);
          out.push(`      <text class="lbl layer-text" x="${num(at.x)}" y="${num(at.y)}" `
            + `font-size="${at.size}" text-anchor="${at.anchor}" fill="${DEFAULTS.keyText}" `
            + `font-family="${DEFAULTS.font}">${esc(label.text)}</text>`);
        }
      }
      out.push('    </g>');
    }
    // Outlines, seams and moulding printing last, so a segment's fill cannot draw over any of them.
    for (const rocker of model.rockers ?? []) {
      out.push(`    <path class="rocker" d="${rocker.path}" fill="none" `
        + `stroke="${DEFAULTS.keyStroke}" stroke-width="${STROKE}" />`);
      for (const seam of rocker.seams ?? []) {
        out.push(`    <path class="seam" d="${seam}" fill="none" `
          + `stroke="${DEFAULTS.keyStroke}" stroke-width="${STROKE}" />`);
      }
      if (!on('text')) continue;
      for (const label of rocker.labels ?? []) {
        const size = FONT_SIZE[label.size ?? 'normal'];
        out.push(`    <text class="lbl layer-text" x="${num(label.x)}" y="${num(label.y)}" `
          + `font-size="${size}" text-anchor="middle" fill="${DEFAULTS.keyText}" `
          + `font-family="${DEFAULTS.font}">${esc(label.text)}</text>`);
      }
    }
    out.push('  </g>');
  }

  if (on('text') && model.nameplate !== undefined) {
    const np = model.nameplate;
    out.push('  <g class="layer-text">');
    out.push(`    <text class="lbl nameplate" x="${num(np.x)}" y="${num(np.y)}" `
      + `font-size="${FONT_SIZE[np.size ?? 'small']}" text-anchor="middle" `
      + `fill="${DEFAULTS.keyText}" font-family="${DEFAULTS.font}">${esc(np.text)}</text>`);
    out.push('  </g>');
  }

  out.push('</svg>');
  return out.join('\n') + '\n';
}

function describe(model: Model): string {
  const named = model.keys.filter((k) => k.scan !== undefined).length;
  // The panel's nature is stated because it is a finding rather than a detail: base slot 17 is a touch
  // hit map on arch 12 (Harmony One) and names the picture bank on every other architecture, so only
  // the One has a screen that can be pressed.
  const panel = model.screen === undefined ? ''
    : model.screen.touch
      ? ' Its screen is a touch surface, so a press there goes through the hit map rather than the keypad.'
      : ' Its screen is not a touch surface: the keys flanking it are how its labels are reached.';
  // The provenance sentence said "drawn from measurements taken off a product photograph rather than
  // traced from it", which was true of the drawings this package replaced and is not true of these:
  // every shape is traced and only the lettering and the symbols are measured off a photograph.
  return `Outline drawing of the ${model.label} front face, one shape per button. Its shapes are traced `
    + 'from the product documentation and its lettering and symbols are drawn from a photograph. '
    + `${model.keys.length} buttons, of which `
    + `${named} carry a measured scan code.${panel} Every fill and stroke reads a custom property, so `
    + 'the interface decides the colours; nothing here is coloured in.';
}

/**
 * The style block, which is the whole contract with the host.
 *
 * **Every default is a `var()` fallback and nothing is declared**, and that is a correction. This used
 * to open with `.silhouette { --case-fill: #fff; ... }` and then read the bare `var(--case-fill)`. A
 * declaration on the drawing's own root beats anything a host sets on an ancestor, because the ancestor
 * is further away in the cascade, so `--key-fill` set on a wrapper was silently ignored and only a
 * property set on the svg element itself or on a key group inside it did anything. Per key colouring
 * worked, which is why it went unnoticed, and theming the whole drawing did not.
 *
 * The docstring here already said "a custom property with a fallback" and the description says "the
 * interface decides the colours", so the intent was always this; the fallback form is also what the
 * plan asked for in as many words. Nothing declares a property now, so a host can set one anywhere up
 * the tree and the file still renders standing alone.
 *
 * `vector-effect: non-scaling-stroke` is here rather than being optional: at thumbnail size a stroke
 * of one unit on a drawing a thousand units tall is a grey haze, and this keeps the line a line
 * however small the drawing is rendered.
 */
function style(): string {
  const D = DEFAULTS;
  return `  <style>
    .body   { fill: var(--case-fill, ${D.caseFill}); stroke: var(--case-stroke, ${D.caseStroke}); }
    .region-recess { fill: var(--recess-fill, ${D.recessFill});
                     stroke: var(--case-stroke, ${D.caseStroke}); }
    .region-seam   { fill: none; stroke: var(--case-stroke, ${D.caseStroke}); }
    .lcd    { fill: var(--recess-fill, ${D.recessFill}); stroke: var(--case-stroke, ${D.caseStroke}); }
    .rocker-fill { fill: var(--key-fill, ${D.keyFill}); stroke: none; }
    .rocker { fill: none; stroke: var(--key-stroke, ${D.keyStroke}); }
    .key    { fill: var(--key-fill, ${D.keyFill}); stroke: var(--key-stroke, ${D.keyStroke}); }
    /* A rocker's segment takes the key fill and no outline of its own, so the moulding reads as the
       one physical key it is while the halves still colour and click separately. */
    .key-segment { stroke: none; }
    .seam   { fill: none; stroke: var(--key-stroke, ${D.keyStroke}); }
    .lbl    { fill: var(--key-text, ${D.keyText}); stroke: none; font-family: var(--font, ${D.font}); }
    .mark-fill   { fill: var(--key-text, ${D.keyText}); }
    .mark-stroke { stroke: var(--key-text, ${D.keyText}); }
    .mark-accent.mark-fill   { fill: var(--accent, ${D.accent}); }
    .mark-accent.mark-stroke { stroke: var(--accent, ${D.accent}); }
    .body, .region-recess, .region-seam, .lcd, .key, .rocker, .seam
      { vector-effect: non-scaling-stroke; }
  </style>`;
}

export { CASE_HEIGHT };
