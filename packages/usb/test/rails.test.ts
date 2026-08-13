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

import {
  ARCHITECTURES_WITH_A_WRITE_TARGET,
  CONFIG_REGION_BASE,
  ERASE_BLOCK_SIZE,
  RailError,
  WRITABLE_CEILING,
  WRITES_ENABLED,
  assertEraseAllowed,
  assertFirmwareWriteRefused,
  assertFlashWriteAllowed,
  assertDeliberateHangAllowed,
  assertRamWriteAllowed,
  assertSessionEndAllowed,
  writableRange,
} from '../src/index.ts';

/** Everything a caller could possibly have in order, on the architecture that has a target. */
const IDEAL = {
  architecture: 12,
  configLength: 0x1000,
  originalDumpVerified: true,
  intendedVersionMatches: true,
  targetIsTheSpareRemote: true,
} as const;

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

  // The control: the encoders do exist, and importing them by path still works, so this is a boundary
  // rather than a deletion. `remote.ts` reaches them that way and the rails still gate every send.
  const writes = (await import('../src/writes.ts')) as Record<string, unknown>;
  for (const name of ['writeFlashRequest', 'eraseFlashRequest', 'writeMiscRequest', 'escapeRequest']) {
    assert.equal(typeof writes[name], 'function', name);
    assert.equal(barrel[name], undefined, `${name} is not in the barrel`);
  }
});

test('the shipped build has writing disabled', () => {
  // Version 1 of the application is read only. If this ever fails in CI, the default changed.
  assert.equal(WRITES_ENABLED, false);
});

test('with writing disabled, every write path refuses even with everything else in order', () => {
  const base = CONFIG_REGION_BASE[12] as number;
  assert.throws(() => assertFlashWriteAllowed(IDEAL, base, 16), RailError);
  assert.throws(() => assertEraseAllowed(IDEAL, base), RailError);
  assert.throws(() => assertRamWriteAllowed(IDEAL), RailError);
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

test('the writable range is the config region of the connected architecture', () => {
  assert.deepEqual(writableRange({ ...IDEAL, architecture: 12 }), {
    start: 0x040000,
    end: 0x041000,
  });
  assert.deepEqual(writableRange({ ...IDEAL, architecture: 14 }), {
    start: 0x030000,
    end: 0x031000,
  });
  assert.throws(() => writableRange({ ...IDEAL, architecture: 9 }), RailError);
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
    const IDEAL = ${JSON.stringify(IDEAL)};
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
    check('not the spare remote', {...IDEAL, targetIsTheSpareRemote: false}, base, 16);
    check('no verified dump', {...IDEAL, originalDumpVerified: false}, base, 16);
    check('intended version mismatch', {...IDEAL, intendedVersionMatches: false}, base, 16);
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
    'not the spare remote: refused by RailError',
    'no verified dump: refused by RailError',
    'intended version mismatch: refused by RailError',
    'architecture 14: refused by RailError',
    'one byte below the region: refused by RailError',
    'running one byte past the end: refused by RailError',
    'the whole region exactly: ALLOWED',
  ]);
});

test('with writing enabled, an erase must name a whole block inside the writable region', () => {
  // The rail got stricter, and this test is where that shows. It used to allow any address in the
  // config region, including 0x040fff, on the grounds that the block an erase destroys was
  // unknown. It is known now, `ERASE_BLOCK_SIZE`, so an unaligned address is refused: Logitech's
  // own client starts erasing at the first block boundary at or after the address, which means an
  // unaligned caller gets neither the erase it asked for nor an error.
  const output = withWritesEnabled(`
    const IDEAL = ${JSON.stringify(IDEAL)};
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
    () => assertSessionEndAllowed({ architecture: 12, targetIsTheSpareRemote: true }, 0x01),
    /read only/,
  );
});

test('with writing enabled, the session end escape refuses everything but itself', () => {
  const output = withWritesEnabled(`
    const spare12 = { architecture: 12, targetIsTheSpareRemote: true };
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
    check('not the spare remote', {...spare12, targetIsTheSpareRemote: false}, 0x01);
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
    'not the spare remote: refused by RailError',
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
