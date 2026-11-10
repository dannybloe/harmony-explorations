/**
 * `docs/remote-requirements.md` is what the requirements and their statuses generate, decision 33: the document is
 * written by `bin/requirements.ts` from `@harmony/base/requirements` but for its introduction, so a status changed in
 * the data and not regenerated, or a document edited by hand, fails here with the command that fixes it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOCUMENT, introductionOf, requirementsDocument, run } from '../../bin/requirements.ts';

test('the committed document is what the data generates', () => {
  assert.deepEqual(run(false), []);
});

test('the control: a document whose generated part was edited by hand differs, and its introduction is kept', () => {
  // Without this the test above could pass by comparing a text with itself.
  const committed = readFileSync(DOCUMENT, 'utf8');
  const introduction = introductionOf(committed);
  assert.ok(introduction.length > 0, 'the introduction is found');
  const edited = committed.replace('| met |', '| open |');
  assert.notEqual(edited, committed, 'the document holds a met to edit');
  assert.notEqual(requirementsDocument(introductionOf(edited)), edited);
  assert.equal(requirementsDocument(introductionOf(edited)), committed);
});

test('a document without its introduction markers is refused, rather than written without one', () => {
  assert.throws(() => introductionOf('# a title\n\nno markers\n'), /no <!-- introduction -->/);
});
