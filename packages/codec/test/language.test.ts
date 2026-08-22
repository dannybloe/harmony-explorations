/**
 * Which language a config's interface is in, `docs/findings.md` section 149.
 *
 * The claim is a **derivation with a calibration case**, not a lookup: the config states no language,
 * so the answer is inferred from Logitech's own menu wording, and the three containers that carry no
 * interface text have to come back with no answer. That last part is what makes the test more than a
 * description, since a detector that always guesses would pass a table of user configs perfectly.
 *
 * **No device label is quoted here.** The markers are the generator's own menu words, which are
 * structure; what a container calls somebody's amplifier is not, and section 126's rule about that
 * applies to a test as much as to a document.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';

import {
  activities, configLanguage, devices, LANGUAGE_MARKERS, LANGUAGE_MINIMUM_MARKERS, parse,
} from '../src/index.ts';

/**
 * Every user config, with the language it turns out to be in.
 *
 * Twelve English and one Dutch, which nobody expected: the Dutch one is the second Harmony 525 read,
 * and it went unnoticed until a search for the Help walkthrough's English wording found nothing in it.
 */
const CONFIGS = [
  { name: 'h525_config', tag: 'en' },
  { name: 'h525_config_2', tag: 'nl' },
  { name: 'h600_config', tag: 'en' },
  { name: 'h700_config', tag: 'en' },
  { name: 'h700_config_2', tag: 'en' },
  { name: 'one_config', tag: 'en' },
  { name: 'one_config_unprogrammed', tag: 'en' },
  { name: 'arch8_config_a', tag: 'en' },
  { name: 'arch8_config_b', tag: 'en' },
  { name: 'arch8_config_c', tag: 'en' },
  { name: 'arch8_config_d', tag: 'en' },
  { name: 'arch8_config_880', tag: 'en' },
  { name: 'arch8_config_885', tag: 'en' },
] as const;

/**
 * The calibration case: containers that are nobody's configuration.
 *
 * A safe mode container draws about fifty strings and nearly all of them are fault messages, so it
 * matches one marker and the answer is withheld. The margin behind the threshold is therefore **one
 * marker**, which is thin, and stating it is the point: a reader who wants to raise the threshold can
 * see what it costs.
 */
const NOT_A_CONFIG = ['h525_safemode_ahcm', 'h600_safemode_gspm', 'h700_gspm'] as const;

const NAMES = [...CONFIGS.map((one) => one.name), ...NOT_A_CONFIG];

test('every user config says which language it is in, and one of them is not English',
  skipUnless(...NAMES), () => {
  const found: { name: string; tag: string }[] = [];
  for (const { name, tag } of CONFIGS) {
    const answer = configLanguage(parse(require_(name)));
    assert.ok(answer !== undefined, `${name} produced no language at all`);
    assert.equal(answer.tag, tag, `${name}`);
    // **Every runner up scores zero**, which is the strength of the result rather than a detail: the
    // marker sets do not overlap at all on this evidence, so the answer does not rest on a margin
    // between two plausible languages. It rested on two before the ambiguous words were removed.
    assert.equal(answer.runnerUp, 0, `${name}: another language also matched something`);
    assert.ok(answer.matched >= LANGUAGE_MINIMUM_MARKERS, `${name}: ${answer.matched} markers`);
    found.push({ name, tag: answer.tag });
  }
  assert.equal(found.length, 13, 'every user config in the corpus was asked');
  assert.equal(found.filter((one) => one.tag === 'nl').length, 1,
    'exactly one config is in Dutch, which is what makes this a real distinction');
});

test('a container with no interface text is refused rather than guessed at',
  skipUnless(...NAMES), () => {
  // The half that keeps the test honest. Without this a detector that answered `en` unconditionally
  // would pass the table above, since twelve of thirteen are English.
  for (const name of NOT_A_CONFIG) {
    assert.equal(configLanguage(parse(require_(name))), undefined,
      `${name} is not somebody's configuration and has no language to report`);
  }
});

test('no marker matches anybody\'s own device or activity name', skipUnless(...NAMES), () => {
  /**
   * **The claim anchoring was only a proxy for.** A marker exists to recognise Logitech's own wording,
   * so the way it goes wrong is by matching something a person typed: an amplifier called "Music", an
   * activity called "Devices". Checking that every pattern is anchored is a convention; checking that
   * none of them matches a real label is the measurement, and the corpus has 63 device labels and 50
   * activity names to check against.
   *
   * It is also the reason a wrong answer is unlikely rather than merely unobserved. Every runner up in
   * the corpus scores zero, and this says why: there is nothing for one to score on.
   */
  let checked = 0;
  const matched: string[] = [];
  for (const { name } of CONFIGS) {
    const c = parse(require_(name));
    const mine = [
      ...(devices(c) ?? []).map((one) => one.name),
      ...(activities(c) ?? []).map((one) => one.name),
    ].filter((one): one is string => one !== undefined && one.trim() !== '');
    for (const label of mine) {
      checked += 1;
      for (const [tag, words] of Object.entries(LANGUAGE_MARKERS)) {
        for (const word of words) {
          // The label is reported by position rather than quoted: it is somebody's own equipment, and
          // this repository is public. A failure gives the config and the pattern, which is enough to
          // find it in a lab.
          if (word.test(label.trim())) matched.push(`${name}: ${tag} ${word.source}`);
        }
      }
    }
  }
  assert.deepEqual(matched, [], 'a marker matches something a person typed, so it is not a marker');
  // How many labels the loop actually saw, because otherwise a reader that returned nothing would let
  // this pass with a clean conscience.
  assert.equal(checked, 109, 'device labels and activity names the markers were checked against');
});

test('the marker table names six languages, two of them measured', () => {
  // Reads no config: a claim about the table itself, so a language added without evidence behind it is
  // a diff somebody reads rather than a quiet widening.
  assert.deepEqual(Object.keys(LANGUAGE_MARKERS).sort(), ['de', 'en', 'es', 'fr', 'it', 'nl']);
  // Every pattern is anchored at the front. A marker that could match mid string would match inside a
  // label, which the test above shows none of them does; this is the cheap structural half, and it
  // holds in a fresh clone with no lab.
  for (const [tag, words] of Object.entries(LANGUAGE_MARKERS)) {
    for (const word of words) {
      assert.ok(word.source.startsWith('^'), `${tag}: ${word.source} is not anchored`);
    }
  }
  assert.equal(LANGUAGE_MINIMUM_MARKERS, 2);
});
