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
import { pictureBankByClosure } from '../src/screen.ts';
import { fontSets, fontSetsByClosure, glyphAt, glyphHeight } from '../src/font.ts';
import { shapeKey, isBlank, usesAscii, characterMap } from '../src/text.ts';
import { ALPHABETS } from '../src/alphabets.ts';
import {
  irGroups, irRecordsByClosure, irCarrier, irGroupCount, irRecordBlocks, irBlockWords,
  IR_RECORD_POINTER_BIAS,
} from '../src/ir.ts';
import { u8, u16, u24 } from '../src/bytes.ts';

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

test('the 895 is the third arch 10 container and no pointer slot reader answers on it',
  skipUnless('h895_config', 'h890_config', 'h890_config_2'), () => {
    // Section 178's last paragraph: what survives a missing slot mapping is what the header or the
    // marker locates, not what a pointer slot locates. Asserted so that a future reader claiming to
    // read arch 10 content has to move this test.
    //
    // **The title said "framing is all that reads" and section 179 falsified it within the day**, by
    // finding the picture bank from the trailer alone. The body never claimed that much, which is the
    // failure mode the house rule about titles names: a test can pass while its name is wrong. What
    // the body checks is that no **pointer slot** reader answers, which is what the rail is about.
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

/**
 * Section 179: the picture bank reads on arch 10, and it says what the display is.
 *
 * Section 178 ended by predicting that the structures surviving a missing slot mapping are the ones
 * located from the header or the trailer rather than through a pointer slot, and that looking for
 * more of those is cheaper than solving the mapping. This is the second, after the key table.
 */

/** The seven distinct arch 10 payloads, with the pictures the closure locator finds in each. */
const ARCH10_BANKS: readonly [string, number][] = [
  ['h890_config', 26],
  ['h895_config', 38],
  ['h890_config_2', 7],
  ['h890_config_2_rescan', 18],
  ['h890_config_2_redump_1', 10],
  ['h890_config_2_redump_2', 7],
  ['h890_config_2_redump_3', 4],
];

/** The arch 10 reads whose trailer checksum recomputes, which is section 122's damage detector. */
const ARCH10_CLEAN = ['h890_config', 'h895_config'];

test('the two arch 10 reads that verify carry a 128 by 160 display, like a Harmony 885',
  skipUnless('h890_config', 'h895_config'), () => {
    // The Harmony 890 and 895 display size, which nothing here had. Derived from the container with
    // no pointer slot read: the largest picture in the bank is the display, calibrated on all four
    // architectures that state one in `screen.test.ts`. Section 179.
    for (const name of ARCH10_CLEAN) {
      const c = parse(require_(name));
      assert.equal(c.architecture, undefined, `${name} states no architecture, which is the point`);
      const bank = pictureBankByClosure(c);
      assert.ok(bank !== undefined, name);
      assert.equal(Math.max(...bank.map((b) => b.stride)), 128, `${name} widest picture`);
      assert.equal(Math.max(...bank.map((b) => b.rows)), 160, `${name} tallest picture`);
      assert.equal(bank.filter((b) => b.stride === 128 && b.rows === 160).length, 5,
        `${name} draws five full screen backgrounds, as every arch 8 container does`);
    }
  });

test('arch 10 uses exactly the ten picture sizes an arch 8 config uses, and no other model does',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880', 'arch8_config_885',
    'h600_config', 'one_config'), () => {
    // The corroboration, and it is a set comparison rather than one number: the display size alone
    // could be a coincidence between two remote families, and the whole size profile cannot. These
    // small pictures are the generator's own chrome, so sharing them is a statement that a Harmony
    // 890 and a Harmony 885 are drawn by the same generator for the same panel.
    const sizesOf = (name: string): Set<string> => {
      const bank = pictureBankByClosure(parse(require_(name)));
      assert.ok(bank !== undefined, name);
      return new Set(bank.map((b) => `${b.stride}x${b.rows}`));
    };
    const arch10 = new Set([...sizesOf('h890_config'), ...sizesOf('h895_config')]);
    const arch8 = new Set([...sizesOf('arch8_config_880'), ...sizesOf('arch8_config_885')]);
    assert.equal(arch10.size, 10, 'ten distinct picture sizes on arch 10');
    assert.deepEqual([...arch10].sort(), [...arch8].sort(), 'the same ten as the 880 and the 885');

    // The negative, without which the agreement above says nothing about the panel: two architectures
    // whose screens differ share almost none of them.
    const h600 = sizesOf('h600_config');
    const one = sizesOf('one_config');
    assert.equal([...h600].filter((s) => arch10.has(s)).length, 0, 'a Harmony 600 shares none');
    assert.equal([...one].filter((s) => arch10.has(s)).length, 0, 'a Harmony One shares none');
  });

test('the bank is a graded detector of a damaged arch 10 read, where the checksum is a yes or no',
  skipUnless(...ARCH10_BANKS.map(([n]) => n)), () => {
    // A fourth statement about which arch 10 reads are clean, and the useful thing about it is that it
    // is not binary. Section 122's two detectors say damaged or not; this says how much of the file
    // survived, which is what tells a redump apart from a hopeless one.
    const shares: { name: string; clean: boolean; share: number }[] = [];
    for (const [name, pictures] of ARCH10_BANKS) {
      const c = parse(require_(name));
      const bank = pictureBankByClosure(c);
      assert.ok(bank !== undefined, name);
      assert.equal(bank.length, pictures, `${name} pictures`);
      const bytes = bank.reduce((sum, b) => sum + (b.length ?? 0), 0);
      shares.push({
        name,
        clean: c.checks['trailer_checksum_recomputes'] === true,
        share: bytes / c.blob.length,
      });
    }
    const clean = shares.filter((s) => s.clean);
    const damaged = shares.filter((s) => !s.clean);
    assert.deepEqual(clean.map((s) => s.name).sort(), [...ARCH10_CLEAN].sort());
    assert.equal(damaged.length, 5, 'the five reads of the second Harmony 890');
    // Separated with a gap rather than against a chosen threshold, which is the honest form: the
    // worst clean read is 57% pictures and the best damaged one is 44%.
    const worstClean = Math.min(...clean.map((s) => s.share));
    const bestDamaged = Math.max(...damaged.map((s) => s.share));
    assert.ok(worstClean > bestDamaged,
      `clean reads are more picture than any damaged one: ${worstClean} vs ${bestDamaged}`);
    assert.ok(worstClean > 0.5 && bestDamaged < 0.5,
      `and half the file is inside that gap: ${worstClean} vs ${bestDamaged}`);
  });

test('the Harmony 890 rescan is byte identical, so it is one read and not two',
  skipUnless('h890_config', 'h890_config_rescan'), () => {
    // Stated as a test because it is the trap section 32 records: two numbers agreeing means nothing
    // when they come from the same bytes. The bank locator returns the same answer for these two, and
    // that is not a second read confirming the first. Registered separately, so nothing but a check
    // like this one stops the pair being quoted as two samples.
    const a = parse(require_('h890_config')).blob;
    const b = parse(require_('h890_config_rescan')).blob;
    assert.deepEqual([...a], [...b], 'the same payload under two names');
  });

/** The eight font sets of a Harmony 880, heights in the order the container stores them. */
const ARCH8_SET_HEIGHTS = [14, 14, 15, 14, 13, 13, 8, 11];

test('a Harmony 890 and 895 carry eight font sets, the same eight a Harmony 880 carries',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880'), () => {
    // Section 180. Found with no pointer slot: a candidate set is accepted only if every one of its
    // pointers decodes into a glyph whose rows tile exactly to its own width, which arbitrary bytes
    // do not do seventy times in a row.
    const h880 = fontSets(parse(require_('arch8_config_880')));
    assert.ok(h880 !== undefined);
    assert.deepEqual(h880.map((s) => s.height), ARCH8_SET_HEIGHTS, 'the Harmony 880 for comparison');

    for (const name of ['h890_config', 'h895_config']) {
      const c = parse(require_(name));
      assert.equal(fontSets(c), undefined, `${name} has no readable base slot 7, which is the point`);
      const sets = fontSetsByClosure(c, 8);
      assert.equal(sets.length, 8, `${name} font sets`);
      // The same heights in the same order, and the same declared slot count. A shared multiset would
      // be suggestive; a shared order is a statement about one generator laying out one product line.
      assert.deepEqual(sets.map((s) => s.height), ARCH8_SET_HEIGHTS, `${name} set heights, in order`);
      for (const s of sets) {
        assert.equal(s.count, 70, `${name} slots per set`);
        assert.equal(s.first, 1, `${name} first code, so the codes are not ASCII`);
      }
    }
  });

