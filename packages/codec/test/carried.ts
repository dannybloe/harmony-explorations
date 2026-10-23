/**
 * What a composed Harmony One setup carries out of a Logitech compile, `todo-compile-one.md` 3.2's listing: the census
 * that cuts a configuration into units and counts the output's units a donor holds, shared by the setup composed onto
 * Logitech's compile, `composesetup.test.ts`, and the one composed onto the empty One, `composeempty.test.ts`, since
 * `todo-compile-one.md` 8.1.4. Moved here unchanged out of the first, so both count with one census.
 */
import assert from 'node:assert/strict';

import { type Container, type Recipe, SCREEN_OWNERS, claims, pointers, screenUnits } from '../src/index.ts';
import { devices } from '../src/inventory.ts';
import type { DonorDeviceRequest } from '../src/composecatalogue.ts';

/**
 * The bytes nothing on the composed path takes from the donor: the frame computes the header, the section table,
 * the marker, the architecture record, the clock section and the trailer (6.1), and the letterer writes every
 * glyph set (1.2.7), 22 of whose glyphs on this donor, a space in nine sets and shapes such as `.` and `I`, come
 * out byte for byte as Logitech's.
 */
export const NEVER_CARRIED = new Set(['header', 'section-table', 'marker', 'trailer', 'slot-1-arch', 'slot-3-clock', 'glyph', 'font-set']);

export interface Unit { kind: string; key: string; skeleton: string; bytes: number }

/**
 * A configuration cut into units: its screen bytes as `screenUnits` cuts them, keyed by the verbatim form (where a
 * thing sits abstracted), and every other byte by the first claim of `coverage.ts` that holds it, keyed by its
 * bytes with every address field the census knows zeroed. A unit's skeleton is its key with the texts, fonts,
 * text positions and pictures abstracted, which is what is left of a screen once ours are put in.
 *
 * `built`, per byte, is nonzero where a builder on the composed path reproduces the byte, `touchBuiltBytes`, since
 * `todo-compile-one.md` 3.2.2: a unit counts only its bytes no builder reproduces, and a unit every byte of which
 * a builder reproduces is left out, so it neither counts nor takes a donor unit a carried one could match. A
 * builder's part comes out byte for byte as Logitech's in places, the wiring whole, and only this tells it from
 * the donor's.
 */
export function unitsOf(c: Container, built?: Uint8Array): Unit[] {
  const out: Unit[] = [];
  const owned = new Uint8Array(c.blob.length);
  const left = (from: number, to: number): number => {
    let n = 0;
    for (let i = from; i < to; i += 1) if (built === undefined || built[i] === 0) n += 1;
    return n;
  };
  for (const unit of screenUnits(c)!) {
    const skeleton = unit.verbatim
      .replace(/(^|[ :|#[])(4|5)\(([0-9a-f]{4})\)[0-9a-f]*/g, '$1T').replace(/F\d+/g, 'F').replace(/@pic:[0-9a-f?]+/g, '@pic');
    for (const range of unit.ranges) owned.fill(1, range.start, range.start + range.length);
    const bytes = unit.ranges.reduce((n, range) => n + left(range.start, range.start + range.length), 0);
    if (bytes === 0) continue;
    out.push({ kind: unit.kind === 'mode' ? `mode ${unit.role}` : unit.kind, key: `${unit.kind}|${unit.verbatim}`,
               skeleton: `${unit.kind}|${skeleton}`, bytes });
  }
  const zeroed = c.blob.slice();
  for (const field of pointers(c)) zeroed.fill(0, field.at, field.at + 3);
  for (const claim of claims(c)) {
    if (SCREEN_OWNERS.has(claim.owner)) continue;
    let fresh = 0;
    for (let i = claim.start; i < claim.start + claim.length; i += 1) {
      if (owned[i] === 0) {
        owned[i] = 1;
        if (built === undefined || built[i] === 0) fresh += 1;
      }
    }
    if (fresh === 0) continue;
    const key = `${claim.owner}|${Buffer.from(zeroed.subarray(claim.start, claim.start + claim.length)).toString('hex')}`;
    out.push({ kind: claim.owner, key, skeleton: key, bytes: fresh });
  }
  // Every byte is claimed, so nothing is left out of the count below by being in no unit.
  assert.equal(owned.indexOf(0), -1);
  return out;
}

/**
 * The output's bytes per kind whose unit the donor holds: verbatim first, then by skeleton among the donor's units
 * not taken, each donor unit taken once. `built` is the output's bytes a builder reproduces, which are not carried.
 */
export function carried(out: Container, donor: Container, built?: Uint8Array): Record<string, number> {
  const tally = (units: Unit[], field: 'key' | 'skeleton'): Map<string, number> => {
    const m = new Map<string, number>();
    for (const one of units) m.set(one[field], (m.get(one[field]) ?? 0) + 1);
    return m;
  };
  const theirs = unitsOf(donor);
  const keys = tally(theirs, 'key');
  const skeletons = tally(theirs, 'skeleton');
  const result: Record<string, number> = {};
  const take = (one: Unit): void => { result[one.kind] = (result[one.kind] ?? 0) + one.bytes; };
  const rest: Unit[] = [];
  for (const one of unitsOf(out, built).filter((unit) => !NEVER_CARRIED.has(unit.kind))) {
    const left = keys.get(one.key) ?? 0;
    if (left === 0) { rest.push(one); continue; }
    keys.set(one.key, left - 1);
    skeletons.set(one.skeleton, (skeletons.get(one.skeleton) ?? 0) - 1);
    take(one);
  }
  for (const one of rest) {
    const left = skeletons.get(one.skeleton) ?? 0;
    if (left <= 0) continue;
    skeletons.set(one.skeleton, left - 1);
    take(one);
  }
  return result;
}

/**
 * The setup's seven devices as a configuration names them, each with its catalogue entry: by the setup's name, or by
 * `<manufacturer>_<model>` for a device Logitech compiled, as `composeSetupParts` finds them.
 */
export const catalogueDevices = (c: Container, setup: Recipe): DonorDeviceRequest[] => setup.devices.map((one) => {
  const [manufacturer, model] = one.device.split('/');
  const label = devices(c).find((d) => d.name !== undefined
    && (d.name.replaceAll('_', ' ') === one.name || d.name === one.device.replace('/', '_')))?.name;
  assert.ok(label !== undefined && manufacturer !== undefined && model !== undefined, one.name);
  return { label, manufacturer, model };
});
