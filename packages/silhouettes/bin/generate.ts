/**
 * Write `reference/silhouettes/<id>.svg` from the measured geometry, and optionally the lab preview.
 *
 * `--preview` writes an HTML page **into the lab**, never into the repository, showing the drawing
 * over the photograph it was measured from. That overlay is the check that decides whether a drawing
 * is right: every test in this package can pass on a drawing with a key in the wrong place, and only
 * a person looking at it against the photograph can see that.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DETAIL, MODELS, toSvg } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const OUT = join(REPO, 'reference', 'silhouettes');
const LAB = resolve(REPO, '..', 'lab');

/** The photograph each model was measured from, for the overlay. Lab only, never published. */
const PHOTO: Readonly<Record<string, string>> = {
  h600: '600-full.jpg',
  h525: '525-full.jpg',
  one: 'one-full.jpg',
};

function write(): void {
  mkdirSync(OUT, { recursive: true });
  for (const [id, model] of Object.entries(MODELS)) {
    const path = join(OUT, `${id}.svg`);
    writeFileSync(path, toSvg(model));
    const named = model.keys.filter((k) => k.scan !== undefined).length;
    console.log(`${path}  ${model.keys.length} keys, ${named} with a measured scan code`);
  }
}

/**
 * The overlay page. The drawing is scaled to the photograph's own case extent, so a key that is in
 * the right place lands on the key in the photograph and one that is not is obvious.
 */
function preview(): void {
  const dir = join(LAB, 'work', 'silhouettes');
  mkdirSync(dir, { recursive: true });
  const parts: string[] = [];
  for (const [id, model] of Object.entries(MODELS)) {
    const photo = PHOTO[id];
    parts.push(`<section>
  <h2>${model.label}</h2>
  <div class="row">
    <figure class="over">
      <div class="stack">
        <img src="../../reference/forum-images/${photo}" alt="">
        <div class="draw">${toSvg(model)}</div>
      </div>
      <figcaption>drawing over the photograph, opacity <input type="range" min="0" max="100"
        value="55" oninput="this.closest('.over').querySelector('.draw').style.opacity=this.value/100"></figcaption>
    </figure>
    <figure><div class="plain">${toSvg(model)}</div><figcaption>full</figcaption></figure>
    <figure><div class="half">${toSvg(model, { layers: DETAIL.full })}</div><figcaption>half size</figcaption></figure>
    <figure><div class="thumb">${toSvg(model, { layers: DETAIL.thumbnail })}</div><figcaption>thumbnail</figcaption></figure>
    <figure><div class="thumb">${toSvg(model, { layers: DETAIL.outline })}</div><figcaption>outline</figcaption></figure>
    <figure><div class="plain tinted">${toSvg(model)}</div><figcaption>coloured by device</figcaption></figure>
  </div>
</section>`);
  }
  const html = `<!doctype html>
<meta charset="utf-8">
<title>Silhouette check</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 24px; background: #fafafa; color: #222; }
  h1 { font-size: 18px; } h2 { font-size: 15px; margin-top: 32px; }
  .row { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
  figure { margin: 0; } figcaption { font-size: 12px; color: #666; margin-top: 6px; max-width: 320px; }
  .stack { position: relative; }
  .stack img { display: block; height: 720px; }
  .stack .draw { position: absolute; inset: 0; opacity: .55; }
  .stack .draw svg { height: 720px; width: auto; }
  .plain svg { height: 720px; } .half svg { height: 360px; } .thumb svg { height: 120px; }
  /* The theming contract, exercised rather than described: three device colours and a selection,
     set entirely from outside the drawing. */
  .tinted svg { --case-fill: #f7f7f7; }
  .tinted [data-name="VolumeUp"], .tinted [data-name="VolumeDown"],
  .tinted [data-name="VolumeMute"] { --key-fill: #b7e4c7; }
  /* Only the up half of the channel rocker, on purpose: it is the demonstration that the two halves
     of one moulding are separately addressable. If ChannelDown lights up as well, something is
     wrong. */
  .tinted [data-name="ChannelUp"] { --key-fill: #ffc8dd; }
  .tinted [data-name^="Number"], .tinted [data-name="Enter"] { --key-fill: #bde0fe; }
  .tinted [data-name="Play"], .tinted [data-name="Pause"], .tinted [data-name="Stop"],
  .tinted [data-name="Rewind"], .tinted [data-name="FastForward"], .tinted [data-name="Record"],
  .tinted [data-name="SkipBack"], .tinted [data-name="SkipForward"] { --key-fill: #ffd6a5; }
  .tinted [data-name="Select"] { --key-fill: #ffadad; --key-stroke: #c1121f; }
</style>
<h1>Silhouette check</h1>
<p>The overlay is the check that counts. Drag the slider: a key in the right place sits on the key in
the photograph. The photographs are lab only and must not be published.</p>
${parts.join('\n')}
`;
  const path = join(dir, 'check.html');
  writeFileSync(path, html);
  console.log(`${path}`);
}

write();
if (process.argv.includes('--preview')) preview();
