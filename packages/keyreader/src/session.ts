/**
 * The key reader's two modes, as plain state with no page and no remote: learning a model's keys, and
 * testing them. `page.ts` feeds them presses and draws what they say; the tests drive them directly.
 *
 * **Learning, for a model with a drawing**, `Learning`: the page asks for one key at a time, in the order
 * of the face, and **a press is recorded against the key that was asked for**. That is the whole design.
 * The key map of the Harmony 885 was first measured by pressing keys in a list's order and naming each
 * code after the list, and two names came out swapped, Pause and Play, because the list's order was not
 * the order the keys were pressed in (`tests/test_harmony_885_keys.py`). Asking for a key and taking the
 * next press as that key's code makes the order of pressing irrelevant: a name is never inferred from a
 * position in a sequence.
 *
 * So a press that cannot be the key asked for is not recorded at all, it is noted: a code already learned
 * for another key (each key raises its own code, so a repeat is the wrong key pressed, or the same key
 * pressed twice), or any press once nothing is being asked. A key the person's remote does not have is
 * skipped; going back takes away the answer of the key before the one asked, which then becomes the key
 * asked again; and a key already answered can be asked again by clicking it on the drawing.
 *
 * **Learning, for a model without a drawing**, `Naming`: with no drawing there is no list of keys to ask
 * for, so the order is turned round. The person presses a key and then types what is printed on it, or
 * where it is; the code is recorded against the words typed for that one press. A second press before the
 * words are in is noted, not recorded, for the same reason as above.
 *
 * **Testing**, `Tester`: every key pressed lights and stays lit, so a person sees which keys answer and
 * which never do. It needs the model's codes: a key's scan code, or its candidates where the drawing has
 * narrowed a key to a set (the Harmony 880's two chevron keys, each one of 20 and 52, nobody yet having
 * pressed them), in which case a press of either lights every key that could be it, marked as such. A
 * code no key carries is kept in a list of its own.
 *
 * **The log**, `learningLog`, is what a person sends us: the model as chosen, the skin and firmware the
 * remote reported, and per key its name and its code or that it was skipped, then the presses that did not
 * fit. **Nothing that identifies the unit**: the page never reads a serial number, and the log is built
 * from a fixed set of line shapes that `test/session.test.ts` checks every line against.
 */

/** One key of a drawing, as the page receives it from the build, `bin/drawings.ts`. */
export interface FaceKey {
  /** The drawing's own name for the key, `data-name`: Logitech's word where there is one. */
  readonly name: string;
  /** The words a person knows the key by: its print, or where it is. */
  readonly words: string;
  /** The scan code, present only where the drawing states one. */
  readonly scan?: number;
  /** The codes the key is narrowed to where it is not decided; empty when it is, or when nothing is known. */
  readonly candidates: readonly number[];
  /** Whether learning asks for it: false for a key left out on purpose, `NOT_ASKED` in `bin/drawings.ts`. */
  readonly ask: boolean;
  /** Whether a person is told not to press it, `DO_NOT_PRESS` in `bin/drawings.ts`: Glow ends the connection. */
  readonly avoid: boolean;
}

/** One drawn model as the page receives it: its keys in the order the page asks for them, and its SVG. */
export interface Drawing {
  readonly id: string;
  readonly label: string;
  readonly skins: readonly number[];
  readonly keys: readonly FaceKey[];
  readonly svg: string;
}

/** A press that was noted and not recorded, and why. */
export interface Misfit {
  readonly code: number;
  /** What was being asked when it came: a key's name, or nothing. */
  readonly asked: string | undefined;
  /**
   * `already`: the code is already learned for another key, named in `other`.
   * `nothing-asked`: every key has been answered.
   * `naming`: a press came while the words for the previous one were being typed.
   * `different`: the second press of a key gave another code than the first, named in `first`; both are
   *   dropped and the key is asked from the start, and the pair is kept here, the second press as `code`.
   */
  readonly reason: 'already' | 'nothing-asked' | 'naming' | 'different';
  readonly other?: string;
  readonly first?: number;
}

