/**
 * `writeFileFamilyConfiguration`, the file write for the Harmony 300 and 350 as a function an application calls,
 * `todo.md` 7.3.10, against `FakeFileRemote`.
 *
 * **What this holds**: the run that was `bin/write-file-config.ts`'s body until 7.3.10, around `writeFileConfig`,
 * whose own sequence `filewrite.test.ts` holds byte for byte. The container is judged before anything is opened,
 * and a container as a remote serves it gets its end marker back; the skin, the unit and what the remote holds
 * are judged on the reads alone, so a dry run refuses where a commit would; a dry run sends nothing but reads; a
 * commit in the shipped state meets the rail inside `writeFileConfig`; and with both flags the commit writes,
 * verifies and reboots, the caller's interrupt armed after the reads and before the first command that erases.
 * And the function is on the write subpath and on no other entry.
 *
 * **Width.** One family, the Harmony 300 and 350, which share the application and the protocol; the fake answers
 * as the 1.4 firmware reading says a remote does. None of this has met a remote.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { exportedNames } from './entries.ts';
import { runFileFamily, type FileFamilyRun, type FileFamilyScenario } from './file-family-run.ts';

/** The read path's four commands, ping, open, read and close: nothing that writes. */
const onlyReads = (sent: readonly string[]): boolean => sent.every((r) => ['ff 00', 'ff 01', 'ff 04', 'ff 07'].includes(r));

function withFlags(scenario: FileFamilyScenario): FileFamilyRun {
  const script = fileURLToPath(new URL('./file-family-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_FILE_WRITE: '1' },
    encoding: 'utf8',
  });
  return JSON.parse(out) as FileFamilyRun;
}

describe('the file write as a library function, in the shipped state', () => {
  it('a dry run reads the three files, judges them and says what a commit would send, sending nothing else', async () => {
    const run = await runFileFamily({});
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.result?.before, 'the backup');
    assert.equal(run.result?.written, undefined);
    assert.ok(onlyReads(run.sent) && !run.erased);
    assert.deepEqual(run.lines.slice(2, 4), ['/sys/guid matches units/h350.txt', 'the remote holds the backup']);
    assert.match(run.lines.at(-1)!, /^read only: nothing was sent that changes the remote\. With --commit, HARMONY_ENABLE_WRITES=1 \(not set\)/);
    assert.equal(run.onCommitAt, -1);
  });

  it('refuses bytes that are no container before the remote is opened, and puts the marker back on a container as read', async () => {
    const refused = await runFileFamily({ notAContainer: true });
    assert.equal(refused.error?.name, 'RailError');
    assert.match(refused.error!.message, /^x\.bin is not a whole configuration for this family: /);
    assert.equal(refused.opened, false);
    const asRead = await runFileFamily({ asRead: true });
    assert.equal(asRead.error, undefined, asRead.error?.message);
    assert.equal(asRead.result?.markerPutBack, true);
    assert.equal(asRead.result?.containerLength, 62 * 50 + 100);
    assert.match(asRead.lines[0]!, /^x\.bin is 3196 bytes, as a remote serves it: the four byte end marker is put back/);
  });

  it('refuses a remote stating another skin, another unit, and a configuration the caller holds no copy of, on the reads alone', async () => {
    const skin = await runFileFamily({ skin: 0x4f });
    assert.equal(skin.error?.message, 'the remote states skin 0x68, and a Harmony 350 states 0x4f: this is not the unit h350 names');
    const unit = await runFileFamily({ onCable: 2 });
    assert.match(unit.error!.message, /^refused: the remote on the cable is not the unit/);
    const unknown = await runFileFamily({ remoteHolds: 'unknown' });
    // 4000 bytes stored, which the remote serves four short, as it serves every configuration.
    assert.match(unknown.error!.message, /^refused: the remote holds a 3996 byte configuration that is neither the backup nor/);
    for (const run of [skin, unit, unknown]) {
      assert.equal(run.error?.name, 'RailError');
      assert.ok(run.opened && onlyReads(run.sent) && !run.erased);
    }
  });

  it('a commit in the shipped state meets the rail inside the write, after the interrupt is armed and before any erase', async () => {
    const run = await runFileFamily({ commit: true });
    assert.match(run.error?.message ?? '', /HARMONY_ENABLE_WRITES=1/);
    assert.ok(run.onCommitAt > 0, 'the caller was told a commit was starting');
    assert.ok(onlyReads(run.sent) && !run.erased);
  });
});

describe('the file write as a library function, with both flags set and the fake as the only remote', () => {
  it('writes, verifies and reboots, and arms the caller\'s interrupt after the reads and before anything that writes', () => {
    const run = withFlags({ commit: true });
    assert.equal(run.error, undefined, run.error?.message);
    assert.ok(run.flashHoldsIt && run.rebooted);
    assert.equal(run.result?.written?.checkAnswer, 'm');
    assert.match(run.lines.at(-1)!, /^verified: 3196 bytes read back identical, check answered m, reboot sent$/);
    assert.ok(onlyReads(run.sent.slice(0, run.onCommitAt)), 'nothing but reads before the interrupt is armed');
    // After it the write reads the three files again, its own judgement, and then the reset starts the write.
    const after = run.sent.slice(run.onCommitAt);
    const firstWrite = after.findIndex((r) => !onlyReads([r]));
    assert.ok(firstWrite > 0 && onlyReads(after.slice(0, firstWrite)));
    assert.equal(after[firstWrite], 'ff ff', 'the first command that is not a read is the file system reset');
  });

  it('sends no reboot without one, the control', () => {
    const run = withFlags({ commit: true, reboot: false });
    assert.ok(run.flashHoldsIt && !run.rebooted);
    assert.match(run.lines.at(-1)!, /, no reboot sent$/);
  });
});

it('is on the write subpath and on no other entry', async () => {
  const exported = await exportedNames();
  assert.deepEqual(exported.get('writeFileFamilyConfiguration'), ['./write']);
});