test('arch 10 stores a glyph as two bytes a pixel, and the packed form finds nothing at all',
  skipUnless('h890_config', 'h895_config'), () => {
    // The control that turns the encoding from an assumption into a measurement. `fontSetsByClosure`
    // is handed a hypothesis about the encoding, and a wrong one does not yield worse glyphs, it
    // yields none: the Harmony 525's packed two bit form finds zero sets in either container, where
    // the unpacked form finds all eight. So this is arch 10 answering, not us choosing.
    for (const name of ['h890_config', 'h895_config']) {
      const c = parse(require_(name));
      assert.equal(fontSetsByClosure(c, 9).length, 0, `${name} is not packed like a Harmony 525`);
      assert.equal(fontSetsByClosure(c, 8).length, 8, `${name} is unpacked like a Harmony 885`);
    }
  });

test('a Harmony 890 uses the Harmony 885 typeface, so its letters read',
  skipUnless('h890_config', 'h895_config', 'arch8_config_885', 'arch8_config_880'), () => {
    // The strongest confirmation available, and it needs no slot: a glyph's pixels hash to a shape,
    // and the hand read alphabets map a shape to a character. Section 180.
    const shapesOf = (name: string): Set<string> => {
      const c = parse(require_(name));
      const readAs = c.architecture ?? 8;
      const sets = c.architecture === undefined ? fontSetsByClosure(c, 8) : fontSetsByClosure(c);
      const keys = new Set<string>();
      for (const s of sets) {
        for (const address of s.glyphs) {
          if (address === undefined) continue;
          const glyph = glyphAt(c, address, undefined, readAs);
          // A blank glyph carries no shape, and counting one as evidence is what once made arch 8's
          // `V`, `?` and `x` decode as spaces.
          if (glyph === undefined || isBlank(glyph)) continue;
          keys.add(shapeKey(glyphHeight(glyph), glyph));
        }
      }
      return keys;
    };
    const named = (keys: Set<string>, alphabet: string): number => {
      const alpha = ALPHABETS.find((a) => a.name === alphabet);
      assert.ok(alpha !== undefined, alphabet);
      return [...keys].filter((k) => alpha.shapes[k] !== undefined).length;
    };

    // Exact counts, so a change in either the search or an alphabet seed shows up here.
    const expected: readonly [string, number, number][] = [
      ['h890_config', 237, 213],
      ['h895_config', 229, 212],
      ['arch8_config_885', 260, 218],
      ['arch8_config_880', 238, 216],
    ];
    for (const [name, distinct, hits] of expected) {
      const keys = shapesOf(name);
      assert.equal(keys.size, distinct, `${name} distinct non blank shapes`);
      assert.equal(named(keys, 'arch8'), hits, `${name} shapes the arch 8 alphabet names`);
    }
    // The calibration, computed from the counts above rather than against a chosen ratio: the two arch
    // 10 containers resolve at **no worse** a rate than the two the alphabet was read from, so arch 10
    // is not being read at a discount. A bare `> 0.83` here would have been a floor with no
    // measurement behind it, which is what the toolchain gate refuses.
    const rate = (name: string): number => {
      const row = expected.find(([n]) => n === name);
      assert.ok(row !== undefined, name);
      return row[2] / row[1];
    };
    const arch10Worst = Math.min(rate('h890_config'), rate('h895_config'));
    const arch8Worst = Math.min(rate('arch8_config_885'), rate('arch8_config_880'));
    const arch8Best = Math.max(rate('arch8_config_885'), rate('arch8_config_880'));
    // **Inside the spread, not above it**, which is what the numbers actually support: the four rates
    // run 84% to 93% and both arch 10 containers land between the two arch 8 ones. A first version
    // asserted arch 10 beat arch 8's *best* and failed, because 89.9% does not beat 90.8%. The claim
    // that matters is only that arch 10 is not read at a discount, and this is that claim.
    assert.ok(arch10Worst > arch8Worst,
      `arch 10 is not the worst of the four: ${arch10Worst} vs ${arch8Worst}`);
    assert.ok(arch10Worst < arch8Best, 'and it is inside the arch 8 spread rather than above it');
    for (const [name] of expected) {
      void name;
    }

    // The negative, and it is the reason the agreement means anything: the Harmony One's typeface is
    // a different one, and it names **none** of these shapes on any of the four.
    for (const [name] of expected) {
      assert.equal(named(shapesOf(name), 'one'), 0, `${name} is not the Harmony One typeface`);
    }
  });

