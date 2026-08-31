/**
 * The rails, tested as refusals.
 *
 * A safety rail is only worth having if it says no, so every test here is a no. The one thing that
 * has to be true above all: a default build refuses everything, and it refuses it in the library
 * rather than in a dialog box, because a rail enforced by a user interface is enforced until
 * somebody writes a script.
 *
 * These tests run with writes disabled, which is the shipped state. The subprocess test at the
 * bottom is what checks the other side of the flag without turning it on for everything else.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFile } from 'node:fs/promises';

import {
  ARCHITECTURES_WITH_A_WRITE_TARGET,
  CONFIG_REGION_BASE,
  ERASE_BLOCK_SIZE,
  ERASE_FLASH,
  READ_FLASH,
  RailError,
  TransportError,
  SFR_PAGE_START,
  WRITABLE_CEILING,
  WRITES_ENABLED,
  assertEraseAllowed,
  assertFirmwareWriteRefused,
  assertFlashWriteAllowed,
  assertDeliberateHangAllowed,
  assertFirstWriteAllowed,
  assertRamWriteAllowed,
  assertSessionEndAllowed,
  address24,
  encodeRequest,
  encodeVersionBlock,
  eraseBoundsFor,
  IDENTITY_BYTES,
  IDENTITY_FIELDS,
  guardMutations,
  readFlashRequest,
  writableRange,
} from '../src/index.ts';
import type { Transport } from '../src/index.ts';
// Deep import on purpose: this is the hatch the barrel deliberately does not offer, section 224.
import { authoriseReport } from '../src/authorise.ts';

/**
 * A synthetic identity block in the shape a remote's really is: `0xEE` where the serial field is,
 * two distinct GUIDs, sixteen zeroes.
 *
 * The `0xEE` fill is deliberate rather than decoration. That is what every remote read here actually
 * carries in the field named the serial, so a test permission built without it would not exercise
 * the refusal that field is the whole reason for.
 */
