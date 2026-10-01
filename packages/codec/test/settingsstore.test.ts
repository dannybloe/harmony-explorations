/**
 * Section 303: an arch 14 configuration saves each delay into the remote's settings store and puts
 * the saved value back at every start.
 *
 * The store is two 1 KiB blocks of internal program memory at `0x01EC00`, section 282, and the remote's
 * firmware keeps two small tables in it, one for power on delays and one for inter device delays, each
 * a slot of a two byte key and a two byte value. What decides that a value saved there wins over the
 * one the configuration states is not the firmware but the configuration itself, in two shapes this
 * test reads on every arch 14 container in the lab:
 *
 * * **saving**: every delay variable has a second value map whose case for value v runs a list of two
 *   instructions, `0x7A key` and `0x6C v`, with bit 15 set for an inter device delay. `0x7A` puts its
 *   operand in the interpreter's accumulator and `0x6C` stores its operand under the accumulator's key.
 * * **restoring**: a list `0x7A key, 0x0F 0xFF40 or 0xFF41, 0x1F 0xED00 | variable` reads the store
 *   for that key into the accumulator and writes it into the delay variable.
 *
 * The firmware half and the measurement on the Harmony 600 are in `tests/test_arch14_write_target.py`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { parse, screenProgram, stateVariables, valueMaps } from '../src/index.ts';

/** The arch 14 containers, with how many delay variables each holds and how many use the store. */
const HOSTS: [name: string, variables: number, stored: number][] = [
  ['h600_config', 8, 8],
  ['calibration_h600', 6, 6],
  ['h650_devicelist_region', 12, 10],
  ['h700_28_config_region', 10, 10],
];

const SAVE_KEY = 0x7a;
const SAVE_VALUE = 0x6c;
const SYSTEM = 0x0f;
const STORE_VARIABLE = 0x1f;
const SET_VALUE = 0x72;
const CALL_LIST = 0x7f;

interface DelayUse {
  label: string;
  kind: 'PowerOnDelay' | 'InterDeviceDelay';
  id: number;
  /** The key its saving table writes under, when it has one. */
  key: number | undefined;
  /** Whether a list reads that key's slot back into this variable. */
  restored: boolean;
}

function delayUses(name: string): DelayUse[] {
  const c = parse(require_(name));
  const lists = c.actionLists()!;
  const maps = valueMaps(c)!;
  const tables = new Map<number, Set<number>>();
  for (const list of lists) {
    for (const one of list) {
      if (one.opcode !== SET_VALUE) continue;
      const set = tables.get(one.operand & 0xff) ?? new Set<number>();
      set.add(one.operand >>> 8);
      tables.set(one.operand & 0xff, set);
    }
  }
  const out: DelayUse[] = [];
  for (const variable of stateVariables(c)) {
    const match = /^(PowerOnDelay|InterDeviceDelay)_(\d+)$/.exec(variable.label);
    if (match === null) continue;
    const kind = match[1] as DelayUse['kind'];
    const flag = kind === 'InterDeviceDelay' ? 0x8000 : 0;
    let key: number | undefined;
    for (const table of tables.get(variable.index) ?? []) {
      // A saving table: every case runs exactly [0x7A key, 0x6C value], one key throughout.
      let seen: number | undefined;
      const saves = maps[table]!.entries.every(([value, target]) => {
        const queued = screenProgram(c, target)?.[0];
        if (queued?.operands[2] !== CALL_LIST) return false;
        const list = lists[(queued.operands[0] as number) | ((queued.operands[1] as number) << 8)];
        if (list?.length !== 2 || list[0]!.opcode !== SAVE_KEY || list[1]!.opcode !== SAVE_VALUE) return false;
        if (list[1]!.operand !== (value | flag)) return false;
        if (seen !== undefined && seen !== list[0]!.operand) return false;
        seen = list[0]!.operand;
        return true;
      });
      if (saves) {
        assert.equal(key, undefined, `${name}: ${variable.label} has one saving table`);
        key = seen;
      }
    }
    const read = kind === 'PowerOnDelay' ? 0xff40 : 0xff41;
    const restored = key !== undefined && lists.some((list) => list.length === 3
      && list[0]!.opcode === SAVE_KEY && list[0]!.operand === key
      && list[1]!.opcode === SYSTEM && list[1]!.operand === read
      && list[2]!.opcode === STORE_VARIABLE && list[2]!.operand === (0xed00 | variable.index));
    out.push({ label: variable.label, kind, id: Number(match[2]), key, restored });
  }
  return out;
}

