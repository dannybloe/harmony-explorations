/**
 * Which of the infrared archive's commands the catalogue composer writes, and why the rest are refused:
 * the composer's own test over every command, `todo-process-logitech.md` chapter 2, whose done
 * criterion is that this refuses nothing.
 *
 * **A command is judged per device, since section 347.** Until then composing a code was a property of
 * the code alone, `composableKeycode`, because a code composed only where the rhythm table held a whole
 * block for its family. A family whose definition states no repeat count now composes at the count the
 * **device** states, so one codeset can compose for one of its devices and not for another: a device
 * stating a count of 0, or one whose codeset holds a family stating a different count, is refused. So a
 * command counts as written when it composes for **every** device serving its codeset, and the ones that
 * compose for some only are counted apart. A codeset no device serves is judged by the table alone.
 *
 * It prints the composer's verdict before section 347, the table alone, beside the verdict now, so the
 * one number this step moves is visible next to the ones it does not.
 *
 * Usage: `make composecensus`. Needs the public infrared archive checkout, no lab and no network. Not in
 * `make all`: it reads every one of the archive's device and codeset files, about half a minute.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE } from '@harmony/lab';
import {
  archiveProtocolsByName, catalogueCommandBlocks, cataloguePressRepeats, composableKeycode, statedCode,
  statedProtocol, type PressRepeats,
} from '../src/index.ts';

const root = IR_ARCHIVE;
if (root === undefined) {
  console.error('no infrared archive checkout found; set HARMONY_IR_ARCHIVE');
  process.exit(1);
}
const protocols = archiveProtocolsByName(root);

/** Every device's count by its codeset: the archive's own index, then one read per device file. */
const countsBySet = new Map<string, number[]>();
let devices = 0;
const manufacturers = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as { s: string }[];
for (const { s: slug } of manufacturers) {
  let rows: { f: string }[];
  try { rows = JSON.parse(readFileSync(join(root, 'devices', slug, 'index.json'), 'utf8')) as { f: string }[]; }
  catch { continue; }
  for (const row of rows) {
    const device = JSON.parse(readFileSync(join(root, 'devices', slug, row.f), 'utf8')) as
      { codeset?: string | null; timing?: { pressMinRepeats?: number } };
    if (!device.codeset || device.timing?.pressMinRepeats === undefined) continue;
    devices += 1;
    const list = countsBySet.get(device.codeset) ?? [];
    list.push(device.timing.pressMinRepeats);
    countsBySet.set(device.codeset, list);
  }
}

const familyOf = (keycode: string): string | undefined => /^G:([^:]+):/.exec(keycode)?.[1];
const tableVerdict = new Map<string, boolean>();
const byTable = (keycode: string): boolean => {
  let ok = tableVerdict.get(keycode);
  if (ok === undefined) {
    try { ok = composableKeycode(keycode); } catch { ok = false; }
    tableVerdict.set(keycode, ok);
  }
  return ok;
};

let commands = 0;
let before = 0;
let after = 0;
let someDevices = 0;
let sets = 0;
let setsNoneBefore = 0;
let setsNoneAfter = 0;
let devicesWholeBefore = 0;
let devicesWholeAfter = 0;
const perFamily = new Map<string, { commands: number; before: number; after: number }>();
/** A command's verdict at one device count, memoised: a code recurs across thousands of codesets. */
const verdictOf = new Map<string, { refusal: string } | true>();
function derive(keycode: string, press: PressRepeats): { refusal: string } | true {
  const key = `${keycode}|${'refusal' in press ? press.refusal : press.repeats}`;
  let found = verdictOf.get(key);
  if (found === undefined) {
    const built = catalogueCommandBlocks(keycode, press, protocols);
    found = built === undefined || !('refusal' in built) ? true : { refusal: built.refusal };
    verdictOf.set(key, found);
  }
  return found;
}

/** Why a command still does not compose, its first refusing device's reason, by command. */
const reasons = new Map<string, number>();
/** Per family, why its commands are still refused, by command. */
const familyReasons = new Map<string, Map<string, number>>();
/** Per family, why its commands were refused before, by the table alone: the class it falls in. */
const refusedBefore = new Map<string, Set<string>>();

