/**
 * Measured front face geometry per Harmony model, and the SVG it generates.
 *
 * What a host gets from here: the list of buttons as data, so it can colour every key that drives one
 * device and say which key a click landed on, and the drawing itself. Both from the same table, which
 * is the point: a button list that lived only in the XML would have to be parsed back or copied into
 * a second table, and two copies of a derivation is this repository's oldest rule.
 *
 * **Explicit names**, held by `test/surface.test.ts`, plan 013 decision 6. What a model's geometry table is written
 * with, the shapes and the transforms of a path, is `./internal`, for the models here and this repository's
 * scripts.
 */
// The geometry table's types: a model, its keys and regions, and where each fact came from.
export { CASE_HEIGHT, LAYERS, SCAN_SOURCES } from './types.ts';
export type { Key, KeyKind, Label, LabelPlace, LayerName, Model, Provenance, Region, ScanSource, Screen, Shape }
  from './types.ts';
// The icons a key is drawn with.
export { ICONS, extentOf } from './icons.ts';
export type { Icon, IconPart } from './icons.ts';
// Which key a point falls in, and a path's extent.
export { pathBounds, pathPolygon, pointInPath, type Bounds } from './path.ts';
// The drawing.
export { DEFAULTS, DETAIL, elementId, toSvg } from './svg.ts';
export type { SvgOptions } from './svg.ts';

import { H300 } from './models/h300.ts';
import { H300EU } from './models/h300eu.ts';
import { H350 } from './models/h350.ts';
import { H515 } from './models/h515.ts';
import { H525 } from './models/h525.ts';
import { H600 } from './models/h600.ts';
import { H650 } from './models/h650.ts';
import { H700 } from './models/h700.ts';
import { H720 } from './models/h720.ts';
import { H880 } from './models/h880.ts';
import { H880PRO } from './models/h880pro.ts';
import { H885 } from './models/h885.ts';
import { H890PRO } from './models/h890pro.ts';
import { ONE } from './models/one.ts';
import { TOUCH } from './models/touch.ts';
import type { Key, Model } from './types.ts';

/** Every model that is drawn. A model absent from here has not been measured yet. */
export const MODELS: Readonly<Record<string, Model>> = {
  h300: H300, h300eu: H300EU, h350: H350, h515: H515, h525: H525, h600: H600, h650: H650, h700: H700, h720: H720, h880: H880,
  h880pro: H880PRO, h885: H885, h890pro: H890PRO, one: ONE, touch: TOUCH,
};

export { H300, H300EU, H350, H515, H525, H600, H650, H700, H720, H880, H880PRO, H885, H890PRO, ONE, TOUCH };

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