function identityFor(seed: number): Uint8Array {
  const block = new Uint8Array(IDENTITY_BYTES).fill(0);
  block.fill(0xee, IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  for (let i = 0; i < 0x20; i += 1) {
    block[IDENTITY_FIELDS.guidA + i] = (seed * 31 + i * 7 + 1) & 0xff;
  }
  return block;
}

/** The unit these tests may write to, and one that is not it. */
const THIS_UNIT = identityFor(1);
const ANOTHER_UNIT = identityFor(2);

/** What an identity looks like when nothing per unit was ever written into it. */
const NO_IDENTITY = new Uint8Array(IDENTITY_BYTES).fill(0xee);

/**
 * A version block the spare Harmony One would send, from the values `concordance -i` reads off both
 * bench Harmony Ones and `one_config`'s wrapper states: firmware 3.4, board 0.5, flash `1F:C8`,
 * architecture 12, software type 0 for the application, skin 54.
 */
const ONE_BLOCK = encodeVersionBlock({
  firmware: 0x34,
  hardware: 0x05,
  flash: [0x1f, 0xc8],
  architecture: 12,
  softwareType: 0,
  skin: 54,
  platform: 0x0c,
});

/** What a Harmony One's own config states, verbatim, so `IDEAL` compares rather than claims. */
const ONE_STATED = {
  PROTOCOL: '12',
  SKIN: '54',
  FLASH: '0x1F:0xC8',
  BOARD: '0.5.0',
  SOFTWARETYPE: '0',
} as const;

/**
 * Everything a caller could possibly have in order, on the architecture that has a target.
 *
 * **The version fields are inputs and not a boolean since section 225.** This carried
 * `intendedVersionMatches: true`, which is what every caller of the rails passed and what made the
 * compatibility gate a comment: the config and the remote here now genuinely agree on five fields
 * and the rail is the thing that finds that out.
 */
const IDEAL = {
  architecture: 12,
  configLength: 0x1000,
  originalDumpVerified: true,
  intendedVersion: ONE_STATED,
  versionBlock: ONE_BLOCK,
  // **A comparison and not a boolean since section 226.** This carried `targetIsTheSpareRemote:
  // true`, which is what every caller passed and what made the question unanswerable: two Harmony
  // Ones enumerate identically, so nothing the library could see told them apart. It compares the
  // unit's own identity block against the one the caller recorded, and the same block on both sides
  // is a permission for the remote actually on the cable.
  identityBlock: THIS_UNIT,
  permittedUnit: THIS_UNIT,
} as const;

/**
 * `IDEAL` as source for the subprocess tests, since a `Uint8Array` does not survive
 * `JSON.stringify`: it becomes an object with numeric keys, which every rail would then read as an
 * unreadable version block, and the tests would pass for the wrong reason.
 */
const IDEAL_SOURCE = `const IDEAL = {
  ...${JSON.stringify({
    architecture: IDEAL.architecture,
    configLength: IDEAL.configLength,
    originalDumpVerified: IDEAL.originalDumpVerified,
    intendedVersion: IDEAL.intendedVersion,
  })},
  identityBlock: Uint8Array.from(${JSON.stringify([...THIS_UNIT])}),
  permittedUnit: Uint8Array.from(${JSON.stringify([...THIS_UNIT])}),
  another: Uint8Array.from(${JSON.stringify([...ANOTHER_UNIT])}),
  noIdentity: Uint8Array.from(${JSON.stringify([...NO_IDENTITY])}),
  versionBlock: rails.encodeVersionBlock(${JSON.stringify({
    firmware: 0x34,
    hardware: 0x05,
    flash: [0x1f, 0xc8],
    architecture: 12,
    softwareType: 0,
    skin: 54,
    platform: 0x0c,
  })}),
};`;

/** A block for an architecture whose tables are being exercised, with nothing else stated. */
function blockFor(architecture: number): Uint8Array {
  return encodeVersionBlock({ architecture });
}

test('the package offers no way to build a request that changes a remote', async () => {
  // **The bypass this closes, measured on 13 August 2026.** `rails.ts` opens by saying a rail here is
  // enforced for every caller. It was enforced for every caller of `HarmonyRemote`: the barrel
  // star-exported `protocol.ts`, so `eraseFlashRequest` came with it, and `openHarmony` returns a
  // `Transport` whose `write` is public. Two lines reached `ERASE_FLASH` on a live remote with no
  // permission object, no `WRITES_ENABLED` and no architecture check, and an erase takes an address
  // and no count: 64 KiB of a Harmony One (arch 12) at whichever address it lands on.
  //
  // The four encoders are in `writes.ts` now, which the barrel does not re-export. This asserts the
  // barrel rather than the file, because a list of names in a docstring is what drifted in the first
  // place, and because the next write encoder somebody adds will be caught by it.
  const barrel = (await import('../src/index.ts')) as Record<string, unknown>;
  // Functions only. The command numbers and selector lists stay exported and have to: `rails.ts`
  // refuses `ESCAPE_RESET` **by number**, and `decodeReply` names what came back. A constant cannot be
  // sent; a request builder can.
  // A request builder is named `<command>Request` throughout this package, so the rule is that shape
  // and not "a name containing write": the command numbers stay exported and have to, since `rails.ts`
  // refuses `ESCAPE_RESET` by number, and so do the rails themselves, whose names begin with `assert`.
  // A constant cannot be sent and a refusal is what does the refusing; a builder is the sendable thing.
  const offered = Object.keys(barrel).filter(
    (name) => name.endsWith('Request') && /write|erase|escape/i.test(name),
  );
  assert.deepEqual(offered, [], 'the barrel offers a request builder for a command that writes');

  // **What this test cannot see, found by an independent review on 27 August 2026.** Its rule is a
  // name shape, so it catches a builder called `eraseFlashRequest` and not the **generic** encoder
  // called `encodeRequest`, which ends in `Request` and mentions none of write, erase or escape. That
  // encoder plus `ERASE_FLASH` and `address24` are all still exported, and together they rebuild the
  // same report the four hidden builders would have. So this is the same hole twice, and the first fix
  // addressed the instance rather than the class. The class level fix is the guarded transport, tested
  // below; this assertion stays because hiding the specific builders is still worth keeping.
  assert.equal(typeof barrel['encodeRequest'], 'function',
    'the generic encoder is still exported, which is why the guard below has to exist');

  // The control: the encoders do exist, and importing them by path still works, so this is a boundary
  // rather than a deletion. `remote.ts` reaches them that way and the rails still gate every send.
  const writes = (await import('../src/writes.ts')) as Record<string, unknown>;
  for (const name of ['writeFlashRequest', 'eraseFlashRequest', 'writeMiscRequest', 'escapeRequest']) {
    assert.equal(typeof writes[name], 'function', name);
    assert.equal(barrel[name], undefined, `${name} is not in the barrel`);
  }

  // **And the same hole a third time, found on 30 August 2026, section 224.** The guard below refuses
  // an unauthorised mutating report, and the way to authorise one was a **public method on the very
  // transport `openHarmony` hands back**, so `t.authoriseReport(r); await t.write(r)` reached the
  // device with writing disabled and an address outside the region. Hiding a builder and then leaving
  // the permission itself in the caller's hand is the same mistake at one remove, so the rule now
  // covers both: the barrel offers no way to send a mutating report **and** no way to permit one.
  // **A rail is excluded, and the exclusion is stated rather than assumed.** Everything in
  // `rails.ts` is named `assert...` and its contract is to throw, so `assertUnitIsPermitted` reads
  // like a permission and grants nothing: it is the refusal that a remote is not the recorded unit.
  // Narrowing the pattern this way rather than dropping `permit` from it keeps the rule aimed at
  // what hands an authorisation out. The control below is that the exclusion is visible: the rail is
  // exported, deliberately, and a test says so.
  const permits = Object.keys(barrel)
    .filter((name) => /authoris|permit|allowReport/i.test(name))
    .filter((name) => !name.startsWith('assert'));
  assert.deepEqual(permits, [], 'the barrel offers a way to authorise a report');
  assert.equal(typeof barrel['assertUnitIsPermitted'], 'function',
    'the unit rail is exported, which is why the filter above has to exclude it by name shape');

  // The control, same shape as the one above: the hatch exists and a deep import reaches it, so this
  // is a boundary and not a deletion. `remote.ts` uses it on every send.
  const authorise = (await import('../src/authorise.ts')) as Record<string, unknown>;
  assert.equal(typeof authorise['authoriseReport'], 'function');
  assert.equal(barrel['authoriseReport'], undefined);
});

test('the shipped build has writing disabled', () => {
  // Version 1 of the application is read only. If this ever fails in CI, the default changed.
  assert.equal(WRITES_ENABLED, false);
});

test('with writing disabled, every write path refuses even with everything else in order', () => {
  const base = CONFIG_REGION_BASE[12] as number;
  assert.throws(() => assertFlashWriteAllowed(IDEAL, base, 16), RailError);
  assert.throws(() => assertEraseAllowed(IDEAL, base), RailError);
  assert.throws(() => assertRamWriteAllowed(IDEAL, 0x100), RailError);
});

test('the SFR page is where the RAM write bound comes from, and it is the documented one', () => {
  // The number, on its own, in the shipped state. Everything about *whether* the bound fires needs the
  // flag on and is the subprocess test at the bottom: with writes disabled every call here refuses at
  // the first line, so asserting a throw would say nothing about the bound.
  //
  // `0xF40` is `SFR_PAGE_START` in `src/harmony/pic18/isa.py` and Microchip's own `p18f87j50.inc` is
  // the provenance for both. It is 0xF60 on the PIC18F4550 that arch 9 is, and the lower of the two is
  // what to bound against.
  assert.equal(SFR_PAGE_START, 0xf40);
  // The registers the bound exists for, so the reason survives a refactor of the message.
  for (const register of [0xfa6, 0xfa7, 0xff5, 0xff6, 0xff8]) {
    assert.ok(register >= SFR_PAGE_START, `0x${register.toString(16)} is inside the SFR page`);
  }
});

test('firmware is never written, and there is no argument that changes that', () => {
  // It takes no permission object on purpose: there is nothing to pass that would make it return.
  assert.throws(() => assertFirmwareWriteRefused(), RailError);
});

test('arch 14 has no write target on the bench', () => {
  // The spare unprogrammed remote is a Harmony One, so there is nothing on arch 14 that a mistake
  // could be made on. Reading arch 14 is unaffected, which is why this lives in the rails and not
  // in the transport.
  assert.deepEqual(ARCHITECTURES_WITH_A_WRITE_TARGET, [12]);
  assert.ok(!ARCHITECTURES_WITH_A_WRITE_TARGET.includes(14));
});

test('the writable range needs both a region and a ceiling, and a hole in either refuses', () => {
  // Arch 12 (Harmony One) is the only architecture with both, and it is also the only one in
  // `ARCHITECTURES_WITH_A_WRITE_TARGET`, which is not a coincidence: the tables are what a write
  // target means.
  assert.deepEqual(writableRange({ ...IDEAL, architecture: 12, versionBlock: blockFor(12) }), {
    start: 0x040000,
    end: 0x041000,
  });
  // **This asserted a range for arch 14 (Harmony 600 and 700) until section 139**, because
  // `writableRange` read a missing `WRITABLE_CEILING` entry as "no ceiling" while
  // `assertEraseAllowed` read the identical hole as a refusal. Section 88's rule is that a table
  // with a hole refuses, and arch 14 (Harmony 600 and 700) has a config region and no ceiling, so
  // the old answer was an unbounded write range for an architecture nothing has measured a ceiling
  // for. It has no write target either, so nothing could reach it; adding one would have.
  assert.throws(() => writableRange({ ...IDEAL, architecture: 14, versionBlock: blockFor(14) }), RailError);
  // And arch 9 (Harmony 525) has neither, so it refuses on the first of the two.
  assert.throws(() => writableRange({ ...IDEAL, architecture: 9, versionBlock: blockFor(9) }), RailError);
});

test('the two rails read the same table hole the same way', () => {
  // The defect was not either reading on its own, it was that they disagreed. So the claim to pin
  // is the agreement, over every architecture either table mentions plus the ones neither does.
  for (const architecture of [8, 9, 10, 12, 14]) {
    const write = (() => {
      try {
        writableRange({ ...IDEAL, architecture, versionBlock: blockFor(architecture) });
        return 'allowed';
      } catch {
        return 'refused';
      }
    })();
    const erase = (() => {
      try {
        eraseBoundsFor(architecture);
        return 'allowed';
      } catch {
        return 'refused';
      }
    })();
    assert.equal(write, erase, `architecture ${architecture}`);
  }
});

test('an erase refuses an architecture with no recorded block size', () => {
  // Unreachable through `assertEraseAllowed`, because `assertPermissionIsUsable` refuses everything
  // outside `ARCHITECTURES_WITH_A_WRITE_TARGET` first and that list is `[12]`, which has both
  // entries. The rail nobody can trigger is the rail nobody has tested, and `rails.test.ts` was
  // checking the table's shape in its place. The lookup is exported now so the refusal has a caller.
  assert.deepEqual(eraseBoundsFor(12), { block: 0x10000, ceiling: 0x3d0000 });
  for (const architecture of [8, 9, 10, 14]) {
    assert.throws(() => eraseBoundsFor(architecture), RailError, `architecture ${architecture}`);
  }
});

test('a config length that is missing or absurd does not produce a range', () => {
  // Otherwise a zero length would make the range empty and every write "outside" it, which reads
  // as a refusal for the wrong reason, or a negative one would make it inverted.
  for (const configLength of [0, -1, 1.5]) {
    assert.throws(() => writableRange({ ...IDEAL, configLength }), RailError);
  }
});

/**
 * The other half of the flag, in a subprocess.
 *
 * Turning writes on in this process would leave them on for every test in the file, and the point
 * of the tests above is that they run in the shipped state. A subprocess is the only honest way to
 * check both sides of a module level constant.
 */
function withWritesEnabled(script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const railsPath = join(here, '..', 'src', 'index.ts').replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `import * as rails from '${railsPath}';\n${script}`],
    { env: { ...process.env, HARMONY_ENABLE_WRITES: '1' }, encoding: 'utf8' },
  ).trim();
}

