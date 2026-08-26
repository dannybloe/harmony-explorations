/**
 * Sections 176, 177 and 178: what the Harmony 895 settled, and the key lookup stack.
 *
 * Three claims that arrived together on 26 August 2026, two of them from outside this project and
 * tested here rather than adopted. They share a file because they share a sample.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { load, require_, skipUnless } from '@harmony/lab';

import { parse } from '../src/index.ts';
import { keyCodes } from '../src/inventory.ts';
import { archSlot, EVENT_PRESS } from '../src/gspm.ts';

/** Every user config, with the device count `make devices` reports for it. Section 178. */
const DEVICE_COUNTS: readonly [string, number][] = [
  ['one_config', 5], ['one_config_unprogrammed', 1], ['h600_config', 4],
  ['h700_config', 6], ['h700_config_2', 6], ['h525_config', 4], ['h525_config_2', 1],
  ['arch8_config_a', 3], ['arch8_config_b', 6], ['arch8_config_c', 7], ['arch8_config_d', 7],
  ['arch8_config_880', 4], ['arch8_config_885', 7],
  ['one_spare_before_sync', 1], ['one_spare_after_sync', 1],
];

/**
 * The nine scan codes discussion 6 of harmony-decompiler reports as unpopulated on the Harmony 885,
 * from kkong42 buzzing out two circuit boards by hand. Written out because the whole point of
 * section 177 is comparing our bytes against somebody else's multimeter.
 */
const SURVEY_ABSENT = [4, 9, 28, 30, 39, 42, 47, 49, 64];
const SURVEY_POPULATED = Array.from({ length: 64 }, (_, i) => i + 1)
  .filter((s) => !SURVEY_ABSENT.includes(s));

/**
 * The distinct press scan codes in the **key table**, the firmware's own event table after the
 * marker.
 *
 * **This is the population the comparison needs and the first version of section 177 used the wrong
 * one.** `keyCodes` walks the mode pages, so it answers "what does this configuration bind": 49 on
 * the 885, 44 on the 880, and zero on the 895 because mode pages need the slot mapping. The key
 * table answers "what scan codes can this remote produce", which is what a survey of a circuit board
 * is a claim about. The wrong population's numbers were *consistent* with the survey, containing none
 * of its absent codes, so nothing failed and an entire union-and-gap-filling argument got built on
 * top of it. Third instance of this trap here, after `keyCodes` versus `pageScans` twice.
 */
function boundScans(name: string): number[] {
  const c = parse(require_(name));
  const scans = c.keys.filter((k) => k.eventType === EVENT_PRESS).map((k) => k.scanCode);
  return [...new Set(scans)].sort((a, b) => a - b);
}

test('base slot 5 counts the devices, on every architecture with a slot mapping',
  skipUnless(...DEVICE_COUNTS.map(([n]) => n)), () => {
    // **The calibration that has to come first**, section 178: this is the discriminator the arch 10
    // refutation below rests on, so it is established on configs whose answer is already known
    // before it is pointed at one whose answer is not. Nine names would be enough; all fifteen are
    // here because the claim is about every config with a mapping, not about a sample of them.
    for (const [name, devices] of DEVICE_COUNTS) {
      const c = parse(require_(name));
      // Narrowed rather than asserted away: a container whose architecture is unstated is exactly
      // the arch 10 case this calibration must not silently include, so it fails here instead.
      const arch = c.architecture;
      assert.ok(arch !== undefined, `${name}: the architecture should be stated`);
      const entries = c.pointerArray(archSlot(arch, 5))?.length;
      assert.equal(entries, devices, `${name}: base slot 5 should hold one group per device`);
    }
  });

test('the key table matches the board survey on three models, including its difference',
  skipUnless('arch8_config_885', 'arch8_config_880', 'h895_config'), () => {
    // Section 177. Two routes with nothing in common: a hand probed circuit board and a key table
    // read out of a config. Asserted as sets rather than counts, because "55 codes" would pass on
    // any 55 codes at all, and the 880 row is the one that carries the weight: it reproduces the
    // survey's per model **difference**, which no total could.
    assert.deepEqual(boundScans('arch8_config_885'), SURVEY_POPULATED, 'Harmony 885');
    assert.deepEqual(boundScans('h895_config'), SURVEY_POPULATED, 'Harmony 895, arch 10');

    const h880 = boundScans('arch8_config_880');
    assert.equal(h880.length, 53, 'the Harmony 880 has two fewer positions');
    assert.deepEqual(SURVEY_POPULATED.filter((s) => !h880.includes(s)), [19, 60],
      'and they are exactly the two colour buttons the survey calls 885 only');
    assert.deepEqual(h880.filter((s) => !SURVEY_POPULATED.includes(s)), [],
      'with nothing outside the survey');
  });

