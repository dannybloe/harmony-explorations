/**
 * `writeConfiguration`, the configuration write for the compiled families as a function an application calls,
 * against `FakeClassicRemote` with the rails real.
 *
 * **What this holds.** The sequence `bin/write-config.ts` ran in its own body before the write went into the library, now the library's:
 * which commands reach the remote and in what order, where each rail refuses relative to them, and that every
 * refusal the script met is met by the function, before anything changes the remote. The fake asserts the real
 * rail behind each command that changes a remote, so a write that gets past the first door here also built a
 * permission the rails accept.
 *
 * **Two halves.** The shipped state, the flags unset, in this process: the dry run and every refusal, the first
 * write door among them. And the writes themselves, each in a process of its own with `HARMONY_ENABLE_WRITES=1`
 * and `HARMONY_FIRST_WRITE=1`, since the rails read the flags once when they load; the remote in that process is
 * the fake and nothing else, `write-config-run.ts`.
 *
 * **Width.** The Harmony One, arch 12, and the Harmony 885, arch 8, the two whose write ends differ most: the
 * 885's drop is required and its install status is read on either side of the erase. The 600, 650 and 700 run the
 * same sequence with the arch 14 lines, which no test here drives. The configurations are lab samples, so these
 * skip without the lab; none of this has met a remote, and the bench procedures stay the script's.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { skipUnless } from '@harmony/lab';

import { stoppedAfterErase } from '../../src/stamp.ts';
import { CONFIG_WRITE_MODELS, CONFIG_WRITE_UNITS } from '../../src/write.ts';
import { runWrite, type WriteRun, type WriteScenario } from './write-config-run.ts';
import { proves } from '@harmony/testkit/proof';

const ONE = 'one_spare_20260830';
const H885 = 'h885_a_config';
const H650 = 'h650_panasonic_config';

/** The fake's calls that change a remote, which a run in the shipped state must never reach. */
const CHANGES = /^(eraseFlash|writeFlash|invalidateCachedRegions|resetDevice|saveStamped)/;
const changes = (r: WriteRun): string[] => r.calls.filter((c) => CHANGES.test(c));

