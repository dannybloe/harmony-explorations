/**
 * `newReadFolder` never hands back a folder that already exists.
 *
 * The lab's read folders are named to the minute, and the Touch scripts made theirs with `recursive: true`,
 * so a second read of the same kind in the same minute wrote into the first one's folder: the
 * `getconfighash` read after the sync that sent the Touch its own six documents back replaced the read taken
 * before it. The before read was
 * not lost as a fact only because it had already been compared byte for byte with an earlier read. These
 * tests make the same two reads in one minute against a scratch lab and assert both survive.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'node:test';

import { newReadFolder } from '../src/index.ts';

const MINUTE = new Date('2026-11-05T14:18:30Z');

test('two reads of one kind in one minute get two folders, and the first keeps what it held', () => {
  const lab = mkdtempSync(join(tmpdir(), 'lab-'));
  try {
    const first = newReadFolder(lab, 'touch-confighash', MINUTE);
    writeFileSync(join(first, 'answer.txt'), 'before');
    const second = newReadFolder(lab, 'touch-confighash', new Date('2026-11-05T14:18:59Z'));
    writeFileSync(join(second, 'answer.txt'), 'after');
    assert.equal(basename(first), '20261105T1418Z-touch-confighash');
    assert.equal(basename(second), '20261105T1418Z-touch-confighash-2');
    assert.equal(readFileSync(join(first, 'answer.txt'), 'utf8'), 'before');
    assert.equal(newReadFolder(lab, 'touch-confighash', MINUTE).endsWith('-3'), true);
    assert.equal(readdirSync(join(lab, 'reads')).length, 3);
  } finally {
    rmSync(lab, { recursive: true, force: true });
  }
});

test('another kind or another minute keeps the plain name', () => {
  const lab = mkdtempSync(join(tmpdir(), 'lab-'));
  try {
    newReadFolder(lab, 'touch-confighash', MINUTE);
    assert.equal(basename(newReadFolder(lab, 'touch-sync-set', MINUTE)), '20261105T1418Z-touch-sync-set');
    assert.equal(basename(newReadFolder(lab, 'touch-confighash', new Date('2026-11-05T14:19:00Z'))), '20261105T1419Z-touch-confighash');
  } finally {
    rmSync(lab, { recursive: true, force: true });
  }
});
