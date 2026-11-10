/**
 * What Logitech's compiler stores for a Harmony 300 or 350 device that no key, list, transition or channel sends,
 * Every send list nothing calls, on every current compile of the family the lab holds,
 * named by the catalogue command whose record it sends, and the rules that account for them.
 *
 * **Why.** Built from nothing, 5.1.6, the test setup was Logitech's second compile by content but for two records of
 * the LG TV's that nothing sends, its Back and a copy of a code the catalogue names OK without its opening silence,
 * each with a send list nothing calls. The rule 4.1.1 measured for these lists, Teletext and the ten digits' one
 * block copies by device type, `keys.ts`, did not account for them. So every such list of the family's compiles is
 * read here and put in exactly one class, and a class is a rule only where it is counted both ways.
 *
 * **The population**: the twelve current compiles of the family, the census's and the constants tests' thirteen
 * less the Harmony 300's first configuration, which is of a 2011 generation of the compiler whose one block records
 * are of another shape, `noscreenrouting.test.ts`. They are not twelve independent samples: the test setup is in two
 * compiles, the LG TV of the test setup is in six, and the bench 350's two later files are one account,
 * `noscreennumbering.test.ts`. 47 devices in all, each identified by the catalogue entry whose command
 * names its metadata archive lists, `IDENTIFIED` in `noscreenparts.ts` and `HARVESTED` below, checked here for the
 * further compiles as the routing test checks the rest. A record is named by every catalogue command whose composed
 * record it equals word for word, or, with "(copy)", whose first block less its opening silence it is with no held
 * block, since one code can carry several names: the Philips 32PFL7406H/12's Info and Teletext are one code.
 *
 * **What was found, class by class**, the counts in the first test:
 *
 * * **The ten digits' one block copies**, by device type, `DIGIT_COPIES_BY_TYPE`, where nothing else calls them; on a
 *   device whose digits a favourite channel sends they are called and not counted here.
 * * **Teletext**, whole, on the Harmony 350, whose keypad lacks the key the service puts it on, `STORED_UNBOUND`.
 * * **The channel tuning's finish, as a one block copy**: the catalogue's `channelTuning.finish` is `OK` on the test
 *   setup's LG and `Select` on a Sony KDL-55X830B, the two devices of the population that state one, and every
 *   compile holding either stores that command's copy with a send list nothing calls, 7 of 7 (the LG in six
 *   compiles, the Sony in one). No other uncalled list of the twelve sends a copy of anything but a digit, so the
 *   rule holds both ways: a finish is stored, and nothing else is. Read beside the number sender, a copy of the
 *   digits' shape after the digits is what a favourite channel on that device would send to end the number; on these
 *   compiles no favourite is on either device, so nothing calls it. That reading is not checked. `channelFinish` in
 *   `digits.ts`.
 * * **A television's Back**, whole, where no key of its map binds it, the map taking `Exit` and `ChannelPrev` before
 *   it: three televisions have that, the test setup's LG in six compiles, another owner's LG and the bench 350's first
 *   Philips, and Back is stored in 7 of the 8 compiles. **The eighth is the one compile where the LG is the setup's
 *   only device**, and Back is stored nowhere in it, not even unbound. The one device of another type with an
 *   unbound Back, a Humax video recorder, stores none, 0 of 1. So "a television, in a setup of more than one device"
 *   fits all nine, and each of its two conditions rests on one compile; every one of the three televisions was also
 *   on the TV key, so "the TV mode device" fits the same files. `TELEVISION_STORED_UNBOUND` in `keys.ts`. What
 *   Logitech stores Back for is not read: the client compiles nothing for this family, and no list of any compile
 *   reaches it.
 * * **A television's fifth favourite command on the Harmony 300**, Home or else Internet, which the 350 binds on its
 *   fifth favourite key, `FAVOURITE_FIVE`, and the 300's keypad lacks: whole, uncalled, on both Harmony 300 compiles'
 *   televisions with either, 2 of 2. Measured and not built: the device composer refuses a television on a skin
 *   `FAVOURITE_FIVE` has no row for, and no Harmony 300 setup is built here.
 * * **One list no class explains**: another owner's LG 60PV250N-ZA stores a whole OK, uncalled, beside the OK its
 *   OK key sends. Its catalogue entry states no channel tuning, and that compile is of an earlier owner whose
 *   catalogue may have differed, since two of its command names differ from the archive's, `IDENTIFIED`. Left as it
 *   is.
 *
 * **What it changes**: the device composer stores the finish copy and a television's Back, `devices.ts`, so the test
 * setup built from nothing stores the LG TV's two, `noscreenfromnothing.test.ts`; the setup composer tells it when a
 * device is the setup's only one, `alone`.
 *
 * **Replay and Advance**, a test of their own because they are the one difference left between the family's key table
 * and the service's map for the test setup's KPN box, `noscreenfromnothing.test.ts`: that box binds them on the skip
 * keys where nothing edited its map, and the one other device holding either name, a Sony VCR on a Harmony 300, stores
 * no record of its Replay. One for and one against, so the table is not widened.
 *
 * **Controls**: the class counts are exact, so a reader that names a record wrongly moves them; taking `Back` out of
 * `TELEVISION_STORED_UNBOUND`, run and reverted by string replacement, leaves the composed LG without Back and fails
 * the composer's test, and moves the seven to `unexplained` in the class counts; and the finish rule's converse is
 * asserted as a count of zero.
 *
 * **Sources checked first**: `noscreenrouting.test.ts` and `keys.ts`, 4.1.1; `noscreenfromnothing.test.ts`, 5.1.6;
 * `reference/architectures/harmony-300-350/memory.md`; the archive's own description of `channelTuning` and `states`,
 * its `README.md`; MyHarmony's decompiled source, which holds the feature's data contract,
 * `ChannelTuningFeature`, and no rule for what a compile stores, since the service compiles. **Which architectures**:
 * arch 16 alone, the Harmony 350 on ten compiles and the Harmony 300 on two.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  catalogueCommands,
  catalogueDevice,
  catalogueDriving,
  ComposeError,
  type Container,
  devices,
  irGroups,
  metadataArchive,
  parse,
  type Recipe,
  archiveAt,
} from '../../../src/node.ts';
import {
  buildNoScreenSetup,
  catalogueDevicePlan,
  composeIrGroup,
  deviceModeLayout,
  NO_SCREEN_HARD_KEYS,
  TELEVISION_TYPE,
} from '../../../src/build.ts';
import { numberSenders, stateRecords, taggedList } from '../../../src/internal.ts';
import { channelFinish } from '../../../src/families/harmony-300-350/digits.ts';
import { TELEVISION_STORED_UNBOUND } from '../../../src/families/harmony-300-350/keys.ts';
import { IDENTIFIED, onceWithoutLeadIn, recordKey } from './noscreenparts.ts';

const FIXTURES = ['h350_programmed_config', 'h350_three_devices_config', 'h350_config', 'h300_programmed_config'];
const needs = needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless(...FIXTURES));

/**
 * The further compiles by their path in the lab, each device by its metadata archive name, which on these is the
 * catalogue's manufacturer and model as the harvest put them on the account, and the catalogue file it is. The
 * harvest's own manifests name the same files; the first test checks every name against the catalogue.
 */