/** One run in a process of its own with the two write flags set; the remote is the fake. */
function withFlags(scenario: WriteScenario): WriteRun {
  const script = fileURLToPath(new URL('./write-config-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_FIRST_WRITE: '1' },
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return JSON.parse(out) as WriteRun;
}

describe('the units and models are the library\'s, and hold what the script\'s table held', () => {
  it('holds every unit with the name and the model `write-config.ts`\'s table gave it at 24590a98, and no other', () => {
    // Copied by hand from `TARGETS` in `packages/corpus/bin/write-config.ts` as it stood at 24590a98, the commit
    // before the write moved into the library, so a change to the list is a change to this test and is visible in its diff.
    assert.deepEqual(CONFIG_WRITE_UNITS, {
      h885_a: { name: 'the Harmony 885 unit A', model: 'Harmony 885' },
      h885_b: { name: 'the Harmony 885 unit B', model: 'Harmony 885' },
      one_spare: { name: 'the spare Harmony One', model: 'Harmony One' },
      h650: { name: 'the Harmony 650', model: 'Harmony 650' },
      h600: { name: 'the Harmony 600', model: 'Harmony 600' },
      h700: { name: 'the Harmony 700', model: 'Harmony 700' },
    });
  });

  it('holds each model\'s architecture, builds, required drop and install status address as that table did', () => {
    const drop = 'on the Harmony 885 the cache drop moves every lookup to the built in '
      + 'configuration until the restart, and the firmware runs from the same flash part, so without it the '
      + 'remote can read a block between its erase and its write';
    assert.deepEqual(CONFIG_WRITE_MODELS, {
      'Harmony 885': { architecture: 8, sequenceReadOn: ['4.4'], dropRequired: drop, installStatusAt: 0x100 },
      'Harmony One': { architecture: 12, sequenceReadOn: ['3.4'] },
      'Harmony 650': { architecture: 14, sequenceReadOn: ['0.2'] },
      'Harmony 600': { architecture: 14, sequenceReadOn: ['0.2'] },
      'Harmony 700': { architecture: 14, sequenceReadOn: ['2.8'] },
    });
  });

  it('refuses a label outside the list before it stamps, checks or opens anything', skipUnless(ONE), async () => {
    const run = await runWrite({ sample: ONE, architecture: 12, label: 'everyday_one' });
    assert.equal(run.error?.name, 'ConfigWriteRefusal');
    assert.match(run.error!.message, /^everyday_one is not a unit this may write: the units are the library's, h885_a, h885_b, one_spare, h650, h600, h700/);
    assert.equal(run.opened, false);
    assert.deepEqual(run.lines, []);
    // The control: a label on the list with the same everything opens the remote.
    assert.equal((await runWrite({ sample: ONE, architecture: 12, label: 'one_spare' })).opened, true);
  });

  it('refuses a label that names an inherited property rather than a unit', skipUnless(ONE), async () => {
    const run = await runWrite({ sample: ONE, architecture: 12, label: 'constructor' });
    assert.match(run.error?.message ?? '', /^constructor is not a unit this may write/);
    assert.equal(run.opened, false);
  });
});

describe('the shipped state, the flags unset', () => {
  it('a dry run reads the unit and every block it would change, and sends nothing that changes the remote', skipUnless(ONE), async () => {
    const run = await runWrite({ sample: ONE, architecture: 12 });
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.outcome?.outcome, 'dry run');
    assert.equal(run.outcome?.unit, 'the spare Harmony One');
    assert.equal(run.outcome?.firmware, '3.4');
    assert.ok((run.outcome?.blocks.length ?? 0) > 0, 'the stamp changes at least one block');
    assert.deepEqual(changes(run), []);
    assert.deepEqual(run.calls, ['drainLeftovers', 'getVersion', 'readUnitIdentity', 'readFlash', 'close']);
    assert.ok(run.unchanged);
    assert.match(run.lines[0]!, /^stamped 2026-10-07T09:30:15: /);
    assert.ok(run.lines.some((l) => /^every block matches r byte for byte/.test(l)));
    assert.match(run.lines.at(-1)!, /^dry run: nothing was written/);
  });

  it('a commit is refused by the first write door after every read, before the stamp is saved or anything is sent', skipUnless(ONE), async () => {
    const run = await runWrite({ sample: ONE, architecture: 12, commit: true });
    assert.equal(run.error?.name, 'RailError');
    assert.match(run.error!.message, /HARMONY_ENABLE_WRITES=1/);
    assert.deepEqual(changes(run), []);
    assert.ok(run.closed, 'the remote is closed after a refusal');
    assert.ok(run.unchanged);
  });

  it('refuses a damaged configuration, a damaged one it would stamp, and a region read too short, before it opens the remote', skipUnless(ONE), async () => {
    const damaged = await runWrite({ sample: ONE, architecture: 12, stamp: 'as-is', configFlip: 0x200 });
    assert.equal(damaged.error?.name, 'ConfigWriteRefusal');
    assert.match(damaged.error!.message, /^x\.bin states checksum 0x[0-9a-f]+ and its bytes give 0x[0-9a-f]+: it is damaged/);
    assert.equal(damaged.opened, false);
    const stamped = await runWrite({ sample: ONE, architecture: 12, configFlip: 0x200 });
    assert.match(stamped.error!.message, /It would also be refused by the remote at boot$/);
    assert.equal(stamped.opened, false);
    const short = await runWrite({ sample: ONE, architecture: 12, regionShort: true });
    assert.match(short.error!.message, /^the config is \d+ bytes and r covers \d+: the dump has to reach/);
    assert.equal(short.opened, false);
    // The control: the same configuration undamaged opens the remote.
    assert.equal((await runWrite({ sample: ONE, architecture: 12, stamp: 'as-is', regionFlip: 0x200 })).opened, true);
  });

  it('chooses the unit by what the remote reports, and refuses before the identity is read when none fits', skipUnless(ONE), async () => {
    const arch = await runWrite({ sample: ONE, architecture: 12, label: 'h650' });
    assert.equal(arch.error?.message, 'architecture 12 has no unit this may write to (14: the Harmony 650)');
    const region = await runWrite({ sample: ONE, architecture: 12, regionName: 'someone-else' });
    assert.match(region.error!.message, /^someone-else is not one of the region reads of an architecture 12 unit \(the spare Harmony One: r\)/);
    for (const run of [arch, region]) {
      assert.deepEqual(run.calls, ['drainLeftovers', 'getVersion', 'close'], 'the version and nothing after it');
    }
  });

  it('refuses a commit on a build whose drop and restart nobody read, and a unit with no record, before reading its identity', skipUnless(ONE), async () => {
    const build = await runWrite({ sample: ONE, architecture: 12, firmware: 0x33, commit: true });
    assert.match(build.error!.message, /^the spare Harmony One reports firmware 3\.3, and the cache drop and the restart this sends have been read in build 3\.4 only/);
    const record = await runWrite({ sample: ONE, architecture: 12, recorded: false });
    assert.match(record.error!.message, /^the lab has no recorded identity for one_spare, .* Write it to units\/one_spare\.txt$/);
    for (const run of [build, record]) assert.ok(!run.calls.includes('readUnitIdentity'));
    // The control: the same build without a commit is a dry run, since only a commit sends the two commands.
    assert.equal((await runWrite({ sample: ONE, architecture: 12, firmware: 0x33 })).outcome?.outcome, 'dry run');
  });

  it('refuses another unit on the cable at its identity block, before any block is read', skipUnless(ONE), async () => {
    proves(63, ['harmony-one'], ['docs/test-notes/harmony-one.md#telling-the-two-ones-apart']);
    proves(63, ['harmony-650'], ['docs/test-notes/harmony-650.md#the-unit']);
    proves(63, ['harmony-700'], ['docs/test-notes/harmony-700.md#what-was-sent-to-the-unit']);
    proves(63, ['harmony-885'], ['docs/test-notes/harmony-885.md#7-november-2026-unit-as-whole-flash-and-the-first-write-to-a-harmony-885']);
    const run = await runWrite({ sample: ONE, architecture: 12, onCable: 2 });
    assert.equal(run.error?.name, 'RailError');
    assert.deepEqual(run.calls, ['drainLeftovers', 'getVersion', 'readUnitIdentity', 'close']);
  });

  it('refuses a remote that does not hold the region read, before any erase, and says what it found', skipUnless(ONE), async () => {
    const run = await runWrite({ sample: ONE, architecture: 12, remoteHolds: 'other' });
    assert.match(run.error!.message, /^the remote and r differ at 0x[0-9a-f]+: .* Take a fresh region read\.$/);
    assert.deepEqual(changes(run), []);
  });

  it('writes nothing when the configuration is the region read, and refuses a control on a remote that does not hold it', skipUnless(ONE), async () => {
    const same = await runWrite({ sample: ONE, architecture: 12, stamp: 'as-is' });
    assert.equal(same.outcome?.outcome, 'nothing to write');
    assert.equal(same.lines.at(-1), 'the config is byte identical to the dump: there is nothing to write');
    const drop = await runWrite({ sample: ONE, architecture: 12, stamp: 'as-is', regionFlip: 0x200, only: 'drop' });
    assert.match(drop.error!.message, /^--drop-only wants a remote that already holds x\.bin, and 1 block\(s\) differ from r/);
  });

  it('on a Harmony 885 refuses the write without the drop before the identity is read', skipUnless(H885), async () => {
    const run = await runWrite({ sample: H885, architecture: 8, invalidate: false });
    assert.match(run.error!.message, /^--no-invalidate is refused for the Harmony 885 unit A: on the Harmony 885 the cache drop/);
    assert.deepEqual(run.calls, ['drainLeftovers', 'getVersion', 'close']);
  });

  it('on a Harmony 885 reads the install status before the first erase, in a dry run too, and refuses one that is set', skipUnless(H885), async () => {
    const clear = await runWrite({ sample: H885, architecture: 8 });
    assert.equal(clear.outcome?.outcome, 'dry run');
    assert.ok(clear.lines.includes('install status at data 0x100 before the first erase: 0 (0x101 holds 0)'));
    const set = await runWrite({ sample: H885, architecture: 8, ram: { 0x100: 2 } });
    assert.match(set.error!.message, /^the staged install status at data 0x100 reads 2, .* Nothing was erased or written/);
    assert.deepEqual(changes(set), []);
    assert.deepEqual(set.calls.slice(-3), ['readRam 0x100', 'readRam 0x101', 'close']);
  });
});

describe('the writes, each in a process with the two flags set and the fake as the only remote', () => {
  it('a Harmony One: the stamp saved, the drop, each block written and read back, the whole read back, the restart', skipUnless(ONE), () => {
    proves(5, ['harmony-one'], ['docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it']);
    const run = withFlags({ sample: ONE, architecture: 12, commit: true });
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.outcome?.outcome, 'written');
    assert.equal(run.outcome?.restarted, true);
    assert.ok(run.holdsTheConfig, 'the remote holds the stamped configuration');
    const order = run.calls.filter((c) => CHANGES.test(c) || c === 'readUnitIdentity' || c === 'close')
      .map((c) => c.split(' ')[0]);
    const erases = order.filter((c) => c === 'eraseFlash').length;
    assert.equal(erases, run.outcome?.blocks.length);
    assert.deepEqual(order, [
      'readUnitIdentity', 'saveStamped', 'invalidateCachedRegions',
      ...Array.from({ length: erases }, () => ['eraseFlash', 'writeFlash']).flat(),
      'resetDevice', 'close',
    ]);
    // Every erase is read around and the whole configuration is read back before the restart.
    assert.equal(run.calls.at(-3), 'readFlash');
    assert.deepEqual(run.pastTheErase, Array.from({ length: erases }, () => [true, false]).flat());
    assert.ok(run.lines.includes('the whole configuration reads back byte for byte identical to the file. A config we produced is on the remote.'));
    // The journal's two lines a rerun reads: this one finished, so a rerun stamps afresh.
    assert.equal(stoppedAfterErase(run.lines.join('\n')), false);
    assert.equal(stoppedAfterErase(run.lines.filter((l) => !l.includes('reads back byte for byte identical')).join('\n')), true,
      'the control: without its last read back the same account reads as a run that stopped after an erase');
  });

  it('a rerun after a stop past the erase writes the saved file, and takes an erased block as known content', skipUnless(ONE), () => {
    const run = withFlags({ sample: ONE, architecture: 12, stamp: 'resume', regionFlip: 0x200, remoteHolds: 'erased-first', commit: true });
    assert.equal(run.outcome?.outcome, 'written', run.error?.message);
    assert.match(run.lines[0]!, /^x\.bin\.write-20261007T093015000Z\.log erased flash and never read the configuration back/);
    assert.ok(run.lines.some((l) => /^0x40000 holds erased flash, so an earlier run erased it and wrote nothing/.test(l)));
    assert.ok(!run.calls.includes('saveStamped'), 'nothing was stamped, so nothing is saved');
    assert.ok(run.holdsTheConfig);
  });

  it('the two controls that leave a command out, the restart and the drop, each leave out only that one', skipUnless(ONE), () => {
    const noRestart = withFlags({ sample: ONE, architecture: 12, stamp: 'as-is', regionFlip: 0x200, commit: true, restart: false });
    assert.equal(noRestart.outcome?.outcome, 'written', noRestart.error?.message);
    assert.ok(!noRestart.calls.includes('resetDevice'));
    assert.ok(noRestart.calls.includes('invalidateCachedRegions'));
    const noDrop = withFlags({ sample: ONE, architecture: 12, stamp: 'as-is', regionFlip: 0x200, commit: true, invalidate: false });
    assert.equal(noDrop.outcome?.outcome, 'written', noDrop.error?.message);
    assert.ok(!noDrop.calls.includes('invalidateCachedRegions'));
    assert.ok(noDrop.calls.includes('resetDevice'));
    assert.ok(noRestart.holdsTheConfig && noDrop.holdsTheConfig);
  });

  it('the drop alone and the restart alone read the whole configuration first and erase nothing', skipUnless(ONE), () => {
    for (const only of ['drop', 'restart'] as const) {
      const run = withFlags({ sample: ONE, architecture: 12, stamp: 'as-is', remoteHolds: 'written', commit: true, only });
      assert.equal(run.outcome?.outcome, only === 'drop' ? 'dropped' : 'restarted', run.error?.message);
      assert.deepEqual(changes(run), [only === 'drop' ? 'invalidateCachedRegions' : 'resetDevice']);
      assert.ok(run.unchanged);
    }
  });

  it('a Harmony 650: the arch 14 drop, each block written and read back, the restart, and no install status read', skipUnless(H650), () => {
    proves(5, ['harmony-600'], ['docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit']);
    proves(5, ['harmony-650'], ['docs/test-notes/harmony-650.md#what-has-been-sent-to-this-unit']);
    proves(5, ['harmony-700'], ['docs/test-notes/harmony-700.md#what-was-sent-to-the-unit']);
    proves(59, ['harmony-650'], ['docs/test-notes/harmony-650.md#what-has-been-sent-to-this-unit']);
    proves(59, ['harmony-700'], ['docs/test-notes/harmony-700.md#the-configurations-run-on-it']);
    const run = withFlags({ sample: H650, architecture: 14, commit: true });
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.outcome?.outcome, 'written');
    assert.equal(run.outcome?.unit, 'the Harmony 650');
    assert.equal(run.outcome?.firmware, '0.2');
    assert.ok(run.holdsTheConfig);
    assert.ok(run.lines.some((l) => l.startsWith('arch 14: the first erase is ')), 'the arch 14 account of the drop');
    const order = run.calls.filter((c) => CHANGES.test(c)).map((c) => c.split(' ')[0]);
    const erases = order.filter((c) => c === 'eraseFlash').length;
    assert.equal(erases, run.outcome?.blocks.length);
    assert.deepEqual(order, [
      'saveStamped', 'invalidateCachedRegions',
      ...Array.from({ length: erases }, () => ['eraseFlash', 'writeFlash']).flat(),
      'resetDevice',
    ]);
    assert.ok(!run.calls.some((c) => c.startsWith('readRam')), 'the install status is the 885\'s alone');
  });

  it('a Harmony 885: the status read before the first erase and before the restart, the drop and the restart its own', skipUnless(H885), () => {
    proves(5, ['harmony-885'], ['docs/test-notes/harmony-885.md#7-november-2026-the-first-whole-configuration-unit-bs-own-restarted']);
    proves(59, ['harmony-885'], ['docs/test-notes/harmony-885.md#7-november-2026-the-first-whole-configuration-unit-bs-own-restarted']);
    const run = withFlags({ sample: H885, architecture: 8, commit: true });
    assert.equal(run.outcome?.outcome, 'written', run.error?.message);
    assert.ok(run.holdsTheConfig);
    const first = run.calls.indexOf('readRam 0x100');
    const last = run.calls.lastIndexOf('readRam 0x100');
    assert.ok(first < run.calls.indexOf('invalidateCachedRegions') && first < run.calls.findIndex((c) => c.startsWith('eraseFlash')));
    assert.deepEqual(run.calls.slice(last), ['readRam 0x100', 'readRam 0x101', 'resetDevice', 'close']);
    assert.ok(run.lines.some((l) => l.startsWith('arch 8: from the drop until the restart')));
  });

  it('a Harmony 885 whose install status is set after the erase keeps the written configuration and withholds the restart', skipUnless(H885), () => {
    const run = withFlags({ sample: H885, architecture: 8, commit: true, ramAfterErase: { 0x100: 6 } });
    assert.match(run.error?.message ?? '', /^the configuration is written and reads back identical to the file, and the restart is withheld/);
    assert.ok(!run.calls.includes('resetDevice'));
    assert.ok(run.holdsTheConfig);
    assert.ok(run.closed);
  });
});
