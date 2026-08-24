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
  validateRegionByte,
  ADDRESSABLE_ARCHITECTURES,
  MODELS_BY_SKIN,
  MODELS_WITHOUT_A_SKIN,
  SKINS_WITHOUT_A_MODEL_RECORD,
  OUT_OF_TRANSPORT_REACH,
  SKINS_WITH_A_LONG_PRESS,
  architectureHasTouch,
  hasLongPress,
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
  //
  // The assertion is that **every** touch model is arch 12, not that there is one of them: since
  // section 131 there are two, the Harmony One and its European variant, and listing names here would
  // have to be edited again the next time a regional pair is recognised. What cannot change without
  // the finding changing is the architecture.
  const touch = Object.values(MODELS_BY_SKIN).filter((m) => m.touch);
  assert.deepEqual(touch.map((m) => m.name).sort(), ['One', 'One EMEA']);
  for (const m of touch) {
    assert.equal(m.architecture, 12, `${m.name} is a touch panel and must be arch 12`);
  }
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
  // A skin the vendor's catalogue names and this library will not describe still has to come back
  // undefined, which is the whole point of listing them separately from the models.
  for (const skin of Object.keys(SKINS_WITHOUT_A_MODEL_RECORD).map(Number)) {
    assert.equal(modelForSkin(skin), undefined, `skin ${skin} has no capability record`);
  }
});

test('a regional pair is two skins of one model, and both resolve', () => {
  // Section 131. 59 and 73 were the two numbers section 81 could not explain, and this test asserted
  // that both were undefined for as long as they were believed to be numbering artefacts. They are
  // the European Harmony One and the European Harmony 600, so a remote reporting one is a remote this
  // library must recognise. The pairs are the ones whose model is described here; the catalogue has
  // more, and those are in SKINS_WITHOUT_A_MODEL_RECORD.
  const pairs: readonly [number, number][] = [[54, 59], [66, 69], [71, 73], [72, 74]];
  for (const [home, emea] of pairs) {
    const a = modelForSkin(home);
    const b = modelForSkin(emea);
    assert.ok(a && b, `skins ${home} and ${emea} both resolve`);
    // Each names the other, so neither row can be renamed without the pairing being noticed.
    assert.equal(a.alias, b.name, `skin ${home} names skin ${emea}`);
    assert.equal(b.alias, a.name, `skin ${emea} names skin ${home}`);
    assert.equal(a.architecture, b.architecture, 'a regional pair is one architecture');
    assert.equal(b.name, `${a.name} EMEA`, 'the European member is named for it');
  }
});

test('the two incompleteness lists are disjoint, and one of them is empty', () => {
  // **Renamed on 13 August 2026.** It was called `every model without a skin really has no skin`,
  // and the loop that would check that runs zero times because `MODELS_WITHOUT_A_SKIN` is `[]`, so
  // the title named the one thing the test could not be checking. The emptiness is now stated rather
  // than implied by a loop nobody notices is empty, and the loop is kept for the day it is not.
  assert.equal(MODELS_WITHOUT_A_SKIN.length, 0, 'empty since section 131; state it if it changes');
  const named = new Set(Object.values(MODELS_BY_SKIN).map((m) => m.name));
  for (const m of MODELS_WITHOUT_A_SKIN) {
    assert.ok(!named.has(m.name), `${m.name} is not also in the skin table`);
  }
  // This list is empty since section 131, and the statement of incompleteness moved to the skins the
  // vendor names that no model record covers. That list is what must stay non-empty, because it is
  // measured rather than being the residue of what nobody had looked up.
  assert.ok(
    Object.keys(SKINS_WITHOUT_A_MODEL_RECORD).length > 0,
    'the skin table is not complete and says so',
  );
  // And the two lists cannot overlap, which is what stops a skin being described and undescribed.
  for (const skin of Object.keys(SKINS_WITHOUT_A_MODEL_RECORD).map(Number)) {
    assert.ok(!(skin in MODELS_BY_SKIN), `skin ${skin} is in one list or the other`);
  }
});

test('a model states an architecture this library may not be able to address', () => {
  // The docstring said "only architectures `packages/usb` can address are here", and the table
  // carries 2, 3, 7, 8 and 10, none of which has an entry in `FLASH_TOP_BYTE_BOUND` or a window
  // table. The direction is safe, since `regionOf` then refuses every address, and the sentence is
  // what a caller trusts when deciding whether the field is usable. Corrected to say enumerate
  // rather than address, and pinned here. Section 139.
  const stated = new Set(Object.values(MODELS_BY_SKIN).map((m) => m.architecture));
  const addressable = new Set(ADDRESSABLE_ARCHITECTURES);
  const unaddressable = [...stated].filter((a) => !addressable.has(a)).sort((a, b) => a - b);
  // The exact set, not "some": it moves when a model is added or an address rule is read, and then
  // it moves in the diff.
  assert.deepEqual(unaddressable, [2, 3, 7, 8, 10]);
  assert.deepEqual([...addressable].sort((a, b) => a - b), [9, 12, 14]);
  // And the consequence, so the claim is about behaviour rather than about two lists: an
  // unaddressable architecture refuses every top byte rather than borrowing a neighbour's rule.
  for (const architecture of unaddressable) {
    assert.throws(() => validateRegionByte(0x04, architecture));
  }
});

test('no model this library describes offers a long press, and the list is why', () => {
  // **The claim FreeHarmony carried in a docstring, moved here so it can fail.** A long press is a
  // second action on one button chosen by how long it is held, and a binding read out of a config this
  // project can read never has one. That was written as a sentence in the application's own model file,
  // which makes it a fact with no test in the repository that owns the capability table.
  //
  // Stated as the positive list, from `ProductsManager/GetAllProducts` on 24 August 2026: 37 of 120
  // product records declare `LongPressAction`, 15 of them with a skin number, and every one of those 15
  // is outside `MODELS_BY_SKIN`. So the two sets being disjoint is the assertion, and it is what fails if
  // a model with the feature is ever added to the table with `hasLongPress` left saying no.
  assert.equal(SKINS_WITH_A_LONG_PRESS.length, 15);
  const described = Object.keys(MODELS_BY_SKIN).map(Number);
  const both = described.filter((skin) => SKINS_WITH_A_LONG_PRESS.includes(skin));
  assert.deepEqual(both, [], 'a described model with a long press needs a field, not a list');
  for (const skin of described) assert.equal(hasLongPress(skin), false, `skin ${skin}`);
  // And the positive half, so this cannot pass on a predicate that always says no. Skin 112 is the
  // record Logitech sold as the Harmony 950 and 104 is the Harmony 350, which is the model where the
  // feature is load bearing: four device buttons times two presses is its stated maximum of eight.
  for (const skin of [104, 112]) assert.equal(hasLongPress(skin), true, `skin ${skin}`);
  // Nor on a skin nobody has: the whole list is skins above every number this table holds.
  assert.ok(Math.min(...SKINS_WITH_A_LONG_PRESS) > Math.max(...described));
  assert.equal(hasLongPress(undefined), false);
});