const HARVESTED: Readonly<Record<string, Readonly<Record<string, readonly [string, string]>>>> = {
  'work/harvest/check-350/compile-001-Result.EzHex': { 'Denon AVR-X4800H': ['Denon', 'AVR-X4800H'] },
  'work/harvest/check-350/compile-002-Result.EzHex': { 'LG OLED65G26LA': ['LG', 'OLED65G26LA'] },
  'work/harvest/check-350-retry/compile-001-Result.EzHex': { 'Denon AVR-X4800H': ['Denon', 'AVR-X4800H'], 'LG OLED65G26LA': ['LG', 'OLED65G26LA'] },
  'work/harvest/check-300/compile-001-Result.EzHex': { 'Denon AVR-X4800H': ['Denon', 'AVR-X4800H'], 'LG OLED65G26LA': ['LG', 'OLED65G26LA'] },
  'work/harvest/check-350-eight/compile-001-Result.EzHex': {
    'LG OLED65G26LA': ['LG', 'OLED65G26LA'], 'Panasonic TX-P42GT30E': ['Panasonic', 'TX-P42GT30E'], 'Sony KDL-55X830B': ['Sony', 'KDL-55X830B'],
    'Philips 32PFL7406H/12': ['Philips', '32PFL7406H_12'], 'Denon AVR-X4800H': ['Denon', 'AVR-X4800H'], 'KPN TV6000COK': ['KPN', 'TV6000COK'],
    'Plex Plex Player': ['Plex', 'Plex_Player'], 'Sony PlayStation 3 Slim': ['Sony', 'PlayStation_3_Slim'],
  },
};