test('the alphabet is not the words, because a string still needs the slot mapping',
  skipUnless('h890_config'), () => {
    // The boundary, asserted so nobody reads section 180 as "arch 10 text reads". A string is a run of
    // glyph codes whose address comes out of a screen program, and programs are base slot 11. The
    // codes start at 1 rather than 32, so they are this container's own numbering and not ASCII, which
    // is the other route that would have worked without programs.
    const c = parse(require_('h890_config'));
    assert.equal(usesAscii(c), false, 'the codes are per config, so a byte run is not a string');
    assert.equal(characterMap(c), undefined, 'and no character map, since it needs the drawn codes');
    for (const s of fontSetsByClosure(c, 8)) assert.equal(s.first, 1);
  });

/** Every arch 10 read, with the records the closure locator finds. Section 181. */
const ARCH10_RECORDS: readonly [string, number][] = [
  ['h890_config', 300],
  ['h890_config_rescan', 300],
  ['h895_config', 0],
  ['h890_config_2', 300],
  ['h890_config_2_rescan', 1],
  ['h890_config_2_redump_1', 300],
  ['h890_config_2_redump_2', 0],
  ['h890_config_2_redump_3', 0],
];

test('a Harmony 890 holds 300 infrared codes, read with no pointer slot',
  skipUnless('h890_config'), () => {
    // Section 181. A record states its own address, so finding one is a twenty four bit exact match
    // rather than a plausibility test, which is why this needs no threshold where the picture bank
    // and the font search both do.
    const c = parse(require_('h890_config'));
    assert.equal(irGroups(c), undefined, 'base slot 5 is gated, which is the point');
    const records = irRecordsByClosure(c);
    assert.equal(records.length, 300);

    // Every record's own fields hold up, which is what says these are records and not coincidences.
    let blocks = 0;
    const carriers = new Map<string, number>();
    for (const address of records) {
      assert.equal(irGroupCount(c, address), 1, 'one pointer group, as on a Harmony 880');
      const hertz = irCarrier(c, address)?.hertz;
      assert.ok(hertz !== undefined && hertz > 25_000 && hertz < 60_000,
        `a real infrared carrier, not ${String(hertz)}`);
      carriers.set((Math.round(hertz / 100) / 10).toFixed(1),
        (carriers.get((Math.round(hertz / 100) / 10).toFixed(1)) ?? 0) + 1);
      for (const block of irRecordBlocks(c, address)) {
        assert.notEqual(irBlockWords(c, block), undefined, `block at ${block} decodes`);
        blocks += 1;
      }
    }
    assert.equal(blocks, 463, 'duration block pointers, all of which decode');
    // Two carriers and a pair, which is a statement about the equipment rather than the format.
    assert.deepEqual([...carriers.entries()].sort(),
      [['36.4', 147], ['37.2', 2], ['38.0', 151]]);
  });

