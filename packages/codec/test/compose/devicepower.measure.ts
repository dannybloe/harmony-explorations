/**
 * Measurements over the whole infrared archive that belong with `devicepower.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * how many of the archive's devices the power mapping takes, and each refusal by its reason.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, skipUnlessIrArchiveRelease, slow } from '@harmony/lab';
import { ComposeError, deviceDriving } from '../../src/node.ts';
import { catalogueDevicePower } from '../../src/build.ts';

/**
 * How much of the catalogue the mapping takes, over every record of the archive, and every refusal by
 * its reason. Exact counts, so a reader change or an archive change moves them in the diff.
 */
test('the mapping takes the power of 237169 of the archive\'s 278220 devices, and every refusal is counted by its reason',
  slow(skipUnlessIrArchiveRelease()), () => {
    const outcomes = new Map<string, number>();
    let several = 0;
    let held = 0;
    // The commonest shape among the devices refused for a wait: discrete, a power on with no wait in
    // it and a power off with one. A compile of one of these is the next calibration this needs.
    let waitInOffOnly = 0;
    const root = join(IR_ARCHIVE!, 'devices');
    // Folders only: Finder leaves a .DS_Store beside them, which is not a device.
    for (const slug of readdirSync(root, { withFileTypes: true }).filter((one) => one.isDirectory()).map((one) => one.name)) {
      for (const file of readdirSync(join(root, slug))) {
        if (file === 'index.json') continue;
        const driving = deviceDriving(JSON.parse(readFileSync(join(root, slug, file), 'utf8')));
        let outcome = 'accepted';
        try {
          // Any code will do: the mapping passes it through, and this counts shapes, not codes.
          const power = catalogueDevicePower(driving, () => 'G:X:(0x1)():3');
          if (power.powerOn.length > 1 || power.powerOff.length > 1) several += 1;
          if ([...power.powerOn, ...power.powerOff].some((step) => step.holdMs !== undefined)) held += 1;
        } catch (error) {
          assert.ok(error instanceof ComposeError, String(error));
          outcome = error.message.replace(/\d+ ms/, 'N ms').replace(/power (on|off|toggle) action holds/, 'action holds')
            .replace(/, .*/, '');
          const power = driving.power;
          const waits = (steps: readonly { kind: string }[] | undefined) => steps?.some((step) => step.kind === 'wait') === true;
          if (outcome === 'the catalogue\'s action holds a wait' && power?.type === 'discrete'
            && !waits(power.on) && waits(power.off)) waitInOffOnly += 1;
        }
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
      }
    }
    assert.deepEqual(Object.fromEntries(outcomes), {
      'accepted': 237169,
      // No power action at all, 36095 between them, which no compile here shows composed.
      'the catalogue states the power as absent': 35788,
      'the catalogue states the power as unknown': 304,
      'the catalogue states the power as none': 3,
      // An action this does not know how to compose, for want of a compile holding one. Of the 2994
      // refused for a wait, the commonest shape is asserted below as waitInOffOnly.
      'the catalogue\'s action holds a wait': 2994,
      'the catalogue\'s action holds a state': 66,
      'the catalogue\'s action holds a press held for an unstated time': 5,
      'the catalogue\'s power on is followed by a send': 89,
      'the catalogue\'s power on is followed by a wait': 2,
      // Statements that are incomplete or ambiguous.
      'a toggle device with no toggle action': 1325,
      'a discrete device with no power on action': 303,
      'a discrete device with no power off action': 17,
      'a toggle device that also states a power on or off action': 32,
      // Delays a configuration cannot state, counted where nothing above refused the device first.
      'the catalogue\'s power on delay of N ms is not a whole number of tenths of a second': 120,
      'the catalogue\'s inter device delay of N ms is not a whole number of tenths of a second': 3,
    });
    assert.equal([...outcomes.values()].reduce((sum, n) => sum + n, 0), 278220);
    assert.deepEqual({ several, held, waitInOffOnly }, { several: 2920, held: 2974, waitInOffOnly: 1655 });
  });