/** A Logitech file of the family by its path in the lab, from its `GSPM` on; the lab is there, so a missing file fails. */
function atPath(path: string): Container {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  const bytes = readFileSync(at);
  return parse(new Uint8Array(bytes.subarray(bytes.indexOf('GSPM'))));
}

interface Compile {
  readonly name: string;
  readonly c: Container;
  /** The Harmony 300's skins, 78 and 79, or the 350's, 104. */
  readonly model: 300 | 350;
  /** Each device of the archive by its archive name: the catalogue entry it is. */
  readonly ids: Readonly<Record<string, readonly [string, string]>>;
}

/** The twelve current compiles. */
function compiles(): Compile[] {
  const strip = (ids: Readonly<Record<string, readonly [string, string, number]>>) =>
    Object.fromEntries(Object.entries(ids).map(([name, [m, d]]) => [name, [m, d] as const]));
  const out: Compile[] = [
    { name: 'setup', c: atPath('work/setups/h350-test/compile-Result.EzHex'), model: 350, ids: strip(IDENTIFIED['setup']!) },
    { name: 'setup first', c: atPath('work/setups/h350-test/first-compile/compile-Result.EzHex'), model: 350, ids: strip(IDENTIFIED['setup']!) },
    { name: 'programmed', c: parse(require_('h350_programmed_config')), model: 350, ids: strip(IDENTIFIED['programmed']!) },
    { name: 'three', c: parse(require_('h350_three_devices_config')), model: 350, ids: strip(IDENTIFIED['three']!) },
    { name: 'factory', c: parse(require_('h350_config')), model: 350, ids: strip(IDENTIFIED['factory']!) },
    { name: 'h300programmed', c: parse(require_('h300_programmed_config')), model: 300, ids: strip(IDENTIFIED['h300programmed']!) },
    {
      name: 'issue37', c: atPath('dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex'), model: 350,
      ids: strip(IDENTIFIED['issue37']!),
    },
  ];
  for (const [path, ids] of Object.entries(HARVESTED)) {
    out.push({ name: path.split('/').slice(2).join('/'), c: atPath(path), model: path.includes('check-300') ? 300 : 350, ids });
  }
  return out;
}

interface Instruction { operand: number; opcode: number }

function listBody(c: Container, index: number): Instruction[] {
  const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
  return Array.from({ length: c.blob[at]! }, (_, k) => ({
    operand: c.blob[at + 1 + 3 * k]! | (c.blob[at + 2 + 3 * k]! << 8), opcode: c.blob[at + 3 + 3 * k]!,
  }));
}

/**
 * Every list something calls: a call from another list, from any key map, from a state transition, from the start up
 * events, raw slot 5, whose instructions `pointerArray` reads as `0x7f0000` and the list, or from the number sender's
 * digit tables. A timer fires one instruction and none here calls a list, `memory.md`.
 */
function calledLists(c: Container): Set<number> {
  const called = new Set<number>();
  const add = (all: readonly Instruction[]) => { for (const one of all) if (one.opcode === 0x7f) called.add(one.operand); };
  c.pointerArray(7)!.forEach((_, index) => add(listBody(c, index)));
  for (const address of c.pointerArray(6)!) add(taggedList(c, address)!.entries);
  for (const record of stateRecords(c) ?? []) add(record.values ?? []);
  for (const value of c.pointerArray(5) ?? []) if (value >> 16 === 0x7f) called.add(value & 0xffff);
  for (const record of numberSenders(c)?.records ?? []) for (const table of record.tables) add(table.instructions);
  return called;
}

interface Stored {
  readonly compile: string;
  readonly device: string;
  readonly type: number;
  /** Every catalogue command the record is, word for word; empty where it is a copy. */
  readonly whole: readonly string[];
  /** Every catalogue command whose one block copy the record is; empty where it is whole. */
  readonly copy: readonly string[];
}

interface DeviceRead {
  readonly compile: string;
  readonly model: 300 | 350;
  readonly device: string;
  readonly type: number;
  readonly wanted: readonly string[];
  /** The commands the family's key table gives the device's map, `NO_SCREEN_HARD_KEYS`. */
  readonly onKeys: ReadonlySet<string>;
  readonly finish: string | undefined;
  /** How many devices the compile's account holds. */
  readonly accountSize: number;
  /** Its send lists nothing calls, each record named. */
  readonly uncalled: readonly Stored[];
  /** Every record of its group, named the same way. */
  readonly records: readonly Stored[];
}