/**
 * An answer to a key that was asked: its code; `skipped`, the person's remote has no such key; or `not detected`,
 * the key is there and works (the remote reacts to it) but no press of it reached the page. The last was met
 * at the bench on a Harmony 885's Glow key, and is kept apart from a missing key because it says something
 * different: that the key's code is not where the page reads it, or not written there at all.
 */
export interface Answer {
  readonly key: FaceKey;
  readonly code: number | 'skipped' | 'not detected';
}

/**
 * What happened to one press: the first press of a key asked is `provisional`, the second `learned` when it
 * gives the same code, or `mismatch` when it does not; a press that cannot be the key asked is a `misfit`.
 */
export type LearnOutcome =
  | { readonly kind: 'provisional'; readonly key: FaceKey; readonly code: number }
  | { readonly kind: 'learned'; readonly key: FaceKey; readonly code: number }
  | { readonly kind: 'mismatch'; readonly key: FaceKey; readonly first: number; readonly second: number }
  | { readonly kind: 'misfit'; readonly misfit: Misfit };

/**
 * How a key looks while learning, which is also what the page colours it by. `confirm` is the key asked
 * after its first press, waiting for the second.
 */
export type LearnState = 'asked' | 'confirm' | 'learned' | 'skipped' | 'unseen' | 'waiting';

/**
 * The learning mode for a model with a drawing: one key asked at a time, in the face's order, and each
 * pressed twice.
 *
 * **Why twice**: a key is learned against the key asked, so a slip of the finger to the key beside it
 * would be learned under the wrong name, and nothing at the time would say so. Asking for the key again
 * catches the slip at the moment it happens: two presses of the same key give the same code, and a
 * mismatch drops both and asks again from the start. Step 3 still checks the whole map at the end, for a
 * slip made twice. Skip and `not detected` answer without a press, so they need no second one.
 *
 * **Which key is asked**: the first key of the face, in order, with no answer yet; or, when the person has
 * clicked a key already answered on the drawing, that key, until it is answered again (`reask`). The keys
 * after it keep their answers, and once it is answered learning carries on with the first key without
 * one, which is where it was. Going back, `previous`, takes away the answer of the key before the one
 * asked, so pressed again and again it walks back one key at a time.
 *
 * Answers are kept per key rather than as a list in the order given, so a key answered again replaces its
 * own answer, and the log, which lists keys in the face's order, shows its line once and in its place.
 */
export class Learning {
  readonly keys: readonly FaceKey[];
  /** The answer per key, by the key's name. */
  readonly #answers = new Map<string, Answer>();
  readonly #misfits: Misfit[] = [];
  /** The first press of the key asked, waiting for the second to confirm it; never in the log on its own. */
  #first: number | undefined;
  /** A key already answered that the person asked to answer again, if any. */
  #again: FaceKey | undefined;

  /** The drawing's keys in face order; only those it asks for are kept, so the log lists only those. */
  constructor(keys: readonly FaceKey[]) {
    this.keys = keys.filter((key) => key.ask);
  }

  /** The key being asked for, or undefined when every key has been answered. */
  get asked(): FaceKey | undefined {
    return this.#again ?? this.#next;
  }

  /** Where learning is: the first key in face order without an answer. */
  get #next(): FaceKey | undefined {
    return this.keys.find((key) => !this.#answers.has(key.name));
  }

