/**
 * The symbols printed on the keys, drawn once and shared by every model.
 *
 * Why drawn rather than characters from a font: two of these do not exist as characters at all. A
 * crossed out speaker and a return arrow have no Unicode equivalent, which is why the drawings this
 * replaces had the words `mute` and `back` printed on keys whose faces carry a symbol. And the ones
 * that do exist render at different widths in different fonts, so a row of transport keys would not
 * line up.
 *
 * One set, shared. If a model needs a symbol that is not here it is added here and every model gets
 * it. A second play triangle is the failure `CLAUDE.md` names its oldest rule after.
 *
 * Each symbol is drawn in a box from -1 to 1 on both axes and scaled to the key. A part is either
 * filled, which is right for the solid transport marks, or stroked, which is right for the outlines
 * and the slash across the speaker. `accent` puts a part on its own colour variable, which the
 * record dot needs because it is red on all three remotes and that colour is the marking's identity
 * rather than decoration.
 */
import { pathBounds } from './path.ts';

export interface IconPart {
  readonly d: string;
  readonly mode: 'fill' | 'stroke';
  readonly accent?: boolean;
}

export interface Icon {
  readonly parts: readonly IconPart[];
}

/**
 * How much of the unit box a symbol actually uses, measured from its own path.
 *
 * There used to be an `aspect` number written by hand beside each symbol, and it was a second
 * statement of something the path already says, which is the shape this repository's oldest rule
 * warns about: it can disagree with the path and nothing would notice. It also sized things wrongly,
 * because dividing by an aspect shrinks a wide mark instead of widening it, so the teletext bar came
 * out half the size the product prints.
 */
export function extentOf(icon: Icon): { w: number; h: number } {
  let w = 0;
  let h = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const part of icon.parts) {
    const b = pathBounds(part.d);
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
  }
  // A symbol that is one stroke has no extent across itself: `dash`, `dashVertical` and `minus` are a
  // single line. Reported as a plain zero it divides into infinity where a mark is scaled to fit a
  // key, so the axis it does not occupy comes back as effectively nothing and the other one binds.
  w = Math.max(maxX - minX, 1e-6);
  h = Math.max(maxY - minY, 1e-6);
  return { w, h };
}

/** A right pointing triangle spanning x0 to x1, and its mirror. `tri` is the upright pair. */
const right = (x0: number, x1: number): string => `M ${x0} -0.85 L ${x0} 0.85 L ${x1} 0 Z`;
const left = (x0: number, x1: number): string => `M ${x0} -0.85 L ${x0} 0.85 L ${x1} 0 Z`;
const bar = (x: number, w: number): string => `M ${x} -0.85 H ${x + w} V 0.85 H ${x} Z`;

