/**
 * Which language a config's interface is in, inferred, because the config does not state it.
 *
 * `docs/findings.md` section 149. Every word a remote shows is in the config as pixels of a font,
 * and Logitech's generator emitted them in the language of the account that built it: of the
 * thirteen user configs here twelve are English and one is Dutch. **No field says so.** The
 * architecture is stated, the format version is stated, the build timestamp is stated; the language
 * is a property of a few hundred strings and of nothing else.
 *
 * That matters for a writer rather than for a reader, which is why this exists at all. A third to a
 * half of every config's screen pages are the Help walkthrough, and its wording is Logitech's
 * template with the user's own device names dropped into it. Anything that has to **generate** a
 * page has to generate it in the right language, and the only way to know which is to read what is
 * already there.
 *
 * **It is an inference and it says so**, which is the whole shape of the result type: a caller gets
 * the tag, how many markers matched, and what the runner up scored, so a weak answer can be refused
 * rather than believed. `configLanguage` refuses below two markers, and the strongest evidence any
 * container with no interface text produces is one.
 */
import type { Container } from './gspm.ts';
import { characterMap, screenStrings } from './text.ts';

/**
 * Words Logitech's own generator emits, per language, and never anybody's equipment.
 *
 * **Chosen to be distinctive rather than common**, and that was a correction: the first set included
 * `no`, `ja` and `si`, which several of these languages share, and it made a French runner up score
 * two on an English container. `yes` stayed, because among these six only English uses it. With the
 * shared words gone every runner up in the corpus scores **zero**, so the sets do not overlap at all
 * on this evidence, and a wrong answer would need a container whose device labels happen to be
 * another language's menu words.
 *
 * **An interface word and never a diagnostic one**, which was the second correction and the one with
 * a measurement behind it. `battery` matches every English config and also all three containers that
 * are nobody's configuration, because a safe mode image draws battery and flash memory faults. It was
 * the only thing those three matched, so removing it takes the calibration case from one marker to
 * **zero** and gives the threshold real slack instead of a margin of one.
 *
 * The Help walkthrough is where the reliable words are: `did that fix`, `now is the` and `is the`
 * each match 12 of the 12 English configs and none of the three non configs, where `activities`
 * manages 5 of 12 and `all off` none at all. So a menu label is a worse marker than a sentence, which
 * is the opposite of what the first version assumed.
 *
 * **And an activity name is not a marker at all**, which is the third correction and the one a test
 * found rather than a measurement: `watch tv` matched seven configs' **activity names**, because
 * Logitech's own software suggests that name and then lets the person keep it. So the template word
 * and the user's own text are the same string, and a Dutch config with an activity somebody called
 * "Watch TV" would have scored for English. Every activity shaped word is gone from all six sets for
 * the same reason, including the four in languages nothing here holds.
 *
 * Anchored at the front, and at the back too wherever a whole string is expected. A prefix is used
 * where the remote wraps a sentence across rows, since the drawn string is then only its beginning.
 * Both anchors matter for a single word, because a device label containing a menu word is exactly the
 * accident to avoid: somebody's amplifier may well be called "Music".
 *
 * Six languages, of which the corpus exercises two. The other four are written from Logitech's own
 * menu wording and are **unconfirmed**: nothing here holds a German, French, Spanish or Italian
 * config, so those rows are a prediction and a test would only be checking this file against itself.
 * Section 149.
 */
export const LANGUAGE_MARKERS: Readonly<Record<string, readonly RegExp[]>> = {
  en: [/^devices$/i, /^activities$/i, /^help$/i, /^settings$/i,
       /^yes$/i, /^did that fix/i, /^now is the/i, /^is the /i, /^choose an activ/i],
  nl: [/^apparaten$/i, /^activiteit/i, /^assistent/i, /^houd de/i, /^al uw apparaten/i,
       /^een activiteit/i, /^nee$/i, /^als u de/i, /^vervang de/i],
  de: [/^ger.te$/i, /^aktivit.ten$/i, /^hilfe$/i, /^einstellungen$/i, /^nein$/i,
       /^hat das das problem/i, /^ist das /i, /^alles aus$/i],
  fr: [/^appareils$/i, /^activit.s$/i, /^aide$/i, /^param.tres$/i, /^est-ce que/i,
       /^le probl.me/i, /^tout .teindre$/i],
  es: [/^dispositivos$/i, /^actividades$/i, /^ayuda$/i, /^ajustes$/i, /^configuraci.n$/i,
       /^.est. /i, /^.se ha solucionado/i, /^apagar todo$/i],
  it: [/^dispositivi$/i, /^attivit.$/i, /^aiuto$/i, /^impostazioni$/i, /^il problema/i,
       /^spegni tutto$/i],
};

/** How many markers a container has to match before an answer is offered rather than withheld. */
export const LANGUAGE_MINIMUM_MARKERS = 2;

export interface ConfigLanguage {
  /** An IETF language tag, lower case, matching a key of `LANGUAGE_MARKERS`. */
  readonly tag: string;
  /** How many of that language's markers the container's strings matched. */
  readonly matched: number;
  /** The best any other language scored, which is 0 on every container in the corpus. */
  readonly runnerUp: number;
}

/**
 * The language of a container's interface, or `undefined` because the evidence is too thin.
 *
 * `undefined` is a real answer and the common one outside a user config: a safe mode container draws
 * fifty strings, almost all of them fault messages, and matches one marker. So the threshold is what
 * separates "this config is in Dutch" from "this container barely speaks", and the margin behind it
 * is one marker, which is thin and is stated rather than hidden.
 */
export function configLanguage(c: Container): ConfigLanguage | undefined {
  const map = characterMap(c);
  if (map === undefined) return undefined;

  // Every string a reachable program draws, trimmed and deduplicated. `screenStrings` is the reader
  // that follows a referenced string to where it is stored, which matters here: a menu word is
  // stored once and drawn from many pages, so a walk that only read inline draws would miss most of
  // the vocabulary.
  const said = new Set<string>();
  for (const one of screenStrings(c, map)) said.add(one.text.trim());

  const scored = Object.entries(LANGUAGE_MARKERS)
    .map(([tag, words]) => ({
      tag,
      matched: words.filter((word) => [...said].some((text) => word.test(text))).length,
    }))
    .sort((a, b) => b.matched - a.matched || a.tag.localeCompare(b.tag));

  const best = scored[0];
  const next = scored[1];
  if (best === undefined || best.matched < LANGUAGE_MINIMUM_MARKERS) return undefined;
  return { tag: best.tag, matched: best.matched, runnerUp: next?.matched ?? 0 };
}