  /** The answers so far, in the face's order. */
  get answers(): readonly Answer[] {
    return this.keys.flatMap((key) => this.#answers.get(key.name) ?? []);
  }

  get misfits(): readonly Misfit[] {
    return this.#misfits;
  }

  /** The code of the first press of the key asked, while it waits for the second. */
  get provisional(): number | undefined {
    return this.#first;
  }

  /** Whether a key already answered is being answered again. */
  get again(): boolean {
    return this.#again !== undefined;
  }

  /** Whether every key has been answered. */
  get done(): boolean {
    return this.asked === undefined;
  }

  /**
   * The key a code has been learned for, if any, other than the key asked: a key answered again may be
   * given the code it had, which is its own and not another key's.
   */
  learnedFor(code: number): FaceKey | undefined {
    const asked = this.asked;
    return this.answers.find((answer) => answer.code === code && answer.key !== asked)?.key;
  }

  /**
   * A press: the first of the key asked is held, the second confirms it, and a second that differs drops
   * both. A press of a code already learned for another key is noted and changes nothing, so it neither
   * confirms nor drops a first press.
   */
  press(code: number): LearnOutcome {
    const asked = this.asked;
    if (asked === undefined) return this.#note({ code, asked: undefined, reason: 'nothing-asked' });
    const other = this.learnedFor(code);
    if (other !== undefined) return this.#note({ code, asked: asked.name, reason: 'already', other: other.name });
    const first = this.#first;
    this.#first = undefined;
    if (first === undefined) {
      this.#first = code;
      return { kind: 'provisional', key: asked, code };
    }
    // `first !== undefined` is already known here; it is spelled out so that this test stands on its own,
    // which is what lets `test/session.test.ts` disarm the holding of a first press alone.
    if (first !== undefined && first !== code) {
      this.#misfits.push({ code, asked: asked.name, reason: 'different', first });
      return { kind: 'mismatch', key: asked, first, second: code };
    }
    this.#answer(asked, code);
    return { kind: 'learned', key: asked, code };
  }

  /** The person's remote has no such key: answer it as skipped and ask the next. */
  skip(): FaceKey | undefined {
    const asked = this.asked;
    if (asked !== undefined) this.#answer(asked, 'skipped');
    return asked;
  }

  /** The key works on the remote but the page never detects it: answer it as `not detected`, ask the next. */
  unseen(): FaceKey | undefined {
    const asked = this.asked;
    if (asked !== undefined) this.#answer(asked, 'not detected');
    return asked;
  }

  /**
   * Ask a key already answered again, as when the person clicks it on the drawing. Its answer stays until a
   * new one replaces it, so leaving it with `previous` loses nothing. Returns the key, or undefined for a
   * key with no answer yet, which is asked in its turn.
   */
  reask(name: string): FaceKey | undefined {
    const answer = this.#answers.get(name);
    if (answer === undefined) return undefined;
    this.#first = undefined;
    this.#again = answer.key;
    return answer.key;
  }

  /**
   * Go back one key: the key before the one asked loses its answer and is asked again, so that pressed
   * again and again this walks back one key at a time. A first press waiting for its second goes too, as it
   * was the key's being left. While a key is answered again, going back ends that instead, keeping its
   * answer, and learning is where it was. Returns the key asked afterwards.
   */
  previous(): FaceKey | undefined {
    this.#first = undefined;
    if (this.#again !== undefined) {
      this.#again = undefined;
      return this.asked;
    }
    const next = this.#next;
    const before = next === undefined ? this.keys.length : this.keys.indexOf(next);
    const back = this.keys[before - 1];
    if (back !== undefined) this.#answers.delete(back.name);
    return this.asked;
  }

  /** How a key looks now: the key asked looks asked even when it has an answer it is giving again. */
  stateOf(name: string): LearnState {
    if (this.asked?.name === name) return this.#first === undefined ? 'asked' : 'confirm';
    const answer = this.#answers.get(name);
    if (answer === undefined) return 'waiting';
    if (answer.code === 'skipped') return 'skipped';
    return answer.code === 'not detected' ? 'unseen' : 'learned';
  }

  /** Record an answer for a key, replacing any it had, and end answering it again. */
  #answer(key: FaceKey, code: Answer['code']): void {
    this.#first = undefined;
    this.#answers.set(key.name, { key, code });
    if (this.#again === key) this.#again = undefined;
  }

  #note(misfit: Misfit): LearnOutcome {
    this.#misfits.push(misfit);
    return { kind: 'misfit', misfit };
  }

