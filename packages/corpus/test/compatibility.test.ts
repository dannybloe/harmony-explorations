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
import {
  COMPARABLE_FIELDS,
  CompatibilityError,
  RailError,
  assertConfigIsForThisRemote,
  compareIntendedVersion,
  compareIntendedVersionAgainstBlock,
  encodeVersionBlock,
  readVersion,
} from '@harmony/usb';

/**
 * Every config in the corpus whose wrapper states a version, with the remote it was built for.
 *
 * The blocks come from what each unit reports: for the three bench remotes that is `concordance -i`
 * plus this project's own `GET_VERSION`, both recorded in `docs/findings.md`'s source list, and the
 * Harmony 525's whole reply is in `reference/remotes/harmony-525/usb.md` verbatim. The Harmony 700 and the
 * Harmony 880 are **not** on the bench, so their blocks are assembled from what those configs' own
 * wrappers state, which makes those rows a check that the reader and the comparison agree rather
 * than an independent measurement. They are labelled so, because a row that cannot fail is worth
 * knowing about.
 *
 * **The Harmony 885 row is measured**, `todo/todo-prepare-885.md` 2.2: its block is the one both bench
 * 885s returned to `GET_VERSION`, `44 21 49 01 80 11 08` (`tests/test_arch8_usb.py`,
 * `docs/test-notes/harmony-885.md`), and the test below the population checks that this row encodes to
 * exactly those bytes. Its wrapper was written by Logitech's service and the block was read off a unit,
 * so the two ends are independent, which no arch 8 row was before.
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
  { config: 'arch8_config_885', measured: true,
    block: { firmware: 0x44, hardware: 0x21, flash: [0x01, 0x49] as const, architecture: 8, skin: 17, platform: 0x08 } },
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
    // The population, stated so it cannot shrink unnoticed: eleven wrappers, five fields each, and five
    // of the eleven against a remote whose values were read off hardware, the Harmony 885 the fifth.
    assert.equal(CASES.length, 11);
    assert.equal(compared, 55);
    assert.equal(measured, 5);

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
  // returned compatible would pass the test above on all eleven.
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
  // Forty four combinations, of which the ones that match are exactly the config-and-remote pairs
  // above: the two Harmony One configs against the Harmony One block, the 600 against the 600, the
  // 525 against the 525 and the four Harmony 880 configs against the 880 block. Eight, so 36 refusals,
  // the Harmony 885's configuration refused by all four, the 880 block included.
  assert.equal(refused, 36);
});

/**
 * The Harmony 885: a configuration file against the version block a unit reported, row D10 of
 * `docs/plans/012-the-legacy-remotes.md`, `todo/todo-prepare-885.md` 2.2.
 *
 * **What was measured.** Both bench 885s answer `GET_VERSION` with `44 21 49 01 80 11 08`: firmware 4.4,
 * hardware 2.1, flash fields 3 and 2 `01:49`, architecture 8, software type 0, skin 17, field 6 `0x08`.
 * Every arch 8 configuration file in the lab that carries a wrapper, sixteen of them with the Harmony
 * 720's, was run through `parseEzhex` and the rail's own comparison, `assertConfigIsForThisRemote` with
 * architecture 8, at the desk; no remote was opened. 4 of 16 pass, and they are four downloads of one
 * account's 885 configuration with identical headers (their payloads differ), so one independent case
 * for the header. The other twelve are refused on `SKIN` and `BOARD`
 * together and on nothing else: ten Harmony 880 files (skin 15, board 1.8.0), the 880 Pro (skin 39,
 * board 2.2.0) and the 720 (skin 44, board 0.8.0). `PROTOCOL` 8, `FLASH` `0x01:0x49` and `SOFTWARETYPE`
 * 0 are stated by all sixteen, and none states `ARCHITECTURE`. The lab's registry names six of the
 * sixteen, which are what this test can load: the 885's and five 880 files, the four contributed with
 * harmony-decompiler and the 880 that has a written description.
 *
 * **The independent closure.** The wrapper's `FLASH` was written by Logitech's service and the block's
 * fields 3 and 2 were read off a unit, and they agree in the order `compareIntendedVersion` reads them,
 * manufacturer first. The swapped pair is refused below, so the order is confirmed on this
 * architecture by two ends that share no bytes. The same holds for `SKIN` against field 5 and `BOARD`
 * against field 1. The 880 rows above cannot give this, since their block was built from their own
 * wrappers.
 *
 * **What the fields mean on this architecture**, read in the firmware and landed earlier
 * (`tests/test_harmony_885_erase_and_write.py`, `tests/test_harmony_885_reads.py`): the application
 * reports an Atmel `1F:C0` as `01:49`, keeps `01:49`, and reports any other part as `FF:FF`, so on arch
 * 8 `FLASH` asks whether the application knows the part, either of the two it knows, not which part is
 * fitted; a block reporting `FF:FF` is refused by the same comparison against any wrapper stating
 * `0x01:0x49`, which all sixteen do, and the 885's is asserted below on a block built for the purpose. `BOARD` is the newest entry of the
 * hardware version log at `0x000140` in the remote's own flash, which the bootloader writes and a host
 * can append to through `0x000104` after the unlock at `0x000106`; no library write reaches it, since
 * the rails confine `WRITE_FLASH` to the configuration region. So `BOARD` is stored per unit and is not
 * a constant compiled into the application. That is a statement about the mechanism: in the files
 * `BOARD` varies by model (1.8.0 on ten 880 files, 2.1.0 on the four 885 downloads, 2.2.0 on the 880
 * Pro, 0.8.0 on the 720), and nothing here shows two units of one model differing. Field 6 is 8 here as well as the architecture, so the
 * trap on the Harmony One and the 600, 650 and 700, where field 6 is `0x0C` on both, cannot show on
 * this platform and nothing here would have caught a reader taking `PROTOCOL` from field 6.
 *
 * **Sources checked before the work.** `reference/config-format/ezhex.md`, `docs/findings.md` sections
 * 87 and 225, the platform's reference pages, and Logitech's classic client, whose
 * `VersionHelper.matchVersionTag` compares `BOARD`, `FLASH`, `SOFTWARETYPE`, `PROTOCOL`, `ARCHITECTURE`
 * and `SKIN` and is what its update operation runs on `INTENDEDVERSION`, so by its reading it would
 * refuse the same twelve on the same two fields; that client was read, not run, and whether its own
 * strings for the remote's flash and skin spell what the wrapper does was not checked. MyHarmony's source
 * holds no `INTENDEDVERSION` matcher.
 *
 * **What would falsify it**: a unit of skin 17 reporting a board other than 2.1, or a block whose
 * fields 3 and 2 are not `01:49` on a running 885 application.
 *
 * **Not settled here**: whether an 880 configuration would run on an 885, which is a question about the
 * remote and not about the gate; what `BOARD` would read after the log had been appended to; and the
 * hardware byte a remote in its bootloader reports, which is why no bootloader block is asserted.
 */