test('with writing enabled, the remaining conditions still each refuse on their own', () => {
  const output = withWritesEnabled(`
    ${IDEAL_SOURCE}
    const base = 0x040000;
    const refusals = [];
    const check = (name, permission, address, count) => {
      try {
        rails.assertFlashWriteAllowed(permission, address, count);
        refusals.push(name + ': ALLOWED');
      } catch (error) {
        // The error's own name, not a bare 'refused'. A bare catch cannot tell a RailError from a
        // TypeError out of a rail somebody broke, so every one of these rows read 'refused' either
        // way and the test passed while the rail did not work.
        refusals.push(name + ': refused by ' + error.constructor.name);
      }
    };
    check('flag on and everything in order', IDEAL, base, 16);
    check('another unit on the cable', {...IDEAL, identityBlock: IDEAL.another}, base, 16);
    // An identity carrying nothing per unit, which is what the field named the serial looks like on
    // every remote here: refused rather than matched, section 226.
    check('an unidentifiable unit', {...IDEAL, identityBlock: IDEAL.noIdentity}, base, 16);
    check('no verified dump', {...IDEAL, originalDumpVerified: false}, base, 16);
    // **Now a real comparison rather than a boolean**, section 225: the config claims skin 99 and
    // the remote reports 54, so the rail is the thing that notices. The row below it is the second
    // half of the same gate, two readings of one remote disagreeing about its architecture.
    check('intended version mismatch', {...IDEAL, intendedVersion: {...IDEAL.intendedVersion, SKIN: '99'}}, base, 16);
    check('a version field nobody can compare', {...IDEAL, intendedVersion: {...IDEAL.intendedVersion, CLIENTSOFTWARE: '2.7'}}, base, 16);
    check('a version block for another architecture', {...IDEAL, versionBlock: rails.encodeVersionBlock({architecture: 14})}, base, 16);
    check('a version block too short to be an identity', {...IDEAL, versionBlock: new Uint8Array(4)}, base, 16);
    check('architecture 14', {...IDEAL, architecture: 14}, 0x030000, 16);
    check('one byte below the region', IDEAL, base - 1, 16);
    check('running one byte past the end', IDEAL, base + IDEAL.configLength - 15, 16);
    check('the whole region exactly', IDEAL, base, IDEAL.configLength);
    console.log(JSON.stringify(refusals));
  `);
  assert.deepEqual(JSON.parse(output), [
    // The flag being on is necessary and not sufficient, which is the shape that matters: every
    // other condition still refuses by itself.
    'flag on and everything in order: ALLOWED',
    'another unit on the cable: refused by RailError',
    'an unidentifiable unit: refused by RailError',
    'no verified dump: refused by RailError',
    'intended version mismatch: refused by RailError',
    'a version field nobody can compare: refused by RailError',
    'a version block for another architecture: refused by RailError',
    'a version block too short to be an identity: refused by RailError',
    'architecture 14: refused by RailError',
    'one byte below the region: refused by RailError',
    'running one byte past the end: refused by RailError',
    'the whole region exactly: ALLOWED',
  ]);
});