  /**
   * The rows of the log: every key answered so far, in the face's order, with its code, `skipped` or
   * `not detected`. A key not reached yet has no row, so the log grows answer by answer and loses one going
   * back; a key answered again keeps its one row, with the new answer.
   */
  rows(): LogRow[] {
    return this.answers.map((answer) => ({ name: answer.key.name, words: answer.key.words, code: answer.code }));
  }
}

/** A key learned without a drawing: the words the person typed for it, and its code. */
export interface Named {
  readonly words: string;
  readonly code: number;
}

export type NameOutcome =
  | { readonly kind: 'pending'; readonly code: number }
  | { readonly kind: 'misfit'; readonly misfit: Misfit };

/**
 * The learning mode for a model without a drawing: a press, then the words for it.
 *
 * There is no key to ask for, so `asked` in a misfit is the code waiting for its words, written as such.
 */
export class Naming {
  readonly #named: Named[] = [];
  readonly #misfits: Misfit[] = [];
  #pending: number | undefined;

  get named(): readonly Named[] {
    return this.#named;
  }

  get misfits(): readonly Misfit[] {
    return this.#misfits;
  }

  /** The code pressed and waiting for its words, if any. */
  get pending(): number | undefined {
    return this.#pending;
  }

  /** A press: held until it is named, or noted when it comes too soon or repeats a learned code. */
  press(code: number): NameOutcome {
    if (this.#pending !== undefined) {
      return this.#note({ code, asked: `the words for ${this.#pending}`, reason: 'naming' });
    }
    const other = this.#named.find((n) => n.code === code);
    if (other !== undefined) return this.#note({ code, asked: undefined, reason: 'already', other: other.words });
    this.#pending = code;
    return { kind: 'pending', code };
  }

  /** The words for the pending press; nothing happens without a press or without words. */
  name(words: string): Named | undefined {
    // A double quote would end the quoted words in the log early, so it becomes a single one.
    const trimmed = words.trim().replaceAll('"', "'");
    if (this.#pending === undefined || trimmed === '') return undefined;
    const named = { words: trimmed, code: this.#pending };
    this.#named.push(named);
    this.#pending = undefined;
    return named;
  }

  /** Forget the pending press without naming it. */
  discard(): number | undefined {
    const code = this.#pending;
    this.#pending = undefined;
    return code;
  }

  /** Take back the last key named. */
  undo(): Named | undefined {
    return this.#named.pop();
  }

  #note(misfit: Misfit): NameOutcome {
    this.#misfits.push(misfit);
    return { kind: 'misfit', misfit };
  }

  rows(): LogRow[] {
    return this.#named.map((n) => ({ name: n.words, code: n.code }));
  }
}

/** What a press lit in test mode. */
export interface TestOutcome {
  readonly code: number;
  /** The keys whose code it is. */
  readonly exact: readonly string[];
  /** The keys it may be, by their candidates, when no key has it as its code. */
  readonly possible: readonly string[];
}

/** How a key looks while testing. */
export type TestState = 'lit' | 'possible' | 'unlit';

/** The key test mode: every key pressed lights and stays lit. */
export class Tester {
  readonly #keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[];
  readonly #lit = new Set<string>();
  readonly #possible = new Set<string>();
  readonly #unknown: number[] = [];

  constructor(keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[]) {
    this.#keys = keys;
  }

