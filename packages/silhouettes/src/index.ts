/**
 * Measured front face geometry per Harmony model, and the SVG it generates.
 *
 * What a host gets from here: the list of buttons as data, so it can colour every key that drives one
 * device and say which key a click landed on, and the drawing itself. Both from the same table, which
 * is the point: a button list that lived only in the XML would have to be parsed back or copied into
 * a second table, and two copies of a derivation is this repository's oldest rule.
 */
export { CASE_HEIGHT, LAYERS } from './types.ts';
export type { Key, KeyKind, Label, LabelPlace, LayerName, Model, Provenance, Region, Screen, Shape } from './types.ts';
export { ICONS, extentOf } from './icons.ts';
export { pathBounds, transformPath, parseTransform, compose, pathPolygon, pointInPath, IDENTITY,
  type Bounds, type Matrix } from './path.ts';
export type { Icon, IconPart } from './icons.ts';
export { arcRing, circle, contour, cross, pill, poly, roundRect, segment, traced } from './shapes.ts';
export { DEFAULTS, DETAIL, elementId, toSvg } from './svg.ts';
export type { SvgOptions } from './svg.ts';

import { H525 } from './models/h525.ts';
import { H600 } from './models/h600.ts';
import { ONE } from './models/one.ts';
import type { Key, Model } from './types.ts';

/** Every model that is drawn. A model absent from here has not been measured yet. */
export const MODELS: Readonly<Record<string, Model>> = { h525: H525, h600: H600, one: ONE };

export { H525, H600, ONE };

/**
 * The key a name refers to on this model.
 *
 * This is the whole reason a key carries Logitech's own word rather than an id of ours: the question
 * "which key is the mute key" has one answer per model and the caller should not have to know whether
 * this remote prints a crossed out speaker or the word Mute.
 */
export function keyOf(model: Model, name: string): Key | undefined {
  return model.keys.find((k) => k.name === name);
}

/** The key a scan code belongs to, where that has been measured. Undefined is the honest answer. */
export function keyOfScan(model: Model, scan: number): Key | undefined {
  return model.keys.find((k) => k.scan === scan);
}