let memo: DeviceRead[] | undefined;
/** Every identified device of the twelve compiles, read once. */
function read(): DeviceRead[] {
  if (memo !== undefined) return memo;
  const out: DeviceRead[] = [];
  for (const compile of compiles()) {
    const { c } = compile;
    const called = calledLists(c);
    const account = metadataArchive(c)!.devices;
    const groupOf = new Map(devices(c).filter((one) => one.name !== undefined).map((one) => [one.name!, one.group]));
    for (const one of account) {
      const id = compile.ids[one.name];
      const group = groupOf.get(one.name.replaceAll(' ', '_'));
      if (id === undefined || group === undefined) continue;
      const [manufacturer, model] = id;
      const plan = catalogueDevicePlan(c, archiveAt(IR_ARCHIVE!), { manufacturer, model, label: one.name.replaceAll(' ', '_'), full: true });
      const scratch = parse(composeIrGroup(c, plan.device.commands).bytes);
      const built = irGroups(scratch)!.at(-1)!.addresses;
      const keys = built.map((address) => recordKey(scratch, address));
      const onces = built.map((address) => onceWithoutLeadIn(scratch, address).code);
      const type = plan.entry.deviceType;
      const name = (address: number): Stored => {
        const key = recordKey(c, address);
        const whole = plan.wanted.filter((_, k) => keys[k] === key);
        const shape = onceWithoutLeadIn(c, address);
        const copy = whole.length > 0 || shape.held ? [] : plan.wanted.filter((_, k) => onces[k] === shape.code);
        return { compile: compile.name, device: one.name, type, whole, copy };
      };
      const addresses = irGroups(c)![group]!.addresses;
      const uncalled: Stored[] = [];
      c.pointerArray(7)!.forEach((_, index) => {
        if (called.has(index)) return;
        const body = listBody(c, index);
        // The family's send shape, the timers cancelled, the send and its quantity, of this device's group.
        if (body.length !== 3 || body[1]!.opcode !== 0x7d || body[1]!.operand >> 8 !== group) return;
        uncalled.push(name(addresses[body[1]!.operand & 0xff]!));
      });
      out.push({
        compile: compile.name, model: compile.model, device: one.name, type, wanted: plan.wanted,
        onKeys: new Set(deviceModeLayout(plan.wanted, NO_SCREEN_HARD_KEYS).keys.values()),
        finish: channelFinish(catalogueDriving(IR_ARCHIVE!, manufacturer, model), one.name), accountSize: account.length,
        uncalled, records: addresses.map(name),
      });
    }
  }
  memo = out;
  return out;
}

const DIGITS = new Set(Array.from({ length: 10 }, (_, d) => String(d)));

/** The class an uncalled send of a device falls in, by the rules the header states; `unexplained` where none does. */
function classOf(device: DeviceRead, one: Stored): string {
  if (one.copy.length > 0 && one.copy.every((name) => DIGITS.has(name))) return 'digit copy';
  if (one.copy.length > 0 && device.finish !== undefined && one.copy.includes(device.finish)) return 'finish copy';
  if (one.whole.includes('Teletext') && device.model === 350) return 'Teletext';
  if (one.whole.some((name) => TELEVISION_STORED_UNBOUND.includes(name)) && device.type === TELEVISION_TYPE) return 'television Back';
  if (device.model === 300 && device.type === TELEVISION_TYPE && one.whole.some((name) => name === 'Home' || name === 'Internet')) {
    return 'fifth favourite on the 300';
  }
  return 'unexplained';
}

test('the further compiles\' devices are the catalogue entries their names say, every command name the archive\'s', needs, () => {
  let checked = 0;
  for (const [path, ids] of Object.entries(HARVESTED)) {
    const c = atPath(path);
    for (const one of metadataArchive(c)!.devices) {
      const [m, d] = ids[one.name]!;
      const theirs = new Set(catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, m, d).codeset!).map((x) => x.name));
      const ours = new Set(one.commands.map((x) => x.name));
      assert.equal([...theirs].filter((x) => !ours.has(x)).length + [...ours].filter((x) => !theirs.has(x)).length, 0, `${path} ${one.name}`);
      checked += 1;
    }
  }
  assert.equal(checked, 14);
});

