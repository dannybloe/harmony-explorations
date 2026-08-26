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
      // The calibration is that the two arch 10 containers are named at the same rate as the two
      // containers the alphabet was read from, so arch 10 is not being read at a discount.
      assert.ok(hits / distinct > 0.83, `${name} resolves ${hits} of ${distinct}`);
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