for (const bucket of readdirSync(join(root, 'codesets'))) {
  for (const file of readdirSync(join(root, 'codesets', bucket))) {
    const at = `codesets/${bucket}/${file}`;
    const raw = JSON.parse(readFileSync(join(root, at), 'utf8')) as unknown;
    const list = (Array.isArray(raw) ? raw : (raw as { commands?: unknown[] }).commands ?? []) as
      { keycode?: string }[];
    const keycodes = list.flatMap((one) => (one.keycode === undefined ? [] : [one.keycode]));
    const counts = countsBySet.get(at) ?? [];
    const distinct = [...new Set(counts)];
    const presses = distinct.map((n) => cataloguePressRepeats({ timing: { pressMinRepeats: n } }, keycodes, protocols));
    sets += 1;
    let anyBefore = false;
    let anyAfter = false;
    const refusedAt = new Set<number>();
    let refusedByTable = false;
    for (const keycode of keycodes) {
      const family = familyOf(keycode);
      if (family === undefined) continue;
      commands += 1;
      const tally = perFamily.get(family) ?? { commands: 0, before: 0, after: 0 };
      perFamily.set(family, tally);
      tally.commands += 1;
      if (byTable(keycode)) {
        before += 1; after += 1; tally.before += 1; tally.after += 1;
        anyBefore = true; anyAfter = true;
        continue;
      }
      refusedByTable = true;
      const verdicts = presses.length === 0
        ? [derive(keycode, { refusal: 'no device serves the codeset' })]
        : presses.map((press) => derive(keycode, press));
      // Why the table alone refused it: no reading of the code, no rhythm, a whole block that does not
      // take this code, or no whole block at all, which is the class section 347 is about.
      const read = statedCode(keycode);
      const entry = read === undefined ? undefined : statedProtocol(read.family);
      const kind = read === undefined ? 'reader' : entry === undefined ? 'rhythm'
        : entry.tail !== undefined || entry.quad !== undefined || entry.longToggle !== undefined
          || entry.sections !== undefined ? 'block' : 'no whole block';
      const kinds = refusedBefore.get(family) ?? new Set<string>();
      kinds.add(kind);
      refusedBefore.set(family, kinds);
      const ok = verdicts.map((one) => one === true);
      ok.forEach((good, k) => { if (!good) refusedAt.add(distinct[k] ?? -1); });
      if (ok.every(Boolean)) { after += 1; tally.after += 1; anyAfter = true; continue; }
      if (ok.some(Boolean)) someDevices += 1;
      const why = verdicts.find((one) => one !== true) as { refusal: string };
      const reason = why.refusal.replace(/ \d+ and its .* commands' family states \d+/, ' N and a family on its codeset states another')
        .replace(/no rhythm for .*/, 'no rhythm for the family').replace(/^.*'s block does not take this code$/, "the family's table block does not take this code")
        .replace(/the archive holds no definition of .*/, 'the archive holds no definition of the family');
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
      const mine = familyReasons.get(family) ?? new Map<string, number>();
      mine.set(reason, (mine.get(reason) ?? 0) + 1);
      familyReasons.set(family, mine);
    }
    if (!anyBefore) setsNoneBefore += 1;
    if (!anyAfter) setsNoneAfter += 1;
    // A device composes whole when every command does for it: by the table, or derived at its count.
    for (const n of counts) {
      if (!refusedByTable) devicesWholeBefore += 1;
      if (!refusedAt.has(n)) devicesWholeAfter += 1;
    }
  }
}

const families = [...perFamily.keys()];
const refusing = (key: 'before' | 'after') => families.filter((one) => perFamily.get(one)![key] < perFamily.get(one)!.commands);
const nothing = (key: 'before' | 'after') => families.filter((one) => perFamily.get(one)![key] === 0);
console.log(`${commands} commands over ${sets} codesets and ${devices} devices with a codeset, ${families.length} families`);
console.log('');
console.log('                                   table alone   now');
console.log(`commands written                   ${String(before).padStart(11)}   ${after}`);
console.log(`families refusing a command        ${String(refusing('before').length).padStart(11)}   ${refusing('after').length}`);
console.log(`families writing nothing           ${String(nothing('before').length).padStart(11)}   ${nothing('after').length}`);
console.log(`codesets writing nothing           ${String(setsNoneBefore).padStart(11)}   ${setsNoneAfter}`);
console.log(`devices writing every command      ${String(devicesWholeBefore).padStart(11)}   ${devicesWholeAfter}`);
console.log(`\n${someDevices} commands write for some of their codeset's devices and not all, counted as refused`);
console.log('\nwhy a command is still refused, by its first refusing device:');
for (const [why, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(7)}  ${why}`);
// The families the table refused only for want of a whole block, todo-process-logitech 2.2's share.
const countOnly = refusing('before').filter((one) => [...(refusedBefore.get(one) ?? [])].every((k) => k === 'no whole block'));
const countOnlyStill = countOnly.filter((one) => perFamily.get(one)!.after < perFamily.get(one)!.commands);
const countOnlyCommands = (list: string[], key: 'before' | 'after') => list.reduce((n, one) =>
  n + perFamily.get(one)!.commands - perFamily.get(one)![key], 0);
console.log(`\nfamilies the table refused only for want of a whole block: ${countOnly.length}, `
  + `${countOnlyCommands(countOnly, 'before')} commands refused by the table alone; `
  + `${countOnlyStill.length} of them still refuse ${countOnlyCommands(countOnly, 'after')} commands`);
// And why those still refuse: commands per reason, and how many of the families each reason touches.
const stillWhy = new Map<string, { commands: number; families: number }>();
for (const family of countOnlyStill) {
  for (const [why, n] of familyReasons.get(family) ?? []) {
    const one = stillWhy.get(why) ?? { commands: 0, families: 0 };
    one.commands += n; one.families += 1;
    stillWhy.set(why, one);
  }
}
for (const [why, { commands: n, families: f }] of [...stillWhy].sort((a, b) => b[1].commands - a[1].commands)) {
  console.log(`  ${String(n).padStart(7)} commands in ${String(f).padStart(3)} families  ${why}`);
}
const onlyOne = (why: string) => countOnlyStill.filter((one) => {
  const m = familyReasons.get(one); return m !== undefined && m.size === 1 && m.has(why);
}).length;
console.log(`  families held back by the release group alone: `
  + `${onlyOne('the code names a release group, which no Logitech compile here shows stored')}`);