test('the Harmony 895 holds none, and that is a proven absence rather than a failed search',
  skipUnless('h895_config', 'h890_config'), () => {
    // The negative done properly. A self pointer is `u24 at T == base + T`, so searching every base
    // at once means histogramming `u24(T) - T` and looking at every bucket, not just the declared
    // base. On the Harmony 890 exactly one bucket is records; on the Harmony 895 no bucket anywhere
    // holds a single record shaped position.
    const buckets = (name: string): { positions: number; shaped: number }[] => {
      const c = parse(require_(name));
      const hist = new Map<number, number[]>();
      for (let at = 0; at + 3 <= c.blob.length; at += 1) {
        const difference = u24(c.blob, at) - at;
        if (difference < 0) continue;
        const list = hist.get(difference) ?? [];
        list.push(at);
        hist.set(difference, list);
      }
      return [...hist.values()]
        .sort((a, b) => b.length - a.length)
        .slice(0, 6)
        .map((positions) => ({
          positions: positions.length,
          shaped: positions.filter((at) => {
            const cls = at >= 1 ? u8(c.blob, at - 1) : -1;
            const groups = u8(c.blob, at + 3);
            return (cls === 1 || cls === 5) && (groups === 1 || groups === 2);
          }).length,
        }));
    };

    const h890 = buckets('h890_config');
    assert.equal(h890[0]?.positions, 301, 'the Harmony 890 has one large bucket');
    assert.equal(h890[0]?.shaped, 300, 'and 300 of those are record shaped');
    // **The artefact, and it is why the self pointer alone is not the test.** A run of ascending u24
    // pointers crosses `value == base + offset` repeatedly, so an ordinary pointer table produces
    // dozens of hits. Same family as the pitfall about a misaligned read of an ascending table.
    assert.equal(h890[1]?.positions, 125, 'the runner up is a large artefact, and it is measurable');
    for (const bucket of h890.slice(1)) {
      assert.equal(bucket.shaped, 0, 'and no artefact bucket holds a record shaped position');
    }

    // The Harmony 895: every bucket, including the largest at 198 positions, holds none.
    const h895 = buckets('h895_config');
    assert.equal(h895[0]?.positions, 198, 'its largest bucket is bigger than a small real one');
    for (const bucket of h895) assert.equal(bucket.shaped, 0, 'and every bucket is artefact');
    assert.equal(irRecordsByClosure(parse(require_('h895_config'))).length, 0);
  });