const H885_BLOCK = Uint8Array.from([0x44, 0x21, 0x49, 0x01, 0x80, 0x11, 0x08]);
const H880_FILES = ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880'];

test('a Harmony 885 configuration file matches the block a Harmony 885 reported, and 880 files are refused on skin and board',
  lab.skipUnless('arch8_config_885', ...H880_FILES), () => {
    // The row in CASES is these bytes and nothing assembled: encoding it gives back what the units sent.
    const row = CASES.find((c) => c.config === 'arch8_config_885');
    assert.ok(row?.measured);
    assert.deepEqual([...encodeVersionBlock(row.block)], [...H885_BLOCK]);

    // Through the rail itself, with the architecture the block states.
    const stated = parseEzhex(lab.require_('arch8_config_885'), 'arch8_config_885')
      .intendedVersion as Record<string, string>;
    // Every file here states the flash pair the application reports for the part it knows.
    for (const name of ['arch8_config_885', ...H880_FILES]) {
      assert.equal(parseEzhex(lab.require_(name), name).intendedVersion.FLASH, '0x01:0x49', name);
    }
    assert.equal(assertConfigIsForThisRemote({ architecture: 8, intendedVersion: stated, versionBlock: H885_BLOCK })
      .compared, 5);

    // The control: an 880 file is refused, and on exactly the two fields that make a unit an 880, so a
    // refusal for some other reason, an unreadable file say, would fail here.
    let refused = 0;
    for (const name of H880_FILES) {
      const s = parseEzhex(lab.require_(name), name).intendedVersion as Record<string, string>;
      const result = compareIntendedVersionAgainstBlock(s, H885_BLOCK);
      assert.deepEqual(result.mismatched, ['SKIN', 'BOARD'], name);
      assert.equal(result.compared, 5, name);
      assert.throws(() => assertConfigIsForThisRemote({ architecture: 8, intendedVersion: s, versionBlock: H885_BLOCK }),
        RailError, name);
      refused += 1;
    }
    assert.equal(refused, 5);

    // The flash pair's order, and the answer an application gives for a part it does not know. Each
    // block differs from the measured one in fields 2 and 3 only.
    const swapped = Uint8Array.from([0x44, 0x21, 0x01, 0x49, 0x80, 0x11, 0x08]);
    const unknownPart = Uint8Array.from([0x44, 0x21, 0xff, 0xff, 0x80, 0x11, 0x08]);
    assert.deepEqual(compareIntendedVersionAgainstBlock(stated, swapped).mismatched, ['FLASH']);
    assert.deepEqual(compareIntendedVersionAgainstBlock(stated, unknownPart).mismatched, ['FLASH']);
  });

