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

import { load, require_, skipUnless } from '@harmony/lab';
import { HEADER_WINDOW, allChecksPass, decodePayload, parse, parseEzhex, payloadChecksum,
  payloadOf } from '../src/index.ts';

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
    // The fifth field, missed by the four field reading. It says which of the remote's images
    // the file is aimed at: 0 is the application, 4 safe mode, 3 boot and 1 test. Section 87.
    SOFTWARETYPE: '0',
  });
});

for (const name of EZHEX) {
  test(`${name}'s two splits agree`, skipUnless(name), () => {
    // The arithmetic split counts back from the end of the file; the structural one reads the
    // header's own terminator. They have no reason to land on the same byte unless both are
    // right, which is what makes this worth computing twice.
    const blob = load(name) as Uint8Array;
    const ez = parseEzhex(blob, name);
    assert.equal(ez.structuralSplit, blob.length - (ez.declaredSize as number));
    assert.equal(ez.lineEnding, 'crlf');
  });
}

/**
 * Byte for char and char for byte, so a text edit to the header leaves the payload alone.
 *
 * Neither of the platform's own converters can do this. `TextEncoder` only speaks UTF-8, so it
 * turns every payload byte above `0x7F` into two. And `TextDecoder('latin1')` is **not** Latin-1:
 * the label is an alias for windows-1252, which maps `0x80` to `0x20AC` and thirty odd others
 * elsewhere, so decoding and re-encoding a config through it corrupts the payload silently. That
 * cost a confusing failure here, and it is the same class of bug as reading a config as UTF-8.
 */
function latin1Text(data: Uint8Array): string {
  let out = '';
  for (let i = 0; i < data.length; i += 0x8000) {
    out += String.fromCharCode(...data.subarray(i, Math.min(i + 0x8000, data.length)));
  }
  return out;
}

function latin1Bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

test('a declared length that lies is caught rather than obeyed', skipUnless('h525_config'), () => {
  const blob = load('h525_config') as Uint8Array;
  const text = latin1Text(blob);
  const mutated = latin1Bytes(text.replace('<BINARYDATASIZE>78486<', '<BINARYDATASIZE>78480<'));
  const ez = parseEzhex(mutated, 'mutated');
  assert.equal(ez.checks['the_two_splits_agree'], false);
  assert.equal(ez.checks['payload_length_matches_declaration'], false);
  // And the payload is still right, because the structural split wins.
  assert.equal(ez.payload.length, 78486);
});

test('an absent declaration is not a failure', skipUnless('h525_config'), () => {
  // Ours used to report the absence as a failed check, which conflates "this file does not say"
  // with "this file is wrong". A firmware wrapper declares neither field and is perfectly valid.
  const text = latin1Text(load('h525_config') as Uint8Array);
  const stripped = text
    .replace(/<BINARYDATASIZE>\d+<\/BINARYDATASIZE>/, '')
    .replace(/<CHECKSUM>-?\d+<\/CHECKSUM>/, '');
  const ez = parseEzhex(latin1Bytes(stripped), 'stripped');
  assert.equal(ez.declaredSize, undefined);
  assert.equal(ez.declaredChecksum, undefined);
  assert.ok(allChecksPass(ez), JSON.stringify(ez.checks));
  assert.equal(ez.payload.length, 78486);
});

test('a negative checksum reads as the byte it narrows to', skipUnless('h525_config'), () => {
  // The consuming reader parses `<CHECKSUM>` as a signed 16 bit number and narrows it to a byte,
  // so a value above 127 may legitimately be written negative. No sample does, which is exactly
  // why a reader matching digits only would have failed silently on the first one that did.
  const text = latin1Text(load('h525_config') as Uint8Array);
  const rewritten = text.replace('<CHECKSUM>12</CHECKSUM>', '<CHECKSUM>-244</CHECKSUM>');
  assert.notEqual(rewritten, text);
  const ez = parseEzhex(latin1Bytes(rewritten), 'signed');
  assert.equal(ez.declaredChecksum, -244);
  assert.equal(ez.checks['checksum_matches_declaration'], true);
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

test('a header past the window is an error, not a file without one',
  skipUnless('h525_config'), () => {
    // The window is a literal 16 KiB and the largest header in the lab is 6851 bytes, a margin of
    // 2.4. Prepending a comment past it used to make the structural split, the declared size and
    // the declared checksum all undefined at once, report `bare-container` for a file that plainly
    // has a header, and then pass every check on a payload with a flipped byte, where the same
    // file unpadded correctly fails. Section 139.
    const original = require_('h525_config');
    assert.equal(original[0], 0x3c, 'the sample is XML headed');
    const padded = new Uint8Array(HEADER_WINDOW + original.length);
    const comment = latin1Bytes(`<!--${'x'.repeat(HEADER_WINDOW - 7)}-->`);
    padded.set(comment, 0);
    padded.set(original, comment.length);
    assert.throws(() => parseEzhex(padded, 'padded'), /INFORMATION/);
    assert.throws(() => decodePayload(padded, 'padded'), /INFORMATION/);
    // The control: the same file unpadded reads its header and verifies.
    const ez = parseEzhex(original, 'h525_config');
    assert.notEqual(ez.structuralSplit, undefined);
  });

test('an EZUp with more than one phase is refused rather than glued into one payload', () => {
  // Each `<PHASE>` states its own destination, so concatenating every `<DATA>` across them makes
  // one buffer out of several destinations and reports it as a single payload. Reading them apart
  // stays in `src/harmony/ezfile.py`. Nothing in the lab holds a `<DATA>` element at all, which is
  // why this went unnoticed, so both arms are exercised here by construction.
  const one = latin1Bytes('<EZUP><PHASE><DATA>4142</DATA><DATA>4344</DATA></PHASE></EZUP>');
  assert.deepEqual([...decodePayload(one, 'one').payload], [0x41, 0x42, 0x43, 0x44]);
  const two = latin1Bytes(
    '<EZUP><PHASE><DATA>4142</DATA></PHASE><PHASE><DATA>4344</DATA></PHASE></EZUP>');
  assert.throws(() => decodePayload(two, 'two'), /2 phases/);
});