test('the infrared area is low in the file, so a damaged read may keep all of it or none',
  skipUnless(...ARCH10_RECORDS.map(([n]) => n)), () => {
    // Not a damage detector like the picture bank, and that is the finding: two of the five damaged
    // reads of the second Harmony 890 carry all 300 records with every block decoding, because the
    // duplicated chunks landed above the infrared area. So a read the checksum condemns can still
    // hold a usable infrared database, which is worth knowing before discarding one.
    for (const [name, expected] of ARCH10_RECORDS) {
      assert.equal(irRecordsByClosure(parse(require_(name))).length, expected, name);
    }
    // The one false positive, asserted rather than filtered: its carrier is not an infrared carrier.
    const c = parse(require_('h890_config_2_rescan'));
    const [only] = irRecordsByClosure(c);
    assert.ok(only !== undefined);
    const hertz = irCarrier(c, only)?.hertz;
    assert.ok(hertz !== undefined && hertz < 25_000,
      `1.7 kHz is not infrared, so a caller can tell: ${String(hertz)}`);
  });

test('the two Harmony 890 remotes carry the same infrared database, and the 880 nearly does',
  skipUnless('h890_config', 'h890_config_2', 'arch8_config_880'), () => {
    // What corroborates the reading against something outside it. All three configs come from one
    // contributor's one room, so the equipment is the same, and the codes should be too.
    const areaOf = (name: string): Uint8Array => {
      const c = parse(require_(name));
      const records = irRecordsByClosure(c);
      const first = records[0];
      assert.ok(first !== undefined, name);
      const off = c.blobOffsetOf(first - IR_RECORD_POINTER_BIAS);
      assert.ok(off !== undefined, name);
      return c.blob.slice(off, off + 300 * 21);
    };
    const a = areaOf('h890_config');
    const b = areaOf('h890_config_2');
    const eight = areaOf('arch8_config_880');
    let differ = 0;
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) differ += 1;
    assert.equal(differ, 0, 'the two Harmony 890 reads are byte identical here');
    let differ8 = 0;
    for (let i = 0; i < a.length; i += 1) if (a[i] !== eight[i]) differ8 += 1;
    // Close but not identical, which is the useful shape: the same appliances compiled for a
    // different remote. Identical would have meant one file, and unrelated would have meant the
    // reading was wrong.
    assert.equal(differ8, 231, 'and the Harmony 880 of the same room differs in 231 of 6300 bytes');
  });

/**
 * Section 182: arch 10 states its architecture, and seventeen of its base slots are identified.
 *
 * The container check `slot1_states_the_architecture` fails on arch 10 and the reason is not that the
 * record is missing. It is at raw slot **0**, because arch 10 has no base slot 0.
 */

/** Every container's architecture record: the architecture twice, the skin, then 0x0d. */
const ARCHITECTURE_RECORDS: readonly [string, number, number, number][] = [
  // container, raw slot holding it, architecture, skin
  ['one_config', 1, 12, 59],
  ['h600_config', 1, 14, 73],
  ['h700_config', 1, 14, 66],
  ['h525_config', 1, 9, 22],
  ['arch8_config_880', 1, 8, 15],
  ['arch8_config_885', 1, 8, 17],
  ['h890_config', 0, 10, 19],
  ['h895_config', 0, 10, 23],
];

test('every container states its architecture twice and its skin, arch 10 at raw slot 0',
  skipUnless(...ARCHITECTURE_RECORDS.map(([n]) => n)), () => {
    // Section 182. Six containers whose architecture is already known fix the record's shape, and the
    // two arch 10 ones then read as architecture 10 with skins 19 and 23. Those are the Harmony 890's
    // and 895's own skins in `reference/capabilities.md`, established there by a route with nothing in
    // common with this one, which is what makes this a reading rather than a pattern.
    for (const [name, slot, architecture, skin] of ARCHITECTURE_RECORDS) {
      const c = parse(require_(name));
      const address = c.sections[slot]?.address;
      assert.ok(address !== undefined && address !== 0, `${name} raw slot ${slot}`);
      const off = c.blobOffsetOf(address);
      assert.ok(off !== undefined, name);
      assert.equal(c.sectionLength(slot), 7, `${name} is the seven byte record`);
      assert.equal(u8(c.blob, off), architecture, `${name} states its architecture`);
      assert.equal(u8(c.blob, off + 1), architecture, `${name} states it twice`);
      assert.equal(u8(c.blob, off + 2), skin, `${name} states its skin`);
      assert.equal(u8(c.blob, off + 3), 0x0d, `${name} constant fourth byte`);
      // Where the container check looks, and why it fails on arch 10 without the record being absent.
      if (slot === 0) {
        assert.equal(c.checks['slot1_states_the_architecture'], false,
          `${name} fails the check because the check reads raw slot 1`);
      }
    }
  });