test('the mode page bindings are a different and smaller population',
  skipUnless('arch8_config_885', 'arch8_config_880', 'h895_config'), () => {
    // The control for the test above, and the reason section 177 records a near miss. If these two
    // readers returned the same thing the distinction would be pedantry; they do not, and the
    // smaller one silently answers a different question. The 895's zero is what forced the issue.
    const bound = (name: string): number => {
      const c = parse(require_(name));
      try { return new Set(keyCodes(c).map((k) => k.scan)).size; } catch { return -1; }
    };
    assert.equal(bound('arch8_config_885'), 49, 'what that config binds, not what the remote has');
    assert.equal(bound('arch8_config_880'), 44);
    assert.equal(bound('h895_config'), 0, 'mode pages need the slot mapping, so arch 10 gives none');
  });

test('no arch 10 slot mapping can be a relabelling of the twenty', skipUnless('h895_config'), () => {
  // Section 178, and the strong form: the refutation does not depend on scoring readers, only on
  // three section lengths and one count. Base slot `b` maps to a raw slot in `[b, b + 3]` under any
  // placement of three insertions, so base 5 lands on raw 5 to 8.
  const c = parse(require_('h895_config'));
  assert.equal(c.sections.length, 23, 'arch 10 carries 23 pointer slots');

  // The gap to the next section, which is the only length available without a slot mapping and is
  // an **upper bound** on the section, section 36. An upper bound is the right direction here: if
  // even the gap is under 19 bytes the section certainly cannot hold a six entry array.
  const addressOf = (slot: number): number => {
    const s = c.sections[slot] as { address?: number } | undefined;
    assert.ok(s?.address, `raw slot ${slot} should be present`);
    return s.address as number;
  };
  const lengthOf = (slot: number): number => addressOf(slot + 1) - addressOf(slot);

  // A six entry count prefixed array needs 1 + 3 * 6 = 19 bytes. Raw 6, 7 and 8 are far too small,
  // so base 5 can only be raw 5, whose count is 9 and not the six devices its owner states.
  for (const slot of [6, 7, 8]) {
    assert.ok(lengthOf(slot) < 19,
      `raw slot ${slot} is too small to hold the infrared database`);
  }
  const atFive = c.pointerArray(5)?.length;
  assert.notEqual(atFive, 6, 'raw slot 5 does not hold six device groups');

  // And the general form, which needs no argument about placements at all: no slot anywhere holds
  // six entries, so the known device count is unreachable under any relabelling whatever.
  const sixes: number[] = [];
  for (let slot = 0; slot < c.sections.length; slot += 1) {
    let entries: number | undefined;
    try { entries = c.pointerArray(slot)?.length; } catch { entries = undefined; }
    if (entries === 6) sixes.push(slot);
  }
  assert.deepEqual(sixes, [], 'no slot holds a six entry array');

  // The escape that would have saved the model: the 895 is an RF remote, so its Lights device may
  // not be an infrared group and the count could legitimately be five. It is not five either.
  const fives: number[] = [];
  for (let slot = 0; slot < c.sections.length; slot += 1) {
    let entries: number | undefined;
    try { entries = c.pointerArray(slot)?.length; } catch { entries = undefined; }
    if (entries === 5) fives.push(slot);
  }
  assert.deepEqual(fives, [], 'nor a five entry one');
});

test('the arch 10 readers stay gated', () => {
  // The rail, asserted rather than trusted. `INSERTED_SLOTS` has no arch 10 entry, and section 178
  // is why adding one would be worse than the refusal: it would turn twenty refusals into twenty
  // plausible wrong answers. No lab needed, so a fresh clone is protected by it too.
  assert.throws(() => archSlot(10, 5), /slot alignment not established/);
});

