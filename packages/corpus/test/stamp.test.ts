/**
 * The stamp every write puts on a configuration, todo-compile-650 1.3, and the rule that keeps a
 * rerun of a stopped write able to recognise its own half written blocks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, trailerChecksum } from '@harmony/codec';
import { require_, skipUnless } from '@harmony/lab';

import { StampError, stampForWrite, stoppedAfterErase } from '../src/stamp.ts';

// Built from local fields, since the stamp is the saver's wall clock and reads back zone free.
const WHEN = new Date(2026, 9, 7, 9, 30, 15);

test('a write stamps the build timestamp with the moment of writing, and the result checks out',
  skipUnless('h650_panasonic_config'), () => {
    const original = require_('h650_panasonic_config');
    const { bytes, at } = stampForWrite(original, WHEN);
    assert.equal(at, '2026-10-07T09:30:15');
    const stamped = parse(bytes);
    assert.equal(stamped.builtAt, at);
    assert.notEqual(parse(original).builtAt, at, 'the fixture must not already carry this stamp');
    assert.equal(stamped.trailerChecksum, trailerChecksum(bytes));
    assert.equal(bytes.length, original.length, 'a stamp is a same length edit');
  });

test('a damaged file is refused rather than stamped, since the stamp would recompute its checksum',
  skipUnless('h650_panasonic_config'), () => {
    const damaged = Uint8Array.from(require_('h650_panasonic_config'));
    damaged[0x200] = damaged[0x200]! ^ 0x01;
    assert.throws(() => stampForWrite(damaged, WHEN), StampError);
  });

test('only a run that erased and never read its configuration back makes the next run reuse its stamp',
  () => {
    const head = '# write-config.ts --config x.bin --dump h650_base --commit\nstamped 2026-10-07T09:30:15\n';
    const erased = `${head}erasing 0x30000\nerased, and the block reads back as all ones\n`;
    assert.equal(stoppedAfterErase(erased), true);
    assert.equal(stoppedAfterErase(`${erased}the whole configuration reads back byte for byte `
      + 'identical to the file.\n'), false);
    assert.equal(stoppedAfterErase(`${head}dry run: nothing was written.\n`), false);
    assert.equal(stoppedAfterErase(`${head}reading 0x30000 off the remote to compare\n`), false);
  });