test('with writing enabled, a RAM write still refuses an SFR address and a wrong architecture', () => {
  // **`writeRam` called itself volatile and that was an assumption about the address**, section 139.
  // The request carries a sixteen bit data address, and on the PIC18F87J50 bank 15 from `0xF40` up is
  // the special function registers: `EECON1` at `0xFA6`, `EECON2` at `0xFA7`, `TABLAT` at `0xFF5` and
  // `TBLPTR` at `0xFF6` to `0xFF8`, which together are a PIC18's self programming path. Whether the
  // firmware bounds the address is **unread**, which is why the rail does not depend on the answer.
  //
  // The rail also had no architecture check at all, so `targetIsTheSpareRemote` alone reached
  // `WRITE_MISC` on a Harmony 600 or a Harmony 525, whose selector 7 executors nobody has read.
  const output = withWritesEnabled(`
    ${IDEAL_SOURCE}
    const out = [];
    const check = (name, permission, address) => {
      try {
        rails.assertRamWriteAllowed(permission, address);
        out.push(name + ': ALLOWED');
      } catch (error) {
        out.push(name + ': refused by ' + error.constructor.name);
      }
    };
    check('an ordinary variable', IDEAL, 0x100);
    check('the last byte below the SFR page', IDEAL, 0xf3f);
    check('the first byte of the SFR page', IDEAL, 0xf40);
    check('EECON1', IDEAL, 0xfa6);
    check('EECON2', IDEAL, 0xfa7);
    check('TBLPTRU', IDEAL, 0xff8);
    check('a negative address', IDEAL, -1);
    check('not an integer', IDEAL, 1.5);
    check('a Harmony 600', {...IDEAL, architecture: 14}, 0x100);
    check('a Harmony 525', {...IDEAL, architecture: 9}, 0x100);
    check('no architecture at all', {...IDEAL, architecture: undefined}, 0x100);
    check('another unit on the cable', {...IDEAL, identityBlock: IDEAL.another}, 0x100);
    check('an unidentifiable unit', {...IDEAL, identityBlock: IDEAL.noIdentity}, 0x100);
    console.log(JSON.stringify(out));
  `);
  assert.deepEqual(JSON.parse(output), [
    // Exactly two rows are allowed, and they are the two that should be: the flag being on is
    // necessary and every other condition still refuses on its own.
    'an ordinary variable: ALLOWED',
    'the last byte below the SFR page: ALLOWED',
    'the first byte of the SFR page: refused by RailError',
    'EECON1: refused by RailError',
    'EECON2: refused by RailError',
    'TBLPTRU: refused by RailError',
    'a negative address: refused by RailError',
    'not an integer: refused by RailError',
    'a Harmony 600: refused by RailError',
    'a Harmony 525: refused by RailError',
    'no architecture at all: refused by RailError',
    'another unit on the cable: refused by RailError',
    'an unidentifiable unit: refused by RailError',
  ]);
});