  press(code: number): TestOutcome {
    const exact = this.#keys.filter((k) => k.scan === code).map((k) => k.name);
    // A candidate stands in only where no key has the code as its own: a decided key wins.
    const possible = exact.length > 0 ? [] : this.#keys.filter((k) => k.candidates.includes(code)).map((k) => k.name);
    for (const name of exact) this.#lit.add(name);
    for (const name of possible) this.#possible.add(name);
    if (exact.length === 0 && possible.length === 0 && !this.#unknown.includes(code)) this.#unknown.push(code);
    return { code, exact, possible };
  }

  stateOf(name: string): TestState {
    if (this.#lit.has(name)) return 'lit';
    return this.#possible.has(name) ? 'possible' : 'unlit';
  }

  /** The codes pressed that no key carries, in the order first pressed. */
  get unknown(): readonly number[] {
    return this.#unknown;
  }

  /** How many keys have answered, counting a key lit by its candidates. */
  get answered(): number {
    return this.#keys.filter((k) => this.stateOf(k.name) !== 'unlit').length;
  }

  get total(): number {
    return this.#keys.length;
  }

  reset(): void {
    this.#lit.clear();
    this.#possible.clear();
    this.#unknown.length = 0;
  }
}

/** One key's line in the log: its name, the words for it where they differ, and what was found. */
export interface LogRow {
  readonly name: string;
  readonly words?: string;
  readonly code: number | 'skipped' | 'not detected';
}

/**
 * What the key test found, the first step after choosing a model: how many different keys reached the
 * page, and the codes no key on the drawing carries (every code, for a model without a drawing).
 */
export interface Sweep {
  readonly seen: number;
  readonly unknown: readonly number[];
}

/**
 * The key test's result from the codes pressed in it, against the keys of the model.
 *
 * A key the drawing knows no code for cannot be told apart from another key by its code, so it is counted
 * among the unknown codes when it answers; that is why the number of different keys seen is reported as
 * well as the keys lit, so that an 880, 24 of whose keys have no known code, or a model with no drawing,
 * still shows how many of its keys reached the page.
 */
export function sweepOf(keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[], pressed: readonly number[]): Sweep {
  const tester = new Tester(keys);
  for (const code of pressed) tester.press(code);
  return { seen: new Set(pressed).size, unknown: [...tester.unknown] };
}

/** A key as the key map check sees it: a name, and the code or candidates it lights for. */
export type MapKey = Pick<FaceKey, 'name' | 'scan' | 'candidates'>;

/**
 * The map the check lights keys by: each key the person learned at the code they gave it, and every other
 * key at the code or candidates the drawing already knew, so a key the drawing knew and the person skipped
 * still answers. A learned code wins over the drawing's, since checking what was just learned is the point.
 */
export function learnedMap(keys: readonly FaceKey[], rows: readonly LogRow[]): MapKey[] {
  const learned = new Map<string, number>();
  for (const row of rows) if (typeof row.code === 'number') learned.set(row.name, row.code);
  return keys.map((key) => {
    const code = learned.get(key.name);
    if (code !== undefined) return { name: key.name, scan: code, candidates: [] };
    return { name: key.name, ...(key.scan === undefined ? {} : { scan: key.scan }), candidates: key.candidates };
  });
}

/** What the key map check found: how many learned keys lit when pressed, of how many, and the strangers. */
export interface Check {
  readonly confirmed: number;
  readonly learned: number;
  /** Codes pressed in the check that no key of the map has, in the order first pressed. */
  readonly unknown: readonly number[];
}

/**
 * The check's result from the codes pressed in it: a learned key is confirmed when a press lit it by its
 * learned code. The person judges whether it lit the key they pressed; the page can only count.
 */
export function checkOf(map: readonly MapKey[], learnedNames: readonly string[], pressed: readonly number[]): Check {
  const tester = new Tester(map);
  for (const code of pressed) tester.press(code);
  return {
    confirmed: learnedNames.filter((name) => tester.stateOf(name) === 'lit').length,
    learned: learnedNames.length,
    unknown: [...tester.unknown],
  };
}

/**
 * The keys that never answered in the key test, which learning then flags: a key whose code (or one of
 * whose candidates) the drawing knows and that no press lit. Empty when the test saw no press at all, since
 * then nothing was tested; and a key with no known code is never in it, since a press of it cannot be told
 * from any other unknown code.
 */
export function neverAnswered(keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[], pressed: readonly number[]): Set<string> {
  if (pressed.length === 0) return new Set();
  const tester = new Tester(keys);
  for (const code of pressed) tester.press(code);
  return new Set(keys
    .filter((key) => key.scan !== undefined || key.candidates.length > 0)
    .filter((key) => tester.stateOf(key.name) === 'unlit')
    .map((key) => key.name));
}

/** What the remote said about itself and what the person chose: the log's head. */
export interface LogHead {
  readonly chosen: string;
  readonly reported: string;
  readonly skin: number;
  readonly firmware: string;
}

/** The first line of every log, which is also how a reader of an issue recognises one. */
export const LOG_TITLE = 'Harmony key map, from the key reader page';

/**
 * The log a person copies and sends: a fixed set of line shapes, nothing else.
 *
 * The head says which model was chosen and what the remote reported, its model name, skin and firmware
 * version, which is what tells us which build of which model the codes are from. Then what the key test
 * found, the number of different keys that reached the page and the codes no key on the drawing has. Then
 * one line per key, the presses that did not fit, and at the end what the key map check found: how many
 * learned keys lit when pressed and the codes the map does not have. A key's line reads
 * `Name (words): code`, in the order asked (or, without a drawing, pressed), and a press that did not fit
 * gives its code and why. No line carries anything about the unit itself, because the page reads nothing
 * that could.
 */
export function learningLog(
  head: LogHead,
  sweep: Sweep,
  check: Check,
  rows: readonly LogRow[],
  misfits: readonly Misfit[],
  order: 'asked' | 'pressed' = 'asked',
): string {
  const lines = [
    LOG_TITLE,
    `model chosen: ${head.chosen}`,
    `remote reported: ${head.reported}, skin ${head.skin}, firmware ${head.firmware}`,
    '',
    `key test: ${sweep.seen} different keys answered`,
    `key test, codes no key on the drawing has: ${sweep.unknown.length === 0 ? 'none' : sweep.unknown.join(', ')}`,
    '',
    // Without a drawing nothing is asked: the keys come in the order the person pressed and named them.
    `keys, in the order ${order}:`,
  ];
  for (const row of rows) {
    if (order === 'pressed') {
      // The person's own words, quoted, so that a reader can tell them from the line's shape whatever
      // they are; `Naming.name` keeps a double quote out of them.
      lines.push(`"${row.name}": ${row.code}`);
      continue;
    }
    const words = row.words === undefined || row.words === row.name ? '' : ` (${row.words})`;
    lines.push(`${row.name}${words}: ${row.code}`);
  }
  lines.push('', 'presses that did not fit:');
  if (misfits.length === 0) lines.push('none');
  for (const misfit of misfits) lines.push(`${misfit.code}: ${misfitWords(misfit)}`);
  lines.push(
    '',
    `key map check: ${check.confirmed} of ${check.learned} learned keys confirmed`,
    `key map check, codes the map does not have: ${check.unknown.length === 0 ? 'none' : check.unknown.join(', ')}`,
  );
  return `${lines.join('\n')}\n`;
}

/** Why a press was not recorded, in words, for the log and for the page. */
export function misfitWords(misfit: Misfit): string {
  const when = misfit.asked === undefined ? '' : ` while ${misfit.asked} was asked`;
  switch (misfit.reason) {
    case 'already':
      return `already the code of ${misfit.other ?? 'another key'}${when}`;
    case 'nothing-asked':
      return 'pressed after every key was answered';
    case 'naming':
      return `pressed before the words for the previous key were in`;
    case 'different':
      return `the second press, after ${misfit.first ?? 'another code'}${when}; both were dropped`;
  }
}