/**
 * `SOFTWARE` inside `INTENDEDVERSION`: three wrappers, and the reader removes it before the comparison.
 *
 * Found while measuring the Harmony 885 row above. A census at the desk of all 41 `.EZHex` files in the
 * lab found 37 with an `INTENDEDVERSION`, and exactly three of them stating an element there beyond the
 * six known names: the three later harmony-decompiler arch 8 samples, `arch8_config_b` to `_d`, each
 * `<SOFTWARE>4.4</SOFTWARE>` between `BOARD` and `SOFTWARETYPE`. The census is not asserted, since the
 * registry names few of those files; this test asserts it over the eleven wrappers of `CASES`, of which
 * exactly those three carry it. Section 87, the comment on `INTENDED_VERSION_FIELDS` and its Python twin
 * said one arch 8 config; it is three.
 *
 * **What happens to it**: `parseEzhex` looks up the six known names only, so `SOFTWARE` is dropped
 * without a word and the comparison never sees it. The comparison's rule that an unknown field is a
 * refusal therefore cannot fire on a real file, and `reference/config-format/ezhex.md` credited that
 * rule with handling `SOFTWARE` until this test. Handed through, the comparison does refuse it, so a
 * reader that passed every element on would start refusing these three files. `src/harmony/ezfile.py`
 * has the same shape. The outcome matches Logitech's classic client, whose matcher does not compare
 * `SOFTWARE` either: `VersionHelper` reads it only into its own description of the remote, as the
 * firmware version, and `matchVersionTag` compares the six (stated by Logitech, in their client, read
 * and not run). Whether this library's gate should compare it or ignore it by name is a decision
 * about the gate and is not taken here.
 *
 * **The message chain in the same three files** keys two entries on nine `SOFTWARE` values each, a
 * warning to upgrade the firmware and then an abort (the entry types are read, not asserted), and the values are 0.1 to 0.8 and 4.0, not the
 * 0.1 to 0.9 section 225 listed; the entry that matches the remote itself carries `SOFTWARE` 4.4 as well.
 * Every `SOFTWARE` element in each header is asserted below in order, so a misread value fails here.
 */
test('three arch 8 wrappers state SOFTWARE inside INTENDEDVERSION, and the reader drops it before the comparison',
  lab.skipUnless(...ALL), () => {
    const carrying: string[] = [];
    for (const c of CASES) {
      const ez = parseEzhex(lab.require_(c.config), c.config);
      const block = /<INTENDEDVERSION>([\s\S]*?)<\/INTENDEDVERSION>/.exec(ez.xml)?.[1];
      assert.ok(block !== undefined, c.config);
      if (!/<SOFTWARE>/.test(block)) continue;
      carrying.push(c.config);
      // The reader kept the six it knows and nothing else.
      assert.equal(Object.hasOwn(ez.intendedVersion, 'SOFTWARE'), false, c.config);
      assert.equal(/<SOFTWARE>4\.4<\/SOFTWARE>/.test(block), true, c.config);
      // Handed through, the comparison refuses it rather than skipping it.
      const handed = { ...(ez.intendedVersion as Record<string, string>), SOFTWARE: '4.4' };
      assert.throws(() => compareIntendedVersion(handed, readVersion(encodeVersionBlock(c.block))),
        CompatibilityError, c.config);
      // Every SOFTWARE element in the header, in document order: the two upgrade entries, the entry
      // that matches the remote itself, then INTENDEDVERSION's own.
      const upgrade = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '4.0'];
      assert.deepEqual([...ez.xml.matchAll(/<SOFTWARE>([^<]*)<\/SOFTWARE>/g)].map((m) => m[1]),
        [...upgrade, ...upgrade, '4.4', '4.4'], c.config);
    }
    assert.deepEqual(carrying, ['arch8_config_b', 'arch8_config_c', 'arch8_config_d']);
  });

test('the field list and the comparison table are the same six fields', () => {
  // Two tables in two packages that cannot import each other, which is the state this repository
  // refuses to leave unchecked: `INTENDED_VERSION_FIELDS` is the config format's vocabulary and
  // `COMPARABLE_FIELDS` is the mapping to a protocol reading. Same shape as
  // `TheTwoParameterGroupTablesAgree`, and for the same reason: nothing else can see both.
  assert.deepEqual([...COMPARABLE_FIELDS], [...INTENDED_VERSION_FIELDS]);
});