test('with writing enabled, an erase must name a whole block inside the writable region', () => {
  // The rail got stricter, and this test is where that shows. It used to allow any address in the
  // config region, including 0x040fff, on the grounds that the block an erase destroys was
  // unknown. It is known now, `ERASE_BLOCK_SIZE`, so an unaligned address is refused: Logitech's
  // own client starts erasing at the first block boundary at or after the address, which means an
  // unaligned caller gets neither the erase it asked for nor an error.
  const output = withWritesEnabled(`
    ${IDEAL_SOURCE}
    const results = [];
    const cases = [
      ['the first block of the region', 0x040000],
      ['unaligned inside the region', 0x040fff],
      ['aligned, one block below the region', 0x030000],
      ['the last block below the ceiling', 0x3c0000],
      ['the block the stored firmware starts in', 0x3d0000],
      ['the nominal region top', 0x3f0000],
      ['the reset vector', 0x000000],
    ];
    for (const [name, address] of cases) {
      try { rails.assertEraseAllowed(IDEAL, address); results.push(name + ': ALLOWED'); }
      catch (error) { results.push(name + ': refused by ' + error.constructor.name); }
    }
    console.log(JSON.stringify(results));
  `);
  assert.deepEqual(JSON.parse(output), [
    'the first block of the region: ALLOWED',
    'unaligned inside the region: refused by RailError',
    'aligned, one block below the region: refused by RailError',
    'the last block below the ceiling: ALLOWED',
    // The two that the old rail would have allowed and that cost a remote: the stored application
    // firmware sits at 0x3D0000, inside the nominally writable region.
    'the block the stored firmware starts in: refused by RailError',
    'the nominal region top: refused by RailError',
    'the reset vector: refused by RailError',
  ]);
});

