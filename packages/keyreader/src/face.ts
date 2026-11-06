/**
 * A drawing of a remote's face on the page, with each key coloured by what the mode says about it.
 *
 * The drawing is the generated SVG from `reference/silhouettes/`, inlined by the build (`bin/drawings.ts`
 * says why it is not fetched). Every key in it is a group carrying `data-name`, and every fill of a key
 * reads the custom property `--key-fill`, which is what the drawing is designed for: the interface decides
 * the colours and the drawing colours nothing in. So a key's look is set by one attribute on its group,
 * `data-kr`, and the page's stylesheet turns each state into a fill.
 *
 * **The fills are colourblind safe and never colour alone**: the key asked for is blue with a heavy
 * outline, a learned or working key is orange with dots, a skipped key grey with diagonal lines, a key that
 * works but the page never saw white with dark crosses, and a key that may be the one pressed orange with
 * stripes; a key not to press has black and yellow hazard bands and a tag saying so. The patterns are in
 * `web/index.html`. Blue against
 * orange is the pair that stays apart for every common kind of colour blindness, and the dots and lines
 * tell learned from skipped without any colour at all.
 *
 * The SVG text is this repository's own generated output, never anything a person typed, which is why it
 * may go in through `innerHTML`; the words beside a key go in as text.
 */
import type { Drawing } from './session.ts';

/** The looks a key can take; the stylesheet has a rule for each. */
export type KeyLook = 'asked' | 'confirm' | 'learned' | 'skipped' | 'unseen' | 'lit' | 'possible' | 'avoid';

export class Face {
  readonly drawing: Drawing;
  readonly #keys = new Map<string, SVGGElement>();
  readonly #wrap: HTMLElement;
  readonly #tag: HTMLElement;

  /**
   * Draw `drawing` into `container`, replacing whatever was there.
   *
   * The container holds the SVG and a tag that points at one key with words beside it, for the learning
   * mode's "press this" on the drawing itself as well as in the prompt.
   */
  constructor(container: HTMLElement, drawing: Drawing) {
    this.drawing = drawing;
    container.replaceChildren();
    this.#wrap = document.createElement('div');
    this.#wrap.className = 'face-wrap';
    const holder = document.createElement('div');
    holder.className = 'face';
    holder.innerHTML = drawing.svg;
    this.#tag = document.createElement('div');
    this.#tag.className = 'face-tag';
    this.#tag.hidden = true;
    this.#wrap.append(holder, this.#tag);
    container.append(this.#wrap);
    holder.querySelectorAll<SVGGElement>('g[data-name]').forEach((group) => {
      const name = group.dataset['name'];
      if (name !== undefined) this.#keys.set(name, group);
    });
    // Every key the build gave words for has to be on the drawing, or the page would ask for a key it
    // cannot show; the build reads both from the same model, so this only catches a broken build.
    for (const key of drawing.keys) {
      if (!this.#keys.has(key.name)) throw new Error(`the drawing of ${drawing.label} has no key ${key.name}`);
    }
  }

  /** Set one key's look, or clear it. */
  look(name: string, look: KeyLook | undefined): void {
    const group = this.#keys.get(name);
    if (group === undefined) return;
    if (look === undefined) delete group.dataset['kr'];
    else group.dataset['kr'] = look;
  }

  /** One key's look now, so a mark laid over the steps' own can leave a key that already answered alone. */
  lookOf(name: string): KeyLook | undefined {
    return this.#keys.get(name)?.dataset['kr'] as KeyLook | undefined;
  }

  /** Clear every key's look and the tag. */
  clear(): void {
    for (const group of this.#keys.values()) delete group.dataset['kr'];
    this.point(undefined, '');
  }

  /**
   * Put the tag beside a key, on the side of the drawing nearer the key, at the key's height, or hide it.
   *
   * It sits in a margin beside the drawing rather than on it, so it never covers another key, and its
   * arrow points in towards the face. Placed from the key's box on screen, so it follows the drawing at any
   * size; on a narrow screen the margins are not there and the stylesheet hides it, the prompt saying the
   * same in words.
   */
  point(name: string | undefined, words: string, kind: 'ask' | 'warn' = 'ask'): void {
    this.#tag.dataset['kind'] = kind;
    const group = name === undefined ? undefined : this.#keys.get(name);
    if (group === undefined) {
      this.#tag.hidden = true;
      return;
    }
    const wrap = this.#wrap.getBoundingClientRect();
    const key = group.getBoundingClientRect();
    const face = (this.#wrap.querySelector('svg') as SVGSVGElement).getBoundingClientRect();
    const middle = face.left + face.width / 2;
    const onLeft = key.left + key.width / 2 < middle - face.width * 0.1;
    this.#tag.textContent = onLeft ? `${words} ▶` : `◀ ${words}`;
    this.#tag.dataset['side'] = onLeft ? 'left' : 'right';
    // Against the drawing's edge on that side, a few pixels out; the tag's own height is centred on the
    // key by the stylesheet's translate.
    this.#tag.style.left = onLeft ? 'auto' : `${face.right - wrap.left + 6}px`;
    this.#tag.style.right = onLeft ? `${wrap.right - face.left + 6}px` : 'auto';
    this.#tag.style.top = `${key.top + key.height / 2 - wrap.top}px`;
    this.#tag.hidden = false;
  }
}
