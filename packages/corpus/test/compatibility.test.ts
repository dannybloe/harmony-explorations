/**
 * The compatibility gate against every wrapper in the corpus, and the two tables that must agree.
 *
 * Section 225. This lives here rather than in `packages/usb` because it needs both halves:
 * `packages/codec` parses a config's XML wrapper and `packages/usb` compares it against a remote's
 * version block, and `packages/usb` deliberately does not depend on the codec. `packages/corpus` is
 * the package whose whole purpose is composing the two.
 *
 * The pure comparison rules are `packages/usb/test/compatible.test.ts`, on literals, with no lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { INTENDED_VERSION_FIELDS, parseEzhex } from '@harmony/codec';
import { COMPARABLE_FIELDS, compareIntendedVersionAgainstBlock, encodeVersionBlock } from '@harmony/usb';

/**
 * Every config in the corpus whose wrapper states a version, with the remote it was built for.
 *
 * The blocks come from what each unit reports: for the three bench remotes that is `concordance -i`
 * plus this project's own `GET_VERSION`, both recorded in `docs/findings.md`'s source list, and the
 * Harmony 525's whole reply is in `docs/usb-protocol.md` verbatim. The Harmony 700 and the arch 8
 * models are **not** on the bench, so their blocks are assembled from what those configs' own
 * wrappers state, which makes those rows a check that the reader and the comparison agree rather
 * than an independent measurement. They are labelled so, because a row that cannot fail is worth
 * knowing about.
 */
const CASES = [
  { config: 'one_config', measured: true,
    block: { firmware: 0x34, hardware: 0x05, flash: [0x1f, 0xc8] as const, architecture: 12, skin: 54, platform: 0x0c } },
  { config: 'one_config_unprogrammed', measured: true,
    block: { firmware: 0x34, hardware: 0x05, flash: [0x1f, 0xc8] as const, architecture: 12, skin: 54, platform: 0x0c } },
  { config: 'h600_config', measured: true,
    block: { firmware: 0x02, hardware: 0x11, flash: [0x15, 0x1c] as const, architecture: 14, skin: 71, platform: 0x0c } },
  { config: 'h525_config', measured: true,
    block: { firmware: 0x30, hardware: 0x25, flash: [0xff, 0x12] as const, architecture: 9, skin: 22, platform: 0x09 } },
  { config: 'h700_config', measured: false,
    block: { firmware: 0x28, hardware: 0x00, flash: [0x15, 0x1c] as const, architecture: 14, skin: 66, platform: 0x0c } },
  { config: 'h700_config_2', measured: false,
    block: { firmware: 0x28, hardware: 0x00, flash: [0x15, 0x1c] as const, architecture: 14, skin: 66, platform: 0x0c } },
  { config: 'arch8_config_a', measured: false,
    block: { firmware: 0x44, hardware: 0x18, flash: [0x01, 0x49] as const, architecture: 8, skin: 15, platform: 0x08 } },
  { config: 'arch8_config_b', measured: false,
    block: { firmware: 0x44, hardware: 0x18, flash: [0x01, 0x49] as const, architecture: 8, skin: 15, platform: 0x08 } },
  { config: 'arch8_config_c', measured: false,
    block: { firmware: 0x44, hardware: 0x18, flash: [0x01, 0x49] as const, architecture: 8, skin: 15, platform: 0x08 } },
  { config: 'arch8_config_d', measured: false,
    block: { firmware: 0x44, hardware: 0x18, flash: [0x01, 0x49] as const, architecture: 8, skin: 15, platform: 0x08 } },
] as const;

/** The containers with no wrapper at all, which is the case the write path actually meets. */
const NO_WRAPPER = [
  'h525_config_2',
  'one_spare_before_sync',
  'one_spare_after_sync',
] as const;

const ALL = [...CASES.map((c) => c.config), ...NO_WRAPPER];