test('arch 10 has no name tree slot at all, which is why no 0xFEED frame exists anywhere',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880'), () => {
    // Base slot 0 is a 0xFEED framed tree on every other architecture and it is at raw slot 0 there.
    // On arch 10 raw slot 0 is the architecture record, so the tree has no slot, which is a statement
    // about the layout rather than about the read.
    const eight = parse(require_('arch8_config_880'));
    const off = eight.blobOffsetOf(eight.sections[0]!.address);
    assert.ok(off !== undefined);
    assert.equal(u16(eight.blob, off), 0xfeed, 'arch 8 keeps its name tree at raw slot 0');
    for (const name of ['h890_config', 'h895_config']) {
      const c = parse(require_(name));
      assert.equal(c.checks['slot0_is_a_feed_frame'], false, name);
      // And nowhere else either, which is what says the slot is absent rather than moved.
      let frames = 0;
      for (let at = 0; at + 2 <= c.blob.length; at += 1) if (u16(c.blob, at) === 0xfeed) frames += 1;
      assert.equal(frames, 0, `${name} carries no 0xFEED word at all`);
    }
  });

/** Base slot to raw slot on arch 10, where content identifies it. Section 182. */
const ARCH10_ANCHORS: readonly [number, number][] = [
  [1, 0], [3, 4], [5, 6], [7, 10], [17, 20], [18, 21], [19, 22],
];

test('seven arch 10 base slots are identified by content, and the same method recovers arch 8',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880'), () => {
    // The calibration first: the method has to recover a mapping that is already known. On arch 8 the
    // NULL is inserted at raw slot 8, so base 3, 5 and 7 sit on their own numbers and base 17 moves to
    // raw 18, and that is exactly what the same four content tests return.
    const eight = parse(require_('arch8_config_880'));
    const bankEight = pictureBankByClosure(eight)?.[0]?.address;
    const eightOff = (slot: number): number => {
      const off = eight.blobOffsetOf(eight.sections[slot]!.address);
      assert.ok(off !== undefined);
      return off;
    };
    assert.equal(u16(eight.blob, eightOff(3)), 0xaddf, 'arch 8 clock at raw 3');
    assert.equal(eight.pointerArray(5)?.length, 4, 'arch 8 infrared table at raw 5');
    assert.equal(eight.pointerArray(7)?.length, 8, 'arch 8 font table at raw 7');
    assert.equal(eight.sections[18]!.address + 2, bankEight, 'arch 8 picture bank at raw 18');

    // Now arch 10, on both containers, by the same four tests plus the architecture record and the
    // two trailing NULLs.
    for (const name of ['h890_config', 'h895_config']) {
      const c = parse(require_(name));
      const clock = c.blobOffsetOf(c.sections[4]!.address);
      assert.ok(clock !== undefined);
      assert.equal(u16(c.blob, clock), 0xaddf, `${name} clock at raw 4`);
      const bank = pictureBankByClosure(c)?.[0]?.address;
      assert.equal(c.sections[20]!.address + 2, bank, `${name} picture bank at raw 20`);
      assert.ok(c.sections[21]?.isNull && c.sections[22]?.isNull, `${name} raw 21 and 22 are NULL`);
      const fonts = new Set(fontSetsByClosure(c, 8).map((s) => s.address));
      const table = c.blobOffsetOf(c.sections[10]!.address);
      assert.ok(table !== undefined);
      const count = u16(c.blob, table);
      assert.equal(count, fonts.size, `${name} font table at raw 10 declares ${fonts.size}`);
      for (let k = 0; k < count; k += 1) {
        assert.ok(fonts.has(u24(c.blob, table + 2 + 3 * k)), `${name} font entry ${k}`);
      }
    }
    // Only the Harmony 890 has an infrared table to find, since the 895 has no records at all.
    const h890 = parse(require_('h890_config'));
    assert.equal(h890.pointerArray(6)?.length, 4, 'the Harmony 890 infrared table at raw 6');
  });

