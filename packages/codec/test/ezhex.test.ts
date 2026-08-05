/**
 * A config EZHex is self-verifying, and the application depends on that.
 *
 * The header states the payload length and a checksum, so the split between XML and payload is
 * checkable rather than guessed. `INTENDEDVERSION` matters more than it looks: it is what a
 * remote compares against before accepting a file, so it is the first of the write rails, and the
 * one the device enforces itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { allChecksPass, parse, parseEzhex, payloadChecksum, payloadOf } from '../src/index.ts';

/**
 * Every sample that arrived as an EZHex file, which is all ten configs.
 *
 * The two Harmony 700 configs were missing from the Python equivalent of this list, which had not
 * been extended when they joined the corpus. They verify like the rest, so the omission was a
 * coverage gap rather than a property of those files; `tests/test_ezfile.py` now includes them
 * too. Worth recording because it was found by porting rather than by reading: writing the list
 * out a second time is what made the absence visible.
 */
const EZHEX = [
  'h525_config',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'one_config',
  'one_config_unprogrammed',
  'h600_config',
  'h700_config',
  'h700_config_2',
];

for (const name of EZHEX) {
  test(`${name} verifies its own split`, skipUnless(name), () => {
    const ez = parseEzhex(load(name) as Uint8Array, name);
    for (const [check, ok] of Object.entries(ez.checks)) {
      assert.ok(ok, `${name} failed ${check}`);
    }
    assert.ok(allChecksPass(ez));
  });

  test(`${name} has a checksum that is an XOR seeded 0x69`, skipUnless(name), () => {
    // Recomputed independently of the header, then compared against the declared value.
    const ez = parseEzhex(load(name) as Uint8Array, name);
    assert.equal(payloadChecksum(ez.payload), ez.declaredChecksum);
  });

  test(`${name}'s payload is exactly the container`, skipUnless(name), () => {
    const ez = parseEzhex(load(name) as Uint8Array, name);
    const c = parse(ez.payload);
    assert.equal(c.blobOffset, 0, 'payload starts at the container');
    assert.equal(c.length, ez.payload.length);
  });

  test(`${name}'s declared protocol matches the architecture in slot 1`, skipUnless(name), () => {
    // Two unrelated statements of the same fact: the XML header Logitech's server wrote, and a
    // byte inside the binary the remote reads. This is the closure that makes "slot 1 states the
    // architecture" a finding rather than a guess, and it is worth restating here because the
    // header half of it lives in this module.
    const ez = parseEzhex(load(name) as Uint8Array, name);
    const c = parse(ez.payload);
    assert.equal(ez.intendedVersion.PROTOCOL, String(c.architecture));
  });
}

test('a flipped payload byte breaks the checksum', skipUnless('h525_config'), () => {
  // A checksum that cannot fail is not a check. The length check has to survive, or this would
  // only be showing that a mutated file is broken in some way.
  const blob = new Uint8Array(load('h525_config') as Uint8Array);
  blob[blob.length - 10] = (blob[blob.length - 10] as number) ^ 0x01;
  const ez = parseEzhex(blob, 'mutated');
  assert.equal(ez.checks['checksum_matches_declaration'], false);
  assert.equal(ez.checks['payload_length_matches_declaration'], true);
});

test('INTENDEDVERSION pins the target remote', skipUnless('h525_config'), () => {
  const ez = parseEzhex(load('h525_config') as Uint8Array, 'h525');
  assert.deepEqual(ez.intendedVersion, {
    PROTOCOL: '9',
    SKIN: '22',
    FLASH: '0xFF:0x12',
    BOARD: '2.5.0',
  });
});

test('payloadOf unwraps XML and passes a raw dump through', skipUnless('h525_config', 'h700_code'), () => {
  // The application gets configs both ways: a file someone kept, and a flash read off a remote.
  // One needs unwrapping and the other must not be touched, and telling them apart from the
  // content is the whole job of this function.
  const file = load('h525_config') as Uint8Array;
  const unwrapped = payloadOf(file, 'h525');
  assert.ok(unwrapped.length < file.length, 'the XML header was removed');
  assert.equal(parse(unwrapped).blobOffset, 0);

  const raw = load('h700_code') as Uint8Array;
  assert.equal(payloadOf(raw, 'raw').length, raw.length, 'a raw image is passed through');
});