test('every config in the corpus is compatible with the remote it was built for',
  lab.skipUnless(...ALL), () => {
    let compared = 0;
    let measured = 0;
    for (const c of CASES) {
      const blob = lab.require_(c.config);
      const stated = parseEzhex(blob, c.config).intendedVersion as Record<string, string>;
      const result = compareIntendedVersionAgainstBlock(stated, encodeVersionBlock(c.block));
      assert.deepEqual(result.mismatched, [],
        `${c.config}: ${JSON.stringify(result.fields.filter((f) => f.verdict === 'mismatch'))}`);
      // **Five, exactly, not "at least one".** A bound would pass on a wrapper the reader had
      // stopped finding fields in, which is the failure mode this whole gate is about: a comparison
      // that compares nothing reports a match.
      assert.equal(result.compared, 5, `${c.config}: fields compared`);
      compared += result.compared;
      if (c.measured) measured += 1;
    }
    // The population, stated so it cannot shrink unnoticed: ten wrappers, five fields each, and four
    // of the ten against a remote whose values were read off hardware.
    assert.equal(CASES.length, 10);
    assert.equal(compared, 50);
    assert.equal(measured, 4);

    // And no config in the corpus states `ARCHITECTURE`, which is why five and not six. That is what
    // makes the sixth field's mapping unexercised, and saying so here is cheaper than a document
    // remembering to.
    for (const c of CASES) {
      const stated = parseEzhex(lab.require_(c.config), c.config).intendedVersion;
      assert.equal(stated.ARCHITECTURE, undefined, c.config);
    }
  });

test('a config read off a remote states nothing, and that is not a match',
  lab.skipUnless(...ALL), () => {
    // **The case the write path actually meets**, and the reason the rehearsal's gate compares
    // nothing. A container read over USB is the payload without the wrapper: the six fields live in
    // XML the host software adds, so a remote never stores them and nothing read back can carry
    // them. Three of the corpus's containers arrived that way.
    for (const name of NO_WRAPPER) {
      const stated = parseEzhex(lab.require_(name), name).intendedVersion as Record<string, string>;
      assert.deepEqual(stated, {}, name);
      const result = compareIntendedVersionAgainstBlock(stated, encodeVersionBlock({ architecture: 12 }));
      assert.equal(result.compared, 0, name);
      // Compatible, because the format says an absent field matches anything, and `compared` is the
      // only thing that distinguishes this from a real match.
      assert.equal(result.compatible, true, name);
    }
    assert.equal(NO_WRAPPER.length, 3);
  });

test('the wrong remote is refused for every config in the corpus', lab.skipUnless(...ALL), () => {
  // The control, and it is the one that gives the test above its meaning: every wrapper, against
  // every **other** architecture's remote, must disagree. Without this, a comparison that always
  // returned compatible would pass the test above on all ten.
  const others = [
    encodeVersionBlock({ architecture: 12, hardware: 0x05, flash: [0x1f, 0xc8], skin: 54 }),
    encodeVersionBlock({ architecture: 14, hardware: 0x11, flash: [0x15, 0x1c], skin: 71 }),
    encodeVersionBlock({ architecture: 9, hardware: 0x25, flash: [0xff, 0x12], skin: 22 }),
    encodeVersionBlock({ architecture: 8, hardware: 0x18, flash: [0x01, 0x49], skin: 15 }),
  ];
  let refused = 0;
  for (const c of CASES) {
    const stated = parseEzhex(lab.require_(c.config), c.config).intendedVersion as Record<string, string>;
    for (const block of others) {
      const result = compareIntendedVersionAgainstBlock(stated, block);
      if (result.compatible) {
        // Its own architecture's block is the one that may match, and only for the model whose skin
        // and flash it also carries.
        assert.equal(result.compared, 5, c.config);
        continue;
      }
      refused += 1;
    }
  }
  // Forty combinations, of which the ones that match are exactly the config-and-remote pairs above:
  // the two Harmony One configs against the Harmony One block, the 600 against the 600, the 525
  // against the 525 and the four arch 8 configs against the arch 8 block. Eight, so 32 refusals.
  assert.equal(refused, 32);
});

test('the field list and the comparison table are the same six fields', () => {
  // Two tables in two packages that cannot import each other, which is the state this repository
  // refuses to leave unchecked: `INTENDED_VERSION_FIELDS` is the config format's vocabulary and
  // `COMPARABLE_FIELDS` is the mapping to a protocol reading. Same shape as
  // `TheTwoParameterGroupTablesAgree`, and for the same reason: nothing else can see both.
  assert.deepEqual([...COMPARABLE_FIELDS], [...INTENDED_VERSION_FIELDS]);
});