test('an architecture with no recorded block size is refused rather than loosely allowed', () => {
  // The failure mode worth naming: adding a read profile for a new architecture must not quietly
  // hand it the old address-only erase check. There is no fallback.
  assert.equal(ERASE_BLOCK_SIZE[14], undefined);
  assert.equal(WRITABLE_CEILING[14], undefined);
  assert.deepEqual(Object.keys(ERASE_BLOCK_SIZE), ['12']);
});

test('the session end escape is refused in the shipped state, and only for the right reason', () => {
  // Sections 97 and 99. This command writes no storage at all, which is exactly why it needs its
  // own rail rather than a share of the flash one: none of the flash conditions mean anything for
  // it, so reusing them would be a rail that reads strict and checks nothing relevant.
  assert.throws(
    () => assertSessionEndAllowed(
      { architecture: 12, identityBlock: THIS_UNIT, permittedUnit: THIS_UNIT }, 0x01),
    /read only/,
  );
});

test('with writing enabled, the session end escape refuses everything but itself', () => {
  const output = withWritesEnabled(`
    const spare12 = {
      architecture: 12,
      identityBlock: Uint8Array.from(${JSON.stringify([...THIS_UNIT])}),
      permittedUnit: Uint8Array.from(${JSON.stringify([...THIS_UNIT])}),
    };
    const another = Uint8Array.from(${JSON.stringify([...ANOTHER_UNIT])});
    const refusals = [];
    const check = (name, permission, sub) => {
      try {
        rails.assertSessionEndAllowed(permission, sub);
        refusals.push(name + ': ALLOWED');
      } catch (error) {
        // The error's own name, not a bare 'refused'. A bare catch cannot tell a RailError from a
        // TypeError out of a rail somebody broke, so every one of these rows read 'refused' either
        // way and the test passed while the rail did not work.
        refusals.push(name + ': refused by ' + error.constructor.name);
      }
    };
    check('arch 12 spare, sub-command 0x01', spare12, 0x01);
    check('arch 14 spare, sub-command 0x01', {...spare12, architecture: 14}, 0x01);
    check('the reset, 0x02', spare12, 0x02);
    check('the other reset, 0x03', spare12, 0x03);
    check('arch 14 only sub-command 0x05', {...spare12, architecture: 14}, 0x05);
    check('arch 9, whose escape nobody has read', {...spare12, architecture: 9}, 0x01);
    check('another unit on the cable', {...spare12, identityBlock: another}, 0x01);
    console.log(JSON.stringify(refusals));
  `);
  assert.deepEqual(JSON.parse(output), [
    // Both architectures whose escape has been read are allowed, because unlike a flash write this
    // has no write target to speak of: it changes one variable in a running remote.
    'arch 12 spare, sub-command 0x01: ALLOWED',
    'arch 14 spare, sub-command 0x01: ALLOWED',
    // The reboots are refused by number, not merely unimplemented. An unimplemented thing gets
    // implemented by whoever needs it next; a refused one has to be argued for.
    'the reset, 0x02: refused by RailError',
    'the other reset, 0x03: refused by RailError',
    'arch 14 only sub-command 0x05: refused by RailError',
    // A read profile is not a write profile, which is the same rule the flash rails state.
    'arch 9, whose escape nobody has read: refused by RailError',
    // And the conservative condition that keeps this an experiment rather than a product decision.
    'another unit on the cable: refused by RailError',
  ]);
});

