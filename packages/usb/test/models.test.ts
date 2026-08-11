/**
 * `reference/capabilities.md` in executable form.
 *
 * The capability data is third party and unconfirmed, so what these tests pin is not that the data is
 * right. It is the three things this project has checked independently, plus the internal consistency
 * that would break silently if somebody edited a row: a skin's model, the touch claim against the
 * firmware's own behaviour, and the alias pairs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODELS_BY_SKIN,
  MODELS_WITHOUT_A_SKIN,
  OUT_OF_TRANSPORT_REACH,
  architectureHasTouch,
  modelForSkin,
} from '../src/index.ts';

test('the six confirmed skins name the models they were confirmed as', () => {
  // From firmware literals and live remotes, none of which consulted Logitech's client table.
  // `reference/models.md`. These are the calibration for every other row.
  assert.equal(modelForSkin(54)?.name, 'One');
  assert.equal(modelForSkin(71)?.name, '600');
  assert.equal(modelForSkin(72)?.name, '650');
  assert.equal(modelForSkin(66)?.name, '700');
  assert.equal(modelForSkin(22)?.name, '525');
  assert.equal(modelForSkin(15)?.name, '880');
  // And their architectures, which our own container reads confirm.
  assert.equal(modelForSkin(54)?.architecture, 12);
  assert.equal(modelForSkin(71)?.architecture, 14);
  assert.equal(modelForSkin(22)?.architecture, 9);
  assert.equal(modelForSkin(15)?.architecture, 8);
});

test('the One is the only touch panel, which is what the firmware says too', () => {
  // The one capability field confirmed here, and by a negative: base slot 17 is a touch hit map on
  // arch 12 and names the picture bank everywhere else, sections 45 and 62. So the only architecture
  // with a touch model must be 12, and no other may have one.
  const touch = Object.values(MODELS_BY_SKIN).filter((m) => m.touch);
  assert.deepEqual(touch.map((m) => m.name), ['One']);
  assert.ok(architectureHasTouch(12));
  for (const architecture of [2, 3, 7, 8, 9, 10, 14]) {
    assert.ok(!architectureHasTouch(architecture), `arch ${architecture} has no touch model`);
  }
});

test('one architecture spans both panels, which is why a config cannot state one', () => {
  // The 600 and the 650 are both arch 14 and their screens differ. The 600's is monochrome, which its
  // owner confirmed by looking at it, and its config carries two byte pixels regardless. So a
  // renderer that reads the panel out of the file gets it wrong on this exact pair.
  assert.equal(modelForSkin(71)?.architecture, 14);
  assert.equal(modelForSkin(72)?.architecture, 14);
  assert.equal(modelForSkin(71)?.panel, 'monochrome');
  assert.equal(modelForSkin(72)?.panel, 'colour');
});

test('an alias pair shares a specification row and is not the same hardware', () => {
  // The comparison table's own Eur# column: the 525 is the European 520, and five more pairs like it.
  // Every field in this record has to match, or a remote's stated capabilities would depend on which
  // region it was sold in.
  //
  // **What must not be read into that is identical hardware**, which is how this test was first
  // named. The keypads differ: the 525 carries four colour keys where the 520 has none, and the 885
  // carries them where the 880 has a pair of chevrons. Two pairs, same difference, and colour keys
  // are teletext. Nothing in this record states a button count, which is why the assertion below is
  // still right and its old name was not.
  const pairs: [number, number][] = [[22, 18], [68, 67], [15, 17], [19, 23]];
  for (const [a, b] of pairs) {
    const first = modelForSkin(a);
    const second = modelForSkin(b);
    assert.ok(first && second, `skins ${a} and ${b} are both present`);
    assert.equal(first.alias, second.name);
    assert.equal(second.alias, first.name);
    const strip = (m: typeof first) => ({ ...m, name: '', alias: '' });
    assert.deepEqual(strip(first), strip(second), `skins ${a} and ${b} agree on everything else`);
  }
});

test('no model claims an architecture the transport cannot address', () => {
  // Arch 15 is a network class rather than HID, so a capability record for it would be a promise this
  // library cannot keep. The names are listed instead, which is a statement rather than a gap.
  const all = [...Object.values(MODELS_BY_SKIN), ...MODELS_WITHOUT_A_SKIN];
  for (const m of all) {
    assert.ok(m.architecture >= 2 && m.architecture <= 14, `${m.name} is arch ${m.architecture}`);
  }
  assert.deepEqual([...OUT_OF_TRANSPORT_REACH], ['900', '1000', '1000i', '1100', '1100i']);
  // And none of those appears as a model, which is the check that the two lists cannot drift.
  for (const name of OUT_OF_TRANSPORT_REACH) {
    assert.ok(!all.some((m) => m.name === name), `${name} has no capability record`);
  }
});

test('a skin nobody has recorded is undefined rather than a plausible wrong model', () => {
  // The failure this table must not have. A remote reporting an unknown skin has to come back as
  // unknown, because guessing its panel or its device limit is worse than saying nothing.
  assert.equal(modelForSkin(undefined), undefined);
  assert.equal(modelForSkin(0), undefined);
  assert.equal(modelForSkin(255), undefined);
  // 59 and 73 are the two skins section 81 found in containers whose remotes do not have them, so
  // they are the realistic wrong answers and both must miss.
  assert.equal(modelForSkin(59), undefined);
  assert.equal(modelForSkin(73), undefined);
});

test('every model without a skin really has no skin', () => {
  const named = new Set(Object.values(MODELS_BY_SKIN).map((m) => m.name));
  for (const m of MODELS_WITHOUT_A_SKIN) {
    assert.ok(!named.has(m.name), `${m.name} is not also in the skin table`);
  }
  assert.ok(MODELS_WITHOUT_A_SKIN.length > 0, 'the skin table is not complete and says so');
});