test('every send list nothing calls on the twelve current compiles falls in one of five classes but one', needs, () => {
  const all = read();
  assert.equal(new Set(all.map((one) => one.compile)).size, 12);
  assert.equal(all.length, 47);
  const counts: Record<string, number> = {};
  const unexplained: string[] = [];
  for (const device of all) {
    for (const one of device.uncalled) {
      const kind = classOf(device, one);
      counts[kind] = (counts[kind] ?? 0) + 1;
      if (kind === 'unexplained') unexplained.push(`${one.compile} ${one.device} ${one.whole.join('/')}${one.copy.join('/')}`);
    }
  }
  assert.deepEqual(counts, {
    'digit copy': 270, Teletext: 16, 'finish copy': 7, 'television Back': 7, 'fifth favourite on the 300': 2, unexplained: 1,
  });
  assert.deepEqual(unexplained, ['issue37 LG TV OK']);
});

test('a channel tuning\'s finish is stored as a one block copy nothing calls on every device stating one, and no other copy but a digit\'s is',
  needs, () => {
    const all = read();
    const withFinish = all.filter((one) => one.finish !== undefined);
    assert.deepEqual([...new Set(withFinish.map((one) => `${one.device} ${one.finish}`))].sort(),
      ['LG OLED65G26LA OK', 'LG TV OK', 'Sony KDL-55X830B Select']);
    // Every one of the seven stores the copy, and nothing calls it.
    assert.equal(withFinish.length, 7);
    for (const one of withFinish) {
      assert.equal(one.uncalled.filter((x) => x.copy.includes(one.finish!)).length, 1, `${one.compile} ${one.device}`);
    }
    // The converse: no device without a finish stores, uncalled, a copy of anything but a digit, 34 devices.
    const without = all.filter((one) => one.finish === undefined);
    assert.equal(without.length, 40);
    assert.equal(without.flatMap((one) => one.uncalled.filter((x) => x.copy.length > 0 && !x.copy.every((n) => DIGITS.has(n)))).length, 0);
  });

test('a television stores its Back uncalled where no key binds it, but where it is the setup\'s only device; a video recorder does not',
  needs, () => {
    const all = read();
    const unboundBack = all.filter((one) => one.wanted.includes('Back') && !one.onKeys.has('Back'));
    // Stored: a send list nothing calls sends a record that is Back. Only as another's: no such list, and the one
    // record that is Back is a code a key binds under another name, the Humax's ChannelPrev, which is Back's code
    // too. Absent: no record of the group is Back.
    const verdict = (one: DeviceRead) => `${one.compile} ${one.device} type ${one.type}, ${one.accountSize} devices: `
      + (one.uncalled.some((x) => x.whole.includes('Back')) ? 'stored'
        : one.records.some((x) => x.whole.includes('Back')) ? 'only as another\'s' : 'absent');
    assert.deepEqual(unboundBack.map(verdict), [
      'setup LG TV type 1, 8 devices: stored',
      'setup first LG TV type 1, 8 devices: stored',
      'factory TV type 1, 3 devices: stored',
      'issue37 LG TV type 1, 5 devices: stored',
      'issue37 Humax DVR type 18, 5 devices: only as another\'s',
      'check-350/compile-002-Result.EzHex LG OLED65G26LA type 1, 1 devices: absent',
      'check-350-retry/compile-001-Result.EzHex LG OLED65G26LA type 1, 2 devices: stored',
      'check-300/compile-001-Result.EzHex LG OLED65G26LA type 1, 2 devices: stored',
      'check-350-eight/compile-001-Result.EzHex LG OLED65G26LA type 1, 8 devices: stored',
    ]);
    // The factory Philips stores its Back uncalled although the record is word for word the ChannelPrev its previous
    // channel key sends, two records of one code; the Humax, whose Back is its ChannelPrev's code too, stores one.
    const factory = all.find((one) => one.compile === 'factory' && one.device === 'TV')!;
    assert.equal(factory.records.filter((x) => x.whole.includes('Back')).length, 2);
    const humax = all.find((one) => one.device === 'Humax DVR')!;
    assert.equal(humax.records.filter((x) => x.whole.includes('Back')).length, 1);
  });