test('the deliberate hang door is shut in the shipped state', () => {
  // Sections 94 and 96. The ordinary refusal is not what this checks: this is the named door, which
  // exists because the refusal was bypassed twice by editing the source and editing it back.
  assert.throws(() => assertDeliberateHangAllowed(63), /HARMONY_ODD_READ_EXPERIMENT/);
});

test('with the hang door open, it still refuses an even count', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import * as rails from '${join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'index.ts').replaceAll('\\\\', '/')}';
       const out = [];
       for (const count of [63, 65, 1, 62, 64, 0]) {
         try { rails.assertDeliberateHangAllowed(count); out.push(count + ': allowed'); }
         catch (error) { out.push(count + ': refused by ' + error.constructor.name); }
       }
       console.log(JSON.stringify(out));`,
    ],
    { env: { ...process.env, HARMONY_ODD_READ_EXPERIMENT: '1' }, encoding: 'utf8' },
  ).trim();
  // An even count terminates, so it is not this entry point's business. Without that check the door
  // would quietly become a second ordinary read path, which is how a rail stops meaning anything.
  assert.deepEqual(JSON.parse(output), [
    '63: allowed',
    '65: allowed',
    '1: allowed',
    '62: refused by RailError',
    '64: refused by RailError',
    '0: refused by RailError',
  ]);
});

/**
 * The first write door, both sides of it.
 *
 * Two flags rather than one, and the test that matters is the middle case: writes enabled and the
 * door shut still refuses. Otherwise the second flag would be decoration, which is what a door
 * nobody has checked amounts to.
 */
function withEnv(extra: Record<string, string>, script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const railsPath = join(here, '..', 'src', 'index.ts').replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `import * as rails from '${railsPath}';\n${script}`],
    { env: { ...process.env, ...extra }, encoding: 'utf8' },
  ).trim();
}

const REFUSAL_REPORT = `
  try {
    rails.assertFirstWriteAllowed();
    process.stdout.write('allowed');
  } catch (error) {
    process.stdout.write('refused: ' + error.message);
  }
`;

test('the first write door refuses in the shipped state, naming the build flag first', () => {
  assert.equal(WRITES_ENABLED, false, 'this file must run in the shipped state');
  assert.throws(() => assertFirstWriteAllowed(), (error: unknown) => {
    assert.ok(error instanceof RailError);
    assert.match(error.message, /HARMONY_ENABLE_WRITES=1/);
    return true;
  });
});

test('with writes enabled the door is still shut, which is the point of having it', () => {
  const output = withEnv({ HARMONY_ENABLE_WRITES: '1' }, REFUSAL_REPORT);
  assert.match(output, /^refused: /);
  assert.match(output, /HARMONY_FIRST_WRITE=1/);
  // And it says why, because a refusal whose reason is elsewhere gets bypassed rather than read.
  assert.match(output, /restore route it relies on has never been exercised/);
});

test('with both flags set it allows, so the door is a door and not a wall', () => {
  const output = withEnv(
    { HARMONY_ENABLE_WRITES: '1', HARMONY_FIRST_WRITE: '1' },
    REFUSAL_REPORT,
  );
  assert.equal(output, 'allowed');
});

test('the door does not stand in for the rails, which still refuse everything else', () => {
  // The rule this checks is that the door is not a second copy of a rail: opening it must not make
  // an arch 14 write, an unaligned erase or a firmware address allowable. Section 175 and the
  // docstring on FIRST_WRITE both say so, and a test is what keeps it true.
  const output = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRST_WRITE: '1' }, `
    const refusals = [];
    const permission = { architecture: 14, configLength: 1024, originalDumpVerified: true,
                         intendedVersionMatches: true, targetIsTheSpareRemote: true };
    try { rails.assertFlashWriteAllowed(permission, 0x030000, 16); }
    catch (error) { refusals.push('arch14'); }
    const twelve = { ...permission, architecture: 12 };
    try { rails.assertEraseAllowed(twelve, 0x040001); }
    catch (error) { refusals.push('unaligned'); }
    try { rails.assertEraseAllowed(twelve, 0x3d0000); }
    catch (error) { refusals.push('firmware'); }
    try { rails.assertFlashWriteAllowed({ ...twelve, targetIsTheSpareRemote: false }, 0x040000, 16); }
    catch (error) { refusals.push('not-the-spare'); }
    process.stdout.write(refusals.join(','));
  `);
  assert.equal(output, 'arch14,unaligned,firmware,not-the-spare');
});

test('a mutating report cannot reach a remote without a rail behind it', async () => {
  /*
   * The class level fix for the bypass named in the test above.
   *
   * The rails guard `HarmonyRemote`'s methods. They cannot guard a caller who builds a report itself
   * and hands it to a transport, and the barrel exports everything needed to do that. Hiding the
   * encoder is the wrong answer, because a test that builds a raw erase and sends it to a **fake**
   * transport is useful and should keep working. What must not happen is such a report reaching real
   * hardware, so the check lives on the transport `openHarmony` returns.
   */
  const sent: Uint8Array[] = [];
  const inner: Transport = {
    async write(report) { sent.push(Uint8Array.from(report)); },
    async read() { return undefined; },
    async close() {},
  };
  const guarded = guardMutations(inner);

  // **The surface of the returned object is the rail, and this is the assertion the barrel check
  // cannot make.** The bypass of 30 August 2026 was a public `authoriseReport` **method** on this very
  // object, so it was reachable by every caller of `openHarmony` while every exported name looked
  // innocent. A name check on the barrel would not have seen it; enumerating what the object offers
  // does. Three methods, and a fourth is a hole until somebody proves otherwise.
  const surface = new Set<string>();
  for (let o: object | null = guarded; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
    for (const name of Object.getOwnPropertyNames(o)) surface.add(name);
  }
  assert.deepEqual([...surface].sort(), ['close', 'read', 'write'],
    'the guarded transport offers something other than the three transport methods');

  // **The exact bypass, refused.** An erase outside the config region, with writing disabled.
  await assert.rejects(() => guarded.write(encodeRequest(ERASE_FLASH, address24(0x000000))),
    TransportError, 'a raw erase reached the transport');

  // Not too strict: a read needs no authorisation, or every read path would break.
  await guarded.write(readFlashRequest(0x040000, 32));

  // An authorised report goes through, and the authorisation is single use, so a stray second
  // report cannot ride on the first one's permission.
  const erase = encodeRequest(ERASE_FLASH, address24(0x040000));
  authoriseReport(guarded, erase);
  await guarded.write(erase);
  await assert.rejects(() => guarded.write(erase), TransportError, 'authorisation was reusable');

  // And it is for those exact bytes, so an address swapped in after the rail ran is refused.
  authoriseReport(guarded, encodeRequest(ERASE_FLASH, address24(0x040000)));
  await assert.rejects(() => guarded.write(encodeRequest(ERASE_FLASH, address24(0x3f0000))),
    TransportError, 'the authorised bytes were not checked');

  // **The allow list direction.** An unclassified command is refused rather than sent, which is the
  // lesson from `WRITABLE_CEILING`'s missing entry reading as "no ceiling".
  await assert.rejects(() => guarded.write(encodeRequest(0x20)), TransportError,
    'an unclassified command was sent');

  // Exactly two reports got through: the read and the authorised erase.
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map((r) => (r[0] as number) & 0xf0), [READ_FLASH, ERASE_FLASH]);
});

test('the only function returning a path to real hardware returns a guarded transport', async () => {
  /*
   * Asserted against the source, because the alternative needs a remote plugged in. `openHarmony` is
   * the one function in this package that hands back a transport connected to a device, so it is the
   * one that has to wrap. A deep import of `transportOver` is not covered and does not need to be:
   * it takes a HID handle the caller had to open itself.
   */
  const source = await readFile(new URL('../src/transport.ts', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('export async function openHarmony'));
  assert.match(body, /return guardMutations\(transportOver\(/,
    'openHarmony must return a guarded transport');
});
