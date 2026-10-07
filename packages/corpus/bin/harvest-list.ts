/**
 * The device list for a family harvest, `todo-secure-logitech.md` 2.1: for every infrared family the
 * composer cannot write, a catalogue device whose codes hold it, so a Logitech compile of that device
 * shows how their compiler lays the family out.
 *
 * ```
 * node packages/corpus/bin/harvest-list.ts [--second 20] [--out <lab path>]
 * ```
 *
 * **Which families.** Every family with at least one command `composableKeycode` refuses, which is the
 * composer's own test, so the list is exactly the gap the composer has. For a family that writes except
 * for a few codes, the device chosen must hold one of those codes, not just the family.
 *
 * **Which device.** Greedy, largest family first: the code set holding the most refused commands of
 * that family wins, a code set whose refused commands are all in that one family is preferred on a tie,
 * and a device already chosen for an earlier family is reused when its code set covers this one too,
 * since one device can carry several families into one compile. The device must have a model name,
 * because the service is searched by it. `--second` adds a second, different code set for the largest
 * families, the check that a family's rule is the family's and not one device's.
 *
 * **Order is the harvest order**: the families with the most commands first, so the most is secured
 * earliest if the service goes away part way.
 *
 * Reads the archive checkout only, no network, no lab input. The list is written into the lab, beside
 * the harvests it feeds.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { IR_ARCHIVE, LAB } from '@harmony/lab';
import { composableKeycode } from '@harmony/codec';
import { HarvestRefusal } from '../src/harvest.ts';

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}
if (IR_ARCHIVE === undefined) throw new HarvestRefusal('no archive checkout');
if (LAB === undefined) throw new HarvestRefusal('no lab to write the list into');
const ARCHIVE = IR_ARCHIVE;
const second = Number(flag('second') ?? 20);
const out = flag('out') ?? join(LAB, 'work', 'harvest', 'lists', 'families.json');

/** A family's name out of a keycode, `G:<family>:<code>`, or undefined for one stating none. */
function familyOf(keycode: string): string | undefined {
  return /^G:([^:]+):/.exec(keycode)?.[1];
}

// Every code set: how many refused commands it holds per family. A keycode is judged once.
const verdict = new Map<string, boolean>();
const refusedBySet = new Map<string, Map<string, number>>();
const commandsByFamily = new Map<string, number>();
for (const bucket of readdirSync(join(ARCHIVE, 'codesets'))) {
  for (const file of readdirSync(join(ARCHIVE, 'codesets', bucket))) {
    const raw = JSON.parse(readFileSync(join(ARCHIVE, 'codesets', bucket, file), 'utf8')) as unknown;
    const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as
      { keycode?: string }[];
    const refused = new Map<string, number>();
    for (const command of list) {
      const keycode = command.keycode ?? '';
      const family = familyOf(keycode);
      if (family === undefined) continue;
      commandsByFamily.set(family, (commandsByFamily.get(family) ?? 0) + 1);
      let ok = verdict.get(keycode);
      if (ok === undefined) {
        try { ok = composableKeycode(keycode); } catch { ok = false; }
        verdict.set(keycode, ok);
      }
      if (!ok) refused.set(family, (refused.get(family) ?? 0) + 1);
    }
    if (refused.size > 0) refusedBySet.set(`codesets/${bucket}/${file}`, refused);
  }
}

// Every device with a model, by code set: the service is searched by manufacturer and model.
interface Candidate { slug: string; file: string; model: string; globalDeviceId: number }
const devicesBySet = new Map<string, Candidate[]>();
const manufacturers = JSON.parse(readFileSync(join(ARCHIVE, 'index.json'), 'utf8')) as { s: string }[];
for (const { s: slug } of manufacturers) {
  let rows: { f: string; id: number; m: string | null }[];
  try { rows = JSON.parse(readFileSync(join(ARCHIVE, 'devices', slug, 'index.json'), 'utf8')); } catch { continue; }
  for (const row of rows) {
    if (row.m === null) continue;
    const device = JSON.parse(readFileSync(join(ARCHIVE, 'devices', slug, row.f), 'utf8')) as { codeset?: string | null };
    if (!device.codeset || !refusedBySet.has(device.codeset)) continue;
    const list = devicesBySet.get(device.codeset) ?? [];
    list.push({ slug, file: row.f, model: row.m, globalDeviceId: row.id });
    devicesBySet.set(device.codeset, list);
  }
}

// The families to cover, the largest first by commands in the whole catalogue.
const families = [...new Set([...refusedBySet.values()].flatMap((one) => [...one.keys()]))]
  .sort((a, b) => (commandsByFamily.get(b) ?? 0) - (commandsByFamily.get(a) ?? 0) || a.localeCompare(b));

interface Pick extends Candidate { codeset: string; families: string[]; second?: boolean }
const picks: Pick[] = [];
const covered = new Map<string, number>();
const uncoverable: string[] = [];
function choose(family: string, avoid: Set<string>): Pick | undefined {
  // A code set already chosen that covers the family is reused before a new device is added.
  const reuse = picks.find((one) => !avoid.has(one.codeset) && (refusedBySet.get(one.codeset)?.get(family) ?? 0) > 0);
  if (reuse !== undefined) return reuse;
  let best: { set: string; count: number; pure: boolean } | undefined;
  for (const [set, refused] of refusedBySet) {
    const count = refused.get(family) ?? 0;
    if (count === 0 || avoid.has(set) || !devicesBySet.has(set)) continue;
    const pure = refused.size === 1;
    if (best === undefined || count > best.count || (count === best.count && pure && !best.pure)
        || (count === best.count && pure === best.pure && set < best.set)) best = { set, count, pure };
  }
  if (best === undefined) return undefined;
  const device = [...devicesBySet.get(best.set)!].sort((a, b) => a.globalDeviceId - b.globalDeviceId)[0]!;
  const pick: Pick = { ...device, codeset: best.set, families: [...refusedBySet.get(best.set)!.keys()] };
  picks.push(pick);
  return pick;
}
for (const family of families) {
  if ((covered.get(family) ?? 0) > 0) continue;
  const pick = choose(family, new Set());
  if (pick === undefined) { uncoverable.push(family); continue; }
  for (const one of pick.families) covered.set(one, (covered.get(one) ?? 0) + 1);
}
// The second device for the largest families: a different code set holding the same family.
for (const family of families.slice(0, second)) {
  const used = new Set(picks.filter((one) => one.families.includes(family)).map((one) => one.codeset));
  const before = picks.length;
  const pick = choose(family, used);
  if (pick !== undefined && picks.length > before) pick.second = true;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  families: families.length, devices: picks.length, uncoverable,
  list: picks.map(({ slug, file, model, globalDeviceId, codeset, families: held, second: isSecond }) => ({
    manufacturer: slug, file, model, globalDeviceId, codeset, families: held, ...(isSecond ? { second: true } : {}),
  })),
}, null, 1)}\n`);
console.log(`${families.length} families with refused commands, ${picks.length} devices cover them`
  + ` (${picks.filter((one) => one.second).length} second devices), ${uncoverable.length} with no device`
  + ` that has a model; written to ${out}`);