test('the key lookup stack instructions are fixed scaffolding, not content',
  skipUnless(...DEVICE_COUNTS.map(([n]) => n)), () => {
    // Section 176. The corpus half of a reading whose firmware half is trelowney's: a count cannot
    // tell a push from an unordered insert, but it can show these two are generator boilerplate,
    // because they do not move when the config's contents do.
    const PUSH = 0xfe;
    const REMOVE = 0xfd;
    const perArch = new Map<number, Set<string>>();
    for (const [name] of DEVICE_COUNTS) {
      const c = parse(require_(name));
      const lists = c.actionLists();
      assert.ok(lists, `${name} has action lists`);
      let push = 0, remove = 0, select = 0;
      for (const list of lists) for (const i of list) {
        if (i.opcode !== 0x1f) continue;
        const high = (i.operand >>> 8) & 0xff;
        if (high === PUSH) push += 1;
        else if (high === REMOVE) remove += 1;
        else if (high === 0xff) select += 1;
      }
      const key = `${push}/${remove}`;
      const arch = c.architecture;
      assert.ok(arch !== undefined, `${name}: the architecture should be stated`);
      if (!perArch.has(arch)) perArch.set(arch, new Set());
      perArch.get(arch)!.add(key);
      // The control, in the same loop and on the same configs: the one operation already read as
      // content dependent **does** move. Without this the claim below is unfalsifiable, since a
      // reader returning nothing at all would make every count constant.
      assert.ok(select > 0, `${name}: 0xFF should appear`);
    }
    // One push/remove pair per architecture, whatever the configs hold.
    assert.deepEqual([...perArch.get(9)!], ['5/0'], 'arch 9, Harmony 525');
    assert.deepEqual([...perArch.get(14)!], ['5/0'], 'arch 14, Harmony 600 and 700');
    assert.deepEqual([...perArch.get(8)!], ['13/8'], 'arch 8, Harmony 880 and 885');
    assert.deepEqual([...perArch.get(12)!], ['14/9'], 'arch 12, Harmony One');
  });

test('the select operation does vary with a config, which is what makes the above a claim',
  skipUnless('one_config', 'one_config_unprogrammed', 'h700_config'), () => {
    // Stated separately so its numbers are visible rather than buried in an `ok`. Five devices
    // against one on the same remote, and the scaffolding above is identical across that gap.
    const counts = ['one_config', 'one_config_unprogrammed', 'h700_config'].map((name) => {
      const c = parse(require_(name));
      let select = 0;
      for (const list of c.actionLists() ?? []) for (const i of list) {
        if (i.opcode === 0x1f && ((i.operand >>> 8) & 0xff) === 0xff) select += 1;
      }
      return select;
    });
    assert.deepEqual(counts, [17, 3, 180]);
  });

test('arch 9 and arch 14 build a lookup stack and never unwind it',
  skipUnless('h525_config', 'h525_config_2', 'h600_config', 'h700_config', 'h700_config_2'), () => {
    // A prediction rather than an observation, section 176, and written as a test so that the first
    // arch 9 or arch 14 config emitting a single remove refutes it instead of passing quietly.
    for (const name of ['h525_config', 'h525_config_2', 'h600_config', 'h700_config',
      'h700_config_2']) {
      const c = parse(require_(name));
      let remove = 0;
      for (const list of c.actionLists() ?? []) for (const i of list) {
        if (i.opcode === 0x1f && ((i.operand >>> 8) & 0xff) === 0xfd) remove += 1;
      }
      assert.equal(remove, 0, `${name} should never remove a binding list`);
    }
  });

test('the 895 is the third arch 10 container and framing is all that reads',
  skipUnless('h895_config', 'h890_config', 'h890_config_2'), () => {
    // Section 178's last paragraph: what survives a missing slot mapping is what the header or the
    // marker locates, not what a pointer slot locates. Asserted so that a future reader claiming to
    // read arch 10 content has to move this test.
    const c = parse(require_('h895_config'));
    assert.equal(c.flashBase, 0x030000);
    assert.equal(c.formatRaw, 0x1700);
    assert.equal(c.sections.length, 23);
    const failing = Object.entries(c.checks)
      .filter(([, pass]) => pass === false).map(([name]) => name).sort();
    assert.deepEqual(failing, ['pointer_count_known', 'slot0_is_a_feed_frame',
      'slot1_states_the_architecture', 'slot3_is_a_timestamp'],
      'the same four as both Harmony 890 containers, and no others');
    // The clean 890 read fails the same four, which is what makes the 895 a third sample of one
    // layout rather than a fourth shape.
    const clean = parse(require_('h890_config'));
    assert.deepEqual(Object.entries(clean.checks).filter(([, p]) => p === false)
      .map(([name]) => name).sort(), failing, 'h890_config fails the same four');

    // **And the damaged read fails two more, which is the control rather than an inconsistency.**
    // They are exactly section 122's two independent detectors of arch 10 read corruption, so the
    // 895's consensus of five reads is not merely self consistent: it clears the checks that catch
    // the failure this architecture is known for. A first draft asserted "both" 890s matched.
    const damaged = parse(require_('h890_config_2'));
    const theirs = Object.entries(damaged.checks).filter(([, p]) => p === false)
      .map(([name]) => name).sort();
    assert.deepEqual(theirs.filter((n) => !failing.includes(n)),
      ['end_addr_points_at_end_marker', 'trailer_checksum_recomputes']);
  });