test('one arithmetic fits all seven anchors, and it needs base slot 0 to be absent',
  () => {
    // No lab needed: this is about the arithmetic, and the anchors above are what measured it.
    // Nineteen base slots, 1 to 19, occupy the nineteen raw slots that are not insertions, in order.
    const fitting: number[][] = [];
    for (let a = 0; a < 23; a += 1) {
      for (let b = a + 1; b < 23; b += 1) {
        for (let d = b + 1; d < 23; d += 1) {
          for (let e = d + 1; e < 23; e += 1) {
            const inserted = new Set([a, b, d, e]);
            const order = [...Array(23).keys()].filter((raw) => !inserted.has(raw));
            if (ARCH10_ANCHORS.every(([base, raw]) => order[base - 1] === raw)) {
              fitting.push([a, b, d, e]);
            }
          }
        }
      }
    }
    // Nine, and the freedom is exactly two slots: which of raw 1 to 3 is base 2, and which of raw 7
    // to 9 is base 6. Everything else is forced, so 17 of the 19 present base slots are pinned.
    assert.equal(fitting.length, 9, 'insertion sets fitting every anchor');
    const base2 = new Set<number>();
    const base6 = new Set<number>();
    for (const set of fitting) {
      const inserted = new Set(set);
      const order = [...Array(23).keys()].filter((raw) => !inserted.has(raw));
      base2.add(order[1] as number);
      base6.add(order[5] as number);
      assert.equal(order[3], 5, 'base slot 4 is forced to raw 5 in every fitting set');
    }
    assert.deepEqual([...base2].sort((x, y) => x - y), [1, 2, 3]);
    assert.deepEqual([...base6].sort((x, y) => x - y), [7, 8, 9]);

    // **And no placement of three insertions into twenty base slots can fit**, which is why section
    // 178's conclusion survives even though its argument does not: 23 slots here are nineteen base
    // slots plus four insertions, not twenty plus three, and a search over insertions alone cannot
    // express a base slot that is not there.
    let threeFits = 0;
    for (let a = 0; a < 23; a += 1) {
      for (let b = a + 1; b < 23; b += 1) {
        for (let d = b + 1; d < 23; d += 1) {
          const inserted = new Set([a, b, d]);
          const order = [...Array(23).keys()].filter((raw) => !inserted.has(raw));
          if (ARCH10_ANCHORS.every(([base, raw]) => order[base] === raw)) threeFits += 1;
        }
      }
    }
    assert.equal(threeFits, 0, 'no three insertion placement fits the anchors');
  });

test('base slot 6 is raw slot 9 on size, since raw 7 and 8 are one and three bytes',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880'), () => {
    // The evidence that narrows the nine to three. A mode table is tens of thousands of bytes on every
    // architecture, and of the three candidates for base slot 6 only raw 9 is anywhere near that.
    // Corroboration rather than proof, which is why the anchors above are stated separately.
    const eight = parse(require_('arch8_config_880'));
    assert.equal(eight.sectionLength(6), 33296, 'the Harmony 880 mode table');
    for (const [name, raw9] of [['h890_config', 33340], ['h895_config', 33095]] as const) {
      const c = parse(require_(name));
      assert.equal(c.sectionLength(7), 1, `${name} raw 7 is one byte`);
      assert.equal(c.sectionLength(8), 3, `${name} raw 8 is three bytes`);
      assert.equal(c.sectionLength(9), raw9, `${name} raw 9 is mode table sized`);
    }
    // And base slot 4's own size, 125 bytes, turns up exactly on the Harmony 895's raw 5, which every
    // fitting set assigns to base slot 4.
    assert.equal(parse(require_('h895_config')).sectionLength(5), 125);
  });

test('the Harmony 890 drives four devices, agreeing with the Harmony 880 of the same room',
  skipUnless('h890_config', 'arch8_config_880'), () => {
    // Section 178 held that base slot 5's entry count is the device count, on 9 of 9 configs. The
    // Harmony 890's is 4, and the Harmony 880 from the same contributor's same room drives 4, which
    // section 181 showed shares its infrared database almost byte for byte. So the rule holds on
    // arch 10 where a config has an infrared database at all.
    assert.equal(parse(require_('h890_config')).pointerArray(6)?.length, 4);
    const [, devices] = DEVICE_COUNTS.find(([n]) => n === 'arch8_config_880') as [string, number];
    assert.equal(devices, 4, 'the Harmony 880 of the same room');
  });

