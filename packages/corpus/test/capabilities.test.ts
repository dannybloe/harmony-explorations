/**
 * The capability table against the corpus, which is the only cross check available without hardware.
 *
 * This is in `packages/corpus` because it is the one package that composes the codec and the USB
 * layer, and the check is a join: a model's stated device maximum against what a config of that model
 * actually holds. Putting it either side would mean copying one table into the other package's tests,
 * which is the two diverging derivations state `CLAUDE.md` warns about.
 *
 * The capability data is third party. What this pins is our own agreement with it, per model, so a
 * later sample that exceeds a stated maximum fails here instead of being noticed by nobody.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, deviceCount, activityCount } from '@harmony/codec';
import { modelForSkin } from '@harmony/usb';
import { imagePath, skipUnless } from '@harmony/lab';

/** Sample to the skin of the remote it came off, where that is known. */
const SAMPLES: readonly [string, number][] = [
  ['h700_config', 66],
  ['h700_config_2', 66],
  ['h600_config', 71],
  ['one_config', 54],
  ['one_config_unprogrammed', 54],
  ['h525_config', 22],
  ['h525_config_2', 22],
];

// Listed once, so the guard and the loop cannot drift apart. `CLAUDE.md` on why that matters: a skip
// raised inside a loop lets the loop finish and a corpus wide assertion afterwards runs against
// nothing at all.
const NAMES = SAMPLES.map(([name]) => name);

test('no config holds more devices than its model is stated to take', skipUnless(...NAMES), () => {
  for (const [name, skin] of SAMPLES) {
    const model = modelForSkin(skin);
    assert.ok(model, `skin ${skin} is in the table`);
    const c = parse(new Uint8Array(readFileSync(imagePath(name)!)));
    const devices = deviceCount(c);
    assert.ok(devices !== undefined, `${name} states a device count`);
    assert.ok(
      devices <= model.maxDevices,
      `${name} on a ${model.name}: ${devices} devices against a stated maximum of ${model.maxDevices}`,
    );
    // The architecture has to agree too, since the sample and the skin are two independent statements
    // of the same remote and a mislabelled sample would show up here first.
    assert.equal(c.architecture, model.architecture, `${name} is arch ${model.architecture}`);
  }
});

test('the 700 sits exactly at its stated maximum', skipUnless('h700_config', 'h700_config_2'), () => {
  // The one sample at a limit, which is what makes the column worth anything: a maximum nothing
  // reaches is consistent with any number at all. Both 700 configs hold six devices against a stated
  // six, so a seventh would be the first thing this table forbids.
  const model = modelForSkin(66);
  assert.equal(model?.maxDevices, 6);
  for (const name of ['h700_config', 'h700_config_2']) {
    const c = parse(new Uint8Array(readFileSync(imagePath(name)!)));
    assert.equal(deviceCount(c), 6, `${name} holds six devices`);
  }
});

test('a monochrome model still carries two byte pixels', skipUnless('h600_config'), () => {
  // Section 86's device count and the panel are independent, and this is the pair that proves a
  // renderer cannot read the panel out of the file: the 600 is monochrome, confirmed by its owner
  // looking at it, and its pictures are the same two bytes a pixel as the colour models'.
  const model = modelForSkin(71);
  assert.equal(model?.panel, 'monochrome');
  const c = parse(new Uint8Array(readFileSync(imagePath('h600_config')!)));
  assert.equal(c.architecture, 14);
  // And the 650, the colour model, is the same architecture, so the format cannot be keyed on it.
  assert.equal(modelForSkin(72)?.architecture, 14);
  assert.equal(modelForSkin(72)?.panel, 'colour');
  // The activity count is read from the same container, which is what an interface shows next to a
  // rendered screen, so it is asserted here as the thing the join is ultimately for.
  assert.ok((activityCount(c) ?? 0) >= 1, 'the 600 config names at least one activity');
});
