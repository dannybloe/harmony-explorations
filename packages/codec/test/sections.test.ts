/**
 * The tabular sections and the infrared database, ported for milestone M2.
 *
 * The port is held to the numbers `src/harmony/gspm.py` already produces, sample by sample, which
 * is the same discipline the screen language port used: the figures were published before this
 * implementation existed, so reaching them from a second one is a check and not a restatement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { eventMap, handlerSets, irGroups, irPulses, modeTable, parse, stateTable, taggedList }
  from '../src/index.ts';

/** `[sample, event fallback, state header, modes, bindings, records per group]`. */
const SECTIONS: readonly [string, number, number[], number, number, number[]][] = [
  ['h700_config', 19, [94, 67, 27, 67], 374, 11, [30, 111, 65, 52, 10, 82]],
  ['h600_config', 14, [74, 55, 19, 55], 237, 9, [81, 51, 0, 54]],
  ['one_config', 10, [46, 45, 1, 45], 268, 16, [83, 53, 59, 74, 59]],
  ['arch8_config_a', 4, [33, 32, 1, 32], 103, 9, [57, 163, 14]],
  ['h525_config', 11, [24, 23, 1, 23], 114, 8, [8, 67, 61, 64]],
];

/** Total mark and space durations decoded, per sample. `docs/findings.md` section 32. */
const PULSES: readonly [string, number][] = [
  ['h700_config', 26388],
  ['h600_config', 11963],
  ['one_config', 21659],
  ['arch8_config_a', 10310],
  // Arch 9 decodes very few, which is the negative case: its records are one of the other three
  // infrared encoding classes and this reader only knows the streamed one.
  ['h525_config', 2769],
];

for (const [name, fallback, header, modes, bindings, groups] of SECTIONS) {
  test(`${name}: the four tabular sections read as Python reads them`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const events = eventMap(c);
    assert.equal(events?.fallback, fallback);
    // Thirty in every config in the corpus, and the length is 5 + 4 * 30 rather than the gap to
    // the next pointer, which runs to 1532 because base slot 5's arrays sit inside it.
    assert.equal(events?.entries.size, 30);
    assert.equal(events?.length, 125);

    const state = stateTable(c);
    assert.deepEqual(
      [state?.count, state?.narrow, state?.wide, state?.narrowAgain],
      header,
      'the state table header',
    );
    assert.equal(state?.narrow as number + (state?.wide as number), state?.count, 'the split');
    assert.equal(state?.entries.length, state?.count);

    assert.equal(modeTable(c)?.addresses.length, modes);
    assert.equal(handlerSets(c)?.addresses.length, bindings);
    assert.deepEqual((irGroups(c) ?? []).map((g) => g.addresses.length), groups);
  });
}

for (const [name, pulses] of PULSES) {
  test(`${name}: the infrared records decode ${pulses} durations`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    let total = 0;
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) total += irPulses(c, address)?.pulses.length ?? 0;
    }
    assert.equal(total, pulses);
  });
}

test('a mode entry reads as a tagged list, and its extent is not trusted', skipUnless('h600_config'),
  () => {
    // Both halves matter. The entries decode, which is what names the section; the length does
    // not, which is why `coverage.ts` claims none of them. Every mode entry in this config is the
    // wide form and the longest reads as 255 entries, exactly where a u8 count saturates.
    const c = parse(load('h600_config') as Uint8Array);
    const addresses = modeTable(c)?.addresses ?? [];
    assert.ok(addresses.length > 0);
    let widest = 0;
    for (const address of addresses) {
      const list = taggedList(c, address);
      assert.notEqual(list, undefined, `no list at ${address}`);
      widest = Math.max(widest, (list as { entries: unknown[] }).entries.length);
      // The wide form is chosen by the first byte being zero, exactly as the firmware chooses it.
      const off = c.blobOffsetOf(address) as number;
      assert.equal(c.blob[off], 0, 'every mode entry here is the wide form');
    }
    assert.equal(widest, 255, 'the saturation that says the length rule is unsettled');
  });