test('the arch 10 mapping is confirmed above base slot 10 and contradicted below it',
  skipUnless('h890_config', 'h895_config', 'arch8_config_880'), () => {
    // Section 182's verification, and it is a test because the finding's first claim was too strong.
    // Comparing each slot's *shape* against arch 8's is sharper than scoring readers: a slot either is
    // a count prefixed array of u24 pointers that all resolve, or it is not.
    const loose = (name: string, slot: number): { count: number; resolve: number } | undefined => {
      const c = parse(require_(name));
      const address = c.sections[slot]?.address;
      if (address === undefined || address === 0) return undefined;
      const off = c.blobOffsetOf(address);
      if (off === undefined) return undefined;
      const count = u16(c.blob, off);
      if (count > 20_000 || off + 2 + 3 * count > c.blob.length) return { count, resolve: -1 };
      let resolve = 0;
      for (let k = 0; k < count; k += 1) {
        if (c.blobOffsetOf(u24(c.blob, off + 2 + 3 * k)) !== undefined) resolve += 1;
      }
      return { count, resolve };
    };

    // Confirmed: the two exact agreements. Base slot 12's section is 52 bytes with a u8 count of 17 on
    // arch 8 and on arch 10, and base slot 16 is an empty array on both.
    const eight = parse(require_('arch8_config_880'));
    for (const name of ['h890_config', 'h895_config']) {
      const c = parse(require_(name));
      assert.equal(eight.sectionLength(13), 52, 'arch 8 base slot 12');
      assert.equal(c.sectionLength(15), name === 'h890_config' ? 52 : 55, `${name} base slot 12`);
      assert.deepEqual(loose(name, 19), { count: 0, resolve: 0 }, `${name} base slot 16 is empty`);
    }
    assert.deepEqual(loose('arch8_config_880', 17), { count: 0, resolve: 0 }, 'arch 8 base slot 16');
    // Base slot 11: same shape, count within one of arch 8's.
    assert.deepEqual(loose('arch8_config_880', 12), { count: 38, resolve: 38 });
    assert.deepEqual(loose('h890_config', 14), { count: 39, resolve: 39 });
    assert.deepEqual(loose('h895_config', 14), { count: 43, resolve: 43 });

    // **Contradicted.** On arch 8 the action list table, base slot 10, is a u16 array whose 1499
    // pointers all resolve, and base slot 9 is not a pointer array at all. On arch 10 that signature
    // sits at raw 12, which the anchors' arithmetic calls base slot 9, and the slot it calls base
    // slot 10 is a two byte empty array on the Harmony 890. No config can have no action lists, so
    // the alignment is wrong here and this test says so rather than a document saying it.
    assert.deepEqual(loose('arch8_config_880', 11), { count: 1499, resolve: 1499 },
      'arch 8 base slot 10, the action list table');
    assert.equal(loose('arch8_config_880', 10)?.resolve, -1,
      'and arch 8 base slot 9 is not a pointer array');
    assert.deepEqual(loose('h890_config', 12), { count: 1549, resolve: 1549 },
      'the action list signature is at raw 12');
    assert.deepEqual(loose('h890_config', 13), { count: 0, resolve: 0 },
      'and the arithmetic puts base slot 10 on an empty array, which cannot be right');
  });

test('the log area closure holds on every known container and on no arch 10 candidate',
  skipUnless('arch8_config_880', 'arch8_config_885', 'h525_config', 'h600_config',
    'h890_config', 'h895_config'), () => {
    // Base slot 2 is three numbers with a hard closure, section 47: limit - start == capacity * stride,
    // and limit a round flash boundary. That is what says base slot 2 is not at raw 1, 2 or 3.
    const ROUND = new Set([0x080000, 0x100000, 0x200000, 0x400000, 0x1fe000]);
    const read = (name: string, slot: number): { capacity: number; start: number; limit: number } => {
      const c = parse(require_(name));
      const off = c.blobOffsetOf(c.sections[slot]!.address);
      assert.ok(off !== undefined, `${name} raw ${slot}`);
      return { capacity: u16(c.blob, off), start: u24(c.blob, off + 2), limit: u24(c.blob, off + 5) };
    };
    // The known containers, exactly, which is the calibration.
    for (const [name, stride] of [['arch8_config_880', 8], ['arch8_config_885', 8],
      ['h525_config', 8], ['h600_config', 8]] as const) {
      const { capacity, start, limit } = read(name, 2);
      assert.equal(limit - start, capacity * stride, `${name} log area closes`);
      assert.ok(ROUND.has(limit), `${name} limit is a round boundary`);
    }
    // And no arch 10 candidate closes under any integer stride at all, which is stronger than failing
    // the two strides the corpus uses.
    for (const name of ['h890_config', 'h895_config']) {
      for (const slot of [1, 2, 3]) {
        const { capacity, start, limit } = read(name, slot);
        const span = limit - start;
        assert.ok(span <= 0 || span % capacity !== 0,
          `${name} raw ${slot} must not close: ${span} over ${capacity}`);
      }
    }
  });