test('Replay and Advance, which the family\'s table gives no key: stored by the KPN box where nothing edited its map, by the Harmony 300\'s VCR not',
  needs, () => {
    // The KPN TV6000COK of the eight device compile binds them on the skip keys, `noscreenfromnothing.test.ts`; the
    // only other device of the twelve compiles holding either name, a Sony VCR on a Harmony 300, stores no record of
    // its Replay at all, so no key of its map sends it. One for and one against, so the table is not widened.
    const all = read();
    const holding = all.filter((one) => one.wanted.includes('Replay') || one.wanted.includes('Advance'));
    const stores = (one: DeviceRead, name: string) => one.records.some((x) => x.whole.includes(name));
    assert.deepEqual(holding.map((one) => `${one.compile} ${one.device}: Replay ${stores(one, 'Replay')}, Advance ${stores(one, 'Advance')}`), [
      'setup KPN: Replay false, Advance false',
      'setup first KPN: Replay false, Advance false',
      'h300programmed Sony VCR: Replay false, Advance false',
      'check-350-eight/compile-001-Result.EzHex KPN TV6000COK: Replay true, Advance true',
    ]);
  });

/** A setup of the test setup's LG TV, alone or with the Denon, with no activity and no favourite. */
function lgSetup(withDenon: boolean): Recipe {
  return {
    model: { name: 'Harmony 350', skin: 104 },
    devices: [{ name: 'LG TV', device: 'LG/OLED65G26LA' }, ...(withDenon ? [{ name: 'Denon', device: 'Denon/AVR-X4800H' }] : [])],
    activities: [],
    favourites: [],
  } as unknown as Recipe;
}

test('composed, a television stores the finish copy and, beside another device, its Back, each with a send list nothing calls',
  needing(skipWithoutIrArchive()), () => {
    const uncalledOf = (recipe: Recipe, keys: Record<string, { place: number; press: 'short' }>) => {
      const c = parse(buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe, keys, builtAt: '2026-11-01T12:00:00' }).bytes);
      const called = calledLists(c);
      const lg = devices(c).find((one) => one.name === 'LG_TV')!.group!;
      const plan = catalogueDevicePlan(c, archiveAt(IR_ARCHIVE!), { manufacturer: 'LG', model: 'OLED65G26LA', label: 'LG_TV', full: true });
      const scratch = parse(composeIrGroup(c, plan.device.commands).bytes);
      const built = irGroups(scratch)!.at(-1)!.addresses;
      const out: string[] = [];
      c.pointerArray(7)!.forEach((_, index) => {
        if (called.has(index)) return;
        const body = listBody(c, index);
        if (body.length !== 3 || body[1]!.opcode !== 0x7d || body[1]!.operand >> 8 !== lg) return;
        const address = irGroups(c)![lg]!.addresses[body[1]!.operand & 0xff]!;
        const whole = plan.wanted.find((_, k) => recordKey(scratch, built[k]!) === recordKey(c, address));
        const shape = onceWithoutLeadIn(c, address);
        out.push(whole ?? `${plan.wanted.find((_, k) => onceWithoutLeadIn(scratch, built[k]!).code === shape.code)} (copy)`);
      });
      return out.filter((name) => !/^\d \(copy\)$/.test(name)).sort();
    };
    assert.deepEqual(uncalledOf(lgSetup(true), { 'LG TV': { place: 0, press: 'short' }, Denon: { place: 2, press: 'short' } }), ['Back', 'OK (copy)']);
    // The setup's only device: the finish copy, and no Back, as in Logitech's compile of the LG alone.
    assert.deepEqual(uncalledOf(lgSetup(false), { 'LG TV': { place: 0, press: 'short' } }), ['OK (copy)']);
  });

test('a finish of more than one step, or of a step sending nothing, is refused rather than guessed', () => {
  const timing = {} as never;
  assert.equal(channelFinish({ timing }, 'none'), undefined);
  assert.equal(channelFinish({ timing, channelTuning: { finish: [{ kind: 'send', command: 'OK' }] } }, 'one'), 'OK');
  assert.throws(() => channelFinish({ timing, channelTuning: { finish: [{ kind: 'send', command: 'OK' }, { kind: 'wait', ms: 100 }] } }, 'two'),
    ComposeError);
  assert.throws(() => channelFinish({ timing, channelTuning: { finish: [{ kind: 'wait', ms: 100 }] } }, 'a wait'), ComposeError);
});