export const ICONS: Readonly<Record<string, Icon>> = {
  play: { parts: [{ d: right(-0.7, 0.8), mode: 'fill' }] },
  pause: { parts: [{ d: bar(-0.65, 0.4), mode: 'fill' }, { d: bar(0.25, 0.4), mode: 'fill' }] },
  stop: { parts: [{ d: 'M -0.75 -0.75 H 0.75 V 0.75 H -0.75 Z', mode: 'fill' }] },

  // Two triangles, which is what is printed. Not one triangle with a line, which is a different mark.
  rewind: { parts: [{ d: left(0.05, -0.9), mode: 'fill' }, { d: left(0.95, 0.05), mode: 'fill' }] },
  forward: { parts: [{ d: right(-0.95, -0.05), mode: 'fill' }, { d: right(-0.05, 0.9), mode: 'fill' }] },

  // Skip carries a bar on the leading side, which is the whole difference from plain spooling.
  skipBack: { parts: [
      { d: bar(-1, 0.22), mode: 'fill' },
      { d: left(0.15, -0.72), mode: 'fill' },
      { d: left(1, 0.15), mode: 'fill' },
    ],
  },
  skipForward: { parts: [
      { d: right(-1, -0.15), mode: 'fill' },
      { d: right(-0.15, 0.72), mode: 'fill' },
      { d: bar(0.78, 0.22), mode: 'fill' },
    ],
  },

  // The record dot is red on every one of these remotes, so it takes the accent variable.
  record: { parts: [{ d: 'M -0.62 0 A 0.62 0.62 0 1 0 0.62 0 A 0.62 0.62 0 1 0 -0.62 0 Z', mode: 'fill', accent: true }],
  },

  // A speaker cone with a slash **through** it. The first version put the slash to the right of the
  // cone, which read as a stray line beside a triangle rather than as a mute mark.
  mute: { parts: [
      { d: 'M -0.85 -0.3 H -0.45 L 0.1 -0.8 V 0.8 L -0.45 0.3 H -0.85 Z', mode: 'fill' },
      { d: 'M -0.7 0.8 L 0.75 -0.8', mode: 'stroke' },
    ],
  },
  /**
   * A bare cone, which is what the quieter end of a volume rocker carries, and a cone with two
   * waves, which is what the louder end carries. They were one symbol here and that was wrong: on a
   * Harmony 600 the two ends of the rocker differ by exactly those waves, so drawing both the same
   * threw away the one thing that tells them apart.
   */
  speaker: { parts: [{ d: 'M -0.8 -0.3 H -0.4 L 0.15 -0.8 V 0.8 L -0.4 0.3 H -0.8 Z', mode: 'fill' }],
  },
  speakerWaves: { parts: [
      { d: 'M -0.95 -0.3 H -0.55 L 0 -0.8 V 0.8 L -0.55 0.3 H -0.95 Z', mode: 'fill' },
      { d: 'M 0.2 -0.34 A 0.42 0.42 0 0 1 0.2 0.34', mode: 'stroke' },
      { d: 'M 0.5 -0.6 A 0.72 0.72 0 0 1 0.5 0.6', mode: 'stroke' },
    ],
  },

  // The previous channel key: a line that runs right, turns back over itself and comes back left
  // into an arrowhead. The first version drew the loop on the wrong side and read as a letter C.
  back: { parts: [
      { d: 'M -0.85 0.6 H 0.3 A 0.55 0.55 0 0 0 0.3 -0.5 H -0.2', mode: 'stroke' },
      { d: 'M -0.15 -0.95 L -0.15 -0.05 L -0.8 -0.5 Z', mode: 'fill' },
    ],
  },

  /**
   * A filled bar, which is the teletext marking: the key itself is a light pill and the colour sits
   * on a small bar inside it. Drawing it this way is what keeps the key's own fill free for the
   * interface to colour by device.
   */
  bar: { parts: [{ d: 'M -0.9 -0.34 H 0.9 V 0.34 H -0.9 Z', mode: 'fill', accent: true }] },

  /**
   * A filled dot, which is what the four teletext keys of a Harmony 525 carry: a coloured circle
   * rather than the coloured bar a Harmony 600 prints. It takes the accent for the same reason the bar
   * does, since on those keys the colour is the whole identity.
   */
  dot: { parts: [{ d: 'M -0.5 0 A 0.5 0.5 0 1 0 0.5 0 A 0.5 0.5 0 1 0 -0.5 0 Z', mode: 'fill', accent: true }] },

  chevronUp: { parts: [{ d: 'M -0.8 0.35 L 0 -0.4 L 0.8 0.35', mode: 'stroke' }] },
  chevronDown: { parts: [{ d: 'M -0.8 -0.4 L 0 0.35 L 0.8 -0.4', mode: 'stroke' }] },
  triangleUp: { parts: [{ d: 'M -0.8 0.85 L 0.8 0.85 L 0 -0.85 Z', mode: 'fill' }] },
  triangleDown: { parts: [{ d: 'M -0.8 -0.85 L 0.8 -0.85 L 0 0.85 Z', mode: 'fill' }] },
  triangleLeft: { parts: [{ d: left(0.85, -0.85), mode: 'fill' }] },
  triangleRight: { parts: [{ d: right(-0.85, 0.85), mode: 'fill' }] },

  /**
   * The volume and channel marks, filled rather than stroked, and that is a measurement rather than a
   * taste. A stroked mark takes the shared 0.16 width, which comes out at a tenth of the mark across;
   * on the Harmony 525's photograph the printed plus is 11.3 units wide, 10.2 tall and its bars are 2.8
   * across, so a quarter, and the minus is 10.6 by 1.4. Filling them is what lets each carry its own
   * weight without moving every other symbol, and only this model uses either.
   */
  plus: { parts: [{ d: 'M -1 -0.248 H -0.248 V -0.903 H 0.248 V -0.248 H 1 V 0.248 '
      + 'H 0.248 V 0.903 H -0.248 V 0.248 H -1 Z', mode: 'fill' }] },
  minus: { parts: [{ d: 'M -1 -0.132 H 1 V 0.132 H -1 Z', mode: 'fill' }] },

  /** The power mark: a ring broken at the top with a stem through the gap. */
  power: { parts: [
      { d: 'M -0.5 -0.55 A 0.75 0.75 0 1 0 0.5 -0.55', mode: 'stroke' },
      { d: 'M 0 -0.9 V -0.1', mode: 'stroke' },
    ],
  },

  /**
   * The paging arrows either side of a Harmony One's screen: a triangle three times as tall as it is
   * wide, which no square one can stand in for.
   *
   * The proportion is the drawing's own, 8.607 by 27.436 with the apex on the centre line, so this is
   * the traced shape redrawn in the shared set rather than a new invention. Only this model has them.
   */
  pageLeft: { parts: [{ d: 'M 0.3137 -1 L 0.3137 1 L -0.3137 0 Z', mode: 'fill' }] },
  pageRight: { parts: [{ d: 'M -0.3137 -1 L -0.3137 1 L 0.3137 0 Z', mode: 'fill' }] },

  /** A horizontal bar, the marking on the key below a Harmony 600's screen. */
  dash: { parts: [{ d: 'M -0.9 0 H 0.9', mode: 'stroke' }] },
  /** The upright version, which is what the four keys flanking that screen carry. */
  dashVertical: { parts: [{ d: 'M 0 -0.8 V 0.8', mode: 'stroke' }] },

  /**
   * The four activity marks a Harmony 600 prints on its activity keys: a television, a film
   * clapperboard, a pair of notes and a star. Drawn as outlines because on this drawing the key is
   * light and the mark is dark, which is the reverse of the product, where a white mark sits on a
   * dark key.
   */
  tv: { parts: [
      { d: 'M -0.8 -0.75 H 0.8 V 0.35 H -0.8 Z', mode: 'stroke' },
      { d: 'M -0.3 0.35 L -0.45 0.8 M 0.3 0.35 L 0.45 0.8 M -0.55 0.8 H 0.55', mode: 'stroke' },
    ],
  },
  movie: { parts: [
      { d: 'M -0.8 -0.3 H 0.8 V 0.8 H -0.8 Z', mode: 'stroke' },
      { d: 'M -0.85 -0.75 L 0.75 -0.9 L 0.8 -0.4 L -0.8 -0.28 Z', mode: 'stroke' },
      { d: 'M -0.4 -0.8 L -0.3 -0.34 M 0.05 -0.85 L 0.15 -0.39 M 0.45 -0.87 L 0.55 -0.42', mode: 'stroke' },
    ],
  },
  music: { parts: [
      { d: 'M -0.55 0.5 A 0.26 0.26 0 1 0 -0.03 0.5 A 0.26 0.26 0 1 0 -0.55 0.5 Z', mode: 'fill' },
      { d: 'M 0.32 0.28 A 0.26 0.26 0 1 0 0.84 0.28 A 0.26 0.26 0 1 0 0.32 0.28 Z', mode: 'fill' },
      { d: 'M -0.03 0.5 V -0.62 L 0.84 -0.82 V 0.28', mode: 'stroke' },
      { d: 'M -0.03 -0.28 L 0.84 -0.48', mode: 'stroke' },
    ],
  },
  star: { parts: [
      {
        d: 'M 0 -0.85 L 0.212 -0.291 L 0.808 -0.263 L 0.342 0.111 L 0.5 0.688 '
          + 'L 0 0.36 L -0.5 0.688 L -0.342 0.111 L -0.808 -0.263 L -0.212 -0.291 Z',
        mode: 'stroke',
      },
    ],
  },
} as const;

export type IconName = keyof typeof ICONS;