test('every arch 14 delay that has a saving table also has a list restoring it from the store',
     skipUnless(...HOSTS.map(([name]) => name)), () => {
  for (const [name, variables, stored] of HOSTS) {
    const uses = delayUses(name);
    assert.equal(uses.length, variables, `${name}: delay variables`);
    assert.equal(uses.filter((one) => one.key !== undefined).length, stored, `${name}: saved`);
    assert.equal(uses.filter((one) => one.restored).length, stored, `${name}: restored`);
    // One key per device: a device's power on delay and its inter device delay share it, and two
    // devices never do.
    const byId = new Map<number, Set<number>>();
    for (const one of uses) if (one.key !== undefined) byId.set(one.id, (byId.get(one.id) ?? new Set()).add(one.key));
    for (const [id, keys] of byId) assert.equal(keys.size, 1, `${name}: device ${id} has one key`);
    const keys = [...byId.values()].map((set) => [...set][0]);
    assert.equal(new Set(keys).size, keys.length, `${name}: keys are distinct`);
  }
});

test('the one device on the Harmony 650 without a saving table is the one this project composed',
     skipUnless('h650_devicelist_region'), () => {
  // Section 285's device, whose identifier nothing joins to a group, which is why `deviceDelays`
  // leaves it out. The composer emits the delay tables of sections 287 and 288 and neither of these
  // two programs, so a delay changed for it on the remote is not kept across a start.
  const missing = delayUses('h650_devicelist_region').filter((one) => one.key === undefined);
  assert.deepEqual(missing.map((one) => one.label).sort(),
    ['InterDeviceDelay_83908304', 'PowerOnDelay_83908304']);
});

test('the key fits the device identifier\'s last four digits on three configurations and its last five on two',
     skipUnless(...HOSTS.map(([name]) => name)), () => {
  // A measurement and not a rule: what the compiler derives the key from is unread. The 700's keys
  // refute four digits and the 600's refute five, and the 650's fit both, so the corpus does not choose.
  // The 600's keys are the two the store on that unit holds, 3804 and 3622, `0x0EDC` and `0x0E26`.
  const rule = (name: string, modulus: number) => delayUses(name)
    .filter((one) => one.key !== undefined).every((one) => one.key === one.id % modulus);
  for (const name of ['h600_config', 'calibration_h600', 'h650_devicelist_region']) {
    assert.ok(rule(name, 10000), `${name}: last four digits`);
  }
  assert.ok(!rule('h700_28_config_region', 10000));
  assert.ok(rule('h700_28_config_region', 100000));
  assert.ok(rule('h650_devicelist_region', 100000));
  assert.ok(!rule('h600_config', 100000));
  assert.ok(!rule('calibration_h600', 100000));
  const kpn = delayUses('h600_config').find((one) => one.label === 'PowerOnDelay_79993804');
  const ps = delayUses('h600_config').find((one) => one.label === 'InterDeviceDelay_79993622');
  assert.deepEqual([kpn?.key, ps?.key], [0x0edc, 0x0e26]);
});

test('the Harmony 600\'s delay page saves the KPN box\'s defaults, 15 and 5, so it did not store the 10',
     skipUnless('h600_config'), () => {
  // Page 183's two keys copy variables 70 and 71 into 67 and 64 and then save both, which the Python
  // half asserts list by list in tests/test_arch14_write_target.py. The store held 10 for this key.
  const byIndex = new Map(stateVariables(parse(require_('h600_config'))).map((one) => [one.index, one]));
  assert.deepEqual([70, 71].map((index) => [byIndex.get(index)?.label, byIndex.get(index)?.record?.first]),
    [['DefaultPowerOnDelay_79993804', 15], ['DefaultInterDeviceDelay_79993804', 5]]);
  assert.deepEqual([67, 64].map((index) => byIndex.get(index)?.label),
    ['PowerOnDelay_79993804', 'InterDeviceDelay_79993804']);
});
